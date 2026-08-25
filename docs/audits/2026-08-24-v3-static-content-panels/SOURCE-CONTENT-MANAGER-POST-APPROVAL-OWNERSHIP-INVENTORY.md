# Source Content Manager and QMD Reusable Media — Post-Approval Ownership Inventory

**Date:** 2026-08-25
**Status:** Post-approval ownership prerequisite complete. The written amendment is approved; production remains unimplemented and not verified.
**Approved amendment:** `81531b4b939e89b529d0ddee36241e517c33956d`
**Calibration commits:** initial `526003d195cd769de52e23563d2f244fb4feaea3` and first correction `3f97ff9bac61c12f1c78e17ba70af824be5717bd`; the second master-requested byte-margin correction is recorded in `GEOJSON-LIMITS-DECISION.md` and the spike evidence.
**Implementation branch:** `codex/static-content-panels-implementation`

This inventory resolves the amendment's owners against live HEAD before final implementation planning. It creates no production owner. Every path labelled **proposed** is an exact intended path with one responsibility and remains uncreated. The accepted Step 7S baseline remains engine implemented, UI implemented, 36/36 fidelity rows Passing, independently review-clean, branch-retained, and unmerged. All 36 amendment rows remain **Proposed / unimplemented / not verified**.

## Ownership decisions

1. `src/charting/config/dashboardBundleV3.js` remains the dashboard storage/bundle boundary despite its historical filename. It will advance the dashboard and bundle constants to V5, run `migrateDashboardV4ToV5` before V5 validation, and keep contained chart configuration at V3. No competing bundle module will be created.
2. The canonical schema keys are exactly `contentLibrary.mediaItems` and `contentLibrary.sourceEntries`. `contentLibrarySchema.js` owns only the logical registry shape. It does not own image bytes, CSV/GeoJSON descriptors or payloads, or CSV profiles.
3. `mediaItems.js` owns stable `mediaId`, current asset pointer, revision, display metadata, default description, origin, and health metadata. `browserAuthoredAssetStore.js` remains the sole authored-image byte authority; physical hash dedupe never collapses requested logical media records.
4. `sourceEntrySchema.js` owns source-management metadata keyed by existing `sourceId`. Authoritative kind and payload stay in `dataSources`; `datasetProfiles` remains CSV-only. Generated/intermediate visibility is determined from trusted provenance, never filename/path inference.
5. `geoJsonValidation.js` is the single bounded GeoJSON inspection and limit authority. It owns the calibrated constants, iterative complexity accounting, accepted geometry types, GeometryCollection rejection, and domain summary facts. Existing `loadDashboard.js::validateGeoJson`, authoring, replacement, preview, package, and runtime consumers must call it rather than copy limits.
6. `contentDependencyGraph.js` owns direct saved uses and actual live retention. Navigation breadcrumbs are derived context, not extra dependencies. Chrono groups, Scenes, and presentation compositions are impact contexts only; runtime Present messages and object-URL leases are not durable dependencies.
7. Delete, replace/relink, and draft publication have separate transaction owners. No transaction cascades, silently rewrites placement metadata, or publishes a partial registry/descriptor/payload/profile state.
8. The Source Content Manager is one non-modal Build auxiliary workspace owned by `SourceContentWorkspace.jsx`; `BuildCommandHeader.jsx` opens it and `BuildWorkspace.jsx` hosts it. The existing six-stage chart and four-stage static workflows retain their current state-machine owners.
9. QMD local-media syntax and attribute validation are owned by `portableQmdMedia.js`; existing parse/render owners consume that result. `QmdMediaInspector.jsx` owns authoring controls and `QmdMediaView.jsx` owns runtime geometry/fallback. Raw QMD never gains URL-fetch or arbitrary CSS authority.
10. Existing Static Image, fullscreen, Present, and Audience composition remain canonical consumers. The library changes identity/resolution, not surface eligibility: Free text remains Build/View/fullscreen only; Image remains additionally Present/passive Audience eligible.

## Existing integration owners

