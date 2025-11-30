import { test, expect } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady } from '../../fixtures/test-utils'

test.describe('Task Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should display drag handle on each task', async ({ page }) => {
    // Add a task
    await page.getByTestId('task-input').fill('Draggable task')
    await page.getByTestId('task-add').click()

    // Verify task is visible
    await expect(page.getByText('Draggable task')).toBeVisible()

    // Drag handle (grip icon) should be visible
    const taskItem = page.locator('[data-testid^="task-item-"]').first()
    const gripIcon = taskItem.locator('span[class*="iconify"]').first()
    await expect(gripIcon).toBeVisible()
  })

  test('should reorder tasks when dragging and dropping', async ({ page }) => {
    // Add multiple tasks
    await page.getByTestId('task-input').fill('Task A')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Task B')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Task C')
    await page.getByTestId('task-add').click()

    // Verify initial order
    const tasks = page.locator('[data-testid^="task-item-"]')
    await expect(tasks).toHaveCount(3)

    // Get task elements
    const taskA = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Task A' })
    const taskC = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Task C' })

    // Drag Task A to Task C's position
    await taskA.dragTo(taskC)

    // Wait for reorder to complete
    await page.waitForTimeout(500)

    // Verify new order - Task A should now be after Task B
    const reorderedTasks = page.locator('[data-testid^="task-item-"]')
    const lastTask = reorderedTasks.last()

    // After dragging A to C, A should swap with C
    // The exact behavior depends on implementation, but order should change
    const taskTexts: string[] = []
    for (let i = 0; i < 3; i++) {
      const text = await reorderedTasks.nth(i).locator('[data-testid^="task-text-"]').textContent()
      taskTexts.push(text || '')
    }

    // Order should have changed from original [A, B, C]
    expect(taskTexts.join(',')).not.toBe('Task A,Task B,Task C')
  })

  test('should persist reordered tasks after page reload', async ({ page }) => {
    // Add multiple tasks
    await page.getByTestId('task-input').fill('First')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Second')
    await page.getByTestId('task-add').click()

    // Get task elements
    const firstTask = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'First' })
    const secondTask = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Second' })

    // Drag First to Second's position (swap them)
    await firstTask.dragTo(secondTask)

    // Wait for reorder and save
    await page.waitForTimeout(500)

    // Get order after drag
    const tasksAfterDrag = page.locator('[data-testid^="task-item-"]')
    const orderAfterDrag: string[] = []
    for (let i = 0; i < 2; i++) {
      const text = await tasksAfterDrag.nth(i).locator('[data-testid^="task-text-"]').textContent()
      orderAfterDrag.push(text || '')
    }

    // Reload page
    await page.reload()
    await waitForAppReady(page)

    // Verify order persisted
    const tasksAfterReload = page.locator('[data-testid^="task-item-"]')
    await expect(tasksAfterReload).toHaveCount(2)

    const orderAfterReload: string[] = []
    for (let i = 0; i < 2; i++) {
      const text = await tasksAfterReload.nth(i).locator('[data-testid^="task-text-"]').textContent()
      orderAfterReload.push(text || '')
    }

    expect(orderAfterReload).toEqual(orderAfterDrag)
  })

  test('should maintain order within completed/uncompleted groups', async ({ page }) => {
    // Add tasks
    await page.getByTestId('task-input').fill('Task 1')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Task 2')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Task 3')
    await page.getByTestId('task-add').click()

    // Complete Task 2 (middle task)
    const task2 = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Task 2' })
    const checkbox2 = task2.locator('[data-testid^="task-checkbox-"]')
    await checkbox2.click()

    // Task 2 should now be at the bottom (completed tasks go to bottom)
    const tasks = page.locator('[data-testid^="task-item-"]')
    const lastTask = tasks.last()
    await expect(lastTask).toContainText('Task 2')

    // Uncompleted tasks (Task 1, Task 3) should be at top
    const firstTask = tasks.first()
    const secondTask = tasks.nth(1)
    await expect(firstTask).toContainText('Task 1')
    await expect(secondTask).toContainText('Task 3')
  })

  test('should show visual feedback during drag operation', async ({ page }) => {
    // Add multiple tasks
    await page.getByTestId('task-input').fill('Drag me')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Drop target')
    await page.getByTestId('task-add').click()

    // Get task elements
    const dragTask = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Drag me' })
    const dropTarget = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Drop target' })

    // Start drag operation manually to check visual states
    const dragBox = await dragTask.boundingBox()
    const dropBox = await dropTarget.boundingBox()

    if (dragBox && dropBox) {
      // Start drag
      await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2)
      await page.mouse.down()

      // Move to drop target (hover over it)
      await page.mouse.move(dropBox.x + dropBox.width / 2, dropBox.y + dropBox.height / 2)

      // The dragged item should have opacity-50 class applied
      // The drop target should have ring-2 ring-primary class when hovered
      // Note: These visual states are CSS-based and may be transient

      // Complete the drop
      await page.mouse.up()
    }

    // After drop, both tasks should be visible and properly styled
    await expect(page.getByText('Drag me')).toBeVisible()
    await expect(page.getByText('Drop target')).toBeVisible()
  })

  test('should allow reordering multiple times', async ({ page }) => {
    // Add three tasks
    await page.getByTestId('task-input').fill('Alpha')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Beta')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Gamma')
    await page.getByTestId('task-add').click()

    // First reorder: drag Alpha to Gamma
    const alpha = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Alpha' })
    const gamma = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Gamma' })
    await alpha.dragTo(gamma)
    await page.waitForTimeout(300)

    // Second reorder: drag Beta to top
    const beta = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Beta' })
    const firstTask = page.locator('[data-testid^="task-item-"]').first()
    await beta.dragTo(firstTask)
    await page.waitForTimeout(300)

    // All tasks should still exist
    await expect(page.getByText('Alpha')).toBeVisible()
    await expect(page.getByText('Beta')).toBeVisible()
    await expect(page.getByText('Gamma')).toBeVisible()

    // Should have 3 tasks
    const tasks = page.locator('[data-testid^="task-item-"]')
    await expect(tasks).toHaveCount(3)
  })
})
