import { dashboardPackageSectionKey } from "../src/lib/dashboardPackageSelection.js";
import test from "node:test";
import assert from "node:assert/strict";
import { collaboratorPackage, attentionPackage, mappedPackage, synchronizedPackage } from "./helpers/dashboardPackageFixtures.js";
import { serializeDashboardBundle } from "../src/charting/config/dashboardBundleV3.js";
import { parseDashboardPackageCandidate } from "../src/lib/dashboardPackageCandidate.js";

test('selective merge and complete bundle round-trip retain legend placement and fractional offsets', async () => {
  const {buildDashboardPackageMerge}=await import('../src/lib/dashboardPackageMerge.js');
  const candidate=collaboratorPackage();
  candidate.config.pages[0].sections[0].panels[0].chart.presentation.legend={position:'left-bottom',offsetX:11.25,offsetY:-6.5};
  const proposal=buildDashboardPackageMerge({current:collaboratorPackage().config,candidate,selection:{placementIds:['placement-a']},destination:{scope:'placements',pageId:'overview',sectionId:'signals'}});
  assert.deepEqual(proposal.issues.filter(i=>i.blocking),[]);
  const parsed=parseDashboardPackageCandidate(JSON.stringify(serializeDashboardBundle(proposal.config)));
  assert.deepEqual(parsed.config.pages[0].sections[0].panels.at(-1).chart.presentation.legend,candidate.config.pages[0].sections[0].panels[0].chart.presentation.legend);
});

test("same-baseline authors keep independent charts sources placement identities and styling", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const current = collaboratorPackage({ value: 4 }).config;
  const candidate = collaboratorPackage({ value: 99 });
  const before = structuredClone(current);
  const result = buildDashboardPackageMerge({ current, candidate,
    selection: { placementIds: ["placement-a"] }, destination: { scope: "placements", pageId: "overview", sectionId: "signals" } });
  assert.deepEqual(result.issues.filter(issue => issue.blocking), []);
  assert.deepEqual(current, before);
  const imported = result.config.pages[0].sections[0].panels.at(-1);
  assert.notEqual(imported.id, imported.chart.id);
  assert.notEqual(imported.id, "placement-a");
  assert.notEqual(imported.chart.id, "chart-a");
  assert.equal(result.config.dataSources[imported.chart.sourceId].csvText, "date,value\n2026-08-21,99\n");
  assert.equal(result.config.dataSources.cases.csvText, "date,value\n2026-08-21,4\n");
  assert.deepEqual(imported.chart.presentation, candidate.config.pages[0].sections[0].panels[0].chart.presentation);
  assert.equal(imported.chart.title, "Cases (imported)");
  assert.equal(result.config.title, before.title);
  assert.deepEqual(result.config.pages[0].sections[0].panels.slice(0, 2), before.pages[0].sections[0].panels);
});

test("media closure is shared once and QMD remapping does not replace authored prose", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const current = collaboratorPackage().config;
  const candidate = collaboratorPackage({ staticPanels: true });
  const result = buildDashboardPackageMerge({ current, candidate,
    selection: { placementIds: ["placement-picture", "placement-text"] }, destination: { scope: "placements", pageId: "overview", sectionId: "signals" } });
  assert.deepEqual(result.issues.filter(issue => issue.blocking), []);
  assert.equal(Object.keys(result.assetPayloads).length, 1);
  assert.equal(Object.keys(result.config.contentLibrary.mediaItems).length, 1);
  const text = result.config.dataSources[result.identityMap.sources.text];
  assert.match(text.qmd, /Authored photo stays in prose: photo\./);
  assert.ok(text.qmd.includes(`simex-media:${result.identityMap.media.photo}`));
  assert.equal(text.qmd.includes("simex-media:photo)"), false);
});

test("pages retain order and stable identities across review retries; content adds no panels", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const current = collaboratorPackage().config, candidate = collaboratorPackage({ value: 44 });
  const first = buildDashboardPackageMerge({ current, candidate, selection: { pageIds: ["overview"] }, destination: { scope: "pages", position: "after", anchorId: "overview" } });
  const retry = buildDashboardPackageMerge({ current, candidate, selection: { pageIds: ["overview"] }, destination: { scope: "pages", position: "after", anchorId: "overview" }, identityMap: first.identityMap });
  assert.deepEqual(first.config, retry.config);
  assert.deepEqual(first.config.pages.map(p => p.id), ["overview", first.identityMap.pages.overview, "details"]);
  const content = buildDashboardPackageMerge({ current, candidate, selection: { sourceIds: ["cases"] }, destination: { scope: "content" } });
  assert.deepEqual(content.config.pages, current.pages);
  assert.equal(Object.keys(content.config.dataSources).length, 2);
});

