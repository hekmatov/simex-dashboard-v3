import React from "react";

import DisplayedChartGrid from "../display/DisplayedChartGrid.jsx";
import { buildMemberTimeContexts } from "../playback/PlaybackProvider.jsx";
import ConnectionIndicator from "./ConnectionIndicator.jsx";
import useAudienceStaticAssetReadiness from "./useAudienceStaticAssetReadiness.js";

export function moveAudienceDatePositionByPointer(position, movement, bounds) {
  const surfaceWidth = Math.max(1, Number(bounds?.width) || 0);
  const surfaceHeight = Math.max(1, Number(bounds?.height) || 0);
  const labelHeight = Math.max(0, Number(bounds?.labelHeight) || 0);
  const verticalTravel = Math.max(1, surfaceHeight - labelHeight);
  const widthPermille = clampInteger(position?.width_permille, 1, 1000);
  return {
    x_permille: clampInteger(
      Number(position?.x_permille) + ((Number(movement?.x) || 0) / surfaceWidth) * 1000,
      0,
      1000 - widthPermille,
    ),
    y_permille: clampInteger(
      Number(position?.y_permille) + ((Number(movement?.y) || 0) / verticalTravel) * 1000,
      0,
      1000,
    ),
    width_permille: widthPermille,
  };
}

export function beginAudienceDateDrag({ pointer, source, position, bounds }, activeDrag = null) {
  if (activeDrag) return activeDrag;
  if (pointer?.isPrimary === false || pointer?.button !== 0) return null;
  if (!Number.isFinite(pointer?.x) || !Number.isFinite(pointer?.y)) return null;
  return {
    pointerId: pointer.pointerId,
    pointerX: pointer.x,
    pointerY: pointer.y,
    source: clone(source),
    position: clone(position),
    latestPosition: clone(position),
    bounds: clone(bounds),
  };
}

export function moveAudienceDateDrag(drag, pointer) {
  if (!drag || drag.pointerId !== pointer?.pointerId || pointer?.isPrimary === false) {
    return drag;
  }
  return {
    ...drag,
    latestPosition: moveAudienceDatePositionByPointer(
      drag.position,
      {
        x: pointer.x - drag.pointerX,
        y: pointer.y - drag.pointerY,
      },
      drag.bounds,
    ),
  };
}

export function completeAudienceDateDrag(drag, pointer) {
  if (
    !drag
    || drag.pointerId !== pointer?.pointerId
    || pointer?.isPrimary === false
    || pointer?.button !== 0
    || datePositionSignature(drag.latestPosition) === datePositionSignature(drag.position)
  ) return null;
  return {
    source: clone(drag.source),
    datePosition: clone(drag.latestPosition),
  };
}

export function resolveAudienceDateOptimisticPosition({
  authoritativePosition,
  optimisticPosition,
  transportResult,
  connectionLive,
  acceptedEcho,
  source,
}) {
  const echoMatches = acceptedEcho
    && presentationSourceSignature(acceptedEcho.source) === presentationSourceSignature(source)
    && datePositionSignature(acceptedEcho.datePosition) === datePositionSignature(optimisticPosition);
  const moveWasSent = connectionLive && transportResult !== null;
  return clone(echoMatches || moveWasSent ? optimisticPosition : authoritativePosition);
}

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
  onVisualChange,
  onDatePositionChange,
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
          onVisualChange={onVisualChange}
        />
      )}
      {sceneDate && (
        <AudienceSceneDate
          date={sceneDate}
          dateTime={new Date(activeEpochMs).toISOString()}
          position={projection.audience.date_position}
          source={projection.source}
          onDatePositionChange={connectionStatus === "connected"
            ? onDatePositionChange
            : null}
        />
      )}
      {projection.blackout && <div className="audience-blackout" aria-hidden="true" />}
      <ConnectionIndicator connection={connectionStatus} />
    </main>
  );
}

