# Source Content Manager and QMD Reusable Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved dashboard-contained V5 reusable media and managed CSV/GeoJSON library, its Build manager and authoring pickers, portable QMD media, transactional replacement/deletion/recovery, and V5 portability without changing accepted Step 7S surface eligibility or workflow stage counts.

**Architecture:** The dashboard gains an exact-key logical `contentLibrary` layered over the existing authored-image byte store, `dataSources`, and CSV-only `datasetProfiles`. Stable `mediaId`/`sourceId` records feed one direct-dependency graph and separate draft, deletion, replacement, health, and package transactions; the non-modal Build manager and focused pickers consume those authorities. QMD recognizes only allowlisted `simex-media:` references and delegates leased rendering to one responsive view, while CSV and GeoJSON retain distinct validation/replacement semantics and one bounded GeoJSON authority.

**Tech Stack:** React 19, ES modules, Node `node:test`, Playwright Chromium, IndexedDB, Papa Parse, ECharts 5, existing portable-QMD safe DOM pipeline, existing dashboard/package commit controllers.

**Spec:** `docs/superpowers/specs/2026-08-25-source-content-manager-and-qmd-reusable-media-design.md`

**Planning authority:** Final written amendment `81531b4`, accepted GeoJSON calibration `c28b59d`, and accepted ownership reconciliation `dc06f8c`. The implemented Step 7S baseline remains accepted at `b366ba17fe856aede46ba8301b8a530520e4d2cd` with documentation closure `db63d8e772ce96b17de19b7a89f256a72926d08d`.

**Planning status:** Executable plan only. Production implementation has not begun; all 36 amendment rows remain `Proposed / unimplemented / not verified`.

## Global Constraints

- Canonical V5 keys are exactly `contentLibrary.mediaItems` and `contentLibrary.sourceEntries`; alternate keys are rejected.
- Dashboard schema and package bundle become V5; V4 import migrates before V5 validation; contained chart configuration remains V3.
- Logical identities never collapse merely because physical image hashes match; matching CSV content warns and never auto-deduplicates.
- `dataSources[sourceId]` remains CSV/GeoJSON kind and payload authority; `datasetProfiles[sourceId]` remains CSV-only; authored image bytes remain in the content-addressed authored-asset store.
- Builder-controlled CSV and GeoJSON are managed. Explicitly dashboard-owned generated/intermediate sources remain hidden; filenames and paths never imply generated ownership.
- Saved direct uses plus real active draft, Image replacement, or transaction retention block deletion. Page/section are breadcrumbs, deletion never cascades, and blocked Delete opens no dialog.
- Chrono groups, Scenes, and presentation compositions are CSV temporal-impact contexts only, not dependencies. GeoJSON produces no temporal warning context. Present messages and leases are transient.
- Media replacement preserves `mediaId`, increments revision, and preserves placement alt/decorative/crop/rotation/fit plus placement/surface-local zoom.
- CSV structural invalidity blocks; valid temporal/range/frame/availability changes warn and may commit. GeoJSON structural/join/limit invalidity blocks; compatible feature/bounds/geometry/join-coverage changes warn and may commit.
- `src/lib/geoJsonValidation.js` is the only GeoJSON limit authority. It implements: bytes/property values `<32,000,000` normal, `32,000,000–35,999,999` warning, `>=36,000,000` rejection; features `2,000/8,000`; total and one-feature positions `20,000/50,000`; parts and rings `2,000/4,000`; maximum own `Feature.properties` keys `512/1,000`; depth `16/32`; whole-document object/array nodes `30,000/50,000`; GeometryCollection rejection; no more than four eager Build map instances, with excess previews lazy/deferred.
- QMD renders only validated stored/packaged `simex-media:media-id` references. HTTP/HTTPS/data/blob/file/malformed/external-only destinations and disallowed attributes remain visible inert text and make no request.
- QMD image attributes are width `25/33/50/66/75/100` or integer custom `10–100`, align `start/center/end`, flow `block/wrap-start/wrap-end`, frame `none/outline/card`, optional text caption, and boolean decorative; arbitrary CSS/positioning never serializes.
- **Import as local media** applies only to an existing External / Network required HTTPS Image item. It creates a new stored `mediaId` after local upload or browser-permitted direct fetch passes the complete raster pipeline; it never proxies, bypasses CORS, mutates the external record, or rewrites existing Image uses.
- No global Build Undo/Redo is introduced. Build Reset is unchanged. Contextual Image **Restore previous image** remains visible beside replacement status until restore, Save, or Discard resolves its active draft retention.
- Add chart remains exactly six stages; Add static content remains exactly four stages.
- Free text remains Build/View/fullscreen only. Image remains additionally Present/passive Audience eligible. Static content remains excluded from Chrono groups and Scenes.
- Unsaved drafts are application-session-only. Persistent staging contains transaction recovery and cleanup facts, never reconstructable unsaved authoring fields.
- Existing permissive-inert Free-text behavior remains: all text is accepted by default, no sanitizer is introduced, and unsupported source remains inert.
- Every task uses red → observed failure → minimal implementation → targeted pass → mounted/live integration where required → same-slice evidence/status/deviation update → atomic commit.
- A row stays `Proposed / unimplemented / not verified` until its production owner is wired and its semantic, composition, and real-use evidence required by the ledger all pass.

---

## File and Interface Map

### New production modules

| Path | Exact responsibility and exported interface |
|---|---|
| `src/content-library/contentLibrarySchema.js` | `normalizeContentLibrary(value = {}) -> ContentLibrary`; `validateContentLibrary(value, { dataSources, assets }) -> ContentLibrary`. Exact logical shape/cross-key identity only. |
| `src/content-library/migrateDashboardV4ToV5.js` | `migrateDashboardV4ToV5(config) -> DashboardV5`. Deterministic/idempotent media and eligible CSV/GeoJSON logical-record migration. |
| `src/content-library/mediaItems.js` | `createMediaItem(input) -> MediaItem`; `replaceMediaItemRevision(item, nextCurrent) -> MediaItem`; `validateMediaItem(item, { assets }) -> MediaItem`. |
| `src/content-library/sourceEntrySchema.js` | `classifyManagedSource(sourceId, descriptor) -> SourceClassification`; `validateSourceEntry(entry, { sourceId, descriptor }) -> SourceEntry`; `listManageableSourceEntries(contentLibrary, dataSources) -> ManagedSourceOption[]`. |
| `src/content-library/geoJsonSourceEntry.js` | `normalizeManagedGeoJsonSource(sourceId, descriptor, validation) -> ManagedGeoJsonSource`; `summarizeGeoJsonSource(validation) -> GeoJsonSummary`. |
| `src/lib/geoJsonValidation.js` | `GEOJSON_LIMITS`; `inspectGeoJsonComplexity(value, { encodedBytes, description }) -> GeoJsonInspection`; `validateGeoJson(input, { encodedBytes, description }) -> GeoJsonValidation`. Single iterative limit/structure/summary authority. |
| `src/content-library/contentDependencyGraph.js` | `buildContentDependencyGraph(input) -> ContentDependencyGraph`; selectors `mediaDependencies`, `csvDependencies`, `geoJsonDependencies`, `activeRetentions`, `temporalImpactContexts`. |
| `src/content-library/contentDeletionTransaction.js` | `prepareContentDeletion(input) -> ContentDeletionPlan`; `commitContentDeletion(plan, adapters) -> Promise<ContentDeletionResult>`. No-cascade eligibility and atomic mutation. |
| `src/content-library/contentReplacementTransaction.js` | `prepareMediaReplacement`, `prepareCsvReplacement`, `prepareGeoJsonReplacement`; `validateDirectChartCompatibility`; warning selectors; `applyTemporalImpactStatus`; and three atomic `commit*Replacement` functions returning typed outcomes. |
| `src/content-library/contentDraftTransaction.js` | `stageContentDraft(input) -> Promise<ContentDraft>`; `finalizeContentDraft(input) -> Promise<ContentDraftCommit>`; `discardContentDraft(input) -> Promise<ContentDraftDiscard>`. Session draft ownership and publication only. |
| `src/content-library/contentHealth.js` | `deriveContentHealth(input) -> ContentHealthResult`; `repairContentItem(input) -> Promise<ContentRepairResult>`. Persistent identity and explicit repair. |
| `src/content-library/contentPackageValidation.js` | `validateContentPackage(input) -> ContentPackageValidation`. V5 cross-layer/package references only. |
| `src/static-content/qmd/portableQmdMedia.js` | `parsePortableMediaReference(destination) -> PortableMediaReferenceResult`; `validatePortableMediaAttributes(attributes) -> PortableMediaAttributeResult`; `serializePortableMediaReference(input) -> string`. |
| `src/components/source-content/SourceContentWorkspace.jsx` | `SourceContentWorkspace(props)`. Non-modal workspace shell, tabs, responsive state, and restoration contract. |
| `src/components/source-content/ContentCatalogue.jsx` | `ContentCatalogue(props)`. Shared accessible query/filter/list/selection shell. |
| `src/components/source-content/MediaCatalogue.jsx` | `MediaCatalogue(props)`. Media rows, filters, status, usage, and create entry. |
| `src/components/source-content/DataSourceCatalogue.jsx` | `DataSourceCatalogue(props)`. CSV/GeoJSON rows and kind/origin/health/usage filters. |
| `src/components/source-content/ContentDetail.jsx` | `ContentDetail(props)`. Selected-kind routing only. |
| `src/components/source-content/MediaDetail.jsx` | `MediaDetail(props)`. Media preview, default description, revision, health, usage, and eligible actions. |
| `src/components/source-content/DataSourceDetail.jsx` | `DataSourceDetail(props)`. Shared source actions and CSV/GeoJSON detail routing. |
| `src/components/source-content/CsvDetail.jsx` | `CsvDetail(props)`. CSV-only profile/searchable preview/download. |
| `src/components/source-content/GeoJsonDetail.jsx` | `GeoJsonDetail(props)`. GeoJSON-only summary and actions. |
| `src/components/source-content/GeoJsonPreview.jsx` | `GeoJsonPreview(props)`. Bounded ECharts map preview, text fallback, eager-slot lifecycle. |
| `src/components/source-content/DependencyList.jsx` | `DependencyList(props)`. Direct-use breadcrumbs and temporary-retention explanations/navigation. |
| `src/components/source-content/ContentActionDialog.jsx` | `ContentActionDialog(props)`. Eligible delete, replace/relink, and guided remap modal states only. |
| `src/components/source-content/MediaPicker.jsx` | `MediaPicker(props)`. QMD/Image eligibility, reuse/upload, external-local import, focus return. |
| `src/components/source-content/DataSourcePicker.jsx` | `DataSourcePicker(props)`. Managed CSV/GeoJSON selection/upload without workflow-stage ownership. |
| `src/components/static-content/QmdMediaInspector.jsx` | `QmdMediaInspector(props)`. Progressive placement controls and Change/Open routing. |
| `src/components/charts/QmdMediaView.jsx` | `QmdMediaView(props)`. Leased local render, responsive geometry, and bounded fallback. |
| `src/styles/source-content.css` | Manager, picker, preview, dependency, dialog, and QMD-media token classes only. |

### Existing production integrations

| Path | Exact symbols changed |
|---|---|
| `src/charting/config/dashboardConfigStructure.js` | `DASHBOARD_CONFIG_STRUCTURE`, `validateDashboardStructure`: version 5 and optional exact `contentLibrary`. |
| `src/charting/config/dashboardBundleV3.js` | `DASHBOARD_SCHEMA_VERSION`, `DASHBOARD_BUNDLE_VERSION`, `normalizeDashboardBoundary`, `validateDashboardConfig`, `serializeDashboardBundle`, `parseDashboardBundle`: V4 migration before V5 validation, bundle V5, chart V3 unchanged. |
| `src/lib/loadDashboard.js` | `validateDashboardSourceDescriptors`, `validateDataSourceDescriptor`, `validateDatasetProfiles`, current `validateGeoJson`: preserve descriptor/profile ownership and delegate GeoJSON decisions. |
| `src/static-content/staticSourceSchema.js` | `normalizeStaticSource`, `validateStaticImageSource`, `validateAuthoredAssetManifest`: Static Image sourceVersion 2 placement uses `mediaId`; placement fields remain contextual. |
| `src/static-content/assets/browserAuthoredAssetStore.js` | Existing stage/commit/verify/read/lease functions: physical dedupe and revision-safe lease publication. |
| `src/static-content/assets/assetReferenceGraph.js` | `buildAssetReferenceGraph`, `findAuthoredAssetOrphans`: retained committed media records plus real active retainers. |
| `src/static-content/assets/reconcileAuthoredAssets.js` | `reconcileAuthoredAssets`: reclaim abandoned staging, never retained library content. |
| `src/lib/dashboardAssetPersistence.js`, `src/lib/browserStorage.js`, `src/App.jsx` | Existing persistence/import/export commit path carries V5 metadata and transaction results; drafts remain memory-only. |
| `src/components/build/BuildCommandHeader.jsx` | `BuildCommandHeader`: add Source content beside existing commands. |
| `src/components/build/BuildWorkspace.jsx` | `BuildWorkspace`: host one auxiliary manager and preserve phone policy. |
| `src/components/build/buildCanvasRestoration.js` | Existing capture/restore functions: manager canvas/scroll/selection/focus restoration. |
| `src/components/build/buildDirtyState.js` | `activeLocalAuthoringDrafts`: expose only actual manager/QMD/Image/chart draft and replacement retention. |
| `src/components/DashboardRenderer.jsx` | Consumer/wiring for V5 transactions, manager open/close, selection navigation, and reset; not retention authority. |
| `src/charting/forms/wizardDraft.js`, `src/components/chart-authoring/ChartWizardV3.jsx`, `src/components/chart-authoring/DataSourceStep.jsx` | Preserve six stages; register/select managed CSV and GeoJSON inside existing stages. |
| `src/charting/forms/geographySource.js` | `validatedGeoSourceOptions`: normalize tracked, packaged, and `dataset/uploadedGeoJson` eligible representations. |
| `src/static-content/forms/staticContentDraft.js`, `src/components/static-content/StaticContentWizard.jsx` | Preserve four stages and finalize content drafts with panel commit. |
| `src/components/static-content/FreeTextSourceEditor.jsx` | Insert image picker and QMD placement selection. |
| `src/components/static-content/ImageSourceEditor.jsx` | Choose from media, default-alt prefill, and visible Restore previous image lifecycle. |
| `src/static-content/qmd/parsePortableQmd.js`, `renderPortableQmd.js`, `compilePortableQmd.js` | Recognize validated local media nodes; preserve inert fallback and actual DOM budget. |
| `src/components/charts/FreeTextChartView.jsx`, `src/components/charts/ImageChartView.jsx`, `src/components/charts/ChartView.jsx` | Resolve current media revision; mount QMD media; preserve existing active/passive capability boundary. |
| `src/components/source-data/SourceCsvViewerButton.jsx`, `src/source-viewer/SourceCsvViewer.jsx`, `src/components/SourceViewer.jsx`, `src/components/source-data/sourceViewerProtocol.js` | Reuse CSV preview/profile/search/download behavior in manager detail. |
| `src/charting/data/prepareChartData.js`, `src/charting/data/prepareGeographyData.js`, `src/charting/rendering/geographyAdapter.js`, `src/components/charts/EChartsChartView.jsx` | Direct compatibility checks and bounded GeoJSON preview/map consumers. |
| `src/charting/time/chronoGroupModel.js`, `src/charting/time/sceneSchema.js`, `src/components/presentation/PresentWorkspace.jsx` | CSV temporal impact status only; no new dependency edge. |
| `src/static-content/staticPanelCapabilities.js`, `src/lib/presentationProtocol.js`, `src/components/presentation/AudienceDisplay.jsx`, `src/components/presentation/useAudienceStaticAssetReadiness.js` | Preserve Free-text exclusion, Image-only passive presentation, and identity/revision messages. |
| `src/lib/dashboardPackageExport.js`, `src/lib/dashboardPackageCandidate.js`, `src/lib/dashboardPackageImportTransaction.js` | V5 retained-library export/import and atomic validation. |
| `src/main.jsx` | Import `src/styles/source-content.css` once with the existing global style entrypoints. |

