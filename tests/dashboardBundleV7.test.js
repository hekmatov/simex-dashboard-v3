import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { serializeDashboardBundle, parseDashboardBundle, normalizeDashboardBoundary, validateDashboardConfig } from "../src/charting/config/dashboardBundleV3.js";
import { stableSerialize } from "../src/charting/runtime/chartPreparationIdentity.js";
import { APP_VERSION } from "../src/lib/appVersion.js";
import { parseDashboardPackageCandidate } from "../src/lib/dashboardPackageCandidate.js";
import { collaboratorPackage, synchronizedPackage } from "./helpers/dashboardPackageFixtures.js";

const config = () => ({ configVersion: 6, id: "native", title: "Native", timezone: "UTC", home: { enabled: true },
  pages: [], dataSources: {}, contentLibrary: { mediaItems: {}, sourceEntries: {} }, chronoGroups: [], scenes: [] });

test("V7 export cites the app version and reproducible SHA256 of the entire export except its own digest", () => {
  const input = config(), original = structuredClone(input);
  const bundle = serializeDashboardBundle(input, { now: "2026-11-09T00:00:00.000Z" });
  assert.equal(bundle.version, 7);
  assert.equal(bundle.config.configVersion, 7);
  assert.equal(Object.hasOwn(bundle.config, "chronoGroups"), false);
  assert.equal(bundle.metadata.appVersion, APP_VERSION);
  const unsigned = structuredClone(bundle); delete unsigned.metadata.integrity;
  assert.deepEqual(bundle.metadata.integrity, { algorithm: "sha256", digest: createHash("sha256").update(stableSerialize(unsigned)).digest("hex") });
  assert.deepEqual(parseDashboardBundle(JSON.stringify(bundle)), bundle.config);
  assert.deepEqual(serializeDashboardBundle(input, { now: "2026-11-09T00:00:00.000Z" }), bundle);
  assert.deepEqual(input, original);
});

test("V7 verifies raw whole-export integrity before any migration and rejects tampered config, metadata or assets", () => {
  const bundle = serializeDashboardBundle(config());
  for (const mutate of [value => value.config.configVersion = 8, value => value.config.title = "Changed",
    value => value.metadata.appVersion = "changed", value => value.metadata.exportedAt = "2020-01-01T00:00:00.000Z",
    value => value.assetPayloads.extra = { base64: "AAAA" }, value => delete value.metadata.integrity]) {
    const altered = structuredClone(bundle); mutate(altered);
    assert.throws(() => parseDashboardBundle(JSON.stringify(altered)), /integrity/i);
  }
});

test("legacy V6 import remains reviewable and cancel leaves its original bytes intact", () => {
  const legacy = { bundleType: "simex-dashboard-bundle", version: 6, config: config(), assetPayloads: {},
    metadata: { exportedAt: null, sourceFingerprints: {}, networkDependencies: [] } };
  const text = JSON.stringify(legacy), candidate = parseDashboardPackageCandidate(text);
  assert.equal(candidate.config.configVersion, 7);
  assert.equal(candidate.originalText, text);
  assert.equal(candidate.appVersion, null);
  assert.equal(candidate.integrity, null);
  assert.deepEqual(JSON.parse(text), legacy);
  const strictLegacy = structuredClone(legacy); strictLegacy.metadata.appVersion = "unapproved-extension";
  assert.throws(() => parseDashboardBundle(JSON.stringify(strictLegacy)), /Unknown.*metadata/i);
});

test("native V7 rejects retired parent collections and parent references without silently repairing them", () => {
  const native = normalizeDashboardBoundary(config());
  assert.throws(() => validateDashboardConfig({ ...native, chronoGroups: [] }), /chronoGroups/);
  assert.throws(() => validateDashboardConfig({ ...native, scenes: [{ id: "bad", name: "Bad", chronoGroupId: "old" }] }), /parent|chronoGroupId/i);
});

test("native V7 rejects retired Vanta root fields while legacy migration removes them without mutating the original", () => {
  const native = normalizeDashboardBoundary(config());
  assert.throws(() => serializeDashboardBundle({ ...native, vantaBackground: {} }), /Unknown dashboard configuration property "vantaBackground"/);
  const legacy = { ...config(), vantaBackground: {} };
  const migrated = serializeDashboardBundle(legacy);
  assert.equal(Object.hasOwn(migrated.config, "vantaBackground"), false);
  assert.deepEqual(legacy.vantaBackground, {});
});

test("native V7 cannot bypass whole-export integrity in a downgraded legacy wrapper", () => {
  const bundle = serializeDashboardBundle(config());
  for (const version of [4, 5, 6]) {
    const downgraded = structuredClone(bundle);
    downgraded.version = version;
    delete downgraded.metadata.appVersion;
    delete downgraded.metadata.integrity;
    assert.throws(() => parseDashboardBundle(JSON.stringify(downgraded)), /native V7.*version 7.*integrity/i);
  }
  assert.equal(parseDashboardPackageCandidate(JSON.stringify(bundle.config)).config.configVersion, 7);
});

test("native V7 union calendar periods survive repeated load and package normalization unchanged", () => {
  const input = structuredClone(collaboratorPackage().config);
  input.configVersion = 6;
  input.chronoGroups = [{ id: "clock", name: "Calendar", period: { start: "2026-08-21", end: "2026-08-21" },
    matching: { policy: "exact" }, secondsPerFrame: 1, members: [{ chartId: "chart-a", timeRole: "observation" }] }];
  const native = normalizeDashboardBoundary(input);
  assert.deepEqual(normalizeDashboardBoundary(native), native);
  const bundle = serializeDashboardBundle(native);
  assert.deepEqual(parseDashboardBundle(JSON.stringify(bundle)), bundle.config);
  assert.deepEqual(bundle.config.scenes[0].period, input.chronoGroups[0].period);
});

test("native V7 rejects unknown nested Storyline fields instead of retaining hidden parent or future contracts", () => {
  const native = synchronizedPackage().config;
  for (const mutate of [scene => scene.members[0].futurePolicy = true,
    scene => scene.audience.chronoGroupId = "retired", scene => scene.frames.future = true,
    scene => scene.present.future = true, scene => scene.period.future = true,
    scene => scene.view = { layout: "sideBySide", future: true }]) {
    const changed = structuredClone(native); mutate(changed.scenes[0]);
    assert.throws(() => validateDashboardConfig(changed), /unknown/i);
  }
  const duplicate = structuredClone(native);
  duplicate.scenes.push({ ...structuredClone(duplicate.scenes[0]), name: "Another name" });
  assert.throws(() => validateDashboardConfig(duplicate), /Duplicate native Storyline id/);
});
