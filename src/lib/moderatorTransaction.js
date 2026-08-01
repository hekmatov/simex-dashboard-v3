export async function runModeratorTransaction({ flush, commit, onCommitted } = {}) {
  if (typeof commit !== "function") throw new TypeError("Moderator transaction requires a commit operation.");
  if (flush !== undefined && typeof flush !== "function") throw new TypeError("Moderator transaction flush must be a function.");
  if (onCommitted !== undefined && typeof onCommitted !== "function") throw new TypeError("Moderator transaction completion must be a function.");
  if (flush) await flush();
  const result = await commit();
  if (onCommitted) await onCommitted(result);
  return result;
}

export function createSubmissionGate() {
  let active = null;
  return Object.freeze({
    run(operation) {
      if (active) return active;
      if (typeof operation !== "function") return Promise.reject(new TypeError("Submission operation must be a function."));
      try {
        active = Promise.resolve(operation()).finally(() => { active = null; });
      } catch (error) {
        return Promise.reject(error);
      }
      return active;
    },
    isActive() { return active !== null; },
  });
}
