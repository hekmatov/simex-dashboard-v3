# Scene Composition Runtime Preview Design

Date: 2026-08-24
Status: User-approved architecture; pending implementation-plan approval

## Purpose

Make Scene Studio Stage 3 a truthful authoring preview of the arrangements that a saved Scene will produce in View and Present. Both canvases render the real configured charts with dashboard data and active dashboard styling. Authoring previews and runtime surfaces share composition renderers rather than maintaining visually similar placeholder boards.

This design amends the Stage 3 composition implementation recorded for Step 7 and Sketch 006. It preserves the approved three-stage editor, one atomic Scene draft, Balanced Twin Canvas, four-column Scene widths, one-to-four-chart Present layouts, direct manipulation, Unit Orbit, temporal rules, and saved-dashboard layout isolation.

## Existing mismatch

The current Stage 3 boards render chart titles inside placeholder list items. They communicate order and membership but do not show chart content or the resulting grid geometry.

The live runtime also has two mismatches that prevent a truthful preview:

- View filters Scene charts into a Scene section but preserves canonical dashboard placement order and footprints instead of applying the Scene's authored member order and widths.
- Present and Audience use the live displayed-chart grid and its layout vocabulary, while saved Scenes use a separate but equivalent layout vocabulary. Selecting a Scene does not currently apply its authored Present subset and layout to the presentation session.

Stage 3 cannot claim fidelity until the same composition rules drive authoring and runtime.

## Binding decisions

### Shared Scene View composition

Introduce one Scene View composition component used by:

1. the left Stage 3 authoring canvas; and
2. the live View Scene section while Scene playback is active.

The component receives the dashboard, Scene, time contexts, surface, and optional authoring hooks. It renders real chart configurations through the production chart renderer and applies:

- `scene.members` order as reading and visual order;
- each member's `width` as a span in a four-column grid;
- the chart's canonical row height, because the Scene contract overrides width but does not author a separate height;
- the active dashboard theme, profile, chart colours, framing, and accessibility settings;
- the Scene's effective per-chart time context, matching policy, and reveal behavior; and
- the real loaded or generated dashboard datasets already available to the runtime.

The shared component does not mutate canonical dashboard order, placement, width, or height. Scene dimensions remain a projection owned by the Scene.

### Shared Present composition

Stage 3's right canvas uses the existing production displayed-chart grid used by Present and Audience. One pure layout adapter converts saved Scene terminology to the runtime display vocabulary:

| Scene layout | Runtime display layout |
| --- | --- |
| `single` | `solo` |
| `vertical-divider` | `sideBySide` |
| `horizontal-divider` | `overUnder` |
| `large-left` | `leftFocus` |
| `large-top` | `topFocus` |
| `grid-2x2` | `grid2x2` |

The adapter is the only translation point. Schema validation continues to store the accepted Scene vocabulary; presentation protocol and display-controller state continue to use their existing runtime vocabulary.

### Actual chart renders in Stage 3

Both Stage 3 canvases render actual chart visuals rather than thumbnails or facsimiles. Chart data comes from `dashboard.loadedData`, dataset profiles, generated derivatives, and map sources through the same chart rendering inputs used at runtime.

Stage 3 uses the latest valid authored Scene frame as its deterministic preview frame. It displays the preview date in the Stage 3 heading. The frame is derived without starting or mutating a live playback session. Per-chart matching and reveal behavior are calculated with the same temporal engines as runtime playback.

If the Scene has no valid frame, charts render their real non-temporal or recovery state and Stage 3 names the missing frame condition. It never invents sample data or silently selects a timestamp outside the authored period.

### Authoring controls as an overlay layer

Selection, drag handles, insertion targets, Present membership actions, and Unit Orbit remain authoring-only chrome. They wrap or overlay shared rendered chart cells without replacing chart content.

- Chart title controls identify the chart and initiate selection or dragging.
- Insertion targets occupy discrete reading-order boundaries and do not alter the saved grid merely by appearing.
- Selecting a chart adds the approved non-colour outline and opens Unit Orbit clear of the selected chart.
- Authoring controls suppress conflicting chart gestures only while the corresponding authoring gesture is active.
- View and Present render no Stage 3 authoring chrome.

Chart rendering remains interactive enough to expose realistic layout and labels, but Scene movement controls own pointer drags initiated from the authoring title handle.

## Runtime behavior

### View

When a Scene is active, the Scene section in View uses the shared Scene View composition component. Participating charts appear in Scene-authored order and width. Non-participating charts retain their normal page sections and canonical dashboard placements.

When only a Chrono Group or default page timeline is active, View retains the current canonical dashboard layout behavior. The Scene projection is therefore narrowly activated by `playback.activeScene` and never changes the saved dashboard layout.

### Present and Audience

Selecting a saved Scene atomically seeds the presentation session from `scene.present.chartIds` and the mapped Scene layout. This establishes the arrangement authored in Stage 3.

Implementation amendment (2026-08-24): Scene selection in View does not write into View's independent Focus/Comparison display state, because doing so would open the comparison dialog. The selected Scene remains the canonical temporal source; on first entry to Present, the saved composition is applied once to the presentation runtime that actually owns Present/Audience display state. This preserves the same user-visible contract without coupling View exploration to presentation state.

