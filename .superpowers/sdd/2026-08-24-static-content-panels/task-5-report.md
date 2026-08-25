# Task 5 report — canonical Build/View/fullscreen fidelity

Date: 2026-08-25

Branch: `codex/static-content-panels-implementation`

Starting point: `62674cc704fe179efd52171a742678a6dd8245e0`

Atomic initial implementation commit: `9fee89caf926a2ea03b114e24e0b6d25deee3dab`. The fix-round commit includes this updated report; its resulting SHA is returned to the controller after commit.

## Status

Implementation complete; prior fix rounds 1–2 are complete and independent slice review is clean. Across the review history, 2 Important and 2 Minor findings are addressed and 0 are open. Saved Free-text and Image panels have explicit fidelity evidence through the exact canonical Build/View chain and canonical fullscreen dispatch. Build alone owns authoring actions. View and fullscreen retain only active viewing/recovery allowed by surface capabilities. Static actions preserve saved canvas/chart state and restore selection, scroll, focus, and the initiating control. Final Step 7S master acceptance is pending.

Fix round 1/5 addressed 2 Important and 1 Minor findings: PS-07/IM-13 fullscreen behavior, exact Free-text source identity, and materially usable Build-target clearance were downgraded during RED and restored only after their strengthened component and production-route checks passed. Fix round 2/5 addressed 1 Minor documentation claim so reveal wording matches that canonical clearance contract.

No durable v4 owner, Image validation boundary, Free-text safe-DOM boundary, six-stage Add chart workflow, or four-stage static workflow was replaced. Neither static type enters Chrono Groups, Scenes, data preparation, or playback time. At this slice's original close, Slice 6 still owned Present/Audience protocol and composition; that later slice is now complete and independently review-clean.

## Implemented ownership

- `DashboardRenderer` passes one saved static render model through `DashboardModeWorkspace`, `DashboardCanvas`, `ChartPanel`, and `ChartView` for both Build and View.
- `DisplayedChartGrid.findChart` locates that same model for `FullscreenDisplay`, which continues through `ChartView`. Image fullscreen stays active; Free-text fullscreen owns its internal scroll.
- `ChartPanel.requestEdit` is the single Build edit bridge for ordinary Edit and failed-Image Replace/Edit. View/fullscreen have no authoring callback.
- `ChartView` owns an Image retry nonce. Every Retry begins a new effect-owned attempt while preserving per-attempt release on replay, supersession, and unmount.
- `UnitOrbit` owns return-state capture/restore. `BuildWorkspace` avoids scrolling targets only when at least the canonical 240×160 area is visible; materially unusable clipped or offscreen targets scroll once and wait for usable clearance. `modes.css` remains the sole transient Build compression owner.
- The canonical Free-text and Image content nodes expose source/revision evidence markers. These markers report existing saved identity and do not create another data or render contract.
- `buildCanvasRestoration.js::selectedTargetRevealDecision` owns reveal completion through the existing 240×160 `selectedTargetUsability` contract. `BuildWorkspace` scrolls only the first unusable frame and waits until the target is materially usable.

## Strict RED → GREEN

1. Image resolver Retry: RED timed out waiting for a third attempt after a durable failure. GREEN starts a fresh effect attempt; async Image tests pass.
2. Failed-Image Replace/Edit: RED recorded no canonical Build selection. GREEN shares the panel Edit bridge and respects the disabled/build-only boundary.
3. Fullscreen lookup: RED had no exported `findChart`. GREEN verifies the exact public lookup used by the fullscreen owner.
4. Build/View composition: RED lacked content-owner source/revision markers and a saved-model equality test. GREEN proves equal Image model/source/footprint through Build, View, and fullscreen plus real-route Free-text equality.
5. Return-state ownership: RED had no document-scroll/trigger snapshot API. GREEN restores scroll before focus with `preventScroll`; the UnitOrbit suite passes.
6. Production focus selector: the first route run failed all focus checks because the test looked for `aria-label` while the real dialog uses `aria-labelledby`. The semantic selector was corrected; no product change.
7. Narrow restoration: the corrected full matrix passed 7/8. Free-text at 768×900 restored to 5381 instead of 5379 because a redundant smooth scroll was still animating after Discard. GREEN skips scroll only for a reveal target meeting the canonical 240×160 material-usability threshold; focused 768×900 passed with exact restoration.

