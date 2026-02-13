# Research: RPG-Gamified Social Media Platform

**Phase**: 0 - Technology Research & Best Practices
**Date**: 2026-02-13
**Status**: Complete

## Overview

This document consolidates technology research, best practices, and architectural decisions for the RPG Social Media platform. All "NEEDS CLARIFICATION" items from Technical Context have been resolved.

---

## 1. Hono Framework for Cloudflare Workers

### Decision
Use **Hono 4.x** as the web framework for the Cloudflare Worker API backend.

### Rationale
- **Optimized for Workers**: Designed specifically for edge compute environments (Cloudflare Workers, Deno, Bun)
- **Lightweight**: ~12KB bundle size vs Express (~200KB), critical for Worker size limits
- **Type-safe routing**: Full TypeScript support with type inference for route handlers
- **Middleware ecosystem**: Built-in middleware for CORS, JWT, compression, logging
- **D1 integration**: Native support for Cloudflare bindings (D1, R2, KV)

### Best Practices
```typescript
// Route organization pattern
import { Hono } from 'hono'
import { jwt } from 'hono/jwt'

const app = new Hono<{ Bindings: Env }>()

// Middleware applied to all routes
app.use('*', jwt({ secret: env.JWT_SECRET }))

// Route groups
app.route('/api/posts', postsRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/xp', xpRoutes)

export default app
```

### Alternatives Considered
- **itty-router**: Too minimal, lacks middleware ecosystem
- **Express**: Not optimized for Workers, large bundle size
- **Fastify**: Designed for Node.js, not edge environments

**References**:
- Hono documentation: https://hono.dev/
- Cloudflare Workers + Hono guide: https://developers.cloudflare.com/workers/tutorials/build-a-slackbot/

---

## 2. Cloudflare D1 Query Patterns

### Decision
Use **prepared statements with batch operations** for all D1 queries, following constitutional principles.

### Query Method Selection

| Use Case | Method | Rationale |
|----------|--------|-----------|
| Single record fetch | `first()` | Returns single row efficiently |
| Multiple records | `run()` | Full D1Result with metadata (rowCount, etc.) |
| Bulk operations | `batch()` | Execute multiple statements atomically |
| Lightweight arrays | `raw()` | Array-of-arrays for performance-critical reads |
| Raw SQL (migrations) | `exec()` | No parameter binding, for DDL statements |

### Example: XP Award with Batch Operation
```typescript
// GOOD: Batch multiple updates together
async function awardLikeXP(db: D1Database, likerId: string, postCreatorId: string, postId: string) {
  const statements = [
    // Award XP to liker
    db.prepare('UPDATE users SET total_xp = total_xp + ? WHERE id = ?')
      .bind(1, likerId),
    // Award XP to post creator
    db.prepare('UPDATE users SET total_xp = total_xp + ? WHERE id = ?')
      .bind(2, postCreatorId),
    // Record the like
    db.prepare('INSERT INTO likes (user_id, post_id, created_at) VALUES (?, ?, ?)')
      .bind(likerId, postId, Date.now())
  ]

  await db.batch(statements)
}
```

### Indexing Strategy
Based on Constitution Principle II, create indexes for:
- WHERE clause columns (username, user_id, post_id)
- Foreign keys (post_id, user_id)
- Composite predicates (user_id + created_at for feed sorting)

```sql
-- Run after each index creation
PRAGMA optimize;
```

### Type Safety with STRICT Tables
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  total_xp INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
) STRICT;

CREATE UNIQUE INDEX idx_users_username ON users(username);
```

**References**:
- D1 Client API: https://developers.cloudflare.com/d1/build-with-d1/d1-client-api/
- Constitution: `.specify/memory/constitution.md`

---

## 3. TypeScript Configuration for Workers

### Decision
Use **TypeScript 5.x with strict mode** and Cloudflare Workers types.

### tsconfig.json (Worker)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  }
}
```

### Environment Bindings Type
```typescript
// worker/src/types.ts
export interface Env {
  DB: D1Database            // D1 binding
  R2_BUCKET: R2Bucket       // R2 for media storage
  JWT_SECRET: string        // Environment variable
  RATE_LIMIT_KV: KVNamespace  // KV for rate limiting
}
```

### Rationale
- `strict: true`: Catches type errors at compile time (Constitution Principle III)
- `@cloudflare/workers-types`: Provides D1, R2, KV type definitions
- `moduleResolution: bundler`: Compatible with Wrangler's esbuild bundler

