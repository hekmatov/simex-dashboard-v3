# Three-Mode Dashboard Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build an agile educational prototype with universally available View, Build, and Present modes plus a same-computer moderator/audience display.

**Architecture:** Keep one application-owned V3 dashboard, active page, playback provider, and display reducer. View and Build reuse one dashboard canvas; Present sends the complete small presentation state over a same-origin BroadcastChannel to a chrome-free audience window. Prefer direct components and pure helpers over general frameworks.

**Tech Stack:** Existing React 19, Vite 6, ECharts 5, plain CSS, Node test runner, Playwright, and browser BroadcastChannel. Add no runtime or test dependencies.

## Global Constraints

- This is a non-commercial education and training prototype with no guarantees of availability, accuracy, suitability, security, support, or continued compatibility.
- Optimize for a usable vertical prototype, not a production platform.
- All users can open View, Build, and Present. Add no accounts, roles, permissions, feature gates, or persona checks.
- Implement only behavior required by the approved acceptance criteria. Record non-blocking ideas instead of implementing them.
- If a task appears to require a new dependency, generic abstraction, additional protocol behavior, or files outside its declared map, stop and report the need instead of expanding the task.
- Do not add speculative abstractions, generic frameworks, plugin systems, feature flags, analytics, telemetry, observability, audit logs, deployment automation, or release infrastructure.
- Safety and security are limited to minimum correctness guards: bounded identifiers and chart sets, basic message-shape checks, same-origin browser APIs, and no datasets in presentation messages.
- Do not add authentication, authorization, encryption, tokens, rate limits, threat-model tooling, security scanning, compliance work, privacy certification, or security guarantees.
- Do not weaken existing repository or Quorum safeguards.
- Version 3 remains the only dashboard contract. Use browser key "simex-dashboard-config-v3-three-mode-v1"; ignore but do not delete the old key.
- Add no migration or reconciliation for pre-redesign browser saves or packages. Do not change the bundle format unless an actual implementation need requires it.
- Keep mode, audience, channel, and presentation state outside dashboard configuration and bundles.
- Keep one mounted shared runtime. Mode changes must not reset active page, playback, display selection, or Build drafts.
- Keep React, Vite, ECharts, the icon registry, static/PWA operation, and optional Quorum. Add no router, backend, new UI framework, or cross-device transport.
- Presentation phase one is same-computer and same-origin. BroadcastChannel unsupported is a plain controller error; add no fallback transport.
- Audience mode never writes mode preference, starts Quorum, starts Vanta, exposes authoring controls, or displays raw errors.
- Authoring selection uses placement IDs; display selection uses chart IDs.
- Preserve the existing 650 ms debounce, serialized commits, last-good dashboard, and failed-operation draft retention.
- Keep the chart wizard modal. If ChartEditor is embedded, lock other Build mutations until Save or Cancel.
- New presentation commands use labeled text buttons. Reuse icons only when their registered interaction already exists.
- Tests are acceptance-driven. Add no test framework or accessibility package, and do not duplicate a passing deterministic check.
- Per-task review is limited to acceptance gaps, regressions introduced by the task, and scope expansion. Minor polish is recorded for later and does not trigger implementation.
- Prototype constraints are binding review inputs: reviewers must not turn the disclaimer or minimum message checks into production security, privacy, compliance, release, or observability work.
- During implementation run only each task's focused Node test and inspect changed UI through the Vite development server.
- Run full test, build, and Chromium E2E gates once only after the user declares pre-merge readiness.
- Before Task 2, re-check for packaged-dashboard-bundle.json and follow AGENTS.md if it appears.

---

## Minimal File Map

### Create

