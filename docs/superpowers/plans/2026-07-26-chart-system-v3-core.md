# SimEx Chart System V3 Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the validated version-3 chart schema, data-preparation, configuration, and rendering core for every approved chart family without yet replacing the live version-2 authoring interface.

**Architecture:** Add a focused `src/charting/` subsystem whose schemas are the single source of truth and whose preparers produce renderer-ready models. Keep the live dashboard on its existing path until the later cutover plan, but test the new core directly so every task leaves the repository green.

**Tech Stack:** JavaScript ES modules, React 19, ECharts 5.6, Papa Parse, Vite 6 SSR, Node test runner

## Global Constraints

- Work only in `C:\Users\hekma\Documents\SimEx Dashboard\.worktrees\simex-dashboard-v2\chart-wizard-revamp`.
- Remain on `codex/chart-wizard-revamp`, descended from `8abca5e`.
- Do not read or write a OneDrive path.
- Do not modify the existing `codex/showcase-home` worktree.
- Do not merge, push, deploy, or update a Cloudflare branch.
- Treat dashboard configuration version 3 as a clean break; do not add version-2 migration behavior.
- Use no new runtime dependency unless a later test proves the existing stack cannot satisfy an approved requirement.
- Use test-driven development for every behavior change.
- Preserve the passing showcase and Quorum Phase 5 tests while this parallel core is introduced.
- Commit each task independently.

---

## File Structure

### Create

- `src/charting/schemas/schemaTypes.js` — JSDoc contracts and shared schema constants.
- `src/charting/schemas/validateChartSchema.js` — fail-fast schema validation.
- `src/charting/schemas/axisSchemas.js` — bar, line, area, and mixed definitions.
- `src/charting/schemas/compositionSchemas.js` — pie and donut definitions.
- `src/charting/schemas/targetSchemas.js` — KPI, gauge, bullet, delta card, and delta list definitions.
- `src/charting/schemas/relationshipSchemas.js` — scatter and bubble definitions.
- `src/charting/schemas/readinessSchemas.js` — heatmap and readiness-matrix definitions.
- `src/charting/schemas/timelineSchemas.js` — timeline and swimlane definitions.
- `src/charting/schemas/geographySchemas.js` — choropleth, chronological choropleth, and map-scatter definitions.
- `src/charting/schemas/operationalSchemas.js` — table and image definitions.
- `src/charting/schemas/chartSchemaRegistry.js` — validated registry and discovery API.
- `src/charting/data/temporal.js` — deterministic temporal parsing and normalization.
- `src/charting/data/profileDataset.js` — reusable dataset profile and source fingerprint.
- `src/charting/data/transforms.js` — filters, grouping, aggregation, and duplicate detection.
- `src/charting/data/prepareChartData.js` — shared preparation entry point and readiness contract.
- `src/charting/data/prepareAxisData.js` — axis-series preparation.
- `src/charting/data/prepareCompositionData.js` — pie/donut preparation.
- `src/charting/data/prepareRelationshipData.js` — scatter/bubble preparation.
- `src/charting/data/prepareMatrixData.js` — heatmap/readiness preparation.
- `src/charting/data/prepareTimelineData.js` — timeline/swimlane preparation.
- `src/charting/data/prepareTargetData.js` — KPI, gauge, bullet, and delta preparation.
- `src/charting/data/prepareGeographyData.js` — geographic join preparation.
- `src/charting/data/prepareOperationalData.js` — table and image preparation.
- `src/charting/config/chartConfigV3.js` — chart-instance defaults and validation.
- `src/charting/config/dashboardBundleV3.js` — strict version-3 bundle serialization.
- `src/charting/rendering/renderAdapterRegistry.js` — schema adapter lookup.
- `src/charting/rendering/buildRenderModel.js` — renderer-neutral output entry point.
- `src/charting/rendering/axisAdapter.js` — ECharts axis options.
- `src/charting/rendering/compositionAdapter.js` — pie/donut options.
- `src/charting/rendering/relationshipAdapter.js` — scatter/bubble options.
- `src/charting/rendering/matrixAdapter.js` — heatmap/readiness options.
- `src/charting/rendering/timelineAdapter.js` — timeline/swimlane options.
- `src/charting/rendering/targetAdapter.js` — gauge/bullet and card render models.
- `src/charting/rendering/geographyAdapter.js` — geographic render models.
- `src/charting/rendering/operationalAdapter.js` — table/image render models.
- `src/components/charts/ChartView.jsx` — renders a version-3 render model.
- `src/components/charts/EChartsChartView.jsx` — shared ECharts host.
- `src/components/charts/CardChartView.jsx` — KPI, delta, bullet-card, and gauge-card item output.
- `src/components/charts/TableChartView.jsx` — version-3 table output.
- `src/components/charts/ImageChartView.jsx` — version-3 image output.
- `tests/chartSchemasV3.test.js` — schema catalogue and validation tests.
- `tests/chartTemporalV3.test.js` — temporal parser regression tests.
- `tests/chartDataPipelineV3.test.js` — role, transform, delta, and readiness tests.
- `tests/dashboardBundleV3.test.js` — configuration and bundle tests.
- `tests/chartRenderingV3.test.js` — rendering-adapter tests.
- `tests/chartViewV3.test.js` — SSR component dispatch tests.

