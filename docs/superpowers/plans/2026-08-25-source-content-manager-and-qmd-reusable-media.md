# Source Content Manager and QMD Reusable Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved dashboard-contained V5 reusable media and managed CSV/GeoJSON library, Build manager and pickers, portable QMD media, replacement/deletion/recovery transactions, and offline portability without regressing accepted Step 7S behavior.

**Architecture:** `contentLibrary.mediaItems` and `contentLibrary.sourceEntries` provide stable logical identities over the existing authored-image byte store, `dataSources`, and CSV-only `datasetProfiles`. One parser owns QMD media grammar, one dependency graph owns saved uses and actual temporary retainers, one iterative authority owns GeoJSON safety and summary facts, and source-specific transactions publish validated changes atomically. React mounts QMD media through portals into safe DOM placeholders, while one Build-workspace map-budget registry coordinates live dashboard maps and manager previews.

**Tech Stack:** React 19, ES modules, Node `node:test`, Playwright Chromium, IndexedDB, Papa Parse, ECharts 5, existing portable-QMD safe DOM pipeline, and existing dashboard/package commit controllers.

**Spec:** `docs/superpowers/specs/2026-08-25-source-content-manager-and-qmd-reusable-media-design.md`

**Authority:** Written amendment `81531b4`; master-accepted GeoJSON calibration `c28b59d`; master-accepted ownership reconciliation `dc06f8c`; accepted Step 7S implementation `b366ba17fe856aede46ba8301b8a530520e4d2cd`; Step 7S documentation closure `db63d8e772ce96b17de19b7a89f256a72926d08d`.

**Review history:** First plan `ebdc52b` was rejected by master review. This replacement resolves its incomplete Image V5 cutover, QMD-before-consumer ordering, picker import reachability/lifetime, missing manager rename/upload behavior, undefined GeoJSON concurrency/summary ownership, incomplete CSV temporal metadata, oversized tasks, stale prerequisite status, and mechanically unsafe or incomplete verification commands. Product scope is unchanged.

**Planning status:** Planning only. All 36 amendment rows remain `Proposed / unimplemented / not verified`.

## Global Constraints

- Canonical V5 keys are exactly `contentLibrary.mediaItems` and `contentLibrary.sourceEntries`; dashboard and package bundle are V5, V4 import remains compatible, and chart configuration remains V3.
- Logical `mediaId`/`sourceId` identity is distinct from physical hash dedupe. Identical image bytes may share storage while distinct logical records remain distinct unless the user explicitly chooses **Reuse existing**.
- `dataSources[sourceId]` remains CSV/GeoJSON kind and payload authority; `datasetProfiles[sourceId]` remains CSV-only; authored image bytes remain in authored-asset storage.
- Builder-controlled CSV/GeoJSON are managed. Explicitly dashboard-owned generated/intermediate inputs remain hidden; filenames and paths never establish ownership.
- Saved direct uses and real active draft/replacement/transaction retainers block deletion. Delete never cascades. Page/section are breadcrumbs. Blocked Delete opens no dialog; only eligible Delete opens confirmation.
- Chrono groups, Scenes, and Scene presentation compositions are CSV temporal-impact contexts, never dependencies. GeoJSON has no temporal impact warnings. Manual Present state, audience messages, and leases are transient.
- Media replacement preserves `mediaId`, increments library revision, and preserves every placement's alt/decorative/crop/rotation/fit and placement/surface-local zoom.
- QMD accepts all text by default without a sanitizer. Only validated local `simex-media:` nodes become media; raw HTTP/HTTPS/data/blob/file, malformed, unknown, and external-only references remain visible inert text and issue no request.
- Add chart stays exactly six stages; Add static content stays exactly four. Free text remains Build/View/fullscreen only. Image remains additionally Present/passive Audience eligible. Static content remains excluded from Chrono groups/Scenes.
- No global Build Undo/Redo is introduced. Build Reset is unchanged. Contextual Image **Restore previous image** remains visible until Restore, Save, or Discard resolves the replacement snapshot.
- Unsaved drafts are application-session-only. Manager uploads publish only on **Add to dashboard**; QMD/Image/chart uploads publish only with the completed panel/chart.
- Every behavior change follows RED → observed intended failure → minimal implementation → targeted PASS → mounted/live integration where material → same-slice fidelity/security/evidence update → atomic commit.
- A row cannot become Passing from an unwired model, reducer-only composition assertion, static markup check, screenshot existence, or uninspected browser checkpoint.

---

## Exact File and Interface Map

### New model and transaction owners

| Path | Exact exports and responsibility |
|---|---|
| `src/content-library/contentLibrarySchema.js` | `normalizeContentLibrary(value = {}) -> ContentLibrary`; `validateContentLibrary(value, authorities) -> ContentLibrary`. Exact keys and cross-authority identity only. |
| `src/content-library/migrateDashboardV4ToV5.js` | `migrateDashboardV4ToV5(dashboard) -> DashboardV5`. Deterministic/idempotent V4 media/CSV/GeoJSON migration before V5 validation. |
| `src/content-library/mediaItems.js` | `createMediaItem(input)`, `replaceMediaItemRevision(item,current)`, `renameMediaItem(item,{displayName,defaultDescription})`, `validateMediaItem(item,{assets})`. |
| `src/content-library/sourceEntrySchema.js` | `classifyManagedSource(sourceId,descriptor)`, `validateSourceEntry(entry,context)`, `renameSourceEntry(entry,displayName)`, `listManageableSourceEntries(library,dataSources)`. |
| `src/content-library/geoJsonSourceEntry.js` | `normalizeManagedGeoJsonSource(sourceId,descriptor,validation)`; `summarizeGeoJsonSource(validation) -> GeoJsonSummary`. |
| `src/lib/geoJsonValidation.js` | `GEOJSON_LIMITS`; `inspectGeoJsonComplexity(value,options)`; `validateGeoJson(input,options)`. Single iterative safety/summary authority. |
| `src/content-library/contentDraftTransaction.js` | `stageContentDraft(input)`; `finalizeContentDraft(input)`; `discardContentDraft(input)`. Manager versus panel/chart publication lifetime. |
| `src/content-library/contentDependencyGraph.js` | `buildContentDependencyGraph(input)` plus media/CSV/GeoJSON direct-use, active-retention, and CSV-impact selectors. QMD edges consume the portable-QMD parser API. |
| `src/content-library/contentDeletionTransaction.js` | `prepareContentDeletion(input)`; `commitContentDeletion(plan,adapters)`. No-cascade block/confirm/rollback. |
| `src/content-library/contentReplacementTransaction.js` | Media replacement only: `prepareMediaReplacement`, `commitMediaReplacement`. |
| `src/content-library/csvReplacementTransaction.js` | `prepareCsvReplacement`, `commitCsvReplacement`, `csvReplacementWarnings`, `applyCsvTemporalReview`. |
| `src/content-library/geoJsonReplacementTransaction.js` | `prepareGeoJsonReplacement`, `commitGeoJsonReplacement`, `geoJsonReplacementWarnings`. |
| `src/content-library/contentHealth.js` | `deriveContentHealth(input)`; `repairContentItem(input)`. Persistent identity and explicit recovery. |
| `src/content-library/contentPackageValidation.js` | `validateContentPackage(input)`. V5 cross-layer/package references and atomic rejection. |
| `src/charting/time/temporalReview.js` | `validateTemporalReview`, `mergeTemporalReview`, `clearTemporalReviewSourceIds`. Exact optional durable metadata. |

### QMD and mounted-render owners

| Path | Exact exports and responsibility |
|---|---|
| `src/static-content/qmd/portableQmdMedia.js` | `parsePortableMediaReference(destination)`; `validatePortableMediaAttributes(attributes)`; `serializePortableMediaReference({mediaId,alt,width,align,flow,frame,caption,decorative})`; `extractPortableMediaNodes(qmd,{mediaItems})`. The last function calls `parsePortableQmd`; no second regex grammar. |
| `src/static-content/qmd/renderPortableQmd.js` | Modify `renderPortableQmd(ast,options) -> DocumentFragment` to emit safe hosts only for known local records. Host attributes: `data-qmd-media-host`, `data-qmd-media-key`, and validated token data only. Unknown/external nodes emit inert source text. |
| `src/components/charts/FreeTextChartView.jsx` | Modify `FreeTextChartView` to import `createPortal` from `react-dom`, clone/append the fragment, collect committed host elements, and call `createPortal(<QmdMediaView ...>, host, nodeKey)`. Portal entries are replaced on recompilation and cleared on unmount. |
| `src/components/charts/QmdMediaView.jsx` | `QmdMediaView({mediaItem,attributes,assets,resolveAsset,onRepair})`. Own exactly one healthy local object-URL lease and release; known missing/corrupt records render bounded repair/passive fallback without `<img>`. Decorative means `alt=""`. |
| `src/components/static-content/QmdMediaInspector.jsx` | Exact width/alignment/flow/frame/caption/alt/decorative controls and Change/Open actions. |
| `src/styles/source-content.css` | Manager and tokenized QMD media classes, including responsive/RTL/wrap behavior; imported once from `src/main.jsx`. |

### Manager, picker, and map-budget owners

