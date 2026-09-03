import React from "react";
import { chartRuntimeArtifactRegistry } from "./charting/runtime/chartRuntimeArtifactRegistry.js";
import {
  commitStaticPanelTransaction,
  removeDashboardPanel,
} from "./static-content/staticPanelTransaction.js";
import { getChartSchema } from "./charting/schemas/chartSchemaRegistry.js";

import DashboardRenderer from "./components/DashboardRenderer.jsx";
import ApplicationRecovery from "./components/app-shell/ApplicationRecovery.jsx";
import AppFrame from "./components/app-shell/AppFrame.jsx";
import { useOperationStatusActions } from "./components/app-shell/OperationStatusProvider.jsx";
import CanonicalHomeWorkspace from "./components/home/CanonicalHomeWorkspace.jsx";
import ScenarioPassportPopover from "./components/app-shell/ScenarioPassportPopover.jsx";
import RestoreOnlineDashboardDialog from "./components/app-shell/RestoreOnlineDashboardDialog.jsx";
import DashboardPackageReviewDialog from "./components/build/DashboardPackageReviewDialog.jsx";
import BuildPageNavigation from "./components/build/BuildPageNavigation.jsx";
import PlaybackPageActions from "./components/playback/PlaybackPageActions.jsx";
import {
  reorderPage,
  reorderSection,
} from "./components/build/buildStructureModel.js";
import DashboardLookDrawer from "./components/dashboard-look/index.js";
import { PlaybackProvider } from "./components/playback/PlaybackProvider.jsx";
import { createPlaybackChartCollectionSelector } from "./charting/time/playbackPageScope.js";
import AudienceDisplay from "./components/presentation/AudienceDisplay.jsx";
import { applyCitationToSourceCharts } from "./charting/presentation/chartCitation.js";
import {
  integrateCreatedChart,
  integrateSavedChart,
  normalizeStoredDashboardConfig,
  parseDashboardBundle,
  serializeDashboardBundle,
} from "./charting/config/dashboardBundleV3.js";
import { browserAuthoredAssetStore, resolveBrowserAuthoredAsset } from "./static-content/assets/browserAuthoredAssetRuntime.js";
import { buildPresentableItemIndex } from "./static-content/staticPanelCapabilities.js";
import { commitDurableStaticPanelTransaction } from "./static-content/assets/durableStaticPanelCommit.js";
import { reconcileAuthoredAssets } from "./static-content/assets/reconcileAuthoredAssets.js";
import {
  createContentDraftCoordinator,
  createDeferredCoordinatorDisposal,
} from "./content-library/contentDraftTransaction.js";
import {
  decodeBrowserImageAsset,
  discardSessionImageAsset,
  IMAGE_ASSET_LIMITS,
  readSessionImageAssetBytes,
  validateImageAsset,
} from "./static-content/image/imageAssetValidation.js";

import {
  hydrateConfigurationBeforeStorageWrite,
  isDashboardProfileVersionMismatch,
  recoveryPackageError,
  recoveryPackageSummary,
} from "./lib/applicationRecovery.js";
import { browserStorage } from "./lib/browserStorage.js";
import {
  createDashboardAssetPersistence,
  readDashboardStorageWithAssets,
} from "./lib/dashboardAssetPersistence.js";
import { validateConfigurationForPersistence } from "./lib/dashboardPersistenceValidation.js";
import { parseDashboardPackageCandidate } from "./lib/dashboardPackageCandidate.js";
import { commitDashboardPackageImport } from "./lib/dashboardPackageImportTransaction.js";
import { prepareDashboardPackageExport } from "./lib/dashboardPackageExport.js";
import { createBlankDashboardContent } from "./lib/dashboardContentReset.js";
import { prepareDashboardAuthoredPersistenceCandidate } from "./lib/dashboardAuthoredRevision.js";
import {
  commitOnlineDashboardRestore,
  prepareOnlineDashboardRestore,
} from "./lib/onlineDashboardRestore.js";
import {
  initialDisplayState,
  reduceDisplayState,
} from "./lib/displayController.js";
import {
  awaitDashboardCommitQueue,
  applyDashboardEdits,
  createSerializedDashboardCommitController,
} from "./lib/dashboardCommitController.js";
import { mutateSceneDatePosition } from "./lib/sceneDatePositionMutation.js";
import {
  DASHBOARD_STORAGE_KEY,
  availableDashboardModes,
  densityForDashboardMode,
  isAvailableDashboardMode,
  persistDashboardModePreference,
  readDashboardModePreference,
  reconcileDashboardMode,
  reconcileLoadedDashboardMode,
  resolveInitialDashboardMode,
} from "./lib/dashboardMode.js";
import {
  parseDashboardEntry,
  reconcileActivePageId,
} from "./lib/dashboardNavigation.js";
import {
  loadDashboardConfig,
  loadDashboardConfigProgressively,
  loadDashboardDefinition,
  profilesForConfiguredCsvSources,
} from "./lib/loadDashboard.js";
import { catalogueMatchesDashboardSnapshot } from "./lib/quorumCatalogue.js";
import { createQuorumCompanionClient } from "./lib/quorumCompanionClient.js";
import { projectAudienceSnapshot } from "./lib/audienceProjection.js";
import { createPresentationAudienceChannel } from "./lib/presentationChannel.js";
import {
  createDashboardThemeProjection,
  persistAppearancePreference,
  readAppearancePreference,
  resolvePresentationThemeSnapshot,
  resolveDashboardTheme,
} from "./theme/dashboardTheme.js";
import {
  applyDashboardLookConfiguration,
  chartColorUpdates,
  closeDashboardLookInBackground,
  createDashboardLookCommitScheduler,
  createDashboardLookPreview,
  dashboardLookUpdates,
} from "./theme/dashboardLookDraft.js";
import { DashboardChartThemeProvider } from "./theme/DashboardChartThemeContext.jsx";

export { DASHBOARD_STORAGE_KEY } from "./lib/dashboardMode.js";
export { validateConfigurationForPersistence };

export function AudienceThemeBoundary({ theme, children }) {
  const projection = React.useMemo(
    () => createDashboardThemeProjection(theme),
    [theme],
  );
  return (
    <DashboardChartThemeProvider projection={projection}>
      {children}
    </DashboardChartThemeProvider>
  );
}

export function createDurableContentDraftCommit(persist, context = {}) {
  if (typeof persist !== "function") throw new TypeError("A dashboard persistence function is required.");
  return (candidate) => persist(candidate, { ...context, requireDurableStorage: true });
}

export function saveSceneDatePositionDurably({
  controller,
  persist,
  sceneId,
  datePosition,
}) {
  if (typeof controller?.mutateWithCommit !== "function") {
    return Promise.reject(new TypeError("A dashboard commit controller is required."));
  }
  return controller.mutateWithCommit(
    (next) => {
      mutateSceneDatePosition(next, sceneId, datePosition);
    },
    createDurableContentDraftCommit(persist),
  );
}

const DEVICE_LAYOUT_STORAGE_KEY = "simex-dashboard-device-layout-v3";
const SESSION_ONLY_MESSAGES = Object.freeze({
  dashboard: "Dashboard changes are applied for this session but cannot be retained after reload.",
  dashboardAssetStorage: "Uploaded dashboard sources are available for this session but browser asset storage is unavailable.",
  dashboardAssetStorageFull: "Browser asset storage is full. Dashboard changes and uploaded sources remain available for this session only.",
  dashboardStorageFull: "Browser storage is full. Dashboard changes remain available for this session only.",
  dashboardLook: "Theme applied for this session but cannot be retained after reload.",
  appearance: "Appearance applied for this session but cannot be retained after reload.",
  deviceLayout: "Device layout is applied for this session but cannot be retained after reload.",
  deviceLayoutStorageFull: "Browser storage is full. Device layout is applied for this session but cannot be retained after reload.",
});
const DASHBOARD_LOOK_PERSISTENCE_WARNING = "Couldn’t save dashboard appearance. Your selection remains active for this session.";
const dashboardAssetPersistence = createDashboardAssetPersistence();
const NOOP = () => {};

async function reconcileSavedAuthoredAssets(dashboard, activeRetainers = null) {
  try {
    return await reconcileAuthoredAssets({
      store: browserAuthoredAssetStore,
      dashboard,
      activeRetainers,
    });
  } catch {
    return null;
  }
}

