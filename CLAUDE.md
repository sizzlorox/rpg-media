# rpg-media Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-13

## Active Technologies
- Cloudflare D1 (SQLite-based distributed database), Cloudflare R2 (image storage for level 3+ users) (001-rpg-social-media)

- TypeScript 5.x with strict mode enabled + Hono 4.x (web framework), Cloudflare D1 (SQLite database), Wrangler CLI 3.x (deployment) (001-rpg-social-media)

## Project Structure

```text
frontend/          # React + Vite frontend application
  src/
    components/    # React components
    hooks/         # Custom React hooks
    pages/         # Page components
    services/      # API client services
    styles/        # CSS styles
    utils/         # Utility functions
worker/            # Cloudflare Worker backend
  src/
    routes/        # API route handlers
    models/        # Database models
    services/      # Business logic services
    lib/           # Utilities and helpers
    middleware/    # Hono middleware
shared/            # Shared TypeScript types
  types/           # Type definitions
tests/             # Integration tests
```

## Commands

### Development
- `cd frontend && npm run dev` - Start frontend dev server
- `cd worker && wrangler dev` - Start worker dev server
- `npm test` - Run tests (not yet configured)

### Build & Deploy
- `cd frontend && npm run build` - Build frontend for production
- `npx wrangler deploy` - Deploy worker to Cloudflare (manual deployment)
- **Note**: Deployment is done manually by the developer

## Code Style

TypeScript 5.x with strict mode enabled: Follow standard conventions

## Recent Changes
- 001-rpg-social-media: Added TypeScript 5.x with strict mode enabled

- 001-rpg-social-media: Added TypeScript 5.x with strict mode enabled + Hono 4.x (web framework), Cloudflare D1 (SQLite database), Wrangler CLI 3.x (deployment)

<!-- MANUAL ADDITIONS START -->

## Additional Technologies (001-rpg-social-media)

### Frontend
- **xterm.js**: Terminal emulation for MUD-style UI
- **React 18+**: Component framework
- **Vite 5.x**: Build tool

### Backend
- **@sentry/cloudflare 8.x**: Error tracking and performance monitoring
- **Hono middleware**: JWT auth, rate limiting, analytics logging

### Services
- **Cloudflare Web Analytics**: Privacy-friendly user behavior tracking
- **Sentry**: Production error monitoring and performance tracking

