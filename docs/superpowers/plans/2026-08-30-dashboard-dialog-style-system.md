# Dashboard Dialog Style System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the dashboard’s semantic style system to every first-party wizard, workspace dialog, popover dialog, recovery prompt, utility dialog, and confirmation surface without changing workflow behavior.

**Architecture:** Add one opt-in `dashboard-dialog` CSS contract after the existing dashboard grammar, then migrate visual shells with additive semantic classes while preserving all existing component classes and JavaScript selectors. A source inventory test prevents explicit dialog surfaces from escaping the contract; focused SSR tests and one representative browser pass protect behavior, accessibility, and responsive geometry.

**Tech Stack:** React 19, JSX, CSS custom properties, Node.js test runner, React server rendering, Vite, Playwright

**Spec:** `docs/superpowers/specs/2026-08-30-dashboard-dialog-style-system-design.md`

## Global Constraints

- Reuse the existing `--simex-*` semantic tokens instead of introducing parallel colors, type scales, shadows, or radii.
- Existing component-specific classes remain in place; semantic contract classes are additive and must not become JavaScript selectors.
- Do not use a global `[role="dialog"]` style selector.
- Do not alter handlers, state transitions, validation, persistence, API calls, focus trapping, Escape handling, or return-focus behavior.
- Multi-step flows expose header, progress, body, and footer regions; utility dialogs omit progress.
- Dialog bodies own scrolling; the page must not gain horizontal overflow.
- Preserve visible keyboard focus, accessible names, heading associations, and non-color state indicators.
- Keep the approved rich-text editor interaction and layout intact inside the new shell.

## File structure

### New files

- `src/styles/dashboard-dialogs.css` — shared shell, variants, structural regions, tokenized controls, responsive behavior, and narrowly scoped legacy adapters.
- `tests/dashboardDialogContract.test.js` — CSS import/token assertions plus an explicit source inventory for every first-party dialog surface.

### Existing files grouped by migration slice

- Authoring: `src/components/static-content/StaticContentWizard.jsx`, `src/components/chart-authoring/ChartWizardV3.jsx`, `src/components/chart-authoring/ChartEditorModal.jsx`, `src/styles/static-content.css`, `src/styles/dashboard-style-grammar.css`.
- Source evidence: `src/components/source-content/SourceContentWorkspace.jsx`, `src/components/source-content/ContentActionDialog.jsx`, `src/components/SourceViewer.jsx`, `src/components/ColorField.jsx`, `src/styles/source-content.css`, `src/styles/source-viewer.css`.
- Utility and recovery: `src/components/common/ConfirmDialog.jsx`, `src/components/chart-authoring/ChartConversionDialog.jsx`, `src/components/build/BuildLayoutCreateDialog.jsx`, `src/components/build/BuildMoveConfirmationDialog.jsx`, `src/components/build/BuildMoveDialog.jsx`, `src/components/build/DashboardPackageExportDialog.jsx`, `src/components/build/DashboardPackageReviewDialog.jsx`, `src/components/build/DeleteDashboardContentDialog.jsx`, `src/components/build/SectionStructureCommandDialog.jsx`, `src/components/build/BuildWorkspace.jsx`, `src/components/app-shell/ApplicationRecovery.jsx`, `src/components/app-shell/RestoreOnlineDashboardDialog.jsx`.
- Display and temporal: `src/components/FullscreenDisplay.jsx`, `src/components/time/SceneEditor.jsx`, `src/components/common/RightSideDrawer.jsx`, `src/styles/immersive-display.css`, `src/styles/right-side-drawer.css`.
- Import boundary: `src/main.jsx`.

---

### Task 1: Establish the shared dialog contract and coverage gate

**Files:**

- Create: `src/styles/dashboard-dialogs.css`
- Create: `tests/dashboardDialogContract.test.js`
- Modify: `src/main.jsx:8-20`

**Interfaces:**

- Produces: CSS classes `dashboard-dialog-backdrop`, `dashboard-dialog`, `dashboard-dialog--wizard`, `dashboard-dialog--workspace`, `dashboard-dialog--utility`, `dashboard-dialog--danger`, `dashboard-dialog--compact`, `dashboard-dialog--standard`, `dashboard-dialog--wide`, `dashboard-dialog--fullscreen`, and the `dashboard-dialog__*` structural regions.
- Produces: a source inventory test that later tasks extend by adding each migrated file to `DIALOG_SURFACES`.
- Consumes: existing `--simex-*` tokens from `src/styles/tokens.css` and `src/styles/dashboard-style-grammar.css`.

- [ ] **Step 1: Write the failing contract tests**

Create `tests/dashboardDialogContract.test.js` with import-order, selector, token, and raw-color checks:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const DIALOG_SURFACES = [];

