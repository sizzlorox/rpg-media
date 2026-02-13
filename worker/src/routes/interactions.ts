// Interactions routes: likes, comments, follows

import { Hono } from 'hono'
import { HonoEnv } from '../lib/types'
import { createDatabaseClient } from '../lib/db'
import { LikeModel, CommentModel, FollowModel } from '../models/interaction'
import { PostModel } from '../models/post'
import { UserModel } from '../models/user'
import { XPService } from '../services/xp-service'
import { authMiddleware } from '../middleware/auth'
import { rateLimiter } from '../middleware/rate-limit'
import { XP_VALUES } from '../lib/constants'
import { trackEvent } from '../lib/logger'

const interactions = new Hono<HonoEnv>()

// POST /api/posts/:id/like - Like a post
interactions.post('/posts/:id/like', authMiddleware, rateLimiter('like'), async (c) => {
  const postId = c.req.param('id')
  const userId = c.get('userId')

  if (!userId) {
    return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)
  }

  try {
    const db = createDatabaseClient(c.env)
    const likeModel = new LikeModel(db)
    const postModel = new PostModel(db)
    const xpService = new XPService(db)

    // Check if post exists
    const post = await postModel.findById(postId)
    if (!post) {
      return c.json({ error: 'NotFound', message: 'Post not found' }, 404)
    }

    // Check if already liked
    const alreadyLiked = await likeModel.hasLiked(userId, postId)
    if (alreadyLiked) {
      return c.json({ error: 'BadRequest', message: 'Post already liked' }, 400)
    }

    // Cannot like own post
    if (post.user_id === userId) {
      return c.json({ error: 'BadRequest', message: 'Cannot like your own post' }, 400)
    }

    // Create like (use full post ID from database result)
    const likeId = crypto.randomUUID()
    await likeModel.create({
      id: likeId,
      user_id: userId,
      post_id: post.id,
    })

    // Award XP in batch: +1 to liker, +2 to post creator
    const xpAwards = await xpService.awardXPBatch([
      { userId, amount: XP_VALUES.LIKE_POST_EARNER, reason: 'liked_post' },
      { userId: post.user_id, amount: XP_VALUES.LIKE_POST_CREATOR, reason: 'post_liked' },
    ])

    // Track analytics
    trackEvent('post_liked', {
      userId,
      postId,
      postAuthorId: post.user_id,
      likerLevelUp: xpAwards.get(userId),
      creatorLevelUp: xpAwards.get(post.user_id),
    })

    return c.json({
      success: true,
      xp_awarded: {
        liker: XP_VALUES.LIKE_POST_EARNER,
        creator: XP_VALUES.LIKE_POST_CREATOR,
      },
      level_up: {
        liker: xpAwards.get(userId) || false,
        creator: xpAwards.get(post.user_id) || false,
      },
    }, 201)
  } catch (error) {
    return c.json({
      error: 'InternalServerError',
      message: (error as Error).message,
    }, 500)
  }
})

// DELETE /api/posts/:id/like - Unlike a post
interactions.delete('/posts/:id/like', authMiddleware, async (c) => {
  const postId = c.req.param('id')
  const userId = c.get('userId')

  if (!userId) {
    return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)
  }

  try {
    const db = createDatabaseClient(c.env)
    const likeModel = new LikeModel(db)

    // Check if liked
    const hasLiked = await likeModel.hasLiked(userId, postId)
    if (!hasLiked) {
      return c.json({ error: 'BadRequest', message: 'Post not liked' }, 400)
    }

    // Delete like (no XP deduction per FR-019)
    await likeModel.delete(userId, postId)

    // Track analytics
    trackEvent('post_unliked', { userId, postId })

    return c.body(null, 204)
  } catch (error) {
    return c.json({
      error: 'InternalServerError',
      message: (error as Error).message,
    }, 500)
  }
})

