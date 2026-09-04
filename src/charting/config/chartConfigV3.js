import {
  bindingForField,
  canonicalColumnType,
  resolveBindingValue,
  resolveEffectiveBinding,
} from "../data/bindings.js";
import { normalizeCollectionSettings } from "../collection/collectionModel.js";
import { parseTemporalValue } from "../data/temporal.js";
import {
  normalizeSeriesStyle,
} from "../presentation/seriesStyleContract.js";
import { validateCardPresentation } from "../presentation/cardPresentationContract.js";
import { isNormalizedImageCustomColor } from "../presentation/imagePresentation.js";
import { getChartSchema } from "../schemas/chartSchemaRegistry.js";
import {
  CHART_COMPARISON_MATCHING_POLICIES,
  CHART_COMPARISON_MODES,
} from "../schemas/schemaTypes.js";

export const CHART_CONFIG_VERSION = 3;

const CHART_KEYS = new Set(["configVersion", "id", "typeId", "title", "description", "sourceId", "roles", "transformations", "presentation", "interaction", "layout"]);
const TRANSFORMATION_KEYS = new Set(["filters", "grouping", "aggregation", "duplicates", "missingValues", "comparison", "pivot"]);
const REQUIRED_TRANSFORMATION_KEYS = new Set(["filters", "grouping", "duplicates", "missingValues"]);
const PRESENTATION_KEYS = new Set(["title", "collection", "labels", "axes", "targets", "map", "timeline", "table", "image", "background", "legend", "accessibility", "advanced", "series", "description", "citation", "referenceLine", "card"]);
const INTERACTION_KEYS = new Set(["zoom", "timeSync"]);
const LAYOUT_KEYS = new Set(["size", "x", "y", "width", "height"]);
const LAYOUT_SIZES = new Set(["compact", "standard", "wide", "full"]);
const FILTER_OPERATORS = new Set(["in", "notIn", "range", "equals", "notEquals", "contains"]);
const AGGREGATIONS = new Set(["sum", "mean", "average", "min", "max", "count", "first", "last"]);
const ARITHMETIC_DUPLICATES = new Set(["sum", "mean", "average", "min", "max", "count"]);
const DUPLICATE_STRATEGIES = new Set(["error", "first", "last", "aggregate", ...ARITHMETIC_DUPLICATES]);
const MISSING_VALUE_STRATEGIES = new Set(["gap", "zero", "drop"]);
const COLUMN_TYPES = new Set(["number", "text", "category", "temporal", "geographic", "boolean", "url", "any"]);
const TITLE_ALIGNMENTS = new Set(["left", "center", "right"]);
const VALUE_AXIS_TITLE_KEYS = new Set([
  "titleFontSize", "titleBold", "titleOffsetX", "titleOffsetY",
]);
const TARGET_DIRECTIONS = new Set(["increase-is-good", "decrease-is-good", "neutral"]);
const LEGEND_POSITIONS = new Set(["top", "bottom", "left", "right"]);
const COMPARISON_MODES = new Set(CHART_COMPARISON_MODES);
const COMPARISON_MATCHING_POLICIES = new Set(CHART_COMPARISON_MATCHING_POLICIES);
const PIVOT_MODES = new Set(["measuresToRows"]);
const INTERPOLATION_BINDING_ROLES = new Set(["measurements", "measurement", "value", "actual", "target"]);

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
function ownEnumerableDataValue(value, key, description, { required = false } = {}) {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) {
    if (key in value) {
      throw new Error(`${description} property "${key}" must be an own data property.`);
    }
    if (required) {
      throw new Error(`${description} property "${key}" is required.`);
    }
    return { present: false, value: undefined };
  }
  if (!Object.hasOwn(descriptor, "value")) {
    throw new Error(`${description} property "${key}" must be a data property.`);
  }
  if (!descriptor.enumerable) {
    throw new Error(`${description} property "${key}" must be enumerable.`);
  }
  return { present: true, value: descriptor.value };
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
  if (schema.dataFamily === "axis" && role.id === "measurements") {
    allowed.add("axis");
    allowed.add("yAxisIndex");
  }
  if (INTERPOLATION_BINDING_ROLES.has(role.id) && role.accepts.includes("number")) {
    allowed.add("interpolationAllowed");
  }
  checkKnownKeys(binding, allowed, `role "${role.id}" binding`);
  requiredString(binding.field, `Role "${role.id}" field`);
  if (binding.axis !== undefined && !["primary", "secondary"].includes(binding.axis)) throw new Error(`Role "${role.id}" axis must be primary or secondary.`);
  if (binding.yAxisIndex !== undefined && ![0, 1].includes(binding.yAxisIndex)) throw new Error(`Role "${role.id}" yAxisIndex must be 0 or 1.`);
  if (binding.interpolationAllowed !== undefined && typeof binding.interpolationAllowed !== "boolean") {
    throw new Error(`Role "${role.id}" interpolationAllowed must be a boolean.`);
  }
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
  const pivot = Object.hasOwn(chart.transformations, "pivot")
    ? chart.transformations.pivot
    : null;
  if (!Array.isArray(filters)) throw new Error("Chart transformations filters must be an array.");
  if (schema.authoringWorkflow === "static") {
    if (
      filters.length > 0
      || grouping !== null
      || aggregation !== null
      || duplicates !== null
      || missingValues !== "gap"
      || Object.hasOwn(chart.transformations, "comparison")
      || pivot !== null
    ) {
      throw new Error(`Static content type "${schema.typeId}" cannot use chart data transformations.`);
    }
    return;
  }
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
  validatePivot(chart, schema, pivot);
  validateComparison(chart.transformations, schema);
}

