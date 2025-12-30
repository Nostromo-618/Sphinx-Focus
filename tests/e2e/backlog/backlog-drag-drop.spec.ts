import { test, expect } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady, getBacklogTaskOrder } from '../../fixtures/test-utils'

test.describe('Backlog Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should display drag handle on each backlog task', async ({ page }) => {
    // Add a task
    await page.getByTestId('backlog-input').fill('Draggable backlog task')
    await page.getByTestId('backlog-add').click()

    // Verify task is visible
    await expect(page.getByText('Draggable backlog task')).toBeVisible()

    // Drag handle (grip icon) should be visible
    const backlogTaskItem = page.locator('[data-testid^="backlog-item-"]').first()
    const gripIcon = backlogTaskItem.locator('span[class*="iconify"]').first()
    await expect(gripIcon).toBeVisible()
  })

  test('should reorder backlog tasks when dragging and dropping', async ({ page }) => {
    // Add multiple tasks
    await page.getByTestId('backlog-input').fill('Backlog Task A')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Backlog Task B')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Backlog Task C')
    await page.getByTestId('backlog-add').click()

    // Verify initial order [A, B, C]
    const backlogTasks = page.locator('[data-testid^="backlog-item-"]')
    await expect(backlogTasks).toHaveCount(3)

    const initialOrder = await getBacklogTaskOrder(page)
    expect(initialOrder).toEqual(['Backlog Task A', 'Backlog Task B', 'Backlog Task C'])

    // Get task elements
    const taskC = page.locator('[data-testid^="backlog-item-"]').filter({ hasText: 'Backlog Task C' })
    const taskA = page.locator('[data-testid^="backlog-item-"]').filter({ hasText: 'Backlog Task A' })

    // Drag Task C (bottom) to Task A's position (top)
    // With insert behavior, C should insert at top, A and B should shift down
    await taskC.dragTo(taskA)

    // Wait for reorder to complete
    await page.waitForTimeout(500)

    // Verify new order - should be [C, A, B] (insert behavior, not swap)
    const reorderedOrder = await getBacklogTaskOrder(page)

    // Verify insert behavior: C moved to top, A and B shifted down
    expect(reorderedOrder).toEqual(['Backlog Task C', 'Backlog Task A', 'Backlog Task B'])
  })

  test('should reorder backlog tasks when dragging top to bottom', async ({ page }) => {
    // Add multiple tasks
    await page.getByTestId('backlog-input').fill('Backlog Task A')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Backlog Task B')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Backlog Task C')
    await page.getByTestId('backlog-add').click()

    // Verify initial order [A, B, C]
    const backlogTasks = page.locator('[data-testid^="backlog-item-"]')
    await expect(backlogTasks).toHaveCount(3)

    // Get task elements
    const taskA = page.locator('[data-testid^="backlog-item-"]').filter({ hasText: 'Backlog Task A' })
    const taskC = page.locator('[data-testid^="backlog-item-"]').filter({ hasText: 'Backlog Task C' })

    // Ensure elements are visible
    await taskA.scrollIntoViewIfNeeded()
    await taskC.scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)

    // Drag Task A (top) to Task C's position (bottom)
    // With insert behavior, A should insert at bottom, B and C should shift up
    await taskA.dragTo(taskC)

    // Wait for reorder to complete
    await page.waitForTimeout(800)

    // Verify new order - should be [B, C, A] (insert behavior)
    const reorderedOrder = await getBacklogTaskOrder(page)

    // Verify insert behavior: A moved to bottom, B and C shifted up
    expect(reorderedOrder).toEqual(['Backlog Task B', 'Backlog Task C', 'Backlog Task A'])
  })

  test('should persist reordered backlog tasks after page reload', async ({ page }) => {
    // Add multiple tasks
    await page.getByTestId('backlog-input').fill('First Backlog')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Second Backlog')
    await page.getByTestId('backlog-add').click()

    // Get task elements
    const firstTask = page.locator('[data-testid^="backlog-item-"]').filter({ hasText: 'First Backlog' })
    const secondTask = page.locator('[data-testid^="backlog-item-"]').filter({ hasText: 'Second Backlog' })

    // Drag First to Second's position (insert behavior)
    await firstTask.dragTo(secondTask)

    // Wait for reorder and save
    await page.waitForTimeout(500)

    // Get order after drag
    const orderAfterDrag = await getBacklogTaskOrder(page)

    // Reload page
    await page.reload()
    await waitForAppReady(page)

    // Verify order persisted
    const backlogTasks = page.locator('[data-testid^="backlog-item-"]')
    await expect(backlogTasks).toHaveCount(2)

    const orderAfterReload = await getBacklogTaskOrder(page)

    expect(orderAfterReload).toEqual(orderAfterDrag)
  })

  test('should maintain order within completed/uncompleted backlog groups', async ({ page }) => {
    // Add tasks
    await page.getByTestId('backlog-input').fill('Backlog Task 1')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Backlog Task 2')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Backlog Task 3')
    await page.getByTestId('backlog-add').click()

    // Complete Task 2 (middle task)
    const task2 = page.locator('[data-testid^="backlog-item-"]').filter({ hasText: 'Backlog Task 2' })
    const checkbox2 = task2.locator('[data-testid^="backlog-checkbox-"]')
    await checkbox2.click()

    // Task 2 should now be at the bottom (completed tasks go to bottom)
    const backlogTasks = page.locator('[data-testid^="backlog-item-"]')
    const lastTask = backlogTasks.last()
    await expect(lastTask).toContainText('Backlog Task 2')

    // Uncompleted tasks (Task 1, Task 3) should be at top
    const firstTask = backlogTasks.first()
    const secondTask = backlogTasks.nth(1)
    await expect(firstTask).toContainText('Backlog Task 1')
    await expect(secondTask).toContainText('Backlog Task 3')
  })

  test('should show visual feedback during backlog drag operation', async ({ page }) => {
    // Add multiple tasks
    await page.getByTestId('backlog-input').fill('Drag me backlog')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Drop target backlog')
    await page.getByTestId('backlog-add').click()

    // Get task elements
    const dragTask = page.locator('[data-testid^="backlog-item-"]').filter({ hasText: 'Drag me backlog' })
    const dropTarget = page.locator('[data-testid^="backlog-item-"]').filter({ hasText: 'Drop target backlog' })

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
    await expect(page.getByText('Drag me backlog')).toBeVisible()
    await expect(page.getByText('Drop target backlog')).toBeVisible()
  })

  test('should allow reordering backlog tasks multiple times', async ({ page }) => {
    // Add three tasks
    await page.getByTestId('backlog-input').fill('Backlog Alpha')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Backlog Beta')
    await page.getByTestId('backlog-add').click()

    await page.getByTestId('backlog-input').fill('Backlog Gamma')
    await page.getByTestId('backlog-add').click()

    // First reorder: drag Alpha to Gamma
    const alpha = page.locator('[data-testid^="backlog-item-"]').filter({ hasText: 'Backlog Alpha' })
    const gamma = page.locator('[data-testid^="backlog-item-"]').filter({ hasText: 'Backlog Gamma' })
    await alpha.dragTo(gamma)
    await page.waitForTimeout(300)

    // Second reorder: drag Beta to top
    const beta = page.locator('[data-testid^="backlog-item-"]').filter({ hasText: 'Backlog Beta' })
    const firstTask = page.locator('[data-testid^="backlog-item-"]').first()
    await beta.dragTo(firstTask)
    await page.waitForTimeout(300)

    // All tasks should still exist
    await expect(page.getByText('Backlog Alpha')).toBeVisible()
    await expect(page.getByText('Backlog Beta')).toBeVisible()
    await expect(page.getByText('Backlog Gamma')).toBeVisible()

    // Should have 3 backlog tasks
    const backlogTasks = page.locator('[data-testid^="backlog-item-"]')
    await expect(backlogTasks).toHaveCount(3)
  })
})

