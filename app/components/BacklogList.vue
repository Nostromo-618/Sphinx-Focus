<script setup lang="ts">
import type { Task } from '~/types/task'

const STORAGE_KEY = 'sphinx-focus-backlog-encrypted'

const emit = defineEmits<{
  taskMovedOut: [task: Task]
}>()

const { encrypt, decrypt } = useEncryption()
const { isUnlocked, hasSessionKey, getSessionKey } = useSecuritySettings()
const { settings } = useEncryptedSettings()

const tasks = ref<Task[]>([])
const newTaskText = ref('')
const draggedTaskId = ref<string | null>(null)
const dragOverTaskId = ref<string | null>(null)
const isLoading = ref(true)
const taskOpacities = ref<Record<string, number>>({})
const externalDragSource = ref<string | null>(null)

// Get settings from encrypted settings (reactive)
const fadeDuration = computed(() => settings.taskFadeDuration)
const taskPosition = computed(() => settings.taskPosition)
const taskRowHeight = computed(() => settings.taskRowHeight)

// Compute padding class based on row height setting
const rowPaddingClass = computed(() => {
  switch (taskRowHeight.value) {
    case 'default':
      return 'py-[5px]'
    case 'medium':
      return 'py-[9px]'
    case 'large':
      return 'py-[13.5px]'
    default:
      return 'py-[5px]'
  }
})

// Load tasks when unlocked
watch(isUnlocked, async (unlocked) => {
  if (unlocked) {
    await loadTasks()
  } else {
    // Clear tasks when locked/cleared
    tasks.value = []
    taskOpacities.value = {}
  }
}, { immediate: true })

async function loadTasks() {
  if (!hasSessionKey()) {
    isLoading.value = false
    return
  }

  isLoading.value = true
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY)
    if (encrypted) {
      const key = getSessionKey()
      const decrypted = await decrypt(encrypted, key)
      const loadedTasks = JSON.parse(decrypted) as Task[]
      tasks.value = loadedTasks

      // Initialize opacities for completed tasks that don't have completedAt
      // (for backward compatibility with existing tasks)
      loadedTasks.forEach((task) => {
        if (task.completed && !task.completedAt) {
          // Set completedAt to now for tasks that were already completed
          // This will make them start fading immediately
          task.completedAt = Date.now()
          taskOpacities.value[task.id] = 1
        } else if (task.completed && task.completedAt) {
          // Initialize opacity for tasks with completedAt
          taskOpacities.value[task.id] = calculateOpacity(task)
        }
      })

      sortTasks()
      // Initial fade check after loading
      updateFadeProgress()
    }
  } catch {
    // Decryption failed or data corrupted - start fresh
    tasks.value = []
  } finally {
    isLoading.value = false
  }
}

async function saveTasks() {
  if (!hasSessionKey()) return

  try {
    const key = getSessionKey()
    const encrypted = await encrypt(JSON.stringify(tasks.value), key)
    localStorage.setItem(STORAGE_KEY, encrypted)
  } catch (error) {
    console.error('Failed to save backlog tasks:', error)
  }
}

// Save tasks whenever they change (debounced via nextTick)
watch(tasks, () => {
  nextTick(() => saveTasks())
}, { deep: true })

