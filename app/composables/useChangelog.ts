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
    version: '2.0.3',
    date: '2025-11-29',
    changes: {
      fixed: [
        'Fixed hamburger menu hiding page content by switching to slideover mode',
        'Moved header icons to mobile menu for better mobile UX',
        'Hide hamburger on tablet, show only on mobile (< 640px)',
        'Fixed document title to show app name in idle state'
      ]
    }
  },
  {
    version: '2.0.2',
    date: '2025-11-28',
    changes: {
      fixed: [
        'Tasks now clear immediately when "Clear All Data" is clicked (no page refresh needed)',
        'Timer now resets to default state when "Clear All Data" is clicked'
      ]
    }
  },
  {
    version: '2.0.1',
    date: '2025-11-27',
    changes: {
      changed: [
        'Fixed persistence of tasks between page reloads',
        'Updated favicon to new emotion icon design'
      ]
    }
  },
  {
    version: '2.0.0',
    date: '2025-11-23',
    changes: {
      changed: [
        'Migrated to Nuxt v4.x'
      ]
    }
  }
]

export function useChangelog() {
  return {
    changelog: changelogData,
    getLatestVersion: () => changelogData[0]?.version || '2.0.3',
    getVersionEntry: (version: string) => {
      return changelogData.find(entry => entry.version === version)
    }
  }
}
