#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, dirname } from "node:path";

const MIME_BY_EXTENSION = new Map([
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
]);

function parseArguments(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error("Arguments must be provided as --name value pairs.");
    }
    result[key.slice(2)] = value;
  }
  return result;
}

function requireArgument(options, name) {
  const value = options[name];
  if (!value) throw new Error(`Missing required argument --${name}.`);
  return value;
}

async function dataUrl(path) {
  const mimeType = MIME_BY_EXTENSION.get(extname(path).toLowerCase());
  if (!mimeType) {
    throw new Error(`Unsupported image type for ${path}. Use SVG, PNG, JPEG, or WebP.`);
  }
  const bytes = await readFile(path);
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildReport({ referenceUrl, candidateUrl, title, threshold }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; font-family: Inter, "Segoe UI", Arial, sans-serif; color:#082552; background:#eef4f8; }
  * { box-sizing:border-box; }
  body { margin:0; padding:24px; }
  main { max-width:1120px; margin:auto; }
  h1 { margin:0 0 8px; font-size:24px; }
  .note { margin:0 0 20px; color:#526b87; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:16px; }
  figure, section { margin:0; padding:16px; border:1px solid #cad9e8; border-radius:14px; background:#fff; }
  figcaption, h2 { margin:0 0 12px; font-size:15px; font-weight:750; }
  canvas { display:block; width:192px; height:192px; max-width:100%; margin:auto; border-radius:10px; background:#fff; }
  .preview-row { display:flex; align-items:flex-end; flex-wrap:wrap; gap:20px; min-height:210px; }
  .preview { display:grid; justify-items:center; gap:8px; min-width:64px; color:#526b87; font-size:12px; }
  .preview img { display:block; object-fit:contain; }
  .legend { display:flex; flex-wrap:wrap; gap:12px; margin-top:10px; color:#526b87; font-size:12px; }
  .swatch { display:inline-block; width:10px; height:10px; margin-right:5px; border-radius:2px; }
  .reference-only { background:#d946ef; }
  .candidate-only { background:#06b6d4; }
  .overlap { background:#082552; }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(title)}</h1>
  <p class="note">The image reference remains the acceptance criterion. Normalization removes source padding but does not alter proportions.</p>
  <div class="grid">
    <figure><figcaption>Same-scale comparison · reference</figcaption><canvas id="reference" width="192" height="192"></canvas></figure>
    <figure><figcaption>Same-scale comparison · candidate</figcaption><canvas id="candidate" width="192" height="192"></canvas></figure>
    <figure><figcaption>50% overlay</figcaption><canvas id="overlay" width="192" height="192"></canvas></figure>
    <figure>
      <figcaption>Silhouette difference</figcaption><canvas id="difference" width="192" height="192"></canvas>
      <div class="legend"><span><i class="swatch reference-only"></i>Reference only</span><span><i class="swatch candidate-only"></i>Candidate only</span><span><i class="swatch overlap"></i>Overlap</span></div>
    </figure>
  </div>
  <section style="margin-top:16px">
    <h2>Candidate at intended sizes</h2>
    <div class="preview-row">
      <div class="preview"><img src="${candidateUrl}" width="16" height="16" data-preview-size="16" alt="Candidate at 16 pixels"><span>16px</span></div>
      <div class="preview"><img src="${candidateUrl}" width="24" height="24" data-preview-size="24" alt="Candidate at 24 pixels"><span>24px</span></div>
      <div class="preview"><img src="${candidateUrl}" width="192" height="192" data-preview-size="192" alt="Candidate enlarged"><span>192px</span></div>
    </div>
  </section>
</main>
<script>
  const referenceUrl = ${JSON.stringify(referenceUrl)};
  const candidateUrl = ${JSON.stringify(candidateUrl)};
  const threshold = ${threshold};
  const size = 192;
  const padding = 16;
  window.__comparisonReady = false;

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Unable to load an embedded comparison image."));
      image.src = source;
    });
  }

  function foreground(pixel, transparentSource) {
    const alpha = pixel[3];
    if (transparentSource) return alpha > 20;
    const luminance = 0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2];
    return alpha > 20 && luminance < threshold;
  }

  function analyze(image) {
    const scratch = document.createElement("canvas");
    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = 512 / longest;
    scratch.width = Math.max(1, Math.round(image.naturalWidth * scale));
    scratch.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = scratch.getContext("2d", { willReadFrequently:true });
    context.drawImage(image, 0, 0, scratch.width, scratch.height);
    const pixels = context.getImageData(0, 0, scratch.width, scratch.height);
    let transparentSource = false;
    for (let index = 3; index < pixels.data.length; index += 4) {
      if (pixels.data[index] < 250) { transparentSource = true; break; }
    }
    let left = scratch.width;
    let top = scratch.height;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < scratch.height; y += 1) {
      for (let x = 0; x < scratch.width; x += 1) {
        const offset = (y * scratch.width + x) * 4;
        if (!foreground(pixels.data.subarray(offset, offset + 4), transparentSource)) continue;
        left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
    if (right < left || bottom < top) throw new Error("No foreground silhouette was detected. Supply a transparent or high-contrast tightly cropped reference.");
    return { scratch, transparentSource, bounds:{ left, top, width:right - left + 1, height:bottom - top + 1 } };
  }

  function normalize(analysis, target) {
    const context = target.getContext("2d", { willReadFrequently:true });
    context.clearRect(0, 0, size, size);
    const available = size - padding * 2;
    const scale = Math.min(available / analysis.bounds.width, available / analysis.bounds.height);
    const width = analysis.bounds.width * scale;
    const height = analysis.bounds.height * scale;
    context.drawImage(
      analysis.scratch,
      analysis.bounds.left,
      analysis.bounds.top,
      analysis.bounds.width,
      analysis.bounds.height,
      (size - width) / 2,
      (size - height) / 2,
      width,
      height,
    );
  }

  function drawDifference(referenceAnalysis, candidateAnalysis) {
    const reference = document.querySelector("#reference").getContext("2d").getImageData(0, 0, size, size);
    const candidate = document.querySelector("#candidate").getContext("2d").getImageData(0, 0, size, size);
    const target = document.querySelector("#difference").getContext("2d");
    const output = target.createImageData(size, size);
    for (let offset = 0; offset < output.data.length; offset += 4) {
      const inReference = foreground(reference.data.subarray(offset, offset + 4), referenceAnalysis.transparentSource);
      const inCandidate = foreground(candidate.data.subarray(offset, offset + 4), candidateAnalysis.transparentSource);
      const color = inReference && inCandidate ? [8,37,82] : inReference ? [217,70,239] : inCandidate ? [6,182,212] : [255,255,255];
      output.data.set([...color, 255], offset);
    }
    target.putImageData(output, 0, 0);
  }

  Promise.all([loadImage(referenceUrl), loadImage(candidateUrl)]).then(([referenceImage, candidateImage]) => {
    const referenceAnalysis = analyze(referenceImage);
    const candidateAnalysis = analyze(candidateImage);
    normalize(referenceAnalysis, document.querySelector("#reference"));
    normalize(candidateAnalysis, document.querySelector("#candidate"));
    const overlay = document.querySelector("#overlay").getContext("2d");
    overlay.drawImage(document.querySelector("#reference"), 0, 0);
    overlay.globalAlpha = 0.5;
    overlay.drawImage(document.querySelector("#candidate"), 0, 0);
    overlay.globalAlpha = 1;
    drawDifference(referenceAnalysis, candidateAnalysis);
    window.__comparisonReady = true;
  }).catch((error) => {
    document.querySelector(".note").textContent = error.message;
    document.querySelector(".note").style.color = "#b42318";
    window.__comparisonError = error.message;
  });
</script>
</body>
</html>
`;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const referencePath = requireArgument(options, "reference");
  const candidatePath = requireArgument(options, "candidate");
  const outputPath = requireArgument(options, "output");
  const threshold = Number(options.threshold ?? 160);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 255) {
    throw new Error("--threshold must be a number from 0 through 255.");
  }
  if (extname(candidatePath).toLowerCase() !== ".svg") {
    throw new Error("The candidate must be a complete SVG file.");
  }
  const report = buildReport({
    referenceUrl: await dataUrl(referencePath),
    candidateUrl: await dataUrl(candidatePath),
    title: options.title ?? "Reference-driven icon fidelity report",
    threshold,
  });
  await mkdir(dirname(outputPath), { recursive:true });
  await writeFile(outputPath, report, "utf8");
  process.stdout.write(`Wrote ${outputPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
