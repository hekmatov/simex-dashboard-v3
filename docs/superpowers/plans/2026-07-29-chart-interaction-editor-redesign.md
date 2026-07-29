# Chart Interaction and Editor Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace persistent chart chrome and the sidebar editor with compact on-demand actions, a preview-first modal editor, configurable descriptions/citations, a raw CSV viewer, and a direct in-page eyedropper.

**Architecture:** Extend the version-3 chart presentation contract, then expose those fields through the existing schema-generated authoring model. Keep display concerns in reusable chart-panel and modal-shell components, and isolate raw CSV loading in a separate Vite entry so large source parsing does not block dashboard interaction.

**Tech Stack:** React 19, Vite 6, ECharts 5, Papa Parse 5, existing version-3 schema/form/rendering system.

## Global Constraints

- Work only in `C:\Users\hekma\Documents\SimEx Dashboard\.worktrees\simex-dashboard-v2\chart-wizard-integration`.
- Do not read from or write to OneDrive.
- Preserve all existing uncommitted runtime-hotfix changes.
- Do not modify the existing showcase-home worktree.
- Do not merge, push, deploy, or update the Cloudflare branch.
- Automated tests, E2E runs, builds, and regression checks remain deferred until the user approves the visual result.
- Chart descriptions default to hidden when the setting is absent.
- CSV viewing always shows the full untransformed source dataset.
- Citation edits are chart-local unless the author explicitly confirms propagation to charts with the same `sourceId`.

---

### Task 1: Extend the declarative chart presentation contract

**Files:**
- Create: `src/charting/presentation/chartCitation.js`
- Modify: `src/charting/config/chartConfigV3.js`
- Modify: `src/charting/forms/formModel.js`
- Modify: `src/components/chart-authoring/StandardField.jsx`

**Interfaces:**
- Produces: `resolveChartCitation({ chart, dataSources, datasetProfile }): string`
- Produces: `withChartCitation(chart, label): ChartConfigV3`
- Produces: `applyCitationToSourceCharts(dashboard, { sourceId, label }): { dashboard, affectedChartIds }`
- Produces: `chartDescriptionVisible(chart): boolean`
- Consumes: existing `normalizeChartInstance`, generated form sections, and immutable dashboard mutation conventions.

- [ ] **Step 1: Add strict presentation fields**

Add `description` and `citation` to `PRESENTATION_KEYS`, validate them as:

```js
optionalObject(presentation.description, "Chart presentation description", new Set(["visible"]));
if (
  presentation.description?.visible !== undefined
  && typeof presentation.description.visible !== "boolean"
) {
  throw new Error("Chart presentation description visible must be boolean.");
}
optionalObject(presentation.citation, "Chart presentation citation", new Set(["label"]));
if (
  presentation.citation?.label !== undefined
  && typeof presentation.citation.label !== "string"
) {
  throw new Error("Chart presentation citation label must be a string.");
}
```

Normalization must preserve valid values, omit an empty citation object, and treat an absent description setting as hidden.

- [ ] **Step 2: Implement citation and description helpers**

Implement deterministic helpers in `chartCitation.js`:

```js
export function chartDescriptionVisible(chart) {
  return chart?.presentation?.description?.visible === true;
}

export function resolveChartCitation({
  chart = {},
  dataSources = {},
  datasetProfile,
} = {}) {
  return nonEmpty(chart.presentation?.citation?.label)
    ?? nonEmpty(dataSources?.[chart.sourceId]?.provenance?.label)
    ?? nonEmpty(datasetProfile?.provenance?.label)
    ?? nonEmpty(chart.sourceId)
    ?? "Unavailable";
}
```

`withChartCitation` trims a non-empty label and removes the override for blank input. `applyCitationToSourceCharts` must clone the dashboard, visit wrapped and unwrapped chart placements, update matching `sourceId` charts, and return affected chart IDs.

- [ ] **Step 3: Add generated authoring fields**

Add these field descriptors:

```js
{
  id: "citation",
  label: "Source citation",
  control: "citation",
  path: ["presentation", "citation", "label"],
  value: chart.presentation?.citation?.label ?? "",
  help: "Shown from the information icon. Leave blank to inherit the data-source citation.",
}
```

