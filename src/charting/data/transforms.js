import {
  bindingField,
  bindingForField,
  bindingList,
  canonicalColumnType,
  isMissing,
  profileColumn,
  readBoundValue,
  resolveBindingValue,
  resolveEffectiveBinding,
} from "./bindings.js";

const AGGREGATIONS = new Set(["sum", "mean", "average", "min", "max", "count", "first", "last"]);
const ARITHMETIC_DUPLICATES = new Set(["sum", "mean", "average", "min", "max", "count"]);
const DUPLICATE_STRATEGIES = new Set(["error", "first", "last", "aggregate", ...ARITHMETIC_DUPLICATES]);
const MISSING_STRATEGIES = new Set(["gap", "zero", "drop"]);
const FILTER_OPERATORS = new Set(["in", "notIn", "range", "equals", "notEquals", "contains"]);
const DEFAULTS = Object.freeze({
  aggregation: null,
  duplicateStrategy: "error",
  missingStrategy: "gap",
  groupFields: [],
  temporalMatch: null,
});

export function applyTransforms(rows = [], transformations, datasetProfile, chart = null) {
  const safeRows = Array.isArray(rows) ? rows.filter(isRow) : [];
  const diagnostics = [];
  const config = canonicalTransformConfig(transformations, diagnostics);
  const filters = validFilters(config.filters, datasetProfile, chart, diagnostics);
  let currentRows = safeRows;

  if (!diagnostics.some(({ severity }) => severity === "error")) {
    for (const filter of filters) {
      if (filter.enabled === false) continue;
      currentRows = currentRows.filter((row) => matchesFilter(row, filter, datasetProfile, chart));
    }
  }

  return {
    rows: currentRows,
    rowsBeforeFilters: safeRows.length,
    rowsAfterFilters: currentRows.length,
    filterCount: filters.filter(({ enabled }) => enabled !== false).length,
    config,
    diagnostics,
  };
}

export function applyTimeContext(rows, timeContext, datasetProfile) {
  if (!timeContext?.field) {
    return { rows, rowsAfterTimeContext: rows.length };
  }
  const column = profileColumn(datasetProfile, timeContext.field);
  const binding = {
    field: timeContext.field,
    interpretation: "temporal",
    ...(timeContext.format === undefined ? {} : { format: timeContext.format }),
    ...(timeContext.timezone === undefined ? {} : { timezone: timeContext.timezone }),
  };
  const values = (timeContext.values ?? (timeContext.value === undefined ? [] : [timeContext.value]))
    .map((value) => canonicalContextValue(value, binding, column))
    .filter(Boolean);
  const allowed = new Set(values);
  const start = canonicalContextValue(timeContext.start, binding, column);
  const end = canonicalContextValue(timeContext.end, binding, column);
  const scopedRows = rows.filter((row) => {
    const resolved = resolveBindingValue(row?.[timeContext.field], binding, column);
    if (!resolved.ok || !resolved.value) return false;
    if (allowed.size > 0 && !allowed.has(resolved.value)) return false;
    if (start && resolved.value < start) return false;
    if (end && resolved.value > end) return false;
    return true;
  });
  return { rows: scopedRows, rowsAfterTimeContext: scopedRows.length };
}

