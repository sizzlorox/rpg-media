// Dynamic welcome message that adapts to terminal width

import { ANSI } from './ansi-colors'
import { renderLogo } from './ascii-logo'
import type { LogoType } from './ascii-logo'

export function renderWelcomeMessage(cols: number, logoType: LogoType): string {
  const lines: string[] = []
  const border = '═'.repeat(cols - 2)
  const g = ANSI.GREEN
  const c = ANSI.CYAN
  const r = ANSI.RESET

  // Top border
  lines.push(g + '╔' + border + '╗' + r)

  // Empty line
  lines.push(g + '║' + ' '.repeat(cols - 2) + '║' + r)

  // Logo (centered)
  const logoLines = renderLogo(logoType).split('\r\n')
  logoLines.forEach(logoLine => {
    // Strip ANSI codes for length calculation
    const plainLine = logoLine.replace(/\x1b\[[0-9;]*m/g, '')
    const padding = Math.max(0, Math.floor((cols - 2 - plainLine.length) / 2))
    const rightPadding = Math.max(0, cols - 2 - plainLine.length - padding)
    lines.push(g + '║' + ' '.repeat(padding) + logoLine + ' '.repeat(rightPadding) + g + '║' + r)
  })

  // Empty line
  lines.push(g + '║' + ' '.repeat(cols - 2) + '║' + r)

  // Separator
  lines.push(g + '╠' + border + '╣' + r)

  // Empty line
  lines.push(g + '║' + ' '.repeat(cols - 2) + '║' + r)

  // Welcome text (adaptive based on width)
  if (cols >= 80) {
    // Desktop: full text
    addCenteredLine(lines, 'Welcome to Social Forge', cols, c, g, r)
    addCenteredLine(lines, 'Level up through engagement. Your profile is your character.', cols, g, g, r)
    lines.push(g + '║' + ' '.repeat(cols - 2) + '║' + r)
    addLeftAlignedLine(lines, 'Type /help to view available commands', cols, g, r)
    addLeftAlignedLine(lines, 'Type /register <username> <password> to create an account', cols, g, r)
  } else if (cols >= 60) {
    // Tablet: medium text
    addCenteredLine(lines, 'Welcome to Social Forge', cols, c, g, r)
    lines.push(g + '║' + ' '.repeat(cols - 2) + '║' + r)
    addCenteredLine(lines, 'Level up through engagement.', cols, g, g, r)
    addCenteredLine(lines, 'Your profile is your character.', cols, g, g, r)
    lines.push(g + '║' + ' '.repeat(cols - 2) + '║' + r)
    addLeftAlignedLine(lines, 'Type /help for commands', cols, g, r)
  } else {
    // Mobile: compact text
    addCenteredLine(lines, 'Welcome to Social Forge', cols, c, g, r)
    lines.push(g + '║' + ' '.repeat(cols - 2) + '║' + r)
    addLeftAlignedLine(lines, 'Level up through engagement.', cols, g, r)
    addLeftAlignedLine(lines, 'Your profile is your character.', cols, g, r)
    lines.push(g + '║' + ' '.repeat(cols - 2) + '║' + r)
    addLeftAlignedLine(lines, 'Type /help for commands', cols, g, r)
  }

  // Empty line
  lines.push(g + '║' + ' '.repeat(cols - 2) + '║' + r)

  // Bottom border
  lines.push(g + '╚' + border + '╝' + r)

  return lines.join('\r\n')
}

function addCenteredLine(
  lines: string[],
  text: string,
  cols: number,
  textColor: string,
  borderColor: string,
  reset: string
) {
  const padding = Math.max(0, Math.floor((cols - 2 - text.length) / 2))
  const rightPadding = Math.max(0, cols - 2 - text.length - padding)
  lines.push(
    borderColor + '║' +
    ' '.repeat(padding) +
    textColor + text + reset +
    ' '.repeat(rightPadding) +
    borderColor + '║' + reset
  )
}

function addLeftAlignedLine(
  lines: string[],
  text: string,
  cols: number,
  borderColor: string,
  reset: string
) {
  const rightPadding = Math.max(0, cols - 2 - text.length - 2) // 2 for "  " prefix
  lines.push(borderColor + '║  ' + text + ' '.repeat(rightPadding) + '║' + reset)
}
