# Entity-Scoped Dashboard Rendering Implementation Plan

> **For Codex:** Execute this plan inline in the existing `feature/entity-scoped-dashboard-rendering` worktree. Apply test-driven development to every behavior-changing task and run the task-specific final selection once after the complete candidate is assembled.

**Goal:** Make dashboard editing responsive by preserving unaffected chart identities, isolating status updates from the dashboard canvas, and presenting editor shells before expensive chart preparation begins.

**Architecture:** Dashboard layout mutations use structural sharing: each command copies only the root-to-entity paths it changes and retains every unaffected page, section, placement, chart, dataset, and asset reference. The live canvas is divided into memoized section and placement boundaries fed by a stable action dispatcher. Operation-status commands and status snapshots use separate contexts. Quick-edit activation is synchronous with the user gesture, while scrolling and full-editor chart preparation are explicitly post-paint work.

**Tech Stack:** React 19, JavaScript ES modules, Node's built-in test runner, Playwright, Vite.

**Approved design:** `docs/superpowers/specs/2026-08-31-entity-scoped-dashboard-rendering-design.md`

## Global Constraints

- Keep the persisted dashboard schema and save payloads unchanged.
- Preserve the existing user-visible editor features and movement consequences.
- A layout command must never mutate its input draft or any object reachable from it.
- An unchanged chart placement must retain both its object identity and mounted React subtree.
- Toast publication must remain prompt, but status snapshot changes must not invalidate the dashboard renderer.
- Do not optimize the unreachable legacy canvas return in `DashboardRenderer.jsx`; the live path is `DashboardModeWorkspace` to `DashboardCanvas`.
- Use the nearest deterministic check while implementing. Run the focused final selection once after Task 6.

---

## Task 1: Introduce structural-sharing layout primitives

**Files:**

- Create: `src/components/build/immutableDashboardLayout.js`
- Modify: `src/components/build/buildLayoutDraft.js`
- Modify: `tests/buildLayoutDraft.test.js`

**Interfaces:**

```js
export function updatePage(dashboard, pageId, updatePageValue)
export function updateSection(dashboard, pageId, sectionId, updateSectionValue)
export function updatePlacement(dashboard, placementId, updatePlacementValue)
export function movePageByIndex(dashboard, pageId, targetIndex)
export function moveSectionByIndex(dashboard, pageId, sectionId, targetIndex)
export function movePlacementBefore(dashboard, sourcePlacementId, targetPlacementId)
```

All helpers return the original dashboard for a no-op or a new root that shares every unaffected branch.

### Steps

- [ ] Add failing identity assertions for panel, section, and page reorders.

```js
test("layout reorders preserve every unaffected entity reference", () => {
  const draft = createBuildLayoutDraft(fixture());
  const before = draft.value;
  const pageA = before.pages.find(({ id }) => id === "page-a");
  const pageB = before.pages.find(({ id }) => id === "page-b");
  const sectionA2 = pageA.sections.find(({ id }) => id === "section-a2");
  const chartA = pageA.sections[0].panels.find(({ id }) => id === "placement-a").chart;

  const next = reorderBuildLayoutPanel(draft, "placement-b", "placement-a");

  assert.notStrictEqual(next.value, before);
  assert.strictEqual(next.value.pages.find(({ id }) => id === "page-b"), pageB);
  assert.strictEqual(next.value.pages.find(({ id }) => id === "page-a").sections[1], sectionA2);
  assert.strictEqual(
    next.value.pages.find(({ id }) => id === "page-a").sections[0]
      .panels.find(({ id }) => id === "placement-a").chart,
    chartA,
  );
});
```

- [ ] Add analogous assertions for rename and add commands: only the renamed entity and its ancestors change identity; pre-existing entities remain shared; caller-supplied new page or section values are cloned once before insertion.

- [ ] Run the draft test and confirm the new assertions fail because `cloneDraft()` replaces the full dashboard graph.

```powershell
node --test --test-concurrency=1 tests/buildLayoutDraft.test.js
```

Expected: the new `strictEqual` identity assertions fail.

- [ ] Implement the path-copy helpers without `structuredClone()`.

