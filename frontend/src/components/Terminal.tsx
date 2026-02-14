/**
 * Terminal Component (Refactored)
 * Integration layer orchestrating modular terminal components
 *
 * This refactored version reduces complexity from 560 lines to ~100 lines
 * by delegating to specialized modules while maintaining 100% feature parity
 */

import { useEffect, useRef } from 'react'
import '@xterm/xterm/css/xterm.css'
import { renderWelcomeMessage } from '../utils/welcome-message'

// Modular components
import { useTerminalStyling } from './terminal/TerminalStyling'
import { useTerminalCore } from './terminal/TerminalCore'
import { useTerminalOutput } from './terminal/TerminalOutput'
import { TerminalErrorBoundary } from './terminal/TerminalErrorBoundary'

interface TerminalProps {
  onCommand?: (command: string, terminalCols: number) => void
  initialContent?: string
  skipWelcome?: boolean
}

function TerminalComponent({ onCommand, initialContent, skipWelcome = false }: TerminalProps) {
  // Get responsive styling configuration
  const { config: stylingConfig, updateConfig } = useTerminalStyling()

  // Initialize terminal core FIRST (so we have core.write available)
  const core = useTerminalCore({
    config: stylingConfig.config,
    onReady: (term) => {
      // Display welcome message if not skipped
      if (!skipWelcome) {
        const welcomeMessage = renderWelcomeMessage(
          stylingConfig.cols,
          stylingConfig.logoType
        )
        term.write(welcomeMessage)
        term.write('\r\n')
      }

      // Display initial content
      if (initialContent) {
        term.write(initialContent + '\r\n')
      }

      term.write('\r\n> ')
    },
  })

  // State for input handling
  const commandBufferRef = useRef('')

  // Input handler with terminal echo
  useEffect(() => {
    if (!core.terminalRef.current) return

    const handleData = (data: string) => {
      const term = core.terminalRef.current
      if (!term) return

      const code = data.charCodeAt(0)

      // Enter key
      if (code === 13) {
        term.write('\r\n')
        const command = commandBufferRef.current.trim()
        if (command && onCommand) {
          onCommand(command, stylingConfig.cols)
        }
        commandBufferRef.current = ''
        term.write('> ')
        return
      }

      // Backspace
      if (code === 127 || code === 8) {
        if (commandBufferRef.current.length > 0) {
          commandBufferRef.current = commandBufferRef.current.slice(0, -1)
          term.write('\b \b')
        }
        return
      }

      // Regular characters
      if (code >= 32 && code < 127) {
        commandBufferRef.current += data
        term.write(data)
      }
    }

    const disposable = core.terminalRef.current.onData(handleData)
    return () => disposable.dispose()
  }, [core.terminalRef, onCommand, stylingConfig.cols])

  // Output handling
  const output = useTerminalOutput({ terminal: core.terminalRef.current })

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      updateConfig()
      core.fit()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateConfig, core, stylingConfig.cols])

  // Update initial content when it changes
  useEffect(() => {
    if (initialContent && core.isReady) {
      output.write(initialContent)
    }
  }, [initialContent, core.isReady, output])

  return (
    <div
      ref={core.containerRef}
      className="terminal-container"
      role="terminal"
      aria-label="Social Forge Terminal"
      aria-description="Interactive command-line interface for Social Forge"
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  )
}

// Export wrapped with error boundary
export function Terminal(props: TerminalProps) {
  return (
    <TerminalErrorBoundary>
      <TerminalComponent {...props} />
    </TerminalErrorBoundary>
  )
}