### Modify

- `src/styles.css` — minimal version-3 chart primitives used by SSR and later UI plans.

## Core Interfaces

`src/charting/schemas/chartSchemaRegistry.js` produces:

```js
export const CHART_SCHEMA_VERSION = 3;
export function listChartSchemas(): ReadonlyArray<ChartTypeSchema>;
export function getChartSchema(typeId: string): ChartTypeSchema;
export function listChartSchemaGroups(): ReadonlyArray<{
  id: string,
  label: string,
  charts: ReadonlyArray<ChartTypeSchema>,
}>;
```

Each schema uses:

```js
{
  version: 3,
  typeId: "line",
  label: "Line",
  group: "trends",
  description: "Show how one or more measurements change.",
  sources: ["dataset"],
  roles: [{
    id: "measurements",
    label: "Measurements",
    accepts: ["number"],
    min: 1,
    max: null,
  }],
  transforms: ["filter", "aggregate", "duplicates"],
  form: {
    sections: ["data", "appearance", "labels", "axes", "interactions", "advanced"],
  },
  dataFamily: "axis",
  renderer: "axis",
  capabilities: {
    timeSync: true,
    collection: false,
    zoom: true,
  },
  conversions: ["bar", "area", "mixed"],
  manualData: null,
  semantics: {
    purpose: "trend",
    mark: "line",
  },
}
```

Chart instances use one consistent version-3 shape:

```js
{
  configVersion: 3,
  id: "bio_confirmed_cases",
  typeId: "line",
  title: "Confirmed cases",
  description: "Cumulative confirmed cases over time.",
  sourceId: "bio_cases",
  roles: {
    measurements: [{ field: "national_total_cases", axis: "primary" }],
    observation: { field: "date", interpretation: "temporal" },
  },
  transformations: {
    filters: [],
    aggregation: "sum",
    duplicates: "sum",
    missingValues: "gap",
  },
  presentation: {
    title: { align: "left" },
    collection: null,
  },
  interaction: {
    zoom: { enabled: true },
    timeSync: { groupId: "national_outbreak", policy: "exact" },
  },
  layout: { size: "wide" },
}
```

`src/charting/data/prepareChartData.js` produces:

```js
export function prepareChartData({
  chart,
  rows,
  geoData,
  datasetProfile,
  timeContext,
}): {
  status: "ready" | "invalid" | "empty",
  marks: Array<object>,
  diagnostics: Array<{
    code: string,
    severity: "info" | "warning" | "error",
    message: string,
    field?: string,
  }>,
  meta: {
    rowsBefore: number,
    rowsAfter: number,
    markCount: number,
    duplicateGroupCount: number,
  },
}
```