- docs/superpowers/specs/2026-08-10-three-mode-dashboard-ui-spec.md — compact visual contract produced from one browser review and sketch.
- docs/superpowers/sketches/2026-08-10-three-mode-dashboard/index.html — one disposable mode sketch.
- src/lib/dashboardMode.js — mode, density, query entry, and mode preference helpers.
- src/lib/dashboardNavigation.js — active-page reconciliation.
- src/lib/dashboardSelectors.js — chart and placement lookup.
- src/components/app-shell/AppFrame.jsx
- src/components/app-shell/ModeSwitcher.jsx
- src/components/dashboard/DashboardHeader.jsx
- src/components/dashboard/PageNavigation.jsx
- src/components/dashboard/DashboardCanvas.jsx
- src/components/view/ViewShell.jsx
- src/components/build/BuildWorkspace.jsx
- src/components/build/BuildStructureRail.jsx
- src/components/build/BuildInspector.jsx
- src/components/build/buildSelectionModel.js
- src/lib/presentationProtocol.js — four-message prototype protocol.
- src/lib/presentationChannel.js — minimal ready/state/heartbeat/end channel.
- src/lib/presentationWindow.js — synchronous popup helper.
- src/components/display/DisplayedChartGrid.jsx
- src/components/presentation/AudienceDisplay.jsx
- src/components/presentation/PresentWorkspace.jsx
- src/styles/tokens.css
- src/styles/modes.css
- src/styles/presentation.css
- tests/dashboardMode.test.js
- tests/dashboardNavigation.test.js
- tests/dashboardSelectors.test.js
- tests/buildSelectionModel.test.js
- tests/presentationProtocol.test.js
- tests/presentationChannel.test.js
- tests/presentationWindow.test.js
- tests/audienceDisplay.test.js
- tests/e2e/three-mode-prototype.spec.js

### Modify

- src/App.jsx — storage epoch, mode/entry, active page, PlaybackProvider, audience branch.
- src/main.jsx — style imports.
- src/components/DashboardRenderer.jsx — transactional mode orchestration and shell composition.
- src/components/ChartPanel.jsx — explicit Compare charts action.
- src/components/FullscreenDisplay.jsx — shared grid and focus behavior.
- src/components/chart-authoring/ChartEditorV3.jsx — inspector surface using the same draft logic.
- src/components/chart-authoring/ChartEditorModal.jsx — optional dialog wrapper.
- src/components/playback/PlaybackProvider.jsx — export buildMemberTimeContexts only.
- src/components/charts/ChartView.jsx — passive audience mode.
- src/styles.css — only selectors directly touched by the new shells.
- Existing E2E files that name the old storage key or Open edit mode.
- README.md, docs/app-manual.md, docs/quorum-companion.md.

---

### Task 1: Produce the Compact UI Contract

**Required skills:** browser:control-in-app-browser for the bounded visual inspection; superpowers:subagent-driven-development for task ownership and review. Do not run a separate gsd-ui-phase or multi-variant sketch workflow because the direction is already approved.

**Files:**
- Create: docs/superpowers/specs/2026-08-10-three-mode-dashboard-ui-spec.md
- Create: docs/superpowers/sketches/2026-08-10-three-mode-dashboard/index.html

**Interfaces:**
- Consumes: approved three-mode design.
- Produces: exact shell geometry and token values used by Tasks 3–8.

- [ ] **Step 1: Inspect only the decision-making views**

Run the current source through Vite and inspect:

- 1440 by 900 current View/Edit shell;
- 1024 by 1366 current tablet;
- 1920 by 1080 current fullscreen.

Record no more than ten findings, each tied to View comprehension, Build setup, or room-distance presentation.

- [ ] **Step 2: Create one switchable HTML reference**

Use the accepted design and the current-app findings to show:

- View desktop;
- Build desktop and one tablet sheet;
- Present controller;
- audience waiting, two-chart, and blackout states.

Use real SimEx labels and chart shapes. Include no data connection or animation.

- [ ] **Step 3: Capture the accepted UI contract directly**

Write a compact specification containing only:

- mode-switch position and states;
- header/page-navigation structure;
- desktop Build rail/canvas/inspector dimensions;
- tablet Build sheet behavior;
- controller regions;
- audience title and chart layouts;
- Compact, Comfortable, and Spacious token values;
- focus order and 44-pixel primary targets.

- [ ] **Step 4: Commit**

