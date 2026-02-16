// Feed hook for fetching home feed and discovery feed

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../services/api-client'
import type { PostWithAuthor, FeedResponse } from '../../../shared/types'

interface UseFeedOptions {
  autoLoad?: boolean
  limit?: number
}

interface UseFeedResult {
  posts: PostWithAuthor[]
  isLoading: boolean
  hasMore: boolean
  error: string | null
  loadHomeFeed: (offset?: number) => Promise<PostWithAuthor[]>
  loadDiscoveryFeed: (offset?: number) => Promise<PostWithAuthor[]>
  refresh: () => Promise<void>
}

export function useFeed(options: UseFeedOptions = {}): UseFeedResult {
  const { autoLoad = false, limit = 50 } = options

  const [posts, setPosts] = useState<PostWithAuthor[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFeedType, setLastFeedType] = useState<'home' | 'discover'>('home')

  const loadHomeFeed = useCallback(
    async (offset: number = 0): Promise<PostWithAuthor[]> => {
      try {
        setIsLoading(true)
        setError(null)

        const result = await apiClient.get<FeedResponse>(
          `/feed/home?limit=${limit}&offset=${offset}`
        )

        const newPosts = offset === 0 ? result.posts : [...posts, ...result.posts]
        setPosts(newPosts)

        setHasMore(result.has_more)
        setLastFeedType('home')
        return newPosts
      } catch (err) {
        setError((err as Error).message)
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [limit, posts]
  )

  const loadDiscoveryFeed = useCallback(
    async (offset: number = 0): Promise<PostWithAuthor[]> => {
      try {
        setIsLoading(true)
        setError(null)

        const result = await apiClient.get<FeedResponse>(
          `/feed/discover?limit=${limit}&offset=${offset}`
        )

        const newPosts = offset === 0 ? result.posts : [...posts, ...result.posts]
        setPosts(newPosts)

        setHasMore(result.has_more)
        setLastFeedType('discover')
        return newPosts
      } catch (err) {
        setError((err as Error).message)
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [limit, posts]
  )

  const refresh = useCallback(async () => {
    if (lastFeedType === 'home') {
      await loadHomeFeed(0)
    } else {
      await loadDiscoveryFeed(0)
    }
  }, [lastFeedType, loadHomeFeed, loadDiscoveryFeed])

  // Auto-load on mount if requested
  useEffect(() => {
    if (autoLoad) {
      loadDiscoveryFeed(0)
    }
  }, [autoLoad, loadDiscoveryFeed])

  return {
    posts,
    isLoading,
    hasMore,
    error,
    loadHomeFeed,
    loadDiscoveryFeed,
    refresh,
  }
}
