// Terminal command parser and handler

import { useCallback } from 'react'
import type { Channel, FeedSortMode } from '../../../shared/types'

export interface TerminalCommand {
  name: string
  handler: (args: string[]) => Promise<string> | string
  description: string
  usage: string
}

interface UseTerminalCommandsOptions {
  onRegister?: (username: string, email: string, password: string) => Promise<void>
  onLogin?: (username: string, password: string) => Promise<void>
  on2FA?: (code: string) => Promise<void>
  onForgot?: (email: string) => Promise<void>
  onSettings?: (subcommand: string | undefined, args: string[]) => Promise<void>
  onPost?: (content: string, channel?: Channel) => Promise<void>
  onPostWithAttachment?: (content: string) => Promise<void>
  onUploadAvatar?: () => Promise<void>
  onUploadBanner?: () => Promise<void>
  onFeed?: (channel?: Channel, sort?: FeedSortMode, followingOnly?: boolean, page?: number) => Promise<void>
  onProfile?: (username?: string) => Promise<void>
  onLike?: (postId: string) => Promise<void>
  onComment?: (postId: string, content: string) => Promise<void>
  onShow?: (postId: string, pageArg?: string) => Promise<void>
  onFollow?: (username: string) => Promise<void>
  onUnfollow?: (username: string) => Promise<void>
  onStats?: () => Promise<void>
  onLevels?: () => Promise<void>
  onUnlocks?: () => Promise<void>
  onLogout?: () => Promise<void>
  onHelp?: () => void
  onClear?: () => void
}

