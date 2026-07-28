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
export const CHART_COLUMN_TYPES = Object.freeze(["number", "text", "category", "temporal", "geographic", "boolean", "url", "any"]);
export const CHART_SOURCE_KINDS = Object.freeze(["dataset", "inline"]);
export const CHART_TRANSFORMS = Object.freeze(["filter", "group", "aggregate", "duplicates", "missing", "comparison"]);
export const CHART_COMPARISON_MODES = Object.freeze(["previousObservation", "fixedTime"]);
export const CHART_COMPARISON_MATCHING_POLICIES = Object.freeze(["exact", "lastKnown", "nearest", "interpolate"]);
export const CHART_FORM_SECTION_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "data",
    label: "Data",
    cataloguePresentation: false,
    advanced: false,
  }),
  Object.freeze({
    id: "appearance",
    label: "Appearance",
    cataloguePresentation: true,
    advanced: false,
  }),
  Object.freeze({
    id: "labels",
    label: "Labels",
    cataloguePresentation: true,
    advanced: false,
  }),
  Object.freeze({
    id: "axes",
    label: "Axes",
    cataloguePresentation: true,
    advanced: false,
  }),
  Object.freeze({
    id: "targets",
    label: "Targets",
    cataloguePresentation: true,
    advanced: false,
  }),
  Object.freeze({
    id: "map",
    label: "Map",
    cataloguePresentation: true,
    advanced: false,
  }),
  Object.freeze({
    id: "timeline",
    label: "Timeline",
    cataloguePresentation: true,
    advanced: false,
  }),
  Object.freeze({
    id: "collection",
    label: "Collection",
    cataloguePresentation: true,
    advanced: false,
  }),
  Object.freeze({
    id: "interactions",
    label: "Interactions",
    cataloguePresentation: false,
    advanced: false,
  }),
  Object.freeze({
    id: "advanced",
    label: "Advanced",
    cataloguePresentation: true,
    advanced: true,
  }),
]);
export const CHART_FORM_SECTIONS = Object.freeze(
  CHART_FORM_SECTION_DEFINITIONS.map(({ id }) => id),
);
export const CHART_DATA_FAMILIES = Object.freeze(["axis", "composition", "target", "relationship", "matrix", "timeline", "geography", "operational"]);
export const CHART_RENDERERS = Object.freeze({ axis: "axis", composition: "composition", target: "target", relationship: "relationship", matrix: "matrix", timeline: "timeline", geography: "geography", operational: "operational" });

export function getChartFormSectionDefinition(sectionId) {
  return CHART_FORM_SECTION_DEFINITIONS.find(({ id }) => id === sectionId);
}

export function role(id, label, accepts, min, max = 1) { return { id, label, accepts, min, max }; }
export function chartSchema(definition) {
  const groupable = !["target", "operational"].includes(definition.dataFamily);
  const transforms = ["filter", ...(groupable ? ["group"] : []), "aggregate", "duplicates", "missing"];
  return { version: CHART_SCHEMA_VERSION, sources: ["dataset"], transforms, manualData: null, ...definition };
}
