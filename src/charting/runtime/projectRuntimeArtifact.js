import { validateChartRuntimeArtifact } from "./chartRuntimeArtifact.js";

export function projectRuntimeArtifact({ artifact, chart, timeContext } = {}) {
  validateChartRuntimeArtifact(artifact);
  if (chart?.id !== artifact.chartId || !Number.isFinite(timeContext?.activeEpochMs)) return null;
  const entries = artifact.temporalIndex ?? [];
  if (entries.length === 0) return null;
  const groups = new Map();
  for (const entry of entries) {
    const seriesKey = runtimeSeriesKey(
      artifact.prepared.marks[entry.markIndex],
      entry.seriesKey,
    );
    const group = groups.get(seriesKey) ?? [];
    group.push(entry);
    groups.set(seriesKey, group);
  }
  const activeMarks = [];
  for (const seriesEntries of groups.values()) {
    const match = matchEntry(seriesEntries, timeContext.activeEpochMs, timeContext.matching);
    if (!match) continue;
    activeMarks.push(materializeMatch(match, artifact.prepared.marks, timeContext.activeEpochMs));
  }
  const marks = timeContext.traceMode === "reveal"
    ? revealMarks(artifact, activeMarks, timeContext.activeEpochMs)
    : activeMarks;
  const status = activeMarks.length === 0 ? "missing" : "available";
  return deepFreeze({
    ...artifact.prepared,
    marks,
    meta: {
      ...(artifact.prepared.meta ?? {}),
      activeTime: {
        status,
        canonical: new Date(timeContext.activeEpochMs).toISOString(),
        epochMs: timeContext.activeEpochMs,
        mode: timeContext.traceMode ? "trace" : "frame",
      },
    },
  });
}

function runtimeSeriesKey(mark, storedSeriesKey) {
  if (mark?.geography !== null && mark?.geography !== undefined) {
    return `geography:${String(mark.geography)}`;
  }
  return storedSeriesKey;
}

function matchEntry(entries, activeEpochMs, matching = {}) {
  const exact = entries.find((entry) => entry.epochMs === activeEpochMs);
  if (exact) return { kind: "observed", entry: exact };
  const policy = matching?.policy ?? "exact";
  const lower = [...entries].reverse().find((entry) => entry.epochMs < activeEpochMs);
  const upper = entries.find((entry) => entry.epochMs > activeEpochMs);
  if (policy === "lastKnown") return lower ? { kind: "carried", entry: lower } : null;
  if (policy === "nearest") {
    const tolerance = Number.isFinite(matching.toleranceMs) ? matching.toleranceMs : 0;
    const candidate = !lower ? upper : !upper ? lower
      : activeEpochMs - lower.epochMs <= upper.epochMs - activeEpochMs ? lower : upper;
    return candidate && Math.abs(candidate.epochMs - activeEpochMs) <= tolerance
      ? { kind: "nearest", entry: candidate }
      : null;
  }
  if (policy === "interpolate" && lower && upper) {
    return { kind: "interpolated", lower, upper };
  }
  return null;
}

function materializeMatch(match, marks, activeEpochMs) {
  if (match.kind !== "interpolated") {
    const mark = marks[match.entry.markIndex];
    return {
      ...mark,
      active: true,
      temporalProvenance: {
        status: match.kind,
        activeEpochMs,
        sourceEpochMs: match.entry.epochMs,
      },
    };
  }
  const lowerMark = marks[match.lower.markIndex];
  const upperMark = marks[match.upper.markIndex];
  const ratio = (activeEpochMs - match.lower.epochMs)
    / (match.upper.epochMs - match.lower.epochMs);
  const result = { ...lowerMark, active: true };
  for (const key of ["y", "value", "amount"]) {
    if (Number.isFinite(lowerMark[key]) && Number.isFinite(upperMark[key])) {
      result[key] = lowerMark[key] + (upperMark[key] - lowerMark[key]) * ratio;
    }
  }
  result.temporalEpochMs = activeEpochMs;
  result.temporalProvenance = {
    status: "interpolated",
    activeEpochMs,
    lowerEpochMs: match.lower.epochMs,
    upperEpochMs: match.upper.epochMs,
  };
  return result;
}

function revealMarks(artifact, activeMarks, activeEpochMs) {
  const activeByIdentity = new Map(activeMarks.map((mark) => [markIdentity(mark), mark]));
  const revealed = artifact.temporalIndex
    .filter((entry) => entry.epochMs <= activeEpochMs)
    .map((entry) => {
      const source = artifact.prepared.marks[entry.markIndex];
      return { ...source, active: false };
    });
  for (const active of activeMarks) {
    const identity = markIdentity(active);
    const existing = revealed.findIndex((mark) => markIdentity(mark) === identity);
    if (existing >= 0) revealed[existing] = active;
    else revealed.push(active);
    activeByIdentity.delete(identity);
  }
  return revealed;
}

function markIdentity(mark) {
  return [mark.series, mark.name, mark.measure, mark.x, mark.time, mark.date].join("|");
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
