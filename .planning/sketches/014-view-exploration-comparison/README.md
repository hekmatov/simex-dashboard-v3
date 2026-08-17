---
sketch: 014
name: view-exploration-comparison
question: "How should ordinary View support source inspection, Chrono member elevation, and one-to-four-chart comparison without resembling Build or Present?"
status: Approved
winner: "D — Immersive View Canvas"
tags: [view, comparison, source, chrono, phone, consistency]
---

# Sketch 014: View Exploration and Comparison

## Design question

How should people move from an ordinary dashboard View into chart details, source evidence, Chrono member elevation, and a one-to-four-chart comparison while retaining Page, scroll, and focus context?

This is a containment and transition decision. Every candidate uses the same dashboard, chart renderer, data, selection rules, layout choices, evidence, Chrono state, and exit behavior. The variants do not propose different product capabilities.

## How to view

Open `http://127.0.0.1:8765/.planning/sketches/014-view-exploration-comparison/index.html?round=3-d-chrono` while the local sketch server is running.

## Fixed approved foundation

- **Layered Command Crown:** View remains selected throughout ordinary exploration, comparison, evidence inspection, and Chrono.
- **Canonical dashboard:** the approved ten-chart Biomedical fixture retains chart identity, order, footprints, data, renderer, and Evidence Ledger / Brighter Vellum Light paint.
- **Personal exploration:** comparison membership, order, layout, and the selected Chrono Time Group are session state. They never mutate the dashboard package, saved panel order, or canonical footprint.
- **Direct focus:** a chart can open alone without first entering multi-select.
- **Multi-select:** **Compare charts** starts with zero selections. Selection order is insertion order, visibly numbered, reversible, and capped at four. A fifth selection leaves state unchanged and announces `Maximum 4 charts allowed`.
- **Selection dock:** count, Enter, and Cancel remain available. Enter is disabled until two charts are selected; Escape cancels temporary selection.
- **Layouts:** one chart uses Solo; two use Side by side or Over-under; three use Top, Bottom, Left, or Right focus; four use 2 × 2.
- **Ordering:** every displayed chart has Move earlier and Move later. Boundary controls remain visible but disabled. Drag may supplement but never replace these controls.
- **Removal and exit:** removing the final chart exits comparison. **Exit comparison** and Escape close the full comparison.
- **Inspection:** the same read-only **Chart details** and **Source & freshness** records are available in ordinary View and comparison. No Build fields or author diagnostics appear.
- **Context restoration:** exit restores the originating Page, dashboard scroll, and a valid focus target without changing chart geometry.
- **Phone:** View, comparison, evidence, and Chrono remain supported at `390×844`; Build and Present support boundaries remain unchanged.

## Shared Chrono handoff

Within A–C, comparison and Chrono are distinct View lenses. **Open Chrono** while comparison is active explicitly suspends and retains the comparison; it does not clear membership, order, layout, or scroll. Chrono identifies the retained comparison, and **Exit Chrono** returns to it. The same live controller can move between the approved Chrono Mast and Lower Playback Deck without resetting frame, source, visibility, or play state.

D tests a different in-Page treatment. **Chrono View** reveals a Time Group selector immediately to its left and elevates only that group's Page-member charts into a new top section. Playback reuses the approved Sketch 007 controller rather than introducing a third design: the Lower Playback Deck is the default, and **Move to top** changes the same live controller into the Chrono Mast; the reciprocal button returns it to the bottom without changing source, frame, seconds-per-frame cadence, or playback. Its seeking rail is bounded by the Time Group start and end dates, observation-frame ticks occupy their actual temporal positions, and Previous, Play/Pause, Next, and a positive numeric **Seconds per frame** session override operate the selected frame. The fixture begins at the authored 2.5 seconds per frame; multiplier tiers are not part of the contract. A second date-only overlay begins at the top of the Page, may be dragged anywhere within the product viewport, and may be resized from its lower-right corner; its date type scales with the overlay so the date remains the dominant content at every size. Pressing **Chrono View** again stops playback, removes both controls, and restores original Page order.

## Variants

### A — View Focus Workspace · Rejected · Preserved

Comparison replaces only the dashboard document beneath the Crown. A labelled `View · Comparison` header owns ordered chart chips, layout, evidence entry, Chrono entry, and Exit. Canonical charts receive the remaining analytical space. Read-only evidence opens in a transparent, non-dimming right drawer.

**Hypothesis:** retaining the complete Crown while dedicating the document region to comparison gives the strongest combination of orientation, analytical room, Chrono compatibility, and phone adaptation.

**Reject if:** the workspace reads as a fourth product mode, evidence feels detached from the inspected chart, or returning to ordinary View loses the spatial origin.

### B — Fullscreen Evidence Gallery · Rejected · Preserved

