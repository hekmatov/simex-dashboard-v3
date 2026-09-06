import { openChartAuthoring } from "./chart-authoring-workflow.js";
import { enterBuildMode, openDashboardMap, openSourceContent } from "./buildWorkflow.js";
import { openDashboardPage } from "./landingWorkflow.js";
import { dashboardJourneyGroupingRoleFor } from "../../../src/theme/dashboardSurfaceRoles.js";

const DESKTOP_STANDARD = Object.freeze({ width: 1440, height: 900 });
const DESKTOP_COMPACT = Object.freeze({ width: 1024, height: 768 });
const DESKTOP_PRESSURE = Object.freeze({ width: 1280, height: 720 });
const DESKTOP_WIDE = Object.freeze({ width: 1920, height: 1080 });
const BELOW_RECOMMENDED_DESKTOP = Object.freeze({ width: 900, height: 720 });
const CHART_STATE_HARNESS_ROOT = '.chart-state-recovery-harness[data-dashboard-style][data-dashboard-surface-role="status"]';

const executable = (definition) => Object.freeze({
  appearance: "light",
  ...definition,
  surfaceRole: dashboardJourneyGroupingRoleFor(definition.id),
  disposition: "executable",
});

const outOfScope = (definition) => Object.freeze({
  ...definition,
  surfaceRole: dashboardJourneyGroupingRoleFor(definition.id),
  disposition: "intentionally-out-of-scope",
});

const coverageAlias = (definition) => Object.freeze({
  appearance: "light",
  ...definition,
  surfaceRole: dashboardJourneyGroupingRoleFor(definition.id),
  disposition: "coverage-alias",
});

const aliasEquivalence = (basis, categories) => Object.freeze({
  basis,
  categories: Object.freeze(categories),
});

