# Chrono Authoring Reconciliation Design

Date: 2026-08-22
Status: Revised approved design; pending implementation-plan approval

## Purpose

Reconcile the dashboard's temporal authoring surfaces with accepted Sketches 005, 006, and 012 while establishing **Chrono Group** as the sole temporal-group terminology throughout the product, persisted configuration, source identifiers, tests, fixtures, and documentation.

There are no saved-dashboard compatibility requirements. The implementation therefore performs a direct domain rename rather than retaining aliases or adding a migration layer.

## Root cause and existing divergence

The Step 7 implementation preserved much of the temporal state and validation logic, but its component tests reduced the accepted sketches to a small set of labels and state transitions. They did not assert the sketches' information architecture, ledger regions, content-first studio entry, or page grouping. As a result:

- Sketch 005 became a functional four-tab form without the complete Staged Proof Studio composition.
- Sketch 006 became a two-tab form with a simplified chart list and twin canvas rather than the accepted familiar ledger handoff.
- Sketch 012 became a flat library grouped only by Ready and Needs attention rather than page-grouped Time Content.
- Build commands open the editors directly and bypass their intended content landing surfaces.
- `Stay` was promoted from an exit-conflict choice into a permanently visible Chrono editor action where it has no effect.
- broad studio input CSS applies full-width, 44-pixel text-field dimensions to native checkbox inputs; live inspection measured Chrono selectors as wide as 218 pixels.
- the obsolete Auto/Tablet/Phone Layout control remains in Build commands.

## Terminology and schema contract

The canonical product terminology is **Chrono Group**, **Chrono Groups**, and **Chrono Studio**. The previous product vocabulary must not remain in the dashboard or documentation.

The rename is comprehensive rather than presentational. It includes:

- the persisted dashboard temporal collection becoming `chronoGroups`;
- the Scene ownership field becoming `chronoGroupId`;
- component, module, exported symbol, reducer, action, selector, CSS, test, and fixture names;
- chart-authoring membership labels and data structures;
- View Chrono and Present consumers;
- validation, recovery, empty-state, status, and accessibility text;
- packaged dashboard configuration and generated catalogue/configuration outputs; and
- every dashboard documentation occurrence, including historical planning and audit prose where it describes the domain.

No compatibility alias, fallback reader, dual-write behavior, or legacy migration is retained. Unrelated uses of the generic programming word `group` remain unchanged when they do not represent a Chrono Group.

## Build entry and navigation

The Build command area exposes two temporal entry points:

- **Chrono Studio** opens the Chrono Group library and provides **Create Chrono Group**. Selecting a Chrono Group opens its read-first content page rather than its editor.
- **Scene Studio** opens the page-grouped Scene library and provides **Create Scene**. Selecting a Scene opens its read-first content page rather than its editor.

The standalone **Time Content** Build command is removed because the two studios own their respective content. The top-level Build Chrono Groups command uses the same Chrono Studio entry instead of selecting a legacy inspector record.

Each content page has an explicit **Edit** action that opens the corresponding editor with the selected Chrono Group or Scene fully populated. A Chrono Group content page also provides the second approved **Create Scene** entry point; it opens a new Scene draft with the parent Chrono Group already selected. Create Scene does not appear in the Chrono Studio landing page.

Opening a content page or editor records the studio, active page, query/filter state, scroll position, selected record, and invoking control. Closing or completing the editor returns to that record's content page; returning again restores the originating studio context. The existing independent-draft and Context Shelf behavior remains authoritative.

The legacy Auto/Tablet/Phone Layout fieldset is removed from Build commands. This does not change the canonical renderer or its responsive behavior.

## Chrono Studio and Create Chrono Group

Chrono Studio is a content-first authoring surface. Its landing view lists Chrono Groups and supports search, status, and content-page navigation. Its sole landing-page creation action is **Create Chrono Group**, whose editor implements Sketch 005.

The Chrono Group content page is read-first. It summarizes the group's identity, period, matching defaults, cadence, coverage, member charts, affected pages, and child Scenes. Member charts and child Scenes are organized under owning page headings. The page exposes **Edit** and **Create Scene**. Edit opens the existing group in the same four-stage editor with every field populated. Create Scene opens a new Scene draft with this Chrono Group fixed as its initial parent.

Create Chrono Group retains four stages while moving identity to the beginning:

1. **Name and period** — requires a unique Chrono Group name, inclusive start/end period, and displays the dashboard timezone.
2. **Choose charts** — uses the accepted Availability Ledger grammar with distinct **Selected for this Chrono Group**, **Needs attention**, and **Available** regions. Whole chart records move between regions; variable ranges, in-period counts, observation ticks, page, section, and non-colour status remain visible.
3. **Set defaults** — configures matching policy, required per-member fallbacks, and seconds per frame.
4. **Review** — summarizes identity, period, timezone, members, affected pages, derived frame count, matching, cadence, coverage gaps, and required Scene consequences before one atomic save.

The editor keeps the accepted staged studio structure: persistent identity/status header, four-stage navigator, independently scrolling stage body, visible validation and repair ownership, and fixed action footer.

The normal footer contains navigation, Save Chrono Group, and Discard actions. It does not contain Stay. **Stay** appears only in a dirty-draft exit conflict and means cancel the requested navigation while preserving the draft.

## Scene Studio and Create Scene