| Concern | Existing exact owners | Amendment responsibility |
|---|---|---|
| Dashboard schema/version boundary | `src/charting/config/dashboardConfigStructure.js::DASHBOARD_CONFIG_STRUCTURE, validateDashboardStructure`; `src/charting/config/dashboardBundleV3.js::DASHBOARD_SCHEMA_VERSION, DASHBOARD_BUNDLE_VERSION, normalizeDashboardBoundary, validateDashboardConfig, serializeDashboardBundle, parseDashboardBundle` | Admit exact V5 `contentLibrary`, migrate V4 first, reject alternate/unknown keys, preserve chart V3. |
| V4 baseline migration | `src/charting/config/migrateDashboardV3ToV4.js::migrateDashboardV3ToV4, isolateStaticTemporalMembership` | Remains the V3→V4 step; the proposed V4→V5 step follows it and creates eligible media/CSV/GeoJSON logical records. |
| Descriptor/profile validation | `src/lib/loadDashboard.js::normalizeDashboardSource, validateDashboardSourceDescriptors, validateDataSourceDescriptor, validateDatasetProfiles, validateGeoJson` | Continue owning `dataSources` and CSV-only `datasetProfiles`; delegate bounded GeoJSON validation to the proposed single authority. |
| Authored image bytes | `src/static-content/assets/browserAuthoredAssetStore.js::createBrowserAuthoredAssetStore, stageAuthoredAsset, commitAuthoredAsset, commitAuthoredAssets, verifyAuthoredAsset, readAuthoredAsset, createObjectUrlLease`; `src/static-content/assets/browserAuthoredAssetRuntime.js::browserAuthoredAssetStore, resolveBrowserAuthoredAsset` | Keep content-addressed bytes and leases outside logical media records; support revision publication and safe old-lease release. |
| Static Image source/placement | `src/static-content/staticSourceSchema.js::normalizeStaticSource, validateStaticImageSource, validateAuthoredAssetManifest`; `src/static-content/image/imageAssetValidation.js::validateImageAsset, inspectImageAnimation, validateImageOrigin`; `src/static-content/image/imageTransform.js::normalizeImageTransform`; `src/components/static-content/ImageSourceEditor.jsx::ImageSourceEditor` | Change durable placement identity to `mediaId`; preserve per-placement alt/decorative/crop/rotation/fit and local zoom; expose Choose from media and Restore previous image. |
| Current asset cleanup | `src/static-content/assets/assetReferenceGraph.js::buildAssetReferenceGraph, findAuthoredAssetOrphans`; `src/static-content/assets/reconcileAuthoredAssets.js::reconcileAuthoredAssets`; `src/components/build/buildDirtyState.js::activeLocalAuthoringDrafts` | Consume library records plus real draft/replacement/transaction retention. Do not invent global undo history or collect unused committed media records. |
| Browser persistence | `src/lib/dashboardAssetPersistence.js::createBrowserDashboardAssetStore, createDashboardAssetPersistence, readDashboardStorageWithAssets`; `src/lib/browserStorage.js::createSafeBrowserStorage, browserStorage`; `src/App.jsx::configurationForStorage, persistConfiguration, commitImportedConfiguration` | Persist V5 logical metadata through the dashboard boundary and existing byte/payload authorities; drafts remain application-session-only. |
| Package export/import | `src/lib/dashboardPackageExport.js::prepareDashboardPackageExport`; `src/lib/dashboardPackageCandidate.js::parseDashboardPackageCandidate`; `src/lib/dashboardPackageImportTransaction.js::commitDashboardPackageImport`; `src/charting/config/dashboardBundleV3.js::serializeDashboardBundle, parseDashboardBundle` | Include all retained local media plus managed CSV/GeoJSON and validate cross-layer V5 references atomically with V4 compatibility. |
| Build commands/workspace | `src/components/build/BuildCommandHeader.jsx::BuildCommandHeader`; `src/components/build/BuildWorkspace.jsx::BuildWorkspace`; `src/components/build/buildCanvasRestoration.js::captureBuildCanvasState, restoreBuildCanvasState`; `src/components/DashboardRenderer.jsx::DashboardRenderer` | Add Source content command/workspace while preserving canvas, selection, scroll, focus, and phone Build policy. DashboardRenderer is a consumer, not the draft-retention authority. |
| Chart workflow | `src/charting/forms/wizardDraft.js::CHART_CREATION_STAGES, CHART_CREATION_STAGE_LABELS, reduceWizardState`; `src/components/chart-authoring/ChartWizardV3.jsx::ChartWizardV3, parseUploadedCsvFile`; `src/components/chart-authoring/DataSourceStep.jsx::DataSourceStep` | Preserve exactly six stages; select/register managed CSV at data source and managed GeoJSON at map geography authoring. |
| Static workflow | `src/static-content/forms/staticContentDraft.js::STATIC_CONTENT_STAGES, createStaticContentDraft, reduceStaticContentDraft, finalizeStaticContentDraft`; `src/components/static-content/StaticContentWizard.jsx::StaticContentWizard` | Preserve exactly four stages; stage library uploads and publish only with completed panel. |
| GeoJSON descriptor/runtime | `src/data/sourceRequest.js::providerKindForDescriptor, isGeoJsonDescriptor, normalizeSourceRequest`; `src/data/dashboardSourceProviders.js`; `src/charting/data/geoData.js`; `src/charting/data/prepareGeographyData.js`; `src/charting/rendering/geographyAdapter.js`; `src/components/charts/EChartsChartView.jsx::EChartsChartView` | Consume one validated descriptor/summary and enforce measured concurrent-map behavior without a second payload or profile model. |
| GeoJSON authoring selector | `src/charting/forms/geographySource.js::validatedGeoSourceOptions, applyGeographySourceSelection, geoJoinFieldOptions`; `src/components/chart-authoring/DataSourceStep.jsx::DataSourceStep` | Close the verified gap: `validatedGeoSourceOptions` currently admits tracked `kind: "geojson"` only, while storage/runtime also recognize `kind: "dataset", type: "uploadedGeoJson"`. Normalize both through one eligible managed-source selector. |
| CSV inspection | `src/components/source-data/SourceCsvViewerButton.jsx::SourceCsvViewerButton`; `src/source-viewer/SourceCsvViewer.jsx::SourceCsvViewer`; `src/components/SourceViewer.jsx::SourceViewer`; `src/components/source-data/sourceViewerProtocol.js` | Reuse bounded CSV profile/preview/download semantics in Data Source detail; do not treat it as GeoJSON proof. |
| QMD parser/renderer | `src/static-content/qmd/portableQmdPolicy.js::PORTABLE_QMD_POLICY, validatePortableQmdAst`; `src/static-content/qmd/parsePortableQmd.js::parsePortableQmd`; `src/static-content/qmd/renderPortableQmd.js::renderPortableQmd`; `src/static-content/qmd/compilePortableQmd.js::compilePortableQmd`; `src/components/charts/FreeTextChartView.jsx::FreeTextChartView` | Add only validated `simex-media:media-id` nodes and allowlisted attributes; all other image destinations remain inert text/request-free. The permissive-inert text policy remains unchanged. |
| Present/Audience | `src/static-content/staticPanelCapabilities.js::buildPresentableItemIndex`; `src/lib/presentationProtocol.js::validatePresentationState`; `src/components/presentation/PresentWorkspace.jsx::PresentWorkspace`; `src/components/presentation/AudienceDisplay.jsx::AudienceDisplay`; `src/components/presentation/useAudienceStaticAssetReadiness.js::useAudienceStaticAssetReadiness`; `src/components/display/DisplayedChartGrid.jsx::DisplayedChartGrid`; `src/components/charts/ChartView.jsx::ChartView` | Resolve current media revision through existing trusted Image descriptors and passive cells; do not add Free text or manager records as presentable items/dependencies. |