test("dashboard dialog contract loads after the base dashboard grammar", async () => {
  const main = await read("src/main.jsx");
  assert.ok(
    main.indexOf('import "./styles/dashboard-style-grammar.css"')
      < main.indexOf('import "./styles/dashboard-dialogs.css"'),
  );
});

test("dashboard dialog contract exposes every semantic variant using dashboard tokens", async () => {
  const css = await read("src/styles/dashboard-dialogs.css");
  for (const selector of [
    ".dashboard-dialog-backdrop",
    ".dashboard-dialog",
    ".dashboard-dialog--wizard",
    ".dashboard-dialog--workspace",
    ".dashboard-dialog--utility",
    ".dashboard-dialog--danger",
    ".dashboard-dialog__header",
    ".dashboard-dialog__progress",
    ".dashboard-dialog__body",
    ".dashboard-dialog__footer",
    ".dashboard-dialog__actions",
  ]) assert.match(css, new RegExp(selector.replaceAll(".", "\\.")));
  for (const token of [
    "--simex-surface-panel",
    "--simex-surface-panel-alt",
    "--simex-surface-canvas",
    "--simex-border-subtle",
    "--simex-border-strong",
    "--simex-text-strong",
    "--simex-text-muted",
    "--simex-selected",
    "--simex-error",
    "--simex-focus",
    "--simex-control-min",
  ]) assert.match(css, new RegExp(`var\\(${token}`));
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
});
```

- [ ] **Step 2: Run the tests and verify they fail because the contract does not exist**

Run: `node --test tests/dashboardDialogContract.test.js`

Expected: FAIL with `ENOENT` for `src/styles/dashboard-dialogs.css` or a missing import assertion.

- [ ] **Step 3: Create the minimal shared stylesheet**

Create the initial contract in `src/styles/dashboard-dialogs.css`:

```css
.dashboard-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: clamp(12px, 3vw, 32px);
  overflow: auto;
  background: color-mix(in srgb, var(--simex-text-strong) 38%, transparent);
}

.dashboard-dialog {
  display: flex;
  flex-direction: column;
  inline-size: min(100%, 720px);
  max-block-size: calc(100dvh - clamp(24px, 6vw, 64px));
  overflow: hidden;
  color: var(--simex-text-strong);
  font-family: var(--simex-style-body-font);
  background: var(--simex-surface-panel);
  border: 1px solid var(--simex-border-strong);
  border-radius: var(--simex-style-panel-radius);
  box-shadow: var(--simex-style-shell-shadow);
}

.dashboard-dialog--compact { inline-size: min(100%, 520px); }
.dashboard-dialog--standard { inline-size: min(100%, 720px); }
.dashboard-dialog--wide { inline-size: min(100%, 1120px); }
.dashboard-dialog--fullscreen { inline-size: 100%; min-block-size: calc(100dvh - 24px); }
.dashboard-dialog--workspace { background: var(--simex-surface-canvas); }
.dashboard-dialog--utility { background: var(--simex-surface-panel); }
.dashboard-dialog--danger { border-color: var(--simex-error); }

.dashboard-dialog__header,
.dashboard-dialog__progress,
.dashboard-dialog__footer {
  flex: 0 0 auto;
  padding: 16px 20px;
  background: var(--simex-surface-panel-alt);
}

.dashboard-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-block-end: 1px solid var(--simex-border-subtle);
}

.dashboard-dialog__header h2,
.dashboard-dialog__header h3 {
  margin: 0;
  color: var(--simex-text-strong);
  font-family: var(--simex-style-heading-font);
}

.dashboard-dialog__progress {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  border-block-end: 1px solid var(--simex-border-subtle);
}

.dashboard-dialog__progress [aria-current="step"],
.dashboard-dialog__progress [aria-selected="true"] {
  color: var(--simex-selected);
  background: var(--simex-selected-soft);
  border-color: var(--simex-selected);
}

.dashboard-dialog__body {
  flex: 1 1 auto;
  min-block-size: 0;
  padding: 20px;
  overflow: auto;
  color: var(--simex-text-strong);
  background: var(--simex-surface-canvas);
}

.dashboard-dialog__section {
  padding: 16px;
  background: var(--simex-surface-panel);
  border: 1px solid var(--simex-border-subtle);
  border-radius: var(--simex-style-surface-radius);
  box-shadow: var(--simex-style-panel-shadow);
}

.dashboard-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-block-start: 1px solid var(--simex-border-subtle);
}

.dashboard-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.dashboard-dialog :where(button, input, select, textarea, [role="button"]):focus-visible {
  outline: var(--simex-component-focus-width) solid var(--simex-focus);
  outline-offset: 2px;
}

