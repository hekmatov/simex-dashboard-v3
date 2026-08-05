# Icon Visual Corrections Implementation Plan

> **For Codex:** Use `superpowers:executing-plans` to implement this plan one task at a time.

**Goal:** Correct the five rejected icon geometries in canonical metadata, visually verify them at production and enlarged sizes, and regenerate the atlas from that same metadata.

**Architecture:** Keep the existing inline 24×24 SVG-fragment system. Replace only the affected canonical fragments in `src/iconography/iconGlyphs.js`; generated documentation remains downstream output and must not be edited by hand.

**Tech Stack:** JavaScript SVG metadata, Node.js, Sharp raster rendering, existing icon generator and focused icon contract test.

---

### Task 1: Replace the rejected canonical glyph geometry

**Files:**
- Modify: `src/iconography/iconGlyphs.js`

1. Replace `selectPanel1` through `selectPanel4` font text with deterministic stroke paths. Use common quadrant bounds, `stroke-width="2"`, and the shared full-quadrant check `m13 16.3 2.7 2.8 3.6-5.9` at `stroke-width="2.3"`.
2. Close the save icon's accent upper rectangle by including its top horizontal edge in the accent path.
3. Rebuild `chartMapTime` from the three-fold map, clipping surviving strokes at the clock circumference: top intersection `(12.12,5.04)`, center divider endpoint `(15,12.55)`, and right-edge endpoint `(20,12.25)`.
4. Replace the eyedropper with a solid rounded base-color bulb, tapered outlined glass, tapered contained accent liquid, and an accent drop centered beneath the tip.
5. Rotate the re-rank arrowhead 180 degrees in place by restoring `M20 6h-3v3`.

### Task 2: Perform rendered visual inspection

**Files:**
- Temporary only: `.superpowers/icon-visual-debug/*`

1. Render all corrected canonical fragments with the production `viewBox="0 0 24 24"`, stroke width, round caps/joins, and base/accent colors.
2. Inspect one contact sheet at large scale for geometry and a second at actual application size for legibility.
3. If any element is misaligned, adjust the canonical fragment and repeat rendering before regeneration.

### Task 3: Regenerate and perform focused checks

**Files:**
- Generated: icon atlas/reference outputs produced by the repository generator

1. Run `pnpm icons:build` to regenerate the atlas and specification from canonical metadata.
2. Run `node --test --test-name-pattern "requested icon corrections" tests/iconSystem.test.js`.
3. Run `pnpm icons:check` to verify generated-reference alignment.
4. Inspect the generated atlas visually and commit only the icon source, generated references, and planning artifacts. Do not run dashboard, build, integration, or E2E suites.
