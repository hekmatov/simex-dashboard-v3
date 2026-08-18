---
sketch: 018
name: source-evidence-workspace
question: "How should users inspect a chart’s wide source rows, provenance, search, sorting, pagination, and load states, then return to the invoking chart without losing View context?"
status: Approved
winner: "A — Dedicated Viewer Window"
tags: [source-data, evidence, View, table, search, pagination, continuity]
---

# Sketch 018 — Source Evidence Workspace

**Status:** Approved

**Selection:** A — Dedicated Viewer Window

## Decision question

How should users inspect a chart’s wide source rows, provenance, search, sorting, pagination, and load states, then return to the invoking chart without losing View context?

This sketch compares three containment-and-return patterns for an existing source-data capability. It does not propose a new data model, new chart controls, or a source-editing workflow.

## Fixed contract

All variants share the same evidence content, table behavior, state language, and continuity goal. The variable under review is only **where the viewer is contained and how the user returns to the invoking chart**.

### Source identity and provenance

The representative source chain is fixed and explicit:

`bio_confirmed_cases` → `bio_cases` → `data/biomedical/cases.csv`

The prototype uses a deliberately simulated 15-column CSV fixture so the containment options can be judged with a realistically wide evidence table. Five canonical anchor columns remain unchanged and appear first:

1. `date`
2. `national_total_cases`
3. `total_deaths`
4. `daily_new_cases`
5. `new_deaths`

Ten supplemental biomedical fields complete the simulated fixture:

6. `active_cases`
7. `recovered_cases`
8. `hospitalized_cases`
9. `intensive_care_cases`
10. `ventilated_cases`
11. `cumulative_tests`
12. `daily_tests`
13. `test_positivity_pct`
14. `healthcare_worker_cases`
15. `daily_imported_cases`

The viewer exposes all 15 fixture columns in fixture order without viewer-side aliases, aggregation, formatting transformations, or omission. The ten supplemental fields are presentation fixtures for wide-table evaluation; they do not assert that the production CSV already contains those fields.

The sketch may identify the invoking chart separately, but it must not imply that the chart title is the file, dataset, or variable identifier.

### Complete source rows

The fixture contains exactly 177 rows covering `2027-02-20` through `2027-08-15`. The prototype displays the complete row set and must not add rows, interpolation, aggregation, or deterministic row expansion merely to demonstrate pagination. Each row contains the five canonical values plus the ten simulated supplemental values.

Pagination is fixed at 100 rows per page:

- Page 1: rows 1–100
- Page 2: rows 101–177

### Search, pagination, and no results

- Search filters across all 15 displayed columns; it does not change the fixture, source mapping, or chart.
- The fixed positive search fixture is `2027-08-15`, which yields exactly one row. Its five canonical anchor values remain exactly `2027-08-15 | 79547 | 9 | 319 | 9`; the ten supplemental values remain visible alongside them.
- The fixed no-match fixture is `not-a-source-value`.
- A no-results state preserves provenance, search, and a clear route to clear the query.
- Clearing search returns to the 177-row evidence set and a valid page.
- Page controls and row counts remain understandable after filtering.
- Every data-column header cycles through source order → ascending → descending → source order. The first activation sorts ascending, the second sorts descending, and the third restores canonical fixture order. The active direction is visible in the header and exposed to assistive technology; the reset state reports no active sort.
- Sorting is presentation-only: it operates on the filtered result set before pagination, resets the viewer to page 1, and never mutates the fixture, source mapping, or chart. The initial and reset views remain in canonical fixture order, and the current sort state carries across A/B/C while the viewer remains open.
- Headers and values remain inspectable without silently truncating fixture content. Horizontal scrolling is expected for the 15-column table, especially in the drawer and on narrow viewports.

Search, sorting, and pagination are transient viewer state only.

### Existing viewer states and exact copy

The sketch preserves the current `SourceCsvViewer` state model rather than inventing a parallel one:

| Condition | Exact existing copy |
|---|---|
| Waiting for a source response | `Waiting for source data…` |
| Fetching and parsing | `Loading and parsing the CSV…` |
| Display failure | `The CSV could not be displayed` |
| No CSV is associated with the source | `This source has no CSV file to display.` |
| A dedicated viewer cannot open | `The source-data window was blocked. Allow popups and try again.` |

State treatment may move with the selected containment pattern, but state meaning and copy must not diverge among variants. These state examples are prototype review shortcuts, not new global dashboard controls. Do not add Retry or other unapproved recovery actions.

### Continuity goal and current protocol risk

Opening evidence must not mutate the dashboard. The desired return outcome is:

- the same dashboard page is active;
- the same chart and ordinary View/Focus context remain active;
- the page retains its prior scroll position;
- keyboard focus returns to the source-data trigger where the containment pattern supports it;
- chart bounds, time position, comparison state, and all other dashboard state are unchanged.

The evidence viewer may scroll, search, and paginate independently. Those transient viewer states do not leak into the dashboard.

The current dedicated-window protocol v1 does **not** guarantee invoking origin or keyboard-focus restoration. Variant A must present that limitation as a design/implementation risk, not imply that the existing protocol already satisfies it. The sketch is deciding the intended return experience; it is not silently upgrading the protocol.

### Phone behavior

The phone review boundary is functional rather than a compressed desktop composition:

- provenance remains visible before or immediately adjacent to the table;
- all 15 columns remain available through horizontal table scrolling rather than deletion;
- search and pagination remain reachable;
- return remains explicit;
- Variant C’s bounded desktop drawer becomes full-screen on phone;
- no variant relies on hover-only controls.

## Variants

### Variant A — Dedicated Viewer Window

**Approved; selected.** Source evidence opens in a dedicated viewer window while the invoking dashboard remains intact in its original window. The viewer owns provenance, search, table, pagination, and viewer states. Closing or returning exposes the unchanged dashboard.

This option is closest to the current popup-based source viewer and minimizes new in-product navigation. Review whether the relationship to the invoking chart stays clear, whether return is dependable, and whether popup-blocked guidance is visible without unrelated product chrome. Also inspect the protocol v1 risk: origin and focus restoration require additional support and cannot be claimed as existing behavior.

### Variant B — In-product Full-screen Evidence Lens

**Rejected; preserved for comparison.** Evidence occupies the product viewport as a full-screen lens. The dashboard is temporarily covered but remains an unchanged return target. A compact lens header carries source identity and an explicit return action; the table owns the remaining space.

This avoids a second browser window and popup blocking, but was not selected because the in-product full-screen layer reads more like navigation away from the dashboard and does not reuse the current dedicated-viewer model.

### Variant C — Bounded Evidence Drawer

**Rejected; preserved for comparison.** Evidence opens in a bounded drawer alongside the dashboard on wide screens and becomes full-screen on phone. The drawer scrolls independently and retains the same complete 15-column fixture table, using horizontal table scrolling when necessary.

This preserves the strongest visual relationship to the invoking chart, but was not selected because the bounded desktop area gives the wide evidence table the least inspection space while obscuring part of the dashboard.

## What is being decided

| Decision axis | A — Dedicated window | B — Full-screen lens | C — Bounded drawer |
|---|---|---|---|
| Containment | Separate viewer window | Same product viewport | Adjacent bounded surface; full-screen phone |
| Dashboard visibility during inspection | Preserved in its original window | Temporarily covered | Partly visible on desktop |
| Return mechanism | Close/Return to dashboard | Explicit return from lens | Close drawer |
| Main advantage | Reuses the current viewer model and maximizes table space | Avoids popup dependency | Keeps invoking context visually adjacent |
| Primary risk | Popup blocking plus protocol v1 origin/focus gap | Feeling like navigation to a new product page | Insufficient table width and dashboard occlusion |

The choice is **not** about fixture fields, row content, search/sort semantics, pagination size, state messages, mutation controls, or extra table utilities. Those remain fixed across the three containment variants.

