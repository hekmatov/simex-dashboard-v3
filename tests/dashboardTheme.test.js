import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { normalizeDashboardBoundary } from "../src/charting/config/dashboardBundleV3.js";
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
  "humanist-standard/open-forum",
  "signal-instrument/calibrated-steel",
  "signal-instrument/quiet-telemetry",
  "signal-instrument/amber-vector",
  "utility/prismatic-index",
  "utility/luminance-ladder",
  "graphpad/sunrise-reference",
  "graphpad/lakeside-reference",
  "utility/monochrome-reserve",
];

const APPROVED_STYLE_CATALOGUE = [
  ["evidence-ledger", "Ledger"],
  ["humanist-standard", "Humanist"],
  ["signal-instrument", "Instrument"],
];

const APPROVED_PROFILE_CATALOGUE = [
  ["evidence-ledger/brighter-vellum", "Vellum"],
  ["evidence-ledger/ash-register", "Register"],
  ["evidence-ledger/cool-archive", "Archive"],
  ["humanist-standard/common-ground", "Common Ground"],
  ["humanist-standard/open-forum", "Forum"],
  ["signal-instrument/calibrated-steel", "Steel"],
  ["signal-instrument/quiet-telemetry", "Telemetry"],
  ["signal-instrument/amber-vector", "Amber"],
  ["utility/prismatic-index", "Prismatic"],
  ["utility/luminance-ladder", "Ladder"],
  ["graphpad/sunrise-reference", "Sunrise"],
  ["graphpad/lakeside-reference", "Lakeside"],
  ["utility/monochrome-reserve", "Monochrome"],
];

const DENSE_DESKTOP_VARIABLE_NAMES = new Set([
  "--simex-choice-glyph",
  "--simex-control-utility",
  "--simex-control-compact",
  "--simex-control-standard",
  "--simex-control-prominent",
  "--simex-command-crown-row",
  "--simex-control-font-size",
  "--simex-control-line-height",
  "--simex-body-font-size",
  "--simex-body-line-height",
  "--simex-label-font-size",
  "--simex-label-line-height",
  "--simex-space-1",
  "--simex-space-2",
  "--simex-space-3",
  "--simex-space-4",
  "--simex-space-5",
  "--simex-space-6",
  "--simex-space-7",
  "--simex-gap-label-control",
  "--simex-gap-choice-label",
  "--simex-gap-control-group",
  "--simex-gap-section",
  "--simex-padding-panel",
  "--simex-padding-dialog",
  "--simex-gap-region",
  "--simex-control-min",
]);

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

test("dashboard, page, and section descriptions may be intentionally blank", async () => {
  const dashboard = JSON.parse(await readFile(
    new URL("../public/config/dashboard.json", import.meta.url),
    "utf8",
  ));
  dashboard.description = "";
  dashboard.pages[0].description = "";
  dashboard.pages[0].sections[0].description = "";

  assert.doesNotThrow(() => validateDashboardStructure(dashboard));
});

test("theme resolver exposes the exact renamed style and 13-profile catalogue in both appearances", () => {
  assert.equal(typeof themeModule.resolveDashboardTheme, "function");
  if (typeof themeModule.resolveDashboardTheme !== "function") return;

  assert.deepEqual(
    themeModule.DASHBOARD_STYLES.map(({ id, name }) => [id, name]),
    APPROVED_STYLE_CATALOGUE,
  );
  assert.deepEqual(
    themeModule.DASHBOARD_COLOR_PROFILES.map(({ id, name }) => [id, name]),
    APPROVED_PROFILE_CATALOGUE,
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
          .filter((key) => !key.startsWith("--simex-component-")
            && !DENSE_DESKTOP_VARIABLE_NAMES.has(key)).length,
        33,
      );
    }
  }
});

