# Source Content Manager and QMD Reusable Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved dashboard-contained V5 reusable media and managed CSV/GeoJSON library, Build manager and pickers, portable QMD media, replacement/deletion/recovery transactions, and offline portability without regressing accepted Step 7S behavior.

**Architecture:** `contentLibrary.mediaItems` and `contentLibrary.sourceEntries` provide stable logical identities over the existing authored-image byte store, `dataSources`, and CSV-only `datasetProfiles`. One parser owns QMD media grammar, one session coordinator owns actual temporary retainers and atomic draft publication, one dependency graph combines those retainers with saved uses, one iterative authority owns GeoJSON safety and summary facts, and source-specific transactions publish validated changes atomically. React mounts QMD media through portals into safe DOM placeholders, while one Build-workspace map-budget registry coordinates live dashboard maps and manager previews.

**Tech Stack:** React 19, ES modules, Node `node:test`, Playwright Chromium, IndexedDB, Papa Parse, ECharts 5, existing portable-QMD safe DOM pipeline, and existing dashboard/package commit controllers.

**Spec:** `docs/superpowers/specs/2026-08-25-source-content-manager-and-qmd-reusable-media-design.md`

**Authority:** Written amendment `81531b4`; master-accepted GeoJSON calibration `c28b59d`; master-accepted ownership reconciliation `dc06f8c`; accepted Step 7S implementation `b366ba17fe856aede46ba8301b8a530520e4d2cd`; Step 7S documentation closure `db63d8e772ce96b17de19b7a89f256a72926d08d`.

**Review history:** First plan `ebdc52b` was rejected for incomplete ordering/ownership/lifetime/mechanical contracts. Second correction `fed576e` was rejected after a focused live-owner check found wrong GeoJSON warning boundaries, missing DashboardCanvas/ChartPanel transport, an incomplete Static Image atomic payload, no parser-owned QMD suffix pass, no mounted draft coordinator, a map provider below sibling consumers, cleanup disconnected from real retainers, Task 12 missing its Build save-dispatch test, and residual generic owners. This correction resolves those execution blockers without changing product scope.

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
| `src/lib/geoJsonValidation.js` | `GEOJSON_LIMITS` for the ten per-source metrics; separate `GEOJSON_CONCURRENT_MAPS={normalMax:2,eagerMax:4}`; `inspectGeoJsonComplexity(value,options)`; `validateGeoJson(input,options)`. Single iterative safety/summary authority. |
| `src/content-library/contentDraftTransaction.js` | Pure `stageContentDraft`, `finalizeContentDraft`, `discardContentDraft` plus mounted `createContentDraftCoordinator(adapters) -> ContentDraftCoordinator`. The coordinator owns application-session drafts and transactions, commits registry+bytes/descriptors/profiles/payloads atomically, discards staged state, and exposes real retainers. |
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
| `src/static-content/qmd/portableQmdMedia.js` | `parsePortableMediaReference(destination)`; `validatePortableMediaAttributes(attributes)`; `serializePortableMediaReference({mediaId,alt,width,align,flow,frame,caption,decorative})`; `annotatePortableMediaTokens(parsed) -> ParsedPortableQmd`; `parsePortableQmdWithMedia(source) -> ParsedPortableQmd`; `extractPortableMediaNodes(annotatedAst,{mediaItems})`. This owner alone recognizes/consumes the immediate attribute suffix; it imports `parsePortableQmd`, while `parsePortableQmd` never imports this module, preventing a cycle. |
| `src/static-content/qmd/renderPortableQmd.js` | Modify `renderPortableQmd(ast,options) -> DocumentFragment` to emit safe hosts only for known local records. Host attributes: `data-qmd-media-host`, `data-qmd-media-key`, and validated token data only. Unknown/external nodes emit inert source text. |
| `src/components/charts/FreeTextChartView.jsx` | `FreeTextChartView({model,chart,contentRenderContext,hostHeadingLevel})`; import `createPortal` from `react-dom`, clone/append the fragment, collect committed host elements, and portal `QmdMediaView`. Portal entries are replaced on recompilation and cleared on unmount. |
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
| `src/components/build/BuildMapBudgetContext.jsx` | `createBuildMapBudget() -> {upsert(request),release(ownerId),activate(ownerId),snapshot(),subscribe(listener)}`; `BuildMapBudgetProvider({children})`; `useBuildMapBudgetSlot({ownerId,kind:'dashboard'|'preview',visible,active}) -> {state:'normal'|'degraded'|'deferred',activate()}`. The hook upserts on input change and releases on unmount. `DashboardModeWorkspace` is the sole provider. Prefer visible dashboard maps; allocations 1–2 `normal`, 3–4 `degraded`, fifth+ `deferred`; explicit activation re-runs priority. |

### Exact mounted coordinator, render-context, and transaction contracts

```js
createContentDraftCoordinator({
  getDashboard, commitDashboard, assetStore,
  readSessionAsset, discardSessionAsset,
}) => ({
  stageDraft({draftId,owner,kind,payload,assetIds,mediaIds,sourceIds}),
  updateDraft(draftId,patch),
  commitDraft(draftId,{buildCandidate}),
  discardDraft(draftId,{reason}),
  discardOwner(owner,{reason}),
  beginTransaction({transactionId,kind,assetIds,mediaIds,sourceIds}),
  completeTransaction(transactionId),
  failTransaction(transactionId,error),
  getActiveRetainers(),
  subscribe(listener),
  dispose(),
})
```

`commitDashboard(candidate,{transactionId})` persists one already-validated DashboardV5 candidate. `buildCandidate({dashboard,draft})` returns `{dashboard,commitAssetIds,discardAssetIds,itemIds}` and cannot write. `getActiveRetainers()` returns frozen `{assetIds:string[],mediaIds:string[],sourceIds:string[],records:{ownerId,kind,status,assetIds,mediaIds,sourceIds}[]}` with sorted unique IDs. `subscribe` emits this exact snapshot. App creates one coordinator per application session and disposes it on unmount.

The exact prop path is `App.jsx contentDraftCoordinator` → `DashboardRenderer.jsx` → `DashboardModeWorkspace.jsx`, `BuildWorkspace.jsx`, `ChartWizardV3.jsx`, `StaticContentWizard.jsx`; `BuildWorkspace` passes it to `SourceContentWorkspace`, which passes it to catalogue/detail/upload/picker flows. Callbacks are `onContentDraftStage(input)`, `onContentDraftCommit(draftId,buildCandidate)`, and `onContentDraftDiscard(draftId,reason)` wrappers over the same coordinator; components never persist registry or bytes directly.

```js
/** @typedef {{mediaItems:Record<string,MediaItem>,assets:Record<string,object>,resolveAsset:(assetId:string)=>Promise<{url:string,release:()=>boolean}>,requestRepair:({mediaId,panelId,surface})=>void}} ContentRenderContext */
```

`DashboardRenderer` builds this context from the working dashboard, `resolveBrowserAuthoredAsset`, and its exact repair-navigation callback. `mediaItems[*].current` is the logical authored/package/external authority; `assets` plus `resolveAsset` are the authored-byte/lease authority, and the existing contained-package-path validator remains the package authority. It passes the context through `DashboardModeWorkspace` → `DashboardCanvas` → `ChartPanel`. `ChartPanel.renderContext` carries `mediaItems`, `assets`, `resolveAsset`, and `requestRepair` through `ChartView` to both `ImageChartView` and `FreeTextChartView/QmdMediaView`.

```js
prepareStaticPanelTransaction({
  dashboard, operation, destination, panelId, panel,
  placement, mediaItem, assets, stagedAssetIds,
}) => {
  kind:'static-panel-transaction', candidateDashboard,
  panelId, mediaId, mediaItem, stagedAssetIds,
  previousDashboard, expectedMediaRevision,
}
```

`finalizeStaticContentDraft` returns exact `{destination,panel,placement,mediaItem,assets,stagedAssetIds}`. New upload creates a new `MediaItem`; explicit reuse uses the selected existing record; link/package creates a logical record whose `current` is URL/package; edit preserves the existing `mediaId` unless Change image selects another item. `prepareStaticPanelTransaction` inserts/updates `contentLibrary.mediaItems[mediaId]`, writes the placement with that `mediaId`, merges assets, and produces one candidate. Task 1's existing `commitDurableStaticPanelTransaction` publishes bytes and candidate atomically. Task 3's coordinator later delegates static-panel publication to that exact durable boundary; it does not defer or alter Task 1 compatibility. Save/Discard/validation/persistence failure leaves the prior V5 dashboard and staged-byte inventory exact.

### Existing integration owners that must change

Task 1 owns the complete Image cutover across `src/charting/config/dashboardConfigStructure.js`, `src/charting/config/dashboardBundleV3.js`, `src/content-library/migrateDashboardV4ToV5.js`, `src/static-content/staticSourceSchema.js`, `src/static-content/staticSourceResolver.js`, `src/charting/rendering/resolveChartRendering.js`, `src/static-content/staticPanelTransaction.js`, `src/static-content/assets/durableStaticPanelCommit.js`, `src/static-content/forms/staticContentDraft.js`, `src/components/static-content/StaticContentWizard.jsx`, `src/components/static-content/ImageSourceEditor.jsx`, `src/components/dashboard/DashboardModeWorkspace.jsx`, `src/components/dashboard/DashboardCanvas.jsx`, `src/components/ChartPanel.jsx`, `src/components/charts/ChartView.jsx`, `src/components/charts/ImageChartView.jsx`, `src/components/DashboardRenderer.jsx`, `src/lib/loadDashboard.js`, `src/static-content/staticPanelCapabilities.js`, `src/static-content/assets/assetReferenceGraph.js`, `src/lib/dashboardPackageExport.js`, `src/lib/dashboardPackageCandidate.js`, `src/lib/dashboardPackageImportTransaction.js`, `src/components/presentation/useAudienceStaticAssetReadiness.js`, `src/components/display/DisplayedChartGrid.jsx`, `src/components/presentation/AudienceDisplay.jsx`, `src/lib/presentationProtocol.js`, and `src/App.jsx`. No later task may retain a `staticImage.source.origin` or source-owned revision assumption.

The remaining exact existing owners are: Build command/host/restoration/dirty projection — `src/components/build/BuildCommandHeader.jsx`, `src/components/build/BuildWorkspace.jsx`, `src/components/build/buildCanvasRestoration.js`, `src/components/build/buildDirtyState.js`, `src/components/DashboardRenderer.jsx`; chart authoring — `src/charting/forms/wizardDraft.js`, `src/components/chart-authoring/ChartWizardV3.jsx`, `src/components/chart-authoring/DataSourceStep.jsx`, `src/charting/forms/geographySource.js`; temporal state — `src/charting/time/chronoGroupModel.js`, `src/charting/time/dashboardTemporalConfig.js`, `src/charting/time/sceneSchema.js`, `src/charting/time/temporalNeedsAttention.js`, `src/components/time/chronoContentState.js`, `src/components/presentation/PresentWorkspace.jsx`; GeoJSON runtime — `src/lib/loadDashboard.js`, `src/data/sourceRequest.js`, `src/data/dashboardSourceProviders.js`, `src/charting/data/prepareGeographyData.js`, `src/charting/rendering/geographyAdapter.js`, `src/components/charts/EChartsChartView.jsx`; package/recovery — `src/lib/dashboardPackageExport.js`, `src/lib/dashboardPackageCandidate.js`, `src/lib/dashboardPackageImportTransaction.js`, `src/lib/dashboardAssetPersistence.js`, `src/lib/browserStorage.js`, `src/static-content/assets/assetReferenceGraph.js`, `src/static-content/assets/reconcileAuthoredAssets.js`.

