// Integration Test: Responsive Design
// Feature: 001-custom-terminal-emulator
// User Story 5: Responsive Design Across All Devices

import { describe, it, expect } from 'vitest'
import { getResponsiveConfig } from '../../utils/terminal-responsive'
import { getCurrentBreakpoint } from '../../hooks/useResponsiveTerminal'

describe('Terminal Responsive Design Integration', () => {
  it('should provide correct config for mobile breakpoint', () => {
    const config = getResponsiveConfig(320) // iPhone SE

    expect(config.breakpoint).toBe('mobile')
    expect(config.config.minCols).toBe(40)
    expect(config.config.fontSize).toBe(10)
    expect(config.logoType).toBe('compact')
  })

  it('should provide correct config for tablet breakpoint', () => {
    const config = getResponsiveConfig(768) // iPad

    expect(config.breakpoint).toBe('tablet')
    expect(config.config.minCols).toBe(60)
    expect(config.config.fontSize).toBe(12)
    expect(config.logoType).toBe('medium')
  })

  it('should provide correct config for desktop breakpoint', () => {
    const config = getResponsiveConfig(1920) // Desktop

    expect(config.breakpoint).toBe('desktop')
    expect(config.config.minCols).toBe(80)
    expect(config.config.fontSize).toBe(14)
    expect(config.logoType).toBe('full')
  })

  it('should handle breakpoint boundaries correctly', () => {
    // Exactly at mobile/tablet boundary
    const config640 = getResponsiveConfig(640)
    expect(config640.breakpoint).toBe('mobile')

    const config641 = getResponsiveConfig(641)
    expect(config641.breakpoint).toBe('tablet')

    // Exactly at tablet/desktop boundary
    const config1024 = getResponsiveConfig(1024)
    expect(config1024.breakpoint).toBe('tablet')

    const config1025 = getResponsiveConfig(1025)
    expect(config1025.breakpoint).toBe('desktop')
  })

  it('should detect current breakpoint from width', () => {
    expect(getCurrentBreakpoint(320)).toBe('mobile')
    expect(getCurrentBreakpoint(640)).toBe('mobile')
    expect(getCurrentBreakpoint(641)).toBe('tablet')
    expect(getCurrentBreakpoint(1024)).toBe('tablet')
    expect(getCurrentBreakpoint(1025)).toBe('desktop')
    expect(getCurrentBreakpoint(1920)).toBe('desktop')
  })

  it('should handle extreme viewport sizes', () => {
    // Very small
    const tiny = getResponsiveConfig(240)
    expect(tiny.breakpoint).toBe('mobile')
    expect(tiny.config.minCols).toBeGreaterThan(0)

    // Very large
    const huge = getResponsiveConfig(3840)
    expect(huge.breakpoint).toBe('desktop')
    expect(huge.config.minCols).toBeGreaterThan(0)
  })

  it('should provide appropriate font sizes for readability', () => {
    const mobile = getResponsiveConfig(375).config.fontSize
    const tablet = getResponsiveConfig(768).config.fontSize
    const desktop = getResponsiveConfig(1920).config.fontSize

    // Font should increase with screen size
    expect(mobile).toBeLessThan(tablet)
    expect(tablet).toBeLessThan(desktop)

    // Should be readable
    expect(mobile).toBeGreaterThanOrEqual(10)
    expect(desktop).toBeLessThanOrEqual(16)
  })

  it('should maintain aspect ratio across breakpoints', () => {
    const configs = [
      getResponsiveConfig(320),
      getResponsiveConfig(768),
      getResponsiveConfig(1920)
    ]

    configs.forEach(config => {
      // Line height should be proportional to font size
      const expectedLineHeight = config.config.fontSize * 1.2
      expect(Math.abs(config.config.lineHeight - expectedLineHeight)).toBeLessThan(0.1)
    })
  })

  it('should handle orientation changes', () => {
    // Portrait tablet
    const portrait = getResponsiveConfig(768)
    expect(portrait.breakpoint).toBe('tablet')

    // Landscape phone (might be detected as tablet width)
    const landscape = getResponsiveConfig(850)
    expect(landscape.breakpoint).toBe('tablet')
  })

  it('should provide consistent cols to rows ratio', () => {
    const mobile = getResponsiveConfig(375)
    const tablet = getResponsiveConfig(768)
    const desktop = getResponsiveConfig(1920)

    // Cols should increase more than rows
    expect(mobile.config.minCols / mobile.config.minRows).toBeLessThan(
      desktop.config.minCols / desktop.config.minRows
    )
  })
})
