# Image Upload Feature - Testing Guide

## Quick Start: Testing Image Uploads

Since image uploads are level-gated, you'll need to level up a test user before testing.

### Step 1: Create a Test User

Open the browser at http://localhost:5173/ and register:

```
> /register testuser password123
✓ Account created: testuser
You are now logged in!
```

### Step 2: Level Up the User

**Option A: Use the helper script** (recommended)
```bash
cd worker
./scripts/level-up-user.sh testuser 8
```

**Option B: Manual SQL command**
```bash
cd worker
wrangler d1 execute rpg-social-media-production --local \
  --command "UPDATE users SET level = 8, total_xp = 1000 WHERE username = 'testuser'"
```

### Step 3: Refresh Your Session

In the browser, check your new level:
```
> /profile
```

You should now see **Level: 8** in your character sheet!

---

## Testing Image Upload Features

### 1. Test Post Image Upload (Level 3+)

```
> /post Check out this awesome screenshot --attach
```

**Expected flow:**
1. Native file picker opens
2. Select an image file (JPEG, PNG, GIF, or WebP, ≤5MB)
3. Terminal displays:
   ```
   [SYSTEM] Selected: screenshot.png (2.3 MB)
   [SYSTEM] Uploading...
   [████████░░] 80%
   ✓ Upload complete!
   ✓ Post created with image!
   +10 XP
   ```
4. View the post in feed:
   ```
   > /feed
   ```
5. Image should display with ASCII frame:
   ```
   ╔══════════════════════════════════╗
   ║ [IMG:https://....:Post image]    ║
   ╚══════════════════════════════════╝
   ```

### 2. Test Avatar Upload (Level 7+)

```
> /avatar
```

**Expected flow:**
1. File picker opens
2. Select avatar image
3. Terminal displays upload progress
4. Success message: "✓ Avatar updated!"
5. View your profile:
   ```
   > /profile
   ```
6. Avatar should display in character sheet

### 3. Test Banner Upload (Level 7+)

```
> /banner
```

Similar flow to avatar upload.

---

## Validation Testing

### Test File Type Validation

```
> /post Test post --attach
# Select a .txt or .pdf file
Expected: ✗ Invalid file type. Supported: JPEG, PNG, GIF, WebP
```

### Test File Size Validation

```
> /post Test post --attach
# Select a file > 5 MB
Expected: ✗ File too large. Maximum size: 5 MB (yours: X.X MB)
```

### Test Dimension Validation

```
> /post Test post --attach
# Select an image > 4096x4096 pixels
Expected: ✗ Image dimensions too large. Maximum: 4096x4096 (yours: 5000x5000)
```

### Test Level Gating

Create a new user at level 1:
```
> /register newuser password123
> /post Test --attach
Expected: ✗ Image uploads unlock at level 3
          You need X more XP to level up
```

---

## Quick Reference: Level Requirements

| Feature | Level Required | Command |
|---------|---------------|---------|
| Post images | Level 3+ | `/post <content> --attach` |
| Avatar upload | Level 7+ | `/avatar` |
| Banner upload | Level 7+ | `/banner` |

---

## Leveling Up Users for Testing

### Helper Script
```bash
cd worker
./scripts/level-up-user.sh <username> <level>

# Examples:
./scripts/level-up-user.sh testuser 3   # Can upload post images
./scripts/level-up-user.sh testuser 8   # Can upload everything
```

### Manual SQL Commands

**Level up to 3 (post images):**
```bash
wrangler d1 execute rpg-social-media-production --local \
  --command "UPDATE users SET level = 3, total_xp = 150 WHERE username = 'testuser'"
```

**Level up to 8 (all features):**
```bash
wrangler d1 execute rpg-social-media-production --local \
  --command "UPDATE users SET level = 8, total_xp = 1000 WHERE username = 'testuser'"
```

**Check user's current level:**
```bash
wrangler d1 execute rpg-social-media-production --local \
  --command "SELECT username, level, total_xp FROM users WHERE username = 'testuser'"
```

---

## Troubleshooting

### "File picker not initialized"
- Refresh the page and try again
- Check browser console for errors

### Upload hangs at 0%
- Check that backend server is running (http://localhost:8787/)
- Check browser network tab for failed requests
- Verify R2 bucket is configured in wrangler dev

### "✗ Upload failed"
- Check file size (must be ≤ 5MB)
- Check file type (JPEG, PNG, GIF, WebP only)
- Check browser console for detailed error

### Level not updating in UI
- Run `/profile` to refresh your character sheet
- Or logout and login again:
  ```
  > /logout
  > /login testuser password123
  ```

---

## Current Test User

**Username:** testuser3
**Level:** 8
**Total XP:** 1000
**Password:** password123

This user can test all image upload features!

---

## Backend API Endpoints

For debugging, you can also test the API directly:

### Get presigned upload URL
```bash
# First, login to get auth cookie
curl -c /tmp/cookies.txt -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser3","password":"password123"}'

# Request upload URL
curl -b /tmp/cookies.txt -X POST http://localhost:8787/api/media/upload-url \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","contentType":"image/jpeg"}'
```

Expected response:
```json
{
  "upload_url": "https://...",
  "public_url": "https://...",
  "key": "...",
  "expires_in": 3600
}
```
