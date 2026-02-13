// Man page styled post display component

import type { PostWithAuthor } from '../../../shared/types'
import { green, cyan, yellow, bold } from '../utils/ansi-colors'
import { wrapText, createTrendingBadge } from '../utils/man-page-formatter'
import { createLine } from '../utils/ascii-art'

interface ManPagePostProps {
  post: PostWithAuthor
  showRank?: number
  width?: number
}

/**
 * Renders a post in man page format (non-interactive component)
 * Use renderManPagePost() for terminal output string
 */
export function ManPagePost(_props: ManPagePostProps) {
  // This component is for type checking only
  // Use renderManPagePost() function directly for terminal output
  return null
}

/**
 * Renders a post in man page format for terminal display
 * @param post - Post with author data
 * @param showRank - Optional trending rank (1-10) to display badge
 * @param width - Terminal width (default 80)
 * @returns Formatted post string for terminal
 */
export function renderManPagePost(
  post: PostWithAuthor,
  showRank?: number,
  width: number = 80
): string {
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

  // Header line with author, level, timestamp, and optional trending badge
  const authorInfo = `${bold(`@${post.author.username}`)} ${cyan(`[Lvl ${post.author.level}]`)} • ${yellow(formatTimestamp(post.created_at))}`
  const trendingBadge = showRank ? `  ${createTrendingBadge(showRank)}` : ''
  lines.push(`     ${authorInfo}${trendingBadge}`)

  // Post ID line
  lines.push(`     ${cyan(`ID: ${post.id.slice(0, 8)}`)}`)
  lines.push('')

  // Content (wrapped to fit width with proper indentation)
  const wrappedContent = wrapText(post.content, width - 10, 5)
  lines.push(wrappedContent)
  lines.push('')

  // Engagement stats
  const engagement = `❤ ${post.like_count} likes  💬 ${post.comment_count} comments`
  lines.push(`     ${green(engagement)}`)
  lines.push('')

  // Separator
  lines.push(`     ${createLine(width - 10, '─')}`)

  return lines.join('\r\n')
}
