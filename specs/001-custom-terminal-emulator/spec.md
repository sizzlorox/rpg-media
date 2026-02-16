# Feature Specification: Custom Terminal Emulator

**Feature Branch**: `001-custom-terminal-emulator`
**Created**: 2026-02-15
**Status**: Draft
**Input**: User description: "We're going to refactor the terminal, remove the terminal packages and we will write one by ourselves because it has some constraints when it comes to rendering images. We need a full on terminal emulator pretty much and we're going to implement it by scratch so we can render images properly and when we scroll they show at the proper location. This terminal emulator has to pretty much be 1 to 1, we need this social media to be pretty much a terminal app."

## Core Principle

**This must function as a true terminal emulator** - not just a styled text display. The terminal must behave identically to a standard terminal application with full support for:
- Cursor positioning and movement (character-level control)
- Tab handling (tab stops, tab completion, tab navigation)
- All standard keyboard shortcuts and control sequences
- Line editing capabilities (insert mode, delete, backspace at any cursor position)
- Text selection and clipboard integration
- Standard terminal control characters (Ctrl+C, Ctrl+L, Ctrl+U, etc.)

Users should feel like they're using a real terminal application, not a web interface styled to look like one.

**This must be thoroughly testable** - every component must have comprehensive unit tests to ensure reliability and prevent regressions. The architecture must support:
- Isolated unit testing of each module (parser, buffer, input handler, renderer)
- Integration testing of component interactions
- Deterministic behavior that can be tested without side effects
- Clear interfaces and contracts that enable test doubles (mocks, stubs)
- Test coverage metrics to measure quality

**This must handle ASCII frame layouts and centering** - this is a social media app simulated in a terminal using MUD-like UI elements. The terminal must support layout logic for ASCII art frames:
- Centering frames (bordered content using `####`, `=====`, `╔══╗`, etc.) within terminal width
- Calculating frame widths based on terminal columns and content
- Maintaining frame alignment as terminal resizes across breakpoints
- Supporting nested frames and complex ASCII layouts
- Padding and spacing calculations for visual balance
- Horizontal centering of text within frames
- Responsive frame sizing (narrower frames on mobile, wider on desktop)

For example, a post frame should be centered on desktop (80 cols) but fill width on mobile (40 cols):
```
Desktop (80 cols):          Mobile (40 cols):
    ╔════════════╗          ╔════════════╗
    ║ Post       ║          ║ Post       ║
    ╚════════════╝          ╚════════════╝
    (centered)              (full width)
```

## Clarifications

### Session 2026-02-15

- Q: What is the exact scope of ANSI escape code support? Should the terminal support only SGR codes (colors/formatting) or full ANSI including cursor positioning and erase codes? → A: Full ANSI support including cursor positioning codes (CUP, CUU, CUD), erase codes (ED, EL), and other control sequences beyond SGR
- Q: Should command history persist across page reloads or be session-only? → A: Session-only - command history clears when page reloads or browser closes, starts fresh each session
- Q: How should the terminal handle untrusted or malicious ANSI sequences for security? → A: Strict whitelist - only allow explicitly approved ANSI codes, reject all others
- Q: Should the scroll buffer content be restored when user returns to the terminal page after navigating away? → A: Session-only buffer - scroll buffer clears when user navigates away, starts fresh on return (like traditional terminals)
- Q: How should the terminal recover from unhandled JavaScript errors or crashes? → A: Error boundary with reset - React error boundary catches crashes, shows error message with "Reset Terminal" button, logs error for debugging

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Posts with Inline Images (Priority: P1)

Users view social media posts that contain images, with images appearing inline with the text content at the correct position, scrolling naturally as they navigate through the feed.

**Why this priority**: This is the core problem driving the need for a custom terminal. The current solution cannot reliably position images inline with content, making posts with media difficult to read and understand. This functionality is essential for the app to work as intended.

**Independent Test**: Can be fully tested by creating a post with an image and verifying the image appears exactly where it should relative to the post text, without positional offsets or misalignment.

**Acceptance Scenarios**:

