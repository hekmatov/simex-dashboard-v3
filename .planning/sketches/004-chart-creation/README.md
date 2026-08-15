---
sketch: 004
name: chart-creation
question: "How should guided chart creation combine progressive configuration, canonical chart preview, and non-mutating placement proof?"
status: Approved
winner: "A — Staged Proof Studio"
tags: [build, chart-creation, workflow, canonical-preview, placement-proof]
---

# Sketch 004: Chart creation

## Design question

How should a builder move through the approved six-stage chart-creation workflow while keeping the canonical chart render and the non-mutating placement projection distinct, current, and understandable?

The round-one comparison changes one primary axis only: the containing surface and its spatial relationship to the unchanged Build canvas. The fixture, data, six stages, state transitions, validation, proof rules, creation semantics, visual language, and task script are identical across all variants.

## How to view

Open `http://127.0.0.1:8765/.planning/sketches/004-chart-creation/index.html` while the local sketch server is running.

## Scope

### In

- The visual and spatial organization of the six approved stages.
- The relationship between current-stage controls, canonical chart preview, and placement projection.
- Progressive disclosure of essential, contextual, and advanced controls.
- Destination, named-anchor placement, and the approved chart-owned 2 by 4 footprint picker.
- Draft status, suspension, resume, meaningful discard, validation, backtracking, review, creation, reveal, and ordinary editor handoff.
- Supported authoring adaptation at 768 by 1024, 1024 by 768, 1200 by 900, and 1440 by 900.
- The approved unsupported-phone Build notification boundary.

### Out

- Production routes, components, state, schemas, tests, persistence, data plumbing, or renderer changes.
- Reopening the six stages, draft lifecycle, placement rules, atomic commit semantics, proof definitions, or Unit Orbit handoff.
- Free-form panel dimensions or coordinates.
- Chart-owned temporal matching, Scene policy, playback, authentication, onboarding, import/export, or package mutation.
- A fourth top-level mode or a separate implementation plan.

## Fixed fixture

The shared CREATE-FIX synthesis uses one realistic dashboard and one draft throughout all three variants.

- Dashboard: **Regional Respiratory Preparedness**
- Page: **Executive surveillance**
- Destination section: **Transmission and demand**
- Existing named neighbours: **Confirmed cases**, **Regional R values**, **Vaccination rate**, and **Hospital demand signal**
- Draft chart identity: **CREATE-FIX/chart/respiratory-pressure**
- Candidate chart types: line chart, clustered columns, heatmap, and municipality map
- Existing source: **Weekly respiratory surveillance · reconciled**
- Long source alternative: **Regional hospital and laboratory reporting feed — validated weekly reconciliation**
- Roles: reporting date, municipality, confirmed cases, positivity rate, hospital admissions, and age group
- Temporal memberships: **Winter response 2026** and **Management review cadence**
- Canonical preview states: awaiting, updating, current, stale last-good, empty, invalid, failure, and retry
- Placement states: append, before or after a named neighbour, changed anchor, missing anchor, and current projection
- Commit states: ready, serialized busy, deterministic failure, ambiguous outcome, and durable success

These states are fake and deterministic. No production dependency or Quorum state is used.

## Representative task

1. Open **Add chart** in Build and choose the page and section.
2. Choose append or before/after a named neighbour and select a chart-owned footprint in the 2 by 4 picker.
3. Inspect the current placement projection and its textual equivalent without changing the saved dashboard.
4. Search for and choose a chart type, then change to a type with a named compatibility loss; cancel once and confirm once.
5. Choose the existing reconciled source.
6. Map required roles and the reporting-date temporal field; configure missing and duplicate handling.
7. Encounter a missing-role or zero-output validation problem, follow its repair link, and backtrack without losing compatible work.
8. Accept or edit the title, reveal advanced configuration, and change a visible property.
9. Inspect the canonical chart render separately from the placement projection and verify that each has its own revision and readiness.
10. Close to suspend, resume the exact draft, then exercise meaningful discard and keep the draft.
11. Complete Review, activate **Create chart**, observe the fake serialized non-cancellable commit, and create exactly one chart.
12. Reveal the committed chart and hand the same identity to the ordinary Unit Orbit editor.

## Shared behavioral contract

All variants use one shared state object. Switching A, B, or C must preserve the active stage, values, validation, scroll context where feasible, destination, anchor, footprint, proof revisions, disclosure, dirty state, and focus target. A variant switch may change only presentation.

The stage order is exactly:

1. Destination
2. Chart type
3. Data source
4. Map and prepare data
5. Configure chart
6. Review and create

Only the approved stage statuses appear:

- Not started
- In progress
- Complete
- Needs attention
- Waiting on prerequisite

**Create chart** appears only in Review. Close and root Escape suspend; neither saves nor discards. A meaningful discard names only the draft categories that are present. Type or source changes retain compatible values and name every value that would be lost before confirmation.

The canonical render and placement projection are independent proofs:

- The canonical render uses the prepared data, mappings, transforms, title, and configuration intended for the committed chart.
- The placement projection uses the real destination order, named neighbour identity, footprint, grid rules, insertion point, and projected reflow.
- Each proof has its own current/stale/error state and correlated revision.
- Neither proof can satisfy or visually masquerade as the other.
- The saved dashboard fixture cannot mutate before durable creation.

## Round-one variants

### A — Staged Proof Studio · Approved winner

A large, geometry-neutral overlay remains visibly connected to Build. A six-stage navigator leads to one scrollable stage body and a stable dual-proof deck.

**Hypothesis:** concentrated authoring plus continuously reachable proof surfaces provides the clearest workflow with the least new React/CSS machinery. It can reuse the current modal focus scope, reducer-like stage state, generated fields, and canonical preview patterns; the truthful placement projection is the principal new primitive.

