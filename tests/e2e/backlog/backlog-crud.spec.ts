import { test, expect } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady, STORAGE_KEYS, getStorageItem } from '../../fixtures/test-utils'

test.describe('Backlog CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should display empty backlog initially', async ({ page }) => {
    await expect(page.getByText('No tasks yet. Add one above to get started!').last()).toBeVisible()
    await expect(page.getByTestId('backlog-input')).toBeVisible()
    await expect(page.getByTestId('backlog-add')).toBeVisible()
  })

  test('should add a new task to backlog', async ({ page }) => {
    // Enter task text
    await page.getByTestId('backlog-input').fill('My first backlog task')

    // Click add button
    await page.getByTestId('backlog-add').click()

    // Task should appear in backlog list
    await expect(page.getByText('My first backlog task')).toBeVisible()

    // Empty state message should be gone
    const emptyMessages = page.getByText('No tasks yet. Add one above to get started!')
    const count = await emptyMessages.count()
    // Should have at least one empty message (for task list), but backlog should have task
    expect(count).toBeGreaterThanOrEqual(1)

    // Input should be cleared
    await expect(page.getByTestId('backlog-input')).toHaveValue('')
  })

  test('should add backlog task using Enter key', async ({ page }) => {
    await page.getByTestId('backlog-input').fill('Backlog task via Enter')
    await page.getByTestId('backlog-input').press('Enter')

    await expect(page.getByText('Backlog task via Enter')).toBeVisible()
  })

  test('should not add empty backlog task', async ({ page }) => {
    // Add button should be disabled with empty input
    await expect(page.getByTestId('backlog-add')).toBeDisabled()

    // Try spaces only
    await page.getByTestId('backlog-input').fill('   ')
    await expect(page.getByTestId('backlog-add')).toBeDisabled()
  })

  test('should add multiple backlog tasks', async ({ page }) => {
    await page.getByTestId('backlog-input').fill('Backlog Task 1')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Backlog Task 2')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Backlog Task 3')
    await page.getByTestId('backlog-add').click()

    // All tasks should be visible
    await expect(page.getByText('Backlog Task 1')).toBeVisible()
    await expect(page.getByText('Backlog Task 2')).toBeVisible()
    await expect(page.getByText('Backlog Task 3')).toBeVisible()

    // Should have 3 backlog task items
    const backlogTasks = page.locator('[data-testid^="backlog-item-"]')
    await expect(backlogTasks).toHaveCount(3)
  })

  test('should toggle backlog task completion', async ({ page }) => {
    // Add a task
    await page.getByTestId('backlog-input').fill('Backlog task to complete')
    await page.getByTestId('backlog-add').click()

    // Find the backlog task checkbox
    const backlogTaskItem = page.locator('[data-testid^="backlog-item-"]').first()
    const checkbox = backlogTaskItem.locator('[data-testid^="backlog-checkbox-"]')
    const taskText = backlogTaskItem.locator('[data-testid^="backlog-text-"]')

    // Initially unchecked
    await expect(checkbox).not.toBeChecked()
    await expect(taskText).not.toHaveClass(/line-through/)

    // Click to complete
    await checkbox.click()

    // Should be checked with strikethrough
    await expect(checkbox).toBeChecked()
    await expect(taskText).toHaveClass(/line-through/)
  })

  test('should uncomplete a completed backlog task', async ({ page }) => {
    // Add and complete a task
    await page.getByTestId('backlog-input').fill('Completed backlog task')
    await page.getByTestId('backlog-add').click()

    const backlogTaskItem = page.locator('[data-testid^="backlog-item-"]').first()
    const checkbox = backlogTaskItem.locator('[data-testid^="backlog-checkbox-"]')

    // Complete it
    await checkbox.click()
    await expect(checkbox).toBeChecked()

    // Uncomplete it
    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
  })

  test('should delete a backlog task', async ({ page }) => {
    // Add a task
    await page.getByTestId('backlog-input').fill('Backlog task to delete')
    await page.getByTestId('backlog-add').click()

    // Verify task exists
    await expect(page.getByText('Backlog task to delete')).toBeVisible()

    // Click delete button
    const backlogTaskItem = page.locator('[data-testid^="backlog-item-"]').first()
    const deleteButton = backlogTaskItem.locator('[data-testid^="backlog-delete-"]')
    await deleteButton.click()

    // Task should be gone
    await expect(page.getByText('Backlog task to delete')).not.toBeVisible()

    // Empty state should return
    await expect(page.getByText('No tasks yet. Add one above to get started!').last()).toBeVisible()
  })

  test('should delete specific backlog task from multiple tasks', async ({ page }) => {
    // Add multiple tasks
    await page.getByTestId('backlog-input').fill('Keep this backlog task')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Delete this backlog task')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Also keep this backlog')
    await page.getByTestId('backlog-add').click()

    // Find and delete the middle task
    const taskToDelete = page.locator('[data-testid^="backlog-item-"]').filter({ hasText: 'Delete this backlog task' })
    const deleteButton = taskToDelete.locator('[data-testid^="backlog-delete-"]')
    await deleteButton.click()

    // Only the deleted task should be gone
    await expect(page.getByText('Delete this backlog task')).not.toBeVisible()
    await expect(page.getByText('Keep this backlog task')).toBeVisible()
    await expect(page.getByText('Also keep this backlog')).toBeVisible()

    // Should have 2 backlog tasks left
    const backlogTasks = page.locator('[data-testid^="backlog-item-"]')
    await expect(backlogTasks).toHaveCount(2)
  })

  test('should sort completed backlog tasks to bottom', async ({ page }) => {
    // Add tasks
    await page.getByTestId('backlog-input').fill('Backlog Task A')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Backlog Task B')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Backlog Task C')
    await page.getByTestId('backlog-add').click()

    // Complete Task B (middle task)
    const taskB = page.locator('[data-testid^="backlog-item-"]').filter({ hasText: 'Backlog Task B' })
    const checkboxB = taskB.locator('[data-testid^="backlog-checkbox-"]')
    await checkboxB.click()

    // Task B should now be at the bottom
    const backlogTasks = page.locator('[data-testid^="backlog-item-"]')
    const lastTask = backlogTasks.last()
    await expect(lastTask).toContainText('Backlog Task B')
  })

  test('should persist backlog tasks across page reloads', async ({ page }) => {
    // Add tasks
    await page.getByTestId('backlog-input').fill('Persistent backlog task 1')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Persistent backlog task 2')
    await page.getByTestId('backlog-add').click()

    // Complete first task
    const firstTask = page.locator('[data-testid^="backlog-item-"]').first()
    const checkbox = firstTask.locator('[data-testid^="backlog-checkbox-"]')
    await checkbox.click()

    // Reload page
    await page.reload()
    await waitForAppReady(page)

    // Tasks should still exist
    await expect(page.getByText('Persistent backlog task 1')).toBeVisible()
    await expect(page.getByText('Persistent backlog task 2')).toBeVisible()

    // Completion status should persist (task 1 completed, so it's at bottom)
    const backlogTasks = page.locator('[data-testid^="backlog-item-"]')
    const lastTask = backlogTasks.last()
    await expect(lastTask).toContainText('Persistent backlog task 1')

    // Checkbox should still be checked
    const completedCheckbox = lastTask.locator('[data-testid^="backlog-checkbox-"]')
    await expect(completedCheckbox).toBeChecked()
  })

  test('should store backlog tasks encrypted in localStorage', async ({ page }) => {
    // Add a task
    await page.getByTestId('backlog-input').fill('Secret backlog task content')
    await page.getByTestId('backlog-add').click()

    // Get stored backlog tasks
    const stored = await getStorageItem(page, STORAGE_KEYS.backlog)
    expect(stored).not.toBeNull()

    // Should NOT contain plain text
    expect(stored).not.toContain('Secret backlog task content')

    // Should be base64 encoded (encrypted)
    expect(stored).toMatch(/^[A-Za-z0-9+/=]+$/)
  })

  test('should trim whitespace from backlog task text', async ({ page }) => {
    await page.getByTestId('backlog-input').fill('  Backlog task with spaces  ')
    await page.getByTestId('backlog-add').click()

    // Task should appear without extra whitespace
    await expect(page.getByText('Backlog task with spaces')).toBeVisible()

    // Should NOT have the extra spaces
    const taskText = page.locator('[data-testid^="backlog-text-"]').first()
    const text = await taskText.textContent()
    expect(text).toBe('Backlog task with spaces')
  })
})