1. **Given** a post with an attached image in the feed, **When** user views the feed, **Then** the image appears inline directly where the image marker was placed in the post
2. **Given** multiple posts with images, **When** user views the feed, **Then** each image aligns correctly with its corresponding post content
3. **Given** a post with image at the top, **When** user loads the page, **Then** the image renders at the correct vertical position without jumping or repositioning

---

### User Story 2 - Smooth Scrolling with Content Synchronization (Priority: P1)

Users scroll through content (posts, feed, comments) and all visual elements including images move together synchronously without lag, stutter, or positional drift.

**Why this priority**: Scrolling is a fundamental interaction pattern. If images don't scroll smoothly with content or drift from their positions, the user experience becomes frustrating and unusable. This is equally critical to P1 story 1.

**Independent Test**: Can be tested by scrolling rapidly up and down through a feed with multiple images and verifying images never lag behind, jump ahead, or lose sync with their associated text content.

**Acceptance Scenarios**:

1. **Given** a feed with multiple posts containing images, **When** user scrolls down, **Then** all images move smoothly in perfect sync with text content
2. **Given** user is viewing a post with an image, **When** user scrolls up or down, **Then** the image maintains its exact position relative to the post text
3. **Given** user scrolls to the bottom and back to the top, **When** they view a previously seen post with image, **Then** the image is in the exact same position as before (no drift)
4. **Given** rapid scrolling (mousewheel, trackpad, keyboard), **When** scrolling stops, **Then** images are immediately stable at correct positions without additional settling time

---

### User Story 3 - True Terminal Behavior and Input Handling (Priority: P1)

Users interact with the terminal using all standard terminal input mechanisms including cursor movement, line editing, tab handling, and keyboard shortcuts - exactly as they would in a native terminal application like Terminal.app, iTerm2, or Windows Terminal.

**Why this priority**: This is a **terminal emulator**, not a styled input field. Users must be able to move the cursor anywhere in the input line, edit text at any position, use tab for completion and navigation, and leverage all standard terminal keyboard shortcuts. Without true terminal behavior, the application fails to deliver on its core promise of being "a terminal app". This is as critical as image rendering for the authentic terminal experience.

**Independent Test**: Can be tested by performing complex line editing operations (jump to middle of line, insert text, delete backwards, move to start, etc.) and verifying behavior matches a real terminal exactly, character-for-character.

**Acceptance Scenarios**:

1. **Given** user is typing a command, **When** user presses left/right arrows, **Then** cursor moves one character at a time in the input line
2. **Given** user presses Home or Ctrl+A, **When** executed, **Then** cursor jumps to beginning of input line
3. **Given** user presses End or Ctrl+E, **When** executed, **Then** cursor jumps to end of input line
4. **Given** cursor is in middle of input line, **When** user types characters, **Then** characters insert at cursor position (not at end)
5. **Given** cursor is in middle of input line, **When** user presses backspace, **Then** character before cursor deletes and text reflows
6. **Given** cursor is in middle of input line, **When** user presses Delete, **Then** character at cursor deletes and text reflows
7. **Given** user is typing a partial command, **When** user presses Tab, **Then** command autocompletes based on available commands
8. **Given** user presses Tab multiple times, **When** multiple matches exist, **Then** cycles through completion options
9. **Given** user has entered commands, **When** user presses up arrow, **Then** previous commands appear in reverse chronological order
10. **Given** user is viewing command history, **When** user presses down arrow, **Then** navigates forward through history
11. **Given** user selects text with mouse, **When** user copies (Ctrl+C or Cmd+C), **Then** text is copied to clipboard
12. **Given** user types Ctrl+U, **When** executed, **Then** entire input line clears
13. **Given** user types Ctrl+K, **When** executed, **Then** deletes from cursor to end of line
14. **Given** user types Ctrl+W, **When** executed, **Then** deletes word before cursor
15. **Given** user types Ctrl+L, **When** executed, **Then** screen clears while preserving command history and scroll buffer
16. **Given** terminal content extends beyond viewport, **When** user presses Page Up/Down, **Then** content scrolls by viewport height
17. **Given** user double-clicks a word, **When** clicked, **Then** entire word selects
18. **Given** user triple-clicks a line, **When** clicked, **Then** entire line selects

