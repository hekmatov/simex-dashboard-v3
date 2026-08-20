# V3 Build Structure and Dashboard Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a Carbon-style Build hierarchy with reliable cross-page selection and inline renaming, content-responsive shared Section density, and safe two-confirmation dashboard package import/export.

**Architecture:** Keep `App` as persisted dashboard/package owner and `DashboardRenderer` as Build transaction/draft owner. Make the Structure tree a projection with local expansion, focus, click-arbitration, and rename UI state; route every activation through one renderer-owned navigation transaction before opening Unit Orbit. Add a pure package candidate parser/summary and explicit authored-content dirty signals so cosmetic theme changes never trigger import warnings.

**Tech Stack:** React 19, Vite 6, plain CSS, Node test runner, Playwright Chromium

**Spec:** `docs/superpowers/specs/2026-08-21-v3-build-structure-package-design.md`

## Global Constraints

- Work only in the existing managed worktree and current branch; do not create a worktree, switch branches, reset, stash, discard, or push.
- Preserve the recorded user-owned dirty boundary. `src/App.jsx`, `src/components/DashboardRenderer.jsx`, and `src/components/build/BuildWorkspace.jsx` are already dirty; stage only this plan's hunks from those files.
- `App` remains the persisted dashboard and package owner.
- `DashboardRenderer` remains the Build selection, authoring-draft, and workspace transaction owner.
- `BuildWorkspace`, the Structure tree, and the shared crown receive projections/callbacks and do not own dashboard content.
- Keep V3 as the only live dashboard configuration/runtime contract.
- Shared Section padding is exactly `10px 18px 8px`; description gap is `4px`; header-to-first-panel and panel-grid gaps are exactly `16px`.
- Single-click activation delay is exactly 500ms. Double-click cancels the pending single-click, navigates/selects/highlights the target, then opens inline rename.
- Essential targets remain at least 44×44px with visible 3px focus treatment, non-colour state cues, and reduced-motion behavior.
- Cosmetic style, appearance, color-profile, and palette changes never trigger the import discard warning.
- Import never mutates the dashboard before the second confirmation.
- Follow TDD for every behavior and review the staged diff before every commit.

---

## File Responsibility Map

### New focused modules

- `src/components/build/buildTreeInteraction.js`: deterministic 500ms click/double-click controller and visible-tree keyboard helpers.
- `src/components/build/buildDirtyState.js`: authored-content dirty flags and classification; contains no appearance flags.
- `src/lib/dashboardPackageCandidate.js`: parse/validate package text, retain exported timestamp, and build nested Page/Section/Panel review data.
- `src/components/build/DashboardPackageReviewDialog.jsx`: pure review and confirmation UI.
- `tests/buildTreeInteraction.test.js`: deterministic controller/model tests.
- `tests/buildDirtyState.test.js`: content-vs-cosmetic dirty classification tests.
- `tests/dashboardPackageCandidate.test.js`: package metadata and nested-summary tests.
- `tests/e2e/v3-build-structure-packages.spec.js`: focused real Build navigation/rename/import flows.

### Existing modules with scoped changes

- `src/styles/dashboard-style-grammar.css`: shared Section density and the three style-specific tree connector grammars.
- `src/styles/modes.css`: Build tree layout, 44px hit areas, page-tab simplification, inline rename, and package-review layout.
- `src/components/build/BuildStructureRail.jsx`: semantic Carbon tree rendering and local interaction state.
- `src/components/build/BuildPageNavigation.jsx`: draggable page tabs without edit/move action buttons; keyboard reorder alternative.
- `src/components/build/BuildWorkspace.jsx`: callback projection, reveal requests, and package buttons.
- `src/components/dashboard/DashboardCanvas.jsx`: remove the old canvas-owned Section rename affordance and keep canonical targets stable.
- `src/components/DashboardRenderer.jsx`: selection transaction, editor-open separation, rename persistence, dirty aggregation, and package-action orchestration.
- `src/components/chart-authoring/ChartEditorV3.jsx`: report real chart draft dirtiness.
- `src/components/chart-authoring/ChartWizardV3.jsx`: report changed wizard state without treating an untouched open wizard as dirty.
- `src/lib/dashboardCommitController.js`: expose whether debounced authored edits are pending.
- `src/App.jsx`: inspect a package into a review candidate and atomically load only after confirmation.
- `tests/buildStructureControls.test.js`: static tree/page-control contract.
- `tests/chartAuthoringComponentsV3.test.js`: Chart editor and wizard dirty-signal behavior.
- `tests/applicationRecovery.test.js`: replace the obsolete assertion that Build must not expose package controls.
- `tests/e2e/v3-style-fidelity.spec.js`: exact revised Section spacing.
- `tests/e2e/v3-shell-fidelity.spec.js`: retain exact View/Build geometry equality after density changes.

