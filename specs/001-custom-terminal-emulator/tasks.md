# Tasks: Custom Terminal Emulator

**Input**: Design documents from `/specs/001-custom-terminal-emulator/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Tests**: Comprehensive unit tests are required per User Story 7 (P1). Test tasks are included for every module with >90% coverage target.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Project structure: `frontend/src/` (web application)
- Terminal components: `frontend/src/components/terminal/`
- Utilities: `frontend/src/utils/`
- Types: `frontend/src/types/`
- Tests: `tests/unit/`, `tests/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Remove xterm.js and initialize custom terminal project structure

- [X] T001 Remove xterm.js dependencies from frontend/package.json (@xterm/xterm, @xterm/addon-fit)
- [X] T002 [P] Configure Vitest for unit testing in frontend/vite.config.ts
- [X] T003 [P] Configure test coverage thresholds in frontend/vitest.config.ts (lines: 90%, functions: 90%, branches: 85%, statements: 90%)
- [X] T004 [P] Create directory structure frontend/src/components/terminal/ for terminal modules
- [X] T005 [P] Create directory structure tests/unit/ and tests/integration/ for test files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data structures and infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 [P] Define TerminalCell interface in frontend/src/types/terminal.ts (char, colors, formatting flags)
- [X] T007 [P] Define TerminalLine interface in frontend/src/types/terminal.ts (cells array, image slot, metadata)
- [X] T008 [P] Define ANSIState interface in frontend/src/types/terminal.ts (formatting state tracking)
- [X] T009 [P] Define CursorState interface in frontend/src/types/terminal.ts (row, col, visible, blinking, style)
- [X] T010 [P] Define InputBuffer interface in frontend/src/types/terminal.ts (text, cursorPosition, maxLength)
- [X] T011 [P] Define ViewportState interface in frontend/src/types/terminal.ts (scrollY, dimensions, breakpoint, safe area insets)
- [X] T012 [P] Define ImageSlot interface in frontend/src/types/terminal.ts (url, alt, id, maxWidth, maxHeight)
- [X] T013 [P] Define FrameLayout interface in frontend/src/types/layout.ts (totalWidth, contentWidth, leftPadding, borderStyle, centered)
- [X] T014 [P] Define FrameBorderStyle interface in frontend/src/types/layout.ts (topLeft, topRight, bottomLeft, bottomRight, horizontal, vertical)
- [X] T015 Implement CircularScrollBuffer class in frontend/src/utils/scroll-buffer.ts (10,000 line max, O(1) append/get)
- [X] T016 Implement ANSIParser class in frontend/src/utils/ansi-parser.ts (stateful parser with whitelist validation)
- [X] T017 [P] Define ANSI color constants in frontend/src/utils/ansi-colors.ts (ANSI_COLORS, BRIGHT_ANSI_COLORS)
- [X] T018 [P] Define responsive breakpoint configuration in frontend/src/utils/terminal-responsive.ts (mobile/tablet/desktop configs)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Posts with Inline Images (Priority: P1) 🎯 MVP

**Goal**: Users view social media posts with images appearing inline at correct positions, scrolling naturally with content

**Independent Test**: Create a post with an image and verify the image appears exactly where it should relative to the post text, without positional offsets

### Unit Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T019 [P] [US1] Unit test for CircularScrollBuffer in tests/unit/scroll-buffer.test.ts (append, getLine, getVisibleRange, wraparound, edge cases)
- [X] T020 [P] [US1] Unit test for image parsing in tests/unit/image-parser.test.ts (parse [IMG:url:alt] markers, multiple images, edge cases)

### Implementation for User Story 1

- [X] T021 [P] [US1] Create TerminalScrollBuffer component in frontend/src/components/terminal/TerminalScrollBuffer.tsx (wrap CircularScrollBuffer with React state)
- [X] T022 [P] [US1] Create TerminalImageManager component in frontend/src/components/terminal/TerminalImageManager.tsx (parse image markers, attach to lines)
- [X] T023 [US1] Create TerminalRenderer component in frontend/src/components/terminal/TerminalRenderer.tsx (render character grid with inline images using virtual scrolling)
- [X] T024 [US1] Update Terminal.tsx in frontend/src/components/Terminal.tsx to integrate TerminalRenderer and TerminalScrollBuffer
- [X] T025 [US1] Add CSS for inline images in frontend/src/styles/terminal.css (.terminal-inline-image with max-width: 600px, responsive sizing)

### Integration Tests for User Story 1

