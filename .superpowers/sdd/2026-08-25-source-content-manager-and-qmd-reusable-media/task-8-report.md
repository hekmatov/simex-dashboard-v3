# Task 8 Report — Atomic Global Media Replacement

## Status

DONE for the accepted Task 8 slice. Replace library file everywhere now preserves the logical media identity and every QMD/Image contextual setting, advances one revision atomically, keeps active old-byte leases safe, and rolls back dashboard/store/session/retainer state on failure. Task 9 placement controls and all data-source replacement/relink behavior remain gated and are not claimed.

## RED and GREEN

- Exact RED preceded production: the new transaction test could not load the absent replacement module, and the new authored-store test observed immediate deletion instead of lease-deferred retirement. Twenty-two existing assertions passed. Vite-backed cases also encountered the known sandbox-only esbuild ancestor-read denial.
- Focused transaction/store/coordinator GREEN reached **25/25**.
- Task 8 correction RED was exact and behavioral. Transaction coverage was **7/9**: a concurrent rename/default edit was overwritten by prepare-time metadata, and same-revision manifest-hash drift committed instead of rejecting. Mounted lifecycle cases were **0/1** each: late prepare staged bytes/a retainer after unmount, and committing unmount invoked draft discard.
- Focused correction GREEN is **9/9** transaction plus **8/8** mounted/dialog assertions. The mounted cases use the real React component, raster pipeline, session bytes, and coordinator states.
- Fresh exact command: `node --test tests/contentReplacementTransaction.test.js tests/staticSourceSchema.test.js tests/staticPanelTransaction.test.js tests/imageChartView.test.js tests/qmdMediaView.test.js tests/browserAuthoredAssetStore.test.js` — **42 passed / 0 failed / 0 skipped / 0 todo**, 2.922 s.
- Exact named command, without a literal separator: `pnpm.cmd test:e2e tests/e2e/source-content-media.spec.js --project=chromium --grep "Journey B — global media replacement preserves placement state"` — **1 passed**, 48.2 s test time and 51.3 s total.
- The first browser pass exposed a JSX selector-string compile error and the next reached correct revision-2 rendering but found a test locator ambiguous between the placement host and rendered child. The syntax was corrected and the assertion was narrowed to the revision-bearing view; the Journey then passed unchanged behaviorally.

## Transaction boundary

- Prepare validates through the existing raster staging/decode/budget path, excludes only the superseded unshared asset from replacement budget, rejects identical bytes, and freezes an expected-current plan without mutating the dashboard.
- Commit preserves `mediaId`, increments revision, changes only the logical media record/current manifest, and persists one DashboardV5 candidate. QMD and Image update through that identity; their source/placement records are not rewritten.
- The content draft coordinator retains the media ID plus old/new asset IDs for the complete transaction. It completes only after byte publication and cleanup preparation and fails on any compensated boundary.
- Expected-current revision/source/manifest-hash checks reject stale plans before durable work. Commit rebases replacement-owned fields onto the live media record, so concurrent display-name/default-description edits survive. Injected write, dashboard, and publish failures restore the prior dashboard, byte records, staged session inventory, and retainers.
- Old asset removal is lease-aware: active views keep their object URL and bytes until the last existing lease releases, while new renders acquire the replacement revision.

## UI and viewer boundary

- Media detail adds only Replace library file everywhere. The focused modal owns validated file choice, invalid-input alert, Cancel, explicit confirmation, busy/status feedback, Escape behavior, initial focus, and trigger-focus return through the existing modal focus scope.
- Async preparation is mount/generation owned. A late plan after unmount or mode departure discards its session bytes without staging state; unmount cleanup discards only a `staged` coordinator draft and never races one already `committing`.
- Image load/intrinsic state follows revision bytes, but zoom/pan state follows stable media identity and surface; the active 1.5× viewer state therefore remains exact across replacement.
- QMD and Image expose the current media revision for deterministic surface correspondence. No placement inspector control, global Undo/Redo, or data-source action was added.

## Evidence layers

- **Engine/semantic:** immutable prepare plan; same-identity revision; exact placement snapshot; stale-authority rejection; one-candidate persistence; write/dashboard/publish compensation; coordinator lifetime; dedupe/budget validation; deferred old-byte retirement.
- **Mounted/runtime:** deferred prepare unmount leaves no state/bytes/retainer; committing unmount does not discard; Image/QMD revision changes refresh resolver acquisition while stable media identity retains viewer state.
- **Real browser fidelity:** named Journey B at Build/View/fullscreen covers valid Cancel and Escape with exact dashboard/store/session equality and no retainer, reused QMD/Image update, revision 1→2, exact manifest and rendered-Image JPEG SHA-256, exact contextual equality, retained 1.5× zoom, invalid-candidate no-op, and focus return. Both QMD and Image are inspected in View and fullscreen.

## Row disposition

- **SCM-S08:** Passing for the complete accepted Task 8 semantic and runtime invariant.
- **SCM-R02:** Passing for named Journey B at Build, View, and fullscreen.
- **SCM-C08:** Media-replace branch Passing; overall row remains Partial until later CSV/GeoJSON replacement/relink modals.
- **SCM-SP07 / SCM-D05:** Passing across Task 7 contextual Restore/default ownership and Task 8 atomic global replacement.

No parent `progress.md`, generated output, dependency, full build, full suite, Task 9 control, or data-source replacement owner is included in this commit.
