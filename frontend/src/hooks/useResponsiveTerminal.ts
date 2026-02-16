// Responsive Terminal Hook
// Feature: 001-custom-terminal-emulator

import { useState, useEffect } from 'react'
import type { ViewportState } from '../types/terminal'
import { getResponsiveConfig } from '../utils/terminal-responsive'

/**
 * Hook for managing responsive terminal viewport state
 * Handles breakpoint detection, resize events, and orientation changes
 */
export function useResponsiveTerminal() {
  const [viewport, setViewport] = useState<ViewportState>(() => {
    const width = window.innerWidth
    const height = window.innerHeight
    const config = getResponsiveConfig(width)

    return {
      scrollY: 0,
      viewportHeight: height,
      viewportWidth: width,
      rows: config.config.minRows,
      cols: config.config.minCols,
      lineHeight: config.config.fontSize * 1.2,
      charWidth: config.config.fontSize * 0.6,
      breakpoint: width <= 640 ? 'mobile' : width <= 1024 ? 'tablet' : 'desktop',
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      safeAreaInsets: getSafeAreaInsets()
    }
  })

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const config = getResponsiveConfig(width)

      setViewport(prev => ({
        ...prev,
        viewportHeight: height,
        viewportWidth: width,
        rows: config.config.minRows,
        cols: config.config.minCols,
        lineHeight: config.config.fontSize * 1.2,
        charWidth: config.config.fontSize * 0.6,
        breakpoint: width <= 640 ? 'mobile' : width <= 1024 ? 'tablet' : 'desktop',
        safeAreaInsets: getSafeAreaInsets()
      }))
    }

    const handleOrientationChange = () => {
      // iOS Safari needs delay after orientation change
      setTimeout(handleResize, 100)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])

  const updateScrollY = (scrollY: number) => {
    setViewport(prev => ({ ...prev, scrollY }))
  }

  return {
    viewport,
    updateScrollY
  }
}

/**
 * Get safe area insets for notched devices (iPhone X+)
 */
function getSafeAreaInsets() {
  const computedStyle = getComputedStyle(document.documentElement)

  return {
    top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
    bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
    right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0')
  }
}

/**
 * Detect current breakpoint from viewport width
 */
export function getCurrentBreakpoint(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width <= 640) return 'mobile'
  if (width <= 1024) return 'tablet'
  return 'desktop'
}

/**
 * Device capabilities detection
 */
export interface DeviceCapabilities {
  breakpoint: 'mobile' | 'tablet' | 'desktop'
  hasTouch: boolean
  hasFinePointer: boolean
  hasHover: boolean
  orientation: 'portrait' | 'landscape'
  viewportWidth: number
  viewportHeight: number
  pixelRatio: number
  hasVirtualKeyboard: boolean
  hasSafeAreaInsets: boolean
  prefersReducedMotion: boolean
  colorScheme: 'light' | 'dark' | 'no-preference'
  primaryInput: 'touch' | 'mouse'
}

export function getDeviceCapabilities(width: number): DeviceCapabilities {
  const breakpoint = getCurrentBreakpoint(width)
  const hasTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  const hasFinePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches
  const hasHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0
  const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1

  return {
    breakpoint,
    hasTouch,
    hasFinePointer: hasFinePointer || !hasTouch,
    hasHover: hasHover || !hasTouch,
    orientation: width > viewportHeight ? 'landscape' : 'portrait',
    viewportWidth: width,
    viewportHeight,
    pixelRatio,
    hasVirtualKeyboard: hasTouch && breakpoint === 'mobile',
    hasSafeAreaInsets: false, // Would need actual env() check
    prefersReducedMotion: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    colorScheme: typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    primaryInput: hasTouch ? 'touch' : 'mouse'
  }
}
