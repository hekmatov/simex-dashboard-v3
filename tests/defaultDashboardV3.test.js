import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { buildMunicipalDerivatives, MUNICIPAL_DERIVATIVE_PATHS } from "../scripts/biomedicalMunicipalDerivatives.mjs";

import { normalizeCollectionSettings } from "../src/charting/collection/collectionModel.js";
import {
  createChartDraft,
  normalizeChartInstance,
  validateChartInstance,
} from "../src/charting/config/chartConfigV3.js";
import { prepareChartData } from "../src/charting/data/prepareChartData.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { buildRenderModel } from "../src/charting/rendering/buildRenderModel.js";
import { resolveChartRendering } from "../src/charting/rendering/resolveChartRendering.js";
import { getChartSchema } from "../src/charting/schemas/chartSchemaRegistry.js";
import {
  buildChronoGroupClock,
  validateChronoGroups,
} from "../src/charting/time/chronoGroupModel.js";
import { classifyManagedSource } from "../src/content-library/sourceEntrySchema.js";
import { parseCsvText } from "../src/lib/loadCsv.js";
import { validateStaticSource } from "../src/static-content/staticSourceSchema.js";
import { analyticalPlaybackFixture } from "./fixtures/analyticalPlaybackV3.js";

const ROOT = process.cwd();
const DASHBOARD_PATH = path.join(ROOT, "public", "config", "dashboard.json");
const ALIASES_PATH = path.join(ROOT, "public", "config", "chart-aliases.json");
const PROFILES_PATH = path.join(ROOT, "public", "config", "dataset-profiles.json");

const EXPECTED_PAGE_SECTIONS = {
  scenario: {
    scenario_section_1788163593858: [
      "static-cc1d15c3-dba6-4196-8293-7004cb03fffd",
      "static-a98417d0-1c09-4abf-b9b4-462dd591ef30",
    ],
    scenario_section_1788177898051: ["static-d2adf346-9ba9-4230-8ae0-2fa8161ddc1d"],
  },
  biomedical: {
    biomedical_section: [
      "chart-line-mtgytrwj",
      "static-998c93eb-c7d1-422b-8062-e9f2122b2399",
      "static-1df51cee-adea-4d7b-982f-5a50a6ba73d1",
      "static-c1a6ffb8-0c32-4ad2-bb54-16973ec3b2db",
    ],
    biomedical_section_1788164839437: [
      "chart-line-mtgz6v76",
      "static-be2ad3bd-ca18-44bf-9e6a-46f81ed9a98d",
    ],
  },
  socio_economic: {
    socio_economic_section: [
      "static-de5891b4-3c59-4108-aa60-0caccfafc835",
      "chart-horizontalBar-6a8c3efb-2059-410c-988b-254b948824ad",
    ],
    socio_economic_section_1788512378053: [
      "chart-groupedBar-eafbfdd0-e768-4303-8df1-6de4f5515d73",
      "chart-horizontalBar-mthbdhxi",
    ],
    socio_economic_section_1788512398466: [
      "chart-bar-44cbf87a-e849-4c92-a797-ebf26c444ed7",
      "chart-pie-e58760c5-7b89-440d-bf42-f8115642210b",
    ],
    socio_economic_section_1788715418554: [
      "static-e0ee5e1e-d221-42bd-8e5a-0616d95e6b09",
      "chart-line-a01a017d-96f1-440b-b24a-bcf2e30da1cc",
    ],
  },
};