The current modal fullscreen implementation is evolved into a protected comparison gallery. The existing selection dock leads into a focus-contained overlay with title/date context, layouts, ordered charts, source evidence, and close actions.

**Least-resistance rationale:** it maps directly to the existing `FullscreenDisplay`, `DisplayedChartGrid`, `ModalFocusScope`, layout state machine, and chart-action rail.

**Hypothesis:** strong isolation helps people compare charts without dashboard distraction and preserves the most familiar current implementation path.

**Reject if:** hiding the Crown and Page context causes disorientation, modal focus competes with Chrono, or phone evidence and chart controls become too layered.

### C — Contextual Comparison Lift · Rejected · Preserved

Selected charts elevate into a large in-flow comparison block above the unchanged dashboard. A sticky header owns layout and Exit, while a persistent read-only evidence ledger accompanies the comparison. The remaining dashboard stays reachable below with unchanged geometry and selection outlines.

**Hypothesis:** continuously showing the originating dashboard makes comparison feel like exploration of the current Page rather than a separate destination.

**Reject if:** the surface creates excessive vertical travel, charts become too narrow beside evidence, or the ledger resembles a Build inspector despite being read-only.

### D — Immersive View Canvas · Approved winner

D places **Chrono View** and **Compare charts** on the right side of the Page-navigation row, with **Compare charts** rightmost and no scenario/status fixture text beside them. Pressing **Chrono View** reveals the Time Group selector immediately to its left, elevates its Page members, and opens the approved Mast/Deck controller plus the date-only overlay. The controller preserves the selected group, frame, seconds-per-frame cadence, and play state when moved; entering focus or comparison pauses playback and temporarily removes both Chrono overlays so they cannot collide with comparison controls. Ordinary chart cards expose **Focus** and **Details** in a production-aligned bottom-right rail on hover, keyboard focus, and touch. Clicking **Focus** opens that chart alone across the full product viewport; holding it for 650 milliseconds starts comparison selection with that chart already selected.

Selection uses a compact bottom-centre floating panel showing only count, Cancel, and Compare. The fullscreen comparison shows only the selected charts plus a small top-centre panel containing valid layouts and Exit. Charts can be dragged to reorder; Alt+Arrow on a focused chart is the non-drag equivalent.

Fixture cleanup is intentional. Global Region, archived-alert, reset, and synchronized-time controls are removed because no corresponding product feature is configured; the prototype does not invent controls for completeness. The old Crown scope summary and scenario/status text beside the Page controls are also removed. Persistent source and current-through footers remain omitted; source/freshness is available on demand through **Details**, matching the current production action-rail pattern.

**Hypothesis:** direct fullscreen focus and minimal comparison chrome make chart inspection feel immediate while reusing the current product's fullscreen, long-hold, and action-rail concepts.

**Reject if:** hidden-until-focus actions are too difficult to discover, the compact selection panel does not provide enough membership context, drag order is unclear, or removing evidence/Chrono entry from fullscreen makes comparison too isolated.

## Representative fixture

Use the approved Biomedical page and compare, in this order:

1. `bio_confirmed_cases`
2. `bio_municipality_choropleth_animation`
3. `bio_hospital_load`
4. `bio_icu_hospital_capacity`

This combines line/columns, map, load, and capacity/target evidence. Inspection exposes chart definition, citation, current-through timestamp, status, owner, and update cadence. Representative source records include the Regional surveillance ledger and Hospital capacity feed.

## Representative exercise

1. In D ordinary View, confirm the right side of the Page row contains **Chrono View** and then the rightmost **Compare charts** button, with no scenario/status text and no global-filter panel.
2. Press **Chrono View**. Confirm the Time Group selector appears immediately to its left, Winter response member charts rise into a new top section, the approved Lower Playback Deck appears at the bottom, and a separate date-only overlay starts near the top of the Page.
3. Confirm the seek rail is labelled from 01 Jan to 31 Mar and contains all 17 available-frame ticks at their actual date positions. Seek to 15 March, use Previous and Next, set **Seconds per frame** to 1.5, start playback, and pause it; confirm the controller, Page date, and date overlay report the same frame.
4. Use **Move to top** and **Move to bottom** and confirm the same controller changes anchor without resetting the selected frame, seconds-per-frame cadence, or play state. Drag the date itself to move its overlay, then drag the lower-right corner to resize it; confirm the move and resize cursors appear over those respective targets and the date type grows or shrinks to fill the resized overlay. Also verify Arrow keys move the focused date and Shift+Arrow or the focused corner resizes it.
5. Select **Sentinel monitoring 2026** and verify only its Page-member charts occupy the elevated section, its 01 Feb–31 Mar nine-frame rail replaces the first, and playback is paused at the first frame. Press **Chrono View** again and confirm the selector, controller, date overlay, and elevated section disappear and original Page order returns.
6. Hover or keyboard-focus a chart. Open **Details**, close it, click **Focus**, and verify the chart fills the product viewport. Exit and confirm return to the invoking chart.
7. Hold another chart's **Focus** button. Confirm selection begins with that chart numbered first and the compact bottom-centre panel appears. Select the four representative charts and attempt a fifth.
8. Enter D comparison. Confirm only charts and the small layout/Exit panel remain. Change layout, drag charts into a different order, try Alt+Arrow, then Exit.
9. Repeat the essential D Chrono View, playback, focus, selection, comparison, drag, and exit path at `390×844`; confirm controls remain reachable, charts stack, and no document-level horizontal overflow appears.

