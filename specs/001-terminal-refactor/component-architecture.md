# Terminal Component Architecture

**Version**: 1.0.0
**Date**: 2026-02-14
**Status**: Design Phase
**Related**: [plan.md](./plan.md) | [spec.md](./spec.md)

---

## Overview

This document defines the modular architecture for the refactored terminal component. The goal is to decompose the monolithic `Terminal.tsx` (560 lines) into smaller, single-responsibility modules that improve maintainability while preserving 100% visual and functional parity.

**Design Principles**:
- **Separation of Concerns**: Each module handles one aspect (initialization, input, output, styling, state)
- **Single Responsibility**: Each component/hook has a clear, focused purpose
- **Explicit Dependencies**: Data flow is unidirectional and traceable
- **API Isolation**: @xterm/xterm library dependencies isolated for future migration
- **Type Safety**: All interfaces use TypeScript strict mode, no `any` types

---

## Component Breakdown

### Module Organization

```text
frontend/src/components/
├── Terminal.tsx                    # Integration layer (orchestrates modules)
└── terminal/                       # NEW: Modular terminal components
    ├── TerminalCore.tsx            # xterm.js initialization & lifecycle
    ├── TerminalInput.tsx           # Keyboard input handling & cursor nav
    ├── TerminalOutput.tsx          # Output buffer management & rendering
    ├── TerminalStyling.tsx         # Theme config & responsive sizing
    ├── TerminalState.tsx           # State management (hook-based)
    └── TerminalErrorBoundary.tsx   # Error boundary for graceful degradation
```

---

## Module Specifications

### 1. TerminalCore.tsx

**Responsibility**: Manage @xterm/xterm library lifecycle and initialization

**Exports**:
- `useTerminalCore(config: TerminalConfig): TerminalCoreResult`

**Functionality**:
- Initialize XTerm instance with theme and configuration
- Load and manage FitAddon for responsive sizing
- Handle terminal mounting/unmounting lifecycle
- Expose terminal instance reference and fit function
- Abstract xterm.js API to allow future library migration

**Dependencies**:
- `@xterm/xterm` (Terminal class)
- `@xterm/addon-fit` (FitAddon)
- `TerminalConfig` interface (from contracts)

**Internal State**:
- `xtermRef: RefObject<XTerm | null>` - Terminal instance
- `fitAddonRef: RefObject<FitAddon | null>` - Fit addon instance

**Props/Returns**:
```typescript
interface TerminalCoreResult {
  terminalRef: RefObject<XTerm | null>
  fitAddonRef: RefObject<FitAddon | null>
  containerRef: RefObject<HTMLDivElement>
  fit: () => void
  write: (data: string) => void
  focus: () => void
}
```

**Error Handling**:
- Graceful degradation if xterm.js fails to load
- Structured logging for initialization errors

---

### 2. TerminalInput.tsx

**Responsibility**: Handle all keyboard input, cursor navigation, and command submission

**Exports**:
- `useTerminalInput(terminalInstance: XTerm | null, options: InputOptions): InputHandlers`

**Functionality**:
- Capture keyboard events via `xterm.onData()`
- Manage command buffer (current input line)
- Handle cursor position (left/right arrow navigation)
- Trigger autocomplete on Tab
- Submit commands on Enter
- Validate input length (2000 character limit)
- Mask passwords for `/login` and `/register` commands

**Dependencies**:
- XTerm instance (from TerminalCore)
- `CommandHandler` interface
- `useCommandHistory` hook
- `useAutocomplete` hook

**Internal State**:
- `commandBuffer: string` - Current input text
- `cursorPosition: number` - Cursor index within buffer
- `passwordMaskIndex: number` - Start index of password field (-1 if not masking)

**Key Functions**:
- `handleKeypress(data: string)` - Process keyboard input
- `moveCursor(direction: 'left' | 'right')` - Arrow key navigation
- `submitCommand()` - Execute command on Enter
- `clearInput()` - Reset buffer and cursor

**Error Handling**:
- Input length validation with user feedback
- Invalid key press handling

---

### 3. TerminalOutput.tsx

**Responsibility**: Manage output buffer and render content to terminal

**Exports**:
- `useTerminalOutput(terminalInstance: XTerm | null, options: OutputOptions): OutputHandlers`

**Functionality**:
- Write formatted output to terminal
- Manage sliding window buffer (10000 line limit)
- Sanitize and validate ANSI escape sequences
- Handle multi-line output and line wrapping
- Clear terminal screen
- Render ANSI colors and formatting

