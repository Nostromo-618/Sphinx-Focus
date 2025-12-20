import { test, expect } from '@playwright/test'
import { clearStorage, STORAGE_KEYS, getStorageItem, waitForAppReady } from '../../fixtures/test-utils'

test.describe('Disclaimer Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await page.reload()
    // Wait for the disclaimer modal to appear after fresh load
    await page.waitForSelector('text=Disclaimer & Terms of Use', { timeout: 10000 })
  })

  test('should display disclaimer modal on first visit', async ({ page }) => {
    // Disclaimer modal should be visible
    await expect(page.getByText('Disclaimer & Terms of Use')).toBeVisible()
    await expect(page.getByText('Please read and accept the disclaimer to continue')).toBeVisible()

    // Both buttons should be visible
    await expect(page.getByRole('button', { name: 'I Disagree' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'I Agree' })).toBeVisible()

    // Modal should not be dismissible (no close button)
    const closeButton = page.locator('[aria-label*="close" i], [aria-label*="Close" i]')
    await expect(closeButton).toHaveCount(0)

    // App content should not be visible
    await expect(page.getByTestId('timer-start')).not.toBeVisible()
  })

  test('should show goodbye state when user disagrees', async ({ page }) => {
    // Click I Disagree
    await page.getByRole('button', { name: 'I Disagree' }).click()

    // Should show goodbye state
    await expect(page.getByText('Thank You for Your Interest')).toBeVisible()
    await expect(page.getByText(/We understand that you prefer not to proceed/)).toBeVisible()

    // Reconsider button should be visible
    await expect(page.getByRole('button', { name: 'Reconsider' })).toBeVisible()

    // App content should still not be visible
    await expect(page.getByTestId('timer-start')).not.toBeVisible()
  })

  test('should return to disclaimer when clicking Reconsider', async ({ page }) => {
    // Disagree first
    await page.getByRole('button', { name: 'I Disagree' }).click()
    await expect(page.getByText('Thank You for Your Interest')).toBeVisible()

    // Click Reconsider
    await page.getByRole('button', { name: 'Reconsider' }).click()

    // Should be back to disclaimer modal
    await expect(page.getByText('Disclaimer & Terms of Use')).toBeVisible()
    await expect(page.getByRole('button', { name: 'I Agree' })).toBeVisible()
  })

  test('should proceed to security setup when user agrees', async ({ page }) => {
    // Click I Agree
    await page.getByRole('button', { name: 'I Agree' }).click()

    // Should proceed to security setup modal
    await expect(page.getByText('Choose Your Security Level')).toBeVisible({ timeout: 5000 })

    // Disclaimer should be saved to localStorage
    const disclaimerAccepted = await getStorageItem(page, STORAGE_KEYS.disclaimer)
    expect(disclaimerAccepted).toBe('true')
  })

  test('should persist disclaimer acceptance across reloads', async ({ page }) => {
    // Accept disclaimer
    await page.getByRole('button', { name: 'I Agree' }).click()
    await expect(page.getByText('Choose Your Security Level')).toBeVisible({ timeout: 5000 })

    // Complete security setup with auto mode
    await page.getByTestId('security-auto-option').click()
    await waitForAppReady(page)

    // Reload page
    await page.reload()
    await waitForAppReady(page)

    // Disclaimer should not appear again
    await expect(page.getByText('Disclaimer & Terms of Use')).not.toBeVisible()
    await expect(page.getByTestId('timer-start')).toBeVisible()
  })

  test('should not show disclaimer on subsequent visits', async ({ page }) => {
    // Accept disclaimer and complete setup
    await page.getByRole('button', { name: 'I Agree' }).click()
    await page.getByTestId('security-auto-option').click()
    await waitForAppReady(page)

    // Navigate away and come back
    await page.goto('/')
    await page.reload()

    // Disclaimer should not appear
    await expect(page.getByText('Disclaimer & Terms of Use')).not.toBeVisible()
    await expect(page.getByTestId('timer-start')).toBeVisible()
  })

  test('should display disclaimer content with scrollable text', async ({ page }) => {
    // Check that disclaimer content is visible
    await expect(page.getByText('Important Notice')).toBeVisible()
    await expect(page.getByText('No Warranties')).toBeVisible()
    await expect(page.getByText('No Liability')).toBeVisible()
    await expect(page.getByText('User Responsibility')).toBeVisible()
    await expect(page.getByText('Experimental Nature')).toBeVisible()
    await expect(page.getByText('Data Storage')).toBeVisible()
    await expect(page.getByText('No Professional Advice')).toBeVisible()
    await expect(page.getByText('Acceptance')).toBeVisible()

    // Check for link to full disclaimer
    const disclaimerLink = page.getByRole('link', { name: /View full disclaimer on GitHub/i })
    await expect(disclaimerLink).toBeVisible()
    await expect(disclaimerLink).toHaveAttribute('href', 'https://github.com/Nostromo-618/Sphinx-Focus/blob/main/DISCLAIMER.md')
    await expect(disclaimerLink).toHaveAttribute('target', '_blank')
  })

  test('should block app access until disclaimer is accepted', async ({ page }) => {
    // Verify app content is blocked
    await expect(page.getByTestId('timer-start')).not.toBeVisible()
    await expect(page.getByTestId('task-input')).not.toBeVisible()

    // Try to interact with app (should not be possible)
    const timerStart = page.getByTestId('timer-start')
    await expect(timerStart).not.toBeVisible()

    // Accept disclaimer
    await page.getByRole('button', { name: 'I Agree' }).click()
    await page.getByTestId('security-auto-option').click()
    await waitForAppReady(page)

    // Now app should be accessible
    await expect(page.getByTestId('timer-start')).toBeVisible()
  })

  test('should not allow dismissing modal with Escape key', async ({ page }) => {
    // Modal should be visible
    await expect(page.getByText('Disclaimer & Terms of Use')).toBeVisible()

    // Try to dismiss with Escape
    await page.keyboard.press('Escape')

    // Modal should still be visible (non-dismissible)
    await expect(page.getByText('Disclaimer & Terms of Use')).toBeVisible()
  })

  test('should not allow dismissing modal by clicking outside', async ({ page }) => {
    // Modal should be visible
    await expect(page.getByText('Disclaimer & Terms of Use')).toBeVisible()

    // Try to click outside (on body)
    await page.click('body', { position: { x: 10, y: 10 } })

    // Modal should still be visible (non-dismissible)
    await expect(page.getByText('Disclaimer & Terms of Use')).toBeVisible()
  })
})

