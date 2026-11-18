import React from "react";

import LandingPage, { hasLandingPresentation } from "../LandingPage.jsx";
import { SimExIcon } from "../common/SimExIcon.js";
import BuildLayoutCreateDialog from "../build/BuildLayoutCreateDialog.jsx";
import DashboardSection, { BuildSectionHeader } from "./DashboardSection.jsx";
import DashboardAttentionStrip from "./DashboardAttentionStrip.jsx";
import { partitionPageSections } from "../../charting/config/sectionRoles.js";

const EMPTY_ARRAY = Object.freeze([]);
const EMPTY_OBJECT = Object.freeze({});
const EMPTY_IDS = new Set();

export default function DashboardCanvas({
  activePage,
  dashboard,
  contentRenderContext,
  surface,
  buildState,
  displayState,
  showFullscreen = true,
  multiSelectMode = false,
  multiPanelIds = [],
  storylineBand = null,
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
  const { attention: attentionSection, body: bodySections } = partitionPageSections(activePage);
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
          <>{storylineBand}<LandingPage page={activePage} pages={dashboard.pages} onNavigate={onNavigate} /></>
        ) : (
          <>
            {attentionSection && (
              <DashboardAttentionStrip surface={surface}
                section={attentionSection}
                sectionDraft={{ ...attentionSection, ...buildState?.sectionDrafts?.[attentionSection.id] }}
                page={activePage}
                pageId={activePage.id}
                dashboard={dashboard}
                excludedIds={EMPTY_IDS}
                geoDataSources={geoDataSources}
                contentRenderContext={contentRenderContext}
                accessibilityEnabled={accessibilityEnabled}
                showFullscreen={showFullscreen}
                actions={buildActions}
                disabled={Boolean(buildState?.disabled)}
                selectedPlacementId={buildState?.selection?.kind === "chart" && buildState.selection.sectionId === attentionSection.id ? buildState.selection.placementId : null}
                sectionSelected={buildState?.selection?.kind === "section" && buildState.selection.sectionId === attentionSection.id}
                draggingPanelId={buildState?.draggingPanelId ?? null}
                dragOverPanelId={buildState?.dragOverPanelId ?? null}
                onDisplayAction={onDisplayAction}
                multiSelectMode={multiSelectMode}
                multiPanelIds={buildState ? EMPTY_ARRAY : multiPanelIds}
                onToggleMultiPanel={onToggleMultiPanel}
                onStartMultiFullscreenSelection={onStartMultiFullscreenSelection}
                buildHeader={buildActions ? (
                  <BuildSectionHeader
                    sectionDraft={{ ...attentionSection, ...buildState?.sectionDrafts?.[attentionSection.id] }}
                    getDashboard={getDashboard}
                    movablePageCount={(dashboard.pages ?? []).filter(({ id, landing }) => id !== activePage.id && !landing).length}
                    pageId={activePage.id}
                    index={(activePage.sections ?? []).findIndex(({ id }) => id === attentionSection.id)}
                    count={activePage.sections?.length ?? 0}
                    disabled={Boolean(buildState?.disabled)}
                    role="attention"
                    onReorder={(targetIndex) => buildActions.reorderSection(attentionSection.id, targetIndex)}
                    onSelect={() => buildActions.select?.({ kind: "section", pageId: activePage.id, sectionId: attentionSection.id })}
                    onCommand={buildActions.structureCommand}
                  />
                ) : null}
              />
            )}
            {storylineBand}
            {bodySections.map((section) => {
              const sectionPlacementIds = new Set((section.panels ?? []).map(({ id }) => id));
              const selectedPlacementId = buildState?.selection?.kind === "chart"
                && buildState.selection.sectionId === section.id
                ? buildState.selection.placementId
                : null;
              return (
                <DashboardSection surface={surface}
                  key={section.id}
                  section={section}
                  sectionDraft={buildState?.sectionDrafts?.[section.id] ?? section}
                  pageId={activePage.id}
                  index={activePage.sections.findIndex(({ id }) => id === section.id)}
                  count={activePage.sections?.length ?? 0}
                  movablePageCount={(dashboard.pages ?? []).filter(({ id, landing }) => id !== activePage.id && !landing).length}
                  getDashboard={getDashboard}
                  excludedIds={EMPTY_IDS}
                  rowsBySource={dashboard.loadedData}
                  chartDataStates={dashboard.chartDataStates}
                  dataSourceStates={dashboard.dataSourceStates}
                  datasetProfiles={dashboard.datasetProfiles}
                  geoDataSources={geoDataSources}
                  dataSources={dashboard.dataSources}
                  assets={dashboard.assets ?? EMPTY_OBJECT}
                  contentRenderContext={contentRenderContext}
                  accessibilityEnabled={accessibilityEnabled}
                  showFullscreen={showFullscreen}
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