.dashboard-dialog :where(button, select, input:not([type="checkbox"]):not([type="radio"])) {
  min-block-size: var(--simex-control-min);
  border-radius: var(--simex-style-control-radius);
}

@media (max-width: 720px) {
  .dashboard-dialog-backdrop { padding: 8px; place-items: stretch; }
  .dashboard-dialog { max-block-size: calc(100dvh - 16px); }
  .dashboard-dialog__header,
  .dashboard-dialog__progress,
  .dashboard-dialog__body,
  .dashboard-dialog__footer { padding: 12px; }
  .dashboard-dialog__footer { flex-wrap: wrap; }
  .dashboard-dialog__footer > * { flex: 1 1 160px; }
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-dialog, .dashboard-dialog * { scroll-behavior: auto; }
}
```

- [ ] **Step 4: Import the stylesheet after the base grammar**

Add this line in `src/main.jsx` immediately after the existing grammar import:

```js
import "./styles/dashboard-style-grammar.css";
import "./styles/dashboard-dialogs.css";
```

- [ ] **Step 5: Run the contract tests and verify they pass**

Run: `node --test tests/dashboardDialogContract.test.js`

Expected: PASS, 2 tests.

- [ ] **Step 6: Commit the shared contract**

```bash
git add src/styles/dashboard-dialogs.css src/main.jsx tests/dashboardDialogContract.test.js
git commit -m "feat: add dashboard dialog style contract"
```

---

### Task 2: Migrate the Text/Image and chart authoring shells

**Files:**

- Modify: `src/components/static-content/StaticContentWizard.jsx:243-321`
- Modify: `src/components/chart-authoring/ChartWizardV3.jsx:1289-1367`
- Modify: `src/components/chart-authoring/ChartEditorModal.jsx:8-24`
- Modify: `src/styles/static-content.css`
- Modify: `src/styles/dashboard-style-grammar.css`
- Modify: `tests/dashboardDialogContract.test.js`
- Test: `tests/qmdRichTextEditor.test.js`
- Test: `tests/modalFocusMarkupV3.test.js`

**Interfaces:**

- Consumes: all classes created in Task 1.
- Produces: wizard shells with stable `__header`, `__progress`, `__body`, and `__footer` regions.
- Preserves: `static-content-dialog`, `chart-wizard`, `chart-wizard-v3`, `chart-editor-backdrop`, every `aria-*` attribute, and every event handler.

- [ ] **Step 1: Add failing SSR assertions for both authoring families**

Extend `tests/dashboardDialogContract.test.js` by loading the existing components through Vite SSR and asserting the semantic structure:

```js
test("Text/Image and chart authoring expose dashboard wizard regions", async () => {
  const [staticSource, chartSource, editorHost] = await Promise.all([
    read("src/components/static-content/StaticContentWizard.jsx"),
    read("src/components/chart-authoring/ChartWizardV3.jsx"),
    read("src/components/chart-authoring/ChartEditorModal.jsx"),
  ]);
  assert.match(staticSource, /static-content-dialog dashboard-dialog dashboard-dialog--wizard dashboard-dialog--wide/);
  assert.match(staticSource, /dashboard-dialog__header/);
  assert.match(staticSource, /dashboard-dialog__progress/);
  assert.match(staticSource, /dashboard-dialog__footer/);
  assert.match(chartSource, /chart-wizard chart-wizard-v3 dashboard-dialog dashboard-dialog--wizard dashboard-dialog--wide/);
  assert.match(chartSource, /dashboard-dialog__body/);
  assert.match(editorHost, /chart-editor-backdrop dashboard-dialog-backdrop/);
});

