const COMPANION_KINDS = new Set(["new-chrono-group", "chart-fallback"]);
const DURABLE_OWNERS = new Set(["source", "saved-chrono-group"]);
const DURABLE_RESULTS = new Set(["committed", "cancelled", "failed"]);

export function createCompanionProposal({
  kind,
  proposalId,
  value,
  referenced = true,
  meaningful,
} = {}) {
  if (!COMPANION_KINDS.has(kind)) {
    throw new Error(`Unknown chart companion kind: ${String(kind)}`);
  }
  requiredId(proposalId, "Companion proposal id");
  const clonedValue = structuredClone(value ?? {});
  return {
    ownership: "chart-create",
    kind,
    proposalId,
    value: clonedValue,
    referenced: referenced === true,
    meaningful: meaningful ?? Object.keys(clonedValue).length > 0,
  };
}

export function createDurableRepairResult({
  ownership,
  objectId,
  committedRevision,
  transactionId,
  result,
} = {}) {
  if (!DURABLE_OWNERS.has(ownership)) {
    throw new Error(`Unknown durable repair owner: ${String(ownership)}`);
  }
  requiredId(objectId, "Durable repair object id");
  if (!DURABLE_RESULTS.has(result)) {
    throw new Error(`Unknown durable repair result: ${String(result)}`);
  }
  if (result === "committed") {
    requiredId(committedRevision, "Committed dependency revision");
    requiredId(transactionId, "Durable repair transaction id");
  }
  return Object.freeze({
    ownership,
    objectId,
    committedRevision: committedRevision ?? null,
    transactionId: transactionId ?? null,
    result,
  });
}

export function removeCompanionProposal(companions, proposalId, { confirmMeaningful = false } = {}) {
  const list = Array.isArray(companions) ? companions : [];
  const proposal = list.find((entry) => entry?.proposalId === proposalId);
  if (!proposal) {
    return { status: "not-found", companions: list, consequence: null };
  }
  if (proposal.meaningful === true && !confirmMeaningful) {
    return {
      status: "confirmation-required",
      companions: list,
      consequence: {
        code: "MEANINGFUL_COMPANION_REMOVAL",
        message: `Remove meaningful ${proposal.kind} proposal "${proposalId}" and its uncommitted work?`,
        proposalId,
      },
    };
  }
  return {
    status: "removed",
    companions: list.filter((entry) => entry !== proposal),
    consequence: null,
  };
}

export function isCompanionProposal(value) {
  return value?.ownership === "chart-create"
    && COMPANION_KINDS.has(value?.kind)
    && typeof value?.proposalId === "string";
}

export function isDurableRepairResult(value) {
  return DURABLE_OWNERS.has(value?.ownership)
    && DURABLE_RESULTS.has(value?.result)
    && typeof value?.objectId === "string";
}

function requiredId(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required.`);
  }
}
