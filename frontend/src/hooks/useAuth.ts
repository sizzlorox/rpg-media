// Authentication hook for login, logout, register, and getCurrentUser

import { useState, useEffect } from 'react'
import { apiClient } from '../services/api-client'
import type { UserProfile, RegisterRequest, LoginRequest } from '../../../shared/types'

interface UseAuthResult {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<UserProfile>
  register: (username: string, password: string) => Promise<UserProfile>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load current user on mount
  useEffect(() => {
    loadCurrentUser()
  }, [])

  async function loadCurrentUser() {
    try {
      setIsLoading(true)
      const currentUser = await apiClient.get<UserProfile>('/auth/me')
      setUser(currentUser)
    } catch (error) {
      // Not authenticated or error loading user
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  async function login(username: string, password: string): Promise<UserProfile> {
    const body: LoginRequest = { username, password }
    const userData = await apiClient.post<UserProfile>('/auth/login', body)
    setUser(userData)
    return userData
  }

  async function register(username: string, password: string): Promise<UserProfile> {
    const body: RegisterRequest = { username, password }
    const userData = await apiClient.post<UserProfile>('/auth/register', body)
    setUser(userData)
    return userData
  }

  async function logout(): Promise<void> {
    await apiClient.post('/auth/logout')
    setUser(null)
  }

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    register,
    logout,
    refreshUser: loadCurrentUser,
  }
}
