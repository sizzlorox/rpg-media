# Feature Specification: RPG-Gamified Social Media Platform

**Feature Branch**: `001-rpg-social-media`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "We're creating a Social Media app like Twitter(X) but with a few features like RPG features, interactions and such give you XP, you can level up and unlock more features, profile is a character sheet etc. It will be implemented using cloudflare d1, hono, that shebang, i remember it uses wrangler cli to generatei the scaffolding im not sure u figure it out"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Social Posting (Priority: P1)

As a user, I want to create posts and read other users' posts in a feed, so I can share thoughts and stay connected with others.

**Why this priority**: This is the core MVP - without basic posting and reading capabilities, there's no social media platform. This must work before any RPG features matter.

**Independent Test**: Can be fully tested by creating a user account, posting content, viewing the feed, and seeing posts from other users. Delivers fundamental social media value.

**Acceptance Scenarios**:

1. **Given** I am logged in, **When** I compose a text post up to my current character level limit, **Then** the post appears in my profile feed and followers' home feeds
2. **Given** I am viewing my home feed, **When** new posts are available from users I follow, **Then** I see them in reverse chronological order
3. **Given** I am a new user, **When** I view my feed, **Then** I see suggested posts from popular users to help me discover content

---

### User Story 2 - XP Earning Through Interactions (Priority: P2)

As a user, I want to earn experience points (XP) when I interact with the platform (posting, liking, commenting), so I feel rewarded for engagement and can progress my character.

**Why this priority**: This is the core RPG mechanic that differentiates this platform from standard social media. It creates the engagement loop that drives user retention.

**Independent Test**: Can be tested by performing various interactions (creating posts, liking, commenting) and verifying XP increases are displayed in the user's character sheet. Delivers gamification value even without level-based unlocks.

**Acceptance Scenarios**:

1. **Given** I create a new post, **When** the post is published, **Then** I earn XP and see my total XP increase
2. **Given** I like another user's post, **When** the like is registered, **Then** I earn XP
3. **Given** I comment on a post, **When** the comment is published, **Then** I earn XP
4. **Given** another user interacts with my content, **When** they like or comment, **Then** I earn XP as the content creator
5. **Given** I am viewing my character sheet, **When** I check my XP progress, **Then** I see my current XP, total XP needed for next level, and a progress bar

---

### User Story 3 - Level Progression System (Priority: P3)

As a user, I want to level up my character when I earn enough XP, so I feel a sense of achievement and unlock new capabilities.

**Why this priority**: Level progression provides long-term engagement goals but requires the XP system to function first. It's the payoff for the XP earning mechanic.

**Independent Test**: Can be tested by earning enough XP to trigger level-up, verifying level increase notification, and checking character sheet reflects new level. Delivers progression satisfaction.

**Acceptance Scenarios**:

1. **Given** I have earned enough XP to reach the next level, **When** I perform my next XP-earning action, **Then** I receive a level-up notification and my character level increases
2. **Given** I just leveled up, **When** I view my character sheet, **Then** I see my new level, updated stats, and newly unlocked features highlighted
3. **Given** I am viewing another user's profile, **When** I check their character sheet, **Then** I can see their current level and basic stats

---

### User Story 4 - Character Sheet Profile (Priority: P4)

As a user, I want my profile to be displayed as a character sheet showing my level, XP, stats, and achievements, so my profile reflects my engagement and progression in an RPG-style format.

**Why this priority**: This is a UI/UX enhancement that makes the RPG theme more immersive. It depends on having level and XP systems working.

**Independent Test**: Can be tested by viewing a user's profile and verifying all character sheet elements (level, XP, stats, achievements) are displayed correctly. Delivers thematic value and engagement visualization.

**Acceptance Scenarios**:

1. **Given** I am viewing my own profile, **When** the character sheet loads, **Then** I see my character name (username), level, current/total XP, and character stats
2. **Given** I have earned achievements, **When** I view my character sheet, **Then** I see badges or icons representing my achievements
3. **Given** I am customizing my character sheet, **When** I select display preferences, **Then** I can choose which stats to highlight on my public profile

---

### User Story 5 - Feature Unlocking Based on Level (Priority: P5)

As a user, I want to unlock new platform features as I level up (longer posts, media uploads, custom themes), so I have goals to work toward and feel my progression has tangible benefits.

**Why this priority**: This creates the incentive structure for the entire RPG system. While important for long-term retention, it requires all previous systems to be functional.