function AppContent() {
  const { beginOperation } = useOperationStatusActions();
  const [dashboardEntry] = React.useState(() => parseDashboardEntry(
    typeof window === "undefined" ? "" : window.location.search,
  ));
  const [dashboard, setDashboard] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [operationError, setOperationError] = React.useState("");
  const [persistenceNotices, setPersistenceNotices] = React.useState({});
  const [recoveryBusy, setRecoveryBusy] = React.useState(false);
  const [recoveryError, setRecoveryError] = React.useState("");
  const [recoveryImportCandidate, setRecoveryImportCandidate] = React.useState(null);
  const [packageImportCandidate, setPackageImportCandidate] = React.useState(null);
  const [packageImportBusy, setPackageImportBusy] = React.useState(false);
  const [packageImportError, setPackageImportError] = React.useState("");
  const [onlineRestoreOpen, setOnlineRestoreOpen] = React.useState(false);
  const [onlineRestoreBusy, setOnlineRestoreBusy] = React.useState(false);
  const [onlineRestoreError, setOnlineRestoreError] = React.useState("");
  const initialModeInputsRef = React.useRef(null);
  if (initialModeInputsRef.current === null) {
    initialModeInputsRef.current = {
      storedMode: dashboardEntry.surface === "workspace"
        ? readDashboardModePreference()
        : null,
      requestedMode: dashboardEntry.requestedMode,
    };
  }
  const initialModeResolvedRef = React.useRef(false);
  const [mode, setMode] = React.useState(null);
  const modeRef = React.useRef(mode);
  modeRef.current = mode;
  const [modeDisabled, setModeDisabled] = React.useState(false);
  const [buildDraftLocked, setBuildDraftLocked] = React.useState(false);
  const [buildPanelOpen, setBuildPanelOpen] = React.useState(false);
  const [buildStructureProjection, setBuildStructureProjection] = React.useState(null);
  const [scenarioPassportOpen, setScenarioPassportOpen] = React.useState(false);
  const [scenarioPassportDirty, setScenarioPassportDirty] = React.useState(false);
  const [scenarioPassportResetRevision, setScenarioPassportResetRevision] = React.useState(0);
  const [compareSelectionActive, setCompareSelectionActive] = React.useState(false);
  const [blockedReason, setBlockedReason] = React.useState("");
  const [activePageId, setActivePageId] = React.useState(null);
  const [editBaseline, setEditBaseline] = React.useState(null);
  const [deviceLayout, setDeviceLayout] = React.useState(() => loadDeviceLayout());
  const [displayState, setDisplayState] = React.useState(initialDisplayState);
  const [companionStatus, setCompanionStatus] = React.useState("standalone");
  const [audienceProjection, setAudienceProjection] = React.useState(null);
  const [audienceConnectionStatus, setAudienceConnectionStatus] = React.useState("waiting");
  const [appearancePreference, setAppearancePreference] = React.useState(() => readAppearancePreference());
  const [lookDrawerOpen, setLookDrawerOpen] = React.useState(false);
  const [lookPreview, setLookPreview] = React.useState(null);
  const [lookSavingScope, setLookSavingScope] = React.useState("");
  const [lookStatus, setLookStatus] = React.useState("");
  const [lookError, setLookError] = React.useState("");
  const [prefersDark, setPrefersDark] = React.useState(() => (
    typeof window !== "undefined"
      && window.matchMedia?.("(prefers-color-scheme: dark)").matches === true
  ));
  const displayStateRef = React.useRef(displayState);
  const audienceLastValidProjectionRef = React.useRef(null);
  const audienceChannelRef = React.useRef(null);
  const dashboardRef = React.useRef(null);
  const trackedDatasetProfilesRef = React.useRef({});
  const dashboardCommitControllerRef = React.useRef(null);
  const lookCommitSchedulerRef = React.useRef(null);
  const playbackChartSelectorRef = React.useRef(createPlaybackChartCollectionSelector());
  const lastDashboardPersistenceRef = React.useRef(true);
  const validChartIdsRef = React.useRef(new Set());
  const companionClientRef = React.useRef(null);
  const dashboardRendererRef = React.useRef(null);
  const buildPanelScrollRef = React.useRef(null);
  const contentDraftCoordinatorRef = React.useRef(null);
  const contentDraftCoordinatorDisposalRef = React.useRef(null);
  if (contentDraftCoordinatorRef.current === null) {
    contentDraftCoordinatorRef.current = createContentDraftCoordinator({
      getDashboard: () => dashboardRef.current,
      commitDashboard: commitDurableContentDraftConfiguration,
      runDashboardTransaction: runDurableContentDraftTransaction,
      assetStore: browserAuthoredAssetStore,
      readSessionAsset: readSessionImageAssetBytes,
      discardSessionAsset: discardSessionImageAsset,
    });
  }
  const contentDraftCoordinator = contentDraftCoordinatorRef.current;
  if (contentDraftCoordinatorDisposalRef.current === null) {
    contentDraftCoordinatorDisposalRef.current = createDeferredCoordinatorDisposal();
  }
  const playbackChartCollections = playbackChartSelectorRef.current(dashboard, activePageId);
  const validChartIds = React.useMemo(
    () => new Set(playbackChartCollections.charts.map(({ id }) => id)),
    [playbackChartCollections.charts],
  );
  validChartIdsRef.current = validChartIds;
  const presentableItemIndex = React.useMemo(
    () => buildPresentableItemIndex(dashboard),
    [dashboard],
  );
  const playbackGroups = React.useMemo(
    () => readyChronoGroups(dashboard),
    [dashboard?.dataSourceStates, dashboard?.pages, dashboard?.chronoGroups],
  );
  const savedDashboardTheme = React.useMemo(() => resolveDashboardTheme({
    globalStyles: dashboard?.globalStyles,
    appearancePreference,
    prefersDark,
  }), [appearancePreference, dashboard?.globalStyles, prefersDark]);
  const dashboardTheme = React.useMemo(() => resolveDashboardTheme({
    globalStyles: lookPreview ? {
      ...(dashboard?.globalStyles ?? {}),
      ...dashboardLookUpdates(lookPreview),
      ...chartColorUpdates(lookPreview),
    } : dashboard?.globalStyles,
    appearancePreference: lookPreview?.appearancePreference ?? appearancePreference,
    prefersDark,
  }), [appearancePreference, dashboard?.globalStyles, lookPreview, prefersDark]);
  const dashboardThemeProjection = React.useMemo(
    () => createDashboardThemeProjection(dashboardTheme),
    [dashboardTheme],
  );
  const audienceDashboardTheme = React.useMemo(
    () => resolvePresentationThemeSnapshot(audienceProjection?.theme, dashboardTheme),
    [audienceProjection?.theme, dashboardTheme],
  );

  React.useEffect(() => {
    const scheduler = createDashboardLookCommitScheduler({
      onCommit: commitDashboardLookPreview,
      onError: () => setLookSavingScope(""),
    });
    lookCommitSchedulerRef.current = scheduler;
    return () => {
      if (lookCommitSchedulerRef.current === scheduler) {
        lookCommitSchedulerRef.current = null;
      }
      void scheduler.flush().finally(() => scheduler.dispose());
    };
  }, []);

  React.useEffect(
    () => contentDraftCoordinatorDisposalRef.current.retain(contentDraftCoordinator),
    [contentDraftCoordinator],
  );

  React.useEffect(() => contentDraftCoordinator.subscribe((activeRetainers) => {
    const current = dashboardRef.current;
    if (current) void reconcileSavedAuthoredAssets(current, activeRetainers);
  }), [contentDraftCoordinator]);

  React.useEffect(() => {
    if (mode !== "build") setScenarioPassportOpen(false);
  }, [mode]);

  const commandCrownProjection = React.useMemo(() => {
    const projectedDashboard = mode === "build" && buildStructureProjection
      ? buildStructureProjection
      : dashboard;
    const pages = Object.freeze((projectedDashboard?.pages ?? []).map((page) => Object.freeze({
      id: page.id,
      label: page.label ?? page.title ?? page.id,
      title: page.title ?? page.label ?? page.id,
      landing: page.landing,
    })));
    const activePage = pages.find(({ id }) => id === activePageId) ?? pages[0] ?? null;
    return Object.freeze({
      dashboardIdentity: Object.freeze({
        title: projectedDashboard?.title ?? projectedDashboard?.programLabel ?? "SimEx Dashboard",
        programLabel: projectedDashboard?.programLabel ?? "SimEx Dashboard",
        scenarioLabel: projectedDashboard?.scenarioLabel ?? "Scenario unavailable",
        lastUpdated: projectedDashboard?.lastUpdated ?? "",
      }),
      activePage,
      pages,
    });
  }, [
    activePageId,
    buildStructureProjection,
    dashboard?.lastUpdated,
    dashboard?.pages,
    dashboard?.programLabel,
    dashboard?.scenarioLabel,
    dashboard?.title,
    mode,
  ]);

  function closeBuildPanel() {
    const previousScroll = buildPanelScrollRef.current;
    setBuildPanelOpen(false);
    buildPanelScrollRef.current = null;
    if (previousScroll) {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        window.scrollTo(previousScroll);
      }));
    }
  }

  function toggleBuildPanel() {
    if (!buildPanelOpen) {
      buildPanelScrollRef.current = { left: window.scrollX, top: window.scrollY };
      setBuildPanelOpen(true);
      return;
    }
    closeBuildPanel();
  }

  const commandCrownPageActions = mode === "home" ? (
    <button type="button" className="secondary dashboard-look-trigger" onClick={openDashboardLook}>
      Theme
    </button>
  ) : mode === "view" ? (
    <>
      <button type="button" className="secondary dashboard-look-trigger" onClick={openDashboardLook}>
        Theme
      </button>
      <PlaybackPageActions />
      <button
        type="button"
        className="secondary view-comparison-button"
        aria-pressed={compareSelectionActive}
        disabled={compareSelectionActive}
        onClick={() => dashboardRendererRef.current?.requestCompareCharts?.()}
      >
        Compare charts
      </button>
    </>
  ) : mode === "build" ? (
    <>
      <button
        type="button"
        className="secondary dashboard-look-trigger"
        disabled={modeDisabled || buildDraftLocked}
        onClick={openDashboardLook}
      >
        Theme
      </button>
      <button
        type="button"
        className="secondary dashboard-map-toggle"
        aria-controls="dashboard-map-panel"
        aria-expanded={buildPanelOpen}
        aria-pressed={buildPanelOpen}
        disabled={modeDisabled}
        onClick={toggleBuildPanel}
      >
        Dashboard map
      </button>
    </>
  ) : null;

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const applyColorScheme = () => setPrefersDark(colorScheme.matches);
    applyColorScheme();
    colorScheme.addEventListener?.("change", applyColorScheme);
    return () => colorScheme.removeEventListener?.("change", applyColorScheme);
  }, []);

  React.useEffect(() => {
    let disposed = false;
    loadDashboardDefinition(`${import.meta.env.BASE_URL}config/dashboard.json`)
      .then(async (definition) => {
        const trackedProfiles = definition.datasetProfiles ?? {};
        const tracked = {
          ...definition.dashboard,
          datasetProfiles: trackedProfiles,
        };
        trackedDatasetProfilesRef.current = trackedProfiles;
        const stored = await readDashboardStorageWithAssets(
          browserStorage,
          DASHBOARD_STORAGE_KEY,
          {
            profiles: trackedProfiles,
            assets: dashboardAssetPersistence,
          },
        );
        const selected = stored ?? configurationForStorage(
          tracked,
          trackedProfiles,
        );
        const profiles = selected.datasetProfiles ?? trackedProfiles;
        const portableSources = stored ? null : definition.portableSources;
        const publish = (loaded) => {
          if (disposed) return;
          dashboardRef.current = loaded;
          if (dashboardEntry.surface === "workspace") {
            ensureDashboardCommitController(loaded);
          }
          setDashboard(loaded);
          setError(null);
        };
        if (dashboardEntry.surface === "audience") {
          const loaded = await loadDashboardConfig(
            selected,
            profiles,
            portableSources,
            { readAuthoredAsset: (assetId) => browserAuthoredAssetStore.read(assetId) },
          );
          publish(loaded);
          await reconcileSavedAuthoredAssets(loaded, contentDraftCoordinator.getActiveRetainers());
          return;
        }
        const loaded = await loadDashboardConfigProgressively(
          selected,
          profiles,
          portableSources,
          {
            onUpdate: publish,
            readAuthoredAsset: (assetId) => browserAuthoredAssetStore.read(assetId),
          },
        );
        await reconcileSavedAuthoredAssets(loaded, contentDraftCoordinator.getActiveRetainers());
      })
      .catch((loadError) => {
        if (!disposed) setError(loadError);
      });
    return () => {
      disposed = true;
    };
  }, [dashboardEntry.surface]);

  React.useEffect(() => {
    if (
      dashboardEntry.surface !== "audience"
      || !dashboardEntry.channelId
      || !dashboard
    ) {
      return undefined;
    }
    let channel;
    try {
      channel = createPresentationAudienceChannel({
        sessionId: dashboardEntry.channelId,
        presentableItemIndex,
        onMessageAccepted: (message) => {
          const result = projectAudienceSnapshot(
            message,
            audienceLastValidProjectionRef.current,
          );
          if (!result.accepted) return;
          audienceLastValidProjectionRef.current = result.lastValid;
          setAudienceProjection(result.projection);
        },
        onThemeChange: (theme) => {
          const applyTheme = (projection) => projection?.kind === "output"
            ? Object.freeze({ ...projection, theme: Object.freeze(structuredClone(theme)) })
            : projection;
          audienceLastValidProjectionRef.current = applyTheme(
            audienceLastValidProjectionRef.current,
          );
          setAudienceProjection(applyTheme);
        },
        onConnectionChange: setAudienceConnectionStatus,
      });
      channel.start();
      audienceChannelRef.current = channel;
    } catch {
      audienceChannelRef.current = null;
      setAudienceConnectionStatus("waiting");
    }
    return () => {
      if (audienceChannelRef.current === channel) audienceChannelRef.current = null;
      channel?.dispose();
    };
  }, [dashboard, dashboardEntry.channelId, dashboardEntry.surface, presentableItemIndex]);

  const publishAudienceDatePosition = React.useCallback((datePosition, pointerDownSource) => (
    audienceChannelRef.current?.publishDatePosition(datePosition, pointerDownSource) ?? null
  ), []);

  React.useEffect(() => () => {
    dashboardCommitControllerRef.current?.dispose();
  }, []);

  React.useEffect(() => {
    const current = displayStateRef.current;
    const next = reduceDisplayState(
      current,
      {
        type: "companion_reconcile",
        chart_ids: current.displayed_chart_ids.filter((id) => validChartIds.has(id)),
      },
      validChartIds,
    );
    if (next !== current) {
      displayStateRef.current = next;
      setDisplayState(next);
    }
  }, [validChartIds]);

  const dispatchDisplayAction = React.useCallback((action) => {
    const current = displayStateRef.current;
    const next = reduceDisplayState(
      current,
      action,
      validChartIdsRef.current,
    );
    const shouldShowCompanionDisplay = action.type === "companion_set"
      && next.displayed_chart_ids.length > 0
      && modeRef.current === "home";
    if (next !== current) {
      displayStateRef.current = next;
      setDisplayState(next);
      const reason = displayActionReason(action);
      if (reason) companionClientRef.current?.displayStateChanged(reason);
    }
    if (shouldShowCompanionDisplay) {
      modeRef.current = "view";
      setMode("view");
    }
    return next;
  }, []);

  React.useEffect(() => {
    if (dashboardEntry.surface === "audience") return undefined;
    if (!dashboard) return undefined;
    let disposed = false;
    let client = null;
    Promise.all([
      fetchJson(`${import.meta.env.BASE_URL}integration/quorum-chart-catalogue.json`),
      fetchJson(`${import.meta.env.BASE_URL}config/chart-aliases.json`),
    ])
      .then(async ([catalogue, aliases]) => {
        const matches = await catalogueMatchesDashboardSnapshot(
          configurationForSemanticUse(dashboard),
          aliases,
          catalogue,
        );
        if (disposed) return;
        if (!matches) {
          setCompanionStatus("incompatible");
          return;
        }
        client = createQuorumCompanionClient({
          catalogue,
          getDisplayState: () => displayStateRef.current,
          dispatchDisplayAction,
          onStatus: (status) => {
            if (!disposed) setCompanionStatus(status);
          },
        });
        companionClientRef.current = client;
        await client.start();
      })
      .catch(() => {
        if (!disposed) setCompanionStatus("disconnected");
      });
    return () => {
      disposed = true;
      if (companionClientRef.current === client) {
        companionClientRef.current = null;
      }
      client?.stop();
    };
  }, [dashboard, dashboardEntry.surface, dispatchDisplayAction]);

  React.useEffect(() => {
    if (!dashboard) return;
    setActivePageId((current) => reconcileActivePageId(dashboard.pages, current));
    if (!initialModeResolvedRef.current) {
      initialModeResolvedRef.current = true;
      setMode(resolveInitialDashboardMode({
        ...initialModeInputsRef.current,
        dashboard,
      }));
      return;
    }
    const nextMode = reconcileLoadedDashboardMode(mode, dashboard);
    if (nextMode === mode) return;
    setMode(nextMode);
  }, [dashboard, mode]);

  function ensureDashboardCommitController(initialDashboard = dashboardRef.current) {
    if (dashboardCommitControllerRef.current === null) {
      dashboardCommitControllerRef.current =
        createSerializedDashboardCommitController({
          initialDashboard: configurationForPortableUse(initialDashboard),
          commit: persistSessionAwareConfiguration,
        });
    }
    return dashboardCommitControllerRef.current;
  }

  function reportPersistence(scope, persisted, message) {
    setPersistenceNotices((current) => {
      const next = { ...current };
      if (persisted) delete next[scope];
      else next[scope] = message;
      return next;
    });
  }

  function persistDashboardStorage(serialized) {
    const persisted = browserStorage.setItem(DASHBOARD_STORAGE_KEY, serialized);
    lastDashboardPersistenceRef.current = persisted;
    reportPersistence(
      "dashboard",
      persisted,
      SESSION_ONLY_MESSAGES.dashboard,
    );
    return persisted;
  }

  async function persistConfiguration(nextConfig, context = {}) {
    const { requireDurableStorage = false } = context;
    try {
      const trackedProfiles = trackedDatasetProfilesRef.current;
      const authoredCandidate = prepareDashboardAuthoredPersistenceCandidate({
        previous: dashboardRef.current ?? nextConfig,
        candidate: nextConfig,
        context,
      });
      const profiles = authoredCandidate.datasetProfiles
        ?? dashboardRef.current?.datasetProfiles
        ?? {};
      const stored = canonicalConfigurationForStorage(
        { ...authoredCandidate, datasetProfiles: profiles },
        trackedProfiles,
      );
      const unstampedStored = canonicalConfigurationForStorage(
        { ...nextConfig, datasetProfiles: profiles },
        trackedProfiles,
      );
      const configuredFallbackProfiles = profilesForConfiguredCsvSources(
        stored.dataSources,
        trackedProfiles,
      );
      validateConfigurationForPersistence(stored, configuredFallbackProfiles);
      const loadSessionCandidate = () => loadDashboardConfig(
        unstampedStored,
        configuredFallbackProfiles,
        null,
        { readAuthoredAsset: (assetId) => browserAuthoredAssetStore.read(assetId) },
      );
      let prepared;
      try {
        prepared = await dashboardAssetPersistence.prepare(stored);
      } catch (assetError) {
        if (!isDashboardAssetStorageError(assetError)) throw assetError;
        if (requireDurableStorage) throw assetError;
        const sessionDashboard = await loadSessionCandidate();
        lastDashboardPersistenceRef.current = false;
        reportPersistence(
          "dashboard",
          false,
          assetError.code === "DASHBOARD_ASSET_QUOTA_EXHAUSTED"
            ? SESSION_ONLY_MESSAGES.dashboardAssetStorageFull
            : SESSION_ONLY_MESSAGES.dashboardAssetStorage,
        );
        dashboardRef.current = sessionDashboard;
        setDashboard(sessionDashboard);
        setError(null);
        setOperationError("");
        return configurationForPortableUse(sessionDashboard);
      }
      let loaded;
      try {
        loaded = await loadDashboardConfig(
          prepared.runtimeConfig,
          configuredFallbackProfiles,
          null,
          { readAuthoredAsset: (assetId) => browserAuthoredAssetStore.read(assetId) },
        );
      } catch (loadError) {
        await prepared.rollback();
        throw loadError;
      }
      try {
        const persisted = persistDashboardStorage(JSON.stringify(prepared.storageConfig, null, 2));
        if (!persisted) {
          if (requireDurableStorage) {
            await prepared.rollback();
            throw new Error("Browser dashboard storage is unavailable.");
          }
          loaded = await loadSessionCandidate();
        }
      } catch (storageError) {
        if (!isStorageQuotaError(storageError)) {
          await prepared.rollback();
          throw storageError;
        }
        if (requireDurableStorage) {
          await prepared.rollback();
          throw storageError;
        }
        lastDashboardPersistenceRef.current = false;
        reportPersistence(
          "dashboard",
          false,
          SESSION_ONLY_MESSAGES.dashboardStorageFull,
        );
        loaded = await loadSessionCandidate();
      }
      dashboardRef.current = loaded;
      setDashboard(loaded);
      setError(null);
      setOperationError("");
      return configurationForPortableUse(loaded);
    } catch (commitError) {
      if (isStorageQuotaError(commitError)) {
        throw new Error(
          "Browser storage is full. Remove an uploaded dataset or choose a smaller CSV, then try again.",
          { cause: commitError },
        );
      }
      throw commitError;
    }
  }

  async function persistDashboardLookConfiguration(nextConfig) {
    try {
      const trackedProfiles = trackedDatasetProfilesRef.current;
      const stored = canonicalConfigurationForStorage(nextConfig, trackedProfiles);
      const configuredFallbackProfiles = profilesForConfiguredCsvSources(
        stored.dataSources,
        trackedProfiles,
      );
      validateConfigurationForPersistence(stored, configuredFallbackProfiles);
      const prepared = await dashboardAssetPersistence.prepare(stored);
      persistDashboardStorage(JSON.stringify(prepared.storageConfig, null, 2));
      setError(null);
      setOperationError("");
      return nextConfig;
    } catch (commitError) {
      if (isStorageQuotaError(commitError)) {
        throw new Error(
          "Browser storage is full. Remove an uploaded dataset or choose a smaller CSV, then try again.",
          { cause: commitError },
        );
      }
      throw commitError;
    }
  }

  function commitConfiguration(nextConfig, context = {}) {
    return ensureDashboardCommitController().replaceWith(
      configurationForPortableUse(nextConfig),
      (candidate) => persistSessionAwareConfiguration(candidate, context),
    );
  }

  function mutateDashboard(mutator, context = {}) {
    const transaction = ensureDashboardCommitController().mutateWithCommit(
      mutator,
      (candidate) => persistSessionAwareConfiguration(candidate, context),
    );
    reportBackgroundPersistence(transaction);
    return transaction;
  }

  function replaceRecoveryDashboardController(loaded) {
    dashboardCommitControllerRef.current?.dispose();
    dashboardCommitControllerRef.current = null;
    if (dashboardEntry.surface === "workspace") {
      ensureDashboardCommitController(loaded);
    }
  }

  async function reloadDashboardFromSource() {
    if (recoveryBusy) return;
    setRecoveryBusy(true);
    setRecoveryError("");
    setRecoveryImportCandidate(null);
    try {
      const definition = await loadDashboardDefinition(
        `${import.meta.env.BASE_URL}config/dashboard.json`,
      );
      const trackedProfiles = definition.datasetProfiles ?? {};
      trackedDatasetProfilesRef.current = trackedProfiles;
      const tracked = {
        ...definition.dashboard,
        datasetProfiles: trackedProfiles,
      };
      const loaded = await hydrateConfigurationBeforeStorageWrite({
        candidate: tracked,
        hydrate: (candidate) => loadDashboardConfig(
          candidate,
          trackedProfiles,
          definition.portableSources,
        ),
        persist: (candidate) => persistDashboardStorage(JSON.stringify(
          configurationForStorage(candidate, trackedProfiles),
          null,
          2,
        )),
      });
      dashboardRef.current = loaded;
      replaceRecoveryDashboardController(loaded);
      setDashboard(loaded);
      setError(null);
      setOperationError("");
    } catch {
      setRecoveryError(
        "Dashboard couldn’t be reloaded. Import a current version 3 dashboard package or try again.",
      );
    } finally {
      setRecoveryBusy(false);
    }
  }

  async function chooseRecoveryPackage(file) {
    if (!file || recoveryBusy) return;
    const status = beginOperation({
      key: "recovery-package-read",
      label: "Reading recovery package",
      priority: true,
    });
    setRecoveryBusy(true);
    setRecoveryError("");
    try {
      await status.beforeWork();
      const config = parseDashboardBundle(await file.text());
      setRecoveryImportCandidate({
        config,
        fileName: file.name,
        summary: recoveryPackageSummary(config),
      });
      status.succeed("Recovery package ready.");
    } catch (packageError) {
      status.fail(packageError);
      setRecoveryImportCandidate(null);
      setRecoveryError(recoveryPackageError(packageError));
    } finally {
      setRecoveryBusy(false);
    }
  }

  async function confirmRecoveryPackage() {
    if (!recoveryImportCandidate || recoveryBusy) return;
    const status = beginOperation({
      key: "recovery-package-import",
      label: "Restoring dashboard package",
      blocking: true,
      priority: true,
    });
    setRecoveryBusy(true);
    setRecoveryError("");
    try {
      await status.beforeWork();
      await persistConfiguration(recoveryImportCandidate.config, {
        preserveAuthoredRevision: true,
        transactionId: "recovery-package-import",
      });
      replaceRecoveryDashboardController(dashboardRef.current);
      setRecoveryImportCandidate(null);
      status.succeed("Dashboard package restored.");
    } catch (packageError) {
      status.fail(packageError);
      setRecoveryError(recoveryPackageError(packageError));
    } finally {
      setRecoveryBusy(false);
    }
  }

  function openDashboardLook() {
    setLookPreview(createDashboardLookPreview(savedDashboardTheme));
    setLookStatus("");
    setLookError("");
    setLookDrawerOpen(true);
  }

  function cancelDashboardLook() {
    const selectedPreview = lookPreview;
    closeDashboardLookInBackground({
      scheduler: lookCommitSchedulerRef.current,
      onApply: () => {
        if (!selectedPreview || !dashboardRef.current) return;
        const current = dashboardRef.current;
        const next = applyDashboardLookConfiguration({
          ...current,
          globalStyles: {
            ...(current.globalStyles ?? {}),
            ...dashboardLookUpdates(selectedPreview),
            ...chartColorUpdates(selectedPreview),
          },
        }, current);
        dashboardRef.current = next;
        setDashboard(next);
        return next;
      },
      onCanonicalize: (next) => {
        if (!next) return;
        void ensureDashboardCommitController(next).adopt(
          configurationForPortableUse(next),
        );
      },
      onClose: () => {
        setLookDrawerOpen(false);
        setLookPreview(null);
        setLookStatus("");
        setLookError("");
      },
    });
  }

  function changeDashboardLookPreview(nextPreview) {
    const previous = lookPreview;
    setLookPreview(nextPreview);
    setLookStatus("");
    setLookError("");
    if (!previous) return;

    const dashboardChanged = previous.dashboardStyle !== nextPreview.dashboardStyle
      || previous.dashboardColorProfile !== nextPreview.dashboardColorProfile
      || previous.chartColorMode !== nextPreview.chartColorMode;
    if (dashboardChanged) {
      lookCommitSchedulerRef.current.schedule(nextPreview);
    }

    if (previous.appearancePreference !== nextPreview.appearancePreference) {
      try {
        const persisted = persistAppearancePreference(nextPreview.appearancePreference);
        setAppearancePreference(nextPreview.appearancePreference);
        reportPersistence(
          "appearance",
          persisted,
          SESSION_ONLY_MESSAGES.appearance,
        );
        setLookStatus(persisted
          ? "Appearance saved for this browser."
          : SESSION_ONLY_MESSAGES.appearance);
      } catch (preferenceError) {
        setLookError(boundedBackgroundPersistenceError(preferenceError).message);
      }
    }
  }

  async function deleteDashboardContent() {
    return runOperationWithStatus({
      key: "clear-dashboard",
      label: "Clearing dashboard",
      blocking: true,
      intent: "warning",
    }, () => clearDashboardContentDurably({
        controller: ensureDashboardCommitController(),
        persist: persistConfiguration,
        cleanup: async (previous, committed) => {
          setOperationError("");
          await cleanupReplacedDashboardAssets(previous, committed, {
            failureMessage: "Dashboard content was deleted, but unused browser source files could not be removed.",
          });
        },
        onResetScenario: () => {
          setScenarioPassportOpen(false);
          setScenarioPassportDirty(false);
          dashboardRendererRef.current?.setAuthoredDirtyFlag?.("scenario", false);
          setScenarioPassportResetRevision((current) => current + 1);
        },
        onModeChange: setMode,
        onPersistMode: persistDashboardModePreference,
        onFocusMode: NOOP,
      }), "Dashboard cleared.");
  }

  async function cleanupReplacedDashboardAssets(
    previousDashboard,
    replacementDashboard,
    { failureMessage, transactionKind = "dashboard-replacement" } = {},
  ) {
    if (!lastDashboardPersistenceRef.current) return;
    try {
      await dashboardAssetPersistence.removeDashboardAssets(previousDashboard, {
        retainedDashboard: replacementDashboard,
      });
    } catch {
      setOperationError(
        failureMessage ?? (
          transactionKind === "panel-removal"
            ? "The panel was removed, but its unused browser source files could not be removed."
            : "Unused browser source files could not be removed."
        ),
      );
    }
  }

  async function commitDashboardLookPreview(nextPreview) {
    const status = beginOperation({
      key: "dashboard-look",
      label: "Saving theme",
      priority: true,
    });
    setLookSavingScope("auto");
    setLookError("");
    try {
      await status.beforeWork();
      await ensureDashboardCommitController().mutateWithCommit((next) => {
        next.globalStyles = {
          ...(next.globalStyles ?? {}),
          ...dashboardLookUpdates(nextPreview),
          ...chartColorUpdates(nextPreview),
        };
      }, persistDashboardLookConfiguration);
      const message = lastDashboardPersistenceRef.current
        ? "Theme saved."
        : SESSION_ONLY_MESSAGES.dashboardLook;
      setLookStatus(message);
      status.succeed(message);
    } catch (error) {
      setLookError(DASHBOARD_LOOK_PERSISTENCE_WARNING);
      status.fail(DASHBOARD_LOOK_PERSISTENCE_WARNING);
      throw error;
    } finally {
      setLookSavingScope("");
    }
  }

  async function runOperationWithStatus(options, action, successMessage) {
    const status = beginOperation({ ...options, priority: true });
    try {
      await status.beforeWork();
      const result = await action();
      status.succeed(successMessage);
      return result;
    } catch (error) {
      status.fail(error);
      throw error;
    }
  }

  function reportBackgroundPersistence(promise) {
    void promise
      .then(() => setOperationError(""))
      .catch((commitError) => {
        setOperationError(boundedBackgroundPersistenceError(commitError).message);
      });
  }

  function reportBackgroundPersistenceError(commitError) {
    setOperationError(boundedBackgroundPersistenceError(commitError).message);
  }

  async function requestMode(nextMode) {
    if (nextMode === mode) return { ok: true, mode: nextMode };
    if (
      dashboardEntry.surface !== "workspace"
      || !isAvailableDashboardMode(nextMode, dashboardRef.current ?? dashboard)
    ) {
      return {
        ok: false,
        mode,
        reason: "That dashboard mode is unavailable.",
      };
    }
    setModeDisabled(true);
    setBlockedReason("");
    try {
      if (mode === "build") {
        const result = await prepareToLeaveBuild();
        if (!result?.ok) {
          const reason = result?.reason ?? "Finish the current Build operation before changing mode.";
          setBlockedReason(reason);
          return { ok: false, mode, reason };
        }
        for (const owner of ["manager", "qmd", "qmd-panel", "image", "chart"]) {
          await contentDraftCoordinator.discardOwner(owner, { reason: "mode-departure" });
        }
        setEditBaseline(null);
      }
      if (nextMode === "build") {
        setEditBaseline(configurationForEditBaseline(
          dashboardRef.current ?? dashboard,
          trackedDatasetProfilesRef.current,
        ));
      }
      setMode(nextMode);
      persistDashboardModePreference(nextMode);
      return { ok: true, mode: nextMode };
    } catch (modeError) {
      const reason = boundedBackgroundPersistenceError(modeError).message;
      setBlockedReason(reason);
      return { ok: false, mode, reason };
    } finally {
      setModeDisabled(false);
    }
  }

  async function prepareToLeaveBuild(destination = "mode") {
    return dashboardRendererRef.current?.prepareToLeaveBuild?.(destination)
      ?? { ok: true };
  }

  async function requestPage(nextPageId) {
    const navigablePages = mode === "build" && buildStructureProjection
      ? buildStructureProjection.pages
      : dashboard?.pages;
    if (!(navigablePages ?? []).some(({ id }) => id === nextPageId)) return;
    if (mode === "home") {
      setActivePageId(nextPageId);
      await requestMode("view");
      return;
    }
    if (nextPageId === activePageId) return;
    setBlockedReason("");
    if (mode === "build") {
      const result = await prepareToLeaveBuild("page");
      if (!result?.ok) {
        setBlockedReason(
          result?.reason ?? "Finish the current Build operation before changing Page.",
        );
        return;
      }
    }
    setActivePageId(nextPageId);
  }

  async function resetEditSession() {
    const result = await prepareToLeaveBuild();
    if (!result.ok) {
      throw new Error(
        result.reason ?? "Finish the current Build operation before changing mode.",
      );
    }
    const resetDashboard = editBaseline
      ? await commitConfiguration(editBaseline, {
          preserveAuthoredRevision: true,
          rollback: true,
          transactionId: "build-baseline-restoration",
        })
      : configurationForPortableUse(dashboardRef.current ?? dashboard);
    setEditBaseline(null);
    setMode("view");
    if (dashboardEntry.surface === "workspace") {
      persistDashboardModePreference("view");
    }
    return resetDashboard;
  }

  async function createChart(payload, target, { reportStatus = true } = {}) {
    requireChartAuthoringPayload(payload);
    const create = async () => {
      const committed = await ensureDashboardCommitController().mutate((current) => (
        integrateCreatedChart(current, payload, target)
      ));
      publishCommittedChartArtifact(payload?.runtimeArtifact);
      return committed;
    };
    if (!reportStatus) return create();
    return runOperationWithStatus({
      key: "chart-create",
      label: "Creating chart",
    }, create, "Chart created.");
  }

  async function saveChart(payload, { reportStatus = true } = {}) {
    requireChartAuthoringPayload(payload);
    const save = async () => {
      const committed = await ensureDashboardCommitController().mutate((current) => (
        integrateSavedChart(current, payload)
      ));
      publishCommittedChartArtifact(payload?.runtimeArtifact);
      return committed;
    };
    if (!reportStatus) return save();
    return runOperationWithStatus({
      key: "chart-save",
      label: "Saving chart",
    }, save, "Chart saved.");
  }

  function commitDurableContentDraftConfiguration(nextConfig, context = {}) {
    return ensureDashboardCommitController().replaceWith(
      configurationForPortableUse(nextConfig),
      createDurableContentDraftCommit(persistConfiguration, context),
    );
  }

  function runDurableContentDraftTransaction(operation) {
    return ensureDashboardCommitController().runTransaction(({ getCurrent, replaceWith }) => operation({
      getDashboard: getCurrent,
      commitDashboard: (nextConfig, context = {}) => replaceWith(
        configurationForPortableUse(nextConfig),
        createDurableContentDraftCommit(persistConfiguration, context),
      ),
    }));
  }

  function commitImportedConfiguration(nextConfig, context = {}) {
    const portable = configurationForPortableUse(nextConfig);
    return ensureDashboardCommitController().replaceWith(
      portable,
      (candidate) => persistConfiguration(candidate, {
        ...context,
        preserveAuthoredRevision: true,
        requireDurableStorage: true,
      }),
    );
  }

  async function persistSessionAwareConfiguration(nextConfig, context = {}) {
    return persistConfiguration(nextConfig, context);
  }

  async function commitStaticPanel(prepared, { reportStatus = true } = {}) {
    const status = reportStatus ? beginOperation({
      key: "static-content-save",
      label: "Saving dashboard content",
      priority: true,
    }) : null;
    await status?.beforeWork();
    const controller = ensureDashboardCommitController();
    const previousDashboard = controller.getCurrent();
    try {
      if (hasStagedStaticImageAsset(prepared)) {
        const result = await commitDurableStaticPanelTransaction({
          prepared,
          store: browserAuthoredAssetStore,
          readSessionAsset: readSessionImageAssetBytes,
          discardSessionAsset: discardSessionImageAsset,
          commitPrepared: (transaction) => commitStaticPanelTransaction(transaction, {
            controller,
          }),
        });
        await cleanupReplacedDashboardAssets(previousDashboard, result.dashboard, {
          transactionKind: "static-content",
          failureMessage: "Static content was saved, but replaced browser assets could not be removed.",
        });
        await reconcileSavedAuthoredAssets(result.dashboard, contentDraftCoordinator.getActiveRetainers());
        status?.succeed("Dashboard content saved.");
        return result;
      }
      const result = await commitStaticPanelTransaction(prepared, {
        controller,
      });
      await cleanupReplacedDashboardAssets(previousDashboard, result.dashboard, {
        transactionKind: "static-content",
        failureMessage: "Static content was saved, but replaced browser assets could not be removed.",
      });
      await reconcileSavedAuthoredAssets(result.dashboard, contentDraftCoordinator.getActiveRetainers());
      status?.succeed("Dashboard content saved.");
      return result;
    } catch (error) {
      status?.fail(error);
      throw error;
    }
  }

  function publishCommittedChartArtifact(artifact) {
    if (!artifact) return;
    chartRuntimeArtifactRegistry.configure({
      onPersistenceFailure: (artifactError) => {
        const message = artifactError?.code === "ARTIFACT_QUOTA_EXHAUSTED"
          ? "Chart optimization storage is full. This session remains fast."
          : "Couldn’t persist optimized chart data. This session remains fast.";
        setOperationError(message);
        window.setTimeout(() => {
          setOperationError((current) => current === message ? "" : current);
        }, 4500);
      },
    });
    chartRuntimeArtifactRegistry.publish(artifact).persistence.catch(() => {
      // The registry reports a bounded flash; the committed dashboard stays live.
    });
  }

  async function removeChart(panelId, { reportStatus = true } = {}) {
    const remove = async () => {
      const controller = ensureDashboardCommitController();
      const previousDashboard = controller.getCurrent();
      const committed = await controller.mutate((next) => {
        removeDashboardPanel(next, panelId);
      });
      await cleanupReplacedDashboardAssets(previousDashboard, committed, {
        transactionKind: "panel-removal",
      });
      await reconcileSavedAuthoredAssets(committed, contentDraftCoordinator.getActiveRetainers());
      return committed;
    };
    if (!reportStatus) return remove();
    return runOperationWithStatus({
      key: "chart-remove",
      label: "Removing chart",
    }, remove, "Chart removed.");
  }

  async function inspectImportPackage(file) {
    if (!file) return null;
    const status = beginOperation({
      key: "package-inspect",
      label: "Reading dashboard package",
      priority: true,
    });
    setPackageImportError("");
    try {
      await status.beforeWork();
      const candidate = parseDashboardPackageCandidate(await file.text());
      setPackageImportCandidate(candidate);
      setOperationError("");
      status.succeed("Dashboard package ready for review.");
      return candidate;
    } catch (importError) {
      status.fail(importError);
      setPackageImportCandidate(null);
      setOperationError(`Could not import dashboard bundle: ${importError.message}`);
      return null;
    }
  }

  async function confirmImportPackage() {
    if (!packageImportCandidate || packageImportBusy) return null;
    const status = beginOperation({
      key: "package-import",
      label: "Importing dashboard package",
      blocking: true,
      priority: true,
    });
    setPackageImportBusy(true);
    setPackageImportError("");
    try {
      await status.beforeWork();
      const previousDashboard = dashboardRef.current;
      const importedAssetBytes = Object.values(packageImportCandidate.config.assets ?? {})
        .reduce((total, asset) => total + (asset?.byteLength ?? 0), 0);
      if (importedAssetBytes > IMAGE_ASSET_LIMITS.dashboardBudgetBytes) {
        throw new Error("Imported Images exceed the dashboard's 200 MiB authored-asset budget.");
      }
      const committed = await commitDashboardPackageImport({
        candidate: packageImportCandidate,
        prepare: async () => {
          await dashboardRendererRef.current?.prepareForPackageImport?.();
        },
        replace: commitImportedConfiguration,
        validateAsset: async ({ bytes, manifest }) => {
          const validation = await validateImageAsset({
            bytes,
            declaredMediaType: manifest.mediaType,
            decode: decodeBrowserImageAsset,
          });
          if (
            !validation.ok
            || validation.asset.width !== manifest.width
            || validation.asset.height !== manifest.height
          ) {
            throw new Error(
              validation.errors?.[0]?.message
              ?? "Imported Image payload metadata does not match its manifest.",
            );
          }
        },
        stageAsset: (input) => browserAuthoredAssetStore.stage(input),
        preflightAsset: (assetId) => browserAuthoredAssetStore.verify(assetId),
        rollbackAsset: (assetId, options) => browserAuthoredAssetStore.rollback(assetId, options),
        commitAssets: (assetIds, options) => browserAuthoredAssetStore.commitMany(assetIds, options),
        snapshotAssets: (assetIds) => browserAuthoredAssetStore.snapshot(assetIds),
        restoreAssets: (snapshot) => browserAuthoredAssetStore.restore(snapshot),
        snapshotDashboard: () => ensureDashboardCommitController().getCurrent(),
        restoreDashboard: commitImportedConfiguration,
        rebase: (importedDashboard) => {
          dashboardRendererRef.current?.resetAfterDashboardReplacement?.(importedDashboard);
        },
      });
      setPackageImportCandidate(null);
      setOperationError("");
      reconcileCommittedDashboardMode({
        currentMode: mode,
        committedDashboard: committed,
        onModeChange: setMode,
        onPersistMode: persistDashboardModePreference,
        onFocusMode: NOOP,
      });
      await cleanupReplacedDashboardAssets(previousDashboard, committed, {
        failureMessage: "The package was loaded, but source files from the previous dashboard could not be removed from browser storage.",
      });
      await reconcileSavedAuthoredAssets(committed, contentDraftCoordinator.getActiveRetainers());
      status.succeed("Dashboard package imported.");
      return committed;
    } catch (importError) {
      setPackageImportError(
        importError?.message || "Dashboard package could not be loaded.",
      );
      status.fail(importError);
      return null;
    } finally {
      setPackageImportBusy(false);
    }
  }

  async function restoreOnlineDashboard() {
    if (onlineRestoreBusy) return null;
    const status = beginOperation({
      key: "online-dashboard-restore",
      label: "Restoring online dashboard",
      blocking: true,
      priority: true,
      intent: "warning",
    });
    setOnlineRestoreBusy(true);
    setOnlineRestoreError("");
    try {
      await status.beforeWork();
      const candidate = await prepareOnlineDashboardRestore({
        baseUrl: import.meta.env.BASE_URL,
        loadDefinition: loadDashboardDefinition,
        hydrate: (onlineDashboard, profiles, portableSources) => loadDashboardConfig(
          onlineDashboard,
          profiles,
          portableSources,
          { readAuthoredAsset: (assetId) => browserAuthoredAssetStore.read(assetId) },
        ),
        validate: (hydrated) => {
          const profiles = hydrated.datasetProfiles ?? {};
          const stored = configurationForStorage(hydrated, profiles);
          validateConfigurationForPersistence(
            stored,
            profilesForConfiguredCsvSources(stored.dataSources, profiles),
          );
        },
      });
      await dashboardRendererRef.current?.prepareForOnlineDashboardRestore?.();
      const controller = ensureDashboardCommitController();
      const result = await commitOnlineDashboardRestore({
        current: controller.getCurrent(),
        candidate: configurationForPortableUse(candidate),
        commitController: {
          whenIdle: () => controller.whenIdle(),
          replaceWith: (replacement) => controller.replaceWith(
            replacement,
            (durableCandidate) => persistConfiguration(durableCandidate, {
              preserveAuthoredRevision: true,
              requireDurableStorage: true,
              transactionId: "online-dashboard-restore",
            }),
          ),
        },
        cleanupAssets: (previous, committed) => (
          dashboardAssetPersistence.removeDashboardAssets(previous, {
            retainedDashboard: committed,
          })
        ),
      });
      const committed = result.dashboard;
      trackedDatasetProfilesRef.current = committed.datasetProfiles ?? {};
      dashboardRendererRef.current?.resetAfterDashboardReplacement?.(committed);
      setScenarioPassportOpen(false);
      setScenarioPassportDirty(false);
      dashboardRendererRef.current?.setAuthoredDirtyFlag?.("scenario", false);
      setScenarioPassportResetRevision((current) => current + 1);
      if (mode === "build") {
        setEditBaseline(configurationForEditBaseline(
          committed,
          trackedDatasetProfilesRef.current,
        ));
      }
      reconcileCommittedDashboardMode({
        currentMode: mode,
        committedDashboard: committed,
        onModeChange: setMode,
        onPersistMode: persistDashboardModePreference,
        onFocusMode: NOOP,
      });
      await reconcileSavedAuthoredAssets(
        committed,
        contentDraftCoordinator.getActiveRetainers(),
      );
      setOnlineRestoreOpen(false);
      setOnlineRestoreError("");
      status.succeed(result.cleanupWarning
        ? "Online dashboard restored, but unused browser source files could not be removed."
        : "Online dashboard restored.");
      return committed;
    } catch (restoreError) {
      const message = restoreError?.message || "Online dashboard could not be restored.";
      setOnlineRestoreError(message);
      status.fail(message);
      return null;
    } finally {
      setOnlineRestoreBusy(false);
    }
  }

  async function exportConfig(configOverride) {
    setOperationError("");
    const defaultName = `SimEx-dashboard-bundle-${dateStamp()}`;
    const chosenName = window.prompt(
      "Name this exported dashboard bundle",
      defaultName,
    );
    if (!chosenName) return false;
    const status = beginOperation({
      key: "package-export",
      label: "Exporting dashboard package",
      priority: true,
    });
    try {
      await status.beforeWork();
      const prepared = await prepareDashboardPackageExport(
        configOverride ?? dashboard,
        {
          readText: (path) => readPackageAsset(path, "text"),
          readJson: (path) => readPackageAsset(path, "json"),
          readImageDataUrl: readPackageImageDataUrl,
          readAuthoredAsset: (assetId) => browserAuthoredAssetStore.read(assetId),
        },
      );
      const bundle = serializeDashboardBundle(
        prepared.config,
        {
          now: new Date().toISOString(),
          assetPayloads: prepared.assetPayloads,
        },
      );
      downloadBundle(
        bundle,
        chosenName.endsWith(".json") ? chosenName : `${chosenName}.json`,
      );
      status.succeed("Dashboard package exported.");
      return true;
    } catch (exportError) {
      setOperationError(exportError.message || "Could not export dashboard bundle.");
      status.fail(exportError);
      throw exportError;
    }
  }

  if (dashboardEntry.surface === "audience") {
    if (!dashboard || error) {
      return (
        <AudienceThemeBoundary theme={audienceDashboardTheme}>
          <main className="audience-display audience-display-waiting">
            <section className="status-panel" role="status">
              <h1>Audience display is waiting for a valid dashboard.</h1>
            </section>
          </main>
        </AudienceThemeBoundary>
      );
    }
    return (
      <AudienceThemeBoundary theme={audienceDashboardTheme}>
        <div
          className="audience-theme-root"
          data-dashboard-style={audienceDashboardTheme.dashboardStyle}
          data-dashboard-color-profile={audienceDashboardTheme.dashboardColorProfile}
          data-chart-color-mode={audienceDashboardTheme.chartColorMode}
          data-resolved-appearance={audienceDashboardTheme.resolvedAppearance}
          style={{ ...audienceDashboardTheme.cssVariables, ...audienceDashboardTheme.styleVariables }}
        >
          <AudienceDisplay
            dashboard={dashboard}
            contentRenderContext={{
              mediaItems: dashboard.contentLibrary?.mediaItems ?? {},
              assets: dashboard.assets ?? {},
              resolveAsset: resolveBrowserAuthoredAsset,
              requestRepair() {},
            }}
            connectionStatus={audienceConnectionStatus}
            projection={audienceProjection}
            onDatePositionChange={publishAudienceDatePosition}
          />
        </div>
      </AudienceThemeBoundary>
    );
  }

  if (error) {
    return (
      <ApplicationRecovery
        busy={recoveryBusy}
        error={recoveryError}
        profileVersionMismatch={isDashboardProfileVersionMismatch(error)}
        candidate={recoveryImportCandidate}
        themeProjection={dashboardThemeProjection}
        onReload={reloadDashboardFromSource}
        onChoosePackage={chooseRecoveryPackage}
        onConfirmPackage={confirmRecoveryPackage}
        onCancelPackage={() => setRecoveryImportCandidate(null)}
      />
    );
  }
  if (!dashboard || mode === null) {
    return (
      <main className="app-shell">
        <section className="status-panel">
          <h1>Loading dashboard</h1>
          <p>Reading version 3 chart configuration and prepared data.</p>
        </section>
      </main>
    );
  }

  const appFrame = (
    <AppFrame
      mode={mode}
      availableModes={availableDashboardModes(dashboard)}
      onModeRequest={requestMode}
      modeDisabled={modeDisabled || buildDraftLocked}
      modeDisabledReason={buildDraftLocked
        ? "Finish or cancel the open editor or draft before changing mode."
        : modeDisabled
          ? "Wait for the current mode change to finish."
          : ""}
      blockedReason={blockedReason}
      dashboardIdentity={commandCrownProjection.dashboardIdentity}
      activePage={commandCrownProjection.activePage}
      pages={commandCrownProjection.pages}
      pageActions={commandCrownPageActions}
      pageNavigationNode={mode === "build" ? <BuildPageNavigation
        dashboard={buildStructureProjection ?? dashboard}
        pages={commandCrownProjection.pages}
        activePageId={activePageId}
        disabled={modeDisabled || buildDraftLocked}
        onSelectPage={requestPage}
        onPageReorder={(pageId, targetIndex) => dashboardRendererRef.current?.requestBuildPageReorder?.(pageId, targetIndex)}
        onAddPage={(name) => dashboardRendererRef.current?.requestAddPage?.(name)}
        onPageCommand={(command) => dashboardRendererRef.current?.requestBuildPageCommand?.(command)}
      /> : null}
      onPageRequest={requestPage}
      onScenarioRequest={mode === "build"
        ? () => setScenarioPassportOpen((current) => !current)
        : undefined}
      scenarioExpanded={scenarioPassportOpen}
      scenarioDirty={scenarioPassportDirty}
      scenarioNode={<ScenarioPassportPopover
        key={scenarioPassportResetRevision}
        open={mode === "build" && scenarioPassportOpen}
        dashboard={dashboard}
        onClose={() => setScenarioPassportOpen(false)}
        onDirtyChange={(dirty) => {
          setScenarioPassportDirty(dirty);
          dashboardRendererRef.current?.setAuthoredDirtyFlag?.("scenario", dirty);
        }}
        onSave={(value) => saveScenarioPassportDurably({
          controller: ensureDashboardCommitController(),
          persist: persistConfiguration,
          value,
        })}
        onSaveSucceeded={(savedDashboard) => {
          if (savedDashboard?.home?.enabled === false) void requestMode("view");
        }}
        onImportPackage={() => dashboardRendererRef.current?.requestDashboardPackageImport?.()}
        onDownloadPackage={() => dashboardRendererRef.current?.requestDashboardPackageExport?.()}
        onDiscardBuildChanges={() => dashboardRendererRef.current?.requestDiscardBuildChanges?.()}
        onRestoreOnlineDashboard={() => {
          setOnlineRestoreError("");
          setOnlineRestoreOpen(true);
        }}
        onClearDashboard={() => dashboardRendererRef.current?.requestDeleteDashboardContent?.()}
      />}
      density={densityForDashboardMode(mode)}
      persistenceNotice={Object.values(persistenceNotices).join(" ")}
      theme={dashboardTheme}
      lookDrawerOpen={lookDrawerOpen}
      rightDrawer={lookDrawerOpen ? "look" : buildPanelOpen ? "map" : null}
    >
    {mode === "home" ? (
      <CanonicalHomeWorkspace
        dashboard={dashboard}
        onModeRequest={requestMode}
        focusRequestKey={0}
      />
    ) : (
      <DashboardRenderer
      ref={dashboardRendererRef}
      dashboard={dashboard}
      contentDraftCoordinator={contentDraftCoordinator}
      mode={mode}
      activePageId={activePageId}
      onActivePageChange={setActivePageId}
      onModeRequest={requestMode}
      onBuildDraftLockChange={setBuildDraftLocked}
      onBuildStructureProjectionChange={setBuildStructureProjection}
      onComparisonSelectionChange={setCompareSelectionActive}
      onCommitPendingConfiguration={() => awaitDashboardCommitQueue(
        ensureDashboardCommitController(),
      )}
      displayState={displayState}
      onDisplayAction={dispatchDisplayAction}
      companionStatusLabel={companionStatusLabel(companionStatus)}
      deviceLayout={deviceLayout}
      onDeviceLayoutChange={(layout) => {
        setDeviceLayout(layout);
        try {
          const persisted = browserStorage.setItem(DEVICE_LAYOUT_STORAGE_KEY, layout);
          reportPersistence(
            "deviceLayout",
            persisted,
            SESSION_ONLY_MESSAGES.deviceLayout,
          );
        } catch (storageError) {
          reportPersistence(
            "deviceLayout",
            false,
            isStorageQuotaError(storageError)
              ? SESSION_ONLY_MESSAGES.deviceLayoutStorageFull
              : SESSION_ONLY_MESSAGES.deviceLayout,
          );
        }
      }}
      onChartCreate={createChart}
      onChartSave={saveChart}
      onStaticPanelCommit={commitStaticPanel}
      onApplyCitationToSourceCharts={(updates) => mutateDashboard((next) => {
        const result = applyCitationToSourceCharts(next, updates);
        Object.assign(next, result.dashboard);
      })}
      onPageAdd={(page) => mutateDashboard((next) => {
        next.pages.push(page);
      })}
      onPageRemove={(pageId) => mutateDashboard((next) => {
        const removedChartIds = new Set(
          next.pages
            .filter(({ id }) => id === pageId)
            .flatMap(({ sections }) => sections ?? [])
            .flatMap(({ panels }) => panels ?? [])
            .map((panel) => (panel.chart ?? panel).id),
        );
        next.pages = next.pages.filter(({ id }) => id !== pageId);
        next.chronoGroups = (next.chronoGroups ?? []).flatMap((group) => {
          const members = group.members.filter(
            ({ chartId }) => !removedChartIds.has(chartId),
          );
          return members.length > 0 ? [{ ...group, members }] : [];
        });
        const remainingPageIds = new Set(next.pages.map(({ id }) => id));
        for (const page of next.pages) {
          if (!page.landing) continue;
          const previousRoutes = page.landing.domainRoutes;
          const retainedRoutes = previousRoutes.filter(
            ({ pageId: targetId }) => remainingPageIds.has(targetId),
          );
          if (retainedRoutes.length === 0) {
            const fallbackTarget = next.pages.find(
              ({ id }) => id !== page.id,
            )?.id ?? page.id;
            retainedRoutes.push({
              ...previousRoutes[0],
              pageId: fallbackTarget,
            });
          }
          page.landing.domainRoutes = retainedRoutes;
          if (
            !remainingPageIds.has(page.landing.hero.primaryAction.pageId)
          ) {
            page.landing.hero.primaryAction.pageId = retainedRoutes[0].pageId;
          }
        }
      })}
      onPageChange={(pageId, updates) => mutateDashboard((next) => {
        Object.assign(next.pages.find(({ id }) => id === pageId), updates);
      })}
      onPageReorder={(pageId, targetIndex) => mutateDashboard((next) => {
        reorderPage(next, pageId, targetIndex);
      })}
      onStructureChange={(structure) => mutateDashboard((next) => {
        next.pages = structure.pages;
        if (Array.isArray(structure.chronoGroups)) next.chronoGroups = structure.chronoGroups;
        if (Array.isArray(structure.scenes)) next.scenes = structure.scenes;
      })}
      onSaveSceneDatePosition={(sceneId, datePosition) => {
        const transaction = saveSceneDatePositionDurably({
          controller: ensureDashboardCommitController(),
          persist: persistConfiguration,
          sceneId,
          datePosition,
        });
        reportBackgroundPersistence(transaction);
        return transaction;
      }}
      onDashboardChange={(updates, context) => mutateDashboard(
        (next) => Object.assign(next, updates),
        context,
      )}
      onBackgroundPersistenceError={reportBackgroundPersistenceError}
      onApplyPendingEdits={(edits) => ensureDashboardCommitController().mutate(
        (next) => applyDashboardEdits(next, edits),
      )}
      onPanelEditCommit={(config) => reportBackgroundPersistence(commitConfiguration(config))}
      onPanelEditCancel={(config) => reportBackgroundPersistence(commitConfiguration(config, {
        preserveAuthoredRevision: true,
        rollback: true,
        transactionId: "chart-edit-cancel",
      }))}
      onSectionChange={(pageId, sectionId, updates) => mutateDashboard((next) => {
        const page = next.pages.find(({ id }) => id === pageId);
        Object.assign(page.sections.find(({ id }) => id === sectionId), updates);
      })}
      onSectionReorder={(pageId, sectionId, targetIndex) => mutateDashboard((next) => {
        reorderSection(next, pageId, sectionId, targetIndex);
      })}
      onSectionInsert={(pageId, sectionId, panelId, section) => mutateDashboard((next) => {
        insertSectionAtPanel(next, pageId, sectionId, panelId, section);
      })}
      onPanelRemove={removeChart}
      onPanelReorder={(sourceId, targetId) => mutateDashboard(
        (next) => reorderPanels(next, sourceId, targetId),
      )}
      onImportConfig={inspectImportPackage}
      onExportConfig={exportConfig}
      onOpenBuildPanel={() => setBuildPanelOpen(true)}
      onResolveScenarioDraft={() => setScenarioPassportOpen(true)}
      onResetEditSession={resetEditSession}
      onDeleteDashboardContent={deleteDashboardContent}
      onOpenDashboardLook={openDashboardLook}
      buildPanelOpen={buildPanelOpen}
      onCloseBuildPanel={() => closeBuildPanel()}
      themeProjection={dashboardThemeProjection}
      operationError={operationError}
    />
    )}
    <DashboardLookDrawer
      open={lookDrawerOpen}
      saved={createDashboardLookPreview(savedDashboardTheme)}
      preview={lookPreview}
      savingScope={lookSavingScope}
      status={lookStatus}
      error={lookError}
      onCancel={cancelDashboardLook}
      onPreviewChange={changeDashboardLookPreview}
    />
    <DashboardPackageReviewDialog
      candidate={packageImportCandidate}
      busy={packageImportBusy}
      error={packageImportError}
      onConfirm={confirmImportPackage}
      onCancel={() => {
        if (packageImportBusy) return;
        setPackageImportCandidate(null);
        setPackageImportError("");
      }}
    />
    <RestoreOnlineDashboardDialog
      open={onlineRestoreOpen}
      busy={onlineRestoreBusy}
      error={onlineRestoreError}
      onDownloadPackage={() => dashboardRendererRef.current?.requestDashboardPackageExport?.()}
      onConfirm={restoreOnlineDashboard}
      onCancel={() => {
        if (onlineRestoreBusy) return;
        setOnlineRestoreOpen(false);
        setOnlineRestoreError("");
      }}
    />
    </AppFrame>
  );

  return (
    <DashboardChartThemeProvider projection={dashboardThemeProjection}>
      {mode === "home" ? appFrame : (
        <PlaybackProvider
          groups={playbackGroups}
          scenes={dashboard.scenes ?? []}
          charts={playbackChartCollections.charts}
          pageCharts={playbackChartCollections.pageCharts}
          loadedData={dashboard.loadedData ?? {}}
          profiles={dashboard.datasetProfiles ?? {}}
          preferredGroupId={dashboard.chronoGroups?.[0]?.id ?? null}
          timezone={dashboard.timezone}
          initialPosition="latest"
        >
          {appFrame}
        </PlaybackProvider>
      )}
    </DashboardChartThemeProvider>
  );
}

