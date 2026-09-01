import React from "react";

export const CHART_STATE_KINDS = Object.freeze([
  "loading",
  "empty",
  "partial",
  "unavailable",
  "stale",
  "error",
  "needs-attention",
  "last-valid",
]);

const STATE_LABELS = Object.freeze({
  loading: "Loading",
  empty: "Empty",
  partial: "Partial",
  unavailable: "Unavailable",
  stale: "Stale",
  error: "Error",
  "needs-attention": "Needs attention",
  "last-valid": "Last valid",
});

const ALERT_STATES = new Set(["partial", "unavailable", "error", "needs-attention"]);

export function deriveChartStateModel({
  kind,
  chartName,
  reason = null,
  retryDestination = null,
  repairDestination = null,
  retryOwner = "source",
  repairOwner = "chart",
} = {}) {
  if (!CHART_STATE_KINDS.includes(kind)) {
    throw new Error(`Unknown chart state: ${String(kind)}`);
  }
  const name = readableChartName(chartName);
  const actions = [];
  if (kind === "partial") {
    actions.push({
      id: "continue",
      label: "Continue with Available Data",
      owner: "chart-session",
      destination: "chart:available-data",
    });
  }
  if (retryDestination && kind !== "loading" && kind !== "needs-attention") {
    actions.push({
      id: "retry",
      label: kind === "stale" ? `Refresh ${name}` : `Retry Loading ${name}`,
      owner: retryOwner,
      destination: retryDestination,
    });
  }
  if (repairDestination && kind !== "loading" && kind !== "stale" && kind !== "last-valid") {
    actions.push({
      id: "repair",
      label: kind === "empty"
        ? `Review ${name} Data Settings`
        : kind === "unavailable"
          ? `Repair ${name} Source`
          : `Repair ${name}`,
      owner: repairOwner,
      destination: repairDestination,
    });
  }
  return {
    kind,
    statusText: STATE_LABELS[kind],
    message: stateMessage(kind, name, reason),
    role: ALERT_STATES.has(kind) ? "alert" : "status",
    live: ALERT_STATES.has(kind) ? "assertive" : "polite",
    busy: kind === "loading",
    actions,
  };
}

export default function ChartStateSurface({
  state,
  chartName,
  reason = null,
  dimensions = null,
  lastValid = null,
  children = null,
  retryDestination = null,
  repairDestination = null,
  retryOwner = "source",
  repairOwner = "chart",
  onRetry = null,
  onRepair = null,
  onContinue = null,
  short = false,
}) {
  const stateValue = typeof state === "string" ? { kind: state } : state ?? {};
  const model = deriveChartStateModel({
    kind: stateValue.kind,
    chartName,
    reason: stateValue.reason ?? reason,
    retryDestination: stateValue.retryDestination ?? retryDestination,
    repairDestination: stateValue.repairDestination ?? repairDestination,
    retryOwner: stateValue.retryOwner ?? retryOwner,
    repairOwner: stateValue.repairOwner ?? repairOwner,
  });
  const displayedMessage = typeof stateValue.message === "string" && stateValue.message.trim()
    ? stateValue.message.trim()
    : model.message;
  const retainedContent = lastValid ?? children;
  const operativeActions = model.actions.filter(({ id }) => ({
    retry: typeof onRetry === "function",
    repair: typeof onRepair === "function",
    continue: typeof onContinue === "function",
  })[id] === true);
  const hasUnavailableRecovery = model.actions.length > operativeActions.length;
  const plotDimensions = normalizeDimensions(dimensions);

  return React.createElement(
    "figure",
    {
      className: `chart-state-surface chart-state-surface--${model.kind}${short ? " chart-state-surface--short" : ""}`,
      "data-chart-state": model.kind,
      "data-retains-plot-bounds": "true",
      "data-plot-width": plotDimensions.width ?? undefined,
      "data-plot-height": plotDimensions.height ?? undefined,
      "aria-busy": model.busy,
      tabIndex: short ? 0 : undefined,
      "aria-label": short
        ? `${readableChartName(chartName)} status. Scroll to view details.`
        : undefined,
      style: plotDimensions.style,
    },
    React.createElement(
      "div",
      {
        className: "chart-state-surface__plot",
        "data-last-valid-retained": lastValid !== null ? "true" : undefined,
      },
      retainedContent,
    ),
    React.createElement(
      "figcaption",
      {
        className: "chart-state-surface__overlay",
        "data-chart-state-overlay": "true",
        role: model.role,
        "aria-live": model.live,
        "aria-atomic": "true",
      },
      React.createElement(
        "div",
        { className: "chart-state-surface__status" },
        React.createElement(
          "span",
          { className: "chart-state-surface__status-icon", "aria-hidden": "true" },
          stateIcon(model.kind),
        ),
        React.createElement("strong", { className: "chart-state-surface__status-text" }, model.statusText),
      ),
      React.createElement("p", null, displayedMessage),
      operativeActions.length > 0
        ? React.createElement(
            "div",
            {
              className: "chart-state-surface__actions",
              "aria-label": `${readableChartName(chartName)} recovery actions`,
            },
            operativeActions.map((action) => React.createElement(
              "button",
              {
                key: action.id,
                type: "button",
                "data-recovery-action": action.id,
                "data-recovery-owner": action.owner,
                "data-recovery-destination": action.destination,
                onClick: ({ retry: onRetry, repair: onRepair, continue: onContinue })[action.id],
              },
              action.label,
            )),
          )
        : null,
      hasUnavailableRecovery
        ? React.createElement(
            "p",
            { className: "chart-state-surface__recovery-unavailable" },
            "Recovery is unavailable in this context.",
          )
        : null,
    ),
  );
}

function stateMessage(kind, name, reason) {
  const messages = {
    loading: `Loading ${name}…`,
    empty: `No data is available for ${name}.`,
    partial: withReason(`${name} is showing partial data.`, reason),
    unavailable: withReason(`${name} is unavailable.`, reason),
    stale: `${name} may be out of date. The last valid chart remains visible.`,
    error: `Couldn’t load ${name}. The previous valid dashboard state is unchanged.`,
    "needs-attention": withReason(`${name} needs attention.`, reason),
    "last-valid": `Showing the last valid ${name} while current data is unavailable.`,
  };
  return messages[kind];
}

function withReason(message, reason) {
  if (typeof reason !== "string" || reason.trim() === "") return message;
  const trimmed = reason.trim();
  return `${message} ${/[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`}`;
}

function normalizeDimensions(dimensions) {
  const width = positiveFinite(dimensions?.width) ? dimensions.width : null;
  const height = positiveFinite(dimensions?.height) ? dimensions.height : null;
  return {
    width,
    height,
    style: {
      ...(height ? { minHeight: `${height}px` } : {}),
      ...(width && height ? { aspectRatio: `${width} / ${height}` } : {}),
    },
  };
}

function positiveFinite(value) {
  return Number.isFinite(value) && value > 0;
}

function readableChartName(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : "Chart";
}

function stateIcon(kind) {
  return {
    loading: "…",
    empty: "○",
    partial: "▧",
    unavailable: "×",
    stale: "↻",
    error: "!",
    "needs-attention": "!",
    "last-valid": "✓",
  }[kind];
}
