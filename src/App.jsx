import React, { useEffect, useState } from "react";

import DashboardRenderer from "./components/DashboardRenderer.jsx";
import { loadDashboard, loadDashboardConfig } from "./lib/loadDashboard.js";

const STORAGE_KEY = "simex-dashboard-v2-config";

export default function App() {
  const [dashboard, setDashboard] = useState(null);
  const [defaultConfig, setDefaultConfig] = useState(null);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);

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
      .then(setDashboard)
      .catch((loadError) => setError(loadError));
  }

  function updateLayout(layout) {
    updateDashboardConfig({
      ...stripRuntimeFields(dashboard),
      layout,
    });
  }

  function updateChart(chartId, updates) {
    updateDashboardConfig({
      ...stripRuntimeFields(dashboard),
      charts: dashboard.charts.map((chart) =>
        chart.id === chartId ? { ...chart, ...updates } : chart,
      ),
    });
  }

  function resetDashboard() {
    localStorage.removeItem(STORAGE_KEY);
    loadDashboardConfig(defaultConfig)
      .then(setDashboard)
      .catch((loadError) => setError(loadError));
  }

  function exportConfig() {
    const config = stripRuntimeFields(dashboard);
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dashboard.json";
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
      onToggleEditMode={() => setEditMode((value) => !value)}
      onLayoutChange={updateLayout}
      onChartChange={updateChart}
      onExportConfig={exportConfig}
      onResetConfig={resetDashboard}
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
