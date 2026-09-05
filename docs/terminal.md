# Terminal Mode - Technical Handoff Documentation

> **Purpose**: Continuation prompt for a future AI agent with full browser and package-installation capabilities.

---

## Overview

**Terminal Mode** is a mobile-first, Warp-competitive terminal experience for the Scaffolder application. It replaces the "Agent" tab with a dedicated "Terminal" tab in the bottom navigation, providing direct SSH command execution to remote EC2 instances without AI interpretation.

### Design Goals
- Mobile-first UX inspired by Termux and Warp Terminal
- Direct SSH command execution (no AI latency)
- Design tokens system for enterprise theming
- Gesture support for mobile interactions
- xterm.js-based terminal viewport

---

## What Has Been Implemented

### 1. Frontend Components (`src/components/Terminal/`)

| File | Status | Description |
|------|--------|-------------|
| `TerminalMode.tsx` | ✅ Complete | Main container orchestrating all terminal UI |
| `TerminalTopBar.tsx` | ✅ Complete | Top bar with title, secondary tabs, connection status |
| `TerminalViewport.tsx` | ✅ Complete | xterm.js terminal display with design tokens |
| `TerminalActionButtons.tsx` | ✅ Complete | YES/NO/INTERRUPT/EXIT action buttons |
| `TerminalModeIndicator.tsx` | ✅ Complete | Terminal/Agent/Ask mode toggle |
| `TerminalComposer.tsx` | ✅ Complete | Command input with $ prefix |
| `useTerminalExecution.ts` | ✅ Complete | Hook for direct SSH command execution |
| `useTerminalGestures.ts` | ✅ Complete | Touch gesture handlers (swipe detection) |

### 2. Backend API (`src/app/routes/terminal.ts`)

| Endpoint | Status | Description |
|----------|--------|-------------|
| `POST /api/terminal/execute` | ✅ Complete | Direct SSH command execution without AI |

**Request Format:**
```json
{
  "command": "ls -la",
  "workingDirectory": "/home/ec2-user",
  "infraCredentials": {
    "sshPrivateKey": "-----BEGIN OPENSSH PRIVATE KEY-----...",
    "host": "54.123.45.67"
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "exitCode": 0,
  "stdout": "...",
  "stderr": ""
}
```

### 3. State Management (`src/useTerminalStore.ts`)

- Zustand store for terminal state
- Tracks: `connectionStatus`, `activeSecondaryTab`, `terminalMode`, `commandHistory`

### 4. Design Tokens (`src/styles/components/_terminal.scss`)

All tokens defined in `:root` for CSS variable access:
- `--terminal-bg`, `--terminal-fg`, `--terminal-cursor`
- `--terminal-topbar-*`, `--terminal-tab-*`
- `--terminal-action-*` (yes/no/interrupt/exit colors)
- `--terminal-mode-indicator-*`
- `--terminal-status-*` (connected/disconnected/reconnecting)

### 5. Navigation Updates

- `TabBar.tsx`: Changed `TabType` from `"agent"` to `"terminal"`
- Bottom navigation now shows: Code | Chat | Terminal | Infra

### 6. Test Infrastructure (Partially Verified)

| File | Status | Notes |
|------|--------|-------|
| `src/components/Terminal/TerminalMode.test.tsx` | ✅ 16 tests passing | Unit tests with MSW mocks |
| `src/test/mocks/api/handlers.ts` | ✅ Complete | MSW handlers for `/api/terminal/execute` |
| `src/test/mocks/auth/MockAuthProvider.tsx` | ✅ Complete | Mock Auth0 provider |
| `src/test/fixtures/users.ts` | ✅ Complete | Mock user/credential fixtures |
| `e2e/terminal-mode.spec.ts` | ⚠️ Written, NOT RUN | Playwright tests exist but browsers not installed |
| `e2e/fixtures.ts` | ⚠️ Written, NOT RUN | Playwright fixtures with API mocking |
| `playwright.config.ts` | ✅ Complete | Config for Chromium, Mobile Chrome, Mobile Safari |

---

## Known Limitations and Blockers

### Environment Constraints (Previous Agent)

1. **No Browser Installation Capability**
   - Could not run `bunx playwright install` to download browser binaries
   - Network/sandbox restrictions prevented browser downloads
   - All Playwright tests are written but **have never been executed**

2. **No DOM Testing in Real Browser**
   - Unit tests use jsdom (simulated DOM) via vitest
   - Real browser behaviors (xterm.js rendering, touch gestures) are untested
   - CSS custom property resolution untested in real browser context

3. **No Mobile Device Testing**
   - Mobile viewport tests exist in Playwright config but never ran
   - Touch/gesture interactions completely untested
   - iOS Safari and Android Chrome behaviors unknown

### Bugs Fixed (Verified via Unit Tests)

1. **Infinite Update Loop** - Fixed in `useTerminalExecution.ts`
   - Callbacks were in useEffect dependency array causing infinite re-renders
   - Solution: Used refs for callback functions

2. **White Screen Rendering** - Fixed in `_terminal.scss`
   - CSS variables in `@theme {}` blocks not accessible via `var()`
   - Solution: Moved all tokens to `:root {}` with hex values

