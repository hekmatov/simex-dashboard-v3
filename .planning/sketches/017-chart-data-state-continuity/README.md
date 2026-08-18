---
sketch: 017
name: chart-data-state-continuity
question: "How should a chart preserve canonical bounds and truthful content through Loading, zero-row, Partial, and Error across ordinary View, Focus, Comparison, Build canonical substitute, Present, and passive Audience—and where should recovery actions appear without colliding with Details, Focus, or Collection controls?"
status: Approved
winner: "A — Plot-native State Plate"
tags: [data-states, View, Focus, Comparison, Build, Present, Audience, continuity, consistency]
---

# Sketch 017 — Chart data-state continuity

## Design question

How should a chart preserve canonical bounds and truthful content through **Loading**, successfully loaded **zero-row**, **Partial**, and **Error** across ordinary View, Focus, Comparison, the Build canonical substitute, Present, and passive Audience—and where should recovery actions appear without colliding with **Details**, **Focus**, or Collection controls?

This sketch compares containment and action placement only. The dashboard fixture, five panel identities and order, state semantics, exact copy, available actions, renderer content, canonical panel and plot bounds, mode transitions, and visual profile remain identical in all three variants.

## How to view

Open `http://127.0.0.1:8765/.planning/sketches/017-chart-data-state-continuity/index.html?round=1` while the local sketch server is running.

## Decision status

**Approved. Winner: A — Plot-native State Plate.** Its state copy and eligible actions remain chart-local and plot-native without imposing permanent space cost or separating the problem from its remedy. B remains available as an interactive alternative but was rejected because its permanent footer consumes chart space. C remains available as an interactive alternative but was rejected because it splits the problem from its remedy and adds pressure to the hover/action rail.

## Fixed comparison fixture

One section contains these five panels in this fixed order. Each panel keeps its declared panel and plot bounds when its state changes.

| Fixture role | Chart ID | Display name | Fixed state |
|---|---|---|---|
| `P-loaded` | `bio_r_values` | Effective reproduction rate | Complete valid data and the unaffected-data reference |
| `P-loading` | `bio_confirmed_cases` | Confirmed cases | Pending until the scripted release; uses STATE-02 and COPY-06 |
| `P-empty` | `bio_icu_hospital_capacity` | ICU and hospital capacity | Successful load with zero rows; uses STATE-02A and COPY-29 |
| `P-partial` | `bio_vaccination_rate` | Vaccination rate | Valid series remain visible while `Booster coverage` is unavailable; uses STATE-04 and COPY-28 |
| `P-error` | `bio_hospital_load` | Hospital demand signal | Deterministic load failure with retained last-valid content where available; uses STATE-03 and COPY-07 |

The fixture includes long-enough state copy, narrow footprints, Focus, a multi-chart Comparison, a Build substitute, Present with its Live Sidecar, passive Audience, the canonical `390 × 844` View projection, reduced-motion behavior, and a Collection-header collision proof. It does not add a sixth dashboard panel, a global status banner, or a new shell surface.

## Fixed state and copy contract

The following clauses are normative and do not vary with the selected design variant or mode.

| State | Exact primary copy | Exact recovery/action copy | Fixed behavior |
|---|---|---|---|
| STATE-02 / COPY-06 — Loading | `Loading <chart name>…` | No action while progress is active. | Reserve the canonical plot bounds, identify loading programmatically, and replace in place without layout shift. No reflow, unexplained blank, or geometry-changing spinner row. |
| STATE-02A / COPY-29 — Loaded with zero rows | `No data is available for <chart name>.` | `Retry Loading <chart name>`; Build additionally offers `Review <chart name> Data Settings`. Audience has no action. | The load succeeded with zero rows. Do not present this as loading, failure, or fabricated zero values. |
| STATE-04 / COPY-28 — Partial | `<chart name> is showing partial data. <series name> is unavailable.` | `Retry Loading <chart name>`; `Continue with Available Data`. Audience has no action. | Render valid portions truthfully and name the unavailable series. Continue is non-mutating; Retry may replace the partial state only after a successful load. Never fabricate zeroes, silently omit the series, or change chart semantics by mode. |
| STATE-03 / COPY-07 — Error | `Couldn’t load <chart name>. The previous valid dashboard state is unchanged.` | `Retry Loading <chart name>` only when implemented. Audience has no action. | Preserve panel and plot bounds, unaffected data, and the previous valid dashboard state. Never show a stack trace, silently remove the chart, or clear valid content before retry succeeds. |

