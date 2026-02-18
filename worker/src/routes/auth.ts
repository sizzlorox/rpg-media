// Authentication routes: register, login, logout, me, email verify, 2FA, password reset

import { Hono } from 'hono'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { HonoEnv } from '../lib/types'
import { createDatabaseClient } from '../lib/db'
import { AuthService } from '../services/auth-service'
import { EmailService } from '../services/email-service'
import { authMiddleware, emailVerifiedMiddleware } from '../middleware/auth'
import { rateLimiter } from '../middleware/rate-limit'
import { sanitizeError } from '../lib/error-sanitizer'
import { RegisterRequest, LoginRequest, VerifyEmailRequest, ForgotPasswordRequest, ResetPasswordRequest, VerifyTOTPRequest, ChangePasswordRequest } from '../../../shared/types'

const auth = new Hono<HonoEnv>()

function setAccessTokenCookie(c: Parameters<typeof setCookie>[0], token: string, env: HonoEnv['Bindings']) {
  setCookie(c, 'auth_token', token, {
    httpOnly: true,
    secure: env.ENVIRONMENT === 'production',
    sameSite: 'Strict',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  })
}

function setRefreshTokenCookie(c: Parameters<typeof setCookie>[0], token: string, env: HonoEnv['Bindings']) {
  setCookie(c, 'refresh_token', token, {
    httpOnly: true,
    secure: env.ENVIRONMENT === 'production',
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/api/auth', // Only sent to /api/auth/* endpoints
  })
}

// POST /api/auth/register
auth.post('/register', rateLimiter('register', false), async (c) => {
  const body = await c.req.json<RegisterRequest>()
  const { username, email, password } = body

  if (!username || !email || !password) {
    return c.json({ error: 'BadRequest', message: 'Username, email, and password required' }, 400)
  }

  try {
    const db = createDatabaseClient(c.env)
    const authService = new AuthService(db, c.env)
    const emailService = new EmailService(c.env.RESEND_API_KEY, c.env.FROM_EMAIL || 'noreply@rpg.apogeeforge.com')

    const { userProfile, verificationToken } = await authService.register(username, email, password)

    // Auto-login: generate auth cookies
    const loginResult = await authService.login(username, password)
    if (loginResult.type === 'success') {
      setAccessTokenCookie(c, loginResult.accessToken, c.env)
      setRefreshTokenCookie(c, loginResult.refreshToken, c.env)
    }

    // Send verification email (fire and forget — don't fail registration on email error)
    const verifyUrl = `${c.env.PUBLIC_URL || 'https://rpg.apogeeforge.com'}/verify-email?token=${verificationToken}`
    emailService.buildVerificationEmail(username, verifyUrl)
    emailService.send({
      to: email,
      subject: 'Verify your Social Forge account',
      html: emailService.buildVerificationEmail(username, verifyUrl),
    }).catch(err => console.error('[register] Email send failed:', err))

    return c.json({ ...userProfile, verification_sent: true }, 201)
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes('already exists') || errorMessage.includes('already registered')) {
      return c.json({
        error: 'Conflict',
        message: isDev ? errorMessage : 'Username or email already in use',
      }, 409)
    }

    return c.json({
      error: 'BadRequest',
      message: sanitizeError(error, isDev),
    }, 400)
  }
})

// POST /api/auth/login
auth.post('/login', rateLimiter('login', false), async (c) => {
  const body = await c.req.json<LoginRequest>()
  const { username, password } = body

  if (!username || !password) {
    return c.json({ error: 'BadRequest', message: 'Username and password required' }, 400)
  }

  try {
    const db = createDatabaseClient(c.env)
    const authService = new AuthService(db, c.env)

    const result = await authService.login(username, password)

    if (result.type === 'totp_required') {
      // Return challenge token — no auth cookie set
      return c.json({ requires_2fa: true, totp_challenge_token: result.challengeToken })
    }

    setAccessTokenCookie(c, result.accessToken, c.env)
    setRefreshTokenCookie(c, result.refreshToken, c.env)
    return c.json(result.user)
  } catch (error) {
    return c.json({ error: 'Unauthorized', message: 'Invalid credentials' }, 401)
  }
})

