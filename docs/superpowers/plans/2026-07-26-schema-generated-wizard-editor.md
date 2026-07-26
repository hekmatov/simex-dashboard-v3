# SimEx Schema-Generated Wizard and Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an intuitive four-step chart wizard and context-aware editor generated from the approved version-3 chart schemas.

**Architecture:** Keep form derivation and draft transitions in pure modules, then render them through curated React controls. Creation and editing share the same form model, validation, preview, conversion, color, and confirmation components; no component maintains a second chart-type rule list.

**Tech Stack:** JavaScript ES modules, React 19, ECharts 5.6, Vite 6 SSR, Node test runner, Playwright 1.61, existing `ColorField`

## Global Constraints

- Complete `2026-07-26-chart-system-v3-core.md` and `2026-07-26-time-and-collection-capabilities.md` first.
- Work only in `C:\Users\hekma\Documents\SimEx Dashboard\.worktrees\simex-dashboard-v2\chart-wizard-revamp`.
- Do not read or write OneDrive.
- Do not merge, push, deploy, or update a Cloudflare branch.
- Use the chart schema registry as the only chart-type capability list.
- Wizard order is Chart type → Data source → Data roles → Style and layout.
- All four tabs remain clickable regardless of completion state.
- Incomplete destinations show prerequisites; they do not silently create data mappings.
- Manual data entry is limited to pie/donut, KPI, gauge, bullet/target, and a single Delta card.
- Multi-entity Delta lists require a dataset.
- Appearance controls do not appear before a valid preview is possible.
- Show an observation/X interpretation override only when more than one valid interpretation would materially change preparation or rendering.
- Duplicate-observation controls appear only when duplicates are detected for active roles.
- Essential controls appear before collapsed Advanced controls.
- Close always asks `Discard chart?`.
- Reset changes sits beside Save and asks `Discard these edits?`.
- Ctrl-wheel is required for zoomable charts; ordinary scrolling must continue to move the page.
- Use no new runtime dependency.
- Commit each task independently.

---

## File Structure

### Create

- `src/charting/forms/formModel.js` — derives wizard steps and editor sections from schemas.
- `src/charting/forms/wizardDraft.js` — pure draft state and navigation reducer.
- `src/charting/forms/chartConversion.js` — compatible preservation and guided remapping.
- `src/charting/forms/manualData.js` — concise inline-table validation and row conversion.
- `src/components/common/ConfirmDialog.jsx` — accessible reusable confirmation.
- `src/components/chart-authoring/SchemaField.jsx` — curated field dispatch.
- `src/components/chart-authoring/RoleField.jsx` — single and multiple role assignment.
- `src/components/chart-authoring/StandardField.jsx` — text, number, select, toggle, and range controls.
- `src/components/chart-authoring/CollectionSettingsField.jsx` — collection layout and ranking controls.
- `src/components/chart-authoring/TimeSyncSettingsField.jsx` — synchronization-group and matching controls.
- `src/components/chart-authoring/GeneratedFormSection.jsx` — shared section renderer.
- `src/components/chart-authoring/ChartPreview.jsx` — final prepared-data preview.
- `src/components/chart-authoring/ChartTypePicker.jsx` — purpose-grouped searchable cards.
- `src/components/chart-authoring/DataSourceStep.jsx` — existing, upload, and concise manual sources.
- `src/components/chart-authoring/DataRolesStep.jsx` — schema roles and conditional duplicates.
- `src/components/chart-authoring/StyleLayoutStep.jsx` — preview-first presentation controls.
- `src/components/chart-authoring/ChartWizardV3.jsx` — four-step creation workflow.
- `src/components/chart-authoring/ChartEditorV3.jsx` — context-aware edit workflow.
- `src/components/chart-authoring/ContextualTabs.jsx` — renders only materialized editor sections.
- `src/components/chart-authoring/ChartConversionDialog.jsx` — conversion review and remapping.
- `src/components/chart-authoring/EditSessionActions.jsx` — Save and Reset changes.
- `src/components/charts/ZoomGuard.jsx` — Ctrl-wheel enforcement and hint.
- `tests/chartFormModelV3.test.js` — generated-form and conditional-rule tests.
- `tests/wizardDraftV3.test.js` — navigation, draft, and dismissal state tests.
- `tests/chartConversionV3.test.js` — compatible and incompatible conversion tests.
- `tests/manualChartDataV3.test.js` — concise manual-entry tests.
- `tests/chartAuthoringComponentsV3.test.js` — SSR structure and contextual-section tests.
- `tests/chartZoomV3.test.js` — zoom guard event-policy tests.

