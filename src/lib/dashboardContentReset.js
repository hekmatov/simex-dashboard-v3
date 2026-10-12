const RUNTIME_CONTENT_KEYS = Object.freeze([
  "loadedData",
  "dataSourceStates",
  "runtimeContentHealth",
  "chartDataStates",
]);

export async function discardBuildSessionDrafts(coordinator) {
  const warnings = [];
  for (const owner of ["manager", "qmd", "qmd-panel", "image", "chart"]) {
    const maximumAttempts = coordinator.getActiveRetainers().records.length + 1;
    for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
      const before = new Set(coordinator.getActiveRetainers().records.map(({ ownerId }) => ownerId));
      try {
        await coordinator.discardOwner(owner, { reason: "build-baseline-restoration" });
        break;
      } catch (error) {
        // discardOwner stops on an asset failure after retiring that draft.
        // Drain its remaining drafts while cleanup makes measurable progress.
        warnings.push({ owner, message: error?.message ?? "Draft asset cleanup failed." });
        const after = new Set(coordinator.getActiveRetainers().records.map(({ ownerId }) => ownerId));
        if (![...before].some((id) => !after.has(id))) break;
      }
    }
  }
  return warnings;
}

export function createBlankDashboardContent(dashboard = {}) {
  const blank = structuredClone(dashboard);
  blank.pages = [];
  blank.home = { enabled: true };
  blank.dataSources = {};
  blank.datasetProfiles = {};
  blank.contentLibrary = { mediaItems: {}, sourceEntries: {} };
  blank.assets = {};
  blank.chronoGroups = [];
  blank.scenes = [];
  for (const key of RUNTIME_CONTENT_KEYS) delete blank[key];
  return blank;
}

export function summarizeDashboardContent(dashboard = {}) {
  return {
    pages: (dashboard.pages ?? []).length,
    charts: (dashboard.pages ?? []).reduce((pageTotal, page) => (
      pageTotal + (page.sections ?? []).reduce((sectionTotal, section) => (
        sectionTotal + (section.panels ?? []).length
      ), 0)
    ), 0),
    sources: Object.keys(dashboard.dataSources ?? {}).length,
    chronoGroups: (dashboard.chronoGroups ?? []).length,
    scenes: (dashboard.scenes ?? []).length,
  };
}
