import assert from "node:assert/strict";
import test from "node:test";

import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { validateChronoGroups } from "../src/charting/time/chronoGroupModel.js";
import { validateScene } from "../src/charting/time/sceneSchema.js";

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
