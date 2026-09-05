import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { build, createServer } from "vite";

const ROOT = path.resolve(import.meta.dirname, "..");

const vite = await createServer({
  root: ROOT,
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const { createPdpcReleaseProfile } = await vite.ssrLoadModule(
  "/src/release/pdpcReleaseProfile.js",
);
await vite.close();

test("the explicit release profile closes every non-View entry and mode path", () => {
  const profile = createPdpcReleaseProfile("biomedical");
  for (const entry of [
    { surface: "workspace", requestedMode: "home", channelId: null, issue: null },
    { surface: "workspace", requestedMode: "build", channelId: null, issue: null },
    { surface: "workspace", requestedMode: "present", channelId: null, issue: null },
    { surface: "audience", requestedMode: "present", channelId: "abcdefghijklmnop", issue: null },
  ]) {
    assert.deepEqual(profile.normalizeEntry(entry), {
      surface: "workspace",
      requestedMode: "view",
      channelId: null,
      issue: "unsupported_view_only_entry",
    });
  }
  assert.deepEqual(profile.requestMode("build"), {
    ok: false,
    mode: "view",
    reason: "This release is view-only.",
  });
  assert.deepEqual(profile.requestMode("present"), {
    ok: false,
    mode: "view",
    reason: "This release is view-only.",
  });
  assert.equal(profile.requestMode("view"), null);
  assert.equal(profile.initialMode, "view");
  assert.deepEqual(profile.availableModes, ["view"]);
});

test("the release profile requires exactly its generated page pair", () => {
  const biomedical = createPdpcReleaseProfile("biomedical");
  const socioeconomic = createPdpcReleaseProfile("socioeconomic");
  const bioDashboard = { pages: [{ id: "scenario" }, { id: "biomedical" }] };
  const socioeconomicDashboard = { pages: [{ id: "scenario" }, { id: "socio_economic" }] };

  assert.strictEqual(biomedical.prepareDashboard(bioDashboard), bioDashboard);
  assert.strictEqual(socioeconomic.prepareDashboard(socioeconomicDashboard), socioeconomicDashboard);
  assert.throws(
    () => biomedical.prepareDashboard({ pages: [{ id: "scenario" }, { id: "socio_economic" }] }),
    /do(?:es)? not match the biomedical release manifest/,
  );
  assert.throws(
    () => createPdpcReleaseProfile("operations"),
    /Unsupported PDPC release variant "operations"/,
  );
});

test("the ordinary Vite build graph excludes the PDPC release entry, CSS, and lockup", async (t) => {
  const output = await mkdtemp(path.join(os.tmpdir(), "simex-ordinary-build-"));
  t.after(() => rm(output, { recursive: true, force: true }));

  await build({
    root: ROOT,
    logLevel: "silent",
    build: {
      outDir: output,
      emptyOutDir: true,
      manifest: true,
    },
  });

  const manifest = JSON.parse(await readFile(path.join(output, ".vite", "manifest.json"), "utf8"));
  const graph = JSON.stringify(manifest);
  assert.doesNotMatch(graph, /src\/release\//);
  assert.doesNotMatch(graph, /pdpc-lockup/);

  const files = await recursiveFiles(output);
  assert.equal(files.some((file) => /pdpc-lockup/i.test(file)), false);
  const runtimeText = (await Promise.all(
    files
      .filter((file) => /\.(?:css|html|js)$/i.test(file))
      .map((file) => readFile(path.join(output, file), "utf8")),
  )).join("\n");
  assert.doesNotMatch(runtimeText, /Fictional scenario · Exercise use only/);
});

async function recursiveFiles(root) {
  const files = [];
  await visit(root, "");
  return files;

  async function visit(directory, relative) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const child = path.join(directory, entry.name);
      const childRelative = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) await visit(child, childRelative);
      else if (entry.isFile()) files.push(childRelative);
    }
  }
}
