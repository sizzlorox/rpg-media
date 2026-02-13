// Terminal XP progress bar component

import { green, cyan, yellow } from '../utils/ansi-colors'

interface TerminalXPBarProps {
  level: number
  totalXP: number
  xpForNextLevel: number
  progressPercent: number
}

export function TerminalXPBar({ level, totalXP, xpForNextLevel, progressPercent }: TerminalXPBarProps) {
  // Create ASCII progress bar (40 chars wide)
  const barWidth = 40
  const filledBlocks = Math.floor((progressPercent / 100) * barWidth)
  const emptyBlocks = barWidth - filledBlocks

  const bar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks)

  return (
    <>
      <span>{cyan(`Level ${level}`)}</span>
      <span> {green(bar)} </span>
      <span>{yellow(`${totalXP}/${xpForNextLevel} XP`)}</span>
    </>
  )
}

export function renderTerminalXPBar(level: number, totalXP: number, xpForNextLevel: number, progressPercent: number): string {
  const barWidth = 40
  const filledBlocks = Math.floor((progressPercent / 100) * barWidth)
  const emptyBlocks = barWidth - filledBlocks

  const bar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks)

  return `${cyan(`Level ${level}`)} ${green(bar)} ${yellow(`${totalXP}/${xpForNextLevel} XP`)}`
}
