// Authentication service for user registration, login, 2FA, email verification, password reset

import { hash, compare } from 'bcryptjs'
import { sign, verify } from 'hono/jwt'
import { DatabaseClient } from '../lib/db'
import { Env } from '../lib/types'
import { User, UserProfile, JWTPayload } from '../../../shared/types'
import { calculateLevel, xpForLevel, xpForNextLevel, xpProgressPercent } from '../lib/constants'
import { TokenService } from './token-service'
import { TOTPService } from './totp-service'

const SALT_ROUNDS = 10
const RECOVERY_CODE_BCRYPT_COST = 6

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export class AuthService {
  private tokenService: TokenService
  private totpService: TOTPService

  constructor(
    private db: DatabaseClient,
    private env: Env
  ) {
    this.tokenService = new TokenService(db)
    this.totpService = new TOTPService()
  }

  // Register new user with email
  async register(username: string, email: string, password: string): Promise<{ userProfile: UserProfile; verificationToken: string }> {
    // Validate username
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      throw new Error('Username must be 3-20 characters, alphanumeric and underscores only')
    }

    if (!isValidEmail(email)) {
      throw new Error('Invalid email address')
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    // Check password complexity
    const hasUpper = /[A-Z]/.test(password)
    const hasLower = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)

    if (!hasUpper || !hasLower || !hasNumber) {
      throw new Error('Password must contain uppercase, lowercase, and number')
    }

    // Check if username exists
    const existingUsername = await this.db.queryOne<{ id: string }>(
      'SELECT id FROM users WHERE username = ?',
      username
    )

    if (existingUsername) {
      throw new Error('Username already exists')
    }

    // Check if email exists
    const existingEmail = await this.db.queryOne<{ id: string }>(
      'SELECT id FROM users WHERE email = ?',
      email
    )

    if (existingEmail) {
      throw new Error('Email already registered')
    }

    // Hash password
    const passwordHash = await hash(password, SALT_ROUNDS)

    // Create user
    const userId = crypto.randomUUID()
    const now = Date.now()

    await this.db.exec(
      `INSERT INTO users (id, username, email, email_verified, password_hash, level, total_xp, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, 1, 0, ?, ?)`,
      userId, username, email, passwordHash, now, now
    )

    // Fetch user profile
    const user = await this.db.queryOne<User>(
      'SELECT * FROM users WHERE id = ?',
      userId
    )

    if (!user) {
      throw new Error('Failed to create user')
    }

    // Generate verification token
    const verificationToken = await this.tokenService.generateToken(userId, 'email_verify')

    return {
      userProfile: await this.buildUserProfile(user),
      verificationToken,
    }
  }

  // Login: returns success with tokens, OR totp_required with challenge token
  async login(username: string, password: string): Promise<
    | { type: 'success'; user: UserProfile; accessToken: string; refreshToken: string }
    | { type: 'totp_required'; challengeToken: string }
  > {
    const user = await this.db.queryOne<User>(
      'SELECT * FROM users WHERE username = ?',
      username
    )

    if (!user) {
      throw new Error('Invalid credentials')
    }

    const isValid = await compare(password, user.password_hash)

    if (!isValid) {
      throw new Error('Invalid credentials')
    }

    // If 2FA enabled, return challenge token instead of auth token
    if (user.totp_enabled) {
      const challengeToken = await this.generateChallengeToken(user.id)
      return { type: 'totp_required', challengeToken }
    }

    const accessToken = await this.generateAccessToken(user)
    const { rawToken: refreshToken } = await this.generateRefreshToken(user.id)
    return { type: 'success', user: await this.buildUserProfile(user), accessToken, refreshToken }
  }

  // Verify TOTP code (or recovery code) after challenge
  async verifyTOTPChallenge(challengeToken: string, code: string): Promise<{ user: UserProfile; accessToken: string; refreshToken: string }> {
    let payload: JWTPayload
    try {
      payload = await verify(challengeToken, this.env.JWT_SECRET, 'HS256') as JWTPayload
    } catch {
      throw new Error('Invalid or expired challenge token')
    }

    if (payload['type'] !== 'totp_challenge') {
      throw new Error('Invalid challenge token type')
    }

    const userId = payload.sub
    const user = await this.db.queryOne<User & { totp_secret: string | null; recovery_codes: string | null }>(
      'SELECT * FROM users WHERE id = ?',
      userId
    )

    if (!user || !user.totp_enabled || !user.totp_secret) {
      throw new Error('2FA not enabled for this account')
    }

    // Try TOTP first
    const isValidTOTP = this.totpService.validate(user.totp_secret, code)
    if (isValidTOTP) {
      const accessToken = await this.generateAccessToken(user)
      const { rawToken: refreshToken } = await this.generateRefreshToken(user.id)
      return { user: await this.buildUserProfile(user), accessToken, refreshToken }
    }

    // Try recovery codes (constant-time check via bcrypt)
    if (user.recovery_codes) {
      const recoveryCodes: string[] = JSON.parse(user.recovery_codes)
      for (let i = 0; i < recoveryCodes.length; i++) {
        const isMatch = await compare(code.toUpperCase(), recoveryCodes[i])
        if (isMatch) {
          // Remove used recovery code
          const updatedCodes = [...recoveryCodes.slice(0, i), ...recoveryCodes.slice(i + 1)]
          await this.db.exec(
            'UPDATE users SET recovery_codes = ? WHERE id = ?',
            JSON.stringify(updatedCodes), userId
          )
          const accessToken = await this.generateAccessToken(user)
          const { rawToken: refreshToken } = await this.generateRefreshToken(user.id)
          return { user: await this.buildUserProfile(user), accessToken, refreshToken }
        }
      }
    }

    throw new Error('Invalid 2FA code')
  }

  // Begin TOTP setup: store secret (disabled), return setup data
  async setupTOTP(userId: string): Promise<{ secret: string; uri: string; recoveryCodes: string[] }> {
    const user = await this.db.queryOne<{ username: string }>(
      'SELECT username FROM users WHERE id = ?',
      userId
    )
    if (!user) throw new Error('User not found')

    const setup = this.totpService.generateSetup(user.username)

    // Store secret (not yet enabled)
    await this.db.exec(
      'UPDATE users SET totp_secret = ?, totp_enabled = 0 WHERE id = ?',
      setup.secret, userId
    )

    return {
      secret: setup.secret,
      uri: setup.uri,
      recoveryCodes: setup.recoveryCodes, // plain text — shown once
    }
  }

  // Enable TOTP after user confirms with a live code
  async enableTOTP(userId: string, code: string): Promise<void> {
    const user = await this.db.queryOne<{ totp_secret: string | null }>(
      'SELECT totp_secret FROM users WHERE id = ?',
      userId
    )
    if (!user || !user.totp_secret) throw new Error('Run /settings 2fa setup first')

    const isValid = this.totpService.validate(user.totp_secret, code)
    if (!isValid) throw new Error('Invalid TOTP code — check your authenticator app')

    // Generate and hash recovery codes
    const setup = this.totpService.generateSetup('') // just for recovery codes
    const hashedCodes = await Promise.all(
      setup.recoveryCodes.map(c => hash(c, RECOVERY_CODE_BCRYPT_COST))
    )

    await this.db.exec(
      'UPDATE users SET totp_enabled = 1, recovery_codes = ? WHERE id = ?',
      JSON.stringify(hashedCodes), userId
    )
  }

  // Disable TOTP after password verification
  async disableTOTP(userId: string, password: string): Promise<void> {
    const user = await this.db.queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = ?',
      userId
    )
    if (!user) throw new Error('User not found')

    const isValid = await compare(password, user.password_hash)
    if (!isValid) throw new Error('Invalid password')

    await this.db.exec(
      'UPDATE users SET totp_enabled = 0, totp_secret = NULL, recovery_codes = NULL WHERE id = ?',
      userId
    )
  }

  // Change password
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.db.queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = ?',
      userId
    )
    if (!user) throw new Error('User not found')

    const isValid = await compare(oldPassword, user.password_hash)
    if (!isValid) throw new Error('Invalid current password')

    if (newPassword.length < 8) throw new Error('New password must be at least 8 characters')
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      throw new Error('New password must contain uppercase, lowercase, and number')
    }

    const newHash = await hash(newPassword, SALT_ROUNDS)
    await this.db.exec(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      newHash, Date.now(), userId
    )
  }

  // Initiate password reset — always returns success (no user enumeration)
  async initiatePasswordReset(email: string): Promise<string | null> {
    const user = await this.db.queryOne<{ id: string; username: string }>(
      'SELECT id, username FROM users WHERE email = ?',
      email
    )
    if (!user) return null  // Caller returns 200 regardless

    const token = await this.tokenService.generateToken(user.id, 'password_reset')
    return token
  }

  // Complete password reset with token
  async completePasswordReset(rawToken: string, newPassword: string): Promise<void> {
    if (newPassword.length < 8) throw new Error('Password must be at least 8 characters')
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      throw new Error('Password must contain uppercase, lowercase, and number')
    }

    const userId = await this.tokenService.validateAndConsume(rawToken, 'password_reset')
    if (!userId) throw new Error('Invalid or expired reset token')

    const newHash = await hash(newPassword, SALT_ROUNDS)
    await this.db.exec(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      newHash, Date.now(), userId
    )
  }

  // Resend email verification (generates new token, invalidating old one)
  async resendVerification(userId: string): Promise<string> {
    const user = await this.db.queryOne<{ email: string | null; email_verified: number }>(
      'SELECT email, email_verified FROM users WHERE id = ?',
      userId
    )
    if (!user) throw new Error('User not found')
    if (!user.email) throw new Error('No email address on file')
    if (user.email_verified) throw new Error('Email already verified')

    return this.tokenService.generateToken(userId, 'email_verify')
  }

  // Verify email with token
  async verifyEmail(rawToken: string): Promise<void> {
    const userId = await this.tokenService.validateAndConsume(rawToken, 'email_verify')
    if (!userId) throw new Error('Invalid or expired verification token')

    await this.db.exec(
      'UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?',
      Date.now(), userId
    )
  }

  // Generate short-lived access JWT (15 minutes)
  async generateAccessToken(user: User): Promise<string> {
    const payload: JWTPayload = {
      sub: user.id,
      username: user.username,
      level: user.level,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
    }
    return await sign(payload, this.env.JWT_SECRET)
  }

  // Generate a 7-day opaque refresh token and store its hash in DB
  async generateRefreshToken(userId: string): Promise<{ rawToken: string; familyId: string }> {
    const rawToken = this.generateRawToken()
    const tokenHash = await this.sha256Hex(rawToken)
    const familyId = crypto.randomUUID()
    const now = Date.now()
    await this.db.exec(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at, revoked_at, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?)`,
      crypto.randomUUID(), userId, tokenHash, familyId,
      now + 7 * 24 * 60 * 60 * 1000, now
    )
    return { rawToken, familyId }
  }

  // Rotate refresh token — revokes old, issues new in same family; detects replay attacks
  async rotateRefreshToken(rawToken: string): Promise<{ user: User; newRawToken: string }> {
    const tokenHash = await this.sha256Hex(rawToken)
    const now = Date.now()

    const record = await this.db.queryOne<{
      id: string; user_id: string; family_id: string;
      expires_at: number; revoked_at: number | null
    }>(`SELECT id, user_id, family_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = ?`, tokenHash)

    if (!record) throw new Error('Invalid refresh token')

    // Replay attack detected: token already revoked → revoke entire family, force re-login
    if (record.revoked_at !== null) {
      await this.db.exec(
        `UPDATE refresh_tokens SET revoked_at = ? WHERE family_id = ? AND revoked_at IS NULL`,
        now, record.family_id
      )
      throw new Error('Session revoked. Please log in again.')
    }

    if (record.expires_at < now) throw new Error('Refresh token expired. Please log in again.')

    const user = await this.db.queryOne<User>('SELECT * FROM users WHERE id = ?', record.user_id)
    if (!user) throw new Error('User not found')

    // Rotate: revoke old + insert new in one batch (Constitution Principle V)
    const newRawToken = this.generateRawToken()
    const newTokenHash = await this.sha256Hex(newRawToken)
    const newId = crypto.randomUUID()
    const newExpires = now + 7 * 24 * 60 * 60 * 1000

    await this.db.batch([
      this.db.raw().prepare(`UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?`).bind(now, record.id),
      this.db.raw().prepare(
        `INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at, revoked_at, created_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?)`
      ).bind(newId, record.user_id, newTokenHash, record.family_id, newExpires, now),
    ])

    return { user, newRawToken }
  }

  // Revoke a refresh token (used by logout — idempotent)
  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = await this.sha256Hex(rawToken)
    await this.db.exec(
      `UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL`,
      Date.now(), tokenHash
    )
  }

  // Generate 5-minute TOTP challenge JWT (not an auth token)
  private async generateChallengeToken(userId: string): Promise<string> {
    const payload = {
      sub: userId,
      type: 'totp_challenge',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (5 * 60), // 5 minutes
    }
    return await sign(payload, this.env.JWT_SECRET)
  }

  // Generate a cryptographically random 64-char hex token
  private generateRawToken(): string {
    const b = new Uint8Array(32)
    crypto.getRandomValues(b)
    return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
  }

  // SHA-256 hex digest
  private async sha256Hex(input: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
    return Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2, '0')).join('')
  }

  // Build user profile with computed stats
  private async buildUserProfile(user: User): Promise<UserProfile> {
    const [postsCount, likesGiven, likesReceived, commentsCount, followersCount, followingCount] = await Promise.all([
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', user.id),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM likes WHERE user_id = ?', user.id),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM likes WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)', user.id),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM comments WHERE user_id = ?', user.id),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM follows WHERE followee_id = ?', user.id),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', user.id),
    ])

    const currentLevel = calculateLevel(user.total_xp)
    const xpForCurrent = xpForLevel(currentLevel)
    const xpForNext = xpForNextLevel(currentLevel)
    const xpProgress = xpProgressPercent(currentLevel, user.total_xp)

    return {
      ...user,
      total_posts: postsCount?.count || 0,
      total_likes_given: likesGiven?.count || 0,
      total_likes_received: likesReceived?.count || 0,
      total_comments_made: commentsCount?.count || 0,
      followers_count: followersCount?.count || 0,
      following_count: followingCount?.count || 0,
      xp_for_current_level: xpForCurrent,
      xp_for_next_level: xpForNext,
      xp_progress_percent: xpProgress,
    }
  }

  // Get current user profile
  async getCurrentUser(userId: string): Promise<UserProfile> {
    const user = await this.db.queryOne<User>(
      'SELECT * FROM users WHERE id = ?',
      userId
    )

    if (!user) {
      throw new Error('User not found')
    }

    return this.buildUserProfile(user)
  }
}