| Path | Exact exports and responsibility |
|---|---|
| `src/components/source-content/SourceContentWorkspace.jsx` | Non-modal shell, Media/Data Sources tabs, desktop/tablet composition, state/focus restoration. |
| `src/components/source-content/ContentCatalogue.jsx` | Shared accessible search/filter/list/selection shell. |
| `src/components/source-content/MediaCatalogue.jsx` | Media rows, origin/health/usage, manager upload entry. |
| `src/components/source-content/DataSourceCatalogue.jsx` | CSV/GeoJSON kind filter, source rows, manager upload entry. |
| `src/components/source-content/ContentDetail.jsx` | Selected-kind router. |
| `src/components/source-content/MediaDetail.jsx` | Metadata/default description/rename/preview/usage/actions; library-owned External import. |
| `src/components/source-content/DataSourceDetail.jsx` | Shared source actions and CSV/GeoJSON routing. |
| `src/components/source-content/CsvDetail.jsx` | CSV profile/searchable preview/download. |
| `src/components/source-content/GeoJsonDetail.jsx` | Canonical GeoJSON summary and actions. |
| `src/components/source-content/GeoJsonPreview.jsx` | Budgeted ECharts preview plus accessible text fallback. |
| `src/components/source-content/DependencyList.jsx` | Direct-use breadcrumbs, retainer explanation, navigation. |
| `src/components/source-content/ContentActionDialog.jsx` | Eligible delete and replace/relink/import-remap modal states only. |
| `src/components/source-content/MediaPicker.jsx` | Local selectable rows; separate non-selectable External rows with **Import as local media**; panel-draft upload/import for QMD, normal external selection for Image. |
| `src/components/source-content/DataSourcePicker.jsx` | Managed CSV/GeoJSON selection and workflow-owned draft upload. |
| `src/components/build/BuildMapBudgetContext.jsx` | `createBuildMapBudget()`, `BuildMapBudgetProvider`, `useBuildMapBudgetSlot({ownerId,kind,visible,active})`. Prefer visible dashboard maps; allocations 1–2 `normal`, 3–4 `degraded`, fifth+ `deferred`; release on unmount; explicit activation re-runs priority. |

### Existing integration owners that must change

Task 1 owns the complete Image cutover across `dashboardConfigStructure.js`, `dashboardBundleV3.js`, `migrateDashboardV4ToV5.js`, `staticSourceSchema.js`, `staticSourceResolver.js`, `resolveChartRendering.js`, `staticPanelTransaction.js`, `assets/durableStaticPanelCommit.js`, `forms/staticContentDraft.js`, `StaticContentWizard.jsx`, `ImageSourceEditor.jsx`, `ChartView.jsx`, `ImageChartView.jsx`, `loadDashboard.js`, `staticPanelCapabilities.js`, `assetReferenceGraph.js`, `dashboardPackageExport.js`, `useAudienceStaticAssetReadiness.js`, `DisplayedChartGrid.jsx`, `AudienceDisplay.jsx`, `presentationProtocol.js`, and `App.jsx`. No later task may retain a `staticImage.source.origin` or source-owned revision assumption.

Other existing integrations are owned as follows: Build shell by `src/components/build/BuildCommandHeader.jsx`, `src/components/build/BuildWorkspace.jsx`, `src/components/build/buildCanvasRestoration.js`, `src/components/build/buildDirtyState.js`, `src/components/DashboardRenderer.jsx`; chart authoring by `src/charting/forms/wizardDraft.js`, `src/components/chart-authoring/ChartWizardV3.jsx`, `src/components/chart-authoring/DataSourceStep.jsx`, `src/charting/forms/geographySource.js`; temporal state by `src/charting/time/chronoGroupModel.js`, `src/charting/time/dashboardTemporalConfig.js`, `src/charting/time/sceneSchema.js`, `src/charting/time/temporalNeedsAttention.js`, `src/components/time/chronoContentState.js`, `src/components/presentation/PresentWorkspace.jsx`; GeoJSON runtime by `src/lib/loadDashboard.js`, `src/data/sourceRequest.js`, `src/data/dashboardSourceProviders.js`, `src/charting/data/prepareGeographyData.js`, `src/charting/rendering/geographyAdapter.js`, `src/components/charts/EChartsChartView.jsx`; package/recovery by `src/lib/dashboardPackageExport.js`, `src/lib/dashboardPackageCandidate.js`, `src/lib/dashboardPackageImportTransaction.js`, `src/lib/dashboardAssetPersistence.js`, `src/lib/browserStorage.js`, `src/static-content/assets/assetReferenceGraph.js`, `src/static-content/assets/reconcileAuthoredAssets.js`.

### Test helpers and fixtures

| Path | Exact exports |
|---|---|
| `tests/helpers/contentLibraryFixtures.js` | `makeMediaItem(overrides={})`, `makeSourceEntry(kind,overrides={})`, `makeDashboardV4(overrides={})`, `makeDashboardV5(overrides={})`. Each returns a complete plain fixture; tests mutate only their returned clone. |
| `tests/helpers/geoJsonBoundaryFixtures.js` | `geoJsonAtBoundary(metric,boundary,limits=GEOJSON_LIMITS)`. `metric` is one accepted limit key; boundary is `normalMax`, `warningMin`, `hardMin`; implementation derives counts from imported constants and never duplicates numeric thresholds. |
| `tests/helpers/contentManagerHarness.jsx` | `ContentManagerHarness({dashboard,viewport,failAt})`, exposing committed dashboard and transaction log through `window.__SIMEX_CONTENT_TEST__`. |

Seven Playwright files are created: `source-content-manager.spec.js`, `source-content-media.spec.js`, `qmd-reusable-media.spec.js`, `source-content-csv.spec.js`, `source-content-geojson.spec.js`, `source-content-portability.spec.js`, and `source-content-recovery.spec.js`. `tests/portableQmdDomSafety.test.js` is modified, never created.

## Shared Contracts

```js
/** @typedef {{mediaItems:Record<string,MediaItem>,sourceEntries:Record<string,SourceEntry>}} ContentLibrary */
/** @typedef {{mediaId:string,revision:number,current:{kind:'asset'|'package'|'url',assetId?:string,path?:string,url?:string},displayName:string,defaultDescription:string,origin:'uploaded'|'packaged'|'external'|'legacy-import',health:'ready'|'external'|'missing'|'corrupt'|'needs-relink'|'needs-review',dimensions?:{width:number,height:number},byteLength?:number,mediaType?:string}} MediaItem */
/** @typedef {{sourceId:string,origin:'uploaded'|'linked-project'|'packaged'|'legacy-import'|'generated',ownership:'builder'|'dashboard',displayName:string,provenance:object,health:'ready'|'missing'|'corrupt'|'needs-relink'|'needs-review',updateStatus?:string}} SourceEntry */
/** @typedef {{featureCount:number,geometryTypeCounts:Record<string,number>,boundingBox:[number,number,number,number]|null,propertyKeys:string[],maxPropertyKeysPerFeature:number,totalPositions:number,maxPositionsPerFeature:number,parts:number,rings:number,structuralNodes:number,maxDepth:number,encodedBytes:number,encodedPropertyValueBytes:number}} GeoJsonSummary */
/** @typedef {{status:'needs-review'|'degraded',sourceIds:string[]}} TemporalReview */
```

`TemporalReview.sourceIds` is sorted, unique, and non-empty. Chrono Group and Scene use `needs-review`; `scene.present.temporalReview` uses `degraded`; absence means ready. Replacements union/dedupe IDs. Group save clears repaired IDs from the group; Scene save clears repaired IDs from Scene and, when its Present composition validates, from `scene.present`. V4 imports omit this property. No review status enters presentation protocol/actions/messages.

`GEOJSON_LIMITS` exact shape is:

```js
{
  encodedBytes:{normalMax:31999999,warningMin:32000000,hardMin:36000000},
  encodedPropertyValueBytes:{normalMax:31999999,warningMin:32000000,hardMin:36000000},
  features:{normalMax:2000,hardMin:8000},
  totalPositions:{normalMax:20000,hardMin:50000},
  maxPositionsPerFeature:{normalMax:20000,hardMin:50000},
  parts:{normalMax:2000,hardMin:4000},
  rings:{normalMax:2000,hardMin:4000},
  maxPropertyKeysPerFeature:{normalMax:512,hardMin:1000},
  depth:{normalMax:16,hardMin:32},
  structuralNodes:{normalMax:30000,hardMin:50000},
  concurrentMaps:{normalMax:2,eagerMax:4}
}
```

Values below warning are normal; values from warning through the last safe value warn where safe; values at each `hardMin` reject before commit. GeometryCollection rejects. Join compatibility/coverage is a replacement outcome, not a resource limit.

## Pre-Implementation Browser-Edit Baseline Gate

This gate runs before Task 1 and before any amendment production edit.

- [ ] Run `Test-Path -LiteralPath '.\packaged-dashboard-bundle.json'` from the worktree root.
- [ ] If it returns `True`, run `pnpm.cmd promote:bundle`, `pnpm.cmd build:dataset-profiles`, `pnpm.cmd build:quorum-catalogue`, and `pnpm.cmd check:v3-runtime-boundaries`; inspect the generated profile/review diff; run the exact checks implicated by that diff; then commit that browser-edit baseline separately before Task 1.
- [ ] If it returns `False` and the user reports browser edits exist, stop and request a browser export. Do not start Task 1.
- [ ] Otherwise record `No browser-edit baseline present` with HEAD and timestamp in `SOURCE-CONTENT-MANAGER-IMPLEMENTATION-EVIDENCE.md`; do not manufacture a baseline commit.
- [ ] Derive the accepted Step 7S result from exact matrix rows, not prose:

```powershell
$rows = Get-Content 'docs/audits/2026-08-24-v3-static-content-panels/FIDELITY-MATRIX.md' |
  Where-Object { $_ -match '^\| (FT-(0[1-9]|1[0-2])|IM-(0[1-9]|1[0-6])|PS-0[1-8]) \|' }
if ($rows.Count -ne 36) { throw "Expected 36 Step 7S rows; found $($rows.Count)." }
$notPassing = $rows | Where-Object { $_ -notmatch '^\| [^|]+ \| Passing \| Passing \| Passing \|' }
if ($notPassing.Count -ne 0) { throw "Step 7S baseline contains non-Passing rows." }
```

Expected: exactly 36 rows and zero non-Passing rows.

## Dependency Order

1. V5 registry and complete Static Image compatibility.
2. GeoJSON limit/summary authority.
3. Draft publication and durable rename models.
4. Manager shell and catalogue composition.
5. QMD grammar, safe hosts, portal runtime.
6. Direct dependencies and deletion.
7. Media manager/pickers/import/Restore and Journey A.
8. Global media replacement and Journey B.
9. QMD inspector/responsive geometry and Journey C.
10. CSV manager/add/authoring and Journey D.
11. CSV direct replacement compatibility and Journey E.
12. CSV temporal impact/status and Journey F.
13. GeoJSON manager/selector/shared concurrency and Journey I.
14. GeoJSON replacement and Journeys J/K.
15. V5 persistence/package/offline portability and Journey G.
16. Health/cleanup/recovery and Journey H.
17. Integrated fidelity promotion and completion submission.

