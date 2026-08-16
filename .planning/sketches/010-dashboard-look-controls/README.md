---
sketch: 010
name: dashboard-look-controls
question: "How should the approved dashboard visual settings be placed and applied inside the Layered Command Crown?"
status: Approved
winner: "A — Contextual Visual Settings Drawer"
tags: [shell, settings, visual-style, palettes, appearance, preview]
---

# Sketch 010 — Dashboard look controls

## Decision boundary

This sketch decides only the placement and interaction model for the already-approved visual settings inside **A — Layered Command Crown**, the approved Sketch 009 shell. It does not reopen the three visual styles, 15 product palettes, Light/Dark/System appearance model, Profile/Standard chart-colour model, dashboard geometry, page structure, mode behavior, or any prior winner.

The external review rails in Sketches 003 and 009 were prototype instrumentation rather than product UI. This round places the approved settings in the product shell, makes their ownership and preview consequences explicit, and compares three containment patterns using one shared state model.

## Fixed ownership and portfolio

| Setting | Owner | Approved values | Commit boundary |
|---|---|---|---|
| Visual style | Dashboard | Evidence Ledger, Humanist Standard, Signal Instrument | **Set dashboard look** |
| Colour profile | Dashboard | One of the 15 approved namespaced profiles | **Set dashboard look** |
| Chart colors | Dashboard | Profile colors or Standard chart colors | **Set chart colors** |
| Appearance | User | Light, Dark, or System | **Set appearance** |

All candidates expose the complete approved profile portfolio:

- **Evidence Ledger:** Brighter Vellum, Ash Register, Cool Archive.
- **Humanist Standard:** Common Ground, Quiet Commons, Open Forum.
- **Signal Instrument:** Calibrated Steel, Quiet Telemetry, Amber Vector.
- **Portable utility profiles:** Prismatic Index, Chromatic Polarity, Luminance Ladder.
- **Accepted expansion profiles:** Sunrise — Reference faithful, Lakeside — Reference faithful, Monochrome Reserve.

**Original baseline** remains review-only evidence and never appears in these product controls. **Sunrise — Contrast tuned** and **Lakeside — Contrast tuned** were rejected and are likewise excluded.

## Shared interaction contract

All three candidates use the same saved values, preview values, dashboard fixture, active mode, page, time position, scroll positions, Build drafts, Chrono state, and Present session. Switching candidates changes containment only.

- Opening the control copies the saved values into one shared non-mutating preview state.
- Selecting a style previews its non-colour grammar while preserving the active namespaced palette.
- **Use [style] Signature** is the only style shortcut that deliberately changes the palette to that style's native Signature profile.
- Selecting a palette previews its surface/UI tokens and, under Profile colors, its chart-series tokens without changing provenance or style grammar.
- Profile colors and Standard chart colors affect only data marks and matching legend swatches.
- Light, Dark, and System remain user-owned. System resolves through the machine preference without becoming another palette or style.
- **Set dashboard look**, **Set chart colors**, and **Set appearance** commit only their named scopes. Setting one scope cannot overwrite either of the others.
- Cancel, Close, or root Escape abandons uncommitted preview values and restores the saved appearance without changing product state.
- Previewing or setting any value cannot change DOM structure, dashboard/page geometry, chart order or footprint, plot rectangles, data, interactions, focus target, scroll position, authoring drafts, Chrono state, or Present session.

## Candidates

### A — Contextual Visual Settings Drawer · Approved winner

A **Dashboard look** action in the dashboard/page row opens a non-resizing drawer over the right edge of the current product viewport. The current dashboard remains the live preview behind it at its exact preview colours: there is no visible scrim, tint, opacity change, or dimming layer. An invisible click-catcher covers the remaining product viewport so the drawer retains modal focus behavior and outside-click close; the drawer's edge rule and shadow alone distinguish the settings surface from the dashboard. The drawer separates **Dashboard look**, **Chart colors**, and **Personal appearance**, keeps saved-versus-preview truth visible, and holds the three scoped Set actions in a persistent footer.

