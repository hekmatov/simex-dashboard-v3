# Slice 5 canonical Build/View/fullscreen evidence

Date: 2026-08-25

Status: implementation complete, review pending

## Layer status

| Area | Engine | UI/composition | Fidelity |
|---|---|---|---|
| Saved Build/View model | Passing for equal saved panel/source identity, content revision, footprint, capabilities, and source semantics | One `DashboardRenderer` → `DashboardModeWorkspace` → `DashboardCanvas` → `ChartPanel` → `ChartView` path renders Build and View. Authoring callbacks exist only in Build | Production routes compare model/content/geometry-owner markers rather than labels at 1440×900, 1024×768, and 768×900 |
| Fullscreen | `DisplayedChartGrid.findChart` returns the same model used by the grid | `FullscreenDisplay` dispatches that model through `ChartView`; Image is active and Free-text owns internal scrolling | Production verifies exact source/revision and content continuity, overflow ownership, action inventory, and trigger-focus return |
| Image failure and recovery | Retry increments an effect-owned resolution attempt; failed and healthy sibling models remain independent | Build exposes Retry plus Replace/Edit through canonical selection. View/fullscreen expose Retry and non-authoring explanation. Failures disclose no raw identity | Controlled failure proves the cell remains stable, Retry recovers, Replace opens the four-stage editor, Cancel returns to the failed cell, and the sibling survives |
| Build restoration | Opening/closing static authoring does not write saved panel placement or chart configuration | The existing Build frame owns transient wide-screen compression. `UnitOrbit` captures selection, scroll, and trigger; modal focus clears/restores correctly | Production inspects selection, panel/document scroll, focused-control clearance, trigger return, computed rectangles, and unchanged chart state around close/cancel/save |
| Intent-revealed Image actions | Capability mapping gives active controls only to View/fullscreen and Build viewer states | Actions overlay the viewer and reveal through hover, focus-within, or explicit touch state, so reveal reserves no new geometry | Production checks resting/revealed action inventory, keyboard/touch discoverability, and invariant viewer/panel rectangles |
| Security and temporal boundaries | Free-text remains permissive inert data; Image validation/resolution remains strict; both static types bypass playback/data preparation | No sanitizer, authored HTML sink, resource-loading text, Chrono/Scene field, or alternate presentation renderer was added | Real routes preserve arbitrary inert text and strict Image source identity. Slice 6 Audience protocol/composition is not claimed |

## Strict RED → GREEN record

1. Durable Image Retry RED timed out because the rejected effect had no way to start a third resolver attempt. GREEN adds a retry nonce owned by `ChartView`; the resolver runs again and the async Image suite passes.
2. Failed-Image Replace/Edit RED recorded no Build selection. GREEN routes the failure action through `ChartPanel`'s shared canonical edit request, respecting the same disabled/build-only boundary.
3. Fullscreen lookup RED found no public `findChart`. GREEN exports and directly verifies the grid lookup used by fullscreen; no static-only lookup or renderer was introduced.
4. Composition RED lacked canonical source/revision evidence on the rendered Image/Free-text owners. GREEN adds data markers to those existing owner nodes and proves the same saved Image model, source revision, footprint, and fullscreen dispatch.
5. Restoration RED had no unit-level return-state authority for document scroll and the initiating control. GREEN adds capture/restore functions to `UnitOrbit`, restoring scroll before focus with `preventScroll`.
6. Initial production focus RED was a test-selector error: the modal is named by `aria-labelledby`, not `aria-label`. Correcting the semantic selector made focus-clearance assertions inspect the real dialog; no product change resulted.
7. The full three-viewport route reached 7/8 with only Free-text 768×900 failing by two document pixels after Discard. Trace evidence showed `BuildWorkspace` smooth-scrolled an already visible focused target after `UnitOrbit` captured its return snapshot. GREEN skips the redundant scroll for visible targets; the focused 768×900 production rerun passed with exact scroll, selection, focus, and geometry restoration.

## Browser checkpoints

- Free-text and Image production journeys use the real application route and the production build at 1440×900, 1024×768, and 768×900.
- Build/View checks compare saved model/source/revision, rendered content, footprint and computed geometry owners, not headings or button labels alone.
- Authoring-open checks measure transient frame compression, focus inside the modal, cleared background control focus, and exact close/cancel/save restoration of selection, document/panel scroll, initiating focus, and chart geometry/configuration.
- Free-text checks exercise panel and fullscreen internal scroll ownership. Image checks exercise saved rotation/crop/fit geometry, resting/revealed action inventory, layout-shift absence, keyboard/touch discovery, fullscreen active viewing, Retry, Replace/Edit, and sibling isolation.
- Clean full matrix: 8/8 passed in 3.2 minutes. Free-text passed at 1440×900 (17.0s), 1024×768 (18.3s), and 768×900 (17.1s), with FT-11 reload in 11.1s. Image passed at 1440×900 (39.2s), 1024×768 (39.8s), and 768×900 (33.7s), with IM-06 reload in 11.6s.

## Verification status

- Final focused directly impacted Node coverage: 48/48 passed in 8.263 seconds after the narrow restoration change. The isolated `findChart` fullscreen test passed 1/1 in 2.588 seconds; the full file retains the inherited unrelated View chrome anomaly below.
- Production build: passed with 890 modules transformed in 8.35 seconds after the restoration change. Existing Three/Vanta classic-script, mixed static/dynamic `ChartFootprintPicker`, and large-chunk advisories are unchanged.
- Pre-fix full production matrix: 7/8 passed in 3.5 minutes; the single failure was the diagnosed 768×900 two-pixel restoration race. Focused post-fix 768×900 Free-text passed 1/1 in 17.2 seconds.
- Final post-fix production matrix: 8/8 passed in 3.2 minutes across all retained routes/viewports and both reload continuations.
- `node scripts/check-v3-runtime-boundaries.mjs` and `git diff --check` passed. The first sandboxed Vite-backed run could not resolve `vite.config.js` because esbuild was denied above the worktree; the identical unrestricted command reached and passed all product assertions.

## Boundaries and known anomalies

- Full `tests/fullscreenDisplay.test.js` retains one inherited expectation for a View `Compare charts` button that current accepted production does not render. The new `findChart` behavior passes in isolation; Slice 5 does not restore obsolete View chrome.
- `rg.exe` is unusable in this Windows environment because its executable association is broken; repository searches used Git/PowerShell without changing product behavior.
- Slice 6 still owns Present/Audience protocol v3, readiness, reconnect, ordering, passive multi-cell composition, and Audience failure isolation. Free-text stays excluded. No Slice 6 row is promoted here.
