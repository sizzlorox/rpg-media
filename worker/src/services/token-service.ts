// TokenService: single-use token lifecycle for email verification and password reset
// Tokens are stored as SHA-256 hashes — raw tokens only travel via email links

import { DatabaseClient } from '../lib/db'

type TokenType = 'email_verify' | 'password_reset'

const TOKEN_TTL_MS: Record<TokenType, number> = {
  email_verify: 24 * 60 * 60 * 1000,   // 24 hours
  password_reset: 60 * 60 * 1000,       // 1 hour
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateRawToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export class TokenService {
  constructor(private db: DatabaseClient) {}

  // Generate a new single-use token for a user.
  // Invalidates any existing unused tokens of the same type for this user.
  async generateToken(userId: string, type: TokenType): Promise<string> {
    const now = Date.now()
    const rawToken = generateRawToken()
    const tokenHash = await sha256Hex(rawToken)
    const expiresAt = now + TOKEN_TTL_MS[type]
    const tokenId = crypto.randomUUID()

    // Invalidate prior unused tokens of same type (mark them as used)
    await this.db.exec(
      `UPDATE auth_tokens SET used_at = ? WHERE user_id = ? AND token_type = ? AND used_at IS NULL`,
      now, userId, type
    )

    // Insert new token
    await this.db.exec(
      `INSERT INTO auth_tokens (id, user_id, token_hash, token_type, expires_at, used_at, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?)`,
      tokenId, userId, tokenHash, type, expiresAt, now
    )

    return rawToken
  }

  // Validate a raw token and mark it as used atomically.
  // Returns userId on success, null if invalid/expired/already-used.
  async validateAndConsume(rawToken: string, type: TokenType): Promise<string | null> {
    const tokenHash = await sha256Hex(rawToken)
    const now = Date.now()

    const record = await this.db.queryOne<{
      id: string
      user_id: string
      expires_at: number
      used_at: number | null
    }>(
      `SELECT id, user_id, expires_at, used_at FROM auth_tokens
       WHERE token_hash = ? AND token_type = ?`,
      tokenHash, type
    )

    if (!record) return null
    if (record.used_at !== null) return null      // already used
    if (record.expires_at < now) return null      // expired

    // Mark as used
    await this.db.exec(
      `UPDATE auth_tokens SET used_at = ? WHERE id = ?`,
      now, record.id
    )

    return record.user_id
  }
}
