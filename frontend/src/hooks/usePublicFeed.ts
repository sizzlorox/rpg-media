// Public feed hook for landing page (unauthenticated access)

import { useState, useCallback, useEffect } from 'react'
import { apiClient } from '../services/api-client'
import type { PostWithAuthor } from '../../../shared/types'

interface UsePublicFeedResult {
  recentPosts: PostWithAuthor[]
  trendingPosts: PostWithAuthor[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

const RECENT_PAGE_SIZE = 20
const TRENDING_SIZE = 10

/**
 * Hook for fetching public feeds (recent and trending)
 * Uses /api/feed/discover endpoint which is publicly accessible
 */
export function usePublicFeed(): UsePublicFeedResult {
  const [recentPosts, setRecentPosts] = useState<PostWithAuthor[]>([])
  const [trendingPosts, setTrendingPosts] = useState<PostWithAuthor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  /**
   * Loads initial feeds (both recent and trending)
   */
  const loadInitial = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Single API call - get top posts by popularity
      const response = await apiClient.get<{ posts: PostWithAuthor[]; has_more: boolean }>(
        `/feed/discover?limit=${RECENT_PAGE_SIZE}&offset=0`
      )

      // Use all posts for recent feed
      setRecentPosts(response.posts)

      // Use top 10 for trending
      setTrendingPosts(response.posts.slice(0, TRENDING_SIZE))

      setHasMore(response.has_more)
      setOffset(RECENT_PAGE_SIZE)
    } catch (err) {
      const errorMessage = (err as Error).message || 'Failed to load feed'
      setError(errorMessage)
      console.error('Failed to load public feeds:', err)
      setRecentPosts([])
      setTrendingPosts([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Loads more recent posts (pagination)
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await apiClient.get<{ posts: PostWithAuthor[]; has_more: boolean }>(
        `/feed/discover?limit=${RECENT_PAGE_SIZE}&offset=${offset}`
      )

      setRecentPosts((prev) => [...prev, ...response.posts])
      setHasMore(response.has_more)
      setOffset((prev) => prev + RECENT_PAGE_SIZE)
      // Don't update trending - they're static top 10
    } catch (err) {
      const errorMessage = (err as Error).message || 'Failed to load more posts'
      setError(errorMessage)
      console.error('Failed to load more posts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [offset, hasMore, isLoading])

  /**
   * Refreshes both feeds (resets to initial state)
   */
  const refresh = useCallback(async () => {
    setOffset(0)
    setHasMore(true)
    await loadInitial()
  }, [loadInitial])

  // Auto-load on mount
  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  return {
    recentPosts,
    trendingPosts,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
  }
}
