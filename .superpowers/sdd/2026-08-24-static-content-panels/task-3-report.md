# Task 3 report — Image enhancement vertical slice

Date: 2026-08-25

Branch: `codex/static-content-panels-implementation`

Starting point: `99d90c4`

Atomic implementation commit: this report is part of the single slice commit; the resulting hash is reported to the controller after commit.

## Status

Complete for every Image behavior attainable before Slice 4 durability and independently testable as an in-session vertical slice. The typed Image source/validation/transform engine, four-stage authoring route, canonical Build/View/fullscreen renderer, active viewer, passive surface contract, and in-session create/edit/cancel/save lifecycle are implemented and verified.

IM-14 is deliberately not reported as fully Passing. The retained create → reload continuation is a narrow `fixme` with the exact reason `Blocked by Slice 4: authored IndexedDB durability and dashboard/bundle v4 reload are not part of Slice 3.` IM-15/IM-16 and separate Audience asset readiness/failure remain Slice 6 plus the Slice 4 durable identity dependency.

The user-directed permissive inert-text override was not applied to Image. Image retains strict signature, structure, decode, animation, origin, resource, accessibility, and recovery validation.

## Review fix round 1/5

Reviewer disposition: 6 Important and 1 Minor findings reproduced; 7 addressed, 0 open. Review remains pending and is not marked clean.

Fix-round starting commit: `bb0ad1986f9f59cd79787f3b810cc31401a8aa94`.

### Exact reproductions and REDs

1. Real raster validation: the valid generated JPEG initially failed `corrupt-image` at the SOS/entropy boundary, while synthetic PNG and decoderless inputs were accepted. After correcting the fixture copy, the focused RED still proved header-only PNG/JPEG/WebP stubs and a missing decoder boundary were accepted by the old implementation. The browser integration did not yet prove actual decode.
2. Post-Image chart commits: the real serialized controller reproduced `Unknown dashboard configuration property "assets"` while `integrateCreatedChart` validated a candidate containing the session manifest. The retained journey then exposed a second RED after the initial bridge: the created chart persisted, but its editor reported `No chart data to preview` because the bridge reattached a portable return instead of the hydrated runtime projection.
3. Transform geometry: the canonical markup RED contained CSS `clip-path`, `object-fit:cover`, and `rotate(...)` on the image but no ordered saved-geometry representation. A test requiring `data-image-transform-order="rotation-crop-fit"`, normalized `viewBox`, outer fit, and rotation transform failed.
4. Intake preflight: three production-facing tests failed: oversized/quota-blocked `File` inputs were read/decoded, over-dimension encoded metadata reached the decoder, and an already staged sibling was not included in aggregate budget classification.
5. Async resolver: both Chromium cases timed out waiting for `Loading saved image…`; a Promise returned by the durable asset resolver was treated synchronously as unavailable, with no completion or cancellation subscription in canonical `ChartView`.
6. Lifecycle cleanup: the retained 1440×900 journey found both original and replacement session blobs after Undo; the focused cleanup helper did not exist. This established the missing object-URL revoke/unreferenced-session-blob path.
7. Evidence synchronization: `SLICE-3-EVIDENCE-STATUS.md` simultaneously reported `151/151` and a `102-test` directly impacted set.

The first Vite-backed RED attempt was blocked by the known Windows filesystem sandbox (`Cannot read directory "../../../../../.."`). The identical commands were rerun outside that restriction to observe the product assertions. One retained chart-editor rerun also exposed a test-navigation omission (Appearance had not been selected before locating Chart title); that assertion was corrected without changing product behavior.

### GREEN implementation

- Validation now requires real PNG IDAT, WebP payload, and robust JPEG SOF/SOS/entropy/EOI structure plus an explicit production decoder boundary. Exact locally controlled 2×3 PNG/JPEG/WebP fixtures pass Chromium `createImageBitmap`; header-only stubs, spoofing, corruption, APNG/animated WebP, decoded mismatch, and all resource limits retain stable rejection codes.
- Intake preflights `File.size`, aggregate session/product budget, and available browser quota before full read/decode, then checks encoded dimensions/megapixels before invoking the least-privilege browser decoder. Accepted bytes are copied only after all checks.
- The bounded session/v3 bridge validates session manifests separately, projects session asset-origin Image panels/sources out of v3 persistence, persists ordinary chart create/edit changes, preserves the typed Image/assets in controller session state, and reattaches the hydrated runtime projection. It does not add IndexedDB, schema v4, or a second durable path.
- Saved rendering is explicit rotation → normalized SVG viewBox crop → outer contain/cover fit. Transient zoom/pan remains outside this saved geometry. SSR tests assert the ordered geometry and the retained browser journey compares the real composed DOM matrices.
- Canonical `ChartView` now subscribes to pending durable resolver Promises, renders a stable pending state, accepts synchronous resolvers unchanged, ignores superseded completion after cleanup, and resolves rejection to the typed panel recovery state. Static Image still bypasses rows, dataset preparation, playback, Chrono, and Scene paths.
- Undo, cancel/discard, successful replacement, and unmounted/stale intake cleanup selectively revoke and remove unreferenced session assets. Retained/saved siblings and adopted assets survive; intake revision and adopted-ID guards prevent stale cleanup races.
- At the conclusion of fix round 1, the evidence ledger, binding matrix, security record, progress ledger, and this report used one directly impacted result: 160/160.