~~~powershell
git add docs/superpowers/specs/2026-08-10-three-mode-dashboard-ui-spec.md docs/superpowers/sketches/2026-08-10-three-mode-dashboard/index.html
git commit -m "docs: define prototype mode surfaces"
~~~

---

### Task 2: Add Mode, Persistence, and Shared-State Foundation

**Required skills:** superpowers:test-driven-development scaled to two focused Node files.

**Files:**
- Create: src/lib/dashboardMode.js
- Create: src/lib/dashboardNavigation.js
- Create: src/components/app-shell/AppFrame.jsx
- Create: src/components/app-shell/ModeSwitcher.jsx
- Create: tests/dashboardMode.test.js
- Create: tests/dashboardNavigation.test.js
- Create: src/styles/modes.css
- Modify: src/App.jsx
- Modify: src/components/DashboardRenderer.jsx
- Modify: src/main.jsx
- Modify: tests/dashboardAppV3.test.js

**Interfaces:**
- DASHBOARD_MODES = ["view", "build", "present"].
- parseDashboardEntry(search) returns { surface, requestedMode, channelId, issue }.
- reconcileActivePageId(pages, requestedId) returns a page ID or null.
- AppFrame props: mode, onModeRequest, modeDisabled, blockedReason, children.

- [ ] **Step 1: Write failing pure tests**

~~~js
test("invalid preference falls back to View", () => {
  assert.equal(resolveInitialDashboardMode({ storedMode: "owner" }), "view");
});

test("audience query stays chrome-free when its channel is invalid", () => {
  const entry = parseDashboardEntry("?surface=audience&channel=bad");
  assert.equal(entry.surface, "audience");
  assert.equal(entry.requestedMode, "present");
  assert.equal(entry.channelId, null);
  assert.equal(entry.issue, "invalid_channel");
});

test("active page survives when valid and falls back after removal", () => {
  const pages = [{ id: "home" }, { id: "biomedical" }];
  assert.equal(reconcileActivePageId(pages, "biomedical"), "biomedical");
  assert.equal(reconcileActivePageId(pages, "missing"), "home");
});
~~~

- [ ] **Step 2: Confirm focused failure**

~~~powershell
node --test tests/dashboardMode.test.js tests/dashboardNavigation.test.js
~~~

- [ ] **Step 3: Implement the direct mode model**

~~~js
export const DASHBOARD_MODES = Object.freeze(["view", "build", "present"]);
export const DEFAULT_DASHBOARD_MODE = "view";
export const DASHBOARD_STORAGE_KEY =
  "simex-dashboard-config-v3-three-mode-v1";
export const DASHBOARD_MODE_STORAGE_KEY = "simex-dashboard-ui-mode-v1";

export function densityForDashboardMode(mode) {
  if (mode === "build") return "compact";
  if (mode === "present") return "spacious";
  return "comfortable";
}
~~~

parseDashboardEntry uses URLSearchParams and an identifier allowlist
[A-Za-z0-9_-]{16,128}. Safe preference reads return null if localStorage
throws. Audience entry never writes a preference.

- [ ] **Step 4: Lift shared state**

In App:

- replace editMode with mode;
- use the new dashboard storage key;
- lift activePageId from DashboardRenderer;
- move PlaybackProvider around the workspace renderer;
- keep displayState and Quorum in App;
- persist mode only on the workspace surface.

In DashboardRenderer:

- accept controlled activePageId and onActivePageChange;
- derive buildMode from mode;
- remove its PlaybackProvider;
- keep the same component instance and all current draft/transaction state.

- [ ] **Step 5: Add the frame and transactional mode request**

ModeSwitcher always renders View, Build, and Present as text buttons with
aria-pressed. When leaving Build:

1. block if a chart wizard/editor draft is unresolved;
2. flush pendingEdits;
3. await the existing serialized commit;
4. set the new mode only after success;
5. retain Build and its bounded error after failure.

Invalid audience entry renders only "Waiting for the moderator." It does not
fall back to workspace chrome.

- [ ] **Step 6: Update old key and copy assertions**

Update source/E2E fixtures to the new key. Change Open edit mode references to
Build where the actual control changed. Assert the old key is ignored rather
than migrated.