### Task 1: V5 Registry and Complete Static Image Compatibility

**Rows:** SCM-S01/S02/S03 engine; no row promotes yet. **Consumes:** accepted V4 and Step 7S contracts. **Produces:** canonical DashboardV5, Static Image `sourceVersion:2` placement `{kind:'staticImage',sourceVersion:2,mediaId,alt,decorative,fit,crop,rotation}`, and resolver identity `{mediaId,revision}` from the library record.

**Files:** Create `contentLibrarySchema.js`, `migrateDashboardV4ToV5.js`, `mediaItems.js`, `tests/helpers/contentLibraryFixtures.js`, `tests/contentLibrarySchema.test.js`, `tests/dashboardMigrationV5.test.js`, `tests/dashboardBundleV5.test.js`, `tests/mediaItems.test.js`. Modify every Task-1 Image integration listed in the file map, including package candidate/import, and the existing schema/resolver/render/transaction/persistence/package/presentation tests: `staticSourceResolver.test.js`, `chartRenderingV3.test.js`, `staticPanelPersistence.test.js`, `staticPanelTransaction.test.js`, `staticContentDraft.test.js`, `imageChartView.test.js`, `presentWorkspace.test.js`, `audienceDisplay.test.js`, `audienceStaticAssetReadiness.test.js`, `presentationProtocol.test.js`, `dashboardBundleV3.test.js`, `dashboardPackageExport.test.js`, `dashboardPackageCandidate.test.js`, `dashboardPackageImportTransaction.test.js`, `staticContentPortablePackage.test.js`, `portableFlashdriveLaunch.test.js`, and the accepted static-image Playwright tests.

- [ ] **RED:** Add complete V4→V5 fixtures for asset/package/url/replacement-required images. Assert exact canonical keys, deterministic/idempotent IDs, chart V3, sourceVersion 2 placement, media-owned current/revision/default, and rejection of alternate keys. In existing tests, assert `resolveStaticImageSource(source,{mediaItems,assets,resolveAsset})` reads the media record; `resolveChartRendering` compares supplied resolution to library revision; durable panel commits keep dashboard V5; all Build/View/fullscreen/Present/Audience consumers render the same placement.
- [ ] Run `node --test tests/contentLibrarySchema.test.js tests/dashboardMigrationV5.test.js tests/dashboardBundleV5.test.js tests/mediaItems.test.js tests/staticSourceSchema.test.js tests/staticSourceResolver.test.js tests/chartRenderingV3.test.js tests/staticPanelPersistence.test.js tests/staticPanelTransaction.test.js tests/staticContentDraft.test.js tests/imageChartView.test.js tests/presentWorkspace.test.js tests/audienceDisplay.test.js tests/audienceStaticAssetReadiness.test.js tests/presentationProtocol.test.js tests/dashboardBundleV3.test.js tests/dashboardPackageExport.test.js tests/dashboardPackageCandidate.test.js tests/dashboardPackageImportTransaction.test.js tests/staticContentPortablePackage.test.js tests/portableFlashdriveLaunch.test.js`. Expected: FAIL on missing V5 owners and every remaining `origin`/source-revision/configVersion-4 assumption.
- [ ] **GREEN:** Implement migration before V5 validation. Change every listed consumer/commit path in this slice; `resolveStaticImageSource` validates placement then looks up `mediaItems[source.mediaId]`; `resolveChartRendering` uses `mediaItem.revision`; durable commit never forces V4. Keep placement metadata out of `MediaItem`. Do not leave compatibility shims that serialize old Image shape.
- [ ] Re-run the exact RED command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/static-image.spec.js tests/e2e/static-image-audience.spec.js --project=chromium`. Expected: PASS with inspected Build/View/fullscreen/Present/Audience checkpoints, correct current revision, zero Free-text presentation eligibility, unchanged four-stage static workflow, and passive Audience isolation.
- [ ] Update implementation evidence plus SCM-S01/S02/S03 and security/deviation records as engine/live wiring only; re-run the exact Step 7S 36-row matrix block; commit `feat(content): migrate image rendering to V5 media identity`.

### Task 2: Bounded GeoJSON Authority and Canonical Summary

**Rows:** SCM-S15 engine only. **Consumes:** `GEOJSON-LIMITS-DECISION.md`. **Produces:** frozen `GEOJSON_LIMITS`, `GeoJsonValidation`, and one `GeoJsonSummary` shape.

**Files:** Create `geoJsonValidation.js`, `geoJsonSourceEntry.js`, `tests/helpers/geoJsonBoundaryFixtures.js`, `tests/geoJsonValidation.test.js`, `tests/geoJsonSourceEntry.test.js`. Modify `loadDashboard.js`, `sourceRequest.js`, `dashboardSourceProviders.js`, their tests, and `SOURCE-CONTENT-MANAGER-POST-APPROVAL-OWNERSHIP-INVENTORY.md` if a verified live symbol differs.

- [ ] **RED:** Import `GEOJSON_LIMITS` in the boundary fixture builder. Assert every normal/warn/hard boundary, iterative depth/node fuses, GeometryCollection rejection, rollback before registration, and canonical summary with sorted `propertyKeys` plus exact `maxPropertyKeysPerFeature`. Assert `dataset/uploadedGeoJson`, tracked GeoJSON, and package descriptors normalize without `datasetProfiles`.
- [ ] Run `node --test tests/geoJsonValidation.test.js tests/geoJsonSourceEntry.test.js tests/progressiveDashboardLoad.test.js tests/chartSourceProfile.test.js tests/dashboardSemanticBoundary.test.js`. Expected: FAIL because the central authority/summary does not exist.
- [ ] **GREEN:** Implement the exact constants from Shared Contracts. Byte-gate before parse; traverse with an explicit stack; increment `structuralNodes` once per object/array; count own property keys per Feature; sort union `propertyKeys`; abort at hard limits. Existing loaders delegate and never copy constants.
- [ ] Re-run the exact command. Expected: PASS with no literal calibrated thresholds outside `geoJsonValidation.js` and the decision record.
- [ ] Update SCM-S15 engine evidence without promoting composition/real-use; commit `feat(content): centralize bounded GeoJSON validation`.

### Task 3: Draft Publication and Durable Rename Models

**Rows:** SCM-S03/S04/S13 engine. **Consumes:** Task 1 registry. **Produces:** frozen media/source metadata updates and explicit manager versus authoring draft transactions.

**Files:** Create `sourceEntrySchema.js`, `contentDraftTransaction.js`, `tests/sourceEntrySchema.test.js`, `tests/contentDraftTransaction.test.js`. Modify `browserAuthoredAssetStore.js`, `buildDirtyState.js`, `staticContentDraft.js`, `wizardDraft.js`, `assetReferenceGraph.js`, `reconcileAuthoredAssets.js`, and their tests.

- [ ] **RED:** Assert `renameMediaItem` and `renameSourceEntry` are pure, preserve identity/payload/current/revision, validate non-empty text, and survive the existing serialized-dashboard commit. Assert manager Add can publish an unused item, manager cancel publishes nothing, QMD/Image/chart drafts remain memory-owned until panel/chart commit, failed commit rolls back, and the prior Image is retained only while the contextual replacement draft is active.
- [ ] Run `node --test tests/mediaItems.test.js tests/sourceEntrySchema.test.js tests/contentDraftTransaction.test.js tests/buildDirtyState.test.js tests/staticContentDraft.test.js tests/wizardDraftV3.test.js tests/browserAuthoredAssetStore.test.js tests/authoredAssetCleanup.test.js`. Expected: FAIL on missing rename/publication owners.
- [ ] **GREEN:** Implement `renameMediaItem(item,{displayName,defaultDescription})` and `renameSourceEntry(entry,displayName)` as frozen copies. Implement draft records with `owner:'manager'|'qmd-panel'|'image-panel'|'chart'`, staged IDs, transaction ID, and explicit finalize/discard; expose only actual active records through `activeLocalAuthoringDrafts`.
- [ ] Re-run the exact command. Expected: PASS; reload fixtures contain no unsaved drafts, while deliberately added unused items persist.
- [ ] Update engine/lifetime evidence and records; commit `feat(content): add scoped content draft publication`.

### Task 4: Non-Modal Manager Shell and Catalogue Composition

**Rows:** SCM-C01/C02/C03 and shell portion of C04. **Consumes:** Tasks 1–3. **Produces:** mounted workspace, shared catalogue, details router, and durable rename UI.

**Files:** Create `SourceContentWorkspace.jsx`, `ContentCatalogue.jsx`, `MediaCatalogue.jsx`, `DataSourceCatalogue.jsx`, `ContentDetail.jsx`, `MediaDetail.jsx`, `DataSourceDetail.jsx`, `CsvDetail.jsx`, `DependencyList.jsx`, `source-content.css`, `tests/helpers/contentManagerHarness.jsx`, `tests/sourceContentWorkspace.test.js`, `tests/contentDetail.test.js`, `tests/e2e/source-content-manager.spec.js`. Modify `BuildCommandHeader.jsx`, `BuildWorkspace.jsx`, `buildCanvasRestoration.js`, `DashboardRenderer.jsx`, `main.jsx`, and their tests.

- [ ] **RED:** Assert three Build content commands, exact six/four stage arrays, wide non-modal auxiliary workspace, Media/Data Sources tabs, search/origin/status/usage and CSV/GeoJSON kind filters, desktop side-by-side, tablet list→detail with Back, phone Build-unsupported state, rename/default-description commits, and close restoration of canvas/scroll/selection/focus.
- [ ] Run `node --test tests/buildCommandHeader.test.js tests/buildWorkspaceV3.test.js tests/sourceContentWorkspace.test.js tests/contentDetail.test.js tests/wizardDraftV3.test.js tests/staticContentDraft.test.js`. Expected: FAIL on missing workspace/components.
- [ ] **GREEN:** Mount one workspace from `BuildWorkspace`; keep canvas mounted behind it; route details by item kind; commit rename/default changes through Task 3 functions and the existing serialized-dashboard commit; render all labels/filenames/captions/descriptions as React text.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-manager.spec.js --project=chromium`. Expected: PASS for separately named command/stage, restoration, and desktop/tablet composition tests. Inspect persistent canvas, target clearance, selection/query/filter continuity, pane stacking, focus return, and zero overflow at 1440×900 and 1024×768.
- [ ] Update C01–C04 evidence without claiming unfinished detail actions; commit `feat(content): add non-modal source content workspace`.

