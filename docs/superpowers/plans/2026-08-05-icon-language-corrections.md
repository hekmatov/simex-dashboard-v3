# Icon Language Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the requested icon geometry, accent derivation, atlas presentation, and concise live control treatments while preserving one catalogue as the shared authority.

**Architecture:** Keep the static 24×24 glyph registry and normalized interaction catalogue. Correct behavior at those sources, let the deterministic generator produce both references, and migrate only the two already-requested live editor actions plus the playback speed label. No parameterized SVG framework or unrelated icon migration is introduced.

**Tech Stack:** React element factories, dependency-free SVG fragments, Node test runner, deterministic Node reference generator, CSS custom properties.

## Global Constraints

- V3 only; do not add V2 compatibility.
- Preserve the pre-existing `.planning/.continue-here.md` and `.planning/HANDOFF.json` worktree changes.
- Do not read or write OneDrive.
- Run only the smallest focused tests during this visual refinement pass.
- Do not push, merge, deploy, or update Cloudflare.
- Generated reference files must never be edited directly.

---

### Task 1: Define the corrected contracts with focused failing tests

**Files:**
- Modify: `tests/iconSystem.test.js`
- Modify: `tests/chartAuthoringComponentsV3.test.js`
- Modify: `tests/playbackComponentsV3.test.js`

**Interfaces:**
- Consumes: `deriveIconAccentVariants(value)`, `getInteraction(id)`, `ICON_GLYPHS`, `renderIconAtlas()`, `EditSessionActions`, and `PlaybackControls`.
- Produces: focused regression expectations for every production change in Tasks 2 and 3.

- [ ] **Step 1: Add the catalogue and glyph regression assertions**

Add assertions equivalent to:

```js
assert.equal(deriveIconAccentVariants("#2E6BD3").onLight, "#2E6BD3");
assert.equal(deriveIconAccentVariants("#F4C542").onDark, "#F4C542");
assert.deepEqual(
  [1, 2, 3, 4].map((count) => getInteraction(`fullscreen.select.${count}`).glyphId),
  ["selectPanel1", "selectPanel2", "selectPanel3", "selectPanel4"],
);
for (const glyphId of ["selectPanel1", "selectPanel2", "selectPanel3", "selectPanel4"]) {
  assert.match(ICON_GLYPHS[glyphId], /accent-stroke/);
  assert.doesNotMatch(ICON_GLYPHS[glyphId], /success-fill|<circle/);
}
assert.equal(getInteraction("editor.save-changes").renderMode, "icon");
assert.equal(getInteraction("editor.reset-changes").renderMode, "icon");
assert.equal(getInteraction("panel.hold-ctrl-while-scrolling-to-zoom").glyphId, null);
assert.equal(getInteraction("playback.playback-speed").label, "1×");
assert.equal(getInteraction("playback.playback-speed").glyphId, null);
```

Assert that install, report issue, synchronized-time selection, close-all, and selection-count resolve to distinct new glyph IDs. Assert that generated accent token swatches use `var(--accent-base)`, `var(--accent-on-light)`, and `var(--accent-on-dark)`.

- [ ] **Step 2: Update the editor action component expectation**

Require the rendered editor action bar to contain `data-icon-control="editor.save-changes"` immediately followed by `data-icon-control="editor.reset-changes"`, with accessible labels but without visible `Save` or `Reset changes` button text. Keep confirmation-dialog text assertions unchanged.

- [ ] **Step 3: Update the playback speed expectation**

Require the speed select to retain `aria-label="Playback speed"`, expose `1×`, `2×`, and `3×` options, and hide the visible `Playback speed` label with the existing `visually-hidden` utility.

- [ ] **Step 4: Run the three focused tests and verify RED**

Run:

```powershell
node --test tests/iconSystem.test.js
node --test --test-name-pattern "save and reset|persistence is pending" tests/chartAuthoringComponentsV3.test.js
node --test --test-name-pattern "playback controls expose" tests/playbackComponentsV3.test.js
```

Expected: failures identify the stale swatches, mandatory color adjustment, old glyph assignments/geometries, text editor buttons, and visible playback-speed label.

### Task 2: Correct the canonical catalogue, glyphs, and generator

**Files:**
- Modify: `src/iconography/iconGlyphs.js`
- Modify: `src/iconography/iconCatalog.js`
- Modify: `scripts/build-icon-reference.mjs`

**Interfaces:**
- Consumes: the existing `ICON_GLYPHS`, `INTERACTIONS`, `ATLAS_SURFACES`, and render functions.
- Produces: distinct stable glyph IDs, literal icon/text presentation, live token swatches, and base-first accent derivation.

- [ ] **Step 1: Correct the selected-panel, direction, map-time, and eyedropper geometry**

Replace each selected-panel circle/white-check pair with:

```html
<path class="accent-stroke" d="m15.1 17 1.4 1.4 2.8-3"></path>
```

Rotate the periodic head within the same bounds using `M15.6 6.2V3.4h2.8`, and the re-rank head using `M20 6h-3v3`. Shorten the map to the left footprint, enlarge the clock without crossing the 24×24 view box, and replace the eyedropper with a conventional diagonal pipette silhouette plus accent sample detail.

- [ ] **Step 2: Add the distinct semantic glyphs**

Add stable glyph entries:

```js
install: `<rect x="4" y="4" width="16" height="15" rx="2"></rect><path d="M4 14h16"></path><path class="accent-stroke" d="M12 3v8m0 0-3-3m3 3 3-3"></path>`,
reportIssue: `<path d="M4 5h16v12H9l-4 3v-3H4z"></path><path class="accent-stroke" d="M12 8v4M12 15h.01"></path>`,
timeSelect: `<rect x="3.5" y="5" width="17" height="15" rx="2"></rect><path d="M3.5 9h17M8 3.5v3M16 3.5v3"></path><circle class="accent-fill" cx="15.5" cy="14.5" r="2.2"></circle>`,
closeAll: `<path d="m4 4 5 5m0-5L4 9m11-5 5 5m0-5-5 5M4 15l5 5m0-5-5 5"></path><path class="accent-stroke" d="m15 15 5 5m0-5-5 5"></path>`,
selectionCount: `<rect x="3" y="3" width="8" height="8" rx="1.2"></rect><rect x="13" y="3" width="8" height="8" rx="1.2"></rect><rect x="3" y="13" width="8" height="8" rx="1.2"></rect><rect x="13" y="13" width="8" height="8" rx="1.2"></rect><rect class="accent-fill" x="4.5" y="4.5" width="5" height="5" rx=".7"></rect><rect class="accent-fill" x="14.5" y="4.5" width="5" height="5" rx=".7"></rect><rect class="accent-fill" x="4.5" y="14.5" width="5" height="5" rx=".7"></rect>`,
```

Keep `open`, `time`, and `close` unchanged for their existing meanings.

- [ ] **Step 3: Correct interaction metadata**

Map the requested IDs to the new glyphs. Set save/reset to `renderMode: "icon"` and live status. Make the Ctrl hint and playback speed glyphless text entries. Set playback speed label to `1×`, tooltip to `Playback speed`, and note to `Runtime value uses {speed}×`. Set selection count to the `selectionCount` glyph while retaining its dynamic count label.

Update catalogue validation so `glyphId` is required and resolvable for icon-mode interactions, while a text-mode interaction may intentionally use `null`.

- [ ] **Step 4: Make atlas text mode genuinely text-only**

For `renderMode === "text"`, render a `.reference-value` containing only the visible label. Do not call `iconSvg`. Render the Glyph metadata field as an em dash when `glyphId` is null.

Bind the three mutable token swatches to live variables:

```html
style="--swatch:var(--accent-base)"
style="--swatch:var(--accent-on-light)"
style="--swatch:var(--accent-on-dark)"
```

Test the base color before entering the adjustment loop in both the application and generated-atlas derivation functions.

- [ ] **Step 5: Run `tests/iconSystem.test.js` and verify GREEN**

Run:

```powershell
node --test tests/iconSystem.test.js
```

Expected: all icon-system cases pass.

### Task 3: Align the requested live controls

**Files:**
- Modify: `src/components/chart-authoring/EditSessionActions.jsx`
- Modify: `src/components/playback/PlaybackControls.jsx`
- Modify: `src/styles.css` only if the existing shared icon styles do not size correctly in the editor action row.

**Interfaces:**
- Consumes: `IconControl`, `editor.save-changes`, `editor.reset-changes`, and the existing `LabeledSelect` helper.
- Produces: icon-only save/reset actions and a concise value-only playback speed selector with unchanged accessible names.

- [ ] **Step 1: Replace the live save/reset text buttons**

Import `IconControl`. Render `editor.save-changes` as a submit control and `editor.reset-changes` as a secondary button. Preserve adjacency, disabled conditions, callbacks, and conditional `Saving…` accessible copy. Leave Cancel, Remove chart, and confirmation-dialog actions as visible text.

- [ ] **Step 2: Hide only the playback-speed label**

Add a `labelClassName` option to `LabeledSelect` and pass `visually-hidden` for the speed selector. Keep `aria-label="Playback speed"` and the generated `1×`, `2×`, and `3×` option labels.

- [ ] **Step 3: Run the two focused component tests and verify GREEN**

Run:

```powershell
node --test --test-name-pattern "save and reset|persistence is pending" tests/chartAuthoringComponentsV3.test.js
node --test --test-name-pattern "playback controls expose" tests/playbackComponentsV3.test.js
```

Expected: the targeted cases pass with accessible icon controls and concise speed text.

### Task 4: Regenerate, inspect, and commit

**Files:**
- Regenerate: `docs/icon-language-atlas.html`
- Regenerate: `docs/icon-and-interaction-specification.md`

**Interfaces:**
- Consumes: the corrected registry, catalogue, and generator.
- Produces: canonical human references matching the application metadata byte-for-byte.

- [ ] **Step 1: Regenerate and check drift**

Run:

```powershell
node scripts/build-icon-reference.mjs
node scripts/build-icon-reference.mjs --check
```

Expected: both references regenerate and the check reports they are current.

- [ ] **Step 2: Run the complete focused icon and affected-component checks**

Run the three commands from Tasks 2 and 3 again and confirm zero failures. Run `git diff --check` only over the files in this plan.

- [ ] **Step 3: Inspect every affected atlas entry visually**

At normal browser zoom, inspect the token swatches, all four selected-panel glyphs, periodic rotation, re-rank, chronological choropleth, install, report issue, time selection, playback speed, close all, selection count, Ctrl hint, save/reset, and eyedropper. Confirm hover/focus tooltips for icon-only controls and no browser warnings/errors.

- [ ] **Step 4: Commit without publishing**

Stage only the files in this plan and commit:

```powershell
git commit -m "fix: refine canonical icon language"
```

Do not push, merge, deploy, or update Cloudflare.