**Dependencies**:
- XTerm instance (from TerminalCore)
- ANSI utilities (`ansi-colors.ts`)

**Internal State**:
- `outputBuffer: string[]` - Sliding window of output lines (max 10000)

**Key Functions**:
- `write(content: string)` - Append output to terminal
- `writeLine(content: string)` - Write single line
- `clear()` - Clear terminal screen
- `sanitizeANSI(input: string): string` - Validate ANSI sequences

**Buffer Management**:
- **Overflow Strategy**: When buffer exceeds 10000 lines, remove oldest 1000 lines
- **Performance**: Batch writes to minimize reflows

**Error Handling**:
- Sanitize malformed ANSI sequences
- Log buffer overflow events

---

### 4. TerminalStyling.tsx

**Responsibility**: Manage theme configuration and responsive sizing

**Exports**:
- `useTerminalStyling(viewport: ViewportSize): TerminalConfig`

**Functionality**:
- Provide terminal theme (green-on-black MUD aesthetic)
- Calculate responsive font size, rows, and columns based on viewport
- Update configuration on window resize
- Centralize all styling decisions

**Dependencies**:
- `terminal-responsive.ts` utilities
- `TerminalConfig` interface

**Responsive Breakpoints**:
- **Mobile** (≤640px): 10px font, 40 cols, 24 rows
- **Tablet** (641-1024px): 12px font, 60 cols, 28 rows
- **Desktop** (>1024px): 14px font, 80 cols, 30 rows

**Theme Configuration**:
```typescript
const MUD_THEME = {
  background: '#000000',
  foreground: '#00ff00',
  cursor: '#00ff00',
  // ... (see current Terminal.tsx lines 54-76)
}
```

**Key Functions**:
- `getConfig(viewportWidth: number): TerminalConfig`
- `updateOnResize()` - Window resize handler

---

### 5. TerminalState.tsx

**Responsibility**: Centralized state management for terminal component

**Exports**:
- `useTerminalState(): TerminalStateManager`

**State Shape**:
```typescript
interface TerminalStateData {
  commandHistory: string[]        // Max 100 entries (circular buffer)
  historyIndex: number             // Current position in history (-1 = not navigating)
  currentCommand: string           // Active command buffer
  cursorPosition: number           // Cursor index within command
  autocomplete: {
    suggestion: string             // Current autocomplete suggestion
    visible: boolean               // Is suggestion displayed
  }
  terminalCols: number             // Current terminal columns (for responsive)
}
```

**State Management Pattern**: **Custom Hook with useReducer**

**Rationale**:
- Terminal state is local to terminal component (no need for Context)
- Complex state transitions benefit from reducer pattern
- Easy to test and reason about
- No external dependencies (avoids Zustand/Redux)

**State Transitions**:
- **Unidirectional**: User input → Action → Reducer → State update → Re-render
- **Documented**: All actions and transitions defined in state diagram (see below)

**Key Functions**:
- `dispatch(action: TerminalAction)` - Update state
- `resetHistory()` - Clear command history
- `addCommand(command: string)` - Add to history (circular buffer)
- `navigateHistory(direction: 'up' | 'down')` - Arrow key history

**Buffer Management**:
- Command history: Circular buffer, auto-remove oldest when >100 entries

---

### 6. TerminalErrorBoundary.tsx

**Responsibility**: Catch rendering errors and provide fallback UI

**Exports**:
- `<TerminalErrorBoundary>` - React error boundary component

**Functionality**:
- Catch errors in terminal component tree
- Display user-friendly fallback UI
- Log errors to structured logging system
- Prevent app crash from terminal failures

**Fallback UI**:
```
╔══════════════════════════════════╗
║  Terminal Temporarily Offline    ║
║  Please refresh the page         ║
╚══════════════════════════════════╝
```

**Error Logging**:
- Log component stack trace
- Log error message and cause
- Report to Sentry (if configured)

---

## Data Flow Architecture

### Initialization Flow

```
User loads page
    ↓
Terminal.tsx renders
    ↓
useTerminalCore() initializes xterm.js
    ↓
useTerminalStyling() provides theme & responsive config
    ↓
useTerminalState() initializes state
    ↓
useTerminalInput() attaches keyboard listeners
    ↓
useTerminalOutput() ready to render
    ↓
Terminal mounts & displays welcome message
```

### Command Execution Flow