```js
export function updatePage(dashboard, pageId, updatePageValue) {
  const pageIndex = (dashboard.pages ?? []).findIndex(({ id }) => id === pageId);
  if (pageIndex < 0) return dashboard;
  const currentPage = dashboard.pages[pageIndex];
  const nextPage = updatePageValue(currentPage);
  if (nextPage === currentPage) return dashboard;
  const pages = dashboard.pages.slice();
  pages[pageIndex] = nextPage;
  return { ...dashboard, pages };
}

export function updateSection(dashboard, pageId, sectionId, updateSectionValue) {
  return updatePage(dashboard, pageId, (page) => {
    const sectionIndex = (page.sections ?? []).findIndex(({ id }) => id === sectionId);
    if (sectionIndex < 0) return page;
    const currentSection = page.sections[sectionIndex];
    const nextSection = updateSectionValue(currentSection);
    if (nextSection === currentSection) return page;
    const sections = page.sections.slice();
    sections[sectionIndex] = nextSection;
    return { ...page, sections };
  });
}
```

- [ ] Replace `cloneDraft()` in reorder, rename, and add commands with the new helpers. Validate first, calculate the new dashboard, and call a revised `markDirty(draft, targetId, value)` only when the dashboard identity changes.

```js
function markDirty(draft, targetId, value) {
  return {
    ...draft,
    value,
    targetId,
    status: "dirty",
    revision: (draft.revision ?? 0) + 1,
    error: null,
  };
}
```

- [ ] Keep `createBuildLayoutDraft()` and `discardBuildLayoutDraft()` as explicit deep-copy boundaries so persisted input and restored baseline remain detached from editable state.

- [ ] Run the focused test and confirm behavior plus identity assertions pass.

```powershell
node --test --test-concurrency=1 tests/buildLayoutDraft.test.js
```

- [ ] Commit the primitive and command migration.

```powershell
git add src/components/build/immutableDashboardLayout.js src/components/build/buildLayoutDraft.js tests/buildLayoutDraft.test.js
git commit -m "perf: preserve layout entity identities"
```

---

## Task 2: Apply structure commands and analyzed moves without whole-dashboard clones

**Files:**

- Modify: `src/components/build/immutableDashboardLayout.js`
- Modify: `src/components/build/buildLayoutDraft.js`
- Modify: `src/components/build/buildLayoutMove.js`
- Modify: `tests/buildLayoutDraft.test.js`
- Modify: `tests/buildLayoutMove.test.js`

**Interfaces:**

```js
export function moveSectionBetweenPages(dashboard, source, target)
export function movePlacementBetweenSections(dashboard, source, target)
export function replaceDashboardScenes(dashboard, updateScenes)
export function replaceDashboardChronoGroups(dashboard, updateGroups)
```

`analyzeBuildLayoutMove()` returns an immutable description and consequences, not a `value` field containing a dashboard clone. `applyBuildLayoutMove()` revalidates the described move against the latest draft before committing it.

### Steps

- [ ] Add failing identity tests for cross-section panel moves, cross-page section moves, section merges, page merges, and removals.

```js
test("a cross-section panel move changes only source and destination paths", () => {
  const draft = createBuildLayoutDraft(fixture());
  const before = draft.value;
  const sourcePage = before.pages[0];
  const destinationPage = before.pages[1];
  const untouchedPage = before.pages[2];
  const movedPlacement = sourcePage.sections[0].panels[0];

  const analysis = analyzeBuildLayoutMove(before, {
    kind: "panel",
    source: { pageId: "page-a", sectionId: "section-a1", placementId: "placement-a" },
    target: { pageId: "page-b", sectionId: "section-b1", index: 0 },
  });
  const next = applyBuildLayoutMove(draft, analysis, { confirmed: true });

  assert.notStrictEqual(next.value.pages[0], sourcePage);
  assert.notStrictEqual(next.value.pages[1], destinationPage);
  assert.strictEqual(next.value.pages[2], untouchedPage);
  assert.strictEqual(next.value.pages[1].sections[0].panels[0], movedPlacement);
});
```

- [ ] Change the existing move-analysis assertions to require `analysis.value === undefined`, while keeping the analysis object and its newly created consequence records frozen.

- [ ] Add a stale-analysis regression test: analyze a move, apply a separate harmless rename to the draft, then apply the move and assert that the rename survives. This prevents the old snapshot-replacement behavior from returning.

- [ ] For every representative structure command, assert that unaffected Scene and Chrono Group objects retain reference identity. When a consequence changes one Scene or group, assert that only that entry and its containing array are replaced.

