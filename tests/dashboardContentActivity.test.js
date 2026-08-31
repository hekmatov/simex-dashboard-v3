import assert from "node:assert/strict";
import test from "node:test";

import {
  DASHBOARD_CONTENT_ACTIVITY_IDS,
  beginDashboardContentOperation,
  describeDashboardContentActivity,
} from "../src/lib/dashboardContentActivity.js";

const REQUIRED_ACTIVITY_IDS = [
  "dashboard.look.saved",
  "dashboard.settings.updated",
  "dashboard.reset",
  "dashboard.content.deleted",
  "package.imported",
  "package.exported",
  "dashboard.restored",
  "layout.draft.created",
  "layout.draft.updated",
  "layout.saved",
  "layout.discarded",
  "chart.draft.created",
  "chart.draft.updated",
  "chart.draft.reset",
  "chart.draft.suspended",
  "chart.draft.resumed",
  "chart.draft.discarded",
  "chart.created",
  "chart.saved",
  "chart.deleted",
  "panel.moved",
  "page.created",
  "page.updated",
  "page.reordered",
  "page.deleted",
  "section.created",
  "section.updated",
  "section.reordered",
  "section.deleted",
  "static.draft.created",
  "static.draft.updated",
  "static.draft.discarded",
  "static.saved",
  "source.draft.created",
  "source.draft.discarded",
  "source.saved",
  "source.deleted",
  "chrono.draft.created",
  "chrono.draft.updated",
  "chrono.draft.discarded",
  "chrono.saved",
  "chrono.deleted",
  "scene.draft.created",
  "scene.draft.updated",
  "scene.draft.discarded",
  "scene.saved",
  "scene.deleted",
];

test("the semantic activity catalogue covers dashboard content manipulation boundaries", () => {
  assert.deepEqual(
    REQUIRED_ACTIVITY_IDS.filter((id) => !DASHBOARD_CONTENT_ACTIVITY_IDS.includes(id)),
    [],
  );
});

test("activity descriptions use object names while retaining stable coalescing keys", () => {
  assert.deepEqual(describeDashboardContentActivity("chart.draft.updated", {
    subject: "ICU occupancy",
    detail: "Title changed.",
  }), {
    key: "content:chart.draft.updated:ICU occupancy",
    label: "Chart draft",
    message: "Updating chart draft “ICU occupancy”. Title changed.",
    intent: "info",
  });
});

test("content operations request priority presentation and expose the pre-work barrier", async () => {
  const calls = [];
  const expected = { painted: true };
  const operation = beginDashboardContentOperation((options) => {
    calls.push(options);
    return {
      beforeWork: async () => expected,
      succeed() {},
      fail() {},
      dismiss() {},
    };
  }, "chart.saved", { subject: "ICU occupancy" });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].priority, true);
  assert.equal(await operation.beforeWork(), expected);
});
