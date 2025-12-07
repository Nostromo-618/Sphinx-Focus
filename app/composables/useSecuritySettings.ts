/**
 * Security settings composable
 * Manages encryption mode, session keys, and security state
 */

import type { EncryptedSettings } from './useEncryptedSettings'

export type SecurityMode = 'pin' | 'auto' | 'none'

interface SecurityConfig {
  mode: SecurityMode
  salt?: string // Base64 encoded salt for PIN mode
  autoKey?: string // Base64 encoded key for auto mode
  pinHash?: string // Hash to verify PIN (not the PIN itself)
}

// Old localStorage keys (for migration of settings that should be encrypted)
const OLD_ENCRYPTED_KEYS = {
  focusDuration: 'sphinx-focus-focus-duration',
  restDuration: 'sphinx-focus-rest-duration',
  blurMode: 'sphinx-focus-blur-mode',
  quickBlur: 'sphinx-focus-quick-blur',
  taskFadeDuration: 'sphinx-focus-task-fade-duration',
  taskPosition: 'sphinx-focus-task-position',
  tasks: 'sphinx-focus-tasks'
}

// Unencrypted storage keys (kept for performance/UX reasons)
const UNENCRYPTED_KEYS = {
  theme: 'sphinx-focus-theme',
  timer: 'sphinx-focus-timer'
}

const STORAGE_KEY = 'sphinx-focus-security'
const SETTINGS_ENCRYPTED_KEY = 'sphinx-focus-settings-encrypted'
const TASKS_ENCRYPTED_KEY = 'sphinx-focus-tasks-encrypted'
const _SESSION_KEY_SYMBOL = Symbol('sessionKey')

// In-memory session key (never persisted for PIN mode)
let sessionKey: CryptoKey | null = null

// Shared reactive state (module-level so all components share the same state)
const isInitialized = ref(false)
const isUnlocked = ref(false)
const currentMode = ref<SecurityMode>('none')