- [ ] Run the two focused test files and confirm the new tests fail.

```powershell
node --test --test-concurrency=1 tests/buildLayoutDraft.test.js tests/buildLayoutMove.test.js
```

Expected: move results still replace unaffected branches, `analysis.value` exists, and stale analysis overwrites the later change.

- [ ] Migrate the remaining structure commands in `buildLayoutDraft.js` to explicit path copies. Clone only collections that a command actually edits:

  - page/section/panel arrays for moves and merges;
  - affected scenes for page-scope changes;
  - affected Chrono Groups and scenes when charts are deleted;
  - landing-page objects only when route repair changes them.

- [ ] Refactor scene consequence calculation into a pure function that returns newly allocated affected scene records plus user-facing consequence records. Never deep-freeze an object that is still reachable from the live dashboard.

```js
function deriveSceneMoveChanges(dashboard, context) {
  const updates = new Map();
  const consequences = [];
  for (const scene of dashboard.scenes ?? []) {
    const result = deriveSceneChange(scene, dashboard, context);
    if (!result) continue;
    updates.set(scene.id, result.scene);
    consequences.push(...result.consequences);
  }
  return { updates, consequences };
}
```

- [ ] Make analysis descriptive and cheap.

```js
return deepFreeze({
  status: "ready",
  error: null,
  kind: move.kind,
  move: structuredClone(move),
  source: sourceDescriptor(source),
  destination,
  targetId: source.targetId,
  movedPlacementIds,
  movedChartIds,
  consequences,
  requiresConfirmation,
});
```

- [ ] Make apply re-analyze the latest layout and apply one structural-sharing move. If the refreshed result is invalid, a no-op, or newly requires an unprovided confirmation, return the current draft unchanged.

```js
export function applyBuildLayoutMove(layoutDraft, analysis, { confirmed = false } = {}) {
  if (!layoutDraft || analysis?.status !== "ready" || layoutDraft.status === "saving") return layoutDraft;
  const currentAnalysis = analyzeBuildLayoutMove(layoutDraft.value, analysis.move);
  if (currentAnalysis.status !== "ready") return layoutDraft;
  if (currentAnalysis.requiresConfirmation && confirmed !== true) return layoutDraft;
  const value = applyAnalyzedMove(layoutDraft.value, currentAnalysis);
  if (value === layoutDraft.value) return layoutDraft;
  return {
    ...layoutDraft,
    value,
    targetId: currentAnalysis.targetId,
    status: "dirty",
    revision: (layoutDraft.revision ?? 0) + 1,
    error: null,
    sceneConsequences: structuredClone(currentAnalysis.consequences),
  };
}
```

- [ ] Run the two focused files and confirm all behavior and identity checks pass.

```powershell
node --test --test-concurrency=1 tests/buildLayoutDraft.test.js tests/buildLayoutMove.test.js
```

- [ ] Commit the structural command and move migration.

```powershell
git add src/components/build/immutableDashboardLayout.js src/components/build/buildLayoutDraft.js src/components/build/buildLayoutMove.js tests/buildLayoutDraft.test.js tests/buildLayoutMove.test.js
git commit -m "perf: apply dashboard moves with structural sharing"
```

---

## Task 3: Isolate operation-status snapshots from dashboard commands

**Files:**

- Modify: `src/components/app-shell/OperationStatusProvider.jsx`
- Modify: `src/components/app-shell/OperationStatusViewport.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `tests/operationStatusQueue.test.js`
- Create: `tests/e2e/operation-status-context-harness.html`
- Create: `tests/e2e/operation-status-context-harness.jsx`
- Create: `tests/e2e/operation-status-context.spec.js`

**Interfaces:**

```js
export function useOperationStatusActions()
export function useOperationStatusSnapshot()
export function useOperationStatus()
```

The compatibility hook may compose the two narrower hooks, but live dashboard consumers must use the actions-only hook.

### Steps

- [ ] Add a browser harness with two profiled consumers under `OperationStatusProvider`: one reads actions, one reads the snapshot. Expose render counts and buttons for `reportActivity()` and `beginOperation()`.

```jsx
function ActionsConsumer() {
  const actions = useOperationStatusActions();
  window.__statusHarness.actionsRenders += 1;
  return <button onClick={() => actions.reportActivity({ message: "Layout updated" })}>Report</button>;
}

