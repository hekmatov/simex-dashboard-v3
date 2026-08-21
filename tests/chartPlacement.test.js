import assert from "node:assert/strict";
import test from "node:test";

import { resolveDestination } from "../src/charting/forms/chartDestination.js";
import { planIdentityPlacement } from "../src/charting/forms/chartPlacement.js";

test("append is the default and emits ordered nonvisual placement equivalence", () => {
  const dashboard = dashboardFixture();
  const destination = destinationFor(dashboard);
  const proof = planIdentityPlacement({
    destination,
    chartId: "chart-new",
    presets: presetFixture(),
  }, dashboard);

  assert.equal(proof.status, "valid");
  assert.equal(proof.position, "append");
  assert.deepEqual(proof.projectedChartIds, ["chart-alpha", "chart-beta", "chart-new"]);
  assert.match(proof.orderedText, /Page: Biomedical\. Section: Surveillance\./);
  assert.match(proof.orderedText, /Placement: append\./);
  assert.match(proof.orderedText, /Width: Wide \(2 columns\)\. Height: Standard \(1 row\)\./);
  assert.match(proof.orderedText, /Projected reading order: Cases, Capacity, New chart\./);
  assert.equal(typeof proof.revision, "string");
  assert.equal(proof.destinationRevision, destination.revision);
  assert.deepEqual(proof.errors, []);
});

test("before and after placement resolve from anchor identity rather than ordinal", () => {
  const dashboard = dashboardFixture();
  const destination = destinationFor(dashboard);
  const before = planIdentityPlacement({
    destination,
    chartId: "chart-new",
    anchorChartId: "chart-beta",
    position: "before",
    presets: presetFixture(),
  }, dashboard);
  assert.deepEqual(before.projectedChartIds, ["chart-alpha", "chart-new", "chart-beta"]);
  assert.match(before.orderedText, /Placement: before Capacity \(chart-beta\)\./);

  const after = planIdentityPlacement({
    destination,
    chartId: "chart-new",
    anchorChartId: "chart-alpha",
    position: "after",
    presets: presetFixture(),
  }, dashboard);
  assert.deepEqual(after.projectedChartIds, ["chart-alpha", "chart-new", "chart-beta"]);
  assert.match(after.orderedText, /Placement: after Cases \(chart-alpha\)\./);
});

test("removed and cross-section anchors remain named invalid choices with no append fallback", () => {
  const dashboard = dashboardFixture();
  const destination = destinationFor(dashboard);
  const removed = planIdentityPlacement({
    destination,
    chartId: "chart-new",
    anchorChartId: "chart-removed",
    position: "before",
    presets: presetFixture(),
  }, dashboard);
  assert.equal(removed.status, "invalid");
  assert.equal(removed.anchorChartId, "chart-removed");
  assert.equal(removed.position, "before");
  assert.equal(removed.errors[0].code, "PLACEMENT_ANCHOR_MISSING");
  assert.equal(removed.projectedChartIds, null);

  const crossSection = planIdentityPlacement({
    destination,
    chartId: "chart-new",
    anchorChartId: "chart-gamma",
    position: "after",
    presets: presetFixture(),
  }, dashboard);
  assert.equal(crossSection.status, "invalid");
  assert.equal(crossSection.errors[0].code, "PLACEMENT_ANCHOR_OUTSIDE_DESTINATION");
  assert.equal(crossSection.projectedChartIds, null);
});

test("current section order reprojects around a surviving anchor and stales an old acknowledgement", () => {
  const dashboard = dashboardFixture();
  const destination = destinationFor(dashboard);
  const initial = planIdentityPlacement({
    destination,
    chartId: "chart-new",
    anchorChartId: "chart-beta",
    position: "after",
    presets: presetFixture(),
  }, dashboard);

  const reordered = structuredClone(dashboard);
  reordered.pages[0].sections[0].panels.reverse();
  const currentDestination = destinationFor(reordered);
  const moved = planIdentityPlacement({
    destination: currentDestination,
    chartId: "chart-new",
    anchorChartId: "chart-beta",
    position: "after",
    presets: { ...presetFixture(), acknowledgedRevision: initial.revision },
  }, reordered);

  assert.deepEqual(initial.projectedChartIds, ["chart-alpha", "chart-beta", "chart-new"]);
  assert.deepEqual(moved.projectedChartIds, ["chart-beta", "chart-new", "chart-alpha"]);
  assert.notEqual(moved.revision, initial.revision);
  assert.equal(moved.status, "invalid");
  assert.equal(moved.errors.at(-1).code, "PLACEMENT_ACKNOWLEDGEMENT_STALE");
});

