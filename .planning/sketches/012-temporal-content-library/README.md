---
sketch: 012
name: temporal-content-library
question: "How should builders find, understand, manage, and repair saved Time Groups and page-scoped Scenes without conflating library management with approved authoring workflows?"
status: Approved
winner: D — Page-grouped Relationships
tags: [build, temporal-library, time-groups, scenes, repair, saved-content, responsive]
---

# Sketch 012 — Temporal content library

## Design question

How should builders find, understand, manage, and repair saved Time Groups and page-scoped Scenes without conflating library management with the approved Time Group and Scene authoring workflows?

This sketch compares only the saved-content library's information hierarchy and attention model. It does not reopen the approved Sketch 005 Availability Ledger, Sketch 006 two-stage Scene flow, Sketch 007 View Chrono, or Sketch 008 Present controller.

## How to view

Open `http://127.0.0.1:8765/.planning/sketches/012-temporal-content-library/index.html?round=1` while the local sketch server is running.

## Decision boundary

### In

- Browse, search, filter, expand, understand, duplicate, remove, and route into Edit, Create, or Repair for saved Time Groups and Scenes.
- Compare a relationship-first ledger, a Page-first Scene shelf, and an attention-first queue using identical saved objects and session state.
- Distinguish dashboard-wide Time Groups from their page-scoped child Scenes.
- Show Ready, Needs attention, true-empty, no-results, and long-catalogue states.
- Explain why Needs-attention content cannot open in Chrono or load into Present/Audience, without mutating any live session.
- Preserve library search, filters, expansion, scroll, selection, and focus across every authoring handoff and return.

### Out

- Authoring Time Group periods, membership, matching, fallback, frame derivation, or save semantics; Sketch 005 owns those decisions.
- Authoring Scene scope, frames, membership, Scene/Present arrangement, matching overrides, or chart-specific temporal settings; Sketch 006 owns those decisions.
- View Chrono controller placement or playback behavior; Sketch 007 owns those decisions.
- Present composition, playback, lifecycle, safety controls, or Audience output; Sketch 008 owns those decisions.
- Named Audience composition presets. `AUD-PRESET-01` remains deferred and is not represented as temporal library content.
- Shell, dashboard look, Page/Section structure, chart Unit Orbit, chart footprint, chart order, or canonical dashboard geometry.
- Production schemas, persistence, authorization, multi-user conflict resolution, tests, package operations, or implementation planning.

## Fixed ownership and lifecycle guardrails

- A **Time Group** is dashboard-wide. A **Scene** is a page-scoped child of exactly one parent Time Group.
- The library manages saved object identity and relationships; it does not embed a second authoring workflow.
- **Time content** in the approved Build strip is the single entry to the library. Create, Edit, Duplicate, and Repair leave the library and hand off to the exact owning stage in Sketch 005 or 006.
- Returning after Save, Discard, or Cancel restores the same variant, query, filters, expanded parent, selected row, scroll position, and valid focus target.
- Only one temporal draft may exist at a time across Time Group and Scene authoring. Starting another Create, Edit, Duplicate, or Repair action never replaces the active draft silently.
- Saved objects and live View Chrono or Present/Audience sessions are separate. Library mutation does not retarget, terminate, or rewrite a live session or its last-valid output.
- A Needs-attention Time Group or Scene reason-disables **Open in Chrono** and **Load in Present/Audience**, names the blocking reasons, and offers Repair. Ready siblings remain usable.
- Dashboard shell, visual style and palette, Page/Section structure, chart Unit Orbit ownership, and canonical chart geometry remain unchanged while the library opens, filters, hands off, and returns.

## Exact authoring handoffs

