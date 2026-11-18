import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { normalizeDashboardBoundary, serializeDashboardBundle, parseDashboardBundle } from "../src/charting/config/dashboardBundleV3.js";
import { loadDashboardConfig, loadDashboardConfigProgressively } from "../src/lib/loadDashboard.js";
import { buildChartCatalogue } from "../src/lib/quorumCatalogue.js";
import { prepareStaticPanelTransaction } from "../src/static-content/staticPanelTransaction.js";
import { migrateDashboardV6ToV7 } from "../src/charting/config/migrateDashboardV6ToV7.js";
import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { buildChronoGroupClock } from "../src/charting/time/chronoGroupModel.js";
import { buildStorylineClock } from "../src/charting/time/playbackPageScope.js";
import { buildStorylineCoverage } from "../src/components/time/storylineAuthoring.js";
import { deriveTemporalContentItems, deriveTemporalNeedsAttention } from "../src/charting/time/temporalNeedsAttention.js";

const exact = { policy: "exact" }, latest = { policy: "lastKnown" };
const period = { start: "2027-03-01", end: "2027-08-01" };
const chart = id => ({ id, sourceId: `source-${id}`, roles: { observation: { field: "date", interpretation: "temporal" } }, interaction: { timeSync: null } });
const group = (id, ids, matching = exact) => ({ id, name: id, period, matching, secondsPerFrame: 2,
  members: ids.map(chartId => ({ chartId, timeRole: "observation" })) });
const dashboard = (charts, chronoGroups = [], scenes = []) => ({ configVersion: 6, timezone: "UTC",
  pages: [{ id: "page", sections: [{ id: "section", panels: charts }] }], chronoGroups, scenes });

async function archivedYearGroupFixture() {
  const input = JSON.parse(await readFile(new URL("./fixtures/legacy-contract-dashboard.json", import.meta.url), "utf8"));
  const profiles = JSON.parse(await readFile(new URL("./fixtures/legacy-contract-profiles.json", import.meta.url), "utf8"));
  const aliases = JSON.parse(await readFile(new URL("./fixtures/legacy-contract-aliases.json", import.meta.url), "utf8"));
  input.chronoGroups = [
    { id: "page-removal-biomedical-group", name: "Biomedical page group", period: { start: "2027-02-14", end: "2027-02-21" }, matching: exact, secondsPerFrame: 1,
      members: ["chart-line-mtgz6v76", "chart-line-mtgytrwj"].map(chartId => ({ chartId, timeRole: "observation" })) },
    { id: "page-removal-socio-group", name: "Socio-economic page group", period: { start: "2021-01-01", end: "2027-12-31" }, matching: exact, secondsPerFrame: 1,
      members: [{ chartId: "chart-line-a01a017d-96f1-440b-b24a-bcf2e30da1cc", timeRole: "observation" }] },
  ];
  const portable = {};
  for (const [id, source] of Object.entries(input.dataSources)) {
    if (source.kind === "csv") portable[id] = { kind: "csv", text: await readFile(new URL(`../public/${source.path}`, import.meta.url), "utf8") };
    if (source.kind === "geojson") portable[id] = { kind: "geojson", data: JSON.parse(await readFile(new URL(`../public/${source.path}`, import.meta.url), "utf8")) };
  }
  return { input, profiles, aliases, portable };
}

function addCompatibilityText(input) {
  return prepareStaticPanelTransaction({ dashboard: input, operation: "create",
    destination: { pageId: input.pages[0].id, sectionId: input.pages[0].sections[0].id },
    panel: createChartDraft("freeText", { id: "compatibility-note", title: "Compatibility", sourceId: "compatibility-text" }),
    placement: { kind: "staticText", sourceVersion: 1, revision: 1, renderingPolicy: "portable-qmd-v1", qmd: "Compatibility proof" } });
}

