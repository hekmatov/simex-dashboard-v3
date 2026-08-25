# Task 1 Report — V5 Registry and Static Image Compatibility

**Status:** DONE

**BASE:** `3bc143f858ae96a66275462b587bd2bc506cf781`

**HEAD / commit:** atomic Task-1 commit with message `feat(content): migrate image rendering to V5 media identity`; final hash is reported to the controller after commit because a commit cannot contain its own stable hash.

## Outcome

Task 1 implementation is complete across the canonical DashboardV5/content-library model, V4→V5 Image migration, full create/edit atomic payload, durable publication, render-context transport, and Build/View/fullscreen/Present/Audience/package consumers. The controller accepted PS-04 as an exact retained generated-client residual: the Node gate is 259/260 because PS-04 copies the deliberately unrebuilt pre-Task-1 compiled `dist`, while refreshing that generated client requires the full build this task explicitly forbids and the plan assigns to the later master-authorized pre-merge gate.

No later Source Content Manager, QMD reusable-media manager, CSV/GeoJSON manager, replacement manager, or cleanup feature was implemented.

## Changed files

### Canonical model and compatibility

- `src/content-library/contentLibrarySchema.js`
- `src/content-library/mediaItems.js`
- `src/content-library/migrateDashboardV4ToV5.js`
- `src/charting/config/dashboardBundleV3.js`
- `src/charting/config/dashboardConfigStructure.js`
- `src/charting/rendering/resolveChartRendering.js`
- `src/charting/runtime/chartPreparationIdentity.js`
- `src/lib/dashboardPackageCandidate.js`
- `src/lib/dashboardPackageExport.js`
- `src/lib/loadDashboard.js`
- `scripts/promote-dashboard-bundle.mjs`

### Static authoring, atomic publication, and asset ownership

- `src/components/static-content/ImageSourceEditor.jsx`
- `src/components/static-content/StaticContentEditor.jsx`
- `src/components/static-content/StaticContentWizard.jsx`
- `src/static-content/assets/assetReferenceGraph.js`
- `src/static-content/assets/durableStaticPanelCommit.js`
- `src/static-content/forms/staticContentDraft.js`
- `src/static-content/staticPanelCapabilities.js`
- `src/static-content/staticPanelTransaction.js`
- `src/static-content/staticSourceResolver.js`
- `src/static-content/staticSourceSchema.js`

### Mounted render-context consumers

- `src/App.jsx`
- `src/components/ChartPanel.jsx`
- `src/components/DashboardRenderer.jsx`
- `src/components/FullscreenDisplay.jsx`
- `src/components/charts/ChartView.jsx`
- `src/components/charts/ImageChartView.jsx`
- `src/components/dashboard/DashboardCanvas.jsx`
- `src/components/dashboard/DashboardModeWorkspace.jsx`
- `src/components/display/DisplayedChartGrid.jsx`
- `src/components/presentation/AudienceDisplay.jsx`
- `src/components/presentation/AudienceSnapshotMonitor.jsx`
- `src/components/presentation/PresentWorkspace.jsx`
- `src/components/presentation/useAudienceStaticAssetReadiness.js`
- `src/lib/presentationProtocol.js`

### Tests

- `tests/helpers/contentLibraryFixtures.js`
- `tests/contentLibrarySchema.test.js`
- `tests/dashboardBundleV5.test.js`
- `tests/dashboardMigrationV5.test.js`
- `tests/mediaItems.test.js`
- `tests/staticContentEditor.test.js`
- `tests/audienceDisplay.test.js`
- `tests/audienceStaticAssetReadiness.test.js`
- `tests/chartRenderingV3.test.js`
- `tests/dashboardAppV3.test.js`
- `tests/dashboardBundleV3.test.js`
- `tests/dashboardPackageCandidate.test.js`
- `tests/dashboardPackageExport.test.js`
- `tests/e2e/static-image-audience.spec.js`
- `tests/e2e/static-image.spec.js`
- `tests/imageChartView.test.js`
- `tests/portableFlashdriveLaunch.test.js`
- `tests/presentWorkspace.test.js`
- `tests/presentationProtocol.test.js`
- `tests/staticContentDraft.test.js`
- `tests/staticContentPortablePackage.test.js`
- `tests/staticPanelComposition.test.js`
- `tests/staticPanelPersistence.test.js`
- `tests/staticPanelTransaction.test.js`
- `tests/staticSourceResolver.test.js`
- `tests/staticSourceSchema.test.js`

### Same-slice records

