# Layout and Moderator Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore version-3 panel sizing and make moderator save, reset, create, and remove operations await persistence before closing their editing context.

**Architecture:** A small layout-contract module gives JSX and tests one authoritative size-to-class mapping. A small transaction utility serializes one user-triggered operation, awaits pending edits and persistence, and suppresses duplicate activation; React surfaces keep only presentation state and close after the returned promise resolves.

**Tech Stack:** React 19, Node test runner, CSS Grid, Vite, existing serialized dashboard commit controller.

## Global Constraints

- Work only in `C:\Users\hekma\Documents\SimEx Dashboard\.worktrees\simex-dashboard-v2\dashboard-refinement-round-2`.
- Do not read from or write to OneDrive.
- Do not modify an existing dashboard or Quorum worktree.
- Do not merge, push, deploy, or update Cloudflare without explicit user approval.
- Preserve schema-v3 layout sizes: `compact`, `standard`, `wide`, and `full`.
- Preserve the last-good dashboard when persistence fails.
- Do not clone `loadedData` to represent operation state.
- Run only each task's focused test during implementation; reserve the full unit, E2E, and build gate for visual sign-off.

---

### Task 1: Restore the Version-3 Layout Class Contract

**Files:**
- Create: `src/components/chartPanelLayout.js`
- Modify: `src/components/ChartPanel.jsx:1-105`
- Modify: `src/styles.css:150-176, 687-740, 1485-1510`
- Create: `tests/chartPanelLayout.test.js`

**Interfaces:**
- Consumes: `chart.layout.size` validated as `compact | standard | wide | full`.
- Produces: `chartPanelLayoutClass(size): string`, returning one of `chart-panel-compact`, `chart-panel-standard`, `chart-panel-wide`, or `chart-panel-full`.

- [x] **Step 1: Write the failing layout contract test**

```js
import assert from "node:assert/strict";
import test from "node:test";

import { chartPanelLayoutClass } from "../src/components/chartPanelLayout.js";

test("version-3 chart sizes map to their panel layout classes", () => {
  const expected = {
    compact: "chart-panel-compact",
    standard: "chart-panel-standard",
    wide: "chart-panel-wide",
    full: "chart-panel-full",
  };
  for (const [size, className] of Object.entries(expected)) {
    assert.equal(chartPanelLayoutClass(size), className);
  }
  assert.equal(chartPanelLayoutClass("removed-v2-size"), "chart-panel-standard");
});
```

- [x] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test tests/chartPanelLayout.test.js
```

Expected: FAIL because `src/components/chartPanelLayout.js` does not exist.

- [x] **Step 3: Implement the authoritative class mapping**

```js
const PANEL_LAYOUT_CLASSES = Object.freeze({
  compact: "chart-panel-compact",
  standard: "chart-panel-standard",
  wide: "chart-panel-wide",
  full: "chart-panel-full",
});

