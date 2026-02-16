# Implementation Plan: Custom Terminal Emulator

**Branch**: `001-custom-terminal-emulator` | **Date**: 2026-02-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-custom-terminal-emulator/spec.md`

## Summary

Replace xterm.js with a custom-built terminal emulator that enables precise inline image rendering with perfect scroll synchronization and full ANSI escape code support. The current xterm.js implementation uses complex overlay positioning that cannot reliably keep images aligned with text during scroll operations. A custom solution will render text AND images in a unified DOM-based coordinate system, eliminating position drift and lag while maintaining all terminal behaviors (cursor movement, line editing, ANSI codes, command history, ASCII frame centering for MUD-style UI).

**Technical Approach**: Build DOM-based terminal renderer using character-cell grid layout with inline image slots, supporting full terminal input handling (cursor positioning, line editing, shortcuts), comprehensive ANSI escape sequence parsing with security whitelist, ASCII frame layout/centering for MUD UI, error recovery with React error boundary, and >90% unit test coverage across all modules.

## Technical Context

**Language/Version**: TypeScript 5.x with React 19.2.0
**Primary Dependencies**: None (removing xterm.js); build from scratch using native DOM + React
**Storage**: Browser sessionStorage for temporary state; no persistence (command history and scroll buffer session-only)
**Testing**: Vitest for unit tests, React Testing Library for component tests, >90% code coverage target
**Target Platform**: Modern browsers (Chrome/Firefox/Safari) on desktop and mobile (iOS 15+, Android 10+)
**Project Type**: Web application (existing frontend/backend split)
**Performance Goals**:
- < 16ms frame time for 60fps scrolling
- < 50ms input lag from keypress to visual update
- < 100ms tab completion activation
- < 200ms terminal resize operations
- Support 10,000+ line scrollback buffer without performance degradation

**Constraints**:
- Must maintain visual parity with existing green-on-black MUD aesthetic
- **CRITICAL**: Must be fully responsive across ALL device types:
  - **Mobile** (≤640px): 10px font, 40 cols, 24 rows, touch input, 280px max images
  - **Tablet** (641-1024px): 12px font, 60 cols, 28 rows, touch/mouse hybrid, 400px max images
  - **Desktop** (>1024px): 14px font, 80 cols, 30 rows, mouse/keyboard, 600px max images
- Must support both touch input (mobile/tablet) and mouse/keyboard (desktop)
- Must handle device-specific constraints (safe area insets, virtual keyboards, dynamic viewport heights)
- Must preserve all 15+ keyboard shortcuts and terminal behaviors
- Image positions must remain pixel-perfect during scroll (zero drift tolerance)
- Must work without canvas (need DOM for accessibility, text selection, images)
- Must maintain 60fps scroll performance on mobile devices (not just desktop)
- **CRITICAL**: Must be thoroughly testable with >90% unit test coverage
- **CRITICAL**: Must support ASCII frame layout and centering for MUD-style UI

**Scale/Scope**:
- ~2,500 lines of new terminal code (vs. 560 original + xterm.js library)
- 7 core modules: Renderer, InputHandler, ANSIParser, ScrollBuffer, ImageManager, LayoutCalculator, FrameRenderer
- Replace 2 dependencies (@xterm/xterm, @xterm/addon-fit)
- Maintain 100% backward compatibility with existing command system and UI components
- ~1,500 lines of test code (unit + integration tests)
- ASCII frame layout support for MUD-style UI (post borders, character sheets, etc.)

**Test Strategy**:
- **Unit tests**: Pure logic (ANSIParser, ScrollBuffer, InputBuffer, Layout calculations) - fast, isolated
- **Component tests**: React components (Renderer, InputHandler) with React Testing Library
- **Integration tests**: End-to-end flows (input → parse → buffer → render)
- **Visual regression tests**: ASCII frame rendering and centering at multiple breakpoints (optional but recommended)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Applicable Principles

This feature is **frontend-only** (no database changes), so most constitution principles (horizontal scaling, indexing, migrations) do not apply. The relevant principles are:

#### ✅ IV. Local-First Development

**Status**: PASS - No violations

- All development occurs locally via `npm run dev` (Vite dev server)
- No production database access required
- Terminal changes are client-side only
- Testing via browser DevTools and local environment

#### ✅ VII. Platform Limits Awareness

**Status**: PASS - No violations

- No D1/R2/KV usage changes
- Browser memory limits respected via buffer size caps (10,000 lines max)
- Image size limits already enforced (600px max desktop, responsive mobile/tablet)
- No new Cloudflare platform dependencies introduced

#### N/A - Other Principles

Principles I-III, V-VI do not apply (no database schema, queries, or migrations involved).

### Constitution Compliance Summary

**Verdict**: ✅ PASS - No constitution violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-custom-terminal-emulator/
├── plan.md              # This file
├── research.md          # Phase 0: Architecture decisions, rendering approaches
├── data-model.md        # Phase 1: Terminal state structures, buffer models
├── quickstart.md        # Phase 1: Developer onboarding guide
├── checklists/
│   └── requirements.md  # Spec quality validation (complete)
└── spec.md              # Feature specification (complete with clarifications)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── Terminal.tsx                    # MODIFY: Update to use CustomTerminal
│   │   └── terminal/
│   │       ├── CustomTerminalCore.tsx      # NEW: Custom renderer (replaces TerminalCore)
│   │       ├── TerminalRenderer.tsx        # NEW: DOM-based character cell renderer
│   │       ├── TerminalScrollBuffer.tsx    # NEW: Line buffer with image slots
│   │       ├── TerminalInputHandler.tsx    # NEW: Keyboard input + cursor management
│   │       ├── TerminalANSIParser.tsx      # NEW: ANSI escape sequence parser with whitelist
│   │       ├── TerminalImageManager.tsx    # NEW: Inline image positioning
│   │       ├── TerminalLayoutCalculator.tsx # NEW: Frame centering and width calculations
│   │       ├── TerminalFrameRenderer.tsx   # NEW: ASCII frame rendering
│   │       ├── TerminalStyling.tsx         # KEEP: Theme config unchanged
│   │       ├── TerminalState.tsx           # MODIFY: Update state shape if needed
│   │       └── TerminalErrorBoundary.tsx   # NEW: Error recovery with reset button
│   ├── utils/
│   │   ├── terminal-cell.ts                # NEW: Character cell model
│   │   ├── ansi-parser.ts                  # NEW: ANSI parsing utilities with whitelist
│   │   ├── layout-calculator.ts            # NEW: Layout/centering logic
│   │   ├── frame-builder.ts                # NEW: ASCII frame construction
│   │   ├── ansi-colors.ts                  # KEEP: Existing ANSI color helpers
│   │   └── terminal-responsive.ts          # KEEP: Breakpoint config unchanged
│   └── types/
│       ├── terminal.ts                     # NEW: Terminal type definitions
│       └── layout.ts                       # NEW: Layout/frame type definitions
└── package.json                            # MODIFY: Remove xterm deps, add vitest/testing-library

tests/
├── unit/
│   ├── terminal-renderer.test.ts           # NEW: Renderer tests
│   ├── ansi-parser.test.ts                 # NEW: Parser tests (100% coverage target)
│   ├── scroll-buffer.test.ts               # NEW: Buffer tests (circular logic, overflow)
│   ├── input-buffer.test.ts                # NEW: Input handler tests (cursor, insertion, deletion)
│   ├── layout-calculator.test.ts           # NEW: Layout/centering logic tests
│   ├── frame-builder.test.ts               # NEW: Frame rendering tests
│   └── viewport-calculations.test.ts       # NEW: Viewport and responsive tests
├── integration/
│   ├── terminal-e2e.test.ts                # NEW: End-to-end terminal tests
│   ├── terminal-responsive.test.ts         # NEW: Responsive behavior integration tests
│   └── terminal-layout.test.ts             # NEW: Frame centering integration tests
└── visual/                                  # OPTIONAL: Visual regression tests
    └── terminal-frames.test.ts             # NEW: Screenshot comparison for frames
```

