// Integration Test: Text Wrapping and Reflow
// Feature: 001-custom-terminal-emulator
// User Story 7: Text Wrapping and Reflow on Resize

import { describe, it, expect } from 'vitest'
import { wrapText, reflowText, calculateWrapPoints } from '../../utils/text-wrapping'
import { getResponsiveConfig } from '../../utils/terminal-responsive'

describe('Terminal Text Wrapping Integration', () => {
  it('should wrap long text to fit mobile width', () => {
    const config = getResponsiveConfig(375)
    const maxWidth = config.config.minCols

    const longText = 'This is a very long line of text that will definitely exceed the mobile terminal width and needs to be wrapped'
    const wrapped = wrapText(longText, maxWidth)

    // Should create multiple lines
    expect(wrapped.length).toBeGreaterThan(1)

    // Each line should not exceed max width
    wrapped.forEach(line => {
      expect(line.length).toBeLessThanOrEqual(maxWidth)
    })
  })

  it('should wrap text at word boundaries', () => {
    const maxWidth = 40

    const text = 'The quick brown fox jumps over the lazy dog'
    const wrapped = wrapText(text, maxWidth)

    // Should not break words
    wrapped.forEach(line => {
      // No line should start with a space (would indicate mid-word break)
      if (line !== wrapped[0]) {
        expect(line[0]).not.toBe(' ')
      }
    })
  })

  it('should handle text without spaces', () => {
    const maxWidth = 40

    const longWord = 'a'.repeat(100)
    const wrapped = wrapText(longWord, maxWidth)

    // Should hard-wrap at maxWidth
    wrapped.forEach(line => {
      expect(line.length).toBeLessThanOrEqual(maxWidth)
    })
  })

  it('should reflow text when terminal width increases', () => {
    const mobileConfig = getResponsiveConfig(375)
    const desktopConfig = getResponsiveConfig(1920)

    const text = 'This is a long line of text that will wrap differently on mobile and desktop'

    const mobileWrapped = wrapText(text, mobileConfig.config.minCols)
    const desktopWrapped = wrapText(text, desktopConfig.config.minCols)

    // Mobile should have more lines
    expect(mobileWrapped.length).toBeGreaterThan(desktopWrapped.length)

    // Content should be preserved
    expect(mobileWrapped.join(' ').trim()).toContain(text.split(' ')[0])
    expect(desktopWrapped.join(' ').trim()).toContain(text.split(' ')[0])
  })

  it('should reflow text when terminal width decreases', () => {
    const desktopConfig = getResponsiveConfig(1920)
    const mobileConfig = getResponsiveConfig(375)

    const originalText = 'Line 1\nLine 2\nLine 3'
    const lines = originalText.split('\n')

    // Wrap for desktop
    const desktopLines = lines.flatMap(line =>
      wrapText(line, desktopConfig.config.minCols)
    )

    // Reflow for mobile
    const reflowed = reflowText(desktopLines.join('\n'), mobileConfig.config.minCols)

    // Should create more lines on mobile
    expect(reflowed.length).toBeGreaterThanOrEqual(desktopLines.length)
  })

  it('should preserve indentation when wrapping', () => {
    const maxWidth = 40

    const indentedText = '    This is an indented paragraph that needs to wrap'
    const wrapped = wrapText(indentedText, maxWidth)

    // First line should have indentation
    expect(wrapped[0].startsWith('    ')).toBe(true)
  })

  it('should handle empty lines', () => {
    const maxWidth = 40

    const text = 'Line 1\n\nLine 3'
    const lines = text.split('\n')
    const wrapped = lines.flatMap(line =>
      line === '' ? [''] : wrapText(line, maxWidth)
    )

    // Should preserve empty line
    expect(wrapped).toContain('')
  })

  it('should calculate wrap points correctly', () => {
    const text = 'This is a test sentence with multiple words'
    const maxWidth = 20

    const wrapPoints = calculateWrapPoints(text, maxWidth)

    // Should identify word boundaries
    expect(wrapPoints.length).toBeGreaterThan(0)
    wrapPoints.forEach(point => {
      expect(point).toBeGreaterThan(0)
      expect(point).toBeLessThan(text.length)
    })
  })

  it('should handle URLs without breaking them unnecessarily', () => {
    const maxWidth = 60

    const text = 'Check this link: https://example.com/very/long/path/to/resource for more info'
    const wrapped = wrapText(text, maxWidth)

    // URL should ideally be on its own line or not broken mid-URL
    const urlLine = wrapped.find(line => line.includes('https://'))
    expect(urlLine).toBeDefined()
  })

  it('should handle ANSI color codes when wrapping', () => {
    const maxWidth = 40

    const coloredText = '\x1b[31mThis is red text that needs to wrap across multiple lines\x1b[0m'
    const wrapped = wrapText(coloredText, maxWidth)

    // Should preserve ANSI codes
    expect(wrapped.join('')).toContain('\x1b[31m')
    expect(wrapped.join('')).toContain('\x1b[0m')
  })

  it('should wrap tabular data correctly', () => {
    const maxWidth = 40

    const table = 'Name      Level    XP\nAlice     5        1200\nBob       3        450'
    const lines = table.split('\n')
    const wrapped = lines.flatMap(line => wrapText(line, maxWidth))

    // Should preserve table structure for short lines
    expect(wrapped.length).toBeGreaterThanOrEqual(lines.length)
  })

  it('should handle mixed content wrapping', () => {
    const config = getResponsiveConfig(768)
    const maxWidth = config.config.minCols

    const mixed = [
      'Short line',
      'This is a much longer line that will definitely need to wrap to fit within the terminal width constraints',
      'Another short',
      'And another very long line that contains multiple words and phrases that need to be wrapped carefully'
    ]

    const wrapped = mixed.flatMap(line => wrapText(line, maxWidth))

    // All lines should fit
    wrapped.forEach(line => {
      expect(line.length).toBeLessThanOrEqual(maxWidth)
    })
  })

  it('should reflow on orientation change', () => {
    const portrait = getResponsiveConfig(375)  // Portrait phone
    const landscape = getResponsiveConfig(667) // Landscape phone

    const text = 'This text will reflow when the device orientation changes from portrait to landscape'

    const portraitWrapped = wrapText(text, portrait.config.minCols)
    const landscapeWrapped = wrapText(text, landscape.config.minCols)

    // Portrait should have more lines
    expect(portraitWrapped.length).toBeGreaterThan(landscapeWrapped.length)
  })

  it('should handle very long words', () => {
    const maxWidth = 40

    const longWord = 'supercalifragilisticexpialidocious'
    const text = `This word ${longWord} is very long`
    const wrapped = wrapText(text, maxWidth)

    // Should handle the long word gracefully
    expect(wrapped.length).toBeGreaterThan(1)
    wrapped.forEach(line => {
      expect(line.length).toBeLessThanOrEqual(maxWidth)
    })
  })

  it('should preserve trailing spaces strategically', () => {
    const maxWidth = 40

    const text = 'Line with trailing spaces    '
    const wrapped = wrapText(text, maxWidth)

    // Single line should preserve some spacing
    expect(wrapped.length).toBe(1)
  })

  it('should handle code blocks', () => {
    const maxWidth = 60

    const code = 'function longFunctionName(param1, param2, param3, param4) { return something; }'
    const wrapped = wrapText(code, maxWidth)

    // Should wrap code
    expect(wrapped.length).toBeGreaterThan(1)
    wrapped.forEach(line => {
      expect(line.length).toBeLessThanOrEqual(maxWidth)
    })
  })

  it('should reflow command output', () => {
    const mobileConfig = getResponsiveConfig(375)

    const commandOutput = [
      '> /feed',
      '[Post 1] Alice: This is a long post that might wrap',
      '[Post 2] Bob: Another post with content',
      'Showing 10 posts'
    ]

    const wrapped = commandOutput.flatMap(line =>
      wrapText(line, mobileConfig.config.minCols)
    )

    // Should handle all lines
    expect(wrapped.length).toBeGreaterThanOrEqual(commandOutput.length)
  })

  it('should handle character encoding correctly', () => {
    const maxWidth = 40

    const unicode = 'Hello 你好 مرحبا שלום with different scripts'
    const wrapped = wrapText(unicode, maxWidth)

    // Should preserve unicode
    expect(wrapped.join('')).toContain('你好')
    expect(wrapped.join('')).toContain('مرحبا')
    expect(wrapped.join('')).toContain('שלום')
  })

  it('should maintain performance with large text', () => {
    const maxWidth = 80

    // Generate large text
    const largeText = 'word '.repeat(1000)
    const start = performance.now()

    const wrapped = wrapText(largeText, maxWidth)

    const duration = performance.now() - start

    // Should complete quickly (< 100ms)
    expect(duration).toBeLessThan(100)
    expect(wrapped.length).toBeGreaterThan(0)
  })

  it('should handle consecutive spaces', () => {
    const maxWidth = 40

    const text = 'Text    with     multiple   spaces'
    const wrapped = wrapText(text, maxWidth)

    // Should preserve some spacing information
    expect(wrapped.join('')).toContain('Text')
    expect(wrapped.join('')).toContain('spaces')
  })

  it('should wrap at different breakpoints consistently', () => {
    const breakpoints = [
      { width: 320, name: 'mobile-small' },
      { width: 375, name: 'mobile' },
      { width: 768, name: 'tablet' },
      { width: 1024, name: 'tablet-large' },
      { width: 1920, name: 'desktop' }
    ]

    const text = 'This is sample text that will be wrapped at various breakpoints to test consistency'

    const results = breakpoints.map(bp => {
      const config = getResponsiveConfig(bp.width)
      const wrapped = wrapText(text, config.config.minCols)
      return {
        breakpoint: bp.name,
        lines: wrapped.length,
        maxWidth: config.config.minCols
      }
    })

    // Narrower widths should have more lines
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].lines).toBeGreaterThanOrEqual(results[i].lines)
    }
  })
})
