import assert from "node:assert/strict";
import test from "node:test";

import {
  createCompanionProposal,
  createDurableRepairResult,
  removeCompanionProposal,
} from "../src/charting/forms/companionProposal.js";
import {
  returnFromLinkedWorkflow,
  suspendForLinkedWorkflow,
} from "../src/charting/forms/linkedChartWorkflow.js";
import { createWizardState, reduceWizardState } from "../src/charting/forms/wizardDraft.js";

test("new-Chrono-Group cancel suspends and returns the unchanged chart draft with full restoration", () => {
  const original = wizardFixture();
  const before = structuredClone(original);
  const suspended = suspendForLinkedWorkflow(original, {
    kind: "new-chrono-group",
    invokerId: "create-new-chrono-group",
    focusId: "chrono-group-membership-list",
    scrollTop: 618,
  });
  assert.deepEqual(original, before);
  assert.equal(suspended.draftId, original.draftId);
  assert.equal(suspended.stage, "map-and-prepare-data");
  assert.deepEqual(suspended.mapping, original.mapping);
  assert.equal(suspended.linkedWorkflow.ownership, "chart-create");

  const returned = returnFromLinkedWorkflow(suspended, { result: "cancelled" });
  assert.equal(returned.revalidationRequired, true);
  assert.deepEqual(returned.restoration, {
    invokerId: "create-new-chrono-group",
    focusId: "chrono-group-membership-list",
    scrollTop: 618,
  });
  assert.equal(returned.state.draftId, original.draftId);
  assert.equal(returned.state.stage, original.stage);
  assert.deepEqual(returned.state.mapping, original.mapping);
  assert.deepEqual(returned.state.companions, []);
});

test("linked new group and chart fallback completion return exactly one uncommitted chart-owned proposal", () => {
  for (const kind of ["new-chrono-group", "chart-fallback"]) {
    const original = wizardFixture();
    const suspended = suspendForLinkedWorkflow(original, {
      kind,
      invokerId: `${kind}-button`,
      focusId: `${kind}-issue`,
      scrollTop: 402,
    });
    const proposal = createCompanionProposal({
      kind,
      proposalId: `${kind}-proposal-1`,
      value: kind === "new-chrono-group"
        ? { id: "group-new", name: "Prepared response" }
        : { groupId: "winter", chartId: "chart-draft-1", policy: "Snap to Latest" },
      referenced: true,
      meaningful: true,
    });
    const returned = returnFromLinkedWorkflow(suspended, {
      result: "completed",
      proposal,
    });
    assert.equal(returned.state.draftId, original.draftId);
    assert.equal(returned.state.stage, original.stage);
    assert.equal(returned.state.companions.length, 1);
    assert.deepEqual(returned.state.companions[0], proposal);
    assert.equal(returned.state.companions[0].ownership, "chart-create");
    assert.equal(returned.state.companions[0].committedRevision, undefined);
    assert.equal(returned.revalidationRequired, true);
  }
});

test("linked completion restores current issue focus when revalidation supersedes the invoker", () => {
  const suspended = suspendForLinkedWorkflow(wizardFixture(), {
    kind: "chart-fallback",
    invokerId: "repair-fallback",
    focusId: "membership-winter",
    scrollTop: 355,
  });
  const returned = returnFromLinkedWorkflow(suspended, {
    result: "completed",
    proposal: createCompanionProposal({
      kind: "chart-fallback",
      proposalId: "fallback-1",
      value: { groupId: "winter", chartId: "chart-draft-1", policy: "Snap to Latest" },
    }),
    currentIssueFocusId: "membership-executive-repair",
  });
  assert.equal(returned.restoration.focusId, "membership-executive-repair");
  assert.equal(returned.state.stage, "map-and-prepare-data");
});

