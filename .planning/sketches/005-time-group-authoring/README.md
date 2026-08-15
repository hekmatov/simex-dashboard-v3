---
sketch: 005
name: time-group-authoring
question: "How should temporal availability and membership remain understandable at realistic density?"
status: Approved
winner: "A — Availability Ledger"
tags: [build, time-groups, temporal-availability, authoring, progressive-disclosure]
---

# Sketch 005: Time Group authoring

## Design question

How should a builder understand realistic per-chart and per-variable temporal availability, choose Time Group members, and resolve an unsupported member without becoming overwhelmed?

Round one decides one primary axis only: **how Stage 2 distributes and discloses temporal evidence**. The four-stage workflow, selected and Needs attention regions, matching semantics, frame derivation, validation, save, and duplicate behavior are contract-fixed simulations and are not being reopened.

## How to view

Open `http://127.0.0.1:8765/.planning/sketches/005-time-group-authoring/index.html` while the local sketch server is running.

## Scope

### In

- The visual organization of chart- and variable-level availability in **Choose charts**.
- The comparative legibility of full-data earliest/latest dates, in-period observation-date counts, and availability ticks at realistic density.
- The relationship between membership selection, the separated selected region, the Needs attention region, and the remaining eligible charts.
- Progressive disclosure, scanning, cross-chart comparison, focus continuity, and long-content behavior in Stage 2.
- Supported authoring adaptation at 768 by 1024, 1024 by 768, 1200 by 900, and 1440 by 900.
- The approved unsupported-phone Build notification boundary.

### Out

- Reopening the Time Group object, four stages, matching policies, availability facts, selection behavior, fallback requirements, derived Default Chrono ledger, atomic save, duplicate semantics, or dirty-draft protection.
- Scene creation, View Chrono, Present, Audience, chart creation, Unit Orbit, and canonical dashboard layout.
- Production routes, components, state, schemas, migrations, tests, temporal-engine changes, data plumbing, or persistence.
- Authentication, settings, onboarding, real package import/export, Quorum changes, or an implementation plan.

## Fixed authoring shell and visual language

All variants inherit **A — Staged Proof Studio**, the approved Sketch 004 direction. The Time Group draft therefore appears in the same large, geometry-neutral Build overlay with a stable stage navigator, one scrollable stage body, explicit draft status, and a clear return to the unchanged dashboard. The outer authoring surface is fixed and is not a candidate in this round.

The sketch also inherits the approved Sketch 003 visual-language system: institutional surface hierarchy, control and focus treatment, semantic state separation, Light/Dark-capable tokens, non-colour status cues, long-content discipline, and reduced-motion behavior. This sketch does not compare styles or palettes and does not alter the approved three-style, 15-palette portfolio.

## Deterministic TEMP-FIX synthesis

`TEMP-FIX-C01` through `TEMP-FIX-C07` are deterministic Sketch 005 synthesis IDs, not additional normative contract fixtures. Together they materialize the relevant requirements from `TEMP-FIX-01`, `TEMP-FIX-02`, `TEMP-FIX-03`, `TEMP-FIX-10`, and `TEMP-FIX-14`.

The dashboard timezone is **Europe/Berlin**. The same seven eligible charts, variables, memberships, dates, counts, and corrections appear in every variant.

| ID | Page / section | Chart and variables | Full effective range | In-period evidence |
|---|---|---|---|---|
| `TEMP-FIX-C01` | National overview / Health-system pressure | **Emergency department occupancy, staffed critical-care capacity, and medically fit discharge backlog** — adult occupancy, paediatric occupancy, staffed beds | 2024-01-01 to 2026-05-31 | 31 initial / 17 final daily dates |
| `TEMP-FIX-C02` | National overview / Emergency response | **Priority-one ambulance dispatch-to-arrival time by response district and hour of day** — median and P90 | 2025-07-01 to 2026-06-30 | 744 initial / 408 final hourly dates; already in **May Operational Tempo** and **Executive Watch** |
| `TEMP-FIX-C03` | Critical services / Infrastructure continuity | **Operating status of hospitals relying on backup generation and verified fuel resupply** — facility operating state and fuel-assurance band | 2025-11-03 to 2026-05-30 | 8 initial / 4 final dates; categorical; one corrected duplicate; Interpolate unsupported |
| `TEMP-FIX-C04` | Critical services / Clinical supplies | **Days of essential medicine stock remaining across emergency, intensive-care, and surgical services** — emergency, intensive-care, and surgical stock days | 2025-09-01 to 2026-05-31 | 29 / 31 initial and 16 / 17 final variable dates; null observations remain absent from ticks and counts |
| `TEMP-FIX-C05` | Critical services / Essential treatment | **Dialysis service continuity at facilities isolated by transport or communications disruption** — delivered sessions and planned capacity | 2026-02-14 to 2026-05-09 | Only 2026-05-02 and 2026-05-09; selected initially, then Needs attention after the period starts on 2026-05-15 |
| `TEMP-FIX-C06` | Population protection / Temporary accommodation | **Temporary accommodation occupancy by municipality, age group, and accessibility-support requirement** — residents housed and unfilled supported placements | 2025-10-01 to 2026-06-14 | 27 initial / 15 final dates; already in **Displacement Monitoring** |
| `TEMP-FIX-C07` | Population protection / Public warning | **Public warning acknowledgement across SMS, radio, siren, and community liaison channels** — SMS, radio, siren, and community-liaison measures | 2026-01-05 to 2026-05-31 | 20 initial / 11 final irregular dates |