export default function App() {
  return <AppContent />;
}

export function saveScenarioPassportDurably({ controller, persist, value }) {
  if (typeof controller?.mutateWithCommit !== "function") {
    return Promise.reject(new TypeError("A dashboard commit controller is required."));
  }
  return controller.mutateWithCommit(
    (next) => applyScenarioPassportValue(next, value),
    createDurableContentDraftCommit(persist),
  );
}

export async function clearDashboardContentDurably({
  controller,
  persist,
  cleanup,
  onResetScenario,
  onModeChange,
  onPersistMode,
  onFocusMode,
}) {
  if (typeof controller?.mutateWithCommit !== "function") {
    throw new TypeError("A dashboard commit controller is required.");
  }
  let previousDashboard;
  const committed = await controller.mutateWithCommit(
    (current) => {
      previousDashboard = configurationForPortableUse(current);
      return createBlankDashboardContent(previousDashboard);
    },
    createDurableContentDraftCommit(persist),
  );
  await cleanup?.(previousDashboard, committed);
  onResetScenario?.(committed);
  onModeChange?.("home");
  onPersistMode?.("home");
  onFocusMode?.("home");
  return committed;
}

export function applyScenarioPassportValue(next, value) {
  next.scenarioLabel = value.scenarioLabel;
  next.programLabel = value.programLabel;
  next.lastUpdated = value.lastUpdated;
  next.home = { enabled: value.home.enabled };
  return next;
}

