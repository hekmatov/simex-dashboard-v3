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
5. Apply the accepted version trace exactly: dashboard schema v4, export bundle v4, and chart config v3 unless an implementation-proven chart-shape change receives a separate accepted deviation. Cross-reference spec Versions, security SP-15/SP-21, and fidelity PS-02/PS-03 in the same commit.
6. Complete and commit the mandatory post-Step-7 ownership-resolution inventory below. No implementation task, dependency change, test creation, or production edit may start before this gate passes.

Every implementation slice closes its own traceability loop in the same commit: update the slice’s fidelity rows, security decisions, evidence/status, and any deviation record. A passing engine check leaves UI/composition and fidelity status pending until its routed browser task passes.

## Hard gate — post-Step-7 production ownership resolution

Final ownership cannot be known reliably until Step 7 is accepted. The implementation branch must therefore begin with a read-only ownership pass and commit `docs/audits/<implementation-date>-static-content-panels/POST-STEP-7-OWNERSHIP-INVENTORY.md` before any production work.

The inventory must identify the final accepted Step 7 commit and replace every generic, conditional, or proposed owner in this plan with exact existing-or-new paths and named functions/boundaries for:

- static wizard/editor route and dashboard mutation entry;
- registry, catalogue filter, typed source resolver, and validation boundaries;
- production stylesheet entry point and every static-content/Build/View/fullscreen/Audience CSS owner;
- dashboard schema migration and invalid Chrono/Scene membership isolation;
- canonical Build/View renderer ownership, including whether `DashboardModeWorkspace.jsx`, `DashboardRenderer.jsx`, or another final Step 7 file owns resolution;
- static creation/edit destination validation and runtime time-filter exclusion;
- Present protocol/channel/runtime and Audience asset-readiness ownership;
- exact unit, integration, and browser test files for all affected fidelity IDs, especially PS-08.

The same inventory commit must update every affected Fidelity Matrix **Production owner** cell and every execution-ledger **Owning slice/deterministic test** entry. It must remove all “if required,” “if final owner,” generic service names, and unresolved “new” placeholders. A deterministic scan must fail the gate if any remain. Do not guess these paths on the discovery branch.

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

- **Create `src/static-content/forms/staticContentDraft.js`** — four-stage state, strict stage-3/stage-4 ownership, type-specific application-session-only drafts, dirty Keep/Discard/focus restoration, validation gates, and revision tracking. Do not persist unsaved authoring fields across reload.
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
- **Create `tests/staticContentDraft.test.js`** — exact four-stage model, Image control ownership, dirty Keep/Discard/focus behavior, and the accepted draft-lifetime policy.
- **Create `tests/staticPanelTransaction.test.js`** — failure injection proves old saved revision remains authoritative.
- **Modify `tests/wizardDraftV3.test.js` and `tests/chartWizardProofDeck.test.js`** — assert the existing six chart stages and proof semantics are unchanged.

**Layer gate:** Semantic correctness for FT-01, FT-02, and the transaction engine portion of PS-01. PS-08 cannot complete in slice 1: it requires routed create/edit, import/migration, runtime filter, Present protocol, and Audience integration in slices 4–6. Composition/real-use is not yet complete and must not be reported as the feature.

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
- **Resolve at the post-Step-7 ownership gate, then modify the exact production stylesheet entry path recorded in the inventory** — import the new isolated stylesheet; do not append rules to unrelated shared CSS opportunistically.

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