export const DASHBOARD_JOURNEY_MANIFEST = Object.freeze([
  executable({
    id: "landing-standard",
    family: "landing",
    owner: "app-shell",
    mode: "home",
    state: "landing",
    viewport: DESKTOP_PRESSURE,
    root: ".app-frame",
    setup: setupLanding,
  }),
  executable({
    id: "home-standard",
    family: "home",
    owner: "home-workspace",
    mode: "home",
    state: "showcase",
    viewport: DESKTOP_STANDARD,
    root: "[data-canonical-mode='home']",
    setup: setupHome,
  }),
  executable({
    id: "view-compact",
    family: "view",
    owner: "view-workspace",
    mode: "view",
    state: "biomedical-pressure",
    viewport: DESKTOP_COMPACT,
    root: "[data-canonical-mode='view']",
    setup: setupView,
  }),
  executable({
    id: "view-standard",
    family: "view",
    owner: "view-workspace",
    mode: "view",
    state: "biomedical",
    viewport: DESKTOP_STANDARD,
    root: "[data-canonical-mode='view']",
    setup: setupView,
  }),
  executable({
    id: "view-dark-1280",
    family: "view",
    owner: "view-workspace",
    mode: "view",
    state: "biomedical-dark",
    appearance: "dark",
    viewport: DESKTOP_PRESSURE,
    root: "[data-canonical-mode='view']",
    setup: setupView,
  }),
  executable({
    id: "view-wide",
    family: "view",
    owner: "view-workspace",
    mode: "view",
    state: "biomedical-wide",
    viewport: DESKTOP_WIDE,
    root: "[data-canonical-mode='view']",
    setup: setupView,
  }),
  executable({
    id: "view-chrono-controls",
    family: "temporal",
    owner: "chrono-playback",
    mode: "view",
    state: "playback-controls",
    viewport: DESKTOP_STANDARD,
    root: "[aria-label='Chrono playback controls']",
    setup: setupViewChrono,
  }),
  executable({
    id: "build-compact",
    family: "build",
    owner: "build-workspace",
    mode: "build",
    state: "biomedical-pressure",
    viewport: DESKTOP_COMPACT,
    root: "[data-canonical-mode='build']",
    setup: setupBuild,
  }),
  executable({
    id: "build-standard",
    family: "build",
    owner: "build-workspace",
    mode: "build",
    state: "biomedical",
    viewport: DESKTOP_STANDARD,
    root: "[data-canonical-mode='build']",
    setup: setupBuild,
  }),
  executable({
    id: "dashboard-map-structure",
    family: "structure-management",
    owner: "dashboard-map",
    mode: "build",
    state: "structure-tree",
    viewport: DESKTOP_STANDARD,
    root: "[role='complementary'][aria-label='Dashboard map']",
    setup: setupDashboardMap,
  }),
  executable({
    id: "dashboard-map-inspector",
    family: "structure-management",
    owner: "dashboard-map",
    mode: "build",
    state: "context-inspector",
    viewport: DESKTOP_STANDARD,
    root: "[role='complementary'][aria-label='Dashboard map'] .build-inspector",
    setup: setupDashboardMapInspector,
  }),
  executable({
    id: "build-unit-orbit",
    family: "structure-management",
    owner: "unit-orbit",
    mode: "build",
    state: "selected-chart",
    viewport: DESKTOP_STANDARD,
    root: ".unit-orbit",
    setup: setupBuildUnitOrbit,
  }),
  executable({
    id: "build-page-actions",
    family: "structure-management",
    owner: "anchored-page-navigation",
    mode: "build",
    state: "page-actions",
    viewport: DESKTOP_STANDARD,
    root: "[role='group'][aria-label='Biomedical Page actions']",
    setup: setupBuildPageActions,
  }),
  executable({
    id: "build-page-command-form",
    family: "structure-management",
    owner: "anchored-page-navigation",
    mode: "build",
    state: "page-command-form",
    viewport: DESKTOP_STANDARD,
    root: "[role='group'][aria-label='Biomedical Page actions'] .build-page-command-form",
    setup: setupBuildPageCommandForm,
  }),
  executable({
    id: "section-command-dialog",
    family: "structure-management",
    owner: "section-structure-command-dialog",
    mode: "build",
    state: "move-section",
    viewport: DESKTOP_STANDARD,
    root: ".section-structure-command-dialog",
    setup: setupSectionCommandDialog,
  }),
  executable({
    id: "build-more-menu",
    family: "build",
    owner: "build-command-crown",
    mode: "build",
    state: "more-commands",
    viewport: DESKTOP_PRESSURE,
    root: "[role='dialog']",
    setup: setupBuildMore,
  }),
  executable({
    id: "dashboard-look-standard",
    family: "dashboard-look",
    owner: "dashboard-look-drawer",
    mode: "home",
    state: "profile-options",
    viewport: DESKTOP_STANDARD,
    root: "[role='dialog']",
    setup: setupDashboardLook,
  }),
  executable({
    id: "scenario-passport-standard",
    family: "scenario-passport",
    owner: "scenario-passport",
    mode: "build",
    state: "identity-and-package",
    viewport: DESKTOP_STANDARD,
    root: "[aria-label='Scenario Passport']",
    setup: setupScenarioPassport,
  }),
  executable({
    id: "source-content-compact",
    family: "source-content",
    owner: "source-content-workspace",
    mode: "build",
    state: "catalogue-pressure",
    viewport: DESKTOP_COMPACT,
    root: "[aria-label='Source content authoring']",
    setup: setupSourceContent,
  }),
  executable({
    id: "source-content-standard",
    family: "source-content",
    owner: "source-content-workspace",
    mode: "build",
    state: "catalogue-and-detail",
    viewport: DESKTOP_STANDARD,
    root: "[aria-label='Source content authoring']",
    setup: setupSourceContentDetail,
  }),
  executable({
    id: "chrono-studio-library",
    family: "temporal",
    owner: "chrono-studio",
    mode: "build",
    state: "library",
    viewport: DESKTOP_STANDARD,
    root: "[role='dialog']",
    setup: setupChronoStudio,
  }),
  executable({
    id: "chrono-group-editor",
    family: "temporal",
    owner: "chrono-group-editor",
    mode: "build",
    state: "name-and-period",
    viewport: DESKTOP_STANDARD,
    root: ".chrono-group-studio",
    setup: setupChronoGroupEditor,
  }),
  executable({
    id: "scene-studio-details",
    family: "temporal",
    owner: "scene-studio",
    mode: "build",
    state: "create-details",
    viewport: DESKTOP_STANDARD,
    root: "[role='dialog']",
    setup: setupSceneStudio,
  }),
  executable({
    id: "scene-studio-select",
    family: "temporal",
    owner: "scene-studio",
    mode: "build",
    state: "select-charts-and-frames",
    viewport: DESKTOP_STANDARD,
    root: ".scene-stage-body[data-stage='select']",
    setup: setupSceneStudioSelect,
  }),
  executable({
    id: "scene-observation-dialog",
    family: "temporal",
    owner: "scene-observation-dialog",
    mode: "build",
    state: "observation-detail",
    viewport: DESKTOP_STANDARD,
    root: ".scene-observation-dialog",
    setup: setupSceneObservationDialog,
  }),
  executable({
    id: "scene-studio-arrange",
    family: "temporal",
    owner: "scene-studio",
    mode: "build",
    state: "arrange-and-configure",
    viewport: DESKTOP_STANDARD,
    root: ".scene-stage-body[data-stage='arrange']",
    setup: setupSceneStudioArrange,
  }),
  executable({
    id: "scene-unit-orbit",
    family: "temporal",
    owner: "unit-orbit",
    mode: "build",
    state: "scene-chart-selected",
    viewport: DESKTOP_STANDARD,
    root: ".unit-orbit:has(.scene-unit-orbit)",
    setup: setupSceneUnitOrbit,
  }),
  executable({
    id: "chart-wizard-destination",
    family: "chart-authoring",
    owner: "chart-wizard",
    mode: "build",
    state: "destination",
    viewport: DESKTOP_STANDARD,
    root: ".chart-wizard",
    setup: setupChartWizardDestination,
  }),
  executable({
    id: "chart-wizard-data-source",
    family: "chart-authoring",
    owner: "chart-wizard",
    mode: "build",
    state: "data-source",
    viewport: DESKTOP_STANDARD,
    root: ".chart-wizard",
    setup: setupChartWizardDataSource,
  }),
  executable({
    id: "chart-wizard-source-listbox",
    family: "chart-authoring",
    owner: "accessible-listbox",
    mode: "build",
    state: "managed-source-options",
    viewport: DESKTOP_STANDARD,
    root: ".accessible-listbox-popup",
    setup: setupChartWizardSourceListbox,
  }),
  executable({
    id: "chart-wizard-chart-type",
    family: "chart-authoring",
    owner: "chart-wizard",
    mode: "build",
    state: "chart-type",
    viewport: DESKTOP_STANDARD,
    root: ".chart-wizard",
    setup: setupChartWizardChartType,
  }),
  executable({
    id: "chart-wizard-map-and-prepare",
    family: "chart-authoring",
    owner: "chart-wizard",
    mode: "build",
    state: "map-and-prepare",
    viewport: DESKTOP_STANDARD,
    root: ".chart-wizard",
    setup: setupChartWizardMapAndPrepare,
  }),
  executable({
    id: "chart-wizard-configure",
    family: "chart-authoring",
    owner: "chart-wizard",
    mode: "build",
    state: "configure-pie",
    viewport: DESKTOP_STANDARD,
    root: ".chart-wizard",
    setup: setupChartWizardConfigure,
  }),
  executable({
    id: "chart-wizard-review-issues",
    family: "chart-authoring",
    owner: "chart-wizard",
    mode: "build",
    state: "review-issues",
    viewport: DESKTOP_PRESSURE,
    root: ".chart-wizard",
    setup: setupChartWizardReviewIssues,
  }),
  executable({
    id: "full-chart-editor-configure",
    family: "chart-editor",
    owner: "full-chart-editor",
    mode: "build",
    state: "configure",
    viewport: DESKTOP_STANDARD,
    root: ".chart-wizard",
    setup: setupFullChartEditor,
  }),
  executable({
    id: "chart-quick-editor",
    family: "chart-editor",
    owner: "chart-quick-editor",
    mode: "build",
    state: "quick-edit",
    viewport: DESKTOP_STANDARD,
    root: ".chart-quick-editor",
    setup: setupChartQuickEditor,
  }),
  executable({
    id: "chart-color-palette",
    family: "chart-editor",
    owner: "color-field-popover",
    mode: "build",
    state: "color-options",
    viewport: DESKTOP_STANDARD,
    root: ".settings-color-popover",
    setup: setupChartColorPalette,
  }),
  executable({
    id: "chart-conversion-dialog",
    family: "chart-editor",
    owner: "chart-conversion-dialog",
    mode: "harness",
    state: "compatible-change",
    viewport: DESKTOP_STANDARD,
    root: ".chart-conversion-dialog",
    setup: setupChartConversionDialog,
  }),
  executable({
    id: "text-image-destination",
    family: "static-content",
    owner: "text-image-wizard",
    mode: "build",
    state: "destination",
    viewport: DESKTOP_PRESSURE,
    root: ".static-content-dialog",
    setup: setupTextImageDestination,
  }),
  executable({
    id: "text-image-type-picker",
    family: "static-content",
    owner: "text-image-wizard",
    mode: "build",
    state: "type-picker",
    viewport: DESKTOP_PRESSURE,
    root: "[role='dialog']",
    setup: setupTextImageTypePicker,
  }),
  executable({
    id: "text-image-composer",
    family: "static-content",
    owner: "text-image-composer",
    mode: "build",
    state: "composer",
    viewport: DESKTOP_STANDARD,
    root: "[role='dialog']",
    setup: setupTextImageComposer,
  }),
  executable({
    id: "text-image-advanced",
    family: "static-content",
    owner: "text-image-composer",
    mode: "build",
    state: "advanced-qmd",
    viewport: DESKTOP_STANDARD,
    root: "[role='dialog']",
    setup: setupTextImageAdvanced,
  }),
  executable({
    id: "static-image-source-editor",
    family: "image-editor",
    owner: "static-image-editor",
    mode: "build",
    state: "source-and-crop",
    viewport: DESKTOP_STANDARD,
    root: ".static-content-dialog",
    setup: setupStaticImageEditor,
  }),
  executable({
    id: "build-create-page-dialog",
    family: "structure-management",
    owner: "build-layout-create-dialog",
    mode: "build",
    state: "create-page",
    viewport: DESKTOP_STANDARD,
    root: ".build-move-dialog",
    setup: setupCreatePageDialog,
  }),
  executable({
    id: "build-create-section-dialog",
    family: "structure-management",
    owner: "build-layout-create-dialog",
    mode: "build",
    state: "create-section",
    viewport: DESKTOP_STANDARD,
    root: ".build-move-dialog",
    setup: setupCreateSectionDialog,
  }),
  executable({
    id: "package-export-readiness",
    family: "package-management",
    owner: "dashboard-package-export-dialog",
    mode: "build",
    state: "unfinished-work",
    viewport: DESKTOP_STANDARD,
    root: ".dashboard-package-export",
    setup: setupPackageExportDialog,
  }),
  executable({
    id: "package-import-review",
    family: "package-management",
    owner: "dashboard-package-review-dialog",
    mode: "build",
    state: "review-manifest",
    viewport: DESKTOP_STANDARD,
    root: ".dashboard-package-review",
    setup: setupPackageReviewDialog,
  }),
  executable({
    id: "delete-dashboard-content-dialog",
    family: "package-management",
    owner: "delete-dashboard-content-dialog",
    mode: "build",
    state: "destructive-confirmation",
    viewport: DESKTOP_STANDARD,
    root: ".delete-dashboard-content-dialog",
    setup: setupDeleteDashboardDialog,
  }),
  executable({
    id: "restore-online-dashboard-dialog",
    family: "package-management",
    owner: "restore-online-dashboard-dialog",
    mode: "build",
    state: "destructive-confirmation",
    viewport: DESKTOP_STANDARD,
    root: ".restore-online-dashboard-dialog",
    setup: setupRestoreOnlineDialog,
  }),
  executable({
    id: "source-content-action-dialog",
    family: "content-action",
    owner: "source-content-action-dialog",
    mode: "build",
    state: "delete-unused-media",
    viewport: DESKTOP_STANDARD,
    root: ".confirm-dialog",
    setup: setupSourceContentActionDialog,
  }),
  executable({
    id: "pending-operation-row",
    family: "operation-status",
    owner: "pending-work-navigation",
    mode: "build",
    state: "dirty-chart",
    viewport: DESKTOP_STANDARD,
    root: "[data-pending-work-id='chart-edit:bio_confirmed_cases']",
    setup: setupPendingOperation,
  }),
  executable({
    id: "operation-status-notice",
    family: "operation-status",
    owner: "operation-status-viewport",
    mode: "build",
    state: "completed-scenario-save",
    viewport: DESKTOP_STANDARD,
    root: ".operation-status-notice",
    setup: setupOperationStatusNotice,
  }),
  executable({
    id: "chart-comparison-dialog",
    family: "fullscreen",
    owner: "fullscreen-display",
    mode: "view",
    state: "two-chart-comparison",
    viewport: DESKTOP_STANDARD,
    root: "[role='dialog'][aria-label='Chart comparison']",
    setup: setupChartComparison,
  }),
  executable({
    id: "focused-chart-dialog",
    family: "fullscreen",
    owner: "fullscreen-display",
    mode: "view",
    state: "single-chart-focus",
    viewport: DESKTOP_STANDARD,
    root: "[role='dialog'][aria-label='Focused chart']",
    setup: setupFocusedChart,
  }),
  executable({
    id: "chart-state-recovery-harness",
    family: "chart-state",
    owner: "chart-state-surface",
    mode: "harness",
    state: "error-and-partial",
    viewport: DESKTOP_PRESSURE,
    root: CHART_STATE_HARNESS_ROOT,
    setup: setupChartStateHarness,
  }),
  executable({
    id: "present-pressure",
    family: "present",
    owner: "present-workspace",
    mode: "present",
    state: "composition-pressure",
    viewport: DESKTOP_PRESSURE,
    root: ".present-workspace",
    setup: setupPresent,
  }),
  executable({
    id: "present-standard",
    family: "present",
    owner: "present-workspace",
    mode: "present",
    state: "composition-chrono-controls",
    viewport: DESKTOP_STANDARD,
    root: ".present-workspace",
    setup: setupPresentChronoControls,
  }),
  executable({
    id: "present-audience-options",
    family: "present",
    owner: "audience-options-dialog",
    mode: "present",
    state: "audience-options",
    viewport: DESKTOP_STANDARD,
    root: "[role='dialog']",
    setup: setupAudienceOptions,
  }),
  executable({
    id: "audience-1280",
    family: "audience",
    owner: "audience-display",
    mode: "audience",
    state: "live-1280",
    viewport: Object.freeze({ width: 1280, height: 720 }),
    root: ".audience-display",
    setup: setupAudience,
  }),
  executable({
    id: "audience-1920",
    family: "audience",
    owner: "audience-display",
    mode: "audience",
    state: "live-1920",
    viewport: DESKTOP_WIDE,
    root: ".audience-display",
    setup: setupAudience,
  }),
  executable({
    id: "source-viewer-standard",
    family: "source-viewer",
    owner: "source-viewer",
    mode: "build",
    state: "biomedical-csv",
    viewport: DESKTOP_STANDARD,
    root: ".source-viewer-theme-root",
    setup: setupSourceViewer,
  }),
  executable({
    id: "application-recovery",
    family: "recovery",
    owner: "application-recovery",
    mode: "recovery",
    state: "configuration-unavailable",
    viewport: DESKTOP_PRESSURE,
    root: ".application-recovery",
    setup: setupRecovery,
  }),
  executable({
    id: "build-below-desktop-recommendation",
    family: "desktop-recommendation",
    owner: "app-shell-width-advisory",
    mode: "build",
    state: "below-1024-recommendation",
    viewport: BELOW_RECOMMENDED_DESKTOP,
    root: '[data-desktop-width-notice="build"]',
    setup: setupBuildRecommendation,
    expectations: Object.freeze({
      notice: '[data-desktop-width-notice="build"]',
      workspace: ".canonical-dashboard-frame.build-workspace",
      enabledControl: '[data-build-command-action="add-chart"]:not(:disabled)',
    }),
  }),
  executable({
    id: "present-below-desktop-recommendation",
    family: "desktop-recommendation",
    owner: "app-shell-width-advisory",
    mode: "present",
    state: "below-1024-recommendation",
    viewport: BELOW_RECOMMENDED_DESKTOP,
    root: '[data-desktop-width-notice="present"]',
    setup: setupPresentRecommendation,
    expectations: Object.freeze({
      notice: '[data-desktop-width-notice="present"]',
      workspace: ".present-workspace",
      enabledControl: '[data-presentation-control-id="chrono-groups"]:not(:disabled)',
    }),
  }),
  coverageAlias({
    id: "chart-editor-modal-contract",
    family: "chart-editor",
    owner: "chart-editor-modal",
    mode: "build",
    state: "alternate-modal-host",
    viewport: DESKTOP_STANDARD,
    aliasOf: "full-chart-editor-configure",
    equivalence: aliasEquivalence("Same production edit journey and shared full-editor dialog chrome.", [
      "role-size", "rhythm", "wrap", "whitespace", "overlap", "clipping", "overflow", "occupancy",
    ]),
    reason: "The production shell routes live full edits through ChartWizardV3 edit mode; the alternate modal host shares its dialog grammar but is not a separate reachable surface.",
  }),
  coverageAlias({
    id: "build-move-dialog-contract",
    family: "structure-management",
    owner: "build-move-dialog",
    mode: "build",
    state: "move-destination",
    viewport: DESKTOP_STANDARD,
    aliasOf: "build-create-page-dialog",
    equivalence: aliasEquivalence("Same BuildMoveDialog component, utility shell, field stack, and footer.", [
      "role-size", "rhythm", "wrap", "whitespace", "overlap", "clipping", "overflow", "occupancy",
    ]),
    reason: "The move destination dialog and create dialog share the same compact utility shell, field stack, and action footer.",
  }),
  coverageAlias({
    id: "build-move-confirmation-contract",
    family: "structure-management",
    owner: "build-move-confirmation-dialog",
    mode: "build",
    state: "move-consequences",
    viewport: DESKTOP_STANDARD,
    aliasOf: "delete-dashboard-content-dialog",
    equivalence: aliasEquivalence("Same confirmation-shell and destructive action-footer geometry.", [
      "role-size", "rhythm", "wrap", "whitespace", "overlap", "clipping", "overflow", "occupancy",
    ]),
    reason: "Move confirmation uses the same compact danger-dialog geometry and action footer as the audited destructive dashboard confirmation.",
  }),
  coverageAlias({
    id: "build-workspace-dialog-contract",
    family: "build",
    owner: "build-workspace-dialog",
    mode: "build",
    state: "workspace-shell",
    viewport: DESKTOP_STANDARD,
    aliasOf: "build-standard",
    equivalence: aliasEquivalence("The registry name resolves to the already executable live Build workspace.", [
      "role-size", "centreline", "rhythm", "wrap", "whitespace", "overlap", "clipping", "overflow", "repeated-title", "same-role-variance", "occupancy",
    ]),
    reason: "The registered workspace contract is the same live Build workspace already inspected at compact and standard desktop widths.",
  }),
  coverageAlias({
    id: "source-viewer-dialog-contract",
    family: "source-viewer",
    owner: "source-viewer-dialog",
    mode: "view",
    state: "workspace-shell",
    viewport: DESKTOP_STANDARD,
    aliasOf: "source-viewer-standard",
    equivalence: aliasEquivalence("The registry name resolves to the same standalone SourceViewer window and root.", [
      "role-size", "centreline", "rhythm", "wrap", "whitespace", "overlap", "clipping", "overflow", "repeated-title", "same-role-variance", "occupancy",
    ]),
    reason: "The registered SourceViewer workspace is delivered through the audited standalone source-viewer window in the production journey.",
  }),
  coverageAlias({
    id: "right-side-drawer-contract",
    family: "dashboard-look",
    owner: "right-side-drawer",
    mode: "home",
    state: "dialog-modality",
    viewport: DESKTOP_STANDARD,
    aliasOf: "dashboard-look-standard",
    equivalence: aliasEquivalence("Theme is the concrete production instance of the registered right-side drawer.", [
      "role-size", "centreline", "rhythm", "wrap", "whitespace", "overlap", "clipping", "overflow", "repeated-title", "same-role-variance", "occupancy",
    ]),
    reason: "Theme is the stable production journey for the registered right-side drawer dialog modality.",
  }),
  outOfScope({
    id: "mobile-view-custom-design",
    family: "view",
    owner: "future-mobile-view",
    mode: "view",
    state: "mobile-custom-layout",
    viewport: Object.freeze({ width: 390, height: 844 }),
    appearance: "light",
    reason: "Mobile View requires a separate purpose-built product contract and is not graded by this desktop redesign.",
  }),
]);

