import assert from "node:assert/strict";
import test from "node:test";

import {
  buildChartReviewLedger,
  revalidateChartCreate,
} from "../src/charting/forms/chartReview.js";
import { commitChartCreate } from "../src/charting/forms/chartCreateTransaction.js";
import {
  reconcileChartCreateOutcome,
  recoverCommittedChartCreate,
} from "../src/charting/forms/chartCreateReconciliation.js";

const STAGES = [
  "destination",
  "chart-type",
  "data-source",
  "map-and-prepare-data",
  "configure-chart",
  "review-and-create",
];

function completeState(overrides = {}) {
  return {
    transactionId: "tx-chart-17",
    draftId: "draft-chart-17",
    expectedDashboardRevision: "dashboard-r7",
    expectedPermissionRevision: "permission-r2",
    destination: {
      pageId: "page-overview",
      sectionId: "section-main",
      anchorId: "anchor-after-summary",
      placement: { column: 2, row: 3, width: 6, height: 4 },
    },
    chartType: { id: "line", schemaRevision: "line-r3" },
    source: {
      id: "source-weather",
      revision: "source-r9",
      profileRevision: "profile-r4",
      provenance: { provider: "Met Office", retrievedAt: "2026-08-20T10:00:00Z" },
    },
    mapping: { x: "observedAt", y: "temperature" },
    preparation: { filters: [{ field: "station", equals: "AB12" }] },
    configuration: { title: "Temperature", yAxisLabel: "Celsius" },
    renderProof: { revision: "render-proof-r5", status: "valid" },
    placementProof: { revision: "placement-proof-r6", status: "valid" },
    memberships: ["group-weather"],
    companionProposals: [
      { id: "proposal-linked", ownership: "chart-create", kind: "derived-variable", value: "temperature" },
      { id: "proposal-unreferenced", ownership: "chart-create", kind: "derived-variable", value: "humidity" },
      { id: "proposal-external", ownership: "time-content", kind: "derived-variable", value: "wind" },
    ],
    referencedCompanionProposalIds: ["proposal-linked", "proposal-external"],
    durableRepairs: [
      {
        id: "repair-profile",
        ownership: "durable-repair",
        committedDependencyRevision: "profile-repair-r2",
        payload: { mustNotEnterTransaction: true },
      },
    ],
    warnings: ["The chart contains sparse observations."],
    acknowledgements: ["sparse-observations"],
    chartRecord: { id: "chart-temperature", type: "line", title: "Temperature" },
    placementPatch: { insertAfter: "chart-summary" },
    priorScrollAnchor: { id: "chart-summary", offset: 28 },
    ...overrides,
  };
}

function currentDashboard(overrides = {}) {
  return {
    revision: "dashboard-r7",
    permissions: { revision: "permission-r2", canCreateChart: true },
    chartSchemas: { line: { revision: "line-r3" } },
    sources: {
      "source-weather": { revision: "source-r9", profileRevision: "profile-r4" },
    },
    pages: [
      {
        id: "page-overview",
        sections: [
          {
            id: "section-main",
            anchors: [{ id: "anchor-after-summary" }],
          },
        ],
      },
    ],
    renderProofRevision: "render-proof-r5",
    placementProofRevision: "placement-proof-r6",
    ...overrides,
  };
}

function transaction(overrides = {}) {
  const result = revalidateChartCreate(completeState(overrides.state), currentDashboard(overrides.dashboard));
  assert.equal(result.valid, true);
  return { ...result.transactionCandidate, ...overrides.transaction };
}

test("Review lists the complete six-stage ledger and stage-owned repair links", () => {
  const ledger = buildChartReviewLedger(completeState());

  assert.deepEqual(
    ledger.map(({ id }) => id),
    [
      "destination-and-placement",
      "chart-type",
      "source-profile-and-provenance",
      "mapping-and-preparation",
      "configuration",
      "render-proof",
      "placement-proof",
      "memberships",
      "companion-proposals",
      "durable-repairs",
      "warnings",
      "acknowledgements",
    ],
  );
  assert.ok(ledger.every(({ repair }) => repair && STAGES.includes(repair.stage)));

  const durable = ledger.find(({ id }) => id === "durable-repairs");
  assert.deepEqual(durable.value, [
    { id: "repair-profile", committedDependencyRevision: "profile-repair-r2" },
  ]);
  assert.equal(JSON.stringify(durable).includes("mustNotEnterTransaction"), false);
});

