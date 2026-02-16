// Terminal Scroll Buffer Component
// Feature: 001-custom-terminal-emulator

import { useState, useCallback } from 'react'
import { CircularScrollBuffer } from '../../utils/scroll-buffer'
import type { TerminalLine } from '../../types/terminal'

/**
 * React wrapper for CircularScrollBuffer with state management
 */
export function useTerminalScrollBuffer(maxSize: number = 10000) {
  const [buffer] = useState(() => new CircularScrollBuffer(maxSize))
  const [revision, setRevision] = useState(0)

  const append = useCallback((line: TerminalLine) => {
    buffer.append(line)
    setRevision(rev => rev + 1) // Trigger re-render
  }, [buffer])

  const appendMultiple = useCallback((lines: TerminalLine[]) => {
    lines.forEach(line => buffer.append(line))
    setRevision(rev => rev + 1)
  }, [buffer])

  const popLast = useCallback(() => {
    const line = buffer.popLast()
    setRevision(rev => rev + 1)
    return line
  }, [buffer])

  const clear = useCallback(() => {
    buffer.clear()
    setRevision(rev => rev + 1)
  }, [buffer])

  const getLine = useCallback((index: number) => {
    return buffer.getLine(index)
  }, [buffer])

  const getVisibleRange = useCallback((startLine: number, endLine: number) => {
    return buffer.getVisibleRange(startLine, endLine)
  }, [buffer])

  return {
    append,
    appendMultiple,
    popLast,
    clear,
    getLine,
    getVisibleRange,
    getLength: () => buffer.getLength(),
    getTotalLines: () => buffer.getTotalLines(),
    getOldestLineNumber: () => buffer.getOldestLineNumber(),
    getNewestLineNumber: () => buffer.getNewestLineNumber(),
    revision // Used to trigger re-renders when buffer changes
  }
}
