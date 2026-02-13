# Production Deployment Guide

Complete guide for deploying the RPG Social Media Platform to Cloudflare.

## Prerequisites

- Cloudflare account (Workers Paid plan recommended)
- Domain name (optional, but recommended)
- Wrangler CLI installed: `npm install -g wrangler`
- Access to Sentry (optional, for error tracking)

## Pre-Deployment Checklist

- [ ] Cloudflare account verified
- [ ] Workers Paid plan activated (for better limits)
- [ ] Domain connected to Cloudflare (optional)
- [ ] Sentry project created (optional)
- [ ] Environment variables documented

## Step 1: Cloudflare Resources Setup

### 1.1 Create D1 Database (Production)

```bash
cd worker
wrangler d1 create rpg-social-media-production
```

**Output Example**:
```
✅ Successfully created DB 'rpg-social-media-production'!

[[d1_databases]]
binding = "DB"
database_name = "rpg-social-media-production"
database_id = "12345678-1234-1234-1234-123456789012"
```

Copy the `database_id` and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "rpg-social-media-production"
database_id = "YOUR_DATABASE_ID_HERE"
```

### 1.2 Create R2 Bucket

```bash
wrangler r2 bucket create rpg-media-uploads-production
```

Update `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "rpg-media-uploads-production"
```

### 1.3 Create KV Namespace (Rate Limiting)

```bash
wrangler kv namespace create RATE_LIMIT_KV
```

**Important**: The command is `kv namespace` (with space), not `kv:namespace`.

This will output something like:

```
✅ Successfully created KV namespace RATE_LIMIT_KV

Add the following to your wrangler.toml:
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "12345678901234567890123456789012"
```

Update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "YOUR_KV_ID_HERE"
```

## Step 2: Environment Variables

### 2.1 JWT Secret (REQUIRED)

Generate a secure random string (32+ characters):

```bash
# Generate secure secret
openssl rand -base64 32

# Set in Cloudflare
wrangler secret put JWT_SECRET --env production
# Paste the generated secret
```

### 2.2 Sentry DSN (Optional but Recommended)

1. Create project at sentry.io
2. Copy DSN from project settings
3. Set in Cloudflare:

```bash
wrangler secret put SENTRY_DSN --env production
# Paste your Sentry DSN (e.g., https://xxx@xxx.ingest.sentry.io/xxx)
```

### 2.3 Public URL (Optional)

Set your production domain:

```bash
wrangler secret put PUBLIC_URL --env production
# e.g., https://rpg-social.example.com
```

### 2.4 Environment Name

```bash
wrangler secret put ENVIRONMENT --env production
# Enter: production
```

## Step 3: Database Migrations

**CRITICAL**: Always backup before running migrations in production.

### 3.1 Initial Schema

```bash
cd worker

# Run initial schema
wrangler d1 execute rpg-social-media-production \
  --file=migrations/001_initial_schema.sql \
  --env production
```

### 3.2 Add Indexes

```bash
wrangler d1 execute rpg-social-media-production \
  --file=migrations/002_add_indexes.sql \
  --env production
```

### 3.3 Verify Migrations

```bash
# List tables
wrangler d1 execute rpg-social-media-production \
  --command="SELECT name FROM sqlite_master WHERE type='table'" \
  --env production

# Verify level thresholds
wrangler d1 execute rpg-social-media-production \
  --command="SELECT level, xp_required, features_unlocked FROM level_thresholds ORDER BY level"
```

**Expected Tables**:
- users
- posts
- likes
- comments
- follows
- level_thresholds

## Step 4: Deploy Worker (Backend)

### 4.1 Build and Deploy

```bash
cd worker

# Deploy to production
wrangler deploy --env production
```

**Output Example**:
```
✨ Built successfully!
🌍 Deploying to Cloudflare Workers...
✨ Deployment complete!

https://rpg-social-media.YOUR_SUBDOMAIN.workers.dev
```

### 4.2 Verify Deployment

Test health endpoint:

```bash
curl https://rpg-social-media.YOUR_SUBDOMAIN.workers.dev/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": 1234567890123
}
```

### 4.3 Custom Domain (Optional)

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your worker
3. Click "Triggers" tab
4. Add Custom Domain → Enter your domain (e.g., api.rpg-social.example.com)
5. Wait for DNS propagation (~5 minutes)

## Step 5: Deploy Frontend (Cloudflare Pages)

### 5.1 Build Frontend

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build
```

### 5.2 Deploy to Cloudflare Pages

**Option A: Wrangler**

```bash
cd frontend

# Deploy to Pages
wrangler pages deploy dist --project-name=rpg-social-media
```

**Option B: Dashboard (Recommended for first-time)**

1. Go to Cloudflare Dashboard → Pages
2. Click "Create a project"
3. Connect Git repository
4. Configure build:
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/`
5. Add environment variables:
   - `VITE_API_URL`: Your worker URL (e.g., https://api.rpg-social.example.com)
6. Click "Save and Deploy"

### 5.3 Configure Environment Variables (Pages)

In Cloudflare Pages project settings:

```
VITE_API_URL=https://YOUR_WORKER_URL
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx (optional)
```

### 5.4 Custom Domain (Pages)

1. Go to Pages project → Custom domains
2. Add domain (e.g., rpg-social.example.com)
3. Update DNS records as instructed
4. Wait for SSL certificate provisioning (~15 minutes)

## Step 6: Cloudflare Web Analytics

### 6.1 Enable Analytics

1. Go to Cloudflare Dashboard → Analytics & Logs → Web Analytics
2. Create new site
3. Copy the JavaScript snippet
4. Add to `frontend/index.html` before `</head>`:

```html
<!-- Cloudflare Web Analytics -->
<script defer src='https://static.cloudflareinsights.com/beacon.min.js'
        data-cf-beacon='{"token": "YOUR_TOKEN_HERE"}'></script>
```

### 6.2 Rebuild and Deploy

```bash
cd frontend
npm run build
wrangler pages deploy dist --project-name=rpg-social-media
```

## Step 7: Post-Deployment Verification

### 7.1 Smoke Tests

```bash
# Register user
curl -X POST https://YOUR_DOMAIN/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'

# Login
curl -X POST https://YOUR_DOMAIN/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}' \
  -c cookies.txt

# Create post
curl -X POST https://YOUR_DOMAIN/api/posts \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"content":"Hello World! Testing the RPG social platform."}'

# Get feed
curl https://YOUR_DOMAIN/api/feed/discover
```

### 7.2 Test Terminal Interface

1. Open https://YOUR_DOMAIN in browser
2. Run `/register testuser password123`
3. Run `/post Hello RPG social media!`
4. Verify XP award notification
5. Run `/profile` to check character sheet

### 7.3 Monitor Errors

Check Sentry for any errors:
1. Go to sentry.io
2. Select your project
3. Monitor for exceptions

## Step 8: Database Backup Strategy

### 8.1 Manual Backup

```bash
# Export database to SQL
wrangler d1 export rpg-social-media-production \
  --output=backup-$(date +%Y%m%d).sql \
  --env production
```

### 8.2 Automated Backups (Recommended)

Set up a GitHub Action or Cloudflare Worker cron to run daily backups:

```yaml
# .github/workflows/backup.yml
name: Database Backup
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g wrangler
      - run: wrangler d1 export rpg-social-media-production --output=backup.sql
      - uses: actions/upload-artifact@v3
        with:
          name: db-backup
          path: backup.sql
          retention-days: 30
```

## Step 9: Monitoring & Observability

### 9.1 Cloudflare Analytics

Monitor these metrics:
- **Requests/second**: Normal load baseline
- **Error rate**: Should be <1%
- **P95 response time**: Should be <200ms
- **Cache hit rate**: Aim for >80% for static assets

### 9.2 Sentry Alerts

Configure alerts for:
- Error rate > 5% in 5 minutes
- Slow transaction (>1s) threshold exceeded
- New error types

### 9.3 D1 Limits Monitoring

Workers Paid plan limits:
- **Reads**: 50M per day
- **Writes**: 50M per day
- **Storage**: 10 GB per database

Monitor via Cloudflare Dashboard → D1 → Usage.

## Step 10: Rollback Procedures

### 10.1 Worker Rollback

```bash
# List deployments
wrangler deployments list --env production

# Rollback to specific deployment
wrangler rollback --env production --message="Rolling back due to issue"
```

### 10.2 Database Rollback

```bash
# Restore from backup
wrangler d1 execute rpg-social-media-production \
  --file=backup-YYYYMMDD.sql \
  --env production
```

**⚠️ WARNING**: Database rollbacks are destructive. Always backup first.

### 10.3 Frontend Rollback (Pages)

1. Go to Cloudflare Pages → Deployments
2. Find previous working deployment
3. Click "···" → "Retry deployment"

## Troubleshooting

### Issue: 500 errors after deployment

**Solution**:
1. Check Sentry for error details
2. Verify environment variables: `wrangler secret list --env production`
3. Check D1 migrations completed
4. Review Worker logs: `wrangler tail --env production`

### Issue: "Database not found"

**Solution**:
1. Verify D1 database_id in wrangler.toml
2. Ensure migrations ran successfully
3. Check binding name matches code (`DB`)

### Issue: Rate limiting not working

**Solution**:
1. Verify KV namespace ID in wrangler.toml
2. Check binding name matches code (`RATE_LIMIT_KV`)
3. Ensure KV namespace is in same account
4. Verify KV namespace was created with: `wrangler kv namespace list`

### Issue: Images not uploading

**Solution**:
1. Verify R2 bucket created
2. Check bucket binding in wrangler.toml (`MEDIA_BUCKET`)
3. Ensure user level >= 3
4. Check Worker has R2 permissions

## Security Checklist

- [ ] JWT_SECRET is cryptographically random (32+ bytes)
- [ ] All secrets stored in Cloudflare, not in code
- [ ] HTTPS enforced (automatic with Cloudflare)
- [ ] Rate limiting configured and tested
- [ ] Sentry configured for error tracking
- [ ] No sensitive data in logs
- [ ] Database uses STRICT mode
- [ ] SQL injection protection (prepared statements)
- [ ] XSS prevention (React escaping)
- [ ] CORS configured correctly

## Performance Tuning

### Worker Optimization

- Enable Smart Placement: Auto-routes requests to optimal data center
- Use Cache API for discovery feed (5-minute TTL)
- Implement conditional requests (ETag headers)

### D1 Optimization

- All queries use indexes (verify with EXPLAIN QUERY PLAN)
- Batch operations for multiple writes
- Limit result sets with LIMIT/OFFSET
- Use covering indexes where possible

### Frontend Optimization

- Vite code splitting enabled
- xterm.js lazy loaded
- Images optimized and lazy loaded
- Service worker for offline support (future enhancement)

## Maintenance

### Weekly Tasks

- Review Sentry errors
- Check Cloudflare Analytics
- Monitor D1 storage usage
- Review rate limit violations

### Monthly Tasks

- Backup database manually
- Review and optimize slow queries
- Update dependencies
- Security audit

### Quarterly Tasks

- Review Cloudflare plan limits
- Analyze user engagement metrics
- Plan feature enhancements
- Conduct load testing

## Support

- **Documentation**: [README.md](../README.md)
- **Issues**: GitHub Issues
- **Cloudflare Docs**: https://developers.cloudflare.com/
- **Sentry Docs**: https://docs.sentry.io/

---

**Deployment Checklist Summary**:
✅ D1 database created and migrated
✅ R2 bucket created
✅ KV namespace created
✅ Environment variables configured
✅ Worker deployed and tested
✅ Frontend deployed to Pages
✅ Custom domains configured
✅ Analytics enabled
✅ Monitoring configured
✅ Backup strategy implemented

**You're ready to launch!** 🚀
