// Home page with terminal feed display

import { useState, useCallback, useEffect, useRef } from 'react'
import { Terminal } from '../components/Terminal'
import { renderTerminalPost } from '../components/TerminalPost'
import { renderTerminalXPBar } from '../components/TerminalXPBar'
import { renderLevelUpAnimation, getUnlockedFeatures } from '../components/LevelUpAnimation'
import { renderPaginatedCommentsView } from '../components/TerminalComment'
import { useComments } from '../hooks/useComments'
import { useAuth } from '../hooks/useAuth'
import { useFeed } from '../hooks/useFeed'
import { useCharacter } from '../hooks/useCharacter'
import { useTerminalCommands } from '../hooks/useTerminalCommands'
import { apiClient } from '../services/api-client'
import { green, yellow, red, cyan, magenta } from '../utils/ansi-colors'
import { getResponsiveWidth } from '../utils/responsive-width'
import type { CreatePostRequest } from '../../../shared/types'
import '../styles/terminal.css'

export function HomePage() {
  const { user, isAuthenticated, login, register } = useAuth()
  const { posts, loadDiscoveryFeed, loadHomeFeed } = useFeed()
  const { xpProgress, loadXPProgress, refreshCharacter } = useCharacter()
  const { pagination, loadComments, lastViewedPostId } = useComments()
  const [terminalOutput, setTerminalOutput] = useState<string>('')
  const terminalColsRef = useRef<number>(80) // Stores current terminal width

  const writeLine = useCallback((text: string) => {
    setTerminalOutput((prev) => prev + text + '\r\n')
  }, [])

  // Load initial feed and XP progress
  useEffect(() => {
    if (isAuthenticated) {
      loadHomeFeed()
      loadXPProgress()
    } else {
      loadDiscoveryFeed()
    }
  }, [isAuthenticated, loadHomeFeed, loadDiscoveryFeed, loadXPProgress])

  const handleRegister = useCallback(
    async (username: string, password: string) => {
      try {
        await register(username, password)
        writeLine(green(`✓ Account created: ${username}`))
        writeLine(yellow('You are now logged in!'))
        await loadHomeFeed()
        await loadXPProgress()
      } catch (error) {
        writeLine(red(`✗ Failed to register: ${(error as Error).message}`))
      }
    },
    [register, writeLine, loadHomeFeed, loadXPProgress]
  )

  const handleLogin = useCallback(
    async (username: string, password: string) => {
      try {
        await login(username, password)
        writeLine(green(`✓ Logged in as ${username}`))
        await loadHomeFeed()
        await loadXPProgress()
      } catch (error) {
        writeLine(red(`✗ Failed to login: ${(error as Error).message}`))
      }
    },
    [login, writeLine, loadHomeFeed, loadXPProgress]
  )

  const handlePost = useCallback(
    async (content: string) => {
      if (!isAuthenticated || !user) {
        writeLine(red('✗ You must be logged in to post'))
        return
      }

      try {
        const body: CreatePostRequest = { content }
        const result = await apiClient.post<any>('/posts', body)

        writeLine(green('✓ Post created!'))
        writeLine(yellow(`+${result.xp_awarded} XP`))

        if (result.level_up) {
          writeLine('')
          const newLevel = user.level + 1
          const unlockedFeatures = getUnlockedFeatures(newLevel)
          writeLine(renderLevelUpAnimation(newLevel, unlockedFeatures, terminalColsRef.current))
          writeLine('')
        }

        // Refresh feed and XP progress
        await Promise.all([loadHomeFeed(), refreshCharacter()])
      } catch (error) {
        writeLine(red(`✗ Failed to create post: ${(error as Error).message}`))
      }
    },
    [isAuthenticated, user, writeLine, loadHomeFeed]
  )

  const handleLike = useCallback(
    async (postId: string) => {
      if (!isAuthenticated) {
        writeLine(red('✗ You must be logged in to like posts'))
        return
      }

      try {
        const result = await apiClient.post<any>(`/posts/${postId}/like`, {})
        writeLine(green('✓ Post liked!'))
        writeLine(yellow(`+${result.xp_awarded.liker} XP (you), +${result.xp_awarded.creator} XP (creator)`))

        if (result.level_up.liker && user) {
          writeLine('')
          const newLevel = user.level + 1
          const unlockedFeatures = getUnlockedFeatures(newLevel)
          writeLine(renderLevelUpAnimation(newLevel, unlockedFeatures, terminalColsRef.current))
          writeLine('')
        }

        // Refresh feed and XP progress
        await Promise.all([loadHomeFeed(), refreshCharacter()])
      } catch (error) {
        writeLine(red(`✗ Failed to like post: ${(error as Error).message}`))
      }
    },
    [isAuthenticated, writeLine, loadHomeFeed]
  )

  const handleComment = useCallback(
    async (postId: string, content: string) => {
      if (!isAuthenticated) {
        writeLine(red('✗ You must be logged in to comment on posts'))
        return
      }

      try {
        const result = await apiClient.post<any>(`/posts/${postId}/comments`, { content })
        writeLine(green('✓ Comment posted!'))
        writeLine(yellow(`+${result.xp_awarded.commenter} XP (you), +${result.xp_awarded.creator} XP (creator)`))

        if (result.level_up.commenter && user) {
          writeLine('')
          const newLevel = user.level + 1
          const unlockedFeatures = getUnlockedFeatures(newLevel)
          writeLine(renderLevelUpAnimation(newLevel, unlockedFeatures, terminalColsRef.current))
          writeLine('')
        }

        // Refresh feed and XP progress
        await Promise.all([loadHomeFeed(), refreshCharacter()])
      } catch (error) {
        writeLine(red(`✗ Failed to comment on post: ${(error as Error).message}`))
      }
    },
    [isAuthenticated, user, writeLine, loadHomeFeed, refreshCharacter]
  )

  const handleFollow = useCallback(
    async (username: string) => {
      if (!isAuthenticated) {
        writeLine(red('✗ You must be logged in to follow users'))
        return
      }

      try {
        const result = await apiClient.post<any>(`/users/${username}/follow`, {})
        writeLine(green(`✓ Now following @${username}!`))
        writeLine(yellow(`They received +${result.xp_awarded} XP`))

        if (result.level_up) {
          writeLine(cyan(`@${username} leveled up!`))
        }
      } catch (error) {
        writeLine(red(`✗ Failed to follow user: ${(error as Error).message}`))
      }
    },
    [isAuthenticated, writeLine]
  )

  const handleUnfollow = useCallback(
    async (username: string) => {
      if (!isAuthenticated) {
        writeLine(red('✗ You must be logged in to unfollow users'))
        return
      }

      try {
        await apiClient.delete(`/users/${username}/follow`)
        writeLine(green(`✓ Unfollowed @${username}`))
      } catch (error) {
        writeLine(red(`✗ Failed to unfollow user: ${(error as Error).message}`))
      }
    },
    [isAuthenticated, writeLine]
  )

  const handleLevels = useCallback(async () => {
    try {
      writeLine(cyan('Level Progression Table'))
      writeLine(cyan('═'.repeat(60)))
      writeLine('')

      const result = await apiClient.get<{ thresholds: Array<{ level: number; xp_required: number; features_unlocked: string | null }> }>('/levels/thresholds')

      writeLine(yellow('Level | XP Required | Feature Unlocked'))
      writeLine('─'.repeat(60))

      result.thresholds.forEach((threshold) => {
        const levelStr = threshold.level.toString().padEnd(5)
        const xpStr = threshold.xp_required.toString().padEnd(11)
        const featureStr = threshold.features_unlocked || '-'
        writeLine(`${green(levelStr)} | ${cyan(xpStr)} | ${magenta(featureStr)}`)
      })

      writeLine('')
      writeLine(yellow('Earn XP by: Posting (+10), Liking (+1), Commenting (+5), Being Followed (+5)'))
    } catch (error) {
      writeLine(red(`✗ Failed to load levels: ${(error as Error).message}`))
    }
  }, [writeLine])

  const handleProfile = useCallback(async (username?: string) => {
    try {
      const endpoint = username ? `/users/${username}` : '/auth/me'
      const profile = await apiClient.get<any>(endpoint)

      // Import and render character sheet
      const { renderASCIICharacterSheet } = await import('../components/ASCIICharacterSheet')
      const sheet = renderASCIICharacterSheet(profile, terminalColsRef.current)
      writeLine(sheet)
    } catch (error) {
      writeLine(red(`✗ Failed to load profile: ${(error as Error).message}`))
    }
  }, [writeLine])

  const handleShow = useCallback(async (postId: string, pageArg?: string) => {
    try {
      // Parse pageArg to determine the page to load
      let page = 1

      if (pageArg) {
        if (pageArg === 'next') {
          // Only allow 'next' if we have a matching lastViewedPostId
          if (lastViewedPostId === postId && pagination) {
            if (pagination.has_more) {
              page = pagination.page + 1
            } else {
              writeLine(yellow('You are on the last page.'))
              return
            }
          } else {
            writeLine(yellow('Tip: View a post first with /show <post_id> to use next/prev'))
            return
          }
        } else if (pageArg === 'prev') {
          // Only allow 'prev' if we have a matching lastViewedPostId
          if (lastViewedPostId === postId && pagination) {
            if (pagination.has_previous) {
              page = pagination.page - 1
            } else {
              writeLine(yellow('You are on the first page.'))
              return
            }
          } else {
            writeLine(yellow('Tip: View a post first with /show <post_id> to use next/prev'))
            return
          }
        } else {
          // Try to parse as a page number
          const parsedPage = parseInt(pageArg, 10)
          if (isNaN(parsedPage) || parsedPage < 1) {
            writeLine(red('Invalid page number. Must be a positive integer.'))
            return
          }
          page = parsedPage
        }
      }

      writeLine(cyan(`Loading comments for post ${postId.slice(0, 8)}${page > 1 ? ` (page ${page})` : ''}...`))
      writeLine('')

      const result = await loadComments(postId, page)

      if (result) {
        const commentsView = renderPaginatedCommentsView(
          postId,
          result.comments,
          result.pagination,
          terminalColsRef.current
        )
        writeLine(commentsView)
      } else {
        writeLine(red('Failed to load comments.'))
      }
    } catch (error) {
      writeLine(red(`✗ Failed to load comments: ${(error as Error).message}`))
    }
  }, [writeLine, loadComments, pagination, lastViewedPostId])

  const handleUnlocks = useCallback(async () => {
    if (!user) {
      writeLine(yellow('Log in to see your feature unlock progress'))
      return
    }

    try {
      // Import and render feature roadmap
      const { renderFeatureRoadmap } = await import('../components/FeatureLock')
      const roadmap = renderFeatureRoadmap(user.level, terminalColsRef.current)
      writeLine(roadmap)
    } catch (error) {
      writeLine(red(`✗ Failed to load unlocks: ${(error as Error).message}`))
    }
  }, [user, writeLine])

  const handleFeed = useCallback(async (subcommand?: string) => {
    if (subcommand === 'discover') {
      // Load discover feed for authenticated users
      writeLine(cyan('Loading popular posts...'))
      await loadDiscoveryFeed()

      if (posts.length === 0) {
        writeLine(yellow('No posts to display'))
      } else {
        writeLine('')
        writeLine(green(`Showing ${posts.length} popular posts:`))
        writeLine('')
        posts.forEach((post) => {
          writeLine(renderTerminalPost(post, true, terminalColsRef.current))
        })
      }
    } else {
      // Default behavior: home feed for authenticated, discover for unauthenticated
      writeLine(cyan('Loading feed...'))

      if (isAuthenticated) {
        await loadHomeFeed()
      } else {
        await loadDiscoveryFeed()
      }

      if (posts.length === 0) {
        writeLine(yellow('No posts to display'))
        if (isAuthenticated) {
          writeLine('')
          writeLine('Follow some users to see their posts in your feed!')
          writeLine('Or use /feed discover to see popular posts')
        }
      } else {
        writeLine('')
        writeLine(green(`Showing ${posts.length} posts:`))
        writeLine('')
        posts.forEach((post) => {
          writeLine(renderTerminalPost(post, true, terminalColsRef.current))
        })
      }
    }
  }, [isAuthenticated, posts, loadHomeFeed, loadDiscoveryFeed, writeLine])

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
      writeLine(yellow('Available commands:'))
      writeLine('')
      writeLine(cyan('Account:'))
      writeLine('  /register <username> <password>  - Create new account')
      writeLine('  /login <username> <password>     - Login to account')
      writeLine('')
      writeLine(cyan('Social:'))
      writeLine('  /post <content>                  - Create a new post')
      writeLine('  /feed [discover]                 - Refresh feed or view popular posts')
      writeLine('  /like <post_id>                  - Like a post')
      writeLine('  /comment <post_id> <text>        - Comment on a post')
      writeLine('  /show <post_id> [page]           - View comments on a post (paginated)')
      writeLine('  /follow <username>               - Follow a user')
      writeLine('  /unfollow <username>             - Unfollow a user')
      writeLine('')
      writeLine(cyan('Progression:'))
      writeLine('  /profile [username]              - View character sheet')
      writeLine('  /stats                           - View your stats')
      writeLine('  /levels                          - View level thresholds')
      writeLine('  /unlocks                         - View feature unlocks')
      writeLine('')
      writeLine(cyan('Utility:'))
      writeLine('  /help                            - Show this help')
      writeLine('  /clear                           - Clear terminal')
    },
    onClear: () => {
      setTerminalOutput('')
    },
  })

  const handleCommand = useCallback(
    async (command: string, terminalCols: number = 80) => {
      // Store terminal width for use in handlers
      terminalColsRef.current = terminalCols

      // Mask password in echoed command
      let displayCommand = command
      const parts = command.trim().split(' ')
      const cmd = parts[0].toLowerCase()

      if ((cmd === '/login' || cmd === '/register') && parts.length >= 3) {
        // Replace password (3rd argument) with asterisks
        const maskedParts = [...parts]
        maskedParts[2] = '*'.repeat(parts[2].length)
        displayCommand = maskedParts.join(' ')
      }

      writeLine(`> ${displayCommand}`)
      const result = await executeCommand(command)
      if (result) {
        writeLine(result)
      }
    },
    [executeCommand, writeLine]
  )

  // Display welcome message and initial feed
  useEffect(() => {
    if (user && posts.length > 0 && xpProgress) {
      const cols = terminalColsRef.current || 80
      const width = getResponsiveWidth(cols)

      const xpBar = renderTerminalXPBar(
        xpProgress.current_level,
        xpProgress.total_xp,
        xpProgress.xp_for_next_level,
        xpProgress.progress_percent,
        cols
      )

      const welcome = [
        green('═'.repeat(width)),
        green('Welcome to Social Forge!'),
        xpBar,
        green('═'.repeat(width)),
        '',
        yellow(`Showing ${posts.length} posts:`),
        '',
      ].join('\r\n')

      setTerminalOutput(
        welcome +
          posts.map((post) => renderTerminalPost(post, true, cols)).join('\r\n') +
          '\r\n'
      )
    }
  }, [user, posts, xpProgress])

  return (
    <div className="home-page">
      <Terminal onCommand={handleCommand} initialContent={terminalOutput} />
    </div>
  )
}
