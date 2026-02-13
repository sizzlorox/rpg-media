# Quickstart Guide: Social Forge Platform

**Last Updated**: 2026-02-13
**Phase**: 1 - Implementation Ready

## Prerequisites

- **Node.js**: 18+ (LTS recommended)
- **Cloudflare Account**: Free tier sufficient for development
- **Wrangler CLI**: 3.x (`npm install -g wrangler`)
- **Git**: For version control

## 1. Initial Setup (5 minutes)

### Clone Repository & Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd rpg-media

# Install worker dependencies
cd worker
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ..
```

### Configure Cloudflare Account

```bash
# Authenticate with Cloudflare
wrangler login

# Create D1 database
wrangler d1 create rpg-social-db

# Create R2 bucket for media storage
wrangler r2 bucket create rpg-social-media

# Create KV namespace for rate limiting
wrangler kv namespace create "RATE_LIMIT_KV"
```

### Configure Sentry & Analytics

```bash
# Sign up for Sentry (free tier sufficient for development)
# Get your DSN from https://sentry.io/settings/projects/

# Enable Cloudflare Web Analytics in dashboard
# Get analytics token from https://dash.cloudflare.com/
```

### Update wrangler.toml

Copy the database ID from the `wrangler d1 create` output and add it to `worker/wrangler.toml`:

```toml
name = "rpg-social-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "rpg-social-db"
database_id = "<YOUR_DATABASE_ID>"  # Replace with actual ID

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "rpg-social-media"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "<YOUR_KV_ID>"  # Replace with actual ID

[vars]
JWT_SECRET = "development-secret-change-in-production"
SENTRY_DSN = "<YOUR_SENTRY_DSN>"  # Get from Sentry dashboard
ENVIRONMENT = "development"
```

### Update frontend/.env

Create `frontend/.env.local` for frontend environment variables:

```bash
# Sentry DSN for frontend
VITE_SENTRY_DSN=<YOUR_SENTRY_DSN>

# Cloudflare Web Analytics token
VITE_ANALYTICS_TOKEN=<YOUR_ANALYTICS_TOKEN>
```

## 2. Database Setup (2 minutes)

### Run Migrations Locally

```bash
cd worker

# Run initial schema migration
wrangler d1 execute rpg-social-db --local --file=migrations/001_initial_schema.sql

# Run indexes migration
wrangler d1 execute rpg-social-db --local --file=migrations/002_add_indexes.sql

# Verify tables created
wrangler d1 execute rpg-social-db --local --command "SELECT name FROM sqlite_master WHERE type='table'"
```

Expected output:
```
users
posts
likes
comments
follows
level_thresholds
```

### Seed Test Data (Optional)

```bash
# Create a test user
wrangler d1 execute rpg-social-db --local --file=migrations/999_seed_test_data.sql
```

## 3. Local Development (Start Coding!)

### Terminal 1: Start Worker (Backend)

```bash
cd worker

# Start with persistent local database
wrangler dev --persist-to=../.wrangler/state

# Worker starts at http://localhost:8787
```

### Terminal 2: Start Frontend

```bash
cd frontend

# Start Vite dev server
npm run dev

# Frontend starts at http://localhost:5173
```

### Terminal 3: Run Tests (Optional)

```bash
cd worker

# Run unit tests
npm test

# Run integration tests (with Miniflare)
npm run test:integration

# Watch mode
npm run test:watch
```

## 4. Verify Setup ✅

### Test Authentication Endpoint

```bash
# Register a new user
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123"}' \
  -c cookies.txt

# Response should include user profile with level 1, 0 XP
```

Expected response:
```json
{
  "id": "...",
  "username": "testuser",
  "level": 1,
  "total_xp": 0,
  "xp_for_current_level": 0,
  "xp_for_next_level": 400,
  "xp_progress_percent": 0,
  "total_posts": 0,
  "followers_count": 0,
  "following_count": 0
}
```

### Test Post Creation

```bash
# Create a post (uses cookie from registration)
curl -X POST http://localhost:8787/api/posts \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"content": "My first post!"}'

# Response should award 10 XP
```

Expected response:
```json
{
  "post": {
    "id": "...",
    "content": "My first post!",
    "created_at": 1234567890
  },
  "xp_awarded": 10,
  "level_up": false
}
```

### Verify XP Update

```bash
# Check user profile
curl -X GET http://localhost:8787/api/auth/me \
  -b cookies.txt

