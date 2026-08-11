import React from "react";

import DisplayedChartGrid from "../display/DisplayedChartGrid.jsx";
import { buildMemberTimeContexts } from "../playback/PlaybackProvider.jsx";

export default function AudienceDisplay({
  dashboard,
  connectionStatus,
  presentationState,
}) {
  if (!dashboard || !presentationState) {
    return <AudienceWaiting />;
  }

  const activePage = (dashboard.pages ?? []).find(
    ({ id }) => id === presentationState.active_page_id,
  );
  const showSceneTitle = Boolean(presentationState.show_scene_title && activePage);
  const timeGroup = presentationState.time
    ? (dashboard.timeSyncGroups ?? []).find(
      ({ id }) => id === presentationState.time.group_id,
    )
    : null;
  const memberTimeContexts = buildMemberTimeContexts(
    timeGroup,
    presentationState.time?.active_epoch_ms,
  );

  return (
    <main
      className="audience-display"
      data-connection-status={connectionStatus ?? "waiting"}
      data-show-scene-title={showSceneTitle ? "true" : "false"}
    >
      {showSceneTitle && (
        <header className="audience-scene-title">
          <h1>{activePage.title ?? activePage.label ?? activePage.id}</h1>
          {dashboard.scenarioLabel && <p>{dashboard.scenarioLabel}</p>}
        </header>
      )}
      <DisplayedChartGrid
        dashboard={dashboard}
        chartIds={presentationState.displayed_chart_ids}
        layout={presentationState.layout}
        timeContextForChart={(chartId) => memberTimeContexts[chartId] ?? null}
        surface="audience"
      />
      {presentationState.blackout && <div className="audience-blackout" aria-hidden="true" />}
    </main>
  );
}

function AudienceWaiting() {
  return (
    <main
      className="audience-display audience-waiting"
      data-show-scene-title="false"
    >
      <div className="audience-waiting-content">
        <span className="audience-waiting-mark" aria-hidden="true">SimEx</span>
        <p className="audience-waiting-ready">Audience display ready</p>
        <p>Waiting for the moderator.</p>
      </div>
    </main>
  );
}
