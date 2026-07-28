import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import {
  listChartSchemas,
} from "../src/charting/schemas/chartSchemaRegistry.js";
import {
  GEOGRAPHY_BINDING_CONTRACT,
} from "../src/charting/data/geographyBindingContract.js";
import {
  CHART_CONVERSION_CONTRACT,
} from "../src/charting/forms/conversionContract.js";
import {
  getChartFormSectionDefinition,
} from "../src/charting/schemas/schemaTypes.js";

const catalogueModule = await import("../src/lib/quorumCatalogue.js");

const TYPE_KEYS = [
  "capabilities",
  "collection",
  "conversion",
  "data_constraints",
  "data_family",
  "description",
  "geography",
  "group_id",
  "label",
  "mark",
  "presentation_section_ids",
  "purpose",
  "renderer",
  "role_ids",
  "roles",
  "temporal",
  "type_id",
];
const ROLE_KEYS = [
  "accepted_semantic_types",
  "cardinality",
  "label",
  "required",
  "role_id",
];
const CHART_KEYS = [
  "aliases",
  "chart_id",
  "collection_capability",
  "description",
  "keywords",
  "page_id",
  "role_ids",
  "section_id",
  "supported_display_modes",
  "time_sync_group_id",
  "title",
  "type_id",
];
const DIGEST = /^[0-9a-f]{64}$/;

test("catalogue v2 covers every registered type and configured chart", async () => {
  const { dashboard, aliases } = await trackedInputs();
  const catalogue = catalogueModule.buildChartCatalogue(dashboard, aliases);
  const schemas = listChartSchemas();
  const configured = configuredCharts(dashboard);

  assert.deepEqual(Object.keys(catalogue).toSorted(), [
    "catalogue_id",
    "catalogue_revision",
    "chart_schema_version",
    "chart_types",
    "charts",
    "contract_version",
  ]);
  assert.equal(catalogue.contract_version, "2");
  assert.equal(catalogue.catalogue_id, "simex-dashboard");
  assert.equal(catalogue.catalogue_revision, dashboard.lastUpdated);
  assert.equal(catalogue.chart_schema_version, 3);
  assert.deepEqual(
    catalogue.chart_types.map(({ type_id }) => type_id),
    schemas.map(({ typeId }) => typeId).toSorted(),
  );
  assert.deepEqual(
    catalogue.charts.map(({ chart_id }) => chart_id),
    configured.map(({ chart }) => chart.id).toSorted(),
  );
  assert.equal(catalogue.chart_types.length, 26);
  assert.equal(catalogue.charts.length, 40);
  assert.ok(catalogue.charts.some(({ type_id }) => type_id === "pie"));
  assert.ok(
    catalogue.charts.some(
      ({ time_sync_group_id }) => time_sync_group_id === "municipal_outbreak",
    ),
  );
});

test("chart type descriptors mirror schema roles, constraints, and capabilities", async () => {
  const { dashboard, aliases } = await trackedInputs();
  const catalogue = catalogueModule.buildChartCatalogue(dashboard, aliases);
  const schemas = listChartSchemas();

  for (const schema of schemas) {
    const descriptor = catalogue.chart_types.find(
      ({ type_id }) => type_id === schema.typeId,
    );
    assert.ok(descriptor, `missing chart type ${schema.typeId}`);
    assert.deepEqual(Object.keys(descriptor).toSorted(), TYPE_KEYS);
    assert.equal(descriptor.label, schema.label);
    assert.equal(descriptor.description, schema.description);
    assert.equal(descriptor.group_id, schema.group);
    assert.equal(descriptor.purpose, schema.semantics.purpose);
    assert.equal(descriptor.mark, schema.semantics.mark);
    assert.equal(descriptor.data_family, schema.dataFamily);
    assert.equal(descriptor.renderer, schema.renderer);
    assert.deepEqual(
      descriptor.role_ids,
      schema.roles.map(({ id }) => id),
    );
    assert.deepEqual(
      descriptor.data_constraints.source_kinds,
      [...schema.sources].toSorted(),
    );
    assert.deepEqual(
      descriptor.data_constraints.transforms,
      [...schema.transforms],
    );
    assert.deepEqual(
      descriptor.data_constraints.manual_data,
      schema.manualData,
    );
    assert.deepEqual(
      descriptor.conversion.compatible_type_ids,
      [...schema.conversions].toSorted(),
    );
    assert.deepEqual(
      descriptor.conversion.rules,
      CHART_CONVERSION_CONTRACT,
    );
    assert.deepEqual(descriptor.capabilities, {
      collection: schema.capabilities.collection,
      time_sync: schema.capabilities.timeSync,
      zoom: schema.capabilities.zoom,
    });
    assert.deepEqual(
      descriptor.presentation_section_ids,
      schema.form.sections.filter(
        (sectionId) => (
          getChartFormSectionDefinition(sectionId)
            ?.cataloguePresentation === true
        ),
      ),
    );

    assert.equal(descriptor.roles.length, schema.roles.length);
    for (const role of schema.roles) {
      const roleDescriptor = descriptor.roles.find(
        ({ role_id }) => role_id === role.id,
      );
      assert.deepEqual(Object.keys(roleDescriptor).toSorted(), ROLE_KEYS);
      assert.deepEqual(roleDescriptor, {
        role_id: role.id,
        label: role.label,
        required: role.min > 0,
        cardinality: {
          min: role.min,
          max: role.max,
        },
        accepted_semantic_types: [...role.accepts],
      });
    }
  }
});