```
User types in terminal
    ↓
useTerminalInput() captures keypress
    ↓
Updates commandBuffer in TerminalState
    ↓
User presses Enter
    ↓
useTerminalInput() validates & submits command
    ↓
Terminal.tsx onCommand callback fires
    ↓
Parent component (Home.tsx) processes command
    ↓
Parent updates initialContent prop
    ↓
useTerminalOutput() writes new content
    ↓
Terminal displays output
```

### Resize Flow

```
User resizes window
    ↓
useTerminalStyling() detects viewport change
    ↓
Calculates new config (font, rows, cols)
    ↓
useTerminalCore() fit() recalculates dimensions
    ↓
Terminal reflows content
```

---

## State Diagram

```
[Initial State]
    ↓
[Terminal Idle] ←──────────────┐
    ↓                           │
User types character            │
    ↓                           │
[Command Buffer Updated]        │
    ↓                           │
User presses:                   │
  - Tab → [Autocomplete]        │
  - Arrow Up/Down → [History]   │
  - Enter → [Submit Command] ───┘
  - Backspace → [Delete Char] ──┘
  - Arrow Left/Right → [Move Cursor] ──┘
```

---

## Integration with Terminal.tsx

**Terminal.tsx becomes integration layer**:

```typescript
// Simplified Terminal.tsx structure after refactoring
export function Terminal({ onCommand, initialContent, skipWelcome }: TerminalProps) {
  // Module initialization
  const styling = useTerminalStyling(getCurrentViewportWidth())
  const core = useTerminalCore(styling)
  const state = useTerminalState()
  const input = useTerminalInput(core.terminalRef.current, { onCommand, state })
  const output = useTerminalOutput(core.terminalRef.current, { state })

  // Lifecycle: Display initial content
  useEffect(() => {
    if (!skipWelcome) {
      output.write(renderWelcomeMessage())
    }
    if (initialContent) {
      output.write(initialContent)
    }
  }, [initialContent, skipWelcome])

  return (
    <TerminalErrorBoundary>
      <div ref={core.containerRef} className="terminal-container" />
    </TerminalErrorBoundary>
  )
}
```

**Lines of Code Estimate**: ~80 lines (down from 560 - 85% reduction in main file)

---

## Abstraction Layer for Library Migration

**Goal**: Isolate @xterm/xterm API dependencies to enable future migration

**Strategy**:
- All xterm.js API calls go through TerminalCore.tsx
- Other modules interact via abstraction interfaces:
  - `write(data: string)` instead of `term.write(data)`
  - `focus()` instead of `term.focus()`
  - `fit()` instead of `fitAddon.fit()`

**Benefits**:
- If migrating to different library, only TerminalCore.tsx changes
- Other modules remain unchanged
- Easier testing (mock terminal instance)

---

## Performance Considerations

**Bundle Size**:
- No additional dependencies (only reorganization)
- Potential for tree-shaking unused modules
- @xterm/xterm size remains constant (~265KB)

**Runtime Performance**:
- No performance degradation expected
- Batched output writes reduce reflows
- Memoized responsive config reduces recalculations

**Memory Management**:
- Circular buffers prevent unbounded growth
- Sliding window for output buffer
- Command history limit (100 entries)

---

## Testing Strategy

**Unit Testing** (if test framework added):
- Test each module independently
- Mock xterm.js instance for TerminalCore tests
- Test state transitions in TerminalState
- Test buffer overflow in TerminalOutput

**Integration Testing**:
- Test data flow between modules
- Test command execution end-to-end
- Test responsive config updates

**Manual Testing** (current approach):
- Visual parity validation (feature-parity-checklist.md)
- Browser compatibility testing
- Accessibility testing (keyboard nav, screen readers)

---

## Migration Path

### Phase 1: Design (Current)
- ✅ Define component breakdown
- ⏳ Define TypeScript interfaces
- ⏳ Document data flow
- ⏳ Design buffer management
- ⏳ Design error handling

### Phase 2: Implementation
- Create new `frontend/src/components/terminal/` directory
- Implement TerminalCore.tsx (extract xterm.js logic)
- Implement TerminalState.tsx (extract state management)
- Implement TerminalInput.tsx (extract keyboard handling)
- Implement TerminalOutput.tsx (extract output rendering)
- Implement TerminalStyling.tsx (extract responsive config)
- Implement TerminalErrorBoundary.tsx (new error boundary)

