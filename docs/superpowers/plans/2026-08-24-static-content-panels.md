# Static Content Panels Implementation Plan

> Execute only from the final accepted Step 7 commit after V3 Design master approval. This Step 7S branch is a planning branch and must not be merged as production implementation.

**Goal:** Deliver a separate static-content workflow with portable Free text and an enhanced existing Image type, including durable/offline assets and Image-only Present/Audience support.

**Architecture:** Static panels retain dashboard panel identity but reference typed non-CSV sources. A separate four-stage authoring flow creates them. One canonical runtime resolver/renderer serves Build preview, ordinary panels, View, fullscreen, and—only for Image—passive Audience. Authored assets use dedicated IndexedDB storage plus a dashboard manifest and bundle payload.

**Verification policy:** Use the cheapest deterministic check that can falsify each semantic decision, then composition browser tasks, then the five required live journeys. Do not claim implementation from unwired modules/components.

## Preconditions and branch gate

1. V3 Design master marks the design spec, sketch winners, security record, and fidelity matrix Approved or records accepted deviations.
2. Step 7 is accepted and its final commit is identified.
3. Create a fresh implementation worktree/branch from that exact final commit; do not rebase this discovery branch into production.
4. Re-run a narrow baseline check on the final Step 7 commit. Record pre-existing failures; do not inherit `e541914` baseline assumptions blindly.
5. Confirm dependency/versioning choice before changing manifests: recommended approach is explicit dashboard schema v4 + bundle v4, with chart config remaining v3 unless a chart-shape change is proven necessary.

## Vertical slice 1 — shared static-content contract

### Contract and registry

- **Modify `src/charting/schemas/schemaTypes.js`** — add source/capability vocabulary needed for `authoringWorkflow: "static"` without temporal/CSV affordances.
- **Modify `src/charting/schemas/chartSchemaRegistry.js`** — register new `freeText`; retain the single existing `image` key; attach authoring and surface capabilities.
- **Modify `src/charting/schemas/operationalSchemas.js`** — convert Image from one-row manual authoring metadata to typed static source capability while preserving legacy resolution; add no duplicate type.
- **Modify `src/charting/forms/chartCatalogue.js`** — expose chart-only and static-only selectors so Add chart excludes both static types and Add static content includes them.
- **Modify `src/charting/forms/schemaRevision.js` and generated catalogue/revision artifacts** — increment registry revision only after registry behavior is complete.
- **Create `src/static-content/staticSourceSchema.js`** — normalize/validate `staticText` and `staticImage`, source versions, QMD policy ID, image origin, alt/decorative, crop, rotation, and fit.
- **Create `src/static-content/staticSourceResolver.js`** — resolve typed saved sources to render models and typed failure states; do not model them as CSV rows.
- **Create `src/static-content/staticPanelCapabilities.js`** — central surface/time/authoring policy: text Build/View/fullscreen; Image additionally Present/Audience; neither temporal/Scene.

### Separate workflow shell

- **Create `src/static-content/forms/staticContentDraft.js`** — four-stage state, type-specific drafts, dirty/recovery state, validation gates, and revision tracking.
- **Create `src/components/static-content/StaticContentWizard.jsx`** — Destination, Content type, Content, Preview & add; reuse shared shell primitives but not chart wizard state.
- **Create `src/components/static-content/StaticContentEditor.jsx`** — existing-panel editor for content/source fields with Save/Cancel/recovery.
- **Modify `src/App.jsx`** — add Add static content and static edit routes; integrate the atomic create/edit commands; keep existing chart integration paths intact.
- **Modify `src/components/app-shell/DashboardCommandCrown.jsx`** — expose separate Add chart and Add static content commands.
- **Modify `src/components/ChartPanel.jsx` and `src/components/charts/ChartPanelActions.jsx`** — route static Edit to the static editor in Build only.

### Atomic transaction

- **Create `src/static-content/staticPanelTransaction.js`** — build and commit panel+source(+asset manifest) as one dashboard revision; support create/edit/replace/delete and failure rollback.
- **Modify `src/lib/dashboardCommitController.js`** — accept the prepared static transaction and expose commit result/revision without partial intermediate writes.
- **Modify `src/charting/config/dashboardSemanticReferences.js`** — validate panel→typed source and source→asset references.