function SnapshotConsumer() {
  const snapshot = useOperationStatusSnapshot();
  window.__statusHarness.snapshotRenders += 1;
  return <output data-status-count>{snapshot.visible.length}</output>;
}
```

- [ ] Add a Playwright assertion that reporting activity increments the snapshot consumer count but leaves the actions consumer count unchanged.

```js
test("status publication does not rerender actions-only consumers", async ({ page }) => {
  await page.goto("http://127.0.0.1:4175/tests/e2e/operation-status-context-harness.html");
  const before = await page.evaluate(() => ({ ...window.__statusHarness }));
  await page.getByRole("button", { name: "Report" }).click();
  await expect(page.locator("[data-status-count]")).not.toHaveText("0");
  const after = await page.evaluate(() => ({ ...window.__statusHarness }));
  expect(after.actionsRenders).toBe(before.actionsRenders);
  expect(after.snapshotRenders).toBeGreaterThan(before.snapshotRenders);
});
```

- [ ] Serve the harness through the existing Playwright Vite server on port 4175; do not add another server process.

- [ ] Run the new spec and confirm it fails because both consumers share one context value.

```powershell
pnpm exec playwright test tests/e2e/operation-status-context.spec.js
```

- [ ] Split `OperationStatusProvider` into stable actions and mutable snapshot providers.

```jsx
const OperationStatusActionsContext = React.createContext(null);
const OperationStatusSnapshotContext = React.createContext(null);

const actions = React.useMemo(() => Object.freeze({
  beginOperation: queue.beginOperation,
  reportActivity: queue.reportActivity,
  dismissOperation: queue.dismissOperation,
}), [queue]);

return (
  <OperationStatusActionsContext.Provider value={actions}>
    <OperationStatusSnapshotContext.Provider value={snapshot}>
      {children}
    </OperationStatusSnapshotContext.Provider>
  </OperationStatusActionsContext.Provider>
);
```

- [ ] Migrate `App.jsx` and `DashboardRenderer.jsx` to `useOperationStatusActions()`. Migrate `OperationStatusViewport.jsx` to the snapshot hook plus the actions hook for dismiss commands.

- [ ] Preserve `useOperationStatus()` only for compatibility and verify no live canvas ancestor imports it.

- [ ] Run the queue unit tests and the new context spec.

```powershell
node --test --test-concurrency=1 tests/operationStatusQueue.test.js
pnpm exec playwright test tests/e2e/operation-status-context.spec.js
```

- [ ] Commit the context split.

```powershell
git add src/components/app-shell/OperationStatusProvider.jsx src/components/app-shell/OperationStatusViewport.jsx src/App.jsx src/components/DashboardRenderer.jsx tests/operationStatusQueue.test.js tests/e2e/operation-status-context-harness.html tests/e2e/operation-status-context-harness.jsx tests/e2e/operation-status-context.spec.js
git commit -m "perf: isolate dashboard from toast snapshots"
```

---

## Task 4: Add stable section and chart-placement render boundaries

**Files:**

- Create: `src/components/dashboard/dashboardCanvasActions.js`
- Create: `src/components/dashboard/DashboardChartPlacement.jsx`
- Create: `src/components/dashboard/DashboardSection.jsx`
- Modify: `src/components/dashboard/DashboardCanvas.jsx`
- Modify: `src/components/dashboard/DashboardModeWorkspace.jsx`
- Modify: `src/components/DashboardRenderer.jsx`
- Create: `tests/e2e/dashboard-render-boundary-harness.html`
- Create: `tests/e2e/dashboard-render-boundary-harness.jsx`
- Create: `tests/e2e/dashboard-render-boundaries.spec.js`

**Interfaces:**

```js
export const DASHBOARD_CANVAS_ACTION_NAMES
export function createDashboardCanvasActions(getCurrentHandlers)
export function useDashboardCanvasActions(handlers)
```

```jsx
export const DashboardChartPlacement = React.memo(function DashboardChartPlacement(props) {})
export const DashboardSection = React.memo(function DashboardSection(props) {})
```

### Steps

- [ ] Create a browser harness that renders two real `DashboardChartPlacement` components inside separate `React.Profiler` boundaries. Use lightweight text/image placements so the test measures the React ownership boundary rather than ECharts startup.

- [ ] Add these failing assertions:

  - selecting placement A commits only placement A;
  - publishing a status snapshot commits neither placement;
  - moving placement A to another section commits placement A but not placement B;
  - reordering a sibling section commits the affected section container but not the chart placements inside the untouched section;
  - the DOM node for placement B remains strictly identical before and after every unrelated update;
  - focus placed inside placement B remains on the same element after placement A moves, demonstrating that chart-local browser state is preserved.

```js
const stableNode = await page.locator('[data-canonical-placement-id="placement-b"]').evaluate((node) => {
  window.__stablePlacementNode = node;
  return node.dataset.canonicalPlacementId;
});
expect(stableNode).toBe("placement-b");
await page.getByRole("button", { name: "Move chart A" }).click();
expect(await page.evaluate(() => (
  document.querySelector('[data-canonical-placement-id="placement-b"]') === window.__stablePlacementNode
))).toBe(true);
```

- [ ] Run the new spec and confirm unrelated placement commits occur with the current inline callbacks and whole-canvas mapping.

```powershell
pnpm exec playwright test tests/e2e/dashboard-render-boundaries.spec.js
```

- [ ] Implement the stable action dispatcher. It must allocate one callable per known action name once, while each callable reads the current handler from a ref.

```js
export const DASHBOARD_CANVAS_ACTION_NAMES = Object.freeze([
  "select", "removePanel", "requestPanelMove", "panelDragStart", "panelDragOver",
  "panelDrop", "panelDragEnd", "reorderSection", "structureCommand", "addPage",
  "addSection", "addChart", "addStaticContent",
]);