const EXPECTED_CHART_BINDINGS = {
  "static-cc1d15c3-dba6-4196-8293-7004cb03fffd": ["image", "static-cc1d15c3-dba6-4196-8293-7004cb03fffd-source"],
  "static-a98417d0-1c09-4abf-b9b4-462dd591ef30": ["freeText", "static-a98417d0-1c09-4abf-b9b4-462dd591ef30-source"],
  "static-d2adf346-9ba9-4230-8ae0-2fa8161ddc1d": ["freeText", "static-d2adf346-9ba9-4230-8ae0-2fa8161ddc1d-source"],
  "chart-line-mtgytrwj": ["line", "upload-cases-wcph-internationaal-2"],
  "static-998c93eb-c7d1-422b-8062-e9f2122b2399": ["freeText", "static-998c93eb-c7d1-422b-8062-e9f2122b2399-source"],
  "static-1df51cee-adea-4d7b-982f-5a50a6ba73d1": ["freeText", "static-1df51cee-adea-4d7b-982f-5a50a6ba73d1-source"],
  "static-c1a6ffb8-0c32-4ad2-bb54-16973ec3b2db": ["freeText", "static-c1a6ffb8-0c32-4ad2-bb54-16973ec3b2db-source"],
  "chart-line-mtgz6v76": ["line", "upload-cases-wcph-eldoria-3"],
  "static-be2ad3bd-ca18-44bf-9e6a-46f81ed9a98d": ["freeText", "static-be2ad3bd-ca18-44bf-9e6a-46f81ed9a98d-source"],
  "static-de5891b4-3c59-4108-aa60-0caccfafc835": ["freeText", "static-de5891b4-3c59-4108-aa60-0caccfafc835-source"],
  "chart-horizontalBar-6a8c3efb-2059-410c-988b-254b948824ad": ["horizontalBar", "upload-eldoria-loneliness"],
  "chart-groupedBar-eafbfdd0-e768-4303-8df1-6de4f5515d73": ["groupedBar", "upload-eldoria-institutional-trust-comparison-fictional"],
  "chart-horizontalBar-mthbdhxi": ["horizontalBar", "upload-eldoria-baseline-public-support"],
  "chart-bar-44cbf87a-e849-4c92-a797-ebf26c444ed7": ["horizontalStackedBar", "upload-eldoria-income-distribution"],
  "chart-pie-e58760c5-7b89-440d-bf42-f8115642210b": ["pie", "upload-eldoria-work-sectors"],
  "static-e0ee5e1e-d221-42bd-8e5a-0616d95e6b09": ["freeText", "static-e0ee5e1e-d221-42bd-8e5a-0616d95e6b09-source"],
  "chart-line-a01a017d-96f1-440b-b24a-bcf2e30da1cc": ["line", "upload-eldoria-misinformation-2021-2027-fictional"],
};

const LEGACY_CHART_KEYS = new Set([
  "dataBinding",
  "dataConfig",
  "option",
  "schemaVersion",
  "series",
  "settings",
  "style",
  "temporalMatch",
  "type",
]);

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function configuredSections(dashboard) {
  return dashboard.pages.flatMap((page) => page.sections.map((section) => ({
    page,
    section,
  })));
}

function configuredCharts(dashboard) {
  return configuredSections(dashboard).flatMap(({ page, section }) => (
    section.panels.map((panel) => ({
      page,
      section,
      chart: panel.chart ?? panel,
    }))
  ));
}

function columnTypes(profile) {
  return new Map(profile.columns.map((column) => [column.name, column]));
}

async function loadTrackedInputs() {
  const [dashboard, profiles, aliases] = await Promise.all([
    loadJson(DASHBOARD_PATH),
    loadJson(PROFILES_PATH),
    loadJson(ALIASES_PATH),
  ]);
  return { dashboard, profiles, aliases };
}

function createSourceLoader(dashboard) {
  const rows = new Map();
  const geo = new Map();
  return {
    async rows(sourceId) {
      if (rows.has(sourceId)) return rows.get(sourceId);
      const source = dashboard.dataSources[sourceId];
      assert.equal(source?.kind, "csv", `chart source ${sourceId} must be a tracked CSV`);
      const parsed = parseCsvText(
        await readFile(path.join(ROOT, "public", source.path), "utf8"),
        source.path,
      );
      rows.set(sourceId, parsed);
      return parsed;
    },
    async geo(sourceId) {
      if (geo.has(sourceId)) return geo.get(sourceId);
      const source = dashboard.dataSources[sourceId];
      assert.equal(source?.kind, "geojson", `map source ${sourceId} must be tracked GeoJSON`);
      const parsed = await loadJson(path.join(ROOT, "public", source.path));
      geo.set(sourceId, parsed);
      return parsed;
    },
  };
}

