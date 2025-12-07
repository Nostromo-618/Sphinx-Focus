import { test, expect } from '@playwright/test'
import { clearStorage, bypassSecuritySetup, waitForAppReady, STORAGE_KEYS } from '../../fixtures/test-utils'

test.describe('Task Fade-Away Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await clearStorage(page)
    await bypassSecuritySetup(page)
    await page.reload()
    await waitForAppReady(page)
  })

  test('should display task settings button', async ({ page }) => {
    await expect(page.getByTestId('task-settings-button')).toBeVisible()
    await expect(page.getByTestId('task-settings-button')).toHaveAttribute('aria-label', 'Task settings')
  })

  test('should open task settings modal when settings button is clicked', async ({ page }) => {
    await page.getByTestId('task-settings-button').click()

    // Modal should be visible
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Task Settings')).toBeVisible()
    await expect(page.getByText('Configure how completed tasks fade away')).toBeVisible()
  })

  test('should have default fade duration of 55 seconds', async ({ page }) => {
    await page.getByTestId('task-settings-button').click()

    const fadeInput = page.getByLabel('Fade Duration (seconds)')
    await expect(fadeInput).toHaveValue('55')
  })

  test('should allow customizing fade duration', async ({ page }) => {
    await page.getByTestId('task-settings-button').click()

    const fadeInput = page.getByLabel('Fade Duration (seconds)')
    await fadeInput.clear()
    await fadeInput.fill('10')
    await page.getByRole('button', { name: 'Save' }).click()

    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Verify setting was saved (settings are now encrypted, verify by reopening modal)
    await page.getByTestId('task-settings-button').click()
    await expect(page.getByLabel('Fade Duration (seconds)')).toHaveValue('10')
  })

  test('should validate fade duration range (1-180 seconds)', async ({ page }) => {
    await page.getByTestId('task-settings-button').click()

    const fadeInput = page.getByLabel('Fade Duration (seconds)')

    // Test minimum value
    await fadeInput.clear()
    await fadeInput.fill('1')
    await fadeInput.blur()
    await expect(page.getByText('Fade duration must be between 1 and 180 seconds')).not.toBeVisible()

    // Test maximum value
    await fadeInput.clear()
    await fadeInput.fill('180')
    await fadeInput.blur()
    await expect(page.getByText('Fade duration must be between 1 and 180 seconds')).not.toBeVisible()

    // Test invalid values
    await fadeInput.clear()
    await fadeInput.fill('0')
    await fadeInput.blur()
    await expect(page.getByText('Fade duration must be between 1 and 180 seconds')).toBeVisible()

    await fadeInput.clear()
    await fadeInput.fill('181')
    await fadeInput.blur()
    await expect(page.getByText('Fade duration must be between 1 and 180 seconds')).toBeVisible()
  })

  test('should start fading when task is completed', async ({ page }) => {
    // Set a short fade duration for testing
    await page.evaluate(() => {
      localStorage.setItem('sphinx-focus-task-fade-duration', '3')
    })
    await page.reload()
    await waitForAppReady(page)

    // Add a task
    await page.getByTestId('task-input').fill('Task to fade')
    await page.getByTestId('task-add').click()

    const taskItem = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Task to fade' })

    // Initially fully visible
    await expect(taskItem).toBeVisible()
    const initialOpacity = await taskItem.evaluate((el) => {
      return window.getComputedStyle(el).opacity
    })
    expect(parseFloat(initialOpacity)).toBeCloseTo(1, 1)

    // Complete the task
    const checkbox = taskItem.locator('[data-testid^="task-checkbox-"]')
    await checkbox.click()

    // Wait for fade interval to update (interval runs every 1 second)
    // After 1 second with 3-second duration, opacity should be ~0.67
    await page.waitForTimeout(1200)

    // Opacity should start decreasing
    const opacityAfterStart = await taskItem.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).opacity)
    })
    expect(opacityAfterStart).toBeLessThan(1)
    // With 3-second duration, after 1 second opacity should be around 0.67
    expect(opacityAfterStart).toBeGreaterThan(0.5)
  })

  test('should delete task after fade duration completes', async ({ page }) => {
    // Set a very short fade duration for testing (2 seconds)
    await page.getByTestId('task-settings-button').click()
    const fadeInput = page.getByLabel('Fade Duration (seconds)')
    await fadeInput.clear()
    await fadeInput.fill('2')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForTimeout(300)

    // Add a task
    await page.getByTestId('task-input').fill('Task to disappear')
    await page.getByTestId('task-add').click()

    const taskItem = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Task to disappear' })
    await expect(taskItem).toBeVisible()

    // Complete the task
    const checkbox = taskItem.locator('[data-testid^="task-checkbox-"]')
    await checkbox.click()

    // Wait for fade duration + buffer
    await page.waitForTimeout(2500)

    // Task should be deleted
    await expect(taskItem).not.toBeVisible()
    await expect(page.getByText('Task to disappear')).not.toBeVisible()
  })

  test('should fade multiple tasks independently', async ({ page }) => {
    // Set fade duration
    await page.evaluate(() => {
      localStorage.setItem('sphinx-focus-task-fade-duration', '5')
    })
    await page.reload()
    await waitForAppReady(page)

    // Add multiple tasks
    await page.getByTestId('task-input').fill('Task A')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Task B')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Task C')
    await page.getByTestId('task-add').click()

    const taskA = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Task A' })
    const taskB = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Task B' })
    const taskC = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Task C' })

    // Complete Task A
    await taskA.locator('[data-testid^="task-checkbox-"]').click()

    // Wait a moment
    await page.waitForTimeout(1000)

    // Complete Task B
    await taskB.locator('[data-testid^="task-checkbox-"]').click()

    // Wait a moment
    await page.waitForTimeout(1000)

    // Check opacities - Task A should be more faded than Task B
    const opacityA = await taskA.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).opacity)
    })
    const opacityB = await taskB.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).opacity)
    })

    expect(opacityA).toBeLessThan(opacityB)

    // Task C should still be fully visible
    const opacityC = await taskC.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).opacity)
    })
    expect(opacityC).toBeCloseTo(1, 1)
  })

  test('should not fade incomplete tasks', async ({ page }) => {
    // Set fade duration
    await page.evaluate(() => {
      localStorage.setItem('sphinx-focus-task-fade-duration', '3')
    })
    await page.reload()
    await waitForAppReady(page)

    // Add tasks
    await page.getByTestId('task-input').fill('Incomplete task')
    await page.getByTestId('task-add').click()

    await page.getByTestId('task-input').fill('Completed task')
    await page.getByTestId('task-add').click()

    const incompleteTask = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Incomplete task' })
    const completedTask = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Completed task' })

    // Complete one task
    await completedTask.locator('[data-testid^="task-checkbox-"]').click()

    // Wait for fade to progress
    await page.waitForTimeout(1500)

    // Incomplete task should still be fully visible
    const incompleteOpacity = await incompleteTask.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).opacity)
    })
    expect(incompleteOpacity).toBeCloseTo(1, 1)

    // Completed task should be fading
    const completedOpacity = await completedTask.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).opacity)
    })
    expect(completedOpacity).toBeLessThan(1)
  })

  test('should stop fading if task is uncompleted', async ({ page }) => {
    // Set fade duration
    await page.evaluate(() => {
      localStorage.setItem('sphinx-focus-task-fade-duration', '5')
    })
    await page.reload()
    await waitForAppReady(page)

    // Add and complete a task
    await page.getByTestId('task-input').fill('Task to uncomplete')
    await page.getByTestId('task-add').click()

    const taskItem = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Task to uncomplete' })
    const checkbox = taskItem.locator('[data-testid^="task-checkbox-"]')

    await checkbox.click()

    // Wait for fade to start
    await page.waitForTimeout(1500)

    // Check that it's fading
    const opacityWhileFading = await taskItem.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).opacity)
    })
    expect(opacityWhileFading).toBeLessThan(1)

    // Uncomplete the task
    await checkbox.click()

    // Wait a moment
    await page.waitForTimeout(500)

    // Task should be fully visible again
    const opacityAfterUncomplete = await taskItem.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).opacity)
    })
    expect(opacityAfterUncomplete).toBeCloseTo(1, 1)

    // Task should still exist
    await expect(taskItem).toBeVisible()
  })

  test('should persist fade duration setting across page reloads', async ({ page }) => {
    // Set custom fade duration
    await page.getByTestId('task-settings-button').click()
    const fadeInput = page.getByLabel('Fade Duration (seconds)')
    await fadeInput.clear()
    await fadeInput.fill('30')
    await page.getByRole('button', { name: 'Save' }).click()

    // Wait for settings to be saved (encrypted settings are saved with debounce)
    await page.waitForTimeout(500)

    // Reload page
    await page.reload()
    await waitForAppReady(page)

    // Wait for encrypted settings to load
    await page.waitForTimeout(500)

    // Verify setting persisted
    await page.getByTestId('task-settings-button').click()
    await expect(page.getByLabel('Fade Duration (seconds)')).toHaveValue('30')
  })

  test('should use persisted fade duration for new tasks', async ({ page }) => {
    // Set a short fade duration
    await page.getByTestId('task-settings-button').click()
    const fadeInput = page.getByLabel('Fade Duration (seconds)')
    await fadeInput.clear()
    await fadeInput.fill('2')
    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForTimeout(300)

    // Add and complete a task
    await page.getByTestId('task-input').fill('Quick fade task')
    await page.getByTestId('task-add').click()

    const taskItem = page.locator('[data-testid^="task-item-"]').filter({ hasText: 'Quick fade task' })
    await taskItem.locator('[data-testid^="task-checkbox-"]').click()

    // Task should disappear after 2 seconds
    await page.waitForTimeout(2500)
    await expect(taskItem).not.toBeVisible()
  })
})
