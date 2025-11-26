<script setup lang="ts">
const FOCUS_DURATION = 25 * 60 // 25 minutes in seconds
const REST_DURATION = 5 * 60 // 5 minutes in seconds

type TimerMode = 'focus' | 'rest'
type TimerState = 'idle' | 'running' | 'paused'

const mode = ref<TimerMode>('focus')
const state = ref<TimerState>('idle')
const timeRemaining = ref(FOCUS_DURATION)
const intervalId = ref<ReturnType<typeof setInterval> | null>(null)
const showCompletionBanner = ref(false)

const toast = useToast()

// Request notification permission on mount
onMounted(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
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
  return mode.value === 'focus' ? FOCUS_DURATION : REST_DURATION
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
  intervalId.value = setInterval(() => {
    if (timeRemaining.value > 0) {
      timeRemaining.value--
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
}

function resetTimer() {
  pauseTimer()
  state.value = 'idle'
  timeRemaining.value = totalTime.value
}

function switchMode() {
  pauseTimer()

  if (mode.value === 'focus') {
    mode.value = 'rest'
    timeRemaining.value = REST_DURATION
  } else {
    mode.value = 'focus'
    timeRemaining.value = FOCUS_DURATION
  }

  state.value = 'idle'
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
      <svg class="transform -rotate-90" width="200" height="200">
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
        <div class="text-4xl font-bold text-highlighted mb-1">
          {{ formattedTime }}
        </div>
        <div class="text-sm text-muted">
          {{ modeLabel }}
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="flex gap-2">
      <UButton
        v-if="state === 'idle'"
        label="Start"
        icon="i-lucide-play"
        @click="startTimer"
        color="primary"
      />
      <UButton
        v-else-if="state === 'running'"
        label="Pause"
        icon="i-lucide-pause"
        @click="pauseTimer"
        color="warning"
      />
      <UButton
        v-else-if="state === 'paused'"
        label="Resume"
        icon="i-lucide-play"
        @click="startTimer"
        color="primary"
      />
      <UButton
        v-if="state === 'running' || state === 'paused'"
        label="Skip"
        icon="i-lucide-skip-forward"
        @click="skipSession"
        color="neutral"
        variant="outline"
      />
      <UButton
        label="Reset"
        icon="i-lucide-rotate-ccw"
        @click="resetTimer"
        color="neutral"
        variant="outline"
        :disabled="state === 'idle' && timeRemaining === totalTime"
      />
    </div>
  </div>
</template>