### Task 5: QMD Grammar, Safe Hosts, and Portal Runtime

**Rows:** SCM-S11 engine/live renderer and C07 fallback foundation. **Consumes:** Task 1 media identity. **Produces:** single grammar, safe host descriptors, and leased portal lifecycle.

**Files:** Create `portableQmdMedia.js`, `QmdMediaView.jsx`, `tests/portableQmdMedia.test.js`, `tests/qmdMediaView.test.js`. Modify `parsePortableQmd.js`, `renderPortableQmd.js`, `compilePortableQmd.js`, `FreeTextChartView.jsx`, existing `portableQmdDomSafety.test.js`, `portableQmdPolicy.test.js`, `freeTextChartView.test.js`, and `source-content.css`.

- [ ] **RED:** Assert serializer input requires `mediaId` and `alt`; decorative serializes and renders empty accessible alt. Assert malformed/raw URL/data/blob/file/unknown/external-only forms remain exact visible inert source and make zero requests. Assert a known local healthy record emits one host and one leased `<img>`; known later-missing/corrupt retains host/logical identity and fallback/repair navigation but emits no `<img>`. Assert portal recompilation and unmount each release exactly one lease with no orphan host/root.
- [ ] Run `node --test tests/portableQmdMedia.test.js tests/portableQmdDomSafety.test.js tests/portableQmdPolicy.test.js tests/qmdMediaView.test.js tests/freeTextChartView.test.js`. Expected: FAIL on missing grammar/host/portal behavior.
- [ ] **GREEN:** `extractPortableMediaNodes` calls `parsePortableQmd` and walks its AST. `renderPortableQmd` consults `options.mediaItems`; it emits inert text for unknown/external, or safe hosts carrying only validated media/node/token data for known local records including unhealthy ones. `FreeTextChartView` imports `createPortal` from `react-dom`, appends a cloned fragment, collects committed hosts, renders `QmdMediaView` portals, replaces portal entries on compilation, and clears them on unmount. `QmdMediaView` alone acquires/releases the object URL.
- [ ] Re-run the exact command. Expected: PASS including exactly-one acquire/release and no orphaned portal roots.
- [ ] Mount the real Free-text view harness at Build/View/fullscreen and inspect healthy plus missing/corrupt nodes; record that the accepted permissive-inert text policy is unchanged; update S11 engine/UI evidence only; commit `feat(qmd): render local media through safe portals`.

### Task 6: Direct Dependency Graph and No-Cascade Deletion

**Rows:** SCM-S05/S06/S07 and SCM-C08 delete branch. **Consumes:** Task 5 `extractPortableMediaNodes`. **Produces:** exact saved-use/retention graph and blocked/eligible delete transaction.

**Files:** Create `contentDependencyGraph.js`, `contentDeletionTransaction.js`, `ContentActionDialog.jsx`, `tests/contentDependencyGraph.test.js`, `tests/contentDeletionTransaction.test.js`, `tests/contentActionDialog.test.js`. Modify `DependencyList.jsx`, `buildDirtyState.js`, `DashboardRenderer.jsx`, `presentationProtocol.test.js`, and `source-content.css`.

- [ ] **RED:** Assert media direct uses are QMD/Image, CSV direct use is panel primary `sourceId`, GeoJSON direct use is `chart.presentation.map.geoSource`; page/section are breadcrumbs; actual drafts/replacement/transactions are temporary retainers. Assert Chrono/Scene/Scene-present are separate CSV impacts, Present/Audience messages/leases add no edge, and GeoJSON has no temporal impact. Assert blocked Delete is disabled with inline explanation/navigation and never opens a dialog; eligible Delete opens confirmation; failure/cancel leave byte-for-byte equality; no cascade or dangling ID.
- [ ] Run `node --test tests/contentDependencyGraph.test.js tests/contentDeletionTransaction.test.js tests/contentActionDialog.test.js tests/buildDirtyState.test.js tests/presentationProtocol.test.js`. Expected: FAIL on missing graph/transaction.
- [ ] **GREEN:** Build graph from dashboard plus Task 3 active retainers; derive QMD uses only through Task 5 parser. `prepareContentDeletion` returns `{status:'blocked'|'ready',directUses,retainers}`; `commitContentDeletion` accepts only ready plans and checks expected revision before atomic mutation.
- [ ] Re-run the exact command. Expected: PASS with impact contexts absent from saved dependency counts.
- [ ] Mount manager blocked/eligible delete states at desktop/tablet and inspect navigation/focus/no-dialog semantics; update S05–S07/C08 evidence; commit `feat(content): enforce direct dependency deletion rules`.

### Task 7: Media Upload, Pickers, External Import, and Restore — Journey A

**Rows:** SCM-C04/C05, SCM-R01, remaining S03/S13. **Consumes:** Tasks 3–6. **Produces:** complete manager Media Add and scoped Image/QMD selection/import flows.

**Files:** Create `MediaPicker.jsx`, `tests/contentPicker.test.js`, `tests/e2e/source-content-media.spec.js`. Modify `MediaCatalogue.jsx`, `MediaDetail.jsx`, `ContentDetail.jsx`, `FreeTextSourceEditor.jsx`, `ImageSourceEditor.jsx`, `StaticContentWizard.jsx`, `staticContentDraft.js`, `contentDraftTransaction.js`, and their tests.

- [ ] **RED:** Assert manager upload previews image, edits name/default description, reports duplicate hash, offers explicit **Reuse existing** and **Create separate item**, and publishes only on **Add to dashboard**. Assert physical bytes dedupe both ways but logical identity collapses only for Reuse. Assert QMD picker lists local items as selectable and External HTTPS items in a separate non-selectable section with **Import as local media**; successful local upload or browser-permitted fetch creates a panel-draft local ID selected only in that QMD draft; cancel creates no library entry. Assert manager-detail import is library-owned. Assert original external item/Image uses never change; no proxy/CORS bypass/silent fetch; failed fetch requires file upload. Assert Image may select external. Assert default description pre-fills new Image/QMD alt but later default edits never rewrite existing alt. Assert visible Restore previous image lifetime and unchanged Reset.
- [ ] Run `node --test tests/contentPicker.test.js tests/contentDraftTransaction.test.js tests/mediaItems.test.js tests/staticContentDraft.test.js tests/staticPanelComposition.test.js tests/contentDetail.test.js`. Expected: FAIL on missing picker/import/upload flows.
- [ ] **GREEN:** Implement the exact ownership/lifetime rules above. Picker QMD selection returns only local draft/committed IDs. Its import row never calls selection with the external ID. Validate every created local item through the existing raster pipeline.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-media.spec.js --project=chromium --grep "Journey A — media create reuse default external import restore dependencies delete"`. Expected: PASS at Build 1440×900/1024×768 and QMD View 390×844. Inspect identity/hash/alt, cancellation inventories, original external continuity, request log, restoration status/action area, focus/context, dependency breadcrumb, blocked no-dialog, then eligible delete.
- [ ] Update all Journey-A rows and evidence only after checkpoint inspection; commit `feat(content): add scoped media reuse and import flows`.

### Task 8: Global Media Replacement — Journey B

**Rows:** SCM-S08, SCM-R02, replace branch of C08. **Consumes:** Tasks 1, 5–7. **Produces:** identity-preserving media replacement transaction.

**Files:** Create `contentReplacementTransaction.js`, `tests/contentReplacementTransaction.test.js`. Modify `MediaDetail.jsx`, `ContentActionDialog.jsx`, `browserAuthoredAssetStore.js`, `ImageChartView.jsx`, `QmdMediaView.jsx`, `staticPanelTransaction.js`, and their tests.

- [ ] **RED:** Assert prepare validates candidate before mutation; confirm preserves `mediaId`, increments revision, changes current hash, atomically updates QMD/Image resolution, and leaves every placement alt/decorative/crop/rotation/fit plus zoom unchanged. Assert active leases remain valid until release. Inject failures at stage/write/dashboard/publish and assert complete rollback/cleanup.
- [ ] Run `node --test tests/contentReplacementTransaction.test.js tests/staticSourceSchema.test.js tests/staticPanelTransaction.test.js tests/imageChartView.test.js tests/qmdMediaView.test.js tests/browserAuthoredAssetStore.test.js`. Expected: FAIL on missing transaction/global-resolution behavior.
- [ ] **GREEN:** Implement prepare/commit with expected-current revision check, staged bytes, one dashboard commit, publication, and compensation. Never rewrite placements.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-media.spec.js --project=chromium --grep "Journey B — global media replacement preserves placement state"`. Expected: PASS with inspected Build/View/fullscreen QMD+Image updates, contextual equality, lease safety, and injected rollback.
- [ ] Update S08/R02/C08 evidence; commit `feat(content): replace media revisions atomically`.

### Task 9: QMD Placement Inspector and Responsive Geometry — Journey C

**Rows:** SCM-C06/C07, SCM-R03, completion of S11. **Consumes:** Task 5 portal/runtime and Task 7 picker. **Produces:** allowlisted authoring controls and responsive/RTL production geometry.

**Files:** Create `QmdMediaInspector.jsx`, `tests/qmdMediaInspector.test.js`, `tests/e2e/qmd-reusable-media.spec.js`. Modify `portableQmdMedia.js`, `FreeTextSourceEditor.jsx`, `FreeTextChartView.jsx`, `QmdMediaView.jsx`, `source-content.css`, and their tests.

