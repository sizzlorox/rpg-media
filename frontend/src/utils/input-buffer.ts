// Input Buffer Manager for terminal input handling
// Feature: 001-custom-terminal-emulator
// User Story 3: True Terminal Behavior and Input Handling

/**
 * Manages terminal input buffer with cursor positioning and editing operations
 * Supports standard terminal line editing behaviors
 */
export class InputBufferManager {
  private text: string
  private cursorPosition: number
  private maxLength: number

  constructor(maxLength: number = 2000) {
    this.text = ''
    this.cursorPosition = 0
    this.maxLength = maxLength
  }

  /**
   * Insert a character at the current cursor position
   */
  insertChar(char: string): void {
    if (this.text.length >= this.maxLength) {
      return // Respect max length
    }

    this.text = this.text.slice(0, this.cursorPosition) + char + this.text.slice(this.cursorPosition)
    this.cursorPosition++
  }

  /**
   * Delete character before cursor (Backspace)
   */
  deleteBackward(): void {
    if (this.cursorPosition === 0) {
      return // Nothing to delete at start
    }

    this.text = this.text.slice(0, this.cursorPosition - 1) + this.text.slice(this.cursorPosition)
    this.cursorPosition--
  }

  /**
   * Delete character at cursor (Delete key)
   */
  deleteForward(): void {
    if (this.cursorPosition >= this.text.length) {
      return // Nothing to delete at end
    }

    this.text = this.text.slice(0, this.cursorPosition) + this.text.slice(this.cursorPosition + 1)
  }

  /**
   * Move cursor by offset (-1 for left, +1 for right)
   */
  moveCursor(offset: number): void {
    this.cursorPosition = Math.max(0, Math.min(this.text.length, this.cursorPosition + offset))
  }

  /**
   * Move cursor to absolute position
   */
  setCursorPosition(position: number): void {
    this.cursorPosition = Math.max(0, Math.min(this.text.length, position))
  }

  /**
   * Move cursor to start
   */
  moveToStart(): void {
    this.cursorPosition = 0
  }

  /**
   * Move cursor to end
   */
  moveToEnd(): void {
    this.cursorPosition = this.text.length
  }

  /**
   * Delete from cursor to start (Ctrl+U)
   */
  deleteToStart(): void {
    this.text = this.text.slice(this.cursorPosition)
    this.cursorPosition = 0
  }

  /**
   * Delete from cursor to end (Ctrl+K)
   */
  deleteToEnd(): void {
    this.text = this.text.slice(0, this.cursorPosition)
  }

  /**
   * Delete word backward (Ctrl+W)
   */
  deleteWordBackward(): void {
    if (this.cursorPosition === 0) {
      return
    }

    // Find start of current word
    let pos = this.cursorPosition - 1

    // Skip trailing whitespace
    while (pos >= 0 && /\s/.test(this.text[pos])) {
      pos--
    }

    // Delete word characters
    while (pos >= 0 && !/\s/.test(this.text[pos])) {
      pos--
    }

    this.text = this.text.slice(0, pos + 1) + this.text.slice(this.cursorPosition)
    this.cursorPosition = pos + 1
  }

  /**
   * Clear entire buffer
   */
  clear(): void {
    this.text = ''
    this.cursorPosition = 0
  }

  /**
   * Get current buffer text
   */
  getText(): string {
    return this.text
  }

  /**
   * Get current cursor position
   */
  getCursorPosition(): number {
    return this.cursorPosition
  }

  /**
   * Get text length
   */
  getLength(): number {
    return this.text.length
  }

  /**
   * Check if buffer is empty
   */
  isEmpty(): boolean {
    return this.text.length === 0
  }

  /**
   * Check if cursor is at start
   */
  isAtStart(): boolean {
    return this.cursorPosition === 0
  }

  /**
   * Check if cursor is at end
   */
  isAtEnd(): boolean {
    return this.cursorPosition === this.text.length
  }
}
