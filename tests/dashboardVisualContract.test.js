import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { DASHBOARD_VISUAL_CONTRACT } from "../src/theme/dashboardTheme.js";

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
