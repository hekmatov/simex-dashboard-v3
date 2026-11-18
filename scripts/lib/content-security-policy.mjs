import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const START = "# BEGIN SIMEX SECURITY HEADERS";
const END = "# END SIMEX SECURITY HEADERS";

export function inlineScriptHashes(documents) {
  const hashes = new Set();
  for (const document of documents) {
    for (const match of document.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      if (/\bsrc\s*=/i.test(match[1]) || !match[2].trim()) continue;
      // HTML parsing normalizes line endings before CSP evaluates inline text.
      const script = match[2].replace(/\r\n?/g, "\n");
      hashes.add(`'sha256-${createHash("sha256").update(script).digest("base64")}'`);
    }
  }
  return [...hashes].sort();
}

export function contentSecurityPolicy(documents, { offline = false } = {}) {
  const hashes = inlineScriptHashes(documents);
  return [
    "default-src 'self'",
    `script-src 'self'${hashes.length ? ` ${hashes.join(" ")}` : ""}`,
    // React, ECharts, the rich-text editor and capture use dynamic inline styles.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${offline ? "" : " http: https:"}`,
    "font-src 'self' data:",
    `media-src 'self' data: blob:${offline ? "" : " http: https:"}`,
    // Authored remote sources and the opt-in same-origin companion remain
    // supported. CSP is script containment, not an exercise-data firewall.
    offline ? "connect-src 'none'" : "connect-src 'self' http: https: ws: wss:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    // html2canvas clones the same-origin document into a temporary frame.
    "frame-src 'self'",
    "base-uri 'self'",
    "form-action 'none'",
    ...(offline ? [] : ["frame-ancestors 'self'"]),
  ].join("; ") + ";";
}

export async function writeStaticSecurityHeaders({ outputDir, entrypoints }) {
  const documents = await Promise.all(entrypoints.map((entry) => readFile(path.join(outputDir, entry), "utf8")));
  const headersPath = path.join(outputDir, "_headers");
  let existing = "";
  try {
    existing = await readFile(headersPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const start = existing.indexOf(START);
  if (start >= 0) {
    const end = existing.indexOf(END, start);
    if (end < 0) throw new Error("Generated SimEx security header block is incomplete.");
    existing = existing.slice(0, start) + existing.slice(end + END.length).replace(/^\r?\n/, "");
  }
  const headers = `${existing.trimEnd()}\n\n${START}\n/*\n  Content-Security-Policy: ${contentSecurityPolicy(documents)}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n${END}\n`;
  await writeFile(headersPath, headers, "utf8");
  return headers;
}

// Local preview serves the exact generated security block. Cloudflare applies
// _headers itself; this reader intentionally does not emulate its path rules.
export async function readStaticSecurityHeaders(outputDir) {
  const source = await readFile(path.join(outputDir, "_headers"), "utf8");
  const start = source.indexOf(START);
  const end = source.indexOf(END, start);
  if (start < 0 || end < 0) throw new Error("Finalize the static build before previewing its security policy.");
  const headers = {};
  for (const line of source.slice(start, end).split(/\r?\n/)) {
    const match = /^  (Content-Security-Policy|X-Content-Type-Options|Referrer-Policy): (.+)$/.exec(line);
    if (match) headers[match[1]] = match[2];
  }
  if (!headers["Content-Security-Policy"]) throw new Error("Static build security policy is missing.");
  return headers;
}
