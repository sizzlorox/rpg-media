/**
 * TerminalStyling Component
 * Manages terminal theme and responsive configuration
 */

import { useState, useCallback, useEffect } from 'react'
import { getResponsiveConfig, getCurrentViewportWidth } from '../../utils/terminal-responsive'
import type { ITerminalOptions } from '@xterm/xterm'

export interface TerminalStylingConfig {
  config: ITerminalOptions
  logoType: 'compact' | 'medium' | 'full'
  cols: number
  rows: number
  fontSize: number
}

/**
 * Hook to manage terminal styling and responsive configuration
 */
export function useTerminalStyling(): {
  config: TerminalStylingConfig
  updateConfig: () => void
} {
  const [responsiveConfig, setResponsiveConfig] = useState(() =>
    getResponsiveConfig(getCurrentViewportWidth())
  )

  const updateConfig = useCallback(() => {
    const width = getCurrentViewportWidth()
    const newConfig = getResponsiveConfig(width)
    setResponsiveConfig(newConfig)
  }, [])

  // Listen for window resize
  useEffect(() => {
    window.addEventListener('resize', updateConfig)
    return () => window.removeEventListener('resize', updateConfig)
  }, [updateConfig])

  // Build xterm.js configuration
  const xtermConfig: ITerminalOptions = {
    theme: {
      background: '#000000',
      foreground: '#00ff00',
      cursor: '#00ff00',
      cursorAccent: '#000000',
      selectionBackground: '#00aa00',
      black: '#000000',
      red: '#ff0000',
      green: '#00ff00',
      yellow: '#ffff00',
      blue: '#0000ff',
      magenta: '#ff00ff',
      cyan: '#00ffff',
      white: '#ffffff',
      brightBlack: '#555555',
      brightRed: '#ff5555',
      brightGreen: '#55ff55',
      brightYellow: '#ffff55',
      brightBlue: '#5555ff',
      brightMagenta: '#ff55ff',
      brightCyan: '#55ffff',
      brightWhite: '#ffffff',
    },
    fontFamily: 'IBM Plex Mono, Courier New, monospace',
    fontSize: responsiveConfig.config.fontSize,
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 1000,
  }

  return {
    config: {
      config: xtermConfig,
      logoType: responsiveConfig.logoType,
      cols: responsiveConfig.config.minCols,
      rows: responsiveConfig.config.minRows,
      fontSize: responsiveConfig.config.fontSize,
    },
    updateConfig,
  }
}
