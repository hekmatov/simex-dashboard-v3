---
sketch: 007
name: view-chrono
question: "Where should View Chrono's persistent playback controller live so that temporal exploration remains clear without becoming a fourth dashboard mode or changing saved dashboard geometry?"
status: Approved
winner: "Synthesis — user-selectable Lower Playback Deck / Chrono Mast"
tags: [view, chrono, playback, time-groups, scenes, responsive, evidence-ledger]
---

# Sketch 007: View Chrono

## Design question

Where should View Chrono's persistent playback controller live so that temporal exploration remains clear, reachable, and compatible with the dashboard while preserving View as the owning mode?

The approved synthesis retains both horizontal placements. The Lower Playback Deck is the default, and a user-facing button moves the same controller to the Chrono Mast or back without resetting any Chrono or dashboard state. Both placements use the same dashboard fixture, playback semantics, chart order, chart footprints, interaction vocabulary, responsive content, and approved Evidence Ledger visual language.

## How to view

Open `http://127.0.0.1:8765/.planning/sketches/007-view-chrono/index.html` while the local sketch server is running. Open Chrono, then use **Move to top** or **Move to bottom** inside the controller.

## Decision boundary

The sketch decides the persistent controller's anchor, orientation, compact hierarchy, expansion direction, and relationship to the scrollable dashboard.

It does **not** reconsider:

- Chrono ownership, time semantics, matching rules, or Scene authoring;
- the saved dashboard's content, chart order, four-column footprints, or grid geometry;
- the approved three-style visual-language portfolio or its palettes;
- whether View supports phone sizes; or
- production architecture, persistence, routing, temporal-engine implementation, or final autoplay edge-case policy.

Chrono is a temporary subview of **View**, not a fourth dashboard mode. Its controls are absent from ordinary View. Opening, closing, and switching variants must not mutate canonical dashboard content or geometry.

## Shared reconciled fixture

- Dashboard: **Regional Respiratory Preparedness**
- Page: **Executive surveillance**
- Ten canonical dashboard charts are shown in the same order and footprint in every variant.
- Time Group: **Winter response 2026**, from 2026-01-01 through 2026-03-31, with six charts and 17 derived frames.
- Scene: **March operational pressure briefing**, with **Confirmed cases**, **Municipality outbreak map**, and **Hospital load** in authored order and widths.
- Cross-page Scene: **Care capacity escalation**, which demonstrates explicit navigation to its owning page.
- Group-authored matching: **Interpolate**
- Authored playback interval: **2.5 seconds per frame**
- Initial trace mode: **Reveal**
- Initial visibility: **All page charts**
- Initial availability overlay: **Off**

The two retained candidates share one session state. Switching variants preserves the active Time Group or Scene, page, frame, visibility choice, matching override, trace mode, availability overlay, playback interval, settings disclosure, and paused/playing state.

## Fixed View Chrono behavior

- **Open Chrono** is a View-owned action. The session opens paused on the first valid frame unless a compatible prior Chrono frame can be restored.
- The selector can open a Time Group or Scene. Default Chrono offers **All page charts** and **Group only** while limiting playback effects to charts on the current page.
- A Scene selection navigates explicitly when its charts belong to another page. Scene charts appear as a focused block at the top in authored order and widths, separated from the remaining page charts; the arrangement is ephemeral.
- Persistent transport includes Previous, Play/Pause, Next, direct seek, current date, frame index, period context, and Exit Chrono.
- Expanded settings include positive seconds per frame, authored or temporary session matching, Reveal or Full timeline, chart visibility scope, and the optional availability overlay.
- Manual frame, selection, and relevant setting changes pause playback. For this disposable prototype, reaching the final frame pauses; that is an exercise assumption rather than a final product decision.
- Reveal progressively exposes the timeline through the current frame. Full timeline restores the complete x-range and marks the current frame without removing future data.
- Chart-local provenance remains visible through text and shape as well as colour, including concurrent, interpolated, latest, missing, and static outcomes.
- The availability overlay expresses contributing-chart density along the shared period and gives participating charts stable series identifiers with non-colour equivalents. Chart outlines appear only while the overlay is on.
- Zero-frame or Needs-attention selections block Play and provide a reason instead of silently changing the selection.
- Closing Chrono restores ordinary View while retaining the page, filters, selection, period, scroll context, and compatible session state.

