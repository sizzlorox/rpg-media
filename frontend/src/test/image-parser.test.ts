// Image Parser Unit Tests
// Feature: 001-custom-terminal-emulator
// User Story 1: View Posts with Inline Images

import { describe, it, expect } from 'vitest'
import { parseImageMarkers, getResponsiveImageDimensions } from '../components/terminal/TerminalImageManager'

describe('parseImageMarkers', () => {
  it('should parse single image marker', () => {
    const input = 'Check out this photo: [IMG:https://example.com/photo.jpg:A sunset]'
    const result = parseImageMarkers(input)

    expect(result.text).toBe('Check out this photo: ')
    expect(result.images).toHaveLength(1)
    expect(result.images[0]).toMatchObject({
      url: 'https://example.com/photo.jpg',
      alt: 'A sunset'
    })
    expect(result.images[0].id).toBeDefined()
  })

  it('should parse multiple image markers', () => {
    const input = 'First [IMG:https://example.com/1.jpg:Photo 1] and second [IMG:https://example.com/2.jpg:Photo 2]'
    const result = parseImageMarkers(input)

    expect(result.text).toBe('First  and second ')
    expect(result.images).toHaveLength(2)
    expect(result.images[0].url).toBe('https://example.com/1.jpg')
    expect(result.images[0].alt).toBe('Photo 1')
    expect(result.images[1].url).toBe('https://example.com/2.jpg')
    expect(result.images[1].alt).toBe('Photo 2')
  })

  it('should handle text with no image markers', () => {
    const input = 'Just plain text with no images'
    const result = parseImageMarkers(input)

    expect(result.text).toBe(input)
    expect(result.images).toHaveLength(0)
  })

  it('should handle empty string', () => {
    const result = parseImageMarkers('')

    expect(result.text).toBe('')
    expect(result.images).toHaveLength(0)
  })

  it('should handle malformed image markers gracefully', () => {
    const input = 'Incomplete marker [IMG:https://example.com/photo.jpg and [IMG:] empty'
    const result = parseImageMarkers(input)

    // Should treat malformed markers as text
    expect(result.text).toContain('[IMG:')
    expect(result.images).toHaveLength(0)
  })

  it('should handle image markers at start of string', () => {
    const input = '[IMG:https://example.com/photo.jpg:First photo] followed by text'
    const result = parseImageMarkers(input)

    expect(result.text).toBe(' followed by text')
    expect(result.images).toHaveLength(1)
    expect(result.images[0].url).toBe('https://example.com/photo.jpg')
  })

  it('should handle image markers at end of string', () => {
    const input = 'Text before [IMG:https://example.com/photo.jpg:Last photo]'
    const result = parseImageMarkers(input)

    expect(result.text).toBe('Text before ')
    expect(result.images).toHaveLength(1)
    expect(result.images[0].url).toBe('https://example.com/photo.jpg')
  })

  it('should handle consecutive image markers', () => {
    const input = '[IMG:https://example.com/1.jpg:Photo 1][IMG:https://example.com/2.jpg:Photo 2]'
    const result = parseImageMarkers(input)

    expect(result.text).toBe('')
    expect(result.images).toHaveLength(2)
  })

  it('should handle URLs with special characters', () => {
    const input = '[IMG:https://example.com/photo?id=123&size=large:Photo with params]'
    const result = parseImageMarkers(input)

    expect(result.images).toHaveLength(1)
    expect(result.images[0].url).toBe('https://example.com/photo?id=123&size=large')
  })

  it('should handle alt text with special characters', () => {
    const input = '[IMG:https://example.com/photo.jpg:Alt with "quotes" and \'apostrophes\']'
    const result = parseImageMarkers(input)

    expect(result.images).toHaveLength(1)
    expect(result.images[0].alt).toBe('Alt with "quotes" and \'apostrophes\'')
  })

  it('should generate unique IDs for each image', () => {
    const input = '[IMG:https://example.com/1.jpg:Photo 1][IMG:https://example.com/2.jpg:Photo 2]'
    const result = parseImageMarkers(input)

    expect(result.images[0].id).toBeDefined()
    expect(result.images[1].id).toBeDefined()
    expect(result.images[0].id).not.toBe(result.images[1].id)
  })

  it('should preserve whitespace around markers', () => {
    const input = 'Text before   [IMG:https://example.com/photo.jpg:Photo]   text after'
    const result = parseImageMarkers(input)

    expect(result.text).toBe('Text before      text after')
  })
})

describe('getResponsiveImageDimensions', () => {
  it('should return mobile dimensions for mobile breakpoint', () => {
    const dimensions = getResponsiveImageDimensions('mobile')

    expect(dimensions.maxWidth).toBe(280)
    expect(dimensions.maxHeight).toBe(400)
  })

  it('should return tablet dimensions for tablet breakpoint', () => {
    const dimensions = getResponsiveImageDimensions('tablet')

    expect(dimensions.maxWidth).toBe(400)
    expect(dimensions.maxHeight).toBe(600)
  })

  it('should return desktop dimensions for desktop breakpoint', () => {
    const dimensions = getResponsiveImageDimensions('desktop')

    expect(dimensions.maxWidth).toBe(600)
    expect(dimensions.maxHeight).toBe(800)
  })

  it('should handle invalid breakpoint by returning mobile dimensions', () => {
    const dimensions = getResponsiveImageDimensions('invalid' as any)

    // Should default to safe dimensions
    expect(dimensions.maxWidth).toBeDefined()
    expect(dimensions.maxHeight).toBeDefined()
    expect(dimensions.maxWidth).toBeGreaterThan(0)
    expect(dimensions.maxHeight).toBeGreaterThan(0)
  })
})

describe('Image parsing edge cases', () => {
  it('should handle very long URLs', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(500) + '.jpg'
    const input = `[IMG:${longUrl}:Long URL]`
    const result = parseImageMarkers(input)

    expect(result.images).toHaveLength(1)
    expect(result.images[0].url).toBe(longUrl)
  })

  it('should handle very long alt text', () => {
    const longAlt = 'a'.repeat(500)
    const input = `[IMG:https://example.com/photo.jpg:${longAlt}]`
    const result = parseImageMarkers(input)

    expect(result.images).toHaveLength(1)
    expect(result.images[0].alt).toBe(longAlt)
  })

  it('should handle empty alt text', () => {
    const input = '[IMG:https://example.com/photo.jpg:]'
    const result = parseImageMarkers(input)

    expect(result.images).toHaveLength(1)
    expect(result.images[0].alt).toBe('')
  })

  it('should handle colons in URL path', () => {
    const input = '[IMG:https://example.com/path:with:colons/photo.jpg:Alt text]'
    const result = parseImageMarkers(input)

    expect(result.images).toHaveLength(1)
    expect(result.images[0].url).toBe('https://example.com/path:with:colons/photo.jpg')
    expect(result.images[0].alt).toBe('Alt text')
  })

  it('should handle newlines in alt text', () => {
    const input = '[IMG:https://example.com/photo.jpg:Alt with\nnewline]'
    const result = parseImageMarkers(input)

    expect(result.images).toHaveLength(1)
    expect(result.images[0].alt).toBe('Alt with\nnewline')
  })
})