Add Appearance fields for the existing `chart.description` text and the new visibility toggle:

```js
{
  id: "description",
  label: "Description",
  control: "textarea",
  path: ["description"],
  value: chart.description ?? "",
},
{
  id: "descriptionVisible",
  label: "Show description",
  control: "toggle",
  path: ["presentation", "description", "visible"],
  value: chartDescriptionVisible(chart),
}
```

Add a dedicated `citation` control path in `StandardField` or `SchemaField`; it must render the text field plus source-viewer and propagation actions supplied by editor context.

- [ ] **Step 4: Record the contract task scope**

Review the changed-file list to ensure only the declared files were touched for this task. Leave the implementation uncommitted because these files overlap the active visual-hotfix working tree.

---

### Task 2: Build the isolated raw CSV viewer

**Files:**
- Create: `source-viewer.html`
- Create: `src/source-viewer/main.jsx`
- Create: `src/source-viewer/SourceCsvViewer.jsx`
- Create: `src/source-viewer/sourceViewer.css`
- Create: `src/components/source-data/SourceCsvViewerButton.jsx`
- Create: `src/components/source-data/sourceViewerProtocol.js`
- Modify: `src/components/chart-authoring/DataSourceStep.jsx`
- Modify: `src/components/chart-authoring/ChartWizardV3.jsx`

**Interfaces:**
- Produces: `buildSourceViewerDescriptor(sourceId, source): SourceViewerDescriptor | null`
- Produces: `openSourceViewer({ sourceId, source, windowTarget, onError }): Window | null`
- Protocol messages: `simex-source-viewer-ready` and `simex-source-viewer-load`
- Consumes: configured CSV `path`, uploaded CSV `csvText`, and `import.meta.env.BASE_URL`.

- [ ] **Step 1: Define the same-origin viewer protocol**

Use a bounded descriptor:

```js
{
  version: 1,
  sourceId,
  label,
  mode: "path" | "text",
  path,     // mode === "path"
  csvText,  // mode === "text"
}
```

The launcher opens `${import.meta.env.BASE_URL}source-viewer.html`, listens for a same-origin readiness message from that exact window, sends the descriptor once, and removes listeners on transfer, error, or window closure. Unsupported inline sources return `null`.

- [ ] **Step 2: Create the bare viewer entry**

`source-viewer.html` mounts `src/source-viewer/main.jsx`. The viewer must:

```js
window.opener?.postMessage(
  { type: "simex-source-viewer-ready", version: 1 },
  window.location.origin,
);
```

It accepts only a same-origin `simex-source-viewer-load` message with version `1`. Path mode fetches CSV text; text mode uses the transferred original CSV. Parse with Papa Parse using `header: true` and `skipEmptyLines: true`.

- [ ] **Step 3: Implement paginated search**

Use these fixed behaviors:

```js
const PAGE_SIZE = 100;
const filteredRows = query
  ? rows.filter((row) => columns.some((column) => (
      String(row[column] ?? "").toLocaleLowerCase().includes(queryLower)
    )))
  : rows;
const visibleRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
```

Reset to page zero on query change. Render sticky headers, text-only cells, previous/next controls, current range, filtered count, and original total count. Show bounded loading, blocked-source, fetch, and parse errors without closing the window.

- [ ] **Step 4: Add viewer actions to wizard and generated forms**

`DataSourceStep` receives the selected source record and renders `SourceCsvViewerButton` beside “Remove source.” `ChartWizardV3` supplies the selected configured or uploaded source. The generated citation control reuses the same button in the editor Data tab.

- [ ] **Step 5: Record the viewer task scope**

Review the changed-file list for this task and leave the implementation uncommitted pending visual approval.

---

### Task 3: Replace persistent chart chrome with on-demand actions

**Files:**
- Create: `src/components/charts/ChartPanelActions.jsx`
- Modify: `src/components/ChartPanel.jsx`
- Modify: `src/components/FullscreenDisplay.jsx`
- Modify: `src/components/charts/EChartsChartView.jsx`
- Modify: `src/components/charts/CardChartView.jsx`
- Modify: `src/components/charts/TargetCollectionChartView.jsx`
- Modify: `src/components/charts/TableChartView.jsx`
- Modify: `src/components/charts/ImageChartView.jsx`
- Modify: `src/components/charts/chartViewPresentation.js`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `resolveChartCitation` and `chartDescriptionVisible` from Task 1.
- Produces: `ChartPanelActions({ citation, onFullscreen }): ReactElement`
- Produces: consistent description visibility across all chart views.