test("the curated dashboard is a clean version 6 configuration with exact analytical coverage", async () => {
  const { dashboard } = await loadTrackedInputs();
  assert.equal(dashboard.configVersion, 6);
  assert.equal(Object.hasOwn(dashboard, "schemaVersion"), false);
  assert.equal(dashboard.id, "simex-dashboard");

  assert.deepEqual(
    Object.fromEntries(dashboard.pages.map((page) => [
      page.id,
      Object.fromEntries(page.sections.map((section) => [
        section.id,
        section.panels.map((panel) => (panel.chart ?? panel).id),
      ])),
    ])),
    EXPECTED_PAGE_SECTIONS,
  );
  const charts = configuredCharts(dashboard).map(({ chart }) => chart);
  assert.equal(charts.length, 17);
  assert.deepEqual(
    Object.fromEntries(charts.map((chart) => [chart.id, [chart.typeId, chart.sourceId]])),
    EXPECTED_CHART_BINDINGS,
  );
  assert.deepEqual(
    [...new Set(charts.map(({ typeId }) => typeId))].sort(),
    ["freeText", "groupedBar", "horizontalBar", "horizontalStackedBar", "image", "line", "pie"],
  );
  assert.deepEqual(
    charts.reduce((counts, chart) => {
      const kind = dashboard.dataSources[chart.sourceId]?.kind;
      counts[kind] = (counts[kind] ?? 0) + 1;
      return counts;
    }, {}),
    { staticImage: 1, staticText: 8, csv: 8 },
  );
});

test("the curated V6 dashboard retains every builder-managed source ownership record", async () => {
  const { dashboard } = await loadTrackedInputs();
  const managedSourceIds = Object.entries(dashboard.dataSources)
    .filter(([sourceId, source]) => classifyManagedSource(sourceId, source)?.ownership === "builder")
    .map(([sourceId]) => sourceId)
    .sort();
  const retainedSourceIds = Object.keys(dashboard.contentLibrary?.sourceEntries ?? {}).sort();

  assert.deepEqual(retainedSourceIds, managedSourceIds);
  for (const sourceId of managedSourceIds) {
    assert.equal(dashboard.contentLibrary.sourceEntries[sourceId].sourceId, sourceId);
    assert.equal(dashboard.contentLibrary.sourceEntries[sourceId].ownership, "builder");
  }
});

test("municipal charts use generated runtime derivatives instead of the authoritative build source", async () => {
  const manifest = await loadJson(path.join(ROOT, MUNICIPAL_DERIVATIVE_PATHS.manifest));
  const trackedAuthority = await readFile(path.join(ROOT, manifest.authoritative.path), "utf8");
  const normalizedAuthority = trackedAuthority.replaceAll("\r\n", "\n");
  const authority = [normalizedAuthority, normalizedAuthority.replaceAll("\n", "\r\n")]
    .find((candidate) => createHash("sha256").update(candidate, "utf8").digest("hex") === manifest.authoritative.sha256);
  assert.ok(authority, "tracked authority must match the manifest across checkout line endings");
  const rebuilt = buildMunicipalDerivatives(authority, {
    sourcePath: manifest.authoritative.path,
  });

  assert.deepEqual(rebuilt.manifest, manifest, "tracked derivatives must retain their source provenance and dimensions");
  assert.ok(manifest.dimensions.dates > 1);
  assert.ok(manifest.dimensions.municipalities > 1);
  assert.equal(manifest.dimensions.dates * manifest.dimensions.municipalities, manifest.derivatives.map.rowCount);
  assert.deepEqual(
    Object.fromEntries(["map", "aggregate", "bubble"].map((kind) => [kind, manifest.derivatives[kind].path])),
    Object.fromEntries(["map", "aggregate", "bubble"].map((kind) => [kind, MUNICIPAL_DERIVATIVE_PATHS[kind]])),
  );
  for (const kind of ["map", "aggregate", "bubble"]) {
    const derivative = manifest.derivatives[kind];
    assert.notEqual(derivative.path, manifest.authoritative.path);
    const tracked = await readFile(path.join(ROOT, derivative.path), "utf8");
    // Windows checkouts may normalize tracked CSV line endings to CRLF.
    assert.equal(tracked.replaceAll("\r\n", "\n"), rebuilt.files[kind], `${kind} projection drifted`);
    assert.equal(tracked.trimEnd().split(/\r?\n/).length - 1, derivative.rowCount);
  }
  assert.equal(manifest.derivatives.aggregate.rowCount, manifest.dimensions.dates);
  assert.equal(manifest.derivatives.bubble.rowCount, manifest.dimensions.municipalities);

  // These are native V3 analytical examples, separate from the current authored pages.
  const selections = [
    {
      kind: "map", chart: createChartDraft("chronoChoroplethMap", {
        id: "municipal-map-derivative", title: "Municipal rate", sourceId: "municipal-map",
        roles: {
          geography: { field: "MunicipalityCode" }, value: { field: "infectionsPer10000" },
          time: { field: "Datum", interpretation: "temporal" },
        },
        presentation: { map: { geoSource: "municipal-boundaries" } },
      }),
    },
    {
      kind: "aggregate", chart: createChartDraft("line", {
        id: "municipal-aggregate-derivative", title: "Municipal total", sourceId: "municipal-aggregate",
        roles: { measurements: [{ field: "AantalCumulatief" }], observation: { field: "Datum", interpretation: "temporal" } },
      }),
    },
    {
      kind: "bubble", chart: createChartDraft("bubble", {
        id: "municipal-bubble-derivative", title: "Latest municipality", sourceId: "municipal-bubble",
        roles: {
          x: { field: "population" }, y: { field: "infectionsPer10000" },
          size: { field: "AantalCumulatief" },
        },
      }),
    },
  ];
  const sourcePaths = Object.fromEntries(selections.map(({ kind, chart }) => [
    chart.sourceId, MUNICIPAL_DERIVATIVE_PATHS[kind],
  ]));
  assert.equal(Object.keys(sourcePaths).length, 3);
  for (const { kind, chart } of selections) {
    assert.equal(sourcePaths[chart.sourceId], manifest.derivatives[kind].path);
    assert.notEqual(sourcePaths[chart.sourceId], manifest.authoritative.path);
    const rows = parseCsvText(rebuilt.files[kind], sourcePaths[chart.sourceId]);
    const profile = profileDataset(rows.slice(0, 20), {
      Datum: { interpretation: "temporal", format: "YYYY-MM-DD" },
      MunicipalityCode: { interpretation: "geographic" },
    });
    assert.doesNotThrow(() => validateChartInstance(chart, { columnTypes: columnTypes(profile) }), chart.id);
  }
});

