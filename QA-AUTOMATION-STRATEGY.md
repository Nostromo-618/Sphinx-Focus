# Sphinx Focus QA Automation Strategy

> **Version:** 2.3.3  
> **Last Updated:** 2025-12-20  
> **Status:** Complete (100% Coverage Achieved)

## Overview

This document defines the QA automation strategy for Sphinx Focus, a Pomodoro timer and encrypted task manager built with Nuxt 4, Vue 3, and Nuxt UI v4.

**Current Status:** 212 E2E tests covering all defined features.

## Testing Tools

### Primary: Playwright

**Why Playwright?**
- Cross-browser testing (Chromium, Firefox, WebKit)
- Native async/await API with auto-waiting
- Excellent TypeScript support
- Built-in test runner with parallel execution
- Network interception and mocking capabilities
- localStorage manipulation for encryption testing
- CI/CD ready with GitHub Actions integration

### Secondary: Chrome DevTools MCP

**Use Cases:**
- Live debugging of failing tests
- Interactive exploration of complex UI states
- Visual inspection of encryption/decryption flows
- Performance profiling

**When to Use:**
- Debugging flaky tests
- Exploring new features before writing tests
- Investigating production-like issues

## Test Architecture

### Test Pyramid

```
         ┌─────────────┐
         │   Visual    │  ~10% - Screenshot comparisons (future)
         └─────────────┘
      ┌─────────────────────┐
      │    E2E Tests        │  ~30% - Critical user flows ✅ COMPLETE
      └─────────────────────┘
   ┌───────────────────────────┐
   │   Integration Tests       │  ~30% - Component interactions
   └───────────────────────────┘
┌───────────────────────────────────┐
│         Unit Tests               │  ~30% - Composables, utilities
└───────────────────────────────────┘
```

### Directory Structure

```
tests/
├── e2e/                              # End-to-end browser tests
│   ├── security/                     # Security flow tests (5 files, 47 tests)
│   │   ├── auto-mode.spec.ts         # Auto mode security
│   │   ├── disclaimer.spec.ts        # First-visit disclaimer flow
│   │   ├── first-run-setup.spec.ts   # First-time user setup
│   │   ├── mode-change.spec.ts       # Security mode switching
│   │   └── pin-unlock.spec.ts        # PIN unlock & lock flows
│   ├── timer/                        # Timer functionality tests (4 files, 49 tests)
│   │   ├── rest-mode-visual.spec.ts  # Rest mode overlay & transitions
│   │   ├── timer-controls.spec.ts    # Start, pause, resume, reset
│   │   ├── timer-persistence.spec.ts # State persistence
│   │   └── timer-settings.spec.ts    # Duration & blur settings
│   ├── tasks/                        # Task management tests (4 files, 55 tests)
│   │   ├── task-crud.spec.ts         # CRUD operations
│   │   ├── task-drag-drop.spec.ts    # Drag & drop reordering
│   │   ├── task-fade-away.spec.ts    # Completed task fading
│   │   └── task-settings.spec.ts     # Task position & fade settings
│   └── ui/                           # UI/UX tests (7 files, 61 tests)
│       ├── about-modal.spec.ts       # About modal & tabs (incl. changelog, disclaimer)
│       ├── card-reordering.spec.ts   # Timer/Task card drag reordering
│       ├── color-mode.spec.ts        # Light/dark/system theme
│       ├── modal-dismiss.spec.ts     # Modal dismiss behaviors
│       ├── quick-blur-toggle.spec.ts # Quick blur toggle button
│       ├── responsive.spec.ts        # Mobile & tablet layouts
│       └── theme-picker.spec.ts      # Theme color customization
├── fixtures/                         # Test utilities and helpers
│   └── test-utils.ts                 # Page objects, helpers, constants
└── README.md                         # Test documentation
```

## Critical Paths

### Priority Matrix

| Priority | Feature | Risk Level | Test Coverage | Status |
|----------|---------|------------|---------------|--------|
| P0 | Security Setup (First Run) | Critical | 100% | ✅ Complete |
| P0 | PIN Unlock Flow | Critical | 100% | ✅ Complete |
| P0 | Task Encryption/Decryption | Critical | 100% | ✅ Complete |
| P1 | Timer Controls | High | 100% | ✅ Complete |
| P1 | Task CRUD Operations | High | 100% | ✅ Complete |
| P2 | Timer Settings | Medium | 100% | ✅ Complete |
| P2 | Timer Persistence | Medium | 100% | ✅ Complete |
| P3 | Color Mode | Low | 100% | ✅ Complete |
| P3 | Responsive Layout | Low | 100% | ✅ Complete |
| P3 | Drag & Drop | Low | 100% | ✅ Complete |

