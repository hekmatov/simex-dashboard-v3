import assert from "node:assert/strict";
import test from "node:test";

import {
  captureDashboardThemeProjection,
  dashboardThemeRootProps,
} from "../src/theme/dashboardThemeRoot.js";

const projection = Object.freeze({
  dashboardStyle: "signal-instrument",
  dashboardColorProfile: "signal-instrument/calibrated-steel",
  chartColorMode: "profile",
  appearancePreference: "dark",
  resolvedAppearance: "dark",
  cssVariables: Object.freeze({
    "--simex-surface-panel": "#1a272c",
    "--simex-text-strong": "#edf4f5",
    "--simex-style-body-font": "Bahnschrift, sans-serif",
  }),
});

test("theme roots project selected style metadata and merge local placement styles", () => {
  assert.deepEqual(
    dashboardThemeRootProps(projection, { left: "24px", visibility: "visible" }),
    {
      "data-dashboard-style": "signal-instrument",
      "data-dashboard-color-profile": "signal-instrument/calibrated-steel",
      "data-chart-color-mode": "profile",
      "data-appearance-preference": "dark",
      "data-resolved-appearance": "dark",
      style: {
        "--simex-surface-panel": "#1a272c",
        "--simex-text-strong": "#edf4f5",
        "--simex-style-body-font": "Bahnschrift, sans-serif",
        left: "24px",
        visibility: "visible",
      },
    },
  );
});

test("standalone theme capture only transfers approved SimEx variables and metadata", () => {
  const values = new Map([
    ["--simex-surface-panel", " #fffdf8 "],
    ["--simex-style-heading-font", "Georgia, serif"],
    ["--unrelated-secret", "do-not-copy"],
  ]);
  const root = {
    dataset: {
      dashboardStyle: "evidence-ledger",
      dashboardColorProfile: "evidence-ledger/brighter-vellum",
      chartColorMode: "standard",
      appearancePreference: "system",
      resolvedAppearance: "light",
    },
    style: {
      *[Symbol.iterator]() { yield* values.keys(); },
      getPropertyValue(name) { return values.get(name) ?? ""; },
    },
  };

  assert.deepEqual(captureDashboardThemeProjection(root), {
    dashboardStyle: "evidence-ledger",
    dashboardColorProfile: "evidence-ledger/brighter-vellum",
    chartColorMode: "standard",
    appearancePreference: "system",
    resolvedAppearance: "light",
    cssVariables: {
      "--simex-surface-panel": "#fffdf8",
      "--simex-style-heading-font": "Georgia, serif",
    },
  });
});
