# Scene Composition Runtime Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Scene Studio Stage 3 render actual charts in the exact Scene View and Present arrangements that saved Scenes produce at runtime.

**Architecture:** Introduce one shared four-column Scene View composition renderer used by Stage 3 and live View, while Stage 3 Present reuses the production displayed-chart grid through one Scene-to-runtime layout adapter. Scene selection atomically seeds Present/Audience from the saved Scene once; authoring overlays remain separate from the shared chart renderers and never appear at runtime.

**Tech Stack:** React 19, JavaScript ES modules, CSS Grid, existing `ChartView`, `DisplayedChartGrid`, playback/temporal engines, Node test runner, React server rendering, Playwright, Vite.

**Spec:** `docs/superpowers/specs/2026-08-24-scene-composition-runtime-preview-design.md`

## Global Constraints

- Stage 3 must render real configured charts and real dashboard data; thumbnails, facsimiles, and placeholder chart cards do not satisfy the design.
- `scene.members` owns Scene View order and one-to-four-column widths; canonical chart row height remains read-only and canonical dashboard layout is never mutated.
- `scene.present.chartIds` and `scene.present.layout` own the saved Present projection; moderator changes after Scene application remain session-only.
- View and Present contain no Scene authoring chrome.
- Preview time uses the latest valid authored Scene frame and the same matching/reveal engines as playback without starting or mutating a playback session.
- Actual rendering consumes prepared derivatives and existing caches; it must not repeat invariant raw-source preparation.
- Existing three-stage Scene lifecycle, atomic save, failure retention, discard, restoration, and Step 6 persistence wording remain binding.
- Phone Build/Present boundaries and Step 8 Present/Audience redesign remain out of scope.

## File structure

- Create `src/components/time/scenePresentLayout.js` — pure Scene-layout to display-layout adapter.
- Create `src/components/time/scenePreviewTime.js` — deterministic latest-frame and per-chart preview-context derivation.
- Create `src/components/time/SceneViewCompositionGrid.jsx` — shared actual-chart four-column Scene renderer.
- Create `src/components/time/SceneCompositionAuthoringOverlay.jsx` — Stage 3-only chart selection, drag, insertion, and Present membership chrome.
- Modify `src/components/time/BalancedTwinCanvas.jsx` — coordinate shared Scene View/Present renderers and Unit Orbit.
- Modify `src/components/time/SceneEditor.jsx` — pass dashboard and preview facts into Stage 3.
- Modify `src/components/build/BuildWorkspace.jsx` — supply the canonical dashboard to Scene authoring.
- Modify `src/components/dashboard/DashboardCanvas.jsx` and `src/components/dashboard/DashboardModeWorkspace.jsx` — use the shared Scene renderer for active-Scene View.
- Modify `src/components/display/DisplayedChartGrid.jsx` and `src/styles/presentation.css` — expose the production presentation-layout grammar to both Audience and Stage 3 without mislabeling the preview as Audience.
- Modify `src/lib/displayController.js` and `src/components/DashboardRenderer.jsx` — atomically seed presentation state on explicit active-Scene transitions.
- Modify `src/styles/modes.css` and `src/styles/dashboard-style-grammar.css` — actual-chart preview sizing, shared Scene grid, and authoring overlay styling.
- Create focused tests in `tests/scenePresentLayout.test.js`, `tests/scenePreviewTime.test.js`, and `tests/sceneViewComposition.test.js`; modify existing Scene, display, View, Present, and browser tests.

---

### Task 1: Define the Scene-to-Present layout and atomic display-state contract

**Files:**
- Create: `src/components/time/scenePresentLayout.js`
- Modify: `src/lib/displayController.js`
- Create: `tests/scenePresentLayout.test.js`
- Modify: `tests/displayController.test.js`

**Interfaces:**
- Produces: `scenePresentLayoutToDisplayLayout(sceneLayout, chartCount) -> string`.
- Produces: display action `{ type: "scene_applied", chart_ids: string[], layout: string }`.
- Consumes: existing `reduceDisplayState(state, action, validChartIds)` validation and frozen-state contract.

