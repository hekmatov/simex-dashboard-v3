import React from "react";
import { createPortal } from "react-dom";

import { adaptSceneAudienceToPresentation } from "../../lib/presentationProtocol.js";
import CompositionControls from "./CompositionControls.jsx";
import PresentationSourcePicker from "./PresentationSourcePicker.jsx";

const DEFAULT_AUDIENCE = Object.freeze({
  date_position: Object.freeze({
    x_permille: 680,
    y_permille: 40,
    width_permille: 280,
  }),
});

export function presentationSourceEligibility(scene, { compositionReady = true } = {}) {
  if (scene && compositionReady !== true) {
    return {
      status: "invalid",
      reason: {
        code: "scene_composition_transition_pending",
        message: "The saved Scene composition is still being applied.",
        sourceId: scene.id,
      },
    };
  }
  if (scene?.present?.temporalReview?.status !== "degraded") {
    return { status: "valid", reason: null };
  }
  return {
    status: "needs-attention",
    reason: {
      code: "scene_needs_attention",
      message: "Scene needs attention before it can replace the Audience output.",
      sourceId: scene.id,
    },
  };
}

export function buildPresentationState({
  dashboard,
  activePageId,
  displayedChartIds,
  layout,
  playback,
  presentableItemIndex,
  audienceFacts,
  outputMode = "active",
  blackout = false,
}) {
  const scene = playback.activeScene ?? null;
  const group = playback.activeGroup ?? null;
  const source = scene
    ? {
        kind: "scene",
        scene_id: scene.id,
        chrono_group_id: scene.chronoGroupId,
      }
    : group
      ? {
          kind: "Chrono Group",
          scene_id: null,
          chrono_group_id: group.id,
        }
      : { kind: "manual", scene_id: null, chrono_group_id: null };
  const clock = [...(playback.clock ?? [])];
  const timeline = source.kind === "manual"
    ? null
    : {
        frame_epochs: clock,
        frame_index: Math.min(
          Math.max(0, playback.activeIndex ?? 0),
          Math.max(0, clock.length - 1),
        ),
        period: authoredInclusivePeriod(scene?.period ?? group?.period),
        trace_mode: playback.traceMode === "full" ? "full" : "reveal",
        seconds_per_frame: scene?.secondsPerFrame
          ?? playback.speed
          ?? group?.secondsPerFrame
          ?? 1,
      };
  const items = displayedChartIds.map((itemId) => (
    structuredClone(presentableItemIndex.get(itemId).descriptor)
  ));
  const revisionParts = [dashboard?.configVersion, dashboard?.lastUpdated, dashboard?.id]
    .filter((part) => part !== undefined && part !== null && String(part).trim() !== "")
    .map(String);

  return {
    dashboard_revision: revisionParts.join(":") || "dashboard",
    source,
    composition: {
      active_page_id: activePageId ?? dashboard?.pages?.[0]?.id ?? "dashboard",
      displayed_chart_ids: [...displayedChartIds],
      layout,
    },
    timeline,
    matching: { use_authored_settings: true },
    output_mode: outputMode,
    blackout: blackout === true,
    audience: scene?.audience?.datePosition
      ? adaptSceneAudienceToPresentation(scene)
      : structuredClone(DEFAULT_AUDIENCE),
    payload: {
      items,
      audience_facts: { ...audienceFacts },
    },
  };
}

function authoredInclusivePeriod(period) {
  return {
    start: authoredPeriodBoundary(period?.startEpochMs ?? period?.start, "start"),
    end: authoredPeriodBoundary(period?.endEpochMs ?? period?.end, "end"),
  };
}

