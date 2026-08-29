import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sources = Object.freeze({
  renderer: "src/components/DashboardRenderer.jsx",
  view: "src/components/view/ViewShell.jsx",
  build: "src/components/build/BuildWorkspace.jsx",
  modeWorkspace: "src/components/dashboard/DashboardModeWorkspace.jsx",
  canvas: "src/components/dashboard/DashboardCanvas.jsx",
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
  const [renderer, modeWorkspace, canvas] = await Promise.all([
    source(sources.renderer),
    source(sources.modeWorkspace),
    source(sources.canvas),
  ]);

  assert.match(renderer, /<DashboardModeWorkspace[\s\S]*?activePage=\{activePage\}[\s\S]*?dashboard=\{dashboard\}/);
  assert.match(modeWorkspace, /<CanonicalDashboardFrame/);
  assert.match(modeWorkspace, /<DashboardCanvas/);
  assert.match(modeWorkspace, /mode=\{mode\}/);
  assert.match(modeWorkspace, /activePage=\{activePage\}/);
  assert.match(modeWorkspace, /dashboard=\{dashboard\}/);
  assert.match(canvas, /\(activePage\.sections \?\? \[\]\)\.map/,
    "the canonical canvas must preserve saved section order");
  assert.match(canvas, /visiblePlacements\.map/,
    "the canonical canvas must preserve saved panel order");
  assert.doesNotMatch(canvas, /\.sort\(/,
    "rendering must not reorder saved layout configuration");
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
  assert.doesNotMatch(
    modes,
    /\.canonical-dashboard-frame\.build-workspace[^{}]*\{[^{}]*max-width:/,
    "Build must not define a mode-specific canvas maximum",
  );
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
  assert.doesNotMatch(
    modes,
    /\[data-dashboard-map-open="true"\][^{]*\{[^}]*\b(?:margin-left|width):/,
    "Dashboard Map must overlay without compressing or repositioning the canvas",
  );
  assert.doesNotMatch(
    modes,
    /\[data-dashboard-map-open="true"\][\s\S]*?\.build-command-groups\s*\{/,
    "Dashboard Map must not reflow the compact command bar",
  );
});
