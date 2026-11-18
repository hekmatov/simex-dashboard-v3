import { configuredCharts } from "../../lib/dashboardSelectors.js";
import { deriveCursorPlayback } from "../../charting/time/cursorProviderModel.js";
import { INITIAL_TIME_CURSOR } from "../../charting/time/cursorModel.js";
import { initialPlaybackState } from "../../charting/time/playbackReducer.js";
import { canonicalPlaybackTime } from "../playback/playbackTimeLabel.js";

const EMPTY_CONTEXTS = Object.freeze(Object.create(null));

export function buildScenePreviewProjection({ dashboard, scene }) {
  if (scene?.chronoGroupId && !(dashboard?.chronoGroups ?? []).some(group => group.id === scene.chronoGroupId)) {
    return unavailableProjection("The parent Chrono Group is unavailable.");
  }
  try {
    const charts = configuredCharts(dashboard);
    const state = { ...initialPlaybackState, cursor: { ...INITIAL_TIME_CURSOR, scope: { kind: "storyline", id: scene.id } } };
    const options = { state, charts, scenes: [scene], groups: dashboard.chronoGroups ?? [],
      loadedData: dashboard.loadedData ?? {}, profiles: dashboard.datasetProfiles ?? {}, timezone: dashboard.timezone ?? "UTC" };
    const clock = deriveCursorPlayback(options).clock;
    const activeEpochMs = clock.at(-1) ?? null;
    if (activeEpochMs === null) return unavailableProjection("This Scene has no valid preview frame.");
    const projection = deriveCursorPlayback({ ...options, state: { ...state, cursor: { ...state.cursor, mode: "at", epochMs: activeEpochMs } } });
    return Object.freeze({ activeEpochMs, label: canonicalPlaybackTime(activeEpochMs),
      timeContexts: projection.contexts, error: null });
  } catch (error) {
    return unavailableProjection(
      `Scene preview unavailable: ${boundedMessage(error)}`,
    );
  }
}

function unavailableProjection(error) {
  return Object.freeze({
    activeEpochMs: null,
    label: null,
    timeContexts: EMPTY_CONTEXTS,
    error,
  });
}

function boundedMessage(error) {
  const message = typeof error?.message === "string" && error.message.trim()
    ? error.message.trim()
    : "The preview could not be prepared.";
  return message.length <= 240 ? message : `${message.slice(0, 239)}…`;
}