- **Create `src/static-content/image/imageAssetValidation.js`** — signature, decoded format/dimensions, single-frame animation metadata, byte/megapixel, URL/path, and quota preflight; explicitly reject APNG and animated WebP.
- **Create `src/static-content/image/imageTransform.js`** — normalized permille geometry, quarter-turn transform, bounds/clamping, contain/cover model, defaults/reset.
- **Create `src/components/static-content/ImageSourceEditor.jsx`** — upload/URL/package source, replacement, alt/decorative, typed error recovery.
- **Create `src/components/static-content/ImageTransformEditor.jsx`** — nondestructive crop, keyboard/numeric alternatives, rotation, fit, Reset image, undoable draft.
- **Modify `src/components/charts/ImageChartView.jsx`** — consume durable source/asset resolver; apply saved rotation/crop/fit; add clamped transient zoom/pan and Reset view; stable loading/failure UI; passive mode.
- **Modify `src/components/charts/ChartView.jsx`** — pass surface interaction mode and resolved asset lifecycle without changing Image type ID.
- **Modify `src/charting/data/prepareOperationalData.js` and `src/charting/rendering/operationalAdapter.js`** — remove the new authoring dependency on exactly-one inline row while retaining a clearly bounded legacy migration adapter.

### Checks and real journey

- **Create `tests/imageAssetValidation.test.js`** — accepted single-frame PNG/JPEG/WebP, spoofing, corruption, APNG, animated WebP, limits, path/protocol, and quota classifications.
- **Create `tests/imageTransform.test.js`** — boundary/property cases for crop and rotations; hash/original invariance belongs in asset integration.
- **Modify `tests/chartViewV3.test.js` or create `tests/imageChartView.test.js`** — saved vs transient state, zoom/pan bounds, reset names, alt/decorative, stable failures.
- **Create `tests/e2e/static-image.spec.js`** — live production upload → create → reload → edit crop/rotation/alt → cancel → save → View → fullscreen, including keyboard-only crop and a forced failure.

**Layer gate:** IM-01 through IM-14 pass at their designated semantic/composition/real-use layers. Do not claim Image enhancement from the transform engine or editor in isolation.

## Vertical slice 4 — persistence, export, and import

### Durable authored assets

- **Create `src/static-content/assets/browserAuthoredAssetStore.js`** — dedicated IndexedDB schema for staged/durable assets, hashes, byte reads, per-window object URL lifecycle, and quota error classification.
- **Create `src/static-content/assets/assetReferenceGraph.js`** — references across saved manifest, current-session draft, undo, and transaction/import staging; safe orphan candidates. The staging journal may survive an interruption only for rollback/orphan cleanup and must not reconstruct unsaved source, alt, crop, rotation, or fit fields.
- **Create `src/static-content/assets/reconcileAuthoredAssets.js`** — post-commit/startup reconciliation with a 24-hour staging grace and no referenced deletion.
- **Modify `src/lib/loadDashboard.js`** — reconcile manifests and expose typed per-panel missing/corrupt states without rejecting unrelated panels.
- **Modify `src/lib/browserStorage.js` only if needed** — reuse its error classification conventions; do not store binary payloads in localStorage.

### Dashboard schema and migration

- **Modify `src/charting/config/dashboardConfigStructure.js`** — schema v4 typed sources and asset manifest.
- **Create `src/charting/config/migrateDashboardV3ToV4.js`** — deterministic/idempotent legacy Image migration including URL/path/blob, fit, crop/rotation defaults, and alt warning.
- **Resolve at the post-Step-7 ownership gate, then modify the exact import/migration membership validator paths/functions recorded in the inventory** — reject or isolate any static panel carrying Chrono Group or Scene membership; never fabricate temporal metadata.
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
- **Resolve the canonical Build/View owner at the post-Step-7 gate, then modify the exact path/function recorded in the inventory** — ensure Build/View route the same saved render model rather than parallel approximations; do not assume `DashboardModeWorkspace.jsx` or `DashboardRenderer.jsx` until inspected.
- **Resolve CSS ownership at the post-Step-7 gate, then create/modify only the exact paths recorded in the inventory** — preserve grid geometry and action-overlay contracts.
- **Create `tests/staticPanelComposition.test.js`** — Build/View saved composition equality, overflow owners, surface capability mapping.
- **Extend `tests/e2e/static-free-text.spec.js` and `tests/e2e/static-image.spec.js`** — material 1440×900, 1024×768, 768×900 states and fullscreen.

**Layer gate:** PS-06 and PS-07 pass. Evidence must show real routed Build and View, not a prototype URL.

## Vertical slice 6 — Present/Audience compatibility

