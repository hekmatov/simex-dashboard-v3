export function projectDashboardAuthoredContent(dashboard) {
  assertDashboard(dashboard, "Dashboard authored-content projection");
  const hierarchy = [];
  const placements = [];

  for (const [pageIndex, page] of (dashboard.pages ?? []).entries()) {
    const { sections = [], ...pageContent } = page;
    const projectedSections = [];
    for (const [sectionIndex, section] of sections.entries()) {
      const { panels = [], ...sectionContent } = section;
      projectedSections.push({
        order: sectionIndex,
        content: sectionContent,
      });
      for (const [panelIndex, placement] of panels.entries()) {
        placements.push({
          pageId: page.id ?? null,
          pageOrder: pageIndex,
          sectionId: section.id ?? null,
          sectionOrder: sectionIndex,
          panelOrder: panelIndex,
          placement,
        });
      }
    }
    hierarchy.push({
      order: pageIndex,
      content: pageContent,
      sections: projectedSections,
    });
  }

  return canonicalize({
    dataSources: dashboard.dataSources ?? {},
    contentLibrary: dashboard.contentLibrary ?? {},
    assets: dashboard.assets ?? {},
    datasetProfiles: dashboard.datasetProfiles ?? {},
    hierarchy,
    placements,
  });
}

export function stampDashboardAuthoredRevision({
  previous,
  candidate,
  now = new Date(),
} = {}) {
  assertDashboard(previous, "Previous dashboard");
  assertDashboard(candidate, "Candidate dashboard");
  const stamped = structuredClone(candidate);
  if (
    stableSerialize(projectDashboardAuthoredContent(previous))
    !== stableSerialize(projectDashboardAuthoredContent(stamped))
  ) {
    stamped.lastUpdated = browserLocalDate(now);
  }
  return stamped;
}

export function prepareDashboardAuthoredPersistenceCandidate({
  previous,
  candidate,
  context = {},
  now = new Date(),
} = {}) {
  assertDashboard(candidate, "Candidate dashboard");
  if (context?.rollback === true || context?.preserveAuthoredRevision === true) {
    return structuredClone(candidate);
  }
  return stampDashboardAuthoredRevision({ previous, candidate, now });
}

function browserLocalDate(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new RangeError("Dashboard revision date is invalid.");
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function stableSerialize(value) {
  return JSON.stringify(value);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function assertDashboard(value, description) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${description} must be an object.`);
  }
}
