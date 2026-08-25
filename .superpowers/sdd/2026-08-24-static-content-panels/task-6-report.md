# Task 6 report — Present/Audience compatibility

**Status:** Fix round 2/5 addressed; two Important evidence groups closed, implementation complete, review pending

The initial implementation evidence below remains provenance. This fix round adds the missing trusted-index, synchronous layout, playback-owner, and retained intended-use evidence without weakening permissive-inert Free text or strict Image validation.

**Branch:** `codex/static-content-panels-implementation`

**Starting HEAD:** `098c173eb04d026a266adba284778304ec803e08`

## Fix round 2/5 closure

Both Important evidence groups are addressed without changing the binding journey wording:

- `ChartView` now places the normalized active `YYYY-MM-DD` on its canonical rendered frame when, and only when, a finite temporal context reaches the chart. The separate-Audience journey independently asserts that the representative chart's active date and canvas pixel hash both change. Image descriptor, source ID, revision, rendered source, and transform remain exact.
- The four-cell failure composition now selects three charts from the same Chrono Group. Before and after the failed-Image time change, every sibling must be a chart, expose a valid active date, and own a nonzero rendered canvas. Each of all three independently changes both active date and canvas hash. The failed Image stays passive/control-free and exact revision replay remains unchanged.
- FT-05 runs the same saved panel in View and fullscreen while online and after `context.setOffline(true)`. Safe external and scoped-fragment links are activated by both keyboard and pointer across the two surfaces; offline external attempts reach Chromium's bounded network-error page, scoped fragments remain local, and unsafe schemes/raw markup create no unauthorized request, resource, script, or navigation.
- FT-06 traverses all six named source/nesting/table/node/math limit cases first in create and again through the saved-panel edit route. Every exact error blocks progression, error focus and current-session source survive, the last valid preview remains, correction recovers, Keep/Discard retain the invalid edit in-session then restore the saved source, and localStorage never contains a boundary draft.
- IM-08 runs independent actual page-scale 2.0 cases at both binding viewports, 1440×900 and 1024×768. Keyboard move, pointer move/resize, visible focus/control geometry, and document/dialog horizontal containment all pass.

Verification:

- Initial RED: Audience failed because the canonical frame exposed no chart date (`Received string: ""`); FT-05 reached `chrome-error://chromewebdata/` under genuine offline mode rather than the prior online URL expectation. FT-06's new complete create/edit case and both new IM-08 viewport cases were already green.
- Focused canonical regressions: **51/51 passed** in 3.59 seconds.
- Runtime boundary: **passed**, with no remote runtime dependency and canonical ChartView ownership in all four modes.
- Production build: **passed**, **891 modules** in **9.47 seconds**; only the existing informational warnings remain.
- Strengthened Image/Audience journey: **1/1 passed in 29.7 seconds** at 1920×1080 and 1366×768.
- Strengthened FT-05/FT-06: **2/2 passed in 1.2 minutes**.
- Dual-viewport IM-08: **2/2 passed in 8.9 seconds**.

No sanitizer, deny-list, DOMPurify, executable/resource authority, static time context, Scene/Chrono membership, protocol field, object URL, asset byte, transform, or retry/authoring Audience control was added.

## Fix round 1/5 closure

All five Important findings are addressed:

- The trusted index admits an Image only when its saved source has complete identity/revision, valid alt/transform semantics, an allowed non-recovery origin, no recovery warning, and—when asset-backed—a matching complete durable manifest. `replacementRequired`, missing, incomplete, and stale-recovery Images are absent from Present and rejected by Audience.
- `reconcilePresentDisplayState` and `reconcilePresentationState` filter current trusted descriptors and choose a count-valid layout synchronously. The publish boundary repeats reconciliation, so shrink, revision change, replay, and reconnect cannot publish an invalid intermediate layout.
- Playback view ownership is tokenized. Present owns one stable StrictMode token and releases only that token; pre-existing, overlapping, replayed, and legacy owners retain compatible state semantics.
- The live separate-window journey injects a stale/malicious Free-text v3 envelope through the real channel, proves accepted cells are unchanged, changes actual temporal chart date/pixels while Image identity/render stays exact, changes charts again through an isolated passive Image failure, and restores/replays the exact Image revision.
- The formerly partial FT-05, FT-06, IM-02, IM-08, and PS-04 rows now have binding intended-use evidence: link activation, every resource limit, the complete real-raster intake corpus, true 200% browser zoom crop editing, and an actually copied/launched/offline Windows portable package.

