export function categoryPresentationKey(value) {
  return `category:${JSON.stringify(value == null ? ["missing"] : [typeof value, value])}`;
}

export function seriesPresentationKey(mark) {
  return `axis:${JSON.stringify([
    mark.measure ?? "", mark.clusterKey ?? mark.cluster ?? "",
    mark.groupKey ?? mark.group ?? "", mark.label ?? "", mark.axis ?? "primary",
  ])}`;
}

export function resolveOrderedKeys(availableKeys, configuredOrder = []) {
  const available = new Set(availableKeys);
  return [...new Set([...configuredOrder.filter(key => available.has(key)), ...availableKeys])];
}

export function resolveLegendEntries(descriptors, settings = {}) {
  const all = descriptors.map(descriptor => ({
    ...descriptor,
    label: settings[descriptor.key]?.label?.trim() || descriptor.defaultLabel,
    visible: settings[descriptor.key]?.visible !== false,
  }));
  return { all, visible: all.filter(entry => entry.visible) };
}

export function captureSeriesColors(descriptors, series = {}) {
  const captured = new Map(Object.entries(series.overrides ?? {}));
  if (series.colors?.length) descriptors.forEach((entry, index) => {
    if (!captured.has(entry.key)) captured.set(entry.key, { color: series.colors[(entry.sourceIndex ?? index) % series.colors.length] });
  });
  return Object.fromEntries(captured);
}

export function axisSeriesDescriptors(marks = []) {
  const groups = new Map();
  for (const mark of marks) {
    const key = seriesPresentationKey(mark);
    if (!groups.has(key)) groups.set(key, {
      key, defaultLabel: [...new Set([mark.measureLabel ?? mark.measure ?? "Value", mark.cluster, mark.group, mark.label]
        .filter(value => value != null && value !== "").map(String))].join(" · "),
      axis: mark.axis ?? "primary", sourceIndex: groups.size, marks: [],
    });
    groups.get(key).marks.push(mark);
  }
  return [...groups.values()];
}

export function categoryDescriptors(marks = []) {
  return [...new Map(marks.map(mark => [mark.categoryKey ?? categoryPresentationKey(mark.x), {
    key: mark.categoryKey ?? categoryPresentationKey(mark.x), defaultLabel: String(mark.x ?? ""), value: mark.x,
  }])).values()];
}

export function relationshipSeriesKey(mark) {
  return `relationship:${JSON.stringify([mark.clusterKey ?? mark.cluster ?? "", mark.groupKey ?? mark.group ?? ""])}`;
}

export function chartLegendDescriptors(renderer, marks = []) {
  if (renderer === "axis") return axisSeriesDescriptors(marks);
  if (renderer === "composition") return [...new Map(marks.map(mark => {
    const key = `composition:${categoryPresentationKey(mark.category)}`;
    return [key, { key, defaultLabel: String(mark.category) }];
  })).values()];
  if (renderer === "relationship") return [...new Map(marks.map(mark => {
    const key = relationshipSeriesKey(mark);
    return [key, { key, defaultLabel: [mark.cluster, mark.group].filter(value => value != null && value !== "").join(" · ") || "Values" }];
  })).values()];
  return [];
}

export function legendProjection(legend, descriptors, settings) {
  if (!settings || Object.keys(settings).length === 0) return legend;
  const entries = resolveLegendEntries(descriptors, settings);
  const labels = new Map(entries.all.map(entry => [entry.key, entry.label]));
  return { ...legend, data: entries.visible.map(entry => entry.key), formatter: key => labels.get(key) ?? key };
}

export function legendTooltipFormatter(descriptors, settings) {
  const labels = new Map(resolveLegendEntries(descriptors, settings).all.map(entry => [entry.key, entry.label]));
  return params => (Array.isArray(params) ? params : [params]).map(param => {
    const seriesLabel = labels.get(param.seriesName);
    const categoryLabel = labels.get(param.name);
    const label = seriesLabel ?? categoryLabel ?? param.seriesName ?? param.name ?? "";
    const groupLabel = seriesLabel === undefined && categoryLabel !== undefined && param.seriesName && param.seriesName !== label ? `${param.seriesName} · ` : "";
    const pointLabel = param.name && !labels.has(param.name) && param.name !== label ? ` · ${param.name}` : "";
    const value = Array.isArray(param.value) ? param.value.join(", ") : param.value ?? "";
    const provenance = param.data?.provenance?.label;
    return `${escapeHtml(groupLabel + label + pointLabel)}: ${escapeHtml(value)}${provenance ? ` · ${escapeHtml(provenance)}` : ""}`;
  }).join("<br/>");
}

export function normalizePresentationOrder(value, description = "Presentation order") {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertySymbols(value).length) throw new Error(`${description} must be an array of keys.`);
  if (Object.getOwnPropertyNames(value).length !== value.length + 1) throw new Error(`${description} must contain only key entries.`);
  const keys = Array.from({ length: value.length }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, "value") || !descriptor.enumerable) throw new Error(`${description} must contain direct key entries.`);
    if (typeof descriptor.value !== "string" || !descriptor.value.trim()) throw new Error(`${description} keys must be nonempty text.`);
    return descriptor.value;
  });
  if (new Set(keys).size !== keys.length) throw new Error(`${description} must contain unique keys.`);
  return keys;
}

export function normalizeKeyedPresentation(value, kind) {
  const entries = inertEntries(value, `${kind} settings`);
  return Object.fromEntries(entries.flatMap(([key, settings]) => {
    if (!key.trim()) throw new Error(`${kind} keys must be nonempty text.`);
    const normalized = {};
    for (const [property, item] of inertEntries(settings, `${kind} entry`)) {
      if (kind === "legend" && property === "label") {
        if (typeof item !== "string") throw new Error("Legend entry label must be text.");
        if (item.trim()) normalized.label = item.trim();
      } else if (kind === "legend" && property === "visible") {
        if (typeof item !== "boolean") throw new Error("Legend entry visible must be boolean.");
        normalized.visible = item;
      } else if (kind === "color" && property === "color") {
        if (typeof item !== "string" || !/^#[0-9a-f]{6}$/i.test(item)) throw new Error("Presentation color must use #RRGGBB.");
        normalized.color = item;
      } else throw new Error(`Unknown ${kind} entry property "${property}".`);
    }
    return Object.keys(normalized).length ? [[key, normalized]] : [];
  }));
}

function inertEntries(value, description) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Object.getOwnPropertySymbols(value).length) throw new Error(`${description} must be a plain record.`);
  return Object.entries(Object.getOwnPropertyDescriptors(value)).map(([key, descriptor]) => {
    if (!Object.hasOwn(descriptor, "value") || !descriptor.enumerable) throw new Error(`${description} must contain direct data properties.`);
    return [key, descriptor.value];
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
