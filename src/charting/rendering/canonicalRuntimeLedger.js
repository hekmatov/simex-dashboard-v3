export function projectCanonicalRuntimeLedger({
  chart = {},
  resolution = {},
  timeContext,
} = {}) {
  const series = Array.isArray(resolution.model?.option?.series)
    ? resolution.model.option.series.map((entry, index) => ({
        id: text(entry?.id) ?? text(entry?.name) ?? `series-${index + 1}`,
        name: text(entry?.name) ?? text(entry?.id) ?? `Series ${index + 1}`,
        values: normalizeValues(entry?.data),
      }))
    : [];
  return deepFreeze({
    annotations: canonicalValue(seriesAnnotations(resolution.model?.option?.series)),
    filters: canonicalValue(Array.isArray(chart.transformations?.filters)
      ? chart.transformations.filters
      : []),
    panelId: text(chart.id),
    render: {
      kind: text(resolution.model?.kind),
      resolution: text(resolution.status),
      status: text(resolution.prepared?.status),
      typeId: text(resolution.schema?.typeId) ?? text(chart.typeId),
    },
    series: canonicalValue(series),
    time: {
      activeEpochMs: finite(timeContext?.activeEpochMs),
      frameIndex: integer(timeContext?.frameIndex),
      traceMode: text(timeContext?.traceMode),
    },
  });
}

export function serializeCanonicalRuntimeLedger(input) {
  return JSON.stringify(projectCanonicalRuntimeLedger(input));
}

function normalizeValues(data) {
  if (!Array.isArray(data)) return [];
  return canonicalValue(data.map((item) => {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      if (Object.hasOwn(item, "value")) return item.value;
      return item;
    }
    return item;
  }));
}

function seriesAnnotations(series) {
  if (!Array.isArray(series)) return [];
  return series.flatMap((entry) => (
    Array.isArray(entry?.markLine?.data) ? entry.markLine.data : []
  ));
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .toSorted()
        .map((key) => [key, canonicalValue(value[key])]),
    );
  }
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  return value ?? null;
}

function finite(value) {
  return Number.isFinite(value) ? value : null;
}

function integer(value) {
  return Number.isSafeInteger(value) ? value : null;
}

function text(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