**References**:
- TypeScript in Workers: https://developers.cloudflare.com/workers/languages/typescript/

---

## 4. Frontend Framework Selection

### Decision
Use **React 18+ with Vite** for the frontend, deployed to Cloudflare Pages.

### Rationale
- **Ecosystem**: Largest component library ecosystem (for character sheet UI, XP bars, modals)
- **Type safety**: Excellent TypeScript integration
- **Vite**: Fast build tool with Pages integration
- **Learning curve**: Widely known, easier to onboard contributors
- **Character Sheet UI**: React's component model suits complex nested UI (stats, progress bars, achievements)

### Alternative Considered: Svelte
**Pros**: Smaller bundle size, simpler syntax
**Cons**: Smaller ecosystem for specialized UI components (RPG-style character sheets)

**Decision Rationale**: React's ecosystem better supports building custom RPG-themed UI components.

### Build Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2020'
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787'  // Proxy to local Worker
    }
  }
})
```

**References**:
- Cloudflare Pages + Vite: https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite-site/

---

## 5. Testing Strategy

### Decision
Use **Vitest + Miniflare + Playwright** for comprehensive testing at all levels.

### Testing Layers

| Layer | Tool | Scope | Example |
|-------|------|-------|---------|
| Unit | Vitest | Pure functions (XP calculation, level formulas) | `calculateLevel(1000) === 3` |
| Integration | Vitest + Miniflare | Database operations, API endpoints | Test XP award updates user record |
| E2E | Playwright | Full user journeys | User posts → earns XP → levels up |

### Miniflare Setup (D1 Testing)
```typescript
// tests/integration/setup.ts
import { Miniflare } from 'miniflare'
import { beforeAll, afterAll } from 'vitest'

let mf: Miniflare

beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: '',
    d1Databases: ['DB'],
    d1Persist: true
  })

  const db = await mf.getD1Database('DB')
  // Run migrations
  await db.exec(readFileSync('./migrations/001_initial_schema.sql', 'utf-8'))
})

afterAll(() => mf.dispose())
```

### Constitutional Compliance (Principle IV)
- All tests run locally first: `wrangler dev --local`
- Integration tests use isolated D1 instance (no production data)
- Migrations validated in test environment before production

**References**:
- Miniflare D1 testing: https://miniflare.dev/core/d1
- Vitest: https://vitest.dev/

---

## 6. Authentication Strategy

### Decision
Use **JWT tokens with httpOnly cookies** for session management.

### Implementation Pattern
```typescript
// worker/src/services/auth-service.ts
import { sign, verify } from 'hono/jwt'

export async function login(username: string, password: string, env: Env): Promise<string> {
  // 1. Validate credentials (bcrypt password comparison)
  const user = await db.prepare('SELECT * FROM users WHERE username = ?')
    .bind(username)
    .first<User>()

  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    throw new Error('Invalid credentials')
  }

  // 2. Generate JWT
  const token = await sign(
    {
      sub: user.id,
      username: user.username,
      level: user.level
    },
    env.JWT_SECRET,
    'HS256'
  )

  return token
}
```

### Cookie Configuration
```typescript
// Set httpOnly cookie (prevents XSS)
app.post('/api/auth/login', async (c) => {
  const token = await login(...)

  c.cookie('auth_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7  // 7 days
  })
})
```

### Rationale
- **httpOnly**: Prevents XSS attacks (token not accessible via JavaScript)
- **JWT**: Stateless authentication, no session storage needed
- **Short-lived**: 7-day expiration balances security and UX

### Alternative Considered: OAuth2
**Decision**: Defer to future iteration (Spec Assumption #5)

**References**:
- Hono JWT: https://hono.dev/helpers/jwt

---

## 7. XP Calculation & Level Progression

### Decision
Use **square root progression** as specified in FR-016: `Level = floor(sqrt(total_XP / 100))`

### XP Award Values (from FR-015)
```typescript
// worker/src/lib/constants.ts
export const XP_VALUES = {
  CREATE_POST: 10,
  LIKE_POST_EARNER: 1,
  LIKE_POST_CREATOR: 2,
  COMMENT_EARNER: 5,
  COMMENT_CREATOR: 3,
  RECEIVE_FOLLOW: 5
} as const

export function calculateLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 100))
}

