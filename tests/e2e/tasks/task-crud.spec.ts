import { test, expect } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady, STORAGE_KEYS, getStorageItem } from '../../fixtures/test-utils'

test.describe('Task CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should display empty task list initially', async ({ page }) => {
    await expect(page.getByText('No tasks yet. Add one above to get started!')).toBeVisible()
    await expect(page.getByTestId('task-input')).toBeVisible()
    await expect(page.getByTestId('task-add')).toBeVisible()
  })

  test('should add a new task', async ({ page }) => {
    // Enter task text
    await page.getByTestId('task-input').fill('My first task')

    // Click add button
    await page.getByTestId('task-add').click()

    // Task should appear in list
    await expect(page.getByText('My first task')).toBeVisible()

    // Empty state message should be gone
    await expect(page.getByText('No tasks yet')).not.toBeVisible()

    // Input should be cleared
    await expect(page.getByTestId('task-input')).toHaveValue('')
  })

  test('should add task using Enter key', async ({ page }) => {
    await page.getByTestId('task-input').fill('Task via Enter')
    await page.getByTestId('task-input').press('Enter')

    await expect(page.getByText('Task via Enter')).toBeVisible()
  })

  test('should not add empty task', async ({ page }) => {
    // Add button should be disabled with empty input
    await expect(page.getByTestId('task-add')).toBeDisabled()

    // Try spaces only
    await page.getByTestId('task-input').fill('   ')
    await expect(page.getByTestId('task-add')).toBeDisabled()
  })

  test('should add multiple tasks', async ({ page }) => {
    await page.getByTestId('task-input').fill('Task 1')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Task 2')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Task 3')
    await page.getByTestId('task-add').click()

    // All tasks should be visible
    await expect(page.getByText('Task 1')).toBeVisible()
    await expect(page.getByText('Task 2')).toBeVisible()
    await expect(page.getByText('Task 3')).toBeVisible()

    // Should have 3 task items
    const tasks = page.locator('[data-testid^="task-item-"]')
    await expect(tasks).toHaveCount(3)
  })

  test('should toggle task completion', async ({ page }) => {
    // Add a task
    await page.getByTestId('task-input').fill('Task to complete')
    await page.getByTestId('task-add').click()

    // Find the task checkbox
    const taskItem = page.locator('[data-testid^="task-item-"]').first()
    const checkbox = taskItem.locator('[data-testid^="task-checkbox-"]')
    const taskText = taskItem.locator('[data-testid^="task-text-"]')

    // Initially unchecked
    await expect(checkbox).not.toBeChecked()
    await expect(taskText).not.toHaveClass(/line-through/)

    // Click to complete
    await checkbox.click()

    // Should be checked with strikethrough
    await expect(checkbox).toBeChecked()
    await expect(taskText).toHaveClass(/line-through/)
  })

  test('should uncomplete a completed task', async ({ page }) => {
    // Add and complete a task
    await page.getByTestId('task-input').fill('Completed task')
    await page.getByTestId('task-add').click()

    const taskItem = page.locator('[data-testid^="task-item-"]').first()
    const checkbox = taskItem.locator('[data-testid^="task-checkbox-"]')

    // Complete it
    await checkbox.click()
    await expect(checkbox).toBeChecked()

    // Uncomplete it
    await checkbox.click()
    await expect(checkbox).not.toBeChecked()
  })

  test('should delete a task', async ({ page }) => {
    // Add a task
    await page.getByTestId('task-input').fill('Task to delete')
    await page.getByTestId('task-add').click()

    // Verify task exists
    await expect(page.getByText('Task to delete')).toBeVisible()

    // Click delete button
    const taskItem = page.locator('[data-testid^="task-item-"]').first()
    const deleteButton = taskItem.locator('[data-testid^="task-delete-"]')
    await deleteButton.click()

    // Task should be gone
    await expect(page.getByText('Task to delete')).not.toBeVisible()

    // Empty state should return
    await expect(page.getByText('No tasks yet')).toBeVisible()
  })

  test('should delete specific task from multiple tasks', async ({ page }) => {
    // Add multiple tasks
    await page.getByTestId('task-input').fill('Keep this task')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Delete this task')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Also keep this')
    await page.getByTestId('task-add').click()

    // Find and delete the middle task
    const taskToDelete = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Delete this task' })
    const deleteButton = taskToDelete.locator('[data-testid^="task-delete-"]')
    await deleteButton.click()

    // Only the deleted task should be gone
    await expect(page.getByText('Delete this task')).not.toBeVisible()
    await expect(page.getByText('Keep this task')).toBeVisible()
    await expect(page.getByText('Also keep this')).toBeVisible()

    // Should have 2 tasks left
    const tasks = page.locator('[data-testid^="task-item-"]')
    await expect(tasks).toHaveCount(2)
  })

  test('should sort completed tasks to bottom', async ({ page }) => {
    // Add tasks
    await page.getByTestId('task-input').fill('Task A')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Task B')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Task C')
    await page.getByTestId('task-add').click()

    // Complete Task B (middle task)
    const taskB = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Task B' })
    const checkboxB = taskB.locator('[data-testid^="task-checkbox-"]')
    await checkboxB.click()

    // Task B should now be at the bottom
    const tasks = page.locator('[data-testid^="task-item-"]')
    const lastTask = tasks.last()
    await expect(lastTask).toContainText('Task B')
  })

  test('should persist tasks across page reloads', async ({ page }) => {
    // Add tasks
    await page.getByTestId('task-input').fill('Persistent task 1')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Persistent task 2')
    await page.getByTestId('task-add').click()

    // Complete first task
    const firstTask = page.locator('[data-testid^="task-item-"]').first()
    const checkbox = firstTask.locator('[data-testid^="task-checkbox-"]')
    await checkbox.click()

    // Reload page
    await page.reload()
    await waitForAppReady(page)

    // Tasks should still exist
    await expect(page.getByText('Persistent task 1')).toBeVisible()
    await expect(page.getByText('Persistent task 2')).toBeVisible()

    // Completion status should persist (task 1 completed, so it's at bottom)
    const tasks = page.locator('[data-testid^="task-item-"]')
    const lastTask = tasks.last()
    await expect(lastTask).toContainText('Persistent task 1')

    // Checkbox should still be checked
    const completedCheckbox = lastTask.locator('[data-testid^="task-checkbox-"]')
    await expect(completedCheckbox).toBeChecked()
  })

  test('should store tasks encrypted in localStorage', async ({ page }) => {
    // Add a task
    await page.getByTestId('task-input').fill('Secret task content')
    await page.getByTestId('task-add').click()

    // Get stored tasks
    const stored = await getStorageItem(page, STORAGE_KEYS.tasks)
    expect(stored).not.toBeNull()

    // Should NOT contain plain text
    expect(stored).not.toContain('Secret task content')

    // Should be base64 encoded (encrypted)
    expect(stored).toMatch(/^[A-Za-z0-9+/=]+$/)
  })

  test('should trim whitespace from task text', async ({ page }) => {
    await page.getByTestId('task-input').fill('  Task with spaces  ')
    await page.getByTestId('task-add').click()

    // Task should appear without extra whitespace
    await expect(page.getByText('Task with spaces')).toBeVisible()

    // Should NOT have the extra spaces
    const taskText = page.locator('[data-testid^="task-text-"]').first()
    const text = await taskText.textContent()
    expect(text).toBe('Task with spaces')
  })
})

