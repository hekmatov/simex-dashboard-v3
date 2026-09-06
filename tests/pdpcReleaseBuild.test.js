import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildPdpcReleaseSet } from "../scripts/build-pdpc-release.mjs";
import {
  finalizePdpcRuntimeManifest,
  verifyPdpcStaticBuild,
} from "../scripts/verify-pdpc-static-build.mjs";
import { createPdpcReleaseMetadata } from "../scripts/lib/pdpc-release.mjs";

const SOURCE_COMMIT = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const INPUT_SHA256 = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

test("the release builder validates before building either variant", async (t) => {
  const fixture = await releaseFixture(t);
  let buildCalls = 0;
  const invalid = envelope();
  invalid.config.pages.pop();

  await assert.rejects(
    buildPdpcReleaseSet({
      ...fixture,
      envelope: invalid,
      buildVariant: async () => { buildCalls += 1; },
      verifyVariant: async () => {},
    }),
    /exactly one each of scenario, biomedical, and socio_economic/,
  );
  assert.equal(buildCalls, 0);
  await assert.rejects(readFile(path.join(fixture.outDir, "pdpc-release-set.json")), {
    code: "ENOENT",
  });
});

test("the release builder publishes both variants together with stable manifests", async (t) => {
  const fixture = await releaseFixture(t);
  const builds = [];
  const verifications = [];

  const result = await buildPdpcReleaseSet({
    ...fixture,
    envelope: envelope(),
    buildVariant: async ({ variant, publicDir, outputDir }) => {
      builds.push({
        variant,
        pageIds: (await readJson(path.join(publicDir, "config", "dashboard.json")))
          .pages.map(({ id }) => id),
      });
      await cp(publicDir, outputDir, { recursive: true });
      await writeFile(path.join(outputDir, "index.html"), `<main>${variant}</main>\n`);
    },
    verifyVariant: async ({ variant, outputDir, manifest }) => {
      verifications.push({
        variant,
        outputDir,
        manifest: await readJson(path.join(outputDir, "release-manifest.json")),
      });
      assert.equal(manifest.variant, variant);
    },
  });

  assert.deepEqual(builds, [
    { variant: "biomedical", pageIds: ["scenario", "biomedical"] },
    { variant: "socioeconomic", pageIds: ["scenario", "socio_economic"] },
  ]);
  assert.deepEqual(verifications.map(({ variant }) => variant), ["biomedical", "socioeconomic"]);
  assert.deepEqual((await readdir(fixture.outDir)).sort(), [
    "biomedical",
    "pdpc-release-set.json",
    "socioeconomic",
  ]);
  assert.equal(result.releaseId, "pdpc-v1-aaaaaaaaaaaa-bbbbbbbbbbbb");

  const biomedicalManifest = await readJson(path.join(
    fixture.outDir,
    "biomedical",
    "release-manifest.json",
  ));
  const socioeconomicManifest = await readJson(path.join(
    fixture.outDir,
    "socioeconomic",
    "release-manifest.json",
  ));
  assert.equal(biomedicalManifest.sourceCommit, SOURCE_COMMIT);
  assert.equal(biomedicalManifest.inputSha256, INPUT_SHA256);
  assert.equal(biomedicalManifest.releaseId, socioeconomicManifest.releaseId);
  assert.deepEqual(biomedicalManifest.includedPageIds, ["scenario", "biomedical"]);
  assert.deepEqual(socioeconomicManifest.includedPageIds, ["scenario", "socio_economic"]);

  const biomedicalConfig = await readJson(path.join(
    fixture.outDir,
    "biomedical",
    "config",
    "dashboard.json",
  ));
  const socioeconomicConfig = await readJson(path.join(
    fixture.outDir,
    "socioeconomic",
    "config",
    "dashboard.json",
  ));
  assert.equal(
    JSON.stringify(biomedicalConfig.pages[0]),
    '{"brief":"Identical authored content","id":"scenario","sections":[],"title":"Scenario"}',
  );
  assert.equal(
    JSON.stringify(biomedicalConfig.pages[0]),
    JSON.stringify(socioeconomicConfig.pages[0]),
  );
  assert.doesNotMatch(
    await readFile(path.join(fixture.outDir, "pdpc-release-set.json"), "utf8"),
    /createdAt|exportedAt|input\.json|simex-pdpc-build-/,
  );
});

test("a second-variant failure preserves the prior owned pair and leaves no partial release", async (t) => {
  const fixture = await releaseFixture(t);
  await mkdir(fixture.outDir, { recursive: true });
  await writeFile(path.join(fixture.outDir, "pdpc-release-set.json"), `${JSON.stringify({
    factory: "simex-pdpc-release",
    manifestVersion: 1,
  })}\n`);
  await writeFile(path.join(fixture.outDir, "prior.txt"), "prior complete release\n");

  await assert.rejects(
    buildPdpcReleaseSet({
      ...fixture,
      envelope: envelope(),
      buildVariant: async ({ variant, publicDir, outputDir }) => {
        if (variant === "socioeconomic") throw new Error("synthetic Vite failure");
        await cp(publicDir, outputDir, { recursive: true });
      },
      verifyVariant: async () => {},
    }),
    /synthetic Vite failure/,
  );

  assert.equal(await readFile(path.join(fixture.outDir, "prior.txt"), "utf8"), "prior complete release\n");
  assert.deepEqual((await readdir(path.dirname(fixture.outDir))).sort(), ["pdpc"]);
});

