export const SHIPPED_CASE_SOURCE_ID = "upload-cases-wcph-eldoria-3";
export const SHIPPED_CASE_CHART_ID = "chart-line-mtgz6v76";
export const IMPORTED_CASE_SOURCE_ID = "external_cases";
export const IMPORTED_CASE_CHART_ID = "external_cases_chart";
export const IMPORTED_CASE_LABEL = "Imported exercise cases";

export function importedCaseParts(dashboard, profiles) {
  const source = structuredClone(dashboard.dataSources[SHIPPED_CASE_SOURCE_ID]);
  const profile = structuredClone(profiles[SHIPPED_CASE_SOURCE_ID]);
  const sourceEntry = structuredClone(
    dashboard.contentLibrary.sourceEntries[SHIPPED_CASE_SOURCE_ID],
  );
  const page = dashboard.pages.find(({ id }) => id === "biomedical");
  const section = page.sections.find(({ panels }) => panels.some(({ id }) => (
    id === SHIPPED_CASE_CHART_ID
  )));
  const chart = structuredClone(section.panels.find(({ id }) => (
    id === SHIPPED_CASE_CHART_ID
  )));
  return {
    source: { ...source, provenance: { label: IMPORTED_CASE_LABEL } },
    profile: {
      ...profile,
      sourceId: IMPORTED_CASE_SOURCE_ID,
      provenance: { label: IMPORTED_CASE_LABEL },
    },
    sourceEntry: {
      ...sourceEntry,
      sourceId: IMPORTED_CASE_SOURCE_ID,
      displayName: IMPORTED_CASE_LABEL,
    },
    page,
    section,
    chart,
  };
}

export function replacementCaseBundle(dashboard, profiles) {
  const { source, profile, sourceEntry, page, section, chart } = importedCaseParts(
    dashboard,
    profiles,
  );
  const config = {
    ...structuredClone(dashboard),
    id: "replacement-dashboard",
    programLabel: "Imported replacement",
    contentLibrary: {
      mediaItems: {},
      sourceEntries: { [IMPORTED_CASE_SOURCE_ID]: sourceEntry },
    },
    dataSources: { [IMPORTED_CASE_SOURCE_ID]: source },
    datasetProfiles: { [IMPORTED_CASE_SOURCE_ID]: profile },
    chronoGroups: [],
    scenes: [],
    pages: [{
      ...structuredClone(page),
      id: "replacement",
      title: "Replacement",
      sections: [{
        ...structuredClone(section),
        id: "replacement-overview",
        title: "Overview",
        panels: [{
          ...chart,
          id: IMPORTED_CASE_CHART_ID,
          title: "Imported replacement chart",
          sourceId: IMPORTED_CASE_SOURCE_ID,
        }],
      }],
    }],
  };
  return {
    bundleType: "simex-dashboard-bundle",
    version: 6,
    metadata: {
      exportedAt: null,
      sourceFingerprints: { [IMPORTED_CASE_SOURCE_ID]: null },
      networkDependencies: [],
    },
    config,
  };
}

export function additiveCaseDashboard(dashboard, profiles) {
  const { source, profile, sourceEntry } = importedCaseParts(dashboard, profiles);
  return {
    ...structuredClone(dashboard),
    dataSources: {
      ...dashboard.dataSources,
      [IMPORTED_CASE_SOURCE_ID]: source,
    },
    datasetProfiles: {
      ...dashboard.datasetProfiles,
      [IMPORTED_CASE_SOURCE_ID]: profile,
    },
    contentLibrary: {
      ...dashboard.contentLibrary,
      sourceEntries: {
        ...dashboard.contentLibrary.sourceEntries,
        [IMPORTED_CASE_SOURCE_ID]: sourceEntry,
      },
    },
  };
}
