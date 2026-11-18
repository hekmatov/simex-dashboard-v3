import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collaboratorPackage, attentionPackage, packageChart } from "./helpers/dashboardPackageFixtures.js";
import { serializeDashboardBundle, parseDashboardBundle, normalizeDashboardBoundary } from "../src/charting/config/dashboardBundleV3.js";
import { parseCsvText } from "../src/lib/loadCsv.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { sha256HexSync } from "../src/static-content/assets/assetPayloadEnvelope.js";
import { REHEARSAL_CUTOFFS, prepareRehearsalInput, buildRehearsalPhase, rehearsalJsonBytes } from "../scripts/lib/rehearsal-packages.mjs";
import { writeRehearsalPackages, assertRehearsalOutputTarget, parseRehearsalArgs, createLocalRehearsalReaders } from "../scripts/build-rehearsal-packages.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appVersion = "0.8.0-test";
function bytesFor(candidate) { return rehearsalJsonBytes(serializeDashboardBundle(candidate.config, { assetPayloads: candidate.assetPayloads })); }
async function prepare(candidate, staticReleases = {}) {
  const inputBytes = bytesFor(candidate), expectedInputSha256 = sha256HexSync(inputBytes);
  return prepareRehearsalInput({ inputBytes, expectedInputSha256, staticReleases: Object.keys(staticReleases).length ? { inputSha256: expectedInputSha256, ...staticReleases } : {} });
}
const phase = (prepared, cutoff = REHEARSAL_CUTOFFS[0]) => buildRehearsalPhase({ prepared, cutoff, appVersion });
const configFor = phase => parseDashboardBundle(new TextDecoder().decode(phase.bundleBytes));
const authority = releaseDate => ({ releaseDate, evidence: "Explicit human acceptance in test fixture" });

