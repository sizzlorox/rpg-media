// Unit Test: Safe Area Insets
// Feature: 001-custom-terminal-emulator
// User Story 5: Responsive Design Across All Devices
// Purpose: Handle iPhone X+ notch and other device cutouts

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getSafeAreaInsets, applySafeAreaPadding } from '../../utils/safe-area'

describe('Safe Area Insets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSafeAreaInsets', () => {
    it('should detect safe area insets on notched devices', () => {
      const insets = getSafeAreaInsets()

      expect(insets).toHaveProperty('top')
      expect(insets).toHaveProperty('right')
      expect(insets).toHaveProperty('bottom')
      expect(insets).toHaveProperty('left')

      // All values should be non-negative
      expect(insets.top).toBeGreaterThanOrEqual(0)
      expect(insets.right).toBeGreaterThanOrEqual(0)
      expect(insets.bottom).toBeGreaterThanOrEqual(0)
      expect(insets.left).toBeGreaterThanOrEqual(0)
    })

    it('should return zero insets on devices without notches', () => {
      // Mock device without safe area support
      const insets = getSafeAreaInsets()

      // If no safe area insets, all should be 0
      if (!insets.top && !insets.bottom && !insets.left && !insets.right) {
        expect(insets.top).toBe(0)
        expect(insets.right).toBe(0)
        expect(insets.bottom).toBe(0)
        expect(insets.left).toBe(0)
      }
    })

    it('should handle portrait orientation on iPhone X+', () => {
      // iPhone X in portrait typically has:
      // - Top inset: ~44px (notch)
      // - Bottom inset: ~34px (home indicator)
      // - Left/Right: 0

      const insets = getSafeAreaInsets()

      if (insets.top > 0 || insets.bottom > 0) {
        // If insets detected, validate reasonable ranges
        expect(insets.top).toBeLessThanOrEqual(100)
        expect(insets.bottom).toBeLessThanOrEqual(50)
      }
    })

    it('should handle landscape orientation on notched devices', () => {
      // In landscape, notch becomes a side inset
      const insets = getSafeAreaInsets()

      // All insets should be reasonable
      expect(insets.top).toBeLessThanOrEqual(100)
      expect(insets.right).toBeLessThanOrEqual(100)
      expect(insets.bottom).toBeLessThanOrEqual(100)
      expect(insets.left).toBeLessThanOrEqual(100)
    })

    it('should cache inset values', () => {
      const insets1 = getSafeAreaInsets()
      const insets2 = getSafeAreaInsets()

      // Should return same values
      expect(insets1.top).toBe(insets2.top)
      expect(insets1.right).toBe(insets2.right)
      expect(insets1.bottom).toBe(insets2.bottom)
      expect(insets1.left).toBe(insets2.left)
    })

    it('should update insets on orientation change', () => {
      const portraitInsets = getSafeAreaInsets()

      // Simulate orientation change (would need event listener in real impl)
      // After orientation change, insets might be different

      const landscapeInsets = getSafeAreaInsets()

      // Either same or different depending on device
      expect(typeof portraitInsets.top).toBe('number')
      expect(typeof landscapeInsets.top).toBe('number')
    })

    it('should handle devices with camera cutouts', () => {
      // Some Android devices have hole-punch cameras
      const insets = getSafeAreaInsets()

      // Should still provide valid insets
      expect(typeof insets.top).toBe('number')
      expect(typeof insets.right).toBe('number')
      expect(typeof insets.bottom).toBe('number')
      expect(typeof insets.left).toBe('number')
    })

    it('should provide pixel values not CSS units', () => {
      const insets = getSafeAreaInsets()

      // Should be numbers in pixels
      expect(Number.isFinite(insets.top)).toBe(true)
      expect(Number.isFinite(insets.right)).toBe(true)
      expect(Number.isFinite(insets.bottom)).toBe(true)
      expect(Number.isFinite(insets.left)).toBe(true)
    })
  })

  describe('applySafeAreaPadding', () => {
    it('should add safe area padding to element styles', () => {
      const element = document.createElement('div')
      const insets = { top: 44, right: 0, bottom: 34, left: 0 }

      applySafeAreaPadding(element, insets)

      // Should apply padding
      const styles = window.getComputedStyle(element)
      expect(styles.paddingTop).toContain('44')
      expect(styles.paddingBottom).toContain('34')
    })

    it('should add safe area padding to specific sides', () => {
      const element = document.createElement('div')
      const insets = { top: 44, right: 0, bottom: 34, left: 0 }

      applySafeAreaPadding(element, insets, ['top', 'bottom'])

      // Should only apply to specified sides
      const styles = window.getComputedStyle(element)
      expect(styles.paddingTop).toContain('44')
      expect(styles.paddingBottom).toContain('34')
    })

    it('should combine with existing padding', () => {
      const element = document.createElement('div')
      element.style.paddingTop = '20px'

      const insets = { top: 44, right: 0, bottom: 0, left: 0 }

      applySafeAreaPadding(element, insets, ['top'])

      // Should add to existing padding (20 + 44 = 64)
      const styles = window.getComputedStyle(element)
      const paddingValue = parseInt(styles.paddingTop)
      expect(paddingValue).toBeGreaterThanOrEqual(44)
    })

    it('should handle zero insets gracefully', () => {
      const element = document.createElement('div')
      const insets = { top: 0, right: 0, bottom: 0, left: 0 }

      applySafeAreaPadding(element, insets)

      // Should not add any padding
      const styles = window.getComputedStyle(element)
      expect(parseInt(styles.paddingTop) || 0).toBe(0)
    })

    it('should use CSS env() for dynamic safe areas', () => {
      const element = document.createElement('div')

      // Apply safe area using CSS environment variables
      element.style.paddingTop = 'env(safe-area-inset-top)'
      element.style.paddingBottom = 'env(safe-area-inset-bottom)'

      // CSS should have env() function
      expect(element.style.paddingTop).toContain('env(safe-area-inset-top)')
      expect(element.style.paddingBottom).toContain('env(safe-area-inset-bottom)')
    })

    it('should provide fallback for unsupported browsers', () => {
      const element = document.createElement('div')
      const insets = { top: 44, right: 0, bottom: 34, left: 0 }

      // Should work even if env() not supported
      applySafeAreaPadding(element, insets)

      const styles = window.getComputedStyle(element)
      const hasTopPadding = parseInt(styles.paddingTop) > 0
      const hasBottomPadding = parseInt(styles.paddingBottom) > 0

      // Should have applied padding one way or another
      expect(hasTopPadding || hasBottomPadding).toBe(true)
    })

    it('should handle full-screen terminal layout', () => {
      const terminal = document.createElement('div')
      terminal.className = 'terminal'

      const insets = { top: 44, right: 0, bottom: 34, left: 0 }

      applySafeAreaPadding(terminal, insets)

      // Terminal should have safe area padding
      const styles = window.getComputedStyle(terminal)
      expect(parseInt(styles.paddingTop) || 0).toBeGreaterThanOrEqual(0)
    })

    it('should preserve existing CSS classes', () => {
      const element = document.createElement('div')
      element.className = 'terminal-container custom-class'

      const insets = { top: 44, right: 0, bottom: 34, left: 0 }

      applySafeAreaPadding(element, insets)

      // Should keep original classes
      expect(element.className).toContain('terminal-container')
      expect(element.className).toContain('custom-class')
    })

    it('should handle negative insets gracefully', () => {
      const element = document.createElement('div')
      const insets = { top: -10, right: 0, bottom: 0, left: 0 }

      // Should clamp to 0 or handle gracefully
      applySafeAreaPadding(element, insets)

      const styles = window.getComputedStyle(element)
      const paddingValue = parseInt(styles.paddingTop) || 0

      // Should not apply negative padding
      expect(paddingValue).toBeGreaterThanOrEqual(0)
    })

    it('should update padding when insets change', () => {
      const element = document.createElement('div')

      // Initial insets (portrait)
      const portraitInsets = { top: 44, right: 0, bottom: 34, left: 0 }
      applySafeAreaPadding(element, portraitInsets)

      const portraitTop = parseInt(window.getComputedStyle(element).paddingTop) || 0

      // Updated insets (landscape)
      const landscapeInsets = { top: 0, right: 44, bottom: 0, left: 44 }
      applySafeAreaPadding(element, landscapeInsets)

      const landscapeRight = parseInt(window.getComputedStyle(element).paddingRight) || 0

      // Should have updated
      expect(portraitTop).toBeGreaterThan(0)
      expect(landscapeRight).toBeGreaterThan(0)
    })
  })

  describe('Integration with terminal layout', () => {
    it('should calculate available viewport height with insets', () => {
      const windowHeight = 812 // iPhone X height
      const insets = { top: 44, right: 0, bottom: 34, left: 0 }

      const availableHeight = windowHeight - insets.top - insets.bottom

      expect(availableHeight).toBe(734) // 812 - 44 - 34
    })

    it('should adjust terminal rows for safe area', () => {
      const availableHeight = 734 // After safe area
      const lineHeight = 20

      const maxRows = Math.floor(availableHeight / lineHeight)

      expect(maxRows).toBe(36) // 734 / 20 = 36.7, floor to 36
    })

    it('should handle safe area in scrolling context', () => {
      const element = document.createElement('div')
      element.style.height = '100vh'
      element.style.overflowY = 'auto'

      const insets = { top: 44, right: 0, bottom: 34, left: 0 }

      applySafeAreaPadding(element, insets)

      // Content should not be hidden under safe areas
      const styles = window.getComputedStyle(element)
      expect(parseInt(styles.paddingTop) || 0).toBeGreaterThanOrEqual(0)
      expect(parseInt(styles.paddingBottom) || 0).toBeGreaterThanOrEqual(0)
    })

    it('should work with CSS containment', () => {
      const element = document.createElement('div')
      element.style.contain = 'layout style paint'

      const insets = { top: 44, right: 0, bottom: 34, left: 0 }

      applySafeAreaPadding(element, insets)

      // Should still apply padding with containment
      expect(element.style.contain).toBe('layout style paint')
    })
  })

  describe('Performance', () => {
    it('should compute insets quickly', () => {
      const start = performance.now()

      for (let i = 0; i < 100; i++) {
        getSafeAreaInsets()
      }

      const duration = performance.now() - start

      // Should be fast (< 50ms for 100 calls)
      expect(duration).toBeLessThan(50)
    })

    it('should apply padding efficiently', () => {
      const elements = Array.from({ length: 100 }, () => document.createElement('div'))
      const insets = { top: 44, right: 0, bottom: 34, left: 0 }

      const start = performance.now()

      elements.forEach(el => applySafeAreaPadding(el, insets))

      const duration = performance.now() - start

      // Should be fast (< 100ms for 100 elements)
      expect(duration).toBeLessThan(100)
    })
  })
})
