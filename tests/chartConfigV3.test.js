import assert from "node:assert/strict";
import test from "node:test";

import {
  createChartDraft,
  validateChartInstance,
} from "../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { validateChartDataCompatibility } from "../src/charting/data/prepareChartData.js";

test("direct compatibility reports the exact missing configured column without changing chart V3", () => {
  const chart = createChartDraft("line", {
    id: "trend", title: "Trend", sourceId: "cases",
    roles: { measurements: [{ field: "cases", axis: "primary" }], observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" } },
  });
  const before = structuredClone(chart);
  const result = validateChartDataCompatibility({
    chart,
    rows: [{ date: "2026-01-01" }],
    datasetProfile: profileDataset([{ date: "2026-01-01" }]),
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.missingColumns, ["cases"]);
  assert.equal(result.errors[0].code, "missing-encoding-column");
  assert.deepEqual(chart, before);
  assert.equal(chart.configVersion, 3);
});

test("direct compatibility accepts a structurally complete candidate", () => {
  const rows = [{ date: "2026-01-01", cases: 4 }];
  const chart = createChartDraft("line", {
    id: "trend", title: "Trend", sourceId: "cases",
    roles: { measurements: [{ field: "cases", axis: "primary" }], observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" } },
  });
  const result = validateChartDataCompatibility({ chart, rows, datasetProfile: profileDataset(rows) });
  assert.equal(result.ok, true);
  assert.deepEqual(result.missingColumns, []);
  assert.equal(result.prepared.status, "ready");
});

test("chart drafts preserve an optional false title visibility flag", () => {
  const chart = createChartDraft("line", {
    id: "hidden-title-trend",
    title: "Hidden title trend",
    sourceId: "cases",
    roles: {
      measurements: [{ field: "cases", axis: "primary" }],
      observation: {
        field: "date",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    presentation: { title: { visible: false } },
  });

  assert.equal(chart.presentation.title.visible, false);
  assert.equal(validateChartInstance(chart), chart);
});

test("chart title visibility rejects non-boolean values", () => {
  const chart = createChartDraft("line", {
    id: "invalid-title-visibility",
    title: "Invalid title visibility",
    sourceId: "cases",
    roles: {
      measurements: [{ field: "cases", axis: "primary" }],
      observation: {
        field: "date",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    presentation: { title: { visible: "false" } },
  });

  assert.throws(
    () => validateChartInstance(chart),
    /Chart presentation title visible must be boolean\./,
  );
});

test("fresh chart drafts receive distinct readable identities while supplied identities remain stable", () => {
  const first = createChartDraft("line", { title: "First", sourceId: "cases" });
  const second = createChartDraft("line", { title: "Second", sourceId: "cases" });
  const restored = createChartDraft("line", {
    id: "restored-trend",
    title: "Restored",
    sourceId: "cases",
  });

  assert.match(first.id, /^chart-line-/);
  assert.match(second.id, /^chart-line-/);
  assert.notEqual(first.id, second.id);
  assert.equal(restored.id, "restored-trend");
});

test("axis presentation accepts structured X and value-axis title options while rejecting invalid ranges", () => {
  const chart = createChartDraft("line", {
    id: "configured-axis-trend",
    title: "Configured axis trend",
    sourceId: "cases",
    roles: {
      measurements: [{ field: "cases", axis: "primary" }],
      observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" },
    },
    presentation: {
      axes: {
        x: {
          title: "Reported at",
          min: "2027-01-01T08:30",
          max: "2027-12-31T17:45",
          labelPreset: "ddMmmYearBoundary",
          tickFrequency: { every: 2, unit: "month" },
        },
        primary: {
          title: "Cases",
          titlePosition: "center",
          titleOrientation: "vertical",
          tickFrequency: { every: 5 },
        },
      },
    },
  });

  assert.equal(validateChartInstance(chart), chart);
  chart.presentation.axes.x.tickFrequency = { every: 5, unit: "month" };
  assert.throws(
    () => validateChartInstance(chart),
    /month tick frequency must be 1, 2, or 3/i,
  );
  chart.presentation.axes.x.tickFrequency = { every: 2, unit: "month" };
  chart.roles.measurements.push({ field: "rate", yAxisIndex: 1 });
  assert.equal(validateChartInstance(chart), chart);
  chart.presentation.axes.x.min = 2;
  assert.throws(() => validateChartInstance(chart), /X min must be a temporal string/i);
  chart.presentation.axes.x.min = "2027-01-01T08:30";
  chart.presentation.axes.primary.titleOrientation = "diagonal";
  assert.throws(() => validateChartInstance(chart), /titleOrientation/i);
});

test("value-axis title typography and offsets accept only their bounded values", () => {
  const chart = createChartDraft("line", {
    id: "adjustable-axis-title",
    title: "Adjustable axis title",
    sourceId: "cases",
    roles: {
      measurements: [
        { field: "cases", axis: "primary" },
        { field: "rate", axis: "secondary" },
      ],
      observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" },
    },
    presentation: {
      axes: {
        primary: {
          title: "Cases",
          titleFontSize: 10,
          titleBold: true,
          titleOffsetX: -96,
          titleOffsetY: 96,
        },
        secondary: {
          title: "Rate",
          titleFontSize: 24,
          titleBold: false,
          titleOffsetX: 96,
          titleOffsetY: -96,
        },
      },
    },
  });

  assert.equal(validateChartInstance(chart), chart);

  const invalid = [
    ["titleFontSize", 9, /titleFontSize must be an integer from 10 through 24/],
    ["titleFontSize", 24.5, /titleFontSize must be an integer from 10 through 24/],
    ["titleBold", "true", /titleBold must be a boolean/],
    ["titleOffsetX", -97, /titleOffsetX must be from -96 through 96/],
    ["titleOffsetY", 97, /titleOffsetY must be from -96 through 96/],
  ];
  for (const [key, value, message] of invalid) {
    const candidate = structuredClone(chart);
    candidate.presentation.axes.primary[key] = value;
    assert.throws(() => validateChartInstance(candidate), message, key);
  }
});

test("axis presentation validates datetime options for an inferred temporal observation", () => {
  const profile = profileDataset([
    { date: "2027-01-01", cases: 4 },
    { date: "2027-02-01", cases: 7 },
  ]);
  const chart = createChartDraft("line", {
    id: "inferred-temporal-axis",
    title: "Inferred temporal axis",
    sourceId: "cases",
    roles: {
      measurements: [{ field: "cases", axis: "primary" }],
      observation: { field: "date" },
    },
    presentation: {
      axes: {
        x: {
          min: "2027-01-01",
          max: "2027-12-31",
          labelPreset: "ddMmYyyy",
          tickFrequency: { every: 1, unit: "month" },
        },
      },
    },
  });

  assert.equal(validateChartInstance(chart, {
    columnTypes: new Map(profile.columns.map((column) => [column.name, column])),
  }), chart);
});

test("only Text/Image chart instances may persist an intentionally blank title", () => {
  for (const typeId of ["freeText", "image"]) {
    const panel = createChartDraft(typeId, {
      id: `${typeId}-without-title`,
      title: "",
      sourceId: `${typeId}-source`,
    });
    assert.equal(validateChartInstance(panel), panel);
  }

  const chart = createChartDraft("line", {
    id: "line-without-title",
    title: "",
    sourceId: "cases",
    roles: {
      measurements: [{ field: "cases", axis: "primary" }],
      observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" },
    },
  });
  assert.throws(() => validateChartInstance(chart), /Chart title is required/);
});
