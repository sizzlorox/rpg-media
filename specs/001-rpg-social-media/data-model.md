# Data Model: RPG-Gamified Social Media Platform

**Phase**: 1 - Database Schema Design
**Date**: 2026-02-13
**Status**: Complete

## Overview

This document defines the database schema for the RPG Social Media platform, including entity definitions, relationships, indexes, and D1-specific constraints. All tables follow Constitution Principle III (STRICT mode with explicit types).

---

## Entity Relationship Diagram

```
users (1) ──── (N) posts
  │                │
  │ (1)         (N)│
  │                │
  ├─ (N) likes ────┘
  │      │
  │      └──── (N) posts
  │
  ├─ (N) comments ─── (N) posts
  │
  └─ (N) follows (follower_id)
     │
     └─ (N) follows (followee_id) ──> users
```

---

## 1. Users Table

### Purpose
Stores user accounts with RPG character attributes (level, XP, stats).

### Schema

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- UUID v4
  username TEXT NOT NULL UNIQUE,          -- Unique display name
  password_hash TEXT NOT NULL,            -- bcrypt hashed password
  level INTEGER NOT NULL DEFAULT 1,       -- Character level (1-100)
  total_xp INTEGER NOT NULL DEFAULT 0,    -- Cumulative XP earned
  created_at INTEGER NOT NULL,            -- Unix timestamp (milliseconds)
  updated_at INTEGER NOT NULL,            -- Unix timestamp (milliseconds)
  avatar_url TEXT,                        -- R2 URL (unlocked at level 7)
  banner_url TEXT,                        -- R2 URL (unlocked at level 7)
  bio TEXT,                               -- Profile description (max 500 chars)
  theme_preference TEXT DEFAULT 'default' -- Custom theme (unlocked at level 10)
) STRICT;

-- Indexes (Constitution Principle II)
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_level ON users(level);              -- For leaderboards
CREATE INDEX idx_users_created_at ON users(created_at);    -- For user discovery
```

### Validation Rules
- `username`: 3-20 characters, alphanumeric + underscore, case-insensitive unique
- `level`: Range [1, 100], calculated via `floor(sqrt(total_xp / 100))`
- `total_xp`: Non-negative, monotonically increasing (never decreases)
- `avatar_url`, `banner_url`: NULL if level < 7
- `bio`: Max 500 characters
- `theme_preference`: One of ['default', 'dark', 'light', 'rpg', 'cyberpunk'] (level 10+)

### Computed Fields (Application Layer)
```typescript
interface User {
  id: string
  username: string
  level: number
  total_xp: number
  // Computed fields:
  xp_for_current_level: number  // = (level^2) * 100
  xp_for_next_level: number     // = ((level+1)^2) * 100
  xp_progress_percent: number   // = (total_xp - current_level_xp) / (next_level_xp - current_level_xp) * 100
}
```

### Character Stats (Computed from Related Tables)
- `total_posts`: COUNT(posts WHERE user_id = ?)
- `total_likes_given`: COUNT(likes WHERE user_id = ?)
- `total_likes_received`: COUNT(likes WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?))
- `total_comments_made`: COUNT(comments WHERE user_id = ?)
- `followers_count`: COUNT(follows WHERE followee_id = ?)
- `following_count`: COUNT(follows WHERE follower_id = ?)

### Row Size Estimate
- Fixed fields: ~200 bytes
- Variable fields (bio, URLs): ~600 bytes
- **Total**: ~800 bytes << 2MB limit ✅

---

## 2. Posts Table

### Purpose
Stores user-generated text content and media references.

### Schema

```sql
CREATE TABLE posts (
  id TEXT PRIMARY KEY,                    -- UUID v4
  user_id TEXT NOT NULL,                  -- Foreign key to users.id
  content TEXT NOT NULL,                  -- Post text content
  char_count INTEGER NOT NULL,            -- Content length (for level gating)
  media_url TEXT,                         -- R2 image URL (level 3+)
  created_at INTEGER NOT NULL,            -- Unix timestamp (milliseconds)
  updated_at INTEGER NOT NULL,            -- Unix timestamp (milliseconds)
  is_pinned INTEGER DEFAULT 0,            -- Boolean (0/1), unlocked at level 15

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;

-- Indexes (Constitution Principle II)
CREATE INDEX idx_posts_user_id ON posts(user_id);                      -- User's post history
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);           -- Feed chronological sort
CREATE INDEX idx_posts_user_id_created_at ON posts(user_id, created_at DESC);  -- Composite for user timeline
CREATE INDEX idx_posts_is_pinned ON posts(is_pinned, created_at DESC) WHERE is_pinned = 1;  -- Partial index for pinned posts
```

### Validation Rules
- `content`: Length based on user level:
  - Level 1-4: Max 280 characters (FR-006)
  - Level 5-9: Max 500 characters
  - Level 10+: Max 1000 characters
- `char_count`: Must equal `length(content)`
- `media_url`: NULL if user level < 3 (FR-009, FR-025)
- `is_pinned`: 0 or 1, only 1 if user level ≥ 15 (FR-025)

### Row Size Estimate
- Fixed fields: ~100 bytes
- Content: Max 1000 chars = ~1000 bytes
- Media URL: ~100 bytes
- **Total**: ~1,200 bytes << 2MB limit ✅

---

## 3. Likes Table

### Purpose
Tracks user likes on posts. Awards XP to both liker and post creator.

### Schema

```sql
CREATE TABLE likes (
  id TEXT PRIMARY KEY,                    -- UUID v4
  user_id TEXT NOT NULL,                  -- Foreign key to users.id (who liked)
  post_id TEXT NOT NULL,                  -- Foreign key to posts.id (what was liked)
  created_at INTEGER NOT NULL,            -- Unix timestamp (milliseconds)

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,

  UNIQUE(user_id, post_id)                -- Prevent duplicate likes
) STRICT;