function validatePivot(chart, schema, pivot) {
  if (pivot === null || pivot === undefined) return;
  if (!schema.transforms.includes("pivot")) {
    throw new Error(`Chart type "${schema.typeId}" does not support pivot transformations.`);
  }
  const descriptors = strictRecordDescriptors(pivot, "Chart pivot");
  checkKnownDescriptorKeys(descriptors, new Set(["mode"]), "chart pivot");
  const mode = requiredDescriptorValue(descriptors, "mode", "Chart pivot");
  requiredString(mode, "Chart pivot mode");
  if (!PIVOT_MODES.has(mode)) throw new Error(`Unsupported chart pivot mode "${mode}".`);
  const measurementRole = schema.roles.find(({ id }) => id === "measurements");
  const measurements = measurementRole
    ? bindingsFor(chart.roles?.measurements, measurementRole)
    : [];
  if (measurements.length < 2) {
    throw new Error("Pivoting measures into rows requires at least two measurement fields.");
  }
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
  normalizeCollectionSettings(collection);
}

function validatePresentation(chart, schema, temporalRoles) {
  const presentation = ownEnumerableDataValue(
    chart,
    "presentation",
    "Chart instance",
    { required: true },
  ).value;
  const descriptors = strictRecordDescriptors(presentation, "Chart presentation");
  checkKnownDescriptorKeys(descriptors, PRESENTATION_KEYS, "chart presentation");
  const title = requiredDescriptorValue(descriptors, "title", "Chart presentation");
  ensureObject(title, "Chart presentation title");
  const imageTitleKeys = new Set(["fontSize", "bold", "italic", "underline"]);
  if (schema.typeId !== "image" && Object.keys(title).some((key) => imageTitleKeys.has(key))) {
    throw new Error("Image title appearance properties are only supported by Image charts.");
  }
  checkKnownKeys(
    title,
    new Set([
      "align",
      "visible",
      ...(schema.typeId === "image" ? imageTitleKeys : []),
    ]),
    "chart presentation title",
  );
  if (!TITLE_ALIGNMENTS.has(title.align)) throw new Error("Chart presentation title alignment must be left, center, or right.");
  if (title.visible !== undefined && typeof title.visible !== "boolean") throw new Error("Chart presentation title visible must be boolean.");
  if (
    title.fontSize !== undefined
    && (!Number.isInteger(title.fontSize) || title.fontSize < 12 || title.fontSize > 32)
  ) {
    throw new Error("Image title font size must be an integer from 12 through 32.");
  }
  for (const key of ["bold", "italic", "underline"]) {
    if (title[key] !== undefined && typeof title[key] !== "boolean") {
      throw new Error(`Image title ${key} must be boolean.`);
    }
  }
  const collection = ownEnumerableDataValue(
    presentation,
    "collection",
    "Chart presentation",
  ).value;
  validateCollection(collection, schema);
  validateLabels(descriptors.labels?.value);
  validateAxes(descriptors.axes?.value, schema, temporalRoles);
  validateTargets(descriptors.targets?.value, schema);
  validateMap(descriptors.map?.value);
  validateTimeline(descriptors.timeline?.value);
  validateTable(descriptors.table?.value, schema);
  validateImagePresentation(descriptors.image, schema);
  validateBackground(descriptors.background?.value);
  validateLegend(descriptors.legend?.value);
  validateAccessibility(descriptors.accessibility?.value);
  validateDescription(descriptors.description?.value);
  validateCitation(descriptors.citation?.value);
  validateReferenceLine(descriptors.referenceLine?.value, schema);
  validateCardPresentation(descriptors.card?.value, schema.typeId);
  optionalObject(descriptors.advanced?.value, "Chart presentation advanced", new Set());
  if (Object.hasOwn(descriptors, "series")) {
    normalizeSeriesStyle(
      descriptors.series.value,
      schema.form.appearance,
    );
  }
}