---

### User Story 4 - ANSI Color and Formatting Support (Priority: P2)

Users see properly formatted and colored text output that uses ANSI escape codes for styling, matching the visual design of the retro terminal aesthetic.

**Why this priority**: The app's design relies on colored text for visual hierarchy and user feedback. While not blocking core image functionality, consistent visual presentation is important for user experience and brand identity.

**Independent Test**: Can be tested by displaying content with various ANSI codes (colors, bold, underline) and verifying all styling renders correctly.

**Acceptance Scenarios**:

1. **Given** content contains ANSI color codes, **When** content renders, **Then** text displays in the specified colors
2. **Given** content uses formatting codes (bold, italic, underline), **When** content renders, **Then** formatting applies correctly
3. **Given** mixed color and formatting codes, **When** content renders, **Then** all styles combine correctly without conflicts

---

### User Story 5 - Responsive Design Across All Devices (Priority: P1)

Users access the terminal from any device (mobile phones, tablets, laptops, desktops) and experience a fully functional terminal that adapts to their screen size, touch vs. mouse input, and device constraints without loss of functionality.

**Why this priority**: The terminal must work seamlessly across all devices from day one. Mobile users represent a significant portion of traffic, and a desktop-only terminal would fail a large portion of the user base. This is as critical as the core terminal functionality itself - a broken mobile experience means the feature doesn't work for many users.

**Independent Test**: Can be tested by accessing the terminal on different devices (iPhone, Android phone, iPad, laptop, desktop monitor) and verifying all terminal operations work correctly at each viewport size with appropriate input methods.

**Acceptance Scenarios**:

1. **Given** user accesses terminal on mobile phone (≤640px), **When** page loads, **Then** terminal displays at mobile-optimized size (10px font, 40 cols, 24 rows) without horizontal scroll
2. **Given** user on mobile device, **When** typing command, **Then** virtual keyboard appears and characters input correctly
3. **Given** user accesses terminal on tablet (641-1024px), **When** page loads, **Then** terminal displays at tablet-optimized size (12px font, 60 cols, 28 rows)
4. **Given** user accesses terminal on desktop (>1024px), **When** page loads, **Then** terminal displays at full size (14px font, 80 cols, 30 rows)
5. **Given** user on touchscreen device, **When** scrolling through posts, **Then** touch scroll gestures work smoothly without lag
6. **Given** user rotates mobile device from portrait to landscape, **When** rotation completes, **Then** terminal resizes and reflows content appropriately
7. **Given** user on mobile with notched display (iPhone X+), **When** viewing terminal, **Then** content respects safe area insets and doesn't hide behind notch
8. **Given** user on device with dynamic browser bars (mobile Safari), **When** scrolling, **Then** terminal height adjusts for changing viewport height without breaking layout
9. **Given** images displayed on mobile, **When** rendered, **Then** images scale down appropriately (max 280px) and don't overflow viewport
10. **Given** images displayed on tablet, **When** rendered, **Then** images use tablet sizing (max 400px)
11. **Given** images displayed on desktop, **When** rendered, **Then** images use desktop sizing (max 600px)
12. **Given** user switches from desktop to mobile (resize browser), **When** resize occurs, **Then** terminal rows/cols/font size update dynamically without reload
13. **Given** user on mobile with small screen (iPhone SE, 375px), **When** viewing terminal, **Then** all content fits within viewport without cutoff
14. **Given** user on ultra-wide desktop (>2000px), **When** viewing terminal, **Then** terminal uses reasonable max width and doesn't stretch awkwardly

---

### User Story 6 - ASCII Frame Layout and Centering (Priority: P2)

Users viewing posts, character sheets, and other MUD-style UI elements see properly centered and aligned ASCII frames that adapt to terminal width, maintaining visual balance across all device sizes.

**Why this priority**: The social media content is presented using ASCII art frames (borders made with `####`, `=====`, `╔══╗`, etc.). These frames must be centered and properly sized, or the entire UI looks broken and unprofessional. This is essential for the MUD aesthetic and user experience.