**Structure Decision**: Web application (frontend/backend). Frontend-only changes to replace xterm.js with custom implementation while maintaining existing modular architecture. New components integrate with current Terminal.tsx orchestration layer.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - table omitted.

## Phase 0: Research & Technical Decisions

See [research.md](./research.md) for detailed findings.

### Key Research Areas & Decisions

1. **Rendering Approach**: DOM-based character grid
   - **Decision**: DOM-based character grid with inline image slots
   - **Rationale**: Accessibility, text selection, inline images without coordinate translation
   - **Alternatives Rejected**: Canvas (no accessibility), Hybrid (sync complexity)

2. **Scroll Buffer Architecture**: Circular buffer + virtual scrolling
   - **Decision**: Circular buffer (10K lines) + virtual scrolling (render visible only)
   - **Rationale**: O(1) append, memory cap, render efficiency (130 lines vs 10K)
   - **Alternatives Rejected**: Array splice (O(n) slow), Linked list (O(n) access)

3. **ANSI Parsing Strategy**: Stateful incremental parser
   - **Decision**: Stateful parser with strict whitelist security validation
   - **Rationale**: Correct state tracking, handles partial sequences, security via whitelist
   - **Supported Codes**: SGR (colors/formatting), cursor positioning (CUP, CUU, CUD, CUF, CUB), erase (ED, EL), scroll (SU, SD)
   - **Alternatives Rejected**: Regex (can't handle state), Trust all (security risk)

4. **Image Integration**: Inline DOM slots in line flow
   - **Decision**: Images as inline elements within TerminalLine DOM structure
   - **Rationale**: Zero coordinate math, automatic scroll sync, browser handles positioning
   - **Alternatives Rejected**: Overlay (original problem), Canvas (no lazy load)

5. **Input Handling**: Character echo with local buffer
   - **Decision**: Character-by-character echo, cursor state, insert mode
   - **Rationale**: Terminal fidelity, cursor positioning support
   - **Alternatives Rejected**: Line buffering (not terminal-like), Contenteditable (desyncs)

6. **Responsive Design**: Fixed breakpoints with media queries
   - **Decision**: Three breakpoints (mobile/tablet/desktop) with CSS media queries
   - **Rationale**: Predictable, browser support, performance
   - **Alternatives Rejected**: Container queries (support), Fluid scaling (unpredictable)

7. **ASCII Frame Layout**: Dynamic centering with responsive width
   - **Decision**: Pure functions calculate frame width and centering offset per breakpoint
   - **Rationale**: Testable, adapts to viewport, supports MUD-style UI aesthetic
   - **Alternatives Rejected**: Fixed width (not responsive), CSS centering (character grid)

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md) and [quickstart.md](./quickstart.md).

