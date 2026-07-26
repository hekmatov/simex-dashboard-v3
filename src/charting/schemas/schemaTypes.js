/** @typedef {"dataset" | "inline"} ChartSourceKind */
/** @typedef {"number" | "text" | "category" | "temporal" | "geographic" | "boolean" | "url" | "any"} ChartColumnType */

export const CHART_SCHEMA_VERSION = 3;
export const CHART_SCHEMA_GROUPS = Object.freeze([
  Object.freeze({ id: "comparison", label: "Comparison" }),
  Object.freeze({ id: "trends", label: "Trends" }),
  Object.freeze({ id: "composition", label: "Composition" }),
  Object.freeze({ id: "targets", label: "Targets and status" }),
  Object.freeze({ id: "relationships", label: "Relationships" }),
  Object.freeze({ id: "readiness", label: "Readiness" }),
  Object.freeze({ id: "timeline", label: "Timeline" }),
  Object.freeze({ id: "geography", label: "Geography" }),
  Object.freeze({ id: "operational", label: "Operational content" }),
]);
export const CHART_TYPE_IDS = Object.freeze([
  "bar", "groupedBar", "stackedBar", "horizontalBar", "horizontalStackedBar", "line", "area", "mixed", "pie", "donut", "kpi", "gauge", "bullet", "deltaCard", "deltaList", "scatter", "bubble", "heatmap", "readinessMatrix", "timeline", "swimlane", "choroplethMap", "chronoChoroplethMap", "mapScatter", "table", "image",
]);
export const CHART_COLUMN_TYPES = Object.freeze(["number", "text", "category", "temporal", "geographic", "boolean", "url", "any"]);
export const CHART_SOURCE_KINDS = Object.freeze(["dataset", "inline"]);
export const CHART_TRANSFORMS = Object.freeze(["filter", "group", "aggregate", "duplicates", "missing", "temporalMatch"]);
export const CHART_FORM_SECTIONS = Object.freeze(["data", "appearance", "labels", "axes", "targets", "map", "timeline", "collection", "interactions", "advanced"]);
export const CHART_DATA_FAMILIES = Object.freeze(["axis", "composition", "target", "relationship", "matrix", "timeline", "geography", "operational"]);
export const CHART_RENDERERS = Object.freeze({ axis: "axis", composition: "composition", target: "target", relationship: "relationship", matrix: "matrix", timeline: "timeline", geography: "geography", operational: "operational" });

export function role(id, label, accepts, min, max = 1) { return { id, label, accepts, min, max }; }
export function chartSchema(definition) {
  return { version: CHART_SCHEMA_VERSION, sources: ["dataset"], transforms: ["filter", "aggregate", "duplicates", "missing"], manualData: null, ...definition };
}
