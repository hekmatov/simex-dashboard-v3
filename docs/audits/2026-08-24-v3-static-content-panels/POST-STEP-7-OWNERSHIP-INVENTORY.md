# Step 7S Post-Step-7 Ownership Inventory

**Status:** PASS ownership gate; Slices 1–5 now realize the listed owners through canonical Build/View/fullscreen composition. Slice 5 is implementation complete and review pending.

**Accepted Step 7 anchor:** `01511bd5a56978965b8dfc8cdbec3b51c2e17e77`

**Implementation branch:** `codex/static-content-panels-implementation`

**Implementation worktree:** `C:\Users\hekma\Documents\Projects\SimEx\.worktrees\simex-dashboard-v2\static-content-panels-implementation`

**Approved design provenance:** the six docs/sketch-only commits from `3d76055` through `0d68df8` were cherry-picked onto the accepted anchor. No production source, test, dependency, generated catalogue, lockfile, or production CSS change precedes this inventory.

## Gate decisions

1. The live Build/View render chain is `DashboardRenderer` → `DashboardModeWorkspace` → `DashboardCanvas` → `ChartPanel` → `ChartView`. `ViewShell.jsx` and the page-frame portion of `BuildWorkspace.jsx` are not canonical render owners.
2. `BuildCommandHeader.jsx::BuildCommandHeader` owns the top-level **Add chart** command and will add **Add static content**. `DashboardCanvas.jsx::DashboardCanvas` owns the empty-section entry. `DashboardCommandCrown.jsx` is not an Add-content owner.
3. `ChartPanel.jsx::ChartPanel` owns Build Edit routing. `ChartPanelActions.jsx::ChartPanelActions` owns source/details/fullscreen actions and will suppress CSV/source controls for typed static sources.
4. `dashboardBundleV3.js` remains the single dashboard storage/bundle boundary despite its historical filename. The currently conflated `DASHBOARD_CONFIG_VERSION` is replaced by `DASHBOARD_SCHEMA_VERSION = DASHBOARD_CONFIG_STRUCTURE.version` (`4`) and `DASHBOARD_BUNDLE_VERSION` (`4`); contained panels continue to validate through `chartConfigV3.js::CHART_CONFIG_VERSION` (`3`). `parseDashboardBundle` and stored-dashboard normalization may accept v3 only as migration input and always return canonical dashboard v4. A competing bundle module will not be created.
5. `dashboardAssetPersistence.js::createDashboardAssetPersistence, readDashboardStorageWithAssets` remains the legacy uploaded-dataset/inline-Image hydration and migration boundary. New static Image bytes belong exclusively to the separate `browserAuthoredAssetStore.js` authority.
6. Unsaved static authoring is application-session-only. `DashboardRenderer` and `buildDirtyState.js` protect a `staticContent` draft in memory; `chartDraftUnloadGuard.js` and `dashboardPackageExport.js::EXPORT_ISSUES` warn or block at exit/export. No static draft or binary payload API is added to `browserStorage`, localStorage, or IndexedDB. The authored-asset journal contains only transaction/orphan-cleanup facts.
7. A static source stores a positive integer content `revision`, initially `1`. `staticPanelTransaction.js::nextStaticSourceRevision` increments it only on an atomic saved-source change. `sourceVersion` remains the source-schema version and is never reused as the content revision.
8. Presentation protocol v3 carries ordered `items`: `{ kind: "chart", chart_id }` or `{ kind: "image", panel_id, source_id, revision }`. Image descriptors contain no URL, object URL, crop payload, Chrono Group, Scene, frame, or time field. Internal selection may remain ID-based in `displayController.js`; `PresentWorkspace` projects trusted descriptors before publishing.
9. `AudienceSnapshotMonitor.jsx` is only a monitor capture consumer. Image readiness and failure are owned by `useAudienceStaticAssetReadiness.js` and cell-scoped rendering in `AudienceDisplay`/`DisplayedChartGrid`.
10. `ChartView.jsx::withPlaybackTimeContext` gates on static capability before asking for a playback context. `resolveChartRendering.js::resolveChartRendering` invokes `resolveStaticSource` before dataset dependency checks and `prepareChartData`; typed static sources never receive a time filter.
11. `src/charting/forms/schemaRevision.js` remains unchanged: it reconciles data-source profile revisions and is not the registry-revision owner. Registry revision is owned by `chartSchemaRegistry.js::createChartSchemaRegistry`; per-option revision is owned by the private `chartCatalogue.js::schemaRevision` function.

