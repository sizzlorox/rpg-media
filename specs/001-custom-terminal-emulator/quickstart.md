# Developer Quickstart: Custom Terminal Emulator

**Feature**: 001-custom-terminal-emulator | **Date**: 2026-02-15
**Target Audience**: Frontend developers working on terminal components
**Time to Complete**: 30 minutes

---

## Overview

This guide helps you understand and contribute to the custom terminal emulator that replaces xterm.js. You'll learn the architecture, key components, and how to make common changes.

**What this terminal does**:
- Renders text character-by-character in a DOM-based grid
- Parses ANSI escape codes for colors and formatting
- Handles keyboard input with cursor positioning and line editing
- Renders images inline with text content
- Scrolls smoothly with a 10,000-line buffer

**Why we built it**:
- xterm.js uses canvas rendering which makes inline image positioning complex
- Need pixel-perfect image alignment that scrolls with text
- Want full control over rendering and input handling
- Improve accessibility and text selection

---

## Quick Start

### Prerequisites

```bash
# Ensure you have the project cloned
cd /path/to/rpg-media

# Install dependencies
cd frontend && npm install
cd ../worker && npm install
```

### File Locations

```text
frontend/src/
├── components/
│   ├── Terminal.tsx                      # Main integration component
│   └── terminal/
│       ├── CustomTerminalCore.tsx        # Core terminal renderer
│       ├── TerminalRenderer.tsx          # DOM character grid
│       ├── TerminalScrollBuffer.tsx      # Line buffer manager
│       ├── TerminalInputHandler.tsx      # Keyboard input
│       ├── TerminalANSIParser.tsx        # ANSI code parser
│       └── TerminalImageManager.tsx      # Image positioning
├── utils/
│   ├── terminal-cell.ts                  # Cell data structures
│   ├── ansi-parser.ts                    # ANSI parsing logic
│   ├── ansi-colors.ts                    # Color helpers (existing)
│   └── terminal-responsive.ts            # Breakpoints (existing)
└── types/
    └── terminal.ts                       # TypeScript definitions
```

### Running the Terminal

```bash
# Start frontend dev server
cd frontend
npm run dev
# Open http://localhost:5173

# Start backend (separate terminal)
cd worker
wrangler dev
```

The terminal appears on the homepage. Type `/help` to see available commands.

---

## Architecture Overview

### Component Hierarchy

```
Terminal.tsx (integration layer)
  ↓
CustomTerminalCore.tsx (orchestration)
  ├── TerminalRenderer.tsx (visual output)
  ├── TerminalScrollBuffer.tsx (line storage)
  ├── TerminalInputHandler.tsx (keyboard events)
  ├── TerminalANSIParser.tsx (text parsing)
  └── TerminalImageManager.tsx (image positioning)
```

### Data Flow

**Input Flow**:
```
User types "h" → TerminalInputHandler.onKeyDown → InputBuffer.insertChar('h')
→ CursorState.col++ → TerminalRenderer re-renders input line
```

**Output Flow**:
```
Command response → ANSIParser.parse() → TerminalCell[]
→ TerminalLine[] → ScrollBuffer.append() → TerminalRenderer renders visible lines
```

**Scroll Flow**:
```
User scrolls → ViewportState.scrollY updates → calculateVisibleRange()
→ ScrollBuffer.getVisibleRange() → TerminalRenderer re-renders visible lines
```

---

## Key Concepts

### 1. Terminal Cell

A **TerminalCell** represents one character with its formatting:

```typescript
interface TerminalCell {
  char: string          // Single character
  fgColor: string | null
  bgColor: string | null
  bold: boolean
  italic: boolean
  underline: boolean
  // ...more flags
}
```

**Example**:
```typescript
// Bold green "A"
const cell: TerminalCell = {
  char: 'A',
  fgColor: '#00FF00',
  bgColor: null,
  bold: true,
  italic: false,
  underline: false,
  dim: false,
  inverse: false,
  hidden: false
}
```

### 2. Terminal Line

A **TerminalLine** is an array of cells representing one row:

```typescript
interface TerminalLine {
  cells: TerminalCell[]
  image: ImageSlot | null
  metadata: {
    lineNumber: number
    timestamp: number
    wrapped: boolean
  }
}
```

**Example**:
```typescript
const line: TerminalLine = {
  cells: [
    { char: '>', fgColor: '#00FF00', ... },
    { char: ' ', fgColor: null, ... },
    { char: 'H', fgColor: '#FFFFFF', ... },
    { char: 'i', fgColor: '#FFFFFF', ... },
  ],
  image: null,
  metadata: { lineNumber: 42, timestamp: Date.now(), wrapped: false }
}
```

### 3. Scroll Buffer

The **ScrollBuffer** stores lines in a circular buffer (10,000 max):

```typescript
class CircularScrollBuffer {
  append(line: TerminalLine): void    // Add line (O(1))
  getLine(index: number): TerminalLine | null  // Get line (O(1))
  getVisibleRange(start: number, end: number): TerminalLine[]
}
```

**Why circular?** Prevents expensive array shifting when buffer is full.

### 4. ANSI Parser

The **ANSIParser** converts ANSI escape codes to TerminalCells:

```typescript
const parser = new ANSIParser()
const cells = parser.parse('Hello \x1B[32mworld\x1B[0m')
// Result: "Hello " (default) + "world" (green)
```

**Supported codes**:
- Colors: `\x1B[30-37m` (foreground), `\x1B[40-47m` (background)
- Formatting: `\x1B[1m` (bold), `\x1B[3m` (italic), `\x1B[4m` (underline)
- Reset: `\x1B[0m`

### 5. Virtual Scrolling

Only visible lines are rendered:

```typescript
const viewport = {
  scrollY: 1000,
  viewportHeight: 600,
  lineHeight: 20
}

// Visible: lines 50-80 (30 lines)
// Actually rendered: lines 0-130 (includes 50-line buffer)
// Not rendered: lines 131-10000
```

**Performance**: 98.7% fewer DOM nodes (130 vs 10,000 lines).

---

## Common Tasks

### Task 1: Add Support for a New ANSI Code

**Example**: Add support for `\x1B[9m` (strikethrough).

**1. Update TerminalCell interface** (`types/terminal.ts`):
```typescript
interface TerminalCell {
  // ... existing fields
  strikethrough: boolean  // NEW
}
```

**2. Update ANSIState** (`types/terminal.ts`):
```typescript
interface ANSIState {
  // ... existing fields
  strikethrough: boolean  // NEW
}
```

**3. Update ANSIParser** (`utils/ansi-parser.ts`):
```typescript
private applyFormat(params: number[]): void {
  for (const param of params) {
    // ... existing cases
    if (param === 9) {
      this.formatState.strikethrough = true
    } else if (param === 29) {
      this.formatState.strikethrough = false
    }
  }
}
```

**4. Update TerminalRenderer** (`components/terminal/TerminalRenderer.tsx`):
```typescript
<span
  className={cell.classNames}
  style={{
    color: cell.fgColor,
    backgroundColor: cell.bgColor,
    fontWeight: cell.bold ? 'bold' : 'normal',
    fontStyle: cell.italic ? 'italic' : 'normal',
    textDecoration: cell.underline || cell.strikethrough
      ? `${cell.underline ? 'underline' : ''} ${cell.strikethrough ? 'line-through' : ''}`.trim()
      : 'none'
  }}
>
  {cell.char}
</span>
```

**5. Test**:
```typescript
const parser = new ANSIParser()
const cells = parser.parse('Normal \x1B[9mStrikethrough\x1B[29m Normal')
// Verify cells[7-19] have strikethrough: true
```

---

### Task 2: Change Image Size Limits

**Goal**: Update mobile image max width from 280px to 320px.

**1. Update data-model.md** (documentation):
```markdown
**Responsive Sizing**:
- Mobile: maxWidth: 320px (was 280px), maxHeight: 150px
```

