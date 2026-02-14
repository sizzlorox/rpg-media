/**
 * TerminalOutput Component
 * Manages output buffer and rendering to terminal
 */

import { useCallback, useRef } from 'react'
import type { Terminal } from '@xterm/xterm'

interface TerminalOutputProps {
  terminal: Terminal | null
}

export function useTerminalOutput(props: TerminalOutputProps) {
  const { terminal } = props
  const outputBufferRef = useRef<string[]>([])

  // Write content to terminal
  const write = useCallback(
    (content: string) => {
      if (!terminal) return

      try {
        // Sanitize ANSI sequences (basic validation)
        const sanitized = content.replace(/\x1B\[([0-9;]*)[^m]/g, (match) => {
          // Allow valid ANSI color codes, reject malformed ones
          if (match.match(/\x1B\[[0-9;]*m/)) {
            return match
          }
          return ''
        })

        terminal.write(sanitized)

        // Add to output buffer (sliding window, max 10000 lines)
        const lines = sanitized.split('\n')
        outputBufferRef.current.push(...lines)

        if (outputBufferRef.current.length > 10000) {
          // Remove oldest 1000 lines
          outputBufferRef.current = outputBufferRef.current.slice(1000)
          console.info('[TerminalOutput] Buffer trimmed (removed oldest 1000 lines)')
        }
      } catch (error) {
        console.error('[TerminalOutput] Write failed:', error)
      }
    },
    [terminal]
  )

  // Write a single line
  const writeLine = useCallback(
    (content: string) => {
      write(content + '\r\n')
    },
    [write]
  )

  // Clear terminal
  const clear = useCallback(() => {
    if (!terminal) return

    try {
      terminal.clear()
      outputBufferRef.current = []
    } catch (error) {
      console.error('[TerminalOutput] Clear failed:', error)
    }
  }, [terminal])

  return {
    write,
    writeLine,
    clear,
    bufferSize: outputBufferRef.current.length,
  }
}
