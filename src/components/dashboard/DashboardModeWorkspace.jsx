import React from "react";

import FullscreenDisplay from "../FullscreenDisplay.jsx";
import PlaybackSurface from "../playback/PlaybackSurface.jsx";
import { usePlayback } from "../playback/PlaybackProvider.jsx";
import { sceneNavigationPageId } from "../view/ViewShell.jsx";
import CanonicalDashboardFrame, { CanonicalDashboardFooter } from "./CanonicalDashboardFrame.jsx";
import DashboardCanvas from "./DashboardCanvas.jsx";
import DashboardHeader from "./DashboardHeader.jsx";

export default function DashboardModeWorkspace({
  mode,
  activePage,
  pageType,
  dashboard,
  buildPanelOpen = false,
  buildState = null,
  buildOverlay = null,
  displayState,
  iconLanguageStyles,
  geoDataSources,
  multiSelectMode = false,
  multiPanelIds = [],
  multiSelectNotice,
  onActivePageChange,
  onAddPanelToSection,
  onDisplayAction,
  onToggleMultiPanel,
  onStartMultiFullscreenSelection,
  onOpenMultiFullscreen,
  onCancelMultiSelection,
}) {
  const playback = usePlayback();
  const buildMode = mode === "build";
  const scenePageId = buildMode ? null : sceneNavigationPageId(playback.activeScene, activePage);

  React.useEffect(() => {
    if (scenePageId && typeof onActivePageChange === "function") {
      onActivePageChange(scenePageId);
    }
  }, [onActivePageChange, scenePageId]);
  React.useEffect(() => {
    if (!buildMode) playback.dispatch({ type: "navigate" });
  }, [activePage?.id, buildMode]);
  React.useEffect(() => {
    if (buildMode) return undefined;
    return () => playback.dispatch({ type: "modeExit" });
  }, [buildMode]);

  const chronoSource = buildMode ? null : playback.activeScene ?? playback.activeGroup;
  const chronoSuspended = !buildMode && playback.playbackView === true
    && (displayState?.displayed_chart_ids?.length ?? 0) > 0;
  const chronoSection = !buildMode && playback.playbackView === true && chronoSource
    ? {
        id: chronoSource.id,
        title: chronoSource.name,
        chartIds: playback.activeScene || playback.scope === "group-only"
          ? playback.participatingChartIds
          : pageChartIds(activePage),
      }
    : null;

  const viewOverlay = buildMode ? null : (
    <>
      {multiSelectMode && (
        <section className="multi-select-dock" aria-label="Chart comparison selection">
          <span className="multi-select-count">
            <strong>{multiPanelIds.length}</strong>
            <span>of 4 selected</span>
          </span>
          <button type="button" disabled={multiPanelIds.length < 2} onClick={onOpenMultiFullscreen}>
            Compare
          </button>
          <button type="button" className="secondary" onClick={onCancelMultiSelection}>
            Cancel
          </button>
        </section>
      )}
      {multiSelectNotice && (
        <div className="multi-select-limit-notice" role="alert" key={multiSelectNotice.id}>
          {multiSelectNotice.message}
        </div>
      )}
      <FullscreenDisplay
        dashboard={dashboard}
        displayState={displayState}
        onDisplayAction={onDisplayAction}
        timeContextForChart={playback.timeContextForChart}
        accessibilityEnabled={dashboard.globalStyles?.accessibility?.enabled === true}
      />
    </>
  );

  return (
    <div className={buildMode ? "build-mode-shell" : "view-mode-shell"} style={iconLanguageStyles}>
      <CanonicalDashboardFrame
        mode={mode}
        pageType={pageType}
        buildPanelOpen={buildPanelOpen}
        pageId={activePage?.id}
        dashboardHeader={<DashboardHeader activePage={activePage} dashboard={dashboard} />}
        pageContent={(
          <div className={buildMode ? "canonical-build-content" : "canonical-view-content"}>
            <PlaybackSurface
              accessibilityEnabled={dashboard.globalStyles?.accessibility?.enabled === true}
              disabled={buildMode}
              viewOwned={!buildMode}
              suspended={chronoSuspended}
            >
              <DashboardCanvas
                activePage={activePage}
                dashboard={dashboard}
                surface={buildMode ? "build" : "view"}
                buildState={buildMode ? buildState : null}
                displayState={displayState}
                multiSelectMode={!buildMode && multiSelectMode}
                multiPanelIds={buildMode ? [] : multiPanelIds}
                chronoSection={chronoSection}
                geoDataSources={geoDataSources}
                onNavigate={onActivePageChange}
                onAddPanelToSection={buildMode ? undefined : onAddPanelToSection}
                onDisplayAction={onDisplayAction}
                onToggleMultiPanel={onToggleMultiPanel}
                onStartMultiFullscreenSelection={onStartMultiFullscreenSelection}
              />
            </PlaybackSurface>
          </div>
        )}
        footer={<CanonicalDashboardFooter dashboard={dashboard} />}
        overlayLayer={buildMode ? buildOverlay : viewOverlay}
      />
    </div>
  );
}

function pageChartIds(page) {
  return (page?.sections ?? []).flatMap((section) => (
    section.panels ?? []
  ).map((placement) => (placement.chart ?? placement).id));
}
