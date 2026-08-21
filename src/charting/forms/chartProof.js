export function requestRenderProof({
  draftRevision,
  chart,
  preparedData,
  previousProof = null,
} = {}) {
  const inputHash = stableHash({ chart, preparedData });
  const revision = `render:${draftRevision ?? "unknown"}:${inputHash}`;
  const causalError = preparedData?.error ?? null;
  const rendererReadyCount = causalError ? 0 : effectiveOutputCount(preparedData);
  const errors = [];
  if (causalError) {
    errors.push({
      code: causalError.code ?? "render-failed",
      message: causalError.message ?? "The canonical renderer could not produce a current preview.",
      stage: causalError.stage ?? "configure-chart",
      retryable: causalError.retryable !== false,
    });
  } else if (rendererReadyCount <= 0) {
    errors.push({
      code: "render-empty",
      message: "The prepared data has no renderer-ready output. Repair mapping or preparation before creating the chart.",
      stage: "map-and-prepare-data",
      retryable: true,
    });
  }
  return {
    revision,
    draftRevision: draftRevision ?? null,
    inputHash,
    status: errors.length === 0 ? "valid" : "invalid",
    rendererReadyCount,
    errors,
    lastGood: errors.length > 0 && previousProof?.status === "valid"
      ? { ...structuredClone(previousProof), current: false }
      : null,
  };
}

export function deriveCreateProofState({
  renderProofRevision,
  placementProofRevision,
  draft,
} = {}) {
  const renderCurrent = Boolean(
    renderProofRevision
    && renderProofRevision.status === "valid"
    && renderProofRevision.rendererReadyCount > 0
    && renderProofRevision.revision === draft?.renderProofRevision
    && (!draft?.revision || renderProofRevision.draftRevision === draft.revision),
  );
  const placementCurrent = Boolean(
    placementProofRevision
    && placementProofRevision.status === "valid"
    && placementProofRevision.revision === draft?.placementProofRevision,
  );
  const reasons = [];
  if (!renderCurrent) reasons.push("Canonical render proof is not current and ready.");
  if (!placementCurrent) reasons.push("Placement proof is not current and valid.");
  return {
    renderCurrent,
    placementCurrent,
    ready: renderCurrent && placementCurrent,
    reasons,
  };
}

function effectiveOutputCount(preparedData) {
  if (Number.isFinite(preparedData?.effectiveOutputCount)) {
    return Math.max(0, preparedData.effectiveOutputCount);
  }
  if (Number.isFinite(preparedData?.rendererReadyCount)) {
    return Math.max(0, preparedData.rendererReadyCount);
  }
  for (const key of ["rows", "marks", "regions", "cells", "events", "values", "data"]) {
    if (Array.isArray(preparedData?.[key])) return preparedData[key].length;
  }
  return Array.isArray(preparedData) ? preparedData.length : 0;
}

function stableHash(value) {
  const text = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stableStringify(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