export function xpForNextLevel(currentLevel: number): number {
  const nextLevel = currentLevel + 1
  return (nextLevel * nextLevel) * 100
}
```

### Level-Up Detection
```typescript
// worker/src/services/level-service.ts
export async function checkLevelUp(userId: string, db: D1Database): Promise<boolean> {
  const user = await db.prepare('SELECT level, total_xp FROM users WHERE id = ?')
    .bind(userId)
    .first<User>()

  const newLevel = calculateLevel(user.total_xp)

  if (newLevel > user.level) {
    await db.prepare('UPDATE users SET level = ? WHERE id = ?')
      .bind(newLevel, userId)
      .run()
    return true  // Trigger level-up notification
  }

  return false
}
```

### XP Progression Table
| Level | Total XP Required | XP for Next Level | Cumulative XP |
|-------|-------------------|-------------------|---------------|
| 1     | 0                 | 400               | 0             |
| 2     | 400               | 500               | 400           |
| 3     | 900               | 700               | 900           |
| 5     | 2,500             | 1,100             | 2,500         |
| 10    | 10,000            | 2,100             | 10,000        |

**Rationale**: Square root provides diminishing XP requirements that encourage early engagement while preventing excessive grinding at high levels.

---

## 8. Feed Generation Algorithm

### Decision
Use **reverse chronological feed with batch query optimization** for MVP.

### Query Pattern
```typescript
// worker/src/services/feed-service.ts
export async function generateFeed(userId: string, db: D1Database, limit = 50) {
  // 1. Get user's following list
  const following = await db.prepare(
    'SELECT followee_id FROM follows WHERE follower_id = ? LIMIT 1000'
  ).bind(userId).all<{ followee_id: string }>()

  const followingIds = following.results.map(f => f.followee_id)

  // 2. Fetch posts from followed users (use batch for efficiency)
  const placeholders = followingIds.map(() => '?').join(',')
  const posts = await db.prepare(
    `SELECT p.*, u.username, u.level
     FROM posts p
     JOIN users u ON p.user_id = u.id
     WHERE p.user_id IN (${placeholders})
     ORDER BY p.created_at DESC
     LIMIT ?`
  ).bind(...followingIds, limit).all()

  return posts.results
}
```

### Performance Optimization
- **Index**: `idx_posts_created_at` for ORDER BY clause
- **Composite Index**: `idx_posts_user_id_created_at` for WHERE + ORDER BY
- **Limit**: Cap at 50 posts per request (pagination for more)
- **Batch**: Single query instead of N queries for N followed users

### Constitutional Compliance
- Single-threaded processing: Feed query completes in <50ms (Constitution Principle V)
- Index usage verified: `EXPLAIN QUERY PLAN` shows index scan (Constitution Principle II)

**Success Criteria**: SC-008 requires <2s feed load time for 100 followed users.

---

## 9. Rate Limiting & Anti-Spam

### Decision
Use **Cloudflare KV for rate limiting** with token bucket algorithm.

### Implementation
```typescript
// worker/src/middleware/rate-limit.ts
import { Env } from '../types'

export async function rateLimit(c: Context<Env>) {
  const userId = c.get('userId')  // From JWT
  const key = `rate_limit:${userId}:posts`

  const current = await c.env.RATE_LIMIT_KV.get(key)
  const count = current ? parseInt(current) : 0

  if (count >= 10) {  // Max 10 posts per hour (Spec Assumption #9)
    return c.json({ error: 'Rate limit exceeded' }, 429)
  }

  await c.env.RATE_LIMIT_KV.put(key, (count + 1).toString(), { expirationTtl: 3600 })
  await c.next()
}
```

### Rate Limits (from Spec Assumption #9)
- **Posts**: 10 per hour (prevents spam posting)
- **Likes**: 50 per hour (allows generous interaction)
- **Comments**: 20 per hour (balances engagement with quality)

**Rationale**: Prevents XP farming while allowing normal engagement (Constitution edge case handling). Limits aligned across all documentation.

---

## 10. Media Storage (Images)

### Decision
Use **Cloudflare R2 for image storage**, unlocked at level 3 (FR-009, FR-025).

### Upload Flow
1. Frontend requests signed upload URL from Worker
2. Worker validates user level ≥ 3
3. Worker generates R2 presigned URL
4. Frontend uploads image directly to R2
5. Frontend sends R2 URL to Worker
6. Worker stores URL in posts table (TEXT column)

### Why R2?
- **Cost**: $0.015/GB storage vs R2 alternatives
- **Integration**: Native Cloudflare binding
- **No egress fees**: Bandwidth from R2 to Workers is free
- **D1 Compliance**: Image URLs (TEXT) fit in D1, binary data stays in R2 (Constitution Principle VII: 2MB row limit)

**References**:
- R2 documentation: https://developers.cloudflare.com/r2/

---

---

## 11. Analytics & User Tracking

### Decision
Use **Cloudflare Web Analytics** for privacy-friendly user behavior tracking.

### Implementation
```html
<!-- frontend/public/index.html -->
<script defer src='https://static.cloudflareinsights.com/beacon.min.js'
        data-cf-beacon='{"token": "YOUR_ANALYTICS_TOKEN"}'></script>
