# Chart Sizing and Editor Performance Design

Date: 2026-07-30

## Objective

Make charts fill their dashboard and fullscreen containers, separate the visible
range selector from zoom behavior, and materially reduce edit-panel latency and
memory amplification without redesigning the dashboard data architecture during
the current visual-review cycle.

## Root Causes

- ECharts hosts have a fixed minimum height but no continuous flexible-height
  chain through the panel, presentation frame, zoom guard, view, and canvas.
- Fullscreen grid cells allocate vertical space that never reaches the ECharts
  host.
- Zoom-enabled axis, relationship, and timeline charts always receive both an
  inside zoom controller and a visible slider.
- The dashboard eagerly loads 36 sources. Two municipal CSVs alone contain
  approximately 293,000 rows and 39.4 MB of source text; parsed object graphs
  consume substantially more memory.
- Opening the editor clones the complete hydrated dashboard, including
  `loadedData`.
- The editor prepares the selected chart once for the form and then prepares it
  again inside the preview.
- The complete live dashboard remains mounted beneath an expensive full-page
  backdrop blur.

## Design

### Flexible chart sizing

Dashboard panels and fullscreen cells will expose a `minmax(0, 1fr)` content
region. The chart presentation frame, zoom guard, ECharts view, and ECharts host
will inherit and fill that region. Compact or intrinsically sized chart families
such as tables and card collections retain their own overflow behavior.

### Independent range selector

Zoom capability remains controlled by `interaction.zoom.enabled`. A new
schema-generated interaction setting controls whether the visible ECharts
slider is rendered. The inside zoom controller remains available for
Ctrl+wheel interaction whenever zoom is enabled.

The visible range selector defaults to hidden for existing and newly created
charts unless explicitly enabled.

### Editor performance mode

While the chart editor is open:

- The modal uses a translucent dimming veil instead of `backdrop-filter`.
- Underlying chart canvases are suspended and replaced by lightweight panel
  placeholders.
- The selected chart preview reuses the editor's already prepared data and
  render model instead of preparing the same rows again.
- The edit baseline excludes runtime-only `loadedData`, avoiding a full duplicate
  of the hydrated datasets.

Closing the editor restores the dashboard charts. Saving and cancellation keep
their existing semantics.

## Deferred Architecture Work

Source-level lazy loading would provide a larger permanent memory reduction by
loading only sources required by the active page, editor, or playback group.
That change affects playback, validation, imports, and Quorum integration and is
therefore deferred until after the current visual behavior is accepted.

## Visual Acceptance

- Standard, tall, wide, and fullscreen ECharts use the available vertical space.
- Range selectors are absent by default and can be enabled per chart.
- Opening and interacting with the editor is materially more responsive.
- The editor retains a visible preview while underlying dashboard canvases are
  suspended.
- The modal background is dimmed without an actual blur effect.

## Verification Policy

No automated tests, builds, linting, or regression checks will run during this
visual iteration. Verification is deferred until the user approves the visual
result.
