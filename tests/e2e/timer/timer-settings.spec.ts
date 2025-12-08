import { test, expect, type Page } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady } from '../../fixtures/test-utils'

test.describe('Timer Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should open timer settings modal', async ({ page }) => {
    // Click settings button
    await page.getByRole('button', { name: 'Timer Settings' }).click()

    // Modal should be visible
    await expect(page.getByText('Timer Settings')).toBeVisible()
    await expect(page.getByText('Configure your focus and rest durations')).toBeVisible()
  })

  test('should display default values in settings', async ({ page }) => {
    await page.getByRole('button', { name: 'Timer Settings' }).click()

    // Check default values
    await expect(page.locator('#focus-duration')).toHaveValue('25')
    await expect(page.locator('#rest-duration')).toHaveValue('5')
  })

  test('should save custom focus duration', async ({ page }) => {
    await page.getByRole('button', { name: 'Timer Settings' }).click()

    // Change focus duration to 30 minutes
    await page.locator('#focus-duration').fill('30')

    // Save settings
    await page.getByRole('button', { name: 'Save' }).click()

    // Modal should close
    await expect(page.getByText('Timer Settings')).not.toBeVisible()

    // Timer should show new duration (settings are now stored encrypted)
    await expect(page.getByTestId('timer-display')).toHaveText('30:00')
  })

  test('should save custom rest duration', async ({ page }) => {
    await page.getByRole('button', { name: 'Timer Settings' }).click()

    // Change rest duration to 10 minutes
    await page.locator('#rest-duration').fill('10')
    await page.getByRole('button', { name: 'Save' }).click()

    // Skip to rest mode
    await page.getByTestId('timer-skip').click()

    // Timer should show new rest duration
    await expect(page.getByTestId('timer-display')).toHaveText('10:00')
  })

  test('should validate minimum duration (1 minute)', async ({ page }) => {
    await page.getByRole('button', { name: 'Timer Settings' }).click()

    // Try to set focus duration to 0
    await page.locator('#focus-duration').fill('0')
    await page.locator('#focus-duration').blur()

    // Error should be shown
    await expect(page.getByText('Focus duration must be between 1 and 99 minutes')).toBeVisible()

    // Save should still work but validation prevents invalid value
    await page.getByRole('button', { name: 'Save' }).click()

    // Should still show error (not saved)
    await expect(page.getByText('Focus duration must be between 1 and 99 minutes')).toBeVisible()
  })

  test('should validate maximum duration (99 minutes)', async ({ page }) => {
    await page.getByRole('button', { name: 'Timer Settings' }).click()

    // Try to set focus duration to 100
    await page.locator('#focus-duration').fill('100')
    await page.locator('#focus-duration').blur()

    // Error should be shown
    await expect(page.getByText('Focus duration must be between 1 and 99 minutes')).toBeVisible()
  })

  test('should cancel settings without saving', async ({ page }) => {
    await page.getByRole('button', { name: 'Timer Settings' }).click()

    // Change duration
    await page.locator('#focus-duration').fill('45')

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Modal should close
    await expect(page.getByText('Timer Settings')).not.toBeVisible()

    // Timer should still show default
    await expect(page.getByTestId('timer-display')).toHaveText('25:00')
  })

  test('should toggle blur mode setting', async ({ page }) => {
    await page.getByRole('button', { name: 'Timer Settings' }).click()

    // Blur mode description should be visible
    await expect(page.getByText('Blur the task list during focus sessions')).toBeVisible()

    // Toggle should be visible
    const blurToggle = page.locator('#blur-mode')
    await expect(blurToggle).toBeVisible()

    // Toggle it off
    await blurToggle.click()

    // Save
    await page.getByRole('button', { name: 'Save' }).click()

    // Verify setting is applied: start timer and check task list is NOT blurred
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300)

    // Get Task List card (second card in grid)
    const taskCard = page.locator('.grid > div').nth(1)
    // Task list should NOT be blurred since blur mode is disabled
    await expect(taskCard).not.toHaveClass(/blur-md/)
  })

  test('should persist settings across page reloads', async ({ page }) => {
    await page.getByRole('button', { name: 'Timer Settings' }).click()
    await page.locator('#focus-duration').fill('35')
    await page.locator('#rest-duration').fill('7')
    await page.getByRole('button', { name: 'Save' }).click()

    // Wait for settings to be saved (encrypted settings are saved with debounce)
    await page.waitForTimeout(500)

    // Reload page
    await page.reload()
    await waitForAppReady(page)

    // Wait for encrypted settings to load
    await page.waitForTimeout(500)

    // Timer should show saved focus duration
    await expect(page.getByTestId('timer-display')).toHaveText('35:00', { timeout: 10000 })

    // Skip to rest and check
    await page.getByTestId('timer-skip').click()
    await expect(page.getByTestId('timer-display')).toHaveText('07:00')
  })

  test('should apply settings only when timer is idle', async ({ page }) => {
    // Start timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(2000)

    // Get current time (stored but not used - timer continues running)
    const _runningTime = await page.getByTestId('timer-display').textContent()

    // Open settings and change duration
    await page.getByRole('button', { name: 'Timer Settings' }).click()
    await page.locator('#focus-duration').fill('15')
    await page.getByRole('button', { name: 'Save' }).click()

    // Timer should still be running with previous duration
    const afterSaveTime = await page.getByTestId('timer-display').textContent()
    // Time should have continued from where it was, not jumped to new duration
    expect(afterSaveTime).not.toBe('15:00')

    // But settings should apply after reset
    await page.getByTestId('timer-pause').click()
    await page.getByTestId('timer-reset').click()

    // Now should show new duration
    await expect(page.getByTestId('timer-display')).toHaveText('15:00')
  })
})

