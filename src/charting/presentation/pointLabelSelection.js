import {
  axisSeriesDescriptors, categoryDescriptors, categoryPresentationKey,
  normalizePresentationOrder, resolveLegendEntries, resolveOrderedKeys, seriesPresentationKey,
} from "./categorySeriesPresentation.js";

export function pointLabelKey(mark) {
  return `point:${JSON.stringify([seriesPresentationKey(mark), mark.categoryKey ?? categoryPresentationKey(mark.x)])}`;
}

export function normalizePointLabelSelection(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Object.getOwnPropertySymbols(value).length) {
    throw new Error("Point label selection must be a plain record.");
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Object.keys(descriptors).length !== 2 || !descriptors.mode || !descriptors.keys
    || Object.values(descriptors).some(entry => !Object.hasOwn(entry, "value") || !entry.enumerable)) {
    throw new Error("Point label selection requires only direct mode and keys properties.");
  }
  const mode = descriptors.mode.value;
  if (!["only", "allExcept"].includes(mode)) throw new Error("Point label selection mode must be only or allExcept.");
  const keys = normalizePresentationOrder(descriptors.keys.value, "Point label selection");
  return mode === "allExcept" && !keys.length ? undefined : { mode, keys };
}

export function pointLabelMatcher(selection) {
  const keys = new Set(selection?.keys ?? []);
  return selection?.mode === "only" ? key => keys.has(key) : key => !keys.has(key);
}

export function pointLabelSelected(selection, key) {
  return pointLabelMatcher(selection)(key);
}

export function setPointLabels(selection, pointKeys, checked) {
  const mode = selection?.mode ?? "allExcept";
  const keys = new Set(selection?.keys ?? []);
  for (const key of pointKeys) {
    if (checked === (mode === "only")) keys.add(key);
    else keys.delete(key);
  }
  return mode === "allExcept" && !keys.size ? undefined : { mode, keys: [...keys] };
}

export function buildPointLabelMatrix({ chart, prepared }) {
  const marks = prepared?.marks ?? [];
  const descriptors = axisSeriesDescriptors(marks);
  const entries = resolveLegendEntries(descriptors, chart.presentation?.legend?.entries).all;
  const labels = new Map();
  entries.forEach(entry => labels.set(entry.label, (labels.get(entry.label) ?? 0) + 1));
  const categories = categoryDescriptors(marks);
  const categoryByKey = new Map(categories.map(entry => [entry.key, entry]));
  const temporal = prepared?.meta?.axisInterpretation === "temporal";
  const sourceKeys = temporal ? [...categories].sort((a, b) => String(a.value).localeCompare(String(b.value))).map(entry => entry.key) : categories.map(entry => entry.key);
  const columnKeys = resolveOrderedKeys(sourceKeys, temporal ? undefined : chart.presentation?.axes?.x?.categoryOrder);
  const columns = columnKeys.map(key => ({ ...categoryByKey.get(key), label: categoryByKey.get(key).defaultLabel || "Unspecified" }));
  const bySeries = new Map(entries.map(entry => [entry.key, entry]));
  const rows = resolveOrderedKeys(entries.map(entry => entry.key), chart.presentation?.series?.order).map(key => {
    const entry = bySeries.get(key);
    const points = new Map(entry.marks.filter(mark => Number.isFinite(mark.value)).map(mark => [mark.categoryKey ?? categoryPresentationKey(mark.x), { key: pointLabelKey(mark), value: mark.value }]));
    return { key, label: labels.get(entry.label) > 1 ? `${entry.label} (${entry.defaultLabel})` : entry.label,
      points: columnKeys.map(columnKey => points.get(columnKey) ?? null) };
  });
  return { columns, rows };
}
