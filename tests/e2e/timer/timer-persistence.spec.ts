import { test, expect } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady, STORAGE_KEYS, getStorageItem } from '../../fixtures/test-utils'

/**
 * Wait for timer UI to be ready (either start or pause button visible)
 */
async function waitForTimerReady(page: import('@playwright/test').Page) {
  // Wait for timer display to be visible
  await page.waitForSelector('[data-testid="timer-display"]', { timeout: 15000 })
}

test.describe('Timer Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should persist running timer state across reload', async ({ page }) => {
    // Start timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(2000)

    // Verify timer is running
    await expect(page.getByTestId('timer-pause')).toBeVisible()

    // Get current time before reload
    const timeBeforeReload = await page.getByTestId('timer-display').textContent()

    // Reload page
    await page.reload()
    await waitForTimerReady(page)

    // Timer should still be running (pause button visible)
    await expect(page.getByTestId('timer-pause')).toBeVisible()

    // Time should have continued (be less than before due to elapsed time during reload)
    const timeAfterReload = await page.getByTestId('timer-display').textContent()
    expect(timeAfterReload).not.toBe('25:00')

    // Mode should still be Focus
    await expect(page.getByTestId('timer-mode')).toHaveText('Focus')
  })

  test('should calculate elapsed time when resuming after reload', async ({ page }) => {
    // Start timer
    await page.getByTestId('timer-start').click()

    // Wait a bit to let timer tick
    await page.waitForTimeout(3000)

    // Get time before reload
    const timeBeforeReload = await page.getByTestId('timer-display').textContent()

    // Reload page (simulates closing and reopening)
    await page.reload()
    await waitForTimerReady(page)

    // Wait a moment for timer to resume
    await page.waitForTimeout(1000)

    // Time should have progressed further (accounting for reload time)
    const timeAfterReload = await page.getByTestId('timer-display').textContent()

    // Parse times to compare
    const parseTime = (time: string) => {
      const [min, sec] = time.split(':').map(Number)
      return min * 60 + sec
    }

    const secondsBefore = parseTime(timeBeforeReload!)
    const secondsAfter = parseTime(timeAfterReload!)

    // Time after reload should be less than before (timer continued)
    expect(secondsAfter).toBeLessThan(secondsBefore)
  })

  test('should complete session if timer expired while page was closed', async ({ page }) => {
    // We'll simulate this by manipulating localStorage directly
    // Set up a timer state that would have expired

    const expiredTimerState = {
      mode: 'focus',
      state: 'running',
      timeRemaining: 5, // Only 5 seconds remaining
      lastUpdateTimestamp: Date.now() - 10000 // 10 seconds ago (timer should have expired)
    }

    await page.evaluate((state) => {
      localStorage.setItem('sphinx-focus-timer', JSON.stringify(state))
    }, expiredTimerState)

    // Reload page
    await page.reload()
    await waitForAppReady(page)

    // Timer should have completed and switched to rest mode
    await expect(page.getByTestId('timer-mode')).toHaveText('Rest')
    await expect(page.getByTestId('timer-display')).toHaveText('05:00')
  })

  test('should persist paused timer state across reload', async ({ page }) => {
    // Start timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(2000)

    // Pause timer
    await page.getByTestId('timer-pause').click()

    // Get paused time
    const pausedTime = await page.getByTestId('timer-display').textContent()

    // Verify paused state
    await expect(page.getByTestId('timer-resume')).toBeVisible()

    // Reload page
    await page.reload()
    await waitForTimerReady(page)

    // Should still be paused with same time
    await expect(page.getByTestId('timer-resume')).toBeVisible()
    await expect(page.getByTestId('timer-display')).toHaveText(pausedTime!)

    // Mode should still be Focus
    await expect(page.getByTestId('timer-mode')).toHaveText('Focus')
  })

  test('should persist mode (focus/rest) across reload', async ({ page }) => {
    // Skip to rest mode
    await page.getByTestId('timer-skip').click()

    // Verify rest mode
    await expect(page.getByTestId('timer-mode')).toHaveText('Rest')
    await expect(page.getByTestId('timer-display')).toHaveText('05:00')

    // Start rest timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(1500)

    // Reload page
    await page.reload()
    await waitForTimerReady(page)

    // Should still be in rest mode and running
    await expect(page.getByTestId('timer-mode')).toHaveText('Rest')
    await expect(page.getByTestId('timer-pause')).toBeVisible()
  })

  test('should clear timer state when reset', async ({ page }) => {
    // Start timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(2000)

    // Pause and reset
    await page.getByTestId('timer-pause').click()
    await page.getByTestId('timer-reset').click()

    // Verify reset state
    await expect(page.getByTestId('timer-display')).toHaveText('25:00')
    await expect(page.getByTestId('timer-start')).toBeVisible()

    // Timer state should be cleared from localStorage (or set to idle)
    // Note: The implementation may save idle state, so check if state is idle rather than null
    const timerState = await getStorageItem(page, STORAGE_KEYS.timer)
    if (timerState !== null) {
      const parsed = JSON.parse(timerState)
      expect(parsed.state).toBe('idle')
      expect(parsed.timeRemaining).toBe(25 * 60)
    }

    // Reload page
    await page.reload()
    await waitForAppReady(page)

    // Should start fresh
    await expect(page.getByTestId('timer-display')).toHaveText('25:00')
    await expect(page.getByTestId('timer-start')).toBeVisible()
    await expect(page.getByTestId('timer-mode')).toHaveText('Focus')
  })

  test('should store timer state in localStorage while running', async ({ page }) => {
    // Start timer
    await page.getByTestId('timer-start').click()
    await page.waitForTimeout(1500)

    // Check localStorage has timer state
    const timerState = await getStorageItem(page, STORAGE_KEYS.timer)
    expect(timerState).not.toBeNull()

    const parsed = JSON.parse(timerState!)
    expect(parsed.mode).toBe('focus')
    expect(parsed.state).toBe('running')
    expect(parsed.timeRemaining).toBeLessThan(25 * 60)
    expect(parsed.lastUpdateTimestamp).toBeDefined()
  })
})