**Independent Test**: Can be tested by rendering a post with ASCII frame borders at different terminal widths (40 cols mobile, 60 cols tablet, 80 cols desktop) and verifying the frame centers correctly and maintains proper proportions.

**Acceptance Scenarios**:

1. **Given** post with ASCII frame border on desktop (80 cols), **When** rendered, **Then** frame is centered horizontally within terminal width
2. **Given** post with ASCII frame border on mobile (40 cols), **When** rendered, **Then** frame uses full width without horizontal scroll
3. **Given** terminal is resized from desktop to tablet, **When** resize completes, **Then** frames recalculate width and re-center appropriately
4. **Given** frame content is narrower than terminal width, **When** rendered, **Then** frame is centered with equal padding on left and right
5. **Given** frame content is wider than terminal width, **When** rendered, **Then** frame scales down to fit within terminal width
6. **Given** nested frames (frame within a frame), **When** rendered, **Then** inner frame centers within outer frame correctly
7. **Given** character sheet with multiple frames, **When** rendered, **Then** all frames align consistently
8. **Given** post with image inside ASCII frame, **When** rendered, **Then** image centers within frame borders

---

### User Story 7 - Comprehensive Unit Test Coverage (Priority: P1)

Developers can run comprehensive unit tests that validate every terminal component in isolation, ensuring reliability and preventing regressions as features are added or modified.

**Why this priority**: Building a custom terminal from scratch is complex. Without thorough unit tests, bugs will slip through, regressions will occur, and maintenance will become difficult. This is critical infrastructure for long-term project health.

**Independent Test**: Can be tested by running the test suite (`npm test`) and verifying all components have test coverage with clear pass/fail results.

**Acceptance Scenarios**:

1. **Given** ANSIParser component, **When** tests run, **Then** all ANSI codes (colors, formatting, reset) parse correctly with 100% coverage
2. **Given** ScrollBuffer component, **When** tests run, **Then** circular buffer logic, line retrieval, and overflow handling all pass
3. **Given** InputBuffer component, **When** tests run, **Then** insertion, deletion, cursor movement at all positions work correctly
4. **Given** TerminalRenderer component, **When** tests run, **Then** character grid rendering, virtual scrolling, and viewport calculations validate
5. **Given** Layout/Centering logic, **When** tests run, **Then** frame centering, width calculations, and padding logic verify for all breakpoints
6. **Given** any component test fails, **When** developer reviews, **Then** error message clearly indicates what failed and why
7. **Given** developer makes code change, **When** tests rerun, **Then** any regressions are caught immediately
8. **Given** integration tests, **When** run, **Then** component interactions (parser → buffer → renderer) validate end-to-end
9. **Given** test coverage report, **When** generated, **Then** shows >90% line coverage for all core modules
10. **Given** CI/CD pipeline, **When** code is pushed, **Then** tests run automatically and block merge if failing

---

### User Story 8 - Text Wrapping and Overflow Handling (Priority: P3)

Users viewing long lines of text see content wrap appropriately at terminal width boundaries, and content reflows correctly when terminal is resized.

**Why this priority**: Important for polish and handling edge cases (long URLs, ASCII art), but not blocking core functionality. Can be refined after P1-P2 stories are stable.

**Independent Test**: Can be tested by displaying content wider than terminal width and verifying it wraps cleanly, then resizing the window and verifying content reflows.

**Acceptance Scenarios**:

1. **Given** content line exceeds terminal width, **When** line renders, **Then** it wraps at the terminal boundary without cutting off characters
2. **Given** terminal is resized smaller, **When** resize completes, **Then** content reflows to fit new width
3. **Given** terminal is resized larger, **When** resize completes, **Then** previously wrapped lines unwrap to use available space

---

### Edge Cases

#### Image and Content Handling

- What happens when an image fails to load (404, network error)?
  - System should display placeholder or error indicator at the correct inline position

- What happens when content is scrolled while images are still loading?
  - Images should appear at the correct position once loaded, even if scroll position has changed

