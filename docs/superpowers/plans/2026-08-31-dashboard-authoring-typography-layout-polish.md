# Dashboard Authoring Typography and Layout Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish only the approved dashboard-authoring typography, axis-title, stable-shell, Text/Image geometry, media-frame, and image-panel presentation behavior that is not already committed.

**Architecture:** Extend the current chart, static-content, theme, and authoring-form contracts in place. Keep `DashboardSection`, `DashboardChartPlacement`, immutable layout helpers, the actions-only operation-status context, and deferred chart preparation as fixed architectural boundaries; do not create another canvas, layout, media-persistence, or draft-ownership path.

**Tech Stack:** React 19, Vite 6, ECharts 5, CSS custom properties, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-dashboard-authoring-typography-layout-polish-design.md`

## Global Constraints

- Do not bundle or download a webfont. Dashboard body, heading, and data stacks remain defined by the dashboard style grammar.
- Fixed font families are permitted only in the style-token definitions, the `--simex-style-mono-font` definition/use path, and KaTeX's dependency-owned glyph CSS.
- New schema fields are optional and additive. Existing dashboards require no migration.
- Do not change chart identity, chart data mapping, persistence transactions, static-content source/media ownership, or content-draft retention.
- Do not revive `BuildSectionPanelRegion` or move live-canvas ownership back into the legacy `DashboardRenderer` path.
- Keep `DashboardSection`, `DashboardChartPlacement`, `dashboardCanvasActions`, stable entity identities, and immutable layout path-copying intact.
- Authoring surfaces may consume operation-status actions, never queue snapshots. `OperationStatusViewport` remains the only snapshot consumer.
- Full Chart Edit must render before costly preparation. Every new form and shell must tolerate `prepared === null` during its first paint.
- Positive value-axis `titleOffsetY` moves the title up. Automatic zero-offset placement keeps at least 8px from tick labels; manual offsets are not collision-clamped.
- Do not add keyboard or accessibility-navigation behavior in this slice.
- Keep `playwright.config.js`, `playwright.static.config.js`, `tests/e2e/mock-companion-server.mjs`, and `tests/e2eHarnessSourceMode.test.js` frozen unless a demonstrated harness defect requires a separate decision.
- After every implementation commit, post `http://127.0.0.1:5174/` for inspection and do not open an internal browser window.

---

## Reconciliation Against the Four Pre-merge Commits

### Already committed and verified

- `a695c78` owns the Text/Image draft-silence rule, explicit **No title** conflict handling, compact fullscreen exit control, Fullscreen tooltip copy/hover cleanup, legacy-eyebrow cleanup, formatted/raw QMD switching, rewrite-risk reporting, table-cell menu, Text/Image header/spacing cleanup, and the baseline embedded-image/media picker integration.
- `47924a3` owns stable embedded-image leases while the Text/Image authoring body scrolls. Do not remount or re-resolve equivalent media wrappers.
- `2059e62` owns X-axis title/date formatting/tick frequency/min/max, value-axis title position/orientation, hidden unused secondary-axis controls, pointer-only behavior, section move status-before-work, and identity-preserving section movement.
- `fd3554c` owns adaptive recovery for temporal label presets, collision-safe baseline value-axis gaps, clearing the submitted chart draft, and silence for existing-chart draft changes.
- Current `MediaPicker`, `StaticContentWizard`, and `staticContentDraft` already reuse committed `mediaId` values, import an external item as a new local copy, expose unavailable media with reasons, and retain assets through the current content-draft transaction.
- Current portable QMD already supports `none`, `outline`, and `card` frames. This plan extends that grammar; it does not replace it.
- The integrated `0ca39aa` architecture already prevents unaffected section/chart recomputation through memoized entity boundaries and immutable layout identities.

### Still planned

- Add the mono token, remove authored fixed-family remnants, project dashboard typography into every ECharts text category, and add the production-font scan guard.
- Preserve raw axis-title strings while typing, add value-axis title size/bold/X/Y controls, and replace native value-axis names with collision-aware ECharts graphics.
- Put visible ECharts titles above descriptions in DOM order and suppress duplicate canvas titles.
- Keep Chart and Text/Image footer controls mounted in stable slots; make Text/Image tab readiness dependency-based; make Configure and other forms use a shared responsive grid.
- Match formatted/raw editor and rendered preview widths to the selected footprint and align their prose/table/media wrapping.
- Present existing media and new upload as equal-status choices without changing media identity or retention.
- Add embedded QMD frame weight/color round-tripping and visibly distinguish Outline from Card.
- Move standalone Image titles above the viewport, add image-only title appearance controls, and add Default/White/Custom unfilled-area backgrounds.

### Superseded or adapted by the integrated architecture

- Any remaining section-move optimization is superseded by `DashboardSection`, `DashboardChartPlacement`, `dashboardCanvasActions`, `immutableDashboardLayout.js`, and the accepted render-boundary tests. None of those production files need feature changes for this plan.
- Theme-driven chart updates must flow through `DashboardChartThemeContext` and `EChartsChartView`; they must not add theme props to every placement or invalidate unrelated entity callbacks.
- Wizard layout changes live inside authoring shells and form components. They must not add status snapshots, draft objects, or inline callbacks to `DashboardCanvas` entity props.
- Existing media selection is adapted to the integrated `MediaItem` plus asset-manifest plus content-draft-retainer transaction. Only chooser presentation and documented QMD attributes change.
- Existing source-mode and package-mode harness separation is accepted infrastructure. This plan runs those harnesses as consumers and does not rewrite them.

## Requirement Coverage Map