Every action is shown and enabled only when the named operation is implemented. Copy may wrap, but the chart or series identity and consequence may not truncate. State meaning never depends on colour alone.

## Fixed and variable scope

### Fixed across A, B, and C

- The five-panel fixture, data values, chart types, chart order, page and section, footprint, canonical plot bounds, title position, visual language, and state transition script.
- STATE-02, STATE-02A, STATE-03, and STATE-04 behavior and COPY-06, COPY-07, COPY-28, and COPY-29 primary and recovery copy.
- One shared renderer/state result across ordinary View, Focus, Comparison, and the Build canonical substitute; a state does not acquire different chart semantics in another mode.
- Valid portions remain interpretable in Partial. Loading, zero-row, and Error never fabricate marks to make a panel look complete.
- Non-colour cues: a segmented loading form, a neutral empty-state field, a hatched Partial marker, and a firm inset Error rule. Text and programmatic state remain present with every cue.
- Reduced motion replaces stepped loading rotation with a static segmented form and programmatic loading state; it does not remove the label or substitute indefinite animation.
- Existing Details, Focus, Comparison selection, Build Edit, and Collection Display controls keep their approved ownership and activation targets.
- View remains the only phone-supported product mode. `390 × 844` is the canonical phone fixture; Build and Present retain the approved unsupported-phone boundary.

### Variable in this sketch

- Whether chart state appears as a plot-native plate, a permanent status ledger, or an in-plot marker paired with the existing action rail.
- Where eligible recovery actions sit in View, Focus, Comparison, and the Build substitute.
- How much persistent state chrome appears when a chart is fully loaded.

### Out of scope

- New data states, revised copy, retry semantics, polling, cache lifetime, error taxonomy, data-source schema, or persistence.
- New chart families, changes to chart geometry, dashboard structure, Collection runtime behavior, Focus/Comparison composition, Present composition, or Audience lifecycle.
- Moving selected-chart data settings out of Unit Orbit → Data, or moving Collection settings/Size/Layout ownership.
- A global error centre, shell-level chart-state banner, notification queue, toast-only recovery, or new modal manager.
- Production implementation, network behavior, exhaustive responsive behavior, or release-grade accessibility validation.

## Variants

### A — Plot-native State Plate (selected/approved)

The state and its eligible actions remain together inside the canonical plot rectangle:

- Loading, zero-row, and Error use an in-place state plate without adding a row or changing bounds.
- Partial retains all valid marks and uses the fixed plot-native state slot for the named unavailable series and eligible actions.
- Recovery actions stay attached to the chart and do not enter the chart header or lower-right Details/Focus rail.
- Focus and Comparison carry the same plate with the same relative containment.
- Build adds `Review <chart name> Data Settings` in the plate and routes it to Unit Orbit → Data.
- Present places recovery actions in the Live Sidecar; the preview and Audience remain passive.

A is selected because it extends the shared chart-frame status seam, keeps problem and remedy together, and avoids a new permanent panel region or action system.

Reject A if its state plate obscures valid Partial marks, long copy cannot fit narrow canonical plots without hiding chart identity, or the action group competes visually with the data more than the other variants.

### B — Permanent Status Ledger

A slim status ledger is always present along the bottom edge inside the canonical chart frame. The outer panel and plot rectangle never grow or shift:

- normal loaded charts show the same quiet reserved ledger region rather than reclaiming it;
- state copy appears on the left and eligible recovery actions on the right;
- Partial retains the valid chart above the ledger and does not cover its marks;
- Focus and Comparison retain the same ledger relationship;
- Build uses the same ledger but routes Review Data Settings to Unit Orbit → Data;
- Present recovery still moves to the Live Sidecar, and Audience shows only passive state copy.