### Checks

- **Create `tests/staticContentRegistry.test.js`** — exact chart/static catalogue separation, one Image ID, surface capability table.
- **Create `tests/staticSourceSchema.test.js`** — source normalization and invalid cross-field cases.
- **Create `tests/staticContentDraft.test.js`** — exact four-stage model, dirty/cancel/recovery behavior.
- **Create `tests/staticPanelTransaction.test.js`** — failure injection proves old saved revision remains authoritative.
- **Modify `tests/wizardDraftV3.test.js` and `tests/chartWizardProofDeck.test.js`** — assert the existing six chart stages and proof semantics are unchanged.

**Layer gate:** Semantic correctness for FT-01, FT-02, PS-01, PS-08. Composition/real-use is not yet complete and must not be reported as the feature.

## Vertical slice 2 — Free-text vertical slice

### Parser and renderer

- **Create `src/static-content/qmd/portableQmdPolicy.js`** — the complete `portable-qmd-v1` feature/protocol/resource table.
- **Create `src/static-content/qmd/parsePortableQmd.js`** — inert AST parse, source-located allow/deny validation, complexity accounting.
- **Create `src/static-content/qmd/renderPortableQmd.js`** — semantic HTML generation, host-aware headings, panel-scoped IDs, footnotes, callouts, code, tables, restricted math.
- **Create `src/static-content/qmd/sanitizePortableHtml.js`** — HTML-only allow-list, URI hook, fragment return, forbidden resource/style/custom/foreign content.
- **Create `src/components/static-content/FreeTextSourceEditor.jsx`** — labelled source editor, 200 ms parse, error list, stale last-valid preview, accessible status.
- **Create `src/components/charts/FreeTextChartView.jsx`** — canonical static render surface with bounded vertical overflow and table/code scrollers.
- **Modify `src/components/charts/ChartView.jsx`** — dispatch the resolved Free-text model through the canonical surface; interaction mode affects only host chrome, not parsing policy.

### Dependency and styles

- **Modify `package.json` and the lockfile** — add only approved local Markdown/sanitizer/math dependencies after a dependency/security review; pin versions through the project package manager.
- **Create `src/styles/static-content.css`** — production-owned semantic prose, callout, table, code, math, focus, overflow, and responsive rules. Do not copy sketch CSS wholesale.
- **Modify the production stylesheet entry point** — import the new isolated stylesheet after Step 7 ownership is settled; do not append rules to unrelated shared CSS opportunistically.

### Checks and real journey

- **Create `tests/portableQmdPolicy.test.js`** — one explicit accepted/rejected fixture for every feature table row plus protocol bypasses and limits.
- **Create `tests/portableQmdSanitization.test.js`** — final DOM contains no forbidden elements/attributes/resources and no post-sanitize mutation path.
- **Create `tests/freeTextChartView.test.js`** — semantics, heading offset, accessibility, stale preview, overflow ownership.
- **Create `tests/e2e/static-free-text.spec.js`** — live production create → reload → edit/cancel → edit/save → View → fullscreen; resize to narrow layout; prove Free text absent from Present.

**Layer gate:**

1. Semantic: policy/parser/sanitizer fixtures pass.
2. Composition: routed editor and canonical renderer pass wide/narrow/overflow browser tasks.
3. Real-use: FT-11 and FT-12 pass against the live production app with persisted state.

## Vertical slice 3 — Image enhancement vertical slice

### Intake, transform, and renderer

- **Create `src/static-content/image/imageAssetValidation.js`** — signature/decode/type, byte/dimension/megapixel, URL/path, and quota preflight.
- **Create `src/static-content/image/imageTransform.js`** — normalized permille geometry, quarter-turn transform, bounds/clamping, contain/cover model, defaults/reset.
- **Create `src/components/static-content/ImageSourceEditor.jsx`** — upload/URL/package source, replacement, alt/decorative, typed error recovery.
- **Create `src/components/static-content/ImageTransformEditor.jsx`** — nondestructive crop, keyboard/numeric alternatives, rotation, fit, Reset image, undoable draft.
- **Modify `src/components/charts/ImageChartView.jsx`** — consume durable source/asset resolver; apply saved rotation/crop/fit; add clamped transient zoom/pan and Reset view; stable loading/failure UI; passive mode.
- **Modify `src/components/charts/ChartView.jsx`** — pass surface interaction mode and resolved asset lifecycle without changing Image type ID.
- **Modify `src/charting/data/prepareOperationalData.js` and `src/charting/rendering/operationalAdapter.js`** — remove the new authoring dependency on exactly-one inline row while retaining a clearly bounded legacy migration adapter.

