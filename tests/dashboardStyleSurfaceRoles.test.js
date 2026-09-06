import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createServer } from "vite";

import { DASHBOARD_SURFACE_MANIFEST } from "./e2e/support/dashboard-surface-manifest.js";
import {
  DASHBOARD_OWNED_REGION_REGISTRY,
  DASHBOARD_REGION_ROLES,
} from "../src/theme/dashboardRegionRegistry.js";

const css = await readFile(new URL("../src/styles/dashboard-style-grammar.css", import.meta.url), "utf8");
const desktopWidthCss = await readFile(new URL("../src/styles/desktop-mode-gate.css", import.meta.url), "utf8");
const presentationCss = await readFile(new URL("../src/styles/presentation.css", import.meta.url), "utf8");
const mainCss = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

const REQUIRED_ROOTS = [
  ".app-frame",
  ".build-authoring-auxiliary",
  ".unit-orbit",
  ".operation-status-viewport",
  ".audience-theme-root",
  ".application-recovery",
  ".source-viewer-theme-root",
  ".chart-state-recovery-harness",
];

const rules = parseRules(css);

test("fails when a shared role lacks concrete selector coverage", () => {
  for (const role of DASHBOARD_REGION_ROLES) {
    const variable = `--simex-role-${role}-background`;
    const roleRules = rules.filter(({ declarations }) => (
      declarations.get("background-image")?.includes(`var(${variable})`)
    ));
    assert.ok(roleRules.length > 0, `${role} should consume ${variable}`);
  }
});

test("applies the Ledger register material through one shared table rule only", () => {
  const materialRules = rules.filter(({ declarations }) => (
    declarations.get("background-image") === "var(--simex-style-role-rail), var(--simex-material-ledger-register-background), var(--simex-role-table-background)"
  ));
  assert.equal(materialRules.length, 1, "one shared table rule should compose the register material");
  const selector = materialRules[0].selector;
  assert.match(selector, /\[data-dashboard-material="ledger-register"\]\[data-dashboard-surface-role="table"\]/);
  assert.equal(selector.includes(".chart-table-view"), false);
  assert.equal(selector.includes(".source-viewer-table-wrap"), false);
});

test("keeps registered region selectors and shared role CSS in bidirectional closure", () => {
  const themeScopeClasses = new Set([
    ".app-frame", ".build-authoring-auxiliary", ".unit-orbit", ".operation-status-viewport",
    ".audience-theme-root", ".application-recovery", ".source-viewer-theme-root",
  ]);

  for (const role of DASHBOARD_REGION_ROLES) {
    const variable = `--simex-role-${role}-background`;
    const roleRules = rules.filter(({ declarations }) => (
      declarations.get("background-image")?.includes(`var(${variable})`)
    ));
    const selectorText = roleRules.map(({ selector }) => selector).join("\n");
    const ownedSelectors = DASHBOARD_OWNED_REGION_REGISTRY
      .filter((region) => region.role === role)
      .flatMap((region) => [region.selector, ...(region.liveSelectors ?? [])]);

    for (const ownedSelector of ownedSelectors) {
      assert.match(
        selectorText,
        new RegExp(escapeRegExp(ownedSelector)),
        `${role} CSS should consume registered selector ${ownedSelector}`,
      );
    }

    const ownedConcreteTokens = new Set(ownedSelectors.flatMap(concreteOwnershipTokens));
    const usedConcreteTokens = new Set(roleRules.flatMap(({ selector }) => concreteOwnershipTokens(selector)));
    for (const token of usedConcreteTokens) {
      if (themeScopeClasses.has(token)) continue;
      assert.ok(
        ownedConcreteTokens.has(token),
        `${role} CSS selector ${token} must map back to an owned ${role} region`,
      );
    }
  }
});

test("Present controller content retains dense clearance from every decorated dock edge", () => {
  const presentationRules = parseRules(presentationCss);
  const dock = presentationRules.find(({ selector }) => selector === ".present-action-dock")?.declarations;
  const groups = presentationRules.find(({ selector }) => (
    selector.includes(".presentation-controller__source")
    && selector.includes(".presentation-controller__timeline")
    && selector.includes(".presentation-controller__output")
  ))?.declarations;

  assert.equal(dock?.get("padding"), "var(--simex-space-3, 8px)");
  assert.equal(groups?.get("padding"), "var(--simex-space-3, 8px)");
  assert.equal(groups?.get("box-sizing"), "border-box");
});

