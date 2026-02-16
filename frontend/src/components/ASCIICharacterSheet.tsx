// ASCII Character Sheet component for user profiles

import { green, cyan, yellow, magenta } from '../utils/ansi-colors'
import { renderTerminalXPBar } from './TerminalXPBar'
import { getResponsiveBoxWidth, centerInBox } from '../utils/responsive-width'
import { renderImageFrame } from '../utils/upload-ui'
import type { UserProfile } from '../../../shared/types'

interface ASCIICharacterSheetProps {
  profile: UserProfile
}

export function ASCIICharacterSheet(_props: ASCIICharacterSheetProps) {
  return null // This component is meant for terminal rendering
}

// Export render function for direct terminal usage
export function renderASCIICharacterSheet(
  profile: UserProfile,
  terminalCols: number = 80
): string {
  const lines: string[] = []

  const width = getResponsiveBoxWidth(terminalCols)
  const border = '═'.repeat(width)

  // Adjust column widths based on box size
  const labelWidth = width >= 60 ? 20 : 15  // Narrower labels on mobile
  const valueWidth = 8

  // Top border
  lines.push(green('╔' + border + '╗'))

  // Empty line
  lines.push(green('║') + ' '.repeat(width) + green('║'))

  // Title
  const title = 'CHARACTER SHEET'
  const centeredTitle = centerInBox(cyan(title), width)
  lines.push(green('║') + centeredTitle + green('║'))

  // Empty line
  lines.push(green('║') + ' '.repeat(width) + green('║'))

  // Banner (if exists)
  if (profile.banner_url) {
    const bannerFrame = renderImageFrame(profile.banner_url, 'Profile banner', terminalCols)
    const bannerLines = bannerFrame.split('\r\n')
    bannerLines.forEach(line => {
      const lineLength = line.replace(/\x1b\[[0-9;]*m/g, '').length
      lines.push(
        green('║') +
        ' '.repeat(2) +
        line +
        ' '.repeat(Math.max(0, width - lineLength - 2)) +
        green('║')
      )
    })
    lines.push(green('║') + ' '.repeat(width) + green('║'))
  }

  // Separator
  lines.push(green('╠' + border + '╣'))

  // Avatar (if exists)
  if (profile.avatar_url) {
    const avatarFrame = renderImageFrame(profile.avatar_url, 'Avatar', terminalCols)
    const avatarLines = avatarFrame.split('\r\n')
    avatarLines.forEach(line => {
      const lineLength = line.replace(/\x1b\[[0-9;]*m/g, '').length
      lines.push(
        green('║') +
        ' '.repeat(2) +
        line +
        ' '.repeat(Math.max(0, width - lineLength - 2)) +
        green('║')
      )
    })
    lines.push(green('║') + ' '.repeat(width) + green('║'))
  }

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
    profile.xp_progress_percent,
    terminalCols
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
    const totalStatWidth = labelWidth + valueWidth + 2  // +2 for leading spaces
    lines.push(
      green('║') +
      '  ' +
      yellow(stat.label.padEnd(labelWidth)) +
      cyan(stat.value.toString().padStart(valueWidth)) +
      ' '.repeat(Math.max(0, width - totalStatWidth)) +
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
