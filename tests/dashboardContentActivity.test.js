import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
  DASHBOARD_CONTENT_ACTIVITY_IDS,
  beginDashboardContentOperation,
  describeDashboardContentActivity,
  runDashboardContentOperation,
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

test("Text/Image and existing-chart draft edits stay silent instead of publishing updating-draft activities", async () => {
  const renderer = await readFile(new URL("../src/components/DashboardRenderer.jsx", import.meta.url), "utf8");

  assert.equal(DASHBOARD_CONTENT_ACTIVITY_IDS.includes("static.draft.updated"), false);
  assert.equal(DASHBOARD_CONTENT_ACTIVITY_IDS.includes("chart.draft.updated"), false);
  assert.doesNotMatch(renderer, /reportContentActivity\("static\.draft\.updated"/);
  assert.doesNotMatch(renderer, /reportContentActivity\("chart\.draft\.updated"/);
  assert.equal((renderer.match(/onDraftChange=\{setStaticContentDraft\}/g) ?? []).length, 2);
});

test("activity descriptions use object names while retaining stable coalescing keys", () => {
  assert.deepEqual(describeDashboardContentActivity("chart.saved", {
    subject: "ICU occupancy",
    detail: "Title changed.",
  }), {
    key: "content:chart.saved:ICU occupancy",
    label: "Chart",
    message: "Chart saved “ICU occupancy”. Title changed.",
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

test("section reorder work starts only after its working notice has painted", async () => {
  let releasePaint;
  const events = [];
  const operation = {
    beforeWork() {
      events.push("working-notice-published");
      return new Promise((resolve) => {
        releasePaint = () => {
          events.push("working-notice-painted");
          resolve();
        };
      });
    },
    succeed() {
      events.push("completed");
    },
    fail(error) {
      events.push(`failed:${error.message}`);
    },
  };

  const pending = runDashboardContentOperation(operation, () => {
    events.push("section-reordered");
    return "next-layout";
  });

  await Promise.resolve();
  assert.deepEqual(events, ["working-notice-published"]);
  releasePaint();
  assert.equal(await pending, "next-layout");
  assert.deepEqual(events, [
    "working-notice-published",
    "working-notice-painted",
    "section-reordered",
    "completed",
  ]);
});
