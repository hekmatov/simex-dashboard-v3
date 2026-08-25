import { prepareChartData } from "../data/prepareChartData.js";
import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { buildAccessibilityCompanionForFamily } from "./accessibilityRows.js";
import { buildRenderModel } from "./buildRenderModel.js";
import { chartPreparationIdentity } from "../runtime/chartPreparationIdentity.js";
import { compileChartRuntimeArtifact } from "../runtime/chartRuntimeArtifact.js";
import { chartRuntimeArtifactRegistry } from "../runtime/chartRuntimeArtifactRegistry.js";
import { projectRuntimeArtifact } from "../runtime/projectRuntimeArtifact.js";
import {
  resolveStaticImageSource,
  resolveStaticTextSource,
} from "../../static-content/staticSourceResolver.js";

const MAX_MESSAGE_LENGTH = 240;
const STATIC_RENDERING_CACHE = new WeakMap();

export function resolveChartRendering(input = {}) {
  try {
    if (!isRenderingInput(input)) return invalidRenderingResolution();
    const renderingInput = captureRenderingInput(input);
    const staticResolution = resolveTypedStaticRendering(renderingInput);
    if (staticResolution) return staticResolution;
    const cached = readStaticRenderingCache(renderingInput);
    if (cached) return cached;
    const artifactResolution = resolveRuntimeArtifactRendering(renderingInput);
    if (artifactResolution) {
      writeStaticRenderingCache(renderingInput, artifactResolution);
      return artifactResolution;
    }
    const resolved = resolveCapturedChartRendering(renderingInput);
    publishCompatibilityArtifact(renderingInput, resolved);
    writeStaticRenderingCache(renderingInput, resolved);
    return resolved;
  } catch {
    return invalidRenderingResolution();
  }
}

function resolveTypedStaticRendering(renderingInput) {
  const chart = renderingInput.chart;
  const source = renderingSource(renderingInput, chart?.sourceId);
  if (chart?.typeId === "image" && source?.kind === "staticImage") {
    const schema = getChartSchema(chart.typeId);
    const resolved = resolveStaticImageSource(source, {
      sourceId: chart.sourceId,
      assets: renderingInput.renderContext?.assets ?? {},
      resolveAsset: renderingInput.renderContext?.resolveStaticAsset,
    });
    if (resolved && typeof resolved.then === "function") {
      const pending = Promise.resolve(resolved)
        .then((settled) => staticImageRenderingResolution(settled, schema, renderingInput))
        .catch(() => staticImageRenderingResolution({
          status: "error",
          failure: {
            code: "asset-read-failed",
            message: "The saved image asset could not be read.",
            retryable: true,
          },
        }, schema, renderingInput));
      return renderingResolution({
        status: "pending",
        schema,
        prepared: null,
        model: {
          kind: "image",
          status: "loading",
          staticSource: true,
          sourceId: chart.sourceId,
          revision: source.revision,
        },
        inputKey: renderingInput,
        pending,
      });
    }
    return staticImageRenderingResolution(resolved, schema, renderingInput);
  }
  if (chart?.typeId !== "freeText") return null;
  const schema = getChartSchema(chart.typeId);
  const resolved = resolveStaticTextSource(source, { sourceId: chart.sourceId });
  if (resolved.status !== "ready") {
    return renderingResolution({
      status: "unavailable",
      schema,
      prepared: null,
      model: { kind: "error", message: resolved.failure?.message },
      inputKey: renderingInput,
    });
  }
  return renderingResolution({
    status: "available",
    schema,
    prepared: null,
    model: {
      kind: "freeText",
      sourceId: resolved.sourceId,
      revision: resolved.revision,
      renderingPolicy: resolved.renderingPolicy,
      qmd: resolved.qmd,
    },
    inputKey: renderingInput,
  });
}

function staticImageRenderingResolution(resolved, schema, renderingInput) {
  return renderingResolution({
    status: resolved.status === "ready" ? "available" : "unavailable",
    schema,
    prepared: null,
    model: {
      ...resolved,
      kind: "image",
      staticSource: true,
    },
    inputKey: renderingInput,
  });
}

