import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { rankCollection } from "../src/charting/collection/rankCollection.js";
import { buildRenderModel } from "../src/charting/rendering/buildRenderModel.js";

register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    return { format: "module", source: loaded.source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
`)}`, import.meta.url);

const MAY_1 = Date.UTC(2027, 4, 1);
const MAY_2 = Date.UTC(2027, 4, 2);
const MAY_3 = Date.UTC(2027, 4, 3);

function chart(typeId, overrides = {}) {
  return {
    id: `${typeId}-collection`,
    typeId,
    title: `${typeId} status`,
    description: `${typeId} description`,
    roles: {},
    presentation: {
      title: { align: "left" },
      collection: collectionSettings(),
      targets: { ranges: [50, 80, 100] },
      ...(overrides.presentation ?? {}),
    },
    interaction: { zoom: { enabled: false } },
    ...overrides,
  };
}

function collectionSettings(ranking = { mode: "fixed" }) {
  return {
    layout: "fixed",
    rows: 1,
    columns: 2,
    gap: 16,
    overflow: "manualPages",
    ranking,
    carousel: {
      intervalMs: 10000,
      loop: true,
      pauseOnHover: true,
      transition: "none",
    },
    playback: {
      rerank: true,
      pauseCarousel: true,
    },
  };
}

function ready(marks, meta = {}) {
  return {
    status: "ready",
    marks,
    diagnostics: [],
    meta,
  };
}

function assertDeeplyFrozen(value) {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const nested of Object.values(value)) assertDeeplyFrozen(nested);
}

test("repeated gauges become stable detached one-mark collection models with ranking metrics", () => {
  const sourceChart = chart("gauge");
  const sourcePrepared = ready([
    {
      entity: "Clinic A",
      label: "Oxygen",
      value: 72,
      target: 80,
      time: "2027-05-02",
      delta: { absolute: -3, percentage: -4 },
      riskScore: 7,
    },
    {
      entity: "Clinic B",
      label: "Oxygen",
      value: 55,
      target: 70,
      time: "2027-05-02",
    },
  ]);
  const chartBefore = structuredClone(sourceChart);
  const preparedBefore = structuredClone(sourcePrepared);

  const model = buildRenderModel({
    chart: sourceChart,
    prepared: sourcePrepared,
    renderContext: { accessibilityEnabled: true },
  });
  const repeated = buildRenderModel({
    chart: sourceChart,
    prepared: sourcePrepared,
    renderContext: { accessibilityEnabled: true },
  });

  assert.equal(model.kind, "targetCollection");
  assert.equal(model.items.length, 2);
  assert.deepEqual(
    model.items.map(({ entityId }) => entityId),
    repeated.items.map(({ entityId }) => entityId),
  );
  assert.equal(new Set(model.items.map(({ entityId }) => entityId)).size, 2);
  assert.deepEqual(model.items[0].delta, { absolute: -3, percentage: -4 });
  assert.equal(model.items[0].value, 72);
  assert.equal(model.items[0].actual, 72);
  assert.equal(model.items[0].target, 80);
  assert.equal(model.items[0].absoluteDelta, -3);
  assert.equal(model.items[0].percentageDelta, -4);
  assert.equal(model.items[0].distanceFromTarget, 8);
  assert.equal(model.items[0].riskScore, 7);
  assert.equal(model.items[1].distanceFromTarget, 15);
  assert.deepEqual(model.presentation, {
    collection: sourceChart.presentation.collection,
  });

  for (const item of model.items) {
    assert.equal(item.model.kind, "echarts");
    assert.equal(item.model.option.series.length, 1);
    assert.equal(item.model.option.series[0].data.length, 1);
    assert.deepEqual(item.model.option.series[0].center, ["50%", "58%"]);
    assert.equal(item.model.option.title, undefined);
    assert.equal(item.model.semanticSummary.items.length, 1);
    assert.match(item.accessibleSummary, new RegExp(item.label));
    assert.match(item.accessibleSummary, /actual \d+; target \d+; observed 2027-05-02/);
  }

  assert.equal(model.layout, undefined);
  assert.equal(model.page, undefined);
  assert.equal(model.timer, undefined);
  assert.deepEqual(sourceChart, chartBefore);
  assert.deepEqual(sourcePrepared, preparedBefore);
  assert.equal(Object.isFrozen(sourceChart.presentation.collection), false);
  assert.equal(Object.isFrozen(sourcePrepared.marks[0].delta), false);
  assertDeeplyFrozen(model);

  sourceChart.presentation.collection.rows = 4;
  sourcePrepared.marks[0].delta.absolute = 999;
  assert.equal(model.presentation.collection.rows, 1);
  assert.equal(model.items[0].delta.absolute, -3);
});

