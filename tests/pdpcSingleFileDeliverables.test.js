import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { inflateRawSync } from "node:zlib";
import { runInNewContext } from "node:vm";

import { buildPortableData } from "../scripts/build-portable-data.mjs";

test("PDPC release builds default only missing or invalid appearance preferences to Light", async () => {
  const { createPdpcLightDefaultPlugin } = await import("../scripts/lib/pdpc-light-default.mjs");
  const themeModulePath = path.resolve("src/theme/dashboardTheme.js");
  const plugin = createPdpcLightDefaultPlugin({ themeModulePath });
  const source = `
export function readAppearancePreference(storage = browserStorage) {
  try {
    const value = storage?.getItem(APPEARANCE_STORAGE_KEY);
    return APPEARANCE_PREFERENCES.includes(value) ? value : "system";
  } catch {
    return "system";
  }
}
export function persistAppearancePreference(value, storage = browserStorage) {
  return storage.setItem(APPEARANCE_STORAGE_KEY, value);
}`;

  assert.equal(plugin.transform(source, path.resolve("src/App.jsx")), null);
  const transformed = plugin.transform(source, themeModulePath);
  assert.match(transformed.code, /includes\(value\) \? value : "light"/);
  assert.match(transformed.code, /catch \{\s*return "light"/);
  assert.match(transformed.code, /return storage\.setItem/);
  assert.equal(plugin.appliedCount(), 1);
});

test("single-file packaging preserves safe package paths while embedding every runtime byte", async (t) => {
  const root = await fixtureRoot(t, "simex-single-file-");
  const releaseDir = path.join(root, "release");
  const outputFile = path.join(root, "PDPC-Biomedical-Offline.html");
  await createReleaseFixture(releaseDir);

  const { buildPdpcSingleFile } = await import("../scripts/lib/pdpc-single-file.mjs");
  const result = await buildPdpcSingleFile({ releaseDir, outputFile, variant: "biomedical" });
  const html = await readFile(outputFile, "utf8");

  assert.equal(result.variant, "biomedical");
  assert.equal(result.outputFile, outputFile);
  assert.match(html, /<meta name="simex-offline-format" content="single-file-v1">/);
  assert.match(html, /assets\/package\/asset-demo\.png/);
  assert.match(html, /data:image\/png;base64,aW1hZ2UtYnl0ZXM=/);
  assert.match(html, /data\/authored\/default-demo\.png/);
  assert.match(html, /data:image\/png;base64,ZGVmYXVsdC1ieXRlcw==/);
  assert.match(html, /data:font\/woff2;base64,Zm9udC1ieXRlcw==/);
  assert.match(html, /data:image\/png;base64,bG9nby1ieXRlcw==/);
  assert.match(html, /window\.html2canvas=/);
  assert.match(html, /Element\.prototype\.setAttribute/);
  assert.doesNotMatch(html, /type="module"/);
  assert.doesNotMatch(html, /import\.meta/);
  assert.doesNotMatch(html, /import\(["']\.\/html2canvas/);
  assert.doesNotMatch(html, /<(?:script|link)[^>]+(?:src|href)="\.\//);
});

test("Cloudflare ZIP packaging keeps index.html at archive root and round-trips file bytes", async (t) => {
  const root = await fixtureRoot(t, "simex-cloudflare-zip-");
  const sourceDir = path.join(root, "biomedical");
  const outputFile = path.join(root, "PDPC-Biomedical-Cloudflare.zip");
  await mkdir(path.join(sourceDir, "assets"), { recursive: true });
  await writeFile(path.join(sourceDir, "index.html"), "<main>Biomedical</main>\n");
  await writeFile(path.join(sourceDir, "assets", "release.js"), "console.log('release');\n");

  const { createZipFromDirectory } = await import("../scripts/lib/zip-directory.mjs");
  const result = await createZipFromDirectory({ sourceDir, outputFile });
  const entries = readZipEntries(await readFile(outputFile));

  assert.deepEqual(result.entries, ["assets/release.js", "index.html"]);
  assert.equal(entries.get("index.html").toString(), "<main>Biomedical</main>\n");
  assert.equal(entries.get("assets/release.js").toString(), "console.log('release');\n");
});

test("single-file packaging accepts the inlined release chunk used for lazy surfaces", async (t) => {
  const root = await fixtureRoot(t, "simex-single-file-inlined-");
  const releaseDir = path.join(root, "release");
  const outputFile = path.join(root, "PDPC-Biomedical-Offline.html");
  await createReleaseFixture(releaseDir);
  await rm(path.join(releaseDir, "assets", "html2canvas.esm-demo.js"));
  await writeFile(
    path.join(releaseDir, "assets", "release-demo.js"),
    'const logo=new URL("pdpc-logo-demo.png",import.meta.url).href;window.fixtureLogo=logo;window.html2canvas=()=>true;\n',
  );

  const { buildPdpcSingleFile } = await import("../scripts/lib/pdpc-single-file.mjs");
  await buildPdpcSingleFile({ releaseDir, outputFile, variant: "biomedical" });
  const html = await readFile(outputFile, "utf8");
  assert.match(html, /window\.html2canvas=\(\)=>true/);
  assert.match(html, /data:image\/png;base64,bG9nby1ieXRlcw==/);
  assert.doesNotMatch(html, /import\.meta|type="module"/);
});

test("PDPC single-file conversion retains generated portable GeoJSON and CSV payloads", async (t) => {
  const root = await fixtureRoot(t, "simex-pdpc-sources-");
  const releaseDir = path.join(root, "release");
  await createReleaseFixture(releaseDir);
  const config = JSON.parse(await readFile(new URL("./fixtures/fable-m0-sources.json", import.meta.url), "utf8"));
  const configPath = path.join(root, "dashboard.json");
  const profilesPath = path.join(root, "profiles.json");
  await writeFile(configPath, JSON.stringify(config));
  await writeFile(profilesPath, "{}");
  await buildPortableData({
    rootDir: root, configPath, profilesPath,
    outputPath: path.join(releaseDir, "portable-dashboard-data.js"),
    embedPortableData: true,
  });
  const { buildPdpcSingleFile } = await import("../scripts/lib/pdpc-single-file.mjs");
  const outputFile = path.join(root, "sources.html");
  await buildPdpcSingleFile({ releaseDir, outputFile, variant: "biomedical" });
  const html = await readFile(outputFile, "utf8");
  const portableScript = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map((match) => match[1]).find((script) => script.includes("window.SIMEX_PORTABLE_DASHBOARD"));
  const window = {};
  runInNewContext(portableScript, { window });
  const payload = JSON.parse(JSON.stringify(window.SIMEX_PORTABLE_DASHBOARD));
  assert.deepEqual(payload.sources.geo_netherlands_municipalities_2026.data, config.dataSources.geo_netherlands_municipalities_2026.geoJson);
  assert.equal(payload.sources.cases.text, config.dataSources.cases.csvText);
  assert.deepEqual(payload.config.dataSources, config.dataSources);
});

async function fixtureRoot(t, prefix) {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function createReleaseFixture(releaseDir) {
  await mkdir(path.join(releaseDir, "assets", "package"), { recursive: true });
  await mkdir(path.join(releaseDir, "data", "authored"), { recursive: true });
  await mkdir(path.join(releaseDir, "vendor"), { recursive: true });
  await writeFile(path.join(releaseDir, "assets", "package", "asset-demo.png"), "image-bytes");
  await writeFile(path.join(releaseDir, "data", "authored", "default-demo.png"), "default-bytes");
  await writeFile(path.join(releaseDir, "assets", "font.woff2"), "font-bytes");
  await writeFile(path.join(releaseDir, "assets", "pdpc-logo-demo.png"), "logo-bytes");
  await writeFile(path.join(releaseDir, "assets", "release-demo.css"), '@font-face{src:url("font.woff2")}');
  await writeFile(
    path.join(releaseDir, "assets", "release-demo.js"),
    'const logo=new URL("pdpc-logo-demo.png",import.meta.url).href;import("./html2canvas.esm-demo.js");window.fixtureLogo=logo;\n',
  );
  await writeFile(
    path.join(releaseDir, "assets", "html2canvas.esm-demo.js"),
    "const capture=()=>true;export{capture as default};\n",
  );
  await writeFile(path.join(releaseDir, "vendor", "three.min.js"), "const ts='three';window.THREE={};\n");
  await writeFile(path.join(releaseDir, "vendor", "vanta.net.min.js"), "const ts='vanta';window.VANTA={};\n");
  await writeFile(
    path.join(releaseDir, "portable-dashboard-data.js"),
    'window.SIMEX_PORTABLE_DASHBOARD={"config":{"contentLibrary":{"mediaItems":{"demo":{"current":{"kind":"package","path":"assets/package/asset-demo.png"}},"default":{"current":{"kind":"package","path":"data/authored/default-demo.png"}}}}}};\n',
  );
}

function readZipEntries(bytes) {
  const entries = new Map();
  let offset = 0;
  while (offset + 4 <= bytes.length && bytes.readUInt32LE(offset) === 0x04034b50) {
    const method = bytes.readUInt16LE(offset + 8);
    const compressedSize = bytes.readUInt32LE(offset + 18);
    const nameLength = bytes.readUInt16LE(offset + 26);
    const extraLength = bytes.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = bytes.subarray(nameStart, nameStart + nameLength).toString("utf8");
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    const content = method === 0 ? compressed : inflateRawSync(compressed);
    entries.set(name, content);
    offset = dataStart + compressedSize;
  }
  return entries;
}
