import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  applyChartTypeSelection,
  listChartTypeOptions,
} from "../src/charting/forms/chartCatalogue.js";
import {
  createChartSchemaRegistry,
  getChartSchema,
} from "../src/charting/schemas/chartSchemaRegistry.js";
import {
  listManageableSourceEntries,
  resolveSourceEntryLabels,
} from "../src/content-library/sourceEntrySchema.js";
import { validateDatasetProfiles } from "../src/lib/loadDashboard.js";
import { buildChartCatalogue } from "../src/lib/quorumCatalogue.js";

function registryWith(...typeIds) {
  return createChartSchemaRegistry(typeIds.map((typeId) => (
    { ...structuredClone(getChartSchema(typeId)), conversions: [] }
  )));
}

test("catalogue is driven by zero, one, or many live registry entries", () => {
  assert.deepEqual(listChartTypeOptions({ registry: registryWith() }), []);
  assert.deepEqual(
    listChartTypeOptions({ registry: registryWith("line") }).map(({ id }) => id),
    ["line"],
  );
  assert.deepEqual(
    listChartTypeOptions({ registry: registryWith("bar", "line") }).map(({ id }) => id),
    ["bar", "line"],
  );
});

test("Bullet remains readable for existing dashboards but is retired from new authoring", () => {
  const registry = registryWith("kpi", "gauge", "bullet");
  assert.deepEqual(
    listChartTypeOptions({ registry }).map(({ id }) => id),
    ["kpi", "gauge"],
  );
  assert.deepEqual(
    listChartTypeOptions({ registry, selected: { chartTypeId: "bullet" } }).map(({ id }) => id),
    ["kpi", "gauge", "bullet"],
  );
});

test("catalogue search covers chart name, purpose, and description without hiding reasons", () => {
  const registry = registryWith("bar", "line", "pie");
  assert.deepEqual(
    listChartTypeOptions({ registry, query: "trend" }).map(({ id }) => id),
    ["line"],
  );
  assert.deepEqual(
    listChartTypeOptions({ registry, category: "composition" }).map(({ id }) => id),
    ["pie"],
  );

  const options = listChartTypeOptions({
    registry,
    sourceProfile: { fields: [{ id: "name", type: "text" }] },
  });
  const incompatible = options.find(({ id }) => id === "line");
  assert.equal(incompatible.compatibility, "incompatible");
  assert.match(incompatible.reason, /number|temporal|required/i);
});

test("type selection pins schema revision and preserves compatible authored work", () => {
  const state = {
    chartTypeId: "line",
    schemaRevision: "3:line",
    mapping: { observation: { field: "date" }, measurements: [{ field: "cases" }] },
    preparation: { filters: [{ field: "region", operator: "equals", value: "A" }] },
    configuration: { title: "Cases", lineWidth: 3, barWidth: 18 },
    companions: [],
    renderProofRevision: { revision: "render-1", status: "valid" },
    placementProofRevision: { revision: "place-1", status: "valid" },
  };
  const result = applyChartTypeSelection(state, {
    chartTypeId: "area",
    schemaRevision: "3:area",
    schema: getChartSchema("area"),
    confirmLoss: true,
  });

  assert.equal(result.state.chartTypeId, "area");
  assert.equal(result.state.schemaRevision, "3:area");
  assert.equal(result.state.configuration.title, "Cases");
  assert.equal(result.state.configuration.lineWidth, 3);
  assert.equal(result.state.configuration.barWidth, undefined);
  assert.deepEqual(result.removedPaths, ["configuration.barWidth"]);
  assert.ok(result.retainedPaths.includes("configuration.title"));
  assert.equal(result.state.renderProofRevision, null);
  assert.deepEqual(result.state.placementProofRevision, state.placementProofRevision);
});

