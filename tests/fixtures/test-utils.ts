import { type Page, type BrowserContext, expect } from '@playwright/test'

/**
 * Test utilities and fixtures for Sphinx Focus E2E tests
 */

// ============================================================================
// Constants
// ============================================================================

export const TEST_PIN = '1234'
export const WRONG_PIN = '9999'
export const FOCUS_DURATION_SECONDS = 25 * 60
export const REST_DURATION_SECONDS = 5 * 60

export const STORAGE_KEYS = {
  security: 'sphinx-focus-security',
  tasks: 'sphinx-focus-tasks-encrypted',
  settings: 'sphinx-focus-settings-encrypted',
  // Legacy keys (for migration tests only - no longer used)
  timer: 'sphinx-focus-timer',
  focusDuration: 'sphinx-focus-focus-duration',
  restDuration: 'sphinx-focus-rest-duration',
  blurMode: 'sphinx-focus-blur-mode',
  quickBlur: 'sphinx-focus-quick-blur',
  taskFadeDuration: 'sphinx-focus-task-fade-duration',
  taskPosition: 'sphinx-focus-task-position'
} as const

// ============================================================================
// Page Object Helpers
// ============================================================================

/**
 * Helper class for interacting with the Sphinx Focus app
 */
export class SphinxFocusPage {
  constructor(private page: Page) {}

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async goto() {
    await this.page.goto('/')
  }

  async reload() {
    await this.page.reload()
  }

  // ---------------------------------------------------------------------------
  // Security Setup
  // ---------------------------------------------------------------------------

  /**
   * Complete first-run setup with Auto mode (no PIN)
   */
  async setupAutoMode() {
    await this.page.getByTestId('security-auto-option').click()
    await this.page.waitForSelector('[data-testid="timer-start"]', { timeout: 10000 })
  }

  /**
   * Complete first-run setup with PIN mode
   */
  async setupPINMode(pin: string = TEST_PIN) {
    await this.page.getByTestId('security-pin-option').click()
    await this.enterPIN(pin, 'setup')
    await this.enterPIN(pin, 'confirm')
    await this.page.getByRole('button', { name: 'Secure My Tasks' }).click()
    await this.page.waitForSelector('[data-testid="timer-start"]', { timeout: 10000 })
  }

  /**
   * Enter PIN digits into PIN input fields
   */
  async enterPIN(pin: string, type: 'setup' | 'confirm' | 'unlock' = 'unlock') {
    const prefix = type === 'unlock' ? 'unlock-pin-input' : type === 'confirm' ? 'confirm-pin-input' : 'pin-input'
    for (let i = 0; i < 4; i++) {
      await this.page.getByTestId(`${prefix}-${i}`).fill(pin[i])
    }
  }

  /**
   * Unlock app with PIN for returning users
   */
  async unlockWithPIN(pin: string = TEST_PIN) {
    await this.enterPIN(pin, 'unlock')
    await this.page.waitForSelector('[data-testid="timer-start"]', { timeout: 10000 })
  }

  // ---------------------------------------------------------------------------
  // Timer Controls
  // ---------------------------------------------------------------------------

  async startTimer() {
    await this.page.getByTestId('timer-start').click()
  }

  async pauseTimer() {
    await this.page.getByTestId('timer-pause').click()
  }

  async resumeTimer() {
    await this.page.getByTestId('timer-resume').click()
  }

  async resetTimer() {
    await this.page.getByTestId('timer-reset').click()
  }

  async skipSession() {
    await this.page.getByTestId('timer-skip').click()
  }

  async getTimerDisplay(): Promise<string> {
    return await this.page.getByTestId('timer-display').textContent() || ''
  }

  async getTimerMode(): Promise<string> {
    return await this.page.getByTestId('timer-mode').textContent() || ''
  }

  // ---------------------------------------------------------------------------
  // Task Management
  // ---------------------------------------------------------------------------

  async addTask(text: string) {
    await this.page.getByTestId('task-input').fill(text)
    await this.page.getByTestId('task-add').click()
  }

  async addTaskWithEnter(text: string) {
    await this.page.getByTestId('task-input').fill(text)
    await this.page.getByTestId('task-input').press('Enter')
  }

