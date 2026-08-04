# Icon & Interaction Specification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one versioned icon-language catalogue drive the React application, the tracked visual atlas, and the tracked Icon & Interaction Specification, with focused drift validation.

**Architecture:** Promote the approved 108 SVG fragments into a framework-neutral glyph module and normalize the atlas’s 163 surface references into stable interaction metadata. React renders that authority through two small components; one deterministic Node script generates both human references and checks them for drift.

**Tech Stack:** ECMAScript modules, React 19, CSS custom properties, Node’s built-in test runner, Vite 6.

## Global Constraints

- Work only in `C:\Users\hekma\Documents\Projects\SimEx\.worktrees\simex-dashboard-v2\dashboard-refinement-round-2` on `codex/dashboard-refinement-round-2`.
- Do not read from or write to OneDrive or the retired SimEx roots.
- Version 3 is the only supported dashboard contract; add no version 2 migration or compatibility path.
- Preserve the approved 24 × 24 glyph geometry, default accent `#19D3C5`, 4.5:1 derived contrast variants, destructive red base, and semantic green selection state.
- Do not add a package dependency, runtime fetch, icon editor, per-icon accent, or per-chart accent.
- Do not run complete unit, integration, E2E, visual-regression, or build suites during implementation. Run only `node --test tests/iconSystem.test.js` and `pnpm.cmd icons:check` when directly relevant.
- Do not merge, push, deploy, or update Cloudflare without explicit approval.

---

### Task 1: Promote the approved glyph and interaction authorities

**Files:**
- Create: `src/iconography/iconGlyphs.js`
- Create: `src/iconography/iconCatalog.js`
- Create: `tests/iconSystem.test.js`
- Reference: `.superpowers/brainstorm/1309-1785817774/content/icon-language-atlas-v1.html:620`
- Reference: `src/charting/schemas/chartSchemaRegistry.js`

**Interfaces:**
- Produces: `ICON_GLYPHS`, `ICON_LANGUAGE_VERSION`, `ICON_TOKENS`, `ICON_STATES`, `INTERACTIONS`, `ATLAS_SURFACES`, `CHART_TYPE_GLYPHS`, `getIconGlyph(id)`, `getInteraction(id)`, `deriveIconAccentVariants(hex)`, and `validateIconCatalog()`.
- Consumes: registered chart type IDs from `chartSchemaRegistry.js`; chart labels remain owned by that registry.

- [ ] **Step 1: Add the focused authority tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { listChartSchemas } from "../src/charting/schemas/chartSchemaRegistry.js";
import { ICON_GLYPHS } from "../src/iconography/iconGlyphs.js";
import {
  ATLAS_SURFACES,
  CHART_TYPE_GLYPHS,
  INTERACTIONS,
  deriveIconAccentVariants,
  validateIconCatalog,
} from "../src/iconography/iconCatalog.js";

test("the icon catalogue is internally complete", () => {
  assert.deepEqual(validateIconCatalog(), []);
  assert.equal(Object.keys(ICON_GLYPHS).length, 108);
  assert.ok(Object.keys(INTERACTIONS).length >= 146);
  assert.ok(ATLAS_SURFACES.length >= 13);
});

test("chart pictograms cover the chart schema authority exactly", () => {
  assert.deepEqual(
    Object.keys(CHART_TYPE_GLYPHS).sort(),
    listChartSchemas().map(({ typeId }) => typeId).sort(),
  );
});

test("accent variants preserve the approved defaults", () => {
  assert.deepEqual(deriveIconAccentVariants("#19D3C5"), {
    base: "#19D3C5",
    onLight: "#0D746D",
    onDark: "#32DED1",
  });
});

const source = (relativePath) => readFile(
  new URL(`../${relativePath}`, import.meta.url),
  "utf8",
);
```

- [ ] **Step 2: Run the focused test and confirm the missing modules fail**

Run: `node --test tests/iconSystem.test.js`

Expected: FAIL because `src/iconography/iconGlyphs.js` and `iconCatalog.js` do not exist.

- [ ] **Step 3: Promote all approved glyphs without redesigning them**

Create `iconGlyphs.js` by mechanically copying every property of the approved atlas `P` object at lines 620–729. Export a frozen `ICON_GLYPHS` object and these accessors:

```js
export const ICON_GLYPHS = Object.freeze({
  // All 108 approved entries copied verbatim from the atlas P object.
});

