# Terminal Commands Reference

Complete reference for all terminal commands in the RPG Social Media Platform.

## Command Format

Commands follow this format:
```
/command [required_arg] <optional_arg>
```

- `[arg]` = Required argument
- `<arg>` = Optional argument

## Account Management

### `/register`

Create a new account.

**Usage**: `/register [username] [password]`

**Example**:
```bash
> /register adventurer mysecurepass123
✓ Account created: adventurer
```

**Requirements**:
- Username must be unique
- Username: 3-20 characters, alphanumeric + underscore
- Password: minimum 8 characters

**XP Earned**: 0 XP (initial level 1)

---

### `/login`

Login to your account.

**Usage**: `/login [username] [password]`

**Example**:
```bash
> /login adventurer mysecurepass123
✓ Logged in as adventurer
```

**Notes**:
- Session persists in cookies
- Multiple sessions supported

---

## Content Creation

### `/post`

Create a new post.

**Usage**: `/post [content]`

**Example**:
```bash
> /post Just leveled up! This RPG social media is amazing!
✓ Post created!
+10 XP
```

**Character Limits**:
- Level 1-4: 280 characters
- Level 5-9: 500 characters
- Level 10+: 1000 characters

**XP Earned**: +10 XP

**Rate Limit**: 10 posts per hour

**Error Messages**:
- `Content exceeds character limit for your level. Maximum X characters.`
- `You must be logged in to post`
- `Content is required`

---

## Social Interactions

### `/like`

Like a post.

**Usage**: `/like [post_id]`

**Example**:
```bash
> /like a3b5c7d9
✓ Post liked!
+1 XP (you), +2 XP (creator)

╔════════════════════════════════════════════════════════════╗
║                    LEVEL UP! You are now Level 3           ║
║                                                            ║
║            ★ New Features Unlocked ★                       ║
║              ✓ Image uploads enabled                       ║
╚════════════════════════════════════════════════════════════╝
```

**XP Earned**:
- +1 XP for you (liker)
- +2 XP for post creator

**Rate Limit**: 50 likes per hour

**Error Messages**:
- `Post not found`
- `Post already liked`
- `Cannot like your own post`

