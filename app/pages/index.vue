<script setup lang="ts">
const { settings, updateSetting } = useEncryptedSettings()

// Manual blur override state - derived from encrypted settings
const manualBlurEnabled = computed(() => settings.quickBlur)

// Blur mode setting from encrypted settings (reactive)
const blurModeEnabled = computed(() => settings.blurMode)

function saveManualBlur(value: boolean) {
  updateSetting('quickBlur', value)
}

function toggleTaskListBlur() {
  // Toggle based on current visual state, not just the manual flag
  // If currently blurred (for any reason), unblur. If not blurred, blur.
  const currentlyBlurred = taskListBlurred.value
  saveManualBlur(!currentlyBlurred)
}

const focusTimerRef = ref<{
  mode: 'focus' | 'rest'
  state: 'idle' | 'running' | 'paused'
  timeRemaining: number
  formattedTime: string
  blurModeEnabled: boolean
  pauseTimer: () => void
  startTimer: () => void
  resetTimer: () => void
  skipSession: () => void
} | null>(null)
const taskListRef = ref<{ tasks: Array<{ id: string, text: string, completed: boolean, order: number }> } | null>(null)
const showSettingsModal = ref(false)
const showTaskSettingsModal = ref(false)

// Card drag and drop state
const draggedCardId = ref<'timer' | 'tasks' | null>(null)
const dragOverCardId = ref<'timer' | 'tasks' | null>(null)

// Rest mode stage management
// Stage 0: Normal mode (no rest)
// Stage 2: Immersive centered rest mode with RestModeOverlay
const restStage = ref<0 | 2>(0)
const stageTransitionTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

// Rest transition states for 3-step animation (3 seconds total, 1000ms per step)
// Entering: 'blur' -> 'dark' -> 'overlay'
// Exiting: 'exit-dark' -> 'exit-hide' -> 'exit-unblur' -> 'none'
const restTransition = ref<'none' | 'blur' | 'dark' | 'overlay' | 'exit-dark' | 'exit-hide' | 'exit-unblur'>('none')

const timerTitle = computed(() => {
  const timer = focusTimerRef.value
  const tasks = taskListRef.value?.tasks || []

  if (!timer) {
    return 'Focus Timer'
  }

  // During rest session (running or paused)
  if (timer.mode === 'rest' && (timer.state === 'running' || timer.state === 'paused')) {
    return 'Rest'
  }

  // During focus session (running or paused)
  if (timer.mode === 'focus' && (timer.state === 'running' || timer.state === 'paused')) {
    // Find the first uncompleted task
    const activeTask = tasks.find(task => !task.completed)
    return activeTask ? activeTask.text : 'Focus Timer'
  }

  // Idle state
  return 'Focus Timer'
})

// Dynamic browser tab title
const documentTitle = computed(() => {
  const timer = focusTimerRef.value

  if (!timer) {
    return 'Sphinx Focus'
  }

  // When timer is running or paused, show mode and time
  if (timer.state === 'running' || timer.state === 'paused') {
    const modeLabel = timer.mode === 'focus' ? 'FOCUS' : 'REST'
    return `${modeLabel} - ${timer.formattedTime}`
  }

  // Idle state - return app name
  return 'Sphinx Focus'
})

useHead({
  title: documentTitle
})

// Check if we're in rest mode (running or paused)
const isRestMode = computed(() => {
  const timer = focusTimerRef.value
  if (!timer) return false
  return timer.mode === 'rest' && (timer.state === 'running' || timer.state === 'paused')
})

// Combined task list blur state:
// - If blur mode is disabled: never blur
// - If timer is not running: never blur (only blur during active focus sessions)
// - If auto-blur is active: blur is ON unless manually turned OFF
const taskListBlurred = computed(() => {
  const timer = focusTimerRef.value
  // If blur mode is disabled in settings, never blur
  if (!blurModeEnabled.value) {
    return false
  }

  // Only blur when timer is actively running (not idle or paused)
  if (!timer || timer.state !== 'running' || timer.mode !== 'focus') {
    return false
  }

  // When auto-blur is active, manualBlurEnabled controls whether to keep it or override
  return manualBlurEnabled.value
})