3. **API 500 Errors** - Fixed by creating direct endpoint
   - Original implementation routed through AI agent (`/api/agent/chat`)
   - Solution: Created `/api/terminal/execute` for direct SSH execution

### Unverified Assumptions

- xterm.js renders correctly with CSS custom properties
- Touch gestures work on actual mobile devices
- Connection status updates reflect real SSH state
- Terminal viewport properly handles resize events
- Action buttons trigger correct behaviors

---

## What Is Missing / To Be Implemented

### High Priority (Requires Browser Testing)

1. **Run Playwright E2E Tests**
   - Install browser binaries
   - Execute `e2e/terminal-mode.spec.ts`
   - Fix any failures discovered

2. **Verify xterm.js Rendering**
   - Confirm terminal displays command output correctly
   - Verify cursor, colors, and scrolling work
   - Test copy/paste functionality

3. **Test Real SSH Execution**
   - Verify commands execute on actual EC2 instance
   - Confirm output streams back to terminal
   - Test error handling for failed commands

### Medium Priority (Feature Completion)

4. **Secondary Tabs Implementation**
   - Files tab: File browser (currently shows "coming soon")
   - Preview tab: Web preview (currently shows "coming soon")
   - Logs tab: Log viewer (currently shows "coming soon")

5. **Gesture Support Verification**
   - Swipe left: Show history
   - Swipe up: Quick commands
   - Swipe right: Context menu
   - Currently implemented but untested on real devices

6. **Mode Switching**
   - Terminal mode: Direct command execution ✅
   - Agent mode: AI-assisted commands (not implemented)
   - Ask mode: Question/answer (not implemented)

### Low Priority (Polish)

7. **Command History**
   - Up/down arrow navigation
   - Persistent history across sessions

8. **Auto-completion**
   - Tab completion for commands/paths

9. **Mobile Keyboard Handling**
   - Virtual keyboard integration
   - Input focus management

---

## Next Agent Instructions

### Prerequisites

You have full browser access and can install packages. Execute these steps in order:

### Step 1: Install Playwright Browsers

```bash
cd /home/user/scaffolder
bunx playwright install
```

If this fails, try:
```bash
bunx playwright install chromium
bunx playwright install --with-deps
```

### Step 2: Run Existing E2E Tests

```bash
bunx playwright test e2e/terminal-mode.spec.ts
```

**Expected Outcome**: Tests may fail. Document all failures.

### Step 3: Fix Test Failures

For each failing test:
1. Identify the root cause (selector issue, timing, missing element)
2. Fix the implementation or the test as appropriate
3. Re-run until passing

### Step 4: Verify Real Terminal Functionality

1. Start the dev server: `bun run dev`
2. Navigate to the Terminal tab in browser
3. Execute real commands: `pwd`, `ls -la`, `whoami`, `echo "test"`
4. Verify output displays correctly in xterm.js viewport

### Step 5: Test Mobile Viewports

```bash
bunx playwright test --project="Mobile Chrome"
bunx playwright test --project="Mobile Safari"
```

### Step 6: Document Findings

Update this file with:
- Tests that were fixed
- New bugs discovered
- Features verified as working
- Remaining issues

### Step 7: Implement Missing Features (If Time Permits)

Priority order:
1. Fix any critical bugs found in testing
2. Implement Files/Preview/Logs secondary tabs
3. Add Agent/Ask mode functionality
4. Polish gesture interactions

---

## File Reference

### Core Implementation
```
src/components/Terminal/
├── TerminalMode.tsx           # Main container
├── TerminalTopBar.tsx         # Header with tabs
├── TerminalViewport.tsx       # xterm.js display
├── TerminalActionButtons.tsx  # YES/NO/INTERRUPT/EXIT
├── TerminalModeIndicator.tsx  # Mode toggle
├── TerminalComposer.tsx       # Command input
├── useTerminalExecution.ts    # SSH execution hook
├── useTerminalGestures.ts     # Touch gestures
└── TerminalMode.test.tsx      # Unit tests (passing)
```

### Backend
```
src/app/routes/
├── terminal.ts                # Direct SSH execution endpoint
├── agent.ts                   # AI agent endpoint (separate feature)
└── index.ts                   # Route registration
```

### Test Infrastructure
```
e2e/
├── terminal-mode.spec.ts      # Playwright tests (NOT RUN)
└── fixtures.ts                # Test fixtures

src/test/
├── mocks/
│   ├── api/handlers.ts        # MSW handlers
│   ├── auth/MockAuthProvider.tsx
│   └── auth/types.ts
├── fixtures/users.ts          # User/credential mocks
└── utils/renderWithAuth.tsx   # Test render utilities
```

### Configuration
```
playwright.config.ts           # Playwright config
vitest.config.ts               # Vitest config (unit tests)
vitest.setup.ts                # Test setup with MSW
```

---

## Contact / Context

- **Branch**: `claude/terminal-mode-mobile-LPwq3`
- **Previous Agent**: Claude Code (remote, no browser access)
- **Last Verified**: Unit tests passing (16/16)
- **Last Unverified**: All Playwright E2E tests

---

*This document serves as a formal continuation contract. The next agent should treat all "unverified" items as potentially broken until proven otherwise through actual browser testing.*
