import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { buildAccessibilityCompanion } from "./accessibilityRows.js";
import { getRenderAdapter } from "./renderAdapterRegistry.js";

const MAX_ERROR_LENGTH = 240;

export function buildRenderModel(input = {}) {
  if (input.prepared?.status !== "ready") {
    return { kind: "error", message: readinessMessage(input.prepared) };
  }
  const schema = getChartSchema(input.chart?.typeId);
  const model = getRenderAdapter(schema.renderer)(input);
  if (model.kind !== "echarts") return model;
  return {
    ...model,
    accessibility: buildAccessibilityCompanion(schema, input.prepared.marks, input.chart),
  };
}

function readinessMessage(prepared) {
  const diagnostic = prepared?.diagnostics?.find(({ severity }) => severity === "error")
    ?? prepared?.diagnostics?.[0];
  const message = diagnostic?.message || "No renderer-ready chart data is available.";
  if (message.length <= MAX_ERROR_LENGTH) return message;
  return `${message.slice(0, MAX_ERROR_LENGTH - 1)}…`;
}