test("every configured role is backed by a compatible profiled field and each chart validates", async () => {
  const { dashboard, profiles } = await loadTrackedInputs();
  const ids = new Set();

  for (const { chart } of configuredCharts(dashboard)) {
    assert.equal(ids.has(chart.id), false, `duplicate chart id ${chart.id}`);
    ids.add(chart.id);
    assert.ok(dashboard.dataSources[chart.sourceId], `missing source ${chart.sourceId}`);
    const source = dashboard.dataSources[chart.sourceId];
    const schema = getChartSchema(chart.typeId);
    if (schema.authoringWorkflow === "static") {
      assert.ok(schema.sources.includes(source.kind), `${chart.id} source kind`);
      assert.doesNotThrow(() => validateStaticSource(source), chart.id);
      assert.doesNotThrow(() => validateChartInstance(chart), chart.id);
    } else {
      assert.equal(source.kind, "csv", `${chart.id} source kind`);
      assert.ok(profiles[chart.sourceId], `missing profile ${chart.sourceId}`);
      assert.doesNotThrow(
        () => validateChartInstance(chart, {
          columnTypes: columnTypes(profiles[chart.sourceId]),
        }),
        chart.id,
      );
    }
    assert.deepEqual(normalizeChartInstance(chart), chart, `${chart.id} is not normalized`);
    assert.ok(["left", "center", "right"].includes(chart.presentation.title?.align), `${chart.id} title alignment`);
    if (chart.presentation.collection !== null) {
      assert.deepEqual(
        chart.presentation.collection,
        normalizeCollectionSettings(chart.presentation.collection),
        `${chart.id} collection settings are not fully normalized`,
      );
    }
    for (const legacyKey of LEGACY_CHART_KEYS) {
      assert.equal(Object.hasOwn(chart, legacyKey), false, `${chart.id} retains ${legacyKey}`);
    }
    assert.equal(
      Object.hasOwn(chart.transformations, "temporalMatch"),
      false,
      `${chart.id} retains chart-local temporal matching`,
    );
  }
});

