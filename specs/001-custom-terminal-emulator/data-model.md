# Data Models: Custom Terminal Emulator

**Feature**: 001-custom-terminal-emulator | **Date**: 2026-02-15

## Overview

This document defines the core data structures for the custom terminal emulator. These models represent terminal state, buffer management, input handling, and rendering primitives.

---

## Core Data Structures

### 1. TerminalCell

**Purpose**: Represents a single character cell in the terminal grid with formatting attributes.

**Structure**:
```typescript
interface TerminalCell {
  char: string                    // Single character (1 Unicode grapheme)
  fgColor: string | null          // Foreground color (hex or ANSI name)
  bgColor: string | null          // Background color (hex or ANSI name)
  bold: boolean                   // Bold formatting
  italic: boolean                 // Italic formatting
  underline: boolean              // Underline formatting
  dim: boolean                    // Dim/faint text
  inverse: boolean                // Reverse video (swap fg/bg)
  hidden: boolean                 // Hidden text
}
```

**Validation Rules**:
- `char` must be exactly 1 Unicode grapheme (use grapheme-aware splitting)
- Color values must be valid hex codes (`#RRGGBB`) or ANSI color names (`red`, `green`, etc.)
- Boolean flags default to `false`
- `null` colors mean "use terminal default"

**Example**:
```typescript
const redBoldChar: TerminalCell = {
  char: 'A',
  fgColor: '#FF0000',
  bgColor: null,
  bold: true,
  italic: false,
  underline: false,
  dim: false,
  inverse: false,
  hidden: false
}
```

---

### 2. TerminalLine

**Purpose**: Represents a single line in the terminal buffer, containing cells and metadata.

**Structure**:
```typescript
interface TerminalLine {
  cells: TerminalCell[]           // Array of character cells
  image: ImageSlot | null         // Optional inline image
  metadata: {
    lineNumber: number            // Absolute line number in buffer
    timestamp: number             // Unix timestamp (ms) when line created
    wrapped: boolean              // True if line is continuation of previous
  }
}
```

**Validation Rules**:
- `cells` can be empty array (blank line)
- `cells.length` should match terminal width (pad with spaces if needed)
- `lineNumber` must be >= 0 and unique within buffer
- `timestamp` should be set on line creation
- `wrapped` indicates if line resulted from word-wrap (not a newline)

**Example**:
```typescript
const postLine: TerminalLine = {
  cells: [
    { char: '>', fgColor: '#00FF00', bgColor: null, bold: false, ... },
    { char: ' ', fgColor: null, bgColor: null, bold: false, ... },
    { char: 'P', fgColor: '#FFFFFF', bgColor: null, bold: false, ... },
    // ... more cells
  ],
  image: null,
  metadata: {
    lineNumber: 42,
    timestamp: Date.now(),
    wrapped: false
  }
}
```

---

### 3. ImageSlot

**Purpose**: Represents an inline image reference attached to a terminal line.

**Structure**:
```typescript
interface ImageSlot {
  url: string                     // Image URL (data URI or HTTP/HTTPS)
  alt: string                     // Alt text for accessibility
  id: string                      // Unique identifier (for React keys)
  maxWidth: number                // Max width in pixels (responsive)
  maxHeight: number               // Max height in pixels (responsive)
}
```

**Validation Rules**:
- `url` must be valid data URI or HTTP/HTTPS URL
- `id` must be unique within the terminal instance
- `maxWidth` and `maxHeight` must be > 0
- Image rendering should respect aspect ratio

**Example**:
```typescript
const postImage: ImageSlot = {
  url: 'https://example.com/image.jpg',
  alt: 'User uploaded image',
  id: 'img-post-123-0',
  maxWidth: 600,
  maxHeight: 350
}
```

**Responsive Sizing**:
```typescript
function getImageDimensions(breakpoint: 'mobile' | 'tablet' | 'desktop'): { maxWidth: number; maxHeight: number } {
  switch (breakpoint) {
    case 'mobile':
      return { maxWidth: 280, maxHeight: 150 }
    case 'tablet':
      return { maxWidth: 400, maxHeight: 240 }
    case 'desktop':
      return { maxWidth: 600, maxHeight: 350 }
  }
}
```

---

### 4. ScrollBuffer

**Purpose**: Circular buffer managing terminal lines with efficient append/retrieve operations.

