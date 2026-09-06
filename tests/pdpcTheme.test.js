import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolveDashboardTheme, createPresentationThemeSnapshot, resolvePresentationThemeSnapshot } from "../src/theme/dashboardTheme.js";
import { signatureProfileForStyle } from "../src/theme/dashboardLookDraft.js";
import { normalizeDashboardBoundary } from "../src/charting/config/dashboardBundleV3.js";
import { validateDashboardStructure } from "../src/charting/config/dashboardConfigStructure.js";

const globalStyles = { dashboardStyle: "pdpc", dashboardColorProfile: "pdpc/brand", chartColorMode: "profile" };

test("PDPC preserves Ledger geometry and uses one family for every typography role", () => {
  for (const appearancePreference of ["light", "dark"]) {
    const pdpc = resolveDashboardTheme({ globalStyles, appearancePreference });
    const ledger = resolveDashboardTheme({ globalStyles: { dashboardStyle: "evidence-ledger" }, appearancePreference });
    assert.equal(pdpc.dashboardStyle, "pdpc");
    const fonts = ["body", "heading"].map(role => pdpc.styleVariables[`--simex-style-${role}-font`]);
    assert.equal(new Set(fonts).size, 1);
    assert.match(fonts[0], /Avenir.*Calibri/);
    for (const [key, value] of Object.entries(ledger.styleVariables)) {
      if (!key.endsWith("-font") && !key.endsWith("-weight") && !key.endsWith("-tracking")) {
        assert.equal(pdpc.styleVariables[key], value, key);
      }
    }
  }
});

test("PDPC palette and appearance survive dashboard and presentation boundaries", async () => {
  const dashboard = JSON.parse(await readFile(new URL("../public/config/dashboard.json", import.meta.url), "utf8"));
  Object.assign(dashboard.globalStyles, globalStyles);
  assert.doesNotThrow(() => validateDashboardStructure(dashboard));
  assert.equal(normalizeDashboardBoundary(dashboard).globalStyles.dashboardStyle, "pdpc");
  assert.equal(normalizeDashboardBoundary(dashboard).globalStyles.dashboardColorProfile, "pdpc/brand");
  assert.equal(signatureProfileForStyle("pdpc"), "pdpc/brand");
  for (const appearancePreference of ["light", "dark"]) {
    const theme = resolveDashboardTheme({ globalStyles, appearancePreference });
    const restored = resolvePresentationThemeSnapshot(createPresentationThemeSnapshot(theme));
    assert.equal(restored.dashboardStyle, "pdpc");
    assert.equal(restored.dashboardColorProfile, "pdpc/brand");
    assert.deepEqual(restored.styleVariables, theme.styleVariables);
  }
  const { cssVariables } = resolveDashboardTheme({ globalStyles, appearancePreference: "light" });
  assert.equal(cssVariables["--simex-accent"], "#253162");
  assert.deepEqual([1, 2, 3, 4, 5].map(i => cssVariables[`--simex-data-${i}`]), ["#253162", "#258161", "#139cd8", "#d72628", "#8d88ad"]);
});