test("every curated chart prepares real tracked rows into a renderer-ready model", async () => {
  const { dashboard, profiles } = await loadTrackedInputs();
  const sources = createSourceLoader(dashboard);

  for (const { chart } of configuredCharts(dashboard)) {
    const source = dashboard.dataSources[chart.sourceId];
    if (getChartSchema(chart.typeId).authoringWorkflow === "static") {
      const resolution = resolveChartRendering({
        chart,
        renderContext: {
          sources: dashboard.dataSources,
          mediaItems: dashboard.contentLibrary.mediaItems,
          assets: dashboard.assets ?? {},
        },
      });
      assert.equal(resolution.status, "available", `${chart.id}: ${resolution.model?.message ?? resolution.model?.failure?.message ?? "static source unavailable"}`);
      assert.equal(resolution.model.kind, chart.typeId);
      if (source.kind === "staticImage") {
        const media = dashboard.contentLibrary.mediaItems[source.mediaId];
        assert.equal(media.current.kind, "package");
        assert.ok((await readFile(path.join(ROOT, "public", media.current.path))).length > 0);
        assert.equal(resolution.model.mediaId, source.mediaId);
      } else {
        assert.equal(resolution.model.qmd, source.qmd);
      }
      continue;
    }
    const geoSource = chart.presentation.map?.geoSource;
    const geoData = geoSource ? await sources.geo(geoSource) : undefined;
    const prepared = prepareChartData({
      chart,
      rows: await sources.rows(chart.sourceId),
      datasetProfile: profiles[chart.sourceId],
      ...(geoSource ? { geoData } : {}),
    });
    assert.equal(
      prepared.status,
      "ready",
      `${chart.id}: ${JSON.stringify(prepared.diagnostics)}`,
    );
    assert.ok(prepared.meta.renderableMarkCount >= 1, `${chart.id} has no renderable marks`);
    const rendererInput = chart.typeId === "chronoChoroplethMap"
      ? {
          ...prepared,
          marks: prepared.marks.filter(({ time }) => time === prepared.marks.at(-1).time),
        }
      : prepared;
    const model = buildRenderModel({ chart, prepared: rendererInput, geoData });
    assert.notEqual(model.kind, "error", `${chart.id}: ${model.message ?? "renderer error"}`);
  }
});

test("duplicate-prone analytical views use explicit filters or duplicate resolution", () => {
  const rows = [
    { region: "North", group: "A", value: 2 },
    { region: "North", group: "A", value: 3 },
    { region: "South", group: "A", value: 100 },
    { region: "North", group: "B", value: 4 },
  ];
  const profile = profileDataset(rows);
  const bar = createChartDraft("bar", {
    id: "filtered-aggregate", title: "Regional comparison", sourceId: "duplicates",
    roles: { measurements: [{ field: "value" }], observation: { field: "group" } },
    transformations: {
      filters: [{ field: "region", operator: "equals", value: "North" }],
      duplicates: "sum",
    },
  });
  assert.doesNotThrow(() => validateChartInstance(bar, { columnTypes: columnTypes(profile) }));
  assert.equal(bar.transformations.filters.length, 1);
  assert.equal(bar.transformations.duplicates, "sum");
  const resolved = prepareChartData({ chart: bar, rows, datasetProfile: profile });
  assert.equal(resolved.status, "ready");
  assert.deepEqual(resolved.marks.map(({ x, value }) => [x, value]), [["A", 5], ["B", 4]]);
  const unresolved = prepareChartData({
    chart: { ...bar, transformations: { ...bar.transformations, duplicates: null } },
    rows,
    datasetProfile: profile,
  });
  assert.equal(unresolved.status, "invalid");
  assert.ok(unresolved.diagnostics.some(({ code }) => code === "duplicate-resolution-required"));

  const changes = [
    { at: "2027-05-01", entity: "A", value: 5 },
    { at: "2027-05-02", entity: "A", value: 10 },
    { at: "2027-05-01", entity: "B", value: 8 },
    { at: "2027-05-02", entity: "B", value: 4 },
  ];
  const changeProfile = profileDataset(changes, { at: { interpretation: "temporal", format: "YYYY-MM-DD" } });
  const delta = createChartDraft("deltaList", {
    id: "previous-observation", title: "Entity changes", sourceId: "changes",
    roles: {
      measurement: { field: "value" }, entity: { field: "entity" },
      time: { field: "at", interpretation: "temporal" },
    },
    transformations: { comparison: { mode: "previousObservation" } },
  });
  assert.doesNotThrow(() => validateChartInstance(delta, { columnTypes: columnTypes(changeProfile) }));
  assert.deepEqual(delta.transformations.comparison, { mode: "previousObservation" });
  const compared = prepareChartData({ chart: delta, rows: changes, datasetProfile: changeProfile });
  assert.equal(compared.status, "ready");
  assert.deepEqual(compared.marks.map(({ entity, displayed, comparison, delta: change }) => [
    entity, displayed, comparison, change.absolute,
  ]), [["A", 10, 5, 5], ["B", 4, 8, -4]]);
});

