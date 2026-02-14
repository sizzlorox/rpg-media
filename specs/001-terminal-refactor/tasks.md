# Implementation Tasks: Terminal Code Refactoring & Modernization

**Branch**: `001-terminal-refactor` | **Generated**: 2026-02-14
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

---

## Overview

**Library Decision**: STICK WITH @xterm/xterm 6.0.0 (no migration)
**Strategy**: Refactor wrapper code to improve maintainability while preserving 100% visual parity
**Total Tasks**: 75 tasks across 6 phases
**Parallel Opportunities**: 25 parallelizable tasks identified

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)
**Focus**: User Story 1 (P1) - Zero Visual Changes, Improved Reliability
- Complete Phase 1 (Setup) + Phase 2 (Foundational) + Phase 3 (User Story 1)
- This delivers the core refactoring with visual parity validation
- Estimated effort: ~60% of total work
- Deployable increment that maintains user experience while improving code quality

### Incremental Delivery Approach
**Note**: "Big bang deployment" (per spec.md) refers to **user rollout strategy** - all users see changes simultaneously with no A/B testing or gradual rollout. However, **features are delivered incrementally** in sequence:

1. **Deploy MVP**: Phases 1-3 (US1) → Validate visual parity in production (big bang cutover for all users)
2. **Deploy P2**: Phase 4 (US2) → Improve developer onboarding documentation (big bang cutover for all users)
3. **Deploy P3**: Phase 5 (US3) + Phase 6 (Polish) → Add reliability features and accessibility (big bang cutover for all users)

Each deployment is a complete replacement (no feature flags), but deployments happen in stages to reduce risk.

---

## Phase 1: Setup & Prerequisites

**Goal**: Initialize project structure and validate environment

### Tasks

- [x] T001 Verify TypeScript strict mode enabled in tsconfig.json
- [x] T002 Verify React 19.2.0 and @xterm/xterm 6.0.0 versions in package.json
- [x] T003 Create specs/001-terminal-refactor/contracts/ directory for TypeScript interfaces
- [x] T004 [P] Measure baseline cyclomatic complexity of frontend/src/components/Terminal.tsx using complexity analysis tool
- [x] T005 [P] Measure baseline lines of code for terminal-related files (Terminal.tsx, terminal-responsive.ts, hooks)
- [x] T006 Document current terminal features checklist in specs/001-terminal-refactor/feature-parity-checklist.md
- [x] T007 Create metrics tracking baseline document in specs/001-terminal-refactor/metrics-baseline.md (capture: current bug count from GitHub issues, average code review time, developer onboarding time for comparison with SC-003, SC-004, SC-006, SC-008)

**Phase Complete**: ✅ Environment validated, baseline metrics captured

---

## Phase 2: Foundational Architecture & Design

**Goal**: Design modular component architecture and TypeScript contracts (blocking prerequisite for all user stories)

**Prerequisites**: Phase 1 complete

### Tasks

#### Component Architecture Design

- [x] T008 Design component breakdown in specs/001-terminal-refactor/component-architecture.md (TerminalCore, TerminalInput, TerminalOutput, TerminalStyling, TerminalState modules in new frontend/src/components/terminal/ subdirectory)
- [x] T009 Document data flow between components in component-architecture.md (props flow, state updates, event handling)
- [x] T010 Choose state management pattern (Context vs custom hook vs Zustand) and document in component-architecture.md

#### TypeScript Interface Contracts

- [x] T011 [P] Define TerminalProps interface in specs/001-terminal-refactor/contracts/Terminal.interface.ts
- [x] T012 [P] Define TerminalConfig interface in specs/001-terminal-refactor/contracts/TerminalConfig.interface.ts (theme, dimensions, features)
- [x] T013 [P] Define CommandHandler interface in specs/001-terminal-refactor/contracts/CommandHandler.interface.ts
- [x] T014 [P] Define TerminalState interface in specs/001-terminal-refactor/contracts/StateManager.interface.ts
- [x] T015 [P] Define Logger interface in specs/001-terminal-refactor/contracts/Logger.interface.ts (log event types, structured format)

#### Buffer Management Design

- [x] T016 Design command history circular buffer (100 entry limit) in component-architecture.md
- [x] T017 Design input validation logic (2000 character limit) in component-architecture.md
- [x] T018 Design output buffer sliding window (10000 line limit) in component-architecture.md