DIALOG_SURFACES.push(
  ["src/components/static-content/StaticContentWizard.jsx", "dashboard-dialog--wizard"],
  ["src/components/chart-authoring/ChartWizardV3.jsx", "dashboard-dialog--wizard"],
  ["src/components/chart-authoring/ChartEditorModal.jsx", "dashboard-dialog-backdrop"],
);
```

- [ ] **Step 2: Run the focused test and verify the new assertions fail**

Run: `node --test tests/dashboardDialogContract.test.js`

Expected: FAIL because the semantic classes are absent.

- [ ] **Step 3: Add semantic classes without changing authoring behavior**

Apply these exact class mappings:

```jsx
// StaticContentWizard.jsx
<div className="static-content-dialog-backdrop dashboard-dialog-backdrop">
<ModalFocusScope className="static-content-dialog dashboard-dialog dashboard-dialog--wizard dashboard-dialog--wide">
<header className="dashboard-dialog__header">
<nav className="dashboard-dialog__progress" aria-label="Text/Image stages">
<section className="static-content-dialog__body dashboard-dialog__body">
<footer className="dashboard-dialog__footer dashboard-dialog__actions">
```

```js
// ChartWizardV3.jsx createElement property changes
className: "chart-wizard-backdrop dashboard-dialog-backdrop"
className: "chart-wizard chart-wizard-v3 dashboard-dialog dashboard-dialog--wizard dashboard-dialog--wide"
className: "chart-wizard-header dashboard-dialog__header"
className: "chart-wizard-step-tabs dashboard-dialog__progress"
className: "chart-wizard-body dashboard-dialog__body"
className: "chart-wizard-footer dashboard-dialog__footer"
className: "chart-wizard-footer-actions dashboard-dialog__actions"
```

```js
// ChartEditorModal.jsx; the child ChartWizard remains the visual shell
className: "chart-editor-backdrop dashboard-dialog-backdrop"
```

- [ ] **Step 4: Narrow legacy rules that duplicate the shared shell**

In `src/styles/static-content.css` and `src/styles/dashboard-style-grammar.css`, remove only shell declarations now owned by the contract—outer background, border, radius, shadow, header/footer separation, and generic focus rings. Keep wizard grid geometry, editor sizing, chart workbench layout, and component-specific responsive rules. Use explicit adapter selectors for unique geometry:

```css
.static-content-dialog.dashboard-dialog { inline-size: min(1120px, 100%); }
.chart-wizard.dashboard-dialog { inline-size: min(1180px, 100%); }
.chart-wizard-workbench { min-block-size: 0; }
.static-content-dialog__body.dashboard-dialog__body { min-block-size: 0; }
```

- [ ] **Step 5: Run authoring and focus tests**

Run: `node --test tests/dashboardDialogContract.test.js tests/qmdRichTextEditor.test.js tests/modalFocusMarkupV3.test.js`

Expected: PASS; the rich-text controls and focus-scoped dialogs remain intact.

- [ ] **Step 6: Commit the authoring migration**

```bash
git add src/components/static-content/StaticContentWizard.jsx src/components/chart-authoring/ChartWizardV3.jsx src/components/chart-authoring/ChartEditorModal.jsx src/styles/static-content.css src/styles/dashboard-style-grammar.css tests/dashboardDialogContract.test.js
git commit -m "feat: style dashboard authoring dialogs"
```

---

### Task 3: Migrate source evidence dialogs and popovers

**Files:**

- Modify: `src/components/source-content/SourceContentWorkspace.jsx:297-323`
- Modify: `src/components/source-content/ContentActionDialog.jsx:35-129`
- Modify: `src/components/SourceViewer.jsx:24-110`
- Modify: `src/components/ColorField.jsx:166-230`
- Modify: `src/styles/source-content.css`
- Modify: `src/styles/source-viewer.css`
- Modify: `src/styles/dashboard-dialogs.css`
- Modify: `tests/dashboardDialogContract.test.js`
- Test: `tests/contentActionDialog.test.js`
- Test: `tests/sourceContentWorkspace.test.js`
- Test: `tests/sourceViewer.test.js`
- Test: `tests/chartAuthoringComponentsV3.test.js`

**Interfaces:**

- Consumes: workspace, utility, compact, and wide variants from Task 1.
- Produces: a source workspace shell, utility action dialogs, wide source viewer, and compact tokenized color popover.
- Preserves: source-content draft ownership, source-viewer dismissal behavior, color selection, and all existing restoration selectors.

- [ ] **Step 1: Add failing inventory assertions**

Add these entries to a `DIALOG_SURFACES` array in `tests/dashboardDialogContract.test.js` and assert every file contains its required contract string:

```js
DIALOG_SURFACES.push(
  ["src/components/source-content/SourceContentWorkspace.jsx", "dashboard-dialog--workspace"],
  ["src/components/source-content/ContentActionDialog.jsx", "dashboard-dialog--utility"],
  ["src/components/SourceViewer.jsx", "dashboard-dialog--workspace"],
  ["src/components/ColorField.jsx", "dashboard-dialog--compact"],
);

