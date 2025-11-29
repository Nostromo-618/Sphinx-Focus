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
  timer: 'sphinx-focus-timer',
  focusDuration: 'sphinx-focus-focus-duration',
  restDuration: 'sphinx-focus-rest-duration',
  blurMode: 'sphinx-focus-blur-mode'
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
