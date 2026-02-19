// Feed service for generating personalized and discovery feeds

import { DatabaseClient } from '../lib/db'
import { PostModel } from '../models/post'
import { Post, PostWithAuthor, Channel, FeedSortMode } from '../../../shared/types'

export class FeedService {
  private postModel: PostModel

  constructor(private db: DatabaseClient) {
    this.postModel = new PostModel(db)
  }

  // Score a post for trending sort (FR-029)
  private scorePost(
    post: Post & { like_count: number; comment_count: number },
    now: number
  ): number {
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000
    const ageInHours = (now - post.created_at) / (1000 * 60 * 60)
    const ageBonus = post.created_at > twentyFourHoursAgo
      ? Math.max(0, 24 - ageInHours) * 0.5
      : 0
    return (
      (post.like_count * 1.0 + post.comment_count * 3.0 + ageBonus) /
      Math.pow(ageInHours || 0.1, 0.8)
    )
  }

  // Generate personalized home feed (posts from followed users)
  async generateHomeFeed(
    userId: string,
    limit: number = 30,
    offset: number = 0,
    channel?: Channel,
    sort: FeedSortMode = 'new',
    followingOnly: boolean = true
  ): Promise<{ posts: PostWithAuthor[]; has_more: boolean }> {
    // Get list of users the current user follows
    const following = await this.db.query<{ followee_id: string }>(
      'SELECT followee_id FROM follows WHERE follower_id = ? LIMIT 1000',
      userId
    )

    // If not following anyone and following constraint is required, return empty feed
    if (followingOnly && following.length === 0) {
      return { posts: [], has_more: false }
    }

    const followingIds = following.map((f) => f.followee_id)

    // Build WHERE clause
    const conditions: string[] = []
    const params: (string | number)[] = []

    if (followingOnly && followingIds.length > 0) {
      const placeholders = followingIds.map(() => '?').join(',')
      conditions.push(`p.user_id IN (${placeholders})`)
      params.push(...followingIds)
    }

    if (channel) {
      conditions.push('p.channel = ?')
      params.push(channel)
    }

    // Hidden posts filter
    conditions.push('p.is_hidden = 0')

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    if (sort === 'top') {
      return this.fetchTopSorted(whereClause, params, limit, offset, userId)
    }

    if (sort === 'trending') {
      return this.fetchTrendingSorted(whereClause, params, limit, offset, userId)
    }

    // Default: newest
    const posts = await this.db.query<Post>(
      `SELECT p.* FROM posts p
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      ...params,
      limit + 1,
      offset
    )

    const has_more = posts.length > limit
    const postsToReturn = posts.slice(0, limit)
    const enrichedPosts = await this.postModel.enrichPostsWithAuthor(postsToReturn, userId)
    return { posts: enrichedPosts, has_more }
  }

  // Generate discovery feed (popular posts for new users / public channel boards)
  async generateDiscoveryFeed(
    limit: number = 30,
    offset: number = 0,
    currentUserId?: string,
    channel?: Channel,
    sort: FeedSortMode = 'trending'
  ): Promise<{ posts: PostWithAuthor[]; has_more: boolean }> {
    const conditions: string[] = ['p.is_hidden = 0']
    const params: (string | number)[] = []

    if (channel) {
      conditions.push('p.channel = ?')
      params.push(channel)
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    if (sort === 'new') {
      const posts = await this.db.query<Post>(
        `SELECT p.* FROM posts p
         ${whereClause}
         ORDER BY p.created_at DESC
         LIMIT ? OFFSET ?`,
        ...params,
        limit + 1,
        offset
      )
      const has_more = posts.length > limit
      const postsToReturn = posts.slice(0, limit)
      const enrichedPosts = await this.postModel.enrichPostsWithAuthor(postsToReturn, currentUserId)
      return { posts: enrichedPosts, has_more }
    }

    if (sort === 'top') {
      return this.fetchTopSorted(whereClause, params, limit, offset, currentUserId)
    }

    // Default: trending (in-memory score, last 7 days)
    return this.fetchTrendingSorted(whereClause, params, limit, offset, currentUserId)
  }

  // Fetch posts sorted by like_count DESC (SQL)
  private async fetchTopSorted(
    whereClause: string,
    params: (string | number)[],
    limit: number,
    offset: number,
    currentUserId?: string
  ): Promise<{ posts: PostWithAuthor[]; has_more: boolean }> {
    const posts = await this.db.query<Post & { like_count: number; comment_count: number }>(
      `SELECT p.*,
         COALESCE(l.like_count, 0) as like_count,
         COALESCE(c.comment_count, 0) as comment_count
       FROM posts p
       LEFT JOIN (
         SELECT post_id, COUNT(*) as like_count FROM likes GROUP BY post_id
       ) l ON p.id = l.post_id
       LEFT JOIN (
         SELECT post_id, COUNT(*) as comment_count FROM comments GROUP BY post_id
       ) c ON p.id = c.post_id
       ${whereClause}
       ORDER BY like_count DESC, p.created_at DESC
       LIMIT ? OFFSET ?`,
      ...params,
      limit + 1,
      offset
    )

    const has_more = posts.length > limit
    const postsToReturn = posts.slice(0, limit)
    const enrichedPosts = await this.postModel.enrichPostsWithAuthor(postsToReturn, currentUserId)
    return { posts: enrichedPosts, has_more }
  }

  // Fetch posts sorted by popularity score in-memory (last 7 days)
  private async fetchTrendingSorted(
    whereClause: string,
    params: (string | number)[],
    limit: number,
    offset: number,
    currentUserId?: string
  ): Promise<{ posts: PostWithAuthor[]; has_more: boolean }> {
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000

    // Build a WHERE clause that adds the 7-day constraint
    const hasWhere = whereClause.trim().toUpperCase().startsWith('WHERE')
    const timeConstraint = `p.created_at > ${sevenDaysAgo}`
    const effectiveWhere = hasWhere
      ? `${whereClause} AND ${timeConstraint}`
      : `WHERE ${timeConstraint}`

    const posts = await this.db.query<Post & { like_count: number; comment_count: number }>(
      `SELECT p.*,
         COALESCE(l.like_count, 0) as like_count,
         COALESCE(c.comment_count, 0) as comment_count
       FROM posts p
       LEFT JOIN (
         SELECT post_id, COUNT(*) as like_count FROM likes GROUP BY post_id
       ) l ON p.id = l.post_id
       LEFT JOIN (
         SELECT post_id, COUNT(*) as comment_count FROM comments GROUP BY post_id
       ) c ON p.id = c.post_id
       ${effectiveWhere}
       ORDER BY p.created_at DESC
       LIMIT 1000`,
      ...params
    )

    const scoredPosts = posts
      .map((post) => ({ post, score: this.scorePost(post, now) }))
      .sort((a, b) => b.score - a.score)

    const paged = scoredPosts.slice(offset, offset + limit + 1).map((sp) => sp.post)
    const has_more = paged.length > limit
    const postsToReturn = paged.slice(0, limit)
    const enrichedPosts = await this.postModel.enrichPostsWithAuthor(postsToReturn, currentUserId)
    return { posts: enrichedPosts, has_more }
  }
}
