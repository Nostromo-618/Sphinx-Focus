import { test, expect } from '@playwright/test'
import { clearStorage, STORAGE_KEYS, getStorageItem } from '../../fixtures/test-utils'

test.describe('Auto Mode Security', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await page.reload()
  })

  test('should complete setup with auto mode and persist across reloads', async ({ page }) => {
    // Select auto mode
    await page.getByTestId('security-auto-option').click()

    // Should be ready
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Reload page
    await page.reload()

    // Should still be ready (no PIN modal)
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Welcome Back')).not.toBeVisible()
  })

  test('should store encryption key in auto mode', async ({ page }) => {
    // Select auto mode
    await page.getByTestId('security-auto-option').click()
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Verify security config
    const config = await getStorageItem(page, STORAGE_KEYS.security)
    expect(config).not.toBeNull()

    const parsed = JSON.parse(config!)
    expect(parsed.mode).toBe('auto')
    expect(parsed.autoKey).toBeDefined()
    expect(typeof parsed.autoKey).toBe('string')
    expect(parsed.autoKey.length).toBeGreaterThan(0)
  })

  test('should not show Lock App option in security menu for auto mode', async ({ page }) => {
    // Select auto mode
    await page.getByTestId('security-auto-option').click()
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Open security dropdown
    await page.getByRole('button', { name: /Security/ }).click()

    // Lock App should NOT be visible
    await expect(page.getByRole('menuitem', { name: 'Lock App' })).not.toBeVisible()

    // But Change Security Mode should be visible
    await expect(page.getByRole('menuitem', { name: 'Change Security Mode' })).toBeVisible()
  })

  test('should allow changing from auto mode to PIN mode', async ({ page }) => {
    // Start with auto mode
    await page.getByTestId('security-auto-option').click()
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Open security dropdown and change mode
    await page.getByRole('button', { name: /Security/ }).click()
    await page.getByRole('menuitem', { name: 'Change Security Mode' }).click()

    // Should show security setup modal
    await expect(page.getByText('Choose Your Security Level')).toBeVisible()

    // Select PIN mode
    await page.getByTestId('security-pin-option').click()

    // Complete PIN setup
    for (let i = 0; i < 4; i++) {
      await page.getByTestId(`pin-input-${i}`).fill(String(i + 1))
    }
    for (let i = 0; i < 4; i++) {
      await page.getByTestId(`confirm-pin-input-${i}`).fill(String(i + 1))
    }
    await page.getByRole('button', { name: 'Secure My Tasks' }).click()

    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Wait a bit for localStorage write to complete (especially important for Firefox/WebKit)
    await page.waitForTimeout(100)

    // Verify mode changed
    const config = await getStorageItem(page, STORAGE_KEYS.security)
    const parsed = JSON.parse(config!)
    expect(parsed.mode).toBe('pin')
  })

  test('should allow cancelling mode change and preserve current mode', async ({ page }) => {
    // Start with auto mode
    await page.getByTestId('security-auto-option').click()
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Verify initial mode is auto
    const initialConfig = await getStorageItem(page, STORAGE_KEYS.security)
    const initialParsed = JSON.parse(initialConfig!)
    expect(initialParsed.mode).toBe('auto')

    // Open security dropdown and change mode
    await page.getByRole('button', { name: /Security/ }).click()
    await page.getByRole('menuitem', { name: 'Change Security Mode' }).click()

    // Should show security setup modal
    await expect(page.getByText('Choose Your Security Level')).toBeVisible()

    // Cancel by pressing Escape
    await page.keyboard.press('Escape')

    // Modal should be closed
    await expect(page.getByText('Choose Your Security Level')).not.toBeVisible()

    // App should still be functional
    await expect(page.getByTestId('timer-start')).toBeVisible()

    // Mode should still be auto (unchanged)
    const finalConfig = await getStorageItem(page, STORAGE_KEYS.security)
    const finalParsed = JSON.parse(finalConfig!)
    expect(finalParsed.mode).toBe('auto')
  })

  test('should encrypt tasks in auto mode', async ({ page }) => {
    // Setup auto mode
    await page.getByTestId('security-auto-option').click()
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Add a task
    await page.getByTestId('task-input').fill('Test encrypted task')
    await page.getByTestId('task-add').click()

    // Task should be visible
    await expect(page.getByText('Test encrypted task')).toBeVisible()

    // Check that task is stored encrypted (not plain text)
    const tasks = await getStorageItem(page, STORAGE_KEYS.tasks)
    expect(tasks).not.toBeNull()

    // The stored value should be encrypted (base64 encoded)
    // It should NOT contain the plain text
    expect(tasks).not.toContain('Test encrypted task')
    // Should look like base64 (encrypted data)
    expect(tasks).toMatch(/^[A-Za-z0-9+/=]+$/)
  })

  test('should clear all data option works in auto mode', async ({ page }) => {
    // Setup auto mode
    await page.getByTestId('security-auto-option').click()
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Add a task
    await page.getByTestId('task-input').fill('Task to be cleared')
    await page.getByTestId('task-add').click()
    await expect(page.getByText('Task to be cleared')).toBeVisible()

    // Open security dropdown and clear data
    await page.getByRole('button', { name: /Security/ }).click()
    await page.getByRole('menuitem', { name: 'Clear All Data' }).click()

    // Confirm the clear
    await expect(page.getByText('Clear All Data?')).toBeVisible()
    await page.getByRole('button', { name: 'Clear Everything' }).click()

    // Should show setup modal again
    await expect(page.getByText('Choose Your Security Level')).toBeVisible()

    // Verify data was cleared
    const config = await getStorageItem(page, STORAGE_KEYS.security)
    expect(config).toBeNull()

    const tasks = await getStorageItem(page, STORAGE_KEYS.tasks)
    expect(tasks).toBeNull()
  })
})