### Core Data Models

1. **TerminalCell**: Character with formatting (char, colors, bold, italic, underline, etc.)
2. **TerminalLine**: Array of cells with metadata (lineNumber, timestamp, wrapped flag, optional image)
3. **ScrollBuffer**: Circular buffer of lines (10K max, O(1) append/get)
4. **CursorState**: Position and visibility (row, col, visible, blinking, style)
5. **ImageSlot**: Inline image reference (url, alt, id, maxWidth, maxHeight)
6. **ANSIState**: Current text formatting state (colors, bold, italic, etc.)
7. **FrameLayout**: ASCII frame dimensions (totalWidth, contentWidth, leftPadding, borderStyle, centered)
8. **LayoutCalculator**: Pure functions for centering and width calculations
9. **ViewportState**: Visible portion tracking (scrollY, viewport dimensions, breakpoint, safeAreaInsets)
10. **InputBuffer**: Current command being typed (text, cursorPosition, maxLength)

### API Contracts

No new API endpoints - frontend-only changes. Terminal command interface remains unchanged:
- Input: `onCommand(command: string, cols: number) => void`
- Output: `setContent(content: string) => void`
- Image markers: `[IMG:url:alt]` format preserved
- Terminal ready callback: `onTerminalReady(terminal: CustomTerminal) => void`

### Testing Strategy

**Goal**: >90% code coverage with fast, reliable tests that catch regressions immediately.

**Test Pyramid**:
```
        ┌──────────┐
        │   E2E    │  <-- Few (5-10 tests, critical user flows)
        └──────────┘
      ┌──────────────┐
      │ Integration  │  <-- Some (20-30 tests, component interactions)
      └──────────────┘
    ┌──────────────────┐
    │   Unit Tests     │  <-- Many (100+ tests, individual functions)
    └──────────────────┘
```