export function validateRoleBindings(schema, chart, datasetProfile) {
  const diagnostics = [];
  const roles = chart?.roles && typeof chart.roles === "object" ? chart.roles : {};
  const columns = new Map((datasetProfile?.columns ?? []).map((column) => [column.name, column]));
  const knownRoles = new Set(schema.roles.map(({ id }) => id));

  for (const suppliedRole of Object.keys(roles)) {
    if (!knownRoles.has(suppliedRole)) {
      diagnostics.push(error("unknown-role", `Role "${suppliedRole}" is not supported by ${schema.label}.`, { role: suppliedRole }));
    }
  }

  for (const role of schema.roles) {
    const bindings = bindingList(roles[role.id]);
    if (bindings.length < role.min || (role.max !== null && bindings.length > role.max)) {
      diagnostics.push(error(
        "invalid-role-cardinality",
        `Role "${role.id}" requires ${cardinalityText(role)}; received ${bindings.length}.`,
        { role: role.id, count: bindings.length, min: role.min, max: role.max },
      ));
      continue;
    }
    for (const binding of bindings) {
      const field = bindingField(binding);
      const column = columns.get(field);
      if (!field || !column) {
        diagnostics.push(error("role-field-missing", `Field "${field ?? ""}" for role "${role.id}" is not in the dataset.`, { role: role.id, field }));
        continue;
      }
      const actualType = resolveEffectiveBinding(binding, column).type;
      if (!role.accepts.includes("any") && !role.accepts.includes(actualType)) {
        diagnostics.push(error(
          "role-field-type",
          `Field "${field}" has effective type "${actualType}" and cannot fill role "${role.id}".`,
          { role: role.id, field, actualType, acceptedTypes: role.accepts },
        ));
      }
    }
  }
  return diagnostics;
}

export function roleBindings(chart, roleId) {
  return bindingList(chart?.roles?.[roleId]);
}

export function firstRoleBinding(chart, roleId) {
  return roleBindings(chart, roleId)[0] ?? null;
}

export { bindingField, bindingList, isMissing };

export function readRoleValue(row, binding, datasetProfile) {
  return readBoundValue(row, binding, datasetProfile);
}