### Deterministic and browser tests

Create the missing exact proposed unit/integration files from the ownership inventory: `tests/contentLibrarySchema.test.js`, `dashboardMigrationV5.test.js`, `dashboardBundleV5.test.js`, `mediaItems.test.js`, `sourceEntrySchema.test.js`, `geoJsonValidation.test.js`, `geoJsonSourceEntry.test.js`, `contentDraftTransaction.test.js`, `contentDependencyGraph.test.js`, `contentDeletionTransaction.test.js`, `contentReplacementTransaction.test.js`, `csvReplacementTransaction.test.js`, `geoJsonReplacementTransaction.test.js`, `contentHealth.test.js`, `contentPackageValidation.test.js`, `sourceContentWorkspace.test.js`, `contentDetail.test.js`, `contentPicker.test.js`, `qmdMediaInspector.test.js`, `qmdMediaView.test.js`, `portableQmdMedia.test.js`, `contentActionDialog.test.js`, `geoJsonContentManager.test.js`, `chartConfigV3.test.js`, and `prepareGeographyData.test.js`. Modify the existing `portableQmdDomSafety.test.js`, `dashboardPackageImportTransaction.test.js`, and other existing tests named by each task instead of creating competing owners.

Create exactly six Playwright files: `tests/e2e/source-content-manager.spec.js`, `source-content-media.spec.js`, `qmd-reusable-media.spec.js`, `source-content-csv.spec.js`, `source-content-geojson.spec.js`, and `source-content-portability.spec.js`; create `source-content-recovery.spec.js` for Journey H. Keep Journeys A–K as separately named tests.

Create `docs/audits/2026-08-24-v3-static-content-panels/SOURCE-CONTENT-MANAGER-IMPLEMENTATION-EVIDENCE.md` as the single slice/evidence ledger. Every substantive commit updates that file plus the controlling fidelity/security/deviation records for the rows it changes; it records engine, UI, and fidelity independently.

## Shared Data Contracts

```js
/** @typedef {{mediaItems: Record<string, MediaItem>, sourceEntries: Record<string, SourceEntry>}} ContentLibrary */
/** @typedef {{kind:'asset'|'package'|'url', assetId?:string, path?:string, url?:string}} MediaCurrent */
/** @typedef {{mediaId:string, revision:number, current:MediaCurrent, displayName:string, defaultDescription:string, origin:'uploaded'|'packaged'|'external'|'legacy-import', health:'ready'|'external'|'missing'|'corrupt'|'needs-relink'|'needs-review', dimensions?:{width:number,height:number}, byteLength?:number, mediaType?:string}} MediaItem */
/** @typedef {{sourceId:string, origin:'uploaded'|'linked-project'|'packaged'|'legacy-import'|'generated', ownership:'builder'|'dashboard', displayName:string, provenance:object, health:'ready'|'missing'|'corrupt'|'needs-relink'|'needs-review', updateStatus?:string}} SourceEntry */
/** @typedef {{status:'normal'|'warning'|'reject', facts:GeoJsonFacts, warnings:readonly GeoJsonFact[], errors:readonly GeoJsonFact[], summary:GeoJsonSummary|null, value:object|null}} GeoJsonValidation */
/** @typedef {{itemKind:'media'|'csv'|'geojson', itemId:string, savedUses:readonly DirectUse[], activeRetentions:readonly Retention[], temporalImpacts:readonly ImpactContext[]}} ContentDependencyRecord */
/** @typedef {{status:'blocked'|'warning'|'ready', reasons:readonly object[], warnings:readonly object[], candidate:object|null, previous:object, transactionId:string}} ReplacementPlan */
```

All model-returning functions freeze their returned records/arrays. Transaction commit functions accept prepared plans only, verify the plan's expected current revision immediately before mutation, publish through the existing serialized dashboard commit controller, and return `{ status, dashboard, committedIds, reclaimedIds }`; a rejected/stale/failing commit returns or throws before exposing partial dashboard/library/store state.

## Dependency Order

Execute Tasks 1–12 sequentially. Tasks 1–3 establish V5 identities and the single GeoJSON/draft authorities; Tasks 4–6 mount the manager, dependency/deletion UI, and pickers; Tasks 7–10 add QMD/media/CSV/GeoJSON vertical behavior; Task 11 closes persistence/package/offline recovery; Task 12 performs the integrated promotion gate. One implementation owner works at a time because `DashboardRenderer.jsx`, `BuildWorkspace.jsx`, package boundaries, and the controlling records overlap.

### Task 1: Canonical V5 Library and V4 Migration Slice

**Rows:** SCM-S01, SCM-S02, SCM-S04 (engine); SCM-R07 remains unpromoted until Task 11.

**Files:**
- Create: `src/content-library/contentLibrarySchema.js`, `src/content-library/migrateDashboardV4ToV5.js`, `src/content-library/mediaItems.js`, `src/content-library/sourceEntrySchema.js`.
- Modify: `src/charting/config/dashboardConfigStructure.js`, `src/charting/config/dashboardBundleV3.js`, `src/lib/loadDashboard.js`, `src/static-content/staticSourceSchema.js`, `src/App.jsx`.
- Create tests: `tests/contentLibrarySchema.test.js`, `tests/dashboardMigrationV5.test.js`, `tests/dashboardBundleV5.test.js`, `tests/mediaItems.test.js`, `tests/sourceEntrySchema.test.js`.
- Modify tests: `tests/dashboardMigrationV4.test.js`, `tests/dashboardBundleV3.test.js`, `tests/staticSourceSchema.test.js`, `tests/dashboardAssetPersistence.test.js`.
- Browser: `tests/e2e/source-content-portability.spec.js` test `V4 mixed content migrates to canonical V5 before manager use`.
- Records: implementation evidence, amendment fidelity, security/deviation, and master submission.

**Interfaces:**
- Consumes: V4 `assets`, `dataSources`, `datasetProfiles`, existing `migrateDashboardV3ToV4(config)`, and chart V3 records.
- Produces: the exact `ContentLibrary`, `MediaItem`, and `SourceEntry` contracts above; Static Image sourceVersion 2 `{kind:'staticImage', sourceVersion:2, mediaId, alt, decorative, fit, crop, rotation}`; dashboard/bundle version 5.

- [ ] **Step 1: Write exact-key and migration failures**

```js
assert.deepEqual(Object.keys(normalizeContentLibrary({})).sort(), ["mediaItems", "sourceEntries"]);
assert.throws(() => validateContentLibrary({ mediaItems: {}, sourceEntries: {}, media: {} }, ctx), /Unknown contentLibrary property "media"/);
assert.equal(migrateDashboardV4ToV5(v4Mixed).configVersion, 5);
assert.equal(migrateDashboardV4ToV5(v4Mixed).pages[0].sections[0].panels[0].chart.configVersion, 3);
assert.equal(migrated.dataSources.image_source.mediaId, migrated.contentLibrary.mediaItems[mediaId].mediaId);
assert.equal(migrated.contentLibrary.sourceEntries.generated_csv.ownership, "dashboard");
assert.equal(listManageableSourceEntries(migrated.contentLibrary, migrated.dataSources).some(({ sourceId }) => sourceId === "generated_csv"), false);
```

- [ ] **Step 2: Run the focused tests and observe RED**

Run: `node --test tests/contentLibrarySchema.test.js tests/dashboardMigrationV5.test.js tests/dashboardBundleV5.test.js tests/mediaItems.test.js tests/sourceEntrySchema.test.js`

Expected: FAIL because V5 constants/modules and Static Image `mediaId` validation do not exist.

- [ ] **Step 3: Implement the exact V5 boundary and idempotent migration**

```js
export const DASHBOARD_BUNDLE_VERSION = 5;
export function normalizeContentLibrary(value = {}) {
  return Object.freeze({
    mediaItems: Object.freeze({ ...(value.mediaItems ?? {}) }),
    sourceEntries: Object.freeze({ ...(value.sourceEntries ?? {}) }),
  });
}
export function migrateDashboardV4ToV5(config) {
  if (config?.configVersion === 5) return validateAndCloneV5(config);
  if (config?.configVersion !== 4) throw new Error("Dashboard schema V4 is required before V5 migration.");
  return buildCanonicalV5(config); // deterministic IDs from existing source identity, never filename classification
}
```

Wire `normalizeDashboardBoundary` as V3→V4 when necessary, then V4→V5, then V5 validation. Keep `chart.configVersion === 3`, reject `contentRegistry`, `media`, and `sources`, classify uncertain eligible CSV/GeoJSON as builder-owned `legacy-import`, and keep trusted generated/intermediate records dashboard-owned and hidden.

- [ ] **Step 4: Run focused and affected baseline tests**

Run: `node --test tests/contentLibrarySchema.test.js tests/dashboardMigrationV5.test.js tests/dashboardBundleV5.test.js tests/mediaItems.test.js tests/sourceEntrySchema.test.js tests/dashboardMigrationV4.test.js tests/dashboardBundleV3.test.js tests/staticSourceSchema.test.js tests/dashboardAssetPersistence.test.js`

Expected: PASS; V4 inputs canonicalize to V5, direct V5 validates, and chart V3/base Step 7S migration assertions remain green.

- [ ] **Step 5: Add the live production-import integration**

```js
test("V4 mixed content migrates to canonical V5 before manager use", async ({ page }) => {
  await importDashboardPackage(page, "fixtures/v4-mixed-content.simex");
  const exported = await exportDashboardJson(page);
  expect(exported.configVersion).toBe(5);
  expect(Object.keys(exported.contentLibrary).sort()).toEqual(["mediaItems", "sourceEntries"]);
  expect(allChartConfigVersions(exported)).toEqual([3]);
  expect(exported.contentLibrary.sourceEntries.legacy_geo.origin).toBe("legacy-import");
});
```

Run: `pnpm test:e2e -- tests/e2e/source-content-portability.spec.js --project=chromium --grep "V4 mixed content"`

Expected: PASS in the actual app; no pre-migration V4 rejection and no alternate registry key.

- [ ] **Step 6: Record same-slice evidence without over-promoting rows**

Append exact serialized keys/version outputs and browser checkpoint inspection to the implementation evidence. Mark SCM-S01/S02 engine implemented and live import wired; keep their UI/fidelity columns and SCM-R07 `Proposed / unimplemented / not verified` until manager/package journeys pass. Record no change to accepted Step 7S 36/36.

- [ ] **Step 7: Commit the slice atomically**

```bash
git add src/content-library src/charting/config/dashboardConfigStructure.js src/charting/config/dashboardBundleV3.js src/lib/loadDashboard.js src/static-content/staticSourceSchema.js src/App.jsx tests docs/audits/2026-08-24-v3-static-content-panels
git commit -m "feat(content-library): add canonical V5 identities"
```

### Task 2: Bounded GeoJSON Authority and Source Normalization Slice

**Rows:** SCM-S15 engine and live ingestion; row remains unverified until Task 10 mounts manager/authoring/runtime paths.

**Files:**
- Create: `src/lib/geoJsonValidation.js`, `src/content-library/geoJsonSourceEntry.js`.
- Modify: `src/lib/loadDashboard.js`, `src/data/sourceRequest.js`, `src/data/dashboardSourceProviders.js`, `src/charting/data/geoData.js`, `src/charting/data/prepareGeographyData.js`, `src/charting/rendering/geographyAdapter.js`, `src/components/charts/EChartsChartView.jsx`.
- Create tests: `tests/geoJsonValidation.test.js`, `tests/geoJsonSourceEntry.test.js`.
- Create test: `tests/prepareGeographyData.test.js`.
- Modify tests: `tests/progressiveDashboardLoad.test.js`, `tests/chartRenderingV3.test.js`.
- Browser: add `current import path consumes the single bounded GeoJSON authority` to `tests/e2e/source-content-portability.spec.js`.
- Records: implementation evidence, amendment fidelity/security, GeoJSON decision implementation note.

**Interfaces:**
- Consumes: exact `GEOJSON-LIMITS-DECISION.md`, raw text/byte length at ingestion, and `dataSources` descriptors.
- Produces: frozen `GEOJSON_LIMITS`, `GeoJsonValidation`, and `GeoJsonSummary {featureCount, geometryTypes, bbox, propertyKeys, totalPositions, maxFeaturePositions, parts, rings}`. Join coverage is absent from the resource result.

- [ ] **Step 1: Write independent boundary and counting failures**

```js
assert.equal(GEOJSON_LIMITS.encodedBytes.warning, 32_000_000);
assert.equal(GEOJSON_LIMITS.encodedBytes.hard, 36_000_000);
assert.equal(validateGeoJson(validAtWarning, { encodedBytes: 32_000_000 }).status, "warning");
assert.equal(validateGeoJson(validAtHard, { encodedBytes: 36_000_000 }).status, "reject");
assert.equal(inspectGeoJsonComplexity(nodeFixture(49_999), options).status, "warning");
assert.equal(inspectGeoJsonComplexity(nodeFixture(50_000), options).status, "reject");
assert.equal(validateGeoJson(geometryCollection, options).errors[0].code, "unsupported-geometry-collection");
assert.equal(summary.maxPropertyKeysPerFeature, Math.max(...features.map((f) => Object.keys(f.properties).length)));
assert.equal(Object.hasOwn(summary, "datasetProfile"), false);
```

Cover every normal/warn/hard pair: features 2,000/8,000; positions 20,000/50,000; parts/rings 2,000/4,000; keys 512/1,000; depth 16/32; structural nodes 30,000/50,000; encoded property values 32/36 MB. Assert the iterative stack increments before expansion and stops at the first hard fact.

- [ ] **Step 2: Run the GeoJSON tests and observe RED**

Run: `node --test tests/geoJsonValidation.test.js tests/geoJsonSourceEntry.test.js tests/progressiveDashboardLoad.test.js tests/prepareGeographyData.test.js tests/chartRenderingV3.test.js`

Expected: FAIL because the central authority and exact limits do not exist and `loadDashboard` owns a competing validator.

- [ ] **Step 3: Implement one iterative authority**

```js
export const GEOJSON_LIMITS = deepFreeze({
  encodedBytes: { warning: 32_000_000, hard: 36_000_000 },
  propertyValueBytes: { warning: 32_000_000, hard: 36_000_000 },
  features: { warning: 2_000, hard: 8_000 },
  totalPositions: { warning: 20_000, hard: 50_000 },
  maxFeaturePositions: { warning: 20_000, hard: 50_000 },
  parts: { warning: 2_000, hard: 4_000 },
  rings: { warning: 2_000, hard: 4_000 },
  maxPropertyKeysPerFeature: { warning: 512, hard: 1_000 },
  depth: { warning: 16, hard: 32 },
  structuralNodes: { warning: 30_000, hard: 50_000 },
  eagerMaps: { normal: 2, hard: 4 },
});
export function validateGeoJson(input, { encodedBytes, description = "GeoJSON source" } = {}) {
  const parsed = parseAfterByteGate(input, encodedBytes, description);
  return inspectGeoJsonComplexity(parsed.value, { encodedBytes: parsed.encodedBytes, description });
}
```

