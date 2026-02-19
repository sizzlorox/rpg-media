// Feed hook for fetching home feed and discovery feed

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '../services/api-client'
import type { PostWithAuthor, FeedResponse, Channel, FeedSortMode } from '../../../shared/types'

interface UseFeedOptions {
  autoLoad?: boolean
  limit?: number
}

interface LastParams {
  feedType: 'home' | 'discover'
  channel?: Channel
  sort?: FeedSortMode
  followingOnly?: boolean
}

interface FeedResult {
  posts: PostWithAuthor[]
  has_more: boolean
}

interface UseFeedResult {
  posts: PostWithAuthor[]
  isLoading: boolean
  hasMore: boolean
  error: string | null
  loadHomeFeed: (offset?: number, channel?: Channel, sort?: FeedSortMode) => Promise<FeedResult>
  loadDiscoveryFeed: (offset?: number, channel?: Channel, sort?: FeedSortMode, followingOnly?: boolean) => Promise<FeedResult>
  refresh: () => Promise<void>
}

export function useFeed(options: UseFeedOptions = {}): UseFeedResult {
  const { autoLoad = false, limit = 30 } = options

  const [posts, setPosts] = useState<PostWithAuthor[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastParamsRef = useRef<LastParams>({ feedType: 'discover' })

  const loadHomeFeed = useCallback(
    async (offset: number = 0, channel?: Channel, sort?: FeedSortMode): Promise<FeedResult> => {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
        if (channel) params.set('channel', channel)
        if (sort) params.set('sort', sort)

        const result = await apiClient.get<FeedResponse>(`/feed/home?${params}`)

        let newPosts: PostWithAuthor[] = []
        setPosts(prevPosts => {
          newPosts = offset === 0 ? result.posts : [...prevPosts, ...result.posts]
          return newPosts
        })

        setHasMore(result.has_more)
        lastParamsRef.current = { feedType: 'home', channel, sort }
        return { posts: newPosts, has_more: result.has_more }
      } catch (err) {
        setError((err as Error).message)
        return { posts: [], has_more: false }
      } finally {
        setIsLoading(false)
      }
    },
    [limit]
  )

  const loadDiscoveryFeed = useCallback(
    async (
      offset: number = 0,
      channel?: Channel,
      sort?: FeedSortMode,
      followingOnly?: boolean
    ): Promise<FeedResult> => {
      try {
        setIsLoading(true)
        setError(null)

        const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
        if (channel) params.set('channel', channel)
        if (sort) params.set('sort', sort)
        if (followingOnly) params.set('following', 'true')

        const result = await apiClient.get<FeedResponse>(`/feed/discover?${params}`)

        let newPosts: PostWithAuthor[] = []
        setPosts(prevPosts => {
          newPosts = offset === 0 ? result.posts : [...prevPosts, ...result.posts]
          return newPosts
        })

        setHasMore(result.has_more)
        lastParamsRef.current = { feedType: 'discover', channel, sort, followingOnly }
        return { posts: newPosts, has_more: result.has_more }
      } catch (err) {
        setError((err as Error).message)
        return { posts: [], has_more: false }
      } finally {
        setIsLoading(false)
      }
    },
    [limit]
  )

  const refresh = useCallback(async () => {
    const { feedType, channel, sort, followingOnly } = lastParamsRef.current
    if (feedType === 'home') {
      await loadHomeFeed(0, channel, sort)
    } else {
      await loadDiscoveryFeed(0, channel, sort, followingOnly)
    }
  }, [loadHomeFeed, loadDiscoveryFeed])

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