export function reconcileCommittedDashboardMode({
  currentMode,
  committedDashboard,
  onModeChange,
  onPersistMode,
  onFocusMode,
}) {
  const nextMode = reconcileDashboardMode(currentMode, committedDashboard);
  if (nextMode === currentMode) return nextMode;
  onModeChange?.(nextMode);
  onPersistMode?.(nextMode);
  if (currentMode === "home" && nextMode === "view") onFocusMode?.(nextMode);
  return nextMode;
}

export function configurationForStorage(dashboard, fallbackProfiles = {}) {
  const {
    chartDataStates: _chartDataStates,
    dataSourceStates: _dataSourceStates,
    runtimeContentHealth: _runtimeContentHealth,
    loadedData: _runtimeData,
    ...portableDashboard
  } = dashboard;
  const config = structuredClone(portableDashboard);
  const retainedProfiles = Object.fromEntries(
    Object.entries(config.datasetProfiles ?? {}).filter(([sourceId, profile]) => {
      const source = config.dataSources?.[sourceId];
      if (source?.type !== "uploadedCsv" && source?.kind !== "csv") return false;
      return JSON.stringify(profile) !== JSON.stringify(fallbackProfiles[sourceId]);
    }),
  );
  if (Object.keys(retainedProfiles).length > 0) {
    config.datasetProfiles = retainedProfiles;
  } else {
    delete config.datasetProfiles;
  }
  return config;
}

