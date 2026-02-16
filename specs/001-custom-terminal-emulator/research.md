# Research: Custom Terminal Emulator

**Feature**: 001-custom-terminal-emulator
**Date**: 2026-02-15
**Status**: Complete

## Overview

This document consolidates research findings for building a custom terminal emulator to replace xterm.js, focusing on rendering approaches, buffer architecture, ANSI parsing, image integration, and input handling.

---

## 1. Rendering Approach: DOM vs. Canvas vs. Hybrid

### Decision: **DOM-based Character Grid**

**Rationale**:
- **Accessibility**: DOM text is selectable, searchable, and screen-reader compatible (canvas is not)
- **Image Integration**: Inline `<img>` tags can be inserted directly into the DOM flow, eliminating overlay positioning complexity
- **Simplicity**: React can manage character cells as components with standard CSS styling
- **Debugging**: Inspect element tools work natively for troubleshooting layout issues
- **Text Selection**: Browser's built-in selection API works automatically (canvas requires custom implementation)

**Implementation Approach**:
```tsx
<div className="terminal-line" data-line={lineNumber}>
  {line.cells.map((cell, col) => (
    <span
      key={col}
      className={cell.classNames}
      style={{ color: cell.fgColor, backgroundColor: cell.bgColor }}
    >
      {cell.char}
    </span>
  ))}
  {line.image && <img src={line.image.url} alt={line.image.alt} className="inline-image" />}
</div>
```

**Performance Considerations**:
- **React.memo()** on TerminalLine components to prevent unnecessary re-renders
- **Virtual scrolling** for off-screen lines (only render visible viewport + 50-line buffer)
- **requestAnimationFrame** for scroll updates to maintain 60fps
- **CSS containment** (`contain: layout style paint`) for paint optimization

**Alternatives Considered**:

| Approach | Pros | Cons | Rejected Because |
|----------|------|------|------------------|
| Canvas | Fast rendering, pixel-perfect control | No accessibility, complex text selection, no inline images | Fails accessibility requirement |
| Hybrid (Canvas text + DOM images) | Performance + image support | Coordinate sync complexity, no text selection | Doesn't solve original alignment problem |
| WebGL | Maximum performance | Overkill complexity, no semantic HTML | Not needed for ~10K line buffer |

---

## 2. Scroll Buffer Architecture: Circular Buffer vs. Virtual Scrolling

### Decision: **Circular Buffer + Virtual Scrolling Hybrid**

**Rationale**:
- **Circular buffer** maintains the last 10,000 lines in memory without expensive array shifting
- **Virtual scrolling** renders only visible lines + 50-line buffer for scroll momentum
- **Best of both**: Memory efficiency (buffer cap) + render efficiency (viewport only)

**Buffer Structure**:
```typescript
class CircularScrollBuffer {
  private buffer: TerminalLine[] = []
  private head: number = 0
  private size: number = 10000  // Max lines

  append(line: TerminalLine): void {
    this.buffer[this.head % this.size] = line
    this.head++
  }

  getLine(index: number): TerminalLine | null {
    const offset = index - Math.max(0, this.head - this.size)
    if (offset < 0 || offset >= this.size) return null
    return this.buffer[(this.head - this.size + offset) % this.size] || null
  }

  getVisibleRange(scrollTop: number, viewportHeight: number): TerminalLine[] {
    const startLine = Math.floor(scrollTop / LINE_HEIGHT)
    const endLine = Math.ceil((scrollTop + viewportHeight) / LINE_HEIGHT) + 50 // Buffer
    return this.getRange(startLine, endLine)
  }
}
```

**Scrolling Strategy**:
- **Scroll offset**: Track `scrollY` position in pixels
- **Line mapping**: `scrollY / lineHeight = currentLine`
- **Render window**: Render lines [currentLine - 50] to [currentLine + viewportLines + 50]
- **Absolute positioning**: Each line positioned at `top: lineIndex * lineHeight`

