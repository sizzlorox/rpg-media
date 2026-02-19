-- Migration 006: Add channels to posts
-- Wipes all existing posts (cascades to likes/comments via FK ON DELETE CASCADE)
DELETE FROM posts;

ALTER TABLE posts ADD COLUMN channel TEXT NOT NULL DEFAULT 'general';

CREATE INDEX idx_posts_channel_created_at ON posts(channel, created_at DESC);

PRAGMA optimize;