| Approved design section | Reconciled state | Owning task |
|---|---|---|
| §1 Typography contract | DOM token baseline exists; mono token, ECharts projection, fixed-family cleanup, and scan remain | Task 1 |
| §2 Axis-title contract | Existing titles/ranges/formats/gaps remain; raw typing and size/bold/offset graphics remain | Task 2 |
| §3 Chart heading order | Free Text is already ordered; ECharts and Image need the shared heading path | Tasks 1 and 6 |
| §4 Stable authoring shell | Chart shell baseline exists; primary/footer slots and Text/Image fixed height remain | Task 3 |
| §5 Efficient form layout | Existing scattered grids remain; shared responsive field/boolean contract remains | Task 3 |
| §6 Text/Image readiness | Transition validation exists; shared dependency-derived selector remains | Task 3 |
| §7 Footprint-aware Text editing | Footprint is persisted; authoring projection and shared wrapping remain | Task 4 |
| §8 Embedded image frames/media | Media transactions and frame modes exist; equal-choice UI and new attributes remain | Task 5 |
| §9 Standalone Image panels | Blank-title and shared align/visible baseline exists; heading styling/background remain | Task 6 |
| §10 Compatibility/persistence | Existing ownership is frozen; validators gain optional fields only | Tasks 2, 5, and 6 |
| §11 Verification | Existing regressions remain; focused new checks and one final candidate run remain | Each task and Task 7 |

## File Ownership Map

| Slice | Primary files | Explicit non-owners |
|---|---|---|
| Typography and headings | `src/theme/dashboardStyleGrammar.js`, `src/theme/DashboardChartThemeContext.jsx`, `src/components/charts/EChartsChartView.jsx`, new `src/components/charts/ChartHeading.jsx`, authored CSS | `DashboardCanvas`, `DashboardSection`, `DashboardChartPlacement` |
| Value-axis titles | `src/charting/config/chartConfigV3.js`, `src/components/chart-authoring/StandardField.jsx`, `src/charting/rendering/axisPresentation.js`, `axisAdapter.js`, new `axisTitleGraphics.js`, `EChartsChartView.jsx` | layout drafts, persistence coordinators |
| Stable shells/forms/readiness | `ChartWizardV3.jsx`, `ChartEditorV3.jsx`, `GeneratedFormSection.jsx`, `StandardField.jsx`, `StaticContentWizard.jsx`, `staticContentDraft.js`, dialog/style grammar CSS | operation queue/provider, canvas actions |
| Text geometry | `chartPanelLayout.js`, new `AuthoringFootprintFrame.jsx`, `FreeTextSourceEditor.jsx`, `StaticContentWizard.jsx`, static-content CSS | QMD parser and media ownership |
| Media/frame presentation | `MediaPicker.jsx`, `ImageSourceEditor.jsx`, `portableQmdMedia.js`, `renderPortableQmd.js`, `QmdMediaInspector.jsx`, `FreeTextChartView.jsx`, `QmdMediaView.jsx`, source-content CSS | media catalogue identity/revision rules |
| Image panel presentation | `chartConfigV3.js`, new `ImagePanelPresentationFields.jsx`, new `imagePresentation.js`, `StaticContentWizard.jsx`, `ImageChartView.jsx`, `ChartHeading.jsx`, static-content CSS | static source schema, asset bytes |

---

### Task 1: Dashboard Typography Projection and Shared Chart Heading

**Files:**
- Create: `src/components/charts/ChartHeading.jsx`
- Create: `tests/productionTypographyContract.test.js`
- Modify: `src/theme/dashboardStyleGrammar.js`
- Modify: `src/components/charts/EChartsChartView.jsx`
- Modify: `src/components/charts/chartViewPresentation.js`
- Modify: `src/styles/static-content.css`
- Modify: `src/styles.css`
- Modify: `src/styles/dashboard-style-grammar.css`
- Test: `tests/chartRenderingV3.test.js`
- Test: `tests/chartViewV3.test.js`
- Test: `tests/dashboardDialogContract.test.js`

**Interfaces:**
- Consumes: `useDashboardChartTheme()` and its stable `projection.key`; existing `chartTitleVisible`, `titleAlignment`, and `chartDescriptionVisible` helpers.
- Produces: `ChartHeading({ chart, titleId, descriptionId, level })`; ECharts text theme `{ textStrong, textMuted, borderSubtle, gridline, surfacePanel, surfacePanelAlt, dataColors, bodyFont, headingFont, dataFont, typographyKey }`; `--simex-style-mono-font`.

- [ ] **Step 1: Add failing typography and heading-order regressions**

```js
test("ECharts projects dashboard heading, body, and data fonts", () => {
  const presented = applyEChartsPresentation(model, chart, false, {
    ...theme,
    bodyFont: "Body Token Stack",
    headingFont: "Heading Token Stack",
    dataFont: "Data Token Stack",
    typographyKey: "fonts-v1",
  });
  assert.equal(presented.option.title.textStyle.fontFamily, "Heading Token Stack");
  assert.equal(presented.option.legend.textStyle.fontFamily, "Body Token Stack");
  assert.equal(presented.option.tooltip.textStyle.fontFamily, "Body Token Stack");
  assert.equal(presented.option.yAxis.nameTextStyle.fontFamily, "Body Token Stack");
  assert.equal(presented.option.yAxis.axisLabel.fontFamily, "Data Token Stack");
  assert.equal(presented.option.series[0].label.fontFamily, "Data Token Stack");
});

test("visible chart title precedes description and canvas host", () => {
  const html = renderToStaticMarkup(<EChartsChartView model={model} chart={chart} />);
  assert.ok(html.indexOf("chart-view-title") < html.indexOf("chart-view-description"));
  assert.ok(html.indexOf("chart-view-description") < html.indexOf("chart-echarts-host"));
});
```

The production scan test must enumerate authored `src/**/*.{css,js,jsx,svg}` plus root HTML, accept `font: inherit`, accept font declarations whose family is a `--simex-style-*` token, and permit raw stacks only in `src/theme/dashboardStyleGrammar.js`. Dependency-owned KaTeX CSS is outside the authored-source scan and is reported as the mathematical-glyph exception.

- [ ] **Step 2: Run the focused tests and confirm the missing projection/scan failures**

Run:

```powershell
node --test tests/productionTypographyContract.test.js tests/chartRenderingV3.test.js tests/chartViewV3.test.js tests/dashboardDialogContract.test.js
```

Expected: FAIL for the absent mono token, Georgia toolbar declarations, missing ECharts font families, and visible title order.

- [ ] **Step 3: Add the mono token and remove fixed authored families**

Add the mono stack once to the style grammar and project it with every style:

```js
const MONO_FONT_STACK = "ui-monospace, SFMono-Regular, Consolas, monospace";

return Object.freeze({
  "--simex-style-body-font": grammar.bodyFont,
  "--simex-style-heading-font": grammar.headingFont,
  "--simex-style-data-font": grammar.dataFont,
  "--simex-style-mono-font": MONO_FONT_STACK,
  // existing style variables remain unchanged
});
```

Replace the rich-toolbar Georgia declaration with the body token. Replace raw/code/fence/fallback fixed stacks with `var(--simex-style-mono-font)`. Remove dead `font-family: Georgia` rules in `src/styles.css`; tokenized fallback stacks remain valid because the selected dashboard token is authoritative.

- [ ] **Step 4: Implement the shared heading and ECharts typography projection**

`ChartHeading` keeps visible and visually hidden titles structurally present and orders description after title:

```jsx
export default function ChartHeading({ chart, titleId, descriptionId, level = 3 }) {
  const Heading = `h${level}`;
  const title = String(chart?.title || "Chart");
  const description = String(chart?.description || "");
  return (
    <header className="chart-view-heading" {...titleContainerProps(chart)}>
      <Heading id={titleId} className={chartTitleClassName(chart)}>{title}</Heading>
      {chartDescriptionVisible(chart) && description
        ? <p id={descriptionId} className="chart-view-description">{description}</p>
        : null}
    </header>
  );
}
```

In `EChartsChartView`, read body/heading/data computed tokens when `useDashboardChartTheme()?.key` changes. Include the resolved fonts and `typographyKey` in `sameChartTextTheme`. Render `ChartHeading` before the host. Keep `option.title.text` for structural export compatibility but force the ECharts canvas title `show: false` so it cannot duplicate the DOM heading.

Project fonts as follows: title → heading; legend/tooltip/gauge title/axis name → body; axis ticks/series labels/gauge detail → data. Apply the same presented model after theme changes, resize, fullscreen, preview, and detached authoring-root renders.

- [ ] **Step 5: Run Task 1 tests**

Run the Step 2 command again.

Expected: PASS, with the scan reporting only style-token definitions and the dependency-owned KaTeX boundary as documented exceptions.

- [ ] **Step 6: Commit Task 1 and publish the inspection URL**

```powershell
git add src/theme/dashboardStyleGrammar.js src/components/charts/ChartHeading.jsx src/components/charts/EChartsChartView.jsx src/components/charts/chartViewPresentation.js src/styles/static-content.css src/styles.css src/styles/dashboard-style-grammar.css tests/productionTypographyContract.test.js tests/chartRenderingV3.test.js tests/chartViewV3.test.js tests/dashboardDialogContract.test.js
git commit -m "feat: project dashboard typography into chart surfaces"
Invoke-WebRequest -Uri "http://127.0.0.1:5174/" -UseBasicParsing
```

Root reports `[http://127.0.0.1:5174/](http://127.0.0.1:5174/)` immediately after the commit and does not open a browser window.

---

### Task 2: Value-axis Title Controls, Raw Typing, and Graphic Projection

**Files:**
- Create: `src/charting/rendering/axisTitleGraphics.js`
- Modify: `src/charting/config/chartConfigV3.js`
- Modify: `src/components/chart-authoring/StandardField.jsx`
- Modify: `src/charting/rendering/axisPresentation.js`
- Modify: `src/charting/rendering/axisAdapter.js`
- Modify: `src/components/charts/EChartsChartView.jsx`
- Test: `tests/chartConfigV3.test.js`
- Test: `tests/chartAuthoringComponentsV3.test.js`
- Test: `tests/chartRenderingV3.test.js`

**Interfaces:**
- Consumes: Task 1's resolved `bodyFont`; existing `valueAxisGutters`, `titlePosition`, `titleOrientation`, primary/secondary axis binding, and ECharts lifecycle.
- Produces: optional `titleFontSize`, `titleBold`, `titleOffsetX`, `titleOffsetY`; `createValueAxisTitleProjection(...)`; `resolveValueAxisTitleGraphics({ projection, gridRect, textTheme })`.

- [ ] **Step 1: Add failing raw-typing, validation, and geometry tests**

```js
test("X, primary, and secondary axis titles retain an internal typing space", () => {
  for (const path of [["x", "title"], ["primary", "title"], ["secondary", "title"]]) {
    const next = updateStructuredFieldValue("axes", {}, path, "Cumulative ");
    assert.equal(next[path[0]].title, "Cumulative ");
    const completed = updateStructuredFieldValue("axes", next, path, "Cumulative Cases");
    assert.equal(completed[path[0]].title, "Cumulative Cases");
  }
});

test("value-axis title fields are bounded and positive Y moves up", () => {
  validateChartInstance(chartWith({
    titleFontSize: 18,
    titleBold: true,
    titleOffsetX: -12,
    titleOffsetY: 9,
  }));
  const base = resolveValueAxisTitleGraphics({ projection, gridRect, textTheme });
  const moved = resolveValueAxisTitleGraphics({
    projection: { ...projection, titleOffsetY: 9 }, gridRect, textTheme,
  });
  assert.equal(moved[0].top, base[0].top - 9);
});
```

Add vertical primary/secondary, horizontal-bar primary/secondary, 10/24px size, bold, positive/negative offsets, zero-offset 8px clearance, and negative-domain envelope cases.

- [ ] **Step 2: Run the focused tests and confirm failures**

```powershell
node --test tests/chartConfigV3.test.js tests/chartAuthoringComponentsV3.test.js tests/chartRenderingV3.test.js
```

