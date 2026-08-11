import { chartSchema, role } from "./schemaTypes.js";
import {
  seriesAppearanceForMark,
} from "../presentation/seriesStyleContract.js";
const roles = () => [role("category", "Category", ["category", "text"], 1), role("value", "Value", ["number"], 1)];
const form = { sections: ["data", "appearance", "labels", "interactions", "advanced"] }; const capabilities = { timeSync: false, collection: false, zoom: false };
export const compositionSchemas = [
  chartSchema({ typeId: "pie", label: "Pie", group: "composition", description: "Show how categories contribute to a whole.", sources: ["dataset", "inline"], roles: roles(), form: { ...form, appearance: seriesAppearanceForMark("pie") }, dataFamily: "composition", renderer: "composition", capabilities, conversions: ["donut"], manualData: { maxRows: 20 }, semantics: { purpose: "composition", mark: "pie" } }),
  chartSchema({ typeId: "donut", label: "Donut", group: "composition", description: "Show category shares while leaving room for a central summary.", sources: ["dataset", "inline"], roles: roles(), form: { ...form, appearance: seriesAppearanceForMark("donut") }, dataFamily: "composition", renderer: "composition", capabilities, conversions: ["pie"], manualData: { maxRows: 20 }, semantics: { purpose: "composition", mark: "donut" } }),
];