### Test helpers and fixtures

| Path | Exact exports |
|---|---|
| `tests/helpers/contentLibraryFixtures.js` | `makeMediaItem(overrides={})`, `makeSourceEntry(kind,overrides={})`, `makeDashboardV4(overrides={})`, `makeDashboardV5(overrides={})`. Each returns a complete plain fixture; tests mutate only their returned clone. |
| `tests/helpers/geoJsonBoundaryFixtures.js` | `SOURCE_GEOJSON_LIMIT_KEYS` is exactly `['encodedBytes','encodedPropertyValueBytes','features','totalPositions','maxPositionsPerFeature','parts','rings','maxPropertyKeysPerFeature','depth','structuralNodes']`; `geoJsonAtBoundary(metric,boundary,limits=GEOJSON_LIMITS)` accepts only those keys and `boundary:'normalMax'|'warningMin'|'hardMin'`; `concurrentMapScenario({dashboardMaps,previewMaps,visibleDashboardIds},limits=GEOJSON_CONCURRENT_MAPS)` is the separate registry fixture and never calls `geoJsonAtBoundary`. |
| `tests/helpers/contentManagerHarness.jsx` | `ContentManagerHarness({dashboard,viewport,failAt})`, exposing committed dashboard and transaction log through `window.__SIMEX_CONTENT_TEST__`. |

Seven Playwright files are created: `source-content-manager.spec.js`, `source-content-media.spec.js`, `qmd-reusable-media.spec.js`, `source-content-csv.spec.js`, `source-content-geojson.spec.js`, `source-content-portability.spec.js`, and `source-content-recovery.spec.js`. `tests/portableQmdDomSafety.test.js` is modified, never created.

## Shared Contracts

```js
/** @typedef {{mediaItems:Record<string,MediaItem>,sourceEntries:Record<string,SourceEntry>}} ContentLibrary */
/** @typedef {{mediaId:string,revision:number,current:{kind:'asset'|'package'|'url',assetId?:string,path?:string,url?:string},displayName:string,defaultDescription:string,origin:'uploaded'|'packaged'|'external'|'legacy-import',health:'ready'|'external'|'missing'|'corrupt'|'needs-relink'|'needs-review',dimensions?:{width:number,height:number},byteLength?:number,mediaType?:string}} MediaItem */
/** @typedef {{sourceId:string,origin:'uploaded'|'linked-project'|'packaged'|'legacy-import'|'generated',ownership:'builder'|'dashboard',displayName:string,provenance:object,health:'ready'|'missing'|'corrupt'|'needs-relink'|'needs-review',updateStatus?:string}} SourceEntry */
/** @typedef {{featureCount:number,geometryTypeCounts:Record<string,number>,boundingBox:[number,number,number,number]|null,propertyKeys:string[],maxPropertyKeysPerFeature:number,totalPositions:number,maxPositionsPerFeature:number,parts:number,rings:number,structuralNodes:number,maxDepth:number,encodedBytes:number,encodedPropertyValueBytes:number}} GeoJsonSummary */
/** @typedef {{status:'needs-review'|'degraded',sourceIds:string[]}} TemporalReview */
/** @typedef {{tokenIndex:number,mediaId:string,alt:string,attributes:{width:string,align:'start'|'center'|'end',flow:'block'|'wrap-start'|'wrap-end',frame:'none'|'outline'|'card',caption:string,decorative:boolean},sourceText:string}} PortableMediaNode */
/** @typedef {{tokens:object[],mediaNodes:PortableMediaNode[]}} ParsedPortableQmd */
/** @typedef {{assetIds:string[],mediaIds:string[],sourceIds:string[],records:{ownerId:string,kind:string,status:string,assetIds:string[],mediaIds:string[],sourceIds:string[]}[]}} ActiveContentRetainers */
```

`buildAssetReferenceGraph({dashboard,activeRetainers})` and `reconcileAuthoredAssets({store,dashboard,activeRetainers,now})` accept the exact `ActiveContentRetainers` snapshot. `App.jsx::reconcileSavedAuthoredAssets(dashboard,{activeRetainers})` is the mounted adapter. A committed `mediaItems[*].current.assetId` is durable even with zero placements; only coordinator-reported session IDs supplement that durable graph.

`TemporalReview.sourceIds` is sorted, unique, and non-empty. Chrono Group and Scene use `needs-review`; `scene.present.temporalReview` uses `degraded`; absence means ready. Replacements union/dedupe IDs. Group save clears repaired IDs from the group; Scene save clears repaired IDs from Scene and, when its Present composition validates, from `scene.present`. V4 imports omit this property. No review status enters presentation protocol/actions/messages.

`GEOJSON_LIMITS` exact shape is:

```js
{
  encodedBytes:{normalMax:31999999,warningMin:32000000,hardMin:36000000},
  encodedPropertyValueBytes:{normalMax:31999999,warningMin:32000000,hardMin:36000000},
  features:{normalMax:1999,warningMin:2000,hardMin:8000},
  totalPositions:{normalMax:19999,warningMin:20000,hardMin:50000},
  maxPositionsPerFeature:{normalMax:19999,warningMin:20000,hardMin:50000},
  parts:{normalMax:1999,warningMin:2000,hardMin:4000},
  rings:{normalMax:1999,warningMin:2000,hardMin:4000},
  maxPropertyKeysPerFeature:{normalMax:511,warningMin:512,hardMin:1000},
  depth:{normalMax:15,warningMin:16,hardMin:32},
  structuralNodes:{normalMax:29999,warningMin:30000,hardMin:50000}
}

GEOJSON_CONCURRENT_MAPS = {normalMax:2,eagerMax:4}
```

Each per-source metric has the exact `normalMax`, `warningMin`, and `hardMin` triple above. `GEOJSON_CONCURRENT_MAPS` is a separate workspace scheduling export, not a source-limit key and never accepted by `geoJsonAtBoundary`. Values through `normalMax` are normal; values from `warningMin` through `hardMin - 1` warn where safe; values at `hardMin` reject before commit. GeometryCollection rejects. Join compatibility/coverage is a replacement outcome, not a resource limit.

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

**Files:** Create `src/content-library/contentLibrarySchema.js`, `src/content-library/migrateDashboardV4ToV5.js`, `src/content-library/mediaItems.js`, `tests/helpers/contentLibraryFixtures.js`, `tests/contentLibrarySchema.test.js`, `tests/dashboardMigrationV5.test.js`, `tests/dashboardBundleV5.test.js`, `tests/mediaItems.test.js`. Modify `src/charting/config/dashboardConfigStructure.js`, `src/charting/config/dashboardBundleV3.js`, `src/static-content/staticSourceSchema.js`, `src/static-content/staticSourceResolver.js`, `src/charting/rendering/resolveChartRendering.js`, `src/static-content/staticPanelTransaction.js`, `src/static-content/assets/durableStaticPanelCommit.js`, `src/static-content/forms/staticContentDraft.js`, `src/components/static-content/StaticContentWizard.jsx`, `src/components/static-content/ImageSourceEditor.jsx`, `src/components/dashboard/DashboardModeWorkspace.jsx`, `src/components/dashboard/DashboardCanvas.jsx`, `src/components/ChartPanel.jsx`, `src/components/charts/ChartView.jsx`, `src/components/charts/ImageChartView.jsx`, `src/components/DashboardRenderer.jsx`, `src/lib/loadDashboard.js`, `src/static-content/staticPanelCapabilities.js`, `src/static-content/assets/assetReferenceGraph.js`, `src/lib/dashboardPackageExport.js`, `src/lib/dashboardPackageCandidate.js`, `src/lib/dashboardPackageImportTransaction.js`, `src/components/presentation/useAudienceStaticAssetReadiness.js`, `src/components/display/DisplayedChartGrid.jsx`, `src/components/presentation/AudienceDisplay.jsx`, `src/lib/presentationProtocol.js`, and `src/App.jsx`. Modify `tests/staticSourceSchema.test.js`, `tests/staticSourceResolver.test.js`, `tests/chartRenderingV3.test.js`, `tests/chartViewV3.test.js`, `tests/staticPanelPersistence.test.js`, `tests/staticPanelTransaction.test.js`, `tests/staticContentDraft.test.js`, `tests/staticPanelComposition.test.js`, `tests/dashboardGeometryContract.test.js`, `tests/sourceEvidenceDirectJourney.test.js`, `tests/dashboardAppV3.test.js`, `tests/imageChartView.test.js`, `tests/presentWorkspace.test.js`, `tests/audienceDisplay.test.js`, `tests/audienceStaticAssetReadiness.test.js`, `tests/presentationProtocol.test.js`, `tests/dashboardBundleV3.test.js`, `tests/dashboardPackageExport.test.js`, `tests/dashboardPackageCandidate.test.js`, `tests/dashboardPackageImportTransaction.test.js`, `tests/staticContentPortablePackage.test.js`, and `tests/portableFlashdriveLaunch.test.js`.

