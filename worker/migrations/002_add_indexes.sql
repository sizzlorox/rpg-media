-- Migration 002: Database Indexes
-- Social Forge Platform
-- Created per Constitution Principle II (Index-First Performance)
-- Total: 16 indexes across all tables
-- Created: 2026-02-13

-- Users table indexes (3 indexes)
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_level ON users(level);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Posts table indexes (4 indexes)
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_user_id_created_at ON posts(user_id, created_at DESC);
CREATE INDEX idx_posts_is_pinned ON posts(is_pinned, created_at DESC) WHERE is_pinned = 1;

-- Likes table indexes (3 indexes)
CREATE UNIQUE INDEX idx_likes_user_post ON likes(user_id, post_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);

-- Comments table indexes (2 indexes)
CREATE INDEX idx_comments_post_id ON comments(post_id, created_at DESC);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- Follows table indexes (3 indexes)
CREATE UNIQUE INDEX idx_follows_follower_followee ON follows(follower_id, followee_id);
CREATE INDEX idx_follows_followee_id ON follows(followee_id);
CREATE INDEX idx_follows_follower_id ON follows(follower_id);

-- Level thresholds table: No additional indexes needed (primary key on level)

-- Run PRAGMA optimize per Constitution Principle II
PRAGMA optimize;