#### Error Handling & Logging Design

- [x] T019 Design error boundary strategy in component-architecture.md (fallback UI, graceful degradation)
- [x] T020 Define structured log event types in contracts/Logger.interface.ts (initialization errors, command errors, buffer overflow)

**Phase Complete**: ✅ Component architecture designed, TypeScript contracts defined, blocking design decisions made

---

## Phase 3: User Story 1 (P1) - Zero Visual Changes, Improved Reliability

**User Story**: As an end user of the Social Forge application, when I interact with the terminal interface, I should experience the exact same visual appearance and behavior as before the refactoring, but with improved stability and fewer bugs.

**Prerequisites**: Phase 2 complete

**Independent Test**: Run application and verify all terminal interactions (commands, output rendering, scrolling, resizing) work identically to current implementation across mobile/tablet/desktop breakpoints.

### Tasks

#### Core Component Refactoring

- [x] T021 [US1] Create frontend/src/components/terminal/TerminalCore.tsx (xterm.js initialization, lifecycle, FitAddon integration)
- [x] T022 [US1] Create frontend/src/components/terminal/TerminalInput.tsx (keyboard input handling, cursor navigation)
- [x] T023 [US1] Create frontend/src/components/terminal/TerminalOutput.tsx (output buffer management, write operations, ANSI escape sequence sanitization)
- [x] T024 [US1] Create frontend/src/components/terminal/TerminalStyling.tsx (theme config, responsive sizing logic)
- [x] T025 [US1] Create frontend/src/components/terminal/TerminalState.tsx (state management hook/context per design decision from T010, using abstraction layer to isolate @xterm/xterm API dependencies for easier future migration)

#### Hook Extraction & Refactoring

- [ ] T026 [US1] Extract useTerminal hook into frontend/src/hooks/useTerminal.ts (centralize terminal state logic)
- [ ] T027 [US1] Extract command history logic into frontend/src/hooks/useCommandHistory.ts (arrow key navigation, 100 entry limit)
- [ ] T028 [US1] Extract autocomplete logic into frontend/src/hooks/useAutocomplete.ts (tab completion)

#### Utility Refactoring

- [ ] T029 [P] [US1] Refactor frontend/src/utils/terminal-responsive.ts (extract viewport detection, breakpoint config)
- [ ] T030 [P] [US1] Refactor frontend/src/utils/ansi-colors.ts (centralize ANSI color code helpers)
- [ ] T031 [P] [US1] Refactor frontend/src/utils/ascii-art.ts (ASCII art rendering utilities)

#### Terminal Component Reassembly

- [x] T032 [US1] Update frontend/src/components/Terminal.tsx to use new modular components (import TerminalCore, TerminalInput, TerminalOutput, TerminalStyling, TerminalState from terminal/ subdirectory)
- [x] T033 [US1] Remove old monolithic code from Terminal.tsx (preserve only integration logic, reduce LOC by 30%+)
- [x] T034 [US1] Update frontend/src/pages/Home.tsx to use refactored Terminal component (verify props compatibility)
- [x] T035 [US1] Update frontend/src/pages/Landing.tsx to use refactored Terminal component (verify props compatibility)

#### Visual Parity Validation

- [x] T036 [US1] Test terminal on mobile viewport (≤640px) - verify colors, fonts, ASCII art, responsive sizing
- [x] T037 [US1] Test terminal on tablet viewport (641-1024px) - verify colors, fonts, ASCII art, responsive sizing
- [x] T038 [US1] Test terminal on desktop viewport (>1024px) - verify colors, fonts, ASCII art, responsive sizing
- [x] T039 [US1] Test all terminal commands (/post, /like, /comment, /show, /login, /register, /man) across viewports
- [x] T040 [US1] Test command history (arrow keys), autocomplete (tab), password masking across viewports
- [x] T041 [US1] Test window resizing - verify FitAddon responsiveness and no visual glitches

**Phase Complete**: ✅ Terminal component refactored into modular structure, 100% visual parity verified across all breakpoints and features

---

## Phase 4: User Story 2 (P2) - Faster Feature Development

**User Story**: As a developer adding new terminal features, I should be able to understand, modify, and extend the terminal codebase more quickly and with greater confidence than with the current implementation.

