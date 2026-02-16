// Circular Scroll Buffer Implementation
// Feature: 001-custom-terminal-emulator

import type { TerminalLine } from '../types/terminal'

/**
 * Circular buffer managing terminal lines with efficient append/retrieve operations.
 *
 * Maintains a fixed-size buffer of the last N lines without expensive array shifting.
 * Uses modulo arithmetic for O(1) append and retrieve operations.
 *
 * Performance characteristics:
 * - append(): O(1) - no array shifting
 * - getLine(): O(1) - direct index calculation
 * - getVisibleRange(): O(n) where n = endLine - startLine
 */
export class CircularScrollBuffer {
  private buffer: (TerminalLine | null)[]  // Fixed-size circular array
  private head: number                      // Write position (next append)
  private size: number                      // Max buffer size (default 10,000 lines)
  private totalLines: number                // Total lines ever written (for line numbers)

  constructor(maxSize: number = 10000) {
    this.buffer = new Array(maxSize).fill(null)
    this.head = 0
    this.size = maxSize
    this.totalLines = 0
  }

  /**
   * Append a line to the buffer.
   * If buffer is full, overwrites the oldest line.
   */
  append(line: TerminalLine): void {
    this.buffer[this.head % this.size] = line
    this.head++
    this.totalLines++
  }

  /**
   * Get a specific line by absolute line number.
   * Returns null if line number is out of range.
   */
  getLine(index: number): TerminalLine | null {
    // Calculate offset from the oldest line in buffer
    const oldestLine = Math.max(0, this.totalLines - this.size)
    const offset = index - oldestLine

    // Check if index is within valid range
    if (offset < 0 || offset >= Math.min(this.totalLines, this.size)) {
      return null
    }

    // Calculate actual buffer index using circular logic
    let bufferIndex: number
    if (this.totalLines <= this.size) {
      // Buffer hasn't wrapped yet - lines are at sequential positions starting from 0
      bufferIndex = offset
    } else {
      // Buffer has wrapped - use circular indexing from current head position
      const actualHead = this.head % this.size
      const currentSize = Math.min(this.totalLines, this.size)
      bufferIndex = (actualHead - currentSize + offset + this.size) % this.size
    }

    return this.buffer[bufferIndex]
  }

  /**
   * Get a range of visible lines (inclusive).
   * Returns only lines that exist in the buffer.
   */
  getVisibleRange(startLine: number, endLine: number): TerminalLine[] {
    const lines: TerminalLine[] = []
    const oldest = this.getOldestLineNumber()
    const newest = this.getNewestLineNumber()

    console.log('[getVisibleRange] Request:', { startLine, endLine, oldest, newest, totalLines: this.totalLines })

    for (let i = startLine; i <= endLine; i++) {
      const line = this.getLine(i)
      if (line !== null) {
        lines.push(line)
      }
    }

    console.log('[getVisibleRange] Returning', lines.length, 'lines')
    return lines
  }

  /**
   * Remove and return the last line from the buffer.
   * Returns null if buffer is empty.
   */
  popLast(): TerminalLine | null {
    if (this.totalLines === 0) return null

    const lastIndex = (this.head - 1 + this.size) % this.size
    const lastLine = this.buffer[lastIndex]
    this.buffer[lastIndex] = null
    this.head = (this.head - 1 + this.size) % this.size
    this.totalLines--

    return lastLine
  }

  /**
   * Clear the entire buffer.
   */
  clear(): void {
    this.buffer = new Array(this.size).fill(null)
    this.head = 0
    this.totalLines = 0
  }

  /**
   * Get the current number of lines in the buffer.
   * Returns the smaller of totalLines or size (buffer capacity).
   */
  getLength(): number {
    return Math.min(this.totalLines, this.size)
  }

  /**
   * Get the total number of lines ever written (including overwritten).
   */
  getTotalLines(): number {
    return this.totalLines
  }

  /**
   * Get the absolute line number of the oldest line in buffer.
   */
  getOldestLineNumber(): number {
    return Math.max(0, this.totalLines - this.size)
  }

  /**
   * Get the absolute line number of the newest line in buffer.
   */
  getNewestLineNumber(): number {
    return Math.max(0, this.totalLines - 1)
  }

  /**
   * Check if a line number exists in the buffer.
   */
  hasLine(lineNumber: number): boolean {
    const oldestLine = this.getOldestLineNumber()
    const newestLine = this.getNewestLineNumber()
    return lineNumber >= oldestLine && lineNumber <= newestLine
  }
}