export function chartPanelLayoutClass(size = "standard") {
  return PANEL_LAYOUT_CLASSES[size] ?? PANEL_LAYOUT_CLASSES.standard;
}
```

Import this function in `ChartPanel.jsx` and replace the interpolated
`chart-panel-${size}` expression with `chartPanelLayoutClass(chart.layout?.size)`.

- [x] **Step 4: Replace obsolete CSS size selectors**

Use these exact grid contracts:

```css
.chart-panel-compact { grid-column: span 1; grid-row: span 1; }
.chart-panel-standard { grid-column: span 2; grid-row: span 1; }
.chart-panel-wide { grid-column: span 4; grid-row: span 1; }
.chart-panel-full {
  grid-column: span 4;
  grid-row: span 2;
  min-height: 736px;
}
```

Update the phone and narrow-screen selectors to use the same four class names,
collapse their grid columns to `auto`, and retain the larger intrinsic height
only for `.chart-panel-full`. Remove the version-2 `chart-size-half`,
`chart-size-normal`, `chart-size-tall`, and `chart-size-large` selectors.

- [x] **Step 5: Run the focused test and verify GREEN**

Run:

```powershell
node --test tests/chartPanelLayout.test.js
```

Expected: PASS with one test and no warnings.

- [x] **Step 6: Commit the layout contract**

```powershell
git add src/components/chartPanelLayout.js src/components/ChartPanel.jsx src/styles.css tests/chartPanelLayout.test.js
git commit -m "fix: restore chart panel layout sizes"
```

---

### Task 2: Add a Reusable Moderator Transaction and Submission Gate

**Files:**
- Create: `src/lib/moderatorTransaction.js`
- Create: `tests/moderatorTransaction.test.js`

**Interfaces:**
- Produces: `runModeratorTransaction({ flush, commit, onCommitted })`.
- Produces: `createSubmissionGate()` with `run(operation)` and `isActive()`.
- Guarantees: flush precedes commit, success callback follows commit, a rejected
  operation never invokes success, concurrent gate calls share one in-flight
  promise, and the gate reopens after either settlement.

- [x] **Step 1: Write failing transaction-order tests**

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  createSubmissionGate,
  runModeratorTransaction,
} from "../src/lib/moderatorTransaction.js";

test("moderator transaction closes only after flush and commit", async () => {
  const order = [];
  await runModeratorTransaction({
    flush: async () => order.push("flush"),
    commit: async () => { order.push("commit"); return "saved"; },
    onCommitted: async (value) => order.push(`close:${value}`),
  });
  assert.deepEqual(order, ["flush", "commit", "close:saved"]);
});

test("moderator transaction preserves the editing context on failure", async () => {
  let closed = false;
  await assert.rejects(runModeratorTransaction({
    flush: async () => {},
    commit: async () => { throw new Error("storage failed"); },
    onCommitted: async () => { closed = true; },
  }), /storage failed/);
  assert.equal(closed, false);
});

test("submission gate coalesces duplicate activation and reopens", async () => {
  const gate = createSubmissionGate();
  let calls = 0;
  let release;
  const operation = () => {
    calls += 1;
    return new Promise((resolve) => { release = resolve; });
  };
  const first = gate.run(operation);
  const second = gate.run(operation);
  assert.equal(first, second);
  assert.equal(calls, 1);
  release("saved");
  assert.equal(await first, "saved");
  assert.equal(await gate.run(async () => "again"), "again");
});
```

- [x] **Step 2: Run the tests and verify RED**

Run:

```powershell
node --test tests/moderatorTransaction.test.js
```

Expected: FAIL because `src/lib/moderatorTransaction.js` does not exist.

- [x] **Step 3: Implement the minimal transaction utility**

```js
export async function runModeratorTransaction({ flush, commit, onCommitted } = {}) {
  if (typeof commit !== "function") throw new TypeError("Moderator transaction requires a commit operation.");
  if (flush !== undefined && typeof flush !== "function") throw new TypeError("Moderator transaction flush must be a function.");
  if (onCommitted !== undefined && typeof onCommitted !== "function") throw new TypeError("Moderator transaction completion must be a function.");
  if (flush) await flush();
  const result = await commit();
  if (onCommitted) await onCommitted(result);
  return result;
}

export function createSubmissionGate() {
  let active = null;
  return Object.freeze({
    run(operation) {
      if (active) return active;
      if (typeof operation !== "function") return Promise.reject(new TypeError("Submission operation must be a function."));
      active = Promise.resolve().then(operation).finally(() => { active = null; });
      return active;
    },
    isActive() { return active !== null; },
  });
}
```

- [x] **Step 4: Run the focused tests and verify GREEN**

Run:

```powershell
node --test tests/moderatorTransaction.test.js
```

Expected: PASS with three tests and no warnings.

- [x] **Step 5: Commit the transaction primitive**

```powershell
git add src/lib/moderatorTransaction.js tests/moderatorTransaction.test.js
git commit -m "feat: add moderator transaction primitive"
```

---

### Task 3: Make Chart Save and Creation Transactional

**Files:**
- Modify: `src/App.jsx:250-305, 420-455`
- Modify: `src/components/DashboardRenderer.jsx:40-105, 255-285, 735-780`
- Modify: `src/components/chart-authoring/ChartEditorV3.jsx:330-490, 560-590`
- Modify: `src/components/chart-authoring/EditSessionActions.jsx`
- Modify: `src/components/chart-authoring/ChartWizardV3.jsx:70-100, 390-420, 570-590`
- Modify: `tests/chartAuthoringComponentsV3.test.js`
- Create: `tests/e2e/moderator-transactions.spec.js`

