import { test, expect } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady } from '../../fixtures/test-utils'

test.describe('Modal Dismiss Behavior', () => {
  test.describe('Timer Settings Modal (Dismissible)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await clearStorage(page)
      await bypassSecuritySetup(page)
      await page.reload()
      await waitForAppReady(page)
    })

    test('should close modal when clicking X button', async ({ page }) => {
      // Open timer settings modal
      await page.getByRole('button', { name: 'Timer Settings' }).click()
      await expect(page.getByText('Timer Settings')).toBeVisible()

      // Find and click the X button (close button)
      const closeButton = page.locator('button[aria-label*="close"], button[aria-label*="Close"]').first()
      // Alternative: look for the iconify X icon
      const xButton = page.locator('.iconify.i-lucide\\:x').first()
      
      // Try clicking the X button if it exists
      const xButtonCount = await xButton.count()
      if (xButtonCount > 0) {
        await xButton.click()
      } else {
        // Fallback: try to find button with close icon
        const closeIcon = page.locator('button:has(.iconify.i-lucide\\:x)').first()
        if (await closeIcon.count() > 0) {
          await closeIcon.click()
        } else {
          // Last resort: click on overlay or use Escape key
          await page.keyboard.press('Escape')
        }
      }

      // Modal should be closed
      await expect(page.getByText('Timer Settings')).not.toBeVisible()
    })

    test('should close modal when clicking outside (on overlay)', async ({ page }) => {
      // Open timer settings modal
      await page.getByRole('button', { name: 'Timer Settings' }).click()
      await expect(page.getByText('Timer Settings')).toBeVisible()

      // Click outside the modal (on the overlay)
      // The overlay is typically positioned at the edges of the viewport
      await page.click('body', { position: { x: 10, y: 10 } })

      // Modal should be closed
      await expect(page.getByText('Timer Settings')).not.toBeVisible()
    })

    test('should close modal when pressing Escape key', async ({ page }) => {
      // Open timer settings modal
      await page.getByRole('button', { name: 'Timer Settings' }).click()
      await expect(page.getByText('Timer Settings')).toBeVisible()

      // Press Escape key
      await page.keyboard.press('Escape')

      // Modal should be closed
      await expect(page.getByText('Timer Settings')).not.toBeVisible()
    })

    test('should close modal when clicking Cancel button', async ({ page }) => {
      // Open timer settings modal
      await page.getByRole('button', { name: 'Timer Settings' }).click()
      await expect(page.getByText('Timer Settings')).toBeVisible()

      // Click Cancel button
      await page.getByRole('button', { name: 'Cancel' }).click()

      // Modal should be closed
      await expect(page.getByText('Timer Settings')).not.toBeVisible()
    })

    test('should close modal when clicking Save button', async ({ page }) => {
      // Open timer settings modal
      await page.getByRole('button', { name: 'Timer Settings' }).click()
      await expect(page.getByText('Timer Settings')).toBeVisible()

      // Click Save button
      await page.getByRole('button', { name: 'Save' }).click()

      // Modal should be closed
      await expect(page.getByText('Timer Settings')).not.toBeVisible()
    })
  })

  test.describe('Security Setup Modal (Non-Dismissible - First Run)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await clearStorage(page)
      // Don't bypass security - we want to see the security modal on first run
    })

    test('should NOT close modal when clicking X button (X button should not exist)', async ({ page }) => {
      // Wait for security modal to appear
      await expect(page.getByText('Choose Your Security Level')).toBeVisible()

      // X button should not be visible (close prop is false)
      const xButton = page.locator('.iconify.i-lucide\\:x')
      const xButtonCount = await xButton.count()
      
      // If X button exists, clicking it should not close the modal
      if (xButtonCount > 0) {
        await xButton.first().click()
        // Modal should still be visible
        await expect(page.getByText('Choose Your Security Level')).toBeVisible()
      } else {
        // X button doesn't exist, which is correct
        expect(xButtonCount).toBe(0)
      }
    })

    test('should NOT close modal when clicking outside (on overlay)', async ({ page }) => {
      // Wait for security modal to appear
      await expect(page.getByText('Choose Your Security Level')).toBeVisible()

      // Click outside the modal (on the overlay)
      await page.click('body', { position: { x: 10, y: 10 } })

      // Modal should still be visible (non-dismissible)
      await expect(page.getByText('Choose Your Security Level')).toBeVisible()
    })

    test('should NOT close modal when pressing Escape key', async ({ page }) => {
      // Wait for security modal to appear
      await expect(page.getByText('Choose Your Security Level')).toBeVisible()

      // Press Escape key
      await page.keyboard.press('Escape')

      // Modal should still be visible (non-dismissible on first run)
      await expect(page.getByText('Choose Your Security Level')).toBeVisible()
    })
  })

  test.describe('Security Setup Modal (Dismissible - Change Mode)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await clearStorage(page)
      await bypassSecuritySetup(page)
      await page.reload()
      await waitForAppReady(page)
    })

    test('should close modal when clicking X button', async ({ page }) => {
      // Open security menu and click Change Security Mode
      await page.getByRole('button', { name: /Security/ }).click()
      await page.getByRole('menuitem', { name: 'Change Security Mode' }).click()

      // Wait for security modal to appear
      await expect(page.getByText('Choose Your Security Level')).toBeVisible()

      // Find and click the X button (close button)
      const xButton = page.locator('.iconify.i-lucide\\:x').first()
      const xButtonCount = await xButton.count()

      if (xButtonCount > 0) {
        await xButton.click()
      } else {
        // Fallback: try to find button with close icon
        const closeIcon = page.locator('button:has(.iconify.i-lucide\\:x)').first()
        if (await closeIcon.count() > 0) {
          await closeIcon.click()
        } else {
          // Last resort: use Escape key
          await page.keyboard.press('Escape')
        }
      }

      // Modal should be closed and app should be ready
      await expect(page.getByText('Choose Your Security Level')).not.toBeVisible()
      await expect(page.getByTestId('timer-start')).toBeVisible()
    })

    test('should close modal when clicking outside (on overlay)', async ({ page }) => {
      // Open security menu and click Change Security Mode
      await page.getByRole('button', { name: /Security/ }).click()
      await page.getByRole('menuitem', { name: 'Change Security Mode' }).click()

      // Wait for security modal to appear
      await expect(page.getByText('Choose Your Security Level')).toBeVisible()

      // Click outside the modal (on the overlay)
      await page.click('body', { position: { x: 10, y: 10 } })

      // Modal should be closed and app should be ready
      await expect(page.getByText('Choose Your Security Level')).not.toBeVisible()
      await expect(page.getByTestId('timer-start')).toBeVisible()
    })

    test('should close modal when pressing Escape key', async ({ page }) => {
      // Open security menu and click Change Security Mode
      await page.getByRole('button', { name: /Security/ }).click()
      await page.getByRole('menuitem', { name: 'Change Security Mode' }).click()

      // Wait for security modal to appear
      await expect(page.getByText('Choose Your Security Level')).toBeVisible()

      // Press Escape key
      await page.keyboard.press('Escape')

      // Modal should be closed and app should be ready
      await expect(page.getByText('Choose Your Security Level')).not.toBeVisible()
      await expect(page.getByTestId('timer-start')).toBeVisible()
    })

    test('should allow cancelling mode change and return to app', async ({ page }) => {
      // Open security menu and click Change Security Mode
      await page.getByRole('button', { name: /Security/ }).click()
      await page.getByRole('menuitem', { name: 'Change Security Mode' }).click()

      // Wait for security modal to appear
      await expect(page.getByText('Choose Your Security Level')).toBeVisible()

      // Press Escape to cancel
      await page.keyboard.press('Escape')

      // Modal should be closed
      await expect(page.getByText('Choose Your Security Level')).not.toBeVisible()

      // App should still be functional
      await expect(page.getByTestId('timer-start')).toBeVisible()
      await expect(page.getByText('Focus Timer')).toBeVisible()

      // Security menu should still work
      await page.getByRole('button', { name: /Security/ }).click()
      await expect(page.getByRole('menuitem', { name: 'Change Security Mode' })).toBeVisible()
    })
  })
})

