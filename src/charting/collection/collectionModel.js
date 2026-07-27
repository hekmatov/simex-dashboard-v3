import { normalizePriorityExpression } from "./priorityExpression.js";

const SETTINGS_KEYS = new Set([
  "layout",
  "rows",
  "columns",
  "gap",
  "overflow",
  "ranking",
  "carousel",
  "playback",
]);
const RANKING_KEYS = {
  fixed: new Set(["mode"]),
  sort: new Set(["mode", "field", "direction", "stabilize"]),
  priority: new Set(["mode", "method", "expression", "stabilize"]),
};
const CAROUSEL_KEYS = new Set(["intervalMs", "loop", "pauseOnHover", "transition"]);
const PLAYBACK_KEYS = new Set(["rerank", "pauseCarousel"]);
const LAYOUTS = new Set(["fixed", "scroll", "carousel"]);
const OVERFLOWS_BY_LAYOUT = {
  fixed: new Set(["manualPages", "limit"]),
  scroll: new Set(["scroll", "limit"]),
  carousel: new Set(["autoRotate", "limit"]),
};
const DEFAULT_OVERFLOW = {
  fixed: "manualPages",
  scroll: "scroll",
  carousel: "autoRotate",
};
const PRIORITY_METHODS = new Set([
  "highestCurrent",
  "lowestCurrent",
  "largestAbsoluteChange",
  "largestPercentageChange",
  "furthestFromTarget",
  "riskScore",
]);
const DANGEROUS_FIELDS = new Set(["__proto__", "prototype", "constructor"]);

function recordDescriptors(value, description) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${description} must be an object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${description} must be a plain object.`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new Error(`${description} cannot contain symbol properties.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!Object.hasOwn(descriptor, "value")) {
      throw new Error(`${description} property "${key}" must be a data property.`);
    }
    if (!descriptor.enumerable) {
      throw new Error(`${description} property "${key}" must be enumerable.`);
    }
  }
  return descriptors;
}

function assertKnownKeys(descriptors, knownKeys, description) {
  for (const key of Object.keys(descriptors)) {
    if (!knownKeys.has(key)) {
      throw new Error(`Unknown ${description} property "${key}".`);
    }
  }
}

function ownValue(descriptors, key, fallback) {
  return Object.hasOwn(descriptors, key) ? descriptors[key].value : fallback;
}

function valueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function boundedInteger(value, name) {
  if (!Number.isInteger(value) || value < 1 || value > 4) {
    throw new Error(`Collection ${name} must be an integer between 1 and 4.`);
  }
  return value;
}

function booleanValue(value, name) {
  if (typeof value !== "boolean") {
    throw new Error(`Collection ${name} must be boolean.`);
  }
  return value;
}

function normalizeRanking(value) {
  const descriptors = recordDescriptors(value, "Collection ranking");
  const mode = ownValue(descriptors, "mode");
  if (typeof mode !== "string") {
    throw new Error(`Collection ranking mode must be a string; received type ${valueType(mode)}.`);
  }
  if (!RANKING_KEYS[mode]) {
    throw new Error(`Unsupported collection ranking mode "${mode}".`);
  }
  assertKnownKeys(descriptors, RANKING_KEYS[mode], `collection ranking for ${mode}`);
  if (mode === "fixed") return Object.freeze({ mode });

  const stabilize = booleanValue(ownValue(descriptors, "stabilize", false), "ranking stabilize");
  if (mode === "sort") {
    const field = ownValue(descriptors, "field");
    if (typeof field !== "string" || field.trim() === "") {
      throw new Error("Collection sort field is required and must be non-empty.");
    }
    const normalizedField = field.trim();
    if (DANGEROUS_FIELDS.has(normalizedField)) {
      throw new Error(`Collection sort field "${normalizedField}" is unsafe.`);
    }
    const direction = ownValue(descriptors, "direction", "asc");
    if (direction !== "asc" && direction !== "desc") {
      throw new Error("Collection sort direction must be asc or desc.");
    }
    return Object.freeze({ mode, field: normalizedField, direction, stabilize });
  }

  const hasMethod = Object.hasOwn(descriptors, "method");
  const hasExpression = Object.hasOwn(descriptors, "expression");
  if (!hasMethod && !hasExpression) {
    throw new Error("Collection priority ranking requires a method or expression.");
  }
  if (hasMethod && hasExpression) {
    throw new Error("Collection priority ranking accepts either method or expression, not both.");
  }
  if (hasMethod) {
    const method = descriptors.method.value;
    if (typeof method !== "string") {
      throw new Error(`Collection priority method must be a string; received type ${valueType(method)}.`);
    }
    if (!PRIORITY_METHODS.has(method)) {
      throw new Error(`Unsupported collection priority method "${method}".`);
    }
    return Object.freeze({ mode, method, stabilize });
  }
  return Object.freeze({
    mode,
    expression: normalizePriorityExpression(descriptors.expression.value),
    stabilize,
  });
}

