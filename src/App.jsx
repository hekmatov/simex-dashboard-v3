import React from "react";

import DashboardRenderer from "./components/DashboardRenderer.jsx";
import ApplicationRecovery from "./components/app-shell/ApplicationRecovery.jsx";
import AppFrame from "./components/app-shell/AppFrame.jsx";
import DashboardPackageReviewDialog from "./components/build/DashboardPackageReviewDialog.jsx";
import PlaybackPageActions from "./components/playback/PlaybackPageActions.jsx";
import {
  reorderPage,
  reorderSection,
} from "./components/build/buildStructureModel.js";
import DashboardLookDrawer from "./components/dashboard-look/index.js";
import { PlaybackProvider } from "./components/playback/PlaybackProvider.jsx";
import AudienceDisplay from "./components/presentation/AudienceDisplay.jsx";
import { applyCitationToSourceCharts } from "./charting/presentation/chartCitation.js";
import {
  integrateCreatedChart,
  integrateSavedChart,
  parseDashboardBundle,
  readDashboardStorage,
  serializeDashboardBundle,
  validateDashboardConfig,
} from "./charting/config/dashboardBundleV3.js";
import {
  hydrateConfigurationBeforeStorageWrite,
  recoveryPackageError,
  recoveryPackageSummary,
} from "./lib/applicationRecovery.js";
import { browserStorage } from "./lib/browserStorage.js";
import { parseDashboardPackageCandidate } from "./lib/dashboardPackageCandidate.js";
import { commitDashboardPackageImport } from "./lib/dashboardPackageImportTransaction.js";
import {
  initialDisplayState,
  reduceDisplayState,
} from "./lib/displayController.js";
import {
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
  chartColorUpdates,
  createDashboardLookPreview,
  dashboardLookUpdates,
} from "./theme/dashboardLookDraft.js";