## Exact proposed production owners

These paths are fixed for final planning but remain uncreated.

| Proposed path | Exact symbols and single responsibility |
|---|---|
| `src/content-library/contentLibrarySchema.js` | `normalizeContentLibrary`, `validateContentLibrary`: exact V5 logical registry shape and cross-key identity only. |
| `src/content-library/migrateDashboardV4ToV5.js` | `migrateDashboardV4ToV5`: deterministic V4→V5 media/CSV/GeoJSON logical-record migration before V5 validation. |
| `src/content-library/mediaItems.js` | `createMediaItem`, `replaceMediaItemRevision`, `validateMediaItem`: logical media identity, revision/current pointer, display/default metadata. |
| `src/content-library/sourceEntrySchema.js` | `classifyManagedSource`, `validateSourceEntry`, `listManageableSourceEntries`: explicit origin/ownership/display/provenance and selector eligibility keyed by `sourceId`. |
| `src/content-library/geoJsonSourceEntry.js` | `normalizeManagedGeoJsonSource`, `summarizeGeoJsonSource`: representation normalization and manager-facing summary projection from the validation authority. |
| `src/lib/geoJsonValidation.js` | `GEOJSON_LIMITS`, `inspectGeoJsonComplexity`, `validateGeoJson`: one bounded, iterative validation/limits/summary authority implementing `GEOJSON-LIMITS-DECISION.md`. |
| `src/content-library/contentDependencyGraph.js` | `buildContentDependencyGraph`, `mediaDependencies`, `csvDependencies`, `geoJsonDependencies`, `activeRetentions`, `temporalImpactContexts`: direct-use/retention graph and separate impact contexts. |
| `src/content-library/contentDeletionTransaction.js` | `prepareContentDeletion`, `commitContentDeletion`: no-cascade eligibility, atomic deletion, and rollback. |
| `src/content-library/contentReplacementTransaction.js` | `prepareMediaReplacement`, `prepareCsvReplacement`, `prepareGeoJsonReplacement`, `validateDirectChartCompatibility`, `csvReplacementWarnings`, `geoJsonReplacementWarnings`, `applyTemporalImpactStatus`, `commitMediaReplacement`, `commitCsvReplacement`, `commitGeoJsonReplacement`: validated replace/relink transactions and typed block/warning outcomes. |
| `src/content-library/contentDraftTransaction.js` | `stageContentDraft`, `finalizeContentDraft`, `discardContentDraft`: application-session manager/QMD/Image/chart staging and atomic publication/cleanup. |
| `src/content-library/contentHealth.js` | `deriveContentHealth`, `repairContentItem`: persisted identity plus explicit Ready/External/Missing/Corrupt/Needs relink/Needs review recovery. |
| `src/content-library/contentPackageValidation.js` | `validateContentPackage`: V5 cross-layer media/QMD/source/payload/profile/package reference validation; no serialization or storage duplication. |
| `src/static-content/qmd/portableQmdMedia.js` | `parsePortableMediaReference`, `validatePortableMediaAttributes`, `serializePortableMediaReference`: exact local-media grammar and allowlisted QMD attributes. |
| `src/components/source-content/SourceContentWorkspace.jsx` | `SourceContentWorkspace`: non-modal workspace shell, tabs, responsive list/detail navigation, state/focus restoration contract. |
| `src/components/source-content/ContentCatalogue.jsx` | `ContentCatalogue`: accessible shared search/filter/list/selection shell only. |
| `src/components/source-content/MediaCatalogue.jsx` | `MediaCatalogue`: Media-specific rows, filters, status, usage, and add/import entry. |
| `src/components/source-content/DataSourceCatalogue.jsx` | `DataSourceCatalogue`: CSV/GeoJSON kind/origin/health/usage rows and filters. |
| `src/components/source-content/ContentDetail.jsx` | `ContentDetail`: selected-kind routing only; no metadata authority. |
| `src/components/source-content/MediaDetail.jsx` | `MediaDetail`: media metadata/default description/preview/usage/actions and External Import as local media entry. |
| `src/components/source-content/DataSourceDetail.jsx` | `DataSourceDetail`: CSV-versus-GeoJSON detail routing and shared source actions only. |
| `src/components/source-content/CsvDetail.jsx` | `CsvDetail`: CSV profile, searchable bounded table preview, and permitted download. |
| `src/components/source-content/GeoJsonDetail.jsx` | `GeoJsonDetail`: GeoJSON feature/geometry/bounds/property summary and source actions. |
| `src/components/source-content/GeoJsonPreview.jsx` | `GeoJsonPreview`: bounded map preview with accessible textual fallback and measured concurrent-map policy. |
| `src/components/source-content/DependencyList.jsx` | `DependencyList`: Page › Section › Panel breadcrumbs, active-retention explanations, and guided navigation. |
| `src/components/source-content/ContentActionDialog.jsx` | `ContentActionDialog`: eligible delete confirmation and replacement/relink/guided-remap modal states; blocked delete never opens it. |
| `src/components/source-content/MediaPicker.jsx` | `MediaPicker`: QMD/Image eligibility, reuse/upload, scoped External Import as local media, selection/focus return. |
| `src/components/source-content/DataSourcePicker.jsx` | `DataSourcePicker`: managed CSV/GeoJSON eligibility and upload/register selection without changing workflow stages. |
| `src/components/static-content/QmdMediaInspector.jsx` | `QmdMediaInspector`: progressive width/alignment/flow/frame/caption/alt/decorative placement controls and Change image/Open media routing. |
| `src/components/charts/QmdMediaView.jsx` | `QmdMediaView`: leased local media render, aspect/width/wrap/RTL geometry, reserved dimensions, and bounded fallback. |
| `src/styles/source-content.css` | Source Content Manager desktop/tablet list/detail, preview, dependency, and modal composition only. |