export function configurationForEditBaseline(dashboard, fallbackProfiles = {}) {
  return configurationForStorage(dashboard, fallbackProfiles);
}

function canonicalConfigurationForStorage(dashboard, fallbackProfiles = {}) {
  const portable = configurationForStorage(dashboard, fallbackProfiles);
  const canonical = normalizeStoredDashboardConfig(portable, {
    profiles: fallbackProfiles,
  });
  return configurationForStorage(canonical, fallbackProfiles);
}

function configurationForSemanticUse(dashboard) {
  const {
    chartDataStates: _chartDataStates,
    dataSourceStates: _dataSourceStates,
    runtimeContentHealth: _runtimeContentHealth,
    loadedData: _runtimeData,
    datasetProfiles: _runtimeProfiles,
    ...semanticDashboard
  } = dashboard;
  return structuredClone(semanticDashboard);
}

function configurationForPortableUse(dashboard) {
  const {
    chartDataStates: _chartDataStates,
    dataSourceStates: _dataSourceStates,
    runtimeContentHealth: _runtimeContentHealth,
    loadedData: _runtimeData,
    ...portableDashboard
  } = dashboard;
  return structuredClone(portableDashboard);
}

function hasStagedStaticImageAsset(prepared) {
  return (prepared?.stagedAssetIds ?? []).some(
    (assetId) => prepared?.candidateDashboard?.assets?.[assetId]?.storageState === "staged",
  );
}

