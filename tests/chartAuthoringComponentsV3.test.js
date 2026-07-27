import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

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
import {
  createWizardState,
  reduceWizardState,
} from "../src/charting/forms/wizardDraft.js";
import { buildEditorFormModel } from "../src/charting/forms/formModel.js";

register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    return { format: "module", source: loaded.source, shortCircuit: true };
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
  default: TimeSyncSettingsField,
  proposeTimeSyncGroupMatching,
} = await import(
  "../src/components/chart-authoring/TimeSyncSettingsField.jsx"
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
  filterForOperator,
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
const {
  default: ConfirmDialog,
} = await import("../src/components/common/ConfirmDialog.jsx");
const {
  default: DataSourceStep,
} = await import(
  "../src/components/chart-authoring/DataSourceStep.jsx"
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
const {
  default: ChartWizardV3,
  applyWizardMembership,
  createChartWizardState,
  createWizardPreparation,
  parseUploadedCsvFile,
  submitWizardDraft,
} = await import(
  "../src/components/chart-authoring/ChartWizardV3.jsx"
);

const backgroundSection = {
  id: "appearance",
  label: "Appearance",
  fields: [{
    id: "background",
    label: "Background",
    control: "color",
    path: ["presentation", "background", "color"],
    value: "#FFFFFF",
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

test("background uses the same identified color field contract as series color", () => {
  const html = render(React.createElement(GeneratedFormSection, {
    section: backgroundSection,
    onChange() {},
  }));

  assert.match(html, /data-color-field="background"/);
  assert.match(html, /aria-label="Background"/);
  assert.match(html, /id="chart-field-background"/);
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

test("time synchronization validates complete proposed groups and never writes chart-local matching", () => {
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
    interaction: { timeSync: { groupId: "exercise-clock" } },
  });
  const groups = [{
    id: "exercise-clock",
    name: "Exercise clock",
    primaryClock: { sourceId: "exercise-data", timeField: "observed" },
    matching: { policy: "exact" },
    members: [{ chartId: "trend", timeRole: "observation" }],
  }];
  const rows = [
    { observed: "2027-05-01", value: 1 },
    { observed: "2027-05-02", value: 2 },
  ];
  const profile = profileDataset(rows, {
    observed: { interpretation: "temporal" },
  });
  const next = proposeTimeSyncGroupMatching({
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
  assert.deepEqual(chart.interaction.timeSync, { groupId: "exercise-clock" });
  assert.equal("temporalMatch" in chart.interaction.timeSync, false);
  assert.throws(() => proposeTimeSyncGroupMatching({
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

  const html = render(React.createElement(TimeSyncSettingsField, {
    field: {
      id: "timeSync",
      label: "Synchronized playback",
      groupId: "exercise-clock",
      groups,
      groupTarget: {
        groupId: "exercise-clock",
        chartId: "trend",
        property: "matching",
      },
      memberMatching: { policy: "exact" },
    },
    chart,
    charts: [chart],
    loadedData: { "exercise-data": rows },
    profiles: { "exercise-data": profile },
    onMembershipChange() {},
    onGroupsChange() {},
  }));
  assert.match(html, /Playback group/);
  assert.match(html, /Member matching/);
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
    element.type === "button"
    && element.props.children === "Add filter"
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
    presentation[control] = next;
  }
  const chart = validLineChart({ presentation });
  assert.doesNotThrow(() => validateChartInstance(chart, {
    columnTypes: columnTypes(),
  }));
  assert.deepEqual(normalizeChartInstance(chart).presentation.labels, presentation.labels);
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

  assert.match(role, /<fieldset[^>]*>.*<legend>Measurements<\/legend>/);
  assert.match(collection, /<fieldset[^>]*>.*<legend>Collection display<\/legend>/);
  assert.match(delta, /<fieldset[^>]*>.*<legend>Comparison<\/legend>/);
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
  assert.match(ready, /role="img"/);
  assert.match(invalid, /chart-authoring-preview-invalid/);
  assert.match(invalid, /data-responsible-field="measurements"/);
  assert.ok(invalid.length < 1600);
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

test("background transparency emits the validator-approved object while series remains a color scalar", () => {
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
  const series = SchemaField({
    field: {
      id: "seriesColor",
      label: "Series color",
      control: "color",
      path: ["presentation", "advanced", "seriesColor"],
      value: "#043BCB",
    },
    value: "#043BCB",
    chart,
    onChange(path, value) {
      calls.push({ path, value });
    },
  });
  series.props.onChange("#36BDEB");

  assert.deepEqual(calls[0], {
    path: ["presentation", "background"],
    value: { color: "#FFFFFF", transparent: true },
  });
  assert.deepEqual(calls[1], {
    path: ["presentation", "advanced", "seriesColor"],
    value: "#36BDEB",
  });
  const withBackground = structuredClone(chart);
  withBackground.presentation.background = calls[0].value;
  assert.doesNotThrow(() => validateChartInstance(withBackground, {
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

test("wizard exposes four directly clickable button tabs in the approved order", () => {
  const html = render(React.createElement(ChartWizardV3, {
    open: true,
    dataSources: {},
    loadedData: {},
    timeSyncGroups: [],
    onClose() {},
    onCreate() {},
  }));
  const labels = [
    "Chart type",
    "Data source",
    "Data roles",
    "Style and layout",
  ];
  let lastIndex = -1;
  for (const label of labels) {
    const match = new RegExp(`<button[^>]*>${label}</button>`).exec(html);
    assert.ok(match, `${label} should be a button`);
    assert.ok(match.index > lastIndex, `${label} should be in order`);
    lastIndex = match.index;
  }
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
    timeSyncGroups: [],
    existingCharts: [existing],
  });

  assert.equal(state.charts[0].id, "existing-trend");
  assert.notEqual(state.charts[0], existing);
  assert.deepEqual(existing.interaction.timeSync, null);
});

test("every wizard tab remains enabled and explains unmet prerequisites", () => {
  const html = render(React.createElement(ChartWizardV3, {
    open: true,
    dataSources: {},
    loadedData: {},
    timeSyncGroups: [],
    onClose() {},
    onCreate() {},
  }));

  assert.equal((html.match(/class="chart-wizard-step-button/g) ?? []).length, 4);
  assert.doesNotMatch(html, /chart-wizard-step-button[^>]*disabled/);
  assert.match(html, /Choose a chart type/);
});

test("an early destination explains prerequisites without exposing crashing controls", () => {
  const html = render(React.createElement(DataSourceStep, {
    dataSources: {
      "exercise-data": { kind: "dataset" },
    },
    loadedData: {
      "exercise-data": [{ value: 4 }],
    },
    prerequisites: ["Choose a chart type."],
    manualAllowed: true,
    onSelectExisting() {
      assert.fail("blocked source selection must not fire");
    },
    onSelectManual() {
      assert.fail("blocked manual selection must not fire");
    },
  }));

  assert.match(html, /Choose a chart type/);
  assert.match(html, /<select[^>]*disabled/);
  assert.match(html, /type="file"[^>]*disabled/);
  assert.match(html, /Enter data manually/);
  assert.match(html, /<button[^>]*disabled[^>]*>Enter data manually<\/button>/);
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
  assert.match(source, /Remove source/);
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
  assert.match(ready, /Zoom/);
  assert.match(ready, /Advanced/);
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

test("wizard membership keeps matching in group members and chart-local state contains only groupId", () => {
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
    primaryClock: {
      sourceId: "exercise-data",
      timeField: "reportedAt",
    },
    matching: { policy: "exact" },
    members: [],
  }];
  const next = applyWizardMembership({
    chart,
    groups,
    groupId: "exercise-clock",
    timeRole: "observation",
  });

  assert.deepEqual(next.chart.interaction.timeSync, {
    groupId: "exercise-clock",
  });
  assert.deepEqual(next.groups[0].members, [{
    chartId: "exercise-trend",
    timeRole: "observation",
  }]);
  assert.equal("matching" in next.chart.interaction.timeSync, false);
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
    interaction: { timeSync: { groupId: "exercise-clock" } },
  });
  const groups = [{
    id: "exercise-clock",
    name: "Exercise clock",
    primaryClock: {
      sourceId: "exercise-data",
      timeField: "reportedAt",
    },
    matching: { policy: "exact" },
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
    timeSyncGroups: [],
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
  assert.deepEqual(Object.keys(result), ["chart", "timeSyncGroups"]);
  assert.equal(result.chart.id, "new-trend");
  assert.equal(result.chart.sourceId, "exercise-data");
  assert.equal("temporalMatch" in result.chart.transformations, false);

  assert.throws(
    () => submitWizardDraft(createWizardState(), (value) => calls.push(value)),
    /choose a chart type/i,
  );
  assert.equal(calls.length, 1);
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

function columnTypes() {
  return new Map([
    ["capacity", { name: "capacity", type: "numeric" }],
    ["period", { name: "period", type: "category" }],
  ]);
}