**Unit Test Coverage** (Target: >95%):

1. **ANSIParser** (`ansi-parser.test.ts`):
   - Parse all whitelisted SGR codes (0-107): colors, bold, italic, underline, reset
   - Parse cursor positioning codes (CUP, CUU, CUD, CUF, CUB, CNL, CPL, CHA, VPA)
   - Parse erase codes (ED, EL) and scroll codes (SU, SD)
   - Handle partial sequences (split across writes)
   - Maintain state across multiple parse calls
   - **Security**: Reject non-whitelisted codes (100% rejection rate)
   - Edge cases: invalid codes, empty input, very long sequences

2. **ScrollBuffer** (`scroll-buffer.test.ts`):
   - Circular buffer append (before and after wraparound)
   - Line retrieval (valid indices, out-of-bounds)
   - Visible range calculation
   - Buffer overflow (10,001st line overwrites oldest)
   - Clear operation
   - Edge cases: empty buffer, single line, exactly 10,000 lines

3. **InputBuffer** (`input-buffer.test.ts`):
   - Insert character at cursor position
   - Delete backward/forward
   - Cursor movement (left, right, home, end)
   - Word-level operations (delete word, move word)
   - Max length enforcement (2000 chars)
   - Edge cases: cursor at start, cursor at end, empty buffer

4. **LayoutCalculator** (`layout-calculator.test.ts`):
   - Calculate frame width based on content and terminal columns
   - Calculate centering offset (left padding) for horizontal centering
   - Responsive frame sizing (mobile full-width, desktop centered)
   - Nested frame calculations (inner frame within outer frame)
   - Edge cases: content wider than terminal, very narrow terminal (40 cols), ultra-wide (120+ cols)

5. **FrameBuilder** (`frame-builder.test.ts`):
   - Build ASCII frames with different border styles (`####`, `====`, `╔══╗`, `┌──┐`)
   - Add centered content within frame
   - Apply padding and spacing
   - Edge cases: empty frame, single-line frame, frame with image

6. **ViewportCalculations** (`viewport-calculations.test.ts`):
   - Visible line range calculation from scrollY
   - Breakpoint detection (mobile/tablet/desktop)
   - Safe area inset parsing
   - Edge cases: scroll at top, scroll at bottom, very tall viewport

**Component Test Coverage** (React Testing Library):

7. **TerminalRenderer** (`terminal-renderer.test.tsx`):
   - Renders character grid correctly
   - Applies ANSI formatting (colors, bold, italic)
   - Virtual scrolling (only renders visible lines)
   - Updates on scroll
   - Responsive breakpoint changes

8. **TerminalInputHandler** (`terminal-input-handler.test.tsx`):
   - Handles keyboard events (typing, arrows, shortcuts)
   - Updates cursor position
   - Submits commands on Enter
   - Handles command history (up/down arrows)
   - Clears input on Ctrl+U

9. **TerminalFrameRenderer** (`terminal-frame-renderer.test.tsx`):
   - Renders centered frames
   - Updates frame width on resize
   - Handles nested frames
   - Centers images within frames

10. **TerminalErrorBoundary** (`terminal-error-boundary.test.tsx`):
    - Catches component errors
    - Displays error message with reset button
    - Logs error details
    - Recovers to clean state on reset

**Integration Test Coverage**:

11. **Terminal E2E** (`terminal-e2e.test.ts`):
    - Type command → parse → buffer → render
    - Scroll through content → update viewport → re-render
    - Resize terminal → recalculate dimensions → reflow
    - Display post with image → frame centers → image positions correctly
    - Handle ANSI codes end-to-end (input → parse → render)

12. **Responsive Behavior** (`terminal-responsive.test.ts`):
    - Resize from desktop → tablet → mobile (breakpoint transitions)
    - Orientation change (portrait ↔ landscape)
    - Virtual keyboard appearance (mobile)
    - Safe area insets respected

13. **Frame Layout** (`terminal-layout.test.ts`):
    - Render post with frame → centers on desktop
    - Resize to mobile → frame expands to full width
    - Render character sheet → all frames align
    - Nested frames center correctly

