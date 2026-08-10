# Three-Mode Dashboard Implementation Plan

> **Superseded for execution:** The user subsequently made agile educational
> prototype delivery and minimum safeguards explicit requirements. Execute
> docs/superpowers/plans/2026-08-10-three-mode-dashboard-prototype.md instead.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Deliver universally available View, Build, and Present modes over one shared SimEx V3 runtime, including a moderator-controlled same-computer audience display.

**Architecture:** Keep one application-owned dashboard, active-page, playback, and display-state authority. View and Build compose one shared canvas with different shells; Present reuses the display reducer and publishes only validated presentation state to a chrome-free audience window through a versioned BroadcastChannel protocol. Browser saves use a new persistence epoch, and no migration is provided for pre-redesign saves or packages.

**Tech Stack:** React 19, Vite 6, ECharts 5, plain CSS, Node test runner, Playwright, browser BroadcastChannel, existing SimEx icon registry.

## Global Constraints

- The approved design is docs/superpowers/specs/2026-08-10-three-mode-dashboard-design.md.
- View, Build, and Present are tasks, not roles. Every workspace shows all three; add no authentication, authorization, permission, or persona props.
- Version 3 remains the only dashboard configuration contract. Do not add version-2 paths.
- Use DASHBOARD_STORAGE_KEY = "simex-dashboard-config-v3-three-mode-v1". Ignore, but do not delete, the old "simex-dashboard-config-v3" value.
- Pre-redesign browser saves and package files have no compatibility guarantee. Do not add migration, reconciliation, or adapter code for them.
- Do not change the bundle envelope merely to force incompatibility. Keep the strict parser and allow genuine schema differences to fail clearly.
- Keep mode, surface, channel, presentation, and playback-session state outside dashboard.json and exported bundles.
- Keep one mounted shared runtime. Mode changes must not reset the active page, playback state, display selection, or Build drafts.
- Keep React, Vite, ECharts, the generated icon registry, the V3 chart registry, static/PWA operation, and optional Quorum companion. Add no router, backend, UI framework, or cross-device transport.
- Presentation phase one is same-computer, same-origin only. Unsupported BroadcastChannel produces a clear controller state; do not add a fallback transport.
- The audience window never starts Quorum, Vanta, authoring effects, or workspace preference writes, and never displays raw technical errors.
- Structural authoring uses panel placement IDs. Fullscreen and Present selection use chart IDs. Never treat them as interchangeable.
- Preserve the 650 ms debounced edit queue, serialized commit authority, save/reset/remove failure behavior, chart-wizard transaction, and last-good dashboard.
- Keep the chart wizard modal. An embedded chart editor locks other Build mutations until Save or Cancel because cancel currently restores a whole-dashboard baseline.
- Use labeled text controls for new Open display, Reopen, Blackout, Restore, and End presentation actions. Reuse registered icons only where an interaction ID already exists.
- Compact, Comfortable, and Spacious density change shell tokens, not chart meaning or saved configuration.
- During implementation, run only the focused unit/component command named by the task and inspect UI changes through the Vite development server. Do not run the complete build or E2E gates.
- When the user declares the branch ready for pre-merge verification, run pnpm.cmd test, pnpm.cmd build, and pnpm.cmd test:e2e -- --project=chromium once each, following AGENTS.md if a gate fails.
- At the start of execution, re-check for packaged-dashboard-bundle.json. If it exists, stop and follow the repository promotion policy before changing application code.

---

## Delivery Order

1. Visual evidence and UI contract
2. Mode, persistence, and shared-state foundation
3. Shared View/Build canvas extraction
4. Build workspace and safe authoring refinement
5. View and fullscreen refinement
6. Presentation protocol, transport, audience, and controller
7. Integrated validation, documentation, and handoff

The sequence is intentional. Present cannot safely start until active-page and playback state are application-owned, and Build cannot become a separate shell until its pending-edit transaction remains in the mounted renderer.

## File Responsibility Map

### New design evidence

- docs/verification/2026-08-10-three-mode-baseline.md — observed desktop, iPad, and 16:9 baseline findings.
- docs/superpowers/specs/2026-08-10-three-mode-dashboard-ui-spec.md — accepted visual and responsive contract.
- docs/superpowers/sketches/2026-08-10-three-mode-dashboard/index.html — disposable review sketch for the four target surfaces.

### New shared runtime and shell files

- src/lib/dashboardMode.js — mode vocabulary, density mapping, and query-entry parsing.
- src/lib/dashboardPersistence.js — new storage keys and safe mode preference reads/writes.
- src/lib/dashboardNavigation.js — active-page initialization and reconciliation.
- src/lib/dashboardSelectors.js — configured-chart and placement lookup authorities.
- src/components/app-shell/AppFrame.jsx — shared workspace frame and mode/density attributes.
- src/components/app-shell/ModeSwitcher.jsx — always-visible View, Build, Present switcher.
- src/components/dashboard/DashboardHeader.jsx — read-only scenario/page identity.
- src/components/dashboard/PageNavigation.jsx — shared page buttons with active semantics.
- src/components/dashboard/DashboardCanvas.jsx — shared landing, section, panel, and chart surface.

### New View and Build files

- src/components/view/ViewShell.jsx — comfortable personal-view composition.
- src/components/build/buildSelectionModel.js — placement-aware Build selection and reconciliation.
- src/components/build/BuildWorkspace.jsx — desktop three-region and tablet-sheet composition.
- src/components/build/BuildStructureRail.jsx — scenario/page/section/placement/time-group navigation.
- src/components/build/BuildInspector.jsx — scenario, page, section, chart, and time-group inspector surfaces.
- src/components/build/BuildCommandBar.jsx — finish/reset/add/import/export/appearance commands.
- src/components/common/TextEntryDialog.jsx — accessible replacement for structural window.prompt calls.
- src/styles/tokens.css — semantic tokens and density variables for touched surfaces.
- src/styles/app-frame.css — shared frame and mode switch.
- src/styles/view-shell.css — comfortable view and touch behavior.
- src/styles/build-workspace.css — compact desktop workspace and tablet sheets.

### New Present files

- src/lib/presentationProtocol.js — strict versioned presentation messages and state validation.
- src/lib/presentationChannel.js — controller/audience BroadcastChannel lifecycle.
- src/lib/presentationWindow.js — synchronous popup open and same-app URL construction.
- src/components/display/DisplayedChartGrid.jsx — control-free chart-grid rendering core.
- src/components/presentation/AudienceDisplayShell.jsx — chrome-free entry, loading, holding, and error boundary.
- src/components/presentation/AudienceDisplay.jsx — title, chart grid, blackout cover, and last-valid scene.
- src/components/presentation/PresentWorkspace.jsx — moderator selection, layout, playback, connection, and display actions.
- src/components/presentation/usePresentationController.js — popup/channel lifecycle bound to React.
- src/styles/presentation.css — uncapped controller and 16:9 audience layouts.

### New focused tests

- tests/dashboardMode.test.js
- tests/dashboardNavigation.test.js
- tests/dashboardShellComponents.test.js
- tests/dashboardSelectors.test.js
- tests/modeSwitcher.test.js
- tests/buildSelectionModel.test.js
- tests/presentationProtocol.test.js
- tests/presentationChannel.test.js
- tests/presentationWindow.test.js
- tests/audienceDisplay.test.js
- tests/e2e/dashboard-modes.spec.js
- tests/e2e/build-view-shells.spec.js
- tests/e2e/presentation-mode.spec.js

### Principal modified files

