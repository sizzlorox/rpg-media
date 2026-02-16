// Virtual Keyboard Detection Hook
// Feature: 001-custom-terminal-emulator

import { useState, useEffect } from 'react'

/**
 * Hook for detecting virtual keyboard on mobile devices
 * Uses visualViewport API to detect when keyboard appears/disappears
 */
export function useVirtualKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!('visualViewport' in window)) {
      return
    }

    const handleViewportResize = () => {
      const viewport = window.visualViewport
      if (!viewport) return

      const keyboardHeight = window.innerHeight - viewport.height
      const keyboardOpen = keyboardHeight > 100 // Threshold for keyboard detection

      setKeyboardHeight(keyboardOpen ? keyboardHeight : 0)
      setIsOpen(keyboardOpen)
    }

    window.visualViewport?.addEventListener('resize', handleViewportResize)
    window.visualViewport?.addEventListener('scroll', handleViewportResize)

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize)
      window.visualViewport?.removeEventListener('scroll', handleViewportResize)
    }
  }, [])

  return {
    keyboardHeight,
    isOpen,
    adjustedHeight: isOpen ? `calc(100vh - ${keyboardHeight}px)` : '100vh'
  }
}