**Test Execution**:
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode (development)
npm run test:watch

# Run specific test file
npm test -- ansi-parser.test.ts
```

**Coverage Thresholds** (vitest.config.ts):
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 90,
      functions: 90,
      branches: 85,
      statements: 90
    }
  }
})
```

**Test Speed Target**:
- Unit tests: <5 seconds total
- Integration tests: <15 seconds total
- Full suite: <30 seconds total

## Phase 2: Implementation Tasks

**Note**: Tasks are generated via `/speckit.tasks` command - not created here.

See `tasks.md` (generated separately) for dependency-ordered implementation checklist.

## Migration Strategy

### Backward Compatibility

1. **Preserve existing API**: Terminal.tsx continues to accept same props (`onCommand`, `initialContent`, `skipWelcome`, `onTerminalReady`)
2. **Maintain command system**: All `/command` parsing logic unchanged
3. **Keep ANSI helpers**: Existing `green()`, `cyan()`, `bold()` utilities work identically
4. **Image format unchanged**: `[IMG:url:alt]` markers processed same way (but rendered differently)

### Deprecation Path

1. **Phase 1**: Implement custom terminal side-by-side with xterm.js (feature flag)
2. **Phase 2**: Test custom terminal with existing features (posts, feed, images)
3. **Phase 3**: Switch default to custom terminal
4. **Phase 4**: Remove xterm.js dependencies and old TerminalCore

### Risk Mitigation

- **Fallback**: Keep xterm.js implementation available via environment variable toggle
- **Incremental rollout**: Ship custom terminal to 10% users, monitor error rates
- **Monitoring**: Track input lag, scroll fps, image position accuracy, error boundary triggers
- **Rollback plan**: Switch back to xterm.js if critical bugs discovered

## Verification Plan

### Unit Tests

- [ ] TerminalRenderer renders character grid correctly
- [ ] ANSIParser parses all whitelisted ANSI codes (SGR, cursor, erase, scroll)
- [ ] ANSIParser rejects 100% of non-whitelisted codes
- [ ] ScrollBuffer handles line wrapping and overflow (circular buffer logic)
- [ ] InputHandler processes keyboard events accurately (cursor, insert, delete)
- [ ] ImageManager positions images inline correctly
- [ ] LayoutCalculator centers frames correctly (mobile full-width, desktop centered)
- [ ] FrameBuilder renders ASCII frames with all border styles
- [ ] ErrorBoundary catches errors and provides reset functionality

### Integration Tests

- [ ] Terminal displays posts with images inline
- [ ] Scrolling maintains image-text alignment (zero drift)
- [ ] Command history navigation works (up/down arrows, session-only)
- [ ] Tab completion functions
- [ ] All keyboard shortcuts active (Ctrl+U, Ctrl+K, Ctrl+W, Ctrl+L, arrows, etc.)
- [ ] ANSI colors and cursor codes render correctly end-to-end
- [ ] Text selection and copy works
- [ ] Error boundary recovers from crashes without page reload

### Responsive Design Tests

**Mobile (≤640px) - Test on iPhone SE, iPhone 12/13, Android Pixel:**
- [ ] Terminal renders at 10px font, 40 cols, 24 rows
- [ ] No horizontal scroll at any viewport width
- [ ] Images scale to max 280px width
- [ ] Frames use full width (no centering)
- [ ] Virtual keyboard appears without breaking layout
- [ ] Touch scroll is smooth (60fps)
- [ ] All terminal commands work with virtual keyboard input
- [ ] Safe area insets respected on iPhone X+ (notched devices)
- [ ] Dynamic viewport height handled (address bar show/hide)

**Tablet (641-1024px) - Test on iPad, iPad Pro, Android tablets:**
- [ ] Terminal renders at 12px font, 60 cols, 28 rows
- [ ] Images scale to max 400px width
- [ ] Frames centered with medium width
- [ ] Both touch and mouse input work correctly
- [ ] Orientation change (portrait/landscape) reflows content correctly
- [ ] Split-screen multitasking maintains terminal layout

