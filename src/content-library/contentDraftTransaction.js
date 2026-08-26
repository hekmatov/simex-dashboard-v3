import { isFinalizedWizardResult } from "../charting/forms/wizardDraft.js";
import { isFinalizedStaticContentResult } from "../static-content/forms/staticContentDraft.js";
import { prepareStaticPanelTransaction } from "../static-content/staticPanelTransaction.js";

export function createDeferredCoordinatorDisposal({ schedule = queueMicrotask } = {}) {
  if (typeof schedule !== "function") throw new TypeError("Content draft disposal scheduler is required.");
  let generation = 0;
  return Object.freeze({
    retain(coordinator) {
      if (!coordinator || typeof coordinator.dispose !== "function") {
        throw new TypeError("Content draft coordinator disposal requires a coordinator.");
      }
      const retainedGeneration = ++generation;
      let released = false;
      return () => {
        if (released) return false;
        released = true;
        schedule(() => {
          if (generation === retainedGeneration) void coordinator.dispose();
        });
        return true;
      };
    },
  });
}

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

export function buildStaticPanelContentDraftCandidate({
  dashboard,
  draft,
  operation = "create",
  panelId,
  pendingMediaItems = {},
  pendingAssets = {},
} = {}) {
  record(dashboard, "Static content draft dashboard");
  record(draft, "Static content coordinator draft");
  const payload = draft.payload;
  record(payload, "Finalized static content payload");
  const base = structuredClone(dashboard);
  base.contentLibrary = base.contentLibrary ?? { mediaItems: {}, sourceEntries: {} };
  base.contentLibrary.mediaItems = {
    ...(base.contentLibrary.mediaItems ?? {}),
    ...structuredClone(pendingMediaItems),
  };
  base.assets = {
    ...(base.assets ?? {}),
    ...structuredClone(pendingAssets),
  };
  const prepared = prepareStaticPanelTransaction({
    dashboard: base,
    operation,
    panelId,
    destination: payload.destination,
    panel: payload.panel,
    placement: payload.placement,
    mediaItem: payload.placement?.kind === "staticImage" ? payload.mediaItem : null,
    assets: payload.placement?.kind === "staticImage" ? payload.assets : {},
    stagedAssetIds: payload.placement?.kind === "staticImage" ? payload.stagedAssetIds : [],
  });
  const commitAssetIds = uniqueSorted([
    ...(payload.stagedAssetIds ?? []),
    ...Object.values(pendingMediaItems)
      .map((item) => item?.current?.kind === "asset" ? item.current.assetId : null)
      .filter(Boolean),
  ]);
  return freezeRecord({
    dashboard: prepared.candidateDashboard,
    commitAssetIds,
    discardAssetIds: [],
    itemIds: uniqueSorted([
      ...Object.keys(pendingMediaItems),
      payload.mediaItem?.mediaId,
      payload.panel?.id,
    ].filter(Boolean)),
  });
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
  const finalizedDraftIds = new Set();
  const listeners = new Set();
  let disposed = false;

  const coordinator = {
    stageDraft(input) {
      assertActive();
      const finalized = isAuthoringPayloadFinalized(input?.owner, input?.payload);
      const draft = stageContentDraft(input);
      if (drafts.has(draft.draftId)) throw new Error(`Content draft "${draft.draftId}" already exists.`);
      drafts.set(draft.draftId, draft);
      if (finalized) finalizedDraftIds.add(draft.draftId);
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
      if (Object.hasOwn(patch, "payload") || Object.hasOwn(patch, "owner")) {
        if (isAuthoringPayloadFinalized(updated.owner, patch.payload)) finalizedDraftIds.add(current.draftId);
        else finalizedDraftIds.delete(current.draftId);
      }
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
        assertDraftReadyForCommit(draft, finalizedDraftIds);
        if (transactions.has(transactionId)) {
          throw new Error(`Content transaction "${transactionId}" already exists.`);
        }
        candidateResult = normalizeCandidateResult(buildCandidate({
          dashboard: structuredClone(previousDashboard),
          draft: structuredClone(draft),
        }));
        coordinator.beginTransaction({
          transactionId,
          kind: draft.kind,
          assetIds: uniqueSorted([
            ...draft.assetIds,
            ...candidateResult.commitAssetIds,
            ...candidateResult.discardAssetIds,
          ]),
          mediaIds: draft.mediaIds,
          sourceIds: draft.sourceIds,
        });
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
        const durableCandidateDashboard = promoteCommittedAssetManifests(
          candidateResult.dashboard,
          candidateResult.commitAssetIds,
        );
        const committedDashboard = await commitDashboard(
          durableCandidateDashboard,
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
        coordinator.completeTransaction(transactionId);
        return freezeRecord({
          dashboard: structuredClone(committedDashboard ?? durableCandidateDashboard),
          itemIds: candidateResult.itemIds,
          cleanup,
        });
      } catch (error) {
        const cleanupErrors = [];
        if (candidateResult) {
          try {
            const currentDashboard = structuredClone(getDashboard());
            if (JSON.stringify(currentDashboard) !== JSON.stringify(previousDashboard)) {
              await commitDashboard(structuredClone(previousDashboard), { transactionId, rollback: true });
            }
          } catch (cleanupError) {
            cleanupErrors.push(cleanupError);
          }
        }
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
        finalizedDraftIds.delete(draft.draftId);
        if (internalTransactionStarted) {
          try {
            await coordinator.failTransaction(transactionId, error);
          } catch (cleanupError) {
            cleanupErrors.push(cleanupError);
          }
        }
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
      finalizedDraftIds.delete(draft.draftId);
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
      finalizedDraftIds.clear();
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
    finalizedDraftIds.delete(draft.draftId);
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

function assertDraftReadyForCommit(draft, finalizedDraftIds) {
  if (draft.owner === "manager") return;
  if (!finalizedDraftIds.has(draft.draftId)) {
    throw new Error(`${draft.owner} content must be finalized before publication.`);
  }
}

function isAuthoringPayloadFinalized(owner, payload) {
  if (owner === "chart") return isFinalizedWizardResult(payload);
  if (owner === "image" || owner === "qmd" || owner === "qmd-panel") return isFinalizedStaticContentResult(payload);
  return false;
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

function promoteCommittedAssetManifests(dashboard, assetIds) {
  const candidate = structuredClone(dashboard);
  for (const assetId of assetIds) {
    if (candidate.assets?.[assetId]) {
      candidate.assets[assetId] = { ...candidate.assets[assetId], storageState: "durable" };
    }
  }
  return candidate;
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