- [ ] **RED:** Assert widths 25/33/50/66/75/100 and integer custom 10–100, align start/center/end, flow block/wrap-start/wrap-end, frame none/outline/card, caption, alt/decorative, Change image versus Open media item, and rejection of arbitrary pixels/CSS/attributes. Assert width is content-column relative, height auto, wrap max 50%, narrow panels collapse to block, logical alignment follows RTL, stored dimensions reserve space, and no panel horizontal overflow.
- [ ] Run `node --test tests/qmdMediaInspector.test.js tests/portableQmdMedia.test.js tests/qmdMediaView.test.js tests/freeTextChartView.test.js tests/portableQmdDomSafety.test.js`. Expected: FAIL on missing controls/styles/serialization.
- [ ] **GREEN:** Serialize only the exact contract; apply token classes/data attributes from `source-content.css`; keep caption distinct from alt and decorative alt empty; Change image mutates placement ID only, never library bytes/revision.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/qmd-reusable-media.spec.js --project=chromium --grep "Journey C — QMD media controls responsive RTL geometry and request authority"`. Expected: PASS at Build 1440×900/1024×768, View 390×844, and fullscreen. Inspect measured widths, wrap/collapse, RTL alignment, frame/caption, reserved aspect, missing fallback, request log, and zero overflow.
- [ ] Update S11/C06/C07/R03 evidence; commit `feat(qmd): add responsive media placement controls`.

### Task 10: CSV Manager Add and Six-Stage Authoring — Journey D

**Rows:** CSV portions of SCM-S04/C04/C05 and SCM-R04. **Consumes:** Tasks 3–4. **Produces:** deliberate unused CSV manager Add and chart-draft CSV registration/selection.

**Files:** Create `DataSourcePicker.jsx` and `tests/e2e/source-content-csv.spec.js`. Modify `DataSourceCatalogue.jsx`, `DataSourceDetail.jsx`, `CsvDetail.jsx`, `sourceEntrySchema.js`, `contentDraftTransaction.js`, `wizardDraft.js`, `ChartWizardV3.jsx`, `DataSourceStep.jsx`, existing CSV viewer components/protocol, `tests/sourceEntrySchema.test.js`, `tests/contentDraftTransaction.test.js`, `tests/contentDetail.test.js`, `tests/wizardDraftV3.test.js`, `tests/chartAuthoringComponentsV3.test.js`.

- [ ] **RED:** Assert manager CSV upload parses/profiles/previews, edits label, warns on matching content without auto-dedupe, publishes an unused `sourceEntry`/`dataSource`/`datasetProfile` only on Add, and cancels cleanly. Assert chart-flow upload stays chart-draft-owned, registers/selects on completed chart, exact six stages remain, and manager later shows preview/search/origin/health/usage/download.
- [ ] Run `node --test tests/sourceEntrySchema.test.js tests/contentDraftTransaction.test.js tests/contentDetail.test.js tests/sourceViewer.test.js tests/sourceViewerSort.test.js tests/wizardDraftV3.test.js tests/chartAuthoringComponentsV3.test.js`. Expected: FAIL on missing manager/Add/picker wiring.
- [ ] **GREEN:** Reuse existing Papa Parse/profile/viewer owners; do not add cell editing or duplicate authority. Commit source entry, descriptor, profile, and chart together through Task 3 publication.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-csv.spec.js --project=chromium --grep "Journey D — CSV upload through six stages then catalogue management"`. Expected: PASS at 1440×900/1024×768 with inspected stage count, IDs/profile, committed/unused and cancelled inventories, preview/search/download, dependency, focus, and reload.
- [ ] Update R04 and focused S04/C04/C05 evidence; commit `feat(content): manage CSV add and chart selection`.

### Task 11: CSV Direct Replacement Compatibility — Journey E

**Rows:** SCM-S09/R05 and CSV replace branch of C08. **Consumes:** Tasks 6 and 10. **Produces:** structural prepare/block/import-as-new/remap and compatible non-temporal commit.

**Files:** Create `csvReplacementTransaction.js`, `tests/csvReplacementTransaction.test.js`, `tests/chartConfigV3.test.js`. Modify `DataSourceDetail.jsx`, `ContentActionDialog.jsx`, `DependencyList.jsx`, `loadDashboard.js`, `prepareChartData.js`, and their tests.

- [ ] **RED:** For every directly dependent chart, assert parse/safety/size/missing encoding column hard-blocks before mutation; map chart primary CSV is checked while its GeoJSON is unchanged. Assert typed reasons, no-op cancel, import-as-new distinct `sourceId`, guided remap targets, expected-current check, and injected rollback. Valid structurally compatible non-temporal replacement preserves `sourceId` and chart V3.
- [ ] Run `node --test tests/csvReplacementTransaction.test.js tests/contentActionDialog.test.js tests/contentDependencyGraph.test.js tests/chartConfigV3.test.js tests/chartRenderingV3.test.js`. Expected: FAIL on missing CSV transaction/compatibility.
- [ ] **GREEN:** Implement direct chart compatibility from exact encodings; prepare candidate descriptor/profile before commit; offer import/remap only after block; commit descriptor/profile/source metadata atomically.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-csv.spec.js --project=chromium --grep "Journey E — incompatible CSV replacement blocks and imports as new"`. Expected: PASS with original source/profile/render/GeoJSON equality, reason, new ID, remap navigation, dialog focus, and cancel.
- [ ] Update S09/R05/C08 evidence; commit `feat(content): block incompatible CSV replacement`.

### Task 12: CSV Temporal Impact and Durable Review Status — Journey F

**Rows:** SCM-S10/R06 and temporal branch of C08. **Consumes:** Task 11 structurally valid candidate. **Produces:** exact persisted `TemporalReview`, impact contexts, clearing, and Present warning.

**Files:** Create `src/charting/time/temporalReview.js`. Modify `src/content-library/csvReplacementTransaction.js`, `src/content-library/contentDependencyGraph.js`, `src/charting/time/chronoGroupModel.js`, `src/charting/time/dashboardTemporalConfig.js`, `src/charting/time/sceneSchema.js`, `src/charting/time/temporalNeedsAttention.js`, `src/components/time/chronoContentState.js`, `src/components/build/BuildWorkspace.jsx` save dispatches, `src/components/presentation/PresentWorkspace.jsx`, dashboard migration/bundle preservation, and `tests/csvReplacementTransaction.test.js`, `chronoGroupModelV3.test.js`, `temporalRuntimeIntegration.test.js`, `sceneSchema.test.js`, `temporalNeedsAttention.test.js`, `chronoContentState.test.js`, `scenePresentTransition.test.js`, `buildWorkspaceV3.test.js`, `presentWorkspace.test.js`, `presentationProtocol.test.js`, `dashboardMigrationV5.test.js`, `dashboardBundleV5.test.js`.

- [ ] **RED:** Assert exact impact kinds/IDs: `chrono-group` for array-found group members using source; `scene` for top-level Scene members plus defensive legacy `chartIds`/`frames.chartId`, intersecting affected charts; `scene-presentation` with Scene ID when `scene.present.chartIds` intersects. Assert cancel equality; confirm marks Chrono/Scene `needs-review`, Scene present `degraded`; unrelated configs untouched; repeat replacement unions sorted unique IDs; rollback restores all. Assert impacts are not dependencies.
- [ ] **RED schema/live:** Assert optional exact keys/statuses/non-empty IDs; malformed rejected; V4 import absent; V5 round-trip exact. Align `temporalNeedsAttention` with `sceneSchema` layouts `single`, `vertical-divider`, `horizontal-divider`, `large-top`, `large-bottom`, `large-left`, `large-right`, and `grid-2x2`. Assert findings/cards visible; `BuildWorkspace` Chrono save clears all IDs on that group and Scene save clears all Scene IDs plus all `scene.present` IDs when the composition validates. Assert active Scene present shows degraded warning while continuing to render. Assert `presentationProtocol` and audience actions/messages contain no review status.
- [ ] Run `node --test tests/csvReplacementTransaction.test.js tests/contentDependencyGraph.test.js tests/chronoGroupModelV3.test.js tests/temporalRuntimeIntegration.test.js tests/sceneSchema.test.js tests/temporalNeedsAttention.test.js tests/chronoContentState.test.js tests/scenePresentTransition.test.js tests/presentWorkspace.test.js tests/presentationProtocol.test.js tests/dashboardMigrationV5.test.js tests/dashboardBundleV5.test.js`. Expected: FAIL on absent metadata/validation/projection.
- [ ] **GREEN:** Implement `validateTemporalReview`, `mergeTemporalReview`, and `clearTemporalReviewSourceIds`; add optional allowed keys without making them required; use `dashboard.chronoGroups.find`, top-level `dashboard.scenes`, and durable `scene.present`. `SourceEntry.updateStatus` may summarize but never replaces config marks. Manual Present/presentationState remain transient.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-csv.spec.js --project=chromium --grep "Journey F — valid temporal CSV replacement warns then confirms"`. Expected: PASS at Build/Present 1440×900 with no-op cancel, exact impacts, stable ID/new data, visible review/degraded state, safe rendering, clearing after valid save, and no audience status.
- [ ] Update S10/R06/C08 and the technical/security record with exact metadata; commit `feat(content): persist CSV temporal review impacts`.

### Task 13: GeoJSON Manager, Selector, and Shared Map Budget — Journey I

**Rows:** SCM-C09/R09 and mounted SCM-S15; focused S04/S05/S07/C04/C05. **Consumes:** Tasks 2, 4, 6. **Produces:** GeoJSON Add/detail/preview/selector and one shared Build map budget.

**Files:** Create `GeoJsonDetail.jsx`, `GeoJsonPreview.jsx`, `BuildMapBudgetContext.jsx`, `tests/geoJsonContentManager.test.js`, `tests/e2e/source-content-geojson.spec.js`. Modify `DataSourceCatalogue.jsx`, `DataSourceDetail.jsx`, `DataSourcePicker.jsx`, `SourceContentWorkspace.jsx`, `BuildWorkspace.jsx`, `EChartsChartView.jsx`, `geographySource.js`, `DataSourceStep.jsx`, `contentDraftTransaction.js`, `contentDependencyGraph.js`, `contentDeletionTransaction.js`, and related tests.