Counts are unique valid observation dates after saved filters, transformations, grouping, and aggregation. Nulls and corrected duplicate timestamps are disclosed but do not inflate availability. Every variable retains its own full-data boundaries, in-period count, and tick strip.

## Exact representative task

1. Open **Create Time Group** in Build. Confirm the saved dashboard remains unchanged while the local draft is open.
2. In **Choose period**, enter a reversed start/end pair and encounter the prerequisite message. Correct it to the inclusive period **2026-05-01 through 2026-05-31** in **Europe/Berlin**.
3. Enter **Choose charts** and inspect all seven long chart identities, their page and section, every plotted variable's full-data earliest/latest dates, in-period counts, and availability ticks.
4. Inspect `TEMP-FIX-C02` and `TEMP-FIX-C06` memberships in other groups and confirm those memberships do not block selection.
5. Select `TEMP-FIX-C01`, `C03`, `C04`, `C05`, and `C06`; deselect and reselect one member. Confirm selected charts move to the separated selected region rather than being duplicated or silently reordered.
6. Change the period start to **2026-05-15**. Confirm all availability recomputes and selected `TEMP-FIX-C05` moves intact to **Needs attention** because it now has zero in-period observations.
7. Inspect `TEMP-FIX-C05`'s reason, then explicitly remove it. No selected chart is silently deselected by recomputation.
8. In **Set defaults**, choose **Interpolate** and enter **2.5 seconds per frame**. Encounter the blocking categorical-member problem on `TEMP-FIX-C03`, inspect the affected variables and explanation, and set that member's fallback to **Snap to Latest**.
9. Compare the other exact matching choices—**Concurrent only**, **Snap to Latest**, and **Snap to Closest**—without changing the chosen fixture outcome, then return the group default to **Interpolate**.
10. In **Name and review**, enter **May 15–31 Multi-agency Readiness Review** and inspect period/timezone, four members and affected pages, derived Default Chrono frame count, gaps, group and member matching policies, and 2.5 seconds per frame.
11. Follow a review repair link back to its owning stage, return to Review without losing compatible work, save, and observe one deterministic atomic success. The derived frame ledger is recomputed evidence and is not persisted in the saved group.
12. Open **Duplicate Time Group** for **Coastal Storm Readiness — Operational Briefing**. Inspect the proposed **Copy of Coastal Storm Readiness — Operational Briefing**, retained period, shared chart references, matching configuration, 2.5 seconds per frame, and copied child-scene summaries with new draft IDs.
13. Encounter the duplicate-name validation, rename the draft **Coastal Storm Readiness — Operational Briefing · Copy 2**, review it, and save explicitly. Nothing is committed before that final save.

## Shared behavioral invariants

All variants use one shared draft and state machine. Switching A, B, or C preserves the active stage, dates, selections, Needs attention state, expanded evidence, focused chart, defaults, fallback, seconds per frame, name, validation, dirty state, and duplicate draft. A variant switch changes presentation only.

The stage order is exactly:

1. Choose period
2. Choose charts
3. Set defaults
4. Name and review

The following are simulated contract-fixed behavior, not design candidates:

- Availability analysis waits for a valid inclusive period in the dashboard timezone.
- Every eligible chart and each plotted variable expose full-data earliest/latest dates, a unique valid in-period observation-date count, and a period-spanning tick representation.
- Selected charts move into a top selected region separated from remaining candidates by a thin divider.
- A selected chart that loses all in-period availability moves to Needs attention and remains selected until the builder removes it or restores its availability.
- Membership in another Time Group is visible and non-blocking; a chart may belong to multiple groups with independent policies.
- Matching labels and meanings are exactly **Concurrent only**, **Interpolate**, **Snap to Latest**, and **Snap to Closest**.
- Unsupported Interpolate use names the member, variables, and reason and blocks save until an eligible member fallback is chosen or the group default changes.
- Default Chrono frames are the sorted unique union of available observation timestamps across every plotted variable of every member within the group period. This ledger is derived, never a second persisted source of truth.
- Seconds per frame is a positive finite numeric value; named speed tiers and `1x`/`2x`/`3x` are not authoring vocabulary.
- Save validates and commits the complete group atomically. Failure leaves the draft open and the last saved dashboard unchanged.
- Duplicate Time Group creates an editable deep-copy draft with new group and child-scene IDs, shared chart/data references, retained period/policies/seconds, a proposed `Copy of <name>`, unique-name validation, and no commit before Review/save.
- Dirty Close, Escape, mode switch, or navigation requires an explicit save/discard decision.