- [X] T026 [US1] Integration test for inline image rendering in tests/integration/terminal-images.test.ts (upload image, verify position, verify scroll sync)

**Checkpoint**: At this point, images should appear inline and scroll with text - US1 fully functional

---

## Phase 4: User Story 2 - Smooth Scrolling with Content Synchronization (Priority: P1)

**Goal**: Users scroll through content and all visual elements including images move together synchronously without lag or drift

**Independent Test**: Scroll rapidly up and down through a feed with multiple images and verify images never lag behind or lose sync with text

### Unit Tests for User Story 2 ⚠️

- [X] T027 [P] [US2] Unit test for viewport calculations in tests/unit/viewport-calculations.test.ts (visible line range, scroll calculations, edge cases)
- [X] T028 [P] [US2] Unit test for virtual scrolling logic in tests/unit/virtual-scrolling.test.ts (render window calculation, buffer zones)

### Implementation for User Story 2

- [X] T029 [US2] Implement viewport state management in TerminalRenderer with useEffect hooks for scroll events
- [X] T030 [US2] Implement virtual scrolling in TerminalRenderer (render visible lines + 50-line buffer, position with absolute top)
- [X] T031 [US2] Add requestAnimationFrame batching for scroll updates in TerminalRenderer (60fps target)
- [X] T032 [US2] Implement React.memo optimization for TerminalLine components (memoize by lineNumber)

### Integration Tests for User Story 2

- [X] T033 [US2] Integration test for scroll performance in tests/integration/terminal-scroll.test.ts (rapid scroll, verify no drift, verify smooth 60fps)

**Checkpoint**: Scrolling should be smooth and images should stay perfectly aligned with text - US2 fully functional

---

## Phase 5: User Story 3 - True Terminal Behavior and Input Handling (Priority: P1)

**Goal**: Users interact with terminal using all standard terminal input mechanisms exactly as in native terminal applications

**Independent Test**: Perform complex line editing operations and verify behavior matches a real terminal character-for-character

### Unit Tests for User Story 3 ⚠️

- [X] T034 [P] [US3] Unit test for InputBuffer in tests/unit/input-buffer.test.ts (insert, delete backward/forward, cursor movement, edge cases)
- [X] T035 [P] [US3] Unit test for keyboard shortcuts in tests/unit/keyboard-shortcuts.test.ts (Ctrl+U, Ctrl+K, Ctrl+W, Ctrl+L, Ctrl+C, arrows, etc.)
- [X] T036 [P] [US3] Unit test for command history in tests/unit/command-history.test.ts (session-only, up/down arrows, max 100 entries)

### Implementation for User Story 3

- [X] T037 [P] [US3] Create InputBufferManager class in frontend/src/utils/input-buffer.ts (insertChar, deleteBackward, deleteForward, moveCursor, clear)
- [X] T038 [US3] Create TerminalInputHandler component in frontend/src/components/terminal/TerminalInputHandler.tsx (keyboard event handling, cursor management)
- [X] T039 [US3] Implement cursor rendering in TerminalRenderer (visible cursor at correct position, blinking animation)
- [X] T040 [US3] Implement keyboard shortcuts in TerminalInputHandler (Ctrl+U, Ctrl+K, Ctrl+W, Ctrl+L, Home, End, arrows, tab)
- [X] T041 [US3] Implement command history in TerminalInputHandler (session-only, circular buffer 100 max, up/down navigation)
- [X] T042 [US3] Implement tab completion in TerminalInputHandler (autocomplete commands, cycle through matches)
- [X] T043 [US3] Implement text selection support in TerminalRenderer (mouse selection, copy to clipboard)

### Integration Tests for User Story 3

- [X] T044 [US3] Integration test for line editing in tests/integration/terminal-input.test.ts (cursor movement, insert mode, delete, shortcuts)
- [X] T045 [US3] Integration test for command history in tests/integration/terminal-history.test.ts (up/down navigation, session-only)

**Checkpoint**: All terminal input behaviors should work identically to native terminals - US3 fully functional

---

## Phase 6: User Story 5 - Responsive Design Across All Devices (Priority: P1)

**Goal**: Users access terminal from any device and experience fully functional terminal that adapts to screen size and input methods

**Independent Test**: Access terminal on different devices and verify all operations work correctly at each viewport size with appropriate input methods

### Unit Tests for User Story 5 ⚠️

