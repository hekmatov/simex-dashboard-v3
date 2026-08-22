export const CHART_RUNTIME_ARTIFACT_VERSION = 1;

const OMIT_KEYS = new Set([
  "feature",
  "geometry",
  "formPreparationKey",
  "sourceRows",
  "rows",
  "renderInstance",
  "dom",
  "element",
]);

export function compileChartRuntimeArtifact({
  identity,
  chart,
  source,
  prepared,
  temporalAvailability = [],
} = {}) {
  if (typeof identity !== "string" || identity.length === 0) {
    throw new TypeError("Chart runtime artifact identity is required.");
  }
  if (!chart || typeof chart.id !== "string") {
    throw new TypeError("Chart runtime artifact chart id is required.");
  }
  if (!prepared || typeof prepared.status !== "string" || !Array.isArray(prepared.marks)) {
    throw new TypeError("Chart runtime artifact requires prepared chart data.");
  }
  const safePrepared = sanitize(prepared);
  const artifact = {
    formatVersion: CHART_RUNTIME_ARTIFACT_VERSION,
    identity,
    chartId: chart.id,
    sourceFingerprint: source?.fingerprint
      ?? source?.sha256
      ?? source?.integrity
      ?? source?.hash
      ?? source?.revision
      ?? null,
    prepared: safePrepared,
    temporalAvailability: sanitize(Array.isArray(temporalAvailability) ? temporalAvailability : []),
    temporalIndex: buildTemporalIndex(safePrepared.marks),
  };
  return deepFreeze(artifact);
}

export function validateChartRuntimeArtifact(artifact, expectedIdentity = artifact?.identity) {
  if (!artifact || typeof artifact !== "object") {
    throw new TypeError("Chart runtime artifact must be an object.");
  }
  if (artifact.formatVersion !== CHART_RUNTIME_ARTIFACT_VERSION) {
    throw new Error(`Unsupported chart runtime artifact version "${artifact.formatVersion}".`);
  }
  if (typeof artifact.identity !== "string" || artifact.identity !== expectedIdentity) {
    throw new Error("Chart runtime artifact identity does not match the requested preparation.");
  }
  if (typeof artifact.chartId !== "string" || !artifact.prepared) {
    throw new Error("Chart runtime artifact is incomplete.");
  }
  return artifact;
}

function sanitize(value, ancestors = new WeakSet()) {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (value === undefined || typeof value === "function" || typeof value === "symbol") return undefined;
  if (typeof value !== "object") return undefined;
  if (ancestors.has(value)) return undefined;
  ancestors.add(value);
  if (Array.isArray(value)) {
    const result = value.map((item) => sanitize(item, ancestors)).filter((item) => item !== undefined);
    ancestors.delete(value);
    return result;
  }
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (OMIT_KEYS.has(key)) continue;
    const sanitized = sanitize(item, ancestors);
    if (sanitized !== undefined) result[key] = sanitized;
  }
  ancestors.delete(value);
  return result;
}

function buildTemporalIndex(marks) {
  const entries = [];
  marks.forEach((mark, markIndex) => {
    const epochMs = markEpoch(mark);
    if (!Number.isFinite(epochMs)) return;
    entries.push({
      markIndex,
      epochMs,
      seriesKey: String(mark.series ?? mark.name ?? mark.measure ?? "value"),
    });
  });
  entries.sort((left, right) => left.epochMs - right.epochMs || left.markIndex - right.markIndex);
  return entries;
}

function markEpoch(mark) {
  for (const value of [mark?.temporalEpochMs, mark?.epochMs, mark?.x, mark?.time, mark?.date]) {
    if (Number.isFinite(value)) return value;
    const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.NaN;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