test("incompatible type selection remains a prospective named-loss decision", () => {
  const state = {
    chartTypeId: "line",
    mapping: { observation: { field: "date" }, measurements: [{ field: "cases" }] },
    preparation: { filters: [] },
    configuration: { title: "Cases", lineWidth: 3 },
  };
  const result = applyChartTypeSelection(state, {
    chartTypeId: "image",
    schemaRevision: "3:image",
    schema: getChartSchema("image"),
    confirmLoss: false,
  });

  assert.equal(result.state, state);
  assert.ok(result.removedPaths.includes("mapping.observation"));
  assert.ok(result.removedPaths.includes("mapping.measurements"));
  assert.ok(result.needsAttention.some((value) => /confirm/i.test(value)));
});

test("stale or removed selected schemas are retained as Needs attention", () => {
  const options = listChartTypeOptions({
    registry: registryWith("bar"),
    selected: { chartTypeId: "line", schemaRevision: "2:line" },
  });
  assert.equal(options.at(-1).id, "line");
  assert.equal(options.at(-1).compatibility, "incompatible");
  assert.match(options.at(-1).reason, /no longer|removed/i);
});

test("imported source labels follow identity evidence and qualify only collisions", () => {
  const entries = [
    { sourceId: "named", displayName: "Named source" },
    { sourceId: "from_filename", displayName: "" },
    { sourceId: "from_path", displayName: "" },
    { sourceId: "from_provenance", displayName: "" },
    { sourceId: "fallback_source", displayName: "" },
    { sourceId: "north_cases", displayName: "Cases" },
    { sourceId: "south_cases", displayName: "Cases" },
    { sourceId: "repeat_a", displayName: "Measurements" },
    { sourceId: "repeat_b", displayName: "Measurements" },
  ];
  const dataSources = {
    named: { fileName: "ignored.csv", path: "data/ignored-path.csv", provenance: { label: "Ignored provenance" } },
    from_filename: { fileName: "reported-cases.csv", path: "data/ignored.csv", provenance: { label: "Ignored provenance" } },
    from_path: { path: "data/imported/hospital-occupancy.csv", provenance: { label: "Ignored provenance" } },
    from_provenance: { provenance: { label: "Laboratory feed" } },
    fallback_source: {},
    north_cases: { fileName: "north.csv" },
    south_cases: { path: "data/south.csv" },
    repeat_a: { fileName: "shared.csv" },
    repeat_b: { fileName: "shared.csv" },
  };

  const labels = Object.fromEntries(resolveSourceEntryLabels(entries, dataSources).map((entry) => (
    [entry.sourceId, entry.label]
  )));

  assert.deepEqual(labels, {
    named: "Named source",
    from_filename: "reported-cases.csv",
    from_path: "hospital-occupancy.csv",
    from_provenance: "Laboratory feed",
    fallback_source: "Fallback source",
    north_cases: "Cases — north.csv",
    south_cases: "Cases — south.csv",
    repeat_a: "Measurements — shared.csv — Repeat a",
    repeat_b: "Measurements — shared.csv — Repeat b",
  });
});

