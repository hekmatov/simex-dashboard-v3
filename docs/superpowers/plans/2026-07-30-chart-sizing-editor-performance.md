# Chart Sizing and Editor Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make charts fill dashboard and fullscreen panels, make the visible range selector independently optional, and reduce edit-panel memory and latency.

**Architecture:** Establish one flexible-height contract from panel to ECharts host, centralize ECharts zoom-control generation, and introduce an editor-active suspension path for underlying canvases. Reuse prepared chart data in the editor preview and exclude runtime datasets from edit baselines.

**Tech Stack:** React 19, ECharts 5, Vite, schema-generated version-3 chart forms, CSS Grid.

## Global Constraints

- Work only in `C:\Users\hekma\Documents\SimEx Dashboard\.worktrees\simex-dashboard-v2\chart-wizard-integration`.
- Do not read from or write to OneDrive.
- Do not modify the existing showcase worktree.
- Do not merge, push, deploy, or update Cloudflare.
- Do not run automated tests, builds, linting, type checks, or regression checks until the user approves the visual result.
- Preserve saved-chart semantics; visible range selectors default to hidden when not explicitly configured.

---

### Task 1: Flexible Chart Height Contract

**Files:**
- Modify: `src/components/ChartPanel.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: existing `ChartPanel` edit and multi-select state.
- Produces: `chart-panel-has-actions` state class and a continuous flexible-height CSS chain.

- [ ] **Step 1: Mark panels that reserve an action row**

Add `chart-panel-has-actions` to the panel class list only when `editMode` or
`multiSelectMode` is active.

- [ ] **Step 2: Define the dashboard height chain**

Set normal chart panels to `grid-template-rows: minmax(0, 1fr)`, action-bearing
panels to `auto minmax(0, 1fr)`, and make `.chart-view-frame`,
`.chart-zoom-guard`, `.chart-echarts-view`, and `.chart-echarts-host` fill the
available block size with `min-height: 0`.

- [ ] **Step 3: Define the fullscreen height chain**

Make `.multi-fullscreen-cell` a one-row grid and apply the same full-height
frame, zoom-guard, view, and host contract inside fullscreen cells.

- [ ] **Step 4: Preserve intrinsic chart families**

Limit forced host filling to ECharts views. Keep cards, target collections,
tables, and images governed by their existing intrinsic overflow rules.

---

### Task 2: Independent Range Selector Contract

**Files:**
- Create: `src/charting/rendering/zoomOptions.js`
- Modify: `src/charting/config/chartConfigV3.js`
- Modify: `src/charting/forms/formModel.js`
- Modify: `src/charting/rendering/axisAdapter.js`
- Modify: `src/charting/rendering/relationshipAdapter.js`
- Modify: `src/charting/rendering/timelineAdapter.js`

**Interfaces:**
- Consumes: `chart.interaction.zoom.enabled` and optional
  `chart.interaction.zoom.rangeSelector`.
- Produces: `buildEChartsDataZoom(chart, axis)` and
  `rangeSelectorVisible(chart)`.

- [ ] **Step 1: Extend the zoom configuration**

Allow `interaction.zoom.rangeSelector` as an optional boolean. New chart
instances materialize it as `false`; normalized existing charts preserve an
explicit value and otherwise behave as `false`.

- [ ] **Step 2: Add the schema-generated form control**

When the selected schema supports zoom, show “Show range selector” beneath the
Zoom toggle only while zoom is enabled. Bind it to
`["interaction", "zoom", "rangeSelector"]`.

- [ ] **Step 3: Centralize ECharts zoom options**

Implement `buildEChartsDataZoom(chart, axis)` so enabled zoom always returns the
inside Ctrl+wheel controller and appends a slider only when
`rangeSelector === true`.

- [ ] **Step 4: Adopt the centralized option**

Replace duplicated `dataZoom` arrays in axis, relationship, and timeline
adapters. Reduce grid bottom spacing when the visible slider is absent so the
plot receives the reclaimed vertical space.

---

### Task 3: Suspend Underlying Charts During Authoring

**Files:**
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/components/ChartPanel.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: existing `chartAuthoringActive`.
- Produces: `ChartPanel` boolean prop `suspended` and a lightweight suspended
  placeholder.

- [ ] **Step 1: Propagate authoring activity**

Pass `suspended={chartAuthoringActive}` to every dashboard `ChartPanel`.

- [ ] **Step 2: Unmount chart canvases while suspended**

When `suspended` is true, render a lightweight neutral placeholder instead of
`ChartView`, regardless of prior intersection visibility. This must unmount
ECharts views so their lifecycle disposes canvas instances.

- [ ] **Step 3: Remove GPU backdrop blur**

Remove `backdrop-filter` from `.chart-editor-backdrop` and retain the approved
translucent dimming veil.

---

### Task 4: Eliminate Editor Data Duplication

**Files:**
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/charting/rendering/resolveChartRendering.js`
- Modify: `src/components/chart-authoring/ChartPreview.jsx`
- Modify: `src/components/chart-authoring/ChartEditorV3.jsx`

**Interfaces:**
- Consumes: prepared chart data returned by `createEditorPreparation`.
- Produces: `resolvePreparedChartRendering(input, prepared)` and optional
  `ChartPreview` prop `prepared`.

- [ ] **Step 1: Exclude runtime data before cloning**

In `dashboardWithCurrentDrafts`, remove `loadedData` from the object before
calling `structuredClone`. Preserve pages, data-source descriptors, profiles,
styles, and time-sync configuration so cancel and export behavior remain
unchanged.

- [ ] **Step 2: Add a prepared-render resolver**

Export `resolvePreparedChartRendering(input, prepared)` from
`resolveChartRendering.js`. It validates the supplied prepared state, builds the
render model without calling `prepareChartData`, and returns the same resolution
shape consumed by `ChartView`.

- [ ] **Step 3: Reuse preparation in ChartPreview**

Accept an optional `prepared` prop. When supplied, skip `prepareChartData`, build
one resolved rendering through `resolvePreparedChartRendering`, and pass it to
`ChartView` as `resolvedRendering`.

- [ ] **Step 4: Memoize editor preparation**

Wrap `createEditorPreparation` with `React.useMemo` using the draft chart, rows,
profile, and selected geography as dependencies. Pass that prepared result to
`ChartPreview`.

---

### Task 5: Visual Handoff

**Files:**
- No source changes required.

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: a live dashboard ready for the user’s manual inspection.

- [ ] **Step 1: Preserve the current uncommitted visual iteration**

Do not commit runtime source changes until the user accepts the visual result.

- [ ] **Step 2: Hand off the live page**

Ask the user to inspect standard panels, tall panels, single and multi-chart
fullscreen, the Interactions tab’s range-selector toggle, and editor opening,
scrolling, and memory behavior.

- [ ] **Step 3: Defer verification**

Run no automated verification. Record any visual feedback as the next iteration.