export function createDashboardCanvasActions(getCurrentHandlers) {
  return Object.freeze(Object.fromEntries(DASHBOARD_CANVAS_ACTION_NAMES.map((name) => [
    name,
    (...args) => getCurrentHandlers()[name]?.(...args),
  ])));
}
```

- [ ] In `DashboardRenderer.jsx`, replace the inline `buildState` callbacks with a stable `actions` object and primitive state fields. Keep current handlers in a ref updated on each render so actions never close over stale dashboard state.

- [ ] Extract `DashboardSection`. Pass the section object, resource-map references, primitive selection/drag flags, and stable actions. Do not pass the entire `buildState` object.

- [ ] Extract `DashboardChartPlacement`. Derive its callbacks with `useCallback()` from stable actions plus stable entity IDs. Send drag edge and placement identity to the dispatcher; let the current handler calculate the latest insertion index. Do not pass a list index that changes when siblings move.

```jsx
const onDragOver = React.useCallback((event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const edge = event.clientY >= rect.top + rect.height / 2 ? "after" : "before";
  actions.panelDragOver(event, { pageId, sectionId, placementId: placement.id, edge });
}, [actions, pageId, sectionId, placement.id]);
```

- [ ] Keep `ChartPanel` props referentially stable: placement/chart, rows, dataset profile, source state, geo data, data sources, assets, and content render context must come from unchanged shared references when unrelated layout state changes.

- [ ] Give each placement root `data-canonical-placement-id` for deterministic mounted-node verification.

- [ ] Run the render-boundary spec and existing dashboard-focused unit tests.

```powershell
pnpm exec playwright test tests/e2e/dashboard-render-boundaries.spec.js
node --test --test-concurrency=1 tests/dashboardAppV3.test.js tests/buildWorkspaceV3.test.js
```

- [ ] Commit the render boundaries.

```powershell
git add src/components/dashboard/dashboardCanvasActions.js src/components/dashboard/DashboardChartPlacement.jsx src/components/dashboard/DashboardSection.jsx src/components/dashboard/DashboardCanvas.jsx src/components/dashboard/DashboardModeWorkspace.jsx src/components/DashboardRenderer.jsx tests/e2e/dashboard-render-boundary-harness.html tests/e2e/dashboard-render-boundary-harness.jsx tests/e2e/dashboard-render-boundaries.spec.js
git commit -m "perf: isolate dashboard chart render boundaries"
```

---

## Task 5: Open editor shells before reveal and chart preparation work

**Files:**

- Create: `src/lib/scheduleAfterPaint.js`
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/components/build/BuildWorkspace.jsx`
- Modify: `src/components/chart-authoring/ChartWizardV3.jsx`
- Modify: `tests/chartAuthoringComponentsV3.test.js`
- Modify: `tests/e2e/dashboard-performance.spec.js`

