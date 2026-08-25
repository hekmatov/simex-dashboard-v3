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
import ScenarioPassportPopover from "./components/app-shell/ScenarioPassportPopover.jsx";
import DashboardPackageReviewDialog from "./components/build/DashboardPackageReviewDialog.jsx";
import BuildPageNavigation from "./components/build/BuildPageNavigation.jsx";
import PlaybackPageActions from "./components/playback/PlaybackPageActions.jsx";
import {
  reorderPage,
  reorderSection,
} from "./components/build/buildStructureModel.js";
import DashboardLookDrawer, {
  DashboardLookPersistenceFlash,
} from "./components/dashboard-look/index.js";
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
import { browserAuthoredAssetStore } from "./static-content/assets/browserAuthoredAssetRuntime.js";
import { commitDurableStaticPanelTransaction } from "./static-content/assets/durableStaticPanelCommit.js";
import { reconcileAuthoredAssets } from "./static-content/assets/reconcileAuthoredAssets.js";
import {
  decodeBrowserImageAsset,
  discardSessionImageAsset,
  IMAGE_ASSET_LIMITS,
  readSessionImageAssetBytes,
  validateImageAsset,
} from "./static-content/image/imageAssetValidation.js";
import {
  hydrateConfigurationBeforeStorageWrite,
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
import {
  initialDisplayState,
  reduceDisplayState,
} from "./lib/displayController.js";
import {
  awaitDashboardCommitQueue,
  applyDashboardEdits,
  createSerializedDashboardCommitController,
} from "./lib/dashboardCommitController.js";
import {
  DASHBOARD_STORAGE_KEY,
  densityForDashboardMode,
  persistDashboardModePreference,
  readDashboardModePreference,
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
import { createPresentationAudienceChannel } from "./lib/presentationChannel.js";
import {
  createDashboardThemeProjection,
  persistAppearancePreference,
  readAppearancePreference,
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
const DEVICE_LAYOUT_STORAGE_KEY = "simex-dashboard-device-layout-v3";
const SESSION_ONLY_MESSAGES = Object.freeze({
  dashboard: "Dashboard changes are applied for this session but cannot be retained after reload.",
  dashboardAssetStorage: "Uploaded dashboard sources are available for this session but browser asset storage is unavailable.",
  dashboardAssetStorageFull: "Browser asset storage is full. Dashboard changes and uploaded sources remain available for this session only.",
  dashboardStorageFull: "Browser storage is full. Dashboard changes remain available for this session only.",
  dashboardLook: "Dashboard look applied for this session but cannot be retained after reload.",
  appearance: "Appearance applied for this session but cannot be retained after reload.",
  deviceLayout: "Device layout is applied for this session but cannot be retained after reload.",
  deviceLayoutStorageFull: "Browser storage is full. Device layout is applied for this session but cannot be retained after reload.",
});
const DASHBOARD_LOOK_PERSISTENCE_WARNING = "Couldn’t save dashboard appearance. Your selection remains active for this session.";
const dashboardAssetPersistence = createDashboardAssetPersistence();

async function reconcileSavedAuthoredAssets(dashboard) {
  try {
    return await reconcileAuthoredAssets({
      store: browserAuthoredAssetStore,
      dashboard,
    });
  } catch {
    return null;
  }
}

export default function App() {
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
  const [mode, setMode] = React.useState(() => resolveInitialDashboardMode({
    storedMode: dashboardEntry.surface === "workspace"
      ? readDashboardModePreference()
      : null,
    requestedMode: dashboardEntry.requestedMode,
  }));
  const [modeDisabled, setModeDisabled] = React.useState(false);
  const [buildDraftLocked, setBuildDraftLocked] = React.useState(false);
  const [buildPanelOpen, setBuildPanelOpen] = React.useState(false);
  const [buildStructureProjection, setBuildStructureProjection] = React.useState(null);
  const [scenarioPassportOpen, setScenarioPassportOpen] = React.useState(false);
  const [scenarioPassportDirty, setScenarioPassportDirty] = React.useState(false);
  const [compareSelectionActive, setCompareSelectionActive] = React.useState(false);
  const [blockedReason, setBlockedReason] = React.useState("");
  const [activePageId, setActivePageId] = React.useState(null);
  const [editBaseline, setEditBaseline] = React.useState(null);
  const [deviceLayout, setDeviceLayout] = React.useState(() => loadDeviceLayout());
  const [displayState, setDisplayState] = React.useState(initialDisplayState);
  const [companionStatus, setCompanionStatus] = React.useState("standalone");
  const [audiencePresentationState, setAudiencePresentationState] = React.useState(null);
  const [audienceConnectionStatus, setAudienceConnectionStatus] = React.useState("waiting");
  const [appearancePreference, setAppearancePreference] = React.useState(() => readAppearancePreference());
  const [lookDrawerOpen, setLookDrawerOpen] = React.useState(false);
  const [lookPreview, setLookPreview] = React.useState(null);
  const [lookSavingScope, setLookSavingScope] = React.useState("");
  const [lookStatus, setLookStatus] = React.useState("");
  const [lookError, setLookError] = React.useState("");
  const [lookPersistenceFlash, setLookPersistenceFlash] = React.useState("");
  const [prefersDark, setPrefersDark] = React.useState(() => (
    typeof window !== "undefined"
      && window.matchMedia?.("(prefers-color-scheme: dark)").matches === true
  ));
  const displayStateRef = React.useRef(displayState);
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
  const playbackChartCollections = playbackChartSelectorRef.current(dashboard, activePageId);
  const validChartIds = React.useMemo(
    () => new Set(playbackChartCollections.charts.map(({ id }) => id)),
    [playbackChartCollections.charts],
  );
  validChartIdsRef.current = validChartIds;
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

  if (lookCommitSchedulerRef.current === null) {
    lookCommitSchedulerRef.current = createDashboardLookCommitScheduler({
      onCommit: commitDashboardLookPreview,
      onError: (commitError) => {
        setLookPersistenceFlash(DASHBOARD_LOOK_PERSISTENCE_WARNING);
        setLookSavingScope("");
      },
    });
  }

  React.useEffect(() => () => {
    const scheduler = lookCommitSchedulerRef.current;
    void scheduler?.flush().finally(() => scheduler.dispose());
  }, []);

  React.useEffect(() => {
    if (!lookPersistenceFlash) return undefined;
    const timerId = window.setTimeout(() => setLookPersistenceFlash(""), 4500);
    return () => window.clearTimeout(timerId);
  }, [lookPersistenceFlash]);

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

  function toggleBuildPanel() {
    if (!buildPanelOpen) {
      buildPanelScrollRef.current = { left: window.scrollX, top: window.scrollY };
      setBuildPanelOpen(true);
      return;
    }
    const previousScroll = buildPanelScrollRef.current;
    setBuildPanelOpen(false);
    buildPanelScrollRef.current = null;
    if (previousScroll) {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        window.scrollTo(previousScroll);
      }));
    }
  }

  const commandCrownPageActions = mode === "view" ? (
    <>
      <button type="button" className="secondary dashboard-look-trigger" onClick={openDashboardLook}>
        Dashboard look
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
        Dashboard look
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
          await reconcileSavedAuthoredAssets(loaded);
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
        await reconcileSavedAuthoredAssets(loaded);
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
        validChartIds,
        onStateChange: setAudiencePresentationState,
        onConnectionChange: setAudienceConnectionStatus,
      });
      channel.start();
    } catch {
      setAudienceConnectionStatus("waiting");
    }
    return () => channel?.dispose();
  }, [dashboard, dashboardEntry.channelId, dashboardEntry.surface, validChartIds]);

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
    if (next !== current) {
      displayStateRef.current = next;
      setDisplayState(next);
      const reason = displayActionReason(action);
      if (reason) companionClientRef.current?.displayStateChanged(reason);
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
  }, [dashboard]);

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

  async function persistConfiguration(nextConfig, { requireDurableStorage = false } = {}) {
    try {
      const trackedProfiles = trackedDatasetProfilesRef.current;
      const profiles = nextConfig.datasetProfiles
        ?? dashboardRef.current?.datasetProfiles
        ?? {};
      const stored = canonicalConfigurationForStorage(
        { ...nextConfig, datasetProfiles: profiles },
        trackedProfiles,
      );
      const configuredFallbackProfiles = profilesForConfiguredCsvSources(
        stored.dataSources,
        trackedProfiles,
      );
      validateConfigurationForPersistence(stored, configuredFallbackProfiles);
      let prepared;
      try {
        prepared = await dashboardAssetPersistence.prepare(stored);
      } catch (assetError) {
        if (!isDashboardAssetStorageError(assetError)) throw assetError;
        if (requireDurableStorage) throw assetError;
        const sessionDashboard = await loadDashboardConfig(
          stored,
          configuredFallbackProfiles,
          null,
          { readAuthoredAsset: (assetId) => browserAuthoredAssetStore.read(assetId) },
        );
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
        if (requireDurableStorage && !persisted) {
          await prepared.rollback();
          throw new Error("Browser dashboard storage is unavailable.");
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

  function commitConfiguration(nextConfig) {
    return ensureDashboardCommitController().replace(
      configurationForPortableUse(nextConfig),
    );
  }

  function mutateDashboard(mutator) {
    const transaction = ensureDashboardCommitController().mutate(mutator);
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
    setRecoveryBusy(true);
    setRecoveryError("");
    try {
      const config = parseDashboardBundle(await file.text());
      setRecoveryImportCandidate({
        config,
        fileName: file.name,
        summary: recoveryPackageSummary(config),
      });
    } catch (packageError) {
      setRecoveryImportCandidate(null);
      setRecoveryError(recoveryPackageError(packageError));
    } finally {
      setRecoveryBusy(false);
    }
  }

  async function confirmRecoveryPackage() {
    if (!recoveryImportCandidate || recoveryBusy) return;
    setRecoveryBusy(true);
    setRecoveryError("");
    try {
      await persistConfiguration(recoveryImportCandidate.config);
      replaceRecoveryDashboardController(dashboardRef.current);
      setRecoveryImportCandidate(null);
    } catch (packageError) {
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
    const previousDashboard = dashboardRef.current;
    const committed = await commitConfiguration(
      createBlankDashboardContent(previousDashboard),
    );
    setOperationError("");
    await cleanupReplacedDashboardAssets(previousDashboard, committed, {
      failureMessage: "Dashboard content was deleted, but unused browser source files could not be removed.",
    });
    return committed;
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
    setLookSavingScope("auto");
    setLookError("");
    await ensureDashboardCommitController().mutateWithCommit((next) => {
      next.globalStyles = {
        ...(next.globalStyles ?? {}),
        ...dashboardLookUpdates(nextPreview),
        ...chartColorUpdates(nextPreview),
      };
    }, persistDashboardLookConfiguration);
    setLookStatus(lastDashboardPersistenceRef.current
      ? "Dashboard look saved."
      : SESSION_ONLY_MESSAGES.dashboardLook);
    setLookSavingScope("");
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
    if (nextMode === mode || dashboardEntry.surface !== "workspace") return;
    setModeDisabled(true);
    setBlockedReason("");
    try {
      if (mode === "build") {
        const result = await prepareToLeaveBuild();
        if (!result?.ok) {
          setBlockedReason(result?.reason ?? "Finish the current Build operation before changing mode.");
          return;
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
    } catch (modeError) {
      setBlockedReason(boundedBackgroundPersistenceError(modeError).message);
    } finally {
      setModeDisabled(false);
    }
  }

  async function prepareToLeaveBuild(destination = "mode") {
    return dashboardRendererRef.current?.prepareToLeaveBuild?.(destination)
      ?? { ok: true };
  }

  async function requestPage(nextPageId) {
    if (nextPageId === activePageId) return;
    const navigablePages = mode === "build" && buildStructureProjection
      ? buildStructureProjection.pages
      : dashboard?.pages;
    if (!(navigablePages ?? []).some(({ id }) => id === nextPageId)) return;
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
      ? await commitConfiguration(editBaseline)
      : configurationForPortableUse(dashboardRef.current ?? dashboard);
    setEditBaseline(null);
    setMode("view");
    if (dashboardEntry.surface === "workspace") {
      persistDashboardModePreference("view");
    }
    return resetDashboard;
  }

  async function createChart(payload, target) {
    requireChartAuthoringPayload(payload);
    const committed = await ensureDashboardCommitController().mutate((current) => (
      integrateCreatedChart(current, payload, target)
    ));
    publishCommittedChartArtifact(payload?.runtimeArtifact);
    return committed;
  }

  async function saveChart(payload) {
    requireChartAuthoringPayload(payload);
    const committed = await ensureDashboardCommitController().mutate((current) => (
      integrateSavedChart(current, payload)
    ));
    publishCommittedChartArtifact(payload?.runtimeArtifact);
    return committed;
  }

  function commitImportedConfiguration(nextConfig) {
    const portable = configurationForPortableUse(nextConfig);
    return ensureDashboardCommitController().replaceWith(
      portable,
      (candidate) => persistConfiguration(candidate, { requireDurableStorage: true }),
    );
  }

  async function persistSessionAwareConfiguration(nextConfig) {
    return persistConfiguration(nextConfig);
  }

  async function commitStaticPanel(prepared) {
    const controller = ensureDashboardCommitController();
    const previousDashboard = controller.getCurrent();
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
      await reconcileSavedAuthoredAssets(result.dashboard);
      return result;
    }
    const result = await commitStaticPanelTransaction(prepared, {
      controller,
    });
    await cleanupReplacedDashboardAssets(previousDashboard, result.dashboard, {
      transactionKind: "static-content",
      failureMessage: "Static content was saved, but replaced browser assets could not be removed.",
    });
    await reconcileSavedAuthoredAssets(result.dashboard);
    return result;
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

  async function removeChart(panelId) {
    const controller = ensureDashboardCommitController();
    const previousDashboard = controller.getCurrent();
    const committed = await controller.mutate((next) => {
      removeDashboardPanel(next, panelId);
    });
    await cleanupReplacedDashboardAssets(previousDashboard, committed, {
      transactionKind: "panel-removal",
    });
    await reconcileSavedAuthoredAssets(committed);
    return committed;
  }

  async function inspectImportPackage(file) {
    if (!file) return null;
    setPackageImportError("");
    try {
      const candidate = parseDashboardPackageCandidate(await file.text());
      setPackageImportCandidate(candidate);
      setOperationError("");
      return candidate;
    } catch (importError) {
      setPackageImportCandidate(null);
      setOperationError(`Could not import dashboard bundle: ${importError.message}`);
      return null;
    }
  }

  async function confirmImportPackage() {
    if (!packageImportCandidate || packageImportBusy) return null;
    setPackageImportBusy(true);
    setPackageImportError("");
    try {
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
        rebase: (importedDashboard) => {
          dashboardRendererRef.current?.resetAfterPackageImport?.(importedDashboard);
        },
      });
      setPackageImportCandidate(null);
      setOperationError("");
      await cleanupReplacedDashboardAssets(previousDashboard, committed, {
        failureMessage: "The package was loaded, but source files from the previous dashboard could not be removed from browser storage.",
      });
      await reconcileSavedAuthoredAssets(committed);
      return committed;
    } catch (importError) {
      setPackageImportError(
        importError?.message || "Dashboard package could not be loaded.",
      );
      return null;
    } finally {
      setPackageImportBusy(false);
    }
  }

  async function exportConfig(configOverride) {
    setOperationError("");
    try {
      const defaultName = `SimEx-dashboard-bundle-${dateStamp()}`;
      const chosenName = window.prompt(
        "Name this exported dashboard bundle",
        defaultName,
      );
      if (!chosenName) return false;
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
      return true;
    } catch (exportError) {
      setOperationError(exportError.message || "Could not export dashboard bundle.");
      throw exportError;
    }
  }

  if (dashboardEntry.surface === "audience") {
    if (!dashboard || error) {
      return (
        <main className="audience-display audience-display-waiting">
          <section className="status-panel" role="status">
            <h1>Audience display is waiting for a valid dashboard.</h1>
          </section>
        </main>
      );
    }
    return (
      <div
        className="audience-theme-root"
        data-dashboard-style={dashboardTheme.dashboardStyle}
        data-dashboard-color-profile={dashboardTheme.dashboardColorProfile}
        data-resolved-appearance={dashboardTheme.resolvedAppearance}
        style={{ ...dashboardTheme.cssVariables, ...dashboardTheme.styleVariables }}
      >
        <AudienceDisplay
          dashboard={dashboard}
          connectionStatus={audienceConnectionStatus}
          presentationState={audiencePresentationState}
        />
      </div>
    );
  }

  if (error) {
    return (
      <ApplicationRecovery
        busy={recoveryBusy}
        error={recoveryError}
        candidate={recoveryImportCandidate}
        themeProjection={dashboardThemeProjection}
        onReload={reloadDashboardFromSource}
        onChoosePackage={chooseRecoveryPackage}
        onConfirmPackage={confirmRecoveryPackage}
        onCancelPackage={() => setRecoveryImportCandidate(null)}
      />
    );
  }
  if (!dashboard) {
    return (
      <main className="app-shell">
        <section className="status-panel">
          <h1>Loading dashboard</h1>
          <p>Reading version 3 chart configuration and prepared data.</p>
        </section>
      </main>
    );
  }

  return (
    <DashboardChartThemeProvider projection={dashboardThemeProjection}>
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
    <AppFrame
      mode={mode}
      onModeRequest={requestMode}
      modeDisabled={modeDisabled || buildDraftLocked}
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
        onAddPage={() => dashboardRendererRef.current?.requestAddPage?.()}
        onPageCommand={(command) => dashboardRendererRef.current?.requestBuildPageCommand?.(command)}
      /> : null}
      onPageRequest={requestPage}
      onScenarioRequest={mode === "build"
        ? () => setScenarioPassportOpen((current) => !current)
        : undefined}
      scenarioExpanded={scenarioPassportOpen}
      scenarioDirty={scenarioPassportDirty}
      scenarioNode={<ScenarioPassportPopover
        open={mode === "build" && scenarioPassportOpen}
        dashboard={dashboard}
        onClose={() => setScenarioPassportOpen(false)}
        onDirtyChange={(dirty) => {
          setScenarioPassportDirty(dirty);
          dashboardRendererRef.current?.setAuthoredDirtyFlag?.("scenario", dirty);
        }}
        onSave={(value) => mutateDashboard((next) => {
          next.scenarioLabel = value.scenarioLabel;
          next.programLabel = value.programLabel;
          next.lastUpdated = value.lastUpdated;
        })}
        onImportPackage={() => dashboardRendererRef.current?.requestDashboardPackageImport?.()}
        onDownloadPackage={() => dashboardRendererRef.current?.requestDashboardPackageExport?.()}
        onResetToSource={() => dashboardRendererRef.current?.requestResetDashboardToSource?.()}
      />}
      density={densityForDashboardMode(mode)}
      persistenceNotice={Object.values(persistenceNotices).join(" ")}
      theme={dashboardTheme}
      lookDrawerOpen={lookDrawerOpen}
    >
    <DashboardRenderer
      ref={dashboardRendererRef}
      dashboard={dashboard}
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
      onDashboardChange={(updates) => mutateDashboard((next) => Object.assign(next, updates))}
      onBackgroundPersistenceError={reportBackgroundPersistenceError}
      onApplyPendingEdits={(edits) => ensureDashboardCommitController().mutate(
        (next) => applyDashboardEdits(next, edits),
      )}
      onPanelEditCommit={(config) => reportBackgroundPersistence(commitConfiguration(config))}
      onPanelEditCancel={(config) => reportBackgroundPersistence(commitConfiguration(config))}
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
      themeProjection={dashboardThemeProjection}
      operationError={operationError}
    />
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
    <DashboardLookPersistenceFlash message={lookPersistenceFlash} />
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
    </AppFrame>
    </PlaybackProvider>
    </DashboardChartThemeProvider>
  );
}

export function configurationForStorage(dashboard, fallbackProfiles = {}) {
  const {
    chartDataStates: _chartDataStates,
    dataSourceStates: _dataSourceStates,
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
    loadedData: _runtimeData,
    ...portableDashboard
  } = dashboard;
  return structuredClone(portableDashboard);
}

function hasStagedStaticImageAsset(prepared) {
  return Object.values(prepared?.candidateDashboard?.assets ?? {})
    .some((entry) => entry?.storageState === "staged");
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
