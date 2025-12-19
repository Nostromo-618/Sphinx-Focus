<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Sphinx Focus'
const description = 'A minimalist Pomodoro timer and task manager to help you stay focused and productive. Built with Nuxt UI.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description
})

// Security state
const { initialize, isInitialized: _isInitialized, isUnlocked, currentMode, isFirstRun, lock, clearAllData } = useSecuritySettings()

// Theme state
const { initialize: initializeTheme } = useThemeSettings()

// Disclaimer state
const DISCLAIMER_STORAGE_KEY = 'sphinx-focus-disclaimer-accepted'
const showDisclaimer = ref(false)
const showGoodbye = ref(false)
const showSetupModal = ref(false)
const showPINModal = ref(false)
const showClearConfirm = ref(false)
const appReady = ref(false)
const isSetupModalDismissible = ref(false)

function isDisclaimerAccepted(): boolean {
  if (import.meta.server) return false
  return localStorage.getItem(DISCLAIMER_STORAGE_KEY) === 'true'
}

function acceptDisclaimer(): void {
  if (import.meta.server) return
  localStorage.setItem(DISCLAIMER_STORAGE_KEY, 'true')
  showDisclaimer.value = false
  proceedToSecurityFlow()
}

function proceedToSecurityFlow(): void {
  // After disclaimer is accepted, proceed with security initialization
  initialize().then(() => {
    if (isFirstRun()) {
      // First time user - show security setup (non-dismissible)
      showSetupModal.value = true
      isSetupModalDismissible.value = false
    } else if (currentMode.value === 'pin' && !isUnlocked.value) {
      // Returning PIN user - need to unlock
      showPINModal.value = true
    } else {
      // Auto mode or already unlocked
      appReady.value = true
    }
  })
}

onMounted(async () => {
  // Initialize theme first (loads from localStorage)
  initializeTheme()

  // Check disclaimer acceptance first
  if (!isDisclaimerAccepted()) {
    // Show disclaimer modal (blocking)
    showDisclaimer.value = true
  } else {
    // Disclaimer already accepted - proceed to security flow
    await proceedToSecurityFlow()
  }
})

function handleSetupComplete() {
  showSetupModal.value = false
  isSetupModalDismissible.value = false
  // If we were changing mode, we might need to reload tasks
  // The security settings will have been updated, so tasks should reload automatically
  appReady.value = true
}

function handleUnlocked() {
  showPINModal.value = false
  appReady.value = true
}

function handleReset() {
  // User cleared data - show setup again (non-dismissible)
  showPINModal.value = false
  isSetupModalDismissible.value = false
  showSetupModal.value = true
}

function handleLock() {
  lock()
  showPINModal.value = true
  appReady.value = false
}

function handleChangeMode() {
  // Show setup modal to change mode (dismissible)
  isSetupModalDismissible.value = true
  showSetupModal.value = true
}

function handleSetupCancel() {
  // User cancelled changing mode - just close the modal
  showSetupModal.value = false
  isSetupModalDismissible.value = false
}

function handleClearData() {
  showClearConfirm.value = true
}

function confirmClearData() {
  clearAllData()
  showClearConfirm.value = false
  isSetupModalDismissible.value = false
  showSetupModal.value = true
  appReady.value = false
}

function cancelClearData() {
  showClearConfirm.value = false
}

function handleDisclaimerAccept() {
  acceptDisclaimer()
}

function handleDisclaimerDecline() {
  showDisclaimer.value = false
  showGoodbye.value = true
}

function handleReconsider() {
  showGoodbye.value = false
  showDisclaimer.value = true
}
</script>

