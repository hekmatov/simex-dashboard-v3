import { parseTemporalValue } from "./temporal.js";
import { matchTemporalObservation } from "../time/temporalMatch.js";
import { assertTimeSyncInterpolationAllowed } from "../time/timeSyncModel.js";

const DEFAULT_COMPARISON = Object.freeze({ mode: "previousObservation" });
const CANONICAL_INSTANT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/;

/**
 * Selects one Delta baseline from canonical, duplicate-resolved observations.
 * Temporal parsing happens before the numeric matcher boundary.
 */
export function resolveDeltaComparison({
  observations = [],
  displayed,
  comparison = DEFAULT_COMPARISON,
  chart,
  timeRole,
  profile,
} = {}) {
  try {
    validateDisplayed(displayed);
    validateObservationSequence(observations, displayed);
    const configured = comparison ?? DEFAULT_COMPARISON;
    if (configured.mode === "previousObservation") {
      return resolvePrevious(observations, displayed);
    }
    if (configured.mode !== "fixedTime") {
      return invalid(`Unsupported Delta comparison mode "${configured.mode}".`);
    }
    return resolveFixed({
      observations,
      displayed,
      comparison: configured,
      chart,
      timeRole,
      profile,
    });
  } catch (cause) {
    return invalid(cause?.message || "The Delta comparison could not be resolved.");
  }
}

function resolvePrevious(observations, displayed) {
  const preceding = observations.filter(
    ({ epochMs }) => epochMs < displayed.epochMs,
  ).at(-1);
  if (!preceding) {
    return missing(
      "No preceding comparison measurement is available for the displayed observation.",
    );
  }
  return matched(preceding, observedProvenance(preceding));
}

function resolveFixed({
  observations,
  displayed,
  comparison,
  chart,
  timeRole,
  profile,
}) {
  const parsed = parseTemporalValue(comparison.at, { format: "ISO-8601" });
  if (
    !parsed.ok
    || parsed.kind !== "instant"
    || parsed.canonical !== comparison.at
  ) {
    return invalid("The fixed Delta comparison time must be a canonical UTC instant.");
  }
  const activeEpochMs = canonicalInstantEpochMs(parsed.canonical);
  if (!Number.isFinite(activeEpochMs)) {
    return invalid("The fixed Delta comparison time is outside the supported date range.");
  }
  if (activeEpochMs >= displayed.epochMs) {
    return invalid(
      "The fixed Delta comparison time must be strictly before the displayed observation.",
    );
  }

  const matching = comparison.matching;
  if (!matching || typeof matching !== "object" || Array.isArray(matching)) {
    return invalid("A fixed Delta comparison requires a temporal matching policy.");
  }
  if (matching.policy === "interpolate") {
    assertTimeSyncInterpolationAllowed({ chart, timeRole, profile });
  }

  const candidates = observations.filter(
    ({ epochMs }) => epochMs <= displayed.epochMs,
  );
  const temporalMatch = matchTemporalObservation({
    observations: candidates,
    activeEpochMs,
    policy: matching.policy,
    toleranceMs: matching.toleranceMs,
    interpolationAllowed: matching.policy === "interpolate",
  });
  if (temporalMatch.status === "missing") {
    return missing(
      `No comparison measurement matches the fixed time ${parsed.canonical}.`,
    );
  }
  if (temporalMatch.observation.epochMs >= displayed.epochMs) {
    return invalid(
      "The resolved Delta comparison measurement must be strictly before the displayed observation.",
    );
  }

  const observation = temporalMatch.status === "interpolated"
    ? {
        epochMs: activeEpochMs,
        canonical: parsed.canonical,
        entity: displayed.entity ?? null,
        value: temporalMatch.observation.value,
      }
    : temporalMatch.observation;
  return matched(
    observation,
    matchProvenance(temporalMatch, parsed.canonical, candidates),
  );
}

function validateDisplayed(displayed) {
  if (!displayed || typeof displayed !== "object" || Array.isArray(displayed)) {
    throw new TypeError("The displayed Delta observation must be an object.");
  }
  if (!Number.isFinite(displayed.epochMs)) {
    throw new TypeError(
      "The displayed Delta observation must have a finite canonical epoch.",
    );
  }
}

function validateObservationSequence(observations, displayed) {
  if (!Array.isArray(observations)) {
    throw new TypeError("Delta observations must be an array.");
  }
  const displayedMatch = matchTemporalObservation({
    observations,
    activeEpochMs: displayed.epochMs,
    policy: "exact",
  });
  if (displayedMatch.status === "missing") {
    throw new Error(
      "The displayed Delta observation is not present in the canonical observation sequence.",
    );
  }
}

function observedProvenance(observation) {
  return {
    status: "observed",
    activeEpochMs: observation.epochMs,
    activeCanonical: observation.canonical,
    sourceEpochMs: observation.epochMs,
    sourceCanonical: observation.canonical,
  };
}

function matchProvenance(match, activeCanonical, observations) {
  const activeEpochMs = canonicalInstantEpochMs(activeCanonical);
  const source = match.sourceEpochMs === undefined
    ? null
    : observations.find(({ epochMs }) => epochMs === match.sourceEpochMs);
  return {
    status: match.status,
    activeEpochMs,
    activeCanonical,
    ...(match.sourceEpochMs === undefined
      ? {}
      : {
          sourceEpochMs: match.sourceEpochMs,
          ...(source?.canonical === undefined
            ? {}
            : { sourceCanonical: source.canonical }),
        }),
    ...(match.lowerEpochMs === undefined
      ? {}
      : {
          lowerEpochMs: match.lowerEpochMs,
          lowerCanonical: observations.find(
            ({ epochMs }) => epochMs === match.lowerEpochMs,
          )?.canonical,
        }),
    ...(match.upperEpochMs === undefined
      ? {}
      : {
          upperEpochMs: match.upperEpochMs,
          upperCanonical: observations.find(
            ({ epochMs }) => epochMs === match.upperEpochMs,
          )?.canonical,
        }),
  };
}

function matched(observation, provenance) {
  return {
    status: "matched",
    observation: structuredClone(observation),
    provenance,
  };
}

function missing(message) {
  return {
    status: "missing",
    diagnostic: {
      severity: "warning",
      code: "delta-comparison-missing",
      message: bounded(message),
    },
  };
}

function invalid(message) {
  return {
    status: "invalid",
    diagnostic: {
      severity: "error",
      code: "invalid-delta-comparison",
      message: bounded(message),
    },
  };
}

function bounded(message) {
  const text = String(message);
  return text.length <= 240 ? text : `${text.slice(0, 239)}…`;
}

function canonicalInstantEpochMs(value) {
  const match = CANONICAL_INSTANT.exec(value);
  if (!match) return Number.NaN;
  const [year, month, day, hour, minute, second, milliseconds] = match
    .slice(1)
    .map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, milliseconds);
  return date.valueOf();
}