test.describe('Blur Mode Effects', () => {
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

  test('should blur task list during focus mode when blur enabled', async ({ page }) => {
    // Blur mode is enabled by default
    // Get Task List card (second card in grid)
    const taskCard = getTaskListCard(page)

    // Initially idle - should not be blurred
    await expect(taskCard).not.toHaveClass(/blur-md/)

    // Start focus timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300) // Allow transition

    // Task List should be blurred
    await expect(taskCard).toHaveClass(/blur-md/)
    await expect(taskCard).toHaveClass(/opacity-50/)
  })

  test('should not blur task list when timer is idle', async ({ page }) => {
    // Get Task List card (second card in grid)
    const taskCard = getTaskListCard(page)

    // Initially idle - should not be blurred
    await expect(taskCard).not.toHaveClass(/blur-md/)

    // Skip to rest mode (still idle)
    await page.getByTestId('timer-skip').click()
    await expect(page.getByTestId('timer-mode')).toHaveText('Rest')

    // Still idle - should not be blurred
    await expect(taskCard).not.toHaveClass(/blur-md/)
  })

  test('should not blur task list during focus mode when blur disabled', async ({ page }) => {
    // Disable blur mode
    await page.getByRole('button', { name: 'Timer Settings' }).click()
    const blurToggle = page.locator('#blur-mode')
    await blurToggle.click() // Toggle off
    await page.getByRole('button', { name: 'Save' }).click()

    // Get Task List card (second card in grid)
    const taskCard = getTaskListCard(page)

    // Start focus timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(300) // Allow transition

    // Task List should NOT be blurred (blur disabled)
    await expect(taskCard).not.toHaveClass(/blur-md/)
  })

  test('should not blur task list during rest mode when blur disabled', async ({ page }) => {
    // Disable blur mode
    await page.getByRole('button', { name: 'Timer Settings' }).click()
    const blurToggle = page.locator('#blur-mode')
    await blurToggle.click() // Toggle off
    await page.getByRole('button', { name: 'Save' }).click()

    // Get Task List card (second card in grid)
    const taskCard = getTaskListCard(page)

    // Skip to rest mode
    await page.getByTestId('timer-skip').click()
    await expect(page.getByTestId('timer-mode')).toHaveText('Rest')

    // Start rest timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(500) // Allow time for rest mode stage transition

    // Task List should NOT be blurred (blur disabled)
    await expect(taskCard).not.toHaveClass(/blur-xl/)
    await expect(taskCard).not.toHaveClass(/blur-md/)
  })
})