test("Present action dock has one owned command-bar paint boundary", () => {
  const commandBarRules = rules.filter(({ declarations }) => (
    declarations.get("background-image")?.includes("var(--simex-role-command-bar-background)")
  ));
  const selectorText = commandBarRules.map(({ selector }) => selector).join("\n");
  const presentDock = DASHBOARD_OWNED_REGION_REGISTRY.find(({ id }) => id === "present-action-dock");

  assert.match(selectorText, /\.present-action-dock/);
  assert.equal(selectorText.includes(".presentation-controller"), false);
  assert.deepEqual(presentDock?.liveSelectors ?? [], []);
});

test("chart headings keep a shared dense inset without padding the chart canvas", () => {
  const mainRules = parseRules(mainCss);
  const heading = mainRules.find(({ selector }) => (
    selector.includes(".chart-view-heading")
    && selector.includes(".collection-display-header")
  ))?.declarations;
  const frame = mainRules.find(({ selector }) => selector === ".chart-view-frame")?.declarations;

  assert.equal(heading?.get("padding"), "var(--simex-space-3, 8px)");
  assert.equal(frame?.has("padding"), false);
});

test("Dashboard Map branch guides stay centered on the dense utility caret", () => {
  const group = rules
    .filter(({ selector }) => selector === ".app-frame .dashboard-map-panel .build-tree-group")
    .at(-1)?.declarations;
  const parentGuide = rules
    .filter(({ selector }) => (
      selector === ".app-frame .dashboard-map-panel .build-tree-item-wrap[aria-expanded=\"true\"] > .build-tree-row::before"
    ))
    .at(-1)?.declarations;
  const childStem = rules
    .filter(({ selector }) => (
      selector === ".app-frame .dashboard-map-panel .build-tree-group > .build-tree-item-wrap::after"
    ))
    .at(-1)?.declarations;
  const childElbow = rules
    .filter(({ selector }) => (
      selector === ".app-frame .dashboard-map-panel .build-tree-group > .build-tree-item-wrap::before"
    ))
    .at(-1)?.declarations;

  assert.equal(group?.get("padding-left"), "24px");
  assert.equal(
    parentGuide?.get("left"),
    "calc((var(--simex-control-utility, 24px) / 2) + 4px)",
  );
  for (const guide of [childStem, childElbow]) {
    assert.equal(
      guide?.get("left"),
      "calc((var(--simex-control-utility, 24px) / 2) - 10px)",
    );
  }
  assert.equal(childElbow?.get("width"), "14px");
});

test("shared dialog roles use the panel contour instead of the shell contour", () => {
  const dialogRole = rules.find(({ declarations }) => (
    declarations.get("background-image")?.includes("var(--simex-role-dialog-background)")
  ))?.declarations;

  assert.equal(dialogRole?.get("border-radius"), "var(--simex-style-panel-radius)");
});

test("does not paint concrete drawers through competing panel or dialog roles", () => {
  const panelSelectors = rules
    .filter(({ declarations }) => declarations.get("background-image")?.includes("var(--simex-role-panel-background)"))
    .map(({ selector }) => selector)
    .join("\n");
  const dialogSelectors = rules
    .filter(({ declarations }) => declarations.get("background-image")?.includes("var(--simex-role-dialog-background)"))
    .map(({ selector }) => selector)
    .join("\n");

  assert.equal(panelSelectors.includes(".dashboard-map-panel"), false);
  assert.match(dialogSelectors, /\.dashboard-dialog:not\(\.right-side-drawer\)/);
});