- [ ] **Step 7: Run focused tests**

~~~powershell
node --test tests/dashboardMode.test.js tests/dashboardNavigation.test.js tests/dashboardAppV3.test.js
~~~

- [ ] **Step 8: Commit**

~~~powershell
git add src/App.jsx src/main.jsx src/lib/dashboardMode.js src/lib/dashboardNavigation.js src/components/app-shell src/components/DashboardRenderer.jsx src/styles/modes.css tests
git commit -m "feat: add shared dashboard modes"
~~~

---

### Task 3: Extract the Shared Canvas and View Shell

**Required skills:** superpowers:test-driven-development; browser:control-in-app-browser for one live check.

**Files:**
- Create: src/lib/dashboardSelectors.js
- Create: tests/dashboardSelectors.test.js
- Create: src/components/dashboard/DashboardHeader.jsx
- Create: src/components/dashboard/PageNavigation.jsx
- Create: src/components/dashboard/DashboardCanvas.jsx
- Create: src/components/view/ViewShell.jsx
- Create: src/styles/tokens.css
- Modify: src/components/DashboardRenderer.jsx
- Modify: src/main.jsx

**Interfaces:**
- configuredCharts(dashboard).
- findConfiguredChart(dashboard, chartId).
- findPanelPlacement(dashboard, placementId).
- DashboardCanvas receives activePage, dashboard, surface, buildState, displayState, and explicit callbacks.

- [ ] **Step 1: Write the selector regression**

~~~js
test("placement IDs and chart IDs remain distinct", () => {
  assert.equal(findPanelPlacement(dashboard, "placement-a").chart.id, "chart-a");
  assert.equal(findConfiguredChart(dashboard, "chart-a").id, "chart-a");
  assert.equal(findConfiguredChart(dashboard, "placement-a"), null);
});
~~~

- [ ] **Step 2: Confirm failure**

~~~powershell
node --test tests/dashboardSelectors.test.js
~~~

- [ ] **Step 3: Implement selectors and extracted presentation components**

Move repeated chart/placement lookup into dashboardSelectors. Extract:

- a read-only DashboardHeader;
- PageNavigation with aria-current="page";
- DashboardCanvas containing the existing landing/section/LayoutGrid/ChartPanel
  behavior.

Do not refactor chart data, loading, or ECharts.

- [ ] **Step 4: Compose ViewShell**

View shows header, page navigation, playback when configured, shared canvas,
fullscreen, install prompt, and a restrained companion status. It excludes
DeviceLayoutControl and every authoring command.

- [ ] **Step 5: Add only shell tokens**

~~~css
:root {
  --simex-surface-canvas: #f7f9fc;
  --simex-surface-panel: #f8fbff;
  --simex-text-strong: #08224a;
  --simex-text-muted: #49627a;
  --simex-border-subtle: #d8e2ec;
  --simex-focus: #f4b942;
  --simex-control-min: 44px;
}
~~~

Import tokens.css before styles.css and modes.css after styles.css. Migrate
only touched shell selectors.

- [ ] **Step 6: Run focused tests and inspect once**

~~~powershell
node --test tests/dashboardSelectors.test.js tests/landingPage.test.js tests/fullscreenDisplay.test.js
~~~

Inspect View at desktop and iPad portrait in the Vite development server.
Confirm no horizontal overflow, one current page, and no Build utilities.

- [ ] **Step 7: Commit**

~~~powershell
git add src/lib/dashboardSelectors.js src/components/dashboard src/components/view src/components/DashboardRenderer.jsx src/styles/tokens.css src/main.jsx tests/dashboardSelectors.test.js
git commit -m "refactor: extract shared dashboard canvas"
~~~

---

### Task 4: Build the Authoring Workspace

**Required skills:** superpowers:test-driven-development; browser:control-in-app-browser.

