import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MIME_TYPES = new Map([
  [".gif", "image/gif"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".otf", "font/otf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

const VARIANT_LABELS = Object.freeze({
  biomedical: "Biomedical",
  socioeconomic: "Socioeconomic",
});

export async function buildPdpcSingleFile({ releaseDir, outputFile, variant }) {
  const label = VARIANT_LABELS[variant];
  if (!label) throw new Error(`Unsupported PDPC single-file variant "${String(variant)}".`);
  const resolvedRelease = path.resolve(releaseDir);
  const resolvedOutput = path.resolve(outputFile);
  const assetsDir = path.join(resolvedRelease, "assets");
  const entries = await readdir(assetsDir);
  const mainName = entries.find((name) => /^release-.*\.js$/.test(name));
  const cssName = entries.find((name) => /^release-.*\.css$/.test(name));
  const html2canvasName = entries.find((name) => /^html2canvas\.esm-.*\.js$/.test(name));
  if (!mainName || !cssName) {
    throw new Error("PDPC single-file packaging requires release JavaScript and CSS assets.");
  }

  const three = await readFile(path.join(resolvedRelease, "vendor", "three.min.js"), "utf8");
  const vanta = await readFile(path.join(resolvedRelease, "vendor", "vanta.net.min.js"), "utf8");
  const portable = await readFile(path.join(resolvedRelease, "portable-dashboard-data.js"), "utf8");
  const css = await inlineCss(path.join(assetsDir, cssName), resolvedRelease);
  const embeddedPackageAssets = await packageAssetData(portable, resolvedRelease);

  let html2canvas = "";
  let main = await readFile(path.join(assetsDir, mainName), "utf8");
  if (html2canvasName) {
    html2canvas = await readFile(path.join(assetsDir, html2canvasName), "utf8");
    const html2canvasExport = /export\{([A-Za-z_$][\w$]*) as default\};?\s*$/;
    if (!html2canvasExport.test(html2canvas)) {
      throw new Error("The html2canvas output does not have the supported default export shape.");
    }
    html2canvas = html2canvas.replace(html2canvasExport, "window.html2canvas=$1;");
    const escapedChunkName = escapeRegExp(html2canvasName);
    const dynamicImport = new RegExp(`import\\(["']\\./${escapedChunkName}["']\\)`, "g");
    if ((main.match(dynamicImport) ?? []).length !== 1) {
      throw new Error("The release output must contain exactly one html2canvas dynamic import.");
    }
    main = main.replace(dynamicImport, "Promise.resolve({default:window.html2canvas})");
  }

  const logoImport = /new URL\("(pdpc-logo-[A-Za-z0-9_-]+\.png)",import\.meta\.url\)\.href/;
  const logoMatch = main.match(logoImport);
  if (!logoMatch) throw new Error("The release output is missing the bundled PDPC logo URL.");
  main = main.replace(
    logoImport,
    JSON.stringify(await dataUri(path.join(assetsDir, logoMatch[1]))),
  );
  main = main.replaceAll("import.meta.url", "document.baseURI");
  if (/\bimport(?:\.meta|\s*\()/.test(main)) {
    throw new Error("The release output still contains module-only imports after single-file conversion.");
  }

  const manifest = await optionalJson(path.join(resolvedRelease, "release-manifest.json"));
  const releaseId = typeof manifest?.releaseId === "string" ? manifest.releaseId : "";
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#08224a">
  <meta name="simex-offline-format" content="single-file-v1">
  <meta name="simex-release-id" content="${escapeAttribute(releaseId)}">
  <title>PDPC ${label} Simulation Exercise Dashboard</title>
  <style>${css}</style>
</head>
<body>
  <div id="vanta-background"></div>
  <div id="root"></div>
  <script>${isolatedScript(three)}</script>
  <script>${isolatedScript(vanta)}</script>
  <script>${isolatedScript(packageImageResolver(embeddedPackageAssets))}</script>
  <script>${isolatedScript(portable)}</script>
  ${html2canvas ? `<script>${isolatedScript(html2canvas)}</script>` : ""}
  <script>${isolatedScript(main)}</script>
</body>
</html>`;

  await mkdir(path.dirname(resolvedOutput), { recursive: true });
  await writeFile(resolvedOutput, html, "utf8");
  return Object.freeze({
    variant,
    outputFile: resolvedOutput,
    bytes: Buffer.byteLength(html),
    embeddedPackageAssets: Object.keys(embeddedPackageAssets).length,
  });
}

async function inlineCss(cssFile, releaseDir) {
  const cssDir = path.dirname(cssFile);
  let css = await readFile(cssFile, "utf8");
  const matches = [...css.matchAll(/url\((['"]?)([^)'"\s]+)\1\)/g)];
  const replacements = new Map();
  for (const match of matches) {
    const value = match[2];
    if (/^(?:data:|https?:|#)/i.test(value)) continue;
    const decoded = decodeURIComponent(value);
    const absolute = value.startsWith("/")
      ? path.join(releaseDir, decoded.replace(/^\/+/, ""))
      : path.resolve(cssDir, decoded);
    replacements.set(value, await dataUri(absolute));
  }
  for (const [source, embedded] of replacements) css = css.split(source).join(embedded);
  return css.replace(/<\/style/gi, "<\\/style");
}

async function packageAssetData(portable, releaseDir) {
  const assetPaths = [...new Set(
    [...portable.matchAll(/(?:assets\/package|data\/authored)\/[A-Za-z0-9_.-]+/g)].map((match) => match[0]),
  )];
  const embedded = {};
  for (const assetPath of assetPaths) {
    embedded[assetPath] = await dataUri(path.join(releaseDir, ...assetPath.split("/")));
  }
  return embedded;
}

function packageImageResolver(embeddedPackageAssets) {
  return `const embedded=${JSON.stringify(embeddedPackageAssets)};
const rewrite=value=>{if(typeof value!=="string")return value;const normalized=value.replace(/^\\.\\//,"");return embedded[normalized]||value};
const setAttribute=Element.prototype.setAttribute;
Element.prototype.setAttribute=function(name,value){return setAttribute.call(this,name,this instanceof HTMLImageElement&&String(name).toLowerCase()==="src"?rewrite(value):value)};
const descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,"src");
if(descriptor?.get&&descriptor?.set)Object.defineProperty(HTMLImageElement.prototype,"src",{configurable:descriptor.configurable,enumerable:descriptor.enumerable,get:descriptor.get,set(value){descriptor.set.call(this,rewrite(value))}});`;
}

async function dataUri(filePath) {
  const mime = MIME_TYPES.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream";
  const bytes = await readFile(filePath);
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

function isolatedScript(text) {
  return `(function(){${text.replace(/<\/script/gi, "<\\/script")}\n}).call(window);`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

async function optionalJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}