**Hypothesis:** retaining the current mode and page as the dominant preview makes the consequences easiest to judge while keeping setting ownership explicit.

**Reject if:** the drawer obscures too much of the evidence being previewed, any overlay changes the dashboard's preview colours, the invisible click-catcher permits focus or pointer leakage, the edge/shadow is insufficient to distinguish the surface, it competes with Present's Live Sidecar, or it becomes too narrow for 15 named profiles and their provenance at supported tablet widths.

### B — Visual Studio Overlay · Rejected, preserved

The original concept called for the same shell action to open a large geometry-neutral studio with a profile catalogue and ownership ledger beside a dedicated current-surface preview. The reviewed implementation instead dims the real dashboard behind the overlay and does not provide that proposed internal live preview.

**Hypothesis:** a purpose-built comparison surface gives the complete portfolio, Light/Dark/System, chart-colour modes, saved state, and preview state the clearest side-by-side treatment.

**Decision:** rejected and preserved. Dimming the only live dashboard makes exact colour judgment harder, while the missing dedicated preview removes the compensating benefit claimed by the concept. The result creates more interruption without improving colour comparison.

### C — Summary Popover + Full Catalogue · Preserved, not selected

A compact summary control in the dashboard/page row opens a popover with saved-versus-preview values, the three styles, chart colours, appearance, scoped Set actions, and explicit Signature shortcuts. **Browse all 15 profiles** opens a larger catalogue layer without closing the shared preview session.

**Hypothesis:** frequent adjustments stay close to the crown while the complete profile catalogue appears only when requested.

**Reject if:** splitting controls across two layers hides provenance or commit scope, makes preview state difficult to track, or imposes repeated open/close travel during deliberate profile comparison.

## Representative task

1. Start in View with **Evidence Ledger**, **Brighter Vellum**, **Profile colors**, and **System** resolving to Light.
2. Open Dashboard look from the Layered Command Crown and identify the four saved ownership values before changing anything.
3. Preview **Humanist Standard** while keeping **Brighter Vellum**. Confirm the palette remains selected and only the style grammar changes.
4. Use **Use Humanist Standard Signature** and confirm that this explicit shortcut changes the preview palette to **Common Ground**.
5. Inspect all 15 product profiles with visible source provenance, then preview **Prismatic Index**.
6. Toggle Profile colors and Standard chart colors. Confirm only chart marks and their legend swatches change.
7. Preview Light, Dark, and System with both simulated machine preferences. Confirm appearance remains separate from style, palette, and chart colors.
8. Move through View, Build, and Present while the preview is open or suspended. Open Chrono and Unit Orbit once and confirm the shared product state and geometry remain unchanged.
9. Cancel the preview and confirm every saved value returns. Reopen, then use each scoped Set action once and confirm it changes only its named owner.
10. Repeat the core comparison at `1024×768` and `768×1024`; at `390×844`, confirm supported View and personal Light/Dark/System access without treating dashboard-owned look authoring as phone-accepted.

## What to compare

- Which containment model makes the real dashboard consequence easiest to judge?
- Does the containment preserve the dashboard's exact preview colours without a visible scrim or tint?
- Can a reviewer distinguish saved, previewed, and newly set values without relying on colour?
- Are dashboard-owned and user-owned settings unmistakably separate?
- Can all 15 profiles be scanned with their full names and source provenance at realistic density?
- Is preserving the active palette on a style switch obvious, and is the native Signature shortcut clearly deliberate?
- Are the three Set actions visibly scoped without suggesting a package-wide save?
- Does switching Profile/Standard chart colors leave UI, semantic status, and surface treatment unchanged?
- Does the control remain coherent in View, Build, and Present without competing with Chrono, Unit Orbit, or Live Sidecar?
- Does each candidate retain the Layered Command Crown's hierarchy and unchanged dashboard geometry?
- Does the chosen pattern remain understandable with keyboard, touch, long labels, Light/Dark/System, and reduced motion?

