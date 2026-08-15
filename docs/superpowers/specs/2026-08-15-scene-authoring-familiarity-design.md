# Scene Authoring Familiarity Redesign

Date: 2026-08-15  
Status: Approved for implementation planning

## Purpose

Rebuild Sketch 006 so Scene authoring begins from the approved Time Group creation language instead of introducing a separate authoring interface. The comparison will test how the familiar membership ledger hands off to Scene View and Present arrangement while keeping Scene semantics, fixture data, and workflow state identical across all three variants.

## Fixed foundation

All variants reuse the approved Staged Proof Studio and Availability Ledger grammar from Sketch 005:

- the modal studio shell, five-stage navigator, independently scrolling stage body, fixed footer, draft status, validation, focus containment, and dirty-resolution behavior;
- the regions **Selected for this Scene**, **Needs attention**, and **Available from parent group**, with whole chart records moving between regions and a thin separator before available charts;
- aligned chart and variable evidence rows, expandable evidence, explicit counts, non-colour states, repair links, and stable focus restoration;
- the Scene contract's five stages: Choose scope, Compose scene, Generate frames, Configure temporal behavior, and Name and review;
- one atomic Scene draft and one final Save Scene transaction.

The Scene workflow is distinguished without a new visual system. A persistent identity band says **Scene draft**, names the draft, and shows its lineage: **Winter response 2026 → Executive surveillance**. Scene-specific verbs, five-stage labels, and parent Time Group context provide redundant non-colour differentiation from Time Group creation.

## Shared direct arrangement behavior

Scene View and Present both reuse the direct-manipulation language approved in Sketch 002:

- the chart title is the selection and drag handle;
- a movement threshold separates click-to-inspect from drag-to-reorder;
- valid pointer destinations are another chart title or a visible empty insertion area;
- every destination maps to a discrete reading-order insertion boundary, never raw coordinates or a persistent hole;
- deterministic packing recomputes panel placement after a reorder;
- the moved chart retains its Scene-local settings and every other chart retains its relative order;
- Move earlier, Move later, first, and last actions provide keyboard and single-pointer equivalents;
- a no-op or cancelled drop does not dirty the Scene draft; and
- canonical dashboard order and canonical chart footprints never change.

Scene View and Present maintain separate authored orders. Present inclusion is explicit and limited by the Scene contract; dragging within Present does not silently add a chart to Present. Scene width uses one consistent four-column unit: **1, 2, 3, or 4 columns**. The canonical dashboard footprint is shown separately, for example **2 columns × 1 row**, and is read-only here.

## Shared Unit Orbit behavior

Clicking a chart title opens a Unit Orbit anchored to that panel. It owns chart-local settings within the Scene draft:

- Scene View width, expressed as 1–4 columns;
- Include in Present;
- Move earlier/later and first/last for the active board; and
- stage-appropriate per-chart temporal or matching overrides.

Global Scene controls, including Present layout, frame generation rules, and playback timing, remain in the stage surface. Unit Orbit uses Done/Close rather than an independent save because all changes belong to the one Scene draft.

The Orbit must clear the selected panel and protected studio chrome. Unrelated panels may be covered and do not participate in placement calculations. It repositions after opening, scrolling, viewport changes, board switches, and panel geometry changes, including a settled-layout pass after width changes. If the selected chart is absent from the active Present board, the Orbit closes or reanchors to a valid selected panel.

## Variants

### A — Ledger → Active Board

Stage 2 begins with the familiar membership ledger. An in-stage control opens one full-width arrangement board at a time: **Scene View** or **Present**. A compact pinned membership summary preserves context and provides a direct return to the ledger.

This is the recommended least-complex baseline. It gives realistic panels and Unit Orbit enough room at supported Build widths. Its trade-off is that the inactive board is one action away.

### B — Ledger + Workbench Split

The familiar ledger remains in a bounded left pane while one active Scene View or Present board occupies the larger right pane. The panes have independent internal scrolling on desktop and stack without document-level horizontal overflow at tablet widths.

This tests whether persistent membership and evidence context improves composition. Its risks are denser geometry, additional focus/scroll coordination, and possible confusion between membership selection and chart inspection.

### C — Ledger + Twin Proof Flow

The full-width familiar ledger is followed by both directly manipulable boards in one continuous vertical stage flow: Scene View first, Present second. Unit Orbit anchors to the active board's selected panel.

This keeps both authored arrangements visible and makes cross-board consequences easiest to compare. Its trade-offs are greater vertical travel, more simultaneous geometry, and more frequent Orbit re-anchoring.

## State and data flow

One shared state object owns scope, Scene membership, Scene order, Scene widths, Present inclusion and order, frame generation, matching overrides, timing, name, validation, dirty state, and save status. Variant changes alter only Stage 2 presentation and preserve the exact draft, expanded evidence, active stage, active board, selected chart, Orbit state when valid, focus target, and scroll context.

Later stages retain a compact membership and arrangement anchor derived from the same state. Per-chart controls opened from those stages use the same Unit Orbit rather than inline inspectors.

## Error and lifecycle behavior

- Scene membership remains non-empty; Present remains a valid subset and order.
- Unsupported temporal choices remain visible with a reason and never silently coerce state.
- A disappeared selected frame becomes Needs attention and is never silently replaced.
- Invalid or unresolved state blocks final save and focuses its repair control.
- A deterministic save failure retains the complete draft; retry creates one durable Scene.
- Close, Escape, mode change, or navigation that would lose progress invokes the existing save/discard/stay boundary.
- Merely opening, closing, or switching Unit Orbit and arrangement boards never prompts or discards state.

## Responsive and accessibility requirements

Build authoring is exercised at 768×1024, 1024×768, 1200×900, and 1440×900 without document-level horizontal overflow. At phone size, Build and Present show the persistent unsupported-mode banner and direct Switch to View action while retaining the draft.

All drag actions have keyboard and single-pointer alternatives. Controls remain at least 44×44 CSS pixels, focus remains visible and restored after rerender, state announcements are contextual and non-duplicative, and meaning never depends on colour, hover, or motion. Reduced motion produces the same final state immediately.

## Comparison decision

The variants decide only how much of the familiar ledger remains visible while arranging:

- one board after a ledger handoff;
- a persistent ledger beside one board; or
- a ledger followed by both boards.

They do not vary the Scene stages, contract choices, validation, data, chart order, interactions, state transitions, drag semantics, Unit Orbit controls, visual style, or persistence model.

## Proportional verification

The rebuilt sketch needs one shared-state variant-switch exercise, one Scene View reorder using a chart target and an empty insertion target, the equivalent keyboard reorder, one Present reorder, one Unit Orbit width change with post-reflow clearance, one chart-local temporal override, and one supported-tablet overflow check. Existing deterministic Scene validation/save paths need only a source-level regression check unless the rewrite changes them.
