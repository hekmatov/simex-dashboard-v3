---
sketch: 006
name: scene-authoring
question: "How can Scene creation compress scope, frame selection, composition, and temporal settings into two stages while retaining familiar evidence and direct control?"
status: Approved
winner: "A — Balanced Twin Canvas"
tags: [build, scenes, two-stage, availability-ledger, twin-canvas, direct-manipulation, unit-orbit, temporal-authoring]
---

# Sketch 006: Scene authoring

## Design question

How can Scene creation compress scope, frame selection, composition, and temporal behavior into two stages without losing the proven availability evidence from Sketch 005 or the direct chart interactions from Sketch 002?

The user approved the **two-stage workflow** and selected **A — Balanced Twin Canvas**. B and C remain interactive as preserved alternatives. All variants use the same persistent Scene Draft panel, Stage 1 availability ledger, frame-source behavior, observation picker, direct chart movement, and Unit Orbit.

## How to view

Open `http://127.0.0.1:8765/.planning/sketches/006-scene-authoring/index.html?round=3-two-stage` while the local sketch server is running.

## User-approved two-stage workflow

### Persistent right panel — Scene draft

The Scene Draft panel remains visible in both stages and owns global Scene settings and validation.

1. **Page** is chosen first.
2. **Parent Time Group** is then chosen from groups available on that page.
3. Selecting a parent loads its maximum inclusive period; the builder may narrow that period but cannot exceed it.
4. **Time mode** chooses either **Calendar** or **Frame source observations**.
5. Calendar exposes the positive interval and day/month/year unit. Frame-source mode exposes the single source both in this panel and on each selected Stage 1 chart; both controls edit the same Scene state.
6. The parent Time Group’s temporal matching policy is authored in its **Set defaults** step. A side-panel dropdown can inherit or override it as the Scene default; Unit Orbit can still apply a chart-specific override above that.
7. Scene name, seconds per frame, validation, and save readiness remain visible without a separate review stage.

This ordering is intentional: page constrains parent groups; the parent constrains period and eligible charts; the time mode determines which frame controls become relevant.

### Stage 1 — Select charts and frames

The chart list reuses the approved Sketch 005 availability-ledger grammar:

- every eligible chart identifies its page and canonical footprint;
- chart and variable rows share aligned identity, period timeline, and observation-count columns;
- timelines show observation ticks over the selected Scene period;
- adding a chart moves the same chart record into **Selected for this Scene** above a thin divider;
- removing it returns the record to **Available from parent group**;
- selected membership has a prominent non-colour outline;
- in Frame-source mode, selected charts expose a mutually exclusive **Frame source** checkbox;
- only the Frame-source record becomes larger and exposes **All available frames** versus **Selected frames**; and
- Selected frames enables an **Observation list** button that opens a separate scrollable checklist modal containing every available source observation date.

Stage 1 can continue only when scope is valid, at least one chart is selected, and the active frame mode is complete.

### Stage 2 — Arrange and configure

Stage 2 always shows a mock **Scene View** canvas and a separate mock **Present** canvas. Both reuse the approved Build interaction grammar:

- drag a chart title onto another chart or a visible empty insertion target;
- deterministic reading-order reflow;
- Alt+Arrow, Alt+Home, Alt+End, and Unit Orbit movement buttons provide equivalent non-drag paths;
- clicking a chart title opens the chart-local Unit Orbit without treating the drag as a click;
- a chart-corner action adds a Scene chart to Present or removes a Present chart from Present; and
- Unit Orbit remains clear of the selected chart and edits only Scene-local properties.

Unit Orbit contains Scene View width in the shared **1–4 column** unit, temporal matching policy, Present inclusion, and board-specific move controls. Canonical dashboard order and footprint remain read-only.

Present accepts one to four selected Scene charts. Count-valid divider choices are visible in the Present canvas:

- one chart: Single;
- two charts: Vertical divider or Horizontal divider;
- three charts: Large left or Large top; and
- four charts: 2 × 2.