function requireChartAuthoringPayload(payload) {
  const typeId = payload?.chart?.typeId;
  if (typeof typeId !== "string") return;
  if (getChartSchema(typeId).authoringWorkflow !== "chart") {
    throw new Error(`Static content type "${typeId}" must use the static content transaction.`);
  }
}

export function readyChronoGroups(dashboard) {
  const groups = dashboard?.chronoGroups ?? [];
  const sourceStates = dashboard?.dataSourceStates;
  if (!sourceStates) return groups;
  const sourceByChartId = new Map(
    configuredCharts(dashboard).map((chart) => [chart.id, chart.sourceId]),
  );
  return groups.filter((group) => (
    (group.members ?? []).every(({ chartId }) => {
      const sourceId = sourceByChartId.get(chartId);
      return sourceId && sourceStates[sourceId]?.status === "ready";
    })
  ));
}

function configuredCharts(dashboard) {
  return (dashboard?.pages ?? []).flatMap((page) =>
    (page.sections ?? []).flatMap((section) =>
      (section.panels ?? []).map((panel) => panel.chart ?? panel),
    ),
  );
}

function insertSectionAtPanel(config, pageId, sectionId, panelId, section) {
  const page = config.pages.find(({ id }) => id === pageId);
  const index = page.sections.findIndex(({ id }) => id === sectionId);
  const current = page.sections[index];
  const panelIndex = current.panels.findIndex(
    (panel) => panel.id === panelId,
  );
  if (panelIndex < 0) {
    page.sections.splice(index + 1, 0, { ...section, panels: [] });
    return;
  }
  const before = current.panels.slice(0, panelIndex);
  const after = current.panels.slice(panelIndex);
  current.panels = before;
  page.sections.splice(index + 1, 0, { ...section, panels: after });
}