Expected: FAIL because structured axis updates trim trailing spaces, the four new keys are rejected, controls are absent, and native `nameGap` owns value-axis titles.

- [ ] **Step 3: Extend schema and controlled authoring fields**

For primary/secondary axes only, accept:

```js
const VALUE_AXIS_TITLE_KEYS = new Set([
  "titleFontSize", "titleBold", "titleOffsetX", "titleOffsetY",
]);

if (axis.titleFontSize !== undefined
  && (!Number.isInteger(axis.titleFontSize) || axis.titleFontSize < 10 || axis.titleFontSize > 24)) {
  throw new Error(`Chart presentation axes ${axisName} titleFontSize must be an integer from 10 through 24.`);
}
if (axis.titleBold !== undefined && typeof axis.titleBold !== "boolean") throw new Error(/* bounded message */);
for (const key of ["titleOffsetX", "titleOffsetY"]) {
  if (axis[key] !== undefined && (!Number.isFinite(axis[key]) || axis[key] < -96 || axis[key] > 96)) {
    throw new Error(`Chart presentation axes ${axisName} ${key} must be from -96 through 96.`);
  }
}
```

In `updateStructuredFieldValue`, preserve exact string values for axis `title` while editing; keep canonical trimming in the save/render normalization boundary. Continue pruning an explicitly cleared title. Add one-pixel minus/plus controls for size, a Bold checkbox, and numeric horizontal/vertical offset inputs grouped with position/orientation. Keep secondary controls absent unless `field.hasSecondary === true`.

- [ ] **Step 4: Replace native value-axis names with graphic projections**

Keep native X-axis naming. Suppress only primary/secondary value-axis `name` values and attach renderer-neutral projection metadata to the axis render model:

```js
{
  id: "primary",
  physicalAxis: horizontal ? "x" : "y",
  side: horizontal ? "bottom" : "left",
  title,
  position,
  orientation,
  fontSize: settings.titleFontSize ?? 14,
  bold: settings.titleBold === true,
  offsetX: settings.titleOffsetX ?? 0,
  offsetY: settings.titleOffsetY ?? 0,
  tickValues,
}
```

Extend the existing gutter estimator to use font size, weight, resolved body stack, and negative values only when the resolved domain can be negative. `applyEChartsPresentation` recalculates grid gutters from the projection and Task 1's typography. After `setOption`, and after every resize, `createEChartsLifecycle` reads the resolved grid rectangle and replaces only stable `simex-value-axis-title-*` ECharts graphic elements. Apply authoring offsets last; calculate screen `top` as `automaticTop - titleOffsetY` so positive Y moves up.

- [ ] **Step 5: Run Task 2 tests**

Run the Step 2 command again.

Expected: PASS for raw title typing, bounded fields, size/bold, primary/secondary geometry, horizontal bars, positive-Y-up semantics, and zero-offset clearance.

- [ ] **Step 6: Commit Task 2 and publish the inspection URL**

```powershell
git add src/charting/config/chartConfigV3.js src/components/chart-authoring/StandardField.jsx src/charting/rendering/axisPresentation.js src/charting/rendering/axisAdapter.js src/charting/rendering/axisTitleGraphics.js src/components/charts/EChartsChartView.jsx tests/chartConfigV3.test.js tests/chartAuthoringComponentsV3.test.js tests/chartRenderingV3.test.js
git commit -m "feat: add adjustable value-axis titles"
Invoke-WebRequest -Uri "http://127.0.0.1:5174/" -UseBasicParsing
```

Root posts the same inspection URL without opening it.

---

### Task 3: Stable Authoring Shells, Dependency Readiness, and Responsive Forms

**Files:**
- Modify: `src/components/chart-authoring/ChartWizardV3.jsx`
- Modify: `src/components/chart-authoring/ChartEditorV3.jsx`
- Modify: `src/components/chart-authoring/GeneratedFormSection.jsx`
- Modify: `src/components/chart-authoring/StandardField.jsx`
- Modify: `src/components/static-content/StaticContentWizard.jsx`
- Modify: `src/static-content/forms/staticContentDraft.js`
- Modify: `src/styles/dashboard-dialogs.css`
- Modify: `src/styles/dashboard-style-grammar.css`
- Modify: `src/styles/static-content.css`
- Test: `tests/staticContentDraft.test.js`
- Test: `tests/staticContentEditor.test.js`
- Test: `tests/chartAuthoringComponentsV3.test.js`
- Test: `tests/dashboardDialogContract.test.js`

**Interfaces:**
- Consumes: existing chart readiness/proof states and static-content validators; Task 2's expanded axis controls; deferred chart runtime where `prepared` may be null.
- Produces: `staticContentStageReadiness(draft, stage, { previewReady })`; shared `.dashboard-authoring-grid`, `.dashboard-authoring-field--wide`, `.dashboard-authoring-boolean-row`; fixed footer slot names `cancel`, `reset`, `back`, `primary`.

- [ ] **Step 1: Add failing readiness, fixed-slot, and form-grid tests**

```js
test("returning to Destination does not disable satisfied later Text/Image stages", () => {
  const ready = completedFreeTextDraft();
  const backAtDestination = { ...ready, stage: "destination" };
  assert.equal(staticContentStageReadiness(backAtDestination, "content").ready, true);
  assert.equal(staticContentStageReadiness(backAtDestination, "preview-and-add").ready, true);
});

test("authoring primary and footer slots stay mounted", () => {
  const chartHtml = renderChartWizardAt("destination");
  assert.match(chartHtml, /data-footer-slot="primary"/);
  assert.match(chartHtml, /aria-label="Create chart"[^>]*disabled/);
  const staticHtml = renderStaticWizardAt("destination");
  for (const slot of ["cancel", "reset", "back", "primary"]) {
    assert.match(staticHtml, new RegExp(`data-footer-slot="${slot}"`));
  }
});
```

