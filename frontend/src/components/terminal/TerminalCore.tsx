/**
 * TerminalCore Component
 * Manages xterm.js initialization, lifecycle, and FitAddon integration
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import type { ITerminalOptions } from '@xterm/xterm'

export interface TerminalCoreResult {
  terminalRef: React.RefObject<XTerm | null>
  fitAddonRef: React.RefObject<FitAddon | null>
  containerRef: React.RefObject<HTMLDivElement | null>
  fit: () => void
  write: (data: string) => void
  focus: () => void
  clear: () => void
  isReady: boolean
}

interface TerminalCoreProps {
  config: ITerminalOptions
  onReady?: (terminal: XTerm) => void
  onData?: (data: string) => void
}

/**
 * Hook to manage xterm.js terminal core functionality
 * Isolates xterm.js API for future library migration
 */
export function useTerminalCore(props: TerminalCoreProps): TerminalCoreResult {
  const { config, onReady, onData } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return

    try {
      // Create terminal instance
      const term = new XTerm(config)

      // Create and load fit addon
      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)

      // Open terminal in container
      term.open(containerRef.current)
      fitAddon.fit()

      // Store references
      terminalRef.current = term
      fitAddonRef.current = fitAddon
      setIsReady(true)

      // Focus terminal
      term.focus()

      // Setup data handler
      if (onData) {
        term.onData(onData)
      }

      // Call ready callback
      if (onReady) {
        onReady(term)
      }
    } catch (error) {
      console.error('[TerminalCore] Initialization failed:', error)
      // Graceful degradation: terminal will not be available
    }

    // Cleanup on unmount
    return () => {
      if (terminalRef.current) {
        terminalRef.current.dispose()
        terminalRef.current = null
        fitAddonRef.current = null
        setIsReady(false)
      }
    }
  }, [config, onReady, onData])

  // Fit terminal to container
  const fit = useCallback(() => {
    if (fitAddonRef.current && terminalRef.current) {
      try {
        fitAddonRef.current.fit()
      } catch (error) {
        console.error('[TerminalCore] Fit failed:', error)
      }
    }
  }, [])

  // Write data to terminal
  const write = useCallback((data: string) => {
    if (terminalRef.current && isReady) {
      try {
        terminalRef.current.write(data)
      } catch (error) {
        console.error('[TerminalCore] Write failed:', error)
      }
    }
  }, [])

  // Focus terminal
  const focus = useCallback(() => {
    if (terminalRef.current && isReady) {
      try {
        terminalRef.current.focus()
      } catch (error) {
        console.error('[TerminalCore] Focus failed:', error)
      }
    }
  }, [])

  // Clear terminal
  const clear = useCallback(() => {
    if (terminalRef.current && isReady) {
      try {
        terminalRef.current.clear()
      } catch (error) {
        console.error('[TerminalCore] Clear failed:', error)
      }
    }
  }, [])

  return {
    terminalRef,
    fitAddonRef,
    containerRef,
    fit,
    write,
    focus,
    clear,
    isReady: isReady,
  }
}
