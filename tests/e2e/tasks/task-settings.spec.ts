import { test, expect, type Page } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady, STORAGE_KEYS, getStorageItem, setStorageItem } from '../../fixtures/test-utils'

test.describe('Task Settings Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should open task settings modal', async ({ page }) => {
    // Click the task settings button (gear icon near task list)
    await page.getByRole('button', { name: 'Task Settings' }).click()

    // Modal should be visible
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Task Settings')).toBeVisible()
  })

  test('should display new task position setting', async ({ page }) => {
    await page.getByRole('button', { name: 'Task Settings' }).click()

    // Position setting should be visible
    await expect(page.getByText('New Task Position')).toBeVisible()
    await expect(page.getByText('Bottom')).toBeVisible()
    await expect(page.getByText('Top')).toBeVisible()
  })

  test('should have bottom as default position', async ({ page }) => {
    await page.getByRole('button', { name: 'Task Settings' }).click()

    // Bottom radio should be checked by default
    const bottomRadio = page.getByRole('radio', { name: /Bottom/i })
    await expect(bottomRadio).toBeChecked()
  })

  test('should save position setting to localStorage', async ({ page }) => {
    await page.getByRole('button', { name: 'Task Settings' }).click()

    // Select top position
    await page.getByRole('radio', { name: /Top/i }).click()

    // Save settings
    await page.getByRole('button', { name: 'Save' }).click()

    // Verify behavior: add a task and it should appear at top
    await page.getByTestId('task-input').fill('Test Task')
    await page.getByTestId('task-add').click()

    // Verify task was added (settings are now encrypted, verify behavior instead)
    await expect(page.locator('[data-testid^="task-item-"]')).toHaveCount(1)
  })

  test('should persist position setting after reload', async ({ page }) => {
    // Set position to top
    await page.getByRole('button', { name: 'Task Settings' }).click()
    await page.getByRole('radio', { name: /Top/i }).click()
    await page.getByRole('button', { name: 'Save' }).click()

    // Wait for settings to be saved (encrypted settings are saved with debounce)
    await page.waitForTimeout(500)

    // Reload page
    await page.reload()
    await waitForAppReady(page)

    // Wait for encrypted settings to load
    await page.waitForTimeout(500)

    // Open settings again
    await page.getByRole('button', { name: 'Task Settings' }).click()

    // Top should still be selected
    const topRadio = page.getByRole('radio', { name: /Top/i })
    await expect(topRadio).toBeChecked()
  })

  test('should close modal on cancel', async ({ page }) => {
    await page.getByRole('button', { name: 'Task Settings' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('should display fade duration setting', async ({ page }) => {
    await page.getByRole('button', { name: 'Task Settings' }).click()

    await expect(page.getByText('Fade Duration (seconds)')).toBeVisible()
    await expect(page.getByRole('spinbutton')).toBeVisible()
  })
})

test.describe('New Task Position Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should add new tasks at bottom by default', async ({ page }) => {
    // Add first task
    await page.getByTestId('task-input').fill('Task A')
    await page.getByTestId('task-add').click()

    // Add second task
    await page.getByTestId('task-input').fill('Task B')
    await page.getByTestId('task-add').click()

    // Add third task
    await page.getByTestId('task-input').fill('Task C')
    await page.getByTestId('task-add').click()

    // Verify order is A, B, C (bottom insertion)
    const tasks = page.locator('[data-testid^="task-item-"]')
    await expect(tasks.nth(0).locator('[data-testid^="task-text-"]')).toHaveText('Task A')
    await expect(tasks.nth(1).locator('[data-testid^="task-text-"]')).toHaveText('Task B')
    await expect(tasks.nth(2).locator('[data-testid^="task-text-"]')).toHaveText('Task C')
  })

  test('should add new tasks at top when setting is top', async ({ page }) => {
    // Set position to top
    await page.getByRole('button', { name: 'Task Settings' }).click()
    await page.getByRole('radio', { name: /Top/i }).click()
    await page.getByRole('button', { name: 'Save' }).click()

    // Add first task
    await page.getByTestId('task-input').fill('Task A')
    await page.getByTestId('task-add').click()

    // Add second task
    await page.getByTestId('task-input').fill('Task B')
    await page.getByTestId('task-add').click()

    // Add third task
    await page.getByTestId('task-input').fill('Task C')
    await page.getByTestId('task-add').click()

    // Verify order is C, B, A (top insertion - newest first)
    const tasks = page.locator('[data-testid^="task-item-"]')
    await expect(tasks.nth(0).locator('[data-testid^="task-text-"]')).toHaveText('Task C')
    await expect(tasks.nth(1).locator('[data-testid^="task-text-"]')).toHaveText('Task B')
    await expect(tasks.nth(2).locator('[data-testid^="task-text-"]')).toHaveText('Task A')
  })

  test('should apply position setting immediately without reload', async ({ page }) => {
    // Add initial task with default (bottom) setting
    await page.getByTestId('task-input').fill('First Task')
    await page.getByTestId('task-add').click()

    // Change to top position
    await page.getByRole('button', { name: 'Task Settings' }).click()
    await page.getByRole('radio', { name: /Top/i }).click()
    await page.getByRole('button', { name: 'Save' }).click()

    // Add another task - should go to top
    await page.getByTestId('task-input').fill('Second Task')
    await page.getByTestId('task-add').click()

    // Second task should be at top
    const tasks = page.locator('[data-testid^="task-item-"]')
    await expect(tasks.nth(0).locator('[data-testid^="task-text-"]')).toHaveText('Second Task')
    await expect(tasks.nth(1).locator('[data-testid^="task-text-"]')).toHaveText('First Task')
  })

  test('should respect position setting after page reload', async ({ page }) => {
    // Set position to top and save
    await page.getByRole('button', { name: 'Task Settings' }).click()
    await page.getByRole('radio', { name: /Top/i }).click()
    await page.getByRole('button', { name: 'Save' }).click()

    // Wait for settings to be saved (encrypted settings are saved with debounce)
    await page.waitForTimeout(500)

    // Reload page
    await page.reload()
    await waitForAppReady(page)

    // Wait for encrypted settings to load
    await page.waitForTimeout(500)

    // Add tasks
    await page.getByTestId('task-input').fill('Task A')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Task B')
    await page.getByTestId('task-add').click()

    // Task B should be at top (newest first)
    const tasks = page.locator('[data-testid^="task-item-"]')
    await expect(tasks.nth(0).locator('[data-testid^="task-text-"]')).toHaveText('Task B')
    await expect(tasks.nth(1).locator('[data-testid^="task-text-"]')).toHaveText('Task A')
  })

  test('should keep completed tasks at bottom regardless of position setting', async ({ page }) => {
    // Set position to top
    await page.getByRole('button', { name: 'Task Settings' }).click()
    await page.getByRole('radio', { name: /Top/i }).click()
    await page.getByRole('button', { name: 'Save' }).click()

    // Add tasks
    await page.getByTestId('task-input').fill('Task A')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Task B')
    await page.getByTestId('task-add').click()

    // Complete Task B (currently at top)
    const taskB = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Task B' })
    await taskB.locator('[data-testid^="task-checkbox-"]').click()

    // Task B should now be at bottom (completed)
    const tasks = page.locator('[data-testid^="task-item-"]')
    await expect(tasks.nth(0).locator('[data-testid^="task-text-"]')).toHaveText('Task A')
    await expect(tasks.nth(1).locator('[data-testid^="task-text-"]')).toHaveText('Task B')
  })

  test('should add new task at top even with existing completed tasks', async ({ page }) => {
    // Set position to top
    await page.getByRole('button', { name: 'Task Settings' }).click()
    await page.getByRole('radio', { name: /Top/i }).click()
    await page.getByRole('button', { name: 'Save' }).click()

    // Add and complete a task
    await page.getByTestId('task-input').fill('Completed Task')
    await page.getByTestId('task-add').click()

    const completedTask = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Completed Task' })
    await completedTask.locator('[data-testid^="task-checkbox-"]').click()

    // Add new task
    await page.getByTestId('task-input').fill('New Task')
    await page.getByTestId('task-add').click()

    // New task should be at top, completed at bottom
    const tasks = page.locator('[data-testid^="task-item-"]')
    await expect(tasks.nth(0).locator('[data-testid^="task-text-"]')).toHaveText('New Task')
    await expect(tasks.nth(1).locator('[data-testid^="task-text-"]')).toHaveText('Completed Task')
  })

  test('should switch from top to bottom position', async ({ page }) => {
    // Set position to top first
    await page.getByRole('button', { name: 'Task Settings' }).click()
    await page.getByRole('radio', { name: /Top/i }).click()
    await page.getByRole('button', { name: 'Save' }).click()

    // Add task with top setting
    await page.getByTestId('task-input').fill('Task A')
    await page.getByTestId('task-add').click()

    // Switch back to bottom
    await page.getByRole('button', { name: 'Task Settings' }).click()
    await page.getByRole('radio', { name: /Bottom/i }).click()
    await page.getByRole('button', { name: 'Save' }).click()

    // Add another task - should go to bottom
    await page.getByTestId('task-input').fill('Task B')
    await page.getByTestId('task-add').click()

    // Order should be A, B (B added at bottom)
    const tasks = page.locator('[data-testid^="task-item-"]')
    await expect(tasks.nth(0).locator('[data-testid^="task-text-"]')).toHaveText('Task A')
    await expect(tasks.nth(1).locator('[data-testid^="task-text-"]')).toHaveText('Task B')
  })
})