## What to compare

- Which candidate most clearly communicates `View · Comparison` without creating another product mode?
- Is the origin Page and selected Chrono Time Group sufficiently clear without additional fixture chrome?
- Can chart evidence be inspected without obscuring the values being evaluated?
- Does D's member-chart elevation feel explicit and reversible without becoming a separate interface?
- Are layout, reorder, removal, and Exit controls easy to distinguish from Build authoring?
- Which structure recomposes most naturally on phone without sacrificing chart legibility?

## Accessibility, focus, and responsive boundary

- Interactive state uses native buttons, `aria-pressed` or explicit status text, visible focus, and non-colour numbering.
- Essential targets are at least 44 × 44 CSS pixels; no action depends on hover, holding, drag, or right-click.
- If modal, B and D contain focus and restore the connected trigger without scrolling. A and C preserve ordinary document semantics and return focus to the invoking chart/action.
- D reveals the hover rail through focus-within and permanently on non-hover devices. The explicit Page-row Compare action duplicates the hold shortcut; focused fullscreen charts support Alt+Arrow as the drag alternative. The date overlay uses a move cursor over the date and a resize cursor over its corner; Arrow keys move it, while Shift+Arrow or the focused corner resizes it, so pointer dragging is not the sole path.
- Escape closes only the innermost evidence or comparison lens; Chrono View changes only through its explicit toggle and never silently changes comparison state.
- Announcements cover selection order, the four-chart limit, layout, reorder, removal, Chrono View state and Time Group, comparison suspension/restoration, and exit.
- At `<=767px`, comparison uses one-column charts and evidence becomes a bounded sheet or in-flow disclosure. The page has no horizontal document overflow at 200-percent text.
- Reduced motion removes nonessential transitions without changing state meaning.

## Architecture fit

All candidates fit the existing React/Vite/CSS stack and reuse the canonical renderer, display controller, chart actions, focus scope, page state, and approved Crown/Chrono concepts. D most directly mirrors current `ChartPanelActions`, its 650-millisecond hold shortcut, and `FullscreenDisplay`; A and C test whether comparison should instead become a labelled View document or an in-flow analytical lift.

The prototype may fake data, source records, and time progression. It does not invent global filter controls or select production routing, raw-data access, persistence, renderer changes, or a new comparison schema.

## Decision status

**Approved — D: Immersive View Canvas.** D won because it keeps ordinary View direct: Page-level Chrono and comparison entry remain beside Page navigation; Focus becomes a true chart-only fullscreen action; comparison contains only the selected charts plus minimal layout/Exit chrome; and the Chrono controller reuses the already approved Lower Playback Deck/Chrono Mast with numeric seconds-per-frame cadence. It also removes invented global-filter and fixture-status controls instead of allowing prototype completeness to imply product scope.

A is rejected because its dedicated comparison document reads too much like an additional mode and adds persistent comparison chrome. B is rejected because its evidence-heavy modal hides useful Page orientation and layers more controls than the accepted chart-only comparison needs. C is rejected because the in-flow lift produces excess vertical travel and keeps unrelated dashboard content competing with the selected charts. All three remain interactive as preserved evidence. Retained insights are explicit View ownership and context restoration from A, fullscreen/focus containment from B, and reversible elevation from C, now expressed through D's smaller interaction model.

## Relevant approved inputs

- `.planning/sketches/003-dashboard-visual-language/README.md` — canonical fixture geometry and approved visual portfolio.
- `.planning/sketches/007-view-chrono/README.md` — View-owned Chrono, Lower Playback Deck, and movable Chrono Mast.
- `.planning/sketches/009-shared-shell-and-product-chrome/README.md` — Layered Command Crown and phone support boundary.
- `.planning/sketches/010-dashboard-look-controls/README.md` — transparent contextual drawer principle.
- `docs/superpowers/specs/2026-08-12-three-mode-dashboard-ui-spec.md` — View ownership and canonical renderer/data constraints.
- `docs/superpowers/specs/2026-08-12-temporal-authoring-chrono-design.md` — Chrono scope, retention, and phone behavior.
