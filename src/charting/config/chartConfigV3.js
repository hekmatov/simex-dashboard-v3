import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import { parseTemporalValue } from "../data/temporal.js";

export const CHART_CONFIG_VERSION = 3;

const CHART_KEYS = new Set(["configVersion", "id", "typeId", "title", "description", "sourceId", "roles", "transformations", "presentation", "interaction", "layout"]);
const TRANSFORMATION_KEYS = new Set(["filters", "grouping", "aggregation", "duplicates", "missingValues", "temporalMatch"]);
const PRESENTATION_KEYS = new Set(["title", "collection", "labels", "axes", "targets", "map", "timeline", "background", "legend", "accessibility", "advanced"]);
const INTERACTION_KEYS = new Set(["zoom", "timeSync"]);
const LAYOUT_KEYS = new Set(["size", "x", "y", "width", "height"]);
const LAYOUT_SIZES = new Set(["compact", "standard", "wide", "full"]);
const FILTER_OPERATORS = new Set(["in", "notIn", "range", "equals", "notEquals", "contains"]);
const AGGREGATIONS = new Set(["sum", "mean", "average", "min", "max", "count", "first", "last"]);
const DUPLICATE_STRATEGIES = new Set(["error", "first", "last", "aggregate", "sum", "mean", "average", "min", "max", "count"]);
const MISSING_VALUE_STRATEGIES = new Set(["gap", "zero", "drop"]);
const TIME_POLICIES = new Set(["exact", "lastKnown", "nearest", "interpolation"]);
const COLLECTION_LAYOUTS = new Set(["fixedGrid", "scrollableGrid", "carousel"]);
const COLLECTION_RANKING_MODES = new Set(["fixedOrder", "sort", "priority"]);
const COLLECTION_OVERFLOWS = new Set(["manualPages", "scroll", "autoRotate", "visibleLimit"]);
const COLLECTION_TRANSITIONS = new Set(["fade", "slide"]);
const COLUMN_TYPES = new Set(["number", "text", "category", "temporal", "geographic", "boolean", "url", "any"]);

function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function requiredString(value, description) { if (typeof value !== "string" || value.trim() === "") throw new Error(`${description} is required.`); }
function ensureObject(value, description) { if (!isRecord(value)) throw new Error(`${description} must be an object.`); }
function checkKnownKeys(value, keys, description) { for (const key of Object.keys(value)) if (!keys.has(key)) throw new Error(`Unknown ${description} property "${key}".`); }
function checkRequiredKeys(value, keys, description) { for (const key of keys) if (!Object.hasOwn(value, key)) throw new Error(`${description} property "${key}" is required.`); }
function optionalObject(value, description, keys) { if (value === undefined) return; ensureObject(value, description); checkKnownKeys(value, keys, description.toLowerCase()); }

function bindingType(type) {
  return type === "numeric" ? "number" : type;
}

function bindingsFor(value, role) {
  if (value === undefined || value === null) return [];
  if (role.max === null) {
    if (!Array.isArray(value)) throw new Error(`Role "${role.id}" must be an array of bindings.`);
    return value;
  }
  if (Array.isArray(value)) {
    if (role.accepts.includes("temporal")) throw new Error(`Temporal role "${role.id}" must be a binding object, not an array.`);
    throw new Error(`Role "${role.id}" must be a binding object, not an array.`);
  }
  return [value];
}

function columnDetails(columnTypes, field) {
  const value = columnTypes?.get(field);
  if (!value) return null;
  return typeof value === "string" ? { type: value, values: [] } : value;
}

function temporalSpecification(binding, sourceColumn) {
  if (binding.format !== undefined) return { interpretation: "temporal", format: binding.format, timezone: binding.timezone };
  return { interpretation: "temporal", ...(sourceColumn.parsingMetadata ?? {}) };
}

function hasTemporalEvidence(binding, sourceColumn) {
  const values = sourceColumn.values.filter((value) => value !== null && value !== undefined && !(typeof value === "string" && value.trim() === ""));
  if (values.length > 0) return values.every((value) => parseTemporalValue(value, temporalSpecification(binding, sourceColumn)).ok);
  const temporal = sourceColumn.temporal;
  return Array.isArray(temporal?.values) && temporal.values.some((value) => value !== null) && Array.isArray(temporal.diagnostics) && temporal.diagnostics.length === 0;
}