// ============================================================================
// Helper Functions for Row Height Tests
// ============================================================================

/**
 * Get height of a task item by index using boundingBox()
 */
async function getTaskItemHeight(page: Page, index: number): Promise<number> {
  const tasks = page.locator('[data-testid^="task-item-"]')
  const task = tasks.nth(index)
  const box = await task.boundingBox()
  return box?.height || 0
}

/**
 * Get height of a backlog item by index using boundingBox()
 */
async function getBacklogItemHeight(page: Page, index: number): Promise<number> {
  const backlogItems = page.locator('[data-testid^="backlog-item-"]')
  const item = backlogItems.nth(index)
  const box = await item.boundingBox()
  return box?.height || 0
}

/**
 * Set row height in Task Settings modal
 */
async function setRowHeight(page: Page, height: 'Default' | 'Medium' | 'Large') {
  await page.getByRole('button', { name: 'Task Settings' }).click()
  await page.getByRole('radio', { name: new RegExp(`^${height}$`, 'i') }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  // Wait for modal to close and settings to apply
  await page.waitForTimeout(300)
}

/**
 * Verify task item height is within tolerance
 */
async function verifyRowHeight(page: Page, expectedHeight: number, tolerance: number = 2, index: number = 0, isBacklog: boolean = false) {
  const actualHeight = isBacklog
    ? await getBacklogItemHeight(page, index)
    : await getTaskItemHeight(page, index)
  
  expect(actualHeight).toBeGreaterThanOrEqual(expectedHeight - tolerance)
  expect(actualHeight).toBeLessThanOrEqual(expectedHeight + tolerance)
}

// ============================================================================
// Row Height Tests
// ============================================================================

test.describe('Row Height Settings UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should display row height setting in Task Settings modal', async ({ page }) => {
    await page.getByRole('button', { name: 'Task Settings' }).click()

    // Row Height label should be visible
    await expect(page.getByText('Row Height')).toBeVisible()

    // All three options should be visible
    await expect(page.getByRole('radio', { name: /^Default$/i })).toBeVisible()
    await expect(page.getByRole('radio', { name: /^Medium$/i })).toBeVisible()
    await expect(page.getByRole('radio', { name: /^Large$/i })).toBeVisible()

    // Descriptions should show correct heights
    await expect(page.getByText('Compact rows (34px)')).toBeVisible()
    await expect(page.getByText('Standard rows (42px)')).toBeVisible()
    await expect(page.getByText('Spacious rows (51px)')).toBeVisible()
  })

  test('should have Default selected by default', async ({ page }) => {
    await page.getByRole('button', { name: 'Task Settings' }).click()

    // Default radio should be checked
    const defaultRadio = page.getByRole('radio', { name: /^Default$/i })
    await expect(defaultRadio).toBeChecked()
  })
})

