// Public landing page with man page aesthetic

import { useState, useCallback, useEffect, useRef } from 'react'
import { Terminal } from '../components/Terminal'
import { renderManPagePost } from '../components/ManPagePost'
import { usePublicFeed } from '../hooks/usePublicFeed'
import { useAuth } from '../hooks/useAuth'
import { apiClient } from '../services/api-client'
import {
  createManPageHeader,
  createManPageFooter,
  createSectionHeader,
  indentText,
  formatCommandSynopsis,
  getManPageDate,
} from '../utils/man-page-formatter'
import { createDoubleLine } from '../utils/ascii-art'
import { green, yellow, red, cyan, bold } from '../utils/ansi-colors'
import { getResponsiveWidth } from '../utils/responsive-width'
import { getResponsiveConfig } from '../utils/terminal-responsive'
import { renderWelcomeMessage } from '../utils/welcome-message'
import type { LogoType } from '../utils/ascii-logo'

export function Landing() {
  const { recentPosts, trendingPosts, isLoading, error, hasMore, loadMore, refresh } = usePublicFeed()
  const { login, register, forgotPassword, isAuthenticated } = useAuth()
  const [terminalOutput, setTerminalOutput] = useState<string>('')

  // Initialize cols from actual viewport width, not a hardcoded 80
  const [terminalCols, setTerminalCols] = useState<number>(() => {
    const cfg = getResponsiveConfig(typeof window !== 'undefined' ? window.innerWidth : 1024)
    return cfg.config.minCols
  })
  const terminalColsRef = useRef<number>(terminalCols)
  const previousBreakpointRef = useRef<'mobile' | 'tablet' | 'desktop' | null>(
    getResponsiveConfig(typeof window !== 'undefined' ? window.innerWidth : 1024).breakpoint
  )

  const writeLine = useCallback((text: string) => {
    setTerminalOutput((prev) => prev + text + '\r\n')
  }, [])

  // Listen for window resize to rebuild man page on breakpoint transitions
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth
      const responsiveConfig = getResponsiveConfig(newWidth)
      const newBreakpoint = responsiveConfig.breakpoint
      const newCols = responsiveConfig.config.minCols

      // Trigger man page rebuild only on breakpoint transition
      if (previousBreakpointRef.current &&
          previousBreakpointRef.current !== newBreakpoint) {
        terminalColsRef.current = newCols
        setTerminalCols(newCols)
      }
      previousBreakpointRef.current = newBreakpoint
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Build initial man page content (responsive)
  useEffect(() => {
    const lines: string[] = []
    const cols = terminalCols
    const width = getResponsiveWidth(cols)

    // Determine logo type based on terminal columns (same logic as terminal-responsive.ts)
    const logoType: LogoType = cols <= 40 ? 'compact' : cols <= 60 ? 'medium' : 'full'

    // Prepend welcome banner
    const welcomeBanner = renderWelcomeMessage(cols, logoType)
    lines.push(welcomeBanner)
    lines.push('') // Empty line separator

    // Top border
    lines.push(green(createDoubleLine(width)))

    // Header
    lines.push(createManPageHeader('SOCIALFORGE', 1, width))
    lines.push('')

    // NAME section
    lines.push(createSectionHeader('NAME'))
    lines.push(indentText('socialforge - Level up through engagement'))
    lines.push('')

    // SYNOPSIS section
    lines.push(createSectionHeader('SYNOPSIS'))
    lines.push(indentText(formatCommandSynopsis('/register', '<username> <email> <password>')))
    lines.push(indentText(formatCommandSynopsis('/login', '<username> <password>')))
    lines.push(indentText(formatCommandSynopsis('/post', '<content>')))
    lines.push('')

    // DESCRIPTION section
    lines.push(createSectionHeader('DESCRIPTION'))
    lines.push(indentText('A social media platform where your profile is your character. Earn XP'))
    lines.push(indentText('through posts, likes, comments, and followers. Level up to unlock new'))
    lines.push(indentText('features like media uploads, custom themes, and profile customization.'))
    lines.push('')

    // RECENT POSTS section
    lines.push(createSectionHeader('RECENT POSTS'))
    lines.push(indentText(green(createDoubleLine(Math.max(width - 10, 20)))))
    lines.push('')

    // Handle loading state
    if (isLoading) {
      lines.push(indentText(yellow('Loading feed...')))
      lines.push('')
    }
    // Handle error state
    else if (error) {
      lines.push(indentText(red(`Error: ${error}`)))
      lines.push(indentText(yellow('Try typing /feed to refresh')))
      lines.push('')
    }
    // Handle empty state
    else if (recentPosts.length === 0) {
      lines.push(indentText(yellow('No posts available')))
      lines.push(indentText('Be the first to post! Use /register to create an account.'))
      lines.push('')
    }
    // Display posts
    else {
      recentPosts.forEach((post) => {
        lines.push(renderManPagePost(post, undefined, cols))
        lines.push('')
      })

      if (hasMore) {
        lines.push(indentText(yellow('Use /feed more to load additional posts')))
        lines.push('')
      }
    }

    // TRENDING THIS WEEK section
    lines.push(createSectionHeader('TRENDING THIS WEEK'))
    lines.push(indentText(green(createDoubleLine(Math.max(width - 10, 20)))))
    lines.push('')

    if (isLoading) {
      lines.push(indentText(yellow('Loading trending posts...')))
      lines.push('')
    } else if (error) {
      lines.push(indentText(red('Unable to load trending posts')))
      lines.push('')
    } else if (trendingPosts.length > 0) {
      trendingPosts.slice(0, 10).forEach((post, index) => {
        lines.push(renderManPagePost(post, index + 1, cols))
        lines.push('')
      })
    } else {
      lines.push(indentText(yellow('No trending posts this week')))
      lines.push('')
    }

    // COMMANDS section
    lines.push(createSectionHeader('COMMANDS'))
    lines.push('')
    lines.push(indentText(bold('Account Management')))
    lines.push(indentText('/register <username> <email> <password>  Create new account', 10))
    lines.push(indentText('/login <username> <password>       Login to account', 10))
    lines.push('')
    lines.push(indentText(bold('Social Actions (requires authentication)')))
    lines.push(indentText('/post <content>                    Create a post (+10 XP)', 10))
    lines.push(indentText('/like <post_id>                    Like a post (+1 XP)', 10))
    lines.push(indentText('/comment <post_id> <text>          Comment on post (+5 XP)', 10))
    lines.push('')
    lines.push(indentText(bold('Information')))
    lines.push(indentText('/help                              Show all commands', 10))
    lines.push(indentText('/levels                            View level progression', 10))
    lines.push(indentText('/profile <username>                View user profile', 10))
    lines.push(indentText('/feed more                         Load more posts', 10))
    lines.push('')

    // SEE ALSO section
    lines.push(createSectionHeader('SEE ALSO'))
    lines.push(indentText('Apogee Forge: https://apogeeforge.com'))
    lines.push(indentText('Documentation: /help'))
    lines.push('')

    // Footer
    lines.push(createManPageFooter('SOCIALFORGE', getManPageDate(), width))
    lines.push(green(createDoubleLine(width)))
    lines.push('')

    setTerminalOutput(lines.join('\r\n'))
  }, [recentPosts, trendingPosts, isLoading, error, hasMore, terminalCols])

  const handleCommand = useCallback(
    async (command: string, cols: number = 80) => {
      // Update terminal width if it changed (triggers man page rebuild)
      if (terminalColsRef.current !== cols) {
        terminalColsRef.current = cols
        setTerminalCols(cols)
      }

      const parts = command.trim().split(' ')
      const cmd = parts[0].toLowerCase()

      // Mask password in echoed command
      let displayCommand = command
      if (cmd === '/login' && parts.length >= 3) {
        const maskedParts = [...parts]
        maskedParts[2] = '*'.repeat(parts[2].length)
        displayCommand = maskedParts.join(' ')
      } else if (cmd === '/register' && parts.length >= 4) {
        // /register <username> <email> <password>  — password is index 3
        const maskedParts = [...parts]
        maskedParts[3] = '*'.repeat(parts[3].length)
        displayCommand = maskedParts.join(' ')
      }

      writeLine(`> ${displayCommand}`)

      try {
        // Handle public commands
        switch (cmd) {
          case '/help':
            writeLine(yellow('Available commands:'))
            writeLine('')
            writeLine(cyan('Account:'))
            writeLine('  /register <username> <email> <pass>  - Create new account')
            writeLine('  /login <username> <password>         - Login to account')
            writeLine('  /forgot <email>                      - Send password reset email')
            writeLine('')
            writeLine(cyan('Information (public):'))
            writeLine('  /help                            - Show this help')
            writeLine('  /levels                          - View level thresholds')
            writeLine('  /profile <username>              - View user profile')
            writeLine('  /feed more                       - Load more posts')
            writeLine('')
            writeLine(cyan('Social Actions (requires authentication):'))
            writeLine('  /post <content>                  - Create a post')
            writeLine('  /like <post_id>                  - Like a post')
            writeLine('  /comment <post_id> <text>        - Comment on a post')
            writeLine('')
            writeLine(yellow('Login or register to unlock social features!'))
            break

          case '/register':
            if (parts.length < 4) {
              writeLine(red('✗ Usage: /register <username> <email> <password>'))
              return
            }
            try {
              await register(parts[1], parts[2], parts[3])
              writeLine(green(`✓ Account created: ${parts[1]}`))
              writeLine(yellow('Check your email to verify before posting.'))
              writeLine(yellow('Redirecting to feed...'))
              // Auth state change will trigger transition to Home
            } catch (error) {
              writeLine(red(`✗ Failed to register: ${(error as Error).message}`))
            }
            break

          case '/login':
            if (parts.length < 3) {
              writeLine(red('✗ Usage: /login <username> <password>'))
              return
            }
            try {
              await login(parts[1], parts[2])
              writeLine(green(`✓ Logged in as ${parts[1]}`))
              writeLine(yellow('Redirecting to feed...'))
              // Auth state change will trigger transition to Home
            } catch (error) {
              writeLine(red(`✗ Failed to login: ${(error as Error).message}`))
            }
            break

          case '/levels':
            writeLine(cyan('Level Progression Table'))
            writeLine(cyan('═'.repeat(Math.min(60, cols - 2))))
            writeLine('')

            const result = await apiClient.get<{ thresholds: Array<{ level: number; xp_required: number; features_unlocked: string | null }> }>('/levels/thresholds')

            writeLine(yellow('Level | XP Required | Feature Unlocked'))
            writeLine('─'.repeat(Math.min(60, cols - 2)))

            result.thresholds.forEach((threshold) => {
              const levelStr = threshold.level.toString().padEnd(5)
              const xpStr = threshold.xp_required.toString().padEnd(11)
              const featureStr = threshold.features_unlocked || '-'
              writeLine(`${green(levelStr)} | ${cyan(xpStr)} | ${yellow(featureStr)}`)
            })

            writeLine('')
            writeLine(yellow('Earn XP by: Posting (+10), Liking (+1), Commenting (+5), Being Followed (+5)'))
            break

          case '/profile':
            if (parts.length < 2) {
              writeLine(red('✗ Usage: /profile <username>'))
              return
            }
            try {
              const profile = await apiClient.get<any>(`/users/${parts[1]}`)
              const { renderASCIICharacterSheet } = await import('../components/ASCIICharacterSheet')
              const sheet = renderASCIICharacterSheet(profile, cols)
              writeLine(sheet)
            } catch (error) {
              writeLine(red(`✗ Failed to load profile: ${(error as Error).message}`))
            }
            break

          case '/feed':
            if (parts[1] === 'more') {
              writeLine(cyan('Loading more posts...'))
              await loadMore()
              writeLine(green('✓ Loaded more posts'))
            } else {
              writeLine(cyan('Refreshing feed...'))
              await refresh()
              writeLine(green('✓ Feed refreshed'))
            }
            break

          case '/forgot':
            if (parts.length < 2) {
              writeLine(red('✗ Usage: /forgot <email>'))
              return
            }
            try {
              await forgotPassword(parts[1])
            } catch {
              // ignore errors — always show success to avoid enumeration
            }
            writeLine(green('✓ If an account with that email exists, a reset link has been sent.'))
            break

          // Auth-gated commands
          case '/post':
          case '/like':
          case '/comment':
          case '/follow':
          case '/unfollow':
            writeLine(red('✗ Authentication required. Use /login or /register to continue.'))
            writeLine('')
            writeLine(yellow('Commands:'))
            writeLine('  /register <username> <email> <password>  Create new account')
            writeLine('  /login <username> <password>             Login to existing account')
            break

          case '/clear':
            setTerminalOutput('')
            break

          default:
            writeLine(red(`✗ Unknown command: ${cmd}`))
            writeLine(yellow('Type /help to see available commands'))
        }
      } catch (error) {
        writeLine(red(`✗ Error: ${(error as Error).message}`))
      }
    },
    [writeLine, register, login, forgotPassword, loadMore, refresh]
  )

  return (
    <div className="landing-page">
      <Terminal onCommand={handleCommand} initialContent={terminalOutput} skipWelcome={true} />
    </div>
  )
}
