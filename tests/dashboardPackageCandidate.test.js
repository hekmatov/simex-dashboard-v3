import assert from "node:assert/strict";
import test from "node:test";

import { serializeDashboardBundle } from "../src/charting/config/dashboardBundleV3.js";
import { parseDashboardPackageCandidate } from "../src/lib/dashboardPackageCandidate.js";

function chart(overrides = {}) {
  return {
    configVersion: 3,
    id: "cases",
    typeId: "line",
    title: "Cases",
    description: "Cases over time.",
    sourceId: "cases-source",
    roles: {
      measurements: [{ field: "cases", axis: "primary" }],
      observation: { field: "reportedAt", interpretation: "temporal" },
    },
    transformations: {
      filters: [],
      grouping: null,
      aggregation: "sum",
      duplicates: "aggregate",
      missingValues: "gap",
    },
    presentation: { title: { align: "left" }, collection: null },
    interaction: { zoom: { enabled: true }, timeSync: null },
    layout: { size: "wide" },
    ...overrides,
  };
}

function dashboard() {
  return {
    configVersion: 3,
    timezone: "UTC",
    id: "candidate-dashboard",
    title: "Candidate dashboard",
    dataSources: {
      "cases-source": {
        kind: "dataset",
        type: "uploadedCsv",
        fileName: "cases.csv",
        csvText: "reportedAt,cases\n2026-08-21,4\n",
        parsingMetadata: {
          reportedAt: { interpretation: "temporal", format: "YYYY-MM-DD" },
          cases: { interpretation: "numeric" },
        },
        provenance: { label: "Exercise control" },
        fingerprint: "candidate-cases",
      },
    },
    timeSyncGroups: [],
    pages: [
      {
        id: "home",
        label: "Home",
        sections: [{
          id: "overview",
          title: "Overview",
          panels: [{ id: "cases_panel", chart: chart() }],
        }],
      },
      {
        id: "details",
        title: "Details",
        sections: [{ id: "details_section", title: "Detail", panels: [] }],
      },
    ],
  };
}

test("a V3 bundle candidate retains its creation time and complete nested manifest", () => {
  const bundle = serializeDashboardBundle(dashboard(), {
    now: "2026-08-21T09:10:11.000Z",
  });
  const candidate = parseDashboardPackageCandidate(JSON.stringify(bundle));

  assert.equal(candidate.exportedAt, "2026-08-21T09:10:11.000Z");
  assert.deepEqual(candidate.summary.pages, [
    {
      id: "home",
      name: "Home",
      sections: [{
        id: "overview",
        name: "Overview",
        panels: [{ id: "cases_panel", chartId: "cases", name: "Cases" }],
      }],
    },
    {
      id: "details",
      name: "Details",
      sections: [{
        id: "details_section",
        name: "Detail",
        panels: [],
      }],
    },
  ]);
  assert.equal(Object.isFrozen(candidate.summary.pages[0].sections[0].panels[0]), true);
});

test("a raw valid V3 configuration is reviewable without a creation timestamp", () => {
  const candidate = parseDashboardPackageCandidate(JSON.stringify(dashboard()));
  assert.equal(candidate.exportedAt, null);
  assert.equal(candidate.config.configVersion, 3);
  assert.equal(candidate.summary.pages[0].name, "Home");
});

test("an invalid package preserves the authoritative V3 validation error", () => {
  assert.throws(
    () => parseDashboardPackageCandidate(JSON.stringify({
      bundleType: "simex-dashboard-bundle",
      version: 2,
      metadata: { exportedAt: null },
      config: dashboard(),
    })),
    /version 3 bundles only/i,
  );
});
