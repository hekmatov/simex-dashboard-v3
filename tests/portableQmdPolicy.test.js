import assert from "node:assert/strict";
import test from "node:test";

import { validatePortableQmdAst } from "../src/static-content/qmd/portableQmdPolicy.js";
import { parsePortableQmd } from "../src/static-content/qmd/parsePortableQmd.js";
import { renderPortableQmd } from "../src/static-content/qmd/renderPortableQmd.js";

const acceptedFeatures = [
  ["headings", "# Situation\n\n#### Detail"],
  ["emphasis", "**bold** *italic* ~~removed~~"],
  ["lists", "- item\n- [x] completed\n\n1. first"],
  ["links", "[safe](https://example.test/path) [local](#detail)"],
  ["tables", "| Facility | Ready |\n| --- | --- |\n| North | Yes |"],
  ["blockquotes", "> Preparedness depends on access."],
  ["inline-code", "Use `prepared_rows` only."],
  ["fenced-code", "```js\nconst inert = true;\n```"],
  ["math", "Inline $x^2$ and display:\n\n$$\nx + y = z\n$$"],
  ["footnotes", "A supported note.[^readiness]\n\n[^readiness]: Local evidence."],
  ["callouts", "::: {.callout-warning}\nCheck the cold chain.\n:::"],
];

for (const [feature, source] of acceptedFeatures) {
  test(`portable-qmd-v1 accepts ${feature} as inert structured content`, () => {
    const parsed = parsePortableQmd(source);
    assert.equal(parsed.ok, true, JSON.stringify(parsed.errors));
    assert.equal(validatePortableQmdAst(parsed.ast).errors.length, 0);
  });
}

const rejectedFeatures = [
  ["citations", "Read the evidence [@source2026].", "citations"],
  ["embedded media", "![Remote image](https://example.test/map.png)", "embedded-media"],
  ["unsafe math commands", "Unsafe $\\htmlClass{bad}{x}$.", "math-command"],
  ["invalid math syntax", "Invalid $\\frac{1}{$.", "math-command"],
  ["raw HTML", "<div>Authored HTML</div>", "raw-html"],
  ["HTML comments", "<!-- inert comment -->", "raw-html"],
  ["unclosed HTML comments", "<!-- inert comment", "raw-html"],
  ["HTML declarations", "<!doctype html>", "raw-html"],
  ["CDATA declarations", "<![CDATA[inert text]]>", "raw-html"],
  ["scripts and event handlers", "<button onclick=\"alert(1)\">Run</button>", "active-content"],
  ["iframes", "<iframe src=\"https://example.test\"></iframe>", "iframes"],
  ["executable cells", "```{python}\nprint('run')\n```", "executable-cells"],
  ["extensions, filters, and shortcodes", "{{< include external.qmd >}}", "extensions"],
  ["widgets and HTML dependencies", "::: {.widget}\nremote widget\n:::", "widgets"],
  ["thematic breaks", "---", "thematic-break"],
  ["fence options", "```js linenums=true\nconst inert = true;\n```", "fence-info"],
];

for (const [feature, source, rule] of rejectedFeatures) {
  test(`portable-qmd-v1 rejects ${feature} with a source-located recovery error`, () => {
    const parsed = parsePortableQmd(source);
    assert.equal(parsed.ok, false);
    const issue = parsed.errors.find((error) => error.rule === rule);
    assert.ok(issue, JSON.stringify(parsed.errors));
    assert.equal(issue.location.line, 1);
    assert.ok(issue.location.column >= 1);
    assert.ok(issue.guidance.length > 10);
  });
}

