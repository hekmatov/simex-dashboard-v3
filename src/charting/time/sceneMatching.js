const LEGACY_POLICIES = Object.freeze({
  "Concurrent only": "exact", "Snap to Latest": "lastKnown",
  "Snap to Closest": "nearest", Interpolate: "interpolate",
});

export function sceneMatchingPolicy(value) {
  if (value == null || value === "authored" || value === "Use authored settings") return "authored";
  return value?.policy ?? LEGACY_POLICIES[value] ?? value;
}

/** Authoring emits canonical objects; bounded nearest never loses its tolerance. */
export function sceneMatchingEdit(value, previous) {
  const policy = sceneMatchingPolicy(value);
  if (policy === "authored") return undefined;
  if (value && typeof value === "object") return structuredClone(value);
  return policy === "nearest"
    ? { policy, toleranceMs: previous?.policy === "nearest" ? previous.toleranceMs ?? 0 : 0 }
    : { policy };
}