- [ ] **RED:** Add complete V4→V5 fixtures for asset/package/url/replacement-required images. Assert exact keys/IDs/chart V3/sourceVersion-2 placement/media-owned revision. Assert `finalizeStaticContentDraft` returns `{destination,panel,placement,mediaItem,assets,stagedAssetIds}` for upload/reuse/link/package and `prepareStaticPanelTransaction` produces one candidate containing panel/config/library/assets. Assert Save/Discard/validation/persistence failure preserves prior DashboardV5 and staged bytes. Assert `DashboardCanvas` passes `contentRenderContext`, `ChartPanel` merges it into `renderContext`, and `ChartView` supplies it to `ImageChartView`; resolver compares the media revision. Assert Present/Audience use the same media identity separately.
- [ ] Run `node --test tests/contentLibrarySchema.test.js tests/dashboardMigrationV5.test.js tests/dashboardBundleV5.test.js tests/mediaItems.test.js tests/staticSourceSchema.test.js tests/staticSourceResolver.test.js tests/chartRenderingV3.test.js tests/chartViewV3.test.js tests/staticPanelPersistence.test.js tests/staticPanelTransaction.test.js tests/staticContentDraft.test.js tests/staticPanelComposition.test.js tests/dashboardGeometryContract.test.js tests/sourceEvidenceDirectJourney.test.js tests/dashboardAppV3.test.js tests/imageChartView.test.js tests/presentWorkspace.test.js tests/audienceDisplay.test.js tests/audienceStaticAssetReadiness.test.js tests/presentationProtocol.test.js tests/dashboardBundleV3.test.js tests/dashboardPackageExport.test.js tests/dashboardPackageCandidate.test.js tests/dashboardPackageImportTransaction.test.js tests/staticContentPortablePackage.test.js tests/portableFlashdriveLaunch.test.js`. Expected: FAIL on missing V5 payload/transport and every remaining `origin`/source-revision/configVersion-4 assumption.
- [ ] **GREEN:** Implement migration first; make `finalizeStaticContentDraft` and `prepareStaticPanelTransaction` match the exact contracts above. `DashboardRenderer` creates `ContentRenderContext`; `DashboardModeWorkspace` and `DashboardCanvas` pass it; `ChartPanel` carries it in `renderContext`; `ChartView` passes it to Image. `resolveStaticImageSource` validates placement, looks up `mediaItems[source.mediaId]`, and uses media revision/current. Durable commit publishes staged bytes and the single V5 candidate atomically and never forces V4. Do not serialize old Image shape.
- [ ] Re-run the exact RED command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/static-image.spec.js tests/e2e/static-image-audience.spec.js --project=chromium`. Expected: PASS with inspected Build/View/fullscreen/Present/Audience checkpoints, correct current revision, zero Free-text presentation eligibility, unchanged four-stage static workflow, and passive Audience isolation.
- [ ] Update implementation evidence plus SCM-S01/S02/S03 and security/deviation records as engine/live wiring only; re-run the exact Step 7S 36-row matrix block; commit `feat(content): migrate image rendering to V5 media identity`.

### Task 2: Bounded GeoJSON Authority and Canonical Summary

**Rows:** SCM-S15 engine only. **Consumes:** `GEOJSON-LIMITS-DECISION.md`. **Produces:** frozen `GEOJSON_LIMITS`, `GeoJsonValidation`, and one `GeoJsonSummary` shape.

**Files:** Create `src/lib/geoJsonValidation.js`, `src/content-library/geoJsonSourceEntry.js`, `tests/helpers/geoJsonBoundaryFixtures.js`, `tests/geoJsonValidation.test.js`, `tests/geoJsonSourceEntry.test.js`. Modify `src/lib/loadDashboard.js`, `src/data/sourceRequest.js`, `src/data/dashboardSourceProviders.js`, `tests/progressiveDashboardLoad.test.js`, `tests/chartSourceProfile.test.js`, and `tests/dashboardSemanticBoundary.test.js`.

- [ ] **RED:** Import `GEOJSON_LIMITS`, `GEOJSON_CONCURRENT_MAPS`, and `SOURCE_GEOJSON_LIMIT_KEYS` in the boundary fixture builder. Assert every exact source triple, iterative depth/node fuses, GeometryCollection rejection, rollback before registration, and canonical summary with sorted `propertyKeys` plus exact `maxPropertyKeysPerFeature`. Assert `geoJsonAtBoundary('concurrentMaps',...)` rejects; exercise `concurrentMapScenario` only with the separate concurrency export. Assert `dataset/uploadedGeoJson`, tracked GeoJSON, and package descriptors normalize without `datasetProfiles`.
- [ ] Run `node --test tests/geoJsonValidation.test.js tests/geoJsonSourceEntry.test.js tests/progressiveDashboardLoad.test.js tests/chartSourceProfile.test.js tests/dashboardSemanticBoundary.test.js`. Expected: FAIL because the central authority/summary does not exist.
- [ ] **GREEN:** Implement the exact constants from Shared Contracts. Byte-gate before parse; traverse with an explicit stack; increment `structuralNodes` once per object/array; count own property keys per Feature; sort union `propertyKeys`; abort at hard limits. Existing loaders delegate and never copy constants.
- [ ] Re-run the exact command. Expected: PASS with no literal calibrated thresholds outside `geoJsonValidation.js` and the decision record.
- [ ] Update SCM-S15 engine evidence without promoting composition/real-use; commit `feat(content): centralize bounded GeoJSON validation`.

### Task 3: Draft Publication and Durable Rename Models

**Rows:** SCM-S03/S04/S13 engine. **Consumes:** Task 1 registry. **Produces:** frozen media/source metadata updates and explicit manager versus authoring draft transactions.

**Files:** Create `src/content-library/sourceEntrySchema.js`, `src/content-library/contentDraftTransaction.js`, `tests/sourceEntrySchema.test.js`, and `tests/contentDraftTransaction.test.js`. Modify `src/App.jsx`, `src/components/DashboardRenderer.jsx`, `src/components/dashboard/DashboardModeWorkspace.jsx`, `src/components/build/BuildWorkspace.jsx`, `src/static-content/assets/browserAuthoredAssetStore.js`, `src/components/build/buildDirtyState.js`, `src/static-content/forms/staticContentDraft.js`, `src/charting/forms/wizardDraft.js`, `src/static-content/assets/assetReferenceGraph.js`, `src/static-content/assets/reconcileAuthoredAssets.js`, `tests/dashboardAppV3.test.js`, `tests/buildWorkspaceV3.test.js`, `tests/browserAuthoredAssetStore.test.js`, `tests/buildDirtyState.test.js`, `tests/staticContentDraft.test.js`, `tests/wizardDraftV3.test.js`, and `tests/authoredAssetCleanup.test.js`.

- [ ] **RED:** Assert pure rename semantics and the exact `ContentDraftCoordinator` API. Mount App→Renderer→ModeWorkspace→BuildWorkspace with one coordinator. At this pre-manager layer, test direct `discardDraft` (the callback used by explicit Cancel), mode departure, unmount, validation failure, persistence failure, and a synthetic owner:`manager` Add. The Add persists an unused content record across reload; every discard/failure exit leaves no durable item. QMD/Image/chart drafts publish only with completed owners. `getActiveRetainers` reports exact sorted IDs and contextual Image replacement lifetime. Task 4 mounts and tests Close/Escape; Tasks 7, 10, and 13 test each concrete upload flow.
- [ ] Run `node --test tests/mediaItems.test.js tests/sourceEntrySchema.test.js tests/contentDraftTransaction.test.js tests/dashboardAppV3.test.js tests/buildWorkspaceV3.test.js tests/buildDirtyState.test.js tests/staticContentDraft.test.js tests/wizardDraftV3.test.js tests/browserAuthoredAssetStore.test.js tests/authoredAssetCleanup.test.js`. Expected: FAIL on missing coordinator, transport, and lifecycle exits.
- [ ] **GREEN:** Implement the exact coordinator contract in `contentDraftTransaction.js`; create one instance in `App`, pass it through the exact prop path, subscribe Build dirty state to coordinator retainers, and dispose on App unmount. Implement rename functions as frozen copies. Coordinator commit builds one candidate, commits bytes/data and dashboard atomically, compensates on failure, then clears only the completed draft/transaction.
- [ ] Re-run the exact command. Expected: PASS; reload fixtures contain no unsaved drafts, while deliberately added unused items persist.
- [ ] Update engine/lifetime evidence and records; commit `feat(content): add scoped content draft publication`.

### Task 4: Non-Modal Manager Shell and Catalogue Composition

**Rows:** SCM-C01/C02/C03 and shell portion of C04. **Consumes:** Tasks 1–3. **Produces:** mounted workspace, shared catalogue, details router, and durable rename UI.

**Files:** Create `src/components/source-content/SourceContentWorkspace.jsx`, `src/components/source-content/ContentCatalogue.jsx`, `src/components/source-content/MediaCatalogue.jsx`, `src/components/source-content/DataSourceCatalogue.jsx`, `src/components/source-content/ContentDetail.jsx`, `src/components/source-content/MediaDetail.jsx`, `src/components/source-content/DataSourceDetail.jsx`, `src/components/source-content/CsvDetail.jsx`, `src/components/source-content/DependencyList.jsx`, `src/styles/source-content.css`, `tests/helpers/contentManagerHarness.jsx`, `tests/sourceContentWorkspace.test.js`, `tests/contentDetail.test.js`, and `tests/e2e/source-content-manager.spec.js`. Modify `src/components/build/BuildCommandHeader.jsx`, `src/components/build/BuildWorkspace.jsx`, `src/components/build/buildCanvasRestoration.js`, `src/components/DashboardRenderer.jsx`, `src/main.jsx`, `tests/buildCommandHeader.test.js`, and `tests/buildWorkspaceV3.test.js`.

- [ ] **RED:** Assert three Build content commands, exact six/four stage arrays, wide non-modal auxiliary workspace, Media/Data Sources tabs, search/origin/status/usage and CSV/GeoJSON kind filters, desktop side-by-side, tablet list→detail with Back, phone Build-unsupported state, rename/default-description commits, and close restoration of canvas/scroll/selection/focus.
- [ ] Run `node --test tests/buildCommandHeader.test.js tests/buildWorkspaceV3.test.js tests/sourceContentWorkspace.test.js tests/contentDetail.test.js tests/wizardDraftV3.test.js tests/staticContentDraft.test.js`. Expected: FAIL on missing workspace/components.
- [ ] **GREEN:** Mount one workspace from `BuildWorkspace`; pass its Task-3 coordinator to `SourceContentWorkspace`; keep canvas mounted behind it; route details by item kind; commit rename/default changes through `onContentDraftStage` then `onContentDraftCommit`; every Close/Escape/mode-departure/unmount path calls `onContentDraftDiscard` for unresolved manager drafts. Render labels/filenames/captions/descriptions as React text.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-manager.spec.js --project=chromium`. Expected: PASS for separately named command/stage, restoration, and desktop/tablet composition tests. Inspect persistent canvas, target clearance, selection/query/filter continuity, pane stacking, focus return, and zero overflow at 1440×900 and 1024×768.
- [ ] Update C01–C04 evidence without claiming unfinished detail actions; commit `feat(content): add non-modal source content workspace`.

### Task 5: QMD Grammar, Safe Hosts, and Portal Runtime

**Rows:** SCM-S11 engine/live renderer and C07 fallback foundation. **Consumes:** Task 1 media identity. **Produces:** single grammar, safe host descriptors, and leased portal lifecycle.

**Files:** Create `src/static-content/qmd/portableQmdMedia.js`, `src/components/charts/QmdMediaView.jsx`, `tests/portableQmdMedia.test.js`, and `tests/qmdMediaView.test.js`. Modify `src/static-content/qmd/parsePortableQmd.js`, `src/static-content/qmd/renderPortableQmd.js`, `src/static-content/qmd/compilePortableQmd.js`, `src/static-content/forms/staticContentDraft.js`, `src/components/charts/FreeTextChartView.jsx`, `src/components/charts/ChartView.jsx`, `src/components/ChartPanel.jsx`, `src/components/dashboard/DashboardCanvas.jsx`, `src/components/dashboard/DashboardModeWorkspace.jsx`, `src/components/DashboardRenderer.jsx`, `src/styles/source-content.css`, `tests/portableQmdDomSafety.test.js`, `tests/portableQmdPolicy.test.js`, `tests/freeTextChartView.test.js`, `tests/chartViewV3.test.js`, `tests/staticPanelComposition.test.js`, `tests/dashboardGeometryContract.test.js`, and `tests/sourceEvidenceDirectJourney.test.js`.

