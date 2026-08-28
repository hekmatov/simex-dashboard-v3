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
  let announcementRevision = 0;
  let announcement = null;
  let snapshot = freezeSnapshot([], announcement);

  function beginOperation({
    key,
    label,
    delayMs = DEFAULT_DELAY_MS,
    blocking = false,
    intent = "info",
  } = {}) {
    const normalizedKey = requiredText(key, "Operation key");
    const normalizedLabel = requiredText(label, "Operation label");
    if (!Number.isFinite(delayMs) || delayMs < 0) {
      throw new RangeError("Operation status delay must be non-negative.");
    }
    const previous = records.get(normalizedKey);
    clearRecordTimers(previous);
    const revision = (previous?.revision ?? 0) + 1;
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
      revision,
      scheduler,
      progressTimer: null,
      dismissTimer: null,
    };
    records.set(normalizedKey, record);
    if (visible) {
      announce(record, "polite");
      enforceVisibleLimit();
      publish();
    } else {
      record.progressTimer = scheduler.setTimeout(() => {
        const current = currentRecord(normalizedKey, revision);
        if (!current) return;
        current.progressTimer = null;
        current.visible = true;
        current.order = ++sequence;
        announce(current, "polite");
        enforceVisibleLimit();
        publish();
      }, delayMs);
    }

    return Object.freeze({
      succeed(message) {
        const current = currentRecord(normalizedKey, revision);
        if (!current) return false;
        clearTimer(current, "progressTimer");
        if (!current.visible) {
          records.delete(normalizedKey);
          publish();
          return true;
        }
        current.status = "completed";
        current.intent = "success";
        current.message = optionalText(message) ?? `${current.label} completed.`;
        current.order = ++sequence;
        announce(current, "polite");
        enforceVisibleLimit();
        publish();
        current.dismissTimer = scheduler.setTimeout(() => {
          const latest = currentRecord(normalizedKey, revision);
          if (!latest || latest.status !== "completed") return;
          records.delete(normalizedKey);
          publish();
        }, SUCCESS_DISMISS_MS);
        return true;
      },
      fail(error) {
        const current = currentRecord(normalizedKey, revision);
        if (!current) return false;
        clearRecordTimers(current);
        current.visible = true;
        current.status = "failed";
        current.intent = "error";
        current.message = failureMessage(error, current.label);
        current.order = ++sequence;
        announce(current, "assertive");
        enforceVisibleLimit();
        publish();
        return true;
      },
      dismiss() {
        const current = currentRecord(normalizedKey, revision);
        if (!current) return false;
        return dismissOperation(normalizedKey);
      },
    });
  }

  function dismissOperation(key) {
    const normalizedKey = requiredText(key, "Operation key");
    const current = records.get(normalizedKey);
    if (!current) return false;
    clearRecordTimers(current);
    records.delete(normalizedKey);
    publish();
    return true;
  }

  function currentRecord(key, revision) {
    const current = records.get(key);
    return current?.revision === revision ? current : null;
  }

  function announce(record, politeness) {
    announcement = Object.freeze({
      key: record.key,
      message: record.message,
      politeness,
      revision: ++announcementRevision,
    });
  }

  function enforceVisibleLimit() {
    const visible = [...records.values()]
      .filter((record) => record.visible)
      .sort((left, right) => left.order - right.order);
    while (visible.length > MAX_VISIBLE_NOTICES) {
      const removed = visible.shift();
      clearRecordTimers(removed);
      records.delete(removed.key);
    }
  }

  function publish() {
    const notices = [...records.values()]
      .filter((record) => record.visible)
      .sort((left, right) => left.order - right.order)
      .map(publicNotice);
    snapshot = freezeSnapshot(notices, announcement);
    for (const listener of listeners) listener(snapshot);
  }

  return Object.freeze({
    beginOperation,
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