Reject B if permanent unused chrome creates an unacceptable geometry tax, compresses axes or dense 1 × 1 charts, resembles the rejected lower information band from earlier work, or competes with Collection item density.

### C — In-plot Marker + Existing Action Rail

The truthful state message remains in the plot, while eligible recovery actions use the chart's existing lower-right action rail:

- Loading shows no action rail action because COPY-06 permits no action while progress is active;
- zero-row, Partial, and Error add only their eligible recovery commands to the already owned rail;
- an actionable state command remains visible and keyboard reachable rather than depending on hover alone;
- Focus and Comparison retain the same state-marker/action-rail split;
- Build routes Review Data Settings from that rail to Unit Orbit → Data;
- Present recovery stays in the Live Sidecar, and Audience has no rail or actions.

Reject C if separating the condition from its remedy weakens association, action visibility depends on pointer hover, recovery commands collide with Details/Focus/selection/Collection Edit, or icon density becomes ambiguous on phone View.

## Surface ownership and continuity

| Surface | Fixed data-state behavior |
|---|---|
| Ordinary View | Uses the shared renderer and the selected variant's chart-local state containment. Retry or Continue affects only the named chart; Details and Focus keep their approved controls. |
| Focus | The same renderer and state move with the chart into the full viewport. State, last-valid content, and action eligibility do not reset on entry or exit. |
| Comparison | Each selected chart keeps its own state and recovery target. Reordering charts does not change state, and no recovery action moves to the small top-centre Comparison layout/Exit panel. |
| Build canonical substitute | Uses the same canonical chart renderer/state result. COPY-29 additionally offers `Review <chart name> Data Settings`, which opens **Unit Orbit → Data** for that selected chart without changing Size, Collection, or Layout ownership. |
| Present | The chart preview uses the same truthful state treatment, but the **Live Sidecar** owns Retry, Continue, and Review controls for the named selected chart. Invalid recovery never replaces the last-valid Audience output. |
| Audience | Passive only: no buttons, hover affordances, focus targets, Details, or recovery actions. Zero-row and Partial use the exact primary copy inside the chart. Loading and Error retain last-valid content when available and show the exact passive primary copy inside the affected chart. |

### Collection-control coexistence

Sketch 016 remains authoritative for Collection Display placement. A multi-page collection keeps title left, page dots in the flexible middle, and Previous/Play-Pause/Next in the right header slot; Build keeps Edit rightmost. Sketch 017 state and recovery content starts below that header and may not replace, overlap, or imitate those controls. A single-page collection still adds no paging controls. This sketch does not alter Collection eligibility, Items cadence, runtime state, or Unit Orbit → Collection ownership.

## Explicit ambiguity rulings

- **Zero-row is a success state.** It is not a loading timeout, error fallback, hidden filter summary, or visualized zero.
- **Last-valid means retained, not newly confirmed.** Loading and Error may leave a previous valid render visible where one exists, but the exact state copy and non-colour cue must make its status clear. The fixture seeds a previous valid state before the passive Audience loading/error exercise.
- **Retry is non-destructive.** Existing valid or partial content stays in place until a successful replacement is ready; a failed retry does not blank or reflow the chart.
- **Continue is non-mutating.** It does not edit the source, fabricate values, hide the unavailable-series identity, or change saved chart semantics. The sketch evaluates its action placement, not a new persistence rule.
- **Loading has no action.** Retry does not appear until Loading has resolved to a state whose exact contract permits it.
- **Review Data Settings reuses Unit Orbit.** It opens the selected chart's Unit Orbit → Data surface; it does not create a new data modal or transfer chart-property ownership to Layout.
- **Present and Audience are not symmetric controllers.** Recovery belongs to the Present Live Sidecar. Audience mirrors truthful last-valid output and exact passive copy only.
- **State is chart-local.** No variant authorizes a Crown banner, global status list, Comparison-level recovery, toast-only error, or page-wide dimming.
- **The variant does not own Collection chrome.** Variant C's action rail may not absorb Collection paging or Build Edit, and A/B may not consume the Collection header.

## Phone and responsive boundary