<template>
  <UApp>
    <!-- Disclaimer Modal (First Visit) -->
    <DisclaimerModal
      v-if="showDisclaimer"
      @accept="handleDisclaimerAccept"
      @decline="handleDisclaimerDecline"
    />

    <!-- Goodbye State (User Declined Disclaimer) -->
    <div
      v-if="showGoodbye"
      class="absolute inset-0 min-h-screen flex items-center justify-center bg-background"
    >
      <div class="container mx-auto px-4 max-w-md">
        <div class="text-center space-y-6">
          <div class="flex justify-center">
            <div class="p-4 rounded-full bg-muted">
              <UIcon
                name="i-lucide-hand-wave"
                class="size-12 text-muted"
              />
            </div>
          </div>
          <div class="space-y-2">
            <h1 class="text-2xl font-semibold text-highlighted">
              Thank You for Your Interest
            </h1>
            <p class="text-muted">
              We understand that you prefer not to proceed. To use Sphinx Focus, you must accept the disclaimer and terms of use.
            </p>
          </div>
          <div class="pt-4">
            <UButton
              label="Reconsider"
              color="primary"
              size="lg"
              block
              @click="handleReconsider"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Security Setup Modal (First Run or Change Mode) -->
    <SecuritySetupModal
      v-if="showSetupModal"
      :dismissible="isSetupModalDismissible"
      @complete="handleSetupComplete"
      @cancel="handleSetupCancel"
    />

    <!-- PIN Entry Modal (Returning PIN Users) -->
    <PINEntryModal
      v-if="showPINModal"
      @unlocked="handleUnlocked"
      @reset="handleReset"
    />

    <!-- Clear Data Confirmation Modal -->
    <UModal
      v-model:open="showClearConfirm"
      title="Clear All Data?"
      :ui="{ overlay: 'z-[100]', content: 'z-[101]' }"
    >
      <template #body>
        <div class="space-y-4">
          <div class="flex items-center gap-3 p-3 rounded-lg bg-error/10 border border-error/20">
            <UIcon
              name="i-lucide-alert-triangle"
              class="size-6 text-error shrink-0"
            />
            <p class="text-sm text-error">
              This will permanently delete all your tasks and reset security settings. This action cannot be undone.
            </p>
          </div>

          <div class="flex gap-3">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              class="flex-1"
              @click="cancelClearData"
            />
            <UButton
              label="Clear Everything"
              color="error"
              class="flex-1"
              @click="confirmClearData"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Main App Content -->
    <UHeader
      v-if="appReady"
      mode="drawer"
      :menu="{ side: 'right', overlay: false }"
      :ui="{ toggle: 'sm:hidden' }"
    >
      <template #left>
        <AboutModal />
      </template>

      <template #right>
        <div class="hidden sm:flex items-center gap-1.5">
          <ThemePickerModal />

          <ColorModeButton />

          <SecurityButton
            @lock="handleLock"
            @change-mode="handleChangeMode"
            @clear-data="handleClearData"
          />

          <UButton
            to="https://github.com/Nostromo-618/Sphinx-Focus"
            target="_blank"
            icon="i-simple-icons-github"
            aria-label="GitHub"
            color="neutral"
            variant="ghost"
          />
        </div>
      </template>

      <template #body>
        <div class="flex flex-col gap-2">
          <ThemePickerModal />

          <ColorModeButton />

          <SecurityButton
            @lock="handleLock"
            @change-mode="handleChangeMode"
            @clear-data="handleClearData"
          />

          <UButton
            to="https://github.com/Nostromo-618/Sphinx-Focus"
            target="_blank"
            icon="i-simple-icons-github"
            aria-label="GitHub"
            color="neutral"
            variant="ghost"
          />
        </div>
      </template>
    </UHeader>

    <UMain>
      <div v-show="appReady">
        <NuxtPage />
      </div>
      <div
        v-if="!appReady && !showSetupModal && !showPINModal && !showDisclaimer && !showGoodbye"
        class="absolute inset-0 min-h-screen flex items-center justify-center bg-background"
      >
        <div class="flex flex-col items-center gap-4">
          <UIcon
            name="i-lucide-loader-2"
            class="size-8 text-primary animate-spin"
          />
          <p class="text-muted">
            Loading...
          </p>
        </div>
      </div>
    </UMain>
  </UApp>
</template>
