// Integration Test: Line Editing
// Feature: 001-custom-terminal-emulator
// User Story 3: True Terminal Behavior and Input Handling

import { describe, it, expect, beforeEach } from 'vitest'
import { InputBufferManager } from '../../utils/input-buffer'
import { handleKeyboardEvent } from '../../utils/keyboard-handler'

describe('Terminal Input Integration', () => {
  let inputBuffer: InputBufferManager
  let commandHistory: string[]
  let historyIndex: { current: number }
  let submittedCommands: string[]

  beforeEach(() => {
    inputBuffer = new InputBufferManager(2000)
    commandHistory = []
    historyIndex = { current: -1 }
    submittedCommands = []
  })

  it('should handle complete line editing workflow', () => {
    // Type "hello world"
    'hello world'.split('').forEach(char => {
      inputBuffer.insertChar(char)
    })
    expect(inputBuffer.getText()).toBe('hello world')

    // Move cursor to start
    inputBuffer.moveCursorToStart()
    expect(inputBuffer.getCursorPosition()).toBe(0)

    // Insert at start
    inputBuffer.insertChar('>')
    inputBuffer.insertChar(' ')
    expect(inputBuffer.getText()).toBe('> hello world')

    // Move to end
    inputBuffer.moveCursorToEnd()
    expect(inputBuffer.getCursorPosition()).toBe(13)

    // Delete word backward
    inputBuffer.deleteWordBackward()
    expect(inputBuffer.getText()).toBe('> hello ')

    // Clear to end
    inputBuffer.deleteToEnd()
    expect(inputBuffer.getText()).toBe('> hello ')

    // Clear to start
    inputBuffer.moveCursor(-3)
    inputBuffer.deleteToStart()
    expect(inputBuffer.getText()).toBe('lo ')
  })

  it('should handle cursor movement accurately', () => {
    inputBuffer.insertChar('a')
    inputBuffer.insertChar('b')
    inputBuffer.insertChar('c')
    inputBuffer.insertChar('d')

    expect(inputBuffer.getCursorPosition()).toBe(4)

    // Move left twice
    inputBuffer.moveCursor(-2)
    expect(inputBuffer.getCursorPosition()).toBe(2)

    // Insert in middle
    inputBuffer.insertChar('X')
    expect(inputBuffer.getText()).toBe('abXcd')
    expect(inputBuffer.getCursorPosition()).toBe(3)

    // Delete forward
    inputBuffer.deleteForward()
    expect(inputBuffer.getText()).toBe('abXd')

    // Delete backward
    inputBuffer.deleteBackward()
    expect(inputBuffer.getText()).toBe('abd')
  })

  it('should handle keyboard shortcuts integration', () => {
    // Setup
    const callbacks = {
      onSubmit: (cmd: string) => submittedCommands.push(cmd),
      onClear: () => inputBuffer.clear(),
      onCancel: () => inputBuffer.clear()
    }

    // Type command
    'test command'.split('').forEach(char => inputBuffer.insertChar(char))

    // Simulate Ctrl+U (delete to start)
    const ctrlU = new KeyboardEvent('keydown', { key: 'u', ctrlKey: true })
    handleKeyboardEvent(ctrlU, inputBuffer, commandHistory, historyIndex, callbacks)

    expect(inputBuffer.getText()).toBe('')

    // Type again
    'new command'.split('').forEach(char => inputBuffer.insertChar(char))

    // Simulate Enter (submit)
    const enter = new KeyboardEvent('keydown', { key: 'Enter' })
    handleKeyboardEvent(enter, inputBuffer, commandHistory, historyIndex, callbacks)

    expect(submittedCommands).toContain('new command')
    expect(commandHistory).toContain('new command')
  })

  it('should handle command history navigation', () => {
    // Add commands to history
    commandHistory.push('command3')
    commandHistory.push('command2')
    commandHistory.push('command1')
    historyIndex.current = -1

    // Navigate up (should get command1)
    historyIndex.current = 0
    expect(commandHistory[historyIndex.current]).toBe('command1')

    // Navigate up again (should get command2)
    historyIndex.current = 1
    expect(commandHistory[historyIndex.current]).toBe('command2')

    // Navigate down (should get command1)
    historyIndex.current = 0
    expect(commandHistory[historyIndex.current]).toBe('command1')
  })

  it('should handle rapid input correctly', () => {
    const rapidInput = 'the quick brown fox jumps over the lazy dog'

    // Type rapidly
    rapidInput.split('').forEach(char => {
      inputBuffer.insertChar(char)
    })

    expect(inputBuffer.getText()).toBe(rapidInput)
    expect(inputBuffer.getCursorPosition()).toBe(rapidInput.length)
  })

  it('should handle complex editing sequence', () => {
    // Type initial text
    'initial text here'.split('').forEach(char => inputBuffer.insertChar(char))

    // Move to word "text"
    inputBuffer.moveCursor(-5) // cursor before "here"
    inputBuffer.moveCursor(-5) // cursor before "text"

    // Delete forward 4 chars (delete "text")
    inputBuffer.deleteForward()
    inputBuffer.deleteForward()
    inputBuffer.deleteForward()
    inputBuffer.deleteForward()

    expect(inputBuffer.getText()).toBe('initial  here')

    // Move to end and add
    inputBuffer.moveCursorToEnd()
    ' now'.split('').forEach(char => inputBuffer.insertChar(char))

    expect(inputBuffer.getText()).toBe('initial  here now')
  })

  it('should maintain cursor position during edits', () => {
    'abcdef'.split('').forEach(char => inputBuffer.insertChar(char))

    // Move to position 3 (between c and d)
    inputBuffer.moveCursor(-3)
    const pos1 = inputBuffer.getCursorPosition()
    expect(pos1).toBe(3)

    // Insert character
    inputBuffer.insertChar('X')
    expect(inputBuffer.getCursorPosition()).toBe(4) // Cursor moved forward

    // Delete backward
    inputBuffer.deleteBackward()
    expect(inputBuffer.getCursorPosition()).toBe(3) // Back to original position
  })

  it('should handle buffer limits', () => {
    const smallBuffer = new InputBufferManager(10)

    // Try to insert more than max
    'this is too long for the buffer'.split('').forEach(char => {
      smallBuffer.insertChar(char)
    })

    expect(smallBuffer.getText().length).toBeLessThanOrEqual(10)
  })

  it('should handle word boundary operations', () => {
    'one two three four'.split('').forEach(char => inputBuffer.insertChar(char))

    // Delete word backward from end
    inputBuffer.deleteWordBackward()
    expect(inputBuffer.getText()).toBe('one two three ')

    inputBuffer.deleteWordBackward()
    expect(inputBuffer.getText()).toBe('one two ')

    inputBuffer.deleteWordBackward()
    expect(inputBuffer.getText()).toBe('one ')
  })
})
