# Implementation Plan: RPG-Gamified Social Media Platform

**Branch**: `001-rpg-social-media` | **Date**: 2026-02-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-rpg-social-media/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a Twitter-like social media platform with RPG gamification mechanics where users earn XP through interactions (posting, liking, commenting), level up their character profiles, and unlock features progressively. The platform uses Cloudflare D1 for database storage, Hono framework for API routing, and deploys to Cloudflare Workers.

**Key Differentiator**: Character progression system that transforms standard social engagement into an RPG experience with measurable advancement, presented through a retro terminal/MUD (Multi-User Dungeon) aesthetic.

**New Requirements** (2026-02-13 update):
- Authentication: Register/login flows with JWT cookies
- Analytics: Cloudflare Web Analytics for user behavior tracking
- Error Logging: Sentry integration for production error monitoring
- UI Theme: Terminal/MUD aesthetic (ASCII art, monospace fonts, green-on-black styling)

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode enabled
**Primary Dependencies**:
  - Backend: Hono 4.x (web framework), Cloudflare D1 (SQLite database), Wrangler CLI 3.x (deployment), @sentry/cloudflare 8.x (error tracking)
  - Frontend: React 18+, Vite 5.x, xterm.js (terminal emulation), xterm-addon-fit (responsive terminal sizing)
**Storage**: Cloudflare D1 (SQLite-based distributed database), Cloudflare R2 (image storage for level 3+ users)
**Testing**: Vitest (unit tests), Miniflare (D1 database testing), Playwright (E2E tests)
**Target Platform**: Cloudflare Workers (edge compute), Cloudflare Pages (static frontend hosting)
**Project Type**: Web application (backend API on Workers + frontend on Pages)
**Observability**:
  - Analytics: Cloudflare Web Analytics (page views, user sessions, engagement metrics)
  - Error Tracking: Sentry for Cloudflare Workers (exception monitoring, performance tracking)
  - Logging: Structured JSON logs via Hono middleware (user actions, XP awards, level-ups)
**Performance Goals**: <2s feed load, <1s XP update visibility, <2s level-up notification, support 100 concurrent users per Worker instance
**Constraints**: D1 single-threaded processing, 10GB database limit, 2MB row size limit, 1,000 queries per invocation (paid tier)
**Scale/Scope**: MVP targets 1,000 users, ~50 API endpoints, 20 database tables, 15 frontend pages/components
**UI/UX Theme**: Retro terminal aesthetic (MUD-style):
  - Monospace fonts (Courier New, IBM Plex Mono)
  - Green-on-black color scheme (classic terminal)
  - ASCII art for character sheets and level-up animations
  - Command-line style navigation (e.g., "> /post Hello world!")
  - Status bar with character stats (HP=XP, LVL, EXP bar)
  - Retro CRT screen effects (optional scanlines, glow)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Horizontal Database Scaling ✅ PASS

**Status**: COMPLIANT - Initial design uses single database for MVP (<10GB expected)

**Rationale**:
- MVP scope (1,000 users, ~50KB per user including posts) = ~50MB total
- Well below 10GB limit, single database acceptable
- Schema designed for future sharding by user_id if growth exceeds 10GB
- Character sheet data is user-scoped, enabling per-user database split if needed

**Future Consideration**: If user base grows beyond 100,000 users, implement per-user or per-shard database pattern.

### II. Index-First Performance ✅ PASS (Pending Design)

**Status**: DEFERRED TO PHASE 1 - Will create indexes during data model design

**Required Indexes** (from spec analysis):
- `idx_users_username` (UNIQUE) - user lookup, authentication
- `idx_posts_user_id` - user's post history
- `idx_posts_created_at` - feed chronological ordering
- `idx_likes_post_id` - like count aggregation
- `idx_likes_user_id_post_id` (composite) - prevent duplicate likes
- `idx_comments_post_id` - comment retrieval per post
- `idx_follows_follower_id` - user's following list
- `idx_follows_followee_id` - user's followers list
- All indexes will include `PRAGMA optimize` in migration scripts

**Verification**: Phase 1 will document `EXPLAIN QUERY PLAN` results for all critical queries.

### III. Type Safety & Schema Strictness ✅ PASS (Pending Design)

**Status**: DEFERRED TO PHASE 1 - All tables will use STRICT mode

**Commitment**:
- Every `CREATE TABLE` statement includes `STRICT` keyword
- All columns have explicit types (TEXT, INTEGER, REAL)
- TypeScript interfaces mirror database schema with exact type mappings
- No reliance on SQLite dynamic typing