### Checks and real journey

- **Create `tests/imageAssetValidation.test.js`** — accepted formats, spoofing, corruption, limits, path/protocol, quota classifications.
- **Create `tests/imageTransform.test.js`** — boundary/property cases for crop and rotations; hash/original invariance belongs in asset integration.
- **Modify `tests/chartViewV3.test.js` or create `tests/imageChartView.test.js`** — saved vs transient state, zoom/pan bounds, reset names, alt/decorative, stable failures.
- **Create `tests/e2e/static-image.spec.js`** — live production upload → create → reload → edit crop/rotation/alt → cancel → save → View → fullscreen, including keyboard-only crop and a forced failure.

**Layer gate:** IM-01 through IM-14 pass at their designated semantic/composition/real-use layers. Do not claim Image enhancement from the transform engine or editor in isolation.

## Vertical slice 4 — persistence, export, and import

### Durable authored assets

- **Create `src/static-content/assets/browserAuthoredAssetStore.js`** — dedicated IndexedDB schema for staged/durable assets, hashes, byte reads, per-window object URL lifecycle, and quota error classification.
- **Create `src/static-content/assets/assetReferenceGraph.js`** — references across saved manifest, active draft, recovery/undo, and import staging; safe orphan candidates.
- **Create `src/static-content/assets/reconcileAuthoredAssets.js`** — post-commit/startup reconciliation with a 24-hour staging grace and no referenced deletion.
- **Modify `src/lib/loadDashboard.js`** — reconcile manifests and expose typed per-panel missing/corrupt states without rejecting unrelated panels.
- **Modify `src/lib/browserStorage.js` only if needed** — reuse its error classification conventions; do not store binary payloads in localStorage.

### Dashboard schema and migration

- **Modify `src/charting/config/dashboardConfigStructure.js`** — schema v4 typed sources and asset manifest.
- **Create `src/charting/config/migrateDashboardV3ToV4.js`** — deterministic/idempotent legacy Image migration including URL/path/blob, fit, crop/rotation defaults, and alt warning.
- **Modify `src/charting/config/dashboardBundleV3.js` or replace with version-neutral `dashboardBundle.js`** — bundle v4 envelope, base64 local payloads, hashes, linked dependency report, strict validation.
- **Modify `src/lib/dashboardPackageCandidate.js`** — preflight assets/network dependencies and refuse missing/corrupt local bytes.
- **Modify `src/lib/dashboardPackageImportTransaction.js`** — validate/stage all assets before the single dashboard mutation; roll back on any invalid/quota condition.

### Offline package

- **Modify `scripts/build-portable-data.mjs`** — include referenced uploaded assets under safe generated paths.
- **Modify `scripts/package-flashdrive.mjs`** — serve/copy PNG/JPEG/WebP correctly and validate generated paths.
- **Modify package/readme documentation for flash-drive export** — describe embedded local assets and explicitly linked network dependencies.

### Checks

- **Create `tests/browserAuthoredAssetStore.test.js`** — staging/durable lifecycle, hashing/dedup, quota classification, object URL cleanup.
- **Create `tests/dashboardMigrationV4.test.js`** — all legacy Image cases and idempotence.
- **Modify/replace `tests/dashboardBundleV3.test.js`** — v4 round-trip, missing/corrupt payload, linked dependency, reference integrity.
- **Modify `tests/dashboardPackageCandidate.test.js` and `tests/dashboardPackageImportTransaction.test.js`** — preflight and atomic import failures.
- **Create `tests/authoredAssetCleanup.test.js`** — exact reference/grace decisions once; no redundant second checker unless anomalous.
- **Add one portable-package browser task** — build/serve offline, import/open local images, main/fullscreen/Audience with network disabled.

**Layer gate:** PS-02 through PS-05 pass; export/import proof includes a reload in a cleared browser state, not only object equality.