### Critical User Flows

1. **First-Time User Setup**
   ```
   App Load → Disclaimer Modal → Accept → Security Modal → Choose Mode → (PIN Setup | Auto) → App Ready
   ```
   - Tests: `disclaimer.spec.ts` (10 tests), `first-run-setup.spec.ts` (9 tests)

2. **Returning PIN User**
   ```
   App Load → PIN Modal → Enter PIN → Verify → App Ready (with decrypted tasks)
   ```
   - Tests: `pin-unlock.spec.ts` (13 tests)

3. **Focus Session**
   ```
   Start Timer → Running → (Pause/Resume) → Complete → Switch Mode → Rest
   ```
   - Tests: `timer-controls.spec.ts` (14 tests)

4. **Task Management**
   ```
   Add Task → View in List → Toggle Complete → Reorder → Delete
   ```
   - Tests: `task-crud.spec.ts` (19 tests), `task-drag-drop.spec.ts` (8 tests)

## Testing Strategies

### localStorage & Encryption Testing

**Challenge:** Tasks are encrypted with AES-GCM using keys derived from PIN or auto-generated.

**Strategy:**
```typescript
// Clear state before each test
await clearStorage(page)

// Bypass security for non-security tests
await bypassSecuritySetup(page)
await page.reload()
await waitForAppReady(page)
```

**For Security Tests:**
- Test with real encryption flow
- Verify encrypted data format in localStorage
- Test PIN verification (correct/incorrect)
- Test data clearing on reset

### Timer State Testing

**Challenge:** Timer persists state with timestamps for resume functionality.

**Strategy:**
```typescript
// For persistence tests, use real time with short waits
await page.getByTestId('timer-start').click()
await page.waitForTimeout(2000)
await page.reload()
// Verify timer resumed with correct time
```

**For Expired Timer:**
```typescript
// Manipulate localStorage to simulate expired timer
const expiredState = {
  mode: 'focus',
  state: 'running',
  timeRemaining: 5,
  lastUpdateTimestamp: Date.now() - 10000
}
await page.evaluate((state) => {
  localStorage.setItem('sphinx-focus-timer', JSON.stringify(state))
}, expiredState)
```

### Notification Testing

**Challenge:** Browser notifications require permissions.

**Strategy:**
```typescript
// Grant notification permission
await context.grantPermissions(['notifications'])

// Or deny for testing fallback
await context.clearPermissions()
```

## Selector Strategy

### Preferred Order

1. **data-testid** (most reliable)
   ```typescript
   page.getByTestId('timer-start')
   ```

2. **Accessible roles** (semantic)
   ```typescript
   page.getByRole('button', { name: 'Start' })
   ```

3. **Text content** (user-facing)
   ```typescript
   page.getByText('Focus Timer')
   ```

4. **CSS selectors** (last resort)
   ```typescript
   page.locator('.timer-display')
   ```

### Required data-testid Attributes

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
| TaskList | Delete button | `task-delete-{id}` |
| TaskList | Checkbox | `task-checkbox-{id}` |
| SecuritySetupModal | PIN option | `security-pin-option` |
| SecuritySetupModal | Auto option | `security-auto-option` |
| SecuritySetupModal | PIN inputs | `pin-input-{0-3}` |
| SecuritySetupModal | Confirm inputs | `confirm-pin-input-{0-3}` |
| PINEntryModal | PIN inputs | `unlock-pin-input-{0-3}` |
| PINEntryModal | Forgot link | `forgot-pin-link` |

## Test Patterns

### Page Object Model (Simplified)

```typescript
// fixtures/test-utils.ts
export class SphinxFocusPage {
  constructor(private page: Page) {}

  async setupAutoMode() {
    await this.page.getByTestId('security-auto-option').click()
    await this.page.waitForSelector('[data-testid="timer-start"]')
  }

  async setupPINMode(pin: string = '1234') {
    await this.page.getByTestId('security-pin-option').click()
    await this.enterPIN(pin, 'setup')
    await this.enterPIN(pin, 'confirm')
    await this.page.getByRole('button', { name: 'Secure My Tasks' }).click()
  }

  async enterPIN(pin: string, type: 'setup' | 'confirm' | 'unlock') {
    const prefix = type === 'unlock' ? 'unlock-pin-input' 
                 : type === 'confirm' ? 'confirm-pin-input' 
                 : 'pin-input'
    for (let i = 0; i < 4; i++) {
      await this.page.getByTestId(`${prefix}-${i}`).fill(pin[i])
    }
  }

  async addTask(text: string) {
    await this.page.getByTestId('task-input').fill(text)
    await this.page.getByTestId('task-add').click()
  }
}
```

