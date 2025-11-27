<script setup lang="ts">
const focusTimerRef = ref<{ 
  mode: 'focus' | 'rest', 
  state: 'idle' | 'running' | 'paused',
  timeRemaining: number,
  formattedTime: string
} | null>(null)
const taskListRef = ref<{ tasks: Array<{ id: string, text: string, completed: boolean, order: number }> } | null>(null)

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

  // Idle state - show mode without timer
  const modeLabel = timer.mode === 'focus' ? 'FOCUS' : 'REST'
  return modeLabel
})

useHead({
  title: documentTitle
})
</script>

<template>
  <div>
    <div class="container mx-auto px-4 py-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              {{ timerTitle }}
            </h3>
          </template>
          <FocusTimer ref="focusTimerRef" />
        </UCard>

        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              Task List
            </h3>
          </template>
          <TaskList ref="taskListRef" />
        </UCard>
      </div>
    </div>
  </div>
</template>