- `docs/audits/2026-08-24-v3-static-content-panels/SOURCE-CONTENT-MANAGER-AMENDMENT-FIDELITY.md`
- `docs/audits/2026-08-24-v3-static-content-panels/SOURCE-CONTENT-MANAGER-AMENDMENT-SECURITY-DEVIATIONS.md`
- `docs/audits/2026-08-24-v3-static-content-panels/SOURCE-CONTENT-MANAGER-POST-APPROVAL-OWNERSHIP-INVENTORY.md`
- `docs/audits/2026-08-24-v3-static-content-panels/SOURCE-CONTENT-MANAGER-IMPLEMENTATION-EVIDENCE.md`
- `docs/superpowers/plans/2026-08-25-source-content-manager-and-qmd-reusable-media.md`
- `.superpowers/sdd/2026-08-25-source-content-manager-and-qmd-reusable-media/task-1-report.md`

## RED evidence

Focused tests were written before implementation. The first exact Task-1 run failed on the missing V5 registry/migration, V2 placement/media ownership, exact editor payload, atomic candidate, and complete render-context transport. A later focused RED additionally caught premature final validation of an incomplete URL draft. Both intended failures were observed before their minimal implementation.

## GREEN evidence

Fresh exact Node command outside the restrictive filesystem sandbox: 260 tests discovered, 259 passed, 1 failed, 50.9 s. Every focused V5/model/editor/render/Present/Audience/package test passed. PS-04 alone timed out waiting for `Biomedical` after its launcher successfully served a package generated with current V5 data but copied the pre-Task1 compiled `dist`.

The two requested Chromium files select 11 journeys. The single combined live-source runner loses its companion process around three minutes; post-loss results are only `ECONNREFUSED 4174`. Clean bounded partitions passed all 11 journeys:

- Audience saved Image + temporal chart identity/layout/failure/replay.
- Image production journey at 1440×900, 1024×768, and 768×900.
- IM-06 reload continuation.
- IM-02 real PNG/JPEG/WebP intake.
- IM-02 dashboard-budget/browser-quota recovery.
- Dirty static selection retention and explicit Discard.
- Packaged Image guided preview.
- IM-08 200% zoom keyboard/pointer crop at 1440×900 and 1024×768.

## Browser checkpoints

The in-app browser mounted a real uploaded PNG through the four-stage authoring workflow.

- Build 1440×900: placement `static-bd76f3ee-b2f9-4034-82a9-59b4e613dafb`; media `media-static-bd76f3ee-b2f9-4034-82a9-59b4e613dafb`; source/media revision 1; content-media count 1; correct blob/alt; panel 661.5×418.
- View 1440×900: same identity/revisions/count; 635.5×392.
- Fullscreen 1440×900: same identity/revisions/count; 1428×888.
- Present 1440×900: one selected Image scene item and rendered audience-monitor preview.
- View 1024×768: same identity/revisions/count; 427.5×392; horizontal overflow 0.
- Fullscreen 1024×768: same identity/revisions/count; 1012×756; horizontal overflow 0.
- Audience popup: the in-app backend suppressed the separate popup, leaving the controller at `Opening audience display`; no popup tab existed to claim. The real targeted Chromium Audience journey passed.

## Step 7S parser

Fresh scoped result: 36 rows, 36 unique exact IDs (FT-01–12, IM-01–16, PS-01–08), and zero rows with a non-Passing Engine/UI/Fidelity column. The parser is scoped only to `## Final Step 7S controlling 36-row disposition`; later historical/support tables are excluded.

## Documentation/status changes

- SCM-S01/S02/S03 and relevant security/deviation/ownership records now describe Task-1 engine/live wiring only.
- No amendment row was promoted to Passing.
- Task-1 RED and GREEN implementation boxes are checked. The exact-PASS box remains unchecked and carries the PS-04 residual.
- The implementation-evidence record contains the fresh RED/GREEN, Chromium, browser, Step7S, and ruling evidence.

## Rulings and deviations

- **Ruling: scope the Step 7S parser to the controlling section — six later rows repeat accepted IDs — cost if wrong: false drift/downgrade.**
- **Ruling: omit the draft Playwright command's literal `--` token — Playwright treats it as a file expression — cost if wrong: no target journey starts.**
- **Ruling: partition after the deterministic companion watchdog — all post-watchdog failures were connection refusal and each clean partition passed — cost if wrong: a cross-journey leak could be hidden.**
- **Ruling: do not refresh `dist` or down-level V5 to make PS-04 green — either path violates an explicit Task-1 constraint or canonical contract — cost if wrong: exact gate remains 259/260 until an authorized build/release slice.**
- **Controller ruling: accept option 1 and retain PS-04 exactly — the later master-authorized pre-merge gate owns the full build/generated-client refresh — Task 17 cannot claim its row or sweep completely verified until that authorized build reruns PS-04 successfully.**

## Retained residual and Task-17 condition

PS-04 remains a truthful 259/260 exact-gate residual for this Task-1 commit; it is not claimed Passing. The later master-authorized pre-merge gate must refresh the generated client and rerun PS-04. Until it passes there, Task 17 must not claim the affected row or integrated sweep completely verified.