// Show quick blur button only when focus mode is running with blur enabled
const showQuickBlurButton = computed(() => {
  const timer = focusTimerRef.value
  if (!timer) return false
  return timer.mode === 'focus' && timer.state === 'running' && blurModeEnabled.value
})

// Reset quickBlur to default when timer is reset (goes back to idle)
// Only if blur mode is enabled
watch(() => focusTimerRef.value?.state, (newState, oldState) => {
  if (oldState && oldState !== 'idle' && newState === 'idle' && blurModeEnabled.value) {
    // Timer was reset - restore default blur state (only if blur mode is enabled)
    saveManualBlur(true)
  }
})

// isBlurred for the background overlay - follows taskListBlurred but only during focus mode
const isBlurred = computed(() => {
  const timer = focusTimerRef.value
  if (!timer) return false
  // Focus mode: show overlay when task list is blurred
  return timer.mode === 'focus' && timer.state === 'running' && taskListBlurred.value
})

// Watch for rest mode changes to manage 3-step transitions (3 seconds total)
watch(isRestMode, (isRest, wasRest) => {
  // Clear any pending transitions
  if (stageTransitionTimeout.value) {
    clearTimeout(stageTransitionTimeout.value)
    stageTransitionTimeout.value = null
  }

  if (isRest && !wasRest) {
    // Entering rest mode - 3 steps over 3 seconds
    // Step 1: Blur whole screen immediately
    restTransition.value = 'blur'

    // Step 2: After 1000ms, add darkness
    setTimeout(() => {
      if (isRestMode.value) {
        restTransition.value = 'dark'
      }
    }, 1000)

    // Step 3: After 2000ms, show overlay and fade darkness
    stageTransitionTimeout.value = setTimeout(() => {
      if (isRestMode.value) {
        restStage.value = 2
        restTransition.value = 'overlay'
      }
    }, 2000)
  } else if (!isRest && wasRest) {
    // Exiting rest mode - 3 steps over 2 seconds
    // Step 1: Add darkness immediately
    restTransition.value = 'exit-dark'

    // Step 2: After 667ms, hide overlay
    setTimeout(() => {
      restStage.value = 0
      restTransition.value = 'exit-hide'
    }, 667)

    // Step 3: After 1333ms, unblur
    setTimeout(() => {
      restTransition.value = 'exit-unblur'
    }, 1333)

    // Step 4: After 2000ms, reset to none
    stageTransitionTimeout.value = setTimeout(() => {
      restTransition.value = 'none'
    }, 2000)
  }
}, { immediate: true })

// Cleanup on unmount
onUnmounted(() => {
  if (stageTransitionTimeout.value) {
    clearTimeout(stageTransitionTimeout.value)
  }
})

// Timer control handler for RestModeOverlay
function handleSkip() {
  focusTimerRef.value?.skipSession()
}

// Card order computed property
const cardOrder = computed(() => settings.cardOrder)

// Grid column classes based on card order
const gridColsClass = computed(() => {
  return cardOrder.value === 'timer-first'
    ? 'md:grid-cols-[1fr_1.618fr]'
    : 'md:grid-cols-[1.618fr_1fr]'
})

// Card drag handlers
function handleCardDragStart(event: DragEvent, cardId: 'timer' | 'tasks') {
  draggedCardId.value = cardId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', cardId)
  }
}

function handleCardDragOver(event: DragEvent, cardId: 'timer' | 'tasks') {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  if (draggedCardId.value !== cardId) {
    dragOverCardId.value = cardId
  }
}

function handleCardDragLeave() {
  dragOverCardId.value = null
}