- src/App.jsx — persistence epoch, mode/entry, active page, shared PlaybackProvider, audience branch, and fatal versus operation errors.
- src/main.jsx — ordered style imports.
- src/components/DashboardRenderer.jsx — mounted orchestration, transactional mode requests, and shell composition.
- src/components/ChartPanel.jsx — explicit compare entry and Build selection behavior.
- src/components/FullscreenDisplay.jsx — shared grid extraction plus real focus scope.
- src/components/chart-authoring/ChartEditorV3.jsx — dialog or inspector surface.
- src/components/chart-authoring/ChartEditorModal.jsx — optional wrapper only for dialog surface.
- src/components/playback/PlaybackProvider.jsx — application-level ownership and presentation state reporting.
- src/charting/time/playbackReducer.js — validated external presentation synchronization.
- src/components/charts/ChartView.jsx — passive audience interaction mode.
- src/styles.css — only touched legacy selectors; do not perform a wholesale token rewrite.
- package.json and pnpm-lock.yaml — JavaScript axe integration at the final validation task.
- README.md, docs/app-manual.md, docs/quorum-companion.md — three-mode usage and clean-cutover documentation.
- Existing E2E files that reference the old storage key or Open edit mode copy.

---

### Task 0: Establish the Visual Evidence and UI Contract

**Required skills:** gsd-ui-review; browser:control-in-app-browser; gsd-ui-phase; gsd-sketch.

**Files:**
- Create: docs/verification/2026-08-10-three-mode-baseline.md
- Create: docs/superpowers/specs/2026-08-10-three-mode-dashboard-ui-spec.md
- Create: docs/superpowers/sketches/2026-08-10-three-mode-dashboard/index.html

**Interfaces:**
- Consumes: the approved three-mode design and the live main-based worktree.
- Produces: exact token values, frame geometry, component states, and accepted screen composition used by Tasks 3 through 13.

- [ ] **Step 1: Audit the live baseline**

Start the Vite development server and use gsd-ui-review plus the in-app browser at:

- 1440 by 900 desktop
- 1024 by 1366 iPad portrait
- 1366 by 1024 iPad landscape
- 1920 by 1080 audience display

For each size, record only observable evidence under these headings: orientation and hierarchy, page navigation, authoring discovery, chart comparison, touch reachability, focus/keyboard behavior, density, and distance legibility. Put interpretations in a separate column.

- [ ] **Step 2: Write the baseline report**

The report must rank findings by effect on these concrete tasks:

1. Locate and interpret a biomedical chart in View.
2. Change a page or section title and recover from failed persistence in Build.
3. Select, order, and show two charts from Present.
4. Read the audience display from across a room.

- [ ] **Step 3: Produce the UI specification**

Invoke gsd-ui-phase. The UI specification must lock:

- Mode-switch location, labels, pressed/blocked/pending states
- View header, page navigation, restrained utilities, and Compare charts entry
- Build rail width, inspector width, command bar, canvas minimum, and tablet-sheet behavior
- Present controller regions, connection labels, scene controls, and blackout state
- Audience title policy, holding state, 1–4 chart geometries, and safe-area spacing
- Compact, Comfortable, and Spacious token values
- 44 by 44 pixel primary targets in View and Present controller
- Focus order, sheet/dialog behavior, reduced motion, and non-color state cues

- [ ] **Step 4: Sketch all target surfaces**

Invoke gsd-sketch and create one HTML review artifact with toggles for:

- View desktop and iPad
- Build desktop and iPad sheet
- Present controller
- Audience holding, one-chart, two-chart, four-chart, and blackout scenes

Use real dashboard labels and representative chart blocks. Do not connect the sketch to production data or code.

- [ ] **Step 5: Review and freeze the visual contract**

Compare the sketch to the baseline tasks. Record accepted decisions in the UI specification and remove rejected variants from the sketch controls. Production work begins only after this artifact is marked Approved.

- [ ] **Step 6: Commit the evidence**

~~~powershell
git add docs/verification/2026-08-10-three-mode-baseline.md docs/superpowers/specs/2026-08-10-three-mode-dashboard-ui-spec.md docs/superpowers/sketches/2026-08-10-three-mode-dashboard/index.html
git commit -m "docs: define three-mode dashboard UI contract"
~~~

---

### Task 1: Add the Pure Mode and Persistence Epoch

**Required skills:** superpowers:test-driven-development, scaled to the focused Node test.

**Files:**
- Create: src/lib/dashboardMode.js
- Create: src/lib/dashboardPersistence.js
- Create: tests/dashboardMode.test.js

**Interfaces:**
- Produces: DASHBOARD_MODES, DEFAULT_DASHBOARD_MODE, isDashboardMode(), densityForDashboardMode(), parseDashboardEntry(), resolveInitialDashboardMode(), DASHBOARD_STORAGE_KEY, DASHBOARD_MODE_STORAGE_KEY, safe mode preference reads/writes.
- Consumed by: AppFrame, App, audience entry, and mode-transition tasks.

- [ ] **Step 1: Write the failing mode tests**

~~~js
import assert from "node:assert/strict";
import test from "node:test";
import {
  densityForDashboardMode,
  parseDashboardEntry,
  resolveInitialDashboardMode,
} from "../src/lib/dashboardMode.js";
import {
  DASHBOARD_STORAGE_KEY,
  readDashboardModePreference,
  writeDashboardModePreference,
} from "../src/lib/dashboardPersistence.js";

test("invalid state falls back to View and each mode has one density", () => {
  assert.equal(resolveInitialDashboardMode({ storedMode: "owner" }), "view");
  assert.equal(densityForDashboardMode("view"), "comfortable");
  assert.equal(densityForDashboardMode("build"), "compact");
  assert.equal(densityForDashboardMode("present"), "spacious");
});

test("audience entry remains an audience surface even with an invalid channel", () => {
  const valid = parseDashboardEntry(
    "?mode=present&surface=audience&channel=1234567890abcdef",
  );
  assert.deepEqual(valid, {
    surface: "audience",
    requestedMode: "present",
    channelId: "1234567890abcdef",
    issue: null,
  });
  const invalid = parseDashboardEntry("?surface=audience&channel=bad");
  assert.equal(invalid.surface, "audience");
  assert.equal(invalid.requestedMode, "present");
  assert.equal(invalid.channelId, null);
  assert.equal(invalid.issue, "invalid_channel");
});

test("the redesign uses a new key and safe preference wrappers", () => {
  assert.equal(
    DASHBOARD_STORAGE_KEY,
    "simex-dashboard-config-v3-three-mode-v1",
  );
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.equal(writeDashboardModePreference(storage, "build"), true);
  assert.equal(readDashboardModePreference(storage), "build");
});
~~~

- [ ] **Step 2: Run the focused test and confirm the missing modules fail**

~~~powershell
node --test tests/dashboardMode.test.js
~~~

Expected: FAIL because dashboardMode.js and dashboardPersistence.js do not exist.

- [ ] **Step 3: Implement the pure mode model**

Use this public contract:

~~~js
export const DASHBOARD_MODES = Object.freeze(["view", "build", "present"]);
export const DEFAULT_DASHBOARD_MODE = "view";

const CHANNEL_ID = /^[A-Za-z0-9_-]{16,128}$/;

export function isDashboardMode(value) {
  return DASHBOARD_MODES.includes(value);
}

export function densityForDashboardMode(mode) {
  if (mode === "build") return "compact";
  if (mode === "present") return "spacious";
  return "comfortable";
}

export function parseDashboardEntry(search = "") {
  const parameters = new URLSearchParams(search);
  const audience = parameters.get("surface") === "audience";
  const channel = parameters.get("channel");
  if (audience) {
    return Object.freeze({
      surface: "audience",
      requestedMode: "present",
      channelId: CHANNEL_ID.test(channel ?? "") ? channel : null,
      issue: CHANNEL_ID.test(channel ?? "") ? null : "invalid_channel",
    });
  }
  const requested = parameters.get("mode");
  return Object.freeze({
    surface: "workspace",
    requestedMode: isDashboardMode(requested) ? requested : null,
    channelId: null,
    issue: null,
  });
}