**Structure**:
```typescript
class CircularScrollBuffer {
  private buffer: TerminalLine[]  // Fixed-size circular array
  private head: number             // Write position (next append)
  private size: number             // Max buffer size (10,000 lines)
  private totalLines: number       // Total lines ever written (for line numbers)

  constructor(maxSize: number = 10000) {
    this.buffer = new Array(maxSize)
    this.head = 0
    this.size = maxSize
    this.totalLines = 0
  }

  append(line: TerminalLine): void {
    this.buffer[this.head % this.size] = line
    this.head++
    this.totalLines++
  }

  getLine(index: number): TerminalLine | null {
    const offset = index - Math.max(0, this.totalLines - this.size)
    if (offset < 0 || offset >= this.size) return null
    const bufferIndex = (this.head - this.size + offset) % this.size
    return this.buffer[bufferIndex] || null
  }

  getVisibleRange(startLine: number, endLine: number): TerminalLine[] {
    const lines: TerminalLine[] = []
    for (let i = startLine; i <= endLine; i++) {
      const line = this.getLine(i)
      if (line) lines.push(line)
    }
    return lines
  }

  clear(): void {
    this.buffer = new Array(this.size)
    this.head = 0
    this.totalLines = 0
  }

  getLength(): number {
    return Math.min(this.totalLines, this.size)
  }
}
```

**Performance Characteristics**:
- **append()**: O(1) - no array shifting
- **getLine()**: O(1) - direct index calculation
- **getVisibleRange()**: O(n) where n = endLine - startLine
- **Memory**: Fixed at initialization (size × sizeof(TerminalLine))

**Buffer Wrapping Behavior**:
```
Size: 5, Head: 0 → [_, _, _, _, _]
After 3 appends   → [L0, L1, L2, _, _] (head = 3)
After 7 appends   → [L5, L6, L2, L3, L4] (head = 7, overwrote L0, L1)
```

---

### 5. CursorState

**Purpose**: Tracks the terminal cursor position and visibility for input operations.

**Structure**:
```typescript
interface CursorState {
  row: number                     // Current row (0-indexed from viewport top)
  col: number                     // Current column (0-indexed from line start)
  visible: boolean                // True if cursor should be rendered
  blinking: boolean               // True if cursor should blink
  style: 'block' | 'underline' | 'bar'  // Cursor visual style
}
```

**Validation Rules**:
- `row` must be within viewport bounds (0 to rows - 1)
- `col` must be within line bounds (0 to cols - 1)
- Cursor should snap to end of line if positioned beyond line length
- `visible` should be `true` during input, `false` during non-interactive output

**Example**:
```typescript
const inputCursor: CursorState = {
  row: 29,        // Bottom row of 30-row terminal
  col: 12,        // 12 characters into input line
  visible: true,
  blinking: true,
  style: 'block'
}
```

**State Transitions**:
```
User types char     → col++
Left arrow          → col--
Home/Ctrl+A         → col = 0
End/Ctrl+E          → col = inputBuffer.length
Enter (submit)      → row++, col = 0
Backspace (at col=0)→ no change (don't delete prompt)
```

---

### 6. InputBuffer

**Purpose**: Manages the current command being typed, supporting insertion and deletion at arbitrary positions.

**Structure**:
```typescript
interface InputBuffer {
  text: string                    // Current input text
  cursorPosition: number          // Cursor index in text (0 to text.length)
  maxLength: number               // Maximum input length (2000 chars)
}
```

**Operations**:
```typescript
class InputBufferManager {
  private buffer: InputBuffer

  insertChar(char: string): void {
    if (this.buffer.text.length >= this.buffer.maxLength) return
    const before = this.buffer.text.slice(0, this.buffer.cursorPosition)
    const after = this.buffer.text.slice(this.buffer.cursorPosition)
    this.buffer.text = before + char + after
    this.buffer.cursorPosition++
  }

  deleteBackward(): void {
    if (this.buffer.cursorPosition === 0) return
    const before = this.buffer.text.slice(0, this.buffer.cursorPosition - 1)
    const after = this.buffer.text.slice(this.buffer.cursorPosition)
    this.buffer.text = before + after
    this.buffer.cursorPosition--
  }

  deleteForward(): void {
    if (this.buffer.cursorPosition >= this.buffer.text.length) return
    const before = this.buffer.text.slice(0, this.buffer.cursorPosition)
    const after = this.buffer.text.slice(this.buffer.cursorPosition + 1)
    this.buffer.text = before + after
    // cursor position unchanged
  }

  moveCursor(offset: number): void {
    this.buffer.cursorPosition = Math.max(0, Math.min(this.buffer.text.length, this.buffer.cursorPosition + offset))
  }

  clear(): void {
    this.buffer.text = ''
    this.buffer.cursorPosition = 0
  }

  getText(): string {
    return this.buffer.text
  }
}
```