function handleCardDrop(event: DragEvent, cardId: 'timer' | 'tasks') {
  event.preventDefault()

  if (!draggedCardId.value || draggedCardId.value === cardId) {
    draggedCardId.value = null
    dragOverCardId.value = null
    return
  }

  // Swap the card order
  const newOrder = cardOrder.value === 'timer-first' ? 'tasks-first' : 'timer-first'
  updateSetting('cardOrder', newOrder)

  draggedCardId.value = null
  dragOverCardId.value = null
}

function handleCardDragEnd() {
  draggedCardId.value = null
  dragOverCardId.value = null
}
</script>

<template>
  <div class="relative">
    <!-- Main content - hidden during stage 2 -->
    <Transition name="rest-content">
      <div
        v-show="restStage !== 2"
        class="container mx-auto px-4 py-6 transition-all duration-1000"
        :class="{
          'blur-3xl': restTransition === 'blur' || restTransition === 'dark',
          'blur-3xl opacity-0': restTransition === 'exit-hide'
        }"
      >
        <div class="grid grid-cols-1 gap-4 relative" :class="gridColsClass">
          <!-- Timer Card -->
          <UCard
            v-if="cardOrder === 'timer-first'"
            class="relative z-[60] transition-all duration-1000"
            :class="{
              'opacity-50': draggedCardId === 'timer',
              'ring-2 ring-primary': dragOverCardId === 'timer' && draggedCardId !== 'timer'
            }"
          >
            <template #header>
              <div
                class="flex items-center justify-between w-full hover:cursor-move"
                draggable="true"
                @dragstart="handleCardDragStart($event, 'timer')"
                @dragover="handleCardDragOver($event, 'timer')"
                @dragleave="handleCardDragLeave"
                @drop="handleCardDrop($event, 'timer')"
                @dragend="handleCardDragEnd"
              >
                <h3
                  class="text-lg font-semibold transition-colors"
                  :class="{
                    'text-primary': timerTitle !== 'Focus Timer' && timerTitle !== 'Rest'
                  }"
                >
                  {{ timerTitle }}
                </h3>
                <UButton
                  v-if="showQuickBlurButton"
                  :icon="taskListBlurred ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  aria-label="Toggle task list blur"
                  @click="toggleTaskListBlur"
                />
              </div>
            </template>
            <div class="relative">
              <!-- Settings button - top right of body -->
              <div class="absolute top-0 right-0">
                <UButton
                  icon="i-lucide-settings"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  aria-label="Timer Settings"
                  @click="showSettingsModal = true"
                />
              </div>
              <FocusTimer ref="focusTimerRef" />
            </div>
          </UCard>

          <!-- Task List Card - blurred via quick toggle during focus mode -->
          <UCard
            v-if="cardOrder === 'timer-first'"
            class="relative z-10 transition-all duration-500"
            :class="{
              'blur-md opacity-50': taskListBlurred && restTransition === 'none',
              'opacity-50': draggedCardId === 'tasks',
              'ring-2 ring-primary': dragOverCardId === 'tasks' && draggedCardId !== 'tasks'
            }"
          >
            <template #header>
              <div
                class="flex items-center justify-between w-full hover:cursor-move"
                draggable="true"
                @dragstart="handleCardDragStart($event, 'tasks')"
                @dragover="handleCardDragOver($event, 'tasks')"
                @dragleave="handleCardDragLeave"
                @drop="handleCardDrop($event, 'tasks')"
                @dragend="handleCardDragEnd"
              >
                <h3 class="text-lg font-semibold">
                  Task List
                </h3>
                <UButton
                  data-testid="task-settings-button"
                  icon="i-lucide-settings"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  aria-label="Task settings"
                  @click="showTaskSettingsModal = true"
                />
              </div>
            </template>
            <TaskList ref="taskListRef" />
          </UCard>

          <!-- Task List Card (when first) -->
          <UCard
            v-if="cardOrder === 'tasks-first'"
            class="relative z-10 transition-all duration-500"
            :class="{
              'blur-md opacity-50': taskListBlurred && restTransition === 'none',
              'opacity-50': draggedCardId === 'tasks',
              'ring-2 ring-primary': dragOverCardId === 'tasks' && draggedCardId !== 'tasks'
            }"
          >
            <template #header>
              <div
                class="flex items-center justify-between w-full hover:cursor-move"
                draggable="true"
                @dragstart="handleCardDragStart($event, 'tasks')"
                @dragover="handleCardDragOver($event, 'tasks')"
                @dragleave="handleCardDragLeave"
                @drop="handleCardDrop($event, 'tasks')"
                @dragend="handleCardDragEnd"
              >
                <h3 class="text-lg font-semibold">
                  Task List
                </h3>
                <UButton
                  data-testid="task-settings-button"
                  icon="i-lucide-settings"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  aria-label="Task settings"
                  @click="showTaskSettingsModal = true"
                />
              </div>
            </template>
            <TaskList ref="taskListRef" />
          </UCard>

          <!-- Timer Card (when second) -->
          <UCard
            v-if="cardOrder === 'tasks-first'"
            class="relative z-[60] transition-all duration-1000"
            :class="{
              'opacity-50': draggedCardId === 'timer',
              'ring-2 ring-primary': dragOverCardId === 'timer' && draggedCardId !== 'timer'
            }"
          >
            <template #header>
              <div
                class="flex items-center justify-between w-full hover:cursor-move"
                draggable="true"
                @dragstart="handleCardDragStart($event, 'timer')"
                @dragover="handleCardDragOver($event, 'timer')"
                @dragleave="handleCardDragLeave"
                @drop="handleCardDrop($event, 'timer')"
                @dragend="handleCardDragEnd"
              >
                <h3
                  class="text-lg font-semibold transition-colors"
                  :class="{
                    'text-primary': timerTitle !== 'Focus Timer' && timerTitle !== 'Rest'
                  }"
                >
                  {{ timerTitle }}
                </h3>
                <UButton
                  v-if="showQuickBlurButton"
                  :icon="taskListBlurred ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  aria-label="Toggle task list blur"
                  @click="toggleTaskListBlur"
                />
              </div>
            </template>
            <div class="relative">
              <!-- Settings button - top right of body -->
              <div class="absolute top-0 right-0">
                <UButton
                  icon="i-lucide-settings"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  aria-label="Timer Settings"
                  @click="showSettingsModal = true"
                />
              </div>
              <FocusTimer ref="focusTimerRef" />
            </div>
          </UCard>
        </div>
      </div>
    </Transition>

    <!-- Blur overlay backdrop - only for focus mode blur -->
    <Transition name="fade">
      <div
        v-if="isBlurred && restTransition === 'none'"
        class="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 pointer-events-none transition-all duration-500"
      />
    </Transition>

    <!-- Rest mode: Full screen blur overlay (entering steps 1-2, exiting step 3) -->
    <Transition name="fade">
      <div
        v-if="restTransition === 'blur' || restTransition === 'dark' || restTransition === 'exit-unblur'"
        class="fixed inset-0 z-50 backdrop-blur-3xl pointer-events-none transition-all duration-1000"
      />
    </Transition>

    <!-- Rest mode: Darkness overlay (entering step 2, exiting step 1) -->
    <Transition name="fade">
      <div
        v-if="restTransition === 'dark' || restTransition === 'exit-dark'"
        class="fixed inset-0 z-[65] bg-black/80 pointer-events-none transition-opacity duration-1000"
      />
    </Transition>

    <!-- Stage 2: Immersive Rest Mode Overlay -->
    <Transition name="rest-overlay">
      <RestModeOverlay
        v-if="restStage === 2 && focusTimerRef"
        :formatted-time="focusTimerRef.formattedTime"
        :state="focusTimerRef.state"
        @skip="handleSkip"
      />
    </Transition>

    <!-- Timer Settings Modal -->
    <TimerSettingsModal
      v-if="showSettingsModal"
      @close="showSettingsModal = false"
    />

    <!-- Task Settings Modal -->
    <TaskSettingsModal
      v-if="showTaskSettingsModal"
      @close="showTaskSettingsModal = false"
    />
  </div>
</template>
