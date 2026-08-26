# Task 12 Report — CSV Temporal Impact and Durable Review Status

**BASE:** `a074e1c60f1ed3309c708f8fe0292035c98b853a`
**Rows:** SCM-S10, SCM-R06, temporal-confirmation branch of SCM-C08
**Journey:** F — valid temporal CSV replacement warns then confirms

## RED

The exact thirteen-file selection initially reported **51 tests: 40 pass, 11 fail**. The behavior-level failures were the absent temporal-review authority/validation, exact CSV impact/status publication, persisted Build findings and accepted Scene layouts, save-time clearing, and safe Present warning. Six additional `chronoGroupModelV3` failures were reproduced unchanged at BASE before any reconciliation: `initial playback state is immutable`, `play pause speed view`, `changing groups`, `previous next seek`, `tick final time`, and `play unavailable`. Those six expectations contradicted the current accepted reducer contract and were corrected test-only; `playbackReducer` production was not changed.

## Implementation

- Added the exact `TemporalReview` validation/merge/clear authority and optional model/schema preservation.
- Added exact `chrono-group`, `scene`, and `scene-presentation` CSV impact contexts, explicit confirm-only publication, durable marks, source detail status, and rollback/cancel invariants.
- Projected persisted marks into Build findings/cards, cleared repaired marks through the existing Chrono/Scene save paths, and displayed the active Scene degraded warning while Present continued rendering.
- Kept `temporalReview` out of manual Present state, presentation actions, and audience protocol messages.

## Rulings and cost

- The accepted Task 12 warning/confirm journey could not be mounted without existing owners `src/components/source-content/ContentActionDialog.jsx` and `src/components/source-content/DataSourceDetail.jsx`; both were authorized, with `tests/contentActionDialog.test.js` as the one focused deterministic contract. This adds no Task 13 behavior.
- The six stale Chrono expectations were corrected only after unchanged BASE reproduction. Cost is test-only reconciliation; no playback production scope was added.
- Journey F exposed one live save-path defect: `mergeChronoGroup` reintroduced the persisted mark after the clearing helper. The minimal correction removes `temporalReview` from the saved merge result before commit.

## GREEN and real use

- Exact thirteen planned files plus the authorized dialog test: **112/112 pass**, zero fail/skip/todo after T12-R01.
- Named Journey F Chromium selection: **1/1 pass** (52.1 s test, 54.1 s total).
- Inspected Build/Present 1440×900 checkpoints: exact warning reason and impact labels; no-op cancel and focus return; stable sourceId/new observations after confirmation; group/Scene `needs-review`; Scene-present `degraded`; visible Build/Present warnings with continued render; valid group/Scene saves clear their marks; captured presentation messages contain no `temporalReview`.

## Disposition

- **Engine implemented:** yes — typed status, exact impacts, publication/rollback, validation, union, and clearing.
- **UI implemented:** yes — mounted warning/impact/confirm flow, Build findings, and passive Present warning.
- **Fidelity verified:** yes for SCM-S10, SCM-R06, and the CSV temporal branch of SCM-C08 through named Journey F. SCM-C08 remains Partial overall because relink and GeoJSON branches belong to later tasks.
- **Blockers:** none. Task 13 was not implemented.

## T12-R01 correction

- **RED:** the focused graph/transaction selection reported **15/17 passing**. Both failures returned an empty impact list when a saved wrapper placement ID differed from its nested `chart.id`; the dependency breadcrumb correctly retained the placement ID.
- **Minimal fix:** `buildContentDependencyGraph` now builds a separate internal chart-id → primary-CSV map while leaving direct-use IDs and breadcrumb panel IDs unchanged. Chrono Group, Scene, and Scene-present matching consumes only this chart-identity map.
- **GREEN:** focused graph/transaction selection **17/17 passing**; exact Task 12 deterministic selection **112/112 passing**, zero fail/skip/todo.
- **Browser scope:** named Journey F was not rerun because this correction changes only engine identity matching for the previously uncovered distinct-wrapper case; the prior inspected 1/1 journey remains retained.