- [ ] **RED model/UI:** Assert manager GeoJSON upload validates and shows canonical feature count, geometry distribution, bbox, sorted property keys, max keys per feature, accessible text fallback, editable label, and Add/cancel lifetime. Assert kind filter and tracked/package/uploaded options; close the known selector gap for `kind:'dataset',type:'uploadedGeoJson'` without changing six stages.
- [ ] **RED budget:** Assert one provider is shared by `EChartsChartView` and `GeoJsonPreview`; acquire/release/activation are deterministic; visible dashboard maps outrank previews; allocations 1–2 normal, 3–4 visible degraded warning, fifth+ deferred/lazy; release activates next eligible request; concurrency never rejects/deletes a source.
- [ ] Run `node --test tests/geoJsonContentManager.test.js tests/geoJsonValidation.test.js tests/geoJsonSourceEntry.test.js tests/chartAuthoringComponentsV3.test.js tests/contentDependencyGraph.test.js tests/contentDeletionTransaction.test.js tests/embeddedEChartsItemV3.test.js`. Expected: FAIL on missing detail/preview/budget and uploaded selector gap.
- [ ] **GREEN:** Implement one Build provider and the exact slot states. Both live maps and previews call `useBuildMapBudgetSlot`; no local counters. GeoJSON detail consumes only Task 2 summary. Manager Add publishes an unused source; chart upload publishes with chart.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-geojson.spec.js --project=chromium --grep "Journey I — GeoJSON upload select preview dependency and blocked delete"`. Expected: PASS at 1440×900/1024×768 with inspected Add/cancel inventories, six stages, all eligible representations, canonical summary, map/text fallback, shared four-slot behavior, dependency breadcrumb, and blocked Delete with no dialog.
- [ ] Update S15/C09/R09 and focused rows only after inspection; commit `feat(content): manage GeoJSON with shared map budget`.

### Task 14: GeoJSON Replacement and Relink — Journeys J and K

**Rows:** SCM-S16/R10/R11 and GeoJSON replace branch of C08. **Consumes:** Tasks 2, 6, 13. **Produces:** stable-source validated replacement outcomes.

**Files:** Create `geoJsonReplacementTransaction.js`, `tests/geoJsonReplacementTransaction.test.js`, `tests/prepareGeographyData.test.js`. Modify `GeoJsonDetail.jsx`, `ContentActionDialog.jsx`, `DependencyList.jsx`, `prepareGeographyData.js`, `geographyAdapter.js`, `EChartsChartView.jsx`, and `source-content-geojson.spec.js`.

- [ ] **RED hard block:** Derive boundary candidates from `GEOJSON_LIMITS`; assert malformed/empty/unsupported/limit-failing, selected join-property removal, zero join coverage, or directly unusable map blocks atomically and offers import-as-new/remap. Original descriptor/payload/summary/map stays exact.
- [ ] **RED warning:** Assert feature-count/bbox/geometry-mix/reduced-nonzero join coverage warns; cancel is no-op; confirm preserves `sourceId`, publishes new payload/summary/map, and creates zero Chrono/Scene/presentation contexts. Relink follows the same validation.
- [ ] Run `node --test tests/geoJsonReplacementTransaction.test.js tests/geoJsonValidation.test.js tests/geoJsonSourceEntry.test.js tests/prepareGeographyData.test.js tests/contentActionDialog.test.js tests/contentDependencyGraph.test.js tests/chronoGroupModelV3.test.js`. Expected: FAIL on missing replacement owner/outcomes.
- [ ] **GREEN:** Prepare through Task 2 authority, then direct map/join checks; publish only after expected-current recheck; support import-as-new/remap on block and transactional rollback.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run each test independently: `pnpm.cmd test:e2e -- tests/e2e/source-content-geojson.spec.js --project=chromium --grep "Journey J — invalid GeoJSON replacement blocks and imports as new"`; then the same command with `Journey K — valid GeoJSON geometry change warns then confirms`. Expected: both PASS with inspected original/new map geometry, IDs, dialogs, cancel, rollback, and no temporal contexts.
- [ ] Update S16/R10/R11/C08 evidence; commit `feat(content): validate GeoJSON replacement outcomes`.

### Task 15: V5 Persistence, Package, and Offline Portability — Journey G

**Rows:** SCM-S12/R07 and final S01/S02 package layer. **Consumes:** Tasks 1–14. **Produces:** atomic V5 persistence/export/import retaining used and unused managed content.

**Files:** Create `contentPackageValidation.js`, `tests/contentPackageValidation.test.js`, `tests/e2e/source-content-portability.spec.js`. Modify `tests/dashboardBundleV5.test.js`, `dashboardBundleV3.js`, `dashboardAssetPersistence.js`, `browserStorage.js`, `dashboardPackageExport.js`, `dashboardPackageCandidate.js`, `dashboardPackageImportTransaction.js`, `App.jsx`, and their tests.

- [ ] **RED:** Assert exact dashboard/package V5 and chart V3, migration-before-validation, V4 omission of temporal review, exact V5 round-trip of it, retained unused local media/CSV/GeoJSON, physical image payload dedupe, CSV-only profiles, canonical GeoJSON summary, QMD local references, hashes/MIME/dimensions/animation/reference checks, and all-or-nothing missing/corrupt/quota rollback.
- [ ] Run `node --test tests/dashboardMigrationV5.test.js tests/dashboardBundleV5.test.js tests/dashboardAssetPersistence.test.js tests/dashboardPackageExport.test.js tests/dashboardPackageCandidate.test.js tests/dashboardPackageImportTransaction.test.js tests/contentPackageValidation.test.js tests/staticContentPortablePackage.test.js tests/portableFlashdriveLaunch.test.js`. Expected: FAIL on incomplete V5 package boundary.
- [ ] **GREEN:** Serialize logical records separately from existing payload authorities; include every retained stored/packaged media record even unused; validate whole candidate before replacing current dashboard/store.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-portability.spec.js --project=chromium --grep "Journey G — V5 offline round trip and V4 migration retain library"`. Expected: PASS at Build 1440×900, QMD View 390×844, fullscreen, and offline with exact IDs/revisions/hashes, used/unused items, CSV/GeoJSON, QMD/Image/map render, and zero requests.
- [ ] Update S01/S02/S12/R07 evidence; commit `feat(content): package the complete V5 content library`.

### Task 16: Health, Cleanup, and Isolated Recovery — Journey H

**Rows:** SCM-S14/R08. **Consumes:** Tasks 3, 5, 8, 11, 14, 15. **Produces:** typed health, explicit repair/relink, and safe startup cleanup.

**Files:** Create `contentHealth.js`, `tests/contentHealth.test.js`, `tests/e2e/source-content-recovery.spec.js`. Modify `assetReferenceGraph.js`, `reconcileAuthoredAssets.js`, `dashboardAssetPersistence.js`, `MediaDetail.jsx`, `DataSourceDetail.jsx`, `GeoJsonDetail.jsx`, `QmdMediaView.jsx`, `ChartView.jsx`, `dashboardSourceProviders.js`, and their tests.