**Performance**:
- **Append**: O(1) - no array shifting
- **Get line**: O(1) - direct index calculation
- **Render**: O(visible lines) - typically 30-50 lines, not 10,000

**Alternatives Considered**:

| Approach | Pros | Cons | Rejected Because |
|----------|------|------|------------------|
| Array with splice() | Simple to understand | O(n) on every append, slow for 10K lines | Unacceptable performance |
| Linked list | O(1) append/prepend | O(n) random access, memory overhead | Need fast line lookups for scroll |
| React Window library | Mature virtual scrolling | External dependency, less control | Want zero deps for custom control |

---

## 3. ANSI Parsing Strategy: Stateful Parser vs. Regex-based

### Decision: **Stateful Parser with Incremental Processing**

**Rationale**:
- **Correct state tracking**: ANSI formatting persists across lines (bold starts in line 5, ends in line 10)
- **Partial sequence handling**: `write("\x1B")` followed by `write("[32m")` must parse correctly
- **Performance**: Single-pass parsing without backtracking
- **Maintainability**: Clear state machine easier to debug than complex regex

**Parser Design**:
```typescript
class ANSIParser {
  private state: 'TEXT' | 'ESCAPE' | 'CSI' = 'TEXT'
  private params: number[] = []
  private currentParam: string = ''

  private formatState: {
    fgColor: string | null
    bgColor: string | null
    bold: boolean
    italic: boolean
    underline: boolean
  } = { fgColor: null, bgColor: null, bold: false, italic: false, underline: false }

  parse(input: string): TerminalCell[] {
    const cells: TerminalCell[] = []

    for (const char of input) {
      switch (this.state) {
        case 'TEXT':
          if (char === '\x1B') {
            this.state = 'ESCAPE'
          } else if (char === '\r') {
            // Carriage return - ignore or handle
          } else if (char === '\n') {
            cells.push({ char: '\n', ...this.formatState })
          } else {
            cells.push({ char, ...this.formatState })
          }
          break

        case 'ESCAPE':
          if (char === '[') {
            this.state = 'CSI'
            this.params = []
            this.currentParam = ''
          } else {
            this.state = 'TEXT'
          }
          break

        case 'CSI':
          if (char >= '0' && char <= '9') {
            this.currentParam += char
          } else if (char === ';') {
            this.params.push(parseInt(this.currentParam) || 0)
            this.currentParam = ''
          } else if (char === 'm') {
            this.params.push(parseInt(this.currentParam) || 0)
            this.applyFormat(this.params)
            this.state = 'TEXT'
          } else {
            // Invalid sequence, return to TEXT
            this.state = 'TEXT'
          }
          break
      }
    }

    return cells
  }

  private applyFormat(params: number[]): void {
    for (const param of params) {
      if (param === 0) {
        // Reset all
        this.formatState = { fgColor: null, bgColor: null, bold: false, italic: false, underline: false }
      } else if (param === 1) {
        this.formatState.bold = true
      } else if (param >= 30 && param <= 37) {
        this.formatState.fgColor = ANSI_COLORS[param - 30]
      } else if (param >= 40 && param <= 47) {
        this.formatState.bgColor = ANSI_COLORS[param - 40]
      }
      // ... more codes
    }
  }
}
```

**Supported ANSI Codes**:
- **Colors**: 30-37 (foreground), 40-47 (background), 90-97 (bright foreground), 100-107 (bright background)
- **Formatting**: 1 (bold), 2 (dim), 3 (italic), 4 (underline), 7 (reverse), 8 (hidden)
- **Reset**: 0 (reset all)

**Alternatives Considered**:

| Approach | Pros | Cons | Rejected Because |
|----------|------|------|------------------|
| Regex matching | Simple one-liners | Can't handle partial sequences, no state | Fails on split write() calls |
| Existing library (ansi-to-html) | Mature, tested | External dep, outputs HTML strings not cells | Need cell-level control for rendering |
| No parsing (raw escape codes) | Zero complexity | Terminal looks broken, no colors | Not acceptable UX |

