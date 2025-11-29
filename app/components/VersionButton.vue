<script setup lang="ts">
import { useChangelog } from '~/composables/useChangelog'
import { getVersion } from '~/utils/version'

const { changelog } = useChangelog()
const open = ref(false)

const version = computed(() => {
  return `v${getVersion()}`
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const changeTypeLabels: Record<string, string> = {
  added: 'Added',
  fixed: 'Fixed',
  changed: 'Changed',
  removed: 'Removed',
  security: 'Security'
}

const changeTypeColors: Record<string, string> = {
  added: 'success',
  fixed: 'info',
  changed: 'warning',
  removed: 'error',
  security: 'error'
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Changelog"
    :ui="{ content: 'max-w-2xl' }"
  >
    <UButton
      :label="version"
      color="neutral"
      variant="ghost"
      size="sm"
      aria-label="View changelog"
    />

    <template #body>
      <div class="space-y-6">
        <div
          v-for="(entry, index) in changelog"
          :key="entry.version"
          class="relative"
        >
          <!-- Timeline line -->
          <div
            v-if="index < changelog.length - 1"
            class="absolute left-4 top-8 bottom-0 w-0.5 bg-border"
          />

          <!-- Timeline dot and content -->
          <div class="relative flex gap-4">
            <!-- Timeline dot -->
            <div class="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary ring-2 ring-default">
              <div class="h-2 w-2 rounded-full bg-default" />
            </div>

            <!-- Content -->
            <div class="flex-1 space-y-3 pb-6">
              <!-- Version header -->
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-semibold text-highlighted">
                  Version {{ entry.version }}
                </h3>
                <span class="text-sm text-muted">
                  {{ formatDate(entry.date) }}
                </span>
              </div>

              <!-- Changes by category -->
              <div class="space-y-2">
                <div
                  v-for="(items, type) in entry.changes"
                  :key="type"
                  class="space-y-1"
                >
                  <div
                    class="flex items-center gap-2 text-sm font-medium"
                    :class="{
                      'text-success': changeTypeColors[type] === 'success',
                      'text-info': changeTypeColors[type] === 'info',
                      'text-warning': changeTypeColors[type] === 'warning',
                      'text-error': changeTypeColors[type] === 'error'
                    }"
                  >
                    <UIcon
                      :name="
                        type === 'added'
                          ? 'i-lucide-plus-circle'
                          : type === 'fixed'
                            ? 'i-lucide-wrench'
                            : type === 'changed'
                              ? 'i-lucide-arrow-right-circle'
                              : type === 'removed'
                                ? 'i-lucide-minus-circle'
                                : 'i-lucide-shield-alert'
                      "
                      class="size-4"
                    />
                    {{ changeTypeLabels[type] }}
                  </div>
                  <ul class="ml-6 list-disc space-y-1 text-sm text-default">
                    <li
                      v-for="item in items"
                      :key="item"
                    >
                      {{ item }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
