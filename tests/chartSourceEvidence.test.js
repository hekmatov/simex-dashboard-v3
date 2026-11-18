import assert from "node:assert/strict";
import test from "node:test";
import { resolveChartSourceEvidence } from "../src/charting/presentation/chartSourceEvidence.js";

test("source evidence preserves authored source profile and identifier citation precedence", () => {
  const chart = { sourceId: "feed", presentation: { citation: { label: " Authored citation " } } };
  const sources = new Map([["feed", { provenance: { label: "Source citation" } }]]);
  const datasetProfile = { provenance: { label: "Profile citation" }, maxDate: "2099-12-31" };
  assert.deepEqual(resolveChartSourceEvidence({ chart, sources, datasetProfile }), {
    citation: "Authored citation", uncertainty: "Not specified",
  });
  delete chart.presentation.citation;
  assert.equal(resolveChartSourceEvidence({ chart, sources, datasetProfile }).citation, "Source citation");
  assert.equal(resolveChartSourceEvidence({ chart, datasetProfile }).citation, "Profile citation");
  assert.equal(resolveChartSourceEvidence({ chart }).citation, "feed");
});

test("partial evidence is honest and never invents uncertainty or observation dates", () => {
  assert.deepEqual(resolveChartSourceEvidence({}), { citation: "Unavailable", uncertainty: "Not specified" });
  assert.deepEqual(resolveChartSourceEvidence({ chart: { sourceId: "known-id" }, sources: { "known-id": { provenance: { capturedAt: "2099-01-01", uncertainty: {} } } }, datasetProfile: { maxDate: "2099-12-31" } }), { citation: "known-id", uncertainty: "Not specified" });
});

test("non-statistical static panels retain source context without a spurious missing-uncertainty warning", () => {
  for (const typeId of ["image", "freeText"]) {
    assert.deepEqual(resolveChartSourceEvidence({ chart: { typeId, sourceId: "authored-asset" } }), { citation: "authored-asset", uncertainty: null });
  }
});