| Library action | Owning destination | Exact entry behavior |
|---|---|---|
| Create Time Group | Sketch 005 Availability Ledger | Stage 1 — **Choose period**, with a new unsaved group draft. |
| Edit Time Group | Sketch 005 Availability Ledger | Generic Edit opens Stage 4 — **Name and review** as the saved summary; period, chart, and default summary links route to **Choose period**, **Choose charts**, and **Set defaults** respectively. |
| Duplicate Time Group | Sketch 005 Availability Ledger | Stage 4 — **Name and review**, with the complete duplicate draft and proposed `Copy of <name>` ready for explicit review/save. |
| Repair Time Group | Sketch 005 Availability Ledger | The issue's owning stage: period errors → **Choose period**; availability/membership → **Choose charts** with the affected record focused; matching/fallback → **Set defaults**; naming → **Name and review**. |
| Create Scene | Sketch 006 two-stage Scene flow | Stage 1, with Page first and Parent Time Group second; a Page or expanded-group invocation preselects only compatible context. |
| Edit Scene | Sketch 006 two-stage Scene flow | Generic Edit opens Stage 1 with saved scope; scope/frame/member links open Stage 1, while composition or chart-setting links open Stage 2 and the owning Unit Orbit control when applicable. |
| Duplicate Scene | Sketch 006 two-stage Scene flow | Stage 1, retaining the same parent Time Group and Page with a new Scene ID, shared chart references, and proposed `Copy of <name>`. |
| Repair Scene | Sketch 006 two-stage Scene flow | Frame source, observation, period, or membership issues → Stage 1 with the affected control focused; Scene/Present composition or chart-specific temporal issues → Stage 2 at the relevant canvas or Unit Orbit control. |

The library never displays a substitute period picker, availability editor, matching control, frame checklist, twin canvas, or Unit Orbit.

## Saved-object rules

- Duplicating a Time Group creates a deep-copy draft with a new group ID and new IDs for every copied child Scene. It retains period, policies, seconds per frame, child Scene configuration, and shared chart/data references; no saved object is created until explicit Save.
- Duplicating a Scene creates a new Scene draft under the same parent Time Group and same Page. It keeps shared chart references and saved Scene configuration but receives a new Scene ID and proposed unique copy name.
- Removing a Time Group opens a scoped confirmation that names every child Scene that will also be removed. It never deletes charts, data, Pages, or live session state.
- Removing a Scene names that Scene and its parent, removes only the saved Scene, and leaves the parent Time Group and sibling Scenes intact.
- A group with no child Scenes is valid and shows an explicit **No Scenes yet** state with **Create Scene**.
- A true-empty dashboard distinguishes **No saved Time Groups** from a filtered/search no-results state. Clearing filters never creates content.

## Shared fixture

The fixture reconciles the approved Sketches 005–008 vocabulary without changing those owners.

- Dashboard: **Regional Respiratory Preparedness**; timezone: **Europe/Berlin**.
- Ready Time Group: **Winter response 2026**, period **2026-01-01 through 2026-03-31**, six charts, 17 derived Default Chrono frames, and 2.5 seconds per frame.
  - Ready child Scene: **March operational pressure briefing**, Page **Executive surveillance**, Frame source **Confirmed cases**, with **Confirmed cases**, **Municipality outbreak map**, and **Hospital load** in authored order.
  - Ready child Scene: **Care capacity escalation**, shown with its distinct owning Page to preserve explicit cross-page navigation.
- Ready Time Group: **Coastal Storm Readiness — Operational Briefing**, used as the group-duplicate source and containing two named child Scenes.
- Ready Time Group: **May 15–31 Multi-agency Readiness Review**, with four saved members and the approved Interpolate/default-fallback configuration from Sketch 005.
- Needs-attention Time Group: **May Operational Tempo**.
  - Availability issue: `TEMP-FIX-C05`, **Dialysis service continuity at facilities isolated by transport or communications disruption**, has zero in-period observations after **2026-05-15**. Repair owns Sketch 005 **Choose charts** and focuses that selected Needs-attention record.
  - Matching issue: `TEMP-FIX-C03`, **Operating status of hospitals relying on backup generation and verified fuel resupply**, cannot use Interpolate. Repair owns Sketch 005 **Set defaults** and focuses its fallback.
