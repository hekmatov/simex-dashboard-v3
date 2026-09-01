import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { getRenderAdapter } from "./renderAdapterRegistry.js";

const MAX_ERROR_LENGTH = 240;

export function buildRenderModel(input = {}) {
  if (input.prepared?.status !== "ready") {
    return { kind: "error", message: readinessMessage(input.prepared) };
  }
  const schema = getChartSchema(input.chart?.typeId);
  const model = getRenderAdapter(schema.renderer)(input, schema);
  if (model.kind === "targetCollection") {
    return disableTargetCollectionAccessibility(model);
  }
  if (model.kind !== "echarts") return model;
  return {
    ...model,
    accessibility: undefined,
    option: {
      ...model.option,
      aria: {
        ...(model.option?.aria ?? {}),
        enabled: false,
      },
    },
  };
}

function disableTargetCollectionAccessibility(model) {
  return {
    ...model,
    items: model.items.map((item) => ({
      ...item,
      model: {
        ...item.model,
        option: {
          ...item.model.option,
          aria: {
            ...(item.model.option?.aria ?? {}),
            enabled: false,
          },
        },
      },
    })),
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

function readinessMessage(prepared) {
  const diagnostic = prepared?.diagnostics?.find(({ severity }) => severity === "error")
    ?? prepared?.diagnostics?.[0];
  const message = diagnostic?.message || "No renderer-ready chart data is available.";
  if (message.length <= MAX_ERROR_LENGTH) return message;
  return `${message.slice(0, MAX_ERROR_LENGTH - 1)}…`;
}
