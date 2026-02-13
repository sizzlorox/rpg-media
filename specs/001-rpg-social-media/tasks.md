# Tasks: RPG-Gamified Social Media Platform

**Input**: Design documents from `/specs/001-rpg-social-media/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Worker (backend)**: `worker/src/`, `worker/migrations/`
- **Frontend**: `frontend/src/`
- **Tests**: `tests/unit/`, `tests/integration/`, `tests/e2e/`
- **Shared**: `shared/types/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize worker project with TypeScript and Hono in worker/
- [x] T002 Initialize frontend project with React, Vite, and xterm.js in frontend/
- [x] T003 [P] Create shared types directory at shared/types/index.ts
- [x] T004 [P] Configure TypeScript for worker (worker/tsconfig.json) with strict mode
- [x] T005 [P] Configure TypeScript for frontend (frontend/tsconfig.json) with strict mode
- [x] T006 [P] Setup wrangler.toml configuration with D1, R2, KV bindings
- [x] T007 [P] Install Sentry SDK in worker (npm install @sentry/cloudflare)
- [x] T008 [P] Install Sentry SDK in frontend (npm install @sentry/react)
- [x] T009 [P] Setup Cloudflare Web Analytics beacon in frontend/public/index.html
- [x] T010 [P] Install xterm.js and addons (npm install @xterm/xterm @xterm/addon-fit)
- [x] T011 [P] Create .env.local template for frontend environment variables
- [x] T012 [P] Configure Vite proxy for local API calls in frontend/vite.config.ts
- [x] T013 [P] Setup Vitest configuration for unit tests in worker/vitest.config.ts
- [x] T014 [P] Install and configure Playwright for E2E tests in tests/e2e/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Foundation

- [x] T015 Create migration 001_initial_schema.sql with all 6 tables (users, posts, likes, comments, follows, level_thresholds) in STRICT mode per constitution
- [x] T016 Create migration 002_add_indexes.sql with 16 indexes per data-model.md
- [x] T017 Populate level_thresholds table with XP requirements and feature unlocks (levels 1-100) in migration 001
- [ ] T018 Test migrations locally with wrangler d1 execute --local
- [x] T019 Run PRAGMA optimize after migrations per constitution

### Core Types & Constants

- [x] T020 [P] Define database model interfaces in shared/types/index.ts (User, Post, Like, Comment, Follow, LevelThreshold)
- [x] T021 [P] Define API response types in shared/types/index.ts (UserProfile, PostWithAuthor, etc.)
- [x] T022 [P] Create XP constants in worker/src/lib/constants.ts (XP_VALUES, calculateLevel, xpForNextLevel)
- [x] T023 [P] Create environment bindings type in worker/src/lib/types.ts (Env interface with D1, R2, KV, Sentry DSN)

### Worker Infrastructure

- [x] T024 Create D1 client wrapper in worker/src/lib/db.ts with batch operation helpers
- [x] T025 Create structured JSON logger in worker/src/lib/logger.ts
- [x] T026 Initialize Hono app in worker/src/index.ts with Sentry.withSentry() wrapper
- [x] T027 Implement error handler middleware in worker/src/middleware/error-handler.ts with Sentry capture
- [x] T028 Implement analytics logging middleware in worker/src/middleware/analytics.ts for custom events
- [x] T029 Implement rate limiting middleware in worker/src/middleware/rate-limit.ts using KV token bucket (10 posts/hour, 50 likes/hour, 20 comments/hour)

### Media Storage Foundation

- [ ] T029b Configure R2 bucket for media uploads and test presigned URL generation

### Authentication Foundation

- [x] T030 Install bcryptjs for password hashing (npm install bcryptjs)
- [x] T031 Implement JWT auth middleware in worker/src/middleware/auth.ts with cookie validation
- [x] T032 Create AuthService in worker/src/services/auth-service.ts (register, login, verifyToken)
- [x] T033 Implement POST /api/auth/register endpoint in worker/src/routes/auth.ts
- [x] T034 Implement POST /api/auth/login endpoint in worker/src/routes/auth.ts
- [x] T035 Implement POST /api/auth/logout endpoint in worker/src/routes/auth.ts
- [x] T036 Implement GET /api/auth/me endpoint in worker/src/routes/auth.ts

