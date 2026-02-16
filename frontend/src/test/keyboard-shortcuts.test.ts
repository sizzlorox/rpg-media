// Keyboard Shortcuts Unit Tests
// Feature: 001-custom-terminal-emulator
// User Story 3: True Terminal Behavior and Input Handling

import { describe, it, expect } from 'vitest'

/**
 * Keyboard shortcut mapping utilities
 */

export interface KeyboardEvent {
  key: string
  code: string
  ctrlKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
}

export interface TerminalAction {
  type: string
  data?: any
}

export function mapKeyboardEventToAction(event: KeyboardEvent): TerminalAction | null {
  // Ctrl key combinations
  if (event.ctrlKey) {
    switch (event.key.toLowerCase()) {
      case 'u':
        return { type: 'DELETE_TO_START' }
      case 'k':
        return { type: 'DELETE_TO_END' }
      case 'w':
        return { type: 'DELETE_WORD_BACKWARD' }
      case 'l':
        return { type: 'CLEAR_SCREEN' }
      case 'c':
        return { type: 'CANCEL_INPUT' }
      case 'a':
        return { type: 'MOVE_TO_START' }
      case 'e':
        return { type: 'MOVE_TO_END' }
      case 'd':
        return { type: 'DELETE_FORWARD' }
      default:
        return null
    }
  }

  // Special keys
  switch (event.key) {
    case 'Enter':
      return { type: 'SUBMIT_COMMAND' }
    case 'Backspace':
      return { type: 'DELETE_BACKWARD' }
    case 'Delete':
      return { type: 'DELETE_FORWARD' }
    case 'Tab':
      return { type: 'AUTOCOMPLETE' }
    case 'ArrowUp':
      return { type: 'HISTORY_PREVIOUS' }
    case 'ArrowDown':
      return { type: 'HISTORY_NEXT' }
    case 'ArrowLeft':
      return { type: 'MOVE_CURSOR_LEFT' }
    case 'ArrowRight':
      return { type: 'MOVE_CURSOR_RIGHT' }
    case 'Home':
      return { type: 'MOVE_TO_START' }
    case 'End':
      return { type: 'MOVE_TO_END' }
    case 'Escape':
      return { type: 'ESCAPE' }
    default:
      // Regular printable characters (including unicode/emoji)
      // Check if it's not a modifier key and not a special multi-char key
      if (!event.ctrlKey && !event.altKey && !event.metaKey) {
        // Filter out function keys and other non-printable multi-char keys
        const specialKeys = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock',
                            'Insert', 'PageUp', 'PageDown', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
                            'F7', 'F8', 'F9', 'F10', 'F11', 'F12']
        if (!specialKeys.includes(event.key) && event.key.length > 0) {
          return { type: 'INSERT_CHAR', data: event.key }
        }
      }
      return null
  }
}

export function getKeySequence(key: string, modifiers: { ctrl?: boolean; alt?: boolean; meta?: boolean } = {}): string {
  let sequence = ''

  if (modifiers.ctrl) sequence += 'Ctrl+'
  if (modifiers.alt) sequence += 'Alt+'
  if (modifiers.meta) sequence += 'Meta+'

  sequence += key

  return sequence
}