test("rejects direct Ledger paper ruling outside the register material rule", () => {
  const directLedgerRuling = rules.filter(({ selector, declarations }) => (
    selector.includes('[data-dashboard-style="evidence-ledger"]')
    && /repeating-linear-gradient\(\s*to bottom/.test(declarations.get("background-image") ?? "")
  ));
  assert.deepEqual(directLedgerRuling, []);
});

test("fails when a standalone theme root receives only generic AppFrame styling", () => {
  const rootRules = rules.filter(({ declarations }) => (
    declarations.get("font-family") === "var(--simex-style-body-font)"
    && declarations.get("color") === "var(--simex-text-strong)"
  ));
  const selectorText = rootRules.map(({ selector }) => selector).join("\n");
  for (const root of REQUIRED_ROOTS) {
    assert.match(selectorText, new RegExp(escapeRegExp(root)), `${root} should receive the shared root grammar`);
  }
});

test("chart-state harness projects every dashboard style through an accurate standalone status root", async () => {
  const entry = DASHBOARD_SURFACE_MANIFEST.find(({ id }) => id === "chart-state-recovery-harness");
  assert.equal(entry?.surfaceRole, "status");
  assert.equal(
    entry?.root,
    '.chart-state-recovery-harness[data-dashboard-style][data-dashboard-surface-role="status"]',
  );

  const navigatedUrls = [];
  const waitedSelectors = [];
  const page = {
    goto: async (url) => navigatedUrls.push(url),
    addStyleTag: async () => {},
    locator: (selector) => ({
      waitFor: async () => waitedSelectors.push(selector),
    }),
  };
  const styleIds = ["evidence-ledger", "humanist-standard", "signal-instrument"];
  for (const dashboardStyle of styleIds) {
    await entry.setup({ page, dashboardStyle });
  }
  assert.deepEqual(navigatedUrls, styleIds.map((dashboardStyle) => (
    `http://127.0.0.1:4175/tests/e2e/chart-state-harness.html?dashboardStyle=${dashboardStyle}`
  )));
  assert.equal(waitedSelectors.filter((selector) => selector === entry.root).length, 3);

  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    appType: "custom",
    logLevel: "silent",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  try {
    let harnessModule = null;
    let loadError = null;
    try {
      harnessModule = await vite.ssrLoadModule("/tests/e2e/chart-state-harness.jsx");
    } catch (error) {
      loadError = error;
    }
    assert.equal(loadError, null, loadError?.stack);
    assert.equal(typeof harnessModule?.chartStateHarnessRootProps, "function");

    const signatures = styleIds.map((dashboardStyle) => {
      const props = harnessModule.chartStateHarnessRootProps(`?dashboardStyle=${dashboardStyle}`);
      assert.equal(props.className, "chart-state-recovery-harness");
      assert.equal(props["data-dashboard-style"], dashboardStyle);
      assert.equal(props["data-dashboard-surface-role"], "status");
      assert.ok(props.style["--simex-style-body-font"]);
      assert.ok(props.style["--simex-style-role-rail"]);
      assert.ok(props.style["--simex-role-status-background"]);
      return [
        props.style["--simex-style-body-font"],
        props.style["--simex-style-role-rail"],
        props.style["--simex-role-status-background"],
      ].join("|");
    });
    assert.equal(new Set(signatures).size, 3);

    const harnessEntry = await vite.moduleGraph.getModuleByUrl("/tests/e2e/chart-state-harness.jsx");
    const stylesheetUrls = [...(harnessEntry?.importedModules ?? [])]
      .map(({ url }) => url)
      .filter((url) => url.endsWith(".css"));
    assert.deepEqual(stylesheetUrls, [
      "/src/styles/tokens.css",
      "/src/styles/chart-data-state.css",
      "/src/styles/dashboard-style-grammar.css",
    ]);
  } finally {
    await vite.close();
  }
});

test("fails when a style-specific selector changes geometry", () => {
  const violations = [];
  for (const { selector, declarations } of rules) {
    if (!selector.includes("[data-dashboard-style=")) continue;
    for (const property of declarations.keys()) {
      if (property.startsWith("--")) continue;
      if (isLayoutProperty(property)) violations.push(`${selector.trim()} -> ${property}`);
    }
  }
  assert.deepEqual(violations, []);
});

test("classifies border shorthands, widths, and styles as geometry while allowing border colour paint", () => {
  for (const property of [
    "border",
    "border-top",
    "border-right",
    "border-bottom",
    "border-left",
    "border-block",
    "border-inline",
    "border-block-start",
    "border-block-end",
    "border-inline-start",
    "border-inline-end",
    "border-width",
    "border-top-width",
    "border-right-width",
    "border-bottom-width",
    "border-left-width",
    "border-block-width",
    "border-inline-width",
    "border-block-start-width",
    "border-block-end-width",
    "border-inline-start-width",
    "border-inline-end-width",
    "border-style",
    "border-top-style",
    "border-right-style",
    "border-bottom-style",
    "border-left-style",
    "border-block-style",
    "border-inline-style",
    "border-block-start-style",
    "border-block-end-style",
    "border-inline-start-style",
    "border-inline-end-style",
  ]) {
    assert.equal(isLayoutProperty(property), true, property);
  }
  for (const property of [
    "border-color",
    "border-top-color",
    "border-block-start-color",
    "border-radius",
  ]) {
    assert.equal(isLayoutProperty(property), false, property);
  }
});

test("fails when the standalone Source Viewer entry omits the shared grammar from its Vite module graph", async () => {
  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    appType: "custom",
    logLevel: "silent",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  try {
    await vite.transformRequest("/src/source-viewer/main.jsx");
    const entry = await vite.moduleGraph.getModuleByUrl("/src/source-viewer/main.jsx");
    const stylesheetUrls = [...(entry?.importedModules ?? [])]
      .map(({ url }) => url)
      .filter((url) => url.endsWith(".css"));
    assert.deepEqual(stylesheetUrls, [
      "/src/styles/fonts.css",
      "/src/styles/dashboard-style-grammar.css",
      "/src/source-viewer/sourceViewer.css",
    ]);
  } finally {
    await vite.close();
  }
});

test("desktop width advisory stays compact without hiding or repainting workspace surfaces", async () => {
  const noticeRules = parseRules(desktopWidthCss)
    .filter(({ selector }) => selector.includes(".desktop-width-notice"));
  assert.equal(noticeRules.length, 2);
  const baseNotice = noticeRules.find(({ selector }) => selector === ".desktop-width-notice")?.declarations;
  const narrowNotice = noticeRules.find(({ selector }) => selector.includes("> .desktop-width-notice"))?.declarations;
  assert.equal(baseNotice?.get("display"), "none");
  assert.equal(narrowNotice?.get("display"), "block");
  assert.equal(narrowNotice?.get("background-color"), "var(--simex-warning-soft)");
  assert.equal(narrowNotice?.get("font-size"), "0.75rem");
  assert.equal(narrowNotice?.get("line-height"), "1.2");
  assert.equal(narrowNotice?.get("margin"), "4px 8px");
  assert.equal(narrowNotice?.get("padding"), "3px 7px");
  assert.equal(narrowNotice?.get("width"), "fit-content");
  assert.equal(
    parseRules(desktopWidthCss).some(({ selector }) => (
      selector.includes(".build-mode-shell") || selector.includes(".present-workspace")
    )),
    false,
  );

  const vite = await createServer({
    root: process.cwd(),
    configFile: false,
    appType: "custom",
    logLevel: "silent",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true },
  });
  try {
    await vite.transformRequest("/src/main.jsx");
    const entry = await vite.moduleGraph.getModuleByUrl("/src/main.jsx");
    const stylesheetUrls = [...(entry?.importedModules ?? [])]
      .map(({ url }) => url)
      .filter((url) => url.endsWith(".css"));
    assert.ok(stylesheetUrls.indexOf("/src/styles/dashboard-style-grammar.css") >= 0);
    assert.ok(stylesheetUrls.indexOf("/src/styles/desktop-mode-gate.css") >= 0);
    assert.ok(
      stylesheetUrls.indexOf("/src/styles/dashboard-style-grammar.css")
        < stylesheetUrls.indexOf("/src/styles/desktop-mode-gate.css"),
      "desktop width advisory should exercise the real later-cascade boundary",
    );
  } finally {
    await vite.close();
  }
});