## Vertical slice 5 — live Build/View fidelity

- **Modify `src/components/dashboard/DashboardCanvas.jsx`** — place static panels in the same grid and provide Build-only authoring actions.
- **Modify `src/components/ChartPanel.jsx`** — stable panel framing, scoped error recovery, correct overflow owner.
- **Modify `src/components/display/DisplayedChartGrid.jsx`** — canonical fullscreen rendering with active Image viewer and Free-text scrolling.
- **Modify `src/components/dashboard/DashboardModeWorkspace.jsx` if required by final Step 7** — ensure Build/View route the same saved render model rather than parallel approximations.
- **Modify `src/components/DashboardRenderer.jsx` if it is the final canonical owner** — resolve typed static sources/assets once at the shared boundary.
- **Create/modify focused CSS only in the final Step 7-owned surface files** — preserve grid geometry and action overlay contracts.
- **Create `tests/staticPanelComposition.test.js`** — Build/View saved composition equality, overflow owners, surface capability mapping.
- **Extend `tests/e2e/static-free-text.spec.js` and `tests/e2e/static-image.spec.js`** — material 1440×900, 1024×768, 768×900 states and fullscreen.

**Layer gate:** PS-06 and PS-07 pass. Evidence must show real routed Build and View, not a prototype URL.

## Vertical slice 6 — Present/Audience compatibility

- **Modify `src/components/presentation/PresentWorkspace.jsx`** — list saved Image panels as direct non-temporal selectable items; never list Free text.
- **Modify `src/components/presentation/usePresentationRuntime.js`** — compose Image identity/revision beside temporal items without adding time/Scene data.
- **Modify `src/lib/presentationProtocol.js`** — allow validated Image static items; reject Free text and object URLs; keep protocol version/migration explicit.
- **Modify `src/lib/presentationChannel.js`** — send identity/revision only and preserve snapshot/reconnect behavior.
- **Modify `src/components/presentation/AudienceDisplay.jsx`** — resolve Image assets in the separate window and keep failure cell-scoped.
- **Modify `src/components/presentation/AudienceSnapshotMonitor.jsx` if required** — report asset revision readiness without treating Image as temporal.
- **Modify `src/components/display/DisplayedChartGrid.jsx`** — passive mode hides Image viewer controls and applies saved transform only.
- **Modify `src/styles/presentation.css`** — bounded passive Image cell, loading/error states, 16:9 fit; no Free-text Audience styles.
- **Do not weaken `src/charting/time/sceneSchema.js`** — add a regression test rather than changing Scene membership invariants.

### Checks and live journey

- **Modify `tests/presentationProtocol.test.js` and `tests/presentationChannel.test.js`** — accept Image identity/revision, reject Free text/blob URL, reconnect snapshot.
- **Modify `tests/audienceDisplay.test.js`** — passive transform, no controls, separate-window resolver, isolated failure.
- **Modify `tests/sceneSchema.test.js`** — static types remain invalid Scene members.
- **Create `tests/e2e/static-image-audience.spec.js`** — live production Image + temporal chart selection, separate 16:9 Audience, chart time change with unchanged Image, forced image failure with continuing chart.

**Layer gate:** IM-15, IM-16, FT-12, and PS-08 pass. This is the required Present/Audience production integration proof; an unwired Audience component does not count.

## Final evidence set

Capture only evidence that changes acceptance decisions:

- deterministic test output mapped to Semantic matrix rows;
- browser screenshots/recordings at material responsive, loading, error, passive, and fullscreen states mapped to Composition rows;
- five live journeys mapped to Real-use rows: Free-text full lifecycle, Free-text Present exclusion, Image full lifecycle, Image Present/Audience, and Audience asset failure isolation;
- portable offline export/import journey with local assets and separate Audience window;
- updated fidelity matrix statuses and deviations.

## Production files that must wait for Step 7 acceptance

Every production file in this plan is held. The highest-overlap files are listed separately in `docs/audits/2026-08-24-v3-static-content-panels/STEP-7-WAIT-LIST.md`. No production source, production test, package manifest, lockfile, generated catalogue/revision artifact, or shared production CSS may be changed on the Step 7S discovery branch.
