import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { resolveDashboardStyleGrammar } from "../src/theme/dashboardStyleGrammar.js";

const PROJECT_ROOT = new URL("../", import.meta.url);
const AUTHORABLE_EXTENSIONS = new Set([".css", ".js", ".jsx", ".svg"]);
const KATEX_EXCEPTION = Object.freeze({
  path: "node_modules/katex/dist/katex.css",
  reason: "dependency-owned mathematical glyph CSS",
});

test("dashboard style grammars project the shared mono font token", () => {
  for (const style of ["evidence-ledger", "humanist-standard", "signal-instrument"]) {
    assert.equal(
      resolveDashboardStyleGrammar(style)["--simex-style-mono-font"],
      "ui-monospace, SFMono-Regular, Consolas, monospace",
    );
  }
});

test("authored typography uses dashboard tokens outside the style grammar", async () => {
  const result = await scanAuthoredTypography();

  assert.deepEqual(result.exceptions, [KATEX_EXCEPTION]);
  assert.deepEqual(result.violations, []);
});

async function scanAuthoredTypography() {
  const sourceRoot = new URL("../src/", import.meta.url);
  const sourceFiles = await authoredFiles(sourceRoot);
  const rootHtml = new URL("../index.html", import.meta.url);
  const files = [...sourceFiles, rootHtml];
  const violations = [];

  for (const file of files) {
    const relativePath = path.relative(new URL("../", import.meta.url).pathname, file.pathname)
      .replaceAll("\\", "/");
    const content = await readFile(file, "utf8");
    for (const declaration of fontDeclarations(content, path.extname(relativePath))) {
      if (relativePath === "src/theme/dashboardStyleGrammar.js") continue;
      if (!usesDashboardFontToken(declaration, content)) {
        violations.push({ path: relativePath, ...declaration });
      }
    }
  }

  return { exceptions: [KATEX_EXCEPTION], violations };
}

async function authoredFiles(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directoryUrl);
    if (entry.isDirectory()) return authoredFiles(entryUrl);
    return AUTHORABLE_EXTENSIONS.has(path.extname(entry.name)) ? [entryUrl] : [];
  }));
  return nested.flat();
}

function* fontDeclarations(source, extension) {
  if ([".css", ".svg", ".html"].includes(extension)) {
    const cssDeclaration = /(?<property>font-family|font)\s*:\s*(?<value>[^;{}]+)(?:;|(?=\}))/gi;
    for (const match of source.matchAll(cssDeclaration)) {
      yield {
        property: match.groups.property.toLowerCase(),
        value: match.groups.value.trim(),
      };
    }
  }
  const jsFontFamily = /\bfontFamily\s*:\s*(?<value>[^,}\n]+)/g;
  for (const match of source.matchAll(jsFontFamily)) {
    yield { property: "fontFamily", value: match.groups.value.trim() };
  }
}

function usesDashboardFontToken({ value }, source) {
  if (value === "inherit" || value.includes("--simex-style-")) return true;
  if (!/^[a-zA-Z]+Font$/.test(value)) return false;
  const tokenBackedRole = new RegExp(
    `\\bconst\\s+${value}\\s*=\\s*normalizedFontFamily\\(textTheme\\?\\.${value}`,
  );
  const computedToken = new RegExp(
    `${value}:\\s*style\\.getPropertyValue\\("--simex-style-[a-z-]+-font"\\)`,
  );
  return tokenBackedRole.test(source) && computedToken.test(source);
}
