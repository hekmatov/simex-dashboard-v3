import { prepareChartData } from "../data/prepareChartData.js";
import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { buildAccessibilityCompanionForFamily } from "./accessibilityRows.js";
import { buildRenderModel } from "./buildRenderModel.js";

const MAX_MESSAGE_LENGTH = 240;

export function resolveChartRendering(input = {}) {
  try {
    if (!isRenderingInput(input)) return invalidRenderingResolution();
    const renderingInput = captureRenderingInput(input);
    const schema = getChartSchema(renderingInput.chart?.typeId);
    const dependencyError = sourceDependencyError(renderingInput);
    if (dependencyError) {
      return renderingResolution({
        status: "unavailable",
        schema,
        prepared: null,
        model: { kind: "error", message: dependencyError },
        inputKey: renderingInput,
      });
    }
    const prepared = prepareChartData(renderingInput);
    const model = withPlaybackPresentation(
      buildRenderModel({ ...renderingInput, prepared }),
      prepared,
      renderingInput.timeContext,
      renderingInput.chart,
    );
    return renderingResolution({
      status: model.kind === "error" ? "unavailable" : "available",
      schema,
      prepared,
      model,
      inputKey: renderingInput,
    });
  } catch {
    return invalidRenderingResolution();
  }
}

export function canReuseChartRendering(resolution, input = {}) {
  try {
    const key = resolution?.inputKey;
    if (
      (resolution?.status !== "available" && resolution?.status !== "unavailable")
      || key === null
      || typeof key !== "object"
      || !isRenderingInput(input)
    ) {
      return false;
    }
    return (
      key.chart === input.chart
      && key.rows === input.rows
      && key.datasetProfile === input.datasetProfile
      && key.geoData === input.geoData
      && key.timeContext === input.timeContext
      && key.renderContext === input.renderContext
    );
  } catch {
    return false;
  }
}

function invalidRenderingResolution() {
  return renderingResolution({
    status: "unavailable",
    schema: null,
    prepared: null,
    model: {
      kind: "error",
      message: "This chart cannot be displayed.",
    },
    inputKey: null,
  });
}

function renderingResolution({
  status,
  schema,
  prepared,
  model,
  inputKey,
}) {
  const message = model.kind === "error"
    ? boundedMessage(model.message)
    : null;
  return Object.freeze({
    status,
    schema,
    prepared,
    model: message === null || message === model.message
      ? model
      : { ...model, message },
    message,
    inputKey,
  });
}

function captureRenderingInput(input) {
  return Object.freeze({
    chart: input.chart,
    rows: input.rows,
    datasetProfile: input.datasetProfile,
    geoData: input.geoData,
    timeContext: input.timeContext,
    renderContext: input.renderContext,
  });
}

function isRenderingInput(input) {
  return input !== null && typeof input === "object";
}

function sourceDependencyError(input) {
  const sourceId = text(input.chart?.sourceId) ?? "unknown";
  if (
    input.rows === undefined
    || input.rows === null
    || input.datasetProfile === undefined
    || input.datasetProfile === null
  ) {
    return `Data source ${sourceId} is unavailable.`;
  }
  return null;
}

function withPlaybackPresentation(model, prepared, timeContext, chart) {
  if (!timeContext || prepared.meta?.activeTime === undefined) return model;
  const activeMarks = prepared.marks?.filter(({ active }) => active === true) ?? [];
  if (prepared.meta.activeTime.status === "missing" && activeMarks.length === 0) {
    const message = prepared.diagnostics?.find(({ message: textValue }) => (
      /No measurement at this time/.test(textValue)
    ))?.message ?? "No measurement at this time.";
    return { kind: "error", message };
  }
  if (
    model.kind !== "echarts"
    || prepared.meta.activeTime.mode !== "trace"
    || !["axis", "timeline"].includes(model.accessibility?.family)
    || activeMarks.length === 0
  ) {
    return model;
  }
  const activeCanonical = prepared.meta.activeTime.canonical;
  const overlayMarks = activeMarks.map((mark) => ({
    ...mark,
    ...(model.accessibility.family === "axis"
      ? { x: activeCanonical }
      : {}),
  }));
  const activeCompanion = buildAccessibilityCompanionForFamily(
    model.accessibility.family,
    overlayMarks,
    chart,
  );
  const activeRows = activeCompanion.rows.map((row, index) => {
    const playbackProvenance = playbackProvenanceLabel(
      activeMarks[index]?.temporalProvenance,
    );
    return playbackProvenance ? { ...row, playbackProvenance } : row;
  });
  return {
    ...model,
    accessibility: {
      ...activeCompanion,
      rows: activeCompanion.family === "axis" && activeRows.length === 1
        ? [{ ...activeRows[0], series: "value" }]
        : activeRows,
    },
  };
}

function playbackProvenanceLabel(provenance) {
  const status = provenance?.status;
  const sourceTime = canonicalEpoch(provenance?.sourceEpochMs);
  const lowerTime = canonicalEpoch(provenance?.lowerEpochMs);
  const upperTime = canonicalEpoch(provenance?.upperEpochMs);
  if (status === "observed") {
    return sourceTime ? `observed measurement from ${sourceTime}` : null;
  }
  if (status === "carried") {
    return sourceTime ? `last known from ${sourceTime}` : "last known value";
  }
  if (status === "nearest") {
    return sourceTime ? `nearest measurement from ${sourceTime}` : "nearest measurement";
  }
  if (status === "interpolated") {
    return lowerTime && upperTime
      ? `interpolated between ${lowerTime} and ${upperTime}`
      : "interpolated value";
  }
  return null;
}

function canonicalEpoch(epochMs) {
  if (!Number.isFinite(epochMs)) return null;
  const canonical = new Date(epochMs).toISOString();
  return canonical.endsWith("T00:00:00.000Z")
    ? canonical.slice(0, 10)
    : canonical;
}

function boundedMessage(message) {
  const value = typeof message === "string" && message.trim()
    ? message.trim()
    : "No chart data is available.";
  return value.length <= MAX_MESSAGE_LENGTH
    ? value
    : `${value.slice(0, MAX_MESSAGE_LENGTH - 1)}\u2026`;
}

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
