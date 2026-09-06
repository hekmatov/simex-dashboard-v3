import assert from "node:assert/strict";
import { open, readFile } from "node:fs/promises";
import test from "node:test";
import { register } from "node:module";
import path from "node:path";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { normalizeCollectionSettings } from "../src/charting/collection/collectionModel.js";
import {
  createChartDraft,
  normalizeChartInstance,
  validateChartInstance,
} from "../src/charting/config/chartConfigV3.js";
import { prepareChartData } from "../src/charting/data/prepareChartData.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { validateChronoGroups } from "../src/charting/time/chronoGroupModel.js";
import {
  createWizardState,
  finalizeWizardDraft,
  reduceWizardState,
} from "../src/charting/forms/wizardDraft.js";
import {
  buildCsvContentDraft,
  createContentDraftCoordinator,
} from "../src/content-library/contentDraftTransaction.js";
import { makeDashboardV5 } from "./helpers/contentLibraryFixtures.js";
import {
  buildEditorFormModel,
  buildWizardFormModel,
} from "../src/charting/forms/formModel.js";
import {
  createChartEditSession,
  prepareChartEditSessionSave,
  reduceChartEditSession,
} from "../src/charting/forms/chartEditSession.js";
import { projectChartCreateOwner } from "../src/charting/forms/chartDraftSession.js";
import {
  applyGeographySourceSelection,
} from "../src/charting/forms/geographySource.js";
import * as geographySource from "../src/charting/forms/geographySource.js";
import { parseCsvText } from "../src/lib/loadCsv.js";
import { validateGeoJson } from "../src/lib/loadDashboard.js";

const ROOT = path.resolve(import.meta.dirname, "..");