test("registered dialog surfaces opt into the shared contract", async () => {
  for (const [path, requiredClass] of DIALOG_SURFACES) {
    assert.match(await read(path), new RegExp(requiredClass), path);
  }
});
```

- [ ] **Step 2: Run the inventory test and verify it fails**

Run: `node --test tests/dashboardDialogContract.test.js`

Expected: FAIL naming `SourceContentWorkspace.jsx` as the first missing contract.

- [ ] **Step 3: Add the source evidence contract classes**

Use these mappings, preserving all current classes:

```jsx
// SourceContentWorkspace.jsx
className="source-content-workspace dashboard-dialog dashboard-dialog--workspace dashboard-dialog--wide"
<header className="source-content-workspace__header dashboard-dialog__header">
<div className="source-content-tabs dashboard-dialog__progress" ...>
<div className="source-content-composition dashboard-dialog__body">
```

```text
ContentActionDialog backdrop: confirm-dialog-backdrop dashboard-dialog-backdrop
ContentActionDialog shell: confirm-dialog dashboard-dialog dashboard-dialog--utility dashboard-dialog--compact
ContentActionDialog actions: confirm-dialog-actions dashboard-dialog__footer dashboard-dialog__actions
SourceViewer backdrop: source-viewer-backdrop dashboard-dialog-backdrop
SourceViewer panel: source-viewer-panel dashboard-dialog dashboard-dialog--workspace dashboard-dialog--wide
SourceViewer header: source-viewer-panel-header dashboard-dialog__header
Color popover: settings-color-popover dashboard-dialog dashboard-dialog--utility dashboard-dialog--compact
```

- [ ] **Step 4: Move generic surface styling to tokens and keep unique source layouts local**

Keep catalogue/detail grid sizing in `src/styles/source-content.css` and data-table geometry in `src/styles/source-viewer.css`. Add only narrow adapters to `src/styles/dashboard-dialogs.css`:

```css
.source-content-workspace.dashboard-dialog { block-size: min(820px, calc(100dvh - 32px)); }
.source-viewer-panel.dashboard-dialog { block-size: min(760px, calc(100dvh - 32px)); }
.settings-color-popover.dashboard-dialog {
  position: absolute;
  z-index: 2;
  inline-size: min(360px, calc(100vw - 24px));
  max-block-size: min(520px, calc(100dvh - 24px));
}
```

- [ ] **Step 5: Run the source and color behavior tests**

Run: `node --test tests/dashboardDialogContract.test.js tests/contentActionDialog.test.js tests/sourceContentWorkspace.test.js tests/sourceViewer.test.js tests/chartAuthoringComponentsV3.test.js`

Expected: PASS; source transactions, viewer controls, and color selection markup are unchanged.

- [ ] **Step 6: Commit the source evidence migration**

```bash
git add src/components/source-content/SourceContentWorkspace.jsx src/components/source-content/ContentActionDialog.jsx src/components/SourceViewer.jsx src/components/ColorField.jsx src/styles/source-content.css src/styles/source-viewer.css src/styles/dashboard-dialogs.css tests/dashboardDialogContract.test.js
git commit -m "feat: style source evidence dialogs"
```

---

### Task 4: Migrate utility, Build, confirmation, and recovery dialogs

**Files:**

- Modify: `src/components/common/ConfirmDialog.jsx:24-78`
- Modify: `src/components/chart-authoring/ChartConversionDialog.jsx:37-150`
- Modify: `src/components/build/BuildLayoutCreateDialog.jsx:34-75`
- Modify: `src/components/build/BuildMoveConfirmationDialog.jsx:15-41`
- Modify: `src/components/build/BuildMoveDialog.jsx:44-72`
- Modify: `src/components/build/DashboardPackageExportDialog.jsx:14-82`
- Modify: `src/components/build/DashboardPackageReviewDialog.jsx:13-75`
- Modify: `src/components/build/DeleteDashboardContentDialog.jsx:29-80`
- Modify: `src/components/build/SectionStructureCommandDialog.jsx:28-44`
- Modify: `src/components/build/BuildWorkspace.jsx:742-830`
- Modify: `src/components/app-shell/ApplicationRecovery.jsx:71-110`
- Modify: `src/components/app-shell/RestoreOnlineDashboardDialog.jsx:17-73`
- Modify: `src/styles/dashboard-dialogs.css`
- Modify: `tests/dashboardDialogContract.test.js`
- Test: `tests/buildLayoutMove.test.js`
- Test: `tests/dashboardPackageExportDialog.test.js`
- Test: `tests/deleteDashboardContentDialog.test.js`
- Test: `tests/applicationRecovery.test.js`
- Test: `tests/onlineDashboardRestore.test.js`
- Test: `tests/modalFocusMarkupV3.test.js`

**Interfaces:**

- Consumes: utility, danger, compact, standard, and workspace variants.
- Produces: one consistent confirmation/action hierarchy and tokenized non-modal Build auxiliary shells.
- Preserves: safe initial focus, alertdialog semantics, busy states, acknowledgement gates, package operations, and recovery actions.

- [ ] **Step 1: Add failing inventory assertions for every utility surface**

Append the exact files and required variants to `DIALOG_SURFACES`:

```js
DIALOG_SURFACES.push(
  ["src/components/common/ConfirmDialog.jsx", "dashboard-dialog--danger"],
  ["src/components/chart-authoring/ChartConversionDialog.jsx", "dashboard-dialog--utility"],
  ["src/components/build/BuildLayoutCreateDialog.jsx", "dashboard-dialog--utility"],
  ["src/components/build/BuildMoveConfirmationDialog.jsx", "dashboard-dialog--danger"],
  ["src/components/build/BuildMoveDialog.jsx", "dashboard-dialog--utility"],
  ["src/components/build/DashboardPackageExportDialog.jsx", "dashboard-dialog--utility"],
  ["src/components/build/DashboardPackageReviewDialog.jsx", "dashboard-dialog--utility"],
  ["src/components/build/DeleteDashboardContentDialog.jsx", "dashboard-dialog--danger"],
  ["src/components/build/SectionStructureCommandDialog.jsx", "dashboard-dialog--utility"],
  ["src/components/build/BuildWorkspace.jsx", "dashboard-dialog--workspace"],
  ["src/components/app-shell/ApplicationRecovery.jsx", "dashboard-dialog--utility"],
  ["src/components/app-shell/RestoreOnlineDashboardDialog.jsx", "dashboard-dialog--danger"],
);
```

- [ ] **Step 2: Run the inventory test and verify it fails**

Run: `node --test tests/dashboardDialogContract.test.js`

Expected: FAIL naming the unmigrated confirmation and Build files.

- [ ] **Step 3: Apply the shared class mapping**

Use the following mapping for every existing `confirm-dialog` family without reordering buttons:

```text
Normal backdrop: <existing backdrop classes> dashboard-dialog-backdrop
Normal shell: <existing shell classes> dashboard-dialog dashboard-dialog--utility dashboard-dialog--compact
Danger shell: <existing shell classes> dashboard-dialog dashboard-dialog--danger dashboard-dialog--compact
Header: <existing header class if present> dashboard-dialog__header
Main content wrapper when present: <existing class> dashboard-dialog__body
Actions: confirm-dialog-actions dashboard-dialog__footer dashboard-dialog__actions
```

Use these special mappings:

```jsx
// SectionStructureCommandDialog.jsx stays non-modal and anchored.
<aside className="section-structure-command-dialog dashboard-dialog dashboard-dialog--utility dashboard-dialog--standard" ...>