- Needs-attention Scene: **Selected-frame clinical surge briefing**, child of **May Operational Tempo**, with a saved observation no longer available. Repair owns Sketch 006 Stage 1, **Selected frames → Observation list**.
- Empty-child example: **Displacement Monitoring** is Ready and has no Scenes.
- Long-catalogue fixture: 32 saved Time Groups and 87 child Scenes, including long realistic names, mixed Pages, Ready and Needs-attention records, and enough content to require internal catalogue scrolling without document-level horizontal overflow.

Ready fixture objects can open in the approved View Chrono or load through Present. Needs-attention objects expose the same actions in a reason-disabled state and do not alter an already-running session.

## Shared library state

All variants use the same saved objects and non-mutating library state. Switching A/B/C preserves the query, status and Page filters, expanded groups, selected object, open action menu, scroll position, and focused row. A variant switch changes presentation only.

- Search matches Time Group names, Scene names, owning Pages, chart names, and issue text.
- Status filters are **All**, **Ready**, and **Needs attention**. The Page filter applies to Scenes while keeping their parent Time Group relationship visible.
- Counts are truthful after search/filtering and distinguish dashboard-wide groups from matching page-scoped Scenes.
- The library may summarize period, chart count, Scene count, frame count, Page, last saved time, and issue count, but it does not recompute or persist a second temporal truth.
- A draft-conflict dialog names the active draft and offers **Return to active draft**, **Save active and continue** when valid, **Discard active and continue**, and **Cancel**. The requested target and current library position survive the decision.

## Variants

### A — Relationship Ledger · Preserved alternative

Time Groups form the primary full-width records. Each expands in place to show its page-labeled child Scenes, status, period, counts, issue summary, and scoped actions. Search and filters remain above one continuous, internally scrolling relationship ledger.

**Hypothesis:** the parent-child model is easiest to understand when it is visible directly, while familiar ledger rows can contain long names, status evidence, and management actions without turning the library into authoring.

**Least-resistance rationale:** it reuses the approved Evidence Ledger reading pattern and ordinary disclosure/list behavior. It needs no duplicate Page hierarchy and keeps one canonical row for each dashboard-wide Time Group.

**Reject if:** long expanded groups become hard to scan, Scene Page scope is not immediately visible, Needs-attention repair loses prominence, or routine actions require excessive disclosure travel.

### B — Page-first Scene Shelf

Pages form the primary shelves. Each shelf lists its Scenes with parent Time Group labels, while a separate dashboard-wide Time Group rail exposes groups and groups without Scenes.

**Hypothesis:** builders often remember the Page where a Scene appears, so a Page-first layout may make Scene retrieval faster while retaining parent labels.

**Reject if:** dashboard-wide Time Groups appear duplicated across Pages, group removal consequences are difficult to understand, Scenes obscure their parent relationship, or a separate group rail becomes a second library.

### C — Attention Queue

Needs-attention Time Groups and Scenes form a priority queue with issue-owned Repair actions. Ready content sits in a calmer searchable catalogue below, preserving object relationships in compact summaries.

**Hypothesis:** surfacing blocked content first minimizes repair latency and makes Chrono/Audience readiness explicit.

**Reject if:** routine browse and duplicate/remove tasks become secondary, parent-child relationships fragment across queue and catalogue, an empty attention queue looks like an empty library, or Ready content becomes harder to find.

### D — Page-grouped Relationships · Approved winner

Pages remain the first retrieval decision, but each Page lists its participating Time Groups as full relationship sections rather than separating Scenes from a group index. Each Time Group contains a three-column row of its Scenes for that Page. Needs-attention Time Groups rise above Ready groups, and Needs-attention Scenes rise above Ready siblings inside their parent while stable fixture order is otherwise preserved.

**Hypothesis:** this synthesis keeps the Page-memory advantage of B while making the parent relationship concrete and borrowing C's useful exception priority without creating a separate repair queue.