function AudienceSceneDate({ date, dateTime, position, source, onDatePositionChange }) {
  const sourceSignature = presentationSourceSignature(source);
  const authoritativeSignature = datePositionSignature(position);
  const dragRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  const [livePosition, setLivePosition] = React.useState(() => ({
    sourceSignature,
    value: clone(position),
  }));
  const visiblePosition = livePosition.sourceSignature === sourceSignature
    ? livePosition.value
    : position;
  const draggable = typeof onDatePositionChange === "function";

  React.useEffect(() => {
    if (
      dragRef.current
      && presentationSourceSignature(dragRef.current.source) !== sourceSignature
    ) {
      dragRef.current = null;
      setDragging(false);
    }
    if (!dragRef.current) {
      setLivePosition({ sourceSignature, value: clone(position) });
    }
  }, [authoritativeSignature, sourceSignature]);

  React.useEffect(() => {
    if (draggable) return;
    dragRef.current = null;
    setDragging(false);
    setLivePosition({ sourceSignature, value: clone(position) });
  }, [authoritativeSignature, draggable, position, sourceSignature]);

  const startDrag = (event) => {
    const surface = event.currentTarget.closest?.(".audience-display")
      ?? event.currentTarget.parentElement;
    const surfaceBounds = surface?.getBoundingClientRect?.();
    const labelBounds = event.currentTarget.getBoundingClientRect?.();
    if (!surfaceBounds?.width || !surfaceBounds?.height) return;
    const drag = beginAudienceDateDrag({
      pointer: pointerEvent(event),
      source,
      position: visiblePosition,
      bounds: {
        width: surfaceBounds.width,
        height: surfaceBounds.height,
        labelHeight: labelBounds?.height ?? 0,
      },
    }, dragRef.current);
    if (!drag || drag === dragRef.current) return;
    dragRef.current = drag;
    setDragging(true);
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = moveAudienceDateDrag(drag, pointerEvent(event));
    if (next === drag) return;
    dragRef.current = next;
    setLivePosition({
      sourceSignature: presentationSourceSignature(next.source),
      value: next.latestPosition,
    });
    event.preventDefault();
  };
  const finishDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const commit = completeAudienceDateDrag(drag, pointerEvent(event));
    let transportResult = null;
    if (commit) {
      try {
        transportResult = onDatePositionChange(
          clone(commit.datePosition),
          clone(commit.source),
        );
      } catch {
        transportResult = null;
      }
    }
    const resolvedPosition = resolveAudienceDateOptimisticPosition({
      authoritativePosition: position,
      optimisticPosition: commit?.datePosition ?? drag.position,
      transportResult,
      connectionLive: draggable,
      acceptedEcho: null,
      source: drag.source,
    });
    dragRef.current = null;
    setDragging(false);
    setLivePosition({ sourceSignature, value: resolvedPosition });
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
  const cancelDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    setLivePosition({
      sourceSignature: presentationSourceSignature(drag.source),
      value: clone(drag.position),
    });
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const pointerHandlers = draggable ? {
    onPointerDown: startDrag,
    onPointerMove: moveDrag,
    onPointerUp: finishDrag,
    onPointerCancel: cancelDrag,
  } : {};

  return (
    <time
      className="audience-scene-date"
      data-audience-date-draggable={draggable ? "true" : undefined}
      data-dragging={dragging ? "true" : "false"}
      dateTime={dateTime}
      style={datePositionStyle(visiblePosition)}
      {...pointerHandlers}
    >
      {date}
    </time>
  );
}

function pointerEvent(event) {
  return {
    pointerId: event.pointerId,
    isPrimary: event.isPrimary,
    button: event.button,
    x: event.clientX,
    y: event.clientY,
  };
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

function datePositionSignature(position) {
  return `${position?.x_permille}:${position?.y_permille}:${position?.width_permille}`;
}

function presentationSourceSignature(source) {
  return `${source?.kind ?? ""}:${source?.scene_id ?? ""}:${source?.chrono_group_id ?? ""}`;
}

function clampInteger(value, minimum, maximum) {
  const integer = Math.round(Number(value));
  if (!Number.isFinite(integer)) return minimum;
  return Math.max(minimum, Math.min(maximum, integer));
}

function canonicalTime(epochMs) {
  if (!Number.isFinite(epochMs)) return null;
  const iso = new Date(epochMs).toISOString();
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}
