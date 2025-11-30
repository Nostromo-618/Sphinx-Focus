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
    version: '2.1.1',
    date: '2025-11-30',
    changes: {
      fixed: [
        'Fixed multiple notifications when focus session completes',
        'Fixed rest mode not auto-starting after countdown'
      ]
    }
  },
  {
    version: '2.1.0',
    date: '2025-11-30',
    changes: {
      added: [
        'Immersive rest mode with animated gradient background',
        'Glowing neon green circle around timer during rest',
        'Two-stage rest transition: blur → immersive centered view',
        '5-second notification before auto-entering rest mode',
        'E2E tests for rest mode visual enhancements'
      ],
      changed: [
        'REST label now uppercase and larger',
        'Removed Pause button during rest (only Skip/Reset)',
        'Smoother 3-second exit transition from rest mode',
        'Timer text 33% smaller, circle 33% larger in rest overlay'
      ]
    }
  },
  {
    version: '2.0.9',
    date: '2025-11-30',
    changes: {
      added: [
        'About modal with app info, privacy details, security overview, and usage tips'
      ]
    }
  },
  {
    version: '2.0.8',
    date: '2025-11-30',
    changes: {
      fixed: [
        'Fixed task data loss when changing security modes',
        'Auto-migrate encrypted tasks when switching modes'
      ],
      added: [
        'E2E tests for security mode changes'
      ]
    }
  },
  {
    version: '2.0.7',
    date: '2025-11-29',
    changes: {
      added: [
        'Task fade-away: completed tasks auto-delete (1-180s)',
        'Task Settings modal with fade duration',
        'Settings button in Task List header'
      ]
    }
  },
  {
    version: '2.0.6',
    date: '2025-11-29',
    changes: {
      fixed: [
        'Security Setup modal now dismissible when changing mode'
      ]
    }
  },
  {
    version: '2.0.5',
    date: '2025-11-29',
    changes: {
      added: [
        'Timer Settings modal with focus/rest duration and blur mode'
      ],
      fixed: [
        'Timer Settings modal fixes and improvements',
        'Clear All Data removes timer settings'
      ],
      changed: [
        'Build optimizations'
      ]
    }
  },
  {
    version: '2.0.4',
    date: '2025-11-29',
    changes: {
      added: [
        'Timer shows active task name and turns green during focus',
        'Blur mode to minimize distractions',
        'Timer Settings modal (1-99 min intervals)',
        'Settings button in timer header'
      ],
      fixed: [
        'Mobile menu improvements'
      ]
    }
  },
  {
    version: '2.0.3',
    date: '2025-11-29',
    changes: {
      fixed: [
        'Mobile menu improvements'
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
    getLatestVersion: () => changelogData[0]?.version || '2.1.1',
    getVersionEntry: (version: string) => {
      return changelogData.find(entry => entry.version === version)
    }
  }
}