The complete valid Scene saves atomically from Stage 2. A simulated first failure retains the draft; retry commits one Scene. Dirty Close or mode change still requires Save, Discard, or Keep editing.

## Live variants

All variants share exactly the same state. Switching A/B/C preserves page, parent, period, time mode, membership, Frame source, explicit observations, Scene and Present order, widths, divider shape, matching policies, name, playback timing, dirty state, and active stage. Only the Stage 2 canvas composition changes.

### A — Balanced Twin Canvas · Approved winner

Scene View and Present sit side by side at equal prominence.

**Hypothesis:** direct equality makes composition differences easiest to compare and introduces no primary-canvas control.

**Risk:** each canvas is narrower, particularly beside the persistent Scene Draft panel.

### B — Primary + Companion · Rejected / preserved

One canvas receives the larger work area while the other remains continuously visible as a smaller companion. The builder may make Scene View or Present primary.

**Hypothesis:** the primary canvas gives direct manipulation and Unit Orbit more room while preserving cross-surface awareness.

**Risk:** the primary switch adds a small focus/state decision and may imply unequal authority.

**Why rejected:** the extra primary-canvas state and unequal emphasis do not improve comparison enough to justify another control.

### C — Stacked Twin Canvas · Rejected / preserved

Scene View and Present appear as two full-width canvases in one vertical Stage 2 flow.

**Hypothesis:** full-width canvases best preserve chart labels, four-column geometry, and insertion targets.

**Risk:** comparison and repeated editing require more vertical travel.

**Why rejected:** the vertical distance weakens the continuous Scene View/Present comparison that Stage 2 is meant to support.

## Deterministic fixture

- Dashboard: **Regional Respiratory Preparedness**
- Default page: **Executive surveillance**
- Default parent: **Winter response 2026**
- Dashboard timezone: **Europe/Berlin**
- Parent matching policy: **Interpolate**; initial Scene default: **Inherit parent**
- Parent period: **2026-01-01 through 2026-03-31**, inclusive
- Default Time mode: **Frame source observations**
- Initial Frame source: **Confirmed cases**
- Initial frame choice: four explicit observations
- Initial selected Scene charts: **Confirmed cases**, **Municipality outbreak map**, and **Hospital load**
- Initial Present composition: the same three charts using **Large left**
- Scene name: **March operational pressure briefing**
- Seconds per frame: **2.5**

Additional page and parent options demonstrate the dependency order and recompute eligible charts and maximum period. The complete Winter-response group contains the same six realistic charts and variable-level observation pressure used in prior rounds.

## Representative task

1. Confirm the right panel orders **Page → Parent Time Group → Period → Time mode**.
2. Change page and parent once; verify the parent's maximum period and eligible-chart list reload together.
3. Return to **Executive surveillance / Winter response 2026**, narrow the period, and verify chart and variable ticks/counts recompute on one aligned scale.
4. Add one available chart and remove one selected chart; confirm each complete record moves between regions.
5. In Frame-source mode, assign a selected chart as Frame source, compare All available with Selected frames, and use the Observation list checklist.
6. Switch briefly to Calendar, inspect interval controls, then restore Frame-source mode without losing compatible Scene membership.
7. Continue to Stage 2. Drag a title in Scene View to an empty insertion target and repeat the same logical move with a keyboard or Unit Orbit control.
8. Open Unit Orbit, change the chart's Scene width and temporal matching, then include or exclude it from Present.
9. Use two and three Present charts to compare count-valid divider shapes, and reorder Present independently from Scene View.
10. Inspect preserved B/C and return to approved A; verify the exact draft persists.
11. Exercise the simulated failed Save and successful retry.

## What to compare

- Whether equal, primary/companion, or stacked canvases best communicates that Scene View and Present are related but independently ordered compositions.
- Whether chart titles, four-column widths, divider shapes, and empty insertion targets remain large enough for confident direct manipulation.
- Whether Unit Orbit stays contextually attached to its selected chart without obscuring the selected panel or persistent Scene Draft controls.
- Whether B's additional primary switch earns its editing space.
- Whether C's larger canvases earn their added vertical travel.
- Whether the Scene Draft panel remains useful rather than visually competing with the active task.

