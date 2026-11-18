import { resolveChartCitation } from "./chartCitation.js";

export function resolveChartSourceEvidence({ chart = {}, sources = {}, datasetProfile } = {}) {
  return {
    citation: resolveChartCitation({ chart, dataSources: sources, datasetProfile }),
    // The accepted provenance contract declares a citation label only. Do not
    // infer confidence from that label, capture dates or profile extents.
    uncertainty: ["image", "freeText"].includes(chart.typeId) ? null : "Not specified",
  };
}