Use a stack of `{value, depth, context}` records, count each non-null object/array container before child expansion, reject GeometryCollection before part/ring expansion, count scalar property bytes with `TextEncoder(JSON.stringify(value))`, and return before summary/preview on any hard cap. Change current `loadDashboard.validateGeoJson(value, description)` into a compatibility adapter that calls this authority and throws typed rejection; no copied thresholds remain.

- [ ] **Step 4: Run focused tests and retained calibration correspondence**

Run: `node --test tests/geoJsonValidation.test.js tests/geoJsonSourceEntry.test.js tests/progressiveDashboardLoad.test.js tests/prepareGeographyData.test.js tests/chartRenderingV3.test.js`

Expected: PASS with constants matching the accepted decision and each hard candidate rejected before durable/runtime registration.

- [ ] **Step 5: Prove a production ingestion path uses the authority**

Run: `pnpm test:e2e -- tests/e2e/source-content-portability.spec.js --project=chromium --grep "single bounded GeoJSON authority"`

Expected: PASS for a legitimate shipped file and a controlled rejection; inspected app state contains the exact summary and no registered map/source mutation after rejection.

- [ ] **Step 6: Record the partial implementation truthfully**

Record engine implemented and current ingestion wired, cite calibration evidence rather than rerunning it, and leave SCM-S15 fidelity `Proposed / unimplemented / not verified` because manager upload, preview concurrency, replacement, and authoring are Task 10.

- [ ] **Step 7: Commit the slice atomically**

```bash
git add src/lib/geoJsonValidation.js src/content-library/geoJsonSourceEntry.js src/lib/loadDashboard.js src/data src/charting/data src/charting/rendering src/components/charts/EChartsChartView.jsx tests docs/audits/2026-08-24-v3-static-content-panels
git commit -m "feat(content-library): centralize bounded GeoJSON validation"
```

### Task 3: Logical Media and Session Draft Publication Slice

**Rows:** SCM-S03, SCM-S13 engine/live authoring; SCM-C05 and Journey A remain incomplete until Task 6.

**Files:**
- Create: `src/content-library/contentDraftTransaction.js`.
- Modify: `src/content-library/mediaItems.js`, `src/static-content/assets/browserAuthoredAssetStore.js`, `src/static-content/assets/assetReferenceGraph.js`, `src/static-content/assets/reconcileAuthoredAssets.js`, `src/static-content/forms/staticContentDraft.js`, `src/static-content/staticPanelTransaction.js`, `src/static-content/staticSourceSchema.js`, `src/components/build/buildDirtyState.js`, `src/components/static-content/StaticContentWizard.jsx`, `src/components/static-content/ImageSourceEditor.jsx`, `src/App.jsx`, `src/components/DashboardRenderer.jsx`.
- Create tests: `tests/contentDraftTransaction.test.js`.
- Modify tests: `tests/mediaItems.test.js`, `tests/browserAuthoredAssetStore.test.js`, `tests/staticContentDraft.test.js`, `tests/staticPanelTransaction.test.js`, `tests/authoredAssetCleanup.test.js`, `tests/buildDirtyState.test.js`.
- Browser: begin Journey A branches `manager-independent Image upload commits logical identity` and `cancelled Image draft creates no media item` in `tests/e2e/source-content-media.spec.js`.
- Records: implementation evidence, fidelity/security/deviation.

**Interfaces:**
- Consumes: V5 media records, existing raster validator/store, serialized dashboard commit controller, active local draft inventory.
- Produces: `stageContentDraft({kind:'media'|'csv'|'geojson', candidate, transactionId, intendedOwner})`; `finalizeContentDraft({draft, dashboard, placement})`; `discardContentDraft({draft, assetStore})`. Manager `intendedOwner:'library'` may commit unused; authoring `intendedOwner:'placement'` commits only with the completed panel/chart.

- [ ] **Step 1: Write lifecycle, dedupe, default, and retention failures**

```js
assert.notEqual(createMediaItem({ ...sameBytes, mediaId: "m1" }).mediaId, createMediaItem({ ...sameBytes, mediaId: "m2" }).mediaId);
assert.equal(await storedByteDeltaForSecondLogicalItem(), 0);
assert.equal(prefillPlacementAlt(media, {}), media.defaultDescription);
assert.equal(existingPlacement.alt, "placement-owned alt");
assert.equal(finalizeResult.dashboard.contentLibrary.mediaItems[mediaId].revision, 1);
assert.equal(discardResult.dashboard.contentLibrary.mediaItems[mediaId], undefined);
assert.deepEqual(activeLocalAuthoringDrafts({ imageReplacement }), [expectedReplacementRetention]);
assert.equal(JSON.stringify(persistedDashboard).includes("unsaved description"), false);
```

- [ ] **Step 2: Run focused tests and observe RED**

Run: `node --test tests/contentDraftTransaction.test.js tests/mediaItems.test.js tests/browserAuthoredAssetStore.test.js tests/staticContentDraft.test.js tests/staticPanelTransaction.test.js tests/authoredAssetCleanup.test.js tests/buildDirtyState.test.js`

Expected: FAIL because uploads still publish panel-scoped origin identity and no logical draft transaction exists.

- [ ] **Step 3: Implement media identity and draft publication**

```js
export async function stageContentDraft({ kind, candidate, transactionId, intendedOwner }) {
  return freezeDraft({ kind, candidate, transactionId, intendedOwner, status: "staged" });
}
export async function finalizeContentDraft({ draft, dashboard, placement, adapters }) {
  assertStaged(draft);
  const candidate = buildAtomicCandidate(dashboard, draft, placement);
  await adapters.persistCandidate(candidate);
  return freezeCommit(await adapters.commitCandidate(candidate));
}
export async function discardContentDraft({ draft, assetStore }) {
  await cleanupOnlyUnreferencedStaging(draft, assetStore);
  return Object.freeze({ status: "discarded", transactionId: draft.transactionId });
}
```