export function getIconGlyph(id) {
  return ICON_GLYPHS[id] ?? ICON_GLYPHS.unknown;
}
```

Do not alter SVG path coordinates, classes, text, fill/stroke overrides, or the reset-arrow geometry during promotion.

- [ ] **Step 4: Normalize catalogue metadata**

Create stable dot-separated interaction IDs rather than using display names as keys. Each record uses this exact shape:

```js
{
  id: "fullscreen.open",
  surface: "panel",
  glyphId: "fullscreen",
  label: "Open chart fullscreen",
  tooltip: "Fullscreen",
  renderMode: "icon",
  tone: "standard",
  status: "live",
  confirmation: "none",
  note: "Hover-revealed lower-right action",
}
```

Normalize obsolete `tier: "label"` entries to `renderMode: "icon"`, normalize all destructive entries to `tone: "danger"`, and mark unimplemented transport scans and deferred text-to-icon conversions as `status: "planned"`. Use `status: "reference"` for retained analytical text/data.

Implement the approved accent derivation as a deterministic pure function. Invalid input returns the approved default variants rather than throwing in the renderer.

- [ ] **Step 5: Implement aggregated catalogue validation**

`validateIconCatalog()` returns an array of precise messages and checks duplicate IDs, glyph references, tooltip/accessibility copy, tone, surface membership, chart-type coverage, and the approved SVG tag/attribute vocabulary. Do not perform this validation during React render.

- [ ] **Step 6: Run the focused authority tests**

Run: `node --test tests/iconSystem.test.js`

Expected: PASS for the three authority tests.

- [ ] **Step 7: Commit the authority**

```powershell
git add src/iconography/iconGlyphs.js src/iconography/iconCatalog.js tests/iconSystem.test.js
git commit -m "feat: establish canonical icon catalogue"
```

---

### Task 2: Add canonical React icon primitives and visual states

**Files:**
- Create: `src/components/common/SimExIcon.jsx`
- Modify: `src/styles.css`
- Modify: `tests/iconSystem.test.js`

**Interfaces:**
- Consumes: `getIconGlyph(id)` and `getInteraction(id)` from Task 1.
- Produces: memoized `SimExIcon` and `IconControl` React components.

- [ ] **Step 1: Add focused rendering assertions**

```js
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IconControl, SimExIcon } from "../src/components/common/SimExIcon.jsx";

test("IconControl derives icon, label, tooltip, and danger tone from metadata", () => {
  const standard = renderToStaticMarkup(React.createElement(IconControl, {
    interactionId: "fullscreen.open",
  }));
  const danger = renderToStaticMarkup(React.createElement(IconControl, {
    interactionId: "chart.remove",
  }));
  assert.match(standard, /aria-label="Open chart fullscreen"/);
  assert.match(standard, /data-icon-tooltip="Fullscreen"/);
  assert.match(danger, /data-icon-tone="danger"/);
  assert.match(danger, /accent-/);
});

test("SimExIcon falls back deterministically for an unknown dynamic ID", () => {
  const html = renderToStaticMarkup(React.createElement(SimExIcon, {
    iconId: "not-registered",
    decorative: true,
  }));
  assert.match(html, /data-icon-id="unknown"/);
});
```

- [ ] **Step 2: Run the focused test and confirm the missing component fails**

Run: `node --test tests/iconSystem.test.js`

Expected: FAIL because `SimExIcon.jsx` does not exist.

- [ ] **Step 3: Implement the two components**

```jsx
export const SimExIcon = React.memo(function SimExIcon({
  iconId,
  decorative = true,
  label,
  size = 24,
  className = "",
}) {
  const resolvedId = ICON_GLYPHS[iconId] ? iconId : "unknown";
  return React.createElement("svg", {
    className: `simex-icon ${className}`.trim(),
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    "aria-hidden": decorative ? "true" : undefined,
    role: decorative ? undefined : "img",
    "aria-label": decorative ? undefined : label,
    "data-icon-id": resolvedId,
    dangerouslySetInnerHTML: { __html: getIconGlyph(resolvedId) },
  });
});
```

`IconControl` looks up the interaction, supplies `aria-label`, `data-icon-tooltip`, `data-icon-tone`, `aria-pressed`, and renders `SimExIcon`; it forwards standard button props and event handlers. Static registry strings are the only values passed to `dangerouslySetInnerHTML`.

- [ ] **Step 4: Add shared icon and tooltip CSS**

Define the six `--simex-icon-*` defaults on `:root`; define rounded 24 × 24 SVG stroke/fill rules; map `.accent-fill` and `.accent-stroke`; map danger and selected tones; add a visible focus ring; and implement a compact custom tooltip for hover and `:focus-visible`. Default tooltip placement is above the button, with a data-attribute override for below.

- [ ] **Step 5: Run the focused rendering tests**

Run: `node --test tests/iconSystem.test.js`

Expected: PASS for authority and component rendering.

- [ ] **Step 6: Commit the primitives**

```powershell
git add src/components/common/SimExIcon.jsx src/styles.css tests/iconSystem.test.js
git commit -m "feat: add canonical icon controls"
```

---

### Task 3: Wire the approved global accent into version 3

**Files:**
- Modify: `src/charting/config/dashboardConfigStructure.js`
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/styles.css`
- Modify: `tests/iconSystem.test.js`

