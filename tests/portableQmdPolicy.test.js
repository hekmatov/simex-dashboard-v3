import assert from "node:assert/strict";
import test from "node:test";

import {
  isPortableQmdMathAllowed,
  validatePortableHref,
  validatePortableQmdAst,
} from "../src/static-content/qmd/portableQmdPolicy.js";
import { parsePortableQmd } from "../src/static-content/qmd/parsePortableQmd.js";

const semanticFeatures = [
  ["headings", "# Situation\n\n###### Detail"],
  ["emphasis", "**bold** *italic* ~~removed~~"],
  ["lists", "- item\n- [x] completed\n\n1. first"],
  ["safe links", "[safe](https://example.test/path) [local](#detail)"],
  ["tables", "| Facility | Ready |\n| --- | --- |\n| North | Yes |"],
  ["blockquotes", "> Preparedness depends on access."],
  ["inline code", "Use `prepared_rows` only."],
  ["fenced code", "```js\nconst inert = true;\n```"],
  ["math", "Inline $x^2$ and display:\n\n$$\nx + y = z\n$$"],
  ["footnotes", "A supported note.[^readiness]\n\n[^readiness]: Local evidence."],
  ["callouts", "::: {.callout-warning}\nCheck the cold chain.\n:::"],
  ["thematic breaks", "Before\n\n---\n\nAfter"],
];

for (const [feature, source] of semanticFeatures) {
  test(`portable-qmd-v1 accepts ${feature} as inert structured content`, () => {
    const parsed = parsePortableQmd(source);
    assert.equal(parsed.ok, true, JSON.stringify(parsed.errors));
    assert.equal(validatePortableQmdAst(parsed.ast).errors.length, 0);
  });
}

const arbitraryTextFeatures = [
  ["plain less-than prose", "Plain comparison x<y remains text."],
  ["citations", "Read the evidence [@source2026]."],
  ["embedded media", "![Remote image](https://example.test/map.png)"],
  ["unsafe math commands", "Unsafe $\\htmlClass{bad}{x}$ remains readable."],
  ["invalid math syntax", "Invalid $\\frac{1}{$ remains readable."],
  ["raw HTML", "<div>Authored HTML</div>"],
  ["HTML comments", "<!-- inert comment -->"],
  ["unclosed HTML comments", "<!-- inert comment"],
  ["HTML declarations", "<!doctype html>"],
  ["CDATA declarations", "<![CDATA[inert text]]>"],
  ["processing instructions", "<?portable test?>"],
  ["scripts and event handlers", '<button onclick="alert(1)">Run</button><script>alert(2)</script>'],
  ["iframes", '<iframe src="https://example.test"></iframe>'],
  ["executable cells", "```{python} eval=true\nprint('run')\n```"],
  ["extensions, filters, and shortcodes", "{{< include external.qmd >}}"],
  ["widgets and HTML dependencies", "::: {.widget}\nremote widget\n:::"],
  ["fence options", "```js linenums=true\nconst inert = true;\n```"],
  ["missing footnotes", "Missing note.[^absent]"],
];

for (const [feature, source] of arbitraryTextFeatures) {
  test(`portable-qmd-v1 accepts ${feature} for inert rendering`, () => {
    const parsed = parsePortableQmd(source);
    assert.equal(parsed.ok, true, JSON.stringify(parsed.errors));
    assert.equal(parsed.ast.source, source);
    assert.equal(parsed.errors.length, 0);
  });
}

test("link policy classifies unsafe destinations without blocking their source text", () => {
  const blocked = [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "javascript%3Aalert(1)",
    "java&#x73;cript:alert(1)",
    " java\tscript:alert(1)",
    "data:text/html,boom",
    "file:///etc/passwd",
    "mailto:operator@example.test",
    "//example.test/protocol-relative",
  ];
  for (const href of blocked) {
    assert.equal(validatePortableHref(href), null, href);
    assert.equal(parsePortableQmd(`[unsafe](${href})`).ok, true, href);
  }

  assert.equal(validatePortableHref("https://example.test/path"), "https://example.test/path");
  assert.equal(validatePortableHref("http://example.test/path"), "http://example.test/path");
  assert.equal(validatePortableHref("#local-heading"), "#local-heading");
});

test("restricted math classification renders approved TeX and leaves other math inert", () => {
  assert.equal(isPortableQmdMathAllowed("x^2 + \\frac{a}{b}"), true);
  assert.equal(isPortableQmdMathAllowed("\\htmlClass{bad}{x}"), false);
  assert.equal(isPortableQmdMathAllowed("\\frac{1}{"), false);
  assert.equal(parsePortableQmd("Unsafe $\\htmlClass{bad}{x}$.").ok, true);
});

test("source byte limit accepts exactly 102400 bytes and rejects 102401", () => {
  const sourceBoundary = "a".repeat(102_400);
  assert.equal(parsePortableQmd(sourceBoundary).ok, true);
  const tooLarge = parsePortableQmd(`${sourceBoundary}a`);
  assert.equal(tooLarge.ok, false);
  assert.ok(tooLarge.errors.some(({ rule }) => rule === "source-size"));
});

test("nesting limit accepts exactly 6 containers and rejects 7", () => {
  assert.equal(parsePortableQmd(`${"> ".repeat(6)}deep`).ok, true);
  const tooDeep = parsePortableQmd(`${"> ".repeat(7)}deep`);
  assert.equal(tooDeep.ok, false);
  assert.ok(tooDeep.errors.some(({ rule }) => rule === "nesting-depth"));
});

test("table column limit accepts exactly 20 columns and rejects 21", () => {
  assert.equal(parsePortableQmd(tableWithColumns(20)).ok, true);
  const tooWide = parsePortableQmd(tableWithColumns(21));
  assert.equal(tooWide.ok, false);
  assert.ok(tooWide.errors.some(({ rule }) => rule === "table-columns"));
});

test("table row limit accepts exactly 100 rows including its header and rejects 101", () => {
  assert.equal(parsePortableQmd(tableWithRows(100)).ok, true);
  const tooTall = parsePortableQmd(tableWithRows(101));
  assert.equal(tooTall.ok, false);
  assert.ok(tooTall.errors.some(({ rule }) => rule === "table-rows"));
});

function tableWithColumns(count) {
  const header = Array.from({ length: count }, (_, index) => `C${index + 1}`);
  return `| ${header.join(" | ")} |\n| ${header.map(() => "---").join(" | ")} |\n| ${header.map(() => "x").join(" | ")} |`;
}

function tableWithRows(count) {
  const body = Array.from({ length: count - 1 }, (_, index) => `| R${index + 1} | yes |`);
  return `| Facility | Ready |\n| --- | --- |\n${body.join("\n")}`;
}