### Frontend Infrastructure

- [x] T037 [P] Create Terminal component wrapper for xterm.js in frontend/src/components/Terminal.tsx
- [x] T038 [P] Implement terminal theme (green-on-black) in frontend/src/styles/terminal.css
- [x] T039 [P] Create API client service in frontend/src/services/api-client.ts with fetch wrapper
- [x] T040 [P] Initialize Sentry in frontend/src/services/sentry.ts
- [x] T041 [P] Create useAuth hook in frontend/src/hooks/useAuth.ts (login, logout, register, getCurrentUser)
- [x] T042 [P] Create useTerminalCommands hook in frontend/src/hooks/useTerminalCommands.ts (command parser)
- [x] T043 [P] Create ANSI color utilities in frontend/src/utils/ansi-colors.ts
- [x] T044 [P] Create ASCII art generator utilities in frontend/src/utils/ascii-art.ts (borders, progress bars)
- [x] T045 Create Auth page with terminal interface in frontend/src/pages/Auth.tsx (register, login commands)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Basic Social Posting (Priority: P1) 🎯 MVP

**Goal**: Users can create posts and view a feed of posts

**Independent Test**: Create account, post content "Hello World!", view feed showing the post

### Backend Implementation for US1

- [x] T046 [P] [US1] Create User model in worker/src/models/user.ts with D1 prepared statements
- [x] T047 [P] [US1] Create Post model in worker/src/models/post.ts with D1 prepared statements
- [x] T048 [US1] Implement FeedService.generateFeed() in worker/src/services/feed-service.ts (reverse chronological query)
- [x] T049 [US1] Implement POST /api/posts endpoint in worker/src/routes/posts.ts (create post with char limit validation)
- [x] T050 [US1] Implement GET /api/posts/:id endpoint in worker/src/routes/posts.ts (single post retrieval)
- [x] T051 [US1] Implement DELETE /api/posts/:id endpoint in worker/src/routes/posts.ts (own posts only)
- [x] T052 [US1] Implement GET /api/feed/home endpoint in worker/src/routes/feed.ts (personalized feed)
- [x] T053 [US1] Implement GET /api/feed/discover endpoint in worker/src/routes/feed.ts with popularity algorithm: score = ((likes × 1) + (comments × 3) + age_bonus) / hours^0.8, top 50 posts
- [x] T054 [US1] Implement GET /api/users/:username/posts endpoint in worker/src/routes/users.ts (user post history)
- [x] T055 [US1] Add character limit validation based on user level (280/500/1000 chars) in posts.ts

### Frontend Implementation for US1

