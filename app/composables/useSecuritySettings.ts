/**
 * Security settings composable
 * Manages encryption mode, session keys, and security state
 */

export type SecurityMode = 'pin' | 'auto' | 'none'

interface SecurityConfig {
  mode: SecurityMode
  salt?: string // Base64 encoded salt for PIN mode
  autoKey?: string // Base64 encoded key for auto mode
  pinHash?: string // Hash to verify PIN (not the PIN itself)
}

const STORAGE_KEY = 'sphinx-focus-security'
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
   * Setup auto-key mode (simpler UX)
   */
  async function setupAutoMode(): Promise<void> {
    const key = await generateKey()
    const exportedKey = await exportKey(key)

    const config: SecurityConfig = {
      mode: 'auto',
      autoKey: exportedKey
    }

    saveConfig(config)
    sessionKey = key
    currentMode.value = 'auto'
    isInitialized.value = true
    isUnlocked.value = true
  }

  /**
   * Setup PIN mode (most secure)
   */
  async function setupPINMode(pin: string): Promise<void> {
    const salt = generateSalt()
    const key = await deriveKeyFromPIN(pin, salt)

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
   * Clear all data and reset security (for "forgot PIN" flow)
   */
  function clearAllData(): void {
    if (import.meta.server) return

    // Clear security config
    localStorage.removeItem(STORAGE_KEY)

    // Clear encrypted tasks
    localStorage.removeItem('sphinx-focus-tasks')
    localStorage.removeItem('sphinx-focus-tasks-encrypted')

    // Clear timer state
    localStorage.removeItem('sphinx-focus-timer')

    // Clear timer settings
    localStorage.removeItem('sphinx-focus-focus-duration')
    localStorage.removeItem('sphinx-focus-rest-duration')
    localStorage.removeItem('sphinx-focus-blur-mode')

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