// Compatibility alias for existing audit journeys. New coverage code should
// use the journey name so this catalogue is not mistaken for region closure.
export const DASHBOARD_SURFACE_MANIFEST = DASHBOARD_JOURNEY_MANIFEST;

export function summarizeDashboardJourneyManifest(manifest = DASHBOARD_JOURNEY_MANIFEST) {
  const ids = manifest.map(({ id }) => id);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))].sort();
  const invalidEntries = manifest.flatMap((entry) => {
    const missing = ["id", "family", "owner", "mode", "state", "appearance", "viewport", "disposition"]
      .filter((key) => entry[key] === undefined || entry[key] === null || entry[key] === "");
    if (entry.disposition === "executable") {
      if (!entry.root) missing.push("root");
      if (typeof entry.setup !== "function") missing.push("setup");
    } else if (entry.disposition === "intentionally-out-of-scope" && !entry.reason) {
      missing.push("reason");
    } else if (entry.disposition === "coverage-alias") {
      if (!entry.aliasOf) missing.push("aliasOf");
      if (!entry.reason) missing.push("reason");
      if (!entry.equivalence?.basis || !entry.equivalence?.categories?.length) missing.push("equivalence");
      if (!manifest.some(({ id }) => id === entry.aliasOf)) missing.push("validAliasTarget");
    }
    return missing.length ? [{ id: entry.id ?? "(missing id)", missing: [...new Set(missing)] }] : [];
  });
  const audienceViewports = manifest
    .filter(({ family, disposition }) => family === "audience" && disposition === "executable")
    .map(({ viewport }) => `${viewport.width}x${viewport.height}`)
    .sort((left, right) => Number(left.split("x")[0]) - Number(right.split("x")[0]));
  return Object.freeze({
    total: manifest.length,
    executable: manifest.filter(({ disposition }) => disposition === "executable").length,
    coverageAliases: manifest.filter(({ disposition }) => disposition === "coverage-alias").length,
    intentionallyOutOfScope: manifest.filter(({ disposition }) => disposition === "intentionally-out-of-scope").length,
    families: [...new Set(manifest.map(({ family }) => family))].sort(),
    owners: [...new Set(manifest.map(({ owner }) => owner))].sort(),
    viewportWidths: [...new Set(manifest.map(({ viewport }) => viewport.width))].sort((a, b) => a - b),
    audienceViewports,
    duplicateIds,
    invalidEntries,
  });
}

