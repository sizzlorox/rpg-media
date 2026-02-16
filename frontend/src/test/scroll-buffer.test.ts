// Unit tests for CircularScrollBuffer
// Feature: 001-custom-terminal-emulator

import { describe, it, expect, beforeEach } from 'vitest'
import { CircularScrollBuffer } from '../utils/scroll-buffer'
import { createDefaultLine } from '../types/terminal'

describe('CircularScrollBuffer', () => {
  let buffer: CircularScrollBuffer

  beforeEach(() => {
    buffer = new CircularScrollBuffer(10) // Small buffer for testing
  })

  describe('append and getLine', () => {
    it('appends lines and retrieves them', () => {
      const line1 = createDefaultLine(0, 80)
      const line2 = createDefaultLine(1, 80)

      buffer.append(line1)
      buffer.append(line2)

      expect(buffer.getLine(0)).toEqual(line1)
      expect(buffer.getLine(1)).toEqual(line2)
      expect(buffer.getLength()).toBe(2)
    })

    it('returns null for out-of-range indices', () => {
      const line = createDefaultLine(0, 80)
      buffer.append(line)

      expect(buffer.getLine(-1)).toBeNull()
      expect(buffer.getLine(10)).toBeNull()
    })
  })

  describe('circular wrapping', () => {
    it('overwrites oldest lines when buffer is full', () => {
      // Fill buffer with 10 lines (0-9)
      for (let i = 0; i < 10; i++) {
        buffer.append(createDefaultLine(i, 80))
      }

      expect(buffer.getLength()).toBe(10)
      expect(buffer.getLine(0)).not.toBeNull()

      // Add 11th line - should overwrite line 0
      buffer.append(createDefaultLine(10, 80))

      expect(buffer.getLength()).toBe(10) // Still 10 lines
      expect(buffer.getLine(0)).toBeNull() // Line 0 gone
      expect(buffer.getLine(1)).not.toBeNull() // Line 1 still there
      expect(buffer.getLine(10)).not.toBeNull() // Line 10 is new
    })

    it('maintains correct line numbers after wraparound', () => {
      // Add 15 lines (exceeds buffer size of 10)
      for (let i = 0; i < 15; i++) {
        buffer.append(createDefaultLine(i, 80))
      }

      // Should have lines 5-14 (last 10 lines)
      expect(buffer.getLength()).toBe(10)
      expect(buffer.getLine(4)).toBeNull()
      expect(buffer.getLine(5)?.metadata.lineNumber).toBe(5)
      expect(buffer.getLine(14)?.metadata.lineNumber).toBe(14)
    })
  })

  describe('getVisibleRange', () => {
    beforeEach(() => {
      // Add 50 lines
      buffer = new CircularScrollBuffer(100)
      for (let i = 0; i < 50; i++) {
        buffer.append(createDefaultLine(i, 80))
      }
    })

    it('returns correct range of lines', () => {
      const lines = buffer.getVisibleRange(10, 20)

      expect(lines).toHaveLength(11) // 10-20 inclusive
      expect(lines[0].metadata.lineNumber).toBe(10)
      expect(lines[10].metadata.lineNumber).toBe(20)
    })

    it('handles partial ranges', () => {
      const lines = buffer.getVisibleRange(45, 60)

      expect(lines).toHaveLength(5) // Only 45-49 exist
      expect(lines[0].metadata.lineNumber).toBe(45)
      expect(lines[4].metadata.lineNumber).toBe(49)
    })

    it('returns empty array for invalid range', () => {
      const lines = buffer.getVisibleRange(100, 200)
      expect(lines).toHaveLength(0)
    })
  })

  describe('clear', () => {
    it('clears all lines', () => {
      buffer.append(createDefaultLine(0, 80))
      buffer.append(createDefaultLine(1, 80))

      expect(buffer.getLength()).toBe(2)

      buffer.clear()

      expect(buffer.getLength()).toBe(0)
      expect(buffer.getLine(0)).toBeNull()
      expect(buffer.getTotalLines()).toBe(0)
    })
  })

  describe('helper methods', () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        buffer.append(createDefaultLine(i, 80))
      }
    })

    it('getTotalLines returns total lines ever written', () => {
      expect(buffer.getTotalLines()).toBe(5)
    })

    it('getOldestLineNumber returns oldest line in buffer', () => {
      expect(buffer.getOldestLineNumber()).toBe(0)

      // Add more lines to cause wraparound
      for (let i = 5; i < 15; i++) {
        buffer.append(createDefaultLine(i, 80))
      }

      expect(buffer.getOldestLineNumber()).toBe(5) // Lines 0-4 overwritten
    })

    it('getNewestLineNumber returns newest line in buffer', () => {
      expect(buffer.getNewestLineNumber()).toBe(4)

      buffer.append(createDefaultLine(5, 80))
      expect(buffer.getNewestLineNumber()).toBe(5)
    })

    it('hasLine checks if line exists in buffer', () => {
      expect(buffer.hasLine(2)).toBe(true)
      expect(buffer.hasLine(10)).toBe(false)
      expect(buffer.hasLine(-1)).toBe(false)
    })
  })
})
