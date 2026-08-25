# Static Content Panels Implementation Plan

> The implementation branch is rooted at accepted Step 7 commit `01511bd5a56978965b8dfc8cdbec3b51c2e17e77`. The approved Step 7S discovery commits were transferred as documentation/sketches only. The ownership gate passed before production work began; Slices 1–6 are implemented, their independent implementation review is clean, and the V3 Design master accepted the implemented baseline at `b366ba17fe856aede46ba8301b8a530520e4d2cd` with documentation closure `db63d8e772ce96b17de19b7a89f256a72926d08d`. The accepted implementation remains branch-retained and unmerged.

> **Planning hold for the 2026-08-25 amendment:** Source Content Manager and QMD Reusable Media are specified in docs/superpowers/specs/2026-08-25-source-content-manager-and-qmd-reusable-media-design.md. They are not part of this completed six-slice plan or its 36-row ledger. No implementation plan exists yet; master review and final user approval of the written amendment must precede ownership reconciliation and planning.

**Goal:** Deliver a separate static-content workflow with portable Free text and an enhanced existing Image type, including durable/offline assets and Image-only Present/Audience support.

**Architecture:** Static panels retain dashboard panel identity but reference typed non-CSV sources. A separate four-stage authoring flow creates them. One canonical runtime resolver/renderer serves Build preview, ordinary panels, View, fullscreen, and—only for Image—passive Audience. Authored assets use dedicated IndexedDB storage plus a dashboard manifest and bundle payload.

**Verification policy:** Use the cheapest deterministic check that can falsify each semantic decision, then composition browser tasks, then the five required live journeys. Do not claim implementation from unwired modules/components.

## Preconditions and branch gate

1. V3 Design master marks the design spec, sketch winners, security record, and fidelity matrix Approved or records accepted deviations.
2. Step 7 is accepted at `01511bd5a56978965b8dfc8cdbec3b51c2e17e77`.
3. Use the isolated `codex/static-content-panels-implementation` branch and `C:\Users\hekma\Documents\Projects\SimEx\.worktrees\simex-dashboard-v2\static-content-panels-implementation` worktree created from that exact commit; do not merge or rebase the discovery branch into production.
4. Re-run a narrow baseline check on the final Step 7 commit. Record pre-existing failures; do not inherit `e541914` baseline assumptions blindly.
5. Apply the accepted version trace exactly: dashboard schema v4, export bundle v4, and chart config v3 unless an implementation-proven chart-shape change receives a separate accepted deviation. Cross-reference spec Versions, security SP-15/SP-21, and fidelity PS-02/PS-03 in the same commit.
6. Complete and commit the mandatory post-Step-7 ownership-resolution inventory below. No implementation task, dependency change, test creation or modification, or production edit may start before this gate passes.

Every implementation slice closes its own traceability loop in the same commit: update the slice’s fidelity rows, security decisions, evidence/status, and any deviation record. A passing engine check leaves UI/composition and fidelity status pending until its routed browser task passes.

## Hard gate — post-Step-7 production ownership resolution

**Gate status:** PASS — the committed inventory, 36-row fidelity matrix, and 36-row executable ledger use exact production paths/symbols and exact test files. No feature implementation is part of this gate.

The implementation branch begins with a read-only ownership pass and commits `docs/audits/2026-08-24-v3-static-content-panels/POST-STEP-7-OWNERSHIP-INVENTORY.md` before any production work.

The inventory must identify the final accepted Step 7 commit and replace every generic, conditional, or proposed owner in this plan with exact existing-or-new paths and named functions/boundaries for:

- static wizard/editor route and dashboard mutation entry;
- registry, catalogue filter, typed source resolver, and validation boundaries;
- production stylesheet entry point and every static-content/Build/View/fullscreen/Audience CSS owner;
- dashboard schema migration and invalid Chrono/Scene membership isolation;
- canonical Build/View renderer ownership across `DashboardRenderer.jsx::DashboardRenderer` → `DashboardModeWorkspace.jsx::DashboardModeWorkspace` → `DashboardCanvas.jsx::DashboardCanvas` → `ChartPanel.jsx::ChartPanel` → `ChartView.jsx::ChartView`;
- static creation/edit destination validation and runtime time-filter exclusion;
- Present protocol/channel/runtime and Audience asset-readiness ownership;
- exact unit, integration, and browser test files for all affected fidelity IDs, especially PS-08.

The same inventory commit updates every Fidelity Matrix **Production owner** cell and every execution-ledger **Owning slice/deterministic test** entry. It removes all conditional/generic service names and unresolved owner placeholders. A deterministic scan must fail the gate if any remain.

## Vertical slice 1 — shared static-content contract

### Contract and registry

- **Modify `src/charting/schemas/schemaTypes.js::CHART_SOURCE_KINDS, chartSchema` and `src/charting/schemas/validateChartSchema.js::validateChartSchema`** — add and validate source/capability vocabulary needed for `authoringWorkflow: "static"` without temporal/CSV affordances.
- **Modify `src/charting/schemas/chartSchemaRegistry.js::createChartSchemaRegistry, listChartSchemas, getChartSchema`** — register new `freeText`; retain the single existing `image` key; attach authoring and surface capabilities; increment the registry revision only after behavior is complete.
- **Modify `src/charting/schemas/operationalSchemas.js::operationalSchemas`** — convert Image from one-row manual authoring metadata to typed static source capability while preserving legacy resolution; add no duplicate type.
- **Modify `src/charting/forms/chartCatalogue.js::listChartTypeOptions, schemaRevision`** — expose chart-only and static-only selectors and per-option revision so Add chart excludes both static types and Add static content includes them. `src/charting/forms/schemaRevision.js` is source-profile reconciliation and is not changed for registry revisioning.
- **Modify `src/iconography/iconCatalog.js::CHART_TYPE_GLYPHS`, `src/lib/quorumCatalogue.js::semanticChartType, buildChartCatalogue, buildDashboardContext`, and `scripts/build-quorum-catalogue.mjs`** — add Free-text icon/catalogue output and keep dashboard schema v4 distinct from contained chart config v3.
- **Create `src/static-content/staticSourceSchema.js::normalizeStaticSource, validateStaticSource, validateStaticTextSource, validateStaticImageSource, validateAuthoredAssetManifest`** — validate typed sources, source versions, QMD policy ID, image origin, alt/decorative, crop, rotation, fit, and manifest references.
- **Create `src/static-content/staticSourceResolver.js::resolveStaticSource, resolveStaticTextSource, resolveStaticImageSource`** — resolve typed saved sources to render models and typed failure states before dataset preparation.
- **Create `src/static-content/staticPanelCapabilities.js::getStaticPanelCapabilities, listStaticContentTypeOptions, buildPresentableItemIndex, validateStaticDestination`** — central surface/time/authoring policy: text Build/View/fullscreen; Image additionally Present/Audience; neither temporal/Scene.

