export const DASHBOARD_REGION_ROLES = Object.freeze([
  "shell", "command-bar", "panel", "editor", "dialog",
  "drawer", "menu", "status", "table", "chart-cell",
]);

export const DASHBOARD_REGION_LIFECYCLES = Object.freeze([
  "persistent", "conditional", "portal",
]);

export const DASHBOARD_REGION_MATERIALS = Object.freeze([
  "flat", "ledger-register",
]);

const defineRegion = ({
  id,
  owner,
  selector,
  liveSelectors = [],
  role,
  material = "flat",
  lifecycle,
  parentId = null,
  witnesses,
  styleWitnessRequired = true,
  exclusion = null,
}) => Object.freeze({
  id,
  owner,
  selector,
  liveSelectors: Object.freeze([...liveSelectors]),
  role,
  material,
  lifecycle,
  parentId,
  witnesses: Object.freeze([...witnesses]),
  styleWitnessRequired,
  exclusion: exclusion ? Object.freeze({ ...exclusion }) : null,
});

const region = (definition) => defineRegion(definition);

export const DASHBOARD_OWNED_REGION_REGISTRY = Object.freeze([
  region({
    id: "app-frame-shell",
    owner: "AppFrame",
    selector: ".app-frame",
    role: "shell",
    lifecycle: "persistent",
    witnesses: ["landing-standard", "home-standard", "view-standard", "build-standard", "present-standard"],
  }),
  region({
    id: "home-workspace-shell",
    owner: "CanonicalHomeWorkspace",
    selector: '[data-canonical-mode="home"]',
    role: "shell",
    lifecycle: "persistent",
    parentId: "app-frame-shell",
    witnesses: ["home-standard"],
  }),
  region({
    id: "view-workspace-shell",
    owner: "DashboardModeWorkspace",
    selector: '[data-canonical-mode="view"]',
    role: "shell",
    lifecycle: "persistent",
    parentId: "app-frame-shell",
    witnesses: ["view-compact", "view-standard", "view-dark-1280", "view-wide"],
  }),
  region({
    id: "build-workspace-shell",
    owner: "BuildWorkspace",
    selector: ".build-workspace-authoring-root",
    role: "shell",
    lifecycle: "persistent",
    parentId: "app-frame-shell",
    witnesses: ["build-compact", "build-standard"],
  }),
  region({
    id: "present-workspace-shell",
    owner: "PresentWorkspace",
    selector: ".present-workspace",
    role: "shell",
    lifecycle: "persistent",
    parentId: "app-frame-shell",
    witnesses: ["present-pressure", "present-standard"],
  }),
  region({
    id: "audience-display-shell",
    owner: "AudienceDisplay",
    selector: ".audience-theme-root",
    liveSelectors: [".audience-display"],
    role: "shell",
    lifecycle: "portal",
    witnesses: ["audience-1280", "audience-1920"],
  }),
  region({
    id: "source-viewer-shell",
    owner: "SourceCsvViewer",
    selector: ".source-viewer-theme-root",
    liveSelectors: [".source-viewer-shell"],
    role: "shell",
    lifecycle: "portal",
    witnesses: ["source-viewer-standard"],
  }),
  region({
    id: "application-recovery-shell",
    owner: "ApplicationRecovery",
    selector: ".application-recovery",
    role: "shell",
    lifecycle: "conditional",
    witnesses: ["application-recovery"],
  }),
  region({
    id: "desktop-width-notice",
    owner: "DesktopWidthNotice",
    selector: ".desktop-width-notice",
    role: "status",
    lifecycle: "conditional",
    parentId: "app-frame-shell",
    witnesses: ["build-below-desktop-recommendation", "present-below-desktop-recommendation"],
  }),
  region({
    id: "global-command-crown",
    owner: "DashboardCommandCrown",
    selector: ".dashboard-command-crown",
    role: "command-bar",
    lifecycle: "persistent",
    parentId: "app-frame-shell",
    witnesses: ["home-standard", "view-standard", "build-standard", "present-standard"],
  }),
  region({
    id: "build-command-header",
    owner: "BuildCommandHeader",
    selector: '[data-dashboard-region="build-command-header"]',
    liveSelectors: [".build-command-header"],
    role: "command-bar",
    lifecycle: "persistent",
    parentId: "build-workspace-shell",
    witnesses: ["build-compact", "build-standard", "build-page-actions", "build-page-command-form"],
  }),
  region({
    id: "build-page-navigation",
    owner: "BuildPageNavigation",
    selector: ".build-page-navigation",
    liveSelectors: ['.build-page-tabs[data-build-page-navigation="anchored"]'],
    role: "command-bar",
    lifecycle: "persistent",
    parentId: "global-command-crown",
    witnesses: ["build-standard", "build-page-actions", "build-page-command-form"],
  }),
  region({
    id: "view-playback-controls",
    owner: "ChronoController",
    selector: ".playback-controls",
    liveSelectors: [".playback-controls--floating"],
    role: "command-bar",
    lifecycle: "conditional",
    parentId: "view-workspace-shell",
    witnesses: ["view-chrono-controls"],
  }),
  region({
    id: "present-action-dock",
    owner: "PresentWorkspace",
    selector: ".present-action-dock",
    role: "command-bar",
    lifecycle: "conditional",
    parentId: "present-workspace-shell",
    witnesses: ["present-pressure", "present-standard"],
  }),
  region({
    id: "dashboard-header-panel",
    owner: "DashboardHeader",
    selector: ".dashboard-header",
    role: "panel",
    lifecycle: "persistent",
    parentId: "app-frame-shell",
    witnesses: ["view-standard", "build-standard"],
  }),
  region({
    id: "chart-panel",
    owner: "ChartPanel",
    selector: ".chart-panel",
    role: "panel",
    lifecycle: "persistent",
    parentId: "app-frame-shell",
    witnesses: ["view-standard", "build-standard"],
  }),
  region({
    id: "build-side-sheet",
    owner: "BuildSideSheet",
    selector: ".build-side-sheet",
    role: "panel",
    lifecycle: "conditional",
    parentId: "build-workspace-shell",
    witnesses: ["build-unit-orbit"],
  }),
  region({
    id: "unit-orbit-panel",
    owner: "UnitOrbit",
    selector: ".unit-orbit",
    role: "panel",
    lifecycle: "conditional",
    parentId: "build-workspace-shell",
    witnesses: ["build-unit-orbit", "scene-unit-orbit"],
  }),
  region({
    id: "present-context-panel",
    owner: "PresentWorkspace",
    selector: ".present-context-panel",
    role: "panel",
    lifecycle: "persistent",
    parentId: "present-workspace-shell",
    witnesses: ["present-pressure", "present-standard"],
  }),
  region({
    id: "present-scene-panel",
    owner: "PresentWorkspace",
    selector: ".present-scene-panel",
    role: "panel",
    lifecycle: "persistent",
    parentId: "present-workspace-shell",
    witnesses: ["present-pressure", "present-standard"],
  }),
  region({
    id: "scenario-passport-panel",
    owner: "ScenarioPassport",
    selector: ".scenario-passport-popover",
    role: "panel",
    lifecycle: "conditional",
    parentId: "app-frame-shell",
    witnesses: ["scenario-passport-standard"],
  }),
  region({
    id: "build-authoring-editor",
    owner: "BuildAuthoringAuxiliary",
    selector: ".build-authoring-auxiliary",
    role: "editor",
    lifecycle: "conditional",
    parentId: "build-workspace-shell",
    witnesses: ["chrono-studio-library", "chrono-group-editor", "scene-studio-details", "scene-studio-select", "scene-studio-arrange"],
  }),
  region({
    id: "chart-authoring-editor",
    owner: "ChartAuthoring",
    selector: ".chart-authoring-section",
    liveSelectors: [".chart-authoring-section-advanced", ".chart-wizard-workbench", ".chart-editor-form"],
    role: "editor",
    lifecycle: "conditional",
    parentId: "build-workspace-shell",
    witnesses: ["chart-wizard-destination", "chart-wizard-data-source", "chart-wizard-chart-type", "chart-wizard-map-and-prepare", "chart-wizard-configure", "chart-wizard-review-issues", "full-chart-editor-configure", "chart-quick-editor"],
  }),
  region({
    id: "source-content-editor",
    owner: "SourceContentWorkspace",
    selector: ".source-content-workspace",
    role: "editor",
    lifecycle: "conditional",
    parentId: "build-workspace-shell",
    witnesses: ["source-content-compact", "source-content-standard"],
  }),
  region({
    id: "static-content-editor",
    owner: "StaticContentComposer",
    selector: ".static-content-dialog__body",
    role: "editor",
    lifecycle: "conditional",
    parentId: "build-workspace-shell",
    witnesses: ["text-image-composer", "text-image-advanced", "static-image-source-editor"],
  }),
  region({
    id: "dashboard-dialog",
    owner: "DashboardDialog",
    selector: ".dashboard-dialog:not(.right-side-drawer)",
    role: "dialog",
    lifecycle: "portal",
    witnesses: ["section-command-dialog", "chart-conversion-dialog", "text-image-destination", "text-image-type-picker", "build-create-page-dialog", "build-create-section-dialog", "package-export-readiness", "package-import-review", "delete-dashboard-content-dialog", "restore-online-dashboard-dialog", "source-content-action-dialog", "present-audience-options"],
  }),
  region({
    id: "scene-observation-dialog",
    owner: "SceneObservationDialog",
    selector: ".scene-observation-dialog",
    role: "dialog",
    lifecycle: "portal",
    witnesses: ["scene-observation-dialog"],
  }),
  region({
    id: "dashboard-map-drawer",
    owner: "DashboardMap",
    selector: '[data-right-side-drawer="dashboard-map-panel"]',
    role: "drawer",
    lifecycle: "portal",
    witnesses: ["dashboard-map-structure", "dashboard-map-inspector"],
  }),
  region({
    id: "look-drawer",
    owner: "DashboardLookDrawer",
    selector: '[data-right-side-drawer="look-drawer"]',
    liveSelectors: [".look-drawer"],
    role: "drawer",
    lifecycle: "portal",
    witnesses: ["dashboard-look-standard"],
  }),
  region({
    id: "build-more-drawer",
    owner: "BuildMoreDrawer",
    selector: '[data-right-side-drawer="build-more-drawer"]',
    liveSelectors: [".build-more-drawer"],
    role: "drawer",
    lifecycle: "portal",
    witnesses: ["build-more-menu"],
  }),
  region({
    id: "build-page-action-menu",
    owner: "BuildPageNavigation",
    selector: ".build-page-action-menu",
    role: "menu",
    lifecycle: "conditional",
    parentId: "build-page-navigation",
    witnesses: ["build-page-actions", "build-page-command-form"],
  }),
  region({
    id: "listbox-menu",
    owner: "AccessibleListbox",
    selector: ".accessible-listbox-popup",
    liveSelectors: [".accessible-listbox-option"],
    role: "menu",
    lifecycle: "portal",
    witnesses: ["chart-wizard-source-listbox"],
  }),
  region({
    id: "chart-export-menu",
    owner: "ChartExportMenu",
    selector: ".chart-export-menu",
    role: "menu",
    lifecycle: "portal",
    witnesses: ["view-standard"],
  }),
  region({
    id: "playback-menu",
    owner: "PlaybackMenu",
    selector: ".playback-menu",
    role: "menu",
    lifecycle: "portal",
    witnesses: ["view-chrono-controls"],
  }),
  region({
    id: "colour-palette-menu",
    owner: "ColorFieldPopover",
    selector: ".settings-color-popover",
    liveSelectors: [".settings-color-palette"],
    role: "menu",
    lifecycle: "portal",
    witnesses: ["chart-color-palette"],
  }),
  region({
    id: "operation-status-notice",
    owner: "OperationStatusViewport",
    selector: ".operation-status-notice",
    role: "status",
    lifecycle: "portal",
    witnesses: ["operation-status-notice"],
  }),
  region({
    id: "chart-status",
    owner: "ChartDataState",
    selector: ".chart-status-empty",
    liveSelectors: [".chart-status-error", ".chart-status-partial"],
    role: "status",
    lifecycle: "conditional",
    witnesses: ["chart-state-recovery-harness"],
  }),
  region({
    id: "static-content-status",
    owner: "StaticContentState",
    selector: ".static-content-state",
    role: "status",
    lifecycle: "conditional",
    witnesses: ["text-image-composer"],
  }),
  region({
    id: "present-status-strip",
    owner: "PresentWorkspace",
    selector: ".present-status-strip",
    role: "status",
    lifecycle: "persistent",
    parentId: "present-workspace-shell",
    witnesses: ["present-pressure", "present-standard"],
  }),
  region({
    id: "chart-state-recovery-status",
    owner: "ChartStateRecoveryHarness",
    selector: ".chart-state-recovery-harness",
    role: "status",
    lifecycle: "persistent",
    witnesses: ["chart-state-recovery-harness"],
  }),
  region({
    id: "chart-table-register",
    owner: "TableChartView",
    selector: ".chart-table-view",
    role: "table",
    material: "ledger-register",
    lifecycle: "conditional",
    witnesses: ["view-standard", "build-standard"],
  }),
  region({
    id: "source-viewer-table-register",
    owner: "SourceCsvViewer",
    selector: ".source-viewer-table-wrap",
    role: "table",
    material: "ledger-register",
    lifecycle: "persistent",
    parentId: "source-viewer-shell",
    witnesses: ["source-viewer-standard"],
  }),
  region({
    id: "displayed-chart-cell",
    owner: "DisplayedChartGrid",
    selector: ".displayed-chart-cell",
    role: "chart-cell",
    lifecycle: "conditional",
    witnesses: ["chart-comparison-dialog", "focused-chart-dialog", "audience-1280", "audience-1920"],
  }),
  region({
    id: "chart-view-frame",
    owner: "ChartView",
    selector: ".chart-view-frame",
    liveSelectors: [".chart-card"],
    role: "chart-cell",
    lifecycle: "persistent",
    witnesses: ["view-standard", "build-standard"],
  }),
  region({
    id: "fullscreen-chart-cell",
    owner: "FullscreenDisplay",
    selector: ".fullscreen-panel",
    liveSelectors: [".multi-fullscreen-cell"],
    role: "chart-cell",
    lifecycle: "portal",
    witnesses: ["chart-comparison-dialog", "focused-chart-dialog"],
  }),
]);