## Round-one variants

### A — Availability Ledger

Full-width chart records form three explicit vertical regions: **Selected**, **Needs attention**, and **Available**. Each record carries a compact chart summary and expands inline to show aligned variable rows with dates, counts, and tick strips.

**Hypothesis:** a familiar ledger makes every contractual fact directly readable while progressive expansion contains density and keeps selection membership unambiguous.

**Architecture fit:** least-complex candidate. It maps to ordinary lists, grouped sections, buttons, and disclosures supported by the current React/CSS patterns; no custom two-dimensional navigation or split-pane focus model is required.

**Primary risk:** long groups create substantial vertical travel and comparisons between distant expanded records rely on memory.

### B — Aligned Availability Matrix

Selected rows remain pinned in the upper region and remaining rows continue below, while all chart and variable rows share one horizontally aligned period axis. Dates, counts, and ticks form a comparison matrix.

**Hypothesis:** a common axis makes gaps, boundary differences, and density patterns across many charts faster to compare than isolated records.

**Architecture fit:** feasible with CSS Grid and shared column definitions, but it requires the most careful responsive reflow, sticky alignment, keyboard traversal, and internal overflow management.

**Primary risk:** chart identity, membership actions, dense variable labels, and the shared time axis may compete at tablet width and 200-percent text.

### C — Coverage Focus Lens

A compact membership roster holds Selected, Needs attention, and Available charts, while one persistent evidence pane shows the focused chart's variables, dates, counts, and enlarged availability ticks.

**Hypothesis:** separating roster scanning from focused evidence can reduce immediate density and give long names and sparse irregular data room to breathe.

**Architecture fit:** uses familiar list/detail primitives and progressive disclosure, but introduces a second state—focus—alongside membership selection and therefore needs explicit labeling and focus restoration.

**Primary risk:** evidence for only one chart is visible at a time, weakening direct cross-chart comparison and making focus easy to confuse with membership.

## What to compare

- How quickly a first-time builder distinguishes selection membership from evidence inspection.
- Whether selected, Needs attention, and available charts remain spatially and semantically unmistakable.
- Whether long chart names, page/section context, other-group memberships, and variable labels remain scannable.
- Whether earliest/latest dates, counts, null/duplicate implications, and tick density can be understood without a legend hunt.
- How efficiently two charts or variables can be compared for gaps, density, and boundary differences.
- Whether progressive disclosure removes noise without hiding required evidence.
- Whether a period recomputation and the `TEMP-FIX-C05` move to Needs attention are easy to follow.
- Whether keyboard focus and reading context survive select, deselect, expand, period change, variant switch, and stage navigation.
- Whether the evidence presentation remains usable at 768 by 1024, at 200-percent text, and with long translated-like content.
- Whether the additional machinery of B or C earns a real comprehension advantage over the least-complex A.

## Winner or synthesis

**Approved: A — Availability Ledger.** The representative task was exercised in the browser and Variant A was selected without a synthesis variant. Variants B and C remain interactive as preserved alternatives and design evidence.

## Why it won

Availability Ledger keeps membership and evidence in one familiar reading flow: Selected, Needs attention, and Available remain unmistakable, while each chart expands in place to disclose its complete variable-level proof. The shared column geometry aligns the chart summary timeline with every variable timeline inside that record, so gaps and boundaries can be compared without introducing a page-wide matrix or a separate inspection state.

It also preserves the strongest form/function relationship with the approved Staged Proof Studio. Ordinary grouped lists and disclosures are sufficient; selection remains the only membership action, evidence inspection remains an expansion, and the builder never has to infer whether a second focus state changed the Time Group. This achieved the required density and proof visibility with less responsive, keyboard, and overflow machinery than either challenger.

## Why each alternative was rejected

- **B — Aligned Availability Matrix:** rejected as the primary direction because its page-wide comparison grid makes chart identity, membership actions, variable labels, counts, and the common time axis compete for width. Its bounded horizontal scrolling, sticky alignment, and two-dimensional keyboard model add substantial tablet and 200-percent-text complexity without enough comprehension advantage over A's aligned per-record timelines. It remains available as a preserved alternative.
- **C — Coverage Focus Lens:** rejected as the primary direction because the persistent focus pane introduces an inspection state alongside membership selection, while exposing only one chart's evidence at a time. That weakens direct comparison and increases the chance that builders mistake focused evidence for selected membership. Its extra state and focus-restoration obligations did not earn a compensating advantage over A's inline disclosure. It remains available as a preserved alternative.

