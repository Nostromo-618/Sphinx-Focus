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
    await expect(page.getByText('Focus. Privacy. Security. Rest.')).toBeVisible()
  })

  test('should display all four tabs', async ({ page }) => {
    await page.getByRole('button', { name: /Sphinx Focus/i }).click()

    // All tabs should be visible
    await expect(page.getByRole('tab', { name: /Focus/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Privacy/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Security/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Tips/i })).toBeVisible()
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
})
