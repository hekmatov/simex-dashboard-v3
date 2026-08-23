# Build Command Header and Dashboard Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Build commands into a logically grouped normal-flow header above the canonical chart canvas, convert the former Build panel into Dashboard Map, remove its Chrono Group summary, and repair the Chrono Group content-page action composition.

**Architecture:** `BuildWorkspace` remains the live draft/state coordinator. It renders a focused `BuildCommandHeader` in the new `workspaceControls` slot carried by `DashboardModeWorkspace` into `CanonicalDashboardFrame`, while Dashboard Map stays a transient fixed panel owned by the same component. Structure and Inspector become explicit map regions rather than distant stacked content.

**Tech Stack:** React 19, CSS, Node test runner, Vite SSR test loading, Playwright browser tests

**Spec:** `docs/superpowers/specs/2026-08-23-build-command-header-dashboard-map-and-interface-audit-design.md`

## Global Constraints

- Preserve all pre-existing dirty and untracked files; stage only files named by the active task.
- Follow red-green-refactor: every production change starts with a focused failing test and the expected failure must be observed.
- Build commands remain enabled when Dashboard Map is closed; `inert` and `aria-hidden` apply only to the map.
- Opening Dashboard Map must not mutate saved Page, Section, panel, chart, or temporal state.
- Build and View continue to use the canonical renderer and saved layout model.
- Use the accepted V3 visual tokens and 44px default control height.
- Do not implement Step 8 Present/Audience redesign work.

---

### Task 1: Establish the normal-flow workspace-controls slot

**Files:**
- Modify: `src/components/dashboard/CanonicalDashboardFrame.jsx`
- Modify: `src/components/dashboard/DashboardModeWorkspace.jsx`
- Modify: `src/components/DashboardRenderer.jsx`
- Test: `tests/dashboardSemanticBoundary.test.js`

**Interfaces:**
- Consumes: existing `buildOverlay: ReactNode` created by `DashboardRenderer`.
- Produces: `workspaceControls: ReactNode`, rendered after `.canonical-dashboard-header` and before `.canonical-dashboard-content`; `BuildWorkspace` becomes that node in Build mode.

- [ ] **Step 1: Write the failing live composition test**

Add a focused case to `tests/dashboardSemanticBoundary.test.js` that renders the production `CanonicalDashboardFrame` and asserts the order and mode ownership:

```js
test("Build workspace controls live between the canonical header and canvas content", () => {
  const html = renderToStaticMarkup(React.createElement(CanonicalDashboardFrame, {
    mode: "build",
    pageType: "analytical",
    pageId: "biomedical",
    dashboardHeader: React.createElement("span", null, "Dashboard identity"),
    workspaceControls: React.createElement("section", { "aria-label": "Build commands" }, "Commands"),
    pageContent: React.createElement("span", null, "Canvas"),
  }));
  assert.match(html, /canonical-dashboard-header[\s\S]*canonical-dashboard-workspace-controls[\s\S]*canonical-dashboard-content/);
  assert.match(html, /aria-label="Build commands"/);
});
```

- [ ] **Step 2: Run the focused test and observe RED**

Run: `node --test tests/dashboardSemanticBoundary.test.js`

Expected: FAIL because `CanonicalDashboardFrame` does not render `workspaceControls`.

- [ ] **Step 3: Add the slot and route BuildWorkspace through it**

Implement the frame API:

```jsx
export default function CanonicalDashboardFrame({
  workspaceControls = null,
}) {
  // Keep the existing parameters and main element attributes. Insert this
  // exact node between canonical-dashboard-header and canonical-dashboard-content.
  return workspaceControls
    ? <div className="canonical-dashboard-workspace-controls">{workspaceControls}</div>
    : null;
}
```

Add `buildWorkspace = null` to `DashboardModeWorkspace`, pass it as `workspaceControls={buildMode ? buildWorkspace : null}`, and keep `overlayLayer` for View-owned overlays. In `DashboardRenderer`, rename the local `buildOverlay` node to `buildWorkspace` and pass `buildWorkspace={buildWorkspace}`.

