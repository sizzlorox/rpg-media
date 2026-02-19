import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import { useFeed } from './useFeed'
import { useCharacter } from './useCharacter'
import { useComments } from './useComments'
import { useTerminalCommands } from './useTerminalCommands'
import { useTerminal } from './useTerminal'
import { apiClient } from '../services/api-client'
import { green, yellow, red, cyan, magenta } from '../utils/ansi-colors'
import { getResponsiveConfig, getCurrentViewportWidth } from '../utils/terminal-responsive'
import { renderWelcomeMessage } from '../utils/welcome-message'
import { renderTerminalPost } from '../components/TerminalPost'
import { renderTerminalXPBar } from '../components/TerminalXPBar'
import { renderLevelUpAnimation, getUnlockedFeatures } from '../components/LevelUpAnimation'
import { renderPaginatedCommentsView } from '../components/TerminalComment'
import type { CreatePostRequest, UserProfile, Channel, FeedSortMode } from '../../../shared/types'

interface PostResponse {
  xp_awarded: number
  level_up: boolean
}

interface LikeResponse {
  xp_awarded: {
    liker: number
    creator: number
  }
  level_up: {
    liker: boolean
  }
}

interface CommentResponse {
  xp_awarded: {
    commenter: number
    creator: number
  }
  level_up: {
    commenter: boolean
  }
}

interface LevelThreshold {
  level: number
  xp_required: number
  features_unlocked: string | null
}

interface LevelThresholdsResponse {
  thresholds: LevelThreshold[]
}

interface FollowResponse {
  xp_awarded: number
  level_up: boolean
}

