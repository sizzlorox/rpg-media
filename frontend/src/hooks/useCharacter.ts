// Character stats and XP management hook

import { useState, useCallback } from 'react'
import { apiClient } from '../services/api-client'
import type { UserProfile } from '../../../shared/types'

interface XPProgress {
  current_level: number
  total_xp: number
  xp_for_next_level: number
  xp_needed: number
  progress_percent: number
}

interface XPBreakdown {
  from_posts: number
  from_likes_given: number
  from_likes_received: number
  from_comments_made: number
  from_comments_received: number
  from_follows_received: number
  total: number
}

export function useCharacter() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [xpProgress, setXpProgress] = useState<XPProgress | null>(null)
  const [xpBreakdown, setXpBreakdown] = useState<XPBreakdown | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const loadProfile = useCallback(async (username?: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const endpoint = username ? `/users/${username}` : '/auth/me'
      const result = await apiClient.get<{ user: UserProfile }>(endpoint)
      setProfile(result.user)

      return result.user
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadXPProgress = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await apiClient.get<XPProgress>('/xp/progress')
      setXpProgress(result)

      return result
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadXPBreakdown = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const result = await apiClient.get<{ breakdown: XPBreakdown }>('/xp/breakdown')
      setXpBreakdown(result.breakdown)

      return result.breakdown
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshCharacter = useCallback(async () => {
    await Promise.all([loadProfile(), loadXPProgress()])
  }, [loadProfile, loadXPProgress])

  return {
    profile,
    xpProgress,
    xpBreakdown,
    isLoading,
    error,
    loadProfile,
    loadXPProgress,
    loadXPBreakdown,
    refreshCharacter,
  }
}