Add markup assertions that Configure/full editor form sections use the shared grid, wide controls span all columns, and checkboxes precede their labels in one aligned indicator column.

- [ ] **Step 2: Run the focused tests and confirm failures**

```powershell
node --test tests/staticContentDraft.test.js tests/staticContentEditor.test.js tests/chartAuthoringComponentsV3.test.js tests/dashboardDialogContract.test.js
```

Expected: FAIL because static tabs are index-gated, Back/Reset and Chart Create/Save unmount, and the common responsive classes do not exist.

- [ ] **Step 3: Implement the pure readiness selector and use it everywhere**

```js
export function staticContentStageReadiness(state, stage, { previewReady = true } = {}) {
  requireStage(stage);
  try {
    validateStageEntry(state, stage);
    if (stage === "preview-and-add" && !previewReady) {
      throw new Error("Wait for the current content preview to finish validating.");
    }
    return Object.freeze({ ready: true, reason: "" });
  } catch (error) {
    return Object.freeze({ ready: false, reason: error?.message || "This stage is not ready." });
  }
}
```

Have `tryStageTransition` and tab rendering consume this selector. Current-stage index is presentational only. Destination remains always available; later stages depend on destination, selected type, and valid content as stated in the spec.

- [ ] **Step 4: Keep shell geometry and controls stable**

Give Chart Wizard, modal Chart Editor, and Text/Image Wizard the same four-row shell contract: header, tabs/progress, minmax body/workbench, footer. Keep only the body scrollable. Keep Chart Create/Save mounted in the final footer slot on every stage and derive `disabled` from readiness, proofs, operation state, and edit dirtiness.

Render Text/Image footer slots unconditionally:

```jsx
<footer className="dashboard-dialog__footer dashboard-authoring-footer">
  <div data-footer-slot="cancel">{cancelButton}</div>
  <div data-footer-slot="reset">{editor ? resetButton : <span aria-hidden="true" />}</div>
  <div data-footer-slot="back">{backButtonAlwaysMounted}</div>
  <div data-footer-slot="primary">{primaryButtonAlwaysMounted}</div>
</footer>
```

Back is disabled on the first available stage; edit Reset is disabled until dirty; create mode reserves the Reset track. Do not add focus restoration or keyboard navigation.

- [ ] **Step 5: Apply one responsive field/boolean layout**

Use the same classes in `GeneratedFormSection`, structured axis groups, Chart Configure, full Editor tabs, and static fields:

```css
.dashboard-authoring-grid {
  display: grid;
  gap: 12px 16px;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
}
.dashboard-authoring-field--wide { grid-column: 1 / -1; }
.dashboard-authoring-boolean-row {
  align-items: start;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  column-gap: 8px;
}
```

Mark textareas, rich editors, previews, palettes, tables, and diagnostics wide. Let compact fields auto-fit. Use the boolean row for every generated checkbox so indicators share one left edge even when ordinary fields occur between them. The auto-fit grid naturally collapses inside Unit Orbit and other narrow containers.

- [ ] **Step 6: Run Task 3 tests**

Run the Step 2 command again.

Expected: PASS for dependency-based tabs, fixed shell/footer geometry, always-mounted disabled primary actions, responsive field grids, and aligned boolean markup.

- [ ] **Step 7: Commit Task 3 and publish the inspection URL**

```powershell
git add src/components/chart-authoring/ChartWizardV3.jsx src/components/chart-authoring/ChartEditorV3.jsx src/components/chart-authoring/GeneratedFormSection.jsx src/components/chart-authoring/StandardField.jsx src/components/static-content/StaticContentWizard.jsx src/static-content/forms/staticContentDraft.js src/styles/dashboard-dialogs.css src/styles/dashboard-style-grammar.css src/styles/static-content.css tests/staticContentDraft.test.js tests/staticContentEditor.test.js tests/chartAuthoringComponentsV3.test.js tests/dashboardDialogContract.test.js
git commit -m "feat: stabilize dashboard authoring shells"
Invoke-WebRequest -Uri "http://127.0.0.1:5174/" -UseBasicParsing
```

Root posts the URL without opening it.

---

### Task 4: Footprint-aware Text Editor and Renderer Geometry

**Files:**
- Create: `src/components/common/AuthoringFootprintFrame.jsx`
- Modify: `src/components/chartPanelLayout.js`
- Modify: `src/components/static-content/StaticContentWizard.jsx`
- Modify: `src/components/static-content/FreeTextSourceEditor.jsx`
- Modify: `src/styles/static-content.css`
- Test: `tests/chartFootprintPicker.test.js`
- Test: `tests/staticContentEditor.test.js`
- Test: `tests/freeTextChartView.test.js`
- Test: `tests/qmdRichTextEditor.test.js`

**Interfaces:**
- Consumes: existing `resolveChartFootprint()` and `chartPanelFootprintStyle()`; Task 3's stable workbench width.
- Produces: `AuthoringFootprintFrame({ layout, className, children })`, a four-column/16px-gap authoring projection shared by writer and rendered preview.

- [ ] **Step 1: Add failing width and wrapping regressions**

```js
test("writer and rendered preview use the selected four-column footprint", () => {
  for (const columns of [1, 2, 3, 4]) {
    const html = renderFreeTextEditor({ layout: { width: columns, height: 1 } });
    assert.equal(count(html, `--chart-footprint-columns:${columns}`), 2);
    assert.match(html, /data-authoring-footprint="writer"/);
    assert.match(html, /data-authoring-footprint="preview"/);
  }
});

test("ordinary rendered and formatted tables wrap without expanding the root", async () => {
  const geometry = await renderLongTableInWriterAndPreview();
  assert.ok(geometry.writer.scrollWidth <= geometry.writer.clientWidth);
  assert.ok(geometry.preview.scrollWidth <= geometry.preview.clientWidth);
  assert.equal(geometry.document.scrollWidth, geometry.document.clientWidth);
});
```

