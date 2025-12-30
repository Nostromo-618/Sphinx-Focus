# Sphinx Focus Test Suite

This directory contains automated E2E tests for the Sphinx Focus application using Playwright.

> **Test Count:** 244 tests  
> **Coverage:** 100% of defined features  
> **Last Updated:** 2025-11-28

## Directory Structure

```
tests/
├── e2e/                              # End-to-end browser tests
│   ├── security/                     # Security flow tests
│   │   ├── auto-mode.spec.ts         # [P2 - Medium] Auto mode security
│   │   ├── disclaimer.spec.ts        # [P0 - Critical] First-visit disclaimer flow
│   │   ├── first-run-setup.spec.ts   # [P0 - Critical] First-time user setup
│   │   ├── mode-change.spec.ts       # [P1 - High] Security mode switching
│   │   └── pin-unlock.spec.ts        # [P0 - Critical] PIN unlock & lock flows
│   ├── timer/                        # Timer functionality tests
│   │   ├── rest-mode-visual.spec.ts  # [P2 - Medium] Rest mode overlay & transitions
│   │   ├── timer-controls.spec.ts    # [P1 - High] Start, pause, resume, reset, skip
│   │   ├── timer-persistence.spec.ts # [P2 - Medium] State persistence across reloads
│   │   └── timer-settings.spec.ts    # [P2 - Medium] Duration & blur mode settings
│   ├── tasks/                        # Task management tests
│   │   ├── task-crud.spec.ts         # [P1 - High] Create, read, update, delete
│   │   ├── task-drag-drop.spec.ts    # [P3 - Low] Drag & drop reordering
│   │   ├── task-fade-away.spec.ts    # [P2 - Medium] Completed task fading
│   │   └── task-settings.spec.ts     # [P2 - Medium] Task position & fade settings
│   ├── backlog/                      # Backlog feature tests
│   │   ├── backlog-crud.spec.ts      # [P1 - High] CRUD operations
│   │   ├── backlog-drag-drop.spec.ts # [P3 - Low] Internal drag & drop reordering
│   │   └── backlog-cross-list.spec.ts # [P1 - High] Cross-list drag between Task List and Backlog
│   └── ui/                           # UI/UX tests
│       ├── about-modal.spec.ts       # [P3 - Low] About modal & tabs (incl. changelog, disclaimer)
│       ├── card-reordering.spec.ts   # [P3 - Low] Timer/Task card drag reordering
│       ├── color-mode.spec.ts        # [P3 - Low] Light/dark/system theme
│       ├── modal-dismiss.spec.ts     # [P2 - Medium] Modal dismiss behaviors
│       ├── quick-blur-toggle.spec.ts # [P2 - Medium] Quick blur toggle button
│       ├── responsive.spec.ts        # [P3 - Low] Mobile & tablet layouts
│       └── theme-picker.spec.ts      # [P3 - Low] Theme color customization
├── fixtures/                         # Test utilities and helpers
│   └── test-utils.ts                 # Page objects, helpers, constants
└── README.md                         # This file
```

## Running Tests

### All Tests (Headless)
```bash
pnpm test
```

### Interactive UI Mode (Recommended for Debugging)
```bash
pnpm test:ui
```
Opens Playwright's interactive test runner with timeline, screenshots, and step-through capability.

### Headed Mode (Watch Browser)
```bash
pnpm test:headed
```
Runs tests with visible browser window so you can observe the automation.

### Debug Mode (Step Through)
```bash
pnpm test:debug
```
Pauses before each action for step-by-step debugging.

### Single Browser (Faster)
```bash
pnpm test:chromium
```

### Specific Test File
```bash
pnpm test tests/e2e/security/first-run-setup.spec.ts
```

### Filter by Test Name
```bash
pnpm test -g "should complete setup with PIN mode"
```

### Slow Motion (Observe Actions)
```bash
pnpm exec playwright test --headed --slow-mo=500
```
Slows down each action by 500ms for observation.

## Test Coverage by Feature

### Security (P0 - Critical)
| Test File | Tests | Coverage |
|-----------|-------|----------|
| `disclaimer.spec.ts` | 10 | First-visit disclaimer, agree/disagree, persistence |
| `first-run-setup.spec.ts` | 9 | First-time modal, PIN setup, auto setup, validation |
| `pin-unlock.spec.ts` | 13 | Unlock flow, wrong PIN, forgot PIN, lock/unlock cycle |
| `auto-mode.spec.ts` | 7 | Auto mode persistence, encryption, mode switching |
| `mode-change.spec.ts` | 8 | Security mode switching, task preservation |

