import { getChartSchema } from "../schemas/chartSchemaRegistry.js";

export const CHART_CONFIG_VERSION = 3;

const TRANSFORMATION_KEYS = new Set(["filters", "grouping", "aggregation", "duplicates", "missingValues", "temporalMatch"]);
const PRESENTATION_KEYS = new Set(["title", "collection", "labels", "axes", "targets", "map", "timeline", "background", "legend", "accessibility", "advanced"]);
const INTERACTION_KEYS = new Set(["zoom", "timeSync"]);
const LAYOUT_SIZES = new Set(["compact", "standard", "wide", "full"]);
const FILTER_OPERATORS = new Set(["in", "notIn", "range", "equals", "notEquals", "contains"]);
const AGGREGATIONS = new Set(["sum", "mean", "average", "min", "max", "count", "first", "last"]);
const DUPLICATE_STRATEGIES = new Set(["error", "first", "last", "aggregate", "sum", "mean", "average", "min", "max", "count"]);
const MISSING_VALUE_STRATEGIES = new Set(["gap", "zero", "drop"]);
const TIME_POLICIES = new Set(["exact", "lastKnown", "nearest", "interpolation"]);
const COLLECTION_LAYOUTS = new Set(["fixedGrid", "scrollableGrid", "carousel"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requiredString(value, description) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${description} is required.`);
}

function checkKnownKeys(value, keys, description) {
  for (const key of Object.keys(value)) {
    if (!keys.has(key)) throw new Error(`Unknown ${description} property "${key}".`);
  }
}

function ensureObject(value, description) {
  if (!isRecord(value)) throw new Error(`${description} must be an object.`);
}

function validateBinding(binding, role) {
  ensureObject(binding, `Role "${role.id}" binding`);
  requiredString(binding.field, `Role "${role.id}" field`);
}

function validateRoles(chart, schema) {
  ensureObject(chart.roles, "Chart roles");
  const byId = new Map(schema.roles.map((role) => [role.id, role]));
  for (const roleId of Object.keys(chart.roles)) {
    if (!byId.has(roleId)) throw new Error(`Unknown role "${roleId}" for chart type "${schema.typeId}".`);
  }

  for (const role of schema.roles) {
    const value = chart.roles[role.id];
    if (value === undefined || value === null) {
      if (role.min > 0) throw new Error(`Role "${role.id}" requires at least ${role.min} binding${role.min === 1 ? "" : "s"}.`);
      continue;
    }
    const bindings = Array.isArray(value) ? value : [value];
    if (bindings.length < role.min) throw new Error(`Role "${role.id}" requires at least ${role.min} binding${role.min === 1 ? "" : "s"}.`);
    if (role.max !== null && bindings.length > role.max) throw new Error(`Role "${role.id}" accepts at most ${role.max} binding${role.max === 1 ? "" : "s"}.`);
    for (const binding of bindings) validateBinding(binding, role);
  }
}

function validateFilter(filter) {
  ensureObject(filter, "Chart filter");
  requiredString(filter.field, "Chart filter field");
  if (!FILTER_OPERATORS.has(filter.operator)) throw new Error(`Unsupported chart filter operator "${filter.operator}".`);
}

function validateTransformations(chart, schema) {
  ensureObject(chart.transformations, "Chart transformations");
  checkKnownKeys(chart.transformations, TRANSFORMATION_KEYS, "chart transformations");
  const { filters, grouping, aggregation, duplicates, missingValues, temporalMatch } = chart.transformations;
  if (!Array.isArray(filters)) throw new Error("Chart transformations filters must be an array.");
  if (filters.length > 0 && !schema.transforms.includes("filter")) throw new Error(`Chart type "${schema.typeId}" does not support filters.`);
  filters.forEach(validateFilter);
  if (grouping !== null && grouping !== undefined) {
    if (!Array.isArray(grouping) || grouping.some((field) => typeof field !== "string" || field.trim() === "")) throw new Error("Chart transformations grouping must be null or an array of fields.");
    if (grouping.length > 0 && !schema.transforms.includes("group")) throw new Error(`Chart type "${schema.typeId}" does not support grouping.`);
  }
  if (aggregation !== null && aggregation !== undefined) {
    if (!AGGREGATIONS.has(aggregation)) throw new Error(`Unsupported aggregation "${aggregation}".`);
    if (!schema.transforms.includes("aggregate")) throw new Error(`Chart type "${schema.typeId}" does not support aggregation.`);
  }
  if (duplicates !== null && duplicates !== undefined) {
    if (!DUPLICATE_STRATEGIES.has(duplicates)) throw new Error(`Unsupported duplicate strategy "${duplicates}".`);
    if (!schema.transforms.includes("duplicates")) throw new Error(`Chart type "${schema.typeId}" does not support duplicate handling.`);
  }
  if (!MISSING_VALUE_STRATEGIES.has(missingValues)) throw new Error("Chart transformations missingValues must be gap, zero, or drop.");
  if (!schema.transforms.includes("missing")) throw new Error(`Chart type "${schema.typeId}" does not support missing-value handling.`);
  if (temporalMatch !== null && temporalMatch !== undefined) {
    ensureObject(temporalMatch, "Chart temporal match");
    if (!schema.capabilities.timeSync) throw new Error(`Chart type "${schema.typeId}" does not support temporal matching.`);
    if (!TIME_POLICIES.has(temporalMatch.policy)) throw new Error(`Unsupported temporal matching policy "${temporalMatch.policy}".`);
  }
}

function validateCollection(collection, schema) {
  if (collection === null || collection === undefined) return;
  if (!schema.capabilities.collection) throw new Error(`Chart type "${schema.typeId}" does not support collection presentation.`);
  ensureObject(collection, "Chart collection presentation");
  if (!COLLECTION_LAYOUTS.has(collection.layout)) throw new Error(`Unsupported collection layout "${collection.layout}".`);
  for (const dimension of ["rows", "columns"]) {
    if (!Number.isInteger(collection[dimension]) || collection[dimension] < 1) throw new Error(`Chart collection ${dimension} must be a positive integer.`);
  }
}

function validatePresentation(chart, schema) {
  ensureObject(chart.presentation, "Chart presentation");
  checkKnownKeys(chart.presentation, PRESENTATION_KEYS, "chart presentation");
  ensureObject(chart.presentation.title, "Chart presentation title");
  if (!["left", "center", "right"].includes(chart.presentation.title.align)) throw new Error("Chart presentation title alignment must be left, center, or right.");
  validateCollection(chart.presentation.collection, schema);
}

function chartHasTemporalBinding(chart, schema) {
  return schema.roles.some((role) => role.accepts.includes("temporal") && chart.roles[role.id] !== null && chart.roles[role.id] !== undefined);
}

function validateInteraction(chart, schema) {
  ensureObject(chart.interaction, "Chart interaction");
  checkKnownKeys(chart.interaction, INTERACTION_KEYS, "chart interaction");
  ensureObject(chart.interaction.zoom, "Chart zoom interaction");
  if (typeof chart.interaction.zoom.enabled !== "boolean") throw new Error("Chart zoom interaction enabled must be boolean.");
  if (chart.interaction.zoom.enabled && !schema.capabilities.zoom) throw new Error(`Chart type "${schema.typeId}" does not support zoom.`);
  const { timeSync } = chart.interaction;
  if (timeSync === null || timeSync === undefined) return;
  if (!schema.capabilities.timeSync) throw new Error(`Chart type "${schema.typeId}" does not support time synchronization.`);
  if (!chartHasTemporalBinding(chart, schema)) throw new Error(`Chart type "${schema.typeId}" needs a temporal role before time synchronization can be enabled.`);
  ensureObject(timeSync, "Chart time synchronization");
  requiredString(timeSync.groupId, "Chart time synchronization groupId");
  if (!TIME_POLICIES.has(timeSync.policy)) throw new Error(`Unsupported time synchronization policy "${timeSync.policy}".`);
}

function validateLayout(chart) {
  ensureObject(chart.layout, "Chart layout");
  if (!LAYOUT_SIZES.has(chart.layout.size)) throw new Error("Chart layout size must be compact, standard, wide, or full.");
  for (const field of ["x", "y", "width", "height"]) {
    if (chart.layout[field] !== undefined && (!Number.isInteger(chart.layout[field]) || chart.layout[field] < 0)) throw new Error(`Chart layout ${field} must be a non-negative integer.`);
  }
}

/** Creates a mutable, independent v3 draft. A draft needs a source and roles before it is valid. */
export function createChartDraft(typeOrOptions, overrides = {}) {
  const options = typeof typeOrOptions === "string" ? { ...overrides, typeId: typeOrOptions } : typeOrOptions;
  ensureObject(options, "Chart draft options");
  const schema = getChartSchema(options.typeId);
  return structuredClone({
    configVersion: CHART_CONFIG_VERSION,
    id: options.id ?? `chart-${schema.typeId}`,
    typeId: schema.typeId,
    title: options.title ?? "",
    description: options.description ?? "",
    sourceId: options.sourceId ?? null,
    roles: options.roles ?? {},
    transformations: {
      filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap", temporalMatch: null,
      ...(options.transformations ?? {}),
    },
    presentation: {
      ...options.presentation,
      title: { align: "left", ...(options.presentation?.title ?? {}) },
      collection: options.presentation?.collection ?? null,
    },
    interaction: {
      ...options.interaction,
      zoom: { enabled: schema.capabilities.zoom, ...(options.interaction?.zoom ?? {}) },
      timeSync: options.interaction?.timeSync ?? null,
    },
    layout: { size: "standard", ...(options.layout ?? {}) },
  });
}

/** Validates one fully configured v3 chart instance without mutating it. */
export function validateChartInstance(chart) {
  ensureObject(chart, "Chart instance");
  if (chart.configVersion !== CHART_CONFIG_VERSION) throw new Error("Chart configuration version 3 is required.");
  requiredString(chart.id, "Chart id");
  requiredString(chart.typeId, "Chart typeId");
  requiredString(chart.title, "Chart title");
  if (typeof chart.description !== "string") throw new Error("Chart description is required and must be a string.");
  requiredString(chart.sourceId, "Chart sourceId");
  const schema = getChartSchema(chart.typeId);
  validateRoles(chart, schema);
  validateTransformations(chart, schema);
  validatePresentation(chart, schema);
  validateInteraction(chart, schema);
  validateLayout(chart);
  return chart;
}
