import { recordChartCreateReconciliation } from "./chartCreateTransaction.js";

export async function reconcileChartCreateOutcome(result, { readByTransactionId }) {
  if (result?.status !== "ambiguous") return result;

  const durableRecord = await readByTransactionId(result.transactionId);
  const committed = recordChartCreateReconciliation(result.transactionId, durableRecord);
  if (committed) return committed;

  return {
    status: "failed",
    error: {
      code: "COMMIT_NOT_FOUND",
      message: "No committed chart exists for this transaction ID; the transaction may now be retried.",
      retryable: true,
    },
  };
}

export function recoverCommittedChartCreate(record) {
  if (record?.status !== "committed" || !record.chartId || !record.handoff) return null;
  return {
    chartId: record.chartId,
    dashboardRevision: record.dashboardRevision,
    handoff: record.handoff,
    draft: null,
  };
}
