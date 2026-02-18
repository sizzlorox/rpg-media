// TOTPService: TOTP-based 2FA using the otpauth package
// Uses Web Crypto API — compatible with Cloudflare Workers

import * as OTPAuth from 'otpauth'

// Recovery code character set (no ambiguous chars O/0/I/1)
const RECOVERY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const RECOVERY_CODE_LENGTH = 8
const RECOVERY_CODE_COUNT = 8

function generateRecoveryCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    let code = ''
    const bytes = new Uint8Array(RECOVERY_CODE_LENGTH)
    crypto.getRandomValues(bytes)
    for (const byte of bytes) {
      code += RECOVERY_CHARS[byte % RECOVERY_CHARS.length]
    }
    codes.push(code)
  }
  return codes
}

export interface TOTPSetupData {
  secret: string    // base32-encoded secret for storage
  uri: string       // otpauth:// URI for QR code generation
  recoveryCodes: string[]
}

export class TOTPService {
  // Generate a new TOTP secret and recovery codes for a user.
  // Does NOT store anything — caller is responsible for storage.
  generateSetup(username: string): TOTPSetupData {
    const totp = new OTPAuth.TOTP({
      issuer: 'SocialForge',
      label: username,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    })

    const secret = totp.secret.base32
    const uri = totp.toString()
    const recoveryCodes = generateRecoveryCodes()

    return { secret, uri, recoveryCodes }
  }

  // Validate a TOTP code against a stored base32 secret.
  // Accepts a ±1 window (30s before/after) to account for clock drift.
  validate(secretBase32: string, code: string): boolean {
    try {
      const totp = new OTPAuth.TOTP({
        issuer: 'SocialForge',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(secretBase32),
      })

      const delta = totp.validate({ token: code, window: 1 })
      return delta !== null
    } catch {
      return false
    }
  }
}