- [ ] **Step 4: Run the focused semantic tests and observe GREEN**

Run: `node --test tests/dashboardSemanticBoundary.test.js tests/buildWorkspaceV3.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the slot slice**

```bash
git add src/components/dashboard/CanonicalDashboardFrame.jsx src/components/dashboard/DashboardModeWorkspace.jsx src/components/DashboardRenderer.jsx tests/dashboardSemanticBoundary.test.js
git commit -m "refactor(build): add canonical command header slot"
```

---

### Task 2: Extract grouped Build commands and isolate Dashboard Map inertness

**Files:**
- Create: `src/components/build/BuildCommandHeader.jsx`
- Modify: `src/components/build/BuildWorkspace.jsx`
- Modify: `src/components/build/UnitOrbit.jsx`
- Modify: `src/styles/modes.css`
- Create: `tests/buildCommandHeader.test.js`
- Modify: `tests/buildDraftCoordinatorLive.test.js`

**Interfaces:**
- Consumes: `draftCoordinator`, `locked`, `auxiliaryLocked`, suspended-draft flags, parked auxiliaries, and existing Build command callbacks from `BuildWorkspace`.
- Produces: `BuildCommandHeader(props)` with `data-build-command-group="content|time|layout|session"`; `#dashboard-map-panel` contains only map regions and alone receives `inert={!buildPanelOpen}`.

- [ ] **Step 1: Write failing grouped-command and closed-map tests**

Create `tests/buildCommandHeader.test.js` using Vite SSR and static rendering. Assert:

```js
assert.match(html, /data-build-command-group="content"[\s\S]*Add chart[\s\S]*Pages &amp; sections/);
assert.match(html, /data-build-command-group="time"[\s\S]*Chrono Studio[\s\S]*Scene Studio/);
assert.match(html, /data-build-command-group="layout"[\s\S]*Layout changes[\s\S]*Save Layout Changes[\s\S]*Discard Layout Changes/);
assert.match(html, /data-build-command-group="session"[\s\S]*Reset[\s\S]*Finish Build/);
```

Extend `tests/buildDraftCoordinatorLive.test.js` to assert that the production `BuildWorkspace` source places `inert` on `id="dashboard-map-panel"`, not on the wrapper containing `BuildCommandHeader`.

- [ ] **Step 2: Run both tests and observe RED**

Run: `node --test tests/buildCommandHeader.test.js tests/buildDraftCoordinatorLive.test.js`

Expected: FAIL because `BuildCommandHeader` and `#dashboard-map-panel` do not exist.

- [ ] **Step 3: Implement the presentational command header**

Create a component with explicit groups:

```jsx
export default function BuildCommandHeader({
  draftCoordinator,
  locked,
  auxiliaryLocked,
  chartDraftAvailable,
  operationError,
  chronoGroupDraftSuspended,
  sceneDraftSuspended,
  parkedAuxiliaries,
  onFinish,
  onReset,
  onSaveLayout,
  onDiscardLayout,
  onAddChart,
  onOpenAuxiliary,
  onResumeAuxiliary,
}) {
  const layoutSlot = draftCoordinator.slots.layout;
  const chartSlot = draftCoordinator.slots.chart;
  const layoutActionsDisabled = !layoutSlot || layoutSlot.status === "clean" || layoutSlot.status === "saving";
  return <section className="build-command-header" aria-label="Build commands">
    <div className="build-command-groups">
      <section className="build-command-group" data-build-command-group="content" aria-label="Content commands">
        <strong>Content</strong>
        <div className="build-command-group__controls">
          <button type="button" className="secondary" disabled={locked} onClick={onAddChart}>{chartDraftAvailable ? "Resume chart draft" : "Add chart"}</button>
          <button type="button" className="secondary" disabled={auxiliaryLocked} onClick={() => onOpenAuxiliary("structure")}>Pages &amp; sections</button>
        </div>
      </section>
      <section className="build-command-group" data-build-command-group="time" aria-label="Time commands">
        <strong>Time</strong>
        <div className="build-command-group__controls">
          <button type="button" className="secondary" disabled={auxiliaryLocked} onClick={() => onOpenAuxiliary("chrono-group")}>Chrono Studio</button>
          <button type="button" className="secondary" disabled={auxiliaryLocked} onClick={() => onOpenAuxiliary("scene")}>Scene Studio</button>
        </div>
      </section>
      <section className="build-command-group" data-build-command-group="layout" aria-label="Layout draft commands">
        <strong>Layout draft</strong>
        <div className="build-draft-slots" aria-label="Build draft status">
          <span data-draft-slot="layout" data-draft-status={layoutSlot?.status ?? "clean"}><strong>Layout changes</strong><small>{layoutSlot?.status ?? "clean"}</small></span>
          <span data-draft-slot="chart" data-draft-status={chartSlot?.status ?? "clean"}><strong>Chart changes</strong><small>{chartSlot?.status ?? "clean"}</small></span>
        </div>
        <div className="build-command-group__controls">
          <button type="button" className="secondary" disabled={layoutActionsDisabled} onClick={onSaveLayout}>Save Layout Changes</button>
          <button type="button" className="secondary" disabled={layoutActionsDisabled} onClick={onDiscardLayout}>Discard Layout Changes</button>
        </div>
      </section>
      <section className="build-command-group" data-build-command-group="session" aria-label="Build session commands">
        <strong>Session</strong>
        <div className="build-command-group__controls">
          <button type="button" className="secondary" disabled={locked} onClick={onReset}>Reset</button>
          <button type="button" disabled={locked} onClick={onFinish}>Finish Build</button>
        </div>
      </section>
    </div>
    {operationError ? <p className="build-operation-error" role="alert">{operationError}</p> : null}
    {chronoGroupDraftSuspended ? <button type="button" className="secondary" onClick={() => onOpenAuxiliary("chrono-group")}>Resume Chrono Group draft</button> : null}
    {sceneDraftSuspended ? <button type="button" className="secondary" onClick={() => onOpenAuxiliary("scene")}>Resume Scene draft</button> : null}
    {parkedAuxiliaries.map(({ surface }) => <button key={surface} type="button" className="secondary" onClick={() => onResumeAuxiliary(surface)}>Resume {surface}</button>)}
  </section>;
}
```

Preserve all existing disabled rules, Context Shelf entry attributes, suspended-draft messages, and `revealUnitOrbitAnchor(chartEditorPlacementId)` after layout discard.

- [ ] **Step 4: Restructure BuildWorkspace without changing draft ownership**

Render:

```jsx
<div className="build-workspace-authoring-root" data-build-draft-coordinator="live">
  <BuildCommandHeader {...commandProps} />
  {activeAuxiliaryPortal}
  <aside
    id="dashboard-map-panel"
    className="dashboard-map-panel"
    aria-label="Dashboard map"
    aria-hidden={buildPanelOpen ? undefined : "true"}
    inert={!buildPanelOpen}
    data-open={buildPanelOpen ? "true" : "false"}
  >
    {dashboardMapRegions}
  </aside>
  {unitOrbit}
</div>
```

In this step, `activeAuxiliaryPortal`, `dashboardMapRegions`, and `unitOrbit` are extractions of the existing JSX blocks with no behavioral edits. Define each as a local React node immediately before the return statement; Task 3 replaces the map-region composition.

Replace Unit Orbit’s `.build-command-area` anchor with `.build-command-header`. Remove `.build-canvas-toolbar` from the outside-pointer exclusion list once Task 3 replaces it with map region controls.

- [ ] **Step 5: Style the header as semantic groups**

Add normal-flow styles with these invariants:

```css
.build-command-header { display: grid; gap: 8px; min-width: 0; padding: 10px 12px; }
.build-command-groups { align-items: end; display: flex; flex-wrap: wrap; gap: 12px 16px; }
.build-command-group { display: grid; flex: 0 0 auto; gap: 6px; }
.build-command-group__controls { display: flex; flex-wrap: nowrap; gap: 8px; }
.build-command-group button { min-height: 44px; }
```

