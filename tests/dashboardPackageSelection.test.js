import { dashboardPackageSectionKey } from "../src/lib/dashboardPackageSelection.js";
import test from "node:test";
import assert from "node:assert/strict";
import { collaboratorPackage, mappedPackage } from "./helpers/dashboardPackageFixtures.js";
import { packageChart } from "./helpers/dashboardPackageFixtures.js";
import { serializeDashboardBundle } from "../src/charting/config/dashboardBundleV3.js";
import { parseDashboardPackageCandidate } from "../src/lib/dashboardPackageCandidate.js";

test("overlapping page section and placement selections include each authored placement once", async () => {
  const { buildDashboardPackageImportInventory, resolveDashboardPackageSelection } = await import("../src/lib/dashboardPackageSelection.js");
  const candidate = collaboratorPackage();
  assert.equal(buildDashboardPackageImportInventory(candidate).placements.length, 2);
  const selected = resolveDashboardPackageSelection(candidate, { pageIds: ["overview"], sectionIds: [dashboardPackageSectionKey("overview", "signals")], placementIds: ["placement-a"] });
  assert.deepEqual(selected.placementIds, ["placement-a", "placement-b"]);
  assert.deepEqual(selected.sourceIds, ["cases"]);
  assert.deepEqual(selected.pageIds, ["overview"]);
});

test("content-only selection includes a source without importing its consumers", async () => {
  const { resolveDashboardPackageSelection } = await import("../src/lib/dashboardPackageSelection.js");
  const selected = resolveDashboardPackageSelection(collaboratorPackage(), { sourceIds: ["cases"] });
  assert.deepEqual(selected.placementIds, []);
  assert.deepEqual(selected.sourceIds, ["cases"]);
  assert.deepEqual(selected.pageIds, []);
});

test("text and image selection closes over shared media and authored bytes once", async () => {
  const { resolveDashboardPackageSelection } = await import("../src/lib/dashboardPackageSelection.js");
  const candidate = collaboratorPackage({ staticPanels: true });
  const selected = resolveDashboardPackageSelection(candidate, { placementIds: ["placement-picture", "placement-text"] });
  assert.deepEqual(selected.sourceIds, ["picture", "text"]);
  assert.deepEqual(selected.mediaIds, ["photo"]);
  assert.equal(selected.assetIds.length, 1);
  assert.equal(selected.sourceIds.includes("cases"), false);
  assert.deepEqual(selected.issues, []);
});

test("outbound drill references are explicit decisions instead of silently dropped", async () => {
  const { resolveDashboardPackageSelection } = await import("../src/lib/dashboardPackageSelection.js");
  const candidate = collaboratorPackage();
  candidate.config.pages[0].sections[0].panels[0].drill = { kind: "section", sectionId: "details-section" };
  const selected = resolveDashboardPackageSelection(candidate, { placementIds: ["placement-a"] });
  assert.equal(selected.externalReferences[0].kind, "drill");
  assert.equal(selected.externalReferences[0].targetId, "details-section");
});

test("a selected map includes its geometry and join dataset without its sibling charts", async () => {
  const { resolveDashboardPackageSelection } = await import("../src/lib/dashboardPackageSelection.js");
  const selected = resolveDashboardPackageSelection(mappedPackage(), { placementIds: ["map-placement"] });
  assert.deepEqual(selected.sourceIds, ["boundaries", "cases"]);
  assert.deepEqual(selected.placementIds, ["map-placement"]);
  assert.deepEqual(selected.issues, []);
});

test("equal section IDs on different source pages remain separate selectable objects", async () => {
  const { buildDashboardPackageImportInventory, resolveDashboardPackageSelection } = await import("../src/lib/dashboardPackageSelection.js");
  const config = structuredClone(collaboratorPackage().config);
  config.pages[1].sections[0] = { id: "signals", title: "Second-page signals", panels: [{ id: "placement-c", chart: packageChart("chart-c", "Separate work") }] };
  const candidate = parseDashboardPackageCandidate(JSON.stringify(serializeDashboardBundle(config)));
  const inventory = buildDashboardPackageImportInventory(candidate);
  assert.notEqual(inventory.sections[0].id, inventory.sections[1].id, "section identity includes its owning source page");
  const selected = resolveDashboardPackageSelection(candidate, { sectionIds: [inventory.sections[1].id] });
  assert.deepEqual(selected.placementIds, ["placement-c"]);
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const merged = buildDashboardPackageMerge({ current: collaboratorPackage().config, candidate, selection: { sectionIds: [inventory.sections[1].id] }, destination: { scope: "sections", pageId: "overview" } });
  assert.deepEqual(merged.issues.filter(issue => issue.blocking), []);
  assert.equal(merged.config.pages[0].sections.at(-1).panels.length, 1);
  assert.equal(merged.config.pages[0].sections.at(-1).panels[0].chart.title, "Separate work");
});

test("three-mode import retains manual content independently of chart dependency selection", async () => {
  const { dashboardPackageSelectionState } = await import("../src/lib/dashboardPackageSelection.js");
  assert.equal(typeof dashboardPackageSelectionState, "function");
  const candidate = collaboratorPackage({ staticPanels: true });
  const manual = { mediaIds: ["photo"], sourceIds: ["cases"], placementIds: ["placement-text"] };
  const selected = dashboardPackageSelectionState(candidate, manual);
  assert.deepEqual(selected.automaticMediaIds, ["photo"]);
  assert.equal(selected.resolved.mediaIds.includes("photo"), true);
  assert.equal(selected.automaticSourceIds.includes("cases"), false);
  const unselectedChart = dashboardPackageSelectionState(candidate, { ...manual, placementIds: [] });
  assert.deepEqual(unselectedChart.resolved.mediaIds, ["photo"]);
  assert.deepEqual(unselectedChart.resolved.sourceIds, ["cases"]);
  assert.deepEqual(manual, { mediaIds: ["photo"], sourceIds: ["cases"], placementIds: ["placement-text"] });
  assert.deepEqual(dashboardPackageSelectionState(candidate, { placementIds: [] }).resolved.mediaIds, []);
});

test("Full Append includes all importable hierarchy and unused reusable content without consuming partial choices", async () => {
  const { dashboardPackageSelectionState } = await import("../src/lib/dashboardPackageSelection.js");
  assert.equal(typeof dashboardPackageSelectionState, "function");
  const candidate = collaboratorPackage({ staticPanels: true });
  const partial = { mediaIds: ["photo"] };
  const full = dashboardPackageSelectionState(candidate, partial, "append");
  assert.deepEqual(full.resolved.pageIds, ["overview", "details"]);
  assert.equal(full.resolved.placementIds.length, 4);
  assert.deepEqual(full.resolved.mediaIds, ["photo"]);
  assert.deepEqual(dashboardPackageSelectionState(candidate, partial).resolved.pageIds, []);
  assert.deepEqual(partial, { mediaIds: ["photo"] });
});
