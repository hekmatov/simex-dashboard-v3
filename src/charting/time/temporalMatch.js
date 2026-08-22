export const MATCHING_POLICY_LABELS = Object.freeze({
  CONCURRENT_ONLY: "Concurrent only",
  INTERPOLATE: "Interpolate",
  SNAP_TO_LATEST: "Snap to Latest",
  SNAP_TO_CLOSEST: "Snap to Closest",
  USE_AUTHORED_SETTINGS: "Use authored settings",
});

const LEGACY_POLICIES = new Set(["exact", "lastKnown", "nearest", "interpolate"]);
const CANONICAL_POLICIES = new Map([
  [MATCHING_POLICY_LABELS.CONCURRENT_ONLY, "exact"],
  [MATCHING_POLICY_LABELS.INTERPOLATE, "interpolate"],
  [MATCHING_POLICY_LABELS.SNAP_TO_LATEST, "lastKnown"],
  [MATCHING_POLICY_LABELS.SNAP_TO_CLOSEST, "nearest"],
]);
const MISSING_MATCH = Object.freeze({ status: "missing", observation: null });
const DAY_MS = 24 * 60 * 60 * 1_000;

/**
 * Matches an active canonical epoch against observations that have already
 * been parsed and sorted. Nearest matching fails closed on equidistant ties.
 */
export function matchTemporalObservation(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Temporal matching input must be an object.");
  }

  const requestedPolicy = input.policy?.policy ?? input.policy ?? "exact";
  const canonical = CANONICAL_POLICIES.has(requestedPolicy);
  const policy = canonical ? CANONICAL_POLICIES.get(requestedPolicy) : requestedPolicy;
  if (!LEGACY_POLICIES.has(policy)) {
    throw new Error(`Unknown temporal matching policy "${requestedPolicy}".`);
  }
  if (!Number.isFinite(input.activeEpochMs)) {
    throw new TypeError("activeEpochMs must be a finite number.");
  }

  const observations = input.observations === undefined ? [] : input.observations;
  validateObservations(observations);
  validateTolerance(policy, input.toleranceMs, canonical);
  if (policy === "interpolate" && input.interpolationAllowed !== true) {
    if (canonical) return canonicalUnavailable("interpolation-not-supported");
    throw new Error("The schema does not permit interpolation.");
  }
  if (observations.length === 0) {
    return canonical ? canonicalMissing("no-observations") : MISSING_MATCH;
  }

  const index = lowerBound(observations, input.activeEpochMs);
  const exact = observations[index];
  if (exact?.epochMs === input.activeEpochMs) {
    if (canonical) return canonicalMatched("concurrent", exact, input.activeEpochMs);
    return matched("observed", exact);
  }

  if (policy === "exact") {
    return canonical ? canonicalMissing("no-concurrent-observation") : MISSING_MATCH;
  }
  if (policy === "lastKnown") {
    const observation = index === 0 ? null : observations[index - 1];
    if (canonical) {
      return observation
        ? canonicalMatched("snapped-latest", observation, input.activeEpochMs)
        : canonicalMissing("no-observation-at-or-before-frame");
    }
    return lastKnown(observations, index);
  }
  if (policy === "nearest") {
    const observation = nearestObservation(
      observations,
      index,
      input.activeEpochMs,
      canonical && input.toleranceMs === undefined
        ? Number.POSITIVE_INFINITY
        : input.toleranceMs,
    );
    if (canonical) {
      return observation
        ? canonicalMatched("snapped-closest", observation, input.activeEpochMs)
        : canonicalMissing("no-observation-within-tolerance");
    }
    return observation ? matched("nearest", observation) : MISSING_MATCH;
  }
  return interpolateNumeric(observations, index, input.activeEpochMs, canonical);
}

export function resolveMatchingPolicy({
  groupDefault,
  memberFallback,
  sceneOverride,
  sessionOverride,
} = {}) {
  const candidates = [
    ["group", groupDefault],
    ["member", memberFallback],
    ["scene", sceneOverride],
    ["session", sessionOverride],
  ];
  let resolved = null;
  for (const [source, candidate] of candidates) {
    if (candidate === undefined || candidate === null) continue;
    const value = candidate?.policy ?? candidate;
    if (source === "session" && value === MATCHING_POLICY_LABELS.USE_AUTHORED_SETTINGS) continue;
    resolved = { policy: approvedLabel(value), source };
  }
  if (!resolved) throw new Error("A chrono-group default matching policy is required.");
  return Object.freeze(resolved);
}