---

### Task 1: Make shared Section density content-responsive

**Files:**
- Modify: `src/styles/dashboard-style-grammar.css`
- Modify: `src/styles/modes.css`
- Test: `tests/e2e/v3-style-fidelity.spec.js`
- Test: `tests/e2e/v3-shell-fidelity.spec.js`

**Interfaces:**
- Consumes: existing `.section-header`, `.section-title-block`, `.layout-grid`, and canonical geometry attributes.
- Produces: one shared content-height Section geometry used unchanged by View and Build.

- [ ] **Step 1: Write the failing spacing assertions**

Update the native-style measurement in `tests/e2e/v3-style-fidelity.spec.js` to assert literal values:

```js
expect(metrics.header.padding).toBe("10px 18px 8px");
expect(metrics.grid.paddingTop).toBe("16px");
expect(metrics.grid.rowGap).toBe("16px");
expect(metrics.grid.columnGap).toBe("16px");
```

Add a content-height probe that records a one-line title height, replaces the title with wrapping text at the same width, and verifies that the height delta is one computed title line-height rather than extra padding. Remove the description for one probe and restore it for another; assert the description adds its own height plus a literal 4px gap.

- [ ] **Step 2: Run the focused RED check**

Run:

```bash
pnpm exec playwright test tests/e2e/v3-style-fidelity.spec.js --project=chromium --grep "native styles preserve|section headers adapt"
```

Expected: FAIL because production still reports `22px 18px 14px`, an 18px grid inset, and the Build heading has a fixed `1.2em` height rule.

- [ ] **Step 3: Apply the minimal shared CSS change**

In `src/styles/dashboard-style-grammar.css`, replace the late shared rules with:

```css
.app-frame .canonical-dashboard-frame .section-header {
  padding: 10px 18px 8px;
}

.app-frame .canonical-dashboard-frame .section-title-block {
  display: grid;
  gap: 0;
}

.app-frame .canonical-dashboard-frame .section-title-block > p {
  margin-top: 4px;
}

.app-frame .canonical-dashboard-frame .dashboard-section > .layout-grid {
  gap: 16px;
  padding: 16px 18px 18px;
}
```

In `src/styles/modes.css`, remove the fixed `.build-section-header h2 { height: 1.2em; }` rule and its negative-margin compensation. Keep the 44px Build title target absolutely layered over the content box so it cannot enlarge the canonical header.

- [ ] **Step 4: Run the focused GREEN checks**

Run the same style-fidelity grep. Then run:

```bash
pnpm exec playwright test tests/e2e/v3-shell-fidelity.spec.js --project=chromium --grep "exact View Build geometry"
```

Expected: both focused checks PASS; all x/y/w/h View-versus-Build deltas remain the exact string `0.00` at 768×1024, 1024×768, 1200×900, and 1440×900.

- [ ] **Step 5: Review and commit only Task 1**

```bash
git add src/styles/dashboard-style-grammar.css src/styles/modes.css tests/e2e/v3-style-fidelity.spec.js tests/e2e/v3-shell-fidelity.spec.js
git diff --cached --check
git diff --cached
git commit -m "fix(layout): tighten adaptive Section density"
```

---

### Task 2: Build the Carbon-style Structure tree and simplify Page tabs

**Files:**
- Create: `src/components/build/buildTreeInteraction.js`
- Create: `tests/buildTreeInteraction.test.js`
- Modify: `src/components/build/BuildStructureRail.jsx`
- Modify: `src/components/build/BuildPageNavigation.jsx`
- Modify: `src/styles/modes.css`
- Modify: `src/styles/dashboard-style-grammar.css`
- Modify: `tests/buildStructureControls.test.js`