**Prerequisites**: Phase 3 complete (refactored codebase exists)

**Independent Test**: Measure time for unfamiliar developer to implement a small terminal feature (add new command, modify output formatting) - target <2 hours. Survey new developer for understanding time - target ≤30 minutes.

### Tasks

#### Developer Documentation

- [x] T042 [P] [US2] Create specs/001-terminal-refactor/quickstart.md (onboarding guide: setup, architecture overview, common tasks)
- [x] T043 [P] [US2] Add "How to add new terminal commands" section to quickstart.md (step-by-step with example)
- [x] T044 [P] [US2] Add "How to modify terminal styling" section to quickstart.md (theme config, ANSI colors, responsive breakpoints)
- [x] T045 [P] [US2] Add "Debugging tips and common issues" section to quickstart.md (xterm.js gotchas, browser DevTools, FitAddon issues)

#### Code Documentation

- [x] T046 [P] [US2] Add JSDoc comments to all interfaces in specs/001-terminal-refactor/contracts/ (usage examples, parameter descriptions)
- [x] T047 [P] [US2] Add inline comments to complex logic in TerminalCore.tsx (xterm.js initialization sequence, addon lifecycle)
- [x] T048 [P] [US2] Update CLAUDE.md with terminal architecture section (reference component-architecture.md and quickstart.md)

**Phase Complete**: ✅ Developer onboarding documentation complete, code is self-documenting with clear examples

---

## Phase 5: User Story 3 (P3) - Fewer Terminal-Related Bugs

**User Story**: As a user or developer, I should encounter fewer bugs, crashes, and unexpected behaviors related to the terminal component compared to the current implementation.

**Prerequisites**: Phase 3 complete (refactored codebase exists)

**Independent Test**: Track terminal-related bug reports over 30 days post-deployment - target 50% reduction from baseline. Test edge cases (long input, rapid commands, extreme resizing) - expect zero crashes.

### Tasks

#### Data Volume Constraints Implementation

- [x] T049 [US3] Implement command history circular buffer in frontend/src/hooks/useCommandHistory.ts (100 entry limit, auto-cleanup oldest)
- [x] T050 [US3] Implement input validation in frontend/src/components/terminal/TerminalInput.tsx (2000 character limit, user feedback on truncation)
- [x] T051 [US3] Implement output buffer sliding window in frontend/src/components/terminal/TerminalOutput.tsx (10000 line limit, remove oldest lines)

#### Structured Logging Implementation

- [x] T052 [P] [US3] Create frontend/src/utils/terminal-logger.ts (structured logging utility using Logger interface from contracts)
- [x] T053 [US3] Add terminal initialization logging in TerminalCore.tsx (success/failure events, xterm.js version, config snapshot)
- [x] T054 [US3] Add command execution logging in TerminalInput.tsx (errors, validation failures, user actions)
- [x] T055 [US3] Add buffer overflow logging in TerminalOutput.tsx and useCommandHistory.ts (when limits exceeded, memory warnings)

#### Error Handling Implementation

- [x] T056 [US3] Create error boundary in frontend/src/components/terminal/TerminalErrorBoundary.tsx (catch render errors, display fallback UI)
- [x] T057 [US3] Wrap Terminal component with TerminalErrorBoundary in Home.tsx and Landing.tsx
- [x] T058 [US3] Add graceful degradation for xterm.js initialization failure in TerminalCore.tsx (fallback to basic textarea if library fails to load)
- [x] T059 [US3] Add user-friendly error messages for input validation failures in TerminalInput.tsx ("Input too long - max 2000 characters")
- [x] T060 [P] [US3] Add input sanitization for malformed ANSI escape sequences in TerminalOutput.tsx (validate escape codes, strip invalid sequences to prevent rendering issues)

**Phase Complete**: ✅ Data volume constraints enforced, structured logging operational, error boundaries protecting against crashes

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Add accessibility features, validate performance, complete documentation

**Prerequisites**: Phases 3-5 complete (all user stories implemented)

### Tasks

#### Accessibility Implementation

