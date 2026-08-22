import { commitChartCreate } from "./chartCreateTransaction.js";
import { revalidateChartCreate } from "./chartReview.js";

const SESSION_REVISION = "session-current";

export function createChartCreateSnapshot({
  transactionId,
  draftId,
  finalized,
  destination,
  dashboardRevision,
  permissionRevision,
  schemaRevision,
  source,
  renderProof,
  placementProof,
  priorScrollAnchor = null,
} = {}) {
  if (!finalized?.chart?.id) throw new Error("A finalized chart payload is required.");
  const chart = finalized.chart;
  const anchorId = destination?.anchorId ?? "append";
  const resolvedDestination = {
    pageId: destination?.pageId,
    sectionId: destination?.sectionId,
    anchorId,
    placement: {
      relation: destination?.relation ?? "append",
      footprint: destination?.footprint ?? "standard",
    },
  };
  const revisions = {
    dashboard: dashboardRevision ?? SESSION_REVISION,
    permission: permissionRevision ?? SESSION_REVISION,
    schema: schemaRevision ?? chart.version ?? SESSION_REVISION,
    source: source?.revision ?? SESSION_REVISION,
    profile: source?.profileRevision ?? SESSION_REVISION,
    render: renderProof?.revision ?? SESSION_REVISION,
    placement: placementProof?.revision ?? placementRevision(resolvedDestination),
  };
  const reviewState = {
    transactionId,
    draftId: draftId ?? chart.id,
    expectedDashboardRevision: revisions.dashboard,
    expectedPermissionRevision: revisions.permission,
    destination: resolvedDestination,
    chartType: { id: chart.typeId, schemaRevision: revisions.schema },
    source: {
      id: source?.id ?? chart.sourceId,
      revision: revisions.source,
      profileRevision: revisions.profile,
    },
    renderProof: { ...renderProof, revision: revisions.render },
    placementProof: { ...placementProof, revision: revisions.placement },
    chartRecord: {
      ...structuredClone(chart),
      creationPayload: structuredClone(finalized),
    },
    placementPatch: {
      destination: structuredClone(resolvedDestination),
    },
    priorScrollAnchor,
  };
  const currentDashboard = {
    revision: revisions.dashboard,
    permissions: { revision: revisions.permission, canCreateChart: true },
    chartSchemas: { [chart.typeId]: { revision: revisions.schema } },
    sources: {
      [reviewState.source.id]: {
        revision: revisions.source,
        profileRevision: revisions.profile,
      },
    },
    renderProofRevision: revisions.render,
    placementProofRevision: revisions.placement,
    pages: [{
      id: resolvedDestination.pageId,
      sections: [{
        id: resolvedDestination.sectionId,
        anchors: [{ id: anchorId }],
      }],
    }],
  };
  return { reviewState, currentDashboard };
}

export async function executeChartCreate(snapshot, { persist } = {}) {
  if (typeof persist !== "function") {
    throw new TypeError("Chart creation requires a persistence function.");
  }
  const validation = revalidateChartCreate(
    snapshot.reviewState,
    snapshot.currentDashboard,
  );
  if (!validation.valid) {
    return { status: "validation-failed", errors: validation.errors };
  }
  return commitChartCreate(validation.transactionCandidate, {
    persist: async (transaction) => {
      const persisted = await persist(transaction.chartRecord.creationPayload);
      return {
        chartId: transaction.chartRecord.id,
        dashboardRevision: persisted?.dashboardRevision
          ?? snapshot.currentDashboard.revision,
        ...(persisted?.handoff ? { handoff: persisted.handoff } : {}),
      };
    },
  });
}

function placementRevision(destination) {
  return [
    "placement",
    destination.pageId ?? "missing-page",
    destination.sectionId ?? "missing-section",
    destination.anchorId,
    destination.placement.relation,
    destination.placement.footprint,
  ].join(":");
}
