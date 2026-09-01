import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { resolveDashboardStyleGrammar } from "../src/theme/dashboardStyleGrammar.js";

const PROJECT_ROOT = new URL("../", import.meta.url);
const AUTHORABLE_EXTENSIONS = new Set([".css", ".js", ".jsx", ".svg"]);
const STYLE_GRAMMAR_EXCEPTION = Object.freeze({
  path: "src/theme/dashboardStyleGrammar.js",
  properties: Object.freeze(["bodyFont", "headingFont", "dataFont"]),
  reason: "dashboard typography role definitions",
});
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

  assert.deepEqual(result.exceptions, [STYLE_GRAMMAR_EXCEPTION, KATEX_EXCEPTION]);
  assert.deepEqual(result.violations, []);
  assert.equal(
    result.declarations.filter(({ path: declarationPath }) => (
      declarationPath === "src/iconography/iconGlyphs.js"
    )).length,
    4,
  );
});

test("classifier rejects raw font families in inline SVG and style strings", () => {
  const source = `const glyph = \`<text style="font-family:Arial;font-size:12px">1</text><text font-family="Courier New">2</text>\`;`;

  assert.deepEqual(fixtureViolations(source, ".js"), [
    { property: "font-family", value: "Arial" },
    { property: "font-family", value: '"Courier New"' },
  ]);
});

test("classifier rejects raw JS and JSX font shorthand declarations", () => {
  const source = `const textStyle = { font: "700 12px Arial" };`;

  assert.deepEqual(fixtureViolations(source, ".jsx"), [
    { property: "font", value: '"700 12px Arial"' },
  ]);
});

test("classifier rejects raw JSX fontFamily attributes", () => {
  const source = `const label = <text fontFamily="Arial">Cases</text>;`;

  assert.deepEqual(fixtureViolations(source, ".jsx"), [
    { property: "fontFamily", value: '"Arial"' },
  ]);
});

async function scanAuthoredTypography() {
  const sourceRoot = new URL("../src/", import.meta.url);
  const sourceFiles = await authoredFiles(sourceRoot);
  const rootHtml = new URL("../index.html", import.meta.url);
  const files = [...sourceFiles, rootHtml];
  const declarations = [];
  const violations = [];

  for (const file of files) {
    const relativePath = path.relative(new URL("../", import.meta.url).pathname, file.pathname)
      .replaceAll("\\", "/");
    const content = await readFile(file, "utf8");
    for (const declaration of fontDeclarations(content, path.extname(relativePath))) {
      declarations.push({ path: relativePath, ...declaration });
      if (isAllowedRawBoundary(relativePath, declaration)) continue;
      if (!usesDashboardFontToken(declaration, content)) {
        violations.push({ path: relativePath, ...declaration });
      }
    }
  }

  return {
    declarations,
    exceptions: [STYLE_GRAMMAR_EXCEPTION, KATEX_EXCEPTION],
    violations,
  };
}

function fixtureViolations(source, extension) {
  return [...fontDeclarations(source, extension)]
    .filter((declaration) => !usesDashboardFontToken(declaration, source));
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
    yield* cssFontDeclarations(source);
    if ([".svg", ".html"].includes(extension)) yield* markupFontFamilyAttributes(source);
    return;
  }
  if (![".js", ".jsx"].includes(extension)) return;

  const strings = javascriptStrings(source);
  const declarations = [];
  for (const string of strings) {
    for (const declaration of cssFontDeclarations(string.value)) {
      declarations.push({ index: string.index, ...declaration });
    }
    for (const declaration of markupFontFamilyAttributes(string.value)) {
      declarations.push({ index: string.index, ...declaration });
    }
  }

  const objectDeclaration = /\b(?<property>fontFamily|font|bodyFont|headingFont|dataFont)\s*:\s*(?<value>`(?:\\.|[^`])*`|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^,}\n;]+)/g;
  for (const match of source.matchAll(objectDeclaration)) {
    if (insideString(match.index, strings)) continue;
    declarations.push({
      index: match.index,
      property: match.groups.property,
      value: match.groups.value.trim(),
    });
  }

  if (extension === ".jsx") {
    const jsxTag = /<[A-Za-z][^>]*>/gs;
    for (const tag of source.matchAll(jsxTag)) {
      if (insideString(tag.index, strings)) continue;
      const jsxFontFamily = /\bfontFamily\s*=\s*(?<value>\{[^}]*\}|"(?:\\.|[^"])*"|'(?:\\.|[^'])*')/g;
      for (const match of tag[0].matchAll(jsxFontFamily)) {
        declarations.push({
          index: tag.index + match.index,
          property: "fontFamily",
          value: match.groups.value.trim(),
        });
      }
    }
  }

  const seen = new Set();
  for (const declaration of declarations.sort((left, right) => left.index - right.index)) {
    const key = `${declaration.index}:${declaration.property}:${declaration.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    yield { property: declaration.property, value: declaration.value };
  }
}

function* cssFontDeclarations(source) {
  const cssDeclaration = /(?<property>font-family|font)\s*:\s*(?<value>[^;{}]+)/gi;
  for (const match of source.matchAll(cssDeclaration)) {
    yield {
      property: match.groups.property.toLowerCase(),
      value: match.groups.value.trim(),
    };
  }
}

function* markupFontFamilyAttributes(source) {
  const fontFamilyAttribute = /\bfont-family\s*=\s*(?<value>"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^\s>]+)/gi;
  for (const match of source.matchAll(fontFamilyAttribute)) {
    yield { property: "font-family", value: match.groups.value.trim() };
  }
}

function javascriptStrings(source) {
  const literal = /`(?:\\[\s\S]|[^`])*`|"(?:\\[\s\S]|[^"])*"|'(?:\\[\s\S]|[^'])*'/g;
  return [...source.matchAll(literal)].map((match) => ({
    index: match.index,
    end: match.index + match[0].length,
    value: match[0].slice(1, -1),
  }));
}

function insideString(index, strings) {
  return strings.some((range) => index >= range.index && index < range.end);
}

function isAllowedRawBoundary(relativePath, declaration) {
  return relativePath === STYLE_GRAMMAR_EXCEPTION.path
    && STYLE_GRAMMAR_EXCEPTION.properties.includes(declaration.property);
}

function usesDashboardFontToken({ value }, source) {
  const normalizedValue = unwrapExpression(value);
  if (normalizedValue === "inherit" || normalizedValue.includes("--simex-style-")) return true;
  if (!/^[a-zA-Z]+Font$/.test(normalizedValue)) return false;
  const tokenBackedRole = new RegExp(
    `\\bconst\\s+${normalizedValue}\\s*=\\s*normalizedFontFamily\\(textTheme\\?\\.${normalizedValue}`,
  );
  const computedToken = new RegExp(
    `${normalizedValue}:\\s*style\\.getPropertyValue\\("--simex-style-[a-z-]+-font"\\)`,
  );
  return tokenBackedRole.test(source) && computedToken.test(source);
}

function unwrapExpression(value) {
  const trimmed = value.trim();
  const pairs = [["\"", "\""], ["'", "'"], ["`", "`"], ["{", "}"]];
  const pair = pairs.find(([start, end]) => trimmed.startsWith(start) && trimmed.endsWith(end));
  return pair ? trimmed.slice(1, -1).trim() : trimmed;
}