test("three deterministic phase bundles physically exclude future rows at inclusive UTC cutoffs and preserve exerciseTime", async () => {
  const candidate = structuredClone(collaboratorPackage());
  candidate.config.scenario = { exerciseTime: "2027-08-15T12:00:00.000Z" };
  // Native uploaded CSV rejects Papa Date-valued instants; native inline rows
  // retain ISO strings and exercise the actual supported instant boundary.
  const dates = ["2027-03-31T23:59:59.999Z", "2027-04-01T00:00:00.000Z", "2027-05-31T23:59:59.999Z", "2027-06-01T00:00:00.000Z", "2027-08-15T23:59:59.999Z", "2027-08-16T00:00:00.000Z"];
  const source = { kind: "inline", rows: dates.map((date, index) => ({ date, value: index === 5 ? 999999 : index + 1 })), parsingMetadata: { date: { interpretation: "temporal", format: "ISO-8601" }, value: { interpretation: "numeric" } } };
  candidate.config.dataSources.cases = source;
  delete candidate.config.contentLibrary.sourceEntries.cases;
  for (const panel of candidate.config.pages[0].sections[0].panels) {
    panel.chart.typeId = "kpi";
    panel.chart.roles = { value: { field: "value" }, time: { field: "date", interpretation: "temporal" } };
    panel.chart.transformations = { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap" };
    panel.chart.interaction = { zoom: { enabled: false }, timeSync: null };
  }
  candidate.config.datasetProfiles = { cases: profileDataset(source.rows, source.parsingMetadata) };
  const original = bytesFor(candidate);
  const prepared = await prepare(candidate);
  for (const [index, cutoff] of REHEARSAL_CUTOFFS.entries()) {
    const built = phase(prepared, cutoff), config = configFor(built);
    const rows = config.dataSources.cases.rows;
    assert.equal(rows.length, index * 2 + 1);
    assert.equal(config.datasetProfiles.cases.rowCount, rows.length);
    assert.equal(config.datasetProfiles.cases.fingerprint, profileDataset(rows, source.parsingMetadata).fingerprint);
    assert.equal(config.dataSources.cases.sourceFingerprint, config.datasetProfiles.cases.fingerprint);
    assert.equal(config.scenario.exerciseTime, candidate.config.scenario.exerciseTime);
    assert.equal(built.manifest.publicationCutoffIsExerciseTime, false);
    assert.equal(built.manifest.bundleSha256, sha256HexSync(built.bundleBytes));
    assert.equal(built.manifest.appVersion, appVersion);
    assert.equal(built.manifest.bundleVersion, JSON.parse(new TextDecoder().decode(built.bundleBytes)).version);
    assert.deepEqual(phase(prepared, cutoff).bundleBytes, built.bundleBytes);
    assert.ok(!new TextDecoder().decode(built.bundleBytes).includes("999999"));
    assert.equal(config.pages[0].sections[0].panels.length, 2, "shared source retains both charts");
  }
  assert.deepEqual(prepared.inputBytes, original);
  assert.deepEqual(bytesFor(candidate), original);
});

test("trusted comparison columns, ambiguous rows and year-only periods cannot expose unreleased values", async () => {
  const candidate = structuredClone(collaboratorPackage());
  const source = candidate.config.dataSources.cases;
  source.csvText = "date,value,comparison\n2027-03-01,1,2027-02-01\n2027-03-02,22222,2027-04-01\n2027-03-03,33333,\n";
  source.parsingMetadata.comparison = { interpretation: "temporal", format: "YYYY-MM-DD" };
  const built = phase(await prepare(candidate));
  assert.deepEqual(parseCsvText(configFor(built).dataSources.cases.csvText).map(row => row.value), [1]);
  assert.deepEqual(built.report.sources[0].omittedRows.map(row => row.reason), ["after-publication-cutoff", "ambiguous-or-undated"]);
  const annual = structuredClone(candidate);
  annual.config.dataSources.cases.csvText = "date,value\n2026,10\n2027,88888\n";
  annual.config.dataSources.cases.parsingMetadata = { date: { interpretation: "temporal", format: "YYYY" } };
  assert.deepEqual(parseCsvText(configFor(phase(await prepare(annual))).dataSources.cases.csvText).map(row => row.value), [10]);
});

test("inherited timeline end binding excludes a March interval ending after the publication cutoff", async () => {
  const candidate = structuredClone(collaboratorPackage());
  candidate.config.dataSources.cases.csvText = "event,start,end,secret\nReleased interval,2027-03-01,2027-03-02,1\nUnreleased interval,2027-03-01,2027-08-20,777777\n";
  candidate.config.dataSources.cases.parsingMetadata = { start: { interpretation: "temporal", format: "YYYY-MM-DD" } };
  for (const panel of candidate.config.pages[0].sections[0].panels) {
    panel.chart.typeId = "timeline";
    panel.chart.roles = { event: { field: "event" }, start: { field: "start" }, end: { field: "end" } };
    panel.chart.transformations = { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap" };
  }
  const built = phase(await prepare(candidate));
  const config = configFor(built);
  assert.deepEqual(parseCsvText(config.dataSources.cases.csvText), [{ event: "Released interval", start: "2027-03-01", end: "2027-03-02", secret: 1 }]);
  assert.ok(!new TextDecoder().decode(built.bundleBytes).includes("777777"));
  assert.ok(!new TextDecoder().decode(built.bundleBytes).includes("2027-08-20"));
  assert.ok(built.report.sources[0].temporalFields.includes("end"));
  assert.deepEqual(built.report.sources[0].omittedRows, [{ index: 1, reason: "after-publication-cutoff", fields: ["end"] }]);
});

test("inferred YYYY precision cannot release full-year 2027 statistics in March, May or August", async () => {
  const candidate = structuredClone(collaboratorPackage());
  candidate.config.dataSources.cases.csvText = "date,value\n2026,10\n2027,888888\n";
  candidate.config.dataSources.cases.parsingMetadata = { date: { interpretation: "temporal" } };
  for (const panel of candidate.config.pages[0].sections[0].panels) {
    panel.chart.typeId = "kpi";
    panel.chart.roles = { value: { field: "value" } };
    panel.chart.transformations = { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap" };
    panel.chart.interaction = { zoom: { enabled: false }, timeSync: null };
  }
  const prepared = await prepare(candidate);
  assert.equal(prepared.envelope.config.dataSources.cases.parsingMetadata.date.format, undefined);
  for (const cutoff of REHEARSAL_CUTOFFS) {
    const built = phase(prepared, cutoff), config = configFor(built);
    assert.deepEqual(parseCsvText(config.dataSources.cases.csvText), [{ date: 2026, value: 10 }]);
    assert.ok(!new TextDecoder().decode(built.bundleBytes).includes("888888"));
    assert.deepEqual(built.report.sources[0].omittedRows, [{ index: 1, reason: "after-publication-cutoff", fields: ["date"] }]);
  }
});

test("undated snapshots require input-bound explicit release evidence rather than automatic date guesses", async () => {
  const candidate = structuredClone(collaboratorPackage());
  candidate.config.dataSources.snapshot = { kind: "inline", rows: [{ value: 55555 }] };
  candidate.config.pages[0].sections[0].panels.push({ id: "snapshot-placement", chart: { ...packageChart("snapshot-chart", "Undated snapshot"), typeId: "kpi", sourceId: "snapshot", roles: { value: { field: "value" } }, interaction: { zoom: { enabled: false }, timeSync: null } } });
  const omitted = phase(await prepare(candidate));
  assert.equal(configFor(omitted).dataSources.snapshot, undefined);
  assert.ok(omitted.report.sources.some(item => item.sourceId === "snapshot" && item.disposition === "undated-snapshot-needs-review"));
  const prepared = await prepare(candidate, { sources: { snapshot: authority("2027-05-01") } });
  assert.equal(configFor(phase(prepared)).dataSources.snapshot, undefined);
  assert.equal(configFor(phase(prepared, REHEARSAL_CUTOFFS[1])).dataSources.snapshot.rows[0].value, 55555);
  const inputBytes = bytesFor(candidate);
  await assert.rejects(prepareRehearsalInput({ inputBytes, expectedInputSha256: "0".repeat(64) }), /SHA-256/);
  await assert.rejects(prepareRehearsalInput({ inputBytes, expectedInputSha256: sha256HexSync(inputBytes), staticReleases: { inputSha256: "0".repeat(64), sources: {} } }), /exact input bytes/);
  assert.throws(() => phase({ ...prepared, staticReleases: { sources: { snapshot: { releaseDate: "2027-03-01" } } } }), /human-evidence/);
});

test("unreleased image/QMD assets are physically omitted and released shared assets retain exact payloads", async () => {
  const candidate = collaboratorPackage({ staticPanels: true });
  const initial = phase(await prepare(candidate));
  const hidden = JSON.parse(new TextDecoder().decode(initial.bundleBytes));
  assert.deepEqual(hidden.assetPayloads, {});
  assert.deepEqual(hidden.config.contentLibrary.mediaItems, {});
  assert.equal(hidden.config.dataSources.picture, undefined);
  assert.equal(hidden.config.dataSources.text, undefined);
  const prepared = await prepare(candidate, { sources: { picture: authority("2027-02-01"), text: authority("2027-02-01") }, media: { photo: authority("2027-05-01") } });
  assert.deepEqual(JSON.parse(new TextDecoder().decode(phase(prepared).bundleBytes)).assetPayloads, {});
  const released = JSON.parse(new TextDecoder().decode(phase(prepared, REHEARSAL_CUTOFFS[1]).bundleBytes));
  assert.deepEqual(released.assetPayloads, candidate.assetPayloads);
  assert.equal(Object.keys(released.config.assets).length, 1, "both sources retain one shared asset");
  assert.equal(released.config.dataSources.text.qmd, candidate.config.dataSources.text.qmd);
});

test("removed chart references use native temporal cleanup and disconnected drills are explicit", async () => {
  const candidate = structuredClone(collaboratorPackage());
  candidate.config = normalizeDashboardBoundary({ ...candidate.config, configVersion: 6,
    chronoGroups: [{ id: "clock", name: "Shared clock", period: { start: "2026-08-21", end: "2026-08-21" },
      matching: { policy: "exact" }, secondsPerFrame: 1,
      members: [{ chartId: "chart-a", timeRole: "observation" }, { chartId: "chart-b", timeRole: "observation" }] }],
  });
  candidate.config.dataSources.future = { ...candidate.config.dataSources.cases, csvText: "date,value\n2027-08-15,777777\n" };
  candidate.config.pages[0].sections[0].panels[1].chart.sourceId = "future";
  const attention = structuredClone(attentionPackage().config.pages[0].sections[0]);
  attention.panels[0].drill = { kind: "chart", chartId: "chart-b" };
  candidate.config.pages[0].sections.unshift(attention);
  candidate.config.contentLibrary.sourceEntries.future = { ...candidate.config.contentLibrary.sourceEntries.cases, sourceId: "future" };
  const built = phase(await prepare(candidate)), config = configFor(built);
  assert.equal(config.configVersion, 7);
  assert.equal(config.chronoGroups, undefined);
  assert.deepEqual(config.scenes[0].members.map(member => member.chartId), ["chart-a"]);
  assert.deepEqual(config.scenes[0].present.chartIds, ["chart-a"]);
  assert.equal(config.scenes[0].present.layout, "single");
  assert.equal(config.dataSources.future, undefined);
  assert.equal(config.contentLibrary.sourceEntries.future, undefined);
  assert.equal(config.pages[0].sections[0].panels[0].drill, undefined);
  assert.deepEqual(built.report.detachedDrills, [{ placementId: "kpi-placement", kind: "chart", chartId: "chart-b" }]);
});

test("raw config uses existing portable readers without mutating original source/provenance", async () => {
  const candidate = structuredClone(collaboratorPackage());
  candidate.config.dataSources.cases = { kind: "csv", path: "data/cases.csv", parsingMetadata: { date: { interpretation: "temporal", format: "YYYY-MM-DD" } }, provenance: { label: "Original source meaning" } };
  candidate.config.datasetProfiles = { cases: { sourceId: "cases", kind: "csv", path: "data/cases.csv", provenance: { label: "Original source meaning" }, ...profileDataset([{ date: "2027-03-01", value: 8 }], candidate.config.dataSources.cases.parsingMetadata) } };
  const inputBytes = rehearsalJsonBytes(candidate.config);
  const prepared = await prepareRehearsalInput({ inputBytes, expectedInputSha256: sha256HexSync(inputBytes), readers: { readText: async file => { assert.equal(file, "data/cases.csv"); return "date,value\n2027-03-01,8\n2027-04-01,99999\n"; } } });
  const config = configFor(phase(prepared));
  assert.equal(config.dataSources.cases.type, "uploadedCsv");
  assert.deepEqual(config.dataSources.cases.provenance, { label: "Original source meaning" });
  assert.equal(parseCsvText(config.dataSources.cases.csvText).length, 1);
  assert.equal(candidate.config.dataSources.cases.kind, "csv");
});

test("writer isolates original/companions from participant candidates and refuses unsafe or existing output", async () => {
  const release = path.join(root, "release");
  await mkdir(release, { recursive: true });
  const fixtureRoot = await mkdtemp(path.join(release, ".rehearsal-tests-"));
  try {
    await mkdir(path.join(fixtureRoot, "public"));
    await mkdir(path.join(fixtureRoot, "public", "data"));
    await writeFile(path.join(fixtureRoot, "public", "data", "cases.csv"), "date,value\n2027-03-01,8\n");
    await writeFile(path.join(fixtureRoot, "package.json"), JSON.stringify({ version: appVersion }));
    const readers = await createLocalRehearsalReaders(fixtureRoot);
    assert.equal(await readers.readText("data/cases.csv"), "date,value\n2027-03-01,8\n");
    await assert.rejects(readers.readText("../package.json"));
    const inputBytes = bytesFor(collaboratorPackage()), expectedInputSha256 = sha256HexSync(inputBytes);
    const companionBytes = new TextEncoder().encode("Operator provenance with unreleased material; retain original bytes.\n");
    const result = await writeRehearsalPackages({ rootDir: fixtureRoot, inputBytes, expectedInputSha256, companions: [{ name: "METHOD.md", bytes: companionBytes }] });
    assert.deepEqual(new Uint8Array(await readFile(path.join(result.outputDir, "original", "input.json"))), inputBytes);
    assert.deepEqual(new Uint8Array(await readFile(path.join(result.outputDir, "original", "companions", "METHOD.md"))), companionBytes);
    assert.equal(result.manifest.originalCompanions[0].sha256, sha256HexSync(companionBytes));
    for (const item of result.manifest.phases) {
      const bytes = await readFile(path.join(result.outputDir, item.directory, "dashboard-bundle.json"));
      assert.equal(sha256HexSync(bytes), item.bundleSha256);
      assert.ok(!bytes.toString().includes("unreleased material"));
      assert.equal(item.humanReleaseReviewRequired, true);
    }
    await assert.rejects(assertRehearsalOutputTarget(fixtureRoot, result.outputDir), /already exists/);
    await assert.rejects(assertRehearsalOutputTarget(fixtureRoot, path.join(fixtureRoot, "public", "unsafe")), /ignored release/);
    assert.throws(() => parseRehearsalArgs(["--bundle", "input.json"]), /expected-sha256/);
    assert.equal(parseRehearsalArgs(["--bundle", "input.json", "--expected-sha256", expectedInputSha256]).bundlePath, "input.json");
  } finally {
    assert.ok(fixtureRoot.startsWith(`${release}${path.sep}.rehearsal-tests-`));
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});
