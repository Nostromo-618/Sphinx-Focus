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

// Rest mode stage management
// Stage 0: Normal mode (no rest)
// Stage 1: Initial rest - blur TaskList only, keep FocusTimer visible
// Stage 2: Immersive centered rest mode with animated gradient
const restStage = ref<0 | 1 | 2>(0)
const stageTransitionTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
const isExiting = ref(false) // Track if we're in the exit phase

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
  return timer.mode === 'focus' && timer.state === 'running' && blurModeEnabled.value && taskListBlurred.value
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
  const isFocusBlur = timer.mode === 'focus' && timer.state === 'running' && taskListBlurred.value
  // Rest mode stage 1: only blur if blur mode is enabled
  const isRestStage1Blur = timer.mode === 'rest' && timer.state === 'running' && restStage.value === 1 && blurModeEnabled.value
  return isFocusBlur || isRestStage1Blur
})

// Watch for rest mode changes to manage stages
watch(isRestMode, (isRest, wasRest) => {
  // Clear any pending transition
  if (stageTransitionTimeout.value) {
    clearTimeout(stageTransitionTimeout.value)
    stageTransitionTimeout.value = null
  }

  if (isRest && !wasRest) {
    // Entering rest mode - start at stage 1
    isExiting.value = false
    restStage.value = 1

    // After 3 seconds, transition to stage 2 (immersive)
    stageTransitionTimeout.value = setTimeout(() => {
      if (isRestMode.value) {
        restStage.value = 2
      }
    }, 3000)
  } else if (!isRest && wasRest) {
    // Exiting rest mode - gradual 3-second phase out
    isExiting.value = true

    if (restStage.value === 2) {
      // Phase 1: Fade away centered timer, return to stage 1 (1s)
      restStage.value = 1

      // Phase 2: After 1s, start unblurring (2s more)
      stageTransitionTimeout.value = setTimeout(() => {
        restStage.value = 0
        // Phase 3: After another 2s, fully exit
        setTimeout(() => {
          isExiting.value = false
        }, 2000)
      }, 1000)
    } else {
      // Already at stage 1, just fade out over 2s
      stageTransitionTimeout.value = setTimeout(() => {
        restStage.value = 0
        setTimeout(() => {
          isExiting.value = false
        }, 2000)
      }, 1000)
    }
  }
}, { immediate: true })

// Cleanup on unmount
onUnmounted(() => {
  if (stageTransitionTimeout.value) {
    clearTimeout(stageTransitionTimeout.value)
  }
})

// Timer control handlers for RestModeOverlay
function handleSkip() {
  focusTimerRef.value?.skipSession()
}

function handleReset() {
  focusTimerRef.value?.resetTimer()
}
</script>

<template>
  <div class="relative">
    <!-- Main content - hidden during stage 2 -->
    <Transition name="rest-content">
      <div
        v-show="restStage !== 2"
        class="container mx-auto px-4 py-6"
      >
        <div class="grid grid-cols-1 md:grid-cols-[1fr_1.618fr] gap-4 relative">
          <!-- Timer Card - stays unblurred in stage 1 -->
          <UCard
            class="relative z-[60] transition-all duration-1000"
          >
            <template #header>
              <div class="flex items-center justify-between w-full">
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

          <!-- Task List Card - blurred via quick toggle or during rest stage 1 (if blur mode enabled) -->
          <UCard
            class="relative z-10 transition-all duration-1000"
            :class="{
              'blur-md opacity-50': taskListBlurred && restStage === 0,
              'blur-xl opacity-20': restStage === 1 && blurModeEnabled
            }"
          >
            <template #header>
              <div class="flex items-center justify-between w-full">
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
      </div>
    </Transition>

    <!-- Blur overlay backdrop - only for focus mode blur -->
    <Transition name="fade">
      <div
        v-if="isBlurred && restStage === 0"
        class="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 pointer-events-none transition-all duration-500"
      />
    </Transition>

    <!-- Rest mode stage 1 overlay - subtle background dim, timer stays visible (only if blur mode enabled) -->
    <Transition name="rest-stage1">
      <div
        v-if="restStage === 1 && blurModeEnabled"
        class="fixed inset-0 bg-background/40 z-40 pointer-events-none transition-all"
        :class="{
          'duration-1000': !isExiting,
          'duration-2000': isExiting
        }"
      />
    </Transition>

    <!-- Stage 2: Immersive Rest Mode Overlay -->
    <Transition name="rest-overlay">
      <RestModeOverlay
        v-if="restStage === 2 && focusTimerRef"
        :formatted-time="focusTimerRef.formattedTime"
        :state="focusTimerRef.state"
        @skip="handleSkip"
        @reset="handleReset"
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
