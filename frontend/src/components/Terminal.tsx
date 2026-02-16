/**
 * Terminal Component (Custom Implementation)
 * Integration layer for custom terminal emulator with arrow key navigation
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { renderWelcomeMessage } from '../utils/welcome-message'
import { useCustomTerminal } from './terminal/CustomTerminalWrapper'
import { TerminalErrorBoundary } from './terminal/TerminalErrorBoundary'
import { getResponsiveConfig } from '../utils/terminal-responsive'

interface TerminalProps {
  onCommand?: (command: string, terminalCols: number) => void
  initialContent?: string
  skipWelcome?: boolean
  onReady?: (terminal: any) => void
  username?: string
}

function TerminalComponent({ onCommand, initialContent, skipWelcome = false, onReady, username }: TerminalProps) {
  // Get responsive styling configuration with reactive state
  const [terminalDimensions, setTerminalDimensions] = useState(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024
    const { config, logoType } = getResponsiveConfig(width)
    return { cols: config.minCols, logoType, config }
  })

  const cols = terminalDimensions.cols

  // Build prompt based on username
  const getPrompt = useCallback(() => {
    return username ? `${username}@socialforge:` : '>'
  }, [username])

  // Update dimensions on window resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const { config, logoType } = getResponsiveConfig(width)
      setTerminalDimensions({ cols: config.minCols, logoType, config })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Initialize custom terminal
  const customTerminal = useCustomTerminal({
    config: terminalDimensions.config,
    onReady: (term) => {
      // Display welcome message if not skipped
      if (!skipWelcome) {
        const welcomeMessage = renderWelcomeMessage(cols, terminalDimensions.logoType)
        term.write(welcomeMessage)
        term.write('\r\n')
      }

      // Display initial content
      if (initialContent) {
        term.write(initialContent + '\r\n')
      }

      term.write('\r\n')

      // Initialize the input line only if showing welcome (not waiting for content)
      if (!skipWelcome || initialContent) {
        term.replaceInputLine(`${getPrompt()} █`)
      }

      // Call parent onReady if provided
      if (onReady) {
        onReady(term)
      }
    },
  })

  // State for input handling
  const commandBufferRef = useRef('')
  const cursorPosRef = useRef(0)
  const commandHistoryRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)

  // Cursor blink state
  const [cursorVisible, setCursorVisible] = useState(true)

  // Cursor blink effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setCursorVisible(prev => !prev)
    }, 500) // Blink every 500ms

    return () => clearInterval(blinkInterval)
  }, [])

  // Helper to build input line with cursor at current position
  const buildInputLineWithCursor = useCallback((buffer: string, cursorPos: number, isPassword: boolean = false): string => {
    let displayText = buffer

    // Handle password masking
    if (isPassword) {
      const parts = buffer.trim().split(/\s+/)
      const command = parts[0] || ''
      const username = parts[1] || ''
      const password = parts[2] || ''
      displayText = command + (username ? ' ' + username : '') + (password ? ' ' + '*'.repeat(password.length) : '')
    }

    // Insert cursor at current position (blinks via state)
    const before = displayText.slice(0, cursorPos)
    const after = displayText.slice(cursorPos)
    // Show/hide cursor based on blink state, using inverse video for visibility
    const cursor = cursorVisible ? '\x1B[7m█\x1B[27m' : ' '
    return `${getPrompt()} ` + before + cursor + after
  }, [getPrompt, cursorVisible])

  // Simple command autocomplete
  const handleAutocomplete = useCallback((partial: string): string | null => {
    if (!partial.startsWith('/')) return null

    const commands = [
      '/register', '/login', '/post', '/feed', '/profile',
      '/like', '/comment', '/show', '/follow', '/unfollow',
      '/stats', '/levels', '/unlocks', '/help', '/clear'
    ]

    const matches = commands.filter(cmd => cmd.startsWith(partial))

    // Return first match if unique prefix, add space after command
    return matches.length === 1 ? matches[0] + ' ' : null
  }, [])

  // Input handler with terminal echo
  useEffect(() => {
    if (!customTerminal.terminalRef.current) return

    const handleData = (data: string) => {
      const term = customTerminal.terminalRef.current
      if (!term) return

      const code = data.charCodeAt(0)

      // Check if we're in password field
      const parts = commandBufferRef.current.trim().split(/\s+/)
      const isPasswordField = (parts[0] === '/register' || parts[0] === '/login') && parts.length >= 3

      // Enter key
      if (code === 13) {
        const command = commandBufferRef.current.trim()

        // Commit the input line (remove cursor) before executing
        if (command) {
          term.replaceInputLine(`${getPrompt()} ` + command)
        }
        term.write('\r\n')

        if (command && onCommand) {
          // Save to history (add to front)
          commandHistoryRef.current.unshift(command)
          historyIndexRef.current = -1

          // Mark that we need a prompt after command output is written
          needsPrompt.current = true

          onCommand(command, cols)
        } else {
          // No command, show prompt immediately
          term.replaceInputLine(`${getPrompt()} █`)
        }

        commandBufferRef.current = ''
        cursorPosRef.current = 0
        return
      }

      // Tab key - Autocomplete
      if (code === 9) {
        const suggestion = handleAutocomplete(commandBufferRef.current)
        if (suggestion) {
          commandBufferRef.current = suggestion
          cursorPosRef.current = suggestion.length
          const displayLine = buildInputLineWithCursor(commandBufferRef.current, cursorPosRef.current, isPasswordField)
          term.replaceInputLine(displayLine)
        }
        return
      }

      // Backspace
      if (code === 127 || code === 8) {
        if (cursorPosRef.current > 0) {
          const before = commandBufferRef.current.slice(0, cursorPosRef.current - 1)
          const after = commandBufferRef.current.slice(cursorPosRef.current)
          commandBufferRef.current = before + after
          cursorPosRef.current--

          const displayLine = buildInputLineWithCursor(commandBufferRef.current, cursorPosRef.current, isPasswordField)
          term.replaceInputLine(displayLine)
        }
        return
      }

      // Arrow Left (\x1B[D)
      if (data === '\x1B[D') {
        if (cursorPosRef.current > 0) {
          cursorPosRef.current--
          const displayLine = buildInputLineWithCursor(commandBufferRef.current, cursorPosRef.current, isPasswordField)
          term.replaceInputLine(displayLine)
        }
        return
      }

      // Arrow Right (\x1B[C)
      if (data === '\x1B[C') {
        if (cursorPosRef.current < commandBufferRef.current.length) {
          cursorPosRef.current++
          const displayLine = buildInputLineWithCursor(commandBufferRef.current, cursorPosRef.current, isPasswordField)
          term.replaceInputLine(displayLine)
        }
        return
      }

      // Arrow Up (\x1B[A) - Previous command
      if (data === '\x1B[A') {
        if (historyIndexRef.current < commandHistoryRef.current.length - 1) {
          historyIndexRef.current++
          const cmd = commandHistoryRef.current[historyIndexRef.current]
          commandBufferRef.current = cmd
          cursorPosRef.current = cmd.length
          const displayLine = buildInputLineWithCursor(commandBufferRef.current, cursorPosRef.current, false)
          term.replaceInputLine(displayLine)
        }
        return
      }

      // Arrow Down (\x1B[B) - Next command
      if (data === '\x1B[B') {
        if (historyIndexRef.current > 0) {
          historyIndexRef.current--
          const cmd = commandHistoryRef.current[historyIndexRef.current]
          commandBufferRef.current = cmd
          cursorPosRef.current = cmd.length
          const displayLine = buildInputLineWithCursor(commandBufferRef.current, cursorPosRef.current, false)
          term.replaceInputLine(displayLine)
        } else if (historyIndexRef.current === 0) {
          historyIndexRef.current = -1
          commandBufferRef.current = ''
          cursorPosRef.current = 0
          term.replaceInputLine(`${getPrompt()} █`)
        }
        return
      }

      // Delete key (\x1B[3~) - Forward deletion
      if (data === '\x1B[3~') {
        if (cursorPosRef.current < commandBufferRef.current.length) {
          const before = commandBufferRef.current.slice(0, cursorPosRef.current)
          const after = commandBufferRef.current.slice(cursorPosRef.current + 1)
          commandBufferRef.current = before + after

          const displayLine = buildInputLineWithCursor(commandBufferRef.current, cursorPosRef.current, isPasswordField)
          term.replaceInputLine(displayLine)
        }
        return
      }

      // Home key (\x1B[H or \x1B[1~) - Jump to line start
      if (data === '\x1B[H' || data === '\x1B[1~') {
        if (cursorPosRef.current > 0) {
          cursorPosRef.current = 0
          const displayLine = buildInputLineWithCursor(commandBufferRef.current, cursorPosRef.current, isPasswordField)
          term.replaceInputLine(displayLine)
        }
        return
      }

      // End key (\x1B[F or \x1B[4~) - Jump to line end
      if (data === '\x1B[F' || data === '\x1B[4~') {
        if (cursorPosRef.current < commandBufferRef.current.length) {
          cursorPosRef.current = commandBufferRef.current.length
          const displayLine = buildInputLineWithCursor(commandBufferRef.current, cursorPosRef.current, isPasswordField)
          term.replaceInputLine(displayLine)
        }
        return
      }

      // Ctrl+A (code 1) - Jump to start
      if (code === 1) {
        if (cursorPosRef.current > 0) {
          cursorPosRef.current = 0
          const displayLine = buildInputLineWithCursor(commandBufferRef.current, cursorPosRef.current, isPasswordField)
          term.replaceInputLine(displayLine)
        }
        return
      }

      // Ctrl+E (code 5) - Jump to end
      if (code === 5) {
        if (cursorPosRef.current < commandBufferRef.current.length) {
          cursorPosRef.current = commandBufferRef.current.length
          const displayLine = buildInputLineWithCursor(commandBufferRef.current, cursorPosRef.current, isPasswordField)
          term.replaceInputLine(displayLine)
        }
        return
      }

      // Ctrl+U (code 21) - Clear line
      if (code === 21) {
        if (commandBufferRef.current.length > 0) {
          commandBufferRef.current = ''
          cursorPosRef.current = 0
          term.replaceInputLine(`${getPrompt()} █`)
        }
        return
      }

      // Ctrl+C (code 3) - Cancel current input
      if (code === 3) {
        term.write('^C\r\n')
        commandBufferRef.current = ''
        cursorPosRef.current = 0
        term.replaceInputLine(`${getPrompt()} █`)
        return
      }

      // Ctrl+L (code 12) - Clear screen
      if (code === 12) {
        term.clear()
        const displayLine = buildInputLineWithCursor(commandBufferRef.current, cursorPosRef.current, isPasswordField)
        term.replaceInputLine(displayLine)
        return
      }

      // Regular characters
      if (code >= 32 && code < 127) {
        const before = commandBufferRef.current.slice(0, cursorPosRef.current)
        const after = commandBufferRef.current.slice(cursorPosRef.current)
        commandBufferRef.current = before + data + after
        cursorPosRef.current++

        const displayLine = buildInputLineWithCursor(commandBufferRef.current, cursorPosRef.current, isPasswordField)
        term.replaceInputLine(displayLine)
      }
    }

    const disposable = customTerminal.terminalRef.current.onData(handleData)
    return () => disposable.dispose()
  }, [customTerminal.terminalRef, onCommand, cols, handleAutocomplete, buildInputLineWithCursor, getPrompt])

  // Update input line when cursor blink state changes
  useEffect(() => {
    if (!customTerminal.isReady || !customTerminal.terminalRef.current) return

    // Only update if we're not in the middle of command execution
    const isPasswordField = (() => {
      const parts = commandBufferRef.current.trim().split(/\s+/)
      return (parts[0] === '/register' || parts[0] === '/login') && parts.length >= 3
    })()

    const displayLine = buildInputLineWithCursor(
      commandBufferRef.current,
      cursorPosRef.current,
      isPasswordField
    )
    customTerminal.terminalRef.current.replaceInputLine(displayLine)
  }, [cursorVisible, customTerminal, buildInputLineWithCursor])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      customTerminal.fit()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [customTerminal])

  // Track last written content to detect changes
  const lastWrittenContent = useRef<string>('')
  const needsPrompt = useRef(false)

  // Update terminal content when initialContent changes
  useEffect(() => {
    if (!customTerminal.isReady) return

    const content = initialContent || ''

    // Only write if content has actually changed
    if (content !== lastWrittenContent.current) {
      // Check if content was replaced (doesn't start with previous content) or appended
      const isReplacement = lastWrittenContent.current.length > 0 && !content.startsWith(lastWrittenContent.current)

      if (isReplacement) {
        // Content was completely replaced - clear and write all
        if (customTerminal.terminalRef.current) {
          customTerminal.terminalRef.current.clear()
          if (content) {
            customTerminal.write(content)
          }
        }
      } else {
        // Content was appended (or initial content) - just write the new part
        const newContent = content.slice(lastWrittenContent.current.length)
        if (newContent) {
          customTerminal.write(newContent)
        }
      }

      lastWrittenContent.current = content

      // Show the prompt after writing content
      if (customTerminal.terminalRef.current) {
        customTerminal.terminalRef.current.replaceInputLine(`${getPrompt()} █`)
      }

      // Clear the needsPrompt flag if it was set
      needsPrompt.current = false
    }
  }, [initialContent, customTerminal])

  return customTerminal.renderTerminal()
}

// Export wrapped with error boundary
export function Terminal(props: TerminalProps) {
  return (
    <TerminalErrorBoundary>
      <TerminalComponent {...props} />
    </TerminalErrorBoundary>
  )
}