### Phase 3: Integration
- Refactor Terminal.tsx to use new modules
- Update Home.tsx and Landing.tsx (verify props)
- Test visual parity across all breakpoints
- Test all commands and features

### Phase 4: Cleanup
- Remove old monolithic code
- Update documentation
- Validate metrics (LOC reduction, complexity reduction)

---

## Success Criteria

**Architectural Goals**:
- ✅ Single Responsibility: Each module has one clear purpose
- ✅ Separation of Concerns: Styling/behavior/state are independent
- ✅ Type Safety: All interfaces strictly typed, no `any`
- ✅ Maintainability: New developers understand structure in <30 min
- ✅ Testability: Modules can be tested independently
- ✅ Future-Proof: Library migration requires minimal changes

**Quantitative Metrics**:
- Terminal.tsx: 560 lines → ~80 lines (86% reduction)
- Total LOC: 1,078 lines → <862 lines (≥20% reduction target)
- Complexity: 96 points → <67 points (≥30% reduction target)
- Modules: 1 monolith → 6 focused modules

---

## Buffer Management Design

### Command History Circular Buffer (100 Entry Limit)

**Implementation Location**: `TerminalState.tsx` (state management)

**Strategy**: First-In-First-Out (FIFO) circular buffer
- **Capacity**: Maximum 100 commands
- **Overflow Behavior**: When adding command #101, remove oldest command (#1)
- **Storage**: Array-based with manual index management

**Algorithm**:
```typescript
function addToHistory(history: string[], newCommand: string): string[] {
  const updated = [...history, newCommand]
  if (updated.length > 100) {
    return updated.slice(updated.length - 100) // Keep last 100
  }
  return updated
}
```

**Memory Estimate**: ~5-10KB (100 commands * 50-100 chars average)

**Performance**: O(1) for add, O(1) for access

---

### Input Validation (2000 Character Limit)

**Implementation Location**: `TerminalInput.tsx` (input handling)

**Strategy**: Real-time validation on each keystroke
- **Max Length**: 2000 characters
- **Validation Point**: Before adding character to command buffer
- **User Feedback**: Visual warning + audible beep when limit reached

**Implementation**:
```typescript
function handleKeypress(char: string, currentBuffer: string): string {
  if (currentBuffer.length >= 2000 && char !== '\b') {
    // Reject input, show warning
    logger.warn(TerminalLogEvent.INPUT_VALIDATION_ERROR,
      'Input limit reached',
      { bufferLength: currentBuffer.length })
    return currentBuffer // Don't add character
  }
  return currentBuffer + char
}
```

**User Feedback Message**:
```
⚠️  Input limit reached (max 2000 characters)
```

**Edge Cases**:
- Pasting text >2000 chars: Truncate at 2000, show warning
- Backspace always allowed (even at limit)
- Special keys (arrows, Enter) always allowed

---

### Output Buffer Sliding Window (10000 Line Limit)

**Implementation Location**: `TerminalOutput.tsx` (output rendering)

**Strategy**: Sliding window with batch cleanup
- **Capacity**: Maximum 10000 lines
- **Overflow Threshold**: 10000 lines
- **Cleanup Strategy**: Remove oldest 1000 lines when limit exceeded
- **Rationale**: Batch cleanup reduces memory churn vs. removing 1 line at a time

**Algorithm**:
```typescript
function addToOutputBuffer(buffer: string[], newLines: string[]): string[] {
  const updated = [...buffer, ...newLines]

  if (updated.length > 10000) {
    // Remove oldest 1000 lines
    const trimmed = updated.slice(1000)
    logger.info(TerminalLogEvent.BUFFER_OVERFLOW,
      'Output buffer trimmed',
      { removed: 1000, remaining: trimmed.length })
    return trimmed
  }

  return updated
}
```

**Memory Estimate**: ~500KB-1MB (10000 lines * 50-100 chars average)

**Performance**: O(n) for overflow cleanup, amortized O(1) for normal writes

**User Impact**: None (scrollback limited to 10000 lines, but terminal already has 1000 line scrollback)

---

## Error Handling Strategy

### Error Boundary (TerminalErrorBoundary.tsx)

**Purpose**: Catch rendering errors and prevent app crash

**Scope**: Wraps entire Terminal component tree

**Fallback UI**:
```
╔═══════════════════════════════════╗
║   Terminal Temporarily Offline    ║
║   Please refresh the page         ║
║   Error: [error message]          ║
╚═══════════════════════════════════╝
```

