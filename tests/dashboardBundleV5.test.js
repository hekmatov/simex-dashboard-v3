import assert from "node:assert/strict";
import test from "node:test";

import {
  DASHBOARD_BUNDLE_VERSION,
  DASHBOARD_SCHEMA_VERSION,
  parseDashboardBundle,
  serializeDashboardBundle,
} from "../src/charting/config/dashboardBundleV3.js";
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