- What happens when terminal is resized while images are visible?
  - Images should reposition correctly relative to their text anchors based on new layout

- What happens when a very large image is displayed?
  - System should constrain image to maximum dimensions while maintaining position sync

- What happens when scrolling very fast or with momentum scrolling?
  - Images should not lag, tear, or temporarily disappear during rapid scroll

- What happens when terminal receives new content while user is scrolled up viewing history?
  - New content appends without disrupting current scroll position or image positions

#### Responsive and Device-Specific

- What happens when user rotates device from portrait to landscape mid-session?
  - Terminal should recalculate dimensions, reflow content, and maintain scroll position relative to content

- What happens when virtual keyboard appears on mobile device?
  - Terminal viewport should adjust height to remain visible above keyboard, input area should not be hidden

- What happens when user zooms in/out on mobile browser?
  - Terminal should scale appropriately while maintaining aspect ratio and readability

- What happens on very small screens (iPhone SE, 320px width)?
  - Terminal should use minimum viable dimensions without horizontal scroll, possibly reducing cols to 30-35

- What happens on ultra-wide displays (>2560px)?
  - Terminal should cap maximum width to prevent excessive line lengths, possibly centering container

- What happens when browser address bar shows/hides on mobile (Safari, Chrome)?
  - Terminal height should dynamically adjust using viewport-fit and safe-area-inset to prevent content cutoff

- What happens when user switches from Wi-Fi to cellular with slow connection on mobile?
  - Terminal should remain functional, image loading should show placeholders during slow loads

- What happens when user has reduced motion preference enabled (accessibility)?
  - Terminal should disable cursor blinking and smooth scroll animations while maintaining functionality

- What happens when user switches between apps on mobile (multitasking)?
  - Terminal state should preserve, scroll position should maintain when returning to app

- What happens on landscape tablet (1024x768 rotated)?
  - Terminal should recognize as tablet breakpoint and apply appropriate sizing despite landscape orientation

#### Error Handling and Recovery

- What happens when terminal component encounters unhandled JavaScript error?
  - Error boundary catches the error, displays user-friendly message with "Reset Terminal" button
  - Error details logged for debugging (component, message, stack trace)
  - User can reset terminal to clean state without page reload

- What happens when terminal receives malformed or malicious ANSI escape sequence?
  - Parser validates against whitelist of approved codes
  - Non-whitelisted sequences are rejected/ignored
  - Terminal continues functioning normally

- What happens when scroll buffer exceeds memory limits?
  - Circular buffer enforces 10,000 line maximum
  - Oldest lines automatically removed when limit reached
  - No out-of-memory errors from unbounded buffer growth

## Requirements *(mandatory)*

### Functional Requirements

#### Core Terminal Behavior (Critical)

- **FR-001**: System MUST maintain a cursor position that can move freely within the current input line
- **FR-002**: System MUST support inserting characters at any cursor position, not just appending to end
- **FR-003**: System MUST support deleting characters before (backspace) and at (delete) cursor position
- **FR-004**: System MUST support cursor movement via arrow keys (left/right character-by-character)
- **FR-005**: System MUST support cursor jump to line start (Home/Ctrl+A) and line end (End/Ctrl+E)
- **FR-006**: System MUST support line editing operations at arbitrary cursor positions (insert mode)
- **FR-007**: System MUST support Tab key for command completion and Tab cycling through multiple matches
- **FR-008**: System MUST maintain session-only command history accessible via up/down arrows (history clears on page reload/browser close)
- **FR-009**: System MUST support keyboard control sequences (Ctrl+U, Ctrl+K, Ctrl+W, Ctrl+L, Ctrl+C, etc.) and full ANSI escape code support including:
  - **SGR (Select Graphic Rendition)**: Colors (30-37, 40-47, 90-97, 100-107, 256-color, RGB), bold, italic, underline, dim, inverse, hidden, reset
  - **Cursor positioning**: CUP (Cursor Position), CUU (Cursor Up), CUD (Cursor Down), CUF (Cursor Forward), CUB (Cursor Back), CNL (Cursor Next Line), CPL (Cursor Previous Line), CHA (Cursor Horizontal Absolute), VPA (Vertical Position Absolute)
  - **Erase functions**: ED (Erase in Display), EL (Erase in Line)
  - **Scroll functions**: SU (Scroll Up), SD (Scroll Down)
  - **Security**: Only explicitly whitelisted ANSI codes accepted, all others rejected to prevent malicious sequences