**Example Usage**:
```typescript
const buffer = new InputBufferManager()
buffer.insertChar('/')     // text: "/", cursor: 1
buffer.insertChar('p')     // text: "/p", cursor: 2
buffer.insertChar('o')     // text: "/po", cursor: 3
buffer.moveCursor(-2)      // text: "/po", cursor: 1
buffer.insertChar('x')     // text: "/xpo", cursor: 2
buffer.deleteBackward()    // text: "/po", cursor: 1
```

---

### 7. ANSIState

**Purpose**: Tracks the current text formatting state during ANSI sequence parsing.

**Structure**:
```typescript
interface ANSIState {
  fgColor: string | null          // Current foreground color
  bgColor: string | null          // Current background color
  bold: boolean                   // Bold enabled
  italic: boolean                 // Italic enabled
  underline: boolean              // Underline enabled
  dim: boolean                    // Dim/faint enabled
  inverse: boolean                // Reverse video enabled
  hidden: boolean                 // Hidden text enabled
}
```

**State Transitions**:
```typescript
// SGR (Select Graphic Rendition) codes
0   → Reset all to defaults
1   → bold = true
2   → dim = true
3   → italic = true
4   → underline = true
7   → inverse = true
8   → hidden = true
22  → bold = false, dim = false
23  → italic = false
24  → underline = false
27  → inverse = false
28  → hidden = false
30-37   → fgColor = ANSI_COLORS[n - 30]
39      → fgColor = null (default)
40-47   → bgColor = ANSI_COLORS[n - 40]
49      → bgColor = null (default)
90-97   → fgColor = BRIGHT_ANSI_COLORS[n - 90]
100-107 → bgColor = BRIGHT_ANSI_COLORS[n - 100]
```

**Default State**:
```typescript
const DEFAULT_ANSI_STATE: ANSIState = {
  fgColor: null,
  bgColor: null,
  bold: false,
  italic: false,
  underline: false,
  dim: false,
  inverse: false,
  hidden: false
}
```

**ANSI Color Map**:
```typescript
const ANSI_COLORS = [
  '#000000', // 0: Black
  '#AA0000', // 1: Red
  '#00AA00', // 2: Green
  '#AA5500', // 3: Yellow
  '#0000AA', // 4: Blue
  '#AA00AA', // 5: Magenta
  '#00AAAA', // 6: Cyan
  '#AAAAAA'  // 7: White
]

const BRIGHT_ANSI_COLORS = [
  '#555555', // 0: Bright Black (Gray)
  '#FF5555', // 1: Bright Red
  '#55FF55', // 2: Bright Green
  '#FFFF55', // 3: Bright Yellow
  '#5555FF', // 4: Bright Blue
  '#FF55FF', // 5: Bright Magenta
  '#55FFFF', // 6: Bright Cyan
  '#FFFFFF'  // 7: Bright White
]
```

---

### 8. ViewportState

**Purpose**: Tracks the visible portion of the terminal buffer and scroll position.

**Structure**:
```typescript
interface ViewportState {
  scrollY: number                 // Current scroll offset in pixels
  viewportHeight: number          // Viewport height in pixels
  viewportWidth: number           // Viewport width in pixels
  rows: number                    // Visible rows (calculated from height)
  cols: number                    // Visible columns (calculated from width)
  lineHeight: number              // Height of one line in pixels
  charWidth: number               // Width of one character in pixels
  breakpoint: 'mobile' | 'tablet' | 'desktop'  // Current responsive breakpoint
  isTouchDevice: boolean          // True if touch input is primary
  safeAreaInsets: {               // Safe area for notched devices
    top: number
    bottom: number
    left: number
    right: number
  }
}
```

**Derived Calculations**:
```typescript
function calculateViewportLines(state: ViewportState): { startLine: number; endLine: number } {
  const startLine = Math.floor(state.scrollY / state.lineHeight)
  const endLine = Math.ceil((state.scrollY + state.viewportHeight) / state.lineHeight)
  return { startLine, endLine }
}

function calculateVisibleRange(state: ViewportState, bufferLength: number): { start: number; end: number } {
  const { startLine, endLine } = calculateViewportLines(state)
  const buffer = 50 // Render extra lines for scroll smoothness
  return {
    start: Math.max(0, startLine - buffer),
    end: Math.min(bufferLength, endLine + buffer)
  }
}
```

