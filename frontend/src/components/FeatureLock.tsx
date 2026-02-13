// Feature lock component showing level requirements

import { red, yellow, green, cyan } from '../utils/ansi-colors'

interface FeatureLockProps {
  featureName: string
  requiredLevel: number
  currentLevel: number
  isUnlocked?: boolean
}

export function FeatureLock(_props: FeatureLockProps) {
  return null // This component is meant for terminal rendering
}

// Feature unlock information
export interface FeatureUnlock {
  level: number
  features: string[]
}

export const FEATURE_UNLOCKS: FeatureUnlock[] = [
  { level: 1, features: ['Basic posting (280 chars)', 'Liking posts', 'Commenting', 'Following users'] },
  { level: 3, features: ['Image uploads in posts'] },
  { level: 5, features: ['Extended posts (500 chars)'] },
  { level: 7, features: ['Profile customization', 'Avatar upload', 'Banner upload'] },
  { level: 10, features: ['Advanced posts (1000 chars)', 'Custom themes'] },
  { level: 15, features: ['Pinned posts'] },
]

// Render feature lock status for terminal
export function renderFeatureLock(featureName: string, requiredLevel: number, currentLevel: number): string {
  const isUnlocked = currentLevel >= requiredLevel

  if (isUnlocked) {
    return green(`✓ ${featureName} (Level ${requiredLevel})`)
  } else {
    return red(`✗ ${featureName} - Unlocks at Level ${requiredLevel}`)
  }
}

// Render full feature unlock roadmap
export function renderFeatureRoadmap(currentLevel: number): string {
  const lines: string[] = []

  lines.push(cyan('═'.repeat(70)))
  lines.push(cyan('FEATURE UNLOCK ROADMAP'))
  lines.push(cyan('═'.repeat(70)))
  lines.push('')

  FEATURE_UNLOCKS.forEach((unlock) => {
    const isUnlocked = currentLevel >= unlock.level
    const isCurrentLevel = currentLevel === unlock.level

    // Level header
    const levelLine = isUnlocked
      ? green(`Level ${unlock.level} ${isCurrentLevel ? '(CURRENT)' : '✓'}`)
      : yellow(`Level ${unlock.level}`)

    lines.push(levelLine)
    lines.push('─'.repeat(70))

    // Features
    unlock.features.forEach((feature) => {
      const prefix = isUnlocked ? green('  ✓ ') : yellow('  ⏳ ')
      lines.push(prefix + feature)
    })

    lines.push('')
  })

  // Progress indicator
  const unlockedCount = FEATURE_UNLOCKS.filter(u => currentLevel >= u.level).length
  const totalCount = FEATURE_UNLOCKS.length
  const progressPercent = Math.round((unlockedCount / totalCount) * 100)

  lines.push(cyan('Progress:'))
  const barWidth = 50
  const filledBlocks = Math.floor((progressPercent / 100) * barWidth)
  const emptyBlocks = barWidth - filledBlocks
  const progressBar = green('█'.repeat(filledBlocks)) + '░'.repeat(emptyBlocks)
  lines.push(progressBar + ' ' + yellow(`${progressPercent}%`))
  lines.push('')

  // Next unlock
  const nextUnlock = FEATURE_UNLOCKS.find(u => u.level > currentLevel)
  if (nextUnlock) {
    const xpForNext = (nextUnlock.level * nextUnlock.level) * 100
    lines.push(yellow(`Next unlock at Level ${nextUnlock.level} (${xpForNext} XP):`))
    nextUnlock.features.forEach((feature) => {
      lines.push(cyan(`  • ${feature}`))
    })
  } else {
    lines.push(green('🎉 All features unlocked! You are a maximum level user!'))
  }

  return lines.join('\r\n')
}

// Get features unlocked at a specific level
export function getFeaturesAtLevel(level: number): string[] {
  const unlock = FEATURE_UNLOCKS.find(u => u.level === level)
  return unlock?.features || []
}

// Check if a feature is unlocked
export function isFeatureUnlocked(featureName: string, currentLevel: number): boolean {
  const featureRequirements: Record<string, number> = {
    'basic_posting': 1,
    'liking': 1,
    'commenting': 1,
    'following': 1,
    'image_uploads': 3,
    'extended_posts': 5,
    'profile_customization': 7,
    'avatar_upload': 7,
    'banner_upload': 7,
    'advanced_posts': 10,
    'custom_themes': 10,
    'pinned_posts': 15,
  }

  const requiredLevel = featureRequirements[featureName]
  return requiredLevel !== undefined && currentLevel >= requiredLevel
}