- [X] T046 [P] [US5] Unit test for breakpoint detection in tests/unit/breakpoint-detection.test.ts (mobile/tablet/desktop thresholds, device capabilities)
- [X] T047 [P] [US5] Unit test for responsive image sizing in tests/unit/responsive-images.test.ts (280px mobile, 400px tablet, 600px desktop)
- [X] T048 [P] [US5] Unit test for safe area insets in tests/unit/safe-area.test.ts (iPhone X+ notch handling)

### Implementation for User Story 5

- [X] T049 [US5] Implement breakpoint detection hook in frontend/src/hooks/useResponsiveTerminal.ts (getCurrentBreakpoint, device capabilities)
- [X] T050 [US5] Implement viewport resize handling in useResponsiveTerminal (debounced resize events, orientation change)
- [X] T051 [US5] Implement virtual keyboard detection in frontend/src/hooks/useVirtualKeyboard.ts (visualViewport API, height adjustment)
- [X] T052 [US5] Add responsive CSS media queries in frontend/src/styles/terminal.css (mobile ≤640px, tablet 641-1024px, desktop >1024px)
- [X] T053 [US5] Update TerminalRenderer to use responsive dimensions from ViewportState (cols, rows, fontSize, lineHeight)
- [X] T054 [US5] Update TerminalImageManager to use responsive image sizing (maxWidth/maxHeight per breakpoint)
- [X] T055 [US5] Add safe area inset handling in CSS (env(safe-area-inset-*) for notched devices)
- [X] T056 [US5] Implement touch vs mouse input detection in TerminalInputHandler (conditional event handlers)

### Integration Tests for User Story 5

- [X] T057 [P] [US5] Integration test for mobile responsiveness in tests/integration/terminal-responsive.test.ts (resize mobile→tablet→desktop, verify dimensions)
- [X] T058 [P] [US5] Integration test for orientation change in tests/integration/terminal-orientation.test.ts (portrait→landscape, verify reflow)
- [X] T059 [P] [US5] Integration test for virtual keyboard in tests/integration/terminal-keyboard.test.ts (keyboard appearance, layout adjustment)

**Checkpoint**: Terminal should work seamlessly across mobile, tablet, and desktop devices - US5 fully functional

---

## Phase 7: User Story 4 - ANSI Color and Formatting Support (Priority: P2)

**Goal**: Users see properly formatted and colored text output using ANSI escape codes

**Independent Test**: Display content with various ANSI codes and verify all styling renders correctly

### Unit Tests for User Story 4 ⚠️

- [X] T060 [P] [US4] Unit test for ANSIParser in tests/unit/ansi-parser.test.ts (SGR codes, cursor positioning, erase codes, scroll codes, whitelist validation, partial sequences, state persistence)

### Implementation for User Story 4

- [X] T061 [US4] Implement ANSI whitelist validation in ANSIParser (reject non-whitelisted codes, security)
- [X] T062 [US4] Implement SGR code parsing in ANSIParser (colors 0-107, bold, italic, underline, dim, inverse, hidden, reset)
- [X] T063 [US4] Implement cursor positioning codes in ANSIParser (CUP, CUU, CUD, CUF, CUB, CNL, CPL, CHA, VPA)
- [X] T064 [US4] Implement erase codes in ANSIParser (ED, EL)
- [X] T065 [US4] Implement scroll codes in ANSIParser (SU, SD)
- [X] T066 [US4] Update TerminalRenderer to apply ANSI formatting to rendered cells (colors, bold, italic, underline, etc.)

### Integration Tests for User Story 4

- [X] T067 [US4] Integration test for ANSI rendering in tests/integration/terminal-ansi.test.ts (colors, formatting, cursor codes, end-to-end)

**Checkpoint**: All ANSI codes should render correctly with security whitelist - US4 fully functional

---

## Phase 8: User Story 6 - ASCII Frame Layout and Centering (Priority: P2)

**Goal**: Users viewing MUD-style UI elements see properly centered and aligned ASCII frames that adapt to terminal width

**Independent Test**: Render a post with ASCII frame borders at different terminal widths and verify frame centers correctly

### Unit Tests for User Story 6 ⚠️

- [X] T068 [P] [US6] Unit test for LayoutCalculator in tests/unit/layout-calculator.test.ts (calculateFrameLayout, centerTextInFrame, nested frames, responsive sizing)
- [X] T069 [P] [US6] Unit test for FrameBuilder in tests/unit/frame-builder.test.ts (renderFrame, border styles, centering, edge cases)

### Implementation for User Story 6

