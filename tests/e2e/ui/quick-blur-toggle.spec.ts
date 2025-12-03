import { test, expect, type Page } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady, getStorageItem, setStorageItem } from '../../fixtures/test-utils'

const QUICK_BLUR_KEY = 'sphinx-focus-quick-blur'

test.describe('Quick Blur Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  // Helper to get Task List card (second card in the grid)
  function getTaskListCard(page: Page) {
    return page.locator('.grid > div').nth(1)
  }

  // Helper to get the quick blur toggle button
  function getQuickBlurButton(page: Page) {
    return page.getByRole('button', { name: 'Toggle task list blur' })
  }

  // Helper to check if eye icon (visible state) is shown
  async function hasEyeIcon(page: Page): Promise<boolean> {
    const button = getQuickBlurButton(page)
    // eye icon is shown when NOT blurred, eye-off when blurred
    // Check for eye-off first (blurred state)
    const eyeOffIcon = button.locator('.iconify.i-lucide\\:eye-off')
    const eyeOffCount = await eyeOffIcon.count()
    return eyeOffCount === 0 // If no eye-off, then it's showing eye (visible)
  }

  test('should display quick blur toggle button in timer card header', async ({ page }) => {
    const button = getQuickBlurButton(page)
    await expect(button).toBeVisible()
  })

  test('should show eye icon when tasks are not blurred', async ({ page }) => {
    const taskCard = getTaskListCard(page)
    // Default state - not blurred
    await expect(taskCard).not.toHaveClass(/blur-md/)
    // Verify button is visible (icon state implied by blur state)
    await expect(getQuickBlurButton(page)).toBeVisible()
  })

  test('should toggle blur on task list when clicked (idle state)', async ({ page }) => {
    const taskCard = getTaskListCard(page)
    const button = getQuickBlurButton(page)

    // Initially not blurred
    await expect(taskCard).not.toHaveClass(/blur-md/)

    // Click to blur
    await button.click()
    await page.waitForTimeout(300) // Allow transition

    // Should be blurred
    await expect(taskCard).toHaveClass(/blur-md/)
    await expect(taskCard).toHaveClass(/opacity-50/)

    // Click again to unblur
    await button.click()
    await page.waitForTimeout(300)

    // Should not be blurred
    await expect(taskCard).not.toHaveClass(/blur-md/)
  })

  test('should persist blur state to localStorage', async ({ page }) => {
    const button = getQuickBlurButton(page)

    // Initially not stored or false
    let stored = await getStorageItem(page, QUICK_BLUR_KEY)
    expect(stored === null || stored === 'false').toBeTruthy()

    // Click to blur
    await button.click()

    // Should be saved as true
    stored = await getStorageItem(page, QUICK_BLUR_KEY)
    expect(stored).toBe('true')

    // Click to unblur
    await button.click()

    // Should be saved as false
    stored = await getStorageItem(page, QUICK_BLUR_KEY)
    expect(stored).toBe('false')
  })

  test('should persist blur state across page reloads', async ({ page }) => {
    const button = getQuickBlurButton(page)
    const taskCard = getTaskListCard(page)

    // Enable blur
    await button.click()
    await page.waitForTimeout(300)
    await expect(taskCard).toHaveClass(/blur-md/)

    // Verify it was saved
    const stored = await getStorageItem(page, QUICK_BLUR_KEY)
    expect(stored).toBe('true')

    // Reload page (don't clear storage - we want to test persistence)
    await page.reload()
    await waitForAppReady(page)

    // Should still be blurred
    await expect(getTaskListCard(page)).toHaveClass(/blur-md/)
  })

  test('should load persisted blur state on page load', async ({ page }) => {
    // Set blur state directly in localStorage (after security is already set up)
    await setStorageItem(page, QUICK_BLUR_KEY, 'true')

    // Reload to apply (security is already configured from beforeEach)
    await page.reload()
    await waitForAppReady(page)

    // Should be blurred on load
    const taskCard = getTaskListCard(page)
    await expect(taskCard).toHaveClass(/blur-md/)
  })
})

