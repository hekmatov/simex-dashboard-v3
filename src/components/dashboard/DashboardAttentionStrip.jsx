import React from "react";

import { sourceStateForDashboard } from "../../charting/data/chartDataState.js";
import { resolveDrillTarget } from "../../charting/config/sectionRoles.js";
import DashboardChartPlacement from "./DashboardChartPlacement.jsx";
import { navigateToDrillTarget } from "./drillNavigation.js";

export default function DashboardAttentionStrip({
  section,
  sectionDraft = section,
  page,
  pageId,
  dashboard,
  excludedIds,
  geoDataSources = {},
  contentRenderContext,
  accessibilityEnabled,
  showFullscreen,
  actions = null,
  disabled = false,
  selectedPlacementId = null,
  sectionSelected = false,
  draggingPanelId = null,
  dragOverPanelId = null,
  onDisplayAction,
  multiSelectMode = false,
  multiPanelIds = [],
  onToggleMultiPanel,
  onStartMultiFullscreenSelection,
  buildHeader = null,
}) {
  const visible = (section.panels ?? []).filter((placement) => !excludedIds.has((placement.chart ?? placement).id));
  if (visible.length === 0 && !actions) return null;
  const title = sectionDraft.title || section.title;
  const dataState = {
    loadedData: dashboard.loadedData,
    chartDataStates: dashboard.chartDataStates,
    dataSourceStates: dashboard.dataSourceStates,
  };
  return (
    <section
      className={`dashboard-section dashboard-attention-strip${sectionSelected ? " is-build-selected" : ""}`}
      data-section-role="attention"
      data-canonical-section-id={section.id}
      aria-label={title || "Page attention"}
      tabIndex={-1}
    >
      {buildHeader ?? (title ? (
        <div className="section-header">
          <div className="section-title-block">
            <h2>{title}</h2>
            {section.description && <p>{section.description}</p>}
          </div>
        </div>
      ) : null)}
      {visible.length > 0 ? (
        <div className="attention-strip-items">
          {visible.map((placement) => {
            const chart = placement.chart ?? placement;
            const target = resolveDrillTarget(page, placement.drill);
            const selected = selectedPlacementId === placement.id;
            return (
              <div key={placement.id} className="attention-strip-item" data-attention-item={chart.id}>
                <DashboardChartPlacement
                  placement={placement}
                  pageId={pageId}
                  sectionId={section.id}
                  rows={dashboard.loadedData?.[chart.sourceId]}
                  sourceState={sourceStateForDashboard(dataState, chart.sourceId, chart.id)}
                  datasetProfile={dashboard.datasetProfiles?.[chart.sourceId]}
                  geoData={geoDataSources[chart.presentation?.map?.geoSource]}
                  dataSources={dashboard.dataSources}
                  assets={dashboard.assets ?? {}}
                  contentRenderContext={contentRenderContext}
                  accessibilityEnabled={accessibilityEnabled}
                  showFullscreen={showFullscreen}
                  actions={actions}
                  editDisabled={disabled}
                  editControlDisabled={disabled && !selected}
                  isDragging={draggingPanelId === placement.id}
                  isDragTarget={dragOverPanelId === placement.id}
                  isSelected={selected}
                  onDisplayAction={onDisplayAction}
                  multiSelectMode={multiSelectMode}
                  isMultiSelected={multiPanelIds.includes(chart.id)}
                  multiSelectionIndex={multiPanelIds.indexOf(chart.id) + 1}
                  onToggleMultiPanel={actions ? undefined : onToggleMultiPanel}
                  onStartMultiFullscreenSelection={actions ? undefined : onStartMultiFullscreenSelection}
                />
                {target && !actions && (
                  <button
                    type="button"
                    className="attention-drill"
                    data-drill-kind={target.kind}
                    data-drill-target={target.id}
                    onClick={() => navigateToDrillTarget(target)}
                  >
                    Open {target.title}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <section className="dashboard-empty-section build-empty-section" aria-label={`${title || "Attention strip"} empty state`}>
          <p>This attention strip has no cards yet. Add a KPI card or Delta card.</p>
          <div className="build-empty-section__actions">
            <button type="button" disabled={disabled} onClick={() => actions.addChart(section.id)}>Add chart</button>
          </div>
        </section>
      )}
    </section>
  );
}