**Responsive Breakpoint Configuration**:
```typescript
interface BreakpointConfig {
  maxWidth?: number               // Max viewport width for this breakpoint
  minWidth?: number               // Min viewport width for this breakpoint
  fontSize: number                // Font size in pixels
  lineHeight: number              // Line height multiplier
  cols: number                    // Terminal columns
  rows: number                    // Terminal rows
  imageMaxWidth: number           // Max image width
  imageMaxHeight: number          // Max image height
}

const RESPONSIVE_CONFIG: Record<'mobile' | 'tablet' | 'desktop', BreakpointConfig> = {
  mobile: {
    maxWidth: 640,
    fontSize: 10,
    lineHeight: 1.2,
    cols: 40,
    rows: 24,
    imageMaxWidth: 280,
    imageMaxHeight: 150
  },
  tablet: {
    minWidth: 641,
    maxWidth: 1024,
    fontSize: 12,
    lineHeight: 1.2,
    cols: 60,
    rows: 28,
    imageMaxWidth: 400,
    imageMaxHeight: 240
  },
  desktop: {
    minWidth: 1025,
    fontSize: 14,
    lineHeight: 1.2,
    cols: 80,
    rows: 30,
    imageMaxWidth: 600,
    imageMaxHeight: 350
  }
}

function getBreakpointConfig(viewportWidth: number): BreakpointConfig & { breakpoint: string } {
  if (viewportWidth <= 640) {
    return { ...RESPONSIVE_CONFIG.mobile, breakpoint: 'mobile' }
  } else if (viewportWidth <= 1024) {
    return { ...RESPONSIVE_CONFIG.tablet, breakpoint: 'tablet' }
  } else {
    return { ...RESPONSIVE_CONFIG.desktop, breakpoint: 'desktop' }
  }
}
```

---

## 9. Responsive Design Patterns

### Device Detection

**Purpose**: Determine device capabilities and input methods.

**Detection Logic**:
```typescript
interface DeviceCapabilities {
  isTouchDevice: boolean
  hasPhysicalKeyboard: boolean
  supportsHover: boolean
  viewportWidth: number
  viewportHeight: number
  pixelRatio: number
  safeAreaInsets: { top: number; bottom: number; left: number; right: number }
}

function detectDeviceCapabilities(): DeviceCapabilities {
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const hasPhysicalKeyboard = !isTouchDevice || window.innerWidth > 1024
  const supportsHover = window.matchMedia('(hover: hover)').matches

  // Safe area insets for notched devices
  const computedStyle = getComputedStyle(document.documentElement)
  const safeAreaInsets = {
    top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
    bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
    right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0')
  }

  return {
    isTouchDevice,
    hasPhysicalKeyboard,
    supportsHover,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    safeAreaInsets
  }
}
```

### Viewport Resize Handling

**Purpose**: Respond to viewport changes (resize, orientation, keyboard).

**Implementation**:
```typescript
function useResponsiveTerminal() {
  const [viewportState, setViewportState] = useState<ViewportState>(getInitialViewportState())

  useEffect(() => {
    const handleResize = debounce(() => {
      const width = window.innerWidth
      const height = window.innerHeight
      const config = getBreakpointConfig(width)

      setViewportState(prev => ({
        ...prev,
        viewportWidth: width,
        viewportHeight: height,
        breakpoint: config.breakpoint,
        rows: config.rows,
        cols: config.cols,
        lineHeight: config.fontSize * config.lineHeight,
        charWidth: config.fontSize * 0.6 // Monospace approximation
      }))
    }, 150) // Debounce to avoid excessive updates

    const handleOrientationChange = () => {
      // iOS Safari needs delay after orientation change
      setTimeout(handleResize, 100)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      handleResize.cancel()
    }
  }, [])

  return viewportState
}
```

### Virtual Keyboard Detection (Mobile)

**Purpose**: Adjust layout when virtual keyboard appears.

**Implementation**:
```typescript
function useVirtualKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    if (!('visualViewport' in window)) return

    const handleViewportResize = () => {
      const viewport = window.visualViewport
      if (!viewport) return

      const keyboardHeight = window.innerHeight - viewport.height
      setKeyboardHeight(keyboardHeight > 100 ? keyboardHeight : 0)
    }

    window.visualViewport?.addEventListener('resize', handleViewportResize)
    return () => window.visualViewport?.removeEventListener('resize', handleViewportResize)
  }, [])

  return { keyboardHeight, keyboardOpen: keyboardHeight > 100 }
}
```

### Touch vs Mouse Input Handling

**Purpose**: Provide appropriate input handlers based on device.