**Example** (to be implemented):
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  level INTEGER NOT NULL DEFAULT 1,
  total_xp INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
) STRICT;
```

### IV. Local-First Development ✅ PASS

**Status**: COMPLIANT - Development workflow established

**Implementation**:
- All development via `wrangler dev --persist-to=.wrangler/state`
- Migrations tested locally before deployment: `wrangler d1 execute rpg-social-db --local --file=migrations/001_initial.sql`
- Vitest + Miniflare for programmatic database testing
- No production database access during development
- CI/CD pipeline uses local D1 instance for integration tests

### V. Batch Operations & Concurrency ✅ PASS (Pending Design)

**Status**: DEFERRED TO PHASE 1 - Will identify batch operation opportunities

**Initial Analysis**:
- XP awards for interactions can be batched (e.g., like + award XP to liker + award XP to creator)
- Feed generation queries can be batched (fetch posts + likes + comments in single batch)
- Level-up checks can batch (check XP threshold + update level + unlock features)

**Target**: <5ms per query to support ~200 QPS throughput per Worker instance

**Verification**: Phase 1 contracts will specify which operations use `batch()` method.

### VI. Migration Safety ✅ PASS (Pending Design)

**Status**: DEFERRED TO PHASE 1 - Migration strategy will be documented

**Commitment**:
- All migrations in `.sql` format with sequential numbering (001_initial.sql, 002_add_media.sql, etc.)
- Foreign key dependencies mapped in migration order (users → posts → comments/likes)
- No `BEGIN TRANSACTION`/`COMMIT` in migration files
- Dry-run migrations locally before production: `wrangler d1 execute --local`
- Large data imports split into <100KB statement batches

**Table Creation Order** (preliminary):
1. users (no dependencies)
2. posts (depends on users)
3. likes (depends on users, posts)
4. comments (depends on users, posts)
5. follows (depends on users)

### VII. Platform Limits Awareness ✅ PASS

**Status**: COMPLIANT - Design respects all D1 limits

**Limits Compliance**:
- ✅ Database size: MVP ~50MB << 10GB limit (paid tier)
- ✅ Row size: Largest row (posts table) ≤ 1,000 chars + metadata ≈ 2KB << 2MB limit
- ✅ Media storage: Images stored in R2, only URLs in D1 (complies with 2MB row limit)
- ✅ Columns per table: Max 12 columns (users table) << 100 limit
- ✅ Query limits: Batch operations used to stay under 1,000 queries/invocation
- ✅ Concurrent connections: Single Worker instance uses ≤6 connections

**Growth Plan**: If database exceeds 9GB, trigger migration to per-user sharding pattern (Principle I).

### Constitution Check Summary

**Overall Status**: ✅ PASS with deferred implementation details

**Pre-Phase 0 Gates**: All passed (no blocking violations)

**Phase 1 Commitments**:
- Document all indexes in data-model.md
- Ensure all tables use STRICT mode
- Identify batch operation opportunities in contracts/
- Define migration order and foreign key dependencies

**No Complexity Violations**: No table needed in Complexity Tracking section.

## Project Structure

### Documentation (this feature)

```text
specs/001-rpg-social-media/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api-spec.yaml   # OpenAPI specification for REST endpoints
│   └── types.ts        # Shared TypeScript types
├── checklists/          # Quality validation checklists
│   └── requirements.md # Spec validation checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
worker/                  # Cloudflare Worker (Hono API backend)
├── src/
│   ├── index.ts        # Worker entry point with Sentry wrapper
│   ├── routes/         # API route handlers
│   │   ├── auth.ts     # Register, login, logout endpoints
│   │   ├── posts.ts    # Post CRUD, feed generation
│   │   ├── users.ts    # User profiles, ASCII character sheets
│   │   ├── interactions.ts  # Likes, comments, follows
│   │   └── xp.ts       # XP calculation, level progression
│   ├── models/         # D1 database models and queries
│   │   ├── user.ts     # User/character model
│   │   ├── post.ts     # Post model
│   │   ├── interaction.ts  # Likes, comments, follows
│   │   └── level.ts    # Level thresholds and unlocks
│   ├── services/       # Business logic layer
│   │   ├── auth-service.ts     # JWT creation, password hashing
│   │   ├── xp-service.ts       # XP calculation and awards
│   │   ├── level-service.ts    # Level-up logic
│   │   ├── feed-service.ts     # Feed generation algorithms
│   │   └── feature-gate-service.ts  # Feature unlock validation
│   ├── middleware/     # Hono middleware
│   │   ├── auth.ts     # JWT validation, session management
│   │   ├── rate-limit.ts  # Anti-spam protection (KV-based)
│   │   ├── error-handler.ts  # Centralized error handling
│   │   ├── analytics.ts       # Custom event tracking
│   │   └── sentry.ts          # Sentry error capture
│   └── lib/            # Shared utilities
│       ├── db.ts       # D1 client wrapper
│       ├── types.ts    # TypeScript type definitions
│       ├── constants.ts  # XP values, level thresholds
│       └── logger.ts   # Structured logging (JSON)
├── migrations/         # D1 database migrations
│   ├── 001_initial_schema.sql
│   ├── 002_add_indexes.sql
│   └── 003_add_media_support.sql
├── wrangler.toml       # Cloudflare Worker configuration + Sentry DSN
└── package.json        # Dependencies (Hono, @sentry/cloudflare)