---

## 4. Image Integration: Inline Slots vs. Overlay Positioning

### Decision: **Inline Image Slots in DOM Flow**

**Rationale**:
- **Zero coordinate translation**: Images flow naturally with text in DOM, no manual position calculation
- **Automatic scroll sync**: Browser scrolls images with text container automatically
- **Simplified state**: No overlay component tracking buffer line numbers and scroll offsets
- **Resize handling**: Images reflow automatically on terminal resize

**Implementation Approach**:
```typescript
interface TerminalLine {
  cells: TerminalCell[]
  image?: { url: string; alt: string; id: string } | null
  metadata: { lineNumber: number; timestamp: number }
}

// In rendering:
<div className="terminal-line">
  {line.cells.map(cell => <span>{cell.char}</span>)}
  {line.image && (
    <img
      src={line.image.url}
      alt={line.image.alt}
      className="terminal-inline-image"
      loading="lazy"
    />
  )}
</div>
```

**Image Detection**:
- Parse `[IMG:url:alt]` markers during ANSI parsing
- Remove marker from visible output
- Attach image metadata to corresponding TerminalLine
- Render inline `<img>` tag at end of line

**CSS Styling**:
```css
.terminal-inline-image {
  display: block;
  max-width: 600px; /* Desktop */
  max-height: 350px; /* Matches reserved space */
  margin: 10px 0;
  border: 2px solid var(--terminal-accent);
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
  object-fit: contain;
}

@media (max-width: 640px) {
  .terminal-inline-image {
    max-width: 280px;
    max-height: 150px;
  }
}
```

**Alternatives Considered**:

| Approach | Pros | Cons | Rejected Because |
|----------|------|------|------------------|
| Overlay positioning (current xterm.js) | Doesn't disrupt text flow | Complex coordinate sync, drift issues | Original problem we're solving |
| Canvas rendering | Pixel-perfect control | Can't use browser image loading, no lazy load | Complexity + no browser optimizations |
| Separate image section | Simple implementation | Not inline with content | Fails UX requirement |

---

## 5. Input Handling: Character Echo vs. Line Buffering

### Decision: **Character Echo with Local Input Buffer**

**Rationale**:
- **Terminal fidelity**: Real terminals echo each character immediately (not line-buffered)
- **Cursor positioning**: Supports arrow key movement to any position in input line
- **Insert mode**: Characters insert at cursor position, not just append
- **Visual feedback**: User sees exactly what they're typing as they type it

**Input Flow**:
```
1. User presses key
2. KeyboardEvent captured by onKeyDown handler
3. Key processed based on type:
   - Printable char → Insert at cursor position, echo to screen
   - Arrow key → Move cursor, update visual position
   - Backspace → Delete before cursor, redraw line
   - Enter → Submit command, clear input buffer
   - Ctrl+key → Execute shortcut (clear line, clear screen, etc.)
4. Update input buffer state
5. Re-render input line with cursor position
```

**State Structure**:
```typescript
interface InputState {
  buffer: string          // Current command being typed
  cursorPosition: number  // Index in buffer (0 to buffer.length)
  history: string[]       // Past commands (max 100)
  historyIndex: number    // -1 = not navigating, 0+ = history position
}
```

**Input Handler**:
```typescript
function handleKeyDown(event: KeyboardEvent): void {
  const key = event.key

  if (key === 'Enter') {
    submitCommand(inputState.buffer)
    setInputState({ buffer: '', cursorPosition: 0, history: [inputState.buffer, ...inputState.history] })
  } else if (key === 'ArrowLeft') {
    if (inputState.cursorPosition > 0) {
      setInputState({ ...inputState, cursorPosition: inputState.cursorPosition - 1 })
    }
  } else if (key === 'ArrowRight') {
    if (inputState.cursorPosition < inputState.buffer.length) {
      setInputState({ ...inputState, cursorPosition: inputState.cursorPosition + 1 })
    }
  } else if (key === 'Backspace') {
    if (inputState.cursorPosition > 0) {
      const before = inputState.buffer.slice(0, inputState.cursorPosition - 1)
      const after = inputState.buffer.slice(inputState.cursorPosition)
      setInputState({ buffer: before + after, cursorPosition: inputState.cursorPosition - 1 })
    }
  } else if (key.length === 1 && !event.ctrlKey && !event.metaKey) {
    const before = inputState.buffer.slice(0, inputState.cursorPosition)
    const after = inputState.buffer.slice(inputState.cursorPosition)
    setInputState({ buffer: before + key + after, cursorPosition: inputState.cursorPosition + 1 })
  }
  // ... more key handlers
}
```

