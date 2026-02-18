-- Migration 004: Email verification, 2FA (TOTP), password reset
-- Adds email, email_verified, totp_secret, totp_enabled, recovery_codes to users
-- Creates auth_tokens table for single-use email verification and password reset tokens

ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN totp_secret TEXT;
ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN recovery_codes TEXT; -- JSON array of bcrypt-hashed codes

CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_email_verified ON users(email_verified);

CREATE TABLE auth_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,    -- SHA-256 hex of raw token
  token_type TEXT NOT NULL CHECK(token_type IN ('email_verify', 'password_reset')),
  expires_at INTEGER NOT NULL,
  used_at INTEGER,             -- NULL = unused; set on consumption
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX idx_auth_tokens_hash ON auth_tokens(token_hash, token_type);
CREATE INDEX idx_auth_tokens_user ON auth_tokens(user_id, token_type);
CREATE INDEX idx_auth_tokens_expires ON auth_tokens(expires_at);