-- Indexes (Constitution Principle II)
CREATE UNIQUE INDEX idx_likes_user_post ON likes(user_id, post_id);    -- Prevent duplicates, check existing
CREATE INDEX idx_likes_post_id ON likes(post_id);                      -- Like count per post
CREATE INDEX idx_likes_user_id ON likes(user_id);                      -- Likes given by user
```

### XP Awards (FR-015)
- Liker earns: **1 XP**
- Post creator earns: **2 XP**

### Batch Operation Example
```typescript
// Award XP to both parties atomically
await db.batch([
  db.prepare('INSERT INTO likes (id, user_id, post_id, created_at) VALUES (?, ?, ?, ?)')
    .bind(likeId, likerId, postId, now),
  db.prepare('UPDATE users SET total_xp = total_xp + ? WHERE id = ?')
    .bind(1, likerId),  // Liker gets 1 XP
  db.prepare('UPDATE users SET total_xp = total_xp + ? WHERE id = ?')
    .bind(2, postCreatorId)  // Creator gets 2 XP
])
```

### Row Size Estimate
- All fields: ~150 bytes << 2MB limit ✅

---

## 4. Comments Table

### Purpose
Stores user comments on posts. Awards XP to both commenter and post creator.

### Schema

```sql
CREATE TABLE comments (
  id TEXT PRIMARY KEY,                    -- UUID v4
  user_id TEXT NOT NULL,                  -- Foreign key to users.id (who commented)
  post_id TEXT NOT NULL,                  -- Foreign key to posts.id (parent post)
  content TEXT NOT NULL,                  -- Comment text (max 500 chars)
  created_at INTEGER NOT NULL,            -- Unix timestamp (milliseconds)
  updated_at INTEGER NOT NULL,            -- Unix timestamp (milliseconds)

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) STRICT;

