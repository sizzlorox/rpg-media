# API Endpoints Audit - Frontend to Backend Mapping

## Summary
✅ **All endpoints are correctly configured**

All frontend API calls use relative paths that are automatically prefixed with `/api` by the API client.

---

## API Client Configuration

**Base URL:** `/api` (from `frontend/src/services/api-client.ts`)

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
```

**URL Construction:**
```typescript
const url = `${this.baseURL}${endpoint}`
// Example: '/api' + '/posts' = '/api/posts'
```

---

## Endpoint Mapping

### Authentication Endpoints ✅
| Frontend Call | Full Path | Backend Route | Status |
|--------------|-----------|---------------|--------|
| `apiClient.get('/auth/me')` | `/api/auth/me` | `GET /api/auth/me` | ✅ Correct |
| `apiClient.post('/auth/login', ...)` | `/api/auth/login` | `POST /api/auth/login` | ✅ Correct |
| `apiClient.post('/auth/register', ...)` | `/api/auth/register` | `POST /api/auth/register` | ✅ Correct |
| `apiClient.post('/auth/logout')` | `/api/auth/logout` | `POST /api/auth/logout` | ✅ Correct |

### Posts Endpoints ✅
| Frontend Call | Full Path | Backend Route | Status |
|--------------|-----------|---------------|--------|
| `apiClient.post('/posts', ...)` | `/api/posts` | `POST /api/posts` | ✅ Correct |
| `apiClient.get('/posts/${id}')` | `/api/posts/${id}` | `GET /api/posts/:id` | ✅ Correct |
| `apiClient.post('/posts/${id}/like', ...)` | `/api/posts/${id}/like` | `POST /api/posts/:id/like` | ✅ Correct |
| `apiClient.post('/posts/${id}/comments', ...)` | `/api/posts/${id}/comments` | `POST /api/posts/:id/comments` | ✅ Correct |
| `apiClient.get('/posts/${id}/comments?page=...')` | `/api/posts/${id}/comments` | `GET /api/posts/:id/comments` | ✅ Correct |

### Feed Endpoints ✅
| Frontend Call | Full Path | Backend Route | Status |
|--------------|-----------|---------------|--------|
| `apiClient.get('/feed/home?limit=...')` | `/api/feed/home` | `GET /api/feed/home` | ✅ Correct |
| `apiClient.get('/feed/discover?limit=...')` | `/api/feed/discover` | `GET /api/feed/discover` | ✅ Correct |

### User Endpoints ✅
| Frontend Call | Full Path | Backend Route | Status |
|--------------|-----------|---------------|--------|
| `apiClient.get('/users/${username}')` | `/api/users/${username}` | `GET /api/users/:username` | ✅ Correct |
| `apiClient.post('/users/${username}/follow', ...)` | `/api/users/${username}/follow` | `POST /api/users/:username/follow` | ✅ Correct |
| `apiClient.delete('/users/${username}/follow')` | `/api/users/${username}/follow` | `DELETE /api/users/:username/follow` | ✅ Correct |
| `apiClient.patch('/auth/me', ...)` | `/api/auth/me` | `PATCH /api/auth/me` | ✅ Correct |

### XP & Levels Endpoints ✅
| Frontend Call | Full Path | Backend Route | Status |
|--------------|-----------|---------------|--------|
| `apiClient.get('/xp/progress')` | `/api/xp/progress` | `GET /api/xp/progress` | ✅ Correct |
| `apiClient.get('/xp/breakdown')` | `/api/xp/breakdown` | `GET /api/xp/breakdown` | ✅ Correct |
| `apiClient.get('/levels/thresholds')` | `/api/levels/thresholds` | `GET /api/levels/thresholds` | ✅ Correct |

### Media Endpoints ✅
| Frontend Call | Full Path | Backend Route | Status |
|--------------|-----------|---------------|--------|
| `apiClient.post('/media/upload-url', ...)` | `/api/media/upload-url` | `POST /api/media/upload-url` | ✅ Correct |

---

## Vite Proxy Configuration

**File:** `frontend/vite.config.ts`

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:8787',
      changeOrigin: true,
    },
  },
}
```

**How it works:**
1. Frontend runs on `http://localhost:5173`
2. API calls to `/api/*` are proxied to `http://localhost:8787/api/*`
3. This avoids CORS issues in development

---

## Worker Route Configuration

**File:** `worker/src/index.ts`

```typescript
app.route('/api/auth', authRoutes)
app.route('/api/posts', postsRoutes)
app.route('/api/users', usersRoutes)
app.route('/api/feed', feedRoutes)
app.route('/api', interactionsRoutes)
app.route('/api/xp', xpRoutes)
app.route('/api/levels', levelsRoutes)
app.route('/api/media', mediaRoutes)  // ✅ Media routes registered
```

---

## Upload Error Investigation

The upload error `"✗ Upload failed: Unknown error"` is **NOT** caused by incorrect endpoint paths.

**Evidence:**
- No request to `/api/media/upload-url` appears in worker logs
- Error occurs on frontend before backend is reached
- All endpoint paths are correctly configured

**Next Steps:**
1. Check browser console for actual error (added `console.error` to log details)
2. Verify file validation is passing
3. Check if there's a network error or CORS issue specific to the upload

---

## Verification Commands

### Test endpoint accessibility:
```bash
# Auth endpoint
curl http://localhost:8787/api/auth/me

# Media upload endpoint (requires auth)
curl -X POST http://localhost:8787/api/media/upload-url \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","contentType":"image/jpeg"}'
# Should return 401 Unauthorized (expected - needs auth)
```

### Check Vite proxy:
```bash
# From browser (logged in), check network tab for:
# Request URL: http://localhost:5173/api/media/upload-url
# Should proxy to: http://localhost:8787/api/media/upload-url
```

---

## Conclusion

✅ All API endpoints are correctly mapped
✅ Base URL configuration is correct
✅ Vite proxy is configured properly
✅ Worker routes are registered correctly

The upload error is not an endpoint path issue. Check browser console for the actual error details.
