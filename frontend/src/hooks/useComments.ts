// Comments hook for fetching paginated comments on a post

import { useState, useCallback } from 'react'
import { apiClient } from '../services/api-client'
import type { CommentWithAuthor, CommentsResponse } from '../../../shared/types'

interface UseCommentsResult {
  comments: CommentWithAuthor[]
  pagination: {
    page: number
    limit: number
    total_comments: number
    total_pages: number
    has_more: boolean
    has_previous: boolean
  } | null
  isLoading: boolean
  error: string | null
  lastViewedPostId: string | null
  loadComments: (postId: string, page?: number, limit?: number) => Promise<CommentsResponse | null>
}

export function useComments(): UseCommentsResult {
  const [comments, setComments] = useState<CommentWithAuthor[]>([])
  const [pagination, setPagination] = useState<{
    page: number
    limit: number
    total_comments: number
    total_pages: number
    has_more: boolean
    has_previous: boolean
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastViewedPostId, setLastViewedPostId] = useState<string | null>(null)

  const loadComments = useCallback(
    async (postId: string, page: number = 1, limit: number = 15): Promise<CommentsResponse | null> => {
      try {
        setIsLoading(true)
        setError(null)

        const result = await apiClient.get<CommentsResponse>(
          `/posts/${postId}/comments?page=${page}&limit=${limit}`
        )

        setComments(result.comments)
        setPagination(result.pagination)
        setLastViewedPostId(postId)

        return result
      } catch (err) {
        setError((err as Error).message)
        setComments([])
        setPagination(null)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  return {
    comments,
    pagination,
    isLoading,
    error,
    lastViewedPostId,
    loadComments,
  }
}
