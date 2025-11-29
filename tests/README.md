# Sphinx Focus Test Suite

This directory contains automated tests for the Sphinx Focus application using Playwright.

## Directory Structure

```
tests/
├── e2e/                          # End-to-end browser tests
│   ├── security/                 # Security flow tests
│   │   ├── first-run-setup.spec.ts   [P0 - Critical]
│   │   ├── pin-unlock.spec.ts        [P0 - Critical]
│   │   └── auto-mode.spec.ts         [P2 - Medium]
│   ├── timer/                    # Timer functionality tests
│   │   ├── timer-controls.spec.ts    [P1 - High]
│   │   ├── timer-persistence.spec.ts [P2 - Medium]
│   │   └── timer-settings.spec.ts    [P2 - Medium]
│   ├── tasks/                    # Task management tests
│   │   ├── task-crud.spec.ts         [P1 - High]
│   │   └── task-drag-drop.spec.ts    [P3 - Low]
│   └── ui/                       # UI/UX tests
│       ├── color-mode.spec.ts        [P3 - Low]
│       └── responsive.spec.ts        [P3 - Low]
├── fixtures/                     # Test utilities and helpers
│   └── test-utils.ts
└── README.md                     # This file
```

## Running Tests

### All Tests
```bash
pnpm test
```

### Interactive UI Mode
```bash
pnpm test:ui
```

### Debug Mode
```bash
pnpm test:debug
```

### Headed Mode (see browser)
```bash
pnpm test:headed
```

### Single Browser
```bash
pnpm test:chromium
```

### Specific Test File
```bash
pnpm test tests/e2e/security/first-run-setup.spec.ts
```

### Specific Test by Name
```bash
pnpm test -g "should complete setup with PIN mode"
```

## Writing Tests

### Test File Naming

- Use `.spec.ts` extension
- Name should describe the feature being tested
- Group related tests in subdirectories

### Test Structure

```typescript
import { test, expect } from '@playwright/test'
import { SphinxFocusPage, clearStorage } from '../../fixtures/test-utils'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Clear state before each test
    await page.goto('/')
    await clearStorage(page)
  })

  test('should do something specific', async ({ page }) => {
    const app = new SphinxFocusPage(page)
    
    // Arrange
    await app.setupAutoMode()
    
    // Act
    await app.addTask('Test task')
    
    // Assert
    await expect(page.getByText('Test task')).toBeVisible()
  })
})
```

### Using Test Utilities

The `test-utils.ts` file provides:

- **SphinxFocusPage**: Page object with common actions
- **Storage helpers**: `clearStorage()`, `getStorageItem()`, etc.
- **Bypass helpers**: `bypassSecuritySetup()` for non-security tests
- **Wait helpers**: `waitForAppReady()`, `waitForSecurityModal()`
- **Assertion helpers**: `assertTimerDisplay()`, `assertTaskCount()`

### Selector Strategy

Prefer selectors in this order:

1. **data-testid** (most reliable)
   ```typescript
   page.getByTestId('timer-start')
   ```

2. **Role + name** (semantic)
   ```typescript
   page.getByRole('button', { name: 'Start' })
   ```

3. **Text content** (user-facing)
   ```typescript
   page.getByText('Focus Timer')
   ```

### Handling Security

For tests that don't focus on security:

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await bypassSecuritySetup(page)
  await page.reload()
  await waitForAppReady(page)
})
```

For security-focused tests, go through the actual flow:

```typescript
test('should setup PIN mode', async ({ page }) => {
  const app = new SphinxFocusPage(page)
  await app.setupPINMode('1234')
  // ...
})
```

## Test Data

### Constants

```typescript
import { TEST_PIN, WRONG_PIN, STORAGE_KEYS } from '../../fixtures/test-utils'
```

### Isolation

- Each test clears localStorage in `beforeEach`
- Tests don't share state
- Use unique identifiers when needed

## Debugging

### Trace Viewer

On failure, traces are saved. View with:
```bash
pnpm exec playwright show-trace test-results/*/trace.zip
```

### Screenshots

Screenshots on failure are in `test-results/*/`.

### Debug Mode

```bash
pnpm test:debug tests/e2e/security/pin-unlock.spec.ts
```

### VS Code Extension

Install "Playwright Test for VSCode" for:
- Test explorer
- Click-to-run
- Debug integration

## CI/CD

Tests run automatically on:
- Push to `main`
- Pull requests

See `.github/workflows/playwright.yml` for configuration.

## Coverage Goals

| Phase | Target | Status |
|-------|--------|--------|
| Phase 1 | 50% critical paths | Current |
| Phase 2 | 70% all features | Planned |
| Phase 3 | 85% with visual regression | Future |

## Contributing

1. Add tests for new features
2. Add regression tests for bug fixes
3. Follow existing patterns
4. Run `pnpm test` before committing
5. Update this README if adding new test categories

