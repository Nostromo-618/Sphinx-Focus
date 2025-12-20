import { test, expect } from '@playwright/test'
import { clearStorage, STORAGE_KEYS, getStorageItem } from '../../fixtures/test-utils'

test.describe('PIN Unlock Flow', () => {
  // Setup: Create a PIN-protected account before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await page.reload()

    // Accept disclaimer first
    await page.getByRole('button', { name: 'I Agree' }).click()

    // Complete PIN setup first
    await page.getByTestId('security-pin-option').click()

    // Enter PIN: 1234
    for (let i = 0; i < 4; i++) {
      await page.getByTestId(`pin-input-${i}`).fill(String(i + 1))
    }

    // Confirm PIN: 1234
    for (let i = 0; i < 4; i++) {
      await page.getByTestId(`confirm-pin-input-${i}`).fill(String(i + 1))
    }

    await page.getByRole('button', { name: 'Secure My Tasks' }).click()
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Now reload to simulate returning user
    await page.reload()
  })

  test('should show PIN unlock modal for returning PIN users', async ({ page }) => {
    await expect(page.getByText('Welcome Back')).toBeVisible()
    await expect(page.getByText('Enter your PIN to unlock')).toBeVisible()

    // PIN inputs should be visible
    for (let i = 0; i < 4; i++) {
      await expect(page.getByTestId(`unlock-pin-input-${i}`)).toBeVisible()
    }
  })

  test('should unlock app with correct PIN', async ({ page }) => {
    // Enter correct PIN: 1234
    await page.getByTestId('unlock-pin-input-0').fill('1')
    await page.getByTestId('unlock-pin-input-1').fill('2')
    await page.getByTestId('unlock-pin-input-2').fill('3')
    await page.getByTestId('unlock-pin-input-3').fill('4')

    // Should auto-submit and unlock
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Focus Timer')).toBeVisible()
  })

  test('should show error with incorrect PIN', async ({ page }) => {
    // Enter wrong PIN: 9999
    await page.getByTestId('unlock-pin-input-0').fill('9')
    await page.getByTestId('unlock-pin-input-1').fill('9')
    await page.getByTestId('unlock-pin-input-2').fill('9')
    await page.getByTestId('unlock-pin-input-3').fill('9')

    // Error should be displayed
    await expect(page.getByText('Incorrect PIN. Please try again.')).toBeVisible()

    // Should still be on unlock modal
    await expect(page.getByText('Welcome Back')).toBeVisible()

    // PIN inputs should be cleared
    for (let i = 0; i < 4; i++) {
      await expect(page.getByTestId(`unlock-pin-input-${i}`)).toHaveValue('')
    }
  })

  test('should show forgot PIN option after multiple failed attempts', async ({ page }) => {
    // Enter wrong PIN 3 times
    for (let attempt = 0; attempt < 3; attempt++) {
      await page.getByTestId('unlock-pin-input-0').fill('9')
      await page.getByTestId('unlock-pin-input-1').fill('9')
      await page.getByTestId('unlock-pin-input-2').fill('9')
      await page.getByTestId('unlock-pin-input-3').fill('9')

      // Wait for error and inputs to clear
      await expect(page.getByText('Incorrect PIN')).toBeVisible()
      await page.waitForTimeout(100) // Brief wait for state update
    }

    // Should show hint about forgot PIN
    await expect(page.getByText('Too many attempts?')).toBeVisible()
  })

  test('should show reset confirmation when clicking Forgot PIN', async ({ page }) => {
    // Click forgot PIN link
    await page.getByTestId('forgot-pin-link').click()

    // Should show reset confirmation
    await expect(page.getByText('Reset All Data?')).toBeVisible()
    await expect(page.getByText('This will permanently delete all your tasks')).toBeVisible()

    // Cancel and Reset buttons should be visible
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reset Everything' })).toBeVisible()
  })

  test('should cancel reset and return to PIN entry', async ({ page }) => {
    // Click forgot PIN link
    await page.getByTestId('forgot-pin-link').click()

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Should be back to PIN entry
    await expect(page.getByText('Welcome Back')).toBeVisible()
    await expect(page.getByTestId('unlock-pin-input-0')).toBeVisible()
  })

  test('should reset all data when confirming forgot PIN', async ({ page }) => {
    // Click forgot PIN link
    await page.getByTestId('forgot-pin-link').click()

    // Click reset
    await page.getByRole('button', { name: 'Reset Everything' }).click()

    // Should show security setup modal again (first run state)
    await expect(page.getByText('Choose Your Security Level')).toBeVisible()

    // Security config should be cleared
    const config = await getStorageItem(page, STORAGE_KEYS.security)
    expect(config).toBeNull()
  })

  test('should auto-focus next input when entering PIN digits', async ({ page }) => {
    // Type in first input
    await page.getByTestId('unlock-pin-input-0').fill('1')

    // Second input should be focused - verify by typing
    await page.keyboard.type('2')
    await expect(page.getByTestId('unlock-pin-input-1')).toHaveValue('2')
  })

  test('should handle backspace to move to previous input', async ({ page }) => {
    // Enter first two digits
    await page.getByTestId('unlock-pin-input-0').fill('1')
    await page.getByTestId('unlock-pin-input-1').fill('2')

    // Press backspace on empty third input
    await page.getByTestId('unlock-pin-input-2').focus()
    await page.keyboard.press('Backspace')

    // Should focus second input
    await expect(page.getByTestId('unlock-pin-input-1')).toBeFocused()
  })

  test('should only accept numeric input', async ({ page }) => {
    // Try to enter non-numeric characters
    await page.getByTestId('unlock-pin-input-0').fill('a')
    await expect(page.getByTestId('unlock-pin-input-0')).toHaveValue('')

    await page.getByTestId('unlock-pin-input-0').fill('!')
    await expect(page.getByTestId('unlock-pin-input-0')).toHaveValue('')

    // Numeric should work
    await page.getByTestId('unlock-pin-input-0').fill('5')
    await expect(page.getByTestId('unlock-pin-input-0')).toHaveValue('5')
  })
})