**Cursor Rendering**:
```tsx
<div className="terminal-input-line">
  <span className="prompt">{'> '}</span>
  {inputState.buffer.split('').map((char, index) => (
    <span
      key={index}
      className={index === inputState.cursorPosition ? 'cursor' : ''}
    >
      {char}
    </span>
  ))}
  {inputState.cursorPosition === inputState.buffer.length && (
    <span className="cursor"> </span>
  )}
</div>
```

**Alternatives Considered**:

| Approach | Pros | Cons | Rejected Because |
|----------|------|------|------------------|
| Line buffering (like HTML input) | Simple implementation | No cursor positioning, not terminal-like | Fails terminal fidelity requirement |
| Contenteditable div | Browser handles cursor | Complex state sync, hard to control | Unpredictable behavior, style conflicts |
| Hidden input + overlay cursor | Familiar HTML input | Visual cursor desyncs, accessibility issues | Not reliable for terminal UX |

---

## 6. Responsive Design Strategy: Fixed Breakpoints vs. Container Queries vs. Fluid Scaling

### Decision: **Fixed Breakpoints with Media Queries**

**Rationale**:
- **Predictable behavior**: Three clear breakpoints (mobile/tablet/desktop) make testing and debugging straightforward
- **Browser support**: Media queries work everywhere, container queries still have limited support
- **Performance**: No runtime calculations needed, CSS handles all sizing
- **Design consistency**: Matches existing responsive patterns in project (terminal-responsive.ts)

**Implementation Approach**:

**Breakpoint Configuration**:
```typescript
// frontend/src/utils/terminal-responsive.ts (existing file)
export const BREAKPOINTS = {
  mobile: { max: 640, fontSize: 10, cols: 40, rows: 24, imageMaxWidth: 280, imageMaxHeight: 150 },
  tablet: { min: 641, max: 1024, fontSize: 12, cols: 60, rows: 28, imageMaxWidth: 400, imageMaxHeight: 240 },
  desktop: { min: 1025, fontSize: 14, cols: 80, rows: 30, imageMaxWidth: 600, imageMaxHeight: 350 }
}

export function getCurrentBreakpoint(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width <= BREAKPOINTS.mobile.max) return 'mobile'
  if (width <= BREAKPOINTS.tablet.max) return 'tablet'
  return 'desktop'
}
```

**CSS Media Queries**:
```css
/* Mobile: ≤640px */
@media (max-width: 640px) {
  .terminal-container {
    font-size: 10px;
    line-height: 1.2;
  }

  .terminal-inline-image {
    max-width: 280px;
    max-height: 150px;
  }

  /* Account for safe area on notched devices */
  .terminal-wrapper {
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }

  /* Handle dynamic viewport height (mobile browser bars) */
  .terminal-scroll-container {
    height: calc(100vh - 60px);
    height: -webkit-fill-available;
  }
}

/* Tablet: 641-1024px */
@media (min-width: 641px) and (max-width: 1024px) {
  .terminal-container {
    font-size: 12px;
    line-height: 1.2;
  }

  .terminal-inline-image {
    max-width: 400px;
    max-height: 240px;
  }
}

/* Desktop: >1024px */
@media (min-width: 1025px) {
  .terminal-container {
    font-size: 14px;
    line-height: 1.2;
  }

  .terminal-inline-image {
    max-width: 600px;
    max-height: 350px;
  }
}

/* Ultra-wide: >2000px - prevent excessive stretching */
@media (min-width: 2001px) {
  .terminal-wrapper {
    max-width: 1800px;
    margin: 0 auto;
  }
}
```

