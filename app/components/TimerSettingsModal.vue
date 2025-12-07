<script setup lang="ts">
const emit = defineEmits<{
  close: []
}>()

const { settings, updateSettings, isSettingsLoaded } = useEncryptedSettings()

// Local form state - initialized from encrypted settings
const focusDuration = ref(25)
const restDuration = ref(5)
const blurMode = ref(true)

const focusError = ref('')
const restError = ref('')

// Load current settings when they become available
watch(isSettingsLoaded, (loaded) => {
  if (loaded) {
    focusDuration.value = settings.focusDuration
    restDuration.value = settings.restDuration
    blurMode.value = settings.blurMode
  }
}, { immediate: true })

function validateFocusDuration() {
  const value = focusDuration.value
  if (isNaN(value) || value < 1 || value > 99) {
    focusError.value = 'Focus duration must be between 1 and 99 minutes'
    return false
  }
  focusError.value = ''
  return true
}

function validateRestDuration() {
  const value = restDuration.value
  if (isNaN(value) || value < 1 || value > 99) {
    restError.value = 'Rest duration must be between 1 and 99 minutes'
    return false
  }
  restError.value = ''
  return true
}

function saveSettings() {
  if (!validateFocusDuration() || !validateRestDuration()) {
    return
  }

  // Update all settings at once
  updateSettings({
    focusDuration: focusDuration.value,
    restDuration: restDuration.value,
    blurMode: blurMode.value
  })

  emit('close')
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
    title="Timer Settings"
    description="Configure your focus and rest durations"
    :ui="{ content: 'sm:max-w-md z-[101]', overlay: 'z-[100]' }"
    @update:open="handleClose"
  >
    <template #body>
      <div class="space-y-6">
        <!-- Focus Duration -->
        <div class="space-y-2">
          <label
            for="focus-duration"
            class="text-sm font-medium text-default"
          >
            Focus Duration (minutes)
          </label>
          <UInput
            id="focus-duration"
            v-model.number="focusDuration"
            type="number"
            min="1"
            max="99"
            placeholder="25"
            :error="focusError"
            @blur="validateFocusDuration"
          />
          <p
            v-if="focusError"
            class="text-xs text-error"
          >
            {{ focusError }}
          </p>
        </div>

        <!-- Rest Duration -->
        <div class="space-y-2">
          <label
            for="rest-duration"
            class="text-sm font-medium text-default"
          >
            Rest Duration (minutes)
          </label>
          <UInput
            id="rest-duration"
            v-model.number="restDuration"
            type="number"
            min="1"
            max="99"
            placeholder="5"
            :error="restError"
            @blur="validateRestDuration"
          />
          <p
            v-if="restError"
            class="text-xs text-error"
          >
            {{ restError }}
          </p>
        </div>

        <!-- Blur Mode Toggle -->
        <div class="flex items-center justify-between p-4 rounded-lg border border-border bg-default">
          <div class="flex-1">
            <label
              for="blur-mode"
              class="text-sm font-medium text-default block mb-1"
            >
              Blur Mode
            </label>
            <p class="text-xs text-muted">
              Blur the task list during focus sessions to minimize distractions
            </p>
          </div>
          <USwitch
            id="blur-mode"
            v-model="blurMode"
            color="primary"
          />
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