### Fix-round GREEN evidence

- Focused Image asset/render/App suites: 20/20 passed.
- Canonical async/browser-decoder suite: 3/3 passed.
- Directly impacted Image/static/chart/legacy suite: first 159/160 with one stale `object-fit:cover` expectation; after aligning it with the approved outer SVG fit contract, the final post-refactor rerun passed 160/160 in 7.44 seconds.
- Production build: 883 modules transformed, passed in 10.87 seconds with only the existing advisories.
- Retained production journeys: 1440×900 passed in 43.6 seconds, 1024×768 in 27.3 seconds, and 768×900 in 25.8 seconds. Each now includes ordinary six-stage chart creation and chart editing after Image, v3/session shape inspection, repeated replace→Undo/Discard cleanup, and saved geometry matrix composition. The sole retained reload `fixme` remains blocked by Slice 4 and was not selected by the viewport-specific rerun commands.

## Review fix round 2/5

Reviewer disposition: 1 Important finding reproduced; 1 addressed, 0 open. Review remains pending and is not marked clean.

### Exact reproduction and RED

The renderer used every raster as a 1000×1000 source plane, forced the HTML image through `object-fit:fill`, rotated around `(500, 500)`, and applied normalized crop coordinates directly as the SVG viewBox. The trusted asset-manifest width/height stopped at the static resolver boundary, so landscape and portrait inputs were distorted to a square before the otherwise ordered transform nodes ran.

The focused RED added literal, hand-derived geometry for landscape and portrait sources at 0°, 90°, and 270°, asymmetric crop, and contain/cover. `node --test tests/imageChartView.test.js` produced 5 passed / 2 failed: the canonical staged 2×3 Image emitted `viewBox="100 200 700 600"`, `rotate(90 500 500)`, and a 1000×1000 foreignObject instead of `viewBox="0.3 0.4 2.1 1.2"`, `matrix(0 1 -1 0 3 0)`, and a 2×3 source plane. The 1200×600 landscape case likewise emitted normalized `100 200 700 500` instead of pixel-mapped `120 120 840 300`.

The first strengthened 1440×900 browser run reached the new geometry checkpoint and exposed only SVG DOM float32 representation (`0.629999995…` for authored `0.63`), not a product mismatch. The assertion was narrowed to a 1e-6 tolerance around the hand-derived literal and the identical production journey then passed.

### GREEN implementation and evidence

- The validated asset-manifest width/height now crosses the static resolver boundary into the canonical Image render model. URL/package and bounded legacy-inline sources with no inventory geometry render an undistorted intrinsic probe until `naturalWidth`/`naturalHeight` is available; saved transforms are not fabricated against a square fallback.
- `ImageChartView` maps integer-permille crop into the rotated intrinsic pixel plane. 90°/270° exchange width and height and use positive-bounds matrices; 0°/180° retain extents. The original intrinsic foreignObject and image dimensions remain unchanged, while SVG `preserveAspectRatio` applies contain/cover only after rotation and crop.
- Original staged bytes and content identity are untouched. The transient pan/zoom wrapper remains outside the saved intrinsic rotation/crop/fit geometry.
- Focused renderer/resolver/schema/async/legacy checks passed 37/37 in 3.81 seconds. The final directly impacted suite passed 161/161 in 7.40 seconds.
- The production build passed with 883 modules transformed in 9.93 seconds and only the existing advisories.
- Strengthened production journeys passed at 1440×900 in 29.7 seconds, 1024×768 in 25.2 seconds, and 768×900 in 30.7 seconds. Each used the controlled decoded 2×3 PNG and inspected its natural 2×3 geometry, 2×3 foreignObject, 3×2 quarter-turn bounds, asymmetric pixel crop, rotation matrix, and actual outer cover and contain scales. The sole reload `fixme` remains blocked by Slice 4.

