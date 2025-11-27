<script setup lang="ts">
const STORAGE_KEY = 'sphinx-focus-tasks-encrypted'

interface Task {
  id: string
  text: string
  completed: boolean
  order: number
}

const { encrypt, decrypt } = useEncryption()
const { isUnlocked, hasSessionKey, getSessionKey } = useSecuritySettings()

const tasks = ref<Task[]>([])
const newTaskText = ref('')
const draggedTaskId = ref<string | null>(null)
const dragOverTaskId = ref<string | null>(null)
const isLoading = ref(true)

// Load tasks when unlocked
watch(isUnlocked, async (unlocked) => {
  if (unlocked) {
    await loadTasks()
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
      tasks.value = JSON.parse(decrypted)
      sortTasks()
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
    console.error('Failed to save tasks:', error)
  }
}

// Save tasks whenever they change (debounced via nextTick)
watch(tasks, () => {
  nextTick(() => saveTasks())
}, { deep: true })

function generateId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function getNextOrder(): number {
  if (tasks.value.length === 0) return 0
  return Math.max(...tasks.value.map(t => t.order)) + 1
}

function addTask() {
  if (!newTaskText.value.trim()) {
    return
  }

  tasks.value.push({
    id: generateId(),
    text: newTaskText.value.trim(),
    completed: false,
    order: getNextOrder()
  })

  newTaskText.value = ''
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
  }
}

function handleDragOver(event: DragEvent, targetTaskId: string) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  if (draggedTaskId.value !== targetTaskId) {
    dragOverTaskId.value = targetTaskId
  }
}

function handleDragLeave() {
  dragOverTaskId.value = null
}

function handleDrop(event: DragEvent, targetTaskId: string) {
  event.preventDefault()

  if (!draggedTaskId.value || draggedTaskId.value === targetTaskId) {
    draggedTaskId.value = null
    return
  }

  const draggedIndex = tasks.value.findIndex(task => task.id === draggedTaskId.value)
  const targetIndex = tasks.value.findIndex(task => task.id === targetTaskId)

  if (draggedIndex !== -1 && targetIndex !== -1) {
    // Swap orders
    const draggedTask = tasks.value[draggedIndex]
    const targetTask = tasks.value[targetIndex]

    if (draggedTask && targetTask) {
      const draggedOrder = draggedTask.order
      const targetOrder = targetTask.order

      draggedTask.order = targetOrder
      targetTask.order = draggedOrder

      sortTasks()
    }
  }

  draggedTaskId.value = null
  dragOverTaskId.value = null
}

function handleDragEnd() {
  draggedTaskId.value = null
  dragOverTaskId.value = null
}

function handleKeyPress(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    addTask()
  }
}

// Expose tasks for parent component
defineExpose({
  tasks
})
</script>

<template>
  <div class="space-y-4">
    <!-- Add Task Input -->
    <div class="flex gap-2">
      <UInput
        v-model="newTaskText"
        placeholder="Add a new task..."
        class="flex-1"
        @keypress="handleKeyPress"
      />
      <UButton
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
      class="text-center py-8 text-muted"
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
        :draggable="true"
        class="flex items-center gap-3 p-3 rounded-lg border border-border bg-default hover:bg-elevated transition-colors cursor-move"
        :class="{
          'opacity-50': draggedTaskId === task.id,
          'ring-2 ring-primary': dragOverTaskId === task.id && draggedTaskId !== task.id
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
          type="checkbox"
          :checked="task.completed"
          class="size-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
          @change="toggleTask(task.id)"
        >

        <!-- Task Text -->
        <span
          class="flex-1 text-default"
          :class="{
            'line-through text-muted': task.completed
          }"
        >
          {{ task.text }}
        </span>

        <!-- Delete Button -->
        <UButton
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