export function resolveInitialDashboardMode({ entry, storedMode } = {}) {
  if (entry?.surface === "audience") return "present";
  if (isDashboardMode(entry?.requestedMode)) return entry.requestedMode;
  return isDashboardMode(storedMode) ? storedMode : DEFAULT_DASHBOARD_MODE;
}
~~~

- [ ] **Step 4: Implement safe persistence helpers**

Export these exact keys:

~~~js
export const DASHBOARD_STORAGE_KEY =
  "simex-dashboard-config-v3-three-mode-v1";
export const DASHBOARD_MODE_STORAGE_KEY =
  "simex-dashboard-ui-mode-v1";
export const DEVICE_LAYOUT_STORAGE_KEY =
  "simex-dashboard-device-layout-v3";
~~~

readDashboardModePreference() returns null on unavailable storage, invalid values, or exceptions. writeDashboardModePreference() writes only a valid mode and returns false instead of making the app fatal when storage throws.

- [ ] **Step 5: Run the focused test**

~~~powershell
node --test tests/dashboardMode.test.js
~~~

Expected: PASS.

- [ ] **Step 6: Commit**

~~~powershell
git add src/lib/dashboardMode.js src/lib/dashboardPersistence.js tests/dashboardMode.test.js
git commit -m "feat: add dashboard mode and persistence model"
~~~

---

### Task 2: Lift Shared Navigation and Playback State

**Required skills:** superpowers:test-driven-development, scaled to navigation and playback tests.

**Files:**
- Create: src/lib/dashboardNavigation.js
- Create: tests/dashboardNavigation.test.js
- Create: src/components/dashboard/DashboardHeader.jsx
- Create: src/components/dashboard/PageNavigation.jsx
- Create: tests/dashboardShellComponents.test.js
- Modify: src/App.jsx:42-113, 359-470
- Modify: src/components/DashboardRenderer.jsx:27-183, 633-861, 1039-1055
- Test: tests/landingPage.test.js
- Test: tests/playbackComponentsV3.test.js

**Interfaces:**
- Produces: reconcileActivePageId(pages, requestedId), a controlled activePageId prop, and one App-level PlaybackProvider.
- Consumed by: ViewShell, BuildWorkspace, PresentWorkspace, and the audience scene.

- [ ] **Step 1: Write the failing navigation test**

~~~js
import assert from "node:assert/strict";
import test from "node:test";
import { reconcileActivePageId } from "../src/lib/dashboardNavigation.js";

const pages = [{ id: "home" }, { id: "biomedical" }];

test("active page is preserved when valid and falls back after removal", () => {
  assert.equal(reconcileActivePageId(pages, "biomedical"), "biomedical");
  assert.equal(reconcileActivePageId(pages, "missing"), "home");
  assert.equal(reconcileActivePageId([], "biomedical"), null);
});
~~~

- [ ] **Step 2: Run the focused test and confirm failure**

~~~powershell
node --test tests/dashboardNavigation.test.js
~~~

Expected: FAIL because dashboardNavigation.js does not exist.

- [ ] **Step 3: Implement navigation reconciliation**

reconcileActivePageId() accepts an array, keeps a matching non-empty ID, otherwise returns the first valid page ID or null. Freeze no dashboard objects and mutate nothing.

- [ ] **Step 4: Lift activePageId into App**

In App:

- Initialize activePageId after dashboard hydration.
- Reconcile it whenever dashboard.pages changes.
- Pass activePageId and onActivePageChange to DashboardRenderer.
- Update page removal/import flows so reconciliation happens through the effect, not a second page authority.

In DashboardRenderer:

- Remove its activePageId useState.
- Replace direct setActivePageId() calls with onActivePageChange().
- Preserve selected-panel clearing inside navigateToPage().

- [ ] **Step 5: Lift PlaybackProvider into App**

Move the existing provider, unchanged, around the workspace renderer:

~~~jsx
<PlaybackProvider
  groups={dashboard.timeSyncGroups ?? []}
  charts={configuredCharts(dashboard)}
  loadedData={dashboard.loadedData ?? {}}
  profiles={dashboard.datasetProfiles ?? {}}
  initialPosition="latest"
>
  <DashboardRenderer
    dashboard={dashboard}
    activePageId={activePageId}
    onActivePageChange={setActivePageId}
  />
</PlaybackProvider>
~~~

Remove the provider wrapper from DashboardRenderer. Do not conditionally remount the provider when the workspace mode changes.

- [ ] **Step 6: Extract read-only header and page navigation**

DashboardHeader receives dashboard and activePage and renders no inputs. PageNavigation receives pages, activePageId, and onNavigate; every button includes aria-current="page" only when active.

- [ ] **Step 7: Add the shared-component render test**

Use the repository's Vite SSR pattern to prove DashboardHeader renders one page heading without inputs and PageNavigation marks exactly one current page.

- [ ] **Step 8: Run focused state/component checks**

~~~powershell
node --test tests/dashboardNavigation.test.js tests/dashboardShellComponents.test.js tests/landingPage.test.js tests/playbackComponentsV3.test.js
~~~

Expected: PASS.

- [ ] **Step 9: Commit**

~~~powershell
git add src/App.jsx src/components/DashboardRenderer.jsx src/components/dashboard/DashboardHeader.jsx src/components/dashboard/PageNavigation.jsx src/lib/dashboardNavigation.js tests/dashboardNavigation.test.js tests/dashboardShellComponents.test.js
git commit -m "refactor: lift dashboard navigation and playback state"
~~~

---

### Task 3: Add the Application Frame and Transactional Mode Switching

**Required skills:** superpowers:test-driven-development; superpowers:systematic-debugging only if a focused check exposes a failure.

**Files:**
- Create: src/components/app-shell/AppFrame.jsx
- Create: src/components/app-shell/ModeSwitcher.jsx
- Create: src/components/presentation/AudienceDisplayShell.jsx
- Create: src/styles/app-frame.css
- Create: tests/modeSwitcher.test.js
- Modify: src/main.jsx
- Modify: src/App.jsx
- Modify: src/components/DashboardRenderer.jsx
- Modify: tests/dashboardAppV3.test.js
- Update storage-key constants in the existing E2E files listed in the File Responsibility Map.

**Interfaces:**
- AppFrame props: mode, surface, modeDisabled, blockedReason, onModeRequest, children.
- ModeSwitcher props: mode, onModeRequest, disabled, blockedReason.
- AudienceDisplayShell props: dashboard, channelId, issue.
- DashboardRenderer props replace editMode/onToggleEditMode with mode/onModeRequest/onEnterBuildSession/onCommitBuildSession/onResetBuildSession.

- [ ] **Step 1: Write the failing ModeSwitcher render test**

Use the existing Vite SSR pattern from fullscreenDisplay.test.js. Assert that View, Build, and Present are all rendered, the selected button has aria-pressed="true", and no role or permission prop is required.

- [ ] **Step 2: Run the focused test and confirm failure**

~~~powershell
node --test tests/modeSwitcher.test.js
~~~

Expected: FAIL because ModeSwitcher is missing.

- [ ] **Step 3: Implement ModeSwitcher and AppFrame**

ModeSwitcher uses a nav labelled "Dashboard mode" and three text buttons:

~~~jsx
<button
  type="button"
  aria-pressed={mode === value}
  disabled={disabled}
  onClick={() => onModeRequest(value)}
>
  {label}
</button>
~~~

AppFrame sets:

~~~jsx
<main
  className="app-shell"
  data-dashboard-mode={mode}
  data-density={densityForDashboardMode(mode)}
  data-dashboard-surface={surface}
>
~~~

Use the accepted UI specification for placement and token values.

- [ ] **Step 4: Replace editMode with mode without remounting the renderer**

In App:

- Parse the entry once.
- Read the new workspace preference.
- Use the new dashboard storage key.
- Store mode only when entry.surface is workspace.
- Capture the Build baseline when entering Build.

In DashboardRenderer:

- Derive buildMode = mode === "build".
- Replace every editMode condition with the equivalent buildMode condition.
- Keep all existing draft, gate, debounce, wizard, editor, and confirmation state in the mounted component.

- [ ] **Step 5: Make Build exit transactional**

Route mode clicks through DashboardRenderer because it owns pendingEdits and chart-authoring state:

~~~js
async function requestModeChange(nextMode) {
  if (nextMode === mode) return;
  if (chartAuthoringActive) {
    setModeChangeError(
      "Save or cancel chart authoring before changing dashboard mode.",
    );
    return;
  }
  if (buildMode) {
    await performModeratorOperation("save-session", async () => {
      await pendingEdits.flush();
      await onCommitBuildSession();
      onModeRequest(nextMode);
    });
    return;
  }
  if (nextMode === "build") await onEnterBuildSession();
  onModeRequest(nextMode);
}
~~~

If flush or commit rejects, keep Build active and display the bounded error. Finish Build remains a shortcut to request View. Reset restores the baseline and then requests View only after success.

- [ ] **Step 6: Establish the audience branch**

For entry.surface === "audience", App renders AudienceDisplayShell instead of DashboardRenderer. Do not write the mode preference, initialize Vanta, or start Quorum. Invalid audience channels render only a neutral "Waiting for the moderator" surface.

- [ ] **Step 7: Apply the clean persistence cutover**

Update tests and E2E initialization helpers to use the new key. Replace the old saved-dashboard preservation case in showcase-home.spec.js with two assertions:

- a value stored only at simex-dashboard-config-v3 is ignored;
- a value stored at simex-dashboard-config-v3-three-mode-v1 is loaded.

Do not delete or migrate the legacy key.

- [ ] **Step 8: Run focused checks**

~~~powershell
node --test tests/dashboardMode.test.js tests/modeSwitcher.test.js tests/dashboardAppV3.test.js
~~~

Expected: PASS.

- [ ] **Step 9: Commit**

~~~powershell
git add src/App.jsx src/main.jsx src/components/DashboardRenderer.jsx src/components/app-shell src/components/presentation/AudienceDisplayShell.jsx src/styles/app-frame.css tests
git commit -m "feat: add transactional dashboard mode switching"
~~~

---

### Task 4: Extract the Shared Canvas and Build the View Shell

**Required skills:** superpowers:test-driven-development; browser:control-in-app-browser for one live responsive review.

**Files:**
- Create: src/lib/dashboardSelectors.js
- Create: tests/dashboardSelectors.test.js
- Create: src/components/dashboard/DashboardCanvas.jsx
- Create: src/components/view/ViewShell.jsx
- Create: src/styles/tokens.css
- Create: src/styles/view-shell.css
- Modify: src/components/DashboardRenderer.jsx
- Modify: src/components/ChartPanel.jsx
- Modify: src/main.jsx

**Interfaces:**
- configuredCharts(dashboard), findConfiguredChart(dashboard, chartId), findPanelPlacement(dashboard, placementId).
- DashboardCanvas receives activePage, dashboard, surface, accessibilityEnabled, buildState, displayState, and explicit action callbacks.
- ViewShell composes DashboardHeader, PageNavigation, playback surface, DashboardCanvas, FullscreenDisplay, footer, install prompt, and companion status.

- [ ] **Step 1: Write failing selector tests**

Cover a wrapped placement whose placement ID differs from its chart ID:

~~~js
assert.equal(findPanelPlacement(dashboard, "placement-a").chart.id, "chart-a");
assert.equal(findConfiguredChart(dashboard, "chart-a").id, "chart-a");
assert.equal(findConfiguredChart(dashboard, "placement-a"), null);
~~~

- [ ] **Step 2: Run the focused test and confirm failure**

~~~powershell
node --test tests/dashboardSelectors.test.js
~~~

- [ ] **Step 3: Implement and adopt the selector authority**

Move repeated configuredCharts/findPanel logic from App, DashboardRenderer, and FullscreenDisplay to dashboardSelectors.js. Preserve chart order and return null for unknown IDs.

- [ ] **Step 4: Extract DashboardCanvas without changing chart behavior**

Move landing/section/LayoutGrid/ChartPanel rendering out of DashboardRenderer. Use surface="view" or surface="build"; do not add a second data loader or chart renderer.

The buildState object uses placement IDs:

~~~js
{
  enabled,
  disabled,
  selectedPlacementId,
  draggingPlacementId,
  dragTargetPlacementId
}
~~~

The displayState object uses chart IDs:

~~~js
{
  selecting,
  selectedChartIds
}
~~~

- [ ] **Step 5: Compose ViewShell**

ViewShell shows:

- read-only dashboard identity;
- page navigation;
- playback controls when configured;
- the shared canvas;
- existing focused and multi-chart fullscreen;
- install and restrained connection status.

It does not show DeviceLayoutControl, import/export, edit fields, appearance controls, or structural actions.

- [ ] **Step 6: Add semantic token foundations**

Define the accepted UI-spec values under semantic names. At minimum:

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

[data-density="comfortable"] {
  --simex-shell-gap: 16px;
  --simex-shell-padding: 20px;
}
~~~

Migrate only the shell selectors touched by this task. Leave ECharts and legacy chart-type colors in styles.css.

Import CSS in this order so tokens are available to the legacy sheet and new
mode rules intentionally win only on their scoped surfaces:

~~~js
import "./styles/tokens.css";
import "./styles.css";
import "./styles/app-frame.css";
import "./styles/view-shell.css";
import "./styles/build-workspace.css";
import "./styles/presentation.css";
~~~

- [ ] **Step 7: Run focused checks and inspect the live source**

~~~powershell
node --test tests/dashboardSelectors.test.js tests/landingPage.test.js tests/fullscreenDisplay.test.js
~~~

Use the Vite development server and inspect View once at desktop and both iPad orientations. The decision is no horizontal overflow, visible active page, 44-pixel primary controls, and no Build-only utilities.

- [ ] **Step 8: Commit**

~~~powershell
git add src/lib/dashboardSelectors.js src/components/dashboard/DashboardCanvas.jsx src/components/view/ViewShell.jsx src/components/DashboardRenderer.jsx src/components/ChartPanel.jsx src/styles/tokens.css src/styles/view-shell.css src/main.jsx tests/dashboardSelectors.test.js
git commit -m "refactor: extract shared dashboard view surface"
~~~

---

### Task 5: Add Placement-Aware Build Structure and Workspace

**Required skills:** superpowers:test-driven-development; browser:control-in-app-browser.

**Files:**
- Create: src/components/build/buildSelectionModel.js
- Create: tests/buildSelectionModel.test.js
- Create: src/components/build/BuildWorkspace.jsx
- Create: src/components/build/BuildStructureRail.jsx
- Create: src/components/build/BuildInspector.jsx
- Create: src/components/build/BuildCommandBar.jsx
- Create: src/styles/build-workspace.css
- Modify: src/components/DashboardRenderer.jsx
- Modify: src/main.jsx

**Interfaces:**
- Build selection shape: { kind, pageId?, sectionId?, placementId?, chartId?, groupId? }.
- BuildStructureRail receives dashboard, activePageId, selection, disabled, onNavigatePage, and onSelect.
- BuildWorkspace receives rail, canvas, inspector, commandBar, mutationLocked, and authoringLocked.