**Pattern**:
```typescript
function useInputHandlers(isTouchDevice: boolean) {
  const scrollHandler = isTouchDevice
    ? {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd
      }
    : {
        onWheel: handleWheelScroll
      }

  const selectionHandler = isTouchDevice
    ? {
        onTouchStart: handleSelectionStart,
        onTouchMove: handleSelectionMove,
        onTouchEnd: handleSelectionEnd
      }
    : {
        onMouseDown: handleMouseDown,
        onMouseMove: handleMouseMove,
        onMouseUp: handleMouseUp
      }

  return { scrollHandler, selectionHandler }
}
```

### Responsive Image Sizing

**Purpose**: Load and display images at appropriate sizes for device.

**Implementation**:
```typescript
function getResponsiveImageDimensions(breakpoint: 'mobile' | 'tablet' | 'desktop'): ImageDimensions {
  const config = RESPONSIVE_CONFIG[breakpoint]
  return {
    maxWidth: config.imageMaxWidth,
    maxHeight: config.imageMaxHeight
  }
}

// Render with responsive sizing
function renderImage(imageSlot: ImageSlot, breakpoint: 'mobile' | 'tablet' | 'desktop') {
  const dimensions = getResponsiveImageDimensions(breakpoint)

  return (
    <img
      src={imageSlot.url}
      alt={imageSlot.alt}
      style={{
        maxWidth: `${dimensions.maxWidth}px`,
        maxHeight: `${dimensions.maxHeight}px`,
        width: '100%',
        height: 'auto',
        objectFit: 'contain'
      }}
      loading="lazy"
    />
  )
}
```

---

## 10. Layout and Centering (MUD-Style ASCII Frames)

### Purpose

This is a social media app simulated in a terminal using MUD-like UI elements. Posts, character sheets, and other content are presented in ASCII art frames (borders using `####`, `=====`, `╔══╗`, `┌──┐`, etc.). The layout system calculates frame dimensions and centering to create visually balanced output that adapts to terminal width.

### FrameLayout

**Purpose**: Represents the calculated dimensions and positioning for an ASCII frame.

**Structure**:
```typescript
interface FrameLayout {
  totalWidth: number          // Total frame width in columns (including borders)
  contentWidth: number        // Inner width for content (totalWidth - 2 for borders)
  leftPadding: number         // Spaces before frame for horizontal centering
  topPadding: number          // Empty lines before frame for vertical spacing
  centered: boolean           // True if frame is centered, false if full-width
  borderStyle: FrameBorderStyle
}
```

**Example**:
```typescript
// Desktop frame (centered)
const desktopFrame: FrameLayout = {
  totalWidth: 60,
  contentWidth: 58,
  leftPadding: 10,        // (80 cols - 60 frame width) / 2 = 10
  topPadding: 1,
  centered: true,
  borderStyle: BOX_DRAWING_DOUBLE
}

// Mobile frame (full-width)
const mobileFrame: FrameLayout = {
  totalWidth: 40,
  contentWidth: 38,
  leftPadding: 0,         // No centering on mobile
  topPadding: 1,
  centered: false,
  borderStyle: BOX_DRAWING_DOUBLE
}
```

---

### FrameBorderStyle

**Purpose**: Defines the characters used for frame borders.

**Structure**:
```typescript
interface FrameBorderStyle {
  topLeft: string             // Corner character (e.g., '╔', '┌', '#')
  topRight: string            // Corner character (e.g., '╗', '┐', '#')
  bottomLeft: string          // Corner character (e.g., '╚', '└', '#')
  bottomRight: string         // Corner character (e.g., '╝', '┘', '#')
  horizontal: string          // Top/bottom edge (e.g., '═', '─', '=')
  vertical: string            // Left/right edge (e.g., '║', '│', '|')
}
```

**Predefined Styles**:
```typescript
const BOX_DRAWING_DOUBLE: FrameBorderStyle = {
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  horizontal: '═',
  vertical: '║'
}

const BOX_DRAWING_SINGLE: FrameBorderStyle = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│'
}

const ASCII_BASIC: FrameBorderStyle = {
  topLeft: '+',
  topRight: '+',
  bottomLeft: '+',
  bottomRight: '+',
  horizontal: '-',
  vertical: '|'
}

const ASCII_HASH: FrameBorderStyle = {
  topLeft: '#',
  topRight: '#',
  bottomLeft: '#',
  bottomRight: '#',
  horizontal: '#',
  vertical: '#'
}
```

---

### LayoutCalculator

**Purpose**: Pure functions for calculating frame dimensions and centering.

**Key Functions**:

```typescript
/**
 * Calculate frame layout based on content and terminal width
 */
function calculateFrameLayout(
  contentWidth: number,
  terminalCols: number,
  breakpoint: 'mobile' | 'tablet' | 'desktop'
): FrameLayout {
  // Mobile: use full width
  if (breakpoint === 'mobile') {
    return {
      totalWidth: terminalCols,
      contentWidth: terminalCols - 2,
      leftPadding: 0,
      topPadding: 1,
      centered: false
    }
  }

  // Tablet/Desktop: center with max width
  const maxWidth = breakpoint === 'tablet' ? 50 : 70
  const frameWidth = Math.min(contentWidth + 4, maxWidth, terminalCols)
  const leftPadding = Math.floor((terminalCols - frameWidth) / 2)

  return {
    totalWidth: frameWidth,
    contentWidth: frameWidth - 2,
    leftPadding: Math.max(0, leftPadding),
    topPadding: 1,
    centered: true
  }
}

/**
 * Center text within a frame's content width
 */
function centerTextInFrame(text: string, frameContentWidth: number): string {
  const textLength = text.length

  // Truncate if too long
  if (textLength >= frameContentWidth) {
    return text.substring(0, frameContentWidth)
  }

  // Calculate padding
  const totalPadding = frameContentWidth - textLength
  const leftPadding = Math.floor(totalPadding / 2)
  const rightPadding = totalPadding - leftPadding

  return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding)
}

/**
 * Calculate nested frame layout (frame within another frame)
 */
function calculateNestedFrameLayout(
  outerLayout: FrameLayout,
  innerContentWidth: number
): FrameLayout {
  const innerFrameWidth = Math.min(innerContentWidth + 4, outerLayout.contentWidth)
  const innerLeftOffset = Math.floor((outerLayout.contentWidth - innerFrameWidth) / 2)

  return {
    totalWidth: innerFrameWidth,
    contentWidth: innerFrameWidth - 2,
    leftPadding: outerLayout.leftPadding + innerLeftOffset + 1,  // +1 for outer border
    topPadding: 0,
    centered: true
  }
}
```

---

### FrameRenderer

**Purpose**: Render ASCII frames with borders and content.

**Structure**:
```typescript
interface FrameContent {
  lines: string[]             // Content lines (already wrapped to fit frame)
  image?: ImageSlot           // Optional inline image
}

function renderFrame(
  layout: FrameLayout,
  content: FrameContent,
  borderStyle: FrameBorderStyle
): TerminalLine[] {
  const lines: TerminalLine[] = []
  const leftPadding = ' '.repeat(layout.leftPadding)

  // Top border
  const topBorder = borderStyle.topLeft +
                    borderStyle.horizontal.repeat(layout.totalWidth - 2) +
                    borderStyle.topRight
  lines.push(createLine(leftPadding + topBorder))

  // Content lines
  for (const contentLine of content.lines) {
    const centeredContent = centerTextInFrame(contentLine, layout.contentWidth)
    const framedLine = borderStyle.vertical + centeredContent + borderStyle.vertical
    lines.push(createLine(leftPadding + framedLine))
  }

  // Image (if present)
  if (content.image) {
    const imageLine = createLine(leftPadding + borderStyle.vertical + ' '.repeat(layout.contentWidth) + borderStyle.vertical)
    imageLine.image = content.image
    lines.push(imageLine)
  }

  // Bottom border
  const bottomBorder = borderStyle.bottomLeft +
                       borderStyle.horizontal.repeat(layout.totalWidth - 2) +
                       borderStyle.bottomRight
  lines.push(createLine(leftPadding + bottomBorder))

  return lines
}

function createLine(text: string): TerminalLine {
  return {
    cells: text.split('').map(char => ({
      char,
      fgColor: null,
      bgColor: null,
      bold: false,
      italic: false,
      underline: false,
      dim: false,
      inverse: false,
      hidden: false
    })),
    image: null,
    metadata: {
      lineNumber: 0,  // Will be set by buffer
      timestamp: Date.now(),
      wrapped: false
    }
  }
}
```

---

### Layout Examples

**Example 1: Simple Post Frame (Desktop)**

```typescript
const layout = calculateFrameLayout(50, 80, 'desktop')
// Result: { totalWidth: 54, contentWidth: 52, leftPadding: 13, centered: true }

const content = {
  lines: ['New Post', '', 'Check out this cool image!'],
  image: { url: 'image.jpg', alt: 'Cool image', id: '123', maxWidth: 600, maxHeight: 350 }
}

const lines = renderFrame(layout, content, BOX_DRAWING_DOUBLE)
```

