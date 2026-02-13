// Public feed hook for landing page (unauthenticated access)

import { useState, useCallback } from 'react'
import { apiClient } from '../services/api-client'
import type { PostWithAuthor } from '../../../shared/types'

interface UsePublicFeedResult {
  recentPosts: PostWithAuthor[]
  trendingPosts: PostWithAuthor[]
  isLoading: boolean
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
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  /**
   * Loads initial feeds (both recent and trending)
   */
  const loadInitial = useCallback(async () => {
    try {
      setIsLoading(true)

      // Fetch recent and trending in parallel
      const [recentResponse, trendingResponse] = await Promise.all([
        apiClient.get<{ posts: PostWithAuthor[]; has_more: boolean }>(
          `/feed/discover?limit=${RECENT_PAGE_SIZE}&offset=0`
        ),
        apiClient.get<{ posts: PostWithAuthor[]; has_more: boolean }>(
          `/feed/discover?limit=${TRENDING_SIZE}&offset=0`
        ),
      ])

      setRecentPosts(recentResponse.posts)
      setTrendingPosts(trendingResponse.posts)
      setHasMore(recentResponse.has_more)
      setOffset(RECENT_PAGE_SIZE)
    } catch (error) {
      console.error('Failed to load public feeds:', error)
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

      const response = await apiClient.get<{ posts: PostWithAuthor[]; has_more: boolean }>(
        `/feed/discover?limit=${RECENT_PAGE_SIZE}&offset=${offset}`
      )

      setRecentPosts((prev) => [...prev, ...response.posts])
      setHasMore(response.has_more)
      setOffset((prev) => prev + RECENT_PAGE_SIZE)
    } catch (error) {
      console.error('Failed to load more posts:', error)
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

  return {
    recentPosts,
    trendingPosts,
    isLoading,
    hasMore,
    loadMore,
    refresh,
  }
}
