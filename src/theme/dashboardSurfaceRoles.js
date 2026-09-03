const freezeSurfaceIds = (surfaceIds) => Object.freeze([...surfaceIds]);

export const DASHBOARD_JOURNEY_PRIMARY_ROLES = Object.freeze({
  shell: freezeSurfaceIds([
    "landing-standard", "home-standard", "view-compact", "view-standard", "view-dark-1280", "view-wide",
    "build-compact", "build-standard", "present-pressure", "present-standard", "audience-1280", "audience-1920",
    "application-recovery", "build-workspace-dialog-contract",
    "mobile-view-custom-design",
  ]),
  "command-bar": freezeSurfaceIds([]),
  panel: freezeSurfaceIds([
    "view-chrono-controls", "dashboard-map-structure", "dashboard-map-inspector", "build-unit-orbit",
    "build-page-actions", "build-page-command-form", "scenario-passport-standard", "scene-unit-orbit",
    "pending-operation-row",
  ]),
  editor: freezeSurfaceIds([
    "source-content-compact", "source-content-standard", "chrono-studio-library", "chrono-group-editor",
    "scene-studio-details", "scene-studio-select", "scene-studio-arrange", "chart-wizard-destination",
    "chart-wizard-data-source", "chart-wizard-chart-type", "chart-wizard-map-and-prepare", "chart-wizard-configure",
    "chart-wizard-review-issues", "full-chart-editor-configure", "chart-quick-editor", "text-image-composer",
    "text-image-advanced", "static-image-source-editor",
  ]),
  dialog: freezeSurfaceIds([
    "section-command-dialog", "chart-conversion-dialog", "text-image-destination", "text-image-type-picker",
    "build-create-page-dialog", "build-create-section-dialog", "package-export-readiness", "package-import-review",
    "delete-dashboard-content-dialog", "restore-online-dashboard-dialog", "source-content-action-dialog", "present-audience-options", "chart-editor-modal-contract",
    "build-move-dialog-contract", "build-move-confirmation-contract", "scene-observation-dialog",
  ]),
  drawer: freezeSurfaceIds(["build-more-menu", "dashboard-look-standard", "right-side-drawer-contract"]),
  menu: freezeSurfaceIds(["chart-wizard-source-listbox", "chart-color-palette"]),
  status: freezeSurfaceIds([
    "operation-status-notice", "chart-state-recovery-harness",
    "build-below-desktop-recommendation", "present-below-desktop-recommendation",
  ]),
  table: freezeSurfaceIds(["source-viewer-standard", "source-viewer-dialog-contract"]),
  "chart-cell": freezeSurfaceIds(["chart-comparison-dialog", "focused-chart-dialog"]),
});

// Compatibility alias. These are journey grouping roles, not an owned-region
// census; visual-region ownership lives in dashboardRegionRegistry.js.
export const DASHBOARD_SURFACE_ROLES = DASHBOARD_JOURNEY_PRIMARY_ROLES;

export const STYLE_SIGNATURE_CHECKS = Object.freeze({
  ledger: Object.freeze({
    contour: "square",
    material: "flat",
    typography: "serif",
    separator: "register-divider",
    elevation: "none",
  }),
  humanist: Object.freeze({
    contour: "rounded",
    material: "tonal",
    typography: "sans-serif",
    separator: "gentle-separation",
    elevation: "soft",
  }),
  instrument: Object.freeze({
    contour: "precise",
    material: "technical",
    typography: "monospace-data",
    separator: "accent-rail",
    elevation: "low-profile",
  }),
});

const roleBySurfaceId = new Map(
  Object.entries(DASHBOARD_JOURNEY_PRIMARY_ROLES)
    .flatMap(([role, surfaceIds]) => surfaceIds.map((surfaceId) => [surfaceId, role])),
);

export const dashboardJourneyGroupingRoleFor = (journeyId) => roleBySurfaceId.get(journeyId);
export const dashboardSurfaceRoleFor = dashboardJourneyGroupingRoleFor;

const dispositionFor = (sourceDisposition) => {
  if (sourceDisposition === "executable") return "PENDING_RENDER";
  if (sourceDisposition === "coverage-alias") return "COVERAGE_ALIAS";
  if (sourceDisposition === "intentionally-out-of-scope") return "OUT_OF_SCOPE";
  throw new Error(`Unknown dashboard journey disposition: ${sourceDisposition}`);
};

export const buildDashboardJourneyStyleDispositionMatrix = (journeyManifest) => Object.freeze(
  journeyManifest.flatMap(({ id: journeyId, disposition: sourceDisposition, surfaceRole }) =>
    Object.keys(STYLE_SIGNATURE_CHECKS).map((style) => Object.freeze({
      journeyId,
      journeyGroupingRole: surfaceRole,
      accounting: "journey-style",
      // Compatibility fields for the existing deferred contact-sheet tooling.
      surfaceId: journeyId,
      surfaceRole,
      style,
      sourceDisposition,
      renderedDisposition: dispositionFor(sourceDisposition),
    })),
  ),
);

export const buildDashboardStyleDispositionMatrix = buildDashboardJourneyStyleDispositionMatrix;