test("revalidation checks every mutable authority before forming the exact transaction", () => {
  const result = revalidateChartCreate(completeState(), currentDashboard());

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(Object.keys(result.transactionCandidate).sort(), [
    "chartRecord",
    "companionProposals",
    "destinationIdentity",
    "draftId",
    "expectedDashboardRevision",
    "placementPatch",
    "transactionId",
  ]);
  assert.deepEqual(result.transactionCandidate.companionProposals.map(({ id }) => id), ["proposal-linked"]);
  assert.deepEqual(result.transactionCandidate.chartRecord.dependencyRevisions, {
    "repair-profile": "profile-repair-r2",
  });
  assert.equal(JSON.stringify(result.transactionCandidate).includes("mustNotEnterTransaction"), false);
});

test("revalidation rejects dashboard, schema, source, destination, anchor, permission, and proof drift", () => {
  const cases = [
    ["DASHBOARD_REVISION_DRIFT", { revision: "dashboard-r8" }, "review-and-create"],
    ["SCHEMA_REVISION_DRIFT", { chartSchemas: { line: { revision: "line-r4" } } }, "chart-type"],
    [
      "SOURCE_REVISION_DRIFT",
      { sources: { "source-weather": { revision: "source-r10", profileRevision: "profile-r4" } } },
      "data-source",
    ],
    ["DESTINATION_MISSING", { pages: [] }, "destination"],
    [
      "ANCHOR_MISSING",
      { pages: [{ id: "page-overview", sections: [{ id: "section-main", anchors: [] }] }] },
      "destination",
    ],
    ["PERMISSION_REVISION_DRIFT", { permissions: { revision: "permission-r3", canCreateChart: true } }, "destination"],
    ["PERMISSION_DENIED", { permissions: { revision: "permission-r2", canCreateChart: false } }, "destination"],
    ["RENDER_PROOF_DRIFT", { renderProofRevision: "render-proof-r6" }, "configure-chart"],
    ["PLACEMENT_PROOF_DRIFT", { placementProofRevision: "placement-proof-r7" }, "destination"],
  ];

  for (const [code, dashboardPatch, stage] of cases) {
    const result = revalidateChartCreate(completeState(), currentDashboard(dashboardPatch));
    assert.equal(result.valid, false, code);
    assert.equal(result.transactionCandidate, null, code);
    assert.ok(result.errors.some((error) => error.code === code && error.stage === stage), code);
  }
});

test("commit serializes duplicate calls into one non-cancellable atomic persist", async () => {
  const candidate = transaction({ transaction: { transactionId: "tx-serialized" } });
  let release;
  let persistCalls = 0;
  const persisted = [];
  const persist = async (atomicTransaction, options) => {
    persistCalls += 1;
    persisted.push(atomicTransaction);
    assert.equal(options, undefined);
    await new Promise((resolve) => {
      release = resolve;
    });
    return { chartId: "chart-temperature", dashboardRevision: "dashboard-r8" };
  };

  const first = commitChartCreate(candidate, { persist });
  const duplicate = commitChartCreate(candidate, { persist });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(persistCalls, 1);
  assert.deepEqual(persisted, [candidate]);
  assert.deepEqual(persisted[0].companionProposals.map(({ id }) => id), ["proposal-linked"]);

  release();
  const [firstResult, duplicateResult] = await Promise.all([first, duplicate]);
  assert.deepEqual(duplicateResult, firstResult);
  assert.equal(firstResult.status, "committed");
});

test("commit reports revision conflict and deterministic retryable or terminal failures", async () => {
  const failures = [
    ["tx-conflict", { code: "REVISION_CONFLICT", message: "Dashboard changed.", retryable: true }],
    ["tx-retryable", { code: "NETWORK_UNAVAILABLE", message: "Try again.", retryable: true }],
    ["tx-terminal", { code: "INVALID_CHART", message: "Chart is invalid.", retryable: false }],
  ];

  for (const [transactionId, error] of failures) {
    const result = await commitChartCreate(transaction({ transaction: { transactionId } }), {
      persist: async () => ({ status: "failed", error }),
    });
    assert.deepEqual(result, { status: "failed", error });
  }
});

