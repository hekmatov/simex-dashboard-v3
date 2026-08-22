export function initializeDeferredBuildDraft(current, createDraft) {
  if (current !== null && current !== undefined) return current;
  if (typeof createDraft !== "function") {
    throw new TypeError("A Build draft factory is required.");
  }
  return createDraft();
}