**Output** (80 cols):
```
             ╔════════════════════════════════════════════════════╗
             ║                     New Post                       ║
             ║                                                    ║
             ║              Check out this cool image!            ║
             ║  [Image rendered here]                             ║
             ╚════════════════════════════════════════════════════╝
```

**Example 2: Same Post on Mobile**

```typescript
const layout = calculateFrameLayout(50, 40, 'mobile')
// Result: { totalWidth: 40, contentWidth: 38, leftPadding: 0, centered: false }
```

**Output** (40 cols):
```
╔══════════════════════════════════════╗
║              New Post                ║
║                                      ║
║     Check out this cool image!       ║
║  [Image]                             ║
╚══════════════════════════════════════╝
```

**Example 3: Nested Frames (Character Sheet)**

```typescript
const outerLayout = calculateFrameLayout(60, 80, 'desktop')
const innerLayout = calculateNestedFrameLayout(outerLayout, 30)

// Outer frame
const outerContent = {
  lines: ['CHARACTER SHEET', ''],
  image: null
}

// Inner frames (stats, inventory)
const statsInnerContent = {
  lines: ['Level: 42', 'XP: 12,500 / 15,000'],
  image: null
}
```

**Output**:
```
          ╔══════════════════════════════════════════════════╗
          ║                 CHARACTER SHEET                  ║
          ║                                                  ║
          ║        ┌────────────────────────────┐            ║
          ║        │  Level: 42                 │            ║
          ║        │  XP: 12,500 / 15,000       │            ║
          ║        └────────────────────────────┘            ║
          ╚══════════════════════════════════════════════════╝
```

---

### Testability

All layout logic is **pure functions** (no side effects):

```typescript
describe('LayoutCalculator', () => {
  describe('calculateFrameLayout', () => {
    it('centers frame on desktop', () => {
      const layout = calculateFrameLayout(50, 80, 'desktop')
      expect(layout.totalWidth).toBe(54)
      expect(layout.leftPadding).toBe(13)  // (80 - 54) / 2
      expect(layout.centered).toBe(true)
    })

    it('uses full width on mobile', () => {
      const layout = calculateFrameLayout(50, 40, 'mobile')
      expect(layout.totalWidth).toBe(40)
      expect(layout.leftPadding).toBe(0)
      expect(layout.centered).toBe(false)
    })

    it('respects max width on desktop', () => {
      const layout = calculateFrameLayout(100, 80, 'desktop')
      expect(layout.totalWidth).toBeLessThanOrEqual(70)  // Desktop max
    })
  })

  describe('centerTextInFrame', () => {
    it('centers short text', () => {
      const result = centerTextInFrame('Hello', 20)
      expect(result).toBe('       Hello        ')  // 7 left, 8 right
      expect(result.length).toBe(20)
    })

    it('truncates long text', () => {
      const result = centerTextInFrame('This is a very long line that exceeds the frame width', 20)
      expect(result.length).toBe(20)
      expect(result).toBe('This is a very long ')
    })
  })

  describe('calculateNestedFrameLayout', () => {
    it('centers inner frame within outer', () => {
      const outer = { totalWidth: 60, contentWidth: 58, leftPadding: 10, centered: true }
      const inner = calculateNestedFrameLayout(outer, 30)
      expect(inner.totalWidth).toBe(34)  // 30 + 4
      expect(inner.leftPadding).toBeGreaterThan(outer.leftPadding)
    })
  })
})
```

---

## Data Flow

### Input Flow
```
User Keypress
  ↓
InputBuffer.insertChar(char)
  ↓
CursorState.col++
  ↓
Re-render input line with cursor
```

### Output Flow
```
Write ANSI text
  ↓
ANSIParser.parse(text) → TerminalCell[]
  ↓
Wrap cells into TerminalLine[]
  ↓
ScrollBuffer.append(line)
  ↓
Update ViewportState if needed
  ↓
Render visible range only
```

### Scroll Flow
```
User scrolls
  ↓
ViewportState.scrollY updates
  ↓
calculateVisibleRange() → { start, end }
  ↓
ScrollBuffer.getVisibleRange(start, end)
  ↓
Re-render visible lines + images
```

### Responsive Resize Flow
```
Window resize / Orientation change
  ↓
Detect new viewport dimensions
  ↓
Determine breakpoint (mobile/tablet/desktop)
  ↓
Update ViewportState (cols, rows, fontSize, lineHeight)
  ↓
Reflow content to new terminal dimensions
  ↓
Recalculate image sizes for new breakpoint
  ↓
Re-render terminal with new layout
  ↓
Maintain scroll position relative to content
```