- [x] T056 [P] [US1] Create TerminalPost component in frontend/src/components/TerminalPost.tsx (ASCII post display)
- [x] T057 [P] [US1] Create TerminalPrompt component in frontend/src/components/TerminalPrompt.tsx (command input)
- [x] T058 [P] [US1] Create useFeed hook in frontend/src/hooks/useFeed.ts (fetch home feed, discover feed)
- [x] T059 [US1] Implement Home page in frontend/src/pages/Home.tsx with terminal feed display
- [x] T060 [US1] Implement Post detail page in frontend/src/pages/Post.tsx
- [x] T061 [US1] Add /post command handler in useTerminalCommands hook
- [x] T062 [US1] Add /feed command handler in useTerminalCommands hook
- [x] T063 [US1] Add character limit indicator in post input (shows remaining chars for user's level)

**Checkpoint**: US1 complete - Users can register, login, create posts, and view feed ✅ MVP DELIVERABLE

---

## Phase 4: User Story 2 - XP Earning Through Interactions (Priority: P2)

**Goal**: Users earn XP from posting, liking, and commenting

**Independent Test**: Create post (+10 XP), like post (+1 XP), comment (+5 XP), verify XP increases shown in terminal

### Backend Implementation for US2

- [X] T064 [P] [US2] Create Like model in worker/src/models/interaction.ts (user_id, post_id composite index)
- [X] T065 [P] [US2] Create Comment model in worker/src/models/interaction.ts
- [X] T066 [US2] Implement XPService.awardXP() in worker/src/services/xp-service.ts (batch operations for multi-user XP)
- [X] T067 [US2] Implement XPService.calculateTotalXP() in worker/src/services/xp-service.ts
- [X] T068 [US2] Update POST /api/posts to award 10 XP using batch operation per constitution
- [X] T069 [US2] Implement POST /api/posts/:id/like endpoint in worker/src/routes/interactions.ts (batch: create like, +1 XP liker, +2 XP creator)
- [X] T070 [US2] Implement DELETE /api/posts/:id/like endpoint (unlike, no XP deduction per spec)
- [X] T071 [US2] Implement POST /api/posts/:id/comments endpoint in worker/src/routes/interactions.ts (batch: create comment, +5 XP commenter, +3 XP creator)
- [X] T072 [US2] Implement GET /api/posts/:id/comments endpoint (fetch all comments for post)
- [X] T073 [US2] Implement GET /api/xp/history endpoint in worker/src/routes/xp.ts (recent XP-earning actions)
- [X] T074 [US2] Add analytics event tracking for XP awards (trackEvent('xp_awarded', ...))

### Frontend Implementation for US2

- [X] T075 [P] [US2] Create TerminalXPBar component in frontend/src/components/TerminalXPBar.tsx (ASCII progress bar █░░░)
- [X] T076 [P] [US2] Create useCharacter hook in frontend/src/hooks/useCharacter.ts (fetch XP, stats, level)
- [X] T077 [US2] Add XP notification display in Terminal component (show +10 XP in green)
- [X] T078 [US2] Add /like command handler in useTerminalCommands hook
- [X] T079 [US2] Add /comment command handler in useTerminalCommands hook
- [X] T080 [US2] Display XP bar at top of terminal showing current XP progress
- [X] T081 [US2] Update TerminalPost to show like count and comment count
- [X] T082 [US2] Add real-time XP update (<1s) after interactions per success criteria SC-002

**Checkpoint**: US2 complete - XP system functional, users earning XP from all interactions ✅

---

## Phase 5: User Story 3 - Level Progression System (Priority: P3)

**Goal**: Users automatically level up when reaching XP thresholds

**Independent Test**: Earn 400 XP (create 40 posts), verify level-up notification shows "LEVEL UP! Lvl 2", character sheet displays level 2

### Backend Implementation for US3

- [X] T083 [P] [US3] Implement LevelService.checkLevelUp() in worker/src/services/level-service.ts (calculate level from total_XP)
- [X] T084 [P] [US3] Implement LevelService.getLevelThresholds() in worker/src/services/level-service.ts (fetch from DB)
- [X] T085 [US3] Update XPService.awardXP() to call checkLevelUp() after XP awarded
- [X] T086 [US3] Return level_up boolean in API responses (POST /api/posts, /api/posts/:id/like, etc.)
- [X] T087 [US3] Implement GET /api/levels/thresholds endpoint in worker/src/routes/levels.ts
- [X] T088 [US3] Add analytics event for level-ups (trackEvent('level_up', { userId, oldLevel, newLevel }))
- [X] T089 [US3] Send level-up notification within 2 seconds per success criteria SC-004

### Frontend Implementation for US3

- [X] T090 [P] [US3] Create LevelUpAnimation component in frontend/src/components/LevelUpAnimation.tsx (ASCII block animation ░▒▓█)
- [X] T091 [US3] Display level-up modal/overlay when level_up: true in API response
- [X] T092 [US3] Show newly unlocked features in level-up notification
- [X] T093 [US3] Add /levels command to show XP thresholds table
- [X] T094 [US3] Update XP bar to show "Level X" label
- [X] T095 [US3] Display current level in terminal status bar

**Checkpoint**: US3 complete - Level progression working with notifications ✅

---

## Phase 6: User Story 4 - Character Sheet Profile (Priority: P4)

**Goal**: User profiles display as ASCII art character sheets with stats

**Independent Test**: Navigate to /profile, see ASCII-bordered character sheet with level, XP, posts, likes, followers

### Backend Implementation for US4

- [X] T096 [P] [US4] Implement UserService.getProfile() in worker/src/services/user-service.ts (aggregate stats from posts, likes, comments, follows)
- [X] T097 [US4] Implement GET /api/users/:username endpoint in worker/src/routes/users.ts (return UserProfile with computed stats)
- [X] T098 [US4] Calculate character stats (total_posts, total_likes_given, total_likes_received, etc.) using JOIN queries
- [X] T099 [US4] Add caching for character stats (optional, if performance needed)

### Frontend Implementation for US4

- [X] T100 [P] [US4] Create ASCIICharacterSheet component in frontend/src/components/ASCIICharacterSheet.tsx (╔═╗║╚╝ borders)
- [X] T101 [US4] Implement Profile page in frontend/src/pages/Profile.tsx (show character sheet)
- [X] T102 [US4] Add /profile command handler in useTerminalCommands hook
- [X] T103 [US4] Display ASCII character sheet with:
  - Character name (username)
  - Level and XP progress bar
  - Stats table (posts, likes, comments, followers)
  - Member since date
- [X] T104 [US4] Character sheet loads within 1 second per success criteria SC-005
- [X] T105 [US4] Allow viewing other users' profiles (/profile other_username)

**Checkpoint**: US4 complete - Character sheet profiles displaying with RPG theme ✅

---

## Phase 7: User Story 5 - Feature Unlocking Based on Level (Priority: P5)

**Goal**: Features unlock progressively at specific levels (3, 5, 7, 10, 15)

**Independent Test**: Create level 1 user, verify 280-char limit. Grant 2500 XP (level 5), verify 500-char limit unlocked.

### Backend Implementation for US5

- [X] T106 [P] [US5] Implement FeatureGateService.canAccessFeature() in worker/src/services/feature-gate-service.ts
- [X] T107 [P] [US5] Implement FeatureGateService.getUnlockedFeatures() in worker/src/services/feature-gate-service.ts
- [X] T108 [US5] Add feature gate validation middleware in worker/src/middleware/feature-gate.ts
- [X] T109 [US5] Enforce character limits per level in POST /api/posts (280/500/1000)
- [X] T110 [US5] Block media uploads for level < 3 in POST /api/posts
- [X] T111 [US5] Implement R2 presigned URL generation for image uploads (level 3+) in worker/src/routes/media.ts
- [X] T112 [US5] Block profile customization (avatar/banner) for level < 7
- [X] T113 [US5] Block custom themes for level < 10
- [X] T114 [US5] Block pinned posts and polls for level < 15
- [X] T115 [US5] Return 403 Forbidden with "Feature unlocks at level X" message when feature locked

### Frontend Implementation for US5

- [X] T116 [P] [US5] Create FeatureLock component in frontend/src/components/FeatureLock.tsx (shows lock icon and level requirement)
- [X] T117 [US5] Display locked features with level requirements in character sheet
- [X] T118 [US5] Show "Unlocks at Level X" tooltip on locked features
- [X] T119 [US5] Highlight newly unlocked features in green after level-up
- [X] T120 [US5] Disable media upload button for level < 3
- [X] T121 [US5] Adjust post input max length based on user's current level
- [X] T122 [US5] Add /unlocks command to show feature unlock roadmap
- [X] T123 [US5] Feature lock enforcement is 100% accurate per success criteria SC-006

**Checkpoint**: US5 complete - Feature gating system working, progression incentives clear ✅

---

## Phase 8: User Story 6 - Social Interactions (Priority: P6)

**Goal**: Users can follow others, see their posts in feed, and build social graph

**Independent Test**: Follow user A, verify their posts appear in home feed. Like and comment on posts, see interaction counts update.

### Backend Implementation for US6

- [X] T124 [P] [US6] Create Follow model in worker/src/models/interaction.ts (composite unique index on follower_id, followee_id)
- [X] T125 [US6] Implement POST /api/users/:username/follow endpoint in worker/src/routes/interactions.ts (batch: create follow, +5 XP to followee)
- [X] T126 [US6] Implement DELETE /api/users/:username/follow endpoint (unfollow, no XP deduction)
- [X] T127 [US6] Implement GET /api/users/:username/followers endpoint (fetch followers list)
- [X] T128 [US6] Implement GET /api/users/:username/following endpoint (fetch following list)
- [X] T129 [US6] Update FeedService.generateFeed() to filter posts from followed users only
- [X] T130 [US6] Prevent self-follow with CHECK constraint in database and validation in endpoint
- [X] T131 [US6] Update like/comment counts in post responses
- [X] T132 [US6] Add is_liked_by_user and is_followed_by_user flags in API responses

### Frontend Implementation for US6

- [X] T133 [US6] Add /follow command handler in useTerminalCommands hook
- [X] T134 [US6] Add /unfollow command handler in useTerminalCommands hook
- [X] T135 [US6] Display follower/following counts in character sheet
- [X] T136 [US6] Show visual indicator for followed users in feed (e.g., [FOLLOWING] tag)
- [X] T137 [US6] Display like/comment counts in TerminalPost component
- [X] T138 [US6] Add visual feedback when liking/commenting (green "+1 XP" notification)
- [X] T139 [US6] 90% of users complete at least one interaction in first 3 posts per success criteria SC-009

**Checkpoint**: US6 complete - Full social graph and interactions functional ✅

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, finalization

### Terminal UI Polish

- [ ] T140 [P] Add CRT scanline effect CSS in frontend/src/styles/crt-effects.css (optional)
- [ ] T141 [P] Add green glow/bloom effect around terminal borders
- [ ] T142 [P] Implement cursor blink animation in Terminal component
- [X] T143 [P] Add /help command with full command reference
- [X] T144 [P] Add /clear command to clear terminal screen
- [X] T145 [P] Create welcome ASCII art banner on terminal load
- [ ] T146 [P] Add sound effects for level-up (optional, 8-bit beep)
- [ ] T147 [P] Load IBM Plex Mono font from frontend/public/fonts/

### Performance Optimization

- [X] T148 [P] Verify feed loads <2s for 100 followed users per success criteria SC-008
- [X] T149 [P] Verify XP updates display <1s per success criteria SC-002
- [X] T150 [P] Run EXPLAIN QUERY PLAN on all queries to verify index usage per constitution
- [X] T151 [P] Optimize batch operations to stay under 1,000 queries/invocation limit
- [X] T152 [P] Add rate limiting to prevent XP farming (10 posts/hour, 50 likes/hour)

### Error Handling & Logging

- [ ] T153 [P] Add Sentry breadcrumbs for all XP awards and level-ups
- [ ] T154 [P] Implement error boundaries in React components
- [ ] T155 [P] Add structured logging for all database operations
- [ ] T156 [P] Test Sentry error capture with /api/test/error endpoint

### Analytics & Monitoring

- [ ] T157 [P] Establish baseline engagement metrics before XP system (posts/session, likes/session, session duration, bounce rate) for SC-010 comparison
- [ ] T158 [P] Verify Cloudflare Web Analytics tracking page views
- [ ] T159 [P] Add custom analytics events for all XP-earning actions
- [ ] T160 [P] Track level-up funnel (how many users reach levels 2, 5, 10)
- [ ] T161 [P] Monitor API response times via Sentry performance tracking

### Documentation

- [X] T162 [P] Update README.md with project overview and quickstart
- [X] T163 [P] Document terminal commands in docs/commands.md
- [ ] T164 [P] Create API documentation from OpenAPI spec
- [ ] T165 [P] Add inline code comments for complex XP/level calculations
- [X] T170 [P] Create deployment guide in docs/deployment.md with step-by-step production deployment instructions
- [X] T171 [P] Document Worker deployment process (wrangler deploy, environment variables, D1 production setup)
- [X] T172 [P] Document Frontend deployment to Cloudflare Pages (build process, environment variables, analytics setup)
- [X] T173 [P] Document production database migration workflow (running migrations, backup procedures, rollback strategy)
- [X] T174 [P] Document environment variable configuration for production (JWT_SECRET, SENTRY_DSN, analytics tokens)
- [X] T175 [P] Document monitoring and observability setup (Sentry configuration, Cloudflare Analytics verification, log aggregation)

### Testing & Validation

- [ ] T176 [P] Run quickstart.md validation steps (register, post, earn XP, level up)
- [ ] T177 [P] Verify all constitution principles are followed (7 checks)
- [ ] T178 [P] Test all 10 success criteria from spec.md
- [ ] T179 [P] Perform security audit (SQL injection, XSS, CSRF prevention)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 (P1): Can start after Foundational - No dependencies on other stories
  - US2 (P2): Can start after Foundational - May integrate with US1 posts but independently testable
  - US3 (P3): Can start after Foundational - Uses XP from US2 but can test independently with mock XP
  - US4 (P4): Can start after Foundational - Displays stats from US1-US3 but independently testable
  - US5 (P5): Can start after Foundational - Gates features from US1-US4 but independently testable
  - US6 (P6): Can start after Foundational - Extends US1 feed but independently testable
- **Polish (Phase 9)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) ✅ NO BLOCKERS
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) ✅ NO BLOCKERS
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) ✅ NO BLOCKERS
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) ✅ NO BLOCKERS
- **User Story 5 (P5)**: Can start after Foundational (Phase 2) ✅ NO BLOCKERS
- **User Story 6 (P6)**: Can start after Foundational (Phase 2) ✅ NO BLOCKERS