export function useSecuritySettings() {
  const { generateSalt, generateKey, deriveKeyFromPIN, exportKey, importKey, encrypt, decrypt, uint8ArrayToBase64, base64ToUint8Array } = useEncryption()

  /**
   * Load security configuration from localStorage
   */
  function loadConfig(): SecurityConfig | null {
    if (import.meta.server) return null

    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    try {
      return JSON.parse(stored) as SecurityConfig
    } catch {
      return null
    }
  }

  /**
   * Save security configuration to localStorage
   */
  function saveConfig(config: SecurityConfig): void {
    if (import.meta.server) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }

  /**
   * Check if this is the first run (no security configured)
   */
  function isFirstRun(): boolean {
    if (import.meta.server) return true
    return loadConfig() === null
  }

  /**
   * Check if there are old unencrypted settings that need migration
   */
  function hasOldSettings(): boolean {
    if (import.meta.server) return false

    return Object.values(OLD_ENCRYPTED_KEYS).some(key => localStorage.getItem(key) !== null)
  }

  /**
   * Migrate old unencrypted settings to new encrypted format
   * Note: Theme and timer state stay unencrypted (for UX/performance)
   */
  async function migrateOldSettings(): Promise<void> {
    if (import.meta.server) return
    if (!sessionKey) return
    if (!hasOldSettings()) return

    try {
      // Read old settings (only those that should be encrypted)
      const oldFocusDuration = localStorage.getItem(OLD_ENCRYPTED_KEYS.focusDuration)
      const oldRestDuration = localStorage.getItem(OLD_ENCRYPTED_KEYS.restDuration)
      const oldBlurMode = localStorage.getItem(OLD_ENCRYPTED_KEYS.blurMode)
      const oldQuickBlur = localStorage.getItem(OLD_ENCRYPTED_KEYS.quickBlur)
      const oldTaskFadeDuration = localStorage.getItem(OLD_ENCRYPTED_KEYS.taskFadeDuration)
      const oldTaskPosition = localStorage.getItem(OLD_ENCRYPTED_KEYS.taskPosition)

      // Build migrated settings (only encrypted settings)
      const migratedSettings: EncryptedSettings = {
        focusDuration: 25,
        restDuration: 5,
        blurMode: true,
        quickBlur: false,
        taskFadeDuration: 55,
        taskPosition: 'bottom'
      }

      // Parse old timer settings
      if (oldFocusDuration) {
        const value = parseInt(oldFocusDuration, 10)
        if (!isNaN(value) && value >= 1 && value <= 99) {
          migratedSettings.focusDuration = value
        }
      }
      if (oldRestDuration) {
        const value = parseInt(oldRestDuration, 10)
        if (!isNaN(value) && value >= 1 && value <= 99) {
          migratedSettings.restDuration = value
        }
      }
      if (oldBlurMode !== null) {
        migratedSettings.blurMode = oldBlurMode === 'true'
      }
      if (oldQuickBlur !== null) {
        migratedSettings.quickBlur = oldQuickBlur === 'true'
      }

      // Parse old task settings
      if (oldTaskFadeDuration) {
        const value = parseInt(oldTaskFadeDuration, 10)
        if (!isNaN(value) && value >= 1 && value <= 180) {
          migratedSettings.taskFadeDuration = value
        }
      }
      if (oldTaskPosition === 'top' || oldTaskPosition === 'bottom') {
        migratedSettings.taskPosition = oldTaskPosition
      }

      // Encrypt and save migrated settings
      const encrypted = await encrypt(JSON.stringify(migratedSettings), sessionKey)
      localStorage.setItem(SETTINGS_ENCRYPTED_KEY, encrypted)

      // Remove old encrypted keys after successful migration
      // Note: Theme and timer stay as they're unencrypted by design
      Object.values(OLD_ENCRYPTED_KEYS).forEach((key) => {
        localStorage.removeItem(key)
      })

      console.log('Successfully migrated old settings to encrypted format')
    } catch (error) {
      console.error('Failed to migrate old settings:', error)
      // Don't delete old keys if migration failed
    }
  }

  /**
   * Initialize security settings on app load
   */
  async function initialize(): Promise<void> {
    if (import.meta.server) return

    const config = loadConfig()

    if (!config) {
      // First run - needs setup
      isInitialized.value = false
      isUnlocked.value = false
      currentMode.value = 'none'
      return
    }

    currentMode.value = config.mode
    isInitialized.value = true

    if (config.mode === 'auto' && config.autoKey) {
      // Auto mode - load key immediately
      try {
        sessionKey = await importKey(config.autoKey)
        isUnlocked.value = true

        // Migrate old settings if they exist
        await migrateOldSettings()
      } catch {
        // Key corrupted - reset
        clearAllData()
      }
    } else if (config.mode === 'pin') {
      // PIN mode - need to unlock
      isUnlocked.value = false
    }
  }

  /**
   * Migrate encrypted data (tasks and settings) from old key to new key
   */
  async function migrateEncryptedData(oldKey: CryptoKey, newKey: CryptoKey): Promise<void> {
    if (import.meta.server) return

    // Migrate encrypted tasks
    const encryptedTasks = localStorage.getItem(TASKS_ENCRYPTED_KEY)
    if (encryptedTasks) {
      try {
        const decrypted = await decrypt(encryptedTasks, oldKey)
        const reEncrypted = await encrypt(decrypted, newKey)
        localStorage.setItem(TASKS_ENCRYPTED_KEY, reEncrypted)
      } catch {
        // If decryption fails, leave it as is
      }
    }

    // Migrate encrypted settings
    const encryptedSettings = localStorage.getItem(SETTINGS_ENCRYPTED_KEY)
    if (encryptedSettings) {
      try {
        const decrypted = await decrypt(encryptedSettings, oldKey)
        const reEncrypted = await encrypt(decrypted, newKey)
        localStorage.setItem(SETTINGS_ENCRYPTED_KEY, reEncrypted)
      } catch {
        // If decryption fails, leave it as is
      }
    }
  }

  /**
   * Setup auto-key mode (simpler UX)
   */
  async function setupAutoMode(): Promise<void> {
    // Capture old key if we're changing modes (not first setup)
    const oldKey = sessionKey

    const key = await generateKey()
    const exportedKey = await exportKey(key)

    // Migrate encrypted data if we're changing modes
    if (oldKey) {
      await migrateEncryptedData(oldKey, key)
    }

    const config: SecurityConfig = {
      mode: 'auto',
      autoKey: exportedKey
    }

    saveConfig(config)
    sessionKey = key
    currentMode.value = 'auto'
    isInitialized.value = true
    isUnlocked.value = true

    // Migrate old unencrypted settings if they exist
    await migrateOldSettings()
  }

  /**
   * Setup PIN mode (most secure)
   */
  async function setupPINMode(pin: string): Promise<void> {
    // Capture old key if we're changing modes (not first setup)
    const oldKey = sessionKey

    const salt = generateSalt()
    const key = await deriveKeyFromPIN(pin, salt)

    // Migrate encrypted data if we're changing modes
    if (oldKey) {
      await migrateEncryptedData(oldKey, key)
    }

    // Create a verification hash (encrypt a known string)
    const verificationData = await encrypt('sphinx-focus-verified', key)

    const config: SecurityConfig = {
      mode: 'pin',
      salt: uint8ArrayToBase64(salt),
      pinHash: verificationData
    }

    saveConfig(config)
    sessionKey = key
    currentMode.value = 'pin'
    isInitialized.value = true
    isUnlocked.value = true

    // Migrate old unencrypted settings if they exist
    await migrateOldSettings()
  }

  /**
   * Unlock with PIN (for returning users)
   */
  async function unlockWithPIN(pin: string): Promise<boolean> {
    const config = loadConfig()
    if (!config || config.mode !== 'pin' || !config.salt || !config.pinHash) {
      return false
    }

    try {
      const salt = base64ToUint8Array(config.salt)
      const key = await deriveKeyFromPIN(pin, salt)

      // Verify by decrypting the verification hash
      const decrypted = await decrypt(config.pinHash, key)

      if (decrypted === 'sphinx-focus-verified') {
        sessionKey = key
        isUnlocked.value = true

        // Migrate old settings if they exist (edge case: user had old settings before PIN was set)
        await migrateOldSettings()

        return true
      }
    } catch {
      // Decryption failed - wrong PIN
    }

    return false
  }

  /**
   * Get the current session key (throws if not unlocked)
   */
  function getSessionKey(): CryptoKey {
    if (!sessionKey) {
      throw new Error('Security not unlocked. Please enter your PIN.')
    }
    return sessionKey
  }

  /**
   * Check if session key is available
   */
  function hasSessionKey(): boolean {
    return sessionKey !== null
  }

  /**
   * Clear ALL data and reset security (for "forgot PIN" flow or complete reset)
   * This removes absolutely everything from localStorage related to this app
   */
  function clearAllData(): void {
    if (import.meta.server) return

    // Clear security config
    localStorage.removeItem(STORAGE_KEY)

    // Clear encrypted data
    localStorage.removeItem(TASKS_ENCRYPTED_KEY)
    localStorage.removeItem(SETTINGS_ENCRYPTED_KEY)

    // Clear unencrypted data (timer state, theme)
    Object.values(UNENCRYPTED_KEYS).forEach((key) => {
      localStorage.removeItem(key)
    })

    // Clear any remaining old keys (in case migration was incomplete)
    Object.values(OLD_ENCRYPTED_KEYS).forEach((key) => {
      localStorage.removeItem(key)
    })

    // Reset state
    sessionKey = null
    isInitialized.value = false
    isUnlocked.value = false
    currentMode.value = 'none'
  }

  /**
   * Lock the app (clear session key, requires PIN re-entry)
   */
  function lock(): void {
    if (currentMode.value === 'pin') {
      sessionKey = null
      isUnlocked.value = false
    }
  }

  return {
    // State
    isInitialized: readonly(isInitialized),
    isUnlocked: readonly(isUnlocked),
    currentMode: readonly(currentMode),

    // Methods
    initialize,
    isFirstRun,
    setupAutoMode,
    setupPINMode,
    unlockWithPIN,
    getSessionKey,
    hasSessionKey,
    clearAllData,
    lock
  }
}