**2. Update TerminalImageManager** (`components/terminal/TerminalImageManager.tsx`):
```typescript
function getImageDimensions(breakpoint: 'mobile' | 'tablet' | 'desktop') {
  switch (breakpoint) {
    case 'mobile':
      return { maxWidth: 320, maxHeight: 150 }  // Changed from 280
    // ... other cases
  }
}
```

**3. Update CSS** (`styles/terminal.css`):
```css
@media (max-width: 640px) {
  .terminal-inline-image {
    max-width: 320px;  /* Changed from 280px */
    max-height: 150px;
  }
}
```

**4. Test at mobile breakpoint**:
```bash
# Open DevTools → Toggle device toolbar → iPhone 12 (390px width)
# Upload image, verify it displays at 320px max width
```

---

### Task 3: Add a Keyboard Shortcut

**Example**: Add Ctrl+D to delete word forward.

**1. Update TerminalInputHandler** (`components/terminal/TerminalInputHandler.tsx`):
```typescript
function handleKeyDown(event: KeyboardEvent): void {
  const key = event.key

  // ... existing cases

  if (event.ctrlKey && key === 'd') {
    event.preventDefault()
    deleteWordForward()  // NEW function
    return
  }
}

function deleteWordForward(): void {
  const buffer = inputState.buffer
  const cursor = inputState.cursorPosition

  // Find next word boundary
  let endPos = cursor
  while (endPos < buffer.length && buffer[endPos] !== ' ') {
    endPos++
  }

  // Delete from cursor to word boundary
  const before = buffer.slice(0, cursor)
  const after = buffer.slice(endPos)
  setInputState({ buffer: before + after, cursorPosition: cursor })
}
```

**2. Document in spec** (`spec.md`):
```markdown
- **Given** user types Ctrl+D, **When** executed, **Then** deletes word after cursor
```

**3. Test**:
```
Input: "hello world foo"
Cursor at: "hello w|orld foo" (after 'w')
Ctrl+D → "hello w foo" (deleted "orld")
```

---

### Task 4: Debug Scroll Position Issues

**Symptoms**: Images drift from text during scroll.

**Debug Steps**:

**1. Enable position logging** (`TerminalImageManager.tsx`):
```typescript
function calculateYPosition(lineNumber: number, scrollY: number): number {
  const yPos = (lineNumber * LINE_HEIGHT) - scrollY
  console.log('[Image Position]', { lineNumber, scrollY, yPos })
  return yPos
}
```

**2. Check viewport state** (`CustomTerminalCore.tsx`):
```typescript
useEffect(() => {
  console.log('[Viewport]', {
    scrollY: viewportState.scrollY,
    viewportHeight: viewportState.viewportHeight,
    lineHeight: viewportState.lineHeight
  })
}, [viewportState])
```

**3. Verify line numbers** (`TerminalScrollBuffer.tsx`):
```typescript
append(line: TerminalLine): void {
  console.log('[Buffer Append]', {
    lineNumber: line.metadata.lineNumber,
    hasImage: !!line.image,
    bufferLength: this.getLength()
  })
  // ... append logic
}
```

**4. Common issues**:
- **Image Y position not updating on scroll**: Check that scroll event listener is registered
- **Line numbers incorrect**: Verify buffer append sets lineNumber correctly
- **Scroll offset wrong**: Check viewportState.scrollY calculation

---

### Task 5: Add a New Command

**Example**: Add `/clear-history` command to wipe command history.

**This is NOT part of the terminal implementation** - commands are handled by `useTerminalCommands.ts` which exists outside the custom terminal. The terminal just handles input/output rendering.

**1. Update useTerminalCommands.ts** (`hooks/useTerminalCommands.ts`):
```typescript
const handleCommand = (input: string) => {
  // ... existing commands

  if (input === '/clear-history') {
    clearCommandHistory()
    return 'Command history cleared.\r\n'
  }
}

function clearCommandHistory(): void {
  localStorage.removeItem('terminalCommandHistory')
}
```

**2. Update command autocomplete**:
```typescript
const COMMANDS = [
  // ... existing commands
  '/clear-history'
]
```

