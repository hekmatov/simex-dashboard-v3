# Fable M0.2: Source content manager commands and desktop composition

Date: 27 September 2026. This is the bounded Source content manager package assigned in section 5 of the authoritative roadmap. It is test-consumer repair, not a wider M0 or release gate.

The compact Build command journey matches the current seven toolbar actions and verifies six chart stages and four Text/Image stages. It passed unchanged. The desktop journey failed at its selected-source assertion because it filtered for a legacy-import CSV, while the shipped CSV sources are uploaded. It now selects the real, used `cases WCPH eldoria` source, checks its origin and use count, renames it, and verifies matching CSV filters and selection across tab changes and manager close/reopen. Media filters now target the real packaged `timelinewcph2026.png` instead of an empty historical search. The existing canvas, deletion-safety and no-overflow assertions remain.

The deletion checkpoint then exposed a fixture setup error: browser-stored shipped GeoJSON descriptors omit inline geometry, and full persistence validation requires it. The shared test helper restores only missing shipped GeoJSON from the current bundled dashboard before validation and adding its unused test media. This did not alter product code or relax the deletion assertions. The tablet journey shares that helper and passed separately.

| Final check | Result |
| --- | --- |
| `node --check tests/e2e/source-content-manager.spec.js` | Passed |
| `git diff --check` | Passed |
| Exact two-title Chromium selection: `--grep "compact Build content commands|desktop composition keeps canvas"` | 2 passed |
| Shared-helper tablet Chromium selection: `--grep "tablet composition navigates list"` | 1 passed |

The initial desktop failure was reproduced at the selected-source assertion; after the source correction, a focused rerun exposed the GeoJSON fixture error; the repaired focused run passed before the final selection. No independent review was needed for these mechanical fixture and locator changes. The remaining manager title, broader browser suites, production build, main integration and release verification were not run. Work remains on branch `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
