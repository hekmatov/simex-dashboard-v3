---
sketch: 016
name: collection-display-runtime-interaction
question: "How should non-temporal Collection Display controls and runtime state remain understandable across View, Focus, Comparison, Present, Audience, and Build authoring?"
status: Approved
winner: "A — Embedded Header Controls"
tags: [collection, view, present, audience, build, consistency]
---

# Sketch 016 — Collection display runtime interaction

## Design question

How should people browse, pause, resume, and understand a chart's repeated **Items** across View, Focus, Comparison, Present, passive Audience output, and Build authoring without adding a new control rail or confusing collection state with dashboard structure?

This is a containment and consistency decision. The three variants use identical collection data, authored configuration, chart geometry, page order, runtime state, and mode transitions. They vary only in where Collection Display runtime controls appear.

## How to view

Open `http://127.0.0.1:8765/.planning/sketches/016-collection-display-temporal-interaction/index.html?round=4-edit-slot` while the local sketch server is running.

## Decision status

**Approved. Winner: A — Embedded Header Controls.** B and C remain available as rejected comparison variants.

## Confirmed collection boundary

- Applying Collection Display makes the authored chart **ineligible for Time Groups and Scenes**.
- Collection Items are non-temporal. Their only automatic cadence is positive finite **seconds per page**.
- Item page, order, running/paused state, and seconds-per-page runtime are chart-local. They do not control, inherit from, or synchronize with another dashboard transport.
- Earlier fixture metadata that listed a collection chart as a Time Group member is not part of this revised sketch contract.
- Present may control Items for a selected collection chart through the Live Sidecar. Audience remains a passive mirror and exposes no controls.

## Fixed and variable scope

### Fixed across all variants

- Collection Display remains a reusable chart capability for repeated KPI, Gauge, Bullet, and Delta list Items.
- A collection's saved presentation, rows, columns, item gap, overflow, fixed/sort/priority ranking, paging behavior, looping, focus/hover pausing, and seconds per page remain chart-owned settings in **Unit Orbit → Collection**.
- A chart's footprint width/height remains a selected-chart property in **Unit Orbit → Size**. The Layout draft owns authored order/position, sections, and global layout-preset selection; the layout system derives reflow without acquiring footprint ownership.
- Changing Collection rows, columns, overflow, or paging behavior does not silently change Size. Changing the universal 2 × 4 Size picker does not rewrite Collection settings.
- The canonical dashboard, page/section structure, chart identities and order, chart data, authored collection configuration, and visual profile are identical in A, B, and C.
- Fixed grid, Scrollable grid, Auto carousel, fixed/sort/priority ranking, manual Previous/Next, Play/Pause, looping, stable order, and explicit re-ranking keep their existing collection semantics.
- View is the only phone-supported product mode. Build and Present retain the standard unsupported-phone banner and preserve state rather than redirecting or discarding work.

### Variable in this sketch

- Where chart-local Item page state and controls appear in View, Focus, and Comparison.
- How a person enters and exits a collection-browsing surface.
- How much persistent chart chrome each approach adds.

### Out of scope

- New collection modes, ranking methods, chart families, chart data, or package schema.
- Any eligibility, synchronization, matching, or transport relationship between Collection Display and authored Time Groups or Scenes.
- Reopening selected-chart Size ownership, comparison layouts, Present's Live Sidecar, Audience composition, or dashboard geometry.
- Treating the draft-only Scrollable-grid preview as new seeded dashboard content.
- Production architecture, persistence, cross-tab synchronization, or exhaustive responsive behavior.

## Variants

### A — Embedded Header Controls (approved winner)

Collection controls share the chart's existing header row and add no vertical space:

- the chart title stays left;
- a flexible middle region holds noninteractive page dots, with one filled dot for the active page and empty dots for the remaining pages;
- the right edge holds Previous, Play/Pause, and Next as SVG icon buttons with `22 × 22 px` visible surfaces centered inside `44 × 44 px` activation targets;
- in Build, that compact transport shifts left and the chart's **Edit** button occupies the rightmost header position;
- dots and controls appear only when the collection has more than one page;
- the header shows no visible page count, **Items** label, cadence explanation, or other instructional copy;
- the dots indicate position but are not click targets;
- icon buttons retain accessible names, tooltips, focus treatment, and disabled boundary states without adding visible text.

The title, flexible dot region, and icon group fit the current chart-header height. The chart body and canonical footprint do not move when controls appear.

Why A was selected: the controls remain attached to the chart they affect, preserve the existing chart body, travel naturally into Focus and Comparison, and can remain close to the existing Collection Display renderer. Reserving a dedicated rightmost Build slot for **Edit** keeps runtime paging distinct from chart authoring.

Reject A if the icons make dense chart headers too crowded, the dots become unreadable at realistic page counts, or the repeated controls distract from chart titles.

### B — Chart-interior Browse Face

A compact **Browse items** action replaces the visualization interior with a same-footprint collection-browsing face. That face contains page state and controls and returns through **Back to chart** while preserving the current page and paused/running state.