function requireTemporalEvidence(binding, role, sourceColumn) {
  if (!hasTemporalEvidence(binding, sourceColumn)) throw new Error(`Role "${role.id}" field "${binding.field}" does not validate as temporal under its effective parsing rule.`);
  return "temporal";
}

function effectiveBindingType(binding, role, sourceColumn) {
  const declared = binding.interpretation === undefined ? null : bindingType(binding.interpretation);
  if (!sourceColumn) return declared;
  const detected = bindingType(sourceColumn.type);
  if (!declared || declared === detected) return detected === "temporal" ? requireTemporalEvidence(binding, role, sourceColumn) : detected;
  if (sourceColumn.authorInterpretation && bindingType(sourceColumn.authorInterpretation) === declared) return declared === "temporal" ? requireTemporalEvidence(binding, role, sourceColumn) : declared;
  if (declared === "temporal" && binding.format) {
    return requireTemporalEvidence(binding, role, sourceColumn);
  }
  throw new Error(`Role "${role.id}" field "${binding.field}" has no effective ${declared} interpretation.`);
}

function validateBinding(binding, role, schema, columnTypes) {
  ensureObject(binding, `Role "${role.id}" binding`);
  const allowed = new Set(["field", "interpretation", "format", "timezone"]);
  if (schema.dataFamily === "axis" && role.id === "measurements") allowed.add("axis");
  checkKnownKeys(binding, allowed, `role "${role.id}" binding`);
  requiredString(binding.field, `Role "${role.id}" field`);
  if (binding.axis !== undefined && !["primary", "secondary"].includes(binding.axis)) throw new Error(`Role "${role.id}" axis must be primary or secondary.`);
  if (binding.interpretation !== undefined) {
    if (typeof binding.interpretation !== "string" || !COLUMN_TYPES.has(bindingType(binding.interpretation))) throw new Error(`Role "${role.id}" interpretation is unsupported.`);
    if (!role.accepts.includes("any") && !role.accepts.includes(bindingType(binding.interpretation))) throw new Error(`Role "${role.id}" interpretation "${binding.interpretation}" does not satisfy its schema.`);
  }
  if ((binding.format !== undefined || binding.timezone !== undefined) && binding.interpretation !== "temporal") throw new Error(`Role "${role.id}" format and timezone require temporal interpretation.`);
  if (binding.format !== undefined) requiredString(binding.format, `Role "${role.id}" format`);
  if (binding.timezone !== undefined) requiredString(binding.timezone, `Role "${role.id}" timezone`);
  if (!columnTypes) return bindingType(binding.interpretation);
  const sourceColumn = columnDetails(columnTypes, binding.field);
  if (!sourceColumn) throw new Error(`Role "${role.id}" field "${binding.field}" does not exist in the declared source.`);
  const normalized = effectiveBindingType(binding, role, sourceColumn);
  if (!role.accepts.includes("any") && !role.accepts.includes(normalized)) throw new Error(`Role "${role.id}" field "${binding.field}" has type "${sourceColumn.type}" and does not satisfy the schema.`);
  return normalized;
}

function validateRoles(chart, schema, columnTypes) {
  ensureObject(chart.roles, "Chart roles");
  const byId = new Map(schema.roles.map((role) => [role.id, role]));
  for (const roleId of Object.keys(chart.roles)) if (!byId.has(roleId)) throw new Error(`Unknown role "${roleId}" for chart type "${schema.typeId}".`);
  const temporalRoles = new Set();
  for (const role of schema.roles) {
    const bindings = bindingsFor(chart.roles[role.id], role);
    if (bindings.length < role.min) throw new Error(`Role "${role.id}" requires at least ${role.min} binding${role.min === 1 ? "" : "s"}.`);
    if (role.max !== null && bindings.length > role.max) throw new Error(`Role "${role.id}" accepts at most ${role.max} binding${role.max === 1 ? "" : "s"}.`);
    const effectiveTypes = bindings.map((binding) => validateBinding(binding, role, schema, columnTypes));
    if (effectiveTypes.includes("temporal")) temporalRoles.add(role.id);
  }
  return temporalRoles;
}

