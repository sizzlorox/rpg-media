# Terminal Refactor - Developer Quickstart Guide

**Last Updated**: 2026-02-14
**Target Audience**: Developers new to the Social Forge terminal codebase

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Setup Instructions](#setup-instructions)
3. [How to Add New Terminal Commands](#how-to-add-new-terminal-commands)
4. [How to Modify Terminal Styling](#how-to-modify-terminal-styling)
5. [Debugging Tips](#debugging-tips)

---

## Architecture Overview

### Component Structure

The terminal has been refactored from a monolithic 560-line file into 6 modular components:

```
frontend/src/components/
├── Terminal.tsx                    # Integration layer (153 lines)
└── terminal/
    ├── TerminalCore.tsx           # xterm.js initialization & lifecycle
    ├── TerminalInput.tsx          # Keyboard input & cursor navigation
    ├── TerminalOutput.tsx         # Output buffer & ANSI rendering
    ├── TerminalStyling.tsx        # Theme & responsive configuration
    ├── TerminalState.tsx          # State management (history, autocomplete)
    └── TerminalErrorBoundary.tsx  # Error handling & fallback UI
```

### Data Flow

```
User Input → TerminalInput → TerminalState → Command Handler
                                                     ↓
Browser ← TerminalOutput ← Terminal.tsx ← API Response
```

### Key Design Principles

1. **Separation of Concerns**: Each module has a single, well-defined responsibility
2. **Abstraction Layer**: xterm.js API is isolated in TerminalCore for easy migration
3. **Type Safety**: All components use strict TypeScript with defined interfaces
4. **Error Resilience**: Error boundary catches crashes and shows graceful fallback
5. **Buffer Management**: Prevents memory leaks with sliding windows

---

## Setup Instructions

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm 9+
- TypeScript 5.9+

### Installation

```bash
# Install dependencies
cd frontend
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

### Verify Installation

Open http://localhost:5173 and verify:
- ✅ Terminal renders with green-on-black theme
- ✅ Welcome message displays with ASCII logo
- ✅ Command prompt appears ("> ")
- ✅ Typing works, autocomplete suggestions appear
- ✅ Arrow keys navigate command history

---

## How to Add New Terminal Commands

### Step-by-Step Guide

#### 1. Add Command to Autocomplete List

**File**: `frontend/src/components/Terminal.tsx`
**Location**: Line 64

```typescript
const handleAutocomplete = useCallback((partial: string): string | null => {
  const commands = [
    '/post ', '/like ', '/comment ', '/show ',
    '/login ', '/register ', '/logout ',
    '/help ', '/man ', '/profile ', '/clear ',
    '/mynewcommand ' // ← Add your new command here
  ]
  const match = commands.find(cmd => cmd.startsWith(partial) && cmd !== partial)
  return match || null
}, [])
```

#### 2. Add Command Handler Logic

**File**: `frontend/src/hooks/useTerminalCommands.ts`
**Add new command handler**:

```typescript
export function useTerminalCommands() {
  // ... existing handlers ...

  const handleMyNewCommand = async (args: string[]): Promise<string> => {
    try {
      // Validate arguments
      if (args.length < 1) {
        return red('Usage: /mynewcommand <arg1> [arg2]')
      }

      // Call API
      const response = await fetch('/api/mynewcommand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ param: args[0] })
      })

      if (!response.ok) {
        return red(`Error: ${response.statusText}`)
      }

      const data = await response.json()
      return green(`Success: ${data.message}`)
    } catch (error) {
      return red(`Failed: ${error.message}`)
    }
  }

  return {
    // ... existing handlers ...
    handleMyNewCommand
  }
}
```

#### 3. Register Command in Router

**File**: `frontend/src/pages/Home.tsx` or `Landing.tsx`
**Add to command router**:

```typescript
const handleCommand = async (command: string, cols: number) => {
  const [cmd, ...args] = command.trim().split(' ')

  switch (cmd.toLowerCase()) {
    case '/post':
      return handlePost(args.join(' '))
    case '/mynewcommand':
      return handleMyNewCommand(args) // ← Add new case
    // ... other commands ...
  }
}
```

#### 4. Add to Help Menu

**File**: `frontend/src/hooks/useTerminalCommands.ts`
**Update help text**:

```typescript
const helpText = [
  cyan('Available Commands:'),
  '',
  yellow('/post <message>') + '        - Create a new post',
  yellow('/mynewcommand <arg>') + '    - Description of new command', // ← Add here
  // ... rest of help ...
].join('\r\n')
```

#### 5. Test Your Command

```bash
# Start dev server
npm run dev

# In terminal:
> /mynewcommand test
```

### Example: Adding `/stats` Command

```typescript
// 1. Add to autocomplete (Terminal.tsx)
const commands = ['/stats ', ...]

// 2. Create handler (useTerminalCommands.ts)
const handleStats = async () => {
  const response = await fetch('/api/stats')
  const data = await response.json()
  return [
    cyan('═'.repeat(40)),
    yellow('Your Statistics:'),
    `Posts: ${data.posts}`,
    `Likes: ${data.likes}`,
    `Level: ${data.level}`,
    cyan('═'.repeat(40))
  ].join('\r\n')
}

// 3. Register (Home.tsx)
case '/stats':
  return handleStats()

// 4. Add to help
yellow('/stats') + '                   - View your statistics'
```

---

## How to Modify Terminal Styling

### Theme Colors

**File**: `frontend/src/components/terminal/TerminalStyling.tsx`
**Lines**: 42-65

```typescript
const xtermConfig: ITerminalOptions = {
  theme: {
    background: '#000000',    // ← Change background color
    foreground: '#00ff00',    // ← Change text color
    cursor: '#00ff00',        // ← Change cursor color
    selectionBackground: '#00aa00', // ← Change selection color
    // ... 16 color palette ...
  }
}
```

### Font Settings

**File**: `frontend/src/components/terminal/TerminalStyling.tsx`
**Line**: 66-70

```typescript
fontFamily: 'IBM Plex Mono, Courier New, monospace', // ← Change font
fontSize: responsiveConfig.config.fontSize,          // ← Dynamic (responsive)
cursorBlink: true,                                   // ← Enable/disable blinking
cursorStyle: 'block',                                // ← 'block' | 'underline' | 'bar'
scrollback: 1000,                                    // ← History line count
```

### Responsive Breakpoints

**File**: `frontend/src/utils/terminal-responsive.ts`
**Lines**: 17-51

```typescript
export const RESPONSIVE_BREAKPOINTS: ResponsiveBreakpoint[] = [
  {
    maxWidth: 640,  // Mobile breakpoint (px)
    config: {
      fontSize: 10,
      minRows: 24,
      minCols: 40,
      padding: '8px',
      height: 'calc(100vh - 16px)'
    },
    logoType: 'compact'
  },
  // ... tablet and desktop configs ...
]
```

### ANSI Color Helpers

**File**: `frontend/src/utils/ansi-colors.ts`

```typescript
export const ANSI = {
  // Basic colors
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  CYAN: '\x1b[36m',

  // Bright colors
  BRIGHT_GREEN: '\x1b[92m',
  BRIGHT_RED: '\x1b[91m',

  // Formatting
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  RESET: '\x1b[0m'
}

// Helper functions
export const green = (text: string) => ANSI.GREEN + text + ANSI.RESET
export const red = (text: string) => ANSI.RED + text + ANSI.RESET
```

### ASCII Logo Customization

**File**: `frontend/src/utils/ascii-logo.ts`

The logo has 3 responsive sizes:
- `compact` (mobile, ≤640px)
- `medium` (tablet, 641-1024px)
- `full` (desktop, >1024px)

To modify the logo, edit the `renderFullLogo()`, `renderMediumLogo()`, or `renderCompactLogo()` functions.

---

## Debugging Tips

### Common Issues

#### 1. Terminal Not Rendering

**Symptoms**: Blank screen, no terminal visible

**Debugging**:
```javascript
// Check browser console for errors
// TerminalCore.tsx logs initialization:
[TerminalCore] Initialization failed: <error>

// Verify containerRef is attached
console.log(containerRef.current) // Should not be null
```

**Solution**: Ensure parent component has proper height/width CSS.

#### 2. FitAddon Not Working

**Symptoms**: Terminal doesn't resize on window resize

**Debugging**:
```javascript
// Check if FitAddon is loaded
console.log(fitAddonRef.current) // Should not be null

// Manually trigger fit
core.fit() // Should recalculate dimensions
```

**Solution**: Ensure `fit()` is called after window resize and container size changes.

#### 3. Colors Not Showing

**Symptoms**: Text appears plain white/black

**Debugging**:
```javascript
// Check terminal theme config
console.log(xtermConfig.theme)

// Verify ANSI codes in output
console.log('Test:', green('Should be green'))
```

**Solution**: Ensure xterm.css is imported in Terminal.tsx.

#### 4. Input Not Working

**Symptoms**: Keyboard input doesn't appear

**Debugging**:
```javascript
// Check TerminalInput hook is attached
console.log(terminal) // Should not be null

// Verify onData listener
terminal.onData((data) => console.log('Input:', data))
```

**Solution**: Ensure `useTerminalInput()` is called with valid terminal ref.

#### 5. Memory Leak / Performance Issues

**Symptoms**: Browser slows down over time

**Debugging**:
```javascript
// Check output buffer size
console.log(output.bufferSize) // Should not exceed 10,000

// Monitor command history size
console.log(terminalState.state.commandHistory.length) // Max 100
```

**Solution**: Verify buffer limits are enforced in TerminalOutput.tsx and TerminalState.tsx.

### Browser DevTools Tips

#### Inspect Terminal DOM

```javascript
// Find xterm.js container
document.querySelector('.xterm')

// Check terminal dimensions
const term = xtermRef.current
console.log(`${term.cols}x${term.rows}`)
```

#### Monitor State Changes

```javascript
// Add to Terminal.tsx for debugging
useEffect(() => {
  console.log('Command buffer:', commandBuffer)
  console.log('Cursor position:', cursorPosition)
}, [commandBuffer, cursorPosition])
```

#### Test Responsive Breakpoints

```javascript
// Chrome DevTools → Device Toolbar (Cmd+Shift+M)
// Test these widths:
// - 375px (iPhone)
// - 768px (iPad)
// - 1280px (Desktop)
```

### xterm.js Gotchas

1. **rows/cols in config**: Don't set `rows` or `cols` in ITerminalOptions - xterm.js ignores them. Use FitAddon instead.

2. **Write timing**: Don't call `terminal.write()` before terminal is ready. Use the `onReady` callback.

3. **ANSI reset**: Always end colored text with `\x1b[0m` (RESET) or colors will bleed.

4. **Cursor positioning**: Use ANSI escape codes, not manual cursor tracking:
   ```typescript
   terminal.write('\r')        // Move to start of line
   terminal.write('\x1B[K')    // Clear to end of line
   terminal.write('\x1B[3G')   // Move to column 3
   ```

5. **Input buffer**: xterm.js doesn't have a built-in input buffer - you must implement it yourself (see TerminalInput.tsx).

---

## Performance Optimization

### Metrics Baseline (from T007)

| Metric | Original | Refactored | Target |
|--------|----------|------------|--------|
| LOC | 560 | 153 | <448 |
| Cyclomatic Complexity | ~30 | ~10 | <21 |
| Module Count | 1 | 6 | 5-6 |
| Render Time | ~50ms | ~30ms | <50ms |

### Optimization Tips

1. **Debounce resize events**: Already implemented in Terminal.tsx
2. **Use React.memo**: For expensive child components
3. **Virtualize long output**: Consider virtual scrolling for 1000+ lines
4. **Batch writes**: Use `terminal.write()` once with concatenated string instead of multiple calls

---

## Testing Strategy

### Manual Testing Checklist

- [ ] Terminal renders on page load
- [ ] Welcome message displays correctly
- [ ] All commands work (/post, /like, /comment, etc.)
- [ ] Arrow keys navigate history
- [ ] Tab autocomplete works
- [ ] Password masking works (*/login, /register)
- [ ] Window resize updates terminal dimensions
- [ ] Mobile viewport (≤640px) displays compact logo
- [ ] Tablet viewport (641-1024px) displays medium logo
- [ ] Desktop viewport (>1024px) displays full logo

### Integration Testing

```typescript
// Test command handler
const result = await handlePost('Hello world!')
expect(result).toContain('Post created')

// Test autocomplete
const suggestion = handleAutocomplete('/p')
expect(suggestion).toBe('ost ')

// Test history navigation
terminalState.addToHistory('/post test')
terminalState.navigateHistory('up')
expect(terminalState.state.currentCommand).toBe('/post test')
```

---

## Additional Resources

- **Architecture Diagram**: See `component-architecture.md`
- **TypeScript Contracts**: See `contracts/` directory
- **xterm.js Docs**: https://xtermjs.org/docs/
- **React Hooks Guide**: https://react.dev/reference/react

---

## Getting Help

If you encounter issues:

1. Check browser console for error messages
2. Review this guide's debugging section
3. Consult `component-architecture.md` for data flow diagrams
4. Check git history for recent changes: `git log --oneline -- frontend/src/components/Terminal.tsx`

---

**Estimated Onboarding Time**: ≤30 minutes to understand architecture, ≤2 hours to implement first feature.
