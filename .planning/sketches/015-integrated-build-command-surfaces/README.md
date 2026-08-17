# Sketch 015 — Integrated Build Command Surfaces

**Status:** Approved
**Winner:** B — Context Shelf
**Selected direction:** B — Context Shelf

## Decision being made

How should the already-approved Build entry points and transient surfaces coexist in the Layered Command Crown without hiding the active target, confusing draft ownership, or changing dashboard geometry?

This sketch is an integration study. It **re-composes approved components without redesigning them**. Labels, responsibilities, settings, chart geometry, interaction patterns, and authored state remain owned by the sketches where they were approved. Only the orchestration of competing surfaces is variable here.

## Approved foundation

- The Layered Command Crown and shared product chrome remain the Build entry surface.
- Unit Orbit remains the selected-chart editor, including the approved Chart/Layout draft split and footprint selector.
- Proof Studio remains the proof/review surface used by chart creation workflows.
- Dashboard Look remains the transparent preview drawer; the dashboard is not dimmed while colors are evaluated.
- Page and Section structure authoring remains inline in the Build page. Section titles are renamed by clicking the title; Page tabs drag to reorder.
- Time Content remains the page-first library with attention-elevated Time Groups and three-column Scene rows.
- Scenario Passport and package/import resolution retain their approved direct-edit and persistent-panel behavior.
- Consequence dialogs retain priority when an action can remove, merge, move, or invalidate dependent content.
- The dashboard fixture, chart order, page structure, authored data, and canonical geometry are identical in all variants.

## Variants

### A — Replace and Reopen (rejected · preserved)

Opening a transient surface closes the currently open surface. Its unsaved local draft is retained, but the user returns through the surface's original Crown, chart, or library trigger.

- Lowest simultaneous visual load.
- Clear single-owner model.
- Repeated reopening makes cross-reference tasks slower.

### B — Context Shelf (approved winner)

Only one transient surface is active. When a compatible surface opens, the previous surface is parked as a named **Resume** chip in the Build strip. The chip preserves target, draft, scroll position, and last focused control. Closing the active surface resumes the parked surface exactly where the user left it.

- Preserves working context without overlapping editors.
- Makes draft ownership visible and reversible.
- Keeps the dashboard and selected chart readable.

### C — Activity Back-stack (rejected · preserved)

Every transient invocation pushes an item onto a visible activity trail. Close or Escape returns through the trail in reverse order, restoring each surface's target, draft, scroll position, and focus.

- Strong continuity for nested tasks.
- Most explicit history.
- Adds modal-like backtracking to Build and can make incidental exploration feel procedural.

## Shared fixture

All variants use the same Biomedical page and the same approved Build composition:

- Layered Command Crown with page navigation and Build entry points
- Inline page and section controls
- A selected `New ICU and hospital admissions` chart (`bio_admissions`) with Unit Orbit access
- Existing Chart and Layout drafts for the selected chart
- Dashboard Look preview
- Time Content page-first library
- Proof Studio chart-creation review
- Scenario Passport plus one import-resolution state
- A consequence dialog reached from a Section removal action

The fixture is intentionally dense enough to expose ownership and collision problems. It does not introduce new production features or placeholder controls merely to make the page feel complete.

## Draft and coexistence matrix

| Surface | Draft/position retained | May coexist visibly | Must take priority | Return contract |
|---|---|---|---|---|
| Inline Page/Section controls | Canonical Build state | Dashboard and one transient surface | Consequence dialog opened by the action | Focus returns to the invoking inline control |
| Unit Orbit | Selected chart, Chart/Layout draft, tab, scroll, last focus | Its approved Layout draft only; selected-chart clearance stays visible | Consequence dialog | Return to chart Orbit trigger or exact parked focus |
| Dashboard Look | Palette/profile preview and scroll | Dashboard at full color fidelity | Proof Studio, authoring flow, consequence dialog | Restore preview and originating Look trigger |
| Time Content | Page, Time Group/Scene selection, scroll | Dashboard | Proof Studio, authoring flow, consequence dialog | Restore selected library item and scroll |
| Scenario Passport/import resolution | Direct edits, selected package, resolution draft, scroll | Dashboard | Consequence dialog | Restore edited field or unresolved item |
| Proof Studio/chart authoring | Current creation step and proof state | Nothing except its own confirmation/consequence dialog | Proof Studio is exclusive | Return to the Crown trigger that opened the flow |
| Consequence dialog | Pending destructive choice | Its owning surface, visually subordinate | Always topmost | Cancel returns to the exact invoking control; confirm follows the approved destination |