## Approved placements

### A — Lower Playback Deck · Accepted default

A fixed horizontal deck sits at the bottom of the View viewport. The primary transport remains visible while settings expand upward. Extra end-of-page scroll clearance prevents focused content from becoming unreachable without changing chart footprints.

**Hypothesis:** a familiar media-controller location gives playback the clearest hierarchy while keeping the dashboard and View header visually primary.

**Primary risk:** the deck may obscure lower chart content or feel heavy at phone height if its compact and expanded states are not disciplined.

### B — Chrono Mast · Accepted alternative

A fixed horizontal band sits immediately below the View chrome. The transport remains visible while settings expand downward over the dashboard. Focused content uses scroll offsets so it can be brought below the mast without changing its canonical geometry.

**Hypothesis:** placing temporal context before the canvas makes the active date and source legible before the user scans changing charts.

**Primary risk:** the mast may dominate the page header, reduce dashboard calm, or imply that Chrono is a peer mode rather than a View subview.

## Representative review task

1. Open Chrono from ordinary View and confirm it starts paused without changing any chart footprint or saved order.
2. Play, pause, use Previous and Next, and seek directly to a frame while checking the date, frame index, and chart-local provenance.
3. Compare Reveal with Full timeline and toggle the availability overlay; confirm chart outlines appear only with the overlay.
4. Switch between All page charts and Group only, then select **March operational pressure briefing** and inspect its focused three-chart block.
5. Select **Care capacity escalation** and confirm the explicit page navigation and focused Scene block.
6. Change seconds per frame and apply a temporary matching override, then use the in-controller placement button in both directions and confirm the session remains intact.
7. Close and reopen Chrono; confirm ordinary View context and compatible Chrono state are preserved.
8. Inspect the compact controller and expanded settings at desktop, tablet, and 390 by 844 phone size.

## Accepted dual-placement behavior

- Whether the controller is immediately discoverable without reading as another dashboard mode.
- Whether date, source, transport, and seek position remain legible during chart inspection.
- Whether settings expansion obscures selected or focused content.
- Whether the dashboard remains visually primary and its canonical chart geometry appears unchanged.
- Whether playback, focused Scene navigation, and chart provenance can be understood without excessive eye travel.
- Whether the candidate remains practical at 390 by 844 without horizontal document overflow or unreachable controls.
- The lower deck remains the default; the Chrono Mast remains directly available through the same user-facing Move control.

## Responsive and accessibility boundary

View Chrono is supported at 390 by 844 as well as tablet and desktop sizes. The controller may recompose, but every control, label, status, and setting remains available. The dashboard must not gain document-level horizontal overflow, and controller clearance must not rewrite canonical chart footprints.

All transport and settings actions are keyboard and touch operable. Current frame, paused/playing state, active source, blocked playback, navigation, and overlay state have text equivalents and live announcements. Controls retain visible focus and meaningful accessible names; colour is never the sole source of provenance or availability meaning. Reduced motion removes non-essential animation without hiding state changes.

## Decision status

**Approved — dual-placement synthesis.** A — Lower Playback Deck is the default and B — Chrono Mast is an accepted alternative. The user moves the live controller between them through one contextual button; this changes no dashboard content, saved geometry, temporal setting, frame, or playback state. The prototype retains the placement for the current View session; long-term preference persistence remains an implementation detail.

## Relevant authority

- `docs/superpowers/specs/2026-08-12-temporal-authoring-chrono-design.md` — View Chrono ownership, derived frames, matching hierarchy, trace behavior, availability evidence, Scene focus, responsive support, and the governing temporal fixture.
- `docs/superpowers/specs/2026-08-12-three-mode-dashboard-ui-spec.md` — View ownership, dashboard geometry, state truth, progressive disclosure, accessibility, and responsive behavior.
- `.planning/sketches/003-dashboard-visual-language/README.md` — approved Evidence Ledger visual language, palette roles, status grammar, focus treatment, and long-content behavior.
- `.planning/sketches/005-time-group-authoring/README.md` — approved Availability Ledger and authored Time Group vocabulary.
- `.planning/sketches/006-scene-authoring/README.md` — approved two-stage Scene semantics and matching-override hierarchy.
- `.planning/sketches/MANIFEST.md` — sketch sequence, status register, and the View-only phone boundary.
