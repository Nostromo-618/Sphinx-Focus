<script setup lang="ts">
type TimerMode = 'focus' | 'rest'
type TimerStateValue = 'idle' | 'running' | 'paused'

// Timer state is stored UNENCRYPTED for performance (updates every second)
const TIMER_STORAGE_KEY = 'sphinx-focus-timer'

interface StoredTimerState {
  mode: TimerMode
  state: TimerStateValue
  timeRemaining: number
  lastUpdateTimestamp: number
}

const toast = useToast()
const { isUnlocked } = useSecuritySettings()
const { settings, isSettingsLoaded } = useEncryptedSettings()

// Timer state
const mode = ref<TimerMode>('focus')
const state = ref<TimerStateValue>('idle')
const intervalId = ref<ReturnType<typeof setInterval> | null>(null)
const showCompletionBanner = ref(false)

// Derived durations from encrypted settings (in seconds)
const focusDuration = computed(() => settings.focusDuration * 60)
const restDuration = computed(() => settings.restDuration * 60)
const blurModeEnabled = computed(() => settings.blurMode)

// Time remaining - initialized to focus duration
const timeRemaining = ref(25 * 60) // Default, will be updated when settings load

// Save timer state to localStorage (unencrypted for performance)
function saveTimerState() {
  if (import.meta.server) return

  const timerState: StoredTimerState = {
    mode: mode.value,
    state: state.value,
    timeRemaining: timeRemaining.value,
    lastUpdateTimestamp: Date.now()
  }

  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerState))
  } catch (error) {
    console.error('Failed to save timer state:', error)
  }
}

// Clear timer state from localStorage
function clearTimerState() {
  if (import.meta.server) return
  localStorage.removeItem(TIMER_STORAGE_KEY)
}

// Load timer state from localStorage and resume if needed
function loadTimerState() {
  if (import.meta.server) return

  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY)
    if (!stored) return

    const timerState = JSON.parse(stored) as StoredTimerState

    // Validate stored data
    if (
      !timerState
      || typeof timerState.mode !== 'string'
      || typeof timerState.state !== 'string'
      || typeof timerState.timeRemaining !== 'number'
      || typeof timerState.lastUpdateTimestamp !== 'number'
    ) {
      // Invalid data - clear and start fresh
      clearTimerState()
      return
    }

    // Restore mode and state
    mode.value = timerState.mode
    state.value = timerState.state

    // If timer was running, calculate elapsed time
    if (timerState.state === 'running') {
      const now = Date.now()
      const elapsed = Math.floor((now - timerState.lastUpdateTimestamp) / 1000)
      const adjustedTimeRemaining = timerState.timeRemaining - elapsed

      if (adjustedTimeRemaining <= 0) {
        // Timer expired while page was closed - complete immediately without delays
        timeRemaining.value = 0
        completeSessionImmediate()
        return
      } else {
        // Timer still has time - restore and resume
        timeRemaining.value = adjustedTimeRemaining
        state.value = 'running'
        // Start the interval again
        intervalId.value = setInterval(() => {
          if (timeRemaining.value > 0) {
            timeRemaining.value--
            saveTimerState()
          } else {
            completeSession()
          }
        }, 1000)
      }
    } else {
      // Timer was paused or idle - just restore the time
      timeRemaining.value = timerState.timeRemaining
    }
  } catch (error) {
    // Corrupted data - clear and start fresh
    console.error('Failed to load timer state:', error)
    clearTimerState()
  }
}

// Watch for settings to load and update time remaining if no saved state
watch(isSettingsLoaded, (loaded) => {
  if (loaded) {
    // Only update time remaining if there's no saved timer state and timer is idle
    const stored = localStorage.getItem(TIMER_STORAGE_KEY)
    if (!stored && state.value === 'idle') {
      timeRemaining.value = focusDuration.value
    }
  }
}, { immediate: true })