### Modify

- `src/components/ColorField.jsx` — expose one normalized value/change contract if required.
- `src/components/charts/EChartsChartView.jsx` — wrap zoom-capable charts with `ZoomGuard`.
- `src/components/charts/ChartView.jsx` — pass schema zoom capability and title presentation.
- `src/components/DashboardRenderer.jsx` — use `EditSessionActions` at cutover-ready integration points.
- `src/styles.css` — wizard, editor, cards, forms, confirmations, preview, and zoom hint.

### Remove during the final cutover plan

- `src/components/AddChartWizard.jsx`
- `src/components/DataBindingEditor.jsx`
- `src/components/ChartSettingsPanelV2.jsx`
- `src/lib/chartOptionRegistry.js`

These files remain temporarily so the version-2 default dashboard stays operational until the cutover plan.

## Interfaces

`src/charting/forms/formModel.js` produces:

```js
export function buildWizardFormModel({
  draft,
  profile,
  prepared,
}): {
  steps: Array<{
    id: "type" | "source" | "roles" | "style",
    label: string,
    complete: boolean,
    prerequisites: string[],
  }>,
  canCreate: boolean,
};

export function buildEditorFormModel({
  chart,
  profile,
  prepared,
}): {
  sections: Array<{
    id: string,
    label: string,
    fields: Array<object>,
    advanced: boolean,
  }>,
  valid: boolean,
};
```

`src/charting/forms/wizardDraft.js` produces:

```js
export const WIZARD_STEPS = Object.freeze(["type", "source", "roles", "style"]);
export function createWizardState(): WizardState;
export function reduceWizardState(state: WizardState, action: WizardAction): WizardState;
export function finalizeWizardDraft(state: WizardState): {
  chart: ChartInstanceV3,
  source?: DataSourceV3,
};
```

`src/charting/forms/chartConversion.js` produces:

```js
export function planChartConversion(chart, targetTypeId): {
  kind: "compatible" | "remap",
  preservedRoles: object,
  requiredRoles: Array<object>,
  removedSettings: Array<{ path: string, label: string }>,
};

export function applyChartConversion(chart, targetTypeId, roleAssignments): ChartInstanceV3;
```

---

### Task 1: Derive generated forms and wizard state from schemas

**Files:**

- Create: `src/charting/forms/formModel.js`
- Create: `src/charting/forms/wizardDraft.js`
- Create: `tests/chartFormModelV3.test.js`
- Create: `tests/wizardDraftV3.test.js`

**Interfaces:**

- Consumes: chart schemas, draft, dataset profile, and prepared-data result
- Produces: `buildWizardFormModel`, `buildEditorFormModel`, `createWizardState`, and `reduceWizardState`

- [ ] **Step 1: Write failing form-derivation and navigation tests**

```js
test("axis roles put measurements before observations", () => {
  const model = buildEditorFormModel({
    chart: lineDraft,
    profile,
    prepared,
  });
  const roleIds = model.sections.find(({ id }) => id === "data").fields.map(({ id }) => id);
  assert.ok(roleIds.indexOf("measurements") < roleIds.indexOf("observation"));
});

test("X interpretation is hidden when the detected choice has no practical alternative", () => {
  const model = buildEditorFormModel({
    chart: lineDraft,
    profile: unambiguousIsoDateProfile,
    prepared,
  });
  assert.equal(
    model.sections.flatMap(({ fields }) => fields).some(({ id }) => id === "observationInterpretation"),
    false,
  );
});

test("every wizard tab is directly navigable", () => {
  const state = reduceWizardState(createWizardState(), { type: "navigate", step: "style" });
  assert.equal(state.activeStep, "style");
  assert.match(
    buildWizardFormModel({ draft: state.draft, profile: null, prepared: null })
      .steps.find(({ id }) => id === "style").prerequisites.join(" "),
    /Choose a chart type/,
  );
});
```

