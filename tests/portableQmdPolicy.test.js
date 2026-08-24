import assert from "node:assert/strict";
import test from "node:test";

import {
  PORTABLE_QMD_POLICY,
  validatePortableQmdAst,
} from "../src/static-content/qmd/portableQmdPolicy.js";
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
  ["scripts and event handlers", "<button onclick=\"alert(1)\">Run</button>", "active-content"],
  ["iframes", "<iframe src=\"https://example.test\"></iframe>", "iframes"],
  ["executable cells", "```{python}\nprint('run')\n```", "executable-cells"],
  ["extensions, filters, and shortcodes", "{{< include external.qmd >}}", "extensions"],
  ["widgets and HTML dependencies", "::: {.widget}\nremote widget\n:::", "widgets"],
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
  assert.match(html, /href="#situation-panel-footnote-ref-proof"/);
});

test("same-panel fragments canonicalize to the scoped heading slug", () => {
  const parsed = parsePortableQmd("# Readiness Detail\n\n[Jump to detail](#Readiness_Detail)");
  assert.equal(parsed.ok, true, JSON.stringify(parsed.errors));
  const html = renderPortableQmd(parsed.ast, { panelId: "field-guide", hostHeadingLevel: 2 });

  assert.match(html, /id="field-guide-readiness-detail"/);
  assert.match(html, /href="#field-guide-readiness-detail"/);
});

test("portable resource limits fail explicitly without truncating accepted boundary content", () => {
  const sourceBoundary = "a".repeat(PORTABLE_QMD_POLICY.limits.sourceBytes);
  assert.equal(parsePortableQmd(sourceBoundary).ok, true);
  const tooLarge = parsePortableQmd(`${sourceBoundary}a`);
  assert.equal(tooLarge.ok, false);
  assert.ok(tooLarge.errors.some(({ rule }) => rule === "source-size"));

  const tooDeep = parsePortableQmd(`${"> ".repeat(PORTABLE_QMD_POLICY.limits.nestingDepth + 1)}deep`);
  assert.equal(tooDeep.ok, false);
  assert.ok(tooDeep.errors.some(({ rule }) => rule === "nesting-depth"));

  const wideHeader = Array.from({ length: PORTABLE_QMD_POLICY.limits.tableColumns + 1 }, (_, index) => `C${index + 1}`);
  const wideTable = `| ${wideHeader.join(" | ")} |\n| ${wideHeader.map(() => "---").join(" | ")} |\n| ${wideHeader.map(() => "x").join(" | ")} |`;
  const tooWide = parsePortableQmd(wideTable);
  assert.equal(tooWide.ok, false);
  assert.ok(tooWide.errors.some(({ rule }) => rule === "table-columns"));

  const rows = Array.from({ length: PORTABLE_QMD_POLICY.limits.tableRows + 1 }, (_, index) => `| R${index + 1} | yes |`);
  const tooTall = parsePortableQmd(`| Facility | Ready |\n| --- | --- |\n${rows.join("\n")}`);
  assert.equal(tooTall.ok, false);
  assert.ok(tooTall.errors.some(({ rule }) => rule === "table-rows"));

  const tooManyNodes = parsePortableQmd(Array.from({ length: 2_000 }, (_, index) => `- item ${index}`).join("\n"));
  assert.equal(tooManyNodes.ok, false);
  assert.ok(tooManyNodes.errors.some(({ rule }) => rule === "rendered-nodes"));
});