## Shared constraints

- One atomic Scene draft owns every change; Unit Orbit has Done, not an independent Save.
- Scene membership, Scene View order/width, Present subset/order/layout, and canonical dashboard layout remain distinct.
- Frame-source candidates are the union of available timestamps across all plotted variables of the selected participating chart.
- All available persists the rule; Selected frames persists explicit timestamps.
- Calendar uses positive day/month/year intervals and retains mandatory start/end semantics.
- Temporal matching inherits the parent policy by default; the Scene may store a side-panel default override, and a chart-specific Unit Orbit override takes final precedence.
- Seconds per frame must be positive and finite.
- Build and Present remain unsupported at phone size; View is supported and the draft is retained.
- Visual style, palette, data, and saved dashboard geometry are not candidates in this sketch.

## Contract interpretation for Step 10

This user-approved round explicitly supersedes the **five separate Scene stages** in temporal contract §6 as an interaction structure. It does not remove their information or ownership:

- Choose scope and Generate frames move into the persistent Scene Draft panel plus Stage 1 ledger.
- Compose Scene remains Stage 2.
- Configure temporal behavior becomes chart-local Unit Orbit controls plus global playback timing in the Scene Draft panel.
- Name and review becomes continuous validation and summary in the Scene Draft panel, followed by atomic Save from Stage 2.

The normative contract should be codified later as a **two-stage Scene workflow with persistent global draft controls**, while retaining the same period containment, frame rules, matching semantics, Present constraints, validation, atomic save, dirty protection, and duplicate semantics. Duplicate Scene and exhaustive temporal outcome proof remain contract-fixed but are not re-exercised in this visual comparison.

## Responsive and accessibility boundary

Build authoring is evaluated at 768×1024, 1024×768, 1200×900, and 1440×900. At narrower supported widths the right panel may stack after the active stage and twin canvases may stack, but all facts and actions remain reachable without document-level horizontal overflow.

At 390×844, View is the only supported mode. Build and Present show the persistent unsupported-mode banner and preserve the draft.

Chart selection, Frame-source assignment, explicit observations, divider shapes, and variant state have text labels and native controls. Dragging has single-pointer buttons and keyboard alternatives. Observation selection uses a labelled modal and scrollable checklist. Focus remains visible, essential controls retain 44-pixel targets, and reduced motion removes non-essential transitions.

## Superseded evidence

Round one compared Progressive Scene Ledger, Twin Composition Canvases, and Temporal Storyboard Lanes. Round two reused the familiar ledger but compared Ledger → Active Board, Ledger + Workbench Split, and Ledger + Twin Proof Flow. Both rounds remain preserved in version history and informed the approved two-stage synthesis; neither is a live candidate.

## Winner or synthesis

**Approved — A: Balanced Twin Canvas.** Equal Scene View and Present proofs make their independent order and membership immediately comparable without adding a primary-canvas state or the vertical travel of stacked proofs. The familiar Stage 1 ledger, persistent Scene Draft controls, chart-corner Present actions, Build-style direct movement, and Unit Orbit remain the shared implementation direction.

## Relevant authority

- `docs/superpowers/specs/2026-08-12-temporal-authoring-chrono-design.md` — Scene ownership, period containment, frame rules, matching, Present constraints, persistence, and the five-stage structure superseded above for later codification.
- `.planning/sketches/002-contextual-panel-editing/README.md` — direct chart movement, empty insertion targets, Unit Orbit, and shared four-column sizing language.
- `.planning/sketches/004-chart-creation/README.md` — modal Staged Proof Studio shell and atomic authoring draft.
- `.planning/sketches/005-time-group-authoring/README.md` — approved aligned Availability Ledger, selection movement, evidence, and temporal density.
- `.planning/sketches/003-dashboard-visual-language/README.md` — approved visual language and colour portfolio.
- `.planning/sketches/MANIFEST.md` — sketch sequence, review status, and phone-support boundary.