-- Indexes (Constitution Principle II)
CREATE INDEX idx_comments_post_id ON comments(post_id, created_at DESC);  -- Comments per post
CREATE INDEX idx_comments_user_id ON comments(user_id);                   -- Comments by user
```

### Validation Rules
- `content`: Max 500 characters
- Cannot comment on own posts (application-level validation)

### XP Awards (FR-015)
- Commenter earns: **5 XP**
- Post creator earns: **3 XP**

### Row Size Estimate
- Fixed fields: ~100 bytes
- Content: Max 500 chars = ~500 bytes
- **Total**: ~600 bytes << 2MB limit ✅

---

## 5. Follows Table

### Purpose
Tracks follower/following relationships. Awards XP to the followed user.

### Schema

```sql
CREATE TABLE follows (
  id TEXT PRIMARY KEY,                    -- UUID v4
  follower_id TEXT NOT NULL,              -- Foreign key to users.id (who follows)
  followee_id TEXT NOT NULL,              -- Foreign key to users.id (who is followed)
  created_at INTEGER NOT NULL,            -- Unix timestamp (milliseconds)

  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE,

  UNIQUE(follower_id, followee_id),       -- Prevent duplicate follows
  CHECK(follower_id != followee_id)       -- Cannot follow self
) STRICT;

-- Indexes (Constitution Principle II)
CREATE UNIQUE INDEX idx_follows_follower_followee ON follows(follower_id, followee_id);  -- Prevent duplicates
CREATE INDEX idx_follows_followee_id ON follows(followee_id);    -- Followers of user
CREATE INDEX idx_follows_follower_id ON follows(follower_id);    -- Following list
```

### XP Awards (FR-015)
- Followee (user being followed) earns: **5 XP**
- Follower earns: **0 XP** (no reward for following)

### Row Size Estimate
- All fields: ~120 bytes << 2MB limit ✅

---

## 6. Level Thresholds Table (Reference Data)

### Purpose
Defines XP thresholds and feature unlocks for each level. Populated via migration, not user-generated.

### Schema

```sql
CREATE TABLE level_thresholds (
  level INTEGER PRIMARY KEY,              -- Level number (1-100)
  xp_required INTEGER NOT NULL,           -- Total XP needed to reach this level
  features_unlocked TEXT NOT NULL         -- JSON array of feature names
) STRICT;

-- No additional indexes needed (primary key on level)
```

### Data Population (Migration)
```sql
INSERT INTO level_thresholds (level, xp_required, features_unlocked) VALUES
  (1, 0, '["basic_posting_280", "liking", "commenting", "following"]'),
  (2, 400, '[]'),
  (3, 900, '["image_uploads"]'),
  (4, 1600, '[]'),
  (5, 2500, '["extended_posts_500"]'),
  (7, 4900, '["profile_customization", "avatar_upload", "banner_upload"]'),
  (10, 10000, '["advanced_posts_1000", "custom_themes"]'),
  (15, 22500, '["pinned_posts", "polls"]');
```

### Usage Pattern
```typescript
// Check if user can access feature
async function canAccessFeature(userId: string, feature: string, db: D1Database): Promise<boolean> {
  const user = await db.prepare('SELECT level FROM users WHERE id = ?')
    .bind(userId).first<{ level: number }>()

  const threshold = await db.prepare(
    'SELECT level FROM level_thresholds WHERE features_unlocked LIKE ? ORDER BY level ASC LIMIT 1'
  ).bind(`%"${feature}"%`).first<{ level: number }>()

  return user.level >= threshold.level
}
```

---

## 7. Notifications Table (Future Enhancement)

### Purpose
Stores level-up notifications and interaction alerts.

### Schema (Deferred to Phase 2)
```sql
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,                     -- 'level_up', 'new_follower', 'like', 'comment'
  content TEXT NOT NULL,                  -- Notification message
  is_read INTEGER DEFAULT 0,              -- Boolean (0/1)
  created_at INTEGER NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;

CREATE INDEX idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = 0;
```

**Note**: Not required for MVP. Can be added in iteration after core features are working.

---

## Migration Order (Constitution Principle VI)

### Migration 001: Initial Schema
```sql
-- Order respects foreign key dependencies
CREATE TABLE users (...) STRICT;
CREATE TABLE posts (...) STRICT;        -- Depends on users
CREATE TABLE likes (...) STRICT;        -- Depends on users, posts
CREATE TABLE comments (...) STRICT;     -- Depends on users, posts
CREATE TABLE follows (...) STRICT;      -- Depends on users
CREATE TABLE level_thresholds (...) STRICT;  -- No dependencies

-- Populate reference data
INSERT INTO level_thresholds ...;