The terminal will render the output - no terminal code changes needed!

---

### Task 6: Test and Debug Responsive Design

**Goal**: Ensure terminal works correctly across all device types.

**Testing Devices**:
- **Mobile**: iPhone SE (375px), iPhone 12 (390px), Pixel 5 (393px)
- **Tablet**: iPad (768px), iPad Pro (1024px)
- **Desktop**: Laptop (1440px), Desktop (1920px), Ultra-wide (2560px)

**1. Test at each breakpoint** (DevTools Device Toolbar):

```bash
# Mobile (640px and below)
# Open DevTools → Responsive → Set width to 375px
# Verify:
- Font size: 10px
- Cols: 40, Rows: 24
- Images max 280px wide
- No horizontal scroll
- Touch scrolling works
- Virtual keyboard doesn't break layout
```

```bash
# Tablet (641-1024px)
# Set width to 768px
# Verify:
- Font size: 12px
- Cols: 60, Rows: 28
- Images max 400px wide
- Touch and mouse both work
```

```bash
# Desktop (>1024px)
# Set width to 1440px
# Verify:
- Font size: 14px
- Cols: 80, Rows: 30
- Images max 600px wide
- All keyboard shortcuts work
```

**2. Test orientation changes**:

```bash
# Start in portrait (375x667)
> /post Test post with image --attach
# Upload image
# Rotate to landscape (667x375)
# Verify: Image resizes, content reflows, no layout break
```

**3. Test virtual keyboard (real mobile device or simulator)**:

```bash
# On iOS Simulator or Android device
# Tap terminal input area
# Verify:
- Keyboard appears
- Terminal height adjusts
- Input area remains visible
- Typing works correctly
- Dismiss keyboard → terminal returns to full height
```

**4. Debug responsive issues**:

**Check current breakpoint** (`CustomTerminalCore.tsx`):
```typescript
useEffect(() => {
  console.log('[Responsive]', {
    breakpoint: viewportState.breakpoint,
    viewportWidth: window.innerWidth,
    cols: viewportState.cols,
    rows: viewportState.rows,
    fontSize: viewportState.lineHeight / 1.2
  })
}, [viewportState])
```

**Check image sizing** (`TerminalImageManager.tsx`):
```typescript
console.log('[Image Resize]', {
  breakpoint: currentBreakpoint,
  imageMaxWidth: imageDimensions.maxWidth,
  imageMaxHeight: imageDimensions.maxHeight,
  actualWidth: imageElement.offsetWidth
})
```

**Common issues**:
- **Horizontal scroll appears**: Check that terminal cols don't exceed viewport width
- **Images too large on mobile**: Verify breakpoint detection and CSS media queries
- **Layout breaks on orientation change**: Add 100ms delay after `orientationchange` event
- **Keyboard hides input on mobile**: Use `visualViewport.height` to detect keyboard
- **Safe area insets ignored (iPhone X+)**: Check `env(safe-area-inset-*)` in CSS
- **Performance lag on mobile**: Ensure virtual scrolling active, check render count

**5. Performance testing on mobile**:

```bash
# Open DevTools → Performance tab
# Set CPU throttling to "4x slowdown" (simulates mid-range mobile)
# Record while scrolling through feed with images
# Verify:
- Frame rate stays above 50fps (green in timeline)
- No long tasks (yellow/red bars)
- Scroll events processed within 16ms
```

**6. Accessibility on mobile**:

```bash
# Test with reduced motion preference
# iOS: Settings → Accessibility → Motion → Reduce Motion ON
# Android: Settings → Accessibility → Remove animations ON
# Verify:
- Cursor doesn't blink
- Smooth scroll animations disabled
- Terminal remains functional
```

---

## Testing

### Unit Tests

**Test file structure**:
```
tests/unit/
├── terminal-cell.test.ts
├── scroll-buffer.test.ts
├── ansi-parser.test.ts
├── input-buffer.test.ts
└── viewport-calculations.test.ts
```

