import React from "react";

import DisplayedChartGrid from "../display/DisplayedChartGrid.jsx";
import { buildMemberTimeContexts } from "../playback/PlaybackProvider.jsx";
import { buildPresentableItemIndex } from "../../static-content/staticPanelCapabilities.js";
import { validatePresentationState } from "../../lib/presentationProtocol.js";
import useAudienceStaticAssetReadiness from "./useAudienceStaticAssetReadiness.js";

export default function AudienceDisplay({
  dashboard,
  connectionStatus,
  presentationState,
  presentableItemIndex: suppliedPresentableItemIndex,
  contentRenderContext,
}) {
  const presentableItemIndex = React.useMemo(
    () => suppliedPresentableItemIndex ?? buildPresentableItemIndex(dashboard),
    [dashboard, suppliedPresentableItemIndex],
  );
  const trustedState = React.useMemo(() => {
    if (!dashboard || !presentationState) return null;
    try {
      return validatePresentationState(presentationState, { presentableItemIndex });
    } catch {
      return null;
    }
  }, [dashboard, presentableItemIndex, presentationState]);
  const staticAssetReadiness = useAudienceStaticAssetReadiness({
    dashboard,
    items: trustedState?.payload?.items ?? [],
    resolveAsset: contentRenderContext?.resolveAsset,
  });

  if (!dashboard || !trustedState) {
    return <AudienceWaiting />;
  }

  const chronoGroup = (dashboard.chronoGroups ?? []).find(
    ({ id }) => id === trustedState.source.chrono_group_id,
  ) ?? null;
  const scene = trustedState.source.scene_id
    ? (dashboard.scenes ?? []).find(({ id }) => id === trustedState.source.scene_id) ?? null
    : null;
  const activeEpochMs = trustedState.timeline?.frame_epochs[
    trustedState.timeline.frame_index
  ] ?? null;
  const memberTimeContexts = buildMemberTimeContexts(
    chronoGroup,
    activeEpochMs,
    { scene, traceMode: trustedState.timeline?.trace_mode },
  );
  const facts = trustedState.payload.audience_facts;
  const dashboardName = facts.dashboard_name ? dashboard.title : null;
  const parentName = facts.parent_chrono_group ? chronoGroup?.name ?? null : null;
  const sceneName = facts.scene_name ? scene?.name ?? scene?.title ?? null : null;
  const sceneDate = facts.scene_date
    ? canonicalTime(activeEpochMs)
    : null;
  const sharedHeaderVisible = Boolean(
    dashboardName || parentName || sceneName,
  );
  const context = [parentName].filter(Boolean);

  return (
    <main
      className="audience-display"
      data-connection-status={connectionStatus ?? "waiting"}
      data-shared-header-visible={sharedHeaderVisible ? "true" : "false"}
    >
      {sharedHeaderVisible && (
        <header className="audience-shared-header">
          <div className="audience-shared-identity">
            {dashboardName && <h1>{dashboardName}</h1>}
            {context.length > 0 && (
              <p className="audience-shared-context">{context.join(" · ")}</p>
            )}
          </div>
          {sceneName && <strong className="audience-scene-name">{sceneName}</strong>}
        </header>
      )}
      <DisplayedChartGrid
        dashboard={dashboard}
        items={trustedState.payload.items}
        layout={trustedState.composition.layout}
        staticAssetReadiness={staticAssetReadiness}
        contentRenderContext={contentRenderContext ?? {
          mediaItems: dashboard.contentLibrary?.mediaItems ?? {},
          assets: dashboard.assets ?? {},
        }}
        timeContextForChart={(chartId) => memberTimeContexts[chartId] ?? null}
        surface="audience"
      />
      {sceneDate && (
        <time
          className="audience-scene-date"
          dateTime={new Date(activeEpochMs).toISOString()}
        >
          {sceneDate}
        </time>
      )}
      {trustedState.blackout && <div className="audience-blackout" aria-hidden="true" />}
    </main>
  );
}

function AudienceWaiting() {
  return (
    <main
      className="audience-display audience-waiting"
      data-shared-header-visible="false"
    >
      <div className="audience-waiting-content">
        <span className="audience-waiting-mark" aria-hidden="true">SimEx</span>
        <p className="audience-waiting-ready">Audience display ready</p>
        <p>Waiting for the moderator.</p>
      </div>
    </main>
  );
}

function canonicalTime(epochMs) {
  if (!Number.isFinite(epochMs)) return null;
  const iso = new Date(epochMs).toISOString();
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
}