### Timer (P1-P2)
| Test File | Tests | Coverage |
|-----------|-------|----------|
| `timer-controls.spec.ts` | 14 | Start, pause, resume, reset, skip, mode switching |
| `timer-persistence.spec.ts` | 7 | State persistence, elapsed time, session expiry |
| `timer-settings.spec.ts` | 15 | Duration config, validation, blur mode |
| `rest-mode-visual.spec.ts` | 13 | Rest mode overlay, transitions, visual feedback |

### Tasks (P1-P3)
| Test File | Tests | Coverage |
|-----------|-------|----------|
| `task-crud.spec.ts` | 19 | Add, delete, complete, persist, encrypt, sort |
| `task-drag-drop.spec.ts` | 8 | Drag handle, reorder, persist order |
| `task-fade-away.spec.ts` | 12 | Completed task fading, duration settings |
| `task-settings.spec.ts` | 16 | Task position, fade duration settings |

### Backlog (P1-P3)
| Test File | Tests | Coverage |
|-----------|-------|----------|
| `backlog-crud.spec.ts` | 15 | Add, delete, complete, persist, encrypt, sort |
| `backlog-drag-drop.spec.ts` | 7 | Internal drag & drop reordering, persist order |
| `backlog-cross-list.spec.ts` | 10 | Cross-list drag between Task List and Backlog, position respect |

### UI (P3)
| Test File | Tests | Coverage |
|-----------|-------|----------|
| `about-modal.spec.ts` | 10 | About modal tabs, changelog, disclaimer, mobile scroll |
| `card-reordering.spec.ts` | 8 | Timer/task card drag-drop reordering |
| `color-mode.spec.ts` | 8 | Light/dark/system, persist, dropdown |
| `modal-dismiss.spec.ts` | 15 | Modal dismiss behaviors (dismissible vs non-dismissible) |
| `quick-blur-toggle.spec.ts` | 14 | Quick blur toggle during focus |
| `responsive.spec.ts` | 9 | Desktop, tablet, mobile, orientation |
| `theme-picker.spec.ts` | 16 | Theme color customization, persistence |

## Writing Tests

### Test File Template

```typescript
import { test, expect } from '@playwright/test'
import { 
  clearStorage, 
  bypassSecuritySetup, 
  waitForAppReady 
} from '../../fixtures/test-utils'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)  // Skip for security tests
    await page.reload()
    await waitForAppReady(page)
  })

  test('should [action] when [condition]', async ({ page }) => {
    // Arrange - set up preconditions
    
    // Act - perform the action
    
    // Assert - verify the outcome
    await expect(page.getByTestId('element')).toBeVisible()
  })
})
```

### Test Naming Convention

Format: `should [expected behavior] when [condition/action]`

```typescript
// ✅ Good
test('should display PIN modal when returning PIN user')
test('should show error when entering wrong PIN')
test('should persist timer state across reload')

// ❌ Bad
test('test PIN')
test('PIN works')
test('timer test')
```

## Test Utilities (test-utils.ts)

### Page Object Class
```typescript
const app = new SphinxFocusPage(page)
await app.setupAutoMode()
await app.setupPINMode('1234')
await app.addTask('My task')
await app.startTimer()
await app.pauseTimer()
```

### Storage Helpers
```typescript
await clearStorage(page)                    // Clear all app data
await getStorageItem(page, STORAGE_KEYS.security)
await setStorageItem(page, key, value)
await bypassDisclaimer(page)                // Skip disclaimer for non-disclaimer tests
await bypassSecuritySetup(page)             // Skip security AND disclaimer for non-security tests
```

### Wait Helpers
```typescript
await waitForAppReady(page)                 // Wait for main UI
await waitForSecurityModal(page)            // Wait for setup modal
await waitForPINModal(page)                 // Wait for unlock modal
```

### Assertion Helpers
```typescript
await assertTimerDisplay(page, '25:00')
await assertTimerMode(page, 'Focus')
await assertTaskCount(page, 3)
```

### Viewport Helpers
```typescript
await setMobileViewport(page)
await setDesktopViewport(page)
await setTabletViewport(page)
```

### Drag & Drop Helpers
```typescript
await dragTaskByIndex(page, 0, 2)           // Drag first to third
await dragTaskByText(page, 'Task A', 'Task B')
const order = await getTaskOrder(page)      // Get current task order
const backlogOrder = await getBacklogTaskOrder(page)  // Get backlog task order
await dragTaskBetweenLists(page, 'tasks', 'backlog', 'Task A', 'Target Task')  // Cross-list drag
```