- [ ] **Step 1: Write failing layout-adapter tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { scenePresentLayoutToDisplayLayout } from "../src/components/time/scenePresentLayout.js";

const cases = [
  ["single", 1, "solo"],
  ["vertical-divider", 2, "sideBySide"],
  ["horizontal-divider", 2, "overUnder"],
  ["large-left", 3, "leftFocus"],
  ["large-top", 3, "topFocus"],
  ["grid-2x2", 4, "grid2x2"],
];

for (const [sceneLayout, count, expected] of cases) {
  test(`${sceneLayout} maps to ${expected}`, () => {
    assert.equal(scenePresentLayoutToDisplayLayout(sceneLayout, count), expected);
  });
}

test("layout mapping rejects a layout that is invalid for the chart count", () => {
  assert.throws(
    () => scenePresentLayoutToDisplayLayout("grid-2x2", 2),
    /unsupported/i,
  );
});
```

- [ ] **Step 2: Run the adapter test and confirm the missing-module failure**

Run: `node --test tests/scenePresentLayout.test.js`

Expected: FAIL because `scenePresentLayout.js` does not exist.

- [ ] **Step 3: Implement the pure validated adapter**

```js
const DISPLAY_LAYOUT_BY_SCENE_LAYOUT = Object.freeze({
  single: Object.freeze({ count: 1, layout: "solo" }),
  "vertical-divider": Object.freeze({ count: 2, layout: "sideBySide" }),
  "horizontal-divider": Object.freeze({ count: 2, layout: "overUnder" }),
  "large-left": Object.freeze({ count: 3, layout: "leftFocus" }),
  "large-top": Object.freeze({ count: 3, layout: "topFocus" }),
  "grid-2x2": Object.freeze({ count: 4, layout: "grid2x2" }),
});

