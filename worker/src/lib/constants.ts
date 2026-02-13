// XP and Level Constants for Social Forge Platform
// Per spec FR-015 and FR-016

// XP award values for each action (FR-015)
export const XP_VALUES = {
  CREATE_POST: 10,
  LIKE_POST_EARNER: 1,        // User who likes gets 1 XP
  LIKE_POST_CREATOR: 2,       // Post creator gets 2 XP
  COMMENT_EARNER: 5,          // User who comments gets 5 XP
  COMMENT_CREATOR: 3,         // Post creator gets 3 XP
  RECEIVE_FOLLOW: 5,          // User being followed gets 5 XP
} as const

// Level calculation formula (FR-016)
// Level = floor(sqrt(total_XP / 100))
export function calculateLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 100))
}

// Calculate XP required for a specific level
export function xpForLevel(level: number): number {
  return (level * level) * 100
}

// Calculate XP required to reach next level from current level
export function xpForNextLevel(currentLevel: number): number {
  const nextLevel = currentLevel + 1
  return xpForLevel(nextLevel)
}

// Calculate XP progress percentage within current level
export function xpProgressPercent(currentLevel: number, totalXP: number): number {
  const currentLevelXP = xpForLevel(currentLevel)
  const nextLevelXP = xpForLevel(currentLevel + 1)
  const xpInCurrentLevel = totalXP - currentLevelXP
  const xpNeededForLevel = nextLevelXP - currentLevelXP

  return Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForLevel) * 100))
}

// Character limits based on level (FR-006)
export function getCharacterLimit(level: number): number {
  if (level >= 10) return 1000  // Advanced posts
  if (level >= 5) return 500    // Extended posts
  return 280                     // Basic posts
}

// Check if user can access a feature based on level (FR-025)
export function canAccessFeature(level: number, feature: string): boolean {
  const featureRequirements: Record<string, number> = {
    'basic_posting_280': 1,
    'liking': 1,
    'commenting': 1,
    'following': 1,
    'image_uploads': 3,
    'extended_posts_500': 5,
    'profile_customization': 7,
    'avatar_upload': 7,
    'banner_upload': 7,
    'advanced_posts_1000': 10,
    'custom_themes': 10,
    'pinned_posts': 15,
  }

  const requiredLevel = featureRequirements[feature]
  return requiredLevel !== undefined && level >= requiredLevel
}

// Rate limits (Spec Assumption #9)
export const RATE_LIMITS = {
  POSTS_PER_HOUR: 10,
  LIKES_PER_HOUR: 50,
  COMMENTS_PER_HOUR: 20,
} as const

// Theme options (level 10+)
export const THEME_OPTIONS = [
  'default',
  'dark',
  'light',
  'rpg',
  'cyberpunk',
] as const

// Maximum level
export const MAX_LEVEL = 100