Reject B if temporarily hiding the visualization makes orientation or comparison harder, if the state change is easy to miss, or if Back feels like navigation away from the dashboard.

### C — Contextual Item Deck

Selecting a collection opens a small viewport-level Items deck targeted by chart title. Only the deck is interactive; the underlying chart remains the visible result and the deck closes back to the invoking chart control.

Reject C if the deck appears global, competes with Focus or Comparison, loses a clear chart target, or recreates command-surface collision already resolved by Sketch 015.

## Real fixture inventory

These are the complete seeded Collection Display charts in the version-3 dashboard map. For this confirmed revision, every configured collection chart is excluded from Time Group and Scene membership.

| Page / section | Chart ID | Display name | Saved Collection configuration | Authoring eligibility |
|---|---|---|---|---|
| Home / Scenario overview | `home_operational_pressure_kpis` | Operational pressure KPIs | Fixed grid `1 × 2`; fixed ranking | Ineligible for Time Groups/Scenes |
| Biomedical / Outbreak dynamics | `bio_case_deltas` | Case delta priority set | Fixed grid `2 × 3`; priority ranking | Ineligible for Time Groups/Scenes |
| Biomedical / Outbreak dynamics | `bio_current_cases_kpi` | Current cases KPI | Auto carousel `1 × 1`; fixed ranking; `10` seconds/page | Ineligible for Time Groups/Scenes |
| Biomedical / Health-system pressure and coordination | `bio_icu_capacity_bullet` | ICU capacity | Auto carousel `1 × 1`; fixed ranking; `10` seconds/page | Ineligible for Time Groups/Scenes |
| Biomedical / Health-system pressure and coordination | `bio_hospital_capacity_bullet` | Hospital capacity | Auto carousel `1 × 1`; fixed ranking; `10` seconds/page | Ineligible for Time Groups/Scenes |
| Biomedical / Health-system pressure and coordination | `bio_occupancy_collection` | Occupancy priority collection | Fixed grid `1 × 2`; priority ranking | Ineligible for Time Groups/Scenes |
| Socio-economic / Public response and policy signals | `socio_risk_deltas` | Risk-perception deltas | Fixed grid `2 × 3`; priority ranking | Ineligible for Time Groups/Scenes |
| Socio-economic / Public response and policy signals | `socio_values_deltas` | Public-policy value deltas | Fixed grid `3 × 3`; priority ranking | Ineligible for Time Groups/Scenes |
| Socio-economic / Trust and wellbeing | `socio_trust_meter` | Institutional trust meter | Fixed grid `2 × 2`; priority ranking | Ineligible for Time Groups/Scenes |

### Explicit draft-only Scrollable grid

The seeded dashboard map contains no saved Scrollable-grid collection. To evaluate that live mode honestly, the representative exercise opens `bio_case_deltas` in **Unit Orbit → Collection** and changes its selected-chart property draft from Fixed grid to **Scrollable grid**. The canvas shows a clearly labelled **Draft preview** while the saved chart remains Fixed `2 × 3` / priority. Discard restores the saved configuration; Apply changes only the chart's Collection configuration and leaves its Size untouched.

## Ownership and runtime contract

### Authored configuration

- **Unit Orbit → Collection** owns presentation mode, rows, columns, item gap, overflow, fixed/sort/priority ranking, page behavior, looping, focus/hover pausing, seconds per page, and re-ranking policy.
- These values belong to the selected chart's property draft. Cancel, Apply, dirty-state, target-switch resolution, and Context Shelf recovery follow the approved Unit Orbit contract.
- **Unit Orbit → Size** owns footprint width/height in that selected-chart property scope.
- The separate Layout draft owns authored order/position, sections, and global layout-preset selection. Size-triggered packing/reflow is derived output and does not become a Layout mutation.
- A Collection preview renders inside the current footprint.

### Runtime state

- Runtime state is keyed to chart identity and includes the current page, manual/automatic state, paused/running state, current stable ordering, and any session-only seconds-per-page value exposed by the mode.
- Moving between ordinary View, Focus, and Comparison preserves the same chart-local runtime state rather than cloning a controller.
- Leaving and re-entering a Page restores the current session's collection state when the chart still exists. A changed or removed chart resolves to a valid first page and announces the reset.
- Manual Previous/Next changes only that collection's page. Play/Pause changes only that collection's automatic paging.
- Priority **Re-rank now** changes item order only; it retains the current page when valid and otherwise clamps to a valid page with an announcement.
- Hover, keyboard focus, reduced-motion preference, modal interruption, and safety actions pause automatic paging according to the authored collection behavior.
- A single-page collection has no page dots or paging controls and runs no automatic page timer.

## Mode semantics