## Fix round 1/5 strict RED → GREEN

1. Material-usability regression RED: a 400×1 visible sliver satisfied the raw intersection guard even though the canonical Build usability contract rejected it. The boundary test failed on the absent reveal decision. GREEN derives scroll/completion from `selectedTargetUsability`; fully usable, 1px sliver, below-threshold partial, offscreen, and post-scroll-wait states pass, and the strengthened 768×900 route preserves exact scroll/focus restoration.
2. Fullscreen evidence RED: retained production checked only attached controls/content and ordinary View behavior. GREEN independently proves Image rest/hover/focus/touch reveal without geometry shift, zoom plus Reset view without saved-geometry mutation, real durable `asset-read-failed` → restore → fullscreen Retry recovery with sibling survival, and focus return at all three viewports. Free-text controlled overflow changes fullscreen `scrollTop` while retaining the canonical overflow owner.
3. Free-text source identity RED: the saved panel source ID was concrete but the browser composition helper returned `undefined`. GREEN reads `data-static-source-id` and compares exact ID/revision/content across Build, View, and fullscreen; active/passive component routing verifies the same identity.

## Browser checkpoints and viewports

- 1440×900 and 1024×768: Free-text and Image routes pass saved model/content/geometry ownership, transient compression, authoring action inventory, focus/selection/scroll restoration, Build/View equality, fullscreen continuity, and failure isolation.
- 768×900: Image passed the complete route. Free-text exposed the two-pixel restoration race, then passed the focused post-fix route.
- Free-text checkpoints include panel/fullscreen scroll ownership and exact saved QMD/revision continuity.
- Image checkpoints include source revision, intrinsic/rotated/crop/fit geometry, resting/revealed action inventory, no reveal layout shift, keyboard/touch discoverability, active fullscreen, Retry, Replace/Edit/Cancel, and sibling survival.
- Fix-round strengthened matrix: 8/8 passed in 3.3 minutes. Free-text passed at 1440×900 (16.3s), 1024×768 (19.2s), and 768×900 (15.5s), with FT-11 reload in 9.8s. Image passed at 1440×900 (42.0s), 1024×768 (44.7s), and 768×900 (35.5s), with IM-06 reload in 12.1s.

## Checks and build

- Fix-round focused directly impacted Node command passed 49/49 in 8.016 seconds. The isolated canonical `findChart` fullscreen test passed 1/1 in 2.438 seconds.
- Fix-round production build passed with 890 modules transformed in 9.29 seconds.
- Pre-fix full production matrix passed 7/8 in 3.5 minutes; focused post-fix Free-text 768×900 passed 1/1 in 17.2 seconds.
- Fix-round strengthened production matrix passed 8/8 in 3.3 minutes. `node scripts/check-v3-runtime-boundaries.mjs` passed; final diff checks run before commit.

## Deviations, skips, and baseline anomalies

- Responsive implementation follows accepted 023A: at 900px and above the existing page frame compresses transiently; below 900px the existing overlay remains. Both restore the exact saved canvas and state. This is a responsive expression, not saved-layout divergence.
- The earlier raw visible-target guard was too broad. Fix round 1 narrows the skip to canonical material usability while preserving the original no-scroll correction for genuinely usable targets; this is a fidelity correction, not a product-design change.
- Full `tests/fullscreenDisplay.test.js` retains one unrelated baseline expectation for a View `Compare charts` button absent from accepted current production. The new `findChart` test passes in isolation; no obsolete chrome was restored.
- Vite-backed Node tests cannot resolve `vite.config.js` inside the restricted Windows sandbox because esbuild is denied while walking above the worktree. The identical unrestricted command reached and passed all 49 selected product assertions; this is an environment constraint, not a product failure.
- Existing production-build notices remain: Three/Vanta classic scripts, mixed static/dynamic `ChartFootprintPicker`, and large output chunk.
- Slice 6 remains deferred: Present/Audience protocol v3, readiness, reconnect, ordering, passive composition, and Audience failure isolation. No Audience fidelity is claimed.
