/**
 * Encrypted settings composable
 * Manages app settings with encryption - single encrypted localStorage entry
 *
 * Note: Timer state and theme colors are stored UNENCRYPTED for performance/UX:
 * - Timer state: Updates every second, encryption would be CPU intensive
 * - Theme colors: Needed before unlock to style the PIN entry screen
 */

export interface EncryptedSettings {
  // Timer settings
  focusDuration: number // minutes
  restDuration: number // minutes
  blurMode: boolean
  quickBlur: boolean
  // Task settings
  taskFadeDuration: number // seconds
  taskPosition: 'top' | 'bottom'
}

const STORAGE_KEY = 'sphinx-focus-settings-encrypted'

// Default settings
const DEFAULT_SETTINGS: EncryptedSettings = {
  focusDuration: 25,
  restDuration: 5,
  blurMode: true,
  quickBlur: true, // Default to blurred when auto-blur is active
  taskFadeDuration: 55,
  taskPosition: 'bottom'
}

// Shared reactive state (module-level so all components share the same state)
const settings = reactive<EncryptedSettings>({ ...DEFAULT_SETTINGS })
const isSettingsLoaded = ref(false)
const isSaving = ref(false)

// Debounce timer for saves
let saveTimeout: ReturnType<typeof setTimeout> | null = null

export function useEncryptedSettings() {
  const { encrypt, decrypt } = useEncryption()
  const { hasSessionKey, getSessionKey, isUnlocked } = useSecuritySettings()

  /**
   * Load and decrypt settings from localStorage
   */
  async function loadSettings(): Promise<void> {
    if (import.meta.server) return
    if (!hasSessionKey()) return

    try {
      const encrypted = localStorage.getItem(STORAGE_KEY)
      if (encrypted) {
        const key = getSessionKey()
        const decrypted = await decrypt(encrypted, key)
        const loadedSettings = JSON.parse(decrypted) as Partial<EncryptedSettings>

        // Merge with defaults to handle any missing fields (forward compatibility)
        Object.assign(settings, DEFAULT_SETTINGS, loadedSettings)
      } else {
        // No settings yet - use defaults
        Object.assign(settings, DEFAULT_SETTINGS)
      }
    } catch {
      // Decryption failed or data corrupted - use defaults
      Object.assign(settings, DEFAULT_SETTINGS)
    } finally {
      isSettingsLoaded.value = true
    }
  }

  /**
   * Encrypt and save settings to localStorage
   */
  async function saveSettings(): Promise<void> {
    if (import.meta.server) return
    if (!hasSessionKey()) return
    if (isSaving.value) return

    isSaving.value = true
    try {
      const key = getSessionKey()
      const encrypted = await encrypt(JSON.stringify(settings), key)
      localStorage.setItem(STORAGE_KEY, encrypted)
    } catch (error) {
      console.error('Failed to save encrypted settings:', error)
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Save settings with debounce to avoid excessive writes
   */
  function saveSettingsDebounced(): void {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    saveTimeout = setTimeout(() => {
      saveSettings()
    }, 100)
  }

  /**
   * Update a single setting
   */
  function updateSetting<K extends keyof EncryptedSettings>(
    key: K,
    value: EncryptedSettings[K]
  ): void {
    settings[key] = value
    saveSettingsDebounced()
  }

  /**
   * Update multiple settings at once
   */
  function updateSettings(updates: Partial<EncryptedSettings>): void {
    Object.assign(settings, updates)
    saveSettingsDebounced()
  }

  /**
   * Reset all settings to defaults
   */
  function resetToDefaults(): void {
    Object.assign(settings, DEFAULT_SETTINGS)
    saveSettingsDebounced()
  }

  /**
   * Clear settings (for data reset)
   */
  function clearSettings(): void {
    if (import.meta.server) return
    localStorage.removeItem(STORAGE_KEY)
    Object.assign(settings, DEFAULT_SETTINGS)
    isSettingsLoaded.value = false
  }

  /**
   * Get the storage key (for migration purposes)
   */
  function getStorageKey(): string {
    return STORAGE_KEY
  }

  // Watch for unlock state changes
  watch(isUnlocked, async (unlocked) => {
    if (unlocked && !isSettingsLoaded.value) {
      await loadSettings()
    } else if (!unlocked) {
      // Reset to defaults when locked/cleared
      Object.assign(settings, DEFAULT_SETTINGS)
      isSettingsLoaded.value = false
    }
  }, { immediate: true })

  return {
    // State
    settings: readonly(settings) as Readonly<EncryptedSettings>,
    isSettingsLoaded: readonly(isSettingsLoaded),

    // Methods
    loadSettings,
    saveSettings,
    saveSettingsDebounced,
    updateSetting,
    updateSettings,
    resetToDefaults,
    clearSettings,
    getStorageKey,

    // Constants
    DEFAULT_SETTINGS
  }
}
