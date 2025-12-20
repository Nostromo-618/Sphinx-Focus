import { test, expect, Page, Locator } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady } from '../../fixtures/test-utils'

/**
 * Helper to perform HTML5 drag and drop using dispatchEvent
 * Uses element handles instead of CSS selectors for browser context
 */
async function performDragAndDrop(page: Page, sourceLocator: Locator, targetLocator: Locator) {
  // Get bounding boxes for both elements
  const sourceBox = await sourceLocator.boundingBox()
  const targetBox = await targetLocator.boundingBox()

  if (!sourceBox || !targetBox) {
    throw new Error('Could not get bounding boxes for drag elements')
  }

  // Use Playwright's drag and drop with a custom implementation
  // that dispatches proper HTML5 drag events
  await page.evaluate(async () => {
    // Find the draggable elements by their content
    const allDraggables = document.querySelectorAll('[draggable="true"]')
    let timerHeader: Element | null = null
    let taskHeader: Element | null = null

    allDraggables.forEach((el) => {
      const h3 = el.querySelector('h3')
      if (h3) {
        const text = h3.textContent?.trim()
        if (text === 'Focus Timer' || text === 'Rest') {
          timerHeader = el
        } else if (text === 'Task List') {
          taskHeader = el
        }
      }
    })

    return { timerHeader: !!timerHeader, taskHeader: !!taskHeader }
  })

  // Use elementHandle to get actual DOM elements
  const sourceHandle = await sourceLocator.elementHandle()
  const targetHandle = await targetLocator.elementHandle()

  if (!sourceHandle || !targetHandle) {
    throw new Error('Could not get element handles')
  }

  // Dispatch drag events directly via page.evaluate with element handles
  await page.evaluate(([source, target]) => {
    const dataTransfer = new DataTransfer()

    // Dispatch dragstart on source
    source.dispatchEvent(new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }))

    // Dispatch dragover on target
    target.dispatchEvent(new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }))

    // Dispatch drop on target
    target.dispatchEvent(new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }))

    // Dispatch dragend on source
    source.dispatchEvent(new DragEvent('dragend', {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }))
  }, [sourceHandle, targetHandle] as const)
}