- [ ] **Step 1: Implement the icon action rail**

`ChartPanelActions` owns one information popover per panel. Render semantic buttons with inline SVG icons:

```jsx
<div className="chart-panel-action-rail">
  <button type="button" aria-expanded={infoOpen} aria-label="Show source information">
    <InfoIcon />
  </button>
  <button type="button" aria-label="Open chart fullscreen" onClick={onFullscreen}>
    <FullscreenIcon />
  </button>
</div>
```

The popover shows `Source: ${citation}` and closes on Escape, outside pointer interaction, trigger toggle, and unmount. A document-level custom event coordinates competing popovers so opening one closes another.

- [ ] **Step 2: Replace the current ChartPanel buttons**

Keep Edit, Section, and Remove controls available only in edit mode. Remove the text Fullscreen button and mount `ChartPanelActions` at the panel bottom-right. Preserve the existing long-hold multi-fullscreen gesture on the compact fullscreen icon.

- [ ] **Step 3: Remove persistent provenance from chart renderers**

Stop rendering `.chart-view-provenance` paragraphs in every view family. Render `.chart-view-description` only when `chartDescriptionVisible(chart)` is true. Keep accessibility descriptions independent of visual description visibility.

- [ ] **Step 4: Adapt fullscreen presentation**

Add a compact information control to the fullscreen header and keep the Close action. Do not restore a persistent source line inside the chart.

- [ ] **Step 5: Style hover, focus, and touch behavior**

Use:

```css
.chart-panel-action-rail {
  bottom: 12px;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  right: 12px;
  transform: translateY(4px);
}

.chart-panel:hover .chart-panel-action-rail,
.chart-panel:focus-within .chart-panel-action-rail,
.chart-panel.selected .chart-panel-action-rail {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

@media (hover: none) {
  .chart-panel-action-rail {
    opacity: 1;
    pointer-events: auto;
  }
}
```

Ensure the popover remains inside the panel bounds and does not cover the icons.

- [ ] **Step 6: Record the chart chrome task scope**

Review the changed-file list for this task and leave the implementation uncommitted pending visual approval.

---

### Task 4: Convert the chart editor into a preview-first modal

**Files:**
- Create: `src/components/chart-authoring/ChartEditorModal.jsx`
- Modify: `src/components/chart-authoring/ChartEditorV3.jsx`
- Modify: `src/components/chart-authoring/ContextualTabs.jsx`
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `ChartEditorModal({ open, titleId, onClose, children }): ReactElement | null`
- Consumes: existing `ModalFocusScope`, `ChartPreview`, generated sections, `EditSessionActions`, and dashboard mutation callback.
- Produces: `onApplyCitationToSourceCharts({ sourceId, label }): void`

- [ ] **Step 1: Create the modal shell**

Use the existing focus-scope infrastructure:

```jsx
<ModalFocusScope
  open={open}
  onEscape={onClose}
  initialFocusSelector="[data-chart-editor-initial-focus='true']"
  className="chart-editor-backdrop"
  role="dialog"
  aria-modal="true"
  aria-labelledby={titleId}
>
  <aside className="chart-editor-modal">{children}</aside>
</ModalFocusScope>
```

The backdrop uses `backdrop-filter: blur(7px)` and blocks pointer interaction with the dashboard. The modal is centered, capped to the viewport, and restores focus through the existing modal stack.

- [ ] **Step 2: Reorder editor content**

Within the modal form, use this fixed order:

1. Header and chart-type selector
2. Large live `ChartPreview`
3. Sticky contextual tab row
4. Scrollable generated field panel
5. Error status
6. Sticky Save/Reset/Cancel footer and Remove chart action

Remove the dashboard workspace side-column class and keep the page layout unchanged behind the fixed modal.

- [ ] **Step 3: Add citation propagation**

The citation control calculates matching chart count from `existingCharts`. Clicking Apply opens a confirmation naming the count. Confirmation calls:

