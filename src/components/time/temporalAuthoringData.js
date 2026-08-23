export function buildTemporalChartVariables(rows = [], timeField, valueFields = [], parseTime = parseEpoch) {
  const observationsByField = new Map(valueFields.map((field) => [field, new Map()]));
  for (const row of rows) {
    const epochMs = parseTime(row?.[timeField]);
    if (!Number.isFinite(epochMs)) continue;
    for (const field of valueFields) {
      const value = row?.[field];
      if (value === null || value === undefined) continue;
      const observations = observationsByField.get(field);
      if (!observations.has(epochMs)) observations.set(epochMs, value);
    }
  }
  return valueFields.map((field) => ({
    id: field,
    label: field,
    observations: [...observationsByField.get(field)]
      .sort(([left], [right]) => left - right)
      .map(([epochMs, value]) => ({ epochMs, value })),
  }));
}

export function describeTemporalInterpolationSupport(variables = []) {
  const unsupportedVariables = variables
    .filter((variable) => {
      const values = (variable?.observations ?? [])
        .map(({ value }) => value)
        .filter((value) => value !== null && value !== undefined);
      return values.length === 0 || values.some((value) => typeof value !== "number" || !Number.isFinite(value));
    })
    .map((variable) => variable?.label ?? variable?.id ?? "Unknown variable");
  const allowed = variables.length > 0 && unsupportedVariables.length === 0;
  return {
    allowed,
    unsupportedVariables,
    reason: unsupportedVariables.length > 0
      ? `${unsupportedVariables.join(", ")} ${unsupportedVariables.length === 1 ? "is" : "are"} categorical or discrete.`
      : null,
  };
}

function parseEpoch(value) {
  if (Number.isFinite(value)) return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}