function validateFilter(filter) {
  ensureObject(filter, "Chart filter");
  const universal = new Set(["field", "operator"]);
  const accepted = { in: ["values"], notIn: ["values"], range: ["min", "max"], equals: ["value"], notEquals: ["value"], contains: ["value"] };
  for (const key of Object.keys(filter)) if (!universal.has(key) && !accepted[filter.operator]?.includes(key)) throw new Error(`Unknown chart filter property "${key}" for operator "${filter.operator}".`);
  requiredString(filter.field, "Chart filter field");
  if (!FILTER_OPERATORS.has(filter.operator)) throw new Error(`Unsupported chart filter operator "${filter.operator}".`);
  if (["in", "notIn"].includes(filter.operator) && (!Array.isArray(filter.values) || filter.values.length === 0)) throw new Error(`Chart filter ${filter.operator} requires non-empty values.`);
  if (["equals", "notEquals", "contains"].includes(filter.operator) && !Object.hasOwn(filter, "value")) throw new Error(`Chart filter ${filter.operator} requires value.`);
  if (filter.operator === "range" && (!Object.hasOwn(filter, "min") || !Object.hasOwn(filter, "max"))) throw new Error("Chart filter range requires min and max.");
}

function validateTransformations(chart, schema) {
  ensureObject(chart.transformations, "Chart transformations");
  checkKnownKeys(chart.transformations, TRANSFORMATION_KEYS, "chart transformations");
  checkRequiredKeys(chart.transformations, TRANSFORMATION_KEYS, "Chart transformations");
  const { filters, grouping, aggregation, duplicates, missingValues, temporalMatch } = chart.transformations;
  if (!Array.isArray(filters)) throw new Error("Chart transformations filters must be an array.");
  if (filters.length > 0 && !schema.transforms.includes("filter")) throw new Error(`Chart type "${schema.typeId}" does not support filters.`);
  filters.forEach(validateFilter);
  if (grouping !== null && (!Array.isArray(grouping) || grouping.some((field) => typeof field !== "string" || field.trim() === ""))) throw new Error("Chart transformations grouping must be null or an array of fields.");
  if (grouping?.length && !schema.transforms.includes("group")) throw new Error(`Chart type "${schema.typeId}" does not support grouping.`);
  if (aggregation !== null && (!AGGREGATIONS.has(aggregation) || !schema.transforms.includes("aggregate"))) throw new Error(`Unsupported aggregation "${aggregation}" for chart type "${schema.typeId}".`);
  if (duplicates !== null && (!DUPLICATE_STRATEGIES.has(duplicates) || !schema.transforms.includes("duplicates"))) throw new Error(`Unsupported duplicate strategy "${duplicates}" for chart type "${schema.typeId}".`);
  if (!MISSING_VALUE_STRATEGIES.has(missingValues) || !schema.transforms.includes("missing")) throw new Error(`Unsupported missing-value handling "${missingValues}" for chart type "${schema.typeId}".`);
  if (temporalMatch !== null) {
    ensureObject(temporalMatch, "Chart temporal match");
    checkKnownKeys(temporalMatch, new Set(["policy", "tolerance"]), "chart temporal match");
    requiredString(temporalMatch.policy, "Chart temporal match policy");
    if (!schema.capabilities.timeSync || !TIME_POLICIES.has(temporalMatch.policy)) throw new Error(`Unsupported temporal matching policy "${temporalMatch.policy}".`);
    if (temporalMatch.tolerance !== undefined && (!Number.isFinite(temporalMatch.tolerance) || temporalMatch.tolerance <= 0)) throw new Error("Chart temporal match tolerance must be positive.");
  }
}