**Interfaces:**
- Produces: `createDelayedTreeActivation({ delay, schedule, cancel })`, `visibleBuildTreeNodes(dashboard, expandedKeys)`, and `selectionKey(selection)`.
- Produces: `BuildStructureRail` callbacks `onActivate(selection, options) => Promise<boolean>`, `onRename(selection, value) => Promise<boolean>`, and `onRenameDirtyChange(boolean)`.
- Consumes later: Task 3 provides the async `onActivate` and `onRename` implementations.

- [ ] **Step 1: Write deterministic RED tests for click arbitration**

Create `tests/buildTreeInteraction.test.js` with a fake scheduler and literal event log:

```js
test("one click activates after exactly 500ms and double-click cancels it", () => {
  const clock = fakeClock();
  const events = [];
  const controller = createDelayedTreeActivation({
    delay: 500,
    schedule: clock.schedule,
    cancel: clock.cancel,
  });

  controller.click(() => events.push("single"));
  clock.advance(499);
  assert.deepEqual(events, []);
  clock.advance(1);
  assert.deepEqual(events, ["single"]);

  controller.click(() => events.push("wrong-single"));
  controller.doubleClick(() => events.push("rename"));
  clock.advance(500);
  assert.deepEqual(events, ["single", "rename"]);
});
```

Add literal visible-node expectations for expanded Page/Section branches and collapsed descendants.

- [ ] **Step 2: Write the static tree RED contract**

Update `tests/buildStructureControls.test.js` to require:

```js
assert.match(html, /role="tree"/);
assert.match(html, /role="treeitem"/);
assert.match(html, /aria-expanded="true"/);
assert.match(html, /data-build-node-kind="page"/);
assert.match(html, /data-build-node-kind="section"/);
assert.match(html, /data-build-node-kind="chart"/);
assert.doesNotMatch(html, />Scenario<\/button>/);
assert.doesNotMatch(pageTabsHtml, /Edit Biomedical|Move Biomedical earlier|Move Biomedical later/);
```

Also assert one type icon per Page, Section, and Chart node, with the icon positioned after the caret/spacer in markup order.

- [ ] **Step 3: Run Task 2 RED tests**

```bash
node --test tests/buildTreeInteraction.test.js tests/buildStructureControls.test.js
```

Expected: FAIL because the controller/model does not exist, the Structure rail begins with Scenario, and Page action buttons remain.

- [ ] **Step 4: Implement the pure interaction/model helpers**

Implement `createDelayedTreeActivation` so `click` cancels a prior timer before scheduling one, `doubleClick` cancels the timer before invoking rename, and `dispose` cancels outstanding work.

Implement `visibleBuildTreeNodes` to return ordered records of this exact shape:

```js
{
  key: "page:biomedical/section:overview/chart:confirmed_cases",
  parentKey: "page:biomedical/section:overview",
  depth: 3,
  kind: "chart",
  pageId: "biomedical",
  sectionId: "overview",
  placementId: "confirmed_cases_panel",
  chartId: "confirmed_cases",
  hasChildren: false,
}
```

No helper may mutate the dashboard.

- [ ] **Step 5: Replace the Structure markup with Carbon semantics**

In `BuildStructureRail.jsx`:

- Remove the Scenario button.
- Render Page and Section branches with carets, `role="treeitem"`, `aria-expanded`, and nested `role="group"` lists.
- Render Charts as leaf tree items with a caret-width spacer.
- Use `SimExIcon` with `addTab` for Page, `section` for Section, and `chartMixed` for Chart.
- Keep roving `tabIndex`: selected node first, otherwise the first visible node.
- Implement ArrowUp/Down, ArrowLeft/Right, Enter, F2, and Escape according to the spec.
- Use the delayed controller only for label activation; caret buttons toggle immediately.
- On double-click or F2, await `onActivate(selection, { intent: "rename" })`; enter inline rename only when it resolves `true`.
- Keep the selected row highlighted while its input is active.
- Call `onRenameDirtyChange(true)` only when the current input differs from its original trimmed label; restore `false` after successful commit or cancellation.

