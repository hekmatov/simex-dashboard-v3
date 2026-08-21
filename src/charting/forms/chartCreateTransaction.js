const transactionRegistry = new Map();

function failure(error) {
  return {
    status: "failed",
    error: {
      code: error?.code ?? "PERSIST_FAILED",
      message: error?.message ?? "The chart could not be created.",
      retryable: error?.retryable === true,
    },
  };
}

function handoffFor(transaction, persisted) {
  const reviewed = transaction.chartRecord?.createHandoff ?? {};
  const chartId = persisted.chartId ?? transaction.chartRecord?.id;
  return {
    chartId,
    destinationIdentity: reviewed.destinationIdentity ?? transaction.destinationIdentity,
    reveal: "full-panel",
    editorFocusId: `chart-editor-${chartId}`,
    priorScrollAnchor: reviewed.priorScrollAnchor ?? null,
    ...(persisted.handoff ?? {}),
  };
}

function committedResult(transaction, persisted) {
  return {
    status: "committed",
    chartId: persisted.chartId ?? transaction.chartRecord?.id,
    dashboardRevision: persisted.dashboardRevision,
    handoff: handoffFor(transaction, persisted),
  };
}

async function persistTransaction(transaction, persist) {
  try {
    const persisted = await persist(transaction);
    if (persisted?.status === "ambiguous") {
      return {
        status: "ambiguous",
        transactionId: transaction.transactionId,
        reconciliationKey: persisted.reconciliationKey ?? transaction.transactionId,
      };
    }
    if (persisted?.status === "failed") {
      return failure(persisted.error);
    }
    if (!persisted || (!persisted.chartId && !transaction.chartRecord?.id)) {
      return failure({
        code: "INVALID_PERSIST_RESULT",
        message: "Persistence did not return a committed chart identity.",
        retryable: false,
      });
    }
    return committedResult(transaction, persisted);
  } catch (caught) {
    if (caught?.ambiguous === true || caught?.code === "AMBIGUOUS_COMMIT") {
      return {
        status: "ambiguous",
        transactionId: transaction.transactionId,
        reconciliationKey: caught.reconciliationKey ?? transaction.transactionId,
      };
    }
    return failure(caught);
  }
}

export function commitChartCreate(transaction, { persist }) {
  const existing = transactionRegistry.get(transaction.transactionId);
  if (existing) {
    return existing.promise ?? Promise.resolve(existing.result);
  }

  const entry = { transaction, promise: null, result: null };
  entry.promise = Promise.resolve()
    .then(() => persistTransaction(transaction, persist))
    .then((result) => {
      entry.promise = null;
      entry.result = result;
      if (result.status === "failed") {
        transactionRegistry.delete(transaction.transactionId);
      }
      return result;
    });
  transactionRegistry.set(transaction.transactionId, entry);
  return entry.promise;
}

export function recordChartCreateReconciliation(transactionId, durableRecord) {
  const entry = transactionRegistry.get(transactionId);
  if (!entry) return null;

  if (!durableRecord) {
    transactionRegistry.delete(transactionId);
    return null;
  }

  const result = committedResult(entry.transaction, durableRecord);
  entry.promise = null;
  entry.result = result;
  return result;
}
