# Task 5 report — canonical Build/View/fullscreen fidelity

Date: 2026-08-25

Branch: `codex/static-content-panels-implementation`

Starting point: `62674cc704fe179efd52171a742678a6dd8245e0`

Atomic implementation commit: this report is included in the commit; the resulting SHA is returned to the controller after commit.

## Status

Implementation complete, review pending. Saved Free-text and Image panels now have explicit fidelity evidence through the exact canonical Build/View chain and canonical fullscreen dispatch. Build alone owns authoring actions. View and fullscreen retain only active viewing/recovery allowed by surface capabilities. Static actions preserve saved canvas/chart state and restore selection, scroll, focus, and the initiating control.

No durable v4 owner, Image validation boundary, Free-text safe-DOM boundary, six-stage Add chart workflow, or four-stage static workflow was replaced. Neither static type enters Chrono Groups, Scenes, data preparation, or playback time. Slice 6 Present/Audience protocol and composition remain pending.

## Implemented ownership

- `DashboardRenderer` passes one saved static render model through `DashboardModeWorkspace`, `DashboardCanvas`, `ChartPanel`, and `ChartView` for both Build and View.
- `DisplayedChartGrid.findChart` locates that same model for `FullscreenDisplay`, which continues through `ChartView`. Image fullscreen stays active; Free-text fullscreen owns its internal scroll.
- `ChartPanel.requestEdit` is the single Build edit bridge for ordinary Edit and failed-Image Replace/Edit. View/fullscreen have no authoring callback.
- `ChartView` owns an Image retry nonce. Every Retry begins a new effect-owned attempt while preserving per-attempt release on replay, supersession, and unmount.
- `UnitOrbit` owns return-state capture/restore. `BuildWorkspace` reveals only offscreen targets, avoiding an unnecessary smooth-scroll race for already visible panels. `modes.css` remains the sole transient Build compression owner.
- The canonical Free-text and Image content nodes expose source/revision evidence markers. These markers report existing saved identity and do not create another data or render contract.

## Strict RED → GREEN

1. Image resolver Retry: RED timed out waiting for a third attempt after a durable failure. GREEN starts a fresh effect attempt; async Image tests pass.
2. Failed-Image Replace/Edit: RED recorded no canonical Build selection. GREEN shares the panel Edit bridge and respects the disabled/build-only boundary.
3. Fullscreen lookup: RED had no exported `findChart`. GREEN verifies the exact public lookup used by the fullscreen owner.
4. Build/View composition: RED lacked content-owner source/revision markers and a saved-model equality test. GREEN proves equal Image model/source/footprint through Build, View, and fullscreen plus real-route Free-text equality.
5. Return-state ownership: RED had no document-scroll/trigger snapshot API. GREEN restores scroll before focus with `preventScroll`; the UnitOrbit suite passes.
6. Production focus selector: the first route run failed all focus checks because the test looked for `aria-label` while the real dialog uses `aria-labelledby`. The semantic selector was corrected; no product change.
7. Narrow restoration: the corrected full matrix passed 7/8. Free-text at 768×900 restored to 5381 instead of 5379 because a redundant smooth scroll was still animating after Discard. GREEN skips scroll for an already visible reveal target; focused 768×900 passed with exact restoration.

## Browser checkpoints and viewports

- 1440×900 and 1024×768: Free-text and Image routes pass saved model/content/geometry ownership, transient compression, authoring action inventory, focus/selection/scroll restoration, Build/View equality, fullscreen continuity, and failure isolation.
- 768×900: Image passed the complete route. Free-text exposed the two-pixel restoration race, then passed the focused post-fix route.
- Free-text checkpoints include panel/fullscreen scroll ownership and exact saved QMD/revision continuity.
- Image checkpoints include source revision, intrinsic/rotated/crop/fit geometry, resting/revealed action inventory, no reveal layout shift, keyboard/touch discoverability, active fullscreen, Retry, Replace/Edit/Cancel, and sibling survival.
- Clean final matrix: 8/8 passed in 3.2 minutes. Free-text passed at 1440×900 (17.0s), 1024×768 (18.3s), and 768×900 (17.1s), with FT-11 reload in 11.1s. Image passed at 1440×900 (39.2s), 1024×768 (39.8s), and 768×900 (33.7s), with IM-06 reload in 11.6s.

## Checks and build

- Final focused directly impacted Node command passed 48/48 in 8.263 seconds after the last restoration change. The isolated canonical `findChart` fullscreen test passed 1/1 in 2.588 seconds.
- Production build after the restoration change passed with 890 modules transformed in 8.35 seconds.
- Pre-fix full production matrix passed 7/8 in 3.5 minutes; focused post-fix Free-text 768×900 passed 1/1 in 17.2 seconds.
- Final post-fix production matrix passed 8/8 in 3.2 minutes. `node scripts/check-v3-runtime-boundaries.mjs` and `git diff --check` passed.

## Deviations, skips, and baseline anomalies

- Responsive implementation follows accepted 023A: at 900px and above the existing page frame compresses transiently; below 900px the existing overlay remains. Both restore the exact saved canvas and state. This is a responsive expression, not saved-layout divergence.
- The redundant visible-target smooth-scroll guard is a fidelity correction discovered by the retained journey, not a product-design change.
- Full `tests/fullscreenDisplay.test.js` retains one unrelated baseline expectation for a View `Compare charts` button absent from accepted current production. The new `findChart` test passes in isolation; no obsolete chrome was restored.
- Vite-backed Node tests cannot resolve `vite.config.js` inside the restricted Windows sandbox because esbuild is denied while walking above the worktree. The identical unrestricted command reached and passed all 49 selected product assertions; this is an environment constraint, not a product failure.
- Existing production-build notices remain: Three/Vanta classic scripts, mixed static/dynamic `ChartFootprintPicker`, and large output chunk.
- Slice 6 remains deferred: Present/Audience protocol v3, readiness, reconnect, ordering, passive composition, and Audience failure isolation. No Audience fidelity is claimed.
