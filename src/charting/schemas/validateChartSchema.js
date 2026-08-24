import {
  hasSeriesRendererMarkContract,
  SERIES_APPEARANCE_FIELD_IDS,
  seriesAppearanceForMark,
  validateSeriesRendererMark,
} from "../presentation/seriesStyleContract.js";
import {
  CHART_AUTHORING_WORKFLOWS,
  CHART_COLUMN_TYPES,
  CHART_COMPARISON_MATCHING_POLICIES,
  CHART_COMPARISON_MODES,
  CHART_DATA_FAMILIES,
  CHART_FORM_SECTIONS,
  CHART_RENDERERS,
  CHART_SCHEMA_GROUPS,
  CHART_SCHEMA_VERSION,
  CHART_SOURCE_KINDS,
  CHART_SURFACES,
  CHART_TRANSFORMS,
} from "./schemaTypes.js";

const groupIds = new Set(CHART_SCHEMA_GROUPS.map(({ id }) => id));
const comparisonKeys = new Set(["defaultMode", "modes", "matchingPolicies"]);
function requiredString(value, name) { if (typeof value !== "string" || value.trim() === "") throw new Error(`Chart schema ${name} is required.`); }
function known(value, supported, description) { if (!supported.includes(value)) throw new Error(`Unknown ${description} "${value}".`); }
function strictRecordDescriptors(value, description) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${description} must be an object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${description} must be a plain object.`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${description} cannot contain symbol properties.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!Object.hasOwn(descriptor, "value")) {
      throw new TypeError(`${description} property "${key}" must be a data property.`);
    }
    if (!descriptor.enumerable) {
      throw new TypeError(`${description} property "${key}" must be enumerable.`);
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
function validateRole(role) {
  if (!role || typeof role !== "object") throw new Error("Chart schema roles must be objects.");
  requiredString(role.id, "role id");
  requiredString(role.label, `role "${role.id}" label`);
  if (!Array.isArray(role.accepts) || role.accepts.length === 0) throw new Error(`Role "${role.id}" must accept at least one column type.`);
  for (const acceptedType of role.accepts) known(acceptedType, CHART_COLUMN_TYPES, "column type");
  if (!Number.isInteger(role.min) || role.min < 0) throw new Error(`Role "${role.id}" min cardinality must be a non-negative integer.`);
  if (role.max !== null && (!Number.isInteger(role.max) || role.max < role.min)) throw new Error(`Role "${role.id}" max cardinality must be null or at least min.`);
}

export function validateChartSchema(schema, { conversionTargetIds } = {}) {
  if (!schema || typeof schema !== "object") throw new Error("Chart schema must be an object.");
  if (schema.version !== CHART_SCHEMA_VERSION) throw new Error(`Chart schema version ${CHART_SCHEMA_VERSION} is required.`);
  requiredString(schema.typeId, "typeId"); requiredString(schema.label, "label"); requiredString(schema.description, "description");
  known(schema.authoringWorkflow, CHART_AUTHORING_WORKFLOWS, "authoring workflow");
  if (!groupIds.has(schema.group)) throw new Error(`Unknown chart group "${schema.group}".`);
  if (!Array.isArray(schema.sources) || schema.sources.length === 0) throw new Error("Chart schema sources must list at least one source kind.");
  for (const source of schema.sources) known(source, CHART_SOURCE_KINDS, "source kind");
  if (!Array.isArray(schema.roles)) throw new Error("Chart schema roles must be an array.");
  const roleIds = new Set();
  for (const chartRole of schema.roles) { validateRole(chartRole); if (roleIds.has(chartRole.id)) throw new Error(`Duplicate role "${chartRole.id}".`); roleIds.add(chartRole.id); }
  if (!Array.isArray(schema.transforms)) throw new Error("Chart schema transforms must be an array.");
  for (const transform of schema.transforms) known(transform, CHART_TRANSFORMS, "transform");
  const comparison = validateComparisonDescriptor(schema);
  const form = validateFormDescriptor(schema);
  known(schema.dataFamily, CHART_DATA_FAMILIES, "data family"); known(schema.renderer, Object.keys(CHART_RENDERERS), "renderer");
  if (CHART_RENDERERS[schema.renderer] !== schema.dataFamily) throw new Error(`Renderer "${schema.renderer}" is incompatible with data family "${schema.dataFamily}".`);
  if (!schema.capabilities || typeof schema.capabilities !== "object") throw new Error("Chart schema capabilities are required.");
  for (const capability of ["timeSync", "collection", "zoom", "sourceCsv", "timeContext"]) if (typeof schema.capabilities[capability] !== "boolean") throw new Error(`Chart schema capability "${capability}" must be boolean.`);
  const surfaces = validateKnownUniqueList(
    schema.capabilities.surfaces,
    CHART_SURFACES,
    "surface",
    "Chart schema capability surfaces",
  );
  if (schema.capabilities.collection && !form.sections.includes("collection")) throw new Error("Collection-capable chart schemas require a collection form section.");
  if (schema.capabilities.timeSync && !schema.roles.some(({ accepts }) => accepts.includes("temporal"))) throw new Error("Time-synchronized chart schemas require a role that accepts temporal data.");
  if (schema.authoringWorkflow === "static") {
    const typedStaticSources = schema.sources.filter((source) => source === "staticText" || source === "staticImage");
    if (typedStaticSources.length !== 1) throw new Error("Static chart schemas require exactly one typed static source kind.");
    if (schema.roles.length > 0 || schema.transforms.length > 0) throw new Error("Static chart schemas cannot declare data roles or transforms.");
    if (schema.capabilities.timeSync || schema.capabilities.timeContext) throw new Error("Static chart schemas cannot receive temporal affordances.");
    if (schema.capabilities.sourceCsv) throw new Error("Static chart schemas cannot expose CSV affordances.");
    if (schema.capabilities.collection) throw new Error("Static chart schemas cannot expose collection affordances.");
    if (schema.manualData !== null) throw new Error("Static chart schemas cannot use manual row authoring.");
  }
  if (!Array.isArray(schema.conversions)) throw new Error("Chart schema conversions must be an array.");
  for (const target of schema.conversions) {
    requiredString(target, "conversion target");
    if (conversionTargetIds && !conversionTargetIds.has(target)) throw new Error(`Unknown conversion target "${target}".`);
    if (target === schema.typeId) throw new Error("Chart schema cannot convert to itself.");
  }
  if (!schema.semantics || typeof schema.semantics !== "object") throw new Error("Chart schema semantics are required.");
  requiredString(schema.semantics.purpose, "semantics purpose"); requiredString(schema.semantics.mark, "semantics mark");
  validateAppearanceForMark(
    form.appearance,
    schema.semantics.mark,
    schema.renderer,
  );
  const validated = { ...schema, form, capabilities: { ...schema.capabilities, surfaces } };
  return comparison === undefined
    ? validated
    : { ...validated, comparison };
}

function validateFormDescriptor(schema) {
  if (!schema.form) {
    throw new Error("Chart schema form requires at least one section.");
  }
  const descriptors = strictRecordDescriptors(schema.form, "Chart schema form");
  checkKnownDescriptorKeys(
    descriptors,
    new Set(["sections", "appearance"]),
    "chart schema form",
  );
  const sections = validateKnownUniqueList(
    requiredDescriptorValue(descriptors, "sections", "Chart schema form"),
    CHART_FORM_SECTIONS,
    "form section",
    "Chart schema form sections",
  );
  const appearance = Object.hasOwn(descriptors, "appearance")
    ? validateKnownUniqueList(
        descriptors.appearance.value,
        SERIES_APPEARANCE_FIELD_IDS,
        "appearance field",
        "Chart schema appearance fields",
        { allowEmpty: true },
      )
    : [];
  if (appearance.length > 0 && !sections.includes("appearance")) {
    throw new Error(
      "Chart schema appearance fields require the appearance form section.",
    );
  }
  return { sections, appearance };
}

function validateAppearanceForMark(appearance, mark, renderer) {
  const supportedFields = seriesAppearanceForMark(mark);
  const hasMarkContract = hasSeriesRendererMarkContract(renderer);
  if (appearance.length > 0 && !hasMarkContract) {
    const label = `${renderer[0].toUpperCase()}${renderer.slice(1)}`;
    throw new Error(`${label} renderer does not support series appearance.`);
  }
  if (hasMarkContract) {
    validateSeriesRendererMark(renderer, mark);
  }
  const supported = new Set(supportedFields);
  for (const fieldId of appearance) {
    if (!supported.has(fieldId)) {
      throw new Error(
        `Chart schema appearance field "${fieldId}" is incompatible with mark "${mark}".`,
      );
    }
  }
}

function validateComparisonDescriptor(schema) {
  const supportsComparison = schema.transforms.includes("comparison");
  const comparisonProperty = Object.getOwnPropertyDescriptor(schema, "comparison");
  if (comparisonProperty && !Object.hasOwn(comparisonProperty, "value")) {
    throw new TypeError("Chart schema comparison must be a data property.");
  }
  const comparison = comparisonProperty?.value;
  if (comparison === undefined) {
    if (supportsComparison) {
      throw new Error("Chart schemas with the comparison transform require a comparison descriptor.");
    }
    return;
  }
  if (!supportsComparison) {
    throw new Error("Chart schema comparison requires the comparison transform.");
  }
  const descriptors = strictRecordDescriptors(comparison, "Chart schema comparison");
  checkKnownDescriptorKeys(descriptors, comparisonKeys, "chart schema comparison");
  const defaultMode = requiredDescriptorValue(
    descriptors,
    "defaultMode",
    "Chart schema comparison",
  );
  requiredString(defaultMode, "comparison defaultMode");
  known(defaultMode, CHART_COMPARISON_MODES, "comparison default mode");
  const modes = validateKnownUniqueList(
    requiredDescriptorValue(descriptors, "modes", "Chart schema comparison"),
    CHART_COMPARISON_MODES,
    "comparison mode",
    "Chart schema comparison modes",
  );
  const matchingPolicies = validateKnownUniqueList(
    requiredDescriptorValue(
      descriptors,
      "matchingPolicies",
      "Chart schema comparison",
    ),
    CHART_COMPARISON_MATCHING_POLICIES,
    "comparison matching policy",
    "Chart schema comparison matchingPolicies",
  );
  if (!modes.includes(defaultMode)) {
    throw new Error("Chart schema comparison defaultMode must be included in modes.");
  }
  const measurement = schema.roles.find(({ id }) => id === "measurement");
  if (
    !measurement
    || measurement.min < 1
    || !measurement.accepts.includes("number")
  ) {
    throw new Error("Chart schema comparison requires a numeric measurement role.");
  }
  if (!schema.roles.some(({ min, accepts }) => min >= 1 && accepts.includes("temporal"))) {
    throw new Error("Chart schema comparison requires a temporal role.");
  }
  return { defaultMode, modes, matchingPolicies };
}

function validateKnownUniqueList(
  value,
  supported,
  description,
  arrayDescription,
  { allowEmpty = false } = {},
) {
  const values = strictArrayValues(value, arrayDescription);
  if (!allowEmpty && values.length === 0) {
    throw new Error(`Chart schema ${description}s must be a non-empty array.`);
  }
  const seen = new Set();
  for (const item of values) {
    known(item, supported, description);
    if (seen.has(item)) throw new Error(`Duplicate ${description} "${item}".`);
    seen.add(item);
  }
  return values;
}

function strictArrayValues(value, description) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${description} must be an ordinary array.`);
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(`${description} cannot contain symbol properties.`);
  }
  const expectedNames = new Set([
    "length",
    ...Array.from({ length: value.length }, (_, index) => String(index)),
  ]);
  for (const name of Object.getOwnPropertyNames(value)) {
    if (!expectedNames.has(name)) {
      throw new TypeError(`${description} contains unknown property "${name}".`);
    }
  }
  const values = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (
      !descriptor
      || !Object.hasOwn(descriptor, "value")
      || !descriptor.enumerable
    ) {
      throw new TypeError(`${description} must contain only direct data entries.`);
    }
    values.push(descriptor.value);
  }
  return values;
}
