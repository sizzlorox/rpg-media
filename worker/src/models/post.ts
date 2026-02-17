// Post model with D1 prepared statements

import { DatabaseClient } from '../lib/db'
import { Post, PostWithAuthor } from '../../../shared/types'

export class PostModel {
  constructor(private db: DatabaseClient) {}

  // Get post by ID (supports short IDs like first 8 chars)
  async findById(id: string): Promise<Post | null> {
    // If ID is less than full UUID length, treat as prefix search
    if (id.length < 36) {
      // Validate that ID contains only UUID characters (hex digits and hyphens)
      // This prevents SQL injection via LIKE wildcards
      if (!/^[0-9a-f-]+$/i.test(id)) {
        throw new Error('Invalid post ID format')
      }

      return await this.db.queryOne<Post>(
        'SELECT * FROM posts WHERE id LIKE ? LIMIT 1',
        `${id}%`
      )
    }

    return await this.db.queryOne<Post>(
      'SELECT * FROM posts WHERE id = ?',
      id
    )
  }

  // Create new post
  async create(post: Omit<Post, 'created_at' | 'updated_at'>): Promise<Post> {
    const now = Date.now()

    await this.db.exec(
      `INSERT INTO posts (
        id, user_id, content, char_count, media_url, created_at, updated_at, is_pinned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      post.id,
      post.user_id,
      post.content,
      post.char_count,
      post.media_url,
      now,
      now,
      post.is_pinned || 0
    )

    const created = await this.findById(post.id)
    if (!created) {
      throw new Error('Failed to create post')
    }

    return created
  }

  // Delete post
  async delete(id: string): Promise<void> {
    await this.db.exec('DELETE FROM posts WHERE id = ?', id)
  }

  // Get post with author details
  async getPostWithAuthor(postId: string, currentUserId?: string): Promise<PostWithAuthor | null> {
    const post = await this.findById(postId)
    if (!post) {
      return null
    }

    return this.enrichPostWithAuthor(post, currentUserId)
  }

  // Get posts by user ID
  async getPostsByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<Post[]> {
    return await this.db.query<Post>(
      'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      userId,
      limit,
      offset
    )
  }

  // Enrich post with author details and engagement counts
  async enrichPostWithAuthor(post: Post, currentUserId?: string): Promise<PostWithAuthor> {
    // Get author info
    const author = await this.db.queryOne<{
      username: string
      level: number
      avatar_url: string | null
    }>(
      'SELECT username, level, avatar_url FROM users WHERE id = ?',
      post.user_id
    )

    if (!author) {
      throw new Error('Post author not found')
    }

    // Get engagement counts
    const [likeCount, commentCount, isLiked] = await Promise.all([
      this.db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM likes WHERE post_id = ?',
        post.id
      ),
      this.db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM comments WHERE post_id = ?',
        post.id
      ),
      currentUserId
        ? this.db.queryOne<{ count: number }>(
            'SELECT COUNT(*) as count FROM likes WHERE post_id = ? AND user_id = ?',
            post.id,
            currentUserId
          )
        : Promise.resolve({ count: 0 }),
    ])

    return {
      ...post,
      author: {
        username: author.username,
        level: author.level,
        avatar_url: author.avatar_url,
      },
      like_count: likeCount?.count || 0,
      comment_count: commentCount?.count || 0,
      is_liked_by_user: (isLiked?.count || 0) > 0,
    }
  }

  // Enrich multiple posts with author details (optimized batch operation)
  async enrichPostsWithAuthor(posts: Post[], currentUserId?: string): Promise<PostWithAuthor[]> {
    if (posts.length === 0) return []

    // Extract unique author IDs and post IDs
    const authorIds = [...new Set(posts.map(p => p.user_id))]
    const postIds = posts.map(p => p.id)

    // Batch fetch all authors
    const authorPlaceholders = authorIds.map(() => '?').join(',')
    const authors = await this.db.query<{
      id: string
      username: string
      level: number
      avatar_url: string | null
    }>(
      `SELECT id, username, level, avatar_url FROM users WHERE id IN (${authorPlaceholders})`,
      ...authorIds
    )
    const authorMap = new Map(authors.map(a => [a.id, a]))

    // Batch fetch like counts per post
    const postPlaceholders = postIds.map(() => '?').join(',')
    const likeCounts = await this.db.query<{ post_id: string; count: number }>(
      `SELECT post_id, COUNT(*) as count FROM likes WHERE post_id IN (${postPlaceholders}) GROUP BY post_id`,
      ...postIds
    )
    const likeCountMap = new Map(likeCounts.map(lc => [lc.post_id, lc.count]))

    // Batch fetch comment counts per post
    const commentCounts = await this.db.query<{ post_id: string; count: number }>(
      `SELECT post_id, COUNT(*) as count FROM comments WHERE post_id IN (${postPlaceholders}) GROUP BY post_id`,
      ...postIds
    )
    const commentCountMap = new Map(commentCounts.map(cc => [cc.post_id, cc.count]))

    // Batch fetch user likes if currentUserId provided
    let userLikesSet = new Set<string>()
    if (currentUserId) {
      const userLikes = await this.db.query<{ post_id: string }>(
        `SELECT post_id FROM likes WHERE post_id IN (${postPlaceholders}) AND user_id = ?`,
        ...postIds,
        currentUserId
      )
      userLikesSet = new Set(userLikes.map(ul => ul.post_id))
    }

    // Assemble enriched posts
    return posts.map(post => {
      const author = authorMap.get(post.user_id)
      if (!author) {
        throw new Error(`Post author not found: ${post.user_id}`)
      }

      return {
        ...post,
        author: {
          username: author.username,
          level: author.level,
          avatar_url: author.avatar_url,
        },
        like_count: likeCountMap.get(post.id) || 0,
        comment_count: commentCountMap.get(post.id) || 0,
        is_liked_by_user: userLikesSet.has(post.id),
      }
    })
  }
}