- **Modify `src/components/presentation/PresentWorkspace.jsx`** — list saved Image panels as direct non-temporal selectable items; never list Free text.
- **Modify `src/components/presentation/usePresentationRuntime.js`** — compose Image identity/revision beside temporal items without adding time/Scene data.
- **Modify `src/lib/presentationProtocol.js`** — allow validated Image identity/revision only; reject Free text, object URLs, and any Scene/group/frame/time fields on Image; keep protocol version/migration explicit.
- **Modify `src/lib/presentationChannel.js`** — send identity/revision only and preserve snapshot/reconnect behavior.
- **Modify `src/components/presentation/AudienceDisplay.jsx`** — resolve Image assets in the separate window and keep failure cell-scoped.
- **Resolve Audience asset-readiness ownership at the post-Step-7 gate, then modify the exact path/function recorded in the inventory** — report asset revision readiness without treating Image as temporal; do not assume `AudienceSnapshotMonitor.jsx` until inspected.
- **Modify `src/components/display/DisplayedChartGrid.jsx`** — passive mode hides Image viewer controls and applies saved transform only.
- **Modify `src/styles/presentation.css`** — bounded passive Image cell, loading/error states, 16:9 fit; no Free-text Audience styles.
- **Do not weaken `src/charting/time/sceneSchema.js`** — add a regression test rather than changing Scene membership invariants.
- **Resolve at the post-Step-7 gate, then modify the exact static creation/edit destination validators and runtime time-filter boundary recorded in the inventory** — reject Chrono/Scene destinations and prove neither static resolver is called with a time filter.

### Checks and live journey