**React Component Adaptation**:
```typescript
function CustomTerminalCore() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const [terminalDimensions, setTerminalDimensions] = useState({ cols: 80, rows: 30, fontSize: 14 })

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const newBreakpoint = getCurrentBreakpoint(width)
      const config = BREAKPOINTS[newBreakpoint]

      setBreakpoint(newBreakpoint)
      setTerminalDimensions({
        cols: config.cols,
        rows: config.rows,
        fontSize: config.fontSize
      })
    }

    handleResize() // Initial calculation
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ... use terminalDimensions for rendering
}
```

**Touch vs Mouse Input Detection**:
```typescript
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

// Conditional event handlers
const scrollHandler = isTouchDevice
  ? handleTouchScroll  // Use touch events with momentum
  : handleMouseScroll  // Use wheel events

const inputHandler = isTouchDevice
  ? handleVirtualKeyboard  // Show virtual keyboard
  : handlePhysicalKeyboard // Use keydown events
```

**Virtual Keyboard Handling (Mobile)**:
```typescript
// Detect keyboard open/close on mobile
useEffect(() => {
  const handleVisualViewportResize = () => {
    const viewport = window.visualViewport
    if (viewport) {
      const keyboardHeight = window.innerHeight - viewport.height
      setKeyboardOpen(keyboardHeight > 100)

      // Adjust terminal container to remain visible above keyboard
      if (keyboardHeight > 100) {
        setTerminalHeight(`calc(100vh - ${keyboardHeight}px)`)
      }
    }
  }

  window.visualViewport?.addEventListener('resize', handleVisualViewportResize)
  return () => window.visualViewport?.removeEventListener('resize', handleVisualViewportResize)
}, [])
```

**Safe Area Insets (iPhone X+)**:
```css
.terminal-wrapper {
  /* Respect notch and home indicator */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Full-screen mode support */
@supports (padding: env(safe-area-inset-top)) {
  .terminal-wrapper.fullscreen {
    padding-top: max(20px, env(safe-area-inset-top));
  }
}
```

**Orientation Change Handling**:
```typescript
useEffect(() => {
  const handleOrientationChange = () => {
    // Wait for resize to complete (iOS Safari delay)
    setTimeout(() => {
      const width = window.innerWidth
      const newBreakpoint = getCurrentBreakpoint(width)

      // Recalculate terminal dimensions
      updateTerminalDimensions(newBreakpoint)

      // Reflow content to new dimensions
      reflowContent()
    }, 100)
  }

  window.addEventListener('orientationchange', handleOrientationChange)
  return () => window.removeEventListener('orientationchange', handleOrientationChange)
}, [])
```

**Performance Considerations**:

**Debounce Resize Events**:
```typescript
const debouncedResize = useMemo(
  () => debounce((width: number) => {
    const newBreakpoint = getCurrentBreakpoint(width)
    updateTerminalDimensions(newBreakpoint)
  }, 150),
  []
)

useEffect(() => {
  const handleResize = () => debouncedResize(window.innerWidth)
  window.addEventListener('resize', handleResize)
  return () => {
    window.removeEventListener('resize', handleResize)
    debouncedResize.cancel()
  }
}, [debouncedResize])
```

**Responsive Image Loading**:
```typescript
function getImageDimensions(breakpoint: 'mobile' | 'tablet' | 'desktop'): ImageDimensions {
  return {
    mobile: { maxWidth: 280, maxHeight: 150 },
    tablet: { maxWidth: 400, maxHeight: 240 },
    desktop: { maxWidth: 600, maxHeight: 350 }
  }[breakpoint]
}

// Render images with responsive sizing
<img
  src={imageUrl}
  alt={imageAlt}
  style={{
    maxWidth: `${imageDimensions.maxWidth}px`,
    maxHeight: `${imageDimensions.maxHeight}px`,
    objectFit: 'contain'
  }}
  loading="lazy"
/>
```

