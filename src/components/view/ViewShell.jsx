import React from "react";

import FullscreenDisplay from "../FullscreenDisplay.jsx";
import PlaybackSurface from "../playback/PlaybackSurface.jsx";
import { usePlayback } from "../playback/PlaybackProvider.jsx";
import CanonicalDashboardFrame, { CanonicalDashboardFooter } from "../dashboard/CanonicalDashboardFrame.jsx";
import DashboardCanvas from "../dashboard/DashboardCanvas.jsx";
import DashboardHeader from "../dashboard/DashboardHeader.jsx";

export default function ViewShell({
  activePage,
  pageType,
  dashboard,
  displayState,
  companionStatusLabel,
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
  React.useEffect(() => {
    playback.dispatch({ type: "navigate" });
  }, [activePage?.id]);
  React.useEffect(() => () => {
    playback.dispatch({ type: "modeExit" });
  }, []);
  const chronoSource = playback.activeScene ?? playback.activeGroup;
  const chronoSection = playback.playbackView === true && chronoSource
    ? {
        id: chronoSource.id,
        title: chronoSource.name,
        chartIds: playback.activeScene || playback.scope === "group-only"
          ? playback.participatingChartIds
          : pageChartIds(activePage),
      }
    : null;

  return (
    <CanonicalDashboardFrame
      mode="view"
      pageType={pageType}
      pageId={activePage?.id}
      dashboardHeader={<DashboardHeader activePage={activePage} dashboard={dashboard} />}
      pageContent={(
        <div className="canonical-view-content" style={iconLanguageStyles}>
          <PlaybackSurface
            accessibilityEnabled={dashboard.globalStyles?.accessibility?.enabled === true}
            viewOwned
          >
            <DashboardCanvas
              activePage={activePage}
              dashboard={dashboard}
              surface="view"
              buildState={null}
              displayState={displayState}
              multiSelectMode={multiSelectMode}
              multiPanelIds={multiPanelIds}
              chronoSection={chronoSection}
              geoDataSources={geoDataSources}
              onNavigate={onActivePageChange}
              onAddPanelToSection={onAddPanelToSection}
              onDisplayAction={onDisplayAction}
              onToggleMultiPanel={onToggleMultiPanel}
              onStartMultiFullscreenSelection={onStartMultiFullscreenSelection}
            />
          </PlaybackSurface>
        </div>
      )}
      footer={<CanonicalDashboardFooter dashboard={dashboard} />}
      overlayLayer={(
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
      )}
    />
  );
}

function pageChartIds(page) {
  return (page?.sections ?? []).flatMap((section) => (
    section.panels ?? []
  ).map((placement) => (placement.chart ?? placement).id));
}
