import assert from "node:assert/strict";
import test from "node:test";

import {
  createChartCreateSnapshot,
  executeChartCreate,
} from "../src/charting/forms/chartCreateController.js";

test("wizard create adapter revalidates then persists the complete payload exactly once", async () => {
  const payload = {
    chart: { id: "chart-a", typeId: "line", sourceId: "cases" },
    timeSyncGroups: [{ id: "exercise", members: [{ chartId: "chart-a" }] }],
  };
  const snapshot = createChartCreateSnapshot({
    transactionId: "create-chart-a",
    draftId: "draft-chart-a",
    finalized: payload,
    destination: { pageId: "biomedical", sectionId: "outbreak", anchorId: "append" },
    dashboardRevision: "dashboard-7",
    permissionRevision: "permission-3",
    schemaRevision: "line-9",
    source: { id: "cases", revision: "source-4", profileRevision: "profile-2" },
    renderProof: { status: "valid", revision: "render-5" },
    placementProof: { status: "valid", revision: "placement-6" },
  });
  const calls = [];

  const result = await executeChartCreate(snapshot, {
    persist: async (created) => {
      calls.push(created);
      return { dashboardRevision: "dashboard-8" };
    },
  });

  assert.equal(result.status, "committed");
  assert.equal(result.chartId, "chart-a");
  assert.deepEqual(calls, [payload]);
  assert.equal(result.handoff.destinationIdentity.pageId, "biomedical");
  assert.equal(result.handoff.reveal, "full-panel");
});

test("wizard create adapter fails closed before persistence when a live authority drifts", async () => {
  const snapshot = createChartCreateSnapshot({
    transactionId: "create-chart-b",
    finalized: { chart: { id: "chart-b", typeId: "line", sourceId: "cases" } },
    destination: { pageId: "biomedical", sectionId: "outbreak" },
    dashboardRevision: "dashboard-7",
    permissionRevision: "permission-3",
    schemaRevision: "line-9",
    source: { id: "cases", revision: "source-4", profileRevision: "profile-2" },
    renderProof: { status: "valid", revision: "render-5" },
    placementProof: { status: "valid", revision: "placement-6" },
  });
  snapshot.currentDashboard.permissions.revision = "permission-4";
  let calls = 0;

  const result = await executeChartCreate(snapshot, {
    persist: async () => { calls += 1; },
  });

  assert.equal(result.status, "validation-failed");
  assert.equal(result.errors[0].code, "PERMISSION_REVISION_DRIFT");
  assert.equal(calls, 0);
});
