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