# total_xp should now be 10
```

## 5. Frontend Verification

1. Open http://localhost:5173 in browser
2. Register account: "testuser2" / "password123"
3. Create a post (should see +10 XP notification)
4. Like the post (should see +1 XP for you, +2 XP for post creator)
5. Check character sheet (profile page) - verify stats display correctly

## 6. Development Workflow

### Making Changes to Backend

1. Edit files in `worker/src/`
2. Wrangler automatically reloads (hot reload enabled)
3. Test endpoints with curl or Postman
4. Run tests: `npm test`

### Making Changes to Frontend

1. Edit files in `frontend/src/`
2. Vite automatically reloads in browser
3. Check browser console for errors

### Adding New Migrations

```bash
# Create new migration file
touch worker/migrations/003_add_feature_name.sql

# Edit the file with SQL
cat > worker/migrations/003_add_feature_name.sql << 'EOF'
-- Add new column to posts table
ALTER TABLE posts ADD COLUMN new_column TEXT;
EOF

# Run locally
wrangler d1 execute rpg-social-db --local --file=worker/migrations/003_add_feature_name.sql

# Run PRAGMA optimize after schema changes
wrangler d1 execute rpg-social-db --local --command "PRAGMA optimize"
```

## 7. Testing Strategies

### Unit Tests (Pure Functions)

```typescript
// worker/tests/unit/xp-service.test.ts
import { describe, it, expect } from 'vitest'
import { calculateLevel, xpForNextLevel } from '../../src/lib/constants'

describe('XP Calculation', () => {
  it('calculates level correctly', () => {
    expect(calculateLevel(0)).toBe(1)      // 0 XP = Level 1
    expect(calculateLevel(100)).toBe(1)    // 100 XP = Level 1
    expect(calculateLevel(400)).toBe(2)    // 400 XP = Level 2
    expect(calculateLevel(900)).toBe(3)    // 900 XP = Level 3
    expect(calculateLevel(10000)).toBe(10) // 10,000 XP = Level 10
  })

  it('calculates XP for next level', () => {
    expect(xpForNextLevel(1)).toBe(400)    // Level 1 → 2 needs 400 XP
    expect(xpForNextLevel(2)).toBe(900)    // Level 2 → 3 needs 900 total
    expect(xpForNextLevel(10)).toBe(12100) // Level 10 → 11 needs 12,100 total
  })
})
```

### Integration Tests (Database Operations)

```typescript
// worker/tests/integration/xp-earning.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { Miniflare } from 'miniflare'