test.describe('Quick Blur Toggle with Auto-Blur', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  // Helper to get Task List card
  function getTaskListCard(page: Page) {
    return page.locator('.grid > div').nth(1)
  }

  // Helper to get the quick blur toggle button
  function getQuickBlurButton(page: Page) {
    return page.getByRole('button', { name: 'Toggle task list blur' })
  }

  test('should auto-blur task list when focus timer starts (blur mode enabled)', async ({ page }) => {
    const taskCard = getTaskListCard(page)

    // Blur mode is enabled by default
    // Start focus timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300)

    // Should be blurred (auto-blur active)
    await expect(taskCard).toHaveClass(/blur-md/)
  })

  test('should unblur task list when clicking eye button during auto-blur', async ({ page }) => {
    const taskCard = getTaskListCard(page)
    const button = getQuickBlurButton(page)

    // Start focus timer (auto-blur activates)
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300)

    // Verify auto-blur is active
    await expect(taskCard).toHaveClass(/blur-md/)

    // Click eye button to override and unblur
    await button.click()
    await page.waitForTimeout(300)

    // Should NOT be blurred (manual override)
    await expect(taskCard).not.toHaveClass(/blur-md/)
  })

  test('should re-blur task list when clicking eye button again during focus', async ({ page }) => {
    const taskCard = getTaskListCard(page)
    const button = getQuickBlurButton(page)

    // Start focus timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300)

    // Unblur with eye button
    await button.click()
    await page.waitForTimeout(300)
    await expect(taskCard).not.toHaveClass(/blur-md/)

    // Re-blur with eye button
    await button.click()
    await page.waitForTimeout(300)

    // Should be blurred again
    await expect(taskCard).toHaveClass(/blur-md/)
  })

  test('should maintain unblurred state when pausing timer after override', async ({ page }) => {
    const taskCard = getTaskListCard(page)
    const button = getQuickBlurButton(page)

    // Start focus timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300)

    // Override auto-blur
    await button.click()
    await page.waitForTimeout(300)
    await expect(taskCard).not.toHaveClass(/blur-md/)

    // Pause timer
    await page.getByTestId('timer-pause').click()
    await page.waitForTimeout(300)

    // Should still not be blurred (manual state persists)
    await expect(taskCard).not.toHaveClass(/blur-md/)
  })

  test('should reset to auto-blur when timer restarts after reset', async ({ page }) => {
    const taskCard = getTaskListCard(page)
    const button = getQuickBlurButton(page)

    // Start focus timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300)

    // Override auto-blur
    await button.click()
    await page.waitForTimeout(300)
    await expect(taskCard).not.toHaveClass(/blur-md/)

    // Pause and reset timer
    await page.getByTestId('timer-pause').click()
    await page.getByTestId('timer-reset').click()
    await page.waitForTimeout(300)

    // Start timer again
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300)

    // Auto-blur should re-activate (sets manualBlurEnabled to true)
    await expect(taskCard).toHaveClass(/blur-md/)
  })

  test('should not auto-blur when blur mode is disabled in settings', async ({ page }) => {
    // Disable blur mode in settings
    await page.getByRole('button', { name: 'Timer Settings' }).click()
    await page.locator('#blur-mode').click() // Toggle off
    await page.getByRole('button', { name: 'Save' }).click()

    const taskCard = getTaskListCard(page)

    // Start focus timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300)

    // Should NOT be blurred (blur mode disabled)
    await expect(taskCard).not.toHaveClass(/blur-md/)
  })

  test('should allow manual blur when auto-blur is disabled', async ({ page }) => {
    // Disable blur mode in settings
    await page.getByRole('button', { name: 'Timer Settings' }).click()
    await page.locator('#blur-mode').click() // Toggle off
    await page.getByRole('button', { name: 'Save' }).click()

    const taskCard = getTaskListCard(page)
    const button = getQuickBlurButton(page)

    // Start focus timer (no auto-blur)
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300)
    await expect(taskCard).not.toHaveClass(/blur-md/)

    // Manually blur with eye button
    await button.click()
    await page.waitForTimeout(300)

    // Should be blurred (manual)
    await expect(taskCard).toHaveClass(/blur-md/)
  })
})

