import assert from "node:assert/strict";
import test from "node:test";

import {
  DASHBOARD_BUNDLE_VERSION,
  DASHBOARD_SCHEMA_VERSION,
  parseDashboardBundle,
  serializeDashboardBundle,
} from "../src/charting/config/dashboardBundleV3.js";
import { createChartDraft } from "../src/charting/config/chartConfigV3.js";
import { profileDataset } from "../src/charting/data/profileDataset.js";
import { migrateDashboardV4ToV5 } from "../src/content-library/migrateDashboardV4ToV5.js";
import { encodeAssetBase64 } from "../src/static-content/assets/assetPayloadEnvelope.js";
import { makeDashboardV4, makeDashboardV5 } from "./helpers/contentLibraryFixtures.js";

test("dashboard and bundle boundaries emit V5 while retaining chart configuration V3", () => {
  const dashboard = makeDashboardV5();
  const bytes = new Uint8Array([1, 2, 3, 4]);
  dashboard.assets["asset-map"] = {
    ...dashboard.assets["asset-map"],
    byteLength: bytes.byteLength,
    sha256: "9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a",
  };
  dashboard.contentLibrary.mediaItems["media-image-source"] = {
    ...dashboard.contentLibrary.mediaItems["media-image-source"],
    byteLength: bytes.byteLength,
  };
  const bundle = serializeDashboardBundle(dashboard, {
    assetPayloads: {
      "asset-map": {
        base64: encodeAssetBase64(bytes),
        byteLength: bytes.byteLength,
        mediaType: "image/png",
        sha256: dashboard.assets["asset-map"].sha256,
      },
    },
  });
  assert.equal(DASHBOARD_SCHEMA_VERSION, 5);
  assert.equal(DASHBOARD_BUNDLE_VERSION, 5);
  assert.equal(bundle.version, 5);
  assert.equal(bundle.config.configVersion, 5);
  assert.equal(bundle.config.pages[0].sections[0].panels[0].chart.configVersion, 3);
  assert.deepEqual(parseDashboardBundle(JSON.stringify(bundle)), bundle.config);
});

test("V5 bundle parser accepts a version-4 bundle by migrating before validation", () => {
  const legacyBundle = {
    bundleType: "simex-dashboard-bundle",
    version: 4,
    metadata: {
      exportedAt: null,
      sourceFingerprints: { "image-source": null },
      networkDependencies: ["https://example.test/map.png"],
    },
    config: makeDashboardV4(),
    assetPayloads: {},
  };
  legacyBundle.config.dataSources["image-source"].origin = {
    kind: "url", url: "https://example.test/map.png",
  };
  delete legacyBundle.config.assets;
  const parsed = parseDashboardBundle(JSON.stringify(legacyBundle));
  assert.equal(parsed.configVersion, 5);
  assert.equal(parsed.dataSources["image-source"].sourceVersion, 2);
  assert.equal(parsed.contentLibrary.mediaItems[parsed.dataSources["image-source"].mediaId].revision, 3);
});

test("V5 bundle round-trips exact Chrono, Scene, and Scene Present temporal review metadata", () => {
  const rows = [{ date: "2027-05-01", cases: 4 }];
  const profile = profileDataset(rows, { date: { interpretation: "temporal", format: "YYYY-MM-DD", timezone: "date-only" } });
  const chart = createChartDraft("line", {
    id: "cases-trend", title: "Cases", sourceId: "cases",
    roles: { measurements: [{ field: "cases" }], observation: { field: "date", interpretation: "temporal", format: "YYYY-MM-DD" } },
  });
  const v4 = makeDashboardV4({
    dataSources: { cases: { kind: "dataset", type: "uploadedCsv", fileName: "cases.csv", csvText: "date,cases\n2027-05-01,4", parsingMetadata: { date: { interpretation: "temporal", format: "YYYY-MM-DD", timezone: "date-only" } } } },
    datasetProfiles: { cases: profile },
    chronoGroups: [{
      id: "cases-playback", name: "Cases playback", period: { start: "2027-05-01", end: "2027-05-01" },
      matching: { policy: "exact" }, secondsPerFrame: 1,
      members: [{ chartId: "cases-trend", timeRole: "observation" }],
    }],
    scenes: [{
      id: "cases-scene", name: "Cases scene", pageId: "overview", chronoGroupId: "cases-playback",
      period: { start: "2027-05-01T00:00:00.000Z", end: "2027-05-01T00:00:00.000Z" },
      frames: { mode: "source", chartId: "cases-trend", selection: "all" },
      members: [{ chartId: "cases-trend", width: 1 }],
      present: { chartIds: ["cases-trend"], layout: "single" },
      audience: { datePosition: { xPermille: 680, yPermille: 40, widthPermille: 280 } },
    }],
    pages: [{ id: "overview", title: "Overview", sections: [{ id: "response", title: "Response", panels: [chart] }] }],
  });
  const dashboard = migrateDashboardV4ToV5(v4);
  dashboard.chronoGroups[0].temporalReview = { status: "needs-review", sourceIds: ["cases"] };
  dashboard.scenes[0].temporalReview = { status: "needs-review", sourceIds: ["cases"] };
  dashboard.scenes[0].present.temporalReview = { status: "degraded", sourceIds: ["cases"] };
  const bytes = new Uint8Array([1, 2, 3, 4]);
  dashboard.assets["asset-map"] = {
    ...dashboard.assets["asset-map"], byteLength: 4,
    sha256: "9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a",
  };
  dashboard.contentLibrary.mediaItems["media-image-source"].byteLength = 4;
  const bundle = serializeDashboardBundle(dashboard, { assetPayloads: {
    "asset-map": { base64: encodeAssetBase64(bytes), byteLength: 4, mediaType: "image/png", sha256: dashboard.assets["asset-map"].sha256 },
  } });
  const parsed = parseDashboardBundle(JSON.stringify(bundle));
  assert.deepEqual(parsed.chronoGroups[0].temporalReview, { status: "needs-review", sourceIds: ["cases"] });
  assert.deepEqual(parsed.scenes[0].temporalReview, { status: "needs-review", sourceIds: ["cases"] });
  assert.deepEqual(parsed.scenes[0].present.temporalReview, { status: "degraded", sourceIds: ["cases"] });

  const malformed = structuredClone(dashboard);
  malformed.scenes[0].present.temporalReview = { status: "needs-review", sourceIds: ["cases"] };
  assert.throws(() => serializeDashboardBundle(malformed, { assetPayloads: bundle.assetPayloads }), /degraded|status/i);
});
