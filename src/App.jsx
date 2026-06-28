import React, { useEffect, useState } from "react";

import DashboardRenderer from "./components/DashboardRenderer.jsx";
import { loadDashboard, loadDashboardConfig } from "./lib/loadDashboard.js";

const STORAGE_KEY = "simex-dashboard-v2-config-pages-v1";

export default function App() {
  const [dashboard, setDashboard] = useState(null);
  const [defaultConfig, setDefaultConfig] = useState(null);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editSessionStartConfig, setEditSessionStartConfig] = useState(null);

  useEffect(() => {
    loadDashboard("/config/dashboard.json")
      .then((loadedDashboard) => {
        const config = stripRuntimeFields(loadedDashboard);
        const savedConfig = loadSavedConfig() ?? config;

        setDefaultConfig(config);
        return loadDashboardConfig(savedConfig);
      })
      .then(setDashboard)
      .catch((loadError) => setError(loadError));
  }, []);

  function updateDashboardConfig(nextConfig) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextConfig, null, 2));
    loadDashboardConfig(nextConfig)
      .then((loadedDashboard) => {
        setError(null);
        setDashboard(loadedDashboard);
      })
      .catch((loadError) => setError(loadError));
  }

  function updatePageLayout(pageId, layout) {
    updateDashboardConfig(updatePageInConfig(stripRuntimeFields(dashboard), pageId, (page) => ({
      ...page,
      layout,
      sections: page.sections.map((section) => ({ ...section, layout })),
    })));
  }

  function updatePanel(panelId, updates) {
    updateDashboardConfig(updatePanelInConfig(stripRuntimeFields(dashboard), panelId, updates));
  }

  function addPanel(pageId, sectionId) {
    updateDashboardConfig(addPanelToConfig(stripRuntimeFields(dashboard), pageId, sectionId));
  }

  function removePanel(panelId) {
    updateDashboardConfig(removePanelFromConfig(stripRuntimeFields(dashboard), panelId));
  }

  function reorderPanel(sourcePanelId, targetPanelId) {
    if (!sourcePanelId || !targetPanelId || sourcePanelId === targetPanelId) {
      return;
    }
    updateDashboardConfig(reorderPanelInConfig(stripRuntimeFields(dashboard), sourcePanelId, targetPanelId));
  }

  function toggleEditMode() {
    if (!editMode) {
      setEditSessionStartConfig(stripRuntimeFields(dashboard));
      setEditMode(true);
      return;
    }

    setEditSessionStartConfig(null);
    setEditMode(false);
  }

  function cancelEditSession() {
    if (!editSessionStartConfig) {
      setEditMode(false);
      return;
    }

    updateDashboardConfig(editSessionStartConfig);
    setEditSessionStartConfig(null);
    setEditMode(false);
  }

  function importConfig(file) {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const importedConfig = JSON.parse(reader.result);
        updateDashboardConfig(importedConfig);
      } catch (importError) {
        setError(new Error(`Could not import config: ${importError.message}`));
      }
    };
    reader.onerror = () => {
      setError(new Error("Could not read the selected config file."));
    };
    reader.readAsText(file);
  }

  function exportConfig() {
    const config = stripRuntimeFields(dashboard);
    const defaultName = `SimEx-config-${dateStamp()}`;
    const chosenName = window.prompt("Name this exported config file", defaultName);
    if (!chosenName) {
      return;
    }
    const fileName = chosenName.endsWith(".json") ? chosenName : `${chosenName}.json`;
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
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
          <p>Reading configuration and prepared data files.</p>
        </section>
      </main>
    );
  }

  return (
    <DashboardRenderer
      dashboard={dashboard}
      editMode={editMode}
      onToggleEditMode={toggleEditMode}
      onPageLayoutChange={updatePageLayout}
      onPanelChange={updatePanel}
      onPanelAdd={addPanel}
      onPanelRemove={removePanel}
      onPanelReorder={reorderPanel}
      onImportConfig={importConfig}
      onExportConfig={exportConfig}
      onResetEditSession={cancelEditSession}
    />
  );
}

