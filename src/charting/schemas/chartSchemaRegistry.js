import { axisSchemas } from "./axisSchemas.js";
import { compositionSchemas } from "./compositionSchemas.js";
import { geographySchemas } from "./geographySchemas.js";
import { operationalSchemas } from "./operationalSchemas.js";
import { readinessSchemas } from "./readinessSchemas.js";
import { relationshipSchemas } from "./relationshipSchemas.js";
import { CHART_SCHEMA_GROUPS, CHART_SCHEMA_VERSION } from "./schemaTypes.js";
import { targetSchemas } from "./targetSchemas.js";
import { timelineSchemas } from "./timelineSchemas.js";
import { validateChartSchema } from "./validateChartSchema.js";

function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.isFrozen(value) ? value : Object.freeze(value);
}
export function createChartSchemaRegistry(rawSchemas) {
  const schemas = rawSchemas.map(validateChartSchema); const byType = new Map();
  for (const schema of schemas) { if (byType.has(schema.typeId)) throw new Error(`Duplicate chart type "${schema.typeId}".`); byType.set(schema.typeId, schema); }
  const typeIds = new Set(byType.keys());
  for (const schema of schemas) validateChartSchema(schema, { conversionTargetIds: typeIds });
  for (const [typeId, schema] of byType) byType.set(typeId, deepFreeze(schema));
  const listedSchemas = deepFreeze([...byType.values()]);
  const groups = deepFreeze(CHART_SCHEMA_GROUPS.map((group) => ({ ...group, charts: listedSchemas.filter(({ group: id }) => id === group.id) })).filter(({ charts }) => charts.length > 0));
  return deepFreeze({ list: () => listedSchemas, get(typeId) { const schema = byType.get(typeId); if (!schema) throw new Error(`Unknown chart type "${typeId}".`); return schema; }, groups: () => groups });
}
const registry = createChartSchemaRegistry([...axisSchemas, ...compositionSchemas, ...targetSchemas, ...relationshipSchemas, ...readinessSchemas, ...timelineSchemas, ...geographySchemas, ...operationalSchemas]);
export { CHART_SCHEMA_VERSION };
export const listChartSchemas = () => registry.list();
export const getChartSchema = (typeId) => registry.get(typeId);
export const listChartSchemaGroups = () => registry.groups();