  async toggleTask(taskId: string) {
    await this.page.getByTestId(`task-checkbox-${taskId}`).click()
  }

  async deleteTask(taskId: string) {
    await this.page.getByTestId(`task-delete-${taskId}`).click()
  }

  async getTaskCount(): Promise<number> {
    const items = this.page.locator('[data-testid^="task-item-"]')
    return await items.count()
  }

  async getTaskText(index: number): Promise<string> {
    const items = this.page.locator('[data-testid^="task-item-"]')
    const item = items.nth(index)
    return await item.locator('[data-testid^="task-text-"]').textContent() || ''
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  async openTimerSettings() {
    await this.page.getByRole('button', { name: 'Timer Settings' }).click()
  }

  // ---------------------------------------------------------------------------
  // Security Actions
  // ---------------------------------------------------------------------------

  async lockApp() {
    await this.page.getByRole('button', { name: /Security/ }).click()
    await this.page.getByRole('menuitem', { name: 'Lock App' }).click()
  }

  async clickForgotPIN() {
    await this.page.getByTestId('forgot-pin-link').click()
  }

  async confirmReset() {
    await this.page.getByRole('button', { name: 'Reset Everything' }).click()
  }
}

// ============================================================================
// Storage Helpers
// ============================================================================

/**
 * Clear all Sphinx Focus localStorage data
 */
export async function clearStorage(page: Page) {
  await page.evaluate((keys) => {
    Object.values(keys).forEach(key => localStorage.removeItem(key))
  }, STORAGE_KEYS)
}

/**
 * Get localStorage value
 */
export async function getStorageItem(page: Page, key: string): Promise<string | null> {
  return await page.evaluate(k => localStorage.getItem(k), key)
}

/**
 * Set localStorage value
 */
export async function setStorageItem(page: Page, key: string, value: string) {
  await page.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: key, v: value })
}

/**
 * Check if security is configured
 */
export async function isSecurityConfigured(page: Page): Promise<boolean> {
  const config = await getStorageItem(page, STORAGE_KEYS.security)
  return config !== null
}

/**
 * Get security mode from storage
 */
export async function getSecurityMode(page: Page): Promise<string | null> {
  const config = await getStorageItem(page, STORAGE_KEYS.security)
  if (!config) return null
  try {
    const parsed = JSON.parse(config)
    return parsed.mode || null
  } catch {
    return null
  }
}

// ============================================================================
// Bypass Helpers (for non-security tests)
// ============================================================================

/**
 * Setup auto mode directly via localStorage to bypass security modal
 * Use this for tests that don't focus on security features
 */
export async function bypassSecuritySetup(page: Page) {
  await page.evaluate(() => {
    // Generate a test encryption key
    const testKey = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))

    localStorage.setItem('sphinx-focus-security', JSON.stringify({
      mode: 'auto',
      autoKey: testKey
    }))
  })
}

// ============================================================================
// Wait Helpers
// ============================================================================

/**
 * Wait for app to be ready (security modal dismissed, main UI visible)
 */
export async function waitForAppReady(page: Page) {
  await page.waitForSelector('[data-testid="timer-start"]', { timeout: 15000 })
}

/**
 * Wait for security modal to appear
 */
export async function waitForSecurityModal(page: Page) {
  await page.waitForSelector('text=Choose Your Security Level', { timeout: 10000 })
}

/**
 * Wait for PIN modal to appear
 */
export async function waitForPINModal(page: Page) {
  await page.waitForSelector('text=Welcome Back', { timeout: 10000 })
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert timer displays expected time
 */
export async function assertTimerDisplay(page: Page, expected: string) {
  await expect(page.getByTestId('timer-display')).toHaveText(expected)
}

/**
 * Assert timer is in expected mode
 */
export async function assertTimerMode(page: Page, mode: 'Focus' | 'Rest') {
  await expect(page.getByTestId('timer-mode')).toHaveText(mode)
}

/**
 * Assert task list has expected count
 */
export async function assertTaskCount(page: Page, count: number) {
  const items = page.locator('[data-testid^="task-item-"]')
  await expect(items).toHaveCount(count)
}

// ============================================================================
// Context Setup
// ============================================================================

/**
 * Grant notification permission to browser context
 */
export async function grantNotificationPermission(context: BrowserContext) {
  await context.grantPermissions(['notifications'])
}

// ============================================================================
// Viewport Helpers
// ============================================================================

/**
 * Common viewport sizes for responsive testing
 */
export const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
  mobileLandscape: { width: 667, height: 375 },
  smallMobile: { width: 320, height: 568 }
} as const

