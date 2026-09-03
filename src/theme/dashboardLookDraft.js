const SIGNATURE_PROFILE_BY_STYLE = Object.freeze({
  "evidence-ledger": "evidence-ledger/brighter-vellum",
  "humanist-standard": "humanist-standard/common-ground",
  "signal-instrument": "signal-instrument/calibrated-steel",
});

export function createDashboardLookPreview(theme) {
  return {
    dashboardStyle: theme.dashboardStyle,
    dashboardColorProfile: theme.dashboardColorProfile,
    chartColorMode: theme.chartColorMode,
    appearancePreference: theme.appearancePreference,
    resolvedAppearance: theme.resolvedAppearance,
  };
}

export function dashboardLookUpdates(preview) {
  return {
    dashboardStyle: preview.dashboardStyle,
    dashboardColorProfile: preview.dashboardColorProfile,
  };
}

export function chartColorUpdates(preview) {
  return { chartColorMode: preview.chartColorMode };
}

export function signatureProfileForStyle(style) {
  return SIGNATURE_PROFILE_BY_STYLE[style] ?? null;
}

export function resolveDashboardLookSurfaceAttributes(preview = {}) {
  const appearancePreference = preview.appearancePreference ?? "system";
  return {
    style: preview.dashboardStyle,
    colorProfile: preview.dashboardColorProfile,
    resolvedAppearance: appearancePreference === "system"
      ? preview.resolvedAppearance ?? "light"
      : appearancePreference,
  };
}

export function applyDashboardLookConfiguration(committedConfiguration, liveDashboard) {
  if (!committedConfiguration || typeof committedConfiguration !== "object") {
    throw new TypeError("A committed dashboard configuration is required.");
  }
  const current = liveDashboard && typeof liveDashboard === "object"
    ? liveDashboard
    : committedConfiguration;
  return {
    ...current,
    globalStyles: structuredClone(committedConfiguration.globalStyles ?? {}),
  };
}

export function createDashboardLookCommitScheduler({
  delay = 150,
  timerTarget = globalThis,
  onCommit,
  onError = () => {},
} = {}) {
  if (!Number.isFinite(delay) || delay < 0) {
    throw new RangeError("Theme commit delay must be non-negative.");
  }
  if (
    typeof timerTarget?.setTimeout !== "function"
    || typeof timerTarget?.clearTimeout !== "function"
  ) {
    throw new TypeError("Theme commits require timer support.");
  }
  if (typeof onCommit !== "function") {
    throw new TypeError("Theme commits require an onCommit callback.");
  }

  let timerId = null;
  let pending = null;
  let active = Promise.resolve();
  let disposed = false;

  const clearTimer = () => {
    if (timerId === null) return;
    timerTarget.clearTimeout(timerId);
    timerId = null;
  };
  const commitLatest = () => {
    timerId = null;
    if (disposed || pending === null) return active;
    const value = pending;
    pending = null;
    active = active.then(() => onCommit(value)).catch((error) => {
      onError(error);
    });
    return active;
  };

  return Object.freeze({
    schedule(value) {
      if (disposed) throw new Error("Theme commit scheduler is disposed.");
      pending = structuredClone(value);
      clearTimer();
      timerId = timerTarget.setTimeout(commitLatest, delay);
    },
    flush() {
      clearTimer();
      return commitLatest();
    },
    dispose() {
      clearTimer();
      pending = null;
      disposed = true;
    },
  });
}

export function closeDashboardLookInBackground({ scheduler, onApply, onCanonicalize = () => {}, onClose }) {
  if (typeof onApply !== "function") {
    throw new TypeError("Closing Theme requires an onApply callback.");
  }
  if (typeof onClose !== "function") {
    throw new TypeError("Closing Theme requires an onClose callback.");
  }
  if (typeof scheduler?.flush !== "function") {
    throw new TypeError("Closing Theme requires a commit scheduler.");
  }
  const applied = onApply();
  onCanonicalize(applied);
  onClose();
  void scheduler.flush();
}