**Independent Test**: Can be tested by creating a new user, verifying feature restrictions, leveling up the user, and confirming previously locked features are now accessible. Delivers progression rewards.

**Acceptance Scenarios**:

1. **Given** I am level 1, **When** I try to create a post, **Then** I am limited to 280 characters
2. **Given** I reach level 5, **When** I compose a post, **Then** I can write up to 500 characters
3. **Given** I am below level 3, **When** I try to upload an image, **Then** I see a message indicating this feature unlocks at level 3
4. **Given** I reach level 10, **When** I access profile customization, **Then** I can apply custom color themes to my character sheet
5. **Given** I am viewing locked features, **When** I check feature requirements, **Then** I see which level is required to unlock each feature

---

### User Story 6 - Social Interactions (Priority: P6)

As a user, I want to follow other users, like posts, and comment on content, so I can build connections and engage with the community.

**Why this priority**: These are standard social media features that enhance the basic posting functionality. They also serve as additional XP-earning activities.

**Independent Test**: Can be tested by following users, verifying their posts appear in feed, liking posts, commenting, and seeing interaction counts update. Delivers social connectivity.

**Acceptance Scenarios**:

1. **Given** I view another user's profile, **When** I click follow, **Then** I start seeing their posts in my home feed and my following count increases
2. **Given** I am viewing a post, **When** I click like, **Then** the like count increases and the post creator earns XP
3. **Given** I am viewing a post, **When** I write and submit a comment, **Then** my comment appears below the post and both I and the post creator earn XP
4. **Given** I want to stop following someone, **When** I unfollow them, **Then** their posts no longer appear in my feed

---

### Edge Cases

- What happens when a user reaches maximum level? (Consider prestige system or cap at level 100)
- How does the system handle spam or excessive posting for XP farming? (Implement rate limiting or diminishing returns)
- What happens to XP earned when a post is deleted? (XP should remain to prevent gaming the system)
- How are negative interactions handled (reports, blocks)? (Should not affect XP, but may trigger moderation)
- What happens if a user's account is suspended? (XP and level freeze but data is retained)
- How does the system handle simultaneous XP-earning actions? (Queue and process in order received)
- What happens when viewing profiles of banned/suspended users? (Show limited character sheet with status indicator)

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & User Management
- **FR-001**: System MUST allow users to create accounts with unique usernames
- **FR-002**: System MUST authenticate users securely before granting access
- **FR-003**: Users MUST be able to log in and log out of their accounts
- **FR-004**: System MUST initialize new users at level 1 with 0 XP

#### Content Creation & Posting
- **FR-005**: Users MUST be able to create text posts within their current level's character limit
- **FR-006**: System MUST enforce character limits based on user's current level (level 1-4: 280 chars, level 5-9: 500 chars, level 10+: 1000 chars)
- **FR-007**: System MUST timestamp all posts with creation time
- **FR-008**: Users MUST be able to delete their own posts
- **FR-009**: System MUST support media uploads (images) for users level 3 and above

#### Social Interactions
- **FR-010**: Users MUST be able to follow and unfollow other users
- **FR-011**: Users MUST be able to like posts
- **FR-012**: Users MUST be able to comment on posts
- **FR-013**: System MUST display like counts and comment counts on posts
- **FR-014**: Users MUST be able to view a feed of posts from users they follow

#### XP & Progression System
- **FR-015**: System MUST award XP for the following actions:
  - Creating a post: 10 XP
  - Liking a post: 1 XP (earner) + 2 XP (post creator)
  - Commenting on a post: 5 XP (commenter) + 3 XP (post creator)
  - Receiving a follow: 5 XP
- **FR-016**: System MUST calculate level based on total XP earned using exponential progression (Level = floor(sqrt(total_XP / 100)))
- **FR-017**: System MUST automatically level up users when they reach the XP threshold for the next level
- **FR-018**: System MUST display a level-up notification when users advance to a new level
- **FR-019**: System MUST prevent XP loss when posts are deleted

#### Character Sheet & Profile
- **FR-020**: System MUST display user profiles as character sheets showing: username, level, current XP, XP to next level, member since date
- **FR-021**: System MUST calculate and display character stats: total posts created, total likes given/received, total comments made, followers count, following count
- **FR-022**: Users MUST be able to view their own character sheet
- **FR-023**: Users MUST be able to view other users' character sheets (public information only)
- **FR-024**: System MUST display XP progress as a visual progress bar

