import { CHART_SCHEMA_VERSION } from "../schemas/chartSchemaRegistry.js";
import { canonicalColumnType } from "../data/bindings.js";

const CONFIGURATION_IDENTITY_KEYS = new Set([
  "title",
  "description",
  "showTitle",
  "showDescription",
  "accessibilityLabel",
]);

export function listChartTypeOptions({
  registry,
  query = "",
  category = "",
  sourceProfile = null,
  selected = null,
  authoringWorkflow = "chart",
} = {}) {
  const schemas = registry?.list?.() ?? [];
  const groupLabels = new Map(
    (registry?.groups?.() ?? []).map(({ id, label }) => [id, label]),
  );
  const search = String(query).trim().toLocaleLowerCase();
  const categoryId = String(category).trim();
  const options = schemas.flatMap((schema) => {
    if (schema.authoringWorkflow !== authoringWorkflow) return [];
    const purpose = schema.semantics?.purpose ?? groupLabels.get(schema.group) ?? schema.group;
    const haystack = `${schema.label} ${purpose} ${schema.description}`.toLocaleLowerCase();
    if (categoryId && schema.group !== categoryId) return [];
    if (search && !haystack.includes(search)) return [];
    const compatibility = profileCompatibility(schema, sourceProfile);
    return [{
      id: schema.typeId,
      label: schema.label,
      category: schema.group,
      purpose,
      description: schema.description,
      schemaRevision: schemaRevision(schema),
      ...compatibility,
    }];
  });

  const selectedId = selected?.chartTypeId;
  if (selectedId && !schemas.some(({ typeId }) => typeId === selectedId)) {
    options.push({
      id: selectedId,
      label: selectedId,
      category: "unavailable",
      purpose: "Unavailable chart type",
      description: "The selected chart type is no longer registered.",
      schemaRevision: selected.schemaRevision ?? null,
      compatibility: "incompatible",
      reason: "This selected chart type was removed or is no longer available. Choose another type to continue.",
    });
  }
  return options;
}

export function applyChartTypeSelection(state, {
  chartTypeId,
  schemaRevision: requestedRevision,
  schema,
  confirmLoss = false,
} = {}) {
  if (!state || typeof state !== "object") {
    throw new TypeError("Chart type selection requires wizard state.");
  }
  if (!schema || schema.typeId !== chartTypeId) {
    throw new Error(`The current schema for chart type "${chartTypeId}" is required.`);
  }

  const allowedRoles = new Set(schema.roles.map(({ id }) => id));
  const allowedConfiguration = new Set([
    ...CONFIGURATION_IDENTITY_KEYS,
    ...(schema.form?.appearance ?? []),
  ]);
  const removedPaths = [];
  const retainedPaths = [];
  const mapping = retainObjectPaths(
    state.mapping,
    allowedRoles,
    "mapping",
    retainedPaths,
    removedPaths,
  );
  const configuration = retainObjectPaths(
    state.configuration,
    allowedConfiguration,
    "configuration",
    retainedPaths,
    removedPaths,
  );

  if (removedPaths.length > 0 && !confirmLoss) {
    return {
      state,
      retainedPaths,
      removedPaths,
      needsAttention: [
        `Confirm the chart type change to remove: ${removedPaths.join(", ")}.`,
      ],
    };
  }

  return {
    state: {
      ...state,
      chartTypeId,
      schemaRevision: requestedRevision ?? schemaRevision(schema),
      mapping,
      configuration,
      renderProofRevision: null,
    },
    retainedPaths,
    removedPaths,
    needsAttention: [],
  };
}

function profileCompatibility(schema, sourceProfile) {
  if (!sourceProfile) {
    return {
      compatibility: "unknown",
      reason: "Choose or profile a data source to check compatibility.",
    };
  }
  const fields = sourceProfile.fields ?? sourceProfile.columns ?? [];
  const fieldTypes = new Set(fields.map(({ type }) => canonicalColumnType(type)));
  const missing = schema.roles.filter(({ min, accepts }) => (
    min > 0
    && !accepts.includes("any")
    && !accepts.some((type) => fieldTypes.has(type))
  ));
  if (missing.length > 0) {
    return {
      compatibility: "incompatible",
      reason: `Required ${missing.map(({ label, accepts }) => `${label} (${accepts.join(" or ")})`).join(", ")} data is not available.`,
    };
  }
  return {
    compatibility: "compatible",
    reason: "The profiled fields satisfy this chart type's required roles.",
  };
}

function retainObjectPaths(value, allowedKeys, prefix, retainedPaths, removedPaths) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value ?? {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, nested]) => {
    const path = `${prefix}.${key}`;
    if (!allowedKeys.has(key)) {
      removedPaths.push(path);
      return [];
    }
    retainedPaths.push(path);
    return [[key, structuredClone(nested)]];
  }));
}

function schemaRevision(schema) {
  return [
    schema.version ?? CHART_SCHEMA_VERSION,
    schema.typeId,
    schema.authoringWorkflow,
    ...(schema.capabilities?.surfaces ?? []),
  ].join(":");
}