const regionById = new Map(DASHBOARD_OWNED_REGION_REGISTRY.map((entry) => [entry.id, entry]));

export function dashboardOwnedRegionFor(id) {
  const entry = regionById.get(id);
  if (!entry) throw new Error(`Unknown dashboard region: ${id}`);
  return entry;
}

export function dashboardOwnedRegionProps(id) {
  const entry = dashboardOwnedRegionFor(id);
  return Object.freeze({
    "data-dashboard-region": entry.id,
    "data-dashboard-surface-role": entry.role,
    "data-dashboard-material": entry.material,
  });
}

export function dashboardOwnedRegionIdsForJourney(journeyId) {
  return Object.freeze(DASHBOARD_OWNED_REGION_REGISTRY
    .filter(({ witnesses }) => witnesses.includes(journeyId))
    .map(({ id }) => id));
}

const REGION_STYLE_IDS = Object.freeze(["ledger", "humanist", "instrument"]);

export function buildDashboardRegionStyleDispositionMatrix(
  registry = DASHBOARD_OWNED_REGION_REGISTRY,
) {
  return Object.freeze(registry.flatMap((entry) => REGION_STYLE_IDS.map((style) => Object.freeze({
    regionId: entry.id,
    role: entry.role,
    material: entry.material,
    lifecycle: entry.lifecycle,
    style,
    accounting: "region-style",
    renderedDisposition: entry.styleWitnessRequired ? "PENDING_RENDER" : "NOT_REQUIRED",
  }))));
}