`src/charting/rendering/buildRenderModel.js` produces:

```js
export function buildRenderModel({
  chart,
  prepared,
  geoData,
  renderContext,
}):
  | { kind: "echarts", option: object, replaceMerge?: string[] }
  | { kind: "cards", items: object[], presentation: object }
  | { kind: "table", columns: object[], rows: object[] }
  | { kind: "image", src: string, alt: string, fit: string }
  | { kind: "error", message: string };
```

---

### Task 1: Define and validate the complete chart schema catalogue

**Files:**

- Create: `src/charting/schemas/schemaTypes.js`
- Create: `src/charting/schemas/validateChartSchema.js`
- Create: `src/charting/schemas/axisSchemas.js`
- Create: `src/charting/schemas/compositionSchemas.js`
- Create: `src/charting/schemas/targetSchemas.js`
- Create: `src/charting/schemas/relationshipSchemas.js`
- Create: `src/charting/schemas/readinessSchemas.js`
- Create: `src/charting/schemas/timelineSchemas.js`
- Create: `src/charting/schemas/geographySchemas.js`
- Create: `src/charting/schemas/operationalSchemas.js`
- Create: `src/charting/schemas/chartSchemaRegistry.js`
- Test: `tests/chartSchemasV3.test.js`

**Interfaces:**

- Consumes: approved chart catalogue in the design specification
- Produces: `CHART_SCHEMA_VERSION`, `listChartSchemas`, `getChartSchema`, and `listChartSchemaGroups`

- [ ] **Step 1: Write the failing catalogue tests**

```js
test("version 3 exposes every approved chart type in purpose order", () => {
  assert.deepEqual(
    listChartSchemas().map(({ typeId }) => typeId),
    [
      "bar", "groupedBar", "stackedBar", "horizontalBar",
      "horizontalStackedBar", "line", "area", "mixed", "pie", "donut",
      "kpi", "gauge", "bullet", "deltaCard", "deltaList", "scatter",
      "bubble", "heatmap", "readinessMatrix", "timeline", "swimlane",
      "choroplethMap", "chronoChoroplethMap", "mapScatter", "table", "image",
    ],
  );
});

test("invalid schemas fail before the application renders", () => {
  assert.throws(
    () => validateChartSchema({ version: 3, typeId: "broken", roles: [] }),
    /label/,
  );
});
```

- [ ] **Step 2: Run the test and confirm the missing module failure**

Run:

```powershell
pnpm.cmd test -- tests/chartSchemasV3.test.js
```

Expected: FAIL because `chartSchemaRegistry.js` does not exist.

- [ ] **Step 3: Implement the validator, family definitions, and frozen registry**

```js
const schemas = [
  ...axisSchemas,
  ...compositionSchemas,
  ...targetSchemas,
  ...relationshipSchemas,
  ...readinessSchemas,
  ...timelineSchemas,
  ...geographySchemas,
  ...operationalSchemas,
].map(validateChartSchema);

const byType = new Map(schemas.map((schema) => [schema.typeId, Object.freeze(schema)]));

export function getChartSchema(typeId) {
  const schema = byType.get(typeId);
  if (!schema) throw new Error(`Unknown chart type "${typeId}".`);
  return schema;
}
```

Include tests for duplicate IDs, unknown sections, invalid role cardinality, missing renderers, invalid conversion targets, collection capability consistency, temporal capability consistency, and schema immutability.

- [ ] **Step 4: Run the schema test**

Run:

```powershell
pnpm.cmd test -- tests/chartSchemasV3.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/charting/schemas tests/chartSchemasV3.test.js
git commit -m "feat: define chart schema v3 catalogue"
```

### Task 2: Add deterministic dataset profiling and temporal parsing

**Files:**

- Create: `src/charting/data/temporal.js`
- Create: `src/charting/data/profileDataset.js`
- Test: `tests/chartTemporalV3.test.js`

**Interfaces:**

