# Fable M0.2 catalogue and collection consumer reliability handoff

Date: 27 September 2026. Worktree: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`; branch: `codex/fable-m0-source-fixture`. This closes the four assigned historical titles from consolidated roadmap v1.14, section 5. The implementation commit is supplied with the direct steward report.

## Scope and result

Only the four affected tests and one small `tests/fixtures/collectionConsumerV3.js` fixture changed. The fixture supplies a valid native V3 current-cases KPI with value, label and time roles, two rendered items on one-item carousel pages, a 2-column-by-1-row chart footprint, and a separate preparing timeline in a valid Chrono Group. No production code, public dashboard, profiles or generated catalogue changed. The header test uses Vite's `configFile: false` option so its isolated SSR setup does not fail while loading the repository config in this checkout.

| Historical exact title | Current disposition |
| --- | --- |
| `the configured current-cases KPI excludes the retired Bullet conversion while retaining its role plan` | Passed against the valid V3 fixture KPI and shipped catalogue authority. Bullet remains absent from advertised compatible conversions; explicit remap preserves label/time and requires actual/target. |
| `shipped biomedical source names are specific and runtime-compatible with dataset profiles` | Passed against all nine current shipped CSV source IDs. Their distinct nonempty builder display names resolve through the source-entry API, and source/profile IDs, paths, kinds and fingerprints agree. Provenance labels were not forced to equal display names. |
| `the accepted multi-page fixture retains the 2 by 1 header-capable footprint` | Passed with two actual rendered carousel pages and the `resolveChartFootprint`/panel-style authorities reporting 2 columns by 1 row. |
| `the tracked dashboard keeps authored Collection Displays outside Chrono Groups` | Passed with a nonempty authored collection, a separate timeline member that prepares nonempty marks, valid Chrono Group validation, no collection membership and null collection-local `timeSync`. The existing negative membership test remains green. |

## Checks and review

Final task-specific selection: `node --test tests/catalogueSharedAuthorities.test.js tests/chartCatalogueSelection.test.js tests/collectionHeaderControls.test.js tests/collectionTemporalBoundary.test.js` — **21 passed, 0 failed**. `git diff --cached --check` passed before commit. The initial three non-Vite historical checks passed; the header test first failed before assertions because Vite config loading hit an access-denied path, then passed with the isolated server option.

One scoped read-only review found that duplicate place rows per date left the timeline unpreparable despite Chrono Group validation. The fixture now explicitly sums duplicates, and the temporal test asserts ready, nonempty marks. The affected test and final four-file selection passed after the correction; focused re-review confirmed preparation and playback ticks with no remaining finding.

## Limits

This is a bounded test/fixture reconciliation, not a complete repository, build or browser gate. The full suite, browser journeys, generated-output refresh, scenario work, main integration, push and deployment were outside this package and were not run. Other M0.2 items and later milestones remain under the planning steward's roadmap.
