import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import {
  DASHBOARD_VISUAL_CONTRACT,
  resolveDashboardTheme,
} from "../src/theme/dashboardTheme.js";
import { densityForDashboardMode } from "../src/lib/dashboardMode.js";
import { auditDashboardStyleSources } from "./e2e/support/dashboard-style-audit.js";

const EXPECTED_CONTRACT = {
  radiusControl: 6,
  radiusSurface: 10,
  controls: {
    choiceGlyph: 16,
    utility: 24,
    compact: 28,
    standard: 32,
    prominent: 36,
    commandCrownRow: 36,
  },
  typography: {
    control: { fontSize: 13, lineHeight: 18 },
    body: { fontSize: 14, lineHeight: 20 },
    label: { fontSize: 12, lineHeight: 16 },
  },
  spacing: {
    scale: [2, 4, 8, 12, 16, 24, 32],
    labelControl: 4,
    choiceLabel: 8,
    controlGroup: 8,
    section: 12,
    panelPadding: 12,
    dialogPadding: 16,
    region: 24,
  },
  neutral: {
    outer: "#e8e9ea",
    surface: "#ffffff",
    subtle: "#f4f5f5",
    text: "#17191b",
    muted: "#5a6066",
    border: "#c7cbcf",
    borderStrong: "#747b82",
    active: "#202428",
  },
};

const EXPECTED_DENSITY_VARIABLES = {
  "--simex-choice-glyph": "16px",
  "--simex-control-utility": "24px",
  "--simex-control-compact": "28px",
  "--simex-control-standard": "32px",
  "--simex-control-prominent": "36px",
  "--simex-command-crown-row": "36px",
  "--simex-control-font-size": "13px",
  "--simex-control-line-height": "18px",
  "--simex-body-font-size": "14px",
  "--simex-body-line-height": "20px",
  "--simex-label-font-size": "12px",
  "--simex-label-line-height": "16px",
  "--simex-space-1": "2px",
  "--simex-space-2": "4px",
  "--simex-space-3": "8px",
  "--simex-space-4": "12px",
  "--simex-space-5": "16px",
  "--simex-space-6": "24px",
  "--simex-space-7": "32px",
  "--simex-gap-label-control": "4px",
  "--simex-gap-choice-label": "8px",
  "--simex-gap-control-group": "8px",
  "--simex-gap-section": "12px",
  "--simex-padding-panel": "12px",
  "--simex-padding-dialog": "16px",
  "--simex-gap-region": "24px",
  "--simex-control-min": "var(--simex-control-standard)",
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
  assert.equal(Object.isFrozen(DASHBOARD_VISUAL_CONTRACT.controls), true);
  assert.equal(Object.isFrozen(DASHBOARD_VISUAL_CONTRACT.typography), true);
  assert.equal(Object.isFrozen(DASHBOARD_VISUAL_CONTRACT.typography.control), true);
  assert.equal(Object.isFrozen(DASHBOARD_VISUAL_CONTRACT.spacing), true);
  assert.equal(Object.isFrozen(DASHBOARD_VISUAL_CONTRACT.spacing.scale), true);
  assert.equal(Object.isFrozen(DASHBOARD_VISUAL_CONTRACT.neutral), true);

  const [tokens, styleGrammar] = await Promise.all([
    readFile(new URL("../src/styles/tokens.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/dashboard-style-grammar.css", import.meta.url), "utf8"),
  ]);
  const theme = resolveDashboardTheme({ appearancePreference: "light" });

  assert.match(tokens, /--simex-component-control-radius:\s*6px/);
  assert.match(tokens, /--simex-component-surface-radius:\s*10px/);
  for (const [name, value] of Object.entries(EXPECTED_DENSITY_VARIABLES)) {
    assert.equal(theme.cssVariables[name], value, `${name} theme projection`);
    assert.match(tokens, new RegExp(`${name.replaceAll("-", "\\-")}:\\s*${value
      .replaceAll("(", "\\(")
      .replaceAll(")", "\\)")}`));
  }
  assert.match(styleGrammar, /var\(--simex-component-surface-radius\)/);
  assert.match(styleGrammar, /var\(--simex-component-control-radius\)/);
  assert.doesNotMatch(JSON.stringify(DASHBOARD_VISUAL_CONTRACT), /focus|keyboard|touch/i);
  assert.doesNotMatch(tokens, /--simex-control-min:\s*44px/);
});

test("all operational dashboard modes resolve to compact density while Home stays comfortable", () => {
  assert.equal(densityForDashboardMode("home"), "comfortable");
  assert.equal(densityForDashboardMode("view"), "compact");
  assert.equal(densityForDashboardMode("build"), "compact");
  assert.equal(densityForDashboardMode("present"), "compact");
});