test("stale destinations and unresolved drill links block an immutable proposal", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const current = collaboratorPackage().config, candidate = collaboratorPackage();
  candidate.config.pages[0].sections[0].panels[0].drill = { kind: "section", sectionId: "details-section" };
  const result = buildDashboardPackageMerge({ current, candidate, selection: { placementIds: ["placement-a"] }, destination: { scope: "placements", pageId: "removed", sectionId: "signals" } });
  assert.ok(result.issues.some(issue => issue.blocking && issue.code === "drill"));
  assert.ok(result.issues.some(issue => issue.blocking && issue.code === "destination"));
  const detached = buildDashboardPackageMerge({ current, candidate, selection: { placementIds: ["placement-a"] }, destination: { scope: "placements", pageId: "overview", sectionId: "signals" }, resolutions: { detachDrills: true } });
  assert.deepEqual(detached.issues.filter(issue => issue.blocking), []);
  assert.equal(Object.hasOwn(detached.config.pages[0].sections[0].panels.at(-1), "drill"), false);
});

test("Attention conversion requires an explicit drill-loss decision even for included targets", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const candidate = attentionPackage(), current = attentionPackage().config;
  const input = { current, candidate, selection: { sectionIds: [dashboardPackageSectionKey("overview", "attention"), dashboardPackageSectionKey("overview", "signals")] }, destination: { scope: "sections", pageId: "overview" } };
  const conflict = buildDashboardPackageMerge(input);
  assert.ok(conflict.issues.some(issue => issue.blocking && issue.code === "attention"));
  const converting = buildDashboardPackageMerge({ ...input, resolutions: { standardAttention: true } });
  assert.ok(converting.issues.some(issue => issue.blocking && issue.code === "converted-drill"));
  const accepted = buildDashboardPackageMerge({ ...input, resolutions: { standardAttention: true, detachConvertedDrills: true } });
  assert.deepEqual(accepted.issues.filter(issue => issue.blocking), []);
  const incoming = accepted.config.pages[0].sections.find(section => section.id === accepted.identityMap.sections[dashboardPackageSectionKey("overview", "attention")]);
  assert.equal(incoming.role, "standard");
  assert.equal(Object.hasOwn(incoming.panels[0], "drill"), false);
  assert.deepEqual(accepted.config.pages[0].sections[0], current.pages[0].sections[0]);
});

test("selected Chrono members retain an independent valid group without pulling in siblings", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const current = collaboratorPackage().config;
  const result = buildDashboardPackageMerge({ current, candidate: synchronizedPackage(), selection: { placementIds: ["placement-a"] }, destination: { scope: "placements", pageId: "overview", sectionId: "signals" } });
  assert.deepEqual(result.issues.filter(issue => issue.blocking), []);
  const group = result.config.chronoGroups[0];
  assert.notEqual(group.id, "clock");
  assert.deepEqual(group.members, [{ chartId: result.identityMap.charts["chart-a"], timeRole: "observation" }]);
  assert.equal(result.config.pages[0].sections[0].panels.at(-1).chart.interaction.timeSync, null, "canonical group membership is dashboard-owned; chart backlinks stay scrubbed");
  assert.ok(result.issues.some(issue => issue.code === "group-subset"));
});

test("sections and individual panels can create destinations atomically and retain source order", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const current = collaboratorPackage().config, candidate = collaboratorPackage();
  const sections = buildDashboardPackageMerge({ current, candidate, selection: { sectionIds: [dashboardPackageSectionKey("overview", "signals")] }, destination: { scope: "sections", newPageTitle: "Collaborator work" } });
  assert.deepEqual(sections.issues.filter(issue => issue.blocking), []);
  assert.equal(sections.config.pages.at(-1).title, "Collaborator work");
  assert.deepEqual(sections.config.pages.at(-1).sections[0].panels.map(p => p.chart.description), ["Authored description", "Authored description"]);
  const panels = buildDashboardPackageMerge({ current, candidate, selection: { placementIds: ["placement-b", "placement-a"] }, destination: { scope: "placements", pageId: "overview", newSectionTitle: "Combined" } });
  assert.deepEqual(panels.issues.filter(issue => issue.blocking), []);
  assert.deepEqual(panels.config.pages[0].sections.at(-1).panels.map(p => p.chart.id), [panels.identityMap.charts["chart-a"], panels.identityMap.charts["chart-b"]]);
});

