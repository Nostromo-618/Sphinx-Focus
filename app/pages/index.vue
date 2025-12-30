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

// Card element references for overlap detection
// Store actual DOM elements, not component refs
const timerCardElement = ref<HTMLElement | null>(null)
const tasksCardElement = ref<HTMLElement | null>(null)
const timerCardRef = ref<any>(null)
const tasksCardRef = ref<any>(null)
const draggedCardElement = ref<HTMLElement | null>(null)
const globalDragOverListener = ref<((event: DragEvent) => void) | null>(null)
const overlapCheckFrame = ref<number | null>(null)

// Helper to get DOM element from ref (now it's a div wrapper, so it's the element itself)
function getCardElement(cardRef: any): HTMLElement | null {
  if (!cardRef) return null
  // If it's already a DOM element (div wrapper)
  if (cardRef instanceof HTMLElement) return cardRef
  // If it's a component ref, get $el
  if (cardRef.$el) return cardRef.$el as HTMLElement
  return null
}

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

// Update card elements when refs change or card order changes
watch([timerCardRef, tasksCardRef, cardOrder], () => {
  nextTick(() => {
    timerCardElement.value = getCardElement(timerCardRef.value)
    tasksCardElement.value = getCardElement(tasksCardRef.value)
  })
}, { immediate: true, flush: 'post' })

// Helper function to check if two rectangles overlap
function rectanglesOverlap(rect1: DOMRect, rect2: DOMRect): boolean {
  return !(
    rect1.right < rect2.left ||
    rect1.left > rect2.right ||
    rect1.bottom < rect2.top ||
    rect1.top > rect2.bottom
  )
}

// Check if a point is within a rectangle
function pointInRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

// Check for overlap between dragged card and target cards
// Also checks if mouse cursor is over target cards
function checkCardOverlap(mouseX?: number, mouseY?: number): 'timer' | 'tasks' | null {
  if (!draggedCardId.value || !draggedCardElement.value) return null

  const draggedRect = draggedCardElement.value.getBoundingClientRect()

  // Check overlap with timer card
  if (draggedCardId.value !== 'timer' && timerCardElement.value) {
    const timerRect = timerCardElement.value.getBoundingClientRect()
    // Check if dragged card overlaps OR mouse is over timer card
    const overlaps = rectanglesOverlap(draggedRect, timerRect)
    const mouseOver = mouseX !== undefined && mouseY !== undefined && pointInRect(mouseX, mouseY, timerRect)
    if (overlaps || mouseOver) {
      return 'timer'
    }
  }

  // Check overlap with tasks card
  if (draggedCardId.value !== 'tasks' && tasksCardElement.value) {
    const tasksRect = tasksCardElement.value.getBoundingClientRect()
    // Check if dragged card overlaps OR mouse is over tasks card
    const overlaps = rectanglesOverlap(draggedRect, tasksRect)
    const mouseOver = mouseX !== undefined && mouseY !== undefined && pointInRect(mouseX, mouseY, tasksRect)
    if (overlaps || mouseOver) {
      return 'tasks'
    }
  }

  return null
}

// Card drag handlers
function handleCardDragStart(event: DragEvent, cardId: 'timer' | 'tasks') {
  draggedCardId.value = cardId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', cardId)

    // Find the parent wrapper div for the drag ghost image
    // The header div is inside UCard's header slot, traverse up to find the wrapper div
    const header = event.currentTarget as HTMLElement
    const headerSlot = header.closest('[data-slot="header"]')
    const card = headerSlot?.parentElement as HTMLElement | null
    // Now find the wrapper div (parent of UCard)
    const wrapper = card?.parentElement as HTMLElement | null
    if (wrapper) {
      // Store the dragged card wrapper element for overlap detection
      draggedCardElement.value = wrapper

      // Calculate offset to position the ghost image at the cursor position
      const rect = wrapper.getBoundingClientRect()
      const offsetX = event.clientX - rect.left
      const offsetY = event.clientY - rect.top
      event.dataTransfer.setDragImage(wrapper, offsetX, offsetY)
    }
  }

  // Set up global dragover listener for overlap detection
  if (import.meta.client) {
    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move'
      }

      // Use requestAnimationFrame to throttle overlap checks
      if (overlapCheckFrame.value !== null) {
        cancelAnimationFrame(overlapCheckFrame.value)
      }

      overlapCheckFrame.value = requestAnimationFrame(() => {
        // Pass mouse coordinates for cursor-based detection
        const overlappingCard = checkCardOverlap(e.clientX, e.clientY)
        if (overlappingCard) {
          dragOverCardId.value = overlappingCard
        } else {
          // Clear highlight if no overlap detected
          dragOverCardId.value = null
        }
      })
    }

    globalDragOverListener.value = handleGlobalDragOver
    document.addEventListener('dragover', handleGlobalDragOver)
  }
}

