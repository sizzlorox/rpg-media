/**
 * TerminalInput Component
 * Handles keyboard input, cursor navigation, command submission
 */

import { useCallback, useRef, useEffect } from 'react'
import type { Terminal } from '@xterm/xterm'

interface TerminalInputProps {
  terminal: Terminal | null
  onCommand?: (command: string, cols: number) => void
  commandBuffer: string
  setCommandBuffer: (buffer: string) => void
  cursorPosition: number
  setCursorPosition: (pos: number) => void
  onHistoryNavigate: (direction: 'up' | 'down') => void
  onAutocomplete: (partial: string) => string | null
  terminalCols: number
}

export function useTerminalInput(props: TerminalInputProps) {
  const {
    terminal,
    onCommand,
    commandBuffer,
    setCommandBuffer,
    cursorPosition,
    setCursorPosition,
    onHistoryNavigate,
    onAutocomplete,
    terminalCols,
  } = props

  const terminalRef = useRef<Terminal | null>(terminal)
  const passwordMaskIndexRef = useRef<number>(-1)
  const autocompleteRef = useRef<string>('')

  // Update terminal ref when it changes
  useEffect(() => {
    terminalRef.current = terminal
  }, [terminal])

  // Check if command requires password masking
  const requiresPasswordMask = useCallback((cmd: string): boolean => {
    return cmd.trim().startsWith('/login ') || cmd.trim().startsWith('/register ')
  }, [])

  // Handle keyboard input
  const handleData = useCallback(
    (data: string) => {
      const term = terminalRef.current
      if (!term) return

      const code = data.charCodeAt(0)

      // Handle special keys
      if (code === 13) {
        // Enter - submit command
        term.write('\r\n')
        const cmd = commandBuffer.trim()
        if (cmd && onCommand) {
          onCommand(cmd, terminalCols)
        }
        setCommandBuffer('')
        setCursorPosition(0)
        passwordMaskIndexRef.current = -1
        autocompleteRef.current = ''
        term.write('> ')
        return
      }

      if (code === 127) {
        // Backspace
        if (cursorPosition > 0) {
          const newBuffer = commandBuffer.slice(0, cursorPosition - 1) + commandBuffer.slice(cursorPosition)
          setCommandBuffer(newBuffer)
          setCursorPosition(cursorPosition - 1)

          // Update display
          term.write('\b \b')
          if (cursorPosition < commandBuffer.length) {
            term.write(commandBuffer.slice(cursorPosition) + ' \b'.repeat(commandBuffer.length - cursorPosition + 1))
          }
        }
        return
      }

      if (code === 9) {
        // Tab - autocomplete
        const suggestion = onAutocomplete(commandBuffer)
        if (suggestion) {
          autocompleteRef.current = suggestion
          const completion = suggestion.slice(commandBuffer.length)
          term.write(`\x1B[90m${completion}\x1B[0m`)
          // Accept autocomplete by inserting it
          setCommandBuffer(suggestion)
          setCursorPosition(suggestion.length)
          autocompleteRef.current = ''
        }
        return
      }

      if (data === '\x1B[A') {
        // Arrow up - history
        onHistoryNavigate('up')
        return
      }

      if (data === '\x1B[B') {
        // Arrow down - history
        onHistoryNavigate('down')
        return
      }

      if (data === '\x1B[D') {
        // Arrow left - move cursor
        if (cursorPosition > 0) {
          setCursorPosition(cursorPosition - 1)
          term.write(data)
        }
        return
      }

      if (data === '\x1B[C') {
        // Arrow right - move cursor
        if (cursorPosition < commandBuffer.length) {
          setCursorPosition(cursorPosition + 1)
          term.write(data)
        }
        return
      }

      // Regular character input
      if (code >= 32 && code < 127) {
        // Check input length limit (2000 characters)
        if (commandBuffer.length >= 2000) {
          term.write('\x07') // Bell sound
          return
        }

        const newBuffer =
          commandBuffer.slice(0, cursorPosition) + data + commandBuffer.slice(cursorPosition)
        setCommandBuffer(newBuffer)
        setCursorPosition(cursorPosition + 1)

        // Detect password field start
        if (passwordMaskIndexRef.current === -1 && requiresPasswordMask(newBuffer)) {
          const parts = newBuffer.split(' ')
          if (parts.length >= 2) {
            passwordMaskIndexRef.current = parts[0].length + parts[1].length + 2
          }
        }

        // Display character (masked if in password field)
        const shouldMask = passwordMaskIndexRef.current !== -1 && cursorPosition >= passwordMaskIndexRef.current
        const displayChar = shouldMask ? '*' : data

        term.write(displayChar)

        // Redraw rest of line if cursor not at end
        if (cursorPosition < commandBuffer.length) {
          const rest = commandBuffer.slice(cursorPosition)
          term.write(rest + '\b'.repeat(rest.length))
        }
      }
    },
    [
      commandBuffer,
      cursorPosition,
      setCommandBuffer,
      setCursorPosition,
      onCommand,
      onHistoryNavigate,
      onAutocomplete,
      terminalCols,
      requiresPasswordMask,
    ]
  )

  // Attach keyboard handler
  // Attach input handler to terminal
  useEffect(() => {
    if (!terminal) return

    const disposable = terminal.onData(handleData)
    return () => disposable.dispose()
  }, [terminal, handleData])

  return {
    handleData,
    isPasswordMasked: passwordMaskIndexRef.current !== -1,
  }
}