- [ ] **Step 1: Write the failing selection tests**

Cover:

- default page selection;
- page and section selection;
- wrapped placement retaining both placementId and chartId;
- reconciliation after page/panel removal;
- empty sections;
- time-group summary selection.

- [ ] **Step 2: Run the focused test and confirm failure**

~~~powershell
node --test tests/buildSelectionModel.test.js
~~~

- [ ] **Step 3: Implement the pure selection model**

Export:

~~~js
export function createBuildSelection(kind, identifiers);
export function defaultBuildSelection(dashboard, activePageId);
export function reconcileBuildSelection(dashboard, selection, activePageId);
export function sameBuildSelection(left, right);
~~~

Reject an impossible identifier combination. Never mutate dashboard content.

- [ ] **Step 4: Implement the structure rail**

Render ordinary nested lists and buttons, not an ARIA tree. The hierarchy is:

1. Scenario
2. Pages
3. Sections
4. Panel placements
5. Time groups

Page selection also navigates the shared canvas. Panel buttons announce the chart title but retain placement ID in the callback.

- [ ] **Step 5: Compose BuildWorkspace**

Desktop uses rail, live canvas, and inspector. Tablet uses the live canvas plus one focus-trapped rail or inspector sheet at a time. Density is Compact, but controls retain the UI-spec minimum target.

Under prefers-reduced-motion: reduce, sheet transitions are removed rather than shortened.

At this task, BuildInspector renders useful read-only summaries for each selection kind and the existing modal chart editor remains unchanged.

- [ ] **Step 6: Reconcile selection after every dashboard mutation**

Keep build selection in DashboardRenderer and reconcile it when dashboard, activePageId, or selected placement changes. A removed selection falls back to the current page, never to a stale object.

- [ ] **Step 7: Run the focused test and inspect Build**

~~~powershell
node --test tests/buildSelectionModel.test.js tests/dashboardSelectors.test.js
~~~

Inspect the desktop three-region layout and one iPad sheet transition with the development server. Confirm Escape closes the sheet and focus returns to its trigger.

- [ ] **Step 8: Commit**

~~~powershell
git add src/components/build src/components/DashboardRenderer.jsx src/styles/build-workspace.css src/main.jsx tests/buildSelectionModel.test.js
git commit -m "feat: add dashboard Build workspace"
~~~

---

### Task 6: Move Metadata and Commands into the Build Inspector

**Required skills:** superpowers:test-driven-development.

**Files:**
- Modify: src/components/build/BuildInspector.jsx
- Modify: src/components/build/BuildCommandBar.jsx
- Modify: src/components/DashboardRenderer.jsx
- Modify: src/App.jsx
- Modify: tests/dashboardAppV3.test.js
- Modify: tests/moderatorTransaction.test.js

**Interfaces:**
- BuildInspector uses controlled draft values and existing change callbacks.
- BuildCommandBar owns Finish Build, Reset, add/remove, import/export, appearance, accessibility, background, and DeviceLayoutControl presentation.
- App distinguishes fatalLoadError from operationError.

- [ ] **Step 1: Add failing focused transaction cases**

Add tests proving:

- pending page metadata is flushed before Build-to-View;
- rejected flush leaves Build active and preserves the draft;
- background persistence errors do not replace the whole application;
- reset succeeds before mode changes to View.

- [ ] **Step 2: Run the focused transaction tests**

~~~powershell
node --test --test-name-pattern "debounced|serialized|failed reset|mode" tests/dashboardAppV3.test.js tests/moderatorTransaction.test.js
~~~

Expected: at least one new assertion fails.

- [ ] **Step 3: Move routine metadata fields**

The canvas header, page title, and section headings become read-only in every mode. BuildInspector supplies controlled fields for:

- Scenario: program label, scenario label, last updated
- Page: label, title, description
- Section: title, description
- Time group: name and current member/matching summary; membership stays in chart forms

Continue using the existing 650 ms pendingEdits scheduler.

- [ ] **Step 4: Move global Build commands**

BuildCommandBar receives explicit callbacks and pending labels. Move DeviceLayoutControl here. Keep import/export only in Build. A failed import/export is an operation-local alert, not a fatal app replacement.

- [ ] **Step 5: Split fatal and operation errors**

App renders the fatal screen only for initial configuration/data hydration failure. Background persistence and import/export failures flow back into the active Build command or inspector while the last-good dashboard remains mounted.

- [ ] **Step 6: Remove obsolete inline edit branches**

Only after inspector fields work, remove header/page/section input branches and the old edit-command-banner markup. Do not preserve old selectors solely for tests.

- [ ] **Step 7: Run focused checks**

~~~powershell
node --test --test-name-pattern "debounced|serialized|failed reset|mode" tests/dashboardAppV3.test.js tests/moderatorTransaction.test.js
~~~

Expected: PASS.

- [ ] **Step 8: Commit**

~~~powershell
git add src/App.jsx src/components/DashboardRenderer.jsx src/components/build/BuildInspector.jsx src/components/build/BuildCommandBar.jsx tests/dashboardAppV3.test.js tests/moderatorTransaction.test.js
git commit -m "feat: move dashboard authoring into Build inspector"
~~~

---

### Task 7: Embed Chart Editing Safely and Replace Structural Prompts

**Required skills:** superpowers:test-driven-development.

**Files:**
- Create: src/components/common/TextEntryDialog.jsx
- Modify: src/components/chart-authoring/ChartEditorV3.jsx
- Modify: src/components/chart-authoring/ChartEditorModal.jsx
- Modify: src/components/build/BuildInspector.jsx
- Modify: src/components/build/BuildStructureRail.jsx
- Modify: src/components/DashboardRenderer.jsx
- Modify: tests/chartAuthoringComponentsV3.test.js
- Modify: tests/modalFocusMarkupV3.test.js

**Interfaces:**
- ChartEditorV3 gains surface="dialog" or surface="inspector"; default is dialog.
- TextEntryDialog props: open, title, label, initialValue, confirmLabel, disabled, error, onConfirm, onCancel.
- Build mutation controls receive authoringLocked while a chart draft is active.

- [ ] **Step 1: Write failing editor-surface and dialog tests**

Assert:

- dialog remains the default and retains ModalFocusScope;
- inspector surface renders the same form without dialog semantics;
- TextEntryDialog labels its field, traps/restores focus, and does not call onConfirm for blank input;
- Build mutation controls are disabled during a chart draft.

- [ ] **Step 2: Run focused tests and confirm failure**

~~~powershell
node --test --test-name-pattern "editor|focus|text entry" tests/chartAuthoringComponentsV3.test.js tests/modalFocusMarkupV3.test.js
~~~

- [ ] **Step 3: Split wrapper from editor content**

Keep one ChartEditorV3 draft and submit implementation:

~~~jsx
return surface === "inspector"
  ? <div className="chart-editor-inspector">{content}</div>
  : <ChartEditorModal onClose={onCancel}>{content}</ChartEditorModal>;
~~~

Nested conversion/confirmation dialogs continue to use ModalFocusScope.

- [ ] **Step 4: Enforce safe draft locking**

While the inspector chart draft is open, disable rail selection changes, structural mutations, import, reset, and mode switching. Save or Cancel releases the lock. This preserves the existing whole-dashboard cancel baseline when citation updates touch related charts.

- [ ] **Step 5: Replace prompt and confirm calls**

Use TextEntryDialog for add-page and section-split naming. Use the existing ConfirmDialog for page removal. Keep chart cleanup from time groups and landing references inside the serialized App mutation.

- [ ] **Step 6: Add keyboard reorder actions**

