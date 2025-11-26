<script setup lang="ts">
const colorMode = useColorMode()

const modes = [
  { value: 'light', label: 'Light', icon: 'i-lucide-sun' },
  { value: 'dark', label: 'Dark', icon: 'i-lucide-moon' },
  { value: 'system', label: 'System', icon: 'i-lucide-monitor' }
] as const

const currentMode = computed(() => {
  return colorMode.preference || 'system'
})

const currentIcon = computed(() => {
  const mode = currentMode.value
  if (mode === 'system') {
    return 'i-lucide-monitor'
  }
  return mode === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'
})

const currentLabel = computed(() => {
  const mode = currentMode.value
  if (mode === 'system') {
    return 'System'
  }
  return mode === 'dark' ? 'Dark' : 'Light'
})

const dropdownItems = computed(() => {
  return modes.map(mode => ({
    label: mode.label,
    icon: mode.icon,
    type: 'checkbox' as const,
    checked: currentMode.value === mode.value,
    onSelect: (e: Event) => {
      e.preventDefault()
      colorMode.preference = mode.value
    }
  }))
})
</script>

<template>
  <UDropdownMenu
    :items="dropdownItems"
    :popper="{ placement: 'bottom-end' }"
  >
    <UButton
      :icon="currentIcon"
      :aria-label="`Current mode: ${currentLabel.toLowerCase()}. Click to change theme.`"
      color="neutral"
      variant="ghost"
      size="sm"
    />
  </UDropdownMenu>
</template>