- **FR-010**: System MUST support text selection via mouse (click-drag, double-click word, triple-click line)
- **FR-011**: System MUST support copy to clipboard (Ctrl+C/Cmd+C with selection, right-click copy)
- **FR-012**: System MUST handle Page Up/Page Down for viewport scrolling

#### Rendering and Display

- **FR-013**: System MUST render text content character-by-character at specific row and column positions
- **FR-014**: System MUST render images inline at specific positions synchronized with text content
- **FR-015**: System MUST update image positions in real-time during scroll operations to maintain alignment with text
- **FR-016**: System MUST handle scroll events and update viewport without positional lag or drift
- **FR-017**: System MUST support whitelisted ANSI escape codes for text coloring, formatting, cursor control, and erase functions (as specified in FR-009), rejecting any non-whitelisted sequences
- **FR-018**: System MUST reflow content when terminal viewport is resized
- **FR-019**: System MUST handle content that exceeds viewport height with scrolling
- **FR-020**: System MUST preserve image-to-text position relationships during all viewport transformations
- **FR-021**: System MUST render images at responsive sizes based on viewport dimensions
- **FR-022**: System MUST handle image loading states (loading, loaded, error)
- **FR-023**: System MUST support multiple concurrent images in the viewport
- **FR-024**: System MUST render cursor position visibly (blinking cursor or block indicator)
- **FR-025**: System MUST update display in real-time as user types or edits text

#### Responsive Design and Device Support

- **FR-026**: System MUST adapt terminal dimensions (rows, columns, font size) based on viewport width using defined breakpoints
- **FR-027**: System MUST support mobile devices (≤640px) with optimized terminal size (10px font, 40 cols, 24 rows minimum)
- **FR-028**: System MUST support tablet devices (641-1024px) with medium terminal size (12px font, 60 cols, 28 rows minimum)
- **FR-029**: System MUST support desktop devices (>1024px) with full terminal size (14px font, 80 cols, 30 rows minimum)
- **FR-030**: System MUST prevent horizontal scrolling on all device sizes
- **FR-031**: System MUST handle touch input (tap, scroll, text selection) on mobile and tablet devices
- **FR-032**: System MUST handle mouse input (click, wheel scroll, drag selection) on desktop devices
- **FR-033**: System MUST respect safe area insets on notched devices (iPhone X and newer)
- **FR-034**: System MUST handle dynamic viewport height changes from mobile browser UI (address bar show/hide)
- **FR-035**: System MUST scale images appropriately per breakpoint (mobile: 280px max, tablet: 400px max, desktop: 600px max)
- **FR-036**: System MUST support device orientation changes (portrait/landscape) with automatic terminal resize
- **FR-037**: System MUST work with virtual keyboards on mobile devices without breaking layout or input functionality
- **FR-038**: System MUST maintain minimum touch target size (44x44px) for interactive elements on touch devices

#### Layout and Centering (MUD-Style UI Frames)

- **FR-039**: System MUST support horizontal centering of ASCII frames within terminal width
- **FR-040**: System MUST calculate frame width based on content and terminal column count
- **FR-041**: System MUST recalculate frame centering and width when terminal is resized
- **FR-042**: System MUST support responsive frame sizing (full-width on mobile, centered on desktop)
- **FR-043**: System MUST calculate left padding to center frames with equal spacing on both sides
- **FR-044**: System MUST handle nested frames (frame within frame) with proper inner centering
- **FR-045**: System MUST support multiple frame styles (using `####`, `====`, `╔══╗`, `┌──┐`, etc.)
- **FR-046**: System MUST center content (text, images) horizontally within frame borders
- **FR-047**: System MUST maintain frame alignment consistency across multiple frames in same view
- **FR-048**: System MUST prevent frame borders from breaking or misaligning during scroll or resize