function validateTable(table, schema) {
  optionalObject(table, "Chart presentation table", new Set(["rowDistribution"]));
  if (table === undefined || table === null) return;
  if (schema.typeId !== "table") {
    throw new Error(`Chart type "${schema.typeId}" does not support table presentation.`);
  }
  if (
    table.rowDistribution !== undefined
    && !["regular", "fill"].includes(table.rowDistribution)
  ) {
    throw new Error("Chart presentation table row distribution must be regular or fill.");
  }
}

function validateLabels(labels) {
  optionalObject(labels, "Chart presentation labels", new Set(["visible", "position", "format"]));
  if (labels?.visible !== undefined && typeof labels.visible !== "boolean") throw new Error("Chart presentation labels visible must be boolean.");
  for (const field of ["position", "format"]) if (labels?.[field] !== undefined && typeof labels[field] !== "string") throw new Error(`Chart presentation labels ${field} must be a string.`);
}

function validateAxes(axes, schema, temporalRoles) {
  optionalObject(axes, "Chart presentation axes", new Set(["x", "primary", "secondary"]));
  const xKind = axisXKind(schema, temporalRoles);
  const x = axes?.x;
  if (x !== undefined) {
    ensureObject(x, "Chart presentation axes x");
    checkKnownKeys(x, new Set(["title", "min", "max", "labelPreset", "hoverLabelPreset", "tickFrequency", "labelFontSize", "labelWrap", "labelMaxWidth"]), "chart presentation axes x");
    if (x.title !== undefined && typeof x.title !== "string") throw new Error("Chart presentation axes x title must be a string.");
    validateAxisRange(x, xKind, "X");
    validateTickFrequency(x.tickFrequency, xKind, "X");
    if (x.labelPreset !== undefined) {
      if (xKind !== "temporal" || !["adaptive", "ddMmmYearBoundary", "ddMmYyyy", "ddMmYy", "hhMm", "ddMmYyyyHhMm"].includes(x.labelPreset)) {
        throw new Error("Chart presentation axes x labelPreset is unsupported.");
      }
    }
    if (x.hoverLabelPreset !== undefined) {
      if (xKind !== "temporal" || !["auto", "year", "date", "dateTime"].includes(x.hoverLabelPreset)) {
        throw new Error("Chart presentation axes x hoverLabelPreset is unsupported.");
      }
    }
    if (x.labelFontSize !== undefined && (xKind !== "category" || !Number.isInteger(x.labelFontSize) || x.labelFontSize < 8 || x.labelFontSize > 20)) {
      throw new Error("Chart presentation axes x labelFontSize must be an integer from 8 through 20 on category axes.");
    }
    if (x.labelWrap !== undefined && (xKind !== "category" || typeof x.labelWrap !== "boolean")) {
      throw new Error("Chart presentation axes x labelWrap must be boolean on category axes.");
    }
    if (x.labelMaxWidth !== undefined && (xKind !== "category" || !Number.isInteger(x.labelMaxWidth) || x.labelMaxWidth < 40 || x.labelMaxWidth > 240)) {
      throw new Error("Chart presentation axes x labelMaxWidth must be an integer from 40 through 240 on category axes.");
    }
  }
  for (const axisName of ["primary", "secondary"]) {
    const axis = axes?.[axisName];
    if (axis === undefined) continue;
    ensureObject(axis, `Chart presentation axes ${axisName}`);
    checkKnownKeys(axis, new Set(["title", "name", "unit", "min", "max", "grid", "xTitle", "yTitle", "titlePosition", "titleOrientation", "tickFrequency", ...VALUE_AXIS_TITLE_KEYS]), `chart presentation axes ${axisName}`);
    for (const field of ["title", "name", "unit", "xTitle", "yTitle"]) if (axis[field] !== undefined && typeof axis[field] !== "string") throw new Error(`Chart presentation axes ${axisName} ${field} must be a string.`);
    for (const field of ["min", "max"]) if (axis[field] !== undefined && !Number.isFinite(axis[field])) throw new Error(`Chart presentation axes ${axisName} ${field} must be finite.`);
    if (axis.grid !== undefined && typeof axis.grid !== "boolean") throw new Error(`Chart presentation axes ${axisName} grid must be boolean.`);
    if (axis.min !== undefined && axis.max !== undefined && axis.min > axis.max) throw new Error(`Chart presentation axes ${axisName} min cannot exceed max.`);
    if (axis.titlePosition !== undefined && !["top", "center", "bottom"].includes(axis.titlePosition)) throw new Error(`Chart presentation axes ${axisName} titlePosition is unsupported.`);
    if (axis.titleOrientation !== undefined && !["vertical", "horizontal"].includes(axis.titleOrientation)) throw new Error(`Chart presentation axes ${axisName} titleOrientation is unsupported.`);
    if (axis.titleFontSize !== undefined
      && (!Number.isInteger(axis.titleFontSize) || axis.titleFontSize < 10 || axis.titleFontSize > 24)) {
      throw new Error(`Chart presentation axes ${axisName} titleFontSize must be an integer from 10 through 24.`);
    }
    if (axis.titleBold !== undefined && typeof axis.titleBold !== "boolean") {
      throw new Error(`Chart presentation axes ${axisName} titleBold must be a boolean.`);
    }
    for (const key of ["titleOffsetX", "titleOffsetY"]) {
      if (axis[key] !== undefined && (!Number.isFinite(axis[key]) || axis[key] < -96 || axis[key] > 96)) {
        throw new Error(`Chart presentation axes ${axisName} ${key} must be from -96 through 96.`);
      }
    }
    validateTickFrequency(axis.tickFrequency, "number", axisName);
  }
}

