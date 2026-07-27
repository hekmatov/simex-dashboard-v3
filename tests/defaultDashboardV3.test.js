import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { normalizeCollectionSettings } from "../src/charting/collection/collectionModel.js";
import {
  normalizeChartInstance,
  validateChartInstance,
} from "../src/charting/config/chartConfigV3.js";
import { prepareChartData } from "../src/charting/data/prepareChartData.js";
import { buildRenderModel } from "../src/charting/rendering/buildRenderModel.js";
import { getChartSchema } from "../src/charting/schemas/chartSchemaRegistry.js";
import {
  buildPrimaryClock,
  validateTimeSyncGroups,
} from "../src/charting/time/timeSyncModel.js";
import { parseCsvText } from "../src/lib/loadCsv.js";

const ROOT = process.cwd();
const DASHBOARD_PATH = path.join(ROOT, "public", "config", "dashboard.json");
const ALIASES_PATH = path.join(ROOT, "public", "config", "chart-aliases.json");
const PROFILES_PATH = path.join(ROOT, "public", "config", "dataset-profiles.json");
const SHOWCASE_LANDING_SHA256 = "53ded06b41be418f55b68a927faa924a1b6ae030b1a6cc5f8ef39fe90e3486d4";

const EXPECTED_SECTIONS = {
  home_overview: [
    "home_operational_pressure_kpis",
    "home_case_map",
  ],
  outbreak_dynamics: [
    "bio_confirmed_cases",
    "bio_daily_cases_bar",
    "bio_new_cases_deaths",
    "bio_r_values",
    "bio_region_comparison",
    "bio_mortality_age",
    "bio_case_deltas",
    "bio_municipality_choropleth_animation",
    "bio_municipality_aggregate",
    "bio_population_infection_bubble",
    "bio_current_cases_kpi",
  ],
  health_system: [
    "bio_icu_capacity_bullet",
    "bio_hospital_capacity_bullet",
    "bio_icu_occupancy",
    "bio_hospital_occupancy",
    "bio_admissions",
    "bio_delayed_healthcare",
    "bio_testing_overlay",
    "bio_occupancy_collection",
  ],
  environmental_surveillance: [
    "bio_wastewater_map",
    "bio_wastewater_province",
  ],
  vaccination: [
    "bio_vaccination_current",
    "bio_vaccination_rate",
  ],
  public_response: [
    "socio_risk_perception",
    "socio_risk_deltas",
    "socio_adherence",
    "socio_values",
    "socio_values_deltas",
  ],
  trust_wellbeing: [
    "socio_trust_trend",
    "socio_trust_meter",
    "socio_loneliness",
    "socio_mental_wellbeing",
    "socio_lifestyle",
    "socio_resilience",
  ],
  economy_staffing: [
    "socio_business_closures",
    "socio_unemployment",
    "socio_healthcare_absenteeism",
    "socio_education_absenteeism",
  ],
};

const EXPECTED_CHART_MAPPING = {
  home_operational_pressure_kpis: ["kpi", "bio_occupancy_gauges"],
  home_case_map: ["mapScatter", "bio_wastewater_latest"],
  bio_confirmed_cases: ["line", "bio_cases"],
  bio_daily_cases_bar: ["bar", "bio_cases"],
  bio_new_cases_deaths: ["mixed", "bio_cases"],
  bio_r_values: ["line", "bio_r_values"],
  bio_region_comparison: ["horizontalBar", "bio_province_cases_latest"],
  bio_mortality_age: ["pie", "bio_mortality"],
  bio_case_deltas: ["deltaList", "bio_province_deltas"],
  bio_municipality_choropleth_animation: [
    "chronoChoroplethMap",
    "bio_municipal_infections_harmonized_2021",
  ],
  bio_municipality_aggregate: ["line", "bio_municipal_infections_harmonized_2021"],
  bio_population_infection_bubble: ["bubble", "bio_municipal_infections_harmonized_2021"],
  bio_current_cases_kpi: ["kpi", "bio_cases"],
  bio_icu_capacity_bullet: ["bullet", "bio_icu_occupancy"],
  bio_hospital_capacity_bullet: ["bullet", "bio_hospital_occupancy"],
  bio_icu_occupancy: ["line", "bio_icu_occupancy"],
  bio_hospital_occupancy: ["line", "bio_hospital_occupancy"],
  bio_admissions: ["groupedBar", "bio_admissions"],
  bio_delayed_healthcare: ["groupedBar", "bio_healthcare_cases"],
  bio_testing_overlay: ["mixed", "bio_testing"],
  bio_occupancy_collection: ["gauge", "bio_occupancy_gauges"],
  bio_wastewater_map: ["mapScatter", "bio_wastewater_latest"],
  bio_wastewater_province: ["horizontalBar", "bio_wastewater_latest"],
  bio_vaccination_current: ["table", "bio_vaccination_current"],
  bio_vaccination_rate: ["line", "bio_vaccination_timeseries"],
  socio_risk_perception: ["heatmap", "socio_behaviour"],
  socio_risk_deltas: ["deltaList", "socio_risk_deltas"],
  socio_adherence: ["stackedBar", "socio_behaviour"],
  socio_values: ["horizontalBar", "socio_values"],
  socio_values_deltas: ["deltaList", "socio_values_deltas"],
  socio_trust_trend: ["line", "socio_trust"],
  socio_trust_meter: ["gauge", "socio_trust"],
  socio_loneliness: ["line", "socio_loneliness"],
  socio_mental_wellbeing: ["stackedBar", "socio_mental_wellbeing"],
  socio_lifestyle: ["stackedBar", "socio_lifestyle"],
  socio_resilience: ["stackedBar", "socio_resilience"],
  socio_business_closures: ["groupedBar", "socio_business_closures"],
  socio_unemployment: ["line", "socio_unemployment"],
  socio_healthcare_absenteeism: ["line", "socio_healthcare_absenteeism"],
  socio_education_absenteeism: ["line", "socio_education_absenteeism"],
};

