const TEMPORAL_REVIEW_KEYS = new Set(["status", "sourceIds"]);
const TEMPORAL_REVIEW_STATUSES = new Set(["needs-review", "degraded"]);

export function validateTemporalReview(value, {
  allowedStatuses = [...TEMPORAL_REVIEW_STATUSES],
  description = "Temporal review",
} = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${description} must be an object.`);
  }
  for (const key of Object.keys(value)) {
    if (!TEMPORAL_REVIEW_KEYS.has(key)) throw new Error(`Unknown ${description.toLowerCase()} property "${key}".`);
  }
  const allowed = new Set(allowedStatuses);
  if (!allowed.has(value.status)) {
    throw new Error(`${description} status must be ${[...allowed].map((status) => `"${status}"`).join(" or ")}.`);
  }
  if (!Array.isArray(value.sourceIds) || value.sourceIds.length === 0) {
    throw new Error(`${description} sourceIds must be a non-empty array.`);
  }
  const sourceIds = value.sourceIds.map((sourceId) => requiredText(sourceId, `${description} source id`));
  if (new Set(sourceIds).size !== sourceIds.length) throw new Error(`${description} sourceIds must be unique.`);
  if (sourceIds.some((sourceId, index) => sourceId !== [...sourceIds].sort()[index])) {
    throw new Error(`${description} sourceIds must be sorted.`);
  }
  return value;
}

export function mergeTemporalReview(current, addition) {
  validateTemporalReview(addition);
  if (current !== undefined && current !== null) {
    validateTemporalReview(current, { allowedStatuses: [addition.status] });
  }
  return {
    status: addition.status,
    sourceIds: [...new Set([...(current?.sourceIds ?? []), ...addition.sourceIds])].sort(),
  };
}

export function clearTemporalReviewSourceIds(current, sourceIds) {
  if (current === undefined || current === null) return undefined;
  validateTemporalReview(current);
  const removing = new Set((sourceIds ?? []).map((sourceId) => requiredText(sourceId, "Cleared temporal review source id")));
  const remaining = current.sourceIds.filter((sourceId) => !removing.has(sourceId));
  return remaining.length === 0 ? undefined : { status: current.status, sourceIds: remaining };
}

export function clearChronoGroupReviewForSave(group) {
  const next = structuredClone(group);
  delete next.temporalReview;
  return next;
}

export function clearSceneReviewForSave(scene) {
  const next = structuredClone(scene);
  delete next.temporalReview;
  if (next.present && typeof next.present === "object") delete next.present.temporalReview;
  return next;
}

function requiredText(value, description) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) {
    throw new Error(`${description} must be non-empty text without surrounding whitespace.`);
  }
  return value;
}
