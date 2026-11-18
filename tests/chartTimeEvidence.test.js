import test from "node:test";
import assert from "node:assert/strict";
import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { resolveChartRendering } from "../src/charting/rendering/resolveChartRendering.js";
import { buildRenderModel } from "../src/charting/rendering/buildRenderModel.js";
import { resolveChartTimeEvidence } from "../src/charting/time/chartTimeEvidence.js";
import { prepareChartData } from "../src/charting/data/prepareChartData.js";
import { compileChartRuntimeArtifact } from "../src/charting/runtime/chartRuntimeArtifact.js";
import { chartPreparationIdentity } from "../src/charting/runtime/chartPreparationIdentity.js";
import { projectRuntimeArtifact } from "../src/charting/runtime/projectRuntimeArtifact.js";

test("chart time chip preserves plain-module heading compatibility and exact evidence markup", async () => {
  const { register } = await import("node:module");
  register(`data:text/javascript,${encodeURIComponent(`
export async function load(url, context, nextLoad) {
  if (url.endsWith(".jsx")) {
    const loaded = await nextLoad(url, { ...context, format: "module" });
    return { format: "module", source: loaded.source, shortCircuit: true };
  }
  return nextLoad(url, context);
}`)}`, import.meta.url);
  const { default: React } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: ChartTimeChip, ChartTimeEvidenceContext } = await import("../src/components/charts/ChartTimeChip.jsx");
  const chip = evidence => renderToStaticMarkup(React.createElement(ChartTimeEvidenceContext.Provider, { value: evidence }, React.createElement(ChartTimeChip)));
  assert.equal(chip(null), "");
  assert.equal(chip({ kind: "observed", observationEpochs: [1, 2], policy: "lastKnown", label: "Observed & carried" }),
    '<span class="chart-time-chip" aria-live="off" data-chart-time-kind="observed" data-chart-observation-epochs="1,2" data-chart-time-policy="lastKnown">Observed &amp; carried</span>');
  assert.equal(chip({ kind: "outside", observationEpochs: [], label: "Outside Storyline time" }),
    '<span class="chart-time-chip" aria-live="off" data-chart-time-kind="outside" data-chart-observation-epochs="">Outside Storyline time</span>');
});

function fixture() {
  const rows = [{ date: "2027-06-01", value: 8 }, { date: "2027-07-01", value: 9 }, { date: "2027-08-01", value: "" }, { date: "2027-12-01", value: null }];
  const chart = createChartDraft("line", { id: "staff", title: "Staff absenteeism", sourceId: "staff", roles: {
    observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" }, measurements: [{ field: "value" }],
  } });
  return { chart, rows, profile: profileDataset(rows) };
}
const epoch = Date.parse("2027-08-01T00:00:00.000Z");
const context = matching => ({ kind: "cursor", mode: "live", scope: { kind: "page", id: "page" }, activeEpochMs: epoch, matching, traceMode: "reveal" });

test("time chips report the actual carried observation rather than empty future rows or profile maxima", () => {
  const { chart, rows, profile } = fixture();
  const timeContext = context({ policy: "lastKnown" });
  const resolution = resolveChartRendering({ chart, rows, datasetProfile: profile, timeContext });
  const evidence = resolveChartTimeEvidence({ chart, profile, prepared: resolution.prepared, timeContext });
  assert.equal(evidence.kind, "observed");
  assert.deepEqual(evidence.observationEpochs, [Date.parse("2027-07-01")]);
  assert.match(evidence.label, /2027-07-01.*last known/);
  assert.doesNotMatch(evidence.label, /2027-12-01|2027-08-01/);
});

test("exact Live gaps and invalid unbounded nearest never acquire a fabricated as-of observation", () => {
  const { chart, rows, profile } = fixture();
  for (const [matching, kind] of [[{ policy: "exact" }, "missing"], [{ policy: "nearest" }, "unavailable"]]) {
    const timeContext = context(matching);
    const resolution = resolveChartRendering({ chart, rows, datasetProfile: profile, timeContext });
    const evidence = resolveChartTimeEvidence({ chart, profile, prepared: resolution.prepared, timeContext });
    assert.equal(evidence.kind, kind);
    assert.deepEqual(evidence.observationEpochs, []);
    assert.doesNotMatch(evidence.label, /As of|Observed/);
  }
});

