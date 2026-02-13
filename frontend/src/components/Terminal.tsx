// Terminal component wrapper for xterm.js
// MUD-style terminal interface with green-on-black theme

import { useEffect, useRef, useState, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { getResponsiveConfig, getCurrentViewportWidth } from '../utils/terminal-responsive'
import { renderWelcomeMessage } from '../utils/welcome-message'

interface TerminalProps {
  onCommand?: (command: string) => void
  initialContent?: string
}

export function Terminal({ onCommand, initialContent }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const commandBufferRef = useRef<string>('')
  const passwordMaskIndexRef = useRef<number>(-1) // Track where password starts

  // Command history state
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef<number>(-1) // -1 = not navigating history

  // Autocomplete state
  const autocompleteRef = useRef<string>('') // Current suggestion being displayed

  // Cursor position state (position within commandBuffer, 0 = start, length = end)
  const cursorPositionRef = useRef<number>(0)

  // Responsive configuration state
  const [responsiveConfig, setResponsiveConfig] = useState(() =>
    getResponsiveConfig(getCurrentViewportWidth())
  )

  // Create responsive config updater
  const updateResponsiveConfig = useCallback(() => {
    const width = getCurrentViewportWidth()
    const newConfig = getResponsiveConfig(width)
    setResponsiveConfig(newConfig)
  }, [])

  useEffect(() => {
    if (!terminalRef.current) return

    // Get responsive configuration
    const config = responsiveConfig.config

    // Create terminal with MUD theme
    const term = new XTerm({
      theme: {
        background: '#000000',
        foreground: '#00ff00',
        cursor: '#00ff00',
        cursorAccent: '#000000',
        selectionBackground: '#00aa00',
        black: '#000000',
        red: '#ff0000',
        green: '#00ff00',
        yellow: '#ffff00',
        blue: '#0000ff',
        magenta: '#ff00ff',
        cyan: '#00ffff',
        white: '#ffffff',
        brightBlack: '#555555',
        brightRed: '#ff5555',
        brightGreen: '#55ff55',
        brightYellow: '#ffff55',
        brightBlue: '#5555ff',
        brightMagenta: '#ff55ff',
        brightCyan: '#55ffff',
        brightWhite: '#ffffff',
      },
      fontFamily: 'IBM Plex Mono, Courier New, monospace',
      fontSize: config.fontSize,      // Responsive font size
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
      rows: config.minRows,            // Responsive rows
      cols: config.minCols,            // Responsive cols
    })

    // Add fit addon
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    // Open terminal
    term.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Focus terminal on load
    term.focus()

    // Display responsive welcome message with 3D ASCII logo
    const welcomeMessage = renderWelcomeMessage(
      config.minCols,
      responsiveConfig.logoType
    )
    term.write(welcomeMessage)
    term.write('\r\n')

    if (initialContent) {
      term.write(initialContent + '\r\n')
    }

    term.write('\r\n> ')

    // Constants for command history and autocomplete
    const MAX_HISTORY = 100

    // Available commands for autocomplete
    const COMMANDS = [
      '/register',
      '/login',
      '/post',
      '/feed',
      '/profile',
      '/like',
      '/comment',
      '/follow',
      '/unfollow',
      '/stats',
      '/levels',
      '/unlocks',
      '/help',
      '/clear'
    ]

    // Helper: Generate autocomplete suggestion
    function generateAutocomplete(partialInput: string): string {
      // No suggestion for empty input or non-command input
      if (!partialInput || !partialInput.startsWith('/')) {
        return ''
      }

      // Don't suggest while typing password
      if (passwordMaskIndexRef.current >= 0 &&
          commandBufferRef.current.length >= passwordMaskIndexRef.current) {
        return ''
      }

      // Only match if we're still typing the command name (no spaces yet)
      const parts = partialInput.trim().split(' ')
      if (parts.length > 1) {
        return '' // Don't suggest after command name is complete
      }

      const partial = partialInput.toLowerCase()
      const matches = COMMANDS.filter(cmd => cmd.startsWith(partial))

      // Only show suggestion if there's exactly one match
      if (matches.length === 1) {
        // Return just the completion part (not including what's already typed)
        return matches[0].substring(partial.length)
      }

      return ''
    }

    // Helper: Update autocomplete display
    function updateAutocomplete(newSuggestion: string) {
      const oldSuggestion = autocompleteRef.current

      // Skip if suggestion hasn't changed
      if (oldSuggestion === newSuggestion) {
        return
      }

      // Clear old suggestion if it exists
      if (oldSuggestion) {
        // Overwrite with spaces, then move back to original cursor position
        term.write(' '.repeat(oldSuggestion.length))
        term.write(ANSI.moveLeft(oldSuggestion.length))
      }

      // Write new suggestion in dim gray and move cursor back to original position
      if (newSuggestion) {
        term.write('\x1b[2m') // ANSI.DIM
        term.write(newSuggestion)
        term.write('\x1b[0m') // ANSI.RESET
        term.write(ANSI.moveLeft(newSuggestion.length))
      }

      autocompleteRef.current = newSuggestion
    }

    // Helper: ANSI escape codes for cursor control
    const ANSI = {
      moveToColumn: (col: number) => `\x1b[${col}G`,
      clearToEnd: () => '\x1b[K',
      moveLeft: (n: number) => n > 0 ? `\x1b[${n}D` : '',
    }

    // Helper: Clear autocomplete
    function clearAutocomplete() {
      if (autocompleteRef.current) {
        // Overwrite with spaces
        term.write(' '.repeat(autocompleteRef.current.length))
        term.write(ANSI.moveLeft(autocompleteRef.current.length))
        autocompleteRef.current = ''
      }
    }

    // Helper: Redraw the current line (for cursor movement and mid-line edits)
    function redrawLine() {
      const buffer = commandBufferRef.current
      const cursorPos = cursorPositionRef.current

      clearAutocomplete()

      // Move cursor to start of input (column 3, after "> ")
      term.write(ANSI.moveToColumn(3))

      // Clear from cursor to end of line
      term.write(ANSI.clearToEnd())

      // Redraw with password masking
      const parts = buffer.split(' ')
      const cmd = parts[0].toLowerCase()
      if ((cmd === '/login' || cmd === '/register') && parts.length >= 3) {
        const visiblePart = parts.slice(0, 2).join(' ') + ' '
        const passwordPart = parts.slice(2).join(' ')
        term.write(visiblePart)
        term.write('*'.repeat(passwordPart.length))
      } else {
        term.write(buffer)
      }

      // Move cursor to correct position (column 3 + cursorPos)
      term.write(ANSI.moveToColumn(3 + cursorPos))

      // Show autocomplete only if cursor is at end
      if (cursorPos === buffer.length) {
        const suggestion = generateAutocomplete(buffer)
        updateAutocomplete(suggestion)
      }
    }

    // Helper: Replace current line (for history navigation)
    function replaceCurrentLine(newText: string) {
      clearAutocomplete()

      // Move to start of input and clear to end
      term.write(ANSI.moveToColumn(3))
      term.write(ANSI.clearToEnd())

      commandBufferRef.current = newText
      cursorPositionRef.current = newText.length

      // Apply password masking if needed
      const parts = newText.split(' ')
      const cmd = parts[0].toLowerCase()
      if ((cmd === '/login' || cmd === '/register') && parts.length >= 3) {
        const visiblePart = parts.slice(0, 2).join(' ') + ' '
        const passwordPart = parts.slice(2).join(' ')
        term.write(visiblePart)
        term.write('*'.repeat(passwordPart.length))
        passwordMaskIndexRef.current = visiblePart.length
      } else {
        term.write(newText)
        passwordMaskIndexRef.current = -1
      }

      const suggestion = generateAutocomplete(newText)
      updateAutocomplete(suggestion)
    }

    // Helper: Arrow up handler
    function handleArrowUp() {
      if (historyRef.current.length === 0) return

      // First press: move from current input to most recent history
      if (historyIndexRef.current === -1) {
        historyIndexRef.current = historyRef.current.length - 1
      }
      // Subsequent presses: move backwards through history
      else if (historyIndexRef.current > 0) {
        historyIndexRef.current--
      }

      replaceCurrentLine(historyRef.current[historyIndexRef.current])
    }

    // Helper: Arrow down handler
    function handleArrowDown() {
      if (historyIndexRef.current === -1) return // Not currently navigating

      // Move forward through history
      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyIndexRef.current++
        replaceCurrentLine(historyRef.current[historyIndexRef.current])
      }
      // At newest entry: clear to empty line
      else {
        historyIndexRef.current = -1
        replaceCurrentLine('')
      }
    }

    // Helper: Tab completion handler
    function handleTab() {
      const suggestion = autocompleteRef.current

      if (!suggestion) {
        return // No suggestion to accept
      }

      // Clear the gray suggestion visually (overwrite with spaces)
      term.write(' '.repeat(suggestion.length))
      term.write(ANSI.moveLeft(suggestion.length))

      // Add suggestion to buffer and write in normal color
      commandBufferRef.current += suggestion
      term.write(suggestion)

      // Clear autocomplete state
      autocompleteRef.current = ''

      // Add space after command for better UX
      commandBufferRef.current += ' '
      term.write(' ')

      // Update cursor position
      cursorPositionRef.current = commandBufferRef.current.length
    }

    // Helper: Left arrow handler (move cursor left)
    function handleArrowLeft() {
      if (cursorPositionRef.current > 0) {
        // Clear autocomplete when moving cursor away from end
        clearAutocomplete()

        cursorPositionRef.current--
        term.write('\b') // Move cursor back one position
      }
    }

    // Helper: Right arrow handler (move cursor right)
    function handleArrowRight() {
      const buffer = commandBufferRef.current
      if (cursorPositionRef.current < buffer.length) {
        cursorPositionRef.current++

        // Write the character at the new cursor position to move forward
        const charAtCursor = buffer[cursorPositionRef.current - 1]

        // Handle password masking for the character
        if (passwordMaskIndexRef.current >= 0 &&
            cursorPositionRef.current - 1 >= passwordMaskIndexRef.current) {
          term.write('*')
        } else {
          term.write(charAtCursor)
        }

        // Show autocomplete if we just moved to the end
        if (cursorPositionRef.current === buffer.length) {
          const suggestion = generateAutocomplete(buffer)
          updateAutocomplete(suggestion)
        }
      }
    }

    // Handle keyboard input
    term.onData((data) => {
      const code = data.charCodeAt(0)

      // === Handle escape sequences for arrow keys ===
      if (data === '\x1b[A') { // Up arrow
        handleArrowUp()
        return
      }
      if (data === '\x1b[B') { // Down arrow
        handleArrowDown()
        return
      }
      if (data === '\x1b[C') { // Right arrow
        handleArrowRight()
        return
      }
      if (data === '\x1b[D') { // Left arrow
        handleArrowLeft()
        return
      }

      // === Handle Tab key ===
      if (data === '\x09') { // Tab
        handleTab()
        return
      }

      // Enter key
      if (code === 13) {
        // Move cursor to end before submitting
        const buffer = commandBufferRef.current
        const cursorPos = cursorPositionRef.current
        const charsAfterCursor = buffer.length - cursorPos

        if (charsAfterCursor > 0) {
          // Move to end by writing remaining characters
          for (let i = cursorPos; i < buffer.length; i++) {
            if (passwordMaskIndexRef.current >= 0 && i >= passwordMaskIndexRef.current) {
              term.write('*')
            } else {
              term.write(buffer[i])
            }
          }
        }

        const command = buffer.trim()
        term.write('\r\n')

        if (command && onCommand) {
          // Add to history (avoid consecutive duplicates)
          if (historyRef.current.length === 0 ||
              historyRef.current[historyRef.current.length - 1] !== command) {
            historyRef.current.push(command)

            // Limit history size
            if (historyRef.current.length > MAX_HISTORY) {
              historyRef.current.shift() // Remove oldest
            }
          }

          // Reset history navigation
          historyIndexRef.current = -1

          onCommand(command)
        }

        commandBufferRef.current = ''
        cursorPositionRef.current = 0 // Reset cursor position
        passwordMaskIndexRef.current = -1 // Reset password masking
        clearAutocomplete() // Clear any lingering suggestion
        term.write('> ')

        // Keep terminal focused
        setTimeout(() => term.focus(), 0)
      }
      // Backspace
      else if (code === 127 || code === 8) {
        const cursorPos = cursorPositionRef.current

        if (cursorPos > 0) {
          // Clear autocomplete before modifying buffer
          clearAutocomplete()

          // Remove character before cursor
          const buffer = commandBufferRef.current
          commandBufferRef.current = buffer.slice(0, cursorPos - 1) + buffer.slice(cursorPos)
          cursorPositionRef.current--

          // Reset password mask if we backspace before it
          if (passwordMaskIndexRef.current >= 0 && commandBufferRef.current.length < passwordMaskIndexRef.current) {
            passwordMaskIndexRef.current = -1
          }

          // Redraw the line from cursor position
          redrawLine()
        }
      }
      // Printable characters
      else if (code >= 32 && code <= 126) {
        // Clear old autocomplete before adding character
        clearAutocomplete()

        const cursorPos = cursorPositionRef.current
        const buffer = commandBufferRef.current

        // Insert character at cursor position
        commandBufferRef.current = buffer.slice(0, cursorPos) + data + buffer.slice(cursorPos)
        cursorPositionRef.current++

        // Check if we need to start masking password
        if (data === ' ' && passwordMaskIndexRef.current === -1) {
          const parts = commandBufferRef.current.trim().split(' ')
          const cmd = parts[0].toLowerCase()

          // If this is the second space in /login or /register, start masking
          if ((cmd === '/login' || cmd === '/register') && parts.length === 2) {
            passwordMaskIndexRef.current = commandBufferRef.current.length
          }
        }

        // If inserting at end, just write the character (optimization)
        if (cursorPos === buffer.length) {
          // Write masked character if in password mode
          if (passwordMaskIndexRef.current >= 0 && commandBufferRef.current.length > passwordMaskIndexRef.current) {
            term.write('*')
          } else {
            term.write(data)
          }

          // Generate and display autocomplete after character
          const suggestion = generateAutocomplete(commandBufferRef.current)
          updateAutocomplete(suggestion)
        } else {
          // Inserting in middle - redraw from cursor position
          redrawLine()
        }
      }
    })

    // Cleanup
    return () => {
      term.dispose()
    }
  }, [onCommand, initialContent, responsiveConfig])

  // Enhanced resize handler with responsive config updates
  const handleResize = useCallback(() => {
    updateResponsiveConfig()

    if (fitAddonRef.current) {
      fitAddonRef.current.fit()
    }
  }, [updateResponsiveConfig])

  // Add ResizeObserver for better responsiveness
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [handleResize])

  return (
    <div
      ref={terminalRef}
      className="terminal-container"
      style={{
        width: '100%',
        height: responsiveConfig.config.height,   // Responsive height
        padding: responsiveConfig.config.padding, // Responsive padding
        backgroundColor: '#000000',
        boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)',
      }}
    />
  )
}