const REQUIRED_TYPES = [
  "kpi",
  "mapScatter",
  "line",
  "chronoChoroplethMap",
  "horizontalBar",
  "deltaList",
  "mixed",
  "bar",
  "gauge",
  "groupedBar",
  "table",
  "stackedBar",
  "pie",
  "bullet",
  "bubble",
  "heatmap",
];

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

test("the curated dashboard is a clean version 3 configuration with exact analytical coverage", async () => {
  const { dashboard } = await loadTrackedInputs();
  assert.equal(dashboard.configVersion, 3);
  assert.equal(Object.hasOwn(dashboard, "schemaVersion"), false);
  assert.equal(dashboard.id, "simex-dashboard");

  const sections = Object.fromEntries(
    configuredSections(dashboard).map(({ section }) => [
      section.id,
      section.panels.map((panel) => (panel.chart ?? panel).id),
    ]),
  );
  assert.deepEqual(sections, EXPECTED_SECTIONS);
  assert.equal(configuredCharts(dashboard).length, 40);
  assert.deepEqual(
    Object.fromEntries(configuredCharts(dashboard).map(({ chart }) => [
      chart.id,
      [chart.typeId, chart.sourceId],
    ])),
    EXPECTED_CHART_MAPPING,
  );

  const typeIds = new Set(configuredCharts(dashboard).map(({ chart }) => chart.typeId));
  for (const required of REQUIRED_TYPES) {
    assert.ok(typeIds.has(required), `missing curated ${required}`);
  }
});

