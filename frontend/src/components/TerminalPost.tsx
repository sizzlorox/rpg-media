// Terminal-styled post display component

import { PostWithAuthor } from '../../../shared/types'
import { boxLine } from '../utils/ascii-art'
import { green, cyan, yellow, magenta } from '../utils/ansi-colors'

interface TerminalPostProps {
  post: PostWithAuthor
  showActions?: boolean
}

export function TerminalPost({ post, showActions = true }: TerminalPostProps) {
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const renderPost = (): string => {
    const lines: string[] = []

    // Header with author and timestamp
    const header = `${green(`@${post.author.username}`)} ${cyan(`[Lvl ${post.author.level}]`)} • ${yellow(formatTimestamp(post.created_at))}`
    lines.push(header)

    // Post ID (for liking/commenting)
    lines.push(magenta(`ID: ${post.id.slice(0, 8)}`))

    // Content
    lines.push('')
    lines.push(post.content)
    lines.push('')

    // Engagement stats
    const stats = `❤ ${post.like_count} likes  💬 ${post.comment_count} comments`
    lines.push(cyan(stats))

    // Actions
    if (showActions) {
      lines.push('')
      lines.push(`${yellow('/like')} ${post.id.slice(0, 8)}  |  ${yellow('/comment')} ${post.id.slice(0, 8)} <text>`)
    }

    // Separator
    lines.push('─'.repeat(60))

    return lines.join('\r\n')
  }

  // This component is meant to be rendered by the Terminal
  // In actual usage, you'd call terminal.write(renderPost())
  return null
}

// Export render function for direct terminal usage
export function renderTerminalPost(post: PostWithAuthor, showActions: boolean = true): string {
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const lines: string[] = []

  // Header
  lines.push(`${green(`@${post.author.username}`)} ${cyan(`[Lvl ${post.author.level}]`)} • ${yellow(formatTimestamp(post.created_at))}`)
  lines.push(magenta(`ID: ${post.id.slice(0, 8)}`))
  lines.push('')

  // Content
  lines.push(post.content)
  lines.push('')

  // Engagement
  lines.push(cyan(`❤ ${post.like_count} likes  💬 ${post.comment_count} comments`))

  // Actions
  if (showActions) {
    lines.push('')
    lines.push(`${yellow('/like')} ${post.id.slice(0, 8)}  |  ${yellow('/comment')} ${post.id.slice(0, 8)} <text>`)
  }

  // Separator
  lines.push('─'.repeat(60))

  return lines.join('\r\n')
}