export const summarizeDashboardSurfaceManifest = summarizeDashboardJourneyManifest;

async function setupLanding({ page }) {
  await page.goto("/");
  await page.getByRole("heading", { name: "SimEx Dashboard" }).waitFor();
  return { page };
}

async function setupHome({ page }) {
  await page.goto("/");
  await page.locator("[data-canonical-mode='home']").waitFor();
  return { page };
}

async function openBiomedical({ page }) {
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  return page;
}

async function setupView(context) {
  const page = await openBiomedical(context);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();
  await page.locator("[data-canonical-mode='view']").waitFor();
  return { page };
}

async function setupViewChrono(context) {
  const { page } = await setupView(context);
  await page.getByRole("button", { name: "Chrono view", exact: true }).click();
  await page.getByRole("region", { name: "Chrono playback controls" }).waitFor();
  return { page };
}

async function setupBuild(context) {
  const page = await openBiomedical(context);
  await enterBuildMode(page);
  return { page };
}

async function setupDashboardMap(context) {
  const { page } = await setupBuild(context);
  const map = await openDashboardMap(page);
  await map.getByRole("navigation", { name: "Dashboard structure" }).waitFor();
  return { page };
}

async function setupDashboardMapInspector(context) {
  const { page } = await setupDashboardMap(context);
  const map = page.getByRole("complementary", { name: "Dashboard map" });
  await map.locator(".build-inspector").waitFor();
  return { page };
}