### Separate workflow shell

- **Create `src/static-content/forms/staticContentDraft.js::STATIC_CONTENT_STAGES, createStaticContentDraft, reduceStaticContentDraft, finalizeStaticContentDraft, isStaticContentDraftDirty`** — four-stage application-session-only draft state, strict stage-3/stage-4 ownership, dirty Keep/Discard/focus restoration, validation gates, and revision tracking.
- **Create `src/components/static-content/StaticContentWizard.jsx::StaticContentWizard`** — Destination, Content type, Content, Preview & add; reuse shared shell primitives but not chart wizard state.
- **Create `src/components/static-content/StaticContentEditor.jsx::StaticContentEditor` and `src/components/static-content/StaticContentStateBoundary.jsx::StaticContentStateBoundary`** — existing-panel Save/Cancel/recovery plus surface-specific failure actions.
- **Modify `src/components/build/BuildCommandHeader.jsx::BuildCommandHeader` and `src/components/dashboard/DashboardCanvas.jsx::DashboardCanvas`** — expose separate Add chart and Add static content commands in the populated and empty-section states.
- **Modify `src/components/DashboardRenderer.jsx::DashboardRenderer, openChartWizard, openStaticContentWizard, requestBuildSelection, completeBuildReveal, cancelSelectedPanel`** — keep `openChartWizard` chart-only; own static wizard/editor routing through the separate `openStaticContentWizard` function and protect its in-memory draft lifecycle.
- **Modify `src/components/ChartPanel.jsx::ChartPanel` and `src/components/charts/ChartPanelActions.jsx::ChartPanelActions`** — route static Edit in Build and suppress chart-only source/CSV actions for typed static panels.

### Atomic transaction

- **Create `src/static-content/staticPanelTransaction.js::prepareStaticPanelTransaction, commitStaticPanelTransaction, nextStaticSourceRevision`** — build and commit panel+source(+asset manifest) as one dashboard revision; increment content revision only on saved-source change and support failure rollback.
- **Modify `src/lib/dashboardCommitController.js::createSerializedDashboardCommitController` and `src/App.jsx::ensureDashboardCommitController, persistConfiguration, createChart, saveChart, removeChart, cleanupReplacedDashboardAssets`** — accept one prepared static transaction and expose its committed revision without partial intermediate writes.
- **Modify `src/charting/config/dashboardSemanticReferences.js::validateDashboardChartReferences`** — dispatch tabular versus typed-static validation and validate panel→source→asset references.

### Checks

- **Create `tests/staticContentRegistry.test.js`** — exact chart/static catalogue separation, one Image ID, surface capability table.
- **Create `tests/staticSourceSchema.test.js`** — source normalization and invalid cross-field cases.
- **Create `tests/staticContentDraft.test.js`** — exact four-stage model, Image control ownership, dirty Keep/Discard/focus behavior, and the accepted draft-lifetime policy.
- **Create `tests/staticPanelTransaction.test.js`** — failure injection proves old saved revision remains authoritative.
- **Modify `tests/wizardDraftV3.test.js` and `tests/chartWizardProofDeck.test.js`** — assert the existing six chart stages and proof semantics are unchanged.

**Layer gate:** Semantic correctness for FT-01, FT-02, and the transaction engine portion of PS-01. PS-08 cannot complete in slice 1: it requires routed create/edit, import/migration, runtime filter, Present protocol, and Audience integration in slices 4–6. Composition/real-use is not yet complete and must not be reported as the feature.

## Vertical slice 2 — Free-text vertical slice

### Parser and renderer

- **Create `src/static-content/qmd/portableQmdPolicy.js::PORTABLE_QMD_POLICY, validatePortableQmdAst`** — the complete `portable-qmd-v1` feature/protocol/resource table.
- **Create `src/static-content/qmd/parsePortableQmd.js::parsePortableQmd`** — inert AST parse, arbitrary-source acceptance, and resource-complexity accounting.
- **Create `src/static-content/qmd/renderPortableQmd.js::renderPortableQmd`** — safe DOM construction via DOM APIs/text nodes, host-aware headings, panel-scoped IDs, footnotes, callouts, code, tables, inert fallbacks, and restricted trusted math.
- **Create `src/static-content/qmd/compilePortableQmd.js::compilePortableQmd, countPortableQmdFragmentNodes`** — one direct-DOM pipeline and actual generated-node enforcement with no sanitizer/authored HTML parser.
- **Create `src/components/static-content/FreeTextSourceEditor.jsx::FreeTextSourceEditor`** — labelled source editor, 200 ms parse, error list, stale last-valid preview, accessible status.
- **Create `src/components/charts/FreeTextChartView.jsx::FreeTextChartView`** — canonical static render surface with bounded vertical overflow and table/code scrollers.
- **Modify `src/components/charts/ChartView.jsx::ChartView, renderChartContent` and `src/charting/rendering/resolveChartRendering.js::resolveChartRendering`** — resolve and dispatch Free text through the canonical surface; interaction mode affects host chrome only.

### Dependency and styles

- **Modify `package.json` and the lockfile** — add only approved local Markdown/math dependencies after a dependency/security review; pin versions through the project package manager. The user override removes DOMPurify.
- **Create `src/styles/static-content.css`** — own semantic prose, callout, table, code, math, focus, overflow, static failure, active Image, and responsive rules; move existing `.chart-image-*` and `.chart-status-*` rules here from `src/styles.css` in the same slice so ownership is singular.
- **Modify `src/main.jsx`** — import `src/styles/static-content.css` as the isolated static-content stylesheet entry.