### Color Mode Helpers
```typescript
const isDark = await isDarkMode(page)
await setColorMode(page, 'dark')
```

### Constants
```typescript
import { 
  TEST_PIN,           // '1234'
  WRONG_PIN,          // '9999'
  STORAGE_KEYS,       // All localStorage keys
  VIEWPORTS           // desktop, tablet, mobile sizes
} from '../../fixtures/test-utils'
```

## Selector Strategy

### Priority Order (MUST follow)

1. **data-testid** - Most reliable
   ```typescript
   page.getByTestId('timer-start')
   ```

2. **Role + accessible name** - Semantic
   ```typescript
   page.getByRole('button', { name: 'Start' })
   ```

3. **Text content** - User-facing
   ```typescript
   page.getByText('Focus Timer')
   ```

4. **CSS selector** - Last resort only
   ```typescript
   page.locator('.timer-display')
   ```

### Available data-testid Attributes

| Component | Element | data-testid |
|-----------|---------|-------------|
| FocusTimer | Start button | `timer-start` |
| FocusTimer | Pause button | `timer-pause` |
| FocusTimer | Resume button | `timer-resume` |
| FocusTimer | Reset button | `timer-reset` |
| FocusTimer | Skip button | `timer-skip` |
| FocusTimer | Time display | `timer-display` |
| FocusTimer | Mode label | `timer-mode` |
| TaskList | Input field | `task-input` |
| TaskList | Add button | `task-add` |
| TaskList | Task item | `task-item-{id}` |
| TaskList | Task text | `task-text-{id}` |
| TaskList | Checkbox | `task-checkbox-{id}` |
| TaskList | Delete button | `task-delete-{id}` |
| BacklogList | Input field | `backlog-input` |
| BacklogList | Add button | `backlog-add` |
| BacklogList | Task item | `backlog-item-{id}` |
| BacklogList | Task text | `backlog-text-{id}` |
| BacklogList | Checkbox | `backlog-checkbox-{id}` |
| BacklogList | Delete button | `backlog-delete-{id}` |
| SecuritySetupModal | PIN option | `security-pin-option` |
| SecuritySetupModal | Auto option | `security-auto-option` |
| SecuritySetupModal | PIN inputs | `pin-input-{0-3}` |
| SecuritySetupModal | Confirm inputs | `confirm-pin-input-{0-3}` |
| PINEntryModal | PIN inputs | `unlock-pin-input-{0-3}` |
| PINEntryModal | Forgot link | `forgot-pin-link` |

## Debugging

### View Trace on Failure
```bash
pnpm exec playwright show-trace test-results/*/trace.zip
```

### Screenshots
Failure screenshots are saved to `test-results/*/`.

### Debug Specific Test
```bash
pnpm test:debug tests/e2e/security/pin-unlock.spec.ts
```

### VS Code Extension
Install "Playwright Test for VSCode" for:
- Test explorer sidebar
- Click-to-run individual tests
- Integrated debugging

## CI/CD

Tests run automatically on:
- Push to `main`
- Pull requests

See `.github/workflows/playwright.yml` for configuration.

## Test Independence Rules

1. **Clear state** in `beforeEach` - never rely on previous test state
2. **No shared mutable state** between tests
3. **Each test creates its own data** - don't assume data exists
4. **Use unique identifiers** when creating test data

## Common Patterns

### Testing Security Features
```typescript
// Go through actual flow
test('should unlock with correct PIN', async ({ page }) => {
  await app.setupPINMode('1234')
  await page.reload()
  await app.unlockWithPIN('1234')
  await expect(page.getByTestId('timer-start')).toBeVisible()
})
```

### Testing Non-Security Features
```typescript
// Bypass security to focus on feature
test.beforeEach(async ({ page }) => {
  await bypassSecuritySetup(page)
  await page.reload()
  await waitForAppReady(page)
})
```

### Testing Timer with Real Time
```typescript
// Use actual waiting (for short durations)
await page.getByTestId('timer-start').click()
await page.waitForTimeout(2000)
const time = await page.getByTestId('timer-display').textContent()
expect(time).not.toBe('25:00')
```

### Testing Persistence
```typescript
// Make change, reload, verify
await page.getByTestId('task-input').fill('Persistent task')
await page.getByTestId('task-add').click()
await page.reload()
await waitForAppReady(page)
await expect(page.getByText('Persistent task')).toBeVisible()
```

## Contributing

1. Add tests for new features (happy path + error cases)
2. Add regression tests for bug fixes
3. Follow existing patterns and naming conventions
4. Run `pnpm test` before committing
5. Update this README when adding new test categories