async function setupBuildUnitOrbit(context) {
  const { page } = await setupDashboardMap(context);
  const map = page.getByRole("complementary", { name: "Dashboard map" });
  await map.getByRole("tree")
    .getByRole("treeitem", { name: "Risk perception over time", exact: true })
    .click();
  await page.locator(".unit-orbit").waitFor();
  return { page };
}

async function setupBuildPageActions(context) {
  const { page } = await setupBuild(context);
  const navigation = page.locator('[data-build-page-navigation="anchored"]');
  await navigation.getByRole("button", { name: "Biomedical", exact: true }).click();
  await navigation.getByRole("group", { name: "Biomedical Page actions", exact: true }).waitFor();
  return { page };
}

async function setupBuildPageCommandForm(context) {
  const { page } = await setupBuildPageActions(context);
  const navigation = page.locator('[data-build-page-navigation="anchored"]');
  await navigation.getByRole("button", { name: "Rename", exact: true }).click();
  await navigation.locator(".build-page-command-form").waitFor();
  return { page };
}

async function setupSectionCommandDialog(context) {
  const { page } = await setupBuild(context);
  await page.getByRole("button", { name: "Move Outbreak dynamics to Page" }).click();
  await page.getByRole("dialog", { name: "move Outbreak dynamics" }).waitFor();
  return { page };
}

async function setupBuildMore(context) {
  const { page } = await setupBuild(context);
  await page.getByRole("button", { name: "More", exact: true }).click();
  await page.getByRole("dialog", { name: "More Build commands" }).waitFor();
  return { page };
}

async function setupDashboardLook({ page }) {
  await page.goto("/");
  await page.getByRole("button", { name: "Theme", exact: true }).click();
  await page.getByRole("dialog", { name: "Theme" }).waitFor();
  return { page };
}

