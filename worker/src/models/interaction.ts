// Interaction models: Likes, Comments, Follows

import { DatabaseClient } from '../lib/db'
import { Like, Comment, Follow } from '../../../shared/types'

export class LikeModel {
  constructor(private db: DatabaseClient) {}

  // Create a like
  async create(like: Omit<Like, 'created_at'>): Promise<Like> {
    const now = Date.now()

    await this.db.exec(
      'INSERT INTO likes (id, user_id, post_id, created_at) VALUES (?, ?, ?, ?)',
      like.id,
      like.user_id,
      like.post_id,
      now
    )

    const created = await this.db.queryOne<Like>(
      'SELECT * FROM likes WHERE id = ?',
      like.id
    )

    if (!created) {
      throw new Error('Failed to create like')
    }

    return created
  }

  // Delete a like
  async delete(userId: string, postId: string): Promise<void> {
    await this.db.exec(
      'DELETE FROM likes WHERE user_id = ? AND post_id = ?',
      userId,
      postId
    )
  }

  // Check if user has liked a post
  async hasLiked(userId: string, postId: string): Promise<boolean> {
    const result = await this.db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM likes WHERE user_id = ? AND post_id = ?',
      userId,
      postId
    )

    return (result?.count || 0) > 0
  }

  // Get like count for a post
  async getCountForPost(postId: string): Promise<number> {
    const result = await this.db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM likes WHERE post_id = ?',
      postId
    )

    return result?.count || 0
  }
}

export class CommentModel {
  constructor(private db: DatabaseClient) {}

  // Create a comment
  async create(comment: Omit<Comment, 'created_at' | 'updated_at'>): Promise<Comment> {
    const now = Date.now()

    await this.db.exec(
      'INSERT INTO comments (id, user_id, post_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      comment.id,
      comment.user_id,
      comment.post_id,
      comment.content,
      now,
      now
    )

    const created = await this.db.queryOne<Comment>(
      'SELECT * FROM comments WHERE id = ?',
      comment.id
    )

    if (!created) {
      throw new Error('Failed to create comment')
    }

    return created
  }

  // Get comments for a post
  async getForPost(postId: string): Promise<Comment[]> {
    return await this.db.query<Comment>(
      'SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC',
      postId
    )
  }

  // Get comment count for a post
  async getCountForPost(postId: string): Promise<number> {
    const result = await this.db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM comments WHERE post_id = ?',
      postId
    )

    return result?.count || 0
  }
}

export class FollowModel {
  constructor(private db: DatabaseClient) {}

  // Create a follow relationship
  async create(follow: Omit<Follow, 'created_at'>): Promise<Follow> {
    const now = Date.now()

    await this.db.exec(
      'INSERT INTO follows (id, follower_id, followee_id, created_at) VALUES (?, ?, ?, ?)',
      follow.id,
      follow.follower_id,
      follow.followee_id,
      now
    )

    const created = await this.db.queryOne<Follow>(
      'SELECT * FROM follows WHERE id = ?',
      follow.id
    )

    if (!created) {
      throw new Error('Failed to create follow')
    }

    return created
  }

  // Delete a follow relationship
  async delete(followerId: string, followeeId: string): Promise<void> {
    await this.db.exec(
      'DELETE FROM follows WHERE follower_id = ? AND followee_id = ?',
      followerId,
      followeeId
    )
  }

  // Check if user is following another user
  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const result = await this.db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = ? AND followee_id = ?',
      followerId,
      followeeId
    )

    return (result?.count || 0) > 0
  }

  // Get followers count
  async getFollowersCount(userId: string): Promise<number> {
    const result = await this.db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM follows WHERE followee_id = ?',
      userId
    )

    return result?.count || 0
  }

  // Get following count
  async getFollowingCount(userId: string): Promise<number> {
    const result = await this.db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?',
      userId
    )

    return result?.count || 0
  }
}