// POST /api/auth/verify-totp
auth.post('/verify-totp', rateLimiter('totp_verify', false), async (c) => {
  const body = await c.req.json<VerifyTOTPRequest>()
  const { totp_challenge_token, code } = body

  if (!totp_challenge_token || !code) {
    return c.json({ error: 'BadRequest', message: 'Challenge token and code required' }, 400)
  }

  try {
    const db = createDatabaseClient(c.env)
    const authService = new AuthService(db, c.env)

    const { user, accessToken, refreshToken } = await authService.verifyTOTPChallenge(totp_challenge_token, code)
    setAccessTokenCookie(c, accessToken, c.env)
    setRefreshTokenCookie(c, refreshToken, c.env)
    return c.json(user)
  } catch (error) {
    return c.json({ error: 'Unauthorized', message: 'Invalid 2FA code' }, 401)
  }
})

// POST /api/auth/verify-email
auth.post('/verify-email', rateLimiter('email_verify', false), async (c) => {
  const body = await c.req.json<VerifyEmailRequest>()
  const { token } = body

  if (!token) {
    return c.json({ error: 'BadRequest', message: 'Token required' }, 400)
  }

  try {
    const db = createDatabaseClient(c.env)
    const authService = new AuthService(db, c.env)

    await authService.verifyEmail(token)
    return c.json({ message: 'Email verified successfully' })
  } catch (error) {
    return c.json({ error: 'BadRequest', message: 'Invalid or expired verification token' }, 400)
  }
})

// POST /api/auth/resend-verification
auth.post('/resend-verification', authMiddleware, rateLimiter('resend_verify'), async (c) => {
  const userId = c.get('userId')
  if (!userId) return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)

  try {
    const db = createDatabaseClient(c.env)
    const authService = new AuthService(db, c.env)
    const emailService = new EmailService(c.env.RESEND_API_KEY, c.env.FROM_EMAIL || 'noreply@rpg.apogeeforge.com')

    const verificationToken = await authService.resendVerification(userId)

    // Get user email
    const user = await db.queryOne<{ email: string; username: string }>(
      'SELECT email, username FROM users WHERE id = ?',
      userId
    )

    if (user?.email) {
      const verifyUrl = `${c.env.PUBLIC_URL || 'https://rpg.apogeeforge.com'}/verify-email?token=${verificationToken}`
      emailService.send({
        to: user.email,
        subject: 'Verify your Social Forge account',
        html: emailService.buildVerificationEmail(user.username, verifyUrl),
      }).catch(err => console.error('[resend-verification] Email send failed:', err))
    }

    return c.json({ message: 'Verification email sent' })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('already verified')) {
      return c.json({ error: 'BadRequest', message: 'Email already verified' }, 400)
    }
    return c.json({ error: 'BadRequest', message: errorMessage }, 400)
  }
})

// POST /api/auth/forgot-password
auth.post('/forgot-password', rateLimiter('password_reset', false), async (c) => {
  const body = await c.req.json<ForgotPasswordRequest>()
  const { email } = body

  // Always return 200 — no user enumeration
  if (!email) {
    return c.json({ message: 'If an account with that email exists, a reset link has been sent.' })
  }

  try {
    const db = createDatabaseClient(c.env)
    const authService = new AuthService(db, c.env)
    const emailService = new EmailService(c.env.RESEND_API_KEY, c.env.FROM_EMAIL || 'noreply@rpg.apogeeforge.com')

    const resetToken = await authService.initiatePasswordReset(email)

    if (resetToken) {
      const user = await db.queryOne<{ username: string }>(
        'SELECT username FROM users WHERE email = ?',
        email
      )
      const resetUrl = `${c.env.PUBLIC_URL || 'https://rpg.apogeeforge.com'}/#reset?token=${resetToken}`
      emailService.send({
        to: email,
        subject: 'Reset your Social Forge password',
        html: emailService.buildPasswordResetEmail(user?.username || 'User', resetUrl),
      }).catch(err => console.error('[forgot-password] Email send failed:', err))
    }
  } catch {
    // Swallow all errors — always return 200
  }

  return c.json({ message: 'If an account with that email exists, a reset link has been sent.' })
})

// POST /api/auth/reset-password
auth.post('/reset-password', async (c) => {
  const body = await c.req.json<ResetPasswordRequest>()
  const { token, new_password } = body

  if (!token || !new_password) {
    return c.json({ error: 'BadRequest', message: 'Token and new password required' }, 400)
  }

  try {
    const db = createDatabaseClient(c.env)
    const authService = new AuthService(db, c.env)

    await authService.completePasswordReset(token, new_password)
    return c.json({ message: 'Password reset successfully. Please log in.' })
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({ error: 'BadRequest', message: sanitizeError(error, isDev) }, 400)
  }
})

