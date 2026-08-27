import React from "react";

import DisplayedChartGrid from "../display/DisplayedChartGrid.jsx";
import { buildMemberTimeContexts } from "../playback/PlaybackProvider.jsx";
import ConnectionIndicator from "./ConnectionIndicator.jsx";
import useAudienceStaticAssetReadiness from "./useAudienceStaticAssetReadiness.js";

export default function AudienceDisplay(props) {
  return <AudienceRenderBoundary {...props} />;
}

export class AudienceRenderBoundary extends React.Component {
  state = { renderFailed: false, failedProjection: null };
  lastCommittedProjection = null;

  static getDerivedStateFromError() {
    return { renderFailed: true };
  }

  componentDidMount() {
    if (!this.state.renderFailed) {
      this.lastCommittedProjection = clone(this.props.projection);
    }
  }

  componentDidUpdate() {
    if (this.state.renderFailed) {
      if (
        this.state.failedProjection !== null
        && this.props.projection !== this.state.failedProjection
      ) {
        this.setState({ renderFailed: false, failedProjection: null });
      }
      return;
    }
    this.lastCommittedProjection = clone(this.props.projection);
  }

  componentDidCatch() {
    this.setState({ failedProjection: this.props.projection });
  }

  render() {
    const projection = this.state.renderFailed
      ? this.lastCommittedProjection
      : this.props.projection;
    return (
      <AudienceProjectionSurface
        {...this.props}
        projection={projection}
        renderStatus={this.state.renderFailed ? "retained" : "current"}
      />
    );
  }
}

export function AudienceProjectionSurface({
  dashboard,
  connectionStatus,
  projection,
  contentRenderContext,
  renderStatus = "current",
}) {
  const items = projection?.kind === "output" ? projection.payload.items : [];
  const staticAssetReadiness = useAudienceStaticAssetReadiness({
    dashboard,
    items,
    resolveAsset: contentRenderContext?.resolveAsset,
  });

  if (projection?.kind === "ended") {
    return <AudienceEnded projection={projection} />;
  }
  if (!dashboard || projection?.kind !== "output") {
    return <AudienceWaiting />;
  }

  const chronoGroup = (dashboard.chronoGroups ?? []).find(
    ({ id }) => id === projection.source.chrono_group_id,
  ) ?? null;
  const scene = projection.source.scene_id
    ? (dashboard.scenes ?? []).find(({ id }) => id === projection.source.scene_id) ?? null
    : null;
  const activeEpochMs = projection.timeline?.frame_epochs[
    projection.timeline.frame_index
  ] ?? null;
  const memberTimeContexts = buildMemberTimeContexts(
    chronoGroup,
    activeEpochMs,
    {
      scene,
      frameIndex: projection.timeline?.frame_index,
      traceMode: projection.timeline?.trace_mode,
    },
  );
  const facts = projection.payload.audience_facts;
  const dashboardName = facts.dashboard_name ? dashboard.title : null;
  const parentName = facts.parent_chrono_group ? chronoGroup?.name ?? null : null;
  const sceneName = facts.scene_name ? scene?.name ?? scene?.title ?? null : null;
  const sharedHeaderVisible = projection.mode !== "blank" && Boolean(
    dashboardName || parentName || sceneName,
  );
  const context = [parentName].filter(Boolean);
  const sceneDate = projection.mode === "active" && facts.scene_date
    ? canonicalTime(activeEpochMs)
    : null;
  const dateStyle = datePositionStyle(projection.audience.date_position);

  return (
    <main
      className={`audience-display audience-output audience-output-${projection.mode}`}
      data-connection-status={connectionStatus ?? "waiting"}
      data-output-mode={projection.mode}
      data-render-status={renderStatus}
      data-frame-index={projection.timeline?.frame_index}
      data-trace-mode={projection.timeline?.trace_mode}
      data-shared-header-visible={sharedHeaderVisible ? "true" : "false"}
    >
      {sharedHeaderVisible && (
        <AudienceHeader
          dashboardName={dashboardName}
          context={context}
          sceneName={sceneName}
        />
      )}
      {projection.mode === "holding" && (
        <p className="audience-holding-message">Waiting for the next scene.</p>
      )}
      {projection.mode === "active" && (
        <DisplayedChartGrid
          dashboard={dashboard}
          items={projection.payload.items}
          layout={projection.composition.layout}
          staticAssetReadiness={staticAssetReadiness}
          contentRenderContext={contentRenderContext ?? {
            mediaItems: dashboard.contentLibrary?.mediaItems ?? {},
            assets: dashboard.assets ?? {},
          }}
          timeContextForChart={(chartId) => memberTimeContexts[chartId] ?? null}
          surface="audience"
        />
      )}
      {sceneDate && (
        <time
          className="audience-scene-date"
          dateTime={new Date(activeEpochMs).toISOString()}
          style={dateStyle}
        >
          {sceneDate}
        </time>
      )}
      {projection.blackout && <div className="audience-blackout" aria-hidden="true" />}
      <ConnectionIndicator connection={connectionStatus} />
    </main>
  );
}

function AudienceHeader({ dashboardName, context, sceneName }) {
  return (
    <header className="audience-shared-header">
      <div className="audience-shared-identity">
        {dashboardName && <h1>{dashboardName}</h1>}
        {context.length > 0 && (
          <p className="audience-shared-context">{context.join(" · ")}</p>
        )}
      </div>
      {sceneName && <strong className="audience-scene-name">{sceneName}</strong>}
    </header>
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

function AudienceEnded({ projection }) {
  return (
    <main
      className="audience-display audience-ended"
      data-connection-status="ended"
      data-shared-header-visible="false"
    >
      <div className="audience-ended-content">
        <h1>{projection.heading}</h1>
        <p>{projection.body}</p>
      </div>
    </main>
  );
}

function datePositionStyle(position) {
  return {
    left: `${position.x_permille / 10}%`,
    top: `${position.y_permille / 10}%`,
    transform: `translateY(-${position.y_permille / 10}%)`,
    width: `${position.width_permille / 10}%`,
  };
}

function canonicalTime(epochMs) {
  if (!Number.isFinite(epochMs)) return null;
  const iso = new Date(epochMs).toISOString();
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}
