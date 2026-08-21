export async function commitDashboardPackageImport({
  candidate,
  prepare,
  replace,
  rebase,
}) {
  await prepare();
  const committed = await replace(candidate.config);
  rebase(committed);
  return committed;
}

export function createImportedRendererDraftState(dashboard) {
  return {
    dashboardDraft: {
      programLabel: dashboard?.programLabel ?? "",
      scenarioLabel: dashboard?.scenarioLabel ?? "",
      lastUpdated: dashboard?.lastUpdated ?? "",
    },
    pageDrafts: {},
    sectionDrafts: {},
  };
}
