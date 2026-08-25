# Slice 5 canonical Build/View/fullscreen evidence

Date: 2026-08-25

Status: implementation complete, review pending

Fix round: 1/5 — 2 Important and 1 Minor findings addressed, 0 open; the temporarily downgraded PS-07/IM-13 fullscreen behavior, exact Free-text source identity, and materially usable reveal clearance claims are restored

## Layer status

| Area | Engine | UI/composition | Fidelity |
|---|---|---|---|
| Saved Build/View model | Passing for equal saved panel/source identity, content revision, footprint, capabilities, and source semantics | One `DashboardRenderer` → `DashboardModeWorkspace` → `DashboardCanvas` → `ChartPanel` → `ChartView` path renders Build and View. Authoring callbacks exist only in Build | Production compares exact Free-text source ID/revision/content and Image source/geometry owners rather than labels at 1440×900, 1024×768, and 768×900 |
| Fullscreen | `DisplayedChartGrid.findChart` returns the same model used by the grid | `FullscreenDisplay` dispatches that model through `ChartView`; Image is active and Free-text owns internal scrolling | At all three viewports, Image independently proves rest/hover/focus/touch reveal, no geometry shift, zoom/Reset view with unchanged saved geometry, and focus return. Free-text uses controlled overflow and changes `scrollTop` while retaining `overflow-y: auto` |
| Image failure and recovery | Retry increments an effect-owned resolution attempt; failed and healthy sibling models remain independent | Build exposes Retry plus Replace/Edit through canonical selection. View/fullscreen expose Retry and non-authoring explanation. Failures disclose no raw identity | At all three viewports, the real durable record is removed, fullscreen reaches `asset-read-failed`, the same bytes are restored, Retry recovers a visible `blob:` image, the sibling remains attached, and focus returns |
| Build restoration | Opening/closing static authoring does not write saved panel placement or chart configuration. Reveal completion uses canonical 240×160 material usability | The existing Build frame owns transient wide-screen compression. `UnitOrbit` captures selection, scroll, and trigger; fully usable targets skip scroll while clipped/offscreen targets scroll once and wait | Boundary tests cover full, 1px sliver, below-threshold partial, offscreen, and post-scroll wait states. Production at 768×900 preserves exact selection, panel/document scroll, focus, and geometry around static actions |
| Intent-revealed Image actions | Capability mapping gives active controls only to View/fullscreen and Build viewer states | Actions overlay the viewer and reveal through hover, focus-within, or explicit touch state, so reveal reserves no new geometry | The real fullscreen surface independently exercises all reveal paths, zoom, Reset view, invariant saved geometry, and trigger return at each material viewport |
| Security and temporal boundaries | Free-text remains permissive inert data; Image validation/resolution remains strict; both static types bypass playback/data preparation | No sanitizer, authored HTML sink, resource-loading text, Chrono/Scene field, or alternate presentation renderer was added | Real routes preserve arbitrary inert text and strict Image source identity. Slice 6 Audience protocol/composition is not claimed |

## Strict RED → GREEN record

1. Durable Image Retry RED timed out because the rejected effect had no way to start a third resolver attempt. GREEN adds a retry nonce owned by `ChartView`; the resolver runs again and the async Image suite passes.
2. Failed-Image Replace/Edit RED recorded no Build selection. GREEN routes the failure action through `ChartPanel`'s shared canonical edit request, respecting the same disabled/build-only boundary.
3. Fullscreen lookup RED found no public `findChart`. GREEN exports and directly verifies the grid lookup used by fullscreen; no static-only lookup or renderer was introduced.
4. Composition RED lacked canonical source/revision evidence on the rendered Image/Free-text owners. GREEN adds data markers to those existing owner nodes and proves the same saved Image model, source revision, footprint, and fullscreen dispatch.
5. Restoration RED had no unit-level return-state authority for document scroll and the initiating control. GREEN adds capture/restore functions to `UnitOrbit`, restoring scroll before focus with `preventScroll`.
6. Initial production focus RED was a test-selector error: the modal is named by `aria-labelledby`, not `aria-label`. Correcting the semantic selector made focus-clearance assertions inspect the real dialog; no product change resulted.
7. The full three-viewport route reached 7/8 with only Free-text 768×900 failing by two document pixels after Discard. Trace evidence showed `BuildWorkspace` smooth-scrolled a focused target that already met the canonical 240×160 material-usability threshold after `UnitOrbit` captured its return snapshot. GREEN skips the redundant scroll only for materially usable targets; the focused 768×900 production rerun passed with exact scroll, selection, focus, and geometry restoration.

