// Level up animation component with ASCII art

import { useEffect } from 'react'
import { green, cyan, yellow, magenta } from '../utils/ansi-colors'
import { getResponsiveBoxWidth, centerInBox } from '../utils/responsive-width'

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
export function renderLevelUpAnimation(
  newLevel: number,
  unlockedFeatures: string[] = [],
  terminalCols: number = 80
): string {
  const lines: string[] = []
  const width = getResponsiveBoxWidth(terminalCols)

  // Top border
  lines.push(cyan('╔' + '═'.repeat(width - 2) + '╗'))

  // Empty line
  lines.push(cyan('║') + ' '.repeat(width - 2) + cyan('║'))

  // Level up message
  const levelMsg = `LEVEL UP! You are now Level ${newLevel}`
  const centeredLevel = centerInBox(green(levelMsg), width - 2)
  lines.push(cyan('║') + centeredLevel + cyan('║'))

  // Empty line
  lines.push(cyan('║') + ' '.repeat(width - 2) + cyan('║'))

  // Show full ASCII art only on tablet/desktop
  if (terminalCols >= 60) {
    const art = ['    ░▒▓█  CONGRATULATIONS!  █▓▒░    ', '         ★  ⚡  ✦  ⚡  ★          ']
    art.forEach(line => {
      const centeredArt = centerInBox(yellow(line), width - 2)
      lines.push(cyan('║') + centeredArt + cyan('║'))
    })
  } else {
    // Compact version for mobile
    const compactArt = 'CONGRATULATIONS!'
    const centeredArt = centerInBox(yellow(compactArt), width - 2)
    lines.push(cyan('║') + centeredArt + cyan('║'))
  }

  // Empty line
  lines.push(cyan('║') + ' '.repeat(width - 2) + cyan('║'))

  // Unlocked features section
  if (unlockedFeatures.length > 0) {
    lines.push(cyan('║') + magenta(' New Features Unlocked:'.padEnd(width - 2)) + cyan('║'))
    lines.push(cyan('║') + ' '.repeat(width - 2) + cyan('║'))

    unlockedFeatures.forEach((feature) => {
      const featureLine = `  ✓ ${feature}`
      lines.push(cyan('║') + green(featureLine.padEnd(width - 2)) + cyan('║'))
    })

    lines.push(cyan('║') + ' '.repeat(width - 2) + cyan('║'))
  }

  // Bottom border
  lines.push(cyan('╚' + '═'.repeat(width - 2) + '╝'))

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
