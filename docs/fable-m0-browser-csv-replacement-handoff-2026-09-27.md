# Fable M0.2: browser CSV replacement and temporal review

Date: 27 September 2026. This is the bounded Journey E/F browser evidence for section 5 of the authoritative roadmap. It does not close the wider M0.2 inventory or any release gate.

## Delivered

The existing `source-content-csv.spec.js` journeys now use current saved-dashboard data rather than relying on historical fixture shapes. Journey E builds a valid native V3 municipal choropleth from the manager-added CSV, with a profiled source and the shipped 2026 municipal GeoJSON. Its nine CSV codes join to nine GeoJSON features and render on desktop and tablet. The test confirms that a replacement missing `MunicipalityCode` is blocked, cancel preserves the source and rendered chart, and import-as-new creates a distinct managed source while the original chart, geometry and render remain intact. It also checks the affected-panel remap target and tablet manager overflow.

Journey F seeds a linked-project CSV used by a valid Chrono Group and Scene presentation. It confirms that a changed temporal CSV warns with the affected group, Scene and presentation, cancel leaves them unchanged, and confirmation retains source identity and linked-project origin while marking the group and Scene `needs-review` and presentation `degraded`. Present shows the degraded Scene and saved composition. While those review flags still exist, the test opens a real Audience session on the affected Chrono Group, waits for an actual protocol `state` message for that group, and confirms the transmitted message omits internal `temporalReview` metadata. Saving the group and Scene through their studios clears the review flags.

The fixture preflight uses `prepareChartData`, `validateChronoGroups` and `validateScene` on the precise authored boundary. Whole-config normalization was not suitable here because the browser's persisted shipped geometry is an asset reference without an inline `geoJson` value. No product code, protocol or public configuration was changed.

## Verification

| Check | Result |
| --- | --- |
| `node --check tests/e2e/source-content-csv.spec.js` | Passed |
| `git diff --check` | Passed |
| `node node_modules/@playwright/test/cli.js test tests/e2e/source-content-csv.spec.js --project=chromium --grep "Journey [EF]"` | 2 passed (1.3 minutes) |

A scoped read-only review found one material gap: the original protocol omission assertion could inspect an empty message list. The assertion now requires a captured `state` message from a connected Audience session while review metadata exists; bounded re-review confirmed the gap is resolved. Journey F also passed alone after the correction. The complete E/F selection above was run once on the final candidate.

The scope is these two Chromium browser journeys. It does not establish the other CSV journeys, all-browser coverage, full repository tests, a production build, integration into main, or release readiness. The branch remains `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