**Files:**
- Create: src/components/build/buildSelectionModel.js
- Create: tests/buildSelectionModel.test.js
- Create: src/components/build/BuildWorkspace.jsx
- Create: src/components/build/BuildStructureRail.jsx
- Create: src/components/build/BuildInspector.jsx
- Modify: src/components/chart-authoring/ChartEditorV3.jsx
- Modify: src/components/chart-authoring/ChartEditorModal.jsx
- Modify: src/components/DashboardRenderer.jsx
- Modify: src/App.jsx
- Modify: src/styles/modes.css
- Modify: tests/chartAuthoringComponentsV3.test.js

**Interfaces:**
- Build selection: { kind, pageId?, sectionId?, placementId?, chartId?, groupId? }.
- ChartEditorV3 surface is "dialog" or "inspector"; default is "dialog".

- [ ] **Step 1: Write focused selection and editor tests**

Cover selection reconciliation after page/panel removal, wrapped placement IDs,
and inspector rendering without dialog semantics.

- [ ] **Step 2: Confirm failure**

~~~powershell
node --test tests/buildSelectionModel.test.js tests/chartAuthoringComponentsV3.test.js
~~~

- [ ] **Step 3: Implement the Build layout**

Desktop composes:

1. ordinary nested-list structure rail;
2. the shared live canvas;
3. contextual inspector.

Tablet shows the canvas plus one focus-trapped rail or inspector sheet. Escape
closes the sheet and returns focus. Do not implement an ARIA tree model.

- [ ] **Step 4: Move routine editing into the inspector**

Inspector surfaces:

- scenario/program label/updated date;
- page label/title/description;
- section title/description;
- selected chart editor;
- time-group read-only summary.

Reuse current controlled drafts and 650 ms pendingEdits. Keep time membership in
chart forms. Move DeviceLayoutControl, import/export, Finish Build, Reset, and
appearance controls into a compact Build command area.

- [ ] **Step 5: Embed the chart editor with one guard**

Use the same ChartEditorV3 content:

~~~jsx
return surface === "inspector"
  ? <div className="chart-editor-inspector">{content}</div>
  : <ChartEditorModal onClose={onCancel}>{content}</ChartEditorModal>;
~~~

While a chart draft is open, disable other Build mutations and mode changes
until Save or Cancel. Keep the chart wizard modal.

- [ ] **Step 6: Keep structural actions simple**

New page/section actions create a clearly named default item and focus its
inspector label field. Avoid a new dialog component. Keep existing confirmation
behavior and serialized cleanup.

- [ ] **Step 7: Keep operation errors local**

Initial load errors may replace the app. Background save, import, export, reset,
and chart failures remain in the active Build surface with the last-good
dashboard mounted.

- [ ] **Step 8: Run focused tests and inspect once**

~~~powershell
node --test tests/buildSelectionModel.test.js tests/chartAuthoringComponentsV3.test.js tests/moderatorTransaction.test.js
~~~

Inspect desktop Build and one tablet sheet transition.

- [ ] **Step 9: Commit**

~~~powershell
git add src/App.jsx src/components/build src/components/chart-authoring/ChartEditorV3.jsx src/components/chart-authoring/ChartEditorModal.jsx src/components/DashboardRenderer.jsx src/styles/modes.css tests/buildSelectionModel.test.js tests/chartAuthoringComponentsV3.test.js
git commit -m "feat: add prototype Build workspace"
~~~

---

### Task 5: Refine View Comparison and Fullscreen

**Required skills:** superpowers:test-driven-development; browser:control-in-app-browser.

**Files:**
- Modify: src/components/ChartPanel.jsx
- Modify: src/components/FullscreenDisplay.jsx
- Modify: src/components/view/ViewShell.jsx
- Modify: src/styles/modes.css
- Modify: src/styles.css
- Modify: tests/fullscreenDisplay.test.js

**Interfaces:**
- Explicit Compare charts action starts the existing multi-select flow.
- Fullscreen retains displayController as its only selection/order/layout authority.

- [ ] **Step 1: Add failing focused assertions**

Assert ordered charts, labeled Close all, explicit Compare charts entry, and
focus-scope markup.

- [ ] **Step 2: Confirm failure**