test("time-indexed KPI and capacity snapshots use honest normalized collection displays", () => {
  const rows = [
    { at: "2027-05-01", cases: 5, capacity: 10 },
    { at: "2027-05-02", cases: 8, capacity: 10 },
    { at: "2027-05-03", cases: 9, capacity: 10 },
  ];
  const profile = profileDataset(rows, { at: { interpretation: "category" } });
  const collection = {
    layout: "carousel", rows: 1, columns: 1, gap: 16, overflow: "autoRotate",
    ranking: { mode: "fixed" },
    carousel: { intervalMs: 10000, loop: true, pauseOnHover: true, transition: "fade" },
    playback: { rerank: false, pauseCarousel: true },
  };
  for (const [typeId, roles, expectedKind] of [
    ["kpi", { value: { field: "cases" }, label: { field: "at", interpretation: "category" } }, "cards"],
    ["bullet", { actual: { field: "cases" }, target: { field: "capacity" }, label: { field: "at", interpretation: "category" } }, "targetCollection"],
  ]) {
    const chart = createChartDraft(typeId, {
      id: `${typeId}-history`, title: `${typeId} history`, sourceId: "capacity-history",
      roles, presentation: { collection },
    });
    assert.doesNotThrow(() => validateChartInstance(chart, { columnTypes: columnTypes(profile) }));
    assert.deepEqual(chart.transformations.filters, [], `${typeId} must retain its full source history`);
    assert.equal(chart.interaction.timeSync, null);
    assert.deepEqual(chart.presentation.collection, normalizeCollectionSettings(collection));
    const prepared = prepareChartData({ chart, rows, datasetProfile: profile });
    assert.equal(prepared.status, "ready", typeId);
    assert.deepEqual(prepared.marks.map(({ label }) => label), rows.map(({ at }) => at));
    const model = buildRenderModel({ chart, prepared });
    assert.equal(model.kind, expectedKind, typeId);
    assert.equal(model.items.length, rows.length);
    assert.deepEqual(model.presentation.collection, chart.presentation.collection);
  }
});

test("the municipal and national clocks validate and every national member is ready at every tick", () => {
  const { charts, groups, loadedData, profiles, geoData } = analyticalPlaybackFixture();
  assert.deepEqual(groups.map(({ id }) => id), ["municipal", "national"]);
  assert.deepEqual(groups.map(({ members }) => members.map(({ chartId }) => chartId)), [
    ["municipal-map", "municipal-trend"],
    ["national-line", "national-bar"],
  ]);
  for (const chart of charts) {
    assert.doesNotThrow(() => validateChartInstance(chart, {
      columnTypes: columnTypes(profiles[chart.sourceId]),
    }), chart.id);
  }
  assert.doesNotThrow(() => validateChronoGroups(groups, {
    charts, loadedData, profiles, timezone: "UTC",
  }));
  const chartById = new Map(charts.map((chart) => [chart.id, chart]));
  for (const group of groups) {
    assert.deepEqual(group.period, { start: "2027-05-01", end: "2027-05-02" });
    assert.deepEqual(group.matching, { policy: "exact" });
    assert.equal(group.secondsPerFrame, 1);
    assert.ok(group.members.length > 0);
    const clock = buildChronoGroupClock(group, {
      charts, loadedData, profiles, timezone: "UTC",
    });
    assert.deepEqual(clock, [Date.UTC(2027, 4, 1), Date.UTC(2027, 4, 2)]);
    assert.deepEqual([...clock].sort((left, right) => left - right), clock);
    for (const activeEpochMs of clock) {
      for (const member of group.members) {
        const chart = chartById.get(member.chartId);
        const prepared = prepareChartData({
          chart,
          rows: loadedData[chart.sourceId],
          datasetProfile: profiles[chart.sourceId],
          ...(chart.typeId === "chronoChoroplethMap" ? { geoData } : {}),
          timeContext: { groupId: group.id, activeEpochMs, matching: member.matching ?? group.matching },
        });
        assert.equal(prepared.status, "ready", `${member.chartId} at ${new Date(activeEpochMs).toISOString()}: ${JSON.stringify(prepared.diagnostics)}`);
        assert.ok(prepared.meta.renderableMarkCount > 0, member.chartId);
      }
    }
  }
});