**NOTE**: All user stories are designed to be independently implementable and testable after Foundational phase completes.

### Within Each User Story

- Backend models before services
- Services before endpoints
- Core implementation before integration with other stories
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003-T014)
- All Foundational tasks marked [P] can run in parallel within their subsections
- Once Foundational phase completes, **ALL 6 user stories can be implemented in parallel** by different team members
- All Polish tasks marked [P] can run in parallel (T140-T179)

---

## Parallel Example: User Story 1

```bash
# Backend team can work on these simultaneously:
T046 [P] Create User model
T047 [P] Create Post model

# Frontend team can work on these simultaneously:
T056 [P] Create TerminalPost component
T057 [P] Create TerminalPrompt component
T058 [P] Create useFeed hook

# After models are done, these can run in parallel:
T048 Implement FeedService
T049 Implement POST /api/posts
T052 Implement GET /api/feed/home
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup ✅
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories) ✅
3. Complete Phase 3: User Story 1 (Basic Social Posting) ✅
4. **STOP and VALIDATE**: Test US1 independently
   - Register account via terminal: `> /register testuser password123`
   - Create post: `> /post Hello, terminal world!`
   - View feed: `> /feed`
   - Verify post appears in ASCII-bordered feed
5. Deploy/demo if ready - **You now have a working MUD-style social media MVP!**

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready ✅
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (XP system active)
4. Add User Story 3 → Test independently → Deploy/Demo (Level progression)
5. Add User Story 4 → Test independently → Deploy/Demo (Character sheets)
6. Add User Story 5 → Test independently → Deploy/Demo (Feature unlocking)
7. Add User Story 6 → Test independently → Deploy/Demo (Full social graph)
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (critical path)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (Basic Posting)
   - **Developer B**: User Story 2 (XP System)
   - **Developer C**: User Story 3 (Level Progression)
   - **Developer D**: User Story 4 (Character Sheets)
   - **Developer E**: User Story 5 (Feature Unlocking)
   - **Developer F**: User Story 6 (Social Interactions)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- All tasks include specific file paths for clarity
- Constitution compliance verified in Phase 9 (T177)
- Terminal UI theme (green-on-black, ASCII art) applied throughout
- Sentry and analytics integrated from Foundational phase
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Task Count Summary

- **Phase 1 (Setup)**: 14 tasks
- **Phase 2 (Foundational)**: 32 tasks (CRITICAL PATH - blocks all user stories, includes R2 setup)
- **Phase 3 (US1 - Basic Social Posting)**: 18 tasks
- **Phase 4 (US2 - XP Earning)**: 19 tasks
- **Phase 5 (US3 - Level Progression)**: 13 tasks
- **Phase 6 (US4 - Character Sheet)**: 10 tasks
- **Phase 7 (US5 - Feature Unlocking)**: 18 tasks
- **Phase 8 (US6 - Social Interactions)**: 16 tasks
- **Phase 9 (Polish)**: 36 tasks (includes baseline metrics and deployment documentation)

**Total**: 176 tasks

**MVP Scope** (Setup + Foundational + US1): 64 tasks (~36% of total)
**Full Feature Set** (All phases): 176 tasks

**Estimated Timeline**:
- MVP (US1 only): 2-3 weeks solo, 1 week with team
- Full platform (all stories): 6-8 weeks solo, 3-4 weeks with team of 4-6