Use existing design tokens rather than literal retired dashboard colors. Convert the fixed `.build-authoring-layer` rules to `.dashboard-map-panel`; the root must remain normal flow.

- [ ] **Step 6: Run focused tests and observe GREEN**

Run: `node --test tests/buildCommandHeader.test.js tests/buildDraftCoordinatorLive.test.js tests/buildWorkspaceV3.test.js`

Expected: PASS.

- [ ] **Step 7: Commit the command/inertness slice**

```bash
git add src/components/build/BuildCommandHeader.jsx src/components/build/BuildWorkspace.jsx src/components/build/UnitOrbit.jsx src/styles/modes.css tests/buildCommandHeader.test.js tests/buildDraftCoordinatorLive.test.js
git commit -m "feat(build): move commands above the canvas"
```

---

### Task 3: Rename and organize Dashboard Map

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/build/BuildWorkspace.jsx`
- Modify: `src/components/build/BuildStructureRail.jsx`
- Modify: `src/components/dashboard/CanonicalDashboardFrame.jsx`
- Modify: `src/components/dashboard/DashboardModeWorkspace.jsx`
- Modify: `src/styles/modes.css`
- Modify: `tests/buildStructureRail.test.js`
- Modify: `tests/dashboardAppV3.test.js`
- Modify: `tests/e2e/v3-build-workspace.spec.js`

**Interfaces:**
- Consumes: existing `buildPanelOpen` state and toggle callback; existing Structure and Inspector nodes.
- Produces: user-facing `Dashboard map`, `aria-controls="dashboard-map-panel"`, `data-dashboard-map-open`, and `data-dashboard-map-region="structure|inspector"`.

- [ ] **Step 1: Replace stale tests with accepted behavior and observe RED**

Change `tests/buildStructureRail.test.js` to assert the tree still exposes the selected roving item but does not render `Chrono Groups` or the group name. Add application assertions that the Build crown contains `Dashboard map` and omits `Chrono Groups`.

Update the first browser journey in `tests/e2e/v3-build-workspace.spec.js` to find `Dashboard map`; add assertions that Build commands are visible before the map opens and remain visible after it opens.

Run: `node --test tests/buildStructureRail.test.js tests/dashboardAppV3.test.js`

Expected: FAIL because the old labels/list still render.

- [ ] **Step 2: Rename the public surface and remove redundant Chrono entry points**

In `App.jsx`, remove the Build-crown `Chrono Groups` button and its now-unused direct-opening handler. Rename the `Build panel` button text and accessible relationships to `Dashboard map` and `dashboard-map-panel`.

In `CanonicalDashboardFrame`, rename the public data attribute to `data-dashboard-map-open`; route the matching prop name through `DashboardModeWorkspace` where practical without broad unrelated renaming.

Delete the Chrono Group section from `BuildStructureRail`; Chrono Studio remains the temporal-library owner.

- [ ] **Step 3: Add explicit Structure and Inspector region switching**

Inside Dashboard Map render:

```jsx
<header className="dashboard-map-header">
  <div><p className="eyebrow">Build</p><h2>Dashboard map</h2></div>
  <div className="dashboard-map-region-switch" role="group" aria-label="Dashboard map regions">
    <button type="button" aria-pressed={mapRegion === "structure"} onClick={() => setMapRegion("structure")}>Structure</button>
    <button type="button" aria-pressed={mapRegion === "inspector"} onClick={() => setMapRegion("inspector")}>Inspector</button>
  </div>