export { DASHBOARD_STORAGE_KEY } from "./lib/dashboardMode.js";
const DEVICE_LAYOUT_STORAGE_KEY = "simex-dashboard-device-layout-v3";
const SESSION_ONLY_MESSAGES = Object.freeze({
  dashboard: "Dashboard changes are applied for this session but cannot be retained after reload.",
  dashboardLook: "Dashboard look applied for this session but cannot be retained after reload.",
  appearance: "Appearance applied for this session but cannot be retained after reload.",
  deviceLayout: "Device layout is applied for this session but cannot be retained after reload.",
  deviceLayoutStorageFull: "Browser storage is full. Device layout is applied for this session but cannot be retained after reload.",
});
const DEFAULT_VANTA_BACKGROUND = {
  backgroundColor: "#f7f9fc",
  networkColor: "#f1a1ad",
  mouseControls: false,
  touchControls: false,
  points: 6,
  maxDistance: 17,
  spacing: 18,
  speed: 0.45,
};

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
  const [prefersDark, setPrefersDark] = React.useState(() => (
    typeof window !== "undefined"
      && window.matchMedia?.("(prefers-color-scheme: dark)").matches === true
  ));
  const displayStateRef = React.useRef(displayState);
  const dashboardRef = React.useRef(null);
  const trackedDatasetProfilesRef = React.useRef({});
  const dashboardCommitControllerRef = React.useRef(null);
  const lastDashboardPersistenceRef = React.useRef(true);
  const validChartIdsRef = React.useRef(new Set());
  const companionClientRef = React.useRef(null);
  const dashboardRendererRef = React.useRef(null);
  const buildPanelScrollRef = React.useRef(null);

  const validChartIds = React.useMemo(
    () => new Set(configuredCharts(dashboard).map(({ id }) => id)),
    [dashboard?.pages],
  );
  validChartIdsRef.current = validChartIds;
  const playbackGroups = React.useMemo(
    () => readyTimeSyncGroups(dashboard),
    [dashboard?.dataSourceStates, dashboard?.pages, dashboard?.timeSyncGroups],
  );
  const vantaSettings = sanitizeVantaSettings(dashboard?.vantaBackground);
  const vantaSettingsKey = JSON.stringify(vantaSettings);
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

  const commandCrownProjection = React.useMemo(() => {
    const pages = Object.freeze((dashboard?.pages ?? []).map((page) => Object.freeze({
      id: page.id,
      label: page.label ?? page.title ?? page.id,
      title: page.title ?? page.label ?? page.id,
    })));
    const activePage = pages.find(({ id }) => id === activePageId) ?? pages[0] ?? null;
    return Object.freeze({
      dashboardIdentity: Object.freeze({
        title: dashboard?.title ?? dashboard?.programLabel ?? "SimEx Dashboard",
        programLabel: dashboard?.programLabel ?? "SimEx Dashboard",
        scenarioLabel: dashboard?.scenarioLabel ?? "Scenario unavailable",
        lastUpdated: dashboard?.lastUpdated ?? "",
      }),
      activePage,
      pages,
    });
  }, [
    activePageId,
    dashboard?.lastUpdated,
    dashboard?.pages,
    dashboard?.programLabel,
    dashboard?.scenarioLabel,
    dashboard?.title,
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
        className="secondary build-time-groups"
        disabled={modeDisabled || buildDraftLocked || (dashboard?.timeSyncGroups?.length ?? 0) === 0}
        onClick={() => dashboardRendererRef.current?.requestTimeGroupAuthoring?.()}
      >
        Time Groups
      </button>
      <button
        type="button"
        className="secondary build-add-page"
        disabled={modeDisabled || buildDraftLocked}
        onClick={() => dashboardRendererRef.current?.requestAddPage?.()}
      >
        Add Page
      </button>
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
        className="secondary build-panel-toggle"
        aria-controls="build-authoring-panel"
        aria-expanded={buildPanelOpen}
        aria-pressed={buildPanelOpen}
        disabled={modeDisabled}
        onClick={toggleBuildPanel}
      >
        Build panel
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
    if (dashboardEntry.surface === "audience") return undefined;
    if (!dashboard) return undefined;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let effect = null;
    const applyMotionPreference = () => {
      effect?.destroy?.();
      effect = reducedMotion?.matches
        ? null
        : initializeVantaBackground(vantaSettings);
    };
    applyMotionPreference();
    reducedMotion?.addEventListener?.("change", applyMotionPreference);
    return () => {
      reducedMotion?.removeEventListener?.("change", applyMotionPreference);
      effect?.destroy?.();
    };
  }, [Boolean(dashboard), dashboardEntry.surface, vantaSettingsKey]);

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
        const stored = readDashboardStorage(
          browserStorage,
          DASHBOARD_STORAGE_KEY,
          { profiles: trackedProfiles },
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
          publish(await loadDashboardConfig(
            selected,
            profiles,
            portableSources,
          ));
          return;
        }
        await loadDashboardConfigProgressively(
          selected,
          profiles,
          portableSources,
          { onUpdate: publish },
        );
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
          commit: persistConfiguration,
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

  async function persistConfiguration(nextConfig) {
    try {
      const trackedProfiles = trackedDatasetProfilesRef.current;
      const profiles = nextConfig.datasetProfiles
        ?? dashboardRef.current?.datasetProfiles
        ?? {};
      const stored = configurationForStorage(
        { ...nextConfig, datasetProfiles: profiles },
        trackedProfiles,
      );
      const configuredFallbackProfiles = profilesForConfiguredCsvSources(
        stored.dataSources,
        trackedProfiles,
      );
      validateDashboardConfig({
        ...stored,
        datasetProfiles: {
          ...configuredFallbackProfiles,
          ...(stored.datasetProfiles ?? {}),
        },
      });
      const loaded = await loadDashboardConfig(
        stored,
        configuredFallbackProfiles,
      );
      persistDashboardStorage(JSON.stringify(
        configurationForStorage(loaded, trackedProfiles),
        null,
        2,
      ));
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
    setLookDrawerOpen(false);
    setLookPreview(null);
    setLookStatus("");
    setLookError("");
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
      setLookSavingScope("auto");
      void ensureDashboardCommitController().mutate((next) => {
        next.globalStyles = {
          ...(next.globalStyles ?? {}),
          ...dashboardLookUpdates(nextPreview),
          ...chartColorUpdates(nextPreview),
        };
      }).then(() => {
        setLookStatus(lastDashboardPersistenceRef.current
          ? "Dashboard look saved."
          : SESSION_ONLY_MESSAGES.dashboardLook);
      }).catch((commitError) => {
        setLookError(boundedBackgroundPersistenceError(commitError).message);
      }).finally(() => {
        setLookSavingScope("");
      });
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
        setEditBaseline(configurationForPortableUse(dashboardRef.current ?? dashboard));
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
    if (!(dashboard?.pages ?? []).some(({ id }) => id === nextPageId)) return;
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

  function createChart(payload, target) {
    return ensureDashboardCommitController().mutate((current) => (
      integrateCreatedChart(current, payload, target)
    ));
  }

  function saveChart(payload) {
    return ensureDashboardCommitController().mutate((current) => (
      integrateSavedChart(current, payload)
    ));
  }

  function removeChart(panelId) {
    return ensureDashboardCommitController().mutate((next) => {
      let removedChartId = null;
      for (const page of next.pages ?? []) {
        for (const section of page.sections ?? []) {
          section.panels = section.panels.filter((panel) => {
            if (panel.id !== panelId) return true;
            removedChartId = (panel.chart ?? panel).id;
            return false;
          });
        }
      }
      if (removedChartId === null) return;
      next.timeSyncGroups = (next.timeSyncGroups ?? []).flatMap((group) => {
        const members = group.members.filter(
          ({ chartId }) => chartId !== removedChartId,
        );
        return members.length > 0 ? [{ ...group, members }] : [];
      });
    });
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
      const committed = await commitDashboardPackageImport({
        candidate: packageImportCandidate,
        prepare: async () => {
          await dashboardRendererRef.current?.prepareForPackageImport?.();
        },
        replace: commitConfiguration,
        rebase: (importedDashboard) => {
          dashboardRendererRef.current?.resetAfterPackageImport?.(importedDashboard);
        },
      });
      setPackageImportCandidate(null);
      setOperationError("");
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

  function exportConfig(configOverride) {
    try {
      const bundle = serializeDashboardBundle(
        configOverride ?? dashboard,
        { now: new Date().toISOString() },
      );
      const defaultName = `SimEx-dashboard-bundle-${dateStamp()}`;
      const chosenName = window.prompt(
        "Name this exported dashboard bundle",
        defaultName,
      );
      if (!chosenName) return;
      downloadBundle(
        bundle,
        chosenName.endsWith(".json") ? chosenName : `${chosenName}.json`,
      );
    } catch (exportError) {
      setOperationError(exportError.message || "Could not export dashboard bundle.");
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
    <PlaybackProvider
      groups={playbackGroups}
      charts={configuredCharts(dashboard)}
      loadedData={dashboard.loadedData ?? {}}
      profiles={dashboard.datasetProfiles ?? {}}
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
      onPageRequest={requestPage}
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
      onComparisonSelectionChange={setCompareSelectionActive}
      onCommitPendingConfiguration={() => ensureDashboardCommitController().mutate(
        (current) => current,
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
        next.timeSyncGroups = (next.timeSyncGroups ?? []).flatMap((group) => {
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
      onDashboardChange={(updates) => mutateDashboard((next) => Object.assign(next, updates))}
      onTimeGroupChange={(groupId, updates) => mutateDashboard((next) => {
        const group = next.timeSyncGroups?.find(({ id }) => id === groupId);
        if (group) Object.assign(group, updates);
      })}
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
      onVantaBackgroundChange={(vantaBackground) => mutateDashboard(
        (next) => { next.vantaBackground = vantaBackground; },
      )}
      onPanelRemove={removeChart}
      onPanelReorder={(sourceId, targetId) => mutateDashboard(
        (next) => reorderPanels(next, sourceId, targetId),
      )}
      onImportConfig={inspectImportPackage}
      onExportConfig={exportConfig}
      onResetEditSession={resetEditSession}
      onOpenDashboardLook={openDashboardLook}
      themeProjection={dashboardThemeProjection}
      buildPanelOpen={buildPanelOpen}
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
      if (config.dataSources?.[sourceId]?.kind !== "csv") return false;
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

export function readyTimeSyncGroups(dashboard) {
  const groups = dashboard?.timeSyncGroups ?? [];
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

function initializeVantaBackground(settings) {
  const element = document.getElementById("vanta-background");
  if (!element || !window.VANTA?.NET || !window.THREE) return null;
  try {
    const effect = window.VANTA.NET({
      el: element,
      mouseControls: settings.mouseControls,
      touchControls: settings.touchControls,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      scale: 1,
      scaleMobile: 1,
      color: hexToNumber(settings.networkColor),
      backgroundColor: hexToNumber(settings.backgroundColor),
      points: settings.points,
      maxDistance: settings.maxDistance,
      spacing: settings.spacing,
      speed: settings.speed,
    });
    applyVantaNetSpeed(effect, settings.speed);
    window.setTimeout(() => applyVantaNetSpeed(effect, settings.speed), 120);
    return effect;
  } catch {
    element.replaceChildren();
    return null;
  }
}

function applyVantaNetSpeed(effect, speed) {
  window.requestAnimationFrame(() => {
    for (const point of effect?.points ?? []) {
      point._simexBaseR ??= point.r;
      point.r = point._simexBaseR * speed;
    }
  });
}

function sanitizeVantaSettings(settings) {
  const value = { ...DEFAULT_VANTA_BACKGROUND, ...(settings ?? {}) };
  return {
    backgroundColor: normalizeHexColor(
      value.backgroundColor,
      DEFAULT_VANTA_BACKGROUND.backgroundColor,
    ),
    networkColor: normalizeHexColor(
      value.networkColor,
      DEFAULT_VANTA_BACKGROUND.networkColor,
    ),
    mouseControls: Boolean(value.mouseControls),
    touchControls: Boolean(value.touchControls),
    points: clampNumber(value.points, 3, 18),
    maxDistance: clampNumber(value.maxDistance, 8, 32),
    spacing: clampNumber(value.spacing, 10, 34),
    speed: clampNumber(value.speed, 0.1, 2),
  };
}

function normalizeHexColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value ?? "")) ? value : fallback;
}

function clampNumber(value, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.min(Math.max(number, minimum), maximum)
    : minimum;
}

function hexToNumber(value) {
  const parsed = Number.parseInt(String(value).replace("#", ""), 16);
  return Number.isFinite(parsed) ? parsed : 0xf1a1ad;
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
