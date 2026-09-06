import PdpcReleaseDisclaimer, { PdpcDashboardHeader } from "./PdpcReleaseHeader.jsx";

const VARIANTS = Object.freeze({
  biomedical: Object.freeze(["scenario", "biomedical"]),
  socioeconomic: Object.freeze(["scenario", "socio_economic"]),
});

export function createPdpcReleaseProfile(variant) {
  const includedPageIds = VARIANTS[variant];
  if (!includedPageIds) {
    throw new Error(`Unsupported PDPC release variant "${String(variant)}".`);
  }
  return Object.freeze({
    id: `pdpc-${variant}`,
    variant,
    includedPageIds: [...includedPageIds],
    availableModes: Object.freeze(["view"]),
    initialMode: "view",
    viewOnly: true,
    disableCompanion: true,
    suppressCommandCrown: true,
    HeaderComponent: PdpcReleaseDisclaimer,
    DashboardHeaderComponent: PdpcDashboardHeader,
    normalizeEntry,
    prepareDashboard(dashboard) {
      const pageIds = Array.isArray(dashboard?.pages)
        ? dashboard.pages.map(({ id }) => id)
        : [];
      if (JSON.stringify(pageIds) !== JSON.stringify(includedPageIds)) {
        throw new Error(`Dashboard pages do not match the ${variant} release manifest.`);
      }
      return dashboard;
    },
    requestMode(nextMode) {
      return nextMode === "view" ? null : Object.freeze({
        ok: false,
        mode: "view",
        reason: "This release is view-only.",
      });
    },
  });
}

function normalizeEntry(entry) {
  const alreadyView = entry?.surface === "workspace"
    && (entry.requestedMode === null || entry.requestedMode === "view");
  return {
    surface: "workspace",
    requestedMode: "view",
    channelId: null,
    issue: alreadyView ? entry.issue ?? null : "unsupported_view_only_entry",
  };
}