## Representative review task

1. Start in ordinary View with the invoking chart visible after scrolling down the dashboard.
2. Open source evidence for the chart mapped through `bio_confirmed_cases` → `bio_cases` → `data/biomedical/cases.csv`.
3. Confirm that provenance distinguishes chart, variable, dataset, and CSV path.
4. Confirm that all 177 fixture rows and all 15 columns are represented, with the five canonical anchor columns first and unchanged.
5. Activate a data-column header three times to sort ascending, sort descending, and restore source order. Confirm that every transition applies before pagination, returns to page 1, and leaves the source mapping and chart unchanged.
6. Move from rows 1–100 to rows 101–177 and back.
7. Search `2027-08-15`; confirm the sole result’s five canonical values are `2027-08-15 | 79547 | 9 | 319 | 9` and its ten supplemental values remain visible.
8. Search `not-a-source-value`; inspect no-results treatment, then clear it and confirm the 177-row set and valid pagination recover.
9. Exercise Waiting, Loading, display failure, no-CSV, and—where applicable—popup-blocked examples; compare exact copy and placement.
10. Return to the dashboard. Inspect whether the original page, scroll position, chart View/Focus state, and source-data trigger focus are preserved; record Variant A’s protocol v1 limitation rather than assuming success.
11. Repeat the containment and return check at the phone viewport; verify all 15 columns remain available through table scrolling.

## Acceptance falsifiers

Reject or revise a variant if any of the following is true:

- it renames, hides, or reorders the five canonical anchor columns, or presents any of their values as simulated;
- it omits any of the ten supplemental fixture columns, or presents them as confirmed production schema;
- it adds rows or represents any count other than the exact 177 fixture rows;
- it presents a page beyond rows 101–177;
- search, sorting, or pagination mutates the fixture, chart, or source mapping;
- a header cannot cycle from source order to ascending to descending and back to source order, sorting is applied only within the current page, or a sort-state transition does not reset to page 1;
- the two fixed search fixtures do not produce their specified results, including the five canonical values for `2027-08-15`;
- no-results removes provenance or strands the user without a way to clear the query;
- evidence opening changes dashboard page, chart bounds, time, layout, or comparison state;
- returning loses invoking context without clearly identifying the applicable containment/protocol risk;
- the viewer invents global filters, export, source editing, Build mutation, freshness, ownership, Retry, or table utilities beyond the approved column sorting;
- state copy diverges from the current `SourceCsvViewer` language;
- a phone variant hides columns instead of making the complete 15-column table inspectable;
- Variant A lacks visible popup-blocked guidance or falsely claims protocol v1 guarantees origin/focus restoration;
- Variant C remains a cramped desktop drawer on phone rather than becoming full-screen;
- containment differences are confounded by different evidence data or table behavior.

## Out of scope

- editing, correcting, uploading, or replacing source data;
- export or CSV download;
- freshness, ownership, or other unconfigured provenance metadata;
- Retry actions;
- global dashboard filters or a new time control;
- Build-mode chart mutation, Unit Orbit settings, or proof-approval gates;
- changing dataset/variable/file mappings;
- transformed, summarized, or chart-shaped evidence views beyond the approved simulated wide-table fixture;
- additional row expansion beyond the fixed 177-row fixture;
- production-scale table virtualization or performance architecture;
- authentication, authorization, file-system browsing, and external data connectors;
- redesigning Details, Focus, Collection, or comparison controls beyond the source-viewer entry and return continuity needed for this decision.

## Decision status

**Approved. Winner: A — Dedicated Viewer Window.** It preserves the current dedicated-viewer model, maximizes room for the complete 15-column simulated fixture, and leaves the invoking dashboard intact. B remains available as an interactive alternative but was rejected because its full-screen in-product layer reads like navigation away from the dashboard. C remains available as an interactive alternative but was rejected because its bounded desktop drawer provides the least space for wide-table inspection and obscures part of the dashboard. The approved sorting cycle is source order → ascending → descending → source order.