// BuildWorkspace.jsx auxiliary workspaces stay non-modal and retain their portal/positioning behavior.
className="build-authoring-auxiliary dashboard-dialog dashboard-dialog--workspace dashboard-dialog--wide"
```

For `ConfirmDialog`, keep the default as the danger variant because the shared component confirms destructive/discard actions in current call sites. For `RestoreOnlineDashboardDialog`, use the danger variant because it replaces local dashboard state. Use the utility variant for package review/export, layout creation, movement selection, conversion, and recovery review.

- [ ] **Step 4: Add utility and danger refinements**

Append tokenized rules to `src/styles/dashboard-dialogs.css`:

```css
.dashboard-dialog--utility > :where(p, ul, dl),
.dashboard-dialog--danger > :where(p, ul, dl) { margin-inline: 20px; }

.dashboard-dialog--danger {
  box-shadow: inset 4px 0 0 var(--simex-error), var(--simex-style-shell-shadow);
}

.dashboard-dialog--danger .dashboard-dialog__header .eyebrow,
.dashboard-dialog--danger > .eyebrow { color: var(--simex-error); }

.dashboard-dialog--danger button.danger {
  color: var(--simex-on-accent);
  background: var(--simex-error);
  border-color: var(--simex-error);
}

.build-authoring-auxiliary.dashboard-dialog,
.section-structure-command-dialog.dashboard-dialog {
  position: fixed;
  inset-block: var(--simex-control-min) 12px;
  inset-inline-end: 12px;
  margin: 0;
}
```

Keep existing placement offsets if they are more specific; do not replace Build portal ownership or anchoring logic.

- [ ] **Step 5: Run the utility behavior tests**

Run: `node --test tests/dashboardDialogContract.test.js tests/buildLayoutMove.test.js tests/dashboardPackageExportDialog.test.js tests/deleteDashboardContentDialog.test.js tests/applicationRecovery.test.js tests/onlineDashboardRestore.test.js tests/modalFocusMarkupV3.test.js`

Expected: PASS; safe focus and every utility workflow remain unchanged.

- [ ] **Step 6: Commit the utility migration**

```bash
git add src/components/common/ConfirmDialog.jsx src/components/chart-authoring/ChartConversionDialog.jsx src/components/build/BuildLayoutCreateDialog.jsx src/components/build/BuildMoveConfirmationDialog.jsx src/components/build/BuildMoveDialog.jsx src/components/build/DashboardPackageExportDialog.jsx src/components/build/DashboardPackageReviewDialog.jsx src/components/build/DeleteDashboardContentDialog.jsx src/components/build/SectionStructureCommandDialog.jsx src/components/build/BuildWorkspace.jsx src/components/app-shell/ApplicationRecovery.jsx src/components/app-shell/RestoreOnlineDashboardDialog.jsx src/styles/dashboard-dialogs.css tests/dashboardDialogContract.test.js
git commit -m "feat: style utility and recovery dialogs"
```

---

### Task 5: Migrate fullscreen, temporal, and drawer dialog surfaces

**Files:**

- Modify: `src/components/FullscreenDisplay.jsx:126-211`
- Modify: `src/components/time/SceneEditor.jsx:114-117`
- Modify: `src/components/common/RightSideDrawer.jsx:72-143`
- Modify: `src/styles/immersive-display.css`
- Modify: `src/styles/right-side-drawer.css`
- Modify: `src/styles/dashboard-dialogs.css`
- Modify: `tests/dashboardDialogContract.test.js`
- Test: `tests/fullscreenDisplay.test.js`
- Test: `tests/sceneStudio.test.js`
- Test: `tests/rightSideDrawer.test.js`

**Interfaces:**

- Consumes: fullscreen, workspace, utility, compact, header, body, and backdrop contracts.
- Produces: tokenized immersive display chrome, observation checklist dialog, and dialog-mode drawer styling.
- Preserves: display layout controls, temporal selections, drawer modality, Escape behavior, focus restoration, and complementary-mode drawer behavior.

- [ ] **Step 1: Add failing inventory and modality assertions**

Extend `DIALOG_SURFACES` and assert the drawer applies the contract only when its modality is `dialog`:

```js
DIALOG_SURFACES.push(
  ["src/components/FullscreenDisplay.jsx", "dashboard-dialog--fullscreen"],
  ["src/components/time/SceneEditor.jsx", "dashboard-dialog--utility"],
  ["src/components/common/RightSideDrawer.jsx", "dashboard-dialog--workspace"],
);

