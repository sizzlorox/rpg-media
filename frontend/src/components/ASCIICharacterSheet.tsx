// ASCII Character Sheet component for user profiles

import { green, cyan, yellow, magenta } from '../utils/ansi-colors'
import { renderTerminalXPBar } from './TerminalXPBar'
import type { UserProfile } from '../../../shared/types'

interface ASCIICharacterSheetProps {
  profile: UserProfile
}

export function ASCIICharacterSheet(_props: ASCIICharacterSheetProps) {
  return null // This component is meant for terminal rendering
}

// Export render function for direct terminal usage
export function renderASCIICharacterSheet(profile: UserProfile): string {
  const lines: string[] = []

  const width = 70
  const border = '═'.repeat(width)

  // Top border
  lines.push(green('╔' + border + '╗'))

  // Empty line
  lines.push(green('║') + ' '.repeat(width) + green('║'))

  // Title
  const title = 'CHARACTER SHEET'
  const titlePadding = Math.floor((width - title.length) / 2)
  lines.push(
    green('║') +
    ' '.repeat(titlePadding) +
    cyan(title) +
    ' '.repeat(width - titlePadding - title.length) +
    green('║')
  )

  // Empty line
  lines.push(green('║') + ' '.repeat(width) + green('║'))

  // Separator
  lines.push(green('╠' + border + '╣'))

  // Character Name
  const nameLabel = '  Name: '
  const nameValue = `@${profile.username}`
  lines.push(
    green('║') +
    yellow(nameLabel) +
    magenta(nameValue) +
    ' '.repeat(width - nameLabel.length - nameValue.length) +
    green('║')
  )

  // Level
  const levelLabel = '  Level: '
  const levelValue = profile.level.toString()
  lines.push(
    green('║') +
    yellow(levelLabel) +
    cyan(levelValue) +
    ' '.repeat(width - levelLabel.length - levelValue.length) +
    green('║')
  )

  // XP Progress Bar
  const xpBarLabel = '  XP: '
  const xpBar = renderTerminalXPBar(
    profile.level,
    profile.total_xp,
    profile.xp_for_next_level,
    profile.xp_progress_percent
  )
  // Remove ANSI color codes for length calculation
  const xpBarLength = xpBar.replace(/\x1b\[[0-9;]*m/g, '').length
  lines.push(
    green('║') +
    yellow(xpBarLabel) +
    xpBar +
    ' '.repeat(Math.max(0, width - xpBarLabel.length - xpBarLength)) +
    green('║')
  )

  // Empty line
  lines.push(green('║') + ' '.repeat(width) + green('║'))

  // Stats Section
  lines.push(green('║') + cyan('  STATS'.padEnd(width)) + green('║'))
  lines.push(green('║') + '─'.repeat(width) + green('║'))

  // Stats table
  const stats = [
    { label: 'Posts Created', value: profile.total_posts },
    { label: 'Likes Given', value: profile.total_likes_given },
    { label: 'Likes Received', value: profile.total_likes_received },
    { label: 'Comments Made', value: profile.total_comments_made },
    { label: 'Followers', value: profile.followers_count },
    { label: 'Following', value: profile.following_count },
  ]

  stats.forEach((stat) => {
    lines.push(
      green('║') +
      '  ' +
      yellow(stat.label.padEnd(20)) +
      cyan(stat.value.toString().padStart(8)) +
      ' '.repeat(Math.max(0, width - 32)) +
      green('║')
    )
  })

  // Empty line
  lines.push(green('║') + ' '.repeat(width) + green('║'))

  // Member Since
  const memberSince = new Date(profile.created_at).toLocaleDateString()
  const memberLabel = '  Member Since: '
  lines.push(
    green('║') +
    yellow(memberLabel) +
    cyan(memberSince) +
    ' '.repeat(width - memberLabel.length - memberSince.length) +
    green('║')
  )

  // Bio (if exists)
  if (profile.bio) {
    lines.push(green('║') + ' '.repeat(width) + green('║'))
    lines.push(green('║') + cyan('  BIO'.padEnd(width)) + green('║'))
    lines.push(green('║') + '─'.repeat(width) + green('║'))

    // Wrap bio text to fit within border
    const bioMaxWidth = width - 4
    const bioWords = profile.bio.split(' ')
    let bioLine = '  '

    bioWords.forEach((word) => {
      if (bioLine.length + word.length + 1 > bioMaxWidth) {
        lines.push(
          green('║') +
          '  ' +
          bioLine.trim().padEnd(width - 2) +
          green('║')
        )
        bioLine = '  ' + word + ' '
      } else {
        bioLine += word + ' '
      }
    })

    if (bioLine.trim().length > 0) {
      lines.push(
        green('║') +
        '  ' +
        bioLine.trim().padEnd(width - 2) +
        green('║')
      )
    }
  }

  // Empty line
  lines.push(green('║') + ' '.repeat(width) + green('║'))

  // Bottom border
  lines.push(green('╚' + border + '╝'))

  return lines.join('\r\n')
}