## Slice 4 realized ownership

- `src/static-content/assets/browserAuthoredAssetStore.js` is the sole new authored-binary authority. It owns content-addressed IndexedDB staging/commit/read/removal, typed unavailable/quota/missing/corrupt failures, inventory, and per-window reference-counted object URL leases.
- `src/static-content/assets/durableStaticPanelCommit.js` bridges the existing prepared static transaction to staged bytes and the existing serialized dashboard committer. Dashboard publication precedes durable asset commit; failure rolls back only records created by the transaction.
- `src/static-content/assets/assetReferenceGraph.js` and `reconcileAuthoredAssets.js` own saved/draft/undo/transaction reachability and the exact 24-hour orphan grace. They do not delete referenced records.
- `src/static-content/assets/assetPayloadEnvelope.js` owns deterministic base64/hash envelope operations shared by bundle export/import and offline promotion. It is not a second store.
- `src/static-content/assets/browserAuthoredAssetRuntime.js` owns the one window-local store instance and session-first/durable-fallback lease resolution. `ChartView` owns final lease release when a resolution is replaced or unmounted.
- `src/App.jsx` now persists canonical dashboard v4 JSON only, invokes durable static commit, runs startup/replacement reconciliation, preflights export bytes, and stages complete imported payloads before replacement. The Slice 2/3 session projection is removed. `browserStorage` still owns JSON/preferences only; no binary or unsaved static draft is stored there.
- `src/charting/config/dashboardBundleV3.js` remains the canonical migration/validation/serialization boundary despite its historical filename. No competing v4 module was introduced; `migrateDashboardV3ToV4.js` runs before v4 validation and contained charts remain v3.
- Offline promotion owns generated `data/authored/<sha256>.<ext>` payloads only. Linked HTTPS Images remain declared dependencies; generated paths remain beneath the package root with content type derived from validated media type.

## Slice 5 realized ownership

- `src/components/DashboardRenderer.jsx`, `src/components/dashboard/DashboardModeWorkspace.jsx`, `src/components/dashboard/DashboardCanvas.jsx`, `src/components/ChartPanel.jsx`, and `src/components/charts/ChartView.jsx` remain the only live Build/View static composition chain. `buildStaticAuthoringOpen` is a transient layout signal, not a second model or renderer.
- `src/components/display/DisplayedChartGrid.jsx::findChart` is the public model lookup shared by grid/fullscreen composition. `src/components/FullscreenDisplay.jsx` continues to render the result through `ChartView`; Free-text and Image do not get prototype fullscreen branches.
- `src/components/ChartPanel.jsx::requestEdit` owns both the ordinary Build Edit path and failed-Image Replace/Edit path. It delegates to the existing canonical Build selection callback and is disabled outside Build. View and fullscreen never receive authoring actions.
- `src/components/charts/ChartView.jsx` owns each Image resolution attempt and retry nonce. An effect setup acquires one attempt, cleanup releases that attempt, and Retry starts a new attempt without changing durable asset or StrictMode ownership.
- `src/components/build/UnitOrbit.jsx::captureUnitOrbitReturnState, restoreUnitOrbitReturnState` owns document scroll and initiating-control return around static authoring. `src/components/build/buildCanvasRestoration.js::selectedTargetUsability, selectedTargetRevealDecision` owns the 240×160 material-clearance contract; `BuildWorkspace.jsx` scrolls the first unusable frame and completes only after that contract passes. `src/styles/modes.css` remains the sole Build page-frame compression owner; the state is reversible and does not write saved geometry.
- `src/components/charts/FreeTextChartView.jsx` and `ImageChartView.jsx` expose source/revision evidence markers only on their canonical rendered owners. Static content CSS ownership remains unchanged; Slice 5 adds no presentation/Audience CSS.
- The exact six-stage chart workflow and separate four-stage static workflow remain unchanged. Durable v4 persistence, authored-byte storage, and strict validation remain Slice 4 owners; Present/Audience protocol and passive composition remain Slice 6 owners.
- Fix round 1 adds no production fullscreen or asset-store owner. Behavioral coverage drives the existing `FullscreenDisplay` → `DisplayedChartGrid.findChart` → `ChartView` path and injects failure only through the existing browser-authored store API. Free-text source ID/revision evidence remains on `FreeTextChartView`; no second model lookup or renderer is introduced.