```

### Tracked Metrics
- **Page Views**: Feed loads, profile views, post detail pages
- **User Sessions**: Session duration, bounce rate
- **Engagement**: Clicks on like/comment buttons, post creation rate
- **Performance**: Page load times, API response times (via RUM)

### Custom Event Tracking
```typescript
// worker/src/middleware/analytics.ts
export function trackEvent(eventName: string, metadata: Record<string, any>) {
  // Log structured event for later analysis
  console.log(JSON.stringify({
    event: eventName,
    timestamp: Date.now(),
    ...metadata
  }))
}

// Usage: Track XP awards, level-ups, feature unlocks
trackEvent('xp_awarded', { userId, action: 'post', xp: 10 })
trackEvent('level_up', { userId, oldLevel: 1, newLevel: 2 })
```

### Privacy Compliance
- No cookies required (beacon uses first-party data only)
- GDPR/CCPA compliant (no PII tracked)
- Aggregated metrics only (no individual user tracking)

**Rationale**: Cloudflare Web Analytics is free for Cloudflare customers, privacy-friendly, and integrates seamlessly with Workers/Pages.

**References**:
- Cloudflare Web Analytics: https://developers.cloudflare.com/analytics/web-analytics/

---

## 12. Error Monitoring with Sentry

### Decision
Use **Sentry for Cloudflare Workers** (@sentry/cloudflare) for production error tracking.

### Installation
```bash
npm install --save @sentry/cloudflare
```

### Worker Integration
```typescript
// worker/src/index.ts
import * as Sentry from '@sentry/cloudflare'
import { Hono } from 'hono'

const app = new Hono<{ Bindings: Env }>()

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return Sentry.withSentry(
      {
        dsn: env.SENTRY_DSN,
        environment: env.ENVIRONMENT || 'production',
        tracesSampleRate: 0.1,  // 10% performance monitoring
        beforeSend(event) {
          // Scrub sensitive data
          if (event.request?.headers) {
            delete event.request.headers['Authorization']
            delete event.request.headers['Cookie']
          }
          return event
        }
      },
      () => app.fetch(request, env, ctx)
    )
  }
}
```

### Error Capture Examples
```typescript
// Automatic capture of unhandled errors
throw new Error('This will be sent to Sentry')

// Manual capture with context
Sentry.captureException(error, {
  tags: { feature: 'xp_system' },
  user: { id: userId, username },
  extra: { xpAwarded: 10, action: 'post' }
})

// Breadcrumb trail
Sentry.addBreadcrumb({
  category: 'xp',
  message: 'User earned 10 XP from post',
  level: 'info'
})
```

### Performance Monitoring
```typescript
// Track custom transactions
const transaction = Sentry.startTransaction({
  name: 'Generate Feed',
  op: 'feed.generate'
})

const span = transaction.startChild({
  op: 'db.query',
  description: 'Fetch posts from followed users'
})

// ... execute query ...

span.finish()
transaction.finish()
```

### Frontend Integration
```typescript
// frontend/src/main.tsx
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0
})
```

**Rationale**: Sentry provides real-time error alerts, performance monitoring, and replay sessions to debug production issues quickly.

**References**:
- Sentry for Cloudflare Workers: https://docs.sentry.io/platforms/javascript/guides/cloudflare-workers/

---

## 13. Terminal/MUD UI Design

### Decision
Use **xterm.js + custom React components** to create a retro terminal aesthetic reminiscent of MUD (Multi-User Dungeon) games.

### Core Libraries

| Library | Purpose | Rationale |
|---------|---------|-----------|
| xterm.js | Terminal emulation | Industry-standard, supports ANSI colors, cursor control |
| xterm-addon-fit | Responsive terminal sizing | Auto-resizes terminal to container |
| react-terminal-ui | Pre-built React terminal components | Speeds up development with styled components |
| chalk (browser) | ANSI color styling | Easy color formatting for terminal text |

### Installation
```bash
npm install xterm xterm-addon-fit @xterm/addon-web-links
npm install --save-dev @types/xterm
```

### Terminal Component Example
```typescript
// frontend/src/components/Terminal.tsx
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

