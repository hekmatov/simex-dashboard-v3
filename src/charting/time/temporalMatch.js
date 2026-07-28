const MATCHING_POLICIES = new Set(["exact", "lastKnown", "nearest", "interpolate"]);
const MISSING_MATCH = Object.freeze({ status: "missing", observation: null });

/**
 * Matches an active canonical epoch against observations that have already
 * been parsed and sorted. Nearest matching fails closed on equidistant ties.
 */
export function matchTemporalObservation(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Temporal matching input must be an object.");
  }

  const policy = input.policy ?? "exact";
  if (!MATCHING_POLICIES.has(policy)) {
    throw new Error(`Unknown temporal matching policy "${policy}".`);
  }
  if (!Number.isFinite(input.activeEpochMs)) {
    throw new TypeError("activeEpochMs must be a finite number.");
  }

  const observations = input.observations === undefined ? [] : input.observations;
  validateObservations(observations);
  validateTolerance(policy, input.toleranceMs);
  if (policy === "interpolate" && input.interpolationAllowed !== true) {
    throw new Error("The schema does not permit interpolation.");
  }
  if (observations.length === 0) return MISSING_MATCH;

  const index = lowerBound(observations, input.activeEpochMs);
  const exact = observations[index];
  if (exact?.epochMs === input.activeEpochMs) {
    return matched("observed", exact);
  }

  if (policy === "exact") return MISSING_MATCH;
  if (policy === "lastKnown") return lastKnown(observations, index);
  if (policy === "nearest") {
    return nearestWithinTolerance(observations, index, input.activeEpochMs, input.toleranceMs);
  }
  return interpolateNumeric(observations, index, input.activeEpochMs);
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

function validateTolerance(policy, toleranceMs) {
  if (
    policy === "nearest"
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

function nearestWithinTolerance(observations, insertionIndex, activeEpochMs, toleranceMs) {
  const lower = insertionIndex > 0 ? observations[insertionIndex - 1] : null;
  const upper = insertionIndex < observations.length ? observations[insertionIndex] : null;
  const lowerDistance = lower ? activeEpochMs - lower.epochMs : Number.POSITIVE_INFINITY;
  const upperDistance = upper ? upper.epochMs - activeEpochMs : Number.POSITIVE_INFINITY;
  const nearestDistance = Math.min(lowerDistance, upperDistance);

  if (nearestDistance > toleranceMs) return MISSING_MATCH;
  if (lowerDistance === upperDistance) {
    throw new Error(
      `Nearest temporal match is ambiguous at ${activeEpochMs}; `
      + `${lower.epochMs} and ${upper.epochMs} are equidistant.`,
    );
  }

  return matched("nearest", lowerDistance < upperDistance ? lower : upper);
}

function interpolateNumeric(observations, insertionIndex, activeEpochMs) {
  if (insertionIndex === 0 || insertionIndex === observations.length) {
    return MISSING_MATCH;
  }

  const lower = observations[insertionIndex - 1];
  const upper = observations[insertionIndex];
  if (!Number.isFinite(lower.value) || !Number.isFinite(upper.value)) {
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