**Reject if:** repeating a cross-Page Time Group feels like duplicated ownership, three-column Scene rows become too dense for realistic actions and long names, or attention-first ordering makes the saved relationship order feel unstable.

## Representative task

1. Enter Build and choose **Time content** in the approved Build strip. Confirm the library opens without changing Page, scroll, chart geometry, chart draft, look draft, or structure draft.
2. Browse the 32-group/87-Scene fixture, search for **March operational pressure briefing**, filter to **Executive surveillance**, and return to the unfiltered long-catalogue position.
3. Expand **Winter response 2026**. Distinguish its dashboard-wide identity from page-scoped **March operational pressure briefing** and **Care capacity escalation**, then close and reopen the parent without losing selection.
4. Select **May Operational Tempo**. Confirm **Open in Chrono** and **Load in Present/Audience** are reason-disabled while Ready siblings remain available.
5. Choose Repair for the `TEMP-FIX-C05` availability issue. Confirm the handoff opens Sketch 005 **Choose charts** with the selected Needs-attention record focused; Cancel and return to the exact query, expansion, row, scroll, and focus position.
6. Repair **Selected-frame clinical surge briefing**. Confirm the handoff opens Sketch 006 Stage 1 at **Selected frames → Observation list**, then return without losing library context.
7. Duplicate **Coastal Storm Readiness — Operational Briefing**. In Sketch 005 **Name and review**, verify the new group ID, new child-Scene IDs, retained configuration, shared chart references, and proposed copy name; Cancel and return.
8. Duplicate **March operational pressure briefing**. Confirm Sketch 006 Stage 1 retains **Winter response 2026** and **Executive surveillance**, assigns a new Scene ID, and shares chart references.
9. Remove the Scene duplicate and confirm **Winter response 2026** remains. Then begin removing the duplicated Time Group and verify the confirmation names every copied child Scene; Cancel once before confirming the scoped deletion.
10. Start a new Time Group draft, return to the library, and attempt Repair on a Scene. Confirm the one-draft conflict names the active group draft and preserves both the requested Scene and current library position through Return, Save/Discard-and-continue, or Cancel.
11. Exercise a no-results search, the true-empty catalogue, and **Displacement Monitoring** with **No Scenes yet**; confirm each empty state explains its scope and next action.
12. With a Ready object already active in View Chrono or Present, duplicate or remove a different saved object and confirm the live session and last-valid Audience output remain unchanged.

## What to compare

- Which variant makes the Time Group → page-scoped Scene relationship clearest at first glance?
- Can builders distinguish Ready, Needs attention, no child Scenes, true empty, and no search results without relying on colour?
- Are long names, Page labels, periods, counts, issue reasons, and actions readable at realistic catalogue density?
- Does search/filtering preserve enough parent context to prevent a Scene from appearing standalone?
- Are Repair actions prominent without embedding authoring controls in the library?
- Does every handoff land at the exact owner and return to the same library position?
- Are duplicate and removal consequences understandable before an authoring draft or deletion begins?
- Is the one-temporal-draft conflict explicit without losing either the active draft or requested object?
- Do blocked Chrono/Audience actions explain readiness while preserving live-session separation?
- Does A earn expansion travel, B avoid relationship duplication, or C avoid over-prioritizing exceptions?

## Responsive and phone boundary

The Build library is reviewed at `1440×900`, `1200×900`, `1024×768`, and `768×1024`. At supported tablet sizes filters, action groups, expanded relationships, issue summaries, and internal catalogue scrolling may recompose, but object identity, parent/Page scope, status, and every management action remain reachable without document-level horizontal overflow or canonical geometry mutation.

At `390×844`, View is the only supported product mode. Build and Present show the persistent, non-dismissible unsupported-mode notification above product chrome with **Switch to View**. Detection does not redirect, disable controls, discard the library position, or erase an active temporal draft. Phone width creates no Build-library acceptance requirement. View Chrono remains governed by Sketch 007; Audience remains unaffected and product-chrome-free.