- Consumes: raw row objects and optional author-confirmed parsing metadata
- Produces: `parseTemporalValue`, `normalizeTemporalColumn`, and `profileDataset`

- [ ] **Step 1: Write the ambiguous-date and override tests**

```js
test("DD/MM/YYYY is parsed only through an explicit or unambiguous rule", () => {
  const ambiguous = parseTemporalValue("02/05/2027", { interpretation: "auto" });
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.diagnostic.code, "ambiguous-date-format");

  const parsed = parseTemporalValue("02/05/2027", {
    interpretation: "temporal",
    format: "DD/MM/YYYY",
    timezone: "date-only",
  });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.canonical, "2027-05-02");
});

test("a forced category interpretation wins over a date-shaped field name", () => {
  const profile = profileDataset(
    [{ date: "02/05/2027", deaths: "2590" }],
    { date: { interpretation: "category" } },
  );
  assert.equal(profile.columns.find(({ name }) => name === "date").type, "category");
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```powershell
pnpm.cmd test -- tests/chartTemporalV3.test.js
```

Expected: FAIL because the temporal module is absent.

- [ ] **Step 3: Implement explicit parsers and reusable profiles**

```js
const FORMAT_PARSERS = {
  "YYYY-MM-DD": parseIsoDateOnly,
  "DD/MM/YYYY": parseDayMonthYear,
  "MM/DD/YYYY": parseMonthDayYear,
  "ISO-8601": parseIsoInstant,
};

export function parseTemporalValue(value, specification = {}) {
  const format = specification.format ?? detectUnambiguousFormat(value);
  if (!format) return failedTemporal("ambiguous-date-format", value);
  return FORMAT_PARSERS[format](String(value), specification);
}
```

Profile numeric, category, boolean, temporal, geographic-hint, missing-count, unique-count, examples, and deterministic fingerprint fields. Never call `Date.parse` for ambiguous source strings.

- [ ] **Step 4: Run temporal and baseline tests**

Run:

```powershell
pnpm.cmd test -- tests/chartTemporalV3.test.js tests/chartDataModel.test.js
```

Expected: PASS; the version-2 tests remain unchanged.

- [ ] **Step 5: Commit**

```powershell
git add src/charting/data/temporal.js src/charting/data/profileDataset.js tests/chartTemporalV3.test.js
git commit -m "feat: add deterministic chart data profiling"
```

### Task 3: Build the shared renderer-ready data pipeline

**Files:**

- Create: `src/charting/data/transforms.js`
- Create: `src/charting/data/prepareChartData.js`
- Create: `src/charting/data/prepareAxisData.js`
- Create: `src/charting/data/prepareCompositionData.js`
- Create: `src/charting/data/prepareRelationshipData.js`
- Create: `src/charting/data/prepareMatrixData.js`
- Create: `src/charting/data/prepareTimelineData.js`
- Create: `src/charting/data/prepareTargetData.js`
- Create: `src/charting/data/prepareGeographyData.js`
- Create: `src/charting/data/prepareOperationalData.js`
- Test: `tests/chartDataPipelineV3.test.js`

**Interfaces:**

- Consumes: a validated chart instance, rows, profile, optional geography, and optional time context
- Produces: the `prepareChartData` readiness contract used unchanged by preview and rendering

- [ ] **Step 1: Write failing readiness, role, duplicate, and delta tests**

```js
test("ready means the adapter receives at least one renderable mark", () => {
  const result = prepareChartData({
    chart: mortalityBarChart,
    rows: [{ date: "02/05/2027", age: "total_deaths", deaths: "2590" }],
    datasetProfile: mortalityProfile,
  });
  assert.equal(result.status, "ready");
  assert.equal(result.marks[0].x, "2027-05-02");
  assert.equal(result.meta.markCount, 1);
});

test("duplicate resolution appears in metadata only when role keys collide", () => {
  const result = prepareChartData({
    chart: groupedBarChart,
    rows: duplicateRows,
    datasetProfile: duplicateProfile,
  });
  assert.equal(result.meta.duplicateGroupCount, 1);
  assert.ok(result.diagnostics.some(({ code }) => code === "duplicate-observations"));
});

