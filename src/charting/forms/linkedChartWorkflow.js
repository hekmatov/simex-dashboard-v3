import { reduceWizardState } from "./wizardDraft.js";
import {
  isCompanionProposal,
  isDurableRepairResult,
} from "./companionProposal.js";

const WORKFLOW_OWNERS = Object.freeze({
  "new-time-group": "chart-create",
  "chart-fallback": "chart-create",
  "source-repair": "source",
  "saved-time-group-repair": "saved-time-group",
});

export function suspendForLinkedWorkflow(state, {
  kind,
  invokerId,
  focusId,
  scrollTop = 0,
} = {}) {
  assertWizardState(state);
  const ownership = WORKFLOW_OWNERS[kind];
  if (!ownership) throw new Error(`Unknown linked chart workflow: ${String(kind)}`);
  const restoration = {
    stage: state.stage,
    invokerId: optionalId(invokerId),
    focusId: optionalId(focusId),
    scrollTop: Number.isFinite(scrollTop) && scrollTop >= 0 ? scrollTop : 0,
  };
  const suspended = reduceWizardState(state, { type: "suspend", restoration });
  return {
    ...suspended,
    linkedWorkflow: {
      kind,
      ownership,
      draftId: state.draftId,
      stage: state.stage,
      restoration,
    },
  };
}

export function returnFromLinkedWorkflow(state, outcome = {}) {
  assertWizardState(state);
  const linked = state.linkedWorkflow;
  if (!linked) throw new Error("No linked chart workflow is suspended.");
  const restoration = {
    invokerId: linked.restoration.invokerId,
    focusId: optionalId(outcome.currentIssueFocusId) ?? linked.restoration.focusId,
    scrollTop: linked.restoration.scrollTop,
  };
  let resumed = reduceWizardState(state, { type: "resume" });
  const { linkedWorkflow: _linkedWorkflow, ...withoutLinked } = resumed;
  resumed = {
    ...withoutLinked,
    stage: linked.stage,
    suspension: resumed.suspension
      ? {
          ...resumed.suspension,
          restoration: { ...resumed.suspension.restoration, focusId: restoration.focusId },
          resumeFocusId: restoration.focusId,
        }
      : null,
  };

  let durableRepairResult = null;
  if (outcome.result === "completed" && linked.ownership === "chart-create") {
    if (!isCompanionProposal(outcome.proposal) || outcome.proposal.kind !== linked.kind) {
      throw new Error(`Linked ${linked.kind} completion requires exactly one matching chart-owned proposal.`);
    }
    resumed = reduceWizardState(resumed, {
      type: "setCompanionOutcome",
      outcome: outcome.proposal,
    });
  } else if (linked.ownership !== "chart-create" && outcome.durableRepair) {
    if (!isDurableRepairResult(outcome.durableRepair)) {
      throw new Error("A durable linked workflow must return its owner's DurableRepairResult.");
    }
    if (outcome.durableRepair.ownership !== linked.ownership) {
      throw new Error("Durable repair ownership does not match the suspended workflow owner.");
    }
    durableRepairResult = outcome.durableRepair;
    if (outcome.durableRepair.result === "committed") {
      if (outcome.consequenceReviewed !== true) {
        throw new Error("A durable repair commit requires explicit consequence review.");
      }
      resumed = {
        ...resumed,
        dependencyRevisions: {
          ...(resumed.dependencyRevisions ?? {}),
          [`${outcome.durableRepair.ownership}:${outcome.durableRepair.objectId}`]: outcome.durableRepair.committedRevision,
        },
      };
    }
  }

  return {
    state: resumed,
    restoration,
    revalidationRequired: true,
    ...(durableRepairResult ? { durableRepairResult } : {}),
  };
}

function assertWizardState(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("Linked chart workflow requires wizard state.");
  }
  if (typeof state.draftId !== "string" || state.draftId.trim() === "") {
    throw new Error("Linked chart workflow requires an active chart draft identity.");
  }
}

function optionalId(value) {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}