function validateImagePresentation(imageDescriptor, schema) {
  if (imageDescriptor === undefined) return;
  if (schema.typeId !== "image") {
    throw new Error(`Chart type "${schema.typeId}" does not support Image presentation.`);
  }
  const image = imageDescriptor.value;
  if (image === undefined || image === null) return;
  ensureObject(image, "Chart presentation image");
  checkKnownKeys(image, new Set(["background"]), "chart presentation image");
  const background = image.background;
  if (background === undefined || background === null) return;
  ensureObject(background, "Chart presentation image background");
  checkKnownKeys(background, new Set(["mode", "color"]), "chart presentation image background");
  if (!["default", "white", "custom"].includes(background.mode)) {
    throw new Error("Image background mode must be default, white, or custom.");
  }
  if (background.color !== undefined && !isNormalizedImageCustomColor(background.color)) {
    throw new Error("Image background color must be an uppercase six-digit hex color.");
  }
  if (background.mode === "custom" && !isNormalizedImageCustomColor(background.color)) {
    throw new Error("Image background Custom mode requires an uppercase six-digit hex color.");
  }
}

function axisXKind(schema, temporalRoles) {
  return temporalRoles?.has("observation") ? "temporal" : "category";
}

function validateAxisRange(axis, kind, label) {
  if (axis.min === undefined && axis.max === undefined) return;
  if (kind === "category") throw new Error(`Chart presentation axes ${label} range is unavailable for category axes.`);
  if (kind === "number") {
    if (![axis.min, axis.max].filter((value) => value !== undefined).every(Number.isFinite)) throw new Error(`Chart presentation axes ${label} min and max must be finite.`);
    if (axis.min !== undefined && axis.max !== undefined && axis.min > axis.max) throw new Error(`Chart presentation axes ${label} min cannot exceed max.`);
    return;
  }
  for (const value of [axis.min, axis.max]) {
    if (value === undefined) continue;
    if (typeof value !== "string" || !validAxisTemporal(value)) throw new Error(`Chart presentation axes ${label} min must be a temporal string.`);
  }
  if (axis.min !== undefined && axis.max !== undefined && axisTemporalEpoch(axis.min) > axisTemporalEpoch(axis.max)) throw new Error(`Chart presentation axes ${label} min cannot exceed max.`);
}