test("delta card reports displayed, comparison, absolute, and percentage values", () => {
  const result = prepareChartData({
    chart: previousObservationDelta,
    rows: [{ at: "2027-05-01", value: 8 }, { at: "2027-05-02", value: 10 }],
    datasetProfile: deltaProfile,
  });
  assert.deepEqual(result.marks[0].delta, { absolute: 2, percentage: 25 });
});
```

- [ ] **Step 2: Run the pipeline test and confirm it fails**

Run:

```powershell
pnpm.cmd test -- tests/chartDataPipelineV3.test.js
```

Expected: FAIL because `prepareChartData` is missing.

- [ ] **Step 3: Implement shared transforms and family preparers**

```js
const PREPARERS = {
  axis: prepareAxisData,
  composition: prepareCompositionData,
  relationship: prepareRelationshipData,
  matrix: prepareMatrixData,
  timeline: prepareTimelineData,
  target: prepareTargetData,
  geography: prepareGeographyData,
  operational: prepareOperationalData,
};

export function prepareChartData(input) {
  const schema = getChartSchema(input.chart.typeId);
  const transformed = applyTransforms(input.rows, input.chart.transformations);
  const result = PREPARERS[schema.dataFamily]({ ...input, rows: transformed.rows });
  return finalizePreparedResult(result, transformed);
}
```

Implement role cardinality checks, field-type checks, filters, cluster keys, primary/secondary axis metadata, duplicate detection, explicit aggregation, missing-value behavior, and chart-family mark shapes.

- [ ] **Step 4: Run pipeline, temporal, and schema tests**

Run:

```powershell
pnpm.cmd test -- tests/chartDataPipelineV3.test.js tests/chartTemporalV3.test.js tests/chartSchemasV3.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/charting/data tests/chartDataPipelineV3.test.js
git commit -m "feat: prepare renderer-ready chart data"
```

### Task 4: Define strict version-3 chart configuration and bundles

**Files:**

- Create: `src/charting/config/chartConfigV3.js`
- Create: `src/charting/config/dashboardBundleV3.js`
- Test: `tests/dashboardBundleV3.test.js`

**Interfaces:**

- Consumes: version-3 chart and dashboard objects
- Produces: `createChartDraft`, `validateChartInstance`, `validateDashboardConfig`, `serializeDashboardBundle`, and `parseDashboardBundle`

- [ ] **Step 1: Write failing configuration and bundle tests**

```js
test("version 3 bundles round-trip uploaded and inline sources", () => {
  const bundle = serializeDashboardBundle(version3Dashboard, {
    now: "2026-07-26T12:00:00.000Z",
  });
  assert.equal(bundle.bundleType, "simex-dashboard-bundle");
  assert.equal(bundle.version, 3);
  assert.deepEqual(parseDashboardBundle(JSON.stringify(bundle)), version3Dashboard);
});

test("version 2 bundles are rejected with an actionable message", () => {
  assert.throws(
    () => parseDashboardBundle(JSON.stringify({ bundleType: "simex-dashboard-v2-bundle", version: 2 })),
    /supports version 3/,
  );
});
```

- [ ] **Step 2: Run the bundle test and confirm it fails**

Run:

```powershell
pnpm.cmd test -- tests/dashboardBundleV3.test.js
```

Expected: FAIL because the bundle module is absent.

- [ ] **Step 3: Implement strict constructors, validation, and serialization**

```js
export const DASHBOARD_CONFIG_VERSION = 3;
export const DASHBOARD_BUNDLE_TYPE = "simex-dashboard-bundle";

export function validateDashboardConfig(config) {
  if (config?.configVersion !== DASHBOARD_CONFIG_VERSION) {
    throw new Error("Dashboard configuration version 3 is required.");
  }
  for (const chart of configuredCharts(config)) validateChartInstance(chart);
  return config;
}

