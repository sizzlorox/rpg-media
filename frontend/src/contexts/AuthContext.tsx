// Shared authentication context to prevent isolated state instances across components
// This fixes the black screen bug where Landing.tsx and App.tsx had separate useAuth instances

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient } from '../services/api-client'
import type { UserProfile, RegisterRequest, LoginRequest, TOTPChallengeResponse } from '../../../shared/types'

interface AuthContextValue {
  user: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  pendingTotpToken: string | null
  login: (username: string, password: string) => Promise<UserProfile | TOTPChallengeResponse>
  register: (username: string, email: string, password: string) => Promise<UserProfile>
  verify2fa: (challengeToken: string, code: string) => Promise<UserProfile>
  verifyEmail: (token: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, newPassword: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pendingTotpToken, setPendingTotpToken] = useState<string | null>(null)

  // Load current user on mount - runs ONCE for entire app
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

  async function login(username: string, password: string): Promise<UserProfile | TOTPChallengeResponse> {
    const body: LoginRequest = { username, password }
    const response = await apiClient.post<UserProfile | (TOTPChallengeResponse & { requires_2fa: true })>('/auth/login', body)

    if ('requires_2fa' in response && response.requires_2fa) {
      // Store challenge token for use by verify2fa
      setPendingTotpToken(response.totp_challenge_token)
      return response as TOTPChallengeResponse
    }

    const userData = response as UserProfile
    setUser(userData)
    return userData
  }

  async function register(username: string, email: string, password: string): Promise<UserProfile> {
    const body: RegisterRequest = { username, email, password }
    const userData = await apiClient.post<UserProfile>('/auth/register', body)
    setUser(userData)
    return userData
  }

  async function verify2fa(challengeToken: string, code: string): Promise<UserProfile> {
    const userData = await apiClient.post<UserProfile>('/auth/verify-totp', {
      totp_challenge_token: challengeToken,
      code,
    })
    setUser(userData)
    setPendingTotpToken(null)
    return userData
  }

  async function verifyEmail(token: string): Promise<void> {
    await apiClient.post('/auth/verify-email', { token })
    // Refresh user to pick up email_verified=1
    await loadCurrentUser()
  }

  async function forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email })
  }

  async function resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, new_password: newPassword })
  }

  async function logout(): Promise<void> {
    await apiClient.post('/auth/logout')
    setUser(null)
    setPendingTotpToken(null)
  }

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    pendingTotpToken,
    login,
    register,
    verify2fa,
    verifyEmail,
    forgotPassword,
    resetPassword,
    logout,
    refreshUser: loadCurrentUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to access auth context
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
