// Input Buffer Unit Tests
// Feature: 001-custom-terminal-emulator
// User Story 3: True Terminal Behavior and Input Handling

import { describe, it, expect, beforeEach } from 'vitest'
import { InputBufferManager } from '../utils/input-buffer'

describe('InputBufferManager', () => {
  let buffer: InputBufferManager

  beforeEach(() => {
    buffer = new InputBufferManager(100) // Max length 100
  })

  describe('insertChar', () => {
    it('should insert character at cursor position', () => {
      buffer.insertChar('h')
      buffer.insertChar('i')

      expect(buffer.getText()).toBe('hi')
      expect(buffer.getCursorPosition()).toBe(2)
    })

    it('should insert character in middle of text', () => {
      buffer.insertChar('h')
      buffer.insertChar('i')
      buffer.moveCursor(-1) // Move back to between 'h' and 'i'
      buffer.insertChar('e')

      expect(buffer.getText()).toBe('hei')
      expect(buffer.getCursorPosition()).toBe(2)
    })

    it('should insert at start of buffer', () => {
      buffer.insertChar('e')
      buffer.insertChar('l')
      buffer.insertChar('l')
      buffer.insertChar('o')
      buffer.moveCursor(-4) // Move to start
      buffer.insertChar('h')

      expect(buffer.getText()).toBe('hello')
      expect(buffer.getCursorPosition()).toBe(1)
    })

    it('should respect max length', () => {
      const smallBuffer = new InputBufferManager(5)
      smallBuffer.insertChar('1')
      smallBuffer.insertChar('2')
      smallBuffer.insertChar('3')
      smallBuffer.insertChar('4')
      smallBuffer.insertChar('5')
      smallBuffer.insertChar('6') // Should be ignored

      expect(smallBuffer.getText()).toBe('12345')
      expect(smallBuffer.getCursorPosition()).toBe(5)
    })

    it('should handle unicode characters', () => {
      buffer.insertChar('😀')
      buffer.insertChar('👍')

      expect(buffer.getText()).toBe('😀👍')
    })

    it('should handle spaces', () => {
      buffer.insertChar('h')
      buffer.insertChar(' ')
      buffer.insertChar('i')

      expect(buffer.getText()).toBe('h i')
    })
  })

  describe('deleteBackward', () => {
    it('should delete character before cursor', () => {
      buffer.insertChar('h')
      buffer.insertChar('i')
      buffer.deleteBackward()

      expect(buffer.getText()).toBe('h')
      expect(buffer.getCursorPosition()).toBe(1)
    })

    it('should do nothing at start of buffer', () => {
      buffer.insertChar('h')
      buffer.moveCursor(-1) // Move to start
      buffer.deleteBackward()

      expect(buffer.getText()).toBe('h')
      expect(buffer.getCursorPosition()).toBe(0)
    })

    it('should delete from middle of text', () => {
      buffer.insertChar('h')
      buffer.insertChar('e')
      buffer.insertChar('l')
      buffer.insertChar('l')
      buffer.insertChar('o')
      buffer.moveCursor(-2) // Between second 'l' and 'o'
      buffer.deleteBackward()

      expect(buffer.getText()).toBe('helo')
      expect(buffer.getCursorPosition()).toBe(2)
    })
  })

  describe('deleteForward', () => {
    it('should delete character at cursor', () => {
      buffer.insertChar('h')
      buffer.insertChar('i')
      buffer.moveCursor(-1) // Move back
      buffer.deleteForward()

      expect(buffer.getText()).toBe('h')
      expect(buffer.getCursorPosition()).toBe(1)
    })

    it('should do nothing at end of buffer', () => {
      buffer.insertChar('h')
      buffer.deleteForward()

      expect(buffer.getText()).toBe('h')
      expect(buffer.getCursorPosition()).toBe(1)
    })

    it('should delete from start of text', () => {
      buffer.insertChar('h')
      buffer.insertChar('e')
      buffer.insertChar('l')
      buffer.insertChar('l')
      buffer.insertChar('o')
      buffer.moveCursor(-5) // Move to start
      buffer.deleteForward()

      expect(buffer.getText()).toBe('ello')
      expect(buffer.getCursorPosition()).toBe(0)
    })
  })

  describe('moveCursor', () => {
    it('should move cursor forward', () => {
      buffer.insertChar('h')
      buffer.insertChar('i')
      buffer.moveCursor(-2) // Move to start
      buffer.moveCursor(1) // Move forward 1

      expect(buffer.getCursorPosition()).toBe(1)
    })

    it('should move cursor backward', () => {
      buffer.insertChar('h')
      buffer.insertChar('i')
      buffer.moveCursor(-1) // Move back 1

      expect(buffer.getCursorPosition()).toBe(1)
    })

    it('should clamp at start', () => {
      buffer.insertChar('h')
      buffer.moveCursor(-10) // Try to move too far back

      expect(buffer.getCursorPosition()).toBe(0)
    })

    it('should clamp at end', () => {
      buffer.insertChar('h')
      buffer.insertChar('i')
      buffer.moveCursor(-2) // Move to start
      buffer.moveCursor(10) // Try to move too far forward

      expect(buffer.getCursorPosition()).toBe(2)
    })
  })

  describe('clear', () => {
    it('should clear buffer', () => {
      buffer.insertChar('h')
      buffer.insertChar('e')
      buffer.insertChar('l')
      buffer.insertChar('l')
      buffer.insertChar('o')
      buffer.clear()

      expect(buffer.getText()).toBe('')
      expect(buffer.getCursorPosition()).toBe(0)
    })

    it('should reset cursor position', () => {
      buffer.insertChar('h')
      buffer.insertChar('i')
      buffer.clear()

      expect(buffer.getCursorPosition()).toBe(0)
    })
  })

  describe('deleteToStart', () => {
    it('should delete from cursor to start', () => {
      buffer.insertChar('h')
      buffer.insertChar('e')
      buffer.insertChar('l')
      buffer.insertChar('l')
      buffer.insertChar('o')
      buffer.moveCursor(-2) // Position at second 'l'
      buffer.deleteToStart()

      expect(buffer.getText()).toBe('lo')
      expect(buffer.getCursorPosition()).toBe(0)
    })

    it('should do nothing if cursor at start', () => {
      buffer.insertChar('h')
      buffer.insertChar('i')
      buffer.moveCursor(-2)
      buffer.deleteToStart()

      expect(buffer.getText()).toBe('hi')
      expect(buffer.getCursorPosition()).toBe(0)
    })
  })

  describe('deleteToEnd', () => {
    it('should delete from cursor to end', () => {
      buffer.insertChar('h')
      buffer.insertChar('e')
      buffer.insertChar('l')
      buffer.insertChar('l')
      buffer.insertChar('o')
      buffer.moveCursor(-2) // Position at second 'l'
      buffer.deleteToEnd()

      expect(buffer.getText()).toBe('hel')
      expect(buffer.getCursorPosition()).toBe(3)
    })

    it('should do nothing if cursor at end', () => {
      buffer.insertChar('h')
      buffer.insertChar('i')
      buffer.deleteToEnd()

      expect(buffer.getText()).toBe('hi')
      expect(buffer.getCursorPosition()).toBe(2)
    })
  })

  describe('deleteWordBackward', () => {
    it('should delete previous word', () => {
      const text = 'hello world'
      text.split('').forEach(c => buffer.insertChar(c))
      buffer.deleteWordBackward()

      expect(buffer.getText()).toBe('hello ')
    })

    it('should delete to previous space', () => {
      const text = 'hello  world'
      text.split('').forEach(c => buffer.insertChar(c))
      buffer.deleteWordBackward()

      expect(buffer.getText()).toBe('hello  ')
    })

    it('should delete entire buffer if no spaces', () => {
      buffer.insertChar('h')
      buffer.insertChar('e')
      buffer.insertChar('l')
      buffer.insertChar('l')
      buffer.insertChar('o')
      buffer.deleteWordBackward()

      expect(buffer.getText()).toBe('')
      expect(buffer.getCursorPosition()).toBe(0)
    })

    it('should handle multiple spaces', () => {
      const text = 'hello   world'
      text.split('').forEach(c => buffer.insertChar(c))
      buffer.deleteWordBackward()

      expect(buffer.getText()).toBe('hello   ')
    })
  })

  describe('getText', () => {
    it('should return current buffer text', () => {
      expect(buffer.getText()).toBe('')

      buffer.insertChar('h')
      buffer.insertChar('i')

      expect(buffer.getText()).toBe('hi')
    })
  })

  describe('getCursorPosition', () => {
    it('should return current cursor position', () => {
      expect(buffer.getCursorPosition()).toBe(0)

      buffer.insertChar('h')
      expect(buffer.getCursorPosition()).toBe(1)

      buffer.insertChar('i')
      expect(buffer.getCursorPosition()).toBe(2)

      buffer.moveCursor(-1)
      expect(buffer.getCursorPosition()).toBe(1)
    })
  })

  describe('setText', () => {
    it('should set buffer text', () => {
      buffer.setText('hello')

      expect(buffer.getText()).toBe('hello')
      expect(buffer.getCursorPosition()).toBe(5)
    })

    it('should respect max length', () => {
      const smallBuffer = new InputBufferManager(5)
      smallBuffer.setText('hello world')

      expect(smallBuffer.getText()).toBe('hello')
    })

    it('should reset cursor to end', () => {
      buffer.insertChar('h')
      buffer.moveCursor(-1)
      buffer.setText('world')

      expect(buffer.getCursorPosition()).toBe(5)
    })
  })

  describe('Complex operations', () => {
    it('should handle multiple edits', () => {
      buffer.insertChar('h')
      buffer.insertChar('e')
      buffer.insertChar('l')
      buffer.insertChar('l')
      buffer.insertChar('o')
      buffer.moveCursor(-2) // Between second 'l' and 'o'
      buffer.insertChar(' ')
      buffer.insertChar('w')
      buffer.insertChar('o')
      buffer.insertChar('r')
      buffer.insertChar('l')
      buffer.insertChar('d')

      expect(buffer.getText()).toBe('hel worldlo')
    })

    it('should handle edit in middle followed by deletion', () => {
      buffer.insertChar('h')
      buffer.insertChar('e')
      buffer.insertChar('l')
      buffer.insertChar('l')
      buffer.insertChar('o')
      buffer.moveCursor(-2)
      buffer.insertChar('x')
      buffer.deleteBackward()
      buffer.deleteForward()

      expect(buffer.getText()).toBe('helo')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty buffer operations', () => {
      buffer.deleteBackward()
      buffer.deleteForward()
      buffer.moveCursor(5)
      buffer.moveCursor(-5)

      expect(buffer.getText()).toBe('')
      expect(buffer.getCursorPosition()).toBe(0)
    })

    it('should handle rapid insertions', () => {
      for (let i = 0; i < 50; i++) {
        buffer.insertChar('a')
      }

      expect(buffer.getText().length).toBe(50)
      expect(buffer.getCursorPosition()).toBe(50)
    })

    it('should handle rapid deletions', () => {
      for (let i = 0; i < 10; i++) {
        buffer.insertChar('a')
      }

      for (let i = 0; i < 10; i++) {
        buffer.deleteBackward()
      }

      expect(buffer.getText()).toBe('')
      expect(buffer.getCursorPosition()).toBe(0)
    })
  })
})
