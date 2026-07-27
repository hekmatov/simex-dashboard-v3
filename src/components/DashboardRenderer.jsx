import React from "react";

import ChartEditorV3 from "./chart-authoring/ChartEditorV3.jsx";
import ChartWizardV3 from "./chart-authoring/ChartWizardV3.jsx";
import ColorField from "./ColorField.jsx";
import ConfirmDialog from "./common/ConfirmDialog.jsx";
import DeviceLayoutControl from "./DeviceLayoutControl.jsx";
import FullscreenDisplay from "./FullscreenDisplay.jsx";
import InstallDashboardPrompt from "./InstallDashboardPrompt.jsx";
import ChartPanel from "./ChartPanel.jsx";
import LayoutGrid from "./LayoutGrid.jsx";
import LandingPage, { hasLandingPresentation } from "./LandingPage.jsx";
import PlaybackControls from "./playback/PlaybackControls.jsx";
import { PlaybackProvider } from "./playback/PlaybackProvider.jsx";

export default function DashboardRenderer({
  dashboard,
  displayState,
  onDisplayAction,
  companionStatusLabel,
  deviceLayout,
  onDeviceLayoutChange,
  editMode,
  onToggleEditMode,
  onPageAdd,
  onPageRemove,
  onPageChange,
  onDashboardChange,
  onPanelEditCommit,
  onPanelEditCancel,
  onSectionChange,
  onSectionInsert,
  onVantaBackgroundChange,
  onChartCreate,
  onChartSave,
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
  const [multiSelectMode, setMultiSelectMode] = React.useState(false);
  const [multiPanelIds, setMultiPanelIds] = React.useState([]);
  const importInputRef = React.useRef(null);
  const [showVantaSettings, setShowVantaSettings] = React.useState(false);
  const [backgroundDraft, setBackgroundDraft] = React.useState(() => sanitizeVantaSettings(dashboard.vantaBackground));
  const [chartWizardTarget, setChartWizardTarget] = React.useState(null);
  const [chartEditBaseline, setChartEditBaseline] = React.useState(null);
  const [dashboardDraft, setDashboardDraft] = React.useState(() => dashboardTextDraftFromDashboard(dashboard));
  const [pageDrafts, setPageDrafts] = React.useState({});
  const [sectionDrafts, setSectionDrafts] = React.useState({});
  const dashboardDebounceRef = React.useRef(null);
  const pageDebounceRef = React.useRef(null);
  const sectionDebounceRef = React.useRef(null);
  const [resetEditSessionConfirmation, setResetEditSessionConfirmation] =
    React.useState(false);

  const activePage =
    dashboard.pages.find((page) => page.id === activePageId) ?? dashboard.pages[0];
  const landingActive = hasLandingPresentation(activePage);
  const selectedPanel = findPanel(dashboard, selectedPanelId);
  const globalPanelColors = React.useMemo(() => resolveGlobalPanelColors(dashboard), [dashboard.globalStyles]);

  React.useEffect(() => {
    if (!editMode) {
      setShowVantaSettings(false);
      setSelectedPanelId(null);
    }
  }, [editMode]);

  React.useEffect(() => {
    setDashboardDraft(dashboardTextDraftFromDashboard(dashboard));
  }, [dashboard.programLabel, dashboard.scenarioLabel, dashboard.lastUpdated]);

  function navigateToPage(pageId) {
    if (!(dashboard.pages ?? []).some((page) => page.id === pageId)) {
      return;
    }
    setActivePageId(pageId);
    setSelectedPanelId(null);
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
    if (!editMode || !draggingPanelId) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (draggingPanelId === panelId) {
      setDragOverPanelId(null);
      return;
    }
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

  function startMultiFullscreenSelection(panelId) {
    setMultiSelectMode(true);
    setMultiPanelIds((current) => (current.includes(panelId) ? current : [...current, panelId].slice(0, 4)));
  }

  function toggleMultiPanel(panelId) {
    setMultiPanelIds((current) => {
      if (current.includes(panelId)) {
        return current.filter((id) => id !== panelId);
      }
      if (current.length >= 4) {
        return current;
      }
      return [...current, panelId];
    });
  }

  function openMultiFullscreen() {
    if (multiPanelIds.length < 2) {
      return;
    }
    onDisplayAction({ type: "manual_set", chart_ids: multiPanelIds });
    setMultiSelectMode(false);
    setMultiPanelIds([]);
  }

  function cancelMultiSelection() {
    setMultiSelectMode(false);
    setMultiPanelIds([]);
  }

  function addPage() {
    const label = window.prompt("Name this new tab", "New tab");
    if (!label) {
      return;
    }

    const pageId = uniquePageId(dashboard, label);
    onPageAdd({
      id: pageId,
      label,
      title: label,
      description: "New dashboard page.",
      sections: [
        {
          id: `${pageId}_section`,
          title: "New section",
          description: "",
          panels: [],
        },
      ],
    });
    setActivePageId(pageId);
    setSelectedPanelId(null);
  }

  function openBackgroundSettings() {
    setBackgroundDraft(sanitizeVantaSettings(dashboard.vantaBackground));
    setShowVantaSettings(true);
  }

  function saveBackgroundSettings() {
    onVantaBackgroundChange(sanitizeVantaSettings(backgroundDraft));
    setShowVantaSettings(false);
  }

  function resetBackgroundSettings() {
    const defaults = sanitizeVantaSettings();
    setBackgroundDraft(defaults);
    onVantaBackgroundChange(defaults);
    setShowVantaSettings(false);
  }

  function changeBackgroundDraft(updates) {
    setBackgroundDraft((current) => ({ ...current, ...updates }));
  }

  function saveSelectedChartV3(payload) {
    onChartSave(payload);
    setChartEditBaseline(null);
    setSelectedPanelId(null);
  }

  function cancelSelectedPanel() {
    if (chartEditBaseline) {
      onPanelEditCancel(chartEditBaseline);
    }
    setChartEditBaseline(null);
    setSelectedPanelId(null);
  }

  function changePage(pageId, updates) {
    setPageDrafts((current) => ({
      ...current,
      [pageId]: { ...(current[pageId] ?? pageDraftFromPage(dashboard.pages.find((page) => page.id === pageId))), ...updates },
    }));
    window.clearTimeout(pageDebounceRef.current);
    const basePage = pageDrafts[pageId] ?? pageDraftFromPage(dashboard.pages.find((page) => page.id === pageId));
    const nextDraft = { ...basePage, ...updates };
    pageDebounceRef.current = window.setTimeout(() => onPageChange(pageId, nextDraft), 650);
  }

  function changeDashboardText(updates) {
    const nextDraft = { ...dashboardDraft, ...updates };
    setDashboardDraft(nextDraft);
    window.clearTimeout(dashboardDebounceRef.current);
    dashboardDebounceRef.current = window.setTimeout(() => onDashboardChange(nextDraft), 650);
  }

  function changeSection(section, updates) {
    const baseSection = sectionDrafts[section.id] ?? sectionDraftFromSection(section);
    const nextDraft = { ...baseSection, ...updates };
    setSectionDrafts((current) => ({
      ...current,
      [section.id]: nextDraft,
    }));
    window.clearTimeout(sectionDebounceRef.current);
    sectionDebounceRef.current = window.setTimeout(() => {
      onSectionChange(activePage.id, section.id, nextDraft);
    }, 650);
  }

  function applyBackgroundSettings() {
    onVantaBackgroundChange(sanitizeVantaSettings(backgroundDraft));
  }

  function changeGlobalPanelColors(updates) {
    onDashboardChange({
      globalStyles: {
        ...(dashboard.globalStyles ?? {}),
        panelColors: {
          ...globalPanelColors,
          ...updates,
        },
      },
    });
  }

  function startSectionAtPanel(section, panel) {
    const title = window.prompt("Section title", "New section");
    if (!title) {
      return;
    }
    const description = window.prompt("Section subtext", "") ?? "";
    onSectionInsert(activePage.id, section.id, panel.id, {
      id: `${section.id}_${Date.now()}`,
      title,
      description,
    });
  }

  function removeSectionTitle(section) {
    onSectionChange(activePage.id, section.id, { title: "", description: "" });
  }

  function removeActivePage() {
    if ((dashboard.pages ?? []).length <= 1) {
      return;
    }
    if (!window.confirm(`Remove the "${activePage.label}" tab?`)) {
      return;
    }

    const activeIndex = dashboard.pages.findIndex((page) => page.id === activePage.id);
    const fallbackPage = dashboard.pages[activeIndex - 1] ?? dashboard.pages[activeIndex + 1] ?? dashboard.pages[0];
    onPageRemove(activePage.id);
    setActivePageId(fallbackPage.id);
    setSelectedPanelId(null);
  }

  function openPanelEditor(panelId) {
    if (!chartEditBaseline) {
      setChartEditBaseline(dashboardWithCurrentDrafts());
    }
    setSelectedPanelId(panelId);
  }

  function saveEditMode() {
    if (chartEditBaseline) {
      onPanelEditCommit(dashboardWithCurrentDrafts());
      setChartEditBaseline(null);
    }
    onToggleEditMode();
  }

  function dashboardWithCurrentDrafts(panelOverride = null) {
    const nextDashboard = structuredClone(dashboard);
    Object.assign(nextDashboard, dashboardDraft);

    nextDashboard.pages = (nextDashboard.pages ?? []).map((page) => {
      const pageDraft = pageDrafts[page.id];
      const nextPage = pageDraft ? { ...page, ...pageDraft } : page;
      return {
        ...nextPage,
        sections: (nextPage.sections ?? []).map((section) => {
          const sectionDraft = sectionDrafts[section.id];
          const nextSection = sectionDraft ? { ...section, ...sectionDraft } : section;
          return {
            ...nextSection,
            panels: (nextSection.panels ?? []).map((panel) =>
              panelOverride && panel.id === panelOverride.id ? panelOverride : panel,
            ),
          };
        }),
      };
    });

    return nextDashboard;
  }

  if (editMode && showVantaSettings) {
    return (
      <main className="app-shell background-editor-shell">
        <section className="background-editor-bar">
          <VantaSettingsPanel settings={backgroundDraft} onChange={changeBackgroundDraft} />
          <div className="background-editor-actions">
            <button type="button" className="secondary" onClick={applyBackgroundSettings}>Apply</button>
            <button type="button" onClick={saveBackgroundSettings}>Save</button>
            <button type="button" className="secondary" onClick={resetBackgroundSettings}>Reset</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <PlaybackProvider
      groups={dashboard.timeSyncGroups ?? []}
      charts={configuredCharts(dashboard)}
      loadedData={dashboard.loadedData ?? {}}
      profiles={dashboard.datasetProfiles ?? {}}
      initialPosition="latest"
    >
    <main
      className="app-shell"
      data-device-layout={deviceLayout}
      data-page-type={landingActive ? "landing" : "analytical"}
    >
      <header className="dashboard-header">
        <div className="dashboard-brand-block">
          <img className="pdpc-header-mark" src={`${import.meta.env.BASE_URL}assets/pdpc-mark.png`} alt="" />
          <div>
            <p className="eyebrow">{dashboardDraft.programLabel}</p>
            {editMode ? (
              <div className="header-text-edit-fields">
                <input
                  aria-label="Program label"
                  value={dashboardDraft.programLabel ?? ""}
                  onChange={(event) => changeDashboardText({ programLabel: event.target.value })}
                />
                <input
                  aria-label="Page title"
                  value={(pageDrafts[activePage.id]?.title ?? activePage?.title) ?? dashboard.title}
                  onChange={(event) => changePage(activePage.id, { title: event.target.value })}
                />
                <input
                  aria-label="Page subtitle"
                  value={(pageDrafts[activePage.id]?.description ?? activePage?.description) ?? dashboard.description}
                  onChange={(event) => changePage(activePage.id, { description: event.target.value })}
                />
              </div>
            ) : (
              <>
                {landingActive ? (
                  <div className="dashboard-page-title">{activePage?.title ?? dashboard.title}</div>
                ) : (
                  <h1>{activePage?.title ?? dashboard.title}</h1>
                )}
                <p className="subtitle">{activePage?.description ?? dashboard.description}</p>
              </>
            )}
          </div>
        </div>
        <div className="header-right-rail">
          <dl className="dashboard-meta">
            <div>
              <dt>Scenario</dt>
              <dd>
                {editMode ? (
                  <input value={dashboardDraft.scenarioLabel ?? ""} onChange={(event) => changeDashboardText({ scenarioLabel: event.target.value })} />
                ) : (
                  dashboard.scenarioLabel
                )}
              </dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>
                {editMode ? (
                  <input value={dashboardDraft.lastUpdated ?? ""} onChange={(event) => changeDashboardText({ lastUpdated: event.target.value })} />
                ) : (
                  dashboard.lastUpdated
                )}
              </dd>
            </div>
          </dl>
        </div>
        <div className="header-floating-actions">
          <div className="header-edit-primary-actions">
            <button
              type="button"
              className="header-edit-floating-button"
              aria-label={editMode ? "Save edit mode" : "Open edit mode"}
              title={editMode ? "Save" : "Edit mode"}
              onClick={editMode ? saveEditMode : onToggleEditMode}
            >
              {editMode ? "Save" : <span className="edit-sliders-icon" aria-hidden="true" />}
            </button>
            {editMode && (
              <button
                type="button"
                className="header-edit-floating-button secondary"
                onClick={() => setResetEditSessionConfirmation(true)}
              >
                Reset edits
              </button>
            )}
          </div>
        </div>
      </header>
      {editMode && (
        <section className="edit-command-banner" aria-label="Edit commands">
          <div className="edit-command-title">
            <p className="eyebrow">Mode</p>
            <h2>Edit mode</h2>
          </div>
          <div className="header-edit-controls">
            <div className="tab-edit-controls">
              <button type="button" onClick={addPage}>Add tab</button>
              <button type="button" className="secondary" disabled={(dashboard.pages ?? []).length <= 1} onClick={removeActivePage}>Remove tab</button>
            </div>
            <button type="button" onClick={() => importInputRef.current?.click()}>Import dashboard</button>
            <button type="button" onClick={() => onExportConfig(dashboardWithCurrentDrafts())}>Export dashboard</button>
            <GlobalPanelColorControls colors={globalPanelColors} onChange={changeGlobalPanelColors} />
            <button type="button" className="secondary" onClick={openBackgroundSettings}>Background</button>
            {multiSelectMode && (
              <>
                <button type="button" disabled={multiPanelIds.length < 2} onClick={openMultiFullscreen}>Multi-fullscreen ({multiPanelIds.length})</button>
                <button type="button" className="secondary" onClick={cancelMultiSelection}>Cancel multi</button>
              </>
            )}
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
        </section>
      )}

      {multiSelectMode && !editMode && (
        <section className="multi-select-banner" aria-label="Multi-fullscreen selection">
          <strong>{multiPanelIds.length} selected</strong>
          <button type="button" disabled={multiPanelIds.length < 2} onClick={openMultiFullscreen}>Multi-fullscreen</button>
          <button type="button" className="secondary" onClick={cancelMultiSelection}>Cancel</button>
        </section>
      )}

      <nav className="page-tabs" aria-label="Dashboard pages">
        {dashboard.pages.map((page) => (
          editMode ? (
            <label className={`page-tab-edit ${page.id === activePage.id ? "active" : ""}`} key={page.id}>
              <button
                type="button"
                className={page.id === activePage.id ? "active" : "secondary"}
                onClick={() => navigateToPage(page.id)}
              >
                Open
              </button>
              <input
                value={(pageDrafts[page.id]?.label ?? page.label) ?? ""}
                onChange={(event) => changePage(page.id, { label: event.target.value })}
              />
            </label>
          ) : (
            <button
              key={page.id}
              type="button"
              className={page.id === activePage.id ? "active" : "secondary"}
              onClick={() => navigateToPage(page.id)}
            >
              {page.label}
            </button>
          )
        ))}
      </nav>
      {(dashboard.timeSyncGroups?.length ?? 0) > 0 && (
        <PlaybackControls />
      )}

      <section
        className={`dashboard-workspace ${
          editMode && selectedPanel ? "dashboard-workspace-with-settings" : ""
        }`}
      >
        <div className="page-stack">
          {landingActive ? (
            <LandingPage
              page={activePage}
              pages={dashboard.pages}
              onNavigate={navigateToPage}
            />
          ) : (
            activePage.sections.map((section) => (
            <section className="dashboard-section" key={section.id}>
              <div className="section-header">
                <div className="section-title-block">
                  {editMode ? (
                    <>
                      <label className="section-edit-field">
                        <span>Section title</span>
                        <input
                          value={(sectionDrafts[section.id]?.title ?? section.title) ?? ""}
                          onChange={(event) => changeSection(section, { title: event.target.value })}
                        />
                      </label>
                      <label className="section-edit-field">
                        <span>Section subtext</span>
                        <input
                          value={(sectionDrafts[section.id]?.description ?? section.description) ?? ""}
                          onChange={(event) => changeSection(section, { description: event.target.value })}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <h2>{section.title}</h2>
                      {section.description && <p>{section.description}</p>}
                    </>
                  )}
                </div>
                {editMode && (
                  <div className="section-actions">
                    <button
                      type="button"
                      className="secondary add-panel-button"
                      onClick={() => setChartWizardTarget({ pageId: activePage.id, sectionId: section.id })}
                    >
                      Add chart
                    </button>
                    <button
                      type="button"
                      className="secondary add-panel-button"
                      onClick={() => removeSectionTitle(section)}
                    >
                      Remove title
                    </button>
                  </div>
                )}
              </div>
              <LayoutGrid>
                {section.panels.map((panel) => (
                  <ChartPanel
                    key={panel.id}
                    panel={panel}
                    rows={dashboard.loadedData[panel.sourceId] ?? []}
                    datasetProfile={dashboard.datasetProfiles?.[panel.sourceId]}
                    geoData={dashboard.loadedData[panel.presentation?.map?.geoSource]}
                    dataSources={dashboard.dataSources}
                    editMode={editMode}
                    isDragging={draggingPanelId === panel.id}
                    isDragTarget={dragOverPanelId === panel.id}
                    isSelected={editMode && selectedPanelId === panel.id}
                    multiSelectMode={multiSelectMode}
                    isMultiSelected={multiPanelIds.includes(panel.id)}
                    onEdit={() => openPanelEditor(panel.id)}
                    onRemove={() => removePanel(panel.id)}
                    onToggleMultiSelect={() => toggleMultiPanel(panel.id)}
                    onFullScreenHold={() => startMultiFullscreenSelection(panel.id)}
                    onDisplayAction={onDisplayAction}
                    onDragStart={(event) => handlePanelDragStart(event, panel.id)}
                    onDragOver={(event) => handlePanelDragOver(event, panel.id)}
                    onDrop={(event) => handlePanelDrop(event, panel.id)}
                    onDragEnd={clearDragState}
                    onStartSection={() => startSectionAtPanel(section, panel)}
                  />
                ))}
              </LayoutGrid>
            </section>
            ))
          )}
        </div>

        {editMode && selectedPanel && (
          <ChartEditorV3
            chart={selectedPanel}
            timeSyncGroups={dashboard.timeSyncGroups ?? []}
            existingCharts={configuredCharts(dashboard)}
            rows={dashboard.loadedData?.[selectedPanel.sourceId] ?? []}
            profile={dashboard.datasetProfiles?.[selectedPanel.sourceId]}
            loadedData={dashboard.loadedData ?? {}}
            profiles={dashboard.datasetProfiles ?? {}}
            parsingMetadata={dashboard.dataSources?.[selectedPanel.sourceId]?.parsingMetadata ?? {}}
            onSave={saveSelectedChartV3}
            onCancel={cancelSelectedPanel}
            onRemove={() => removePanel(selectedPanel.id)}
          />
        )}
      </section>
      <ChartWizardV3
        open={Boolean(chartWizardTarget)}
        dataSources={dashboard.dataSources}
        loadedData={dashboard.loadedData}
        timeSyncGroups={dashboard.timeSyncGroups ?? []}
        existingCharts={configuredCharts(dashboard)}
        onClose={() => setChartWizardTarget(null)}
        onCreate={(payload) => {
          onChartCreate(payload, chartWizardTarget);
          setChartWizardTarget(null);
        }}
      />
      <ConfirmDialog
        open={resetEditSessionConfirmation}
        title="Discard these edits?"
        message="Reset changes? All unsaved dashboard edits will be replaced by the most recently saved dashboard."
        confirmLabel="Reset edits"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setResetEditSessionConfirmation(false);
          onResetEditSession();
        }}
        onCancel={() => setResetEditSessionConfirmation(false)}
      />
      <FullscreenDisplay
        dashboard={dashboard}
        displayState={displayState}
        onDisplayAction={onDisplayAction}
      />
      <DashboardFooter dashboard={dashboard} />
      <div className="dashboard-device-tools">
        <span className="companion-status" role="status">
          {companionStatusLabel}
        </span>
        <InstallDashboardPrompt />
        <DeviceLayoutControl value={deviceLayout} onChange={onDeviceLayoutChange} />
      </div>
    </main>
    </PlaybackProvider>
  );
}

function DashboardFooter({ dashboard }) {
  const feedbackUrl = dashboard.feedbackUrl || feedbackMailtoUrl(dashboard.contactEmail);
  const contactUrl = dashboard.contactEmail ? `mailto:${dashboard.contactEmail}` : null;
  const showRepositoryLink = Boolean(dashboard.repositoryUrl && dashboard.showRepositoryLink);
  return (
    <footer className="dashboard-footer" aria-label="Dashboard information and feedback">
      <div>
        <strong>{dashboard.footerTitle ?? "SimEx Dashboard V3"}</strong>
        <span>{dashboard.footerCredit ?? "Developed by Hekmat Alrouh"}</span>
      </div>
      <nav aria-label="Project links">
        <a href={feedbackUrl} target="_blank" rel="noreferrer">
          Report a bug / request a feature
        </a>
        {contactUrl && <a href={contactUrl}>Contact maintainer</a>}
        {showRepositoryLink && (
          <a href={dashboard.repositoryUrl} target="_blank" rel="noreferrer">
            Project repository
          </a>
        )}
      </nav>
    </footer>
  );
}

function feedbackMailtoUrl(contactEmail) {
  const email = contactEmail || "hekmat.alrouh@live.com";
  return `mailto:${email}?subject=${encodeURIComponent("SimEx Dashboard feedback")}`;
}

function GlobalPanelColorControls({ colors, onChange }) {
  return (
    <details className="global-color-controls">
      <summary>Global panel colors</summary>
      <div className="global-color-grid">
        <ColorField label="Panel background" value={colors.panelBackgroundColor} fallback="#f5f8fb" onChange={(color) => onChange({ panelBackgroundColor: color })} />
        <ColorField label="Panel border" value={colors.panelBorderColor} fallback="#d8e2ec" onChange={(color) => onChange({ panelBorderColor: color })} />
        <ColorField label="Chart background" value={colors.chartAreaColor} fallback="#eaf1f6" onChange={(color) => onChange({ chartAreaColor: color })} />
        <ColorField label="Chart border" value={colors.chartAreaBorderColor} fallback="#d8e2ec" onChange={(color) => onChange({ chartAreaBorderColor: color })} />
        <ColorField label="Edit highlight" value={colors.editHighlightColor} fallback="#043bcb" onChange={(color) => onChange({ editHighlightColor: color })} />
        <ColorField label="Multi-fullscreen highlight" value={colors.multiSelectHighlightColor} fallback="#00a676" onChange={(color) => onChange({ multiSelectHighlightColor: color })} />
      </div>
    </details>
  );
}

function diffPanel(previous, next) {
  const updates = {};
  for (const key of Object.keys(next)) {
    if (JSON.stringify(previous?.[key]) !== JSON.stringify(next[key])) {
      updates[key] = next[key];
    }
  }
  return updates;
}

function dashboardTextDraftFromDashboard(dashboard) {
  return {
    programLabel: dashboard?.programLabel ?? "",
    scenarioLabel: dashboard?.scenarioLabel ?? "",
    lastUpdated: dashboard?.lastUpdated ?? "",
  };
}

function pageDraftFromPage(page) {
  return {
    label: page?.label ?? "",
    title: page?.title ?? "",
    description: page?.description ?? "",
  };
}

function sectionDraftFromSection(section) {
  return {
    title: section?.title ?? "",
    description: section?.description ?? "",
  };
}

function VantaSettingsPanel({ settings = {}, onChange }) {
  const resolved = sanitizeVantaSettings(settings);
  return (
    <div className="vanta-settings-panel">
      <label>
        Color scheme
        <select
          value={resolved.colorScheme ?? "manual"}
          onChange={(event) => {
            const scheme = event.target.value;
            const colors = backgroundPaletteColors(scheme);
            onChange({
              colorScheme: scheme,
              ...(colors ? { backgroundColor: colors[0], networkColor: colors[1] } : {}),
            });
          }}
        >
          {BACKGROUND_COLOR_SCHEMES.map((scheme) => <option key={scheme.value} value={scheme.value}>{scheme.label}</option>)}
        </select>
      </label>
      <div className="color-scheme-preview" aria-label="Background color scheme preview">
        {(backgroundPaletteColors(resolved.colorScheme) ?? [resolved.backgroundColor, resolved.networkColor]).map((color, index) => <span key={`${color}-${index}`} style={{ backgroundColor: color }} />)}
      </div>
      <ColorField label="Static background" value={resolved.backgroundColor} fallback="#08224a" onChange={(color) => onChange({ backgroundColor: color, colorScheme: "manual" })} />
      <ColorField label="Line/dot color" value={resolved.networkColor} fallback="#9bd3ff" onChange={(color) => onChange({ networkColor: color, colorScheme: "manual" })} />
      <RangeSetting label="Points" value={resolved.points} min={3} max={18} step={1} onChange={(points) => onChange({ points })} />
      <RangeSetting label="Max distance" value={resolved.maxDistance} min={8} max={32} step={1} onChange={(maxDistance) => onChange({ maxDistance })} />
      <RangeSetting label="Spacing" value={resolved.spacing} min={10} max={34} step={1} onChange={(spacing) => onChange({ spacing })} />
      <RangeSetting label="Motion speed" value={resolved.speed} min={0.1} max={2} step={0.05} onChange={(speed) => onChange({ speed })} />
      <label className="checkbox-row"><input type="checkbox" checked={resolved.mouseControls} onChange={(event) => onChange({ mouseControls: event.target.checked })} />Mouse tracking</label>
    </div>
  );
}

function resolveGlobalPanelColors(dashboard) {
  return {
    panelBackgroundColor: dashboard?.globalStyles?.panelColors?.panelBackgroundColor ?? "#f5f8fb",
    panelBorderColor: dashboard?.globalStyles?.panelColors?.panelBorderColor ?? "#d8e2ec",
    chartAreaColor: dashboard?.globalStyles?.panelColors?.chartAreaColor ?? "#eaf1f6",
    chartAreaBorderColor: dashboard?.globalStyles?.panelColors?.chartAreaBorderColor ?? "#d8e2ec",
    editHighlightColor: dashboard?.globalStyles?.panelColors?.editHighlightColor ?? "#043bcb",
    multiSelectHighlightColor: dashboard?.globalStyles?.panelColors?.multiSelectHighlightColor ?? "#00a676",
  };
}

function RangeSetting({ label, value, min, max, step, onChange }) {
  return (
    <label className="range-setting">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>{value}</output>
    </label>
  );
}

function sanitizeVantaSettings(settings) {
  const merged = {
    backgroundColor: "#f7f9fc",
    networkColor: "#f1a1ad",
    mouseControls: false,
    touchControls: false,
    points: 6,
    maxDistance: 17,
    spacing: 18,
    speed: 0.45,
    ...settings,
  };
  return {
    ...merged,
    points: clampNumber(merged.points, 3, 18),
    maxDistance: clampNumber(merged.maxDistance, 8, 32),
    spacing: clampNumber(merged.spacing, 10, 34),
    speed: clampNumber(merged.speed, 0.1, 2),
  };
}

const BACKGROUND_COLOR_SCHEMES = [
  { value: "manual", label: "Manual colors" },
  { value: "pdpc", label: "PDPC mixed" },
  { value: "redGreen5", label: "Likert red to green" },
  { value: "likertInfographic5", label: "Likert infographic" },
  { value: "caseIntensity", label: "Case intensity" },
  { value: "blueYellow5", label: "Likert blue to yellow" },
  { value: "cool", label: "Cool blues/teals" },
  { value: "warm", label: "Warm alert" },
];

function backgroundPaletteColors(scheme) {
  const palettes = {
    pdpc: ["#08224A", "#043BCB", "#36BDEB", "#2BAA7B", "#F1A1AD"],
    redGreen5: ["#D71920", "#FDAE61", "#FFFFBF", "#A6D96A", "#1A9641"],
    likertInfographic5: ["#3BA64A", "#A7B734", "#F6A21A", "#F47B20", "#DF1F2D"],
    caseIntensity: ["#7FDEC1", "#4496D1", "#043BCB", "#08224A", "#8F1D2C"],
    blueYellow5: ["#2C7BB6", "#ABD9E9", "#FFFFBF", "#FDAE61", "#D7191C"],
    cool: ["#08224A", "#2456A6", "#4496D1", "#007C89", "#7FDEC1"],
    warm: ["#8F1D2C", "#C98700", "#F3D37A", "#E16B5A", "#08224A"],
  };
  return palettes[scheme];
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return min;
  }
  return Math.min(Math.max(number, min), max);
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

function configuredCharts(dashboard) {
  return (dashboard?.pages ?? []).flatMap((page) =>
    (page.sections ?? []).flatMap((section) =>
      (section.panels ?? []).map((panel) => panel.chart ?? panel),
    ),
  );
}

function uniquePageId(dashboard, label) {
  const base = slugify(label) || "new_page";
  const existing = new Set((dashboard.pages ?? []).map((page) => page.id));
  let candidate = base;
  let counter = 2;
  while (existing.has(candidate)) {
    candidate = `${base}_${counter}`;
    counter += 1;
  }
  return candidate;
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}