**Alternatives Considered**:

| Approach | Pros | Cons | Rejected Because |
|----------|------|------|------------------|
| Container queries | More flexible, component-scoped | Limited browser support, not in project | Browser support too new, adds complexity |
| Fluid scaling (vw/vh) | Smooth scaling across all sizes | Unpredictable text sizes, hard to test | Terminal needs fixed char widths |
| JavaScript-only sizing | Full control, dynamic | Performance overhead, layout shift | CSS media queries are faster |
| Single responsive layout | Simplest approach | Poor UX on mobile (text too small) | Fails mobile usability requirement |

**Device-Specific Edge Cases**:

**Mobile Safari Dynamic Viewport**:
- Use `-webkit-fill-available` for height to account for address bar
- Use `visualViewport` API to detect keyboard open/close
- Add 100ms delay after orientation change for Safari rendering

**Android Chrome Bottom Bar**:
- Use `100vh` with fallback to `100dvh` (dynamic viewport height)
- Detect bottom sheet interactions via viewport resize

**iPad Split Screen**:
- Treat split-screen iPad as tablet breakpoint even if narrow
- Detect via `navigator.maxTouchPoints > 1` + width combination

**Foldable Devices (Samsung Galaxy Fold)**:
- Use standard breakpoints, let device handle fold orientation
- Test at both folded (smaller) and unfolded (tablet) sizes

---

## 7. ASCII Frame Layout Strategy: Dynamic Centering vs. Fixed Positioning

### Decision: **Dynamic Centering with Responsive Width Calculation**

**Rationale**:
- **Context**: This is a social media app simulated in a terminal using MUD-like UI with ASCII frames (borders made with `####`, `=====`, `╔══╗`)
- **User expectation**: Frames should center on desktop (visual balance) but fill width on mobile (maximize space)
- **Maintainability**: Centralized layout calculations make it easy to adjust frame sizing
- **Testability**: Pure functions for centering enable comprehensive unit tests

**Implementation Approach**:

**Frame Layout Model**:
```typescript
interface FrameLayout {
  totalWidth: number          // Frame width in columns (including borders)
  contentWidth: number        // Inner width (for text/images)
  leftPadding: number         // Spaces before frame for centering
  borderStyle: FrameBorderStyle
  centered: boolean           // True if frame should center
}

interface FrameBorderStyle {
  topLeft: string             // e.g., '╔' or '┌' or '#'
  topRight: string            // e.g., '╗' or '┐' or '#'
  bottomLeft: string          // e.g., '╚' or '└' or '#'
  bottomRight: string         // e.g., '╝' or '┘' or '#'
  horizontal: string          // e.g., '═' or '─' or '='
  vertical: string            // e.g., '║' or '│' or '|'
}
```

**Layout Calculation Logic**:
```typescript
/**
 * Calculate frame layout based on terminal width and content
 */
function calculateFrameLayout(
  contentWidth: number,
  terminalCols: number,
  breakpoint: 'mobile' | 'tablet' | 'desktop'
): FrameLayout {
  // On mobile, use full width
  if (breakpoint === 'mobile') {
    const frameWidth = terminalCols
    const innerWidth = frameWidth - 2  // -2 for left/right borders
    return {
      totalWidth: frameWidth,
      contentWidth: innerWidth,
      leftPadding: 0,
      centered: false
    }
  }

  // On tablet/desktop, center with max width
  const maxFrameWidth = breakpoint === 'tablet' ? 50 : 70
  const frameWidth = Math.min(contentWidth + 4, maxFrameWidth, terminalCols)  // +4 for borders and padding
  const leftPadding = Math.floor((terminalCols - frameWidth) / 2)
  const innerWidth = frameWidth - 2

  return {
    totalWidth: frameWidth,
    contentWidth: innerWidth,
    leftPadding: Math.max(0, leftPadding),
    centered: true
  }
}
```