test("V7 preserves a prior-valid raw V6 Group with profile-inferred YYYY binding through every receiving boundary", async t => {
  // The exact archived 17-chart input, supplied profiles and CSV bytes loaded in 107c1008.
  const { input, profiles, aliases, portable } = await archivedYearGroupFixture();
  const original = structuredClone({ input, profiles, portable });
  const expected = normalizeDashboardBoundary(input, { profiles });
  const charts = value => value.pages.flatMap(page => page.sections.flatMap(section => section.panels.map(panel => panel.chart ?? panel)));
  for (const [name, load] of [["full loader", loadDashboardConfig], ["progressive loader", loadDashboardConfigProgressively]]) await t.test(name, async () => {
    const loaded = await load(input, profiles, portable);
    assert.equal(loaded.configVersion, 7);
    assert.equal(charts(loaded).length, 17);
    assert.ok(Object.values(loaded.dataSourceStates).every(state => state.status === "ready"));
    assert.deepEqual(loaded.pages, expected.pages);
    assert.deepEqual(loaded.dataSources, input.dataSources);
    assert.deepEqual(loaded.scenes, expected.scenes);
    for (const group of input.chronoGroups) {
      const scene = loaded.scenes.find(scene => scene.id === group.id);
      assert.deepEqual(scene.members.map(member => member.chartId), group.members.map(member => member.chartId));
      assert.ok(scene.members.every(member => member.matching.policy === "exact"));
      assert.deepEqual(buildStorylineClock({ storyline: scene, charts: charts(loaded), profiles: loaded.datasetProfiles, loadedData: loaded.loadedData, timezone: loaded.timezone }),
        buildChronoGroupClock(group, { charts: charts(input), profiles, loadedData: loaded.loadedData, timezone: input.timezone }));
    }
  });
  await t.test("catalogue", () => {
    const catalogue = buildChartCatalogue(input, aliases);
    assert.equal(catalogue.contract_version, "3");
    assert.deepEqual(catalogue.charts.find(chart => chart.chart_id === "chart-line-a01a017d-96f1-440b-b24a-bcf2e30da1cc").storyline_ids, ["page-removal-socio-group"]);
  });
  await t.test("static panel transaction", () => {
    const prepared = addCompatibilityText(expected);
    assert.deepEqual(prepared.candidateDashboard.scenes, expected.scenes);
    assert.equal(charts(prepared.candidateDashboard).length, 18);
  });
  await t.test("native export parse and reload", async () => {
    const bundle = serializeDashboardBundle(input);
    const parsed = parseDashboardBundle(JSON.stringify(bundle));
    const loaded = await loadDashboardConfig(parsed, profiles, portable);
    assert.equal(bundle.version, 7);
    assert.deepEqual(loaded.pages, expected.pages);
    assert.deepEqual(loaded.scenes, expected.scenes);
    assert.deepEqual(loaded.dataSources, expected.dataSources);
  });
  assert.deepEqual({ input, profiles, portable }, original);
});

test("V7 profile-informed matching still rejects absent, non-temporal, mismatched and overridden temporal evidence", async t => {
  const { input, profiles, aliases, portable } = await archivedYearGroupFixture();
  const baseline = normalizeDashboardBoundary(input, { profiles });
  const chartId = "chart-line-a01a017d-96f1-440b-b24a-bcf2e30da1cc";
  const find = value => value.pages.flatMap(page => page.sections.flatMap(section => section.panels.map(panel => panel.chart ?? panel))).find(chart => chart.id === chartId);
  const sourceId = find(baseline).sourceId;
  for (const kind of ["absent", "non-temporal", "mismatched", "explicit category"]) await t.test(kind, async () => {
    const changed = structuredClone(baseline), supplied = structuredClone(profiles);
    if (kind === "absent") { delete changed.datasetProfiles[sourceId]; delete supplied[sourceId]; }
    if (kind === "non-temporal") for (const profile of [changed.datasetProfiles[sourceId], supplied[sourceId]]) {
      const column = profile.columns.find(column => column.name === "Year");
      column.type = "category"; delete column.temporal;
    }
    if (kind === "mismatched") for (const profile of [changed.datasetProfiles[sourceId], supplied[sourceId]]) profile.path += ".stale";
    if (kind === "explicit category") find(changed).roles.observation.interpretation = "category";
    const rejected = /profile|temporal|schema|satisfy/i;
    await assert.rejects(loadDashboardConfig(changed, supplied, portable), rejected);
    await assert.rejects(loadDashboardConfigProgressively(changed, supplied, portable), rejected);
    assert.throws(() => buildChartCatalogue(changed, aliases), rejected);
    assert.throws(() => addCompatibilityText(changed), rejected);
  });
});