function generateId(): string {
  return `backlog-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function getNextOrder(): number {
  if (tasks.value.length === 0) return 0
  return Math.max(...tasks.value.map(t => t.order)) + 1
}

function getMinOrder(): number {
  if (tasks.value.length === 0) return 0
  return Math.min(...tasks.value.map(t => t.order)) - 1
}

function addTask() {
  if (!newTaskText.value.trim()) {
    return
  }

  // Get order based on position setting
  const order = taskPosition.value === 'top'
    ? getMinOrder()
    : getNextOrder()

  tasks.value.push({
    id: generateId(),
    text: newTaskText.value.trim(),
    completed: false,
    order
  })

  newTaskText.value = ''
  sortTasks()
}

// Add task from external source (cross-list drag)
// If targetTaskId is provided, insert at that position; otherwise use position setting
function addTaskFromExternal(task: Task, targetTaskId?: string) {
  // Generate new ID to avoid conflicts
  const newTask: Task = {
    ...task,
    id: generateId(),
    order: 0 // Will be set below
  }

  if (targetTaskId) {
    // Insert at specific position (respect drop target)
    const targetTask = tasks.value.find(t => t.id === targetTaskId)
    if (targetTask) {
      const targetOrder = targetTask.order
      // Shift tasks down to make room
      tasks.value.forEach((t) => {
        if (t.order >= targetOrder) {
          t.order++
        }
      })
      newTask.order = targetOrder
    } else {
      // Fallback to position setting if target not found
      newTask.order = taskPosition.value === 'top' ? getMinOrder() : getNextOrder()
    }
  } else {
    // No target specified - use position setting
    newTask.order = taskPosition.value === 'top' ? getMinOrder() : getNextOrder()
  }

  tasks.value.push(newTask)
  sortTasks()
}

function deleteTask(id: string) {
  const index = tasks.value.findIndex(task => task.id === id)
  if (index !== -1) {
    tasks.value.splice(index, 1)
    sortTasks()
  }
}

function toggleTask(id: string) {
  const task = tasks.value.find(task => task.id === id)
  if (task) {
    task.completed = !task.completed
    if (task.completed) {
      // Store completion timestamp when marking as complete
      task.completedAt = Date.now()
      // Initialize opacity to 1 (fully visible)
      taskOpacities.value[task.id] = 1
    } else {
      // Clear completion timestamp and opacity when uncompleting
      task.completedAt = undefined
      taskOpacities.value[task.id] = undefined as unknown as number
    }
    sortTasks()
  }
}

function sortTasks() {
  tasks.value.sort((a, b) => {
    // Sort by completion status first (unfinished tasks first)
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1
    }
    // Then sort by order within each group
    return a.order - b.order
  })
}

function handleDragStart(event: DragEvent, taskId: string) {
  draggedTaskId.value = taskId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', taskId)
    event.dataTransfer.setData('data-source', 'backlog')
  }
}

function handleDragOver(event: DragEvent, targetTaskId: string) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }

  // Check if this is an external drag (no draggedTaskId means it's from another list)
  if (!draggedTaskId.value && event.dataTransfer?.types.includes('data-source')) {
    // External drag - set dragOverTaskId so parent can use it
    externalDragSource.value = 'tasks' // Assume from tasks if not from this list
    dragOverTaskId.value = targetTaskId
    return
  }

  // Internal drag
  if (draggedTaskId.value && draggedTaskId.value !== targetTaskId) {
    dragOverTaskId.value = targetTaskId
  }
}

function handleDragLeave() {
  // Only clear if not handling external drag
  if (!externalDragSource.value) {
    dragOverTaskId.value = null
  }
}

function handleDrop(event: DragEvent, targetTaskId: string) {
  event.preventDefault()

  // Check if this is an external drag (from TaskList)
  const source = event.dataTransfer?.getData('data-source')
  if (source && source === 'tasks') {
    // Store target task ID for parent component to use
    // The parent's card drop handler will check dragOverTaskId
    // For now, let the event bubble to card handler which will handle it
    externalDragSource.value = null
    // Keep dragOverTaskId so parent can use it
    return
  }

  // Internal drag
  if (!draggedTaskId.value || draggedTaskId.value === targetTaskId) {
    draggedTaskId.value = null
    dragOverTaskId.value = null
    externalDragSource.value = null
    return
  }

  const draggedTask = tasks.value.find(t => t.id === draggedTaskId.value)
  const targetTask = tasks.value.find(t => t.id === targetTaskId)

  if (draggedTask && targetTask) {
    const oldOrder = draggedTask.order
    const newOrder = targetTask.order

    if (oldOrder < newOrder) {
      // Dragging DOWN: shift intermediate tasks up
      tasks.value.forEach((t) => {
        if (t.order > oldOrder && t.order <= newOrder) {
          t.order--
        }
      })
    } else {
      // Dragging UP: shift intermediate tasks down
      tasks.value.forEach((t) => {
        if (t.order >= newOrder && t.order < oldOrder) {
          t.order++
        }
      })
    }
    draggedTask.order = newOrder
    sortTasks()
  }

  draggedTaskId.value = null
  dragOverTaskId.value = null
  externalDragSource.value = null
}

function handleDragEnd() {
  // If task was dragged out, emit event
  if (draggedTaskId.value) {
    const task = tasks.value.find(t => t.id === draggedTaskId.value)
    if (task && externalDragSource.value === null) {
      // Check if drop actually happened outside (this is a best-effort check)
      // The parent component will handle the actual transfer
    }
  }

  draggedTaskId.value = null
  dragOverTaskId.value = null
  externalDragSource.value = null
}

// Handle external drop (from TaskList)
function handleExternalDrop(task: Task) {
  addTaskFromExternal(task)
}

function handleKeyPress(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    addTask()
  }
}

// Calculate opacity for a completed task
function calculateOpacity(task: Task): number {
  if (!task.completed || !task.completedAt) {
    return 1
  }

  const elapsedSeconds = (Date.now() - task.completedAt) / 1000
  const opacity = Math.max(0, Math.min(1, 1 - (elapsedSeconds / fadeDuration.value)))
  return opacity
}

// Update opacities and delete fully faded tasks
function updateFadeProgress() {
  if (import.meta.server) return

  const tasksToDelete: string[] = []

  tasks.value.forEach((task) => {
    if (task.completed && task.completedAt) {
      const opacity = calculateOpacity(task)
      taskOpacities.value[task.id] = opacity

      // Mark for deletion if fully transparent
      if (opacity <= 0) {
        tasksToDelete.push(task.id)
      }
    }
  })

  // Delete fully faded tasks
  tasksToDelete.forEach((id) => {
    deleteTask(id)
  })
}

// Set up interval to update fade progress
let fadeInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (import.meta.server) return
  // Update fade progress every second
  fadeInterval = setInterval(() => {
    updateFadeProgress()
  }, 1000)
  // Initial update
  updateFadeProgress()
})

onUnmounted(() => {
  if (fadeInterval) {
    clearInterval(fadeInterval)
    fadeInterval = null
  }
})

// Expose tasks and methods for parent component
defineExpose({
  tasks,
  addTaskFromExternal,
  removeTask: deleteTask,
  dragOverTaskId
})
</script>

<template>
  <div class="space-y-4 flex-1 flex flex-col">
    <!-- Add Task Input -->
    <div class="flex gap-2">
      <UInput
        v-model="newTaskText"
        data-testid="backlog-input"
        placeholder="Add a new task..."
        class="flex-1"
        @keypress="handleKeyPress"
      />
      <UButton
        data-testid="backlog-add"
        label="Add"
        icon="i-lucide-plus"
        :disabled="!newTaskText.trim()"
        color="primary"
        @click="addTask"
      />
    </div>

    <!-- Task List -->
    <div
      v-if="tasks.length === 0"
      class="text-center py-8 text-muted flex-1 flex items-center justify-center"
    >
      <p>No tasks yet. Add one above to get started!</p>
    </div>

    <div
      v-else
      class="space-y-2"
    >
      <div
        v-for="task in tasks"
        :key="task.id"
        :data-testid="`backlog-item-${task.id}`"
        :draggable="true"
        class="flex items-center gap-3 px-3 rounded-lg border border-border bg-default hover:bg-elevated transition-all cursor-move"
        :class="[
          rowPaddingClass,
          {
            'opacity-50': draggedTaskId === task.id,
            'ring-2 ring-primary': dragOverTaskId === task.id && draggedTaskId !== task.id
          }
        ]"
        :style="{
          opacity: task.completed && task.completedAt ? taskOpacities[task.id] ?? calculateOpacity(task) : 1,
          transition: 'opacity 0.3s ease-in-out'
        }"
        @dragstart="handleDragStart($event, task.id)"
        @dragover="handleDragOver($event, task.id)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, task.id)"
        @dragend="handleDragEnd"
      >
        <!-- Drag Handle -->
        <UIcon
          name="i-lucide-grip-vertical"
          class="size-5 text-dimmed shrink-0"
        />

        <!-- Checkbox -->
        <input
          :data-testid="`backlog-checkbox-${task.id}`"
          type="checkbox"
          :checked="task.completed"
          class="size-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
          @change="toggleTask(task.id)"
        >

        <!-- Task Text -->
        <span
          :data-testid="`backlog-text-${task.id}`"
          class="flex-1 text-default"
          :class="{
            'line-through text-muted': task.completed
          }"
        >
          {{ task.text }}
        </span>

        <!-- Delete Button -->
        <UButton
          :data-testid="`backlog-delete-${task.id}`"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="xs"
          aria-label="Delete task"
          @click="deleteTask(task.id)"
        />
      </div>
    </div>
  </div>
</template>