**Example test** (`ansi-parser.test.ts`):
```typescript
import { describe, it, expect } from 'vitest'
import { ANSIParser } from '@/utils/ansi-parser'

describe('ANSIParser', () => {
  it('parses bold text', () => {
    const parser = new ANSIParser()
    const cells = parser.parse('\x1B[1mBold\x1B[0m')

    expect(cells[0].char).toBe('B')
    expect(cells[0].bold).toBe(true)
    expect(cells[1].char).toBe('o')
    expect(cells[1].bold).toBe(true)
  })

  it('parses color codes', () => {
    const parser = new ANSIParser()
    const cells = parser.parse('\x1B[32mGreen\x1B[0m')

    expect(cells[0].fgColor).toBe('#00AA00')  // ANSI green
  })
})
```

### Integration Tests

**Test terminal behaviors** (`tests/integration/terminal-e2e.test.ts`):
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Terminal } from '@/components/Terminal'

describe('Terminal Integration', () => {
  it('handles input and command execution', async () => {
    const handleCommand = vi.fn()
    render(<Terminal onCommand={handleCommand} />)

    const terminalElement = screen.getByRole('textbox')

    // Type command
    fireEvent.keyDown(terminalElement, { key: '/' })
    fireEvent.keyDown(terminalElement, { key: 'h' })
    fireEvent.keyDown(terminalElement, { key: 'e' })
    fireEvent.keyDown(terminalElement, { key: 'l' })
    fireEvent.keyDown(terminalElement, { key: 'p' })

    // Submit
    fireEvent.keyDown(terminalElement, { key: 'Enter' })

    expect(handleCommand).toHaveBeenCalledWith('/help')
  })

  it('scrolls to show new content', async () => {
    const { container } = render(<Terminal onCommand={() => {}} />)

    // Write 100 lines
    for (let i = 0; i < 100; i++) {
      fireEvent.custom(container, { type: 'terminal-write', detail: `Line ${i}\r\n` })
    }

    // Should auto-scroll to bottom
    const scrollContainer = container.querySelector('.terminal-scroll-container')
    expect(scrollContainer?.scrollTop).toBeGreaterThan(0)
  })
})
```

### Unit Test Examples

**Test Layout Calculations** (`layout-calculator.test.ts`):
```typescript
import { describe, it, expect } from 'vitest'
import { calculateFrameLayout, centerTextInFrame } from '@/utils/layout-calculator'

describe('Layout Calculator', () => {
  describe('calculateFrameLayout', () => {
    it('centers frame on desktop with 80 columns', () => {
      const layout = calculateFrameLayout(50, 80, 'desktop')

      expect(layout.totalWidth).toBe(54)  // 50 content + 4 for borders/padding
      expect(layout.contentWidth).toBe(52)  // 54 - 2 for left/right borders
      expect(layout.leftPadding).toBe(13)  // (80 - 54) / 2 = 13
      expect(layout.centered).toBe(true)
    })

    it('uses full width on mobile', () => {
      const layout = calculateFrameLayout(50, 40, 'mobile')

      expect(layout.totalWidth).toBe(40)  // Full terminal width
      expect(layout.contentWidth).toBe(38)  // 40 - 2 for borders
      expect(layout.leftPadding).toBe(0)  // No centering
      expect(layout.centered).toBe(false)
    })

    it('respects maximum frame width on desktop', () => {
      const layout = calculateFrameLayout(100, 80, 'desktop')

      expect(layout.totalWidth).toBe(70)  // Desktop max width
      expect(layout.totalWidth).toBeLessThanOrEqual(80)  // Never exceeds terminal
    })

    it('handles very narrow terminals gracefully', () => {
      const layout = calculateFrameLayout(50, 30, 'mobile')

      expect(layout.totalWidth).toBe(30)  // Uses available width
      expect(layout.contentWidth).toBeGreaterThan(0)  // Always has content space
    })
  })

  describe('centerTextInFrame', () => {
    it('centers short text with equal padding', () => {
      const result = centerTextInFrame('Hello', 20)

      expect(result).toBe('       Hello        ')  // 7 left, 8 right
      expect(result.length).toBe(20)
    })

    it('handles single character', () => {
      const result = centerTextInFrame('X', 10)

      expect(result).toBe('    X     ')  // 4 left, 5 right
    })

    it('truncates text exceeding frame width', () => {
      const longText = 'This is a very long line that exceeds the frame width'
      const result = centerTextInFrame(longText, 20)

      expect(result.length).toBe(20)
      expect(result).toBe('This is a very long ')
    })

    it('handles exact width match', () => {
      const result = centerTextInFrame('12345', 5)

      expect(result).toBe('12345')
    })
  })
})
```

**Test ANSI Parser** (`ansi-parser.test.ts`):
```typescript
import { describe, it, expect } from 'vitest'
import { ANSIParser } from '@/utils/ansi-parser'

