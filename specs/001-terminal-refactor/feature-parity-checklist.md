# Terminal Feature Parity Checklist

**Purpose**: Validate that all existing terminal features work identically after refactoring
**Created**: 2026-02-14
**Baseline**: Pre-refactor terminal implementation (main branch)

## Core Terminal Features

### Visual Appearance
- [ ] Green-on-black color scheme (#00ff00 on #000000)
- [ ] IBM Plex Mono font family
- [ ] Cursor blink and block style
- [ ] ASCII art rendering (logo, borders, character sheets)
- [ ] ANSI color codes support (8 base + 8 bright colors)

### Input Handling
- [ ] Command input with live echo
- [ ] Command prompt display (`> `)
- [ ] Maximum 2000 character input limit
- [ ] Cursor navigation with left/right arrow keys
- [ ] Backspace and delete key support
- [ ] Enter key command submission

### Command History
- [ ] Arrow up/down for history navigation
- [ ] Maximum 100 command history entries
- [ ] History persists during session
- [ ] History index resets after new command

### Autocomplete
- [ ] Tab key autocomplete for commands
- [ ] Gray preview text for suggestions
- [ ] Autocomplete clears on type/edit

### Password Masking
- [ ] `/login` and `/register` mask password input
- [ ] Asterisks (*) displayed for password characters
- [ ] Password field identifiable by prompt text

### Output Rendering
- [ ] Multi-line output support
- [ ] ANSI escape sequence rendering
- [ ] Scrollback buffer (1000 lines)
- [ ] Output buffer limit (10000 lines)
- [ ] Line wrapping for long text

### Terminal Commands

#### Social Commands
- [ ] `/post <content>` - Create post
- [ ] `/like <post_id>` - Like a post
- [ ] `/comment <post_id> <text>` - Add comment
- [ ] `/show <post_id>` - Show post details with comments
- [ ] `/show <post_id> <page>` - Show paginated comments

#### Authentication Commands
- [ ] `/login <username> <password>` - User login
- [ ] `/register <username> <password>` - User registration
- [ ] `/logout` - User logout

#### Information Commands
- [ ] `/help` - Display help
- [ ] `/man <topic>` - Display manual pages
- [ ] `/profile` - Display user profile/character sheet

#### System Commands
- [ ] Clear screen functionality
- [ ] Unknown command error messages

### Responsive Design

#### Mobile (≤640px)
- [ ] Terminal fits viewport width
- [ ] Font size: 10px
- [ ] Minimum columns: 40
- [ ] Minimum rows: 24
- [ ] Touch input works
- [ ] Scrolling works

#### Tablet (641-1024px)
- [ ] Terminal fits viewport width
- [ ] Font size: 12px
- [ ] Minimum columns: 60
- [ ] Minimum rows: 28
- [ ] Touch/mouse input works
- [ ] Scrolling works

#### Desktop (>1024px)
- [ ] Terminal fits viewport width
- [ ] Font size: 14px
- [ ] Minimum columns: 80
- [ ] Minimum rows: 30
- [ ] Mouse/keyboard input works
- [ ] Scrolling works

### Window Resize
- [ ] FitAddon recalculates on window resize
- [ ] Terminal reflows content correctly
- [ ] No visual glitches during resize
- [ ] Responsive config updates dynamically

### Integration Points

#### Home Page
- [ ] Terminal mounts correctly
- [ ] Welcome message displays with XP bar
- [ ] Feed posts render in terminal
- [ ] Command execution triggers API calls
- [ ] Authentication state updates terminal content

#### Landing Page
- [ ] Terminal mounts correctly
- [ ] Welcome message displays
- [ ] Discovery feed renders
- [ ] Library evaluation man page displays
- [ ] Commands work for unauthenticated users

### Performance
- [ ] Input lag <100ms
- [ ] Smooth scrolling with large buffers
- [ ] No memory leaks during long sessions
- [ ] Terminal remains responsive under load

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## Validation Instructions

1. **Before refactoring**: Test all features on current implementation and mark baseline behavior
2. **During refactoring**: Test incrementally after each major change
3. **After refactoring**: Complete full regression test of all checklist items
4. **Sign-off**: All items must be checked before deployment

## Notes

- Any deviations from baseline behavior must be documented and justified
- Visual regressions are unacceptable (FR-001: 100% visual parity required)
- Feature gaps are unacceptable (FR-002: all existing features must work)