## Clean-baseline findings

The narrow baseline command was run before any production or test edit:

```powershell
node --test tests/dashboardGeometryContract.test.js tests/v3RuntimeBoundaries.test.js
```

Result: 7 passed, 6 failed. The failures are recorded as inherited Step 7 test drift, not Step 7S implementation failures:

- `tests/dashboardGeometryContract.test.js` still expects separate `ViewShell`/`BuildWorkspace` render entrypoints, while accepted production already uses `DashboardModeWorkspace`.
- `tests/v3RuntimeBoundaries.test.js` and `scripts/check-v3-runtime-boundaries.mjs` retain Quorum contract hash `629750…`; the accepted source computes `c4fadf…`. That early failure masks four negative-path assertions. The test also retains the retired Build/View entrypoint expectation.

The entrypoint test correction is preserved on `codex/pre-step7s-dirty-reconciliation` at `4fe6771`; it may be reconciled only after this gate. The renderer experiment at `3b44ba2` is explicitly deferred and must not be merged into Step 7S.

## Existing production owners

| Concern | Exact owner paths and symbols | Step 7S responsibility |
|---|---|---|
| Schema vocabulary and registry | `src/charting/schemas/schemaTypes.js::CHART_SOURCE_KINDS, chartSchema`; `src/charting/schemas/validateChartSchema.js::validateChartSchema`; `src/charting/schemas/operationalSchemas.js::operationalSchemas`; `src/charting/schemas/chartSchemaRegistry.js::createChartSchemaRegistry, listChartSchemas, getChartSchema`; `src/charting/forms/chartCatalogue.js::listChartTypeOptions` and private `schemaRevision` | Validate `authoringWorkflow` and surface/static capabilities; register one enhanced `image` plus `freeText`; expose separate chart/static lists. `src/charting/forms/schemaRevision.js` is explicitly outside this change. |
| Catalogue derivatives | `src/iconography/iconCatalog.js::CHART_TYPE_GLYPHS`; `src/lib/quorumCatalogue.js::semanticChartType, buildChartCatalogue, buildDashboardContext`; `scripts/build-quorum-catalogue.mjs`; `public/integration/quorum-chart-catalogue.json` | Add the Free-text pictogram/interaction and export workflow capability. In `buildDashboardContext`, replace the current root-version comparison to `CHART_CONFIG_VERSION` with `DASHBOARD_CONFIG_STRUCTURE.version`; individual chart validation remains chart config v3. Regenerate the persisted catalogue/digest once. |
| Existing chart workflow | `src/charting/forms/wizardDraft.js::CHART_CREATION_STAGES, CHART_CREATION_STAGE_LABELS, reduceWizardState`; `src/components/chart-authoring/ChartWizardV3.jsx::ChartWizardV3`; `src/components/DashboardRenderer.jsx::openChartWizard` | Preserve the exact six chart stages and route static authoring through separate state and components. |
| Build commands and edit routing | `src/components/build/BuildCommandHeader.jsx::BuildCommandHeader`; `src/components/dashboard/DashboardCanvas.jsx::DashboardCanvas`; `src/components/ChartPanel.jsx::ChartPanel`; `src/components/charts/ChartPanelActions.jsx::ChartPanelActions`; `src/components/DashboardRenderer.jsx::openStaticContentWizard, requestBuildSelection, completeBuildReveal, cancelSelectedPanel` | Add both static entry points through the dedicated static route, route typed static Edit, and suppress chart-only source/CSV actions. `openChartWizard` remains chart-only. |
| Atomic dashboard commit | `src/App.jsx::ensureDashboardCommitController, persistConfiguration, commitImportedConfiguration, configurationForStorage, configurationForPortableUse, createChart, saveChart, cleanupReplacedDashboardAssets, reconcileSavedAuthoredAssets`; `src/lib/dashboardCommitController.js::createSerializedDashboardCommitController` and internal `mutateWithCommit`, `replaceWith` | Commit one prepared static panel/source/manifest revision and run post-commit reconciliation without partial state. Strict import storage failure does not publish the candidate; postreplacement byte-commit failure retains a recoverable referenced journal. Static create/edit uses the new transaction and does not widen `createChart`/`saveChart` into mixed chart/static commands. |
| In-memory authoring protection | `src/components/DashboardRenderer.jsx::prepareToLeaveBuild, resetAfterPackageImport`; `src/components/build/buildDirtyState.js::AUTHORED_DIRTY_KEYS, LOCAL_AUTHORING_DRAFT_KEYS, activeLocalAuthoringDrafts`; `src/charting/forms/chartDraftUnloadGuard.js::installChartDraftUnloadGuard`; `src/lib/dashboardPackageExport.js::EXPORT_ISSUES` | Add the `staticContent` draft category to leave/unload/import/export guards without persisting unsaved fields. |
| Legacy browser asset hydration | `src/lib/dashboardAssetPersistence.js::createBrowserDashboardAssetStore, createDashboardAssetPersistence, readDashboardStorageWithAssets, normalizeDashboardAssetStorageError`; internal `stagePayload, readPayload, removeCreatedAssets, dashboardAssetIds`; `src/App.jsx::dashboardAssetPersistence` | Continue to read legacy uploaded CSV/GeoJSON and inline-Image references so v3 migration has bytes available. Do not store new typed static Image assets or static authoring fields here. |
| Browser key/value storage | `src/lib/browserStorage.js::createSafeBrowserStorage, browserStorage` | Remain the JSON/preference storage boundary only. Reuse quota classification conventions; do not add binary payloads, staged authoring fields, or reload-persistent static drafts. |
| Canonical Build/View render chain | `src/components/DashboardRenderer.jsx::DashboardRenderer, removePanel`; `src/components/dashboard/DashboardModeWorkspace.jsx::DashboardModeWorkspace`; `src/components/dashboard/DashboardCanvas.jsx::DashboardCanvas`; `src/components/ChartPanel.jsx::ChartPanel`; `src/components/charts/ChartView.jsx::ChartView, renderChartContent, ResolvedChartContent` | Route saved static models once through the live chain; Build preview mounts the same `ChartView` dispatch, canonical panel actions reach the shared removal transaction, and browser asset-origin resolution is invoked and released by one effect-owned attempt. Strict replay, source supersession, rejection, and unmount cannot abandon a render-time lease or revoke the active attempt. |
| Build restoration | `src/components/build/BuildWorkspace.jsx::BuildWorkspace`; `src/components/build/buildCanvasRestoration.js::captureBuildCanvasState, restoreBuildCanvasState`; `src/components/build/UnitOrbit.jsx::UnitOrbit, revealUnitOrbitAnchor`; `src/components/common/ModalFocusScope.jsx::useModalFocus` | Preserve canvas selection, scroll, focus, target clearance, and transient compression while static editors are open. |
| Fullscreen and surface dispatch | `src/components/display/DisplayedChartGrid.jsx::DisplayedChartGrid, findChart`; `src/components/FullscreenDisplay.jsx::FullscreenDisplay`; `src/components/charts/ChartView.jsx::renderChartContent`; `src/components/charts/ImageChartView.jsx::ImageChartView, nextImageZoomScale` | Apply active View/fullscreen capabilities and passive Audience behavior from one saved static model. |
| Dataset/static split | `src/charting/rendering/resolveChartRendering.js::resolveChartRendering, sourceDependencyError`; `src/charting/data/prepareChartData.js::prepareChartData`; `src/charting/data/chartDataState.js::sourceStateForDashboard, resolveChartDataState`; `src/charting/data/prepareOperationalData.js::prepareOperationalData`; `src/charting/rendering/operationalAdapter.js::buildOperationalRenderModel` | Resolve typed static sources before row/data-state preparation. Keep inline-row Image support as a bounded legacy adapter only. |
| Dashboard v4 validation and migration | `src/charting/config/dashboardConfigStructure.js::DASHBOARD_CONFIG_STRUCTURE, validateDashboardStructure`; `src/charting/config/dashboardBundleV3.js::DASHBOARD_SCHEMA_VERSION, normalizeDashboardBoundary, validateSource, validateDashboardConfig, normalizeStoredDashboardConfig`; `src/charting/config/dashboardSemanticReferences.js::validateDashboardChartReferences`; `src/lib/loadDashboard.js::normalizeDashboardSource, validateDashboardSourceDescriptors, validateDataSourceDescriptor, validateDatasetProfiles, loadDashboardDefinition, loadDashboardConfig, loadDashboardConfigProgressively`; `src/charting/config/migrateDashboardV3ToV4.js::migrateDashboardV3ToV4, isolateStaticTemporalMembership` | Admit typed static sources, migrate v3 before every storage/import/tracked/portable validation entry, keep typed static sources out of dataset providers/profiling, isolate invalid legacy static membership, and preserve panel-scoped missing/corrupt states. |
| Temporal membership | `src/charting/time/chronoGroupModel.js::validateChronoGroups, validateMemberEligibility`; `src/charting/time/sceneSchema.js::validateScene, validatePresent`; `src/components/build/BuildWorkspace.jsx::temporalAuthoringCharts, mergeChronoGroup, sceneEligibleCharts` | Filter static types from authoring choices and fail closed on static membership. Scene schema invariants remain unchanged. |
| Runtime time exclusion | `src/components/charts/ChartView.jsx::withPlaybackTimeContext`; `src/charting/rendering/resolveChartRendering.js::resolveChartRendering`; `src/components/playback/PlaybackProvider.jsx::buildMemberTimeContexts, timeContextForChart`; `src/charting/time/applyTimeContext.js::applyTimeContext` | Static capability prevents context lookup; static resolution bypasses chart preparation and temporal projection. |
| Bundle v4 export/import | `src/charting/config/dashboardBundleV3.js::DASHBOARD_BUNDLE_VERSION, serializeDashboardBundle, parseDashboardBundle`; `src/lib/dashboardPackageExport.js::prepareDashboardPackageExport`; `src/lib/dashboardPackageCandidate.js::parseDashboardPackageCandidate`; `src/lib/dashboardPackageImportTransaction.js::commitDashboardPackageImport`; `src/App.jsx::inspectImportPackage, confirmImportPackage, commitImportedConfiguration, exportConfig, downloadBundle`; legacy-only `readPackageImageDataUrl, resolvePackageAssetUrl` | Validate payloads/hashes/dependencies, verify stored/deduplicated bytes, stage before one durable replacement, require atomic multi-asset commit, roll back before replacement, and preserve a referenced recovery journal after a later commit failure. New authored bytes are read by asset identity from `browserAuthoredAssetStore`, never silently fetched through the legacy Image-row helper. |
| Portable package promotion | `scripts/promote-dashboard-bundle.mjs::preparePromotedDashboard, promoteDashboardBundle, assertWithinPublicDirectory`; `scripts/build-portable-data.mjs::buildPortableData`; `scripts/package-flashdrive.mjs` generated `start-dashboard-server.ps1::Get-ContentType` and path-containment block; `README.md` package section and generated `START_HERE.md` | Materialize local payloads under safe generated paths, add WebP MIME, preserve the existing containment check, distinguish tracked packaging from browser storage, and document the exact app export → root `packaged-dashboard-bundle.json` → `promote:bundle` → `package:flashdrive` operator sequence. |
| Tracked/generated portable inputs | `public/config/dashboard.json::configVersion, assets`; `public/portable-dashboard-data.js::window.SIMEX_PORTABLE_DASHBOARD`; `package.json::predev, prebuild, build:cloudflare, build:cloudflare:linux, package:flashdrive` | Move the tracked dashboard to schema v4, carry its referenced packaged assets into generated portable data, and keep every build mode regenerating the same portable/catalogue authorities. |
| Present selection and publishing | `src/components/presentation/PresentWorkspace.jsx::configuredChartGroups, toggleChart, presentationState`; `src/components/DashboardRenderer.jsx::presentationValidChartIds`; `src/components/presentation/usePresentationRuntime.js::usePresentationRuntime, publish, open`; `src/lib/displayController.js::reduceDisplayState` | Build a trusted presentable-item index, list Image but not Free text, and project ordered protocol descriptors from internal IDs. |
| Protocol and reconnect | `src/lib/presentationProtocol.js::PRESENTATION_PROTOCOL_VERSION, makePresentationMessage, parsePresentationMessage, validatePresentationState`; `src/lib/presentationChannel.js::createPresentationControllerChannel, createPresentationAudienceChannel` | Validate protocol-v3 chart/Image descriptors and replay the exact identity/revision snapshot. |
| Audience composition | `src/App.jsx::App` audience-channel effect and Audience branch; `src/components/presentation/AudienceDisplay.jsx::AudienceDisplay`; `src/components/display/DisplayedChartGrid.jsx::DisplayedChartGrid` | Rebuild the trusted presentable-item index, resolve each Image independently, and contain failure to one cell. |

