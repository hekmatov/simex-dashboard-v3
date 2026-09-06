import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  PDPC_RELEASE_FACTORY,
  PDPC_RELEASE_MANIFEST_VERSION,
  assertPdpcOutputTarget,
  createPdpcReleaseMetadata,
  materializePdpcPackageAssets,
  parsePdpcReleaseArgs,
  projectPdpcVariants,
  validatePdpcReleasePages,
} from "../scripts/lib/pdpc-release.mjs";

const SOURCE_COMMIT = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const INPUT_SHA256 = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

test("CLI parsing requires one bundle and accepts one optional output directory", () => {
  assert.deepEqual(
    parsePdpcReleaseArgs(["--bundle", "C:\\input bundle.json"]),
    { bundlePath: "C:\\input bundle.json", outDir: null },
  );
  assert.deepEqual(
    parsePdpcReleaseArgs(["--out-dir", "release/custom", "--bundle", "bundle.json"]),
    { bundlePath: "bundle.json", outDir: "release/custom" },
  );
  assert.throws(
    () => parsePdpcReleaseArgs([]),
    /--bundle is required/,
  );
  assert.throws(
    () => parsePdpcReleaseArgs(["--bundle"]),
    /--bundle requires a value/,
  );
  assert.throws(
    () => parsePdpcReleaseArgs(["--bundle", "a.json", "--mystery", "x"]),
    /Unknown argument "--mystery"/,
  );
});

test("release page validation accepts exactly one required page and no extras", () => {
  const config = dashboardConfig();
  assert.deepEqual(
    validatePdpcReleasePages(config).map(({ id }) => id),
    ["scenario", "biomedical", "socio_economic"],
  );

  for (const [label, pages] of [
    ["missing", config.pages.slice(0, 2)],
    ["duplicate", [config.pages[0], config.pages[1], { ...config.pages[1] }]],
    ["extra", [...config.pages, { id: "operations", title: "Operations", sections: [] }]],
  ]) {
    assert.throws(
      () => validatePdpcReleasePages({ ...config, pages }),
      /exactly one each of scenario, biomedical, and socio_economic and no other pages/,
      label,
    );
  }
});

test("variant projection preserves one byte-identical Scenario without mutating input", () => {
  const config = dashboardConfig();
  const before = structuredClone(config);
  const variants = projectPdpcVariants(config);

  assert.deepEqual(
    variants.biomedical.pages.map(({ id }) => id),
    ["scenario", "biomedical"],
  );
  assert.deepEqual(
    variants.socioeconomic.pages.map(({ id }) => id),
    ["scenario", "socio_economic"],
  );
  assert.equal(
    JSON.stringify(variants.biomedical.pages[0]),
    '{"id":"scenario","title":"Scenario","sections":[],"brief":"Identical authored content"}',
  );
  assert.equal(
    JSON.stringify(variants.biomedical.pages[0]),
    JSON.stringify(variants.socioeconomic.pages[0]),
  );
  assert.deepEqual(config, before);
  assert.notEqual(variants.biomedical.pages[0], config.pages[0]);
});

test("release metadata is deterministic and shares identity across literal variant manifests", () => {
  const metadata = createPdpcReleaseMetadata({
    sourceCommit: SOURCE_COMMIT,
    inputSha256: INPUT_SHA256,
    bundleType: "simex-dashboard-bundle",
    bundleVersion: 6,
  });

  assert.equal(metadata.releaseId, "pdpc-v1-aaaaaaaaaaaa-bbbbbbbbbbbb");
  assert.deepEqual(metadata.variantManifests.biomedical, {
    factory: "simex-pdpc-release",
    manifestVersion: 1,
    releaseId: "pdpc-v1-aaaaaaaaaaaa-bbbbbbbbbbbb",
    sourceCommit: SOURCE_COMMIT,
    inputSha256: INPUT_SHA256,
    bundleType: "simex-dashboard-bundle",
    bundleVersion: 6,
    variant: "biomedical",
    includedPageIds: ["scenario", "biomedical"],
  });
  assert.deepEqual(metadata.variantManifests.socioeconomic.includedPageIds, [
    "scenario",
    "socio_economic",
  ]);
  assert.equal(
    metadata.variantManifests.biomedical.releaseId,
    metadata.variantManifests.socioeconomic.releaseId,
  );
  assert.doesNotMatch(JSON.stringify(metadata), /exportedAt|createdAt|C:\\/);
});