test.describe('Task List Visual Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should display drag handle icon', async ({ page }) => {
    await page.getByTestId('task-input').fill('Draggable task')
    await page.getByTestId('task-add').click()

    // Drag handle icon should be visible (rendered as an icon element)
    const taskItem = page.locator('[data-testid^="task-item-"]').first()
    // UIcon renders icons - look for the grip icon by its parent structure
    await expect(taskItem.locator('span[class*="iconify"]').first()).toBeVisible()
  })

  test('should display delete button for each task', async ({ page }) => {
    await page.getByTestId('task-input').fill('Task with delete')
    await page.getByTestId('task-add').click()

    const taskItem = page.locator('[data-testid^="task-item-"]').first()
    const deleteButton = taskItem.locator('[data-testid^="task-delete-"]')

    await expect(deleteButton).toBeVisible()
    await expect(deleteButton).toHaveAttribute('aria-label', 'Delete task')
  })

  test('should show checkbox as input type checkbox', async ({ page }) => {
    await page.getByTestId('task-input').fill('Checkbox task')
    await page.getByTestId('task-add').click()

    const checkbox = page.locator('[data-testid^="task-checkbox-"]').first()
    await expect(checkbox).toHaveAttribute('type', 'checkbox')
  })
})

test.describe('Task Integration with Timer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should show first uncompleted task as timer title during focus', async ({ page }) => {
    // Add tasks
    await page.getByTestId('task-input').fill('Important task')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Another task')
    await page.getByTestId('task-add').click()

    // Start focus timer
    await page.getByTestId('timer-start').click()

    // Header should show first task
    await expect(page.locator('h3').filter({ hasText: 'Important task' })).toBeVisible()
  })

  test('should show next task when first is completed during focus', async ({ page }) => {
    // Add tasks
    await page.getByTestId('task-input').fill('First task')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Second task')
    await page.getByTestId('task-add').click()

    // Start focus timer
    await page.getByTestId('timer-start').click()

    // Complete first task
    const firstTask = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'First task' })
    const checkbox = firstTask.locator('[data-testid^="task-checkbox-"]')
    await checkbox.click()

    // Header should now show second task
    await expect(page.locator('h3').filter({ hasText: 'Second task' })).toBeVisible()
  })

  test('should show Focus Timer when no tasks exist', async ({ page }) => {
    // No tasks added

    // Start focus timer
    await page.getByTestId('timer-start').click()

    // Header should show default
    await expect(page.locator('h3').filter({ hasText: 'Focus Timer' })).toBeVisible()
  })
})
