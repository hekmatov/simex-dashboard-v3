# Multi-fullscreen Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a clear long-press multi-fullscreen selection session and reduce the visual prominence of the Ctrl-scroll zoom hint.

**Architecture:** `DashboardRenderer` owns the temporary selection session and limit notice. `ChartPanel` distinguishes a completed hold from an ordinary click, while `ChartPanelActions` owns the selectable fullscreen icon presentation. CSS supplies the persistent selection controls and restrained zoom hint.

**Tech Stack:** React, JSX, CSS, existing SimEx display controller.

## Global Constraints

- Select at most four charts.
- Escape cancels the entire temporary selection session.
- A normal fullscreen click remains unchanged outside selection mode.
- Automated tests, builds, and regression checks remain deferred until visual approval.
- Runtime changes remain uncommitted during the visual feedback cycle.

---

### Task 1: Zoom hint presentation

**Files:**
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `.chart-zoom-hint` and `.chart-zoom-hint--visible`.
- Produces: A compact translucent hint anchored at the upper-left.

- [ ] Replace the centered bottom pill positioning with `left: 12px; top: 12px`.
- [ ] Reduce font size, weight, padding, contrast, and shadow.
- [ ] Change the visible transform so it no longer depends on horizontal centering.

### Task 2: Selectable fullscreen action

**Files:**
- Modify: `src/components/charts/ChartPanelActions.jsx`
- Modify: `src/components/ChartPanel.jsx`

**Interfaces:**
- Consumes: `selectionMode`, `fullscreenSelected`, `onToggleMultiSelect`.
- Produces: `FullscreenSelectedIcon`, selected control styling hooks, and long-press click suppression.

- [ ] Add selection props to `ChartPanelActions` and switch the button’s accessible label and click behavior by mode.
- [ ] Render a fullscreen-with-check icon and selected CSS class when the chart is selected.
- [ ] Keep the action rail rendered during selection and hide the citation control for a focused selection interaction.
- [ ] Record when the 650 ms hold completes and suppress the synthetic click that follows the hold.

### Task 3: Selection session controls

**Files:**
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `multiSelectMode`, `multiPanelIds`, and `onDisplayAction({ type: "manual_set", chart_ids })`.
- Produces: `multiSelectNotice`, fixed selection dock, Escape cancellation, and maximum-limit alert.

- [ ] Add a window keydown listener active only during selection; Escape calls the existing cancellation state updates.
- [ ] Toggle chart IDs through the compact fullscreen buttons and display `Maximum 4 charts allowed` when a fifth chart is attempted.
- [ ] Replace the existing banner/header multi-selection controls with one fixed dock showing count, launch, and cancel.
- [ ] Apply the existing green selection accent to both selected panels and selected fullscreen icons.
- [ ] Automatically dismiss the limit alert after a short interval.

### Task 4: Visual handoff

**Files:**
- No code changes.

- [ ] Leave runtime changes uncommitted.
- [ ] Ask the user to inspect long press, selection toggling, Escape, the four-chart limit, and multi-fullscreen launch.
- [ ] Do not run automated verification until the user approves the visuals.
