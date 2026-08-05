# Icon Visual Corrections Implementation Plan

> **For Codex:** Use `superpowers:executing-plans` to implement this plan one task at a time.

**Goal:** Correct the five rejected icon geometries in canonical metadata, visually verify them at production and enlarged sizes, and regenerate the atlas from that same metadata.

**Architecture:** Keep the existing inline 24×24 SVG-fragment system. Replace only the affected canonical fragments in `src/iconography/iconGlyphs.js`; generated documentation remains downstream output and must not be edited by hand.

**Tech Stack:** JavaScript SVG metadata, Node.js, Sharp raster rendering, existing icon generator and focused icon contract test.

---

### Task 1: Replace the rejected canonical glyph geometry

**Files:**
- Modify: `src/iconography/iconGlyphs.js`

1. Keep `selectPanel1` through `selectPanel4` as real text. Center each count at `x="8" y="12"` with `font-family:Inter,Segoe UI,sans-serif`, `font-size:10.5px`, and `font-weight:800`. Give all four the same inset accent check `m13.4 15.2 2.2 2.2 3-4.9` at `stroke-width="2.1"`, leaving visible clearance from the outer frame.
2. Close the save icon's accent upper rectangle with `M8 3.5h8M8 3.5V9h8V3.5M13 4.5v3`.
3. Use the clipped-map fragment `M12.12 5.04 9 4 4 6v14l5-2 6 2 5-2v-5.75`, plus dividers `M9 4v14M15 12.55V20`, followed by the existing foreground clock.
4. Use the visually accepted eyedropper fragments: solid bulb `M15.6 12.6 20.1 8.1A3 3 0 0 0 15.9 3.9l-4.5 4.5a3 3 0 0 0 4.2 4.2Z`; glass `m12 6.8 4 4-7.6 7.6-3.2.8.8-3.2z`; contained liquid `m12.7 11.6 1.7 1.7-5.9 4.6-1.7.5.5-1.7z`; and drop `M3.95 22.7c0-.9 1.25-2.1 1.25-2.1s1.25 1.2 1.25 2.1a1.25 1.25 0 1 1-2.5 0Z`.
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