## Fix round 1/5 strict RED → GREEN

1. Material clearance RED: the reveal effect used any viewport intersection, so even a 400×1 sliver completed immediately despite `selectedTargetUsability` classifying it unusable. The new boundary test failed because no canonical reveal decision existed. GREEN adds `selectedTargetRevealDecision`, delegates to the existing 240×160 usability calculation, scrolls only the first unusable frame, and waits until material clearance. Fully usable, 1px, below-threshold partial, offscreen, and post-scroll-wait cases pass 5/5 within `buildWorkspaceV3` 7/7.
2. Fullscreen behavioral evidence RED: the retained journey only checked that controls/labels existed; hover/focus/touch, no-shift, zoom/reset, real scroll, and durable Retry were unproven. GREEN independently exercises all Image paths and saved-geometry invariance, changes controlled Free-text fullscreen `scrollTop`, and removes/restores the actual durable Image record so canonical fullscreen Retry visibly recovers while a sibling survives. The three-viewport production matrix passes.
3. Exact Free-text identity RED: the saved panel held a concrete source ID, but the production composition helper returned `undefined`; the 1440×900 assertion failed at that exact comparison. GREEN reads the canonical `data-static-source-id` marker and compares ID/revision/content through Build, View, and fullscreen. The component behavior test also verifies the same ID/revision in active and passive routing.

## Browser checkpoints

- Free-text and Image production journeys use the real application route and the production build at 1440×900, 1024×768, and 768×900.
- Build/View checks compare saved model/source/revision, rendered content, footprint and computed geometry owners, not headings or button labels alone.
- Authoring-open checks measure transient frame compression, focus inside the modal, cleared background control focus, and exact close/cancel/save restoration of selection, document/panel scroll, initiating focus, and chart geometry/configuration.
- Free-text checks exercise panel and fullscreen internal scroll ownership. Image checks exercise saved rotation/crop/fit geometry, resting/revealed action inventory, layout-shift absence, keyboard/touch discovery, fullscreen active viewing, Retry, Replace/Edit, and sibling isolation.
- Fix-round strengthened matrix: 8/8 passed in 3.3 minutes. Free-text passed at 1440×900 (16.3s), 1024×768 (19.2s), and 768×900 (15.5s), with FT-11 reload in 9.8s. Image passed at 1440×900 (42.0s), 1024×768 (44.7s), and 768×900 (35.5s), with IM-06 reload in 12.1s.

## Verification status

- Fix-round focused directly impacted Node coverage: 49/49 passed in 8.016 seconds. The isolated `findChart` fullscreen test passed 1/1 in 2.438 seconds; the full file retains the inherited unrelated View chrome anomaly below.
- Fix-round production build: passed with 890 modules transformed in 9.29 seconds. Existing Three/Vanta classic-script, mixed static/dynamic `ChartFootprintPicker`, and large-chunk advisories are unchanged.
- Pre-fix full production matrix: 7/8 passed in 3.5 minutes; the single failure was the diagnosed 768×900 two-pixel restoration race. Focused post-fix 768×900 Free-text passed 1/1 in 17.2 seconds.
- Fix-round production matrix: 8/8 passed in 3.3 minutes across all strengthened routes/viewports and both reload continuations.
- `node scripts/check-v3-runtime-boundaries.mjs` and `git diff --check` passed. The first sandboxed Vite-backed run could not resolve `vite.config.js` because esbuild was denied above the worktree; the identical unrestricted command reached and passed all product assertions.

## Boundaries and known anomalies

- Full `tests/fullscreenDisplay.test.js` retains one inherited expectation for a View `Compare charts` button that current accepted production does not render. The new `findChart` behavior passes in isolation; Slice 5 does not restore obsolete View chrome.
- `rg.exe` is unusable in this Windows environment because its executable association is broken; repository searches used Git/PowerShell without changing product behavior.
- Slice 6 still owns Present/Audience protocol v3, readiness, reconnect, ordering, passive multi-cell composition, and Audience failure isolation. Free-text stays excluded. No Slice 6 row is promoted here.
