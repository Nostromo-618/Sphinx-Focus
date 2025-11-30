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
    version: '2.0.8',
    date: '2025-11-28',
    changes: {
      fixed: [
        'Fixed critical bug where changing security mode (auto to PIN or PIN to auto) and refreshing page would wipe out all tasks',
        'Added automatic task data migration when changing security modes to preserve encrypted tasks with new encryption key'
      ],
      added: [
        'Comprehensive E2E test coverage for security mode changes to prevent task data loss'
      ]
    }
  },
  {
    version: '2.0.7',
    date: '2025-11-29',
    changes: {
      added: [
        'Task fade-away feature: completed tasks automatically fade out and delete after customizable duration (1-180 seconds, default 55)',
        'Task Settings modal with fade duration configuration',
        'Settings button in Task List header for quick access to task settings'
      ]
    }
  },
  {
    version: '2.0.6',
    date: '2025-11-29',
    changes: {
      fixed: [
        'Fixed Security Setup modal not being dismissible when changing security mode (users can now cancel without choosing an option)',
        'Fixed test reliability issue for security mode change on desktop browsers (Firefox/WebKit)',
        'Improved test timing for localStorage operations to ensure proper verification'
      ]
    }
  },
  {
    version: '2.0.5',
    date: '2025-11-29',
    changes: {
      added: [
        'Timer Settings modal with focus/rest duration configuration',
        'Blur mode toggle in timer settings'
      ],
      fixed: [
        'Fixed Timer Settings modal not opening (missing component)',
        'Fixed favicon 404 error (removed non-existent favicon.png reference)',
        'Fixed hydration mismatch warning for timer display',
        'Fixed missing USwitch component in Timer Settings modal',
        'Fixed accessibility warnings for Timer Settings dialog',
        'Clear All Data now removes all app data including timer settings'
      ],
      changed: [
        'Improved build configuration with chunk splitting for better performance',
        'Disabled production sourcemaps to reduce build warnings'
      ]
    }
  },
  {
    version: '2.0.4',
    date: '2025-11-29',
    changes: {
      added: [
        'Timer title now displays active task name and turns green during focus sessions',
        'Blur mode to minimize distractions during focus sessions (blurs everything except timer)',
        'Timer Settings modal with customizable focus and rest intervals (1-99 minutes)',
        'Settings button (cogwheel) in timer card header for quick access to settings',
        'Blur mode toggle in settings (enabled by default)',
        'Settings persist across browser sessions'
      ],
      fixed: [
        'Replaced full-screen slideover menu with compact drawer menu for better mobile UX',
        'Fixed security dialog being overlapped by header overlay on mobile devices'
      ]
    }
  },
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
    getLatestVersion: () => changelogData[0]?.version || '2.0.8',
    getVersionEntry: (version: string) => {
      return changelogData.find(entry => entry.version === version)
    }
  }
}
