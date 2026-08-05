# Icon Geometry Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the seven approved icon geometries while retaining one canonical vector source for the application, atlas, and specification.

**Architecture:** Modify only the static 24×24 SVG fragments in `src/iconography/iconGlyphs.js`. Keep interaction IDs and rendering behavior unchanged, then regenerate both reference artifacts through the existing deterministic generator.

**Tech Stack:** Static SVG fragments, JavaScript metadata, dependency-free Node reference generator.

## Global Constraints

- Version 3 remains the only supported dashboard contract.
- Do not edit generated reference files directly.
- Do not add raster assets or a new SVG abstraction.
- Do not read or write OneDrive.
- Run only the focused deterministic icon drift check during active visual refinement.
- Do not push, merge, deploy, or update Cloudflare.

---

### Task 1: Correct the canonical glyph geometry

**Files:**
- Modify: `src/iconography/iconGlyphs.js`
- Regenerate: `docs/icon-language-atlas.html`
- Regenerate: `docs/icon-and-interaction-specification.md`

**Interfaces:**
- Consumes: the existing `ICON_GLYPHS` export and `pnpm.cmd icons:build` generator.
- Produces: unchanged glyph IDs with corrected SVG geometry and synchronized generated references.

- [ ] **Step 1: Replace only the requested SVG fragments**

Use consistent enlarged selected-panel text/check geometry across `selectPanel1` through `selectPanel4`, four equal 7×7 `enterMulti` squares, an accented save-notch and slot, a one-unit up/left delta-list content shift, an unobscured lower third map fold, a path-aligned re-rank head, and a conventional diagonal pipette with accent liquid/drop.

The geometry must preserve the existing 24×24 view box and use only the existing `accent-stroke` and `accent-fill` classes.

- [ ] **Step 2: Regenerate both canonical references**

Run:

```powershell
pnpm.cmd icons:build
```

Expected: `docs/icon-language-atlas.html` and `docs/icon-and-interaction-specification.md` are regenerated from the corrected registry.

- [ ] **Step 3: Verify deterministic reference alignment**

Run:

```powershell
pnpm.cmd icons:check
```

Expected: `Icon reference files are current.`

- [ ] **Step 4: Inspect the seven affected families**

Inspect the enlarged atlas samples for selected panels 1–4, enter multi-fullscreen, save changes, Delta List, chronological choropleth, re-rank now, and pick color from dashboard. Confirm quadrant occupancy, equal squares, optical centering, foreground/background separation, arrow-path continuity, and accent placement against the approved references.

- [ ] **Step 5: Commit the focused refinement**

Stage only the source fragment, generated atlas, generated specification, and this plan, then commit with:

```powershell
git commit -m "fix: refine icon geometry"
```