frontend/                # Cloudflare Pages (React frontend with terminal UI)
├── src/
│   ├── pages/          # Page components
│   │   ├── Home.tsx    # Terminal-style feed view
│   │   ├── Profile.tsx # ASCII character sheet
│   │   ├── Post.tsx    # Post detail in terminal format
│   │   └── Auth.tsx    # Login/register terminal interface
│   ├── components/     # Reusable UI components
│   │   ├── Terminal.tsx       # xterm.js wrapper component
│   │   ├── TerminalPost.tsx   # Post display in terminal format
│   │   ├── ASCIICharacterSheet.tsx  # ASCII art character sheet
│   │   ├── TerminalXPBar.tsx  # ASCII progress bar
│   │   ├── LevelUpAnimation.tsx     # ASCII level-up effect
│   │   ├── TerminalPrompt.tsx       # Command-line input
│   │   └── FeatureLock.tsx    # Locked feature indicator
│   ├── services/       # API client
│   │   ├── api-client.ts  # Fetch wrapper for Worker endpoints
│   │   └── sentry.ts      # Sentry initialization
│   ├── hooks/          # React hooks
│   │   ├── useAuth.ts
│   │   ├── useFeed.ts
│   │   ├── useCharacter.ts
│   │   └── useTerminalCommands.ts  # CLI command parser
│   ├── styles/         # CSS for terminal theme
│   │   ├── terminal.css       # MUD-style terminal CSS
│   │   ├── crt-effects.css    # Optional scanlines/glow
│   │   └── ascii-art.css      # ASCII art rendering
│   └── utils/          # Utility functions
│       ├── ascii-art.ts       # ASCII art generators
│       └── ansi-colors.ts     # ANSI color utilities
├── public/             # Static assets
│   ├── fonts/          # Monospace fonts (IBM Plex Mono)
│   └── index.html      # Cloudflare Analytics script
└── package.json        # Dependencies (React, xterm.js, Sentry)

tests/                   # Test suites
├── unit/               # Unit tests (Vitest)
│   ├── xp-service.test.ts
│   ├── level-service.test.ts
│   └── models/
├── integration/        # Integration tests (Miniflare + D1)
│   ├── auth-flow.test.ts
│   ├── xp-earning.test.ts
│   └── feed-generation.test.ts
└── e2e/                # End-to-end tests (Playwright)
    ├── user-journey.spec.ts
    └── character-progression.spec.ts

shared/                  # Shared types and constants
└── types/
    └── index.ts        # Types used by both worker and frontend

