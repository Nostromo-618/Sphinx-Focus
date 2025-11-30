import { test, expect } from '@playwright/test'
import { clearStorage, STORAGE_KEYS, getStorageItem, SphinxFocusPage, TEST_PIN } from '../../fixtures/test-utils'

test.describe('Security Mode Change - Task Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await page.reload()
  })

  test('should preserve tasks when changing from auto mode to PIN mode', async ({ page }) => {
    const app = new SphinxFocusPage(page)

    // Setup auto mode
    await app.setupAutoMode()

    // Add a task
    await app.addTask('Task to preserve')
    await expect(page.getByText('Task to preserve')).toBeVisible()

    // Change to PIN mode
    await page.getByRole('button', { name: /Security/ }).click()
    await page.getByRole('menuitem', { name: 'Change Security Mode' }).click()
    await expect(page.getByText('Choose Your Security Level')).toBeVisible()

    // Select PIN mode
    await page.getByTestId('security-pin-option').click()

    // Complete PIN setup
    await app.enterPIN(TEST_PIN, 'setup')
    await app.enterPIN(TEST_PIN, 'confirm')
    await page.getByRole('button', { name: 'Secure My Tasks' }).click()

    // Wait for app to be ready
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Task should still be visible
    await expect(page.getByText('Task to preserve')).toBeVisible()
  })

  test('should preserve tasks when changing from PIN mode to auto mode', async ({ page }) => {
    const app = new SphinxFocusPage(page)

    // Setup PIN mode
    await app.setupPINMode(TEST_PIN)

    // Add a task
    await app.addTask('Task to preserve')
    await expect(page.getByText('Task to preserve')).toBeVisible()

    // Change to auto mode
    await page.getByRole('button', { name: /Security/ }).click()
    await page.getByRole('menuitem', { name: 'Change Security Mode' }).click()
    await expect(page.getByText('Choose Your Security Level')).toBeVisible()

    // Select auto mode
    await page.getByTestId('security-auto-option').click()

    // Wait for app to be ready
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Task should still be visible
    await expect(page.getByText('Task to preserve')).toBeVisible()
  })

  test('should preserve multiple tasks during mode change', async ({ page }) => {
    const app = new SphinxFocusPage(page)

    // Setup auto mode
    await app.setupAutoMode()

    // Add multiple tasks
    await app.addTask('First task')
    await app.addTask('Second task')
    await app.addTask('Third task')

    await expect(page.getByText('First task')).toBeVisible()
    await expect(page.getByText('Second task')).toBeVisible()
    await expect(page.getByText('Third task')).toBeVisible()

    // Change to PIN mode
    await page.getByRole('button', { name: /Security/ }).click()
    await page.getByRole('menuitem', { name: 'Change Security Mode' }).click()
    await page.getByTestId('security-pin-option').click()

    await app.enterPIN(TEST_PIN, 'setup')
    await app.enterPIN(TEST_PIN, 'confirm')
    await page.getByRole('button', { name: 'Secure My Tasks' }).click()

    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // All tasks should still be visible
    await expect(page.getByText('First task')).toBeVisible()
    await expect(page.getByText('Second task')).toBeVisible()
    await expect(page.getByText('Third task')).toBeVisible()
  })

  test('should preserve completed tasks during mode change', async ({ page }) => {
    const app = new SphinxFocusPage(page)

    // Setup auto mode
    await app.setupAutoMode()

    // Add and complete a task
    await app.addTask('Task to complete')
    const taskId = await page.locator('[data-testid^="task-item-"]').first().getAttribute('data-testid')
    if (taskId) {
      const id = taskId.replace('task-item-', '')
      await app.toggleTask(id)
    }

    // Task should be marked as completed (strikethrough)
    await expect(page.getByText('Task to complete')).toBeVisible()

    // Change to PIN mode
    await page.getByRole('button', { name: /Security/ }).click()
    await page.getByRole('menuitem', { name: 'Change Security Mode' }).click()
    await page.getByTestId('security-pin-option').click()

    await app.enterPIN(TEST_PIN, 'setup')
    await app.enterPIN(TEST_PIN, 'confirm')
    await page.getByRole('button', { name: 'Secure My Tasks' }).click()

    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Completed task should still be visible
    await expect(page.getByText('Task to complete')).toBeVisible()
  })

  test('should preserve tasks after page refresh after mode change from auto to PIN', async ({ page }) => {
    const app = new SphinxFocusPage(page)

    // Setup auto mode
    await app.setupAutoMode()

    // Add a task
    await app.addTask('Task that should persist after refresh')
    await expect(page.getByText('Task that should persist after refresh')).toBeVisible()

    // Change to PIN mode
    await page.getByRole('button', { name: /Security/ }).click()
    await page.getByRole('menuitem', { name: 'Change Security Mode' }).click()
    await page.getByTestId('security-pin-option').click()

    await app.enterPIN(TEST_PIN, 'setup')
    await app.enterPIN(TEST_PIN, 'confirm')
    await page.getByRole('button', { name: 'Secure My Tasks' }).click()

    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Wait a bit for localStorage write to complete
    await page.waitForTimeout(100)

    // Reload page
    await page.reload()

    // Should show PIN unlock modal
    await expect(page.getByText('Welcome Back')).toBeVisible()

    // Unlock with PIN
    await app.unlockWithPIN(TEST_PIN)

    // Task should still be visible after refresh
    await expect(page.getByText('Task that should persist after refresh')).toBeVisible()
  })

  test('should preserve tasks after page refresh after mode change from PIN to auto', async ({ page }) => {
    const app = new SphinxFocusPage(page)

    // Setup PIN mode
    await app.setupPINMode(TEST_PIN)

    // Add a task
    await app.addTask('Task that should persist after refresh')
    await expect(page.getByText('Task that should persist after refresh')).toBeVisible()

    // Change to auto mode
    await page.getByRole('button', { name: /Security/ }).click()
    await page.getByRole('menuitem', { name: 'Change Security Mode' }).click()
    await page.getByTestId('security-auto-option').click()

    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Wait a bit for localStorage write to complete
    await page.waitForTimeout(100)

    // Reload page
    await page.reload()

    // Should be ready immediately (auto mode)
    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Task should still be visible after refresh
    await expect(page.getByText('Task that should persist after refresh')).toBeVisible()
  })

  test('should preserve task order during mode change', async ({ page }) => {
    const app = new SphinxFocusPage(page)

    // Setup auto mode
    await app.setupAutoMode()

    // Add multiple tasks in specific order
    await app.addTask('Task A')
    await app.addTask('Task B')
    await app.addTask('Task C')

    // Get initial order
    const initialOrder = await page.locator('[data-testid^="task-text-"]').allTextContents()

    // Change to PIN mode
    await page.getByRole('button', { name: /Security/ }).click()
    await page.getByRole('menuitem', { name: 'Change Security Mode' }).click()
    await page.getByTestId('security-pin-option').click()

    await app.enterPIN(TEST_PIN, 'setup')
    await app.enterPIN(TEST_PIN, 'confirm')
    await page.getByRole('button', { name: 'Secure My Tasks' }).click()

    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Get final order
    const finalOrder = await page.locator('[data-testid^="task-text-"]').allTextContents()

    // Order should be preserved
    expect(finalOrder).toEqual(initialOrder)
  })

  test('should handle mode change with no existing tasks gracefully', async ({ page }) => {
    const app = new SphinxFocusPage(page)

    // Setup auto mode without adding tasks
    await app.setupAutoMode()

    // Change to PIN mode
    await page.getByRole('button', { name: /Security/ }).click()
    await page.getByRole('menuitem', { name: 'Change Security Mode' }).click()
    await page.getByTestId('security-pin-option').click()

    await app.enterPIN(TEST_PIN, 'setup')
    await app.enterPIN(TEST_PIN, 'confirm')
    await page.getByRole('button', { name: 'Secure My Tasks' }).click()

    await expect(page.getByTestId('timer-start')).toBeVisible({ timeout: 10000 })

    // Should show "No tasks yet" message
    await expect(page.getByText('No tasks yet. Add one above to get started!')).toBeVisible()
  })
})