const viteModuleUrl = import.meta.resolve("vite");
register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    const { transformWithEsbuild } = await import(${JSON.stringify(viteModuleUrl)});
    const source = loaded.source.toString().replaceAll("import.meta.env.BASE_URL", JSON.stringify("/"));
    const transformed = await transformWithEsbuild(source, url, { loader: "jsx", format: "esm" });
    return { format: "module", source: transformed.code, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

const { default: ChartTypePicker } = await import(
  "../src/components/chart-authoring/ChartTypePicker.jsx"
);
const { default: GeneratedFormSection } = await import(
  "../src/components/chart-authoring/GeneratedFormSection.jsx"
);
const {
  default: CollectionSettingsField,
  updateCollectionSettings,
} = await import(
  "../src/components/chart-authoring/CollectionSettingsField.jsx"
);
const {
  default: ChronoMembershipSettingsField,
  proposeChronoGroupMatching,
} = await import(
  "../src/components/chart-authoring/ChronoMembershipSettingsField.jsx"
);
const {
  default: DeltaComparisonField,
  deltaMatchingPolicies,
} = await import(
  "../src/components/chart-authoring/DeltaComparisonField.jsx"
);
const { default: RoleField } = await import(
  "../src/components/chart-authoring/RoleField.jsx"
);
const {
  default: StandardField,
  detectedFilterValues,
  filterForOperator,
  parseTargetRangesInput,
  updateStructuredFieldValue,
} = await import(
  "../src/components/chart-authoring/StandardField.jsx"
);
const {
  default: ChartPreview,
  buildPreviewDiagnostics,
} = await import(
  "../src/components/chart-authoring/ChartPreview.jsx"
);
const {
  default: ColorField,
  describeColorContrast,
} = await import("../src/components/ColorField.jsx");
const { default: SchemaField } = await import(
  "../src/components/chart-authoring/SchemaField.jsx"
);
const { default: SeriesColorsField } = await import(
  "../src/components/chart-authoring/SeriesColorsField.jsx"
);
const {
  default: ConfirmDialog,
} = await import("../src/components/common/ConfirmDialog.jsx");
const {
  default: DataSourceStep,
} = await import(
  "../src/components/chart-authoring/DataSourceStep.jsx"
);
const {
  default: DataSourcePicker,
} = await import(
  "../src/components/source-content/DataSourcePicker.jsx"
);
const {
  default: DataRolesStep,
} = await import(
  "../src/components/chart-authoring/DataRolesStep.jsx"
);
const {
  default: StyleLayoutStep,
} = await import(
  "../src/components/chart-authoring/StyleLayoutStep.jsx"
);
const chartWizardModule = await import(
  "../src/components/chart-authoring/ChartWizardV3.jsx"
);
const {
  default: ChartWizardV3,
  applyWizardMembership,
  buildChartEditPlacementMove,
  buildChartWizardEditCommitPayload,
  chartDestinationForType,
  chartEditDraftIdentity,
  createChartWizardEditState,
  createEditModePendingRuntime,
  createChartCsvDraftLifecycle,
  createChartWizardState,
  createWizardCloseHandlers,
  discardConfirmationRequired,
  createWizardPreparation,
  isChartWizardStateDirty,
  parseUploadedCsvFile,
  routeChartWizardCommit,
  submitWizardDraft,
} = chartWizardModule;
const scheduleAfterPaintModule = await import(
  "../src/lib/scheduleAfterPaint.js"
).catch(() => ({}));
const { scheduleAfterPaint } = scheduleAfterPaintModule;
const {
  default: ChartEditorV3,
  acceptEditorSave,
  applyChartEditorSave,
  buildDashboardEditorProfiles,
  createChartEditorState,
  isChartEditorStateDirty,
  rebaseChartEditorState,
  reduceChartEditorState,
  saveChartEditorState,
  SelectedChartEditor,
} = await import(
  "../src/components/chart-authoring/ChartEditorV3.jsx"
);
const {
  default: ContextualTabs,
  buildContextualTabs,
} = await import(
  "../src/components/chart-authoring/ContextualTabs.jsx"
);
const {
  default: ChartConversionDialog,
} = await import(
  "../src/components/chart-authoring/ChartConversionDialog.jsx"
);
const {
  default: EditSessionActions,
} = await import(
  "../src/components/chart-authoring/EditSessionActions.jsx"
);
const { default: ChartFootprintPicker } = await import(
  "../src/components/chart-authoring/ChartFootprintPicker.jsx"
);
const { default: ChartQuickEditor } = await import(
  "../src/components/chart-authoring/ChartQuickEditor.jsx"
);
const { default: DashboardHeader } = await import(
  "../src/components/dashboard/DashboardHeader.jsx"
);
const { IconControl } = await import(
  "../src/components/common/SimExIcon.js"
);

const backgroundSection = {
  id: "appearance",
  label: "Appearance",
  fields: [{
    id: "background",
    label: "Background color",
    control: "color",
    path: ["presentation", "background", "color"],
    value: "",
  }],
};

const deltaField = {
  id: "deltaComparison",
  label: "Comparison",
  control: "deltaComparison",
  path: ["transformations", "comparison"],
  modes: ["previousObservation", "fixedTime"],
  matchingPolicies: ["exact", "lastKnown", "nearest", "interpolate"],
};

function render(element) {
  return renderToStaticMarkup(element);
}

test("a blank page description renders no subtitle element or reserved gap", () => {
  const markup = render(
    React.createElement(DashboardHeader, {
      activePage: { id: "status", title: "Status", description: "" },
      dashboard: { title: "Dashboard", description: "Dashboard supporting text" },
    }),
  );

  assert.doesNotMatch(markup, /class="subtitle"/);
});

test("post-paint chart preparation is deferred and cancellable", () => {
  assert.equal(typeof scheduleAfterPaint, "function");
  const frames = new Map();
  const timers = new Map();
  let sequence = 0;
  const scheduler = {
    requestAnimationFrame(callback) {
      const id = ++sequence;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    setTimeout(callback) {
      const id = ++sequence;
      timers.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
  const events = [];
  scheduleAfterPaint(() => events.push("prepared"), scheduler);
  assert.deepEqual(events, []);
  for (const callback of [...frames.values()]) callback();
  frames.clear();
  assert.deepEqual(events, []);
  for (const callback of [...timers.values()]) callback();
  timers.clear();
  assert.deepEqual(events, ["prepared"]);

  const cancel = scheduleAfterPaint(() => events.push("stale"), scheduler);
  cancel();
  assert.equal(frames.size, 0);
  assert.equal(timers.size, 0);
});

test("edit-mode pending preparation keeps matching presentation controls mounted and rejects data-stale preparation", () => {
  assert.equal(typeof createEditModePendingRuntime, "function");
  const rows = [
    { period: "May", capacity: 4, alternate: 9 },
    { period: "June", capacity: 7, alternate: 3 },
  ];
  const chart = validLineChart();
  const authorMetadata = {};
  const ready = createWizardPreparation({ chart, rows, authorMetadata });
  const deferredPreparation = {
    chart,
    rows,
    geoData: null,
    authorMetadata,
    runtime: { status: "ready", ...ready },
  };
  const presentationDraft = {
    ...chart,
    presentation: {
      ...chart.presentation,
      background: { color: "#fff7ed" },
    },
  };

  const pendingPresentation = createEditModePendingRuntime({
    chart: presentationDraft,
    profile: ready.profile,
    deferredPreparation,
    rows,
    geoData: null,
    authorMetadata,
  });

  assert.equal(pendingPresentation.status, "pending");
  assert.equal(pendingPresentation.profile, ready.profile);
  assert.equal(pendingPresentation.prepared, ready.prepared);
  assert.ok(buildEditorFormModel({
    chart: presentationDraft,
    profile: pendingPresentation.profile,
    prepared: pendingPresentation.prepared,
  }).sections.find(({ id }) => id === "appearance")
    .fields.some(({ id }) => id === "background"));

  const dataDraft = {
    ...presentationDraft,
    roles: {
      ...presentationDraft.roles,
      measurements: [{ field: "alternate", axis: "primary" }],
    },
  };
  const pendingData = createEditModePendingRuntime({
    chart: dataDraft,
    profile: ready.profile,
    deferredPreparation,
    rows,
    geoData: null,
    authorMetadata,
  });

  assert.equal(pendingData.status, "pending");
  assert.equal(pendingData.prepared, null);
  assert.equal(buildEditorFormModel({
    chart: dataDraft,
    profile: pendingData.profile,
    prepared: pendingData.prepared,
  }).sections.find(({ id }) => id === "appearance")
    .fields.some(({ id }) => id === "background"), false);
});

test("edit-mode pending preparation never reuses an uncorrelated null preparation key", () => {
  const previousPrepared = {
    status: "invalid",
    marks: [],
    diagnostics: [],
    meta: { formPreparationKey: null },
  };
  const rows = [];
  const authorMetadata = {};
  const deferredPreparation = {
    chart: validLineChart(),
    rows,
    geoData: null,
    authorMetadata,
    runtime: {
      status: "ready",
      profile: { fingerprint: "profile-without-a-valid-chart" },
      prepared: previousPrepared,
    },
  };

  const pending = createEditModePendingRuntime({
    chart: { ...validLineChart(), sourceId: "" },
    profile: { fingerprint: "profile-without-a-valid-chart" },
    deferredPreparation,
    rows,
    geoData: null,
    authorMetadata,
  });

  assert.equal(pending.status, "pending");
  assert.equal(pending.prepared, null);
});

test("edit-mode pending preparation rejects matching-key snapshots with stale data identities", () => {
  const chart = validLineChart();
  const rows = [
    { period: "May", capacity: 4 },
    { period: "June", capacity: 7 },
  ];
  const geoData = { type: "FeatureCollection", features: [] };
  const authorMetadata = { period: { interpretation: "category" } };
  const ready = createWizardPreparation({ chart, rows, geoData, authorMetadata });
  const deferredPreparation = {
    chart,
    rows,
    geoData,
    authorMetadata,
    runtime: { status: "ready", ...ready },
  };
  const shared = {
    chart: { ...chart, title: "Presentation-only replacement" },
    profile: ready.profile,
    deferredPreparation,
  };

  assert.equal(createEditModePendingRuntime({
    ...shared,
    rows: [...rows],
    geoData,
    authorMetadata,
  }).prepared, null, "changed row identity must invalidate deferred preparation");
  assert.equal(createEditModePendingRuntime({
    ...shared,
    rows,
    geoData: { ...geoData },
    authorMetadata,
  }).prepared, null, "changed GeoJSON identity must invalidate deferred preparation");
  assert.equal(createEditModePendingRuntime({
    ...shared,
    rows,
    geoData,
    authorMetadata: { ...authorMetadata },
  }).prepared, null, "changed metadata identity must invalidate deferred preparation");
});

test("full editor draft identity changes only for material chart or Chrono edits", () => {
  assert.equal(typeof chartEditDraftIdentity, "function");
  const initial = {
    draft: { id: "chart-a", title: "Chart A", roles: { value: { field: "cases" } } },
    chronoGroups: [{ id: "chrono-a", members: [{ chartId: "chart-a", matching: "exact" }] }],
  };
  assert.equal(
    chartEditDraftIdentity(structuredClone(initial)),
    chartEditDraftIdentity(initial),
  );
  assert.notEqual(
    chartEditDraftIdentity({ ...initial, draft: { ...initial.draft, title: "Changed" } }),
    chartEditDraftIdentity(initial),
  );
  assert.notEqual(
    chartEditDraftIdentity({
      ...initial,
      chronoGroups: [{ ...initial.chronoGroups[0], members: [] }],
    }),
    chartEditDraftIdentity(initial),
  );
});

test("chart editor uses inspector content without dialog semantics", () => {
  const html = render(React.createElement(ChartEditorV3, {
    chart: validPieChart(),
    rows: [{ category: "Ready", value: 6 }],
    surface: "inspector",
    onSave() {},
    onCancel() {},
  }));

  assert.match(html, /class="chart-editor-inspector"/);
  assert.doesNotMatch(html, /chart-editor-backdrop/);
  assert.doesNotMatch(html, /aria-modal="true"/);
});

function findElementsByType(element, type) {
  const found = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!React.isValidElement(value)) return;
    if (value.type === type) found.push(value);
    visit(value.props.children);
  };
  visit(element);
  return found;
}

async function trackedGeographyFixture(chartId) {
  const dashboard = JSON.parse(await readFile(
    path.join(ROOT, "public/config/dashboard.json"),
    "utf8",
  ));
  const chart = dashboard.pages
    .flatMap(({ sections }) => sections)
    .flatMap(({ panels }) => panels)
    .find(({ id }) => id === chartId);
  assert.ok(chart, `Missing tracked chart ${chartId}`);
  const source = dashboard.dataSources[chart.sourceId];
  const geoSource = dashboard.dataSources[chart.presentation.map.geoSource];
  const sourcePath = path.join(ROOT, "public", source.path);
  const csvText = chart.typeId === "chronoChoroplethMap"
    ? await readCsvPrefix(sourcePath, 40)
    : await readFile(sourcePath, "utf8");
  const rows = parseCsvText(csvText, source.path);
  const geoData = JSON.parse(await readFile(
    path.join(ROOT, "public", geoSource.path),
    "utf8",
  ));
  validateGeoJson(geoData, `Tracked ${chartId} GeoJSON`);
  return {
    chart,
    dashboard,
    geoData,
    geoSourceId: chart.presentation.map.geoSource,
    rows,
    source,
  };
}

async function readCsvPrefix(filePath, lineCount) {
  const handle = await open(filePath, "r");
  try {
    const buffer = Buffer.alloc(256 * 1024);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer
      .subarray(0, bytesRead)
      .toString("utf8")
      .split(/\r?\n/)
      .slice(0, lineCount)
      .join("\n");
  } finally {
    await handle.close();
  }
}

test("chart types render in searchable registry purpose groups", () => {
  const html = render(React.createElement(ChartTypePicker, {
    value: "",
    query: "",
    onChange() {},
    onQueryChange() {},
  }));
  for (const label of ["Comparison", "Readiness", "Timeline", "Pie", "Delta"]) {
    assert.match(html, new RegExp(label));
  }

  const filtered = render(React.createElement(ChartTypePicker, {
    value: "",
    query: "delta",
    onChange() {},
    onQueryChange() {},
  }));
  assert.match(filtered, /Delta card/);
  assert.match(filtered, /Delta list/);
  assert.doesNotMatch(filtered, />Bar</);
});

test("chart type guidance appears once before profiling and selected source profile drives compatibility", () => {
  const unprofiled = render(React.createElement(ChartTypePicker, {
    value: "",
    query: "",
    onChange() {},
    onQueryChange() {},
  }));
  assert.equal(
    (unprofiled.match(/Choose or profile a data source to check compatibility\./g) ?? []).length,
    1,
  );

  const rows = [{ value: 4 }];
  const sourceProfile = profileDataset(rows);
  const wizard = createWizardState({
    stage: "chart-type",
    activeStep: "type",
    destination: { pageId: "overview", sectionId: "response" },
    sourceSelection: {
      sourceId: "source-first-values",
      source: null,
      profile: sourceProfile,
      rows,
      kind: "existing",
    },
    loadedData: { "source-first-values": rows },
    profiles: { "source-first-values": sourceProfile },
  });
  const profiled = render(React.createElement(ChartWizardV3, {
    open: true,
    dataSources: {
      "source-first-values": { kind: "dataset", path: "data/values.csv" },
    },
    loadedData: { "source-first-values": rows },
    datasetProfiles: { "source-first-values": sourceProfile },
    chronoGroups: [],
    initialDraftState: wizard,
    onClose() {},
    onCreate() {},
  }));
  assert.doesNotMatch(profiled, /Choose or profile a data source to check compatibility\./);
  const pieLabelIndex = profiled.indexOf('aria-label="Pie.');
  assert.ok(pieLabelIndex >= 0, "Pie compatibility card should render");
  const pieMarkup = profiled.slice(
    profiled.lastIndexOf("<button", pieLabelIndex),
    profiled.indexOf("</button>", pieLabelIndex),
  );
  assert.match(pieMarkup, /disabled=""/);
  assert.match(pieMarkup, /aria-label="[^"]*Required Category/);
  assert.match(
    pieMarkup,
    /class="chart-type-card-reason">Required Category/,
    "an incompatible card should keep its actionable reason visible",
  );
  const kpiLabelIndex = profiled.indexOf('aria-label="KPI card.');
  assert.ok(kpiLabelIndex >= 0, "KPI compatibility card should render");
  const kpiMarkup = profiled.slice(
    profiled.lastIndexOf("<button", kpiLabelIndex),
    profiled.indexOf("</button>", kpiLabelIndex),
  );
  assert.doesNotMatch(kpiMarkup, /disabled=""/);
  assert.match(
    kpiMarkup,
    /aria-label="[^"]*profiled fields satisfy/i,
    "a compatible card should expose useful compatibility state in its accessible name",
  );
  assert.doesNotMatch(
    profiled,
    /class="chart-type-card-reason">The profiled fields satisfy this chart type(?:&#x27;|')s required roles\.<\/span>/,
    "the generic compatible success sentence should not be repeated as visible card copy",
  );
});

test("background color uses the shared identified color field contract", () => {
  const html = render(React.createElement(GeneratedFormSection, {
    section: backgroundSection,
    onChange() {},
  }));

  assert.match(html, /data-color-field="background"/);
  assert.match(html, /aria-label="Background color"/);
  assert.match(html, /id="chart-field-background"/);
});

test("chart background color starts empty and can be restored to the dashboard default", () => {
  const calls = [];
  const chart = validLineChart();
  const field = backgroundSection.fields[0];
  const element = SchemaField({
    field,
    value: "",
    chart,
    onChange(path, value) {
      calls.push({ path, value });
    },
  });
  const html = render(React.createElement(SchemaField, {
    field,
    value: "",
    chart,
    onChange() {},
  }));

  assert.match(html, /value=""/);
  assert.match(html, />Default<\/button>/);
  assert.doesNotMatch(html, /settings-color-contrast/);
  element.props.onDefault();
  assert.deepEqual(calls, [{ path: ["presentation", "background"], value: undefined }]);
});

test("Delta comparison conditionally renders fixed time, policy, and nearest tolerance", () => {
  const nearest = render(React.createElement(DeltaComparisonField, {
    field: deltaField,
    value: {
      mode: "fixedTime",
      at: "2027-05-01T00:00:00.000Z",
      matching: { policy: "nearest", toleranceMs: 3_600_000 },
    },
    onChange() {},
  }));
  const previous = render(React.createElement(DeltaComparisonField, {
    field: deltaField,
    value: { mode: "previousObservation" },
    onChange() {},
  }));

  assert.match(nearest, /Comparison time/);
  assert.match(nearest, /Matching policy/);
  assert.match(nearest, /Tolerance/);
  assert.doesNotMatch(previous, /Comparison time|Matching policy|Tolerance/);
});

test("Delta interpolation requires descriptor support, a numeric profile permission, and explicit consent", () => {
  const chart = createChartDraft("deltaCard", {
    roles: {
      measurement: { field: "capacity" },
      time: { field: "observed" },
    },
  });
  const profile = {
    columns: [
      { name: "capacity", type: "numeric", interpolationAllowed: true },
      { name: "observed", type: "temporal" },
    ],
  };

  assert.equal(deltaMatchingPolicies({
    field: deltaField,
    chart,
    profile,
    allowInterpolation: false,
  }).includes("interpolate"), false);
  assert.equal(deltaMatchingPolicies({
    field: deltaField,
    chart,
    profile,
    allowInterpolation: true,
  }).includes("interpolate"), true);
  assert.equal(deltaMatchingPolicies({
    field: { ...deltaField, matchingPolicies: ["exact", "nearest"] },
    chart,
    profile,
    allowInterpolation: true,
  }).includes("interpolate"), false);
});

test("collection updates emit only the normalized nested contract", () => {
  const current = normalizeCollectionSettings({
    layout: "fixed",
    rows: 1,
    columns: 3,
  });
  const next = updateCollectionSettings(current, ["ranking"], {
    mode: "priority",
    method: "largestAbsoluteChange",
  });

  assert.deepEqual(next, normalizeCollectionSettings(next));
  assert.equal("rankingMode" in next, false);
  assert.equal("rotationInterval" in next, false);
  assert.equal(next.ranking.mode, "priority");

  const html = render(React.createElement(CollectionSettingsField, {
    field: { id: "collection", label: "Collection display" },
    value: next,
    onChange() {},
  }));
  assert.match(html, /Rows/);
  assert.match(html, /Columns/);
  assert.match(html, /Priority/);
});

test("time synchronization keeps matching group-owned and renders independent membership checkboxes", () => {
  const chart = createChartDraft("line", {
    id: "trend",
    sourceId: "exercise-data",
    roles: {
      measurements: [{ field: "value" }],
      observation: {
        field: "observed",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    interaction: { timeSync: null },
  });
  const groups = [{
    id: "exercise-clock",
    name: "Exercise clock",
    period: { start: "2027-05-01", end: "2027-05-02" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [{ chartId: "trend", timeRole: "observation" }],
  }];
  const rows = [
    { observed: "2027-05-01", value: 1 },
    { observed: "2027-05-02", value: 2 },
  ];
  const profile = profileDataset(rows, {
    observed: { interpretation: "temporal" },
  });
  const next = proposeChronoGroupMatching({
    groups,
    target: {
      groupId: "exercise-clock",
      chartId: "trend",
      property: "matching",
    },
    matching: { policy: "nearest", toleranceMs: 3_600_000 },
    charts: [chart],
    loadedData: { "exercise-data": rows },
    profiles: { "exercise-data": profile },
  });

  assert.deepEqual(next[0].members[0].matching, {
    policy: "nearest",
    toleranceMs: 3_600_000,
  });
  assert.equal(groups[0].members[0].matching, undefined);
  assert.equal(chart.interaction.timeSync, null);
  assert.throws(() => proposeChronoGroupMatching({
    groups,
    target: {
      groupId: "exercise-clock",
      chartId: "trend",
      property: "matching",
    },
    matching: { policy: "nearest" },
    charts: [chart],
    loadedData: { "exercise-data": rows },
    profiles: { "exercise-data": profile },
  }), /tolerance/i);

  const html = render(React.createElement(ChronoMembershipSettingsField, {
    field: {
      id: "timeSync",
      label: "Synchronized playback",
      groups,
      selectedGroupIds: ["exercise-clock"],
    },
    chart,
    charts: [chart],
    loadedData: { "exercise-data": rows },
    profiles: { "exercise-data": profile },
    onMembershipChange() {},
  }));
  assert.match(html, /Chrono Group memberships/);
  assert.match(html, /type="checkbox"[^>]*checked/);
  assert.match(html, /Exercise clock/);
  assert.doesNotMatch(html, /Member matching/);
});

test("role controls expose cardinality, axis assignment, and detected X interpretation", () => {
  const multiple = render(React.createElement(RoleField, {
    field: {
      id: "measurements",
      label: "Measurements",
      required: true,
      multiple: true,
      min: 1,
      max: null,
      accepts: ["number"],
      axisOptions: ["primary", "secondary"],
    },
    value: [{ field: "capacity", axis: "primary" }],
    columns: [
      { name: "capacity", type: "numeric" },
      { name: "occupied", type: "numeric" },
    ],
    onChange() {},
  }));
  const interpretation = render(React.createElement(GeneratedFormSection, {
    section: {
      id: "data",
      label: "Data",
      fields: [{
        id: "observationInterpretation",
        label: "Observation / X-axis interpretation",
        control: "select",
        value: "temporal",
        detected: "temporal",
        path: ["roles", "observation", "interpretation"],
        options: [
          { value: "temporal", label: "Date or time" },
          { value: "category", label: "Category" },
        ],
      }],
    },
    onChange() {},
  }));

  assert.match(multiple, /Add measurement/);
  assert.match(multiple, /Primary/);
  assert.match(multiple, /Secondary/);
  assert.match(interpretation, /Detected: Date or time/);
});

test("Map and prepare renders one blank required measurement row and persists only a valid column", () => {
  const changes = [];
  const columns = [
    { name: "reportedAt", type: "temporal" },
    { name: "capacity", type: "numeric" },
  ];
  const measurements = {
    id: "measurements",
    label: "Measurements",
    control: "role",
    path: ["roles", "measurements"],
    value: [],
    accepts: ["number"],
    required: true,
    multiple: true,
    min: 1,
    max: null,
    axisOptions: ["primary", "secondary"],
  };
  const originalMeasurements = structuredClone(measurements);
  const step = DataRolesStep({
    section: {
      id: "data",
      label: "Data roles",
      fields: [measurements],
    },
    columns,
  });
  const generated = findElement(
    step,
    (element) => element.type === GeneratedFormSection,
  );
  const field = generated.props.section.fields[0];
  const schemaField = SchemaField({
    field,
    value: field.value,
    columns,
    onChange(path, value) {
      changes.push({ path, value });
    },
  });
  const role = RoleField(schemaField.props);
  const selects = findElementsByType(role, "select");
  const controls = findElementsByType(role, IconControl);
  const html = render(role);

  assert.equal((html.match(/chart-authoring-role-row/g) ?? []).length, 1);
  assert.equal(selects.length, 2);
  assert.equal(selects[0].props.value, "");
  assert.equal(selects[1].props.disabled, true);
  assert.equal(
    controls.some(({ props }) => props.interactionId === "editor.add-measurement"),
    false,
  );
  assert.deepEqual(changes, []);

  selects[0].props.onChange({ target: { value: "" } });
  selects[0].props.onChange({ target: { value: "reportedAt" } });
  assert.deepEqual(changes, []);

  selects[0].props.onChange({ target: { value: "capacity" } });
  assert.deepEqual(changes, [{
    path: ["roles", "measurements"],
    value: [{ field: "capacity", axis: "primary" }],
  }]);
  assert.deepEqual(measurements, originalMeasurements);
});

test("Map and prepare seeds no other roles and does not duplicate populated measurements", () => {
  const markup = (field) => render(React.createElement(DataRolesStep, {
    section: {
      id: "data",
      label: "Data roles",
      fields: [field],
    },
    columns: [{ name: "capacity", type: "numeric" }],
    onChange() {},
  }));
  const rows = (html) => (html.match(/chart-authoring-role-row/g) ?? []).length;
  const base = {
    id: "measurements",
    label: "Measurements",
    control: "role",
    path: ["roles", "measurements"],
    value: [],
    accepts: ["number"],
    required: true,
    multiple: true,
    min: 1,
    max: null,
  };
  const populated = markup({
    ...base,
    value: [{ field: "capacity" }],
  });

  assert.equal(rows(markup(base)), 1);
  assert.equal(rows(markup({ ...base, min: 0, required: false })), 0);
  assert.equal(rows(markup({ ...base, multiple: false, max: 1 })), 0);
  assert.equal(rows(markup({
    ...base,
    id: "series",
    label: "Series",
    path: ["roles", "series"],
  })), 0);
  assert.equal(rows(populated), 1);
  assert.match(populated, /option value="capacity" selected/);
});

test("filter controls select a source column and emit the curated filter contract", () => {
  let next;
  const field = {
    id: "filters",
    label: "Filters",
    control: "filters",
    value: [],
  };
  const tree = StandardField({
    field,
    value: [],
    columns: [
      { name: "region", type: "category" },
      { name: "capacity", type: "numeric" },
    ],
    onChange(value) {
      next = value;
    },
  });
  const add = findElement(tree, (element) => (
    element.type === IconControl
    && element.props.interactionId === "editor.add-filter"
  ));

  assert.ok(add);
  add.props.onClick();
  assert.deepEqual(next, [{
    field: "region",
    operator: "equals",
    value: "",
  }]);
  const populated = render(React.createElement(StandardField, {
    field,
    value: next,
    columns: [
      { name: "region", type: "category" },
      { name: "capacity", type: "numeric" },
    ],
    onChange() {},
  }));
  assert.match(populated, /Filter column/);
  assert.doesNotMatch(populated, /\[object Object\]/);
});

test("target range parsing preserves a trailing comma while retaining completed thresholds", () => {
  assert.deepEqual(parseTargetRangesInput("50, "), {
    values: [50],
    complete: false,
  });
  assert.deepEqual(parseTargetRangesInput("50, 80, 100"), {
    values: [50, 80, 100],
    complete: true,
  });
});

test("categorical filters expose unique detected values in source order", () => {
  assert.deepEqual(detectedFilterValues(
    [{ name: "region", type: "category" }],
    "region",
    [{ region: "North" }, { region: "South" }, { region: "North" }, { region: "" }],
  ), ["North", "South"]);
});

test("edit placement moves retain the canonical placement identity and target insertion", () => {
  assert.deepEqual(buildChartEditPlacementMove({
    dashboard: {
      pages: [{
        id: "overview",
        sections: [{
          id: "summary",
          panels: [
            { id: "placement-a", chart: { id: "chart-a" } },
            { id: "placement-b", chart: { id: "chart-b" } },
          ],
        }],
      }],
    },
    placementId: "placement-a",
    source: { pageId: "overview", sectionId: "summary" },
    destination: { pageId: "overview", sectionId: "summary", relation: "after", anchorId: "chart-b" },
  }), {
    kind: "panel",
    source: { pageId: "overview", sectionId: "summary", placementId: "placement-a" },
    target: { pageId: "overview", sectionId: "summary", index: 2 },
  });
});

test("structured presentation controls emit only validator-approved nested contracts", () => {
  const cases = [
    ["labels", {}, ["visible"], true, { visible: true }],
    ["labels", { visible: true }, ["position"], "top", { visible: true, position: "top" }],
    ["labels", { visible: true }, ["format"], "{value}", { visible: true, format: "{value}" }],
    ["axes", {}, ["primary", "title"], "Capacity", { primary: { title: "Capacity" } }],
    ["axes", { primary: { title: "Capacity" } }, ["secondary", "grid"], false, {
      primary: { title: "Capacity" },
      secondary: { grid: false },
    }],
    ["targets", {}, ["direction"], "increase-is-good", { direction: "increase-is-good" }],
    ["targets", { direction: "neutral" }, ["ranges"], [50, 80, 100], {
      direction: "neutral",
      ranges: [50, 80, 100],
    }],
    ["targets", { ranges: [50, 80, 100] }, ["readoutLabel"], "of capacity", {
      ranges: [50, 80, 100],
      readoutLabel: "of capacity",
    }],
    ["targets", { readoutLabel: "of capacity" }, ["showReadoutLabel"], false, {
      readoutLabel: "of capacity",
      showReadoutLabel: false,
    }],
    ["targets", {}, ["unit"], "%", { unit: "%" }],
    ["map", {}, ["scale"], "continuous", { scale: "continuous" }],
    ["map", { scale: "continuous" }, ["geoSource"], "regions", {
      scale: "continuous",
      geoSource: "regions",
    }],
    ["map", { scale: "continuous" }, ["joinField"], "region_id", {
      scale: "continuous",
      joinField: "region_id",
    }],
    ["timeline", {}, ["lanes"], ["Response", "Recovery"], {
      lanes: ["Response", "Recovery"],
    }],
    ["timeline", { lanes: ["Response"] }, ["marker"], "diamond", {
      lanes: ["Response"],
      marker: "diamond",
    }],
  ];
  const presentation = {};
  for (const [control, current, path, value, expected] of cases) {
    const next = updateStructuredFieldValue(control, current, path, value);
    assert.deepEqual(next, expected, `${control}.${path.join(".")}`);
    if (!(
      control === "targets"
      && ["readoutLabel", "showReadoutLabel", "unit"].includes(path[0])
    )) {
      presentation[control] = next;
    }
  }
  const chart = validLineChart({ presentation });
  assert.doesNotThrow(() => validateChartInstance(chart, {
    columnTypes: columnTypes(),
  }));
  assert.deepEqual(normalizeChartInstance(chart).presentation.labels, presentation.labels);
});

test("axis presentation controls expose temporal X controls and only render a secondary axis when bound", () => {
  const field = {
    id: "axes",
    label: "Axes",
    control: "axes",
    xKind: "temporal",
    hasSecondary: false,
  };
  const html = render(React.createElement(StandardField, { field, value: {}, onChange() {} }));
  assert.match(html, /X-axis title/);
  assert.match(html, /type="datetime-local"/);
  assert.match(html, /Label format/);
  assert.match(html, /Hover date\/time/);
  assert.match(html, /Primary axis/);
  assert.doesNotMatch(html, /Secondary axis/);

  assert.deepEqual(
    updateStructuredFieldValue("axes", {}, ["x", "tickFrequency"], { every: 2, unit: "month" }),
    { x: { tickFrequency: { every: 2, unit: "month" } } },
  );
  assert.deepEqual(
    updateStructuredFieldValue(
      "axes",
      { x: { labelPreset: "ddMmYyyy" } },
      ["x", "labelPreset"],
      "adaptive",
    ),
    {},
    "Adaptive is the implicit default and removes a stale explicit preset",
  );
  assert.deepEqual(
    updateStructuredFieldValue("axes", {}, ["x", "hoverLabelPreset"], "dateTime"),
    { x: { hoverLabelPreset: "dateTime" } },
  );
  assert.deepEqual(
    updateStructuredFieldValue(
      "axes",
      { x: { hoverLabelPreset: "dateTime" } },
      ["x", "hoverLabelPreset"],
      "auto",
    ),
    {},
    "Auto is the implicit hover default and removes a stale explicit preset",
  );
});

test("X, primary, and secondary axis titles retain an internal typing space", () => {
  for (const path of [["x", "title"], ["primary", "title"], ["secondary", "title"]]) {
    const next = updateStructuredFieldValue("axes", {}, path, "Cumulative ");
    assert.equal(next[path[0]].title, "Cumulative ");
    const completed = updateStructuredFieldValue("axes", next, path, "Cumulative Cases");
    assert.equal(completed[path[0]].title, "Cumulative Cases");
  }

  assert.deepEqual(
    updateStructuredFieldValue("axes", { primary: { title: "Cases" } }, ["primary", "title"], ""),
    {},
  );
});

test("save normalization trims raw axis title editing values", () => {
  const normalized = normalizeChartInstance(validLineChart({
    presentation: {
      axes: {
        x: { title: " Reported at " },
        primary: { title: " Cases " },
        secondary: { title: "   " },
      },
    },
  }));

  assert.equal(normalized.presentation.axes.x.title, "Reported at");
  assert.equal(normalized.presentation.axes.primary.title, "Cases");
  assert.equal(normalized.presentation.axes.secondary, undefined);
});

test("axis controls expose independent title and tick-label typography for available axes", () => {
  const field = {
    id: "axes",
    label: "Axes",
    control: "axes",
    xKind: "category",
    hasSecondary: true,
  };
  const html = render(React.createElement(StandardField, {
    field,
    value: {
      primary: { titleFontSize: 10, titleBold: true, titleOffsetX: -12, titleOffsetY: 9 },
      secondary: { titleFontSize: 24 },
    },
    onChange() {},
  }));

  assert.match(html, /Primary axis/);
  assert.match(html, /Secondary axis/);
  assert.match(html, /Title font size/);
  assert.match(html, /Decrease title font size/);
  assert.match(html, /Increase title font size/);
  assert.match(html, /Bold/);
  assert.match(html, /Horizontal offset/);
  assert.match(html, /Vertical offset/);
  assert.match(html, /value="-12"/);
  assert.match(html, /value="9"/);

  const primaryOnly = render(React.createElement(StandardField, {
    field: { ...field, hasSecondary: false },
    value: {},
    onChange() {},
  }));
  assert.equal((primaryOnly.match(/Title font size/g) ?? []).length, 1);
  assert.equal((primaryOnly.match(/Tick label font size/g) ?? []).length, 2);
  assert.doesNotMatch(primaryOnly, /Secondary axis/);

  const changes = [];
  const tree = StandardField({
    field: { ...field, hasSecondary: false },
    value: { primary: { titleFontSize: 14 } },
    onChange(value) { changes.push(value); },
  });
  findElement(tree, (element) => element.props?.["aria-label"] === "Increase title font size").props.onClick();
  findElement(tree, (element) => element.props?.["aria-label"] === "Decrease title font size").props.onClick();
  assert.deepEqual(changes, [
    { primary: { titleFontSize: 15 } },
    { primary: { titleFontSize: 13 } },
  ]);
});

test("temporal tick frequency defaults its unit to day on the first number edit", () => {
  let next;
  const tree = StandardField({
    field: {
      id: "axes",
      label: "Axes",
      control: "axes",
      xKind: "temporal",
    },
    value: {},
    onChange(value) {
      next = value;
    },
  });
  const frequencyInput = findElement(tree, (element) => (
    element.type === "input" && element.props.placeholder === "Auto"
  ));

  assert.ok(frequencyInput);
  frequencyInput.props.onChange({ target: { value: "2" } });
  assert.deepEqual(next, {
    x: { tickFrequency: { every: 2, unit: "day" } },
  });
});

test("month cadence offers only exact calendar steps and normalizes on unit change", () => {
  const changes = [];
  const monthly = StandardField({
    field: {
      id: "axes",
      label: "Axes",
      control: "axes",
      xKind: "temporal",
    },
    value: { x: { tickFrequency: { every: 2, unit: "month" } } },
    onChange(value) { changes.push(value); },
  });
  const monthFrequency = findElement(monthly, (element) => (
    element.type === "select" && element.props.value === "2"
  ));

  assert.ok(monthFrequency);
  assert.deepEqual(
    React.Children.toArray(monthFrequency.props.children).map(({ props }) => props.value),
    ["1", "2", "3"],
  );
  monthFrequency.props.onChange({ target: { value: "3" } });
  assert.deepEqual(changes.at(-1), {
    x: { tickFrequency: { every: 3, unit: "month" } },
  });

  const daily = StandardField({
    field: {
      id: "axes",
      label: "Axes",
      control: "axes",
      xKind: "temporal",
    },
    value: { x: { tickFrequency: { every: 5, unit: "day" } } },
    onChange(value) { changes.push(value); },
  });
  const unit = findElement(daily, (element) => (
    element.type === "select" && element.props.value === "day"
  ));
  unit.props.onChange({ target: { value: "month" } });
  assert.deepEqual(changes.at(-1), {
    x: { tickFrequency: { every: 1, unit: "month" } },
  });
});

test("filter operator changes materialize exact operands and remove incompatible keys", () => {
  const equals = filterForOperator({
    field: "period",
    operator: "range",
    min: "May",
    max: "June",
  }, "equals");
  const included = filterForOperator(equals, "in");
  const range = filterForOperator({
    field: "capacity",
    operator: "equals",
    value: 5,
  }, "range");

  assert.deepEqual(equals, {
    field: "period",
    operator: "equals",
    value: "May",
  });
  assert.deepEqual(included, {
    field: "period",
    operator: "in",
    values: ["May"],
  });
  assert.deepEqual(range, {
    field: "capacity",
    operator: "range",
    min: 5,
    max: 5,
  });
  for (const filter of [
    equals,
    included,
    filterForOperator(included, "notIn"),
    filterForOperator(equals, "notEquals"),
    filterForOperator(equals, "contains"),
    range,
  ]) {
    const chart = validLineChart({
      transformations: { filters: [filter] },
    });
    assert.doesNotThrow(() => validateChartInstance(chart, {
      columnTypes: columnTypes(),
    }), filter.operator);
    const allowed = {
      equals: ["field", "operator", "value"],
      notEquals: ["field", "operator", "value"],
      contains: ["field", "operator", "value"],
      in: ["field", "operator", "values"],
      notIn: ["field", "operator", "values"],
      range: ["field", "operator", "min", "max"],
    }[filter.operator];
    assert.deepEqual(Object.keys(filter), allowed);
  }
});

test("generated fields associate labels, help, and errors with their control", () => {
  const html = render(React.createElement(GeneratedFormSection, {
    section: {
      id: "appearance",
      label: "Appearance",
      fields: [{
        id: "title",
        label: "Chart title",
        control: "text",
        path: ["title"],
        value: "",
        required: true,
        help: "Use a concise operational title.",
        error: "A chart title is required.",
      }],
    },
    onChange() {},
  }));

  assert.match(html, /for="chart-field-title"/);
  assert.match(html, /<span class="chart-authoring-field-required-marker"[^>]*> \*<\/span>/);
  assert.match(html, /aria-describedby="chart-field-title-help chart-field-title-error"/);
  assert.match(html, /role="alert"/);
});

test("multi-control authoring fields use fieldset and legend semantics", () => {
  const role = render(React.createElement(RoleField, {
    field: {
      id: "measurements",
      label: "Measurements",
      multiple: true,
      min: 1,
      max: null,
      accepts: ["number"],
    },
    value: [{ field: "capacity" }],
    columns: [{ name: "capacity", type: "numeric" }],
    onChange() {},
  }));
  const collection = render(React.createElement(CollectionSettingsField, {
    field: { id: "collection", label: "Collection display" },
    value: normalizeCollectionSettings(),
    onChange() {},
  }));
  const delta = render(React.createElement(DeltaComparisonField, {
    field: deltaField,
    value: { mode: "previousObservation" },
    onChange() {},
  }));

  assert.match(role, /<fieldset[^>]*>.*<legend><span[^>]*>Measurements<\/span><\/legend>/);
  assert.match(collection, /<fieldset[^>]*>.*<legend><span[^>]*>Collection display<\/span><\/legend>/);
  assert.match(delta, /<fieldset[^>]*>.*<legend><span[^>]*>Comparison<\/span><\/legend>/);
});

test("preview uses the shared chart renderer for ready data and bounds actionable failures", () => {
  const rows = [{ period: "May", capacity: 4 }];
  const chart = createChartDraft("bar", {
    id: "capacity",
    title: "Monthly capacity",
    sourceId: "capacity-data",
    roles: {
      measurements: [{ field: "capacity", axis: "primary" }],
      observation: { field: "period" },
    },
  });
  const ready = render(React.createElement(ChartPreview, {
    chart,
    rows,
    datasetProfile: profileDataset(rows),
  }));
  const invalid = render(React.createElement(ChartPreview, {
    chart: createChartDraft("bar", {
      id: "invalid",
      title: "Invalid chart",
      sourceId: "capacity-data",
    }),
    rows,
    datasetProfile: profileDataset(rows),
  }));

  assert.match(ready, /chart-authoring-preview-ready/);
  assert.match(ready, /class="chart-echarts-view"/);
  assert.doesNotMatch(ready, /role="img"/);
  assert.match(ready, /class="chart-echarts-host" aria-hidden="true"/);
  assert.match(invalid, /chart-authoring-preview-invalid/);
  assert.match(invalid, /data-responsible-field="measurements"/);
  assert.ok(invalid.length < 1600);
});

test("renderer preflight blocks target collections that cannot establish stable identity", () => {
  const rows = [
    { ward: "Ward A", actual: 4, capacity: 8 },
    { ward: " Ward A ", actual: 6, capacity: 8 },
  ];
  const chart = createChartDraft("bullet", {
    id: "identity-free-bullet",
    title: "Time-indexed capacity",
    sourceId: "capacity-data",
    roles: {
      actual: { field: "actual" },
      target: { field: "capacity" },
      entity: { field: "ward" },
    },
  });
  const runtime = createWizardPreparation({ chart, rows });
  const form = buildWizardFormModel({
    draft: chart,
    profile: runtime.profile,
    prepared: runtime.prepared,
    chronoGroups: [],
  });
  const html = render(React.createElement(ChartPreview, {
    chart,
    rows,
    datasetProfile: runtime.profile,
  }));

  assert.equal(runtime.prepared.status, "invalid");
  assert.equal(runtime.prepared.meta.rendererReady, false);
  assert.match(
    runtime.prepared.diagnostics[0].message,
    /duplicate collection identity "Ward A"/i,
  );
  assert.equal(runtime.prepared.diagnostics[0].fieldId, "entity");
  assert.deepEqual(runtime.prepared.diagnostics[0].path, ["roles", "entity"]);
  assert.equal(form.canCreate, false);
  assert.match(html, /chart-authoring-preview-invalid/);
  assert.match(html, /data-responsible-field="entity"/);
  assert.doesNotMatch(html, /chart-authoring-preview-ready/);
});

test("preview diagnostics are stable and programmatically describe the responsible field", () => {
  const rows = [{ period: "May", capacity: 4 }];
  const chart = createChartDraft("bar", {
    id: "diagnostic-preview",
    title: "Invalid chart",
    sourceId: "capacity-data",
  });
  const datasetProfile = profileDataset(rows);
  const prepared = prepareChartData({ chart, rows, datasetProfile });
  const diagnostics = buildPreviewDiagnostics(prepared.diagnostics, {
    namespace: chart.id,
  });
  const html = render(React.createElement(
    React.Fragment,
    null,
    React.createElement(GeneratedFormSection, {
      section: {
        id: "data",
        label: "Data",
        fields: [{
          id: "measurements",
          label: "Measurements",
          control: "role",
          path: ["roles", "measurements"],
          value: [],
          multiple: true,
          min: 1,
          max: null,
          required: true,
          accepts: ["number"],
        }],
      },
      columns: datasetProfile.columns,
      diagnostics: prepared.diagnostics,
      diagnosticNamespace: chart.id,
      onChange() {},
    }),
    React.createElement(ChartPreview, {
      chart,
      rows,
      datasetProfile,
      diagnosticNamespace: chart.id,
    }),
  ));
  const measurement = diagnostics.find(({ fieldId }) => fieldId === "measurements");

  assert.ok(measurement);
  assert.match(html, new RegExp(`id="${measurement.id}"`));
  assert.match(html, new RegExp(`aria-describedby="${measurement.id}"`));
  assert.match(html, /data-field-id="measurements"[^>]*aria-invalid="true"/);
  assert.equal((html.match(new RegExp(`id="${measurement.id}"`, "g")) ?? []).length, 1);
});

test("collection controls expose overflow, custom priority, and stabilization as normalized emissions", () => {
  let settings = normalizeCollectionSettings({
    layout: "fixed",
    ranking: { mode: "fixed" },
  });
  const updates = [
    [["overflow"], "limit"],
    [["ranking"], {
      mode: "priority",
      expression: {
        operator: "weightedSum",
        terms: [{ metric: "riskScore", weight: 1 }],
      },
      stabilize: false,
    }],
    [["ranking", "stabilize"], true],
  ];
  for (const [path, value] of updates) {
    settings = updateCollectionSettings(settings, path, value);
    assert.deepEqual(settings, normalizeCollectionSettings(settings));
    assert.equal("rankingMode" in settings, false);
    assert.equal("rotationInterval" in settings, false);
  }
  assert.equal(settings.overflow, "limit");
  assert.equal(settings.ranking.stabilize, true);
  assert.deepEqual(settings.ranking.expression, {
    operator: "weightedSum",
    terms: [{ metric: "riskScore", weight: 1 }],
  });

  const html = render(React.createElement(CollectionSettingsField, {
    field: { id: "collection", label: "Collection display" },
    value: settings,
    onChange() {},
  }));
  assert.match(html, /Overflow behavior/);
  assert.match(html, /Custom priority/);
  assert.match(html, /Keep positions stable for ties/);
});

test("background colors support valid transparency and accessible contrast guidance", () => {
  assert.match(describeColorContrast("#FFFFFF").message, /High contrast with dark text/);
  assert.match(describeColorContrast("#777777").message, /Low contrast/);
  const transparent = render(React.createElement(ColorField, {
    id: "background-color",
    label: "Background",
    value: "#FFFFFF",
    onChange() {},
    allowTransparency: true,
    transparent: true,
    onTransparencyChange() {},
  }));
  const high = render(React.createElement(ColorField, {
    id: "background-high",
    label: "Background",
    value: "#FFFFFF",
    onChange() {},
    showContrast: true,
  }));
  const low = render(React.createElement(ColorField, {
    id: "background-low",
    label: "Background",
    value: "#777777",
    onChange() {},
    showContrast: true,
  }));

  assert.match(transparent, /Transparent background/);
  assert.match(transparent, /type="checkbox"[^>]*checked/);
  assert.match(high, /role="status"[^>]*aria-live="polite"[^>]*>High contrast/);
  assert.match(low, /role="status"[^>]*aria-live="polite"[^>]*>Low contrast/);
});

test("background transparency emits the validator-approved object", () => {
  const calls = [];
  const chart = validLineChart({
    presentation: {
      background: { color: "#FFFFFF", transparent: false },
    },
  });
  const background = SchemaField({
    field: backgroundSection.fields[0],
    value: "#FFFFFF",
    chart,
    onChange(path, value) {
      calls.push({ path, value });
    },
  });
  background.props.onTransparencyChange(true);

  assert.deepEqual(calls[0], {
    path: ["presentation", "background"],
    value: { color: "#FFFFFF", transparent: true },
  });
  const withBackground = structuredClone(chart);
  withBackground.presentation.background = calls[0].value;
  assert.doesNotThrow(() => validateChartInstance(withBackground, {
    columnTypes: columnTypes(),
  }));
});

test("series palette fields reuse ColorField interactions and emit detached arrays", () => {
  const authored = ["#043BCB", "#36BDEB"];
  const emissions = [];
  const element = SchemaField({
    field: {
      id: "seriesColors",
      label: "Series colors",
      control: "palette",
      path: ["presentation", "series", "colors"],
      value: authored,
    },
    value: authored,
    onChange(path, value) {
      emissions.push({ path, value });
    },
  });
  assert.equal(element.type, SeriesColorsField);
  const palette = SeriesColorsField(element.props);
  const colorFields = findElementsByType(palette, ColorField);
  const buttons = findElementsByType(palette, IconControl);
  const addButton = buttons.find(
    ({ props }) => props.interactionId === "editor.add-color",
  );
  const removeButton = buttons.find(
    ({ props }) => props.interactionId === "editor.remove-measurement",
  );
  const defaultButton = buttons.find(
    ({ props }) => props.interactionId === "editor.use-default-colors",
  );

  assert.equal(colorFields.length, 2);
  assert.ok(addButton);
  assert.ok(removeButton);
  assert.ok(defaultButton);
  assert.deepEqual(
    colorFields.map(({ props }) => props.dataColorField),
    ["seriesColors-0", "seriesColors-1"],
  );
  assert.ok(
    colorFields.every(({ props }) => props.pickerRevision === authored),
  );
  colorFields[0].props.onChange("#DC2626");
  removeButton.props.onClick();
  addButton.props.onClick();
  defaultButton.props.onClick();
  authored[1] = "#FFFFFF";

  assert.deepEqual(emissions, [
    {
      path: ["presentation", "series", "colors"],
      value: ["#DC2626", "#36BDEB"],
    },
    {
      path: ["presentation", "series", "colors"],
      value: ["#36BDEB"],
    },
    {
      path: ["presentation", "series", "colors"],
      value: ["#043BCB", "#36BDEB", "#2BAA7B"],
    },
    {
      path: ["presentation", "series", "colors"],
      value: undefined,
    },
  ]);
  assert.notEqual(emissions[0].value, authored);
});

test("editor style clears delete optional leaves and prune an empty series object", () => {
  const chart = validLineChart({
    presentation: {
      series: {
        colors: ["#043BCB", "#36BDEB"],
        lineWidth: 2.5,
      },
    },
  });
  let state = createChartEditorState({
    chart,
    chronoGroups: [],
  });

  state = reduceChartEditorState(state, {
    type: "updateChart",
    path: ["presentation", "series", "lineWidth"],
    value: undefined,
  });
  assert.deepEqual(state.draft.presentation.series, {
    colors: ["#043BCB", "#36BDEB"],
  });

  state = reduceChartEditorState(state, {
    type: "updateChart",
    path: ["presentation", "series", "colors"],
    value: undefined,
  });
  assert.equal(
    Object.hasOwn(state.draft.presentation, "series"),
    false,
  );
  assert.doesNotThrow(() => validateChartInstance(state.draft, {
    columnTypes: columnTypes(),
  }));
});

test("hostile or incomplete authoring props fail closed without rendering raw objects", () => {
  const picker = render(React.createElement(ChartTypePicker, {
    query: { toString() { throw new Error("must not coerce"); } },
    onChange() {},
  }));
  const section = render(React.createElement(GeneratedFormSection, {
    section: { id: "bad", label: "Bad", fields: [null, { id: "x" }] },
    onChange() {},
  }));

  assert.match(picker, /Search chart types/);
  assert.doesNotMatch(section, /\[object Object\]/);
});

test("generated Configure and full-editor fields share responsive wide and boolean layout", () => {
  const html = render(React.createElement(GeneratedFormSection, {
    section: {
      id: "appearance",
      label: "Appearance",
      fields: [
        { id: "title", label: "Title", control: "text", value: "Response" },
        { id: "visible", label: "Show labels", control: "toggle", value: true },
        { id: "notes", label: "Notes", control: "textarea", value: "Context" },
      ],
    },
    onChange() {},
  }));

  assert.match(html, /chart-authoring-section-fields dashboard-authoring-grid/);
  assert.match(html, /class="[^"]*dashboard-authoring-boolean-row[^"]*"[^>]*data-field-id="visible"[^>]*><input[^>]*type="checkbox"[^>]*><div class="dashboard-authoring-boolean-copy"><label/);
  assert.match(html, /class="[^"]*dashboard-authoring-field--wide[^"]*"[^>]*data-field-id="notes"/);

  const axesHtml = render(React.createElement(StandardField, {
    field: { id: "axes", label: "Axes", control: "axes", hasSecondary: true },
    value: { primary: { title: "Primary", titleBold: true }, secondary: { title: "Secondary" } },
    onChange() {},
  }));
  assert.equal((axesHtml.match(/chart-authoring-axis-group dashboard-authoring-grid/g) ?? []).length, 3);
  assert.match(axesHtml, /dashboard-authoring-boolean-row[^>]*><input[^>]*type="checkbox"[^>]*>Bold<\/label>/);
});

test("generated boolean fields keep their label, help, and error in one text column", () => {
  const html = render(React.createElement(GeneratedFormSection, {
    section: {
      id: "labels",
      label: "Labels",
      fields: [{
        id: "visible",
        label: "Show labels",
        control: "toggle",
        value: true,
        help: "Display a value beside each mark.",
        error: "Label visibility could not be saved.",
      }],
    },
    onChange() {},
  }));

  assert.match(
    html,
    /<input[^>]*type="checkbox"[^>]*><div class="dashboard-authoring-boolean-copy"><label[^>]*>Show labels<\/label><small[^>]*>Display a value beside each mark\.<\/small><small[^>]*role="alert"[^>]*>Label visibility could not be saved\.<\/small><\/div>/,
  );
});

test("a structured field omits only the legend that duplicates its section heading", () => {
  const duplicate = render(React.createElement(GeneratedFormSection, {
    section: {
      id: "axes",
      label: "Axes",
      fields: [{
        id: "axes",
        label: "Axes",
        control: "axes",
        value: {},
        hasSecondary: true,
      }],
    },
    onChange() {},
  }));
  const distinct = render(React.createElement(GeneratedFormSection, {
    section: {
      id: "appearance",
      label: "Appearance",
      fields: [{
        id: "axes",
        label: "Axes",
        control: "axes",
        value: {},
      }],
    },
    onChange() {},
  }));

  assert.equal((duplicate.match(/>Axes</g) ?? []).length, 1);
  assert.doesNotMatch(duplicate, /<legend>Axes<\/legend>/);
  assert.match(duplicate, /<legend>X axis<\/legend>/);
  assert.match(duplicate, /<legend>Primary axis<\/legend>/);
  assert.match(duplicate, /<legend>Secondary axis<\/legend>/);
  assert.match(distinct, /<h3[^>]*>Appearance<\/h3>[\s\S]*<legend><span[^>]*>Axes<\/span><\/legend>/);
});

test("the full editor separates chart identity and type from footprint controls", () => {
  const html = render(React.createElement(ChartEditorV3, {
    chart: validPieChart(),
    rows: [{ category: "Ready", value: 6 }],
    onSave() {},
    onCancel() {},
  }));

  assert.match(
    html,
    /<header class="chart-editor-header dashboard-dialog__header"><div class="chart-editor-identity-strip"><div class="chart-editor-identity">[\s\S]*<label class="chart-editor-type-select">[\s\S]*<\/label><\/div><div class="chart-editor-footprint-block"><section class="chart-footprint-control"/,
  );
});

test("chart authoring primary and shell regions stay mounted before readiness", () => {
  const html = render(React.createElement(ChartWizardV3, {
    open: true,
    dataSources: {},
    loadedData: {},
    chronoGroups: [],
    onClose() {},
    onCreate() {},
  }));

  assert.match(html, /class="chart-wizard chart-wizard-v3 dashboard-dialog dashboard-dialog--wizard dashboard-dialog--wide dashboard-authoring-shell"/);
  assert.match(html, /data-footer-slot="primary"/);
  const primary = buttonMarkupByInteraction(html, "wizard.create-chart");
  assert.match(primary, /aria-label="Create chart"/);
  assert.match(primary, /disabled=""/);
});

test("wizard exposes the exact six directly clickable stages in the approved order", () => {
  const html = render(React.createElement(ChartWizardV3, {
    open: true,
    dataSources: {},
    loadedData: {},
    chronoGroups: [],
    onClose() {},
    onCreate() {},
  }));
  const stages = [
    ["chart-stage-destination", "Destination"],
    ["chart-stage-data-source", "Data source"],
    ["chart-stage-chart-type", "Chart type"],
    ["chart-stage-map-and-prepare-data", "Map and prepare"],
    ["chart-stage-configure-chart", "Configure"],
    ["chart-stage-review-and-create", "Review"],
  ];
  let lastIndex = -1;
  for (const [id, label] of stages) {
    const markup = buttonMarkupById(html, id);
    const index = html.indexOf(markup);
    assert.match(markup, new RegExp(`aria-label="${label}\\.`));
    assert.ok(index > lastIndex, `${label} should be in order`);
    lastIndex = index;
  }
  assert.equal((html.match(/id="chart-stage-/g) ?? []).length, 6);
  assert.doesNotMatch(
    html.slice(html.indexOf("Choose a chart type")),
    /Background|Series color|Line width|Bar width/,
  );
});

test("wizard controller retains detached authoritative existing chart context", () => {
  const existing = validLineChart({
    id: "existing-trend",
    interaction: { timeSync: null },
  });
  const state = createChartWizardState({
    loadedData: {
      "exercise-data": [{ period: "May", capacity: 4 }],
    },
    chronoGroups: [],
    existingCharts: [existing],
  });

  assert.equal(state.charts[0].id, "existing-trend");
  assert.notEqual(state.charts[0], existing);
  assert.deepEqual(existing.interaction.timeSync, null);
});

test("every wizard stage remains enabled and explains unmet prerequisites", () => {
  const html = render(React.createElement(ChartWizardV3, {
    open: true,
    dataSources: {},
    loadedData: {},
    chronoGroups: [],
    onClose() {},
    onCreate() {},
  }));

  for (const id of [
    "chart-stage-destination",
    "chart-stage-chart-type",
    "chart-stage-data-source",
    "chart-stage-map-and-prepare-data",
    "chart-stage-configure-chart",
    "chart-stage-review-and-create",
  ]) {
    assert.doesNotMatch(buttonMarkupById(html, id), /disabled=""/);
  }
  assert.match(buttonMarkupById(html, "chart-stage-chart-type"), /Waiting on prerequisite/);
});

test("data source controls stay enabled before chart capability is known", () => {
  const html = render(React.createElement(DataSourceStep, {
    dataSources: {
      "exercise-data": { kind: "dataset" },
    },
    loadedData: {
      "exercise-data": [{ value: 4 }],
    },
    prerequisites: ["Choose a chart type."],
    manualAllowed: false,
  }));

  assert.match(html, /Choose a chart type/);
  assert.doesNotMatch(html, /<select[^>]*disabled/);
  assert.doesNotMatch(html, /type="file"[^>]*disabled/);
  assert.doesNotMatch(html, /Enter data manually/);
});

test("axis tick font sizes persist and pie slice-readout choices include neither", () => {
  assert.deepEqual(
    updateStructuredFieldValue("axes", {}, ["x", "labelFontSize"], 16),
    { x: { labelFontSize: 16 } },
  );
  assert.deepEqual(
    updateStructuredFieldValue("axes", {}, ["primary", "labelFontSize"], 18),
    { primary: { labelFontSize: 18 } },
  );
  assert.deepEqual(
    updateStructuredFieldValue("axes", {}, ["x", "labelWrap"], true),
    { x: { labelWrap: true } },
  );
  assert.deepEqual(
    updateStructuredFieldValue("axes", {}, ["x", "labelMaxWidthEm"], 10),
    { x: { labelMaxWidthEm: 10 } },
  );
  const axesHtml = render(React.createElement(StandardField, {
    field: { id: "axes", label: "Axes", control: "axes", xKind: "category" },
    value: { x: { labelFontSize: 15, labelWrap: true } },
    onChange() {},
  }));
  assert.match(axesHtml, /Wrapped label width \(× tick-label font size\)/);
  assert.match(axesHtml, /value="8"/);
  const html = render(React.createElement(StandardField, {
    field: {
      id: "labels",
      label: "Labels",
      control: "labels",
      controls: ["valueMode"],
    },
    value: { valueMode: "value" },
    onChange() {},
  }));

  assert.match(html, /class="dashboard-authoring-boolean-row"[^>]*><input[^>]*type="radio"[^>]*>Show value<\/label>/);
  assert.match(html, /class="dashboard-authoring-boolean-row"[^>]*><input[^>]*type="radio"[^>]*>Show percentage<\/label>/);
  assert.match(html, /class="dashboard-authoring-boolean-row"[^>]*><input[^>]*type="radio"[^>]*>No slice readout<\/label>/);
});

test("data source controls offer copying an existing chart into the draft", () => {
  const html = render(React.createElement(DataSourceStep, {
    existingCharts: [{ id: "cases-chart", title: "Confirmed cases", typeId: "line" }],
    onCopyChart() {},
  }));

  assert.match(html, /Copy from another chart/);
  assert.match(html, /Confirmed cases/);
});

test("edit-mode source selection keeps existing authorities and hides unsupported additions", () => {
  const html = render(React.createElement(DataSourceStep, {
    allowSourceCreation: false,
    dashboard: {},
    dataSources: {
      "exercise-data": { kind: "dataset" },
    },
    loadedData: {
      "exercise-data": [{ value: 4 }],
    },
    manualAllowed: true,
    geographyRequired: true,
    geoSources: [{ value: "managed-boundaries", label: "Managed boundaries" }],
    onSelectExisting() {},
    onGeoSourceChange() {},
  }));

  assert.match(html, /Managed data source/);
  assert.match(html, /Managed boundaries/);
  assert.doesNotMatch(html, /Upload a new CSV/);
  assert.doesNotMatch(html, /Enter data manually/);
  assert.doesNotMatch(html, /Upload GeoJSON/);
});

test("discard and source-removal confirmations call only the approved callbacks", () => {
  const calls = [];
  const dialog = ConfirmDialog({
    open: true,
    title: "Discard chart?",
    message: "The unfinished chart will be lost.",
    confirmLabel: "Discard",
    cancelLabel: "Continue editing",
    onConfirm() {
      calls.push("discard");
    },
    onCancel() {
      calls.push("continue");
    },
  });
  const discard = findElement(dialog, (element) => (
    element.type === "button" && element.props.children === "Discard"
  ));
  const keep = findElement(dialog, (element) => (
    element.type === "button" && element.props.children === "Continue editing"
  ));

  assert.equal(dialog.props.role, "dialog");
  assert.equal(dialog.props["aria-modal"], "true");
  keep.props.onClick();
  assert.deepEqual(calls, ["continue"]);
  discard.props.onClick();
  assert.deepEqual(calls, ["continue", "discard"]);

  const source = render(React.createElement(DataSourceStep, {
    selectedSourceId: "exercise-data",
    dataSources: { "exercise-data": { kind: "dataset" } },
    loadedData: { "exercise-data": [{ region: "North", value: 4 }] },
    profile: profileDataset([{ region: "North", value: 4 }]),
    onSelectExisting() {},
    onRequestClear() {},
  }));
  assert.match(source, /aria-label="Reset selection"/);
});

test("a generically locked confirmation ignores both cancel activation and Escape", () => {
  const calls = [];
  const dialog = ConfirmDialog({
    open: true,
    disabled: true,
    cancelLabel: "Keep editing",
    onCancel() {
      calls.push("cancel");
    },
  });
  const keep = findElement(dialog, (element) => (
    element.type === "button" && element.props.children === "Keep editing"
  ));

  assert.equal(keep.props.disabled, true);
  keep.props.onClick();
  dialog.props.onEscape();
  assert.deepEqual(calls, []);
});

test("selected data sources show detected types, examples, and warnings", () => {
  const rows = [
    { reported_at: "01/02/2027", capacity: 12, region: "North" },
    { reported_at: "02/03/2027", capacity: 14, region: "South" },
  ];
  const profile = profileDataset(rows, {
    reported_at: { interpretation: "temporal" },
  });
  const html = render(React.createElement(DataSourceStep, {
    selectedSourceId: "exercise-data",
    dataSources: { "exercise-data": { kind: "dataset" } },
    loadedData: { "exercise-data": rows },
    profile,
    manualAllowed: false,
    onSelectExisting() {},
  }));

  assert.match(html, /Detected columns/);
  assert.match(html, /capacity/);
  assert.match(html, /Number/);
  assert.match(html, /12/);
  assert.match(html, /Warnings/);
  assert.doesNotMatch(html, /Enter data manually/);
});

test("local CSV upload uses the existing parser and returns a profiled dataset source", async () => {
  const parsed = await parseUploadedCsvFile({
    name: "Exercise Status.csv",
    async text() {
      return "region,value\nNorth,12\nSouth,14\n";
    },
  }, {
    "upload-exercise-status": { kind: "dataset" },
  });

  assert.equal(parsed.sourceId, "upload-exercise-status-2");
  assert.deepEqual(parsed.rows, [
    { region: "North", value: 12 },
    { region: "South", value: 14 },
  ]);
  assert.deepEqual(parsed.source, {
    kind: "dataset",
    type: "uploadedCsv",
    fileName: "Exercise Status.csv",
    csvText: "region,value\nNorth,12\nSouth,14\n",
  });
  assert.equal(
    parsed.profile.columns.find(({ name }) => name === "value").type,
    "numeric",
  );
});

test("ordinary CSV line charts do not enter GeoJSON persistence when both GeoJSON identities are absent", () => {
  const chart = validLineChart();

  assert.equal(chart.presentation?.map?.geoSource, undefined);
  assert.equal(typeof chartWizardModule.shouldCommitActiveGeoDraft, "function");
  assert.equal(
    chartWizardModule.shouldCommitActiveGeoDraft(null, chart.presentation?.map?.geoSource),
    false,
  );
});

test("data-source picker lists only managed builder CSV and keeps upload chart-draft owned", () => {
  const calls = [];
  const html = render(React.createElement(DataSourcePicker, {
    dashboard: {
      contentLibrary: { sourceEntries: {
        managed: {
          sourceId: "managed", origin: "uploaded", ownership: "builder", displayName: "Managed cases",
          provenance: { fileName: "managed.csv" }, health: "ready",
        },
        managed_secondary: {
          sourceId: "managed_secondary", origin: "uploaded", ownership: "builder", displayName: "Managed cases",
          provenance: { fileName: "secondary.csv" }, health: "ready",
        },
        generated: {
          sourceId: "generated", origin: "generated", ownership: "dashboard", displayName: "Generated summary",
          provenance: { ownership: "dashboard", generated: true }, health: "ready",
        },
      } },
      dataSources: {
        managed: { kind: "dataset", type: "uploadedCsv", fileName: "managed.csv", csvText: "region,value\nNorth,1\n" },
        managed_secondary: { kind: "dataset", type: "uploadedCsv", fileName: "secondary.csv", csvText: "region,value\nSouth,2\n" },
        generated: { kind: "csv", path: "data/generated.csv", provenance: { ownership: "dashboard", generated: true } },
      },
    },
    loadedData: {
      managed: [{ region: "North", value: 1 }],
      managed_secondary: [{ region: "South", value: 2 }],
      generated: [{ value: 9 }],
    },
    selectedSourceId: "managed",
    onSelect: (id) => calls.push(id),
    onUpload: () => {},
  }));

  assert.match(html, /Managed cases — managed\.csv/);
  assert.match(html, /Managed cases — secondary\.csv/);
  assert.doesNotMatch(html, /Generated summary/);
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-haspopup="listbox"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /style="--accessible-listbox-width:24rem"/);
  assert.doesNotMatch(html, /<select/);
  assert.match(html, /Upload a new CSV/);
  assert.match(html, /accept="\.csv,text\/csv"/);
  assert.match(html, /data-draft-owner="chart"/);
  assert.deepEqual(calls, []);
});

test("uploaded CSV keeps its active draft when existing or uploaded source changes are cancelled", async () => {
  const harness = chartCsvLifecycleHarness();
  const active = chartCsvInput("upload-active", "active.csv", [{ date: "2026-01-01", value: 4 }]);
  const pending = chartCsvInput("upload-pending", "pending.csv", [{ date: "2026-01-02", value: 7 }]);

  await harness.lifecycle.stagePendingUpload(active, chartCsvCandidate(active));
  await harness.lifecycle.adoptPending("initial-upload");
  assert.equal(harness.dashboard.dataSources?.["upload-active"], undefined);
  assert.equal(harness.dashboard.datasetProfiles?.["upload-active"], undefined);
  await harness.lifecycle.setPendingNonUpload("existing-managed");
  assert.deepEqual(harness.lifecycle.snapshot(), {
    activeDraftId: active.draftId,
    activeSourceId: "upload-active",
    pendingDraftId: null,
    pendingSourceId: null,
    pendingKind: "existing-managed",
  });
  assert.deepEqual(harness.coordinator.getActiveRetainers().sourceIds, ["upload-active"]);
  await harness.lifecycle.keepCurrent("existing-cancelled");
  assert.equal(harness.lifecycle.activeCandidate("upload-active").source.fileName, "active.csv");

  await harness.lifecycle.stagePendingUpload(pending, chartCsvCandidate(pending));
  assert.deepEqual(harness.coordinator.getActiveRetainers().sourceIds, ["upload-active", "upload-pending"]);
  await harness.lifecycle.keepCurrent("upload-cancelled");
  assert.equal(harness.lifecycle.activeCandidate("upload-active").source.fileName, "active.csv");
  assert.deepEqual(harness.coordinator.getActiveRetainers().sourceIds, ["upload-active"]);
});

test("confirmed uploaded CSV replacement adopts only the pending authority and cleanup removes both slots", async () => {
  const harness = chartCsvLifecycleHarness();
  const active = chartCsvInput("upload-active", "active.csv", [{ date: "2026-01-01", value: 4 }]);
  const pending = chartCsvInput("upload-pending", "pending.csv", [{ date: "2026-01-02", value: 7 }]);

  await harness.lifecycle.stagePendingUpload(active, chartCsvCandidate(active));
  await harness.lifecycle.adoptPending("initial-upload");
  await harness.lifecycle.stagePendingUpload(pending, chartCsvCandidate(pending));
  await harness.lifecycle.adoptPending("confirmed-replacement");
  assert.throws(() => harness.lifecycle.activeCandidate("upload-active"), /does not match/);
  assert.equal(harness.lifecycle.activeCandidate("upload-pending").source.fileName, "pending.csv");
  assert.deepEqual(harness.coordinator.getActiveRetainers().sourceIds, ["upload-pending"]);

  await harness.lifecycle.stagePendingUpload(active, chartCsvCandidate(active));
  await harness.lifecycle.dispose("unmount");
  assert.deepEqual(harness.lifecycle.snapshot(), {
    activeDraftId: null,
    activeSourceId: null,
    pendingDraftId: null,
    pendingSourceId: null,
    pendingKind: null,
  });
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
  await assert.rejects(
    harness.lifecycle.stagePendingUpload(pending, chartCsvCandidate(pending)),
    /disposed/,
  );
});

test("chart CSV completion commits the selected source profile entry and chart from one active slot", async () => {
  const harness = chartCsvLifecycleHarness();
  const staged = chartCsvInput("upload-complete", "complete.csv", [{ date: "2026-01-01", value: 9 }]);
  await harness.lifecycle.stagePendingUpload(staged, chartCsvCandidate(staged));
  await harness.lifecycle.adoptPending("initial-upload");
  const finalized = finalizeWizardDraft(createWizardState({
    draft: createChartDraft("line", {
      id: "chart-csv-complete",
      title: "CSV completion",
      sourceId: "upload-complete",
      roles: {
        measurements: [{ field: "value", axis: "primary" }],
        observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" },
      },
    }),
    loadedData: { "upload-complete": [{ date: "2026-01-01", value: 9 }] },
    profiles: { "upload-complete": staged.profile },
    chronoGroups: [],
  }));
  const complete = buildCsvContentDraft({
    owner: "chart",
    sourceId: staged.entry.sourceId,
    source: staged.source,
    profile: staged.profile,
    displayName: "Complete",
    finalized,
    destination: { pageId: "overview", sectionId: "response", relation: "append" },
  });

  await harness.lifecycle.completeActive("upload-complete", complete);
  assert.equal(harness.dashboard.dataSources["upload-complete"].fileName, "complete.csv");
  assert.equal(harness.dashboard.datasetProfiles["upload-complete"].fingerprint, staged.profile.fingerprint);
  assert.equal(harness.dashboard.contentLibrary.sourceEntries["upload-complete"].ownership, "builder");
  assert.equal(harness.dashboard.pages[0].sections[0].panels.at(-1).sourceId, "upload-complete");
  assert.deepEqual(harness.coordinator.getActiveRetainers().records, []);
});

test("local CSV upload rejects oversized files before reading them", async () => {
  let read = false;
  await assert.rejects(
    parseUploadedCsvFile({
      name: "oversized.csv",
      size: Number.MAX_SAFE_INTEGER,
      async text() {
        read = true;
        return "region,value\nNorth,12\n";
      },
    }),
    /too large|maximum/i,
  );
  assert.equal(read, false);
});

test("manual entry is offered only when the selected schema permits concise inline data", () => {
  const common = {
    dataSources: {},
    loadedData: {},
    onSelectExisting() {},
    onSelectManual() {},
  };
  const allowed = render(React.createElement(DataSourceStep, {
    ...common,
    manualAllowed: true,
    manualTable: {
      columns: [
        { fieldId: "category", header: "Category" },
        { fieldId: "value", header: "Value" },
      ],
      rows: [{ category: "Ready", value: "6" }],
    },
    onManualTableChange() {},
  }));
  const unavailable = render(React.createElement(DataSourceStep, {
    ...common,
    manualAllowed: false,
  }));

  assert.match(allowed, /Enter data manually/);
  assert.match(allowed, /Category/);
  assert.doesNotMatch(unavailable, /Enter data manually/);
});

test("data roles render measurements first and duplicate controls only for correlated duplicates", () => {
  const measurements = {
    id: "measurements",
    label: "Measurements",
    control: "role",
    path: ["roles", "measurements"],
    value: [{ field: "capacity", axis: "primary" }],
    accepts: ["number"],
    multiple: true,
    min: 1,
    max: null,
    axisOptions: ["primary", "secondary"],
  };
  const observation = {
    id: "observation",
    label: "Observation / X-axis",
    control: "role",
    path: ["roles", "observation"],
    value: { field: "period" },
    accepts: ["category", "temporal"],
    min: 1,
    max: 1,
  };
  const base = {
    section: {
      id: "data",
      label: "Data roles",
      fields: [observation, measurements],
    },
    columns: [
      { name: "period", type: "category" },
      { name: "capacity", type: "numeric" },
    ],
    chart: validLineChart(),
    onChange() {},
  };
  const withoutDuplicates = render(React.createElement(DataRolesStep, base));
  const withDuplicates = render(React.createElement(DataRolesStep, {
    ...base,
    section: {
      ...base.section,
      fields: [
        ...base.section.fields,
        {
          id: "duplicates",
          label: "Duplicate observations",
          control: "duplicates",
          path: ["transformations", "duplicates"],
          duplicateGroupCount: 2,
        },
      ],
    },
  }));

  assert.ok(
    withoutDuplicates.indexOf("Measurements")
      < withoutDuplicates.indexOf("Observation / X-axis"),
  );
  assert.match(withoutDuplicates, /Primary/);
  assert.match(withoutDuplicates, /Secondary/);
  assert.doesNotMatch(withoutDuplicates, /Duplicate observations/);
  assert.match(withDuplicates, /Duplicate observations/);
});

test("axis chart data forms expose an opt-in measures-to-rows pivot control", () => {
  const axisChart = createChartDraft("horizontalStackedBar", {
    id: "pivot-form",
    title: "Pivot form",
    sourceId: "income",
    roles: {
      measurements: [{ field: "population" }, { field: "income" }],
      observation: { field: "bracket" },
    },
  });
  const pivotField = buildEditorFormModel({ chart: axisChart })
    .sections.find(({ id }) => id === "data")
    .fields.find(({ id }) => id === "pivot");

  assert.equal(pivotField.control, "pivot");
  assert.match(pivotField.help, /Observation field.*series or stack segment/i);
  assert.match(
    render(React.createElement(SchemaField, { field: pivotField, chart: axisChart })),
    /type="checkbox"/,
  );

  const gauge = createChartDraft("gauge", {
    id: "gauge-form",
    title: "Gauge form",
    sourceId: "income",
    roles: { value: { field: "population" } },
  });
  const gaugeFields = buildEditorFormModel({ chart: gauge })
    .sections.find(({ id }) => id === "data")
    .fields;
  assert.equal(gaugeFields.some(({ id }) => id === "pivot"), false);
});

test("duplicate resolution shows the chart's unresolved error state instead of an unapplied choice", () => {
  const html = render(React.createElement(StandardField, {
    field: {
      id: "duplicates",
      label: "Duplicate observations",
      control: "duplicates",
      value: null,
    },
  }));

  assert.match(html, /<option value="error" selected="">Flag as an error<\/option>/);
  assert.doesNotMatch(html, /<option value="first" selected="">Use first observation<\/option>/);
});

test("style and layout starts with the actual preview and separates advanced controls", () => {
  const rows = [{ period: "May", capacity: 4 }];
  const chart = validLineChart();
  const profile = profileDataset(rows);
  const html = render(React.createElement(StyleLayoutStep, {
    chart,
    rows,
    profile,
    sections: [
      {
        id: "appearance",
        label: "Appearance",
        fields: [{
          id: "title",
          label: "Chart title",
          control: "text",
          path: ["title"],
          value: chart.title,
        }],
      },
      {
        id: "advanced",
        label: "Advanced",
        advanced: true,
        fields: [{
          id: "description",
          label: "Description",
          control: "textarea",
          path: ["description"],
          value: "",
        }],
      },
    ],
    onChange() {},
  }));

  assert.ok(html.indexOf("Chart preview") < html.indexOf("Appearance"));
  assert.match(html, /<details[^>]*>.*<summary>Advanced<\/summary>/);
});

test("Configure drops its unused in-form preview column when the render proof is persistent", () => {
  const html = render(React.createElement(StyleLayoutStep, {
    chart: validLineChart(),
    showPreview: false,
    sections: [],
  }));

  assert.match(
    html,
    /class="chart-wizard-style-grid chart-wizard-style-grid--without-preview"/,
  );
});

test("style step hides presentation and interaction controls until the current preview is ready", () => {
  const rows = [{ period: "May", capacity: 4 }];
  const incomplete = createChartDraft("line", {
    id: "incomplete-style",
    title: "",
    sourceId: "exercise-data",
    roles: {},
  });
  const invalidRuntime = createWizardPreparation({
    chart: incomplete,
    rows,
  });
  const invalidModel = buildEditorFormModel({
    chart: incomplete,
    profile: invalidRuntime.profile,
    prepared: invalidRuntime.prepared,
  });
  const invalid = render(React.createElement(StyleLayoutStep, {
    chart: incomplete,
    rows,
    profile: invalidRuntime.profile,
    prepared: invalidRuntime.prepared,
    sections: invalidModel.sections,
    prerequisites: ["Assign the required data roles."],
    onChange() {},
  }));

  assert.match(invalid, /Chart title/);
  assert.doesNotMatch(
    invalid,
    /Background|Title alignment|Zoom|Synchronized playback|Advanced/,
  );

  const readyChart = validLineChart();
  const readyRuntime = createWizardPreparation({
    chart: readyChart,
    rows,
  });
  const readyModel = buildEditorFormModel({
    chart: readyChart,
    profile: readyRuntime.profile,
    prepared: readyRuntime.prepared,
  });
  const ready = render(React.createElement(StyleLayoutStep, {
    chart: readyChart,
    rows,
    profile: readyRuntime.profile,
    prepared: readyRuntime.prepared,
    sections: readyModel.sections,
    onChange() {},
  }));

  assert.match(ready, /Title alignment/);
  assert.match(ready, /Background/);
  assert.match(ready, /Series colors/);
  assert.match(ready, /Line width/);
  assert.doesNotMatch(ready, /Bar width/);
  assert.match(ready, /Zoom/);
  assert.match(ready, /Advanced/);
});

test("tracked map and choropleth data reach ready wizard style and editor previews", async () => {
  for (const chartId of [
    "bio_wastewater_map",
    "bio_municipality_choropleth_animation",
  ]) {
    const {
      chart,
      rows,
      geoData,
      source,
    } = await trackedGeographyFixture(chartId);
    const runtime = createWizardPreparation({
      chart,
      rows,
      authorMetadata: source.parsingMetadata,
      geoData,
    });
    const model = buildEditorFormModel({
      chart,
      profile: runtime.profile,
      prepared: runtime.prepared,
      chronoGroups: [],
    });

    assert.equal(runtime.prepared.status, "ready", chartId);
    assert.ok(
      model.sections.some(({ id }) => id === "appearance"),
      `${chartId} style controls must be reachable`,
    );

    const styleHtml = render(React.createElement(StyleLayoutStep, {
      chart,
      rows,
      geoData,
      profile: runtime.profile,
      prepared: runtime.prepared,
      sections: model.sections,
      onChange() {},
    }));
    assert.match(styleHtml, /chart-authoring-preview-ready/, chartId);
    assert.match(styleHtml, /Title alignment/, chartId);

    const editorHtml = render(React.createElement(ChartEditorV3, {
      chart,
      rows,
      geoData,
      profile: runtime.profile,
      loadedData: { [chart.sourceId]: rows },
      profiles: { [chart.sourceId]: runtime.profile },
      chronoGroups: [],
    }));
    assert.match(editorHtml, /chart-authoring-preview-ready/, chartId);
    assert.doesNotMatch(editorHtml, /Preview needs attention/, chartId);
  }
});

test("fresh geography drafts can select validated GeoJSON before preview readiness", async () => {
  for (const chartId of [
    "bio_municipality_choropleth_animation",
    "bio_wastewater_map",
  ]) {
    const {
      chart: configured,
      geoData,
      geoSourceId,
      rows,
      source,
    } = await trackedGeographyFixture(chartId);
    const draft = createChartDraft(configured.typeId, {
      id: `fresh-${configured.typeId}`,
      title: `Fresh ${configured.typeId}`,
      sourceId: configured.sourceId,
      roles: structuredClone(configured.roles),
    });
    const missing = createWizardPreparation({
      chart: draft,
      rows,
      authorMetadata: source.parsingMetadata,
    });
    assert.equal(missing.prepared.status, "invalid", chartId);
    assert.ok(missing.prepared.diagnostics.some((diagnostic) => (
      diagnostic.code === "geography-source-required"
      && diagnostic.fieldId === "geoSource"
    )), chartId);

    const geoSources = [{
      value: geoSourceId,
      label: source.provenance.label,
    }];
    const missingModel = buildEditorFormModel({
      chart: draft,
      profile: missing.profile,
      prepared: missing.prepared,
      geoSources,
    });
    const geoField = missingModel.sections
      .find(({ id }) => id === "data")
      ?.fields.find(({ id }) => id === "geoSource");
    assert.deepEqual(geoField?.path, [
      "presentation",
      "map",
      "geoSource",
    ], chartId);
    assert.deepEqual(geoField?.options, [
      { value: "", label: "Choose a GeoJSON source" },
      ...geoSources,
    ], chartId);

    const sourceHtml = render(React.createElement(DataSourceStep, {
      dataSources: {},
      loadedData: {},
      selectedSourceId: draft.sourceId,
      geographyRequired: true,
      geoSources,
      selectedGeoSourceId: "",
      onGeoSourceChange() {},
    }));
    assert.match(sourceHtml, /GeoJSON source/, chartId);
    assert.doesNotMatch(sourceHtml, /Scale|Join field|Background|Color/, chartId);

    const selectedChart = applyGeographySourceSelection(draft, {
      sourceId: geoSourceId,
      geoData,
      rows,
    });
    assert.equal(draft.presentation.map, undefined, chartId);
    assert.equal(
      selectedChart.presentation.map.geoSource,
      geoSourceId,
      chartId,
    );
    assert.equal(selectedChart.presentation.map.scale, undefined, chartId);

    const selected = createWizardPreparation({
      chart: selectedChart,
      rows,
      authorMetadata: source.parsingMetadata,
      geoData,
    });
    const wizardModel = buildWizardFormModel({
      draft: selectedChart,
      profile: selected.profile,
      prepared: selected.prepared,
      chronoGroups: [],
      geoSources,
    });
    const readyModel = buildEditorFormModel({
      chart: selectedChart,
      profile: selected.profile,
      prepared: selected.prepared,
      geoSources,
    });
    assert.equal(selected.prepared.status, "ready", chartId);
    assert.equal(wizardModel.canCreate, true, chartId);
    assert.equal(readyModel.sections.some(({ id }) => id === "map"), false, chartId);

    const editorHtml = render(React.createElement(ChartEditorV3, {
      chart: selectedChart,
      rows,
      geoDataSources: { [geoSourceId]: geoData },
      dataSources: {
        [geoSourceId]: {
          kind: "geojson",
          provenance: { label: geoSources[0].label },
        },
      },
      profile: selected.profile,
      loadedData: { [configured.sourceId]: rows },
      profiles: { [configured.sourceId]: selected.profile },
      chronoGroups: [],
    }));
    assert.match(editorHtml, /chart-authoring-preview-ready/, chartId);
    assert.equal(
      (editorHtml.match(/data-field-id="geoSource"/g) ?? []).length,
      1,
      `${chartId} must expose one non-conflicting geography-source control`,
    );
  }
});

test("changing a geography source invalidates stale preparation and conversion can recover", async () => {
  const {
    chart: configured,
    geoData,
    geoSourceId,
    rows,
    source,
  } = await trackedGeographyFixture(
    "bio_municipality_choropleth_animation",
  );
  const first = createChartDraft("chronoChoroplethMap", {
    id: "fresh-geography-change",
    title: "Fresh geography change",
    sourceId: configured.sourceId,
    roles: structuredClone(configured.roles),
    presentation: {
      map: { geoSource: geoSourceId },
    },
  });
  const prepared = createWizardPreparation({
    chart: first,
    rows,
    geoData,
    authorMetadata: source.parsingMetadata,
  });
  const changedState = reduceChartEditorState(
    createChartEditorState({ chart: first }),
    {
      type: "updateChart",
      path: ["presentation", "map", "geoSource"],
      value: "geo_netherlands_municipalities_2020",
    },
  );
  const stale = buildEditorFormModel({
    chart: changedState.draft,
    profile: prepared.profile,
    prepared: prepared.prepared,
    geoSources: [
      { value: geoSourceId, label: "2021 municipalities" },
      {
        value: "geo_netherlands_municipalities_2020",
        label: "2020 municipalities",
      },
    ],
  });
  assert.equal(stale.valid, false);
  assert.equal(stale.sections.some(({ id }) => id === "map"), false);
  assert.ok(stale.sections
    .find(({ id }) => id === "data")
    .fields.some(({ id }) => id === "geoSource"));

  const converted = createChartDraft("mapScatter", {
    id: "converted-geography",
    title: "Converted geography",
    sourceId: configured.sourceId,
    roles: {
      geography: configured.roles.geography,
      value: configured.roles.value,
      time: configured.roles.time,
    },
  });
  const conversionRuntime = createWizardPreparation({
    chart: converted,
    rows,
    authorMetadata: source.parsingMetadata,
  });
  const conversionModel = buildEditorFormModel({
    chart: converted,
    profile: conversionRuntime.profile,
    prepared: conversionRuntime.prepared,
    geoSources: [{ value: geoSourceId, label: "2021 municipalities" }],
  });
  assert.ok(conversionModel.sections
    .find(({ id }) => id === "data")
    .fields.some(({ id }) => id === "geoSource"));
});

test("property-only GeoJSON joins stay reachable and renderer-ready for both geography charts", () => {
  const rows = [
    { area: "north", value: 12, observed: "2027-05-01" },
    { area: "south", value: 7, observed: "2027-05-01" },
  ];
  const geoData = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { areaCode: "north", label: "North" },
        geometry: { type: "Point", coordinates: [4.9, 52.3] },
      },
      {
        type: "Feature",
        properties: { areaCode: "south", label: "South" },
        geometry: { type: "Point", coordinates: [5.1, 52.1] },
      },
    ],
  };
  const synchronizeRoles = geographySource.applyGeographyRoleSelection;
  const joinOptions = geographySource.geoJoinFieldOptions;
  assert.equal(typeof synchronizeRoles, "function");
  assert.equal(typeof joinOptions, "function");

  for (const typeId of ["chronoChoroplethMap", "mapScatter"]) {
    const roleless = createChartDraft(typeId, {
      id: `property-only-${typeId}`,
      title: `Property-only ${typeId}`,
      sourceId: "property-values",
    });
    const selected = applyGeographySourceSelection(roleless, {
      sourceId: "property-boundaries",
      geoData,
      rows,
    });
    assert.equal(selected.presentation.map.joinField, undefined, typeId);

    const withRoles = {
      ...selected,
      roles: {
        geography: { field: "area" },
        value: { field: "value" },
        time: { field: "observed" },
      },
    };
    const joined = synchronizeRoles(withRoles, { geoData, rows });
    assert.equal(joined.presentation.map.joinField, "areaCode", typeId);

    const runtime = createWizardPreparation({
      chart: joined,
      rows,
      geoData,
    });
    const geoJoinFields = joinOptions(geoData);
    const editor = buildEditorFormModel({
      chart: joined,
      profile: runtime.profile,
      prepared: runtime.prepared,
      geoSources: [{
        value: "property-boundaries",
        label: "Property-only boundaries",
      }],
      geoJoinFields,
    });
    const dataFields = editor.sections.find(({ id }) => id === "data").fields;
    const joinField = dataFields.find(({ id }) => id === "geoJoinField");
    assert.deepEqual(joinField?.path, [
      "presentation",
      "map",
      "joinField",
    ], typeId);
    assert.deepEqual(joinField?.options, [
      {
        value: "",
        label: "Detect feature ID or property automatically",
      },
      { value: "areaCode", label: "areaCode" },
      { value: "label", label: "label" },
    ], typeId);
    assert.equal(joinField?.value, "areaCode", typeId);
    assert.equal(runtime.prepared.status, "ready", typeId);
    assert.equal(runtime.prepared.marks.length, 2, typeId);
    assert.equal(
      buildWizardFormModel({
        draft: joined,
        profile: runtime.profile,
        prepared: runtime.prepared,
        geoSources: [{
          value: "property-boundaries",
          label: "Property-only boundaries",
        }],
        geoJoinFields,
      }).canCreate,
      true,
      typeId,
    );

    const dataHtml = render(React.createElement(DataRolesStep, {
      section: editor.sections.find(({ id }) => id === "data"),
      columns: runtime.profile.columns,
      diagnostics: runtime.prepared.diagnostics,
      onChange() {},
    }));
    assert.equal(
      (dataHtml.match(/data-field-id="geoJoinField"/g) ?? []).length,
      1,
      typeId,
    );
    assert.equal(editor.sections.some(({ id }) => id === "map"), false, typeId);

    const changedSource = applyGeographySourceSelection(joined, {
      sourceId: "replacement-boundaries",
      geoData: {
        type: "FeatureCollection",
        features: geoData.features.map((feature) => ({
          ...feature,
          properties: {
            districtCode: feature.properties.areaCode,
          },
        })),
      },
      rows,
    });
    assert.equal(
      changedSource.presentation.map.geoSource,
      "replacement-boundaries",
      typeId,
    );
    assert.equal(
      changedSource.presentation.map.joinField,
      "districtCode",
      typeId,
    );
  }
});

test("ambiguous and missing geography joins identify the early semantic field and recover explicitly", () => {
  const rows = [{ area: "north", value: 12, observed: "2027-05-01" }];
  const feature = (properties) => ({
    type: "Feature",
    properties,
    geometry: { type: "Point", coordinates: [4.9, 52.3] },
  });
  const chart = createChartDraft("chronoChoroplethMap", {
    id: "ambiguous-property-join",
    title: "Ambiguous property join",
    sourceId: "property-values",
    roles: {
      geography: { field: "area" },
      value: { field: "value" },
      time: { field: "observed" },
    },
    presentation: {
      map: {
        geoSource: "ambiguous-boundaries",
        scale: "sequential",
      },
    },
  });
  const ambiguousGeoData = {
    type: "FeatureCollection",
    features: [feature({ areaCode: "north", alternateCode: "north" })],
  };
  const ambiguous = createWizardPreparation({
    chart,
    rows,
    geoData: ambiguousGeoData,
  });
  assert.equal(ambiguous.prepared.status, "invalid");
  assert.ok(ambiguous.prepared.diagnostics.some((diagnostic) => (
    diagnostic.code === "geography-join-ambiguous"
    && diagnostic.fieldId === "geoJoinField"
  )));

  const missing = createWizardPreparation({
    chart,
    rows,
    geoData: {
      type: "FeatureCollection",
      features: [feature({ areaCode: "west" })],
    },
  });
  assert.equal(missing.prepared.status, "invalid");
  assert.ok(missing.prepared.diagnostics.some((diagnostic) => (
    diagnostic.code === "geography-join-unmatched"
    && diagnostic.fieldId === "geoJoinField"
  )));

  const recovered = structuredClone(chart);
  recovered.presentation.map.joinField = "areaCode";
  const preserved = geographySource.applyGeographyRoleSelection(recovered, {
    geoData: ambiguousGeoData,
    rows,
  });
  assert.equal(preserved.presentation.map.joinField, "areaCode");
  const ready = createWizardPreparation({
    chart: preserved,
    rows,
    geoData: ambiguousGeoData,
  });
  assert.equal(ready.prepared.status, "ready");
  assert.equal(ready.prepared.marks[0].feature.properties.areaCode, "north");
});

test("ready style layout renders the schema-generated label-position control", () => {
  const rows = [{ period: "May", capacity: 4 }];
  const chart = validLineChart();
  const runtime = createWizardPreparation({ chart, rows });
  const model = buildEditorFormModel({
    chart,
    profile: runtime.profile,
    prepared: runtime.prepared,
  });
  const labels = model.sections.filter(({ id }) => id === "labels");

  const html = render(React.createElement(StyleLayoutStep, {
    chart,
    rows,
    profile: runtime.profile,
    prepared: runtime.prepared,
    sections: labels,
    onChange() {},
  }));

  assert.match(html, /Label position/);
  assert.match(html, />Top<\/option>/);
});

test("wizard preparation correlates the current chart, rows, and profile", () => {
  const rows = [{ period: "May", capacity: 4 }];
  const chart = validLineChart();
  const runtime = createWizardPreparation({
    chart,
    rows,
  });

  assert.equal(runtime.profile.rowCount, 1);
  assert.equal(runtime.prepared.status, "ready");
  assert.match(
    runtime.prepared.meta.formPreparationKey,
    /^chart-form-preparation-v1:/,
  );
});

test("wizard membership keeps matching in group members and chart-local state null", () => {
  const chart = createChartDraft("line", {
    id: "exercise-trend",
    title: "Exercise trend",
    sourceId: "exercise-data",
    roles: {
      measurements: [{ field: "capacity", axis: "primary" }],
      observation: {
        field: "reportedAt",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
  });
  const groups = [{
    id: "exercise-clock",
    name: "Exercise clock",
    period: { start: "2027-05-01", end: "2027-05-02" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [],
  }];
  const next = applyWizardMembership({
    chart,
    groups,
    groupId: "exercise-clock",
    selected: true,
    timeRole: "observation",
  });

  assert.equal(next.chart.interaction.timeSync, null);
  assert.deepEqual(next.groups[0].members, [{
    chartId: "exercise-trend",
    timeRole: "observation",
  }]);
  assert.equal("temporalMatch" in next.chart.transformations, false);
  assert.deepEqual(groups[0].members, []);
});

test("moving within the same synchronization group preserves member matching", () => {
  const chart = createChartDraft("line", {
    id: "exercise-trend",
    title: "Exercise trend",
    sourceId: "exercise-data",
    roles: {
      measurements: [{ field: "capacity", axis: "primary" }],
      observation: {
        field: "reportedAt",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    interaction: { timeSync: null },
  });
  const groups = [{
    id: "exercise-clock",
    name: "Exercise clock",
    period: { start: "2027-05-01", end: "2027-05-02" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [{
      chartId: "exercise-trend",
      timeRole: "observation",
      matching: { policy: "lastKnown" },
    }],
  }];
  const next = applyWizardMembership({
    chart,
    groups,
    groupId: "exercise-clock",
    selected: true,
    timeRole: "observation",
  });

  assert.deepEqual(next.groups[0].members[0].matching, {
    policy: "lastKnown",
  });
});

test("wizard submit callback runs only after normalized chart and whole-group validation", () => {
  const rows = [
    { period: "May", capacity: 4 },
    { period: "June", capacity: 6 },
  ];
  const profile = profileDataset(rows);
  let state = createWizardState({
    loadedData: { "exercise-data": rows },
    profiles: { "exercise-data": profile },
    chronoGroups: [],
  });
  state = reduceWizardState(state, {
    type: "selectType",
    typeId: "line",
    chart: { id: "new-trend", title: "Capacity trend" },
  });
  state = reduceWizardState(state, {
    type: "selectSource",
    sourceId: "exercise-data",
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "measurements",
    value: [{ field: "capacity", axis: "primary" }],
  });
  state = reduceWizardState(state, {
    type: "updateRole",
    roleId: "observation",
    value: { field: "period", interpretation: "category" },
  });
  const calls = [];
  const result = submitWizardDraft(state, (value) => calls.push(value));

  assert.equal(calls.length, 1);
  assert.equal(result, calls[0]);
  assert.deepEqual(Object.keys(result), ["chart", "chronoGroups"]);
  assert.equal(result.chart.id, "new-trend");
  assert.equal(result.chart.sourceId, "exercise-data");
  assert.equal("temporalMatch" in result.chart.transformations, false);

  assert.throws(
    () => submitWizardDraft(createWizardState(), (value) => calls.push(value)),
    /choose a chart type/i,
  );
  assert.equal(calls.length, 1);
});

test("contextual editor tabs are derived from materialized sections without a generic series tab", () => {
  const pie = validPieChart();
  const pieRuntime = createWizardPreparation({
    chart: pie,
    rows: [
      { category: "Ready", value: 6 },
      { category: "Delayed", value: 2 },
    ],
  });
  const pieModel = buildEditorFormModel({
    chart: pie,
    profile: pieRuntime.profile,
    prepared: pieRuntime.prepared,
  });
  const pieTabs = buildContextualTabs(pieModel.sections);
  const pieHtml = render(React.createElement(ContextualTabs, {
    sections: pieModel.sections,
    activeTabId: "data",
    onSelect() {},
    onChange() {},
  }));

  assert.deepEqual(pieTabs.map(({ label }) => label), [
    "Data",
    "Appearance",
    "Advanced",
  ]);
  assert.match(pieHtml, /data-icon-control="editor\.tab\.data"/);
  assert.match(pieHtml, /data-icon-control="editor\.tab\.appearance"/);
  assert.doesNotMatch(pieHtml, /data-icon-control="editor\.tab\.axes"/);
  assert.doesNotMatch(pieHtml, /data-icon-control="editor\.tab\.map"/);
  assert.doesNotMatch(pieHtml, /data-icon-control="editor\.tab\.timeline"/);
  assert.doesNotMatch(pieHtml, /aria-label="Series"/);

  const line = validLineChart();
  const lineRuntime = createWizardPreparation({
    chart: line,
    rows: [{ period: "May", capacity: 4 }],
  });
  const lineModel = buildEditorFormModel({
    chart: line,
    profile: lineRuntime.profile,
    prepared: lineRuntime.prepared,
  });
  assert.deepEqual(
    buildContextualTabs(lineModel.sections).map(({ label }) => label),
    ["Data", "Appearance", "Axes", "Interactions", "Advanced"],
  );
});

test("editor keeps title repair reachable before preview readiness", () => {
  const chart = createChartDraft("line", {
    id: "repair-title",
    title: "",
    sourceId: "exercise-data",
  });
  const html = render(React.createElement(ChartEditorV3, {
    chart,
    rows: [{ period: "May", capacity: 4 }],
    chronoGroups: [],
    existingCharts: [],
    loadedData: {
      "exercise-data": [{ period: "May", capacity: 4 }],
    },
    onSave() {},
    onReset() {},
    onCancel() {},
  }));

  assert.match(html, /Chart title/);
  assert.match(html, /data-icon-control="editor\.tab\.data"/);
  assert.match(html, /data-icon-control="editor\.tab\.appearance"/);
  assert.match(html, /class="chart-editor-form dashboard-authoring-shell"/);
  assert.match(
    html,
    /<form class="chart-editor-form dashboard-authoring-shell"><header[^]*?<\/header><nav class="chart-editor-tab-list dashboard-dialog__progress" data-authoring-track="tabs"[^]*?<\/nav><div class="chart-editor-layout dashboard-authoring-body" data-authoring-track="body"/,
  );
  assert.match(html, /<\/div><footer class="dashboard-dialog__footer dashboard-authoring-footer" data-authoring-track="footer">/);
});

test("save and reset are adjacent and reset confirmation is accessible", () => {
  const html = render(React.createElement(EditSessionActions, {
    valid: true,
    resetConfirmationOpen: true,
    onSave() {},
    onRequestReset() {},
    onConfirmReset() {},
    onCancelReset() {},
    onCancel() {},
  }));

  const saveIndex = html.indexOf('data-icon-control="editor.save-changes"');
  const resetIndex = html.indexOf('data-icon-control="editor.reset-changes"');
  const dialogIndex = html.indexOf('role="dialog"');
  const actionMarkup = html.slice(0, dialogIndex);
  assert.ok(saveIndex >= 0);
  assert.ok(resetIndex > saveIndex);
  assert.match(actionMarkup, /aria-label="Save changes"/);
  assert.match(actionMarkup, /aria-label="Reset changes"/);
  assert.doesNotMatch(actionMarkup, />Save<\/button>|>Reset changes<\/button>/);
  assert.match(html, /role="dialog"/);
  assert.match(html, /Discard these edits\?/);
  assert.match(html, /Reset changes\?/);
});

test("chart editor actions lock while persistence is pending", () => {
  const tree = EditSessionActions({
    valid: true,
    submitting: true,
    onRemove() {},
  });
  const controls = findElementsByType(tree, IconControl);
  const html = render(React.createElement(EditSessionActions, {
    valid: true,
    submitting: true,
    onRemove() {},
  }));
  assert.match(html, /aria-label="Saving changes"/);
  assert.equal((html.match(/disabled=""/g) ?? []).length, 4);
  assert.deepEqual(
    controls.map(({ props }) => props.disabledReason),
    Array(4).fill("Wait for the current chart operation to finish."),
  );
});

test("chart editor actions place the full-editor glyph immediately before Save", () => {
  let opened = 0;
  const html = render(React.createElement(EditSessionActions, {
    valid: true,
    leadingAction: {
      interactionId: "shell.open-editable-tab",
      ariaLabel: "Open full editor",
      tooltip: "Open full editor",
      onClick() { opened += 1; },
    },
    onSave() {},
  }));
  const openIndex = html.indexOf('data-icon-control="shell.open-editable-tab"');
  const saveIndex = html.indexOf('data-icon-control="editor.save-changes"');
  assert.ok(openIndex >= 0);
  assert.ok(saveIndex > openIndex);
  assert.deepEqual(
    [...html.matchAll(/data-icon-control="([^"]+)"/g)].map((match) => match[1]).slice(0, 2),
    ["shell.open-editable-tab", "editor.save-changes"],
  );
  assert.match(html, /aria-label="Open full editor"/);
  assert.match(html, /data-icon-tooltip="Open full editor"/);

  const tree = EditSessionActions({
    valid: true,
    leadingAction: {
      interactionId: "shell.open-editable-tab",
      ariaLabel: "Open full editor",
      tooltip: "Open full editor",
      onClick() { opened += 1; },
    },
    onSave() {},
  });
  const open = findElement(tree, (element) => (
    element.type === IconControl && element.props.interactionId === "shell.open-editable-tab"
  ));
  assert.ok(open);
  open.props.onClick();
  assert.equal(opened, 1);
});

test("chart editor actions fail closed for a malformed leading action", () => {
  for (const leadingAction of [{}, { interactionId: "stale.unknown-action" }]) {
    assert.doesNotThrow(() => render(React.createElement(EditSessionActions, {
      valid: true,
      leadingAction,
      onSave() {},
    })));
    const html = render(React.createElement(EditSessionActions, {
      valid: true,
      leadingAction,
      onSave() {},
    }));
    assert.doesNotMatch(html, /data-icon-control="undefined"/);
    assert.doesNotMatch(html, /data-icon-control="stale\.unknown-action"/);
    assert.equal((html.match(/data-icon-control="/g) ?? []).length, 3);
  }
});

test("pending chart persistence disables and guards removal", () => {
  let removals = 0;
  const tree = EditSessionActions({
    valid: true,
    submitting: true,
    onRemove() {
      removals += 1;
    },
  });
  const remove = findElement(tree, (element) => (
    element.type === IconControl && element.props.interactionId === "chart.remove"
  ));

  assert.ok(remove);
  assert.equal(remove.props.disabled, true);
  remove.props.onClick();
  assert.equal(removals, 0);
});

test("quick editor renders the complete controlled surface without full-editor ownership", () => {
  const chart = validLineChart({
    presentation: {
      background: { color: "#FFFFFF", transparent: false },
      series: { colors: ["#043BCB", "#36BDEB"] },
      referenceLine: {
        visible: true,
        value: 7,
        label: "Target",
        color: "#E56B2F",
        lineStyle: "dashed",
      },
    },
  });
  const session = reduceChartEditSession(
    createChartEditSession({ placementId: "placement-line", chart }),
    {
      type: "CHANGE",
      surface: "quick",
      draft: { ...chart, title: "Locally edited title" },
    },
  );
  const html = render(React.createElement(ChartQuickEditor, {
    session,
    onDraftChange() {},
    onSave() {},
    onReset() {},
    onClose() {},
    onRemove() {},
    onOpenFullEditor() {},
  }));

  assert.match(html, /Quick edit/);
  assert.match(html, /Chart title/);
  assert.match(html, /Show title/);
  assert.match(html, /Background/);
  assert.match(html, /Show legend/);
  assert.match(html, /Series colors/);
  assert.match(html, /Reference line color/);
  assert.match(html, /Chart size/);
  assert.match(html, /data-icon-control="shell.open-editable-tab"/);
  assert.doesNotMatch(html, /chart-quick-editor-open-full/);
  assert.match(html, /aria-label="Save"/);
  assert.match(html, /aria-label="Reset"/);
  assert.match(html, /aria-label="Close"/);
  assert.match(html, /aria-label="Remove chart"/);
  assert.doesNotMatch(html, /chart-editor-backdrop|chart-editor-preview|editor\.tab\./);
});

test("quick editor keeps Save available for profile-inferred temporal axes", async () => {
  const rows = [
    { recordedAt: "2027-05-01", capacity: 4 },
    { recordedAt: "2027-05-02", capacity: 6 },
  ];
  const chart = validLineChart({
    roles: {
      measurements: [{ field: "capacity", axis: "primary" }],
      observation: { field: "recordedAt" },
    },
    presentation: {
      axes: {
        x: {
          labelPreset: "adaptive",
          tickFrequency: { every: 1, unit: "day" },
        },
      },
    },
  });
  const session = reduceChartEditSession(
    createChartEditSession({ placementId: "placement-temporal", chart }),
    {
      type: "CHANGE",
      surface: "quick",
      draft: { ...chart, title: "Updated temporal chart" },
    },
  );
  let saves = 0;
  const tree = ChartQuickEditor({
    session,
    profile: profileDataset(rows, {
      recordedAt: { interpretation: "temporal" },
    }),
    onSave() { saves += 1; },
  });
  const form = findElement(tree, (element) => element.type === "form");
  const actions = findElement(tree, (element) => element.type === EditSessionActions);

  assert.equal(actions.props.valid, true);
  form.props.onSubmit({ preventDefault() {} });
  assert.equal(saves, 1);

  const renderer = await readFile(
    new URL("../src/components/DashboardRenderer.jsx", import.meta.url),
    "utf8",
  );
  assert.match(
    renderer,
    /<ChartQuickEditor[\s\S]*?profile=\{workingDashboard\.datasetProfiles\?\.\[chartEditSession\.draft\.sourceId\]\}/,
  );
});

test("quick editor emits detached draft changes and delegates every session action", () => {
  const chart = validLineChart();
  const session = reduceChartEditSession(
    createChartEditSession({
      placementId: "placement-line",
      chart,
    }),
    {
      type: "CHANGE",
      surface: "quick",
      draft: { ...chart, title: "Existing quick draft" },
    },
  );
  const drafts = [];
  const actions = [];
  let prevented = 0;
  const tree = ChartQuickEditor({
    session,
    onDraftChange(nextDraft) {
      drafts.push(nextDraft);
    },
    onSave() { actions.push("save"); },
    onReset() { actions.push("reset"); },
    onClose() { actions.push("close"); },
    onRemove() { actions.push("remove"); },
    onOpenFullEditor() { actions.push("full"); },
  });
  const quickSection = findElement(tree, (element) => (
    element.type === GeneratedFormSection
  ));
  const footprint = findElement(tree, (element) => (
    element.type === ChartFootprintPicker
  ));
  const editActions = findElement(tree, (element) => (
    element.type === EditSessionActions
  ));
  const form = findElement(tree, (element) => element.type === "form");
  const openFull = editActions.props.leadingAction;

  quickSection.props.onChange(["title"], "Detached title");
  quickSection.props.onChange(
    ["presentation", "title", "visible"],
    false,
  );
  footprint.props.onChange({ columns: 3, rows: 0.75 });
  form.props.onSubmit({ preventDefault() { prevented += 1; } });
  editActions.props.onRequestReset();
  editActions.props.onCancel();
  editActions.props.onRemove();
  openFull.onClick();

  assert.equal(prevented, 1);
  assert.deepEqual(actions, ["save", "reset", "close", "remove", "full"]);
  assert.equal(chart.title, "Contract line");
  assert.equal(chart.presentation.title.visible, undefined);
  assert.equal(session.draft.presentation.title.visible, undefined);
  assert.deepEqual(chart.layout, { size: "standard" });
  assert.deepEqual(session.draft.layout, { size: "standard" });
  assert.equal(drafts[0].title, "Detached title");
  assert.equal(drafts[1].presentation.title.visible, false);
  assert.deepEqual(drafts[2].layout, {
    size: "standard",
    width: 3,
    height: 0.75,
  });
  assert.notEqual(drafts[0], session.draft);
  assert.notEqual(drafts[1].presentation, session.draft.presentation);
});

test("quick editor guards clean and externally locked actions while preserving full-editor access gating", () => {
  const session = createChartEditSession({
    placementId: "placement-line",
    chart: validLineChart(),
  });
  const clean = render(React.createElement(ChartQuickEditor, { session }));
  const cleanSave = buttonMarkupByInteraction(clean, "editor.save-changes");
  assert.match(cleanSave, /disabled=""/);

  const actions = [];
  const lockedTree = ChartQuickEditor({
    session,
    disabled: true,
    onSave() { actions.push("save"); },
    onOpenFullEditor() { actions.push("full"); },
  });
  const form = findElement(lockedTree, (element) => element.type === "form");
  const editActions = findElement(lockedTree, (element) => (
    element.type === EditSessionActions
  ));
  const openFull = editActions.props.leadingAction;
  const lockedAside = findElement(lockedTree, (element) => element.type === "aside");

  form.props.onSubmit({ preventDefault() {} });
  openFull.onClick();
  assert.deepEqual(actions, []);
  assert.equal(openFull.disabled, true);
  assert.equal(editActions.props.disabled, true);
  assert.equal(lockedAside.props.inert, true);
});

test("saving quick editor keeps hover reason anchors exposed while controls stay locked", () => {
  const clean = createChartEditSession({
    placementId: "placement-line",
    chart: validLineChart(),
  });
  const dirty = reduceChartEditSession(clean, {
    type: "CHANGE",
    surface: "quick",
    draft: { ...clean.draft, title: "Pending durable title" },
  });
  const saving = prepareChartEditSessionSave(dirty).session;
  const html = render(React.createElement(ChartQuickEditor, {
    session: saving,
    disabled: true,
    onSave() {},
    onRemove() {},
    onOpenFullEditor() {},
  }));
  const tree = ChartQuickEditor({
    session: saving,
    disabled: true,
    onSave() {},
    onRemove() {},
    onOpenFullEditor() {},
  });
  const savingAside = findElement(tree, (element) => element.type === "aside");
  const aside = html.match(/<aside\b[^>]*>/)?.[0] ?? "";
  const reasonAnchors = [...html.matchAll(
    /<span class="control-tooltip"[^>]*data-control-tooltip-kind="disabled"[^>]*>/g,
  )].map((match) => match[0]);
  const reasonIds = reasonAnchors.map(
    (anchor) => anchor.match(/aria-describedby="([^"]+)"/)?.[1],
  );

  assert.match(aside, /aria-busy="true"/);
  assert.match(aside, /data-chart-edit-status="saving"/);
  assert.equal(savingAside.props.inert, undefined);
  assert.doesNotMatch(aside, /\sinert(?:=|\s|>)/);
  assert.equal(reasonIds.length, 4);
  for (const reasonAnchor of reasonAnchors) {
    assert.doesNotMatch(reasonAnchor, /tabindex=/);
  }
  for (const reasonId of reasonIds) {
    assert.ok(reasonId);
    assert.match(
      html,
      new RegExp(`id="${reasonId}" role="tooltip"[^>]*>Wait for the current chart operation to finish\\.`),
    );
  }
  for (const interactionId of [
    "editor.save-changes",
    "editor.reset-changes",
    "editor.cancel",
    "chart.remove",
  ]) {
    const button = buttonMarkupByInteraction(html, interactionId);
    assert.match(button, /disabled=""/);
    assert.doesNotMatch(button, /aria-describedby=/);
  }
});

test("quick editor fails closed when durable and full-editor authorities are absent", () => {
  const chart = validLineChart();
  const session = reduceChartEditSession(
    createChartEditSession({ placementId: "placement-line", chart }),
    {
      type: "CHANGE",
      surface: "quick",
      draft: { ...chart, title: "Unsaved quick title" },
    },
  );
  const tree = ChartQuickEditor({ session });
  const editActions = findElement(tree, (element) => (
    element.type === EditSessionActions
  ));
  const openFull = editActions.props.leadingAction;

  assert.equal(openFull.disabled, true);
  assert.equal(editActions.props.saveDisabled, true);
  assert.equal(editActions.props.removeDisabled, true);
  assert.match(editActions.props.saveDisabledReason, /unavailable/i);
  assert.match(editActions.props.removeDisabledReason, /unavailable/i);

  const html = render(React.createElement(ChartQuickEditor, { session }));
  assert.match(buttonMarkupByInteraction(html, "editor.save-changes"), /disabled=""/);
  assert.match(buttonMarkupByInteraction(html, "chart.remove"), /disabled=""/);
  assert.match(html, /Full editing is unavailable for this chart session\./);
});

test("Full wizard continues the shared Quick draft and exposes edit-only Save changes semantics", () => {
  const chart = validLineChart();
  const quick = reduceChartEditSession(
    createChartEditSession({
      placementId: "placement-line",
      chart,
      chronoGroups: [],
    }),
    {
      type: "CHANGE",
      surface: "quick",
      draft: { ...chart, title: "Quick continuity title" },
    },
  );
  const full = reduceChartEditSession(quick, { type: "OPEN", surface: "full" });
  const initialDraftState = createChartWizardEditState({
    session: full,
    loadedData: {
      "exercise-data": [
        { period: "May", capacity: 4 },
        { period: "June", capacity: 7 },
      ],
    },
    profiles: {},
    chronoGroups: [],
    existingCharts: [chart],
    destination: { pageId: "page-a", sectionId: "section-a" },
    stage: "review-and-create",
  });

  assert.equal(initialDraftState.draft.title, "Quick continuity title");
  assert.equal(initialDraftState.draftId, "chart-edit:placement-line");

  const html = render(React.createElement(ChartWizardV3, {
    mode: "edit",
    open: true,
    editSession: full,
    initialDraftState,
    dataSources: { "exercise-data": { id: "exercise-data", kind: "dataset" } },
    loadedData: initialDraftState.loadedData,
    datasetProfiles: initialDraftState.profiles,
    chronoGroups: [],
    existingCharts: [chart],
    destination: { pageId: "page-a", sectionId: "section-a" },
    onClose() {},
    onSaveChanges() {},
    onCreate() {
      throw new Error("Edit mode must not expose chart creation.");
    },
  }));

  assert.match(html, /Edit chart/);
  assert.match(html, /aria-label="Chart editing steps"/);
  assert.match(html, /aria-label="Save changes"/);
  assert.doesNotMatch(html, /Add new chart|aria-label="Create chart"/);

  const sourceHtml = render(React.createElement(ChartWizardV3, {
    mode: "edit",
    open: true,
    editSession: full,
    initialDraftState: { ...initialDraftState, stage: "data-source" },
    dashboard: {
      dataSources: { "exercise-data": { id: "exercise-data", kind: "dataset" } },
      contentLibrary: { sourceEntries: {} },
    },
    dataSources: { "exercise-data": { id: "exercise-data", kind: "dataset" } },
    loadedData: initialDraftState.loadedData,
    datasetProfiles: initialDraftState.profiles,
    chronoGroups: [],
    existingCharts: [chart],
    destination: { pageId: "page-a", sectionId: "section-a" },
    onClose() {},
    onSaveChanges() {},
  }));
  assert.match(sourceHtml, /Managed data source/);
  assert.doesNotMatch(sourceHtml, /Upload a new CSV|Enter data manually|Upload GeoJSON/);
});

test("full chart edit restores an uploaded CSV as the selected existing source", () => {
  const chart = validLineChart({ sourceId: "uploaded-cases" });
  const session = reduceChartEditSession(createChartEditSession({
    placementId: "placement-line",
    chart,
    chronoGroups: [],
    activeSurface: "full",
  }), { type: "OPEN", surface: "full" });
  const source = {
    kind: "dataset",
    type: "uploadedCsv",
    fileName: "cases.csv",
    csvText: "period,capacity\nMay,4\n",
  };
  const state = createChartWizardEditState({
    session,
    loadedData: { "uploaded-cases": [{ period: "May", capacity: 4 }] },
    profiles: {},
    chronoGroups: [],
    existingCharts: [chart],
    destination: { pageId: "page-a", sectionId: "section-a" },
    source,
    stage: "data-source",
  });

  assert.equal(state.sourceSelection.kind, "existing");
  assert.deepEqual(state.sourceSelection.source, source);
});

test("full chart edit enables destination choices without a separate move control", () => {
  const chart = validLineChart();
  const session = reduceChartEditSession(createChartEditSession({
    placementId: "placement-line",
    chart,
    chronoGroups: [],
    activeSurface: "full",
  }), { type: "OPEN", surface: "full" });
  const html = render(React.createElement(ChartWizardV3, {
    mode: "edit",
    open: true,
    editSession: session,
    initialDraftState: createChartWizardEditState({
      session,
      loadedData: { "exercise-data": [{ period: "May", capacity: 4 }] },
      profiles: {},
      chronoGroups: [],
      existingCharts: [chart],
      destination: { pageId: "page-a", sectionId: "section-a" },
      source: { kind: "dataset", type: "uploadedCsv", fileName: "cases.csv", csvText: "period,capacity\nMay,4\n" },
      stage: "destination",
    }),
    dashboard: {
      pages: [
        { id: "page-a", title: "Page A", sections: [{ id: "section-a", title: "Section A", panels: [{ id: "placement-line", chart }] }] },
        { id: "page-b", title: "Page B", sections: [{ id: "section-b", title: "Section B", panels: [] }] },
      ],
    },
    loadedData: { "exercise-data": [{ period: "May", capacity: 4 }] },
    dataSources: { "exercise-data": { kind: "dataset", type: "uploadedCsv", fileName: "cases.csv", csvText: "period,capacity\nMay,4\n" } },
    datasetProfiles: {},
    chronoGroups: [],
    existingCharts: [chart],
    destination: { pageId: "page-a", sectionId: "section-a" },
    onClose() {},
    onSaveChanges() {},
  }));

  assert.doesNotMatch(html, /Move placement/);
  assert.match(html, /Destination page<select(?![^>]*disabled)/);
  assert.match(html, /Destination section<select(?![^>]*disabled)/);
  assert.match(html, /Insertion<select(?![^>]*disabled)/);
});

test("edit-mode wizard commit routes only to the placement Save authority", async () => {
  const calls = [];
  const runtimeArtifact = { id: "runtime-full-only" };
  const payload = buildChartWizardEditCommitPayload({
    placementId: "placement-line",
    finalized: {
      chart: validLineChart({ title: "Full-only title" }),
      chronoGroups: [],
    },
    runtimeArtifact,
  });

  assert.equal(Object.hasOwn(payload.chart, "runtimeArtifact"), false);
  assert.equal(payload.runtimeArtifact, runtimeArtifact);

  const result = await routeChartWizardCommit({
    mode: "edit",
    payload,
    reviewedPlacement: { pageId: "page-a", sectionId: "section-a" },
    onSaveChanges(value) {
      calls.push(["save", value]);
      return { committed: true };
    },
    onCreate() {
      calls.push(["create"]);
    },
  });

  assert.deepEqual(calls, [["save", payload]]);
  assert.deepEqual(result, { committed: true });
});

test("chart creation acquires one owner only when retainable and keeps its identity through suspension and retry", () => {
  const incomplete = createWizardState({
    destination: { pageId: "page-a", sectionId: "section-a" },
  });
  assert.equal(projectChartCreateOwner(incomplete, { retainable: false }), null);

  const valid = createWizardState({
    draftId: "draft-a",
    draft: validPieChart(),
    status: "editing",
  });
  const active = projectChartCreateOwner(valid, {
    retainable: true,
    activity: "active",
  });
  assert.deepEqual(active, {
    id: "chart-create:draft-a",
    kind: "chart-create",
    scopeId: "draft-a",
    targetId: "draft-a",
    label: "New chart draft",
    status: "dirty",
    activity: "active",
    surface: "create",
    restoration: null,
    activation: "focus",
  });

  const suspended = projectChartCreateOwner({
    ...valid,
    suspension: {
      restoration: { focusId: "chart-stage-review-and-create", scrollTop: 330 },
    },
  }, { retainable: true, activity: "suspended" });
  assert.equal(suspended.id, active.id);
  assert.equal(suspended.activity, "suspended");
  assert.equal(suspended.activation, "resume");
  assert.deepEqual(suspended.restoration, {
    focusId: "chart-stage-review-and-create",
    scrollTop: 330,
  });

  assert.equal(projectChartCreateOwner({ ...valid, status: "committing" }, {
    retainable: true,
  }).status, "saving");
  assert.equal(projectChartCreateOwner({ ...valid, status: "failed" }, {
    retainable: true,
  }).status, "error");
  assert.equal(projectChartCreateOwner({ ...valid, status: "ambiguous" }, {
    retainable: true,
  }).id, active.id);
  assert.equal(projectChartCreateOwner({ ...valid, status: "committed" }, {
    retainable: true,
  }), null);
  assert.equal(projectChartCreateOwner({ ...valid, discarded: true }, {
    retainable: true,
  }), null);
});

test("every committed creation authority resolves its owner before the surface closes", () => {
  const calls = [];
  assert.equal(typeof chartWizardModule.resolveChartCreationOwnerCommit, "function");

  const resolved = chartWizardModule.resolveChartCreationOwnerCommit(
    { status: "committed" },
    {
      onOwnerChange(owner) {
        calls.push(["owner", owner]);
      },
      onCommitSuccess() {
        calls.push(["success"]);
      },
    },
  );

  assert.equal(resolved, true);
  assert.deepEqual(calls, [["owner", null], ["success"]]);
  assert.equal(chartWizardModule.resolveChartCreationOwnerCommit(
    { status: "failed" },
    {
      onOwnerChange() {
        calls.push(["unexpected-owner"]);
      },
      onCommitSuccess() {
        calls.push(["unexpected-success"]);
      },
    },
  ), false);
  assert.deepEqual(calls, [["owner", null], ["success"]]);
});

test("pending chart creation guards Escape, Close, and discard", () => {
  const calls = [];
  const controls = createWizardCloseHandlers({
    isSubmitting: () => true,
    onRequestClose() {
      calls.push("request");
    },
    onConfirmClose() {
      calls.push("confirm");
    },
  });

  assert.equal(controls.requestClose(), false);
  assert.equal(controls.confirmClose(), false);
  assert.deepEqual(calls, []);
});

test("full editor discard confirms only when the edit session is dirty", () => {
  assert.equal(discardConfirmationRequired({ editMode: true, editDirty: false }), false);
  assert.equal(discardConfirmationRequired({ editMode: true, editDirty: true }), true);
  assert.equal(discardConfirmationRequired({ editMode: false, editDirty: false }), true);
});

test("Gauge creation preserves the selected footprint into reviewed persistence", () => {
  const destination = { pageId: "overview", sectionId: "status", footprint: { columns: 2, rows: 2 } };
  assert.equal(chartDestinationForType(destination, "gauge"), destination);
  assert.equal(chartDestinationForType(destination, "kpi"), destination);
});

test("quick gauge editing leaves panel-size controls enabled", () => {
  const chart = createChartDraft("gauge", {
    id: "gauge-footprint",
    title: "Capacity",
    sourceId: "exercise-data",
    roles: {
      value: { field: "capacity" },
      target: { field: "target" },
    },
    layout: { size: "compact", width: 1, height: 0.5 },
  });
  const session = createChartEditSession({ placementId: "placement-gauge", chart });
  const tree = ChartQuickEditor({ session, onDraftChange() {} });
  const footprint = findElement(tree, (element) => element.type === ChartFootprintPicker);

  assert.equal(footprint.props.disabled, false);
});

test("editor state isolates mutation and same-authority rerenders preserve the draft", () => {
  const saved = validLineChart();
  const state = createChartEditorState({
    chart: saved,
    chronoGroups: [],
    revision: 7,
  });
  const edited = reduceChartEditorState(state, {
    type: "updateChart",
    path: ["title"],
    value: "Locally edited",
  });
  const rerendered = rebaseChartEditorState(edited, {
    chart: structuredClone(saved),
    chronoGroups: [],
    revision: 7,
  });

  assert.equal(saved.title, "Contract line");
  assert.equal(edited.draft.title, "Locally edited");
  assert.notEqual(edited.draft, saved);
  assert.equal(rerendered, edited);
});

test("chart editor dirty projection clears only when the changed draft becomes saved authority", () => {
  const state = createChartEditorState({
    chart: validLineChart(),
    chronoGroups: [],
    revision: 7,
  });
  assert.equal(isChartEditorStateDirty(state), false);

  const editedChart = reduceChartEditorState(state, {
    type: "updateChart",
    path: ["title"],
    value: "Unsaved title",
  });
  assert.equal(isChartEditorStateDirty(editedChart), true);

  const savedChart = acceptEditorSave(editedChart, {
    chart: editedChart.draft,
    chronoGroups: editedChart.chronoGroups,
  });
  assert.equal(isChartEditorStateDirty(savedChart), false);
});

test("chart wizard dirty projection ignores an untouched open wizard and clears on close", () => {
  const initial = createChartWizardState({
    loadedData: {},
    profiles: {},
    chronoGroups: [],
    existingCharts: [],
  });
  assert.equal(isChartWizardStateDirty({ open: true, wizard: initial }), false);

  const changed = reduceWizardState(initial, {
    type: "selectType",
    typeId: "line",
    chart: { id: "new-chart", title: "New chart" },
  });
  assert.equal(isChartWizardStateDirty({ open: true, wizard: changed }), true);

  const closing = reduceWizardState(changed, { type: "requestClose" });
  const discarded = reduceWizardState(closing, { type: "confirmClose" });
  assert.equal(isChartWizardStateDirty({ open: true, wizard: discarded }), false);
  assert.equal(isChartWizardStateDirty({ open: false, wizard: changed }), false);
});

test("chart wizard draft eligibility tracks net input rather than its default destination", () => {
  const initial = createChartWizardState({
    loadedData: {},
    profiles: {},
    chronoGroups: [],
    existingCharts: [],
  });
  const initialDestination = { pageId: "overview", sectionId: "summary" };
  const changedDestination = { pageId: "overview", sectionId: "details" };

  assert.equal(isChartWizardStateDirty({ open: true, wizard: initial }), false);

  const initialized = reduceWizardState(initial, {
    type: "initializeDestination",
    destination: initialDestination,
  });
  assert.equal(isChartWizardStateDirty({ open: true, wizard: initialized }), false);

  const changed = reduceWizardState(initialized, {
    type: "setDestination",
    destination: changedDestination,
  });
  assert.equal(isChartWizardStateDirty({ open: true, wizard: changed }), true);

  const reverted = reduceWizardState(changed, {
    type: "setDestination",
    destination: initialDestination,
  });
  assert.equal(isChartWizardStateDirty({ open: true, wizard: reverted }), false);
});

test("a new saved revision rebases and reset restores that most recent saved state", () => {
  const first = validLineChart({ title: "First saved title" });
  let state = createChartEditorState({
    chart: first,
    chronoGroups: [],
    revision: 1,
  });
  state = reduceChartEditorState(state, {
    type: "updateChart",
    path: ["title"],
    value: "Unsaved first edit",
  });
  const second = validLineChart({ title: "Second saved title" });
  state = rebaseChartEditorState(state, {
    chart: second,
    chronoGroups: [],
    revision: 2,
  });
  state = reduceChartEditorState(state, {
    type: "updateChart",
    path: ["title"],
    value: "Unsaved second edit",
  });
  const beforeCancel = state.draft;
  state = reduceChartEditorState(state, { type: "requestReset" });
  state = reduceChartEditorState(state, { type: "cancelConfirmation" });
  assert.equal(state.draft, beforeCancel);

  state = reduceChartEditorState(state, { type: "requestReset" });
  state = reduceChartEditorState(state, { type: "confirmReset" });
  assert.equal(state.draft.title, "Second saved title");
  assert.notEqual(state.draft, second);
});

test("editor discards a stale prepared correlation and recomputes readiness for the current draft", () => {
  const rows = [
    { period: "May", capacity: 4, occupied: 3 },
    { period: "June", capacity: 6, occupied: 5 },
  ];
  const oldChart = validLineChart();
  const currentChart = validLineChart({
    roles: {
      measurements: [{ field: "occupied", axis: "primary" }],
      observation: { field: "period", interpretation: "category" },
    },
  });
  const stale = createWizardPreparation({
    chart: oldChart,
    rows,
  });
  const current = createWizardPreparation({
    chart: currentChart,
    rows,
  });
  const html = render(React.createElement(ChartEditorV3, {
    chart: currentChart,
    rows,
    profile: current.profile,
    prepared: stale.prepared,
    chronoGroups: [],
    existingCharts: [],
    loadedData: { "exercise-data": rows },
    onSave() {},
    onReset() {},
    onCancel() {},
  }));

  assert.match(html, /chart-authoring-preview-ready/);
  assert.doesNotMatch(html, /<button[^>]*type="submit"[^>]*disabled/);
});

test("editor save normalizes, validates, and accepts the full synchronization group collection", () => {
  const rows = [
    { observed: "2027-05-01", capacity: 4 },
    { observed: "2027-05-02", capacity: 6 },
  ];
  const chart = synchronizedLineChart();
  const profile = profileDataset(rows, {
    observed: { interpretation: "temporal" },
  });
  const groups = [{
    id: "exercise-clock",
    name: "Exercise clock",
    period: { start: "2027-05-01", end: "2027-05-02" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [{
      chartId: chart.id,
      timeRole: "observation",
    }],
  }];
  let state = createChartEditorState({
    chart,
    chronoGroups: groups,
  });
  state = reduceChartEditorState(state, {
    type: "updateChronoGroups",
    value: [{
      ...groups[0],
      members: [{
        ...groups[0].members[0],
        matching: { policy: "nearest", toleranceMs: 3_600_000 },
      }],
    }],
  }, {
    existingCharts: [chart],
    loadedData: { "exercise-data": rows },
    profiles: { "exercise-data": profile },
  });
  const result = saveChartEditorState(state, {
    existingCharts: [chart],
    loadedData: { "exercise-data": rows },
    profiles: { "exercise-data": profile },
    profile,
  });

  assert.equal(result.chart.interaction.timeSync, null);
  assert.equal("temporalMatch" in result.chart.transformations, false);
  assert.deepEqual(
    result.chronoGroups[0].members[0].matching,
    { policy: "nearest", toleranceMs: 3_600_000 },
  );
  const accepted = acceptEditorSave(state, result);
  assert.notEqual(accepted.savedChart, result.chart);
  assert.deepEqual(accepted.savedChart, result.chart);

  const invalid = reduceChartEditorState(state, {
    type: "updateChart",
    path: ["title"],
    value: "",
  });
  assert.throws(
    () => saveChartEditorState(invalid, {
      existingCharts: [chart],
      loadedData: { "exercise-data": rows },
      profiles: { "exercise-data": profile },
      profile,
    }),
    /title/i,
  );
});

test("selecting a second synchronization group preserves the existing membership", () => {
  const rows = [
    { observed: "2027-05-01", capacity: 4 },
    { observed: "2027-05-02", capacity: 6 },
  ];
  const chart = synchronizedLineChart();
  const other = synchronizedLineChart({
    id: "other-line",
    interaction: { timeSync: null },
  });
  const profile = profileDataset(rows, {
    observed: { interpretation: "temporal" },
  });
  const group = (id, chartId) => ({
    id,
    name: id,
    period: { start: "2027-05-01", end: "2027-05-02" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [{ chartId, timeRole: "observation" }],
  });
  const state = createChartEditorState({
    chart,
    chronoGroups: [
      group("exercise-clock", chart.id),
      group("secondary-clock", other.id),
    ],
  });
  const moved = reduceChartEditorState(state, {
    type: "updateTimeSyncMembership",
    groupId: "secondary-clock",
    selected: true,
    timeRole: "observation",
  }, {
    existingCharts: [chart, other],
    loadedData: { "exercise-data": rows },
    profiles: { "exercise-data": profile },
  });

  assert.deepEqual(
    moved.chronoGroups.map(({ id }) => id),
    ["exercise-clock", "secondary-clock"],
  );
  assert.deepEqual(
    moved.chronoGroups[0].members.map(({ chartId }) => chartId),
    ["synchronized-line"],
  );
  assert.deepEqual(
    moved.chronoGroups[1].members.map(({ chartId }) => chartId),
    ["other-line", "synchronized-line"],
  );
  assert.equal(moved.draft.interaction.timeSync, null);
});

test("guided synchronized conversion remaps only the edited member semantic time role", () => {
  const rows = [
    { observed: "2027-05-01", capacity: 4 },
    { observed: "2027-05-02", capacity: 6 },
  ];
  const chart = synchronizedLineChart();
  const other = synchronizedLineChart({
    id: "other-line",
    interaction: { timeSync: null },
  });
  const profile = profileDataset(rows, {
    observed: { interpretation: "temporal" },
  });
  const groups = [{
    id: "exercise-clock",
    name: "Exercise clock",
    period: { start: "2027-05-01", end: "2027-05-02" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [
      {
        chartId: chart.id,
        timeRole: "observation",
        matching: { policy: "nearest", toleranceMs: 3_600_000 },
      },
      {
        chartId: other.id,
        timeRole: "observation",
        matching: { policy: "lastKnown" },
      },
    ],
  }];
  let state = createChartEditorState({
    chart,
    chronoGroups: groups,
  });
  state = reduceChartEditorState(state, {
    type: "requestConversion",
    targetTypeId: "kpi",
  });
  assert.deepEqual(
    state.conversion.roleFields.map(({ id }) => id),
    ["value", "time"],
  );
  assert.equal(state.conversion.timeSyncConsequence.kind, "remove");
  assert.match(
    render(React.createElement(ChartConversionDialog, {
      conversion: state.conversion,
      columns: profile.columns,
      onRoleAssignment() {},
      onConfirm() {},
      onCancel() {},
    })),
    /Synchronized playback.*will be removed/s,
  );

  state = reduceChartEditorState(state, {
    type: "updateConversionRole",
    roleId: "value",
    value: { field: "capacity" },
  });
  state = reduceChartEditorState(state, {
    type: "updateConversionRole",
    roleId: "time",
    value: {
      field: "observed",
      interpretation: "temporal",
      format: "YYYY-MM-DD",
    },
  });
  assert.deepEqual(state.conversion.timeSyncConsequence, {
    kind: "remap",
    fromRole: "observation",
    toRole: "time",
    targetLabel: "Time",
  });
  const remapHtml = render(React.createElement(ChartConversionDialog, {
    conversion: state.conversion,
    columns: profile.columns,
    onRoleAssignment() {},
    onConfirm() {},
    onCancel() {},
  }));
  assert.match(remapHtml, /Synchronized playback/);
  assert.match(remapHtml, /observation/);
  assert.match(remapHtml, /Time/);

  state = reduceChartEditorState(state, {
    type: "applyConversion",
  }, {
    existingCharts: [chart, other],
    loadedData: { "exercise-data": rows },
    profiles: { "exercise-data": profile },
    profile,
  });

  assert.equal(state.error, "");
  assert.equal(state.draft.typeId, "kpi");
  assert.equal(state.draft.interaction.timeSync, null);
  assert.deepEqual(state.chronoGroups[0].members, [
    {
      chartId: chart.id,
      timeRole: "time",
      matching: { policy: "nearest", toleranceMs: 3_600_000 },
    },
    {
      chartId: other.id,
      timeRole: "observation",
      matching: { policy: "lastKnown" },
    },
  ]);
  assert.doesNotThrow(() => validateChronoGroups(state.chronoGroups, {
    charts: [state.draft, other],
    loadedData: { "exercise-data": rows },
    profiles: { "exercise-data": profile },
  }));
});

test("multi-temporal conversion requires an explicit schema-derived playback time role", () => {
  const rows = [
    {
      observed: "2027-05-01",
      capacity: 4,
      event: "Alert issued",
      start_at: "2027-05-01",
      end_at: "2027-05-02",
    },
    {
      observed: "2027-05-02",
      capacity: 6,
      event: "Response activated",
      start_at: "2027-05-02",
      end_at: "2027-05-03",
    },
  ];
  const chart = synchronizedLineChart();
  const other = synchronizedLineChart({
    id: "other-line",
    interaction: { timeSync: null },
  });
  const profile = profileDataset(rows, {
    observed: { interpretation: "temporal" },
    start_at: { interpretation: "temporal" },
    end_at: { interpretation: "temporal" },
  });
  const groups = [{
    id: "exercise-clock",
    name: "Exercise clock",
    period: { start: "2027-05-01", end: "2027-05-03" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [
      {
        chartId: chart.id,
        timeRole: "observation",
        matching: { policy: "nearest", toleranceMs: 3_600_000 },
      },
      {
        chartId: other.id,
        timeRole: "observation",
        matching: { policy: "lastKnown" },
      },
    ],
  }];
  const context = {
    existingCharts: [chart, other],
    loadedData: { "exercise-data": rows },
    profiles: { "exercise-data": profile },
    profile,
  };
  const createAmbiguousTimelineConversion = () => {
    let next = createChartEditorState({
      chart,
      chronoGroups: groups,
    });
    next = reduceChartEditorState(next, {
      type: "requestConversion",
      targetTypeId: "timeline",
    }, context);
    next = reduceChartEditorState(next, {
      type: "updateConversionRole",
      roleId: "event",
      value: { field: "event" },
    }, context);
    next = reduceChartEditorState(next, {
      type: "updateConversionRole",
      roleId: "start",
      value: {
        field: "start_at",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    }, context);
    assert.deepEqual(next.conversion.playback.options, [{
      roleId: "start",
      label: "Start",
    }]);
    assert.deepEqual(next.conversion.playback.selection, {
      mode: "role",
      roleId: "start",
      explicit: false,
    });
    next = reduceChartEditorState(next, {
      type: "updateConversionRole",
      roleId: "end",
      value: {
        field: "end_at",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    }, context);
    return next;
  };

  let state = createAmbiguousTimelineConversion();
  assert.deepEqual(state.conversion.playback.options, [
    { roleId: "start", label: "Start" },
    { roleId: "end", label: "End" },
  ]);
  assert.equal(state.conversion.playback.selection, null);
  assert.equal(state.conversion.timeSyncConsequence.kind, "ambiguous");
  const ambiguousHtml = render(React.createElement(ChartConversionDialog, {
    conversion: state.conversion,
    columns: profile.columns,
    onRoleAssignment() {},
    onPlaybackSelection() {},
    onConfirm() {},
    onCancel() {},
  }));
  assert.match(ambiguousHtml, /Playback time role/);
  assert.match(ambiguousHtml, />Start</);
  assert.match(ambiguousHtml, />End</);
  assert.match(ambiguousHtml, /Remove from synchronized playback/);
  assert.match(
    ambiguousHtml,
    /aria-describedby="chart-conversion-playback-help chart-conversion-playback-error"/,
  );
  assert.match(
    ambiguousHtml,
    /id="chart-conversion-playback-error"[^>]*role="alert"/,
  );
  assert.doesNotMatch(
    ambiguousHtml,
    /Complete every required data role/,
  );
  assert.match(ambiguousHtml, /disabled/);

  const beforeChart = state.draft;
  const beforeGroups = state.chronoGroups;
  const beforeDialog = state.conversion;
  state = reduceChartEditorState(state, { type: "applyConversion" }, context);
  assert.equal(state.draft, beforeChart);
  assert.equal(state.chronoGroups, beforeGroups);
  assert.equal(state.conversion, beforeDialog);
  assert.match(state.error, /playback time role/i);
  assert.doesNotMatch(state.error, /required data roles/i);
  const failedHtml = render(React.createElement(ChartConversionDialog, {
    conversion: state.conversion,
    error: state.error,
    columns: profile.columns,
    onRoleAssignment() {},
    onPlaybackSelection() {},
    onConfirm() {},
    onCancel() {},
  }));
  assert.match(
    failedHtml,
    /aria-describedby="chart-conversion-consequences chart-conversion-error"/,
  );

  state = reduceChartEditorState(state, {
    type: "updateConversionPlayback",
    selection: { mode: "role", roleId: "start" },
  }, context);
  assert.deepEqual(state.conversion.timeSyncConsequence, {
    kind: "remap",
    fromRole: "observation",
    toRole: "start",
    targetLabel: "Start",
  });
  state = reduceChartEditorState(state, {
    type: "updateConversionRole",
    roleId: "start",
    value: {
      field: "event",
      interpretation: "temporal",
      format: "YYYY-MM-DD",
    },
  }, context);
  assert.deepEqual(state.conversion.playback.options, [{
    roleId: "end",
    label: "End",
  }]);
  assert.deepEqual(state.conversion.playback.selection, {
    mode: "role",
    roleId: "end",
    explicit: false,
  });
  state = reduceChartEditorState(state, {
    type: "updateConversionRole",
    roleId: "start",
    value: {
      field: "start_at",
      interpretation: "temporal",
      format: "YYYY-MM-DD",
    },
  }, context);
  assert.equal(state.conversion.playback.selection, null);
  assert.equal(state.conversion.timeSyncConsequence.kind, "ambiguous");
  state = reduceChartEditorState(state, {
    type: "updateConversionPlayback",
    selection: { mode: "role", roleId: "start" },
  }, context);
  state = reduceChartEditorState(state, { type: "applyConversion" }, context);
  assert.equal(state.error, "");
  assert.equal(state.draft.typeId, "timeline");
  assert.deepEqual(Object.keys(state.draft.roles), ["event", "start", "end"]);
  assert.equal(state.chronoGroups[0].members[0].timeRole, "start");
  assert.deepEqual(state.chronoGroups[0].members[0].matching, {
    policy: "nearest",
    toleranceMs: 3_600_000,
  });
  assert.deepEqual(state.chronoGroups[0].members[1], groups[0].members[1]);

  state = createAmbiguousTimelineConversion();
  state = reduceChartEditorState(state, {
    type: "updateConversionPlayback",
    selection: { mode: "role", roleId: "end" },
  }, context);
  state = reduceChartEditorState(state, { type: "applyConversion" }, context);
  assert.equal(state.error, "");
  assert.equal(state.chronoGroups[0].members[0].timeRole, "end");
  assert.deepEqual(Object.keys(state.draft.roles), ["event", "start", "end"]);
});

test("multi-temporal conversion cancel is exact and intentional playback removal retains analytical roles", () => {
  const rows = [{
    observed: "2027-05-01",
    capacity: 4,
    event: "Alert issued",
    start_at: "2027-05-01",
    end_at: "2027-05-02",
  }];
  const chart = synchronizedLineChart();
  const other = synchronizedLineChart({
    id: "other-line",
    interaction: { timeSync: null },
  });
  const profile = profileDataset(rows, {
    observed: { interpretation: "temporal" },
    start_at: { interpretation: "temporal" },
    end_at: { interpretation: "temporal" },
  });
  const groups = [{
    id: "exercise-clock",
    name: "Exercise clock",
    period: { start: "2027-05-01", end: "2027-05-02" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [
      {
        chartId: chart.id,
        timeRole: "observation",
        matching: { policy: "nearest", toleranceMs: 3_600_000 },
      },
      {
        chartId: other.id,
        timeRole: "observation",
        matching: { policy: "lastKnown" },
      },
    ],
  }];
  const context = {
    existingCharts: [chart, other],
    loadedData: { "exercise-data": rows },
    profiles: { "exercise-data": profile },
    profile,
  };
  const prepare = () => {
    let next = createChartEditorState({ chart, chronoGroups: groups });
    next = reduceChartEditorState(next, {
      type: "requestConversion",
      targetTypeId: "timeline",
    }, context);
    for (const [roleId, value] of Object.entries({
      event: { field: "event" },
      start: {
        field: "start_at",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
      end: {
        field: "end_at",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    })) {
      next = reduceChartEditorState(next, {
        type: "updateConversionRole",
        roleId,
        value,
      }, context);
    }
    return next;
  };

  let state = prepare();
  const draftBeforeCancel = state.draft;
  const groupsBeforeCancel = state.chronoGroups;
  state = reduceChartEditorState(state, { type: "cancelConversion" }, context);
  assert.equal(state.draft, draftBeforeCancel);
  assert.equal(state.chronoGroups, groupsBeforeCancel);
  assert.equal(state.conversion, null);

  state = prepare();
  state = reduceChartEditorState(state, {
    type: "updateConversionPlayback",
    selection: { mode: "remove" },
  }, context);
  assert.deepEqual(state.conversion.timeSyncConsequence, {
    kind: "remove",
    fromRole: "observation",
    intentional: true,
  });
  const removalHtml = render(React.createElement(ChartConversionDialog, {
    conversion: state.conversion,
    columns: profile.columns,
    onRoleAssignment() {},
    onPlaybackSelection() {},
    onConfirm() {},
    onCancel() {},
  }));
  assert.match(
    removalHtml,
    /will be removed from synchronized playback/i,
  );
  state = reduceChartEditorState(state, { type: "applyConversion" }, context);
  assert.equal(state.error, "");
  assert.equal(state.draft.typeId, "timeline");
  assert.deepEqual(Object.keys(state.draft.roles), ["event", "start", "end"]);
  assert.equal(state.draft.interaction.timeSync, null);
  assert.deepEqual(state.chronoGroups, [{
    ...groups[0],
    members: [groups[0].members[1]],
  }]);
});

test("conversion application fails closed with an associated bounded dialog error and can be corrected", () => {
  const rows = [
    { period: "May", capacity: 4 },
    { period: "June", capacity: 6 },
  ];
  const profile = profileDataset(rows);
  let state = createChartEditorState({
    chart: validLineChart(),
    chronoGroups: [],
  });
  state = reduceChartEditorState(state, {
    type: "requestConversion",
    targetTypeId: "pie",
  });
  state = reduceChartEditorState(state, {
    type: "updateConversionRole",
    roleId: "category",
    value: { field: "period", interpretation: "category" },
  });
  state = reduceChartEditorState(state, {
    type: "updateConversionRole",
    roleId: "value",
    value: { field: "period", interpretation: "category" },
  });
  const beforeChart = state.draft;
  const beforeGroups = state.chronoGroups;
  const beforeDialog = state.conversion;
  assert.doesNotThrow(() => {
    state = reduceChartEditorState(state, {
      type: "applyConversion",
    }, {
      existingCharts: [state.draft],
      loadedData: { "exercise-data": rows },
      profiles: { "exercise-data": profile },
      profile,
    });
  });
  assert.equal(state.draft, beforeChart);
  assert.equal(state.chronoGroups, beforeGroups);
  assert.equal(state.conversion, beforeDialog);
  assert.match(state.error, /required data roles/i);
  assert.ok(state.error.length <= 240);

  const invalidHtml = render(React.createElement(ChartConversionDialog, {
    conversion: state.conversion,
    error: state.error,
    columns: profile.columns,
    onRoleAssignment() {},
    onConfirm() {},
    onCancel() {},
  }));
  assert.match(
    invalidHtml,
    /aria-describedby="chart-conversion-consequences chart-conversion-error"/,
  );
  assert.match(invalidHtml, /id="chart-conversion-error"[^>]*role="alert"/);

  state = reduceChartEditorState(state, {
    type: "updateConversionRole",
    roleId: "value",
    value: { field: "capacity" },
  });
  state = reduceChartEditorState(state, {
    type: "applyConversion",
  }, {
    existingCharts: [validLineChart()],
    loadedData: { "exercise-data": rows },
    profiles: { "exercise-data": profile },
    profile,
  });
  assert.equal(state.error, "");
  assert.equal(state.draft.typeId, "pie");
  assert.equal(state.conversion, null);
});

test("conversion dialog distinguishes compatible and remapped changes and cancel preserves the exact draft", () => {
  const line = validLineChart({
    presentation: {
      axes: { primary: { title: "Capacity" } },
    },
  });
  let state = createChartEditorState({
    chart: line,
    chronoGroups: [],
  });
  state = reduceChartEditorState(state, {
    type: "requestConversion",
    targetTypeId: "area",
  });
  assert.equal(state.conversion.plan.kind, "compatible");
  assert.deepEqual(state.conversion.plan.preservedRoles, line.roles);
  const compatibleHtml = render(React.createElement(ChartConversionDialog, {
    conversion: state.conversion,
    columns: [...columnTypes().values()],
    onRoleAssignment() {},
    onConfirm() {},
    onCancel() {},
  }));
  assert.match(compatibleHtml, /Compatible change/);
  assert.match(compatibleHtml, /Preserved data roles/);

  const draftBeforeCancel = state.draft;
  state = reduceChartEditorState(state, { type: "cancelConversion" });
  assert.equal(state.draft, draftBeforeCancel);
  assert.equal(state.conversion, null);

  state = reduceChartEditorState(state, {
    type: "requestConversion",
    targetTypeId: "pie",
  });
  const remapHtml = render(React.createElement(ChartConversionDialog, {
    conversion: state.conversion,
    columns: [...columnTypes().values()],
    onRoleAssignment() {},
    onConfirm() {},
    onCancel() {},
  }));
  assert.equal(state.conversion.plan.kind, "remap");
  assert.deepEqual(
    state.conversion.plan.requiredRoles.map(({ id }) => id),
    ["category", "value"],
  );
  assert.match(remapHtml, /Role remapping required/);
  assert.match(remapHtml, /Required role remapping/);
  assert.match(remapHtml, /Axis settings: Presentation setting is not used by the target chart\./);
  assert.doesNotMatch(remapHtml, /presentation\.axes/);
  assert.match(remapHtml, /Apply chart type change/);
  assert.match(remapHtml, /disabled/);
});

test("destructive conversion applies only after complete direct role assignments and removes group-owned time membership", () => {
  const rows = [
    { observed: "2027-05-01", capacity: 4 },
    { observed: "2027-05-02", capacity: 6 },
  ];
  const chart = synchronizedLineChart({
    presentation: {
      axes: { primary: { title: "Capacity" } },
    },
  });
  const profile = profileDataset(rows, {
    observed: { interpretation: "temporal" },
  });
  const groups = [{
    id: "exercise-clock",
    name: "Exercise clock",
    period: { start: "2027-05-01", end: "2027-05-02" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [{
      chartId: chart.id,
      timeRole: "observation",
    }],
  }];
  let state = createChartEditorState({
    chart,
    chronoGroups: groups,
  });
  state = reduceChartEditorState(state, {
    type: "requestConversion",
    targetTypeId: "pie",
  });
  assert.equal(state.conversion.timeSyncConsequence.kind, "remove");
  const beforeIncompleteApply = state.draft;
  state = reduceChartEditorState(state, {
    type: "applyConversion",
  }, {
    existingCharts: [chart],
    loadedData: { "exercise-data": rows },
    profiles: { "exercise-data": profile },
    profile,
  });
  assert.equal(state.draft, beforeIncompleteApply);
  assert.match(state.error, /required data roles/i);

  state = reduceChartEditorState(state, {
    type: "updateConversionRole",
    roleId: "category",
    value: { field: "observed", interpretation: "category" },
  });
  state = reduceChartEditorState(state, {
    type: "updateConversionRole",
    roleId: "value",
    value: { field: "capacity" },
  });
  state = reduceChartEditorState(state, {
    type: "applyConversion",
  }, {
    existingCharts: [chart],
    loadedData: { "exercise-data": rows },
    profiles: { "exercise-data": profile },
    profile,
  });

  assert.equal(state.draft.typeId, "pie");
  assert.equal(state.draft.interaction.timeSync, null);
  assert.deepEqual(state.chronoGroups, []);
  assert.equal(state.conversion, null);
  assert.equal(state.previewRevision, 1);
});

test("dashboard editor profiles include unbound sources and reuse supplied profiles", () => {
  const memberRows = [
    { observed: "2027-05-01", capacity: 4 },
    { observed: "2027-05-02", capacity: 6 },
  ];
  const clockRows = [
    { clock_at: "2027-05-01" },
    { clock_at: "2027-05-02" },
  ];
  const unusedRows = [{ status: "Ready" }];
  const chart = synchronizedLineChart();
  const suppliedClockProfile = profileDataset(clockRows, {
    clock_at: { interpretation: "temporal" },
  });
  const dashboard = {
    pages: [{
      id: "page",
      sections: [{ id: "section", panels: [chart] }],
    }],
    dataSources: {
      "exercise-data": {
        parsingMetadata: {
          observed: { interpretation: "temporal" },
        },
      },
      "clock-data": {
        parsingMetadata: {
          clock_at: { interpretation: "temporal" },
        },
      },
      "unused-data": {},
    },
    loadedData: {
      "exercise-data": memberRows,
      "clock-data": clockRows,
      "unused-data": unusedRows,
    },
    profiles: {
      "clock-data": suppliedClockProfile,
    },
    chronoGroups: [{
      id: "exercise-clock",
      name: "Exercise clock",
      period: { start: "2027-05-01", end: "2027-05-02" },
      matching: { policy: "exact" },
      secondsPerFrame: 1,
      members: [{
        chartId: chart.id,
        timeRole: "observation",
      }],
    }],
  };
  const profiles = buildDashboardEditorProfiles({
    loadedData: dashboard.loadedData,
    dataSources: dashboard.dataSources,
    suppliedProfiles: dashboard.profiles,
  });
  assert.equal(profiles["clock-data"], suppliedClockProfile);
  assert.ok(profiles["exercise-data"]);
  assert.ok(profiles["unused-data"]);

  const routed = SelectedChartEditor({
    panel: chart,
    dashboard,
    onSave() {},
    onCancel() {},
  });
  assert.equal(routed.props.profiles["clock-data"], suppliedClockProfile);
  const state = createChartEditorState({
    chart,
    chronoGroups: dashboard.chronoGroups,
  });
  assert.doesNotThrow(() => saveChartEditorState(state, {
    existingCharts: routed.props.existingCharts,
    loadedData: routed.props.loadedData,
    profiles: routed.props.profiles,
    profile: routed.props.profile,
  }));
});

test("authoritative v3 routing rebases only for a changed saved snapshot and whole-dashboard save stays intact", () => {
  const first = validPieChart({ title: "First saved" });
  const same = structuredClone(first);
  const updated = validPieChart({ title: "Server-saved update" });
  const routedFirst = SelectedChartEditor({
    panel: first,
    savedRevision: "chart-revision-1",
    dashboard: {
      pages: [{
        id: "page",
        sections: [{ id: "section", panels: [first] }],
      }],
      loadedData: {
        "exercise-data": [{ category: "Ready", value: 6 }],
      },
      dataSources: {
        "exercise-data": {},
      },
    },
    onSave() {},
    onCancel() {},
  });
  assert.equal(routedFirst.props.chart, first);
  assert.equal(routedFirst.props.savedRevision, "chart-revision-1");

  let state = createChartEditorState({
    chart: first,
    chronoGroups: [],
  });
  state = reduceChartEditorState(state, {
    type: "updateChart",
    path: ["title"],
    value: "Unsaved local title",
  });
  const identicalRerender = rebaseChartEditorState(state, {
    chart: same,
    chronoGroups: [],
  });
  assert.equal(identicalRerender, state);
  const changedSnapshot = rebaseChartEditorState(state, {
    chart: updated,
    chronoGroups: [],
  });
  assert.notEqual(changedSnapshot, state);
  assert.equal(changedSnapshot.draft.title, "Server-saved update");

  const dashboard = {
    title: "Whole dashboard",
    pages: [{
      id: "page",
      sections: [{
        id: "section",
        panels: [
          first,
          validLineChart({ id: "other-chart" }),
        ],
      }],
    }],
    chronoGroups: [],
  };
  const saved = applyChartEditorSave(dashboard, {
    chart: updated,
    chronoGroups: [],
  });
  assert.notEqual(saved, dashboard);
  assert.equal(saved.title, "Whole dashboard");
  assert.equal(saved.pages[0].sections[0].panels[0].title, "Server-saved update");
  assert.equal(saved.pages[0].sections[0].panels[1].id, "other-chart");
  assert.equal(dashboard.pages[0].sections[0].panels[0].title, "First saved");
});

test("dashboard editor routing accepts only version-3 charts", () => {
  const chart = validPieChart();
  const v3 = render(React.createElement(SelectedChartEditor, {
    panel: chart,
    dashboard: {
      pages: [{
        id: "page",
        sections: [{ id: "section", panels: [chart] }],
      }],
      dataSources: {
        "exercise-data": { kind: "dataset" },
      },
      loadedData: {
        "exercise-data": [{ category: "Ready", value: 6 }],
      },
      chronoGroups: [],
    },
    onSave() {},
    onCancel() {},
    onRemove() {},
  }));
  assert.match(v3, /chart-editor-v3/);
  assert.doesNotMatch(v3, /chart-settings-panel-v2/);

  assert.throws(() => SelectedChartEditor({
    panel: {
      id: "legacy",
      title: "Legacy line",
      type: "line",
      dataSource: "exercise-data",
    },
    dashboard: {
      dataSources: {
        "exercise-data": { kind: "dataset" },
      },
      loadedData: {
        "exercise-data": [{ period: "May", capacity: 4 }],
      },
    },
    onSave() {},
    onCancel() {},
    onRemove() {},
  }), /only version 3 charts/i);
});

function findElement(node, predicate) {
  if (!React.isValidElement(node)) return null;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props.children)) {
    const found = findElement(child, predicate);
    if (found) return found;
  }
  return null;
}

function buttonMarkupByInteraction(html, interactionId) {
  const marker = `data-icon-control="${interactionId}"`;
  const markerIndex = html.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing icon control ${interactionId}`);
  const start = html.lastIndexOf("<button", markerIndex);
  const end = html.indexOf("</button>", markerIndex);
  assert.ok(start >= 0 && end >= markerIndex, `Malformed icon control ${interactionId}`);
  return html.slice(start, end + "</button>".length);
}

function buttonMarkupById(html, id) {
  const marker = `id="${id}"`;
  const markerIndex = html.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing button ${id}`);
  const start = html.lastIndexOf("<button", markerIndex);
  const end = html.indexOf("</button>", markerIndex);
  assert.ok(start >= 0 && end >= markerIndex, `Malformed button ${id}`);
  return html.slice(start, end + "</button>".length);
}

function chartCsvLifecycleHarness() {
  let dashboard = makeDashboardV5();
  const coordinator = createContentDraftCoordinator({
    getDashboard: () => dashboard,
    async commitDashboard(candidate) {
      dashboard = structuredClone(candidate);
      return dashboard;
    },
    assetStore: {
      async snapshot() { return new Map(); },
      async commitMany() {},
      async restore() {},
    },
  });
  const lifecycle = createChartCsvDraftLifecycle({
    stageDraft(draft) { return coordinator.stageDraft(draft); },
    updateDraft(draftId, patch) { return coordinator.updateDraft(draftId, patch); },
    commitDraft(draftId, buildCandidate) {
      return coordinator.commitDraft(draftId, { buildCandidate });
    },
    discardDraft(draftId, reason) {
      return coordinator.discardDraft(draftId, { reason });
    },
  });
  return {
    coordinator,
    lifecycle,
    get dashboard() { return dashboard; },
  };
}

function chartCsvInput(sourceId, fileName, rows) {
  const columns = Object.keys(rows[0]);
  const csvText = [columns.join(","), ...rows.map((row) => columns.map((column) => row[column]).join(","))].join("\n");
  return buildCsvContentDraft({
    owner: "chart",
    sourceId,
    source: { kind: "dataset", type: "uploadedCsv", fileName, csvText },
    profile: profileDataset(rows, { date: { interpretation: "temporal" } }),
    displayName: fileName.replace(/\.csv$/i, ""),
  });
}

function chartCsvCandidate(input) {
  return {
    sourceId: input.entry.sourceId,
    source: input.source,
    profile: input.profile,
    rows: parseCsvText(input.source.csvText),
  };
}

function validLineChart(overrides = {}) {
  return createChartDraft("line", {
    id: "contract-line",
    title: "Contract line",
    sourceId: "exercise-data",
    roles: {
      measurements: [{ field: "capacity", axis: "primary" }],
      observation: { field: "period", interpretation: "category" },
    },
    ...overrides,
    transformations: {
      ...(overrides.transformations ?? {}),
    },
    presentation: {
      ...(overrides.presentation ?? {}),
    },
  });
}

function validPieChart(overrides = {}) {
  return createChartDraft("pie", {
    id: "contract-pie",
    title: "Contract pie",
    sourceId: "exercise-data",
    roles: {
      category: { field: "category" },
      value: { field: "value" },
    },
    ...overrides,
    transformations: {
      ...(overrides.transformations ?? {}),
    },
    presentation: {
      ...(overrides.presentation ?? {}),
    },
  });
}

function synchronizedLineChart(overrides = {}) {
  return createChartDraft("line", {
    id: "synchronized-line",
    title: "Synchronized line",
    sourceId: "exercise-data",
    roles: {
      measurements: [{ field: "capacity", axis: "primary" }],
      observation: {
        field: "observed",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    interaction: { timeSync: null },
    ...overrides,
    transformations: {
      ...(overrides.transformations ?? {}),
    },
    presentation: {
      ...(overrides.presentation ?? {}),
    },
  });
}

function columnTypes() {
  return new Map([
    ["capacity", { name: "capacity", type: "numeric" }],
    ["period", { name: "period", type: "category" }],
  ]);
}