test("time, collection, geography, and source contracts are explicit but bounded", async () => {
  const { dashboard, aliases } = await trackedInputs();
  const catalogue = catalogueModule.buildChartCatalogue(dashboard, aliases);
  const byType = new Map(
    catalogue.chart_types.map((descriptor) => [descriptor.type_id, descriptor]),
  );

  assert.deepEqual(byType.get("line").temporal, {
    time_role_ids: ["observation"],
    matching_policies: ["exact", "lastKnown", "nearest", "interpolate"],
    interpolation_eligible: true,
    interpolation_requires_explicit_permission: true,
  });
  assert.deepEqual(byType.get("table").temporal, {
    time_role_ids: ["time"],
    matching_policies: ["exact", "lastKnown", "nearest"],
    interpolation_eligible: false,
    interpolation_requires_explicit_permission: false,
  });
  assert.equal(byType.get("pie").temporal, null);

  assert.deepEqual(byType.get("kpi").collection, {
    layout_modes: ["fixed", "scroll", "carousel"],
    ranking_modes: ["fixed", "sort", "priority"],
    priority_methods: [
      "highestCurrent",
      "lowestCurrent",
      "largestAbsoluteChange",
      "largestPercentageChange",
      "furthestFromTarget",
      "riskScore",
    ],
    grid: {
      min_rows: 1,
      max_rows: 4,
      min_columns: 1,
      max_columns: 4,
    },
  });
  assert.equal(byType.get("line").collection, null);

  assert.deepEqual(
    byType.get("chronoChoroplethMap").geography,
    GEOGRAPHY_BINDING_CONTRACT,
  );
  assert.equal(byType.get("line").geography, null);
  assert.deepEqual(byType.get("pie").data_constraints.manual_data, {
    maxRows: 20,
  });
  assert.deepEqual(byType.get("image").data_constraints.source_kinds, [
    "inline",
  ]);
});

test("configured chart descriptors use exact roles, groups, and display capabilities", async () => {
  const { dashboard, aliases } = await trackedInputs();
  const catalogue = catalogueModule.buildChartCatalogue(dashboard, aliases);
  const configured = new Map(
    configuredCharts(dashboard).map(({ chart }) => [chart.id, chart]),
  );

  for (const descriptor of catalogue.charts) {
    const chart = configured.get(descriptor.chart_id);
    assert.deepEqual(Object.keys(descriptor).toSorted(), CHART_KEYS);
    assert.equal(descriptor.type_id, chart.typeId);
    assert.deepEqual(descriptor.role_ids, Object.keys(chart.roles).toSorted());
  }

  const municipal = catalogue.charts.find(
    ({ chart_id }) => chart_id === "bio_municipality_choropleth_animation",
  );
  assert.equal(municipal.time_sync_group_id, "municipal_outbreak");
  assert.deepEqual(municipal.supported_display_modes, [
    "fullscreen",
    "multi_fullscreen",
    "playback",
  ]);

  const mortality = catalogue.charts.find(
    ({ chart_id }) => chart_id === "bio_mortality_age",
  );
  assert.equal(mortality.type_id, "pie");
  assert.equal(mortality.time_sync_group_id, null);
  assert.equal(mortality.collection_capability, false);
  assert.deepEqual(mortality.supported_display_modes, [
    "fullscreen",
    "multi_fullscreen",
  ]);

  const collection = catalogue.charts.find(
    ({ chart_id }) => chart_id === "bio_occupancy_collection",
  );
  assert.equal(collection.collection_capability, true);
});

