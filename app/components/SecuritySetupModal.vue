<script setup lang="ts">
const emit = defineEmits<{
  complete: []
}>()

const { setupAutoMode, setupPINMode } = useSecuritySettings()

type Step = 'select' | 'pin-setup'

const currentStep = ref<Step>('select')
const pin = ref('')
const confirmPin = ref('')
const pinError = ref('')
const isLoading = ref(false)

const pinInputs = ref<HTMLInputElement[]>([])
const confirmPinInputs = ref<HTMLInputElement[]>([])

function handlePinInput(index: number, event: Event, isConfirm = false) {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/\D/g, '').slice(0, 1)
  input.value = value

  const targetRef = isConfirm ? confirmPin : pin
  const currentValue = targetRef.value.split('')
  currentValue[index] = value
  targetRef.value = currentValue.join('').slice(0, 4)

  // Auto-focus next input
  if (value && index < 3) {
    const inputs = isConfirm ? confirmPinInputs.value : pinInputs.value
    inputs[index + 1]?.focus()
  }

  pinError.value = ''
}

function handlePinKeydown(index: number, event: KeyboardEvent, isConfirm = false) {
  if (event.key === 'Backspace') {
    const targetRef = isConfirm ? confirmPin : pin
    const inputs = isConfirm ? confirmPinInputs.value : pinInputs.value

    if (!inputs[index]?.value && index > 0) {
      inputs[index - 1]?.focus()
      const currentValue = targetRef.value.split('')
      currentValue[index - 1] = ''
      targetRef.value = currentValue.join('')
    }
  }
}

async function selectAutoMode() {
  isLoading.value = true
  try {
    await setupAutoMode()
    emit('complete')
  } finally {
    isLoading.value = false
  }
}

function selectPINMode() {
  currentStep.value = 'pin-setup'
  // Focus first PIN input after transition
  nextTick(() => {
    pinInputs.value[0]?.focus()
  })
}

async function submitPIN() {
  // Validate PIN
  if (pin.value.length !== 4) {
    pinError.value = 'Please enter a 4-digit PIN'
    return
  }

  if (pin.value !== confirmPin.value) {
    pinError.value = 'PINs do not match'
    confirmPin.value = ''
    confirmPinInputs.value[0]?.focus()
    return
  }

  isLoading.value = true
  try {
    await setupPINMode(pin.value)
    emit('complete')
  } finally {
    isLoading.value = false
  }
}

function goBack() {
  currentStep.value = 'select'
  pin.value = ''
  confirmPin.value = ''
  pinError.value = ''
}
</script>