Variant A retains the recorded state but exposes no parked affordance. Variant B exposes parked compatible work as one or more Resume chips. Variant C exposes the same state as an ordered trail. None permits two independent editors to compete for focus.

## Geometry contract

- At **1180 px and wider**, the transient command lane is right-aligned with a width of `clamp(380px, 28vw, 480px)` and a 16 px viewport gutter. It overlays unused page margin and never recalculates chart footprints or section widths.
- From **768–1179 px**, exactly one transient surface may be visible, sized to `min(440px, calc(100vw - 32px))` and inset 16 px from the right edge. Parked state remains available in variants B and C.
- Unit Orbit remains anchored to the selected chart and preserves its approved target-clearance behavior. When Orbit needs the transient lane, the lane yields; it does not shift or resize the chart.
- Consequence dialogs are centered over the owning surface and remain smaller than that surface. They do not become a second full-height panel.
- Resume chips or the activity trail live in the Build strip below the Crown, wrap rather than overflow, and do not become part of the production dashboard content.
- No transient surface changes canonical dashboard geometry, chart order, footprint, data, section layout, or scroll destination.

## Focus and dismissal contract

- Opening a surface moves focus to its heading or first actionable control and records the invoking trigger.
- Escape closes only the topmost consequence dialog first. A subsequent Escape closes the active surface.
- Cancel and Close restore focus to the exact invoking control when it still exists.
- Variant B Resume restores the parked surface's target, scroll position, active subview, and last focused control. Closing the active surface resumes the most recently parked compatible surface.
- Variant C Back restores the immediately preceding trail item with the same state and focus guarantees.
- Inline structure controls do not steal focus merely because a transient surface opens or closes.
- An exclusive authoring flow parks or replaces incompatible work according to the selected variant; it never leaves another editor keyboard-active behind it.

## Phone boundary

Below **768 px**, Build mode remains unsupported by the project-wide phone contract. The standard unsupported-mode notification banner is shown; detection does not automatically redirect, disable controls, or discard state, and this sketch does not claim a supported phone adaptation for the Crown, Unit Orbit, shelves, trails, or transient panels. View remains the only supported phone mode.

## Representative review exercise

Complete the same sequence in each variant:

1. Select `New ICU and hospital admissions`, open Unit Orbit, and change the local Chart draft without applying it.
2. Switch to the Layout draft, then open Dashboard Look and preview a palette while keeping the real dashboard colors visible.
3. Return to the pending chart work and verify the target, draft tab, values, scroll, and focus are intelligible.
4. Use an inline Section action and cancel its consequence dialog; verify focus returns to that action.
5. Open Time Content, select a Scene, then inspect Scenario Passport and its import-resolution state.
6. Enter Proof Studio and confirm the exclusive-flow rule is obvious; leave it and recover the preceding compatible work.
7. Repeat one close/Escape path and one explicit Resume/Reopen/Back path, according to the variant.

Evaluate:

- Can the user always name the active target and the owner of each unsaved draft?
- Is the selected chart still visible when its context matters?
- Can interrupted work be recovered without guessing which settings survived?
- Are exclusive authoring and destructive consequences unmistakably higher priority?
- Does the orchestration feel like Build rather than a new navigation system?

## Decision record

**Approved — B: Context Shelf.** Build keeps one unambiguous active transient owner while displaced compatible work becomes a named Resume chip in the Build strip. Target, draft, scroll position, subview, and last focused control remain intact; exclusive authoring and consequence dialogs still take priority.

Why it won:

- It preserves working context without allowing two editors to compete for focus or obscure the selected chart.
- Draft ownership stays visible and recoverable, while the canonical dashboard geometry remains unchanged.
- It supports wide-screen cross-reference work and degrades to one visible surface at tablet widths without losing parked state.

A is rejected because repeated reopening slows ordinary cross-reference work and makes a hidden retained draft easier to mistake for discarded work. Its simple single-owner rule remains useful for genuinely exclusive workflows. C is rejected because a general activity stack makes Build feel procedural and makes Close/Escape reveal behavior harder to predict. Its strict last-in-first-out rule remains appropriate for nested consequence dialogs.

## Architecture declaration

The artifact is a disposable, self-contained HTML/CSS/JavaScript prototype with fixture data and in-memory interaction state. It uses no production framework, persistence, API, routing, authentication, or generalized command-surface architecture. Accessibility cues and responsive boundaries are represented only deeply enough to evaluate this integration decision.

Approval of a variant selects an interaction composition for later planning. It is **not** a commitment to the prototype's code, component boundaries, data model, storage strategy, or implementation architecture.
