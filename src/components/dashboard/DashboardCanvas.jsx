import React from "react";

import { sourceStateForDashboard } from "../../charting/data/chartDataState.js";
import ChartPanel from "../ChartPanel.jsx";
import LandingPage, { hasLandingPresentation } from "../LandingPage.jsx";
import LayoutGrid from "../LayoutGrid.jsx";
import { requestBuildChartSelection } from "../build/buildSelectionModel.js";
import { SimExIcon } from "../common/SimExIcon.js";

export default function DashboardCanvas({
  activePage,
  dashboard,
  surface,
  buildState,
  displayState,
  multiSelectMode = false,
  multiPanelIds = [],
  excludedChartIds = [],
  geoDataSources = {},
  onNavigate,
  onDisplayAction,
  onToggleMultiPanel,
  onStartMultiFullscreenSelection,
}) {
  if (!activePage) return null;
  const landingActive = hasLandingPresentation(activePage);
  const accessibilityEnabled = dashboard.globalStyles?.accessibility?.enabled === true;
  const excludedIds = new Set(excludedChartIds);

  return (
    <section className="dashboard-workspace" data-dashboard-surface={surface}>
      <div className="page-stack">
        {landingActive ? (
          <LandingPage page={activePage} pages={dashboard.pages} onNavigate={onNavigate} />
        ) : (
          <>
            {(activePage.sections ?? []).map((section, sectionIndex) => {
              const visiblePlacements = (section.panels ?? []).filter((placement) => {
                const chart = placement.chart ?? placement;
                return !excludedIds.has(chart.id);
              });
              if (visiblePlacements.length === 0 && !buildState) return null;
              const sectionDraft = buildState?.sectionDrafts?.[section.id] ?? section;
              return (
                <section className="dashboard-section" key={section.id}>
                  {buildState ? (
                    <BuildSectionHeader
                      section={section}
                      sectionDraft={sectionDraft}
                      index={sectionIndex}
                      count={activePage.sections?.length ?? 0}
                      disabled={Boolean(buildState.disabled)}
                      onRename={(updates) => buildState.onRenameSection?.(section, updates)}
                      onReorder={(targetIndex) => buildState.onReorderSection?.(section.id, targetIndex)}
                    />
                  ) : (
                    <div className="section-header">
                      <div className="section-title-block">
                        <h2>{section.title}</h2>
                        {section.description && <p>{section.description}</p>}
                      </div>
                    </div>
                  )}
                  {visiblePlacements.length > 0 ? (
                    <LayoutGrid>
                      {visiblePlacements.map((placement) => {
                        const chart = placement.chart ?? placement;
                        const selected = buildState?.selection?.kind === "chart"
                          && buildState.selection.placementId === placement.id;
                        return (
                          <ChartPanel
                            key={placement.id}
                            panel={chart}
                            rows={dashboard.loadedData?.[chart.sourceId]}
                            sourceState={sourceStateForDashboard(dashboard, chart.sourceId, chart.id)}
                            datasetProfile={dashboard.datasetProfiles?.[chart.sourceId]}
                            geoData={geoDataSources[chart.presentation?.map?.geoSource]}
                            dataSources={dashboard.dataSources}
                            accessibilityEnabled={accessibilityEnabled}
                            editMode={Boolean(buildState)}
                            placementId={placement.id}
                            editDisabled={Boolean(buildState?.disabled)}
                            isSelected={selected}
                            onEdit={buildState ? () => requestBuildChartSelection(
                              buildState,
                              {
                                pageId: activePage.id,
                                sectionId: section.id,
                                placementId: placement.id,
                                chartId: chart.id,
                              },
                            ) : undefined}
                            onDisplayAction={onDisplayAction}
                            multiSelectMode={multiSelectMode}
                            isMultiSelected={multiPanelIds.includes(chart.id)}
                            multiSelectionIndex={multiPanelIds.indexOf(chart.id) + 1}
                            onToggleMultiSelect={() => onToggleMultiPanel?.(chart.id)}
                            onFullScreenHold={() => onStartMultiFullscreenSelection?.(chart.id)}
                          />
                        );
                      })}
                    </LayoutGrid>
                  ) : (
                    <section className="build-empty-section" aria-label={`${sectionDraft.title || "Untitled section"} empty state`}>
                      <p>This section has no panels.</p>
                      <button
                        type="button"
                        disabled={Boolean(buildState.disabled)}
                        onClick={() => buildState.onAddChart?.(section.id)}
                      >
                        Add Panel to Section
                      </button>
                    </section>
                  )}
                </section>
              );
            })}
            {buildState && (
              <div className="build-add-section-row">
                <button
                  type="button"
                  className="secondary"
                  disabled={Boolean(buildState.disabled)}
                  onClick={() => buildState.onAddSection?.()}
                >
                  <SimExIcon iconId="addTab" size={18} />
                  <span>Add section</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function BuildSectionHeader({
  section,
  sectionDraft,
  index,
  count,
  disabled,
  onRename,
  onReorder,
}) {
  const title = sectionDraft.title || "Untitled section";
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(title);
  const titleButtonRef = React.useRef(null);
  const endingRef = React.useRef(false);

  React.useEffect(() => {
    if (!editing) setValue(title);
  }, [editing, title]);

  const restoreTitleFocus = () => {
    window.requestAnimationFrame(() => titleButtonRef.current?.focus());
  };
  const finish = (commit) => {
    if (endingRef.current) return;
    endingRef.current = true;
    const nextTitle = value.trim();
    if (commit && nextTitle && nextTitle !== sectionDraft.title) {
      onRename?.({ title: nextTitle });
    } else if (!commit) {
      setValue(title);
    }
    setEditing(false);
    restoreTitleFocus();
    window.requestAnimationFrame(() => { endingRef.current = false; });
  };

  return (
    <div className="section-header build-section-header">
      <div className="section-title-block">
        {editing ? (
          <label className="build-section-title-field">
            <span className="visually-hidden">Section title</span>
            <input
              autoFocus
              value={value}
              disabled={disabled}
              onChange={(event) => setValue(event.target.value)}
              onBlur={() => finish(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  finish(true);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  finish(false);
                }
              }}
            />
          </label>
        ) : (
          <h2>
            <button
              ref={titleButtonRef}
              type="button"
              className="build-section-title-button"
              disabled={disabled}
              aria-label={`Rename ${title}`}
              onClick={() => {
                setValue(title);
                setEditing(true);
              }}
            >
              {title}
            </button>
          </h2>
        )}
        {sectionDraft.description && <p>{sectionDraft.description}</p>}
      </div>
      <div className="build-section-actions" aria-label={`${title} Section actions`}>
        <button
          type="button"
          className="secondary"
          disabled={disabled || index === 0}
          aria-label={`Move ${title} earlier`}
          title={`Move ${title} earlier`}
          onClick={() => onReorder(index - 1)}
        >
          <SimExIcon iconId="reorderPrevious" size={18} />
        </button>
        <button
          type="button"
          className="secondary"
          disabled={disabled || index === count - 1}
          aria-label={`Move ${title} later`}
          title={`Move ${title} later`}
          onClick={() => onReorder(index + 1)}
        >
          <SimExIcon iconId="reorderNext" size={18} />
        </button>
      </div>
    </div>
  );
}