describe('ANSIParser', () => {
  it('parses bold text', () => {
    const parser = new ANSIParser()
    const cells = parser.parse('\x1B[1mBold\x1B[0m')

    expect(cells[0].char).toBe('B')
    expect(cells[0].bold).toBe(true)
    expect(cells[4].bold).toBe(false)  // Reset after 'Bold'
  })

  it('parses foreground colors', () => {
    const parser = new ANSIParser()
    const cells = parser.parse('\x1B[32mGreen\x1B[0m')

    expect(cells[0].fgColor).toBe('#00AA00')  // ANSI green
    expect(cells[4].fgColor).toBeNull()  // Reset
  })

  it('parses combined formatting', () => {
    const parser = new ANSIParser()
    const cells = parser.parse('\x1B[1;31mBold Red\x1B[0m')

    expect(cells[0].bold).toBe(true)
    expect(cells[0].fgColor).toBe('#AA0000')  // ANSI red
  })

  it('handles partial sequences across writes', () => {
    const parser = new ANSIParser()

    // First write: incomplete sequence
    const cells1 = parser.parse('\x1B[3')
    expect(cells1.length).toBe(0)  // No output yet

    // Second write: completes sequence
    const cells2 = parser.parse('2mGreen')
    expect(cells2[0].fgColor).toBe('#00AA00')
  })

  it('maintains state across multiple parses', () => {
    const parser = new ANSIParser()

    const cells1 = parser.parse('\x1B[1mBold')
    const cells2 = parser.parse(' continues')

    expect(cells1[0].bold).toBe(true)
    expect(cells2[0].bold).toBe(true)  // State persists
  })
})
```

**Test ScrollBuffer** (`scroll-buffer.test.ts`):
```typescript
import { describe, it, expect } from 'vitest'
import { CircularScrollBuffer } from '@/utils/scroll-buffer'

describe('CircularScrollBuffer', () => {
  it('appends lines and retrieves them', () => {
    const buffer = new CircularScrollBuffer(100)

    buffer.append(createLine('Line 1', 0))
    buffer.append(createLine('Line 2', 1))

    expect(buffer.getLine(0)?.getText()).toBe('Line 1')
    expect(buffer.getLine(1)?.getText()).toBe('Line 2')
  })

  it('wraps around when buffer is full', () => {
    const buffer = new CircularScrollBuffer(10)  // Small buffer

    // Append 15 lines (exceeds buffer size)
    for (let i = 0; i < 15; i++) {
      buffer.append(createLine(`Line ${i}`, i))
    }

    // First 5 lines should be overwritten
    expect(buffer.getLine(0)).toBeNull()  // Line 0 overwritten
    expect(buffer.getLine(4)).toBeNull()  // Line 4 overwritten
    expect(buffer.getLine(5)?.getText()).toBe('Line 5')  // Still exists
    expect(buffer.getLine(14)?.getText()).toBe('Line 14')  // Most recent
  })

  it('returns visible range correctly', () => {
    const buffer = new CircularScrollBuffer(100)

    for (let i = 0; i < 50; i++) {
      buffer.append(createLine(`Line ${i}`, i))
    }

    const visible = buffer.getVisibleRange(10, 20)

    expect(visible.length).toBe(11)  // Lines 10-20 inclusive
    expect(visible[0].getText()).toBe('Line 10')
    expect(visible[10].getText()).toBe('Line 20')
  })
})

