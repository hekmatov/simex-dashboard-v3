# Entity-Scoped Dashboard Rendering Design

## Intent

Make dashboard authoring interactions respond without rerendering content that did not change. Opening or closing chart editors, moving a chart, moving a Section, and publishing or dismissing operation feedback must preserve unaffected chart instances and their interaction state.

## Measured problem

On the Biomedical Page, Quick Edit currently takes about 3.3 seconds to open, 2.3 seconds to close, and 6.3 seconds to transition to Full Edit. The same Quick Edit action is faster on a smaller Page, which shows that latency scales with rendered dashboard content.

Three implementation details compound the cost:

- Layout draft mutations use `structuredClone()` on the complete dashboard, replacing every Page, Section, placement, and chart reference.
- `DashboardRenderer` creates new chart action callbacks during every render, defeating `ChartPanel` memoization.
- Editor and operation-status state changes cross the dashboard canvas render boundary. Full Edit also performs synchronous preparation and reports its initial draft back to the parent after mounting.

## Rendering contract

- An unchanged chart keeps the same object identity and mounted `ChartPanel` instance.
- Opening, closing, suspending, or changing editor surfaces does not rerender unaffected charts.
- A chart move may rerender the moved chart and the affected source and destination containers. Other charts do not rerender.
- A Section move may rerender the moved Section and the affected Page containers. Charts inside unchanged Sections do not rerender.
- Operation-status publication, replacement, and dismissal do not rerender dashboard content.
- Existing chart-local interaction state, including zoom, hover, lazy-load activation, and focus state, survives unrelated dashboard changes.

## State update architecture

Layout draft commands will use immutable path copying instead of cloning the complete dashboard. Each command creates new references only along changed paths:

- Moving a chart within one Section replaces the dashboard shell, Pages array, affected Page, Sections array, affected Section, and panels array. Existing placement and chart objects are reused.
- Moving a chart between Sections or Pages replaces only the source and destination ancestor paths. Unaffected Pages and Sections retain reference equality.
- Reordering or moving a Section replaces only the affected Page paths and Section arrays. The Section object and its chart placements are reused when its own content is unchanged.
- Commands that intentionally alter related Scenes or Chrono Groups copy only those collections and entries they modify.
- Baseline snapshots remain detached durable values. Structural sharing applies to successive draft values, not between a mutable draft and its saved baseline.

These identity rules are part of the layout command API and receive direct regression tests.

## Render boundaries and actions

The analytical Page canvas will be separated from editor ownership and wrapped in memoized Page and Section components.

Chart panels receive stable render data and a stable action dispatcher rather than per-render inline callbacks. A panel derives its local actions from its stable placement identifier. `ChartPanel` continues using shallow memoization; structural sharing and stable actions make that memoization effective without a comparator that ignores potentially meaningful props.

Selection changes are scoped to the previously selected and newly selected panels. Editor state that does not affect canvas presentation stays outside the canvas props.

## Operation-status isolation

Operation status is split into two contexts:

- A stable command context exposes `beginOperation`, `reportActivity`, and dismissal commands.
- A snapshot context contains notices and announcements and is consumed only by status presentation components.

Dashboard authoring components consume the command context. Publishing or dismissing a notice therefore cannot invalidate the dashboard render tree.

## Editor transitions

Quick Edit ownership is created immediately when the user activates Edit. Canonical reveal and scroll restoration run afterward and do not gate rendering the editor.

Full Edit mounts its shell and current chart draft first. Dataset profiling, render preparation, and proof preview are deferred until after the shell has painted. The editor displays bounded preparation feedback while this work runs.

The Full Editor does not emit an `onEditDraftChange` event or activity report for the unchanged draft received at mount. It reports only a user-caused change whose value differs from the current session authority.

## Error and compatibility behavior

- Layout commands remain atomic: invalid moves return the original draft without partial identity changes.
- Deferred Full Editor preparation retains existing invalid-data diagnostics and retry behavior.
- Save operations retain priority paint-before-work feedback.
- Existing persistence formats and portable dashboard packages do not change.
- Existing stable Page, Section, placement, and chart identifiers remain the React keys.

## Verification

Durable tests will cover:

- Reference equality for every unaffected Page, Section, placement, chart, Scene, and Chrono Group after representative layout commands.
- Render counters proving editor transitions and toast updates do not rerender unaffected chart panels.
- Render counters proving chart and Section moves rerender only the changed entity paths.
- Quick-to-Full transition ordering: shell paint precedes preparation, and the initial draft does not echo to the parent.
- Existing layout, chart authoring, operation status, and persistence behavior.

Browser verification will repeat the Biomedical journey and record user-visible transition timings. The target is an immediate editor shell and sub-second chart and Section moves on the representative local dataset; deterministic render-count contracts are the release gate because wall-clock browser timings vary by machine.

## Out of scope

- Changing chart visual design or chart data semantics.
- Replacing the chart rendering library.
- Persisting layout changes incrementally to a new storage format.
- General virtualization of offscreen dashboard content beyond the existing lazy chart activation.
