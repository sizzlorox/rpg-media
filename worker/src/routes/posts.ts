// Posts routes: create, read, delete posts

import { Hono } from 'hono'
import { HonoEnv } from '../lib/types'
import { createDatabaseClient } from '../lib/db'
import { PostModel } from '../models/post'
import { UserModel } from '../models/user'
import { authMiddleware } from '../middleware/auth'
import { rateLimiter } from '../middleware/rate-limit'
import { sanitizeError } from '../lib/error-sanitizer'
import { CreatePostRequest } from '../../../shared/types'
import { getCharacterLimit, canAccessFeature, XP_VALUES, validateChannel } from '../lib/constants'
import { trackEvent } from '../lib/logger'
import { ContentModerationService } from '../services/content-moderation'

const posts = new Hono<HonoEnv>()

// POST /api/posts - Create new post
posts.post('/', authMiddleware, rateLimiter('post'), async (c) => {
  const userId = c.get('userId')
  const level = c.get('level')

  if (!userId || level === undefined) {
    return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)
  }

  try {
    const body = await c.req.json<CreatePostRequest>()
    const { content, media_url, is_pinned, channel: rawChannel } = body

    if (!content || content.trim().length === 0) {
      return c.json({ error: 'BadRequest', message: 'Content is required' }, 400)
    }

    let channel: string
    try {
      channel = validateChannel(rawChannel)
    } catch (e) {
      return c.json({ error: 'BadRequest', message: (e as Error).message }, 400)
    }

    // Check character limit based on level
    const charLimit = getCharacterLimit(level)
    if (content.length > charLimit) {
      return c.json({
        error: 'BadRequest',
        message: `Content exceeds character limit for your level. Maximum ${charLimit} characters.`,
      }, 400)
    }

    // Check media upload permission (level 3+)
    if (media_url && !canAccessFeature(level, 'image_uploads')) {
      return c.json({
        error: 'Forbidden',
        message: 'Image uploads unlock at level 3',
      }, 403)
    }

    // Check pinned posts permission (level 15+)
    if (is_pinned && !canAccessFeature(level, 'pinned_posts')) {
      return c.json({
        error: 'Forbidden',
        message: 'Pinned posts unlock at level 15',
      }, 403)
    }

    const db = createDatabaseClient(c.env)

    // Email verification gate — legacy users with email=null bypass; only block email set but unverified
    const emailCheck = await db.queryOne<{ email_verified: number; email: string | null }>(
      'SELECT email_verified, email FROM users WHERE id = ?', userId
    )
    if (emailCheck?.email && !emailCheck.email_verified) {
      return c.json({
        error: 'EmailNotVerified',
        message: 'Verify your email before posting. Use /settings verify-email.',
      }, 403)
    }

    const postModel = new PostModel(db)
    const userModel = new UserModel(db)

    // Moderate content before creating post
    const moderationService = new ContentModerationService(c.env, db.raw())
    const moderationResult = await moderationService.moderateText(content.trim())

    // Auto-reject if flagged as illegal content
    if (moderationResult.action === 'rejected') {
      trackEvent('post_rejected_moderation', {
        userId,
        categories: moderationResult.categories,
        confidenceScores: moderationResult.confidenceScores,
      })

      return c.json({
        error: 'ContentViolation',
        message: 'Your post contains content that violates our community guidelines.',
        categories: moderationResult.categories,
      }, 400)
    }

    // Create post (may be hidden if flagged for review)
    const postId = crypto.randomUUID()
    const isHidden = moderationResult.action === 'flagged' ? 1 : 0

    const post = await postModel.create({
      id: postId,
      user_id: userId,
      content: content.trim(),
      char_count: content.trim().length,
      media_url: media_url || null,
      is_pinned: is_pinned ? 1 : 0,
      is_hidden: isHidden,
      channel: channel as import('../../../shared/types').Channel,
    })

    // If flagged, create moderation flag for admin review
    if (moderationResult.action === 'flagged') {
      const severity = moderationResult.categories.includes('violence/graphic') ? 'high'
        : moderationResult.categories.includes('violence') ? 'medium'
        : 'low'

      await moderationService.createModerationFlag({
        contentType: 'post',
        contentId: postId,
        userId,
        flaggedReason: moderationResult.categories[0] || 'unknown',
        severity,
        evidenceData: {
          categories: moderationResult.categories,
          confidenceScores: moderationResult.confidenceScores,
          content_preview: content.trim().slice(0, 100),
        },
      })

      trackEvent('post_flagged_moderation', {
        userId,
        postId,
        categories: moderationResult.categories,
        severity,
      })
    }

    // Award XP using batch operation
    await db.batch([
      db.raw().prepare('UPDATE users SET total_xp = total_xp + ? WHERE id = ?')
        .bind(XP_VALUES.CREATE_POST, userId),
    ])

    // Get updated user to check for level up
    const updatedUser = await userModel.findById(userId)
    const leveledUp = updatedUser ? updatedUser.level > level : false

    // Track analytics event
    trackEvent('post_created', {
      userId,
      postId,
      charCount: post.char_count,
      hasMedia: !!media_url,
      xpAwarded: XP_VALUES.CREATE_POST,
      levelUp: leveledUp,
    })

    // Get enriched post with author details
    const enrichedPost = await postModel.getPostWithAuthor(postId, userId)

    return c.json({
      post: enrichedPost,
      xp_awarded: XP_VALUES.CREATE_POST,
      level_up: leveledUp,
    }, 201)
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({
      error: 'InternalServerError',
      message: sanitizeError(error, isDev),
    }, 500)
  }
})

// GET /api/posts/:id - Get post by ID
posts.get('/:id', async (c) => {
  const postId = c.req.param('id')
  const userId = c.get('userId') // Optional - for is_liked_by_user flag

  try {
    const db = createDatabaseClient(c.env)
    const postModel = new PostModel(db)

    const post = await postModel.getPostWithAuthor(postId, userId)

    if (!post) {
      return c.json({ error: 'NotFound', message: 'Post not found' }, 404)
    }

    // Get comments for this post
    const comments = await db.query(
      `SELECT c.*, u.username, u.level, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      postId
    )

    return c.json({
      post,
      comments,
    })
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({
      error: 'InternalServerError',
      message: sanitizeError(error, isDev),
    }, 500)
  }
})

// DELETE /api/posts/:id - Delete own post
posts.delete('/:id', authMiddleware, async (c) => {
  const postId = c.req.param('id')
  const userId = c.get('userId')

  if (!userId) {
    return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)
  }

  try {
    const db = createDatabaseClient(c.env)
    const postModel = new PostModel(db)

    // Check if post exists and belongs to user
    const post = await postModel.findById(postId)

    if (!post) {
      return c.json({ error: 'NotFound', message: 'Post not found' }, 404)
    }

    if (post.user_id !== userId) {
      return c.json({ error: 'Forbidden', message: 'Cannot delete another user\'s post' }, 403)
    }

    // Delete post (XP earned remains per FR-019)
    await postModel.delete(postId)

    trackEvent('post_deleted', { userId, postId })

    return c.body(null, 204)
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({
      error: 'InternalServerError',
      message: sanitizeError(error, isDev),
    }, 500)
  }
})

export default posts