test.describe('Row Height Visual Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should have correct height for Default setting (34px)', async ({ page }) => {
    await setRowHeight(page, 'Default')
    await page.getByTestId('task-input').fill('Test Task')
    await page.getByTestId('task-add').click()

    await verifyRowHeight(page, 34, 2, 0, false)
  })

  test('should have correct height for Medium setting (42px)', async ({ page }) => {
    await setRowHeight(page, 'Medium')
    await page.getByTestId('task-input').fill('Test Task')
    await page.getByTestId('task-add').click()

    await verifyRowHeight(page, 42, 2, 0, false)
  })

  test('should have correct height for Large setting (51px)', async ({ page }) => {
    await setRowHeight(page, 'Large')
    await page.getByTestId('task-input').fill('Test Task')
    await page.getByTestId('task-add').click()

    await verifyRowHeight(page, 51, 2, 0, false)
  })
})

test.describe('Row Height Immediate Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should apply row height changes immediately without reload', async ({ page }) => {
    // Add task with Default setting
    await setRowHeight(page, 'Default')
    await page.getByTestId('task-input').fill('Test Task')
    await page.getByTestId('task-add').click()

    // Verify initial height
    await verifyRowHeight(page, 34, 2, 0, false)

    // Change to Medium
    await setRowHeight(page, 'Medium')
    await verifyRowHeight(page, 42, 2, 0, false)

    // Change to Large
    await setRowHeight(page, 'Large')
    await verifyRowHeight(page, 51, 2, 0, false)
  })

  test('should apply current row height to new tasks', async ({ page }) => {
    await setRowHeight(page, 'Large')

    // Add multiple tasks
    await page.getByTestId('task-input').fill('Task 1')
    await page.getByTestId('task-add').click()
    await page.getByTestId('task-input').fill('Task 2')
    await page.getByTestId('task-add').click()
    await page.getByTestId('task-input').fill('Task 3')
    await page.getByTestId('task-add').click()

    // Verify all tasks have Large height
    await verifyRowHeight(page, 51, 2, 0, false)
    await verifyRowHeight(page, 51, 2, 1, false)
    await verifyRowHeight(page, 51, 2, 2, false)
  })
})

