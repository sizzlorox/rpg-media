-- Migration 005: Short-lived access tokens + long-lived refresh tokens
-- Adds refresh_tokens table for dual-token auth pattern.
-- A new table is used (not extending auth_tokens) because the existing
-- CHECK(token_type IN ('email_verify', 'password_reset')) constraint cannot
-- be altered in SQLite without recreating the table.
--
-- family_id enables replay-attack detection: if a revoked token is presented
-- again, all tokens in its family are immediately revoked (forcing re-login).

CREATE TABLE refresh_tokens (
  id           TEXT    PRIMARY KEY,
  user_id      TEXT    NOT NULL,
  token_hash   TEXT    NOT NULL UNIQUE,  -- SHA-256 hex of raw 32-byte token
  family_id    TEXT    NOT NULL,          -- shared by all rotated descendants; used for replay detection
  expires_at   INTEGER NOT NULL,          -- Unix ms
  revoked_at   INTEGER,                   -- NULL = active
  created_at   INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;

CREATE UNIQUE INDEX idx_refresh_tokens_hash   ON refresh_tokens(token_hash);
CREATE        INDEX idx_refresh_tokens_family ON refresh_tokens(family_id);
CREATE        INDEX idx_refresh_tokens_user   ON refresh_tokens(user_id, expires_at);