test("shared-source and saved-Chrono-Group repair remain durable owner transactions, never companions", () => {
  for (const fixture of [
    {
      kind: "source-repair",
      repair: createDurableRepairResult({
        ownership: "source",
        objectId: "source-observations",
        committedRevision: "source:8",
        transactionId: "tx-source-8",
        result: "committed",
      }),
    },
    {
      kind: "saved-chrono-group-repair",
      repair: createDurableRepairResult({
        ownership: "saved-chrono-group",
        objectId: "winter",
        committedRevision: "group:12",
        transactionId: "tx-group-12",
        result: "committed",
      }),
    },
  ]) {
    const original = wizardFixture();
    const suspended = suspendForLinkedWorkflow(original, {
      kind: fixture.kind,
      invokerId: `${fixture.kind}-button`,
      focusId: `${fixture.kind}-issue`,
      scrollTop: 220,
    });
    assert.equal(suspended.linkedWorkflow.ownership, fixture.repair.ownership);
    const returned = returnFromLinkedWorkflow(suspended, {
      result: "completed",
      durableRepair: fixture.repair,
      consequenceReviewed: true,
    });
    assert.deepEqual(returned.durableRepairResult, fixture.repair);
    assert.deepEqual(returned.state.companions, []);
    assert.equal(
      returned.state.dependencyRevisions[`${fixture.repair.ownership}:${fixture.repair.objectId}`],
      fixture.repair.committedRevision,
    );
    assert.equal(returned.revalidationRequired, true);

    const discardedChart = reduceWizardState(returned.state, { type: "discard" });
    assert.equal(discardedChart.discarded, true);
    assert.equal(fixture.repair.result, "committed");
    assert.equal(fixture.repair.transactionId.startsWith("tx-"), true);
  }
});

test("cancelled durable repairs change neither draft nor dependency revision", () => {
  const original = wizardFixture();
  const suspended = suspendForLinkedWorkflow(original, {
    kind: "saved-chrono-group-repair",
    invokerId: "repair-group",
    focusId: "group-winter-issue",
    scrollTop: 144,
  });
  const cancelled = returnFromLinkedWorkflow(suspended, {
    result: "cancelled",
    durableRepair: createDurableRepairResult({
      ownership: "saved-chrono-group",
      objectId: "winter",
      committedRevision: null,
      transactionId: null,
      result: "cancelled",
    }),
  });
  assert.equal(cancelled.state.draftId, original.draftId);
  assert.deepEqual(cancelled.state.mapping, original.mapping);
  assert.deepEqual(cancelled.state.dependencyRevisions ?? {}, {});
  assert.deepEqual(cancelled.state.companions, []);
});

test("meaningful companion removal requires a named consequence while pristine removal is immediate", () => {
  const meaningful = createCompanionProposal({
    kind: "new-chrono-group",
    proposalId: "group-proposal",
    value: { id: "new-group", name: "Prepared response" },
    referenced: false,
    meaningful: true,
  });
  const pristine = createCompanionProposal({
    kind: "chart-fallback",
    proposalId: "fallback-pristine",
    value: {},
    referenced: false,
    meaningful: false,
  });
  const companions = [meaningful, pristine];

  const blocked = removeCompanionProposal(companions, "group-proposal");
  assert.equal(blocked.status, "confirmation-required");
  assert.equal(blocked.consequence.code, "MEANINGFUL_COMPANION_REMOVAL");
  assert.deepEqual(blocked.companions, companions);

  const removedPristine = removeCompanionProposal(companions, "fallback-pristine");
  assert.equal(removedPristine.status, "removed");
  assert.deepEqual(removedPristine.companions.map(({ proposalId }) => proposalId), ["group-proposal"]);

  const confirmed = removeCompanionProposal(companions, "group-proposal", { confirmMeaningful: true });
  assert.equal(confirmed.status, "removed");
  assert.deepEqual(confirmed.companions.map(({ proposalId }) => proposalId), ["fallback-pristine"]);
});

function wizardFixture() {
  return createWizardState({
    draftId: "chart-draft-1",
    stage: "map-and-prepare-data",
    dashboardRevision: "dashboard:7",
    destination: { pageId: "biomedical", sectionId: "surveillance" },
    chartTypeId: "line",
    profileRevision: "observations:7",
    mapping: { measurements: ["cases"], observation: "date" },
    preparation: {
      chronoGroupMemberships: [{ groupId: "winter", timeField: "date" }],
    },
    companions: [],
  });
}