| Mode or transition | Collection behavior |
|---|---|
| Ordinary View | The selected variant exposes chart-local Item state and controls without changing canonical footprint or Page order. Runtime interaction is personal session state and never edits the dashboard package. |
| Focus | The chart expands to the approved full viewport and carries the same page, paused/running state, seconds per page, and item order. Exit returns to the original chart and focus target without resetting the collection. |
| Comparison | Every displayed collection chart retains its own chart-local runtime state. Reordering comparison charts does not reorder collection Items, and no Item control becomes a global comparison control. |
| Build | Collection settings appear only in Unit Orbit → Collection and create a selected-chart property draft. The canvas provides a live in-footprint preview. Footprint width/height remains in Unit Orbit → Size; Layout retains authored order/position and sections. |
| Present | The Live Sidecar is the sole interactive owner. It names the selected collection chart and exposes its page controls, paused/running state, and seconds-per-page session value without mutating the saved chart. |
| Audience | Audience mirrors the Present-selected page, item order, and running/paused result. It is passive: no buttons, hover affordances, focus targets, or independent timer appear in Audience output. |

Opening or reopening Audience receives the current last-valid Present snapshot. If an Item update is invalid or the connection is interrupted, the last-valid Audience output remains visible; collection errors stay in the Live Sidecar and do not expose moderator controls to the audience.

## Phone and responsive boundary

- View, including Focus, Comparison, and Collection controls, remains supported at the canonical `390 × 844` phone fixture.
- Phone View keeps at least a 44 px effective target for Previous, Play/Pause, Next, Browse, Back, and deck actions. Variant A keeps the SVG icons and assistive labels while allowing the flexible dot region to contract.
- A collection's effective column count may adapt to preserve readable item size, but authored rows/columns and dashboard Size are not mutated by the responsive projection.
- Build and Present below 768 px show the standard persistent unsupported-mode notification with **Switch to View**. Resizing does not discard Unit Orbit drafts or live presentation state.
- Audience output remains governed by its approved fixed composition rather than the product-controller phone boundary.

## Representative review exercise

Use the same shared state while switching A, B, and C:

1. In A, open `bio_current_cases_kpi` and confirm its existing header height is unchanged: title left, flexible empty/filled dots in the middle, and Previous/Play-Pause/Next SVG buttons right. Step its four pages, pause, resume, and verify the dots update without becoming clickable.
2. Inspect a single-page collection and confirm no dots, page count, explanatory label, or paging controls are added.
3. Focus `bio_case_deltas`, then exit. Enter comparison with `bio_case_deltas`, `bio_current_cases_kpi`, and `bio_occupancy_collection`; reorder the comparison charts and confirm each collection's runtime state survives.
4. Switch to B, enter and exit the chart-interior Browse Face, and confirm page/running state and chart footprint survive.
5. Switch to C, target two different collections in turn, and confirm the Item Deck always names and returns focus to the correct chart.
6. Open `bio_case_deltas` in Build, enter **Unit Orbit → Collection**, switch to the clearly labelled draft-only Scrollable grid, scroll the preview, then Discard. Confirm the saved Fixed `2 × 3` collection and Unit Orbit → Size footprint are unchanged.
7. Reopen Unit Orbit, change a Collection value and a **Unit Orbit → Size** footprint value in the selected-chart property draft, then reorder the chart to create the separate Layout draft. Use Sketch 015's Context Shelf interruption/recovery path and confirm scope ownership remains legible.
8. Try to add any collection chart to a Time Group or Scene and confirm it is unavailable with a reason that Collection Display charts are ineligible.
9. In Present, control Items from the Live Sidecar and confirm passive Audience mirrors each valid result without acquiring controls.
10. Repeat the View path at `390 × 844`; confirm controls remain operable and Variant A still adds no header height.

Evaluate:

- Is the chart targeted by every control unmistakable?
- Does A communicate page position with dots alone while retaining usable, accessible icon controls?
- Does the selected approach preserve chart-body space and canonical geometry?
- Does collection state follow the chart naturally through Focus and Comparison?
- Is Collection ownership distinct from Unit Orbit → Size and Layout ownership?
- Can Present operate a collection without turning Audience into a controller?
- Is ineligibility for Time Groups and Scenes clear wherever membership would otherwise be offered?

## Architecture declaration

The artifact is a disposable, self-contained HTML/CSS/JavaScript prototype with fixture data and in-memory state. It uses no production persistence, API, routing, renderer integration, timer service, cross-window transport, or schema migration.

For feasibility, the composition assumes the existing production seams remain distinct: the chart-family renderer produces Items; Collection Display owns arrangement; chart-keyed runtime state feeds whichever approved mode surface is interactive; authoring validation excludes collection charts from Time Group and Scene membership; Present is the controller; and Audience consumes passive last-valid snapshots. The sketch does not authorize a global overlay manager or duplicate collection timer.

Approval selects only the user-facing containment and continuity rules. It is not a commitment to this prototype's markup, state object, component boundaries, event wiring, or responsive CSS.

## Decision record

**Approved 18 August 2026.** A — Embedded Header Controls is the winner because it keeps page position and transport attached to each collection without consuming chart-body space or creating a separate control surface. Single-page collections add no paging chrome; multi-page collections use dots plus compact Previous/Play-Pause/Next controls, and Build reserves **Edit** as the rightmost header action. B is rejected because temporarily replacing the chart with a Browse Face weakens comparison context. C is rejected because an additional Item Deck competes with the approved transient-surface model. Both rejected variants remain preserved for reference.
