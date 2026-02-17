-- Content Moderation System
-- Phase 1: Database schema for perceptual hash caching and admin review queue
-- Applied: 2026-02-18

-- Perceptual hash cache (avoid re-scanning duplicate images)
CREATE TABLE moderation_cache (
  hash TEXT PRIMARY KEY,           -- 16-char hex perceptual hash (dHash)
  status TEXT NOT NULL CHECK(status IN ('approved', 'flagged', 'rejected')),
  flagged_categories TEXT,         -- JSON array: ["violence", "adult"]
  confidence_scores TEXT,          -- JSON object: {"violence": 0.95}
  first_seen_at INTEGER NOT NULL,  -- Unix timestamp
  last_seen_at INTEGER NOT NULL,   -- Unix timestamp
  occurrence_count INTEGER DEFAULT 1 CHECK(occurrence_count >= 1)
) STRICT;

CREATE INDEX idx_moderation_cache_hash ON moderation_cache(hash);
CREATE INDEX idx_moderation_cache_status ON moderation_cache(status, last_seen_at);

-- Manual review queue for admins
CREATE TABLE moderation_flags (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL CHECK(content_type IN ('post', 'comment', 'image')),
  content_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  flagged_reason TEXT NOT NULL,    -- 'violence' | 'adult' | 'csam_suspected' | 'hate' | 'self_harm'
  severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
  reviewed_by TEXT,                -- User ID of admin who reviewed
  reviewed_at INTEGER,             -- Unix timestamp
  evidence_data TEXT,              -- JSON: API response, hash, confidence scores
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX idx_moderation_flags_status ON moderation_flags(status, created_at);
CREATE INDEX idx_moderation_flags_severity ON moderation_flags(severity, status);
CREATE INDEX idx_moderation_flags_user ON moderation_flags(user_id);
CREATE INDEX idx_moderation_flags_content ON moderation_flags(content_type, content_id);

-- Add visibility controls to existing tables
ALTER TABLE posts ADD COLUMN is_hidden INTEGER DEFAULT 0 CHECK(is_hidden IN (0, 1));
ALTER TABLE comments ADD COLUMN is_hidden INTEGER DEFAULT 0 CHECK(is_hidden IN (0, 1));

-- Index for filtering hidden content
CREATE INDEX idx_posts_is_hidden ON posts(is_hidden);
CREATE INDEX idx_comments_is_hidden ON comments(is_hidden);