export function resolveSecondsPerFrame({
  groupDefault,
  sceneOverride,
  sessionOverride,
} = {}) {
  validateSecondsPerFrame(groupDefault, "group default");
  if (sessionOverride !== undefined && sessionOverride !== null) {
    validateSecondsPerFrame(sessionOverride, "session override");
    return Object.freeze({ secondsPerFrame: sessionOverride, source: "session", persisted: false });
  }
  if (sceneOverride !== undefined && sceneOverride !== null) {
    validateSecondsPerFrame(sceneOverride, "Scene override");
    return Object.freeze({ secondsPerFrame: sceneOverride, source: "scene", persisted: true });
  }
  return Object.freeze({ secondsPerFrame: groupDefault, source: "group", persisted: true });
}

export function summarizeTemporalProvenance(matches, { timeZone = "UTC" } = {}) {
  if (!Array.isArray(matches)) throw new TypeError("Temporal matches must be an array.");
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(0);
  } catch {
    throw new Error(`Invalid provenance timezone "${timeZone}".`);
  }
  if (matches.some(({ status }) => status === "interpolated")) {
    return frozenSummary("interpolated", "Interpolated", "Interpolated");
  }
  const snapped = matches.filter(({ status }) => (
    status === "snapped-latest" || status === "snapped-closest"
  ));
  if (snapped.length > 0) {
    const offsets = snapped.map(({ signedOffsetMs }) => signedDayOffset(signedOffsetMs));
    const minimum = Math.min(...offsets);
    const maximum = Math.max(...offsets);
    if (minimum !== maximum) {
      return frozenSummary(
        "mixed-offsets",
        `${formatSignedDays(minimum, false)}…${formatSignedDays(maximum, true)}`,
        "Mixed dates",
      );
    }
    const relation = minimum < 0
      ? `${Math.abs(minimum)} ${pluralDay(minimum)} earlier`
      : minimum > 0
        ? `${minimum} ${pluralDay(minimum)} later`
        : "Concurrent";
    return frozenSummary("single-offset", formatSignedDays(minimum, true), relation);
  }
  if (matches.some(({ status }) => status === "concurrent")) {
    return frozenSummary("concurrent", "Concurrent", "Concurrent");
  }
  if (matches.some(({ status }) => status === "unavailable")) {
    return frozenSummary("unavailable", "Unavailable", "Unavailable");
  }
  return frozenSummary("missing", "Missing", "Missing");
}

function validateObservations(observations) {
  if (!Array.isArray(observations)) {
    throw new TypeError("observations must be an array.");
  }

  let previousEpochMs = null;
  for (const [index, observation] of observations.entries()) {
    if (!observation || typeof observation !== "object" || Array.isArray(observation)) {
      throw new TypeError(`Observation at index ${index} must be an object.`);
    }
    if (!Number.isFinite(observation.epochMs)) {
      throw new TypeError(`Observation at index ${index} must have a finite numeric epochMs.`);
    }
    if (index > 0 && observation.epochMs === previousEpochMs) {
      throw new Error(
        `Duplicate canonical timestamp ${observation.epochMs} requires aggregation before temporal matching.`,
      );
    }
    if (index > 0 && observation.epochMs < previousEpochMs) {
      throw new Error("Observations must be sorted by strictly increasing epochMs.");
    }
    previousEpochMs = observation.epochMs;
  }
}

function validateTolerance(policy, toleranceMs, canonical = false) {
  if (
    policy === "nearest"
    && !canonical
    && (!Number.isFinite(toleranceMs) || toleranceMs < 0)
  ) {
    throw new RangeError("Nearest temporal matching requires a finite, non-negative toleranceMs.");
  }
  if (
    toleranceMs !== undefined
    && (!Number.isFinite(toleranceMs) || toleranceMs < 0)
  ) {
    throw new RangeError("toleranceMs must be a finite, non-negative number.");
  }
}

function lowerBound(observations, activeEpochMs) {
  let start = 0;
  let end = observations.length;
  while (start < end) {
    const middle = start + Math.floor((end - start) / 2);
    if (observations[middle].epochMs < activeEpochMs) start = middle + 1;
    else end = middle;
  }
  return start;
}

function lastKnown(observations, insertionIndex) {
  if (insertionIndex === 0) return MISSING_MATCH;
  return matched("carried", observations[insertionIndex - 1]);
}