export function validateDashboardOwnedRegionRegistry(registry, journeyManifest) {
  const issues = [];
  const journeyIds = new Set(journeyManifest.map(({ id }) => id));
  const ids = new Set();
  const selectors = new Set();
  const entriesById = new Map(registry.map((entry) => [entry.id, entry]));
  const issue = (type, regionId, detail) => issues.push(Object.freeze({ type, regionId, detail }));

  for (const entry of registry) {
    if (!entry.id || ids.has(entry.id)) issue("DUPLICATE_ID", entry.id || null, "Region IDs must be unique and non-empty.");
    ids.add(entry.id);
    if (!entry.selector || selectors.has(entry.selector)) issue("DUPLICATE_SELECTOR", entry.id, entry.selector || "missing selector");
    selectors.add(entry.selector);
    if (!entry.owner) issue("MISSING_OWNER", entry.id, "owner");
    if (!DASHBOARD_REGION_ROLES.includes(entry.role)) issue("INVALID_ROLE", entry.id, entry.role);
    if (!DASHBOARD_REGION_MATERIALS.includes(entry.material)) issue("INVALID_MATERIAL", entry.id, entry.material);
    if (!DASHBOARD_REGION_LIFECYCLES.includes(entry.lifecycle)) issue("INVALID_LIFECYCLE", entry.id, entry.lifecycle);
    if (entry.material === "ledger-register" && entry.role !== "table") issue("INVALID_REGISTER_ROLE", entry.id, entry.role);
    if (typeof entry.styleWitnessRequired !== "boolean") issue("INVALID_STYLE_WITNESS", entry.id, entry.styleWitnessRequired);
    if (!Array.isArray(entry.witnesses) || entry.witnesses.length === 0) {
      issue("UNWITNESSED", entry.id, "At least one journey witness is required.");
    } else {
      for (const witness of entry.witnesses) {
        if (!journeyIds.has(witness)) issue("UNKNOWN_WITNESS", entry.id, witness);
      }
    }
    if (entry.parentId && !entriesById.has(entry.parentId)) issue("UNKNOWN_PARENT", entry.id, entry.parentId);
    if (entry.exclusion && (!entry.exclusion.owner || !entry.exclusion.reason)) issue("INVALID_EXCLUSION", entry.id, "Exclusions require owner and reason.");
  }

  for (const entry of registry) {
    const visited = new Set([entry.id]);
    let parentId = entry.parentId;
    while (parentId) {
      if (visited.has(parentId)) {
        issue("PARENT_CYCLE", entry.id, parentId);
        break;
      }
      visited.add(parentId);
      parentId = entriesById.get(parentId)?.parentId ?? null;
    }
  }

  return Object.freeze(issues);
}
