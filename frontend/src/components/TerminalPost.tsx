// Terminal-styled post display component

import type { PostWithAuthor } from '../../../shared/types'
import { green, cyan, yellow, magenta } from '../utils/ansi-colors'
import { getResponsiveWidth } from '../utils/responsive-width'

interface TerminalPostProps {
  post: PostWithAuthor
  showActions?: boolean
}

export function TerminalPost(_props: TerminalPostProps) {
  // This component is meant to be rendered by the Terminal
  // Use renderTerminalPost() function directly for terminal output
  return null
}

// Export render function for direct terminal usage
export function renderTerminalPost(
  post: PostWithAuthor,
  showActions: boolean = true,
  terminalCols: number = 80
): string {
  const width = getResponsiveWidth(terminalCols)
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

  // Image (if media_url exists) - use markdown format for custom terminal renderer
  if (post.media_url) {
    lines.push(`![Post image](${post.media_url})`)
    lines.push('')
  }

  // Engagement
  lines.push(cyan(`❤ ${post.like_count} likes  💬 ${post.comment_count} comments`))

  // Actions
  if (showActions) {
    lines.push('')
    lines.push(`${yellow('/like')} ${post.id.slice(0, 8)}  |  ${yellow('/comment')} ${post.id.slice(0, 8)} <text>`)
  }

  // Separator
  lines.push('─'.repeat(width))

  return lines.join('\r\n')
}
