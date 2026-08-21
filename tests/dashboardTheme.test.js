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
    themeModule.DASHBOARD_STYLES.map(({ id }) => id),
    ["evidence-ledger", "humanist-standard", "signal-instrument"],
  );
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
      assert.equal(
        Object.keys(resolved.cssVariables)
          .filter((key) => !key.startsWith("--simex-component-") && key !== "--simex-control-min").length,
        33,
      );
    }
  }
});

test("Profile and Standard chart colours are independent across Light, Dark, and System appearance", () => {
  assert.equal(typeof themeModule.resolveDashboardTheme, "function");
  if (typeof themeModule.resolveDashboardTheme !== "function") return;

  for (const [appearancePreference, prefersDark, resolvedAppearance] of [
    ["light", false, "light"],
    ["dark", false, "dark"],
    ["system", false, "light"],
    ["system", true, "dark"],
  ]) {
    const globalStyles = {
      dashboardStyle: "humanist-standard",
      dashboardColorProfile: "evidence-ledger/brighter-vellum",
    };
    const profile = themeModule.resolveDashboardTheme({
      globalStyles: { ...globalStyles, chartColorMode: "profile" },
      appearancePreference,
      prefersDark,
    });
    const standard = themeModule.resolveDashboardTheme({
      globalStyles: { ...globalStyles, chartColorMode: "standard" },
      appearancePreference,
      prefersDark,
    });

    assert.equal(profile.resolvedAppearance, resolvedAppearance);
    assert.equal(standard.resolvedAppearance, resolvedAppearance);
    assert.equal(profile.cssVariables["--simex-surface-panel"], standard.cssVariables["--simex-surface-panel"]);
    assert.notEqual(profile.cssVariables["--simex-data-1"], standard.cssVariables["--simex-data-1"]);
    assert.notEqual(profile.cssVariables["--simex-chart-mark"], standard.cssVariables["--simex-chart-mark"]);
  }
});

test("active theme projections are immutable and keyed by every rendered theme value", () => {
  assert.equal(typeof themeModule.createDashboardThemeProjection, "function");
  if (typeof themeModule.createDashboardThemeProjection !== "function") return;

  const light = themeModule.resolveDashboardTheme({
    globalStyles: {
      dashboardStyle: "humanist-standard",
      dashboardColorProfile: "humanist-standard/common-ground",
      chartColorMode: "profile",
    },
    appearancePreference: "light",
  });
  const sameLight = themeModule.resolveDashboardTheme({
    globalStyles: {
      dashboardStyle: "humanist-standard",
      dashboardColorProfile: "humanist-standard/common-ground",
      chartColorMode: "profile",
    },
    appearancePreference: "light",
  });
  const dark = themeModule.resolveDashboardTheme({
    globalStyles: light,
    appearancePreference: "dark",
  });
  const projection = themeModule.createDashboardThemeProjection(light);
  const sameProjection = themeModule.createDashboardThemeProjection(sameLight);
  const darkProjection = themeModule.createDashboardThemeProjection(dark);

  assert.equal(Object.isFrozen(projection), true);
  assert.equal(Object.isFrozen(projection.cssVariables), true);
  assert.equal(projection.key, sameProjection.key);
  assert.notEqual(projection.key, darkProjection.key);
  assert.equal(projection.cssVariables["--simex-style-body-font"], light.styleVariables["--simex-style-body-font"]);
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
  assert.equal(themeModule.persistAppearancePreference("dark", storage), true);
  assert.equal(values.get(themeModule.APPEARANCE_STORAGE_KEY), "dark");
  assert.equal(themeModule.readAppearancePreference(storage), "dark");
  assert.equal(themeModule.persistAppearancePreference("dark", {
    setItem() { return false; },
  }), false);
  assert.throws(
    () => themeModule.persistAppearancePreference("sepia", storage),
    /appearance preference/i,
  );
});

test("named V3 surfaces inherit shared style and component variables", async () => {
  const [grammar, modes, presentation] = await Promise.all([
    readFile(new URL("../src/styles/dashboard-style-grammar.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/modes.css", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/presentation.css", import.meta.url), "utf8"),
  ]);
  const sharedSurfaces = [
    ".dashboard-command-crown",
    ".canonical-dashboard-frame .dashboard-header",
    ".canonical-dashboard-frame .section-header",
    ".dashboard-footer",
    ".confirm-dialog",
    ".application-recovery-panel",
    ".look-drawer",
  ];

  for (const selector of sharedSurfaces) {
    assert.ok(
      (grammar + modes).includes(selector),
      `${selector} should consume the shared surface grammar`,
    );
  }
  assert.match(grammar, /--simex-component-surface-radius/);
  assert.match(grammar, /--simex-component-control-radius/);
  assert.match(grammar, /--simex-component-focus/);
  assert.match(modes, /--simex-control-min/);
  assert.match(presentation, /--simex-component-surface-radius/);
  assert.match(presentation, /--simex-component-control-radius/);
});

test("standalone Audience and its snapshot portal project active theme metadata and variables", async () => {
  const [app, recovery, renderer, present, snapshot] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/app-shell/ApplicationRecovery.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/DashboardRenderer.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/presentation/PresentWorkspace.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/presentation/AudienceSnapshotMonitor.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(app, /createDashboardThemeProjection\(dashboardTheme\)/);
  assert.match(app, /<ApplicationRecovery[\s\S]*themeProjection=\{dashboardThemeProjection\}/);
  assert.match(recovery, /data-dashboard-style=\{themeProjection\.dashboardStyle\}/);
  assert.match(recovery, /style=\{themeProjection\.cssVariables\}/);
  assert.match(renderer, /<PresentWorkspace[\s\S]*themeProjection=\{themeProjection\}/);
  assert.match(present, /<AudienceSnapshotMonitor[\s\S]*themeProjection=\{themeProjection\}/);
  assert.match(app, /className="audience-theme-root"/);
  assert.match(app, /data-dashboard-style=\{dashboardTheme\.dashboardStyle\}/);
  assert.match(app, /data-dashboard-color-profile=\{dashboardTheme\.dashboardColorProfile\}/);
  assert.match(app, /data-resolved-appearance=\{dashboardTheme\.resolvedAppearance\}/);
  assert.match(app, /style=\{\{ \.\.\.dashboardTheme\.cssVariables, \.\.\.dashboardTheme\.styleVariables \}\}/);
  assert.match(snapshot, /data-dashboard-style=\{captureSource\.themeProjection\.dashboardStyle\}/);
  assert.match(snapshot, /data-dashboard-color-profile=\{captureSource\.themeProjection\.dashboardColorProfile\}/);
  assert.match(snapshot, /data-resolved-appearance=\{captureSource\.themeProjection\.resolvedAppearance\}/);
  assert.match(snapshot, /style=\{captureSource\.themeProjection\.cssVariables\}/);
  assert.match(snapshot, /themeProjection\.key/);
  assert.doesNotMatch(snapshot, /getComputedStyle|querySelector\("\.app-frame"\)/);
});
