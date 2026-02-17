/**
 * TerminalErrorBoundary Component
 * Catches errors in terminal component tree and provides fallback UI
 */

import React, { Component } from 'react'
import type { ReactNode } from 'react'
import * as Sentry from '@sentry/react'

interface Props {
  children: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorCount: number
}

export class TerminalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Sentry for production monitoring
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    })

    // Update error count
    this.setState(prev => ({
      errorCount: prev.errorCount + 1
    }))
  }

  handleReset = () => {
    // Call parent onReset callback if provided
    if (this.props.onReset) {
      this.props.onReset()
    }

    // Reset error boundary state
    this.setState({
      hasError: false,
      error: null
    })

    // Don't reload page - just reset the error state
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
            {'\n'}║   Terminal Temporarily Offline    ║{'\n'}║   Click below to reset terminal   ║
            {'\n'}╚═══════════════════════════════════╝
          </pre>

          <button
            onClick={this.handleReset}
            style={{
              backgroundColor: '#000000',
              color: '#00ff00',
              border: '2px solid #00ff00',
              padding: '0.5rem 2rem',
              fontFamily: 'IBM Plex Mono, Courier New, monospace',
              fontSize: '1rem',
              cursor: 'pointer',
              marginBottom: '1rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#00ff00'
              e.currentTarget.style.color = '#000000'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#000000'
              e.currentTarget.style.color = '#00ff00'
            }}
          >
            RESET TERMINAL
          </button>

          <div style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '0.5rem' }}>
            Error: {this.state.error?.message || 'Unknown error'}
          </div>

          {this.state.errorCount > 1 && (
            <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>
              Errors: {this.state.errorCount}
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