~~~powershell
node --test tests/displayController.test.js tests/fullscreenDisplay.test.js
~~~

- [ ] **Step 3: Add the direct View improvements**

- Add a visible Compare charts action; keep long hold only as a shortcut.
- Keep the four-chart cap in displayController.
- Wrap fullscreen with the existing ModalFocusScope.
- Close on Escape and restore focus.
- Make primary View controls 44 pixels without changing chart colors/data.

- [ ] **Step 4: Run focused tests and inspect once**

~~~powershell
node --test tests/displayController.test.js tests/fullscreenDisplay.test.js
~~~

Inspect one desktop multi-chart comparison and iPad landscape View.

- [ ] **Step 5: Commit**

~~~powershell
git add src/components/ChartPanel.jsx src/components/FullscreenDisplay.jsx src/components/view/ViewShell.jsx src/styles/modes.css src/styles.css tests/fullscreenDisplay.test.js
git commit -m "feat: refine dashboard View mode"
~~~

---

### Task 6: Add the Minimal Presentation Channel

**Required skills:** superpowers:test-driven-development; superpowers:systematic-debugging only for a reproduced lifecycle failure.

**Files:**
- Create: src/lib/presentationProtocol.js
- Create: src/lib/presentationChannel.js
- Create: src/lib/presentationWindow.js
- Create: tests/presentationProtocol.test.js
- Create: tests/presentationChannel.test.js
- Create: tests/presentationWindow.test.js

**Interfaces:**
- PRESENTATION_PROTOCOL_VERSION = 1.
- Message types: ready, state, heartbeat, ended.
- createPresentationControllerChannel() returns start, publish, end, dispose.
- createPresentationAudienceChannel() returns start, dispose.
- openAudienceWindow() returns { status, windowRef, url }.

- [ ] **Step 1: Write failing protocol and fake-channel tests**

Cover:

- ready receives latest full state;
- each state has a monotonic sequence;
- reload ready receives the latest state;
- malformed messages are ignored;
- audience heartbeat every 1500 ms;
- controller marks disconnected after 5000 ms without heartbeat;
- end clears timers/listeners;
- blocked popup returns status "blocked";
- presentation state contains no rows, dataSources, csvText, or credentials.

- [ ] **Step 2: Confirm failure**

~~~powershell
node --test tests/presentationProtocol.test.js tests/presentationChannel.test.js tests/presentationWindow.test.js
~~~

- [ ] **Step 3: Implement the small message shape**

~~~js
{
  protocol_version: 1,
  session_id: "validated-session-id",
  sequence: 1,
  type: "state",
  payload: {
    active_page_id: "biomedical",
    displayed_chart_ids: ["chart-a", "chart-b"],
    layout: "sideBySide",
    time: null,
    show_scene_title: true,
    blackout: false
  }
}
~~~

Use basic identifier, 0–4 unique chart, layout, boolean, and finite-time checks.
Do not add senders, audience identities, acknowledgements, patches, encryption,
tokens, or a generic protocol framework.

- [ ] **Step 4: Implement the direct channel lifecycle**

- Controller stores one latest state.
- Audience sends ready, then heartbeat every 1500 ms.
- Controller sends the complete latest state on ready and on every visible
  change.
- Controller treats 5000 ms without heartbeat as disconnected.
- Audience keeps the last state if messages stop.
- ended moves audience to the neutral waiting state.
- Cleanup is idempotent for React StrictMode.

- [ ] **Step 5: Implement synchronous popup**

Use crypto.randomUUID only to avoid channel-name collisions. Build the current
app URL with mode=present, surface=audience, and channel. Call window.open
directly inside the Open display click handler.

- [ ] **Step 6: Run focused tests**

~~~powershell
node --test tests/presentationProtocol.test.js tests/presentationChannel.test.js tests/presentationWindow.test.js
~~~

- [ ] **Step 7: Commit**

~~~powershell
git add src/lib/presentationProtocol.js src/lib/presentationChannel.js src/lib/presentationWindow.js tests/presentationProtocol.test.js tests/presentationChannel.test.js tests/presentationWindow.test.js
git commit -m "feat: add minimal local presentation channel"
~~~

