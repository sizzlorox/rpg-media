# Implementation Plan: Terminal Code Refactoring & Modernization

**Branch**: `001-terminal-refactor` | **Date**: 2026-02-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-terminal-refactor/spec.md`

## Summary

Refactor the terminal component implementation to improve code maintainability, evaluate and potentially migrate to a superior terminal library, and ensure 1:1 visual parity with current implementation. Primary goals: reduce code complexity by 30%, improve developer onboarding time to under 30 minutes, and achieve zero user-facing regressions.

**Technical Approach**: Evaluate alternative terminal libraries (terminal-kit, blessed, react-console-emulator) prioritizing API simplicity and documentation quality. Refactor existing Terminal.tsx component and related hooks into modular, single-responsibility components with clear separation between styling, behavior, and state management. Implement structured logging for debugging and enforce data volume constraints (100 command history, 2000 char input, 10000 line buffer).

## Technical Context

**Language/Version**: TypeScript 5.9.3 (strict mode enabled)
**Framework**: React 19.2.0
**Build Tool**: Vite 7.3.1
**Current Terminal Library**: @xterm/xterm 6.0.0 + @xterm/addon-fit 0.11.0
**Alternative Libraries to Evaluate**: terminal-kit, blessed, react-console-emulator, ink, react-blessed
**Testing**: Local-first manual testing (npm run dev), no test framework currently
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (frontend-only refactoring)
**Performance Goals**: Maintain current terminal responsiveness, <100ms input lag, smooth scrolling
**Constraints**:
- 100% visual parity with current implementation (colors, fonts, borders, ASCII art)
- Maximum 2000 characters per command input
- Maximum 100 command history entries
- Maximum 10000 lines in output buffer
- Support mobile (≤640px), tablet (641-1024px), desktop (>1024px) viewports
**Scale/Scope**: Single terminal component, ~5-8 related utility files, affects ~10 pages/hooks that use terminal

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Applicability Assessment**: The Social Forge Constitution (v1.0.0) focuses primarily on Cloudflare D1 database best practices. Since this is a **frontend-only refactoring with no database changes**, most constitution principles do not apply directly.

### Applicable Principles

✅ **Principle III: Type Safety & Schema Strictness** (Adapted for TypeScript)
- **Status**: COMPLIANT
- **Application**: All terminal code must use TypeScript strict mode (already enabled), no `any` types (FR-004), proper TypeScript generics for type safety
- **Justification**: TypeScript strict mode provides equivalent type safety guarantees for frontend code as STRICT tables provide for database schemas

✅ **Principle IV: Local-First Development** (Adapted for Frontend)
- **Status**: COMPLIANT
- **Application**: All development and testing in local environment using `npm run dev`, visual regression testing locally before deployment
- **Justification**: Equivalent to database local-first development - protects production users, enables faster iteration

### Non-Applicable Principles

- **Principle I: Horizontal Database Scaling** - N/A (frontend component, no database)
- **Principle II: Index-First Performance** - N/A (no database queries)
- **Principle V: Batch Operations & Concurrency** - N/A (no database operations)
- **Principle VI: Migration Safety** - N/A (no database migrations)
- **Principle VII: Platform Limits Awareness** - Partially relevant (browser memory limits, but handled by buffer constraints in spec)

**Constitution Gate**: ✅ **PASS** - No violations. Feature aligns with applicable principles (type safety, local-first development) and explicitly defines constraints that prevent browser memory issues.

## Project Structure

### Documentation (this feature)

```text
specs/001-terminal-refactor/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (in progress)
├── research.md          # Phase 0: Library evaluation findings
├── component-architecture.md  # Phase 1: Refactored component design
├── contracts/           # Phase 1: Component interfaces & props contracts
│   ├── Terminal.interface.ts
│   ├── TerminalConfig.interface.ts
│   ├── CommandHandler.interface.ts
│   └── StateManager.interface.ts
├── quickstart.md        # Phase 1: Developer onboarding guide
└── tasks.md             # Phase 2: Implementation tasks (created by /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── Terminal.tsx              # Main terminal component (REFACTOR - becomes integration layer)
│   │   ├── terminal/                 # NEW: Modular terminal subcomponents
│   │   │   ├── TerminalCore.tsx      # xterm.js initialization & lifecycle
│   │   │   ├── TerminalInput.tsx     # Input handling & cursor navigation
│   │   │   ├── TerminalOutput.tsx    # Output buffer management & rendering
│   │   │   ├── TerminalStyling.tsx   # Theme config & responsive sizing
│   │   │   ├── TerminalState.tsx     # State management (hook or context)
│   │   │   └── TerminalErrorBoundary.tsx  # Error boundary component
│   │   ├── TerminalPost.tsx          # Terminal post rendering
│   │   ├── TerminalXPBar.tsx         # XP bar component
│   │   ├── TerminalComment.tsx       # Comment rendering
│   │   ├── LevelUpAnimation.tsx      # Level up animations
│   │   ├── ASCIICharacterSheet.tsx   # Character sheet rendering
│   │   ├── FeatureLock.tsx           # Feature unlock display
│   │   └── ManPagePost.tsx           # Man page post rendering
│   ├── hooks/
│   │   ├── useTerminal.ts            # Terminal state hook (REFACTOR)
│   │   ├── useHomeLogic.ts           # Home page logic
│   │   ├── useTerminalCommands.ts    # Command handling
│   │   ├── useAuth.ts                # Authentication
│   │   ├── useFeed.ts                # Feed data
│   │   ├── useCharacter.ts           # Character/XP data
│   │   └── useComments.ts            # Comments data
│   ├── utils/
│   │   ├── terminal-responsive.ts    # Responsive config (REFACTOR)
│   │   ├── welcome-message.ts        # Welcome rendering
│   │   ├── ascii-logo.ts             # ASCII art generation
│   │   ├── ascii-art.ts              # ASCII utilities
│   │   ├── ansi-colors.ts            # ANSI color codes
│   │   ├── responsive-width.ts       # Width calculations
│   │   └── man-page-formatter.ts     # Man page formatting
│   ├── pages/
│   │   ├── Home.tsx                  # Home page with terminal
│   │   └── Landing.tsx               # Landing page with terminal
│   └── styles/
│       └── terminal.css              # Terminal styling
└── tests/                            # Test directory (TBD)
```

**Structure Decision**: Web application structure (frontend-only). This is a refactoring task affecting existing files in the `frontend/` directory. The terminal component and related utilities/hooks will be reorganized for better separation of concerns while maintaining the existing directory structure to minimize disruption.

**Key Files to Refactor**:
- `frontend/src/components/Terminal.tsx` (~558 lines, high complexity) → will become integration layer
- New subdirectory `frontend/src/components/terminal/` created for modular components
- `frontend/src/hooks/useTerminal.ts` (needs extraction from Terminal.tsx)
- `frontend/src/hooks/useCommandHistory.ts` (new, extracted from Terminal.tsx)
- `frontend/src/hooks/useAutocomplete.ts` (new, extracted from Terminal.tsx)
- `frontend/src/utils/terminal-responsive.ts` (configuration management)
- `frontend/src/utils/terminal-logger.ts` (new, structured logging utility)
- Related component rendering utilities

## Complexity Tracking

No constitution violations requiring justification. This feature aligns with constitution principles where applicable.

---

## Phase 0: Research & Library Evaluation

### Objectives

1. Evaluate alternative terminal libraries against selection criteria
2. Determine if migration from xterm.js is warranted
3. Document API comparison, bundle size, and developer experience findings
4. Create decision matrix for library selection

### Research Tasks

**Task 0.1: Alternative Terminal Libraries Survey**
- Research terminal-kit, blessed, react-console-emulator, ink, react-blessed
- Evaluate each library against criteria:
  - **Primary**: API simplicity, documentation quality
  - **Secondary**: Active maintenance, TypeScript support, bundle size, community size
- Document findings in comparative table format

**Task 0.2: xterm.js Current Implementation Analysis**
- Review existing Terminal.tsx implementation complexity
- Identify current pain points (complexity hotspots, unclear patterns)
- Measure current cyclomatic complexity baseline
- Document wrapper code patterns around xterm.js API

**Task 0.3: Visual Parity Feasibility Assessment**
- For each alternative library, assess:
  - Can it render ANSI escape sequences with xterm.js color compatibility?
  - Can it support custom fonts and green-on-black theme?
  - Can it handle responsive viewport sizing (mobile/tablet/desktop)?
  - Can it render ASCII art and borders correctly?
- Document any visual parity risks per library

**Task 0.4: Feature Parity Assessment**
- For each alternative library, verify support for:
  - Command history with arrow key navigation
  - Tab autocomplete
  - Password masking
  - Cursor positioning (left/right arrow editing)
  - FitAddon-equivalent responsiveness
- Document feature gaps and mitigation strategies

**Task 0.5: API Simplicity & Developer Experience Comparison**
- Compare initialization code complexity across libraries
- Compare event handling patterns (onData, keyboard input)
- Compare output rendering APIs (write, formatting)
- Evaluate documentation quality and examples availability
- Rate each library on 1-5 scale for API simplicity and DX

**Task 0.6: Bundle Size & Performance Analysis**
- Measure bundle size for each library (minified + gzipped)
- Compare against current @xterm/xterm package size
- Assess rendering performance implications
- Document trade-offs between size and features

**Task 0.7: Migration Effort Estimation**
- For top 2 candidate libraries, estimate:
  - Lines of code requiring changes
  - Risk level of visual regression
  - Testing effort required
  - Timeline for migration vs. refactoring xterm.js wrapper
- Document recommendation with justification

### Output Artifact

`research.md` containing:
- Executive summary with library recommendation
- Comparative evaluation matrix (all libraries vs. criteria)
- Visual parity risk assessment
- Feature parity analysis
- API simplicity ratings with code examples
- Bundle size comparison table
- Migration effort estimation for top candidates
- Final decision: Migrate to [library] OR Refactor xterm.js wrapper with rationale

---

## Phase 1: Component Architecture & Design

**Prerequisites**: `research.md` complete with library selection decision

### Objectives

1. Design modular component architecture with clear separation of concerns
2. Define TypeScript interfaces for all component contracts
3. Create developer onboarding guide
4. Plan accessibility implementation (keyboard navigation, ARIA labels)
5. Design structured logging approach

### Design Tasks

**Task 1.1: Component Architecture Design**
- Break down monolithic Terminal.tsx into logical modules in new `frontend/src/components/terminal/` subdirectory:
  - **TerminalCore**: Library initialization and lifecycle management
  - **TerminalInput**: Command input handling, history, autocomplete
  - **TerminalOutput**: Output buffer management, rendering, scrolling
  - **TerminalStyling**: Theme configuration, responsive sizing, ANSI colors
  - **TerminalState**: State management (content, cursor, history)
  - **TerminalErrorBoundary**: Error boundary for graceful degradation
- Terminal.tsx becomes integration layer importing from terminal/ subdirectory
- Document component relationships and data flow
- Create architecture diagram (text-based or referenced)

**Task 1.2: TypeScript Interface Contracts**
- Define interfaces for:
  - `TerminalProps` - Main component props
  - `TerminalConfig` - Configuration object (theme, dimensions, features)
  - `CommandHandler` - Command processing interface
  - `TerminalState` - State shape and mutations
  - `OutputRenderer` - Output formatting interface
- Include JSDoc comments with usage examples
- Ensure strict typing (no `any` types)

**Task 1.3: State Management Design**
- Choose state management pattern:
  - Option A: React Context for shared terminal state
  - Option B: Custom hook (useTerminal) with internal state
  - Option C: Zustand/Redux for complex state needs
- Document state shape, update patterns, and side effects
- Design state initialization and cleanup logic

**Task 1.4: Data Volume Constraints Implementation**
- Design buffer management for:
  - Command history: Circular buffer with 100 entry limit
  - Input validation: 2000 character limit with user feedback
  - Output buffer: Sliding window with 10000 line limit
- Document buffer cleanup strategies and memory management

**Task 1.5: Accessibility Implementation Plan**
- Design keyboard navigation patterns:
  - Tab order for terminal focus
  - Arrow key command history (already exists)
  - Escape key interactions
- Plan ARIA labels for screen readers:
  - Terminal role and label
  - Output region live updates
  - Input field labeling
- Document focus indicator styling

**Task 1.6: Structured Logging Design**
- Define log event types:
  - Terminal initialization success/failure
  - Library load errors
  - Command execution errors
  - Performance bottlenecks (slow renders)
  - Buffer overflow events
- Design log format (JSON structured logs)
- Choose logging destination (console.error for errors, separate debug logs)

**Task 1.7: Error Handling Strategy**
- Design error boundaries for terminal component
- Define error recovery strategies:
  - Library initialization failure → fallback UI
  - Render errors → graceful degradation
  - Input validation errors → user feedback
- Document error message standards

### Output Artifacts

**`component-architecture.md`**:
- Component breakdown with responsibilities
- Data flow diagrams
- State management approach
- Module organization plan

**`contracts/`** directory:
- `Terminal.interface.ts` - Main component interface
- `TerminalConfig.interface.ts` - Configuration types
- `CommandHandler.interface.ts` - Command processing types
- `StateManager.interface.ts` - State management types
- `Logger.interface.ts` - Logging types

**`quickstart.md`**:
- Developer onboarding guide
- Local development setup
- How to add new terminal commands
- How to modify terminal styling
- Debugging tips and common issues
- Estimated reading time: 15-20 minutes (target: <30 min onboarding)

---

## Phase 2: Implementation Planning (Output: tasks.md)

**Note**: Phase 2 is executed by the `/speckit.tasks` command, NOT by `/speckit.plan`.

This phase will generate `tasks.md` with granular implementation tasks based on the research and design artifacts created in Phases 0-1.

Expected task categories:
1. Library evaluation and selection finalization
2. Component refactoring (Terminal.tsx decomposition)
3. Hook refactoring (useTerminal.ts extraction)
4. Utility refactoring (terminal-responsive.ts, styling)
5. Data volume constraint implementation
6. Accessibility features implementation
7. Structured logging implementation
8. Testing setup and test writing
9. Visual regression testing
10. Documentation updates

---

## Success Metrics Tracking

Post-implementation, verify against specification success criteria:

- **SC-001**: Code complexity decrease ≥30% (measure with complexity analysis tool)
- **SC-002**: Developer onboarding ≤30 minutes (survey new developers)
- **SC-003**: New terminal command implementation time <2 hours (track task completion)
- **SC-004**: Bug count decrease ≥50% in 60 days (track issues)
- **SC-005**: 100% existing test pass rate (run test suite)
- **SC-006**: Code review time decrease ≥40% (measure review cycles)
- **SC-007**: LOC decrease ≥20% (compare before/after)
- **SC-008**: Zero user regressions in 30 days (monitor user feedback)
- **SC-009**: All errors in structured logs (validate log coverage)
- **SC-010**: Keyboard-only operability verified (manual accessibility audit)

---

## Risk Mitigation Checklist

Pre-deployment verification:

- [ ] Visual regression testing across all breakpoints (mobile/tablet/desktop)
- [ ] Feature parity checklist validated (all existing features work)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Accessibility audit (keyboard nav, screen reader)
- [ ] Performance testing (input lag <100ms, smooth scrolling)
- [ ] Error logging verification (all error paths logged)
- [ ] Data volume constraint testing (100 history, 2000 char, 10000 lines)
- [ ] Rollback plan documented and tested
- [ ] Code review completed with complexity metrics validated
- [ ] Documentation updated (quickstart.md, component docs)

---

## Next Steps

1. ✅ Complete this plan document
2. **Execute Phase 0**: Run research tasks to evaluate libraries and create `research.md`
3. **Execute Phase 1**: Design component architecture and create contracts
4. **Run `/speckit.tasks`**: Generate implementation tasks in `tasks.md`
5. **Implement tasks**: Execute tasks from `tasks.md`
6. **Deploy**: Follow big bang deployment strategy after thorough testing