### Virtual Keyboard Flow (Mobile)
```
User taps input area
  ↓
Virtual keyboard appears
  ↓
visualViewport.height decreases
  ↓
Detect keyboard height (innerHeight - viewport.height)
  ↓
Adjust terminal container height
  ↓
Scroll input area into view if needed
  ↓
User dismisses keyboard
  ↓
Restore terminal to full height
```

### Frame Layout and Centering Flow
```
Content to display (post, character sheet, etc.)
  ↓
Determine content width (longest line, image width, etc.)
  ↓
Get current terminal dimensions (cols, rows, breakpoint)
  ↓
calculateFrameLayout(contentWidth, terminalCols, breakpoint)
  ↓
Determine frame width and centering offset
  ↓
Build frame with borders (renderFrame)
  ↓
For each content line:
  - centerTextInFrame(line, frameContentWidth)
  - Add left padding for frame centering
  - Wrap in vertical borders
  ↓
Convert frame lines to TerminalLine[]
  ↓
Append to ScrollBuffer
  ↓
Render visible portion
```

### Frame Resize Flow
```
Terminal resized (viewport width changes)
  ↓
New breakpoint detected (mobile/tablet/desktop)
  ↓
Get all frames in current view
  ↓
For each frame:
  - Recalculate layout with new terminal width
  - Preserve content, update dimensions and centering
  ↓
Re-render frames with new layout
  ↓
Update ScrollBuffer with new frame lines
  ↓
Maintain scroll position relative to content
```

---

## Performance Considerations

### Memory Usage

**Per TerminalCell**: ~100 bytes
```
char (2 bytes UTF-16) + fgColor (8 bytes ref) + bgColor (8 bytes ref) + 6 booleans (6 bytes) + object overhead (~80 bytes) ≈ 104 bytes
```

**Per TerminalLine**: ~8KB for 80 columns
```
80 cells × 100 bytes + metadata (~200 bytes) + array overhead ≈ 8,200 bytes
```

**Full Buffer**: ~82MB for 10,000 lines
```
10,000 lines × 8,200 bytes ≈ 82MB
```

**Optimization**: Use object pooling for TerminalCell to reduce allocations.

### Render Optimization

**Virtual Scrolling**: Only render visible lines + buffer
```
Viewport: 30 lines
Buffer: 50 lines above + 50 lines below
Total rendered: 130 lines (vs 10,000)
Render reduction: 98.7%
```

**React.memo**: Memoize TerminalLine components
```typescript
const TerminalLine = React.memo(({ line }: { line: TerminalLine }) => {
  // ... render logic
}, (prev, next) => prev.line.metadata.lineNumber === next.line.metadata.lineNumber)
```

---

## Migration Notes

### From xterm.js

**xterm.js Buffer → ScrollBuffer**:
```typescript
// Old (xterm.js)
const line = terminal.buffer.active.getLine(lineIndex)
const text = line.translateToString(true)

// New (custom)
const line = scrollBuffer.getLine(lineIndex)
const text = line.cells.map(cell => cell.char).join('')
```

**xterm.js Write → ANSIParser + ScrollBuffer**:
```typescript
// Old (xterm.js)
terminal.write('Hello \x1B[32mworld\x1B[0m')

// New (custom)
const cells = ansiParser.parse('Hello \x1B[32mworld\x1B[0m')
const lines = wrapCellsIntoLines(cells, 80) // 80 columns
lines.forEach(line => scrollBuffer.append(line))
```

---

## Validation & Testing

### Unit Test Coverage

- **TerminalCell**: Validate color parsing, boolean flags
- **ScrollBuffer**: Test circular wrapping, line retrieval, edge cases
- **InputBuffer**: Test insertion, deletion, cursor movement at boundaries
- **ANSIParser**: Test all SGR codes, partial sequences, state persistence
- **ViewportState**: Test scroll calculations, visible range edge cases

### Edge Cases

- Empty buffer (0 lines)
- Buffer exactly at capacity (10,000 lines)
- Buffer overflow (10,001+ lines, verify oldest discarded)
- Input at max length (2,000 chars)
- Cursor at line boundaries (col 0, col = line.length)
- Scroll at top (scrollY = 0)
- Scroll at bottom (scrollY = maxScroll)
- Very long lines (> terminal width, verify wrapping)
- Image with no dimensions (verify defaults)
- Invalid ANSI codes (verify graceful handling)