test("V7 migration retains complete Group membership, calendar period and a reviewed bounded Present proposal", () => {
  const input = dashboard(["a", "b", "c", "d", "e"].map(chart), [group("national", ["a", "b", "c", "d", "e"], latest)]);
  const before = structuredClone(input), review = [];
  const migrated = migrateDashboardV6ToV7(input, { onReview: item => review.push(item) });
  assert.deepEqual(input, before);
  assert.equal(migrated.configVersion, 7);
  assert.equal(Object.hasOwn(migrated, "chronoGroups"), false);
  const saved = migrated.scenes[0];
  assert.equal(saved.id, "national");
  assert.deepEqual(saved.period, period);
  assert.deepEqual(saved.frames, { mode: "union" });
  assert.equal(saved.secondsPerFrame, 2);
  assert.deepEqual(saved.members.map(member => member.chartId), ["a", "b", "c", "d", "e"]);
  assert.ok(saved.members.every(member => member.timeRole === "observation" && member.matching.policy === "lastKnown"));
  assert.deepEqual(saved.present, { chartIds: ["a", "b", "c", "d"], layout: "grid-2x2" });
  assert.deepEqual(review.find(item => item.code === "present-subset"), {
    code: "present-subset", storylineId: "national", memberIds: ["a", "b", "c", "d", "e"],
    presentChartIds: ["a", "b", "c", "d"], omittedChartIds: ["e"], layout: "grid-2x2",
  });
});

test("V7 child Storylines retain authored cadence, geometry and effective override without their parent", () => {
  const parent = group("parent", ["a", "b"], latest);
  parent.members[1].matching = { policy: "nearest", toleranceMs: 86400000 };
  const scene = { id: "child", name: "Child", pageId: "page", chronoGroupId: "parent",
    period: { start: "2027-03-15T00:00:00.000Z", end: "2027-05-01T00:00:00.000Z" },
    members: [{ chartId: "a", width: 3, height: 0.5 }, { chartId: "b", width: 1, matching: "Snap to Closest" }],
    frames: { mode: "source", chartId: "a", selection: "selected", selectedEpochs: [Date.parse("2027-03-15")] },
    present: { chartIds: ["b", "a"], layout: "horizontal-divider" },
    audience: { datePosition: { xPermille: 20, yPermille: 30, widthPermille: 200 } } };
  const migrated = migrateDashboardV6ToV7(dashboard([chart("a"), chart("b")], [parent], [scene]));
  assert.equal(migrated.scenes.length, 1);
  const saved = migrated.scenes[0];
  assert.equal(Object.hasOwn(saved, "chronoGroupId"), false);
  assert.equal(saved.secondsPerFrame, 2);
  for (const key of ["id", "name", "pageId", "period", "frames", "present"]) assert.deepEqual(saved[key], scene[key]);
  assert.deepEqual(saved.audience, { ...scene.audience, collectionLabel: "parent" });
  assert.deepEqual(saved.members, [{ chartId: "a", width: 3, height: 0.5, timeRole: "observation", matching: latest },
    { chartId: "b", width: 1, timeRole: "observation", matching: { policy: "nearest", toleranceMs: 86400000 } }]);
});

test("V7 only installs unambiguous chart defaults and preserves existing chart matching", () => {
  const a = chart("a"), b = chart("b"), c = chart("c");
  c.interaction.timeSync = { matching: exact };
  const left = group("left", ["a", "b", "c"], latest), right = group("right", ["a"], exact);
  const migrated = migrateDashboardV6ToV7(dashboard([a, b, c], [left, right]));
  const charts = migrated.pages[0].sections[0].panels;
  assert.equal(charts[0].interaction.timeSync, null);
  assert.deepEqual(charts[1].interaction.timeSync, { matching: latest });
  assert.deepEqual(charts[2].interaction.timeSync, { matching: exact });
  assert.equal(migrated.scenes[0].members[0].matching.policy, "lastKnown");
  assert.equal(migrated.scenes[1].members[0].matching.policy, "exact");
});