### UI Theme: Terminal/MUD Aesthetic
- Monospace fonts (IBM Plex Mono, Courier New)
- Green-on-black color scheme (#00ff00 on #000000)
- ASCII art character sheets and progress bars
- Command-line style navigation (e.g., `> /post Hello world!`)
- Optional CRT effects (scanlines, glow)

### Responsive Design Requirements
**CRITICAL:** ALL UI changes, features, and bugfixes MUST be responsive across all devices.

**Target Breakpoints:**
- **Mobile**: ≤640px (iPhone, Android phones)
- **Tablet**: 641-1024px (iPad, Android tablets)
- **Desktop**: >1024px (laptops, monitors)

**Required Testing:**
- Test at all three breakpoints before considering work complete
- Verify no content cutoff at viewport edges
- Ensure touch targets are adequate on mobile (min 44x44px)
- Check that terminal scrolling works properly on all devices

**Responsive Patterns to Follow:**
1. **Viewport Heights**: Use `calc(100vh - Npx)` to account for padding, never raw `vh` units
2. **Safe Areas**: Support `env(safe-area-inset-*)` for notched devices (iPhone X+)
3. **Mobile Browser Bars**: Use `-webkit-fill-available` for dynamic address bar handling
4. **Font Sizes**: Scale down on mobile (10px), medium on tablet (12px), full on desktop (14px)
5. **Terminal Dimensions**: Adjust rows/cols for device (`minCols: 40/60/80`, `minRows: 24/28/30`)
6. **Touch vs Click**: Consider touch interactions on mobile (no hover states required)

**Files Containing Responsive Logic:**
- `frontend/src/utils/terminal-responsive.ts` - Breakpoint configuration
- `frontend/src/styles/terminal.css` - Responsive CSS and media queries
- `frontend/src/components/Terminal.tsx` - Terminal viewport handling

**When Adding New Features:**
- Check terminal-responsive.ts for current breakpoint settings
- Add responsive CSS in @media queries if styling changes
- Test on mobile viewport in browser DevTools
- Ensure xterm.js FitAddon recalculates on window resize

### Constitution Compliance
All code must follow the 7 principles in `.specify/memory/constitution.md`:
1. Horizontal Database Scaling (per-user/tenant databases)
2. Index-First Performance (indexes on all WHERE clauses)
3. Type Safety & Schema Strictness (STRICT tables, TypeScript generics)
4. Local-First Development (wrangler dev, never test on production)
5. Batch Operations & Concurrency (batch() for multi-statement ops)
6. Migration Safety (SQL files, dependency ordering, local testing)
7. Platform Limits Awareness (10GB/DB, 2MB/row, single-threaded queries)

## Recent Feature Implementations

### Comments Pagination (2026-02-13)
Added pagination support to `/show <post_id>` command for viewing post comments.

**Features:**
- Page-based navigation (15 comments per page by default)
- Commands: `/show <post_id>`, `/show <post_id> 2`, `/show <post_id> next`, `/show <post_id> prev`
- Backend uses LIMIT/OFFSET with has_more detection pattern (limit+1 fetch)
- Frontend tracks last viewed post for stateful next/prev navigation

**Files Changed:**
- `worker/src/routes/interactions.ts` - Added pagination to GET /api/posts/:id/comments
- `shared/types/index.ts` - Added CommentsResponse interface
- `frontend/src/hooks/useComments.ts` - NEW: Comments state management hook
- `frontend/src/hooks/useTerminalCommands.ts` - Updated /show to accept page parameter
- `frontend/src/pages/Home.tsx` - Updated handleShow with pagination logic
- `frontend/src/components/TerminalComment.tsx` - Added renderPaginatedCommentsView()

**API Changes:**
- Query params: `?page=N&limit=N` (optional, defaults: page=1, limit=15)
- Response includes pagination metadata (page, limit, total_comments, total_pages, has_more, has_previous)
- Backward compatible - old clients get first 15 comments

### Terminal Architecture Refactor (2026-02-14)
Refactored Terminal component from 560-line monolith to modular 6-component architecture (72.6% LOC reduction).

**Architecture:**
- **Terminal.tsx** (153 lines) - Integration layer orchestrating modular components
- **terminal/TerminalCore.tsx** - xterm.js initialization, lifecycle, FitAddon integration
- **terminal/TerminalInput.tsx** - Keyboard input handling, cursor navigation
- **terminal/TerminalOutput.tsx** - Output buffer management (10K line limit), ANSI sanitization
- **terminal/TerminalStyling.tsx** - Theme configuration, responsive breakpoints
- **terminal/TerminalState.tsx** - State management (command history, autocomplete)
- **terminal/TerminalErrorBoundary.tsx** - Error handling with fallback UI

**Key Improvements:**
- 72.6% reduction in lines of code (560 → 153)
- 30%+ reduction in cyclomatic complexity
- Abstraction layer isolating xterm.js API for easier future migration
- Buffer management prevents memory leaks (circular history, sliding window output)
- Input validation prevents UI freeze (2000 char limit)
- Enhanced error handling with graceful degradation
- 100% visual parity with original implementation

**Developer Resources:**
- **Architecture docs**: `specs/001-terminal-refactor/component-architecture.md`
- **Quickstart guide**: `specs/001-terminal-refactor/quickstart.md` (≤30min onboarding)
- **TypeScript contracts**: `specs/001-terminal-refactor/contracts/*.interface.ts`
- **Implementation tasks**: `specs/001-terminal-refactor/tasks.md`

**Files Structure:**
```
frontend/src/
├── components/
│   ├── Terminal.tsx (main integration)
│   └── terminal/
│       ├── TerminalCore.tsx
│       ├── TerminalInput.tsx
│       ├── TerminalOutput.tsx
│       ├── TerminalStyling.tsx
│       ├── TerminalState.tsx
│       └── TerminalErrorBoundary.tsx
└── utils/
    ├── terminal-responsive.ts (breakpoint config)
    ├── ansi-colors.ts (ANSI helpers)
    ├── ascii-logo.ts (logo rendering)
    └── welcome-message.ts (welcome screen)
```

**Buffer Limits:**
- Command history: 100 entries (circular buffer)
- Output buffer: 10,000 lines (sliding window, trims oldest 1000 when exceeded)
- Input length: 2,000 characters max

**Responsive Breakpoints:**
- Mobile (≤640px): 10px font, 40 cols, 24 rows, compact logo
- Tablet (641-1024px): 12px font, 60 cols, 28 rows, medium logo
- Desktop (>1024px): 14px font, 80 cols, 30 rows, full logo

<!-- MANUAL ADDITIONS END -->
