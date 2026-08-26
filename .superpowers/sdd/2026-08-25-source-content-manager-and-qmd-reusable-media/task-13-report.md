# Task 13 Report — GeoJSON Manager, Selector, and Shared Map Budget

**BASE:** `72084fb4f6f708efadfad89498e1f7dad954cb35`
**Rows:** SCM-C09/R09 and mounted SCM-S15; focused SCM-S04/S05/S07/C04/C05
**Journey:** I — GeoJSON upload, select, preview, dependency, and blocked delete

## RED

Focused RED was **3/5 passing**: the current selector excluded an uploaded-dataset GeoJSON descriptor, and manager Add had no atomic candidate. The first exact eleven-file selection was **114/119 passing**, with the remaining failures limited to the absent detail/preview/common-ancestor map-budget transport.

## Implementation

- Added manager upload/Add/cancel, canonical lean summary/detail, bounded preview/text fallback, searchable paginated property names, and eligible tracked/dataset GeoJSON selection.
- Extended the unchanged six-stage chart workflow with a staged GeoJSON upload in its existing geography stage and atomic chart/source publication.
- Added one Build map-budget provider above the manager/canvas siblings. Dashboard maps and previews share exact requests; visible dashboard maps outrank previews, slots 1–2 are normal, 3–4 degraded, and fifth+ deferred.
- Kept source admission to the exact four Task 2 gates. Diagnostics do not hard-block and concurrency never rejects or deletes a source.

## Rulings and cost

- Live inspection established `src/components/chart-authoring/ChartWizardV3.jsx` as the verified six-stage draft/commit owner; this technical ruling was master-authorized. Cost: Task 13 touches that owner only for staged geography authority and atomic completion; no stage was added or removed.
- Initial changes considered in `geoJsonSourceEntry.js` and `sourceEntrySchema.js` were reverted because `contentDraftTransaction.js` and the existing source-entry validator already own the required candidate.
- Journey fixture corrections selected the verified eligible `biomedical/outbreak_dynamics` destination and its actual persisted breadcrumb. They did not change product behavior or expand evidence.

## GREEN and real use

- Exact eleven-file deterministic selection: **119/119 passing**, zero fail/skip/todo.
- Named Journey I Chromium selection: **1/1 passing** (48.7 s test, 50.7 s total).
- Inspected Build 1440×900 and 1024×768: Cancel/Add inventories, unused-source reload, canonical summary, preview/fallback, desktop/tablet bounded geometry and Back, exact six stages, eligible source variants, completed map dependency breadcrumb, blocked Delete/no dialog, and shared four-slot scheduling across five maps.

## Disposition

- **Engine implemented:** yes — atomic draft/publication, eligible descriptor selection, shared acquire/release/priority budget, direct dependency/delete semantics.
- **UI implemented:** yes — manager upload/detail/preview/filter and existing six-stage geography selection.
- **Fidelity verified:** yes for SCM-S04/S05/S07/S15, SCM-C05/C09, and SCM-R09. The GeoJSON detail/dependency branch of SCM-C04 is Passing; SCM-C04 remains Partial for Task 14 replacement/relink.
- **Blockers:** none. Task 14 was not implemented.