Keep a separate assertion that preformatted code and genuinely unbreakable technical content scroll inside their own bounded region.

- [ ] **Step 2: Run the focused tests and confirm failures**

```powershell
node --test tests/chartFootprintPicker.test.js tests/staticContentEditor.test.js tests/freeTextChartView.test.js tests/qmdRichTextEditor.test.js
```

Expected: FAIL because the selected footprint does not size authoring frames and ordinary editor/rendered tables still use `min-width: max-content`.

- [ ] **Step 3: Implement one shared four-column authoring projection**

```jsx
export default function AuthoringFootprintFrame({ layout, kind, children }) {
  return (
    <div className="authoring-footprint-grid" style={chartPanelFootprintStyle(layout)}>
      <div className="authoring-footprint-frame" data-authoring-footprint={kind}>
        {children}
      </div>
    </div>
  );
}
```

```css
.authoring-footprint-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  max-inline-size: 100%;
}
.authoring-footprint-frame {
  grid-column: span var(--chart-footprint-columns);
  min-inline-size: 0;
  max-inline-size: 100%;
}
```

Pass `draft.panel.layout` from `StaticContentWizard` through `FreeTextSourceEditor`. Wrap the formatted/raw writer and Rendered preview separately so each receives the same projected width. At narrow viewport widths, switch the projection to one fluid track while retaining `max-inline-size: 100%`.

- [ ] **Step 4: Unify ordinary content wrapping**

Give formatted and rendered prose the same line-height/paragraph spacing. Remove `min-width: max-content` from ordinary writer and rendered QMD tables; use `inline-size: 100%`, `max-inline-size: 100%`, `table-layout: auto`, and `overflow-wrap: anywhere` on cells. Keep media at `max-inline-size: 100%`. Preserve bounded horizontal scrolling for code/preformatted and truly unbreakable technical nodes.

- [ ] **Step 5: Run Task 4 tests**

Run the Step 2 command again.

Expected: PASS for all four footprint widths, equivalent writer/preview geometry, table wrapping, bounded media, and technical-content scrolling.

- [ ] **Step 6: Commit Task 4 and publish the inspection URL**

```powershell
git add src/components/common/AuthoringFootprintFrame.jsx src/components/chartPanelLayout.js src/components/static-content/StaticContentWizard.jsx src/components/static-content/FreeTextSourceEditor.jsx src/styles/static-content.css tests/chartFootprintPicker.test.js tests/staticContentEditor.test.js tests/freeTextChartView.test.js tests/qmdRichTextEditor.test.js
git commit -m "feat: preview text at its selected footprint"
Invoke-WebRequest -Uri "http://127.0.0.1:5174/" -UseBasicParsing
```

Root posts the URL without opening it.

---

### Task 5: Shared Media Choice and Custom Embedded-image Frames

**Files:**
- Modify: `src/components/source-content/MediaPicker.jsx`
- Modify: `src/components/static-content/ImageSourceEditor.jsx`
- Modify: `src/components/static-content/FreeTextSourceEditor.jsx`
- Modify: `src/components/static-content/QmdMediaInspector.jsx`
- Modify: `src/static-content/qmd/portableQmdMedia.js`
- Modify: `src/static-content/qmd/renderPortableQmd.js`
- Modify: `src/components/charts/FreeTextChartView.jsx`
- Modify: `src/components/charts/QmdMediaView.jsx`
- Modify: `src/styles/source-content.css`
- Test: `tests/contentPicker.test.js`
- Test: `tests/portableQmdMedia.test.js`
- Test: `tests/qmdMediaInspector.test.js`
- Test: `tests/qmdMediaView.test.js`
- Test: `tests/freeTextChartView.test.js`
- Test: `tests/staticContentDraft.test.js`

**Interfaces:**
- Consumes: current `MediaPicker` partitioning, external-to-local import, `onMediaSelect`, `onMediaCreate`, and content-draft retention; current portable media parser/serializer.
- Produces: equal-status chooser paths; optional JS `frameWeight`/`frameColor`; QMD `frameweight`/`framecolor`; CSS variables `--qmd-frame-weight` and `--qmd-frame-color`.

- [ ] **Step 1: Add failing chooser, round-trip, and rendering tests**

```js
test("embedded frame weight and color round-trip without injecting absent defaults", () => {
  const source = "![Map](simex-media:map){width=50% align=center flow=block frame=outline frameweight=3 framecolor=\"#AABBCC\" caption=\"\" decorative=false}";
  const node = parsePortableQmdWithMedia(source).ast.mediaNodes[0];
  assert.equal(node.attributes.frameWeight, 3);
  assert.equal(node.attributes.frameColor, "#AABBCC");
  assert.match(serializePortableMediaReference({ ...node, ...node.attributes }), /frameweight=3 framecolor="#AABBCC"/);
  assert.doesNotMatch(serializePortableMediaReference(baselinePlacement), /frameweight|framecolor/);
});

test("media chooser presents existing and upload as equal source paths", () => {
  const html = renderMediaPicker();
  assert.match(html, /data-media-source-path="existing"/);
  assert.match(html, /Use existing dashboard media/);
  assert.match(html, /data-media-source-path="upload"/);
  assert.match(html, /Upload new image/);
});
```

Add tests for 1/8 bounds, invalid colors, lowercase input normalized to uppercase only on deliberate update/save, retained values while frame is None, Outline/Card class/style differences, existing local identity reuse, external import creating a distinct local item, and unavailable reasons.

- [ ] **Step 2: Run the focused tests and confirm failures**

```powershell
node --test tests/contentPicker.test.js tests/portableQmdMedia.test.js tests/qmdMediaInspector.test.js tests/qmdMediaView.test.js tests/freeTextChartView.test.js tests/staticContentDraft.test.js
```

Expected: FAIL only for the new equal-choice presentation and frame attributes; existing reuse/import/no-duplication assertions remain green.

- [ ] **Step 3: Make the existing picker the explicit two-path chooser**

