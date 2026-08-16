---
sketch: 011
name: dashboard-structure-authoring
question: "How should builders manage pages and sections while keeping structural consequences and the actual dashboard understandable?"
status: Approved
winner: D — Inline Build Structure Controls
tags: [build, structure, pages, sections, hierarchy, consequences, responsive]
---

# Sketch 011 — Dashboard structure authoring

## Design question

How should Build expose complete page and section structure operations while preserving orientation, showing downstream consequences before mutation, and keeping chart-local and temporal authoring in their already-approved owners?

This replacement round holds **A — Layered Command Crown**, **Evidence Ledger**, **Brighter Vellum**, the shared fixture, Structure-draft semantics, and consequence rules fixed. The earlier A/B/C containment directions are rejected and preserved as decision history. **D — Inline Build Structure Controls** is the approved winner.

## How to view

Open `http://127.0.0.1:8765/.planning/sketches/011-dashboard-structure-authoring/index.html` while the local sketch server is running.

## Decision boundary

### In

- Select, create, rename, reorder, move, merge, and remove pages and sections directly in the Build canvas.
- Compare the visual clarity and interaction cost of D's inline page-navigation and section-header controls.
- Preserve explicit page, section, chart, Time Group, and Scene identity throughout a structural operation.
- Preview every affected chart and dependent Time Group or Scene before a destructive or cross-page action mutates the Structure draft.
- Require an explicit chart disposition when removing a non-empty Section, consequence proof before destructive mutation, and protection against removing the final Page.
- Show the scoped clean/dirty Structure draft, Save/Discard Structure, cancellation, dirty Close, and consequence-proof states.

### Out

- Chart data, appearance, axes, interaction, footprint/size, or other chart-property editing; those remain in Sketch 002 Unit Orbit.
- Individual chart reorder or movement. Charts are read-only consequences in this sketch; chart movement retains Sketch 002 direct title drag, visible empty insertion targets, and keyboard alternatives.
- Time Group or Scene membership, timing, matching, frame, and composition authoring; those remain in Sketches 005 and 006.
- Dashboard style, colour profile, chart-colour mode, or appearance selection; those remain in the approved Sketch 010 drawer.
- Free-form chart coordinates, arbitrary dimensions, unbounded canvas placement, or a new layout model.
- Production components, schemas, persistence, authorization, tests, package operations, or implementation planning.

## Shared fixture

- Dashboard: **Pandemic & Disaster Preparedness Center**; scenario: **HeV-A26 Day 2 Simulation**.
- Initial pages: **Home** (1 section / 2 charts), **Biomedical** (active; 4 sections / 23 charts), and **Socio-economic** (3 sections / 15 charts).
- Biomedical sections: **Outbreak dynamics**, **Health-system pressure and coordination** (selected), **Environmental surveillance**, and **Vaccination**.
- Primary contained chart: `bio_admissions` — **New ICU and hospital admissions**.
- Time Group: **National outbreak and health-system playback**.
- Fixture Scene: **National pressure briefing**.
- Created destination: **Operations briefing**, containing the empty Section **Briefing highlights**.

## Direct Build-canvas contract

D keeps structure authoring on the dashboard objects builders already see. It introduces no separate atlas, orbit, tree, or structure workspace.

- Every Page in the dashboard navigation is a draggable button.
- **+ Add page** sits beside the Page navigation.
- Adjacent Page actions expose Rename, Move earlier, Move later, and Remove without opening a second structure surface.
- Every Section header exposes right-aligned **Move earlier**, **Move later**, **Move to page**, and **Remove** controls.
- Activating a Section title replaces that title with a labeled inline field. There is no separate Section **Rename** button.
- **+ Add section** appears at the end of the active Page.
- Harmless Page and Section reorder actions update the Structure draft immediately and do not open a consequence dialog.
- Destructive actions and cross-page moves open a named consequence dialog before mutation. It identifies affected charts, Time Groups, and Scenes rather than presenting only counts.
- Removing a Section requires one of three explicit dispositions: **Delete charts**, **Merge into section above**, or **Merge into section below**. Unavailable adjacent destinations are disabled rather than silently substituted.
- **Save Structure** and **Discard Structure** remain scoped actions in the Build strip. Closing or leaving Build with a dirty Structure draft retains the inherited **Keep editing**, **Discard Structure**, and **Save Structure** resolution.
- No control in D moves an individual chart. Chart cards appear only as read-only evidence of the structural consequence.

## Shared operation and draft contract

