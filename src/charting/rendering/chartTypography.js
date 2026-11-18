import { resolveChartFootprint } from "../../components/chartPanelLayout.js";

// Defaults only: authored sizes/cadence retain precedence. Short panels keep
// readable text and reduce density rather than shrinking labels to fit.
export function resolveChartTypography(chart = {}, { footprint, audienceScale, typographyProfile } = {}) {
  if (audienceScale) return Object.freeze({
    tier: audienceScale.tier, title: audienceScale.title,
    label: audienceScale.text, legend: audienceScale.text, value: audienceScale.value,
    maxTicks: 6, maxValueTicks: 5, legendWidth: 240,
  });
  if (typographyProfile === "phone") return Object.freeze({
    tier: "phone", phone: true, title: 16, titleLines: 2, label: 12, legend: 12,
    maxTicks: 5, maxValueTicks: 5, legendWidth: 240,
  });
  const { columns, rows } = footprint ?? resolveChartFootprint(chart.layout);
  const tier = rows < 1 ? "short" : columns === 1 ? "compact" : columns < 4 ? "standard" : rows >= 2 ? "full" : "wide";
  return Object.freeze({
    tier,
    title: tier === "short" ? 14 : tier === "full" ? 18 : 16,
    label: 12,
    legend: tier === "full" ? 13 : 12,
    legendWidth: columns === 1 ? 96 : columns < 4 ? 144 : 240,
    maxTicks: columns === 1 ? 4 : columns < 4 ? 6 : 10,
    maxValueTicks: rows < 1 ? 3 : 6,
  });
}

export function applyChartTypography(option, chart = {}, policy) {
  if (!policy) return option;
  const map = (value, transform) => Array.isArray(value) ? value.map(transform) : transform(value);
  const axis = (value, key) => {
    if (!value || typeof value !== "object") return value;
    const labels = value.axisLabel ?? {};
    const category = value.type === "category";
    const maxTicks = category || value.type === "time" ? policy.maxTicks : policy.maxValueTicks;
    // Numeric/category interval and temporal calendar hints are explicit author
    // contracts. Do not replace them with an automatic density preference.
    const automatic = value.interval === undefined && value.minInterval === undefined && value.maxInterval === undefined;
    const autoLabels = labels.interval === undefined || labels.interval === "auto";
    return {
      ...value,
      axisLabel: {
        ...labels,
        ...(policy.phone ? { margin: 4, hideOverlap: true, showMinLabel: null, showMaxLabel: null } : {}),
        ...(policy.phone && category && key === "yAxis" ? {
          width: Math.min(labels.width ?? 112, 112),
          overflow: "truncate",
        } : {}),
        fontSize: policy.phone ? Math.max(policy.label, labels.fontSize ?? policy.label) : labels.fontSize ?? policy.label,
        ...(category && automatic && autoLabels && value.data?.length > maxTicks ? {
          interval: Math.ceil((value.data.length - 1) / (maxTicks - 1)) - 1,
        } : {}),
      },
      nameTextStyle: { ...value.nameTextStyle, fontSize: policy.phone ? Math.max(policy.label, value.nameTextStyle?.fontSize ?? policy.label) : value.nameTextStyle?.fontSize ?? policy.label },
      ...(!category && automatic && value.splitNumber === undefined ? { splitNumber: maxTicks - 1 } : {}),
    };
  };
  const legend = (value) => value && typeof value === "object" ? {
    ...value,
    ...(policy.phone ? { orient: "horizontal", left: "center", right: null, top: null, bottom: 0 } : {}),
    textStyle: {
      ...value.textStyle,
      fontSize: policy.phone ? Math.max(policy.legend, chart.presentation?.legend?.fontSize ?? policy.legend) : chart.presentation?.legend?.fontSize ?? policy.legend,
      ...(chart.presentation?.legend?.wrap === undefined && value.textStyle?.overflow === undefined
        ? { overflow: "break", width: value.textStyle?.width ?? policy.legendWidth } : {}),
      ...(chart.presentation?.legend?.fontSize === undefined && value.textStyle?.lineHeight === undefined
        ? { lineHeight: Math.ceil(policy.legend * 1.25) } : {}),
    },
  } : value;
  return {
    ...option,
    ...Object.fromEntries(["xAxis", "yAxis", "singleAxis", "parallelAxis", "angleAxis", "radiusAxis"]
      .filter(key => option[key] !== undefined).map(key => [key, map(option[key], value => axis(value, key))])),
    ...(option.legend === undefined ? {} : { legend: map(option.legend, legend) }),
  };
}