Place Move before and Move after text actions beside the selected placement in Build. Reuse onPanelReorder(sourcePlacementId, targetPlacementId); retain pointer drag as an optional shortcut.

- [ ] **Step 7: Run focused tests**

~~~powershell
node --test --test-name-pattern "editor|focus|text entry" tests/chartAuthoringComponentsV3.test.js tests/modalFocusMarkupV3.test.js
~~~

Expected: PASS.

- [ ] **Step 8: Commit**

~~~powershell
git add src/components/common/TextEntryDialog.jsx src/components/chart-authoring/ChartEditorV3.jsx src/components/chart-authoring/ChartEditorModal.jsx src/components/build src/components/DashboardRenderer.jsx tests/chartAuthoringComponentsV3.test.js tests/modalFocusMarkupV3.test.js
git commit -m "feat: refine safe Build authoring flows"
~~~

---

### Task 8: Refine View Comparison, Fullscreen Focus, and Responsive Density

**Required skills:** browser:control-in-app-browser; gsd-ui-review for the accepted visual comparison; superpowers:test-driven-development for fullscreen behavior.

**Files:**
- Modify: src/components/ChartPanel.jsx
- Modify: src/components/FullscreenDisplay.jsx
- Modify: src/components/common/ModalFocusScope.jsx only if its existing interface cannot wrap fullscreen unchanged
- Modify: src/components/view/ViewShell.jsx
- Modify: src/styles/view-shell.css
- Modify: src/styles.css for touched fullscreen selectors
- Modify: tests/fullscreenDisplay.test.js

**Interfaces:**
- ChartPanel exposes an explicit Compare charts action in addition to the optional hold shortcut.
- FullscreenDisplay uses ModalFocusScope, Escape close, and trigger-focus restoration.

- [ ] **Step 1: Write failing focused fullscreen assertions**

Add assertions for:

- dialog focus wrapper;
- accessible Close all;
- Escape mapped to manual_close_all;
- ordered chart rendering survives;
- no Build controls in View.

- [ ] **Step 2: Run focused tests and confirm failure**

~~~powershell
node --test tests/displayController.test.js tests/fullscreenDisplay.test.js
~~~

- [ ] **Step 3: Add explicit compare entry**

Expose a labeled Compare charts action that starts multi-selection without a long press. Keep the hold gesture only as a shortcut. Selection stays capped at four through displayController.

- [ ] **Step 4: Correct fullscreen dialog behavior**

Wrap the overlay with ModalFocusScope, close on Escape, restore focus to the initiating control, and keep layout/reorder/close controls keyboard reachable.

- [ ] **Step 5: Apply View density and touch rules**

Use Comfortable token values, 44-pixel primary controls, visible action rails on touch/focus, and no right-click-only action. Check desktop and both iPad orientations against the approved UI specification.

- [ ] **Step 6: Run the focused test and one judgment-heavy visual review**

~~~powershell
node --test tests/displayController.test.js tests/fullscreenDisplay.test.js
~~~

Use gsd-ui-review once to compare implemented View against the accepted sketch. Fix only findings that affect the View acceptance tasks.

- [ ] **Step 7: Commit**

~~~powershell
git add src/components/ChartPanel.jsx src/components/FullscreenDisplay.jsx src/components/view/ViewShell.jsx src/styles/view-shell.css src/styles.css tests/fullscreenDisplay.test.js
git commit -m "feat: refine personal dashboard viewing"
~~~

---

### Task 9: Define the Presentation State and Protocol

**Required skills:** superpowers:test-driven-development.

**Files:**
- Create: src/lib/presentationProtocol.js
- Create: tests/presentationProtocol.test.js

**Interfaces:**
- PRESENTATION_PROTOCOL_VERSION = 1.
- presentationChannelName(sessionId), makePresentationMessage(input), parsePresentationMessage(value, options), validatePresentationState(state, options).

- [ ] **Step 1: Write failing protocol tests**

Cover:

- exact envelope fields;
- session and sender ID validation;
- positive sequence;
- unique ordered 0–4 chart IDs;
- count-valid layouts;
- active page, title, blackout, and time state;
- frozen cloned output;
- rejection of unknown fields, stale versions, configuration, rows, csvText, credentials, and authoring commands.

- [ ] **Step 2: Run the focused test and confirm failure**

~~~powershell
node --test tests/presentationProtocol.test.js
~~~

- [ ] **Step 3: Implement the strict envelope**

~~~js
{
  protocol_version: 1,
  session_id: "validated-session-id",
  sender_id: "validated-sender-id",
  sequence: 1,
  type: "audience_ready",
  payload: {}
}
~~~

Allowed types are audience_ready, audience_heartbeat, controller_snapshot, controller_state, controller_heartbeat, and session_ended.

- [ ] **Step 4: Implement the state shape**

~~~js
{
  audience_id: "validated-audience-id",
  state: {
    active_page_id: "biomedical",
    displayed_chart_ids: ["chart-a", "chart-b"],
    layout: "sideBySide",
    time: {
      group_id: "epidemic-time",
      active_epoch_ms: 1801440000000
    },
    show_scene_title: true,
    blackout: false
  }
}
~~~

time may be null. Validate chart IDs against a supplied valid set. Use a presentation sequence independent of display_revision because layout changes do not increment display revision.

- [ ] **Step 5: Run the focused test**

~~~powershell
node --test tests/presentationProtocol.test.js
~~~

Expected: PASS.

- [ ] **Step 6: Commit**

~~~powershell
git add src/lib/presentationProtocol.js tests/presentationProtocol.test.js
git commit -m "feat: define local presentation protocol"
~~~

---

### Task 10: Implement the BroadcastChannel and Popup Lifecycle

**Required skills:** superpowers:test-driven-development; superpowers:systematic-debugging only for observed lifecycle failures.

**Files:**
- Create: src/lib/presentationChannel.js
- Create: src/lib/presentationWindow.js
- Create: tests/presentationChannel.test.js
- Create: tests/presentationWindow.test.js

**Interfaces:**
- createPresentationControllerChannel(options) returns start(), publish(), end(), dispose().
- createPresentationAudienceChannel(options) returns start(), dispose().
- openAudienceWindow(options) returns { status, windowRef, url }.

- [ ] **Step 1: Write failing fake-channel lifecycle tests**

Use an in-memory BroadcastChannel fake plus injected scheduler. Cover:

1. Audience ready receives a complete snapshot.
2. State changes publish monotonically sequenced controller_state.
3. Reloaded audience ID receives the latest snapshot.
4. Stale messages are ignored.
5. One-second heartbeats keep status connected.
6. About 3.5 seconds of silence marks disconnected while retaining state.
7. A new ready message recovers.
8. end() sends session_ended and clears timers/listeners.
9. start()/dispose() are idempotent under React StrictMode.

- [ ] **Step 2: Write failing popup tests**

Assert synchronous open, preserved base path, exact query parameters, named-window reuse, and blocked result when openWindow returns null.

- [ ] **Step 3: Run focused tests and confirm failure**

~~~powershell
node --test tests/presentationChannel.test.js tests/presentationWindow.test.js
~~~

- [ ] **Step 4: Implement popup construction**

Build the URL with new URL(locationHref), set mode=present, surface=audience, channel=sessionId, and preserve the deployed pathname/base. Call openWindow during the button gesture and return opened or blocked without retrying asynchronously.

- [ ] **Step 5: Implement channel clients**

Use the strict protocol parser at every receive boundary. The controller channel is created before window.open. Audience sends ready repeatedly until its first snapshot. Both sides heartbeat every 1000 ms; a 3500 ms peer timeout changes status. No dataset or configuration enters a message.

- [ ] **Step 6: Run focused tests**

~~~powershell
node --test tests/presentationProtocol.test.js tests/presentationChannel.test.js tests/presentationWindow.test.js
~~~