```js
onApplyCitationToSourceCharts({
  sourceId: state.draft.sourceId,
  label: state.draft.presentation?.citation?.label ?? "",
});
```

`DashboardRenderer` forwards the request. `App.jsx` performs one immutable dashboard mutation via `applyCitationToSourceCharts`, updating the selected chart and every matching chart. The editor rebase path then adopts the committed citation without losing unrelated saved state.

- [ ] **Step 4: Add responsive modal styling**

Desktop: preview-first layout, two-column `.chart-authoring-section-fields`, internal settings scroll, maximum modal width around `1180px`.

Phone/tablet: near-fullscreen modal, one-column fields, preview minimum height reduced without hiding it.

- [ ] **Step 5: Record the editor modal task scope**

Review the changed-file list for this task and leave the implementation uncommitted pending visual approval.

---

### Task 5: Replace the popup eyedropper with direct page sampling

**Files:**
- Create: `src/components/color/EyeDropperCoordinator.js`
- Modify: `src/components/ColorField.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `pickColorFromPage({ documentTarget, windowTarget }): Promise<string | null>`
- Consumes: the browser `EyeDropper` API and the current `ColorField.commitColor`.

- [ ] **Step 1: Implement the coordinator**

Use the picker directly within the click activation:

```js
export async function pickColorFromPage({
  documentTarget = document,
  windowTarget = window,
} = {}) {
  if (!("EyeDropper" in windowTarget)) return null;
  const root = documentTarget.documentElement;
  root.dataset.simexEyedropperActive = "true";
  try {
    const result = await new windowTarget.EyeDropper().open();
    return typeof result?.sRGBHex === "string" ? result.sRGBHex : null;
  } catch (error) {
    if (error?.name === "AbortError") return null;
    throw error;
  } finally {
    delete root.dataset.simexEyedropperActive;
  }
}
```

- [ ] **Step 2: Simplify ColorField**

Delete popup creation, generated picker-window HTML, message listeners, polling interval, and cleanup refs. The pipette button calls `pickColorFromPage`; a returned color commits, cancellation leaves the draft unchanged, and unexpected errors show a concise field message.

- [ ] **Step 3: Temporarily reveal the dashboard**

Use:

```css
html[data-simex-eyedropper-active="true"] .chart-editor-backdrop {
  opacity: 0;
  pointer-events: none;
}
```

Do not unmount the editor. Its active tab, scroll position, and React draft therefore remain intact while the browser samples the page.

- [ ] **Step 4: Record the eyedropper task scope**

Review the changed-file list for this task and leave the implementation uncommitted pending visual approval.

---

### Task 6: Integrate the visual defaults and hand off for inspection

**Files:**
- Modify: `public/config/dashboard.json` only if an explicit description visibility value is needed for generated examples
- Modify: `src/styles.css`
- Modify: files from Tasks 1–5 only for integration corrections

**Interfaces:**
- Consumes all prior task interfaces.
- Produces the complete visual iteration for user inspection.

- [ ] **Step 1: Confirm default-hidden rendering by inspection only**

Review configuration reads so every absent `presentation.description` resolves to hidden. Do not mass-edit every chart merely to encode the default.

- [ ] **Step 2: Preserve the existing performance hotfix**

Ensure viewport-deferred chart mounting, static render caching, label-density suppression, compact gauge rendering, and the edit-mode accessibility switch remain present.

- [ ] **Step 3: Do not run automated verification**

Do not run `pnpm test`, Playwright, Vite build, linting, type checking, or regression scripts. Rely on the already-running development server’s normal hot-module updates and the user’s browser review.

- [ ] **Step 4: Hand off the exact visual checklist**

Ask the user to inspect:

1. Description hidden by default and enabled from Appearance
2. Citation field and confirmed propagation
3. Hover/focus info and fullscreen icons
4. Full raw CSV viewer pagination and search
5. Preview-first blurred editor modal
6. Eyedropper modal suppression and restoration
7. Tab-switching responsiveness and chart containment

- [ ] **Step 5: Defer final integration commit**

Leave implementation changes uncommitted until the user approves the visual result, unless the user explicitly requests an intermediate checkpoint. After approval, run the deferred verification suite, address findings, and create the final integration commit.
