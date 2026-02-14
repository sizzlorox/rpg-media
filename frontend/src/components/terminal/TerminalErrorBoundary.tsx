/**
 * TerminalErrorBoundary Component
 * Catches errors in terminal component tree and provides fallback UI
 */

import React, { Component } from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class TerminalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[TerminalErrorBoundary] Component crashed:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            backgroundColor: '#000000',
            color: '#00ff00',
            fontFamily: 'IBM Plex Mono, Courier New, monospace',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <pre
            style={{
              border: '2px solid #00ff00',
              padding: '1rem',
              marginBottom: '1rem',
            }}
          >
            ╔═══════════════════════════════════╗
            {'\n'}║   Terminal Temporarily Offline    ║{'\n'}║   Please refresh the page         ║
            {'\n'}╚═══════════════════════════════════╝
          </pre>
          <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>
            Error: {this.state.error?.message || 'Unknown error'}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