**Interfaces:**
- Consumes: `deriveIconAccentVariants(hex)` from Task 1 and the existing `ColorField` component.
- Produces: optional version 3 `globalStyles.iconAccent` with default `#19D3C5`, live CSS variables, and one edit-mode picker.

- [ ] **Step 1: Add focused dashboard-accent assertions**

```js
test("version 3 global styles accept one icon accent and reject malformed values", async () => {
  const { validateDashboardStructure } = await import(
    "../src/charting/config/dashboardConfigStructure.js"
  );
  const dashboard = JSON.parse(await source("public/config/dashboard.json"));
  dashboard.globalStyles.iconAccent = "#19D3C5";
  assert.doesNotThrow(() => validateDashboardStructure(dashboard));
  dashboard.globalStyles.iconAccent = "teal";
  assert.throws(() => validateDashboardStructure(dashboard), /icon accent/i);
});
```

- [ ] **Step 2: Run the focused test and confirm strict-shape validation fails**

Run: `node --test tests/iconSystem.test.js`

Expected: FAIL because `iconAccent` is not admitted by `globalStyles`.

- [ ] **Step 3: Extend only the version 3 presentation structure**

Add `iconAccent` as an optional `globalStyles` field. Validate it with `/^#[0-9a-f]{6}$/i`. Do not add migration logic, per-chart overrides, or a new config version.

- [ ] **Step 4: Apply and edit the global accent**

In `DashboardRenderer`, derive variants once with `React.useMemo`, set the six custom properties on the `.app-shell` style object, and add `ColorField` under the existing global presentation controls. Its change handler updates only `globalStyles.iconAccent`; reset uses `#19D3C5`.

- [ ] **Step 5: Run the focused test**

Run: `node --test tests/iconSystem.test.js`

Expected: PASS, including the global-accent contract.

- [ ] **Step 6: Commit the accent contract**

```powershell
git add src/charting/config/dashboardConfigStructure.js src/components/DashboardRenderer.jsx src/styles.css tests/iconSystem.test.js
git commit -m "feat: persist dashboard icon accent"
```

---

### Task 4: Migrate live application icons to the catalogue