test("generation and canonical digests are deterministic and match the persisted artifact", async () => {
  const { dashboard, aliases, persisted } = await trackedInputs();
  const first = catalogueModule.buildChartCatalogue(dashboard, aliases);
  const second = catalogueModule.buildChartCatalogue(dashboard, aliases);
  const snapshot = await catalogueModule.buildChartCatalogueSnapshot(
    dashboard,
    aliases,
    nodeSha256,
  );
  const { digest, ...body } = snapshot;

  assert.deepEqual(first, second);
  assert.deepEqual(
    catalogueModule.canonicalCatalogueBytes(first),
    catalogueModule.canonicalCatalogueBytes(second),
  );
  assert.deepEqual(Object.keys(snapshot).toSorted(), [
    "catalogue_id",
    "catalogue_revision",
    "chart_schema_version",
    "chart_types",
    "charts",
    "contract_version",
    "dashboard_semantic_digest",
    "digest",
  ]);
  assert.match(snapshot.dashboard_semantic_digest, DIGEST);
  assert.match(snapshot.digest, DIGEST);
  assert.equal(
    nodeSha256(catalogueModule.canonicalCatalogueBytes(body)),
    digest,
  );
  assert.deepEqual(persisted, snapshot);
});

test("dashboard semantic digest includes all packaged semantics and rejects runtime state", async () => {
  const { dashboard, aliases } = await trackedInputs();
  const original = Buffer.from(
    catalogueModule.canonicalDashboardSemanticsBytes(dashboard, aliases),
  );

  const changedTime = structuredClone(dashboard);
  changedTime.timeSyncGroups[0].matching.policy = "lastKnown";
  assert.notDeepEqual(
    Buffer.from(
      catalogueModule.canonicalDashboardSemanticsBytes(changedTime, aliases),
    ),
    original,
  );

  const changedMemberPolicy = structuredClone(dashboard);
  changedMemberPolicy.timeSyncGroups[0].members[0].matching = {
    policy: "lastKnown",
  };
  assert.notDeepEqual(
    Buffer.from(
      catalogueModule.canonicalDashboardSemanticsBytes(
        changedMemberPolicy,
        aliases,
      ),
    ),
    original,
  );

  const changedMembershipOrder = structuredClone(dashboard);
  changedMembershipOrder.timeSyncGroups[1].members.reverse();
  assert.notDeepEqual(
    Buffer.from(
      catalogueModule.canonicalDashboardSemanticsBytes(
        changedMembershipOrder,
        aliases,
      ),
    ),
    original,
  );

  const changedCollection = structuredClone(dashboard);
  const changedCollectionPresentation = configuredChart(
    changedCollection,
    "bio_occupancy_collection",
  ).presentation.collection;
  changedCollectionPresentation.layout = "scroll";
  changedCollectionPresentation.overflow = "scroll";
  assert.notDeepEqual(
    Buffer.from(
      catalogueModule.canonicalDashboardSemanticsBytes(
        changedCollection,
        aliases,
      ),
    ),
    original,
  );

  const changedRole = structuredClone(dashboard);
  configuredChart(changedRole, "bio_confirmed_cases")
    .roles.measurements[0].field = "deaths";
  assert.notDeepEqual(
    Buffer.from(
      catalogueModule.canonicalDashboardSemanticsBytes(changedRole, aliases),
    ),
    original,
  );

  const changedSource = structuredClone(dashboard);
  changedSource.dataSources.bio_cases.path =
    "data/biomedical/cases-revised.csv";
  assert.notDeepEqual(
    Buffer.from(
      catalogueModule.canonicalDashboardSemanticsBytes(changedSource, aliases),
    ),
    original,
  );

  const changedPresentation = structuredClone(dashboard);
  configuredChart(changedPresentation, "bio_confirmed_cases")
    .presentation.title.align = "left";
  assert.notDeepEqual(
    Buffer.from(
      catalogueModule.canonicalDashboardSemanticsBytes(
        changedPresentation,
        aliases,
      ),
    ),
    original,
  );

  const runtimeOnly = structuredClone(dashboard);
  runtimeOnly.loadedData = { bio_cases: [{ date: "2027-05-01" }] };
  runtimeOnly.datasetProfiles = { bio_cases: { fingerprint: "runtime" } };
  runtimeOnly.previewState = { selectedChartId: "bio_confirmed_cases" };
  runtimeOnly.compatibilityCheckedAt = "2099-01-01T00:00:00.000Z";
  assert.throws(() => (
    catalogueModule.canonicalDashboardSemanticsBytes(runtimeOnly, aliases)
  ), /unknown dashboard configuration property/i);
});

