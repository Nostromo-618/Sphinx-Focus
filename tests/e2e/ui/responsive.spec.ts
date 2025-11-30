import { test, expect } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady } from '../../fixtures/test-utils'

// Viewport sizes
const DESKTOP_VIEWPORT = { width: 1280, height: 720 }
const TABLET_VIEWPORT = { width: 768, height: 1024 }
const MOBILE_VIEWPORT = { width: 375, height: 667 }

test.describe('Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should display two-column layout on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize(DESKTOP_VIEWPORT)

    // Wait for layout to stabilize
    await page.waitForTimeout(300)

    // Get the grid container
    const gridContainer = page.locator('.grid')

    // Both cards should be visible
    const timerCard = page.locator('text=Focus Timer').first()
    const taskCard = page.locator('text=Task List').first()

    await expect(timerCard).toBeVisible()
    await expect(taskCard).toBeVisible()

    // Get bounding boxes to verify side-by-side layout
    const timerBox = await timerCard.boundingBox()
    const taskBox = await taskCard.boundingBox()

    if (timerBox && taskBox) {
      // On desktop, cards should be side by side (different X positions, similar Y)
      expect(timerBox.x).not.toBe(taskBox.x)
      // Y positions should be similar (within tolerance for header differences)
      expect(Math.abs(timerBox.y - taskBox.y)).toBeLessThan(100)
    }
  })

  test('should stack cards vertically on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize(MOBILE_VIEWPORT)

    // Wait for layout to stabilize
    await page.waitForTimeout(300)

    // Both cards should be visible
    const timerCard = page.locator('text=Focus Timer').first()
    const taskCard = page.locator('text=Task List').first()

    await expect(timerCard).toBeVisible()
    await expect(taskCard).toBeVisible()

    // Get bounding boxes
    const timerBox = await timerCard.boundingBox()
    const taskBox = await taskCard.boundingBox()

    if (timerBox && taskBox) {
      // On mobile, cards should be stacked (similar X, different Y)
      // Timer card should be above task card
      expect(timerBox.y).toBeLessThan(taskBox.y)
    }
  })

  test('should adjust timer size for mobile viewport', async ({ page }) => {
    // First check desktop size
    await page.setViewportSize(DESKTOP_VIEWPORT)
    await page.waitForTimeout(300)

    const timerDisplay = page.getByTestId('timer-display')
    await expect(timerDisplay).toBeVisible()

    // Timer should be readable on desktop
    const desktopBox = await timerDisplay.boundingBox()
    expect(desktopBox).not.toBeNull()

    // Switch to mobile
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.waitForTimeout(300)

    // Timer should still be visible and readable on mobile
    await expect(timerDisplay).toBeVisible()
    const mobileBox = await timerDisplay.boundingBox()
    expect(mobileBox).not.toBeNull()

    // Timer should fit within mobile viewport
    if (mobileBox) {
      expect(mobileBox.x).toBeGreaterThanOrEqual(0)
      expect(mobileBox.x + mobileBox.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width)
    }
  })

  test('should maintain functionality on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.waitForTimeout(300)

    // Test timer functionality
    await expect(page.getByTestId('timer-start')).toBeVisible()
    await page.getByTestId('timer-start').click()
    await expect(page.getByTestId('timer-pause')).toBeVisible()

    // Pause timer
    await page.getByTestId('timer-pause').click()
    await expect(page.getByTestId('timer-resume')).toBeVisible()

    // Test task functionality
    await page.getByTestId('task-input').fill('Mobile task')
    await page.getByTestId('task-add').click()

    // Task should be added - use specific locator to avoid matching timer title
    const taskText = page.locator('[data-testid^="task-text-"]').filter({ hasText: 'Mobile task' })
    await expect(taskText).toBeVisible()

    // Delete task
    const taskItem = page.locator('[data-testid^="task-item-"]').first()
    const deleteButton = taskItem.locator('[data-testid^="task-delete-"]')
    await deleteButton.click()

    // Task should be removed
    await expect(taskText).not.toBeVisible()
  })

  test('should handle tablet viewport correctly', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize(TABLET_VIEWPORT)
    await page.waitForTimeout(300)

    // Both sections should be visible
    await expect(page.getByText('Focus Timer')).toBeVisible()
    await expect(page.getByText('Task List')).toBeVisible()

    // All controls should be accessible
    await expect(page.getByTestId('timer-start')).toBeVisible()
    await expect(page.getByTestId('task-input')).toBeVisible()
    await expect(page.getByTestId('task-add')).toBeVisible()
  })

  test('should handle orientation changes', async ({ page }) => {
    // Start in portrait mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.waitForTimeout(300)

    // Verify portrait layout
    await expect(page.getByTestId('timer-start')).toBeVisible()
    await expect(page.getByTestId('task-input')).toBeVisible()

    // Switch to landscape mobile
    await page.setViewportSize({ width: 667, height: 375 })
    await page.waitForTimeout(300)

    // Verify landscape layout - all elements should still be accessible
    await expect(page.getByTestId('timer-start')).toBeVisible()
    await expect(page.getByTestId('task-input')).toBeVisible()

    // Timer should still work in landscape
    await page.getByTestId('timer-start').click()
    await expect(page.getByTestId('timer-pause')).toBeVisible()
  })

  test('should show proper spacing on all viewports', async ({ page }) => {
    const viewports = [DESKTOP_VIEWPORT, TABLET_VIEWPORT, MOBILE_VIEWPORT]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.waitForTimeout(300)

      // Container should have proper padding
      const container = page.locator('.container')
      await expect(container).toBeVisible()

      // Cards should be visible and not overflow
      const timerCard = page.locator('[data-testid="timer-start"]').locator('..')
      const timerBox = await page.getByTestId('timer-start').boundingBox()

      if (timerBox) {
        // Element should be within viewport bounds
        expect(timerBox.x).toBeGreaterThanOrEqual(0)
        expect(timerBox.y).toBeGreaterThanOrEqual(0)
        expect(timerBox.x + timerBox.width).toBeLessThanOrEqual(viewport.width)
      }
    }
  })

  test('should display header elements correctly on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.waitForTimeout(300)

    // Logo should be visible in header
    const logo = page.locator('text=Sphinx Focus').first()
    await expect(logo).toBeVisible()

    // On mobile, the UHeader uses a drawer for navigation
    // The drawer toggle should be visible (hamburger menu)
    // Note: UHeader with mode="drawer" shows a toggle on small screens

    // Check that the header is rendered correctly
    const header = page.locator('header')
    await expect(header).toBeVisible()

    // The main content should still be accessible
    await expect(page.getByTestId('timer-start')).toBeVisible()
    await expect(page.getByTestId('task-input')).toBeVisible()
  })

  test('should handle very small viewports gracefully', async ({ page }) => {
    // Set very small viewport (old iPhone SE size)
    await page.setViewportSize({ width: 320, height: 568 })
    await page.waitForTimeout(300)

    // App should still be functional
    await expect(page.getByTestId('timer-start')).toBeVisible()
    await expect(page.getByTestId('timer-display')).toBeVisible()

    // Should be able to scroll to see all content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(200)

    // Task input should be accessible (may need scroll)
    await expect(page.getByTestId('task-input')).toBeVisible()
  })
})