function reorderPanels(config, sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  let sourceLocation = null;
  let targetLocation = null;
  for (const page of config.pages) {
    for (const section of page.sections) {
      const sourceIndex = section.panels.findIndex((panel) => panel.id === sourceId);
      const targetIndex = section.panels.findIndex((panel) => panel.id === targetId);
      if (sourceIndex >= 0) sourceLocation = { section, index: sourceIndex };
      if (targetIndex >= 0) targetLocation = { section, index: targetIndex };
    }
  }
  if (!sourceLocation || !targetLocation) return;

  const [source] = sourceLocation.section.panels.splice(sourceLocation.index, 1);
  const targetIndex = sourceLocation.section === targetLocation.section
    && sourceLocation.index < targetLocation.index
    ? targetLocation.index - 1
    : targetLocation.index;
  targetLocation.section.panels.splice(targetIndex, 0, source);
}

function displayActionReason(action) {
  if (action.type === "manual_open" || action.type === "manual_set") return "manual_open";
  if (action.type === "manual_close" || action.type === "manual_close_all") return "manual_close";
  if (action.type === "manual_reorder") return "manual_reorder";
  return null;
}

function companionStatusLabel(status) {
  if (status === "ready") return "Companion connected";
  if (["discovering", "connecting", "authenticating"].includes(status)) {
    return "Companion connecting";
  }
  if (["incompatible", "disconnected"].includes(status)) {
    return "Companion unavailable";
  }
  return "Standalone";
}

