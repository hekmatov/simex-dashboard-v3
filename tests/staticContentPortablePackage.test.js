import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

import { serializeDashboardBundle } from "../src/charting/config/dashboardBundleV3.js";
import {
  assertWithinPublicDirectory,
  preparePromotedDashboard,
} from "../scripts/promote-dashboard-bundle.mjs";
import { sha256HexSync } from "../src/static-content/assets/assetPayloadEnvelope.js";
import { buildPortableData } from "../scripts/build-portable-data.mjs";

test("bundle promotion materializes authored Images under hashed contained package paths", () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const sha256 = sha256HexSync(bytes);
  const assetId = `asset-${sha256}`;
  const bundle = serializeDashboardBundle(portableDashboard({ assetId, sha256 }), {
    now: null,
    assetPayloads: {
      [assetId]: {
        base64: "AQIDBA==",
        byteLength: bytes.byteLength,
        mediaType: "image/png",
        sha256,
      },
    },
  });

  const promoted = preparePromotedDashboard(JSON.stringify(bundle));
  const expectedPath = `data/authored/${sha256}.png`;
  assert.deepEqual(promoted.config.dataSources.local.origin, {
    kind: "package",
    path: expectedPath,
  });
  assert.deepEqual([...promoted.files.find(({ relativePath }) => relativePath === expectedPath).contents], [...bytes]);
  assert.equal(Object.hasOwn(promoted.config, "assets"), false);
  assert.deepEqual(promoted.networkDependencies, ["https://example.test/linked.webp"]);
});

test("promotion containment rejects sibling-prefix and traversal output paths", () => {
  const publicDir = path.resolve("C:/example/public");
  assert.doesNotThrow(() => assertWithinPublicDirectory(
    path.join(publicDir, "data", "authored", "image.png"),
    publicDir,
  ));
  assert.throws(() => assertWithinPublicDirectory(
    path.resolve("C:/example/public-evil/image.png"),
    publicDir,
  ), /inside the public directory/i);
  assert.throws(() => assertWithinPublicDirectory(
    path.resolve(publicDir, "../escape.png"),
    publicDir,
  ), /inside the public directory/i);
});

test("portable data generation preserves packaged static paths without treating them as datasets", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "simex-static-portable-"));
  try {
    const publicDir = path.join(rootDir, "public");
    await mkdir(path.join(publicDir, "config"), { recursive: true });
    const config = portableDashboard({ assetId: "unused", sha256: "a".repeat(64) });
    delete config.assets;
    config.dataSources.local.origin = {
      kind: "package",
      path: `data/authored/${"a".repeat(64)}.png`,
    };
    await writeFile(path.join(publicDir, "config", "dashboard.json"), JSON.stringify(config));
    await writeFile(path.join(publicDir, "config", "dataset-profiles.json"), "{}");
    const { payload } = await buildPortableData({ rootDir });

    assert.equal(payload.config.dataSources.local.origin.kind, "package");
    assert.deepEqual(payload.sources, {});
  } finally {
    await rm(rootDir, { recursive: true, force: true });
  }
});

test("the flash-drive server serves every accepted raster type behind a separator-safe root", async () => {
  const source = await readFile(new URL("../scripts/package-flashdrive.mjs", import.meta.url), "utf8");
  assert.match(source, /"\.webp" \{ return "image\/webp" \}/);
  assert.match(source, /\$rootPrefix/);
  assert.match(source, /StartsWith\(\$rootPrefix/);
});

function portableDashboard({ assetId, sha256 }) {
  return {
    configVersion: 4,
    id: "portable-static",
    title: "Portable static",
    timezone: "UTC",
    dataSources: {
      local: imageSource({ kind: "asset", assetId }),
      linked: imageSource({ kind: "url", url: "https://example.test/linked.webp" }),
    },
    datasetProfiles: {},
    assets: {
      [assetId]: {
        mediaType: "image/png",
        byteLength: 4,
        width: 8,
        height: 6,
        sha256,
        storageState: "durable",
      },
    },
    chronoGroups: [],
    pages: [{
      id: "overview",
      title: "Overview",
      sections: [{
        id: "images",
        title: "Images",
        panels: [imageChart("local-chart", "local"), imageChart("linked-chart", "linked")],
      }],
    }],
  };
}

function imageSource(origin) {
  return {
    kind: "staticImage",
    sourceVersion: 1,
    revision: 1,
    origin,
    alt: "Briefing",
    decorative: false,
    fit: "contain",
    crop: { x: 0, y: 0, width: 1000, height: 1000 },
    rotation: 0,
  };
}

function imageChart(id, sourceId) {
  return {
    configVersion: 3,
    id,
    typeId: "image",
    title: id,
    description: "",
    sourceId,
    roles: {},
    transformations: { filters: [], grouping: null, aggregation: null, duplicates: null, missingValues: "gap" },
    presentation: { title: { align: "left" }, collection: null },
    interaction: { zoom: { enabled: true }, timeSync: null },
    layout: { size: "standard" },
  };
}
