export function applyChartPreparation({
  rows = [],
  mappedFieldIds = [],
  timeField = null,
  preparation = {},
} = {}) {
  const errors = [];
  const warnings = [];
  const sourceRows = Array.isArray(rows) ? structuredClone(rows) : [];
  let effectiveRows = sourceRows.filter((row) => row && typeof row === "object" && !Array.isArray(row));

  for (const filter of preparation.filters ?? []) {
    const predicate = filterPredicate(filter);
    if (!predicate) {
      errors.push(issue(
        "FILTER_INVALID",
        `Filter for "${String(filter?.field)}" is invalid.`,
        "filters",
      ));
      continue;
    }
    effectiveRows = effectiveRows.filter(predicate);
  }

  const missingRule = preparation.missingValues?.rule ?? null;
  if (missingRule === "drop") {
    effectiveRows = effectiveRows.filter((row) => (
      mappedFieldIds.every((fieldId) => row[fieldId] !== null && row[fieldId] !== undefined)
    ));
  } else if (missingRule === "zero") {
    effectiveRows = effectiveRows.map((row) => Object.fromEntries(
      Object.entries(row).map(([key, value]) => (
        mappedFieldIds.includes(key) && (value === null || value === undefined)
          ? [key, 0]
          : [key, value]
      )),
    ));
  }

  if (timeField && preparation.duplicates?.rule && preparation.duplicates.rule !== "keep") {
    effectiveRows = applyDuplicateRule(
      effectiveRows,
      timeField,
      preparation.duplicates.rule,
      errors,
    );
  }

  if (preparation.grouping?.fields?.length > 0 && preparation.aggregation) {
    effectiveRows = aggregateRows(effectiveRows, preparation.grouping.fields, preparation.aggregation, warnings);
  }

  if (effectiveRows.length === 0) {
    const owner = (preparation.filters?.length ?? 0) > 0
      ? "filters"
      : missingRule
        ? "missing-values"
        : preparation.duplicates?.rule
          ? "duplicates"
          : "mapping";
    errors.push(issue(
      "EFFECTIVE_OUTPUT_EMPTY",
      `Preparation produced no renderer-ready output. Repair ${owner}.`,
      owner,
    ));
  }

  return {
    rows: effectiveRows,
    effectiveOutputCount: effectiveRows.length,
    errors,
    warnings,
  };
}

function filterPredicate(filter) {
  if (!filter || typeof filter.field !== "string") return null;
  const { field, operator = "equals", value } = filter;
  return {
    equals: (row) => row[field] === value,
    "not-equals": (row) => row[field] !== value,
    greater: (row) => row[field] > value,
    "greater-or-equal": (row) => row[field] >= value,
    less: (row) => row[field] < value,
    "less-or-equal": (row) => row[field] <= value,
    includes: (row) => String(row[field] ?? "").includes(String(value)),
  }[operator] ?? null;
}

function applyDuplicateRule(rows, timeField, rule, errors) {
  if (rule !== "first" && rule !== "latest") {
    if (rule !== "reject") return rows;
    const duplicate = duplicateValue(rows, timeField);
    if (duplicate !== null) {
      errors.push(issue(
        "DUPLICATE_TIME_REJECTED",
        `Duplicate time value "${String(duplicate)}" remains after preparation.`,
        "duplicates",
      ));
    }
    return rows;
  }
  const byTime = new Map();
  for (const row of rows) {
    const key = row[timeField];
    if (rule === "first" && byTime.has(key)) continue;
    byTime.set(key, row);
  }
  return [...byTime.values()];
}

function duplicateValue(rows, field) {
  const seen = new Set();
  for (const row of rows) {
    if (seen.has(row[field])) return row[field];
    seen.add(row[field]);
  }
  return null;
}

function aggregateRows(rows, groupFields, aggregation, warnings) {
  const field = aggregation.field;
  if (typeof field !== "string" || !["sum", "mean", "min", "max"].includes(aggregation.operation)) {
    warnings.push(issue(
      "AGGREGATION_SKIPPED",
      "The requested aggregation is incomplete and was not applied.",
      "aggregation",
    ));
    return rows;
  }
  const groups = new Map();
  for (const row of rows) {
    const key = JSON.stringify(groupFields.map((groupField) => row[groupField]));
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    const values = group.map((row) => Number(row[field])).filter(Number.isFinite);
    const value = {
      sum: () => values.reduce((total, entry) => total + entry, 0),
      mean: () => values.reduce((total, entry) => total + entry, 0) / values.length,
      min: () => Math.min(...values),
      max: () => Math.max(...values),
    }[aggregation.operation]();
    return {
      ...Object.fromEntries(groupFields.map((groupField) => [groupField, group[0][groupField]])),
      [field]: value,
    };
  });
}

function issue(code, message, owner) {
  return { code, message, owner, stage: "map-and-prepare-data", retryable: true };
}
