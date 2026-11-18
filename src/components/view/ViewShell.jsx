import React from "react";

import StorylineBand from "../time/StorylineBand.jsx";
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
  onSaveComparisonAsStoryline,
  comparisonSaveDisabledReason,
}) {
  const playback = usePlayback();
  React.useEffect(() => {
    playback.dispatch({ type: "navigate" });
  }, [activePage?.id]);
  React.useEffect(() => () => {
    playback.dispatch({ type: "modeExit" });
  }, []);
  return (
    <CanonicalDashboardFrame
      mode="view"
      pageType={pageType}
      pageId={activePage?.id}
      dashboardHeader={<DashboardHeader activePage={activePage} dashboard={dashboard} mode="view" storylineActive={Boolean(playback.activeScene)} />}
      pageContent={(
        <div className="canonical-view-content" style={iconLanguageStyles}>
          <PlaybackSurface
            accessibilityEnabled={dashboard.globalStyles?.accessibility?.enabled === true}
            viewOwned
            suspended={multiSelectMode || (displayState?.displayed_chart_ids?.length ?? 0) > 0}
          >
            <DashboardCanvas
              storylineBand={<StorylineBand dashboard={dashboard} playback={playback} activePageId={activePage?.id} />}
              activePage={activePage}
              dashboard={dashboard}
              surface="view"
              buildState={null}
              displayState={displayState}
              multiSelectMode={multiSelectMode}
              multiPanelIds={multiPanelIds}
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
            onSaveAsStoryline={onSaveComparisonAsStoryline}
            saveStorylineDisabledReason={comparisonSaveDisabledReason}
            accessibilityEnabled={dashboard.globalStyles?.accessibility?.enabled === true}
          />
        </>
      )}
    />
  );
}

// A Storyline composition is independent of the currently visible page.
export function sceneNavigationPageId() { return null; }
