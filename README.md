# Social Forge

**Level up through engagement.** A gamified social media platform with RPG mechanics, built with Cloudflare Workers, D1, and React. Users earn XP from interactions, level up to unlock features, and view profiles as ASCII character sheets—all in a retro terminal interface.

## Features

- 🎮 **RPG Progression System**: Earn XP from posts, likes, comments, and follows
- ⬆️ **Level Up**: Automatic progression with feature unlocks at levels 3, 5, 7, 10, 15
- 📊 **Character Sheets**: ASCII-bordered profiles with stats and XP progress bars
- 🖥️ **Terminal UI**: Authentic MUD-style green-on-black terminal interface
- 📝 **Dynamic Character Limits**: 280 → 500 → 1000 characters as you level up
- 🖼️ **Image Uploads**: Unlock at level 3 (via Cloudflare R2)
- 🎨 **Profile Customization**: Avatar/banner at level 7, themes at level 10
- 👥 **Social Graph**: Follow users, personalized feeds, engagement tracking
- 📈 **Discovery Feed**: Algorithm for new users based on post popularity

## Tech Stack

- **Backend**: Cloudflare Workers + Hono 4.x
- **Database**: Cloudflare D1 (SQLite) with STRICT mode
- **Storage**: Cloudflare R2 for media
- **Rate Limiting**: Cloudflare KV with token bucket
- **Frontend**: React 18 + TypeScript + Vite 5
- **Terminal**: xterm.js (@xterm/xterm)
- **Monitoring**: Sentry for error tracking
- **Analytics**: Cloudflare Web Analytics

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`

### Installation

```bash
# Clone repository
git clone <repo-url>
cd rpg-media

# Install worker dependencies
cd worker
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Configuration

1. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

2. **Create D1 Database**:
   ```bash
   cd worker
   wrangler d1 create rpg-social-media
   # Copy the database_id to wrangler.toml
   ```

3. **Create R2 Bucket** (for image uploads):
   ```bash
   wrangler r2 bucket create rpg-media-uploads
   # Update wrangler.toml with bucket name
   ```

4. **Create KV Namespace** (for rate limiting):
   ```bash
   wrangler kv namespace create RATE_LIMIT_KV
   # Copy the id to wrangler.toml
   ```

5. **Set Environment Variables**:
   ```bash
   # Generate a secure JWT secret
   wrangler secret put JWT_SECRET
   # Enter a random 32+ character string

   # Add Sentry DSN (optional)
   wrangler secret put SENTRY_DSN
   ```

6. **Run Database Migrations**:
   ```bash
   cd worker
   wrangler d1 execute rpg-social-media --file=migrations/001_initial_schema.sql
   wrangler d1 execute rpg-social-media --file=migrations/002_add_indexes.sql
   ```

### Development

```bash
# Terminal 1: Start worker
cd worker
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

### Terminal Commands

Once logged in, use these commands in the terminal:

```bash
# Account Management
/register <username> <password>  # Create account
/login <username> <password>     # Login
/profile [username]              # View character sheet

# Posting & Interaction
/post <content>                  # Create post (+10 XP)
/feed                            # View home feed
/like <post_id>                  # Like post (+1 XP)
/comment <post_id> <text>        # Comment (+5 XP)

# Social
/follow <username>               # Follow user (+5 XP for them)
/unfollow <username>             # Unfollow user

# Progression
/levels                          # View level thresholds
/unlocks                         # View feature roadmap

# Help
/help                            # Show all commands
/clear                           # Clear terminal
```

## XP & Leveling

### XP Awards
- **Create Post**: +10 XP
- **Like Post**: +1 XP (liker), +2 XP (creator)
- **Comment**: +5 XP (commenter), +3 XP (creator)
- **Receive Follow**: +5 XP

### Level Formula
```
Level = floor(sqrt(total_XP / 100))
```

### Feature Unlocks
- **Level 1**: Basic posting (280 chars), liking, commenting, following
- **Level 3**: Image uploads
- **Level 5**: Extended posts (500 chars)
- **Level 7**: Profile customization (avatar, banner)
- **Level 10**: Advanced posts (1000 chars), custom themes
- **Level 15**: Pinned posts

## Rate Limits

- Posts: 10 per hour
- Likes: 50 per hour
- Comments: 20 per hour

## Deployment

See [docs/deployment.md](docs/deployment.md) for production deployment instructions.

## Architecture

```
rpg-media/
├── worker/              # Cloudflare Worker (API)
│   ├── src/
│   │   ├── index.ts    # Entry point
│   │   ├── routes/     # API endpoints
│   │   ├── models/     # Data models
│   │   ├── services/   # Business logic
│   │   ├── middleware/ # Auth, rate limiting
│   │   └── lib/        # Utilities, constants
│   ├── migrations/     # D1 SQL migrations
│   └── wrangler.toml   # Cloudflare config
├── frontend/           # React app
│   ├── src/
│   │   ├── pages/      # Route pages
│   │   ├── components/ # UI components
│   │   ├── hooks/      # React hooks
│   │   └── services/   # API client
│   └── vite.config.ts
└── shared/
    └── types/          # Shared TypeScript types
```

## Database Schema

- **users**: User accounts with XP, level, profile data
- **posts**: User-generated content with timestamps
- **likes**: Post likes with composite index
- **comments**: Post comments
- **follows**: Social graph relationships
- **level_thresholds**: Feature unlock definitions

All tables use STRICT mode for type safety.

## Constitution Principles

This project follows 7 architectural principles:

1. **Zero-Downtime Deployment**: All changes must be backward compatible
2. **Schema Evolution**: Only additive changes to database
3. **STRICT Tables**: All D1 tables use STRICT mode
4. **Index Verification**: All queries optimized with indexes
5. **Batch Operations**: Multiple operations in single transaction
6. **Error Context**: Structured error logging with context
7. **Rate Limiting**: Token bucket for all write operations

## Contributing

1. Follow the constitution principles
2. Write tests for new features
3. Update documentation
4. Use conventional commits

## License

MIT

## Support

- GitHub Issues: <repo-url>/issues
- Documentation: [docs/](docs/)

---

**Built with Claude Code** 🤖