export function parseDashboardBundle(text) {
  const bundle = JSON.parse(text);
  if (bundle.bundleType !== DASHBOARD_BUNDLE_TYPE || bundle.version !== 3) {
    throw new Error("This dashboard supports version 3 bundles only.");
  }
  return validateDashboardConfig(structuredClone(bundle.config));
}
```

Keep runtime-only loaded rows outside serialized configuration. Preserve uploaded CSV text, inline data, parsing metadata, provenance, and source fingerprints.

- [ ] **Step 4: Run the bundle and schema tests**

Run:

```powershell
pnpm.cmd test -- tests/dashboardBundleV3.test.js tests/chartSchemasV3.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/charting/config tests/dashboardBundleV3.test.js
git commit -m "feat: define dashboard bundle version 3"
```

### Task 5: Add the renderer registry and shared ECharts adapters

**Files:**

- Create: `src/charting/rendering/renderAdapterRegistry.js`
- Create: `src/charting/rendering/buildRenderModel.js`
- Create: `src/charting/rendering/axisAdapter.js`
- Create: `src/charting/rendering/compositionAdapter.js`
- Create: `src/charting/rendering/relationshipAdapter.js`
- Create: `src/charting/rendering/matrixAdapter.js`
- Create: `src/charting/rendering/timelineAdapter.js`
- Create: `src/charting/rendering/targetAdapter.js`
- Create: `src/charting/rendering/geographyAdapter.js`
- Create: `src/charting/rendering/operationalAdapter.js`
- Test: `tests/chartRenderingV3.test.js`

**Interfaces:**

- Consumes: validated prepared data and render context
- Produces: `getRenderAdapter` and `buildRenderModel`

- [ ] **Step 1: Write failing option-shape tests for every renderer**

```js
test("pie and donut produce actual ECharts pie series", () => {
  const pie = buildRenderModel({ chart: pieChart, prepared: piePrepared });
  const donut = buildRenderModel({ chart: donutChart, prepared: piePrepared });
  assert.equal(pie.option.series[0].type, "pie");
  assert.equal(pie.option.series[0].radius[0], "0%");
  assert.notEqual(donut.option.series[0].radius[0], "0%");
});

test("title alignment is normalized into the ECharts title", () => {
  const model = buildRenderModel({ chart: centeredLineChart, prepared: linePrepared });
  assert.equal(model.option.title.left, "center");
});

test("forced category dates never become an ECharts time axis", () => {
  const model = buildRenderModel({ chart: categoryDateChart, prepared: categoryPrepared });
  assert.equal(model.option.xAxis.type, "category");
});
```

Add assertions for bar, grouped, stacked, horizontal, line, area, mixed, scatter, bubble, heatmap, readiness matrix, timeline, swimlane, gauge, bullet, choropleth, chronological choropleth, map scatter, cards, table, and image.

- [ ] **Step 2: Run the rendering test and confirm it fails**

Run:

```powershell
pnpm.cmd test -- tests/chartRenderingV3.test.js
```

Expected: FAIL because the rendering modules are absent.

- [ ] **Step 3: Implement the adapter registry and render-model builders**

```js
const ADAPTERS = Object.freeze({
  axis: buildAxisRenderModel,
  composition: buildCompositionRenderModel,
  relationship: buildRelationshipRenderModel,
  matrix: buildMatrixRenderModel,
  timeline: buildTimelineRenderModel,
  target: buildTargetRenderModel,
  geography: buildGeographyRenderModel,
  operational: buildOperationalRenderModel,
});

