export function stageContentDraft(input = {}) {
  const draft = normalizeDraft(input);
  return freezeRecord({ ...draft, status: "staged" });
}

export function finalizeContentDraft(draft) {
  const normalized = normalizeExistingDraft(draft);
  return freezeRecord({ ...normalized, status: "completed" });
}

export function discardContentDraft(draft, { reason = "discarded" } = {}) {
  const normalized = normalizeExistingDraft(draft);
  requiredText(reason, "Content draft discard reason");
  return freezeRecord({ ...normalized, status: "discarded", reason: reason.trim() });
}

export function createContentDraftCoordinator({
  getDashboard,
  commitDashboard,
  assetStore,
  readSessionAsset = () => null,
  discardSessionAsset = () => false,
} = {}) {
  if (typeof getDashboard !== "function") throw new TypeError("Content draft dashboard reader is required.");
  if (typeof commitDashboard !== "function") throw new TypeError("Content draft dashboard commit is required.");
  if (!assetStore || typeof assetStore !== "object") throw new TypeError("Content draft asset store is required.");

  const drafts = new Map();
  const transactions = new Map();
  const listeners = new Set();
  let disposed = false;

  const coordinator = {
    stageDraft(input) {
      assertActive();
      const draft = stageContentDraft(input);
      if (drafts.has(draft.draftId)) throw new Error(`Content draft "${draft.draftId}" already exists.`);
      drafts.set(draft.draftId, draft);
      emit();
      return draft;
    },
    updateDraft(draftId, patch = {}) {
      assertActive();
      const current = requireDraft(draftId);
      if (patch.draftId !== undefined && patch.draftId !== current.draftId) {
        throw new Error("Content draft identity cannot change.");
      }
      const updated = stageContentDraft({ ...current, ...structuredClone(patch), draftId: current.draftId });
      drafts.set(current.draftId, updated);
      emit();
      return updated;
    },
    async commitDraft(draftId, { buildCandidate } = {}) {
      assertActive();
      if (typeof buildCandidate !== "function") throw new TypeError("Content draft candidate builder is required.");
      const draft = requireDraft(draftId);
      const previousDashboard = structuredClone(getDashboard());
      const transactionId = `content-draft:${draft.draftId}`;
      let candidateResult;
      let assetSnapshot = null;
      let internalTransactionStarted = false;
      const stagedAssetIds = [];
      try {
        assertDraftReadyForCommit(draft);
        if (transactions.has(transactionId)) {
          throw new Error(`Content transaction "${transactionId}" already exists.`);
        }
        candidateResult = normalizeCandidateResult(buildCandidate({
          dashboard: structuredClone(previousDashboard),
          draft: structuredClone(draft),
        }));
        transactions.set(transactionId, transactionRecord({
          transactionId,
          kind: draft.kind,
          status: "active",
          assetIds: candidateResult.commitAssetIds,
          mediaIds: draft.mediaIds,
          sourceIds: draft.sourceIds,
        }));
        internalTransactionStarted = true;
        drafts.set(draft.draftId, freezeRecord({ ...draft, status: "committing" }));
        emit();
        assetSnapshot = await assetStore.snapshot?.(candidateResult.commitAssetIds) ?? null;
        for (const assetId of candidateResult.commitAssetIds) {
          const sessionAsset = readSessionAsset(assetId);
          if (!sessionAsset) throw new Error(`Staged content asset "${assetId}" is missing.`);
          const staged = await assetStore.stage({
            ...structuredClone(sessionAsset),
            assetId,
            expectedAssetId: assetId,
            transactionId,
          });
          if (staged?.assetId !== assetId) throw new Error(`Staged content asset "${assetId}" identity changed.`);
          stagedAssetIds.push(assetId);
        }
        const committedDashboard = await commitDashboard(
          structuredClone(candidateResult.dashboard),
          { transactionId },
        );
        try {
          if (typeof assetStore.commitMany === "function") {
            await assetStore.commitMany(candidateResult.commitAssetIds, { transactionId });
          } else {
            for (const assetId of candidateResult.commitAssetIds) {
              await assetStore.commit(assetId, { transactionId });
            }
          }
        } catch (assetError) {
          const rollbackErrors = [];
          try {
            await commitDashboard(structuredClone(previousDashboard), { transactionId: `${transactionId}:rollback` });
          } catch (error) {
            rollbackErrors.push(error);
          }
          try {
            await restoreAssets(assetSnapshot, stagedAssetIds, transactionId);
          } catch (error) {
            rollbackErrors.push(error);
          }
          if (rollbackErrors.length > 0) {
            throw new AggregateError([assetError, ...rollbackErrors], "Content draft commit and compensation failed.");
          }
          throw assetError;
        }
        const cleanup = clearCompleted(draft, transactionId, candidateResult);
        return freezeRecord({
          dashboard: structuredClone(committedDashboard ?? candidateResult.dashboard),
          itemIds: candidateResult.itemIds,
          cleanup,
        });
      } catch (error) {
        const cleanupErrors = [];
        try {
          await restoreAssets(assetSnapshot, stagedAssetIds, transactionId);
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
        try {
          discardSessionIds(candidateResult
            ? [...candidateResult.commitAssetIds, ...candidateResult.discardAssetIds]
            : draft.assetIds);
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
        drafts.delete(draft.draftId);
        if (internalTransactionStarted) transactions.delete(transactionId);
        emit();
        if (cleanupErrors.length > 0) {
          throw new AggregateError([error, ...cleanupErrors], "Content draft failed and cleanup did not complete.");
        }
        throw error;
      }
    },
    async discardDraft(draftId, { reason = "discarded" } = {}) {
      const draft = requireDraft(draftId);
      discardContentDraft(draft, { reason });
      drafts.delete(draft.draftId);
      emit();
      await cleanupAssets(draft.assetIds, draft.draftId);
      return true;
    },
    async discardOwner(owner, { reason = "owner-discarded" } = {}) {
      requiredText(owner, "Content draft owner");
      const matching = [...drafts.values()]
        .filter((draft) => draft.owner === owner)
        .map((draft) => draft.draftId)
        .sort();
      for (const draftId of matching) await coordinator.discardDraft(draftId, { reason });
      return Object.freeze(matching);
    },
    beginTransaction(input = {}) {
      assertActive();
      const record = transactionRecord({ ...input, status: "active" });
      if (transactions.has(record.ownerId)) throw new Error(`Content transaction "${record.ownerId}" already exists.`);
      transactions.set(record.ownerId, record);
      emit();
      return record;
    },
    completeTransaction(transactionId) {
      requiredText(transactionId, "Content transaction id");
      const removed = transactions.delete(transactionId);
      if (removed) emit();
      return removed;
    },
    async failTransaction(transactionId, error) {
      requiredText(transactionId, "Content transaction id");
      const record = transactions.get(transactionId);
      if (!record) return false;
      transactions.delete(transactionId);
      emit();
      await cleanupAssets(record.assetIds, transactionId);
      if (error) return error;
      return true;
    },
    getActiveRetainers() {
      return retainerSnapshot(drafts, transactions);
    },
    subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("Content draft listener is required.");
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async dispose() {
      if (disposed) return false;
      disposed = true;
      const cleanupErrors = [];
      const draftRecords = [...drafts.values()];
      const transactionRecords = [...transactions.values()];
      drafts.clear();
      transactions.clear();
      emit();
      for (const record of [...draftRecords, ...transactionRecords]) {
        try {
          await cleanupAssets(record.assetIds, record.draftId ?? record.ownerId);
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
      listeners.clear();
      if (cleanupErrors.length > 0) throw new AggregateError(cleanupErrors, "Content draft disposal failed.");
      return true;
    },
  };
  return Object.freeze(coordinator);

  function assertActive() {
    if (disposed) throw new Error("Content draft coordinator is disposed.");
  }

  function requireDraft(draftId) {
    requiredText(draftId, "Content draft id");
    const draft = drafts.get(draftId);
    if (!draft) throw new Error(`Unknown content draft "${draftId}".`);
    return draft;
  }

  function emit() {
    const snapshot = retainerSnapshot(drafts, transactions);
    for (const listener of listeners) listener(snapshot);
  }

  async function cleanupAssets(assetIds, transactionId) {
    const errors = [];
    for (const assetId of uniqueSorted(assetIds)) {
      try {
        await assetStore.rollback?.(assetId, { transactionId });
      } catch (error) {
        errors.push(error);
      }
      try {
        discardSessionAsset(assetId);
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length > 0) throw new AggregateError(errors, "Content draft asset cleanup failed.");
  }

  async function restoreAssets(snapshot, stagedAssetIds, transactionId) {
    if (snapshot && typeof assetStore.restore === "function") {
      await assetStore.restore(snapshot);
      return;
    }
    for (const assetId of [...stagedAssetIds].reverse()) {
      await assetStore.rollback?.(assetId, { transactionId });
    }
  }

  function discardSessionIds(assetIds) {
    for (const assetId of uniqueSorted(assetIds)) discardSessionAsset(assetId);
  }

  function clearCompleted(draft, transactionId, candidateResult) {
    drafts.delete(draft.draftId);
    transactions.delete(transactionId);
    const failedAssetIds = [];
    const errors = [];
    for (const assetId of uniqueSorted([...candidateResult.commitAssetIds, ...candidateResult.discardAssetIds])) {
      try {
        discardSessionAsset(assetId);
      } catch (error) {
        failedAssetIds.push(assetId);
        errors.push(error);
      }
    }
    let cleanupTransactionId = null;
    if (failedAssetIds.length > 0) {
      cleanupTransactionId = availableInternalId(`${transactionId}:session-cleanup`);
      transactions.set(cleanupTransactionId, transactionRecord({
        transactionId: cleanupTransactionId,
        kind: "post-commit-session-cleanup",
        status: "cleanup-required",
        assetIds: failedAssetIds,
        mediaIds: [],
        sourceIds: [],
      }));
    }
    emit();
    return freezeRecord({
      status: errors.length > 0 ? "cleanup-required" : "complete",
      transactionId: cleanupTransactionId,
      assetIds: failedAssetIds,
      errors: errors.map((error) => error?.message ?? String(error)),
    });
  }

  function availableInternalId(base) {
    let candidate = base;
    let suffix = 2;
    while (transactions.has(candidate)) candidate = `${base}:${suffix++}`;
    return candidate;
  }
}

function assertDraftReadyForCommit(draft) {
  if (draft.owner === "manager") return;
  const payload = draft.payload;
  const staticFinalized = (draft.owner === "image" || draft.owner === "qmd")
    && payload?.destination && payload?.panel && payload?.placement
    && payload?.assets && Array.isArray(payload?.stagedAssetIds);
  const chartFinalized = draft.owner === "chart" && payload?.chart && typeof payload.chart === "object";
  if (!staticFinalized && !chartFinalized) {
    throw new Error(`${draft.owner} content must be finalized before publication.`);
  }
}

function normalizeDraft(input) {
  record(input, "Content draft");
  const draftId = requiredText(input.draftId, "Content draft id");
  const owner = requiredText(input.owner, "Content draft owner");
  const kind = requiredText(input.kind, "Content draft kind");
  return {
    draftId,
    owner,
    kind,
    payload: structuredClone(input.payload ?? {}),
    assetIds: uniqueSorted(input.assetIds),
    mediaIds: uniqueSorted(input.mediaIds),
    sourceIds: uniqueSorted(input.sourceIds),
  };
}

function normalizeExistingDraft(draft) {
  const normalized = normalizeDraft(draft);
  return { ...normalized, status: draft.status ?? "staged" };
}

function normalizeCandidateResult(value) {
  record(value, "Content draft candidate");
  record(value.dashboard, "Content draft candidate dashboard");
  return freezeRecord({
    dashboard: structuredClone(value.dashboard),
    commitAssetIds: uniqueSorted(value.commitAssetIds),
    discardAssetIds: uniqueSorted(value.discardAssetIds),
    itemIds: uniqueSorted(value.itemIds),
  });
}

function transactionRecord(input) {
  const transactionId = requiredText(input.transactionId, "Content transaction id");
  return freezeRecord({
    ownerId: transactionId,
    kind: requiredText(input.kind, "Content transaction kind"),
    status: input.status ?? "active",
    assetIds: uniqueSorted(input.assetIds),
    mediaIds: uniqueSorted(input.mediaIds),
    sourceIds: uniqueSorted(input.sourceIds),
  });
}

function retainerSnapshot(drafts, transactions) {
  const records = [
    ...[...drafts.values()].map((draft) => ({
      ownerId: draft.draftId,
      kind: draft.kind,
      status: draft.status,
      assetIds: draft.assetIds,
      mediaIds: draft.mediaIds,
      sourceIds: draft.sourceIds,
    })),
    ...transactions.values(),
  ].sort((left, right) => left.ownerId.localeCompare(right.ownerId));
  return freezeRecord({
    assetIds: uniqueSorted(records.flatMap((record) => record.assetIds)),
    mediaIds: uniqueSorted(records.flatMap((record) => record.mediaIds)),
    sourceIds: uniqueSorted(records.flatMap((record) => record.sourceIds)),
    records,
  });
}

function uniqueSorted(values) {
  if (values === undefined) return [];
  if (!Array.isArray(values)) throw new TypeError("Content draft retained ids must be arrays.");
  return [...new Set(values.map((value) => requiredText(value, "Content draft retained id")))].sort();
}

function record(value, description) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${description} must be an object.`);
  return value;
}

function requiredText(value, description) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${description} is required.`);
  return value.trim();
}

function freezeRecord(value) {
  const clone = structuredClone(value);
  return deepFreeze(clone);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || ArrayBuffer.isView(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