#### Feature Unlocking
- **FR-025**: System MUST gate features based on user level:
  - Level 1: Basic posting (280 chars), liking, commenting, following
  - Level 3: Image uploads
  - Level 5: Extended posts (500 chars)
  - Level 7: Profile customization (avatar/banner)
  - Level 10: Advanced posts (1000 chars), custom themes
  - Level 15: Pinned posts (note: polls deferred to future iteration)
- **FR-026**: System MUST display locked features with level requirements to users
- **FR-027**: System MUST automatically unlock features when user reaches required level

#### Feed & Discovery
- **FR-028**: System MUST display a personalized home feed showing posts from followed users in reverse chronological order
- **FR-029**: System MUST provide a discovery feed for new users showing popular posts, ranked by engagement score:
  - **Algorithm**: `popularity_score = ((like_count × 1.0) + (comment_count × 3.0) + age_bonus) / (hours_since_post^0.8)`
  - **Age bonus**: Posts less than 24 hours old receive bonus: `max(0, 24 - hours_since_post) × 0.5`
  - **Ranking**: Top 50 posts by popularity_score in descending order
  - **Rationale**: Comments weighted 3x likes (aligned with industry standards), recency boost for fresh content, time decay prevents stale posts
- **FR-030**: System MUST allow users to view individual post detail pages with all comments

### Key Entities

- **User/Character**: Represents a user account with RPG attributes (username, level, total XP, current XP progress, join date, authentication credentials). Relationships: can create many Posts, can follow many Users, has one Character Sheet
- **Post**: Represents user-generated content (text content, character count, timestamp, creator reference, media attachments if applicable). Relationships: belongs to one User, can have many Likes, can have many Comments
- **Interaction**: Abstract entity covering Likes, Comments, and Follows (type, timestamp, actor reference, target reference). Relationships: belongs to one User (actor), relates to one Post or User (target)
- **Level**: Represents character progression tier (level number, XP required, XP range, unlocked features list). Relationships: defines thresholds for User progression
- **Feature**: Represents platform capabilities (feature name, description, unlock level requirement, feature type). Relationships: unlocked by reaching specific Level
- **Character Sheet**: View of user profile data (computed stats, achievement badges, display preferences). Relationships: belongs to one User, aggregates data from Posts and Interactions

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New users can create an account, make their first post, and earn their first XP within 3 minutes
- **SC-002**: Users can clearly see their XP increase within 1 second of performing an XP-earning action
- **SC-003**: 80% of users advance to level 2 within their first session
- **SC-004**: Users receive level-up notification within 2 seconds of earning sufficient XP
- **SC-005**: Character sheet displays all relevant stats (level, XP, post count, interactions) accurately within 1 second of page load
- **SC-006**: System correctly enforces feature locks, preventing access to level-gated features 100% of the time
- **SC-007**: Users can identify which features are locked and at what level they unlock within 5 seconds of viewing feature list
- **SC-008**: Feed loads and displays posts within 2 seconds for users following up to 100 other users
- **SC-009**: 90% of users successfully complete at least one social interaction (like, comment, or follow) within their first 3 posts
- **SC-010**: User engagement (measured by XP-earning actions per session) increases by 40% compared to a non-gamified baseline

## Assumptions

1. **Technology Stack**: Development will use Cloudflare D1 for database, Hono framework for API/routing, and Wrangler CLI for deployment scaffolding (as indicated by user)
2. **XP Balance**: Initial XP values and level progression curve are starting points and will be tuned based on user testing and engagement metrics
3. **Level Cap**: System assumes a practical level cap of 100, with option for prestige/reset mechanics in future iterations
4. **Content Moderation**: Basic moderation features (report, block) are assumed to be needed but are not specified in initial scope
5. **Authentication Method**: Standard username/password authentication is assumed as baseline; OAuth integration can be added later
6. **Media Storage**: Image uploads will require integration with a storage service (Cloudflare R2 or similar)
7. **Real-time Updates**: Feed refreshes and XP updates are assumed to be near-real-time (within 2 seconds) but not live-streaming
8. **Mobile Support**: Responsive web design is assumed; native mobile apps are out of scope for MVP
9. **Anti-spam**: Basic rate limiting will be implemented to prevent XP farming (max 10 posts per hour, max 50 likes per hour, max 20 comments per hour)
10. **Data Retention**: User data and XP history are retained indefinitely unless user requests account deletion