### Fix-round verification

- Core trusted-index/layout/channel/playback suite: **35/35 passed**.
- Final affected Node sweep: **77/78 passed**. Every 77 executed assertion passed, including the copied Windows launcher journey. The only failure is the unchanged legacy `playbackComponentsV3.test.js` raw-Node loader, which aborts before assertions because Node parses imported `FreeTextChartView.jsx` as JavaScript without JSX transformation.
- Runtime boundary: **passed**, `remoteRuntimeDependencies: []`, with canonical View/Build/Present/Audience `ChartView` entrypoints.
- Production build: **passed**, **891 modules**, **9.68 seconds**. Existing Three/Vanta, mixed `ChartFootprintPicker` import, and chunk-size warnings remain informational.
- `static-image-audience.spec.js`: **1/1 passed in 52.7 seconds** at 1920×1080 and 1366×768, including 1/2/4-cell layouts, real-channel rejection, two temporal changes, isolated failure, and exact replay.
- `static-free-text.spec.js --grep "FT-0[56]"`: **2/2 passed in 39.0 seconds**.
- `static-image.spec.js --grep "IM-0[28]"`: **3/3 passed in 37.0 seconds**.
- `portableFlashdriveLaunch.test.js`: **1/1 passed** through a real copied package and generated PowerShell launcher; exact PNG bytes and `image/png` MIME, traversal denial, offline main and passive 1366×768 separate Audience, zero external requests, server stop, and exact temporary-copy removal were asserted.

### Retained fixture detail

- FT-05 covers safe external/local and fragment links plus JavaScript (plain/encoded), data, blob, file, mail, and raw-HTML source. View pointer and fullscreen keyboard activate only the bounded safe local target; unsafe forms stay inert and create no request/navigation/resource.
- FT-06 traverses 102,401 source bytes, nesting depth 7, 21 table columns, 101 table rows, 5,001 generated nodes, and a 5,946-node math expansion. Each exact typed error blocks progression, preserves the current-session source/last-valid preview, focuses the error, recovers after correction, and leaves no draft in storage.
- IM-02 uses decoder-valid PNG/JPEG/WebP and controlled spoof, corrupt/truncated, CRC-valid APNG, animated WebP, 12 MiB + 1 byte, 16,385-pixel dimension, 50.01-megapixel, unsafe URL/path/protocol, complete-manifest dashboard budget, and browser-quota fixtures. Replacement and exact typed recovery are exercised through the live authoring UI.
- IM-08 uses Chromium `Emulation.setPageScaleFactor(2)`, keyboard and pointer crop move/resize, visible focused controls, changed geometry, and document/dialog horizontal containment.
- PS-04 builds a fixture from the real production `dist`, promotion, portable-data generator, and Image payload; copies the generated package to a second directory; launches its own `start-dashboard-server.ps1`; runs browser offline after service-worker activation; then kills the launcher and recursively removes only the verified `mkdtemp` target.

## Initial implementation evidence (retained provenance)

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
- The unchanged `playbackComponentsV3.test.js` harness currently aborts before assertions when raw Node reaches JSX in `FreeTextChartView.jsx`; this is a test-loader baseline, not a Task 6 product failure. The reducer, owner-token, StrictMode Present, canonical browser playback, runtime-boundary, and build checks are green.
- The PS-04 launcher test requires execution outside this session's filesystem/network sandbox because sandboxed PowerShell reports `HttpListener.IsSupported === false` and `The handle is invalid`. The authorized run uses the generated launcher unchanged and proves its process and temporary-copy cleanup.

## Closure

FT-05, FT-06, FT-12, IM-02, IM-08, IM-15, IM-16, PS-04, and PS-08 are restored to Passing with engine, mounted UI/composition, and retained intended-use evidence. Every row in the final 36-row Step 7S ledger is now Passing under the current permissive-inert Free-text contract and strict Image contract. Review remains the only pending Task 6 gate.

## Whole-branch hardening wave

Seven independently reproduced boundary defects were closed without changing the binding journey text or the permissive-inert Free-text contract:

- **IM-02 / PS-01:** create drafts now begin with the saved dashboard manifest, session-staged identities are counted once, and the prepared final candidate is rejected above 200 MiB before store or dashboard mutation.
- **IM-11 / PS-05:** A→B replacement keeps A/B only in the session draft for undo; finalization and persistence carry only B, retain unrelated saved manifests, and preserve the draft on failure.
- **IM-14 / PS-06:** DashboardRenderer derives one chart-or-static dirty authority. Same-placement selection remains available; different selection opens the existing Keep editing/Discard decision and retains exact source, alt, crop, rotation, and fit until explicit discard.
- **PS-02:** migration preplans usage from the original dashboard, splits multiply-used legacy Image sources into deterministic chart-specific IDs, retains the original inline source only for non-Image consumers, and is idempotent.
- **IM-02:** JPEG acceptance now requires terminal EOI; an appended-payload fixture returns `corrupt-image`.
- **IM-04 / PS-02:** `staticText`, `staticImage`, every origin variant, and crop reject unknown keys while intentional `migrationWarnings` remain supported. Arbitrary text values remain accepted and inert.
- **IM-04 / IM-08:** package crop preview and canonical Image rendering reuse the same exported contained-package-path predicate. Exact generated `data/authored/<sha>.<ext>` paths work with package authority; arbitrary relative strings do not.

Strict RED evidence included three asset ownership failures, accepted trailing JPEG payload, accepted unknown schema keys, unsplit shared migration identity, arbitrary bare-path rendering, absent package preview, and a dirty selection that initially bypassed the decision route. GREEN evidence:

- affected unit/SSR sweep: **106/106 passed** in 4.34 seconds;
- final persistence/migration additions: **14/14 passed** in 3.15 seconds;
- runtime boundary: **passed**, `remoteRuntimeDependencies: []`;
- production build: **891 modules**, 9.93 seconds;
- real near-budget Image create and typed product-budget recovery: **passed** at 1440×900;
- real dirty static selection Keep/Discard with full Image draft equality: **1/1 passed** in 13.3 seconds at 1440×900;
- real packaged generated-path crop preview: **1/1 passed** in 12.9 seconds at 1280×800.

The final post-commit consolidated affected sweep passed **152/152 in 5.11 seconds**. It also exposed and corrected one stale composition fixture that still put `width`/`height` on the static source instead of the authored-asset manifest; the rerun proves canonical Build/View/fullscreen composition against the exact schema. The final runtime boundary passed with no remote dependencies, and the final production build passed with **891 modules in 9.88 seconds**.

There are no new deviations or blockers. The strict JPEG terminal-EOI rule and exact typed-key rejection are accepted compatibility boundaries; the package-path change narrows authority rather than broadening relative-path acceptance.

## Final hardening fix round 2

Three second-order ownership defects were reproduced before implementation:

- focused engine RED: **3/29 failed** because saved/staged duplicates were charged before identity and an old→new ceiling replacement was rejected before pruning;
- production browser RED: a real local replacement survived Dashboard-map Discard as one session registry/blob URL entry for the full 20-second poll.

The implemented boundaries are now ordered explicitly. Image intake performs encoded/structure/decode validation, computes SHA identity, then charges only incremental unique bytes against product and browser quota. Transaction preparation clones the candidate, applies source/panel, merges only the finalized reachable asset, prunes superseded unshared ownership, and only then validates the exact manifest and 200 MiB ceiling before mutation. Navigation-driven Discard invokes the same exported `cleanupImageDraftAssets` authority used by the wizard before clearing the preserved draft and completing selection.

GREEN evidence:

- focused engine: **29/29 passed**;
- consolidated affected suite: **155/155 passed** in 6.38 seconds;
- runtime boundary: passed, `remoteRuntimeDependencies: []`;
- production build: **891 modules**, 15.31 seconds;
- real local replacement Keep/Discard: **1/1 passed** in 16.4 seconds at **1440×900**. It retained source/alt/crop/rotation/fit plus the exact staged identity through Keep editing, then proved empty session inventory, exact blob URL revocation, unchanged saved source, and completed Dashboard-map navigation after Discard.

IM-02, IM-14, PS-01, and PS-05 are restored to Passing. No Free-text, protocol, persistence-version, or visual-design contract changed; there are no deviations or blockers.
