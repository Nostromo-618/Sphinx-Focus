<script setup lang="ts">
const emit = defineEmits<{
  close: []
}>()

const FADE_DURATION_KEY = 'sphinx-focus-task-fade-duration'
const TASK_POSITION_KEY = 'sphinx-focus-task-position'

// Load current setting from localStorage
function loadFadeDuration(): number {
  if (import.meta.server) return 55
  try {
    const stored = localStorage.getItem(FADE_DURATION_KEY)
    const value = stored ? parseInt(stored, 10) : 55
    return isNaN(value) || value < 1 || value > 180 ? 55 : value
  } catch {
    return 55
  }
}

function loadTaskPosition(): 'bottom' | 'top' {
  if (import.meta.server) return 'bottom'
  try {
    const stored = localStorage.getItem(TASK_POSITION_KEY)
    return stored === 'top' ? 'top' : 'bottom'
  } catch {
    return 'bottom'
  }
}

const fadeDuration = ref(loadFadeDuration())
const fadeError = ref('')
const taskPosition = ref<'bottom' | 'top'>(loadTaskPosition())

const positionOptions = [
  { value: 'bottom', label: 'Bottom', description: 'New tasks appear at the end of the list' },
  { value: 'top', label: 'Top', description: 'New tasks appear at the beginning of the list' }
]

function validateFadeDuration() {
  const value = fadeDuration.value
  if (isNaN(value) || value < 1 || value > 180) {
    fadeError.value = 'Fade duration must be between 1 and 180 seconds'
    return false
  }
  fadeError.value = ''
  return true
}

function saveSettings() {
  if (!validateFadeDuration()) {
    return
  }

  if (import.meta.server) return

  try {
    localStorage.setItem(FADE_DURATION_KEY, fadeDuration.value.toString())
    localStorage.setItem(TASK_POSITION_KEY, taskPosition.value)

    // Trigger storage events so TaskList can pick up changes
    window.dispatchEvent(new StorageEvent('storage', {
      key: FADE_DURATION_KEY,
      newValue: fadeDuration.value.toString()
    }))
    window.dispatchEvent(new StorageEvent('storage', {
      key: TASK_POSITION_KEY,
      newValue: taskPosition.value
    }))

    emit('close')
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

function handleClose(open?: boolean) {
  // If called from @update:open event, open will be a boolean
  // If called directly from button click, open will be undefined
  if (open === undefined || !open) {
    emit('close')
  }
}

function handleCancel() {
  emit('close')
}
</script>

<template>
  <UModal
    :open="true"
    title="Task Settings"
    description="Configure how completed tasks fade away"
    :ui="{ content: 'sm:max-w-md z-[101]', overlay: 'z-[100]' }"
    @update:open="handleClose"
  >
    <template #body>
      <div class="space-y-6">
        <!-- New Task Position -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-default">
            New Task Position
          </label>
          <URadioGroup
            v-model="taskPosition"
            :items="positionOptions"
            orientation="horizontal"
          />
          <p class="text-xs text-muted">
            Where new tasks appear in your list
          </p>
        </div>

        <!-- Fade Duration -->
        <div class="space-y-2">
          <label
            for="fade-duration"
            class="text-sm font-medium text-default"
          >
            Fade Duration (seconds)
          </label>
          <UInput
            id="fade-duration"
            v-model.number="fadeDuration"
            type="number"
            min="1"
            max="180"
            placeholder="55"
            :error="fadeError"
            @blur="validateFadeDuration"
          />
          <p
            v-if="fadeError"
            class="text-xs text-error"
          >
            {{ fadeError }}
          </p>
          <p class="text-xs text-muted">
            How long completed tasks stay visible before fading away (1-180 seconds)
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 pt-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            class="flex-1"
            @click="handleCancel"
          />
          <UButton
            label="Save"
            color="primary"
            class="flex-1"
            @click="saveSettings"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