## Retained cherry-picks

- **From B:** use one shared label/count/timeline column geometry within each expanded Availability Ledger record. The chart-level and individual-variable timelines line up on the same local calendar axis; label length cannot shift the tracks. This is part of the approved A direction, not a page-wide matrix.
- **From C:** give the expanded chart's variable evidence enough vertical and horizontal room for long labels, sparse dates, and irregular ticks while keeping chart identity stable. This is implemented through A's inline expansion, not a persistent split pane or a separate focus concept.

## Responsive boundary

Build authoring is supported at 768 by 1024, 1024 by 768, 1200 by 900, and 1440 by 900. A selected winner or synthesis must then be checked at all applicable sizes.

At `390×844`, View is the only supported product mode. Build may remain visible as a best-effort surface beneath a persistent, non-dismissible unsupported-mode notification with a direct **Switch to View** action. Detection does not redirect automatically, disable controls, discard the Time Group draft, or erase dirty state. Phone geometry is not an acceptance requirement for this Build workflow.

No supported viewport may gain document-level horizontal overflow. Variant B may own bounded internal horizontal scrolling where necessary, but chart identity, row association, and keyboard reachability must remain explicit.

## Accessibility and interaction

- Current stage, completion, validation, dirty state, Selected, Needs attention, and focused evidence have programmatic names and announcements.
- Availability bars have equivalent chart/variable names, full-data boundaries, in-period counts, and tick/date descriptions; color is never the only encoding.
- Select, deselect, disclosure, repair links, matching choices, fallback choices, duplicate review, and stage navigation are keyboard and touch operable.
- If the fixed Staged Proof Studio is modal, focus remains trapped inside it, then returns to **Create Time Group** on close.
- Focus moves to the first meaningful error after failed validation and returns logically after nested confirmation.
- Essential actions provide at least 44 by 44 CSS-pixel targets.
- Long content, 200-percent text, screen-reader reading order, and supported tablet reflow retain every fact and action.
- Reduced motion removes non-essential movement; region changes remain understandable through headings, position, and announcements.
- No backdrop click silently saves, discards, removes a selected member, or changes the period.

## Remaining low-risk implementation details

- Exact ledger row heights, card padding, divider spacing, and the breakpoint values used to reflow the label/count/timeline columns at supported tablet widths, provided every required fact and action remains available and root horizontal overflow is not introduced.
- Compact tick rendering and visual thinning at dense scales, provided the accessible date descriptions and aligned local calendar axis remain intact.
- Final copy polish, icon finish, focus-ring token calibration, and reduced-motion transition durations within the approved visual language.

No high-risk Time Group visual or behavioral question remains unresolved or reopened by this sketch. The cross-sketch View-only phone boundary is already settled in the manifest and remains outside Build layout acceptance.

## Relevant authority

Normative:

- `docs/superpowers/specs/2026-08-12-temporal-authoring-chrono-design.md`
  - §§2–5: vocabulary, Time Group ownership, derived state, atomic drafts, matching semantics, and the four-stage workflow
  - §4.1: Default Chrono's derived sorted unique union and zero-frame behavior
  - §§4.5–4.6: matching hierarchy and Interpolate safety
  - §7.1: Duplicate Time Group semantics
  - §10: explicit Needs attention findings, repair links, and no silent mutation
  - §11: accessibility and responsive behavior
  - §12: `TEMP-FIX-01`, `TEMP-FIX-02`, `TEMP-FIX-03`, `TEMP-FIX-10`, and `TEMP-FIX-14`
  - §§13–14: Step 4 visual-prototype boundary and deferred geometry
- `docs/superpowers/specs/2026-08-12-three-mode-dashboard-ui-spec.md`
  - Build ownership, View/Build parity, progressive disclosure, state truth, long content, keyboard/touch, and candidate-neutral architecture
- `.planning/sketches/004-chart-creation/README.md`
  - approved Staged Proof Studio outer authoring shell, draft visibility, focus, internal scroll, and phone boundary
- `.planning/sketches/003-dashboard-visual-language/README.md`
  - approved three-style visual grammar, palette portfolio, semantic/UI/data-colour separation, focus, long-content, and reduced-motion rules
- `.planning/sketches/MANIFEST.md`
  - sequence, status register, deferred Audience preset, and the approved cross-sketch phone support boundary

Earlier implementations and the 2026-08-10 specifications/prototypes are historical evidence only. They do not select the Stage 2 evidence presentation or override the three 2026-08-12 contracts.
