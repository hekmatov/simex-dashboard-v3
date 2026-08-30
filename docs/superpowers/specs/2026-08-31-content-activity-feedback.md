# Content Activity Feedback Design

## Intent

Make dashboard authoring actions legible through semantic toast messages. Report content manipulation broadly, while excluding read-only navigation, fullscreen, playback, and selection-only interactions.

## Activity contract

- Persistent mutations report working, completed, and failed phases.
- Local authoring actions report an immediate informational completion.
- Draft lifecycles report creation, update, reset, suspend, resume, discard, and commit.
- Frequent field edits share stable keys so they update one notice rather than producing a notice per keystroke.
- Messages name the affected object when that name is available.
- The initial implementation covers dashboard look, layout, charts, panels, pages, sections, static content, data sources, Chrono Groups, scenes, package import/export, restore, reset, and dashboard-content deletion.
- Read-only navigation and presentation controls are out of scope.

## Timing contract

Each operation records its monotonic start time. When an operation completes, elapsed wall-clock time is checked independently of whether its delay timer ran. An operation lasting at least 500 ms must leave a visible completed notice for four seconds. Immediate activity notices bypass the delay. Failures remain visible until dismissed.

## Compatibility and UI decisions

- Remove Bullet / target from new authoring and conversion choices, but retain runtime support for existing saved Bullet charts.
- Gauge charts use a fixed 4-column by 1-row footprint.
- Tables support `regular` and `fill` row distribution modes.
- Clean full-editor drafts close immediately; dirty drafts require discard confirmation.
- Quick-editor Delete, Save, Reset, and Close controls appear in a top toolbar.
- Fullscreen uses an accessible icon-only X at the top right.