Use SHA dedupe only in the authored store; create a requested logical record even when bytes match. New Image placements copy `defaultDescription` once into `alt`; editing the default never walks placements. Keep the prior Image only inside the active replacement draft. Save/Discard/Restore resolves it; Reset continues to clear the whole unsaved Build session.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/contentDraftTransaction.test.js tests/mediaItems.test.js tests/browserAuthoredAssetStore.test.js tests/staticContentDraft.test.js tests/staticPanelTransaction.test.js tests/authoredAssetCleanup.test.js tests/buildDirtyState.test.js`

Expected: PASS; cancelled authoring leaves no logical item, duplicate bytes cost zero additional payload bytes, and committed unused manager-intent records survive cleanup.

- [ ] **Step 5: Run the mounted Image-authoring branches**

Run: `pnpm test:e2e -- tests/e2e/source-content-media.spec.js --project=chromium --grep "Image upload commits logical identity|cancelled Image draft"`

Expected: PASS at 1440×900 and 1024×768 with sourceVersion 2/mediaId, no unexplained item after cancel, exact four stages, and no unsaved draft after reload.

- [ ] **Step 6: Update evidence/status in the same slice**

Record SCM-S03/S13 engine and mounted Image path, exact physical/logical counts, alt prefill/no-rewrite proof, and session-only draft storage inspection. Keep the manager/QMD/chart portions and Journey A unpromoted.

- [ ] **Step 7: Commit the slice atomically**

```bash
git add src/content-library src/static-content src/components/build/buildDirtyState.js src/components/static-content src/App.jsx src/components/DashboardRenderer.jsx tests docs/audits/2026-08-24-v3-static-content-panels
git commit -m "feat(content-library): publish reusable media from session drafts"
```

### Task 4: Non-Modal Source Content Workspace Slice

**Rows:** SCM-C01, SCM-C02, SCM-C03, SCM-C04; semantic visibility SCM-S02/S04 gains mounted evidence.

**Files:**
- Create: `src/components/source-content/SourceContentWorkspace.jsx`, `ContentCatalogue.jsx`, `MediaCatalogue.jsx`, `DataSourceCatalogue.jsx`, `ContentDetail.jsx`, `MediaDetail.jsx`, `DataSourceDetail.jsx`, `CsvDetail.jsx`, `GeoJsonDetail.jsx`, `DependencyList.jsx`, `src/styles/source-content.css`.
- Modify: `src/components/build/BuildCommandHeader.jsx`, `src/components/build/BuildWorkspace.jsx`, `src/components/build/buildCanvasRestoration.js`, `src/components/DashboardRenderer.jsx`, `src/components/source-data/SourceCsvViewerButton.jsx`, `src/source-viewer/SourceCsvViewer.jsx`, `src/components/SourceViewer.jsx`, `src/components/source-data/sourceViewerProtocol.js`, `src/main.jsx`.
- Create tests: `tests/sourceContentWorkspace.test.js`, `tests/contentDetail.test.js`.
- Modify tests: `tests/buildCommandHeader.test.js`, `tests/buildWorkspaceV3.test.js`.
- Browser: `tests/e2e/source-content-manager.spec.js` tests `three Build content commands preserve six/four stage contracts`, `non-modal manager restores canvas selection scroll and focus`, `desktop and tablet catalogue-detail composition preserves state`, and `source visibility follows explicit provenance for CSV and GeoJSON`.
- Records: implementation evidence, fidelity/security/deviation.

**Interfaces:**
- Consumes: `ContentLibrary`, manageable source selectors, current Build restoration snapshot, CSV viewer protocol.
- Produces: `SourceContentWorkspace({open, dashboard, selectedItem, onSelectItem, onClose, onNavigateDependency, onBeginAction})`; state `{tab, query, filters, selectedId, tabletDetailOpen}` retained across list/detail and resize.

- [ ] **Step 1: Write command, responsive-state, focus, and detail failures**

```js
assert.deepEqual(contentCommandLabels(renderedHeader), ["Add chart", "Add static content", "Source content", "Pages & sections"]);
assert.equal(CHART_CREATION_STAGES.length, 6);
assert.equal(STATIC_CONTENT_STAGES.length, 4);
assert.deepEqual(restoredState, { selectedPanelId, windowScrollY, canvasScrollTop, focusOwner: "source-content" });
assert.equal(desktop.getByRole("region", { name: "Content list" }).isConnected, true);
assert.equal(desktop.getByRole("region", { name: "Content details" }).isConnected, true);
assert.equal(tablet.getByRole("button", { name: "Back" }).isConnected, true);
assert.equal(phone.getByText(/Build is unavailable/).isConnected, true);
assert.equal(detail.querySelector("script,style,[onclick]"), null);
```

- [ ] **Step 2: Run component tests and observe RED**

Run: `node --test tests/sourceContentWorkspace.test.js tests/contentDetail.test.js tests/buildCommandHeader.test.js tests/buildWorkspaceV3.test.js`

Expected: FAIL because Source content and its workspace do not exist.

- [ ] **Step 3: Implement the mounted workspace and catalogue hierarchy**

```jsx
export function SourceContentWorkspace({ open, dashboard, initialState, onClose, onNavigateDependency, onBeginAction }) {
  const [state, dispatch] = React.useReducer(reduceWorkspaceState, initialState, createWorkspaceState);
  if (!open) return null;
  return <aside aria-label="Source Content Manager" data-source-content-workspace>
    <WorkspaceTabs value={state.tab} onChange={(tab) => dispatch({ type: "SET_TAB", tab })} />
    <ContentCatalogue state={state} dashboard={dashboard} onSelect={selectItem(dispatch)} />
    <ContentDetail state={state} dashboard={dashboard} onNavigateDependency={onNavigateDependency} onBeginAction={onBeginAction} />
    <button type="button" onClick={onClose}>Close source content</button>
  </aside>;
}
```

Use semantic tabs, labelled list/detail regions, text nodes for all authored/imported metadata, CSS grid side-by-side at 1440×900, list-to-detail plus Back at 1024×768, no manager route at 390×844, and the existing capture/restore functions on open/close. Browsing never invokes `ModalFocusScope`.

- [ ] **Step 4: Run component and existing Build tests**

Run: `node --test tests/sourceContentWorkspace.test.js tests/contentDetail.test.js tests/buildCommandHeader.test.js tests/buildWorkspaceV3.test.js tests/wizardDraftV3.test.js tests/staticContentDraft.test.js`

Expected: PASS with exact command/stage counts, persisted query/filter/selection, and no authored markup sink.

- [ ] **Step 5: Run and inspect the four production browser cases**

Run: `pnpm test:e2e -- tests/e2e/source-content-manager.spec.js --project=chromium`

Expected: PASS at 1440×900 and 1024×768. Inspect list/detail bounding boxes, zero document/pane horizontal overflow, selected item and filters after resize/Back, canvas/scroll/selection equality, and focus returned to Source content. The phone assertion must retain the existing unsupported state.

- [ ] **Step 6: Update same-slice records**

Record DOM control inventory, geometry, restoration values, source visibility IDs, and inspected checkpoints. Promote only C01–C04 when semantic and real mounted evidence are present; leave actions/pickers/replacement rows proposed.

- [ ] **Step 7: Commit the slice atomically**

```bash
git add src/components/source-content src/components/build src/components/DashboardRenderer.jsx src/components/source-data src/source-viewer src/components/SourceViewer.jsx src/styles/source-content.css src/main.jsx tests docs/audits/2026-08-24-v3-static-content-panels
git commit -m "feat(source-content): add non-modal manager workspace"
```

### Task 5: Direct Dependencies, Blocked Delete, and Action Dialog Slice

**Rows:** SCM-S05, SCM-S06, SCM-S07, SCM-C08.

**Files:**
- Create: `src/content-library/contentDependencyGraph.js`, `src/content-library/contentDeletionTransaction.js`, `src/components/source-content/ContentActionDialog.jsx`.
- Modify: `src/components/source-content/DependencyList.jsx`, `MediaDetail.jsx`, `DataSourceDetail.jsx`, `SourceContentWorkspace.jsx`, `src/components/common/ModalFocusScope.jsx`, `src/components/build/buildDirtyState.js`, `src/components/DashboardRenderer.jsx`, `src/static-content/assets/assetReferenceGraph.js`, `src/lib/presentationProtocol.js`.
- Create tests: `tests/contentDependencyGraph.test.js`, `tests/contentDeletionTransaction.test.js`, `tests/contentActionDialog.test.js`.
- Modify tests: `tests/buildDirtyState.test.js`, `tests/presentationProtocol.test.js`, `tests/authoredAssetCleanup.test.js`.
- Browser: add blocker/navigation/deletion branches to Journeys A and I and `runtime Present and Audience do not add durable dependencies` to `tests/e2e/source-content-media.spec.js`.
- Records: implementation evidence, fidelity/security/deviation.

**Interfaces:**
- Consumes: saved dashboard placements, actual active draft/replacement/transaction inventory, current presentation descriptors/leases.
- Produces: one record per item with direct saved uses, temporary retainers, and separate CSV temporal impact contexts; `prepareContentDeletion` returns `{status:'blocked', blockers}` or `{status:'ready', expectedRevision, mutations}`.

- [ ] **Step 1: Write dependency and atomic-deletion failures**

```js
assert.deepEqual(mediaDependencies(graph, mediaId).map((d) => d.kind).sort(), ["qmd", "static-image"]);
assert.deepEqual(csvDependencies(graph, csvId).map((d) => d.panelId), [chartPanelId]);
assert.deepEqual(geoJsonDependencies(graph, geoId).map((d) => d.panelId), [mapPanelId]);
assert.equal(temporalImpactContexts(graph, geoId).length, 0);
assert.equal(buildContentDependencyGraph(withAudienceOpen).records[mediaId].savedUses.length, 1);
assert.equal(prepareContentDeletion(referenced).status, "blocked");
assert.equal(openDialogCalls, 0);
assert.deepEqual(await failingCommit.catch(readState), beforeState);
```

Assert page/section occur only inside breadcrumb metadata, duplicate panel paths collapse to one direct use, Image prior media is retained only while replacement draft is active, and no global undo history input exists.

- [ ] **Step 2: Run focused tests and observe RED**

Run: `node --test tests/contentDependencyGraph.test.js tests/contentDeletionTransaction.test.js tests/contentActionDialog.test.js tests/buildDirtyState.test.js tests/presentationProtocol.test.js tests/authoredAssetCleanup.test.js`

Expected: FAIL because no direct content graph or deletion transaction exists.

- [ ] **Step 3: Implement graph selectors and no-cascade deletion**

```js
export function prepareContentDeletion({ dashboard, graph, itemKind, itemId, expectedRevision }) {
  const record = graph.records[itemId];
  const blockers = [...(record?.savedUses ?? []), ...(record?.activeRetentions ?? [])];
  if (blockers.length) return Object.freeze({ status: "blocked", itemKind, itemId, blockers: Object.freeze(blockers) });
  return Object.freeze({ status: "ready", itemKind, itemId, expectedRevision, mutations: planOwnedRemoval(dashboard, itemKind, itemId) });
}
export async function commitContentDeletion(plan, adapters) {
  assertReadyAndCurrent(plan, adapters.readCurrent());
  return adapters.commitAtomically(plan.mutations);
}
```

Render disabled Delete with `aria-disabled="true"`, inline reason, and guided breadcrumb navigation. Do not attach an action that opens a dialog for blocked deletion. Use `ContentActionDialog` only for ready deletion and replace/relink/remap actions; modal focus returns to the invoking eligible action.

- [ ] **Step 4: Run deterministic tests**

Run: `node --test tests/contentDependencyGraph.test.js tests/contentDeletionTransaction.test.js tests/contentActionDialog.test.js tests/buildDirtyState.test.js tests/presentationProtocol.test.js tests/authoredAssetCleanup.test.js`

Expected: PASS for each direct/temporary blocker, zero mutation on block/failure, and transient Present/Audience invariance.

- [ ] **Step 5: Run the mounted dependency/action branches**

Run: `pnpm test:e2e -- tests/e2e/source-content-media.spec.js tests/e2e/source-content-geojson.spec.js --project=chromium --grep "blocked Delete|do not add durable dependencies"`

Expected: PASS at both Build viewports. Inspect disabled semantics, absence of a dialog, exact Page › Section › Panel target, retained manager/canvas context after navigation, eligible confirmation after owners resolve, and no cascade/dangling identity.

- [ ] **Step 6: Update records and commit**

Record exact graph edges/retainers, modal invocation count, rollback equality, and navigation checkpoint; then commit.

```bash
git add src/content-library src/components/source-content src/components/common/ModalFocusScope.jsx src/components/build/buildDirtyState.js src/components/DashboardRenderer.jsx src/static-content/assets src/lib/presentationProtocol.js tests docs/audits/2026-08-24-v3-static-content-panels
git commit -m "feat(source-content): block deletion on direct dependencies"
```

### Task 6: Shared Pickers, External Local Import, and Restore Previous Image Slice

**Rows:** SCM-C05 and SCM-R01; completes remaining SCM-S03/S13 mounted coverage and Journey A.

**Files:**
- Create: `src/components/source-content/MediaPicker.jsx`, `src/components/source-content/DataSourcePicker.jsx`.
- Modify: `src/components/source-content/MediaDetail.jsx`, `SourceContentWorkspace.jsx`, `src/components/static-content/FreeTextSourceEditor.jsx`, `ImageSourceEditor.jsx`, `StaticContentWizard.jsx`, `src/components/chart-authoring/DataSourceStep.jsx`, `src/static-content/forms/staticContentDraft.js`, `src/content-library/contentDraftTransaction.js`, `src/static-content/image/imageAssetValidation.js`, `src/static-content/assets/browserAuthoredAssetStore.js`, `src/components/DashboardRenderer.jsx`.
- Create tests: `tests/contentPicker.test.js`.
- Modify tests: `tests/staticContentDraft.test.js`, `tests/wizardDraftV3.test.js`, `tests/chartAuthoringComponentsV3.test.js`, `tests/imageAssetValidation.test.js`.
- Browser: complete Journey A in `tests/e2e/source-content-media.spec.js`.
- Records: implementation evidence, fidelity/security/deviation.

**Interfaces:**
- Consumes: manageable library selectors, `stageContentDraft`, raster validation, active Image replacement snapshot.
- Produces: `MediaPicker({purpose:'qmd'|'image', items, onSelect, onCreate, onClose})`; `DataSourcePicker({purpose:'csv'|'geojson', entries, onSelect, onUpload, onClose})`. External import uses `stageContentDraft({kind:'media', intendedOwner:'library', candidate})` and returns a new local item; it never mutates the source external item.

- [ ] **Step 1: Write picker eligibility, external-import, and contextual-restore failures**

```js
assert.deepEqual(qmdPickerIds(items), [storedId, packagedId]);
assert.deepEqual(imagePickerIds(items), [storedId, packagedId, externalId]);
assert.equal(screen.getByRole("button", { name: "Import as local media" }).disabled, false);
assert.equal(ineligibleDetail.queryByRole("button", { name: "Import as local media" }), null);
assert.notEqual(importResult.mediaId, externalId);
assert.deepEqual(after.contentLibrary.mediaItems[externalId], before.contentLibrary.mediaItems[externalId]);
assert.deepEqual(afterExternalImagePlacement, beforeExternalImagePlacement);
assert.equal(newPlacement.alt, localItem.defaultDescription);
assert.equal(screen.getByRole("button", { name: "Restore previous image" }).isConnected, true);
assert.equal(screen.queryByRole("button", { name: /Undo replacement|Undo|Redo/ }), null);
```

Cover browser-permitted HTTPS success, CORS/network failure requiring local file, raster validation failure creating nothing, picker cancel focus return, and Save/Discard/restore lifetimes.

- [ ] **Step 2: Run focused tests and observe RED**

Run: `node --test tests/contentPicker.test.js tests/staticContentDraft.test.js tests/wizardDraftV3.test.js tests/chartAuthoringComponentsV3.test.js tests/imageAssetValidation.test.js`

Expected: FAIL because pickers, scoped import, and renamed restore control are absent.

- [ ] **Step 3: Implement picker and external-local transaction wiring**

```jsx
export function MediaPicker({ purpose, items, onSelect, onCreate, onClose }) {
  const eligible = items.filter((item) => purpose === "image" || ["asset", "package"].includes(item.current.kind));
  return <PickerShell onClose={onClose}>{eligible.map((item) =>
    <MediaPickerRow key={item.mediaId} item={item} onSelect={() => onSelect(item.mediaId)}
      onImportLocal={item.current.kind === "url" && purpose === "qmd" ? () => onCreate({ externalMediaId: item.mediaId }) : undefined} />
  )}</PickerShell>;
}
```

For direct HTTPS import, call ordinary browser `fetch` only after explicit action; on failure surface local-file selection. Feed either byte source through the existing signature/decode/MIME/dimension/animation/size/quota/persistence pipeline, then create a new stored `mediaId`. Never accept arbitrary raw-QMD URLs. Place Restore previous image adjacent to replacement status until reducer action `RESTORE_PREVIOUS_IMAGE`, Save, or Discard clears the snapshot.

- [ ] **Step 4: Run focused and workflow-contract tests**

Run: `node --test tests/contentPicker.test.js tests/staticContentDraft.test.js tests/wizardDraftV3.test.js tests/chartAuthoringComponentsV3.test.js tests/imageAssetValidation.test.js`

Expected: PASS; six/four stage arrays are byte-for-byte unchanged and no global undo control exists.

- [ ] **Step 5: Exercise and inspect Journey A independently**

Run: `pnpm test:e2e -- tests/e2e/source-content-media.spec.js --project=chromium --grep "Journey A"`

Expected: PASS at 1440×900 and 1024×768 plus QMD View 390×844: manager create/default → QMD/Image reuse → default edit no rewrite/new prefill → external Import as local media by allowed fetch and upload fallback → contextual restore/save/discard/reset → blocked/eligible deletion. Inspect exact IDs, hashes, alt fields, focus, restoration, no external rewrite, no unauthorized request, and no dangling ID.

- [ ] **Step 6: Update records and commit**

Promote SCM-C05/R01 only after the full mounted Journey A passes; record its separate semantic/composition/real-use evidence and unchanged six/four stage counts.

```bash
git add src/components/source-content src/components/static-content src/components/chart-authoring/DataSourceStep.jsx src/static-content src/content-library src/components/DashboardRenderer.jsx tests docs/audits/2026-08-24-v3-static-content-panels
git commit -m "feat(source-content): integrate reusable media pickers"
```

### Task 7: Portable QMD Media and Placement Inspector Slice

**Rows:** SCM-S11, SCM-C06, SCM-C07, SCM-R03; Journey C.

**Files:**
- Create: `src/static-content/qmd/portableQmdMedia.js`, `src/components/static-content/QmdMediaInspector.jsx`, `src/components/charts/QmdMediaView.jsx`.
- Modify: `src/static-content/qmd/parsePortableQmd.js`, `renderPortableQmd.js`, `compilePortableQmd.js`, `src/components/static-content/FreeTextSourceEditor.jsx`, `src/components/charts/FreeTextChartView.jsx`, `src/components/charts/ChartView.jsx`, `src/static-content/assets/browserAuthoredAssetRuntime.js`, `src/styles/static-content.css`.
- Create tests: `tests/portableQmdMedia.test.js`, `tests/portableQmdDomSafety.test.js`, `tests/qmdMediaInspector.test.js`, `tests/qmdMediaView.test.js`.
- Modify tests: `tests/portableQmdPolicy.test.js`, `tests/freeTextChartView.test.js`, `tests/portableQmdDomSafety.test.js`.
- Browser: `tests/e2e/qmd-reusable-media.spec.js`, Journey C.
- Records: implementation evidence, fidelity/security/deviation.

**Interfaces:**
- Consumes: stored/packaged `MediaItem`, authored asset resolver/lease, current safe DOM fragment builder.
- Produces: validated AST media node `{type:'portable_media', mediaId, alt, attributes}`; `QmdMediaView({mediaItem, placement, surface, direction, onRepair})`; serialized exact allowlist.

- [ ] **Step 1: Write grammar, safety, serializer, and geometry failures**

```js
assert.deepEqual(parsePortableMediaReference("simex-media:media-1"), { ok: true, mediaId: "media-1" });
for (const destination of ["https://x/a.png", "data:image/png;base64,x", "blob:x", "file:///x", "simex-media:", "simex-media:missing"]) {
  assert.equal(compile(destination).querySelector("img"), null);
  assert.equal(requestLog.length, 0);
}
assert.equal(serializePortableMediaReference({ mediaId:"m", width:50, align:"center", flow:"wrap-start", frame:"card", caption:"Caption", decorative:false }),
  '![alt](simex-media:m){width=50% align=center flow=wrap-start frame=card caption="Caption" decorative=false}');