- [ ] **Step 2: Run the form tests and confirm missing-module failures**

Run:

```powershell
pnpm.cmd test -- tests/chartFormModelV3.test.js tests/wizardDraftV3.test.js
```

Expected: FAIL because the form modules are absent.

- [ ] **Step 3: Implement pure derivation and draft transitions**

```js
export function buildEditorFormModel({ chart, profile, prepared }) {
  const schema = getChartSchema(chart.typeId);
  return {
    sections: schema.form.sections
      .map((section) => materializeSection(section, { chart, profile, prepared }))
      .filter(({ fields }) => fields.length > 0),
    valid: validateChartInstance(chart, { profile, prepared }).length === 0,
  };
}
```

The reducer handles type selection, source selection, role updates, presentation updates, direct navigation, source-clear confirmation state, close confirmation state, and finalization. It must not contain type-specific `if` branches.

- [ ] **Step 4: Run form, schema, and configuration tests**

Run:

```powershell
pnpm.cmd test -- tests/chartFormModelV3.test.js tests/wizardDraftV3.test.js tests/chartSchemasV3.test.js tests/dashboardBundleV3.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/charting/forms/formModel.js src/charting/forms/wizardDraft.js tests/chartFormModelV3.test.js tests/wizardDraftV3.test.js
git commit -m "feat: derive chart forms from schemas"
```

### Task 2: Add safe chart conversion planning and application

**Files:**

- Create: `src/charting/forms/chartConversion.js`
- Create: `tests/chartConversionV3.test.js`

**Interfaces:**

- Consumes: current chart, target schema, and optional guided remapping
- Produces: `planChartConversion` and `applyChartConversion`

- [ ] **Step 1: Write failing conversion tests**

```js
test("line to area preserves compatible roles and title alignment", () => {
  const plan = planChartConversion(lineChart, "area");
  assert.equal(plan.kind, "compatible");
  const converted = applyChartConversion(lineChart, "area", {});
  assert.deepEqual(converted.roles, lineChart.roles);
  assert.equal(converted.presentation.title.align, "center");
});

test("line to pie requires category and value remapping", () => {
  const plan = planChartConversion(lineChart, "pie");
  assert.equal(plan.kind, "remap");
  assert.deepEqual(plan.requiredRoles.map(({ id }) => id), ["category", "value"]);
  assert.ok(plan.removedSettings.some(({ path }) => path === "presentation.axes"));
});
```

- [ ] **Step 2: Run the conversion test**

Run:

```powershell
pnpm.cmd test -- tests/chartConversionV3.test.js
```

Expected: FAIL because conversion functions are absent.

- [ ] **Step 3: Implement schema-declared conversion mappings**

```js
export function planChartConversion(chart, targetTypeId) {
  const source = getChartSchema(chart.typeId);
  const target = getChartSchema(targetTypeId);
  const compatible = source.conversions.includes(targetTypeId);
  return compatible
    ? compatiblePlan(chart, source, target)
    : remappingPlan(chart, source, target);
}
```

Apply changes only after target-role validation succeeds. Preserve the original object when the operation is canceled or invalid.

- [ ] **Step 4: Run conversion and schema tests**

Run:

```powershell
pnpm.cmd test -- tests/chartConversionV3.test.js tests/chartSchemasV3.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/charting/forms/chartConversion.js tests/chartConversionV3.test.js
git commit -m "feat: guide chart type conversions"
```

### Task 3: Add concise manual-data modeling

**Files:**

- Create: `src/charting/forms/manualData.js`
- Create: `tests/manualChartDataV3.test.js`

**Interfaces:**

- Consumes: selected chart schema and an editable row/column table
- Produces: `manualDataAllowed`, `createManualDataTemplate`, and `validateManualData`

