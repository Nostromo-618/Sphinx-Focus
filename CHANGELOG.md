# Changelog

All notable changes to Sphinx Focus will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2025-12-07

### Added
- Global theme customization: Users can now select from 17 primary colors (red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose) and 5 neutral colors (slate, gray, zinc, neutral, stone)
- Theme color picker popover UI in the header (swatch-book icon button)
- Theme preferences persist across sessions via localStorage
- Rest mode overlay now respects the global primary color theme
- Comprehensive E2E test coverage for theme picker functionality (11 tests)
- Theme color helper function (`setThemeColor`) added to test utilities

### Changed
- Theme picker converted from modal to popover dropdown for improved UX
- Rest mode colors now dynamically based on global theme instead of hardcoded green

### Technical
- Created `useThemeSettings` composable for theme state management
- Created `ThemePickerModal.vue` component (using Popover)
- Updated `RestModeOverlay.vue` to use dynamic color palettes
- Added theme color palette mappings for all color combinations

## [2.2.0] - Previous Release

See git history for changes in version 2.2.0 and earlier.
