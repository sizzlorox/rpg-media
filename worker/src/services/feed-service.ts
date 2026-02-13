// Feed service for generating personalized and discovery feeds

import { DatabaseClient } from '../lib/db'
import { PostModel } from '../models/post'
import { Post, PostWithAuthor } from '../../../../shared/types'

export class FeedService {
  private postModel: PostModel

  constructor(private db: DatabaseClient) {
    this.postModel = new PostModel(db)
  }

  // Generate personalized home feed (posts from followed users)
  async generateHomeFeed(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ posts: PostWithAuthor[]; has_more: boolean }> {
    // Get list of users the current user follows
    const following = await this.db.query<{ followee_id: string }>(
      'SELECT followee_id FROM follows WHERE follower_id = ? LIMIT 1000',
      userId
    )

    // If not following anyone, return empty feed
    if (following.length === 0) {
      return { posts: [], has_more: false }
    }

    const followingIds = following.map((f) => f.followee_id)

    // Build query with placeholders
    const placeholders = followingIds.map(() => '?').join(',')

    // Fetch posts from followed users
    const posts = await this.db.query<Post>(
      `SELECT * FROM posts
       WHERE user_id IN (${placeholders})
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      ...followingIds,
      limit + 1, // Fetch one extra to check if there are more
      offset
    )

    const has_more = posts.length > limit
    const postsToReturn = posts.slice(0, limit)

    // Enrich with author details and engagement counts
    const enrichedPosts = await this.postModel.enrichPostsWithAuthor(postsToReturn, userId)

    return {
      posts: enrichedPosts,
      has_more,
    }
  }

  // Generate discovery feed (popular posts for new users)
  // FR-029: popularity_score = ((like_count × 1) + (comment_count × 3) + age_bonus) / hours^0.8
  async generateDiscoveryFeed(
    limit: number = 50,
    offset: number = 0,
    currentUserId?: string
  ): Promise<{ posts: PostWithAuthor[]; has_more: boolean }> {
    const now = Date.now()
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000

    // Get all posts from last 7 days with engagement counts
    const posts = await this.db.query<
      Post & {
        like_count: number
        comment_count: number
      }
    >(
      `SELECT
         p.*,
         COALESCE(l.like_count, 0) as like_count,
         COALESCE(c.comment_count, 0) as comment_count
       FROM posts p
       LEFT JOIN (
         SELECT post_id, COUNT(*) as like_count
         FROM likes
         GROUP BY post_id
       ) l ON p.id = l.post_id
       LEFT JOIN (
         SELECT post_id, COUNT(*) as comment_count
         FROM comments
         GROUP BY post_id
       ) c ON p.id = c.post_id
       WHERE p.created_at > ?
       ORDER BY p.created_at DESC
       LIMIT 1000`,
      now - 7 * 24 * 60 * 60 * 1000 // Last 7 days
    )

    // Calculate popularity scores
    const scoredPosts = posts.map((post) => {
      const ageInHours = (now - post.created_at) / (1000 * 60 * 60)

      // Age bonus for posts < 24 hours old
      const ageBonus = post.created_at > twentyFourHoursAgo
        ? Math.max(0, 24 - ageInHours) * 0.5
        : 0

      // Calculate popularity score
      const score =
        ((post.like_count * 1.0) + (post.comment_count * 3.0) + ageBonus) /
        Math.pow(ageInHours || 0.1, 0.8)

      return {
        post,
        score,
      }
    })

    // Sort by score descending and take top results
    scoredPosts.sort((a, b) => b.score - a.score)

    const topPosts = scoredPosts
      .slice(offset, offset + limit + 1)
      .map((sp) => sp.post)

    const has_more = topPosts.length > limit
    const postsToReturn = topPosts.slice(0, limit)

    // Enrich with author details
    const enrichedPosts = await this.postModel.enrichPostsWithAuthor(postsToReturn, currentUserId)

    return {
      posts: enrichedPosts,
      has_more,
    }
  }
}