- [X] T070 [P] [US6] Implement calculateFrameLayout function in frontend/src/utils/layout-calculator.ts (responsive width, centering offset, breakpoint logic)
- [X] T071 [P] [US6] Implement centerTextInFrame function in frontend/src/utils/layout-calculator.ts (padding calculation, truncation)
- [X] T072 [P] [US6] Implement calculateNestedFrameLayout function in frontend/src/utils/layout-calculator.ts (inner frame centering)
- [X] T073 [P] [US6] Define border style constants in frontend/src/utils/frame-builder.ts (BOX_DRAWING_DOUBLE, BOX_DRAWING_SINGLE, ASCII_BASIC, ASCII_HASH)
- [X] T074 [US6] Implement renderFrame function in frontend/src/utils/frame-builder.ts (build frames with borders and content)
- [X] T075 [US6] Create TerminalFrameRenderer component in frontend/src/components/terminal/TerminalFrameRenderer.tsx (render frames using layout calculations)
- [X] T076 [US6] Implement frame resize handling in TerminalFrameRenderer (recalculate on viewport change, memoize calculations)

### Integration Tests for User Story 6

- [X] T077 [US6] Integration test for frame centering in tests/integration/terminal-layout.test.ts (desktop centered, mobile full-width, resize behavior)

**Checkpoint**: ASCII frames should center correctly across all breakpoints - US6 fully functional

---

## Phase 9: User Story 8 - Text Wrapping and Overflow Handling (Priority: P3)

**Goal**: Users viewing long lines see content wrap appropriately at terminal width boundaries with correct reflow on resize

**Independent Test**: Display content wider than terminal width, verify wrapping, then resize and verify reflow

### Unit Tests for User Story 8 ⚠️

- [X] T078 [P] [US8] Unit test for text wrapping logic in tests/unit/text-wrapping.test.ts (wrap at boundary, word break, reflow)

### Implementation for User Story 8

- [X] T079 [US8] Implement text wrapping logic in TerminalRenderer (wrap at terminal width, set wrapped flag)
- [X] T080 [US8] Implement reflow logic in TerminalRenderer (recalculate wrapping on resize, preserve content)

### Integration Tests for User Story 8

- [X] T081 [US8] Integration test for text wrapping in tests/integration/terminal-wrapping.test.ts (long lines, resize reflow)

**Checkpoint**: Text should wrap cleanly and reflow on resize - US8 fully functional

---

## Phase 10: Error Recovery and Security (Cross-Cutting)

**Purpose**: Error boundary and ANSI security for production readiness

- [X] T082 Create TerminalErrorBoundary component in frontend/src/components/terminal/TerminalErrorBoundary.tsx (catch errors, display reset button, log details)
- [X] T083 Implement error logging in TerminalErrorBoundary (component name, error message, stack trace)
- [X] T084 Implement terminal reset functionality in TerminalErrorBoundary (clear buffer, reset state, no page reload)
- [X] T085 [P] Unit test for TerminalErrorBoundary in tests/unit/error-boundary.test.ts (catch error, display message, reset works)
- [X] T086 [P] Integration test for error recovery in tests/integration/terminal-error-recovery.test.ts (trigger crash, verify recovery)

**Checkpoint**: Terminal should recover from crashes gracefully

---

## Phase 11: Integration and Migration

**Purpose**: Integrate custom terminal with existing app and remove xterm.js

- [X] T087 Create CustomTerminalCore component in frontend/src/components/terminal/CustomTerminalCore.tsx (orchestrate all terminal modules)
- [X] T088 Update Terminal.tsx to use CustomTerminalCore instead of xterm.js TerminalCore
- [X] T089 Migrate terminal styling from xterm.js to custom terminal in frontend/src/components/terminal/TerminalStyling.tsx
- [X] T090 Test backward compatibility with existing command system (ensure onCommand, initialContent, skipWelcome, onTerminalReady all work)
- [X] T091 [P] Remove old xterm.js TerminalCore.tsx backup file
- [X] T092 [P] Update CLAUDE.md to document custom terminal replacement

**Checkpoint**: Custom terminal should be fully integrated and xterm.js removed

---

## Phase 12: Polish & Test Coverage Verification (User Story 7)

**Purpose**: Verify >90% test coverage across all modules and polish implementation

**User Story 7 Goal**: Developers can run comprehensive unit tests that validate every terminal component with >90% coverage

**Independent Test**: Run `npm test` and verify all components have >90% coverage with clear pass/fail results