test("V7 preserves unbounded legacy nearest as repairable content and reports it instead of inventing a bound", () => {
  const parent = group("parent", ["a"]);
  const scene = { id: "child", name: "Child", chronoGroupId: "parent", pageId: "page",
    period: { start: "2027-03-15T00:00:00.000Z", end: "2027-05-01T00:00:00.000Z" },
    members: [{ chartId: "a", width: 4, matching: "Snap to Closest" }],
    frames: { mode: "calendar", interval: { value: 3, unit: "day" } }, present: { chartIds: ["a"], layout: "single" } };
  const review = [];
  const saved = migrateDashboardV6ToV7(dashboard([chart("a")], [parent], [scene]), { onReview: item => review.push(item) }).scenes[0];
  assert.equal(saved.members[0].matching, "Snap to Closest");
  assert.deepEqual(saved.frames, scene.frames);
  assert.ok(review.some(item => item.code === "unbounded-nearest" && item.storylineId === "child" && item.chartId === "a"));
});

test("V7 resolves Group/Scene identity collisions deterministically and rejects missing parents or members", () => {
  const source = dashboard([chart("a")], [group("same", ["a"])], [{ id: "same", name: "same", members: [{ chartId: "a", width: 4 }],
    frames: { mode: "source", chartId: "a", selection: "all" }, present: { chartIds: ["a"], layout: "single" } }]);
  const migrated = migrateDashboardV6ToV7(source);
  assert.deepEqual(migrated.scenes.map(scene => scene.id), ["same", "same-storyline"]);
  assert.deepEqual(migrated.scenes.map(scene => scene.name), ["same", "same (2)"]);
  assert.deepEqual(migrateDashboardV6ToV7(migrated), migrated);
  assert.throws(() => migrateDashboardV6ToV7({ ...source, configVersion: 8 }), /version 6 or 7/);
  const missingParent = structuredClone(source); missingParent.scenes[0].chronoGroupId = "missing";
  assert.throws(() => migrateDashboardV6ToV7(missingParent), /parent.*missing/i);
  const missingMember = structuredClone(source); missingMember.chronoGroups[0].members[0].chartId = "missing";
  assert.throws(() => migrateDashboardV6ToV7(missingMember), /chart.*missing/i);
});

test("V7 union preserves mixed date-only and timestamp calendar membership in UTC and non-UTC zones", () => {
  const charts = ["date", "instant"].map(id => createChartDraft("line", { id, title: id, sourceId: id,
    roles: { observation: { field: "date", interpretation: "temporal", format: id === "date" ? "YYYY-MM-DD" : "ISO-8601" }, measurements: [{ field: "value" }] } }));
  const loadedData = { date: [{ date: "2027-03-28", value: 1 }, { date: "2027-03-29", value: 2 }], instant: [
    { date: "2027-03-27T23:30:00.000Z", value: 3 }, { date: "2027-03-28T22:30:00.000Z", value: 4 }] };
  const profiles = Object.fromEntries(Object.entries(loadedData).map(([id, rows]) => [id, profileDataset(rows)]));
  for (const timezone of ["UTC", "Europe/Berlin"]) {
    const original = { ...group("mixed", ["date", "instant"]), period: { start: "2027-03-28", end: "2027-03-28" } };
    const input = { ...dashboard(charts, [original]), timezone };
    const storyline = migrateDashboardV6ToV7(input).scenes[0];
    const before = buildChronoGroupClock(original, { charts, loadedData, profiles, timezone });
    const after = buildStorylineClock({ storyline, charts, loadedData, profiles, timezone });
    assert.deepEqual(after, before);
    assert.deepEqual(after, [Date.parse(timezone === "UTC" ? "2027-03-28" : "2027-03-27T23:30Z"),
      Date.parse(timezone === "UTC" ? "2027-03-28T22:30Z" : "2027-03-28")]);
    assert.deepEqual(buildStorylineClock({ storyline, charts, loadedData, profiles, timezone,
      window: { start: "2027-03-28T00:00:00.000Z", end: "2027-03-28T23:59:59.999Z" } }),
    before.filter(epoch => epoch >= Date.parse("2027-03-28") && epoch <= Date.parse("2027-03-28T23:59:59.999Z")));
    const native = { ...migrateDashboardV6ToV7(input), loadedData, datasetProfiles: profiles,
      dataSources: { date: { kind: "dataset" }, instant: { kind: "dataset" } } };
    const coverage = buildStorylineCoverage(native, storyline.period, { calendarPeriod: true });
    assert.deepEqual([...new Set(coverage.flatMap(candidate => candidate.inWindowEpochs))].sort((a, b) => a - b), before);
    assert.deepEqual(deriveTemporalContentItems({ dashboard: native, charts })[0].needsAttention, []);
  }
});

