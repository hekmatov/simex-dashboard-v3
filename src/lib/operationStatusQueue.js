const DEFAULT_DELAY_MS = 500;
const SUCCESS_DISMISS_MS = 4_000;
const MAX_VISIBLE_NOTICES = 4;

export function createOperationStatusQueue({ scheduler = globalThis } = {}) {
  if (
    typeof scheduler?.setTimeout !== "function"
    || typeof scheduler?.clearTimeout !== "function"
  ) {
    throw new TypeError("Operation status scheduling requires timers.");
  }

  const records = new Map();
  const listeners = new Set();
  let sequence = 0;
  let operationGeneration = 0;
  let announcementRevision = 0;
  let announcement = null;
  let snapshot = freezeSnapshot([], announcement);
  const readNow = monotonicNow(scheduler);

  function beginOperation({
    key,
    label,
    delayMs = DEFAULT_DELAY_MS,
    blocking = false,
    reportCompletion = true,
    intent = "info",
  } = {}) {
    const normalizedKey = requiredText(key, "Operation key");
    const normalizedLabel = requiredText(label, "Operation label");
    if (!Number.isFinite(delayMs) || delayMs < 0) {
      throw new RangeError("Operation status delay must be non-negative.");
    }
    const previous = records.get(normalizedKey);
    clearRecordTimers(previous);
    const generation = ++operationGeneration;
    const visible = blocking === true || delayMs === 0 || previous?.visible === true;
    const record = {
      key: normalizedKey,
      label: normalizedLabel,
      status: "working",
      message: normalizedLabel,
      intent: requiredText(intent, "Operation intent"),
      blocking: blocking === true,
      visible,
      order: ++sequence,
      generation,
      scheduler,
      startedAt: readNow(),
      delayMs,
      reportCompletion: reportCompletion !== false,
      progressTimer: null,
      dismissTimer: null,
    };
    records.set(normalizedKey, record);
    if (visible) {
      announce(record, "polite");
      publish();
    } else {
      record.progressTimer = scheduler.setTimeout(() => {
        const current = currentRecord(normalizedKey, generation);
        if (!current) return;
        current.progressTimer = null;
        current.visible = true;
        current.order = ++sequence;
        announce(current, "polite");
        publish();
      }, delayMs);
    }

    return Object.freeze({
      succeed(message) {
        const current = currentRecord(normalizedKey, generation);
        if (!current) return false;
        clearTimer(current, "progressTimer");
        const elapsedDelay = elapsedMilliseconds(current.startedAt, readNow()) >= current.delayMs;
        if (!current.visible && !elapsedDelay && !current.reportCompletion) {
          removeRecord(normalizedKey, generation);
          publish();
          return true;
        }
        current.visible = true;
        current.status = "completed";
        current.intent = "success";
        current.message = optionalText(message) ?? `${current.label} completed.`;
        current.order = ++sequence;
        announce(current, "polite");
        publish();
        current.dismissTimer = scheduler.setTimeout(() => {
          const latest = currentRecord(normalizedKey, generation);
          if (!latest || latest.status !== "completed") return;
          removeRecord(normalizedKey, generation);
          publish();
        }, SUCCESS_DISMISS_MS);
        return true;
      },
      fail(error) {
        const current = currentRecord(normalizedKey, generation);
        if (!current) return false;
        clearRecordTimers(current);
        current.visible = true;
        current.status = "failed";
        current.intent = "error";
        current.message = failureMessage(error, current.label);
        current.order = ++sequence;
        announce(current, "assertive");
        publish();
        return true;
      },
      dismiss() {
        return dismissOperation(normalizedKey, generation);
      },
    });
  }

  function reportActivity({
    key,
    label,
    message,
    intent = "info",
    dismissMs = SUCCESS_DISMISS_MS,
  } = {}) {
    const normalizedKey = requiredText(key, "Activity key");
    const normalizedMessage = requiredText(message, "Activity message");
    const normalizedLabel = optionalText(label) ?? normalizedMessage;
    if (!Number.isFinite(dismissMs) || dismissMs < 0) {
      throw new RangeError("Activity dismiss delay must be non-negative.");
    }
    const previous = records.get(normalizedKey);
    clearRecordTimers(previous);
    const generation = ++operationGeneration;
    const record = {
      key: normalizedKey,
      label: normalizedLabel,
      status: "completed",
      message: normalizedMessage,
      intent: requiredText(intent, "Activity intent"),
      blocking: false,
      visible: true,
      order: ++sequence,
      generation,
      scheduler,
      startedAt: readNow(),
      delayMs: 0,
      progressTimer: null,
      dismissTimer: null,
    };
    records.set(normalizedKey, record);
    announce(record, "polite");
    publish();
    record.dismissTimer = scheduler.setTimeout(() => {
      const latest = currentRecord(normalizedKey, generation);
      if (!latest) return;
      removeRecord(normalizedKey, generation);
      publish();
    }, dismissMs);
    return Object.freeze({
      dismiss() {
        return dismissOperation(normalizedKey, generation);
      },
    });
  }

  function dismissOperation(key, expectedGeneration = null) {
    const normalizedKey = requiredText(key, "Operation key");
    const current = records.get(normalizedKey);
    if (!current || (
      expectedGeneration !== null
      && current.generation !== expectedGeneration
    )) return false;
    clearRecordTimers(current);
    removeRecord(normalizedKey, current.generation);
    publish();
    return true;
  }

  function currentRecord(key, generation) {
    const current = records.get(key);
    return current?.generation === generation ? current : null;
  }

  function announce(record, politeness) {
    announcement = Object.freeze({
      key: record.key,
      message: record.message,
      politeness,
      revision: ++announcementRevision,
    });
  }

  function removeRecord(key, generation) {
    const current = currentRecord(key, generation);
    if (!current) return false;
    records.delete(key);
    if (announcement?.key === key) announcement = null;
    return true;
  }

  function publish() {
    const notices = [...records.values()]
      .filter((record) => record.visible)
      .sort((left, right) => left.order - right.order)
      .slice(-MAX_VISIBLE_NOTICES)
      .map(publicNotice);
    snapshot = freezeSnapshot(notices, announcement);
    for (const listener of listeners) listener(snapshot);
  }

  return Object.freeze({
    beginOperation,
    reportActivity,
    dismissOperation,
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("Operation status listener is required.");
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      for (const record of records.values()) clearRecordTimers(record);
      records.clear();
      listeners.clear();
      announcement = null;
      snapshot = freezeSnapshot([], null);
    },
  });
}