export function useTerminalCommands(options: UseTerminalCommandsOptions = {}) {
  const commands: TerminalCommand[] = [
    {
      name: '/register',
      handler: async (args) => {
        if (args.length < 3) {
          return 'Usage: /register <username> <email> <password>'
        }
        const [username, email, password] = args
        if (options.onRegister) {
          await options.onRegister(username, email, password)
          return '' // Callback handles output
        }
        return `✓ Account created: ${username}`
      },
      description: 'Create a new account',
      usage: '/register <username> <email> <password>',
    },
    {
      name: '/login',
      handler: async (args) => {
        if (args.length < 2) {
          return 'Usage: /login <username> <password>'
        }
        const [username, password] = args
        if (options.onLogin) {
          await options.onLogin(username, password)
          return '' // Callback handles output
        }
        return `✓ Logged in as ${username}`
      },
      description: 'Login to your account',
      usage: '/login <username> <password>',
    },
    {
      name: '/2fa',
      handler: async (args) => {
        if (args.length === 0) {
          return 'Usage: /2fa <code>'
        }
        const code = args[0]
        if (options.on2FA) {
          await options.on2FA(code)
          return ''
        }
        return '✗ No 2FA challenge pending'
      },
      description: 'Enter 2FA code after login',
      usage: '/2fa <code>',
    },
    {
      name: '/forgot',
      handler: async (args) => {
        if (args.length === 0) {
          return 'Usage: /forgot <email>'
        }
        const email = args[0]
        if (options.onForgot) {
          await options.onForgot(email)
          return ''
        }
        return 'Password reset email sent (if account exists)'
      },
      description: 'Send password reset email',
      usage: '/forgot <email>',
    },
    {
      name: '/settings',
      handler: async (args) => {
        const subcommand = args[0]
        const subArgs = args.slice(1)
        if (options.onSettings) {
          await options.onSettings(subcommand, subArgs)
          return ''
        }
        return 'Use /settings to manage your account'
      },
      description: 'Manage account settings (email, 2FA, password)',
      usage: '/settings [2fa setup|2fa enable <code>|2fa disable <pass>|verify-email|password <old> <new>]',
    },
    {
      name: '/post',
      handler: async (args) => {
        if (args.length === 0) {
          return 'Usage: /post <content> [--channel <name>] [--attach]'
        }

        // Parse flags: --attach and --channel <name>
        const hasAttach = args.includes('--attach')
        let channel: Channel | undefined
        const cleanArgs: string[] = []

        for (let i = 0; i < args.length; i++) {
          if (args[i] === '--attach') continue
          if (args[i] === '--channel') {
            if (i + 1 < args.length) {
              channel = args[++i].replace(/^#/, '') as Channel
            }
            continue
          }
          cleanArgs.push(args[i])
        }

        const content = cleanArgs.join(' ')

        if (!content.trim()) {
          return 'Usage: /post <content> [--channel <name>] [--attach]'
        }

        if (hasAttach) {
          if (options.onPostWithAttachment) {
            await options.onPostWithAttachment(content)
            return ''
          }
          return '✗ Image uploads not configured'
        } else {
          if (options.onPost) {
            await options.onPost(content, channel)
            return ''
          }
          return '✓ Post created! +10 XP'
        }
      },
      description: 'Create a new post (optionally in a channel with --channel <name>)',
      usage: '/post <content> [--channel <name>] [--attach]',
    },
    {
      name: '/feed',
      handler: async (args) => {
        // Parse: /feed [#channel|discover] [--trending|--top|--new] [--following] [--page N]
        let channel: Channel | undefined
        let sort: FeedSortMode | undefined
        let followingOnly = false
        let page = 1

        for (let i = 0; i < args.length; i++) {
          const arg = args[i]
          if (arg === 'discover') {
            // backward compat alias — treat as trending sort, no channel
            sort = sort || 'trending'
          } else if (arg.startsWith('#')) {
            channel = arg.slice(1) as Channel
          } else if (arg === '--trending') {
            sort = 'trending'
          } else if (arg === '--top') {
            sort = 'top'
          } else if (arg === '--new') {
            sort = 'new'
          } else if (arg === '--following') {
            followingOnly = true
          } else if (arg === '--page') {
            const n = parseInt(args[i + 1], 10)
            if (!isNaN(n) && n >= 1) { page = n; i++ }
          }
        }

        if (options.onFeed) {
          await options.onFeed(channel, sort, followingOnly, page)
        }
        return ''
      },
      description: 'View feed, optionally filtered by channel and sort mode',
      usage: '/feed [#channel] [--trending|--top|--new] [--following] [--page N]',
    },
    {
      name: '/profile',
      handler: async (args) => {
        const username = args[0]
        if (options.onProfile) {
          await options.onProfile(username)
        }
        return username ? `Loading profile: ${username}` : 'Loading your profile...'
      },
      description: 'View character sheet profile',
      usage: '/profile [username]',
    },
    {
      name: '/like',
      handler: async (args) => {
        if (args.length === 0) {
          return 'Usage: /like <post_id>'
        }
        const postId = args[0]
        if (options.onLike) {
          await options.onLike(postId)
          return '' // Callback handles output
        }
        return '✓ Post liked! +1 XP'
      },
      description: 'Like a post',
      usage: '/like <post_id>',
    },
    {
      name: '/comment',
      handler: async (args) => {
        if (args.length < 2) {
          return 'Usage: /comment <post_id> <content>'
        }
        const [postId, ...contentParts] = args
        const content = contentParts.join(' ')
        if (options.onComment) {
          await options.onComment(postId, content)
          return '' // Callback handles output
        }
        return '✓ Comment posted! +5 XP'
      },
      description: 'Comment on a post',
      usage: '/comment <post_id> <content>',
    },
    {
      name: '/show',
      handler: async (args) => {
        if (args.length === 0) {
          return 'Usage: /show <post_id> [page|next|prev]'
        }
        const postId = args[0]
        const pageArg = args[1] // Can be page number, 'next', or 'prev'

        if (options.onShow) {
          await options.onShow(postId, pageArg)
          return '' // Callback handles output
        }
        return `Loading comments for post ${postId}...`
      },
      description: 'View comments on a post',
      usage: '/show <post_id> [page|next|prev]',
    },
    {
      name: '/follow',
      handler: async (args) => {
        if (args.length === 0) {
          return 'Usage: /follow <username>'
        }
        const username = args[0]
        if (options.onFollow) {
          await options.onFollow(username)
          return '' // Callback handles output
        }
        return `✓ Now following ${username}`
      },
      description: 'Follow a user',
      usage: '/follow <username>',
    },
    {
      name: '/unfollow',
      handler: async (args) => {
        if (args.length === 0) {
          return 'Usage: /unfollow <username>'
        }
        const username = args[0]
        if (options.onUnfollow) {
          await options.onUnfollow(username)
          return '' // Callback handles output
        }
        return `✓ Unfollowed ${username}`
      },
      description: 'Unfollow a user',
      usage: '/unfollow <username>',
    },
    {
      name: '/stats',
      handler: async () => {
        if (options.onStats) {
          await options.onStats()
        }
        return 'Loading stats...'
      },
      description: 'View your character stats',
      usage: '/stats',
    },
    {
      name: '/levels',
      handler: async () => {
        if (options.onLevels) {
          await options.onLevels()
        }
        return 'Loading level thresholds...'
      },
      description: 'View XP thresholds and level progression',
      usage: '/levels',
    },
    {
      name: '/unlocks',
      handler: async () => {
        if (options.onUnlocks) {
          await options.onUnlocks()
        }
        return 'Loading feature unlock roadmap...'
      },
      description: 'View feature unlock roadmap',
      usage: '/unlocks',
    },
    {
      name: '/avatar',
      handler: async () => {
        if (options.onUploadAvatar) {
          await options.onUploadAvatar()
          return '' // Callback handles output
        }
        return '✗ Avatar upload not configured'
      },
      description: 'Upload profile avatar (level 7+)',
      usage: '/avatar',
    },
    {
      name: '/banner',
      handler: async () => {
        if (options.onUploadBanner) {
          await options.onUploadBanner()
          return '' // Callback handles output
        }
        return '✗ Banner upload not configured'
      },
      description: 'Upload profile banner (level 7+)',
      usage: '/banner',
    },
    {
      name: '/logout',
      handler: async () => {
        if (options.onLogout) {
          await options.onLogout()
          return ''
        }
        return '✗ Not logged in'
      },
      description: 'Logout of your account',
      usage: '/logout',
    },
    {
      name: '/help',
      handler: () => {
        if (options.onHelp) {
          options.onHelp()
          return '' // onHelp callback already writes output
        }
        // Fallback if no onHelp provided
        return commands
          .map((cmd) => `${cmd.usage.padEnd(40)} - ${cmd.description}`)
          .join('\r\n')
      },
      description: 'Show this help message',
      usage: '/help',
    },
    {
      name: '/clear',
      handler: () => {
        if (options.onClear) {
          options.onClear()
        }
        return ''
      },
      description: 'Clear the terminal screen',
      usage: '/clear',
    },
  ]

  const executeCommand = useCallback(
    async (input: string): Promise<string> => {
      const [cmdName, ...args] = input.trim().split(/\s+/)

      const command = commands.find((cmd) => cmd.name === cmdName)

      if (!command) {
        return `✗ Unknown command: ${cmdName}\nType /help for available commands`
      }

      try {
        return await command.handler(args)
      } catch (error) {
        return `✗ Error: ${(error as Error).message}`
      }
    },
    [commands, options]
  )

  return {
    commands,
    executeCommand,
  }
}