## Implementation

### Validation, staging, and source contracts

- Added strict PNG/JPEG/WebP signature and structural probes, decoded format/dimension agreement, corruption/spoofing checks, explicit APNG/animated-WebP rejection, encoded/dimension/megapixel limits, product-budget/browser-quota classification, HTTPS-only URLs, and traversal-safe dashboard package paths.
- Added application-session-only, content-addressed Image staging. It copies the accepted bytes, calculates the SHA-256 asset identity, deduplicates within the app session, keeps an object URL lease, and exposes a manifest without bytes or URL. Transform operations never receive or modify asset bytes.
- Kept v3 durable persistence unchanged. The App uses the existing serialized/stale-safe commit controller's new `commitPreparedWith` seam to publish a validated Image dashboard candidate in the current application session without passing its `assets` envelope to the v3 durable writer. This is intentionally not a second persistence path.
- Centralized typed Image origin/accessibility/transform validation in `staticSourceSchema` and made the default resolver understand the session registry while retaining asynchronous durable resolver compatibility for Slice 4.

### Transform authoring and lifecycle

- Added integer-permille crop normalization, bounded nudge/resize, quarter-turn rotation, contain/cover fit, and exact Reset image defaults.
- Added the source editor for upload/URL/package origins, replacement, alt/decorative state, typed failures, review-required alt retention, and pre-save Undo replacement.
- Added Variant B's guided transform editor with the crop preview immediately above its sections, pointer crop/resize, keyboard arrow operations, numeric alternatives, explicit quarter-turn controls, Fit, visible focus, and Reset image.
- Extended the shared draft reducer with complete-pair dirty/cancel semantics, saved-vs-transient separation, replacement snapshots, undo, and revision-aware finalization.

### Canonical routing and viewer

- Typed `staticImage` resolves before tabular preparation in `resolveChartRendering`, so it accepts no dataset/time/Chrono/Scene context and uses the same canonical `ChartView` in authoring preview, Build, View, and fullscreen.
- `ImageChartView` applies saved rotation in the trusted intrinsic source plane, maps normalized crop into the resulting pixel extents, and applies outer fit outside a separate transient pan/zoom layer. Active surfaces provide 1–3× zoom in quarter steps, clamped pan, Reset view, keyboard operations, and semantic buttons. Passive surfaces render no controls.
- The hidden action overlay is absolute and reserves no layout space. It reveals on hover, focus-within, or explicit touch/tap; the retained browser test compares the container bounding box before/after reveal.
- Nondecorative Image requires authored alt. Decorative Image renders `alt=""` with presentation exclusion. Loading/failure stays inside a stable panel boundary; Build exposes Retry/Replace/Edit, ordinary View exposes Retry plus a Build explanation, and raw URL/source/asset identifiers are not disclosed.
- The existing inline-row operational Image is now explicitly tagged `legacy-inline-image`. Typed `staticImage` descriptors are rejected from `prepareOperationalData`, and `operationalAdapter` refuses an explicitly typed prepared marker while continuing to accept untagged historical artifacts as bounded migration compatibility. This is the compatibility path required by the brief.

## RED evidence

Every production behavior began with a failing check. Material RED observations were:

- `tests/imageAssetValidation.test.js` and `tests/imageTransform.test.js` initially failed with `ERR_MODULE_NOT_FOUND` for both required engine owners.
- `tests/imageChartView.test.js` initially failed because `ImageSourceEditor`/`ImageTransformEditor` and the typed canonical renderer behavior did not exist.
- New draft cases failed on unknown replacement/undo/reset actions and missing complete Image state restoration.
- The new staged transaction case failed because the durable callback was invoked and rejected `staged Image must not enter v3 persistence boundary.` It passed only after the prepared commit could atomically publish through the existing controller without invoking v3 persistence.
- The typed asset resolver case initially returned an error instead of the asynchronously resolved ready model.
- The explicit legacy-adapter case failed with `1 !== 0`: a typed `staticImage` source was still accepted by operational row preparation. It passed after `prepareOperationalData` rejected typed sources and `operationalAdapter` required the legacy marker.

The retained production journey exposed and drove these real integration corrections in sequence:

1. stale `dist` still showed the old inline Image UI;
2. an ambiguous Fit locator selected more than the semantic control;
3. final Add failed with `Unknown dashboard configuration property "assets"`, establishing the Slice 4 phase-order boundary;
4. the test selected a noncanonical runtime panel;
5. it assumed a local-storage entry existed instead of inspecting its intentional absence;
6. replacement used the wrong visible label instead of the stable file input;
7. a crop expectation ignored the already saved quarter turn;
8. an exact Edit locator conflicted with host chrome.

Each was corrected at the narrowest owner or assertion boundary; Image validation/security and durable v3 validation were not weakened.

## Final GREEN and verification evidence

### Focused engine, draft, transaction, renderer, and source checks

Earlier focused checkpoints passed as follows:

- asset/transform/draft/renderer: 26/26;
- static transaction: 10/10;
- ChartView/Image/transaction: 37/37;
- static source schema/resolver: 5/5;
- package Image route: 1/1.

The final directly impacted command included the legacy operational pipeline:

```text
node --test tests/staticContentRegistry.test.js tests/staticSourceSchema.test.js tests/staticPanelPersistence.test.js tests/staticPanelTransaction.test.js tests/staticContentDraft.test.js tests/imageAssetValidation.test.js tests/imageTransform.test.js tests/imageChartView.test.js tests/imageChartAsync.test.js tests/imageChartPackageSource.test.js tests/chartViewV3.test.js tests/sceneViewComposition.test.js tests/chartSchemasV3.test.js tests/panelEditingV3.test.js tests/chartDataPipelineV3.test.js
```

Final result:

```text
tests 161
pass 161
fail 0
duration_ms 7396.5187
```

This covers strict intake/resource policy, immutable session staging, transform bounds, four-stage draft behavior, stale-safe transactions, typed source resolution, bounded legacy compatibility, canonical SSR/component routing, semantic controls, failures, package source behavior, and directly impacted chart/panel/scene regressions.

### Broad repository unit disposition

```text
node --test --test-reporter=tap
```

Result:

```text
tests 1074
pass 1007
fail 67
duration_ms 16276.4973
```

This broad command is recorded non-green and is not used to promote the slice. The failures include the existing raw-JSX Node-loader class introduced by prior JSX-backed component imports plus unrelated temporal/data/profile/application-baseline assertions. The 161-test directly impacted set is green; the 67 previously recorded broad failures are not claimed fixed, accepted, or owned by Slice 3. The broad command was not rerun in fix round 2 because the required focused/impacted set deterministically covers every changed owner.

### Production build

The first restricted build produced the known Windows esbuild sandbox denial (`Cannot read directory "../../../../../.."`; Vite config could not resolve). The identical command was rerun outside that filesystem restriction and passed. Final post-adapter result:

```text
npm run build
✓ 883 modules transformed
✓ built in 9.93s
```

Prebuild regenerated the expected 146,080 biomedical map rows, 415 aggregate rows, 352 bubble rows, 415 dates, 352 municipalities, 34 tabular profiles, 38 portable data sources, and the Quorum catalogue with 27 chart types / 2 static types / 40 configured charts. Remaining output is limited to the existing non-module Three/Vanta scripts, mixed static/dynamic `ChartFootprintPicker` import, and chunk-size advisory.

### Retained production browser journey

```text
node node_modules/@playwright/test/cli.js test tests/e2e/static-image.spec.js
```

Fix-round-2 result: all three viewport cases passed when rerun individually. The one reload test remains an explicit Slice-4 `fixme` and was not selected by those viewport-specific commands.

| Viewport | Material checkpoints inspected | Result |
|---|---|---|
| 1440×900 | four Image stages; typed local source/byte-free manifest; normal six-stage chart create/edit afterward; v3/session isolation; Reset/Keep/Discard; repeated replace/undo/cancel cleanup; keyboard crop; controlled 2×3 intrinsic source → 3×2 quarter-turn bounds → asymmetric pixel crop → actual cover/contain scales; unobscured focus; Build/View/fullscreen; reveal without shift; transient zoom/reset; forced recovery; sibling survival; bounded page | Passed, 29.7s |
| 1024×768 | same complete production lifecycle, chart-commit bridge, blob cleanup, natural/source-plane dimensions, rotated bounds, crop mapping, cover/contain scale, and DOM/state assertions at the dense desktop viewport | Passed, 25.2s |
| 768×900 | same complete lifecycle, chart create/edit, cleanup, intrinsic transform geometry including both outer fit modes, focus/control operation, action reveal, stable recovery, and no root horizontal growth at the narrow viewport | Passed, 30.7s |