---

### Task 7: Build the Audience Surface

**Required skills:** superpowers:test-driven-development; browser:control-in-app-browser.

**Files:**
- Create: src/components/display/DisplayedChartGrid.jsx
- Create: src/components/presentation/AudienceDisplay.jsx
- Create: src/styles/presentation.css
- Create: tests/audienceDisplay.test.js
- Modify: src/components/FullscreenDisplay.jsx
- Modify: src/components/playback/PlaybackProvider.jsx
- Modify: src/components/charts/ChartView.jsx
- Modify: src/App.jsx
- Modify: src/main.jsx
- Modify: tests/fullscreenDisplay.test.js
- Modify: tests/playbackComponentsV3.test.js

**Interfaces:**
- DisplayedChartGrid receives dashboard, chartIds, layout, timeContextForChart, surface, renderCellControls.
- AudienceDisplay receives dashboard, connectionStatus, presentationState.
- Export buildMemberTimeContexts(group, activeEpochMs).
- ChartView interactionMode is "active" or "passive".

- [ ] **Step 1: Write failing audience tests**

Assert waiting state, ordered 1–4 charts, layout class, blackout without chart
unmount, last scene after disconnect, and absence of buttons/navigation/source
actions/authoring chrome.

- [ ] **Step 2: Confirm failure**

~~~powershell
node --test tests/audienceDisplay.test.js tests/fullscreenDisplay.test.js tests/playbackComponentsV3.test.js
~~~

- [ ] **Step 3: Extract only the display grid**

Fullscreen keeps dialog controls, citations, reorder, layout, and close.
DisplayedChartGrid owns chart lookup, count/layout classes, cells, and ChartView.
Audience passes no cell controls.

- [ ] **Step 4: Reuse playback time without a second playback engine**

Export buildMemberTimeContexts from PlaybackProvider. Audience finds the local
time group from presentationState.time.group_id and derives per-chart contexts
from the received epoch. It does not mount a controlled PlaybackProvider or
receive data through the channel.

- [ ] **Step 5: Add passive chart rendering**

interactionMode="passive" preserves visual and accessible chart output but
suppresses zoom guidance and dashboard interaction chrome.

- [ ] **Step 6: Add the App audience branch**

Audience loads the same dashboard data locally and reads the new saved
configuration key without writing it. Skip Quorum, Vanta, edit setup, and raw
fatal errors. Invalid/loading/disconnected-without-state all show "Waiting for
the moderator."

- [ ] **Step 7: Run focused tests and inspect 16:9**

~~~powershell
node --test tests/audienceDisplay.test.js tests/fullscreenDisplay.test.js tests/playbackComponentsV3.test.js
~~~

Inspect waiting, two-chart, and blackout at 1920 by 1080. Confirm no controls
or overflow.

- [ ] **Step 8: Commit**

~~~powershell
git add src/App.jsx src/main.jsx src/components/display src/components/presentation/AudienceDisplay.jsx src/components/FullscreenDisplay.jsx src/components/playback/PlaybackProvider.jsx src/components/charts/ChartView.jsx src/styles/presentation.css tests/audienceDisplay.test.js tests/fullscreenDisplay.test.js tests/playbackComponentsV3.test.js
git commit -m "feat: add audience presentation surface"
~~~

---

### Task 8: Build the Moderator Present Workspace

**Required skills:** superpowers:test-driven-development; browser:control-in-app-browser.

**Files:**
- Create: src/components/presentation/PresentWorkspace.jsx
- Modify: src/components/DashboardRenderer.jsx
- Modify: src/styles/presentation.css
- Create: tests/presentWorkspace.test.js

**Interfaces:**
- PresentWorkspace receives dashboard, activePageId, onActivePageChange, displayState, onDisplayAction, accessibilityEnabled.
- It consumes usePlayback from the already shared PlaybackProvider.

- [ ] **Step 1: Write failing component assertions**

Assert Open display, connection status, grouped chart choices, order/layout
controls, synchronized-time controls, title toggle, Blackout/Restore, End, and
absence of permission concepts.