After the Scene is applied, moderator changes in Present remain session-only. They do not write back to the saved Scene and do not mutate the Stage 3 draft. Selecting the Scene again restores its saved Present composition.

Audience continues to consume the presentation session snapshot and therefore renders the same selected chart order and mapped layout as Present.

## Component boundaries

The implementation should establish these focused responsibilities:

- `SceneViewCompositionGrid`: shared four-column actual-chart renderer for Stage 3 and active-Scene View.
- `scenePresentLayout`: pure bidirectional-safe mapping helpers and count validation between Scene and display layout vocabularies. The required production direction is Scene to display.
- `SceneCompositionAuthoringOverlay`: Stage 3-only selection, movement, insertion, and membership controls around shared chart cells.
- `BalancedTwinCanvas`: coordinates the two shared compositions, preview-frame facts, active board, and Unit Orbit; it does not render substitute chart cards.
- presentation-session integration: observes an explicit Scene selection and applies its Present composition once, without repeatedly overwriting later session edits.

Existing `ChartView`, chart data-state handling, temporal matching engines, `DisplayedChartGrid`, presentation protocol, and Audience rendering remain authoritative within their current responsibilities.

## Data flow

1. `BuildWorkspace` passes the full dashboard and Scene draft to `SceneEditor` and Stage 3.
2. Stage 3 derives the latest valid preview frame and per-chart time contexts without mutating playback state.
3. `SceneViewCompositionGrid` resolves each member chart from the canonical dashboard, applies Scene order/width projection, and renders the real chart with its time context.
4. The Present preview passes `scene.present.chartIds` and the mapped layout to `DisplayedChartGrid`.
5. Authoring actions continue through `reduceSceneDraft`; rerendered shared compositions reflect the same unsaved draft immediately.
6. Saving commits one Scene object atomically.
7. Runtime Scene selection feeds the saved Scene to View composition and seeds the presentation session once.

No dashboard, temporal, or presentation state is duplicated between shells.

## Performance and lifecycle

Actual chart rendering is limited to Stage 3 and only the charts visible in its two previews. It consumes prepared dashboard derivatives and must not repeat invariant source processing. Existing chart-level memoization and data-state caches remain available.

Leaving Stage 3 unmounts its chart previews and releases chart instances and observers. Switching stages, closing Scene Studio, or changing modes preserves the draft, selection, focus, and scroll state under the existing authoring lifecycle contract.

Because the same chart may appear in both previews, renderer instances remain independent while their immutable prepared data and configurations are shared. Cross-canvas chart interactions do not share zoom or transient hover state unless the chart's runtime contract already defines shared state.

## Error and recovery behavior

- A missing chart configuration produces the existing Scene Needs-attention path and omits no record silently.
- Missing, unavailable, or quota-limited data uses the real chart recovery presentation and the Step 6 storage wording.
- An invalid Present layout is rejected by Scene validation before save; the preview does not coerce it invisibly.
- If a chart becomes unavailable while editing, its authored cell remains identifiable with the repair reason and authoring controls needed to remove or repair it.
- A failed Scene save retains the complete draft and both composition projections for retry.

## Verification

### Semantic correctness

- Unit tests prove every Scene-to-display layout mapping and reject unsupported mappings.
- Scene draft tests prove order, width, Present subset/layout, validation routing, save failure, retry, and discard remain deterministic.
- A live integration test proves production View and Stage 3 import and use the shared Scene View renderer.
- A presentation integration test proves Scene selection seeds Present once and later session edits remain session-only.

### Composition correctness

- Production-rendered component tests prove both Stage 3 canvases contain real chart render roots rather than placeholder cards.
- Scene View chart cells expose the authored four-column spans and canonical row heights.
- Present preview and Audience receive the same mapped layout class and chart order.
- View and Present contain no Scene authoring chrome.

### Real-use correctness

One focused browser journey will:

1. create or edit a Scene with unequal Scene widths and a non-default order;
2. choose a distinct Present subset, order, and count-valid layout;
3. inspect actual rendered charts in both Stage 3 canvases;
4. save and activate the Scene in View;
5. compare Stage 3 and View chart order and grid coordinates;
6. enter Present and compare the authored subset, order, and layout;
7. make a session-only Present adjustment and confirm the saved Scene is unchanged; and
8. repeat the material geometry checks at desktop and supported tablet widths.

Meaningful evidence consists of rendered chart roots, chart IDs, grid-column spans, cell coordinates, mapped layout classes, absence of authoring controls in runtime, and proportionate human inspection. Screenshot existence alone is insufficient.

## Boundaries

- This work does not redesign Present or Audience beyond applying the saved Scene composition.
- It does not add a Stage 3 frame scrubber or playback transport.
- It does not change canonical dashboard placement or chart footprints.
- It does not add new chart types, data transformations, temporal policies, or Scene schema fields.
- It does not perform Step 8's broader Present/Audience redesign or Step 9 final cross-mode UAT.

## Completion condition

Stage 3 is truthful only when the authoring preview, live View Scene composition, and Present/Audience Scene composition are driven by the shared production rendering paths and the representative browser journey passes. A visually similar preview-only implementation does not satisfy this design.