### Checks and real journey

- **Create `tests/portableQmdPolicy.test.js`** — one explicit semantic/inert fixture for every feature-table row plus protocol bypasses and limits.
- **Create `tests/portableQmdDomSafety.test.js`** — arbitrary source remains visible/inert; final DOM contains no authored active elements/attributes/resources; actual-node and trusted-math boundaries are enforced.
- **Create `tests/freeTextChartView.test.js`** — semantics, heading offset, accessibility, stale preview, overflow ownership.
- **Create `tests/e2e/static-free-text.spec.js`** — live production create → reload → edit/cancel → edit/save → View → fullscreen; resize to narrow layout; prove Free text absent from Present.

**Layer gate:**

1. Semantic: policy/parser/safe-DOM fixtures pass.
2. Composition: routed editor and canonical renderer pass wide/narrow/overflow browser tasks.
3. Real-use: FT-11 and FT-12 pass against the live production app with persisted state.

## Vertical slice 3 — Image enhancement vertical slice

### Intake, transform, and renderer

- **Create `src/static-content/image/imageAssetValidation.js::validateImageAsset, inspectImageAnimation, validateImageOrigin`** — signature, decoded format/dimensions, single-frame animation metadata, byte/megapixel, URL/path, and quota preflight; explicitly reject APNG and animated WebP.
- **Create `src/static-content/image/imageTransform.js::normalizeImageTransform, rotateImageCrop, nudgeImageCrop, resetImageTransform`** — normalized permille geometry, quarter-turn transform, bounds/clamping, contain/cover model, defaults/reset.
- **Create `src/components/static-content/ImageSourceEditor.jsx::ImageSourceEditor`** — upload/URL/package source, replacement, alt/decorative, typed error recovery.
- **Create `src/components/static-content/ImageTransformEditor.jsx::ImageTransformEditor`** — user-selected guided stage-3 sections with the crop preview immediately above; nondestructive crop, keyboard/numeric alternatives, rotation, fit, Reset image, undoable draft.
- **Modify `src/components/charts/ImageChartView.jsx::ImageChartView, nextImageZoomScale`** — consume the durable source/asset resolver, apply saved transforms, provide bounded transient zoom/pan/Reset view, stable loading/failure UI, and active/passive modes.
- **Modify `src/components/charts/ChartView.jsx::ChartView, renderChartContent, withPlaybackTimeContext` and `src/charting/rendering/resolveChartRendering.js::resolveChartRendering`** — pass surface interaction mode and resolve typed static Image before dataset/time processing without changing its type ID.
- **Modify `src/charting/data/prepareOperationalData.js::prepareOperationalData` and `src/charting/rendering/operationalAdapter.js::buildOperationalRenderModel`** — retain inline-row Image only as a bounded legacy migration adapter; typed static Image never depends on it.

### Checks and real journey

- **Create `tests/imageAssetValidation.test.js`** — accepted single-frame PNG/JPEG/WebP, spoofing, corruption, APNG, animated WebP, limits, path/protocol, and quota classifications.
- **Create `tests/imageTransform.test.js`** — boundary/property cases for crop and rotations; hash/original invariance belongs in asset integration.
- **Create `tests/imageChartView.test.js` and modify `tests/chartViewV3.test.js`** — saved vs transient state, zoom/pan bounds, reset names, alt/decorative, stable failures, and live canonical dispatch.
- **Create `tests/e2e/static-image.spec.js`** — live production guided-section upload → create → reload → edit crop/rotation/alt → cancel → save → View → reveal actions by hover/focus/touch → fullscreen, including keyboard-only crop and a forced failure.

**Layer gate:** IM-01 through IM-14 pass at their designated semantic/composition/real-use layers. Do not claim Image enhancement from the transform engine or editor in isolation.

## Vertical slice 4 — persistence, export, and import

### Durable authored assets

- **Create `src/static-content/assets/browserAuthoredAssetStore.js::createBrowserAuthoredAssetStore, stageAuthoredAsset, commitAuthoredAsset, readAuthoredAsset, createObjectUrlLease`** — dedicated IndexedDB authority for staged/durable assets, hashes, byte reads, per-window object-URL lifecycle, and quota classification.
- **Create `src/static-content/assets/assetReferenceGraph.js::buildAssetReferenceGraph, findAuthoredAssetOrphans`** — references across saved manifest, current-session draft, undo, and transaction/import staging; the journal stores transaction/orphan-cleanup facts only and cannot reconstruct an unsaved draft.
- **Create `src/static-content/assets/reconcileAuthoredAssets.js::reconcileAuthoredAssets`** — post-commit/startup reconciliation with a 24-hour staging grace and no referenced deletion.
- **Modify `src/lib/loadDashboard.js::normalizeDashboardSource, validateDashboardSourceDescriptors, validateDataSourceDescriptor, loadDashboardConfig, loadDashboardConfigProgressively`** — migrate before validation, admit typed static sources without dataset providers/profiling, and expose panel-scoped missing/corrupt states.
- **Leave `src/lib/browserStorage.js` unchanged** — binary assets and static drafts never enter localStorage; new IndexedDB code may follow its quota naming conventions without making it an owner.

### Dashboard schema and migration

- **Modify `src/charting/config/dashboardConfigStructure.js::DASHBOARD_CONFIG_STRUCTURE, validateDashboardStructure`** — dashboard schema v4 typed sources and strict asset manifest.
- **Create `src/charting/config/migrateDashboardV3ToV4.js::migrateDashboardV3ToV4, isolateStaticTemporalMembership`** — deterministic/idempotent legacy Image migration plus invalid static Chrono/Scene isolation without fabricated temporal metadata.
- **Modify `src/charting/config/dashboardBundleV3.js::normalizeDashboardBoundary, validateSource, validateDashboardConfig, normalizeStoredDashboardConfig, serializeDashboardBundle, parseDashboardBundle`** — retain this file as the sole canonical boundary while separating dashboard schema v4, export bundle v4, and contained chart config v3; invoke migration from `normalizeDashboardBoundary`.
- **Modify `src/charting/time/chronoGroupModel.js::validateChronoGroups, validateMemberEligibility` only for central static rejection; retain `src/charting/time/sceneSchema.js::validateScene, validatePresent` unchanged with regression tests.**
- **Modify `src/lib/dashboardPackageCandidate.js::parseDashboardPackageCandidate` and `src/lib/dashboardPackageExport.js::prepareDashboardPackageExport`** — preflight payloads, hashes, asset/network dependencies, and reject missing/corrupt local bytes.
- **Modify `src/lib/dashboardPackageImportTransaction.js::commitDashboardPackageImport` and `src/App.jsx::inspectImportPackage, confirmImportPackage, exportConfig`** — validate and stage all assets before one dashboard replacement and roll back staged bytes on any invalid/quota condition.

