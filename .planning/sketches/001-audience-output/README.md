---
sketch: 001-audience-output
status: Approved
winner: Synthesis — A top default with B/C placement settings
---

# 001 — Audience output

## Design question

What composition and visual hierarchy make the fixed 16:9 Audience output legible and calm?

## Scope in

- A real `1920×1080` logical Audience canvas, scaled only by the prototype viewer.
- Waiting, connected-empty, active, deliberate blank, disconnected, reconnecting, blackout, partial-data, zero-row, and ended output states.
- Title on/off; one, two, three, and four charts; every count-valid layout.
- A configured shared title, Scene date, chart-local temporal status, chart title, legend-to-mark mapping, axes and units, major scale values, and key annotations.
- Top, left, and bottom shared-title placement settings.
- Presenter-side repositioning of the Scene date, session retention, and an explicit Scene-save action.

## Scope out

- Playback, availability bars, navigation, focus targets, or recovery actions on the projected Audience.
- Production popup/session wiring, authorization rules for dashboard mutation, or remote/network behavior.
- Final color, typography, elevation, or brand tokens; those belong to `003-dashboard-visual-language`.
- Exact production implementation dimensions beyond the normative `1920×1080` logical canvas.

## Fixture and representative task

The fixed saved Scene is **HeV-A26 Dashboard: Epidemiological overview** in **HeV-A26 Day 2 Simulation**, at **15 Aug 2027**. Chart order is immutable:

1. `bio_confirmed_cases` — Confirmed cases — 79,547.
2. `bio_new_cases_deaths` — Daily cases and deaths — 319 cases/day; 9 deaths/day.
3. `bio_vaccination_rate` — the fixed 128-character long title with the fixed 64-character legend.
4. `socio_risk_deltas` — Change in risk perception — positive, zero, and negative signed values.

Exercise the synthesis as follows:

1. Start at waiting, then show the active one-chart output.
2. Turn the configured Audience title off and confirm the charts reclaim the full inner field.
3. Compare top, left, and bottom title placement with the same fixture.
4. Inspect both two-chart layouts, all four three-chart focus layouts, and the four-chart `2×2` stress case.
5. Confirm every temporal state is attached directly to its chart with an icon and short readable label.
6. Drag the Scene date in the Presenter live preview; use arrow keys for precise movement.
7. Confirm the moved position survives state, layout, and placement changes in the current session.
8. Use **Save date position to Scene** and confirm the session-only status becomes Scene-saved.
9. Inspect partial-data and zero-row states, disconnection/reconnection retention, blackout, and restore.

The **Next exercise state** control runs a representative subset; all controls remain independently available.

## Round-one variant hypotheses

### A — Top interpretive masthead

The original candidate placed scene, frame, chart list, provenance, and connection status in a full-width masthead. It oriented viewers quickly but duplicated chart identity and permanently reduced plot height.

### B — Left interpretive rail

The original candidate placed the identical context ledger to the left. It protected height but materially reduced chart width and read too much like navigation.

### C — Broadcast lower band

The original candidate placed the identical context ledger below the charts. It made charts primary but competed with x-axes and delayed interpretation.

The original round-one axis and rejection evidence are retained here. The reviewed synthesis removes the ledger rather than merely moving it.

## Current synthesis hypothesis

- **A / top is the default shared-title placement.**
- **B / left and C / bottom remain selectable settings**, not rejected or hidden prototypes.
- The shared region contains only the configured title and its small supporting identity line.
- When the title is off and no future shared information is configured, the region disappears and charts receive the entire available inner canvas.
- Temporal status is chart-local: a subtle non-color icon plus a concise visible label such as Concurrent, Interpolated, Closest, or Static.
- A saved Scene shows its active date as an independent floating object. No frame number or chart ledger is shown.
- The date is dragged only in the Presenter live preview. The projected Audience remains passive.
- Every drag immediately updates the active Scene’s position in fake session memory. An explicit **Save date position to Scene** action copies that session position into the fake saved Scene. A new session starts from the Scene-saved position.

## What to compare