.wrangler/              # Local development state (gitignored)
└── state/              # Persisted D1 database for local dev
```

**Structure Decision**: **Web application** (Option 2 adapted for Cloudflare ecosystem)

**Rationale**:
- **Worker** (backend): Cloudflare Workers run Hono framework for API routing, connect to D1 for database queries
- **Frontend**: Cloudflare Pages hosts static React/Svelte app, calls Worker API endpoints
- **Separation**: Clean API/UI boundary enables independent scaling and deployment
- **D1 Integration**: Worker has direct D1 binding; frontend uses HTTP API
- **TypeScript**: End-to-end type safety with shared types in `/shared`

## Complexity Tracking

*No constitution violations detected. This section is not applicable.*

---

## Phase Summary

### Phase 0: Research ✅ COMPLETE (Updated 2026-02-13)
- **Artifact**: `research.md` (13 research areas)
- **Key Decisions**:
  - Backend: Hono 4.x on Cloudflare Workers with Sentry integration
  - Database: Cloudflare D1 with STRICT tables
  - Frontend: React 18+ with xterm.js for terminal UI
  - **UI Theme**: Terminal/MUD aesthetic (green-on-black, ASCII art, monospace fonts)
  - Testing: Vitest + Miniflare + Playwright
  - Auth: JWT with httpOnly cookies (register/login flows)
  - **Analytics**: Cloudflare Web Analytics (privacy-friendly)
  - **Error Tracking**: Sentry for Cloudflare Workers (@sentry/cloudflare)
  - XP Formula: `Level = floor(sqrt(total_XP / 100))`
  - Feed: Reverse chronological with batch query optimization
  - Rate Limiting: Cloudflare KV with token bucket algorithm
  - Media: Cloudflare R2 for images (level 3+)

### Phase 1: Design ✅ COMPLETE
- **Artifacts**:
  - `data-model.md` - 6 tables, 16 indexes, full schema with STRICT mode
  - `contracts/api-spec.yaml` - OpenAPI 3.0 specification, 20+ endpoints
  - `quickstart.md` - Developer onboarding guide
- **Database Schema**: All tables use STRICT mode, indexes created for WHERE clauses
- **API Contracts**: RESTful endpoints for auth, posts, interactions, feed, XP tracking
- **Constitution Compliance**: All 7 principles validated and documented

### Phase 2: Implementation (Next Steps)
- **Next Command**: `/speckit.tasks` to generate task list organized by user stories
- **Implementation Order**: P1 (Basic Social Posting) → P2 (XP Earning) → P3 (Level Progression) → P4-P6
- **Testing Strategy**: Unit tests first, integration tests with Miniflare, E2E with Playwright

---

## Success Criteria Tracking

| Criterion | Target | Design Support |
|-----------|--------|----------------|
| SC-001: Onboarding speed | <3 min to first post | Simple auth flow, one-step registration |
| SC-002: XP update visibility | <1s | Batch operations, optimized queries with indexes |
| SC-003: Level 2 advancement | 80% in first session | Low XP threshold (400 XP = 40 posts OR 200 likes) |
| SC-004: Level-up notification | <2s | Real-time level calculation in API response |
| SC-005: Character sheet load | <1s | Composite indexes on user stats queries |
| SC-006: Feature lock enforcement | 100% accuracy | Application-level validation in API middleware |
| SC-007: Feature unlock clarity | <5s | Dedicated /levels/thresholds endpoint |
| SC-008: Feed load time | <2s for 100 follows | Composite index (user_id, created_at), batch queries |
| SC-009: First interaction | 90% completion | Prominent UI for likes/comments, tutorial hints |
| SC-010: Engagement increase | 40% vs baseline | XP feedback loop, level progression incentives |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│           (React + xterm.js Terminal UI on Pages)            │
│  ┌──────────────────────────────────────────────────┐       │
│  │  Terminal Interface (MUD-style)                   │       │
│  │  • Green-on-black ASCII art                       │       │
│  │  • Command-line input (> /post Hello!)            │       │
│  │  • ASCII character sheet                          │       │
│  │  • Progress bars with █░░░                        │       │
│  └──────────────────────────────────────────────────┘       │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Worker                         │
│             (Hono API + Sentry Error Tracking)               │
├─────────────────────────────────────────────────────────────┤
│  Middleware:                                                 │
│  • Sentry.withSentry()  → Automatic error capture           │
│  • Analytics Logger     → Track XP events, level-ups        │
│  • JWT Auth             → Cookie-based sessions             │
│  • Rate Limiter         → KV-based token bucket             │
├─────────────────────────────────────────────────────────────┤
│  Routes:                                                     │
│  • /api/auth/*       → Register, login, logout (JWT)        │
│  • /api/posts/*      → Post CRUD                            │
│  • /api/users/*      → ASCII character sheet data           │
│  • /api/interactions/* → Likes, comments, follows (+XP)     │
│  • /api/feed/*       → Terminal-formatted feed              │
│  • /api/xp/*         → XP history                           │
│  • /api/levels/*     → Level thresholds & feature unlocks   │
├─────────────────────────────────────────────────────────────┤
│  Services:                                                   │
│  • XP Service        → Calculate XP, detect level-ups       │
│  • Level Service     → Manage progression thresholds        │
│  • Feed Service      → Generate personalized feeds          │
│  • Auth Service      → Register, login, JWT creation        │
│  • Feature Gate      → Validate level-based access          │
└──┬────────┬─────────┬─────────────────────────────────────┘
   │        │         │
   ▼        ▼         ▼
┌─────┐ ┌─────┐ ┌─────────┐
│  D1  │ │ R2  │ │   KV    │
│ DB   │ │Image│ │ Rate    │
│(SQL) │ │Store│ │ Limit   │
└─────┘ └─────┘ └─────────┘

External Services:
┌──────────────┐  ┌────────────────────────┐
│    Sentry    │  │ Cloudflare Analytics   │
│ Error Monitor│  │  (Privacy-friendly)    │
└──────────────┘  └────────────────────────┘
```

---

## Implementation Plan Status: ✅ READY FOR TASKS

**Next Command**: `/speckit.tasks`

This will generate:
- Detailed task list organized by user stories
- Dependency ordering (Setup → Foundational → US1 → US2 → ...)
- Parallel execution opportunities
- Test-first workflow (if tests requested)

**Estimated Scope**:
- ~100-150 tasks total
- ~20 tasks for Setup + Foundational (database, auth, middleware)
- ~15-20 tasks per user story (6 user stories)
- ~10 tasks for Polish & Cross-Cutting Concerns
