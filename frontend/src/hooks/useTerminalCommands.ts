// Terminal command parser and handler

import { useCallback } from 'react'

export interface TerminalCommand {
  name: string
  handler: (args: string[]) => Promise<string> | string
  description: string
  usage: string
}

interface UseTerminalCommandsOptions {
  onRegister?: (username: string, password: string) => Promise<void>
  onLogin?: (username: string, password: string) => Promise<void>
  onPost?: (content: string) => Promise<void>
  onFeed?: (subcommand?: string) => Promise<void>
  onProfile?: (username?: string) => Promise<void>
  onLike?: (postId: string) => Promise<void>
  onComment?: (postId: string, content: string) => Promise<void>
  onFollow?: (username: string) => Promise<void>
  onUnfollow?: (username: string) => Promise<void>
  onStats?: () => Promise<void>
  onLevels?: () => Promise<void>
  onUnlocks?: () => Promise<void>
  onHelp?: () => void
  onClear?: () => void
}

export function useTerminalCommands(options: UseTerminalCommandsOptions = {}) {
  const commands: TerminalCommand[] = [
    {
      name: '/register',
      handler: async (args) => {
        if (args.length < 2) {
          return 'Usage: /register <username> <password>'
        }
        const [username, password] = args
        if (options.onRegister) {
          await options.onRegister(username, password)
          return '' // Callback handles output
        }
        return `✓ Account created: ${username}`
      },
      description: 'Create a new account',
      usage: '/register <username> <password>',
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
      name: '/post',
      handler: async (args) => {
        if (args.length === 0) {
          return 'Usage: /post <content>'
        }
        const content = args.join(' ')
        if (options.onPost) {
          await options.onPost(content)
          return '' // Callback handles output
        }
        return '✓ Post created! +10 XP'
      },
      description: 'Create a new post',
      usage: '/post <content>',
    },
    {
      name: '/feed',
      handler: async (args) => {
        const subcommand = args[0] // Can be 'discover' or undefined
        if (options.onFeed) {
          await options.onFeed(subcommand)
        }
        return subcommand === 'discover' ? 'Loading popular posts...' : 'Loading feed...'
      },
      description: 'View your home feed or discover popular posts',
      usage: '/feed [discover]',
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