test("canonical bytes sort object keys, preserve array order, and distinguish JSON scalar types", () => {
  assert.deepEqual(
    catalogueModule.canonicalCatalogueBytes({
      z: "1",
      nested: { z: null, a: true },
      a: 1,
    }),
    catalogueModule.canonicalCatalogueBytes({
      a: 1,
      nested: { a: true, z: null },
      z: "1",
    }),
  );
  assert.notDeepEqual(
    catalogueModule.canonicalCatalogueBytes({ values: ["1", 1] }),
    catalogueModule.canonicalCatalogueBytes({ values: [1, "1"] }),
  );
  assert.throws(() => (
    catalogueModule.canonicalCatalogueBytes({ hidden: undefined })
  ));
  assert.throws(() => (
    catalogueModule.canonicalCatalogueBytes({ invalid: Number.NaN })
  ));
  assert.throws(() => (
    catalogueModule.canonicalCatalogueBytes({
      get executable() {
        throw new Error("must not run");
      },
    })
  ), /data property/);
});

test("declared sorted terms use JavaScript UTF-16 ordering", async () => {
  const { dashboard, aliases } = await trackedInputs();
  const changedAliases = structuredClone(aliases);
  changedAliases.bio_confirmed_cases.aliases = ["\uE000", "😀", "a"];
  const descriptor = catalogueModule.buildChartCatalogue(
    dashboard,
    changedAliases,
  ).charts.find(({ chart_id }) => chart_id === "bio_confirmed_cases");
  assert.deepEqual(descriptor.aliases, ["a", "😀", "\uE000"]);
});

test("runtime binding accepts only the exact self-consistent v2 snapshot", async (t) => {
  const { dashboard, aliases, persisted } = await trackedInputs();
  assert.equal(
    await catalogueModule.catalogueMatchesDashboardSnapshot(
      dashboard,
      aliases,
      persisted,
      nodeSha256,
    ),
    true,
  );

  const mutations = {
    "obsolete contract": (value) => {
      value.contract_version = "1";
    },
    "wrong chart schema": (value) => {
      value.chart_schema_version = 2;
    },
    "unknown top-level field": (value) => {
      value.legacy_charts = [];
    },
    "unknown chart-type field": (value) => {
      value.chart_types[0].legacy_semantics = {};
    },
    "unknown capability field": (value) => {
      value.chart_types[0].capabilities.legacy_zoom = true;
    },
    "unknown role field": (value) => {
      value.chart_types[0].roles[0].legacy_cardinality = 1;
    },
    "unknown configured-chart field": (value) => {
      value.charts[0].legacy_display_mode = "fullscreen";
    },
    "missing chart type": (value) => {
      value.chart_types.pop();
    },
    "duplicate chart type": (value) => {
      value.chart_types.push(structuredClone(value.chart_types[0]));
    },
    "unknown role": (value) => {
      value.chart_types[0].roles[0].role_id = "unknown-role";
    },
    "missing role": (value) => {
      value.chart_types[0].roles.pop();
    },
    "duplicate role": (value) => {
      value.chart_types[0].roles.push(
        structuredClone(value.chart_types[0].roles[0]),
      );
    },
    "unknown configured type": (value) => {
      value.charts[0].type_id = "unknown-type";
    },
    "duplicate configured chart": (value) => {
      value.charts.push(structuredClone(value.charts[0]));
    },
    "schema-derived semantic drift": (value) => {
      value.chart_types[0].description = "Changed outside the registry";
    },
  };

  for (const [name, mutate] of Object.entries(mutations)) {
    await t.test(name, async () => {
      const changed = structuredClone(persisted);
      mutate(changed);
      resign(changed);
      assert.equal(
        await catalogueModule.catalogueMatchesDashboardSnapshot(
          dashboard,
          aliases,
          changed,
          nodeSha256,
        ),
        false,
      );
    });
  }

  const undefinedExtra = structuredClone(persisted);
  undefinedExtra.legacy_charts = undefined;
  assert.equal(
    await catalogueModule.catalogueMatchesDashboardSnapshot(
      dashboard,
      aliases,
      undefinedExtra,
      nodeSha256,
    ),
    false,
  );

  const nonFiniteRole = structuredClone(persisted);
  nonFiniteRole.chart_types[0].roles[0].cardinality.min = Number.NaN;
  assert.equal(
    await catalogueModule.catalogueMatchesDashboardSnapshot(
      dashboard,
      aliases,
      nonFiniteRole,
      nodeSha256,
    ),
    false,
  );

  const hostile = new Proxy({}, {
    ownKeys() {
      throw new Error("hostile catalogue");
    },
  });
  assert.equal(
    await catalogueModule.catalogueMatchesDashboardSnapshot(
      dashboard,
      aliases,
      hostile,
      nodeSha256,
    ),
    false,
  );
});

