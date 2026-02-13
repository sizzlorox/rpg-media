// Level up animation component with ASCII art

import { useEffect } from 'react'
import { green, cyan, yellow, magenta } from '../utils/ansi-colors'

interface LevelUpAnimationProps {
  newLevel: number
  unlockedFeatures?: string[]
  onClose?: () => void
}

export function LevelUpAnimation({ onClose }: LevelUpAnimationProps) {
  useEffect(() => {
    // Auto-close after 5 seconds
    const timeout = setTimeout(() => {
      if (onClose) onClose()
    }, 5000)

    return () => {
      clearTimeout(timeout)
    }
  }, [onClose])

  return null // This component is meant for terminal rendering
}

// Export render function for direct terminal usage
export function renderLevelUpAnimation(newLevel: number, unlockedFeatures: string[] = []): string {
  const lines: string[] = []

  // Top border
  lines.push(cyan('╔' + '═'.repeat(58) + '╗'))

  // Empty line
  lines.push(cyan('║') + ' '.repeat(58) + cyan('║'))

  // Level up message
  const levelMsg = `LEVEL UP! You are now Level ${newLevel}`
  const levelPadding = Math.floor((58 - levelMsg.length) / 2)
  lines.push(
    cyan('║') +
    ' '.repeat(levelPadding) +
    green(levelMsg) +
    ' '.repeat(58 - levelPadding - levelMsg.length) +
    cyan('║')
  )

  // Empty line
  lines.push(cyan('║') + ' '.repeat(58) + cyan('║'))

  // ASCII art celebration
  const art = [
    '    ░▒▓█  CONGRATULATIONS!  █▓▒░    ',
    '         ★  ⚡  ✦  ⚡  ★          ',
  ]

  art.forEach((line) => {
    const padding = Math.floor((58 - line.length) / 2)
    lines.push(
      cyan('║') +
      ' '.repeat(padding) +
      yellow(line) +
      ' '.repeat(58 - padding - line.length) +
      cyan('║')
    )
  })

  // Empty line
  lines.push(cyan('║') + ' '.repeat(58) + cyan('║'))

  // Unlocked features section
  if (unlockedFeatures.length > 0) {
    lines.push(cyan('║') + magenta(' New Features Unlocked:'.padEnd(58)) + cyan('║'))
    lines.push(cyan('║') + ' '.repeat(58) + cyan('║'))

    unlockedFeatures.forEach((feature) => {
      const featureLine = `  ✓ ${feature}`
      lines.push(cyan('║') + green(featureLine.padEnd(58)) + cyan('║'))
    })

    lines.push(cyan('║') + ' '.repeat(58) + cyan('║'))
  }

  // Bottom border
  lines.push(cyan('╚' + '═'.repeat(58) + '╝'))

  return lines.join('\r\n')
}

// Feature unlock descriptions by level
export const FEATURE_UNLOCKS: Record<number, string[]> = {
  3: ['Image uploads enabled'],
  5: ['Extended posts (500 characters)'],
  7: ['Profile customization', 'Avatar & banner uploads'],
  10: ['Advanced posts (1000 characters)', 'Custom themes'],
  15: ['Pinned posts'],
}

export function getUnlockedFeatures(level: number): string[] {
  return FEATURE_UNLOCKS[level] || []
}