Expected: PASS.

- [ ] **Step 7: Commit**

~~~powershell
git add src/lib/presentationChannel.js src/lib/presentationWindow.js tests/presentationChannel.test.js tests/presentationWindow.test.js
git commit -m "feat: add local presentation session lifecycle"
~~~

---

### Task 11: Build the Shared Display Grid and Audience Surface

**Required skills:** superpowers:test-driven-development; browser:control-in-app-browser for the 16:9 review.

**Files:**
- Create: src/components/display/DisplayedChartGrid.jsx
- Create: src/components/presentation/AudienceDisplay.jsx
- Create: tests/audienceDisplay.test.js
- Modify: src/components/presentation/AudienceDisplayShell.jsx
- Modify: src/components/FullscreenDisplay.jsx
- Modify: src/components/playback/PlaybackProvider.jsx
- Modify: src/charting/time/playbackReducer.js
- Modify: src/components/charts/ChartView.jsx
- Modify: tests/fullscreenDisplay.test.js
- Modify: tests/playbackComponentsV3.test.js
- Create: src/styles/presentation.css
- Modify: src/main.jsx

**Interfaces:**
- DisplayedChartGrid props: dashboard, chartIds, layout, accessibilityEnabled, timeContextForChart, surface, renderCellControls.
- AudienceDisplay props: dashboard, connectionStatus, presentationState.
- PlaybackProvider gains externalState, onStateChange, and timerEnabled=true.
- ChartView gains interactionMode="active" or "passive".

- [ ] **Step 1: Write failing audience and playback tests**

Assert:

- waiting state for no snapshot;
- ordered 1–4 chart rendering and layout class;
- blackout covers but does not unmount charts;
- disconnected state retains the last scene;
- no buttons, page navigation, source actions, zoom instructions, or authoring chrome;
- external playback state changes the rendered time context;
- audience timerEnabled=false prevents a second playback clock.

- [ ] **Step 2: Run focused tests and confirm failure**

~~~powershell
node --test tests/audienceDisplay.test.js tests/fullscreenDisplay.test.js tests/playbackComponentsV3.test.js
~~~

- [ ] **Step 3: Extract DisplayedChartGrid**

Move only chart lookup, count/layout classes, cells, and ChartView rendering from FullscreenDisplay. Fullscreen retains dialog chrome, layout/reorder/close controls, citations, and source actions through renderCellControls. Audience passes no cell controls.

- [ ] **Step 4: Add controlled playback synchronization**

Add a validated synchronize action to playbackReducer for:

~~~js
{
  activeGroupId,
  activeIndex,
  playing,
  speed,
  playbackView
}
~~~

PlaybackProvider reports state through onStateChange and applies externalState by dispatching synchronize. timerEnabled=false prevents audience-owned intervals. Export the existing buildMemberTimeContexts(group, activeEpochMs) helper so both provider and audience use dashboard-local matching policy.

- [ ] **Step 5: Implement passive audience charts**

ChartView interactionMode="passive" keeps chart rendering and accessibility output but suppresses zoom guidance and dashboard interaction chrome. Do not alter ECharts data or color semantics.

- [ ] **Step 6: Implement AudienceDisplay and shell**

AudienceDisplayShell loads the dashboard locally, starts only the audience channel, and passes the last valid state to AudienceDisplay. Blackout is a cover layer. Invalid entry and initial loading use the same neutral holding language.

Guard App effects so the audience branch skips Quorum, Vanta, mode writes, and raw fatal errors.

presentation.css removes non-essential audience and controller transitions
under prefers-reduced-motion: reduce; blackout remains an immediate state
change.

- [ ] **Step 7: Run focused checks and inspect 16:9**

~~~powershell
node --test tests/audienceDisplay.test.js tests/fullscreenDisplay.test.js tests/playbackComponentsV3.test.js
~~~

Inspect 1920 by 1080 through the development server. Confirm the audience shell is uncapped, has no overflow or controls, and uses Spacious type/spacing from the UI specification.

- [ ] **Step 8: Commit**

~~~powershell
git add src/App.jsx src/components/display src/components/presentation/AudienceDisplay.jsx src/components/presentation/AudienceDisplayShell.jsx src/components/FullscreenDisplay.jsx src/components/playback/PlaybackProvider.jsx src/components/charts/ChartView.jsx src/charting/time/playbackReducer.js src/styles/presentation.css src/main.jsx tests/audienceDisplay.test.js tests/fullscreenDisplay.test.js tests/playbackComponentsV3.test.js
git commit -m "feat: add chrome-free audience display"
~~~

---

### Task 12: Build the Moderator Present Workspace

**Required skills:** superpowers:test-driven-development; browser:control-in-app-browser; gsd-ui-review for one controller/audience comparison.

**Files:**
- Create: src/components/presentation/PresentWorkspace.jsx
- Create: src/components/presentation/usePresentationController.js
- Modify: src/components/DashboardRenderer.jsx
- Modify: src/components/playback/PlaybackProvider.jsx
- Modify: src/styles/presentation.css
- Create: tests/presentWorkspace.test.js

**Interfaces:**
- PresentWorkspace receives dashboard, activePageId, onActivePageChange, displayState, onDisplayAction, playback state/actions, accessibilityEnabled.
- usePresentationController receives getState and returns sessionId, status, error, openDisplay(), reopenDisplay(), publish(), blackout(), restore(), end().

- [ ] **Step 1: Write failing PresentWorkspace render/state tests**

Using Vite SSR and pure hook helpers, assert:

- Open audience display is visible;
- all configured charts are grouped by page;
- selection caps at four through displayController;
- ordering and valid layout options match displayController;
- connection statuses are Waiting, Connected, Disconnected, Blocked, Unsupported;
- Blackout/Restore, show-title, and End presentation are labeled controls;
- no permission or role input exists.

- [ ] **Step 2: Run focused tests and confirm failure**

~~~powershell
node --test tests/presentWorkspace.test.js tests/displayController.test.js
~~~

- [ ] **Step 3: Implement the React controller hook**

Create the channel before calling openAudienceWindow. Popup creation occurs only in openDisplay()/reopenDisplay(), never in an effect. Effects publish when active page, display IDs/order/layout, time, title visibility, or blackout changes. Cleanup is idempotent.

- [ ] **Step 4: Implement moderator controls**

PresentWorkspace provides:

- open/reopen/end display;
- status and bounded error;
- page selection;
- 0–4 chart selection;
- move before/after;
- valid layout buttons;
- existing synchronized-time controls;
- show/hide scene title;
- blackout/restore.

Use displayController for chart set/order/layout, not a parallel reducer. A scene with zero charts sends a valid holding state.

- [ ] **Step 5: Mount Present instead of fullscreen overlay**

DashboardRenderer renders:

- ViewShell for View;
- BuildWorkspace for Build;
- PresentWorkspace for Present.

It keeps one mounted orchestration/runtime. FullscreenDisplay mounts only for View and Build, so selected charts cannot cover the moderator controller. Quorum updates to shared displayState automatically publish to the audience.

- [ ] **Step 6: Run focused checks and review live dual-window behavior**

~~~powershell
node --test tests/presentWorkspace.test.js tests/displayController.test.js tests/presentationProtocol.test.js tests/presentationChannel.test.js
~~~

Use the development server to review one controller plus one audience window. Then invoke gsd-ui-review once against the accepted Present and audience sketches.

- [ ] **Step 7: Commit**

~~~powershell
git add src/components/presentation/PresentWorkspace.jsx src/components/presentation/usePresentationController.js src/components/DashboardRenderer.jsx src/components/playback/PlaybackProvider.jsx src/styles/presentation.css tests/presentWorkspace.test.js
git commit -m "feat: add moderated presentation workspace"
~~~