**Interfaces:**
- Consumes: `runModeratorTransaction` and `createSubmissionGate` from Task 2.
- Changes: `App.saveChart(payload)` returns the serialized commit promise.
- Changes: `DashboardRenderer.saveSelectedChartV3(payload)` returns a promise
  and clears selection only after success.
- Changes: `EditSessionActions` accepts `submitting` and uses it to disable all
  editing commands and render `Saving...`.

- [x] **Step 1: Add failing authoring-state assertions**

Extend the existing component tests with server-rendered pending states:

```js
test("chart editor actions lock while persistence is pending", async () => {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: EditSessionActions } = await import(
    "../src/components/chart-authoring/EditSessionActions.jsx"
  );
  const html = renderToStaticMarkup(React.createElement(EditSessionActions, {
    valid: true,
    submitting: true,
  }));
  assert.match(html, />Saving\.\.\.</);
  assert.equal((html.match(/disabled=""/g) ?? []).length, 3);
});
```

Create `tests/e2e/moderator-transactions.spec.js` with a real-browser failure
scenario. The test replaces only the browser-storage boundary and exercises the
real App, renderer, and chart editor:

```js
import { expect, test } from "@playwright/test";

const CONTROL_URL = "http://127.0.0.1:4174";
const STORAGE_KEY = "simex-dashboard-config-v3";

test.beforeEach(async ({ request, page }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
  await page.addInitScript((storageKey) => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function patchedSetItem(key, value) {
      if (key === storageKey && globalThis.__SIMEX_FAIL_SAVE__ === true) {
        throw new DOMException("Storage full", "QuotaExceededError");
      }
      return setItem.call(this, key, value);
    };
  }, STORAGE_KEY);
});

async function openDashboardEditMode(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Biomedical", exact: true }).click();
  await page.getByRole("button", { name: "Open edit mode" }).click();
}

async function openFirstChartEditor(page) {
  await openDashboardEditMode(page);
  await page.locator(".chart-panel").first()
    .getByRole("button", { name: "Edit chart" }).click();
}

test("failed chart save keeps the editor and draft open for retry", async ({ page }) => {
  await openFirstChartEditor(page);
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
  await page.locator(".chart-editor-v3").getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".chart-editor-v3")).toBeVisible();
  await expect(page.locator(".chart-editor-error")).toContainText("Browser storage is full");

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = false; });
  await page.locator(".chart-editor-v3").getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".chart-editor-v3")).toBeHidden();
});
```

- [x] **Step 2: Run the focused authoring tests and verify RED**

Run:

```powershell
node --test tests/chartAuthoringComponentsV3.test.js tests/dashboardAppV3.test.js
pnpm exec playwright test tests/e2e/moderator-transactions.spec.js --project=chromium --grep "failed chart save"
```

Expected: FAIL because pending actions do not yet render or lock and chart save
closes the editor before its rejected commit is reported.

- [x] **Step 3: Return chart-save promises from App**

Change `saveChart` to:

```js
function saveChart(payload) {
  return ensureDashboardCommitController().mutate((current) => (
    integrateSavedChart(current, payload)
  ));
}
```

Do not change background, drag, or text-debounce mutations in this task.

- [x] **Step 4: Await chart save before closing the editor**

Use `runModeratorTransaction` in `saveSelectedChartV3`:

```js
return runModeratorTransaction({
  flush: () => pendingEdits.flush(),
  commit: () => onChartSave(payload),
  onCommitted: () => {
    setChartEditBaseline(null);
    setSelectedPanelId(null);
  },
});
```

Make the editor `submit` handler async, guard it with one `createSubmissionGate`
stored in a ref, set `submitting` for presentation, and assign any rejection to
the existing bounded editor error without closing.

- [x] **Step 5: Lock wizard creation**

Store a `createSubmissionGate` in the wizard, expose `submitting`, and render:

```js
React.createElement("button", {
  type: "button",
  disabled: !canCreate || submitting,
  onClick: finish,
}, submitting ? "Creating..." : "Create chart")
```