### Assertion Patterns

```typescript
// Prefer specific assertions
await expect(page.getByTestId('timer-display')).toHaveText('25:00')

// Use soft assertions for non-critical checks
await expect.soft(page.getByTestId('timer-mode')).toHaveText('Focus')

// Visual regression (future)
await expect(page).toHaveScreenshot('timer-idle.png')
```

## Running Tests

### Available Commands

```bash
pnpm test                  # All tests, headless
pnpm test:ui               # Interactive UI mode (recommended for debugging)
pnpm test:headed           # Visible browser window
pnpm test:debug            # Step-through debugging
pnpm test:chromium         # Single browser (faster)
pnpm test -g "pattern"     # Filter by test name
```

### Slow Motion for Observation

```bash
pnpm exec playwright test --headed --slow-mo=500
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Playwright Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps
      
      - name: Build app
        run: pnpm build
      
      - name: Run tests
        run: pnpm test
      
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Data Management

### Isolation Rules

1. **Clear localStorage** before each test
2. **Use unique identifiers** for test data
3. **Don't share state** between tests
4. **Reset to known state** in beforeEach

### Fixtures

```typescript
// Common test fixtures
export const TEST_PIN = '1234'
export const WRONG_PIN = '9999'
export const FOCUS_DURATION_SECONDS = 25 * 60
export const REST_DURATION_SECONDS = 5 * 60

export const STORAGE_KEYS = {
  security: 'sphinx-focus-security',
  tasks: 'sphinx-focus-tasks-encrypted',
  settings: 'sphinx-focus-settings-encrypted',
  disclaimer: 'sphinx-focus-disclaimer-accepted',
  timer: 'sphinx-focus-timer',
  focusDuration: 'sphinx-focus-focus-duration',
  restDuration: 'sphinx-focus-rest-duration',
  blurMode: 'sphinx-focus-blur-mode'
}

export const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
}
```

## Debugging Failed Tests

### Local Debugging

```bash
# Run with UI mode (best for debugging)
pnpm test:ui

# Run specific test in debug mode
pnpm test:debug tests/e2e/security/pin-unlock.spec.ts

# Generate trace on failure
pnpm test --trace on

# View trace
pnpm exec playwright show-trace test-results/*/trace.zip
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Flaky modal tests | Add `waitForSelector` before interactions |
| Timer timing issues | Use real waits for short durations, mock for long |
| Encryption failures | Ensure proper key generation in fixtures |
| localStorage race conditions | Use `page.waitForFunction` |
| Dropdown not closing | Press `Escape` before next interaction |
| Element not found after action | Re-query element after state change |

## Maintenance Guidelines

### When to Add Tests

- New feature: Add E2E test for happy path + key error cases
- Bug fix: Add regression test that would have caught the bug
- Refactor: Ensure existing tests still pass

### When to Update Tests

- UI changes: Update selectors and screenshots
- Behavior changes: Update assertions
- New edge cases discovered: Add to existing test file

### Test Review Checklist

- [ ] Uses data-testid where possible
- [ ] Clears state in beforeEach
- [ ] Has meaningful test names (`should X when Y`)
- [ ] Covers happy path and key errors
- [ ] No hardcoded waits (use auto-waiting)
- [ ] Follows existing patterns
- [ ] Tests are independent (no order dependency)

## Coverage Summary

| Category | Test Files | Test Count | Status |
|----------|------------|------------|--------|
| Security | 5 | 47 | ✅ Complete |
| Timer | 4 | 49 | ✅ Complete |
| Tasks | 4 | 55 | ✅ Complete |
| UI | 7 | 61 | ✅ Complete |
| **Total** | **20** | **212** | **✅ 100%** |

## References

- [Playwright Documentation](https://playwright.dev/)
- [Nuxt Testing Guide](https://nuxt.com/docs/getting-started/testing)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [tests/README.md](tests/README.md) - Detailed test documentation
