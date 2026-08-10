import React from "react";

import ChartPanel from "../ChartPanel.jsx";
import LandingPage, { hasLandingPresentation } from "../LandingPage.jsx";
import LayoutGrid from "../LayoutGrid.jsx";
import { requestBuildChartSelection } from "../build/buildSelectionModel.js";

export default function DashboardCanvas({
  activePage,
  dashboard,
  surface,
  buildState,
  displayState,
  multiSelectMode = false,
  multiPanelIds = [],
  geoDataSources = {},
  onNavigate,
  onDisplayAction,
  onToggleMultiPanel,
  onStartMultiFullscreenSelection,
}) {
  if (!activePage) return null;
  const landingActive = hasLandingPresentation(activePage);
  const accessibilityEnabled = dashboard.globalStyles?.accessibility?.enabled === true;

  return (
    <section className="dashboard-workspace" data-dashboard-surface={surface}>
      <div className="page-stack">
        {landingActive ? (
          <LandingPage page={activePage} pages={dashboard.pages} onNavigate={onNavigate} />
        ) : (
          (activePage.sections ?? []).map((section) => (
            <section className="dashboard-section" key={section.id}>
              <div className="section-header">
                <div className="section-title-block">
                  <h2>{section.title}</h2>
                  {section.description && <p>{section.description}</p>}
                </div>
              </div>
              <LayoutGrid>
                {(section.panels ?? []).map((placement) => {
                  const chart = placement.chart ?? placement;
                  const selected = buildState?.selection?.kind === "chart"
                    && buildState.selection.placementId === placement.id;
                  return (
                    <ChartPanel
                      key={placement.id}
                      panel={chart}
                      rows={dashboard.loadedData?.[chart.sourceId] ?? []}
                      datasetProfile={dashboard.datasetProfiles?.[chart.sourceId]}
                      geoData={geoDataSources[chart.presentation?.map?.geoSource]}
                      dataSources={dashboard.dataSources}
                      accessibilityEnabled={accessibilityEnabled}
                      editMode={Boolean(buildState)}
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
            </section>
          ))
        )}
      </div>
    </section>
  );
}