function validateCollection(collection, schema) {
  if (collection === null) return;
  if (!schema.capabilities.collection) throw new Error(`Chart type "${schema.typeId}" does not support collection presentation.`);
  ensureObject(collection, "Chart collection presentation");
  const keys = new Set(["layout", "rows", "columns", "itemSpacing", "sortField", "sortDirection", "rankingMode", "overflow", "pageSize", "rotationInterval", "loop", "pauseOnHover", "transition", "lockPositionsDuringPlayback", "accessibleItemLabel"]);
  checkKnownKeys(collection, keys, "chart collection presentation");
  if (!COLLECTION_LAYOUTS.has(collection.layout)) throw new Error(`Unsupported collection layout "${collection.layout}".`);
  for (const dimension of ["rows", "columns"]) if (!Number.isInteger(collection[dimension]) || collection[dimension] < 1 || collection[dimension] > 4) throw new Error(`Chart collection ${dimension} must be between 1 and 4.`);
  if (collection.itemSpacing !== undefined && (!Number.isFinite(collection.itemSpacing) || collection.itemSpacing < 0 || collection.itemSpacing > 64)) throw new Error("Chart collection itemSpacing must be between 0 and 64.");
  if (collection.sortField !== undefined) requiredString(collection.sortField, "Chart collection sortField");
  if (collection.sortDirection !== undefined && !["asc", "desc"].includes(collection.sortDirection)) throw new Error("Chart collection sortDirection must be asc or desc.");
  if (collection.rankingMode !== undefined && !COLLECTION_RANKING_MODES.has(collection.rankingMode)) throw new Error("Chart collection rankingMode is unsupported.");
  if (collection.overflow !== undefined && !COLLECTION_OVERFLOWS.has(collection.overflow)) throw new Error("Chart collection overflow is unsupported.");
  if (collection.pageSize !== undefined && (!Number.isInteger(collection.pageSize) || collection.pageSize < 1 || collection.pageSize > collection.rows * collection.columns)) throw new Error("Chart collection pageSize must be a positive integer within the grid capacity.");
  for (const key of ["loop", "pauseOnHover", "lockPositionsDuringPlayback"]) if (collection[key] !== undefined && typeof collection[key] !== "boolean") throw new Error(`Chart collection ${key} must be boolean.`);
  if (collection.rotationInterval !== undefined && (!Number.isInteger(collection.rotationInterval) || collection.rotationInterval < 5000)) throw new Error("Chart collection rotationInterval must be an integer of at least 5000 ms.");
  if (collection.transition !== undefined && !COLLECTION_TRANSITIONS.has(collection.transition)) throw new Error("Chart collection transition must be fade or slide.");
  if (collection.accessibleItemLabel !== undefined) requiredString(collection.accessibleItemLabel, "Chart collection accessibleItemLabel");
}

function validatePresentation(chart, schema) {
  ensureObject(chart.presentation, "Chart presentation");
  checkKnownKeys(chart.presentation, PRESENTATION_KEYS, "chart presentation");
  ensureObject(chart.presentation.title, "Chart presentation title");
  checkKnownKeys(chart.presentation.title, new Set(["align"]), "chart presentation title");
  if (!["left", "center", "right"].includes(chart.presentation.title.align)) throw new Error("Chart presentation title alignment must be left, center, or right.");
  validateCollection(chart.presentation.collection, schema);
  optionalObject(chart.presentation.labels, "Chart presentation labels", new Set(["visible", "position", "format"]));
  if (chart.presentation.labels?.visible !== undefined && typeof chart.presentation.labels.visible !== "boolean") throw new Error("Chart presentation labels visible must be boolean.");
  if (chart.presentation.labels?.position !== undefined && typeof chart.presentation.labels.position !== "string") throw new Error("Chart presentation labels position must be a string.");
  if (chart.presentation.labels?.format !== undefined && typeof chart.presentation.labels.format !== "string") throw new Error("Chart presentation labels format must be a string.");
  optionalObject(chart.presentation.axes, "Chart presentation axes", new Set(["primary", "secondary"]));
  optionalObject(chart.presentation.targets, "Chart presentation targets", new Set(["ranges", "direction"]));
  optionalObject(chart.presentation.map, "Chart presentation map", new Set(["scale", "geoSource", "joinField"]));
  optionalObject(chart.presentation.timeline, "Chart presentation timeline", new Set(["lanes", "marker"]));
  optionalObject(chart.presentation.background, "Chart presentation background", new Set(["color", "transparent"]));
  optionalObject(chart.presentation.legend, "Chart presentation legend", new Set(["visible", "position"]));
  optionalObject(chart.presentation.accessibility, "Chart presentation accessibility", new Set(["description", "summary"]));
  optionalObject(chart.presentation.advanced, "Chart presentation advanced", new Set());
}