describe('mapKeyboardEventToAction', () => {
  describe('Ctrl key combinations', () => {
    it('should map Ctrl+U to DELETE_TO_START', () => {
      const action = mapKeyboardEventToAction({ key: 'u', code: 'KeyU', ctrlKey: true })
      expect(action).toEqual({ type: 'DELETE_TO_START' })
    })

    it('should map Ctrl+K to DELETE_TO_END', () => {
      const action = mapKeyboardEventToAction({ key: 'k', code: 'KeyK', ctrlKey: true })
      expect(action).toEqual({ type: 'DELETE_TO_END' })
    })

    it('should map Ctrl+W to DELETE_WORD_BACKWARD', () => {
      const action = mapKeyboardEventToAction({ key: 'w', code: 'KeyW', ctrlKey: true })
      expect(action).toEqual({ type: 'DELETE_WORD_BACKWARD' })
    })

    it('should map Ctrl+L to CLEAR_SCREEN', () => {
      const action = mapKeyboardEventToAction({ key: 'l', code: 'KeyL', ctrlKey: true })
      expect(action).toEqual({ type: 'CLEAR_SCREEN' })
    })

    it('should map Ctrl+C to CANCEL_INPUT', () => {
      const action = mapKeyboardEventToAction({ key: 'c', code: 'KeyC', ctrlKey: true })
      expect(action).toEqual({ type: 'CANCEL_INPUT' })
    })

    it('should map Ctrl+A to MOVE_TO_START', () => {
      const action = mapKeyboardEventToAction({ key: 'a', code: 'KeyA', ctrlKey: true })
      expect(action).toEqual({ type: 'MOVE_TO_START' })
    })

    it('should map Ctrl+E to MOVE_TO_END', () => {
      const action = mapKeyboardEventToAction({ key: 'e', code: 'KeyE', ctrlKey: true })
      expect(action).toEqual({ type: 'MOVE_TO_END' })
    })

    it('should map Ctrl+D to DELETE_FORWARD', () => {
      const action = mapKeyboardEventToAction({ key: 'd', code: 'KeyD', ctrlKey: true })
      expect(action).toEqual({ type: 'DELETE_FORWARD' })
    })

    it('should handle uppercase Ctrl combinations', () => {
      const action = mapKeyboardEventToAction({ key: 'U', code: 'KeyU', ctrlKey: true })
      expect(action).toEqual({ type: 'DELETE_TO_START' })
    })

    it('should return null for unmapped Ctrl combinations', () => {
      const action = mapKeyboardEventToAction({ key: 'z', code: 'KeyZ', ctrlKey: true })
      expect(action).toBeNull()
    })
  })

  describe('Special keys', () => {
    it('should map Enter to SUBMIT_COMMAND', () => {
      const action = mapKeyboardEventToAction({ key: 'Enter', code: 'Enter' })
      expect(action).toEqual({ type: 'SUBMIT_COMMAND' })
    })

    it('should map Backspace to DELETE_BACKWARD', () => {
      const action = mapKeyboardEventToAction({ key: 'Backspace', code: 'Backspace' })
      expect(action).toEqual({ type: 'DELETE_BACKWARD' })
    })

    it('should map Delete to DELETE_FORWARD', () => {
      const action = mapKeyboardEventToAction({ key: 'Delete', code: 'Delete' })
      expect(action).toEqual({ type: 'DELETE_FORWARD' })
    })

    it('should map Tab to AUTOCOMPLETE', () => {
      const action = mapKeyboardEventToAction({ key: 'Tab', code: 'Tab' })
      expect(action).toEqual({ type: 'AUTOCOMPLETE' })
    })

    it('should map ArrowUp to HISTORY_PREVIOUS', () => {
      const action = mapKeyboardEventToAction({ key: 'ArrowUp', code: 'ArrowUp' })
      expect(action).toEqual({ type: 'HISTORY_PREVIOUS' })
    })

    it('should map ArrowDown to HISTORY_NEXT', () => {
      const action = mapKeyboardEventToAction({ key: 'ArrowDown', code: 'ArrowDown' })
      expect(action).toEqual({ type: 'HISTORY_NEXT' })
    })

    it('should map ArrowLeft to MOVE_CURSOR_LEFT', () => {
      const action = mapKeyboardEventToAction({ key: 'ArrowLeft', code: 'ArrowLeft' })
      expect(action).toEqual({ type: 'MOVE_CURSOR_LEFT' })
    })

    it('should map ArrowRight to MOVE_CURSOR_RIGHT', () => {
      const action = mapKeyboardEventToAction({ key: 'ArrowRight', code: 'ArrowRight' })
      expect(action).toEqual({ type: 'MOVE_CURSOR_RIGHT' })
    })

    it('should map Home to MOVE_TO_START', () => {
      const action = mapKeyboardEventToAction({ key: 'Home', code: 'Home' })
      expect(action).toEqual({ type: 'MOVE_TO_START' })
    })

    it('should map End to MOVE_TO_END', () => {
      const action = mapKeyboardEventToAction({ key: 'End', code: 'End' })
      expect(action).toEqual({ type: 'MOVE_TO_END' })
    })

    it('should map Escape to ESCAPE', () => {
      const action = mapKeyboardEventToAction({ key: 'Escape', code: 'Escape' })
      expect(action).toEqual({ type: 'ESCAPE' })
    })
  })

  describe('Regular characters', () => {
    it('should map single character to INSERT_CHAR', () => {
      const action = mapKeyboardEventToAction({ key: 'a', code: 'KeyA' })
      expect(action).toEqual({ type: 'INSERT_CHAR', data: 'a' })
    })

    it('should map uppercase character to INSERT_CHAR', () => {
      const action = mapKeyboardEventToAction({ key: 'A', code: 'KeyA', shiftKey: true })
      expect(action).toEqual({ type: 'INSERT_CHAR', data: 'A' })
    })

    it('should map number to INSERT_CHAR', () => {
      const action = mapKeyboardEventToAction({ key: '5', code: 'Digit5' })
      expect(action).toEqual({ type: 'INSERT_CHAR', data: '5' })
    })

    it('should map space to INSERT_CHAR', () => {
      const action = mapKeyboardEventToAction({ key: ' ', code: 'Space' })
      expect(action).toEqual({ type: 'INSERT_CHAR', data: ' ' })
    })

    it('should map special characters to INSERT_CHAR', () => {
      const action = mapKeyboardEventToAction({ key: '!', code: 'Digit1', shiftKey: true })
      expect(action).toEqual({ type: 'INSERT_CHAR', data: '!' })
    })

    it('should map unicode character to INSERT_CHAR', () => {
      const action = mapKeyboardEventToAction({ key: '😀', code: '' })
      expect(action).toEqual({ type: 'INSERT_CHAR', data: '😀' })
    })

    it('should not map character with Ctrl modifier', () => {
      const action = mapKeyboardEventToAction({ key: 'a', code: 'KeyA', ctrlKey: true })
      expect(action).not.toEqual({ type: 'INSERT_CHAR', data: 'a' })
    })

    it('should not map character with Alt modifier', () => {
      const action = mapKeyboardEventToAction({ key: 'a', code: 'KeyA', altKey: true })
      expect(action).toBeNull()
    })

    it('should not map character with Meta modifier', () => {
      const action = mapKeyboardEventToAction({ key: 'a', code: 'KeyA', metaKey: true })
      expect(action).toBeNull()
    })
  })

  describe('Edge cases', () => {
    it('should return null for function keys', () => {
      const action = mapKeyboardEventToAction({ key: 'F1', code: 'F1' })
      expect(action).toBeNull()
    })

    it('should return null for modifier keys alone', () => {
      const actionCtrl = mapKeyboardEventToAction({ key: 'Control', code: 'ControlLeft' })
      const actionShift = mapKeyboardEventToAction({ key: 'Shift', code: 'ShiftLeft' })
      const actionAlt = mapKeyboardEventToAction({ key: 'Alt', code: 'AltLeft' })

      expect(actionCtrl).toBeNull()
      expect(actionShift).toBeNull()
      expect(actionAlt).toBeNull()
    })

    it('should handle empty key', () => {
      const action = mapKeyboardEventToAction({ key: '', code: '' })
      expect(action).toBeNull()
    })

    it('should handle multi-character keys', () => {
      const action = mapKeyboardEventToAction({ key: 'Dead', code: 'IntlBackslash' })
      expect(action).toBeNull()
    })
  })
})

