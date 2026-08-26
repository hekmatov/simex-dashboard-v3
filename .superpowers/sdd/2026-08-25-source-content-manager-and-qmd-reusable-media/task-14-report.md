# Task 14 Report — GeoJSON Replacement and Relink

**BASE:** `1c56364863326bbcdca7194c16674d9c60018daa`
**Rows:** SCM-S16/R10/R11 and GeoJSON replacement/relink branch of SCM-C08
**Journeys:** J — invalid replacement blocks/imports as new; K — valid geometry change warns/confirms

## RED

The exact seven-file selection was **49/52 passing**. The three expected failures were limited to the absent GeoJSON replacement transaction, absent direct-map join-coverage inspection, and absent focused GeoJSON action dialog.

## Implementation

- Added one replacement transaction that validates through the canonical schema/four-gate authority, then checks every directly dependent map's selected join field and usable coverage before mutation.
- Exactly four resource keys remain authoritative. Schema and direct-map compatibility stay separately typed; high property-key count, deeply nested property data, container diagnostics, and per-feature concentration do not independently block.
- Structural failures preserve the current authority and expose Import as new source plus exact dependency breadcrumbs. Compatible feature/bounds/geometry-mix/reduced-nonzero coverage changes warn; confirmation preserves `sourceId` and publishes descriptor/payload/map state atomically.
- Stored uploads expose Replace file; linked sources expose Relink through the same validation and transaction path. Expected-current checks and coordinator transaction retainers protect publication and rollback.
- Confirmed browser-file relinks publish the existing durable embedded `dataset/uploadedGeoJson` descriptor, retain the logical sourceId and linked-project SourceEntry origin, and replace stale path provenance with the selected filename. Reload/provider evidence succeeds without `loadedData`, a served basename, or provider expansion.
- Import as new derives uploaded origin and filename provenance from the browser-selected candidate descriptor. Geometry-mix warnings compare the complete sorted geometry-type key/count distribution.
- GeoJSON replacement creates no Chrono Group, Scene, or presentation temporal contexts or review metadata.

## Rulings and cost

- The accepted owner list omitted the mounted action/lifecycle carrier. Live inspection established `src/components/source-content/DataSourceDetail.jsx` as the sole existing owner of replacement modal state, coordinator stage/commit/discard, trigger-focus return, close, and guided remap navigation. The technical ruling authorized that one file; Task 14 reuses its existing contracts and adds no parallel lifecycle.
- `geographyAdapter.js`, `EChartsChartView.jsx`, and `DependencyList.jsx` required no change: the existing map registration consumes the newly committed payload on dashboard publication, and the existing dependency breadcrumbs already provide the guided remap targets.
- Journey setup reused a manager-added CSV/GeoJSON and the verified `Biomedical` navigation label. Durable persistence may normalize an inline GeoJSON locator to `browserAssetId`; mounted evidence therefore compares stable source identity, canonical summary, direct binding, and rendered geometry, while deterministic transaction tests retain exact raw descriptor/payload rollback assertions.

## GREEN and real use

- Review-fix RED was **5/8 passing**, with exactly one intended failure for each finding: fake linked fetch path, packaged import origin, and keys-only geometry comparison.
- Exact seven-file deterministic selection: **60/60 passing**, zero fail/skip/todo, 4.56 s. No extra test file was added.
- Named Journey J independent Chromium selection: **1/1 passing**, 42.6 s test / 44.5 s total, including exact uploaded origin/filename provenance.
- Named Journey K independent Chromium selection: **1/1 passing**, 38.9 s test / 41.7 s total, including identical geometry keys with Point/LineString counts changing 2/1 → 1/2.
- Inspected Build 1440×900 and 1024×768: typed structural block, exact no-op cancel/focus return, distinct import identity, guided panel remap, stable original source/chart/temporal state and render, typed bbox/geometry-mix/reduced-coverage warnings, stable source identity on confirm, changed map render and canonical summary, live tablet map/detail, and zero manager overflow.

## Disposition

- **SCM-S16:** Passing.
- **SCM-R10:** Passing.
- **SCM-R11:** Passing.
- **SCM-C08:** Passing for the GeoJSON replacement/relink branch; overall row remains Partial only for unrelated later-scope data-source relink evidence.
- **Blockers:** none. Task 15 was not started.