export function scenePresentLayoutToDisplayLayout(sceneLayout, chartCount) {
  const mapping = DISPLAY_LAYOUT_BY_SCENE_LAYOUT[sceneLayout];
  if (!mapping || mapping.count !== chartCount) {
    throw new Error(`Scene Present layout "${String(sceneLayout)}" is unsupported for ${chartCount} charts.`);
  }
  return mapping.layout;
}
```

- [ ] **Step 4: Write the failing atomic display-action test**

Add to `tests/displayController.test.js`:

```js
test("scene_applied atomically replaces chart order and layout", () => {
  const start = initialDisplayState();
  const next = reduceDisplayState(start, {
    type: "scene_applied",
    chart_ids: ["chart-c", "chart-a"],
    layout: "overUnder",
  }, new Set(["chart-a", "chart-b", "chart-c"]));

  assert.deepEqual(next.displayed_chart_ids, ["chart-c", "chart-a"]);
  assert.equal(next.layout, "overUnder");
  assert.equal(next.display_revision, 1);
});
```

- [ ] **Step 5: Run the display reducer test and confirm the invalid-action failure**

Run: `node --test tests/displayController.test.js --test-name-pattern="scene_applied"`

Expected: FAIL with `invalid_action`.

- [ ] **Step 6: Implement `scene_applied` as one validated revision**

Add a reducer case that validates one-to-four known unique chart IDs, validates `action.layout` against `LAYOUTS_BY_COUNT[chartIds.length]`, returns the existing state when order and layout are already identical, and otherwise returns one frozen state with `display_revision + 1`.

```js
case "scene_applied": {
  const chartIds = validatedChartIds(action.chart_ids, { minimum: 1, validIds });
  const allowedLayouts = LAYOUTS_BY_COUNT[chartIds.length];
  if (!allowedLayouts.includes(action.layout)) throw new DisplayStateError("invalid_layout");
  if (sameItems(chartIds, state.displayed_chart_ids) && state.layout === action.layout) return state;
  return freezeState({
    display_revision: state.display_revision + 1,
    displayed_chart_ids: chartIds,
    layout: action.layout,
  });
}
```

- [ ] **Step 7: Run focused tests and commit**

Run: `node --test tests/scenePresentLayout.test.js tests/displayController.test.js`

Expected: PASS.

```bash
git add src/components/time/scenePresentLayout.js src/lib/displayController.js tests/scenePresentLayout.test.js tests/displayController.test.js
git commit -m "feat(scene): map saved scenes to presentation layouts"
```

---

### Task 2: Build the shared actual-chart Scene View composition renderer

**Files:**
- Create: `src/components/time/SceneViewCompositionGrid.jsx`
- Modify: `src/components/dashboard/DashboardCanvas.jsx`
- Modify: `src/components/dashboard/DashboardModeWorkspace.jsx`
- Modify: `src/styles/modes.css`
- Modify: `src/styles/dashboard-style-grammar.css`
- Create: `tests/sceneViewComposition.test.js`
- Modify: `tests/playbackComponentsV3.test.js`

**Interfaces:**
- Consumes: `dashboard`, `scene`, `timeContextForChart(chartId)`, `surface`.
- Produces: `<SceneViewCompositionGrid dashboard scene timeContextForChart surface renderCellChrome />`.
- Produces: chart cells with `data-scene-chart-id`, `data-scene-width`, `data-scene-row-height`, and CSS variables `--scene-chart-width`, `--scene-chart-height`.
- Consumes later: Task 3 authoring overlay through `renderCellChrome({ chart, member, index })`.

- [ ] **Step 1: Write a failing production-renderer composition test**

Create a server-rendered test that supplies three canonical charts with member order `chart-c`, `chart-a`, `chart-b`, widths `4`, `1`, `3`, and canonical heights `1`, `2`, `1`.

```js
test("Scene View composition renders actual chart roots in authored order and width", () => {
  const html = renderToStaticMarkup(React.createElement(SceneViewCompositionGrid, {
    dashboard,
    scene: {
      members: [
        { chartId: "chart-c", width: 4 },
        { chartId: "chart-a", width: 1 },
        { chartId: "chart-b", width: 3 },
      ],
    },
    timeContextForChart: (chartId) => ({ groupId: "group-a", activeEpochMs: 100, matching: { policy: "exact" }, sceneId: "scene-a", chartId }),
    surface: "scene-preview",
  }));

  assert.deepEqual(
    [...html.matchAll(/data-scene-chart-id="([^"]+)"/g)].map((match) => match[1]),
    ["chart-c", "chart-a", "chart-b"],
  );
  assert.match(html, /data-scene-width="4"/);
  assert.match(html, /chart-view-frame|chart-echarts-view|chart-card-view/);
  assert.doesNotMatch(html, /Chart loads when it enters the viewport/);
});
```

- [ ] **Step 2: Run the test and confirm the missing-component failure**

Run: `node --test tests/sceneViewComposition.test.js`

Expected: FAIL because `SceneViewCompositionGrid.jsx` does not exist.

- [ ] **Step 3: Implement the shared Scene grid with real `ChartView` inputs**

Resolve each chart from canonical dashboard pages and sections. Render actual `ChartView` instances with the same data, source state, profile, map data, accessibility, render context, and time context inputs used by production panels.

```jsx
export default function SceneViewCompositionGrid({
  dashboard,
  scene,
  timeContextForChart = () => null,
  surface = "view-scene",
  renderCellChrome,
}) {
  const chartsById = configuredChartsById(dashboard);
  return (
    <div className="scene-view-composition-grid" data-scene-composition-surface={surface}>
      {(scene?.members ?? []).map((member, index) => {
        const chart = chartsById.get(member.chartId);
        if (!chart) return <MissingSceneChartCell key={member.chartId} member={member} />;
        const height = resolveChartFootprint(chart.layout).rows;
        return (
          <section
            className="scene-view-composition-cell"
            data-scene-chart-id={chart.id}
            data-scene-width={member.width}
            data-scene-row-height={height}
            style={{ "--scene-chart-width": member.width, "--scene-chart-height": height }}
            key={chart.id}
          >
            {renderCellChrome?.({ chart, member, index })}
            <ChartView /* pass canonical runtime inputs */ />
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Add four-column grid CSS and runtime style inheritance**

```css
.scene-view-composition-grid {
  display: grid;
  gap: 16px;
  grid-auto-rows: var(--scene-canonical-row-height, 418px);
  grid-template-columns: repeat(4, minmax(0, 1fr));
  min-width: 0;
}

.scene-view-composition-cell {
  grid-column: span var(--scene-chart-width);
  grid-row: span var(--scene-chart-height);
  min-width: 0;
}
```

Use the established dashboard surface, panel, plot, radius, border, and shadow tokens. Do not introduce hard-coded preview colours.
Keep the canonical 418 px dashboard row height in View and expose the same value through the shared component's CSS custom property. Stage 3 may scale the whole preview composition to fit its bounded canvas, but it must not independently change chart aspect ratios or member spans. Use a container query on the shared component so equal effective widths receive equal stacking behavior in Stage 3 and View.

- [ ] **Step 5: Write the failing live View integration test**

Extend `tests/playbackComponentsV3.test.js` so an active Scene with noncanonical order and widths renders `DashboardCanvas` through `DashboardModeWorkspace` and asserts `scene-view-composition-grid` plus the authored cell sequence. Also assert the ordinary `LayoutGrid` remains for a Chrono Group without an active Scene.

- [ ] **Step 6: Wire active Scene into `DashboardModeWorkspace` and `DashboardCanvas`**

Extend `chronoSection` with `scene: playback.activeScene` and `timeContextForChart: playback.timeContextForChart`. In `DashboardCanvas`, use `SceneViewCompositionGrid` only when `chronoSection.scene` exists; retain the current canonical placement grid for group/default playback.

```jsx
{chronoSection.scene ? (
  <SceneViewCompositionGrid
    dashboard={dashboard}
    scene={chronoSection.scene}
    timeContextForChart={chronoSection.timeContextForChart}
    surface="view-scene"
  />
) : (
  <LayoutGrid>{/* existing Chrono Group placements */}</LayoutGrid>
)}
```

- [ ] **Step 7: Run focused tests and commit**

Run: `node --test tests/sceneViewComposition.test.js tests/playbackComponentsV3.test.js`

Expected: PASS with active-Scene View using the shared renderer and group playback unchanged.

```bash
git add src/components/time/SceneViewCompositionGrid.jsx src/components/dashboard/DashboardCanvas.jsx src/components/dashboard/DashboardModeWorkspace.jsx src/styles/modes.css src/styles/dashboard-style-grammar.css tests/sceneViewComposition.test.js tests/playbackComponentsV3.test.js
git commit -m "feat(scene): render saved scene composition in view"
```

---

### Task 3: Replace Stage 3 placeholders with real Scene View and Present charts

**Files:**
- Create: `src/components/time/scenePreviewTime.js`
- Create: `src/components/time/SceneCompositionAuthoringOverlay.jsx`
- Modify: `src/components/time/BalancedTwinCanvas.jsx`
- Modify: `src/components/time/SceneEditor.jsx`
- Modify: `src/components/build/BuildWorkspace.jsx`
- Modify: `src/components/display/DisplayedChartGrid.jsx`
- Modify: `src/styles/modes.css`
- Modify: `src/styles/presentation.css`
- Create: `tests/scenePreviewTime.test.js`
- Modify: `tests/chronoSceneComposition.test.js`
- Modify: `tests/chronoSceneFidelity.test.js`

**Interfaces:**
- Consumes: Task 1 `scenePresentLayoutToDisplayLayout`.
- Consumes: Task 2 `SceneViewCompositionGrid` and `renderCellChrome` hook.
- Produces: `buildScenePreviewProjection({ dashboard, scene }) -> { activeEpochMs, label, timeContexts, error }`.
- Produces: `DisplayedChartGrid` prop `layoutSystem="presentation"` so Audience and authoring preview share layout CSS without sharing surface semantics.

- [ ] **Step 1: Write failing preview-time tests**

Cover source-frame and calendar Scenes. Use a Chrono Group with known observations and assert the latest valid Scene frame, formatted label, and member-specific matching contexts.

```js
test("preview projection uses the latest authored Scene frame without mutating playback", () => {
  const projection = buildScenePreviewProjection({ dashboard, scene });
  assert.equal(projection.activeEpochMs, MAY_3);
  assert.equal(projection.label, "2027-05-03");
  assert.equal(projection.timeContexts["chart-a"].sceneId, scene.id);
  assert.equal(projection.timeContexts["chart-a"].activeEpochMs, MAY_3);
});

test("preview projection reports a Scene with no valid frame", () => {
  const projection = buildScenePreviewProjection({ dashboard, scene: invalidFrameScene });
  assert.equal(projection.activeEpochMs, null);
  assert.match(projection.error, /no valid preview frame/i);
});
```

- [ ] **Step 2: Run preview-time tests and confirm the missing-module failure**

Run: `node --test tests/scenePreviewTime.test.js`

Expected: FAIL because `scenePreviewTime.js` does not exist.

- [ ] **Step 3: Implement preview projection from existing temporal engines**

Use `buildChronoGroupClock`, `buildScenePlaybackClock`, and `buildMemberTimeContexts`. Select `sceneClock.at(-1) ?? null`; never dispatch playback actions.

```js
export function buildScenePreviewProjection({ dashboard, scene }) {
  const group = (dashboard.chronoGroups ?? []).find(({ id }) => id === scene?.chronoGroupId);
  const temporalContext = {
    charts: configuredCharts(dashboard),
    loadedData: dashboard.loadedData ?? {},
    profiles: dashboard.datasetProfiles ?? {},
    timezone: dashboard.timezone ?? "UTC",
  };
  try {
    const groupClock = group ? buildChronoGroupClock(group, temporalContext) : [];
    const sceneClock = group ? buildScenePlaybackClock(scene, groupClock, { group, temporalContext }) : [];
    const activeEpochMs = sceneClock.at(-1) ?? null;
    return {
      activeEpochMs,
      label: activeEpochMs === null ? null : canonicalPreviewDate(activeEpochMs, temporalContext.timezone),
      timeContexts: activeEpochMs === null ? Object.freeze({}) : buildMemberTimeContexts(group, activeEpochMs, { scene }),
      error: activeEpochMs === null ? "This Scene has no valid preview frame." : null,
    };
  } catch (error) {
    return {
      activeEpochMs: null,
      label: null,
      timeContexts: Object.freeze({}),
      error: `Scene preview unavailable: ${error.message}`,
    };
  }
}
```

Reuse the runtime's existing timezone-aware date formatter for `canonicalPreviewDate`; do not add a second date-label convention.

- [ ] **Step 4: Write failing Stage 3 composition assertions**

Update `tests/chronoSceneComposition.test.js` to assert:

```js
assert.match(html, /data-scene-composition-surface="scene-preview"/);
assert.match(html, /data-layout-system="presentation"/);
assert.match(html, /data-displayed-chart-id="chart-a"/);
assert.match(html, /Scene preview frame/);
assert.doesNotMatch(html, /<li[^>]*data-chart-id=/);
assert.doesNotMatch(html, />Included<\/span>/);
```

Retain assertions for insertion targets, title drag handles, Present membership actions, layout selection, selected outline, and Unit Orbit.

- [ ] **Step 5: Extend `DisplayedChartGrid` with shared presentation-layout semantics**

Add `layoutSystem` while retaining `surface` interaction semantics:

```jsx
<div
  className={className}
  data-display-surface={surface}
  data-layout-system={layoutSystem ?? (surface === "audience" ? "presentation" : undefined)}
>
```

Move only the grid-template and cell-fill selectors from `[data-display-surface="audience"]` to `[data-layout-system="presentation"]`. Keep Audience-only colour, passive interaction, and display-shell styling scoped to Audience.

- [ ] **Step 6: Implement the authoring overlay and real twin canvases**

`SceneCompositionAuthoringOverlay` renders the chart title handle, selected state, corner Present action, and discrete before/after insertion controls for one cell. `BalancedTwinCanvas` renders:

```jsx
<SceneViewCompositionGrid
  dashboard={dashboard}
  scene={scene}
  timeContextForChart={(chartId) => preview.timeContexts[chartId] ?? null}
  surface="scene-preview"
  renderCellChrome={(cell) => (
    <SceneCompositionAuthoringOverlay board="scene" {...cell} /* actions */ />
  )}
/>

<DisplayedChartGrid
  dashboard={dashboard}
  chartIds={scene.present.chartIds}
  layout={scenePresentLayoutToDisplayLayout(scene.present.layout, scene.present.chartIds.length)}
  layoutSystem="presentation"
  surface="scene-preview-present"
  timeContextForChart={(chartId) => preview.timeContexts[chartId] ?? null}
  getCellProps={(chart) => ({ "data-selected": selectedChartId === chart.id || undefined })}
  renderCellControls={(chart, index) => (
    <SceneCompositionAuthoringOverlay board="present" chart={chart} index={index} /* actions */ />
  )}
/>
```

Place board-level insertion boundaries outside the plot content so they remain visible and do not compress or cover chart labels. Preserve keyboard movement and Unit Orbit action types.

- [ ] **Step 7: Pass the canonical dashboard into Stage 3**

Add `dashboard` to `SceneEditor` and `BalancedTwinCanvas` props. In `BuildWorkspace`, pass the existing `dashboard` object without copying loaded data.

- [ ] **Step 8: Add responsive actual-preview CSS**

Give each board a bounded preview viewport, minimum chart plot height, and internal scrolling when necessary. Keep equal board widths on desktop and stack the two boards at the existing tablet breakpoint. Authoring chrome uses dashboard tokens and maintains 44 px activation targets.

- [ ] **Step 9: Run focused tests and commit**

Run: `node --test tests/scenePreviewTime.test.js tests/chronoSceneComposition.test.js tests/chronoSceneFidelity.test.js tests/sceneViewComposition.test.js`

Expected: PASS with actual chart roots in both Stage 3 canvases and all authoring actions retained.

```bash
git add src/components/time/scenePreviewTime.js src/components/time/SceneCompositionAuthoringOverlay.jsx src/components/time/BalancedTwinCanvas.jsx src/components/time/SceneEditor.jsx src/components/build/BuildWorkspace.jsx src/components/display/DisplayedChartGrid.jsx src/styles/modes.css src/styles/presentation.css tests/scenePreviewTime.test.js tests/chronoSceneComposition.test.js tests/chronoSceneFidelity.test.js tests/sceneViewComposition.test.js
git commit -m "feat(scene): render actual charts in composition studio"
```

---

### Task 4: Apply saved Scene Present composition once per Scene transition

**Files:**
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `tests/presentWorkspace.test.js`
- Modify: `tests/playbackComponentsV3.test.js`
- Modify: `tests/displayController.test.js`

**Interfaces:**
- Consumes: Task 1 `scenePresentLayoutToDisplayLayout` and `scene_applied`.
- Consumes: `usePlayback().activeScene` from the existing provider.
- Produces: one display action per active-Scene transition; no action for manual Present edits or ordinary mode changes.

- [ ] **Step 1: Write the failing Scene transition integration test**

Render a test bridge inside `PlaybackProvider` that mounts `DashboardRenderer`, selects `scene-a`, captures `onDisplayAction`, then simulates a manual layout change and a View/Present mode round trip.

```js
assert.deepEqual(actions[0], {
  type: "scene_applied",
  chart_ids: ["chart-b", "chart-a"],
  layout: "overUnder",
});
assert.equal(actions.filter(({ type }) => type === "scene_applied").length, 1);
```

Then select a group and reselect `scene-a`; assert a second `scene_applied` action restores the saved composition.

- [ ] **Step 2: Run the integration test and confirm no Scene action is dispatched**

Run: `node --test tests/playbackComponentsV3.test.js --test-name-pattern="saved Scene Present composition"`

Expected: FAIL because Scene transitions do not seed display state.

- [ ] **Step 3: Add one transition-scoped effect in `DashboardRenderer`**

Read `activeScene` from `usePlayback`. Track the last applied active Scene ID and Present-composition signature in a ref. Clear the ref when no Scene is active, but do not clear or overwrite the current presentation session.

```js
const playback = usePlayback();
const appliedSceneRef = React.useRef(null);

React.useEffect(() => {
  const scene = playback.activeScene;
  if (!scene) {
    appliedSceneRef.current = null;
    return;
  }
  const chartIds = scene.present?.chartIds ?? [];
  const layout = scenePresentLayoutToDisplayLayout(scene.present?.layout, chartIds.length);
  const signature = `${scene.id}:${chartIds.join(",")}:${layout}`;
  if (appliedSceneRef.current === signature) return;
  appliedSceneRef.current = signature;
  onDisplayAction?.({ type: "scene_applied", chart_ids: chartIds, layout });
}, [onDisplayAction, playback.activeScene]);
```

Do not include `displayState` or `mode` in the dependency or signature: manual Present changes and mode transitions must not reapply the saved Scene.

- [ ] **Step 4: Prove Present/Audience consume the mapped state unchanged**

Extend `tests/presentWorkspace.test.js` to render the applied state and assert chart order plus `layout-overUnder`. Retain existing Audience tests as the protocol-level proof that the same state reaches `DisplayedChartGrid`.

- [ ] **Step 5: Run focused integration tests and commit**

Run: `node --test tests/displayController.test.js tests/playbackComponentsV3.test.js tests/presentWorkspace.test.js tests/audienceDisplay.test.js`

Expected: PASS; saved Scene applies once, manual session edits survive mode changes, and reselecting after leaving the Scene reapplies it.

```bash
git add src/components/DashboardRenderer.jsx tests/displayController.test.js tests/playbackComponentsV3.test.js tests/presentWorkspace.test.js
git commit -m "feat(scene): seed present from saved scene composition"
```

---

### Task 5: Exercise the complete authoring-to-runtime journey and update Step 7 evidence

**Files:**
- Modify: `tests/e2e/v3-chrono-scene-fidelity.spec.js`
- Modify: `docs/audits/2026-08-22-v3-step-7-build-view/CHRONO-SCENE-FIDELITY-MATRIX.md`
- Modify: `docs/audits/2026-08-22-v3-step-7-build-view/SKETCH-FIDELITY-MATRIX.md`
- Modify: `docs/audits/2026-08-22-v3-step-7-build-view/MASTER-REVIEW-SUBMISSION.md`
- Modify: `docs/superpowers/plans/2026-08-19-v3-step-7-build-view.md`
- Modify: `docs/superpowers/specs/2026-08-22-chrono-authoring-reconciliation-design.md`

**Interfaces:**
- Consumes: Tasks 1–4 production behavior.
- Produces: named browser evidence and updated provisional Step 7 fidelity records.

- [ ] **Step 1: Extend the failing Sketch 006 browser journey**

In the existing `006-scene-authoring amendment` case:

1. enter Stage 3;
2. assert each canvas contains visible real chart render roots;
3. set unequal Scene widths and noncanonical order;
4. set a distinct Present subset/order/layout;
5. record Stage 3 chart IDs, grid-column spans, and cell rectangles;
6. save and activate the Scene in View;
7. compare View order and relative grid spans to Stage 3;
8. enter Present and compare displayed IDs and mapped layout class;
9. change Present layout or order, switch modes, and prove the session edit remains;
10. switch away from the Scene and back, then prove the saved Scene composition is restored; and
11. confirm `.scene-chart-authoring-overlay` is absent from View and Present.

Use concrete assertions such as:

```js
await expect(sceneBoard.locator(".chart-view-frame, .chart-echarts-view, .chart-card-view").first()).toBeVisible();
expect(authoringSceneGeometry.ids).toEqual(viewSceneGeometry.ids);
expect(authoringSceneGeometry.widths).toEqual(viewSceneGeometry.widths);
await expect(page.locator(".displayed-chart-grid[data-layout-system='presentation']")).toHaveClass(/layout-overUnder/);
await expect(page.locator(".scene-chart-authoring-overlay")).toHaveCount(0);
```

- [ ] **Step 2: Build the production bundle and run the named journey**

Run:

```bash
pnpm build
pnpm exec playwright test tests/e2e/v3-chrono-scene-fidelity.spec.js --grep "006-scene-authoring amendment"
```

Expected: production build passes; the named journey passes at desktop and the existing supported tablet checkpoint without document-level horizontal overflow.

- [ ] **Step 3: Perform one in-app visual inspection**

At `http://127.0.0.1:5176/`, inspect Stage 3, active-Scene View, and Present at 1200×900. Confirm:

- chart titles, legends, axes, map labels, and plots are visible rather than placeholder cards;
- the Scene four-column pattern is legible;
- Present divider/focus geometry matches its selected layout;
- authoring overlays remain clear of essential plot content; and
- both Stage 3 canvases remain usable without restoring the removed sidebar.

Record measured chart IDs, grid spans, representative rectangles, and any browser limitation in the fidelity matrix. Do not mark a row Passing based only on screenshot capture.

- [ ] **Step 4: Run the focused regression set**

Run:

```bash
node --test tests/scenePresentLayout.test.js tests/scenePreviewTime.test.js tests/sceneViewComposition.test.js tests/chronoSceneComposition.test.js tests/chronoSceneFidelity.test.js tests/displayController.test.js tests/playbackComponentsV3.test.js tests/presentWorkspace.test.js tests/audienceDisplay.test.js
```

Expected: PASS.

- [ ] **Step 5: Update controlling records with actual evidence**

Amend Sketch 006 rows to distinguish:

- engine implemented: shared layout mapping, preview time, and atomic display action;
- UI implemented: actual chart renderers and authoring overlays are production-wired; and
- fidelity verified: authoring/View/Present geometry and browser journey agree.

Keep the Step 7 master-review submission provisional and do not declare master acceptance.

- [ ] **Step 6: Commit evidence and documentation**

```bash
git add tests/e2e/v3-chrono-scene-fidelity.spec.js docs/audits/2026-08-22-v3-step-7-build-view/CHRONO-SCENE-FIDELITY-MATRIX.md docs/audits/2026-08-22-v3-step-7-build-view/SKETCH-FIDELITY-MATRIX.md docs/audits/2026-08-22-v3-step-7-build-view/MASTER-REVIEW-SUBMISSION.md docs/superpowers/plans/2026-08-19-v3-step-7-build-view.md docs/superpowers/specs/2026-08-22-chrono-authoring-reconciliation-design.md
git commit -m "test(scene): verify truthful runtime composition previews"
```

---

## Completion gate

- Stage 3 renders actual chart roots in both canvases.
- Stage 3 and active-Scene View use the same Scene View composition component.
- Stage 3 Present and Audience use the same presentation-layout grammar and mapped layout.
- Scene selection applies saved Present order/layout once; manual session changes survive mode switches.
- View and Present contain no authoring overlay controls.
- Focused semantic, composition, and browser tests pass.
- Production build passes.
- In-app visual inspection confirms meaningful chart and grid geometry.
- Step 7 evidence names any remaining limitation and remains provisional pending master review.
