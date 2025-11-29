import { test, expect } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady } from '../../fixtures/test-utils'

test.describe('Color Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should display color mode button in header', async ({ page }) => {
    // Color mode button should be visible in the header
    const colorModeButton = page.getByRole('button', { name: /Current mode.*Click to change theme/i })
    await expect(colorModeButton).toBeVisible()
  })

  test('should show dropdown with light/dark/system options', async ({ page }) => {
    // Click color mode button
    const colorModeButton = page.getByRole('button', { name: /Current mode.*Click to change theme/i })
    await colorModeButton.click()

    // Dropdown should show all three options
    await expect(page.getByRole('menuitemcheckbox', { name: 'Light' })).toBeVisible()
    await expect(page.getByRole('menuitemcheckbox', { name: 'Dark' })).toBeVisible()
    await expect(page.getByRole('menuitemcheckbox', { name: 'System' })).toBeVisible()
  })

  test('should switch to dark mode', async ({ page }) => {
    // Click color mode button
    const colorModeButton = page.getByRole('button', { name: /Current mode.*Click to change theme/i })
    await colorModeButton.click()

    // Select dark mode
    await page.getByRole('menuitemcheckbox', { name: 'Dark' }).click()

    // Wait for theme to apply
    await page.waitForTimeout(500)

    // Check that dark mode is applied (html element should have dark class)
    const htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')
  })

  test('should switch to light mode from dark mode', async ({ page }) => {
    // First switch to dark mode
    await page.getByRole('button', { name: /Current mode.*Click to change theme/i }).click()
    await page.getByRole('menuitemcheckbox', { name: 'Dark' }).click()
    await page.waitForTimeout(500)

    // Verify dark mode is active
    let htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')

    // Press Escape to close dropdown if still open
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // Re-open dropdown and switch to light mode
    await page.getByRole('button', { name: /Current mode.*Click to change theme/i }).click()
    await page.waitForTimeout(200)
    await page.getByRole('menuitemcheckbox', { name: 'Light' }).click()
    await page.waitForTimeout(500)

    // Check that light mode is applied
    htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).not.toContain('dark')
  })

  test('should respect system preference', async ({ page }) => {
    // Set system preference to dark
    await page.emulateMedia({ colorScheme: 'dark' })

    // Click color mode button
    await page.getByRole('button', { name: /Current mode.*Click to change theme/i }).click()

    // Select system mode
    await page.getByRole('menuitemcheckbox', { name: 'System' }).click()
    await page.waitForTimeout(500)

    // Should follow system preference (dark)
    const htmlClassDark = await page.locator('html').getAttribute('class')
    expect(htmlClassDark).toContain('dark')

    // Change system preference to light
    await page.emulateMedia({ colorScheme: 'light' })
    await page.waitForTimeout(500)

    // Should follow system preference (light)
    const htmlClassLight = await page.locator('html').getAttribute('class')
    expect(htmlClassLight).not.toContain('dark')
  })

  test('should persist color mode preference across reloads', async ({ page }) => {
    // Click color mode button and select dark mode
    await page.getByRole('button', { name: /Current mode.*Click to change theme/i }).click()
    await page.getByRole('menuitemcheckbox', { name: 'Dark' }).click()
    await page.waitForTimeout(500)

    // Verify dark mode is active
    let htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')

    // Reload page
    await page.reload()
    await waitForAppReady(page)

    // Dark mode should persist
    htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')
  })

  test('should mark selected mode as checked in dropdown', async ({ page }) => {
    // Click color mode button
    await page.getByRole('button', { name: /Current mode.*Click to change theme/i }).click()

    // System option should be checked by default
    await expect(page.getByRole('menuitemcheckbox', { name: 'System' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('menuitemcheckbox', { name: 'Dark' })).toHaveAttribute('aria-checked', 'false')
    await expect(page.getByRole('menuitemcheckbox', { name: 'Light' })).toHaveAttribute('aria-checked', 'false')
  })

  test('should cycle through all modes', async ({ page }) => {
    // Start in system mode
    let htmlClass = await page.locator('html').getAttribute('class')
    const initialDark = htmlClass?.includes('dark')

    // Switch to dark mode
    await page.getByRole('button', { name: /Current mode.*Click to change theme/i }).click()
    await page.getByRole('menuitemcheckbox', { name: 'Dark' }).click()
    await page.waitForTimeout(500)

    htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).toContain('dark')

    // Press Escape and switch to light mode
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /Current mode.*Click to change theme/i }).click()
    await page.waitForTimeout(200)
    await page.getByRole('menuitemcheckbox', { name: 'Light' }).click()
    await page.waitForTimeout(500)

    htmlClass = await page.locator('html').getAttribute('class')
    expect(htmlClass).not.toContain('dark')

    // Press Escape and switch back to system mode
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /Current mode.*Click to change theme/i }).click()
    await page.waitForTimeout(200)
    await page.getByRole('menuitemcheckbox', { name: 'System' }).click()
    await page.waitForTimeout(500)

    // Should be back to system preference
    htmlClass = await page.locator('html').getAttribute('class')
    const finalDark = htmlClass?.includes('dark')
    expect(finalDark).toBe(initialDark)
  })
})
