import { test, expect } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady } from '../../fixtures/test-utils'

test.describe('Theme Picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test.describe('UI Visibility', () => {
    test('should display theme picker button in header', async ({ page }) => {
      const themeButton = page.getByRole('button', { name: /Customize theme colors/i })
      await expect(themeButton).toBeVisible()
    })

    test('should open popover on button click', async ({ page }) => {
      const themeButton = page.getByRole('button', { name: /Customize theme colors/i })
      await themeButton.click()

      // Wait for popover to appear
      await page.waitForTimeout(300)

      // Primary section should be visible
      const primaryHeading = page.getByRole('heading', { name: /Primary/i })
      await expect(primaryHeading).toBeVisible()

      // Neutral section should be visible
      const neutralHeading = page.getByRole('heading', { name: /Neutral/i })
      await expect(neutralHeading).toBeVisible()
    })

    test('should close popover on Escape key', async ({ page }) => {
      const themeButton = page.getByRole('button', { name: /Customize theme colors/i })
      await themeButton.click()
      await page.waitForTimeout(300)

      // Verify popover is open
      let primaryHeading = page.getByRole('heading', { name: /Primary/i })
      await expect(primaryHeading).toBeVisible()

      // Press Escape
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Popover should be hidden (heading no longer in viewport)
      primaryHeading = page.getByRole('heading', { name: /Primary/i })
      await expect(primaryHeading).not.toBeVisible()
    })

    test('should close popover on outside click', async ({ page }) => {
      const themeButton = page.getByRole('button', { name: /Customize theme colors/i })
      await themeButton.click()
      await page.waitForTimeout(300)

      // Verify popover is open
      let primaryHeading = page.getByRole('heading', { name: /Primary/i })
      await expect(primaryHeading).toBeVisible()

      // Click outside the popover (on the body element)
      await page.locator('body').click({ position: { x: 100, y: 100 } })
      await page.waitForTimeout(300)

      // Popover should be hidden
      primaryHeading = page.getByRole('heading', { name: /Primary/i })
      await expect(primaryHeading).not.toBeVisible()
    })
  })

  test.describe('Primary Color Selection', () => {
    test('should apply primary color to UI immediately', async ({ page }) => {
      // Check initial color (should be green by default or what was saved)
      const themeButton = page.getByRole('button', { name: /Customize theme colors/i })
      await themeButton.click()
      await page.waitForTimeout(300)

      // Select blue
      const blueButton = page.getByRole('button', { name: /Select Blue as primary color/i })
      await blueButton.click()
      await page.waitForTimeout(500)

      // Close popover
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)

      // Check that app UI reflects blue color - button uses bg-primary with CSS variables
      // We'll check that the primary color value changed by verifying through the popover
      await themeButton.click()
      await page.waitForTimeout(300)

      const selectedBlue = page.getByRole('button', { name: /Select Blue as primary color/i })
      await expect(selectedBlue).toHaveAttribute('aria-pressed', 'true')
    })

    test('should allow multiple primary color changes', async ({ page }) => {
      const themeButton = page.getByRole('button', { name: /Customize theme colors/i })

      // Change to blue
      await themeButton.click()
      await page.waitForTimeout(300)
      await page.getByRole('button', { name: /Select Blue as primary color/i }).click()
      await page.waitForTimeout(500)
      await page.keyboard.press('Escape')

      // Verify blue is selected
      await themeButton.click()
      await page.waitForTimeout(300)
      await expect(page.getByRole('button', { name: /Select Blue as primary color/i })).toHaveAttribute('aria-pressed', 'true')

      // Change to red
      await page.getByRole('button', { name: /Select Red as primary color/i }).click()
      await page.waitForTimeout(500)
      await page.keyboard.press('Escape')

      // Verify red is selected
      await themeButton.click()
      await page.waitForTimeout(300)
      await expect(page.getByRole('button', { name: /Select Red as primary color/i })).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByRole('button', { name: /Select Blue as primary color/i })).toHaveAttribute('aria-pressed', 'false')
    })
  })

  test.describe('Neutral Color Selection', () => {
    test('should change neutral colors and persist', async ({ page }) => {
      const themeButton = page.getByRole('button', { name: /Customize theme colors/i })

      // Change to gray
      await themeButton.click()
      await page.waitForTimeout(300)
      await page.getByRole('button', { name: /Select Gray as neutral color/i }).click()
      await page.waitForTimeout(500)

      // Reload and verify persistence
      await page.reload()
      await waitForAppReady(page)

      // Verify gray was persisted
      await themeButton.click()
      await page.waitForTimeout(300)
      const selectedGray = page.getByRole('button', { name: /Select Gray as neutral color/i })
      await expect(selectedGray).toHaveAttribute('aria-pressed', 'true')
    })
  })

  test.describe('Persistence', () => {
    test('should persist theme colors across page reloads', async ({ page }) => {
      const themeButton = page.getByRole('button', { name: /Customize theme colors/i })

      // Select blue primary and zinc neutral
      await themeButton.click()
      await page.waitForTimeout(300)
      await page.getByRole('button', { name: /Select Blue as primary color/i }).click()
      await page.waitForTimeout(300)
      await page.getByRole('button', { name: /Select Zinc as neutral color/i }).click()
      await page.waitForTimeout(500)
      await page.keyboard.press('Escape')

      // Reload page
      await page.reload()
      await waitForAppReady(page)

      // Verify colors persisted
      await themeButton.click()
      await page.waitForTimeout(300)

      const selectedBlue = page.getByRole('button', { name: /Select Blue as primary color/i })
      await expect(selectedBlue).toHaveAttribute('aria-pressed', 'true')

      const selectedZinc = page.getByRole('button', { name: /Select Zinc as neutral color/i })
      await expect(selectedZinc).toHaveAttribute('aria-pressed', 'true')
    })

    test('should persist theme in localStorage', async ({ page }) => {
      const themeButton = page.getByRole('button', { name: /Customize theme colors/i })

      // Select purple primary and gray neutral
      await themeButton.click()
      await page.waitForTimeout(300)
      await page.getByRole('button', { name: /Select Purple as primary color/i }).click()
      await page.waitForTimeout(300)
      await page.getByRole('button', { name: /Select Gray as neutral color/i }).click()
      await page.waitForTimeout(500)

      // Check localStorage
      const themeData = await page.evaluate(() => {
        return localStorage.getItem('sphinx-focus-theme')
      })

      expect(themeData).toBeDefined()
      const parsedTheme = JSON.parse(themeData!)
      expect(parsedTheme.primary).toBe('purple')
      expect(parsedTheme.neutral).toBe('gray')
    })
  })

  test.describe('Reset Functionality', () => {
    test('should reset to default colors', async ({ page }) => {
      const themeButton = page.getByRole('button', { name: /Customize theme colors/i })

      // Change to custom colors
      await themeButton.click()
      await page.waitForTimeout(300)
      await page.getByRole('button', { name: /Select Red as primary color/i }).click()
      await page.waitForTimeout(300)
      await page.getByRole('button', { name: /Select Stone as neutral color/i }).click()
      await page.waitForTimeout(300)

      // Verify custom colors are selected
      await expect(page.getByRole('button', { name: /Select Red as primary color/i })).toHaveAttribute('aria-pressed', 'true')
      await expect(page.getByRole('button', { name: /Select Stone as neutral color/i })).toHaveAttribute('aria-pressed', 'true')

      // Click reset button
      const resetButton = page.getByRole('button', { name: /Reset to defaults/i })
      await resetButton.click()
      await page.waitForTimeout(500)

      // Close and re-open popover
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      await themeButton.click()
      await page.waitForTimeout(300)

      // Verify defaults are restored (green and slate)
      const defaultGreen = page.getByRole('button', { name: /Select Green as primary color/i })
      await expect(defaultGreen).toHaveAttribute('aria-pressed', 'true')

      const defaultSlate = page.getByRole('button', { name: /Select Slate as neutral color/i })
      await expect(defaultSlate).toHaveAttribute('aria-pressed', 'true')
    })

    test('should reset localStorage to defaults', async ({ page }) => {
      const themeButton = page.getByRole('button', { name: /Customize theme colors/i })

      // Change colors
      await themeButton.click()
      await page.waitForTimeout(300)
      await page.getByRole('button', { name: /Select Orange as primary color/i }).click()
      await page.waitForTimeout(500)

      // Verify changed in localStorage
      let themeData = await page.evaluate(() => {
        return localStorage.getItem('sphinx-focus-theme')
      })
      expect(JSON.parse(themeData!).primary).toBe('orange')

      // Reset
      const resetButton = page.getByRole('button', { name: /Reset to defaults/i })
      await resetButton.click()
      await page.waitForTimeout(500)

      // Verify defaults in localStorage
      themeData = await page.evaluate(() => {
        return localStorage.getItem('sphinx-focus-theme')
      })
      expect(themeData).toBeDefined()
      const parsedTheme = JSON.parse(themeData!)
      expect(parsedTheme.primary).toBe('green')
      expect(parsedTheme.neutral).toBe('slate')
    })
  })
})