- [ ] **RED:** Assert serializer requires mediaId+alt and decorative yields empty accessible alt. Assert `parsePortableQmdWithMedia` annotates an accepted image token, consumes its immediately following fully allowlisted `{...}` suffix exactly once, removes that suffix from following text, and preserves remaining text. Render and dependency extraction accept the same annotated AST. Malformed/raw URL/data/blob/file/unknown/external-only source stays visibly inert/request-free. Assert the full ContentRenderContext reaches QMD through DashboardCanvas/ChartPanel/ChartView. Assert healthy host/lease, known unhealthy logical fallback/repair, and exactly-one release/no orphan portal on recompile/unmount.
- [ ] Run `node --test tests/portableQmdMedia.test.js tests/portableQmdDomSafety.test.js tests/portableQmdPolicy.test.js tests/qmdMediaView.test.js tests/freeTextChartView.test.js tests/chartViewV3.test.js tests/staticPanelComposition.test.js tests/dashboardGeometryContract.test.js tests/sourceEvidenceDirectJourney.test.js`. Expected: FAIL on missing annotation/suffix consumption, live authority transport, or portal lifecycle.
- [ ] **GREEN:** `parsePortableQmdWithMedia` calls the existing parser then `annotatePortableMediaTokens`; only this module parses the immediate suffix. `compilePortableQmd`, Free-text validation, renderer, and dependency extraction consume its annotated AST. Renderer emits inert text for unknown/external and safe hosts for known local records. ChartView passes `contentRenderContext` to FreeTextChartView; QmdMediaView receives mediaItems/assets/resolveAsset/requestRepair. Portal and lease ownership remain exactly as mapped.
- [ ] Re-run the exact command. Expected: PASS including exactly-one acquire/release and no orphaned portal roots.
- [ ] Mount the real Free-text view harness at Build/View/fullscreen and inspect healthy plus missing/corrupt nodes; record that the accepted permissive-inert text policy is unchanged; update S11 engine/UI evidence only; commit `feat(qmd): render local media through safe portals`.

### Task 6: Direct Dependency Graph and No-Cascade Deletion

**Rows:** SCM-S05/S06/S07 and SCM-C08 delete branch. **Consumes:** Task 5 `parsePortableQmdWithMedia` and `extractPortableMediaNodes(annotatedAst,{mediaItems})`. **Produces:** exact saved-use/retention graph and blocked/eligible delete transaction.

**Files:** Create `src/content-library/contentDependencyGraph.js`, `src/content-library/contentDeletionTransaction.js`, `src/components/source-content/ContentActionDialog.jsx`, `tests/contentDependencyGraph.test.js`, `tests/contentDeletionTransaction.test.js`, `tests/contentActionDialog.test.js`. Modify `src/components/source-content/DependencyList.jsx`, `src/components/build/buildDirtyState.js`, `src/components/DashboardRenderer.jsx`, `tests/presentationProtocol.test.js`, and `src/styles/source-content.css`.

- [ ] **RED:** Assert media direct uses are QMD/Image, CSV direct use is panel primary `sourceId`, GeoJSON direct use is `chart.presentation.map.geoSource`; page/section are breadcrumbs; actual drafts/replacement/transactions are temporary retainers. Assert Chrono/Scene/Scene-present are separate CSV impacts, Present/Audience messages/leases add no edge, and GeoJSON has no temporal impact. Assert blocked Delete is disabled with inline explanation/navigation and never opens a dialog; eligible Delete opens confirmation; failure/cancel leave byte-for-byte equality; no cascade or dangling ID.
- [ ] Run `node --test tests/contentDependencyGraph.test.js tests/contentDeletionTransaction.test.js tests/contentActionDialog.test.js tests/buildDirtyState.test.js tests/presentationProtocol.test.js`. Expected: FAIL on missing graph/transaction.
- [ ] **GREEN:** Build graph from dashboard plus `contentDraftCoordinator.getActiveRetainers()`; parse QMD with `parsePortableQmdWithMedia` once and pass its annotated AST to `extractPortableMediaNodes`. `prepareContentDeletion` returns `{status:'blocked'|'ready',directUses,retainers}`; `commitContentDeletion` accepts only ready plans and checks expected revision before atomic mutation.
- [ ] Re-run the exact command. Expected: PASS with impact contexts absent from saved dependency counts.
- [ ] Mount manager blocked/eligible delete states at desktop/tablet and inspect navigation/focus/no-dialog semantics; update S05–S07/C08 evidence; commit `feat(content): enforce direct dependency deletion rules`.

### Task 7: Media Upload, Pickers, External Import, and Restore — Journey A

**Rows:** SCM-C04/C05, SCM-R01, remaining S03/S13. **Consumes:** Tasks 3–6. **Produces:** complete manager Media Add and scoped Image/QMD selection/import flows.

**Files:** Create `src/components/source-content/MediaPicker.jsx`, `tests/contentPicker.test.js`, and `tests/e2e/source-content-media.spec.js`. Modify `src/components/source-content/MediaCatalogue.jsx`, `src/components/source-content/MediaDetail.jsx`, `src/components/source-content/ContentDetail.jsx`, `src/components/static-content/FreeTextSourceEditor.jsx`, `src/components/static-content/ImageSourceEditor.jsx`, `src/components/static-content/StaticContentWizard.jsx`, `src/static-content/forms/staticContentDraft.js`, `src/content-library/contentDraftTransaction.js`, `src/components/source-content/SourceContentWorkspace.jsx`, `tests/contentDraftTransaction.test.js`, `tests/mediaItems.test.js`, `tests/staticContentDraft.test.js`, `tests/staticPanelComposition.test.js`, and `tests/contentDetail.test.js`.

- [ ] **RED:** Assert manager upload previews image, edits name/default description, reports duplicate hash, offers explicit **Reuse existing** and **Create separate item**, and publishes only on **Add to dashboard**. Assert manager Add survives persistence/reload, while explicit Cancel, Close, Escape, mode departure, unmount, validation failure, and persistence failure create no durable record. Assert physical bytes dedupe both ways but logical identity collapses only for Reuse. Assert QMD picker lists local items as selectable and External HTTPS items in a separate non-selectable section with **Import as local media**; successful local upload or browser-permitted fetch creates a panel-draft local ID selected only in that QMD draft; cancel creates no library entry. Assert manager-detail import is library-owned. Assert original external item/Image uses never change; no proxy/CORS bypass/silent fetch; failed fetch requires file upload. Assert Image may select external. Assert default description pre-fills new Image/QMD alt but later default edits never rewrite existing alt. Assert visible Restore previous image lifetime and unchanged Reset.
- [ ] Run `node --test tests/contentPicker.test.js tests/contentDraftTransaction.test.js tests/mediaItems.test.js tests/staticContentDraft.test.js tests/staticPanelComposition.test.js tests/contentDetail.test.js`. Expected: FAIL on missing picker/import/upload flows.
- [ ] **GREEN:** Implement the exact ownership/lifetime rules through the Task-3 coordinator. Picker QMD selection returns only local draft/committed IDs; import/upload stages with owner `qmd-panel` and publishes only through panel commit. Manager Media Add/import stages with owner `manager` and publishes through Add. Explicit Cancel/Close/Escape/mode departure/unmount call coordinator discard. The import row never selects the external ID. Validate every created local item through the existing raster pipeline.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-media.spec.js --project=chromium --grep "Journey A — media create reuse default external import restore dependencies delete"`. Expected: PASS at Build 1440×900/1024×768 and QMD View 390×844. Inspect identity/hash/alt, cancellation inventories, original external continuity, request log, restoration status/action area, focus/context, dependency breadcrumb, blocked no-dialog, then eligible delete.
- [ ] Update all Journey-A rows and evidence only after checkpoint inspection; commit `feat(content): add scoped media reuse and import flows`.

### Task 8: Global Media Replacement — Journey B

**Rows:** SCM-S08, SCM-R02, replace branch of C08. **Consumes:** Tasks 1, 5–7. **Produces:** identity-preserving media replacement transaction.

**Files:** Create `src/content-library/contentReplacementTransaction.js` and `tests/contentReplacementTransaction.test.js`. Modify `src/components/source-content/MediaDetail.jsx`, `src/components/source-content/ContentActionDialog.jsx`, `src/static-content/assets/browserAuthoredAssetStore.js`, `src/components/charts/ImageChartView.jsx`, `src/components/charts/QmdMediaView.jsx`, `src/static-content/staticPanelTransaction.js`, `src/content-library/contentDraftTransaction.js`, `tests/staticSourceSchema.test.js`, `tests/staticPanelTransaction.test.js`, `tests/imageChartView.test.js`, `tests/qmdMediaView.test.js`, and `tests/browserAuthoredAssetStore.test.js`.

- [ ] **RED:** Assert prepare validates candidate before mutation; confirm preserves `mediaId`, increments revision, changes current hash, atomically updates QMD/Image resolution, and leaves every placement alt/decorative/crop/rotation/fit plus zoom unchanged. Assert active leases remain valid until release. Inject failures at stage/write/dashboard/publish and assert complete rollback/cleanup.
- [ ] Run `node --test tests/contentReplacementTransaction.test.js tests/staticSourceSchema.test.js tests/staticPanelTransaction.test.js tests/imageChartView.test.js tests/qmdMediaView.test.js tests/browserAuthoredAssetStore.test.js`. Expected: FAIL on missing transaction/global-resolution behavior.
- [ ] **GREEN:** Implement prepare/commit with expected-current revision check, staged bytes, one dashboard commit, publication, and compensation. Register the staged old/new IDs with `contentDraftCoordinator.beginTransaction`; call `completeTransaction` only after publication or `failTransaction` on rollback, so cleanup sees the exact active replacement lifetime. Never rewrite placements.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-media.spec.js --project=chromium --grep "Journey B — global media replacement preserves placement state"`. Expected: PASS with inspected Build/View/fullscreen QMD+Image updates, contextual equality, lease safety, and injected rollback.
- [ ] Update S08/R02/C08 evidence; commit `feat(content): replace media revisions atomically`.

### Task 9: QMD Placement Inspector and Responsive Geometry — Journey C

**Rows:** SCM-C06/C07, SCM-R03, completion of S11. **Consumes:** Task 5 portal/runtime and Task 7 picker. **Produces:** allowlisted authoring controls and responsive/RTL production geometry.

**Files:** Create `src/components/static-content/QmdMediaInspector.jsx`, `tests/qmdMediaInspector.test.js`, and `tests/e2e/qmd-reusable-media.spec.js`. Modify `src/static-content/qmd/portableQmdMedia.js`, `src/components/static-content/FreeTextSourceEditor.jsx`, `src/components/charts/FreeTextChartView.jsx`, `src/components/charts/QmdMediaView.jsx`, `src/styles/source-content.css`, `tests/portableQmdMedia.test.js`, `tests/qmdMediaView.test.js`, `tests/freeTextChartView.test.js`, and `tests/portableQmdDomSafety.test.js`.

