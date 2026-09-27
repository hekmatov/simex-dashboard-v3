import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("the release workflow records only Cloudflare and offline artifacts for a variant", async (t) => {
  const { buildPdpcVariantArtifacts } = await import("../scripts/build-pdpc-deliverables.mjs");
  const staging = await mkdtemp(path.join(os.tmpdir(), "simex-pdpc-deliverables-workflow-"));
  t.after(() => rm(staging, { recursive: true, force: true }));
  const cloudflareDir = path.join(staging, "Cloudflare");
  const releaseDir = path.join(cloudflareDir, "biomedical");
  await mkdir(releaseDir, { recursive: true });
  await writeFile(path.join(releaseDir, "index.html"), "cloudflare");

  const result = await buildPdpcVariantArtifacts({
    staging,
    cloudflareDir,
    variant: { id: "biomedical", label: "Biomedical" },
    verifyVariant: async () => ({
      includedPageIds: ["scenario", "biomedical"],
      releaseId: "pdpc-test",
      fileCount: 1,
      runtimeAssetCount: 1,
    }),
    buildSingleFile: async ({ outputFile }) => {
      await mkdir(path.dirname(outputFile), { recursive: true });
      await writeFile(outputFile, "offline");
      return { bytes: 7, embeddedPackageAssets: 0 };
    },
    createZip: async ({ outputFile }) => {
      await writeFile(outputFile, "zip");
      return { entries: ["index.html"] };
    },
  });

  assert.deepEqual(result.deliverables.map(({ path: artifactPath, format }) => [artifactPath, format]), [
    ["PDPC-Biomedical-Cloudflare.zip", "cloudflare-zip"],
    ["Offline/PDPC-Biomedical-Offline.html", "offline-single-html"],
  ]);
  await assert.rejects(readFile(path.join(staging, "PDF", "PDPC-Biomedical.pdf"), "utf8"), {
    code: "ENOENT",
  });
  assert.equal("pdfBytes" in result.validation, false);
  assert.equal("pdfSections" in result.validation, false);
});
