# Content Activity Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comprehensive semantic feedback for dashboard-content manipulation and complete the requested chart/editor UI corrections.

**Architecture:** Extend the operation queue with monotonic timing and immediate semantic notices. Route durable mutations through operation handles and emit coalesced informational notices at established authoring boundaries. Keep chart-type compatibility in runtime while narrowing authoring choices.

**Tech Stack:** React, JavaScript, Node test runner, CSS, Vite

**Spec:** `docs/superpowers/specs/2026-08-31-content-activity-feedback.md`

## Global Constraints

- Target the private repository mainline through `private/main`.
- Preserve existing saved Bullet charts while removing Bullet from new authoring and conversion.
- Do not report read-only navigation, playback, fullscreen, or selection-only interactions.
- Coalesce frequent draft edits rather than emitting a new notice for each keystroke.
- Use focused deterministic tests before the final task-specific selection and production build.

---

### Task 1: Operation queue timing and semantic notices

**Files:**
- Modify: `src/lib/operationStatusQueue.js`
- Modify: `src/components/app-shell/OperationStatusProvider.jsx`
- Test: `tests/operationStatusQueue.test.js`

**Interfaces:**
- Produces: `reportActivity({ key, message, label?, intent?, dismissMs? })`
- Produces: elapsed-time-aware `beginOperation(...).succeed(message)`

- [ ] Write failing queue tests for a starved delay timer and immediate coalesced activity.
- [ ] Run `node --test tests/operationStatusQueue.test.js` and confirm the new assertions fail.
- [ ] Implement monotonic elapsed timing and immediate activity reporting.
- [ ] Re-run the focused queue tests and confirm they pass.

### Task 2: Broad authoring activity coverage

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: relevant authoring components only where an established callback lacks semantic context
- Test: `tests/operationStatusCoverage.test.js`

**Interfaces:**
- Consumes: `reportActivity(...)` and `beginOperation(...)`
- Produces: semantic messages for persistent mutations and draft/local authoring actions

- [ ] Add a failing coverage contract for required content-action messages and call sites.
- [ ] Run the focused coverage test and confirm it fails.
- [ ] Instrument transaction and authoring boundaries with stable keys and object-aware messages.
- [ ] Re-run the coverage test and queue tests.

### Task 3: Chart catalogue and layout policy

**Files:**
- Modify: `src/charting/schemas/targetSchemas.js`
- Modify: `src/charting/forms/chartCatalogue.js`
- Modify: `src/charting/forms/chartConversion.js`
- Modify: `src/charting/config/chartConfigV3.js`
- Modify: `src/components/chart-authoring/ChartFootprintPicker.jsx`
- Test: existing chart catalogue, conversion, and configuration tests

**Interfaces:**
- Produces: authoring-visible schemas excluding `bullet`
- Produces: gauge layout normalization to `{ size: "wide", width: 4, height: 1 }`

- [ ] Add failing tests for hidden Bullet authoring and fixed-width gauges.
- [ ] Run the focused chart tests and confirm the new assertions fail.
- [ ] Implement authoring filtering and gauge footprint enforcement without removing runtime schema support.
- [ ] Re-run the focused chart tests.

### Task 4: Table row distribution

**Files:**
- Modify: `src/charting/config/chartConfigV3.js`
- Modify: `src/charting/forms/formModel.js`
- Modify: `src/components/charts/TableChartView.jsx`
- Modify: `src/styles.css`
- Test: chart configuration, form model, and chart view tests

**Interfaces:**
- Produces: `presentation.table.rowDistribution` with `regular | fill`

- [ ] Add failing tests for validation, form exposure, and rendered fill class.
- [ ] Run the focused tests and confirm failure.
- [ ] Implement the persisted option and accessible table layout classes.
- [ ] Re-run the focused tests.

### Task 5: Editor and fullscreen interaction corrections

**Files:**
- Modify: `src/components/FullscreenDisplay.jsx`
- Modify: `src/components/chart-authoring/ChartWizardV3.jsx`
- Modify: `src/components/chart-authoring/ChartQuickEditor.jsx`
- Modify: `src/components/chart-authoring/EditSessionActions.jsx`
- Modify: `src/styles.css`
- Test: fullscreen, chart authoring, and editor component tests

**Interfaces:**
- Produces: accessible top-right fullscreen X
- Produces: clean-close bypass and dirty-close confirmation
- Produces: top quick-editor action toolbar ordered Delete, Save, Reset, Close

- [ ] Add failing structural and behavior tests.
- [ ] Run the focused tests and confirm failure.
- [ ] Implement the UI and close-flow changes.
- [ ] Re-run the focused tests.

### Task 6: Integrated verification and commit

**Files:**
- Modify: only files required by corrections found during verification

**Interfaces:**
- Consumes: all preceding behavior
- Produces: one coherent verified feature commit

- [ ] Run the combined task-specific Node test selection.
- [ ] Run the production build.
- [ ] Inspect the worktree diff for accidental generated or unrelated changes.
- [ ] Commit implementation, tests, spec, and plan together.