</header>
<section data-dashboard-map-region="structure" hidden={mapRegion !== "structure"}>{structure}</section>
<section data-dashboard-map-region="inspector" hidden={mapRegion !== "inspector"}>{inspector}</section>
```

Default to Structure when the map first opens. If a chart/section/Page is activated from the canvas, preserve the selection; do not automatically mutate layout or open an auxiliary editor.

- [ ] **Step 4: Update responsive and canvas-reservation selectors**

Change fixed-panel and compression selectors from Build panel naming to Dashboard Map naming while retaining the accepted 404px maximum reservation on desktop. The region switch is always reachable; the inactive region is not tabbable. At mobile/touch widths the map uses the existing sheet/drawer behavior and does not exceed the viewport.

- [ ] **Step 5: Run semantic tests and observe GREEN**

Run: `node --test tests/buildStructureRail.test.js tests/dashboardAppV3.test.js tests/dashboardGeometryContract.test.js tests/buildChronoGroupAccess.test.js`

Expected: PASS.

- [ ] **Step 6: Run the focused browser checkpoint**

Run: `pnpm test:e2e -- tests/e2e/v3-build-workspace.spec.js`

Expected browser facts:

- Build commands are visible with Dashboard Map closed.
- `Dashboard map` opens only the map.
- Structure and Inspector can each be reached without a multi-thousand-pixel scroll.
- the selected chart stays visible/usable;
- closing the map restores the prior canonical canvas width and does not change saved layout storage.

- [ ] **Step 7: Commit the Dashboard Map slice**

```bash
git add src/App.jsx src/components/build/BuildWorkspace.jsx src/components/build/BuildStructureRail.jsx src/components/dashboard/CanonicalDashboardFrame.jsx src/components/dashboard/DashboardModeWorkspace.jsx src/styles/modes.css tests/buildStructureRail.test.js tests/dashboardAppV3.test.js tests/e2e/v3-build-workspace.spec.js
git commit -m "feat(build): replace the build panel with dashboard map"
```

---

### Task 4: Repair Chrono Group content-page action composition

**Files:**
- Modify: `src/components/time/ChronoGroupContent.jsx`
- Modify: `src/styles/modes.css`
- Modify: `tests/buildChronoGroupAccess.test.js`
- Modify: `tests/e2e/v3-temporal-authoring.spec.js`

**Interfaces:**
- Consumes: existing `onAction` events: `RETURN_TO_STUDIO`, `START_EDIT`, `START_CREATE_SCENE`, `START_DUPLICATE`, `REQUEST_REMOVE`, and conditional `START_REPAIR`.
- Produces: `data-content-action-group="navigation|primary|management"` with no state-machine changes.

- [ ] **Step 1: Write the failing composition assertions**

Extend `tests/buildChronoGroupAccess.test.js`:

```js
assert.match(content, /data-content-action-group="navigation"[\s\S]*Back to Chrono Studio/);
assert.match(content, /data-content-action-group="primary"[\s\S]*Edit[\s\S]*Create Scene/);
assert.match(content, /data-content-action-group="management"[\s\S]*Duplicate[\s\S]*Remove/);
assert.match(content, /class="[^"]*danger[^"]*"[^>]*>Remove</);
```

Add a browser assertion that the primary group and management group each keep their own row/unit at 1200px and that every content action is at least 44px tall.

- [ ] **Step 2: Run the unit test and observe RED**

Run: `node --test tests/buildChronoGroupAccess.test.js`

Expected: FAIL because action groups do not exist.

- [ ] **Step 3: Implement grouped content composition**

Restructure the header into an identity/navigation row and a separate action bar. Keep the modal `Close` button owned by `BuildWorkspace` and reserve its corner without squeezing the group title.

```jsx
<header className="temporal-content-page__header">
  <div className="temporal-content-page__identity">
    <p className="eyebrow">Chrono Group</p>
    <h2 id="chrono-group-content-title">{content.name}</h2>
    <p>{`${formatDate(content.period?.start ?? content.period?.startEpochMs)} – ${formatDate(content.period?.end ?? content.period?.endEpochMs)} · ${content.secondsPerFrame ?? 1}s per frame`}</p>
  </div>
  <nav data-content-action-group="navigation" aria-label="Chrono Group navigation">
    <button type="button" className="secondary" onClick={() => onAction({ type: "RETURN_TO_STUDIO" })}>Back to Chrono Studio</button>
  </nav>