function validAxisTemporal(value) {
  if (parseTemporalValue(value).ok) return true;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    && parseTemporalValue(`${value}:00Z`, { format: "ISO-8601" }).ok;
}

function axisTemporalEpoch(value) {
  const local = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (local) {
    const [year, month, day, hour, minute] = local.slice(1).map(Number);
    return Date.UTC(year, month - 1, day, hour, minute);
  }
  return Date.parse(value);
}

function validateTickFrequency(value, kind, label) {
  if (value === undefined) return;
  ensureObject(value, `Chart presentation axes ${label} tickFrequency`);
  checkKnownKeys(value, new Set(["every", "unit"]), `chart presentation axes ${label} tickFrequency`);
  if (!Number.isInteger(value.every) || value.every < 1) throw new Error(`Chart presentation axes ${label} tickFrequency every must be a positive integer.`);
  if (kind === "temporal") {
    if (!["minute", "hour", "day", "week", "month", "year"].includes(value.unit)) throw new Error(`Chart presentation axes ${label} tickFrequency unit is required for temporal axes.`);
    if (value.unit === "month" && ![1, 2, 3].includes(value.every)) {
      throw new Error(`Chart presentation axes ${label} month tick frequency must be 1, 2, or 3.`);
    }
  } else if (value.unit !== undefined) {
    throw new Error(`Chart presentation axes ${label} tickFrequency unit is only supported for temporal axes.`);
  }
}

