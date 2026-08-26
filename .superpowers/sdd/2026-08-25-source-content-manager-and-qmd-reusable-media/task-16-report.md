# Task 16 Report — Health, Cleanup, and Isolated Recovery

**BASE:** `fd4d5499f7bfacafc6a70a318c11d3ca80641758`

**Rows:** SCM-S14/R08

**Journey:** H — missing corrupt and relink repair stay isolated

## Preflight and RED

- The live coordinator, active-retainer graph, cleanup adapter, and QMD component were already owned by Tasks 3/5/8. The health module and Journey H fixture were absent.
- The initial exact task selection failed as intended on missing `src/content-library/contentHealth.js`; its other existing lifecycle tests remained green.
- The first browser fixture preflight correctly reported no Journey H test. The first new fixture launch exposed Vite/esbuild sandbox config access; after isolated retry with approved local server access, Chromium ran cleanly.

## Implementation

- Added typed health derivation for Ready, External, Missing, Corrupt, Needs relink, and Needs review without changing persistent item identity, revision, or current descriptor.
- Added an explicit repair delegate that only invokes caller-supplied validated prepare/commit transactions; it has no direct persistence path and preserves unrelated sibling state.
- App now reacts to exact coordinator retainer notifications by reconciling authored assets with that current snapshot. Existing startup reconciliation, exact active-retainer graph edges, draft/transaction resolution, and abandoned-stage expiry remain the cleanup authority.
- Unhealthy QMD keeps its logical host but makes no asset resolve/image request, explains the condition, and offers repair only in Build. Source and Media details expose clear Repair/Relink labels; a missing GeoJSON summary keeps its recovery action reachable.

## Deterministic evidence

The required nine-file command passed **130/130** with no skipped/todo:

`node --test tests/contentDraftTransaction.test.js tests/contentHealth.test.js tests/authoredAssetCleanup.test.js tests/dashboardAppV3.test.js tests/dashboardAssetPersistence.test.js tests/qmdMediaView.test.js tests/chartRenderingV3.test.js tests/geoJsonReplacementTransaction.test.js tests/csvReplacementTransaction.test.js`

This includes health identity/recovery delegation; committed-unused and active-retainer byte retention; coordinator lifecycle cleanup; App transport; injected CSV/GeoJSON rollback retaining last-good authority; and QMD no-request/no-image fallback behavior.

## Journey H

`pnpm.cmd test:e2e tests/e2e/source-content-recovery.spec.js --project=chromium --grep "Journey H — missing corrupt and relink repair stay isolated"` passed **1/1**.

At Build 1440×900, missing QMD retained its media identity and health, emitted no `<img>` or resolver request, and exposed a repair control. At View and fullscreen 390×844 it remained a passive explanatory fallback with no repair control, image, or request.

## Scope and residuals

- No Task 17 work, full/release suite, build, or generated `dist` changes.
- PS-04 remains the separately recorded pre-merge generated-client residual.
- The Journey H component fixture verifies the required QMD surface state; its CSV/GeoJSON last-good recovery remains deterministically covered through the existing replacement transaction failures in the exact selection.
