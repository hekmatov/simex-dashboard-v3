import React from "react";

import DashboardRenderer from "./components/DashboardRenderer.jsx";
import {
  integrateCreatedChart,
  integrateSavedChart,
  parseDashboardBundle,
  readDashboardStorage,
  serializeDashboardBundle,
  validateDashboardConfig,
} from "./charting/config/dashboardBundleV3.js";
import {
  initialDisplayState,
  reduceDisplayState,
} from "./lib/displayController.js";
import { loadDashboard, loadDashboardConfig } from "./lib/loadDashboard.js";
import { catalogueMatchesDashboardSnapshot } from "./lib/quorumCatalogue.js";
import { createQuorumCompanionClient } from "./lib/quorumCompanionClient.js";

export const DASHBOARD_STORAGE_KEY = "simex-dashboard-config-v3";
const DEVICE_LAYOUT_STORAGE_KEY = "simex-dashboard-device-layout-v3";
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
  const [dashboard, setDashboard] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [editMode, setEditMode] = React.useState(false);
  const [editBaseline, setEditBaseline] = React.useState(null);
  const [deviceLayout, setDeviceLayout] = React.useState(() => loadDeviceLayout());
  const [displayState, setDisplayState] = React.useState(initialDisplayState);
  const [companionStatus, setCompanionStatus] = React.useState("standalone");
  const displayStateRef = React.useRef(displayState);
  const validChartIdsRef = React.useRef(new Set());
  const companionClientRef = React.useRef(null);

  const validChartIds = React.useMemo(
    () => new Set(configuredCharts(dashboard).map(({ id }) => id)),
    [dashboard?.pages],
  );
  validChartIdsRef.current = validChartIds;
  const vantaSettings = sanitizeVantaSettings(dashboard?.vantaBackground);
  const vantaSettingsKey = JSON.stringify(vantaSettings);

  React.useEffect(() => {
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
  }, [Boolean(dashboard), vantaSettingsKey]);

  React.useEffect(() => {
    let disposed = false;
    loadDashboard(`${import.meta.env.BASE_URL}config/dashboard.json`)
      .then(async (tracked) => {
        const stored = readDashboardStorage(
          localStorage,
          DASHBOARD_STORAGE_KEY,
          { profiles: tracked.datasetProfiles },
        );
        const selected = stored ?? configurationForStorage(tracked);
        const loaded = await loadDashboardConfig(
          selected,
          selected.datasetProfiles ?? tracked.datasetProfiles,
        );
        if (!disposed) setDashboard(loaded);
      })
      .catch((loadError) => {
        if (!disposed) setError(loadError);
      });
    return () => {
      disposed = true;
    };
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
    if (!dashboard) return undefined;
    let disposed = false;
    let client = null;
    Promise.all([
      fetchJson(`${import.meta.env.BASE_URL}integration/quorum-chart-catalogue.json`),
      fetchJson(`${import.meta.env.BASE_URL}config/chart-aliases.json`),
    ])
      .then(async ([catalogue, aliases]) => {
        const matches = await catalogueMatchesDashboardSnapshot(
          configurationForStorage(dashboard),
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
  }, [dashboard, dispatchDisplayAction]);

  async function commitConfiguration(nextConfig) {
    try {
      const profiles = nextConfig.datasetProfiles ?? dashboard?.datasetProfiles ?? {};
      const stored = configurationForStorage(nextConfig);
      validateDashboardConfig({
        ...stored,
        datasetProfiles: profiles,
      });
      const loaded = await loadDashboardConfig(stored, profiles);
      localStorage.setItem(
        DASHBOARD_STORAGE_KEY,
        JSON.stringify(configurationForStorage(loaded), null, 2),
      );
      setDashboard(loaded);
      setError(null);
      return loaded;
    } catch (commitError) {
      setError(commitError);
      throw commitError;
    }
  }

  function mutateDashboard(mutator) {
    const next = structuredClone(configurationForPortableUse(dashboard));
    mutator(next);
    void commitConfiguration(next);
  }

  function toggleEditMode() {
    if (!editMode) {
      setEditBaseline(configurationForPortableUse(dashboard));
      setEditMode(true);
      return;
    }
    setEditBaseline(null);
    setEditMode(false);
  }

  function resetEditSession() {
    if (editBaseline) void commitConfiguration(editBaseline);
    setEditBaseline(null);
    setEditMode(false);
  }

  function createChart(payload, target) {
    void commitConfiguration(integrateCreatedChart(dashboard, payload, target));
  }

  function saveChart(payload) {
    void commitConfiguration(integrateSavedChart(dashboard, payload));
  }

  function removeChart(chartId) {
    mutateDashboard((next) => {
      for (const page of next.pages ?? []) {
        for (const section of page.sections ?? []) {
          section.panels = section.panels.filter(
            (panel) => (panel.chart ?? panel).id !== chartId,
          );
        }
      }
      next.timeSyncGroups = (next.timeSyncGroups ?? []).flatMap((group) => {
        const members = group.members.filter(({ chartId: id }) => id !== chartId);
        return members.length > 0 ? [{ ...group, members }] : [];
      });
    });
  }

  function importConfig(file) {
    if (!file) return;
    file.text()
      .then((text) => parseDashboardBundle(text))
      .then((config) => commitConfiguration(config))
      .catch((importError) => setError(new Error(
        `Could not import dashboard bundle: ${importError.message}`,
      )));
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
      setError(exportError);
    }
  }

  if (error) {
    return (
      <main className="app-shell">
        <section className="status-panel status-panel-error">
          <h1>Dashboard configuration error</h1>
          <p>{error.message}</p>
        </section>
      </main>
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
    <DashboardRenderer
      dashboard={dashboard}
      displayState={displayState}
      onDisplayAction={dispatchDisplayAction}
      companionStatusLabel={companionStatusLabel(companionStatus)}
      deviceLayout={deviceLayout}
      onDeviceLayoutChange={(layout) => {
        setDeviceLayout(layout);
        localStorage.setItem(DEVICE_LAYOUT_STORAGE_KEY, layout);
      }}
      editMode={editMode}
      onToggleEditMode={toggleEditMode}
      onChartCreate={createChart}
      onChartSave={saveChart}
      onPageAdd={(page) => mutateDashboard((next) => next.pages.push(page))}
      onPageRemove={(pageId) => mutateDashboard((next) => {
        next.pages = next.pages.filter(({ id }) => id !== pageId);
      })}
      onPageChange={(pageId, updates) => mutateDashboard((next) => {
        Object.assign(next.pages.find(({ id }) => id === pageId), updates);
      })}
      onDashboardChange={(updates) => mutateDashboard((next) => Object.assign(next, updates))}
      onPanelEditCommit={(config) => void commitConfiguration(config)}
      onPanelEditCancel={(config) => void commitConfiguration(config)}
      onSectionChange={(pageId, sectionId, updates) => mutateDashboard((next) => {
        const page = next.pages.find(({ id }) => id === pageId);
        Object.assign(page.sections.find(({ id }) => id === sectionId), updates);
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
      onImportConfig={importConfig}
      onExportConfig={exportConfig}
      onResetEditSession={resetEditSession}
    />
  );
}

export function configurationForStorage(dashboard) {
  const config = structuredClone(dashboard);
  delete config.loadedData;
  delete config.datasetProfiles;
  return config;
}

function configurationForPortableUse(dashboard) {
  const config = structuredClone(dashboard);
  delete config.loadedData;
  return config;
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
    (panel) => (panel.chart ?? panel).id === panelId,
  );
  if (panelIndex < 0) return;
  const before = current.panels.slice(0, panelIndex);
  const after = current.panels.slice(panelIndex);
  current.panels = before;
  page.sections.splice(index + 1, 0, { ...section, panels: after });
}

function reorderPanels(config, sourceId, targetId) {
  const panels = config.pages.flatMap(({ sections }) =>
    sections.flatMap(({ panels: entries }) => entries),
  );
  const source = panels.find((panel) => (panel.chart ?? panel).id === sourceId);
  if (!source) return;
  for (const page of config.pages) {
    for (const section of page.sections) {
      section.panels = section.panels.filter(
        (panel) => (panel.chart ?? panel).id !== sourceId,
      );
      const targetIndex = section.panels.findIndex(
        (panel) => (panel.chart ?? panel).id === targetId,
      );
      if (targetIndex >= 0) section.panels.splice(targetIndex, 0, source);
    }
  }
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

function loadDeviceLayout() {
  const layout = localStorage.getItem(DEVICE_LAYOUT_STORAGE_KEY);
  return ["auto", "tablet", "phone"].includes(layout) ? layout : "auto";
}

function initializeVantaBackground(settings) {
  const element = document.getElementById("vanta-background");
  if (!element || !window.VANTA?.NET || !window.THREE) return null;
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
