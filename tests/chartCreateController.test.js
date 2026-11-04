import assert from "node:assert/strict";
import test from "node:test";

import {
  createChartCreateSnapshot,
  executeChartCreate,
} from "../src/charting/forms/chartCreateController.js";

test("wizard create adapter revalidates then persists the complete payload exactly once", async () => {
  const payload = {
    chart: { id: "chart-a", typeId: "line", sourceId: "cases" },
    chronoGroups: [{ id: "exercise", members: [{ chartId: "chart-a" }] }],
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
    persist: async (created, placement) => {
      calls.push({ created, placement });
      return { dashboardRevision: "dashboard-8" };
    },
  });

  assert.equal(result.status, "committed");
  assert.equal(result.chartId, "chart-a");
  assert.deepEqual(calls, [{
    created: payload,
    placement: {
      pageId: "biomedical",
      sectionId: "outbreak",
      anchorId: "append",
      placement: { relation: "append", footprint: "standard" },
    },
  }]);
  assert.equal(result.handoff.destinationIdentity.pageId, "biomedical");
  assert.equal(result.handoff.reveal, "full-panel");
});

test("wizard create adapter carries the reviewed identity placement into persistence", async () => {
  const payload = {
    chart: { id: "chart-between", typeId: "line", sourceId: "cases" },
  };
  const snapshot = createChartCreateSnapshot({
    transactionId: "create-chart-between",
    finalized: payload,
    destination: {
      pageId: "biomedical",
      sectionId: "outbreak",
      anchorId: "chart-anchor",
      relation: "before",
      footprint: "wide",
    },
    dashboardRevision: "dashboard-7",
    permissionRevision: "permission-3",
    schemaRevision: "line-9",
    source: { id: "cases", revision: "source-4", profileRevision: "profile-2" },
    renderProof: { status: "valid", revision: "render-5" },
    placementProof: { status: "valid", revision: "placement-6" },
  });
  let reviewedPlacement = null;

  const result = await executeChartCreate(snapshot, {
    persist: async (_created, placement) => {
      reviewedPlacement = placement;
      return { dashboardRevision: "dashboard-8" };
    },
  });

  assert.equal(result.status, "committed");
  assert.deepEqual(reviewedPlacement, {
    pageId: "biomedical",
    sectionId: "outbreak",
    anchorId: "chart-anchor",
    placement: { relation: "before", footprint: "wide" },
  });
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


test("section start review needs a destination but no chart anchor and still rejects revision drift", async () => {
  const snapshot = createChartCreateSnapshot({ transactionId: 'create-at-start',
    finalized: { chart: { id: 'chart-at-start', typeId: 'line', sourceId: 'cases' } },
    destination: { pageId: 'biomedical', sectionId: 'outbreak', relation: 'start' },
    dashboardRevision: 'dashboard-start', renderProof: { status: 'valid', revision: 'render-start' }, placementProof: { status: 'valid', revision: 'placement-start' },
  });
  snapshot.currentDashboard.pages[0].sections[0].anchors = [];
  let calls = 0;
  const drifted = structuredClone(snapshot);
  drifted.currentDashboard.revision = 'changed';
  const rejected = await executeChartCreate(drifted, { persist: async () => { calls++; } });
  assert.equal(rejected.status, 'validation-failed');
  assert.ok(rejected.errors.some(e => e.code === 'DASHBOARD_REVISION_DRIFT'));
  assert.equal(calls, 0);
  const committed = await executeChartCreate(snapshot, { persist: async (_chart, destination) => {
    calls++;
    assert.equal(destination.placement.relation, 'start');
    return { dashboardRevision: 'saved' };
  } });
  assert.equal(committed.status, 'committed');
  assert.equal(calls, 1);
});