## Exact created owners

These paths and exported symbols are fixed before implementation:

| Path | Required symbols / ownership |
|---|---|
| `src/static-content/staticPanelCapabilities.js` | `getStaticPanelCapabilities`, `listStaticContentTypeOptions`, `buildPresentableItemIndex`, `validateStaticDestination` |
| `src/static-content/staticSourceSchema.js` | `normalizeStaticSource`, `validateStaticSource`, `validateStaticTextSource`, `validateStaticImageSource`, `validateAuthoredAssetManifest` |
| `src/static-content/staticSourceResolver.js` | `resolveStaticSource`, `resolveStaticTextSource`, `resolveStaticImageSource` |
| `src/static-content/forms/staticContentDraft.js` | `STATIC_CONTENT_STAGES`, `createStaticContentDraft`, `reduceStaticContentDraft`, `finalizeStaticContentDraft`, `isStaticContentDraftDirty` |
| `src/static-content/staticPanelTransaction.js` | `prepareStaticPanelTransaction`, `commitStaticPanelTransaction`, `nextStaticSourceRevision` |
| `src/components/static-content/StaticContentWizard.jsx` | `StaticContentWizard` |
| `src/components/static-content/StaticContentEditor.jsx` | `StaticContentEditor` |
| `src/components/static-content/StaticContentStateBoundary.jsx` | `StaticContentStateBoundary` with surface-specific loading/failure action inventory |
| `src/components/static-content/FreeTextSourceEditor.jsx` | `FreeTextSourceEditor` |
| `src/components/static-content/ImageSourceEditor.jsx` | `ImageSourceEditor` |
| `src/components/static-content/ImageTransformEditor.jsx` | `ImageTransformEditor` |
| `src/components/charts/FreeTextChartView.jsx` | `FreeTextChartView` |
| `src/static-content/qmd/portableQmdPolicy.js` | `PORTABLE_QMD_POLICY`, `validatePortableQmdAst` |
| `src/static-content/qmd/parsePortableQmd.js` | `parsePortableQmd` |
| `src/static-content/qmd/renderPortableQmd.js` | `renderPortableQmd` |
| `src/static-content/qmd/compilePortableQmd.js` | `compilePortableQmd`, `countPortableQmdFragmentNodes`, `PortableQmdRenderedNodeLimitError` |
| `src/static-content/image/imageAssetValidation.js` | `validateImageAsset`, `inspectImageAnimation`, `validateImageOrigin` |
| `src/static-content/image/imageTransform.js` | `normalizeImageTransform`, `rotateImageCrop`, `nudgeImageCrop`, `resetImageTransform` |
| `src/static-content/assets/browserAuthoredAssetStore.js` | `createBrowserAuthoredAssetStore`, `stageAuthoredAsset`, `commitAuthoredAsset`, `commitAuthoredAssets`, `verifyAuthoredAsset`, `readAuthoredAsset`, `createObjectUrlLease` |
| `src/static-content/assets/assetReferenceGraph.js` | `buildAssetReferenceGraph`, `findAuthoredAssetOrphans` |
| `src/static-content/assets/reconcileAuthoredAssets.js` | `reconcileAuthoredAssets` |
| `src/static-content/assets/assetPayloadEnvelope.js` | `decodeAssetBase64`, `encodeAssetBase64`, `sha256HexSync` |
| `src/static-content/assets/browserAuthoredAssetRuntime.js` | `browserAuthoredAssetStore`, `resolveBrowserAuthoredAsset` |
| `src/static-content/assets/durableStaticPanelCommit.js` | `commitDurableStaticPanelTransaction` |
| `src/charting/config/migrateDashboardV3ToV4.js` | `migrateDashboardV3ToV4`, `isolateStaticTemporalMembership` |
| `src/components/presentation/useAudienceStaticAssetReadiness.js` | `useAudienceStaticAssetReadiness` |
| `src/styles/static-content.css` | Free-text prose/overflow, active Image controls/transforms, static editor/failure selectors |