describe('getKeySequence', () => {
  it('should format simple key', () => {
    const sequence = getKeySequence('a')
    expect(sequence).toBe('a')
  })

  it('should format Ctrl+key', () => {
    const sequence = getKeySequence('u', { ctrl: true })
    expect(sequence).toBe('Ctrl+u')
  })

  it('should format Alt+key', () => {
    const sequence = getKeySequence('f', { alt: true })
    expect(sequence).toBe('Alt+f')
  })

  it('should format Meta+key', () => {
    const sequence = getKeySequence('s', { meta: true })
    expect(sequence).toBe('Meta+s')
  })

  it('should format Ctrl+Alt+key', () => {
    const sequence = getKeySequence('t', { ctrl: true, alt: true })
    expect(sequence).toBe('Ctrl+Alt+t')
  })

  it('should format Ctrl+Meta+key', () => {
    const sequence = getKeySequence('r', { ctrl: true, meta: true })
    expect(sequence).toBe('Ctrl+Meta+r')
  })

  it('should format all modifiers', () => {
    const sequence = getKeySequence('a', { ctrl: true, alt: true, meta: true })
    expect(sequence).toBe('Ctrl+Alt+Meta+a')
  })

  it('should handle special key names', () => {
    const sequence = getKeySequence('Enter', { ctrl: true })
    expect(sequence).toBe('Ctrl+Enter')
  })
})

describe('Terminal keyboard behavior compatibility', () => {
  it('should support bash-like shortcuts', () => {
    const shortcuts = [
      { key: 'u', ctrl: true, expected: 'DELETE_TO_START' },
      { key: 'k', ctrl: true, expected: 'DELETE_TO_END' },
      { key: 'w', ctrl: true, expected: 'DELETE_WORD_BACKWARD' },
      { key: 'a', ctrl: true, expected: 'MOVE_TO_START' },
      { key: 'e', ctrl: true, expected: 'MOVE_TO_END' },
      { key: 'l', ctrl: true, expected: 'CLEAR_SCREEN' },
      { key: 'c', ctrl: true, expected: 'CANCEL_INPUT' }
    ]

    shortcuts.forEach(({ key, ctrl, expected }) => {
      const action = mapKeyboardEventToAction({ key, code: `Key${key.toUpperCase()}`, ctrlKey: ctrl })
      expect(action?.type).toBe(expected)
    })
  })

  it('should support standard navigation keys', () => {
    const navigation = [
      { key: 'Home', expected: 'MOVE_TO_START' },
      { key: 'End', expected: 'MOVE_TO_END' },
      { key: 'ArrowLeft', expected: 'MOVE_CURSOR_LEFT' },
      { key: 'ArrowRight', expected: 'MOVE_CURSOR_RIGHT' },
      { key: 'ArrowUp', expected: 'HISTORY_PREVIOUS' },
      { key: 'ArrowDown', expected: 'HISTORY_NEXT' }
    ]

    navigation.forEach(({ key, expected }) => {
      const action = mapKeyboardEventToAction({ key, code: key })
      expect(action?.type).toBe(expected)
    })
  })

  it('should support editing keys', () => {
    const editing = [
      { key: 'Backspace', expected: 'DELETE_BACKWARD' },
      { key: 'Delete', expected: 'DELETE_FORWARD' },
      { key: 'd', ctrl: true, expected: 'DELETE_FORWARD' }
    ]

    editing.forEach(({ key, ctrl, expected }) => {
      const action = mapKeyboardEventToAction({ key, code: key, ctrlKey: ctrl })
      expect(action?.type).toBe(expected)
    })
  })
})