**Files:**
- Modify: `src/components/charts/ChartPanelActions.jsx`
- Modify: `src/components/FullscreenDisplay.jsx`
- Modify: `src/components/playback/PlaybackControls.jsx`
- Modify: `src/components/ColorField.jsx`
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/components/ChartPanel.jsx`
- Modify: `src/styles.css`
- Modify: `tests/iconSystem.test.js`

**Interfaces:**
- Consumes: `IconControl`, `SimExIcon`, interaction IDs, and existing event handlers.
- Produces: no component-behavior changes; only registry-backed visuals, metadata-derived tooltips/names, and selected-panel position glyphs.

- [ ] **Step 1: Add focused source and rendering checks**

Add tests that render chart-panel actions, fullscreen controls, and playback controls, then assert canonical `data-icon-id` values and the existing accessible labels. Scan application `.js`/`.jsx` sources and fail if `<svg` or `createElement("svg"` appears outside `src/components/common/SimExIcon.jsx`.

- [ ] **Step 2: Run the focused test and confirm existing inline SVG fails**

Run: `node --test tests/iconSystem.test.js`

Expected: FAIL, naming `ChartPanelActions.jsx`, `FullscreenDisplay.jsx`, and `ColorField.jsx`.

- [ ] **Step 3: Replace chart-panel and fullscreen local glyphs**

Use `IconControl` for source info, fullscreen open/add/remove selection, layout choices, reorder previous/next, close chart, and close all. Delete `InfoIcon`, `FullscreenIcon`, `FullscreenSelectedIcon`, and `LayoutIcon`. Pass the selected chart’s 1-based position from `DashboardRenderer` through `ChartPanel` so `fullscreen.select.1` through `.4` render the approved numbered glyphs.

- [ ] **Step 4: Replace playback transport wording with approved icon controls**

Use `playback.previous`, dynamic `playback.play`/`playback.pause`, `playback.next`, and dynamic `playback.open`/`playback.close`. Preserve the existing reducer calls, disabled rules, `aria-expanded`, and blocked-reason description. Playback group, time, speed, and current timestamp remain text/data controls.

- [ ] **Step 5: Replace the remaining application-owned glyph mechanisms in scope**

Use `SimExIcon` for the ColorField eyedropper and dashboard edit control. Delete `.edit-sliders-icon` geometry and Unicode `‹`, `›`, and `×` application glyphs that now have catalogue interactions. Do not change ECharts output or convert unrelated text controls.

- [ ] **Step 6: Run the focused test**

Run: `node --test tests/iconSystem.test.js`

Expected: PASS for canonical rendering, existing accessible names, and the inline-SVG scan.

- [ ] **Step 7: Commit the live migration**

```powershell
git add src/components src/styles.css tests/iconSystem.test.js
git commit -m "refactor: render live controls from icon catalogue"
```

---

### Task 5: Generate and validate the canonical references

**Files:**
- Create: `tools/iconography/icon-language-atlas.template.html`
- Create: `scripts/build-icon-reference.mjs`
- Create: `docs/icon-language-atlas.html` (generated)
- Create: `docs/icon-and-interaction-specification.md` (generated)
- Modify: `package.json`
- Modify: `tests/iconSystem.test.js`

**Interfaces:**
- Consumes: Task 1 catalogue and `chartSchemaRegistry`.
- Produces: deterministic `renderIconAtlas()`, `renderIconSpecification()`, `icons:build`, and `icons:check`.

- [ ] **Step 1: Add deterministic generation assertions**

```js
test("canonical icon references match deterministic generation", async () => {
  const { renderIconAtlas, renderIconSpecification } = await import(
    "../scripts/build-icon-reference.mjs"
  );
  assert.equal(await source("docs/icon-language-atlas.html"), renderIconAtlas());
  assert.equal(
    await source("docs/icon-and-interaction-specification.md"),
    renderIconSpecification(),
  );
});
```

- [ ] **Step 2: Run the focused test and confirm the generator is missing**

Run: `node --test tests/iconSystem.test.js`

Expected: FAIL because the generator and tracked artifacts do not exist.

- [ ] **Step 3: Promote the approved atlas shell into a template**

Copy the current atlas’s scoped CSS, semantic section markup, search, accent picker, state preview, and tooltip behavior into the tracked template. Remove its inline `P`, `sets`, token, and state authorities. Replace them with explicit generator markers for serialized catalogue data. Preserve the approved visual order and twelve refinement cards.

- [ ] **Step 4: Implement deterministic rendering and check mode**

The script exports both render functions. Direct execution writes both tracked files. `--check` compares in-memory strings to disk and exits non-zero with `Run pnpm.cmd icons:build` when stale. Do not emit timestamps, absolute paths, random IDs, or machine-specific line endings.

- [ ] **Step 5: Add package commands and the build drift gate**

```json
{
  "icons:build": "node scripts/build-icon-reference.mjs",
  "icons:check": "node scripts/build-icon-reference.mjs --check"
}
```

Prefix the existing `prebuild` command with `node scripts/build-icon-reference.mjs --check &&`. Do not add the check to `predev`.

- [ ] **Step 6: Generate the references**

Run: `pnpm.cmd icons:build`

Expected: writes version `1.0.0` Markdown and HTML from the catalogue.

- [ ] **Step 7: Run only the focused drift checks**

Run: `node --test tests/iconSystem.test.js`

Expected: PASS.

Run: `pnpm.cmd icons:check`

Expected: PASS without rewriting files.

- [ ] **Step 8: Commit the generated contract**

```powershell
git add tools/iconography/icon-language-atlas.template.html scripts/build-icon-reference.mjs docs/icon-language-atlas.html docs/icon-and-interaction-specification.md package.json tests/iconSystem.test.js
git commit -m "docs: generate canonical icon interaction reference"
```

---

### Task 6: Focused visual handoff

**Files:**
- Review: `docs/icon-language-atlas.html`
- Review: `docs/icon-and-interaction-specification.md`
- Review: `git diff 4fbbdb5..HEAD`

**Interfaces:**
- Consumes: completed Tasks 1–5.
- Produces: user-visible canonical atlas and concise implementation-status report.

- [ ] **Step 1: Inspect the generated atlas in the browser**

Verify the approved glyph refinements at normal and enlarged scale, accent changes on light/dark surfaces, hover and keyboard-focus tooltips, destructive red plus shared accent, numbered selected-panel states, search, and live/planned/reference badges.

- [ ] **Step 2: Review scope and working-tree integrity**

Run: `git status --short`

Expected: only the pre-existing `.planning/.continue-here.md` modification and `.planning/HANDOFF.json` deletion remain unstaged, with no OneDrive or retired-root paths in generated files.

- [ ] **Step 3: Present the canonical references**

Report the tracked HTML and Markdown paths, focused-check results, live migrated surfaces, intentionally planned conversions, and the fact that broad tests/build/E2E remain deferred until the user declares pre-merge readiness.