test("repeated bullets isolate one prepared observation per item and expose normalized actual values", () => {
  const model = buildRenderModel({
    chart: chart("bullet"),
    prepared: ready([
      { entity: "Clinic A", actual: 8, target: 10, time: "2027-05-02" },
      { entity: "Clinic B", actual: 6, target: 9, time: "2027-05-02", riskScore: 4 },
    ]),
    renderContext: { accessibilityEnabled: true },
  });

  assert.equal(model.kind, "targetCollection");
  assert.deepEqual(
    model.items.map(({ label, value, actual, target, distanceFromTarget, riskScore }) => ({
      label,
      value,
      actual,
      target,
      distanceFromTarget,
      riskScore,
    })),
    [
      {
        label: "Clinic A",
        value: 8,
        actual: 8,
        target: 10,
        distanceFromTarget: 2,
        riskScore: undefined,
      },
      {
        label: "Clinic B",
        value: 6,
        actual: 6,
        target: 9,
        distanceFromTarget: 3,
        riskScore: 4,
      },
    ],
  );
  for (const item of model.items) {
    assert.equal(item.model.option.yAxis.data.length, 1);
    assert.equal(item.model.option.series[0].data.length, 1);
    assert.equal(item.model.option.series[1].data.length, 1);
    assert.equal(item.model.option.grid, undefined);
    assert.deepEqual(item.model.accessibility.rows, [{
      label: item.label,
      actual: item.actual,
      target: item.target,
      time: "2027-05-02",
    }]);
  }
});

test("playback accessibility distinguishes the playback time from carried, nearest, and interpolated provenance", () => {
  const activeTime = {
    groupId: "exercise",
    epochMs: MAY_2,
    canonical: "2027-05-02",
    mode: "snapshot",
    status: "mixed",
  };
  const settings = collectionSettings({
    mode: "priority",
    method: "furthestFromTarget",
    stabilize: false,
  });
  const model = buildRenderModel({
    chart: chart("gauge", {
      presentation: {
        collection: settings,
        targets: { ranges: [50, 80, 100] },
      },
    }),
    prepared: ready([
      {
        entity: "Clinic A",
        value: 78,
        target: 80,
        time: "2027-05-02",
        active: true,
        temporalProvenance: {
          status: "carried",
          activeEpochMs: MAY_2,
          activeCanonical: "2027-05-02",
          sourceEpochMs: MAY_1,
        },
      },
      {
        entity: "Clinic B",
        value: 45,
        target: 80,
        time: "2027-05-02",
        active: true,
        temporalProvenance: {
          status: "nearest",
          activeEpochMs: MAY_2,
          activeCanonical: "2027-05-02",
          sourceEpochMs: MAY_3,
        },
      },
      {
        entity: "Clinic C",
        value: 62,
        target: 80,
        time: "2027-05-02",
        active: true,
        temporalProvenance: {
          status: "interpolated",
          activeEpochMs: MAY_2,
          activeCanonical: "2027-05-02",
          lowerEpochMs: MAY_1,
          upperEpochMs: MAY_3,
        },
      },
      {
        entity: "Clinic D",
        value: 80,
        target: 80,
        time: "2027-05-02",
        active: true,
        temporalProvenance: {
          status: "observed",
          activeEpochMs: MAY_2,
          activeCanonical: "2027-05-02",
          sourceEpochMs: MAY_2,
        },
      },
    ], { activeTime }),
    renderContext: { accessibilityEnabled: true },
  });

  assert.equal(model.items[0].temporalStatus, "carried");
  assert.equal(model.items[0].provenance.label, "Last measured 2027-05-01");
  assert.equal(model.items[0].model.option.series[0].data[0].provenance.label, "Last measured 2027-05-01");
  assert.equal(
    model.items[0].accessibleSummary,
    "Clinic A: actual 78; target 80. Playback time 2027-05-02. Last measured 2027-05-01",
  );
  assert.equal(model.items[1].temporalStatus, "nearest");
  assert.equal(model.items[1].provenance.label, "Nearest measurement 2027-05-03");
  assert.equal(
    model.items[1].accessibleSummary,
    "Clinic B: actual 45; target 80. Playback time 2027-05-02. Nearest measurement 2027-05-03",
  );
  assert.equal(
    model.items[2].accessibleSummary,
    "Clinic C: actual 62; target 80. Playback time 2027-05-02. Interpolated between 2027-05-01 and 2027-05-03",
  );
  assert.equal(
    model.items[3].accessibleSummary,
    "Clinic D: actual 80; target 80; observed 2027-05-02",
  );
  assert.doesNotMatch(model.items[0].accessibleSummary, /observed 2027-05-02/i);
  assert.doesNotMatch(model.items[1].accessibleSummary, /observed 2027-05-02/i);
  assert.doesNotMatch(model.items[2].accessibleSummary, /observed 2027-05-02/i);

  const ranked = rankCollection(model.items, settings);
  assert.equal(ranked[0].entityId, model.items[1].entityId);
  assert.equal(ranked[0].value, 45);
  assert.equal(ranked[0].model.semanticSummary.items[0].actual, 45);
});