<template>
  <UModal
    :open="true"
    :close="false"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #header>
      <!-- Mode Selection Header -->
      <div
        v-if="currentStep === 'select'"
        class="text-center w-full"
      >
        <h2 class="text-xl font-semibold text-highlighted">
          Choose Your Security Level
        </h2>
        <p class="text-sm text-muted mt-1">
          How would you like to protect your tasks?
        </p>
      </div>

      <!-- PIN Setup Header -->
      <div
        v-else
        class="flex items-center gap-3 w-full"
      >
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="goBack"
        />
        <div>
          <h2 class="text-xl font-semibold text-highlighted">
            Create Your PIN
          </h2>
          <p class="text-sm text-muted">
            Enter a 4-digit PIN to secure your tasks
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <!-- Mode Selection Body -->
      <div
        v-if="currentStep === 'select'"
        class="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <!-- PIN Protected Option -->
        <button
          type="button"
          class="group relative p-6 rounded-xl border-2 border-border bg-default hover:border-primary hover:bg-elevated transition-all duration-200 text-left"
          :disabled="isLoading"
          @click="selectPINMode"
        >
          <div class="flex flex-col items-center text-center space-y-3">
            <div class="p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <UIcon
                name="i-lucide-shield-check"
                class="size-8"
              />
            </div>
            <div>
              <h3 class="font-semibold text-highlighted">
                Maximum Security
              </h3>
              <p class="text-sm text-muted mt-1">
                Protected by 4-digit PIN
              </p>
            </div>
            <ul class="text-xs text-muted space-y-1">
              <li class="flex items-center gap-1">
                <UIcon
                  name="i-lucide-check"
                  class="size-3 text-success"
                />
                Key never stored
              </li>
              <li class="flex items-center gap-1">
                <UIcon
                  name="i-lucide-check"
                  class="size-3 text-success"
                />
                Data unreadable without PIN
              </li>
            </ul>
          </div>
          <div class="absolute top-2 right-2">
            <span class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Recommended
            </span>
          </div>
        </button>

        <!-- Auto Key Option -->
        <button
          type="button"
          class="group p-6 rounded-xl border-2 border-border bg-default hover:border-warning hover:bg-elevated transition-all duration-200 text-left"
          :disabled="isLoading"
          @click="selectAutoMode"
        >
          <div class="flex flex-col items-center text-center space-y-3">
            <div class="p-3 rounded-full bg-warning/10 text-warning group-hover:bg-warning group-hover:text-white transition-colors">
              <UIcon
                name="i-lucide-zap"
                class="size-8"
              />
            </div>
            <div>
              <h3 class="font-semibold text-highlighted">
                Quick Access
              </h3>
              <p class="text-sm text-muted mt-1">
                No PIN required
              </p>
            </div>
            <ul class="text-xs text-muted space-y-1">
              <li class="flex items-center gap-1">
                <UIcon
                  name="i-lucide-check"
                  class="size-3 text-success"
                />
                Data still encrypted
              </li>
              <li class="flex items-center gap-1">
                <UIcon
                  name="i-lucide-info"
                  class="size-3 text-muted"
                />
                Key stored locally
              </li>
            </ul>
          </div>
        </button>
      </div>

      <!-- PIN Setup Body -->
      <div
        v-else
        class="space-y-6"
      >
        <!-- Enter PIN -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-default">Enter PIN</label>
          <div class="flex justify-center gap-3">
            <input
              v-for="i in 4"
              :key="`pin-${i}`"
              :ref="(el) => { if (el) pinInputs[i - 1] = el as HTMLInputElement }"
              type="password"
              inputmode="numeric"
              maxlength="1"
              class="w-14 h-14 text-center text-2xl font-bold rounded-lg border-2 border-border bg-default focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              :value="pin[i - 1] || ''"
              @input="handlePinInput(i - 1, $event)"
              @keydown="handlePinKeydown(i - 1, $event)"
            >
          </div>
        </div>

        <!-- Confirm PIN -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-default">Confirm PIN</label>
          <div class="flex justify-center gap-3">
            <input
              v-for="i in 4"
              :key="`confirm-${i}`"
              :ref="(el) => { if (el) confirmPinInputs[i - 1] = el as HTMLInputElement }"
              type="password"
              inputmode="numeric"
              maxlength="1"
              class="w-14 h-14 text-center text-2xl font-bold rounded-lg border-2 border-border bg-default focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              :value="confirmPin[i - 1] || ''"
              @input="handlePinInput(i - 1, $event, true)"
              @keydown="handlePinKeydown(i - 1, $event, true)"
            >
          </div>
        </div>

        <!-- Error Message -->
        <div
          v-if="pinError"
          class="text-center"
        >
          <p class="text-sm text-error">
            {{ pinError }}
          </p>
        </div>

        <!-- Submit Button -->
        <UButton
          label="Secure My Tasks"
          icon="i-lucide-lock"
          color="primary"
          size="lg"
          block
          :loading="isLoading"
          :disabled="pin.length !== 4 || confirmPin.length !== 4"
          @click="submitPIN"
        />

        <!-- Warning -->
        <div class="p-3 rounded-lg bg-warning/10 border border-warning/20">
          <p class="text-xs text-warning flex items-start gap-2">
            <UIcon
              name="i-lucide-alert-triangle"
              class="size-4 shrink-0 mt-0.5"
            />
            <span>
              <strong>Important:</strong> If you forget your PIN, you'll need to clear all data and start fresh. There's no recovery option.
            </span>
          </p>
        </div>
      </div>
    </template>
  </UModal>
</template>
