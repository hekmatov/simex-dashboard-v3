import assert from "node:assert/strict";
import test from "node:test";

import * as journeyModule from "./e2e/support/dashboard-surface-manifest.js";
import * as journeyStyleModule from "../src/theme/dashboardSurfaceRoles.js";
import * as regionModule from "../src/theme/dashboardRegionRegistry.js";

const STYLE_IDS = ["ledger", "humanist", "instrument"];

test("the historical 71-entry catalogue is explicitly journey execution accounting", () => {
  assert.equal(journeyModule.DASHBOARD_JOURNEY_MANIFEST, journeyModule.DASHBOARD_SURFACE_MANIFEST);
  assert.equal(typeof journeyModule.summarizeDashboardJourneyManifest, "function");

  const summary = journeyModule.summarizeDashboardJourneyManifest();
  assert.deepEqual({
    total: summary.total,
    executable: summary.executable,
    coverageAliases: summary.coverageAliases,
    intentionallyOutOfScope: summary.intentionallyOutOfScope,
  }, {
    total: 71,
    executable: 64,
    coverageAliases: 6,
    intentionallyOutOfScope: 1,
  });
});

test("journey/style cells identify their accounting boundary instead of claiming region completeness", () => {
  assert.equal(typeof journeyStyleModule.buildDashboardJourneyStyleDispositionMatrix, "function");
  const matrix = journeyStyleModule.buildDashboardJourneyStyleDispositionMatrix(
    journeyModule.DASHBOARD_JOURNEY_MANIFEST,
  );

  assert.equal(matrix.length, 213);
  assert.equal(matrix.every(({ accounting }) => accounting === "journey-style"), true);
  assert.equal(matrix.every(({ journeyId }) => typeof journeyId === "string" && journeyId.length > 0), true);
  assert.deepEqual([...new Set(matrix.map(({ style }) => style))], STYLE_IDS);
});

test("owned-region/style accounting is generated from region variants, not journey IDs", () => {
  assert.equal(typeof regionModule.buildDashboardRegionStyleDispositionMatrix, "function");
  const matrix = regionModule.buildDashboardRegionStyleDispositionMatrix();

  assert.equal(matrix.length, regionModule.DASHBOARD_OWNED_REGION_REGISTRY.length * STYLE_IDS.length);
  assert.equal(matrix.every(({ accounting }) => accounting === "region-style"), true);
  assert.equal(matrix.every(({ regionId }) => regionModule.DASHBOARD_OWNED_REGION_REGISTRY
    .some(({ id }) => id === regionId)), true);
  assert.deepEqual([...new Set(matrix.map(({ style }) => style))], STYLE_IDS);
  assert.equal(matrix.some(({ journeyId }) => journeyId !== undefined), false);
});