**Risk:** it may feel like a conventional wizard and cover more dashboard context than necessary.

**Architecture fit:** least-complex candidate.

### B — Full-viewport Creation Workbench · Rejected, preserved

A dedicated full-viewport authoring layer uses a vertical stage rail, a central configuration workspace, and a persistent proof column.

**Hypothesis:** removing competing dashboard chrome gives long mappings, validation, and both proofs enough room to remain legible simultaneously.

**Risk:** the stronger context change may make destination and post-create return feel remote, and it requires more responsive scroll and focus coordination.

### C — Edge-docked Guided Layer · Rejected, preserved

A non-resizing overlay dock keeps the real Build canvas visible. The canonical preview lives with the draft controls while the placement projection is presented against bounded destination context without mutating or resizing the dashboard.

**Hypothesis:** keeping the destination visible provides the strongest spatial understanding and the shortest transition back to ordinary Build work.

**Risk:** the dock, long forms, and two proofs may compete for space at tablet widths or obscure useful dashboard context.

## What to compare

- How quickly the destination and active stage can be understood.
- Whether canonical preview and placement projection remain visibly distinct without repeated explanation.
- Whether both proofs stay reachable during long mapping and configuration tasks.
- Whether errors and prerequisite states point to a clear repair location.
- Whether backtracking feels safe and compatible work visibly survives.
- Whether the surface feels connected to Build without changing canonical dashboard geometry.
- Whether Review makes both proofs, all six stages, and the final action understandable.
- Whether the success handoff to the committed chart and Unit Orbit feels continuous.
- Whether the same workflow remains usable at supported tablet and desktop viewports.
- Whether the containing surface earns its complexity in comparison with Variant A.

## Winner or synthesis

**Approved — A: Staged Proof Studio.**

The selected direction is a large geometry-neutral overlay that remains visibly connected to Build, keeps the six-stage navigator stable, and gives the canonical render and placement projection a persistent dual-proof deck.

## Why it won

Variant A creates a bounded, legible creation task without turning chart creation into a separate application or forcing long forms into a narrow dock. It preserves the dashboard as visible context, maintains a clear return path to Build, makes both proofs continuously reachable and visibly independent, and follows the least-complex path supported by the current modal, focus-scope, generated-form, and canonical-preview architecture.

## Why each alternative was rejected

- **B — Full-viewport Creation Workbench:** rejected because the full takeover removes more Build context than the task needs and creates a stronger context switch without a compensating improvement in proof comprehension. Its additional responsive grid, focus, and scroll coordination would add complexity to a workflow already handled clearly by the bounded studio.
- **C — Edge-docked Guided Layer:** rejected because the dock compresses long source, mapping, validation, and configuration content while also constraining the two independent proofs. At tablet widths it becomes a covering sheet, weakening the destination-context advantage that justified the dock.

Both rejected variants remain interactive evidence.

## Retained cherry-picks

No cross-variant synthesis was requested. Retained implementation inputs are B's disciplined separation between configuration and proof regions at wide viewports, and C's non-resizing overlay principle plus explicit destination-context cues. Neither retained input changes Variant A's containing surface.

Shared contractual behavior is fixed rather than a cherry-pick.

## Responsive boundary

Build authoring is evaluated at 768 by 1024, 1024 by 768, 1200 by 900, and 1440 by 900. At phone width, View remains the supported mode. Build shows the persistent unsupported-mode notification and a working **Switch to View** action; it does not redirect, discard, disable, or erase the draft.

Responsive adaptation may change stacking, proof switching, or internal scroll ownership. It may not omit a stage, proof, repair action, review item, or create/handoff function, and it may not introduce root horizontal overflow.

## Accessibility and interaction

- Essential actions are at least 44 by 44 CSS pixels.
- The stage navigator and footprint picker are keyboard-operable composite widgets.
- Focus is visible and restored logically after dialogs, suspension, and handoff.
- Status never depends on colour alone.
- Errors name their owning stage/control and focus a meaningful repair target.
- Reduced motion removes non-essential movement without changing meaning.
- Long names, 200 percent text, touch, and internal scrolling remain usable.
- No backdrop click discards the draft.

## Unresolved items

- Exact proof-deck proportions, internal sticky boundaries, and scroll ownership are low-risk implementation tuning.
- The supported tablet implementation may stack the two proofs while retaining direct access to both; exact breakpoints remain implementation detail.
- Low-risk final copy and motion tuning.
- Step 10 codification of the approved phone boundary and the Sketch 002 universal footprint correction where older normative text still conflicts.

No high-risk behavioral question is reopened here.

## Relevant authority

Normative:

- `docs/superpowers/specs/2026-08-12-chart-creation-design.md`
  - ownership and lifecycle
  - six-stage model
  - destination and placement
  - registry and source selection
  - mapping, preparation, and temporal membership
  - canonical preview
  - change reconciliation
  - review, atomic creation, and handoff
  - responsive/accessibility and CREATE-FIX
- `docs/superpowers/specs/2026-08-12-three-mode-dashboard-ui-spec.md`
  - Build ownership
  - View/Build parity
  - authoring-surface visibility and coverage
- `.planning/sketches/002-contextual-panel-editing/README.md`
  - Unit Orbit handoff
  - chart-owned universal 2 by 4 footprint
  - scoped draft boundaries
- `.planning/sketches/003-dashboard-visual-language/README.md`
  - approved visual grammars, palettes, appearance modes, and paint-only variability
- `.planning/sketches/MANIFEST.md`
  - approved phone support boundary

Historical runtime and earlier four-stage modal geometry are evidence only, not authority.
