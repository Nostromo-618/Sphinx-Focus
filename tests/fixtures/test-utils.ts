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
  backlog: 'sphinx-focus-backlog-encrypted',
  settings: 'sphinx-focus-settings-encrypted',
  disclaimer: 'sphinx-focus-disclaimer-accepted',
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
    // Accept disclaimer if it's visible
    const disclaimerButton = this.page.getByRole('button', { name: 'I Agree' })
    if (await disclaimerButton.isVisible().catch(() => false)) {
      await disclaimerButton.click()
    }
    await this.page.getByTestId('security-auto-option').click()
    await this.page.waitForSelector('[data-testid="timer-start"]', { timeout: 10000 })
  }

  /**
   * Complete first-run setup with PIN mode
   */
  async setupPINMode(pin: string = TEST_PIN) {
    // Accept disclaimer if it's visible
    const disclaimerButton = this.page.getByRole('button', { name: 'I Agree' })
    if (await disclaimerButton.isVisible().catch(() => false)) {
      await disclaimerButton.click()
    }
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
  // Backlog Management
  // ---------------------------------------------------------------------------

  async addBacklogTask(text: string) {
    await this.page.getByTestId('backlog-input').fill(text)
    await this.page.getByTestId('backlog-add').click()
  }

  async addBacklogTaskWithEnter(text: string) {
    await this.page.getByTestId('backlog-input').fill(text)
    await this.page.getByTestId('backlog-input').press('Enter')
  }

  async toggleBacklogTask(taskId: string) {
    await this.page.getByTestId(`backlog-checkbox-${taskId}`).click()
  }

  async deleteBacklogTask(taskId: string) {
    await this.page.getByTestId(`backlog-delete-${taskId}`).click()
  }

  async getBacklogTaskCount(): Promise<number> {
    const items = this.page.locator('[data-testid^="backlog-item-"]')
    return await items.count()
  }

  async getBacklogTaskText(index: number): Promise<string> {
    const items = this.page.locator('[data-testid^="backlog-item-"]')
    const item = items.nth(index)
    return await item.locator('[data-testid^="backlog-text-"]').textContent() || ''
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
 * Bypass disclaimer modal by accepting it in localStorage
 * Use this for tests that don't focus on disclaimer features
 */
export async function bypassDisclaimer(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('sphinx-focus-disclaimer-accepted', 'true')
  })
}

/**
 * Setup auto mode directly via localStorage to bypass security modal
 * Use this for tests that don't focus on security features
 * Also bypasses disclaimer to ensure app is ready
 */
export async function bypassSecuritySetup(page: Page) {
  await page.evaluate(() => {
    // Accept disclaimer first
    localStorage.setItem('sphinx-focus-disclaimer-accepted', 'true')

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

/**
 * Get the current order of backlog tasks as an array of text content
 * @param page - Playwright page object
 * @returns Array of backlog task text content in current order
 */
export async function getBacklogTaskOrder(page: Page): Promise<string[]> {
  const tasks = page.locator('[data-testid^="backlog-item-"]')
  const count = await tasks.count()
  const order: string[] = []

  for (let i = 0; i < count; i++) {
    const text = await tasks.nth(i).locator('[data-testid^="backlog-text-"]').textContent()
    order.push(text || '')
  }

  return order
}

/**
 * Drag a task between Task List and Backlog
 * @param page - Playwright page object
 * @param fromList - 'tasks' or 'backlog'
 * @param toList - 'tasks' or 'backlog'
 * @param taskText - Text content of the task to drag
 * @param targetTaskText - Optional: Text content of the target task to drop on (for position)
 */
export async function dragTaskBetweenLists(
  page: Page,
  fromList: 'tasks' | 'backlog',
  toList: 'tasks' | 'backlog',
  taskText: string,
  targetTaskText?: string
) {
  const fromPrefix = fromList === 'tasks' ? 'task-item-' : 'backlog-item-'
  const toPrefix = toList === 'tasks' ? 'task-item-' : 'backlog-item-'

  const fromTask = page.locator(`[data-testid^="${fromPrefix}"]`).filter({ hasText: taskText })
  
  if (targetTaskText) {
    // For position-aware drags: hover over target task first to set dragOverTaskId
    // Then drop on the card container so the card handler can read dragOverTaskId
    const targetTask = page.locator(`[data-testid^="${toPrefix}"]`).filter({ hasText: targetTaskText })
    const fromBox = await fromTask.boundingBox()
    const targetBox = await targetTask.boundingBox()
    
    // Find card container to drop on
    let cardContainer
    if (toList === 'tasks') {
      cardContainer = page.locator('[data-testid="task-settings-button"]').locator('..').locator('..').locator('..')
    } else {
      cardContainer = page.locator('h3:has-text("Backlog")').locator('..').locator('..')
    }
    const cardBox = await cardContainer.boundingBox()
    
    if (fromBox && targetBox && cardBox) {
      // Start drag
      await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(100)
      
      // Hover over target task to set dragOverTaskId
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2)
      await page.waitForTimeout(300)
      
      // Drop on card container (dragOverTaskId should still be set)
      await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
      await page.waitForTimeout(100)
      await page.mouse.up()
    } else {
      // Fallback: simple dragTo
      await fromTask.dragTo(targetTask)
    }
  } else {
    // Simple transfer without position - drop on card container
    let toTarget
    if (toList === 'tasks') {
      const settingsButton = page.locator('[data-testid="task-settings-button"]')
      if (await settingsButton.count() > 0) {
        toTarget = settingsButton
      } else {
        toTarget = page.locator('[data-testid="task-input"]')
      }
    } else {
      const backlogHeader = page.locator('h3:has-text("Backlog")')
      if (await backlogHeader.count() > 0) {
        toTarget = backlogHeader
      } else {
        toTarget = page.locator('[data-testid="backlog-input"]')
      }
    }
    await fromTask.dragTo(toTarget)
  }
  
  // Allow time for state update
  await page.waitForTimeout(500)
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