test("map dependencies and copied media survive a combined-package round-trip", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const map = buildDashboardPackageMerge({ current: collaboratorPackage().config, candidate: mappedPackage(), selection: { placementIds: ["map-placement"] }, destination: { scope: "placements", pageId: "overview", sectionId: "signals" } });
  assert.deepEqual(map.issues.filter(issue => issue.blocking), []);
  const chart = map.config.pages[0].sections[0].panels.at(-1).chart;
  assert.equal(chart.presentation.map.geoSource, map.identityMap.sources.boundaries);
  const result = buildDashboardPackageMerge({ current: map.config, candidate: collaboratorPackage({ staticPanels: true }), selection: { placementIds: ["placement-picture", "placement-text"] }, destination: { scope: "placements", pageId: "overview", sectionId: "signals" } });
  const roundtrip = parseDashboardPackageCandidate(JSON.stringify(serializeDashboardBundle(result.config, { assetPayloads: result.assetPayloads })));
  assert.deepEqual(roundtrip.config.pages, result.config.pages);
  assert.equal(Object.keys(roundtrip.assetPayloads).length, 1);
});

test("asset admission budgets only selected dependencies and the combined unique manifest", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const current = collaboratorPackage().config, candidate = collaboratorPackage({ staticPanels: true });
  const huge = { mediaType: "image/png", width: 2, height: 3, byteLength: 200 * 1024 * 1024, sha256: "a".repeat(64), storageState: "durable" };
  candidate.config.assets.unselected = huge;
  const subset = buildDashboardPackageMerge({ current, candidate, selection: { sourceIds: ["cases"] }, destination: { scope: "content" } });
  assert.deepEqual(subset.issues.filter(issue => issue.blocking), []);
  assert.deepEqual(subset.config.pages, current.pages);
  const blocked = buildDashboardPackageMerge({ current: { ...current, assets: { existing: huge } }, candidate, selection: { mediaIds: ["photo"] }, destination: { scope: "content" } });
  assert.ok(blocked.issues.some(issue => issue.blocking && issue.code === "budget"));
  const reused = buildDashboardPackageMerge({ current: collaboratorPackage({ staticPanels: true }).config, candidate: collaboratorPackage({ staticPanels: true }), selection: { mediaIds: ["photo"] }, destination: { scope: "content" } });
  assert.deepEqual(reused.issues.filter(issue => issue.blocking), []);
  assert.equal(Object.keys(reused.assetPayloads).length, 0);
  assert.equal(reused.reusedAssetIds.length, 1);
  assert.equal(Object.keys(reused.config.contentLibrary.mediaItems).length, 2, "mutable media identities stay independent");
});

test("copying an Attention page preserves every included internal drill without a loss choice", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const config = structuredClone(attentionPackage().config);
  const second = structuredClone(config.pages[0].sections[0].panels[0]);
  second.id = "second-kpi-placement"; second.chart.id = "second-kpi-chart"; second.chart.title = "Another KPI";
  second.drill = { kind: "chart", chartId: "chart-b" };
  config.pages[0].sections[0].panels.push(second);
  const candidate = parseDashboardPackageCandidate(JSON.stringify(serializeDashboardBundle(config)));
  const result = buildDashboardPackageMerge({ current: collaboratorPackage().config, candidate, selection: { pageIds: ["overview"] }, destination: { scope: "pages" } });
  assert.deepEqual(result.issues.filter(issue => issue.blocking), []);
  const panels = result.config.pages.at(-1).sections[0].panels;
  assert.deepEqual(panels.map(p => p.drill), [
    { kind: "section", sectionId: result.identityMap.sections[dashboardPackageSectionKey("overview", "signals")] },
    { kind: "chart", chartId: result.identityMap.charts["chart-b"] },
  ]);
});

