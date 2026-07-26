import { CHART_COLUMN_TYPES, CHART_DATA_FAMILIES, CHART_FORM_SECTIONS, CHART_RENDERERS, CHART_SCHEMA_GROUPS, CHART_SCHEMA_VERSION, CHART_SOURCE_KINDS, CHART_TRANSFORMS } from "./schemaTypes.js";

const groupIds = new Set(CHART_SCHEMA_GROUPS.map(({ id }) => id));
function requiredString(value, name) { if (typeof value !== "string" || value.trim() === "") throw new Error(`Chart schema ${name} is required.`); }
function known(value, supported, description) { if (!supported.includes(value)) throw new Error(`Unknown ${description} "${value}".`); }
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
  if (!groupIds.has(schema.group)) throw new Error(`Unknown chart group "${schema.group}".`);
  if (!Array.isArray(schema.sources) || schema.sources.length === 0) throw new Error("Chart schema sources must list at least one source kind.");
  for (const source of schema.sources) known(source, CHART_SOURCE_KINDS, "source kind");
  if (!Array.isArray(schema.roles)) throw new Error("Chart schema roles must be an array.");
  const roleIds = new Set();
  for (const chartRole of schema.roles) { validateRole(chartRole); if (roleIds.has(chartRole.id)) throw new Error(`Duplicate role "${chartRole.id}".`); roleIds.add(chartRole.id); }
  if (!Array.isArray(schema.transforms)) throw new Error("Chart schema transforms must be an array.");
  for (const transform of schema.transforms) known(transform, CHART_TRANSFORMS, "transform");
  if (!schema.form || !Array.isArray(schema.form.sections) || schema.form.sections.length === 0) throw new Error("Chart schema form requires at least one section.");
  for (const section of schema.form.sections) known(section, CHART_FORM_SECTIONS, "form section");
  known(schema.dataFamily, CHART_DATA_FAMILIES, "data family"); known(schema.renderer, Object.keys(CHART_RENDERERS), "renderer");
  if (CHART_RENDERERS[schema.renderer] !== schema.dataFamily) throw new Error(`Renderer "${schema.renderer}" is incompatible with data family "${schema.dataFamily}".`);
  if (!schema.capabilities || typeof schema.capabilities !== "object") throw new Error("Chart schema capabilities are required.");
  for (const capability of ["timeSync", "collection", "zoom"]) if (typeof schema.capabilities[capability] !== "boolean") throw new Error(`Chart schema capability "${capability}" must be boolean.`);
  if (schema.capabilities.collection && !schema.form.sections.includes("collection")) throw new Error("Collection-capable chart schemas require a collection form section.");
  if (schema.capabilities.timeSync && !schema.roles.some(({ accepts }) => accepts.includes("temporal"))) throw new Error("Time-synchronized chart schemas require a role that accepts temporal data.");
  if (!Array.isArray(schema.conversions)) throw new Error("Chart schema conversions must be an array.");
  for (const target of schema.conversions) {
    requiredString(target, "conversion target");
    if (conversionTargetIds && !conversionTargetIds.has(target)) throw new Error(`Unknown conversion target "${target}".`);
    if (target === schema.typeId) throw new Error("Chart schema cannot convert to itself.");
  }
  if (!schema.semantics || typeof schema.semantics !== "object") throw new Error("Chart schema semantics are required.");
  requiredString(schema.semantics.purpose, "semantics purpose"); requiredString(schema.semantics.mark, "semantics mark");
  return schema;
}
