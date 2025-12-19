<script setup lang="ts">
import { getVersion } from '~/utils/version'

const open = ref(false)
const { changelog } = useChangelog()

const version = computed(() => `v${getVersion()}`)

// Get latest 5 changelog entries for display
const recentChangelog = computed(() => changelog.slice(0, 5))

const tabs = [
  {
    label: 'Focus',
    icon: 'i-lucide-target',
    slot: 'focus' as const
  },
  {
    label: 'Privacy',
    icon: 'i-lucide-eye-off',
    slot: 'privacy' as const
  },
  {
    label: 'Security',
    icon: 'i-lucide-shield',
    slot: 'security' as const
  },
  {
    label: 'Tips',
    icon: 'i-lucide-lightbulb',
    slot: 'tips' as const
  },
  {
    label: 'Changelog',
    icon: 'i-lucide-history',
    slot: 'changelog' as const
  },
  {
    label: 'Disclaimer',
    icon: 'i-lucide-file-text',
    slot: 'disclaimer' as const
  }
]
</script>

<template>
  <UModal
    v-model:open="open"
    title="About Sphinx Focus"
    description="Focus. Rest. Limit distractions. Stay productive."
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <!-- Trigger: Logo text -->
    <button
      type="button"
      class="font-semibold text-lg hover:opacity-80 transition-opacity cursor-pointer"
    >
      Sphinx <span class="text-primary font-bold">Focus</span>
    </button>

    <template #header>
      <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-primary/10">
          <UIcon
            name="i-lucide-sparkles"
            class="size-6 text-primary"
          />
        </div>
        <div>
          <h2 class="text-lg font-semibold text-highlighted">
            About Sphinx Focus
          </h2>
          <p class="text-sm text-muted">
            Focus. Rest. Limit distractions. Stay productive.
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <UTabs
        :items="tabs"
        variant="link"
        color="primary"
        :ui="{
          list: 'overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0',
          trigger: 'flex-shrink-0 whitespace-nowrap'
        }"
        class="w-full"
      >
        <!-- Focus Tab -->
        <template #focus>
          <div class="space-y-3 pt-4">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-timer"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Pomodoro Timer
                </p>
                <p class="text-xs text-muted">
                  25-minute focus sessions with 5-minute breaks by default
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-sliders-horizontal"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Customizable
                </p>
                <p class="text-xs text-muted">
                  Set focus and rest durations from 1-99 minutes
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-eye-off"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Blur Mode
                </p>
                <p class="text-xs text-muted">
                  Hide distractions during focus sessions
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-list-checks"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Task Management
                </p>
                <p class="text-xs text-muted">
                  Organize tasks with drag-and-drop, auto-fade completed items
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-bell"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Notifications
                </p>
                <p class="text-xs text-muted">
                  Audio and browser alerts when sessions complete
                </p>
              </div>
            </div>
          </div>
        </template>

        <!-- Privacy Tab -->
        <template #privacy>
          <div class="space-y-3 pt-4">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-hard-drive"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  100% Local Storage
                </p>
                <p class="text-xs text-muted">
                  All data stays on your device, never sent anywhere
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-user-x"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  No Accounts
                </p>
                <p class="text-xs text-muted">
                  No sign-up, no email, no personal info required
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-scan-eye"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Zero Tracking
                </p>
                <p class="text-xs text-muted">
                  No analytics, no cookies, no fingerprinting
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-wifi-off"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Works Offline
                </p>
                <p class="text-xs text-muted">
                  Full functionality without internet connection
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-heart-handshake"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Free to Use
                </p>
                <p class="text-xs text-muted">
                  No ads, no subscriptions, no hidden costs
                </p>
              </div>
            </div>
          </div>
        </template>

        <!-- Security Tab -->
        <template #security>
          <div class="space-y-3 pt-4">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-lock-keyhole"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  PIN Protection
                </p>
                <p class="text-xs text-muted">
                  Lock your tasks with a 4-digit PIN
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-shield-check"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  AES-256 Encryption
                </p>
                <p class="text-xs text-muted">
                  Military-grade encryption for your task data
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-key-round"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Key Never Stored
                </p>
                <p class="text-xs text-muted">
                  In PIN mode, encryption key exists only in memory
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-zap"
                class="size-5 text-warning shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Quick Access Mode
                </p>
                <p class="text-xs text-muted">
                  Optional: skip PIN for convenience (still encrypted)
                </p>
              </div>
            </div>

            <div class="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p class="text-xs text-warning flex items-start gap-2">
                <UIcon
                  name="i-lucide-info"
                  class="size-4 shrink-0 mt-0.5"
                />
                <span>If you forget your PIN, data cannot be recovered. Use the security menu to change modes or clear data.</span>
              </p>
            </div>
          </div>
        </template>

        <!-- Tips Tab -->
        <template #tips>
          <div class="space-y-3 pt-4">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-play"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Start a Session
                </p>
                <p class="text-xs text-muted">
                  Click Start to begin. Timer continues even if you close the tab.
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-grip-vertical"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Reorder Tasks
                </p>
                <p class="text-xs text-muted">
                  Drag tasks to prioritize. Top uncompleted task shows in timer.
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-settings"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Customize Durations
                </p>
                <p class="text-xs text-muted">
                  Click the gear icon on the timer card to adjust times.
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-check-circle"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Complete Tasks
                </p>
                <p class="text-xs text-muted">
                  Check off tasks and they'll fade away automatically.
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-moon"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Dark Mode
                </p>
                <p class="text-xs text-muted">
                  Toggle theme with the sun/moon icon in the header.
                </p>
              </div>
            </div>
          </div>
        </template>

        <!-- Changelog Tab -->
        <template #changelog>
          <div class="space-y-4 pt-4 max-h-64 overflow-y-auto">
            <div
              v-for="entry in recentChangelog"
              :key="entry.version"
              class="border-b border-default pb-3 last:border-0"
            >
              <div class="flex items-center gap-2 mb-2">
                <span class="text-sm font-semibold text-primary">v{{ entry.version }}</span>
                <span class="text-xs text-muted">{{ entry.date }}</span>
              </div>
              <div class="space-y-1.5">
                <div
                  v-if="entry.changes.added?.length"
                  class="flex items-start gap-2"
                >
                  <UIcon
                    name="i-lucide-plus-circle"
                    class="size-3.5 text-success shrink-0 mt-0.5"
                  />
                  <ul class="text-xs text-muted space-y-0.5">
                    <li
                      v-for="(item, i) in entry.changes.added"
                      :key="i"
                    >
                      {{ item }}
                    </li>
                  </ul>
                </div>
                <div
                  v-if="entry.changes.changed?.length"
                  class="flex items-start gap-2"
                >
                  <UIcon
                    name="i-lucide-edit"
                    class="size-3.5 text-info shrink-0 mt-0.5"
                  />
                  <ul class="text-xs text-muted space-y-0.5">
                    <li
                      v-for="(item, i) in entry.changes.changed"
                      :key="i"
                    >
                      {{ item }}
                    </li>
                  </ul>
                </div>
                <div
                  v-if="entry.changes.fixed?.length"
                  class="flex items-start gap-2"
                >
                  <UIcon
                    name="i-lucide-wrench"
                    class="size-3.5 text-warning shrink-0 mt-0.5"
                  />
                  <ul class="text-xs text-muted space-y-0.5">
                    <li
                      v-for="(item, i) in entry.changes.fixed"
                      :key="i"
                    >
                      {{ item }}
                    </li>
                  </ul>
                </div>
                <div
                  v-if="entry.changes.removed?.length"
                  class="flex items-start gap-2"
                >
                  <UIcon
                    name="i-lucide-minus-circle"
                    class="size-3.5 text-error shrink-0 mt-0.5"
                  />
                  <ul class="text-xs text-muted space-y-0.5">
                    <li
                      v-for="(item, i) in entry.changes.removed"
                      :key="i"
                    >
                      {{ item }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Disclaimer Tab -->
        <template #disclaimer>
          <div class="space-y-4 pt-4">
            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-alert-triangle"
                class="size-5 text-warning shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Experimental Application
                </p>
                <p class="text-xs text-muted">
                  Sphinx Focus is provided as-is for experimental and demonstration purposes
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-shield-alert"
                class="size-5 text-warning shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  No Warranties or Liability
                </p>
                <p class="text-xs text-muted">
                  The developer assumes no responsibility for data loss, damages, or issues arising from use
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-user-check"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  User Responsibility
                </p>
                <p class="text-xs text-muted">
                  You assume full responsibility for using this application and protecting your data
                </p>
              </div>
            </div>

            <div class="flex items-start gap-3">
              <UIcon
                name="i-lucide-hard-drive"
                class="size-5 text-primary shrink-0 mt-0.5"
              />
              <div>
                <p class="text-sm font-medium text-default">
                  Local Storage Only
                </p>
                <p class="text-xs text-muted">
                  All data is stored locally. The developer is not responsible for data loss or corruption
                </p>
              </div>
            </div>

            <div class="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p class="text-xs text-warning flex items-start gap-2">
                <UIcon
                  name="i-lucide-info"
                  class="size-4 shrink-0 mt-0.5"
                />
                <span>By using this application, you acknowledge that you have read, understood, and agree to the full disclaimer.</span>
              </p>
            </div>

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
      </UTabs>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full text-xs text-muted">
        <span>{{ version }}</span>
        <a
          href="https://github.com/Nostromo-618/Sphinx-Focus"
          target="_blank"
          class="flex items-center gap-1 hover:text-primary transition-colors"
        >
          <UIcon
            name="i-simple-icons-github"
            class="size-4"
          />
          <span>View on GitHub</span>
        </a>
      </div>
    </template>
  </UModal>
</template>
