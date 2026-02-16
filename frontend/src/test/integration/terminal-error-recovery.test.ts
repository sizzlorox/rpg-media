// Integration Test: Error Recovery
// Feature: 001-custom-terminal-emulator
// User Story 8: Error Boundary with Terminal Reset

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CircularScrollBuffer } from '../../utils/scroll-buffer'
import { InputBufferManager } from '../../utils/input-buffer'
import { CommandHistoryManager } from '../../utils/command-history-manager'
import { ANSIParser } from '../../utils/ansi-parser'

describe('Terminal Error Recovery Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should recover from buffer overflow', () => {
    const buffer = new CircularScrollBuffer(100)

    // Fill buffer beyond capacity
    for (let i = 0; i < 200; i++) {
      const line = {
        metadata: { lineNumber: i, timestamp: Date.now() },
        cells: [],
        image: null
      }
      buffer.append(line)
    }

    // Buffer should still be functional
    expect(buffer.getLength()).toBe(100)
    expect(buffer.getLine(0)).toBeDefined()
  })

  it('should recover from corrupted input buffer', () => {
    const inputBuffer = new InputBufferManager(100)

    // Try to insert invalid data
    try {
      // @ts-ignore - intentionally testing invalid input
      inputBuffer.insertChar(null)
    } catch (error) {
      // Should handle gracefully
    }

    // Buffer should still work
    inputBuffer.insertChar('a')
    expect(inputBuffer.getText()).toContain('a')
  })

  it('should recover from history manager errors', () => {
    const history = new CommandHistoryManager(100)

    // Add valid commands
    history.add('command1')
    history.add('command2')

    // Try to add invalid command
    try {
      // @ts-ignore
      history.add(null)
    } catch (error) {
      // Should handle gracefully
    }

    // History should still work
    expect(history.size()).toBe(2)
    expect(history.getPrevious()).toBe('command2')
  })

  it('should recover from ANSI parser errors', () => {
    const parser = new ANSIParser()

    // Parse valid ANSI
    const valid = parser.parse('\x1b[31mRed\x1b[0m')
    expect(valid.length).toBeGreaterThan(0)

    // Parse invalid ANSI
    const invalid = parser.parse('\x1b[999999mInvalid\x1b[0m')

    // Parser should still work
    expect(invalid.length).toBeGreaterThan(0)

    // Can parse valid ANSI again
    const valid2 = parser.parse('\x1b[32mGreen\x1b[0m')
    expect(valid2.length).toBeGreaterThan(0)
  })

  it('should recover from cursor position errors', () => {
    const inputBuffer = new InputBufferManager(100)

    inputBuffer.insertChar('t')
    inputBuffer.insertChar('e')
    inputBuffer.insertChar('s')
    inputBuffer.insertChar('t')

    // Try to move cursor out of bounds
    inputBuffer.moveCursor(-1000)

    // Should clamp to valid position
    expect(inputBuffer.getCursorPosition()).toBeGreaterThanOrEqual(0)

    // Try to move cursor beyond end
    inputBuffer.moveCursor(1000)

    // Should clamp to valid position
    expect(inputBuffer.getCursorPosition()).toBeLessThanOrEqual(4)
  })

  it('should recover from delete operations at boundaries', () => {
    const inputBuffer = new InputBufferManager(100)

    // Try to delete when empty
    inputBuffer.deleteBackward()
    expect(inputBuffer.getText()).toBe('')

    inputBuffer.insertChar('a')

    // Try to delete forward at end
    inputBuffer.deleteForward()
    expect(inputBuffer.getText()).toBe('a')

    // Move to start and delete backward
    inputBuffer.moveCursorToStart()
    inputBuffer.deleteBackward()
    expect(inputBuffer.getText()).toBe('a')
  })

  it('should recover from rapid state changes', () => {
    const inputBuffer = new InputBufferManager(100)

    // Rapid operations
    for (let i = 0; i < 100; i++) {
      inputBuffer.insertChar('a')
      inputBuffer.deleteBackward()
      inputBuffer.insertChar('b')
      inputBuffer.moveCursor(-1)
      inputBuffer.moveCursor(1)
    }

    // Buffer should still be functional
    inputBuffer.clear()
    inputBuffer.insertChar('test')
    expect(inputBuffer.getText()).toContain('test')
  })

  it('should recover from buffer clear during operations', () => {
    const buffer = new CircularScrollBuffer(100)

    // Add lines
    for (let i = 0; i < 50; i++) {
      buffer.append({
        metadata: { lineNumber: i, timestamp: Date.now() },
        cells: [],
        image: null
      })
    }

    // Clear buffer
    buffer.clear()

    // Should be able to add new lines
    buffer.append({
      metadata: { lineNumber: 0, timestamp: Date.now() },
      cells: [],
      image: null
    })

    expect(buffer.getLength()).toBe(1)
  })

  it('should recover from concurrent modifications', () => {
    const inputBuffer = new InputBufferManager(100)

    // Simulate concurrent operations
    const operations = [
      () => inputBuffer.insertChar('a'),
      () => inputBuffer.insertChar('b'),
      () => inputBuffer.deleteBackward(),
      () => inputBuffer.moveCursor(-1),
      () => inputBuffer.insertChar('c')
    ]

    operations.forEach(op => op())

    // Buffer should still be valid
    expect(inputBuffer.getText().length).toBeGreaterThan(0)
  })

  it('should recover from malformed ANSI sequences', () => {
    const parser = new ANSIParser()

    const malformed = [
      '\x1b[',           // Incomplete
      '\x1b[m',          // Missing parameter
      '\x1b[31',         // Missing end
      '\x1b31m',         // Missing bracket
      '\x1b[31;m',       // Incomplete multi-param
    ]

    malformed.forEach(seq => {
      const result = parser.parse(seq + 'text')
      // Should still parse the text part
      expect(result.some(cell => cell.char !== '\n')).toBe(true)
    })
  })

  it('should recover from history navigation errors', () => {
    const history = new CommandHistoryManager(100)

    // Try to navigate empty history
    expect(history.getPrevious()).toBeNull()
    expect(history.getNext()).toBeNull()

    // Add commands
    history.add('cmd1')
    history.add('cmd2')

    // Navigate beyond bounds
    history.getPrevious()
    history.getPrevious()
    history.getPrevious()
    history.getPrevious() // Beyond oldest

    // Should stay at oldest
    expect(history.getCurrentIndex()).toBeGreaterThanOrEqual(0)

    // Navigate forward beyond bounds
    for (let i = 0; i < 10; i++) {
      history.getNext()
    }

    // Should handle gracefully
    expect(history.getCurrentIndex()).toBeLessThan(2)
  })

  it('should recover from reset during active input', () => {
    const inputBuffer = new InputBufferManager(100)

    'active input'.split('').forEach(char => inputBuffer.insertChar(char))

    // Reset while input is active
    inputBuffer.clear()

    // Should be able to input again
    'new input'.split('').forEach(char => inputBuffer.insertChar(char))

    expect(inputBuffer.getText()).toBe('new input')
  })

  it('should recover from rendering errors', () => {
    const buffer = new CircularScrollBuffer(100)

    // Add line with potentially problematic data
    buffer.append({
      metadata: { lineNumber: 0, timestamp: Date.now() },
      cells: [],
      image: { url: 'invalid://url', alt: '' }
    })

    // Should still be retrievable
    const line = buffer.getLine(0)
    expect(line).toBeDefined()
  })

  it('should recover from memory pressure', () => {
    const buffer = new CircularScrollBuffer(10000)

    // Add many lines
    for (let i = 0; i < 10000; i++) {
      buffer.append({
        metadata: { lineNumber: i, timestamp: Date.now() },
        cells: `Line ${i}`.split('').map(char => ({
          char,
          fgColor: null,
          bgColor: null,
          bold: false,
          italic: false,
          underline: false,
          dim: false,
          inverse: false,
          hidden: false
        })),
        image: null
      })
    }

    // Should handle capacity limit
    expect(buffer.getLength()).toBeLessThanOrEqual(10000)

    // Should still be functional
    const line = buffer.getLine(0)
    expect(line).toBeDefined()
  })

  it('should recover from scroll position errors', () => {
    const buffer = new CircularScrollBuffer(100)

    for (let i = 0; i < 100; i++) {
      buffer.append({
        metadata: { lineNumber: i, timestamp: Date.now() },
        cells: [],
        image: null
      })
    }

    // Try to get invalid range
    const range = buffer.getVisibleRange(-10, 200)

    // Should return valid range
    expect(range).toBeDefined()
    expect(Array.isArray(range)).toBe(true)
  })

  it('should recover after terminal reset', () => {
    const inputBuffer = new InputBufferManager(100)
    const history = new CommandHistoryManager(100)
    const buffer = new CircularScrollBuffer(100)

    // Add data
    'test input'.split('').forEach(char => inputBuffer.insertChar(char))
    history.add('command1')
    buffer.append({
      metadata: { lineNumber: 0, timestamp: Date.now() },
      cells: [],
      image: null
    })

    // Reset all
    inputBuffer.clear()
    history.clear()
    buffer.clear()

    // All should work after reset
    inputBuffer.insertChar('a')
    expect(inputBuffer.getText()).toBe('a')

    history.add('new command')
    expect(history.size()).toBe(1)

    buffer.append({
      metadata: { lineNumber: 0, timestamp: Date.now() },
      cells: [],
      image: null
    })
    expect(buffer.getLength()).toBe(1)
  })

  it('should maintain consistency after errors', () => {
    const inputBuffer = new InputBufferManager(100)

    // Perform operations that might cause errors
    try {
      inputBuffer.moveCursor(1000)
      inputBuffer.deleteBackward()
      inputBuffer.insertChar('a')
      inputBuffer.moveCursor(-1000)
      inputBuffer.insertChar('b')
    } catch (error) {
      // Ignore errors
    }

    // Buffer should still be in consistent state
    const text = inputBuffer.getText()
    const cursor = inputBuffer.getCursorPosition()

    expect(cursor).toBeGreaterThanOrEqual(0)
    expect(cursor).toBeLessThanOrEqual(text.length)
  })

  it('should handle graceful degradation', () => {
    const parser = new ANSIParser()

    // Mix of valid and invalid ANSI
    const mixed = '\x1b[31mRed\x1b[0m \x1b[999mInvalid\x1b[0m \x1b[32mGreen\x1b[0m'
    const result = parser.parse(mixed)

    // Should parse what it can
    expect(result.length).toBeGreaterThan(0)
    expect(result.some(cell => cell.char === 'R')).toBe(true)
    expect(result.some(cell => cell.char === 'G')).toBe(true)
  })
})