async function setupScenarioPassport(context) {
  const { page } = await setupBuild(context);
  await page.locator(".dashboard-scenario-trigger").click();
  await page.getByRole("complementary", { name: "Scenario Passport" }).waitFor();
  return { page };
}

async function setupSourceContent(context) {
  const { page } = await setupBuild(context);
  await openSourceContent(page);
  return { page };
}

async function setupSourceContentDetail(context) {
  const { page } = await setupSourceContent(context);
  const manager = page.getByRole("complementary", { name: "Source content authoring" });
  await manager.getByRole("tab", { name: "Data sources" }).click();
  const first = page.locator(".source-content-row").first();
  await first.waitFor();
  await first.click();
  await page.locator(".source-content-detail-card").waitFor();
  return { page };
}

async function setupChronoStudio(context) {
  const { page } = await setupBuild(context);
  await page.getByRole("button", { name: "Chrono Studio", exact: true }).click();
  await page.getByRole("dialog", { name: "Chrono Studio authoring" }).waitFor();
  return { page };
}

async function setupChronoGroupEditor(context) {
  const { page } = await setupChronoStudio(context);
  const studio = page.getByRole("dialog", { name: "Chrono Studio authoring" });
  await studio.locator("[data-action='open-content']").first().click();
  await studio.getByRole("button", { name: "Edit", exact: true }).waitFor();
  await studio.getByRole("button", { name: "Edit", exact: true }).click();
  await studio.getByRole("navigation", { name: "Chrono Group stages" }).waitFor();
  return { page };
}

async function setupSceneStudio(context) {
  const { page } = await setupBuildMore(context);
  await page.getByRole("dialog", { name: "More Build commands" })
    .getByRole("button", { name: "Scene Studio", exact: true }).click();
  const studio = page.getByRole("dialog", { name: "Scene Studio authoring" });
  await studio.waitFor();
  await studio.getByRole("button", { name: "Create Scene", exact: true }).click();
  await studio.locator(".scene-details-stage").waitFor();
  return { page };
}

async function setupSceneStudioSelect(context) {
  const { page } = await setupSceneStudio(context);
  const studio = page.getByRole("dialog", { name: "Scene Studio authoring" });
  await studio.getByRole("button", { name: /Select charts and frames/ }).click();
  await studio.locator(".scene-stage-body[data-stage='select']").waitFor();
  return { page };
}

async function setupSceneObservationDialog(context) {
  const { page } = await setupSceneStudioSelect(context);
  const studio = page.getByRole("dialog", { name: "Scene Studio authoring" });
  await studio.getByRole("button", { name: "Inspect observations" }).first().click();
  await page.locator(".scene-observation-dialog").waitFor();
  return { page };
}

async function setupSceneStudioArrange(context) {
  const { page } = await setupSceneStudio(context);
  const studio = page.getByRole("dialog", { name: "Scene Studio authoring" });
  await studio.getByRole("button", { name: /Arrange and configure/ }).click();
  await studio.locator(".scene-stage-body[data-stage='arrange']").waitFor();
  await studio.locator(".scene-arrangement-board").first().waitFor();
  return { page };
}

async function setupSceneUnitOrbit(context) {
  const { page } = await setupSceneStudioArrange(context);
  const studio = page.getByRole("dialog", { name: "Scene Studio authoring" });
  await studio.locator(".scene-arrangement-board[data-board='scene'] .scene-chart-title").first().click();
  await page.locator(".unit-orbit:has(.scene-unit-orbit)").waitFor();
  return { page };
}

async function openChartWizard(context) {
  const { page } = await setupBuild(context);
  const flow = await openChartAuthoring(page);
  return { page, flow };
}

async function setupChartWizardDestination(context) {
  const { page } = await openChartWizard(context);
  return { page };
}

async function setupChartWizardDataSource(context) {
  const { page, flow } = await openChartWizard(context);
  await flow.goToDataSource();
  return { page };
}

async function setupChartWizardSourceListbox(context) {
  const { page, flow } = await openChartWizard(context);
  await flow.goToDataSource();
  await flow.wizard.getByRole("combobox", { name: /^Managed data source\b/ }).click();
  await flow.wizard.locator(".accessible-listbox-popup").waitFor();
  return { page };
}

async function setupChartWizardChartType(context) {
  const { page, flow } = await openChartWizard(context);
  await flow.selectExistingSource("Biomedical mortality by age");
  await flow.goToChartType();
  return { page };
}

async function setupChartWizardMapAndPrepare(context) {
  const { page, flow } = await openChartWizard(context);
  await flow.selectExistingSource("Biomedical mortality by age");
  await flow.chooseChartType("pie", /^Pie\b/i);
  await flow.goToMapAndPrepare();
  return { page };
}

async function setupChartWizardConfigure(context) {
  const { page, flow } = await openChartWizard(context);
  await flow.selectExistingSource("Biomedical mortality by age");
  await flow.chooseChartType("pie", /^Pie\b/i);
  await flow.goToMapAndPrepare();
  await flow.selectRole("category", "Age group");
  await flow.selectRole("value", "deaths");
  await flow.goToConfigure();
  await flow.wizard.locator(".chart-authoring-preview-ready").waitFor();
  return { page };
}

async function setupChartWizardReviewIssues(context) {
  const { page, flow } = await openChartWizard(context);
  await flow.goToReview();
  await flow.wizard.locator(".chart-creation-issues").waitFor();
  return { page };
}