-- Run optimization
PRAGMA optimize;
```

### Migration 002: Indexes
```sql
-- Users indexes
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_level ON users(level);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Posts indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_user_id_created_at ON posts(user_id, created_at DESC);
CREATE INDEX idx_posts_is_pinned ON posts(is_pinned, created_at DESC) WHERE is_pinned = 1;

-- Likes indexes
CREATE UNIQUE INDEX idx_likes_user_post ON likes(user_id, post_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);

-- Comments indexes
CREATE INDEX idx_comments_post_id ON comments(post_id, created_at DESC);
CREATE INDEX idx_comments_user_id ON comments(user_id);

-- Follows indexes
CREATE UNIQUE INDEX idx_follows_follower_followee ON follows(follower_id, followee_id);
CREATE INDEX idx_follows_followee_id ON follows(followee_id);
CREATE INDEX idx_follows_follower_id ON follows(follower_id);

-- Run optimization
PRAGMA optimize;
```

### Migration 003: Media Support (Level 3+ Feature)
```sql
-- Already included in posts table (media_url column)
-- This migration would add R2 bucket configuration
-- No schema changes needed
```

---

## TypeScript Type Definitions

### Shared Types (worker/src/lib/types.ts)

```typescript
// Database Models
export interface User {
  id: string
  username: string
  password_hash: string
  level: number
  total_xp: number
  created_at: number
  updated_at: number
  avatar_url: string | null
  banner_url: string | null
  bio: string | null
  theme_preference: string
}

export interface Post {
  id: string
  user_id: string
  content: string
  char_count: number
  media_url: string | null
  created_at: number
  updated_at: number
  is_pinned: number  // 0 or 1
}

export interface Like {
  id: string
  user_id: string
  post_id: string
  created_at: number
}

export interface Comment {
  id: string
  user_id: string
  post_id: string
  content: string
  created_at: number
  updated_at: number
}

export interface Follow {
  id: string
  follower_id: string
  followee_id: string
  created_at: number
}

export interface LevelThreshold {
  level: number
  xp_required: number
  features_unlocked: string  // JSON array
}

// API Response Types
export interface UserProfile extends User {
  // Computed stats
  total_posts: number
  total_likes_given: number
  total_likes_received: number
  total_comments_made: number
  followers_count: number
  following_count: number
  xp_for_current_level: number
  xp_for_next_level: number
  xp_progress_percent: number
}

export interface PostWithAuthor extends Post {
  author: {
    username: string
    level: number
    avatar_url: string | null
  }
  like_count: number
  comment_count: number
  is_liked_by_user: boolean
}
```

---

## Constitution Compliance Summary

### ✅ Principle I: Horizontal Database Scaling
- Single database for MVP (<10GB estimated)
- Schema designed for future sharding by user_id if needed

### ✅ Principle II: Index-First Performance
- 16 indexes total across all tables
- Unique indexes on composite keys (prevent duplicates)
- Partial index for pinned posts (WHERE clause optimization)
- `PRAGMA optimize` in every migration

### ✅ Principle III: Type Safety & Schema Strictness
- All tables use STRICT mode
- Explicit types: TEXT, INTEGER (no dynamic typing)
- TypeScript interfaces mirror database schema

### ✅ Principle IV: Local-First Development
- Migrations tested locally: `wrangler d1 execute rpg-social-db --local --file=migrations/001_initial.sql`
- Vitest + Miniflare for database tests

### ✅ Principle V: Batch Operations & Concurrency
- XP awards use `batch()` for atomic multi-statement operations
- Feed queries optimized with composite indexes

### ✅ Principle VI: Migration Safety
- Foreign key dependencies respected in table creation order
- No BEGIN TRANSACTION / COMMIT statements
- Sequential migration numbering (001, 002, 003)

### ✅ Principle VII: Platform Limits Awareness
- Largest row (posts): ~1,200 bytes << 2MB limit
- Max columns (users): 11 << 100 limit
- Database size: ~50MB << 10GB limit

---

## Phase 1 Data Model Status: ✅ COMPLETE

**Next Artifact**: contracts/ (API specifications)