---

### Task 13: Author Integrated Browser Coverage and Accessibility Checks

**Required skills:** gsd-add-tests; gsd-ui-review; gsd-verify-work; superpowers:verification-before-completion.

**Files:**
- Create: tests/e2e/dashboard-modes.spec.js
- Create: tests/e2e/build-view-shells.spec.js
- Create: tests/e2e/presentation-mode.spec.js
- Modify: existing E2E files coupled to the old storage key, Open edit mode, edit-command-banner, inline header fields, and modal-only chart editor.
- Modify: package.json
- Modify: pnpm-lock.yaml

**Interfaces:**
- Browser coverage exercises the user-facing contracts; it does not introduce test-only production APIs.

- [ ] **Step 1: Add the JavaScript axe integration**

After dependency-install approval during execution:

~~~powershell
pnpm.cmd add --save-dev @axe-core/playwright
~~~

Commit the resolved lockfile version. Use axe for workspace landmarks, mode controls, Build sheets, controller controls, and the audience shell. Do not claim complete accessibility conformance from automated results.

- [ ] **Step 2: Author dashboard mode scenarios**

dashboard-modes.spec.js covers:

- default View;
- all three mode buttons available;
- active page survives View → Build → Present → View;
- unresolved chart draft blocks mode change;
- failed Build flush retains Build and draft;
- old save key ignored, new save key honored;
- valid and invalid audience entries never show workspace chrome;
- audience does not overwrite controller mode preference.

- [ ] **Step 3: Author Build/View scenarios**

build-view-shells.spec.js covers:

- desktop rail/canvas/inspector;
- iPad portrait and landscape sheet focus/return;
- scenario/page/section editing;
- failed persistence retry;
- keyboard placement reorder;
- explicit Compare charts;
- fullscreen Escape/focus restoration;
- 44-pixel primary targets and no horizontal overflow.

- [ ] **Step 4: Author Present scenarios**

presentation-mode.spec.js uses context.waitForEvent("page") and covers:

- synchronous audience popup;
- select/reorder/layout;
- synchronized time;
- title visibility;
- blackout/restore without chart unmount;
- audience reload and latest-snapshot recovery;
- closed audience, disconnected status, and reopen;
- 1920 by 1080 audience without workspace controls or overflow.

Use the unit-injected openWindow test for blocked popups; do not make browser security behavior flaky.

- [ ] **Step 5: Update obsolete E2E selectors**

Update tests to user-facing Build, View, and Present labels. Remove assertions whose only purpose is preserving deleted edit-mode markup. Keep behavior assertions for transaction failure, focus, Quorum, time, landing, and chart authoring.

- [ ] **Step 6: Check syntax without running the deferred E2E gate**

~~~powershell
node --check tests/e2e/dashboard-modes.spec.js
node --check tests/e2e/build-view-shells.spec.js
node --check tests/e2e/presentation-mode.spec.js
~~~

Expected: all three exit 0. Per project policy, do not run the E2E suite or production build until the user declares pre-merge readiness.

- [ ] **Step 7: Commit**

~~~powershell
git add package.json pnpm-lock.yaml tests/e2e
git commit -m "test: cover three-mode dashboard workflows"
~~~

---

### Task 14: Update Product Documentation and Prepare Verification

**Required skills:** gsd-docs-update; skill-creator only if the finished implementation reveals at least three recurring project-specific rules not already enforced by code or AGENTS.md; gsd-ship only after verification and explicit user approval.

**Files:**
- Modify: README.md
- Modify: docs/app-manual.md
- Modify: docs/quorum-companion.md
- Create conditionally: .agents/skills/simex-dashboard-modes/SKILL.md

**Interfaces:**
- Documentation distinguishes UI mode from Quorum connection status and states the clean persistence/package cutover.

- [ ] **Step 1: Update README**

Replace the participant/read-only persona language with:

- every workspace exposes View, Build, and Present;
- modes are not permissions;
- Present uses a same-computer audience window;
- static/PWA/portable operation remains;
- pre-redesign saved state and packages are not migration inputs.

- [ ] **Step 2: Rewrite the app manual mode sections**

Document:

- View exploration and Compare charts;
- Build rail/canvas/inspector, Finish/Reset, import/export, and tablet sheets;
- Present controller, popup permission, chart set/layout/time, title, blackout, reconnect, and end;
- audience holding behavior;
- new storage epoch and re-export guidance.

- [ ] **Step 3: Clarify Quorum terminology**

State that Standalone/Connected/Unavailable are companion connection statuses, not View/Build/Present UI modes. Quorum and manual actions share displayState; only the workspace/controller opens a companion connection.

- [ ] **Step 4: Decide whether a project skill is justified**

Invoke skill-creator only if three or more recurring instructions remain outside code and AGENTS.md. If justified, the skill at .agents/skills/simex-dashboard-modes/SKILL.md links to the V3 config docs, icon authority, mode spec, presentation protocol, and test commands; it must not duplicate schema definitions. If not justified, record that decision in the implementation summary and create no skill file.

- [ ] **Step 5: Run documentation checks**

~~~powershell
git diff --check
Select-String -Path README.md,docs/app-manual.md,docs/quorum-companion.md -Pattern "Open edit mode|participant-facing.*read-only|simex-dashboard-config-v3[^-]"
~~~

Expected: git diff --check is clean; search results contain no obsolete user-facing contract except explicitly labelled historical text.

- [ ] **Step 6: Commit**

~~~powershell
git add README.md docs/app-manual.md docs/quorum-companion.md .agents/skills/simex-dashboard-modes/SKILL.md
git commit -m "docs: explain View Build and Present modes"
~~~

If no skill file was created, omit that path from git add.

- [ ] **Step 7: Pause for pre-merge declaration**

Report the implemented task evidence and ask the user whether the branch is ready for its one full pre-merge gate. Do not run, merge, push, deploy, or advance the Cloudflare branch before that declaration and the repository's required approvals.

---

## Pre-Merge Verification Gate

Run only after the user declares the branch ready:

~~~powershell
pnpm.cmd test
pnpm.cmd build
pnpm.cmd test:e2e -- --project=chromium
~~~

Then perform one conversational gsd-verify-work pass covering:

1. View on desktop and iPad.
2. Build metadata edit, chart edit, failure retention, and reset.
3. Present controller plus 1920 by 1080 audience.
4. Audience reload, disconnect, and reopen.
5. Standalone operation and one Quorum-driven selection.

Use superpowers:verification-before-completion before claiming the branch passes. Use gsd-ship only after verification and explicit user approval; do not deploy as part of this plan.

## Requirement Trace

| Approved requirement | Implemented by |
| --- | --- |
| All users access all modes; no permissions | Tasks 1, 3, 12 |
| One shared V3 runtime | Tasks 2–5 |
| Active page and playback survive mode changes | Tasks 2–3 |
| Calm desktop/iPad View | Tasks 4 and 8 |
| Rail/canvas/inspector Build | Tasks 5–7 |
| Transactional Build exit and failure retention | Tasks 3 and 6 |
| Separate moderator and audience surfaces | Tasks 9–12 |
| One-to-four charts, order, layout, synchronized time | Tasks 9, 11, 12 |
| Blackout, holding, reload, disconnect, reopen | Tasks 10–12 |
| Compact, Comfortable, Spacious densities | Tasks 0, 3–5, 8, 11 |
| No old-save/package migration requirement | Tasks 1, 3, 14 |
| Static/PWA, Quorum, icon, ECharts boundaries | Global constraints; Tasks 4, 11, 12, 14 |
| Keyboard, touch, reduced motion, focus, room legibility | Tasks 0, 7, 8, 11–13 |