#### Testability and Quality Assurance

- **FR-049**: System architecture MUST support unit testing of individual components in isolation
- **FR-050**: Each core module (ANSIParser, ScrollBuffer, InputBuffer, Renderer, Layout) MUST have comprehensive unit tests
- **FR-051**: System MUST provide clear interfaces and contracts that enable test doubles (mocks, stubs, fakes)
- **FR-052**: System MUST separate pure logic (calculations, parsing) from side effects (DOM manipulation, I/O) for testability
- **FR-053**: System MUST use dependency injection or similar patterns to enable component testing without full app initialization
- **FR-054**: Test suite MUST run quickly (<5 seconds for unit tests, <30 seconds for full suite including integration tests)
- **FR-055**: System MUST generate test coverage reports showing line, branch, and function coverage
- **FR-056**: System MUST validate component behavior through integration tests that exercise component interactions
- **FR-057**: System MUST include edge case tests for boundary conditions (empty buffer, max buffer, min/max viewport sizes)
- **FR-058**: System MUST use deterministic test data and avoid flaky tests dependent on timing or randomness

#### Error Handling and Recovery

- **FR-059**: System MUST implement React error boundary to catch unhandled JavaScript errors in terminal components
- **FR-060**: System MUST display user-friendly error message when terminal crashes, with "Reset Terminal" action to restore functionality
- **FR-061**: System MUST log terminal errors (component name, error message, stack trace) for debugging and monitoring
- **FR-062**: System MUST allow terminal to recover from crashes without requiring full page reload
- **FR-063**: System MUST clear scroll buffer and command history when user triggers terminal reset after error

### Key Entities *(include if feature involves data)*

- **Terminal Line**: Represents a single line of content in the terminal buffer, containing text characters, formatting metadata (colors, styles), and optional image references
- **Image Anchor**: Represents the position marker where an image should be rendered, linked to a specific line and column position in the terminal buffer
- **Viewport State**: Represents the current visible portion of the terminal buffer, including scroll position, visible line range, and viewport dimensions
- **Command History**: Represents the stack of previously entered commands, supporting navigation and recall
- **Cursor State**: Represents the current position of the input cursor within the active input line, including column position and visual state (visible/hidden)
- **Input Buffer**: Represents the current command being typed, supporting insertion, deletion, and modification at arbitrary cursor positions
- **Viewport Configuration**: Represents device-specific terminal dimensions including viewport width, breakpoint classification (mobile/tablet/desktop), font size, column count, row count, and safe area insets
- **Breakpoint State**: Represents the current responsive breakpoint (mobile ≤640px, tablet 641-1024px, desktop >1024px) and associated terminal sizing parameters
- **Frame Layout Configuration**: Represents ASCII frame metadata including frame width, centering offset (left padding), border style, content width, and responsive sizing rules
- **Layout Calculator**: Represents the logic engine that computes frame dimensions, centering offsets, and padding based on terminal width and content requirements

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Images appear at their intended inline positions with zero pixel offset from their text anchors when page loads
- **SC-002**: Images maintain perfect positional sync during scrolling with no perceptible lag (< 16ms frame time for 60fps)
- **SC-003**: Scrolling through 100+ posts with images feels smooth and responsive without frame drops or stuttering
- **SC-004**: Image positions remain accurate after window resize operations (measured: image center aligns with text anchor within 1px tolerance)
- **SC-005**: 95% of users can complete typical browsing tasks (read posts, scroll feed) without noticing any image positioning anomalies
- **SC-006**: Terminal input lag remains under 50ms from keypress to visual update for all operations (typing, cursor movement, line editing)
- **SC-007**: All terminal keyboard shortcuts and control sequences work identically to native terminal applications (tested against Terminal.app/iTerm2 behavior)
- **SC-008**: Terminal handles rapid scroll operations (e.g., holding Page Down) without visual artifacts or crashes
- **SC-009**: Users can perform complex line editing operations (jump to middle, insert, delete, jump to start, etc.) in under 5 seconds without confusion
- **SC-010**: Cursor position always visible and accurately reflects current insertion point in input line
- **SC-011**: Tab completion activates within 100ms and cycles through completions without visual glitches
- **SC-012**: Terminal loads and renders correctly on mobile devices (iPhone, Android) with viewport width ≤640px without horizontal scroll
- **SC-013**: Terminal loads and renders correctly on tablet devices (iPad, Android tablets) with viewport width 641-1024px
- **SC-014**: Terminal loads and renders correctly on desktop devices with viewport width >1024px
- **SC-015**: Terminal resize operations complete within 200ms when viewport changes (orientation, browser resize)
- **SC-016**: Touch scrolling on mobile/tablet feels smooth and responsive (60fps minimum during scroll)
- **SC-017**: Virtual keyboard on mobile devices appears without breaking terminal layout or hiding input area
- **SC-018**: 95% of mobile users can complete typical terminal tasks (login, post, view feed) without encountering layout or input issues
- **SC-019**: ASCII frames (post borders, character sheets) center correctly at all breakpoints (mobile/tablet/desktop) with equal left/right padding
- **SC-020**: Frame width calculations adapt when terminal resizes, maintaining visual balance within 100ms
- **SC-021**: Nested frames render with proper alignment (inner frame centered within outer frame) without border breaks
- **SC-022**: Test suite achieves >90% code coverage across all core modules (ANSIParser, ScrollBuffer, InputBuffer, Renderer, Layout)
- **SC-023**: Unit tests run in <5 seconds, providing rapid feedback during development
- **SC-024**: Integration tests validate end-to-end flows (input → parse → buffer → render) with 100% pass rate
- **SC-025**: Test suite catches regressions immediately when code changes (zero false negatives for breaking changes)
- **SC-026**: Developers can run `npm test` and see clear, actionable failure messages for any broken tests
- **SC-027**: Terminal recovers from component crashes within 2 seconds via error boundary reset, without requiring page reload
- **SC-028**: ANSI parser rejects 100% of non-whitelisted escape sequences while accepting all whitelisted codes
- **SC-029**: Terminal error boundary logs all crashes with sufficient detail (component, error, stack) for debugging in production