test("right drawer preserves complementary mode while styling dialog mode", async () => {
  const source = await read("src/components/common/RightSideDrawer.jsx");
  assert.match(source, /modality === "dialog"[\s\S]*?dashboard-dialog--workspace/);
  assert.match(source, /role: modality/);
});

async function jsxFiles(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directoryUrl);
    if (entry.isDirectory()) return jsxFiles(url);
    return entry.name.endsWith(".jsx") ? [url] : [];
  }));
  return files.flat();
}

test("every explicit first-party dialog role is registered", async () => {
  const registered = new Set(DIALOG_SURFACES.map(([path]) => path.replaceAll("\\", "/")));
  const files = await jsxFiles(new URL("../src/", import.meta.url));
  for (const url of files) {
    const source = await readFile(url, "utf8");
    const hasExplicitDialogRole = /role\s*(?:=|:)\s*["'](?:alert)?dialog["']/.test(source);
    if (!hasExplicitDialogRole) continue;
    const path = `src/${url.pathname.split("/src/")[1]}`;
    assert.ok(registered.has(path), `${path} must register a dashboard dialog contract`);
  }
});
```

- [ ] **Step 2: Run the inventory test and verify it fails**

Run: `node --test tests/dashboardDialogContract.test.js`

Expected: FAIL because the fullscreen, scene, and drawer classes are absent.

- [ ] **Step 3: Add semantic classes without changing controls or modality**

Apply these mappings:

```jsx
// FullscreenDisplay.jsx
className="fullscreen-backdrop fullscreen-backdrop--immersive dashboard-dialog-backdrop"
className={`multi-fullscreen-panel multi-fullscreen-${resolvedLayout} dashboard-dialog dashboard-dialog--workspace dashboard-dialog--fullscreen`}
className="multi-fullscreen-controls dashboard-dialog__header"

// SceneEditor.jsx ObservationChecklist
className="scene-observation-dialog dashboard-dialog-backdrop"
className="dashboard-dialog dashboard-dialog--utility dashboard-dialog--compact"
className="dashboard-dialog__header"
```

Build the drawer class condition with the existing `joinClasses` helper:

```js
const drawerClassName = joinClasses(
  "right-side-drawer",
  modality === "dialog" && "dashboard-dialog dashboard-dialog--workspace dashboard-dialog--wide",
  className,
);
```

Add `dashboard-dialog__header` and `dashboard-dialog__body` to `headerClasses` and `contentClasses` only in dialog mode; complementary drawers keep their present classes and appearance.

- [ ] **Step 4: Narrow immersive and drawer legacy styles**

Keep display grid geometry and drawer placement local, but remove duplicate shell paint. Add responsive adapters:

```css
.multi-fullscreen-panel.dashboard-dialog { block-size: calc(100dvh - 24px); }
.scene-observation-dialog > .dashboard-dialog { max-block-size: min(720px, calc(100dvh - 24px)); }
.right-side-drawer.dashboard-dialog { block-size: 100%; max-block-size: none; }

@media (max-width: 720px) {
  .multi-fullscreen-panel.dashboard-dialog { min-block-size: calc(100dvh - 16px); }
  .right-side-drawer.dashboard-dialog { inline-size: 100%; }
}
```

- [ ] **Step 5: Run display, temporal, and drawer tests**

Run: `node --test tests/dashboardDialogContract.test.js tests/fullscreenDisplay.test.js tests/sceneStudio.test.js tests/rightSideDrawer.test.js`

Expected: PASS; fullscreen order, scene selection, and drawer modality/focus behavior remain unchanged.

- [ ] **Step 6: Commit the final dialog family migration**

```bash
git add src/components/FullscreenDisplay.jsx src/components/time/SceneEditor.jsx src/components/common/RightSideDrawer.jsx src/styles/immersive-display.css src/styles/right-side-drawer.css src/styles/dashboard-dialogs.css tests/dashboardDialogContract.test.js
git commit -m "feat: style display and temporal dialogs"
```

---

### Task 6: Verify the complete dialog system in real use

**Files:**

- Verify: `src/styles/dashboard-dialogs.css`
- Verify: all components listed in Tasks 2–5
- Verify: `tests/dashboardDialogContract.test.js`

**Interfaces:**

- Consumes: the complete migrated dialog system.
- Produces: a final verified candidate; no evidence-only source file or commit is required.

- [ ] **Step 1: Run the complete task-specific deterministic selection**

Run:

```bash
node --test tests/dashboardDialogContract.test.js tests/qmdRichTextEditor.test.js tests/modalFocusMarkupV3.test.js tests/contentActionDialog.test.js tests/sourceContentWorkspace.test.js tests/sourceViewer.test.js tests/buildLayoutMove.test.js tests/dashboardPackageExportDialog.test.js tests/deleteDashboardContentDialog.test.js tests/applicationRecovery.test.js tests/onlineDashboardRestore.test.js tests/fullscreenDisplay.test.js tests/sceneStudio.test.js tests/rightSideDrawer.test.js
```

Expected: PASS for the complete listed selection. Report this accurately as the task-specific selection, not the full repository suite.

- [ ] **Step 2: Build the application once**

Run: `pnpm build`

Expected: Vite build and `verify-v3-static-build.mjs --finalize` complete successfully. Do not stage timestamp-only biomedical derivative changes produced by the build.

- [ ] **Step 3: Start or reuse the current-project development server**

Run: `pnpm dev -- --host 0.0.0.0 --port 5173`

Expected: the server reports the current branch project and exposes `http://192.168.1.127:5173/`. Confirm the served `/src/main.jsx` imports `dashboard-dialogs.css` before browser inspection.

- [ ] **Step 4: Inspect four representative surfaces at desktop width**

Use the application UI to inspect:

```text
1. Add Text/Image → Content: wizard header, progress, rich-text writer card, rendered preview, Markdown card, and footer.
2. Source content: workspace header, tabs, catalogue/detail split, and one content action dialog.
3. Build utility: layout/move or package review plus a destructive delete/discard confirmation.
4. Display/temporal: fullscreen comparison or Scene observation checklist plus a dialog-mode right drawer.
```

Expected for each: dashboard fonts, tokenized panel/canvas surfaces, consistent borders/radii/shadows, one clear primary action, quiet secondary actions, visible selected state, and no generic browser-default control styling.

- [ ] **Step 5: Repeat the geometry checks at a 390 × 844 viewport**

Verify:

```text
- The page has no horizontal scrollbar.
- Headers and close actions remain visible.
- Wizard progress can wrap or scroll without clipping.
- Dialog bodies scroll internally.
- Two-column content becomes one column before controls overlap.
- Footer actions wrap and remain at least the dashboard minimum control height.
```

- [ ] **Step 6: Verify keyboard and reduced-motion behavior**

For one wizard and one utility dialog, use Tab and Shift+Tab through controls, activate a selection, and close with Escape where already supported. Emulate reduced motion in browser developer tools and confirm the UI does not depend on an animation to reveal state.

Expected: focus remains visible, safe initial focus is preserved, selected/current state is not color-only, Escape behavior matches the pre-migration component, and closing returns focus as before.

- [ ] **Step 7: Confirm repository state before handoff**

Run:

```bash
git status --short
git log --oneline -6
```

Expected: only known timestamp/line-ending biomedical derivative files may remain modified; all dialog implementation and test files are committed in the coherent task commits above.