async function setupFullChartEditor(context) {
  const { page } = await setupBuild(context);
  const panel = page.locator("[data-panel-id='bio_confirmed_cases']");
  await panel.getByRole("button", { name: "Edit chart", exact: true }).click();
  const quick = page.locator(".chart-quick-editor");
  await quick.waitFor();
  await quick.getByRole("button", { name: "Open full editor", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit chart" });
  await editor.waitFor();
  await editor.getByRole("button", { name: /^Configure\./ }).click();
  return { page };
}

async function setupChartQuickEditor(context) {
  const { page } = await setupBuild(context);
  const panel = page.locator("[data-panel-id='bio_confirmed_cases']");
  await panel.getByRole("button", { name: "Edit chart", exact: true }).click();
  await page.locator(".chart-quick-editor").waitFor();
  return { page };
}

async function setupChartColorPalette(context) {
  const { page } = await setupChartWizardConfigure(context);
  const swatch = page.locator(".chart-wizard .settings-color-swatch").first();
  await swatch.click();
  await page.locator(".settings-color-popover").waitFor();
  return { page };
}

async function setupTextImageDestination(context) {
  const { page } = await setupBuild(context);
  await page.getByRole("button", { name: "Add Text/Image", exact: true }).click();
  await page.getByRole("dialog", { name: "Add Text/Image" }).waitFor();
  return { page };
}

async function setupTextImageTypePicker(context) {
  const { page } = await setupTextImageDestination(context);
  const wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Free text").waitFor();
  return { page };
}

async function openTextImageComposer(context) {
  const { page } = await setupTextImageTypePicker(context);
  const wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByLabel("Free text").check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Portable QMD Composer editing area").waitFor();
  return { page, wizard };
}

async function setupTextImageComposer(context) {
  const { page } = await openTextImageComposer(context);
  return { page };
}

async function setupTextImageAdvanced(context) {
  const { page, wizard } = await openTextImageComposer(context);
  await wizard.getByRole("button", { name: "Raw text", exact: true }).click();
  await wizard.getByLabel("Portable QMD raw source").waitFor();
  return { page };
}

async function setupStaticImageEditor(context) {
  const { page } = await setupTextImageTypePicker(context);
  const wizard = page.getByRole("dialog", { name: "Add Text/Image" });
  await wizard.getByRole("radio", { name: /^Image / }).check();
  await wizard.getByRole("button", { name: "Continue" }).click();
  await wizard.getByLabel("Alternative source").waitFor();
  return { page };
}

async function openBuildMapForCreate(context) {
  const { page } = await setupBuild(context);
  const addPage = page.getByRole("button", { name: "Add page", exact: true });
  if (!await addPage.isVisible()) {
    await openDashboardMap(page);
  }
  await addPage.waitFor();
  return page;
}

async function setupCreatePageDialog(context) {
  const page = await openBuildMapForCreate(context);
  await page.getByRole("button", { name: "Add page", exact: true }).click();
  await page.getByRole("dialog", { name: "Create Page" }).waitFor();
  return { page };
}

async function setupCreateSectionDialog(context) {
  const page = await openBuildMapForCreate(context);
  await page.getByRole("button", { name: "Add section", exact: true }).click();
  await page.getByRole("dialog", { name: "Create Section" }).waitFor();
  return { page };
}

async function setupPackageExportDialog(context) {
  let { page } = await setupScenarioPassport(context);
  let passport = page.getByRole("complementary", { name: "Scenario Passport" });
  await passport.getByRole("button", { name: /^Edit Program:/ }).click();
  await passport.getByLabel("Program", { exact: true }).fill("Density audit unfinished program");
  await passport.getByRole("button", { name: "Close", exact: true }).click();
  await page.locator(".dashboard-scenario-trigger").click();
  passport = page.getByRole("complementary", { name: "Scenario Passport" });
  await passport.getByRole("button", { name: "Download Dashboard Package", exact: true }).click();
  await page.getByRole("dialog", { name: "Finish unfinished work before download" }).waitFor();
  return { page };
}

async function setupPackageReviewDialog(context) {
  const { page } = await setupScenarioPassport(context);
  const passport = page.getByRole("complementary", { name: "Scenario Passport" });
  const bundle = await page.evaluate(async () => {
    const source = await fetch("/config/dashboard.json").then((response) => response.json());
    source.datasetProfiles = await fetch("/config/dataset-profiles.json")
      .then((response) => response.json());
    const { serializeDashboardBundle } = await import("/src/charting/config/dashboardBundleV3.js");
    return serializeDashboardBundle(source, { now: "2026-09-02T00:00:00.000Z" });
  });
  const chooserPromise = page.waitForEvent("filechooser");
  await passport.getByRole("button", { name: "Upload Dashboard Package", exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: "density-audit-dashboard.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(bundle)),
  });
  await page.getByRole("dialog", { name: "Review package contents" }).waitFor();
  return { page };
}

async function setupDeleteDashboardDialog(context) {
  const { page } = await setupScenarioPassport(context);
  const passport = page.getByRole("complementary", { name: "Scenario Passport" });
  await passport.getByRole("button", { name: "Clear dashboard", exact: true }).click();
  await page.getByRole("dialog", { name: "Delete all dashboard content?" }).waitFor();
  return { page };
}

async function setupRestoreOnlineDialog(context) {
  const { page } = await setupScenarioPassport(context);
  const passport = page.getByRole("complementary", { name: "Scenario Passport" });
  await passport.getByRole("button", { name: "Restore online dashboard", exact: true }).click();
  await page.getByRole("dialog", { name: "Restore online dashboard?" }).waitFor();
  return { page };
}

async function setupSourceContentActionDialog(context) {
  let { page } = await setupBuild(context);
  await page.evaluate(async (key) => {
    const stored = localStorage.getItem(key);
    const input = stored === null
      ? await fetch("/config/dashboard.json").then((response) => response.json())
      : JSON.parse(stored);
    const configuredProfiles = await fetch("/config/dataset-profiles.json").then((response) => response.json());
    const { normalizeDashboardSource } = await import("/src/lib/loadDashboard.js");
    const dashboard = normalizeDashboardSource(input, configuredProfiles);
    dashboard.contentLibrary ??= { mediaItems: {}, sourceEntries: {} };
    dashboard.contentLibrary.mediaItems["density-audit-unused-media"] = {
      mediaId: "density-audit-unused-media",
      revision: 1,
      current: { kind: "url", url: "https://example.test/density-audit.png" },
      displayName: "Density audit unused media",
      defaultDescription: "",
      origin: "external",
      health: "external",
    };
    const { validateConfigurationForPersistence } = await import("/src/lib/dashboardPersistenceValidation.js");
    validateConfigurationForPersistence(dashboard, configuredProfiles);
    localStorage.setItem(key, JSON.stringify(dashboard));
  }, "simex-dashboard-config-v3-three-mode-v1");
  await page.reload();
  ({ page } = await setupBuild({ ...context, page }));
  const manager = await openSourceContent(page);
  await manager.getByRole("tab", { name: "Media" }).click();
  await manager.getByLabel("Filter by usage").selectOption("unused");
  await manager.getByLabel("Search media").fill("Density audit unused media");
  await manager.locator(".source-content-row").first().click();
  await manager.getByRole("button", { name: "Delete", exact: true })
    .evaluate((button) => button.click());
  await page.getByRole("dialog", { name: "Delete Density audit unused media?" }).waitFor();
  return { page };
}

async function setupPendingOperation(context) {
  const { page } = await setupBuild(context);
  const panel = page.locator("[data-panel-id='bio_confirmed_cases']");
  await panel.getByRole("button", { name: "Edit chart", exact: true }).click();
  await page.locator(".chart-quick-editor")
    .getByRole("textbox", { name: "Chart title", exact: true })
    .fill("Density audit pending edit");
  await page.locator("[data-pending-work-id='chart-edit:bio_confirmed_cases']").waitFor();
  return { page };
}

async function setupOperationStatusNotice(context) {
  const { page } = await setupChartQuickEditor(context);
  const quick = page.locator(".chart-quick-editor");
  const title = quick.getByRole("textbox", { name: "Chart title", exact: true });
  await title.fill(`${await title.inputValue()} audit`);
  await Promise.all([
    page.locator(".operation-status-notice").first().waitFor(),
    quick.getByRole("button", { name: "Save", exact: true }).click(),
  ]);
  return { page };
}

async function setupChartComparison(context) {
  const { page } = await setupView(context);
  await page.getByRole("button", { name: "Compare charts", exact: true }).click();
  const panels = page.locator(".chart-panel");
  await panels.nth(0).getByRole("button", { name: "Add chart to comparison" }).click();
  await panels.nth(1).getByRole("button", { name: "Add chart to comparison" }).click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await page.getByRole("dialog", { name: "Chart comparison" }).waitFor();
  return { page };
}

async function setupFocusedChart(context) {
  const { page } = await setupView(context);
  const panel = page.locator("[data-panel-id='bio_confirmed_cases']");
  await panel.getByRole("button", { name: "Focus chart", exact: true }).click();
  await page.getByRole("dialog", { name: "Focused chart" }).waitFor();
  return { page };
}

async function setupChartConversionDialog({ page }) {
  await page.goto("http://127.0.0.1:4175/tests/e2e/modal-focus-harness.html");
  await loadProductionStyles(page);
  await page.locator("#root").evaluate((root) => {
    root.classList.add("app-frame");
    root.dataset.dashboardMode = "build";
  });
  await page.getByRole("button", { name: "Open conversion" }).click();
  await page.getByRole("dialog", { name: "Compatible change" }).waitFor();
  return { page };
}

async function loadProductionStyles(page) {
  for (const stylesheet of [
    "tokens.css",
    "../styles.css",
    "modes.css",
    "presentation.css",
    "dashboard-style-grammar.css",
    "dashboard-dialogs.css",
    "chart-data-state.css",
    "static-content.css",
    "source-content.css",
    "source-viewer.css",
    "immersive-display.css",
    "operation-status.css",
    "right-side-drawer.css",
    "desktop-mode-gate.css",
  ]) {
    const url = stylesheet.startsWith("../")
      ? `http://127.0.0.1:4175/src/${stylesheet.slice(3)}`
      : `http://127.0.0.1:4175/src/styles/${stylesheet}`;
    await page.addStyleTag({ url });
  }
}

async function setupChartStateHarness({ page, dashboardStyle = "evidence-ledger" }) {
  const query = new URLSearchParams({ dashboardStyle }).toString();
  await page.goto(`http://127.0.0.1:4175/tests/e2e/chart-state-harness.html?${query}`);
  await loadProductionStyles(page);
  await page.locator(CHART_STATE_HARNESS_ROOT).waitFor();
  await page.locator("[data-canonical-panel-id='recovery-proof']").waitFor();
  await page.locator("[data-canonical-panel-id='partial-proof']").waitFor();
  return { page };
}

async function setupPresent(context) {
  const page = await openBiomedical(context);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Present", exact: true }).click();
  await page.locator(".present-workspace").waitFor();
  return { page };
}

async function setupPresentChronoControls(context) {
  const { page } = await setupPresent(context);
  await page.getByRole("button", { name: "Chrono Groups", exact: true }).click();
  await page.locator(".present-action-dock").waitFor();
  return { page };
}

async function setupAudienceOptions(context) {
  const { page } = await setupPresent(context);
  await page.getByRole("button", { name: "Audience display options", exact: true }).click();
  await page.getByRole("dialog", { name: "Audience display options" }).waitFor();
  return { page };
}

async function setupAudience(context) {
  const { page } = await setupPresent(context);
  const popupPromise = context.browserContext.waitForEvent("page");
  const trigger = page.locator("[data-presentation-control-id='open-new-session']");
  await trigger.click();
  const popup = await popupPromise;
  await popup.setViewportSize(context.entry.viewport);
  await popup.waitForLoadState("domcontentloaded");
  await popup.locator(".audience-display").waitFor();
  return { page: popup };
}

async function setupSourceViewer(context) {
  const { page } = await setupBuild(context);
  const panel = page.locator("[data-panel-id='bio_confirmed_cases']");
  await panel.scrollIntoViewIfNeeded();
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    panel.getByRole("button", { name: "View source CSV", exact: true }).click(),
  ]);
  await popup.setViewportSize(context.entry.viewport);
  await popup.waitForLoadState("domcontentloaded");
  await popup.locator(".source-viewer-theme-root").waitFor();
  return { page: popup };
}

async function setupRecovery({ page }) {
  await page.route("**/config/dashboard.json", (route) => route.fulfill({ status: 503, body: "unavailable" }));
  await page.goto("/");
  await page.locator(".application-recovery").waitFor();
  return { page };
}

async function setupBuildRecommendation(context) {
  const page = await openBiomedical(context);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Build", exact: true }).click();
  await page.locator('[data-desktop-width-notice="build"]').waitFor();
  return { page };
}

async function setupPresentRecommendation(context) {
  const page = await openBiomedical(context);
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "Present", exact: true }).click();
  await page.locator('[data-desktop-width-notice="present"]').waitFor();
  return { page };
}