function validateTargets(targets, schema) {
  optionalObject(targets, "Chart presentation targets", new Set(["ranges", "direction", "readoutLabel", "showReadoutLabel", "unit"]));
  const hasGaugeReadoutSetting = ["readoutLabel", "showReadoutLabel", "unit"].some((key) => targets?.[key] !== undefined);
  if (hasGaugeReadoutSetting && schema?.typeId !== "gauge") {
    throw new Error("Gauge readout settings are only supported by Gauge charts.");
  }
  if (targets?.direction !== undefined && !TARGET_DIRECTIONS.has(targets.direction)) throw new Error("Chart presentation targets direction must be increase-is-good, decrease-is-good, or neutral.");
  if (targets?.readoutLabel !== undefined && typeof targets.readoutLabel !== "string") throw new Error("Chart presentation targets readoutLabel must be a string.");
  if (targets?.showReadoutLabel !== undefined && typeof targets.showReadoutLabel !== "boolean") throw new Error("Chart presentation targets showReadoutLabel must be boolean.");
  if (targets?.unit !== undefined && typeof targets.unit !== "string") throw new Error("Chart presentation targets unit must be a string.");
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

function validateDescription(description) {
  optionalObject(description, "Chart presentation description", new Set(["visible"]));
  if (
    description?.visible !== undefined
    && typeof description.visible !== "boolean"
  ) {
    throw new Error("Chart presentation description visible must be boolean.");
  }
}

function validateCitation(citation) {
  optionalObject(citation, "Chart presentation citation", new Set(["label"]));
  if (citation?.label !== undefined && typeof citation.label !== "string") {
    throw new Error("Chart presentation citation label must be a string.");
  }
}

function validateReferenceLine(referenceLine, schema) {
  if (referenceLine === undefined) return;
  if (schema.semantics?.mark !== "line") {
    throw new Error(`Chart type "${schema.typeId}" does not support a reference line.`);
  }
  optionalObject(
    referenceLine,
    "Chart presentation reference line",
    new Set(["visible", "value", "label", "color", "lineStyle"]),
  );
  if (referenceLine.visible !== undefined && typeof referenceLine.visible !== "boolean") {
    throw new Error("Chart presentation reference line visible must be boolean.");
  }
  if (referenceLine.visible === true && !Number.isFinite(referenceLine.value)) {
    throw new Error("A visible chart presentation reference line requires a finite value.");
  }
  if (referenceLine.value !== undefined && !Number.isFinite(referenceLine.value)) {
    throw new Error("Chart presentation reference line value must be finite.");
  }
  if (referenceLine.label !== undefined && typeof referenceLine.label !== "string") {
    throw new Error("Chart presentation reference line label must be a string.");
  }
  if (referenceLine.color !== undefined && !/^#[0-9a-f]{6}$/i.test(referenceLine.color)) {
    throw new Error("Chart presentation reference line color must use #RRGGBB format.");
  }
  if (
    referenceLine.lineStyle !== undefined
    && !["solid", "dashed", "dotted"].includes(referenceLine.lineStyle)
  ) {
    throw new Error("Chart presentation reference line style is unsupported.");
  }
}

function validateInteraction(chart, schema, temporalRoles) {
  ensureObject(chart.interaction, "Chart interaction");
  checkKnownKeys(chart.interaction, INTERACTION_KEYS, "chart interaction");
  checkRequiredKeys(chart.interaction, INTERACTION_KEYS, "Chart interaction");
  ensureObject(chart.interaction.zoom, "Chart zoom interaction");
  checkKnownKeys(chart.interaction.zoom, new Set(["enabled", "rangeSelector"]), "chart zoom interaction");
  if (typeof chart.interaction.zoom.enabled !== "boolean") throw new Error("Chart zoom interaction enabled must be boolean.");
  if (
    chart.interaction.zoom.rangeSelector !== undefined
    && typeof chart.interaction.zoom.rangeSelector !== "boolean"
  ) {
    throw new Error("Chart zoom interaction rangeSelector must be boolean.");
  }
  if (chart.interaction.zoom.enabled && !schema.capabilities.zoom) throw new Error(`Chart type "${schema.typeId}" does not support zoom.`);
  const { timeSync } = chart.interaction;
  if (timeSync === null) return;
  if (!schema.capabilities.timeSync || temporalRoles.size === 0) throw new Error(`Chart type "${schema.typeId}" needs an effective temporal role before time synchronization can be enabled.`);
  ensureObject(timeSync, "Chart time synchronization");
  checkKnownKeys(timeSync, new Set(["groupId"]), "chart time synchronization");
  requiredString(timeSync.groupId, "Chart Chrono Group ID");
}

function validateLayout(chart) {
  ensureObject(chart.layout, "Chart layout");
  checkKnownKeys(chart.layout, LAYOUT_KEYS, "chart layout");
  if (!LAYOUT_SIZES.has(chart.layout.size)) throw new Error("Chart layout size must be compact, standard, wide, or full.");
  for (const field of ["x", "y", "width"]) {
    if (
      chart.layout[field] !== undefined
      && (!Number.isInteger(chart.layout[field]) || chart.layout[field] < 0 || (field === "width" && chart.layout[field] === 0))
    ) {
      throw new Error(`Chart layout ${field} must be a valid positive grid value.`);
    }
  }
  if (
    chart.layout.height !== undefined
    && !(
      (Number.isInteger(chart.layout.height) && chart.layout.height > 0)
      || (
        (chart.typeId === "freeText" || chart.typeId === "image")
          ? [0.25, 0.5, 0.75, 1.25, 1.5, 1.75, 2.25, 2.5, 2.75, 3.25, 3.5, 3.75]
          : [0.25, 0.5, 0.75, 1.25, 1.5, 1.75]
      ).includes(chart.layout.height)
    )
  ) {
    throw new Error("Chart layout height must be a whole row or a supported quarter-row percentage.");
  }
}

export function createChartDraft(typeOrOptions, overrides = {}) {
  const options = typeof typeOrOptions === "string" ? { ...overrides, typeId: typeOrOptions } : typeOrOptions;
  ensureObject(options, "Chart draft options");
  const schema = getChartSchema(options.typeId);
  return normalizeChartInstance({
    configVersion: CHART_CONFIG_VERSION,
    id: options.id ?? freshChartId(schema.typeId),
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
      ...(schema.typeId === "gauge"
        ? {
            targets: {
              ranges: [50, 80, 100],
              readoutLabel: "OF TARGET RANGE",
              showReadoutLabel: true,
              ...(options.presentation?.targets ?? {}),
            },
          }
        : {}),
      title: { align: "left", ...(options.presentation?.title ?? {}) },
      collection: options.presentation?.collection ?? null,
    },
    interaction: {
      ...options.interaction,
      zoom: {
        enabled: schema.capabilities.zoom,
        rangeSelector: false,
        ...(options.interaction?.zoom ?? {}),
      },
      timeSync: options.interaction?.timeSync ?? null,
    },
    layout: { size: "standard", ...(options.layout ?? {}) },
  });
}

