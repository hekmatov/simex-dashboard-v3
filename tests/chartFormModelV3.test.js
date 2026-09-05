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
import { getChartSchema, listChartSchemas } from "../src/charting/schemas/chartSchemaRegistry.js";

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

test("axis roles and transformations explain their distinct visual effects", () => {
  const chart = lineChart();
  const profile = datasetProfile([
    { reportedAt: "2027-05-01", value: 10, region: "North", note: "Observed" },
  ]);
  const model = buildEditorFormModel({ chart, profile, prepared: preparedFor(chart, profile) });
  const fields = allFields(model);

  assert.match(fields.find(({ id }) => id === "measurements").help, /height of the line points/i);
  assert.match(fields.find(({ id }) => id === "observation").help, /left-to-right position/i);
  assert.match(fields.find(({ id }) => id === "cluster").help, /separate coloured line/i);
  assert.match(fields.find(({ id }) => id === "label").help, /line point is hovered or selected/i);
  assert.match(fields.find(({ id }) => id === "grouping").help, /combines rows before rendering/i);
  assert.doesNotMatch(fields.find(({ id }) => id === "grouping").help, /visual series/i);
});

test("every chart type explains every data role in the visual language of that chart", () => {
  const expectedVisualCopy = {
    bar: { measurements: /height of each bar/i, observation: /along the bottom/i, cluster: /coloured bar beside/i, label: /bar is hovered or selected/i },
    groupedBar: { measurements: /height of each bar/i, observation: /one group of bars/i, cluster: /side-by-side bars/i, label: /bar is hovered or selected/i },
    stackedBar: { measurements: /total height/i, observation: /one stacked bar/i, cluster: /segments stacked inside/i, label: /stacked segment is hovered or selected/i },
    horizontalBar: { measurements: /length of each horizontal bar/i, observation: /one horizontal bar row/i, cluster: /coloured horizontal bar/i, label: /horizontal bar is hovered or selected/i },
    horizontalStackedBar: { measurements: /total length/i, observation: /one horizontal stacked bar/i, cluster: /segments stacked along/i, label: /stacked segment is hovered or selected/i },
    line: { measurements: /height of the line points/i, observation: /left-to-right position/i, cluster: /separate coloured line/i, label: /line point is hovered or selected/i },
    area: { measurements: /height of the filled area/i, observation: /left-to-right position/i, cluster: /separate coloured filled area/i, label: /area point is hovered or selected/i },
    mixed: { measurements: /height of its bars or line points/i, observation: /left-to-right position/i, cluster: /separate coloured bars or lines/i, label: /mark is hovered or selected/i },
    pie: { category: /one labelled slice/i, value: /size of each pie slice/i },
    donut: { category: /one labelled ring segment/i, value: /size of each ring segment/i },
    kpi: { value: /main number on the card/i, target: /comparison target beside/i, entity: /separate card/i, label: /supporting text on the card/i, time: /which observation supplies/i },
    gauge: { value: /needle or filled portion/i, target: /reference point on the gauge/i, entity: /separate gauge/i, label: /supporting text beside/i, time: /which observation supplies/i },
    bullet: { actual: /filled performance bar/i, target: /target marker/i, entity: /separate bullet row/i, label: /text beside the bullet/i, time: /which observation supplies/i },
    deltaCard: { measurement: /headline change is shown on the card/i, entity: /one card's change/i, time: /earlier and later values/i, target: /comparison goal/i },
    deltaList: { measurement: /change is shown in each list row/i, entity: /one row in the list/i, time: /earlier and later values/i, target: /comparison goal/i },
    scatter: { x: /left-to-right position/i, y: /up-and-down position/i, size: /size of each point/i, label: /point is hovered or selected/i, cluster: /coloured set of points/i },
    bubble: { x: /left-to-right position/i, y: /up-and-down position/i, size: /area of each bubble/i, label: /bubble is hovered or selected/i, cluster: /coloured set of bubbles/i },
    heatmap: { row: /horizontal row of cells/i, column: /vertical column of cells/i, value: /colour intensity of each cell/i, time: /which moment's cells/i },
    readinessMatrix: { row: /horizontal row of matrix cells/i, column: /vertical column of matrix cells/i, value: /colour or state of each cell/i, time: /which moment's matrix/i },
    timeline: { event: /label on an event bar/i, start: /left edge of each event bar/i, end: /right edge/i, lane: /separate horizontal lane/i, status: /colour or styling of each event/i },
    swimlane: { event: /label on an event bar/i, start: /left edge of each event bar/i, end: /right edge/i, lane: /horizontal swimlane/i, status: /colour or styling of each event/i },
    choroplethMap: { geography: /map area that is filled/i, value: /colour of each map area/i, time: /which moment's map areas/i },
    chronoChoroplethMap: { geography: /map area that is filled/i, value: /colour of each map area/i, time: /which frame of the map/i },
    mapScatter: { geography: /location of each point/i, value: /colour or size of each map point/i, time: /which moment's points/i },
    table: { columns: /visible table column/i, time: /which records or time context/i },
  };

  for (const schema of Object.values(expectedVisualCopy)) {
    assert.ok(schema, "Each expected chart type needs visual role coverage");
  }
  assert.deepEqual(
    Object.keys(expectedVisualCopy).sort(),
    listChartSchemas().filter(({ roles }) => roles.length > 0).map(({ typeId }) => typeId).sort(),
  );

  for (const [typeId, expectedRoles] of Object.entries(expectedVisualCopy)) {
    const chart = createChartDraft(typeId, {
      id: `${typeId}-visual-guidance`,
      title: `${typeId} visual guidance`,
      sourceId: "exercise-data",
    });
    const fields = allFields(buildEditorFormModel({ chart, profile: datasetProfile() }));
    assert.deepEqual(
      Object.keys(expectedRoles).sort(),
      getChartSchema(typeId).roles.map(({ id }) => id).sort(),
      `${typeId} needs guidance for each declared role`,
    );
    for (const [roleId, expected] of Object.entries(expectedRoles)) {
      assert.match(fields.find(({ id }) => id === roleId)?.help ?? "", expected, `${typeId} ${roleId}`);
    }
  }
});

test("every chart exposes only configuration controls its renderer honors", () => {
  const expectedControls = {
    bar: { labels: ["visible", "position", "format"] },
    groupedBar: { labels: ["visible", "position", "format"] },
    stackedBar: { labels: ["visible", "position", "format"] },
    horizontalBar: { labels: ["visible", "position", "format"] },
    horizontalStackedBar: { labels: ["visible", "position", "format"] },
    line: { labels: ["visible", "position", "format"] },
    area: { labels: ["visible", "position", "format"] },
    mixed: { labels: ["visible", "position", "format"] },
    pie: { labels: ["visible", "valueMode", "valueFontSize", "labelFontSize", "labelWrap"] },
    donut: { labels: ["visible", "valueMode", "valueFontSize", "labelFontSize", "labelWrap"] },
    kpi: {},
    gauge: { targets: ["ranges", "readoutLabel", "showReadoutLabel", "unit"] },
    bullet: {},
    deltaCard: { targets: ["direction"] },
    deltaList: { targets: ["direction"] },
    scatter: { labels: ["visible", "position"] },
    bubble: { labels: ["visible", "position"] },
    heatmap: { labels: ["visible"] },
    readinessMatrix: {},
    timeline: {},
    swimlane: {},
    choroplethMap: {},
    chronoChoroplethMap: {},
    mapScatter: {},
    table: {},
    image: {},
    freeText: {},
  };

  assert.deepEqual(Object.keys(expectedControls).sort(), listChartSchemas().map(({ typeId }) => typeId).sort());

  for (const [typeId, expected] of Object.entries(expectedControls)) {
    const schema = getChartSchema(typeId);
    const profile = datasetProfile();
    const chart = createChartDraft(typeId, {
      id: `${typeId}-control-contract`,
      title: `${typeId} control contract`,
      sourceId: "exercise-data",
      roles: Object.fromEntries(schema.roles
        .filter(({ min }) => min > 0)
        .map(({ id, max }) => [id, max === null ? [{ field: "value" }] : { field: "value" }])),
    });
    const model = buildEditorFormModel({
      chart,
      profile,
      prepared: {
        ...readyPrepared,
        meta: {
          ...readyPrepared.meta,
          formPreparationKey: buildFormPreparationKey({ chart, profile }),
        },
      },
    });
    const actual = Object.fromEntries(
      allFields(model)
        .filter(({ id }) => ["labels", "targets", "map", "timeline"].includes(id))
        .map(({ id, controls = [] }) => [id, controls]),
    );
    assert.deepEqual(actual, expected, typeId);
  }
});

test("table row distribution is available in the full appearance form only", () => {
  const chart = createChartDraft("table", {
    id: "exercise-table",
    title: "Exercise table",
    sourceId: "exercise-data",
    roles: { columns: [{ field: "score" }] },
    presentation: { table: { rowDistribution: "fill" } },
  });
  const profile = profileDataset([{ score: 4 }]);
  const full = buildEditorFormModel({
    chart,
    profile,
    prepared: preparedFor(chart, profile),
  });
  const quick = buildQuickEditorFormModel({ chart });
  const fullField = full.sections.flatMap(({ fields }) => fields).find(({ id }) => id === "tableRowDistribution");
  const quickField = quick.sections.flatMap(({ fields }) => fields).find(({ id }) => id === "tableRowDistribution");

  assert.equal(fullField?.value, "fill");
  assert.deepEqual(fullField?.options.map(({ value }) => value), ["regular", "fill"]);
  assert.equal(quickField, undefined);
});

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

test("axis fields identify the X interpretation and hide the unused secondary value axis", () => {
  const primaryOnly = buildEditorFormModel({
    chart: lineChart(),
    profile: datasetProfile(),
    prepared: preparedFor(lineChart(), datasetProfile()),
  });
  const axes = allFields(primaryOnly).find(({ id }) => id === "axes");
  assert.equal(axes.xKind, "temporal");
  assert.equal(axes.hasSecondary, false);

  const secondary = buildEditorFormModel({
    chart: lineChart({
      roles: {
        measurements: [
          { field: "value", axis: "primary" },
          { field: "rate", axis: "secondary" },
        ],
        observation: { field: "reportedAt", interpretation: "temporal", format: "YYYY-MM-DD" },
      },
    }),
    profile: datasetProfile(),
    prepared: preparedFor(lineChart({
      roles: {
        measurements: [
          { field: "value", axis: "primary" },
          { field: "rate", axis: "secondary" },
        ],
        observation: { field: "reportedAt", interpretation: "temporal", format: "YYYY-MM-DD" },
      },
    }), datasetProfile()),
  });
  assert.equal(allFields(secondary).find(({ id }) => id === "axes").hasSecondary, true);
});

test("axis fields expose temporal X controls when preparation inferred a datetime column", () => {
  const chart = lineChart({
    roles: {
      measurements: [{ field: "value", axis: "primary" }],
      observation: { field: "reportedAt" },
    },
  });
  const profile = datasetProfile();
  const model = buildEditorFormModel({
    chart,
    profile,
    prepared: preparedFor(chart, profile, {
      ...readyPrepared,
      meta: {
        ...readyPrepared.meta,
        axisInterpretation: "temporal",
      },
    }),
  });

  assert.equal(allFields(model).find(({ id }) => id === "axes").xKind, "temporal");
});

test("horizontal axis fields keep the observation interpretation", () => {
  const chart = createChartDraft("horizontalBar", {
    id: "horizontal-temporal-form",
    title: "Horizontal temporal form",
    sourceId: "exercise-data",
    roles: {
      measurements: [{ field: "value", axis: "primary" }],
      observation: { field: "reportedAt", interpretation: "temporal", format: "YYYY-MM-DD" },
    },
  });
  const profile = datasetProfile();
  const model = buildEditorFormModel({
    chart,
    profile,
    prepared: preparedFor(chart, profile),
  });

  assert.equal(allFields(model).find(({ id }) => id === "axes").xKind, "temporal");
});

test("quick editing validates inferred temporal axis settings with the source profile", () => {
  const chart = lineChart({
    roles: {
      measurements: [{ field: "value", axis: "primary" }],
      observation: { field: "reportedAt" },
    },
    presentation: {
      axes: {
        x: {
          min: "2027-05-01",
          max: "2027-05-31",
          labelPreset: "adaptive",
          tickFrequency: { every: 1, unit: "day" },
        },
      },
    },
  });

  assert.equal(buildQuickEditorFormModel({ chart }).valid, false);
  assert.equal(
    buildQuickEditorFormModel({ chart, profile: datasetProfile() }).valid,
    true,
  );
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

test("card charts expose their approved visual styles and only the applicable card controls", () => {
  const profile = datasetProfile();
  const kpi = kpiChart();
  const kpiModel = buildEditorFormModel({
    chart: kpi,
    profile,
    prepared: preparedFor(kpi, profile),
  });
  const kpiAppearance = kpiModel.sections.find(({ id }) => id === "appearance");
  const cardStyle = kpiAppearance.fields.find(({ id }) => id === "cardStyle");
  const accentColors = kpiAppearance.fields.find(({ id }) => id === "cardAccentColors");

  assert.deepEqual(
    {
      control: cardStyle?.control,
      path: cardStyle?.path,
      value: cardStyle?.value,
      options: cardStyle?.options?.map(({ value }) => value),
    },
    {
      control: "select",
      path: ["presentation", "card", "style"],
      value: "quietLedger",
      options: ["quietLedger", "valueFirst", "signalStamps"],
    },
  );
  assert.deepEqual(
    {
      control: accentColors?.control,
      path: accentColors?.path,
      value: accentColors?.value,
    },
    {
      control: "palette",
      path: ["presentation", "card", "accentColors"],
      value: [],
    },
  );

  const valueFirst = structuredClone(kpi);
  valueFirst.presentation.card = { style: "valueFirst" };
  const valueFirstModel = buildEditorFormModel({
    chart: valueFirst,
    profile,
    prepared: preparedFor(valueFirst, profile),
  });
  assert.equal(valueFirstModel.sections
    .find(({ id }) => id === "appearance")
    .fields
    .some(({ id }) => id === "cardAccentColors"), false);

  const delta = deltaChart();
  const deltaModel = buildEditorFormModel({
    chart: delta,
    profile,
    prepared: preparedFor(delta, profile),
  });
  const deltaAppearance = deltaModel.sections.find(({ id }) => id === "appearance");
  assert.deepEqual(
    deltaAppearance.fields
      .filter(({ id }) => id === "cardStyle" || id === "deltaArrow")
      .map(({ id, control, path, value, options }) => ({
        id,
        control,
        path,
        value,
        options: options?.map(({ value: option }) => option),
      })),
    [
      {
        id: "cardStyle",
        control: "select",
        path: ["presentation", "card", "style"],
        value: "footerDelta",
        options: ["footerDelta", "splitMetric", "directionRail"],
      },
      {
        id: "deltaArrow",
        control: "toggle",
        path: ["presentation", "card", "showDeltaArrow"],
        value: true,
        options: undefined,
      },
    ],
  );
  assert.equal(deltaAppearance.fields.some(({ id }) => id === "cardAccentColors"), false);
});

test("legend controls are exposed only by renderers that consume them", () => {
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
    assert.deepEqual(
      model.sections
        .find(({ id }) => id === "appearance")
        .fields.find(({ id }) => id === "legendWrap"),
      {
        id: "legendWrap",
        label: "Wrap long legend labels",
        control: "toggle",
        path: ["presentation", "legend", "wrap"],
        value: false,
      },
      chart.typeId,
    );
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
      .fields.some(({ id }) => id === "legendVisible" || id === "legendWrap"),
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
    axisModel.sections[0].fields.map(({ id, control, path }) => ({ id, control, path })),
    [
      { id: "title", control: "text", path: ["title"] },
      { id: "titleVisible", control: "toggle", path: ["presentation", "title", "visible"] },
      { id: "background", control: "quickBackground", path: ["presentation", "background", "color"] },
      { id: "legendVisible", control: "toggle", path: ["presentation", "legend", "visible"] },
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
