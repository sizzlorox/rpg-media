// ASCII art generator utilities for terminal UI

// Generate ASCII box border
export function createBox(title: string, width: number = 60): string {
  const top = '╔' + '═'.repeat(width - 2) + '╗'
  const titleLine = '║ ' + title.padEnd(width - 4) + ' ║'
  const separator = '╠' + '═'.repeat(width - 2) + '╣'
  const bottom = '╚' + '═'.repeat(width - 2) + '╝'

  return `${top}\n${titleLine}\n${separator}`
}

export function closeBox(width: number = 60): string {
  return '╚' + '═'.repeat(width - 2) + '╝'
}

export function boxLine(content: string, width: number = 60): string {
  return '║ ' + content.padEnd(width - 4) + ' ║'
}

// Generate progress bar with filled and empty blocks
export function createProgressBar(
  percent: number,
  length: number = 20,
  filledChar: string = '█',
  emptyChar: string = '░'
): string {
  const filled = Math.round((percent / 100) * length)
  const empty = length - filled

  return `[${filledChar.repeat(filled)}${emptyChar.repeat(empty)}] ${percent.toFixed(0)}%`
}

// Generate horizontal line
export function createLine(width: number = 60, char: string = '─'): string {
  return char.repeat(width)
}

// Generate double line
export function createDoubleLine(width: number = 60): string {
  return '═'.repeat(width)
}

// Create padded text
export function padText(text: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
  if (text.length >= width) {
    return text.slice(0, width)
  }

  const padding = width - text.length

  switch (align) {
    case 'left':
      return text + ' '.repeat(padding)
    case 'right':
      return ' '.repeat(padding) + text
    case 'center':
      const leftPad = Math.floor(padding / 2)
      const rightPad = padding - leftPad
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad)
    default:
      return text
  }
}

// Generate level-up animation frames
export function createLevelUpAnimation(level: number): string[] {
  return [
    `
    ░░░░░░░░░░░░░░░░░░
    ░ LEVEL UP! Lvl ${level.toString().padStart(2)} ░
    ░░░░░░░░░░░░░░░░░░
    `,
    `
    ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
    ▒ LEVEL UP! Lvl ${level.toString().padStart(2)} ▒
    ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
    `,
    `
    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
    ▓ LEVEL UP! Lvl ${level.toString().padStart(2)} ▓
    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
    `,
    `
    ██████████████████
    █ LEVEL UP! Lvl ${level.toString().padStart(2)} █
    ██████████████████
    `,
  ]
}

// Create table row
export function createTableRow(columns: string[], widths: number[]): string {
  return (
    '║ ' +
    columns
      .map((col, i) => padText(col, widths[i]))
      .join(' │ ') +
    ' ║'
  )
}

// Create table separator
export function createTableSeparator(widths: number[]): string {
  return (
    '╠═' +
    widths.map((w) => '═'.repeat(w)).join('═╪═') +
    '═╣'
  )
}