function parseRules(source) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector.trim(),
    declarations: new Map(body.split(";").flatMap((declaration) => {
      const colon = declaration.indexOf(":");
      if (colon < 0) return [];
      return [[declaration.slice(0, colon).trim().toLowerCase(), declaration.slice(colon + 1).trim()]];
    })),
  }));
}

function isLayoutProperty(property) {
  return /^(?:margin|padding)(?:-|$)/.test(property)
    || /^(?:gap|row-gap|column-gap)$/.test(property)
    || /^(?:width|height|min-width|min-height|max-width|max-height)$/.test(property)
    || /^(?:inline-size|block-size|min-inline-size|min-block-size|max-inline-size|max-block-size)$/.test(property)
    || /^(?:display|grid(?:-|$)|flex(?:-|$)|place-(?:content|items|self)|align-(?:content|items|self)|justify-(?:content|items|self))/.test(property)
    || /^(?:position|inset(?:-|$)|top|right|bottom|left|overflow(?:-|$)|transform)$/.test(property)
    || isBorderGeometryProperty(property);
}

function isBorderGeometryProperty(property) {
  return /^border(?:-(?:top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end))?$/.test(property)
    || /^border(?:-(?:top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end))?-(?:width|style)$/.test(property);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function concreteOwnershipTokens(selector) {
  return [
    ...(selector.match(/\.[a-z][a-z0-9_-]*/gi) ?? []),
    ...(selector.match(/\[(?:data-canonical-mode|data-right-side-drawer|data-dashboard-region)="[^"]+"\]/g) ?? []),
  ];
}
