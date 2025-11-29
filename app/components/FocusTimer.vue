<script setup lang="ts">
const FOCUS_DURATION_KEY = 'sphinx-focus-focus-duration'
const REST_DURATION_KEY = 'sphinx-focus-rest-duration'
const BLUR_MODE_KEY = 'sphinx-focus-blur-mode'

// Load settings from localStorage
function loadFocusDuration(): number {
  if (import.meta.server) return 25 * 60
  try {
    const stored = localStorage.getItem(FOCUS_DURATION_KEY)
    const value = stored ? parseInt(stored, 10) : 25
    const minutes = isNaN(value) || value < 1 || value > 99 ? 25 : value
    return minutes * 60
  } catch {
    return 25 * 60
  }
}

function loadRestDuration(): number {
  if (import.meta.server) return 5 * 60
  try {
    const stored = localStorage.getItem(REST_DURATION_KEY)
    const value = stored ? parseInt(stored, 10) : 5
    const minutes = isNaN(value) || value < 1 || value > 99 ? 5 : value
    return minutes * 60
  } catch {
    return 5 * 60
  }
}

function loadBlurMode(): boolean {
  if (import.meta.server) return true
  try {
    const stored = localStorage.getItem(BLUR_MODE_KEY)
    return stored !== null ? stored === 'true' : true // Default: enabled
  } catch {
    return true
  }
}

// Reactive durations that update when settings change
const focusDuration = ref(loadFocusDuration())
const restDuration = ref(loadRestDuration())
const blurModeEnabled = ref(loadBlurMode())

// Watch for settings changes in localStorage (from settings modal)
if (!import.meta.server) {
  const checkSettings = () => {
    const newFocusDuration = loadFocusDuration()
    const newRestDuration = loadRestDuration()
    const newBlurMode = loadBlurMode()

    // Blur mode can be updated immediately
    blurModeEnabled.value = newBlurMode

    // Durations only update if timer is idle (apply to next session)
    if (state.value === 'idle') {
      focusDuration.value = newFocusDuration
      restDuration.value = newRestDuration
      // Update time remaining if we're in the corresponding mode
      if (mode.value === 'focus') {
        timeRemaining.value = focusDuration.value
      } else if (mode.value === 'rest') {
        timeRemaining.value = restDuration.value
      }
    }
  }

  // Check for settings changes periodically
  const settingsCheckInterval = setInterval(() => {
    checkSettings()
  }, 500)

  // Also listen for storage events (when settings modal saves)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === FOCUS_DURATION_KEY || e.key === REST_DURATION_KEY || e.key === BLUR_MODE_KEY) {
      checkSettings()
    }
  }
  window.addEventListener('storage', handleStorageChange)

  onUnmounted(() => {
    clearInterval(settingsCheckInterval)
    window.removeEventListener('storage', handleStorageChange)
  })
}

type TimerMode = 'focus' | 'rest'
type TimerState = 'idle' | 'running' | 'paused'

const TIMER_STORAGE_KEY = 'sphinx-focus-timer'

interface StoredTimerState {
  mode: TimerMode
  state: TimerState
  timeRemaining: number
  lastUpdateTimestamp: number // Unix timestamp in milliseconds
}

const mode = ref<TimerMode>('focus')
const state = ref<TimerState>('idle')
const timeRemaining = ref(focusDuration.value)
const intervalId = ref<ReturnType<typeof setInterval> | null>(null)
const showCompletionBanner = ref(false)

const toast = useToast()
const { isUnlocked } = useSecuritySettings()

// Save timer state to localStorage
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
      localStorage.removeItem(TIMER_STORAGE_KEY)
      return
    }

    // Restore mode and state
    mode.value = timerState.mode
    state.value = timerState.state

    // If timer was running, calculate elapsed time
    if (timerState.state === 'running') {
      const now = Date.now()
      const elapsed = Math.floor((now - timerState.lastUpdateTimestamp) / 1000) // elapsed seconds
      const adjustedTimeRemaining = timerState.timeRemaining - elapsed

      if (adjustedTimeRemaining <= 0) {
        // Timer expired while page was closed - complete the session
        timeRemaining.value = 0
        completeSession()
        return
      } else {
        // Timer still has time - restore and resume
        timeRemaining.value = adjustedTimeRemaining
        state.value = 'running'
        // Start the interval again
        intervalId.value = setInterval(() => {
          if (timeRemaining.value > 0) {
            timeRemaining.value--
            saveTimerState() // Save every second
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
    localStorage.removeItem(TIMER_STORAGE_KEY)
  }
}

// Watch for state changes and save
watch([mode, state], () => {
  saveTimerState()
}, { immediate: false })

// Reset timer when data is cleared (isUnlocked becomes false)
watch(isUnlocked, (unlocked, wasUnlocked) => {
  // Only reset if transitioning from unlocked to locked (data cleared)
  // wasUnlocked will be undefined on first run, so we check if it was previously true
  if (wasUnlocked === true && !unlocked) {
    // Clear any running interval
    if (intervalId.value) {
      clearInterval(intervalId.value)
      intervalId.value = null
    }
    // Reset timer to default state
    mode.value = 'focus'
    state.value = 'idle'
    timeRemaining.value = focusDuration.value
    showCompletionBanner.value = false
  }
})

// Request notification permission on mount and load timer state
onMounted(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
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
  saveTimerState() // Save immediately when starting
  intervalId.value = setInterval(() => {
    if (timeRemaining.value > 0) {
      timeRemaining.value--
      saveTimerState() // Save every second
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
  saveTimerState() // Save when paused
}

function resetTimer() {
  pauseTimer()
  state.value = 'idle'
  timeRemaining.value = totalTime.value
  // Clear localStorage when reset to idle
  if (!import.meta.server) {
    localStorage.removeItem(TIMER_STORAGE_KEY)
  }
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
  saveTimerState() // Save when mode changes
}

function completeSession() {
  const completedMode = mode.value

  // Trigger notifications
  playNotificationSound()
  showBrowserNotification(completedMode)
  showToastNotification(completedMode)

  // Flash the completion banner briefly
  showCompletionBanner.value = true
  setTimeout(() => {
    showCompletionBanner.value = false
  }, 3000)

  switchMode()
}

function skipSession() {
  switchMode()
}

onUnmounted(() => {
  if (intervalId.value) {
    clearInterval(intervalId.value)
  }
})

// Expose state for parent component
defineExpose({
  mode,
  state,
  timeRemaining,
  formattedTime,
  blurModeEnabled
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