function isStorageQuotaError(error) {
  return error instanceof DOMException
    && (
      error.name === "QuotaExceededError"
      || error.name === "NS_ERROR_DOM_QUOTA_REACHED"
      || error.code === 22
      || error.code === 1014
    );
}

function loadDeviceLayout() {
  const layout = browserStorage.getItem(DEVICE_LAYOUT_STORAGE_KEY);
  return ["auto", "tablet", "phone"].includes(layout) ? layout : "auto";
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Required dashboard metadata is unavailable.");
  return response.json();
}

function downloadBundle(bundle, fileName) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function isDashboardAssetStorageError(error) {
  return error?.code === "DASHBOARD_ASSET_STORAGE_UNAVAILABLE"
    || error?.code === "DASHBOARD_ASSET_QUOTA_EXHAUSTED";
}

async function readPackageAsset(path, format) {
  const response = await fetch(resolvePackageAssetUrl(path));
  if (!response.ok) {
    throw new Error(`Source material "${path}" could not be included in the dashboard package.`);
  }
  return format === "json" ? response.json() : response.text();
}

async function readPackageImageDataUrl(source) {
  if (typeof source === "string" && /^data:image\/[a-z0-9.+-]+;base64,/i.test(source)) {
    return source;
  }
  const response = await fetch(resolvePackageAssetUrl(source));
  if (!response.ok) {
    throw new Error(`Image source "${source}" could not be included in the dashboard package.`);
  }
  return blobAsDataUrl(await response.blob());
}

function resolvePackageAssetUrl(path) {
  if (typeof path !== "string" || path.trim() === "") {
    throw new Error("Dashboard source material has no readable path.");
  }
  if (/^(?:data:|blob:|https?:)/i.test(path)) return path;
  const base = new URL(import.meta.env.BASE_URL ?? "/", window.location.origin);
  return new URL(path.replace(/^\/+/, ""), base).href;
}

function blobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(
      reader.error ?? new Error("Image source could not be read for dashboard package export."),
    ));
    reader.readAsDataURL(blob);
  });
}

function dateStamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
}

function boundedBackgroundPersistenceError(error) {
  const rawMessage = typeof error?.message === "string"
    ? error.message.trim()
    : typeof error === "string"
      ? error.trim()
      : "";
  const message = rawMessage || "The dashboard could not be saved.";
  const boundedMessage = message.length <= 240
    ? message
    : `${message.slice(0, 237)}...`;
  return new Error(boundedMessage, { cause: error });
}
