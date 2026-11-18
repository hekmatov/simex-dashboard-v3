import test from "node:test";
import assert from "node:assert/strict";
import { collaboratorPackage } from "./helpers/dashboardPackageFixtures.js";
import { serializeDashboardBundle, dashboardBundleIntegrity } from "../src/charting/config/dashboardBundleV3.js";
import { assertRollbackExportPreserved } from "./e2e/support/release-rollback-fixture.mjs";

function original() {
  const source = collaboratorPackage({ staticPanels: true });
  const config = structuredClone(source.config);
  config.scenes = [{ id: "kept-storyline", name: "Keep the entire comparison", pageId: "overview",
    period: { start: "2026-08-21T00:00:00.000Z", end: "2026-08-21T00:00:00.000Z" },
    members: [{ chartId: "chart-a", width: 2 }], frames: { mode: "source", chartId: "chart-a", selection: "all" },
    present: { chartIds: ["chart-a"], layout: "single" },
    audience: { datePosition: { xPermille: 680, yPermille: 40, widthPermille: 280 } } }];
  return serializeDashboardBundle(config, { assetPayloads: source.assetPayloads });
}
const resign = pkg => { pkg.metadata.integrity.digest = dashboardBundleIntegrity(pkg); };

test("rollback preservation allows only export timestamp and root runtime differences", () => {
  const expected = original(), exported = structuredClone(expected);
  exported.metadata.exportedAt = "2027-08-15T12:00:00.000Z";
  exported.config.datasetProfiles = { rebuilt: { rowCount: 4 } };
  exported.config.loadedData = { runtime: true };
  const id = Object.keys(exported.assetPayloads)[0];
  exported.assetPayloads[id].base64 = `\n${exported.assetPayloads[id].base64}\n`;
  resign(exported);
  assert.doesNotThrow(() => assertRollbackExportPreserved(exported, expected));
});

test("rollback preservation rejects dropped Storylines, changed bindings and changed media identity", () => {
  const expected = original();
  for (const mutate of [
    pkg => { pkg.config.scenes = []; },
    pkg => { pkg.config.pages[0].sections[0].panels[0].chart.roles.observation.field = "other-date"; },
    pkg => { pkg.config.contentLibrary.mediaItems.photo.defaultDescription = "Changed source interpretation"; },
  ]) {
    const exported = structuredClone(expected); mutate(exported); resign(exported);
    assert.throws(() => assertRollbackExportPreserved(exported, expected), /full package config/);
  }
});

test("rollback preservation verifies payload content rather than trusting matching IDs or declared hashes", () => {
  const expected = original(), exported = structuredClone(expected);
  const id = Object.keys(exported.assetPayloads)[0];
  const bytes = Buffer.from(exported.assetPayloads[id].base64, "base64");
  bytes[bytes.length - 1] ^= 1;
  exported.assetPayloads[id].base64 = bytes.toString("base64");
  resign(exported);
  assert.throws(() => assertRollbackExportPreserved(exported, expected), /actual SHA256/);
  delete exported.assetPayloads[id];
  resign(exported);
  assert.throws(() => assertRollbackExportPreserved(exported, expected), /all original payloads/);
});

test("rollback preservation rejects an invalid whole-package checksum before ignoring export metadata", () => {
  const expected = original(), exported = structuredClone(expected);
  exported.metadata.exportedAt = "2027-08-15T12:00:00.000Z";
  assert.throws(() => assertRollbackExportPreserved(exported, expected), /whole-package integrity/);
});

test("rollback preservation compares native V6 Groups without migrating or discarding them", () => {
  const expected = original();
  expected.version = 6;
  expected.config.configVersion = 6;
  expected.config.scenes = [];
  expected.config.chronoGroups = [{ id: "legacy-clock", name: "Retained legacy clock",
    period: { start: "2026-08-21", end: "2026-08-21" }, matching: { policy: "exact" }, secondsPerFrame: 1,
    members: [{ chartId: "chart-a", timeRole: "observation" }, { chartId: "chart-b", timeRole: "observation" }] }];
  delete expected.metadata.appVersion;
  delete expected.metadata.integrity;
  const exported = structuredClone(expected);
  exported.metadata.exportedAt = "2027-08-15T12:00:00.000Z";
  assert.doesNotThrow(() => assertRollbackExportPreserved(exported, expected));
  assert.equal(exported.config.configVersion, 6);
  exported.config.chronoGroups[0].members.pop();
  assert.throws(() => assertRollbackExportPreserved(exported, expected), /full package config/);
});
