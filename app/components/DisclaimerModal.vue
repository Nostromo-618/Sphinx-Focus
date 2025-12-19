<script setup lang="ts">
const emit = defineEmits<{
  accept: []
  decline: []
}>()

function handleAccept() {
  emit('accept')
}

function handleDecline() {
  emit('decline')
}
</script>

<template>
  <UModal
    :open="true"
    :close="false"
    :dismissible="false"
    title="Disclaimer & Terms of Use"
    description="Please read and accept the disclaimer to continue"
    :ui="{ content: 'sm:max-w-2xl z-[101]', overlay: 'z-[100]' }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-warning/10">
          <UIcon
            name="i-lucide-alert-triangle"
            class="size-6 text-warning"
          />
        </div>
        <div>
          <h2 class="text-lg font-semibold text-highlighted">
            Disclaimer & Terms of Use
          </h2>
          <p class="text-sm text-muted">
            Please read and accept the disclaimer to continue
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <!-- Scrollable Disclaimer Content -->
        <div class="max-h-96 overflow-y-auto pr-2 space-y-4 text-sm text-default">
          <div>
            <h3 class="font-semibold text-highlighted mb-2">
              Important Notice
            </h3>
            <p class="text-muted">
              Sphinx Focus is provided as an experimental, demonstration application for exploratory and educational purposes. By using this application, you acknowledge and agree to the following terms:
            </p>
          </div>

          <div>
            <h3 class="font-semibold text-highlighted mb-2">
              No Warranties
            </h3>
            <p class="text-muted">
              This software is provided "AS IS" and "AS AVAILABLE" without any warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy, reliability, or completeness of the application.
            </p>
          </div>

          <div>
            <h3 class="font-semibold text-highlighted mb-2">
              No Liability
            </h3>
            <p class="text-muted">
              The developer(s) of Sphinx Focus shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of data or information, loss of productivity or time, business interruption, personal injury or property damage, or any other damages arising from the use or inability to use this application.
            </p>
          </div>

          <div>
            <h3 class="font-semibold text-highlighted mb-2">
              User Responsibility
            </h3>
            <p class="text-muted">
              You, as the user, assume full responsibility for the use of this application, any consequences resulting from such use, the security and backup of your data, and any decisions made based on information or features provided by this application.
            </p>
          </div>

          <div>
            <h3 class="font-semibold text-highlighted mb-2">
              Experimental Nature
            </h3>
            <p class="text-muted">
              This application is provided for experimental and exploratory purposes, demonstration of web technologies and UI components, and educational and learning purposes. The application may contain bugs, errors, or incomplete features. The developer(s) make no guarantees regarding functionality or performance, data persistence or reliability, security or privacy features, or continued availability or support.
            </p>
          </div>

          <div>
            <h3 class="font-semibold text-highlighted mb-2">
              Data Storage
            </h3>
            <p class="text-muted">
              All data is stored locally on your device using browser localStorage. The developer(s) are not responsible for data loss due to browser settings, updates, or clearing, data corruption or loss, inability to recover data if lost, or data synchronization across devices.
            </p>
          </div>

          <div>
            <h3 class="font-semibold text-highlighted mb-2">
              No Professional Advice
            </h3>
            <p class="text-muted">
              This application does not provide professional, medical, legal, or financial advice. Any information or features are for general informational purposes only and should not be relied upon as professional advice.
            </p>
          </div>

          <div>
            <h3 class="font-semibold text-highlighted mb-2">
              Acceptance
            </h3>
            <p class="text-muted">
              By using Sphinx Focus, you acknowledge that you have read, understood, and agree to be bound by this disclaimer. If you do not agree to these terms, you must not use this application.
            </p>
          </div>
        </div>

        <!-- Link to full disclaimer -->
        <div class="pt-2 border-t border-border">
          <a
            href="https://github.com/Nostromo-618/Sphinx-Focus/blob/main/DISCLAIMER.md"
            target="_blank"
            class="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <UIcon
              name="i-lucide-external-link"
              class="size-3"
            />
            <span>View full disclaimer on GitHub</span>
          </a>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-3 w-full">
        <UButton
          label="I Disagree"
          color="neutral"
          variant="outline"
          class="flex-1"
          @click="handleDecline"
        />
        <UButton
          label="I Agree"
          color="primary"
          class="flex-1"
          @click="handleAccept"
        />
      </div>
    </template>
  </UModal>
</template>

