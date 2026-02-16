import { useCallback, useEffect, useRef } from 'react'
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
import type { CreatePostRequest, UserProfile } from '../../../shared/types'

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

// Module-level flag to prevent React Strict Mode from clearing feed on remount
let hasShownWelcomeMessage = false

export function useHomeLogic() {
  const { user, isAuthenticated, login, register } = useAuth()
  const { posts, loadDiscoveryFeed, loadHomeFeed } = useFeed()
  const { xpProgress, loadXPProgress, refreshCharacter } = useCharacter()
  const { pagination, loadComments, lastViewedPostId } = useComments()
  const terminal = useTerminal()

  const isRefreshingRef = useRef(false)

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
    async (username: string, password: string) => {
      try {
        await register(username, password)
        terminal.writeLine(green(`✓ Account created: ${username}`))
        terminal.writeLine(yellow('You are now logged in!'))
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
        await login(username, password)
        terminal.writeLine(green(`✓ Logged in as ${username}`))
        await Promise.all([loadHomeFeed(), loadXPProgress()])
      } catch (error) {
        terminal.writeLine(red(`✗ Failed to login: ${(error as Error).message}`))
      }
    },
    [login, terminal, loadHomeFeed, loadXPProgress]
  )

  const handlePost = useCallback(
    async (content: string) => {
      if (!isAuthenticated || !user) {
        terminal.writeLine(red('✗ You must be logged in to post'))
        return
      }

      try {
        const result = await apiClient.post<PostResponse>('/posts', { content } as CreatePostRequest)
        terminal.writeLine(green('✓ Post created!'))
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

  const handleFeed = useCallback(async (subcommand?: string) => {
    if (subcommand === 'discover') {
      terminal.writeLine(cyan('Loading popular posts...'))
      await loadDiscoveryFeed()
      if (posts.length === 0) terminal.writeLine(yellow('No posts to display'))
      else {
        terminal.writeLine('')
        terminal.writeLine(green(`Showing ${posts.length} popular posts:`))
        terminal.writeLine('')
        posts.forEach((post) => terminal.writeLine(renderTerminalPost(post, true, terminal.terminalCols.current)))
      }
    } else {
      terminal.writeLine(cyan('Loading feed...'))
      if (isAuthenticated) await loadHomeFeed()
      else await loadDiscoveryFeed()

      if (posts.length === 0) {
        terminal.writeLine(yellow('No posts to display'))
        if (isAuthenticated) {
          terminal.writeLine('')
          terminal.writeLine('Follow some users to see their posts in your feed!')
          terminal.writeLine('Or use /feed discover to see popular posts')
        }
      } else {
        terminal.writeLine('')
        terminal.writeLine(green(`Showing ${posts.length} posts:`))
        terminal.writeLine('')
        posts.forEach((post) => terminal.writeLine(renderTerminalPost(post, true, terminal.terminalCols.current)))
      }
    }
  }, [isAuthenticated, posts, loadHomeFeed, loadDiscoveryFeed, terminal])

  const { executeCommand } = useTerminalCommands({
    onRegister: handleRegister,
    onLogin: handleLogin,
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
    onHelp: () => {
      terminal.writeLine(yellow('Available commands:'))
      terminal.writeLine('')
      terminal.writeLine(cyan('Account:'))
      terminal.writeLine('  /register <username> <password>  - Create new account')
      terminal.writeLine('  /login <username> <password>     - Login to account')
      terminal.writeLine('')
      terminal.writeLine(cyan('Social:'))
      terminal.writeLine('  /post <content>                  - Create a new post')
      terminal.writeLine('  /feed [discover]                 - Refresh feed or view popular posts')
      terminal.writeLine('  /like <post_id>                  - Like a post')
      terminal.writeLine('  /comment <post_id> <text>        - Comment on a post')
      terminal.writeLine('  /show <post_id> [page]           - View comments on a post (paginated)')
      terminal.writeLine('  /follow <username>               - Follow a user')
      terminal.writeLine('  /unfollow <username>             - Unfollow a user')
      terminal.writeLine('')
      terminal.writeLine(cyan('Progression:'))
      terminal.writeLine('  /profile [username]              - View character sheet')
      terminal.writeLine('  /stats                           - View your stats')
      terminal.writeLine('  /levels                          - View level thresholds')
      terminal.writeLine('  /unlocks                         - View feature unlocks')
      terminal.writeLine('')
      terminal.writeLine(cyan('Utility:'))
      terminal.writeLine('  /help                            - Show this help')
      terminal.writeLine('  /clear                           - Clear terminal')
    },
    onClear: terminal.clear,
  })

  // Refined welcome message logic with ASCII art
  useEffect(() => {
    console.log('[useHomeLogic] showInitialWelcome useEffect triggered', {
      isRefreshing: isRefreshingRef.current,
      hasShownWelcome: hasShownWelcomeMessage,
      isAuthenticated,
      hasUser: !!user,
      postsLength: posts.length,
      hasXpProgress: !!xpProgress
    })

    if (isRefreshingRef.current) {
      isRefreshingRef.current = false
      return
    }

    // Only skip if we've shown welcome WITH posts already
    if (hasShownWelcomeMessage) return

    const cols = terminal.terminalCols.current || 80
    const responsiveConfig = getResponsiveConfig(getCurrentViewportWidth())
    const asciiWelcome = renderWelcomeMessage(cols, responsiveConfig.logoType)

    if (isAuthenticated && user && xpProgress) {
      console.log('[useHomeLogic] Showing authenticated welcome, postsLength:', posts.length)
      const xpBar = renderTerminalXPBar(xpProgress.current_level, xpProgress.total_xp, xpProgress.xp_for_next_level, xpProgress.progress_percent, cols)
      const welcome = [
        asciiWelcome,
        '',
        xpBar,
        '',
        posts.length > 0 ? yellow(`Showing ${posts.length} posts:`) : cyan('Loading feed...'),
        '',
      ].join('\r\n')

      const content = posts.length > 0
        ? welcome + posts.map((post) => renderTerminalPost(post, true, cols)).join('\r\n') + '\r\n'
        : welcome

      terminal.setContent(content)
      // Only mark as shown if we have posts
      if (posts.length > 0) {
        hasShownWelcomeMessage = true
      }
    } else if (!isAuthenticated) {
      console.log('[useHomeLogic] Showing unauthenticated welcome, postsLength:', posts.length)
      const welcome = [
        asciiWelcome,
        '',
        posts.length > 0 ? yellow(`Showing ${posts.length} popular posts:`) : cyan('Loading popular posts...'),
        '',
      ].join('\r\n')

      const content = posts.length > 0
        ? welcome + posts.map((post) => renderTerminalPost(post, true, cols)).join('\r\n') + '\r\n'
        : welcome

      terminal.setContent(content)
      // Only mark as shown if we have posts
      if (posts.length > 0) {
        hasShownWelcomeMessage = true
      }
    } else {
      console.warn('[useHomeLogic] NOT showing welcome - conditions not met', {
        isAuthenticated,
        hasUser: !!user,
        postsLength: posts.length,
        hasXpProgress: !!xpProgress
      })
    }
  }, [isAuthenticated, user, posts, xpProgress, terminal])

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