- [ ] **RED:** Assert widths 25/33/50/66/75/100 and integer custom 10–100, align start/center/end, flow block/wrap-start/wrap-end, frame none/outline/card, caption, alt/decorative, Change image versus Open media item, and rejection of arbitrary pixels/CSS/attributes. Assert width is content-column relative, height auto, wrap max 50%, narrow panels collapse to block, logical alignment follows RTL, stored dimensions reserve space, and no panel horizontal overflow.
- [ ] Run `node --test tests/qmdMediaInspector.test.js tests/portableQmdMedia.test.js tests/qmdMediaView.test.js tests/freeTextChartView.test.js tests/portableQmdDomSafety.test.js`. Expected: FAIL on missing controls/styles/serialization.
- [ ] **GREEN:** Serialize only the exact contract; apply token classes/data attributes from `source-content.css`; keep caption distinct from alt and decorative alt empty; Change image mutates placement ID only, never library bytes/revision.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/qmd-reusable-media.spec.js --project=chromium --grep "Journey C — QMD media controls responsive RTL geometry and request authority"`. Expected: PASS at Build 1440×900/1024×768, View 390×844, and fullscreen. Inspect measured widths, wrap/collapse, RTL alignment, frame/caption, reserved aspect, missing fallback, request log, and zero overflow.
- [ ] Update S11/C06/C07/R03 evidence; commit `feat(qmd): add responsive media placement controls`.

### Task 10: CSV Manager Add and Six-Stage Authoring — Journey D

**Rows:** CSV portions of SCM-S04/C04/C05 and SCM-R04. **Consumes:** Tasks 3–4. **Produces:** deliberate unused CSV manager Add and chart-draft CSV registration/selection.

**Files:** Create `src/components/source-content/DataSourcePicker.jsx` and `tests/e2e/source-content-csv.spec.js`. Modify `src/components/source-content/DataSourceCatalogue.jsx`, `src/components/source-content/DataSourceDetail.jsx`, `src/components/source-content/CsvDetail.jsx`, `src/content-library/sourceEntrySchema.js`, `src/content-library/contentDraftTransaction.js`, `src/charting/forms/wizardDraft.js`, `src/components/chart-authoring/ChartWizardV3.jsx`, `src/components/chart-authoring/DataSourceStep.jsx`, `src/components/source-data/SourceCsvViewerButton.jsx`, `src/source-viewer/SourceCsvViewer.jsx`, `src/components/SourceViewer.jsx`, `src/components/source-data/sourceViewerProtocol.js`, `tests/sourceEntrySchema.test.js`, `tests/contentDraftTransaction.test.js`, `tests/contentDetail.test.js`, `tests/sourceViewer.test.js`, `tests/sourceViewerSort.test.js`, `tests/wizardDraftV3.test.js`, and `tests/chartAuthoringComponentsV3.test.js`.

- [ ] **RED:** Assert manager CSV upload parses/profiles/previews, edits label, warns on matching content without auto-dedupe, publishes an unused `sourceEntry`/`dataSource`/`datasetProfile` only on Add, and survives reload. Explicit Cancel, Close, Escape, mode departure, unmount, validation failure, and persistence failure leave no durable CSV record/payload/profile. Assert chart-flow upload stays chart-draft-owned, registers/selects on completed chart, exact six stages remain, and manager later shows preview/search/origin/health/usage/download.
- [ ] Run `node --test tests/sourceEntrySchema.test.js tests/contentDraftTransaction.test.js tests/contentDetail.test.js tests/sourceViewer.test.js tests/sourceViewerSort.test.js tests/wizardDraftV3.test.js tests/chartAuthoringComponentsV3.test.js`. Expected: FAIL on missing manager/Add/picker wiring.
- [ ] **GREEN:** Reuse the named Papa Parse/profile/viewer owners; do not add cell editing or duplicate authority. Manager CSV upload stages owner `manager`; chart-flow upload stages owner `chart`. Commit source entry, descriptor, profile, and optional chart together through the coordinator; every cancel/close/escape/mode-departure/unmount discards the staged payload.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-csv.spec.js --project=chromium --grep "Journey D — CSV upload through six stages then catalogue management"`. Expected: PASS at 1440×900/1024×768 with inspected stage count, IDs/profile, committed/unused and cancelled inventories, preview/search/download, dependency, focus, and reload.
- [ ] Update R04 and focused S04/C04/C05 evidence; commit `feat(content): manage CSV add and chart selection`.

### Task 11: CSV Direct Replacement Compatibility — Journey E

**Rows:** SCM-S09/R05 and CSV replace branch of C08. **Consumes:** Tasks 6 and 10. **Produces:** structural prepare/block/import-as-new/remap and compatible non-temporal commit.

**Files:** Create `src/content-library/csvReplacementTransaction.js`, `tests/csvReplacementTransaction.test.js`, and `tests/chartConfigV3.test.js`. Modify `src/components/source-content/DataSourceDetail.jsx`, `src/components/source-content/ContentActionDialog.jsx`, `src/components/source-content/DependencyList.jsx`, `src/lib/loadDashboard.js`, `src/charting/data/prepareChartData.js`, `tests/contentActionDialog.test.js`, `tests/contentDependencyGraph.test.js`, and `tests/chartRenderingV3.test.js`.

- [ ] **RED:** For every directly dependent chart, assert parse/safety/size/missing encoding column hard-blocks before mutation; map chart primary CSV is checked while its GeoJSON is unchanged. Assert typed reasons, no-op cancel, import-as-new distinct `sourceId`, guided remap targets, expected-current check, and injected rollback. Valid structurally compatible non-temporal replacement preserves `sourceId` and chart V3.
- [ ] Run `node --test tests/csvReplacementTransaction.test.js tests/contentActionDialog.test.js tests/contentDependencyGraph.test.js tests/chartConfigV3.test.js tests/chartRenderingV3.test.js`. Expected: FAIL on missing CSV transaction/compatibility.
- [ ] **GREEN:** Implement direct chart compatibility from exact encodings; prepare candidate descriptor/profile before commit; offer import/remap only after block. Register source/payload IDs through `contentDraftCoordinator.beginTransaction`, commit descriptor/profile/source metadata atomically, and call `completeTransaction` or `failTransaction` at the exact publication/rollback boundary.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-csv.spec.js --project=chromium --grep "Journey E — incompatible CSV replacement blocks and imports as new"`. Expected: PASS with original source/profile/render/GeoJSON equality, reason, new ID, remap navigation, dialog focus, and cancel.
- [ ] Update S09/R05/C08 evidence; commit `feat(content): block incompatible CSV replacement`.

### Task 12: CSV Temporal Impact and Durable Review Status — Journey F

**Rows:** SCM-S10/R06 and temporal branch of C08. **Consumes:** Task 11 structurally valid candidate. **Produces:** exact persisted `TemporalReview`, impact contexts, clearing, and Present warning.

**Files:** Create `src/charting/time/temporalReview.js`. Modify `src/content-library/csvReplacementTransaction.js`, `src/content-library/contentDependencyGraph.js`, `src/charting/time/chronoGroupModel.js`, `src/charting/time/dashboardTemporalConfig.js`, `src/charting/time/sceneSchema.js`, `src/charting/time/temporalNeedsAttention.js`, `src/components/time/chronoContentState.js`, `src/components/build/BuildWorkspace.jsx`, `src/components/presentation/PresentWorkspace.jsx`, `src/content-library/migrateDashboardV4ToV5.js`, `src/charting/config/dashboardBundleV3.js`, `src/lib/dashboardPackageExport.js`, `src/lib/dashboardPackageCandidate.js`, `src/lib/dashboardPackageImportTransaction.js`, `tests/csvReplacementTransaction.test.js`, `tests/chronoGroupModelV3.test.js`, `tests/temporalRuntimeIntegration.test.js`, `tests/sceneSchema.test.js`, `tests/temporalNeedsAttention.test.js`, `tests/chronoContentState.test.js`, `tests/scenePresentTransition.test.js`, `tests/buildWorkspaceV3.test.js`, `tests/presentWorkspace.test.js`, `tests/presentationProtocol.test.js`, `tests/dashboardMigrationV5.test.js`, and `tests/dashboardBundleV5.test.js`.

- [ ] **RED:** Assert exact impact kinds/IDs: `chrono-group` for array-found group members using source; `scene` for top-level Scene members plus defensive legacy `chartIds`/`frames.chartId`, intersecting affected charts; `scene-presentation` with Scene ID when `scene.present.chartIds` intersects. Assert cancel equality; confirm marks Chrono/Scene `needs-review`, Scene present `degraded`; unrelated configs untouched; repeat replacement unions sorted unique IDs; rollback restores all. Assert impacts are not dependencies.
- [ ] **RED schema/live:** Assert optional exact keys/statuses/non-empty IDs; malformed rejected; V4 import absent; V5 round-trip exact. Align `temporalNeedsAttention` with `sceneSchema` layouts `single`, `vertical-divider`, `horizontal-divider`, `large-top`, `large-bottom`, `large-left`, `large-right`, and `grid-2x2`. Assert findings/cards visible; `BuildWorkspace` Chrono save clears all IDs on that group and Scene save clears all Scene IDs plus all `scene.present` IDs when the composition validates. Assert active Scene present shows degraded warning while continuing to render. Assert `presentationProtocol` and audience actions/messages contain no review status.
- [ ] Run `node --test tests/csvReplacementTransaction.test.js tests/contentDependencyGraph.test.js tests/chronoGroupModelV3.test.js tests/temporalRuntimeIntegration.test.js tests/sceneSchema.test.js tests/temporalNeedsAttention.test.js tests/chronoContentState.test.js tests/scenePresentTransition.test.js tests/buildWorkspaceV3.test.js tests/presentWorkspace.test.js tests/presentationProtocol.test.js tests/dashboardMigrationV5.test.js tests/dashboardBundleV5.test.js`. Expected: FAIL on absent metadata/validation/projection or Build save-time clearing.
- [ ] **GREEN:** Implement `validateTemporalReview`, `mergeTemporalReview`, and `clearTemporalReviewSourceIds`; add optional allowed keys without making them required; use `dashboard.chronoGroups.find`, top-level `dashboard.scenes`, and durable `scene.present`. `SourceEntry.updateStatus` may summarize but never replaces config marks. Manual Present/presentationState remain transient.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-csv.spec.js --project=chromium --grep "Journey F — valid temporal CSV replacement warns then confirms"`. Expected: PASS at Build/Present 1440×900 with no-op cancel, exact impacts, stable ID/new data, visible review/degraded state, safe rendering, clearing after valid save, and no audience status.
- [ ] Update S10/R06/C08 and the technical/security record with exact metadata; commit `feat(content): persist CSV temporal review impacts`.

### Task 13: GeoJSON Manager, Selector, and Shared Map Budget — Journey I

**Rows:** SCM-C09/R09 and mounted SCM-S15; focused S04/S05/S07/C04/C05. **Consumes:** Tasks 2, 4, 6. **Produces:** GeoJSON Add/detail/preview/selector and one shared Build map budget.

**Files:** Create `src/components/source-content/GeoJsonDetail.jsx`, `src/components/source-content/GeoJsonPreview.jsx`, `src/components/build/BuildMapBudgetContext.jsx`, `tests/geoJsonContentManager.test.js`, and `tests/e2e/source-content-geojson.spec.js`. Modify `src/components/source-content/DataSourceCatalogue.jsx`, `src/components/source-content/DataSourceDetail.jsx`, `src/components/source-content/DataSourcePicker.jsx`, `src/components/source-content/SourceContentWorkspace.jsx`, `src/components/build/BuildWorkspace.jsx`, `src/components/dashboard/DashboardModeWorkspace.jsx`, `src/components/dashboard/DashboardCanvas.jsx`, `src/components/ChartPanel.jsx`, `src/components/charts/ChartView.jsx`, `src/components/charts/EChartsChartView.jsx`, `src/charting/forms/geographySource.js`, `src/components/chart-authoring/DataSourceStep.jsx`, `src/content-library/contentDraftTransaction.js`, `src/content-library/contentDependencyGraph.js`, `src/content-library/contentDeletionTransaction.js`, `tests/geoJsonValidation.test.js`, `tests/geoJsonSourceEntry.test.js`, `tests/chartAuthoringComponentsV3.test.js`, `tests/contentDependencyGraph.test.js`, `tests/contentDeletionTransaction.test.js`, `tests/embeddedEChartsItemV3.test.js`, `tests/staticPanelComposition.test.js`, `tests/dashboardGeometryContract.test.js`, `tests/sourceEvidenceDirectJourney.test.js`, and `tests/buildWorkspaceV3.test.js`.