test("an unowned output is rejected before the build boundary", async (t) => {
  const fixture = await releaseFixture(t);
  await mkdir(fixture.outDir, { recursive: true });
  await writeFile(path.join(fixture.outDir, "unrelated.txt"), "keep\n");
  let buildCalls = 0;

  await assert.rejects(
    buildPdpcReleaseSet({
      ...fixture,
      envelope: envelope(),
      buildVariant: async () => { buildCalls += 1; },
      verifyVariant: async () => {},
    }),
    /not owned by simex-pdpc-release/,
  );
  assert.equal(buildCalls, 0);
  assert.equal(await readFile(path.join(fixture.outDir, "unrelated.txt"), "utf8"), "keep\n");
});

test("the static verifier accepts the fingerprinted official PDPC logo", async (t) => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "simex-pdpc-verify-logo-"));
  t.after(() => rm(outputDir, { recursive: true, force: true }));
  await mkdir(path.join(outputDir, "assets"), { recursive: true });
  await mkdir(path.join(outputDir, "config"), { recursive: true });
  await mkdir(path.join(outputDir, "vendor"), { recursive: true });

  await Promise.all([
    writeFile(path.join(outputDir, "index.html"), '<script type="module" src="./assets/release-fixture.js"></script>\n'),
    writeFile(path.join(outputDir, "release-manifest.json"), stableJson({
      ...metadata().variantManifests.biomedical,
    })),
    writeFile(path.join(outputDir, "service-worker.js"), "// fixture\n"),
    writeFile(path.join(outputDir, "portable-dashboard-data.js"), "// fixture\n"),
    writeFile(path.join(outputDir, "config", "dashboard.json"), stableJson({
      ...envelope().config,
      pages: envelope().config.pages.slice(0, 2),
    })),
    writeFile(path.join(outputDir, "config", "dataset-profiles.json"), "{}\n"),
    writeFile(path.join(outputDir, "vendor", "three.min.js"), "// fixture\n"),
    writeFile(path.join(outputDir, "vendor", "vanta.net.min.js"), "// fixture\n"),
    writeFile(path.join(outputDir, "assets", "pdpc-logo-fixture.png"), "official-logo-bytes"),
    writeFile(
      path.join(outputDir, "assets", "release-fixture.js"),
      'console.log("Fictional scenario · Exercise use only");\n',
    ),
  ]);
  await finalizePdpcRuntimeManifest({ outputDir, variant: "biomedical" });

  const result = await verifyPdpcStaticBuild({ outputDir, variant: "biomedical" });
  assert.equal(result.variant, "biomedical");
  assert.deepEqual(result.includedPageIds, ["scenario", "biomedical"]);
});

test("the static verifier rejects a config whose pages diverge from its manifest", async (t) => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "simex-pdpc-verify-pages-"));
  t.after(() => rm(outputDir, { recursive: true, force: true }));
  await mkdir(path.join(outputDir, "config"));
  await writeFile(path.join(outputDir, "release-manifest.json"), stableJson({
    ...metadata().variantManifests.biomedical,
  }));
  await writeFile(path.join(outputDir, "config", "dashboard.json"), stableJson({
    ...envelope().config,
    pages: [{ id: "scenario" }, { id: "socio_economic" }],
  }));

  await assert.rejects(
    verifyPdpcStaticBuild({ outputDir, variant: "biomedical" }),
    /config pages do not match release manifest/,
  );
});

test("the static verifier rejects a missing contained package asset", async (t) => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "simex-pdpc-verify-assets-"));
  t.after(() => rm(outputDir, { recursive: true, force: true }));
  await mkdir(path.join(outputDir, "config"));
  await writeFile(path.join(outputDir, "release-manifest.json"), stableJson({
    ...metadata().variantManifests.biomedical,
  }));
  const config = {
    ...envelope().config,
    pages: envelope().config.pages.slice(0, 2),
    assets: {
      "asset-missing": {
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
        "media-missing": {
          current: { kind: "package", path: "assets/package/asset-missing.png" },
        },
      },
    },
  };
  await writeFile(path.join(outputDir, "config", "dashboard.json"), stableJson(config));

  await assert.rejects(
    verifyPdpcStaticBuild({ outputDir, variant: "biomedical" }),
    /packaged media asset is missing: assets\/package\/asset-missing\.png/,
  );
});

async function releaseFixture(t) {
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "simex-pdpc-build-"));
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const rootDir = path.join(fixtureRoot, "repo");
  await mkdir(path.join(rootDir, "public"), { recursive: true });
  await writeFile(path.join(rootDir, "public", "service-worker.js"), "// fixture\n");
  return {
    rootDir,
    outDir: path.join(rootDir, "release", "pdpc"),
    metadata: metadata(),
  };
}

function metadata() {
  return createPdpcReleaseMetadata({
    sourceCommit: SOURCE_COMMIT,
    inputSha256: INPUT_SHA256,
    bundleType: "simex-dashboard-bundle",
    bundleVersion: 6,
  });
}

function envelope() {
  return {
    config: {
      configVersion: 6,
      pages: [
        { id: "scenario", title: "Scenario", sections: [], brief: "Identical authored content" },
        { id: "biomedical", title: "Biomedical", sections: [] },
        { id: "socio_economic", title: "Socio-economic", sections: [] },
      ],
      dataSources: {},
      datasetProfiles: {},
      assets: {},
      contentLibrary: { mediaItems: {} },
    },
    assetPayloads: {},
  };
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}
