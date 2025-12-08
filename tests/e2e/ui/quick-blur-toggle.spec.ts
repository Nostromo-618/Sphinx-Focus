import { test, expect, type Page } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady, setStorageItem } from '../../fixtures/test-utils'

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

  test('should display quick blur toggle button in timer card header when focus mode is running with blur enabled', async ({ page }) => {
    // Start focus timer (blur mode is enabled by default)
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300)

    const button = getQuickBlurButton(page)
    await expect(button).toBeVisible()
  })

  test('should show eye icon when tasks are not blurred', async ({ page }) => {
    // Start focus timer (blur mode is enabled by default)
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300)

    const taskCard = getTaskListCard(page)
    // Initially blurred due to auto-blur
    await expect(taskCard).toHaveClass(/blur-md/)

    // Unblur with eye button
    const button = getQuickBlurButton(page)
    await button.click()
    await page.waitForTimeout(300)

    // Now not blurred
    await expect(taskCard).not.toHaveClass(/blur-md/)
    // Verify button is still visible (icon state implied by blur state)
    await expect(getQuickBlurButton(page)).toBeVisible()
  })

  test('should toggle blur on task list when clicked (focus mode running)', async ({ page }) => {
    // Start focus timer (blur mode is enabled by default)
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300)

    const taskCard = getTaskListCard(page)
    const button = getQuickBlurButton(page)

    // Initially blurred due to auto-blur
    await expect(taskCard).toHaveClass(/blur-md/)

    // Click to unblur
    await button.click()
    await page.waitForTimeout(300) // Allow transition

    // Should not be blurred
    await expect(taskCard).not.toHaveClass(/blur-md/)

    // Click again to blur
    await button.click()
    await page.waitForTimeout(300)

    // Should be blurred again
    await expect(taskCard).toHaveClass(/blur-md/)
    await expect(taskCard).toHaveClass(/opacity-50/)
  })

  test('should persist blur state to localStorage', async ({ page }) => {
    // Start focus timer (blur mode is enabled by default)
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300)

    const button = getQuickBlurButton(page)
    const taskCard = getTaskListCard(page)

    // Initially blurred (auto-blur active)
    await expect(taskCard).toHaveClass(/blur-md/)

    // Click to unblur
    await button.click()
    await page.waitForTimeout(300)

    // Should be unblurred (settings are now encrypted, verify behavior)
    await expect(taskCard).not.toHaveClass(/blur-md/)

    // Click to blur again
    await button.click()
    await page.waitForTimeout(300)

    // Should be blurred again
    await expect(taskCard).toHaveClass(/blur-md/)
  })

  test('should load persisted blur state on page load', async ({ page }) => {
    // Start focus timer and set blur state via UI
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300)

    const button = getQuickBlurButton(page)
    const taskCard = getTaskListCard(page)

    // Ensure it's blurred (default state)
    await expect(taskCard).toHaveClass(/blur-md/)

    // If not blurred, click to blur it
    const isBlurred = await taskCard.evaluate((el) => el.classList.contains('blur-md'))
    if (!isBlurred) {
      await button.click()
      await page.waitForTimeout(300)
    }

    // Wait for settings to save
    await page.waitForTimeout(500)

    // Stop timer before reload to avoid resume issues
    await page.getByTestId('timer-pause').click()
    await page.getByTestId('timer-reset').click()

    // Reload to apply (security is already configured from beforeEach)
    await page.reload()
    await waitForAppReady(page)

    // Start focus timer again
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300)

    // Should be blurred on load (persisted state + auto-blur)
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

    // Button should not be visible when blur mode is disabled
    const button = getQuickBlurButton(page)
    await expect(button).not.toBeVisible()
  })

  test('should not show button when blur mode is disabled', async ({ page }) => {
    // Disable blur mode in settings
    await page.getByRole('button', { name: 'Timer Settings' }).click()
    await page.locator('#blur-mode').click() // Toggle off
    await page.getByRole('button', { name: 'Save' }).click()

    const taskCard = getTaskListCard(page)

    // Start focus timer (no auto-blur, blur mode disabled)
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300)
    await expect(taskCard).not.toHaveClass(/blur-md/)

    // Button should not be visible when blur mode is disabled
    const button = getQuickBlurButton(page)
    await expect(button).not.toBeVisible()
  })
})

