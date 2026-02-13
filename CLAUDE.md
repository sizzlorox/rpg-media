# rpg-media Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-13

## Active Technologies
- Cloudflare D1 (SQLite-based distributed database), Cloudflare R2 (image storage for level 3+ users) (001-rpg-social-media)

- TypeScript 5.x with strict mode enabled + Hono 4.x (web framework), Cloudflare D1 (SQLite database), Wrangler CLI 3.x (deployment) (001-rpg-social-media)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

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

### Constitution Compliance
All code must follow the 7 principles in `.specify/memory/constitution.md`:
1. Horizontal Database Scaling (per-user/tenant databases)
2. Index-First Performance (indexes on all WHERE clauses)
3. Type Safety & Schema Strictness (STRICT tables, TypeScript generics)
4. Local-First Development (wrangler dev, never test on production)
5. Batch Operations & Concurrency (batch() for multi-statement ops)
6. Migration Safety (SQL files, dependency ordering, local testing)
7. Platform Limits Awareness (10GB/DB, 2MB/row, single-threaded queries)

<!-- MANUAL ADDITIONS END -->