test("ambiguous commit must reconcile before retry and transaction IDs prevent duplicates", async () => {
  const candidate = transaction({ transaction: { transactionId: "tx-ambiguous-missing" } });
  let firstPersistCalls = 0;
  const ambiguous = await commitChartCreate(candidate, {
    persist: async () => {
      firstPersistCalls += 1;
      return { status: "ambiguous", reconciliationKey: "reconcile-17" };
    },
  });
  assert.deepEqual(ambiguous, {
    status: "ambiguous",
    transactionId: "tx-ambiguous-missing",
    reconciliationKey: "reconcile-17",
  });

  let blockedRetryCalls = 0;
  const blocked = await commitChartCreate(candidate, {
    persist: async () => {
      blockedRetryCalls += 1;
    },
  });
  assert.deepEqual(blocked, ambiguous);
  assert.equal(firstPersistCalls, 1);
  assert.equal(blockedRetryCalls, 0);

  const reconciledMissing = await reconcileChartCreateOutcome(ambiguous, {
    readByTransactionId: async (transactionId) => {
      assert.equal(transactionId, "tx-ambiguous-missing");
      return null;
    },
  });
  assert.equal(reconciledMissing.status, "failed");
  assert.equal(reconciledMissing.error.code, "COMMIT_NOT_FOUND");
  assert.equal(reconciledMissing.error.retryable, true);

  let retryCalls = 0;
  const retried = await commitChartCreate(candidate, {
    persist: async () => {
      retryCalls += 1;
      return { chartId: "chart-temperature", dashboardRevision: "dashboard-r8" };
    },
  });
  assert.equal(retried.status, "committed");
  assert.equal(retryCalls, 1);
});

test("reconciled success prevents duplicate persist and retains reviewed handoff", async () => {
  const candidate = transaction({ transaction: { transactionId: "tx-ambiguous-committed" } });
  const ambiguous = await commitChartCreate(candidate, {
    persist: async () => ({ status: "ambiguous", reconciliationKey: "reconcile-18" }),
  });
  const durable = {
    transactionId: "tx-ambiguous-committed",
    chartId: "chart-temperature",
    dashboardRevision: "dashboard-r8",
    destinationIdentity: candidate.destinationIdentity,
    priorScrollAnchor: candidate.chartRecord.createHandoff.priorScrollAnchor,
  };
  const reconciled = await reconcileChartCreateOutcome(ambiguous, {
    readByTransactionId: async () => durable,
  });

  assert.equal(reconciled.status, "committed");
  assert.equal(reconciled.handoff.reveal, "full-panel");
  assert.equal(reconciled.handoff.editorFocusId, "chart-editor-chart-temperature");
  assert.deepEqual(reconciled.handoff.priorScrollAnchor, { id: "chart-summary", offset: 28 });
  assert.deepEqual(reconciled.handoff.destinationIdentity, candidate.destinationIdentity);

  let duplicatePersistCalls = 0;
  const duplicate = await commitChartCreate(candidate, {
    persist: async () => {
      duplicatePersistCalls += 1;
    },
  });
  assert.deepEqual(duplicate, reconciled);
  assert.equal(duplicatePersistCalls, 0);
});

test("reload recovery restores committed identity and handoff, never the cleared draft", () => {
  const recovery = recoverCommittedChartCreate({
    status: "committed",
    chartId: "chart-temperature",
    dashboardRevision: "dashboard-r8",
    handoff: {
      destinationIdentity: {
        pageId: "page-overview",
        sectionId: "section-main",
        anchorId: "anchor-after-summary",
        placement: { column: 2, row: 3, width: 6, height: 4 },
      },
      reveal: "full-panel",
      editorFocusId: "chart-editor-chart-temperature",
      priorScrollAnchor: { id: "chart-summary", offset: 28 },
    },
    draft: completeState(),
  });

  assert.deepEqual(recovery, {
    chartId: "chart-temperature",
    dashboardRevision: "dashboard-r8",
    handoff: {
      destinationIdentity: {
        pageId: "page-overview",
        sectionId: "section-main",
        anchorId: "anchor-after-summary",
        placement: { column: 2, row: 3, width: 6, height: 4 },
      },
      reveal: "full-panel",
      editorFocusId: "chart-editor-chart-temperature",
      priorScrollAnchor: { id: "chart-summary", offset: 28 },
    },
    draft: null,
  });
});