- [ ] **Step 1: Write failing allow-list and validation tests**

```js
test("manual entry is limited to concise chart types", () => {
  for (const typeId of ["pie", "donut", "kpi", "gauge", "bullet", "deltaCard"]) {
    assert.equal(manualDataAllowed(getChartSchema(typeId)), true);
  }
  for (const typeId of ["deltaList", "line", "heatmap", "timeline"]) {
    assert.equal(manualDataAllowed(getChartSchema(typeId)), false);
  }
});

test("a delta card manual table requires displayed and comparison observations", () => {
  const result = validateManualData(deltaCardSchema, [{ label: "Current", value: "10" }]);
  assert.match(result.errors.join(" "), /comparison/i);
});
```

- [ ] **Step 2: Run the manual-data test**

Run:

```powershell
pnpm.cmd test -- tests/manualChartDataV3.test.js
```

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement schema-owned templates and validation**

```js
export function manualDataAllowed(schema) {
  return schema.sources.includes("inline");
}

export function createManualDataTemplate(schema) {
  return structuredClone(schema.manualData.template);
}
```

Validate non-empty headers, unique field IDs, numeric roles, temporal comparison values, and a bounded concise row count.

- [ ] **Step 4: Run manual-data and data-pipeline tests**

Run:

```powershell
pnpm.cmd test -- tests/manualChartDataV3.test.js tests/chartDataPipelineV3.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/charting/forms/manualData.js tests/manualChartDataV3.test.js
git commit -m "feat: support concise manual chart data"
```

### Task 4: Build curated generated-field and preview components

**Files:**

- Create: `src/components/chart-authoring/SchemaField.jsx`
- Create: `src/components/chart-authoring/RoleField.jsx`
- Create: `src/components/chart-authoring/StandardField.jsx`
- Create: `src/components/chart-authoring/CollectionSettingsField.jsx`
- Create: `src/components/chart-authoring/TimeSyncSettingsField.jsx`
- Create: `src/components/chart-authoring/GeneratedFormSection.jsx`
- Create: `src/components/chart-authoring/ChartPreview.jsx`
- Create: `src/components/chart-authoring/ChartTypePicker.jsx`
- Create: `tests/chartAuthoringComponentsV3.test.js`
- Modify: `src/components/ColorField.jsx`
- Modify: `src/styles.css`

**Interfaces:**

- Consumes: materialized form fields and one `onChange(path, value)` callback
- Produces: curated controls; never a raw schema/property viewer

- [ ] **Step 1: Write failing SSR tests for grouped cards and contextual fields**

```js
test("chart types render in searchable purpose groups", () => {
  const html = renderToStaticMarkup(
    React.createElement(ChartTypePicker, { value: "", onChange() {} }),
  );
  assert.match(html, /Comparison/);
  assert.match(html, /Readiness/);
  assert.match(html, /Timeline/);
  assert.match(html, /Pie/);
  assert.match(html, /Delta/);
});

test("background uses the same color field contract as series color", () => {
  const html = renderGeneratedSection(backgroundSection);
  assert.match(html, /data-color-field="background"/);
});
```

- [ ] **Step 2: Run the component test**

Run:

```powershell
pnpm.cmd test -- tests/chartAuthoringComponentsV3.test.js
```

Expected: FAIL because authoring components are missing.

- [ ] **Step 3: Implement curated control dispatch and actual preview**

```jsx
export default function SchemaField({ field, value, onChange }) {
  const sharedProps = { field, value, onChange };
  if (field.control === "role") return <RoleField {...sharedProps} />;
  if (field.control === "color") return <ColorField {...sharedProps} />;
  if (field.control === "collection") return <CollectionSettingsField {...sharedProps} />;
  if (field.control === "timeSync") return <TimeSyncSettingsField {...sharedProps} />;
  return <StandardField {...sharedProps} />;
}
```

`ChartPreview` calls the same `prepareChartData` and `ChartView` used by the final dashboard. Provide a bounded empty or invalid state with diagnostics beside the responsible field.

- [ ] **Step 4: Run authoring, view, and form tests**

Run:

```powershell
pnpm.cmd test -- tests/chartAuthoringComponentsV3.test.js tests/chartViewV3.test.js tests/chartFormModelV3.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/chart-authoring src/components/ColorField.jsx src/styles.css tests/chartAuthoringComponentsV3.test.js
git commit -m "feat: render curated schema controls"
```

### Task 5: Build the four-step chart wizard

**Files:**

- Create: `src/components/common/ConfirmDialog.jsx`
- Create: `src/components/chart-authoring/DataSourceStep.jsx`
- Create: `src/components/chart-authoring/DataRolesStep.jsx`
- Create: `src/components/chart-authoring/StyleLayoutStep.jsx`
- Create: `src/components/chart-authoring/ChartWizardV3.jsx`
- Modify: `tests/chartAuthoringComponentsV3.test.js`
- Modify: `src/styles.css`

**Interfaces:**

- Consumes: `{ open, dataSources, loadedData, onClose, onCreate }`
- Produces: `{ chart, source? }` only after version-3 validation succeeds

- [ ] **Step 1: Add failing SSR and state assertions for the approved workflow**

```js
test("wizard exposes four button tabs in the approved order", () => {
  const html = renderWizard();
  for (const label of ["Chart type", "Data source", "Data roles", "Style and layout"]) {
    assert.match(html, new RegExp(`<button[^>]*>${label}</button>`));
  }
});

test("duplicate controls are absent until prepared data reports duplicates", () => {
  assert.doesNotMatch(renderRoles({ duplicateGroupCount: 0 }), /Duplicate observations/);
  assert.match(renderRoles({ duplicateGroupCount: 2 }), /Duplicate observations/);
});
```

- [ ] **Step 2: Run authoring component tests**

Run:

```powershell
pnpm.cmd test -- tests/chartAuthoringComponentsV3.test.js tests/wizardDraftV3.test.js
```

Expected: FAIL for missing wizard components.

- [ ] **Step 3: Implement the wizard and discard confirmation**

```jsx
<nav aria-label="Chart creation steps">
  {model.steps.map((step) => (
    <button key={step.id} type="button" onClick={() => dispatch({ type: "navigate", step: step.id })}>
      {step.label}
    </button>
  ))}
</nav>
```

Step 1 has no visual customization. Step 2 shows source profile examples and warnings. Step 3 renders roles with measurements first for axis charts. Step 4 shows `ChartPreview` beside essential and Advanced presentation controls. Close opens `Discard chart?` with `Discard` and `Continue editing`.

- [ ] **Step 4: Run wizard, form, manual-data, and pipeline tests**

Run:

```powershell
pnpm.cmd test -- tests/chartAuthoringComponentsV3.test.js tests/wizardDraftV3.test.js tests/manualChartDataV3.test.js tests/chartDataPipelineV3.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/common/ConfirmDialog.jsx src/components/chart-authoring src/styles.css tests/chartAuthoringComponentsV3.test.js
git commit -m "feat: add schema-generated chart wizard"
```

### Task 6: Build the context-aware chart editor and conversion dialog

**Files:**

- Create: `src/components/chart-authoring/ChartEditorV3.jsx`
- Create: `src/components/chart-authoring/ContextualTabs.jsx`
- Create: `src/components/chart-authoring/ChartConversionDialog.jsx`
- Create: `src/components/chart-authoring/EditSessionActions.jsx`
- Modify: `tests/chartAuthoringComponentsV3.test.js`
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/styles.css`

**Interfaces:**

- Consumes: saved chart plus one editable draft
- Produces: `onSave(validatedChart)`, `onReset()`, `onCancel()`, and contextual sections

- [ ] **Step 1: Add failing contextual-tab and action tests**

```js
test("pie editing omits axes, map, timeline, and generic series tabs", () => {
  const html = renderEditor(pieChart);
  assert.match(html, /Data/);
  assert.match(html, /Appearance/);
  assert.doesNotMatch(html, />Axes</);
  assert.doesNotMatch(html, />Map</);
  assert.doesNotMatch(html, />Series</);
});