## Dependency and transaction boundary

| Item | Saved direct uses | Actual temporary retainers | Downstream contexts only |
|---|---|---|---|
| Media | QMD embedding; Static Image placement | Active manager/QMD/Image draft; active Image replacement snapshot; active delete/replace/import transaction | Present/Audience descriptor or lease |
| CSV | Panel whose primary `sourceId` is the managed CSV, including a map chart's primary data | Active chart/manager draft; active replacement/relink/delete transaction | Chrono group, Scene, presentation composition named only for temporal-change warning |
| GeoJSON | Map panel whose `chart.presentation.map.geoSource` is the managed source | Active map/manager draft; active replacement/relink/delete transaction | No temporal impact context |

Page and section are breadcrumbs to a panel use, not additional dependencies. Reset remains the whole unsaved Build-session action. The prior Image is retained only by the active Image draft/replacement snapshot until Restore previous image, Save, or Discard resolves it. There is no CSV undo, global Build Undo/Redo, or retained undo-history blocker.

Delete is visibly disabled with inline explanation and navigation while any saved direct use or actual retainer exists; it opens no dialog. Only eligible deletion reaches `ContentActionDialog`. Structural replacement failure changes nothing and offers Import as new source plus guided remapping. All commit/rollback/cleanup publication is transactional.