function nearestObservation(observations, insertionIndex, activeEpochMs, toleranceMs) {
  const lower = insertionIndex > 0 ? observations[insertionIndex - 1] : null;
  const upper = insertionIndex < observations.length ? observations[insertionIndex] : null;
  const lowerDistance = lower ? activeEpochMs - lower.epochMs : Number.POSITIVE_INFINITY;
  const upperDistance = upper ? upper.epochMs - activeEpochMs : Number.POSITIVE_INFINITY;
  const nearestDistance = Math.min(lowerDistance, upperDistance);

  if (nearestDistance > toleranceMs) return null;
  return lowerDistance <= upperDistance ? lower : upper;
}

function interpolateNumeric(observations, insertionIndex, activeEpochMs, canonical = false) {
  if (insertionIndex === 0 || insertionIndex === observations.length) {
    return canonical ? canonicalMissing("interpolation-bounds-missing") : MISSING_MATCH;
  }

  const lower = observations[insertionIndex - 1];
  const upper = observations[insertionIndex];
  if (!Number.isFinite(lower.value) || !Number.isFinite(upper.value)) {
    if (canonical) return canonicalUnavailable("interpolation-requires-numeric-bounds");
    throw new TypeError("Interpolation requires finite numeric observation values.");
  }

  const ratio = (activeEpochMs - lower.epochMs) / (upper.epochMs - lower.epochMs);
  const value = normalizedFinite(
    lower.value * (1 - ratio) + upper.value * ratio,
  );
  if (!Number.isFinite(value)) {
    throw new RangeError("Interpolation did not produce a finite numeric observation value.");
  }

  const observation = Object.freeze({ value, epochMs: activeEpochMs });
  if (canonical) {
    return Object.freeze({
      status: "interpolated",
      observation,
      observationEpochs: Object.freeze([lower.epochMs, upper.epochMs]),
      signedOffsetMs: null,
      reason: null,
    });
  }
  return Object.freeze({
    status: "interpolated",
    observation,
    lowerEpochMs: lower.epochMs,
    upperEpochMs: upper.epochMs,
  });
}

function normalizedFinite(value) {
  if (!Number.isFinite(value)) return value;
  if (value === 0) return 0;
  const tolerance = Number.EPSILON * Math.abs(value);
  for (let decimalPlaces = 0; decimalPlaces <= 15; decimalPlaces += 1) {
    const factor = 10 ** decimalPlaces;
    const scaled = value * factor;
    if (!Number.isFinite(scaled)) continue;
    const candidate = Math.round(scaled) / factor;
    if (Math.abs(value - candidate) <= tolerance) {
      return Object.is(candidate, -0) ? 0 : candidate;
    }
  }
  return value;
}

function matched(status, observation) {
  return Object.freeze({
    status,
    observation,
    sourceEpochMs: observation.epochMs,
  });
}

function canonicalMatched(status, observation, activeEpochMs) {
  return Object.freeze({
    status,
    observation,
    observationEpochs: Object.freeze([observation.epochMs]),
    signedOffsetMs: observation.epochMs - activeEpochMs,
    reason: null,
  });
}

function canonicalMissing(reason) {
  return Object.freeze({
    status: "missing",
    observation: null,
    observationEpochs: Object.freeze([]),
    signedOffsetMs: null,
    reason,
  });
}

function canonicalUnavailable(reason) {
  return Object.freeze({
    status: "unavailable",
    observation: null,
    observationEpochs: Object.freeze([]),
    signedOffsetMs: null,
    reason,
  });
}

function approvedLabel(policy) {
  if (CANONICAL_POLICIES.has(policy)) return policy;
  const aliases = {
    exact: MATCHING_POLICY_LABELS.CONCURRENT_ONLY,
    interpolate: MATCHING_POLICY_LABELS.INTERPOLATE,
    lastKnown: MATCHING_POLICY_LABELS.SNAP_TO_LATEST,
    nearest: MATCHING_POLICY_LABELS.SNAP_TO_CLOSEST,
  };
  if (aliases[policy]) return aliases[policy];
  throw new Error(`Unknown temporal matching policy "${policy}".`);
}

function validateSecondsPerFrame(value, description) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${description} secondsPerFrame must be positive and finite.`);
  }
}

function signedDayOffset(signedOffsetMs) {
  if (!Number.isFinite(signedOffsetMs)) {
    throw new TypeError("Snapped provenance requires a finite signedOffsetMs.");
  }
  return Math.round(signedOffsetMs / DAY_MS);
}

function formatSignedDays(value, includeUnit) {
  const signed = value > 0 ? `+${value}` : String(value);
  return includeUnit ? `${signed}d` : signed;
}

function pluralDay(value) {
  return Math.abs(value) === 1 ? "day" : "days";
}

function frozenSummary(kind, compactLabel, accessibleLabel) {
  return Object.freeze({ kind, compactLabel, accessibleLabel });
}