- Selection is non-mutating and creates no draft.
- Create, inline rename, reorder, move, merge, and remove change only the Structure draft until **Save Structure**.
- **Discard Structure** restores the last saved Page/Section hierarchy without changing chart properties, temporal objects, or dashboard look.
- A cross-page move of **Health-system pressure and coordination** previews that all contained charts move, **National outbreak and health-system playback** remains attached, and the page-scoped **National pressure briefing** reference to `bio_admissions` is removed. Chart properties, grid order, and size remain unchanged.
- The named consequence preview is computed before mutation and remains available until the builder confirms or cancels.
- Removing a Page requires consequence proof, and the final Page cannot be removed.
- The saved View and Build dashboards use the same resulting Page/Section hierarchy and canonical chart geometry after a successful save.

## Candidates and preserved directions

### D — Inline Build Structure Controls · Approved

Page controls live beside Page navigation; Section controls live in Section headers; Section titles become inline rename fields; add actions sit at the end of their corresponding collections. Lightweight reorders update the Structure draft immediately, while destructive or cross-page actions use the shared named consequence dialog.

**Settled rationale:** structure operations are easiest to discover and understand when they stay attached to the real Page navigation and Sections rather than opening a parallel structure workspace.

**Approval basis:** D keeps harmless reorders immediate, gates destructive and cross-page actions with named consequences, preserves chart ownership, and adds structure controls without introducing an Atlas, Orbit, or Crown tree.

### A — Structure Atlas → Compact Operation Band · Rejected/preserved

A kept a persistent Structure Atlas beside the dashboard and added a compact canvas band during moves. It is preserved for comparison, but rejected because it duplicates hierarchy in a parallel surface and introduces a handoff between the Atlas, operation band, and actual dashboard.

### B — Canvas-native Structure Orbit · Rejected/preserved

B attached a contextual Structure Orbit to a selected Page or Section. It is preserved for comparison, but rejected because a floating authoring surface competes with the same dashboard content that must remain visible for structural judgment.

### C — Crown Structure Tree · Rejected/preserved

C placed a bounded structure tree beneath the Layered Command Crown. It is preserved for comparison, but rejected because it duplicates Page navigation and turns product chrome into a second structure workspace.

## Representative task for D

1. Enter Build on the active **Biomedical** Page and identify the Page-navigation actions, Section-header actions, and clean Structure draft without opening a separate structure surface.
2. Use **+ Add page** beside navigation to create **Operations briefing** and confirm its initial **Briefing highlights** Section is empty.
3. Use the adjacent Page actions to rename and reorder **Operations briefing**; drag its Page button once, then repeat the same logical reorder with **Move earlier** or **Move later**. Confirm each harmless reorder immediately marks the Structure draft dirty without opening a dialog.
4. Use **+ Add section** at the Page end, activate the new Section title to enter the inline field, rename it, and confirm that no separate Section Rename button exists.
5. Use the Section-header **Move earlier** and **Move later** controls and confirm the draft updates immediately.
6. Start removing **Health-system pressure and coordination**. Inspect the named charts, Time Group, and Scene in the consequence dialog and compare the explicit **Delete charts**, **Merge into section above**, and **Merge into section below** dispositions; Cancel without mutation.
7. Use **Move to page** on **Health-system pressure and coordination** and choose **Operations briefing**. Before confirmation, verify that `bio_admissions` and the other contained charts move, **National outbreak and health-system playback** remains attached, and **National pressure briefing** no longer includes `bio_admissions`.
8. Cancel once, repeat the cross-page move, acknowledge the consequence proof, and confirm. Verify that chart properties, grid order, and size did not change and that no individual chart movement control appeared.
9. Exercise **Save Structure** and **Discard Structure** in the Build strip, then exercise dirty Close with **Keep editing**, **Discard Structure**, and **Save Structure**.
10. Confirm that Page removal uses the named consequence dialog and that Remove is unavailable for the final remaining Page.

## Settled evaluation

D was approved on the following basis:

- Inline controls make Page and Section structure findable without creating a separate structure workspace.
- **+ Add page** and **+ Add section** remain visually associated with the collections they extend.
- Page rename/reorder/remove actions stay adjacent to navigation without weakening Page selection.
- Section-header Move earlier/later, Move to page, and Remove actions remain readable at realistic chart density.
- Activating a Section title into a labeled inline field makes rename available without a separate Rename button.
- Immediate harmless reorder is visibly distinct from consequence-gated destructive and cross-page actions.
- Named consequence dialogs identify affected charts, Time Groups, and Scenes before confirmation.
- Section-removal dispositions and final-Page protection are explicit.
- Cancellation, dirty Close, Keep editing, scoped Save/Discard Structure, and viewport changes preserve orientation.
- Chart-local, temporal, look, and structure ownership boundaries remain visible.