## Fidelity-row ownership

Every deterministic path below is an intended production-test owner; every browser path/title is a retained real-use owner that must inspect meaningful behavior and geometry rather than labels or smoke state. Proposed test files remain uncreated.

| Fidelity row | Deterministic owner | Retained browser journey owner |
|---|---|---|
| SCM-S01 | `tests/dashboardMigrationV5.test.js`; `tests/dashboardBundleV5.test.js` | `tests/e2e/source-content-portability.spec.js` — `V4 mixed content migrates to canonical V5 before manager use` |
| SCM-S02 | `tests/contentLibrarySchema.test.js` | `tests/e2e/source-content-manager.spec.js` — `manager details correlate exact registry identities with live authorities` |
| SCM-S03 | `tests/mediaItems.test.js`; `tests/browserAuthoredAssetStore.test.js` | `tests/e2e/source-content-media.spec.js` — Journey A default-description/dedupe branch |
| SCM-S04 | `tests/sourceEntrySchema.test.js` | `tests/e2e/source-content-manager.spec.js` — `source visibility follows explicit provenance for CSV and GeoJSON` |
| SCM-S05 | `tests/contentDependencyGraph.test.js`; `tests/buildDirtyState.test.js` | `tests/e2e/source-content-media.spec.js` Journey A; `tests/e2e/source-content-geojson.spec.js` Journey I |
| SCM-S06 | `tests/contentDependencyGraph.test.js`; `tests/presentationProtocol.test.js` | `tests/e2e/source-content-media.spec.js` — `runtime Present and Audience do not add durable dependencies` |
| SCM-S07 | `tests/contentDeletionTransaction.test.js` | `tests/e2e/source-content-media.spec.js` Journey A; `tests/e2e/source-content-geojson.spec.js` Journey I |
| SCM-S08 | `tests/contentReplacementTransaction.test.js`; `tests/staticSourceSchema.test.js` | `tests/e2e/source-content-media.spec.js` — Journey B |
| SCM-S09 | `tests/csvReplacementTransaction.test.js` | `tests/e2e/source-content-csv.spec.js` — Journey E |
| SCM-S10 | `tests/csvReplacementTransaction.test.js`; `tests/chronoGroupModelV3.test.js`; `tests/sceneSchema.test.js` | `tests/e2e/source-content-csv.spec.js` — Journey F |
| SCM-S11 | `tests/portableQmdMedia.test.js`; `tests/portableQmdDomSafety.test.js` | `tests/e2e/qmd-reusable-media.spec.js` — Journey C request-authority branch |
| SCM-S12 | `tests/dashboardBundleV5.test.js`; `tests/dashboardPackageExport.test.js`; `tests/dashboardPackageImportTransaction.test.js` | `tests/e2e/source-content-portability.spec.js` — Journey G |
| SCM-S13 | `tests/contentDraftTransaction.test.js`; `tests/staticContentDraft.test.js`; `tests/authoredAssetCleanup.test.js` | `tests/e2e/source-content-media.spec.js` — Journey A draft/Restore/Save/Discard/Reset branch |
| SCM-S14 | `tests/contentHealth.test.js`; `tests/authoredAssetCleanup.test.js` | `tests/e2e/source-content-recovery.spec.js` — Journey H |
| SCM-S15 | `tests/geoJsonValidation.test.js`; `tests/geoJsonSourceEntry.test.js`; calibration `.planning/spikes/001-geojson-limit-calibration/` | `tests/e2e/source-content-geojson.spec.js` — Journey I implemented manager/runtime boundary checks |
| SCM-S16 | `tests/geoJsonReplacementTransaction.test.js`; `tests/prepareGeographyData.test.js` | `tests/e2e/source-content-geojson.spec.js` — Journeys J and K |
| SCM-C01 | `tests/buildCommandHeader.test.js`; `tests/sourceContentWorkspace.test.js`; `tests/wizardDraftV3.test.js`; `tests/staticContentDraft.test.js` | `tests/e2e/source-content-manager.spec.js` — `three Build content commands preserve six/four stage contracts` |
| SCM-C02 | `tests/sourceContentWorkspace.test.js`; `tests/buildWorkspaceV3.test.js` | `tests/e2e/source-content-manager.spec.js` — `non-modal manager restores canvas selection scroll and focus` |
| SCM-C03 | `tests/sourceContentWorkspace.test.js` | `tests/e2e/source-content-manager.spec.js` — `desktop and tablet catalogue-detail composition preserves state` |
| SCM-C04 | `tests/contentDetail.test.js`; `tests/contentDependencyGraph.test.js` | `tests/e2e/source-content-media.spec.js` Journey A; `tests/e2e/source-content-geojson.spec.js` Journey I |
| SCM-C05 | `tests/contentPicker.test.js`; `tests/staticContentDraft.test.js`; `tests/wizardDraftV3.test.js`; `tests/chartAuthoringComponentsV3.test.js` | `tests/e2e/source-content-media.spec.js` Journey A; `tests/e2e/source-content-csv.spec.js` Journey D; `tests/e2e/source-content-geojson.spec.js` Journey I |
| SCM-C06 | `tests/qmdMediaInspector.test.js`; `tests/portableQmdMedia.test.js` | `tests/e2e/qmd-reusable-media.spec.js` — Journey C controls/serialization branch |
| SCM-C07 | `tests/freeTextChartView.test.js`; `tests/qmdMediaView.test.js` | `tests/e2e/qmd-reusable-media.spec.js` — Journey C measured responsive geometry branch |
| SCM-C08 | `tests/contentActionDialog.test.js`; `tests/contentDeletionTransaction.test.js`; `tests/contentReplacementTransaction.test.js` | `tests/e2e/source-content-media.spec.js` Journeys A/B; `tests/e2e/source-content-csv.spec.js` Journeys E/F; `tests/e2e/source-content-geojson.spec.js` Journeys J/K |
| SCM-C09 | `tests/geoJsonContentManager.test.js`; `tests/chartAuthoringComponentsV3.test.js`; `tests/geoJsonValidation.test.js` | `tests/e2e/source-content-geojson.spec.js` — Journey I |
| SCM-R01 | Semantic/composition prerequisites above; `tests/contentDraftTransaction.test.js`; `tests/contentDeletionTransaction.test.js`; `tests/contentPicker.test.js` | `tests/e2e/source-content-media.spec.js` — Journey A |
| SCM-R02 | `tests/contentReplacementTransaction.test.js`; `tests/staticSourceSchema.test.js`; `tests/qmdMediaView.test.js`; `tests/imageChartView.test.js` | `tests/e2e/source-content-media.spec.js` — Journey B |
| SCM-R03 | `tests/portableQmdMedia.test.js`; `tests/qmdMediaInspector.test.js`; `tests/qmdMediaView.test.js`; `tests/freeTextChartView.test.js` | `tests/e2e/qmd-reusable-media.spec.js` — Journey C |
| SCM-R04 | `tests/wizardDraftV3.test.js`; `tests/contentDraftTransaction.test.js`; `tests/sourceEntrySchema.test.js`; `tests/contentDetail.test.js` | `tests/e2e/source-content-csv.spec.js` — Journey D |
| SCM-R05 | `tests/csvReplacementTransaction.test.js`; `tests/contentActionDialog.test.js`; `tests/chartConfigV3.test.js` | `tests/e2e/source-content-csv.spec.js` — Journey E |
| SCM-R06 | `tests/csvReplacementTransaction.test.js`; `tests/chronoGroupModelV3.test.js`; `tests/sceneSchema.test.js`; `tests/presentationProtocol.test.js` | `tests/e2e/source-content-csv.spec.js` — Journey F |
| SCM-R07 | `tests/dashboardMigrationV5.test.js`; `tests/dashboardBundleV5.test.js`; `tests/dashboardPackageExport.test.js`; `tests/dashboardPackageImportTransaction.test.js`; `tests/contentPackageValidation.test.js` | `tests/e2e/source-content-portability.spec.js` — Journey G |
| SCM-R08 | `tests/contentHealth.test.js`; `tests/authoredAssetCleanup.test.js`; `tests/dashboardAssetPersistence.test.js`; `tests/geoJsonReplacementTransaction.test.js` | `tests/e2e/source-content-recovery.spec.js` — Journey H |
| SCM-R09 | `tests/geoJsonSourceEntry.test.js`; `tests/geoJsonContentManager.test.js`; `tests/contentDependencyGraph.test.js`; `tests/contentDeletionTransaction.test.js`; `tests/chartAuthoringComponentsV3.test.js` | `tests/e2e/source-content-geojson.spec.js` — Journey I |
| SCM-R10 | `tests/geoJsonValidation.test.js`; `tests/geoJsonReplacementTransaction.test.js`; `tests/contentActionDialog.test.js`; `tests/prepareGeographyData.test.js` | `tests/e2e/source-content-geojson.spec.js` — Journey J |
| SCM-R11 | `tests/geoJsonReplacementTransaction.test.js`; `tests/geoJsonSourceEntry.test.js`; `tests/prepareGeographyData.test.js`; `tests/chronoGroupModelV3.test.js` | `tests/e2e/source-content-geojson.spec.js` — Journey K |

