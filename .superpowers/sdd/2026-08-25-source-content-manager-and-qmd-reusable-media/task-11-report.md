# Task 11 Report — CSV Direct Replacement Compatibility

**BASE:** `3c9c68232c05e177f0825e54a8125d53505ff43c`

**Commit intent:** `feat(content): block incompatible CSV replacement`

**Rows:** SCM-S09, SCM-R05, CSV structural-replacement branch of SCM-C08

## RED

The exact five-file selection first failed because `src/content-library/csvReplacementTransaction.js` and `prepareChartData.js::validateChartDataCompatibility` did not exist. The focused mounted dialog test also failed because the CSV replacement action rendered no file intake, typed block reason, import action, or remap targets. These were the expected Task 11 failures.

Review correction T11-R01 added a second focused RED: a candidate with changed directly-used temporal observations incorrectly returned `ready` and committed, while the mounted dialog disabled Replace without exposing why. The paired tests failed with actual status `ready` and missing `data-replacement-reason="requires-temporal-review"`.

## Minimal implementation

- `prepareCsvReplacement` parses/injects a candidate, validates descriptor/profile safety and every directly dependent primary-source chart, snapshots current authority, and returns typed immutable block/ready plans plus Page › Section › Panel remap targets.
- `commitCsvReplacement` uses the existing content-draft coordinator transaction lifetime and atomic dashboard publication. Replace preserves `sourceId`; incompatible Import as new publishes a distinct ID without silently remapping the original; persistence failure rolls back.
- `validateChartDataCompatibility` is the live chart-data structural falsifier used by the transaction. Map charts validate their primary CSV while retaining `presentation.map.geoSource` unchanged.
- Task 11 now compares the unique directly-used temporal observation series against current loaded rows. A changed series returns typed, non-structural `requires-temporal-review`; Replace and Import are unavailable and `commitCsvReplacement` rejects publication. It does not calculate impact contexts, warning confirmation, or `temporalReview` metadata; Task 12 remains the sole owner of those behaviors.
- The existing manager detail/dialog owns file choice, typed reason, Cancel/focus return, Import as new, and guided remap. The imported plan retains its remap targets after publication.

## Technical rulings

1. `ContentDetail.jsx` was verified as the common wrapper dropping the coordinator already supplied by `SourceContentWorkspace`; one prop was added for data-source detail. Cost: one additional Task 11 owner, no new coordinator architecture.
2. The existing selection command rejects navigation while the Source Content auxiliary remains open. `BuildWorkspace.jsx` now supplies its existing `closeAuxiliary` as `onRequestClose`; `SourceContentWorkspace.jsx` transports it; `DataSourceDetail.jsx` closes first and invokes the existing dependency navigation on the next animation frame. Cost: two transport owners and one callback prop, with no new navigation system or Task 12 behavior.
3. Journey E seeds its compatible map CSV through the real manager Add flow rather than placing a large tracked CSV into localStorage. This keeps the browser fixture canonical, bounded, and reloadable.

## GREEN and real-use evidence

- Exact deterministic command:
  `node --test tests/csvReplacementTransaction.test.js tests/contentActionDialog.test.js tests/contentDependencyGraph.test.js tests/chartConfigV3.test.js tests/chartRenderingV3.test.js`
- Result after T11-R01: **69/69 passing**, zero fail/skip/todo.
- Exact browser command:
  `pnpm.cmd test:e2e tests/e2e/source-content-csv.spec.js --project=chromium --grep "Journey E — incompatible CSV replacement blocks and imports as new"`
- Result: **1/1 passing** in Chromium.
- Inspected 1440×900 facts: live map canvas present; typed `missing-encoding-column`; original descriptor/profile/chart/render/GeoJSON equality after block and Cancel; trigger focus restored; Import as new creates one distinct source; original stays unchanged; guided target closes the auxiliary and selects the affected panel.
- Inspected 1024×768 facts: same typed block and Cancel equality; trigger focus restored; source/profile/chart/GeoJSON and post-close render continuity; manager `scrollWidth <= clientWidth`.

## Disposition

- **Engine implemented:** yes — typed structural validation, immutable plans, identity checks, distinct import, same-ID compatible commit, and rollback.
- **UI implemented:** yes — focused CSV replacement modal, typed block, import action, preserved remap targets, focus return, and close-before-navigation transport.
- **Fidelity verified:** yes for SCM-S09 and SCM-R05; yes for the CSV structural-replacement branch of SCM-C08. SCM-C08 remains Partial overall.
- **Deferred exactly:** Task 12 owns temporal warnings and durable `temporalReview`; Tasks 13–14 own GeoJSON management/replacement; later tasks own package/recovery and relink branches.