## Accessibility, focus, and state

- Time Group and Scene collections expose parent-child relationships, Page scope, expanded state, status, issue count, and matching-result counts programmatically.
- Search, filters, disclosure, action menus, Create, Edit, Duplicate, Repair, Remove, and conflict resolution are keyboard and touch operable with visible focus and at least 44-by-44 CSS-pixel essential targets.
- Ready and Needs-attention meaning, blocked action reasons, destructive scope, and current selection never rely on colour alone.
- Opening and closing dialogs or action menus restores focus to the invoking object or its valid successor; authoring return restores a valid library target even after deletion.
- Long names, 200-percent text, logical reading order, greyscale, reduced motion, and internal scrolling retain every fact and action.
- Status and handoff changes are announced without moving focus unexpectedly.

## Architecture fit

All candidates remain feasible with the existing React, Vite, CSS, ECharts, AppFrame, Build strip, portal/dialog, and canonical renderer foundations. One library query/filter/selection state and one saved temporal-content projection feed three containment views; authoring routes call the approved Time Group or Scene owner rather than duplicating their state machines.

No candidate introduces a runtime-only dependency, new framework, forked renderer, alternate temporal truth, free-form geometry engine, or Audience preset store. `AUD-PRESET-01` remains deferred exactly as recorded in the MANIFEST.

## Step-10 codification notes

Later specification should codify the saved-content library entry point, parent-child projection, Ready/Needs-attention launch gating, exact authoring return context, one-temporal-draft conflict, deep-copy/remove consequences, and saved-object/live-session separation.

Codification must reference, not duplicate, Sketch 005 Time Group stages and Sketch 006 Scene stages. It must preserve dashboard-wide Time Group ownership, page-scoped Scene ownership, shared chart references, canonical geometry, the approved shell/look/structure boundaries, and the deferred `AUD-PRESET-01` boundary.

## Low-risk tuning left after selection

- Exact row density, disclosure indentation, Page-pill width, issue-summary length, action-menu grouping, filter wrapping, and tablet internal-scroll thresholds.
- Final concise labels, icons, focus-ring tokens, and reduced-motion treatment.

## Decision status

**Approved — D: Page-grouped Relationships.** It keeps Page-first retrieval while making every parent Time Group explicit, gives its page-scoped Scenes a scannable three-column row, and elevates Needs-attention groups and Scenes locally without splitting routine browsing into a separate repair queue.

A is preserved but rejected because the parent-first disclosure ledger adds expansion travel before the Page context is visible. B is preserved but rejected because its separate Scene shelf and Time Group index split the relationship the library must explain. C is preserved but rejected because a separate exception queue fragments parent-child browsing and gives repair work too much structural ownership.

## Relevant approved inputs

- `.planning/sketches/005-time-group-authoring/README.md` — Availability Ledger, exact four stages, Needs-attention semantics, duplicate Time Group behavior, and realistic temporal evidence.
- `.planning/sketches/006-scene-authoring/README.md` — two-stage Scene flow, page-first parent selection, Stage 1 frame evidence, Stage 2 twin canvases, and Unit Orbit ownership.
- `.planning/sketches/007-view-chrono/README.md` — View Chrono launch/readiness, page-scoped Scene navigation, and phone support.
- `.planning/sketches/008-present-controller/README.md` — Present/Audience last-valid output, Needs-attention rejection, and saved-versus-session boundaries.
- `.planning/sketches/009-shared-shell-and-product-chrome/README.md` — Layered Command Crown, approved Build strip, state continuity, and phone boundary.
- `.planning/sketches/011-dashboard-structure-authoring/README.md` — Inline Build Structure Controls and canonical Page/Section ownership.
- `.planning/sketches/MANIFEST.md` — sketch sequence, cross-sketch support boundary, and deferred `AUD-PRESET-01`.