function authoredPeriodBoundary(value, edge) {
  if (Number.isSafeInteger(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const canonical = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T${edge === "end" ? "23:59:59.999" : "00:00:00.000"}Z`
    : value;
  const epochMs = Date.parse(canonical);
  return Number.isSafeInteger(epochMs) ? epochMs : undefined;
}

export function executePresentationEndEffects(session, adapters) {
  const actions = [];
  for (const effect of session.effects) {
    if (effect === "PUBLISH_ENDED") adapters.publishEnded();
    if (effect === "REQUEST_AUDIENCE_CLOSE") {
      const result = adapters.requestClose();
      actions.push(result?.outcome === "succeeded"
        ? guarded(session, { type: "AUDIENCE_CLOSE_SUCCEEDED" })
        : guarded(session, { type: "AUDIENCE_CLOSE_DENIED", surfaceRemains: true }));
    }
    if (effect === "TERMINATE_CHANNEL") adapters.terminateChannel();
  }
  actions.push(guarded(session, {
    type: "EFFECTS_CONSUMED",
    effectsVersion: session.effectsVersion,
  }));
  return actions;
}

export default function PresentationController({
  runtime,
  playback,
  presentationState,
  sourceEligibility = { status: "valid", reason: null },
  compositionHost = null,
  onSaveSceneDatePosition,
}) {
  const [compositionSaving, setCompositionSaving] = React.useState(false);
  const session = runtime.sessionState;
  const hasActiveSession = session.lifecycle !== "ended";
  const hasClock = playback.clock.length > 0;
  const atFirst = !hasClock || playback.activeIndex <= 0;
  const atLast = !hasClock || playback.activeIndex >= playback.clock.length - 1;

  const selectScene = (sceneId) => {
    if (compositionSaving) return;
    runtime.dispatch({ type: "SELECT_SCENE", sceneId });
    playback.dispatch({ type: "setScene", sceneId });
  };
  const selectGroup = (groupId) => {
    if (compositionSaving) return;
    runtime.dispatch({ type: "SELECT_CHRONO_GROUP", groupId });
    playback.dispatch({ type: "setGroup", groupId });
  };
  const playbackAction = (sessionAction, playbackActionValue) => {
    runtime.dispatch(sessionAction);
    playback.dispatch(playbackActionValue);
  };
  const output = (mode) => runtime.dispatch({ type: "SET_OUTPUT_MODE", mode });
  const blackout = (active) => runtime.dispatch({ type: "SET_BLACKOUT", active });

  return (
    <>
      {compositionHost && createPortal(
        <CompositionControls
          scene={playback.activeScene}
          onSaveSceneDatePosition={onSaveSceneDatePosition}
          onSavingChange={setCompositionSaving}
        />,
        compositionHost,
      )}
      <section className="presentation-controller" aria-label="Presenter controller">
      <div className="presentation-controller__source">
        <PresentationSourcePicker
          scenes={playback.scenes}
          groups={playback.groups}
          activeSceneId={playback.activeSceneId}
          activeGroupId={playback.activeGroupId}
          disabled={compositionSaving}
          onSelectScene={selectScene}
          onSelectGroup={selectGroup}
        />
        <button
          type="button"
          data-presentation-control-id={hasActiveSession ? "reopen-audience" : "open-new-session"}
          onClick={() => hasActiveSession
            ? runtime.reopenAudience()
            : runtime.openNewSession(presentationState, { sourceSelection: sourceEligibility })}
        >
          {hasActiveSession ? "Reopen audience display" : "Open new audience session"}
        </button>
      </div>

      <div className="presentation-controller__timeline">
        <button type="button" className="secondary" data-presentation-control-id="previous" disabled={atFirst} onClick={() => playbackAction({ type: "PREVIOUS" }, { type: "previous", clockLength: playback.clock.length })}>Previous</button>
        <label className="present-field present-time-slider">
          <span>Presentation time</span>
          <input type="range" aria-label="Presentation time" data-presentation-control-id="seek" min="0" max={Math.max(0, playback.clock.length - 1)} step="1" value={playback.activeIndex} disabled={!hasClock} onChange={(event) => {
            const frameIndex = Number(event.target.value);
            playbackAction({ type: "SEEK", frameIndex }, { type: "seek", index: frameIndex, clockLength: playback.clock.length });
          }} />
        </label>
        <button type="button" className="secondary" data-presentation-control-id="next" disabled={atLast} onClick={() => playbackAction({ type: "NEXT" }, { type: "next", clockLength: playback.clock.length })}>Next</button>
        <button type="button" className="secondary" aria-pressed={playback.traceMode !== "full"} data-presentation-control-id="trace-reveal" onClick={() => playbackAction({ type: "SET_TRACE_MODE", mode: "reveal" }, { type: "setTraceMode", mode: "reveal" })}>Reveal to frame</button>
        <button type="button" className="secondary" aria-pressed={playback.traceMode === "full"} data-presentation-control-id="trace-full" onClick={() => playbackAction({ type: "SET_TRACE_MODE", mode: "full" }, { type: "setTraceMode", mode: "full" })}>Full timeline</button>
        <label className="present-field present-cadence-field">
          <span>Seconds per frame</span>
          <input type="number" min="0.1" step="0.1" value={playback.speed} data-presentation-control-id="cadence" onChange={(event) => playback.dispatch({ type: "setSpeed", speed: Number(event.target.value) })} />
        </label>
        <button type="button" data-presentation-control-id="play" disabled={!hasClock || playback.playing} onClick={() => playbackAction({ type: "PLAY" }, { type: "play" })}>Play</button>
        <button type="button" className="secondary" data-presentation-control-id="pause" disabled={!playback.playing} onClick={() => playbackAction({ type: "PAUSE" }, { type: "pause" })}>Pause</button>
      </div>

      <div className="presentation-controller__output">
        <button type="button" className="secondary" data-presentation-control-id="output-active" aria-pressed={session.output === "active"} onClick={() => output("active")}>Active</button>
        <button type="button" className="secondary" data-presentation-control-id="output-holding" aria-pressed={session.output === "holding"} onClick={() => output("holding")}>Holding</button>
        <button type="button" className="secondary" data-presentation-control-id="output-blank" aria-pressed={session.output === "blank"} onClick={() => output("blank")}>Blank</button>
        <button type="button" className="secondary" data-presentation-control-id="blackout" disabled={session.blackout} onClick={() => blackout(true)}>Blackout</button>
        <button type="button" className="secondary" data-presentation-control-id="restore" disabled={!session.blackout} onClick={() => blackout(false)}>Restore</button>
        <button type="button" className="secondary" data-presentation-control-id="end" disabled={!hasActiveSession} onClick={runtime.end}>End presentation</button>
      </div>
      {session.rejectionReason && (
        <p className="present-connection-error" role="status">
          {session.rejectionReason.message}
        </p>
      )}
      </section>
    </>
  );
}

function guarded(session, action) {
  return {
    ...action,
    sessionId: session.sessionId,
    channelGeneration: session.channelGeneration,
  };
}