Keep `partitionMediaPickerItems`, upload staging, `onSelect`, and `onCreateLocal` unchanged. Give both QMD and standalone Image entry points the same two primary sections:

```jsx
<section data-media-source-path="existing">
  <h4>Use existing dashboard media</h4>
  {existingMediaList}
</section>
<section data-media-source-path="upload">
  <h4>Upload new image</h4>
  {validatedUploadControl}
</section>
```

Standalone Image uses these as equal first choices before URL/package alternatives. Embedded Text uses the same picker from Insert/Change image. Selecting an existing item continues to reuse its `mediaId` and bytes; never mutate the selected library item.

- [ ] **Step 4: Extend the portable QMD grammar and inspector**

Map serialized lowercase names explicitly:

```js
const SERIALIZED_ATTRIBUTE_NAMES = Object.freeze({
  frameweight: "frameWeight",
  framecolor: "frameColor",
});
```

Validate `frameWeight` as an integer 1..8 whenever present and `frameColor` as six-digit hex. Preserve absent values as absent. Preserve configured values when frame is `none`; only render them for `outline` or `card`. Add a 1px-step weight control and the shared `ColorField` with Reset when a framed mode is active.

Carry the new data attributes through `renderPortableQmd` → `FreeTextChartView` → `QmdMediaView`. Apply CSS variables only to framed modes:

```jsx
style={safeAttributes.frame === "none" ? undefined : {
  "--qmd-frame-weight": `${safeAttributes.frameWeight ?? 1}px`,
  "--qmd-frame-color": safeAttributes.frameColor || "var(--simex-border-subtle)",
}}
```

Outline remains transparent with minimal padding. Card uses the alternate surface, larger padding, stronger radius, and shadow so it is visibly distinct at the same border weight/color.

- [ ] **Step 5: Run Task 5 tests**

Run the Step 2 command again.

Expected: PASS for chooser parity, media identity preservation, external import, disabled unavailable items, QMD round-tripping, no default injection, and distinct frame rendering.

- [ ] **Step 6: Commit Task 5 and publish the inspection URL**

```powershell
git add src/components/source-content/MediaPicker.jsx src/components/static-content/ImageSourceEditor.jsx src/components/static-content/FreeTextSourceEditor.jsx src/components/static-content/QmdMediaInspector.jsx src/static-content/qmd/portableQmdMedia.js src/static-content/qmd/renderPortableQmd.js src/components/charts/FreeTextChartView.jsx src/components/charts/QmdMediaView.jsx src/styles/source-content.css tests/contentPicker.test.js tests/portableQmdMedia.test.js tests/qmdMediaInspector.test.js tests/qmdMediaView.test.js tests/freeTextChartView.test.js tests/staticContentDraft.test.js
git commit -m "feat: customize embedded image frames"
Invoke-WebRequest -Uri "http://127.0.0.1:5174/" -UseBasicParsing
```

Root posts the URL without opening it.

---

### Task 6: Standalone Image Heading and Viewport Presentation

**Files:**
- Create: `src/charting/presentation/imagePresentation.js`
- Create: `src/components/static-content/ImagePanelPresentationFields.jsx`
- Modify: `src/charting/config/chartConfigV3.js`
- Modify: `src/components/charts/ChartHeading.jsx`
- Modify: `src/components/charts/ImageChartView.jsx`
- Modify: `src/components/static-content/StaticContentWizard.jsx`
- Modify: `src/styles/static-content.css`
- Test: `tests/chartConfigV3.test.js`
- Test: `tests/staticContentDraft.test.js`
- Test: `tests/staticContentEditor.test.js`
- Test: `tests/imageChartView.test.js`
- Test: `tests/chartViewV3.test.js`

**Interfaces:**
- Consumes: Task 1's `ChartHeading`; Task 3's shared authoring form classes; existing title `align`/`visible`; existing `ColorField`; current static `setPanel` reducer action.
- Produces: image-only title `fontSize`, `bold`, `italic`, `underline`; `presentation.image.background`; `resolveImageViewportBackground()` and `imageTitleStyle()`.

- [ ] **Step 1: Add failing schema, controls, and rendering tests**

```js
test("image title presentation is image-only and bounded", () => {
  validateChartInstance(imageChart({
    title: { align: "center", visible: true, fontSize: 20, bold: true, italic: true, underline: true },
    image: { background: { mode: "custom", color: "#AABBCC" } },
  }));
  assert.throws(() => validateChartInstance(lineChart({ title: { align: "left", fontSize: 20 } })), /image/i);
});

test("image heading precedes viewport and decoration does not suppress it", () => {
  const html = renderImage({ decorative: true, title: "Outbreak map" });
  assert.ok(html.indexOf("chart-view-heading") < html.indexOf("chart-image-viewport"));
  assert.match(html, /Outbreak map/);
  assert.doesNotMatch(html, /<figcaption/);
});
```

Add alignment, 12/32 bounds, one-pixel +/- control behavior, bold/italic/underline, visible false, no-title disabling, Default/White/Custom modes, invalid custom color, retained last custom color, contain/crop/rotation uncovered area, and heading-font assertions.

- [ ] **Step 2: Run the focused tests and confirm failures**

```powershell
node --test tests/chartConfigV3.test.js tests/staticContentDraft.test.js tests/staticContentEditor.test.js tests/imageChartView.test.js tests/chartViewV3.test.js
```

Expected: FAIL because image-only title fields and `presentation.image` are rejected, Image still uses a bottom caption, and viewport background is not authored.

- [ ] **Step 3: Add optional image presentation validation and controls**

Allow title appearance keys only when `schema.typeId === "image"`. Validate `fontSize` as integer 12..32 and emphasis fields as booleans. Add optional `presentation.image.background` with mode `default|white|custom`; require uppercase-normalized six-digit color only for Custom while retaining the last valid custom color when another mode is selected.

