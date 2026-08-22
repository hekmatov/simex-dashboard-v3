import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sources = Object.freeze({
  renderer: "src/components/DashboardRenderer.jsx",
  view: "src/components/view/ViewShell.jsx",
  build: "src/components/build/BuildWorkspace.jsx",
  canvas: "src/components/dashboard/DashboardCanvas.jsx",
  tokens: "src/styles/tokens.css",
  grammar: "src/styles/dashboard-style-grammar.css",
  modes: "src/styles/modes.css",
});

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("View and Build route the same saved Page through the canonical renderer", async () => {
  const [renderer, view, build, canvas] = await Promise.all([
    source(sources.renderer),
    source(sources.view),
    source(sources.build),
    source(sources.canvas),
  ]);

  for (const [mode, shell] of [["View", view], ["Build", build]]) {
    assert.match(shell, /CanonicalDashboardFrame/,
      `${mode} must use the shared canonical Page frame`);
    assert.match(shell, /DashboardCanvas/,
      `${mode} must use the shared canonical dashboard canvas`);
    assert.match(shell, /activePage=\{activePage\}/,
      `${mode} must project the same saved Page`);
    assert.match(shell, /dashboard=\{dashboard\}/,
      `${mode} must project the same saved dashboard`);
  }

  assert.match(renderer, /<ViewShell[\s\S]*?activePage=\{activePage\}[\s\S]*?dashboard=\{dashboard\}/);
  assert.match(renderer, /<BuildWorkspace[\s\S]*?dashboard=\{dashboard\}[\s\S]*?activePage=\{activePage\}/);
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