test("accepted Sep 3 source inventory has specific UI labels and runtime-compatible dataset profiles", () => {
  const dashboard = JSON.parse(readFileSync(
    new URL("../public/config/dashboard.json", import.meta.url),
    "utf8",
  ));
  const datasetProfiles = JSON.parse(readFileSync(
    new URL("../public/config/dataset-profiles.json", import.meta.url),
    "utf8",
  ));
  const expected = {
    bio_admissions: "Admissions — Biomedical",
    bio_cases: "Cases — Biomedical",
    bio_healthcare_cases: "Healthcare cases — Biomedical",
    bio_hospital_occupancy: "Hospital occupancy — Biomedical",
    bio_icu_occupancy: "ICU occupancy — Biomedical",
    bio_mortality: "Mortality by age — Biomedical",
    bio_municipal_infections: "Municipal infections — Biomedical",
    bio_municipal_map_timeline: "Generated map timeline derived from the authoritative harmonized municipal dataset — Biomedical",
    bio_municipal_aggregate_timeseries: "Generated aggregate timeline derived from the authoritative harmonized municipal dataset — Biomedical",
    bio_municipal_latest_bubble: "Generated latest municipal snapshot derived from the authoritative harmonized municipal dataset — Biomedical",
    bio_occupancy_gauges: "Occupancy gauges — Biomedical",
    bio_province_cases: "Province cases — Biomedical",
    bio_province_cases_latest: "Latest province snapshot — Biomedical",
    bio_province_deltas: "Derived province changes — Biomedical",
    bio_r_values: "R values — Biomedical",
    bio_testing: "Testing — Biomedical",
    bio_vaccination_current: "Vaccination snapshot — Biomedical",
    bio_vaccination_timeseries: "Vaccination time series — Biomedical",
    bio_wastewater: "Wastewater dataset — Biomedical",
    bio_wastewater_latest: "Latest wastewater snapshot — Biomedical",
    socio_adherence_deltas: "Derived adherence changes — Socio-economic",
    socio_behaviour: "Behaviour dataset — Socio-economic",
    socio_business_closures: "Business dataset — Socio-economic",
    socio_education_absenteeism: "Education absenteeism dataset — Socio-economic",
    socio_healthcare_absenteeism: "Healthcare absenteeism dataset — Socio-economic",
    socio_lifestyle: "Lifestyle dataset — Socio-economic",
    socio_loneliness: "Loneliness dataset — Socio-economic",
    socio_mental_wellbeing: "Mental wellbeing dataset — Socio-economic",
    socio_resilience: "Resilience dataset — Socio-economic",
    socio_risk_deltas: "Derived risk-perception changes — Socio-economic",
    socio_trust: "Trust dataset — Socio-economic",
    socio_unemployment: "Unemployment dataset — Socio-economic",
    socio_values: "Citizen-values dataset — Socio-economic",
    socio_values_deltas: "Derived citizen-values changes — Socio-economic",
  };

  const csvIds = Object.keys(dashboard.dataSources).filter(
    (sourceId) => dashboard.dataSources[sourceId].kind === "csv",
  );
  assert.deepEqual(csvIds.toSorted(), Object.keys(expected).toSorted());
  assert.equal(csvIds.some((id) => id.startsWith("upload-eldoria-") || id.startsWith("upload-cases-wcph-")), false);
  assert.equal(dashboard.contentLibrary.sourceEntries.bio_province_cases_latest.displayName,
    "Simulation exercise biomedical latest province snapshot");
  assert.equal(dashboard.contentLibrary.sourceEntries.socio_behaviour.displayName,
    "Simulation exercise socio-economic behaviour dataset");
  const manageable = listManageableSourceEntries(
    dashboard.contentLibrary,
    dashboard.dataSources,
  );
  const labels = new Map(resolveSourceEntryLabels(
    manageable,
    dashboard.dataSources,
  ).map(({ sourceId, label }) => [sourceId, label]));
  for (const [sourceId, label] of Object.entries(expected)) {
    const entry = dashboard.contentLibrary.sourceEntries[sourceId];
    const source = dashboard.dataSources[sourceId];
    const profile = datasetProfiles[sourceId];
    assert.equal(entry.sourceId, sourceId);
    assert.equal(entry.ownership, "builder");
    assert.equal(entry.origin, "legacy-import");
    assert.equal(labels.get(sourceId), label);
    assert.equal(profile.sourceId, sourceId);
    assert.equal(profile.kind, "csv");
    assert.equal(profile.path, source.path);
    assert.ok(Number.isSafeInteger(profile.rowCount) && profile.rowCount > 0);
    assert.ok(profile.columns.length > 0);
  }
  assert.equal(new Set(Object.values(expected)).size, Object.keys(expected).length);
  assert.doesNotThrow(() => validateDatasetProfiles(
    dashboard.dataSources,
    datasetProfiles,
  ));
});

test("catalogue accepts a promoted dashboard with embedded dataset profiles", () => {
  const dashboard = JSON.parse(readFileSync(
    new URL("../public/config/dashboard.json", import.meta.url),
    "utf8",
  ));
  const aliases = {};
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value.id && value.typeId) {
      aliases[value.id] = {
        aliases: [value.id],
        keywords: [value.typeId],
      };
    }
    Object.values(value).forEach(visit);
  };
  visit(dashboard);
  dashboard.datasetProfiles = {};

  assert.doesNotThrow(() => buildChartCatalogue(dashboard, aliases));
});
