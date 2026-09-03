import { chartSchema, role } from "./schemaTypes.js";

const collectionForm = {
  sections: ["data", "appearance", "collection", "interactions", "advanced"],
};
const singleForm = {
  sections: ["data", "appearance", "interactions", "advanced"],
};
const gaugeForm = {
  sections: ["data", "appearance", "targets", "collection", "interactions", "advanced"],
};
const deltaCollectionForm = {
  sections: ["data", "appearance", "targets", "collection", "interactions", "advanced"],
};
const deltaSingleForm = {
  sections: ["data", "appearance", "targets", "interactions", "advanced"],
};
const collectionCapabilities = { timeSync: true, collection: true, zoom: false };
const singleCapabilities = { timeSync: true, collection: false, zoom: false };
const deltaTransforms = ["filter", "aggregate", "duplicates", "missing", "comparison"];
const deltaComparison = () => ({
  defaultMode: "previousObservation",
  modes: ["previousObservation", "fixedTime"],
  matchingPolicies: ["exact", "lastKnown", "nearest", "interpolate"],
});
const time = () => role("time", "Time", ["temporal"], 0);
const identity = () => [
  role("entity", "Entity", ["category", "text"], 0),
  role("label", "Label", ["category", "text"], 0),
];

export const targetSchemas = [
  chartSchema({
    typeId: "kpi",
    label: "KPI card",
    group: "targets",
    description: "Display one key measurement with optional context.",
    sources: ["dataset", "inline"],
    roles: [role("value", "Value", ["number"], 1), role("target", "Target", ["number"], 0), ...identity(), time()],
    form: collectionForm,
    dataFamily: "target",
    renderer: "target",
    capabilities: collectionCapabilities,
    conversions: ["gauge", "deltaCard"],
    manualData: { maxRows: 20 },
    semantics: { purpose: "status", mark: "kpi" },
  }),
  chartSchema({
    typeId: "gauge",
    label: "Gauge",
    group: "targets",
    description: "Show a current value against configured threshold ranges.",
    sources: ["dataset", "inline"],
    roles: [role("value", "Value", ["number"], 1), role("target", "Target", ["number"], 0), ...identity(), time()],
    form: gaugeForm,
    dataFamily: "target",
    renderer: "target",
    capabilities: collectionCapabilities,
    conversions: ["kpi"],
    manualData: { maxRows: 20 },
    semantics: { purpose: "status", mark: "gauge" },
  }),
  chartSchema({
    typeId: "bullet",
    label: "Bullet / target",
    group: "targets",
    description: "Compare actual performance against a target and performance ranges.",
    sources: ["dataset", "inline"],
    roles: [
      role("actual", "Actual", ["number"], 1),
      role("target", "Target", ["number"], 1),
      ...identity(),
      time(),
    ],
    form: collectionForm,
    dataFamily: "target",
    renderer: "target",
    capabilities: collectionCapabilities,
    conversions: ["kpi", "gauge"],
    manualData: { maxRows: 20 },
    semantics: { purpose: "target", mark: "bullet" },
  }),
  chartSchema({
    typeId: "deltaCard",
    label: "Delta card",
    group: "targets",
    description: "Show change between observations for a single measurement.",
    sources: ["dataset", "inline"],
    roles: [
      role("measurement", "Measurement", ["number"], 1),
      role("entity", "Entity", ["category", "text"], 0),
      role("time", "Time", ["temporal"], 1),
      role("target", "Target", ["number"], 0),
    ],
    form: deltaSingleForm,
    dataFamily: "target",
    renderer: "target",
    transforms: deltaTransforms,
    comparison: deltaComparison(),
    capabilities: singleCapabilities,
    conversions: ["deltaList", "kpi"],
    manualData: { maxRows: 20 },
    semantics: { purpose: "change", mark: "delta-card" },
  }),
  chartSchema({
    typeId: "deltaList",
    label: "Delta list",
    group: "targets",
    description: "Compare change across multiple entities.",
    roles: [
      role("measurement", "Measurement", ["number"], 1),
      role("entity", "Entity", ["category", "text"], 1),
      role("time", "Time", ["temporal"], 1),
      role("target", "Target", ["number"], 0),
    ],
    form: deltaCollectionForm,
    dataFamily: "target",
    renderer: "target",
    transforms: deltaTransforms,
    comparison: deltaComparison(),
    capabilities: collectionCapabilities,
    conversions: ["deltaCard"],
    semantics: { purpose: "change", mark: "delta-list" },
  }),
];
