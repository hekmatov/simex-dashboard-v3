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
  const digest = createHash("sha256")
    .update(catalogueModule.canonicalCatalogueBytes(first))
    .digest("hex");
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
  assert.deepEqual(persisted, { ...first, digest });
  assert.match(persisted.digest, /^[0-9a-f]{64}$/);
  assert.deepEqual(
    catalogueModule.canonicalCatalogueBytes(first),
    catalogueModule.canonicalCatalogueBytes(second),
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