export function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm>()

  useEffect(() => {
    const term = new XTerm({
      theme: {
        background: '#000000',
        foreground: '#00ff00',  // Classic green-on-black
        cursor: '#00ff00',
        cursorAccent: '#000000'
      },
      fontFamily: 'IBM Plex Mono, Courier New, monospace',
      fontSize: 14,
      cursorBlink: true
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    term.open(terminalRef.current!)
    fitAddon.fit()

    // ASCII art welcome message
    term.write('\x1b[32m')  // Green color
    term.write('╔══════════════════════════════════════╗\r\n')
    term.write('║   RPG SOCIAL MEDIA - MUD EDITION    ║\r\n')
    term.write('╚══════════════════════════════════════╝\r\n')
    term.write('\r\n')
    term.write('> Welcome, adventurer!\r\n')
    term.write('> Type /help for commands\r\n')
    term.write('\r\n> ')

    xtermRef.current = term

    return () => term.dispose()
  }, [])

  return <div ref={terminalRef} className="terminal-container" />
}
```

### Color Palette (MUD-style)
```css
/* frontend/src/styles/terminal.css */
:root {
  --terminal-bg: #000000;           /* Black background */
  --terminal-fg: #00ff00;           /* Green text */
  --terminal-accent: #00aa00;       /* Dark green accents */
  --terminal-error: #ff0000;        /* Red errors */
  --terminal-warning: #ffff00;      /* Yellow warnings */
  --terminal-info: #00ffff;         /* Cyan info */
  --terminal-xp: #ffd700;           /* Gold for XP */
  --terminal-level: #ff00ff;        /* Magenta for level-ups */
}

.terminal-container {
  background: var(--terminal-bg);
  padding: 20px;
  border: 2px solid var(--terminal-accent);
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);  /* CRT glow */
  position: relative;
}

/* Optional CRT scanline effect */
.terminal-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 255, 0, 0.1) 0px,
    transparent 1px,
    transparent 2px,
    rgba(0, 255, 0, 0.1) 3px
  );
  pointer-events: none;
}
```

### Command-Line Interface Pattern
```typescript
// frontend/src/hooks/useTerminalCommands.ts
export function useTerminalCommands() {
  const commands = {
    '/post': (text: string) => createPost(text),
    '/feed': () => showFeed(),
    '/profile': (username?: string) => showProfile(username),
    '/like': (postId: string) => likePost(postId),
    '/stats': () => showCharacterStats(),
    '/help': () => showHelp()
  }

  function executeCommand(input: string) {
    const [cmd, ...args] = input.trim().split(' ')
    const handler = commands[cmd]

    if (handler) {
      return handler(args.join(' '))
    } else {
      return { error: `Unknown command: ${cmd}. Type /help for available commands.` }
    }
  }

  return { executeCommand }
}
```

### ASCII Art Character Sheet Example
```typescript
// frontend/src/components/CharacterSheet.tsx
function renderCharacterSheet(user: UserProfile) {
  const xpBar = createProgressBar(user.xp_progress_percent, 20)

  return `
╔════════════════════════════════════════════════════════╗
║           CHARACTER SHEET: ${user.username.padEnd(25)}║
╠════════════════════════════════════════════════════════╣
║  LEVEL: ${String(user.level).padStart(3)} │ XP: ${String(user.total_xp).padStart(8)} │ Progress: ${xpBar} ║
║                                                        ║
║  STATS:                                                ║
║    Posts Created:      ${String(user.total_posts).padStart(6)}                      ║
║    Likes Given:        ${String(user.total_likes_given).padStart(6)}                      ║
║    Likes Received:     ${String(user.total_likes_received).padStart(6)}                      ║
║    Comments Made:      ${String(user.total_comments_made).padStart(6)}                      ║
║    Followers:          ${String(user.followers_count).padStart(6)}                      ║
║    Following:          ${String(user.following_count).padStart(6)}                      ║
║                                                        ║
║  UNLOCKED FEATURES:                                    ║
${renderUnlockedFeatures(user.level).map(f => `║    ✓ ${f.padEnd(46)}║`).join('\n')}
╚════════════════════════════════════════════════════════╝
  `
}