function freshChartId(typeId) {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error("Secure random chart IDs are unavailable in this environment.");
  }
  return `chart-${typeId}-${globalThis.crypto.randomUUID()}`;
}

/**
 * Returns a detached chart whose non-null collection presentation uses the
 * authoritative, fully materialized version-3 Collection Display shape.
 */
export function normalizeChartInstance(chart) {
  ensureObject(chart, "Chart instance");
  requiredString(chart.typeId, "Chart typeId");
  const schema = getChartSchema(chart.typeId);
  const presentation = ownEnumerableDataValue(
    chart,
    "presentation",
    "Chart instance",
    { required: true },
  ).value;
  strictRecordDescriptors(presentation, "Chart presentation");
  const collectionProperty = ownEnumerableDataValue(
    presentation,
    "collection",
    "Chart presentation",
  );
  const collection = collectionProperty.value;
  const normalizedCollection = collection === null || collection === undefined
    ? collection
    : (() => {
        if (!schema.capabilities.collection) {
          throw new Error(`Chart type "${schema.typeId}" does not support collection presentation.`);
        }
        return normalizeCollectionSettings(collection);
      })();
  const seriesProperty = ownEnumerableDataValue(
    presentation,
    "series",
    "Chart presentation",
  );
  const normalizedSeries = seriesProperty.present
    ? normalizeSeriesStyle(
        seriesProperty.value,
        schema.form.appearance,
      )
    : undefined;
  const normalized = structuredClone(chart);
  normalizeAxisTitles(normalized.presentation?.axes);
  if (collectionProperty.present) {
    normalized.presentation.collection = normalizedCollection;
  }
  if (seriesProperty.present) {
    normalized.presentation.series = normalizedSeries;
  }
  return normalized;
}

function normalizeAxisTitles(axes) {
  if (!axes || typeof axes !== "object" || Array.isArray(axes)) return;
  for (const axisName of ["x", "primary", "secondary"]) {
    const axis = axes[axisName];
    if (!axis || typeof axis !== "object" || Array.isArray(axis) || typeof axis.title !== "string") continue;
    const title = axis.title.trim();
    if (title) axis.title = title;
    else delete axis.title;
    if (Object.keys(axis).length === 0) delete axes[axisName];
  }
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
  if (chart.typeId === "freeText" || chart.typeId === "image") {
    if (typeof chart.title !== "string") throw new Error("Chart title is required and must be a string.");
  } else {
    requiredString(chart.title, "Chart title");
  }
  if (typeof chart.description !== "string") throw new Error("Chart description is required and must be a string.");
  requiredString(chart.sourceId, "Chart sourceId");
  const schema = getChartSchema(chart.typeId);
  const temporalRoles = validateRoles(chart, schema, columnTypes);
  validateTransformations(chart, schema, columnTypes);
  validatePresentation(chart, schema, temporalRoles);
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
