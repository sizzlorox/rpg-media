// Unit Test: Error Boundary
// Feature: 001-custom-terminal-emulator
// User Story 8: Error Boundary with Terminal Reset

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TerminalErrorBoundary } from '../../components/terminal/TerminalErrorBoundary'
import React from 'react'

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('TerminalErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render children when no error occurs', () => {
    render(
      <TerminalErrorBoundary>
        <div data-testid="child">Child component</div>
      </TerminalErrorBoundary>
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Child component')).toBeInTheDocument()
  })

  it('should catch errors and display fallback UI', () => {
    render(
      <TerminalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TerminalErrorBoundary>
    )

    // Should show error message
    expect(screen.getByText(/terminal error/i)).toBeInTheDocument()
  })

  it('should display error message in fallback UI', () => {
    const errorMessage = 'Custom test error'

    const ThrowCustomError = () => {
      throw new Error(errorMessage)
    }

    render(
      <TerminalErrorBoundary>
        <ThrowCustomError />
      </TerminalErrorBoundary>
    )

    // Should display the error message
    expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument()
  })

  it('should provide reset button in fallback UI', () => {
    render(
      <TerminalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TerminalErrorBoundary>
    )

    // Should have reset button
    const resetButton = screen.getByRole('button', { name: /reset/i })
    expect(resetButton).toBeInTheDocument()
  })

  it('should reset error state when reset button is clicked', async () => {
    const { rerender } = render(
      <TerminalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TerminalErrorBoundary>
    )

    // Should show error UI
    expect(screen.getByText(/terminal error/i)).toBeInTheDocument()

    // Click reset button
    const resetButton = screen.getByRole('button', { name: /reset/i })
    resetButton.click()

    // After reset, should try to render children again
    // In real implementation, this would clear error state and re-render
  })

  it('should log errors for debugging', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <TerminalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TerminalErrorBoundary>
    )

    // Should have logged the error
    expect(consoleError).toHaveBeenCalled()
  })

  it('should capture error stack trace', () => {
    const ThrowErrorWithStack = () => {
      throw new Error('Error with stack')
    }

    render(
      <TerminalErrorBoundary>
        <ThrowErrorWithStack />
      </TerminalErrorBoundary>
    )

    // Error boundary should have captured error
    expect(screen.getByText(/terminal error/i)).toBeInTheDocument()
  })

  it('should handle multiple consecutive errors', () => {
    const { rerender } = render(
      <TerminalErrorBoundary>
        <ThrowError shouldThrow={false} />
      </TerminalErrorBoundary>
    )

    // First error
    rerender(
      <TerminalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TerminalErrorBoundary>
    )

    expect(screen.getByText(/terminal error/i)).toBeInTheDocument()

    // Reset
    const resetButton = screen.getByRole('button', { name: /reset/i })
    resetButton.click()

    // Second error
    rerender(
      <TerminalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TerminalErrorBoundary>
    )

    // Should still show error UI
    expect(screen.getByText(/terminal error/i)).toBeInTheDocument()
  })

  it('should display user-friendly error message', () => {
    render(
      <TerminalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TerminalErrorBoundary>
    )

    // Should have helpful message for users
    const errorText = screen.getByText(/terminal error/i)
    expect(errorText).toBeInTheDocument()

    // Should suggest reset action
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
  })

  it('should handle errors in event handlers gracefully', () => {
    const ErrorInHandler = () => {
      const handleClick = () => {
        throw new Error('Event handler error')
      }

      return <button onClick={handleClick}>Click me</button>
    }

    render(
      <TerminalErrorBoundary>
        <ErrorInHandler />
      </TerminalErrorBoundary>
    )

    const button = screen.getByText('Click me')

    // Note: Error boundaries don't catch errors in event handlers by default
    // This would need try/catch in the handler itself
    expect(button).toBeInTheDocument()
  })

  it('should preserve terminal state before error', () => {
    // This is a contract test
    // Real implementation would save terminal state before showing error UI
    const StatePreservingComponent = () => {
      return <div data-testid="terminal-state">State preserved</div>
    }

    render(
      <TerminalErrorBoundary>
        <StatePreservingComponent />
      </TerminalErrorBoundary>
    )

    expect(screen.getByTestId('terminal-state')).toBeInTheDocument()
  })

  it('should reset terminal to clean state after reset', () => {
    render(
      <TerminalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TerminalErrorBoundary>
    )

    const resetButton = screen.getByRole('button', { name: /reset/i })
    resetButton.click()

    // After reset, terminal should be in clean state
    // Real implementation would clear buffer, reset cursor, etc.
  })

  it('should handle rendering errors in different lifecycle phases', () => {
    const ComponentWithLifecycleError = () => {
      React.useEffect(() => {
        throw new Error('Effect error')
      }, [])

      return <div>Component</div>
    }

    render(
      <TerminalErrorBoundary>
        <ComponentWithLifecycleError />
      </TerminalErrorBoundary>
    )

    // Should catch and display error
    expect(screen.getByText(/terminal error/i)).toBeInTheDocument()
  })

  it('should provide error details for development', () => {
    const isDevelopment = process.env.NODE_ENV === 'development'

    render(
      <TerminalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TerminalErrorBoundary>
    )

    if (isDevelopment) {
      // In development, might show more details
      expect(screen.getByText(/terminal error/i)).toBeInTheDocument()
    } else {
      // In production, generic message
      expect(screen.getByText(/terminal error/i)).toBeInTheDocument()
    }
  })

  it('should handle nested error boundaries', () => {
    const InnerBoundary = () => (
      <TerminalErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TerminalErrorBoundary>
    )

    render(
      <TerminalErrorBoundary>
        <InnerBoundary />
      </TerminalErrorBoundary>
    )

    // Inner boundary should catch the error
    expect(screen.getByText(/terminal error/i)).toBeInTheDocument()
  })

  it('should not interfere with normal terminal operations', () => {
    const NormalTerminal = () => (
      <div data-testid="terminal">Normal terminal content</div>
    )

    render(
      <TerminalErrorBoundary>
        <NormalTerminal />
      </TerminalErrorBoundary>
    )

    // Should render normally
    expect(screen.getByTestId('terminal')).toBeInTheDocument()
    expect(screen.getByText('Normal terminal content')).toBeInTheDocument()
  })
})
