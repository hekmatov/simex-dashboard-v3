import {
  bindingForField,
  canonicalColumnType,
  resolveBindingValue,
  resolveEffectiveBinding,
} from "../data/bindings.js";
import { parseTemporalValue } from "../data/temporal.js";
import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import {
  CHART_COMPARISON_MATCHING_POLICIES,
  CHART_COMPARISON_MODES,
} from "../schemas/schemaTypes.js";

export const CHART_CONFIG_VERSION = 3;

const CHART_KEYS = new Set(["configVersion", "id", "typeId", "title", "description", "sourceId", "roles", "transformations", "presentation", "interaction", "layout"]);
const TRANSFORMATION_KEYS = new Set(["filters", "grouping", "aggregation", "duplicates", "missingValues", "comparison"]);
const REQUIRED_TRANSFORMATION_KEYS = new Set(["filters", "grouping", "duplicates", "missingValues"]);
const PRESENTATION_KEYS = new Set(["title", "collection", "labels", "axes", "targets", "map", "timeline", "background", "legend", "accessibility", "advanced"]);
const INTERACTION_KEYS = new Set(["zoom", "timeSync"]);
const LAYOUT_KEYS = new Set(["size", "x", "y", "width", "height"]);
const LAYOUT_SIZES = new Set(["compact", "standard", "wide", "full"]);
const FILTER_OPERATORS = new Set(["in", "notIn", "range", "equals", "notEquals", "contains"]);
const AGGREGATIONS = new Set(["sum", "mean", "average", "min", "max", "count", "first", "last"]);
const ARITHMETIC_DUPLICATES = new Set(["sum", "mean", "average", "min", "max", "count"]);
const DUPLICATE_STRATEGIES = new Set(["error", "first", "last", "aggregate", ...ARITHMETIC_DUPLICATES]);
const MISSING_VALUE_STRATEGIES = new Set(["gap", "zero", "drop"]);
const COLLECTION_LAYOUTS = new Set(["fixedGrid", "scrollableGrid", "carousel"]);
const COLLECTION_RANKING_MODES = new Set(["fixedOrder", "sort", "priority"]);
const COLLECTION_OVERFLOWS = new Set(["manualPages", "scroll", "autoRotate", "visibleLimit"]);
const COLLECTION_TRANSITIONS = new Set(["fade", "slide"]);
const COLUMN_TYPES = new Set(["number", "text", "category", "temporal", "geographic", "boolean", "url", "any"]);
const TITLE_ALIGNMENTS = new Set(["left", "center", "right"]);
const TARGET_DIRECTIONS = new Set(["increase-is-good", "decrease-is-good", "neutral"]);
const LEGEND_POSITIONS = new Set(["top", "bottom", "left", "right"]);
const COMPARISON_MODES = new Set(CHART_COMPARISON_MODES);
const COMPARISON_MATCHING_POLICIES = new Set(CHART_COMPARISON_MATCHING_POLICIES);

