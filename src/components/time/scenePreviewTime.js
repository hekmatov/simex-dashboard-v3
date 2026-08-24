import { buildChronoGroupClock } from "../../charting/time/chronoGroupModel.js";
import { configuredCharts } from "../../lib/dashboardSelectors.js";
import {
  buildMemberTimeContexts,
  buildScenePlaybackClock,
} from "../playback/PlaybackProvider.jsx";
import { canonicalPlaybackTime } from "../playback/playbackTimeLabel.js";

const EMPTY_CONTEXTS = Object.freeze(Object.create(null));

export function buildScenePreviewProjection({ dashboard, scene }) {
  const group = (dashboard?.chronoGroups ?? []).find(
    ({ id }) => id === scene?.chronoGroupId,
  );
  if (!group) {
    return unavailableProjection("The parent Chrono Group is unavailable.");
  }

  const temporalContext = {
    charts: configuredCharts(dashboard),
    loadedData: dashboard?.loadedData ?? {},
    profiles: dashboard?.datasetProfiles ?? {},
    timezone: dashboard?.timezone ?? "UTC",
  };

  try {
    const groupClock = buildChronoGroupClock(group, temporalContext);
    const sceneClock = buildScenePlaybackClock(scene, groupClock, {
      group,
      temporalContext,
    });
    const activeEpochMs = sceneClock.at(-1) ?? null;
    if (activeEpochMs === null) {
      return unavailableProjection("This Scene has no valid preview frame.");
    }
    const sceneMemberIds = new Set(
      (scene?.members ?? []).map(({ chartId }) => chartId),
    );
    const previewGroup = {
      ...group,
      members: (group.members ?? []).filter(
        ({ chartId }) => sceneMemberIds.has(chartId),
      ),
    };
    return Object.freeze({
      activeEpochMs,
      label: canonicalPlaybackTime(activeEpochMs),
      timeContexts: buildMemberTimeContexts(previewGroup, activeEpochMs, { scene }),
      error: null,
    });
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