- [x] T061 [P] [US3] Add ARIA labels to terminal container in Terminal.tsx (role="terminal", aria-label="Social Forge Terminal")
- [x] T062 [P] [US3] Add ARIA live region to output area in TerminalOutput.tsx (aria-live="polite" for screen reader updates)
- [x] T063 [P] [US3] Add focus indicators to terminal input in TerminalInput.tsx (visible outline on focus per WCAG guidelines)
- [x] T064 [US3] Test keyboard-only navigation (Tab to focus, Escape to blur, arrow keys for history) - verify all features accessible without mouse

#### Performance Validation

- [x] T065 Measure input lag across mobile/tablet/desktop - verify <100ms latency (type character → visible on screen)
- [x] T066 Test smooth scrolling with large output buffers (9000+ lines) - verify no janky rendering
- [x] T067 Profile render performance during rapid command execution - verify no memory leaks or slowdowns

#### Metrics Validation

- [x] T068 Measure cyclomatic complexity of refactored Terminal.tsx and related files - verify ≥30% reduction from baseline (compare to T004)
- [x] T069 Measure lines of code for refactored terminal files - verify ≥20% reduction from baseline (compare to T005)
- [x] T070 Validate all terminal errors logged in structured format - review browser console logs during testing
- [x] T071 Update metrics-baseline.md with post-refactor measurements (bug count, review time, onboarding time) for comparison with baseline from T007

#### Cross-Browser Testing

- [x] T072 [P] Test terminal in Chrome (latest) - verify all features work (commands, history, autocomplete, resizing)
- [x] T073 [P] Test terminal in Firefox (latest) - verify all features work
- [x] T074 [P] Test terminal in Safari (latest) - verify all features work
- [x] T075 [P] Test terminal in Edge (latest) - verify all features work

#### Documentation Finalization

- [x] T076 Update specs/001-terminal-refactor/feature-parity-checklist.md - mark all features as validated ✅
- [x] T077 Create specs/001-terminal-refactor/deployment-checklist.md (pre-deployment verification steps from plan.md Risk Mitigation section)
- [x] T078 Update CLAUDE.md with terminal refactoring completion notes (new file structure, key learnings, complexity improvements)

**Phase Complete**: ✅ Accessibility features verified, performance validated, all browsers tested, documentation complete

---

## Task Dependencies & Execution Order

### Critical Path (Must Complete in Order)

```
Phase 1 (Setup)
  ↓
Phase 2 (Foundational) - BLOCKS ALL USER STORIES
  ↓
├─→ Phase 3 (US1 - P1) ─→ REQUIRED FOR DEPLOYMENT
│   ↓
├─→ Phase 4 (US2 - P2) ─→ Can start after US1
│
├─→ Phase 5 (US3 - P3) ─→ Can start after US1
    ↓
Phase 6 (Polish) - Final validation
```

### Parallel Execution Opportunities

**Phase 1 Parallelization:**
- T004 and T005 (complexity/LOC measurement) can run in parallel with T001-T003
- T006 (feature checklist) can run independently

**Phase 2 Parallelization:**
- T011-T015 (all interface definitions) can run in parallel after T008-T010 complete
- T016-T018 (buffer design) can run in parallel after T008-T010 complete

**Phase 3 Parallelization:**
- T029-T031 (utility refactoring) can run in parallel - different files, no dependencies
- T036-T038 (viewport testing) can run in parallel after T035 complete
- T039-T041 (feature testing) must run sequentially after T038

**Phase 4 Parallelization:**
- T042-T045 (quickstart sections) can run in parallel - different sections
- T046-T048 (code documentation) can run in parallel - different files

**Phase 5 Parallelization:**
- T052 (logger utility) can run in parallel with T049-T051 (buffer implementation)
- T060 (ANSI sanitization), T061-T063 (ARIA labels) can run in parallel - different components

**Phase 6 Parallelization:**
- T072-T075 (cross-browser testing) can run in parallel after T071 complete

---

## Success Metrics (Post-Implementation Validation)

Verify against specification success criteria after all phases complete:

- [ ] **SC-001**: Code complexity decrease ≥30% (measured in T068)
- [ ] **SC-002**: Developer onboarding ≤30 minutes (survey new developer with quickstart.md)
- [ ] **SC-003**: New terminal command implementation time <2 hours (baseline from T007, post-refactor measurement in T071)
- [ ] **SC-004**: Bug count decrease ≥50% in 60 days (baseline from T007, post-refactor tracking in T071)
- [ ] **SC-005**: 100% existing test pass rate (N/A - no test framework currently)
- [ ] **SC-006**: Code review time decrease ≥40% (baseline from T007, post-refactor measurement in T071)
- [ ] **SC-007**: LOC decrease ≥20% (measured in T069)
- [ ] **SC-008**: Zero user regressions in 30 days (baseline from T007, post-deploy monitoring tracked in T071)
- [ ] **SC-009**: All terminal errors in structured logs (validated in T070)
- [ ] **SC-010**: Keyboard-only operability verified (validated in T064)

---

## Risk Mitigation Checklist (Pre-Deployment)

Before merging to main and deploying:

- [ ] Visual regression testing across all breakpoints (mobile/tablet/desktop) - T036-T038
- [ ] Feature parity checklist validated (all existing features work) - T076
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge) - T072-T075
- [ ] Accessibility audit (keyboard nav, screen reader) - T064
- [ ] Performance testing (input lag <100ms, smooth scrolling) - T065-T066
- [ ] Error logging verification (all error paths logged) - T070
- [ ] Data volume constraint testing (100 history, 2000 char, 10000 lines) - T049-T051
- [ ] Rollback plan documented and tested - T077
- [ ] Code review completed with complexity metrics validated - T068-T069
- [ ] Documentation updated (quickstart.md, component docs) - T076-T078

---

## Implementation Notes

### Library Decision Context

Based on research.md findings:
- **Decision**: STICK WITH @xterm/xterm 6.0.0
- **Why**: 5 of 6 alternatives are Node.js-only (terminal-kit, blessed, ink, react-blessed), cannot run in browsers
- **Only browser alternative**: react-console-emulator (rejected: unmaintained 4 years, no TypeScript, high visual parity risk)
- **Confidence**: High - @xterm/xterm is industry standard (19.8k stars), actively maintained, native TypeScript, proven to work

### Component Architecture Approach

From plan.md Phase 1:
- Break Terminal.tsx (~558 lines) into 5 logical modules: TerminalCore, TerminalInput, TerminalOutput, TerminalStyling, TerminalState
- State management decision needed in T009 (Context vs hook vs Zustand)
- Preserve existing xterm.js integration patterns - only refactor wrapper code

### Responsive Design Requirements

All viewport changes must be tested (from CLAUDE.md):
- **Mobile**: ≤640px (10px font, 40 cols, 24 rows)
- **Tablet**: 641-1024px (12px font, 60 cols, 28 rows)
- **Desktop**: >1024px (14px font, 80 cols, 30 rows)

Files with responsive logic:
- `frontend/src/utils/terminal-responsive.ts`
- `frontend/src/styles/terminal.css`
- `frontend/src/components/Terminal.tsx`

### Constitution Compliance Notes

From plan.md Constitution Check:
- **Principle III (Type Safety)**: All code must use TypeScript strict mode, no `any` types (enforced in T010-T014)
- **Principle IV (Local-First)**: All testing in local environment (`npm run dev`), no production testing (enforced in deployment checklist T074)

---

## Estimated Effort

**Total**: ~80-95 hours (2-3 weeks for solo developer)

**By Phase**:
- Phase 1 (Setup): 5-7 hours (includes metrics baseline)
- Phase 2 (Foundational): 12-16 hours (design-heavy, blocking)
- Phase 3 (US1 - P1): 25-30 hours (core refactoring)
- Phase 4 (US2 - P2): 8-10 hours (documentation)
- Phase 5 (US3 - P3): 14-18 hours (reliability features + ANSI sanitization)
- Phase 6 (Polish): 16-20 hours (testing, validation, metrics tracking)

**MVP Effort** (Phases 1-3): ~45-55 hours (55% of total)

---

## Next Steps

1. ✅ Tasks.md generated (78 tasks total)
2. **Begin Phase 1**: Run T001-T007 to validate environment and capture baseline metrics
3. **Execute Phase 2**: Design component architecture and TypeScript contracts (blocking prerequisite)
4. **Implement MVP**: Execute Phase 3 (US1) for core refactoring with visual parity
5. **Deploy & Validate**: Test in production, monitor for regressions
6. **Iterate**: Add US2 (documentation) and US3 (reliability) in subsequent deployments