test("single Gauge and Bullet observations retain the ordinary ECharts path", () => {
  for (const [typeId, mark] of [
    ["gauge", { value: 72, target: 80, time: "2027-05-02" }],
    ["bullet", { actual: 8, target: 10, label: "Clinic A", time: "2027-05-02" }],
  ]) {
    const model = buildRenderModel({
      chart: chart(typeId, {
        presentation: { collection: null, targets: { ranges: [50, 80, 100] } },
      }),
      prepared: ready([mark]),
      renderContext: { accessibilityEnabled: true },
    });

    assert.equal(model.kind, "echarts");
    assert.equal(model.option.series[0].data.length, 1);
    assert.equal(model.accessibility.rows.length, 1);
  }
});

test("repeated targets fail closed when stable semantic identity is missing or duplicated", () => {
  const missing = buildRenderModel({
    chart: chart("gauge"),
    prepared: ready([
      { value: 4, target: 8 },
      { value: 6, target: 8 },
    ]),
  });
  const duplicate = buildRenderModel({
    chart: chart("bullet"),
    prepared: ready([
      { entity: "Clinic A", label: "Beds", actual: 4, target: 8 },
      { entity: "Clinic A", label: "Beds", actual: 6, target: 8 },
    ]),
  });
  const composite = buildRenderModel({
    chart: chart("bullet"),
    prepared: ready([
      { entity: "Clinic A", label: "Beds", actual: 4, target: 8 },
      { entity: "Clinic A", label: "Oxygen", actual: 6, target: 8 },
    ]),
  });

  assert.equal(missing.kind, "error");
  assert.match(missing.message, /stable entity or label/i);
  assert.ok(missing.message.length <= 240);
  assert.equal(duplicate.kind, "error");
  assert.match(duplicate.message, /duplicate.*identity/i);
  assert.ok(duplicate.message.length <= 240);
  assert.equal(composite.kind, "error");
  assert.match(composite.message, /duplicate.*identity/i);
  assert.ok(composite.message.length <= 240);
});

