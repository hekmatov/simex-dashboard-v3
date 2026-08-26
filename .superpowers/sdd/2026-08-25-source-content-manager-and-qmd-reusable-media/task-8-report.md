# Task 8 Report — Atomic Global Media Replacement

## Status

DONE for the accepted Task 8 slice. Replace library file everywhere now preserves the logical media identity and every QMD/Image contextual setting, advances one revision atomically, keeps active old-byte leases safe, and rolls back dashboard/store/session/retainer state on failure. Task 9 placement controls and all data-source replacement/relink behavior remain gated and are not claimed.

## RED and GREEN

- Exact RED preceded production: the new transaction test could not load the absent replacement module, and the new authored-store test observed immediate deletion instead of lease-deferred retirement. Twenty-two existing assertions passed. Vite-backed cases also encountered the known sandbox-only esbuild ancestor-read denial.
- Focused transaction/store/coordinator GREEN reached **25/25**.
- Fresh exact command: `node --test tests/contentReplacementTransaction.test.js tests/staticSourceSchema.test.js tests/staticPanelTransaction.test.js tests/imageChartView.test.js tests/qmdMediaView.test.js tests/browserAuthoredAssetStore.test.js` — **40 passed / 0 failed / 0 skipped / 0 todo**, 2.639 s, including retained ownership when another logical media item shares the superseded physical asset.
- Exact named command, without a literal separator: `pnpm.cmd test:e2e tests/e2e/source-content-media.spec.js --project=chromium --grep "Journey B — global media replacement preserves placement state"` — **1 passed**, 47.3 s test time and 49.8 s total.
- The first browser pass exposed a JSX selector-string compile error and the next reached correct revision-2 rendering but found a test locator ambiguous between the placement host and rendered child. The syntax was corrected and the assertion was narrowed to the revision-bearing view; the Journey then passed unchanged behaviorally.

## Transaction boundary

- Prepare validates through the existing raster staging/decode/budget path, excludes only the superseded unshared asset from replacement budget, rejects identical bytes, and freezes an expected-current plan without mutating the dashboard.
- Commit preserves `mediaId`, increments revision, changes only the logical media record/current manifest, and persists one DashboardV5 candidate. QMD and Image update through that identity; their source/placement records are not rewritten.
- The content draft coordinator retains the media ID plus old/new asset IDs for the complete transaction. It completes only after byte publication and cleanup preparation and fails on any compensated boundary.
- Expected-current revision/asset/hash checks reject stale plans before durable work. Injected write, dashboard, and publish failures restore the prior dashboard, byte records, staged session inventory, and retainers.
- Old asset removal is lease-aware: active views keep their object URL and bytes until the last existing lease releases, while new renders acquire the replacement revision.

## UI and viewer boundary

- Media detail adds only Replace library file everywhere. The focused modal owns validated file choice, invalid-input alert, Cancel, explicit confirmation, busy/status feedback, Escape behavior, initial focus, and trigger-focus return through the existing modal focus scope.
- Image load/intrinsic state follows revision bytes, but zoom/pan state follows stable media identity and surface; the active 1.5× viewer state therefore remains exact across replacement.
- QMD and Image expose the current media revision for deterministic surface correspondence. No placement inspector control, global Undo/Redo, or data-source action was added.

## Evidence layers

- **Engine/semantic:** immutable prepare plan; same-identity revision; exact placement snapshot; stale-authority rejection; one-candidate persistence; write/dashboard/publish compensation; coordinator lifetime; dedupe/budget validation; deferred old-byte retirement.
- **Mounted/runtime:** Image/QMD revision changes refresh resolver acquisition while stable media identity retains viewer state; existing resolver leases release exactly once.
- **Real browser fidelity:** named Journey B at Build/View/fullscreen covers reused QMD/Image update, revision 1→2, hash/render change, exact contextual equality, retained 1.5× zoom, invalid-candidate no-op, scoped modal feedback, and focus return.

## Row disposition

- **SCM-S08:** Passing for the complete accepted Task 8 semantic and runtime invariant.
- **SCM-R02:** Passing for named Journey B at Build, View, and fullscreen.
- **SCM-C08:** Media-replace branch Passing; overall row remains Partial until later CSV/GeoJSON replacement/relink modals.
- **SCM-SP07 / SCM-D05:** Passing across Task 7 contextual Restore/default ownership and Task 8 atomic global replacement.

No parent `progress.md`, generated output, dependency, full build, full suite, Task 9 control, or data-source replacement owner is included in this commit.
