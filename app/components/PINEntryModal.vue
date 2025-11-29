<script setup lang="ts">
const emit = defineEmits<{
  unlocked: []
  reset: []
}>()

const { unlockWithPIN, clearAllData } = useSecuritySettings()

const pin = ref('')
const pinError = ref('')
const isLoading = ref(false)
const showResetConfirm = ref(false)
const attempts = ref(0)

const pinInputs = ref<HTMLInputElement[]>([])

function handlePinInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/\D/g, '').slice(0, 1)
  input.value = value

  const currentValue = pin.value.split('')
  currentValue[index] = value
  pin.value = currentValue.join('').slice(0, 4)

  // Auto-focus next input
  if (value && index < 3) {
    pinInputs.value[index + 1]?.focus()
  }

  // Auto-submit when all 4 digits entered
  if (pin.value.length === 4) {
    submitPIN()
  }

  pinError.value = ''
}

function handlePinKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace') {
    if (!pinInputs.value[index]?.value && index > 0) {
      pinInputs.value[index - 1]?.focus()
      const currentValue = pin.value.split('')
      currentValue[index - 1] = ''
      pin.value = currentValue.join('')
    }
  } else if (event.key === 'Enter' && pin.value.length === 4) {
    submitPIN()
  }
}

async function submitPIN() {
  if (pin.value.length !== 4 || isLoading.value) return

  isLoading.value = true
  pinError.value = ''

  try {
    const success = await unlockWithPIN(pin.value)

    if (success) {
      emit('unlocked')
    } else {
      attempts.value++
      pinError.value = 'Incorrect PIN. Please try again.'
      pin.value = ''

      // Clear inputs and focus first
      pinInputs.value.forEach((input) => {
        if (input) input.value = ''
      })
      pinInputs.value[0]?.focus()

      // Shake animation feedback
      const container = document.querySelector('.pin-container')
      container?.classList.add('shake')
      setTimeout(() => container?.classList.remove('shake'), 500)
    }
  } finally {
    isLoading.value = false
  }
}

function handleForgotPIN() {
  showResetConfirm.value = true
}

function confirmReset() {
  clearAllData()
  showResetConfirm.value = false
  emit('reset')
}

function cancelReset() {
  showResetConfirm.value = false
}

onMounted(() => {
  // Focus first input on mount
  nextTick(() => {
    pinInputs.value[0]?.focus()
  })
})
</script>

<template>
  <UModal
    :open="true"
    :close="false"
    :ui="{ content: 'sm:max-w-md z-[101]', overlay: 'z-[100]' }"
  >
    <template #header>
      <!-- Reset Confirmation Header -->
      <div
        v-if="showResetConfirm"
        class="text-center w-full"
      >
        <div class="mx-auto w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-3">
          <UIcon
            name="i-lucide-alert-triangle"
            class="size-6 text-error"
          />
        </div>
        <h2 class="text-xl font-semibold text-highlighted">
          Reset All Data?
        </h2>
      </div>

      <!-- PIN Entry Header -->
      <div
        v-else
        class="text-center w-full"
      >
        <div class="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <UIcon
            name="i-lucide-lock"
            class="size-6 text-primary"
          />
        </div>
        <h2 class="text-xl font-semibold text-highlighted">
          Welcome Back
        </h2>
        <p class="text-sm text-muted mt-1">
          Enter your PIN to unlock
        </p>
      </div>
    </template>

    <template #body>
      <!-- Reset Confirmation Body -->
      <div
        v-if="showResetConfirm"
        class="space-y-4"
      >
        <p class="text-sm text-muted text-center">
          This will permanently delete all your tasks and reset the app. This action cannot be undone.
        </p>

        <div class="flex gap-3">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            class="flex-1"
            @click="cancelReset"
          />
          <UButton
            label="Reset Everything"
            color="error"
            class="flex-1"
            @click="confirmReset"
          />
        </div>
      </div>

      <!-- PIN Entry Body -->
      <div
        v-else
        class="space-y-6"
      >
        <!-- PIN Input -->
        <div class="pin-container flex justify-center gap-3">
          <input
            v-for="i in 4"
            :key="`pin-${i}`"
            :ref="(el) => { if (el) pinInputs[i - 1] = el as HTMLInputElement }"
            :data-testid="`unlock-pin-input-${i - 1}`"
            type="password"
            inputmode="numeric"
            maxlength="1"
            class="w-14 h-14 text-center text-2xl font-bold rounded-lg border-2 border-border bg-default focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            :class="{ 'border-error': pinError }"
            :value="pin[i - 1] || ''"
            :disabled="isLoading"
            @input="handlePinInput(i - 1, $event)"
            @keydown="handlePinKeydown(i - 1, $event)"
          >
        </div>

        <!-- Error Message -->
        <div
          v-if="pinError"
          class="text-center"
        >
          <p class="text-sm text-error">
            {{ pinError }}
          </p>
          <p
            v-if="attempts >= 3"
            class="text-xs text-muted mt-1"
          >
            Too many attempts? Try the forgot PIN option below.
          </p>
        </div>

        <!-- Loading indicator -->
        <div
          v-if="isLoading"
          class="flex justify-center"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="size-6 text-primary animate-spin"
          />
        </div>

        <!-- Forgot PIN -->
        <div class="text-center pt-2">
          <button
            type="button"
            data-testid="forgot-pin-link"
            class="text-sm text-muted hover:text-primary transition-colors"
            @click="handleForgotPIN"
          >
            Forgot PIN?
          </button>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.shake {
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-10px); }
  40% { transform: translateX(10px); }
  60% { transform: translateX(-10px); }
  80% { transform: translateX(10px); }
}
</style>