function loadSavedConfig() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return null;
  }
  return JSON.parse(saved);
}

function stripRuntimeFields(dashboard) {
  const { loadedData, ...config } = dashboard;
  return config;
}

function updatePageInConfig(config, pageId, updater) {
  return {
    ...config,
    pages: config.pages.map((page) => (page.id === pageId ? updater(page) : page)),
  };
}

function updatePanelInConfig(config, panelId, updates) {
  return {
    ...config,
    pages: config.pages.map((page) => ({
      ...page,
      sections: page.sections.map((section) => ({
        ...section,
        panels: section.panels.map((panel) =>
          panel.id === panelId ? { ...panel, ...updates } : panel,
        ),
      })),
    })),
  };
}

function addPanelToConfig(config, pageId, sectionId) {
  return updatePageInConfig(config, pageId, (page) => ({
    ...page,
    sections: page.sections.map((section) => {
      if (section.id !== sectionId) {
        return section;
      }
      return {
        ...section,
        panels: [createPanelFromSection(section, config), ...section.panels],
      };
    }),
  }));
}

function removePanelFromConfig(config, panelId) {
  return {
    ...config,
    pages: config.pages.map((page) => ({
      ...page,
      sections: page.sections.map((section) => ({
        ...section,
        panels: section.panels.filter((panel) => panel.id !== panelId),
      })),
    })),
  };
}

function reorderPanelInConfig(config, sourcePanelId, targetPanelId) {
  const source = findPanelLocation(config, sourcePanelId);
  const target = findPanelLocation(config, targetPanelId);
  if (!source || !target) {
    return config;
  }

  const movedPanel = config.pages[source.pageIndex].sections[source.sectionIndex].panels[source.panelIndex];
  const nextConfig = structuredClone(config);
  nextConfig.pages[source.pageIndex].sections[source.sectionIndex].panels.splice(source.panelIndex, 1);

  const targetSection = nextConfig.pages[target.pageIndex].sections[target.sectionIndex];
  const adjustedTargetIndex =
    source.pageIndex === target.pageIndex &&
    source.sectionIndex === target.sectionIndex &&
    source.panelIndex < target.panelIndex
      ? target.panelIndex - 1
      : target.panelIndex;
  targetSection.panels.splice(adjustedTargetIndex, 0, movedPanel);
  return nextConfig;
}

function findPanelLocation(config, panelId) {
  for (let pageIndex = 0; pageIndex < config.pages.length; pageIndex += 1) {
    const page = config.pages[pageIndex];
    for (let sectionIndex = 0; sectionIndex < page.sections.length; sectionIndex += 1) {
      const panelIndex = page.sections[sectionIndex].panels.findIndex((panel) => panel.id === panelId);
      if (panelIndex !== -1) {
        return { pageIndex, sectionIndex, panelIndex };
      }
    }
  }
  return null;
}

function createPanelFromSection(section, config) {
  const template = section.panels.find((panel) => panel.dataSource && panel.x) ?? section.panels[0];
  const dataSource = template?.dataSource ?? Object.keys(config.dataSources ?? {}).find((source) => !source.startsWith("geo_"));
  const baseSeries = template?.series?.length
    ? template.series.map((series, index) => ({
        ...series,
        name: index === 0 ? "New series" : series.name,
      }))
    : [{ name: "New series", y: template?.seriesFrom?.valueField ?? "value", color: "#043BCB" }];

  return {
    id: `new_panel_${Date.now()}`,
    title: "New chart",
    type: "line",
    dataSource,
    x: template?.x ?? "date",
    size: "normal",
    legend: true,
    yScale: "zero",
    xAxisMode: looksLikeDateColumn(template?.x) ? "date" : "category",
    colorScheme: "manual",
    series: baseSeries,
  };
}

function looksLikeDateColumn(column) {
  return String(column ?? "").toLowerCase().includes("date");
}

function dateStamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
