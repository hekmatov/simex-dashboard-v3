import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sources = Object.freeze({
  renderer: "src/components/DashboardRenderer.jsx",
  view: "src/components/view/ViewShell.jsx",
  build: "src/components/build/BuildWorkspace.jsx",
  modeWorkspace: "src/components/dashboard/DashboardModeWorkspace.jsx",
  canvas: "src/components/dashboard/DashboardCanvas.jsx",
  section: "src/components/dashboard/DashboardSection.jsx",
  tokens: "src/styles/tokens.css",
  grammar: "src/styles/dashboard-style-grammar.css",
  modes: "src/styles/modes.css",
  appFrame: "src/components/app-shell/AppFrame.jsx",
  rightDrawer: "src/components/common/RightSideDrawer.jsx",
  rightDrawerStyles: "src/styles/right-side-drawer.css",
  operationStatus: "src/components/app-shell/OperationStatusViewport.jsx",
});

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("View and Build route the same saved Page through one persistent canonical renderer", async () => {
  const [renderer, modeWorkspace, canvas, section] = await Promise.all([
    source(sources.renderer),
    source(sources.modeWorkspace),
    source(sources.canvas),
    source(sources.section),
  ]);

  assert.match(
    renderer,
    /<DashboardModeWorkspace[\s\S]*?activePage=\{renderingActivePage\}[\s\S]*?dashboard=\{renderingDashboard\}/,
  );
  assert.match(modeWorkspace, /<CanonicalDashboardFrame/);
  assert.match(modeWorkspace, /<DashboardCanvas/);
  assert.match(modeWorkspace, /mode=\{mode\}/);
  assert.match(modeWorkspace, /activePage=\{activePage\}/);
  assert.match(modeWorkspace, /dashboard=\{dashboard\}/);
  assert.match(canvas, /bodySections\.map/,
    "the canonical canvas preserves body order after lifting the attention strip");
  assert.match(canvas, /<DashboardSection[\s\S]*?section=\{section\}/,
    "the canonical canvas must delegate each saved section to its rendering owner");
  assert.match(section, /visiblePlacements\.map/,
    "the saved-section renderer must preserve saved panel order");
  assert.doesNotMatch(canvas, /\.sort\(/,
    "rendering must not reorder saved layout configuration");
  assert.doesNotMatch(section, /\.sort\(/,
    "saved-section rendering must not reorder saved layout configuration");
});

test("View and Build share one central canvas maximum and responsive token", async () => {
  const [tokens, grammar, modes] = await Promise.all([
    source(sources.tokens),
    source(sources.grammar),
    source(sources.modes),
  ]);

  assert.match(tokens, /--simex-canonical-canvas-max-width:\s*1392px;/);
  assert.match(
    grammar,
    /\.app-frame \.canonical-dashboard-frame\s*\{[\s\S]*?max-width:\s*var\(--simex-canonical-canvas-max-width\);/,
  );
  assert.doesNotMatch(
    modes,
    /margin-left:\s*max\(-[0-9]+px/,
    "opening Build authoring chrome must not shift the canonical canvas off-screen",
  );
  assert.match(modes, /max-width: calc\(var\(--simex-canonical-canvas-max-width\) \+ 580px\)/);
  assert.doesNotMatch(
    modes,
    /\.canonical-dashboard-frame\.build-workspace\s*\{[^{}]*top:\s*-2px/,
    "the superseded 768px coordinate compensation must not remain",
  );
});

test("Look, Map, More, and Audience share one measured crown-bottom drawer coordinate", async () => {
  const [appFrame, rightDrawer, rightDrawerStyles, modes, operationStatus] = await Promise.all([
    source(sources.appFrame),
    source(sources.rightDrawer),
    source(sources.rightDrawerStyles),
    source(sources.modes),
    source(sources.operationStatus),
  ]);

  assert.match(appFrame, /--right-side-drawer-top/);
  assert.match(appFrame, /rightSideDrawerTopFromCrown/);
  assert.match(rightDrawer, /data-right-side-drawer/);
  assert.match(rightDrawerStyles, /top:\s*var\(--right-side-drawer-top\)/);
  assert.match(
    rightDrawerStyles,
    /data-drawer-modality="dialog"[\s\S]*?z-index:\s*1600/,
    "dialog drawers must remain above interactive operation notices",
  );
  assert.match(
    rightDrawerStyles,
    /prefers-reduced-motion:\s*reduce[\s\S]*?animation:\s*none\s*!important[\s\S]*?transition:\s*none\s*!important/,
  );
  assert.match(operationStatus, /RIGHT_SIDE_DRAWER_SELECTOR/);
  assert.match(modes, /grid-template-columns: 220px minmax\(0, 1fr\) 280px/);
  assert.doesNotMatch(modes, /data-dashboard-map-open/);
});

test("Build rails stack below the desktop breakpoint", async () => {
  const modes = await source(sources.modes);
  assert.match(modes, /@media \(max-width: 1023px\)[\s\S]*grid-template-areas:\s*"header"\s*"structure"\s*"commands"\s*"canvas"\s*"properties"\s*"footer"/);
});

test("Dashboard Map branch guides follow the compact tree indent", async () => {
  const [grammar, modes] = await Promise.all([
    source(sources.grammar),
    source(sources.modes),
  ]);

  assert.match(modes, /padding-inline-start:\s*14px;/);
  assert.match(
    modes,
    /\.build-rail--structure \.build-tree-label\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/,
  );
  assert.match(
    modes,
    /\.build-rail--structure \.build-tree-group > \.build-tree-item-wrap::after\s*\{[\s\S]*?left:\s*calc\(\(var\(--simex-control-utility, 24px\) \/ 2\) - 14px\);/,
  );
  assert.match(
    modes,
    /\.build-rail--structure \.build-tree-group > \.build-tree-item-wrap::before\s*\{[\s\S]*?left:\s*calc\(\(var\(--simex-control-utility, 24px\) \/ 2\) - 14px\);[\s\S]*?width:\s*14px;/,
  );
  assert.match(
    modes,
    /\.build-rail--structure \.build-tree-item-wrap\[aria-expanded="true"\] > \.build-tree-row::before\s*\{[\s\S]*?left:\s*calc\(var\(--simex-control-utility, 24px\) \/ 2\);/,
  );
  assert.match(
    modes,
    /\.build-rail--structure \.build-tree-group > \.build-tree-item-wrap::before\s*\{[\s\S]*?height:\s*18px;/,
  );
  assert.match(
    modes,
    /\.build-rail--structure \.build-tree-group > \.build-tree-item-wrap:last-child::after\s*\{\s*height:\s*18px;/,
  );
  assert.match(
    modes,
    /\.build-rail--structure \.build-tree-group > \.build-tree-item-wrap\[data-build-node-kind="chart"\]::before\s*\{\s*width:\s*22px;/,
  );
});