export function buildRenderModel(input) {
  if (input.prepared.status !== "ready") {
    return { kind: "error", message: readinessMessage(input.prepared) };
  }
  return getRenderAdapter(getChartSchema(input.chart.typeId).renderer)(input);
}
```

Adapters consume canonical marks only. They must not inspect raw rows or infer date behavior from field names.

- [ ] **Step 4: Run rendering and data-pipeline tests**

Run:

```powershell
pnpm.cmd test -- tests/chartRenderingV3.test.js tests/chartDataPipelineV3.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/charting/rendering tests/chartRenderingV3.test.js
git commit -m "feat: render schema-driven chart families"
```

### Task 6: Render version-3 models through focused React components

**Files:**

- Create: `src/components/charts/ChartView.jsx`
- Create: `src/components/charts/EChartsChartView.jsx`
- Create: `src/components/charts/CardChartView.jsx`
- Create: `src/components/charts/TableChartView.jsx`
- Create: `src/components/charts/ImageChartView.jsx`
- Create: `tests/chartViewV3.test.js`
- Modify: `src/styles.css`

**Interfaces:**

- Consumes: `{ chart, rows, geoData, datasetProfile, renderContext, timeContext }`
- Produces: `ChartView` and semantic, accessible output for every `RenderModel.kind`

- [ ] **Step 1: Write failing SSR dispatch and accessible-card tests**

```js
test("card render models expose labels, values, deltas, and provenance", () => {
  const html = renderToStaticMarkup(
    React.createElement(ChartView, {
      chart: deltaCard,
      rows: deltaRows,
      datasetProfile: deltaProfile,
    }),
  );
  assert.match(html, /Current capacity/);
  assert.match(html, /\+2/);
  assert.match(html, /Compared with 2027-05-01/);
});

test("invalid prepared data renders a bounded chart error", () => {
  const html = renderToStaticMarkup(
    React.createElement(ChartView, { chart: invalidChart, rows: [] }),
  );
  assert.match(html, /chart-status-error/);
});
```

- [ ] **Step 2: Run the SSR test and confirm it fails**

Run:

```powershell
pnpm.cmd test -- tests/chartViewV3.test.js
```

Expected: FAIL because `ChartView.jsx` is absent.

- [ ] **Step 3: Implement focused component dispatch**

```jsx
export default function ChartView(props) {
  const prepared = prepareChartData(props);
  const model = buildRenderModel({ ...props, prepared });
  if (model.kind === "echarts") return <EChartsChartView model={model} chart={props.chart} />;
  if (model.kind === "cards") return <CardChartView model={model} chart={props.chart} />;
  if (model.kind === "table") return <TableChartView model={model} chart={props.chart} />;
  if (model.kind === "image") return <ImageChartView model={model} chart={props.chart} />;
  return <div className="chart-status-error" role="status">{model.message}</div>;
}
```

Keep the new component independent of `ChartPanel` until the version-3 cutover. Add accessible title, description, value, target, delta direction, and source text.

- [ ] **Step 4: Run SSR, rendering, and full unit tests**

Run:

```powershell
pnpm.cmd test
```

Expected: all existing and version-3 unit tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/charts src/styles.css tests/chartViewV3.test.js
git commit -m "feat: add version 3 chart view"
```

### Task 7: Verify the parallel core against the app baseline

**Files:**

- Modify only if a test exposes a defect in files created by Tasks 1–6.

**Interfaces:**

- Consumes: the complete version-3 core
- Produces: a green baseline ready for the time/collection plan

- [ ] **Step 1: Run the full unit suite**

Run:

```powershell
pnpm.cmd test
```

Expected: PASS.

- [ ] **Step 2: Run the production build**

Run:

```powershell
pnpm.cmd build
```

Expected: PASS; the documented Vite large-bundle warning is non-failing.

- [ ] **Step 3: Run the existing browser suite**

Run:

```powershell
pnpm.cmd test:e2e
```

Expected: all showcase and Quorum Phase 5 tests PASS.

- [ ] **Step 4: Confirm scope and cleanliness**

Run:

```powershell
git status --short
git diff --check
```

Expected: no uncommitted generated catalogue or build output; no whitespace errors.

- [ ] **Step 5: Record the verification commit only if fixes were required**

```powershell
git add src/charting src/components/charts tests
git commit -m "test: harden chart system v3 core"
```

If no files changed, do not create an empty commit.
