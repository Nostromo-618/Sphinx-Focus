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
    version: '2.0.1',
    date: '2025-11-29',
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
    getLatestVersion: () => changelogData[0]?.version || '2.0.1',
    getVersionEntry: (version: string) => {
      return changelogData.find(entry => entry.version === version)
    }
  }
}