- [ ] **Step 6: Remove Page action controls but preserve reorder access**

In `BuildPageNavigation.jsx`, delete `PageRenameOrbit`, `openPageId`, the active action rail, and edit/move buttons. Retain draggable Page buttons. Add a keyboard alternative on each Page tab:

```js
if (event.altKey && event.key === "ArrowLeft" && index > 0) {
  event.preventDefault();
  onPageReorder?.(page.id, index - 1);
}
if (event.altKey && event.key === "ArrowRight" && index < pages.length - 1) {
  event.preventDefault();
  onPageReorder?.(page.id, index + 1);
}
```

Expose the shortcut in the button title and accessible description without adding visible controls.

- [ ] **Step 7: Apply style-specific connector grammar**

In `modes.css`, remove boxed node styling, retain a 44px target, and define connector pseudo-elements from nested `role="group"` lists.

In `dashboard-style-grammar.css`, add exact variants:

```css
.app-frame[data-dashboard-style="evidence-ledger"] .build-tree-group {
  --build-tree-line: var(--simex-border-strong);
  --build-tree-line-width: 1px;
  --build-tree-elbow-radius: 0;
}

.app-frame[data-dashboard-style="humanist-standard"] .build-tree-group {
  --build-tree-line: color-mix(in srgb, var(--simex-border-subtle) 72%, transparent);
  --build-tree-line-width: 1px;
  --build-tree-elbow-radius: 6px;
}

.app-frame[data-dashboard-style="signal-instrument"] .build-tree-group {
  --build-tree-line: var(--simex-accent);
  --build-tree-line-width: 2px;
  --build-tree-elbow-radius: 0;
}
```

Selected rows require a non-colour rail/weight cue; focus requires a 3px outline.

- [ ] **Step 8: Run Task 2 GREEN tests**

```bash
node --test tests/buildTreeInteraction.test.js tests/buildStructureControls.test.js
```

Expected: all tests PASS with no Scenario node and no Page action rail.

- [ ] **Step 9: Review and commit only Task 2**

```bash
git add src/components/build/buildTreeInteraction.js src/components/build/BuildStructureRail.jsx src/components/build/BuildPageNavigation.jsx src/styles/modes.css src/styles/dashboard-style-grammar.css tests/buildTreeInteraction.test.js tests/buildStructureControls.test.js
git diff --cached --check
git diff --cached
git commit -m "feat(build): add Carbon Structure tree"
```

---

### Task 3: Coordinate cross-page reveal, Unit Orbit, and inline rename

**Files:**
- Modify: `src/components/build/BuildWorkspace.jsx` (stage only Task 3 hunks)
- Modify: `src/components/dashboard/DashboardCanvas.jsx`
- Modify: `src/components/DashboardRenderer.jsx` (stage only Task 3 hunks)
- Modify: `src/styles/modes.css`
- Create: `tests/e2e/v3-build-structure-packages.spec.js`
- Test: `tests/buildStructureControls.test.js`

**Interfaces:**
- Consumes: Task 2 `BuildStructureRail.onActivate/onRename/onRenameDirtyChange`.
- Produces: renderer function `requestBuildSelection(nextSelection, { intent }) => Promise<boolean>` where `intent` is `"activate"` or `"rename"`.
- Produces: `BuildWorkspace` prop `revealRequest = { id, selection, behavior } | null` and callback `onRevealComplete(id)`.
- Produces for Task 4: `onInlineRenameDirtyChange(boolean)` feeds the authored-content dirty registry.

- [ ] **Step 1: Write a real cross-page RED browser flow**

In `tests/e2e/v3-build-structure-packages.spec.js`:

1. Enter Build and open the authoring panel.
2. Keep Biomedical active.
3. Expand a different Page in the Structure tree.
4. Single-click a Section on that Page, advance/wait 500ms, and assert that Page becomes active and the Section intersects the viewport.
5. Return to Biomedical, single-click a Chart on the other Page, and assert in order that the destination Page becomes active, its canonical Chart is visible, and Unit Orbit is anchored to that placement.
6. Assert no `Finish or cancel the open chart editor before changing Page` message appears in this clean path.

