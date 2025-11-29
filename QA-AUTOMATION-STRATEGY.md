# Sphinx Focus QA Automation Strategy

> **Version:** 1.0.0  
> **Last Updated:** 2025-11-29  
> **Status:** Active

## Overview

This document defines the QA automation strategy for Sphinx Focus, a Pomodoro timer and encrypted task manager built with Nuxt 4, Vue 3, and Nuxt UI v4.

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
         │   Visual    │  ~10% - Screenshot comparisons
         └─────────────┘
      ┌─────────────────────┐
      │    E2E Tests        │  ~30% - Critical user flows
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
├── e2e/                          # End-to-end browser tests
│   ├── security/                 # Security flow tests
│   │   ├── first-run-setup.spec.ts
│   │   ├── pin-unlock.spec.ts
│   │   └── auto-mode.spec.ts
│   ├── timer/                    # Timer functionality tests
│   │   ├── timer-controls.spec.ts
│   │   ├── timer-persistence.spec.ts
│   │   └── timer-settings.spec.ts
│   ├── tasks/                    # Task management tests
│   │   ├── task-crud.spec.ts
│   │   └── task-drag-drop.spec.ts
│   └── ui/                       # UI/UX tests
│       ├── color-mode.spec.ts
│       └── responsive.spec.ts
├── fixtures/                     # Test utilities and helpers
│   └── test-utils.ts
└── README.md                     # Test documentation
```

## Critical Paths

### Priority Matrix

| Priority | Feature | Risk Level | Test Coverage Target |
|----------|---------|------------|---------------------|
| P0 | Security Setup (First Run) | Critical | 100% |
| P0 | PIN Unlock Flow | Critical | 100% |
| P0 | Task Encryption/Decryption | Critical | 100% |
| P1 | Timer Controls | High | 90% |
| P1 | Task CRUD Operations | High | 90% |
| P2 | Timer Settings | Medium | 70% |
| P2 | Timer Persistence | Medium | 70% |
| P3 | Color Mode | Low | 50% |
| P3 | Responsive Layout | Low | 50% |
| P3 | Drag & Drop | Low | 50% |

### Critical User Flows

1. **First-Time User Setup**
   ```
   App Load → Security Modal → Choose Mode → (PIN Setup | Auto) → App Ready
   ```

2. **Returning PIN User**
   ```
   App Load → PIN Modal → Enter PIN → Verify → App Ready (with decrypted tasks)
   ```

3. **Focus Session**
   ```
   Start Timer → Running → (Pause/Resume) → Complete → Switch Mode → Rest
   ```

4. **Task Management**
   ```
   Add Task → View in List → Toggle Complete → Reorder → Delete
   ```

## Testing Strategies

### localStorage & Encryption Testing

**Challenge:** Tasks are encrypted with AES-GCM using keys derived from PIN or auto-generated.

**Strategy:**
```typescript
// Clear state before each test
await page.evaluate(() => localStorage.clear())

// Bypass security for non-security tests
await page.evaluate(() => {
  const autoKey = 'base64-encoded-test-key'
  localStorage.setItem('sphinx-focus-security', JSON.stringify({
    mode: 'auto',
    autoKey: autoKey
  }))
})
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
// Mock time for consistent testing
await page.clock.install({ time: new Date('2025-01-01T12:00:00') })

// Fast-forward timer
await page.clock.fastForward(5000) // 5 seconds
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
   page.getByTestId('timer-start-button')
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
| FocusTimer | Reset button | `timer-reset` |
| FocusTimer | Skip button | `timer-skip` |
| FocusTimer | Time display | `timer-display` |
| FocusTimer | Mode label | `timer-mode` |
| TaskList | Input field | `task-input` |
| TaskList | Add button | `task-add` |
| TaskList | Task item | `task-item-{id}` |
| TaskList | Delete button | `task-delete-{id}` |
| TaskList | Checkbox | `task-checkbox-{id}` |
| SecuritySetupModal | PIN option | `security-pin-option` |
| SecuritySetupModal | Auto option | `security-auto-option` |
| SecuritySetupModal | PIN inputs | `pin-input-{0-3}` |
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

  async setupPINMode(pin: string) {
    await this.page.getByTestId('security-pin-option').click()
    for (let i = 0; i < 4; i++) {
      await this.page.getByTestId(`pin-input-${i}`).fill(pin[i])
    }
    // Confirm PIN
    for (let i = 0; i < 4; i++) {
      await this.page.getByTestId(`confirm-pin-input-${i}`).fill(pin[i])
    }
    await this.page.getByRole('button', { name: 'Secure My Tasks' }).click()
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

// Visual regression
await expect(page).toHaveScreenshot('timer-idle.png')
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

### Pre-commit Hooks

```bash
# Run affected tests before commit
pnpm test --only-changed
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
export const TEST_TASKS = [
  { text: 'Test task 1', completed: false },
  { text: 'Test task 2', completed: true }
]
export const FOCUS_DURATION = 25 * 60 // 25 minutes in seconds
export const REST_DURATION = 5 * 60   // 5 minutes in seconds
```

## Debugging Failed Tests

### Local Debugging

```bash
# Run with UI mode
pnpm test:ui

# Run specific test in debug mode
pnpm test:debug tests/e2e/security/pin-unlock.spec.ts

# Generate trace on failure
pnpm test --trace on
```

### Using Chrome DevTools MCP

1. Start the dev server: `pnpm dev`
2. Use DevTools MCP to navigate to the failing state
3. Take snapshots at each step
4. Compare with Playwright trace

### Common Issues

| Issue | Solution |
|-------|----------|
| Flaky modal tests | Add `waitForSelector` before interactions |
| Timer timing issues | Use `page.clock` for time control |
| Encryption failures | Ensure proper key generation in fixtures |
| localStorage race conditions | Use `page.waitForFunction` |

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
- [ ] Has meaningful test names
- [ ] Covers happy path and key errors
- [ ] No hardcoded waits (use auto-waiting)
- [ ] Follows existing patterns

## Coverage Goals

| Milestone | Target | Timeline |
|-----------|--------|----------|
| Phase 1 | 50% critical paths | Initial setup |
| Phase 2 | 70% all features | +2 weeks |
| Phase 3 | 85% with visual regression | +4 weeks |
| Maintenance | 85%+ | Ongoing |

## References

- [Playwright Documentation](https://playwright.dev/)
- [Nuxt Testing Guide](https://nuxt.com/docs/getting-started/testing)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