**Frame Rendering with Centering**:
```typescript
function renderFrame(layout: FrameLayout, content: string[], borderStyle: FrameBorderStyle): string[] {
  const lines: string[] = []
  const padding = ' '.repeat(layout.leftPadding)

  // Top border
  const topBorder = borderStyle.topLeft + borderStyle.horizontal.repeat(layout.totalWidth - 2) + borderStyle.topRight
  lines.push(padding + topBorder)

  // Content lines (centered within frame)
  for (const contentLine of content) {
    const centeredContent = centerTextInFrame(contentLine, layout.contentWidth)
    const framedLine = borderStyle.vertical + centeredContent + borderStyle.vertical
    lines.push(padding + framedLine)
  }

  // Bottom border
  const bottomBorder = borderStyle.bottomLeft + borderStyle.horizontal.repeat(layout.totalWidth - 2) + borderStyle.bottomRight
  lines.push(padding + bottomBorder)

  return lines
}

function centerTextInFrame(text: string, frameWidth: number): string {
  const textLength = text.length
  if (textLength >= frameWidth) {
    return text.substring(0, frameWidth)  // Truncate if too long
  }

  const totalPadding = frameWidth - textLength
  const leftPadding = Math.floor(totalPadding / 2)
  const rightPadding = totalPadding - leftPadding

  return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding)
}
```

**Responsive Frame Example**:

**Desktop (80 cols)**:
```
                    ╔════════════════════════════╗
                    ║       New Post             ║
                    ║                            ║
                    ║  Check out this image!     ║
                    ║  [Image centered here]     ║
                    ╚════════════════════════════╝
                    (centered with 26 left padding)
```

**Tablet (60 cols)**:
```
          ╔════════════════════════════╗
          ║       New Post             ║
          ║                            ║
          ║  Check out this image!     ║
          ║  [Image centered here]     ║
          ╚════════════════════════════╝
          (centered with 15 left padding)
```

**Mobile (40 cols)**:
```
╔══════════════════════════════════════╗
║       New Post                       ║
║                                      ║
║  Check out this image!               ║
║  [Image here]                        ║
╚══════════════════════════════════════╝
(full width, no padding)
```

**Nested Frame Support**:
```typescript
function renderNestedFrame(outerLayout: FrameLayout, innerContentWidth: number): FrameLayout {
  // Calculate inner frame layout relative to outer frame's content width
  const innerFrameWidth = Math.min(innerContentWidth + 4, outerLayout.contentWidth)
  const innerLeftPadding = Math.floor((outerLayout.contentWidth - innerFrameWidth) / 2)

  return {
    totalWidth: innerFrameWidth,
    contentWidth: innerFrameWidth - 2,
    leftPadding: outerLayout.leftPadding + innerLeftPadding + 1,  // +1 for outer border
    centered: true
  }
}
```

**Example: Character Sheet with Nested Frames**:
```
Desktop (80 cols):
              ╔════════════════════════════════════════╗
              ║           CHARACTER SHEET              ║
              ║                                        ║
              ║    ┌────────────────────────┐          ║
              ║    │  Level: 42             │          ║
              ║    │  XP: 12,500 / 15,000   │          ║
              ║    └────────────────────────┘          ║
              ║                                        ║
              ║    ┌────────────────────────┐          ║
              ║    │  Strength: 18          │          ║
              ║    │  Dexterity: 14         │          ║
              ║    └────────────────────────┘          ║
              ╚════════════════════════════════════════╝
```

**Resize Behavior**:
```typescript
function handleTerminalResize(
  existingFrames: FrameLayout[],
  newTerminalCols: number,
  newBreakpoint: 'mobile' | 'tablet' | 'desktop'
): FrameLayout[] {
  // Recalculate all frame layouts with new terminal width
  return existingFrames.map(frame => {
    const contentWidth = frame.contentWidth
    return calculateFrameLayout(contentWidth, newTerminalCols, newBreakpoint)
  })
}
```

