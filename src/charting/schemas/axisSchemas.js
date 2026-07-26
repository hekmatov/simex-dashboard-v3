import { chartSchema, role } from "./schemaTypes.js";
const form = { sections: ["data", "appearance", "labels", "axes", "interactions", "advanced"] };
const roles = () => [role("measurements", "Measurements", ["number"], 1, null), role("observation", "Observation / X-axis", ["category", "temporal"], 1), role("cluster", "Cluster", ["category", "text"], 0), role("label", "Label", ["text", "category"], 0)];
const capabilities = { timeSync: true, collection: false, zoom: true };
const definition = (typeId, label, group, description, conversions, mark) => chartSchema({ typeId, label, group, description, roles: roles(), form, dataFamily: "axis", renderer: "axis", capabilities, conversions, semantics: { purpose: group === "trends" ? "trend" : "comparison", mark } });
export const axisSchemas = [
  definition("bar", "Bar", "comparison", "Compare values across categories.", ["groupedBar", "stackedBar", "horizontalBar", "line", "area"], "bar"),
  definition("groupedBar", "Grouped bar", "comparison", "Compare series side by side across categories.", ["bar", "stackedBar", "horizontalBar", "horizontalStackedBar"], "grouped-bar"),
  definition("stackedBar", "Stacked bar", "comparison", "Compare totals and their composition across categories.", ["bar", "groupedBar", "horizontalStackedBar"], "stacked-bar"),
  definition("horizontalBar", "Horizontal bar", "comparison", "Compare category values when labels need more room.", ["bar", "groupedBar", "horizontalStackedBar"], "horizontal-bar"),
  definition("horizontalStackedBar", "Horizontal stacked bar", "comparison", "Compare horizontal totals and their composition.", ["stackedBar", "horizontalBar", "groupedBar"], "horizontal-stacked-bar"),
  definition("line", "Line", "trends", "Show how one or more measurements change.", ["bar", "area", "mixed"], "line"),
  definition("area", "Area", "trends", "Show how a measurement changes and accumulates over time.", ["line", "bar", "mixed"], "area"),
  definition("mixed", "Mixed axis", "trends", "Compare measures using bars and lines with primary or secondary axes.", ["line", "area", "bar"], "mixed-axis"),
];
