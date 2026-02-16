// Unit Test: Breakpoint Detection
// Feature: 001-custom-terminal-emulator
// User Story 5: Responsive Design Across All Devices

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCurrentBreakpoint, getDeviceCapabilities } from '../../hooks/useResponsiveTerminal'

describe('Breakpoint Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentBreakpoint', () => {
    it('should detect mobile breakpoint for widths ≤640px', () => {
      expect(getCurrentBreakpoint(320)).toBe('mobile')
      expect(getCurrentBreakpoint(375)).toBe('mobile')
      expect(getCurrentBreakpoint(414)).toBe('mobile')
      expect(getCurrentBreakpoint(640)).toBe('mobile')
    })

    it('should detect tablet breakpoint for widths 641-1024px', () => {
      expect(getCurrentBreakpoint(641)).toBe('tablet')
      expect(getCurrentBreakpoint(768)).toBe('tablet')
      expect(getCurrentBreakpoint(800)).toBe('tablet')
      expect(getCurrentBreakpoint(1024)).toBe('tablet')
    })

    it('should detect desktop breakpoint for widths >1024px', () => {
      expect(getCurrentBreakpoint(1025)).toBe('desktop')
      expect(getCurrentBreakpoint(1280)).toBe('desktop')
      expect(getCurrentBreakpoint(1920)).toBe('desktop')
      expect(getCurrentBreakpoint(3840)).toBe('desktop')
    })

    it('should handle exact boundary values', () => {
      // Mobile/Tablet boundary at 640/641
      expect(getCurrentBreakpoint(640)).toBe('mobile')
      expect(getCurrentBreakpoint(641)).toBe('tablet')

      // Tablet/Desktop boundary at 1024/1025
      expect(getCurrentBreakpoint(1024)).toBe('tablet')
      expect(getCurrentBreakpoint(1025)).toBe('desktop')
    })

    it('should handle edge case widths', () => {
      // Very small
      expect(getCurrentBreakpoint(240)).toBe('mobile')
      expect(getCurrentBreakpoint(1)).toBe('mobile')

      // Very large
      expect(getCurrentBreakpoint(7680)).toBe('desktop') // 8K display
      expect(getCurrentBreakpoint(10000)).toBe('desktop')
    })

    it('should handle invalid inputs gracefully', () => {
      // Zero and negative should default to mobile
      expect(getCurrentBreakpoint(0)).toBe('mobile')
      expect(getCurrentBreakpoint(-100)).toBe('mobile')
    })

    it('should handle float values', () => {
      expect(getCurrentBreakpoint(640.5)).toBe('tablet')
      expect(getCurrentBreakpoint(1024.9)).toBe('tablet')
      expect(getCurrentBreakpoint(1025.1)).toBe('desktop')
    })

    it('should be consistent for same width', () => {
      const width = 768
      const result1 = getCurrentBreakpoint(width)
      const result2 = getCurrentBreakpoint(width)
      const result3 = getCurrentBreakpoint(width)

      expect(result1).toBe('tablet')
      expect(result2).toBe('tablet')
      expect(result3).toBe('tablet')
    })

    it('should handle common device widths correctly', () => {
      // Common mobile devices
      expect(getCurrentBreakpoint(375)).toBe('mobile')  // iPhone X/11/12
      expect(getCurrentBreakpoint(414)).toBe('mobile')  // iPhone Plus models
      expect(getCurrentBreakpoint(360)).toBe('mobile')  // Android common

      // Common tablets
      expect(getCurrentBreakpoint(768)).toBe('tablet')  // iPad portrait
      expect(getCurrentBreakpoint(1024)).toBe('tablet') // iPad landscape

      // Common desktops
      expect(getCurrentBreakpoint(1280)).toBe('desktop') // 720p
      expect(getCurrentBreakpoint(1920)).toBe('desktop') // 1080p
      expect(getCurrentBreakpoint(2560)).toBe('desktop') // 1440p
    })
  })

  describe('getDeviceCapabilities', () => {
    it('should detect touch capability on mobile', () => {
      const capabilities = getDeviceCapabilities(375)

      expect(capabilities.hasTouch).toBe(true)
      expect(capabilities.breakpoint).toBe('mobile')
    })

    it('should detect pointer precision on desktop', () => {
      const capabilities = getDeviceCapabilities(1920)

      expect(capabilities.hasFinePointer).toBe(true)
      expect(capabilities.breakpoint).toBe('desktop')
    })

    it('should detect hover capability', () => {
      const mobile = getDeviceCapabilities(375)
      const desktop = getDeviceCapabilities(1920)

      // Mobile typically doesn't have hover
      expect(mobile.hasHover).toBe(false)

      // Desktop typically has hover
      expect(desktop.hasHover).toBe(true)
    })

    it('should detect orientation on mobile', () => {
      const portrait = getDeviceCapabilities(375)
      const landscape = getDeviceCapabilities(667)

      expect(portrait.orientation).toBe('portrait')
      expect(landscape.orientation).toBe('landscape')
    })

    it('should detect screen density', () => {
      const capabilities = getDeviceCapabilities(375)

      // Should detect if device has high DPI
      expect(capabilities.pixelRatio).toBeGreaterThan(0)
      expect(typeof capabilities.pixelRatio).toBe('number')
    })

    it('should detect viewport dimensions', () => {
      const capabilities = getDeviceCapabilities(768)

      expect(capabilities.viewportWidth).toBe(768)
      expect(capabilities.viewportHeight).toBeGreaterThan(0)
    })

    it('should detect virtual keyboard support', () => {
      const mobile = getDeviceCapabilities(375)

      // Mobile devices typically support virtual keyboard
      expect(typeof mobile.hasVirtualKeyboard).toBe('boolean')
    })

    it('should detect safe area insets support', () => {
      const capabilities = getDeviceCapabilities(375)

      // Should indicate if device supports safe area insets (iPhone X+)
      expect(typeof capabilities.hasSafeAreaInsets).toBe('boolean')
    })

    it('should handle tablet capabilities', () => {
      const capabilities = getDeviceCapabilities(1024)

      expect(capabilities.breakpoint).toBe('tablet')
      // Tablets might have touch or mouse
      expect(typeof capabilities.hasTouch).toBe('boolean')
      expect(typeof capabilities.hasFinePointer).toBe('boolean')
    })

    it('should detect reduced motion preference', () => {
      const capabilities = getDeviceCapabilities(1920)

      // Should respect user's motion preferences
      expect(typeof capabilities.prefersReducedMotion).toBe('boolean')
    })

    it('should detect color scheme preference', () => {
      const capabilities = getDeviceCapabilities(1920)

      // Should detect light/dark mode preference
      expect(['light', 'dark', 'no-preference']).toContain(capabilities.colorScheme)
    })

    it('should detect input type', () => {
      const mobile = getDeviceCapabilities(375)
      const desktop = getDeviceCapabilities(1920)

      expect(mobile.primaryInput).toBe('touch')
      expect(desktop.primaryInput).toBe('mouse')
    })

    it('should provide all required capabilities', () => {
      const capabilities = getDeviceCapabilities(768)

      // Required fields
      expect(capabilities).toHaveProperty('breakpoint')
      expect(capabilities).toHaveProperty('hasTouch')
      expect(capabilities).toHaveProperty('hasFinePointer')
      expect(capabilities).toHaveProperty('hasHover')
      expect(capabilities).toHaveProperty('viewportWidth')
      expect(capabilities).toHaveProperty('viewportHeight')
      expect(capabilities).toHaveProperty('pixelRatio')
    })

    it('should cache capabilities for same width', () => {
      const capabilities1 = getDeviceCapabilities(768)
      const capabilities2 = getDeviceCapabilities(768)

      // Should return same object or equivalent values
      expect(capabilities1.breakpoint).toBe(capabilities2.breakpoint)
      expect(capabilities1.viewportWidth).toBe(capabilities2.viewportWidth)
    })
  })

  describe('Breakpoint transitions', () => {
    it('should handle smooth transitions between breakpoints', () => {
      const widths = [640, 641]
      const breakpoints = widths.map(w => getCurrentBreakpoint(w))

      expect(breakpoints[0]).toBe('mobile')
      expect(breakpoints[1]).toBe('tablet')
    })

    it('should provide consistent breakpoints during resize', () => {
      // Simulate resize from mobile to desktop
      const sequence = [375, 640, 641, 768, 1024, 1025, 1920]
      const expected = ['mobile', 'mobile', 'tablet', 'tablet', 'tablet', 'desktop', 'desktop']

      sequence.forEach((width, index) => {
        expect(getCurrentBreakpoint(width)).toBe(expected[index])
      })
    })

    it('should handle rapid breakpoint checks', () => {
      const start = performance.now()

      for (let i = 0; i < 1000; i++) {
        getCurrentBreakpoint(320 + i)
      }

      const duration = performance.now() - start

      // Should be fast (< 50ms for 1000 checks)
      expect(duration).toBeLessThan(50)
    })
  })
})