- [X] T093 Run test coverage report with `npm run test:coverage`
- [ ] T094 Verify ANSIParser module has ≥90% line coverage
- [ ] T095 Verify ScrollBuffer module has ≥90% line coverage
- [ ] T096 Verify InputBuffer module has ≥90% line coverage
- [ ] T097 Verify LayoutCalculator module has ≥90% line coverage
- [ ] T098 Verify FrameBuilder module has ≥90% line coverage
- [ ] T099 Verify TerminalRenderer has ≥90% line coverage
- [ ] T100 Verify TerminalInputHandler has ≥90% line coverage
- [ ] T101 Add additional unit tests for any modules below 90% coverage threshold
- [X] T102 [P] Code cleanup and refactoring (remove dead code, improve readability)
- [X] T103 [P] Performance optimization (memoization, React.memo, CSS containment)
- [ ] T104 [P] Verify all acceptance criteria from spec.md (SC-001 through SC-029)
- [ ] T105 Run quickstart.md validation (verify onboarding guide works, test examples run)

**Checkpoint**: All modules should have >90% test coverage - US7 fully functional

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Error Recovery (Phase 10)**: Can start after Foundational phase
- **Integration (Phase 11)**: Depends on US1, US2, US3, US5 completion (P1 stories)
- **Polish (Phase 12)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **US2 (P1)**: Depends on US1 (uses TerminalRenderer and ScrollBuffer)
- **US3 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **US5 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **US4 (P2)**: Depends on US1 (uses TerminalRenderer)
- **US6 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **US8 (P3)**: Depends on US1 (uses TerminalRenderer)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Core logic (utils) before React components
- Components before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003, T004, T005)
- All Foundational type definitions marked [P] can run in parallel (T006-T014, T017-T018)
- All tests within a user story marked [P] can run in parallel
- US3 and US5 can be worked on in parallel (independent of other P1 stories)
- US6 can be worked on in parallel with US4 (independent P2 stories)
- Different user stories can be worked on in parallel by different team members (after Foundational phase)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for CircularScrollBuffer in tests/unit/scroll-buffer.test.ts"
Task: "Unit test for image parsing in tests/unit/image-parser.test.ts"

# Launch all components for User Story 1 together:
Task: "Create TerminalScrollBuffer component in frontend/src/components/terminal/TerminalScrollBuffer.tsx"
Task: "Create TerminalImageManager component in frontend/src/components/terminal/TerminalImageManager.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3, 5 Only - All P1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (inline images)
4. Complete Phase 4: User Story 2 (smooth scrolling)
5. Complete Phase 5: User Story 3 (terminal input)
6. Complete Phase 6: User Story 5 (responsive design)
7. Complete Phase 10: Error Recovery
8. Complete Phase 11: Integration
9. **STOP and VALIDATE**: Test all P1 stories independently
10. Deploy/demo MVP

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Deploy/Demo (inline images)
3. Add US2 → Test independently → Deploy/Demo (smooth scrolling)
4. Add US3 → Test independently → Deploy/Demo (terminal behavior)
5. Add US5 → Test independently → Deploy/Demo (responsive)
6. Add US4 → Test independently → Deploy/Demo (ANSI colors)
7. Add US6 → Test independently → Deploy/Demo (ASCII frames)
8. Add US8 → Test independently → Deploy/Demo (text wrapping)
9. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 + 2 (image rendering + scrolling)
   - Developer B: User Story 3 (terminal input)
   - Developer C: User Story 5 (responsive design)
   - Developer D: User Story 6 (ASCII frames)
3. Stories complete and integrate independently

---

## Notes

- **Tests Required**: User Story 7 (P1) requires >90% test coverage - comprehensive unit tests included in every phase
- **Test-First**: Write tests FIRST, verify they FAIL, then implement
- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

---

## Total Task Count

- **Setup**: 5 tasks
- **Foundational**: 13 tasks
- **US1 (P1)**: 8 tasks
- **US2 (P1)**: 7 tasks
- **US3 (P1)**: 12 tasks
- **US5 (P1)**: 13 tasks
- **US4 (P2)**: 8 tasks
- **US6 (P2)**: 10 tasks
- **US8 (P3)**: 4 tasks
- **Error Recovery**: 5 tasks
- **Integration**: 6 tasks
- **Polish & Coverage**: 13 tasks
- **TOTAL**: 105 tasks

**Parallel Opportunities**: 37 tasks marked [P] can run in parallel (within their phases)

**MVP Scope** (P1 stories only): 58 tasks (Setup + Foundational + US1 + US2 + US3 + US5 + Error Recovery + Integration)
