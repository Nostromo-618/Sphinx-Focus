<script setup lang="ts">
const focusTimerRef = ref<{
  mode: 'focus' | 'rest'
  state: 'idle' | 'running' | 'paused'
  timeRemaining: number
  formattedTime: string
  blurModeEnabled: boolean
} | null>(null)
const taskListRef = ref<{ tasks: Array<{ id: string, text: string, completed: boolean, order: number }> } | null>(null)
const showSettingsModal = ref(false)
const showTaskSettingsModal = ref(false)

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

// Computed blur state: active when focus mode is running and blur mode is enabled
const isBlurred = computed(() => {
  const timer = focusTimerRef.value
  if (!timer) return false
  return timer.mode === 'focus' && timer.state === 'running' && timer.blurModeEnabled
})
</script>

<template>
  <div class="relative">
    <div class="container mx-auto px-4 py-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        <UCard
          class="relative z-[60] transition-all duration-300"
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
                icon="i-lucide-settings"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Timer Settings"
                @click="showSettingsModal = true"
              />
            </div>
          </template>
          <FocusTimer ref="focusTimerRef" />
        </UCard>

        <UCard
          class="relative z-10 transition-all duration-300"
          :class="{
            'blur-md opacity-50': isBlurred
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

    <!-- Blur overlay backdrop -->
    <Transition name="fade">
      <div
        v-if="isBlurred"
        class="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 pointer-events-none"
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
