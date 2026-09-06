import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { createOperationStatusQueue } from "../src/lib/operationStatusQueue.js";
import { dashboardThemeRootProps } from "../src/theme/dashboardThemeRoot.js";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const [
  { default: AppFrame },
  { createDashboardThemeProjection, resolveDashboardTheme },
  { default: OperationStatusProvider },
] = await Promise.all([
  vite.ssrLoadModule("/src/components/app-shell/AppFrame.jsx"),
  vite.ssrLoadModule("/src/theme/dashboardTheme.js"),
  vite.ssrLoadModule("/src/components/app-shell/OperationStatusProvider.jsx"),
]);
await vite.close();

const staticScheduler = {
  setTimeout: () => 1,
  clearTimeout: () => {},
};

function renderStyle(dashboardStyle, appearancePreference = "light") {
  const theme = resolveDashboardTheme({
    globalStyles: {
      dashboardStyle,
      dashboardColorProfile: "evidence-ledger/brighter-vellum",
      chartColorMode: "profile",
    },
    appearancePreference,
  });
  const queue = createOperationStatusQueue({ scheduler: staticScheduler });
  return renderToStaticMarkup(React.createElement(
    OperationStatusProvider,
    { queue },
    React.createElement(AppFrame, {
      mode: "view",
      density: "comfortable",
      theme,
      children: React.createElement("main", null, "Dashboard"),
    }),
  ));
}

const ROLE_PAINT_VARIABLES = [
  "shell", "command-bar", "panel", "editor", "dialog", "drawer", "menu", "status", "table", "chart-cell",
].map((role) => `--simex-role-${role}-background`);

function inlineVariable(html, variable) {
  const value = html.match(new RegExp(`${variable}:([^;\"]+)`))?.[1];
  assert.ok(value, `${variable} should be projected onto the rendered theme root`);
  return value;
}

function signatureTuple(html, roleVariable) {
  return [
    inlineVariable(html, roleVariable),
    inlineVariable(html, "--simex-style-role-border"),
    inlineVariable(html, "--simex-style-role-divider"),
    inlineVariable(html, "--simex-style-role-rail"),
    inlineVariable(html, "--simex-style-panel-shadow"),
    inlineVariable(html, "--simex-style-heading-font"),
  ].join(" | ");
}