assert.throws(() => validatePortableMediaAttributes({ style:"position:absolute" }), /Unsupported QMD media attribute/);
assert.ok(wrappedBox.width <= contentBox.width * 0.5);
assert.equal(narrowNode.dataset.effectiveFlow, "block");
assert.equal(document.documentElement.scrollWidth, document.documentElement.clientWidth);
```

Cover each preset/custom 10–100, out-of-range/duplicate/unknown attributes, LTR/RTL logical alignment, block/wrap, three frames, caption text, alt/decorative, reserved dimensions, aspect ratio, missing/corrupt Build repair and passive View explanation.

- [ ] **Step 2: Run focused tests and observe RED**

Run: `node --test tests/portableQmdMedia.test.js tests/portableQmdDomSafety.test.js tests/qmdMediaInspector.test.js tests/qmdMediaView.test.js tests/portableQmdPolicy.test.js tests/freeTextChartView.test.js`

Expected: FAIL because image syntax is still intentionally inert and no local-media node exists.

- [ ] **Step 3: Implement the exact media grammar and safe DOM routing**

```js
export function validatePortableMediaAttributes(attributes) {
  return freezeResult(validateExactKeysAndTokens(attributes, {
    width: { presets: [25, 33, 50, 66, 75, 100], min: 10, max: 100 },
    align: ["start", "center", "end"],
    flow: ["block", "wrap-start", "wrap-end"],
    frame: ["none", "outline", "card"],
    caption: "text",
    decorative: "boolean",
  }));
}
```

Teach the parser to create a media node only after destination, attributes, media existence, local eligibility, health, revision, MIME, and dimensions pass. Otherwise reconstruct the full original source as text. The renderer creates production-owned elements/classes only and mounts `QmdMediaView`; authored classes/styles/events never enter DOM. Lease object URLs in an owning effect and release once.

- [ ] **Step 4: Implement the progressive inspector and token CSS**

```jsx
export function QmdMediaInspector({ placement, onChange, onChangeImage, onOpenMedia }) {
  return <section aria-label="Image placement">
    <WidthControl value={placement.width} onChange={(width) => onChange({ width })} />
    <LogicalAlignmentControl value={placement.align} onChange={(align) => onChange({ align })} />
    <FlowControl value={placement.flow} onChange={(flow) => onChange({ flow })} />
    <details><summary>More</summary><FrameCaptionAccessibilityControls placement={placement} onChange={onChange} /></details>
    <button type="button" onClick={onChangeImage}>Change image</button>
    <button type="button" onClick={onOpenMedia}>Open media item</button>
  </section>;
}
```

Use logical CSS properties, content-column percentages, `max-inline-size:50%` for authored wraps, automatic height, a narrow-container block override that does not rewrite the authored token, and fixed token classes for frame/alignment/flow.

- [ ] **Step 5: Run deterministic tests**

Run: `node --test tests/portableQmdMedia.test.js tests/portableQmdDomSafety.test.js tests/qmdMediaInspector.test.js tests/qmdMediaView.test.js tests/portableQmdPolicy.test.js tests/freeTextChartView.test.js`

Expected: PASS with zero requests for invalid destinations and unchanged arbitrary-text acceptance.

- [ ] **Step 6: Exercise and inspect Journey C independently**

Run: `pnpm test:e2e -- tests/e2e/qmd-reusable-media.spec.js --project=chromium --grep "Journey C"`

Expected: PASS at Build 1440×900/1024×768, View 390×844, and fullscreen. Inspect control hierarchy/focus, serialized subset, content-column percentages, max wrap, narrow collapse, RTL logical side, aspect ratio/reserved footprint, caption/frame semantics, fallback size, zero overflow, and no resource request from inert corpus.

- [ ] **Step 7: Update records and commit**

```bash
git add src/static-content/qmd src/components/static-content/QmdMediaInspector.jsx src/components/charts/QmdMediaView.jsx src/components/charts/FreeTextChartView.jsx src/components/charts/ChartView.jsx src/static-content/assets/browserAuthoredAssetRuntime.js src/styles/static-content.css tests docs/audits/2026-08-24-v3-static-content-panels
git commit -m "feat(qmd): render validated reusable local media"
```

### Task 8: Global Media Replacement and Explicit Health/Repair Slice

**Rows:** SCM-S08, SCM-S14, SCM-R02, media portion of SCM-R08; Journeys B and H remain separate tests.

**Files:**
- Create: `src/content-library/contentReplacementTransaction.js`, `src/content-library/contentHealth.js`.
- Modify: `src/content-library/mediaItems.js`, `src/components/source-content/MediaDetail.jsx`, `ContentActionDialog.jsx`, `src/static-content/assets/browserAuthoredAssetStore.js`, `browserAuthoredAssetRuntime.js`, `assetReferenceGraph.js`, `reconcileAuthoredAssets.js`, `src/components/charts/QmdMediaView.jsx`, `ImageChartView.jsx`, `src/components/DashboardRenderer.jsx`.
- Create tests: `tests/contentReplacementTransaction.test.js`, `tests/contentHealth.test.js`.
- Modify tests: `tests/staticSourceSchema.test.js`, `tests/imageChartView.test.js`, `tests/qmdMediaView.test.js`, `tests/authoredAssetCleanup.test.js`, `tests/dashboardAssetPersistence.test.js`.
- Browser: Journey B in `tests/e2e/source-content-media.spec.js`; media branch of Journey H in `tests/e2e/source-content-recovery.spec.js`.
- Records: implementation evidence, fidelity/security/deviation.

**Interfaces:**
- Consumes: current media revision/current pointer, validated staged raster, direct uses, active leases, placement sources, serialized dashboard commit.
- Produces: `prepareMediaReplacement({dashboard, mediaId, candidateAsset, expectedRevision}) -> ReplacementPlan`; `commitMediaReplacement(plan, adapters)`; `deriveContentHealth`; `repairContentItem`.

- [ ] **Step 1: Write revision, placement-state, lease, rollback, and repair failures**

```js
assert.equal(plan.status, "ready");
assert.equal(committed.contentLibrary.mediaItems[mediaId].revision, beforeRevision + 1);
for (const placement of committedPlacements) assert.deepEqual(pickPlacementFields(placement), pickPlacementFields(beforePlacementById[placement.id]));
assert.deepEqual(viewerZoomByPlacement, beforeViewerZoomByPlacement);
assert.equal(activeOldLease.fetchable, true);
assert.deepEqual(await injectedFailureState(), beforeState);
assert.equal(deriveContentHealth(missing).health, "missing");
assert.deepEqual(repaired.siblingState, beforeSiblingState);
```

- [ ] **Step 2: Run focused tests and observe RED**

Run: `node --test tests/contentReplacementTransaction.test.js tests/contentHealth.test.js tests/staticSourceSchema.test.js tests/imageChartView.test.js tests/qmdMediaView.test.js tests/authoredAssetCleanup.test.js tests/dashboardAssetPersistence.test.js`

Expected: FAIL because global logical replacement/repair transactions do not exist.

- [ ] **Step 3: Implement media replacement and health transitions**

```js
export function prepareMediaReplacement({ dashboard, mediaId, candidateAsset, expectedRevision }) {
  const current = requireCurrentMedia(dashboard, mediaId, expectedRevision);
  return Object.freeze({ status: "ready", kind: "media", mediaId, expectedRevision, next: replaceMediaItemRevision(current, candidateAsset) });
}
export async function commitMediaReplacement(plan, adapters) {
  return commitReplacementAtomically(plan, adapters, { preservePlacementFields: true });
}
```

Publish the new pointer/revision after byte validation/persistence succeeds. Do not rewrite any placement. Old leases remain valid until their own release; new resolutions obtain the new revision. Health derives without deleting identity/dependencies. Repair is an explicit validated replacement/relink operation; failed repair preserves the prior state.

- [ ] **Step 4: Run deterministic tests**

Run: `node --test tests/contentReplacementTransaction.test.js tests/contentHealth.test.js tests/staticSourceSchema.test.js tests/imageChartView.test.js tests/qmdMediaView.test.js tests/authoredAssetCleanup.test.js tests/dashboardAssetPersistence.test.js`

Expected: PASS for revision monotonicity, contextual equality, safe leases, typed health, isolated repair, and rollback.

- [ ] **Step 5: Exercise Journey B independently**

Run: `pnpm test:e2e -- tests/e2e/source-content-media.spec.js --project=chromium --grep "Journey B"`

Expected: PASS in Build/View 1440×900 and fullscreen. Inspect both QMD/Image pixels/source revision, per-placement fields, active viewer zoom, old lease safety, manager revision, and injected failure equality.

- [ ] **Step 6: Exercise the media branch of Journey H independently**

Run: `pnpm test:e2e -- tests/e2e/source-content-recovery.spec.js --project=chromium --grep "Journey H.*media"`

Expected: PASS at Build/View 1440×900 and QMD View 390×844/fullscreen with persistent identity/uses, bounded fallback, explicit repair navigation, restored media, and unaffected sibling.

- [ ] **Step 7: Update records and commit**

```bash
git add src/content-library src/components/source-content src/static-content/assets src/components/charts/QmdMediaView.jsx src/components/charts/ImageChartView.jsx src/components/DashboardRenderer.jsx tests docs/audits/2026-08-24-v3-static-content-panels
git commit -m "feat(content-library): replace and repair media atomically"
```

### Task 9: Managed CSV Authoring and Replacement Slice

**Rows:** SCM-S09, SCM-S10, CSV portions of SCM-C04/C05/C08, SCM-R04, SCM-R05, SCM-R06; Journeys D, E, F.

**Files:**
- Modify: `src/content-library/sourceEntrySchema.js`, `src/content-library/contentDraftTransaction.js`, `src/content-library/contentDependencyGraph.js`, `src/content-library/contentReplacementTransaction.js`, `src/content-library/contentHealth.js`, `src/components/source-content/DataSourceCatalogue.jsx`, `src/components/source-content/DataSourceDetail.jsx`, `src/components/source-content/CsvDetail.jsx`, `src/components/source-content/DataSourcePicker.jsx`, `src/components/source-content/DependencyList.jsx`, `src/components/source-content/ContentActionDialog.jsx`, `src/components/chart-authoring/DataSourceStep.jsx`, `src/components/chart-authoring/ChartWizardV3.jsx`, `src/charting/forms/wizardDraft.js`, `src/lib/loadDashboard.js`, `src/charting/data/prepareChartData.js`, `src/charting/config/chartConfigV3.js`, `src/charting/time/chronoGroupModel.js`, `src/charting/time/sceneSchema.js`, `src/components/presentation/PresentWorkspace.jsx`, `src/components/source-data/SourceCsvViewerButton.jsx`, `src/source-viewer/SourceCsvViewer.jsx`, `src/components/SourceViewer.jsx`, `src/components/source-data/sourceViewerProtocol.js`.
- Create tests: `tests/csvReplacementTransaction.test.js`, `tests/chartConfigV3.test.js`.
- Modify tests: `tests/sourceEntrySchema.test.js`, `tests/contentDraftTransaction.test.js`, `tests/contentDependencyGraph.test.js`, `tests/contentDetail.test.js`, `tests/contentActionDialog.test.js`, `tests/wizardDraftV3.test.js`, `tests/chartAuthoringComponentsV3.test.js`, `tests/chronoGroupModelV3.test.js`, `tests/sceneSchema.test.js`, `tests/presentationProtocol.test.js`.
- Browser: Journeys D–F in `tests/e2e/source-content-csv.spec.js`.
- Records: implementation evidence, fidelity/security/deviation.

**Interfaces:**
- Consumes: builder-owned CSV source entry, existing parse/profile/preview, primary `chart.sourceId`, exact chart encodings, separate temporal impact contexts.
- Produces: `prepareCsvReplacement({dashboard, sourceId, csvText, expectedFingerprint}) -> ReplacementPlan`; `validateDirectChartCompatibility`; `csvReplacementWarnings`; `applyTemporalImpactStatus`; `commitCsvReplacement`.

- [ ] **Step 1: Write CSV upload/selector, block, warning, and rollback failures**

```js
assert.equal(CHART_CREATION_STAGES.length, 6);
assert.equal(committed.dataSources[sourceId].kind, "dataset");
assert.ok(committed.datasetProfiles[sourceId]);
assert.equal(managerCsvIds.includes(sourceId), true);
assert.equal(prepareCsvReplacement({ ...input, csvText: missingEncoding }).status, "blocked");
assert.equal(blocked.reasons[0].code, "missing-encoding-column");
assert.deepEqual(afterBlocked, before);
assert.equal(validTemporal.status, "warning");
assert.deepEqual(validTemporal.warnings.map((w) => w.contextKind).sort(), ["chrono-group", "presentation", "scene"]);
assert.equal(afterConfirm.chronoGroups[groupId].status, "needs-review");
```

Include malformed/safety/size/profile failures, matching-content warning without dedupe, map chart primary CSV with unchanged `map.geoSource`, cancel no-op, Import as new distinct source, and relink for linked/project origin.

- [ ] **Step 2: Run focused tests and observe RED**

Run: `node --test tests/csvReplacementTransaction.test.js tests/sourceEntrySchema.test.js tests/contentDraftTransaction.test.js tests/contentDependencyGraph.test.js tests/contentDetail.test.js tests/contentActionDialog.test.js tests/wizardDraftV3.test.js tests/chartAuthoringComponentsV3.test.js tests/chartConfigV3.test.js tests/chronoGroupModelV3.test.js tests/sceneSchema.test.js tests/presentationProtocol.test.js`

Expected: FAIL because manager CSV transactions and impact warnings are absent.

- [ ] **Step 3: Implement CSV stage-3 selection/registration and detail reuse**

```js
export function prepareCsvReplacement({ dashboard, sourceId, csvText, expectedFingerprint }) {
  const parsed = parseAndProfileCsv(csvText);
  const structural = validateDirectChartCompatibility({ dashboard, sourceId, candidate: parsed });
  if (!structural.ok) return blockedPlan("csv", sourceId, structural.reasons);
  return warningOrReadyPlan("csv", sourceId, parsed, csvReplacementWarnings({ dashboard, sourceId, candidate: parsed }), expectedFingerprint);
}
```

At existing stage 3, selecting managed CSV keeps the same `sourceId`; uploading stages descriptor/profile/entry and publishes them only with chart completion. `CsvDetail` reuses the bounded viewer protocol and renders profile/table/search/download, never GeoJSON summary. Stored uses Replace file; linked/project uses Relink.

- [ ] **Step 4: Implement warning confirmation and impact status**

On warning cancel, mutate nothing. On confirm, preserve `sourceId`, atomically publish descriptor/profile/data, then mark only named Chrono/Scene/presentation contexts needs-review/degraded. These contexts are not added to direct dependency counts. Structural block offers Import as new source plus direct-panel guided remap.

- [ ] **Step 5: Run deterministic tests**

Run: `node --test tests/csvReplacementTransaction.test.js tests/sourceEntrySchema.test.js tests/contentDraftTransaction.test.js tests/contentDependencyGraph.test.js tests/contentDetail.test.js tests/contentActionDialog.test.js tests/wizardDraftV3.test.js tests/chartAuthoringComponentsV3.test.js tests/chartConfigV3.test.js tests/chronoGroupModelV3.test.js tests/sceneSchema.test.js tests/presentationProtocol.test.js`

Expected: PASS with source/profile/render rollback equality and exact warning context/status facts.

- [ ] **Step 6: Exercise Journey D independently**

Run: `pnpm test:e2e -- tests/e2e/source-content-csv.spec.js --project=chromium --grep "Journey D"`

Expected: PASS at 1440×900 and 1024×768: upload/profile/select at stage 3, complete exactly six stages, manage/search/preview/download/usage after reload, and observe one sourceId/profile.

- [ ] **Step 7: Exercise Journey E independently**

Run: `pnpm test:e2e -- tests/e2e/source-content-csv.spec.js --project=chromium --grep "Journey E"`

Expected: PASS at 1440×900: missing encoding column blocks with original descriptor/profile/chart pixels and GeoJSON unchanged; Import as new produces a distinct source and guided remap; cancel is no-op.

- [ ] **Step 8: Exercise Journey F independently**

Run: `pnpm test:e2e -- tests/e2e/source-content-csv.spec.js --project=chromium --grep "Journey F"`

Expected: PASS in Build/Present 1440×900: temporal warning lists exact downstream contexts, cancel preserves old state, confirm keeps sourceId and renders new data, affected configurations show needs-review/degraded, and safe playback continues.

- [ ] **Step 9: Update records and commit**

```bash
git add src/content-library src/components/source-content src/components/chart-authoring src/charting src/lib/loadDashboard.js src/components/presentation/PresentWorkspace.jsx src/components/source-data src/source-viewer src/components/SourceViewer.jsx tests docs/audits/2026-08-24-v3-static-content-panels
git commit -m "feat(source-content): manage and replace CSV sources"
```

### Task 10: Managed GeoJSON Preview, Authoring, and Replacement Slice

**Rows:** SCM-S16, SCM-C09, SCM-R09, SCM-R10, SCM-R11; completes SCM-S15 and Journeys I–K.

**Files:**
- Modify: `src/content-library/geoJsonSourceEntry.js`, `src/content-library/sourceEntrySchema.js`, `src/content-library/contentDraftTransaction.js`, `src/content-library/contentDependencyGraph.js`, `src/content-library/contentDeletionTransaction.js`, `src/content-library/contentReplacementTransaction.js`, `src/content-library/contentHealth.js`, `src/lib/geoJsonValidation.js`, `src/components/source-content/DataSourceCatalogue.jsx`, `src/components/source-content/DataSourceDetail.jsx`, `src/components/source-content/GeoJsonDetail.jsx`, `src/components/source-content/GeoJsonPreview.jsx`, `src/components/source-content/DataSourcePicker.jsx`, `src/components/source-content/ContentActionDialog.jsx`, `src/components/source-content/DependencyList.jsx`, `src/charting/forms/geographySource.js`, `src/components/chart-authoring/DataSourceStep.jsx`, `src/charting/data/prepareGeographyData.js`, `src/charting/rendering/geographyAdapter.js`, `src/components/charts/EChartsChartView.jsx`.
- Create tests: `tests/geoJsonReplacementTransaction.test.js`, `tests/geoJsonContentManager.test.js`.
- Modify tests: `tests/geoJsonValidation.test.js`, `tests/geoJsonSourceEntry.test.js`, `tests/sourceEntrySchema.test.js`, `tests/contentDependencyGraph.test.js`, `tests/contentDeletionTransaction.test.js`, `tests/contentActionDialog.test.js`, `tests/chartAuthoringComponentsV3.test.js`, `tests/prepareGeographyData.test.js`, `tests/chronoGroupModelV3.test.js`.
- Browser: Journeys I–K in `tests/e2e/source-content-geojson.spec.js`.
- Records: implementation evidence, fidelity/security/deviation, GeoJSON limits implementation disposition.

**Interfaces:**
- Consumes: Task 2 validation result/summary, eligible tracked/package/dataset-uploaded descriptors, selected join property, direct map uses, eager preview slot count.
- Produces: `prepareGeoJsonReplacement`, `geoJsonReplacementWarnings`, `commitGeoJsonReplacement`; preview state `{mode:'eager'|'deferred', summary, accessibleFallback}`.

- [ ] **Step 1: Write selector-gap, preview, concurrency, block, and warning failures**

```js
assert.deepEqual(validatedGeoSourceOptions(dataSources, geoData).map((o) => o.value).sort(), ["packaged", "tracked", "uploaded"]);
assert.equal(uploadedDescriptor.type, "uploadedGeoJson");
assert.equal(detail.queryByText(/dataset profile|CSV rows/i), null);
assert.deepEqual(summary, { featureCount, geometryTypes, bbox, propertyKeys, totalPositions, maxFeaturePositions, parts, rings });
assert.equal(previews.filter((p) => p.mode === "eager").length, 4);
assert.equal(previews[4].mode, "deferred");
assert.equal(prepareGeoJsonReplacement(removesJoin).status, "blocked");
assert.equal(prepareGeoJsonReplacement(changedUsable).status, "warning");
assert.equal(changedUsable.warnings.some((w) => /chrono|scene|presentation/.test(w.kind)), false);
```

Cover malformed, empty, unsupported type/GeometryCollection, every central limit rejection, selected-join removal, unusable map, changed feature count/bbox/geometry mix, reduced-nonzero join coverage, Import as new, relink, rollback, and text fallback.

- [ ] **Step 2: Run focused tests and observe RED**

Run: `node --test tests/geoJsonReplacementTransaction.test.js tests/geoJsonContentManager.test.js tests/geoJsonValidation.test.js tests/geoJsonSourceEntry.test.js tests/sourceEntrySchema.test.js tests/contentDependencyGraph.test.js tests/contentDeletionTransaction.test.js tests/contentActionDialog.test.js tests/chartAuthoringComponentsV3.test.js tests/prepareGeographyData.test.js tests/chronoGroupModelV3.test.js`

Expected: FAIL because uploadedGeoJson is excluded, preview/action UI is unwired, and GeoJSON replacement policy is absent.

- [ ] **Step 3: Close the selector gap and mount bounded manager preview**

Normalize tracked `kind:'geojson'`, packaged, and dataset `{kind:'dataset', type:'uploadedGeoJson'}` only when their builder-owned source entry is manageable and the central validation succeeds. Keep generated/intermediate absent. `GeoJsonPreview` acquires one of four eager Build slots, releases on unmount/hidden detail, and renders excess as an explicit deferred preview with an activation action and accessible summary; it never rejects the source for concurrency.

```jsx
export function GeoJsonPreview({ sourceId, validation, eagerRegistry }) {
  const slot = useEagerGeoJsonPreviewSlot(eagerRegistry, sourceId, GEOJSON_LIMITS.eagerMaps.hard);
  if (!slot.active) return <DeferredPreview summary={validation.summary} onActivate={slot.activate} />;
  return <BoundedMapPreview sourceId={sourceId} summary={validation.summary} fallback={<GeoJsonTextSummary summary={validation.summary} />} />;
}
```

- [ ] **Step 4: Implement GeoJSON replacement outcomes**

Run central validation first. Then validate each direct map's selected join property and structural usability. Return hard reasons for removal/unusable/limit failures; return warnings for changed feature count, bbox, geometry mix, or reduced-but-nonzero coverage. Import-as-new creates a distinct sourceId and guided direct-map remap. Confirm preserves sourceId and publishes descriptor/payload/summary atomically; never call `applyTemporalImpactStatus`.

- [ ] **Step 5: Run deterministic tests**

Run: `node --test tests/geoJsonReplacementTransaction.test.js tests/geoJsonContentManager.test.js tests/geoJsonValidation.test.js tests/geoJsonSourceEntry.test.js tests/sourceEntrySchema.test.js tests/contentDependencyGraph.test.js tests/contentDeletionTransaction.test.js tests/contentActionDialog.test.js tests/chartAuthoringComponentsV3.test.js tests/prepareGeographyData.test.js tests/chronoGroupModelV3.test.js`

Expected: PASS; no copied limit constants, exact summary ownership, four eager previews maximum, exact six workflow stages, and no temporal warning.

- [ ] **Step 6: Exercise Journey I independently**

Run: `pnpm test:e2e -- tests/e2e/source-content-geojson.spec.js --project=chromium --grep "Journey I"`

Expected: PASS at 1440×900 and 1024×768: manager upload/Add → map-geography selection → exactly six stages → filter/detail summary/preview/text fallback → map render → dependency navigation → blocked Delete without dialog. Inspect at most four eager previews and deferred excess.

- [ ] **Step 7: Exercise Journey J independently**

Run: `pnpm test:e2e -- tests/e2e/source-content-geojson.spec.js --project=chromium --grep "Journey J"`

Expected: PASS at both Build viewports: selected join removal blocks with original source/descriptor/payload/map pixels unchanged; Import as new uses distinct identity and guided remap; cancel is no-op.

- [ ] **Step 8: Exercise Journey K independently**

Run: `pnpm test:e2e -- tests/e2e/source-content-geojson.spec.js --project=chromium --grep "Journey K"`

Expected: PASS at both Build viewports: warning facts name geometry/coverage only, cancel is no-op, confirm keeps sourceId and updates summary/map, and Chrono/Scene/presentation temporal context list remains empty.

- [ ] **Step 9: Update records and commit**

Promote SCM-S15 only now, after central engine plus live manager/authoring/package consumer wiring and inspected preview concurrency exist. Record calibration as retained limit-selection evidence, not substitute UI proof.

```bash
git add src/content-library src/lib/geoJsonValidation.js src/components/source-content src/charting/forms/geographySource.js src/components/chart-authoring/DataSourceStep.jsx src/charting/data/prepareGeographyData.js src/charting/rendering/geographyAdapter.js src/components/charts/EChartsChartView.jsx tests docs/audits/2026-08-24-v3-static-content-panels
git commit -m "feat(source-content): manage and replace GeoJSON sources"
```

### Task 11: V5 Persistence, Package Portability, Cleanup, and Recovery Slice

**Rows:** SCM-S12, SCM-R07; completes CSV/GeoJSON branches of SCM-S14/R08 and Journey G/H.

**Files:**
- Create: `src/content-library/contentPackageValidation.js`.
- Modify: `src/charting/config/dashboardBundleV3.js`, `src/lib/dashboardPackageExport.js`, `src/lib/dashboardPackageCandidate.js`, `src/lib/dashboardPackageImportTransaction.js`, `src/lib/dashboardAssetPersistence.js`, `src/lib/browserStorage.js`, `src/App.jsx`, `src/content-library/contentHealth.js`, `src/content-library/contentReplacementTransaction.js`, `src/static-content/assets/assetReferenceGraph.js`, `src/static-content/assets/reconcileAuthoredAssets.js`, `src/data/dashboardSourceProviders.js`, `src/components/source-content/MediaDetail.jsx`, `src/components/source-content/DataSourceDetail.jsx`, `src/components/source-content/GeoJsonDetail.jsx`, `src/static-content/qmd/parsePortableQmd.js`, `src/static-content/qmd/renderPortableQmd.js`, `src/components/charts/QmdMediaView.jsx`, `src/components/charts/ImageChartView.jsx`, `src/components/charts/EChartsChartView.jsx`, `src/static-content/staticPanelCapabilities.js`, `src/lib/presentationProtocol.js`, `src/components/presentation/PresentWorkspace.jsx`, `src/components/presentation/AudienceDisplay.jsx`, `src/components/presentation/useAudienceStaticAssetReadiness.js`.
- Create tests: `tests/contentPackageValidation.test.js`.
- Modify tests: `tests/dashboardBundleV5.test.js`, `tests/dashboardPackageExport.test.js`, `tests/dashboardPackageImportTransaction.test.js`, `tests/dashboardAssetPersistence.test.js`, `tests/contentHealth.test.js`, `tests/authoredAssetCleanup.test.js`, `tests/presentationProtocol.test.js`, `tests/staticPanelComposition.test.js`.
- Browser: Journey G in `tests/e2e/source-content-portability.spec.js`; complete Journey H in `tests/e2e/source-content-recovery.spec.js`.
- Records: implementation evidence, fidelity/security/deviation, master submission.

**Interfaces:**
- Consumes: canonical V5 config, all retained stored/packaged media records including unused, unique asset payloads, builder-managed CSV/GeoJSON descriptors/payloads, CSV-only profiles.
- Produces: V5 package envelope and atomic validation result; no object URL/base64 QMD/panel payload/external silent fetch.

- [ ] **Step 1: Write V5 package, unused retention, corrupt rollback, and surface-boundary failures**

```js
assert.equal(serialized.version, 5);
assert.deepEqual(Object.keys(serialized.config.contentLibrary).sort(), ["mediaItems", "sourceEntries"]);
assert.ok(imported.contentLibrary.mediaItems[unusedMediaId]);
assert.equal(payloadCountForHash(serialized, sharedHash), 1);
assert.equal(Object.hasOwn(imported.datasetProfiles, geoJsonSourceId), false);
assert.deepEqual(await importCorruptPackage().catch(readDashboard), beforeDashboard);
assert.equal(networkLog.length, 0);
assert.equal(presentableIds.includes(freeTextId), false);
assert.equal(presentableIds.includes(imagePanelId), true);
assert.equal(audienceMessageIncludesManagerRecord, false);
```

Cover V4 and V5, unused stored/packaged media, external disclosure, missing/corrupt hash/MIME/dimensions/animation/QMD reference/source/profile/path, quota failure, startup interrupted transaction, failed CSV/GeoJSON replacement preserving last-good, and recovery of one item without sibling mutation.

- [ ] **Step 2: Run focused tests and observe RED**

Run: `node --test tests/contentPackageValidation.test.js tests/dashboardBundleV5.test.js tests/dashboardPackageExport.test.js tests/dashboardPackageImportTransaction.test.js tests/dashboardAssetPersistence.test.js tests/contentHealth.test.js tests/authoredAssetCleanup.test.js tests/presentationProtocol.test.js tests/staticPanelComposition.test.js`

Expected: FAIL because bundle V5 does not yet retain/validate the full library graph.

- [ ] **Step 3: Implement cross-layer package validation and retention**

```js
export function validateContentPackage({ config, assetPayloads, sourcePayloads }) {
  const library = validateContentLibrary(config.contentLibrary, { dataSources: config.dataSources, assets: config.assets });
  validateEveryRetainedLocalMedia(library.mediaItems, config.assets, assetPayloads);
  validateEveryQmdMediaReference(config, library.mediaItems);
  validateManagedSources(library.sourceEntries, config.dataSources, config.datasetProfiles, sourcePayloads);
  return Object.freeze({ ok: true, library });
}
```

Export all retained stored/packaged logical items, then unique payload hashes once. Preserve external records as disclosed network-required metadata without fetching. Import migrates V4, validates V5 cross-layer IDs/revisions/hashes/MIME/dimensions/animation/QMD/source/profile/path and quotas, stages all bytes/payloads, persists candidate, and publishes once. Failure rolls back staging and prior state.

- [ ] **Step 4: Implement cleanup and last-good recovery closure**

Reference graph roots include every committed media item, saved sources, actual drafts, active Image replacement, and transactions. Resolved drafts/replacements cease retention; unused committed media persists until explicit deletion. Failed CSV/GeoJSON refresh keeps last committed descriptor/profile/payload. Present/Audience continue to receive Image panel/source identity+revision only; Free text and manager records never become presentable.

- [ ] **Step 5: Run deterministic tests**

Run: `node --test tests/contentPackageValidation.test.js tests/dashboardBundleV5.test.js tests/dashboardPackageExport.test.js tests/dashboardPackageImportTransaction.test.js tests/dashboardAssetPersistence.test.js tests/contentHealth.test.js tests/authoredAssetCleanup.test.js tests/presentationProtocol.test.js tests/staticPanelComposition.test.js`

Expected: PASS with all-or-nothing equality on every injected failure and exact V5/V4 migration assertions.

- [ ] **Step 6: Exercise Journey G independently**

Run: `pnpm test:e2e -- tests/e2e/source-content-portability.spec.js --project=chromium --grep "Journey G"`

Expected: PASS at Build 1440×900, QMD View 390×844, and fullscreen in a fresh offline context: used/unused media, CSV profile, GeoJSON summary/map, QMD/Image geometry, exact IDs/revisions/hashes, zero external requests, and canonical V5 after V4 import.

- [ ] **Step 7: Exercise Journey H independently**

Run: `pnpm test:e2e -- tests/e2e/source-content-recovery.spec.js --project=chromium --grep "Journey H"`

Expected: PASS at Build/View 1440×900, QMD View 390×844, and fullscreen: missing/corrupt media/GeoJSON and failed CSV refresh preserve identity/dependencies/last-good data, bounded fallbacks reveal no storage detail, explicit repair/relink restores only the target, and siblings remain live.

- [ ] **Step 8: Update records and commit**

```bash
git add src/content-library src/charting/config/dashboardBundleV3.js src/lib src/App.jsx src/static-content/assets src/data/dashboardSourceProviders.js src/components/source-content src/components/charts src/static-content/staticPanelCapabilities.js src/components/presentation tests docs/audits/2026-08-24-v3-static-content-panels
git commit -m "feat(content-library): persist and package reusable content in V5"
```

### Task 12: Integrated Fidelity Promotion and Completion Submission

**Rows:** all SCM-S01–S16, SCM-C01–C09, SCM-R01–R11; no implementation behavior is added in this task.

**Files:**
- Modify only if evidence supports it: `docs/audits/2026-08-24-v3-static-content-panels/SOURCE-CONTENT-MANAGER-IMPLEMENTATION-EVIDENCE.md`, `SOURCE-CONTENT-MANAGER-AMENDMENT-FIDELITY.md`, `SOURCE-CONTENT-MANAGER-AMENDMENT-SECURITY-DEVIATIONS.md`, `MASTER-REVIEW-SUBMISSION.md`, and this plan's execution ledger checkboxes/status notes.
- Browser: all seven Source Content Manager/QMD Playwright files, preserving eleven named Journey tests.

**Interfaces:**
- Consumes: committed Tasks 1–11 and their evidence.
- Produces: a truthful submission separating `engine implemented`, `UI implemented`, `fidelity verified`, plus any explicit later-step deferral. It changes no production owner.

- [ ] **Step 1: Run the cheapest complete deterministic affected sweep once**

Run: `node --test tests/contentLibrarySchema.test.js tests/dashboardMigrationV5.test.js tests/dashboardBundleV5.test.js tests/mediaItems.test.js tests/sourceEntrySchema.test.js tests/geoJsonValidation.test.js tests/geoJsonSourceEntry.test.js tests/contentDraftTransaction.test.js tests/contentDependencyGraph.test.js tests/contentDeletionTransaction.test.js tests/contentReplacementTransaction.test.js tests/csvReplacementTransaction.test.js tests/geoJsonReplacementTransaction.test.js tests/contentHealth.test.js tests/contentPackageValidation.test.js tests/sourceContentWorkspace.test.js tests/contentDetail.test.js tests/contentPicker.test.js tests/qmdMediaInspector.test.js tests/qmdMediaView.test.js tests/portableQmdMedia.test.js tests/portableQmdDomSafety.test.js tests/contentActionDialog.test.js tests/geoJsonContentManager.test.js`

Expected: PASS. Any failure returns ownership to its originating task; do not weaken assertions or promote its rows.

- [ ] **Step 2: Run the runtime boundary and production build checks once**

Run: `pnpm check:v3-runtime-boundaries`

Expected: PASS with chart configuration V3 and unchanged static temporal/presentation boundaries.

Run: `pnpm build`

Expected: PASS with no generated-catalogue drift after the build's declared generators complete.

- [ ] **Step 3: Run all eleven journeys as independently named tests**

Run: `pnpm test:e2e -- tests/e2e/source-content-manager.spec.js tests/e2e/source-content-media.spec.js tests/e2e/qmd-reusable-media.spec.js tests/e2e/source-content-csv.spec.js tests/e2e/source-content-geojson.spec.js tests/e2e/source-content-portability.spec.js tests/e2e/source-content-recovery.spec.js --project=chromium`

Expected: PASS with Journey A, B, C, D, E, F, G, H, I, J, and K each reported separately. A failure in one journey does not get replaced by another journey or a broad smoke assertion.

- [ ] **Step 4: Inspect actual-app browser checkpoints proportionately**

Use `browser:control-in-app-browser` against the real production route. Inspect, rather than merely capture: manager/canvas/scroll/selection/focus restoration; desktop side-by-side and tablet list/detail/Back state; blocked Delete target clearance/no dialog; QMD wrap/RTL/narrow geometry and zero overflow; picker focus/context; at-most-four eager map previews with deferred excess; replacement rollback; offline QMD/Image/map; and isolated repair. Material states are Build 1440×900/1024×768 plus QMD View 390×844/fullscreen where the ledger names them.

- [ ] **Step 5: Reconcile every row and journey against live evidence**

For each ledger row, verify a live production owner, deterministic falsifier, mounted/browser task where required, viewport/state, evidence link, and deviation record. Keep any missing/partial/unwired row out of Passing. Confirm the eleven named tests still express distinct accepted negative assertions: no global undo, no blocked-delete dialog, no QMD external request, no generated source visibility, no GeoJSON temporal warning, no Free-text Present/Audience, and no static Chrono/Scene membership.

- [ ] **Step 6: Write the completion submission**

Update records with exact commit/test/browser evidence and three separate conclusions:

```text
Engine implemented: yes/no, with missing row IDs.
UI implemented: yes/no, with missing row IDs.
Fidelity verified: yes/no, with missing row IDs and journey names.
Master acceptance: pending submission; never self-declared.
```

- [ ] **Step 7: Run documentation/status consistency checks**

Run: `git diff --check`

Expected: no whitespace errors.

Run: `powershell -NoProfile -Command "$m=Get-Content -Raw 'docs/audits/2026-08-24-v3-static-content-panels/SOURCE-CONTENT-MANAGER-AMENDMENT-FIDELITY.md'; $ids=@([regex]::Matches($m,'SCM-[SCR][0-9]{2}')|ForEach-Object{$_.Value}|Sort-Object -Unique); if($ids.Count-ne 36){throw \"Expected 36 unique rows; got $($ids.Count)\"}; $e=Get-Content -Raw 'docs/audits/2026-08-24-v3-static-content-panels/SOURCE-CONTENT-MANAGER-IMPLEMENTATION-EVIDENCE.md'; $journeys=@([regex]::Matches($e,'(?m)^## Journey ([A-K])\b')|ForEach-Object{$_.Groups[1].Value}|Sort-Object -Unique); if($journeys.Count-ne 11){throw \"Expected 11 journeys\"}; $base=Get-Content -Raw 'docs/audits/2026-08-24-v3-static-content-panels/FIDELITY-MATRIX.md'; if($base-notmatch '36-row disposition remains Passing'){throw 'Step 7S baseline drifted'}"`

Expected: exit 0 with 36 unique amendment IDs, eleven Journey evidence sections, and accepted Step 7S 36/36 unchanged.

- [ ] **Step 8: Commit the completion records atomically**

```bash
git add docs/audits/2026-08-24-v3-static-content-panels docs/superpowers/plans/2026-08-25-source-content-manager-and-qmd-reusable-media.md
git commit -m "docs(source-content): submit verified V5 amendment"
```

## One-to-One 36-Row Execution Ledger

The status in this planning commit is intentionally identical for every amendment row. During execution, update a row only in the same atomic slice that supplies its named live owner and evidence; engine-only progress is recorded in the implementation evidence without promoting composition or fidelity.

| Row / accepted invariant | Exact production owner(s) | Cheapest deterministic falsifier | Retained browser task | Material viewport/state | Meaningful evidence | Current status | Deviation | Task(s) |
|---|---|---|---|---|---|---|---|---|
| SCM-S01 — dashboard/bundle V5, V4 migration first, chart V3 | `dashboardConfigStructure.js`; `dashboardBundleV3.js`; `migrateDashboardV4ToV5.js` | `dashboardMigrationV5.test.js`, `dashboardBundleV5.test.js`: exact versions/order/idempotence | V4 mixed import before manager use; Journey G | Build 1440×900; valid/malformed; fresh | Serialized versions, canonical identities, unchanged chart V3, no pre-migration rejection | Proposed / unimplemented / not verified | SCM-D02 | 1, 11, 12 |
| SCM-S02 — exact `contentLibrary.mediaItems/sourceEntries`, existing byte/payload/profile authorities | `contentLibrarySchema.js`; `staticSourceSchema.js`; `loadDashboard.js` | `contentLibrarySchema.test.js`: alternate/unknown keys and authority duplication rejected | Manager details correlate registry identity with live media/CSV/GeoJSON authority | Build 1440×900; all origins/kinds | Exact keys plus live identity/kind/metadata readings | Proposed / unimplemented / not verified | SCM-D03 | 1, 4, 12 |
| SCM-S03 — stable mediaId/revision, physical dedupe, editable default only pre-fills new placements | `mediaItems.js`; `browserAuthoredAssetStore.js` | `mediaItems.test.js`, `browserAuthoredAssetStore.test.js`: logical IDs, byte delta, revision, alt no-rewrite | Journey A default/dedupe branch | Build 1440×900; duplicate/reuse/distinct/default edit | IDs, one payload, revisions, old/new placement alts | Proposed / unimplemented / not verified | SCM-D03, SCM-D09 | 1, 3, 6, 12 |
| SCM-S04 — visibility/classification from trusted provenance, generated hidden | `sourceEntrySchema.js` | `sourceEntrySchema.test.js`: adversarial filenames and explicit ownership for CSV/GeoJSON | Manager/pickers filter every origin and generated fixture | Build 1440×900/1024×768; empty/populated | Exact visible/hidden IDs and origin labels | Proposed / unimplemented / not verified | SCM-D06 | 1, 4, 9, 10, 12 |
| SCM-S05 — direct saved uses and actual draft/replacement/transaction retention only | `contentDependencyGraph.js`; `buildDirtyState.js::activeLocalAuthoringDrafts`; `DashboardRenderer.jsx` consumer | `contentDependencyGraph.test.js`, `buildDirtyState.test.js`: exact edge kinds, breadcrumbs, no global history | Journeys A/I inspect each saved and active blocker | Build 1440×900/1024×768; saved/active | Exact IDs/kinds/breadcrumbs and active lifetime | Proposed / unimplemented / not verified | SCM-D04, SCM-D06 | 5, 6, 10, 12 |
| SCM-S06 — temporal/presentation contexts are not dependencies; leases/messages transient | `contentDependencyGraph.js::temporalImpactContexts`; `presentationProtocol.js`; `assetReferenceGraph.js` | `contentDependencyGraph.test.js`, `presentationProtocol.test.js`: counts unchanged by Present/Audience | Runtime Present/Audience dependency-invariance case; Journey F context list | Build/Present/Audience; connect/disconnect | Direct counts, separate CSV context list, no runtime edge | Proposed / unimplemented / not verified | SCM-D06, SCM-D07 | 5, 9, 11, 12 |
| SCM-S07 — delete never cascades and is blocked until every real owner resolves | `contentDeletionTransaction.js`; `contentDependencyGraph.js` | `contentDeletionTransaction.test.js`: every blocker/failure leaves state exact | Journeys A/I blocked navigation then eligible confirmation | Build 1440×900/1024×768; blocked/eligible/failure | No dialog on block, exact explanation, atomic inventory, no dangling ID | Proposed / unimplemented / not verified | SCM-D04, SCM-D06 | 5, 6, 10, 12 |
| SCM-S08 — global media replacement preserves identity and placement/viewer state | `contentReplacementTransaction.js`; `staticPanelTransaction.js` | `contentReplacementTransaction.test.js`, `staticSourceSchema.test.js`: field/zoom equality and rollback | Journey B | Build/View 1440×900; fullscreen; success/failure | mediaId/revision, old/new hash, placements/zoom, rollback | Proposed / unimplemented / not verified | SCM-D05 | 8, 12 |
| SCM-S09 — CSV replacement blocks structural incompatibility and offers import/remap | `contentReplacementTransaction.js`; `loadDashboard.js` | `csvReplacementTransaction.test.js`: parse/size/safety/missing encoding/rollback | Journey E | Build 1440×900; primary CSV; map GeoJSON unchanged | Original descriptor/profile/render, typed block, distinct import | Proposed / unimplemented / not verified | SCM-D07 | 9, 12 |
| SCM-S10 — valid CSV temporal change warns/commits and marks impacts | `contentReplacementTransaction.js`; `chronoGroupModel.js`; `sceneSchema.js` | `csvReplacementTransaction.test.js`, temporal schema tests: cancel/confirm/statuses | Journey F | Build/Present 1440×900; warning/cancel/confirm | Warning facts/IDs, status, new render, unchanged chart structure | Proposed / unimplemented / not verified | SCM-D07 | 9, 12 |
| SCM-S11 — QMD images only from validated local media and exact attributes; all else inert/request-free | `portableQmdMedia.js`; `parsePortableQmd.js`; `renderPortableQmd.js` | `portableQmdMedia.test.js`, `portableQmdDomSafety.test.js`: destination/attribute corpus and request log | Journey C request-authority branch | Build 1440×900; View 390×844; fullscreen; online/offline | Final DOM/resource log, inert source text, valid media ID, no authored CSS | Proposed / unimplemented / not verified | SCM-D01, SCM-D10 | 7, 12 |
| SCM-S12 — V5 package retains all managed content including unused media and validates atomically | `src/charting/config/dashboardBundleV3.js`; `src/lib/dashboardPackageExport.js`; `src/lib/dashboardPackageCandidate.js`; `src/lib/dashboardPackageImportTransaction.js`; `src/content-library/contentPackageValidation.js` | V5 bundle/export/import tests: exact keys, unused records, corrupt/missing/quota rollback | Journey G | Build 1440×900; offline; V4/V5 | IDs/revisions/hashes, unused survival, type-correct summaries, prior-state equality | Proposed / unimplemented / not verified | SCM-D02, SCM-D08 | 11, 12 |
| SCM-S13 — manager explicit commit vs authoring draft commit; cancel cleans; contextual prior Image only | `contentDraftTransaction.js`; `reconcileAuthoredAssets.js`; `buildDirtyState.js` | draft/static/cleanup tests: each origin commit/cancel/reset/restore boundary | Journey A draft/Restore/Save/Discard/Reset branch | Build 1440×900/1024×768; reload | Store/library counts, contextual prior lifetime, unused committed survival, no reload draft | Proposed / unimplemented / not verified | SCM-D05, SCM-D09 | 3, 6, 12 |
| SCM-S14 — typed health, explicit repair, cleanup respects only real retainers | `contentHealth.js`; `assetReferenceGraph.js`; `reconcileAuthoredAssets.js` | `contentHealth.test.js`, `authoredAssetCleanup.test.js`: all health and retention transitions | Journey H | Build/View 1440×900; QMD View 390×844; fullscreen | Persistent identity/uses, typed fallback, exact reclaimed/retained inventory, sibling continuity | Proposed / unimplemented / not verified | SCM-D04, SCM-D08 | 8, 11, 12 |
| SCM-S15 — GeoJSON derives kind without CSV profile and one bounded authority owns exact calibrated limits | `geoJsonSourceEntry.js`; `geoJsonValidation.js`; `loadDashboard.js` consumer; `sourceRequest.js` | `geoJsonValidation.test.js`, `geoJsonSourceEntry.test.js` plus retained calibration: every exact boundary/count | Journey I implemented upload/preview/runtime; current ingestion integration | Build 1440×900/1024×768; constrained evidence retained | Exact facts/summary/limits, rollback, no copied constants, mounted consumer | Proposed / unimplemented / not verified | SCM-D06, SCM-D07 | 2, 10, 11, 12 |
| SCM-S16 — GeoJSON replace/relink blocks structural/join/limit and warns compatible geometry/coverage without temporal contexts | `contentReplacementTransaction.js`; `prepareChartData.js`/geography preparation | `geoJsonReplacementTransaction.test.js`, `prepareGeographyData.test.js`: every block/warning/cancel/confirm | Journeys J/K | Build 1440×900/1024×768; block/warn | Stable sourceId on confirm, prior equality on block, exact warnings, no temporal context | Proposed / unimplemented / not verified | SCM-D07 | 10, 12 |
| SCM-C01 — Source content command added without changing six/four stages | `BuildCommandHeader.jsx`; `BuildWorkspace.jsx`; `SourceContentWorkspace.jsx` | header/workspace/wizard/static draft tests: exact command/stage arrays | Three Build commands case | Build 1440×900/1024×768; empty/populated | Control/stage DOM, active workspace, focus return | Proposed / unimplemented / not verified | SCM-D06 | 4, 12 |
| SCM-C02 — wide non-modal workspace restores canvas/scroll/selection/focus; phone policy unchanged | `BuildWorkspace.jsx`; `buildCanvasRestoration.js`; `SourceContentWorkspace.jsx` | workspace/Build tests: exact snapshot and unsupported phone route | Non-modal restoration case | 1440×900; 1024×768; 390×844 unsupported | Before/after boxes/scroll/ID/focus and phone state | Proposed / unimplemented / not verified | SCM-D06 | 4, 12 |
| SCM-C03 — desktop side-by-side, tablet list/detail+Back, persistent state, no overflow | `SourceContentWorkspace.jsx`; `ContentCatalogue.jsx`; `ContentDetail.jsx` | `sourceContentWorkspace.test.js`: responsive reducer and accessible regions | Desktop/tablet composition case | 1440×900; 1024×768; long/empty/loading/error | Region hierarchy, focus, query/filter/item continuity, pane/document geometry | Proposed / unimplemented / not verified | SCM-D06 | 4, 12 |
| SCM-C04 — type-appropriate details, metadata/actions/dependencies, scoped external import | `src/components/source-content/MediaDetail.jsx`; `src/components/source-content/DataSourceDetail.jsx`; `src/components/source-content/CsvDetail.jsx`; `src/components/source-content/GeoJsonDetail.jsx`; `src/components/source-content/DependencyList.jsx` | `contentDetail.test.js`: text-only DOM, eligibility, categories, default edit, external-only action | Journey A and Journey I detail branches | 1440×900/1024×768; all kinds/origins/health | Accessible tree, action inventory, text-only metadata, dependency target, unchanged external uses | Proposed / unimplemented / not verified | SCM-D06, SCM-D10 | 4, 5, 6, 9, 10, 12 |
| SCM-C05 — shared pickers preserve workflows; external import and Restore previous image scoped correctly | `src/components/source-content/MediaPicker.jsx`; `src/components/source-content/DataSourcePicker.jsx`; `src/components/static-content/FreeTextSourceEditor.jsx`; `src/components/static-content/ImageSourceEditor.jsx`; `src/components/chart-authoring/DataSourceStep.jsx` | picker/static/wizard/chart tests: inventories, prefill, focus, restore lifetime, stage counts | Journey A, D, I picker branches | Build 1440×900/1024×768; eligible/ineligible/external | Selected identity, focus, draft ownership, restore geometry, no global undo, continuity | Proposed / unimplemented / not verified | SCM-D01, D05, D06, D09, D10 | 6, 9, 10, 12 |
| SCM-C06 — progressive QMD inspector exact controls; Change placement differs from Replace library | `QmdMediaInspector.jsx`; `portableQmdMedia.js` | inspector/media tests: tokens, labels, focus order, command routing | Journey C controls branch | Build 1440×900/1024×768; keyboard/pointer; More open/closed | Serialized QMD, control/focus inventory, changed placement ID, unchanged revision | Proposed / unimplemented / not verified | SCM-D01, SCM-D03, SCM-D05 | 7, 12 |
| SCM-C07 — aspect/reserved size/content fit/RTL/wrap max/narrow collapse | `FreeTextChartView.jsx`; `renderPortableQmd.js`; `QmdMediaView.jsx` | view tests: token geometry, dimensions, direction, overflow, fallbacks | Journey C geometry branch | Build/View 1440×900; 1024×768; View 390×844; fullscreen; LTR/RTL | Bounding boxes/classes/aspect/scroll owners/zero overflow | Proposed / unimplemented / not verified | SCM-D01 | 7, 12 |
| SCM-C08 — non-modal browse; blocked delete no dialog; eligible delete and replace/relink modals focused | `ContentActionDialog.jsx`; `ModalFocusScope.jsx`; `SourceContentWorkspace.jsx` | dialog/deletion/replacement tests: disabled/modal/focus/feedback states | Journeys A/B/E/F/J/K action branches | 1440×900/1024×768; blocked/eligible/warn/error | Disabled semantics, no dialog on block, dialog names/focus/return, exact state | Proposed / unimplemented / not verified | SCM-D05, SCM-D06, SCM-D07 | 5, 8, 9, 10, 12 |
| SCM-C09 — CSV/GeoJSON filter, domain GeoJSON summary/bounded preview/fallback, upload/select in unchanged workflow | `src/components/source-content/DataSourceCatalogue.jsx`; `src/components/source-content/GeoJsonDetail.jsx`; `src/components/source-content/GeoJsonPreview.jsx`; `src/charting/forms/geographySource.js::validatedGeoSourceOptions`; `src/components/chart-authoring/DataSourceStep.jsx` | manager/chart tests: filter, facts, preview slots, representations, six stages | Journey I | Build 1440×900/1024×768; tracked/package/uploaded; empty/loading/error | Visible IDs, summary, preview/fallback geometry, selected geoSource, focus, zero overflow | Proposed / unimplemented / not verified | SCM-D06, SCM-D07 | 10, 12 |
| SCM-R01 — create/reuse/default/external import/restore/dependencies/delete end to end | `src/content-library/mediaItems.js`; `src/content-library/contentDraftTransaction.js`; `src/content-library/contentDependencyGraph.js`; `src/content-library/contentDeletionTransaction.js`; `src/components/source-content/SourceContentWorkspace.jsx`; `src/components/source-content/MediaPicker.jsx`; `src/components/static-content/ImageSourceEditor.jsx` | prerequisite semantic/composition tests plus exact Journey A assertions | Journey A | Build 1440×900/1024×768; View 390×844; fetch available/unavailable; blocked/eligible | IDs/revisions/hashes/alts, external unchanged, restore lifetime, breadcrumbs, geometry, no dangling ID | Proposed / unimplemented / not verified | SCM-D01, D03, D04, D05, D06, D09, D10 | 6, 12 |
| SCM-R02 — global replacement updates QMD/Image and preserves contextual state atomically | `src/content-library/contentReplacementTransaction.js`; `src/components/source-content/MediaDetail.jsx`; `src/components/source-content/ContentActionDialog.jsx`; `src/components/charts/QmdMediaView.jsx`; `src/components/charts/ImageChartView.jsx`; `src/static-content/assets/browserAuthoredAssetStore.js` | replacement/static/view tests with injected failure | Journey B | Build/View 1440×900; fullscreen; success/failure | Field/zoom equality, new bytes/revision, all-use update, rollback, lease safety | Proposed / unimplemented / not verified | SCM-D05 | 8, 12 |
| SCM-R03 — QMD controls produce meaningful responsive geometry | `src/components/static-content/QmdMediaInspector.jsx`; `src/components/charts/QmdMediaView.jsx`; `src/static-content/qmd/portableQmdMedia.js`; `src/components/static-content/FreeTextSourceEditor.jsx`; `src/components/charts/FreeTextChartView.jsx` | QMD media/inspector/view/Free-text tests | Journey C | Build 1440×900/1024×768; View 390×844; fullscreen; RTL/missing | Measured width/wrap/collapse/alignment/frame/caption/fallback/overflow | Proposed / unimplemented / not verified | SCM-D01 | 7, 12 |
| SCM-R04 — CSV upload/select stays in six-stage flow then appears in catalogue | `src/charting/forms/wizardDraft.js`; `src/components/chart-authoring/ChartWizardV3.jsx`; `src/components/chart-authoring/DataSourceStep.jsx`; `src/content-library/sourceEntrySchema.js`; `src/content-library/contentDraftTransaction.js`; `src/components/source-content/CsvDetail.jsx`; `src/components/source-content/DataSourceCatalogue.jsx` | wizard/draft/source/detail tests | Journey D | Build 1440×900/1024×768; upload/commit/reload | Six stages, sourceId/profile equality, dependency, preview/search, no duplicate | Proposed / unimplemented / not verified | SCM-D06, SCM-D09 | 9, 12 |
| SCM-R05 — incompatible CSV block/import/remap | `src/content-library/contentReplacementTransaction.js`; `src/components/source-content/DataSourceDetail.jsx`; `src/components/source-content/ContentActionDialog.jsx`; `src/components/source-content/DependencyList.jsx`; `src/charting/config/chartConfigV3.js`; `src/charting/data/prepareChartData.js` | CSV replacement/dialog/chart config tests | Journey E | Build 1440×900; map primary CSV; GeoJSON unchanged | Original descriptor/profile/chart pixels, reason, new ID/remap targets | Proposed / unimplemented / not verified | SCM-D07 | 9, 12 |
| SCM-R06 — valid temporal CSV warning/confirm/status | `src/content-library/contentReplacementTransaction.js`; `src/content-library/contentDependencyGraph.js`; `src/components/source-content/ContentActionDialog.jsx`; `src/charting/time/chronoGroupModel.js`; `src/charting/time/sceneSchema.js`; `src/components/presentation/PresentWorkspace.jsx` | CSV/Chrono/Scene/presentation tests | Journey F | Build/Present 1440×900; cancel/confirm | No-op cancel, stable ID, new data, exact impact statuses, safe rendering | Proposed / unimplemented / not verified | SCM-D07 | 9, 12 |
| SCM-R07 — V5/V4 round-trip retains used/unused media and CSV/GeoJSON offline | `src/charting/config/dashboardBundleV3.js`; `src/lib/dashboardPackageExport.js`; `src/lib/dashboardPackageCandidate.js`; `src/lib/dashboardPackageImportTransaction.js`; `src/content-library/migrateDashboardV4ToV5.js`; `src/content-library/contentLibrarySchema.js`; `src/content-library/contentPackageValidation.js` | migration/bundle/export/import/content package tests | Journey G | Build 1440×900; View 390×844; fullscreen; fresh offline | Exact keys/IDs/revisions/hashes, unused item, typed summaries, zero requests, geometry | Proposed / unimplemented / not verified | SCM-D02, SCM-D08 | 1, 11, 12 |
| SCM-R08 — missing/corrupt/relink repair isolated | `src/content-library/contentHealth.js`; `src/content-library/contentReplacementTransaction.js`; `src/components/source-content/MediaDetail.jsx`; `src/components/source-content/DataSourceDetail.jsx`; `src/components/source-content/GeoJsonDetail.jsx`; `src/data/dashboardSourceProviders.js`; `src/components/charts/FreeTextChartView.jsx`; `src/components/charts/ChartView.jsx` | health/cleanup/persistence/GeoJSON replacement tests | Journey H | Build/View 1440×900; QMD View 390×844; fullscreen | Persistent identity/uses, bounded fallback, last-good data, repair, siblings | Proposed / unimplemented / not verified | SCM-D04, SCM-D08 | 8, 11, 12 |
| SCM-R09 — GeoJSON upload/select/manage/preview/direct dependency/blocked delete | `src/content-library/geoJsonSourceEntry.js`; `src/lib/geoJsonValidation.js`; `src/content-library/contentDependencyGraph.js`; `src/content-library/contentDeletionTransaction.js`; `src/components/source-content/DataSourceCatalogue.jsx`; `src/components/source-content/GeoJsonDetail.jsx`; `src/components/source-content/GeoJsonPreview.jsx`; `src/components/source-content/DataSourcePicker.jsx`; `src/components/chart-authoring/DataSourceStep.jsx` | GeoJSON source/manager/graph/delete/chart tests | Journey I | Build 1440×900/1024×768; upload/direct/blocked | Six stages/sourceId/geoSource, summary/preview/fallback/map, breadcrumb, no dialog | Proposed / unimplemented / not verified | SCM-D06, SCM-D07 | 10, 12 |
| SCM-R10 — invalid GeoJSON replacement hard-block/import/remap | `src/lib/geoJsonValidation.js`; `src/content-library/contentReplacementTransaction.js`; `src/components/source-content/GeoJsonDetail.jsx`; `src/components/source-content/ContentActionDialog.jsx`; `src/components/source-content/DependencyList.jsx`; `src/charting/data/prepareGeographyData.js`; `src/charting/rendering/geographyAdapter.js` | validation/replacement/dialog/geography tests | Journey J | Build 1440×900/1024×768; block/import/cancel | Original ID/descriptor/payload/map pixels, exact reason, new ID/remap, atomicity | Proposed / unimplemented / not verified | SCM-D07 | 10, 12 |
| SCM-R11 — usable changed GeoJSON warns/confirms without temporal warning | `src/content-library/contentReplacementTransaction.js`; `src/content-library/geoJsonSourceEntry.js`; `src/components/source-content/GeoJsonDetail.jsx`; `src/components/source-content/ContentActionDialog.jsx`; `src/charting/data/prepareGeographyData.js`; `src/charting/rendering/geographyAdapter.js`; `src/components/charts/EChartsChartView.jsx` | replacement/source/geography/Chrono negative tests | Journey K | Build 1440×900/1024×768; warning/cancel/confirm | No-op cancel, stable ID, new summary/map, coverage warning, zero temporal contexts | Proposed / unimplemented / not verified | SCM-D07 | 10, 12 |

## Eleven Independent Browser Journeys

| Journey | Exact Playwright test owner | Earliest task that may complete it | Non-collapsible evidence |
|---|---|---:|---|
| A | `tests/e2e/source-content-media.spec.js` — `Journey A — media create reuse default external import restore dependencies delete` | 6 | Logical/physical identity, old/new alt, external unchanged, contextual restore lifetime, no global undo, blocked/no-dialog then eligible delete, focus/context/geometry. |
| B | `tests/e2e/source-content-media.spec.js` — `Journey B — global media replacement preserves placement state` | 8 | QMD+Image bytes/revision update, alt/layout/crop/fit/rotation/zoom equality, lease safety, injected rollback. |
| C | `tests/e2e/qmd-reusable-media.spec.js` — `Journey C — QMD media controls responsive RTL geometry and request authority` | 7 | Exact serialized allowlist, request log, measured width/wrap/collapse/RTL/frame/caption/fallback and zero overflow. |
| D | `tests/e2e/source-content-csv.spec.js` — `Journey D — CSV upload through six stages then catalogue management` | 9 | Stage count, source/profile identity, chart use, preview/search/download/reload, no duplicate. |
| E | `tests/e2e/source-content-csv.spec.js` — `Journey E — incompatible CSV replacement blocks and imports as new` | 9 | Original source/profile/chart/GeoJSON equality, missing-column reason, distinct import/remap/cancel. |
| F | `tests/e2e/source-content-csv.spec.js` — `Journey F — valid temporal CSV replacement warns then confirms` | 9 | Cancel no-op, stable ID, exact downstream impacts/status, new data/playback safety. |
| G | `tests/e2e/source-content-portability.spec.js` — `Journey G — V5 offline round trip and V4 migration retain library` | 11 | Used/unused media, CSV/GeoJSON, exact V5, V4 migration, zero requests, QMD/Image/map geometry. |
| H | `tests/e2e/source-content-recovery.spec.js` — `Journey H — missing corrupt and relink repair stay isolated` | 11 | Identity/dependencies persist, last-good source survives, bounded fallback, explicit repair, sibling continuity. |
| I | `tests/e2e/source-content-geojson.spec.js` — `Journey I — GeoJSON upload select preview dependency and blocked delete` | 10 | Six stages, all eligible representations, summary/map/text fallback, four eager previews, breadcrumb, no-dialog block. |
| J | `tests/e2e/source-content-geojson.spec.js` — `Journey J — invalid GeoJSON replacement blocks and imports as new` | 10 | Selected join removal, original payload/map equality, exact reason, distinct import/remap/cancel. |
| K | `tests/e2e/source-content-geojson.spec.js` — `Journey K — valid GeoJSON geometry change warns then confirms` | 10 | Geometry/coverage warning, cancel no-op, stable ID/new map, explicit absence of temporal contexts. |

## Explicit Deferrals and Later Ownership

- Google Docs integration remains outside this amendment. A future master-approved integration specification must assign its connector, authentication, import, and portability owners before planning; no current file is pre-authorized.
- CSV cell editing, GeoJSON feature editing, and derivative mutation remain outside the Source Content Manager. A future data-editing design phase owns any such authoring model; current `CsvDetail` and `GeoJsonDetail` remain preview/management surfaces only.
- A global Build Undo/Redo system remains a separate Build-state design initiative. Its future design must reconcile `BuildWorkspace.jsx`, `buildDraftCoordinator.js`, persistence, cleanup, and content retainers; this plan adds only contextual Restore previous image.
- New managed data kinds beyond CSV/GeoJSON and an external/cross-dashboard library require a separate schema/product decision; V5 does not reserve alternate canonical registry keys.
- Arbitrary raw-QMD URL conversion, network proxying, CORS bypass, authored CSS, absolute positioning, and Free-text Present/Audience are rejected boundaries, not deferred implementation work.

## Plan-Author Self-Review Checklist

- [x] Mandatory header, execution sub-skill handoff, goal, architecture, stack, spec, and global constraints are present.
- [x] One cohesive plan is retained because V5 identity, transactions, manager, QMD, and package atomicity share owners.
- [x] Twelve tasks are sequential, independently reviewable vertical slices with exact files/interfaces, RED command/outcome, minimal implementation signature, targeted PASS command, mounted/live step, same-slice records, and atomic commit.
- [x] The ledger contains SCM-S01–S16, SCM-C01–C09, and SCM-R01–R11 exactly once as 36 unique rows, all currently `Proposed / unimplemented / not verified`.
- [x] Journeys A–K have eleven distinct test names/owners and retain their accepted negative assertions and material viewports.
- [x] Proposed production paths and symbols match the accepted post-approval ownership inventory; existing integration symbols were checked against current HEAD.
- [x] Shared interfaces use one vocabulary for `ContentLibrary`, media/source identity, GeoJSON results, graph records, and replacement plans.
- [x] The dependency order prevents a later task from consuming an undefined function/type and keeps overlapping files under one implementation owner at a time.
- [x] Pure engines include a current production-import or mounted integration before their rows can promote.
- [x] Reducer/component/screenshot evidence is never substituted for required composition geometry or real-use behavior.
- [x] Step 7S baseline remains 36/36 Passing; all amendment rows remain unimplemented in this planning commit.
- [x] Deferred work has an explicit future design owner and no accidental production hook.
