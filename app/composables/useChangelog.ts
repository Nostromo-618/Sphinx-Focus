export interface ChangelogEntry {
  version: string
  date: string
  changes: {
    added?: string[]
    fixed?: string[]
    changed?: string[]
    removed?: string[]
    security?: string[]
  }
}

export const changelogData: ChangelogEntry[] = [
  {
    version: '2.3',
    date: '2025-01-20',
    changes: {
      added: [
        'Version button in header with changelog modal',
        'Timeline-style changelog display',
        'System theme preference option'
      ],
      changed: [
        'Improved theme switcher with three options (light, dark, system)',
        'Updated header layout and branding'
      ],
      fixed: [
        'Theme persistence across page reloads'
      ]
    }
  },
  {
    version: '2.2',
    date: '2025-01-15',
    changes: {
      added: [
        'Custom color mode button component',
        'Dark mode support'
      ],
      changed: [
        'Refactored header components',
        'Improved accessibility'
      ],
      fixed: [
        'Color mode detection on initial load'
      ]
    }
  },
  {
    version: '2.1',
    date: '2025-01-10',
    changes: {
      added: [
        'Initial project setup',
        'Nuxt UI integration',
        'Basic routing structure'
      ],
      changed: [
        'Updated dependencies to latest versions'
      ]
    }
  },
  {
    version: '2.0',
    date: '2025-01-01',
    changes: {
      added: [
        'Complete redesign of application',
        'New component library integration',
        'Enhanced user interface'
      ],
      changed: [
        'Migrated to Nuxt 4',
        'Updated build system'
      ],
      removed: [
        'Legacy components',
        'Deprecated features'
      ]
    }
  }
]

export function useChangelog() {
  return {
    changelog: changelogData,
    getLatestVersion: () => changelogData[0]?.version || '2.3',
    getVersionEntry: (version: string) => {
      return changelogData.find(entry => entry.version === version)
    }
  }
}

