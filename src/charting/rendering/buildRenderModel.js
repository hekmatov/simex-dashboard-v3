import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import {
  buildAccessibilityCompanion,
  describeAccessibilityCompanion,
} from "./accessibilityRows.js";
import { getRenderAdapter } from "./renderAdapterRegistry.js";

const MAX_ERROR_LENGTH = 240;

export function buildRenderModel(input = {}) {
  if (input.prepared?.status !== "ready") {
    return { kind: "error", message: readinessMessage(input.prepared) };
  }
  const schema = getChartSchema(input.chart?.typeId);
  const model = getRenderAdapter(schema.renderer)(input, schema);
  if (model.kind === "targetCollection") {
    return attachTargetCollectionAccessibility(
      model,
      schema,
      input.prepared.marks,
      input.chart,
    );
  }
  if (model.kind !== "echarts") return model;
  return {
    ...model,
    accessibility: buildAccessibilityCompanion(
      schema,
      model.accessibilityMarks ?? input.prepared.marks,
      input.chart,
    ),
  };
}

export function enforceRenderReadiness(input = {}) {
  const prepared = input.prepared;
  if (prepared?.status !== "ready") return prepared;

  try {
    const model = buildRenderModel(input);
    if (model.kind !== "error") {
      return {
        ...prepared,
        meta: {
          ...prepared.meta,
          rendererReady: true,
        },
      };
    }
    return renderInvalidPreparation(prepared, model);
  } catch (error) {
    return renderInvalidPreparation(prepared, {
      message: error instanceof Error
        ? error.message
        : "The selected data cannot be rendered.",
    });
  }
}

function renderInvalidPreparation(prepared, model) {
  const diagnostics = Array.isArray(model.diagnostics) && model.diagnostics.length > 0
    ? model.diagnostics
    : [{
        severity: "error",
        code: "renderer-preflight-invalid",
        message: model.message || "The selected data cannot be rendered.",
      }];
  return {
    ...prepared,
    status: "invalid",
    diagnostics: [
      ...diagnostics,
      ...(Array.isArray(prepared.diagnostics) ? prepared.diagnostics : []),
    ],
    meta: {
      ...prepared.meta,
      renderableMarkCount: 0,
      rendererReady: false,
    },
  };
}

function attachTargetCollectionAccessibility(model, schema, marks, chart) {
  const items = model.items.map((item, index) => {
    const companion = buildAccessibilityCompanion(schema, [marks[index]], chart);
    const accessibility = {
      ...companion,
      rows: companion.rows.map((row) => ({
        ...row,
        label: item.label,
        ...targetPlaybackAccessibility(item),
      })),
    };
    const baseSummary = describeAccessibilityCompanion(accessibility);
    const accessibleSummary = describeTargetPlayback(baseSummary, item);
    return {
      ...item,
      accessibleSummary,
      model: {
        ...item.model,
        accessibility,
        option: {
          ...item.model.option,
          aria: {
            enabled: true,
            description: accessibleSummary,
          },
        },
      },
    };
  });
  return deepFreeze({
    ...model,
    items,
  });
}

function targetPlaybackAccessibility(item) {
  if (!item.provenance) return {};
  if (item.temporalStatus === "observed") {
    return {
      time: item.provenance.sourceTime ?? item.activeTime,
      temporalStatus: "observed",
    };
  }
  return {
    time: null,
    playbackTime: item.activeTime,
    temporalStatus: item.temporalStatus,
    ...(item.provenance.sourceTime ? { sourceTime: item.provenance.sourceTime } : {}),
    ...(item.provenance.lowerTime ? { lowerTime: item.provenance.lowerTime } : {}),
    ...(item.provenance.upperTime ? { upperTime: item.provenance.upperTime } : {}),
  };
}

function describeTargetPlayback(baseSummary, item) {
  if (!item.provenance || item.temporalStatus === "observed") return baseSummary;
  return `${baseSummary}. Playback time ${item.activeTime}. ${item.provenance.label}`;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function readinessMessage(prepared) {
  const diagnostic = prepared?.diagnostics?.find(({ severity }) => severity === "error")
    ?? prepared?.diagnostics?.[0];
  const message = diagnostic?.message || "No renderer-ready chart data is available.";
  if (message.length <= MAX_ERROR_LENGTH) return message;
  return `${message.slice(0, MAX_ERROR_LENGTH - 1)}…`;
}
