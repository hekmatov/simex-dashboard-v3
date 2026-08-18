import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateDashboardStructure } from "../src/charting/config/dashboardConfigStructure.js";

let themeModule = {};
try {
  themeModule = await import("../src/theme/dashboardTheme.js");
} catch (error) {
  if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
}

const APPROVED_PROFILE_IDS = [
  "evidence-ledger/brighter-vellum",
  "evidence-ledger/ash-register",
  "evidence-ledger/cool-archive",
  "humanist-standard/common-ground",
  "humanist-standard/quiet-commons",
  "humanist-standard/open-forum",
  "signal-instrument/calibrated-steel",
  "signal-instrument/quiet-telemetry",
  "signal-instrument/amber-vector",
  "utility/prismatic-index",
  "utility/chromatic-polarity",
  "utility/luminance-ladder",
  "graphpad/sunrise-reference",
  "graphpad/lakeside-reference",
  "utility/monochrome-reserve",
];

test("dashboard configuration accepts only approved saved look values", async () => {
  const dashboard = JSON.parse(await readFile(
    new URL("../public/config/dashboard.json", import.meta.url),
    "utf8",
  ));
  Object.assign(dashboard.globalStyles, {
    dashboardStyle: "humanist-standard",
    dashboardColorProfile: "utility/prismatic-index",
    chartColorMode: "standard",
  });

  assert.doesNotThrow(() => validateDashboardStructure(dashboard));

  dashboard.globalStyles.dashboardColorProfile = "evidence-ledger/original-baseline";
  assert.throws(
    () => validateDashboardStructure(dashboard),
    /dashboard color profile/i,
  );
});

test("theme resolver exposes all 15 approved profiles in both appearances", () => {
  assert.equal(typeof themeModule.resolveDashboardTheme, "function");
  if (typeof themeModule.resolveDashboardTheme !== "function") return;

  assert.deepEqual(
    themeModule.DASHBOARD_COLOR_PROFILES.map(({ id }) => id),
    APPROVED_PROFILE_IDS,
  );
  for (const dashboardColorProfile of APPROVED_PROFILE_IDS) {
    for (const appearancePreference of ["light", "dark"]) {
      const resolved = themeModule.resolveDashboardTheme({
        globalStyles: {
          dashboardStyle: "evidence-ledger",
          dashboardColorProfile,
          chartColorMode: "profile",
        },
        appearancePreference,
      });
      assert.equal(resolved.dashboardColorProfile, dashboardColorProfile);
      assert.equal(resolved.resolvedAppearance, appearancePreference);
      assert.equal(Object.keys(resolved.cssVariables).length, 33);
    }
  }
});

test("System appearance resolves machine preference and Standard changes only chart paint", () => {
  assert.equal(typeof themeModule.resolveDashboardTheme, "function");
  if (typeof themeModule.resolveDashboardTheme !== "function") return;

  const profile = themeModule.resolveDashboardTheme({
    globalStyles: {
      dashboardStyle: "humanist-standard",
      dashboardColorProfile: "evidence-ledger/brighter-vellum",
      chartColorMode: "profile",
    },
    appearancePreference: "system",
    prefersDark: true,
  });
  const standard = themeModule.resolveDashboardTheme({
    globalStyles: {
      dashboardStyle: "humanist-standard",
      dashboardColorProfile: "evidence-ledger/brighter-vellum",
      chartColorMode: "standard",
    },
    appearancePreference: "system",
    prefersDark: true,
  });

  assert.equal(profile.resolvedAppearance, "dark");
  assert.equal(profile.cssVariables["--simex-surface-panel"], "#2b2922");
  assert.equal(profile.cssVariables["--simex-data-1"], "#a8b794");
  assert.equal(standard.cssVariables["--simex-surface-panel"], "#2b2922");
  assert.equal(standard.cssVariables["--simex-data-1"], "#86b3dd");
  assert.equal(standard.cssVariables["--simex-chart-mark"], "#edf2f5");
});

test("appearance preference persistence rejects unknown stored values", () => {
  assert.equal(typeof themeModule.readAppearancePreference, "function");
  assert.equal(typeof themeModule.persistAppearancePreference, "function");
  if (
    typeof themeModule.readAppearancePreference !== "function"
    || typeof themeModule.persistAppearancePreference !== "function"
  ) return;

  const values = new Map([[themeModule.APPEARANCE_STORAGE_KEY, "sepia"]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };

  assert.equal(themeModule.readAppearancePreference(storage), "system");
  themeModule.persistAppearancePreference("dark", storage);
  assert.equal(values.get(themeModule.APPEARANCE_STORAGE_KEY), "dark");
  assert.equal(themeModule.readAppearancePreference(storage), "dark");
  assert.throws(
    () => themeModule.persistAppearancePreference("sepia", storage),
    /appearance preference/i,
  );
});