export function useHomeLogic() {
  const { user, isAuthenticated, login, register, verify2fa, forgotPassword, logout, pendingTotpToken } = useAuth()
  const { posts, isLoading, loadDiscoveryFeed, loadHomeFeed } = useFeed()
  const { xpProgress, loadXPProgress, refreshCharacter } = useCharacter()
  const { pagination, loadComments, lastViewedPostId } = useComments()
  const terminal = useTerminal()

  const isRefreshingRef = useRef(false)
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )
  const [hasShownWelcome, setHasShownWelcome] = useState(false)
  const [resizeKey, setResizeKey] = useState(0)
  const previousBreakpointRef = useRef<'mobile' | 'tablet' | 'desktop' | null>(null)
  const lastPostsCountRef = useRef(0)

  // Calculate terminal columns - same logic used on both initial render and resize
  const calculateTerminalCols = useCallback(() => {
    const responsiveConfig = getResponsiveConfig(getCurrentViewportWidth())
    return responsiveConfig.config.minCols
  }, [])

  // Listen for window resize to update terminal width
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth
      setWindowWidth(newWidth)

      // Detect breakpoint change
      const responsiveConfig = getResponsiveConfig(newWidth)
      const newBreakpoint = responsiveConfig.breakpoint

      // Trigger welcome re-render only on breakpoint transition
      if (previousBreakpointRef.current &&
          previousBreakpointRef.current !== newBreakpoint) {
        setResizeKey(prev => prev + 1)
        setHasShownWelcome(false)
      }
      previousBreakpointRef.current = newBreakpoint

      // Update terminal columns ref using the same calculation as initial render
      const cols = calculateTerminalCols()
      terminal.updateCols(cols)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [terminal, calculateTerminalCols])

  // Data fetching logic - consolidated into one effect
  useEffect(() => {
    if (isAuthenticated) {
      loadHomeFeed()
      loadXPProgress()
    } else {
      loadDiscoveryFeed()
    }
  }, [isAuthenticated, loadHomeFeed, loadXPProgress, loadDiscoveryFeed])

  const handleRegister = useCallback(
    async (username: string, email: string, password: string) => {
      try {
        await register(username, email, password)
        terminal.writeLine(green(`✓ Account created: ${username}`))
        terminal.writeLine(yellow('You are now logged in!'))
        terminal.writeLine(cyan('Check your email to verify before posting.'))
        terminal.writeLine('')
        await Promise.all([loadHomeFeed(), loadXPProgress()])
      } catch (error) {
        terminal.writeLine(red(`✗ Failed to register: ${(error as Error).message}`))
      }
    },
    [register, terminal, loadHomeFeed, loadXPProgress]
  )

  const handleLogin = useCallback(
    async (username: string, password: string) => {
      try {
        const result = await login(username, password)

        // Check if 2FA is required
        if ('requires_2fa' in result && result.requires_2fa) {
          terminal.writeLine(yellow('2FA required. Enter your authenticator code:'))
          terminal.writeLine(cyan('  /2fa <code>'))
          terminal.writeLine(cyan('  (or recovery code: /2fa <8CHARCODE>)'))
          return
        }

        terminal.writeLine(green(`✓ Logged in as ${username}`))
        await Promise.all([loadHomeFeed(), loadXPProgress()])
      } catch (error) {
        terminal.writeLine(red(`✗ Failed to login: ${(error as Error).message}`))
      }
    },
    [login, terminal, loadHomeFeed, loadXPProgress]
  )

  const handle2FA = useCallback(
    async (code: string) => {
      const challengeToken = pendingTotpToken
      if (!challengeToken) {
        terminal.writeLine(red('✗ No 2FA challenge pending. Please /login first.'))
        return
      }

      try {
        await verify2fa(challengeToken, code)
        terminal.writeLine(green('✓ 2FA verified. Logged in!'))
        await Promise.all([loadHomeFeed(), loadXPProgress()])
      } catch (error) {
        terminal.writeLine(red(`✗ Invalid 2FA code: ${(error as Error).message}`))
      }
    },
    [pendingTotpToken, verify2fa, terminal, loadHomeFeed, loadXPProgress]
  )

  const handleForgot = useCallback(
    async (email: string) => {
      try {
        await forgotPassword(email)
        terminal.writeLine(green('✓ If an account with that email exists, a reset link has been sent.'))
      } catch {
        // Always show success message — no enumeration
        terminal.writeLine(green('✓ If an account with that email exists, a reset link has been sent.'))
      }
    },
    [forgotPassword, terminal]
  )

  const handleSettings = useCallback(
    async (subcommand: string | undefined, args: string[]) => {
      if (!isAuthenticated || !user) {
        terminal.writeLine(red('✗ You must be logged in to access settings'))
        return
      }

      // No subcommand — show status panel
      if (!subcommand) {
        const cols = terminal.terminalCols.current || 80
        const width = Math.min(cols, 60)
        const border = '═'.repeat(width - 2)
        terminal.writeLine(green(`╔${border}╗`))
        terminal.writeLine(green(`║  ACCOUNT SETTINGS${' '.repeat(width - 20)}║`))
        terminal.writeLine(green(`╚${border}╝`))
        terminal.writeLine('')
        terminal.writeLine(`  User     : ${cyan('@' + user.username)}`)
        terminal.writeLine(`  Level    : ${yellow(String(user.level))}`)

        const emailStatus = user.email
          ? `${user.email} ${user.email_verified ? green('[VERIFIED]') : yellow('[UNVERIFIED]')}`
          : red('[not set]')
        terminal.writeLine(`  Email    : ${emailStatus}`)

        const totpStatus = user.totp_enabled ? green('[ENABLED]') : yellow('[DISABLED]')
        terminal.writeLine(`  2FA      : ${totpStatus}`)
        terminal.writeLine('')
        terminal.writeLine(cyan('Available Commands:'))
        terminal.writeLine('  /settings 2fa setup            Set up two-factor authentication')
        terminal.writeLine('  /settings 2fa enable <code>    Activate 2FA (after setup)')
        terminal.writeLine('  /settings 2fa disable <pass>   Disable 2FA')
        terminal.writeLine('  /settings verify-email         Resend verification email')
        terminal.writeLine('  /settings password <old> <new> Change password')
        return
      }

      switch (subcommand) {
        case '2fa': {
          const action = args[0]
          if (!action) {
            terminal.writeLine(yellow('Usage: /settings 2fa setup | enable <code> | disable <password>'))
            return
          }

          if (action === 'setup') {
            try {
              const setup = await apiClient.post<{ secret: string; uri: string; recovery_codes: string[] }>(
                '/auth/settings/2fa/setup', {}
              )
              terminal.writeLine(cyan('╔══════════════════════════════════════╗'))
              terminal.writeLine(cyan('║  2FA SETUP — SAVE THIS INFORMATION   ║'))
              terminal.writeLine(cyan('╚══════════════════════════════════════╝'))
              terminal.writeLine('')
              terminal.writeLine(`  Secret  : ${yellow(setup.secret)}`)
              terminal.writeLine(`  OTP URI : ${cyan(setup.uri)}`)
              terminal.writeLine('')
              terminal.writeLine(yellow('  Recovery codes (save these — shown once):'))
              setup.recovery_codes.forEach((code, i) => {
                terminal.writeLine(`    ${(i + 1).toString().padStart(2, '0')}. ${green(code)}`)
              })
              terminal.writeLine('')
              terminal.writeLine('  Scan the OTP URI in your authenticator app, then run:')
              terminal.writeLine(cyan('  /settings 2fa enable <code>'))
            } catch (error) {
              terminal.writeLine(red(`✗ Setup failed: ${(error as Error).message}`))
            }
          } else if (action === 'enable') {
            const code = args[1]
            if (!code) {
              terminal.writeLine(red('✗ Usage: /settings 2fa enable <code>'))
              return
            }
            try {
              await apiClient.post('/auth/settings/2fa/enable', { code })
              terminal.writeLine(green('✓ 2FA enabled successfully!'))
              terminal.writeLine(yellow('  Your account is now protected with two-factor authentication.'))
            } catch (error) {
              terminal.writeLine(red(`✗ Failed to enable 2FA: ${(error as Error).message}`))
            }
          } else if (action === 'disable') {
            const password = args[1]
            if (!password) {
              terminal.writeLine(red('✗ Usage: /settings 2fa disable <password>'))
              return
            }
            try {
              await apiClient.post('/auth/settings/2fa/disable', { password })
              terminal.writeLine(green('✓ 2FA disabled.'))
            } catch (error) {
              terminal.writeLine(red(`✗ Failed to disable 2FA: ${(error as Error).message}`))
            }
          } else {
            terminal.writeLine(yellow('Usage: /settings 2fa setup | enable <code> | disable <password>'))
          }
          break
        }

        case 'verify-email': {
          try {
            await apiClient.post('/auth/resend-verification', {})
            terminal.writeLine(green('✓ Verification email sent! Check your inbox.'))
          } catch (error) {
            const msg = (error as Error).message
            if (msg.includes('already verified')) {
              terminal.writeLine(yellow('✓ Your email is already verified.'))
            } else {
              terminal.writeLine(red(`✗ Failed to resend: ${msg}`))
            }
          }
          break
        }

        case 'password': {
          const [oldPass, newPass] = args
          if (!oldPass || !newPass) {
            terminal.writeLine(red('✗ Usage: /settings password <old_password> <new_password>'))
            return
          }
          try {
            await apiClient.post('/auth/settings/change-password', {
              old_password: oldPass,
              new_password: newPass,
            })
            terminal.writeLine(green('✓ Password changed successfully.'))
          } catch (error) {
            terminal.writeLine(red(`✗ Failed to change password: ${(error as Error).message}`))
          }
          break
        }

        default:
          terminal.writeLine(red(`✗ Unknown settings command: ${subcommand}`))
          terminal.writeLine(yellow('  Run /settings to see available commands.'))
      }
    },
    [isAuthenticated, user, terminal]
  )

  const handlePost = useCallback(
    async (content: string, channel?: Channel) => {
      if (!isAuthenticated || !user) {
        terminal.writeLine(red('✗ You must be logged in to post'))
        return
      }

      // Frontend UX guard — backend enforces authoritatively
      if (user.email && !user.email_verified) {
        terminal.writeLine(red('✗ Please verify your email before posting.'))
        terminal.writeLine(yellow('  /settings verify-email to resend the verification email'))
        return
      }

      try {
        const postChannel = channel || 'general'
        const result = await apiClient.post<PostResponse>('/posts', { content, channel: postChannel } as CreatePostRequest)
        terminal.writeLine(green(`✓ Posted to #${postChannel}!`))
        terminal.writeLine(yellow(`+${result.xp_awarded} XP`))

        if (result.level_up) {
          terminal.writeLine('')
          const newLevel = user.level + 1
          const unlockedFeatures = getUnlockedFeatures(newLevel)
          terminal.writeLine(renderLevelUpAnimation(newLevel, unlockedFeatures, terminal.terminalCols.current))
          terminal.writeLine('')
        }

        isRefreshingRef.current = true
        await Promise.all([loadHomeFeed(), refreshCharacter()])
      } catch (error) {
        terminal.writeLine(red(`✗ Failed to create post: ${(error as Error).message}`))
      }
    },
    [isAuthenticated, user, terminal, loadHomeFeed, refreshCharacter]
  )

  const handleLike = useCallback(
    async (postId: string) => {
      if (!isAuthenticated) {
        terminal.writeLine(red('✗ You must be logged in to like posts'))
        return
      }

      try {
        const result = await apiClient.post<LikeResponse>(`/posts/${postId}/like`, {})
        terminal.writeLine(green('✓ Post liked!'))
        terminal.writeLine(yellow(`+${result.xp_awarded.liker} XP (you), +${result.xp_awarded.creator} XP (creator)`))

        if (result.level_up.liker && user) {
          terminal.writeLine('')
          const newLevel = user.level + 1
          const unlockedFeatures = getUnlockedFeatures(newLevel)
          terminal.writeLine(renderLevelUpAnimation(newLevel, unlockedFeatures, terminal.terminalCols.current))
          terminal.writeLine('')
        }

        isRefreshingRef.current = true
        await Promise.all([loadHomeFeed(), refreshCharacter()])
      } catch (error) {
        terminal.writeLine(red(`✗ Failed to like post: ${(error as Error).message}`))
      }
    },
    [isAuthenticated, user, terminal, loadHomeFeed, refreshCharacter]
  )

  const handleComment = useCallback(
    async (postId: string, content: string) => {
      if (!isAuthenticated) {
        terminal.writeLine(red('✗ You must be logged in to comment on posts'))
        return
      }

      try {
        const result = await apiClient.post<CommentResponse>(`/posts/${postId}/comments`, { content })
        terminal.writeLine(green('✓ Comment posted!'))
        terminal.writeLine(yellow(`+${result.xp_awarded.commenter} XP (you), +${result.xp_awarded.creator} XP (creator)`))

        if (result.level_up.commenter && user) {
           terminal.writeLine('')
          const newLevel = user.level + 1
          const unlockedFeatures = getUnlockedFeatures(newLevel)
          terminal.writeLine(renderLevelUpAnimation(newLevel, unlockedFeatures, terminal.terminalCols.current))
          terminal.writeLine('')
        }

        isRefreshingRef.current = true
        await Promise.all([loadHomeFeed(), refreshCharacter()])
      } catch (error) {
        terminal.writeLine(red(`✗ Failed to comment on post: ${(error as Error).message}`))
      }
    },
    [isAuthenticated, user, terminal, loadHomeFeed, refreshCharacter]
  )

  const handleFollow = useCallback(
    async (username: string) => {
      if (!isAuthenticated) {
        terminal.writeLine(red('✗ You must be logged in to follow users'))
        return
      }

      try {
        const result = await apiClient.post<FollowResponse>(`/users/${username}/follow`, {})
        terminal.writeLine(green(`✓ Now following @${username}!`))
        terminal.writeLine(yellow(`They received +${result.xp_awarded} XP`))

        if (result.level_up) {
          terminal.writeLine(cyan(`@${username} leveled up!`))
        }
      } catch (error) {
        terminal.writeLine(red(`✗ Failed to follow user: ${(error as Error).message}`))
      }
    },
    [isAuthenticated, terminal]
  )

  const handleUnfollow = useCallback(
    async (username: string) => {
      if (!isAuthenticated) {
        terminal.writeLine(red('✗ You must be logged in to unfollow users'))
        return
      }

      try {
        await apiClient.delete(`/users/${username}/follow`)
        terminal.writeLine(green(`✓ Unfollowed @${username}`))
      } catch (error) {
        terminal.writeLine(red(`✗ Failed to unfollow user: ${(error as Error).message}`))
      }
    },
    [isAuthenticated, terminal]
  )

  const handleLevels = useCallback(async () => {
    try {
      terminal.writeLine(cyan('Level Progression Table'))
      terminal.writeLine(cyan('═'.repeat(60)))
      terminal.writeLine('')

      const result = await apiClient.get<LevelThresholdsResponse>('/levels/thresholds')

      terminal.writeLine(yellow('Level | XP Required | Feature Unlocked'))
      terminal.writeLine('─'.repeat(60))

      result.thresholds.forEach((threshold) => {
        const levelStr = threshold.level.toString().padEnd(5)
        const xpStr = threshold.xp_required.toString().padEnd(11)
        const featureStr = threshold.features_unlocked || '-'
        terminal.writeLine(`${green(levelStr)} | ${cyan(xpStr)} | ${magenta(featureStr)}`)
      })

      terminal.writeLine('')
      terminal.writeLine(yellow('Earn XP by: Posting (+10), Liking (+1), Commenting (+5), Being Followed (+5)'))
    } catch (error) {
      terminal.writeLine(red(`✗ Failed to load levels: ${(error as Error).message}`))
    }
  }, [terminal])

  const handleProfile = useCallback(async (username?: string) => {
    try {
      const endpoint = username ? `/users/${username}` : '/auth/me'
      const profile = await apiClient.get<UserProfile>(endpoint)

      const { renderASCIICharacterSheet } = await import('../components/ASCIICharacterSheet')
      const sheet = renderASCIICharacterSheet(profile, terminal.terminalCols.current)
      terminal.writeLine(sheet)
    } catch (error) {
      terminal.writeLine(red(`✗ Failed to load profile: ${(error as Error).message}`))
    }
  }, [terminal])

  const handleShow = useCallback(async (postId: string, pageArg?: string) => {
    try {
      let page = 1
      if (pageArg) {
        if (pageArg === 'next') {
          if (lastViewedPostId === postId && pagination) {
            if (pagination.has_more) page = pagination.page + 1
            else { terminal.writeLine(yellow('You are on the last page.')); return }
          } else { terminal.writeLine(yellow('Tip: View a post first with /show <post_id> to use next/prev')); return }
        } else if (pageArg === 'prev') {
          if (lastViewedPostId === postId && pagination) {
            if (pagination.has_previous) page = pagination.page - 1
            else { terminal.writeLine(yellow('You are on the first page.')); return }
          } else { terminal.writeLine(yellow('Tip: View a post first with /show <post_id> to use next/prev')); return }
        } else {
          const parsedPage = parseInt(pageArg, 10)
          if (isNaN(parsedPage) || parsedPage < 1) { terminal.writeLine(red('Invalid page number. Must be a positive integer.')); return }
          page = parsedPage
        }
      }

      terminal.writeLine(cyan(`Loading comments for post ${postId.slice(0, 8)}${page > 1 ? ` (page ${page})` : ''}...`))
      terminal.writeLine('')

      const result = await loadComments(postId, page)
      if (result) {
        const commentsView = renderPaginatedCommentsView(postId, result.comments, result.pagination, terminal.terminalCols.current)
        terminal.writeLine(commentsView)
      } else {
        terminal.writeLine(red('Failed to load comments.'))
      }
    } catch (error) {
      terminal.writeLine(red(`✗ Failed to load comments: ${(error as Error).message}`))
    }
  }, [terminal, loadComments, pagination, lastViewedPostId])

  const handleUnlocks = useCallback(async () => {
    if (!user) {
      terminal.writeLine(yellow('Log in to see your feature unlock progress'))
      return
    }

    try {
      const { renderFeatureRoadmap } = await import('../components/FeatureLock')
      const roadmap = renderFeatureRoadmap(user.level, terminal.terminalCols.current)
      terminal.writeLine(roadmap)
    } catch (error) {
      terminal.writeLine(red(`✗ Failed to load unlocks: ${(error as Error).message}`))
    }
  }, [user, terminal])

  const handleLogout = useCallback(async () => {
    try {
      await logout()
      terminal.writeLine(green('✓ Logged out successfully.'))
      await loadDiscoveryFeed()
    } catch (error) {
      terminal.writeLine(red(`✗ Failed to logout: ${(error as Error).message}`))
    }
  }, [logout, terminal, loadDiscoveryFeed])

  const handleFeed = useCallback(
    async (channel?: Channel, sort?: FeedSortMode, followingOnly?: boolean, page?: number) => {
      const pageSize = 30
      const pageNum = page || 1
      const offset = (pageNum - 1) * pageSize

      // Build header label
      const channelLabel = channel ? `#${channel}` : 'home'
      const sortLabel = sort || (channel ? 'new' : isAuthenticated ? 'new' : 'trending')
      const followLabel = followingOnly ? ' [following only]' : ''
      const pageLabel = pageNum > 1 ? ` — page ${pageNum}` : ''

      terminal.writeLine(cyan(`Loading ${channelLabel}${followLabel} [${sortLabel}]${pageLabel}...`))

      let feedResult: { posts: import('../../../shared/types').PostWithAuthor[]; has_more: boolean }

      if (channel) {
        // Channel specified: always use discover endpoint (public board)
        feedResult = await loadDiscoveryFeed(offset, channel, sort || 'new', followingOnly)
      } else if (isAuthenticated) {
        // No channel, authenticated: home feed
        feedResult = await loadHomeFeed(offset, undefined, sort)
      } else {
        // No channel, unauthenticated: discovery feed
        feedResult = await loadDiscoveryFeed(offset, undefined, sort || 'trending')
      }

      const { posts: loadedPosts, has_more } = feedResult

      if (loadedPosts.length === 0) {
        terminal.writeLine(yellow('No posts to display'))
        if (isAuthenticated && !channel) {
          terminal.writeLine('')
          terminal.writeLine('Follow some users to see their posts in your feed!')
          terminal.writeLine(`Or try: /feed #general  to browse all posts`)
        }
      } else {
        terminal.writeLine('')
        const headerParts = [`${channelLabel}${followLabel}`, `${loadedPosts.length} posts`, `[${sortLabel}]`]
        if (pageNum > 1) headerParts.push(`page ${pageNum}`)
        terminal.writeLine(green(headerParts.join(' — ') + ':'))
        terminal.writeLine('')
        loadedPosts.forEach((post) =>
          terminal.writeLine(renderTerminalPost(post, true, terminal.terminalCols.current))
        )
        // Hint for more pages
        if (has_more) {
          terminal.writeLine('')
          terminal.writeLine(yellow(`  use --page ${pageNum + 1} to see more`))
        }
      }
    },
    [isAuthenticated, loadHomeFeed, loadDiscoveryFeed, terminal]
  )

  const { executeCommand } = useTerminalCommands({
    onRegister: handleRegister,
    onLogin: handleLogin,
    on2FA: handle2FA,
    onForgot: handleForgot,
    onSettings: handleSettings,
    onPost: handlePost,
    onFeed: handleFeed,
    onLike: handleLike,
    onComment: handleComment,
    onShow: handleShow,
    onFollow: handleFollow,
    onUnfollow: handleUnfollow,
    onLevels: handleLevels,
    onProfile: handleProfile,
    onUnlocks: handleUnlocks,
    onLogout: handleLogout,
    onHelp: () => {
      terminal.writeLine(yellow('Available commands:'))
      terminal.writeLine('')
      terminal.writeLine(cyan('Account:'))
      terminal.writeLine('  /register <username> <email> <pass>  - Create new account')
      terminal.writeLine('  /login <username> <password>         - Login to account')
      terminal.writeLine('  /2fa <code>                          - Enter 2FA code after login')
      terminal.writeLine('  /forgot <email>                      - Send password reset email')
      terminal.writeLine('  /settings [subcommand]               - Manage account settings')
      terminal.writeLine('  /logout                              - Logout of your account')
      terminal.writeLine('')
      terminal.writeLine(cyan('Social:'))
      terminal.writeLine('  /post <content> [--channel <name>]   - Create a new post (default: #general)')
      terminal.writeLine('  /feed [#channel] [--trending|--top|--new] [--following] [--page N]')
      terminal.writeLine('  /like <post_id>                      - Like a post')
      terminal.writeLine('  /comment <post_id> <text>            - Comment on a post')
      terminal.writeLine('  /show <post_id> [page]               - View comments on a post (paginated)')
      terminal.writeLine('  /follow <username>                   - Follow a user')
      terminal.writeLine('  /unfollow <username>                 - Unfollow a user')
      terminal.writeLine('')
      terminal.writeLine(cyan('Progression:'))
      terminal.writeLine('  /profile [username]                  - View character sheet')
      terminal.writeLine('  /stats                               - View your stats')
      terminal.writeLine('  /levels                              - View level thresholds')
      terminal.writeLine('  /unlocks                             - View feature unlocks')
      terminal.writeLine('')
      terminal.writeLine(cyan('Channels:'))
      terminal.writeLine('  general  dev  quest  lore  debug  signal  meta  offtopic')
      terminal.writeLine('')
      terminal.writeLine(cyan('Utility:'))
      terminal.writeLine('  /help                                - Show this help')
      terminal.writeLine('  /clear                               - Clear terminal')
    },
    onClear: terminal.clear,
  })

  // Refined welcome message logic with ASCII art
  useEffect(() => {
    if (isRefreshingRef.current) {
      isRefreshingRef.current = false
      return
    }

    // Check if posts just arrived (went from 0 to > 0)
    const postsJustArrived = lastPostsCountRef.current === 0 && posts.length > 0

    // Update lastPostsCountRef IMMEDIATELY to survive React Strict Mode remounts
    if (postsJustArrived) {
      lastPostsCountRef.current = posts.length
    }

    // Only skip if we've shown welcome AND posts haven't just arrived AND no resize
    if (hasShownWelcome && !postsJustArrived && resizeKey === 0) {
      return
    }

    // Use the same calculation function for consistency
    const cols = terminal.terminalCols.current || calculateTerminalCols()
    const responsiveConfig = getResponsiveConfig(getCurrentViewportWidth())
    const asciiWelcome = renderWelcomeMessage(cols, responsiveConfig.logoType)

    if (isAuthenticated && user) {
      // Authenticated users - show XP bar if available
      let feedStatusMessage = ''
      if (isLoading) {
        feedStatusMessage = cyan('Loading feed...')
      } else if (posts.length > 0) {
        feedStatusMessage = yellow(`Showing ${posts.length} posts:`)
      } else {
        feedStatusMessage = yellow('No posts in your feed yet.\n\nFollow users to see their posts or use /feed discover to explore!')
      }

      const welcome = xpProgress
        ? [
            asciiWelcome,
            '',
            renderTerminalXPBar(xpProgress.current_level, xpProgress.total_xp, xpProgress.xp_for_next_level, xpProgress.progress_percent, cols),
            '',
            feedStatusMessage,
            '',
          ].join('\r\n')
        : [
            asciiWelcome,
            '',
            feedStatusMessage,
            '',
          ].join('\r\n')

      const content = posts.length > 0
        ? welcome + posts.map((post) => renderTerminalPost(post, true, cols)).join('\r\n') + '\r\n'
        : welcome

      terminal.setContent(content)
      setHasShownWelcome(true)
    } else {
      let feedStatusMessage = ''
      if (isLoading) {
        feedStatusMessage = cyan('Loading popular posts...')
      } else if (posts.length > 0) {
        feedStatusMessage = yellow(`Showing ${posts.length} popular posts:`)
      } else {
        feedStatusMessage = yellow('No posts to display.\n\nCreate an account to start posting!')
      }

      const welcome = [
        asciiWelcome,
        '',
        feedStatusMessage,
        '',
      ].join('\r\n')

      const content = posts.length > 0
        ? welcome + posts.map((post) => renderTerminalPost(post, true, cols)).join('\r\n') + '\r\n'
        : welcome

      terminal.setContent(content)
      setHasShownWelcome(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, posts, isLoading, xpProgress, windowWidth, calculateTerminalCols, resizeKey])

  const handleCommand = useCallback(
    async (command: string, terminalCols: number = 80) => {
      terminal.updateCols(terminalCols)

      // Execute command and write result (Terminal.tsx handles displaying the input)
      const result = await executeCommand(command)
      if (result) terminal.writeLine(result)
    },
    [executeCommand, terminal]
  )

  return {
    terminalOutput: terminal.output,
    handleCommand,
  }
}