test("duplicate chart identity and invalid presets block placement proof", () => {
  const dashboard = dashboardFixture();
  const destination = destinationFor(dashboard);
  const duplicate = planIdentityPlacement({
    destination,
    chartId: "chart-alpha",
    presets: presetFixture(),
  }, dashboard);
  assert.equal(duplicate.status, "invalid");
  assert.equal(duplicate.errors[0].code, "CHART_ID_DUPLICATE");

  const badWidth = planIdentityPlacement({
    destination,
    chartId: "chart-new",
    presets: { ...presetFixture(), selectedWidth: "unsupported" },
  }, dashboard);
  assert.equal(badWidth.status, "invalid");
  assert.equal(badWidth.errors[0].code, "WIDTH_PRESET_UNSUPPORTED");

  const missingHeightCatalogue = planIdentityPlacement({
    destination,
    chartId: "chart-new",
    presets: { ...presetFixture(), heights: [] },
  }, dashboard);
  assert.equal(missingHeightCatalogue.status, "invalid");
  assert.equal(missingHeightCatalogue.errors[0].code, "HEIGHT_PRESET_UNAVAILABLE");
});

test("empty destinations produce a valid one-panel projection without mutating dashboard geometry", () => {
  const dashboard = dashboardFixture();
  dashboard.pages[0].sections[0].panels = [];
  const before = structuredClone(dashboard);
  const destination = destinationFor(dashboard);
  const proof = planIdentityPlacement({
    destination,
    chartId: "chart-new",
    presets: presetFixture(),
  }, dashboard);

  assert.equal(proof.status, "valid");
  assert.deepEqual(proof.projectedChartIds, ["chart-new"]);
  assert.deepEqual(proof.affectedNeighbourIds, []);
  assert.deepEqual(dashboard, before);
  assert.equal(Object.hasOwn(dashboard.pages[0].sections[0], "projectedPanels"), false);
});

test("reflow projection lists only saved neighbours whose canonical grid slot changes", () => {
  const dashboard = dashboardFixture();
  const before = structuredClone(dashboard);
  const destination = destinationFor(dashboard);
  const proof = planIdentityPlacement({
    destination,
    chartId: "chart-new",
    anchorChartId: "chart-alpha",
    position: "before",
    presets: presetFixture(),
  }, dashboard);

  assert.deepEqual(proof.affectedNeighbourIds, ["chart-alpha", "chart-beta"]);
  assert.match(proof.orderedText, /Affected neighbours in projected reading order: Cases, Capacity\./);
  assert.deepEqual(dashboard, before);
});

test("placement proof revision updates independently and leaves render proof identity unchanged", () => {
  const dashboard = dashboardFixture();
  const destination = destinationFor(dashboard);
  const renderProofRevision = Object.freeze({ revision: "render-7", status: "valid" });
  const wizardState = { renderProofRevision, placementProofRevision: null };
  const placementProofRevision = planIdentityPlacement({
    destination,
    chartId: "chart-new",
    presets: presetFixture(),
  }, dashboard);
  const next = { ...wizardState, placementProofRevision };

  assert.notStrictEqual(next.placementProofRevision, wizardState.placementProofRevision);
  assert.strictEqual(next.renderProofRevision, renderProofRevision);
  assert.equal(next.placementProofRevision.destinationRevision, destination.revision);
  assert.equal(Object.hasOwn(next.placementProofRevision, "renderProofRevision"), false);
});

function destinationFor(dashboard) {
  return resolveDestination({ pageId: "page-a", sectionId: "section-a" }, dashboard);
}

function presetFixture() {
  return {
    columns: 2,
    widths: [
      { id: "standard", label: "Standard", columns: 1 },
      { id: "wide", label: "Wide", columns: 2, default: true },
    ],
    heights: [
      { id: "short", label: "Short", rows: 1 },
      { id: "standard", label: "Standard", rows: 1, default: true },
      { id: "tall", label: "Tall", rows: 2 },
    ],
    selectedWidth: "wide",
    selectedHeight: "standard",
  };
}

function dashboardFixture() {
  return {
    id: "dashboard-1",
    pages: [
      {
        id: "page-a",
        label: "Biomedical",
        pageType: "dashboard",
        sections: [
          {
            id: "section-a",
            title: "Surveillance",
            panels: [
              { id: "panel-alpha", chart: { id: "chart-alpha", title: "Cases", layout: { size: "standard" } } },
              { id: "panel-beta", chart: { id: "chart-beta", title: "Capacity", layout: { size: "standard" } } },
            ],
          },
          {
            id: "section-b",
            title: "Response",
            panels: [{ id: "panel-gamma", chart: { id: "chart-gamma", title: "Teams", layout: { size: "standard" } } }],
          },
        ],
      },
    ],
  };
}
