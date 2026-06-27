import React from "react";

import ChartPanel from "./ChartPanel.jsx";
import LayoutGrid from "./LayoutGrid.jsx";
import ChartSettingsPanel from "./ChartSettingsPanel.jsx";

const LAYOUT_OPTIONS = [
  { value: "single-column", label: "Single column" },
  { value: "two-column", label: "Two column" },
  { value: "two-by-two", label: "2x2 grid" },
  { value: "focus-plus-grid", label: "Focus + grid" },
];

export default function DashboardRenderer({
  dashboard,
  editMode,
  onToggleEditMode,
  onLayoutChange,
  onChartChange,
  onExportConfig,
  onResetConfig,
}) {
  const [selectedChartId, setSelectedChartId] = React.useState(null);
  const selectedChart =
    dashboard.charts.find((chart) => chart.id === selectedChartId) ?? null;

  return (
    <main className="app-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">{dashboard.programLabel}</p>
          <h1>{dashboard.title}</h1>
          <p className="subtitle">{dashboard.description}</p>
        </div>
        <dl className="dashboard-meta">
          <div>
            <dt>Scenario</dt>
            <dd>{dashboard.scenarioLabel}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{dashboard.lastUpdated}</dd>
          </div>
        </dl>
      </header>

      <section className="dashboard-toolbar">
        <button type="button" onClick={onToggleEditMode}>
          {editMode ? "View mode" : "Edit mode"}
        </button>
        {editMode && (
          <>
            <label>
              Layout
              <select
                value={dashboard.layout}
                onChange={(event) => onLayoutChange(event.target.value)}
              >
                {LAYOUT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={onExportConfig}>
              Export config
            </button>
            <button type="button" className="secondary" onClick={onResetConfig}>
              Reset config
            </button>
          </>
        )}
      </section>

      <LayoutGrid layout={dashboard.layout}>
        {dashboard.charts.map((chart) => (
          <ChartPanel
            key={chart.id}
            chart={chart}
            data={dashboard.loadedData[chart.dataSource]}
            editMode={editMode}
            onEdit={() => setSelectedChartId(chart.id)}
          />
        ))}
      </LayoutGrid>

      {editMode && selectedChart && (
        <ChartSettingsPanel
          chart={selectedChart}
          onClose={() => setSelectedChartId(null)}
          onChange={(updates) => onChartChange(selectedChart.id, updates)}
        />
      )}
    </main>
  );
}