Scene Studio is also content-first. Its landing view lists Scenes by owning page and identifies each parent Chrono Group. Its creation action is **Create Scene**. Selecting a Scene opens a read-first content page summarizing its identity, parent, owning page, period, frames, chart composition, Scene View widths, Present subset/layout, matching behavior, cadence, and status. The content page's **Edit** action opens the existing Scene in the same two-stage editor with every field populated.

Create Scene retains the accepted two-stage interaction model from Sketch 006:

1. **Select and define** — places Scene name first, then parent Chrono Group, owning page, contained period, membership ledger, and frame-source/calendar configuration. The membership ledger uses **Selected for this Scene**, **Needs attention**, and **Available from parent Chrono Group** regions.
2. **Arrange and configure** — presents the accepted Balanced Twin Canvas for Scene View and Present, with separate order, Scene width, Present inclusion/layout, matching overrides, cadence, and Audience date-position settings.

The Scene identity band always shows the draft name and lineage as parent Chrono Group → Scene. One Scene draft owns both stages and one Save Scene transaction. Canonical dashboard chart order and footprint are never mutated by Scene arrangement.

## Studio content pages and page grouping

The two studios and their content pages follow Sketch 012 rather than using Ready and Needs attention as the primary hierarchy.

- Chrono Studio lists each dashboard-wide Chrono Group once.
- A Chrono Group content page organizes member charts and child Scenes beneath owning page headings.
- Scene Studio organizes Scenes beneath owning page headings; a Scene appears once and identifies its parent Chrono Group.
- Dashboard-wide Chrono Group information is never duplicated as separate mutable records for every participating page.
- Ready and Needs-attention remain explicit statuses within cards and page sections, not the top-level grouping.
- Search and studio-specific filters preserve page grouping where applicable and distinguish an empty library from no matching results.
- Create, edit, duplicate, remove, repair, failure recovery, and running-session isolation retain their existing transactional semantics.

Chrono Studio, Scene Studio, both record content pages, and both editors consume one shared temporal content truth. Navigation state changes only the current read or edit projection and never duplicates authored content.

## Checkbox and radio control contract

All dashboard checkboxes and radios receive a shared native-control rule rather than inheriting text-field geometry.

- The visible native control is conventionally sized, normally 18–22 CSS pixels.
- The associated label or row provides the larger clickable/touch target; the native square itself is not stretched to 44 pixels.
- Checkbox/radio selectors are explicitly excluded from broad text-input width, height, minimum-height, and padding rules.
- Alignment, focus visibility, checked/disabled state, and selected colour use the active dashboard style tokens.
- The scan covers Build commands, Chrono authoring, Scene authoring, New Chart, chart editing, View controls, and Present controls.

This preserves adequate web activation targets while eliminating visually oversized controls.

## State, validation, and persistence

The existing invariant remains: one V3 dashboard-content truth supplies Build, View, and Present. The rename changes that truth's schema directly; it does not introduce adapters or parallel state.

Chrono Group and Scene drafts remain independent from dashboard layout and selected-chart drafts. Save validates and commits the complete object atomically. Failed saves retain the draft and distinguish storage unavailable, session-only persistence, and quota exhaustion. Discard restores the last committed value. Exit conflicts continue to offer Save, Discard, or Stay without exposing those choices as ordinary editor controls.

The running View or Present temporal session remains an immutable snapshot. Authoring changes signal that newer authored content exists but never mutate or restart the active session.

## Implementation boundaries

This reconciliation includes the temporal authoring components, their Build integration, schema/configuration consumers, focused styles, tests, fixtures, generated configuration inputs, and documentation terminology.

It does not redesign View Chrono playback, Present/Audience composition, Dashboard Look, or the canonical renderer except where those surfaces consume renamed Chrono Group fields or display renamed terminology. It does not add compatibility support for retired saved data.

## Verification

Implementation proceeds in independently testable slices:

1. domain/schema rename and configuration consumers;
2. content-first studio, record-detail, edit, and return navigation;
3. Sketch 005 Chrono Group flow;
4. Sketch 006 Scene flow;
5. checkbox/radio normalization and Build-control cleanup;
6. documentation terminology sweep.

Focused tests must prove:

- no retired temporal-group terminology or persisted keys remain;
- Chrono Studio and Scene Studio open their respective content landing states;
- Chrono Studio offers Create Chrono Group but not Create Scene;
- Scene Studio offers Create Scene;
- selecting a Chrono Group or Scene opens its read-first content page;
- each content page's Edit action opens a fully populated editor;
- a Chrono Group content page offers the second Create Scene action with its parent preselected;
- names are editable in the first stage of both creation flows;
- normal Chrono editing has no Stay action while exit conflicts retain Stay;
- Chrono Group contents and the Scene Studio library are organized by owning page while status remains visible;
- Create Chrono Group and Create Scene expose the accepted ledger regions and stage structures;
- Build commands contain no legacy device Layout control;
- every rendered checkbox/radio remains conventionally sized while its label supplies an adequate activation target; and
- transactional save, retry, discard, restoration, and immutable running-session behavior still pass.

Browser checks exercise Build commands, both studio landing pages, both record content pages, both populated Edit paths, both Create Scene entry points, Create Chrono Group, and a fully configured New Chart membership step at representative desktop and tablet widths. The production build is the final integration check.