test("V7 identity collision proposals remain unique within the Present protocol 128-character cap", () => {
  const id = "x".repeat(128), firstReplacement = `${"x".repeat(118)}-storyline`;
  const scene = sceneId => ({ id: sceneId, name: sceneId, members: [{ chartId: "a", width: 4 }],
    frames: { mode: "source", chartId: "a", selection: "all" }, present: { chartIds: ["a"], layout: "single" } });
  const input = dashboard([chart("a")], [group(id, ["a"])], [scene(id), scene(firstReplacement)]), review = [];
  const migrated = migrateDashboardV6ToV7(input, { onReview: item => review.push(item) });
  const replacement = migrated.scenes.at(-1).id;
  assert.ok(replacement.length <= 128);
  assert.equal(new Set(migrated.scenes.map(scene => scene.id)).size, 3);
  assert.equal(replacement, `${"x".repeat(116)}-storyline-2`);
  assert.deepEqual(review.find(item => item.code === "identity"), { code: "identity", previousId: id, storylineId: replacement });
  assert.deepEqual(migrateDashboardV6ToV7(input), migrated);
});

test("V7 repairable nearest content is discoverable in Storyline Needs attention", () => {
  const findings = deriveTemporalNeedsAttention({ timezone: "UTC", charts: [{ id: "a", variables: [] }], scenes: [{
    id: "legacy", name: "Legacy", members: [{ chartId: "a", width: 4, matching: "Snap to Closest" }],
    period: { start: "2027-03-01T00:00:00.000Z", end: "2027-03-02T00:00:00.000Z" },
    frames: { mode: "calendar", interval: { value: 1, unit: "day" } }, present: { chartIds: ["a"], layout: "single" },
  }] });
  assert.ok(findings.some(finding => finding.code === "invalid-time-matching" && finding.targetId === "legacy"));
});

test("V7 child preserves inherited source review and actual legacy time role while reporting inactive authored conflict", () => {
  const parent = group("parent", ["a"]), a = chart("a");
  a.roles.alternate = { field: "otherDate", interpretation: "temporal" };
  parent.temporalReview = { status: "needs-review", sourceIds: ["source-a"] };
  const child = { id: "child", name: "Child", chronoGroupId: "parent", members: [{ chartId: "a", width: 4, timeRole: "alternate" }],
    period: { start: "2027-03-15T00:00:00.000Z", end: "2027-05-01T00:00:00.000Z" },
    frames: { mode: "source", chartId: "a", selection: "all" }, temporalReview: { status: "needs-review", sourceIds: ["source-b"] } };
  const review = [], saved = migrateDashboardV6ToV7(dashboard([a], [parent], [child]), { onReview: item => review.push(item) }).scenes[0];
  assert.deepEqual(saved.temporalReview, { status: "needs-review", sourceIds: ["source-a", "source-b"] });
  assert.equal(saved.members[0].timeRole, "observation");
  assert.deepEqual(review.find(item => item.code === "time-role"), { code: "time-role", storylineId: "child", chartId: "a",
    authoredRole: "alternate", effectiveRole: "observation" });
});