function createLine(text: string, lineNumber: number): TerminalLine {
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
    metadata: { lineNumber, timestamp: Date.now(), wrapped: false }
  }
}
```

**Test Frame Rendering** (`frame-builder.test.ts`):
```typescript
import { describe, it, expect } from 'vitest'
import { renderFrame, BOX_DRAWING_DOUBLE } from '@/utils/frame-builder'

describe('FrameBuilder', () => {
  it('renders simple frame with borders', () => {
    const layout = {
      totalWidth: 20,
      contentWidth: 18,
      leftPadding: 5,
      centered: true,
      borderStyle: BOX_DRAWING_DOUBLE
    }

    const content = { lines: ['Hello', 'World'], image: null }
    const lines = renderFrame(layout, content, BOX_DRAWING_DOUBLE)

    // Should have: top border, 2 content lines, bottom border = 4 lines
    expect(lines.length).toBe(4)

    // Check top border
    expect(lines[0].getText()).toContain('╔')
    expect(lines[0].getText()).toContain('╗')

    // Check left padding applied
    expect(lines[0].getText().startsWith('     ')).toBe(true)  // 5 spaces

    // Check content lines have vertical borders
    expect(lines[1].getText()).toContain('║')
    expect(lines[2].getText()).toContain('║')
  })

  it('centers text within frame', () => {
    const layout = {
      totalWidth: 30,
      contentWidth: 28,
      leftPadding: 0,
      centered: false,
      borderStyle: BOX_DRAWING_DOUBLE
    }

    const content = { lines: ['Hi'], image: null }  // Short text
    const lines = renderFrame(layout, content, BOX_DRAWING_DOUBLE)

    const contentLine = lines[1].getText()  // Second line (first content line)

    // Text should be centered with padding on both sides
    expect(contentLine).toContain('Hi')
    expect(contentLine.indexOf('Hi')).toBeGreaterThan(10)  // Not at start
  })
})
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- layout-calculator.test.ts

# Run with coverage
npm run test:coverage

# Watch mode (re-run on file changes)
npm run test:watch

# Run tests matching pattern
npm test -- --grep "layout"
```

**Coverage Report**:
```
---------------------------|---------|----------|---------|---------|
File                       | % Stmts | % Branch | % Funcs | % Lines |
---------------------------|---------|----------|---------|---------|
layout-calculator.ts       |   100   |   100    |   100   |   100   |
ansi-parser.ts             |   98.5  |   95.2   |   100   |   98.5  |
scroll-buffer.ts           |   100   |   100    |   100   |   100   |
frame-builder.ts           |   97.3  |   94.1   |   100   |   97.3  |
---------------------------|---------|----------|---------|---------|
```

---

### Manual Testing Checklist

- [ ] Type characters - appear at cursor position
- [ ] Backspace - deletes character before cursor
- [ ] Left/right arrows - move cursor
- [ ] Home/End - jump to line start/end
- [ ] Ctrl+U - clears input line
- [ ] Ctrl+L - clears screen
- [ ] Tab - autocomplete works
- [ ] Up arrow - shows command history
- [ ] Scroll - images move with text
- [ ] Resize window - content reflows
- [ ] Mobile viewport - terminal fits screen
- [ ] Long lines - wrap correctly
- [ ] ANSI colors - render correctly

---

## Performance Tips

### 1. Use React.memo for Lines

```typescript
const TerminalLine = React.memo(({ line }: { line: TerminalLine }) => {
  return (
    <div className="terminal-line">
      {line.cells.map((cell, i) => (
        <span key={i} style={{ color: cell.fgColor }}>
          {cell.char}
        </span>
      ))}
    </div>
  )
}, (prev, next) => prev.line.metadata.lineNumber === next.line.metadata.lineNumber)
```

**Why**: Prevents re-rendering unchanged lines.

### 2. Virtual Scrolling

Only render visible lines + buffer:

```typescript
const visibleRange = calculateVisibleRange(scrollY, viewportHeight)
const linesToRender = scrollBuffer.getVisibleRange(visibleRange.start, visibleRange.end)

