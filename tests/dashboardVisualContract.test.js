import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { DASHBOARD_VISUAL_CONTRACT } from "../src/theme/dashboardTheme.js";
import { auditDashboardStyleSources } from "./e2e/support/dashboard-style-audit.js";

const EXPECTED_CONTRACT = {
  radiusControl: 6,
  radiusSurface: 10,
  controlMinimum: 44,
  focusWidth: 3,
  neutral: {
    outer: "#e8e9ea",
    surface: "#ffffff",
    subtle: "#f4f5f5",
    text: "#17191b",
    muted: "#5a6066",
    border: "#c7cbcf",
    borderStrong: "#747b82",
    focus: "#155eef",
    active: "#202428",
  },
};

async function collectStyleBearingSources(directoryUrl, prefix = "src") {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const sources = [];
  for (const entry of entries) {
    const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directoryUrl);
    const relativePath = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      sources.push(...await collectStyleBearingSources(entryUrl, relativePath));
    } else if (/\.(?:css|jsx|js)$/i.test(entry.name)) {
      sources.push({
        filePath: relativePath,
        source: await readFile(entryUrl, "utf8"),
      });
    }
  }
  return sources;
}

test("retired-style source audit catches masked hex and alpha channels while preserving narrow authored swatches", () => {
  const result = auditDashboardStyleSources([
    {
      filePath: "src/styles/masked.css",
      source: ".legacy { color: teal; border-color: navy; outline-color: #008080; text-decoration-color: rgb(0, 0, 128); box-shadow: 0 2px 8px rgba(8, 34, 74, 0.18); }\n.legacy { color: #007c89; border-color: #3157d5; }\n.legacy { color: var(--simex-text-strong); }",
    },
    {
      filePath: "src/components/ColorField.jsx",
      source: "const swatch = { colors: [\"#08224A\"] };",
    },
  ]);

  assert.deepEqual(
    result.active.map(({ filePath, color }) => [filePath, color]),
    [
      ["src/styles/masked.css", "teal"],
      ["src/styles/masked.css", "navy"],
      ["src/styles/masked.css", "#008080"],
      ["src/styles/masked.css", "rgb(0, 0, 128)"],
      ["src/styles/masked.css", "rgba(8, 34, 74, 0.18)"],
      ["src/styles/masked.css", "#007c89"],
      ["src/styles/masked.css", "#3157d5"],
    ],
  );
  assert.deepEqual(
    result.allowed.map(({ classification }) => classification),
    ["authored-color-swatch"],
  );
});

test("theme source allowance is confined to the RAW_PROFILES payload", () => {
  const result = auditDashboardStyleSources([{
    filePath: "src/theme/dashboardTheme.js",
    source: [
      'const rogueBefore = "#08224a";',
      "const RAW_PROFILES = Object.freeze([",
      '  ["test/profile", "Test", "test", "#08224a #007c89", "#043bcb #3157d5"],',
      "]);",
      'const rogueAfter = "#007c89";',
    ].join("\n"),
  }]);

  assert.deepEqual(
    result.active.map(({ line, color }) => [line, color]),
    [[1, "#08224a"], [5, "#007c89"]],
  );
  assert.deepEqual(
    result.allowed.map(({ line, color, classification }) => [line, color, classification]),
    [
      [3, "#08224a", "theme-token-payload"],
      [3, "#007c89", "theme-token-payload"],
      [3, "#043bcb", "theme-token-payload"],
      [3, "#3157d5", "theme-token-payload"],
    ],
  );
});

test("live style-bearing sources contain no active retired dashboard color declaration", async () => {
  const sources = await collectStyleBearingSources(new URL("../src/", import.meta.url));
  const result = auditDashboardStyleSources(sources);

  assert.deepEqual(result.active, []);
  assert.ok(result.allowed.some(({ classification }) => classification === "authored-color-swatch"));
  assert.ok(result.allowed.some(({ classification }) => classification === "authored-panel-color"));
});

