-- Migration 001: Initial Database Schema
-- Social Forge Platform
-- All tables use STRICT mode per Constitution Principle III
-- Created: 2026-02-13

-- Table 1: Users (no dependencies)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  total_xp INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  avatar_url TEXT,
  banner_url TEXT,
  bio TEXT,
  theme_preference TEXT DEFAULT 'default'
) STRICT;

-- Table 2: Posts (depends on users)
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  char_count INTEGER NOT NULL,
  media_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  is_pinned INTEGER DEFAULT 0,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;

-- Table 3: Likes (depends on users, posts)
CREATE TABLE likes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,

  UNIQUE(user_id, post_id)
) STRICT;

-- Table 4: Comments (depends on users, posts)
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) STRICT;

-- Table 5: Follows (depends on users)
CREATE TABLE follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL,
  followee_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,

  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE(follower_id, followee_id),
  CHECK(follower_id != followee_id)
) STRICT;

-- Table 6: Level Thresholds (reference data, no dependencies)
CREATE TABLE level_thresholds (
  level INTEGER PRIMARY KEY,
  xp_required INTEGER NOT NULL,
  features_unlocked TEXT NOT NULL
) STRICT;

-- Populate level thresholds
INSERT INTO level_thresholds (level, xp_required, features_unlocked) VALUES
  (1, 0, '["basic_posting_280", "liking", "commenting", "following"]'),
  (2, 400, '[]'),
  (3, 900, '["image_uploads"]'),
  (4, 1600, '[]'),
  (5, 2500, '["extended_posts_500"]'),
  (6, 3600, '[]'),
  (7, 4900, '["profile_customization", "avatar_upload", "banner_upload"]'),
  (8, 6400, '[]'),
  (9, 8100, '[]'),
  (10, 10000, '["advanced_posts_1000", "custom_themes"]'),
  (11, 12100, '[]'),
  (12, 14400, '[]'),
  (13, 16900, '[]'),
  (14, 19600, '[]'),
  (15, 22500, '["pinned_posts"]');

-- Note: Indexes are created in migration 002
