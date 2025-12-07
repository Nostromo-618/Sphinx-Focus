<script setup lang="ts">
import { PRIMARY_COLORS, NEUTRAL_COLORS, type PrimaryColor, type NeutralColor } from '~/composables/useThemeSettings'

const { primaryColor, neutralColor, setPrimaryColor, setNeutralColor, resetTheme } = useThemeSettings()

// Color class mappings for swatches
const primaryColorClasses: Record<PrimaryColor, string> = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  yellow: 'bg-yellow-500',
  lime: 'bg-lime-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',
  cyan: 'bg-cyan-500',
  sky: 'bg-sky-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  purple: 'bg-purple-500',
  fuchsia: 'bg-fuchsia-500',
  pink: 'bg-pink-500',
  rose: 'bg-rose-500'
}

const neutralColorClasses: Record<NeutralColor, string> = {
  slate: 'bg-slate-500',
  gray: 'bg-gray-500',
  zinc: 'bg-zinc-500',
  neutral: 'bg-neutral-500',
  stone: 'bg-stone-500'
}

function handlePrimarySelect(color: PrimaryColor) {
  setPrimaryColor(color)
}

function handleNeutralSelect(color: NeutralColor) {
  setNeutralColor(color)
}

function handleReset() {
  resetTheme()
}
</script>

<template>
  <UPopover
    :content="{ side: 'bottom', align: 'end', sideOffset: 8 }"
    :ui="{ content: 'p-4 w-72' }"
  >
    <!-- Trigger: Swatch icon button -->
    <UButton
      icon="i-lucide-swatch-book"
      aria-label="Customize theme colors"
      color="neutral"
      variant="ghost"
      size="sm"
    />

    <template #content>
      <div class="space-y-4">
        <!-- Primary Color Section -->
        <div>
          <h3 class="text-xs font-medium text-muted mb-2">
            Primary
          </h3>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="color in PRIMARY_COLORS"
              :key="color.value"
              type="button"
              :aria-label="`Select ${color.label} as primary color`"
              :aria-pressed="primaryColor === color.value"
              class="size-5 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-default"
              :class="[
                primaryColorClasses[color.value],
                primaryColor === color.value
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-default scale-110'
                  : 'hover:scale-110'
              ]"
              @click="handlePrimarySelect(color.value)"
            />
          </div>
        </div>

        <!-- Neutral Color Section -->
        <div>
          <h3 class="text-xs font-medium text-muted mb-2">
            Neutral
          </h3>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="color in NEUTRAL_COLORS"
              :key="color.value"
              type="button"
              :aria-label="`Select ${color.label} as neutral color`"
              :aria-pressed="neutralColor === color.value"
              class="size-5 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-default"
              :class="[
                neutralColorClasses[color.value],
                neutralColor === color.value
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-default scale-110'
                  : 'hover:scale-110'
              ]"
              @click="handleNeutralSelect(color.value)"
            />
          </div>
        </div>

        <!-- Reset Button -->
        <div class="pt-2 border-t border-default">
          <UButton
            label="Reset to defaults"
            icon="i-lucide-rotate-ccw"
            color="neutral"
            variant="ghost"
            size="xs"
            class="w-full justify-center"
            @click="handleReset"
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>