describe('XP Earning Flow', () => {
  let mf: Miniflare
  let db: D1Database

  beforeAll(async () => {
    mf = new Miniflare({
      modules: true,
      script: '',
      d1Databases: ['DB'],
      d1Persist: '.wrangler/test-state'
    })

    db = await mf.getD1Database('DB')
    // Run migrations...
  })

  it('awards XP when user creates post', async () => {
    // Create user
    const userId = 'test-user-id'
    await db.prepare('INSERT INTO users (id, username, password_hash, level, total_xp, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(userId, 'testuser', 'hash', 1, 0, Date.now(), Date.now())
      .run()

    // Award XP
    await db.prepare('UPDATE users SET total_xp = total_xp + ? WHERE id = ?')
      .bind(10, userId)
      .run()

    // Verify XP updated
    const user = await db.prepare('SELECT total_xp FROM users WHERE id = ?')
      .bind(userId)
      .first<{ total_xp: number }>()

    expect(user.total_xp).toBe(10)
  })
})
```

### E2E Tests (Full User Journeys)

```typescript
// tests/e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test'

test('user can register, post, and earn XP', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:5173')

  // Register
  await page.click('text=Sign Up')
  await page.fill('input[name="username"]', 'e2euser')
  await page.fill('input[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  // Verify on home feed
  await expect(page.locator('h1')).toContainText('Home Feed')

  // Create post
  await page.fill('textarea[name="content"]', 'My first E2E post!')
  await page.click('button:has-text("Post")')

  // Verify XP notification
  await expect(page.locator('.notification')).toContainText('+10 XP')

  // Check character sheet
  await page.click('text=Profile')
  await expect(page.locator('.total-xp')).toContainText('10')
})
```

## 8. Debugging Tips

### View Local Database

```bash
# Open SQLite shell
wrangler d1 execute rpg-social-db --local --command "SELECT * FROM users"

# Count records
wrangler d1 execute rpg-social-db --local --command "SELECT COUNT(*) FROM posts"

# Check indexes
wrangler d1 execute rpg-social-db --local --command "SELECT * FROM sqlite_master WHERE type='index'"
```

### View Query Plans (Performance)

```bash
# Verify index usage
wrangler d1 execute rpg-social-db --local --command "EXPLAIN QUERY PLAN SELECT * FROM posts WHERE user_id = 'test-id' ORDER BY created_at DESC"
```

Expected output should show "USING INDEX idx_posts_user_id_created_at"

### Worker Logs

```bash
# Tail logs in real-time
wrangler tail

# Filter by log level
wrangler tail --status error
```

### Frontend Debugging

- Open browser DevTools (F12)
- Check Network tab for API calls
- Check Console for JavaScript errors
- Use React DevTools extension for component inspection

## 9. Common Issues & Solutions

### Issue: "Database not found"
**Solution**: Run migrations locally first
```bash
wrangler d1 execute rpg-social-db --local --file=migrations/001_initial_schema.sql
```

### Issue: "401 Unauthorized" on API calls
**Solution**: Ensure cookie is set from /api/auth/login
```bash
# Save cookie with -c flag
curl -X POST http://localhost:8787/api/auth/login ... -c cookies.txt

# Use cookie with -b flag
curl -X GET http://localhost:8787/api/auth/me -b cookies.txt
```

### Issue: "Rate limit exceeded"
**Solution**: Clear KV namespace or wait 1 hour
```bash
# List KV keys
wrangler kv:key list --namespace-id <ID>

# Delete specific key
wrangler kv:key delete "rate_limit:user-id:posts" --namespace-id <ID>
```

### Issue: Frontend can't connect to Worker
**Solution**: Check Vite proxy configuration in `frontend/vite.config.ts`
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8787'  // Should match wrangler dev port
    }
  }
})
```

## 10. Deployment to Production

### Deploy Worker

```bash
cd worker

# Create production D1 database
wrangler d1 create rpg-social-db-prod

# Run migrations on production DB
wrangler d1 execute rpg-social-db-prod --remote --file=migrations/001_initial_schema.sql
wrangler d1 execute rpg-social-db-prod --remote --file=migrations/002_add_indexes.sql

# Deploy Worker
wrangler deploy
```

### Deploy Frontend to Pages

```bash
cd frontend

# Build production bundle
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=rpg-social-frontend
```

### Update Environment Variables

Set production JWT secret in Cloudflare dashboard:
1. Go to Workers & Pages
2. Select your Worker
3. Settings → Variables
4. Add `JWT_SECRET` with strong random value

## 11. Terminal UI Development

### Setting Up xterm.js

```bash
cd frontend

# Install terminal UI dependencies
npm install xterm xterm-addon-fit xterm-addon-web-links
npm install --save-dev @types/xterm
```

### Testing Terminal Interface

1. **View Terminal Component**:
   ```bash
   npm run dev
   # Navigate to http://localhost:5173
   # Should see green-on-black terminal interface
   ```

2. **Test Command Input**:
   ```
   > /register testuser password123
   [SUCCESS] Account created! Level 1, 0 XP

   > /post Hello, MUD world!
   [+10 XP] Post created!

   > /stats
   ╔════════════════════════════════════╗
   ║     CHARACTER: testuser            ║
   ╠════════════════════════════════════╣
   ║  LEVEL: 1 │ XP: 10/400 [█░░░░░░] ║
   ╚════════════════════════════════════╝
   ```

3. **Test ASCII Art Rendering**:
   - Character sheet should display ASCII borders
   - Progress bars should use █ and ░ characters
   - Level-up animation should show block characters

### Styling Checklist

- [ ] Monospace font loaded (IBM Plex Mono or Courier New)
- [ ] Green-on-black color scheme (#00ff00 on #000000)
- [ ] CRT glow effect visible (optional green shadow)
- [ ] Scanline overlay effect (optional)
- [ ] Terminal borders render correctly
- [ ] ASCII progress bars display properly
- [ ] ANSI color codes work (red errors, yellow warnings, cyan info)

### Terminal Command Reference

| Command | Action | Example |
|---------|--------|---------|
| `/register <user> <pass>` | Create account | `/register player123 mypass` |
| `/login <user> <pass>` | Login | `/login player123 mypass` |
| `/post <text>` | Create post | `/post Just leveled up!` |
| `/feed` | Show home feed | `/feed` |
| `/profile [user]` | View character sheet | `/profile` or `/profile other_user` |
| `/like <post_id>` | Like a post | `/like abc123` |
| `/comment <post_id> <text>` | Comment on post | `/comment abc123 Great post!` |
| `/follow <user>` | Follow user | `/follow other_user` |
| `/stats` | Show character stats | `/stats` |
| `/help` | Show all commands | `/help` |
| `/clear` | Clear terminal | `/clear` |

### Debugging Terminal UI

```typescript
// frontend/src/components/Terminal.tsx

// Enable xterm.js debugging
const term = new XTerm({
  // ... other options
  logLevel: 'debug'  // Shows all terminal events in console
})

// Test ANSI colors
term.write('\x1b[32mGreen text\x1b[0m\r\n')  // Green
term.write('\x1b[31mRed text\x1b[0m\r\n')    // Red
term.write('\x1b[33mYellow text\x1b[0m\r\n') // Yellow

// Test cursor positioning
term.write('\x1b[H')  // Move to home (0,0)
term.write('\x1b[2J') // Clear screen
```

---

## 12. Analytics & Error Monitoring

### Verify Cloudflare Analytics

1. Deploy frontend to Cloudflare Pages
2. Visit site URL
3. Check Cloudflare Dashboard → Analytics → Web Analytics
4. Should see page views, sessions, and performance metrics

### Verify Sentry Integration

```bash
# Trigger test error in development
curl -X POST http://localhost:8787/api/test/error

# Check Sentry dashboard for captured error
# Navigate to https://sentry.io/issues/
```

### View Analytics Events

```bash
# Tail Worker logs to see custom events
wrangler tail

# Should see structured JSON logs:
# {"event":"xp_awarded","userId":"...","action":"post","xp":10}
# {"event":"level_up","userId":"...","oldLevel":1,"newLevel":2}
```

### Sentry Error Testing

```typescript
// worker/src/routes/auth.ts
import * as Sentry from '@sentry/cloudflare'

app.post('/api/test/error', async (c) => {
  try {
    throw new Error('Test error for Sentry')
  } catch (error) {
    Sentry.captureException(error, {
      tags: { test: true },
      user: { id: 'test-user' }
    })
    return c.json({ error: 'Sent to Sentry' }, 500)
  }
})
```

---

## 13. Next Steps

After setup is complete:

1. **Implement User Stories**: Follow priority order (P1 → P2 → P3)
   - Start with `/speckit.tasks` to generate task list
   - Implement P1 (Basic Social Posting) first
   - Test independently before moving to P2

2. **Run Constitution Checks**: Verify compliance with all 7 principles
   - All tables use STRICT mode ✅
   - Indexes created for WHERE clauses ✅
   - Batch operations for XP awards ✅
   - Local testing before production ✅

3. **Monitor Performance**: Track success criteria
   - Feed load time <2s (SC-008)
   - XP update visibility <1s (SC-002)
   - Level-up notification <2s (SC-004)

4. **Iterate**: Add features progressively
   - Level 3 feature: Image uploads (integrate R2)
   - Level 7 feature: Profile customization
   - Level 10 feature: Custom themes
   - Level 15 feature: Pinned posts, polls

## 12. Useful Commands Reference

```bash
# Development
wrangler dev --persist-to=.wrangler/state     # Start Worker locally
npm run dev                                    # Start frontend (in frontend/)
npm test                                       # Run tests

# Database
wrangler d1 execute <db> --local --file=<file>   # Run migration locally
wrangler d1 execute <db> --local --command=<sql> # Execute SQL locally
wrangler d1 export <db> --local --output=backup.sql  # Backup database

# Deployment
wrangler deploy                                # Deploy Worker
wrangler pages deploy dist                     # Deploy frontend

# Debugging
wrangler tail                                  # View Worker logs
wrangler d1 execute <db> --local --command "EXPLAIN QUERY PLAN ..."  # Check query plan
```

---

## Support & Resources

- **Cloudflare D1 Docs**: https://developers.cloudflare.com/d1/
- **Hono Framework**: https://hono.dev/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/
- **Constitution**: `.specify/memory/constitution.md`
- **Spec**: `specs/001-rpg-social-media/spec.md`
- **API Contracts**: `specs/001-rpg-social-media/contracts/api-spec.yaml`

**Happy Coding! 🎮✨**
