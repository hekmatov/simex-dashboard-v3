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
  assert.match(canvas, /\(activePage\.sections \?\? \[\]\)\.map/,
    "the canonical canvas must preserve saved section order");
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
  assert.match(
    modes,
    /\.canonical-dashboard-frame\.build-workspace\[data-dashboard-map-open="true"\]:not\(\[data-build-static-authoring-open="true"\]\)\s*\{[\s\S]*?--simex-dashboard-map-reserved-width:\s*min\(300px,\s*24vw\);[\s\S]*?width:\s*min\(/,
    "the compact Dashboard Map should reserve a small desktop canvas column for side-by-side authoring",
  );
  assert.doesNotMatch(
    modes,
    /\[data-dashboard-map-open="true"\][\s\S]*?\.build-command-groups\s*\{/,
    "Dashboard Map must not reflow the compact command bar",
  );
});

test("Dashboard Map preserves its header and first tree row at narrow zoomed viewports", async () => {
  const modes = await source(sources.modes);
  const narrowMapRule = modes.match(
    /@media \(max-width: 899px\)\s*\{[\s\S]*?\.right-side-drawer\.dashboard-map-panel\s*\{(?<rule>[^}]*)\}/,
  );

  assert.ok(narrowMapRule, "the narrow Dashboard Map must have a drawer-specific geometry rule");
  assert.match(narrowMapRule.groups.rule, /left:\s*auto;/);
  assert.match(narrowMapRule.groups.rule, /right:\s*0;/);
  assert.match(narrowMapRule.groups.rule, /width:\s*min\(300px,\s*calc\(100vw - 24px\)\);/);
  assert.match(
    narrowMapRule.groups.rule,
    /top:\s*min\(var\(--right-side-drawer-top\),\s*calc\(100dvh - 220px\)\);/,
  );
});

test("Dashboard Map branch guides follow the compact tree indent", async () => {
  const [grammar, modes] = await Promise.all([
    source(sources.grammar),
    source(sources.modes),
  ]);

  assert.match(modes, /padding-inline-start:\s*14px;/);
  assert.match(
    modes,
    /\.dashboard-map-panel \.build-tree-label\s*\{[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;[\s\S]*?white-space:\s*nowrap;/,
  );
  assert.match(
    grammar,
    /\.dashboard-map-panel \.build-tree-group > \.build-tree-item-wrap::after\s*\{[\s\S]*?left:\s*calc\(\(var\(--simex-control-utility, 24px\) \/ 2\) - 10px\);/,
  );
  assert.match(
    grammar,
    /\.dashboard-map-panel \.build-tree-group > \.build-tree-item-wrap::before\s*\{[\s\S]*?left:\s*calc\(\(var\(--simex-control-utility, 24px\) \/ 2\) - 10px\);[\s\S]*?width:\s*14px;/,
  );
  assert.match(
    grammar,
    /\.dashboard-map-panel \.build-tree-item-wrap\[aria-expanded="true"\] > \.build-tree-row::before\s*\{[\s\S]*?left:\s*calc\(\(var\(--simex-control-utility, 24px\) \/ 2\) \+ 4px\);/,
  );
  assert.match(
    grammar,
    /\.dashboard-map-panel \.build-tree-group > \.build-tree-item-wrap::before\s*\{[\s\S]*?height:\s*18px;/,
  );
  assert.match(
    grammar,
    /\.dashboard-map-panel \.build-tree-group > \.build-tree-item-wrap:last-child::after\s*\{\s*height:\s*18px;/,
  );
  assert.match(
    grammar,
    /\.dashboard-map-panel \.build-tree-group > \.build-tree-item-wrap\[data-build-node-kind="chart"\]::before\s*\{\s*width:\s*22px;/,
  );
});