// Watch for duration changes when timer is idle
watch([focusDuration, restDuration], ([newFocus, newRest]) => {
  if (state.value === 'idle') {
    // Update time remaining based on current mode
    if (mode.value === 'focus') {
      timeRemaining.value = newFocus
    } else {
      timeRemaining.value = newRest
    }
  }
})

// Watch for mode/state changes and save
watch([mode, state], () => {
  saveTimerState()
}, { immediate: false })

// Reset timer when data is cleared (isUnlocked becomes false)
watch(isUnlocked, (unlocked, wasUnlocked) => {
  if (wasUnlocked === true && !unlocked) {
    // Clear any running interval
    if (intervalId.value) {
      clearInterval(intervalId.value)
      intervalId.value = null
    }
    // Reset timer to default state
    mode.value = 'focus'
    state.value = 'idle'
    timeRemaining.value = 25 * 60 // Default focus duration
    showCompletionBanner.value = false
  }
})

// Request notification permission and load timer state on mount
onMounted(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
  // Load timer state (unencrypted, loads immediately without waiting for settings)
  loadTimerState()
})

// Play a gentle notification sound using Web Audio API
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch {
    // Audio not supported or blocked
  }
}

// Show browser notification
function showBrowserNotification(completedMode: TimerMode) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const title = completedMode === 'focus' ? 'Focus session complete!' : 'Break is over!'
    const body = completedMode === 'focus' ? 'Time for a break.' : 'Ready to focus again?'
    new Notification(title, { body, icon: '/favicon.ico' })
  }
}

// Show toast notification
function showToastNotification(completedMode: TimerMode) {
  const title = completedMode === 'focus' ? 'Focus session complete!' : 'Break is over!'
  const description = completedMode === 'focus' ? 'Great work! Time for a well-deserved break.' : 'Ready to focus again?'

  toast.add({
    title,
    description,
    icon: completedMode === 'focus' ? 'i-lucide-coffee' : 'i-lucide-zap',
    color: completedMode === 'focus' ? 'success' : 'primary'
  })
}

const totalTime = computed(() => {
  return mode.value === 'focus' ? focusDuration.value : restDuration.value
})

const progress = computed(() => {
  return ((totalTime.value - timeRemaining.value) / totalTime.value) * 100
})

const circumference = computed(() => {
  return 2 * Math.PI * 90 // radius = 90
})

const strokeDashoffset = computed(() => {
  return circumference.value - (progress.value / 100) * circumference.value
})

const formattedTime = computed(() => {
  const minutes = Math.floor(timeRemaining.value / 60)
  const seconds = timeRemaining.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const modeLabel = computed(() => {
  return mode.value === 'focus' ? 'Focus' : 'Rest'
})

function startTimer() {
  if (state.value === 'running') {
    pauseTimer()
    return
  }

  state.value = 'running'
  saveTimerState()
  intervalId.value = setInterval(() => {
    if (timeRemaining.value > 0) {
      timeRemaining.value--
      saveTimerState()
    } else {
      completeSession()
    }
  }, 1000)
}

function pauseTimer() {
  if (intervalId.value) {
    clearInterval(intervalId.value)
    intervalId.value = null
  }
  state.value = 'paused'
  saveTimerState()
}

function resetTimer() {
  pauseTimer()
  state.value = 'idle'
  timeRemaining.value = totalTime.value
  clearTimerState()
}

function switchMode() {
  pauseTimer()

  if (mode.value === 'focus') {
    mode.value = 'rest'
    timeRemaining.value = restDuration.value
  } else {
    mode.value = 'focus'
    timeRemaining.value = focusDuration.value
  }

  state.value = 'idle'
  saveTimerState()
}

function completeSessionImmediate() {
  // Immediate completion (used when timer expired during page reload)
  // No delays, no notifications - just switch modes
  const completedMode = mode.value

  if (completedMode === 'focus') {
    // Switch to rest mode immediately
    switchMode()
  } else {
    // Switch back to focus mode immediately
    switchMode()
  }
}

function completeSession() {
  // STOP the interval immediately to prevent repeated calls
  if (intervalId.value) {
    clearInterval(intervalId.value)
    intervalId.value = null
  }

  const completedMode = mode.value

  // Trigger notifications
  playNotificationSound()
  showBrowserNotification(completedMode)

  if (completedMode === 'focus') {
    // Focus session complete - show 5-second notification before entering rest mode
    toast.add({
      title: 'Focus session complete!',
      description: 'Rest mode starting in 5 seconds...',
      icon: 'i-lucide-coffee',
      color: 'success',
      duration: 5000
    })

    // Flash the completion banner
    showCompletionBanner.value = true

    // After 5 seconds, switch to rest mode and auto-start
    setTimeout(() => {
      showCompletionBanner.value = false
      switchMode()
      startTimer() // Auto-start rest mode
    }, 5000)
  } else {
    // Rest session complete - immediate switch back to focus
    showToastNotification(completedMode)
    showCompletionBanner.value = true
    setTimeout(() => {
      showCompletionBanner.value = false
    }, 3000)
    switchMode()
  }
}

function skipSession() {
  switchMode()
}

onUnmounted(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value)
  }
})