### Offline package

- **Modify `scripts/promote-dashboard-bundle.mjs::preparePromotedDashboard, promoteDashboardBundle, assertWithinPublicDirectory`** — materialize bundle-v4 local Image payloads under safe generated public paths with manifest/hash integrity.
- **Modify `scripts/build-portable-data.mjs::buildPortableData`** — include referenced authored assets under safe generated paths.
- **Modify `scripts/package-flashdrive.mjs::Get-ContentType`** — serve/copy PNG/JPEG/WebP correctly and preserve path containment.
- **Modify the `README.md` package section and generated `START_HERE.md` text** — describe embedded local assets and explicitly linked network dependencies.

### Checks

- **Create `tests/browserAuthoredAssetStore.test.js`** — staging/durable lifecycle, hashing/dedup, quota classification, object URL cleanup.
- **Create `tests/dashboardMigrationV4.test.js`** — all legacy Image cases and idempotence.
- **Modify `tests/dashboardBundleV3.test.js`** — dashboard-v4/bundle-v4/chart-v3 round trip, missing/corrupt payload, linked dependency, and reference integrity.
- **Modify `tests/dashboardPackageCandidate.test.js` and `tests/dashboardPackageImportTransaction.test.js`** — preflight and atomic import failures.
- **Create `tests/authoredAssetCleanup.test.js`** — exact reference/grace decisions once; no redundant second checker unless anomalous.
- **Create `tests/staticContentPortablePackage.test.js` and `tests/e2e/static-content-portability.spec.js`** — build/serve offline, import/open local images, and exercise main/fullscreen/Audience with network disabled.

**Layer gate:** PS-02 through PS-05 pass; export/import proof includes a reload in a cleared browser state, not only object equality.

## Vertical slice 5 — live Build/View fidelity

- **Modify the canonical chain `src/components/DashboardRenderer.jsx::DashboardRenderer` → `src/components/dashboard/DashboardModeWorkspace.jsx::DashboardModeWorkspace` → `src/components/dashboard/DashboardCanvas.jsx::DashboardCanvas` → `src/components/ChartPanel.jsx::ChartPanel` → `src/components/charts/ChartView.jsx::ChartView, renderChartContent`** — route one saved static render model through Build and View, with Build-only authoring actions and panel-scoped recovery.
- **Modify `src/components/display/DisplayedChartGrid.jsx::DisplayedChartGrid, findChart` and `src/components/FullscreenDisplay.jsx::FullscreenDisplay`** — canonical fullscreen rendering with active Image viewer and Free-text scrolling.
- **Modify `src/components/build/BuildWorkspace.jsx::BuildWorkspace`, `src/components/build/buildCanvasRestoration.js::captureBuildCanvasState, restoreBuildCanvasState`, and `src/components/build/UnitOrbit.jsx::UnitOrbit, revealUnitOrbitAnchor`** — preserve selection, scroll, focus, target clearance, and reversible transient compression around static editing.
- **Modify CSS only in the assigned owners:** `src/styles/modes.css` for Build/View host geometry and transient compression; `src/styles/immersive-display.css` for fullscreen host geometry; `src/styles/dashboard-style-grammar.css` for selected-theme projection; `src/styles/static-content.css` for static content and actions.
- **Create `tests/staticPanelComposition.test.js`** — Build/View saved composition equality, overflow owners, surface capability mapping.
- **Extend `tests/e2e/static-free-text.spec.js` and `tests/e2e/static-image.spec.js`** — material 1440×900, 1024×768, 768×900 states and fullscreen.

**Layer gate:** PS-06 and PS-07 pass. Evidence must show real routed Build and View, not a prototype URL.

## Vertical slice 6 — Present/Audience compatibility

- **Modify `src/components/presentation/PresentWorkspace.jsx::configuredChartGroups, toggleChart, presentationState` and `src/static-content/staticPanelCapabilities.js::buildPresentableItemIndex`** — list saved Image panels as direct non-temporal selectable items; never list Free text.
- **Modify `src/components/DashboardRenderer.jsx::presentationValidChartIds` and `src/components/presentation/usePresentationRuntime.js::usePresentationRuntime, publish, open`** — replace the untyped panel-ID set with the trusted presentable-item index and project ordered descriptors before publishing.
- **Modify `src/lib/presentationProtocol.js::PRESENTATION_PROTOCOL_VERSION, makePresentationMessage, parsePresentationMessage, validatePresentationState`** — protocol v3 accepts ordered chart descriptors and `{ kind: "image", panel_id, source_id, revision }` only; reject Free text, URLs, blobs, crop, and temporal fields.
- **Modify `src/lib/presentationChannel.js::createPresentationControllerChannel, createPresentationAudienceChannel`** — preserve and revalidate the exact identity/revision snapshot during replay/reconnect.
- **Modify `src/App.jsx::App` audience-channel effect/Audience branch, `src/components/presentation/AudienceDisplay.jsx::AudienceDisplay`, and `src/components/display/DisplayedChartGrid.jsx::DisplayedChartGrid, findChart`** — derive the same trusted index, resolve Image per cell, keep failures isolated, and make Audience passive.
- **Create `src/components/presentation/useAudienceStaticAssetReadiness.js::useAudienceStaticAssetReadiness`** — own Image revision readiness without treating Image as temporal. `AudienceSnapshotMonitor.jsx` remains only a capture consumer.
- **Modify `src/styles/presentation.css`** — own bounded passive Audience Image loading/failure/fit geometry; contain no Free-text Audience selectors.
- **Keep `src/charting/time/sceneSchema.js::validateScene, validatePresent` unchanged** — add a regression test rather than weakening Scene invariants.
- **Modify `src/static-content/staticPanelCapabilities.js::validateStaticDestination`, `src/charting/time/chronoGroupModel.js::validateChronoGroups, validateMemberEligibility`, and `src/components/build/BuildWorkspace.jsx::temporalAuthoringCharts, mergeChronoGroup, sceneEligibleCharts`** — reject/filter static Chrono and Scene destinations during create/edit/import authoring paths.
- **Modify `src/components/charts/ChartView.jsx::withPlaybackTimeContext`, `src/charting/rendering/resolveChartRendering.js::resolveChartRendering`, and `src/static-content/staticSourceResolver.js::resolveStaticSource`** — prove typed static sources receive no time context and never enter `prepareChartData.js::prepareChartData` or `applyTimeContext.js::applyTimeContext`.