export function numericValue(value) {
  if (isMissing(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function applyMissingStrategy(value, strategy) {
  if (value !== null && value !== undefined) return { keep: true, value };
  if (strategy === "zero") return { keep: true, value: 0 };
  if (strategy === "drop") return { keep: false, value: null };
  return { keep: true, value: null };
}

export function consolidateCandidates(candidates, keyOf, transformed, mergeCandidate) {
  const groups = new Map();
  for (const candidate of candidates) {
    const key = keyOf(candidate);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(candidate);
  }
  const duplicateGroups = [...groups.values()].filter((group) => group.length > 1);
  if (duplicateGroups.length === 0) {
    return { marks: candidates, duplicateGroupCount: 0, diagnostics: [] };
  }

  const diagnostics = [warning(
    "duplicate-observations",
    `${duplicateGroups.length} role-key collision${duplicateGroups.length === 1 ? " was" : "s were"} found.`,
    { duplicateGroupCount: duplicateGroups.length },
  )];
  const { duplicateStrategy, aggregation } = transformed.config;
  if (duplicateStrategy === "error") {
    diagnostics.push(error("duplicate-resolution-required", "Choose an explicit duplicate resolution strategy before rendering."));
    return { marks: [], duplicateGroupCount: duplicateGroups.length, diagnostics };
  }
  const method = duplicateStrategy === "aggregate"
    ? aggregation
    : ARITHMETIC_DUPLICATES.has(duplicateStrategy)
      ? duplicateStrategy
      : null;
  if (duplicateStrategy === "aggregate" && !method) {
    diagnostics.push(error("aggregation-required", "Duplicate aggregation requires an explicit aggregation method."));
    return { marks: [], duplicateGroupCount: duplicateGroups.length, diagnostics };
  }

  const marks = [...groups.values()].map((group) => {
    if (group.length === 1) return group[0];
    if (duplicateStrategy === "first") return group[0];
    if (duplicateStrategy === "last") return group[group.length - 1];
    return mergeCandidate(group, method);
  });
  return { marks, duplicateGroupCount: duplicateGroups.length, diagnostics };
}

export function aggregateNumbers(values, method) {
  const numbers = values
    .filter((value) => value !== null && value !== undefined)
    .map(Number)
    .filter(Number.isFinite);
  if (numbers.length === 0) return null;
  if (method === "first") return numbers[0];
  if (method === "last") return numbers[numbers.length - 1];
  if (method === "sum") return numbers.reduce((sum, value) => sum + value, 0);
  if (method === "mean" || method === "average") {
    return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  }
  if (method === "min") return Math.min(...numbers);
  if (method === "max") return Math.max(...numbers);
  if (method === "count") return numbers.length;
  throw new Error(`Unsupported aggregation method "${method}".`);
}

export function stableKey(...values) {
  return values.map(stableValue).join("\u001f");
}

export function clusterValueAndKey(row, bindings, datasetProfile) {
  const values = bindings.map((binding) => readRoleValue(row, binding, datasetProfile));
  return {
    cluster: values.length === 0 ? null : values.length === 1 ? values[0] : values,
    clusterKey: values.length === 0 ? "all" : stableKey(...values),
  };
}

export function groupMetadata(row, transformed, datasetProfile) {
  const fields = transformed.config.groupFields;
  if (fields.length === 0) return {};
  const values = fields.map((field) => readRoleValue(row, { field }, datasetProfile));
  return {
    group: values.length === 1 ? values[0] : values,
    groupKey: stableKey(...values),
  };
}

export function diagnostic(severity, code, message, details = {}) {
  return { severity, code, message, ...details };
}

export const error = (code, message, details) => diagnostic("error", code, message, details);
export const warning = (code, message, details) => diagnostic("warning", code, message, details);

function canonicalTransformConfig(transformations, diagnostics) {
  if (Array.isArray(transformations)) {
    diagnostics.push(error(
      "invalid-transformations",
      "Version 3 chart transformations must use the canonical object shape.",
    ));
    return { ...DEFAULTS, filters: [] };
  }
  if (transformations !== undefined && transformations !== null && !isRecord(transformations)) {
    diagnostics.push(error("invalid-transformations", "Chart transformations must be an object."));
    return { ...DEFAULTS, filters: [] };
  }
  const source = transformations ?? {};
  const filters = Array.isArray(source.filters) ? source.filters : [];
  if (source.filters !== undefined && !Array.isArray(source.filters)) {
    diagnostics.push(error("invalid-transform-filters", "Chart transformation filters must be an array."));
  }
  const groupFields = source.grouping === null || source.grouping === undefined
    ? []
    : Array.isArray(source.grouping)
      ? source.grouping.filter((field) => typeof field === "string" && field.trim() !== "")
      : [];
  if (source.grouping !== undefined && source.grouping !== null && !Array.isArray(source.grouping)) {
    diagnostics.push(error("invalid-transform-grouping", "Chart transformation grouping must be null or an array."));
  }
  const aggregation = source.aggregation ?? null;
  const duplicateStrategy = source.duplicates ?? "error";
  const missingStrategy = source.missingValues ?? "gap";
  if (aggregation !== null && !AGGREGATIONS.has(aggregation)) {
    diagnostics.push(error("invalid-aggregation", `Unsupported aggregation "${aggregation}".`));
  }
  if (!DUPLICATE_STRATEGIES.has(duplicateStrategy)) {
    diagnostics.push(error("invalid-duplicate-strategy", `Unsupported duplicate strategy "${duplicateStrategy}".`));
  }
  if (!MISSING_STRATEGIES.has(missingStrategy)) {
    diagnostics.push(error("invalid-missing-strategy", `Unsupported missing-value strategy "${missingStrategy}".`));
  }
  if (duplicateStrategy === "aggregate" && !aggregation) {
    diagnostics.push(error("aggregation-required", "Duplicate strategy aggregate requires an explicit aggregation method."));
  }
  if (
    ARITHMETIC_DUPLICATES.has(duplicateStrategy)
    && aggregation
    && canonicalAggregation(duplicateStrategy) !== canonicalAggregation(aggregation)
  ) {
    diagnostics.push(error(
      "conflicting-duplicate-aggregation",
      `Duplicate strategy "${duplicateStrategy}" conflicts with aggregation "${aggregation}".`,
    ));
  }
  if (source.temporalMatch?.policy && source.temporalMatch.policy !== "exact") {
    diagnostics.push(error(
      "unsupported-temporal-match",
      "Only exact temporal matching is supported in the version 3 core.",
    ));
  }
  return {
    filters,
    groupFields,
    aggregation,
    duplicateStrategy,
    missingStrategy,
    temporalMatch: source.temporalMatch ?? null,
  };
}

function validFilters(filters, datasetProfile, chart, diagnostics) {
  const valid = [];
  for (const filter of filters) {
    if (!isRecord(filter) || typeof filter.field !== "string" || !filter.field.trim()) {
      diagnostics.push(error("invalid-filter", "Each chart filter requires a source field."));
      continue;
    }
    const column = profileColumn(datasetProfile, filter.field);
    if (!column) {
      diagnostics.push(error(
        "filter-field-missing",
        `Filter field "${filter.field}" is not in the dataset.`,
        { field: filter.field },
      ));
      continue;
    }
    if (!FILTER_OPERATORS.has(filter.operator)) {
      diagnostics.push(error(
        "filter-operator-invalid",
        `Filter field "${filter.field}" uses unsupported operator "${filter.operator}".`,
        { field: filter.field },
      ));
      continue;
    }
    const operands = filterOperands(filter);
    let operandFailed = false;
    for (const operand of operands) {
      const resolved = resolveBindingValue(operand, bindingForField(chart, filter.field), column, {
        allowCanonicalTemporal: true,
      });
      if (resolved.ok) continue;
      operandFailed = true;
      const valueType = resolved.type === "number" ? "numeric" : resolved.type;
      diagnostics.push(error(
        "filter-operand-invalid",
        `Filter field "${filter.field}" has an invalid ${valueType} operand.`,
        { field: filter.field, value: operand, valueType, diagnostic: resolved.diagnostic },
      ));
    }
    if (!operandFailed) valid.push(filter);
  }
  return valid;
}

function matchesFilter(row, filter, datasetProfile, chart) {
  const column = profileColumn(datasetProfile, filter.field);
  const binding = bindingForField(chart, filter.field);
  const resolved = resolveBindingValue(row?.[filter.field], binding, column);
  const value = resolved.ok ? resolved.value : null;
  const operand = (candidate) => resolveBindingValue(
    candidate,
    binding,
    column,
    { allowCanonicalTemporal: true },
  ).value;
  if (filter.operator === "range") return inRange(value, operand(filter.min), operand(filter.max));
  if (filter.operator === "notIn") return !filter.values.some((candidate) => sameValue(value, operand(candidate)));
  if (filter.operator === "equals") return sameValue(value, operand(filter.value));
  if (filter.operator === "notEquals") return !sameValue(value, operand(filter.value));
  if (filter.operator === "contains") return String(value ?? "").includes(String(filter.value ?? ""));
  return filter.values.some((candidate) => sameValue(value, operand(candidate)));
}

function filterOperands(filter) {
  if (filter.operator === "range") return [filter.min, filter.max];
  if (filter.operator === "in" || filter.operator === "notIn") return filter.values ?? [];
  return [filter.value];
}

function inRange(value, min, max) {
  if (isMissing(value)) return false;
  const numeric = [value, min, max].map(Number);
  if (numeric.every(Number.isFinite)) return numeric[0] >= numeric[1] && numeric[0] <= numeric[2];
  return String(value) >= String(min) && String(value) <= String(max);
}

function canonicalContextValue(value, binding, column) {
  if (isMissing(value)) return null;
  const resolved = resolveBindingValue(value, binding, column, { allowCanonicalTemporal: true });
  return resolved.ok ? resolved.value : null;
}

function canonicalAggregation(value) {
  return value === "average" ? "mean" : value;
}

function stableValue(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "number") return `number:${Object.is(value, -0) ? "-0" : value}`;
  if (typeof value === "string") return `string:${value}`;
  if (typeof value === "boolean") return `boolean:${value}`;
  return `json:${JSON.stringify(value)}`;
}

function sameValue(left, right) {
  return stableValue(left) === stableValue(right) || String(left ?? "") === String(right ?? "");
}

function cardinalityText(role) {
  if (role.max === null) return `at least ${role.min} binding${role.min === 1 ? "" : "s"}`;
  if (role.min === role.max) return `exactly ${role.min} binding${role.min === 1 ? "" : "s"}`;
  return `${role.min} to ${role.max} bindings`;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isRow(value) {
  return isRecord(value);
}