**Performance Considerations**:

**Memoization**:
```typescript
// Cache layout calculations to avoid recomputation
const layoutCache = new Map<string, FrameLayout>()

function getCachedLayout(
  contentWidth: number,
  terminalCols: number,
  breakpoint: string
): FrameLayout {
  const key = `${contentWidth}-${terminalCols}-${breakpoint}`
  if (layoutCache.has(key)) {
    return layoutCache.get(key)!
  }

  const layout = calculateFrameLayout(contentWidth, terminalCols, breakpoint)
  layoutCache.set(key, layout)
  return layout
}
```

**Incremental Updates**:
- Only recalculate frames in visible viewport (virtual scrolling)
- Batch resize operations with debouncing (150ms)
- Use requestAnimationFrame for smooth transitions

**Alternatives Considered**:

| Approach | Pros | Cons | Rejected Because |
|----------|------|------|------------------|
| Fixed-width frames | Simple, predictable | Doesn't adapt to viewport, breaks on mobile | Fails responsive requirement |
| CSS centering (text-align) | Browser handles it | Can't use CSS with character-based rendering | Terminal is character grid, not HTML |
| Absolute positioning (chars) | Precise control | Complex math, breaks on resize | Dynamic calculation is simpler |
| Server-side rendering | Pre-calculated layouts | Can't adapt to client viewport changes | Terminal is client-side only |

**Testability**:

All layout logic is **pure functions** (no side effects), making it 100% testable:

```typescript
describe('calculateFrameLayout', () => {
  it('centers frame on desktop', () => {
    const layout = calculateFrameLayout(50, 80, 'desktop')
    expect(layout.totalWidth).toBe(54)  // 50 + 4 for borders/padding
    expect(layout.leftPadding).toBe(13)  // (80 - 54) / 2
    expect(layout.centered).toBe(true)
  })

  it('uses full width on mobile', () => {
    const layout = calculateFrameLayout(50, 40, 'mobile')
    expect(layout.totalWidth).toBe(40)
    expect(layout.leftPadding).toBe(0)
    expect(layout.centered).toBe(false)
  })

  it('handles nested frames correctly', () => {
    const outerLayout = calculateFrameLayout(60, 80, 'desktop')
    const innerLayout = renderNestedFrame(outerLayout, 30)
    expect(innerLayout.leftPadding).toBeGreaterThan(outerLayout.leftPadding)
  })
})
```

---

## Summary of Decisions

| Research Area | Decision | Rationale |
|---------------|----------|-----------|
| **Rendering** | DOM-based character grid | Accessibility, image integration, text selection |
| **Buffer** | Circular buffer + virtual scrolling | Memory cap + render efficiency |
| **ANSI Parsing** | Stateful incremental parser | Correct state tracking, handles partial sequences |
| **Images** | Inline DOM slots in line flow | Zero coordinate math, automatic scroll sync |
| **Input** | Character echo with local buffer | Terminal fidelity, cursor positioning support |
| **Responsive** | Fixed breakpoints with media queries | Predictable behavior, browser support, performance |
| **Layout** | Dynamic centering with responsive width | Pure functions, testable, adapts to breakpoints |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| DOM rendering slower than canvas | Medium | Medium | Virtual scrolling, React.memo, CSS containment |
| Circular buffer bugs | Low | High | Comprehensive unit tests, edge case coverage |
| ANSI parser edge cases | Medium | Medium | Test against xterm.js output, reference implementation |
| Image loading delays | Low | Low | Lazy loading, placeholder rendering |
| Input lag on mobile | Medium | High | Debounce non-critical updates, optimize re-renders |

---

## Next Steps

1. ✅ Research complete
2. ⏭️ Design data models (data-model.md)
3. ⏭️ Create quickstart guide (quickstart.md)
4. ⏭️ Begin implementation with TerminalCell/Line structures