### Checks and live journey

- **Modify `tests/presentationProtocol.test.js` and `tests/presentationChannel.test.js`** — accept Image identity/revision, reject Free text/blob URL, reconnect snapshot.
- **Modify `tests/audienceDisplay.test.js`** — passive transform, no controls, separate-window resolver, isolated failure.
- **Create `tests/staticTemporalBoundary.test.js` and `tests/staticSourceResolver.test.js`; modify `tests/dashboardMigrationV4.test.js`, `tests/chronoGroupModelV3.test.js`, `tests/sceneSchema.test.js`, `tests/presentationProtocol.test.js`, and `tests/presentWorkspace.test.js`** — creation/edit/import/migration reject or isolate membership, live production imports and uses the static resolver, and static sources receive no time filters.
- **Create `tests/e2e/static-image-audience.spec.js`** — live production Image + temporal chart selection, separate 16:9 Audience, chart time change with unchanged Image, forced image failure with continuing chart.

**Layer gate:** IM-15, IM-16, FT-12, and PS-08 pass. This is the required Present/Audience production integration proof; an unwired Audience component does not count.

## Final evidence set

Capture only evidence that changes acceptance decisions:

- deterministic test output mapped to Semantic matrix rows;
- browser screenshots/recordings at material responsive, loading, error, passive, and fullscreen states mapped to Composition rows;
- five live journeys mapped to Real-use rows: Free-text full lifecycle, Free-text Present exclusion, Image full lifecycle, Image Present/Audience, and Audience asset failure isolation;
- portable offline export/import journey with local assets and separate Audience window;
- updated fidelity matrix statuses and deviations.

## Executable 36-row fidelity ledger

This ledger is binding with the fidelity matrix. “Retained browser task” means the named task cannot be silently collapsed into a broader smoke test. Any replacement is a proposed deviation and requires approval before changing the matrix.