No implementation or focused source behavior is currently failing.

## Fix Round 1 — V5 Image Ownership Invariants

**Status:** DONE. This section records only the five independently validated Task-1 findings T1-01–T1-05; it does not claim the broader review is clean. The retained PS-04 stale-`dist` residual and Task-17 authorized-build condition above are unchanged.

### Changed files

- `src/content-library/contentLibrarySchema.js`
- `src/content-library/mediaItems.js`
- `src/static-content/staticPanelTransaction.js`
- `scripts/promote-dashboard-bundle.mjs`
- `tests/contentLibrarySchema.test.js`
- `tests/mediaItems.test.js`
- `tests/staticPanelTransaction.test.js`
- `tests/staticContentPortablePackage.test.js`

### RED evidence

- T1-01: `node --test tests/contentLibrarySchema.test.js` — 2/3 passed; the new missing-placement-MediaItem case failed with `Missing expected exception`.
- T1-02/T1-03: `node --test tests/staticPanelTransaction.test.js` — 8/10 passed; the undeclared selected staged asset failed with `Missing expected exception`, and exact-budget replacement failed on the unpruned previous asset. The shared-asset and genuine-over-budget guards already passed.
- T1-04: `node --test tests/staticContentPortablePackage.test.js` — 4/5 passed; two logical MediaItems sharing one asset emitted the identical physical path twice.
- T1-05: `node --test tests/mediaItems.test.js` — 3/5 passed; current/origin/external-health and supplied-manifest metadata mismatches were accepted.

### Minimal GREEN implementation

- Every `staticImage` placement now resolves its `mediaId` in `contentLibrary.mediaItems`; unused logical media remains valid.
- A selected asset whose manifest is `staged` must appear in `stagedAssetIds`; rejection occurs on cloned transaction state and inputs remain unchanged.
- Same-MediaItem replacement captures its previous asset and calls the existing reference-aware pruning owner before budget validation. Unreferenced bytes are removed, physically shared bytes remain, exact 200 MiB passes, and 200 MiB + 1 byte still rejects.
- Promotion deduplicates emitted authored paths while rewriting every logical MediaItem to the contained package path, including an unused logical record sharing the physical asset.
- Media validation enforces Task-1 current-kind/origin/external-health coherence and compares supplied dimensions, byte length, and media type with the referenced manifest. Exhaustive health transitions and Task-15 package validation remain deferred.

### GREEN evidence

- Focused: content-library schema 3/3; media items 5/5; static transaction 10/10; portable promotion 5/5.
- Bounded combined correction selection (the four focused files plus V4 migration, V5/V3 bundle, App persistence, and package export): **102/102 passed**, 0 failed, 4.30 s outside the restrictive filesystem sandbox required by the existing Vite App-boundary check.
- No full build, full unit suite, Playwright suite, or PS-04 rerun was performed.

## Fix Round 2 — V5 Image Publication Ownership Gaps

**Status:** DONE. This section records only the two open Task-1 re-review findings T1-02 and T1-03; it does not claim the broader review is clean. The retained PS-04 stale-`dist` residual and Task-17 authorized-build condition above are unchanged.

### Changed files

- `src/static-content/staticPanelTransaction.js`
- `tests/staticPanelTransaction.test.js`
- `.superpowers/sdd/2026-08-25-source-content-manager-and-qmd-reusable-media/task-1-report.md`

### RED evidence

- `node --test tests/staticPanelTransaction.test.js` — **10/12 passed, 2 failed**. The exact staged declaration test failed because an unrelated staged asset was accepted, and the asset-to-URL test failed because the unreferenced previous asset remained in the candidate. The asset-to-URL shared-reference retention guard already passed.

### Minimal GREEN implementation

- `stagedAssetIds` is now validated as an exact, unique declaration of the selected staged Image asset. Omitted selection, unrelated IDs, unknown or non-staged candidates, duplicates, and malformed IDs reject without mutating transaction inputs. Legitimate exact-selected and no-staged transactions remain valid.
- Same-MediaItem replacement now invokes the existing reference-aware pruning owner whenever a previous current asset is no longer current, including asset-to-URL or asset-to-package replacement. Pruning still precedes final budget validation and preserves assets referenced by another logical MediaItem.

### GREEN evidence

- Focused: `node --test tests/staticPanelTransaction.test.js` — **12/12 passed**, 0 failed.
- Bounded combined correction selection: the sandboxed attempt reached **103/104** with only the existing filesystem denial during the App-boundary esbuild/Vite import; the fresh identical command outside that restriction passed **104/104**, 0 failed, 3.54 s.
- No full build, full unit suite, Playwright suite, or PS-04 rerun was performed.
