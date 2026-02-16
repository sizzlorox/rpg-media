// Integration Test: Command History
// Feature: 001-custom-terminal-emulator
// User Story 3: True Terminal Behavior and Input Handling

import { describe, it, expect, beforeEach } from 'vitest'
import { CommandHistoryManager } from '../../utils/command-history-manager'

describe('Terminal Command History Integration', () => {
  let history: CommandHistoryManager

  beforeEach(() => {
    history = new CommandHistoryManager(100)
  })

  it('should handle complete history workflow', () => {
    // Add commands
    history.add('/login user pass')
    history.add('/post Hello world')
    history.add('/feed')

    expect(history.size()).toBe(3)

    // Navigate up through history
    expect(history.getPrevious()).toBe('/feed')
    expect(history.getPrevious()).toBe('/post Hello world')
    expect(history.getPrevious()).toBe('/login user pass')

    // At oldest - should stay there
    expect(history.getPrevious()).toBe('/login user pass')

    // Navigate down
    expect(history.getNext()).toBe('/post Hello world')
    expect(history.getNext()).toBe('/feed')
    expect(history.getNext()).toBe('') // Back to empty

    // Navigate past newest
    expect(history.getNext()).toBeNull()
  })

  it('should not duplicate consecutive commands', () => {
    history.add('/feed')
    history.add('/feed')
    history.add('/feed')

    expect(history.size()).toBe(1)
    expect(history.getAll()).toEqual(['/feed'])
  })

  it('should allow same command with other commands in between', () => {
    history.add('/feed')
    history.add('/post test')
    history.add('/feed')

    expect(history.size()).toBe(3)
    expect(history.getAll()).toEqual(['/feed', '/post test', '/feed'])
  })

  it('should handle history size limit', () => {
    const smallHistory = new CommandHistoryManager(5)

    for (let i = 0; i < 10; i++) {
      smallHistory.add(`command${i}`)
    }

    expect(smallHistory.size()).toBe(5)
    expect(smallHistory.getAll()).toEqual([
      'command9',
      'command8',
      'command7',
      'command6',
      'command5'
    ])
  })

  it('should reset index after adding new command', () => {
    history.add('cmd1')
    history.add('cmd2')

    // Navigate up
    history.getPrevious()
    history.getPrevious()

    expect(history.getCurrentIndex()).toBe(1)

    // Add new command
    history.add('cmd3')

    // Index should be reset
    expect(history.getCurrentIndex()).toBe(-1)
  })

  it('should handle empty commands', () => {
    history.add('')
    history.add('   ')

    expect(history.size()).toBe(0)
  })

  it('should search history', () => {
    history.add('/login user1 pass1')
    history.add('/post test message')
    history.add('/login user2 pass2')
    history.add('/feed')

    const loginCommands = history.search('login')
    expect(loginCommands).toHaveLength(2)
    expect(loginCommands[0]).toContain('login')
    expect(loginCommands[1]).toContain('login')
  })

  it('should clear history', () => {
    history.add('cmd1')
    history.add('cmd2')
    history.add('cmd3')

    expect(history.size()).toBe(3)

    history.clear()

    expect(history.size()).toBe(0)
    expect(history.isEmpty()).toBe(true)
  })

  it('should handle navigation at boundaries', () => {
    history.add('only')

    // Up from start
    expect(history.getPrevious()).toBe('only')

    // Up again - should stay at oldest
    expect(history.getPrevious()).toBe('only')

    // Down to empty
    expect(history.getNext()).toBe('')

    // Down from empty - should return null
    expect(history.getNext()).toBeNull()
  })

  it('should preserve whitespace in commands', () => {
    history.add('  spaced  command  ')

    expect(history.getPrevious()).toBe('  spaced  command  ')
  })

  it('should handle rapid command additions', () => {
    for (let i = 0; i < 50; i++) {
      history.add(`rapid${i}`)
    }

    expect(history.size()).toBe(50)
    expect(history.getMostRecent()).toBe('rapid49')
  })

  it('should maintain order correctly', () => {
    const commands = ['/login', '/post', '/feed', '/profile', '/stats']

    commands.forEach(cmd => history.add(cmd))

    expect(history.getAll()).toEqual(['/stats', '/profile', '/feed', '/post', '/login'])
  })

  it('should handle export and import', () => {
    history.add('cmd1')
    history.add('cmd2')
    history.add('cmd3')

    const exported = history.export()
    expect(typeof exported).toBe('string')

    const newHistory = new CommandHistoryManager(100)
    newHistory.import(exported)

    expect(newHistory.getAll()).toEqual(history.getAll())
  })

  it('should handle history session lifecycle', () => {
    // Start of session - empty
    expect(history.isEmpty()).toBe(true)

    // User types commands
    history.add('/help')
    history.add('/login user pass')
    history.add('/feed')

    // Navigate through history
    const cmd1 = history.getPrevious() // /feed
    const cmd2 = history.getPrevious() // /login user pass

    expect(cmd1).toBe('/feed')
    expect(cmd2).toBe('/login user pass')

    // Submit new command (simulated by reset + add)
    history.reset()
    history.add('/post New message')

    // History should have new command
    expect(history.getMostRecent()).toBe('/post New message')

    // Clear session
    history.clear()
    expect(history.isEmpty()).toBe(true)
  })
})
