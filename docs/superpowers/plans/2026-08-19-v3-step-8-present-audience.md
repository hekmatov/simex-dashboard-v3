# V3 Dashboard Step 8: Present and Audience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Present, passive Audience, controller lifecycle, composition, playback, recovery, and visual fidelity while retaining the last valid Audience output through every invalid, disconnected, or failed state.

**Architecture:** `App.jsx` owns the presenter session and opens a separate Audience window. A versioned presentation channel carries validated immutable snapshots and actions. Audience renders only accepted snapshots through the canonical renderer; it never authors, fetches alternative state, or clears last-valid output. The saved Scene schema—including `audience.datePosition`—is already defined and validated by Step 7 before this plan consumes it.

**Tech Stack:** React, JavaScript modules, BroadcastChannel/window lifecycle adapters, Node test runner, React DOM test utilities, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-12-three-mode-dashboard-ui-spec.md`; `docs/superpowers/specs/2026-08-12-temporal-authoring-chrono-design.md`; `docs/superpowers/specs/2026-08-15-scene-authoring-familiarity-design.md`; `docs/superpowers/plans/2026-08-19-v3-dashboard-reconciliation-index.md`.

## Global Constraints

- Execute after Step 7 Tasks S7-5 through S7-9 and S7-17. Do not move `audience.datePosition` schema ownership into Step 8.
- Audience is passive and last-valid-output safe. Invalid/Needs-attention content, malformed messages, disconnects, and renderer failures must not replace accepted output.
- Phone Present stays mounted as a best-effort surface under the Step 6 persistent notice; do not redirect, disable, unmount, or discard its session.
- END publishes the passive Ended projection, requests Audience-window closure, and terminates the old channel without assuming closure succeeds. Close success and close denial/surface-remains are explicit outcomes; only `OPEN_NEW_SESSION` allocates a new session/channel, and no old-session event may revive either outcome.
- Use the canonical dashboard renderer and saved V3 identities; do not create a presentation-only content model.

---

### Task S8-1: Define the versioned presentation protocol and validation boundary

**Files:**
- Modify: `src/lib/presentationProtocol.js`
- Modify: `src/lib/presentationChannel.js`
- Modify: `tests/presentationProtocol.test.js`
- Modify: `tests/presentationChannel.test.js`

**Interfaces:**
- Consumes: Step 7 `SavedScene`, temporal ledger/provenance, canonical page/chart IDs.
- Produces:
```js
export const PRESENTATION_PROTOCOL_VERSION = 3;
// PresentationMessage = { protocol_version:3, session_id, sequence,
//   type:"ready"|"state"|"heartbeat"|"ended", payload:PresentationState|null }
// PresentationState = { dashboard_revision,
//   source:{kind:"scene"|"time-group"|"manual", scene_id:null|string, time_group_id:null|string},
//   composition:{active_page_id,displayed_chart_ids,layout},
//   timeline:{frame_epochs:number[],frame_index:number,period:{start,end},
//     trace_mode:"reveal"|"full",seconds_per_frame:number},
//   matching:{use_authored_settings:true,session_override:null|string},
//   output_mode:"holding"|"blank"|"active", blackout:boolean,
//   audience:{date_position:{x_permille,y_permille,width_permille}}, payload }
// PresentationAction = { type:"SEEK"|"PREVIOUS"|"NEXT"|"PLAY"|"PAUSE"|
//   "SELECT_SCENE"|"SELECT_TIME_GROUP"|"SET_TRACE_MODE"|"SET_MATCHING_OVERRIDE"|
//   "SET_OUTPUT_MODE"|"SET_COMPOSITION"|"SET_BLACKOUT"|"END", value? }
export function makePresentationMessage({ sessionId, sequence, type, payload, validChartIds }) {}
export function parsePresentationMessage(value, { sessionId, validChartIds } = {}) {}
export function validatePresentationState(value, { validChartIds } = {}) {}
export function validatePresentationAction(value) {}
```

**Steps:**

- [ ] **Write the failing test.** Add failing protocol tests for every field/action, direct seek bounds, Reveal/Full modes, holding/blank/active, Scene/Time Group identity, date-position ranges, monotonic sequence, protocol mismatch, malformed payload, and structured rejection reasons.
- [ ] **Write the failing test.** Add failing channel tests for session isolation, ordered delivery, duplicate/out-of-order rejection, validation before publication, and immutable last-valid snapshot retention.
- [ ] **Run test to verify it fails.** Run `node --test tests/presentationProtocol.test.js tests/presentationChannel.test.js`; expect missing protocol exports and channel validation failures.
- [ ] **Write minimal implementation.** Implement validation and versioned envelopes. Reject invalid/Needs-attention Scene selection before publication and return `{accepted:false,reason,lastValidSnapshot}` without changing the channel output.
- [ ] **Run tests to verify they pass.** Run `node --test tests/presentationProtocol.test.js tests/presentationChannel.test.js`; expect pass.
- [ ] **Commit.** Run `git add src/lib/presentationProtocol.js src/lib/presentationChannel.js tests/presentationProtocol.test.js tests/presentationChannel.test.js && git commit -m "feat(present): define versioned presentation protocol"`.

### Task S8-2: Implement the complete controller session reducer and END close outcomes

**Files:**
- Create: `src/lib/presentationSession.js`
- Modify: `src/lib/presentationWindow.js`
- Create: `tests/presentationSession.test.js`
- Modify: `tests/presentationWindow.test.js`

**Interfaces:**
- Consumes: S8-1 protocol, the Audience window handle, and Step 7 temporal playback rules.
- Produces:
```js
// PresentationSession = { sessionId, lifecycle:"waiting"|"live"|"ended",
// window:"closed"|"opening"|"open"|"closing", closeOutcome:
//   "not-requested"|"requested"|"succeeded"|"denied-surface-remains",
// connection:"disconnected"|"connecting"|"connected"|"reconnecting"|"terminated",
// output:"holding"|"blank"|"active"|"ended", playback:"paused"|"playing"|"at-end",
// blackout:boolean, source, frameIndex, traceMode, lastValidSnapshot,
// channelGeneration, acceptsSessionEvents:boolean,
// effects:Array<"PUBLISH_ENDED"|"REQUEST_AUDIENCE_CLOSE"|"TERMINATE_CHANNEL"> }
export function reducePresentationSession(state, action) {}
export function requestAudienceWindowClose(windowRef) {}
// => { outcome:"succeeded"|"denied-surface-remains" }
```
```js
// PresentationSessionAction =
// | {type:"OPEN_NEW_SESSION", requestedWindowName:string}
// | {type:"WINDOW_OPENED"|"WINDOW_CLOSED"|"CONNECTING"|"CONNECTED"|"CONNECTION_LOST"|"RECONNECTING", sessionId, channelGeneration}
// | {type:"SNAPSHOT_ACCEPTED", message:PresentationMessage}
// | {type:"SNAPSHOT_REJECTED", reason:string}
// | {type:"SEEK", frameIndex:number} | {type:"PREVIOUS"|"NEXT"|"PLAY"|"PAUSE"|"TICK"}
// | {type:"SELECT_SCENE", sceneId:string} | {type:"SELECT_TIME_GROUP", groupId:string}
// | {type:"SET_TRACE_MODE", mode:"reveal"|"full"}
// | {type:"SET_MATCHING_OVERRIDE", policy:null|string}
// | {type:"SET_OUTPUT_MODE", mode:"holding"|"blank"|"active"}
// | {type:"SET_COMPOSITION", composition:PresentationState["composition"]}
// | {type:"SET_BLACKOUT", active:boolean} | {type:"DOCUMENT_HIDDEN"|"MODE_EXIT"}
// | {type:"END"} | {type:"AUDIENCE_CLOSE_SUCCEEDED"}
// | {type:"AUDIENCE_CLOSE_DENIED", surfaceRemains:true};
```

**Required transition table:**

| Current state/event | Window / close outcome | Connection | Output | Playback | Blackout | Result |
|---|---|---|---|---|---|---|
| Initial / `OPEN_NEW_SESSION` | opening / not requested | connecting | holding | paused | off | Allocate a new `sessionId` and channel generation; enter Waiting. |
| Waiting / `CONNECTED` | open / not requested | connected | holding | paused | off | Stay Waiting with deliberate holding output until valid source selection. |
| Waiting / `SET_OUTPUT_MODE(blank)` | open / not requested | connected | blank | paused | off | Deliberate blank; retain last-valid snapshot. |
| Waiting or Live / valid Scene or Group | open / not requested | connected | active | paused | off | Publish accepted snapshot and enter Live. |
| Any non-ended / invalid or Needs-attention selection | unchanged | unchanged | unchanged | paused | unchanged | Reject; retain last-valid Audience output and expose reason. |
| Live / `PLAY` | open / not requested | connected | active | playing | off | Advance until endpoint, then `at-end`. |
| Live / seek, previous, next, source, matching, trace, or composition change | unchanged | unchanged | active | paused | unchanged | Apply valid change and publish after safety pause. |
| Live / `SET_OUTPUT_MODE(holding)` | unchanged | unchanged | holding | paused | unchanged | Show deliberate holding visual; retain last valid active snapshot. |
| Live / `SET_OUTPUT_MODE(blank)` | unchanged | unchanged | blank | paused | unchanged | Deliberate blank; retain last valid active snapshot. |
| Any non-ended / `SET_BLACKOUT(true)` | unchanged | unchanged | unchanged | paused | on | Render blackout while retaining last-valid output. |
| Blackout / `SET_BLACKOUT(false)` | unchanged | unchanged | prior deliberate mode | paused | off | Restore prior mode; never autoplay. |
| Any non-ended / `CONNECTION_LOST` | open or closed | disconnected | last valid or deliberate mode | paused | unchanged | Retain output; mark disconnected. |
| Disconnected / `RECONNECTING` | open | reconnecting | last valid or deliberate mode | paused | unchanged | Do not publish until handshake completes. |
| Reconnecting / `CONNECTED` | open | connected | last valid or deliberate mode | paused | unchanged | Resend current accepted snapshot once; never autoplay. |
| Any non-ended / `WINDOW_CLOSED` | closed / not requested | disconnected | retained | paused | unchanged | Preserve controller session; permit reopen/reconnect. |
| Any non-ended / `END` | closing / requested | terminated | ended | paused | off | Enter persistent Ended, reject further old-session events, emit effects in order: publish passive Ended, request window close, terminate old channel. Do not assume closure. |
| Ended / `AUDIENCE_CLOSE_SUCCEEDED` | closed / succeeded | terminated | ended | paused | off | Keep Ended; old channel remains terminated. |
| Ended / `AUDIENCE_CLOSE_DENIED(surfaceRemains)` | open / denied-surface-remains | terminated | ended | paused | off | Keep the remaining Audience surface on the passive neutral Ended projection; do not reconnect. |
| Ended / any old-session event except close outcome | unchanged | terminated | ended | paused | off | Reject as `session-ended`; never recreate or revive the old channel. |
| Ended / `OPEN_NEW_SESSION` | opening / not requested | connecting on a new channel | holding | paused | off | Allocate a different session ID and channel generation; leave any denied-close old surface passive and isolated. |

**Steps:**

- [ ] **Write the failing test.** Encode every transition row, including endpoint stop, all safety pauses, END effect ordering, `acceptsSessionEvents:false`, and rejection of every old-session action/message after END in both close outcomes.
- [ ] **Write the failing test.** Add window-adapter tests where `window.close()` produces `closed === true` and returns `succeeded`, and where the call is denied/leaves `closed !== true` and returns `denied-surface-remains`; neither branch throws or reports false closure.
- [ ] **Write the failing test.** Prove only `OPEN_NEW_SESSION` allocates a new session ID/channel generation and that close success/denial cannot clear Ended, enter Waiting, reconnect, or reuse the old channel.
- [ ] **Run test to verify it fails.** Run `node --test tests/presentationSession.test.js tests/presentationWindow.test.js`; expect missing reducer and explicit close-outcome failures.
- [ ] **Write minimal implementation.** Implement the pure reducer and close adapter. END marks the old generation terminal before effects execute; close outcomes update only window/close state. Store the pre-blackout deliberate output mode and retain terminal last-valid data for diagnostics without rendering it over the Ended projection.
- [ ] **Run tests to verify they pass.** Run `node --test tests/presentationSession.test.js tests/presentationWindow.test.js`; expect pass for close succeeded, close denied/surface remains, old-event rejection, and explicit new-session allocation.
- [ ] **Commit.** Run `git add src/lib/presentationSession.js src/lib/presentationWindow.js tests/presentationSession.test.js tests/presentationWindow.test.js && git commit -m "feat(present): model explicit audience close outcomes"`.

### Task S8-3: Implement presenter controller, source selection, and playback

**Files:**
- Create: `src/components/presentation/PresentationController.jsx`
- Create: `src/components/presentation/PresentationSourcePicker.jsx`
- Modify: `src/components/presentation/PresentWorkspace.jsx`
- Modify: `src/components/presentation/usePresentationRuntime.js`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Create: `tests/presentationController.test.js`
- Create: `tests/e2e/v3-present-audience.spec.js`

**Interfaces:**
- Consumes: S8-2 reducer, S8-1 protocol, saved valid groups/scenes, S7-17 matching/playback semantics.
- Produces: Present UI for Open New Session, Scene/Time Group selection, direct seek, previous/next, Reveal to frame/Full timeline, matching override, cadence, Play/Pause, holding, blank, blackout, and END effect execution with explicit Audience close outcomes.

**Steps:**

- [ ] **Write the failing test.** Add failing component tests for every control/action, frame/period context, valid selection, invalid/Needs-attention rejection with reason, last-valid preservation, and explicit Open New Session. For END, assert ordered `PUBLISH_ENDED`, `REQUEST_AUDIENCE_CLOSE`, and `TERMINATE_CHANNEL` effects; dispatch `AUDIENCE_CLOSE_SUCCEEDED` only when the adapter confirms `closed === true`, otherwise dispatch `AUDIENCE_CLOSE_DENIED` and leave the surface isolated.
- [ ] **Run test to verify it fails.** Run `node --test tests/presentationController.test.js`; expect missing-component failure.
- [ ] **Write minimal implementation.** Implement the controller with approved hierarchy and responsive overflow. Use authored Scene/Group settings by default and session-only matching/cadence overrides; never write authoring data from Present. Execute END effects exactly once for the terminal generation, publish the Ended message before requesting closure, terminate the old channel in both outcomes, and reject late callbacks/messages before considering a new session.
- [ ] **Add the E2E test.** Add E2E cases `END closes Audience and terminates the old channel` and `denied Audience close leaves a passive Ended surface`. For the denied case, use Playwright `addInitScript` to make the popup platform close request a no-op; do not add a production test backdoor. In both cases, send a late old-generation message and assert it is rejected; only Open New Session creates a distinct popup/channel.
- [ ] **Run tests to verify they pass.** Run `node --test tests/presentationController.test.js && pnpm exec playwright test tests/e2e/v3-present-audience.spec.js --grep "END closes Audience|denied Audience close"`; expect pass.
- [ ] **Commit.** Run `git add src/components/presentation/PresentationController.jsx src/components/presentation/PresentationSourcePicker.jsx src/components/presentation/PresentWorkspace.jsx src/components/presentation/usePresentationRuntime.js src/App.jsx src/styles.css tests/presentationController.test.js tests/e2e/v3-present-audience.spec.js && git commit -m "feat(present): add complete presenter controls"`.

### Task S8-4: Implement passive Audience projection and last-valid recovery

**Files:**
- Modify: `src/components/presentation/AudienceDisplay.jsx`
- Create: `src/lib/audienceProjection.js`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Create: `tests/audienceProjection.test.js`
- Modify: `tests/audienceDisplay.test.js`
- Modify: `tests/e2e/v3-present-audience.spec.js`

**Interfaces:**
- Consumes: validated S8-1 state messages, canonical renderer, saved `audience.datePosition` from S7-7.
- Produces: `projectAudienceSnapshot(message,lastValid)` returning `{accepted,projection,lastValid,reason}` and a passive Audience display. An accepted protocol `type:"ended"` produces `{kind:"ended",heading:"Presentation ended",body:"This display is no longer active."}`.

**Steps:**

- [ ] **Write the failing test.** Add failing tests for active/holding/blank/blackout projection, Reveal/Full trace, direct-seek frame, Scene composition, saved date position, malformed/invalid/Needs-attention rejection, renderer failure, sequence gaps, reconnect, and retained last-valid projection. Add Ended tests proving the exact neutral copy `Presentation ended` / `This display is no longer active.`, no charts, technical IDs, reconnect language, actions, or controls, and immunity to every old-session message after channel termination.
- [ ] **Run test to verify it fails.** Run `node --test tests/audienceProjection.test.js tests/audienceDisplay.test.js`; expect missing-module failure.
- [ ] **Write minimal implementation.** Implement a read-only projection with no authoring controls, mode switcher, data writes, or independent source fetch. Catch render failure at the projection boundary and keep the last valid DOM/output. On the terminal Ended message, retain last-valid data only in session diagnostics and replace visible output with the exact passive Ended projection so a denied close remains neutral and nontechnical.
- [ ] **Add the E2E test.** Add E2E cases `Audience remains passive and last-valid through invalid output and reconnect` and `Audience surface remaining after denied close shows neutral Ended projection and rejects old events`.
- [ ] **Run tests to verify they pass.** Run `node --test tests/audienceProjection.test.js tests/audienceDisplay.test.js && pnpm exec playwright test tests/e2e/v3-present-audience.spec.js --grep "Audience remains passive and last-valid|Audience surface remaining after denied close"`; expect pass.
- [ ] **Commit.** Run `git add src/components/presentation/AudienceDisplay.jsx src/lib/audienceProjection.js src/App.jsx src/styles.css tests/audienceProjection.test.js tests/audienceDisplay.test.js tests/e2e/v3-present-audience.spec.js && git commit -m "feat(audience): project passive last-valid output"`.

### Task S8-5: Complete composition editing and saved Audience date position

**Files:**
- Create: `src/components/presentation/CompositionControls.jsx`
- Modify: `src/components/presentation/PresentationController.jsx`
- Modify: `src/styles.css`
- Create: `tests/presentationComposition.test.js`
- Modify: `tests/e2e/v3-present-audience.spec.js`

**Interfaces:**
- Consumes: S7-7 `SavedScene.audience.datePosition`; S8-1 composition snapshot.
- Produces: session composition overrides and `onSaveSceneDatePosition(sceneId,datePosition)` command routed to the existing Scene persistence boundary.

**Steps:**

- [ ] **Write the failing test.** Add failing tests for chart subset/layout override, date drag/keyboard movement, permille clamping, Cancel, save validation/error/retry, dirty warning, and unchanged Audience output until an accepted snapshot is published.
- [ ] **Run test to verify it fails.** Run `node --test tests/presentationComposition.test.js`; expect missing-component failure.
- [ ] **Write minimal implementation.** Implement composition controls. Session layout changes remain session-only; saving date position updates only the already-valid Scene field through the authoring command and republishes only after success.
- [ ] **Add the E2E test.** Add E2E case `Present composes output and saves Scene date position through its owner`.
- [ ] **Run tests to verify they pass.** Run `node --test tests/presentationComposition.test.js && pnpm exec playwright test tests/e2e/v3-present-audience.spec.js --grep "Present composes output and saves Scene date position through its owner"`; expect pass.
- [ ] **Commit.** Run `git add src/components/presentation/CompositionControls.jsx src/components/presentation/PresentationController.jsx src/styles.css tests/presentationComposition.test.js tests/e2e/v3-present-audience.spec.js && git commit -m "feat(present): add composition and date positioning"`.

### Task S8-6: Approve reference-driven connection glyphs and integrate them canonically

This glyph work is **reference-driven**. The reference is the approved SimExIcon stroke, cap, join, optical-weight, and small-size grammar already rendered in `docs/icon-language-atlas.html`; no unrelated external icon is copied and no canonical glyph is changed before the comparison checkpoint is approved.

**Files:**
- Create: `docs/audits/2026-08-19-v3-connection-icon-comparison.html`
- Modify: `src/iconography/iconCatalog.js`
- Modify: `src/iconography/iconGlyphs.js`
- Create: `src/components/presentation/ConnectionIndicator.jsx`
- Modify: `src/components/presentation/PresentationController.jsx`
- Modify: `src/styles.css`
- Modify: `docs/icon-language-atlas.html`
- Modify: `docs/icon-and-interaction-specification.md`
- Modify: `tests/iconSystem.test.js`
- Create: `tests/connectionIndicator.test.js`

**Interfaces:**
- Consumes: S8-2 connection state, `SimExIcon`, and the approved canonical glyph grammar displayed by the current atlas.
- Produces: approved catalog interactions `presentation.connection-disconnected` and `presentation.connection-reconnecting`, rendered only through `SimExIcon`, plus regenerated canonical icon documentation.

**Steps:**

- [ ] **Write the failing test.** Add tests that both interaction IDs resolve through the canonical catalogue, never use inline SVG or an unrelated glyph, expose no visible status text, and preserve the exact accessible names `Audience display disconnected` and `Audience display reconnecting`.
- [ ] **Run test to verify it fails.** Run `node --test tests/iconSystem.test.js tests/connectionIndicator.test.js`; expect missing interaction/glyph failures.
- [ ] **Create standalone comparison evidence.** Create `docs/audits/2026-08-19-v3-connection-icon-comparison.html` without modifying canonical sources. Show the current approved stroke/cap/join and optical-weight references beside at least two labeled candidates for each meaning at 16, 20, and 24 CSS px, in light and dark contexts, with the proposed interaction ID and accessible name. Mark candidates as non-production evidence.
- [ ] **Approval checkpoint.** Open and inspect the standalone comparison evidence, then present it to the user. Continue only after the user explicitly approves one disconnected candidate and one reconnecting candidate for canonical integration. If approval is withheld or requests another comparison, stop this task with canonical sources and generated artifacts unchanged.
- [ ] **Write minimal implementation.** After approval, add only the two approved glyphs to `src/iconography/iconGlyphs.js`, map them in `src/iconography/iconCatalog.js`, and bind `ConnectionIndicator` to S8-2 state through `SimExIcon`.
- [ ] **Regenerate canonical icon artifacts.** Run `pnpm icons:build`; expect exit `0` and regenerated `docs/icon-language-atlas.html` plus `docs/icon-and-interaction-specification.md` containing both approved interaction IDs, glyph references, and exact accessible names.
- [ ] **Inspect the regenerated atlas.** Open `docs/icon-language-atlas.html`, inspect both new rows at 100% and 200% zoom in light and dark atlas contexts, and compare them with the approved standalone evidence. If identity, optical weight, clipping, alignment, or interaction mapping differs, correct the canonical sources and rerun `pnpm icons:build` before continuing.
- [ ] **Run tests to verify they pass.** Run `node --test tests/iconSystem.test.js tests/connectionIndicator.test.js`; expect pass after atlas inspection.
- [ ] **Commit.** Run `git add docs/audits/2026-08-19-v3-connection-icon-comparison.html src/iconography/iconCatalog.js src/iconography/iconGlyphs.js src/components/presentation/ConnectionIndicator.jsx src/components/presentation/PresentationController.jsx src/styles.css docs/icon-language-atlas.html docs/icon-and-interaction-specification.md tests/iconSystem.test.js tests/connectionIndicator.test.js && git commit -m "feat(present): add approved connection status glyphs"`.

### Task S8-7: Complete Present and Audience targeted visual fidelity

**Files:**
- Modify: `src/components/presentation/PresentationController.jsx`
- Modify: `src/components/presentation/AudienceDisplay.jsx`
- Modify: `src/styles.css`
- Create: `tests/e2e/v3-step8-fidelity.spec.js`

**Interfaces:**
- Consumes: Step 6 tokens/primitives, S8-3 through S8-6 surfaces, Sketches 008, 010, 012, and 019.
- Produces: approved controller density, dialog/drawer/state treatment, passive Audience hierarchy, and viewport evidence.

**Steps:**

- [ ] **Write the failing test.** Add failing E2E visual/behavior cases at `390x844` Present, `768x1024`, `1024x768`, `1200x900`, `1440x900`, and `1920x1080` Audience. The phone case requires mounted functional Present under the persistent notice with session preservation; Audience cases cover active, holding, blank, blackout, disconnected, reconnecting, render failure, close-succeeded Ended, and close-denied/surface-remains Ended.
- [ ] **Run test to verify it fails.** Run `pnpm exec playwright test tests/e2e/v3-step8-fidelity.spec.js`; expect missing screenshots/assertions and style mismatches.
- [ ] **Write minimal implementation.** Calibrate only Step 8-owned controller, playback, composition, status, Audience, and recovery selectors for approved colours, borders, radii, elevation, typography, icons, focus, density, wrapping, alignment, and overflow.
- [ ] **Run tests to verify they pass.** Run `pnpm exec playwright test tests/e2e/v3-step8-fidelity.spec.js`; expect all cases to pass without document overflow or obscured targets.
- [ ] **Commit.** Run `git add src/components/presentation/PresentationController.jsx src/components/presentation/AudienceDisplay.jsx src/styles.css tests/e2e/v3-step8-fidelity.spec.js && git commit -m "fix(present): complete controller and audience fidelity"`.

### Task S8-8: Verify static launch, offline/PWA, Quorum, and canonical-runtime equivalence

**Files:**
- Create: `scripts/verify-v3-static-build.mjs`
- Modify: `scripts/package-flashdrive.mjs`
- Modify: `src/main.jsx`
- Modify: `public/service-worker.js`
- Modify: `package.json`
- Create: `tests/v3StaticBoundary.test.js`
- Create: `playwright.static.config.js`
- Create: `tests/e2e/v3-static-offline.spec.js`
- Create: `tests/e2e/v3-canonical-runtime.spec.js`

**Interfaces:**
- Consumes: Step 6 frozen dependency/Quorum/entrypoint ledger and complete Steps 7-8 surfaces.
- Produces: deterministic static-build verifier, install/cache/offline recovery, and a canonical-runtime equivalence ledger.

**Steps:**

- [ ] **Write the failing test.** Add failing static tests that reject runtime remote assets, check hashed/local assets and relative launch URLs, and compare Quorum protocol/schema exports byte-for-byte against the Step 6 ledger.
- [ ] **Write the failing test.** Add failing production-static E2E for View, Build, Present, and Audience from the built output; install/cache once, close, disable network, relaunch, and require the cached shell plus last-valid recovery. Do not treat a dev-server run as evidence.
- [ ] **Write the failing test.** Add failing canonical-runtime E2E comparing expected panel IDs, series, values, filters, time, annotations, and status across canonical and production entry points; only responsive density may differ.
- [ ] **Run test to verify it fails.** Run `node --test tests/v3StaticBoundary.test.js && pnpm build && pnpm exec playwright test --config=playwright.static.config.js tests/e2e/v3-static-offline.spec.js tests/e2e/v3-canonical-runtime.spec.js`; expect the new verifier/offline/equivalence assertions to fail before implementation.
- [ ] **Write minimal implementation.** Create `playwright.static.config.js` with `baseURL: "http://127.0.0.1:4180"` and `webServer.command: "pnpm preview -- --host 127.0.0.1 --port 4180 --strictPort"`. Implement only concrete gaps exposed by those assertions: static verifier, package inclusion, service-worker cache/version update, and recovery. Do not alter the frozen Quorum protocol/schema.
- [ ] **Run tests to verify they pass.** Run `node --test tests/v3StaticBoundary.test.js && pnpm build && pnpm exec playwright test --config=playwright.static.config.js tests/e2e/v3-static-offline.spec.js tests/e2e/v3-canonical-runtime.spec.js`; expect exit `0`, successful network-disabled relaunch, 4/4 surface launch, unchanged Quorum boundary, and zero canonical data/status mismatches.
- [ ] **Commit.** Run `git add scripts/verify-v3-static-build.mjs scripts/package-flashdrive.mjs src/main.jsx public/service-worker.js package.json tests/v3StaticBoundary.test.js playwright.static.config.js tests/e2e/v3-static-offline.spec.js tests/e2e/v3-canonical-runtime.spec.js && git commit -m "test(runtime): prove static offline and canonical parity"`.

## Step 8 completion check

Run:

```bash
node --test tests/presentationProtocol.test.js tests/presentationChannel.test.js tests/presentationSession.test.js tests/presentationWindow.test.js tests/presentationController.test.js tests/audienceProjection.test.js tests/audienceDisplay.test.js tests/presentationComposition.test.js tests/iconSystem.test.js tests/connectionIndicator.test.js tests/v3StaticBoundary.test.js
pnpm icons:build
pnpm build
pnpm exec playwright test tests/e2e/v3-present-audience.spec.js tests/e2e/v3-step8-fidelity.spec.js
pnpm exec playwright test --config=playwright.static.config.js tests/e2e/v3-static-offline.spec.js tests/e2e/v3-canonical-runtime.spec.js
```

Expected: all commands exit `0`; Audience remains passive and last-valid; every safety transition pauses; END requests closure; close success and close denial both terminate the old channel; a denied-close surface remains on the passive Ended projection; only Open New Session creates a distinct session/channel; `1920x1080` Audience and all Present viewports satisfy targeted fidelity; static/offline/PWA, Quorum, and canonical-runtime checks pass.