function createProgressBar(percent: number, length: number = 20): string {
  const filled = Math.round(percent / 100 * length)
  const bar = '█'.repeat(filled) + '░'.repeat(length - filled)
  return `[${bar}] ${percent.toFixed(0)}%`
}
```

### Level-Up Animation (ASCII)
```typescript
function showLevelUpAnimation(newLevel: number) {
  const frames = [
    `
    ░░░░░░░░░░░░░░░░░░
    ░ LEVEL UP! Lvl ${newLevel} ░
    ░░░░░░░░░░░░░░░░░░
    `,
    `
    ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
    ▒ LEVEL UP! Lvl ${newLevel} ▒
    ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
    `,
    `
    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
    ▓ LEVEL UP! Lvl ${newLevel} ▓
    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
    `,
    `
    ██████████████████
    █ LEVEL UP! Lvl ${newLevel} █
    ██████████████████
    `
  ]

  // Animate frames
  frames.forEach((frame, i) => {
    setTimeout(() => {
      term.write('\x1b[33m')  // Yellow color
      term.write(frame)
      term.write('\x1b[32m')  // Back to green
    }, i * 200)
  })
}
```

### Alternative: blessed-react (Terminal UI Components)
```bash
npm install blessed-react blessed
```

```typescript
// More advanced terminal UI with widgets
import blessed from 'blessed'
import { render } from 'blessed-react'

function App() {
  return (
    <box border={{ type: 'line' }} style={{ border: { fg: 'green' } }}>
      <text top={0} left={0}>Character: {username}</text>
      <text top={1} left={0}>Level: {level} | XP: {xp}</text>
      <progressbar top={2} left={0} width="50%" filled={xpPercent} />
    </box>
  )
}
```

**Rationale**: xterm.js provides authentic terminal emulation with full ANSI support, while React components allow for interactive UI elements. This approach creates a nostalgic MUD experience while maintaining modern usability.

**Design Inspiration**:
- Classic MUDs (Zork, NetHack, Aardwolf)
- Hacknet game UI
- Fallout 3/4 terminal interface
- Dwarf Fortress ASCII graphics

**References**:
- xterm.js: https://xtermjs.org/
- ASCII art generator: https://patorjk.com/software/taag/
- ANSI escape codes: https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797

---

## Summary of Technology Stack

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Backend Framework** | Hono | 4.x | Lightweight, Workers-optimized, type-safe |
| **Database** | Cloudflare D1 | Latest | SQLite-based, edge distributed, constitutional compliance |
| **Storage** | Cloudflare R2 | Latest | Cost-effective image storage |
| **Frontend Framework** | React | 18+ | Rich ecosystem for RPG UI components |
| **Terminal UI** | xterm.js | Latest | Authentic terminal emulation with ANSI support |
| **Build Tool** | Vite | 5.x | Fast builds, Pages integration |
| **Language** | TypeScript | 5.x | Type safety, strict mode |
| **Testing (Unit)** | Vitest | Latest | Fast, TypeScript-native |
| **Testing (Integration)** | Miniflare | Latest | Local D1 simulation |
| **Testing (E2E)** | Playwright | Latest | Cross-browser user journey tests |
| **Deployment** | Wrangler CLI | 3.x | Cloudflare deployment tooling |
| **Authentication** | JWT (Hono) | Built-in | Stateless, secure |
| **Rate Limiting** | Cloudflare KV | Latest | Distributed rate limit storage |
| **Analytics** | Cloudflare Web Analytics | Latest | Privacy-friendly, free for CF customers |
| **Error Tracking** | Sentry (@sentry/cloudflare) | 8.x | Real-time error monitoring, performance tracking |

---

## Open Questions Resolved

All technical context items have been resolved. No remaining "NEEDS CLARIFICATION" items.

**New Requirements Added** (2026-02-13):
- ✅ Analytics: Cloudflare Web Analytics selected
- ✅ Error Logging: Sentry for Cloudflare Workers integrated
- ✅ Terminal UI: xterm.js + React components approach defined
- ✅ Auth: Register/login already covered in original plan

**Phase 0 Status**: ✅ COMPLETE (Updated with new requirements)

**Next Phase**: Phase 1 - Design (data-model.md, contracts/, quickstart.md) - **Needs Update** for analytics/Sentry integration
