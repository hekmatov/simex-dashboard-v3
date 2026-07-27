import { normalizeCollectionSettings } from "./collectionModel.js";
import { evaluatePriorityExpression } from "./priorityExpression.js";

function ownDataValue(object, key) {
  if (object === null || typeof object !== "object") return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  return descriptor && Object.hasOwn(descriptor, "value")
    ? descriptor.value
    : undefined;
}

function firstFinite(item, keys) {
  for (const key of keys) {
    const value = ownDataValue(item, key);
    if (Number.isFinite(value)) return value;
  }
  return undefined;
}

function deltaMetric(item, directKeys, nestedKey) {
  const direct = firstFinite(item, directKeys);
  if (direct !== undefined) return direct;
  const delta = ownDataValue(item, "delta");
  return firstFinite(delta, [nestedKey]);
}

function metricsFor(item) {
  const current = firstFinite(item, ["current", "displayed", "value", "actual"]);
  const absoluteDelta = deltaMetric(item, ["absoluteDelta", "absoluteChange"], "absolute");
  const percentageDelta = deltaMetric(
    item,
    ["percentageDelta", "percentageChange"],
    "percentage",
  );
  const target = firstFinite(item, ["target"]);
  const explicitDistance = firstFinite(item, ["distanceFromTarget"]);
  const distanceFromTarget = explicitDistance !== undefined
    ? Math.abs(explicitDistance)
    : Number.isFinite(current) && Number.isFinite(target)
      ? Math.abs(current - target)
      : undefined;
  return {
    current,
    absoluteDelta,
    percentageDelta,
    target,
    distanceFromTarget,
    riskScore: firstFinite(item, ["riskScore"]),
  };
}

function builtInPriorityScore(item, method) {
  const metrics = metricsFor(item);
  if (method === "highestCurrent" || method === "lowestCurrent") return metrics.current;
  if (method === "largestAbsoluteChange") {
    return Number.isFinite(metrics.absoluteDelta) ? Math.abs(metrics.absoluteDelta) : undefined;
  }
  if (method === "largestPercentageChange") {
    return Number.isFinite(metrics.percentageDelta) ? Math.abs(metrics.percentageDelta) : undefined;
  }
  if (method === "furthestFromTarget") return metrics.distanceFromTarget;
  if (method === "riskScore") return metrics.riskScore;
  return undefined;
}

function expressionScore(item, expression) {
  try {
    return evaluatePriorityExpression(expression, metricsFor(item));
  } catch {
    return undefined;
  }
}

function priorityScore(item, ranking) {
  return ranking.expression
    ? expressionScore(item, ranking.expression)
    : builtInPriorityScore(item, ranking.method);
}

function entityIdFor(item, index) {
  const entityId = ownDataValue(item, "entityId");
  if (typeof entityId !== "string" || entityId.trim() === "") {
    throw new Error(`Collection item ${index + 1} entityId must be a non-empty string.`);
  }
  return entityId;
}

function validateItems(items) {
  if (!Array.isArray(items)) throw new Error("Collection items must be an array.");
  const seen = new Set();
  return items.map((item, index) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Collection item ${index + 1} must be an object.`);
    }
    const entityId = entityIdFor(item, index);
    if (seen.has(entityId)) throw new Error(`Duplicate collection entityId "${entityId}".`);
    seen.add(entityId);
    return { item, entityId, inputIndex: index };
  });
}

function previousIndexMap(previousOrder) {
  if (!Array.isArray(previousOrder)) {
    throw new Error("Previous collection order must be an array.");
  }
  const positions = new Map();
  previousOrder.forEach((entityId, index) => {
    if (typeof entityId !== "string" || entityId.trim() === "") {
      throw new Error("Previous collection order IDs must be non-empty strings.");
    }
    if (positions.has(entityId)) {
      throw new Error(`Duplicate previous collection entityId "${entityId}".`);
    }
    positions.set(entityId, index);
  });
  return positions;
}

function textFor(item) {
  for (const key of ["label", "entity", "title", "name"]) {
    const value = ownDataValue(item, key);
    if (typeof value === "string" && value !== "") return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function compareText(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function deterministicTie(left, right) {
  const textComparison = compareText(textFor(left.item), textFor(right.item));
  return textComparison || compareText(left.entityId, right.entityId);
}

function stabilizedTie(left, right, previousPositions) {
  const leftIndex = previousPositions.get(left.entityId);
  const rightIndex = previousPositions.get(right.entityId);
  if (leftIndex !== undefined && rightIndex !== undefined && leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }
  if (leftIndex !== undefined && rightIndex === undefined) return -1;
  if (leftIndex === undefined && rightIndex !== undefined) return 1;
  return deterministicTie(left, right);
}

function sortableValue(item, field) {
  const value = ownDataValue(item, field);
  if (typeof value === "number") {
    return Number.isFinite(value) ? { available: true, value, type: "number" } : { available: false };
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return { available: true, value: String(value), type: "text" };
  }
  return { available: false };
}

function compareAvailable(left, right) {
  if (left.type === "number" && right.type === "number") return left.value - right.value;
  return compareText(String(left.value), String(right.value));
}

function compareSort(left, right, ranking, previousPositions) {
  const leftValue = sortableValue(left.item, ranking.field);
  const rightValue = sortableValue(right.item, ranking.field);
  if (leftValue.available !== rightValue.available) return leftValue.available ? -1 : 1;
  if (!leftValue.available) return deterministicTie(left, right);
  const comparison = compareAvailable(leftValue, rightValue);
  if (comparison !== 0) return ranking.direction === "desc" ? -comparison : comparison;
  return ranking.stabilize
    ? stabilizedTie(left, right, previousPositions)
    : deterministicTie(left, right);
}

function comparePriority(left, right, ranking, previousPositions) {
  const leftScore = left.score;
  const rightScore = right.score;
  const leftAvailable = Number.isFinite(leftScore);
  const rightAvailable = Number.isFinite(rightScore);
  if (leftAvailable !== rightAvailable) return leftAvailable ? -1 : 1;
  if (!leftAvailable) return deterministicTie(left, right);
  if (leftScore !== rightScore) {
    const ascending = ranking.method === "lowestCurrent";
    return ascending ? leftScore - rightScore : rightScore - leftScore;
  }
  return ranking.stabilize
    ? stabilizedTie(left, right, previousPositions)
    : deterministicTie(left, right);
}

/**
 * Returns an immutable reordered array while leaving items and all inputs untouched.
 */
export function rankCollection(items, settings, previousOrder = []) {
  const normalized = normalizeCollectionSettings(settings);
  const entries = validateItems(items);
  const previousPositions = previousIndexMap(previousOrder);
  if (normalized.ranking.mode === "fixed") {
    return Object.freeze(entries.map(({ item }) => item));
  }
  const scored = entries.map((entry) => ({
    ...entry,
    score: normalized.ranking.mode === "priority"
      ? priorityScore(entry.item, normalized.ranking)
      : undefined,
  }));
  if (normalized.ranking.mode === "sort") {
    scored.sort((left, right) => compareSort(
      left,
      right,
      normalized.ranking,
      previousPositions,
    ));
  } else {
    scored.sort((left, right) => comparePriority(
      left,
      right,
      normalized.ranking,
      previousPositions,
    ));
  }
  return Object.freeze(scored.map(({ item }) => item));
}