Add a double-click case that asserts the destination row is `aria-selected="true"`, its Page is active, its canonical target is visible, and the inline input is focused while Unit Orbit remains closed for rename intent.

- [ ] **Step 2: Run the focused RED browser test**

```bash
pnpm exec playwright test tests/e2e/v3-build-structure-packages.spec.js --project=chromium --grep "cross-page tree selection|double-click rename"
```

Expected: FAIL because Build currently sets Chart selection before changing Page and selection is inseparable from editor opening.

- [ ] **Step 3: Separate selection from editor-open state**

In `DashboardRenderer.jsx`:

- Add `chartEditorPlacementId` state.
- Derive `selectedPlacement` only from `chartEditorPlacementId`.
- Keep `buildSelection` for highlight/inspector state.
- A Chart `activate` request sets both selection and editor placement after navigation.
- A Chart `rename` request sets selection but clears editor placement so inline rename does not mount Unit Orbit.
- Canvas Edit continues to use `activate` intent and opens Unit Orbit.
- Save/Cancel clears `chartEditorPlacementId` without losing the valid selected tree node.

- [ ] **Step 4: Implement the renderer-owned selection transaction**

Implement this contract in `DashboardRenderer.jsx`:

```js
async function requestBuildSelection(nextSelection, { intent = "activate" } = {}) {
  if (!isValidBuildSelection(dashboardStateRef.current, nextSelection)) return false;
  if (wouldDiscardDirtyEditor(nextSelection)) {
    setOperationError("Finish or cancel the open chart editor before changing Page.");
    return false;
  }
  const requestId = ++buildRevealRequestIdRef.current;
  if (nextSelection.pageId && nextSelection.pageId !== activePage?.id) {
    onActivePageChange(nextSelection.pageId);
  }
  setPendingBuildSelection({ requestId, selection: nextSelection, intent });
  return awaitSelectionReveal(requestId);
}
```

Use an effect keyed by `activePage.id` and the pending request to apply selection only after the destination Page is active. Resolve superseded requests `false`; resolve the current request only after `BuildWorkspace` reports reveal completion.

- [ ] **Step 5: Reveal canonical targets in BuildWorkspace**

Remove the current `chooseSelection` behavior that separately calls `onSelectionChange` and `onActivePageChange`. Project the renderer callback directly.

For each `revealRequest`, query the canonical target after commit:

```js
const selector = selection.kind === "section"
  ? `[data-canonical-section-id="${CSS.escape(selection.sectionId)}"]`
  : selection.kind === "chart"
    ? `[data-canonical-placement-id="${CSS.escape(selection.placementId)}"]`
    : `[data-canonical-canvas-id="${CSS.escape(selection.pageId)}"]`;
```

Call `scrollIntoView({ block: "center", behavior })`, where behavior is `"auto"` under `prefers-reduced-motion: reduce` and `"smooth"` otherwise. Confirm intersection before `onRevealComplete`.

- [ ] **Step 6: Persist inline Page, Section, and Chart renames**

Wire `BuildStructureRail.onRename` to a renderer function:

```js
async function renameBuildSelection(selection, value) {
  const title = value.trim();
  if (!title) return false;
  await pendingEdits.flush();
  if (selection.kind === "page") changePage(selection.pageId, { label: title });
  if (selection.kind === "section") changeSectionByIds(selection.pageId, selection.sectionId, { title });
  if (selection.kind === "chart") await renameChart(selection.placementId, title);
  return true;
}
```

`renameChart` must run through `performModeratorOperation("rename-chart", ...)` and `onChartSave` with the complete existing Chart plus the changed title and current Time Groups. Do not create a partial Chart config.

Remove the canvas-owned click-to-rename state from `BuildSectionHeader`; the canvas title becomes a selected/highlighted display target, while all Page/Section/Chart renaming lives in the Structure tree.

- [ ] **Step 7: Run Task 3 GREEN checks**

```bash
node --test tests/buildStructureControls.test.js
pnpm exec playwright test tests/e2e/v3-build-structure-packages.spec.js --project=chromium --grep "cross-page tree selection|double-click rename"
pnpm exec playwright test tests/e2e/v3-shell-fidelity.spec.js --project=chromium --grep "exact View Build geometry"
```