</header>
<div className="temporal-content-page__action-bar">
  <div data-content-action-group="primary">
    <button type="button" onClick={() => onAction({ type: "START_EDIT", itemType: "chronoGroup", itemId: content.id })}>Edit</button>
    <button type="button" onClick={() => onAction({ type: "START_CREATE_SCENE", parentChronoGroupId: content.id })}>Create Scene</button>
    {content.status === "needs-attention" ? <button type="button" onClick={() => onAction({ type: "START_REPAIR", itemType: "chronoGroup", itemId: content.id })}>Repair</button> : null}
  </div>
  <div data-content-action-group="management">
    <button type="button" className="secondary" onClick={() => onAction({ type: "START_DUPLICATE", itemType: "chronoGroup", itemId: content.id })}>Duplicate</button>
    <button type="button" className="secondary danger" onClick={() => onAction({ type: "REQUEST_REMOVE", itemType: "chronoGroup", itemId: content.id })}>Remove</button>
  </div>
</div>
```

Apply a destructive class to `Remove`; keep repair conditional on `needs-attention`.

- [ ] **Step 4: Add responsive spacing and alignment styles**

Use grid/flex groups with 8px intra-group and 16px inter-group spacing. At narrow widths, stack complete groups. Reset paragraph margins inside the identity block and maintain 44px action heights. Do not restore the undifferentiated `.temporal-content-page__actions` wrap rule.

- [ ] **Step 5: Run focused semantic and browser checks**

Run: `node --test tests/buildChronoGroupAccess.test.js tests/chronoContentState.test.js`

Then: `pnpm test:e2e -- tests/e2e/v3-temporal-authoring.spec.js`

Expected: PASS; browser geometry shows no clipped action, no lone wrapped navigation button, and no overlap with the auxiliary Close control.

- [ ] **Step 6: Commit the content composition slice**

```bash
git add src/components/time/ChronoGroupContent.jsx src/styles/modes.css tests/buildChronoGroupAccess.test.js tests/e2e/v3-temporal-authoring.spec.js
git commit -m "fix(chrono): organize group content actions"
```

---

### Task 5: Run the structural completion gate and update controlling records

**Files:**
- Modify: `docs/superpowers/plans/2026-08-19-v3-step-7-build-view.md`
- Modify: `docs/audits/2026-08-22-v3-step-7-build-view/SKETCH-FIDELITY-MATRIX.md`
- Modify: `docs/audits/2026-08-22-v3-step-7-build-view/MASTER-REVIEW-SUBMISSION.md`

**Interfaces:**
- Consumes: test/browser evidence from Tasks 1–4.
- Produces: explicit Dashboard Map amendment, real implementation status, and provisional—not accepted—master-review language.

- [ ] **Step 1: Run the affected unit suite**

Run:

```bash
node --test tests/buildCommandHeader.test.js tests/buildDraftCoordinatorLive.test.js tests/buildStructureRail.test.js tests/buildChronoGroupAccess.test.js tests/dashboardAppV3.test.js tests/dashboardGeometryContract.test.js tests/dashboardSemanticBoundary.test.js tests/buildWorkspaceV3.test.js
```

Expected: PASS with no warnings.

- [ ] **Step 2: Run the production build**

Run: `pnpm build`

Expected: exit code 0 and a completed Vite production bundle.

- [ ] **Step 3: Exercise the in-app browser checkpoint**

At 1280 × 720, inspect Build with Dashboard Map closed/open and the Chrono Group content page. Record actual button boxes, group gaps, panel reachability, selected-target visibility, and absence of header overlap. Use interaction/geometry facts, not screenshot existence, as evidence.

- [ ] **Step 4: Amend records with the observed evidence**

Record:

- Build commands are normal-flow and remain available while Dashboard Map is closed;
- Dashboard Map owns Structure/Inspector only;
- the Chrono summary is removed;
- the Chrono Group content actions are grouped by ownership;
- the master-review submission remains provisional pending the systematic audit and remaining Step 7 closure.

- [ ] **Step 5: Commit the evidence update**

```bash
git add docs/superpowers/plans/2026-08-19-v3-step-7-build-view.md docs/audits/2026-08-22-v3-step-7-build-view/SKETCH-FIDELITY-MATRIX.md docs/audits/2026-08-22-v3-step-7-build-view/MASTER-REVIEW-SUBMISSION.md
git commit -m "docs(step7): record dashboard map structural evidence"
```