test("pending owners and named authoring surfaces consume semantic style and control contracts", async () => {
  const [
    styles,
    modes,
    chartDataState,
    styleGrammar,
    staticContent,
    sourceContent,
    rightDrawer,
    operationStatus,
    sourceViewer,
    iconGlyphs,
    buildWorkspace,
    chartWizard,
  ] = await Promise.all([
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/modes.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/chart-data-state.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/dashboard-style-grammar.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/static-content.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/source-content.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/right-side-drawer.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/operation-status.css", import.meta.url), "utf8"),
    readFile(new URL("../src/source-viewer/sourceViewer.css", import.meta.url), "utf8"),
    readFile(new URL("../src/iconography/iconGlyphs.js", import.meta.url), "utf8"),
    readFile(new URL("../src/components/build/BuildWorkspace.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/chart-authoring/ChartWizardV3.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /:root\s*\{[^}]*font-family:\s*var\(--simex-style-body-font(?:,|\))/s);
  assert.match(styles, /input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\),\s*select,\s*textarea/s);
  assert.match(styleGrammar, /input:is\(\[type="checkbox"\],\s*\[type="radio"\]\)[^{]*\{[^}]*accent-color:\s*var\(--simex-selected\)[^}]*block-size:\s*var\(--simex-choice-glyph\)[^}]*inline-size:\s*var\(--simex-choice-glyph\)/s);
  assert.match(styleGrammar, /label:has\(input:is\(\[type="checkbox"\],\s*\[type="radio"\]\)\)[^{]*\{[^}]*gap:\s*var\(--simex-gap-choice-label\)[^}]*min-block-size:\s*var\(--simex-control-compact\)/s);
  assert.match(styleGrammar, /chart-authoring-field:has\(> input:is\(\[type="checkbox"\],\s*\[type="radio"\]\)\)[^{]*\{[^}]*gap:\s*var\(--simex-gap-choice-label\)/s);
  assert.match(styleGrammar, /chart-authoring-field:has\(> input:is\(\[type="checkbox"\],\s*\[type="radio"\]\)\) > label[^}]*\{[^}]*gap:\s*var\(--simex-gap-choice-label\)[^}]*min-block-size:\s*var\(--simex-control-compact\)/s);
  assert.match(styleGrammar, /:is\(\s*\.app-frame,\s*\.build-authoring-auxiliary,\s*\.unit-orbit\s*\)\s*:is\(\s*button,[^{]*\{[^}]*font-size:\s*var\(--simex-control-font-size\)[^}]*line-height:\s*var\(--simex-control-line-height\)[^}]*min-block-size:\s*var\(--simex-control-standard\)/s);
  assert.match(styleGrammar, /:is\(\s*\.app-frame,\s*\.build-authoring-auxiliary,\s*\.unit-orbit\s*\) \.simex-icon-control[^}]*block-size:\s*var\(--simex-control-utility\)[^}]*inline-size:\s*var\(--simex-control-utility\)/s);
  assert.match(styleGrammar, /build-authoring-auxiliary[^}]*\{[^}]*font-family:\s*var\(--simex-style-body-font/s);
  assert.match(styleGrammar, /build-authoring-auxiliary[^}]*:is\(h1, h2, h3, h4, legend\)[^{]*\{[^}]*font-family:\s*var\(--simex-style-heading-font/s);

  assert.match(modes, /data-pending-work-state="dirty"[^}]*background:\s*var\(--simex-warning-soft\)[^}]*var\(--simex-warning\)/s);
  assert.match(modes, /data-pending-work-state="saving"[^}]*background:\s*var\(--simex-info-soft\)[^}]*var\(--simex-info\)/s);
  assert.match(modes, /data-pending-work-state="error"[^}]*background:\s*var\(--simex-error-soft\)[^}]*var\(--simex-error\)/s);
  assert.match(modes, /build-authoring-auxiliary button,[^{]*build-authoring-auxiliary input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)[^{]*\{[^}]*min-height:\s*var\(--simex-control-min/s);
  assert.match(modes, /\.build-authoring-auxiliary\s*\{[^}]*border-radius:\s*var\(--simex-style-surface-radius\)[^}]*box-shadow:\s*var\(--simex-style-shell-shadow\)/s);
  assert.ok(styles.includes("grid-auto-rows: calc((418px - 48px) / 4);"));
  assert.ok(modes.includes("grid-row: span var(--chart-footprint-row-span);"));
  assert.ok(modes.includes("height: var(--footprint-preview-visual-height);"));
  assert.match(modes, /\.chart-panel-footprint\[data-footprint-short="true"\]\s*:is\(\.chart-view-frame,\s*\.chart-zoom-guard\)\s*\{[^}]*overflow:\s*auto/s);
  assert.match(modes, /\.chart-panel-footprint\[data-footprint-short="true"\][^{]*:is\([^}]*\.chart-echarts-host[^}]*\.chart-deferred-placeholder[^}]*\)\s*\{[^}]*min-height:\s*0/s);
  assert.match(modes, /\.scene-view-composition-cell\[data-scene-footprint-mode="live"\]\[data-scene-short="true"\][^{]*:is\([^}]*\.chart-echarts-host[^}]*\.chart-deferred-placeholder[^}]*\)\s*\{[^}]*min-height:\s*0/s);
  assert.match(modes, /\.chart-panel-footprint\[data-footprint-short="true"\]\s+\.chart-image-view,[\s\S]*?\.chart-image-view\s*\{[^}]*overflow:\s*auto/s);
  assert.match(modes, /\.chart-panel-footprint\[data-footprint-compact="true"\]\s+\.chart-image-actions,[\s\S]*?\.chart-image-actions\s*\{[^}]*opacity:\s*1[^}]*pointer-events:\s*auto[^}]*position:\s*static/s);
  assert.match(chartDataState, /\.chart-state-surface--short\s*\{[^}]*overflow:\s*auto[^}]*overscroll-behavior:\s*contain/s);
  assert.match(modes, /\[data-scene-composition-surface="scene-preview"\] \.scene-view-composition-cell,[\s\S]*?min-height:\s*320px/s);
  assert.match(modes, /@media \(max-width: 1000px\)\s*\{[\s\S]*?\.chart-panel-footprint,[\s\S]*?grid-column:\s*auto;[\s\S]*?grid-row:\s*auto;/);
  assert.match(modes, /\.app-shell\[data-device-layout="phone"\] \.chart-panel-footprint\s*\{[^}]*grid-column:\s*auto;[^}]*grid-row:\s*auto;/);
  assert.match(chartWizard, /"data-chart-wizard-stage":\s*wizard\.stage/);
  assert.match(styleGrammar, /\.app-frame \.chart-wizard-workbench\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*3fr\)\s+minmax\(0,\s*4fr\)/s);
  assert.match(styles, /\.chart-wizard-style-grid--without-preview\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);

  assert.doesNotMatch(staticContent, /--simex-surface-muted/);
  assert.match(staticContent, /portable-qmd-composer__toolbar[^}]*button\[aria-pressed="true"\][^{]*\{[^}]*var\(--simex-selected-soft\)[^}]*var\(--simex-selected\)/s);
  assert.match(staticContent, /portable-qmd-composer__toolbar :is\(button, select\)[^{]*\{[^}]*min-height:\s*var\(--simex-control-standard/s);
  assert.match(staticContent, /authoring-footprint-grid\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(staticContent, /authoring-footprint-frame\s*\{[^}]*grid-column:\s*span var\(--chart-footprint-columns\)/s);
  assert.ok(staticContent.includes("grid-row: span var(--chart-footprint-row-span);"));
  assert.match(staticContent, /free-text-source-editor__reference-cards\s*\{[^}]*display:\s*contents/s);
  assert.match(staticContent, /free-text-source-editor__markdown pre\s*\{[^}]*min-height:\s*168px[^}]*overflow:\s*auto/s);
  assert.match(staticContent, /free-text-source-editor__source-repair textarea\s*\{[^}]*min-block-size:\s*220px[^}]*width:\s*100%/s);
  assert.match(staticContent, /portable-qmd-composer__announcement\[role="status"\][^{]*\{[^}]*var\(--simex-info-soft\)[^}]*var\(--simex-info\)/s);

  assert.doesNotMatch(sourceContent, /--color-(?:text|border|surface)/);
  assert.doesNotMatch(sourceContent, /var\(--simex-(?:surface|border)(?:,|\))/);
  assert.match(rightDrawer, /box-shadow:\s*var\(--simex-style-shell-shadow\)/);
  assert.match(operationStatus, /border-radius:\s*var\(--simex-style-surface-radius\)/);
  assert.match(sourceViewer, /:root\s*\{[^}]*font-family:\s*var\(--simex-style-body-font(?:,|\))/s);
  assert.match(sourceViewer, /source-viewer-theme-root :is\(button, input\)[^{]*\{[^}]*min-block-size:\s*var\(--simex-control-standard/s);
  assert.match(sourceViewer, /source-viewer-return\s*\{[^}]*background:\s*var\(--simex-surface-panel-alt[^}]*border[^}]*var\(--simex-border-strong[^}]*color:\s*var\(--simex-text-strong/s);
  assert.match(iconGlyphs, /font-family:var\(--simex-style-data-font\)/);
  assert.match(buildWorkspace, /dashboardThemeRootProps\(\s*themeProjection,\s*activeAuxiliary !== "source-content"\s*\?\s*\{ display: "none" \}\s*:\s*\{\},?\s*\)/s);
  assert.doesNotMatch(buildWorkspace, /dashboardThemeRootProps\(themeProjection\)\}[\s\S]{0,500}style=\{activeAuxiliary !== "source-content"/);
  assert.doesNotMatch(`${styles}\n${modes}`, /--simex-shadow-(?:elevated|raised)/);
});
