# Task 6 report — Present/Audience compatibility

**Status:** Implementation complete; review pending

**Branch:** `codex/static-content-panels-implementation`

**Starting HEAD:** `098c173eb04d026a266adba284778304ec803e08`

## Delivered contract

- Present now builds one trusted presentable-item index. Existing charts remain trusted chart descriptors; only complete saved Image panels join it. Free text is absent from the selector and cannot be reconstructed from an injected ID.
- Presentation protocol v3 carries ordered exact descriptors. Image is exactly `{ kind: "image", panel_id, source_id, revision }`; the parser rejects stale/unknown identity or revision and every extra URL, blob, byte, transform, crop/fit, Chrono, Scene, frame, or time field.
- Publish, receive, replay, and reconnect revalidate the complete identity/revision snapshot against the current index. A stale replay is ignored instead of being weakened to an untyped panel ID.
- Audience uses the same index and the canonical `DisplayedChartGrid` → `findChart` → `ChartView`/`resolveChartRendering` path. The dedicated Audience readiness hook acquires one window/cell/revision Image lease, releases only its own attempt under StrictMode replay, and isolates pending/failure state to that cell.
- Static sources never receive playback time, enter `prepareChartData`, or join Chrono Groups/Scenes. Build creation/edit/import/migration filtering remains strict. The Scene schema is unchanged.
- Audience Image composition is passive and stable at one, two, and four cells. It exposes no authoring, playback, Retry, crop, fit, or transform controls. Free text has no Audience selector.
- Free text continues to accept arbitrary source and render it inertly under the user override. Task 6 adds no sanitizer, deny-list, DOMPurify, executable-resource path, or Present capability for it.

Two retained-route integration corrections were required. Static hydration now merges ready states for successfully hydrated tabular sources as well as typed static sources, so saving an Image does not make existing charts/Chrono Groups appear unready. Present also holds a mount-scoped playback-view lease, giving its existing synchronized-time controls a live clock while preserving the prior lease owner.

## Strict RED → GREEN record

| Boundary | RED | GREEN |
|---|---|---|
| Protocol/channel | 12 failures against the old v2 ID-set protocol: missing descriptors, loose fields, no trusted identity/revision validation, and unsafe replay acceptance | 15/15 focused protocol/channel tests pass with v3 exact descriptors and publish/receive/replay revalidation |
| Audience composition | 4/6 new tests failed before descriptor-aware passive Image readiness and cell isolation existed | Audience/index/readiness/source-resolver tests pass, including loading, failure, sibling continuation, no controls, exact revision, and lease cleanup |
| Temporal boundary | Static membership and context tests exposed paths that could consume untyped display IDs | Build/Scene/protocol tests prove static exclusion and `ChartView`/resolver tests prove Image receives no playback time or data preparation |
| Hydration integration | New regression assertion observed `dataSourceStates[tabularId].status === undefined` after static hydration | The loader merges successful tabular readiness; the focused persistence test and real synchronized-time journey pass |
| Present clock | Real route reached the group but its slider had `max=0` because Present never opened a playback view | Mount-scoped `openView`/`closeView` lease restores the live clock; the retained time-change and reconnect journey passes |

## Deterministic and build evidence

Command:

```text
node --test tests/presentationProtocol.test.js tests/presentationChannel.test.js tests/presentWorkspace.test.js tests/audienceDisplay.test.js tests/audienceStaticAssetReadiness.test.js tests/staticSourceResolver.test.js tests/staticTemporalBoundary.test.js tests/staticContentRegistry.test.js tests/staticPanelPersistence.test.js tests/dashboardMigrationV4.test.js tests/sceneSchema.test.js
```

Final result: **60/60 passed**, 0 failed, 4.38 seconds. An initial sandboxed final rerun could not let esbuild traverse to the registered worktree's Vite config; the authorized identical rerun above is the product result.

`node scripts/check-v3-runtime-boundaries.mjs` passed. It reported `remoteRuntimeDependencies: []` and confirmed the canonical View, Build, Present, and Audience route through `ChartView`/`resolveChartRendering`.

The production build passed: **891 modules**, 8.19 seconds. The existing informational warnings remain: classic Three/Vanta scripts, mixed `ChartFootprintPicker` import, and chunks over 500 kB.

## Retained production-browser evidence

`tests/e2e/static-image-audience.spec.js` passed **1/1 in 40.4 seconds**.

- Authored arbitrary inert Free text and a durable local Image, then proved Free text was absent from Present.
- Selected the Image with a temporal chart and captured the exact ordered v3 descriptor snapshot with no extra protocol fields.
- Inspected a real separate Audience window at **1920×1080**, including binding **1-, 2-, and 4-cell** 16:9 layouts.
- Advanced the chart from **2020-02-27 to 2020-02-28**. The Image descriptor, source ID, revision, rendered source, and fit transform remained exactly unchanged.
- Removed one Image asset. Its passive cell showed the bounded error with no controls while three chart sibling cells continued rendering and the page retained zero horizontal overflow.
- Restored the exact bytes, closed and reopened Audience, and inspected replay/reconnect at **1366×768**. The same Image identity/revision resolved in the four-cell layout.

The focused retained synchronized Present test passed **1/1 in 15.3 seconds**, including time advance, blackout/recovery, Audience reload, disconnect, reopen, and exact epoch replay. The Task-4 path materially affected by per-window resolution was rerun once: `static-content-portability.spec.js -g "bundle v4 restores local Image and Free-text"` passed **1/1 in 28.5 seconds**, including fresh-context import, offline/service-worker continuation, main/fullscreen Image, inert Free text, and separate Audience.

The binding screenshots were visually inspected at 1920×1080 (one, two, four cells and isolated failure) and 1366×768 (four-cell reconnect). Images were contained, passive errors were centered, chart siblings rendered, and no control or overflow regression was visible. Screenshots remain transient Playwright artifacts; this report records the durable assertions.

## Deviations and known baselines

- No accepted protocol, Audience, sketch, version, or static-temporal design invariant was changed.
- The loader readiness merge and Present playback lease are in-scope corrections exposed by the required real-use journey; without them an existing temporal chart could not coexist with a saved Image in Present.
- The retained observer was corrected to capture moderator-side `BroadcastChannel` posts because a popup listener cannot observe the initial message sent before it subscribes. Slider movement is now boundary-safe, and a duplicate disconnected label is scoped. These are evidence repairs, not product relaxations.
- The full older `three-mode-prototype.spec.js` contains one unrelated stale Build navigation locator (`Dashboard structure > Scenario`) that timed out after 2.5 minutes. The five effective retained presentation cases and the corrected synchronized case pass; Task 6 does not alter that Build navigation.
- A broader legacy Chrono model run continues to contain six pre-existing expected-state failures. The static-specific temporal suite is green; the unrelated corpus was not redundantly rerun.

## Closure

IM-15, IM-16, FT-12, and PS-08 are implementation-complete with engine, mounted UI/composition, and retained production-browser evidence. Final Step 7S ledger rows are reconciled to the current permissive-inert Free-text contract and strict Image contract. Review remains the only pending Task 6 gate.