**Desktop (>1024px) - Test on laptop, desktop monitor, ultra-wide:**
- [ ] Terminal renders at 14px font, 80 cols, 30 rows
- [ ] Images scale to max 600px width
- [ ] Frames centered with maximum width
- [ ] Mouse wheel scroll is smooth (60fps)
- [ ] Keyboard shortcuts all functional
- [ ] Window resize dynamically adjusts terminal dimensions
- [ ] Ultra-wide displays (>2000px) don't stretch awkwardly

**Cross-Device:**
- [ ] Resize browser from mobile → tablet → desktop updates terminal
- [ ] Device rotation updates terminal orientation correctly
- [ ] Performance maintains 60fps across all device types
- [ ] Image positions stay synchronized at all breakpoints
- [ ] Frame centering recalculates correctly on resize

### Acceptance Criteria (from spec.md)

**Images & Scrolling:**
- [ ] SC-001: Images appear at intended positions with zero offset
- [ ] SC-002: Images scroll in sync with < 16ms lag (60fps)
- [ ] SC-003: Scrolling through 100+ posts is smooth
- [ ] SC-004: Image positions accurate after resize (within 1px)
- [ ] SC-005: 95% users complete tasks without noticing issues

**Terminal Behavior:**
- [ ] SC-006: Input lag < 50ms
- [ ] SC-007: All shortcuts work identically to native terminal
- [ ] SC-008: Rapid scrolling works without artifacts
- [ ] SC-009: Line editing operations complete in < 5 seconds
- [ ] SC-010: Cursor always visible and accurate
- [ ] SC-011: Tab completion activates within 100ms

**Responsive Design:**
- [ ] SC-012: Terminal loads correctly on mobile (≤640px) without horizontal scroll
- [ ] SC-013: Terminal loads correctly on tablet (641-1024px)
- [ ] SC-014: Terminal loads correctly on desktop (>1024px)
- [ ] SC-015: Terminal resize completes within 200ms on viewport change
- [ ] SC-016: Touch scrolling feels smooth on mobile/tablet (60fps min)
- [ ] SC-017: Virtual keyboard appears without breaking terminal layout
- [ ] SC-018: 95% mobile users complete tasks without layout/input issues

**Layout & Frames:**
- [ ] SC-019: ASCII frames center correctly at all breakpoints with equal left/right padding
- [ ] SC-020: Frame width calculations adapt when terminal resizes within 100ms
- [ ] SC-021: Nested frames render with proper alignment without border breaks

**Testing & Quality:**
- [ ] SC-022: Test suite achieves >90% code coverage across all core modules
- [ ] SC-023: Unit tests run in <5 seconds
- [ ] SC-024: Integration tests validate end-to-end flows with 100% pass rate
- [ ] SC-025: Test suite catches regressions immediately (zero false negatives)
- [ ] SC-026: Developers can run `npm test` and see clear failure messages

**Error Recovery:**
- [ ] SC-027: Terminal recovers from component crashes within 2 seconds via error boundary reset
- [ ] SC-028: ANSI parser rejects 100% of non-whitelisted escape sequences
- [ ] SC-029: Terminal error boundary logs all crashes with sufficient detail for debugging

## Next Steps

1. ✅ Complete specification (spec.md) - DONE (with clarifications)
2. ✅ Complete implementation plan (this file) - DONE
3. ✅ Complete Phase 0 research (research.md) - DONE
4. ✅ Complete Phase 1 design (data-model.md, quickstart.md) - DONE
5. ⏭️ Run `/speckit.tasks` to generate dependency-ordered implementation tasks
6. ⏭️ Begin implementation with Phase 2 tasks:
   - Core data structures (TerminalCell, TerminalLine)
   - ScrollBuffer with circular buffer logic
   - ANSIParser for escape sequence handling with whitelist validation
   - TerminalRenderer with virtual scrolling
   - TerminalInputHandler with cursor management
   - LayoutCalculator and FrameRenderer for ASCII frames
   - TerminalErrorBoundary for crash recovery
7. ⏭️ Write comprehensive unit tests (target >90% coverage)
8. ⏭️ Integration testing and responsive testing across all devices
9. ⏭️ Migration testing with existing features
10. ⏭️ Incremental rollout and monitoring
