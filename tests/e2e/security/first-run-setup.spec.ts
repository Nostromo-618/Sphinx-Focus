import { test, expect } from '@playwright/test'
import { clearStorage, STORAGE_KEYS, getStorageItem } from '../../fixtures/test-utils'

test.describe('First Run Security Setup', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all storage to simulate first run
    await page.goto('/')
    await clearStorage(page)
    await page.reload()
  })

  test('should display security setup modal on first run', async ({ page }) => {
    // First, accept disclaimer
    await expect(page.getByText('Disclaimer & Terms of Use')).toBeVisible()
    await page.getByRole('button', { name: 'I Agree' }).click()

    // Then security setup modal should be visible
    await expect(page.getByText('Choose Your Security Level')).toBeVisible()
    await expect(page.getByText('How would you like to protect your tasks?')).toBeVisible()

    // Both options should be available
    await expect(page.getByTestId('security-pin-option')).toBeVisible()
    await expect(page.getByTestId('security-auto-option')).toBeVisible()
  })

  test('should complete setup with Auto mode (Quick Access)', async ({ page }) => {
    // First, accept disclaimer
    await page.getByRole('button', { name: 'I Agree' }).click()

    // Click Auto mode option
    await page.getByTestId('security-auto-option').click()

    // Modal should close and app should be ready
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Focus Timer')).toBeVisible()

    // Verify security config was saved
    const config = await getStorageItem(page, STORAGE_KEYS.security)
    expect(config).not.toBeNull()

    const parsed = JSON.parse(config!)
    expect(parsed.mode).toBe('auto')
    expect(parsed.autoKey).toBeDefined()
  })

  test('should show PIN setup form when selecting PIN mode', async ({ page }) => {
    // First, accept disclaimer
    await page.getByRole('button', { name: 'I Agree' }).click()

    // Click PIN mode option
    await page.getByTestId('security-pin-option').click()

    // Should show PIN setup form
    await expect(page.getByText('Create Your PIN')).toBeVisible()
    await expect(page.getByText('Enter a 4-digit PIN to secure your tasks')).toBeVisible()

    // PIN input fields should be visible
    for (let i = 0; i < 4; i++) {
      await expect(page.getByTestId(`pin-input-${i}`)).toBeVisible()
      await expect(page.getByTestId(`confirm-pin-input-${i}`)).toBeVisible()
    }

    // Submit button should be disabled initially
    await expect(page.getByRole('button', { name: 'Secure My Tasks' })).toBeDisabled()
  })

  test('should complete setup with PIN mode', async ({ page }) => {
    // First, accept disclaimer
    await page.getByRole('button', { name: 'I Agree' }).click()

    // Click PIN mode option
    await page.getByTestId('security-pin-option').click()

    // Enter PIN: 1234
    await page.getByTestId('pin-input-0').fill('1')
    await page.getByTestId('pin-input-1').fill('2')
    await page.getByTestId('pin-input-2').fill('3')
    await page.getByTestId('pin-input-3').fill('4')

    // Confirm PIN: 1234
    await page.getByTestId('confirm-pin-input-0').fill('1')
    await page.getByTestId('confirm-pin-input-1').fill('2')
    await page.getByTestId('confirm-pin-input-2').fill('3')
    await page.getByTestId('confirm-pin-input-3').fill('4')

    // Submit
    await page.getByRole('button', { name: 'Secure My Tasks' }).click()

    // App should be ready
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Verify security config was saved
    const config = await getStorageItem(page, STORAGE_KEYS.security)
    expect(config).not.toBeNull()

    const parsed = JSON.parse(config!)
    expect(parsed.mode).toBe('pin')
    expect(parsed.salt).toBeDefined()
    expect(parsed.pinHash).toBeDefined()
    // Auto key should NOT be present in PIN mode
    expect(parsed.autoKey).toBeUndefined()
  })

  test('should show error when PINs do not match', async ({ page }) => {
    // First, accept disclaimer
    await page.getByRole('button', { name: 'I Agree' }).click()

    // Click PIN mode option
    await page.getByTestId('security-pin-option').click()

    // Enter PIN: 1234
    await page.getByTestId('pin-input-0').fill('1')
    await page.getByTestId('pin-input-1').fill('2')
    await page.getByTestId('pin-input-2').fill('3')
    await page.getByTestId('pin-input-3').fill('4')

    // Confirm PIN with different value: 5678
    await page.getByTestId('confirm-pin-input-0').fill('5')
    await page.getByTestId('confirm-pin-input-1').fill('6')
    await page.getByTestId('confirm-pin-input-2').fill('7')
    await page.getByTestId('confirm-pin-input-3').fill('8')

    // Submit
    await page.getByRole('button', { name: 'Secure My Tasks' }).click()

    // Error should be displayed
    await expect(page.getByText('PINs do not match')).toBeVisible()

    // Should still be on setup modal
    await expect(page.getByText('Create Your PIN')).toBeVisible()
  })

  test('should auto-focus next PIN input when typing', async ({ page }) => {
    // First, accept disclaimer
    await page.getByRole('button', { name: 'I Agree' }).click()

    // Click PIN mode option
    await page.getByTestId('security-pin-option').click()

    // Type in first input
    await page.getByTestId('pin-input-0').fill('1')

    // Second input should be focused (we verify by typing into it)
    await page.keyboard.type('2')
    await expect(page.getByTestId('pin-input-1')).toHaveValue('2')
  })

  test('should allow going back from PIN setup to mode selection', async ({ page }) => {
    // First, accept disclaimer
    await page.getByRole('button', { name: 'I Agree' }).click()

    // Click PIN mode option
    await page.getByTestId('security-pin-option').click()

    // Should be on PIN setup
    await expect(page.getByText('Create Your PIN')).toBeVisible()

    // Click back button
    await page.getByRole('button', { name: '' }).first().click() // Back arrow button

    // Should be back to mode selection
    await expect(page.getByText('Choose Your Security Level')).toBeVisible()
  })

  test('should display recommended badge on PIN option', async ({ page }) => {
    // First, accept disclaimer
    await page.getByRole('button', { name: 'I Agree' }).click()

    await expect(page.getByText('Recommended')).toBeVisible()
  })

  test('should show security info for both modes', async ({ page }) => {
    // First, accept disclaimer
    await page.getByRole('button', { name: 'I Agree' }).click()

    // PIN mode info
    await expect(page.getByText('Maximum Security')).toBeVisible()
    await expect(page.getByText('Key never stored')).toBeVisible()
    await expect(page.getByText('Data unreadable without PIN')).toBeVisible()

    // Auto mode info
    await expect(page.getByText('Quick Access')).toBeVisible()
    await expect(page.getByText('Data still encrypted')).toBeVisible()
    await expect(page.getByText('Key stored locally')).toBeVisible()
  })
})