**Interfaces:**

```js
export function scheduleAfterPaint(callback, windowObject = window)
export function chartEditDraftIdentity({ draft, chronoGroups })
```

`scheduleAfterPaint()` returns a cancellation function. Quick editor activation and full-editor shell visibility remain synchronous React state updates; only expensive preparation is deferred.

### Steps

- [ ] Add a pure scheduler test showing work is queued behind one animation frame and one timer, and cancellation prevents execution.

```js
test("scheduleAfterPaint runs after the presentation boundary and can be cancelled", () => {
  const events = [];
  const fakeWindow = createSchedulerWindow(events);
  const cancel = scheduleAfterPaint(() => events.push("work"), fakeWindow);
  fakeWindow.flushAnimationFrame();
  assert.deepEqual(events, ["frame"]);
  fakeWindow.flushTimers();
  assert.deepEqual(events, ["frame", "work"]);
  cancel();
});
```

- [ ] Add a chart-edit identity test proving an unchanged initial edit session and its first wizard state have the same identity, while a real chart field or Chrono membership edit changes it.

- [ ] Add Playwright assertions to `dashboard-performance.spec.js` that:

  - clicking a chart exposes the quick editor before reveal completion;
  - switching to Full Edit exposes the full-editor dialog and controls while its preview is marked pending;
  - opening either editor does not publish an “edited” activity until the user changes a field;
  - closing an unchanged quick or full editor does not open discard confirmation;
  - the canonical canvas instance remains mounted throughout quick/full transitions.

- [ ] Run the focused tests and confirm they fail against the reveal-gated and synchronous-preparation behavior.

```powershell
node --test --test-concurrency=1 tests/chartAuthoringComponentsV3.test.js
pnpm exec playwright test tests/e2e/dashboard-performance.spec.js
```

- [ ] Split build selection into immediate activation and asynchronous reveal. `requestBuildSelection()` must set `buildSelection`, construct the chart edit session, and show the quick editor before scheduling page navigation/scroll. `completeBuildReveal()` may resolve focus/navigation promises but must not create or close editor state.

```js
function activateBuildSelection(selection, intent) {
  setBuildSelection(selection);
  if (selection.kind !== "chart" || intent !== "activate") {
    closeChartEditorState();
    return;
  }
  const placement = findPanelPlacement(workingDashboard, selection.placementId);
  openQuickChartEditor(placement, selection);
}
```

- [ ] Keep `BuildWorkspace` reveal logic for scrolling and restoration, but rename its completion responsibility so it cannot be mistaken for editor activation.

- [ ] Add `scheduleAfterPaint()` using `requestAnimationFrame(() => setTimeout(callback, 0))`, with both handles cancelled during cleanup.

- [ ] Replace synchronous `createWizardPreparation()` in render with a deferred stateful preparation. On input change, render the shell with a cached source profile when available and `prepared: null`, then calculate profiling/preparation after paint. Discard stale results by generation number.

```jsx
const [runtime, setRuntime] = React.useState(() => ({
  status: "pending",
  profile: cachedProfile ?? null,
  prepared: null,
}));

React.useEffect(() => {
  const generation = ++preparationGenerationRef.current;
  setRuntime({ status: "pending", profile: cachedProfile ?? null, prepared: null });
  return scheduleAfterPaint(() => {
    const prepared = createWizardPreparation({ chart: wizard.draft, rows, geoData, authorMetadata });
    if (preparationGenerationRef.current === generation) {
      setRuntime({ status: "ready", ...prepared });
    }
  });
}, [wizard.draft, rows, geoData, authorMetadata, cachedProfile]);
```

- [ ] Render an existing editor loading state while preparation is pending; keep save controls disabled only when their required validation data is not ready.

- [ ] Suppress the initial `onEditDraftChange()` echo by seeding an identity ref from the incoming edit session. Emit only when the wizard draft/Chrono identity differs from the last emitted identity.

```jsx
const emittedEditIdentityRef = React.useRef(chartEditDraftIdentity({
  draft: editSession?.draft,
  chronoGroups: editSession?.chronoGroups,
}));

React.useEffect(() => {
  if (!editMode || !wizard.draft) return;
  const identity = chartEditDraftIdentity({ draft: wizard.draft, chronoGroups: wizard.chronoGroups });
  if (identity === emittedEditIdentityRef.current) return;
  emittedEditIdentityRef.current = identity;
  onEditDraftChange({ draft: structuredClone(wizard.draft), chronoGroups: structuredClone(wizard.chronoGroups) });
}, [editMode, onEditDraftChange, wizard.draft, wizard.chronoGroups]);
```

