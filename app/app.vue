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

const showSetupModal = ref(false)
const showPINModal = ref(false)
const showClearConfirm = ref(false)
const appReady = ref(false)

onMounted(async () => {
  await initialize()

  if (isFirstRun()) {
    // First time user - show security setup
    showSetupModal.value = true
  } else if (currentMode.value === 'pin' && !isUnlocked.value) {
    // Returning PIN user - need to unlock
    showPINModal.value = true
  } else {
    // Auto mode or already unlocked
    appReady.value = true
  }
})

function handleSetupComplete() {
  showSetupModal.value = false
  // If we were changing mode, we might need to reload tasks
  // The security settings will have been updated, so tasks should reload automatically
  appReady.value = true
}

function handleUnlocked() {
  showPINModal.value = false
  appReady.value = true
}

function handleReset() {
  // User cleared data - show setup again
  showPINModal.value = false
  showSetupModal.value = true
}

function handleLock() {
  lock()
  showPINModal.value = true
  appReady.value = false
}

function handleChangeMode() {
  // Show setup modal to change mode
  showSetupModal.value = true
}

function handleClearData() {
  showClearConfirm.value = true
}

function confirmClearData() {
  clearAllData()
  showClearConfirm.value = false
  showSetupModal.value = true
  appReady.value = false
}

function cancelClearData() {
  showClearConfirm.value = false
}
</script>

<template>
  <UApp>
    <!-- Security Setup Modal (First Run) -->
    <SecuritySetupModal
      v-if="showSetupModal"
      @complete="handleSetupComplete"
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

    <!-- Main App Content (only shown when security is ready) -->
    <template v-if="appReady">
      <UHeader>
        <template #left>
          <NuxtLink
            to="/"
            class="font-semibold text-lg"
          >
            Sphinx Focus
          </NuxtLink>
        </template>

        <template #right>
          <VersionButton />

          <ColorModeButton />

          <SecurityButton
            @lock="handleLock"
            @change-mode="handleChangeMode"
            @clear-data="handleClearData"
          />

          <UButton
            to="https://github.com/Nostromo-618/sfocus.app"
            target="_blank"
            icon="i-simple-icons-github"
            aria-label="GitHub"
            color="neutral"
            variant="ghost"
          />
        </template>
      </UHeader>

      <UMain>
        <NuxtPage />
      </UMain>

      <USeparator icon="i-simple-icons-nuxtdotjs" />

      <UFooter>
        <template #left>
          <p class="text-sm text-muted">
            Sphinx Focus • © {{ new Date().getFullYear() }}
          </p>
        </template>
      </UFooter>
    </template>

    <!-- Loading state while checking security -->
    <div
      v-else-if="!showSetupModal && !showPINModal"
      class="min-h-screen flex items-center justify-center"
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
  </UApp>
</template>
