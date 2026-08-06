# Layout and Moderator Transactions Design

Date: 2026-08-01
Status: Approved

## Objective

Restore the schema-v3 layout-size contract and make moderator save, reset,
create, and removal operations complete transactionally. A successful action
may close its editor or edit session; a failed action must leave the relevant
interface open with an actionable error and an unchanged last-good dashboard.

This is an independent correctness and usability slice. It does not introduce
the demand-driven data service or change chart preparation semantics.

## Evidence and Root Causes

- Version 3 accepts only `compact`, `standard`, `wide`, and `full` layout sizes.
- `ChartPanel` emits `chart-panel-<size>`, but the stylesheet still targets the
  removed version-2 `chart-size-*` classes. Configured size therefore has no
  effect beyond the panel's default two-column span.
- Dashboard metadata edits are debounced. Several destructive or closing
  actions call `pendingEdits.flush()` without awaiting it.
- Chart save, chart removal, and edit-session reset begin an asynchronous
  serialized commit but immediately close the editor or edit mode.
- `App` suppresses rejected commit promises in these user-confirmed workflows.
  The global error may update after the editing context has already disappeared.
- The chart wizard awaits creation, but it has no in-flight lock, so repeated
  activation can enqueue the same create operation more than once.

## Layout Contract

The version-3 size vocabulary maps directly to the four-column dashboard grid:

| Size | Columns | Rows | Minimum height |
| --- | ---: | ---: | ---: |
| `compact` | 1 | 1 | 360 px |
| `standard` | 2 | 1 | 360 px |
| `wide` | 4 | 1 | 360 px |
| `full` | 4 | 2 | 736 px |

`ChartPanel` remains the single class-name authority and emits
`chart-panel-compact`, `chart-panel-standard`, `chart-panel-wide`, or
`chart-panel-full`. CSS will use the same vocabulary. The obsolete
`half`, `normal`, `tall`, and `large` selectors will be removed rather than
maintained as an undocumented second contract.

Phone layouts collapse every size to one column. A `full` panel retains a
larger vertical canvas but cannot create horizontal overflow. Fullscreen uses
its existing display-layout contract and does not reuse dashboard grid spans.

## Transaction Contract

The UI boundary for an explicit moderator action is:

1. Lock the initiating controls.
2. Await any pending debounced metadata edits.
3. Await the serialized dashboard commit.
4. Close or leave edit mode only after success.
5. On failure, unlock controls, retain the draft and selection, and show the
   error inside the active editor or confirmation context.

The serialized commit controller remains the mutation authority and preserves
the last-good configuration after a rejected candidate. The UI must consume
its returned promise instead of converting it to fire-and-forget work.

### Chart editor

- Submitting becomes an async operation.
- Save, Reset, Cancel, and Remove are disabled while saving.
- The editor closes only after `onSave` resolves.
- A rejected save leaves the draft open and reports the bounded error.
- Removing a chart requires confirmation and follows the same await-before-close
  contract.

### Wizard

- `Create chart` becomes `Creating...` while its promise is pending.
- A second create request is ignored while pending.
- A rejected create leaves the completed wizard open with its data and mappings.

### Whole-dashboard edit mode

- `Save` awaits pending metadata edits and the commit queue before leaving edit
  mode.
- `Reset edits` cancels pending debounce callbacks, awaits replacement with the
  saved baseline, and leaves edit mode only after success.
- While either action is pending, both commands are disabled and expose a
  status label.

### Removal

- Chart removal requires the shared `ConfirmDialog`.
- The panel remains present until its serialized removal commit succeeds.
- Failure closes neither the editor nor the edit session and is presented as an
  actionable error.

## Error Handling

Errors retain their original message after existing storage-quota translation.
No stack traces or raw objects are rendered. Operation-local errors take
priority in the editor or confirmation flow; the existing application error
continues to provide a fallback.

An operation may be retried after failure. Retrying creates a new serialized
commit from the controller's last-good state.

## Performance Constraints

- Do not clone loaded datasets to represent operation state.
- Do not add polling, global event listeners, or per-chart timers.
- Use a single small operation-state object in `DashboardRenderer` and one
  boolean in each chart authoring surface.
- Preserve the 650 ms metadata-edit debounce.

## Verification

Behavior changes follow red-green-refactor with focused Node tests. Layout gets
a contract test that would fail if JSX and CSS vocabularies diverge again.
Transactions get controller/component tests proving that close callbacks occur
only after resolution and that rejection preserves the editing state.

During the visual-review cycle, only the focused tests are rerun after a task.
The complete unit, E2E, and build gate runs once after the user accepts the
visual result.

## Acceptance Criteria

- Every version-3 size visibly receives its intended grid span.
- No supported size relies on a removed version-2 class.
- Save/reset/create/remove controls expose a bounded pending state.
- Repeated activation cannot duplicate a create or save operation.
- Editors and edit mode close only after successful persistence.
- Failed persistence preserves the moderator's draft and permits retry.
- Removing a chart always requires explicit confirmation.
- No demand-driven data or Quorum protocol behavior changes in this slice.
