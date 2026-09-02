import React from "react";

import { sourceStateForDashboard } from "../../charting/data/chartDataState.js";
import ChartPanel from "../ChartPanel.jsx";
import LandingPage, { hasLandingPresentation } from "../LandingPage.jsx";
import LayoutGrid from "../LayoutGrid.jsx";
import { SimExIcon } from "../common/SimExIcon.js";
import BuildLayoutCreateDialog from "../build/BuildLayoutCreateDialog.jsx";
import SceneViewCompositionGrid from "../time/SceneViewCompositionGrid.jsx";
import DashboardSection from "./DashboardSection.jsx";

const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});

export default function DashboardCanvas({
  activePage,
  dashboard,
  contentRenderContext,
  surface,
  buildState,
  displayState,
  multiSelectMode = false,
  multiPanelIds = [],
  excludedChartIds = [],
  chronoSection = null,
  geoDataSources = EMPTY_OBJECT,
  onNavigate,
  onAddPanelToSection,
  onDisplayAction,
  onToggleMultiPanel,
  onStartMultiFullscreenSelection,
}) {
  const canvasInstanceId = React.useId();
  const [createRequest, setCreateRequest] = React.useState(null);
  const accessibilityEnabled = false;
  const dashboardRef = React.useRef(dashboard);
  dashboardRef.current = dashboard;
  const getDashboard = React.useCallback(() => dashboardRef.current, []);
  const legacyActions = React.useMemo(() => buildState ? Object.freeze({
    select: buildState.onSelect,
    removePanel: buildState.onRemovePanel,
    requestPanelMove: buildState.onRequestPanelMove,
    panelDragStart: buildState.onPanelDragStart,
    panelDragOver: buildState.onPanelDragOver,
    panelDrop: buildState.onPanelDrop,
    panelDragEnd: buildState.onPanelDragEnd,
    reorderSection: buildState.onReorderSection,
    structureCommand: buildState.onStructureCommand,
    addPage: buildState.onAddPage,
    addSection: buildState.onAddSection,
    addChart: buildState.onAddChart,
    addStaticContent: buildState.onAddStaticContent,
  }) : null, [
    buildState?.onAddChart,
    buildState?.onAddPage,
    buildState?.onAddSection,
    buildState?.onAddStaticContent,
    buildState?.onPanelDragEnd,
    buildState?.onPanelDragOver,
    buildState?.onPanelDragStart,
    buildState?.onPanelDrop,
    buildState?.onRemovePanel,
    buildState?.onReorderSection,
    buildState?.onRequestPanelMove,
    buildState?.onSelect,
    buildState?.onStructureCommand,
  ]);
  const buildActions = buildState ? (buildState.actions ?? legacyActions) : null;
  const creationDialog = <BuildLayoutCreateDialog
    open={Boolean(createRequest)}
    kind={createRequest?.kind ?? "page"}
    invoker={createRequest?.invoker}
    onCancel={() => setCreateRequest(null)}
    onSubmit={(name) => {
      const kind = createRequest?.kind;
      setCreateRequest(null);
      if (kind === "section") buildActions?.addSection(name);
      else buildActions?.addPage(name);
    }}
  />;
  const excludedIdKey = [...excludedChartIds, ...(chronoSection?.chartIds ?? [])].join("\u0000");
  const excludedIds = React.useMemo(
    () => new Set(excludedIdKey ? excludedIdKey.split("\u0000") : []),
    [excludedIdKey],
  );
  const chronoPlacements = chronoSection
    ? (activePage?.sections ?? []).flatMap((section) => (
        (section.panels ?? [])
          .filter((placement) => chronoSection.chartIds.includes((placement.chart ?? placement).id))
          .map((placement) => ({ placement, section }))
      ))
    : [];
  const chronoMemberCount = chronoSection?.scene
    ? (chronoSection.scene.members ?? []).length
    : chronoPlacements.length;

  if (!activePage) {
    if (!buildState) return null;
    return (<>
      <section
        className="dashboard-workspace dashboard-blank-canvas"
        data-dashboard-surface={surface}
        aria-labelledby="blank-dashboard-title"
      >
        <div className="dashboard-blank-canvas__content">
          <p className="eyebrow">Blank canvas</p>
          <h2 id="blank-dashboard-title">This dashboard has no content</h2>
          <p>Create the first Page to begin building this dashboard.</p>
          <button
            type="button"
            disabled={Boolean(buildState.disabled)}
            onClick={(event) => setCreateRequest({ kind: "page", invoker: event.currentTarget })}
          >
            Create first Page
          </button>
        </div>
      </section>
      {creationDialog}
    </>);
  }
  const landingActive = hasLandingPresentation(activePage);
  return (<>
    <section
      className="dashboard-workspace"
      data-dashboard-surface={surface}
      data-canonical-canvas-id={activePage.id}
      data-canonical-canvas-instance={canvasInstanceId}
    >
      <div className="page-stack" data-canonical-grid-id={activePage.id}>
        {landingActive ? (
          <LandingPage page={activePage} pages={dashboard.pages} onNavigate={onNavigate} />
        ) : (
          <>
            {chronoMemberCount > 0 && (
              <section
                className="dashboard-section chrono-dashboard-section"
                data-chrono-section={chronoSection.id}
              >
                <div className="section-header">
                  <div className="section-title-block">
                    <h2>{chronoSection.title}</h2>
                    <p>{chronoMemberCount} participating chart{chronoMemberCount === 1 ? "" : "s"}</p>
                  </div>
                </div>
                {chronoSection.scene ? (
                  <SceneViewCompositionGrid
                    dashboard={dashboard}
                    scene={chronoSection.scene}
                    timeContextForChart={chronoSection.timeContextForChart}
                    surface="view-scene"
                  />
                ) : (
                  <LayoutGrid>
                    {chronoPlacements.map(({ placement }) => {
                      const chart = placement.chart ?? placement;
                      return (
                        <ChartPanel
                          key={placement.id}
                          panel={chart}
                          canonicalPanelId={chart.id}
                          canonicalPlacementId={placement.id ?? chart.id}
                          canonicalPlotId={chart.id}
                          rows={dashboard.loadedData?.[chart.sourceId]}
                          sourceState={sourceStateForDashboard(dashboard, chart.sourceId, chart.id)}
                          datasetProfile={dashboard.datasetProfiles?.[chart.sourceId]}
                          geoData={geoDataSources[chart.presentation?.map?.geoSource]}
                          dataSources={dashboard.dataSources}
                          assets={dashboard.assets ?? {}}
                          contentRenderContext={contentRenderContext}
                          accessibilityEnabled={accessibilityEnabled}
                          onDisplayAction={onDisplayAction}
                          multiSelectMode={multiSelectMode}
                          isMultiSelected={multiPanelIds.includes(chart.id)}
                          multiSelectionIndex={multiPanelIds.indexOf(chart.id) + 1}
                          onToggleMultiPanel={onToggleMultiPanel}
                          onStartMultiFullscreenSelection={onStartMultiFullscreenSelection}
                        />
                      );
                    })}
                  </LayoutGrid>
                )}
              </section>
            )}
            {(activePage.sections ?? []).map((section, sectionIndex) => {
              const sectionPlacementIds = new Set((section.panels ?? []).map(({ id }) => id));
              const selectedPlacementId = buildState?.selection?.kind === "chart"
                && buildState.selection.sectionId === section.id
                ? buildState.selection.placementId
                : null;
              return (
                <DashboardSection
                  key={section.id}
                  section={section}
                  sectionDraft={buildState?.sectionDrafts?.[section.id] ?? section}
                  pageId={activePage.id}
                  index={sectionIndex}
                  count={activePage.sections?.length ?? 0}
                  movablePageCount={(dashboard.pages ?? []).filter(({ id, landing }) => id !== activePage.id && !landing).length}
                  getDashboard={getDashboard}
                  excludedIds={excludedIds}
                  rowsBySource={dashboard.loadedData}
                  chartDataStates={dashboard.chartDataStates}
                  dataSourceStates={dashboard.dataSourceStates}
                  datasetProfiles={dashboard.datasetProfiles}
                  geoDataSources={geoDataSources}
                  dataSources={dashboard.dataSources}
                  assets={dashboard.assets ?? EMPTY_OBJECT}
                  contentRenderContext={contentRenderContext}
                  accessibilityEnabled={accessibilityEnabled}
                  actions={buildActions}
                  disabled={Boolean(buildState?.disabled)}
                  selectedPlacementId={selectedPlacementId}
                  sectionSelected={buildState?.selection?.kind === "section" && buildState.selection.sectionId === section.id}
                  draggingPanelId={sectionPlacementIds.has(buildState?.draggingPanelId) ? buildState.draggingPanelId : null}
                  dragOverPanelId={sectionPlacementIds.has(buildState?.dragOverPanelId) ? buildState.dragOverPanelId : null}
                  onAddPanelToSection={onAddPanelToSection}
                  onDisplayAction={onDisplayAction}
                  multiSelectMode={multiSelectMode}
                  multiPanelIds={buildState ? EMPTY_ARRAY : multiPanelIds}
                  onToggleMultiPanel={onToggleMultiPanel}
                  onStartMultiFullscreenSelection={onStartMultiFullscreenSelection}
                />
              );
            })}
            {buildState && (
              <div className="build-add-section-row">
                <button
                  type="button"
                  className="secondary"
                  disabled={Boolean(buildState.disabled)}
                  onClick={(event) => setCreateRequest({ kind: "section", invoker: event.currentTarget })}
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
    {creationDialog}
  </>);
}
