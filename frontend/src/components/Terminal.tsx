// Terminal component wrapper for xterm.js
// MUD-style terminal interface with green-on-black theme

import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

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

  useEffect(() => {
    if (!terminalRef.current) return

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
      fontSize: 14,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
      rows: 30,
      cols: 80,
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

    // Display welcome message
    term.write('\x1b[32m') // Green color
    term.write('╔══════════════════════════════════════════════════════════════════╗\r\n')
    term.write('║                        SOCIAL FORGE                              ║\r\n')
    term.write('║   Level up through engagement. Your profile is your character.  ║\r\n')
    term.write('╚══════════════════════════════════════════════════════════════════╝\r\n')
    term.write('\r\n')

    if (initialContent) {
      term.write(initialContent + '\r\n')
    }

    term.write('\x1b[33m') // Yellow
    term.write('> Type /help for commands\r\n')
    term.write('\x1b[32m') // Back to green
    term.write('\r\n> ')

    // Handle keyboard input
    term.onData((data) => {
      const code = data.charCodeAt(0)

      // Enter key
      if (code === 13) {
        const command = commandBufferRef.current.trim()
        term.write('\r\n')

        if (command && onCommand) {
          onCommand(command)
        }

        commandBufferRef.current = ''
        passwordMaskIndexRef.current = -1 // Reset password masking
        term.write('> ')

        // Keep terminal focused
        setTimeout(() => term.focus(), 0)
      }
      // Backspace
      else if (code === 127 || code === 8) {
        if (commandBufferRef.current.length > 0) {
          commandBufferRef.current = commandBufferRef.current.slice(0, -1)
          term.write('\b \b')

          // Reset password mask if we backspace before it
          if (passwordMaskIndexRef.current >= 0 && commandBufferRef.current.length < passwordMaskIndexRef.current) {
            passwordMaskIndexRef.current = -1
          }
        }
      }
      // Printable characters
      else if (code >= 32 && code <= 126) {
        commandBufferRef.current += data

        // Check if we need to start masking password
        if (data === ' ' && passwordMaskIndexRef.current === -1) {
          const parts = commandBufferRef.current.trim().split(' ')
          const cmd = parts[0].toLowerCase()

          // If this is the second space in /login or /register, start masking
          if ((cmd === '/login' || cmd === '/register') && parts.length === 2) {
            passwordMaskIndexRef.current = commandBufferRef.current.length
          }
        }

        // Write masked character if in password mode
        if (passwordMaskIndexRef.current >= 0 && commandBufferRef.current.length > passwordMaskIndexRef.current) {
          term.write('*')
        } else {
          term.write(data)
        }
      }
    })

    // Resize handler
    const handleResize = () => {
      fitAddon.fit()
    }

    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      term.dispose()
    }
  }, [onCommand, initialContent])

  return (
    <div
      ref={terminalRef}
      className="terminal-container"
      style={{
        width: '100%',
        height: '100vh',
        padding: '20px',
        backgroundColor: '#000000',
        boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)',
      }}
    />
  )
}