test("mixed append coalesces same-named pages and sections while keeping existing data and metadata", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const current = collaboratorPackage({ value: 4 }).config, candidate = collaboratorPackage({ value: 99 });
  const before = structuredClone(current);
  const result = buildDashboardPackageMerge({ current, candidate, selection: { pageIds: ["overview"] }, destination: { scope: "mixed" } });
  assert.deepEqual(result.issues.filter(i => i.blocking), []);
  assert.equal(result.config.pages.length, 2);
  assert.equal(result.config.pages[0].id, "overview");
  assert.equal(result.config.pages[0].sections.length, 1);
  assert.deepEqual(result.config.pages[0].sections[0].panels.slice(0, 2), before.pages[0].sections[0].panels);
  const imported = result.config.pages[0].sections[0].panels.slice(2);
  assert.equal(imported.length, 2);
  assert.notEqual(imported[0].chart.sourceId, "cases");
  assert.equal(result.config.dataSources[imported[0].chart.sourceId].csvText, "date,value\n2026-08-21,99\n");
  assert.equal(result.identityMap.pages.overview, "overview");
  assert.equal(result.identityMap.sections[dashboardPackageSectionKey("overview", "signals")], "signals");
  assert.deepEqual(current, before);
});

test("mixed page section panel and independent content selection imports every placement once", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const candidate = collaboratorPackage({ staticPanels: true });
  candidate.config.pages[0].title = "Collaborator page";
  const sectionKey = dashboardPackageSectionKey("details", "details-section");
  const result = buildDashboardPackageMerge({ current: collaboratorPackage().config, candidate,
    selection: { pageIds: ["overview"], sectionIds: [sectionKey], placementIds: ["placement-a"], mediaIds: ["photo"] },
    destination: { scope: "mixed", sectionTargets: { [sectionKey]: { pageId: "details" } } } });
  assert.deepEqual(result.issues.filter(i => i.blocking), []);
  assert.equal(result.summary.placements.length, 4);
  assert.equal(result.config.pages.length, 3);
  assert.equal(result.config.pages.at(-1).sections[0].panels.length, 4);
  assert.equal(result.config.pages[1].sections.length, 1);
  assert.equal(result.summary.media.length, 1);
  const roundtrip = parseDashboardPackageCandidate(JSON.stringify(serializeDashboardBundle(result.config, { assetPayloads: result.assetPayloads })));
  assert.deepEqual(roundtrip.config.pages, result.config.pages);
});

test("orphan sections and panel batches require explicit current destinations", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const candidate = collaboratorPackage();
  const key = dashboardPackageSectionKey("overview", "signals");
  const section = buildDashboardPackageMerge({ current: collaboratorPackage().config, candidate,
    selection: { sectionIds: [key] }, destination: { scope: "mixed" } });
  assert.ok(section.issues.some(i => i.code === "destination-required" && i.blocking));
  assert.equal(section.requirements[0].kind, "section");
  const panel = buildDashboardPackageMerge({ current: collaboratorPackage().config, candidate,
    selection: { placementIds: ["placement-a", "placement-b"] }, destination: { scope: "mixed" } });
  assert.equal(panel.requirements.length, 1, "one current section choice applies to the source-section batch");
  assert.equal(panel.requirements[0].kind, "placements");
  const result = buildDashboardPackageMerge({ current: collaboratorPackage().config, candidate,
    selection: { placementIds: ["placement-a", "placement-b"] },
    destination: { scope: "mixed", placementTargets: { [key]: { pageId: "details", sectionId: "details-section" } } }, identityMap: panel.identityMap });
  assert.deepEqual(result.issues.filter(i => i.blocking), []);
  assert.equal(result.config.pages[1].sections[0].panels.length, 2);
  assert.equal(result.config.pages[0].sections[0].panels.length, 2);
});

test("ambiguous synonymous pages require a target and never silently pick the first", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const current = collaboratorPackage().config;
  current.pages[1].title = current.pages[1].label = "Overview";
  const candidate = collaboratorPackage();
  const blocked = buildDashboardPackageMerge({ current, candidate, selection: { pageIds: ["overview"] }, destination: { scope: "mixed" } });
  assert.ok(blocked.issues.some(i => i.code === "destination-required" && i.blocking));
  assert.notEqual(blocked.requirements[0].pageOptions[0].label, blocked.requirements[0].pageOptions[1].label);
  const result = buildDashboardPackageMerge({ current, candidate, selection: { pageIds: ["overview"] },
    destination: { scope: "mixed", pageTargets: { overview: "details" } } });
  assert.deepEqual(result.issues.filter(i => i.blocking), []);
  assert.equal(result.config.pages[0].sections[0].panels.length, 2);
  assert.equal(result.config.pages[1].sections.at(-1).panels.length, 2);
});