- Whether the chart-local status is faster to associate than the rejected shared ledger.
- Whether the floating date remains legible without becoming the dominant visual element.
- Whether top is the best default while left and bottom remain useful settings.
- Whether title-off genuinely feels like a full-canvas composition.
- Long-title and dense-legend wrapping without lost association.
- Four-up plot size, major-value legibility, and unused space.
- Whether session-only versus Scene-saved date position is clear from one button and one status line.
- Whether waiting, blackout, blank, and connection-loss states feel distinct without technical prose.

## Winner or synthesis

**Approved synthesis — 13 Aug 2026.** A compact top shared-title region is the default. Left and bottom remain selectable title-placement settings. Chart temporal truth stays attached to each chart, the configured title region disappears completely when unused, and a Scene date floats independently with session retention and an explicit Scene-save action.

## Why it won

- It keeps charts and their temporal interpretation visually coupled instead of requiring a separate lookup ledger.
- It lets title-free output use the entire available inner canvas.
- It gives the common case a calm, quickly understood masthead without discarding useful left and bottom placements.
- It shows only the Scene information relevant to an audience—the date—while keeping moderator interaction out of the projected output.
- It makes the persistence boundary explicit: movement is retained for the session; saving to the Scene requires a deliberate action.

## Why each alternative was rejected

- A’s original full context ledger — rejected because chart identity and provenance were redundantly separated from the charts they describe. Its top placement is retained as the default for the configured title only.
- B’s original full left ledger — rejected because it consumed chart width and resembled navigation. Its left placement is retained as an optional title setting.
- C’s original full lower ledger — rejected because it competed with x-axes and delayed orientation. Its bottom placement is retained as an optional title setting.

## Retained cherry-picks

- A: fastest shared-title orientation and least-complex CSS structure.
- B: a height-preserving title option for contexts that can trade width.
- C: a charts-first, broadcast-like title option.
- All variants: deterministic one-to-four-chart layouts and last-valid-output lifecycle behavior.

## Contract variance recorded for later codification

The current contracts make Present the sole controller and Audience passive, which this synthesis preserves. They do not currently authorize Present to mutate a saved Scene or define a persisted Scene date position. The explicit **Save date position to Scene** action is therefore a user-approved Step 4 contract expansion. Production planning must later specify the Scene field, mutation authority, validation, save failure behavior, and concurrency semantics; this sketch does not modify the normative contracts.

## Unresolved items

- No high-risk visual question remains unresolved in this sketch.
- The exact icon set, border, type, and color treatment remains intentionally neutral until `003-dashboard-visual-language`.
- Production schema, authorization, failure, and concurrency details for saving the date position remain later specification work rather than visual-direction work.

## Deferred product feature captured

- `AUD-PRESET-01` in `MANIFEST.md`: named **Audience composition presets** for saving and listing reusable chart/order/layout/title arrangements. This is intentionally narrower than a Scene and does not freeze the current frame, values, playback, blackout, or connection state.

## Relevant contract clauses

- UI contract `MODE-04` and `PRES-01`: Audience is passive and the Presenter controller is the sole output authority.
- UI contract `PRES-02`: deterministic one-to-four-chart composition, order, and count-valid layout.
- UI contract `LIFE-02`–`LIFE-15`: waiting, holding, blank, disconnect/reconnect, blackout, restore, invalid update, and ended lifecycle behavior.
- UI contract `LEG-01`–`LEG-08`: mandatory Audience content, title-off space return, and separate physical-distance validation.
- UI contract `FIX-AUD-04`: four long-titled charts with dense legends, axes/units, signed ticks, active time, annotations, and secondary labels.
- UI contract `COPY-01`–`COPY-04`: calm waiting copy and prohibited technical/recovery copy.
- Temporal contract Audience interpretation and failure clauses: passive output, compact chart-associated temporal truth, static-chart identification, last-valid retention, and no availability bar or controls.
- Accepted evidence: `PRESENT-AUDIENCE-FINDINGS.md`; its measured geometry is regression evidence, not approved geometry.