test("reset changes sits beside save and has confirmation copy", () => {
  const html = renderEditor(lineChart);
  assert.match(html, /Save/);
  assert.match(html, /Reset changes/);
  assert.match(html, /Discard these edits/);
});
```

- [ ] **Step 2: Run authoring component and conversion tests**

Run:

```powershell
pnpm.cmd test -- tests/chartAuthoringComponentsV3.test.js tests/chartConversionV3.test.js
```

Expected: FAIL because the editor components are absent.

- [ ] **Step 3: Implement editor sections, draft isolation, reset, and conversion**

```jsx
export default function ChartEditorV3({ chart, ...callbacks }) {
  const [draft, setDraft] = React.useState(() => structuredClone(chart));
  const model = buildEditorFormModel({ chart: draft, profile: callbacks.profile, prepared: callbacks.prepared });
  return (
    <form onSubmit={(event) => { event.preventDefault(); callbacks.onSave(draft); }}>
      <ContextualTabs sections={model.sections} />
      <ChartPreview chart={draft} {...callbacks.previewProps} />
      <EditSessionActions valid={model.valid} onReset={callbacks.onReset} />
    </form>
  );
}
```

Reset restores the most recently saved chart, not schema defaults. Conversion removal is confirmed before application.

- [ ] **Step 4: Run editor, conversion, and full unit tests**

Run:

```powershell
pnpm.cmd test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/chart-authoring src/components/DashboardRenderer.jsx src/styles.css tests/chartAuthoringComponentsV3.test.js
git commit -m "feat: add context-aware chart editor"
```

### Task 7: Enforce Ctrl-wheel zoom and correct title/background behavior

**Files:**

- Create: `src/components/charts/ZoomGuard.jsx`
- Create: `tests/chartZoomV3.test.js`
- Modify: `src/components/charts/EChartsChartView.jsx`
- Modify: `src/components/charts/ChartView.jsx`
- Modify: `src/components/chart-authoring/StyleLayoutStep.jsx`
- Modify: `src/styles.css`
- Modify: `tests/chartRenderingV3.test.js`

**Interfaces:**

- Consumes: schema `capabilities.zoom`, wheel event, and normalized presentation settings
- Produces: ordinary page scroll, Ctrl-wheel zoom, a rate-limited hint, and renderer-consistent title/background

- [ ] **Step 1: Write failing zoom-policy tests**

```js
test("plain wheel input is blocked from the chart without blocking page scroll", () => {
  const decision = wheelZoomDecision({ ctrlKey: false });
  assert.deepEqual(decision, { allowChartZoom: false, preventDefault: false, showHint: true });
});

test("Ctrl-wheel reaches the chart zoom handler", () => {
  const decision = wheelZoomDecision({ ctrlKey: true });
  assert.deepEqual(decision, { allowChartZoom: true, preventDefault: true, showHint: false });
});
```

- [ ] **Step 2: Run zoom and rendering tests**

Run:

```powershell
pnpm.cmd test -- tests/chartZoomV3.test.js tests/chartRenderingV3.test.js
```

Expected: FAIL because `ZoomGuard` and its pure policy are absent.

- [ ] **Step 3: Implement capture-phase guard and unified presentation fields**

```jsx
export function wheelZoomDecision(event) {
  return event.ctrlKey
    ? { allowChartZoom: true, preventDefault: true, showHint: false }
    : { allowChartZoom: false, preventDefault: false, showHint: true };
}
```

On plain wheel, stop chart-library propagation without calling `preventDefault`; show `Hold Ctrl while scrolling to zoom` at most once per focused hover session. On Ctrl-wheel, allow the renderer’s handler. Apply the same rule to custom map adapters during final integration.

Ensure custom card/table/image titles use `presentation.title.align`, and all background fields use `ColorField`.

- [ ] **Step 4: Run zoom, rendering, authoring, and full unit tests**

Run:

```powershell
pnpm.cmd test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/charts src/components/chart-authoring src/styles.css tests/chartZoomV3.test.js tests/chartRenderingV3.test.js
git commit -m "fix: unify chart presentation and zoom"
```
