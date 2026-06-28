import React from "react";

import ChartPanel from "./ChartPanel.jsx";
import ChartSettingsPanel from "./ChartSettingsPanel.jsx";
import LayoutGrid from "./LayoutGrid.jsx";

const LAYOUT_OPTIONS = [
  { value: "single-column", label: "Single column" },
  { value: "two-column", label: "Side by side" },
  { value: "two-by-two", label: "2x2 grid" },
  { value: "focus-plus-grid", label: "Focus + grid" },
];

export default function DashboardRenderer({
  dashboard,
  editMode,
  onToggleEditMode,
  onPageLayoutChange,
  onPanelChange,
  onPanelAdd,
  onPanelRemove,
  onPanelReorder,
  onImportConfig,
  onExportConfig,
  onResetEditSession,
}) {
  const [activePageId, setActivePageId] = React.useState(
    dashboard.pages?.[0]?.id ?? "dashboard",
  );
  const [selectedPanelId, setSelectedPanelId] = React.useState(null);
  const [draggingPanelId, setDraggingPanelId] = React.useState(null);
  const [dragOverPanelId, setDragOverPanelId] = React.useState(null);
  const importInputRef = React.useRef(null);
  const [filterValues, setFilterValues] = React.useState(() =>
    collectFilterDefaults(dashboard),
  );

  React.useEffect(() => {
    setFilterValues((current) => ({
      ...collectFilterDefaults(dashboard),
      ...current,
    }));
  }, [dashboard]);

  const activePage =
    dashboard.pages.find((page) => page.id === activePageId) ?? dashboard.pages[0];
  const selectedPanel = findPanel(dashboard, selectedPanelId);
  const selectedPanelData = dashboard.loadedData[selectedPanel?.dataSource] ?? [];
  const selectedPanelColumns = Array.isArray(selectedPanelData)
    ? Object.keys(selectedPanelData[0] ?? {})
    : [];

  function changeFilter(filter, value) {
    setFilterValues((current) => ({
      ...current,
      [filter.id]: value,
    }));
  }

  function removePanel(panelId) {
    setSelectedPanelId((current) => (current === panelId ? null : current));
    onPanelRemove(panelId);
  }

  function handlePanelDragStart(event, panelId) {
    setDraggingPanelId(panelId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", panelId);
  }

  function handlePanelDragOver(event, panelId) {
    if (!editMode || !draggingPanelId || draggingPanelId === panelId) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverPanelId(panelId);
  }

  function handlePanelDrop(event, targetPanelId) {
    event.preventDefault();
    const sourcePanelId = event.dataTransfer.getData("text/plain") || draggingPanelId;
    onPanelReorder(sourcePanelId, targetPanelId);
    setDraggingPanelId(null);
    setDragOverPanelId(null);
  }

  function clearDragState() {
    setDraggingPanelId(null);
    setDragOverPanelId(null);
  }

  return (
    <main className="app-shell">
      <header className="dashboard-header">
        <div className="dashboard-brand-block">
          <img className="pdpc-header-mark" src="/assets/pdpc-mark.png" alt="" />
          <div>
            <p className="eyebrow">{dashboard.programLabel}</p>
            <h1>{activePage?.title ?? dashboard.title}</h1>
            <p className="subtitle">{activePage?.description ?? dashboard.description}</p>
          </div>
        </div>
        <div className="header-right-rail">
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
          <div className={`header-edit-card ${editMode ? "expanded" : "collapsed"}`}>
            {!editMode ? (
              <button
                type="button"
                className="header-edit-icon-button"
                aria-label="Open edit mode"
                title="Edit mode"
                onClick={onToggleEditMode}
              >
                <span className="edit-sliders-icon" aria-hidden="true" />
              </button>
            ) : (
              <>
                <div className="header-edit-title-row">
                  <div>
                    <p className="eyebrow">Mode</p>
                    <h2>Edit mode</h2>
                  </div>
                  <button type="button" className="secondary" onClick={onToggleEditMode}>
                    Save
                  </button>
                </div>
                <div className="header-edit-controls">
                  <label>
                    {activePage.label} layout
                    <select
                      value={activePage.layout ?? dashboard.layout}
                      onChange={(event) => onPageLayoutChange(activePage.id, event.target.value)}
                    >
                      {LAYOUT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={() => importInputRef.current?.click()}>
                    Import config
                  </button>
                  <button type="button" onClick={onExportConfig}>
                    Export config
                  </button>
                  <button type="button" className="secondary" onClick={onResetEditSession}>
                    Reset edits
                  </button>
                  <input
                    ref={importInputRef}
                    className="visually-hidden"
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) => {
                      onImportConfig(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <nav className="page-tabs" aria-label="Dashboard pages">
        {dashboard.pages.map((page) => (
          <button
            key={page.id}
            type="button"
            className={page.id === activePage.id ? "active" : "secondary"}
            onClick={() => {
              setActivePageId(page.id);
              setSelectedPanelId(null);
            }}
          >
            {page.label}
          </button>
        ))}
      </nav>

      <section
        className={`dashboard-workspace ${
          editMode && selectedPanel ? "dashboard-workspace-with-settings" : ""
        }`}
      >
        <div className="page-stack">
          {activePage.sections.map((section) => (
            <section className="dashboard-section" key={section.id}>
              <div className="section-header">
                <div>
                  <h2>{section.title}</h2>
                  {section.description && <p>{section.description}</p>}
                </div>
                <div className="section-actions">
                  <FilterControls
                    filters={section.filters ?? []}
                    values={filterValues}
                    onChange={changeFilter}
                  />
                  {editMode && (
                    <button
                      type="button"
                      className="secondary add-panel-button"
                      onClick={() => onPanelAdd(activePage.id, section.id)}
                    >
                      Add chart
                    </button>
                  )}
                </div>
              </div>
              <LayoutGrid layout={section.layout ?? activePage.layout ?? dashboard.layout}>
                {section.panels.map((panel) => (
                  <ChartPanel
                    key={panel.id}
                    panel={panel}
                    data={dashboard.loadedData[panel.dataSource]}
                    geoData={dashboard.loadedData[panel.geoSource]}
                    filterDefinitions={section.filters ?? []}
                    filterValues={filterValues}
                    editMode={editMode}
                    isDragging={draggingPanelId === panel.id}
                    isDragTarget={dragOverPanelId === panel.id}
                    onEdit={() => setSelectedPanelId(panel.id)}
                    onRemove={() => removePanel(panel.id)}
                    onDragStart={(event) => handlePanelDragStart(event, panel.id)}
                    onDragOver={(event) => handlePanelDragOver(event, panel.id)}
                    onDrop={(event) => handlePanelDrop(event, panel.id)}
                    onDragEnd={clearDragState}
                  />
                ))}
              </LayoutGrid>
            </section>
          ))}
        </div>

        {editMode && selectedPanel && (
          <ChartSettingsPanel
            panel={selectedPanel}
            dataSources={dashboard.dataSources}
            dataColumns={selectedPanelColumns}
            dataRows={Array.isArray(selectedPanelData) ? selectedPanelData : []}
            onClose={() => setSelectedPanelId(null)}
            onRemove={() => removePanel(selectedPanel.id)}
            onChange={(updates) => onPanelChange(selectedPanel.id, updates)}
          />
        )}
      </section>
    </main>
  );
}

function FilterControls({ filters, values, onChange }) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="filter-strip">
      {filters.map((filter) => {
        const value = values[filter.id];
        if (filter.type === "dateRange") {
          return (
            <div className="filter-pair" key={filter.id}>
              <span>{filter.label}</span>
              <input
                aria-label={`${filter.label} start`}
                type="date"
                value={value?.start ?? filter.defaultStart}
                min={filter.defaultStart}
                max={filter.defaultEnd}
                onChange={(event) =>
                  onChange(filter, { ...value, start: event.target.value })
                }
              />
              <input
                aria-label={`${filter.label} end`}
                type="date"
                value={value?.end ?? filter.defaultEnd}
                min={filter.defaultStart}
                max={filter.defaultEnd}
                onChange={(event) =>
                  onChange(filter, { ...value, end: event.target.value })
                }
              />
            </div>
          );
        }

        return (
          <label key={filter.id}>
            {filter.label}
            <select
              value={value ?? filter.defaultValue}
              onChange={(event) => onChange(filter, event.target.value)}
            >
              {filter.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}

function collectFilterDefaults(dashboard) {
  const defaults = {};
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      for (const filter of section.filters ?? []) {
        defaults[filter.id] =
          filter.type === "dateRange"
            ? { start: filter.defaultStart, end: filter.defaultEnd }
            : filter.defaultValue;
      }
    }
  }
  return defaults;
}

function findPanel(dashboard, panelId) {
  if (!panelId) {
    return null;
  }
  for (const page of dashboard.pages ?? []) {
    for (const section of page.sections ?? []) {
      const panel = section.panels.find((candidate) => candidate.id === panelId);
      if (panel) {
        return panel;
      }
    }
  }
  return null;
}
