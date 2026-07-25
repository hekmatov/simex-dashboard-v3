import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const catalogueModule = await import("../src/lib/quorumCatalogue.js").catch(() => null);

test("catalogue generator is available", () => {
  assert.equal(
    typeof catalogueModule?.buildChartCatalogue,
    "function",
    "buildChartCatalogue must be implemented",
  );
  assert.equal(
    typeof catalogueModule?.canonicalCatalogueBytes,
    "function",
    "canonicalCatalogueBytes must be implemented",
  );
  assert.equal(
    typeof catalogueModule?.buildChartCatalogueSnapshot,
    "function",
    "buildChartCatalogueSnapshot must be implemented",
  );
  assert.equal(
    typeof catalogueModule?.catalogueMatchesDashboardSnapshot,
    "function",
    "catalogueMatchesDashboardSnapshot must be implemented",
  );
});

test("catalogue generation is deterministic, complete, and digest-stable", async () => {
  assert.ok(catalogueModule, "catalogue module must be implemented");
  const dashboard = JSON.parse(await readFile("public/config/dashboard.json", "utf8"));
  const aliases = JSON.parse(await readFile("public/config/chart-aliases.json", "utf8"));
  const persisted = JSON.parse(
    await readFile("public/integration/quorum-chart-catalogue.json", "utf8"),
  );
  const first = catalogueModule.buildChartCatalogue(dashboard, aliases);
  const second = catalogueModule.buildChartCatalogue(dashboard, aliases);
  const snapshot = await catalogueModule.buildChartCatalogueSnapshot(
    dashboard,
    aliases,
    nodeSha256,
  );
  const configuredPanels = dashboard.pages.flatMap((page) =>
    page.sections.flatMap((section) => section.panels),
  );

  assert.deepEqual(first, second);
  assert.equal(first.contract_version, "1");
  assert.equal(first.catalogue_id, "simex-dashboard");
  assert.equal(first.catalogue_revision, dashboard.lastUpdated);
  assert.equal(first.charts.length, configuredPanels.length);
  assert.deepEqual(
    first.charts.map(({ chart_id }) => chart_id),
    first.charts.map(({ chart_id }) => chart_id).toSorted(),
  );
  assert.equal(
    new Set(first.charts.map(({ chart_id }) => chart_id)).size,
    first.charts.length,
  );
  assert.ok(
    first.charts.every(
      (chart) =>
        chart.title.length > 0 &&
        chart.description.length > 0 &&
        chart.aliases.length > 0 &&
        chart.keywords.length > 0 &&
        chart.supported_display_modes.join(",") === "fullscreen,multi_fullscreen",
    ),
  );
  assert.deepEqual(persisted, snapshot);
  assert.match(persisted.digest, /^[0-9a-f]{64}$/);
  assert.match(persisted.dashboard_semantic_digest, /^[0-9a-f]{64}$/);
  assert.deepEqual(
    catalogueModule.canonicalCatalogueBytes(first),
    catalogueModule.canonicalCatalogueBytes(second),
  );
});

test("runtime catalogue binding fails closed when a chart definition changes under the same ID", async () => {
  assert.ok(catalogueModule, "catalogue module must be implemented");
  const dashboard = JSON.parse(await readFile("public/config/dashboard.json", "utf8"));
  const aliases = JSON.parse(await readFile("public/config/chart-aliases.json", "utf8"));
  const persisted = JSON.parse(
    await readFile("public/integration/quorum-chart-catalogue.json", "utf8"),
  );
  const changed = structuredClone(dashboard);
  changed.pages[1].sections[0].panels[1].dataSource = "different-source";
  const reconciled = structuredClone(dashboard);
  reconciled.pages[1].sections[0].panels[1].sourceSchema = {
    ...(reconciled.pages[1].sections[0].panels[1].sourceSchema ?? {}),
    checkedAt: "2099-01-01T00:00:00.000Z",
  };
  const runtimeAxisInterpretation = structuredClone(dashboard);
  const profiledPanel = runtimeAxisInterpretation.pages
    .flatMap((page) => page.sections)
    .flatMap((section) => section.panels)
    .find((panel) => panel.id === "bio_delayed_healthcare");
  profiledPanel.dataBinding.x.type = "category";

  assert.equal(
    await catalogueModule.catalogueMatchesDashboardSnapshot(
      dashboard,
      aliases,
      persisted,
      nodeSha256,
    ),
    true,
  );
  assert.equal(
    await catalogueModule.catalogueMatchesDashboardSnapshot(
      changed,
      aliases,
      persisted,
      nodeSha256,
    ),
    false,
  );
  assert.equal(
    await catalogueModule.catalogueMatchesDashboardSnapshot(
      reconciled,
      aliases,
      persisted,
      nodeSha256,
    ),
    true,
    "runtime compatibility metadata must not invalidate chart semantics",
  );
  assert.equal(
    await catalogueModule.catalogueMatchesDashboardSnapshot(
      runtimeAxisInterpretation,
      aliases,
      persisted,
      nodeSha256,
    ),
    true,
    "data-profile axis interpretation must preserve chart identity",
  );
});

test("catalogue generation rejects orphan aliases", () => {
  assert.ok(catalogueModule, "catalogue module must be implemented");
  assert.throws(
    () =>
      catalogueModule.buildChartCatalogue(
        { lastUpdated: "2026-07-23", pages: [] },
        { orphan: { aliases: ["orphan"], keywords: ["orphan"] } },
      ),
    /orphan alias/,
  );
});

test("catalogue generation rejects duplicate chart IDs", () => {
  assert.ok(catalogueModule, "catalogue module must be implemented");
  const dashboard = {
    lastUpdated: "2026-07-23",
    pages: [
      {
        id: "page",
        sections: [
          {
            id: "section",
            description: "Section",
            panels: [
              { id: "duplicate", title: "First" },
              { id: "duplicate", title: "Second" },
            ],
          },
        ],
      },
    ],
  };

  assert.throws(
    () =>
      catalogueModule.buildChartCatalogue(dashboard, {
        duplicate: { aliases: ["duplicate"], keywords: ["duplicate"] },
      }),
    /duplicate chart ID/,
  );
});

test("every dashboard build mode refreshes the catalogue", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  for (const scriptName of [
    "predev",
    "prebuild",
    "build:cloudflare",
    "build:cloudflare:linux",
  ]) {
    assert.match(
      packageJson.scripts[scriptName],
      /node scripts\/build-quorum-catalogue\.mjs/,
      `${scriptName} must refresh the Quorum catalogue`,
    );
  }
});

function nodeSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