test("interpolation chips identify synthetic time and its real bracketing observations", () => {
  const { chart } = fixture(), rows = [{ date: "2027-07-01", value: 10 }, { date: "2027-09-01", value: 20 }], profile = profileDataset(rows);
  profile.columns.find(column => column.name === "value").interpolationAllowed = true;
  const timeContext = context({ policy: "interpolate" });
  const resolution = resolveChartRendering({ chart, rows, datasetProfile: profile, timeContext });
  const evidence = resolveChartTimeEvidence({ chart, profile, prepared: resolution.prepared, timeContext });
  assert.equal(evidence.kind, "interpolated");
  assert.deepEqual(evidence.observationEpochs, [Date.parse("2027-07-01"), Date.parse("2027-09-01")]);
  assert.match(evidence.label, /Interpolated.*2027-08-01/);
  assert.match(evidence.label, /2027-07-01.*2027-09-01/);
});

test("View exact gaps use a single closest real date in both prepared and cached plots", () => {
  const { chart } = fixture();
  const rows = [{ date: "2027-07-31", value: 8 }, { date: "2027-08-02", value: 12 }, { date: "2027-08-03", value: 15 }];
  const datasetProfile = profileDataset(rows);
  const source = { id: chart.sourceId, path: "staff.csv" };
  const identity = chartPreparationIdentity({ chart, source, profile: datasetProfile });
  const artifact = compileChartRuntimeArtifact({ identity, chart, source,
    prepared: prepareChartData({ chart, rows, datasetProfile }) });
  for (const [selectedEpoch, expectedDate, expectedValue] of [
    [epoch, "2027-07-31", 8],
    [Date.parse("2027-07-30"), "2027-07-31", 8],
    [Date.parse("2027-08-02"), "2027-08-02", 12],
  ]) {
    const timeContext = { ...context({ policy: "exact" }), mode: "at", activeEpochMs: selectedEpoch, showClosestOnExactMiss: true };
    for (const prepared of [
      prepareChartData({ chart, rows, datasetProfile, timeContext }),
      projectRuntimeArtifact({ artifact, chart, timeContext }),
    ]) {
      const active = prepared.marks.filter(mark => mark.active);
      assert.deepEqual(active.map(mark => [mark.x, mark.value]), [[expectedDate, expectedValue]]);
      assert.ok(prepared.marks.every(mark => Date.parse(mark.x) <= selectedEpoch || mark.active));
      const evidence = resolveChartTimeEvidence({ chart, prepared, timeContext });
      assert.equal(evidence.kind, selectedEpoch === Date.parse(expectedDate) ? "observed" : "nonconcurrent");
      assert.deepEqual(evidence.observationEpochs, [Date.parse(expectedDate)]);
      if (evidence.kind === "nonconcurrent") {
        const { option } = buildRenderModel({ chart, prepared, datasetProfile });
        assert.equal(option.useUTC, true);
        assert.deepEqual(option.series[0].markPoint.data[0].coord, [Date.parse(expectedDate), expectedValue]);
      }
    }
  }
});

test("static chips are quiet in Live and eligible charts outside a Storyline identify their scope", () => {
  const { chart, profile } = fixture();
  const snapshot = createChartDraft("kpi", { id: "snapshot", sourceId: "staff", title: "Snapshot", roles: { value: { field: "value" } } });
  assert.equal(resolveChartTimeEvidence({ chart: snapshot, profile, cursorMode: "live" }), null);
  assert.equal(resolveChartTimeEvidence({ chart: snapshot, profile, cursorMode: "at" }).kind, "static");
  assert.equal(resolveChartTimeEvidence({ chart, profile, cursorMode: "at", scopeKind: "storyline" }).kind, "outside");
});
