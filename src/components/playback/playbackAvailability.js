import { collectTemporalAvailability } from "../../charting/time/temporalAvailability.js";
import { matchTemporalObservation } from "../../charting/time/temporalMatch.js";

const EMPTY = Object.freeze([]);

export function buildFrameAvailabilityEvidence({
  activeEpochMs,
  clock = EMPTY,
  group,
  members = EMPTY,
  charts = EMPTY,
  loadedData = {},
  profiles = {},
  contexts = {},
  timezone = "UTC",
} = {}) {
  if (!Number.isFinite(activeEpochMs) || !Array.isArray(members)) return EMPTY;
  const chartById = new Map(charts.map((chart) => [chart.id, chart]));
  const period = availabilityPeriod(group?.period, clock);
  return Object.freeze(members.map((member, index) => {
    const chart = chartById.get(member.chartId);
    const base = {
      chartId: member.chartId,
      chartLabel: chart?.title ?? member.chartId,
      seriesId: `C${index + 1}`,
    };
    if (!chart || !member.timeRole) {
      return Object.freeze({ ...base, status: "static", statusLabel: "Static", detail: "Not synchronized to the Chrono frame", observedFrameCount: 0, observationEpochs: EMPTY });
    }
    try {
      const observationEpochs = collectTemporalAvailability({
        chart,
        member,
        rows: loadedData[chart.sourceId] ?? EMPTY,
        profile: profiles[chart.sourceId],
        period,
        timezone,
      });
      const matching = contexts[chart.id]?.matching ?? { policy: "exact" };
      const match = matchTemporalObservation({
        activeEpochMs,
        observations: observationEpochs.map((epochMs) => ({ epochMs, value: 1 })),
        policy: matching,
        toleranceMs: matching.toleranceMs,
        interpolationAllowed: true,
      });
      return Object.freeze({
        ...base,
        ...availabilityStatus(match),
        observedFrameCount: observationEpochs.length,
        observationEpochs,
      });
    } catch (error) {
      return Object.freeze({ ...base, status: "unavailable", statusLabel: "Unavailable", detail: bounded(error?.message ?? "Temporal evidence could not be resolved"), observedFrameCount: 0, observationEpochs: EMPTY });
    }
  }));
}

function availabilityStatus(match) {
  if (match.status === "observed" || match.status === "concurrent") return { status: "concurrent", statusLabel: "Concurrent", detail: "Observation at this frame" };
  if (match.status === "interpolated") return { status: "interpolated", statusLabel: "Interpolated", detail: "Derived between surrounding observations" };
  if (match.status === "carried" || match.status === "snapped-latest") return { status: "latest", statusLabel: "Latest", detail: "Most recent earlier observation" };
  if (match.status === "nearest" || match.status === "snapped-closest") return { status: "closest", statusLabel: "Closest", detail: "Nearest observation to this frame" };
  if (match.status === "unavailable") return { status: "unavailable", statusLabel: "Unavailable", detail: "Matching policy cannot produce a value" };
  return { status: "missing", statusLabel: "Missing", detail: "No observation can represent this frame" };
}

function availabilityPeriod(period, clock) {
  if (period?.start && period?.end) return period;
  const first = clock[0];
  const last = clock[clock.length - 1];
  return {
    start: Number.isFinite(first) ? new Date(first).toISOString().slice(0, 10) : "0001-01-01",
    end: Number.isFinite(last) ? new Date(last).toISOString().slice(0, 10) : "9999-12-31",
  };
}

function bounded(value) {
  const text = String(value);
  return text.length <= 180 ? text : `${text.slice(0, 179)}…`;
}
