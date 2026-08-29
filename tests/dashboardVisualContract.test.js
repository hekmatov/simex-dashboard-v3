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
      source: ".legacy { color: #007c89; border-color: #3157d5; box-shadow: 0 2px 8px rgba(8, 34, 74, 0.18); }\n.legacy { color: var(--simex-text-strong); }",
    },
    {
      filePath: "src/components/ColorField.jsx",
      source: "const swatch = { colors: [\"#08224A\"] };",
    },
  ]);

  assert.deepEqual(
    result.active.map(({ filePath, color }) => [filePath, color]),
    [
      ["src/styles/masked.css", "#007c89"],
      ["src/styles/masked.css", "#3157d5"],
      ["src/styles/masked.css", "rgba(8, 34, 74, 0.18)"],
    ],
  );
  assert.deepEqual(
    result.allowed.map(({ classification }) => classification),
    ["authored-color-swatch"],
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