## CSS ownership

- `src/main.jsx` imports `src/styles/static-content.css`.
- `src/styles/static-content.css` exclusively owns static editor, Free-text, active Image, and static failure selectors. Existing `.chart-image-*` and `.chart-status-*` rules move out of `src/styles.css` in the same slice that imports the new stylesheet.
- `src/styles/modes.css` owns canonical Build/View frame, panel footprint, Unit Orbit, and transient Build compression.
- `src/styles/immersive-display.css` owns fullscreen host geometry.
- `src/styles/presentation.css` owns passive Audience cell loading/failure/fit geometry and contains no Free-text Audience selector.
- `src/styles/chart-data-state.css` remains the dataset chart-state owner; `StaticContentStateBoundary` does not reuse row/data-state semantics.
- `src/styles/dashboard-style-grammar.css` owns only shared theme projection for the Unit Orbit and host surfaces.

## Exact test ownership

| Fidelity IDs | Deterministic test files | Retained browser file |
|---|---|---|
| FT-01 | `tests/wizardDraftV3.test.js`; `tests/chartWizardProofDeck.test.js`; `tests/buildCommandHeader.test.js`; `tests/staticContentDraft.test.js` | `tests/e2e/v3-chart-creation.spec.js`; `tests/e2e/static-free-text.spec.js`; `tests/e2e/static-image.spec.js` |
| FT-02, IM-01 | `tests/chartSchemasV3.test.js`; `tests/chartCatalogueSelection.test.js`; `tests/iconSystem.test.js`; `tests/quorumCatalogueV2.test.js`; `tests/catalogueSharedAuthorities.test.js`; `tests/staticContentRegistry.test.js` | `tests/e2e/static-free-text.spec.js`; `tests/e2e/static-image.spec.js` |
| FT-03–FT-06 | `tests/portableQmdPolicy.test.js`; `tests/portableQmdDomSafety.test.js`; `tests/staticContentDraft.test.js` | `tests/e2e/static-free-text.spec.js` |
| FT-07–FT-10 | `tests/staticContentDraft.test.js`; `tests/freeTextChartView.test.js`; `tests/chartViewV3.test.js`; `tests/v3RuntimeBoundaries.test.js` | `tests/e2e/static-free-text.spec.js` |
| FT-11 | `tests/staticPanelTransaction.test.js`; `tests/buildDirtyState.test.js`; `tests/buildAuthoringExitProtection.test.js`; `tests/fullscreenDisplay.test.js` | `tests/e2e/static-free-text.spec.js` |
| FT-12 | `tests/presentWorkspace.test.js`; `tests/presentationProtocol.test.js`; `tests/audienceDisplay.test.js` | `tests/e2e/static-free-text.spec.js` |
| IM-02 | `tests/imageAssetValidation.test.js` | `tests/e2e/static-image.spec.js` |
| IM-03, IM-04, IM-07 | `tests/browserAuthoredAssetStore.test.js`; `tests/staticSourceSchema.test.js`; `tests/dashboardPackageExport.test.js`; `tests/dashboardBundleV3.test.js` | `tests/e2e/static-image.spec.js`; `tests/e2e/static-content-portability.spec.js` |
| IM-05 | `tests/staticSourceSchema.test.js`; `tests/imageChartView.test.js`; `tests/audienceDisplay.test.js` | `tests/e2e/static-image.spec.js`; `tests/e2e/static-image-audience.spec.js` |
| IM-06 | `tests/imageTransform.test.js` | `tests/e2e/static-image.spec.js` |
| IM-08, IM-11, IM-12 | `tests/staticContentDraft.test.js`; `tests/imageTransform.test.js` | `tests/e2e/static-image.spec.js` |
| IM-09, IM-10 | `tests/imageChartView.test.js`; `tests/fullscreenDisplay.test.js`; `tests/staticPanelComposition.test.js` | `tests/e2e/static-image.spec.js` |
| IM-13 | `tests/imageChartView.test.js`; `tests/audienceDisplay.test.js`; `tests/staticPanelComposition.test.js` | `tests/e2e/static-image.spec.js`; `tests/e2e/static-image-audience.spec.js` |
| IM-14 | `tests/staticContentDraft.test.js`; `tests/staticPanelTransaction.test.js`; `tests/buildAuthoringExitProtection.test.js`; `tests/fullscreenDisplay.test.js` | `tests/e2e/static-image.spec.js` |
| IM-15 | `tests/presentWorkspace.test.js`; `tests/presentationProtocol.test.js`; `tests/presentationChannel.test.js`; `tests/audienceDisplay.test.js`; `tests/staticSourceResolver.test.js` | `tests/e2e/static-image-audience.spec.js` |
| IM-16 | `tests/audienceDisplay.test.js` | `tests/e2e/static-image-audience.spec.js` |
| PS-01 | `tests/staticPanelTransaction.test.js`; `tests/browserAuthoredAssetStore.test.js`; `tests/buildDirtyState.test.js`; `tests/chartDraftSession.test.js`; `tests/dashboardAppV3.test.js` | `tests/e2e/static-free-text.spec.js`; `tests/e2e/static-image.spec.js` |
| PS-02 | `tests/dashboardBundleV3.test.js`; `tests/dashboardAssetPersistence.test.js`; `tests/dashboardMigrationV4.test.js`; `tests/staticTemporalBoundary.test.js`; `tests/sceneSchema.test.js` | `tests/e2e/static-content-portability.spec.js` |
| PS-03 | `tests/dashboardBundleV3.test.js`; `tests/dashboardPackageCandidate.test.js`; `tests/dashboardPackageExport.test.js`; `tests/dashboardPackageImportTransaction.test.js`; `tests/dashboardAppV3.test.js` | `tests/e2e/static-content-portability.spec.js` |
| PS-04 | `tests/datasetProfilesV3.test.js`; `tests/staticContentPortablePackage.test.js` | `tests/e2e/static-content-portability.spec.js` |
| PS-05 | `tests/authoredAssetCleanup.test.js`; `tests/browserAuthoredAssetStore.test.js`; `tests/staticPanelTransaction.test.js` | `tests/e2e/static-content-portability.spec.js` replacement/removal inventory journey |
| PS-06 | `tests/staticPanelComposition.test.js`; `tests/buildWorkspaceV3.test.js`; `tests/dashboardGeometryContract.test.js`; `tests/buildAuthoringExitProtection.test.js` | `tests/e2e/static-free-text.spec.js`; `tests/e2e/static-image.spec.js` |
| PS-07 | `tests/imageChartView.test.js`; `tests/freeTextChartView.test.js`; `tests/fullscreenDisplay.test.js`; `tests/audienceDisplay.test.js` | `tests/e2e/static-free-text.spec.js`; `tests/e2e/static-image.spec.js`; `tests/e2e/static-image-audience.spec.js` |
| PS-08 | `tests/staticTemporalBoundary.test.js`; `tests/dashboardMigrationV4.test.js`; `tests/chronoGroupModelV3.test.js`; `tests/sceneSchema.test.js`; `tests/presentationProtocol.test.js`; `tests/presentWorkspace.test.js` | `tests/e2e/static-image-audience.spec.js` |

## Gate verification

The gate commit is allowed to contain only this inventory and synchronized planning/design records. It must not contain production source, tests, dependencies, generated catalogues, lockfiles, or production CSS.

Required checks before commit:

1. The fidelity matrix contains 36 unique IDs and every Production owner cell names at least one exact path and symbol.
2. The executable ledger contains the same 36 IDs; every Owning slice cell names an exact path/symbol and every Deterministic test cell names exact `tests/...` files.
3. Owner cells contain none of: `resolved by`, `resolve at`, `if required`, `if needed`, `final Step 7 owner`, `generic service`, `new ... module`, `or create`, or `or replace`.
4. `git diff --check` passes.
5. `git diff --name-only 243f28a..HEAD` contains documentation only.

These checks passed for the synchronized gate files. Production implementation still requires the planned TDD slices; the gate itself implements no feature.