- [ ] Run the unit and performance journey tests.

```powershell
node --test --test-concurrency=1 tests/chartAuthoringComponentsV3.test.js
pnpm exec playwright test tests/e2e/dashboard-performance.spec.js
```

- [ ] Commit the editor scheduling changes.

```powershell
git add src/lib/scheduleAfterPaint.js src/components/DashboardRenderer.jsx src/components/build/BuildWorkspace.jsx src/components/chart-authoring/ChartWizardV3.jsx tests/chartAuthoringComponentsV3.test.js tests/e2e/dashboard-performance.spec.js
git commit -m "perf: present chart editors before heavy preparation"
```

---

## Task 6: Verify the complete performance contract

**Files:**

- Modify only if a regression is found: files already listed in Tasks 1 through 5

### Steps

- [ ] Run the deterministic render-boundary and editor journey selection together.

```powershell
pnpm exec playwright test tests/e2e/operation-status-context.spec.js tests/e2e/dashboard-render-boundaries.spec.js tests/e2e/dashboard-performance.spec.js
```

Expected:

- status publication updates the viewport without committing the actions-only dashboard consumer;
- unrelated chart placements record zero commits and retain the same DOM node;
- moved charts and affected containers update;
- quick and full editor shells appear before reveal/preparation completion;
- unchanged editor entry/exit produces no edit activity or discard confirmation.

- [ ] Run the task-specific Node selection once on the assembled candidate.

```powershell
node --test --test-concurrency=1 tests/buildLayoutDraft.test.js tests/buildLayoutMove.test.js tests/buildWorkspaceV3.test.js tests/chartAuthoringComponentsV3.test.js tests/dashboardAppV3.test.js tests/operationStatusQueue.test.js
```

- [ ] Run the production build because the implementation changes shared React module boundaries and browser scheduling.

```powershell
pnpm build
```

- [ ] Start the representative local dashboard, repeat the Biomedical Quick Edit open/close, Quick-to-Full, chart move, and Section move journey, and record the observed durations in the final handoff. Treat an immediately painted editor shell and the deterministic render-boundary assertions as the release gate; report wall-clock numbers as machine-specific supporting evidence.

```powershell
pnpm dev -- --host 0.0.0.0 --port 5173
```

- [ ] Inspect `git diff --check` and the final branch diff. Confirm there are no generated dashboard bundles or unrelated user changes in the commit set.

```powershell
git diff --check
git status --short
git diff --stat main...HEAD
```

- [ ] If verification required a behavior correction, rerun only the deterministic checks invalidated by that correction, then amend the corresponding task commit or create one bounded correction commit.

- [ ] Record the final evidence in the task handoff: focused Node count, Playwright spec count, build result, branch name, and inspection URL. Do not create a separate evidence file or evidence-only commit.

---

## Plan Self-Review (Completed)

- [x] Mapped every rendering-contract bullet in the approved design to a task and deterministic assertion.
- [x] Kept the live `DashboardModeWorkspace` to `DashboardCanvas` path in scope and excluded the unreachable legacy return.
- [x] Checked interface names and file ownership across tasks for consistency.
- [x] Scanned the plan for unresolved placeholders; none remain.
- [x] Removed redundant server setup and duplicate verification commands.

## Execution Acceptance Checklist

- [ ] Every acceptance criterion in the approved design is covered by a task and a deterministic assertion.
- [ ] Structural-sharing tests check reference identity, not only deep equality.
- [ ] The move analyzer never freezes or retains live dashboard subtrees.
- [ ] The latest draft is revalidated at move-apply time.
- [ ] Dashboard ancestors import the actions-only status hook.
- [ ] Placement callbacks do not receive changing list indices.
- [ ] Quick-editor visibility is not conditional on reveal completion.
- [ ] Full-editor preparation begins after a paint opportunity and cancels stale work.
- [ ] No initial edit-draft echo is emitted.
- [ ] Persistence format and save semantics remain unchanged.
- [ ] The plan contains no unresolved placeholders.