test("producer rejects invalid v3 instances, aliases, and time membership", async (t) => {
  const { dashboard, aliases } = await trackedInputs();
  const cases = {
    "version 2 dashboard": (changed) => {
      changed.dashboard.configVersion = 2;
    },
    "unknown chart type": (changed) => {
      configuredChart(changed.dashboard, "bio_confirmed_cases").typeId = "unknown";
    },
    "missing required role": (changed) => {
      delete configuredChart(
        changed.dashboard,
        "bio_confirmed_cases",
      ).roles.measurements;
    },
    "unknown role": (changed) => {
      configuredChart(changed.dashboard, "bio_confirmed_cases")
        .roles.unknown = { field: "date" };
    },
    "unknown chart property": (changed) => {
      configuredChart(changed.dashboard, "bio_confirmed_cases")
        .legacyBinding = {};
    },
    "duplicate chart id": (changed) => {
      configuredChart(changed.dashboard, "bio_r_values").id =
        "bio_confirmed_cases";
    },
    "orphan alias": (changed) => {
      changed.aliases.orphan = {
        aliases: ["orphan"],
        keywords: ["orphan"],
      };
    },
    "unknown alias property": (changed) => {
      changed.aliases.bio_confirmed_cases.legacyKeywords = [];
    },
    "unknown time-group property": (changed) => {
      changed.dashboard.timeSyncGroups[0].legacyClock = {};
    },
    "unknown time-member property": (changed) => {
      changed.dashboard.timeSyncGroups[0].members[0].legacyPolicy = "exact";
    },
    "mismatched time membership": (changed) => {
      configuredChart(
        changed.dashboard,
        "bio_confirmed_cases",
      ).interaction.timeSync.groupId = "municipal_outbreak";
    },
  };

  for (const [name, mutate] of Object.entries(cases)) {
    await t.test(name, () => {
      const changed = {
        dashboard: structuredClone(dashboard),
        aliases: structuredClone(aliases),
      };
      mutate(changed);
      assert.throws(() => (
        catalogueModule.buildChartCatalogue(
          changed.dashboard,
          changed.aliases,
        )
      ));
    });
  }
});

test("every dashboard build mode refreshes catalogue v2", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  assert.equal(
    packageJson.scripts["build:quorum-catalogue"],
    "node scripts/build-quorum-catalogue.mjs",
  );
  for (const scriptName of [
    "predev",
    "prebuild",
    "build:cloudflare",
    "build:cloudflare:linux",
  ]) {
    assert.match(
      packageJson.scripts[scriptName],
      /node scripts\/build-quorum-catalogue\.mjs/,
      `${scriptName} must refresh catalogue v2`,
    );
  }
});

async function trackedInputs() {
  const [dashboard, aliases, persisted] = await Promise.all([
    readJson("public/config/dashboard.json"),
    readJson("public/config/chart-aliases.json"),
    readJson("public/integration/quorum-chart-catalogue.json"),
  ]);
  return { dashboard, aliases, persisted };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function configuredCharts(dashboard) {
  return dashboard.pages.flatMap((page) =>
    page.sections.flatMap((section) =>
      section.panels.map((panel) => ({
        page,
        section,
        chart: panel.chart ?? panel,
      })),
    ),
  );
}

function configuredChart(dashboard, chartId) {
  return configuredCharts(dashboard)
    .find(({ chart }) => chart.id === chartId)?.chart;
}

function resign(snapshot) {
  const { digest: _digest, ...body } = snapshot;
  snapshot.digest = nodeSha256(
    catalogueModule.canonicalCatalogueBytes(body),
  );
  return snapshot;
}

function nodeSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