## Responsive and phone boundary

Review covers `1440×900`, `1200×900`, `1024×768`, and `768×1024`. A drawer, studio, popover, or catalogue layer may recompose internally, but every setting, provenance label, saved/preview distinction, and scoped Set action remains available without document-level horizontal overflow or a change to canonical dashboard geometry.

At `390×844`, View remains supported and personal Light/Dark/System remains accessible. Dashboard-owned style, profile, and Chart color authoring does not gain phone acceptance in this sketch; if the disposable prototype exposes those controls at phone width, they are best-effort only and cannot silently mutate or discard state. Build and Present remain unsupported at `<= 767px`; their persistent, non-dismissible notification stays above product chrome with **Switch to View**, and opening or resizing cannot discard preview or product state. Audience output remains unaffected and product-chrome-free.

## Accessibility and focus

- Every style, profile, chart-colour, and appearance choice has a visible text label and programmatic selected, previewed, and saved state.
- Palette swatches supplement names and provenance; colour alone never identifies a choice or consequence.
- Essential actions use at least 44-by-44 CSS-pixel targets and remain keyboard and touch operable.
- A modal, drawer, or catalogue layer contains focus only while open and restores focus to the invoking shell action when closed.
- Escape cancels the uncommitted preview and restores saved paint; it never commits or discards unrelated product work.
- Status changes and successful scoped Set actions are announced without moving focus unnecessarily.
- Long profile names, 200-percent text, visible focus, logical reading order, greyscale, and reduced motion retain every fact and action.

## Architecture fit

Each candidate remains compatible with the existing React, Vite, CSS, ECharts, AppFrame, ModeSwitcher, shared-state, and portal/dialog foundations. One shared preview object can layer over the saved dashboard style/profile/chart-colour state and the user appearance preference. Style and profile application remains token-driven paint over one semantic structure and renderer.

No candidate introduces a runtime-only remote dependency, new UI framework, forked chart renderer, Quorum change, production schema, or alternative dashboard state. This disposable sketch declares fit only; it does not select production components or persistence mechanisms.

## Low-risk tuning left after selection

- Exact drawer width, studio preview ratio, popover dimensions, catalogue column count, and internal sticky/scroll thresholds at each supported viewport.
- Final concise labels, confirmation duration, focus-ring token calibration, and reduced-motion transition timing.
- Production storage and authorization wiring, provided they preserve the approved ownership and explicit-setting boundaries.

No style, palette, chart-colour, appearance, geometry, or behavioral decision is reopened by this sketch.

## Decision status

**Approved — A: Contextual Visual Settings Drawer.** The transparent-scrim refinement preserves the real dashboard's exact preview colours: an invisible click-catcher retains modal focus and outside-click close, while the drawer edge and shadow distinguish the control surface without tinting or dimming the evidence being judged. B is rejected and preserved because it dims the actual dashboard without supplying the proposed dedicated internal live preview, adding interruption without improving colour judgment. C remains a preserved, non-selected alternative.

## Relevant approved inputs

- `.planning/sketches/003-dashboard-visual-language/README.md` — three approved style grammars, 15 product profiles, style/profile independence, Profile/Standard chart colors, Light/Dark/System, non-mutating preview, provenance, and scoped setting consequences.
- `.planning/sketches/009-shared-shell-and-product-chrome/README.md` — A: Layered Command Crown, final product/location/mode hierarchy, state continuity, exact phone boundary, and product-chrome ownership.
- `.planning/sketches/002-contextual-panel-editing/README.md` — View/Build geometry invariance, Unit Orbit, protected chrome, and independently owned authoring drafts.
- `.planning/sketches/007-view-chrono/README.md` — View-owned Chrono placements and session continuity.
- `.planning/sketches/008-present-controller/README.md` — Live Sidecar and passive, chrome-free Audience boundary.