/**
 * Set viewport to mobile size
 */
export async function setMobileViewport(page: Page) {
  await page.setViewportSize(VIEWPORTS.mobile)
}

/**
 * Set viewport to desktop size
 */
export async function setDesktopViewport(page: Page) {
  await page.setViewportSize(VIEWPORTS.desktop)
}

/**
 * Set viewport to tablet size
 */
export async function setTabletViewport(page: Page) {
  await page.setViewportSize(VIEWPORTS.tablet)
}

// ============================================================================
// Drag and Drop Helpers
// ============================================================================

/**
 * Drag a task from one position to another by index
 * @param page - Playwright page object
 * @param fromIndex - Index of the task to drag (0-based)
 * @param toIndex - Index of the target position (0-based)
 */
export async function dragTaskByIndex(page: Page, fromIndex: number, toIndex: number) {
  const tasks = page.locator('[data-testid^="task-item-"]')
  const fromTask = tasks.nth(fromIndex)
  const toTask = tasks.nth(toIndex)

  await fromTask.dragTo(toTask)
  // Allow time for state update
  await page.waitForTimeout(300)
}

/**
 * Drag a task from one position to another by text content
 * @param page - Playwright page object
 * @param fromText - Text content of the task to drag
 * @param toText - Text content of the target task
 */
export async function dragTaskByText(page: Page, fromText: string, toText: string) {
  const fromTask = page.locator('[data-testid^="task-item-"]').filter({ hasText: fromText })
  const toTask = page.locator('[data-testid^="task-item-"]').filter({ hasText: toText })

  await fromTask.dragTo(toTask)
  // Allow time for state update
  await page.waitForTimeout(300)
}

/**
 * Get the current order of tasks as an array of text content
 * @param page - Playwright page object
 * @returns Array of task text content in current order
 */
export async function getTaskOrder(page: Page): Promise<string[]> {
  const tasks = page.locator('[data-testid^="task-item-"]')
  const count = await tasks.count()
  const order: string[] = []

  for (let i = 0; i < count; i++) {
    const text = await tasks.nth(i).locator('[data-testid^="task-text-"]').textContent()
    order.push(text || '')
  }

  return order
}

// ============================================================================
// Color Mode Helpers
// ============================================================================

/**
 * Check if dark mode is currently active
 */
export async function isDarkMode(page: Page): Promise<boolean> {
  const htmlClass = await page.locator('html').getAttribute('class')
  return htmlClass?.includes('dark') || false
}

/**
 * Set color mode preference
 * @param page - Playwright page object
 * @param mode - 'light', 'dark', or 'system'
 */
export async function setColorMode(page: Page, mode: 'light' | 'dark' | 'system') {
  const colorModeButton = page.getByRole('button', { name: /mode.*click to change theme/i })
  await colorModeButton.click()

  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1)
  await page.getByRole('menuitemcheckbox', { name: modeLabel }).click()

  // Wait for theme transition
  await page.waitForTimeout(300)
}

// ============================================================================
// Theme Color Helpers
// ============================================================================

/**
 * Set theme color (primary or neutral)
 * @param page - Playwright page object
 * @param type - 'primary' or 'neutral'
 * @param color - Color name (e.g., 'blue', 'slate')
 */
export async function setThemeColor(page: Page, type: 'primary' | 'neutral', color: string) {
  const themeButton = page.getByRole('button', { name: /Customize theme colors/i })
  await themeButton.click()
  await page.waitForTimeout(300)

  const colorLabel = color.charAt(0).toUpperCase() + color.slice(1)
  const colorButton = page.getByRole('button', { name: new RegExp(`Select ${colorLabel} as ${type} color`, 'i') })
  await colorButton.click()
  await page.waitForTimeout(300)

  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
}