- Ordinary View, Focus, Comparison, state copy, and eligible View recovery remain supported at `390 × 844`.
- Exact copy wraps inside the canonical chart/state region; chart and series identity remain readable, with no page-level horizontal overflow.
- Eligible actions retain a 44 px effective target. Variant C may not make recovery hover-only or icon-only at phone width.
- Reduced-motion behavior applies at every supported View size and preserves a visible non-colour Loading cue.
- Build and Present below 768 px show the approved persistent unsupported-mode notice with **Switch to View**. Resizing preserves Build drafts and Present state.
- Audience remains governed by its approved passive composition rather than the product-controller phone boundary.

## Representative review exercise

Use the same five panels and state script while switching A, B, and C:

1. Confirm the five fixed panels appear in the declared order and that `bio_r_values` remains readable while the other four panels show Loading, zero-row, Partial, and Error.
2. Release and reset `bio_confirmed_cases`. Confirm its loading indicator is programmatic, has no action, replaces in place, and causes no panel, plot, section, or neighbour shift.
3. Exercise `bio_icu_hospital_capacity` Retry and confirm it remains a successful zero-row state until a replacement succeeds. In Build, use `Review ICU and hospital capacity Data Settings` and confirm it opens Unit Orbit → Data for that chart.
4. On `bio_vaccination_rate`, verify valid series remain truthful, the unavailable series is named, Continue is non-mutating, and Retry replaces the Partial state only after scripted success.
5. Retry `bio_hospital_load` once through failure and once through success. Confirm the prior valid dashboard content and unaffected `bio_r_values` remain unchanged until success.
6. Focus the Partial chart, then compare Loading, Partial, and Error together. Reorder Comparison charts and confirm state/action ownership follows each chart without entering the Comparison layout/Exit panel.
7. Inspect Details, Focus, and the Collection-header collision proof in each variant. Confirm state and recovery controls neither overlap nor impersonate those existing controls.
8. In Present, select each affected chart and exercise eligible recovery from the Live Sidecar. Confirm passive Audience retains last-valid Loading/Error output, shows exact in-chart copy, and exposes no actions; confirm zero-row and Partial passive copy as well.
9. Repeat representative View interactions at `390 × 844`, then enable reduced motion. Confirm no horizontal overflow, no hover-only recovery, stable bounds, and a static non-colour Loading cue.

Compare:

- Can the state and affected chart be identified immediately without a global explanation?
- Does Partial preserve enough valid data to remain useful and honest?
- Are recovery actions discoverable without colliding with Details, Focus, Comparison, or Collection controls?
- Do narrow plots and long copy remain legible without geometry changes?
- Does the treatment survive Focus and Comparison without becoming mode-specific?
- Is the Present-controller/passive-Audience ownership split unmistakable?
- Does reduced motion retain equivalent state meaning?
- Is A's lower implementation resistance worth any plot competition, or does B/C provide a materially better containment tradeoff?

## Architecture declaration

The artifact is a disposable, self-contained HTML/CSS/JavaScript prototype with fixed fixture data, scripted state changes, and in-memory state. It uses no production API, data loader, retry pipeline, cache, persistence, router, renderer integration, Audience window transport, schema migration, or timer service.

For feasibility, the design assumes one chart-data-state result can feed the existing common chart renderer used by Dashboard, Focus, Comparison, and Audience; the Build canvas can use that canonical substitute; Present can expose recovery through its Live Sidecar; and Audience can consume passive last-valid snapshots. The prototype does not authorize a forked renderer, parallel per-mode state machine, global overlay manager, remote runtime dependency, or Quorum change.

Approval will select only the user-facing containment, action-placement, and continuity rules. It will not approve the prototype's markup, JavaScript state object, component boundaries, fake retry timing, production data classification, cache policy, transport, persistence, or responsive CSS. The normative UI contract remains authoritative for exact state semantics and copy.

## Decision record

**Approved: A — Plot-native State Plate.** State copy and eligible actions remain chart-local and plot-native without permanent space cost or separating the problem from its remedy. B was rejected because its permanent footer consumes chart space. C was rejected because it splits the problem from its remedy and adds pressure to the hover/action rail. Both rejected variants remain interactive alternatives for reference, with the same shared state fixture.
