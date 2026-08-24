import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

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

const scenePreviewModule = await import(
  "../src/components/time/scenePreviewTime.js"
).catch(() => null);

const MAY_1 = Date.UTC(2027, 4, 1);
const MAY_2 = Date.UTC(2027, 4, 2);
const MAY_3 = Date.UTC(2027, 4, 3);

test("source-frame preview uses the latest authored Scene frame and matching contexts", () => {
  assert.ok(scenePreviewModule, "Scene preview projection must exist");
  const { dashboard, scene } = previewFixture({
    mode: "source",
    selection: "selected",
    selectedEpochs: [MAY_1, MAY_3],
  });
  const projection = scenePreviewModule.buildScenePreviewProjection({ dashboard, scene });

  assert.equal(projection.activeEpochMs, MAY_3);
  assert.equal(projection.label, "2027-05-03");
  assert.deepEqual(projection.timeContexts["chart-a"], {
    groupId: "group-a",
    activeEpochMs: MAY_3,
    matching: { policy: "lastKnown" },
    sceneId: "scene-a",
  });
  assert.equal(projection.timeContexts["outside-scene"], undefined);
  assert.equal(projection.error, null);
});

test("calendar preview uses the latest valid calendar frame", () => {
  assert.ok(scenePreviewModule, "Scene preview projection must exist");
  const { dashboard, scene } = previewFixture({
    mode: "calendar",
    interval: { value: 1, unit: "day" },
  });
  const projection = scenePreviewModule.buildScenePreviewProjection({ dashboard, scene });

  assert.equal(projection.activeEpochMs, MAY_3);
  assert.equal(projection.label, "2027-05-03");
  assert.equal(projection.error, null);
});

test("preview projection reports unavailable runtime data without throwing", () => {
  assert.ok(scenePreviewModule, "Scene preview projection must exist");
  const { dashboard, scene } = previewFixture({ mode: "source", selection: "all" });
  delete dashboard.loadedData["source-a"];

  const projection = scenePreviewModule.buildScenePreviewProjection({ dashboard, scene });

  assert.equal(projection.activeEpochMs, null);
  assert.equal(projection.label, null);
  assert.deepEqual({ ...projection.timeContexts }, {});
  assert.match(projection.error, /preview unavailable/i);
  assert.match(projection.error, /not loaded/i);
});

function previewFixture(frames) {
  const rows = [
    { observed: "2027-05-01", value: 10 },
    { observed: "2027-05-02", value: 20 },
    { observed: "2027-05-03", value: 30 },
  ];
  const sceneChart = temporalChart("chart-a", "source-a");
  const otherChart = temporalChart("outside-scene", "source-b");
  const dashboard = {
    timezone: "UTC",
    chronoGroups: [{
      id: "group-a",
      name: "Group A",
      period: { start: "2027-05-01", end: "2027-05-03" },
      secondsPerFrame: 1,
      matching: { policy: "exact" },
      members: [
        { chartId: sceneChart.id, timeRole: "observation" },
        { chartId: otherChart.id, timeRole: "observation" },
      ],
    }],
    pages: [{
      id: "page-a",
      sections: [{
        id: "section-a",
        panels: [sceneChart, otherChart].map((chart) => ({
          id: `placement-${chart.id}`,
          chart,
        })),
      }],
    }],
    loadedData: { "source-a": rows, "source-b": rows },
    datasetProfiles: {
      "source-a": profileDataset(rows, {
        observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
      }),
      "source-b": profileDataset(rows, {
        observed: { interpretation: "temporal", format: "YYYY-MM-DD" },
      }),
    },
  };
  const scene = {
    id: "scene-a",
    name: "Scene A",
    pageId: "page-a",
    chronoGroupId: "group-a",
    period: {
      start: "2027-05-01T00:00:00.000Z",
      end: "2027-05-03T00:00:00.000Z",
    },
    frames: {
      ...frames,
      ...(frames.mode === "source" ? { chartId: sceneChart.id } : {}),
    },
    members: [{ chartId: sceneChart.id, width: 2, matching: "lastKnown" }],
    present: { chartIds: [sceneChart.id], layout: "single" },
  };
  return { dashboard, scene };
}

function temporalChart(id, sourceId) {
  return {
    id,
    typeId: "line",
    title: id,
    sourceId,
    roles: {
      measurements: { field: "value" },
      observation: {
        field: "observed",
        interpretation: "temporal",
        format: "YYYY-MM-DD",
      },
    },
    presentation: { collection: null, labels: null, accessibility: null },
    interaction: { zoom: { enabled: false }, timeSync: null },
  };
}