function validateInteraction(chart, schema, temporalRoles) {
  ensureObject(chart.interaction, "Chart interaction");
  checkKnownKeys(chart.interaction, INTERACTION_KEYS, "chart interaction");
  checkRequiredKeys(chart.interaction, INTERACTION_KEYS, "Chart interaction");
  ensureObject(chart.interaction.zoom, "Chart zoom interaction");
  checkKnownKeys(chart.interaction.zoom, new Set(["enabled"]), "chart zoom interaction");
  if (typeof chart.interaction.zoom.enabled !== "boolean") throw new Error("Chart zoom interaction enabled must be boolean.");
  if (chart.interaction.zoom.enabled && !schema.capabilities.zoom) throw new Error(`Chart type "${schema.typeId}" does not support zoom.`);
  const { timeSync } = chart.interaction;
  if (timeSync === null) return;
  if (!schema.capabilities.timeSync || temporalRoles.size === 0) throw new Error(`Chart type "${schema.typeId}" needs an effective temporal role before time synchronization can be enabled.`);
  ensureObject(timeSync, "Chart time synchronization");
  checkKnownKeys(timeSync, new Set(["groupId", "policy", "tolerance"]), "chart time synchronization");
  requiredString(timeSync.groupId, "Chart time synchronization groupId");
  if (!TIME_POLICIES.has(timeSync.policy)) throw new Error(`Unsupported time synchronization policy "${timeSync.policy}".`);
  if (timeSync.tolerance !== undefined && (!Number.isFinite(timeSync.tolerance) || timeSync.tolerance <= 0)) throw new Error("Chart time synchronization tolerance must be positive.");
}

function validateLayout(chart) {
  ensureObject(chart.layout, "Chart layout");
  checkKnownKeys(chart.layout, LAYOUT_KEYS, "chart layout");
  if (!LAYOUT_SIZES.has(chart.layout.size)) throw new Error("Chart layout size must be compact, standard, wide, or full.");
  for (const field of ["x", "y", "width", "height"]) if (chart.layout[field] !== undefined && (!Number.isInteger(chart.layout[field]) || chart.layout[field] < 0 || (["width", "height"].includes(field) && chart.layout[field] === 0))) throw new Error(`Chart layout ${field} must be a valid positive grid value.`);
}

export function createChartDraft(typeOrOptions, overrides = {}) {
  const options = typeof typeOrOptions === "string" ? { ...overrides, typeId: typeOrOptions } : typeOrOptions;
  ensureObject(options, "Chart draft options");
  const schema = getChartSchema(options.typeId);
  return structuredClone({
    configVersion: CHART_CONFIG_VERSION, id: options.id ?? `chart-${schema.typeId}`, typeId: schema.typeId, title: options.title ?? "", description: options.description ?? "", sourceId: options.sourceId ?? null, roles: options.roles ?? {},
    transformations: { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap", temporalMatch: null, ...(options.transformations ?? {}) },
    presentation: { ...options.presentation, title: { align: "left", ...(options.presentation?.title ?? {}) }, collection: options.presentation?.collection ?? null },
    interaction: { ...options.interaction, zoom: { enabled: schema.capabilities.zoom, ...(options.interaction?.zoom ?? {}) }, timeSync: options.interaction?.timeSync ?? null },
    layout: { size: "standard", ...(options.layout ?? {}) },
  });
}

/** Validates one fully configured v3 chart instance without mutating it. */
export function validateChartInstance(chart, { columnTypes } = {}) {
  ensureObject(chart, "Chart instance");
  checkKnownKeys(chart, CHART_KEYS, "chart instance");
  if (!Object.hasOwn(chart, "description")) throw new Error("Chart description is required and must be a string.");
  checkRequiredKeys(chart, CHART_KEYS, "Chart instance");
  if (chart.configVersion !== CHART_CONFIG_VERSION) throw new Error("Chart configuration version 3 is required.");
  requiredString(chart.id, "Chart id"); requiredString(chart.typeId, "Chart typeId"); requiredString(chart.title, "Chart title");
  if (typeof chart.description !== "string") throw new Error("Chart description is required and must be a string.");
  requiredString(chart.sourceId, "Chart sourceId");
  const schema = getChartSchema(chart.typeId);
  const temporalRoles = validateRoles(chart, schema, columnTypes);
  validateTransformations(chart, schema);
  validatePresentation(chart, schema);
  validateInteraction(chart, schema, temporalRoles);
  validateLayout(chart);
  return chart;
}