| ID | Owning slice | Deterministic test | Retained browser task / proposed replacement | Material viewport / state | Required evidence | Engine status | UI / composition status | Fidelity status |
|---|---|---|---|---|---|---|---|---|
| FT-01 | `src/static-content/forms/staticContentDraft.js::STATIC_CONTENT_STAGES, reduceStaticContentDraft`; `src/components/static-content/StaticContentWizard.jsx::StaticContentWizard`; `src/components/build/BuildCommandHeader.jsx::BuildCommandHeader`; `src/components/DashboardRenderer.jsx::openChartWizard, openStaticContentWizard` | `tests/wizardDraftV3.test.js`; `tests/chartWizardProofDeck.test.js`; `tests/buildCommandHeader.test.js`; `tests/staticContentDraft.test.js` | Traverse Add chart; traverse Image Content → passive Preview; dirty Keep then Discard | 1440×900, 1024×768; stages 3/4; dirty modal | Stage DOM/control inventory + interaction result | Passing | Passing | Passing |
| FT-02 | `src/charting/schemas/chartSchemaRegistry.js::createChartSchemaRegistry`; `src/charting/forms/chartCatalogue.js::listChartTypeOptions`; `src/static-content/staticPanelCapabilities.js::listStaticContentTypeOptions` | `tests/chartSchemasV3.test.js`; `tests/chartCatalogueSelection.test.js`; `tests/iconSystem.test.js`; `tests/quorumCatalogueV2.test.js`; `tests/staticContentRegistry.test.js` | Compare Add chart and Add static content type lists | Desktop; empty/populated registry | Type-list reading | Passing | Passing | Passing |
| FT-03 | `src/static-content/qmd/portableQmdPolicy.js::PORTABLE_QMD_POLICY, validatePortableQmdAst`; `src/static-content/qmd/parsePortableQmd.js::parsePortableQmd` | `tests/portableQmdPolicy.test.js`; `tests/portableQmdDomSafety.test.js`; `tests/staticContentDraft.test.js` | Paste semantic/arbitrary/over-limit corpus; inspect inert DOM and limit errors | Semantic, inert, limits | Validation and DOM reading | Passing | Passing | Passing |
| FT-04 | `src/static-content/qmd/renderPortableQmd.js::renderPortableQmd`; `src/static-content/qmd/compilePortableQmd.js::compilePortableQmd` | `tests/portableQmdPolicy.test.js`; `tests/portableQmdDomSafety.test.js`; `tests/staticContentDraft.test.js` | Paste script/iframe/widget/media payloads, Save, inspect no active DOM/resources | Main app; offline; legacy import | DOM + network/resource evidence | Passing | Passing | Passing |
| FT-05 | `src/static-content/qmd/portableQmdPolicy.js::validatePortableHref`; `src/static-content/qmd/renderPortableQmd.js::renderPortableQmd` | `tests/portableQmdPolicy.test.js`; `tests/portableQmdDomSafety.test.js`; `tests/staticContentDraft.test.js` | Activate safe links; prove unsafe destinations remain text | View/fullscreen; online/offline | Link DOM + navigation result | Passing | Passing | Passing |
| FT-06 | `src/static-content/qmd/portableQmdPolicy.js::validatePortableQmdAst`; `src/static-content/qmd/compilePortableQmd.js::countPortableQmdFragmentNodes`; `src/static-content/forms/staticContentDraft.js::reduceStaticContentDraft` | `tests/portableQmdPolicy.test.js`; `tests/portableQmdDomSafety.test.js`; `tests/staticContentDraft.test.js` | Exceed each limit and verify current-session draft survives | Create/edit; each boundary | Error/status + retained source | Passing | Passing | Passing |
| FT-07 | `src/static-content/forms/staticContentDraft.js::reduceStaticContentDraft`; `src/components/static-content/FreeTextSourceEditor.jsx::FreeTextSourceEditor` | `tests/staticContentDraft.test.js`; `tests/freeTextChartView.test.js`; `tests/chartViewV3.test.js`; `tests/v3RuntimeBoundaries.test.js` | Type; resize wide↔narrow; switch tabs; continue at same context | 1440×900, 1024×768, 768×900; valid/error | Geometry + focus + source reading | Passing | Passing | Passing |
| FT-08 | `src/static-content/forms/staticContentDraft.js::reduceStaticContentDraft`; `src/components/static-content/FreeTextSourceEditor.jsx::FreeTextSourceEditor`; `src/static-content/qmd/compilePortableQmd.js::compilePortableQmd` | `tests/staticContentDraft.test.js`; `tests/freeTextChartView.test.js`; `tests/chartViewV3.test.js`; `tests/v3RuntimeBoundaries.test.js` | Valid → arbitrary inert syntax accepted → complexity breach keeps stale preview → correction | Wide/narrow; inert/blocked/recovered | Preview text/revision + disabled-state reading | Passing | Passing | Passing |
| FT-09 | `src/components/charts/FreeTextChartView.jsx::FreeTextChartView`; `src/components/charts/ChartView.jsx::renderChartContent`; `src/components/FullscreenDisplay.jsx::FullscreenDisplay` | `tests/staticContentDraft.test.js`; `tests/freeTextChartView.test.js`; `tests/chartViewV3.test.js`; `tests/v3RuntimeBoundaries.test.js` | Long token, wide table, tall prose; keyboard-scroll each region | Small cell; fullscreen; 320/768/1440 | Geometry/scroll-owner reading | Passing | Passing | Passing |
| FT-10 | `src/static-content/qmd/renderPortableQmd.js::renderPortableQmd`; `src/components/charts/FreeTextChartView.jsx::FreeTextChartView` | `tests/staticContentDraft.test.js`; `tests/freeTextChartView.test.js`; `tests/chartViewV3.test.js`; `tests/v3RuntimeBoundaries.test.js` | Keyboard/screen-reader-landmark traversal of full corpus | Preview, View, fullscreen | DOM/accessible tree + focus result | Passing | Passing | Passing |
| FT-11 | `src/static-content/staticPanelTransaction.js::commitStaticPanelTransaction`; `src/components/DashboardRenderer.jsx::prepareToLeaveBuild`; `src/components/charts/FreeTextChartView.jsx::FreeTextChartView`; `src/components/FullscreenDisplay.jsx::FullscreenDisplay` | `tests/staticPanelTransaction.test.js`; `tests/buildDirtyState.test.js`; `tests/buildAuthoringExitProtection.test.js`; `tests/fullscreenDisplay.test.js` | Create → reload saved → Keep → Discard → save → View → fullscreen | 1440×900, 768×900; dirty/narrow/error | Saved revision + screenshots/interactions | Passing | Passing | Passing |
| FT-12 | `src/static-content/staticPanelCapabilities.js::buildPresentableItemIndex`; `src/components/presentation/PresentWorkspace.jsx::configuredChartGroups`; `src/lib/presentationProtocol.js::validatePresentationState` | `tests/presentWorkspace.test.js`; `tests/presentationProtocol.test.js`; `tests/audienceDisplay.test.js` | Create text; verify Present absence; inject stale message | Present + separate Audience | Selector/DOM/protocol result | Passing | Passing | Passing |
| IM-01 | `src/charting/schemas/chartSchemaRegistry.js::createChartSchemaRegistry`; `src/charting/schemas/validateChartSchema.js::validateChartSchema`; `src/static-content/staticPanelCapabilities.js::getStaticPanelCapabilities` | `tests/chartSchemasV3.test.js`; `tests/chartCatalogueSelection.test.js`; `tests/iconSystem.test.js`; `tests/quorumCatalogueV2.test.js`; `tests/staticContentRegistry.test.js` | Open existing Image and new static Image flow | Migrated/new dashboard | Type identity/route result | Passing | Passing | Passing |
| IM-02 | `src/static-content/image/imageAssetValidation.js::validateImageAsset, inspectImageAnimation, validateImageOrigin` | `tests/imageAssetValidation.test.js` | Upload accepted formats plus every named failure class | Create/replace; quota-near; animation | Validation categories + decode result | Passing | Passing | Passing |
| IM-03 | `src/static-content/assets/browserAuthoredAssetStore.js::stageAuthoredAsset, commitAuthoredAsset, readAuthoredAsset`; `src/static-content/staticPanelTransaction.js::commitStaticPanelTransaction`; `src/static-content/staticSourceResolver.js::resolveStaticImageSource` | `tests/browserAuthoredAssetStore.test.js`; `tests/staticSourceSchema.test.js`; `tests/dashboardPackageExport.test.js`; `tests/dashboardBundleV3.test.js` | Upload; remove original; reload; render two references | Main + separate Audience | Hash/reference + rendered output | Passing | Passing | Passing |
| IM-04 | `src/static-content/image/imageAssetValidation.js::validateImageOrigin`; `src/static-content/staticSourceSchema.js::validateStaticImageSource`; `src/lib/dashboardPackageExport.js::prepareDashboardPackageExport` | `tests/browserAuthoredAssetStore.test.js`; `tests/staticSourceSchema.test.js`; `tests/dashboardPackageExport.test.js`; `tests/dashboardBundleV3.test.js` | Enter safe/unsafe origins; inspect export preflight | Online/offline; import/package | Validation/preflight reading | Passing | Passing | Passing |
| IM-05 | `src/static-content/staticSourceSchema.js::validateStaticImageSource`; `src/components/charts/ImageChartView.jsx::ImageChartView`; `src/components/presentation/AudienceDisplay.jsx::AudienceDisplay` | `tests/staticSourceSchema.test.js`; `tests/imageChartView.test.js`; `tests/audienceDisplay.test.js` | Toggle, save, inspect View and Audience semantics | Create/edit; View; Audience | DOM/accessible tree | Passing | Passing | Passing |
| IM-06 | `src/static-content/image/imageTransform.js::normalizeImageTransform, rotateImageCrop, nudgeImageCrop` | `tests/imageTransform.test.js` | Rotate, nudge, resize, reload, compare crop | Landscape/portrait/square; edge/min | Geometry reading + screenshot | Passing | Passing | Passing |
| IM-07 | `src/static-content/image/imageTransform.js::normalizeImageTransform`; `src/static-content/assets/browserAuthoredAssetStore.js::readAuthoredAsset`; `src/lib/dashboardPackageExport.js::prepareDashboardPackageExport` | `tests/browserAuthoredAssetStore.test.js`; `tests/staticSourceSchema.test.js`; `tests/dashboardPackageExport.test.js`; `tests/dashboardBundleV3.test.js` | Transform, reset, export/import, compare | Create/edit/import | Hash + visible transform | Passing | Passing | Passing |
| IM-08 | `src/components/static-content/ImageTransformEditor.jsx::ImageTransformEditor`; `src/static-content/forms/staticContentDraft.js::reduceStaticContentDraft`; `src/static-content/image/imageTransform.js::nudgeImageCrop` | `tests/staticContentDraft.test.js`; `tests/imageTransform.test.js` | Traverse selected B; complete crop keyboard-only then pointer | 1440×900, 1024×768; 200% zoom | Section/focus/action/geometry evidence | Passing | Passing | Passing |
| IM-09 | `src/components/charts/ImageChartView.jsx::ImageChartView`; `src/static-content/staticPanelTransaction.js::nextStaticSourceRevision` | `tests/imageChartView.test.js`; `tests/fullscreenDisplay.test.js`; `tests/staticPanelComposition.test.js` | View zoom/pan → reopen → edit saved crop | View/fullscreen/edit/reload | Source revision + viewer reading | Passing | Passing | Passing |
| IM-10 | `src/components/charts/ImageChartView.jsx::ImageChartView, nextImageZoomScale`; `src/components/FullscreenDisplay.jsx::FullscreenDisplay` | `tests/imageChartView.test.js`; `tests/fullscreenDisplay.test.js`; `tests/staticPanelComposition.test.js` | Confirm absent at rest; reveal/exercise by hover, keyboard focus, touch; fullscreen repeat | Small cell; fullscreen; pointer; keyboard; touch; fit modes | Visibility + focus + interaction + geometry | Passing | Passing | Passing |
| IM-11 | `src/static-content/forms/staticContentDraft.js::reduceStaticContentDraft`; `src/static-content/staticPanelTransaction.js::nextStaticSourceRevision` | `tests/staticContentDraft.test.js`; `tests/imageTransform.test.js` | Replace landscape→portrait; undo; replace/save/reload | Edit; dirty cancel; failure | Revision + transform/alt reading | Passing | Passing | Passing |
| IM-12 | `src/static-content/image/imageTransform.js::resetImageTransform`; `src/static-content/forms/staticContentDraft.js::reduceStaticContentDraft` | `tests/staticContentDraft.test.js`; `tests/imageTransform.test.js` | Transform/reset/cancel; repeat/save | Create/edit; alt/decorative | State/hash + preview | Passing | Passing | Passing |
| IM-13 | `src/components/static-content/StaticContentStateBoundary.jsx::StaticContentStateBoundary`; `src/components/charts/ImageChartView.jsx::ImageChartView`; `src/components/presentation/AudienceDisplay.jsx::AudienceDisplay` | `tests/imageChartView.test.js`; `tests/audienceDisplay.test.js`; `tests/staticPanelComposition.test.js` | Force failure in Build, ordinary View, fullscreen, Audience; inspect inventories; Retry fullscreen | Small cell; fullscreen; 16:9; offline | Exact actions + fullscreen retry + sibling render | Passing | Passing | Passing |
| IM-14 | `src/components/static-content/StaticContentWizard.jsx::StaticContentWizard`; `src/components/static-content/StaticContentEditor.jsx::StaticContentEditor`; `src/static-content/forms/staticContentDraft.js::reduceStaticContentDraft`; `src/static-content/staticPanelTransaction.js::commitStaticPanelTransaction` | `tests/staticContentDraft.test.js`; `tests/staticPanelTransaction.test.js`; `tests/buildAuthoringExitProtection.test.js`; `tests/fullscreenDisplay.test.js` | Traverse B; change source/replacement, alt/decorative, fit/focus, crop/rotation → Keep all → Discard/restore all/stage/render/focus → add/reload/edit/save/View/reveal/fullscreen | 1440×900, 768×900; stages 3/4; portrait/landscape | Field/state/focus readings + saved revision + screenshots | Passing | Passing | Passing |
| IM-15 | `src/components/presentation/PresentWorkspace.jsx::presentationState`; `src/lib/presentationProtocol.js::makePresentationMessage`; `src/static-content/staticSourceResolver.js::resolveStaticImageSource`; `src/components/presentation/AudienceDisplay.jsx::AudienceDisplay` | `tests/presentWorkspace.test.js`; `tests/presentationProtocol.test.js`; `tests/presentationChannel.test.js`; `tests/audienceDisplay.test.js`; `tests/staticSourceResolver.test.js` | Select Image+chart; open Audience; change chart time | 1920×1080, 1366×768; separate window | Protocol reading + before/after render | Passing | Passing | Passing |
| IM-16 | `src/components/presentation/useAudienceStaticAssetReadiness.js::useAudienceStaticAssetReadiness`; `src/components/presentation/AudienceDisplay.jsx::AudienceDisplay`; `src/components/display/DisplayedChartGrid.jsx::DisplayedChartGrid` | `tests/audienceDisplay.test.js` | Break asset; advance chart time | 16:9; 1/2/4-cell layouts | Sibling DOM/time + failure screenshot | Passing | Passing | Passing |
| PS-01 | `src/static-content/staticPanelTransaction.js::prepareStaticPanelTransaction, commitStaticPanelTransaction`; `src/lib/dashboardCommitController.js::createSerializedDashboardCommitController`; `src/App.jsx::persistConfiguration`; `src/components/build/buildDirtyState.js::activeLocalAuthoringDrafts` | `tests/staticPanelTransaction.test.js`; `tests/browserAuthoredAssetStore.test.js`; `tests/buildDirtyState.test.js`; `tests/chartDraftSession.test.js`; `tests/dashboardAppV3.test.js` | Fail save; retry/cancel in-session; reload only the unchanged saved panel | Create/edit/replace; quota/storage; reload | Revision/reference/staging evidence + no unsaved draft in storage | Passing | Passing | Passing |
| PS-02 | `src/charting/config/migrateDashboardV3ToV4.js::migrateDashboardV3ToV4, isolateStaticTemporalMembership`; `src/charting/config/dashboardBundleV3.js::normalizeDashboardBoundary`; `src/charting/time/chronoGroupModel.js::validateMemberEligibility` | `tests/dashboardBundleV3.test.js`; `tests/dashboardAssetPersistence.test.js`; `tests/dashboardMigrationV4.test.js`; `tests/staticTemporalBoundary.test.js`; `tests/sceneSchema.test.js` | Import/open every legacy Image origin/fit/alt/membership case and inspect exact dashboard/chart versions | Legacy valid/malformed; invalid temporal membership | Dashboard v4 + chart-config-v3 + migration/recovery reading | Passing | Passing | Passing |
| PS-03 | `src/charting/config/dashboardBundleV3.js::serializeDashboardBundle, parseDashboardBundle`; `src/lib/dashboardPackageExport.js::prepareDashboardPackageExport`; `src/lib/dashboardPackageCandidate.js::parseDashboardPackageCandidate`; `src/lib/dashboardPackageImportTransaction.js::commitDashboardPackageImport` | `tests/dashboardBundleV3.test.js`; `tests/dashboardPackageCandidate.test.js`; `tests/dashboardPackageExport.test.js`; `tests/dashboardPackageImportTransaction.test.js`; `tests/dashboardAppV3.test.js` | Export mixed dashboard; clear state; import; inspect exact versions and surfaces | Online/offline; quota/corrupt | Bundle-v4/chart-v3/hash + rendered output | Passing | Passing | Passing |
| PS-04 | `scripts/promote-dashboard-bundle.mjs::preparePromotedDashboard, promoteDashboardBundle, assertWithinPublicDirectory`; `scripts/build-portable-data.mjs::buildPortableData`; `scripts/package-flashdrive.mjs::Get-ContentType` | `tests/datasetProfilesV3.test.js`; `tests/staticContentPortablePackage.test.js` | Serve package offline; open main and Audience | Windows portable server; 16:9 | Package listing + network/render evidence | Passing | Passing | Passing |
| PS-05 | `src/static-content/assets/assetReferenceGraph.js::buildAssetReferenceGraph, findAuthoredAssetOrphans`; `src/static-content/assets/reconcileAuthoredAssets.js::reconcileAuthoredAssets`; `src/static-content/assets/browserAuthoredAssetStore.js::commitAuthoredAsset` | `tests/authoredAssetCleanup.test.js`; `tests/browserAuthoredAssetStore.test.js` | Replace/delete/cancel/import-fail; reload; inspect inventory | Normal; quota warning; interrupted | Asset inventory/reference reading | Passing | Passing | Passing |
| PS-06 | `src/components/DashboardRenderer.jsx::DashboardRenderer`; `src/components/dashboard/DashboardModeWorkspace.jsx::DashboardModeWorkspace`; `src/components/dashboard/DashboardCanvas.jsx::DashboardCanvas`; `src/components/build/buildCanvasRestoration.js::captureBuildCanvasState, restoreBuildCanvasState` | `tests/staticPanelComposition.test.js`; `tests/buildWorkspaceV3.test.js`; `tests/dashboardGeometryContract.test.js`; `tests/buildAuthoringExitProtection.test.js` | Save; toggle modes; open/close editor; verify placement/selection/focus/scroll | 1440×900, 1024×768; dense; open/closed | Config + geometry/focus/scroll reading | Passing | Passing | Passing |
| PS-07 | `src/components/charts/ChartView.jsx::renderChartContent`; `src/components/charts/ImageChartView.jsx::ImageChartView`; `src/components/charts/FreeTextChartView.jsx::FreeTextChartView`; `src/components/FullscreenDisplay.jsx::FullscreenDisplay`; `src/components/presentation/AudienceDisplay.jsx::AudienceDisplay` | `tests/imageChartView.test.js`; `tests/freeTextChartView.test.js`; `tests/fullscreenDisplay.test.js`; `tests/audienceDisplay.test.js` | Open both fullscreen; reveal/exercise Image actions by all inputs; inspect Audience | Fullscreen; pointer; keyboard; touch; 16:9 | Control inventory + interaction | Passing | Passing | Passing |
| PS-08 | `src/static-content/staticPanelCapabilities.js::validateStaticDestination`; `src/charting/config/migrateDashboardV3ToV4.js::isolateStaticTemporalMembership`; `src/charting/time/chronoGroupModel.js::validateMemberEligibility`; `src/components/charts/ChartView.jsx::withPlaybackTimeContext`; `src/lib/presentationProtocol.js::validatePresentationState` | `tests/staticTemporalBoundary.test.js`; `tests/dashboardMigrationV4.test.js`; `tests/chronoGroupModelV3.test.js`; `tests/sceneSchema.test.js`; `tests/presentationProtocol.test.js`; `tests/presentWorkspace.test.js` | Create/edit inspect; invalid import; Image+chart Present; change clock | Build; import recovery; Present/Audience | Validator/protocol/time/render evidence | Passing | Passing | Passing |

No ledger row may change Fidelity status to Passing until its engine and UI/composition statuses are Passing and its retained browser task has produced the required evidence. The only exception is a user-approved deviation recorded in both this ledger and the fidelity matrix.

## Historical production hold before Step 7 acceptance

This hold applied before the ownership gate passed and remains provenance for the discovery branch. The highest-overlap files are listed separately in `docs/audits/2026-08-24-v3-static-content-panels/STEP-7-WAIT-LIST.md`. Production implementation was completed only on `codex/static-content-panels-implementation`; the discovery branch remains documentation/sketch provenance.
