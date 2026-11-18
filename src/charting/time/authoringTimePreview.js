import { sceneMemberTimeRole } from "./sceneSchema.js";
import { resolveCursorMatching, unambiguousLegacyChartMatching } from "./playbackPageScope.js";

/** A local draft preview borrows the instant without changing the shared cursor. */
export function authoringTimeContext({ chart, profile, playback, mode, suppliedContext } = {}) {
  if (!playback) return suppliedContext;
  try { sceneMemberTimeRole(chart, {}, { [chart.sourceId]: profile }); } catch { return undefined; }
  const previewMode = mode ?? playback.cursor.mode;
  const activeEpochMs = previewMode === "live" ? playback.liveEpochMs : playback.activeEpochMs;
  if (!Number.isFinite(activeEpochMs)) return undefined;
  const scene = playback.activeScene;
  const member = scene?.members?.find(member => member.chartId === chart.id);
  const group = playback.groups?.find(group => group.id === (scene?.chronoGroupId ?? playback.cursor.scope.id));
  const groupMember = group?.members?.find(member => member.chartId === chart.id);
  const context = { kind: "cursor", mode: previewMode, activeEpochMs, scope: playback.cursor.scope, traceMode: playback.traceMode };
  try {
    return { ...context, matching: resolveCursorMatching({ chart, member,
      sceneDefault: member ? scene.defaultMatching : undefined,
      inheritedMatching: groupMember ? groupMember.matching ?? group.matching : undefined,
      chartDefaultMatching: unambiguousLegacyChartMatching(chart.id, playback.groups),
      sessionOverride: playback.matchingOverride, nearestToleranceMs: playback.nearestToleranceMs }) };
  } catch {
    // A local incomplete nearest edit must remain visible as a renderer
    // diagnostic, while the strict save validator keeps it out of saved data.
    return { ...context, matching: chart.interaction?.timeSync?.matching ?? { policy: "invalid" } };
  }
}
