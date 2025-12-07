/**
 * Theme settings composable
 * Manages primary/neutral color preferences with localStorage persistence
 *
 * Note: Theme is stored UNENCRYPTED so colors are visible on the PIN entry screen
 */

export type PrimaryColor = 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green'
  | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo'
  | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose'

export type NeutralColor = 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone'

interface ThemeConfig {
  primary: PrimaryColor
  neutral: NeutralColor
}

const STORAGE_KEY = 'sphinx-focus-theme'

const DEFAULT_THEME: ThemeConfig = {
  primary: 'green',
  neutral: 'slate'
}

// Primary colors available for selection
export const PRIMARY_COLORS: { value: PrimaryColor, label: string }[] = [
  { value: 'red', label: 'Red' },
  { value: 'orange', label: 'Orange' },
  { value: 'amber', label: 'Amber' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'lime', label: 'Lime' },
  { value: 'green', label: 'Green' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'teal', label: 'Teal' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'sky', label: 'Sky' },
  { value: 'blue', label: 'Blue' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'violet', label: 'Violet' },
  { value: 'purple', label: 'Purple' },
  { value: 'fuchsia', label: 'Fuchsia' },
  { value: 'pink', label: 'Pink' },
  { value: 'rose', label: 'Rose' }
]

// Neutral colors available for selection
export const NEUTRAL_COLORS: { value: NeutralColor, label: string }[] = [
  { value: 'slate', label: 'Slate' },
  { value: 'gray', label: 'Gray' },
  { value: 'zinc', label: 'Zinc' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'stone', label: 'Stone' }
]

// Shared reactive state (module-level so all components share the same state)
const primaryColor = ref<PrimaryColor>(DEFAULT_THEME.primary)
const neutralColor = ref<NeutralColor>(DEFAULT_THEME.neutral)
const isInitialized = ref(false)

export function useThemeSettings() {
  const appConfig = useAppConfig()

  /**
   * Load theme configuration from localStorage
   */
  function loadConfig(): ThemeConfig | null {
    if (import.meta.server) return null

    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    try {
      return JSON.parse(stored) as ThemeConfig
    } catch {
      return null
    }
  }

  /**
   * Save theme configuration to localStorage
   */
  function saveConfig(config: ThemeConfig): void {
    if (import.meta.server) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }

  /**
   * Apply theme to Nuxt UI app config
   */
  function applyTheme(config: ThemeConfig): void {
    if (appConfig.ui?.colors) {
      appConfig.ui.colors.primary = config.primary
      appConfig.ui.colors.neutral = config.neutral
    }
  }

  /**
   * Initialize theme settings on app load
   */
  function initialize(): void {
    if (import.meta.server) return
    if (isInitialized.value) return

    const config = loadConfig()

    if (config) {
      primaryColor.value = config.primary
      neutralColor.value = config.neutral
      applyTheme(config)
    } else {
      // Apply defaults
      applyTheme(DEFAULT_THEME)
    }

    isInitialized.value = true
  }

  /**
   * Set primary color
   */
  function setPrimaryColor(color: PrimaryColor): void {
    primaryColor.value = color
    applyTheme({ primary: color, neutral: neutralColor.value })
    saveConfig({ primary: color, neutral: neutralColor.value })
  }

  /**
   * Set neutral color
   */
  function setNeutralColor(color: NeutralColor): void {
    neutralColor.value = color
    applyTheme({ primary: primaryColor.value, neutral: color })
    saveConfig({ primary: primaryColor.value, neutral: color })
  }

  /**
   * Reset theme to defaults
   */
  function resetTheme(): void {
    primaryColor.value = DEFAULT_THEME.primary
    neutralColor.value = DEFAULT_THEME.neutral
    applyTheme(DEFAULT_THEME)
    saveConfig(DEFAULT_THEME)
  }

  return {
    // State
    primaryColor: readonly(primaryColor),
    neutralColor: readonly(neutralColor),

    // Methods
    initialize,
    setPrimaryColor,
    setNeutralColor,
    resetTheme
  }
}
