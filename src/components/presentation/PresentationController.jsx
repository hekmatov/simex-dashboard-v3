import { adaptSceneAudienceToPresentation } from "../../lib/presentationProtocol.js";
import { resolvePresentationResolution } from "../../lib/presentationResolution.js";
import { createPresentationThemeSnapshot } from "../../theme/dashboardTheme.js";
import { makePresentationTime } from "../../charting/time/acceptedTimeProjection.js";

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
  if (scene?.frames?.mode === "unresolved") {
    return {
      status: "needs-attention",
      reason: {
        code: "scene_unresolved_frame_source",
        message: "Choose and save a replacement Frame source before using this Scene in Audience output.",
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

export function resolvePresentPlayback(playback) {
  return playback;
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
  themeProjection,
}) {
  const scene = playback.activeScene ?? null;
  const source = scene
    ? {
        kind: "scene",
        scene_id: scene.id,
      }
    : { kind: "manual", scene_id: null };
  const items = displayedChartIds.map((itemId) => (
    structuredClone(presentableItemIndex.get(itemId).descriptor)
  ));
  const revisionParts = [dashboard?.configVersion, dashboard?.lastUpdated, dashboard?.id]
    .filter((part) => part !== undefined && part !== null && String(part).trim() !== "")
    .map(String);

  return {
    dashboard_revision: revisionParts.join(":") || "dashboard",
    target_resolution: resolvePresentationResolution(dashboard?.presentationResolution),
    theme: createPresentationThemeSnapshot(themeProjection),
    source,
    composition: {
      active_page_id: activePageId ?? dashboard?.pages?.[0]?.id ?? "dashboard",
      displayed_chart_ids: [...displayedChartIds],
      layout,
    },
    time: makePresentationTime(playback),
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

export function executePresentationEndEffects(session, adapters) {
  const actions = [];
  try {
    for (const effect of session.effects) {
      if (effect === "PUBLISH_ENDED") {
        try {
          adapters.publishEnded();
        } catch {
          // Terminal state is already committed; later cleanup must still run.
        }
      }
      if (effect === "REQUEST_AUDIENCE_CLOSE") {
        let result;
        try {
          result = adapters.requestClose();
        } catch {
          result = { outcome: "denied-surface-remains" };
        }
        actions.push(result?.outcome === "succeeded"
          ? guarded(session, { type: "AUDIENCE_CLOSE_SUCCEEDED" })
          : guarded(session, { type: "AUDIENCE_CLOSE_DENIED", surfaceRemains: true }));
      }
    }
  } finally {
    if (session.effects.includes("TERMINATE_CHANNEL")) {
      try {
        adapters.terminateChannel();
      } catch {
        // Disposing a partially started channel is best-effort and terminal.
      }
    }
    actions.push(guarded(session, {
      type: "EFFECTS_CONSUMED",
      effectsVersion: session.effectsVersion,
    }));
  }
  return actions;
}

export default function PresentationController({ runtime, onClose }) {
  const session = runtime.sessionState;
  const output = mode => runtime.dispatch({ type: "SET_OUTPUT_MODE", mode });
  return <section className="presentation-controller" aria-label="Presenter output controls">
    <button type="button" className="secondary present-controls-close" aria-label="Close output controls"
      data-presentation-control-id="close-output-controls" onClick={onClose}>×</button>
    <div className="presentation-controller__output" data-dashboard-painted-boundary="true">
      <button type="button" className="secondary" data-presentation-control-id="output-active" aria-pressed={session.output === "active" && !session.blackout} onClick={() => output("active")}>Active</button>
      <button type="button" className="secondary" data-presentation-control-id="output-holding" aria-pressed={session.output === "holding" && !session.blackout} onClick={() => output("holding")}>Holding</button>
      <button type="button" className="secondary" data-presentation-control-id="output-black" aria-pressed={session.output === "blank" || session.blackout} onClick={() => output("blank")}>Black</button>
    </div>
    {session.rejectionReason && <p className="present-connection-error" role="status">{session.rejectionReason.message}</p>}
  </section>;
}

function guarded(session, action) {
  return {
    ...action,
    sessionId: session.sessionId,
    channelGeneration: session.channelGeneration,
  };
}