test("every configured role is backed by a compatible profiled field and each chart validates", async () => {
  const { dashboard, profiles } = await loadTrackedInputs();
  const ids = new Set();

  for (const { chart } of configuredCharts(dashboard)) {
    assert.equal(ids.has(chart.id), false, `duplicate chart id ${chart.id}`);
    ids.add(chart.id);
    assert.ok(dashboard.dataSources[chart.sourceId], `missing source ${chart.sourceId}`);
    assert.ok(profiles[chart.sourceId], `missing profile ${chart.sourceId}`);
    assert.ok(getChartSchema(chart.typeId));
    assert.doesNotThrow(
      () => validateChartInstance(chart, {
        columnTypes: columnTypes(profiles[chart.sourceId]),
      }),
      chart.id,
    );
    assert.deepEqual(normalizeChartInstance(chart), chart, `${chart.id} is not normalized`);
    assert.deepEqual(chart.presentation.title, {
      align: chart.presentation.title.align,
    });
    assert.deepEqual(chart.presentation.background, {
      color: chart.presentation.background.color,
      transparent: chart.presentation.background.transparent,
    });
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

test("duplicate-prone analytical views use explicit filters or duplicate resolution", async () => {
  const { dashboard } = await loadTrackedInputs();
  const charts = new Map(configuredCharts(dashboard).map(({ chart }) => [chart.id, chart]));
  const explicitlyResolved = [
    "bio_municipality_aggregate",
    "bio_population_infection_bubble",
    "bio_mortality_age",
    "bio_delayed_healthcare",
    "socio_risk_perception",
    "socio_risk_deltas",
    "socio_adherence",
    "socio_values",
    "socio_trust_meter",
    "socio_mental_wellbeing",
    "socio_lifestyle",
    "socio_resilience",
  ];
  for (const chartId of explicitlyResolved) {
    const transformations = charts.get(chartId)?.transformations;
    assert.ok(transformations, `missing duplicate-prone chart ${chartId}`);
    assert.ok(
      transformations.filters.length > 0
        || transformations.grouping?.length > 0
        || transformations.duplicates !== null,
      `${chartId} needs an explicit duplicate policy`,
    );
  }
  for (const chartId of ["bio_case_deltas", "socio_risk_deltas", "socio_values_deltas"]) {
    assert.deepEqual(charts.get(chartId).transformations.comparison, {
      mode: "previousObservation",
    });
  }
});

test("time-indexed KPI and capacity snapshots use honest normalized collection displays", async () => {
  const { dashboard, profiles } = await loadTrackedInputs();
  const sources = createSourceLoader(dashboard);
  const charts = new Map(configuredCharts(dashboard).map(({ chart }) => [chart.id, chart]));

  for (const chartId of [
    "bio_current_cases_kpi",
    "bio_icu_capacity_bullet",
    "bio_hospital_capacity_bullet",
  ]) {
    const chart = charts.get(chartId);
    assert.deepEqual(chart.transformations.filters, [], `${chartId} must retain its full source history`);
    assert.deepEqual(chart.roles.label, {
      field: "date",
      interpretation: "category",
    });
    assert.deepEqual(chart.presentation.collection, {
      layout: "carousel",
      rows: 1,
      columns: 1,
      gap: 16,
      overflow: "autoRotate",
      ranking: { mode: "fixed" },
      carousel: {
        intervalMs: 10000,
        loop: true,
        pauseOnHover: true,
        transition: "fade",
      },
      playback: {
        rerank: false,
        pauseCarousel: true,
      },
    });
    const prepared = prepareChartData({
      chart,
      rows: await sources.rows(chart.sourceId),
      datasetProfile: profiles[chart.sourceId],
    });
    assert.equal(prepared.status, "ready", chartId);
    assert.equal(prepared.marks.length, 177, chartId);
    const model = buildRenderModel({ chart, prepared });
    assert.equal(
      model.kind,
      chart.typeId === "kpi" ? "cards" : "targetCollection",
      chartId,
    );
    assert.deepEqual(model.presentation.collection, chart.presentation.collection, chartId);
  }
});

test("the municipal and national clocks validate and every national member is ready at every tick", async () => {
  const { dashboard, profiles } = await loadTrackedInputs();
  const sources = createSourceLoader(dashboard);
  const entries = configuredCharts(dashboard);
  const loadedData = {};
  for (const sourceId of new Set(entries.map(({ chart }) => chart.sourceId))) {
    loadedData[sourceId] = await sources.rows(sourceId);
  }

  assert.deepEqual(dashboard.timeSyncGroups.map(({ id }) => id), [
    "municipal_outbreak",
    "national_outbreak",
  ]);
  assert.doesNotThrow(() => validateTimeSyncGroups(dashboard.timeSyncGroups, {
    charts: entries.map(({ chart }) => chart),
    loadedData,
    profiles,
  }));
  for (const group of dashboard.timeSyncGroups) {
    const clock = buildPrimaryClock(group, loadedData, profiles);
    assert.ok(clock.length > 1, `${group.id} needs a usable playback clock`);
    assert.deepEqual([...clock].sort((left, right) => left - right), clock);
  }

  const municipal = dashboard.timeSyncGroups[0];
  assert.deepEqual(municipal.primaryClock, {
    sourceId: "bio_municipal_infections_harmonized_2021",
    timeField: "Datum",
  });
  assert.deepEqual(municipal.members.map(({ chartId }) => chartId), [
    "bio_municipality_choropleth_animation",
    "bio_municipality_aggregate",
  ]);
  assert.deepEqual(municipal.matching, { policy: "exact" });

  const national = dashboard.timeSyncGroups[1];
  assert.deepEqual(national, {
    id: "national_outbreak",
    name: "National outbreak and health-system playback",
    primaryClock: {
      sourceId: "bio_cases",
      timeField: "date",
    },
    matching: {
      policy: "exact",
    },
    members: [
      { chartId: "bio_confirmed_cases", timeRole: "observation" },
      { chartId: "bio_daily_cases_bar", timeRole: "observation" },
      { chartId: "bio_new_cases_deaths", timeRole: "observation" },
      { chartId: "bio_r_values", timeRole: "observation" },
      { chartId: "bio_current_cases_kpi", timeRole: "time" },
      { chartId: "bio_admissions", timeRole: "observation" },
      { chartId: "bio_icu_capacity_bullet", timeRole: "time" },
      { chartId: "bio_hospital_capacity_bullet", timeRole: "time" },
    ],
  });
  assert.equal(
    national.members.some(({ chartId }) => chartId === "bio_occupancy_collection"),
    false,
  );

  const chartById = new Map(entries.map(({ chart }) => [chart.id, chart]));
  const clock = buildPrimaryClock(national, loadedData, profiles);
  for (const activeEpochMs of clock) {
    for (const member of national.members) {
      const chart = chartById.get(member.chartId);
      const prepared = prepareChartData({
        chart,
        rows: loadedData[chart.sourceId],
        datasetProfile: profiles[chart.sourceId],
        timeContext: {
          groupId: national.id,
          activeEpochMs,
          matching: member.matching ?? national.matching,
        },
      });
      assert.equal(
        prepared.status,
        "ready",
        `${member.chartId} at ${new Date(activeEpochMs).toISOString()}: ${JSON.stringify(prepared.diagnostics)}`,
      );
      assert.ok(prepared.meta.renderableMarkCount > 0, member.chartId);
      if (["kpi", "bullet"].includes(chart.typeId)) {
        assert.equal(prepared.marks.length, 1, `${member.chartId} must project one snapshot`);
      }
    }
  }
});

test("all configured geography joins resolve and the choropleth is genuinely time varying", async () => {
  const { dashboard, profiles } = await loadTrackedInputs();
  const sources = createSourceLoader(dashboard);
  const maps = configuredCharts(dashboard).map(({ chart }) => chart).filter(
    ({ typeId }) => ["mapScatter", "choroplethMap", "chronoChoroplethMap"].includes(typeId),
  );

  for (const chart of maps) {
    const prepared = prepareChartData({
      chart,
      rows: await sources.rows(chart.sourceId),
      datasetProfile: profiles[chart.sourceId],
      geoData: await sources.geo(chart.presentation.map.geoSource),
    });
    assert.equal(prepared.status, "ready", chart.id);
    assert.ok(prepared.marks.every(({ feature, coordinates }) => feature || coordinates), chart.id);
    assert.equal(
      prepared.diagnostics.some(({ code }) => code === "geography-unmatched"),
      false,
      `${chart.id} contains unmatched geography`,
    );
  }

  const choropleth = maps.find(({ id }) => id === "bio_municipality_choropleth_animation");
  const prepared = prepareChartData({
    chart: choropleth,
    rows: await sources.rows(choropleth.sourceId),
    datasetProfile: profiles[choropleth.sourceId],
    geoData: await sources.geo(choropleth.presentation.map.geoSource),
  });
  const preparedTimes = new Set(prepared.marks.map(({ time }) => time));
  const profiledTimes = new Set(
    profiles[choropleth.sourceId].columns
      .find(({ name }) => name === "Datum")
      .temporal.values
      .filter(Boolean),
  );
  assert.deepEqual(preparedTimes, profiledTimes, "full temporal history must remain prepared");
  const representativeTime = prepared.marks.at(-1).time;
  const representativeFrame = {
    ...prepared,
    marks: prepared.marks.filter(({ time }) => time === representativeTime),
  };
  const model = buildRenderModel({
    chart: choropleth,
    prepared: representativeFrame,
    geoData: await sources.geo(choropleth.presentation.map.geoSource),
  });
  assert.notEqual(model.kind, "error");
  assert.ok(representativeFrame.marks.length > 300);
});

test("showcase landing metadata is retained byte-for-byte at the semantic JSON level", async () => {
  const { dashboard } = await loadTrackedInputs();
  const home = dashboard.pages.find(({ id }) => id === "home");
  assert.deepEqual({
    id: home.id,
    label: home.label,
    pageType: home.pageType,
    title: home.title,
    description: home.description,
  }, {
    id: "home",
    label: "Home",
    pageType: "landing",
    title: "SimEx Dashboard",
    description: "A reusable dashboard platform for simulation exercise decision support.",
  });
  assert.equal(
    createHash("sha256").update(JSON.stringify(home.landing)).digest("hex"),
    SHOWCASE_LANDING_SHA256,
  );
  assert.deepEqual(
    {
      id: home.sections[0].id,
      title: home.sections[0].title,
      description: home.sections[0].description,
      layout: home.sections[0].layout,
      vantaBackground: home.sections[0].vantaBackground,
    },
    {
      id: "home_overview",
      title: "Scenario overview",
      description: "Prepared static dashboard content imported from the original PDPC exercise dashboard.",
      layout: "two-column",
      vantaBackground: {
        backgroundColor: "#f7f9fc",
        networkColor: "#f1a1ad",
        mouseControls: false,
        touchControls: false,
        points: 6,
        maxDistance: 17,
        spacing: 18,
        speed: 0.45,
      },
    },
  );
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