return (
  <div className="terminal-container">
    {linesToRender.map(line => (
      <TerminalLine key={line.metadata.lineNumber} line={line} />
    ))}
  </div>
)
```

**Why**: Render 130 lines instead of 10,000 (98.7% reduction).

### 3. CSS Containment

```css
.terminal-line {
  contain: layout style paint;
}
```

**Why**: Tells browser to isolate paint operations per line.

### 4. RequestAnimationFrame for Scroll

```typescript
useEffect(() => {
  let rafId: number

  const handleScroll = (e: Event) => {
    cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      setScrollY((e.target as HTMLElement).scrollTop)
    })
  }

  scrollContainer.addEventListener('scroll', handleScroll)
  return () => {
    scrollContainer.removeEventListener('scroll', handleScroll)
    cancelAnimationFrame(rafId)
  }
}, [])
```

**Why**: Batches scroll updates to 60fps max.

---

## Troubleshooting

### Issue: Terminal not rendering anything

**Check**:
1. Is `CustomTerminalCore` mounted? (React DevTools)
2. Is `ScrollBuffer` populated? (console.log buffer length)
3. Are there any React errors? (check console)

**Fix**:
```typescript
// Add debug logging in CustomTerminalCore
useEffect(() => {
  console.log('[Terminal] Mounted', { bufferLength: scrollBuffer.getLength() })
}, [])
```

### Issue: Cursor not visible

**Check**:
1. Is `CursorState.visible` true?
2. Is cursor rendering logic present in TerminalRenderer?

**Fix**:
```typescript
// TerminalRenderer.tsx
{cursorState.visible && (
  <span
    className="terminal-cursor"
    style={{
      position: 'absolute',
      left: `${cursorState.col * charWidth}px`,
      top: `${cursorState.row * lineHeight}px`
    }}
  >
    █
  </span>
)}
```

### Issue: Input not working

**Check**:
1. Is `onKeyDown` handler attached?
2. Is focus on terminal element?

**Fix**:
```typescript
// Ensure terminal div is focusable and has key handler
<div
  className="terminal"
  tabIndex={0}
  onKeyDown={handleKeyDown}
  ref={terminalRef}
>
  {/* ... */}
</div>

// Auto-focus on mount
useEffect(() => {
  terminalRef.current?.focus()
}, [])
```

### Issue: Images not appearing

**Check**:
1. Are `[IMG:url:alt]` markers in output?
2. Is `TerminalImageManager` rendering?
3. Are image URLs valid?

**Fix**:
```typescript
// Debug image parsing
useEffect(() => {
  const images = parseImagesFromBuffer(scrollBuffer)
  console.log('[Images Found]', images)
}, [scrollBuffer])
```

---

## Next Steps

1. **Read the spec**: `specs/001-custom-terminal-emulator/spec.md` for requirements
2. **Review research**: `specs/001-custom-terminal-emulator/research.md` for architecture decisions
3. **Check data models**: `specs/001-custom-terminal-emulator/data-model.md` for structures
4. **See implementation tasks**: `specs/001-custom-terminal-emulator/tasks.md` (after generation)

---

## Additional Resources

- **ANSI escape codes reference**: https://en.wikipedia.org/wiki/ANSI_escape_code
- **Virtual scrolling pattern**: https://www.patterns.dev/posts/virtual-lists
- **React performance**: https://react.dev/reference/react/memo
- **Terminal emulator guide**: https://www.uninformativ.de/blog/postings/2018-02-24/0/POSTING-en.html

---

## Questions?

If you encounter issues not covered here:
1. Check existing terminal components for patterns
2. Review `data-model.md` for data structure details
3. Read `research.md` for architectural reasoning
4. Ask in team chat or open a GitHub issue

**Welcome to the custom terminal team!** 🎉
