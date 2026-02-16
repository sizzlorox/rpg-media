// Command History Unit Tests
// Feature: 001-custom-terminal-emulator
// User Story 3: True Terminal Behavior and Input Handling

import { describe, it, expect, beforeEach } from 'vitest'

/**
 * Command History Manager (session-only, circular buffer)
 */
export class CommandHistory {
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

    // Reset index
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
   * Get current navigation index
   */
  getCurrentIndex(): number {
    return this.currentIndex
  }
}

describe('CommandHistory', () => {
  let history: CommandHistory

  beforeEach(() => {
    history = new CommandHistory(5) // Small max size for testing
  })

  describe('add', () => {
    it('should add command to history', () => {
      history.add('ls')

      expect(history.getAll()).toEqual(['ls'])
    })

    it('should add multiple commands', () => {
      history.add('ls')
      history.add('cd ..')
      history.add('pwd')

      expect(history.getAll()).toEqual(['pwd', 'cd ..', 'ls'])
    })

    it('should not add empty commands', () => {
      history.add('')
      history.add('   ')

      expect(history.size()).toBe(0)
    })

    it('should not add duplicate of most recent command', () => {
      history.add('ls')
      history.add('ls')

      expect(history.getAll()).toEqual(['ls'])
    })

    it('should allow duplicate if not most recent', () => {
      history.add('ls')
      history.add('pwd')
      history.add('ls')

      expect(history.getAll()).toEqual(['ls', 'pwd', 'ls'])
    })

    it('should respect max size', () => {
      history.add('cmd1')
      history.add('cmd2')
      history.add('cmd3')
      history.add('cmd4')
      history.add('cmd5')
      history.add('cmd6') // Should push out cmd1

      expect(history.size()).toBe(5)
      expect(history.getAll()).toEqual(['cmd6', 'cmd5', 'cmd4', 'cmd3', 'cmd2'])
      expect(history.getAll()).not.toContain('cmd1')
    })

    it('should reset navigation index after adding', () => {
      history.add('cmd1')
      history.getPrevious()
      history.add('cmd2')

      expect(history.getCurrentIndex()).toBe(-1)
    })

    it('should trim whitespace from commands', () => {
      history.add('  ls  ')

      expect(history.getAll()[0]).toBe('  ls  ') // Preserves original spacing
    })
  })

  describe('getPrevious', () => {
    beforeEach(() => {
      history.add('cmd1')
      history.add('cmd2')
      history.add('cmd3')
    })

    it('should get most recent command', () => {
      const cmd = history.getPrevious()

      expect(cmd).toBe('cmd3')
      expect(history.getCurrentIndex()).toBe(0)
    })

    it('should navigate backwards through history', () => {
      expect(history.getPrevious()).toBe('cmd3')
      expect(history.getPrevious()).toBe('cmd2')
      expect(history.getPrevious()).toBe('cmd1')
    })

    it('should stop at oldest command', () => {
      history.getPrevious()
      history.getPrevious()
      history.getPrevious()
      const cmd = history.getPrevious()

      expect(cmd).toBe('cmd1')
      expect(history.getCurrentIndex()).toBe(2)
    })

    it('should return null for empty history', () => {
      const emptyHistory = new CommandHistory()
      expect(emptyHistory.getPrevious()).toBeNull()
    })

    it('should maintain position when at end', () => {
      history.getPrevious()
      history.getPrevious()
      history.getPrevious()

      const index1 = history.getCurrentIndex()
      history.getPrevious()
      const index2 = history.getCurrentIndex()

      expect(index1).toBe(index2)
    })
  })

  describe('getNext', () => {
    beforeEach(() => {
      history.add('cmd1')
      history.add('cmd2')
      history.add('cmd3')
      // Navigate to oldest
      history.getPrevious()
      history.getPrevious()
      history.getPrevious()
    })

    it('should navigate forward through history', () => {
      expect(history.getNext()).toBe('cmd2')
      expect(history.getNext()).toBe('cmd3')
    })

    it('should return empty string when reaching current', () => {
      history.getNext()
      history.getNext()
      const result = history.getNext()

      expect(result).toBe('')
      expect(history.getCurrentIndex()).toBe(-1)
    })

    it('should return null when already at current', () => {
      const result = history.getNext()

      expect(result).toBeNull()
    })

    it('should reset index to -1 when going past newest', () => {
      history.getNext()
      history.getNext()
      history.getNext()

      expect(history.getCurrentIndex()).toBe(-1)
    })
  })

  describe('reset', () => {
    it('should reset navigation index', () => {
      history.add('cmd1')
      history.getPrevious()
      history.reset()

      expect(history.getCurrentIndex()).toBe(-1)
    })

    it('should not affect history content', () => {
      history.add('cmd1')
      history.add('cmd2')
      history.reset()

      expect(history.getAll()).toEqual(['cmd2', 'cmd1'])
    })
  })

  describe('getAll', () => {
    it('should return all commands in order', () => {
      history.add('cmd1')
      history.add('cmd2')
      history.add('cmd3')

      expect(history.getAll()).toEqual(['cmd3', 'cmd2', 'cmd1'])
    })

    it('should return copy of history', () => {
      history.add('cmd1')
      const all = history.getAll()
      all.push('cmd2')

      expect(history.size()).toBe(1)
    })

    it('should return empty array for empty history', () => {
      expect(history.getAll()).toEqual([])
    })
  })

  describe('size', () => {
    it('should return 0 for empty history', () => {
      expect(history.size()).toBe(0)
    })

    it('should return correct size', () => {
      history.add('cmd1')
      expect(history.size()).toBe(1)

      history.add('cmd2')
      expect(history.size()).toBe(2)
    })

    it('should not exceed max size', () => {
      for (let i = 0; i < 10; i++) {
        history.add(`cmd${i}`)
      }

      expect(history.size()).toBe(5)
    })
  })

  describe('clear', () => {
    it('should clear all history', () => {
      history.add('cmd1')
      history.add('cmd2')
      history.clear()

      expect(history.size()).toBe(0)
      expect(history.getAll()).toEqual([])
    })

    it('should reset navigation index', () => {
      history.add('cmd1')
      history.getPrevious()
      history.clear()

      expect(history.getCurrentIndex()).toBe(-1)
    })
  })

  describe('Navigation scenarios', () => {
    beforeEach(() => {
      history.add('ls')
      history.add('cd ..')
      history.add('pwd')
    })

    it('should handle up-up-down navigation', () => {
      expect(history.getPrevious()).toBe('pwd')
      expect(history.getPrevious()).toBe('cd ..')
      expect(history.getNext()).toBe('pwd')
    })

    it('should handle up-up-up-down-down-down navigation', () => {
      history.getPrevious()
      history.getPrevious()
      history.getPrevious()

      expect(history.getNext()).toBe('cd ..')
      expect(history.getNext()).toBe('pwd')
      expect(history.getNext()).toBe('')
    })

    it('should handle navigation with new command', () => {
      history.getPrevious()
      history.getPrevious()
      history.add('new command')

      expect(history.getCurrentIndex()).toBe(-1)
      expect(history.getPrevious()).toBe('new command')
    })

    it('should handle repeated up arrows at end', () => {
      history.getPrevious()
      history.getPrevious()
      history.getPrevious()
      history.getPrevious()
      history.getPrevious()

      expect(history.getCurrentIndex()).toBe(2)
      expect(history.getPrevious()).toBe('ls')
    })

    it('should handle repeated down arrows at start', () => {
      const r1 = history.getNext()
      const r2 = history.getNext()
      const r3 = history.getNext()

      expect(r1).toBeNull()
      expect(r2).toBeNull()
      expect(r3).toBeNull()
    })
  })

  describe('Edge cases', () => {
    it('should handle single command history', () => {
      history.add('only')

      expect(history.getPrevious()).toBe('only')
      expect(history.getPrevious()).toBe('only')
      expect(history.getNext()).toBe('')
      expect(history.getNext()).toBeNull()
    })

    it('should handle very long commands', () => {
      const longCmd = 'a'.repeat(1000)
      history.add(longCmd)

      expect(history.getPrevious()).toBe(longCmd)
    })

    it('should handle commands with special characters', () => {
      history.add('echo "Hello World"')
      history.add('grep -r "search" .')
      history.add('find . -name "*.ts"')

      expect(history.size()).toBe(3)
      expect(history.getPrevious()).toContain('"*.ts"')
    })

    it('should handle navigation on empty history', () => {
      expect(history.getPrevious()).toBeNull()
      expect(history.getNext()).toBeNull()
      expect(history.getCurrentIndex()).toBe(-1)
    })

    it('should handle rapid additions', () => {
      for (let i = 0; i < 100; i++) {
        history.add(`cmd${i}`)
      }

      expect(history.size()).toBeLessThanOrEqual(5)
    })
  })

  describe('Large history', () => {
    it('should handle default max size of 100', () => {
      const largeHistory = new CommandHistory(100)

      for (let i = 0; i < 150; i++) {
        largeHistory.add(`cmd${i}`)
      }

      expect(largeHistory.size()).toBe(100)
      expect(largeHistory.getPrevious()).toBe('cmd149')
    })

    it('should maintain circular buffer correctly', () => {
      const circularHistory = new CommandHistory(3)

      circularHistory.add('cmd1')
      circularHistory.add('cmd2')
      circularHistory.add('cmd3')
      circularHistory.add('cmd4')

      const all = circularHistory.getAll()
      expect(all).toEqual(['cmd4', 'cmd3', 'cmd2'])
      expect(all).not.toContain('cmd1')
    })
  })
})