## Browser evidence boundary

The retained browser suite owns eleven independently inspectable representative journeys:

- Journey A — manager media create/reuse/default/External import/dependencies/blocked-delete/actual replacement retention;
- Journey B — global media replacement and placement-state preservation;
- Journey C — QMD controls, request authority, responsive/wrapped/RTL geometry, narrow collapse, fallback;
- Journey D — CSV upload/select through the unchanged six-stage chart flow, then catalogue management;
- Journey E — incompatible CSV replacement hard block/import-as-new;
- Journey F — structurally valid CSV temporal warning/confirm and impact status;
- Journey G — V5 export/import, V4 migration, unused library retention, offline QMD/Image/map;
- Journey H — isolated missing/corrupt/relink repair;
- Journey I — GeoJSON upload/select/manage/preview/direct dependency/blocked delete;
- Journey J — structurally invalid GeoJSON replacement hard block/import-as-new;
- Journey K — structurally valid changed-geometry/join-coverage warning/confirm.

Material states remain Build 1440×900 and 1024×768, with QMD View 390×844 and fullscreen where specified. The constrained Chromium profile is calibration evidence for limit selection, not a substitute for implemented manager journeys. A semantic engine cannot promote a composition or real-use row until mounted integration and inspected geometry/behavior evidence exist.

## Planning gate disposition

- GeoJSON limit calibration: second corrected result recorded in `GEOJSON-LIMITS-DECISION.md`; the 32 MB warning/36 MB hard byte-property boundaries retain demonstrated margin below the 48 MB failure, no legitimate fixture is excluded, and no user-level tradeoff is identified; renewed master acceptance is pending.
- Exact owner reconciliation: complete in this inventory; the uploadedGeoJson authoring-selector gap has a named current owner and exact intended correction path.
- Generic, conditional, or unresolved production owner: none retained.
- Amendment implementation state: engine unimplemented; UI unimplemented; fidelity not verified.
- Next authorized decision after this commit: master review may authorize the final implementation plan. This document itself does not authorize planning or production implementation.