**Logging**:
- Error name and message
- Component stack trace
- User session info
- Terminal state snapshot (if available)

**Recovery**:
- User must refresh page
- No automatic retry (prevents infinite error loops)

**Implementation**:
```typescript
class TerminalErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.critical(
      TerminalLogEvent.ERROR_BOUNDARY,
      'Terminal component crashed',
      error,
      { componentStack: info.componentStack }
    )
  }
}
```

---

### Graceful Degradation

**Library Load Failure** (TerminalCore.tsx):
- **Scenario**: xterm.js fails to load or initialize
- **Fallback**: Display basic `<textarea>` with similar styling
- **User Impact**: Reduced functionality (no ANSI colors, no history), but terminal still works
- **Logging**: `TerminalLogEvent.LIBRARY_LOAD_ERROR`

**Render Errors** (TerminalOutput.tsx):
- **Scenario**: Invalid ANSI sequence or malformed output
- **Fallback**: Strip ANSI codes, render plain text
- **User Impact**: Minimal (content displayed without formatting)
- **Logging**: `TerminalLogEvent.RENDER_ERROR`

**Input Validation Errors** (TerminalInput.tsx):
- **Scenario**: Input exceeds 2000 char limit
- **Fallback**: Reject keystroke, show warning message
- **User Impact**: Cannot type more, clear visual feedback
- **Logging**: `TerminalLogEvent.INPUT_VALIDATION_ERROR`

---

### Structured Log Event Types

**Defined in**: `contracts/Logger.interface.ts`

**Event Categories**:

1. **Initialization Events**:
   - `INIT_START` - Terminal initialization started
   - `INIT_SUCCESS` - Terminal initialized successfully
   - `INIT_ERROR` - Terminal initialization failed
   - `LIBRARY_LOAD_ERROR` - xterm.js library failed to load

2. **Command Events**:
   - `COMMAND_EXECUTED` - User executed a command
   - `COMMAND_ERROR` - Command execution failed
   - `INPUT_VALIDATION_ERROR` - Input validation failed

3. **Buffer Events**:
   - `BUFFER_OVERFLOW` - Output buffer exceeded 10000 lines
   - `HISTORY_OVERFLOW` - Command history exceeded 100 entries

4. **Performance Events**:
   - `PERFORMANCE_SLOW` - Slow operation detected (>100ms input lag)
   - `RESIZE` - Terminal resized (FitAddon triggered)

5. **Error Events**:
   - `RENDER_ERROR` - Render operation failed
   - `ERROR_BOUNDARY` - Error boundary caught exception

**Log Format** (JSON):
```json
{
  "timestamp": "2026-02-14T10:30:00.123Z",
  "level": "error",
  "event": "terminal.command.error",
  "message": "Command execution failed",
  "context": {
    "command": "/post Hello",
    "terminalConfig": { "cols": 80, "rows": 30, "viewport": "desktop" }
  },
  "error": {
    "name": "NetworkError",
    "message": "Failed to fetch",
    "stack": "..."
  }
}
```

**Logging Destinations**:
- **Development**: `console.error()` for errors, `console.debug()` for info
- **Production**: Sentry (if configured) for errors, console for warnings
- **Future**: Structured log aggregation service (e.g., LogRocket, Datadog)

---

## Appendix: Current vs. Refactored Structure

### Before Refactoring
```
Terminal.tsx (560 lines)
├── XTerm initialization (lines 46-108)
├── Keyboard input handling (lines 110-320)
├── Command history (lines 25-26, 340-380)
├── Autocomplete (lines 29, 400-430)
├── Cursor navigation (lines 32, 240-280)
├── Password masking (lines 22, 200-220)
├── Output rendering (lines 460-520)
├── Responsive config (lines 34-44, 140-160)
└── Window resize (lines 540-558)
```

### After Refactoring
```
Terminal.tsx (~80 lines) - Integration layer
terminal/TerminalCore.tsx (~120 lines) - xterm.js lifecycle
terminal/TerminalInput.tsx (~150 lines) - Keyboard handling
terminal/TerminalOutput.tsx (~80 lines) - Output rendering
terminal/TerminalStyling.tsx (~60 lines) - Theme & responsive
terminal/TerminalState.tsx (~100 lines) - State management
terminal/TerminalErrorBoundary.tsx (~40 lines) - Error boundary
```

**Total**: ~630 lines across 7 files (still meets <862 line target due to elimination of duplication and cleaner abstractions)