// POST /api/posts/:id/comments - Add comment to post
interactions.post('/posts/:id/comments', authMiddleware, rateLimiter('comment'), async (c) => {
  const postId = c.req.param('id')
  const userId = c.get('userId')

  if (!userId) {
    return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)
  }

  try {
    const body = await c.req.json<{ content: string }>()
    const { content } = body

    if (!content || content.trim().length === 0) {
      return c.json({ error: 'BadRequest', message: 'Comment content is required' }, 400)
    }

    if (content.length > 500) {
      return c.json({ error: 'BadRequest', message: 'Comment exceeds 500 character limit' }, 400)
    }

    const db = createDatabaseClient(c.env)
    const commentModel = new CommentModel(db)
    const postModel = new PostModel(db)
    const xpService = new XPService(db)

    // Check if post exists
    const post = await postModel.findById(postId)
    if (!post) {
      return c.json({ error: 'NotFound', message: 'Post not found' }, 404)
    }

    // Create comment (use full post ID from database result)
    const commentId = crypto.randomUUID()
    const comment = await commentModel.create({
      id: commentId,
      user_id: userId,
      post_id: post.id,
      content: content.trim(),
    })

    // Award XP in batch: +5 to commenter, +3 to post creator (if not same user)
    const xpAwards: { userId: string; amount: number; reason: string }[] = [
      { userId, amount: XP_VALUES.COMMENT_EARNER, reason: 'commented_on_post' },
    ]

    // Only award post creator XP if commenter is not the post creator
    if (post.user_id !== userId) {
      xpAwards.push({
        userId: post.user_id,
        amount: XP_VALUES.COMMENT_CREATOR,
        reason: 'post_commented_on',
      })
    }

    const levelUps = await xpService.awardXPBatch(xpAwards)

    // Track analytics
    trackEvent('comment_posted', {
      userId,
      postId,
      commentId,
      postAuthorId: post.user_id,
      commenterLevelUp: levelUps.get(userId),
      creatorLevelUp: levelUps.get(post.user_id),
    })

    return c.json({
      comment,
      xp_awarded: {
        commenter: XP_VALUES.COMMENT_EARNER,
        creator: post.user_id !== userId ? XP_VALUES.COMMENT_CREATOR : 0,
      },
      level_up: {
        commenter: levelUps.get(userId) || false,
        creator: levelUps.get(post.user_id) || false,
      },
    }, 201)
  } catch (error) {
    return c.json({
      error: 'InternalServerError',
      message: (error as Error).message,
    }, 500)
  }
})

// GET /api/posts/:id/comments - Get comments for a post
interactions.get('/posts/:id/comments', async (c) => {
  const postId = c.req.param('id')

  try {
    const db = createDatabaseClient(c.env)
    const postModel = new PostModel(db)

    // Resolve short ID to full ID (supports 8-char IDs)
    const post = await postModel.findById(postId)
    if (!post) {
      return c.json({
        error: 'NotFound',
        message: 'Post not found',
      }, 404)
    }

    // Get comments with author details using the resolved full ID
    const comments = await db.query(
      `SELECT c.*, u.username, u.level, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
      post.id
    )

    return c.json({ comments })
  } catch (error) {
    return c.json({
      error: 'InternalServerError',
      message: (error as Error).message,
    }, 500)
  }
})

// POST /api/users/:username/follow - Follow a user
interactions.post('/users/:username/follow', authMiddleware, async (c) => {
  const targetUsername = c.req.param('username')
  const followerId = c.get('userId')

  if (!followerId) {
    return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)
  }

  try {
    const db = createDatabaseClient(c.env)
    const followModel = new FollowModel(db)
    const userModel = new UserModel(db)
    const xpService = new XPService(db)

    // Find target user
    const targetUser = await userModel.findByUsername(targetUsername)
    if (!targetUser) {
      return c.json({ error: 'NotFound', message: 'User not found' }, 404)
    }

    // Cannot follow self
    if (targetUser.id === followerId) {
      return c.json({ error: 'BadRequest', message: 'Cannot follow yourself' }, 400)
    }

    // Check if already following
    const alreadyFollowing = await followModel.isFollowing(followerId, targetUser.id)
    if (alreadyFollowing) {
      return c.json({ error: 'BadRequest', message: 'Already following this user' }, 400)
    }

    // Create follow
    const followId = crypto.randomUUID()
    await followModel.create({
      id: followId,
      follower_id: followerId,
      followee_id: targetUser.id,
    })

    // Award XP to the user being followed
    const result = await xpService.awardXP(targetUser.id, XP_VALUES.RECEIVE_FOLLOW, 'received_follow')

    // Track analytics
    trackEvent('user_followed', {
      followerId,
      followeeId: targetUser.id,
      followeeLevelUp: result.levelUp,
    })

    return c.json({
      success: true,
      xp_awarded: XP_VALUES.RECEIVE_FOLLOW,
      level_up: result.levelUp,
    }, 201)
  } catch (error) {
    return c.json({
      error: 'InternalServerError',
      message: (error as Error).message,
    }, 500)
  }
})

// DELETE /api/users/:username/follow - Unfollow a user
interactions.delete('/users/:username/follow', authMiddleware, async (c) => {
  const targetUsername = c.req.param('username')
  const followerId = c.get('userId')

  if (!followerId) {
    return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)
  }

  try {
    const db = createDatabaseClient(c.env)
    const followModel = new FollowModel(db)
    const userModel = new UserModel(db)

    // Find target user
    const targetUser = await userModel.findByUsername(targetUsername)
    if (!targetUser) {
      return c.json({ error: 'NotFound', message: 'User not found' }, 404)
    }

    // Check if following
    const isFollowing = await followModel.isFollowing(followerId, targetUser.id)
    if (!isFollowing) {
      return c.json({ error: 'BadRequest', message: 'Not following this user' }, 400)
    }

    // Delete follow (no XP deduction per FR-019)
    await followModel.delete(followerId, targetUser.id)

    // Track analytics
    trackEvent('user_unfollowed', { followerId, followeeId: targetUser.id })

    return c.body(null, 204)
  } catch (error) {
    return c.json({
      error: 'InternalServerError',
      message: (error as Error).message,
    }, 500)
  }
})

export default interactions
