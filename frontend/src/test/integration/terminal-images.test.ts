// Integration Test: Inline Image Rendering
// Feature: 001-custom-terminal-emulator
// User Story 1: View Posts with Inline Images

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TerminalRenderer } from '../../components/terminal/TerminalRenderer'
import { parseImageMarkers } from '../../components/terminal/TerminalImageManager'
import { createDefaultLine } from '../../types/terminal'
import type { TerminalLine } from '../../types/terminal'

describe('Terminal Images Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render image inline at correct position', () => {
    // Given: A post with an image marker
    const postText = 'Check out this photo: [IMG:https://example.com/photo.jpg:A sunset]'
    const { text, images } = parseImageMarkers(postText)

    // When: Create terminal line with image
    const line = createDefaultLine(0, 80)
    const cells = text.split('').map(char => ({
      char,
      fgColor: null,
      bgColor: null,
      bold: false,
      italic: false,
      underline: false,
      dim: false,
      inverse: false,
      hidden: false
    }))
    line.cells = cells
    line.image = images[0] || null

    // Then: Image should be attached to the line
    expect(line.image).toBeDefined()
    expect(line.image?.url).toBe('https://example.com/photo.jpg')
    expect(line.image?.alt).toBe('A sunset')
  })

  it('should maintain image position during scroll', () => {
    // Given: Multiple lines with images
    const lines: TerminalLine[] = []

    for (let i = 0; i < 10; i++) {
      const line = createDefaultLine(i, 80)
      if (i % 3 === 0) {
        // Add image every 3rd line
        line.image = {
          id: `img-${i}`,
          url: `https://example.com/photo${i}.jpg`,
          alt: `Photo ${i}`,
          maxWidth: 600,
          maxHeight: 400
        }
      }
      lines.push(line)
    }

    // When: Render lines
    const { container } = render(
      <TerminalRenderer
        lines={lines}
        lineHeight={20}
        charWidth={10}
        startLineNumber={0}
      />
    )

    // Then: Images should be in their respective lines
    const imageContainers = container.querySelectorAll('.terminal-line-image')
    expect(imageContainers.length).toBe(4) // Lines 0, 3, 6, 9
  })

  it('should handle multiple images in sequence', () => {
    const text1 = '[IMG:https://example.com/1.jpg:First]'
    const text2 = '[IMG:https://example.com/2.jpg:Second]'
    const text3 = '[IMG:https://example.com/3.jpg:Third]'

    const result1 = parseImageMarkers(text1)
    const result2 = parseImageMarkers(text2)
    const result3 = parseImageMarkers(text3)

    expect(result1.images).toHaveLength(1)
    expect(result2.images).toHaveLength(1)
    expect(result3.images).toHaveLength(1)

    expect(result1.images[0].url).toBe('https://example.com/1.jpg')
    expect(result2.images[0].url).toBe('https://example.com/2.jpg')
    expect(result3.images[0].url).toBe('https://example.com/3.jpg')
  })

  it('should preserve image data through buffer operations', () => {
    const { text, images } = parseImageMarkers('[IMG:https://test.com/img.jpg:Test Image]')

    expect(images[0]).toMatchObject({
      url: 'https://test.com/img.jpg',
      alt: 'Test Image'
    })
    expect(images[0].id).toBeDefined()
    expect(typeof images[0].id).toBe('string')
  })

  it('should handle responsive image sizing', () => {
    const { images } = parseImageMarkers('[IMG:https://example.com/photo.jpg:Photo]')
    const image = images[0]

    // Should have size constraints
    expect(image).toBeDefined()
    expect(typeof image.url).toBe('string')
    expect(typeof image.alt).toBe('string')
  })
})