test("link policy rejects protocol, encoding, whitespace, and control-character bypasses", () => {
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
    const parsed = parsePortableQmd(`[unsafe](${href})`);
    assert.equal(parsed.ok, false, href);
    assert.ok(parsed.errors.some(({ rule }) => rule === "link-protocol"), href);
  }

  for (const href of ["https://example.test/path", "http://example.test/path", "#local-heading"]) {
    assert.equal(parsePortableQmd(`[safe](${href})`).ok, true, href);
  }

  for (const source of [
    "[unsafe][target]\n\n[target]: javascript:alert(1)",
    "[unsafe][target]\n\n[target]: data:text/html,boom",
  ]) {
    const parsed = parsePortableQmd(source);
    assert.equal(parsed.ok, false, source);
    assert.ok(parsed.errors.some(({ rule }) => rule === "link-protocol"), source);
  }
});

test("renderer emits host-aware semantic headings, scoped IDs, safe links, tables, callouts, code, math, and footnotes", () => {
  const source = [
    "# Situation",
    "",
    "## Detail",
    "",
    "[External](https://example.test) and [detail](#detail).",
    "",
    "| Facility | Ready |",
    "| --- | --- |",
    "| North | Yes |",
    "",
    "::: {.callout-note}",
    "A note with `inline code`.",
    ":::",
    "",
    "```js",
    "const inert = true;",
    "```",
    "",
    "Math $x^2$.[^proof]",
    "",
    "[^proof]: Reviewed locally.",
  ].join("\n");
  const parsed = parsePortableQmd(source);
  assert.equal(parsed.ok, true, JSON.stringify(parsed.errors));
  const html = renderPortableQmd(parsed.ast, {
    panelId: "situation-panel",
    hostHeadingLevel: 2,
  });

  assert.match(html, /<h3 id="situation-panel-situation">Situation<\/h3>/);
  assert.match(html, /<h4 id="situation-panel-detail">Detail<\/h4>/);
  assert.match(html, /href="https:\/\/example\.test"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.match(html, /href="#situation-panel-detail"/);
  assert.match(html, /role="region"[^>]*aria-label="Table:/);
  assert.match(html, /<th scope="col">Facility<\/th>/);
  assert.match(html, /<aside[^>]*data-callout-type="note"/);
  assert.match(html, /<pre><code[^>]*>const inert = true;/);
  assert.match(html, /role="math"/);
  assert.match(html, /aria-label="Footnotes"/);
  assert.match(html, /id="situation-panel-footnote-proof"/);
  assert.match(html, /href="#situation-panel-footnote-ref-proof-1"/);
});

test("same-panel fragments canonicalize to the scoped heading slug", () => {
  const parsed = parsePortableQmd("# Readiness Detail\n\n[Jump to detail](#Readiness_Detail)");
  assert.equal(parsed.ok, true, JSON.stringify(parsed.errors));
  const html = renderPortableQmd(parsed.ast, { panelId: "field-guide", hostHeadingLevel: 2 });

  assert.match(html, /id="field-guide-readiness-detail"/);
  assert.match(html, /href="#field-guide-readiness-detail"/);
});

test("repeated footnote references have unique IDs and one matching backlink per occurrence", () => {
  const parsed = parsePortableQmd("First proof.[^proof]\n\nSecond proof.[^proof]\n\n[^proof]: Reviewed twice.");
  assert.equal(parsed.ok, true, JSON.stringify(parsed.errors));
  const html = renderPortableQmd(parsed.ast, { panelId: "field-guide", hostHeadingLevel: 2 });

  assert.match(html, /id="field-guide-footnote-ref-proof-1"/);
  assert.match(html, /id="field-guide-footnote-ref-proof-2"/);
  assert.match(html, /href="#field-guide-footnote-ref-proof-1"/);
  assert.match(html, /href="#field-guide-footnote-ref-proof-2"/);
  assert.equal((html.match(/id="field-guide-footnote-proof"/g) ?? []).length, 1);
});

test("a missing footnote reference inherits the containing inline source line", () => {
  const parsed = parsePortableQmd("# Situation\n\nSupported text.\n\nMissing note.[^absent]");
  assert.equal(parsed.ok, false);
  const issue = parsed.errors.find(({ rule }) => rule === "footnotes");
  assert.equal(issue?.location.line, 5, JSON.stringify(parsed.errors));
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