function handleCardDragOver(event: DragEvent, cardId: 'timer' | 'tasks') {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  // Always check for overlap first
  const overlappingCard = checkCardOverlap(event.clientX, event.clientY)
  if (overlappingCard) {
    dragOverCardId.value = overlappingCard
  } else if (draggedCardId.value && draggedCardId.value !== cardId) {
    // Fallback to event-based detection if no overlap but we're dragging
    dragOverCardId.value = cardId
  }
}

function handleCardDragLeave(event?: DragEvent) {
  // Only clear if no overlap is detected (prevents flickering)
  // Use a small delay to check overlap after leave event fires
  setTimeout(() => {
    const mouseX = event?.clientX
    const mouseY = event?.clientY
    const overlappingCard = checkCardOverlap(mouseX, mouseY)
    if (!overlappingCard) {
      dragOverCardId.value = null
    }
  }, 10)
}

function handleCardDrop(event: DragEvent, cardId: 'timer' | 'tasks') {
  event.preventDefault()

  if (!draggedCardId.value || draggedCardId.value === cardId) {
    draggedCardId.value = null
    draggedCardElement.value = null
    dragOverCardId.value = null
    return
  }

  // Swap the card order
  const newOrder = cardOrder.value === 'timer-first' ? 'tasks-first' : 'timer-first'
  updateSetting('cardOrder', newOrder)

  draggedCardId.value = null
  draggedCardElement.value = null
  dragOverCardId.value = null
}

function handleCardDragEnd() {
  // Clean up global drag listener
  if (import.meta.client && globalDragOverListener.value) {
    document.removeEventListener('dragover', globalDragOverListener.value)
    globalDragOverListener.value = null
  }

  // Cancel any pending overlap checks
  if (overlapCheckFrame.value !== null) {
    cancelAnimationFrame(overlapCheckFrame.value)
    overlapCheckFrame.value = null
  }

  draggedCardId.value = null
  draggedCardElement.value = null
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
        <div class="grid grid-cols-1 gap-4 relative items-stretch" :class="gridColsClass">
          <!-- Timer Card -->
          <div
            v-if="cardOrder === 'timer-first'"
            ref="timerCardRef"
            class="relative z-[60] transition-all duration-1000 h-full flex"
            :class="{
              'ring-4 ring-primary': dragOverCardId === 'timer' && draggedCardId !== 'timer'
            }"
            @dragover="handleCardDragOver($event, 'timer')"
            @drop="handleCardDrop($event, 'timer')"
          >
            <UCard class="relative z-[60] transition-all duration-1000 w-full flex flex-col">
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

          <!-- Task List Card - blurred via quick toggle during focus mode -->
          <div
            v-if="cardOrder === 'timer-first'"
            ref="tasksCardRef"
            class="relative z-10 transition-all duration-500 h-full flex"
            :class="{
              'ring-4 ring-primary': dragOverCardId === 'tasks' && draggedCardId !== 'tasks'
            }"
            @dragover="handleCardDragOver($event, 'tasks')"
            @drop="handleCardDrop($event, 'tasks')"
          >
            <UCard
              class="relative z-10 transition-all duration-500 w-full flex flex-col"
              :class="{
                'blur-md opacity-50': taskListBlurred && restTransition === 'none'
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
          </div>

          <!-- Task List Card (when first) -->
          <div
            v-if="cardOrder === 'tasks-first'"
            ref="tasksCardRef"
            class="relative z-10 transition-all duration-500 h-full flex"
            :class="{
              'ring-4 ring-primary': dragOverCardId === 'tasks' && draggedCardId !== 'tasks'
            }"
            @dragover="handleCardDragOver($event, 'tasks')"
            @drop="handleCardDrop($event, 'tasks')"
          >
            <UCard
              class="relative z-10 transition-all duration-500 w-full flex flex-col"
              :class="{
                'blur-md opacity-50': taskListBlurred && restTransition === 'none'
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
          </div>

          <!-- Timer Card (when second) -->
          <div
            v-if="cardOrder === 'tasks-first'"
            ref="timerCardRef"
            class="relative z-[60] transition-all duration-1000 h-full flex"
            :class="{
              'ring-4 ring-primary': dragOverCardId === 'timer' && draggedCardId !== 'timer'
            }"
            @dragover="handleCardDragOver($event, 'timer')"
            @drop="handleCardDrop($event, 'timer')"
          >
            <UCard class="relative z-[60] transition-all duration-1000 w-full flex flex-col">
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
