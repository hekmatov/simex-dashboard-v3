import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { prepareAxisData } from "./prepareAxisData.js";
import { prepareCompositionData } from "./prepareCompositionData.js";
import { prepareGeographyData } from "./prepareGeographyData.js";
import { prepareMatrixData } from "./prepareMatrixData.js";
import { prepareOperationalData } from "./prepareOperationalData.js";
import { prepareRelationshipData } from "./prepareRelationshipData.js";
import { prepareTargetData } from "./prepareTargetData.js";
import { prepareTimelineData } from "./prepareTimelineData.js";
import {
  applyTimeContext,
  applyTransforms,
  error,
  validateRoleBindings,
  warning,
} from "./transforms.js";

const PREPARERS = Object.freeze({
  axis: prepareAxisData,
  composition: prepareCompositionData,
  relationship: prepareRelationshipData,
  matrix: prepareMatrixData,
  timeline: prepareTimelineData,
  target: prepareTargetData,
  geography: prepareGeographyData,
  operational: prepareOperationalData,
});

const MARK_FIELDS_BY_ROLE = Object.freeze({
  axis: { measurements: "value", observation: "x" },
  composition: { category: "category", value: "value" },
  relationship: { x: "x", y: "y", size: "size", label: "label", cluster: "cluster" },
  matrix: { row: "row", column: "column", value: "value", time: "time" },
  timeline: { event: "event", start: "start", end: "end", lane: "lane", status: "status" },
  target: {
    value: "value", actual: "actual", measurement: "displayed", entity: "entity",
    time: "time", target: "target", label: "label",
  },
  geography: { geography: "geography", value: "value", time: "time" },
  operational: { columns: "columns", time: "time" },
});
const GROUPABLE_FAMILIES = new Set(["axis", "composition", "relationship", "matrix", "timeline", "geography"]);

export function prepareChartData(input = {}) {
  const chart = input.chart ?? {};
  const schema = getChartSchema(chart.typeId);
  const transformedRows = applyTransforms(input.rows, chart.transformations, input.datasetProfile);
  const timeScoped = applyTimeContext(transformedRows.rows, input.timeContext, input.datasetProfile);
  const transformed = { ...transformedRows, ...timeScoped };
  const bindingDiagnostics = validateRoleBindings(schema, chart, input.datasetProfile);
  const initialDiagnostics = [
    ...transformed.diagnostics,
    ...bindingDiagnostics,
    ...validateGroupTransform(schema, transformed, input.datasetProfile),
  ];

  if (initialDiagnostics.some(({ severity }) => severity === "error")) {
    return finalizePreparedResult(
      { marks: [], diagnostics: initialDiagnostics, duplicateGroupCount: 0, meta: {} },
      transformed,
      schema,
    );
  }

  const prepared = PREPARERS[schema.dataFamily]({
    ...input,
    chart,
    schema,
    rows: transformed.rows,
    transformed,
  });
  return finalizePreparedResult({
    ...prepared,
    diagnostics: [...initialDiagnostics, ...(prepared.diagnostics ?? [])],
  }, transformed, schema);
}

function validateGroupTransform(schema, transformed, datasetProfile) {
  const fields = transformed.config.groupFields;
  if (fields.length === 0) return [];
  if (!GROUPABLE_FAMILIES.has(schema.dataFamily)) {
    return [error(
      "group-transform-unsupported",
      `${schema.label} ${schema.dataFamily} marks cannot represent grouped data. Remove the group transform or choose a grouped chart.`,
      { dataFamily: schema.dataFamily, fields },
    )];
  }
  const columns = new Set((datasetProfile?.columns ?? []).map(({ name }) => name));
  return fields
    .filter((field) => !columns.has(field))
    .map((field) => error("group-field-missing", `Group field "${field}" is not in the dataset.`, { field }));
}

function finalizePreparedResult(prepared, transformed, schema) {
  const diagnostics = [...(prepared.diagnostics ?? [])];
  const hasErrors = diagnostics.some(({ severity }) => severity === "error");
  const marks = hasErrors ? [] : (prepared.marks ?? []);
  const renderableMarkCount = marks.filter((mark) => isRenderableMark(mark, schema)).length;
  if (!hasErrors && renderableMarkCount === 0) {
    diagnostics.push(warning("no-renderable-marks", "No renderer-ready marks remain after validation and transformations."));
  }
  return cloneAndFreeze({
    status: hasErrors ? "blocked" : renderableMarkCount > 0 ? "ready" : "empty",
    marks,
    diagnostics,
    meta: {
      dataFamily: schema.dataFamily,
      renderer: schema.renderer,
      markCount: marks.length,
      renderableMarkCount,
      rowsBeforeFilters: transformed.rowsBeforeFilters,
      rowsAfterFilters: transformed.rowsAfterFilters,
      rowsAfterTimeContext: transformed.rowsAfterTimeContext,
      filterCount: transformed.filterCount,
      duplicateGroupCount: prepared.duplicateGroupCount ?? 0,
      aggregation: transformed.config.aggregation,
      duplicateStrategy: transformed.config.duplicateStrategy,
      missingStrategy: transformed.config.missingStrategy,
      ...(prepared.meta ?? {}),
    },
  });
}

function isRenderableMark(mark, schema) {
  if (!mark || typeof mark !== "object") return false;
  const fieldByRole = MARK_FIELDS_BY_ROLE[schema.dataFamily] ?? {};
  for (const role of schema.roles.filter(({ min }) => min > 0)) {
    const field = fieldByRole[role.id];
    if (!field || !hasRenderableValue(mark[field])) return false;
  }
  const family = schema.dataFamily;
  if (family === "axis") return mark.x !== null && mark.x !== undefined && mark.value !== null && mark.value !== undefined;
  if (family === "composition") return mark.category !== null && mark.category !== undefined && mark.value !== null && mark.value !== undefined;
  if (family === "matrix") return hasRenderableValue(mark.row) && hasRenderableValue(mark.column) && hasRenderableValue(mark.value);
  if (family === "geography") return mark.geography !== null && mark.geography !== undefined && mark.value !== null && mark.value !== undefined;
  if (family === "relationship") return mark.x !== null && mark.y !== null;
  if (family === "timeline") return Boolean(mark.event) && Boolean(mark.start);
  if (family === "target") {
    if ((schema.typeId === "deltaCard" || schema.typeId === "deltaList") && !hasRenderableValue(mark.comparison)) return false;
    return [mark.value, mark.actual, mark.displayed].some((value) => value !== null && value !== undefined);
  }
  if (family === "operational") return Boolean(mark.src) || (Array.isArray(mark.columns) && mark.columns.length > 0);
  return false;
}

function hasRenderableValue(value) {
  return value !== null
    && value !== undefined
    && value !== ""
    && (!Array.isArray(value) || value.length > 0);
}

function cloneAndFreeze(value) {
  return deepFreeze(structuredClone(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}