test("approved dashboard styles expose distinct paint grammar without changing palette tokens", () => {
  const evidence = renderStyle("evidence-ledger");
  const humanist = renderStyle("humanist-standard");
  const signal = renderStyle("signal-instrument");

  assert.match(evidence, /--simex-style-heading-font:Georgia/);
  assert.match(evidence, /--simex-style-panel-radius:2px/);
  assert.match(evidence, /--simex-style-panel-shadow:none/);

  assert.match(humanist, /--simex-style-heading-font:Segoe UI Variable Display/);
  assert.match(humanist, /--simex-style-panel-radius:14px/);
  assert.match(humanist, /--simex-style-panel-shadow:0 8px 20px/);

  assert.match(signal, /--simex-style-heading-font:Bahnschrift/);
  assert.match(signal, /--simex-style-panel-radius:4px/);
  assert.match(signal, /--simex-style-transition-duration:95ms/);

  for (const html of [evidence, humanist, signal]) {
    assert.match(html, /--simex-surface-panel:#fffdf8/);
  }

  for (const variable of ROLE_PAINT_VARIABLES) {
    inlineVariable(evidence, variable);
    inlineVariable(humanist, variable);
    inlineVariable(signal, variable);
    assert.equal(new Set([
      signatureTuple(evidence, variable),
      signatureTuple(humanist, variable),
      signatureTuple(signal, variable),
    ]).size, 3, `${variable} should participate in distinct Ledger, Humanist, and Instrument signatures`);
  }
});

test("style grammar publishes numeric decorated-edge depths for geometry audits", () => {
  const evidence = renderStyle("evidence-ledger");
  const humanist = renderStyle("humanist-standard");
  const instrument = renderStyle("signal-instrument");

  for (const html of [evidence, humanist]) {
    assert.equal(inlineVariable(html, "--simex-style-edge-inline-start"), "0px");
    assert.equal(inlineVariable(html, "--simex-style-edge-block-start"), "0px");
  }
  assert.equal(inlineVariable(instrument, "--simex-style-edge-inline-start"), "3px");
  assert.equal(inlineVariable(instrument, "--simex-style-edge-block-start"), "1px");
});

test("Ledger reserves repeating ruling for explicit registers instead of semantic roles", () => {
  const ledger = renderStyle("evidence-ledger");
  const humanist = renderStyle("humanist-standard");
  const instrument = renderStyle("signal-instrument");

  for (const variable of ROLE_PAINT_VARIABLES) {
    assert.equal(inlineVariable(ledger, variable), "none", `${variable} should remain flat in Ledger`);
  }
  assert.match(inlineVariable(ledger, "--simex-material-ledger-register-background"), /^repeating-linear-gradient\(/);
  assert.equal(inlineVariable(humanist, "--simex-material-ledger-register-background"), "none");
  assert.equal(inlineVariable(instrument, "--simex-material-ledger-register-background"), "none");
});

test("standalone theme roots receive metadata and merged role variables through the pure projection contract", () => {
  const theme = resolveDashboardTheme({
    globalStyles: {
      dashboardStyle: "signal-instrument",
      dashboardColorProfile: "evidence-ledger/brighter-vellum",
      chartColorMode: "profile",
    },
    appearancePreference: "light",
  });
  const projection = createDashboardThemeProjection(theme);
  const props = dashboardThemeRootProps(projection, { visibility: "visible" });

  assert.equal(props["data-dashboard-style"], "signal-instrument");
  assert.equal(props["data-dashboard-color-profile"], "evidence-ledger/brighter-vellum");
  assert.equal(props.style.visibility, "visible");
  assert.equal(props.style["--simex-surface-panel"], "#fffdf8");
  for (const variable of ROLE_PAINT_VARIABLES) {
    assert.equal(props.style[variable], theme.styleVariables[variable]);
  }
  assert.equal(props.style["--simex-style-role-rail"], theme.styleVariables["--simex-style-role-rail"]);
});

test("fails when Humanist or Instrument shadows use raw style-specific colors", () => {
  for (const dashboardStyle of ["humanist-standard", "signal-instrument"]) {
    for (const appearance of ["light", "dark"]) {
      const html = renderStyle(dashboardStyle, appearance);
      for (const variable of ["--simex-style-panel-shadow", "--simex-style-shell-shadow"]) {
        const shadow = inlineVariable(html, variable);
        assert.doesNotMatch(shadow, /#[0-9a-f]{3,8}\b|rgba?\(/i, `${dashboardStyle} ${appearance} ${variable}`);
        assert.match(shadow, /color-mix\(/, `${dashboardStyle} ${appearance} ${variable}`);
        assert.match(shadow, /var\(--simex-/, `${dashboardStyle} ${appearance} ${variable}`);
      }
    }
  }
});

test("style elevation resolves independently for dark appearance", () => {
  const evidence = renderStyle("evidence-ledger", "dark");
  const humanist = renderStyle("humanist-standard", "dark");
  const signal = renderStyle("signal-instrument", "dark");

  assert.match(humanist, /--simex-style-panel-shadow:0 10px 24px/);
  assert.match(humanist, /--simex-style-shell-shadow:0 16px 38px color-mix\(in srgb, var\(--simex-surface-outer\) 48%, transparent\)/);
  assert.match(signal, /--simex-style-panel-shadow:0 1px 2px color-mix\(in srgb, var\(--simex-surface-outer\) 38%, transparent\)/);

  for (const html of [evidence, humanist, signal]) {
    assert.match(html, /--simex-surface-panel:#2b2922/);
  }
  for (const variable of ROLE_PAINT_VARIABLES) {
    assert.equal(new Set([
      signatureTuple(evidence, variable),
      signatureTuple(humanist, variable),
      signatureTuple(signal, variable),
    ]).size, 3, `${variable} should retain its distinct signature tuple in dark appearance`);
  }
});