**Notes**:
- Liking is idempotent (can't like twice)
- XP is awarded even if you unlike later
- Level-up animation shows newly unlocked features

---

### `/comment`

Comment on a post.

**Usage**: `/comment [post_id] [content]`

**Example**:
```bash
> /comment a3b5c7d9 Great post! I totally agree with this.
✓ Comment posted!
+5 XP (you), +3 XP (creator)
```

**Character Limit**: 500 characters max

**XP Earned**:
- +5 XP for you (commenter)
- +3 XP for post creator (if different user)

**Rate Limit**: 20 comments per hour

**Error Messages**:
- `Post not found`
- `Comment content is required`
- `Comment exceeds 500 character limit`

---

### `/follow`

Follow a user.

**Usage**: `/follow [username]`

**Example**:
```bash
> /follow warrior_knight
✓ Now following @warrior_knight!
They received +5 XP
```

**XP Earned**:
- 0 XP for you
- +5 XP for the user being followed

**Error Messages**:
- `User not found`
- `Cannot follow yourself`
- `Already following this user`

**Notes**:
- Following affects your home feed
- Followed users' posts appear in `/feed`

---

### `/unfollow`

Unfollow a user.

**Usage**: `/unfollow [username]`

**Example**:
```bash
> /unfollow warrior_knight
✓ Unfollowed @warrior_knight
```

**XP Earned**: 0 XP (no penalty)

**Error Messages**:
- `User not found`
- `Not following this user`

---

## Content Discovery

### `/feed`

View your personalized home feed.

**Usage**: `/feed`

**Example**:
```bash
> /feed
═══════════════════════════════════════════════════════════
Welcome to RPG Social Media!
Level 5 █████████░░░░░░░░░░░░░░░░░░░░ 2500/10000 XP
═══════════════════════════════════════════════════════════

Showing 10 posts:

@warrior_knight [Lvl 8] • 2h ago
ID: a3b5c7d9
Just defeated the final boss! Best feeling ever!

❤ 42 likes  💬 15 comments
/like a3b5c7d9  |  /comment a3b5c7d9 <text>
────────────────────────────────────────────────────────────
```

**Behavior**:
- **Logged in**: Shows posts from users you follow
- **Not logged in**: Shows discovery feed (popular posts)
- Posts ordered by recency (newest first)

**Notes**:
- If you're not following anyone, shows empty feed with tip
- Discovery feed uses popularity algorithm
- XP bar shows at top when logged in

---

## Profile & Stats

### `/profile`

View your or another user's character sheet.

**Usage**: `/profile <username>`

**Example**:
```bash
> /profile
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║                        CHARACTER SHEET                           ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  Name: @adventurer                                               ║
║  Level: 5                                                        ║
║  XP: Level 5 ███████████░░░░░░░░ 2500/10000 XP                  ║
║                                                                  ║
║  STATS                                                           ║
║─────────────────────────────────────────────────────────────────║
║    Posts Created              42                                ║
║    Likes Given               156                                ║
║    Likes Received             98                                ║
║    Comments Made              34                                ║
║    Followers                  23                                ║
║    Following                  18                                ║
║                                                                  ║
║  Member Since: 2026-02-10                                        ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

**Notes**:
- Omit username to view your own profile
- Public information (anyone can view)
- Stats calculated in real-time

---

## Progression

### `/levels`

View level thresholds and XP requirements.

**Usage**: `/levels`

**Example**:
```bash
> /levels
Level Progression Table
════════════════════════════════════════════════════════════

Level | XP Required | Feature Unlocked
────────────────────────────────────────────────────────────
1     | 100         | Basic posting (280 chars), Liking, Commenting, Following
2     | 400         | -
3     | 900         | Image uploads
4     | 1600        | -
5     | 2500        | Extended posts (500 chars)
7     | 4900        | Profile customization, Avatar/Banner
10    | 10000       | Advanced posts (1000 chars), Custom themes
15    | 22500       | Pinned posts

Earn XP by: Posting (+10), Liking (+1), Commenting (+5), Being Followed (+5)
```

**Notes**:
- Shows all levels and their XP requirements
- Level formula: `floor(sqrt(total_XP / 100))`
- Major unlocks highlighted

---

### `/unlocks`

View feature unlock roadmap with progress.

**Usage**: `/unlocks`

**Example**:
```bash
> /unlocks
══════════════════════════════════════════════════════════════════
FEATURE UNLOCK ROADMAP
══════════════════════════════════════════════════════════════════

Level 1 ✓
──────────────────────────────────────────────────────────────────
  ✓ Basic posting (280 chars)
  ✓ Liking posts
  ✓ Commenting
  ✓ Following users

Level 3 ✓
──────────────────────────────────────────────────────────────────
  ✓ Image uploads in posts

Level 5 (CURRENT)
──────────────────────────────────────────────────────────────────
  ✓ Extended posts (500 chars)

Level 7
──────────────────────────────────────────────────────────────────
  ⏳ Profile customization
  ⏳ Avatar upload
  ⏳ Banner upload

Progress:
██████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 60%

Next unlock at Level 7 (4900 XP):
  • Profile customization
  • Avatar upload
  • Banner upload
```

**Notes**:
- Shows your current progress
- Highlights next unlock
- Visual progress bar

---

## Utility

### `/help`

Show all available commands.

**Usage**: `/help`

**Example**:
```bash
> /help
Available commands:
  /register <username> <password>  - Create account
  /login <username> <password>     - Login
  /post <content>                  - Create post
  /feed                            - View feed
  /like <post_id>                  - Like post
  /comment <post_id> <text>        - Comment
  /follow <username>               - Follow user
  /unfollow <username>             - Unfollow user
  /profile [username]              - View character sheet
  /levels                          - View level progression
  /unlocks                         - View feature roadmap
  /help                            - Show this help
  /clear                           - Clear terminal
```

---

### `/clear`

Clear the terminal screen.

**Usage**: `/clear`

**Example**:
```bash
> /clear
[Terminal cleared]
```

**Notes**:
- Clears all output
- Useful for decluttering

---

## Tips & Tricks

### Efficient XP Farming

1. **Post regularly**: +10 XP each (limit: 10/hour)
2. **Engage with others**: Comment for +5 XP
3. **Be helpful**: Quality comments get more engagement
4. **Follow active users**: +5 XP to them, builds relationships

### Best Practices

- **Use descriptive post IDs**: Copy the 8-character ID shown in feed
- **Check your level often**: Run `/profile` to track progress
- **Plan feature unlocks**: Use `/unlocks` to see next goals
- **Be active**: Consistent engagement earns more XP

### Command Shortcuts

You can reference post IDs by their first 8 characters shown in the feed:

```bash
# Full ID: a3b5c7d9-e2f4-4a6b-8c0d-1e3f5g7h9i0j
# Short ID shown: a3b5c7d9

> /like a3b5c7d9
> /comment a3b5c7d9 Nice post!
```

### Rate Limit Strategy

Optimize your XP earning within rate limits:

```
Hour 1:
- 10 posts = 100 XP
- 50 likes = 50 XP
- 20 comments = 100 XP
Total: 250 XP/hour max
```

---

## Error Messages

### Common Errors

| Error | Meaning | Solution |
|-------|---------|----------|
| `Unauthorized` | Not logged in | Run `/login` first |
| `NotFound` | Resource doesn't exist | Check ID is correct |
| `BadRequest` | Invalid input | Check command syntax |
| `Forbidden` | Feature locked | Check level requirement |
| `RateLimitExceeded` | Too many requests | Wait before retrying |

### Troubleshooting

**Terminal not responding?**
- Refresh the page
- Check browser console for errors

**Commands not working?**
- Ensure you're logged in
- Check command syntax with `/help`
- Verify you have the required level

**XP not updating?**
- Run `/profile` to refresh
- Check rate limits haven't been exceeded

---

## Advanced Usage

### Bulk Operations

While there's no bulk command, you can script interactions:

```bash
# Like multiple posts
/like abc12345
/like def67890
/like ghi11121

# Comment on multiple posts
/comment abc12345 Great post!
/comment def67890 I agree!
```

### Session Management

- Login persists across page refreshes
- Cookies expire after 7 days
- Run `/login` again to refresh session

---

## Command History

The terminal supports command history:
- **Up Arrow**: Previous command
- **Down Arrow**: Next command
- **Tab**: (Future) Auto-complete

---

**Need more help?** Check [README.md](../README.md) or create an issue on GitHub.