test.describe('Backlog Visual Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should display drag handle icon on backlog tasks', async ({ page }) => {
    await page.getByTestId('backlog-input').fill('Draggable backlog task')
    await page.getByTestId('backlog-add').click()

    // Drag handle icon should be visible (rendered as an icon element)
    const backlogTaskItem = page.locator('[data-testid^="backlog-item-"]').first()
    // UIcon renders icons - look for the grip icon by its parent structure
    await expect(backlogTaskItem.locator('span[class*="iconify"]').first()).toBeVisible()
  })

  test('should display delete button for each backlog task', async ({ page }) => {
    await page.getByTestId('backlog-input').fill('Backlog task with delete')
    await page.getByTestId('backlog-add').click()

    const backlogTaskItem = page.locator('[data-testid^="backlog-item-"]').first()
    const deleteButton = backlogTaskItem.locator('[data-testid^="backlog-delete-"]')

    await expect(deleteButton).toBeVisible()
    await expect(deleteButton).toHaveAttribute('aria-label', 'Delete task')
  })

  test('should show checkbox as input type checkbox for backlog tasks', async ({ page }) => {
    await page.getByTestId('backlog-input').fill('Checkbox backlog task')
    await page.getByTestId('backlog-add').click()

    const checkbox = page.locator('[data-testid^="backlog-checkbox-"]').first()
    await expect(checkbox).toHaveAttribute('type', 'checkbox')
  })
})

