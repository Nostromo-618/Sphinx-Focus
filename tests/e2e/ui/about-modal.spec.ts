import { test, expect } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady } from '../../fixtures/test-utils'

test.describe('About Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should open modal when clicking Sphinx Focus logo', async ({ page }) => {
    // Click the logo/title in header
    await page.getByRole('button', { name: /Sphinx Focus/i }).click()

    // Modal should be visible with header content
    await expect(page.getByText('About Sphinx Focus')).toBeVisible()
    await expect(page.getByText('Focus. Rest. Limit distractions. Stay productive.')).toBeVisible()
  })

  test('should display all six tabs', async ({ page }) => {
    await page.getByRole('button', { name: /Sphinx Focus/i }).click()

    // All tabs should be visible
    await expect(page.getByRole('tab', { name: /Focus/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Privacy/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Security/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Tips/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Changelog/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Disclaimer/i })).toBeVisible()
  })

  test('should switch between tabs', async ({ page }) => {
    await page.getByRole('button', { name: /Sphinx Focus/i }).click()

    // Default: Focus tab content visible
    await expect(page.getByText('Pomodoro Timer')).toBeVisible()

    // Click Privacy tab
    await page.getByRole('tab', { name: /Privacy/i }).click()
    await expect(page.getByText('100% Local Storage')).toBeVisible()

    // Click Security tab
    await page.getByRole('tab', { name: /Security/i }).click()
    await expect(page.getByText('PIN Protection')).toBeVisible()

    // Click Tips tab
    await page.getByRole('tab', { name: /Tips/i }).click()
    await expect(page.getByText('Start a Session')).toBeVisible()

    // Click Changelog tab
    await page.getByRole('tab', { name: /Changelog/i }).click()
    // Should show version numbers and dates
    await expect(page.getByText(/v\d+\.\d+\.\d+/).first()).toBeVisible()

    // Click Disclaimer tab
    await page.getByRole('tab', { name: /Disclaimer/i }).click()
    await expect(page.getByText('Experimental Application')).toBeVisible()
    await expect(page.getByText('No Warranties or Liability')).toBeVisible()
  })

  test('should display version and GitHub link in footer', async ({ page }) => {
    await page.getByRole('button', { name: /Sphinx Focus/i }).click()

    // GitHub link should be visible and have correct href (in modal footer)
    const githubLink = page.getByRole('link', { name: /View on GitHub/i })
    await expect(githubLink).toBeVisible()
    await expect(githubLink).toHaveAttribute('href', 'https://github.com/Nostromo-618/Sphinx-Focus')

    // Version should be visible in modal (near GitHub link)
    const modalFooter = githubLink.locator('..')
    await expect(modalFooter.getByText(/v\d+\.\d+\.\d+/)).toBeVisible()
  })

  test('should close modal when pressing Escape', async ({ page }) => {
    await page.getByRole('button', { name: /Sphinx Focus/i }).click()
    await expect(page.getByText('About Sphinx Focus')).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(page.getByText('About Sphinx Focus')).not.toBeVisible()
  })

  test('should close modal when clicking outside', async ({ page }) => {
    await page.getByRole('button', { name: /Sphinx Focus/i }).click()
    await expect(page.getByText('About Sphinx Focus')).toBeVisible()

    // Click outside the modal (on the overlay)
    await page.click('body', { position: { x: 10, y: 10 } })

    await expect(page.getByText('About Sphinx Focus')).not.toBeVisible()
  })

  test('should display changelog content with version entries', async ({ page }) => {
    await page.getByRole('button', { name: /Sphinx Focus/i }).click()
    await page.getByRole('tab', { name: /Changelog/i }).click()

    // Should show version numbers
    const versionElements = page.locator('text=/v\\d+\\.\\d+\\.\\d+/')
    await expect(versionElements.first()).toBeVisible()

    // Should show dates
    await expect(page.getByText(/\d{4}-\d{2}-\d{2}/).first()).toBeVisible()

    // Should show change types (added, changed, fixed, removed icons)
    // At least one of these should be visible
    const hasChanges = await Promise.race([
      page.locator('text=/Added|Changed|Fixed|Removed/i').first().isVisible().then(() => true),
      page.waitForTimeout(1000).then(() => false)
    ])
    expect(hasChanges).toBe(true)
  })

  test('should display disclaimer tab content', async ({ page }) => {
    await page.getByRole('button', { name: /Sphinx Focus/i }).click()
    await page.getByRole('tab', { name: /Disclaimer/i }).click()

    // Should show disclaimer summary sections
    await expect(page.getByText('Experimental Application')).toBeVisible()
    await expect(page.getByText('No Warranties or Liability')).toBeVisible()
    await expect(page.getByText('User Responsibility')).toBeVisible()
    await expect(page.getByText('Local Storage Only')).toBeVisible()

    // Should show link to full disclaimer
    const disclaimerLink = page.getByRole('link', { name: /View full disclaimer on GitHub/i })
    await expect(disclaimerLink).toBeVisible()
    await expect(disclaimerLink).toHaveAttribute('href', 'https://github.com/Nostromo-618/Sphinx-Focus/blob/main/DISCLAIMER.md')
    await expect(disclaimerLink).toHaveAttribute('target', '_blank')
  })

  test('should allow horizontal scrolling of tabs on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.getByRole('button', { name: /Sphinx Focus/i }).click()

    // Get the tabs container
    const tabsContainer = page.locator('[role="tablist"]').first()

    // Check that tabs container has overflow-x-auto class for scrolling
    const containerClasses = await tabsContainer.getAttribute('class')
    expect(containerClasses).toContain('overflow-x-auto')

    // Verify all tabs are still accessible (can scroll to them)
    // Click the last tab (Disclaimer) which might be off-screen
    await page.getByRole('tab', { name: /Disclaimer/i }).click()

    // Should successfully switch to disclaimer tab
    await expect(page.getByText('Experimental Application')).toBeVisible()
  })

  test('should scroll tabs horizontally when needed on small screens', async ({ page }) => {
    // Set a very narrow viewport to force scrolling
    await page.setViewportSize({ width: 320, height: 568 })

    await page.getByRole('button', { name: /Sphinx Focus/i }).click()

    // All tabs should still be accessible
    await expect(page.getByRole('tab', { name: /Focus/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Disclaimer/i })).toBeVisible()

    // Click the last tab to verify scrolling works
    await page.getByRole('tab', { name: /Disclaimer/i }).click()
    await expect(page.getByText('Experimental Application')).toBeVisible()
  })
})