function normalizeCarousel(value) {
  const descriptors = recordDescriptors(value, "Collection carousel");
  assertKnownKeys(descriptors, CAROUSEL_KEYS, "collection carousel");
  const intervalMs = ownValue(descriptors, "intervalMs", 10000);
  if (!Number.isInteger(intervalMs)) {
    throw new Error("Collection carousel intervalMs must be an integer of at least 5000 ms.");
  }
  if (intervalMs < 5000) {
    throw new Error("Collection carousel intervalMs must be at least 5000 ms.");
  }
  const transition = ownValue(descriptors, "transition", "none");
  if (!["none", "fade", "slide"].includes(transition)) {
    throw new Error("Collection carousel transition must be none, fade, or slide.");
  }
  return Object.freeze({
    intervalMs,
    loop: booleanValue(ownValue(descriptors, "loop", true), "carousel loop"),
    pauseOnHover: booleanValue(
      ownValue(descriptors, "pauseOnHover", true),
      "carousel pauseOnHover",
    ),
    transition,
  });
}

function normalizePlayback(value) {
  const descriptors = recordDescriptors(value, "Collection playback");
  assertKnownKeys(descriptors, PLAYBACK_KEYS, "collection playback");
  return Object.freeze({
    rerank: booleanValue(ownValue(descriptors, "rerank", true), "playback rerank"),
    pauseCarousel: booleanValue(
      ownValue(descriptors, "pauseCarousel", true),
      "playback pauseCarousel",
    ),
  });
}

/**
 * Validates collection policy and returns a detached, deeply immutable shape.
 */
export function normalizeCollectionSettings(settings = {}) {
  const descriptors = recordDescriptors(settings, "Collection settings");
  assertKnownKeys(descriptors, SETTINGS_KEYS, "collection settings");
  const layout = ownValue(descriptors, "layout", "fixed");
  if (typeof layout !== "string") {
    throw new Error(`Collection layout must be a string; received type ${valueType(layout)}.`);
  }
  if (!LAYOUTS.has(layout)) {
    throw new Error(`Unsupported collection layout "${layout}".`);
  }
  const rows = boundedInteger(ownValue(descriptors, "rows", 2), "rows");
  const columns = boundedInteger(ownValue(descriptors, "columns", 2), "columns");
  const gap = ownValue(descriptors, "gap", 16);
  if (!Number.isFinite(gap) || gap < 0 || gap > 64) {
    throw new Error("Collection gap must be between 0 and 64.");
  }
  const overflow = ownValue(descriptors, "overflow", DEFAULT_OVERFLOW[layout]);
  if (typeof overflow !== "string") {
    throw new Error(`Collection overflow must be a string; received type ${valueType(overflow)}.`);
  }
  if (!OVERFLOWS_BY_LAYOUT[layout].has(overflow)) {
    throw new Error(`Collection overflow "${overflow}" is not valid for ${layout} layout.`);
  }

  return Object.freeze({
    layout,
    rows,
    columns,
    gap,
    overflow,
    ranking: normalizeRanking(ownValue(descriptors, "ranking", { mode: "fixed" })),
    carousel: normalizeCarousel(ownValue(descriptors, "carousel", {})),
    playback: normalizePlayback(ownValue(descriptors, "playback", {})),
  });
}
