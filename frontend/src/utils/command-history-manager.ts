// Command History Manager
// Feature: 001-custom-terminal-emulator
// User Story 3: True Terminal Behavior and Input Handling

import { useState, useCallback } from 'react'

/**
 * Manages command history with circular buffer (session-only, not persisted)
 */
export class CommandHistoryManager {
  private history: string[] = []
  private maxSize: number
  private currentIndex: number = -1

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }

  /**
   * Add command to history (at the beginning)
   */
  add(command: string): void {
    if (!command.trim()) return

    // Don't add duplicate of most recent command
    if (this.history[0] === command) return

    // Add to front
    this.history.unshift(command)

    // Limit size
    if (this.history.length > this.maxSize) {
      this.history.pop()
    }

    // Reset navigation index
    this.currentIndex = -1
  }

  /**
   * Get previous command (up arrow)
   */
  getPrevious(): string | null {
    if (this.history.length === 0) return null

    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++
      return this.history[this.currentIndex]
    }

    return this.history[this.currentIndex]
  }

  /**
   * Get next command (down arrow)
   */
  getNext(): string | null {
    if (this.currentIndex > 0) {
      this.currentIndex--
      return this.history[this.currentIndex]
    }

    if (this.currentIndex === 0) {
      this.currentIndex = -1
      return ''
    }

    return null
  }

  /**
   * Reset navigation index
   */
  reset(): void {
    this.currentIndex = -1
  }

  /**
   * Get all history entries
   */
  getAll(): string[] {
    return [...this.history]
  }

  /**
   * Get current navigation index
   */
  getCurrentIndex(): number {
    return this.currentIndex
  }

  /**
   * Get history size
   */
  size(): number {
    return this.history.length
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = []
    this.currentIndex = -1
  }

  /**
   * Search history for commands containing search term
   */
  search(searchTerm: string): string[] {
    if (!searchTerm.trim()) return this.history

    return this.history.filter(cmd =>
      cmd.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  /**
   * Get command at specific index
   */
  getAt(index: number): string | null {
    if (index < 0 || index >= this.history.length) return null
    return this.history[index]
  }

  /**
   * Check if history is empty
   */
  isEmpty(): boolean {
    return this.history.length === 0
  }

  /**
   * Get most recent command
   */
  getMostRecent(): string | null {
    return this.history[0] || null
  }
}

/**
 * React hook for command history management
 */

export function useCommandHistory(maxSize: number = 100) {
  const [manager] = useState(() => new CommandHistoryManager(maxSize))
  const [, forceUpdate] = useState(0)

  const add = useCallback((command: string) => {
    manager.add(command)
    forceUpdate(n => n + 1)
  }, [manager])

  const getPrevious = useCallback(() => {
    const cmd = manager.getPrevious()
    forceUpdate(n => n + 1)
    return cmd
  }, [manager])

  const getNext = useCallback(() => {
    const cmd = manager.getNext()
    forceUpdate(n => n + 1)
    return cmd
  }, [manager])

  const reset = useCallback(() => {
    manager.reset()
    forceUpdate(n => n + 1)
  }, [manager])

  const clear = useCallback(() => {
    manager.clear()
    forceUpdate(n => n + 1)
  }, [manager])

  return {
    add,
    getPrevious,
    getNext,
    reset,
    clear,
    getAll: manager.getAll.bind(manager),
    search: manager.search.bind(manager),
    size: manager.size.bind(manager),
    isEmpty: manager.isEmpty.bind(manager),
    getCurrentIndex: manager.getCurrentIndex.bind(manager)
  }
}
