// Unit Test: Responsive Image Sizing
// Feature: 001-custom-terminal-emulator
// User Story 5: Responsive Design Across All Devices

import { describe, it, expect } from 'vitest'
import { getResponsiveImageSize, calculateImageDimensions } from '../../utils/terminal-responsive'

describe('Responsive Image Sizing', () => {
  describe('getResponsiveImageSize', () => {
    it('should return 280px max width for mobile breakpoint', () => {
      const size = getResponsiveImageSize('mobile')

      expect(size.maxWidth).toBe(280)
      expect(size.maxHeight).toBeLessThanOrEqual(280)
    })

    it('should return 400px max width for tablet breakpoint', () => {
      const size = getResponsiveImageSize('tablet')

      expect(size.maxWidth).toBe(400)
      expect(size.maxHeight).toBeLessThanOrEqual(400)
    })

    it('should return 600px max width for desktop breakpoint', () => {
      const size = getResponsiveImageSize('desktop')

      expect(size.maxWidth).toBe(600)
      expect(size.maxHeight).toBeLessThanOrEqual(600)
    })

    it('should maintain aspect ratio constraints', () => {
      const mobile = getResponsiveImageSize('mobile')
      const tablet = getResponsiveImageSize('tablet')
      const desktop = getResponsiveImageSize('desktop')

      // Height should scale proportionally with width
      expect(mobile.maxHeight / mobile.maxWidth).toBeCloseTo(tablet.maxHeight / tablet.maxWidth, 1)
      expect(tablet.maxHeight / tablet.maxWidth).toBeCloseTo(desktop.maxHeight / desktop.maxWidth, 1)
    })

    it('should handle invalid breakpoint gracefully', () => {
      // @ts-ignore - testing invalid input
      const size = getResponsiveImageSize('invalid')

      // Should default to mobile or throw descriptive error
      expect(size).toBeDefined()
      expect(size.maxWidth).toBeGreaterThan(0)
    })

    it('should provide consistent sizing for same breakpoint', () => {
      const size1 = getResponsiveImageSize('tablet')
      const size2 = getResponsiveImageSize('tablet')

      expect(size1.maxWidth).toBe(size2.maxWidth)
      expect(size1.maxHeight).toBe(size2.maxHeight)
    })
  })

  describe('calculateImageDimensions', () => {
    it('should scale down large landscape image on mobile', () => {
      const naturalSize = { width: 1920, height: 1080 }
      const maxSize = getResponsiveImageSize('mobile')

      const dimensions = calculateImageDimensions(
        naturalSize.width,
        naturalSize.height,
        maxSize.maxWidth,
        maxSize.maxHeight
      )

      expect(dimensions.width).toBeLessThanOrEqual(maxSize.maxWidth)
      expect(dimensions.height).toBeLessThanOrEqual(maxSize.maxHeight)

      // Aspect ratio should be preserved
      const originalRatio = naturalSize.width / naturalSize.height
      const scaledRatio = dimensions.width / dimensions.height
      expect(Math.abs(originalRatio - scaledRatio)).toBeLessThan(0.01)
    })

    it('should scale down large portrait image on mobile', () => {
      const naturalSize = { width: 1080, height: 1920 }
      const maxSize = getResponsiveImageSize('mobile')

      const dimensions = calculateImageDimensions(
        naturalSize.width,
        naturalSize.height,
        maxSize.maxWidth,
        maxSize.maxHeight
      )

      expect(dimensions.width).toBeLessThanOrEqual(maxSize.maxWidth)
      expect(dimensions.height).toBeLessThanOrEqual(maxSize.maxHeight)

      // Should scale by height constraint for portrait
      expect(dimensions.height).toBe(maxSize.maxHeight)
    })

    it('should not upscale small images', () => {
      const naturalSize = { width: 200, height: 150 }
      const maxSize = getResponsiveImageSize('desktop')

      const dimensions = calculateImageDimensions(
        naturalSize.width,
        naturalSize.height,
        maxSize.maxWidth,
        maxSize.maxHeight
      )

      // Should keep original size, not upscale
      expect(dimensions.width).toBe(naturalSize.width)
      expect(dimensions.height).toBe(naturalSize.height)
    })

    it('should handle square images correctly', () => {
      const naturalSize = { width: 1000, height: 1000 }
      const maxSize = getResponsiveImageSize('tablet')

      const dimensions = calculateImageDimensions(
        naturalSize.width,
        naturalSize.height,
        maxSize.maxWidth,
        maxSize.maxHeight
      )

      // Square should scale to max size
      expect(dimensions.width).toBe(maxSize.maxWidth)
      expect(dimensions.height).toBe(maxSize.maxWidth)
    })

    it('should handle very wide panorama images', () => {
      const naturalSize = { width: 4000, height: 1000 } // 4:1 ratio
      const maxSize = getResponsiveImageSize('desktop')

      const dimensions = calculateImageDimensions(
        naturalSize.width,
        naturalSize.height,
        maxSize.maxWidth,
        maxSize.maxHeight
      )

      expect(dimensions.width).toBeLessThanOrEqual(maxSize.maxWidth)
      expect(dimensions.height).toBeLessThanOrEqual(maxSize.maxHeight)

      // Ratio should be preserved
      const originalRatio = naturalSize.width / naturalSize.height
      const scaledRatio = dimensions.width / dimensions.height
      expect(Math.abs(originalRatio - scaledRatio)).toBeLessThan(0.01)
    })

    it('should handle very tall images', () => {
      const naturalSize = { width: 500, height: 3000 } // 1:6 ratio
      const maxSize = getResponsiveImageSize('tablet')

      const dimensions = calculateImageDimensions(
        naturalSize.width,
        naturalSize.height,
        maxSize.maxWidth,
        maxSize.maxHeight
      )

      expect(dimensions.width).toBeLessThanOrEqual(maxSize.maxWidth)
      expect(dimensions.height).toBeLessThanOrEqual(maxSize.maxHeight)

      // Should scale by height constraint
      const originalRatio = naturalSize.width / naturalSize.height
      const scaledRatio = dimensions.width / dimensions.height
      expect(Math.abs(originalRatio - scaledRatio)).toBeLessThan(0.01)
    })

    it('should handle 1x1 pixel image', () => {
      const naturalSize = { width: 1, height: 1 }
      const maxSize = getResponsiveImageSize('mobile')

      const dimensions = calculateImageDimensions(
        naturalSize.width,
        naturalSize.height,
        maxSize.maxWidth,
        maxSize.maxHeight
      )

      expect(dimensions.width).toBe(1)
      expect(dimensions.height).toBe(1)
    })

    it('should handle common social media image sizes on mobile', () => {
      const twitterCard = { width: 1200, height: 630 }
      const instagramSquare = { width: 1080, height: 1080 }
      const facebookPost = { width: 1200, height: 630 }

      const maxSize = getResponsiveImageSize('mobile')

      const twitter = calculateImageDimensions(twitterCard.width, twitterCard.height, maxSize.maxWidth, maxSize.maxHeight)
      const instagram = calculateImageDimensions(instagramSquare.width, instagramSquare.height, maxSize.maxWidth, maxSize.maxHeight)
      const facebook = calculateImageDimensions(facebookPost.width, facebookPost.height, maxSize.maxWidth, maxSize.maxHeight)

      expect(twitter.width).toBeLessThanOrEqual(maxSize.maxWidth)
      expect(instagram.width).toBeLessThanOrEqual(maxSize.maxWidth)
      expect(facebook.width).toBeLessThanOrEqual(maxSize.maxWidth)
    })

    it('should scale consistently across breakpoints', () => {
      const naturalSize = { width: 1920, height: 1080 }

      const mobileSize = getResponsiveImageSize('mobile')
      const tabletSize = getResponsiveImageSize('tablet')
      const desktopSize = getResponsiveImageSize('desktop')

      const mobile = calculateImageDimensions(naturalSize.width, naturalSize.height, mobileSize.maxWidth, mobileSize.maxHeight)
      const tablet = calculateImageDimensions(naturalSize.width, naturalSize.height, tabletSize.maxWidth, tabletSize.maxHeight)
      const desktop = calculateImageDimensions(naturalSize.width, naturalSize.height, desktopSize.maxWidth, desktopSize.maxHeight)

      // Larger breakpoints should show larger images
      expect(mobile.width).toBeLessThan(tablet.width)
      expect(tablet.width).toBeLessThan(desktop.width)

      // All should preserve aspect ratio
      const ratio = naturalSize.width / naturalSize.height
      expect(Math.abs(mobile.width / mobile.height - ratio)).toBeLessThan(0.01)
      expect(Math.abs(tablet.width / tablet.height - ratio)).toBeLessThan(0.01)
      expect(Math.abs(desktop.width / desktop.height - ratio)).toBeLessThan(0.01)
    })

    it('should handle fractional dimensions', () => {
      const naturalSize = { width: 1920.5, height: 1080.7 }
      const maxSize = getResponsiveImageSize('desktop')

      const dimensions = calculateImageDimensions(
        naturalSize.width,
        naturalSize.height,
        maxSize.maxWidth,
        maxSize.maxHeight
      )

      // Should return whole numbers
      expect(Number.isInteger(dimensions.width)).toBe(true)
      expect(Number.isInteger(dimensions.height)).toBe(true)
    })

    it('should handle zero dimensions gracefully', () => {
      const maxSize = getResponsiveImageSize('mobile')

      const zeroWidth = calculateImageDimensions(0, 100, maxSize.maxWidth, maxSize.maxHeight)
      const zeroHeight = calculateImageDimensions(100, 0, maxSize.maxWidth, maxSize.maxHeight)

      // Should handle gracefully - either return 0 or default
      expect(zeroWidth.width).toBe(0)
      expect(zeroHeight.height).toBe(0)
    })

    it('should preserve quality with minimal scaling', () => {
      const naturalSize = { width: 610, height: 400 }
      const maxSize = getResponsiveImageSize('desktop')

      const dimensions = calculateImageDimensions(
        naturalSize.width,
        naturalSize.height,
        maxSize.maxWidth,
        maxSize.maxHeight
      )

      // Should scale to max width
      expect(dimensions.width).toBe(maxSize.maxWidth)

      // Height should scale proportionally
      const expectedHeight = Math.round((naturalSize.height / naturalSize.width) * maxSize.maxWidth)
      expect(Math.abs(dimensions.height - expectedHeight)).toBeLessThanOrEqual(1)
    })
  })

  describe('Performance', () => {
    it('should calculate dimensions quickly', () => {
      const maxSize = getResponsiveImageSize('tablet')
      const start = performance.now()

      for (let i = 0; i < 1000; i++) {
        calculateImageDimensions(1920, 1080, maxSize.maxWidth, maxSize.maxHeight)
      }

      const duration = performance.now() - start

      // Should be very fast (< 50ms for 1000 calculations)
      expect(duration).toBeLessThan(50)
    })

    it('should cache breakpoint sizes', () => {
      const size1 = getResponsiveImageSize('desktop')
      const size2 = getResponsiveImageSize('desktop')

      // Should return same object or cached values
      expect(size1.maxWidth).toBe(size2.maxWidth)
      expect(size1.maxHeight).toBe(size2.maxHeight)
    })
  })
})