function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function requiredString(value, description) { if (typeof value !== "string" || value.trim() === "") throw new Error(`${description} is required.`); }
function ensureObject(value, description) { if (!isRecord(value)) throw new Error(`${description} must be an object.`); }
function checkKnownKeys(value, keys, description) { for (const key of Object.keys(value)) if (!keys.has(key)) throw new Error(`Unknown ${description} property "${key}".`); }
function checkRequiredKeys(value, keys, description) { for (const key of keys) if (!Object.hasOwn(value, key)) throw new Error(`${description} property "${key}" is required.`); }
function optionalObject(value, description, keys) { if (value === undefined) return; ensureObject(value, description); checkKnownKeys(value, keys, description.toLowerCase()); }
function strictRecordDescriptors(value, description) {
  if (!isRecord(value)) throw new Error(`${description} must be an object.`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`${description} must be a plain object.`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new Error(`${description} cannot contain symbol properties.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!Object.hasOwn(descriptor, "value")) {
      throw new Error(`${description} property "${key}" must be a data property.`);
    }
    if (!descriptor.enumerable) {
      throw new Error(`${description} property "${key}" must be enumerable.`);
    }
  }
  return descriptors;
}
function checkKnownDescriptorKeys(descriptors, keys, description) {
  for (const key of Object.keys(descriptors)) {
    if (!keys.has(key)) throw new Error(`Unknown ${description} property "${key}".`);
  }
}
function requiredDescriptorValue(descriptors, key, description) {
  if (!Object.hasOwn(descriptors, key)) {
    throw new Error(`${description} property "${key}" is required.`);
  }
  return descriptors[key].value;
}

function bindingType(type) {
  return canonicalColumnType(type);
}

function bindingsFor(value, role) {
  if (value === undefined || value === null) return [];
  if (role.max === null) {
    if (!Array.isArray(value)) throw new Error(`Role "${role.id}" must be an array of bindings.`);
    return value;
  }
  if (Array.isArray(value)) throw new Error(`Role "${role.id}" must be a binding object, not an array.`);
  return [value];
}

function columnDetails(columnTypes, field) {
  const value = columnTypes?.get(field);
  if (!value) return null;
  return typeof value === "string" ? { type: value, values: [] } : value;
}

function hasCanonicalTemporalProfileEvidence(temporal) {
  if (!isRecord(temporal) || !Array.isArray(temporal.values) || temporal.values.length === 0) return false;
  if (!Array.isArray(temporal.diagnostics) || temporal.diagnostics.length > 0) return false;
  let hasCanonicalValue = false;
  for (const value of temporal.values) {
    if (value === null) continue;
    if (typeof value !== "string" || value === "") return false;
    const parsed = parseTemporalValue(value);
    if (!parsed.ok || parsed.canonical !== value) return false;
    hasCanonicalValue = true;
  }
  return hasCanonicalValue;
}

function presentValues(sourceColumn) {
  return (sourceColumn.values ?? []).filter((value) => (
    value !== null
    && value !== undefined
    && !(typeof value === "string" && value.trim() === "")
  ));
}

function requireBindingEvidence(binding, role, sourceColumn, effectiveType) {
  const values = presentValues(sourceColumn);
  if (values.length > 0) {
    const valid = values.every((value) => resolveBindingValue(value, binding, sourceColumn).ok);
    if (!valid) {
      throw new Error(`Role "${role.id}" field "${binding.field}" does not validate as ${effectiveType} under its effective parsing rule.`);
    }
    return effectiveType;
  }
  if (effectiveType === "temporal" && !hasCanonicalTemporalProfileEvidence(sourceColumn.temporal)) {
    throw new Error(`Role "${role.id}" field "${binding.field}" does not validate as temporal under its effective parsing rule.`);
  }
  return effectiveType;
}

function effectiveBindingType(binding, role, sourceColumn) {
  if (!sourceColumn) return bindingType(binding.interpretation);
  const effective = resolveEffectiveBinding(binding, sourceColumn).type;
  if (effective === "temporal" || effective === "number" || effective === "boolean") {
    return requireBindingEvidence(binding, role, sourceColumn, effective);
  }
  return effective;
}

function validateBinding(binding, role, schema, columnTypes) {
  ensureObject(binding, `Role "${role.id}" binding`);
  const allowed = new Set(["field", "interpretation", "format", "timezone"]);
  if (schema.dataFamily === "axis" && role.id === "measurements") allowed.add("axis");
  checkKnownKeys(binding, allowed, `role "${role.id}" binding`);
  requiredString(binding.field, `Role "${role.id}" field`);
  if (binding.axis !== undefined && !["primary", "secondary"].includes(binding.axis)) throw new Error(`Role "${role.id}" axis must be primary or secondary.`);
  if (binding.interpretation !== undefined) {
    const normalized = bindingType(binding.interpretation);
    if (typeof binding.interpretation !== "string" || !COLUMN_TYPES.has(normalized)) throw new Error(`Role "${role.id}" interpretation is unsupported.`);
    if (!role.accepts.includes("any") && !role.accepts.includes(normalized)) throw new Error(`Role "${role.id}" interpretation "${binding.interpretation}" does not satisfy its schema.`);
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

function validateFilter(filter, columnTypes, chart) {
  ensureObject(filter, "Chart filter");
  const universal = new Set(["field", "operator"]);
  const accepted = { in: ["values"], notIn: ["values"], range: ["min", "max"], equals: ["value"], notEquals: ["value"], contains: ["value"] };
  for (const key of Object.keys(filter)) if (!universal.has(key) && !accepted[filter.operator]?.includes(key)) throw new Error(`Unknown chart filter property "${key}" for operator "${filter.operator}".`);
  requiredString(filter.field, "Chart filter field");
  if (!FILTER_OPERATORS.has(filter.operator)) throw new Error(`Unsupported chart filter operator "${filter.operator}".`);
  if (["in", "notIn"].includes(filter.operator) && (!Array.isArray(filter.values) || filter.values.length === 0)) throw new Error(`Chart filter ${filter.operator} requires non-empty values.`);
  if (["equals", "notEquals", "contains"].includes(filter.operator) && !Object.hasOwn(filter, "value")) throw new Error(`Chart filter ${filter.operator} requires value.`);
  if (filter.operator === "range" && (!Object.hasOwn(filter, "min") || !Object.hasOwn(filter, "max"))) throw new Error("Chart filter range requires min and max.");
  if (!columnTypes) return;
  const column = columnDetails(columnTypes, filter.field);
  if (!column) throw new Error(`Chart filter field "${filter.field}" does not exist in the declared source.`);
  for (const operand of filterOperands(filter)) {
    const resolved = resolveBindingValue(operand, bindingForField(chart, filter.field), column, {
      allowCanonicalTemporal: true,
    });
    if (!resolved.ok) {
      const valueType = resolved.type === "number" ? "numeric" : resolved.type;
      throw new Error(`Chart filter field "${filter.field}" has an invalid ${valueType} operand.`);
    }
  }
}

function validateTransformations(chart, schema, columnTypes) {
  ensureObject(chart.transformations, "Chart transformations");
  checkKnownKeys(chart.transformations, TRANSFORMATION_KEYS, "chart transformations");
  checkRequiredKeys(chart.transformations, REQUIRED_TRANSFORMATION_KEYS, "Chart transformations");
  const { filters, grouping, duplicates, missingValues } = chart.transformations;
  const aggregation = Object.hasOwn(chart.transformations, "aggregation")
    ? chart.transformations.aggregation
    : null;
  if (!Array.isArray(filters)) throw new Error("Chart transformations filters must be an array.");
  if (filters.length > 0 && !schema.transforms.includes("filter")) throw new Error(`Chart type "${schema.typeId}" does not support filters.`);
  filters.forEach((filter) => validateFilter(filter, columnTypes, chart));
  if (grouping !== null && (!Array.isArray(grouping) || grouping.some((field) => typeof field !== "string" || field.trim() === ""))) throw new Error("Chart transformations grouping must be null or an array of fields.");
  if (grouping?.length && !schema.transforms.includes("group")) throw new Error(`Chart type "${schema.typeId}" does not support grouping.`);
  for (const field of grouping ?? []) {
    if (columnTypes && !columnDetails(columnTypes, field)) throw new Error(`Chart grouping field "${field}" does not exist in the declared source.`);
  }
  if (aggregation !== null && (!AGGREGATIONS.has(aggregation) || !schema.transforms.includes("aggregate"))) throw new Error(`Unsupported aggregation "${aggregation}" for chart type "${schema.typeId}".`);
  if (duplicates !== null && (!DUPLICATE_STRATEGIES.has(duplicates) || !schema.transforms.includes("duplicates"))) throw new Error(`Unsupported duplicate strategy "${duplicates}" for chart type "${schema.typeId}".`);
  if (duplicates === "aggregate" && !ARITHMETIC_DUPLICATES.has(aggregation)) {
    throw new Error("Duplicate strategy aggregate requires an explicit supported arithmetic aggregation.");
  }
  if (
    ARITHMETIC_DUPLICATES.has(duplicates)
    && aggregation
    && canonicalAggregation(duplicates) !== canonicalAggregation(aggregation)
  ) {
    throw new Error(`Conflicting duplicate strategy "${duplicates}" and aggregation "${aggregation}".`);
  }
  if (
    aggregation !== null
    && duplicates !== "aggregate"
    && !ARITHMETIC_DUPLICATES.has(duplicates)
  ) {
    throw new Error(`Duplicate strategy "${duplicates ?? "null"}" does not use aggregation "${aggregation}"; aggregation must be null.`);
  }
  if (!MISSING_VALUE_STRATEGIES.has(missingValues) || !schema.transforms.includes("missing")) throw new Error(`Unsupported missing-value handling "${missingValues}" for chart type "${schema.typeId}".`);
  validateComparison(chart.transformations, schema);
}

function validateComparison(transformations, schema) {
  const supplied = Object.hasOwn(transformations, "comparison");
  if (!schema.comparison) {
    if (supplied) {
      throw new Error(`Chart type "${schema.typeId}" does not support comparison transformations.`);
    }
    return;
  }
  if (!supplied) {
    throw new Error(`Chart type "${schema.typeId}" requires a comparison transformation.`);
  }
  const comparisonProperty = Object.getOwnPropertyDescriptor(
    transformations,
    "comparison",
  );
  if (!comparisonProperty || !Object.hasOwn(comparisonProperty, "value")) {
    throw new Error("Chart transformations comparison must be a data property.");
  }
  const comparison = comparisonProperty.value;
  const comparisonDescriptors = strictRecordDescriptors(
    comparison,
    "Chart comparison",
  );
  const mode = requiredDescriptorValue(
    comparisonDescriptors,
    "mode",
    "Chart comparison",
  );
  requiredString(mode, "Chart comparison mode");
  if (!COMPARISON_MODES.has(mode) || !schema.comparison.modes.includes(mode)) {
    throw new Error(`Unsupported comparison mode "${mode}" for chart type "${schema.typeId}".`);
  }
  if (mode === "previousObservation") {
    checkKnownDescriptorKeys(
      comparisonDescriptors,
      new Set(["mode"]),
      "chart comparison",
    );
    return;
  }

  checkKnownDescriptorKeys(
    comparisonDescriptors,
    new Set(["mode", "at", "matching"]),
    "chart comparison",
  );
  const at = requiredDescriptorValue(
    comparisonDescriptors,
    "at",
    "Chart comparison",
  );
  requiredString(at, "Chart comparison at");
  const parsed = parseTemporalValue(at, { format: "ISO-8601" });
  if (!parsed.ok || parsed.kind !== "instant" || parsed.canonical !== at) {
    throw new Error("Chart comparison at must be a canonical UTC instant.");
  }
  const matching = requiredDescriptorValue(
    comparisonDescriptors,
    "matching",
    "Chart comparison",
  );
  const matchingDescriptors = strictRecordDescriptors(
    matching,
    "Chart comparison matching",
  );
  checkKnownDescriptorKeys(
    matchingDescriptors,
    new Set(["policy", "toleranceMs"]),
    "chart comparison matching",
  );
  const policy = requiredDescriptorValue(
    matchingDescriptors,
    "policy",
    "Chart comparison matching",
  );
  requiredString(policy, "Chart comparison matching policy");
  if (
    !COMPARISON_MATCHING_POLICIES.has(policy)
    || !schema.comparison.matchingPolicies.includes(policy)
  ) {
    throw new Error(`Unknown comparison matching policy "${policy}".`);
  }
  const hasTolerance = Object.hasOwn(matchingDescriptors, "toleranceMs");
  const toleranceMs = matchingDescriptors.toleranceMs?.value;
  if (
    policy === "nearest"
    && (!hasTolerance
      || !Number.isFinite(toleranceMs)
      || toleranceMs < 0)
  ) {
    throw new Error("Nearest comparison matching requires a finite, non-negative toleranceMs.");
  }
  if (policy !== "nearest" && hasTolerance) {
    throw new Error("Only nearest comparison matching accepts toleranceMs.");
  }
}

function validateCollection(collection, schema) {
  if (collection === null || collection === undefined) return;
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
  if (!TITLE_ALIGNMENTS.has(chart.presentation.title.align)) throw new Error("Chart presentation title alignment must be left, center, or right.");
  validateCollection(chart.presentation.collection, schema);
  validateLabels(chart.presentation.labels);
  validateAxes(chart.presentation.axes);
  validateTargets(chart.presentation.targets);
  validateMap(chart.presentation.map);
  validateTimeline(chart.presentation.timeline);
  validateBackground(chart.presentation.background);
  validateLegend(chart.presentation.legend);
  validateAccessibility(chart.presentation.accessibility);
  optionalObject(chart.presentation.advanced, "Chart presentation advanced", new Set());
}

function validateLabels(labels) {
  optionalObject(labels, "Chart presentation labels", new Set(["visible", "position", "format"]));
  if (labels?.visible !== undefined && typeof labels.visible !== "boolean") throw new Error("Chart presentation labels visible must be boolean.");
  for (const field of ["position", "format"]) if (labels?.[field] !== undefined && typeof labels[field] !== "string") throw new Error(`Chart presentation labels ${field} must be a string.`);
}

function validateAxes(axes) {
  optionalObject(axes, "Chart presentation axes", new Set(["primary", "secondary"]));
  for (const axisName of ["primary", "secondary"]) {
    const axis = axes?.[axisName];
    if (axis === undefined) continue;
    ensureObject(axis, `Chart presentation axes ${axisName}`);
    checkKnownKeys(axis, new Set(["title", "name", "min", "max", "grid", "xTitle", "yTitle"]), `chart presentation axes ${axisName}`);
    for (const field of ["title", "name", "xTitle", "yTitle"]) if (axis[field] !== undefined && typeof axis[field] !== "string") throw new Error(`Chart presentation axes ${axisName} ${field} must be a string.`);
    for (const field of ["min", "max"]) if (axis[field] !== undefined && !Number.isFinite(axis[field])) throw new Error(`Chart presentation axes ${axisName} ${field} must be finite.`);
    if (axis.grid !== undefined && typeof axis.grid !== "boolean") throw new Error(`Chart presentation axes ${axisName} grid must be boolean.`);
    if (axis.min !== undefined && axis.max !== undefined && axis.min > axis.max) throw new Error(`Chart presentation axes ${axisName} min cannot exceed max.`);
  }
}

function validateTargets(targets) {
  optionalObject(targets, "Chart presentation targets", new Set(["ranges", "direction"]));
  if (targets?.direction !== undefined && !TARGET_DIRECTIONS.has(targets.direction)) throw new Error("Chart presentation targets direction must be increase-is-good, decrease-is-good, or neutral.");
  if (targets?.ranges === undefined) return;
  if (!Array.isArray(targets.ranges)) throw new Error("Chart presentation targets ranges must be an array.");
  for (const range of targets.ranges) {
    if (typeof range === "number") {
      if (!Number.isFinite(range)) throw new Error("Chart presentation targets range values must be finite.");
      continue;
    }
    ensureObject(range, "Chart presentation targets range");
    checkKnownKeys(range, new Set(["min", "max", "to", "value", "color", "label"]), "chart presentation targets range");
    const end = range.max ?? range.to ?? range.value;
    if (!Number.isFinite(end)) throw new Error("Chart presentation targets range max must be finite.");
    if (range.min !== undefined && (!Number.isFinite(range.min) || range.min > end)) throw new Error("Chart presentation targets range min must be finite and not exceed max.");
    if (range.color !== undefined) requiredString(range.color, "Chart presentation targets range color");
    if (range.label !== undefined && typeof range.label !== "string") throw new Error("Chart presentation targets range label must be a string.");
  }
}

function validateMap(map) {
  optionalObject(map, "Chart presentation map", new Set(["scale", "geoSource", "joinField"]));
  for (const field of ["scale", "geoSource", "joinField"]) if (map?.[field] !== undefined) requiredString(map[field], `Chart presentation map ${field}`);
}

function validateTimeline(timeline) {
  optionalObject(timeline, "Chart presentation timeline", new Set(["lanes", "marker"]));
  if (timeline?.lanes !== undefined && (!Array.isArray(timeline.lanes) || timeline.lanes.some((lane) => typeof lane !== "string" || lane.trim() === ""))) throw new Error("Chart presentation timeline lanes must be an array of non-empty strings.");
  if (timeline?.marker !== undefined) requiredString(timeline.marker, "Chart presentation timeline marker");
}

function validateBackground(background) {
  optionalObject(background, "Chart presentation background", new Set(["color", "transparent"]));
  if (background?.color !== undefined) requiredString(background.color, "Chart presentation background color");
  if (background?.transparent !== undefined && typeof background.transparent !== "boolean") throw new Error("Chart presentation background transparent must be boolean.");
}

function validateLegend(legend) {
  optionalObject(legend, "Chart presentation legend", new Set(["visible", "position"]));
  if (legend?.visible !== undefined && typeof legend.visible !== "boolean") throw new Error("Chart presentation legend visible must be boolean.");
  if (legend?.position !== undefined && !LEGEND_POSITIONS.has(legend.position)) throw new Error("Chart presentation legend position must be top, bottom, left, or right.");
}

function validateAccessibility(accessibility) {
  optionalObject(accessibility, "Chart presentation accessibility", new Set(["description", "summary"]));
  for (const field of ["description", "summary"]) if (accessibility?.[field] !== undefined && typeof accessibility[field] !== "string") throw new Error(`Chart presentation accessibility ${field} must be a string.`);
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
  checkKnownKeys(timeSync, new Set(["groupId"]), "chart time synchronization");
  requiredString(timeSync.groupId, "Chart time synchronization groupId");
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
    configVersion: CHART_CONFIG_VERSION,
    id: options.id ?? `chart-${schema.typeId}`,
    typeId: schema.typeId,
    title: options.title ?? "",
    description: options.description ?? "",
    sourceId: options.sourceId ?? null,
    roles: options.roles ?? {},
    transformations: {
      filters: [],
      grouping: null,
      aggregation: null,
      duplicates: null,
      missingValues: "gap",
      ...(options.transformations ?? {}),
      ...(schema.comparison && options.transformations?.comparison === undefined
        ? { comparison: { mode: schema.comparison.defaultMode } }
        : {}),
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
export function validateChartInstance(chart, { columnTypes } = {}) {
  ensureObject(chart, "Chart instance");
  checkKnownKeys(chart, CHART_KEYS, "chart instance");
  if (!Object.hasOwn(chart, "description")) throw new Error("Chart description is required and must be a string.");
  checkRequiredKeys(chart, CHART_KEYS, "Chart instance");
  if (chart.configVersion !== CHART_CONFIG_VERSION) throw new Error("Chart configuration version 3 is required.");
  requiredString(chart.id, "Chart id");
  requiredString(chart.typeId, "Chart typeId");
  requiredString(chart.title, "Chart title");
  if (typeof chart.description !== "string") throw new Error("Chart description is required and must be a string.");
  requiredString(chart.sourceId, "Chart sourceId");
  const schema = getChartSchema(chart.typeId);
  const temporalRoles = validateRoles(chart, schema, columnTypes);
  validateTransformations(chart, schema, columnTypes);
  validatePresentation(chart, schema);
  validateInteraction(chart, schema, temporalRoles);
  validateLayout(chart);
  return chart;
}

function filterOperands(filter) {
  if (filter.operator === "range") return [filter.min, filter.max];
  if (filter.operator === "in" || filter.operator === "notIn") return filter.values;
  return [filter.value];
}

function canonicalAggregation(value) {
  return value === "average" ? "mean" : value;
}
