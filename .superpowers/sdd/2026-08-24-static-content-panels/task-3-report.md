# Task 3 report — Image enhancement vertical slice

Date: 2026-08-25

Branch: `codex/static-content-panels-implementation`

Starting point: `99d90c4`

Atomic implementation commit: this report is part of the single slice commit; the resulting hash is reported to the controller after commit.

## Status

Complete for every Image behavior attainable before Slice 4 durability and independently testable as an in-session vertical slice. The typed Image source/validation/transform engine, four-stage authoring route, canonical Build/View/fullscreen renderer, active viewer, passive surface contract, and in-session create/edit/cancel/save lifecycle are implemented and verified.

IM-14 is deliberately not reported as fully Passing. The retained create → reload continuation is a narrow `fixme` with the exact reason `Blocked by Slice 4: authored IndexedDB durability and dashboard/bundle v4 reload are not part of Slice 3.` IM-15/IM-16 and separate Audience asset readiness/failure remain Slice 6 plus the Slice 4 durable identity dependency.

The user-directed permissive inert-text override was not applied to Image. Image retains strict signature, structure, decode, animation, origin, resource, accessibility, and recovery validation.

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
- `ImageChartView` applies saved crop/rotation/fit outside a separate transient pan/zoom layer. Active surfaces provide 1–3× zoom in quarter steps, clamped pan, Reset view, keyboard operations, and semantic buttons. Passive surfaces render no controls.
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
node --test tests/staticContentRegistry.test.js tests/staticSourceSchema.test.js tests/staticPanelPersistence.test.js tests/staticPanelTransaction.test.js tests/staticContentDraft.test.js tests/imageAssetValidation.test.js tests/imageTransform.test.js tests/imageChartView.test.js tests/imageChartPackageSource.test.js tests/chartViewV3.test.js tests/sceneViewComposition.test.js tests/chartSchemasV3.test.js tests/panelEditingV3.test.js tests/chartDataPipelineV3.test.js
```

Final result:

```text
tests 151
pass 151
fail 0
duration_ms 4779.1364
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

This broad command is recorded non-green and is not used to promote the slice. The failures include the existing raw-JSX Node-loader class introduced by prior JSX-backed component imports plus unrelated temporal/data/profile/application-baseline assertions. The 151-test directly impacted set is green; the 67 broad failures are not claimed fixed, accepted, or owned by Slice 3.

### Production build

The first restricted build produced the known Windows esbuild sandbox denial (`Cannot read directory "../../../../../.."`; Vite config could not resolve). The identical command was rerun outside that filesystem restriction and passed. Final post-adapter result:

```text
npm run build
✓ 883 modules transformed
✓ built in 9.81s
```

Prebuild regenerated the expected 146,080 biomedical map rows, 415 aggregate rows, 352 bubble rows, 415 dates, 352 municipalities, 34 tabular profiles, 38 portable data sources, and the Quorum catalogue with 27 chart types / 2 static types / 40 configured charts. Remaining output is limited to the existing non-module Three/Vanta scripts, mixed static/dynamic `ChartFootprintPicker` import, and chunk-size advisory.

### Retained production browser journey

```text
node node_modules/@playwright/test/cli.js test tests/e2e/static-image.spec.js
```

Final result:

```text
3 passed
1 skipped
duration 50.4s
```

| Viewport | Material checkpoints inspected | Result |
|---|---|---|
| 1440×900 | four stages; typed local source/byte-free manifest; storage isolation; Reset image; Keep/Discard; replacement/alt review/undo; keyboard crop and quarter turn; canonical saved crop/alt; unobscured focus; Build/View/fullscreen; rest/hover/focus/touch reveal without shift; transient zoom/reset; forced Build/View failure inventory; raw-ID suppression; sibling survival; bounded page | Passed, 15.8s |
| 1024×768 | same complete in-session lifecycle and production DOM/state assertions at the dense desktop viewport | Passed, 14.8s |
| 768×900 | same complete lifecycle, focus/control operation, action reveal, stable error recovery, and no root horizontal growth at the narrow viewport | Passed, 17.5s |

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

- The retained browser journey accepts PNG in production; the full accepted PNG/JPEG/WebP and rejected spoof/corrupt/animated/limit matrix is deterministic engine evidence, not an overclaimed production-browser corpus.
- Separate Audience, Present protocol identity, durable cross-window local bytes, and Audience failure isolation remain Slice 6/Slice 4 work.
- Explicit browser 200% zoom and exhaustive fullscreen pan/failure boundaries were not independently sampled; the semantic controls, responsive required viewports, active fullscreen route, and deterministic clamp/range rules pass.
- The broad repository unit command remains non-green at 67 failures. No review-clean status is claimed; review is the controller's separate next step.
- The existing production build warnings are unchanged.
