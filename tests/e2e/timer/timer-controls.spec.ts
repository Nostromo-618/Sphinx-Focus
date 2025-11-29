import { test, expect } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady } from '../../fixtures/test-utils'

test.describe('Timer Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should display initial timer state correctly', async ({ page }) => {
    // Timer should show 25:00 (default focus duration)
    await expect(page.getByTestId('timer-display')).toHaveText('25:00')

    // Mode should be Focus
    await expect(page.getByTestId('timer-mode')).toHaveText('Focus')

    // Start button should be visible
    await expect(page.getByTestId('timer-start')).toBeVisible()

    // Pause and Resume should NOT be visible
    await expect(page.getByTestId('timer-pause')).not.toBeVisible()
    await expect(page.getByTestId('timer-resume')).not.toBeVisible()

    // Skip and Reset should be visible
    await expect(page.getByTestId('timer-skip')).toBeVisible()
    await expect(page.getByTestId('timer-reset')).toBeVisible()

    // Reset should be disabled when timer hasn't started
    await expect(page.getByTestId('timer-reset')).toBeDisabled()
  })

  test('should start timer and show pause button', async ({ page }) => {
    // Click start
    await page.getByTestId('timer-start').click()

    // Start button should be replaced by Pause
    await expect(page.getByTestId('timer-start')).not.toBeVisible()
    await expect(page.getByTestId('timer-pause')).toBeVisible()

    // Timer should be counting down (wait a moment and check it changed)
    await page.waitForTimeout(1500)
    const time = await page.getByTestId('timer-display').textContent()
    expect(time).not.toBe('25:00')
  })

  test('should pause timer and show resume button', async ({ page }) => {
    // Start timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(500)

    // Pause timer
    await page.getByTestId('timer-pause').click()

    // Pause should be replaced by Resume
    await expect(page.getByTestId('timer-pause')).not.toBeVisible()
    await expect(page.getByTestId('timer-resume')).toBeVisible()

    // Get current time
    const pausedTime = await page.getByTestId('timer-display').textContent()

    // Wait and verify time doesn't change
    await page.waitForTimeout(1500)
    await expect(page.getByTestId('timer-display')).toHaveText(pausedTime!)
  })

  test('should resume timer after pause', async ({ page }) => {
    // Start timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(500)

    // Pause timer
    await page.getByTestId('timer-pause').click()
    const pausedTime = await page.getByTestId('timer-display').textContent()

    // Resume timer
    await page.getByTestId('timer-resume').click()

    // Resume should be replaced by Pause
    await expect(page.getByTestId('timer-resume')).not.toBeVisible()
    await expect(page.getByTestId('timer-pause')).toBeVisible()

    // Wait and verify time continues
    await page.waitForTimeout(1500)
    const newTime = await page.getByTestId('timer-display').textContent()
    expect(newTime).not.toBe(pausedTime)
  })

  test('should reset timer to initial state', async ({ page }) => {
    // Start timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(2000)

    // Pause first
    await page.getByTestId('timer-pause').click()

    // Reset should now be enabled
    await expect(page.getByTestId('timer-reset')).toBeEnabled()

    // Click reset
    await page.getByTestId('timer-reset').click()

    // Timer should return to initial state
    await expect(page.getByTestId('timer-display')).toHaveText('25:00')
    await expect(page.getByTestId('timer-start')).toBeVisible()
    await expect(page.getByTestId('timer-reset')).toBeDisabled()
  })

  test('should skip focus session and switch to rest mode', async ({ page }) => {
    // Initially in Focus mode
    await expect(page.getByTestId('timer-mode')).toHaveText('Focus')

    // Click skip
    await page.getByTestId('timer-skip').click()

    // Should switch to Rest mode
    await expect(page.getByTestId('timer-mode')).toHaveText('Rest')

    // Timer should show rest duration (default 5 minutes)
    await expect(page.getByTestId('timer-display')).toHaveText('05:00')
  })

  test('should skip rest session and switch back to focus mode', async ({ page }) => {
    // Skip to rest mode
    await page.getByTestId('timer-skip').click()
    await expect(page.getByTestId('timer-mode')).toHaveText('Rest')

    // Skip back to focus mode
    await page.getByTestId('timer-skip').click()

    // Should be back in Focus mode
    await expect(page.getByTestId('timer-mode')).toHaveText('Focus')
    await expect(page.getByTestId('timer-display')).toHaveText('25:00')
  })

  test('should enable reset button after time has elapsed', async ({ page }) => {
    // Initially reset is disabled
    await expect(page.getByTestId('timer-reset')).toBeDisabled()

    // Start and let some time pass
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(1500)

    // Pause
    await page.getByTestId('timer-pause').click()

    // Reset should now be enabled
    await expect(page.getByTestId('timer-reset')).toBeEnabled()
  })

  test('should display correct button labels', async ({ page }) => {
    // Idle state
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Skip' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible()

    // Running state
    await page.getByTestId('timer-start').click()
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()

    // Paused state
    await page.getByTestId('timer-pause').click()
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  })
})

test.describe('Timer Progress Indicator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should display circular progress indicator', async ({ page }) => {
    // SVG progress circle should be visible
    await expect(page.locator('svg circle').first()).toBeVisible()
  })

  test('should update progress as timer runs', async ({ page }) => {
    // Get initial time display
    await expect(page.getByTestId('timer-display')).toHaveText('25:00')

    // Start timer and wait for it to tick
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(2000)

    // Time should have changed (progress indicator updates with time)
    const timeAfter = await page.getByTestId('timer-display').textContent()
    expect(timeAfter).not.toBe('25:00')
  })
})

test.describe('Timer in Different Modes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should maintain state when switching modes while paused', async ({ page }) => {
    // Start focus timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(2000)

    // Pause
    await page.getByTestId('timer-pause').click()

    // Skip to rest
    await page.getByTestId('timer-skip').click()

    // Should be in idle state for rest (not paused)
    await expect(page.getByTestId('timer-mode')).toHaveText('Rest')
    await expect(page.getByTestId('timer-start')).toBeVisible()
    await expect(page.getByTestId('timer-display')).toHaveText('05:00')
  })

  test('should update page title based on timer state', async ({ page }) => {
    // Initial title
    await expect(page).toHaveTitle('Sphinx Focus')

    // Start focus timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(500)

    // Title should include mode and time
    const title = await page.title()
    expect(title).toMatch(/FOCUS - \d{2}:\d{2}/)

    // Pause and skip to rest
    await page.getByTestId('timer-pause').click()
    await page.getByTestId('timer-skip').click()

    // Start rest timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(500)

    const restTitle = await page.title()
    expect(restTitle).toMatch(/REST - \d{2}:\d{2}/)
  })
})