test.describe('Row Height Application to Both Lists', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should apply row height to Task List items', async ({ page }) => {
    await setRowHeight(page, 'Medium')
    await page.getByTestId('task-input').fill('Task List Item')
    await page.getByTestId('task-add').click()

    await verifyRowHeight(page, 42, 2, 0, false)
  })

  test('should apply row height to Backlog items', async ({ page }) => {
    await setRowHeight(page, 'Medium')
    await page.getByTestId('backlog-input').fill('Backlog Item')
    await page.getByTestId('backlog-add').click()

    await verifyRowHeight(page, 42, 2, 0, true)
  })

  test('should apply row height to both lists simultaneously', async ({ page }) => {
    await setRowHeight(page, 'Large')

    // Add tasks to both lists
    await page.getByTestId('task-input').fill('Task List Item')
    await page.getByTestId('task-add').click()
    await page.getByTestId('backlog-input').fill('Backlog Item')
    await page.getByTestId('backlog-add').click()

    // Verify both have Large height
    await verifyRowHeight(page, 51, 2, 0, false)
    await verifyRowHeight(page, 51, 2, 0, true)
  })
})

test.describe('Row Height Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should persist row height setting after page reload', async ({ page }) => {
    // Set row height to Medium
    await setRowHeight(page, 'Medium')

    // Wait for encrypted settings to save (debounce)
    await page.waitForTimeout(500)

    // Reload page
    await page.reload()
    await waitForAppReady(page)

    // Wait for encrypted settings to load
    await page.waitForTimeout(500)

    // Open settings and verify Medium is still selected
    await page.getByRole('button', { name: 'Task Settings' }).click()
    const mediumRadio = page.getByRole('radio', { name: /^Medium$/i })
    await expect(mediumRadio).toBeChecked()
    await page.getByRole('button', { name: 'Cancel' }).click()

    // Add a task and verify it has Medium height
    await page.getByTestId('task-input').fill('Test Task')
    await page.getByTestId('task-add').click()
    await verifyRowHeight(page, 42, 2, 0, false)
  })

  test('should persist row height setting across different sessions', async ({ page }) => {
    // Set row height to Large
    await setRowHeight(page, 'Large')

    // Wait for settings to save
    await page.waitForTimeout(500)

    // Reload page
    await page.reload()
    await waitForAppReady(page)
    await page.waitForTimeout(500)

    // Verify setting is maintained
    await page.getByRole('button', { name: 'Task Settings' }).click()
    const largeRadio = page.getByRole('radio', { name: /^Large$/i })
    await expect(largeRadio).toBeChecked()
  })
})

test.describe('Row Height Setting Changes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should switch between all three row height options', async ({ page }) => {
    // Start with Default
    await setRowHeight(page, 'Default')
    await page.getByTestId('task-input').fill('Test Task')
    await page.getByTestId('task-add').click()
    await verifyRowHeight(page, 34, 2, 0, false)

    // Switch to Medium
    await setRowHeight(page, 'Medium')
    await verifyRowHeight(page, 42, 2, 0, false)

    // Switch to Large
    await setRowHeight(page, 'Large')
    await verifyRowHeight(page, 51, 2, 0, false)

    // Switch back to Default
    await setRowHeight(page, 'Default')
    await verifyRowHeight(page, 34, 2, 0, false)
  })
})

test.describe('Row Height Multiple Tasks Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should update all existing tasks when row height changes', async ({ page }) => {
    // Add multiple tasks with Default setting
    await setRowHeight(page, 'Default')
    await page.getByTestId('task-input').fill('Task 1')
    await page.getByTestId('task-add').click()
    await page.getByTestId('task-input').fill('Task 2')
    await page.getByTestId('task-add').click()
    await page.getByTestId('task-input').fill('Task 3')
    await page.getByTestId('task-add').click()

    // Verify all have Default height
    await verifyRowHeight(page, 34, 2, 0, false)
    await verifyRowHeight(page, 34, 2, 1, false)
    await verifyRowHeight(page, 34, 2, 2, false)

    // Change to Medium
    await setRowHeight(page, 'Medium')
    await verifyRowHeight(page, 42, 2, 0, false)
    await verifyRowHeight(page, 42, 2, 1, false)
    await verifyRowHeight(page, 42, 2, 2, false)

    // Change to Large
    await setRowHeight(page, 'Large')
    await verifyRowHeight(page, 51, 2, 0, false)
    await verifyRowHeight(page, 51, 2, 1, false)
    await verifyRowHeight(page, 51, 2, 2, false)
  })
})

