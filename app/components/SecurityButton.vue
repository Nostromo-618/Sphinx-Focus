<script setup lang="ts">
const emit = defineEmits<{
  lock: []
  changeMode: []
  clearData: []
}>()

const { currentMode, isUnlocked } = useSecuritySettings()

const currentIcon = computed(() => {
  if (currentMode.value === 'pin') {
    return 'i-lucide-shield-check'
  } else if (currentMode.value === 'auto') {
    return 'i-lucide-shield'
  }
  return 'i-lucide-shield'
})

const currentLabel = computed(() => {
  if (currentMode.value === 'pin') {
    return 'PIN Protected'
  } else if (currentMode.value === 'auto') {
    return 'Quick Access'
  }
  return 'Security Settings'
})

const dropdownItems = computed(() => {
  const items = []

  // Lock App (only for PIN mode when unlocked)
  if (currentMode.value === 'pin' && isUnlocked.value) {
    items.push({
      label: 'Lock App',
      icon: 'i-lucide-lock',
      onClick: () => emit('lock')
    })
  }

  // Change Security Mode
  items.push({
    label: 'Change Security Mode',
    icon: 'i-lucide-settings',
    onClick: () => emit('changeMode')
  })

  // Divider
  items.push({
    type: 'divider' as const
  })

  // Clear All Data
  items.push({
    label: 'Clear All Data',
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onClick: () => emit('clearData')
  })

  return items
})
</script>

<template>
  <UDropdownMenu
    :items="dropdownItems"
    :popper="{ placement: 'bottom-end' }"
  >
    <UButton
      :icon="currentIcon"
      :aria-label="`Security: ${currentLabel.toLowerCase()}. Click to manage security settings.`"
      color="neutral"
      variant="ghost"
      size="sm"
    />
  </UDropdownMenu>
</template>