## Responsive and phone boundary

Build structure authoring is reviewed at `1440×900`, `1200×900`, `1024×768`, and `768×1024`. At supported tablet sizes Page actions, Section-header actions, inline fields, and consequence dialogs may wrap or recompose internally, but every object name, operation, consequence, and Save/Discard Structure action remains reachable without document-level horizontal overflow or mutation of canonical dashboard geometry.

At `390×844`, View remains the only supported mode. Build and Present show the persistent, non-dismissible unsupported-mode banner above product chrome with **Switch to View**. Detection does not redirect, disable controls, or discard a suspended Structure draft. Phone width is best-effort evidence only and creates no Structure-authoring acceptance requirement. Audience remains unaffected and product-chrome-free.

## Accessibility, focus, and movement equivalence

- Page navigation and Section collections expose programmatic relationships, current selection, counts, and draft status.
- Page and Section structural controls remain keyboard and touch operable with visible focus and at least 44-by-44 CSS-pixel essential targets.
- Activating a Section title enters a labeled inline field; Enter commits, Escape cancels, and focus returns to the Section title.
- Page dragging is never the only reorder path. Adjacent **Move earlier** and **Move later** controls provide the same Structure-draft result.
- Opening a consequence or dirty-Close dialog places focus at a meaningful control; closing, cancelling, or saving restores focus to the invoking object or its valid successor.
- Destructive meaning, selected scope, dirty state, and consequences never rely on colour alone.
- Long labels, 200-percent text, logical reading order, greyscale, reduced motion, and internal scrolling retain every fact and action.

## Architecture fit

D remains feasible with the existing React, Vite, CSS, ECharts, AppFrame, shared Build strip, portal/dialog, and canonical renderer foundations. It adds direct buttons, a temporary inline field, draft-state mutations, and the existing consequence dialog around the canonical Page and Section renderer; it does not require a parallel structure view.

No direction introduces a runtime-only dependency, new framework, forked renderer, Quorum change, free-form geometry engine, or alternative dashboard truth. This disposable sketch declares compatibility only and does not choose production components or file boundaries.

## Step-10 codification notes

The current UI contract already requires Page create/select/rename/reorder/remove, Section create/manage/edit/reorder/remove-or-merge, explicit non-empty disposition, and truthful zero states. Sketch 011 does not reopen those guarantees.

Step 10 must narrowly codify the user-approved operations that are not yet explicit in `SCOPE-02`/`SCOPE-03`: **Page merge**, **moving a Section between Pages**, and a pre-mutation consequence preview that names affected charts plus dependent Time Groups and Scenes. Codification must preserve chart identity/reference semantics, require explicit disposition when an operation would invalidate a reference, and prohibit silent cascades.

This clarification does not transfer chart property/size/reorder ownership from Sketch 002, temporal authoring from Sketches 005/006, visual-look ownership from Sketch 010, or permit free-form placement.

## Low-risk tuning left after selection

- Exact Page-action spacing, Section-header button grouping, inline-field width, drag feedback, consequence-list density, and supported-tablet wrapping thresholds.
- Final concise labels, icon choices, focus-ring tokens, and reduced-motion treatment.

## Decision status

**Approved. Winner: D — Inline Build Structure Controls.** A, B, and C remain explicitly rejected and preserved as decision history.

## Relevant approved inputs

- `.planning/sketches/002-contextual-panel-editing/README.md` — chart-local Unit Orbit, chart-owned footprint, direct chart movement, empty insertion targets, draft ownership, and View/Build geometry parity.
- `.planning/sketches/003-dashboard-visual-language/README.md` — Evidence Ledger and Brighter Vellum treatment, state grammar, long-content behavior, and non-colour status requirements.
- `.planning/sketches/005-time-group-authoring/README.md` — Time Group ownership and Availability Ledger.
- `.planning/sketches/006-scene-authoring/README.md` — Scene ownership, two-stage flow, and consequence-sensitive chart references.
- `.planning/sketches/009-shared-shell-and-product-chrome/README.md` — A: Layered Command Crown, protected product chrome, state continuity, and exact phone boundary.
- `.planning/sketches/010-dashboard-look-controls/README.md` — approved Contextual Visual Settings Drawer and visual-setting ownership.
- `docs/superpowers/specs/2026-08-12-three-mode-dashboard-ui-spec.md` — `SCOPE-02`, `SCOPE-03`, `SCOPE-07`, `VIS-02`/`VIS-03`, transactional edit states, zero states, long content, responsive coverage, and the Step-4 candidate boundary.