- [ ] **Step 2: Confirm failure**

~~~powershell
node --test tests/presentWorkspace.test.js tests/displayController.test.js
~~~

- [ ] **Step 3: Implement PresentWorkspace directly**

- Use displayController for chart set/order/layout.
- Use existing playback context and send only group ID plus active epoch.
- Keep blackout and show title as local presentation state.
- Create the channel before window.open.
- Publish the complete small state after every audience-visible change.
- Open/reopen/end use labeled text buttons.
- Zero selected charts is a valid holding scene.

- [ ] **Step 4: Make shell mounting mode-specific**

DashboardRenderer composes ViewShell, BuildWorkspace, or PresentWorkspace while
remaining mounted. FullscreenDisplay mounts only in View and Build. Quorum
changes to App displayState automatically reach Present.

- [ ] **Step 5: Run focused tests and inspect dual-window behavior**

~~~powershell
node --test tests/presentWorkspace.test.js tests/displayController.test.js tests/presentationChannel.test.js
~~~

Inspect open, select two charts, reorder, change layout/time, blackout, reload,
close, and reopen. Do not add behavior beyond these actions.

- [ ] **Step 6: Commit**

~~~powershell
git add src/components/presentation/PresentWorkspace.jsx src/components/DashboardRenderer.jsx src/styles/presentation.css tests/presentWorkspace.test.js
git commit -m "feat: add moderator Present workspace"
~~~

---

### Task 9: Add Focused Browser Coverage and Prototype Documentation

**Required skills:** superpowers:subagent-driven-development for bounded ownership. Defer gsd-verify-work and superpowers:verification-before-completion until the declared pre-merge gate.

**Files:**
- Create: tests/e2e/three-mode-prototype.spec.js
- Modify: existing E2E files coupled to old key/edit copy.
- Modify: README.md
- Modify: docs/app-manual.md
- Modify: docs/quorum-companion.md

**Interfaces:**
- No production test hooks or new dependencies.

- [ ] **Step 1: Author one E2E file**

Cover only:

1. all modes visible and active page preserved;
2. Build metadata edit and failed-save retention;
3. View Compare charts and fullscreen Escape;
4. controller opens audience and updates two-chart layout;
5. synchronized time, blackout, reload, disconnect, reopen;
6. iPad View/Build and 1920 by 1080 audience without overflow.

Use the unit-injected popup test for blocked popup.

- [ ] **Step 2: Update existing selectors**

Change old key and Open edit mode selectors where the user-facing contract
changed. Remove markup-only expectations instead of preserving obsolete DOM.

- [ ] **Step 3: Check E2E syntax without running deferred gates**

~~~powershell
node --check tests/e2e/three-mode-prototype.spec.js
~~~

- [ ] **Step 4: Update concise documentation**

README and manual explain View, Build, Present, same-computer audience, new save
key, and lack of migration. Include:

> Prototype for education and training only. Non-commercial. No guarantees of
> availability, accuracy, suitability, security, support, or compatibility.

Quorum documentation states Standalone/Connected are connection statuses, not
UI modes.

- [ ] **Step 5: Run the focused documentation check**

~~~powershell
git diff --check
Select-String -Path README.md,docs/app-manual.md,docs/quorum-companion.md -Pattern "Open edit mode|participant-facing.*read-only"
~~~

- [ ] **Step 6: Commit**

~~~powershell
git add tests/e2e README.md docs/app-manual.md docs/quorum-companion.md
git commit -m "docs: document three-mode training prototype"
~~~

- [ ] **Step 7: Pause for the user's pre-merge declaration**

Do not run full gates, push, merge, deploy, or advance the Cloudflare branch.

---

## Pre-Merge Gate

Only after the user declares readiness:

~~~powershell
pnpm.cmd test
pnpm.cmd build
pnpm.cmd test:e2e -- --project=chromium
~~~

Then perform one concise gsd-verify-work pass for View, Build, controller, and
audience. Use superpowers:verification-before-completion before making a success
claim.