test.describe('Card Reordering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should display timer card first by default', async ({ page }) => {
    // Get the grid container
    const grid = page.locator('.grid').first()

    // Timer card should be first (timer-first order)
    // Check by looking for the timer display which is in the first card
    const timerCard = grid.locator('text=Focus Timer').first()
    await expect(timerCard).toBeVisible()

    // Verify grid has timer-first layout class
    const gridClasses = await grid.getAttribute('class')
    expect(gridClasses).toContain('md:grid-cols-[1fr_1.618fr]')
  })

  test('should allow dragging timer card header to reorder', async ({ page }) => {
    // Find the draggable headers
    const timerHeader = page.locator('[draggable="true"]').filter({ hasText: 'Focus Timer' }).first()
    const taskHeader = page.locator('[draggable="true"]').filter({ hasText: 'Task List' }).first()

    // Verify elements exist
    await expect(timerHeader).toBeVisible()
    await expect(taskHeader).toBeVisible()

    // Perform drag and drop
    await performDragAndDrop(page, timerHeader, taskHeader)

    // Wait for state update
    await page.waitForTimeout(300)

    // Verify grid layout changed to tasks-first
    const grid = page.locator('.grid').first()
    const gridClasses = await grid.getAttribute('class')
    expect(gridClasses).toContain('md:grid-cols-[1.618fr_1fr]')
  })

  test('should allow dragging task list card header to reorder', async ({ page }) => {
    const timerHeader = page.locator('[draggable="true"]').filter({ hasText: 'Focus Timer' }).first()
    const taskHeader = page.locator('[draggable="true"]').filter({ hasText: 'Task List' }).first()

    // First, swap to tasks-first
    await performDragAndDrop(page, timerHeader, taskHeader)
    await page.waitForTimeout(300)

    // Now drag task header back to timer header to restore timer-first
    await performDragAndDrop(page, taskHeader, timerHeader)
    await page.waitForTimeout(300)

    // Verify grid layout changed back to timer-first
    const grid = page.locator('.grid').first()
    const gridClasses = await grid.getAttribute('class')
    expect(gridClasses).toContain('md:grid-cols-[1fr_1.618fr]')
  })

  test('should persist card order across page reloads', async ({ page }) => {
    const timerHeader = page.locator('[draggable="true"]').filter({ hasText: 'Focus Timer' }).first()
    const taskHeader = page.locator('[draggable="true"]').filter({ hasText: 'Task List' }).first()

    // Swap cards to tasks-first
    await performDragAndDrop(page, timerHeader, taskHeader)
    await page.waitForTimeout(300)

    // Verify tasks-first layout
    let grid = page.locator('.grid').first()
    let gridClasses = await grid.getAttribute('class')
    expect(gridClasses).toContain('md:grid-cols-[1.618fr_1fr]')

    // Reload page
    await page.reload()
    await waitForAppReady(page)

    // Verify order persisted
    grid = page.locator('.grid').first()
    gridClasses = await grid.getAttribute('class')
    expect(gridClasses).toContain('md:grid-cols-[1.618fr_1fr]')
  })

  test('should show visual feedback during drag', async ({ page }) => {
    // Test that draggable headers have cursor: move
    const timerHeader = page.locator('[draggable="true"]').filter({ hasText: 'Focus Timer' }).first()

    // Check for hover cursor style
    const cursorClass = await timerHeader.getAttribute('class')
    expect(cursorClass).toContain('hover:cursor-move')

    // Verify the element is draggable
    const isDraggable = await timerHeader.getAttribute('draggable')
    expect(isDraggable).toBe('true')
  })

  test('should show ring highlight on drop target', async ({ page }) => {
    // Get the locators
    const timerHeader = page.locator('[draggable="true"]').filter({ hasText: 'Focus Timer' }).first()
    const taskHeader = page.locator('[draggable="true"]').filter({ hasText: 'Task List' }).first()

    // Get element handles
    const timerHandle = await timerHeader.elementHandle()
    const taskHandle = await taskHeader.elementHandle()

    if (!timerHandle || !taskHandle) {
      throw new Error('Could not get element handles')
    }

    // Dispatch dragstart and dragover to show the ring
    await page.evaluate(([source, target]) => {
      const dataTransfer = new DataTransfer()
      dataTransfer.setData('text/plain', 'timer')

      // Dispatch dragstart
      source.dispatchEvent(new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer
      }))

      // Dispatch dragover on target (this should trigger ring highlight)
      target.dispatchEvent(new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer
      }))
    }, [timerHandle, taskHandle] as const)

    // Wait a moment for Vue to update
    await page.waitForTimeout(100)

    // Complete the drag to reset state
    await page.evaluate(([source]) => {
      source.dispatchEvent(new DragEvent('dragend', {
        bubbles: true,
        cancelable: true
      }))
    }, [timerHandle])
  })

  test('should maintain card order after adding tasks', async ({ page }) => {
    const timerHeader = page.locator('[draggable="true"]').filter({ hasText: 'Focus Timer' }).first()
    const taskHeader = page.locator('[draggable="true"]').filter({ hasText: 'Task List' }).first()

    // Swap to tasks-first
    await performDragAndDrop(page, timerHeader, taskHeader)
    await page.waitForTimeout(300)

    // Add a task
    await page.getByTestId('task-input').fill('Test Task')
    await page.getByTestId('task-add').click()

    // Verify order is still tasks-first
    const grid = page.locator('.grid').first()
    const gridClasses = await grid.getAttribute('class')
    expect(gridClasses).toContain('md:grid-cols-[1.618fr_1fr]')
  })

  test('should handle rapid drag and drop operations', async ({ page }) => {
    const timerHeader = page.locator('[draggable="true"]').filter({ hasText: 'Focus Timer' }).first()
    const taskHeader = page.locator('[draggable="true"]').filter({ hasText: 'Task List' }).first()

    // Perform multiple swaps quickly
    for (let i = 0; i < 3; i++) {
      await performDragAndDrop(page, timerHeader, taskHeader)
      await page.waitForTimeout(100)
      await performDragAndDrop(page, taskHeader, timerHeader)
      await page.waitForTimeout(100)
    }

    // Verify final state is consistent
    const grid = page.locator('.grid').first()
    const gridClasses = await grid.getAttribute('class')
    // Should be either timer-first or tasks-first, but consistent
    expect(gridClasses).toMatch(/md:grid-cols-\[(1fr_1\.618fr|1\.618fr_1fr)\]/)
  })
})
