import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEditorFormModel,
  buildFormPreparationKey,
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
    primaryClock: {
      sourceId: "exercise-data",
      timeField: "reportedAt",
    },
    matching: { policy: "exact" },
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

test("appearance begins with the required chart title field", () => {
  const chart = lineChart({ title: "" });
  const profile = datasetProfile();
  const model = buildEditorFormModel({
    chart,
    profile,
    prepared: preparedFor(chart, profile),
  });
  const appearance = model.sections.find(({ id }) => id === "appearance");

  assert.deepEqual(
    appearance.fields.slice(0, 3).map(({ id, path }) => ({ id, path })),
    [
      { id: "title", path: ["title"] },
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

test("time matching edits target a group member by semantic identity", () => {
  const chart = lineChart({
    interaction: {
      timeSync: { groupId: "exercise-clock" },
    },
  });
  const profile = datasetProfile();
  const model = buildEditorFormModel({
    chart,
    profile,
    prepared: preparedFor(chart, profile),
    timeSyncGroups: synchronizationGroups(),
  });
  const timeSync = allFields(model)
    .find(({ id }) => id === "timeSync");

  assert.deepEqual(
    timeSync.chartPath,
    ["interaction", "timeSync", "groupId"],
  );
  assert.deepEqual(timeSync.groupTarget, {
    groupId: "exercise-clock",
    chartId: chart.id,
    property: "matching",
  });
  assert.deepEqual(timeSync.memberMatching, {
    policy: "nearest",
    toleranceMs: 3_600_000,
  });
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

test("wizard prerequisites explain incomplete destinations without disabling them", () => {
  const model = buildWizardFormModel({
    draft: null,
    profile: null,
    prepared: null,
  });

  assert.deepEqual(model.steps.map(({ id }) => id), [
    "type",
    "source",
    "roles",
    "style",
  ]);
  assert.match(
    model.steps
      .find(({ id }) => id === "style")
      .prerequisites
      .join(" "),
    /Choose a chart type/,
  );
  assert.equal(model.steps.every(({ navigable }) => navigable), true);
});