test("asset materialization emits verified contained package bytes and leaves the envelope unchanged", () => {
  const envelope = assetEnvelope();
  const before = structuredClone(envelope);
  const result = materializePdpcPackageAssets(envelope);

  assert.deepEqual([...result.files.keys()], [
    "assets/package/asset-hello.png",
  ]);
  assert.equal(Buffer.from(result.files.get("assets/package/asset-hello.png")).toString(), "hello");
  assert.deepEqual(result.config.contentLibrary.mediaItems["media-one"].current, {
    kind: "package",
    path: "assets/package/asset-hello.png",
  });
  assert.equal(result.config.contentLibrary.mediaItems["media-one"].origin, "packaged");
  assert.deepEqual(envelope, before);

  const corrupt = assetEnvelope();
  corrupt.assetPayloads["asset-hello"].base64 = "d29ybGQ=";
  assert.throws(
    () => materializePdpcPackageAssets(corrupt),
    /asset-hello.*SHA-256/,
  );
});

test("output target checks reject dangerous and unowned replacement paths", async (t) => {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "simex-pdpc-target-"));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const repoRoot = path.join(fixtureRoot, "repo");
  await mkdir(path.join(repoRoot, "release"), { recursive: true });

  await assert.rejects(
    assertPdpcOutputTarget({ repoRoot, outDir: repoRoot, homeDir: path.join(fixtureRoot, "home") }),
    /repository root/,
  );
  await assert.rejects(
    assertPdpcOutputTarget({ repoRoot, outDir: path.join(repoRoot, "public", "pdpc"), homeDir: path.join(fixtureRoot, "home") }),
    /protected repository directory/,
  );

  const unowned = path.join(repoRoot, "release", "unowned");
  await mkdir(unowned, { recursive: true });
  await writeFile(path.join(unowned, "notes.txt"), "not factory output\n");
  await assert.rejects(
    assertPdpcOutputTarget({ repoRoot, outDir: unowned, homeDir: path.join(fixtureRoot, "home") }),
    /not owned by simex-pdpc-release/,
  );

  const owned = path.join(repoRoot, "release", "owned");
  await mkdir(owned, { recursive: true });
  await writeFile(path.join(owned, "pdpc-release-set.json"), JSON.stringify({
    factory: PDPC_RELEASE_FACTORY,
    manifestVersion: PDPC_RELEASE_MANIFEST_VERSION,
  }));
  assert.deepEqual(
    await assertPdpcOutputTarget({ repoRoot, outDir: owned, homeDir: path.join(fixtureRoot, "home") }),
    { outDir: path.resolve(owned), exists: true, owned: true },
  );
});

function dashboardConfig() {
  return {
    pages: [
      { id: "scenario", title: "Scenario", sections: [], brief: "Identical authored content" },
      { id: "biomedical", title: "Biomedical", sections: [] },
      { id: "socio_economic", title: "Socio-economic", sections: [] },
    ],
  };
}

function assetEnvelope() {
  return {
    config: {
      assets: {
        "asset-hello": {
          mediaType: "image/png",
          byteLength: 5,
          width: 1,
          height: 1,
          sha256: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
          storageState: "durable",
        },
      },
      contentLibrary: {
        mediaItems: {
          "media-one": {
            mediaId: "media-one",
            origin: "uploaded",
            displayName: "One",
            defaultDescription: "",
            revision: 1,
            current: { kind: "asset", assetId: "asset-hello" },
            health: "ready",
            dimensions: { width: 1, height: 1 },
            byteLength: 5,
            mediaType: "image/png",
          },
        },
      },
    },
    assetPayloads: {
      "asset-hello": {
        base64: "aGVsbG8=",
        byteLength: 5,
        mediaType: "image/png",
        sha256: "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
      },
    },
  };
}