- **Modify `tests/presentationProtocol.test.js` and `tests/presentationChannel.test.js`** — accept Image identity/revision, reject Free text/blob URL, reconnect snapshot.
- **Modify `tests/audienceDisplay.test.js`** — passive transform, no controls, separate-window resolver, isolated failure.
- **Resolve the exact PS-08 unit/integration/browser test paths at the post-Step-7 gate; then modify/create those recorded files** — creation/edit/import/migration reject or isolate membership; static resolvers receive no time filters.
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
| FT-01 | Shared contract | Exact chart/static stage arrays and Image stage-control ownership | Traverse Add chart; traverse Image Content → passive Preview; dirty Keep then Discard | 1440×900, 1024×768; stages 3/4; dirty modal | Stage DOM/control inventory + interaction result | Held / not started | Held / not started | Proposed |
| FT-02 | Shared contract | One Image ID; registry capability/catalogue filters | Compare Add chart and Add static content type lists | Desktop; empty/populated registry | Type-list reading | Held / not started | Held / not started | Proposed |
| FT-03 | Free text | Feature-table allow/deny/resource fixture matrix | Paste accepted and blocked corpus; inspect errors and DOM | Valid, warning, blocked, limits | Validation and DOM reading | Held / not started | Held / not started | Proposed |
| FT-04 | Free text | Malicious corpus creates no forbidden DOM/request and cannot save | Paste script/iframe/widget/media payloads and attempt Save | Main app; offline; legacy import | DOM + network/resource evidence | Held / not started | Held / not started | Proposed |
| FT-05 | Free text | Protocol bypass table plus rel/target assertions | Activate safe/unsafe links by keyboard and pointer | View/fullscreen; online/offline | Link DOM + navigation result | Held / not started | Held / not started | Proposed |
| FT-06 | Free text | Exact source/node/depth/table boundaries | Exceed each limit and verify current-session draft survives | Create/edit; each boundary | Error/status + retained source | Held / not started | Held / not started | Proposed |
| FT-07 | Free text | Responsive state preserves draft/revision/tab/focus owner | Type; resize wide↔narrow; switch tabs; continue at same context | 1440×900, 1024×768, 768×900; valid/error | Geometry + focus + source reading | Held / not started | Held / not started | Proposed |
| FT-08 | Free text | Source/preview revision reducer preserves last valid and blocks progress | Valid source → script/iframe → unchanged stale preview → correction | Wide/narrow; blocked/recovered | Preview text/revision + disabled-state reading | Held / not started | Held / not started | Proposed |
| FT-09 | Free text / Build-View | Overflow-owner assertions; no document-width growth | Long token, wide table, tall prose; keyboard-scroll each region | Small cell; fullscreen; 320/768/1440 | Geometry/scroll-owner reading | Held / not started | Held / not started | Proposed |
| FT-10 | Free text | Semantic DOM/focus-order assertions | Keyboard/screen-reader-landmark traversal of full corpus | Preview, View, fullscreen | DOM/accessible tree + focus result | Held / not started | Held / not started | Proposed |
| FT-11 | Free text / Build-View | Persist pair; dirty Keep/Discard/save revision integration | Create → reload saved → Keep → Discard → save → View → fullscreen | 1440×900, 768×900; dirty/narrow/error | Saved revision + screenshots/interactions | Held / not started | Held / not started | Proposed |
| FT-12 | Present/Audience | Selector and protocol both reject Free text | Create text; verify Present absence; inject stale message | Present + separate Audience | Selector/DOM/protocol result | Held / not started | Held / not started | Proposed |
| IM-01 | Shared/Image | Registry uniqueness and legacy resolution | Open existing Image and new static Image flow | Migrated/new dashboard | Type identity/route result | Held / not started | Held / not started | Proposed |
| IM-02 | Image | Signature/decode/dimension/frame/limit fixtures including APNG/animated WebP | Upload accepted formats plus every named failure class | Create/replace; quota-near; animation | Validation categories + decode result | Held / not started | Held / not started | Proposed |
| IM-03 | Persistence | Reload/read/hash/dedup; no OS path in config | Upload; remove original; reload; render two references | Main + separate Audience | Hash/reference + rendered output | Held / not started | Held / not started | Proposed |
| IM-04 | Image/Persistence | URL/path protocol and traversal table | Enter safe/unsafe origins; inspect export preflight | Online/offline; import/package | Validation/preflight reading | Held / not started | Held / not started | Proposed |
| IM-05 | Image | Alt/decorative truth table and DOM semantics | Toggle, save, inspect View and Audience semantics | Create/edit; View; Audience | DOM/accessible tree | Held / not started | Held / not started | Proposed |
| IM-06 | Image | Crop/rotation boundary/property tests | Rotate, nudge, resize, reload, compare crop | Landscape/portrait/square; edge/min | Geometry reading + screenshot | Held / not started | Held / not started | Proposed |
| IM-07 | Image/Persistence | Asset hash unchanged; export original bytes + metadata | Transform, reset, export/import, compare | Create/edit/import | Hash + visible transform | Held / not started | Held / not started | Proposed |
| IM-08 | Image | Focus order and drag/nudge/numeric equivalence | Complete crop keyboard-only then pointer | 1440×900, 1024×768; 200% zoom | Focus/action/geometry evidence | Held / not started | Held / not started | Proposed |
| IM-09 | Image/Build-View | Only source transaction persists transforms; viewer state resets | View zoom/pan → reopen → edit saved crop | View/fullscreen/edit/reload | Source revision + viewer reading | Held / not started | Held / not started | Proposed |
| IM-10 | Image/Build-View | Zoom/pan bounds, reset, names, surface capability | Tab to View controls; exercise; fullscreen and repeat | Small cell; fullscreen; keyboard; fit modes | Focus + interaction + geometry | Held / not started | Held / not started | Proposed |
| IM-11 | Image | Replace/undo/cancel/save reducer revisions | Replace landscape→portrait; undo; replace/save/reload | Edit; dirty cancel; failure | Revision + transform/alt reading | Held / not started | Held / not started | Proposed |
| IM-12 | Image | Exact Reset image state; unchanged hash/reference | Transform/reset/cancel; repeat/save | Create/edit; alt/decorative | State/hash + preview | Held / not started | Held / not started | Proposed |
| IM-13 | Image/Build-View/Audience | Exact surface→failure actions plus sibling survival | Force failure in Build, ordinary View, fullscreen, Audience; inspect inventories; Retry fullscreen | Small cell; fullscreen; 16:9; offline | Exact actions + fullscreen retry + sibling render | Held / not started | Held / not started | Proposed |
| IM-14 | Image/Build-View | Persist revisions; stage ownership; complete-pair dirty Keep/Discard | Change source/replacement, alt/decorative, fit/focus, crop/rotation → Keep all → Discard/restore all/stage/render/focus → add/reload/edit/save/View/fullscreen | 1440×900, 768×900; stages 3/4; portrait/landscape | Field/state/focus readings + saved revision + screenshots | Held / not started | Held / not started | Proposed |
| IM-15 | Present/Audience | Protocol accepts identity/revision without temporal fields; second-window asset resolve | Select Image+chart; open Audience; change chart time | 1920×1080, 1366×768; separate window | Protocol reading + before/after render | Held / not started | Held / not started | Proposed |
| IM-16 | Present/Audience | Forced Image failure leaves sibling time/render live | Break asset; advance chart time | 16:9; 1/2/4-cell layouts | Sibling DOM/time + failure screenshot | Held / not started | Held / not started | Proposed |
| PS-01 | Shared/Persistence | Failure at each transaction step preserves old revision/references; reload has no unsaved authoring fields | Fail save; retry/cancel in-session; reload only the unchanged saved panel | Create/edit/replace; quota/storage; reload | Revision/reference/staging evidence + no unsaved draft in storage | Held / not started | Held / not started | Proposed |
| PS-02 | Persistence | Dashboard v3→v4 migration idempotence; contained chart config remains v3 | Import/open every legacy Image origin/fit/alt/membership case and inspect exact dashboard/chart versions | Legacy valid/malformed; invalid temporal membership | Dashboard v4 + chart-config-v3 + migration/recovery reading | Held / not started | Held / not started | Proposed |
| PS-03 | Persistence | Export bundle v4 schema/hash/reference round trip with chart config v3; missing byte abort | Export mixed dashboard; clear state; import; inspect exact versions and surfaces | Online/offline; quota/corrupt | Bundle-v4/chart-v3/hash + rendered output | Held / not started | Held / not started | Proposed |
| PS-04 | Persistence/package | Package safe paths/MIME; no external requests for local assets | Serve package offline; open main and Audience | Windows portable server; 16:9 | Package listing + network/render evidence | Held / not started | Held / not started | Proposed |
| PS-05 | Persistence | Reference graph/grace cleanup decisions | Replace/delete/cancel/import-fail; reload; inspect inventory | Normal; quota warning; interrupted | Asset inventory/reference reading | Held / not started | Held / not started | Proposed |
| PS-06 | Build-View | No saved-layout write on open; exact prior Build UI state restores on close | Save; toggle modes; open/close editor; verify placement/selection/focus/scroll | 1440×900, 1024×768; dense; open/closed | Config + geometry/focus/scroll reading | Held / not started | Held / not started | Proposed |
| PS-07 | Build-View/Audience | Surface→interaction mapping, keyboard active controls, zero Audience controls | Open both fullscreen; Image zoom/pan/reset; inspect Audience | Fullscreen; keyboard; 16:9 | Control inventory + interaction | Held / not started | Held / not started | Proposed |
| PS-08 | Shared/Persistence/Present | Reject/isolate membership; no static filter call; Image message fields exact | Create/edit inspect; invalid import; Image+chart Present; change clock | Build; import recovery; Present/Audience | Validator/protocol/time/render evidence | Held / not started | Held / not started | Proposed |

No ledger row may change Fidelity status to Passing until its engine and UI/composition statuses are Passing and its retained browser task has produced the required evidence. The only exception is a user-approved deviation recorded in both this ledger and the fidelity matrix.

## Production files that must wait for Step 7 acceptance

Every production file in this plan is held. The highest-overlap files are listed separately in `docs/audits/2026-08-24-v3-static-content-panels/STEP-7-WAIT-LIST.md`. No production source, production test, package manifest, lockfile, generated catalogue/revision artifact, or shared production CSS may be changed on the Step 7S discovery branch.