- [ ] **RED model/UI:** Assert manager GeoJSON upload validates and shows canonical feature count, geometry distribution, bbox, sorted property keys, max keys per feature, accessible text fallback, editable label, and Add/cancel lifetime. Manager Add persists unused GeoJSON across reload; explicit Cancel, Close, Escape, mode departure, unmount, validation failure, and persistence failure leave no durable source/payload. Assert kind filter and tracked/package/uploaded options; close the known selector gap for `kind:'dataset',type:'uploadedGeoJson'` without changing six stages.
- [ ] **RED budget:** Mount `DashboardModeWorkspace` and assert its one `BuildMapBudgetProvider` wraps both `CanonicalDashboardFrame.workspaceControls` (the manager/BuildWorkspace branch) and `CanonicalDashboardFrame.pageContent` (DashboardCanvas). `ChartPanel` transports `{ownerId:'dashboard:'+chart.id,kind:'dashboard',visible:chartVisible,active:shouldRenderChart}` through `ChartView` to `EChartsChartView`; `GeoJsonPreview` registers `{ownerId:'preview:'+sourceId,kind:'preview',visible,active}`. Assert deterministic acquire/release/activation, visible-dashboard priority, allocations 1–2 normal, 3–4 visible degraded warning, fifth+ deferred/lazy, and release activation; concurrency never rejects/deletes a source.
- [ ] Run `node --test tests/geoJsonContentManager.test.js tests/geoJsonValidation.test.js tests/geoJsonSourceEntry.test.js tests/chartAuthoringComponentsV3.test.js tests/contentDependencyGraph.test.js tests/contentDeletionTransaction.test.js tests/embeddedEChartsItemV3.test.js tests/staticPanelComposition.test.js tests/dashboardGeometryContract.test.js tests/sourceEvidenceDirectJourney.test.js tests/buildWorkspaceV3.test.js`. Expected: FAIL on missing detail/preview/common-ancestor budget transport and uploaded selector gap.
- [ ] **GREEN:** `DashboardModeWorkspace` wraps its entire `CanonicalDashboardFrame` in the sole provider, so workspace-controls and page-content siblings share one registry. `ChartPanel` supplies its existing IntersectionObserver-owned visibility plus `shouldRenderChart`; `ChartView` forwards the exact request to `EChartsChartView`; previews use the same hook. Visible dashboard requests sort ahead of previews; no local counters exist. GeoJSON detail consumes only Task 2 summary. Manager upload stages owner `manager` and chart upload owner `chart`; coordinator Add publishes an unused source, while every Cancel/Close/Escape/mode-departure/unmount discards it.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-geojson.spec.js --project=chromium --grep "Journey I — GeoJSON upload select preview dependency and blocked delete"`. Expected: PASS at 1440×900/1024×768 with inspected Add/cancel inventories, six stages, all eligible representations, canonical summary, map/text fallback, shared four-slot behavior, dependency breadcrumb, and blocked Delete with no dialog.
- [ ] Update S15/C09/R09 and focused rows only after inspection; commit `feat(content): manage GeoJSON with shared map budget`.

### Task 14: GeoJSON Replacement and Relink — Journeys J and K

**Rows:** SCM-S16/R10/R11 and GeoJSON replace branch of C08. **Consumes:** Tasks 2, 6, 13. **Produces:** stable-source validated replacement outcomes.

**Files:** Create `src/content-library/geoJsonReplacementTransaction.js`, `tests/geoJsonReplacementTransaction.test.js`, and `tests/prepareGeographyData.test.js`. Modify `src/components/source-content/GeoJsonDetail.jsx`, `src/components/source-content/ContentActionDialog.jsx`, `src/components/source-content/DependencyList.jsx`, `src/charting/data/prepareGeographyData.js`, `src/charting/rendering/geographyAdapter.js`, `src/components/charts/EChartsChartView.jsx`, and `tests/e2e/source-content-geojson.spec.js`.

- [ ] **RED hard block:** Derive boundary candidates from `GEOJSON_LIMITS`; assert malformed/empty/unsupported/limit-failing, selected join-property removal, zero join coverage, or directly unusable map blocks atomically and offers import-as-new/remap. Original descriptor/payload/summary/map stays exact.
- [ ] **RED warning:** Assert feature-count/bbox/geometry-mix/reduced-nonzero join coverage warns; cancel is no-op; confirm preserves `sourceId`, publishes new payload/summary/map, and creates zero Chrono/Scene/presentation contexts. Relink follows the same validation.
- [ ] Run `node --test tests/geoJsonReplacementTransaction.test.js tests/geoJsonValidation.test.js tests/geoJsonSourceEntry.test.js tests/prepareGeographyData.test.js tests/contentActionDialog.test.js tests/contentDependencyGraph.test.js tests/chronoGroupModelV3.test.js`. Expected: FAIL on missing replacement owner/outcomes.
- [ ] **GREEN:** Prepare through Task 2 authority, then direct map/join checks; publish only after expected-current recheck. Register the source/payload IDs through `contentDraftCoordinator.beginTransaction`, close with `completeTransaction` or `failTransaction`, and support import-as-new/remap on block with transactional rollback.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run each test independently: `pnpm.cmd test:e2e -- tests/e2e/source-content-geojson.spec.js --project=chromium --grep "Journey J — invalid GeoJSON replacement blocks and imports as new"`; then the same command with `Journey K — valid GeoJSON geometry change warns then confirms`. Expected: both PASS with inspected original/new map geometry, IDs, dialogs, cancel, rollback, and no temporal contexts.
- [ ] Update S16/R10/R11/C08 evidence; commit `feat(content): validate GeoJSON replacement outcomes`.

### Task 15: V5 Persistence, Package, and Offline Portability — Journey G

**Rows:** SCM-S12/R07 and final S01/S02 package layer. **Consumes:** Tasks 1–14. **Produces:** atomic V5 persistence/export/import retaining used and unused managed content.

**Files:** Create `src/content-library/contentPackageValidation.js`, `tests/contentPackageValidation.test.js`, and `tests/e2e/source-content-portability.spec.js`. Modify `src/charting/config/dashboardBundleV3.js`, `src/lib/dashboardAssetPersistence.js`, `src/lib/browserStorage.js`, `src/lib/dashboardPackageExport.js`, `src/lib/dashboardPackageCandidate.js`, `src/lib/dashboardPackageImportTransaction.js`, `src/App.jsx`, `tests/dashboardMigrationV5.test.js`, `tests/dashboardBundleV5.test.js`, `tests/dashboardAssetPersistence.test.js`, `tests/dashboardPackageExport.test.js`, `tests/dashboardPackageCandidate.test.js`, `tests/dashboardPackageImportTransaction.test.js`, `tests/staticContentPortablePackage.test.js`, and `tests/portableFlashdriveLaunch.test.js`.

- [ ] **RED:** Assert exact dashboard/package V5 and chart V3, migration-before-validation, V4 omission of temporal review, exact V5 round-trip of it, retained unused local media/CSV/GeoJSON, physical image payload dedupe, CSV-only profiles, canonical GeoJSON summary, QMD local references, hashes/MIME/dimensions/animation/reference checks, and all-or-nothing missing/corrupt/quota rollback.
- [ ] Run `node --test tests/dashboardMigrationV5.test.js tests/dashboardBundleV5.test.js tests/dashboardAssetPersistence.test.js tests/dashboardPackageExport.test.js tests/dashboardPackageCandidate.test.js tests/dashboardPackageImportTransaction.test.js tests/contentPackageValidation.test.js tests/staticContentPortablePackage.test.js tests/portableFlashdriveLaunch.test.js`. Expected: FAIL on incomplete V5 package boundary.
- [ ] **GREEN:** Serialize logical records separately from existing payload authorities; include every retained stored/packaged media record even unused; validate whole candidate before replacing current dashboard/store.
- [ ] Re-run the exact command. Expected: PASS.
- [ ] Run `pnpm.cmd test:e2e -- tests/e2e/source-content-portability.spec.js --project=chromium --grep "Journey G — V5 offline round trip and V4 migration retain library"`. Expected: PASS at Build 1440×900, QMD View 390×844, fullscreen, and offline with exact IDs/revisions/hashes, used/unused items, CSV/GeoJSON, QMD/Image/map render, and zero requests.
- [ ] Update S01/S02/S12/R07 evidence; commit `feat(content): package the complete V5 content library`.

### Task 16: Health, Cleanup, and Isolated Recovery — Journey H

**Rows:** SCM-S14/R08. **Consumes:** Tasks 3, 5, 8, 11, 14, 15. **Produces:** typed health, explicit repair/relink, and safe startup cleanup.

**Files:** Create `src/content-library/contentHealth.js`, `tests/contentHealth.test.js`, and `tests/e2e/source-content-recovery.spec.js`. Modify `src/content-library/contentDraftTransaction.js`, `src/static-content/assets/assetReferenceGraph.js`, `src/static-content/assets/reconcileAuthoredAssets.js`, `src/lib/dashboardAssetPersistence.js`, `src/App.jsx`, `src/components/DashboardRenderer.jsx`, `src/components/source-content/MediaDetail.jsx`, `src/components/source-content/DataSourceDetail.jsx`, `src/components/source-content/GeoJsonDetail.jsx`, `src/components/charts/QmdMediaView.jsx`, `src/components/charts/ChartView.jsx`, `src/data/dashboardSourceProviders.js`, `tests/contentDraftTransaction.test.js`, `tests/contentHealth.test.js`, `tests/authoredAssetCleanup.test.js`, `tests/dashboardAppV3.test.js`, `tests/dashboardAssetPersistence.test.js`, `tests/qmdMediaView.test.js`, `tests/chartRenderingV3.test.js`, `tests/geoJsonReplacementTransaction.test.js`, and `tests/csvReplacementTransaction.test.js`.

- [ ] **RED:** Assert Ready/External/Missing/Corrupt/Needs relink/Needs review transitions; identity/dependencies persist; unhealthy QMD emits no image/request but keeps node/repair; passive View/fullscreen explains failure; failed CSV/GeoJSON repair retains last committed descriptor/profile/payload. Assert `buildAssetReferenceGraph({dashboard,activeRetainers})` and `reconcileAuthoredAssets({store,dashboard,activeRetainers,now})` retain bytes referenced by committed unused media records and by the coordinator's active drafts, contextual Image replacement, and transactions. Save/Discard/Restore/transaction completion clears only its resolved retainer; a new coordinator after reload reports empty session retainers; abandoned staging is reclaimed. Mount App→DashboardRenderer cleanup transport and inject persistence/reload failures to prove rollback plus sibling continuity.
- [ ] Run `node --test tests/contentDraftTransaction.test.js tests/contentHealth.test.js tests/authoredAssetCleanup.test.js tests/dashboardAppV3.test.js tests/dashboardAssetPersistence.test.js tests/qmdMediaView.test.js tests/chartRenderingV3.test.js tests/geoJsonReplacementTransaction.test.js tests/csvReplacementTransaction.test.js`. Expected: FAIL on missing health/repair/reference behavior or live retainer transport.
- [ ] **GREEN:** Derive health without erasing identity and repair through the corresponding validated replacement/relink transaction. `App` calls `contentDraftCoordinator.getActiveRetainers()` and passes the snapshot through its cleanup/reconciliation adapter; `DashboardRenderer` supplies the same coordinator to active authoring consumers. `assetReferenceGraph` treats every `contentLibrary.mediaItems[*].current.assetId` as durable even unused, plus only exact active-retainer asset IDs. Coordinator completion/discard notifications trigger reconciliation; startup creates a fresh empty coordinator and cleanup reclaims abandoned staging. Never invent undo history.
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
  'tests/staticSourceSchema.test.js','tests/staticSourceResolver.test.js','tests/chartRenderingV3.test.js','tests/chartViewV3.test.js','tests/staticPanelPersistence.test.js','tests/staticPanelTransaction.test.js','tests/staticContentDraft.test.js','tests/staticPanelComposition.test.js','tests/dashboardGeometryContract.test.js','tests/sourceEvidenceDirectJourney.test.js','tests/dashboardAppV3.test.js','tests/imageChartView.test.js','tests/presentWorkspace.test.js','tests/audienceDisplay.test.js','tests/audienceStaticAssetReadiness.test.js','tests/presentationProtocol.test.js','tests/dashboardBundleV3.test.js','tests/dashboardPackageExport.test.js','tests/dashboardPackageCandidate.test.js','tests/dashboardPackageImportTransaction.test.js','tests/dashboardAssetPersistence.test.js','tests/staticContentPortablePackage.test.js','tests/portableFlashdriveLaunch.test.js','tests/buildCommandHeader.test.js','tests/buildWorkspaceV3.test.js','tests/buildDirtyState.test.js','tests/browserAuthoredAssetStore.test.js','tests/authoredAssetCleanup.test.js','tests/wizardDraftV3.test.js','tests/chartAuthoringComponentsV3.test.js','tests/sourceViewer.test.js','tests/sourceViewerSort.test.js','tests/progressiveDashboardLoad.test.js','tests/chartSourceProfile.test.js','tests/dashboardSemanticBoundary.test.js','tests/embeddedEChartsItemV3.test.js','tests/chronoGroupModelV3.test.js','tests/temporalRuntimeIntegration.test.js','tests/sceneSchema.test.js','tests/temporalNeedsAttention.test.js','tests/chronoContentState.test.js','tests/scenePresentTransition.test.js'
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
| SCM-S01 — dashboard/bundle V5; V4 migration first; chart V3 | `src/charting/config/dashboardConfigStructure.js`; `src/charting/config/dashboardBundleV3.js`; `src/content-library/migrateDashboardV4ToV5.js` | migration/bundle exact versions, order, idempotence | V4 mixed import; G | Build 1440×900; valid/malformed/offline | serialized versions/keys/IDs; unchanged chart V3 | Proposed / unimplemented / not verified | SCM-D02 | 1,15,17 |
| SCM-S02 — exact library keys; existing payload authorities | `src/content-library/contentLibrarySchema.js`; `src/lib/loadDashboard.js` | alternate keys/authority duplication rejected | manager identity/detail correlation | Build 1440×900; all kinds/origins | exact registry→asset/data/profile readings | Proposed / unimplemented / not verified | SCM-D03 | 1,4,15,17 |
| SCM-S03 — stable media identity/revision; explicit logical reuse; default only pre-fills new placements | `src/content-library/mediaItems.js`; `src/static-content/assets/browserAuthoredAssetStore.js`; `src/content-library/contentDraftTransaction.js` | IDs, physical byte count, revision, old/new alt | A default/dedupe branch | Build 1440×900; duplicate/default edit | logical/physical counts and placement alts | Proposed / unimplemented / not verified | SCM-D03,D09 | 1,3,7,17 |
| SCM-S04 — trusted provenance visibility; generated hidden | `src/content-library/sourceEntrySchema.js` | adversarial filenames and explicit ownership | manager/picker origin/filter cases; D/I | Build 1440×900/1024×768 | exact visible/hidden IDs and labels | Proposed / unimplemented / not verified | SCM-D06 | 3,4,10,13,17 |
| SCM-S05 — direct uses plus actual retainers only | `src/content-library/contentDependencyGraph.js`; `src/content-library/contentDraftTransaction.js`; `src/components/build/buildDirtyState.js` | exact edge kinds/lifetimes/breadcrumbs | A and I blockers | Build 1440×900/1024×768 | IDs/kinds/breadcrumbs/retainer lifetime | Proposed / unimplemented / not verified | SCM-D04,D06 | 6,7,13,17 |
| SCM-S06 — temporal/presentation contexts are not dependencies | `src/content-library/contentDependencyGraph.js`; `src/lib/presentationProtocol.js`; `src/static-content/assets/assetReferenceGraph.js` | dependency count invariant and no message status | Present/Audience invariant; F contexts | Build/Present/Audience | direct counts, separate impacts, no runtime edge | Proposed / unimplemented / not verified | SCM-D06,D07 | 6,12,17 |
| SCM-S07 — no-cascade deletion; all real owners resolve first | `src/content-library/contentDeletionTransaction.js`; `src/content-library/contentDependencyGraph.js` | block/cancel/failure equality; no dangling ID | A/I blocked navigation then eligible delete | Build 1440×900/1024×768 | disabled/no-dialog, atomic inventory | Proposed / unimplemented / not verified | SCM-D04,D06 | 6,7,13,17 |
| SCM-S08 — replacement preserves mediaId and placement/view state | `src/content-library/contentReplacementTransaction.js`; `src/components/charts/ImageChartView.jsx`; `src/components/charts/QmdMediaView.jsx` | revision and contextual equality; rollback | B | Build/View/fullscreen | new bytes/revision; preserved settings/lease | Proposed / unimplemented / not verified | SCM-D05 | 8,17 |
| SCM-S09 — incompatible CSV blocks and offers import/remap | `src/content-library/csvReplacementTransaction.js`; `src/charting/data/prepareChartData.js` | parse/encoding/size/safety block; rollback | E | Build 1440×900; map primary CSV | original descriptor/profile/render/GeoJSON; new ID | Proposed / unimplemented / not verified | SCM-D07 | 11,17 |
| SCM-S10 — valid CSV temporal change warns/commits/marks exact configs | `src/content-library/csvReplacementTransaction.js`; `src/charting/time/temporalReview.js`; `src/charting/time/chronoGroupModel.js`; `src/charting/time/sceneSchema.js`; `src/charting/time/temporalNeedsAttention.js`; `src/components/presentation/PresentWorkspace.jsx` | exact impacts/status/union/clear/rollback | F | Build/Present 1440×900 | cancel no-op, marks, new data, safe render | Proposed / unimplemented / not verified | SCM-D07 | 12,17 |
| SCM-S11 — only known local QMD media renders; unsafe/unknown/external inert | `src/static-content/qmd/portableQmdMedia.js`; `src/static-content/qmd/renderPortableQmd.js`; `src/components/charts/FreeTextChartView.jsx`; `src/components/charts/QmdMediaView.jsx` | destination corpus, request log, lease lifecycle | C request-authority branch | Build 1440×900; View 390×844; fullscreen | DOM/text/hosts/requests/acquire-release | Proposed / unimplemented / not verified | SCM-D01,D10 | 5,9,17 |
| SCM-S12 — V5 package retains all managed content, including unused, atomically | `src/charting/config/dashboardBundleV3.js`; `src/lib/dashboardPackageExport.js`; `src/lib/dashboardPackageCandidate.js`; `src/lib/dashboardPackageImportTransaction.js`; `src/content-library/contentPackageValidation.js` | exact round trip and corrupt/quota rollback | G | Build 1440×900; offline | IDs/hashes/unused/type-correct summaries/prior equality | Proposed / unimplemented / not verified | SCM-D02,D08 | 15,17 |
| SCM-S13 — manager explicit Add; authoring commit with panel/chart; contextual prior Image only | `src/content-library/contentDraftTransaction.js`; `src/static-content/assets/reconcileAuthoredAssets.js`; `src/components/build/buildDirtyState.js` | every commit/cancel/reset/restore boundary | A draft/Restore branch | Build 1440×900/1024×768; reload | durable/staged counts and exact lifetime | Proposed / unimplemented / not verified | SCM-D05,D09 | 3,7,17 |
| SCM-S14 — typed health; explicit repair; safe cleanup | `src/content-library/contentHealth.js`; `src/static-content/assets/assetReferenceGraph.js`; `src/static-content/assets/reconcileAuthoredAssets.js`; `src/content-library/contentDraftTransaction.js` | health transitions and retained/reclaimed inventory | H | Build/View 1440×900; View 390×844; fullscreen | persistent identity/fallback/last-good/siblings | Proposed / unimplemented / not verified | SCM-D04,D08 | 16,17 |
| SCM-S15 — canonical GeoJSON summary and exact iterative limits | `src/lib/geoJsonValidation.js`; `src/content-library/geoJsonSourceEntry.js` | imported-constant boundaries; exact counts/summary | I upload/preview/runtime | Build 1440×900/1024×768 | facts/summary/limits/rollback/mounted consumer | Proposed / unimplemented / not verified | SCM-D06,D07 | 2,13,17 |
| SCM-S16 — GeoJSON structural/join/limit blocks; compatible geometry/coverage warns; no temporal contexts | `src/content-library/geoJsonReplacementTransaction.js`; `src/charting/data/prepareGeographyData.js`; `src/charting/rendering/geographyAdapter.js` | all block/warn/cancel/confirm cases | J and K | Build 1440×900/1024×768 | stable ID or prior equality, summaries/maps, zero impacts | Proposed / unimplemented / not verified | SCM-D07 | 14,17 |
| SCM-C01 — Source content command without stage drift | `src/components/build/BuildCommandHeader.jsx`; `src/components/build/BuildWorkspace.jsx`; `src/components/source-content/SourceContentWorkspace.jsx` | exact command and six/four-stage arrays | three-command composition case | Build 1440×900/1024×768 | control/workspace/focus/stages | Proposed / unimplemented / not verified | SCM-D06 | 4,17 |
| SCM-C02 — wide non-modal workspace restores canvas/scroll/selection/focus; phone unchanged | `src/components/build/BuildWorkspace.jsx`; `src/components/build/buildCanvasRestoration.js`; `src/components/source-content/SourceContentWorkspace.jsx` | exact snapshot/restoration and phone route | restoration case | 1440×900;1024×768;390×844 unsupported | before/after boxes/scroll/IDs/focus | Proposed / unimplemented / not verified | SCM-D06 | 4,17 |
| SCM-C03 — desktop side-by-side; tablet list/detail+Back; persistent state/no overflow | `src/components/source-content/SourceContentWorkspace.jsx`; `src/components/source-content/ContentCatalogue.jsx`; `src/components/source-content/ContentDetail.jsx` | responsive state and accessible regions | composition case | 1440×900/1024×768; empty/loading/error | region tree/query/filter/selection/geometry | Proposed / unimplemented / not verified | SCM-D06 | 4,17 |
| SCM-C04 — type-appropriate details/actions/dependencies/defaults/import | `src/components/source-content/MediaDetail.jsx`; `src/components/source-content/DataSourceDetail.jsx`; `src/components/source-content/CsvDetail.jsx`; `src/components/source-content/GeoJsonDetail.jsx`; `src/components/source-content/DependencyList.jsx` | text-only metadata, action eligibility, categories | A/I detail branches | 1440×900/1024×768; all health/origins | accessible tree/action inventory/target | Proposed / unimplemented / not verified | SCM-D06,D10 | 4,6,7,10,13,17 |
| SCM-C05 — pickers preserve workflows and exact draft/import eligibility | `src/components/source-content/MediaPicker.jsx`; `src/components/source-content/DataSourcePicker.jsx`; `src/components/static-content/FreeTextSourceEditor.jsx`; `src/components/static-content/ImageSourceEditor.jsx`; `src/components/chart-authoring/DataSourceStep.jsx` | inventories, stage counts, focus, draft ownership | A/D/I picker branches | Build 1440×900/1024×768 | selected ID/focus/stages/cancel inventory | Proposed / unimplemented / not verified | SCM-D01,D05,D06,D09,D10 | 7,10,13,17 |
| SCM-C06 — progressive exact QMD controls; Change differs from Replace | `src/components/static-content/QmdMediaInspector.jsx`; `src/static-content/qmd/portableQmdMedia.js` | tokens/labels/focus/command routing | C controls branch | Build 1440×900/1024×768 | QMD text/control inventory/unchanged revision | Proposed / unimplemented / not verified | SCM-D01,D03,D05 | 9,17 |
| SCM-C07 — aspect/reserved size/fit/RTL/wrap max/narrow collapse | `src/components/charts/FreeTextChartView.jsx`; `src/components/charts/QmdMediaView.jsx`; `src/styles/source-content.css` | token/DOM/lease/fallback semantics | C geometry branch | Build/View 1440×900;1024×768;390×844;fullscreen;RTL | bounds/aspect/overflow/wrap/collapse | Proposed / unimplemented / not verified | SCM-D01 | 5,9,17 |
| SCM-C08 — browse non-modal; blocked delete no dialog; eligible destructive modals | `src/components/source-content/ContentActionDialog.jsx`; `src/components/source-content/SourceContentWorkspace.jsx`; `src/content-library/contentDeletionTransaction.js`; `src/content-library/contentReplacementTransaction.js`; `src/content-library/csvReplacementTransaction.js`; `src/content-library/geoJsonReplacementTransaction.js` | disabled/modal/focus/feedback states | A/B/E/F/J/K action branches | 1440×900/1024×768; block/warn/error | no-dialog block; modal name/focus/return | Proposed / unimplemented / not verified | SCM-D05,D06,D07 | 6,8,11,12,14,17 |
| SCM-C09 — CSV/GeoJSON filter; canonical GeoJSON detail/preview; unchanged workflow | `src/components/source-content/DataSourceCatalogue.jsx`; `src/components/source-content/GeoJsonDetail.jsx`; `src/components/source-content/GeoJsonPreview.jsx`; `src/components/source-content/DataSourcePicker.jsx`; `src/components/build/BuildMapBudgetContext.jsx`; `src/components/dashboard/DashboardModeWorkspace.jsx` | filter/summary/slots/representations/six stages | I | Build 1440×900/1024×768 | IDs/summary/map/text fallback/slots/focus/overflow | Proposed / unimplemented / not verified | SCM-D06,D07 | 13,17 |
| SCM-R01 — create/reuse/default/external import/restore/dependencies/delete end-to-end | `src/content-library/mediaItems.js`; `src/content-library/contentDraftTransaction.js`; `src/content-library/contentDependencyGraph.js`; `src/content-library/contentDeletionTransaction.js`; `src/components/source-content/SourceContentWorkspace.jsx`; `src/components/source-content/MediaPicker.jsx`; `src/components/static-content/ImageSourceEditor.jsx` | prerequisite semantic/composition suite | A | Build 1440×900/1024×768; View390; fetch yes/no | IDs/hashes/alts/external unchanged/restore/breadcrumbs/no dangling ID | Proposed / unimplemented / not verified | SCM-D01,D03,D04,D05,D06,D09,D10 | 7,17 |
| SCM-R02 — global media replacement updates QMD/Image and preserves context | `src/content-library/contentReplacementTransaction.js`; `src/components/source-content/MediaDetail.jsx`; `src/components/source-content/ContentActionDialog.jsx`; `src/components/charts/ImageChartView.jsx`; `src/components/charts/QmdMediaView.jsx`; `src/static-content/assets/browserAuthoredAssetStore.js` | injected-failure replacement suite | B | Build/View 1440×900;fullscreen | settings equality/new revision/all-use update/rollback/lease | Proposed / unimplemented / not verified | SCM-D05 | 8,17 |
| SCM-R03 — QMD controls produce responsive/RTL/fallback geometry | `src/components/static-content/QmdMediaInspector.jsx`; `src/components/charts/QmdMediaView.jsx`; `src/static-content/qmd/portableQmdMedia.js`; `src/components/static-content/FreeTextSourceEditor.jsx`; `src/components/charts/FreeTextChartView.jsx` | QMD inspector/view/DOM suite | C | Build 1440×900/1024×768;View390;fullscreen;RTL | measured width/wrap/collapse/alignment/frame/caption/fallback | Proposed / unimplemented / not verified | SCM-D01 | 9,17 |
| SCM-R04 — CSV manager Add and six-stage upload/select then catalogue | `src/charting/forms/wizardDraft.js`; `src/components/chart-authoring/ChartWizardV3.jsx`; `src/components/source-content/DataSourcePicker.jsx`; `src/content-library/sourceEntrySchema.js`; `src/components/source-content/CsvDetail.jsx`; `src/content-library/contentDraftTransaction.js` | draft/wizard/source/detail suite | D | Build 1440×900/1024×768 | six stages/source/profile/dependency/preview/reload | Proposed / unimplemented / not verified | SCM-D06,D09 | 10,17 |
| SCM-R05 — incompatible CSV block/import/remap | `src/content-library/csvReplacementTransaction.js`; `src/components/source-content/ContentActionDialog.jsx`; `src/content-library/contentDependencyGraph.js`; `src/charting/data/prepareChartData.js` | structural block/rollback suite | E | Build 1440×900 | original state/reason/new ID/remap | Proposed / unimplemented / not verified | SCM-D07 | 11,17 |
| SCM-R06 — temporal CSV warning/confirm/status/clear | `src/content-library/csvReplacementTransaction.js`; `src/content-library/contentDependencyGraph.js`; `src/charting/time/temporalReview.js`; `src/components/presentation/PresentWorkspace.jsx` | exact schema/impact/live/protocol negatives | F | Build/Present 1440×900 | no-op cancel/stable ID/marks/clear/safe render/no message status | Proposed / unimplemented / not verified | SCM-D07 | 12,17 |
| SCM-R07 — V5/V4 round trip retains used/unused media/CSV/GeoJSON offline | `src/content-library/migrateDashboardV4ToV5.js`; `src/charting/config/dashboardBundleV3.js`; `src/lib/dashboardPackageExport.js`; `src/lib/dashboardPackageCandidate.js`; `src/lib/dashboardPackageImportTransaction.js`; `src/content-library/contentPackageValidation.js` | exact V4/V5/package tests | G | Build1440;View390;fullscreen;offline | keys/IDs/revisions/hashes/unused/zero requests/geometry | Proposed / unimplemented / not verified | SCM-D02,D08 | 15,17 |
| SCM-R08 — missing/corrupt/relink repair remains isolated | `src/content-library/contentHealth.js`; `src/components/source-content/MediaDetail.jsx`; `src/components/source-content/DataSourceDetail.jsx`; `src/data/dashboardSourceProviders.js`; `src/components/charts/ChartView.jsx`; `src/components/charts/QmdMediaView.jsx` | health/cleanup/persistence/replacement tests | H | Build/View1440;View390;fullscreen | identity/uses/fallback/last-good/repair/siblings | Proposed / unimplemented / not verified | SCM-D04,D08 | 16,17 |
| SCM-R09 — GeoJSON upload/select/manage/preview/dependency/blocked delete | `src/lib/geoJsonValidation.js`; `src/content-library/geoJsonSourceEntry.js`; `src/components/source-content/SourceContentWorkspace.jsx`; `src/components/build/BuildMapBudgetContext.jsx`; `src/components/source-content/DataSourcePicker.jsx`; `src/content-library/contentDependencyGraph.js`; `src/content-library/contentDeletionTransaction.js` | GeoJSON manager/slot/chart/graph suite | I | Build 1440×900/1024×768 | six stages/sourceId/summary/map/fallback/breadcrumb/no dialog | Proposed / unimplemented / not verified | SCM-D06,D07 | 13,17 |
| SCM-R10 — invalid GeoJSON replacement blocks/imports/remaps | `src/lib/geoJsonValidation.js`; `src/content-library/geoJsonReplacementTransaction.js`; `src/components/source-content/ContentActionDialog.jsx`; `src/charting/data/prepareGeographyData.js` | hard cases from imported limits plus join removal | J | Build 1440×900/1024×768 | prior equality/reason/new ID/remap/atomicity | Proposed / unimplemented / not verified | SCM-D07 | 14,17 |
| SCM-R11 — compatible GeoJSON geometry/coverage change warns/confirms without temporal context | `src/content-library/geoJsonReplacementTransaction.js`; `src/content-library/geoJsonSourceEntry.js`; `src/components/source-content/ContentActionDialog.jsx`; `src/components/charts/EChartsChartView.jsx` | warn/cancel/confirm/Chrono negative suite | K | Build 1440×900/1024×768 | stable ID/new summary/map/coverage warning/zero impacts | Proposed / unimplemented / not verified | SCM-D07 | 14,17 |

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
- [x] `GEOJSON_LIMITS` contains only ten exact `normalMax/warningMin/hardMin` source triples; separate `GEOJSON_CONCURRENT_MAPS` is used only by the shared live-map/preview registry fixture and provider.
- [x] CSV temporal shapes, impact kinds, array/top-level Scene ownership, layouts, clearing, migration/package preservation, Present warning, and protocol negative are exact.
- [x] Every helper/type/signature used here is defined in the file map or Shared Contracts; the undefined-symbol and signature-consistency scan has no findings.
- [x] Every deterministic test named by Tasks 1–16 appears in the Task-17 targeted sweep; all task-local production/test owners are exact paths with no generic or conditional fallback.
- [x] This correction changes only the plan and controlling audit documentation; production, tests, runtime configuration, dependencies, manifests, lockfiles, generated catalogues, and shared production CSS remain untouched.
- [x] Required targeted checks are proportional; full build/full suites are conditional on explicit pre-merge/release status.