## Assumptions & Constraints

### Assumptions

- Images are pre-loaded or loaded asynchronously; terminal does not manage image fetching
- Image dimensions are either known in advance or can be queried after load
- Terminal operates in a modern browser environment with support for DOM manipulation and CSS transforms
- Scroll events are triggered by standard browser mechanisms (wheel, touchpad, scrollbar)
- Content is primarily text with occasional inline images (not image-heavy layouts)
- Command history and scroll buffer are session-only (not persisted across page reloads)
- Terminal state clears when user navigates away from page
- ANSI escape codes in terminal output come from trusted sources (backend API), but are validated against whitelist for security

### Constraints

- Must maintain visual compatibility with existing retro terminal aesthetic (green-on-black, monospace font)
- **CRITICAL**: Must work across ALL device types and sizes (mobile phones, tablets, laptops, desktops, ultra-wide displays) with full functionality on each
- **CRITICAL**: Must support both touch input (mobile/tablet) and mouse/keyboard input (desktop) seamlessly
- **CRITICAL**: Must adapt to three defined breakpoints: mobile (≤640px), tablet (641-1024px), desktop (>1024px)
- Must handle device-specific constraints (safe area insets, dynamic viewport heights, virtual keyboards)
- Must maintain performance targets (60fps scroll, <50ms input lag) across all device types
- Cannot use canvas-only rendering (need DOM elements for images, accessibility, text selection)
- Must maintain backward compatibility with existing command system and data structures
- Solution should minimize external dependencies (avoid replacing one library problem with another)

### Out of Scope

- Advanced terminal features like split panes, tabs, or multiplexing
- Full VT100/xterm protocol emulation (only subset needed for this application)
- Performance optimization beyond smooth scrolling (e.g., virtualization of off-screen content)
- Accessibility features beyond basic text selection (screen reader optimization can come later)
- Video or animated GIF support (static images only)