The parent's existing async `onCreate` closes the wizard only after both
pending edits and chart creation resolve. A rejected promise retains the wizard.

- [x] **Step 6: Run the focused tests and verify GREEN**

Run:

```powershell
node --test tests/moderatorTransaction.test.js tests/chartAuthoringComponentsV3.test.js tests/dashboardAppV3.test.js
pnpm exec playwright test tests/e2e/moderator-transactions.spec.js --project=chromium --grep "failed chart save"
```

Expected: PASS with no unhandled rejection or warning.

- [x] **Step 7: Commit transactional chart authoring**

```powershell
git add src/App.jsx src/components/DashboardRenderer.jsx src/components/chart-authoring/ChartEditorV3.jsx src/components/chart-authoring/EditSessionActions.jsx src/components/chart-authoring/ChartWizardV3.jsx tests/chartAuthoringComponentsV3.test.js tests/e2e/moderator-transactions.spec.js
git commit -m "fix: await chart authoring persistence"
```

---

### Task 4: Make Edit-Session Save, Reset, and Chart Removal Transactional

**Files:**
- Modify: `src/App.jsx:255-305, 420-455`
- Modify: `src/components/DashboardRenderer.jsx:75-110, 130-180, 380-405, 505-535, 760-780`
- Modify: `src/components/chart-authoring/ChartEditorV3.jsx:570-600`
- Modify: `tests/e2e/moderator-transactions.spec.js`

**Interfaces:**
- Consumes: `runModeratorTransaction` from Task 2.
- Changes: `App.resetEditSession()` and `App.removeChart(panelId)` return promises.
- Produces: one renderer operation state `{ kind, error }`, where `kind` is
  `save-session | reset-session | remove-chart | null`.
- Produces: shared chart-removal confirmation through `ConfirmDialog`.

- [x] **Step 1: Add failing edit-session and removal transaction coverage**

Append this real-browser removal failure and retry scenario:

```js
test("failed chart removal keeps confirmation and chart available for retry", async ({ page }) => {
  await openFirstChartEditor(page);
  await page.locator(".chart-editor-v3").getByRole("button", { name: "Remove chart" }).click();
  const confirmation = page.getByRole("dialog", { name: "Remove this chart?" });
  await expect(confirmation).toBeVisible();

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
  await confirmation.getByRole("button", { name: "Remove chart" }).click();
  await expect(confirmation).toBeVisible();
  await expect(page.locator(".chart-editor-v3")).toBeVisible();
  await expect(page.locator(".edit-operation-error")).toContainText("Browser storage is full");

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = false; });
  await confirmation.getByRole("button", { name: "Remove chart" }).click();
  await expect(confirmation).toBeHidden();
  await expect(page.locator(".chart-editor-v3")).toBeHidden();
});

test("failed edit-session save and reset keep edit mode available for retry", async ({ page }) => {
  await openDashboardEditMode(page);
  await page.getByLabel("Program label").fill("Unsaved exercise label");
  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = true; });
  await page.getByRole("button", { name: "Save edit mode" }).click();
  await expect(page.getByRole("button", { name: "Save edit mode" })).toBeVisible();
  await expect(page.locator(".edit-operation-error")).toContainText("Browser storage is full");

  await page.getByRole("button", { name: "Reset edits" }).click();
  const confirmation = page.getByRole("dialog", { name: "Discard these edits?" });
  await confirmation.getByRole("button", { name: "Reset edits" }).click();
  await expect(confirmation).toBeVisible();
  await expect(page.getByRole("button", { name: "Save edit mode" })).toBeVisible();

  await page.evaluate(() => { globalThis.__SIMEX_FAIL_SAVE__ = false; });
  await confirmation.getByRole("button", { name: "Reset edits" }).click();
  await expect(page.getByRole("button", { name: "Open edit mode" })).toBeVisible();
});
```

- [x] **Step 2: Run the focused browser test and verify RED**

Run:

```powershell
pnpm exec playwright test tests/e2e/moderator-transactions.spec.js --project=chromium --grep "failed chart removal"
```

Expected: FAIL because chart removal has no confirmation and edit-session
operations do not await rejected persistence before closing.

- [x] **Step 3: Return reset and removal commit promises from App**

Implement reset as:

```js
async function resetEditSession() {
  if (editBaseline) await commitConfiguration(editBaseline);
  setEditBaseline(null);
  setEditMode(false);
}
```

Return the `ensureDashboardCommitController().mutate(...)` promise from
`removeChart`, preserving the existing time-sync membership cleanup inside the
mutator.

- [x] **Step 4: Await whole-session save and reset in DashboardRenderer**

Create one state object and one runner in `DashboardRenderer`:

```js
const [moderatorOperation, setModeratorOperation] = React.useState({
  kind: null,
  error: "",
});

async function performModeratorOperation(kind, transaction) {
  if (moderatorOperation.kind !== null) return;
  setModeratorOperation({ kind, error: "" });
  try {
    await transaction();
    setModeratorOperation({ kind: null, error: "" });
  } catch (error) {
    setModeratorOperation({
      kind: null,
      error: error instanceof Error ? error.message : "The dashboard could not be saved.",
    });
  }
}
```

Disable Save and Reset together whenever `moderatorOperation.kind !== null`.
`saveEditMode` awaits `pendingEdits.flush()` before `onToggleEditMode`. Reset
first calls `pendingEdits.cancel()`, then awaits `onResetEditSession`; it closes
its confirmation only after success. Render `Saving...` or `Resetting...` in
the initiating button and render `moderatorOperation.error` inside
`<p role="alert" className="edit-operation-error">`.

- [x] **Step 5: Add shared chart-removal confirmation**

Replace direct `removePanel(panelId)` calls with a pending panel ID. Render:

```jsx
<ConfirmDialog
  open={pendingRemovalPanelId !== null}
  title="Remove this chart?"
  message="The chart will be removed from this dashboard and any synchronized playback group."
  confirmLabel={operation.kind === "remove-chart" ? "Removing..." : "Remove chart"}
  cancelLabel="Keep chart"
  confirmDisabled={operation.kind === "remove-chart"}
  onConfirm={confirmPanelRemoval}
  onCancel={cancelPanelRemoval}
/>
```

Add optional `confirmDisabled = false` to `ConfirmDialog` and apply it as the
confirm button's `disabled` property. Existing callers retain the current
enabled default.

- [x] **Step 6: Run the focused verification**

Run:

```powershell
node --test tests/moderatorTransaction.test.js tests/dashboardAppV3.test.js tests/chartAuthoringComponentsV3.test.js tests/chartPanelLayout.test.js
pnpm exec playwright test tests/e2e/moderator-transactions.spec.js --project=chromium
```

Expected: PASS with no failures or warnings.

Run only this focused two-test browser file during the implementation cycle.
The complete E2E suite remains deferred to the visual-signoff gate.

- [x] **Step 7: Commit transactional edit sessions**

```powershell
git add src/App.jsx src/components/DashboardRenderer.jsx src/components/chart-authoring/ChartEditorV3.jsx src/components/common/ConfirmDialog.jsx tests/e2e/moderator-transactions.spec.js
git commit -m "fix: make moderator edit operations transactional"
```

---

### Task 5: Focused Handoff

**Files:**
- Modify: `docs/superpowers/plans/2026-08-01-layout-and-moderator-transactions.md`

**Interfaces:**
- Consumes: Tasks 1-4.
- Produces: an implementation checkpoint ready for user visual examination.

- [x] **Step 1: Run the focused Node tests once**

```powershell
node --test tests/chartPanelLayout.test.js tests/moderatorTransaction.test.js tests/chartAuthoringComponentsV3.test.js tests/dashboardAppV3.test.js
```

Expected: all selected tests pass.

- [x] **Step 2: Check patch hygiene**

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors; only the intended refinement and plan-status
files appear.

- [x] **Step 3: Record task completion**

Check the completed plan boxes and commit only that bookkeeping change:

```powershell
git add docs/superpowers/plans/2026-08-01-layout-and-moderator-transactions.md
git commit -m "docs: record moderator refinement checkpoint"
```

- [ ] **Step 4: Hold the full verification gate**

Ask the user to inspect compact, standard, wide, and full layouts plus chart
save, failed/retried save, reset, create, and removal interactions. Run
`pnpm test`, `pnpm test:e2e`, and `pnpm build` only after visual acceptance.
