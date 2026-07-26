import { parseTemporalValue } from "./temporal.js";

const DEFAULTS = Object.freeze({
  aggregation: null,
  duplicateStrategy: "error",
  missingStrategy: "gap",
  groupFields: [],
});

export function applyTransforms(rows = [], transformations = []) {
  const safeRows = Array.isArray(rows) ? rows.filter(isRow) : [];
  const transforms = Array.isArray(transformations) ? transformations : [];
  const config = { ...DEFAULTS };
  const diagnostics = [];
  let currentRows = safeRows;
  let filterCount = 0;

  for (const transform of transforms) {
    if (!transform || typeof transform !== "object") continue;
    if (transform.type === "filter") {
      currentRows = currentRows.filter((row) => matchesFilter(row, transform));
      filterCount += 1;
    } else if (transform.type === "aggregate") {
      config.aggregation = transform.method ?? null;
    } else if (transform.type === "duplicates") {
      config.duplicateStrategy = transform.strategy ?? "error";
    } else if (transform.type === "missing") {
      config.missingStrategy = transform.strategy ?? "gap";
    } else if (transform.type === "group") {
      config.groupFields = bindingList(transform.fields).map(bindingField).filter(Boolean);
    }
  }

  return {
    rows: currentRows,
    rowsBeforeFilters: safeRows.length,
    rowsAfterFilters: currentRows.length,
    filterCount,
    config,
    diagnostics,
  };
}

export function applyTimeContext(rows, timeContext, datasetProfile) {
  if (!timeContext?.field) {
    return { rows, rowsAfterTimeContext: rows.length };
  }
  const binding = { field: timeContext.field, type: "temporal" };
  const values = (timeContext.values ?? (timeContext.value === undefined ? [] : [timeContext.value]))
    .map(canonicalContextValue)
    .filter(Boolean);
  const allowed = new Set(values);
  const start = canonicalContextValue(timeContext.start);
  const end = canonicalContextValue(timeContext.end);
  const scopedRows = rows.filter((row) => {
    const value = readRoleValue(row, binding, datasetProfile);
    if (!value) return false;
    if (allowed.size > 0 && !allowed.has(value)) return false;
    if (start && value < start) return false;
    if (end && value > end) return false;
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
      const actualType = canonicalColumnType(column.type);
      if (!role.accepts.includes("any") && !role.accepts.includes(actualType)) {
        diagnostics.push(error(
          "role-field-type",
          `Field "${field}" has type "${actualType}" and cannot fill role "${role.id}".`,
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

export function bindingList(value) {
  if (value === undefined || value === null || value === "") return [];
  return Array.isArray(value) ? value : [value];
}

export function bindingField(binding) {
  return typeof binding === "string" ? binding : binding?.field;
}

export function readRoleValue(row, binding, datasetProfile) {
  if (!binding) return null;
  const field = bindingField(binding);
  const value = row?.[field];
  if (isMissing(value)) return null;
  const column = profileColumn(datasetProfile, field);
  const type = canonicalColumnType(binding?.type ?? column?.type);
  if (type === "number") return numericValue(value);
  if (type === "temporal") {
    const specification = column?.temporal?.parsingMetadata ?? binding?.temporal ?? {};
    const parsed = parseTemporalValue(value, specification);
    return parsed.ok ? parsed.canonical : null;
  }
  return value;
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
  if (duplicateStrategy === "aggregate" && !aggregation) {
    diagnostics.push(error("aggregation-required", "Duplicate aggregation requires an explicit aggregation method."));
    return { marks: [], duplicateGroupCount: duplicateGroups.length, diagnostics };
  }

  const marks = [...groups.values()].map((group) => {
    if (group.length === 1) return group[0];
    if (duplicateStrategy === "first") return group[0];
    if (duplicateStrategy === "last") return group[group.length - 1];
    return mergeCandidate(group, aggregation);
  });
  return { marks, duplicateGroupCount: duplicateGroups.length, diagnostics };
}

export function aggregateNumbers(values, method) {
  const numbers = values.filter((value) => value !== null && value !== undefined).map(Number).filter(Number.isFinite);
  if (numbers.length === 0) return null;
  if (method === "first") return numbers[0];
  if (method === "last") return numbers[numbers.length - 1];
  if (method === "mean" || method === "average") return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  if (method === "min") return Math.min(...numbers);
  if (method === "max") return Math.max(...numbers);
  if (method === "count") return numbers.length;
  return numbers.reduce((sum, value) => sum + value, 0);
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

export function isMissing(value) {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

export function diagnostic(severity, code, message, details = {}) {
  return { severity, code, message, ...details };
}

export const error = (code, message, details) => diagnostic("error", code, message, details);
export const warning = (code, message, details) => diagnostic("warning", code, message, details);

function matchesFilter(row, filter) {
  if (filter.enabled === false || !filter.field) return true;
  const value = row?.[filter.field];
  if (filter.operator === "range") return inRange(value, filter.min, filter.max);
  if (filter.operator === "notIn") return !(filter.values ?? []).some((candidate) => sameValue(value, candidate));
  if (filter.operator === "equals") return sameValue(value, filter.value);
  if (filter.operator === "notEquals") return !sameValue(value, filter.value);
  if (filter.operator === "contains") return String(value ?? "").includes(String(filter.value ?? ""));
  return (filter.values ?? []).some((candidate) => sameValue(value, candidate));
}

function inRange(value, min, max) {
  if (isMissing(value)) return false;
  const numeric = [value, min, max].map(Number);
  if (numeric.every(Number.isFinite)) return numeric[0] >= numeric[1] && numeric[0] <= numeric[2];
  return String(value) >= String(min) && String(value) <= String(max);
}

function profileColumn(profile, field) {
  return profile?.columns?.find(({ name }) => name === field);
}

function canonicalContextValue(value) {
  if (isMissing(value)) return null;
  const parsed = parseTemporalValue(String(value), { interpretation: "temporal" });
  return parsed.ok ? parsed.canonical : String(value);
}

function canonicalColumnType(type) {
  return ({ numeric: "number", number: "number", text: "text" })[type] ?? type;
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

function isRow(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