// Expose state and controls for parent component
defineExpose({
  mode,
  state,
  timeRemaining,
  formattedTime,
  blurModeEnabled,
  // Control methods for external use (e.g., RestModeOverlay)
  pauseTimer,
  startTimer,
  resetTimer,
  skipSession
})
</script>

<template>
  <div class="flex flex-col items-center justify-center p-6">
    <!-- Session Complete Banner -->
    <Transition name="fade">
      <div
        v-if="showCompletionBanner"
        class="absolute top-2 left-2 right-2 p-3 rounded-lg bg-primary/10 border border-primary text-center text-sm font-medium text-primary animate-pulse"
      >
        Session complete! 🎉
      </div>
    </Transition>

    <!-- Circular Progress Indicator -->
    <div class="relative mb-6">
      <svg
        class="transform -rotate-90"
        width="200"
        height="200"
      >
        <!-- Background circle -->
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="currentColor"
          stroke-width="8"
          class="text-border opacity-20"
        />
        <!-- Progress circle -->
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="currentColor"
          stroke-width="8"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="strokeDashoffset"
          class="text-primary transition-all duration-1000 ease-linear"
          stroke-linecap="round"
        />
      </svg>

      <!-- Time display in center -->
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <ClientOnly>
          <div
            data-testid="timer-display"
            class="text-4xl font-bold text-highlighted mb-1"
          >
            {{ formattedTime }}
          </div>
          <template #fallback>
            <div class="text-4xl font-bold text-highlighted mb-1">
              25:00
            </div>
          </template>
        </ClientOnly>
        <div
          data-testid="timer-mode"
          class="text-sm text-muted"
        >
          {{ modeLabel }}
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex gap-2">
      <UButton
        v-if="state === 'idle'"
        data-testid="timer-start"
        label="Start"
        icon="i-lucide-play"
        color="primary"
        @click="startTimer"
      />
      <UButton
        v-else-if="state === 'running'"
        data-testid="timer-pause"
        label="Pause"
        icon="i-lucide-pause"
        color="warning"
        @click="pauseTimer"
      />
      <UButton
        v-else-if="state === 'paused'"
        data-testid="timer-resume"
        label="Resume"
        icon="i-lucide-play"
        color="primary"
        @click="startTimer"
      />
      <UButton
        data-testid="timer-skip"
        label="Skip"
        icon="i-lucide-skip-forward"
        color="neutral"
        variant="outline"
        @click="skipSession"
      />
      <UButton
        data-testid="timer-reset"
        label="Reset"
        icon="i-lucide-rotate-ccw"
        color="neutral"
        variant="outline"
        :disabled="state === 'idle' && timeRemaining === totalTime"
        @click="resetTimer"
      />
    </div>
  </div>
</template>