function monotonicNow(scheduler) {
  if (typeof scheduler?.now === "function") return () => scheduler.now();
  if (typeof scheduler?.performance?.now === "function") {
    return () => scheduler.performance.now();
  }
  if (typeof globalThis.performance?.now === "function") {
    return () => globalThis.performance.now();
  }
  return () => Date.now();
}

function elapsedMilliseconds(startedAt, completedAt) {
  const elapsed = completedAt - startedAt;
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
}

function publicNotice(record) {
  return Object.freeze({
    key: record.key,
    label: record.label,
    status: record.status,
    message: record.message,
    intent: record.intent,
    blocking: record.blocking,
  });
}

function freezeSnapshot(notices, currentAnnouncement) {
  return Object.freeze({
    notices: Object.freeze(notices),
    announcement: currentAnnouncement,
  });
}

function clearRecordTimers(record) {
  if (!record) return;
  clearTimer(record, "progressTimer");
  clearTimer(record, "dismissTimer");
}

function clearTimer(record, name) {
  if (record?.[name] === null || record?.[name] === undefined) return;
  record[name] = schedulerFor(record)?.clearTimeout?.(record[name]) ?? null;
}

function schedulerFor(record) {
  return record?.scheduler;
}

function failureMessage(error, label) {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (typeof error?.message === "string" && error.message.trim()) return error.message.trim();
  return `${label} failed.`;
}

function optionalText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredText(value, description) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${description} is required.`);
  }
  return value.trim();
}