Expected: all focused checks PASS, cross-page targets reveal before Unit Orbit, rename intent remains selected without opening Unit Orbit, and every exact geometry delta is `0.00`.

- [ ] **Step 8: Stage dirty existing files hunk-by-hunk and commit Task 3**

Use `git add -p` for the three pre-existing dirty files and verify the cached diff contains only Task 3 hunks:

```bash
git add -p src/components/build/BuildWorkspace.jsx src/components/DashboardRenderer.jsx
git add src/components/dashboard/DashboardCanvas.jsx src/styles/modes.css tests/buildStructureControls.test.js tests/e2e/v3-build-structure-packages.spec.js
git diff --cached --check
git diff --cached
git commit -m "fix(build): coordinate tree navigation and rename"
```

---

### Task 4: Add authored-content dirty classification and safe package import/export

**Files:**
- Create: `src/components/build/buildDirtyState.js`
- Create: `src/lib/dashboardPackageCandidate.js`
- Create: `src/components/build/DashboardPackageReviewDialog.jsx`
- Create: `tests/buildDirtyState.test.js`
- Create: `tests/dashboardPackageCandidate.test.js`
- Modify: `src/lib/dashboardCommitController.js`
- Modify: `src/components/chart-authoring/ChartEditorV3.jsx`
- Modify: `src/components/chart-authoring/ChartWizardV3.jsx`
- Modify: `src/components/build/BuildWorkspace.jsx` (stage only Task 4 hunks)
- Modify: `src/components/DashboardRenderer.jsx` (stage only Task 4 hunks)
- Modify: `src/App.jsx` (stage only Task 4 hunks)
- Modify: `src/styles/modes.css`
- Modify: `tests/chartAuthoringComponentsV3.test.js`
- Modify: `tests/applicationRecovery.test.js`
- Extend: `tests/e2e/v3-build-structure-packages.spec.js`

**Interfaces:**
- Produces: `createBuildDirtyState()`, `hasUnsavedAuthoredContent(state)`, and exact boolean keys `chartEditor`, `chartWizard`, `inlineRename`, `pendingContent`, `timeGroup`, `scene`, `dashboardMetadata`.
- Produces: `parseDashboardPackageCandidate(text) => { config, exportedAt, summary }`.
- Produces: `summary.pages[].sections[].panels[]` records for review UI.
- Produces: `onDirtyChange(boolean)` from Chart editor/wizard.
- Consumes: existing `parseDashboardBundle`, `serializeDashboardBundle`, and App commit boundary.

- [ ] **Step 1: Write RED dirty-classification tests**

Create `tests/buildDirtyState.test.js` with literal cases:

```js
assert.equal(hasUnsavedAuthoredContent(createBuildDirtyState()), false);
for (const key of [
  "chartEditor", "chartWizard", "inlineRename", "pendingContent",
  "timeGroup", "scene", "dashboardMetadata",
]) {
  assert.equal(hasUnsavedAuthoredContent({ ...createBuildDirtyState(), [key]: true }), true);
}
assert.equal(hasUnsavedAuthoredContent({
  ...createBuildDirtyState(),
  appearance: true,
  colorProfile: true,
  palette: true,
}), false);
```

The mutation caught is any accidental inclusion of cosmetic keys or omission of an authored-content key.

- [ ] **Step 2: Write RED package candidate tests**

Create a literal V3 bundle with `metadata.exportedAt = "2026-08-21T09:10:11.000Z"`, two Pages, nested Sections, and Panels. Assert:

```js
assert.equal(candidate.exportedAt, "2026-08-21T09:10:11.000Z");
assert.deepEqual(candidate.summary.pages, [{
  id: "home",
  name: "Home",
  sections: [{
    id: "overview",
    name: "Overview",
    panels: [{ id: "cases_panel", chartId: "cases", name: "Cases" }],
  }],
}]);
```

Add a raw valid V3 config case expecting `exportedAt === null`, and an invalid bundle case expecting the existing validation error.

- [ ] **Step 3: Write RED Chart editor/wizard dirty tests**