- [ ] **RED:** Assert Ready/External/Missing/Corrupt/Needs relink/Needs review transitions; identity/dependencies persist; unhealthy QMD emits no image/request but keeps node/repair; passive View/fullscreen explains failure; failed CSV/GeoJSON repair retains last committed descriptor/profile/payload. Assert cleanup retains library records, saved uses, actual drafts, contextual Image replacement, and active transactions; after Save/Discard/restore/transaction resolution it reclaims only abandoned staging. Inject persistence/reload failures and assert rollback plus sibling continuity.
- [ ] Run `node --test tests/contentHealth.test.js tests/authoredAssetCleanup.test.js tests/dashboardAssetPersistence.test.js tests/qmdMediaView.test.js tests/chartRenderingV3.test.js tests/geoJsonReplacementTransaction.test.js tests/csvReplacementTransaction.test.js`. Expected: FAIL on missing health/repair/reference behavior.
- [ ] **GREEN:** Derive health without erasing identity; repair through the corresponding validated replacement/relink transaction; include only actual retainers in cleanup; never invent undo history.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-recovery.spec.js --project=chromium --grep "Journey H — missing corrupt and relink repair stay isolated"`. Expected: PASS at Build/View 1440×900, QMD View 390×844, and fullscreen with inspected identity/dependencies, fallback, repair navigation, last-good data, exact inventories, and siblings.
- [ ] Update S14/R08 evidence; commit `feat(content): recover managed content without identity loss`.

### Task 17: Integrated Fidelity Promotion and Completion Submission

**Rows:** all 36, but promote only from retained evidence. **Consumes:** Tasks 1–16. **Produces:** truthful final ledger, reviewed checkpoints, and master submission. No production behavior is added here.

**Files:** Modify only `SOURCE-CONTENT-MANAGER-IMPLEMENTATION-EVIDENCE.md`, amendment fidelity/security records, this plan ledger/checklists, and `MASTER-REVIEW-SUBMISSION.md`.

- [ ] Run the amendment-targeted complete deterministic sweep below. Expected: every named affected test from Tasks 1–16 passes; do not label a smaller selection complete.

```powershell
$tests = @(
  'tests/contentLibrarySchema.test.js','tests/dashboardMigrationV5.test.js','tests/dashboardBundleV5.test.js','tests/mediaItems.test.js','tests/sourceEntrySchema.test.js','tests/geoJsonValidation.test.js','tests/geoJsonSourceEntry.test.js','tests/contentDraftTransaction.test.js','tests/contentDependencyGraph.test.js','tests/contentDeletionTransaction.test.js','tests/contentReplacementTransaction.test.js','tests/csvReplacementTransaction.test.js','tests/geoJsonReplacementTransaction.test.js','tests/contentHealth.test.js','tests/contentPackageValidation.test.js','tests/sourceContentWorkspace.test.js','tests/contentDetail.test.js','tests/contentPicker.test.js','tests/qmdMediaInspector.test.js','tests/qmdMediaView.test.js','tests/portableQmdMedia.test.js','tests/portableQmdDomSafety.test.js','tests/portableQmdPolicy.test.js','tests/freeTextChartView.test.js','tests/contentActionDialog.test.js','tests/geoJsonContentManager.test.js','tests/chartConfigV3.test.js','tests/prepareGeographyData.test.js',
  'tests/staticSourceSchema.test.js','tests/staticSourceResolver.test.js','tests/chartRenderingV3.test.js','tests/staticPanelPersistence.test.js','tests/staticPanelTransaction.test.js','tests/staticContentDraft.test.js','tests/staticPanelComposition.test.js','tests/imageChartView.test.js','tests/presentWorkspace.test.js','tests/audienceDisplay.test.js','tests/audienceStaticAssetReadiness.test.js','tests/presentationProtocol.test.js','tests/dashboardBundleV3.test.js','tests/dashboardPackageExport.test.js','tests/dashboardPackageCandidate.test.js','tests/dashboardPackageImportTransaction.test.js','tests/dashboardAssetPersistence.test.js','tests/staticContentPortablePackage.test.js','tests/portableFlashdriveLaunch.test.js','tests/buildCommandHeader.test.js','tests/buildWorkspaceV3.test.js','tests/buildDirtyState.test.js','tests/browserAuthoredAssetStore.test.js','tests/authoredAssetCleanup.test.js','tests/wizardDraftV3.test.js','tests/chartAuthoringComponentsV3.test.js','tests/sourceViewer.test.js','tests/sourceViewerSort.test.js','tests/progressiveDashboardLoad.test.js','tests/chartSourceProfile.test.js','tests/dashboardSemanticBoundary.test.js','tests/embeddedEChartsItemV3.test.js','tests/chronoGroupModelV3.test.js','tests/temporalRuntimeIntegration.test.js','tests/sceneSchema.test.js','tests/temporalNeedsAttention.test.js','tests/chronoContentState.test.js','tests/scenePresentTransition.test.js'
)
node --test $tests
if ($LASTEXITCODE -ne 0) { throw 'Amendment-targeted deterministic sweep failed.' }
```

- [ ] Run all seven retained files: `pnpm.cmd test:e2e -- tests/e2e/source-content-manager.spec.js tests/e2e/source-content-media.spec.js tests/e2e/qmd-reusable-media.spec.js tests/e2e/source-content-csv.spec.js tests/e2e/source-content-geojson.spec.js tests/e2e/source-content-portability.spec.js tests/e2e/source-content-recovery.spec.js --project=chromium`. Expected: 11 separately named A–K journeys plus manager composition cases pass. Inspect material checkpoints; do not accept screenshots without behavioral/geometry assertions.
- [ ] Re-run the exact Step 7S 36-row block from the preflight. Expected: 36/36 Passing across engine/UI/fidelity.
- [ ] If and only if the master marks this execution pre-merge/release, run `pnpm.cmd build`, `pnpm.cmd test`, and the full Playwright suite. Otherwise record these as the Step 9/pre-merge gate and do not duplicate already sufficient targeted evidence.
- [ ] Promote each amendment row only when its live owner, deterministic falsifier, browser journey, viewport/state, inspected evidence, and deviation record are present. Distinguish engine implemented, UI implemented, fidelity verified, and independent implementation review clean.
- [ ] Verify all eleven journeys remain independent, all accepted negative assertions remain, no new deferral is hidden, and every plan checkbox/status/evidence statement is truthful; commit `docs(content): submit Source Content Manager implementation evidence`.
- [ ] Run `git status --short` and require no output after the commit.

## One-to-One 36-Row Execution Ledger

Every row remains proposed until its same-slice record update. “Evidence” means retained values/DOM/geometry/request/transaction facts plus checkpoint inspection, not screenshot existence.

| Row / accepted invariant | Production owner(s) | Cheapest deterministic falsifier | Retained browser task | Material viewport/state | Meaningful evidence | Status | Deviation | Task(s) |
|---|---|---|---|---|---|---|---|---|
| SCM-S01 — dashboard/bundle V5; V4 migration first; chart V3 | `dashboardConfigStructure.js`; `dashboardBundleV3.js`; `migrateDashboardV4ToV5.js` | migration/bundle exact versions, order, idempotence | V4 mixed import; G | Build 1440×900; valid/malformed/offline | serialized versions/keys/IDs; unchanged chart V3 | Proposed / unimplemented / not verified | SCM-D02 | 1,15,17 |
| SCM-S02 — exact library keys; existing payload authorities | `contentLibrarySchema.js`; `loadDashboard.js` | alternate keys/authority duplication rejected | manager identity/detail correlation | Build 1440×900; all kinds/origins | exact registry→asset/data/profile readings | Proposed / unimplemented / not verified | SCM-D03 | 1,4,15,17 |
| SCM-S03 — stable media identity/revision; explicit logical reuse; default only pre-fills new placements | `mediaItems.js`; authored asset store | IDs, physical byte count, revision, old/new alt | A default/dedupe branch | Build 1440×900; duplicate/default edit | logical/physical counts and placement alts | Proposed / unimplemented / not verified | SCM-D03,D09 | 1,3,7,17 |
| SCM-S04 — trusted provenance visibility; generated hidden | `sourceEntrySchema.js` | adversarial filenames and explicit ownership | manager/picker origin/filter cases; D/I | Build 1440×900/1024×768 | exact visible/hidden IDs and labels | Proposed / unimplemented / not verified | SCM-D06 | 3,4,10,13,17 |
| SCM-S05 — direct uses plus actual retainers only | `contentDependencyGraph.js`; `buildDirtyState.js` | exact edge kinds/lifetimes/breadcrumbs | A and I blockers | Build 1440×900/1024×768 | IDs/kinds/breadcrumbs/retainer lifetime | Proposed / unimplemented / not verified | SCM-D04,D06 | 6,7,13,17 |
| SCM-S06 — temporal/presentation contexts are not dependencies | dependency graph; `presentationProtocol.js`; asset graph | dependency count invariant and no message status | Present/Audience invariant; F contexts | Build/Present/Audience | direct counts, separate impacts, no runtime edge | Proposed / unimplemented / not verified | SCM-D06,D07 | 6,12,17 |
| SCM-S07 — no-cascade deletion; all real owners resolve first | deletion transaction; dependency graph | block/cancel/failure equality; no dangling ID | A/I blocked navigation then eligible delete | Build 1440×900/1024×768 | disabled/no-dialog, atomic inventory | Proposed / unimplemented / not verified | SCM-D04,D06 | 6,7,13,17 |
| SCM-S08 — replacement preserves mediaId and placement/view state | media replacement; Image/QMD renderers | revision and contextual equality; rollback | B | Build/View/fullscreen | new bytes/revision; preserved settings/lease | Proposed / unimplemented / not verified | SCM-D05 | 8,17 |
| SCM-S09 — incompatible CSV blocks and offers import/remap | CSV replacement; chart preparation | parse/encoding/size/safety block; rollback | E | Build 1440×900; map primary CSV | original descriptor/profile/render/GeoJSON; new ID | Proposed / unimplemented / not verified | SCM-D07 | 11,17 |
| SCM-S10 — valid CSV temporal change warns/commits/marks exact configs | CSV replacement; temporal schemas/projection | exact impacts/status/union/clear/rollback | F | Build/Present 1440×900 | cancel no-op, marks, new data, safe render | Proposed / unimplemented / not verified | SCM-D07 | 12,17 |
| SCM-S11 — only known local QMD media renders; unsafe/unknown/external inert | portable QMD grammar/renderer/portal | destination corpus, request log, lease lifecycle | C request-authority branch | Build 1440×900; View 390×844; fullscreen | DOM/text/hosts/requests/acquire-release | Proposed / unimplemented / not verified | SCM-D01,D10 | 5,9,17 |
| SCM-S12 — V5 package retains all managed content, including unused, atomically | bundle/export/import/content package validator | exact round trip and corrupt/quota rollback | G | Build 1440×900; offline | IDs/hashes/unused/type-correct summaries/prior equality | Proposed / unimplemented / not verified | SCM-D02,D08 | 15,17 |
| SCM-S13 — manager explicit Add; authoring commit with panel/chart; contextual prior Image only | draft transaction; cleanup; dirty state | every commit/cancel/reset/restore boundary | A draft/Restore branch | Build 1440×900/1024×768; reload | durable/staged counts and exact lifetime | Proposed / unimplemented / not verified | SCM-D05,D09 | 3,7,17 |
| SCM-S14 — typed health; explicit repair; safe cleanup | content health; reference graph; cleanup | health transitions and retained/reclaimed inventory | H | Build/View 1440×900; View 390×844; fullscreen | persistent identity/fallback/last-good/siblings | Proposed / unimplemented / not verified | SCM-D04,D08 | 16,17 |
| SCM-S15 — canonical GeoJSON summary and exact iterative limits | GeoJSON validation/source entry | imported-constant boundaries; exact counts/summary | I upload/preview/runtime | Build 1440×900/1024×768 | facts/summary/limits/rollback/mounted consumer | Proposed / unimplemented / not verified | SCM-D06,D07 | 2,13,17 |
| SCM-S16 — GeoJSON structural/join/limit blocks; compatible geometry/coverage warns; no temporal contexts | GeoJSON replacement; map preparation | all block/warn/cancel/confirm cases | J and K | Build 1440×900/1024×768 | stable ID or prior equality, summaries/maps, zero impacts | Proposed / unimplemented / not verified | SCM-D07 | 14,17 |
| SCM-C01 — Source content command without stage drift | Build header/workspace; manager shell | exact command and six/four-stage arrays | three-command composition case | Build 1440×900/1024×768 | control/workspace/focus/stages | Proposed / unimplemented / not verified | SCM-D06 | 4,17 |
| SCM-C02 — wide non-modal workspace restores canvas/scroll/selection/focus; phone unchanged | Build workspace/restoration; manager | exact snapshot/restoration and phone route | restoration case | 1440×900;1024×768;390×844 unsupported | before/after boxes/scroll/IDs/focus | Proposed / unimplemented / not verified | SCM-D06 | 4,17 |
| SCM-C03 — desktop side-by-side; tablet list/detail+Back; persistent state/no overflow | manager/catalogue/detail | responsive state and accessible regions | composition case | 1440×900/1024×768; empty/loading/error | region tree/query/filter/selection/geometry | Proposed / unimplemented / not verified | SCM-D06 | 4,17 |
| SCM-C04 — type-appropriate details/actions/dependencies/defaults/import | detail components; dependency list | text-only metadata, action eligibility, categories | A/I detail branches | 1440×900/1024×768; all health/origins | accessible tree/action inventory/target | Proposed / unimplemented / not verified | SCM-D06,D10 | 4,6,7,10,13,17 |
| SCM-C05 — pickers preserve workflows and exact draft/import eligibility | media/data pickers and authoring editors | inventories, stage counts, focus, draft ownership | A/D/I picker branches | Build 1440×900/1024×768 | selected ID/focus/stages/cancel inventory | Proposed / unimplemented / not verified | SCM-D01,D05,D06,D09,D10 | 7,10,13,17 |
| SCM-C06 — progressive exact QMD controls; Change differs from Replace | inspector; serializer | tokens/labels/focus/command routing | C controls branch | Build 1440×900/1024×768 | QMD text/control inventory/unchanged revision | Proposed / unimplemented / not verified | SCM-D01,D03,D05 | 9,17 |
| SCM-C07 — aspect/reserved size/fit/RTL/wrap max/narrow collapse | FreeText view; QMD view; CSS | token/DOM/lease/fallback semantics | C geometry branch | Build/View 1440×900;1024×768;390×844;fullscreen;RTL | bounds/aspect/overflow/wrap/collapse | Proposed / unimplemented / not verified | SCM-D01 | 5,9,17 |
| SCM-C08 — browse non-modal; blocked delete no dialog; eligible destructive modals | action dialog; manager; transactions | disabled/modal/focus/feedback states | A/B/E/F/J/K action branches | 1440×900/1024×768; block/warn/error | no-dialog block; modal name/focus/return | Proposed / unimplemented / not verified | SCM-D05,D06,D07 | 6,8,11,12,14,17 |
| SCM-C09 — CSV/GeoJSON filter; canonical GeoJSON detail/preview; unchanged workflow | data catalogue/detail/preview/picker; map budget | filter/summary/slots/representations/six stages | I | Build 1440×900/1024×768 | IDs/summary/map/text fallback/slots/focus/overflow | Proposed / unimplemented / not verified | SCM-D06,D07 | 13,17 |
| SCM-R01 — create/reuse/default/external import/restore/dependencies/delete end-to-end | media/draft/graph/delete/manager/picker/Image editor | prerequisite semantic/composition suite | A | Build 1440×900/1024×768; View390; fetch yes/no | IDs/hashes/alts/external unchanged/restore/breadcrumbs/no dangling ID | Proposed / unimplemented / not verified | SCM-D01,D03,D04,D05,D06,D09,D10 | 7,17 |
| SCM-R02 — global media replacement updates QMD/Image and preserves context | media transaction/detail/dialog/views/store | injected-failure replacement suite | B | Build/View 1440×900;fullscreen | settings equality/new revision/all-use update/rollback/lease | Proposed / unimplemented / not verified | SCM-D05 | 8,17 |
| SCM-R03 — QMD controls produce responsive/RTL/fallback geometry | inspector/QMD view/grammar/FreeText editor/view | QMD inspector/view/DOM suite | C | Build 1440×900/1024×768;View390;fullscreen;RTL | measured width/wrap/collapse/alignment/frame/caption/fallback | Proposed / unimplemented / not verified | SCM-D01 | 9,17 |
| SCM-R04 — CSV manager Add and six-stage upload/select then catalogue | chart draft/wizard/picker/source model/CSV detail | draft/wizard/source/detail suite | D | Build 1440×900/1024×768 | six stages/source/profile/dependency/preview/reload | Proposed / unimplemented / not verified | SCM-D06,D09 | 10,17 |
| SCM-R05 — incompatible CSV block/import/remap | CSV transaction/dialog/dependency/chart preparation | structural block/rollback suite | E | Build 1440×900 | original state/reason/new ID/remap | Proposed / unimplemented / not verified | SCM-D07 | 11,17 |
| SCM-R06 — temporal CSV warning/confirm/status/clear | CSV transaction/graph/temporal owners/Present | exact schema/impact/live/protocol negatives | F | Build/Present 1440×900 | no-op cancel/stable ID/marks/clear/safe render/no message status | Proposed / unimplemented / not verified | SCM-D07 | 12,17 |
| SCM-R07 — V5/V4 round trip retains used/unused media/CSV/GeoJSON offline | migration/bundle/package owners | exact V4/V5/package tests | G | Build1440;View390;fullscreen;offline | keys/IDs/revisions/hashes/unused/zero requests/geometry | Proposed / unimplemented / not verified | SCM-D02,D08 | 15,17 |
| SCM-R08 — missing/corrupt/relink repair remains isolated | health/repair/detail/providers/views | health/cleanup/persistence/replacement tests | H | Build/View1440;View390;fullscreen | identity/uses/fallback/last-good/repair/siblings | Proposed / unimplemented / not verified | SCM-D04,D08 | 16,17 |
| SCM-R09 — GeoJSON upload/select/manage/preview/dependency/blocked delete | validation/source model/manager/map budget/picker/graph/delete | GeoJSON manager/slot/chart/graph suite | I | Build 1440×900/1024×768 | six stages/sourceId/summary/map/fallback/breadcrumb/no dialog | Proposed / unimplemented / not verified | SCM-D06,D07 | 13,17 |
| SCM-R10 — invalid GeoJSON replacement blocks/imports/remaps | validation/Geo transaction/dialog/map preparation | hard cases from imported limits plus join removal | J | Build 1440×900/1024×768 | prior equality/reason/new ID/remap/atomicity | Proposed / unimplemented / not verified | SCM-D07 | 14,17 |
| SCM-R11 — compatible GeoJSON geometry/coverage change warns/confirms without temporal context | Geo transaction/source summary/dialog/map runtime | warn/cancel/confirm/Chrono negative suite | K | Build 1440×900/1024×768 | stable ID/new summary/map/coverage warning/zero impacts | Proposed / unimplemented / not verified | SCM-D07 | 14,17 |

## Eleven Independent Browser Journeys

| Journey | Exact Playwright test title | Earliest completion | Non-collapsible evidence |
|---|---|---:|---|
| A | `source-content-media.spec.js` — `Journey A — media create reuse default external import restore dependencies delete` | 7 | Logical/physical identity, alt lifetime, external unchanged, draft cancellation, Restore, blocked/no-dialog then eligible delete, focus/geometry. |
| B | `source-content-media.spec.js` — `Journey B — global media replacement preserves placement state` | 8 | QMD/Image revision update, contextual equality, lease safety, rollback. |
| C | `qmd-reusable-media.spec.js` — `Journey C — QMD media controls responsive RTL geometry and request authority` | 9 | Allowlist/request log and measured wrap/collapse/RTL/frame/caption/fallback/overflow. |
| D | `source-content-csv.spec.js` — `Journey D — CSV upload through six stages then catalogue management` | 10 | Six stages, source/profile, manager Add/cancel, preview/search/reload. |
| E | `source-content-csv.spec.js` — `Journey E — incompatible CSV replacement blocks and imports as new` | 11 | Original equality, exact block, new ID/remap/cancel. |
| F | `source-content-csv.spec.js` — `Journey F — valid temporal CSV replacement warns then confirms` | 12 | Exact impacts/status/clear, no-op cancel, stable ID, safe Present, no audience status. |
| G | `source-content-portability.spec.js` — `Journey G — V5 offline round trip and V4 migration retain library` | 15 | Used/unused content, exact V5/V4 migration, zero requests, QMD/Image/map geometry. |
| H | `source-content-recovery.spec.js` — `Journey H — missing corrupt and relink repair stay isolated` | 16 | Persistent identity, fallback, last-good, explicit repair, sibling continuity. |
| I | `source-content-geojson.spec.js` — `Journey I — GeoJSON upload select preview dependency and blocked delete` | 13 | Six stages, representations, summary/map/text fallback, shared slots, breadcrumb/no-dialog. |
| J | `source-content-geojson.spec.js` — `Journey J — invalid GeoJSON replacement blocks and imports as new` | 14 | Join/limit hard block, prior map equality, new ID/remap/cancel. |
| K | `source-content-geojson.spec.js` — `Journey K — valid GeoJSON geometry change warns then confirms` | 14 | Geometry/coverage warning, cancel, stable ID/new map, zero temporal contexts. |

## Explicit Deferrals and Later Ownership

- Google Docs integration: future connector/auth/import/portability specification.
- CSV cell editing, GeoJSON feature editing, and derivative mutation: future data-editing design; current detail owners stay preview/management only.
- Global Build Undo/Redo: future Build-state design across `BuildWorkspace.jsx`, draft coordination, persistence, cleanup, and content retainers.
- New managed kinds or an external/cross-dashboard library: future schema/product decision; V5 reserves no alternate canonical keys.
- Raw-QMD URL conversion, proxy/CORS bypass, authored CSS, absolute positioning, and Free-text Present/Audience are rejected boundaries, not implementation deferrals.

## Plan-Author Self-Review Checklist

- [x] Seventeen sequential tasks follow the dependency order; no task consumes QMD, manager, transaction, or map-budget owners before creation.
- [x] The complete Static Image sourceVersion-2/mediaId cutover and Build/View/fullscreen/Present/Audience regression evidence are in Task 1.
- [x] The browser-edit baseline gate precedes Task 1 and derives Step 7S 36/36 from exact rows.
- [x] The ledger has 36 unique rows: SCM-S01–S16, SCM-C01–C09, SCM-R01–R11; every status remains Proposed/unimplemented/not verified.
- [x] A–K are 11 unique independently runnable titles across exactly seven Playwright files; Journey H grep matches its canonical title.
- [x] QMD external import is reachable through a separate non-selectable row, panel-draft-owned in the picker, and library-owned only from manager detail.
- [x] QMD identity, serializer alt, safe host/portal bridge, one lease owner, and single-parser dependency extraction are explicit.
- [x] Rename, media/CSV/GeoJSON manager Add/cancel, physical/logical dedupe choice, default-description semantics, and uploadedGeoJson selector closure have exact owners.
- [x] `GEOJSON_LIMITS` uses `normalMax/eagerMax`, boundary fixtures import it, summary shape is singular, and both live maps/previews share one budget registry.
- [x] CSV temporal shapes, impact kinds, array/top-level Scene ownership, layouts, clearing, migration/package preservation, Present warning, and protocol negative are exact.
- [x] Every helper/type/signature used here is defined in the file map or Shared Contracts; the undefined-symbol and signature-consistency scan has no findings.
- [x] Required targeted checks are proportional; full build/full suites are conditional on explicit pre-merge/release status.
