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
  const model = getRenderAdapter(schema.renderer)(input);
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
    accessibility: buildAccessibilityCompanion(schema, input.prepared.marks, input.chart),
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
      })),
    };
    const baseSummary = describeAccessibilityCompanion(accessibility);
    const accessibleSummary = item.provenance?.label
      ? `${baseSummary}. ${item.provenance.label}`
      : baseSummary;
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
