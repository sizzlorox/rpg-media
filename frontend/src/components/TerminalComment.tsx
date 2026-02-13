// Terminal-styled comment display component

import type { CommentWithAuthor } from '../../../shared/types'
import { green, cyan, yellow, magenta } from '../utils/ansi-colors'

// Format timestamp to relative time
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

// Render a single comment with author info and formatting
export function renderTerminalComment(comment: CommentWithAuthor): string {
  const lines: string[] = []

  // Author header with level badge and timestamp
  lines.push(`  ${green(`@${comment.author.username}`)} ${cyan(`[Lvl ${comment.author.level}]`)} • ${yellow(formatTimestamp(comment.created_at))}`)
  lines.push(`  ${magenta(`ID: ${comment.id.slice(0, 8)}`)}`)

  // Comment content (indented)
  lines.push(`  ${comment.content}`)

  return lines.join('\r\n')
}

// Render full comments view with header and footer
export function renderCommentsView(postId: string, comments: CommentWithAuthor[]): string {
  const lines: string[] = []
  const separator = '═'.repeat(60)
  const divider = '─'.repeat(60)

  // Header
  lines.push(separator)
  lines.push(`Comments on Post ${postId.slice(0, 8)}`)
  lines.push(separator)
  lines.push('')

  if (comments.length === 0) {
    // Empty state
    lines.push('No comments yet. Be the first to comment!')
    lines.push('')
    lines.push(`Use: ${yellow(`/comment ${postId.slice(0, 8)} <your comment>`)}`)
  } else {
    // Show comment count
    lines.push(`Showing ${comments.length} comment${comments.length === 1 ? '' : 's'}:`)
    lines.push('')

    // Render each comment with separator
    comments.forEach((comment, index) => {
      lines.push(renderTerminalComment(comment))

      // Add divider between comments (not after the last one)
      if (index < comments.length - 1) {
        lines.push('')
        lines.push(`  ${divider}`)
        lines.push('')
      }
    })
  }

  // Footer
  lines.push('')
  lines.push(separator)

  return lines.join('\r\n')
}