test("new, missing, and obsolete theme state resolves to Ledger with Steel without replacing explicit choices", async () => {
  const shipped = JSON.parse(await readFile(
    new URL("../public/config/dashboard.json", import.meta.url),
    "utf8",
  ));
  assert.deepEqual(
    {
      dashboardStyle: shipped.globalStyles.dashboardStyle,
      dashboardColorProfile: shipped.globalStyles.dashboardColorProfile,
    },
    {
      dashboardStyle: "evidence-ledger",
      dashboardColorProfile: "signal-instrument/calibrated-steel",
    },
  );

  const substantive = structuredClone({
    title: shipped.title,
    pages: shipped.pages,
    dataSources: shipped.dataSources,
    contentLibrary: shipped.contentLibrary,
    assets: shipped.assets,
  });
  for (const [dashboardStyle, dashboardColorProfile] of [
    ["humanist-standard", "humanist-standard/quiet-commons"],
    ["signal-instrument", "utility/chromatic-polarity"],
  ]) {
    const candidate = structuredClone(shipped);
    Object.assign(candidate.globalStyles, { dashboardStyle, dashboardColorProfile });
    const normalized = normalizeDashboardBoundary(candidate);

    assert.equal(normalized.globalStyles.dashboardStyle, "evidence-ledger");
    assert.equal(normalized.globalStyles.dashboardColorProfile, "signal-instrument/calibrated-steel");
    assert.deepEqual({
      title: normalized.title,
      pages: normalized.pages,
      dataSources: normalized.dataSources,
      contentLibrary: normalized.contentLibrary,
      assets: normalized.assets,
    }, substantive);
    assert.doesNotThrow(() => validateDashboardStructure(normalized));
  }

  assert.deepEqual(
    {
      dashboardStyle: themeModule.resolveDashboardTheme().dashboardStyle,
      dashboardColorProfile: themeModule.resolveDashboardTheme().dashboardColorProfile,
    },
    {
      dashboardStyle: "evidence-ledger",
      dashboardColorProfile: "signal-instrument/calibrated-steel",
    },
  );
  const explicit = themeModule.resolveDashboardTheme({
    globalStyles: {
      dashboardStyle: "humanist-standard",
      dashboardColorProfile: "humanist-standard/open-forum",
      chartColorMode: "standard",
    },
    appearancePreference: "dark",
  });
  assert.equal(explicit.dashboardStyle, "humanist-standard");
  assert.equal(explicit.dashboardColorProfile, "humanist-standard/open-forum");
  assert.equal(explicit.chartColorMode, "standard");
  assert.equal(explicit.resolvedAppearance, "dark");

  for (const dashboardColorProfile of [
    "humanist-standard/quiet-commons",
    "utility/chromatic-polarity",
  ]) {
    const invalid = structuredClone(shipped);
    invalid.globalStyles.dashboardColorProfile = dashboardColorProfile;
    assert.throws(() => validateDashboardStructure(invalid), /dashboard color profile/i);
  }
});

test("Audience reconstructs an exact System theme snapshot with the sender's resolved appearance", () => {
  const resolved = themeModule.resolvePresentationThemeSnapshot({
    dashboard_style: "humanist-standard",
    dashboard_color_profile: "humanist-standard/open-forum",
    chart_color_mode: "standard",
    appearance_preference: "system",
    resolved_appearance: "dark",
  });

  assert.equal(resolved.dashboardStyle, "humanist-standard");
  assert.equal(resolved.dashboardColorProfile, "humanist-standard/open-forum");
  assert.equal(resolved.chartColorMode, "standard");
  assert.equal(resolved.appearancePreference, "system");
  assert.equal(resolved.resolvedAppearance, "dark");
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
  assert.match(modes, /--simex-control-standard/);
  assert.match(modes, /--simex-control-compact/);
  assert.match(modes, /--simex-control-utility/);
  assert.match(modes, /--simex-command-crown-row/);
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
  assert.match(app, /resolvePresentationThemeSnapshot\(audienceProjection\?\.theme, dashboardTheme\)/);
  assert.match(app, /data-dashboard-style=\{audienceDashboardTheme\.dashboardStyle\}/);
  assert.match(app, /data-dashboard-color-profile=\{audienceDashboardTheme\.dashboardColorProfile\}/);
  assert.match(app, /data-resolved-appearance=\{audienceDashboardTheme\.resolvedAppearance\}/);
  assert.match(app, /style=\{\{ \.\.\.audienceDashboardTheme\.cssVariables, \.\.\.audienceDashboardTheme\.styleVariables \}\}/);
  assert.match(snapshot, /\{typeof document !== "undefined" && createPortal\(/);
  assert.match(snapshot, /data-dashboard-style=\{themeProjection\.dashboardStyle\}/);
  assert.match(snapshot, /data-dashboard-color-profile=\{themeProjection\.dashboardColorProfile\}/);
  assert.match(snapshot, /data-resolved-appearance=\{themeProjection\.resolvedAppearance\}/);
  assert.match(snapshot, /style=\{themeProjection\.cssVariables\}/);
  assert.match(snapshot, /themeProjection\.key/);
  assert.doesNotMatch(snapshot, /getComputedStyle|querySelector\("\.app-frame"\)/);
});