test("mixed merge remaps internal drill sections to coalesced containers", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const result = buildDashboardPackageMerge({ current: collaboratorPackage().config, candidate: attentionPackage(),
    selection: { pageIds: ["overview"] }, destination: { scope: "mixed" } });
  assert.deepEqual(result.issues.filter(i => i.blocking), []);
  assert.equal(result.config.pages[0].sections.at(-1).panels[0].drill.sectionId, "signals");
  assert.equal(result.config.pages[0].sections[0].panels.length, 4);
});

test("review retry accepts coalesced container identities but never a colliding new container", async () => {
  const { buildDashboardPackageMerge, createDashboardPackageIdentityMap } = await import("../src/lib/dashboardPackageMerge.js");
  const current = collaboratorPackage().config, candidate = collaboratorPackage({ value: 55 });
  const args = { current, candidate, selection: { pageIds: ["overview"] }, destination: { scope: "mixed" } };
  const first = buildDashboardPackageMerge(args);
  const retry = buildDashboardPackageMerge({ ...args, identityMap: first.identityMap });
  assert.deepEqual(retry.issues.filter(i => i.blocking), []);
  assert.deepEqual(retry.config, first.config);
  candidate.config.pages[0].title = "Independent page";
  const map = createDashboardPackageIdentityMap(candidate);
  map.pages.overview = "overview";
  const collision = buildDashboardPackageMerge({ ...args, candidate, identityMap: map });
  assert.ok(collision.issues.some(i => i.blocking && i.code === "identity"));
});

test("ambiguous same-name sections use only the explicitly chosen section in its target page", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const current = collaboratorPackage().config, candidate = collaboratorPackage();
  current.pages[0].sections.push({ id: "other-signals", title: "Signals", panels: [] });
  const key = dashboardPackageSectionKey("overview", "signals");
  const args = { current, candidate, selection: { pageIds: ["overview"] }, destination: { scope: "mixed" } };
  assert.ok(buildDashboardPackageMerge(args).requirements.some(r => r.kind === "section" && !r.resolved));
  const result = buildDashboardPackageMerge({ ...args, destination: { scope: "mixed", sectionTargets: { [key]: { sectionId: "other-signals" } } } });
  assert.deepEqual(result.issues.filter(i => i.blocking), []);
  assert.equal(result.config.pages[0].sections[0].panels.length, 2);
  assert.equal(result.config.pages[0].sections[1].panels.length, 2);
});

test("orphan panels can still create explicit new destinations with stable transaction identities", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const key = dashboardPackageSectionKey("overview", "signals");
  const args = { current: collaboratorPackage().config, candidate: collaboratorPackage(), selection: { placementIds: ["placement-a"] },
    destination: { scope: "mixed", placementTargets: { [key]: { newPageTitle: "Collaborator notes" } } } };
  const first = buildDashboardPackageMerge(args);
  assert.deepEqual(first.issues.filter(i => i.blocking), []);
  assert.equal(first.config.pages.at(-1).title, "Collaborator notes");
  assert.equal(first.config.pages.at(-1).sections[0].title, "Imported charts");
  assert.equal(first.config.pages.at(-1).sections[0].panels.length, 1);
  const retry = buildDashboardPackageMerge({ ...args, identityMap: first.identityMap });
  assert.deepEqual(first.config, retry.config);
  const removed = buildDashboardPackageMerge({ ...args, destination: { scope: "mixed", placementTargets: { [key]: { pageId: "gone", sectionId: "gone" } } } });
  assert.ok(removed.issues.some(i => i.blocking && i.code === "destination-required"));
});

test("section names are scoped to their target page and subsequent imports append into that exact section", async () => {
  const { buildDashboardPackageMerge } = await import("../src/lib/dashboardPackageMerge.js");
  const candidate = collaboratorPackage();
  const args = { candidate, selection: { sectionIds: [dashboardPackageSectionKey("overview", "signals")] },
    destination: { scope: "mixed", sectionTargets: { [dashboardPackageSectionKey("overview", "signals")]: { pageId: "details" } } } };
  const first = buildDashboardPackageMerge({ ...args, current: collaboratorPackage().config });
  assert.deepEqual(first.issues.filter(i => i.blocking), []);
  assert.equal(first.config.pages[1].sections.at(-1).title, "Signals");
  const second = buildDashboardPackageMerge({ ...args, current: first.config });
  assert.deepEqual(second.issues.filter(i => i.blocking), []);
  assert.equal(second.config.pages[1].sections.length, 2);
  assert.equal(second.config.pages[1].sections.at(-1).panels.length, 4);
});