test.describe('PIN Lock Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await page.reload()

    // Complete PIN setup
    await page.getByTestId('security-pin-option').click()

    for (let i = 0; i < 4; i++) {
      await page.getByTestId(`pin-input-${i}`).fill(String(i + 1))
    }
    for (let i = 0; i < 4; i++) {
      await page.getByTestId(`confirm-pin-input-${i}`).fill(String(i + 1))
    }

    await page.getByRole('button', { name: 'Secure My Tasks' }).click()
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })
  })

  test('should lock app when clicking Lock App from security menu', async ({ page }) => {
    // Open security dropdown
    await page.getByRole('button', { name: /Security/ }).click()

    // Click Lock App
    await page.getByRole('menuitem', { name: 'Lock App' }).click()

    // Should show PIN unlock modal
    await expect(page.getByText('Welcome Back')).toBeVisible()
    await expect(page.getByTestId('unlock-pin-input-0')).toBeVisible()
  })

  test('should require PIN after locking and unlocking again', async ({ page }) => {
    // Lock the app
    await page.getByRole('button', { name: /Security/ }).click()
    await page.getByRole('menuitem', { name: 'Lock App' }).click()

    // Unlock with correct PIN
    for (let i = 0; i < 4; i++) {
      await page.getByTestId(`unlock-pin-input-${i}`).fill(String(i + 1))
    }

    // Should be unlocked
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Lock again
    await page.getByRole('button', { name: /Security/ }).click()
    await page.getByRole('menuitem', { name: 'Lock App' }).click()

    // Should require PIN again
    await expect(page.getByText('Welcome Back')).toBeVisible()
  })
})
