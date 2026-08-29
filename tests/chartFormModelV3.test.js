import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEditorFormModel,
  buildFormPreparationKey,
  buildQuickEditorFormModel,
  buildWizardFormModel,
} from "../src/charting/forms/formModel.js";
import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { normalizeCollectionSettings } from "../src/charting/collection/collectionModel.js";
import { prepareChartData } from "../src/charting/data/prepareChartData.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { getChartSchema } from "../src/charting/schemas/chartSchemaRegistry.js";

function lineChart(overrides = {}) {
  return createChartDraft("line", {
    id: "exercise-trend",
    title: "Exercise trend",
    sourceId: "exercise-data",
    roles: {
      measurements: [{ field: "value", axis: "primary" }],
      observation: {
        field: "reportedAt",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    transformations: {
      duplicates: "first",
    },
    ...overrides,
  });
}

function deltaChart() {
  return createChartDraft("deltaCard", {
    id: "exercise-delta",
    title: "Exercise delta",
    sourceId: "exercise-data",
    roles: {
      measurement: { field: "value" },
      time: {
        field: "reportedAt",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
  });
}

function kpiChart() {
  return createChartDraft("kpi", {
    id: "exercise-kpi",
    title: "Exercise status",
    sourceId: "exercise-data",
    roles: {
      value: { field: "value" },
      time: {
        field: "reportedAt",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    presentation: {
      collection: {
        layout: "carousel",
        rows: 1,
        columns: 3,
        overflow: "autoRotate",
        ranking: {
          mode: "priority",
          method: "largestAbsoluteChange",
          stabilize: true,
        },
      },
    },
  });
}

function datasetProfile({
  temporalDiagnostics = [],
  interpretationAlternatives,
} = {}) {
  return {
    rowCount: 2,
    fingerprint: "exercise-data-profile",
    columns: [
      {
        name: "reportedAt",
        type: "temporal",
        examples: ["2027-05-01", "2027-05-02"],
        temporal: {
          values: ["2027-05-01", "2027-05-02"],
          diagnostics: temporalDiagnostics,
          parsingMetadata: {
            interpretation: "temporal",
            format: "YYYY-MM-DD",
            timezone: "date-only",
          },
        },
        ...(interpretationAlternatives
          ? { interpretationAlternatives }
          : {}),
      },
      {
        name: "value",
        type: "numeric",
        examples: [10, 12],
      },
    ],
  };
}

const readyPrepared = Object.freeze({
  status: "ready",
  marks: [{ x: "2027-05-01", value: 10 }],
  diagnostics: [],
  meta: {
    renderableMarkCount: 1,
    duplicateGroupCount: 0,
  },
});

function preparedFor(chart, profile, prepared = readyPrepared) {
  return {
    ...prepared,
    meta: {
      ...prepared.meta,
      formPreparationKey: buildFormPreparationKey({ chart, profile }),
    },
  };
}

function synchronizationGroups() {
  return [{
    id: "exercise-clock",
    name: "Exercise clock",
    period: { start: "2027-05-01", end: "2027-05-02" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [{
      chartId: "exercise-trend",
      timeRole: "observation",
      matching: {
        policy: "nearest",
        toleranceMs: 3_600_000,
      },
    }],
  }];
}

function allFields(model) {
  return model.sections.flatMap(({ fields }) => fields);
}

test("axis roles put measurements before observations", () => {
  const model = buildEditorFormModel({
    chart: lineChart(),
    profile: datasetProfile(),
    prepared: readyPrepared,
  });
  const roleIds = model.sections
    .find(({ id }) => id === "data")
    .fields
    .filter(({ control }) => control === "role")
    .map(({ id }) => id);

  assert.ok(roleIds.indexOf("measurements") < roleIds.indexOf("observation"));
});

test("X interpretation is hidden when the detected choice has no practical alternative", () => {
  const model = buildEditorFormModel({
    chart: lineChart(),
    profile: datasetProfile(),
    prepared: readyPrepared,
  });

  assert.equal(
    allFields(model).some(({ id }) => id === "observationInterpretation"),
    false,
  );
});

test("X interpretation is shown when the profile declares materially different alternatives", () => {
  const model = buildEditorFormModel({
    chart: lineChart(),
    profile: datasetProfile({
      interpretationAlternatives: ["temporal", "category"],
    }),
    prepared: readyPrepared,
  });
  const field = allFields(model)
    .find(({ id }) => id === "observationInterpretation");

  assert.deepEqual(field.options.map(({ value }) => value), [
    "temporal",
    "category",
  ]);
  assert.deepEqual(field.path, [
    "roles",
    "observation",
    "interpretation",
  ]);
});

test("ambiguous temporal profile evidence exposes a category fallback without extra metadata", () => {
  const model = buildEditorFormModel({
    chart: lineChart(),
    profile: datasetProfile({
      temporalDiagnostics: [{
        code: "ambiguous-date-format",
        message: "Choose a date format.",
      }],
    }),
    prepared: readyPrepared,
  });
  const field = allFields(model)
    .find(({ id }) => id === "observationInterpretation");

  assert.deepEqual(field.options.map(({ value }) => value), [
    "temporal",
    "category",
  ]);
});

test("invalid temporal evidence does not advertise an analytically invalid override", () => {
  const model = buildEditorFormModel({
    chart: lineChart(),
    profile: datasetProfile({
      temporalDiagnostics: [{
        code: "invalid-calendar-date",
        message: "The source date is invalid.",
      }],
    }),
    prepared: readyPrepared,
  });

  assert.equal(
    allFields(model).some(({ id }) => id === "observationInterpretation"),
    false,
  );
});

test("axis measurement descriptors offer primary and secondary assignments", () => {
  const model = buildEditorFormModel({
    chart: lineChart(),
    profile: datasetProfile(),
    prepared: readyPrepared,
  });
  const measurements = allFields(model)
    .find(({ id }) => id === "measurements");

  assert.deepEqual(measurements.axisOptions, ["primary", "secondary"]);
});

test("empty measurement descriptors remain unbound presentation input", () => {
  const chart = lineChart({
    roles: {
      measurements: [],
      observation: {
        field: "reportedAt",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
  });
  const original = structuredClone(chart);
  const model = buildEditorFormModel({
    chart,
    profile: datasetProfile(),
    prepared: readyPrepared,
  });
  const measurements = allFields(model)
    .find(({ id }) => id === "measurements");

  assert.deepEqual(measurements.value, []);
  assert.deepEqual(chart, original);
});

test("data transformations materialize from schema capabilities", () => {
  const line = buildEditorFormModel({
    chart: lineChart(),
    profile: datasetProfile(),
    prepared: readyPrepared,
  });
  const kpi = buildEditorFormModel({
    chart: kpiChart(),
    profile: datasetProfile(),
    prepared: {
      ...readyPrepared,
      marks: [{ value: 12 }],
    },
  });
  const lineIds = allFields(line).map(({ id }) => id);
  const kpiIds = allFields(kpi).map(({ id }) => id);

  for (const id of ["filters", "grouping", "aggregation", "missingValues"]) {
    assert.ok(lineIds.includes(id), id);
  }
  assert.equal(kpiIds.includes("grouping"), false);
});

test("duplicate resolution materializes only after active roles produce duplicates", () => {
  const chart = lineChart();
  const profile = datasetProfile();
  const noDuplicates = buildEditorFormModel({
    chart,
    profile,
    prepared: preparedFor(chart, profile),
  });
  const duplicates = buildEditorFormModel({
    chart,
    profile,
    prepared: preparedFor(chart, profile, {
      status: "invalid",
      marks: [],
      diagnostics: [{
        code: "duplicate-resolution-required",
        severity: "error",
      }],
      meta: {
        renderableMarkCount: 0,
        duplicateGroupCount: 2,
      },
    }),
  });

  assert.equal(
    allFields(noDuplicates).some(({ id }) => id === "duplicates"),
    false,
  );
  assert.equal(
    allFields(duplicates).some(({ id }) => id === "duplicates"),
    true,
  );
});

test("a current duplicate-resolution failure exposes the repair field without claiming preview readiness", () => {
  const rows = [
    { category: "A", value: 2 },
    { category: "A", value: 3 },
  ];
  const chart = createChartDraft("bar", {
    id: "duplicate-bar",
    title: "Duplicate bar",
    sourceId: "duplicate-data",
    roles: {
      measurements: [{ field: "value", axis: "primary" }],
      observation: { field: "category" },
    },
  });
  const profile = profileDataset(rows);
  const prepared = preparedFor(
    chart,
    profile,
    prepareChartData({ chart, rows, datasetProfile: profile }),
  );
  const model = buildEditorFormModel({ chart, profile, prepared });

  assert.equal(prepared.status, "invalid");
  assert.equal(prepared.meta.duplicateGroupCount, 1);
  assert.ok(prepared.diagnostics.some(
    ({ code }) => code === "duplicate-resolution-required",
  ));
  assert.ok(allFields(model).some(({ id }) => id === "duplicates"));
  assert.equal(model.valid, false);
});

test("a resolved duplicate strategy remains editable while zero-collision data stays concise", () => {
  const duplicateRows = [
    { category: "A", value: 2 },
    { category: "A", value: 3 },
  ];
  const unresolved = createChartDraft("bar", {
    id: "duplicate-strategy",
    title: "Duplicate strategy",
    sourceId: "duplicate-data",
    roles: {
      measurements: [{ field: "value", axis: "primary" }],
      observation: { field: "category" },
    },
  });
  const duplicateProfile = profileDataset(duplicateRows);
  const unresolvedPrepared = preparedFor(
    unresolved,
    duplicateProfile,
    prepareChartData({
      chart: unresolved,
      rows: duplicateRows,
      datasetProfile: duplicateProfile,
    }),
  );
  const resolved = createChartDraft("bar", {
    ...unresolved,
    transformations: {
      ...unresolved.transformations,
      duplicates: "first",
    },
  });
  const resolvedPrepared = preparedFor(
    resolved,
    duplicateProfile,
    prepareChartData({
      chart: resolved,
      rows: duplicateRows,
      datasetProfile: duplicateProfile,
    }),
  );
  const uniqueRows = [
    { category: "A", value: 2 },
    { category: "B", value: 3 },
  ];
  const uniqueProfile = profileDataset(uniqueRows);
  const uniquePrepared = preparedFor(
    resolved,
    uniqueProfile,
    prepareChartData({
      chart: resolved,
      rows: uniqueRows,
      datasetProfile: uniqueProfile,
    }),
  );

  assert.equal(unresolvedPrepared.status, "invalid");
  assert.ok(unresolvedPrepared.diagnostics.some(
    ({ code }) => code === "duplicate-resolution-required",
  ));
  assert.ok(allFields(buildEditorFormModel({
    chart: unresolved,
    profile: duplicateProfile,
    prepared: unresolvedPrepared,
  })).some(({ id }) => id === "duplicates"));

  assert.equal(resolvedPrepared.status, "ready");
  assert.equal(resolvedPrepared.meta.duplicateGroupCount, 1);
  assert.ok(resolvedPrepared.diagnostics.some(
    ({ code }) => code === "duplicate-observations",
  ));
  assert.ok(allFields(buildEditorFormModel({
    chart: resolved,
    profile: duplicateProfile,
    prepared: resolvedPrepared,
  })).some(({ id }) => id === "duplicates"));

  assert.equal(uniquePrepared.status, "ready");
  assert.equal(uniquePrepared.meta.duplicateGroupCount, 0);
  assert.equal(allFields(buildEditorFormModel({
    chart: resolved,
    profile: uniqueProfile,
    prepared: uniquePrepared,
  })).some(({ id }) => id === "duplicates"), false);
});

test("an invalid current preparation without the duplicate-resolution diagnostic cannot expose duplicate controls", () => {
  const chart = lineChart({ transformations: { duplicates: null } });
  const profile = datasetProfile();
  const prepared = preparedFor(chart, profile, {
    status: "invalid",
    marks: [],
    diagnostics: [{ code: "aggregation-required", severity: "error" }],
    meta: {
      renderableMarkCount: 0,
      duplicateGroupCount: 2,
    },
  });
  const model = buildEditorFormModel({ chart, profile, prepared });

  assert.equal(allFields(model).some(({ id }) => id === "duplicates"), false);
});

test("stale duplicate counts cannot materialize controls for a changed draft", () => {
  const original = lineChart();
  const changed = lineChart({
    transformations: {
      duplicates: "last",
    },
  });
  const profile = datasetProfile();
  const stalePrepared = preparedFor(original, profile, {
    ...readyPrepared,
    meta: {
      ...readyPrepared.meta,
      duplicateGroupCount: 2,
    },
  });
  const model = buildEditorFormModel({
    chart: changed,
    profile,
    prepared: stalePrepared,
  });

  assert.equal(
    allFields(model).some(({ id }) => id === "duplicates"),
    false,
  );
});

test("before renderer readiness only data and the required title remain editable", () => {
  const chart = lineChart();
  const profile = datasetProfile();
  const unavailable = buildEditorFormModel({
    chart,
    profile,
    prepared: {
      status: "empty",
      marks: [],
      diagnostics: [],
      meta: {
        renderableMarkCount: 0,
        duplicateGroupCount: 0,
      },
    },
  });
  const ready = buildEditorFormModel({
    chart,
    profile,
    prepared: preparedFor(chart, profile),
  });

  assert.ok(unavailable.sections.some(({ id }) => id === "data"));
  assert.deepEqual(
    unavailable.sections.map(({ id }) => id),
    ["data", "appearance"],
  );
  assert.deepEqual(
    unavailable.sections.find(({ id }) => id === "appearance")
      .fields.map(({ id }) => id),
    ["title"],
  );
  assert.equal(unavailable.sections.some(({ id }) => id === "interactions"), false);
  assert.ok(ready.sections.some(({ id }) => id === "appearance"));
  assert.ok(ready.sections.some(({ id }) => id === "interactions"));
});

test("appearance begins with the required title and its visibility control", () => {
  const chart = lineChart({ title: "" });
  const profile = datasetProfile();
  const model = buildEditorFormModel({
    chart,
    profile,
    prepared: preparedFor(chart, profile),
  });
  const appearance = model.sections.find(({ id }) => id === "appearance");

  assert.deepEqual(
    appearance.fields.slice(0, 6).map(({ id, label, path, value }) => ({
      id,
      path,
      ...(id === "titleVisible" ? { label, value } : {}),
    })),
    [
      { id: "title", path: ["title"] },
      {
        id: "titleVisible",
        path: ["presentation", "title", "visible"],
        label: "Show title",
        value: true,
      },
      { id: "description", path: ["description"] },
      {
        id: "descriptionVisible",
        path: ["presentation", "description", "visible"],
      },
      {
        id: "titleAlignment",
        path: ["presentation", "title", "align"],
      },
      {
        id: "background",
        path: ["presentation", "background", "color"],
      },
    ],
  );
});

test("legend visibility is exposed only by renderers that consume it", () => {
  const profile = datasetProfile();
  const supported = [
    { chart: lineChart(), value: true },
    { chart: createChartDraft("pie", {
      id: "composition-legend",
      title: "Composition legend",
      sourceId: "exercise-data",
      roles: {
        category: { field: "reportedAt", interpretation: "category" },
        value: { field: "value" },
      },
      presentation: { legend: { visible: false } },
    }), value: false },
    { chart: createChartDraft("scatter", {
      id: "relationship-legend",
      title: "Relationship legend",
      sourceId: "exercise-data",
      roles: {
        x: { field: "value" },
        y: { field: "value" },
      },
      presentation: { legend: { visible: false } },
    }), value: false },
  ];

  for (const { chart, value } of supported) {
    const model = buildEditorFormModel({
      chart,
      profile,
      prepared: preparedFor(chart, profile),
    });
    const legendVisible = model.sections
      .find(({ id }) => id === "appearance")
      .fields.find(({ id }) => id === "legendVisible");

    assert.deepEqual(legendVisible, {
      id: "legendVisible",
      label: "Show legend",
      control: "toggle",
      path: ["presentation", "legend", "visible"],
      value,
    }, chart.typeId);
  }

  const unsupported = createChartDraft("kpi", {
    id: "kpi-without-legend",
    title: "KPI without legend",
    sourceId: "exercise-data",
    roles: { value: { field: "value" } },
  });
  const unsupportedModel = buildEditorFormModel({
    chart: unsupported,
    profile,
    prepared: preparedFor(unsupported, profile),
  });

  assert.equal(
    unsupportedModel.sections
      .find(({ id }) => id === "appearance")
      .fields.some(({ id }) => id === "legendVisible"),
    false,
  );
});

test("quick editor fields expose only supported quick presentation controls", () => {
  const axis = lineChart({
    presentation: {
      title: { align: "left", visible: false },
      background: { color: "#FFFFFF", transparent: false },
      legend: { visible: false },
      series: { colors: ["#043BCB", "#36BDEB"] },
      referenceLine: {
        visible: true,
        value: 12,
        label: "Target",
        color: "#E56B2F",
        lineStyle: "dashed",
      },
    },
  });
  const axisModel = buildQuickEditorFormModel({ chart: axis });

  assert.deepEqual(
    axisModel.sections[0].fields.map(({ id, path }) => ({ id, path })),
    [
      { id: "title", path: ["title"] },
      { id: "titleVisible", path: ["presentation", "title", "visible"] },
      { id: "background", path: ["presentation", "background", "color"] },
      { id: "legendVisible", path: ["presentation", "legend", "visible"] },
      { id: "seriesColors", path: ["presentation", "series", "colors"] },
      {
        id: "referenceLineColor",
        path: ["presentation", "referenceLine", "color"],
      },
    ],
  );
  assert.equal(
    axisModel.sections[0].fields.find(({ id }) => id === "titleVisible").value,
    false,
  );
  assert.equal(
    axisModel.sections[0].fields.find(({ id }) => id === "legendVisible").value,
    false,
  );
  assert.equal(
    axisModel.sections[0].fields.find(({ id }) => id === "referenceLineColor").value,
    "#E56B2F",
  );

  const unsupported = buildQuickEditorFormModel({ chart: kpiChart() });
  assert.deepEqual(
    unsupported.sections[0].fields.map(({ id }) => id),
    ["title", "titleVisible", "background"],
  );
});

test("ready appearance fields follow each schema without leaking inapplicable series controls", () => {
  const profile = datasetProfile();
  const axisRoles = {
    measurements: [{ field: "value", axis: "primary" }],
    observation: {
      field: "reportedAt",
      interpretation: "temporal",
      format: "YYYY-MM-DD",
    },
  };
  const cases = [
    {
      typeId: "line",
      roles: axisRoles,
      expected: ["seriesColors", "lineWidth"],
    },
    {
      typeId: "bar",
      roles: axisRoles,
      expected: ["seriesColors", "barWidth"],
    },
    {
      typeId: "mixed",
      roles: axisRoles,
      expected: ["seriesColors", "lineWidth", "barWidth"],
    },
    {
      typeId: "pie",
      roles: {
        category: { field: "reportedAt", interpretation: "category" },
        value: { field: "value" },
      },
      expected: ["seriesColors"],
    },
    {
      typeId: "kpi",
      roles: { value: { field: "value" } },
      expected: [],
    },
  ];
  const styleIds = new Set(["seriesColors", "lineWidth", "barWidth"]);
  const styleValues = {
    seriesColors: ["#043BCB", "#36BDEB"],
    lineWidth: 2.5,
    barWidth: 18.5,
  };
  const stylePaths = {
    seriesColors: ["presentation", "series", "colors"],
    lineWidth: ["presentation", "series", "lineWidth"],
    barWidth: ["presentation", "series", "barWidth"],
  };

  for (const { typeId, roles, expected } of cases) {
    const series = Object.fromEntries(expected.map((id) => [
      id === "seriesColors" ? "colors" : id,
      styleValues[id],
    ]));
    const chart = createChartDraft(typeId, {
      id: `${typeId}-appearance`,
      title: `${typeId} appearance`,
      sourceId: "exercise-data",
      roles,
      ...(expected.length > 0 ? { presentation: { series } } : {}),
    });
    const model = buildEditorFormModel({
      chart,
      profile,
      prepared: preparedFor(chart, profile),
    });
    const appearance = model.sections.find(({ id }) => id === "appearance");

    assert.deepEqual(
      appearance.fields
        .filter(({ id }) => styleIds.has(id))
        .map(({ id, path, value }) => ({ id, path, value })),
      expected.map((id) => ({
        id,
        path: stylePaths[id],
        value: styleValues[id],
      })),
      `${typeId} materialized the wrong series controls`,
    );
  }
});

test("out-of-range series widths expose an associated form error", () => {
  const profile = datasetProfile();
  const chart = structuredClone(lineChart());
  chart.presentation.series = { lineWidth: 13 };
  const model = buildEditorFormModel({
    chart,
    profile,
    prepared: preparedFor(chart, profile),
  });
  const lineWidth = model.sections
    .find(({ id }) => id === "appearance")
    .fields.find(({ id }) => id === "lineWidth");

  assert.equal(model.valid, false);
  assert.equal(lineWidth.error, "Enter a number from 1 through 12.");
});

test("only a matching current preparation completes style and permits creation", () => {
  const chart = lineChart();
  const profile = datasetProfile();
  const prepared = preparedFor(chart, profile);
  const editor = buildEditorFormModel({
    chart,
    profile,
    prepared,
  });
  const wizard = buildWizardFormModel({
    draft: chart,
    profile,
    prepared,
  });

  assert.equal(editor.valid, true);
  assert.equal(
    wizard.steps.find(({ id }) => id === "style").complete,
    true,
  );
  assert.equal(wizard.canCreate, true);
});

test("a stale renderer-ready result cannot unlock style for an incomplete draft", () => {
  const original = lineChart();
  const profile = datasetProfile();
  const incomplete = lineChart({
    sourceId: null,
    roles: {},
  });
  const prepared = preparedFor(original, profile);
  const editor = buildEditorFormModel({
    chart: incomplete,
    profile,
    prepared,
  });
  const wizard = buildWizardFormModel({
    draft: incomplete,
    profile,
    prepared,
  });

  assert.deepEqual(
    editor.sections.find(({ id }) => id === "appearance")
      .fields.map(({ id }) => id),
    ["title"],
  );
  assert.equal(
    wizard.steps.find(({ id }) => id === "style").complete,
    false,
  );
  assert.equal(wizard.canCreate, false);
});

test("changing an analytical draft invalidates a previously ready preparation", () => {
  const original = lineChart();
  const profile = datasetProfile();
  const changed = lineChart({
    transformations: {
      duplicates: "last",
    },
  });
  const prepared = preparedFor(original, profile);
  const model = buildWizardFormModel({
    draft: changed,
    profile,
    prepared,
  });

  assert.equal(
    model.steps.find(({ id }) => id === "style").complete,
    false,
  );
  assert.equal(model.canCreate, false);
});

test("Delta comparison fields come from the schema descriptor", () => {
  const model = buildEditorFormModel({
    chart: deltaChart(),
    profile: datasetProfile(),
    prepared: {
      ...readyPrepared,
      marks: [{
        displayed: 12,
        comparison: 10,
      }],
    },
  });
  const comparison = allFields(model)
    .find(({ id }) => id === "deltaComparison");

  assert.equal(comparison.control, "deltaComparison");
  assert.deepEqual(
    comparison.modes,
    getChartSchema("deltaCard").comparison.modes,
  );
  assert.deepEqual(
    comparison.matchingPolicies,
    getChartSchema("deltaCard").comparison.matchingPolicies,
  );
  assert.deepEqual(comparison.path, ["transformations", "comparison"]);
});

test("collection fields author the fully normalized nested contract", () => {
  const chart = kpiChart();
  const profile = datasetProfile();
  const model = buildEditorFormModel({
    chart,
    profile,
    prepared: preparedFor(chart, profile, {
      ...readyPrepared,
      marks: [{ value: 12 }],
    }),
  });
  const collection = allFields(model)
    .find(({ id }) => id === "collection");

  assert.deepEqual(
    collection.value,
    normalizeCollectionSettings(chart.presentation.collection),
  );
  assert.equal("rankingMode" in collection.value, false);
  assert.equal("rotationInterval" in collection.value, false);
  assert.deepEqual(collection.path, ["presentation", "collection"]);
});

test("chrono group memberships derive from group authority without chart-owned edit targets", () => {
  const chart = lineChart();
  const profile = datasetProfile();
  const model = buildEditorFormModel({
    chart,
    profile,
    prepared: preparedFor(chart, profile),
    chronoGroups: synchronizationGroups(),
  });
  const timeSync = allFields(model)
    .find(({ id }) => id === "timeSync");

  assert.deepEqual(timeSync.selectedGroupIds, ["exercise-clock"]);
  assert.deepEqual(timeSync.groups[0].members[0].matching, {
    policy: "nearest",
    toleranceMs: 3_600_000,
  });
  assert.equal("chartPath" in timeSync, false);
  assert.equal("groupTarget" in timeSync, false);
  assert.equal("memberMatching" in timeSync, false);
});

test("sections are contextual because only schema-declared fields materialize", () => {
  const chart = createChartDraft("pie", {
    id: "composition",
    title: "Composition",
    sourceId: "exercise-data",
    roles: {
      category: { field: "reportedAt", interpretation: "category" },
      value: { field: "value" },
    },
  });
  const profile = datasetProfile();
  const model = buildEditorFormModel({
    chart,
    profile,
    prepared: preparedFor(chart, profile, {
      ...readyPrepared,
      marks: [{ category: "Ready", value: 12 }],
    }),
  });

  assert.deepEqual(
    model.sections.map(({ id }) => id),
    ["data", "appearance", "labels", "advanced"],
  );
  assert.equal(model.sections.some(({ fields }) => fields.length === 0), false);
});

test("wizard form keeps source first and complete before a chart draft exists", () => {
  const model = buildWizardFormModel({
    draft: null,
    profile: null,
    prepared: null,
  });

  assert.deepEqual(model.steps.map(({ id }) => id), [
    "source",
    "type",
    "roles",
    "style",
  ]);
  assert.deepEqual(
    model.steps.find(({ id }) => id === "source").prerequisites,
    [],
  );
  assert.match(
    model.steps
      .find(({ id }) => id === "style")
      .prerequisites
      .join(" "),
    /Choose a chart type/,
  );
  assert.equal(model.steps.every(({ navigable }) => navigable), true);

  const sourceProfile = datasetProfile();
  const withSource = buildWizardFormModel({
    draft: null,
    sourceSelection: {
      sourceId: "exercise-data",
      source: null,
      profile: sourceProfile,
      rows: [{ reportedAt: "2027-05-01", value: 10 }],
      kind: "existing",
    },
    profile: sourceProfile,
    prepared: null,
  });
  assert.equal(
    withSource.steps.find(({ id }) => id === "source").complete,
    true,
  );
  assert.equal(
    withSource.steps.find(({ id }) => id === "type").complete,
    false,
  );
});