function resolveRuntimeArtifactRendering(renderingInput) {
  const identity = renderingArtifactIdentity(renderingInput);
  if (!identity) return null;
  const artifact = chartRuntimeArtifactRegistry.get(identity);
  if (!artifact) return null;
  const prepared = renderingInput.timeContext
    ? projectRuntimeArtifact({
        artifact,
        chart: renderingInput.chart,
        timeContext: renderingInput.timeContext,
      })
    : artifact.prepared;
  return prepared
    ? resolvePreparedChartRendering(renderingInput, prepared)
    : null;
}

function publishCompatibilityArtifact(renderingInput, resolution) {
  if (renderingInput.timeContext || !resolution?.prepared) return;
  const identity = renderingArtifactIdentity(renderingInput);
  if (!identity || chartRuntimeArtifactRegistry.get(identity)) return;
  try {
    const source = renderingSource(renderingInput, renderingInput.chart?.sourceId);
    const artifact = compileChartRuntimeArtifact({
      identity,
      chart: renderingInput.chart,
      source,
      prepared: resolution.prepared,
    });
    chartRuntimeArtifactRegistry.publish(artifact).persistence.catch(() => {});
  } catch {
    // Rendering remains available even when an optional artifact cannot be compiled.
  }
}

function renderingArtifactIdentity(renderingInput) {
  try {
    const chart = renderingInput.chart;
    const geoSourceId = chart?.presentation?.map?.geoSource;
    return chartPreparationIdentity({
      chart,
      source: renderingSource(renderingInput, chart?.sourceId),
      profile: renderingInput.datasetProfile,
      geoSource: renderingSource(renderingInput, geoSourceId),
    });
  } catch {
    return null;
  }
}

function renderingSource(renderingInput, sourceId) {
  if (!sourceId) return null;
  const sources = renderingInput.renderContext?.sources;
  const descriptor = sources instanceof Map
    ? sources.get(sourceId)
    : Array.isArray(sources)
      ? sources.find((source) => source?.id === sourceId)
      : sources?.[sourceId];
  const metadata = renderingInput.renderContext?.sourceMetadata;
  const sourceMetadata = metadata instanceof Map
    ? metadata.get(sourceId)
    : metadata?.[sourceId];
  return descriptor || sourceMetadata
    ? { ...(descriptor ?? {}), ...(sourceMetadata ?? {}), id: sourceId }
    : { id: sourceId };
}

export function resolvePreparedChartRendering(input = {}, prepared) {
  try {
    if (!isRenderingInput(input) || !isPreparedChartData(prepared)) {
      return invalidRenderingResolution();
    }
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

function resolveCapturedChartRendering(renderingInput) {
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
}

function readStaticRenderingCache(input) {
  if (!cacheableRenderingInput(input)) return null;
  const cached = STATIC_RENDERING_CACHE.get(input.chart);
  return cached && matchingStaticRenderingInput(cached, input)
    ? cached.resolution
    : null;
}

function writeStaticRenderingCache(input, resolution) {
  if (!cacheableRenderingInput(input)) return;
  STATIC_RENDERING_CACHE.set(input.chart, {
    rows: input.rows,
    datasetProfile: input.datasetProfile,
    geoData: input.geoData,
    sources: input.renderContext?.sources,
    sourceMetadata: input.renderContext?.sourceMetadata,
    mapName: input.renderContext?.mapName,
    accessibilityEnabled: input.renderContext?.accessibilityEnabled === true,
    resolution,
  });
}

function cacheableRenderingInput(input) {
  return input?.chart !== null
    && typeof input?.chart === "object"
    && (input.timeContext === null || input.timeContext === undefined);
}

function matchingStaticRenderingInput(cached, input) {
  return cached.rows === input.rows
    && cached.datasetProfile === input.datasetProfile
    && cached.geoData === input.geoData
    && cached.sources === input.renderContext?.sources
    && cached.sourceMetadata === input.renderContext?.sourceMetadata
    && cached.mapName === input.renderContext?.mapName
    && cached.accessibilityEnabled
      === (input.renderContext?.accessibilityEnabled === true);
}

export function canReuseChartRendering(resolution, input = {}) {
  try {
    const key = resolution?.inputKey;
    if (
      !["available", "unavailable", "pending"].includes(resolution?.status)
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
  pending = null,
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
    ...(pending ? { pending } : {}),
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

function isPreparedChartData(prepared) {
  return prepared !== null
    && typeof prepared === "object"
    && typeof prepared.status === "string"
    && Array.isArray(prepared.marks);
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
