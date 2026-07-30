# Multi-fullscreen selection interaction

## Goal

Make multi-fullscreen selection visible, reversible, and consistent with the compact fullscreen control already used on every chart.

## Interaction

- A normal fullscreen click opens that chart as before.
- Holding the fullscreen control for 650 ms starts a temporary selection session and selects that chart. The click emitted after the hold is suppressed.
- During selection, every chart reveals its fullscreen control. Clicking it toggles that chart.
- A selected chart shows a highlighted fullscreen icon containing a checkmark and a matching panel outline.
- A fixed bottom dock remains visible while selecting. It shows the count, offers `Enter multi-fullscreen`, and provides `Cancel`.
- `Enter multi-fullscreen` is disabled until two charts are selected.
- Escape cancels the complete selection session.
- No more than four charts may be selected. Attempting a fifth displays a brief non-blocking alert: `Maximum 4 charts allowed`.
- Opening multi-fullscreen or cancelling clears the temporary selection session.

## Ownership

`DashboardRenderer` owns the temporary selection IDs and limit notice. `ChartPanel` handles long-press click suppression. `ChartPanelActions` renders the ordinary, selectable, and selected fullscreen-control variants.

## Visual treatment

Selection uses the existing green multi-select accent. The floating dock sits above the viewport bottom so it remains reachable while scrolling. The Ctrl-scroll zoom hint becomes a low-contrast compact label in the chart’s upper-left corner.

## Deferred verification

Automated tests and builds remain deferred until the user approves the visual result.