test("repeated target entity identity remains stable when its descriptive label changes", () => {
  const before = buildRenderModel({
    chart: chart("gauge"),
    prepared: ready([
      { entity: " Clinic A ", label: "Beds", value: 4, target: 8 },
      { entity: "Clinic B", label: "Beds", value: 6, target: 8 },
    ]),
  });
  const after = buildRenderModel({
    chart: chart("gauge"),
    prepared: ready([
      { entity: "Clinic A", label: "Critical-care beds", value: 5, target: 8 },
      { entity: "Clinic B", label: "Beds", value: 7, target: 8 },
    ]),
  });

  assert.equal(before.kind, "targetCollection");
  assert.equal(after.kind, "targetCollection");
  assert.equal(before.items[0].entityId, after.items[0].entityId);
  assert.equal(before.items[0].label, "Clinic A \u2014 Beds");
  assert.equal(after.items[0].label, "Clinic A \u2014 Critical-care beds");
});

test("repeated target identities normalize visible labels and reject blank or colliding semantics", () => {
  const normalizedInput = ready([
    { entity: " Clinic A ", label: " Beds ", value: 4, target: 8 },
    { entity: " Clinic B ", label: " Beds ", value: 6, target: 8 },
  ]);
  const normalized = buildRenderModel({
    chart: chart("gauge"),
    prepared: normalizedInput,
  });
  const repeated = buildRenderModel({
    chart: chart("gauge"),
    prepared: normalizedInput,
  });
  const whitespaceOnly = buildRenderModel({
    chart: chart("gauge"),
    prepared: ready([
      { entity: "   ", value: 4, target: 8 },
      { entity: "Clinic B", value: 6, target: 8 },
    ]),
  });
  const typedDisplayCollision = buildRenderModel({
    chart: chart("gauge"),
    prepared: ready([
      { entity: 1, value: 4, target: 8 },
      { entity: "1", value: 6, target: 8 },
    ]),
  });
  const crossRoleDisplayCollision = buildRenderModel({
    chart: chart("bullet"),
    prepared: ready([
      { entity: "A", actual: 4, target: 8 },
      { label: "A", actual: 6, target: 8 },
    ]),
  });

  assert.equal(normalized.kind, "targetCollection");
  assert.deepEqual(
    normalized.items.map(({ label }) => label),
    ["Clinic A — Beds", "Clinic B — Beds"],
  );
  assert.ok(normalized.items.every(({ label }) => label.trim().length > 0));
  assert.deepEqual(
    normalized.items.map(({ entityId }) => entityId),
    repeated.items.map(({ entityId }) => entityId),
  );
  assert.equal(whitespaceOnly.kind, "error");
  assert.match(whitespaceOnly.message, /must not be blank/i);
  assert.equal(typedDisplayCollision.kind, "error");
  assert.match(typedDisplayCollision.message, /duplicate.*identity/i);
  assert.equal(crossRoleDisplayCollision.kind, "error");
  assert.match(crossRoleDisplayCollision.message, /duplicate.*identity/i);
});

test("the target collection view renders detached model identity and semantic summaries without nested outer metadata", async () => {
  const {
    default: TargetCollectionChartView,
  } = await import("../src/components/charts/TargetCollectionChartView.jsx");
  const model = buildRenderModel({
    chart: chart("gauge"),
    prepared: ready([
      { entity: "Clinic A", value: 72, target: 80, time: "2027-05-02" },
      { entity: "Clinic B", value: 55, target: 70, time: "2027-05-02" },
    ]),
    renderContext: { accessibilityEnabled: true },
  });
  const modelBefore = structuredClone(model);
  const html = renderToStaticMarkup(React.createElement(
    TargetCollectionChartView,
    {
      model,
      chart: chart("gauge"),
      provenance: { label: "Operations register" },
      accessibilityEnabled: true,
    },
  ));

  assert.match(html, /data-collection-entity-id="target:&quot;Clinic A&quot;"/);
  assert.match(html, /data-collection-entity-id="target:&quot;Clinic B&quot;"/);
  assert.match(html, /Clinic A: actual 72; target 80; observed 2027-05-02/);
  assert.match(html, /Clinic B: actual 55; target 70; observed 2027-05-02/);
  assert.equal((html.match(/role="group"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /role="img"/);
  assert.equal((html.match(/class="chart-view-title"/g) ?? []).length, 1);
  assert.equal((html.match(/Source: Operations register/g) ?? []).length, 0);
  assert.deepEqual(model, modelBefore);
});
