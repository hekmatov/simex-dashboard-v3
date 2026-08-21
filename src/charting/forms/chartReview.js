const REVIEW_ITEMS = [
  ["destination-and-placement", "Destination and placement", "destination", (state) => ({
    ...state.destination,
  })],
  ["chart-type", "Chart type", "chart-type", (state) => state.chartType],
  ["source-profile-and-provenance", "Source, profile, and provenance", "data-source", (state) => state.source],
  ["mapping-and-preparation", "Mapping and preparation", "map-and-prepare-data", (state) => ({
    mapping: state.mapping,
    preparation: state.preparation,
  })],
  ["configuration", "Configuration", "configure-chart", (state) => state.configuration],
  ["render-proof", "Render proof", "configure-chart", (state) => state.renderProof],
  ["placement-proof", "Placement proof", "destination", (state) => state.placementProof],
  ["memberships", "Memberships", "map-and-prepare-data", (state) => state.memberships ?? []],
  ["companion-proposals", "Uncommitted companion proposals", "map-and-prepare-data", (state) => state.companionProposals ?? []],
  ["durable-repairs", "Committed durable repair dependencies", "map-and-prepare-data", (state) =>
    (state.durableRepairs ?? []).map(({ id, committedDependencyRevision }) => ({
      id,
      committedDependencyRevision,
    }))],
  ["warnings", "Warnings", "review-and-create", (state) => state.warnings ?? []],
  ["acknowledgements", "Acknowledgements", "review-and-create", (state) => state.acknowledgements ?? []],
];

function error(code, stage, message) {
  return { code, stage, message, retryable: false };
}

function findDestination(dashboard, destination) {
  const page = dashboard?.pages?.find(({ id }) => id === destination?.pageId);
  const section = page?.sections?.find(({ id }) => id === destination?.sectionId);
  const anchor = section?.anchors?.find(({ id }) => id === destination?.anchorId);
  return { page, section, anchor };
}

function referencedChartCreateProposals(state) {
  const referenced = new Set(state.referencedCompanionProposalIds ?? []);
  return (state.companionProposals ?? []).filter(
    ({ id, ownership }) => ownership === "chart-create" && referenced.has(id),
  );
}

function dependencyRevisions(state) {
  return Object.fromEntries(
    (state.durableRepairs ?? [])
      .filter(({ id, committedDependencyRevision }) => id && committedDependencyRevision)
      .map(({ id, committedDependencyRevision }) => [id, committedDependencyRevision]),
  );
}

export function buildChartReviewLedger(state) {
  return REVIEW_ITEMS.map(([id, label, stage, select]) => ({
    id,
    label,
    value: select(state),
    repair: { stage, focusId: `chart-create-${id}` },
  }));
}

export function revalidateChartCreate(state, currentDashboard) {
  const errors = [];
  const destination = findDestination(currentDashboard, state.destination);
  const currentSchema = currentDashboard?.chartSchemas?.[state.chartType?.id];
  const currentSource = currentDashboard?.sources?.[state.source?.id];

  if (currentDashboard?.revision !== state.expectedDashboardRevision) {
    errors.push(error("DASHBOARD_REVISION_DRIFT", "review-and-create", "The dashboard changed after review."));
  }
  if (!currentSchema || currentSchema.revision !== state.chartType?.schemaRevision) {
    errors.push(error("SCHEMA_REVISION_DRIFT", "chart-type", "The selected chart schema changed."));
  }
  if (
    !currentSource ||
    currentSource.revision !== state.source?.revision ||
    currentSource.profileRevision !== state.source?.profileRevision
  ) {
    errors.push(error("SOURCE_REVISION_DRIFT", "data-source", "The selected source or its profile changed."));
  }
  if (!destination.page || !destination.section) {
    errors.push(error("DESTINATION_MISSING", "destination", "The reviewed destination no longer exists."));
  } else if (!destination.anchor) {
    errors.push(error("ANCHOR_MISSING", "destination", "The reviewed placement anchor no longer exists."));
  }
  if (currentDashboard?.permissions?.revision !== state.expectedPermissionRevision) {
    errors.push(error("PERMISSION_REVISION_DRIFT", "destination", "The chart-create permission revision changed."));
  }
  if (currentDashboard?.permissions?.canCreateChart !== true) {
    errors.push(error("PERMISSION_DENIED", "destination", "Chart creation is no longer permitted here."));
  }
  if (
    state.renderProof?.status !== "valid" ||
    currentDashboard?.renderProofRevision !== state.renderProof?.revision
  ) {
    errors.push(error("RENDER_PROOF_DRIFT", "configure-chart", "The render proof is stale or invalid."));
  }
  if (
    state.placementProof?.status !== "valid" ||
    currentDashboard?.placementProofRevision !== state.placementProof?.revision
  ) {
    errors.push(error("PLACEMENT_PROOF_DRIFT", "destination", "The placement proof is stale or invalid."));
  }

  if (errors.length > 0) {
    return { valid: false, errors, transactionCandidate: null };
  }

  const destinationIdentity = {
    pageId: state.destination.pageId,
    sectionId: state.destination.sectionId,
    anchorId: state.destination.anchorId,
    placement: { ...state.destination.placement },
  };
  const chartRecord = {
    ...state.chartRecord,
    dependencyRevisions: dependencyRevisions(state),
    createHandoff: {
      destinationIdentity,
      priorScrollAnchor: state.priorScrollAnchor ?? null,
    },
  };

  return {
    valid: true,
    errors: [],
    transactionCandidate: {
      transactionId: state.transactionId,
      draftId: state.draftId,
      expectedDashboardRevision: state.expectedDashboardRevision,
      destinationIdentity,
      chartRecord,
      placementPatch: state.placementPatch,
      companionProposals: referencedChartCreateProposals(state),
    },
  };
}
