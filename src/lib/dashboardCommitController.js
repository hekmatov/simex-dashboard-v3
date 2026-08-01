export function createSerializedDashboardCommitController({
  initialDashboard,
  commit,
} = {}) {
  if (typeof commit !== "function") {
    throw new TypeError("A dashboard commit function is required.");
  }
  let current = cloneDashboard(initialDashboard);
  let queue = Promise.resolve();
  let disposed = false;

  const enqueue = (operation) => {
    const result = queue.then(async () => {
      if (disposed) throw new Error("Dashboard commit controller is disposed.");
      return operation();
    });
    queue = result.catch(() => undefined);
    return result;
  };

  return Object.freeze({
    mutate(mutator) {
      if (typeof mutator !== "function") {
        return Promise.reject(new TypeError("Dashboard mutation must be a function."));
      }
      return enqueue(async () => {
        const candidate = cloneDashboard(current);
        const returned = await mutator(candidate);
        const next = returned === undefined ? candidate : returned;
        const committed = await commit(cloneDashboard(next));
        current = cloneDashboard(committed);
        return cloneDashboard(current);
      });
    },
    replace(dashboard) {
      const replacement = cloneDashboard(dashboard);
      return enqueue(async () => {
        const committed = await commit(replacement);
        current = cloneDashboard(committed);
        return cloneDashboard(current);
      });
    },
    setCurrent(dashboard) {
      if (disposed) throw new Error("Dashboard commit controller is disposed.");
      current = cloneDashboard(dashboard);
    },
    getCurrent() {
      return cloneDashboard(current);
    },
    whenIdle() {
      return queue.then(() => cloneDashboard(current));
    },
    dispose() {
      disposed = true;
    },
  });
}

export function createDebouncedDashboardEdits({
  delay = 650,
  scheduler = globalThis,
  onCommit,
  onError = () => {},
} = {}) {
  if (!Number.isFinite(delay) || delay < 0) {
    throw new RangeError("Dashboard edit delay must be non-negative.");
  }
  if (
    typeof scheduler?.setTimeout !== "function"
    || typeof scheduler?.clearTimeout !== "function"
  ) {
    throw new TypeError("Dashboard edit scheduler must provide timers.");
  }
  if (typeof onCommit !== "function") {
    throw new TypeError("Dashboard edits require an onCommit callback.");
  }
  const pending = new Map();
  const latestRevision = new Map();
  let timerId = null;
  let disposed = false;
  let revision = 0;
  let restorationGeneration = 0;

  const clearTimer = () => {
    if (timerId === null) return;
    scheduler.clearTimeout(timerId);
    timerId = null;
  };

  const snapshotPending = () => ({
    generation: restorationGeneration,
    entries: [...pending.entries()].map(([key, value]) => ({
      key,
      revision: value.revision,
      edit: structuredClone(value.edit),
    })),
  });

  const restoreBatch = (batch) => {
    if (
      disposed
      || batch?.generation !== restorationGeneration
      || !Array.isArray(batch?.entries)
    ) {
      return 0;
    }
    let restored = 0;
    for (const entry of batch.entries) {
      if (
        latestRevision.get(entry.key) !== entry.revision
        || pending.has(entry.key)
      ) {
        continue;
      }
      pending.set(entry.key, {
        revision: entry.revision,
        edit: structuredClone(entry.edit),
      });
      restored += 1;
    }
    return restored;
  };

  const flush = () => {
    clearTimer();
    if (disposed || pending.size === 0) return Promise.resolve(null);
    const batch = snapshotPending();
    const edits = batch.entries.map(({ edit }) => structuredClone(edit));
    pending.clear();
    try {
      return Promise.resolve(onCommit(edits)).catch((error) => {
        restoreBatch(batch);
        throw error;
      });
    } catch (error) {
      restoreBatch(batch);
      return Promise.reject(error);
    }
  };

  return Object.freeze({
    schedule(key, edit) {
      if (disposed) throw new Error("Dashboard edit scheduler is disposed.");
      if (typeof key !== "string" || key.trim() === "") {
        throw new TypeError("Dashboard edit key is required.");
      }
      revision += 1;
      latestRevision.set(key, revision);
      pending.set(key, {
        revision,
        edit: structuredClone(edit),
      });
      clearTimer();
      timerId = scheduler.setTimeout(() => {
        timerId = null;
        void flush().catch(onError);
      }, delay);
    },
    flush,
    takePending() {
      clearTimer();
      const batch = snapshotPending();
      pending.clear();
      return batch;
    },
    restore: restoreBatch,
    cancel() {
      clearTimer();
      const count = pending.size;
      pending.clear();
      restorationGeneration += 1;
      return count;
    },
    dispose() {
      clearTimer();
      pending.clear();
      latestRevision.clear();
      restorationGeneration += 1;
      disposed = true;
    },
    pendingCount() {
      return pending.size;
    },
  });
}

export function applyDashboardEdits(dashboard, edits = []) {
  if (!isRecord(dashboard)) {
    throw new TypeError("Dashboard edits require a dashboard.");
  }
  for (const edit of edits) {
    if (!isRecord(edit) || !isRecord(edit.updates)) {
      throw new TypeError("Dashboard edit is invalid.");
    }
    if (edit.type === "dashboard") {
      Object.assign(dashboard, structuredClone(edit.updates));
      continue;
    }
    if (edit.type === "page") {
      const page = dashboard.pages?.find(({ id }) => id === edit.pageId);
      if (!page) throw new Error(`Dashboard page "${edit.pageId}" no longer exists.`);
      Object.assign(page, structuredClone(edit.updates));
      continue;
    }
    if (edit.type === "section") {
      const page = dashboard.pages?.find(({ id }) => id === edit.pageId);
      const section = page?.sections?.find(({ id }) => id === edit.sectionId);
      if (!section) throw new Error(`Dashboard section "${edit.sectionId}" no longer exists.`);
      Object.assign(section, structuredClone(edit.updates));
      continue;
    }
    throw new Error(`Unknown dashboard edit type "${String(edit.type)}".`);
  }
  return dashboard;
}

function cloneDashboard(value) {
  if (!isRecord(value)) throw new TypeError("A dashboard object is required.");
  return structuredClone(value);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