// POST /api/auth/settings/2fa/setup
auth.post('/settings/2fa/setup', authMiddleware, emailVerifiedMiddleware, async (c) => {
  const userId = c.get('userId')
  if (!userId) return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)

  try {
    const db = createDatabaseClient(c.env)
    const authService = new AuthService(db, c.env)

    const setup = await authService.setupTOTP(userId)
    return c.json(setup)
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({ error: 'BadRequest', message: sanitizeError(error, isDev) }, 400)
  }
})

// POST /api/auth/settings/2fa/enable
auth.post('/settings/2fa/enable', authMiddleware, async (c) => {
  const userId = c.get('userId')
  if (!userId) return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)

  const body = await c.req.json<{ code: string }>()
  if (!body.code) return c.json({ error: 'BadRequest', message: 'TOTP code required' }, 400)

  try {
    const db = createDatabaseClient(c.env)
    const authService = new AuthService(db, c.env)

    await authService.enableTOTP(userId, body.code)
    return c.json({ message: '2FA enabled successfully' })
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({ error: 'BadRequest', message: sanitizeError(error, isDev) }, 400)
  }
})

// POST /api/auth/settings/2fa/disable
auth.post('/settings/2fa/disable', authMiddleware, async (c) => {
  const userId = c.get('userId')
  if (!userId) return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)

  const body = await c.req.json<{ password: string }>()
  if (!body.password) return c.json({ error: 'BadRequest', message: 'Password required' }, 400)

  try {
    const db = createDatabaseClient(c.env)
    const authService = new AuthService(db, c.env)

    await authService.disableTOTP(userId, body.password)
    return c.json({ message: '2FA disabled successfully' })
  } catch (error) {
    return c.json({ error: 'Unauthorized', message: 'Invalid password' }, 401)
  }
})

// POST /api/auth/settings/change-password
auth.post('/settings/change-password', authMiddleware, async (c) => {
  const userId = c.get('userId')
  if (!userId) return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)

  const body = await c.req.json<ChangePasswordRequest>()
  const { old_password, new_password } = body

  if (!old_password || !new_password) {
    return c.json({ error: 'BadRequest', message: 'Old and new passwords required' }, 400)
  }

  try {
    const db = createDatabaseClient(c.env)
    const authService = new AuthService(db, c.env)

    await authService.changePassword(userId, old_password, new_password)
    return c.json({ message: 'Password changed successfully' })
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({ error: 'BadRequest', message: sanitizeError(error, isDev) }, 400)
  }
})

// POST /api/auth/refresh — silently rotates refresh token and issues new access token
auth.post('/refresh', rateLimiter('token_refresh', false), async (c) => {
  const rawRefreshToken = getCookie(c, 'refresh_token')
  if (!rawRefreshToken) {
    return c.json({ error: 'Unauthorized', message: 'No refresh token', code: 'SESSION_EXPIRED' }, 401)
  }
  try {
    const db = createDatabaseClient(c.env)
    const authService = new AuthService(db, c.env)
    const { user, newRawToken } = await authService.rotateRefreshToken(rawRefreshToken)
    const newAccessToken = await authService.generateAccessToken(user)
    setAccessTokenCookie(c, newAccessToken, c.env)
    setRefreshTokenCookie(c, newRawToken, c.env)
    return c.json({ ok: true })
  } catch (error) {
    // Clear both cookies — force re-login
    deleteCookie(c, 'auth_token', { path: '/' })
    deleteCookie(c, 'refresh_token', { path: '/api/auth' })
    return c.json({ error: 'Unauthorized', message: (error as Error).message, code: 'SESSION_EXPIRED' }, 401)
  }
})

// POST /api/auth/logout
auth.post('/logout', authMiddleware, async (c) => {
  // Revoke the refresh token in DB (fire-and-forget-safe)
  const rawRefreshToken = getCookie(c, 'refresh_token')
  if (rawRefreshToken) {
    try {
      const db = createDatabaseClient(c.env)
      const authService = new AuthService(db, c.env)
      await authService.revokeRefreshToken(rawRefreshToken)
    } catch {
      // Non-fatal — cookie deletion still proceeds
    }
  }

  deleteCookie(c, 'auth_token', { path: '/' })
  deleteCookie(c, 'refresh_token', { path: '/api/auth' })

  return c.json({ message: 'Logged out successfully' })
})

// GET /api/auth/me
auth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')

  if (!userId) {
    return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)
  }

  try {
    const db = createDatabaseClient(c.env)
    const authService = new AuthService(db, c.env)

    const user = await authService.getCurrentUser(userId)

    return c.json(user)
  } catch (error) {
    return c.json({ error: 'NotFound', message: 'User not found' }, 404)
  }
})

export default auth
