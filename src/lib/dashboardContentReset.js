const RUNTIME_CONTENT_KEYS = Object.freeze([
  "loadedData",
  "dataSourceStates",
  "runtimeContentHealth",
  "chartDataStates",
]);

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
