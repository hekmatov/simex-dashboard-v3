import assert from "node:assert/strict";
import test from "node:test";

import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { validateChronoGroups } from "../src/charting/time/chronoGroupModel.js";
import { validateScene } from "../src/charting/time/sceneSchema.js";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const buildModule = await vite.ssrLoadModule("/src/components/build/BuildWorkspace.jsx");
await vite.close();

test("the central Chrono eligibility boundary rejects static panels explicitly", () => {
  const image = createChartDraft({
    typeId: "image",
    id: "briefing-image",
    sourceId: "briefing",
    title: "Briefing",
  });
  assert.throws(() => validateChronoGroups([{
    id: "invalid-static",
    name: "Invalid static group",
    period: { start: "2027-05-01", end: "2027-05-01" },
    matching: { policy: "exact" },
    secondsPerFrame: 1,
    members: [{ chartId: image.id, timeRole: "observation" }],
  }], {
    charts: [image],
    loadedData: {},
    profiles: {},
    timezone: "UTC",
  }), /static panel.*cannot join Chrono Groups/i);
});

test("Scene validation remains strict and is not weakened for static content", () => {
  assert.throws(() => validateScene({
    id: "static-scene",
    name: "Static scene",
    pageId: "overview",
    chronoGroupId: "missing-static-group",
    period: { start: "2027-05-01T00:00:00.000Z", end: "2027-05-01T00:00:00.000Z" },
    frames: { mode: "source", chartId: "briefing-image", selection: "all" },
    matching: { policy: "authored" },
    present: { chartIds: ["briefing-image"], layout: { columns: 1 }, audience: { width: 1000, height: 1000 } },
  }, {
    chronoGroups: [],
    pages: [{ id: "overview" }],
    charts: [{ id: "briefing-image", pageId: "overview" }],
    scenes: [],
  }), /parent Chrono Group.*does not exist/i);
});

test("Build create/edit projections filter static panels before Chrono and Scene membership", () => {
  const chart = createChartDraft({
    typeId: "kpi",
    id: "status-chart",
    sourceId: "status",
    title: "Status",
  });
  const image = createChartDraft({
    typeId: "image",
    id: "briefing-image",
    sourceId: "briefing",
    title: "Briefing",
  });
  const dashboard = {
    pages: [{
      id: "overview",
      sections: [{ id: "main", panels: [chart, image] }],
    }],
    chronoGroups: [{
      id: "mixed",
      name: "Mixed",
      members: [
        { chartId: chart.id, timeRole: "observation" },
        { chartId: image.id, timeRole: "observation" },
      ],
    }],
    loadedData: { status: [], briefing: [] },
  };

  const projected = buildModule.temporalAuthoringCharts(dashboard);
  assert.deepEqual(projected.map(({ id }) => id), [chart.id]);
  assert.deepEqual(buildModule.sceneEligibleCharts(dashboard, [
    projected[0],
    { id: image.id, pageId: "overview", sourceChart: image },
  ], { chronoGroupId: "mixed", pageId: "overview" }).map(({ id }) => id), [chart.id]);

  const savedGroups = buildModule.mergeChronoGroup([], {
    id: "created",
    name: "Created",
    period: { startEpochMs: Date.UTC(2027, 4, 1), endEpochMs: Date.UTC(2027, 4, 2) },
    defaultMatching: { policy: "exact" },
    secondsPerFrame: 1,
    chartIds: [chart.id, image.id],
    memberFallbacks: {},
  }, projected);
  assert.deepEqual(savedGroups[0].members.map(({ chartId }) => chartId), [chart.id]);
});