`ImagePanelPresentationFields` updates `draft.panel.presentation` through the existing `setPanel` action. It renders alignment, one-pixel size minus/plus, Bold/Italic/Underline, and background mode/color controls. Disable title appearance controls when `draft.noTitle === true`; do not mutate an explicit `visible` value when the user types a title.

- [ ] **Step 4: Render a real top heading and viewport-only background**

Use Task 1's `ChartHeading` before `.chart-image-viewport`. Extend it with an optional image title style:

```js
export function imageTitleStyle(chart) {
  const title = chart?.presentation?.title ?? {};
  return {
    fontSize: `${boundedInteger(title.fontSize, 12, 32, 16)}px`,
    fontWeight: title.bold === true ? 700 : undefined,
    fontStyle: title.italic === true ? "italic" : undefined,
    textDecoration: title.underline === true ? "underline" : undefined,
  };
}
```

Resolve background to `var(--simex-surface-panel-alt)`, `#FFFFFF`, or validated custom color and apply it only to `.chart-image-viewport`. Remove the bottom `figcaption`. Remove `StaticPreview`'s outer title so the rendered `ChartView` is the sole title owner for both Free Text and Image.

- [ ] **Step 5: Run Task 6 tests**

Run the Step 2 command again.

Expected: PASS for top placement, alignment, appearance, decorative independence, sole preview title ownership, and all viewport background modes.

- [ ] **Step 6: Commit Task 6 and publish the inspection URL**

```powershell
git add src/charting/presentation/imagePresentation.js src/components/static-content/ImagePanelPresentationFields.jsx src/charting/config/chartConfigV3.js src/components/charts/ChartHeading.jsx src/components/charts/ImageChartView.jsx src/components/static-content/StaticContentWizard.jsx src/styles/static-content.css tests/chartConfigV3.test.js tests/staticContentDraft.test.js tests/staticContentEditor.test.js tests/imageChartView.test.js tests/chartViewV3.test.js
git commit -m "feat: add image panel heading presentation"
Invoke-WebRequest -Uri "http://127.0.0.1:5174/" -UseBasicParsing
```

Root posts the URL without opening it.

---

### Task 7: Final Candidate Verification and Scoped Review

**Files:**
- Verify only; no evidence-only or closure commit.

**Interfaces:**
- Consumes: Tasks 1–6 and the frozen entity-scoped/source-mode architecture.
- Produces: one task-specific deterministic result, one source-mode browser result, one production build, one font-scan report, and one scoped review verdict.

- [ ] **Step 1: Run the complete task-specific Node selection once**

```powershell
node --test tests/productionTypographyContract.test.js tests/dashboardDialogContract.test.js tests/chartConfigV3.test.js tests/chartAuthoringComponentsV3.test.js tests/chartRenderingV3.test.js tests/chartViewV3.test.js tests/fullscreenDisplay.test.js tests/staticContentDraft.test.js tests/staticContentEditor.test.js tests/freeTextChartView.test.js tests/imageChartView.test.js tests/contentPicker.test.js tests/portableQmdMedia.test.js tests/qmdMediaInspector.test.js tests/qmdMediaView.test.js tests/chartFootprintPicker.test.js tests/buildLayoutDraft.test.js tests/buildLayoutMove.test.js
```

Expected: PASS. If sandboxed Vite/esbuild setup blocks a source-transform suite, rerun only that blocked suite with normal filesystem read access; do not classify setup denial as a product failure.

- [ ] **Step 2: Run the representative source-mode browser journeys**

```powershell
node node_modules/@playwright/test/cli.js test tests/e2e/dashboard-render-boundaries.spec.js tests/e2e/operation-status-context.spec.js tests/e2e/v3-authoring-theme-propagation.spec.js tests/e2e/v3-wizard-usability.spec.js tests/e2e/v3-chart-creation.spec.js
```

Expected: PASS using the existing explicit `--source` harness. Do not edit harness selection or serve `dist` to make a source test pass.

- [ ] **Step 3: Run the production build once**

```powershell
pnpm.cmd build
```

Expected: PASS. Treat known bundle-size advisories as warnings unless this slice changes their category or prevents output.

- [ ] **Step 4: Record the full production-font scan result**

Report the exact scan roots (`src/**/*.{css,js,jsx,svg}` and root authored HTML), all matches, and these permitted boundaries only:

1. `src/theme/dashboardStyleGrammar.js`: dashboard body/heading/data and mono token definitions.
2. KaTeX dependency CSS outside authored production source: mathematical glyph metrics.

Every other authored text declaration must resolve through body, heading, data, mono, or `inherit`. Include text boxes, buttons, detached authoring roots, inline SVG text, and ECharts canvas configuration in the report.

- [ ] **Step 5: Request one scoped implementation review**

Review the combined slice for schema compatibility, raw axis typing, ECharts theme/resize behavior, title duplication, shell geometry, media identity preservation, QMD round-tripping, and Image presentation. Mechanical facts already established by focused tests do not require a second broad review.

- [ ] **Step 6: Confirm architecture and repository state**

```powershell
git diff --check
git status --short
git diff 0ca39aa -- playwright.config.js playwright.static.config.js tests/e2e/mock-companion-server.mjs tests/e2eHarnessSourceMode.test.js src/components/dashboard/DashboardCanvas.jsx src/components/dashboard/DashboardSection.jsx src/components/dashboard/DashboardChartPlacement.jsx src/components/dashboard/dashboardCanvasActions.js src/components/build/immutableDashboardLayout.js
```

Expected: no whitespace errors; only intended task files changed; frozen harness and entity-scoped architecture files unchanged. If review finds a real defect, make one bounded correction commit, rerun only invalidated checks, and immediately post the inspection URL after that commit.

## Implementation Gate

This plan is complete when Tasks 1–7 are executable without another product decision. Begin no feature work until the implementation gate is explicitly opened. No user re-approval is required unless execution discovers a conflict with the approved spec or a genuine blocker in the integrated architecture.