The fourth test retains the exact reload continuation and is annotated:

```text
IM-06 reload continuation restores the original asset and saved transform
Blocked by Slice 4: authored IndexedDB durability and dashboard/bundle v4 reload are not part of Slice 3.
```

It is intentionally skipped. No reload/durable asset row is reported Passing.

## Documentation and status updates

- Updated `FIDELITY-MATRIX.md` with a binding Slice 3 disposition table separating engine, UI/composition, and fidelity for IM-01–IM-16 plus FT-01/FT-02, PS-01, PS-06–PS-08 intersections.
- Updated `SECURITY-PORTABILITY-DECISIONS.md` for SP-08–SP-14, SP-18, SP-20, SP-22, and the untouched SP-15–SP-17/SP-19/SP-21 boundaries.
- Added `SLICE-3-EVIDENCE-STATUS.md` with browser checkpoints, verification disposition, and the exact phase-order boundary.
- Advanced the progress ledger to Task 3 implementation complete without claiming review clean, reload/import/export/offline durability, or Audience completion.

## Files

Production engine/integration:

- `src/static-content/image/imageAssetValidation.js`
- `src/static-content/image/imageTransform.js`
- `src/static-content/forms/staticContentDraft.js`
- `src/static-content/staticSourceSchema.js`
- `src/static-content/staticSourceResolver.js`
- `src/static-content/staticPanelTransaction.js`
- `src/lib/dashboardCommitController.js`
- `src/App.jsx`
- `src/charting/data/prepareOperationalData.js`
- `src/charting/rendering/operationalAdapter.js`
- `src/charting/rendering/resolveChartRendering.js`

Production UI/composition:

- `src/components/static-content/ImageSourceEditor.jsx`
- `src/components/static-content/ImageTransformEditor.jsx`
- `src/components/static-content/StaticContentWizard.jsx`
- `src/components/charts/ImageChartView.jsx`
- `src/components/charts/ChartView.jsx`
- `src/components/ChartPanel.jsx`
- `src/components/DashboardRenderer.jsx`
- `src/components/dashboard/DashboardCanvas.jsx`
- `src/components/display/DisplayedChartGrid.jsx`
- `src/components/time/SceneViewCompositionGrid.jsx`
- `src/styles/static-content.css`

Tests:

- `tests/imageAssetValidation.test.js`
- `tests/imageTransform.test.js`
- `tests/imageChartView.test.js`
- `tests/imageChartAsync.test.js`
- `tests/fixtures/async-image-harness.html`
- `tests/fixtures/async-image-harness.jsx`
- `tests/fixtures/imageFixtureBytes.js`
- `tests/e2e/static-image.spec.js`
- `tests/staticContentDraft.test.js`
- `tests/staticPanelTransaction.test.js`
- `tests/chartViewV3.test.js`
- `tests/imageChartPackageSource.test.js`

Records:

- `docs/audits/2026-08-24-v3-static-content-panels/FIDELITY-MATRIX.md`
- `docs/audits/2026-08-24-v3-static-content-panels/SECURITY-PORTABILITY-DECISIONS.md`
- `docs/audits/2026-08-24-v3-static-content-panels/SLICE-3-EVIDENCE-STATUS.md`
- `.superpowers/sdd/2026-08-24-static-content-panels/progress.md`
- this report.

## Deviations and remaining concerns

### Phase-order ruling

Task 4 remains the sole owner of authored IndexedDB durability, reference graphs, dashboard/bundle v4, durable object-URL leases, reload/import/export, and offline packaging. Slice 3's session registry and prepared-commit seam exist only to exercise the complete attainable application-session Image lifecycle; they do not serialize assets or reconstruct drafts after reload.

### Evidence boundaries

- The retained production journey accepts PNG through the live authoring UI, and the focused Chromium harness passes exact PNG/JPEG/WebP bytes through the same staging contract plus `createImageBitmap`. The rejected spoof/corrupt/animated/limit matrix remains deterministic engine evidence; exhaustive rejection UI sampling is not claimed.
- Separate Audience, Present protocol identity, durable cross-window local bytes, and Audience failure isolation remain Slice 6/Slice 4 work.
- Explicit browser 200% zoom and exhaustive fullscreen pan/failure boundaries were not independently sampled; the semantic controls, responsive required viewports, active fullscreen route, and deterministic clamp/range rules pass.
- The broad repository unit command remains non-green at 67 failures. No review-clean status is claimed; review is the controller's separate next step.
- The existing production build warnings are unchanged.