test("dashboard visual contract fixes shared component tokens without changing profile data paint", async () => {
  assert.deepEqual(DASHBOARD_VISUAL_CONTRACT, EXPECTED_CONTRACT);
  assert.equal(Object.isFrozen(DASHBOARD_VISUAL_CONTRACT), true);
  assert.equal(Object.isFrozen(DASHBOARD_VISUAL_CONTRACT.neutral), true);

  const [tokens, styleGrammar, styles] = await Promise.all([
    readFile(new URL("../src/styles/tokens.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/dashboard-style-grammar.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
  ]);

  assert.match(tokens, /--simex-component-control-radius:\s*6px/);
  assert.match(tokens, /--simex-component-surface-radius:\s*10px/);
  assert.match(tokens, /--simex-component-focus:\s*#155eef/);
  assert.match(tokens, /--simex-control-min:\s*44px/);
  assert.match(styleGrammar, /var\(--simex-component-surface-radius\)/);
  assert.match(styleGrammar, /var\(--simex-component-control-radius\)/);
  assert.match(styles, /outline:\s*var\(--simex-component-focus-width\) solid var\(--simex-component-focus\)/);
});

test("pending owners and named authoring surfaces consume semantic style and control contracts", async () => {
  const [
    styles,
    modes,
    styleGrammar,
    staticContent,
    sourceContent,
    rightDrawer,
    operationStatus,
    sourceViewer,
    iconGlyphs,
    buildWorkspace,
  ] = await Promise.all([
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/modes.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/dashboard-style-grammar.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/static-content.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/source-content.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/right-side-drawer.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/operation-status.css", import.meta.url), "utf8"),
    readFile(new URL("../src/source-viewer/sourceViewer.css", import.meta.url), "utf8"),
    readFile(new URL("../src/iconography/iconGlyphs.js", import.meta.url), "utf8"),
    readFile(new URL("../src/components/build/BuildWorkspace.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /:root\s*\{[^}]*font-family:\s*var\(--simex-style-body-font(?:,|\))/s);
  assert.match(styles, /input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\),\s*select,\s*textarea/s);
  assert.match(styleGrammar, /input:is\(\[type="checkbox"\],\s*\[type="radio"\]\)[^{]*\{[^}]*accent-color:\s*var\(--simex-selected\)[^}]*block-size:\s*20px[^}]*inline-size:\s*20px/s);
  assert.match(styleGrammar, /label:has\(input:is\(\[type="checkbox"\],\s*\[type="radio"\]\)\)[^{]*\{[^}]*gap:\s*8px[^}]*min-block-size:\s*var\(--simex-control-min/s);
  assert.match(styleGrammar, /chart-authoring-field:has\(> input:is\(\[type="checkbox"\],\s*\[type="radio"\]\)\)[^{]*\{[^}]*gap:\s*8px/s);
  assert.match(styleGrammar, /chart-authoring-field:has\(> input:is\(\[type="checkbox"\],\s*\[type="radio"\]\)\) > label[^}]*\{[^}]*gap:\s*8px[^}]*min-block-size:\s*var\(--simex-control-min/s);
  assert.match(styleGrammar, /:is\(\s*\.app-frame,\s*\.build-authoring-auxiliary,\s*\.unit-orbit\s*\)\s*:is\(\s*button,[^{]*\{[^}]*min-block-size:\s*var\(--simex-control-min/s);
  assert.match(styleGrammar, /:is\(\s*\.app-frame,\s*\.build-authoring-auxiliary,\s*\.unit-orbit\s*\) \.simex-icon-control[^}]*block-size:\s*var\(--simex-control-min[^}]*inline-size:\s*var\(--simex-control-min/s);
  assert.match(styleGrammar, /build-authoring-auxiliary[^}]*\{[^}]*font-family:\s*var\(--simex-style-body-font/s);
  assert.match(styleGrammar, /build-authoring-auxiliary[^}]*:is\(h1, h2, h3, h4, legend\)[^{]*\{[^}]*font-family:\s*var\(--simex-style-heading-font/s);

  assert.match(modes, /data-pending-work-state="dirty"[^}]*background:\s*var\(--simex-warning-soft\)[^}]*var\(--simex-warning\)/s);
  assert.match(modes, /data-pending-work-state="saving"[^}]*background:\s*var\(--simex-info-soft\)[^}]*var\(--simex-info\)/s);
  assert.match(modes, /data-pending-work-state="error"[^}]*background:\s*var\(--simex-error-soft\)[^}]*var\(--simex-error\)/s);
  assert.match(modes, /build-authoring-auxiliary button,[^{]*build-authoring-auxiliary input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)[^{]*\{[^}]*min-height:\s*var\(--simex-control-min/s);
  assert.match(modes, /\.build-authoring-auxiliary\s*\{[^}]*border-radius:\s*var\(--simex-style-surface-radius\)[^}]*box-shadow:\s*var\(--simex-style-shell-shadow\)/s);

  assert.doesNotMatch(staticContent, /--simex-surface-muted/);
  assert.match(staticContent, /portable-qmd-composer__toolbar[^}]*button\[aria-pressed="true"\][^{]*\{[^}]*var\(--simex-selected-soft\)[^}]*var\(--simex-selected\)/s);
  assert.match(staticContent, /portable-qmd-composer__toolbar :is\(button, select\)[^{]*\{[^}]*min-height:\s*44px/s);
  assert.match(staticContent, /free-text-source-editor__reference-cards\s*\{[^}]*display:\s*flex[^}]*gap:\s*20px/s);
  assert.match(staticContent, /free-text-source-editor__markdown pre\s*\{[^}]*min-height:\s*168px[^}]*overflow:\s*auto/s);
  assert.match(staticContent, /free-text-source-editor__source-repair textarea\s*\{[^}]*min-block-size:\s*220px[^}]*width:\s*100%/s);
  assert.match(staticContent, /portable-qmd-composer__announcement\[role="status"\][^{]*\{[^}]*var\(--simex-info-soft\)[^}]*var\(--simex-info\)/s);

  assert.doesNotMatch(sourceContent, /--color-(?:text|border|surface)/);
  assert.doesNotMatch(sourceContent, /var\(--simex-(?:surface|border)(?:,|\))/);
  assert.match(rightDrawer, /box-shadow:\s*var\(--simex-style-shell-shadow\)/);
  assert.match(operationStatus, /border-radius:\s*var\(--simex-style-surface-radius\)/);
  assert.match(sourceViewer, /:root\s*\{[^}]*font-family:\s*var\(--simex-style-body-font(?:,|\))/s);
  assert.match(sourceViewer, /source-viewer-theme-root :is\(button, input\)[^{]*\{[^}]*min-block-size:\s*var\(--simex-control-min/s);
  assert.match(sourceViewer, /source-viewer-return\s*\{[^}]*background:\s*var\(--simex-surface-panel-alt[^}]*border[^}]*var\(--simex-border-strong[^}]*color:\s*var\(--simex-text-strong/s);
  assert.match(sourceViewer, /source-viewer-return:focus-visible[^}]*\{[^}]*var\(--simex-focus/s);
  assert.match(iconGlyphs, /font-family:var\(--simex-style-data-font\)/);
  assert.match(buildWorkspace, /dashboardThemeRootProps\(\s*themeProjection,\s*activeAuxiliary !== "source-content"\s*\?\s*\{ display: "none" \}\s*:\s*\{\},?\s*\)/s);
  assert.doesNotMatch(buildWorkspace, /dashboardThemeRootProps\(themeProjection\)\}[\s\S]{0,500}style=\{activeAuxiliary !== "source-content"/);
  assert.doesNotMatch(`${styles}\n${modes}`, /--simex-shadow-(?:elevated|raised)/);
});