In `tests/chartAuthoringComponentsV3.test.js`, assert `isChartEditorStateDirty(createChartEditorState(...)) === false`, one `updateChart` action makes it true, and `acceptEditorSave` makes it false.

In the same file, assert an opened initial wizard reports false, selecting/changing its first authored field reports true, and a reset/close returns false.

- [ ] **Step 4: Run Task 4 unit RED checks**

```bash
node --test tests/buildDirtyState.test.js tests/dashboardPackageCandidate.test.js tests/chartAuthoringComponentsV3.test.js
```

Expected: FAIL because the dirty classifier, candidate parser, and dirty reporters do not exist.

- [ ] **Step 5: Implement the pure dirty and package helpers**

`buildDirtyState.js` must inspect only the seven approved authored-content keys. Unknown keys are ignored so appearance state cannot accidentally enter the warning.

`dashboardPackageCandidate.js` must:

1. `JSON.parse(text)` only to retain `metadata.exportedAt` when present.
2. Call `parseDashboardBundle(text)` for authoritative V3 validation and normalized config.
3. Build frozen review records without mutating `config`.
4. Resolve names with `label ?? title ?? id` for Pages, `title ?? id` for Sections, and `(placement.chart ?? placement).title ?? id` for Panels.

- [ ] **Step 6: Expose real pending and authoring dirty signals**

Add `hasPending()` to `createDebouncedDashboardEdits`; it returns whether its pending edit map is non-empty and has no side effects.

Export `isChartEditorStateDirty(state)` from `ChartEditorV3.jsx` by structurally comparing `draft/timeSyncGroups` with `savedChart/savedTimeSyncGroups`. Call `onDirtyChange` in an effect and reset it on unmount.

In `ChartWizardV3.jsx`, report dirty only when the open wizard has changed authored fields or local/manual data. Opening the initial empty wizard reports false; reset/close/unmount reports false.

- [ ] **Step 7: Aggregate dirty state and add first import confirmation**

In `DashboardRenderer.jsx`, aggregate:

```js
const authoredDirty = hasUnsavedAuthoredContent({
  ...createBuildDirtyState(),
  chartEditor: chartEditorDirty,
  chartWizard: chartWizardDirty,
  inlineRename: inlineRenameDirty,
  pendingContent: pendingEdits.hasPending(),
  timeGroup: externalDirty.timeGroup,
  scene: externalDirty.scene,
  dashboardMetadata: externalDirty.dashboardMetadata,
});
```

Initialize `externalDirty` with all three values `false` and expose a narrow `setAuthoredDirtyFlag(key, dirty)` callback for authored editors. The current Time Group controls persist directly and the Scene composer lives in Present, so they remain false unless a changed-but-unpersisted authoring surface explicitly reports otherwise. Do not pass theme projection or look state into this object.

Project Import/Export callbacks into `BuildWorkspace`. Import remains clickable while an editor is dirty. If `authoredDirty` is true, show the first `ConfirmDialog` with exact message `Unsaved changes to this dashboard will be lost.` Confirm opens the hidden JSON file input; cancel leaves all state untouched. When false, open the picker directly.

Export flushes pending edits and the persistence boundary. If Chart editor or wizard is dirty, show `Save or cancel the changed chart before exporting a dashboard package.` and do not download.

- [ ] **Step 8: Inspect packages in App without replacing the dashboard**

Replace the current direct-import path in `src/App.jsx` with these responsibilities:

```js
async function inspectImportPackage(file) {
  const candidate = parseDashboardPackageCandidate(await file.text());
  setPackageImportCandidate(candidate);
  return candidate;
}

async function confirmImportPackage() {
  const committed = await commitConfiguration(packageImportCandidate.config);
  setPackageImportCandidate(null);
  return committed;
}
```

Keep a failed candidate available only when load persistence fails; parse/validation failures never set it. Pass candidate, confirm, and cancel into `DashboardPackageReviewDialog` rendered at App level.

- [ ] **Step 9: Render the second package review**

`DashboardPackageReviewDialog.jsx` must use the existing modal focus/confirmation conventions and render:

```jsx
<time dateTime={candidate.exportedAt ?? undefined}>
  {candidate.exportedAt ? formatPackageTimestamp(candidate.exportedAt) : "Creation date unavailable"}
</time>
```

Render a nested semantic list of every Page, Section, and Panel/Chart. Buttons are exactly `Load package` and `Cancel`. Do not expose dashboard mutation callbacks to list rows.

- [ ] **Step 10: Add style-aware Build controls**

Add visible-text `Import package` and `Export package` buttons to the Build command area using existing `shell.import` and `shell.export` SimEx icons. Style them exclusively with selected dashboard tokens and retain 44px targets and 3px focus.

Update `tests/applicationRecovery.test.js` to expect these Build controls while retaining recovery-mode package behavior.

- [ ] **Step 11: Run Task 4 unit GREEN checks**

```bash
node --test tests/buildDirtyState.test.js tests/dashboardPackageCandidate.test.js tests/chartAuthoringComponentsV3.test.js tests/applicationRecovery.test.js
```

Expected: all tests PASS.

- [ ] **Step 12: Add and run the focused two-confirmation browser flow**

Extend `tests/e2e/v3-build-structure-packages.spec.js` to prove:

1. Cosmetic look/profile change followed by Import opens the picker without the discard confirmation.
2. A changed inline rename, Chart editor, wizard, metadata field, and pending Page/Section field each produce the first warning.
3. Cancelling the first warning preserves the field value, active Page, selection, and open editor.
4. Confirming and uploading a valid fixture opens the second review with literal timestamp and nested Page/Section/Panel names.
5. Cancelling the second review preserves the current dashboard.
6. Load package changes the visible Page list only after final confirmation.

Run:

```bash
pnpm exec playwright test tests/e2e/v3-build-structure-packages.spec.js --project=chromium --grep "package import"
```

Expected: PASS.

- [ ] **Step 13: Run the proportional completion checks**

```bash
node --test tests/buildTreeInteraction.test.js tests/buildStructureControls.test.js tests/buildDirtyState.test.js tests/dashboardPackageCandidate.test.js tests/chartAuthoringComponentsV3.test.js tests/applicationRecovery.test.js
pnpm exec playwright test tests/e2e/v3-build-structure-packages.spec.js --project=chromium
pnpm exec playwright test tests/e2e/v3-shell-fidelity.spec.js --project=chromium --grep "exact View Build geometry"
pnpm build
git diff --check
```

Decision gates:

- If the focused suite proves all requested flows and the exact geometry check stays `0.00`, do not add broader redundant test passes.
- If any generated build step touches a pre-existing dirty path, do not stage it unless the cached hunk is explicitly part of this plan.

- [ ] **Step 14: Stage dirty existing files hunk-by-hunk and commit Task 4**

```bash
git add -p src/App.jsx src/components/DashboardRenderer.jsx src/components/build/BuildWorkspace.jsx
git add src/components/build/buildDirtyState.js src/lib/dashboardPackageCandidate.js src/components/build/DashboardPackageReviewDialog.jsx src/lib/dashboardCommitController.js src/components/chart-authoring/ChartEditorV3.jsx src/components/chart-authoring/ChartWizardV3.jsx src/styles/modes.css tests/buildDirtyState.test.js tests/dashboardPackageCandidate.test.js tests/chartAuthoringComponentsV3.test.js tests/applicationRecovery.test.js tests/e2e/v3-build-structure-packages.spec.js
git diff --cached --check
git diff --cached
git commit -m "feat(build): add safe dashboard package controls"
```

---

## Final Handoff Evidence

Return:

- Commits mapped to Tasks 1–4.
- Files changed, calling out any hunk-staged pre-existing dirty files.
- Focused unit, browser, exact geometry, and build results.
- Evidence that cross-page Chart selection navigates/reveals before Unit Orbit opens.
- Evidence that double-click keeps the destination selected/highlighted while renaming.
- Evidence that cosmetic appearance changes skip the first warning while each approved dirty content category triggers it.
- Package review evidence with creation timestamp and full nested Page/Section/Panel summary.
- Final Git status and exact preserved-dirty-boundary comparison.
- Deviations, unresolved blockers, or material design decisions.
- No push and no declaration of acceptance; submit for user review.