test("all configured geography joins resolve and the choropleth is genuinely time varying", () => {
  const { charts, geoData, loadedData, profiles } = analyticalPlaybackFixture();
  const maps = charts.filter(({ typeId }) => ["mapScatter", "choroplethMap", "chronoChoroplethMap"].includes(typeId));
  assert.deepEqual(maps.map(({ id }) => id), ["municipal-map", "latest-areas"]);
  for (const chart of maps) {
    assert.equal(chart.presentation.map.geoSource, "boundaries");
    const prepared = prepareChartData({
      chart, rows: loadedData[chart.sourceId], datasetProfile: profiles[chart.sourceId], geoData,
    });
    assert.equal(prepared.status, "ready", `${chart.id}: ${JSON.stringify(prepared.diagnostics)}`);
    assert.ok(prepared.marks.length > 0, chart.id);
    assert.ok(prepared.marks.every(({ feature }) => feature), chart.id);
    assert.deepEqual([...new Set(prepared.marks.map(({ geography }) => geography))].sort(), ["A", "B"]);
    assert.equal(prepared.diagnostics.some(({ code }) => code === "geography-unmatched"), false, chart.id);
  }

  const chart = maps.find(({ id }) => id === "municipal-map");
  const prepared = prepareChartData({
    chart, rows: loadedData[chart.sourceId], datasetProfile: profiles[chart.sourceId], geoData,
  });
  assert.deepEqual([...new Set(prepared.marks.map(({ time }) => time))], ["2027-05-01", "2027-05-02"]);
  assert.deepEqual(prepared.marks.map(({ geography, value }) => [geography, value]), [
    ["A", 10], ["B", 20], ["A", 15], ["B", 25],
  ]);
  const model = buildRenderModel({ chart, prepared, geoData });
  assert.equal(model.kind, "echarts");
  assert.equal(model.option.timeline, undefined);
  assert.equal(model.option.options, undefined);
  assert.deepEqual(model.option.series[0].data.map(({ name, value }) => [name, value]), [
    ["A", 15], ["B", 25],
  ]);
  assert.equal(model.option.series[0].data.length, geoData.features.length, "initial option must contain one bounded frame");
});

test("the shipped V6 dashboard omits legacy Home placements while retaining their shared sources", async () => {
  const { dashboard } = await loadTrackedInputs();
  const charts = configuredCharts(dashboard).map(({ chart }) => chart);

  assert.equal(dashboard.pages.some(({ id }) => id === "old-homepage-content"), false);
  assert.equal(charts.some(({ id }) => id === "home_operational_pressure_kpis"), false);
  assert.equal(charts.some(({ id }) => id === "home_case_map"), false);
  assert.deepEqual(dashboard.home, { enabled: true });
  assert.equal(dashboard.pages.some(({ id }) => id === "home"), false);

  // Retired Home placements do not delete source-library material that can be reused.
  for (const sourceId of [
    "upload-eldoria-trust-in-government",
    "geo_netherlands_municipalities_2026",
    "geo_netherlands_provinces",
  ]) {
    assert.ok(dashboard.dataSources[sourceId], `missing retained source ${sourceId}`);
    assert.equal(dashboard.contentLibrary.sourceEntries[sourceId].sourceId, sourceId);
    assert.equal(charts.some((chart) => chart.sourceId === sourceId), false);
  }
});

test("aliases target every configured chart exactly once and remain globally unambiguous", async () => {
  const { dashboard, aliases } = await loadTrackedInputs();
  const chartIds = configuredCharts(dashboard).map(({ chart }) => chart.id).sort();
  assert.deepEqual(Object.keys(aliases).sort(), chartIds);
  const terms = new Set();
  for (const [chartId, descriptor] of Object.entries(aliases)) {
    assert.ok(Array.isArray(descriptor.aliases) && descriptor.aliases.length > 0, chartId);
    assert.ok(Array.isArray(descriptor.keywords) && descriptor.keywords.length > 0, chartId);
    for (const alias of descriptor.aliases) {
      const normalized = alias.trim().toLocaleLowerCase("en");
      assert.ok(normalized, `${chartId} has a blank alias`);
      assert.equal(terms.has(normalized), false, `duplicate alias "${alias}"`);
      terms.add(normalized);
    }
  }
});

test("the tracked JSON files use deterministic two-space serialization", async () => {
  for (const filePath of [DASHBOARD_PATH, ALIASES_PATH]) {
    const raw = await readFile(filePath, "utf8");
    assert.equal(raw, `${JSON.stringify(JSON.parse(raw), null, 2)}\n`);
  }
});
