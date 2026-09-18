# View and Build Decision Surface Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task by task inside the assigned lane. Execute inline in the dedicated worktree; do not delegate further. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give View an attention strip and a page-level time context, settle Build into a persistent structure rail, properties pane, regrouped command row, and single-menu section and panel actions, and collapse the phone-width View crown to one row with capped chart heights.

**Architecture:** A Section `role` field and a wrapper `drill` field extend the version 6 dashboard contract without a version bump; pure helpers in `sectionRoles.js` give View, Build, and tests one reading. Page time reuses the playback reducer with an explicit whole-page source preference. Build's frame becomes a CSS grid whose rails and canvas are siblings through `display: contents`, and a shared `ActionMenu` replaces per-section and per-panel button rows. The phone crown is a `matchMedia`-driven variant of the existing crown components.

**Tech Stack:** React 19, Vite 6, Node test runner with SSR markup through `vite.ssrLoadModule`, Playwright Chromium, plain CSS with the existing token set.

**Spec:** `docs/superpowers/specs/2026-09-18-view-build-decision-surface-design.md`

**Verified base:** `c003d11` on `origin/main`; spec committed as `9b09b21`.

## Global Constraints

- Version 3 chart configuration is the only supported contract; add no migration or compatibility paths.
- Dashboard `configVersion` stays `6`. `role` and `drill` are optional; absent fields keep today's meaning.
- Attention strip charts are limited to `typeId` `kpi` and `deltaCard`.
- Command action ids: `add-chart`, `add-text-image`, `source-content`, `chrono-studio`, `scene-studio`, `discard-build-changes`, `finish-build`. The `more` action is removed.
- Command groups: `insert`, `libraries`, `session`, in that order, labelled `Insert`, `Libraries`, `Session`.
- Section menu items in order: `Rename`, `Move earlier`, `Move later`, `Move to Page…`, `Merge…`, `Remove…`.
- Panel menu items in order: `Edit chart`, `Move…`, `Start section here`, `Remove chart`.
- Build grid columns: `minmax(220px, 260px) minmax(0, 1fr) minmax(280px, 320px)` at `min-width: 1200px`; `220px minmax(0, 1fr) 280px` from 1024px to 1199px; stacked below 1024px.
- Mobile View breakpoint: `max-width: 767px`, View mode only. Chart footprint height at that width: `clamp(240px, 52vh, 420px)`.
- No new colours, radii, shadows, or fonts. Use tokens from `src/styles/tokens.css` only.
- Test cadence per AGENTS.md: run only the named targeted check for each task. Do not run full suites during implementation. The pre-merge gates (`pnpm.cmd test`, `pnpm.cmd build`, `pnpm.cmd test:e2e -- --project=chromium`) run once when the user declares the branch ready.
- Commit each task on its own with the attribution line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Unit tests that render components follow the existing pattern: `createServer` from Vite in middleware mode, `vite.ssrLoadModule`, `renderToStaticMarkup`, then `vite.close()`.

## Lanes and ordering

| Lane | Weight | Tasks | Owner files |
| --- | --- | --- | --- |
| A, Build chrome | terra or soul | 1, 2, 3, 4 | `BuildCommandHeader.jsx`, `BuildMoreDrawer.jsx`, `common/ActionMenu.jsx`, `DashboardSection.jsx` (header only), `ChartPanel.jsx`, `iconCatalog.js`, `buildWorkflow.js` |
| B, structure and rails | astra | 5, 6, 7, 8, 9, 11, then 10 | `dashboardConfigStructure.js`, `sectionRoles.js`, `DashboardAttentionStrip.jsx`, `DashboardCanvas.jsx`, `buildLayoutDraft.js`, `buildLayoutMove.js`, `BuildStructureRail.jsx`, `BuildPropertiesPane.jsx`, `BuildWorkspace.jsx`, `CanonicalDashboardFrame.jsx`, `App.jsx`, `DashboardRenderer.jsx`, `playbackReducer.js`, `PlaybackProvider.jsx`, `PageTimeContext.jsx` |
| C, mobile View | terra or soul | 12, 13, 14 | `DashboardCommandCrown.jsx`, `DashboardIdentityRow.jsx`, `DashboardHeader.jsx`, `useMediaQuery.js`, `modes.css` mobile block |

Shared files and their owners:

- `src/styles/modes.css`: each lane appends its own clearly commented block at the end of the file (`/* Lane A: … */`, `/* Lane B: … */`, `/* Lane C: … */`). Nobody edits another lane's block. Lane B also deletes the `dashboard-map-*` rules in Task 9.
- `src/components/dashboard/DashboardSection.jsx`: Lane A edits only `BuildSectionHeader`; Lane B edits only the props and role tag (Task 6 adds the tag inside `BuildSectionHeader`'s title block, one line).
- `src/theme/dashboardRegionRegistry.js` and `tests/e2e/support/dashboard-surface-manifest.js`: Lane A adds the two menu regions (Task 4); Lane B adds rail, pane, and strip regions and removes the drawer regions (Task 9).
- `tests/e2e/support/buildWorkflow.js`: Lane A adds `sectionMenu` and `panelMenu` (Task 4); Lane B replaces the map helpers with `structureRail` and `propertiesPane` (Task 9).

Task order inside a lane is fixed. Lanes run in parallel. In Lane B, Task 11 (properties pane role and drill controls) needs Tasks 5, 7, and 9, and Task 10 (browser journeys) runs last because its strip journey authors the role through Task 11's controls. Rebase onto the integration branch before starting a task that touches a shared file.

---

## Lane A: Build chrome

### Task 1: Regroup the Build command row and remove the More drawer

**Files:**

- Modify: `src/components/build/BuildCommandHeader.jsx`
- Delete: `src/components/build/BuildMoreDrawer.jsx`
- Modify: `tests/buildCommandHeader.test.js`
- Modify: `src/styles/modes.css` (Lane A block)

**Interfaces:**

- Consumes: `BuildWorkspace` props `pendingWork`, `locked`, `disabledReason`, `auxiliaryLocked`, `auxiliaryDisabledReason`, `onFinish`, `onReset`, `onAddChart`, `onAddStaticContent`, `onOpenAuxiliary` (unchanged).
- Produces: `data-build-command-group` attributes and the `scene-studio` action; `BuildWorkspace` stops passing `accessibilityEnabled` and `onAccessibilityChange` to the header (it still receives them from the renderer for other uses; leave those props on `BuildWorkspace`).

- [ ] **Step 1: Rewrite the command-header test**

Replace the four tests in `tests/buildCommandHeader.test.js` with these (keep the file's Vite bootstrap and `renderWorkspace` helper; drop the `BuildMoreDrawer` import):

```js
test("Build command row exposes Insert, Libraries, and Session groups in order", () => {
  const html = renderWorkspace();
  const groupOrder = [...html.matchAll(/data-build-command-group="([^"]+)"/g)].map((match) => match[1]);
  const actionOrder = [...html.matchAll(/data-build-command-action="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(groupOrder, ["insert", "libraries", "session"]);
  assert.deepEqual(actionOrder, [
    "add-chart",
    "add-text-image",
    "source-content",
    "chrono-studio",
    "scene-studio",
    "discard-build-changes",
    "finish-build",
  ]);
  assert.match(html, /<div(?=[^>]*\brole="group")(?=[^>]*\baria-label="Insert")[^>]*>/);
  assert.match(html, /<div(?=[^>]*\brole="group")(?=[^>]*\baria-label="Libraries")[^>]*>/);
  assert.match(html, /<div(?=[^>]*\brole="group")(?=[^>]*\baria-label="Session")[^>]*>/);
  assert.match(html, /class="build-command-group-label"[^>]*>Insert</);
  assert.match(html, /data-build-command-action="scene-studio"[\s\S]*?>Scene Studio<\/button>/);
  assert.doesNotMatch(html, /data-build-command-action="more"/);
  assert.doesNotMatch(html, /build-more-drawer/);
});

test("Finish Build is the only primary command", () => {
  const html = renderWorkspace();
  const buttons = [...html.matchAll(/<button[^>]*data-build-command-action="([^"]+)"[^>]*>/g)];
  const primary = buttons.filter(([tag]) => !/class="[^"]*\bsecondary\b/.test(tag)).map(([, id]) => id);
  assert.deepEqual(primary, ["finish-build"]);
});

test("Build controls do not duplicate toast-reported operation errors", () => {
  const html = renderWorkspace({ operationError: "Layout save failed" });
  assert.doesNotMatch(html, /Layout save failed/);
});
```

- [ ] **Step 2: Rewrite `BuildCommandHeader.jsx`**

```jsx
import React from "react";

import { dashboardOwnedRegionProps } from "../../theme/dashboardRegionRegistry.js";
import ControlTooltip from "../common/ControlTooltip.jsx";

const DISCARD_BUILD_CHANGES_DESCRIPTION = "Restores the dashboard to the baseline captured when you entered Build. It does not contact the deployed online dashboard.";

export default function BuildCommandHeader({
  pendingWork = [],
  locked = false,
  disabledReason = "",
  auxiliaryLocked = false,
  auxiliaryDisabledReason = disabledReason,
  onFinish,
  onReset,
  onAddChart,
  onAddStaticContent,
  onOpenAuxiliary,
}) {
  const command = (id, label, { primary = false, disabled, reason, explain = false, ...rest } = {}) => (
    <ControlTooltip disabled={disabled} explain={explain} reason={reason}>
      <button
        type="button"
        className={primary ? undefined : "secondary"}
        data-build-command-action={id}
        disabled={disabled}
        {...rest}
      >
        {label}
      </button>
    </ControlTooltip>
  );
  const library = (id, label, entry) => command(id, label, {
    id: `${id}-command`,
    disabled: auxiliaryLocked,
    reason: auxiliaryDisabledReason,
    "data-context-shelf-entry": entry,
    "data-unit-orbit-preserve-open": true,
    onClick: () => onOpenAuxiliary?.(entry),
  });

  return (
    <section
      className="build-command-header"
      aria-label="Build commands"
      {...dashboardOwnedRegionProps("build-command-header")}
    >
      <div className="build-command-main-row" role="toolbar" aria-label="Primary Build commands">
        <div className="build-command-group" role="group" aria-label="Insert" data-build-command-group="insert">
          <span className="build-command-group-label" aria-hidden="true">Insert</span>
          {command("add-chart", "Add chart", { disabled: locked, reason: disabledReason, onClick: onAddChart })}
          {command("add-text-image", "Add Text/Image", { id: "add-static-content-command", disabled: locked, reason: disabledReason, onClick: onAddStaticContent })}
        </div>
        <div className="build-command-group" role="group" aria-label="Libraries" data-build-command-group="libraries">
          <span className="build-command-group-label" aria-hidden="true">Libraries</span>
          {library("source-content", "Source content", "source-content")}
          {library("chrono-studio", "Chrono Studio", "chrono-group")}
          {library("scene-studio", "Scene Studio", "scene")}
        </div>
        <div className="build-command-group" role="group" aria-label="Session" data-build-command-group="session">
          <span className="build-command-group-label" aria-hidden="true">Session</span>
          {command("discard-build-changes", "Discard Build changes", {
            disabled: locked,
            explain: !locked,
            reason: locked ? disabledReason : DISCARD_BUILD_CHANGES_DESCRIPTION,
            onClick: onReset,
          })}
          {command("finish-build", "Finish Build", { primary: true, disabled: locked, reason: disabledReason, onClick: onFinish })}
        </div>
      </div>

      {pendingWork.length > 0 && <BuildPendingWorkRail pendingWork={pendingWork} />}
    </section>
  );
}
```

Keep `BuildPendingWorkRail` and `pendingStateLabel` exactly as they are. The `source-content` and `chrono-studio` buttons keep their ids `source-content-command` and `chrono-studio-command`; the helper above derives them. Delete `src/components/build/BuildMoreDrawer.jsx`.

- [ ] **Step 3: Update `BuildWorkspace.jsx`**

At the `<BuildCommandHeader …/>` call (around line 813) remove the `accessibilityEnabled` and `onAccessibilityChange` props. Remove the `openAuxiliary("scene")` path if it exists only for the drawer; `onOpenAuxiliary("scene")` already opens Scene Studio because `renderedAuxiliary === "scene"` is handled.

- [ ] **Step 4: Append the Lane A CSS block**

At the end of `src/styles/modes.css`:

```css
/* Lane A: Build command groups (Insert, Libraries, Session). */
.build-command-main-row {
  column-gap: var(--simex-space-5);
  row-gap: var(--simex-space-3);
}

.build-command-group {
  align-items: center;
  display: inline-flex;
  flex: 0 0 auto;
  gap: var(--simex-gap-control-group);
}

.build-command-group-label {
  color: var(--simex-text-muted);
  font-size: 12px;
  line-height: var(--simex-control-line-height);
  margin-inline-end: var(--simex-space-1);
}

.build-command-group[data-build-command-group="session"] {
  margin-inline-start: auto;
}

@media (max-width: 1023px) {
  .build-command-group[data-build-command-group="session"] {
    margin-inline-start: 0;
  }
}
```

- [ ] **Step 5: Remove stale command-group CSS**

Delete the old `.build-command-groups`, `.build-command-group--layout`, `.build-command-group--session`, and `[data-build-command-group="content"|"time"|"package"]` rules inside the `@media (min-width: 768px) and (max-width: 1199px)` block near `modes.css:1017` and the `@media (max-width: 767px)` block near `modes.css:1063`. Leave every other rule in those blocks.

- [ ] **Step 6: Run the targeted test**

```powershell
pnpm.cmd exec node --test tests/buildCommandHeader.test.js
```

Expected: 3 passing.

- [ ] **Step 7: Commit**

```bash
git add src/components/build/BuildCommandHeader.jsx src/components/build/BuildWorkspace.jsx src/styles/modes.css tests/buildCommandHeader.test.js
git rm -q src/components/build/BuildMoreDrawer.jsx
git commit -m "feat(build): regroup command row into Insert, Libraries, Session

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 2: Shared ActionMenu

**Files:**

- Create: `src/components/common/ActionMenu.jsx`
- Create: `tests/actionMenu.test.js`
- Modify: `src/styles/modes.css` (Lane A block)

**Interfaces:**

- Produces:

```js
// items: [{ id, label, onSelect, disabled = false, disabledReason = "", danger = false, ...buttonProps }]
export default function ActionMenu({ id, label, items, disabled = false, triggerClassName = "secondary", triggerProps = {}, children })
```

`children` is the trigger content (text or icon). The menu renders `role="menu"` with one `role="menuitem"` button per item, `data-action-menu-item={item.id}`.

- [ ] **Step 1: Write the test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const { default: ActionMenu, actionMenuKeyTarget } = await vite.ssrLoadModule("/src/components/common/ActionMenu.jsx");
await vite.close();

test("closed ActionMenu renders only its trigger with menu semantics", () => {
  const html = renderToStaticMarkup(React.createElement(ActionMenu, {
    id: "section-menu-a",
    label: "Section actions for Hospital pressure",
    items: [{ id: "rename", label: "Rename", onSelect() {} }],
  }, "Actions"));
  assert.match(html, /<button(?=[^>]*aria-haspopup="menu")(?=[^>]*aria-expanded="false")(?=[^>]*aria-controls="section-menu-a")(?=[^>]*aria-label="Section actions for Hospital pressure")[^>]*>Actions<\/button>/);
  assert.doesNotMatch(html, /role="menu"/);
});

test("keyboard targets wrap and skip nothing", () => {
  assert.equal(actionMenuKeyTarget("ArrowDown", 0, 3), 1);
  assert.equal(actionMenuKeyTarget("ArrowDown", 2, 3), 0);
  assert.equal(actionMenuKeyTarget("ArrowUp", 0, 3), 2);
  assert.equal(actionMenuKeyTarget("Home", 2, 3), 0);
  assert.equal(actionMenuKeyTarget("End", 0, 3), 2);
  assert.equal(actionMenuKeyTarget("Tab", 1, 3), null);
});
```

- [ ] **Step 2: Implement `ActionMenu.jsx`**

```jsx
import React from "react";

import ControlTooltip from "./ControlTooltip.jsx";

export function actionMenuKeyTarget(key, index, count) {
  if (count === 0) return null;
  if (key === "ArrowDown") return (index + 1) % count;
  if (key === "ArrowUp") return (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

export default function ActionMenu({
  id,
  label,
  items = [],
  disabled = false,
  triggerClassName = "secondary",
  triggerProps = {},
  children,
}) {
  const [open, setOpen] = React.useState(false);
  const [placement, setPlacement] = React.useState(null);
  const triggerRef = React.useRef(null);
  const itemRefs = React.useRef([]);

  const close = React.useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (event.target.closest?.(`[data-action-menu="${id}"]`)) return;
      close(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, id, open]);

  React.useEffect(() => {
    if (open) itemRefs.current.find((element) => element && !element.disabled)?.focus();
  }, [open]);

  const toggle = () => {
    if (disabled) return;
    if (open) { close(); return; }
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 260;
    const top = Math.min(rect.bottom + 4, window.innerHeight - 8);
    setPlacement({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      top,
      maxHeight: Math.max(0, window.innerHeight - top - 8),
    });
    setOpen(true);
  };

  const onMenuKeyDown = (event) => {
    const index = itemRefs.current.findIndex((element) => element === document.activeElement);
    const next = actionMenuKeyTarget(event.key, Math.max(0, index), items.length);
    if (next === null) return;
    event.preventDefault();
    itemRefs.current[next]?.focus();
  };

  return (
    <div className="action-menu" data-action-menu={id}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        disabled={disabled}
        onClick={toggle}
        {...triggerProps}
      >
        {children}
      </button>
      {open && placement && (
        <div
          id={id}
          role="menu"
          aria-label={label}
          className="action-menu-popover"
          style={{ left: placement.left, top: placement.top, maxHeight: placement.maxHeight }}
          onKeyDown={onMenuKeyDown}
        >
          {items.map((item, index) => {
            const { id: itemId, label: itemLabel, onSelect, disabled: itemDisabled = false, disabledReason = "", danger = false, ...buttonProps } = item;
            return (
              <ControlTooltip key={itemId} disabled={itemDisabled} reason={disabledReason}>
                <button
                  ref={(element) => { itemRefs.current[index] = element; }}
                  type="button"
                  role="menuitem"
                  className={danger ? "danger" : undefined}
                  data-action-menu-item={itemId}
                  disabled={itemDisabled}
                  tabIndex={-1}
                  onClick={() => { close(); onSelect?.(triggerRef.current); }}
                  {...buttonProps}
                >
                  {itemLabel}
                </button>
              </ControlTooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Append CSS to the Lane A block**

```css
/* Lane A: shared anchored action menu. */
.action-menu {
  display: inline-flex;
  position: relative;
}

.action-menu-popover {
  background: var(--simex-surface-panel);
  border: 1px solid var(--simex-border-strong);
  border-radius: var(--simex-style-surface-radius, 10px);
  box-shadow: var(--simex-style-panel-shadow);
  display: grid;
  gap: var(--simex-space-1);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--simex-space-2);
  position: fixed;
  width: min(260px, calc(100vw - 16px));
  z-index: 1210;
}

.action-menu-popover [role="menuitem"] {
  justify-content: flex-start;
  min-height: var(--simex-control-compact);
  text-align: left;
  width: 100%;
}

.action-menu-popover [role="menuitem"]:focus-visible {
  outline: 3px solid var(--simex-focus);
  outline-offset: -3px;
}
```

- [ ] **Step 4: Run the targeted test**

```powershell
pnpm.cmd exec node --test tests/actionMenu.test.js
```

Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/ActionMenu.jsx tests/actionMenu.test.js src/styles/modes.css
git commit -m "feat(common): add shared anchored ActionMenu

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 3: Section and panel menus

**Files:**

- Modify: `src/components/dashboard/DashboardSection.jsx` (`BuildSectionHeader` only)
- Modify: `src/components/ChartPanel.jsx:173-201`
- Modify: `src/iconography/iconCatalog.js`
- Modify: `tests/anchoredStructureCommands.test.js:29-44`
- Modify: `tests/chartAuthoringComponentsV3.test.js`, `tests/staticPanelComposition.test.js`, `tests/dashboardVisualContract.test.js` (only assertions that name the four icon controls or the five section buttons)
- Regenerate: `docs/icon-language-atlas.html`, `docs/icon-and-interaction-specification.md` via `pnpm.cmd icons:build`

**Interfaces:**

- Consumes: `ActionMenu` from Task 2.
- Produces: section trigger `aria-label="Section actions for {title}"` with `data-section-menu={section.id}`; panel trigger `aria-label="Panel actions for {panelLabel}"` with `data-panel-menu={placementId}` and class `panel-move-handle`; menu item ids `rename`, `move-earlier`, `move-later`, `move-page`, `merge`, `remove` (section) and `edit`, `move`, `start-section`, `remove` (panel). The panel `edit` item keeps `data-build-edit-for={placementId}`.

- [ ] **Step 1: Update the section header test**

Replace the assertions in `tests/anchoredStructureCommands.test.js` test "real Section headers own inline rename and the complete command set":

```js
  assert.match(html, /Edit Section title: Hospital pressure/);
  assert.match(html, /<button(?=[^>]*aria-haspopup="menu")(?=[^>]*aria-label="Section actions for Hospital pressure")(?=[^>]*data-section-menu="hospital")[^>]*>/);
  assert.doesNotMatch(html, /Move Hospital pressure earlier/);
  assert.doesNotMatch(html, />Move to Page</);
  assert.doesNotMatch(html, />Rename Section</);
```

Use the section id the fixture actually gives `Hospital pressure`; read `fixture()` at the top of the test file and substitute it for `hospital`.

- [ ] **Step 2: Replace the section actions**

In `BuildSectionHeader`, replace the `<div className="build-section-actions" …>…</div>` block with:

```jsx
      <div className="build-section-actions" aria-label={`${title} Section actions`}>
        <ActionMenu
          id={`section-menu-${sectionDraft.id}`}
          label={`Section actions for ${title}`}
          disabled={disabled}
          triggerProps={{ "data-section-menu": sectionDraft.id }}
          items={[
            { id: "rename", label: "Rename", onSelect: () => setRenaming(true) },
            { id: "move-earlier", label: "Move earlier", disabled: index === 0, onSelect: () => onReorder(index - 1) },
            { id: "move-later", label: "Move later", disabled: index === count - 1, onSelect: () => onReorder(index + 1) },
            { id: "move-page", label: "Move to Page…", disabled: count === 1 || movablePageCount === 0, onSelect: () => setCommand("move") },
            { id: "merge", label: "Merge…", disabled: count === 1, onSelect: () => setCommand("merge") },
            { id: "remove", label: "Remove…", danger: true, disabled: count === 1, onSelect: () => setCommand("remove") },
          ]}
        >
          <SimExIcon iconId="moveFourWay" size={16} />
          <span>Actions</span>
        </ActionMenu>
      </div>
```

Add `import ActionMenu from "../common/ActionMenu.jsx";` at the top of `DashboardSection.jsx`.

- [ ] **Step 3: Register the panel actions interaction**

In `src/iconography/iconCatalog.js`, next to the existing `inventory.find(({ id }) => id === "shell")?.entries.push({ id: "panel.move", … })` block, add:

```js
inventory.find(({ id }) => id === "panels")?.entries.push({
  id: "panel.actions",
  glyphId: "moveFourWay",
  label: "Panel actions",
  tooltip: "Panel actions. Drag to move.",
  renderMode: "icon",
  tone: "standard",
  status: "live",
  confirmation: "none",
  note: "Single menu trigger that doubles as the drag handle",
});
```

Add `"panel.actions"` to `LIVE_INTERACTION_IDS` directly after `"panel.move"`. Run:

```powershell
pnpm.cmd icons:build
```

Expected: both docs files regenerate without errors.

- [ ] **Step 4: Replace the panel icon controls**

In `src/components/ChartPanel.jsx` replace the `{editMode && <div className="panel-actions" …>…</div>}` block (lines 173 to 201) with:

```jsx
      {editMode && <div className="panel-actions" aria-label={`${panelLabel} actions`}>
        <ActionMenu
          id={`panel-menu-${placementId}`}
          label={`Panel actions for ${panelLabel}`}
          disabled={editDisabled && editControlDisabled}
          triggerClassName="secondary panel-move-handle panel-actions-trigger"
          triggerProps={{
            "data-panel-menu": placementId,
            draggable: !editDisabled,
            onDragStart,
            onDragEnd,
            title: "Panel actions. Drag to move.",
          }}
          items={[
            { id: "edit", label: "Edit chart", disabled: editControlDisabled, "data-build-edit-for": placementId, onSelect: () => requestEdit() },
            { id: "move", label: "Move…", disabled: editDisabled, onSelect: (trigger) => onMove?.(trigger) },
            { id: "start-section", label: "Start section here", disabled: editDisabled, onSelect: () => onStartSection?.() },
            { id: "remove", label: "Remove chart", danger: true, disabled: editDisabled, onSelect: () => onRemove?.() },
          ]}
        >
          <SimExIcon iconId="moveFourWay" size={16} />
        </ActionMenu>
      </div>}
```

Add `import ActionMenu from "./common/ActionMenu.jsx";` and make sure `SimExIcon` is imported from `./common/SimExIcon.js` (it already imports `IconControl`; keep that import if other code in the file uses it, otherwise remove it).

- [ ] **Step 5: Repair proven test consumers**

Search and update only assertions that fail for this reason:

```powershell
pnpm.cmd exec node --test tests/anchoredStructureCommands.test.js tests/chartAuthoringComponentsV3.test.js tests/staticPanelComposition.test.js tests/dashboardVisualContract.test.js tests/iconSystem.test.js
```

For each failure that asserts `Move panel`, `Start section here`, `chart.remove`, or `panel.edit-chart` markup, replace it with an assertion on `data-panel-menu` or the corresponding menu item id. Do not alter unrelated assertions. Rerun the same command until green.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/DashboardSection.jsx src/components/ChartPanel.jsx src/iconography/iconCatalog.js docs/icon-language-atlas.html docs/icon-and-interaction-specification.md tests
git commit -m "feat(build): collapse section and panel actions into single menus

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 4: Menu regions, driver helpers, and browser journeys for Lane A

**Files:**

- Modify: `src/theme/dashboardRegionRegistry.js`
- Modify: `tests/e2e/support/dashboard-surface-manifest.js`
- Modify: `tests/e2e/support/buildWorkflow.js`
- Modify: `tests/e2e/v3-anchored-structure-commands.spec.js`, `tests/e2e/chart-authoring-v3.spec.js`, `tests/e2e/moderator-transactions.spec.js`, `tests/e2e/v3-interface-contract.spec.js`, `tests/e2e/three-mode-prototype.spec.js`, `tests/e2e/dashboard-review-regressions.spec.js` (only steps that click retired controls)

**Interfaces:**

- Produces driver helpers:

```js
export function sectionMenu(page, sectionId) { return page.locator(`[data-section-menu="${sectionId}"]`); }
export function panelMenu(page, placementId) { return page.locator(`[data-panel-menu="${placementId}"]`); }
export async function chooseSectionAction(page, sectionId, itemId) {}
export async function choosePanelAction(page, placementId, itemId) {}
```

- [ ] **Step 1: Register the menu regions**

In `DASHBOARD_OWNED_REGION_REGISTRY`, after the `build-page-action-menu` entry, add:

```js
  region({
    id: "section-action-menu",
    owner: "BuildSectionHeader",
    selector: '[id^="section-menu-"][role="menu"]',
    role: "menu",
    lifecycle: "conditional",
    parentId: "build-workspace-shell",
    witnesses: ["build-section-menu"],
  }),
  region({
    id: "panel-action-menu",
    owner: "ChartPanel",
    selector: '[id^="panel-menu-"][role="menu"]',
    role: "menu",
    lifecycle: "conditional",
    parentId: "build-workspace-shell",
    witnesses: ["build-panel-menu"],
  }),
```

Remove the `build-more-drawer` region entry.

- [ ] **Step 2: Add the journeys to the manifest**

In `tests/e2e/support/dashboard-surface-manifest.js`, replace the `build-more-menu` executable entry with two entries modelled on `build-page-actions` (same `family`, `owner`, `mode: "build"`, `viewport: DESKTOP_STANDARD`, `root`, and `setup` shape):

```js
  executable({
    id: "build-section-menu",
    family: "build",
    owner: "build-workspace",
    mode: "build",
    state: "section-menu-open",
    viewport: DESKTOP_STANDARD,
    root: '[id^="section-menu-"][role="menu"]',
    setup: setupBuildSectionMenu,
  }),
  executable({
    id: "build-panel-menu",
    family: "build",
    owner: "build-workspace",
    mode: "build",
    state: "panel-menu-open",
    viewport: DESKTOP_STANDARD,
    root: '[id^="panel-menu-"][role="menu"]',
    setup: setupBuildPanelMenu,
  }),
```

Define the two setup functions next to `setupBuildPageActions` in the same file, using the driver helpers from Step 3 to open the first section's menu and the first panel's menu.

- [ ] **Step 3: Extend the driver**

Append to `tests/e2e/support/buildWorkflow.js`:

```js
export function sectionMenu(page, sectionId) {
  return page.locator(`[data-section-menu="${sectionId}"]`);
}

export function panelMenu(page, placementId) {
  return page.locator(`[data-panel-menu="${placementId}"]`);
}

export async function chooseSectionAction(page, sectionId, itemId) {
  const trigger = sectionMenu(page, sectionId);
  await trigger.click();
  const menu = page.locator(`#section-menu-${sectionId}[role="menu"]`);
  await menu.waitFor({ state: "visible" });
  await menu.locator(`[data-action-menu-item="${itemId}"]`).click();
}

export async function choosePanelAction(page, placementId, itemId) {
  const trigger = panelMenu(page, placementId);
  await trigger.click();
  const menu = page.locator(`#panel-menu-${placementId}[role="menu"]`);
  await menu.waitFor({ state: "visible" });
  await menu.locator(`[data-action-menu-item="${itemId}"]`).click();
}
```

- [ ] **Step 4: Repair proven browser consumers**

Search the six specs for `Move to Page`, `Merge`, `Remove ` on section headers, `Move panel`, `Start section here`, `data-build-edit-for`, `More`, and `build-more-drawer`. Replace each click with `chooseSectionAction` or `choosePanelAction`, and replace `More` → `Scene Studio` with a direct click on `[data-build-command-action="scene-studio"]`. Keep every assertion about what happens afterwards.

- [ ] **Step 5: Run the representative journey and the registry tests**

```powershell
pnpm.cmd exec node --test tests/dashboardRegionRegistry.test.js tests/dashboardSurfaceManifest.test.js
pnpm.cmd test:e2e:dev -- tests/e2e/v3-anchored-structure-commands.spec.js --project=chromium
```

Expected: registry tests pass; the anchored-structure journey passes.

- [ ] **Step 6: Commit**

```bash
git add src/theme/dashboardRegionRegistry.js tests/e2e
git commit -m "test(build): drive section and panel menus and register their regions

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Lane B: structure and rails

### Task 5: Section role contract and helpers

**Files:**

- Modify: `src/charting/config/dashboardConfigStructure.js`
- Create: `src/charting/config/sectionRoles.js`
- Create: `tests/sectionRoles.test.js`

**Interfaces:**

- Produces from `dashboardConfigStructure.js`: `SECTION_ROLES`, `ATTENTION_STRIP_CHART_TYPES` (re-exported from `sectionRoles.js`), section shape with `role`, wrapper shape with `drill`.
- Produces from `sectionRoles.js`:

```js
export const SECTION_ROLES = Object.freeze(["standard", "attention"]);
export const ATTENTION_STRIP_CHART_TYPES = Object.freeze(["kpi", "deltaCard"]);
export function sectionRole(section) // "standard" | "attention"
export function partitionPageSections(page) // { attention: section|null, body: section[] }
export function attentionRoleIssues(page, section) // string[]
export function drillTargetsForPage(page, attentionSectionId) // [{ kind, id, title }]
export function resolveDrillTarget(page, drill) // { kind, id, title } | null
```

- [ ] **Step 1: Write the tests**

```js
import assert from "node:assert/strict";
import test from "node:test";

import { validateDashboardStructure } from "../src/charting/config/dashboardConfigStructure.js";
import {
  ATTENTION_STRIP_CHART_TYPES,
  attentionRoleIssues,
  drillTargetsForPage,
  partitionPageSections,
  resolveDrillTarget,
  sectionRole,
} from "../src/charting/config/sectionRoles.js";

const kpi = (id) => ({ id, typeId: "kpi", title: `KPI ${id}`, sourceId: "s" });
const bar = (id) => ({ id, typeId: "bar", title: `Bar ${id}`, sourceId: "s" });

function page({ attentionPanels = [kpi("k1")], role = "attention" } = {}) {
  return {
    id: "ops",
    sections: [
      { id: "top", title: "At a glance", role, panels: attentionPanels },
      { id: "body", title: "Hospital pressure", panels: [bar("b1")] },
    ],
  };
}

function dashboard(pages) {
  return {
    configVersion: 6,
    id: "d",
    title: "D",
    timezone: "UTC",
    contentLibrary: {},
    dataSources: {},
    home: { enabled: true },
    pages,
  };
}

test("sectionRole defaults to standard", () => {
  assert.equal(sectionRole({ id: "x", panels: [] }), "standard");
  assert.equal(sectionRole({ id: "x", panels: [], role: "attention" }), "attention");
});

test("partitionPageSections lifts the attention section out of the body order", () => {
  const result = partitionPageSections(page());
  assert.equal(result.attention.id, "top");
  assert.deepEqual(result.body.map(({ id }) => id), ["body"]);
  assert.equal(partitionPageSections({ id: "p", sections: [] }).attention, null);
});

test("attentionRoleIssues names disallowed charts and an existing attention section", () => {
  const withBar = page({ attentionPanels: [kpi("k1"), bar("b2")], role: undefined });
  assert.deepEqual(attentionRoleIssues(withBar, withBar.sections[0]), [
    'Bar b2 is a bar chart. Only KPI card and Delta card charts can sit in the attention strip.',
  ]);
  const second = page();
  assert.deepEqual(attentionRoleIssues(second, second.sections[1]), [
    "At a glance is already this page's attention strip.",
  ]);
  assert.deepEqual(attentionRoleIssues(page({ role: undefined }), page().sections[0]), []);
});

test("drill targets exclude the attention section and resolve titles", () => {
  const p = page();
  assert.deepEqual(drillTargetsForPage(p, "top"), [
    { kind: "section", id: "body", title: "Hospital pressure" },
    { kind: "chart", id: "b1", title: "Bar b1" },
  ]);
  assert.deepEqual(resolveDrillTarget(p, { kind: "chart", chartId: "b1" }), { kind: "chart", id: "b1", title: "Bar b1" });
  assert.equal(resolveDrillTarget(p, { kind: "section", sectionId: "missing" }), null);
});

test("validateDashboardStructure accepts a valid attention section with drills", () => {
  const p = page({ attentionPanels: [{ id: "w1", chart: kpi("k1"), drill: { kind: "section", sectionId: "body" } }] });
  assert.doesNotThrow(() => validateDashboardStructure(dashboard([p])));
});

test("validateDashboardStructure rejects role, count, chart type, and drill violations", () => {
  assert.throws(() => validateDashboardStructure(dashboard([page({ role: "hero" })])), /role must be one of: standard, attention/);
  const two = page();
  two.sections[1].role = "attention";
  assert.throws(() => validateDashboardStructure(dashboard([two])), /at most one attention section/);
  assert.throws(() => validateDashboardStructure(dashboard([page({ attentionPanels: [bar("b9")] })])), /chart "b9" must be one of: kpi, deltaCard/);
  const badDrill = page({ attentionPanels: [{ id: "w1", chart: kpi("k1"), drill: { kind: "chart", chartId: "k1" } }] });
  assert.throws(() => validateDashboardStructure(dashboard([badDrill])), /drill target "k1" must be outside the attention section/);
  const bodyDrill = page();
  bodyDrill.sections[1].panels = [{ id: "w2", chart: bar("b1"), drill: { kind: "section", sectionId: "top" } }];
  assert.throws(() => validateDashboardStructure(dashboard([bodyDrill])), /drill is only allowed inside an attention section/);
});

test("ATTENTION_STRIP_CHART_TYPES is the two card types", () => {
  assert.deepEqual([...ATTENTION_STRIP_CHART_TYPES], ["kpi", "deltaCard"]);
});
```

- [ ] **Step 2: Implement `sectionRoles.js`**

```js
export const SECTION_ROLES = Object.freeze(["standard", "attention"]);
export const ATTENTION_STRIP_CHART_TYPES = Object.freeze(["kpi", "deltaCard"]);

const CHART_TYPE_LABELS = Object.freeze({ kpi: "KPI card", deltaCard: "Delta card" });

export function sectionRole(section) {
  return section?.role === "attention" ? "attention" : "standard";
}

export function partitionPageSections(page) {
  const sections = page?.sections ?? [];
  const attention = sections.find((section) => sectionRole(section) === "attention") ?? null;
  return {
    attention,
    body: sections.filter((section) => section !== attention),
  };
}

export function chartOfPanel(panel) {
  return panel?.chart ?? panel;
}

export function attentionRoleIssues(page, section) {
  const issues = [];
  const existing = (page?.sections ?? []).find((candidate) => (
    candidate !== section && candidate.id !== section?.id && sectionRole(candidate) === "attention"
  ));
  if (existing) issues.push(`${existing.title || existing.id} is already this page's attention strip.`);
  for (const panel of section?.panels ?? []) {
    const chart = chartOfPanel(panel);
    if (ATTENTION_STRIP_CHART_TYPES.includes(chart?.typeId)) continue;
    issues.push(`${chart?.title || chart?.id} is a ${chart?.typeId ?? "unknown"} chart. Only ${Object.values(CHART_TYPE_LABELS).join(" and ")} charts can sit in the attention strip.`);
  }
  return issues;
}

export function drillTargetsForPage(page, attentionSectionId) {
  return (page?.sections ?? [])
    .filter((section) => section.id !== attentionSectionId && sectionRole(section) !== "attention")
    .flatMap((section) => [
      { kind: "section", id: section.id, title: section.title || section.id },
      ...(section.panels ?? []).map((panel) => {
        const chart = chartOfPanel(panel);
        return { kind: "chart", id: chart.id, title: chart.title || chart.id };
      }),
    ]);
}

export function resolveDrillTarget(page, drill) {
  if (!drill || typeof drill !== "object") return null;
  const { attention } = partitionPageSections(page);
  const id = drill.kind === "section" ? drill.sectionId : drill.kind === "chart" ? drill.chartId : null;
  if (!id) return null;
  return drillTargetsForPage(page, attention?.id ?? null).find((target) => target.kind === drill.kind && target.id === id) ?? null;
}
```

- [ ] **Step 3: Extend the structure contract**

In `dashboardConfigStructure.js`:

1. Add `import { ATTENTION_STRIP_CHART_TYPES, SECTION_ROLES } from "./sectionRoles.js";` and export them: `export { ATTENTION_STRIP_CHART_TYPES, SECTION_ROLES };`.
2. Add `sectionRoles: SECTION_ROLES,` to `DASHBOARD_CONFIG_STRUCTURE` after `pageTypes`.
3. Change the shapes: `section: shape(["id", "panels"], ["description", "layout", "role", "title"])` and `panelWrapper: shape(["chart", "id"], ["drill"])`, and add `drill: shape(["kind"], ["chartId", "sectionId"])`.
4. Inside the section loop, after the `optionalText(section.layout, …)` call, add:

```js
      if (section.role !== undefined && !SECTION_ROLES.includes(section.role)) {
        throw new Error(
          `Dashboard section "${sectionId}" role must be one of: ${SECTION_ROLES.join(", ")}.`,
        );
      }
      const attentionSection = section.role === "attention";
      if (attentionSection) {
        if (attentionSectionId) {
          throw new Error(
            `Dashboard page "${pageId}" may hold at most one attention section; "${attentionSectionId}" and "${sectionId}" both declare the role.`,
          );
        }
        attentionSectionId = sectionId;
      }
```

Declare `let attentionSectionId = null;` next to `const sectionIds = new Set();`.

5. Inside the panel map, after `chart` and `panelId` are resolved and before `ensureUnique(panelIds, …)`, add:

```js
        if (attentionSection && !ATTENTION_STRIP_CHART_TYPES.includes(chart.typeId)) {
          throw new Error(
            `Dashboard attention section "${sectionId}" chart "${chart.id}" must be one of: ${ATTENTION_STRIP_CHART_TYPES.join(", ")}.`,
          );
        }
        if (wrapped && panel.drill !== undefined) {
          if (!attentionSection) {
            throw new Error(
              `Dashboard panel "${panelId}" drill is only allowed inside an attention section.`,
            );
          }
          drills.push({ sectionId, panelId, drill: strictShape(panel.drill, DASHBOARD_CONFIG_STRUCTURE.shapes.drill, `dashboard panel "${panelId}" drill`) });
        }
```

Declare `const drills = [];` next to `let attentionSectionId`.

6. After the section loop closes (after `pages.push({ page, pageId, sections });` is built but before it), validate the drills:

```js
    for (const { sectionId, panelId, drill } of drills) {
      const targetId = drill.kind === "section" ? drill.sectionId : drill.kind === "chart" ? drill.chartId : null;
      if (!["section", "chart"].includes(drill.kind) || typeof targetId !== "string" || targetId.trim() === "") {
        throw new Error(`Dashboard panel "${panelId}" drill must name a section or chart on page "${pageId}".`);
      }
      const ownSection = sections.find((entry) => entry.sectionId === sectionId);
      const insideAttention = drill.kind === "section"
        ? targetId === sectionId
        : ownSection.panels.some(({ chart }) => chart.id === targetId);
      if (insideAttention) {
        throw new Error(`Dashboard panel "${panelId}" drill target "${targetId}" must be outside the attention section.`);
      }
      const exists = drill.kind === "section"
        ? sections.some((entry) => entry.sectionId === targetId)
        : sections.some((entry) => entry.panels.some(({ chart }) => chart.id === targetId));
      if (!exists) {
        throw new Error(`Dashboard panel "${panelId}" drill target "${targetId}" does not exist on page "${pageId}".`);
      }
    }
```

- [ ] **Step 4: Run the targeted tests**

```powershell
pnpm.cmd exec node --test tests/sectionRoles.test.js tests/dashboardTheme.test.js
```

Expected: all passing (`dashboardTheme.test.js` proves the existing structure contract still validates the shipped config).

- [ ] **Step 5: Commit**

```bash
git add src/charting/config/dashboardConfigStructure.js src/charting/config/sectionRoles.js tests/sectionRoles.test.js
git commit -m "feat(config): add Section role and drill contract for the attention strip

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 6: Attention strip in View and Build canvases

**Files:**

- Create: `src/components/dashboard/DashboardAttentionStrip.jsx`
- Create: `src/components/dashboard/drillNavigation.js`
- Modify: `src/components/dashboard/DashboardCanvas.jsx`
- Modify: `src/components/dashboard/DashboardSection.jsx` (add `tabIndex={-1}` on the root `<section>` and the role tag in `BuildSectionHeader`'s title block)
- Modify: `src/components/build/BuildStructureRail.jsx` (role tag on section nodes)
- Create: `tests/dashboardAttentionStrip.test.js`
- Modify: `src/styles/modes.css` (Lane B block)

**Interfaces:**

- Consumes: `partitionPageSections`, `resolveDrillTarget` from Task 5.
- Produces: `DashboardAttentionStrip({ section, sectionDraft, pageId, page, dashboard, excludedIds, contentRenderContext, accessibilityEnabled, showFullscreen, actions, disabled, selectedPlacementId, sectionSelected, draggingPanelId, dragOverPanelId, onDisplayAction, multiSelectMode, multiPanelIds, onToggleMultiPanel, onStartMultiFullscreenSelection, geoDataSources, buildHeader })` and `navigateToDrillTarget(target, { root })` from `drillNavigation.js`.

- [ ] **Step 1: Write the test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const [{ default: DashboardCanvas }, { drillHighlightTarget }] = await Promise.all([
  vite.ssrLoadModule("/src/components/dashboard/DashboardCanvas.jsx"),
  vite.ssrLoadModule("/src/components/dashboard/drillNavigation.js"),
]);
await vite.close();

const kpi = (id, title) => ({ id, typeId: "kpi", title, sourceId: "s", roles: { value: { field: "v" } }, presentation: {} });
const page = {
  id: "ops",
  title: "Operations",
  sections: [
    { id: "body", title: "Hospital pressure", panels: [{ id: "p-b1", chart: { ...kpi("b1", "Beds"), typeId: "bar" } }] },
    { id: "top", title: "At a glance", role: "attention", panels: [
      { id: "p-k1", chart: kpi("k1", "Cases"), drill: { kind: "section", sectionId: "body" } },
      { id: "p-k2", chart: kpi("k2", "Deaths") },
    ] },
  ],
};
const dashboard = { id: "d", pages: [page], dataSources: {}, loadedData: {}, datasetProfiles: {}, chartDataStates: {}, dataSourceStates: {}, assets: {} };

test("attention strip renders first with drill links and its own layout", () => {
  const html = renderToStaticMarkup(React.createElement(DashboardCanvas, { activePage: page, dashboard, surface: "view", buildState: null }));
  const stripIndex = html.indexOf('data-section-role="attention"');
  const bodyIndex = html.indexOf('data-canonical-section-id="body"');
  assert.ok(stripIndex > -1 && stripIndex < bodyIndex);
  assert.match(html, /class="dashboard-section dashboard-attention-strip"[^>]*data-canonical-section-id="top"/);
  assert.match(html, /class="attention-strip-items"/);
  assert.match(html, /<button[^>]*class="attention-drill"[^>]*data-drill-kind="section"[^>]*data-drill-target="body"[^>]*>Open Hospital pressure<\/button>/);
  assert.equal((html.match(/data-attention-item/g) ?? []).length, 2);
  assert.doesNotMatch(html, /layout-grid[^"]*"[^>]*data-canonical-section-id="top"/);
});

test("attention strip hides excluded charts and disappears when empty", () => {
  const html = renderToStaticMarkup(React.createElement(DashboardCanvas, { activePage: page, dashboard, surface: "view", buildState: null, excludedChartIds: ["k1", "k2"] }));
  assert.doesNotMatch(html, /data-section-role="attention"/);
});

test("Build canvas keeps the strip on top with the section header and role tag", () => {
  const html = renderToStaticMarkup(React.createElement(DashboardCanvas, { activePage: page, dashboard, surface: "build", buildState: { sectionDrafts: {}, onStructureCommand() {} } }));
  assert.match(html, /Edit Section title: At a glance/);
  assert.match(html, /class="section-role-tag"[^>]*>Attention strip</);
});

test("drill highlight resolves the DOM selector for both target kinds", () => {
  assert.equal(drillHighlightTarget({ kind: "section", id: "body" }), '[data-canonical-section-id="body"]');
  assert.equal(drillHighlightTarget({ kind: "chart", id: "b1" }), '[data-canonical-panel-id="b1"]');
});
```

- [ ] **Step 2: Implement `drillNavigation.js`**

```js
export const DRILL_HIGHLIGHT_MS = 1600;

export function drillHighlightTarget(target) {
  if (!target) return null;
  if (target.kind === "section") return `[data-canonical-section-id="${target.id}"]`;
  if (target.kind === "chart") return `[data-canonical-panel-id="${target.id}"]`;
  return null;
}

export function navigateToDrillTarget(target, { root = typeof document === "undefined" ? null : document, windowRef = typeof window === "undefined" ? null : window } = {}) {
  const selector = drillHighlightTarget(target);
  const element = selector && root ? root.querySelector(selector) : null;
  if (!element || !windowRef) return false;
  const crown = root.querySelector(".dashboard-command-crown");
  const offset = (crown?.getBoundingClientRect().height ?? 0) + 12;
  const top = element.getBoundingClientRect().top + windowRef.scrollY - offset;
  windowRef.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  element.setAttribute("data-drill-highlight", "true");
  if (typeof element.focus === "function") element.focus({ preventScroll: true });
  windowRef.setTimeout(() => element.removeAttribute("data-drill-highlight"), DRILL_HIGHLIGHT_MS);
  return true;
}
```

- [ ] **Step 3: Implement `DashboardAttentionStrip.jsx`**

```jsx
import React from "react";

import { sourceStateForDashboard } from "../../charting/data/chartDataState.js";
import { resolveDrillTarget } from "../../charting/config/sectionRoles.js";
import DashboardChartPlacement from "./DashboardChartPlacement.jsx";
import { navigateToDrillTarget } from "./drillNavigation.js";

export default function DashboardAttentionStrip({
  section,
  sectionDraft = section,
  page,
  pageId,
  dashboard,
  excludedIds,
  geoDataSources = {},
  contentRenderContext,
  accessibilityEnabled,
  showFullscreen,
  actions = null,
  disabled = false,
  selectedPlacementId = null,
  sectionSelected = false,
  draggingPanelId = null,
  dragOverPanelId = null,
  onDisplayAction,
  multiSelectMode = false,
  multiPanelIds = [],
  onToggleMultiPanel,
  onStartMultiFullscreenSelection,
  buildHeader = null,
}) {
  const visible = (section.panels ?? []).filter((placement) => !excludedIds.has((placement.chart ?? placement).id));
  if (visible.length === 0 && !actions) return null;
  const title = sectionDraft.title || section.title;
  const dataState = {
    loadedData: dashboard.loadedData,
    chartDataStates: dashboard.chartDataStates,
    dataSourceStates: dashboard.dataSourceStates,
  };
  return (
    <section
      className={`dashboard-section dashboard-attention-strip${sectionSelected ? " is-build-selected" : ""}`}
      data-section-role="attention"
      data-canonical-section-id={section.id}
      aria-label={title || "Page attention"}
      tabIndex={-1}
    >
      {buildHeader ?? (title ? (
        <div className="section-header">
          <div className="section-title-block">
            <h2>{title}</h2>
            {section.description && <p>{section.description}</p>}
          </div>
        </div>
      ) : null)}
      {visible.length > 0 ? (
        <div className="attention-strip-items">
          {visible.map((placement) => {
            const chart = placement.chart ?? placement;
            const target = resolveDrillTarget(page, placement.drill);
            const selected = selectedPlacementId === placement.id;
            return (
              <div key={placement.id} className="attention-strip-item" data-attention-item={chart.id}>
                <DashboardChartPlacement
                  placement={placement}
                  pageId={pageId}
                  sectionId={section.id}
                  rows={dashboard.loadedData?.[chart.sourceId]}
                  sourceState={sourceStateForDashboard(dataState, chart.sourceId, chart.id)}
                  datasetProfile={dashboard.datasetProfiles?.[chart.sourceId]}
                  geoData={geoDataSources[chart.presentation?.map?.geoSource]}
                  dataSources={dashboard.dataSources}
                  assets={dashboard.assets ?? {}}
                  contentRenderContext={contentRenderContext}
                  accessibilityEnabled={accessibilityEnabled}
                  showFullscreen={showFullscreen}
                  actions={actions}
                  editDisabled={disabled}
                  editControlDisabled={disabled && !selected}
                  isDragging={draggingPanelId === placement.id}
                  isDragTarget={dragOverPanelId === placement.id}
                  isSelected={selected}
                  onDisplayAction={onDisplayAction}
                  multiSelectMode={multiSelectMode}
                  isMultiSelected={multiPanelIds.includes(chart.id)}
                  multiSelectionIndex={multiPanelIds.indexOf(chart.id) + 1}
                  onToggleMultiPanel={actions ? undefined : onToggleMultiPanel}
                  onStartMultiFullscreenSelection={actions ? undefined : onStartMultiFullscreenSelection}
                />
                {target && !actions && (
                  <button
                    type="button"
                    className="attention-drill"
                    data-drill-kind={target.kind}
                    data-drill-target={target.id}
                    onClick={() => navigateToDrillTarget(target)}
                  >
                    Open {target.title}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <section className="dashboard-empty-section build-empty-section" aria-label={`${title || "Attention strip"} empty state`}>
          <p>This attention strip has no cards yet. Add a KPI card or Delta card.</p>
          <div className="build-empty-section__actions">
            <button type="button" disabled={disabled} onClick={() => actions.addChart(section.id)}>Add chart</button>
          </div>
        </section>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Wire the canvas**

In `DashboardCanvas.jsx`:

1. Import `partitionPageSections` from `../../charting/config/sectionRoles.js`, `DashboardAttentionStrip`, and `{ BuildSectionHeader }` (export it from `DashboardSection.jsx` as a named export; it is currently a module-private function).
2. Before the `return`, compute `const { attention: attentionSection, body: bodySections } = partitionPageSections(activePage);`.
3. In the non-landing branch, render the strip first, before the chrono section:

```jsx
            {attentionSection && (
              <DashboardAttentionStrip
                section={attentionSection}
                sectionDraft={buildState?.sectionDrafts?.[attentionSection.id] ?? attentionSection}
                page={activePage}
                pageId={activePage.id}
                dashboard={dashboard}
                excludedIds={excludedIds}
                geoDataSources={geoDataSources}
                contentRenderContext={contentRenderContext}
                accessibilityEnabled={accessibilityEnabled}
                showFullscreen={showFullscreen}
                actions={buildActions}
                disabled={Boolean(buildState?.disabled)}
                selectedPlacementId={buildState?.selection?.kind === "chart" && buildState.selection.sectionId === attentionSection.id ? buildState.selection.placementId : null}
                sectionSelected={buildState?.selection?.kind === "section" && buildState.selection.sectionId === attentionSection.id}
                draggingPanelId={buildState?.draggingPanelId ?? null}
                dragOverPanelId={buildState?.dragOverPanelId ?? null}
                onDisplayAction={onDisplayAction}
                multiSelectMode={multiSelectMode}
                multiPanelIds={buildState ? EMPTY_ARRAY : multiPanelIds}
                onToggleMultiPanel={onToggleMultiPanel}
                onStartMultiFullscreenSelection={onStartMultiFullscreenSelection}
                buildHeader={buildActions ? (
                  <BuildSectionHeader
                    sectionDraft={buildState?.sectionDrafts?.[attentionSection.id] ?? attentionSection}
                    getDashboard={getDashboard}
                    movablePageCount={(dashboard.pages ?? []).filter(({ id, landing }) => id !== activePage.id && !landing).length}
                    pageId={activePage.id}
                    index={(activePage.sections ?? []).findIndex(({ id }) => id === attentionSection.id)}
                    count={activePage.sections?.length ?? 0}
                    disabled={Boolean(buildState?.disabled)}
                    role="attention"
                    onReorder={(targetIndex) => buildActions.reorderSection(attentionSection.id, targetIndex)}
                    onCommand={buildActions.structureCommand}
                  />
                ) : null}
              />
            )}
```

4. Change the `(activePage.sections ?? []).map(...)` loop to iterate `bodySections` instead, keeping `sectionIndex` and `count` as the position inside `activePage.sections` (use `activePage.sections.findIndex` for `index`).

- [ ] **Step 5: Section root focus and role tag**

In `DashboardSection.jsx`: add `tabIndex={-1}` to the root `<section className="dashboard-section…">`. In `BuildSectionHeader`, accept a `role = "standard"` prop and render, inside `.section-title-block` directly after the `<h2>` element:

```jsx
        {role === "attention" && <span className="section-role-tag">Attention strip</span>}
```

Export the header: change `function BuildSectionHeader(` to `export function BuildSectionHeader(` and pass `role={sectionRole(sectionDraft)}` from `DashboardSection` (import `sectionRole`).

In `BuildStructureRail.jsx`, inside `row(node)`, add `data-build-node-role={node.kind === "section" && sectionRole(sectionFor(node)) === "attention" ? "attention" : undefined}` on the `<li>`, where `sectionFor` finds the section like `labelFor` does, and render `<span className="section-role-tag">Attention strip</span>` after `.build-tree-label` when the role is attention. Import `sectionRole`.

- [ ] **Step 6: Append the Lane B CSS block**

```css
/* Lane B: attention strip. */
.dashboard-attention-strip .attention-strip-items {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  padding: 12px 18px 16px;
}

.attention-strip-item {
  display: grid;
  gap: var(--simex-space-2);
  min-width: 0;
}

.attention-strip-item .chart-panel,
.attention-strip-item .chart-panel-footprint {
  grid-column: auto;
  grid-row: auto;
  height: auto;
  min-height: 0;
}

.attention-strip-item .chart-panel {
  background: var(--simex-surface-panel-alt);
  border: 1px solid var(--simex-border-subtle);
  box-shadow: none;
}

.attention-drill {
  background: transparent;
  border: 0;
  color: var(--simex-text-strong);
  font: inherit;
  justify-self: start;
  min-height: var(--simex-control-compact);
  padding: 0 var(--simex-space-2);
  text-decoration: underline transparent;
  text-underline-offset: 3px;
  transition: text-decoration-color 120ms ease;
}

.attention-drill:hover,
.attention-drill:focus-visible {
  text-decoration-color: currentColor;
}

.attention-drill:focus-visible {
  outline: 3px solid var(--simex-focus);
  outline-offset: 2px;
}

.section-role-tag {
  border: 1px solid var(--simex-border-subtle);
  border-radius: var(--simex-style-control-radius, 6px);
  color: var(--simex-text-muted);
  font-size: 12px;
  line-height: 18px;
  margin-inline-start: var(--simex-space-3);
  padding: 0 var(--simex-space-2);
  vertical-align: middle;
}

[data-drill-highlight="true"] {
  box-shadow: 0 0 0 3px var(--simex-focus);
  transition: box-shadow 120ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .attention-drill,
  [data-drill-highlight="true"] {
    transition: none;
  }
}
```

- [ ] **Step 7: Run the targeted tests**

```powershell
pnpm.cmd exec node --test tests/dashboardAttentionStrip.test.js tests/anchoredStructureCommands.test.js tests/buildStructureRail.test.js
```

Expected: all passing. If `anchoredStructureCommands` fails only because Lane A has not landed yet, the failing assertion names the five section buttons; leave it and note it in the commit body.

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard src/components/build/BuildStructureRail.jsx src/styles/modes.css tests/dashboardAttentionStrip.test.js
git commit -m "feat(view): render the attention strip above the page body with drill links

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 7: Role and drill structure commands and move guards

**Files:**

- Modify: `src/components/build/buildLayoutDraft.js`
- Modify: `src/components/build/buildLayoutMove.js:150-200`
- Modify: `src/components/build/buildTreeInteraction.js` (export `legalDropForDashboard`)
- Modify: `src/components/build/BuildStructureRail.jsx` (`legalDrop` call)
- Modify: `src/components/DashboardRenderer.jsx:1466-1490`
- Modify: `tests/buildLayoutDraft.test.js`, `tests/buildLayoutMove.test.js`

**Interfaces:**

- Produces:

```js
export function setBuildLayoutSectionRole(draft, pageId, sectionId, role) // buildLayoutDraft.js
export function setBuildLayoutPanelDrill(draft, pageId, sectionId, placementId, drill) // buildLayoutDraft.js
export function attentionMoveIssue(dashboard, move) // buildLayoutMove.js → { code, message } | null
```

Structure commands `{ type: "set-section-role", pageId, sectionId, role }` and `{ type: "set-panel-drill", pageId, sectionId, placementId, drill }` handled by `applyBuildStructureCommand`.

- [ ] **Step 1: Write the draft tests**

Append to `tests/buildLayoutDraft.test.js` (reuse the file's imports and dashboard fixture pattern; add imports for the two new functions):

```js
test("set-section-role refuses disallowed charts and clears drills when reverting", () => {
  const dashboard = {
    id: "d",
    pages: [{ id: "ops", sections: [
      { id: "top", title: "Top", panels: [{ id: "w1", chart: { id: "k1", typeId: "kpi", title: "Cases" }, drill: { kind: "section", sectionId: "body" } }] },
      { id: "body", title: "Body", panels: [{ id: "w2", chart: { id: "b1", typeId: "bar", title: "Beds" } }] },
    ] }],
  };
  const draft = createBuildLayoutDraft(dashboard);
  const refused = setBuildLayoutSectionRole(draft, "ops", "body", "attention");
  assert.equal(refused.status, "error");
  assert.equal(refused.error.code, "SECTION_ROLE_REFUSED");
  assert.match(refused.error.message, /Beds is a bar chart/);

  const promoted = setBuildLayoutSectionRole(draft, "ops", "top", "attention");
  assert.equal(promoted.status, "dirty");
  assert.equal(promoted.value.pages[0].sections[0].role, "attention");

  const reverted = setBuildLayoutSectionRole(promoted, "ops", "top", "standard");
  assert.equal(reverted.value.pages[0].sections[0].role, undefined);
  assert.equal(reverted.value.pages[0].sections[0].panels[0].drill, undefined);
});

test("set-panel-drill stores, validates, and clears a drill", () => {
  const dashboard = {
    id: "d",
    pages: [{ id: "ops", sections: [
      { id: "top", title: "Top", role: "attention", panels: [{ id: "w1", chart: { id: "k1", typeId: "kpi", title: "Cases" } }] },
      { id: "body", title: "Body", panels: [{ id: "w2", chart: { id: "b1", typeId: "bar", title: "Beds" } }] },
    ] }],
  };
  const draft = createBuildLayoutDraft(dashboard);
  const linked = setBuildLayoutPanelDrill(draft, "ops", "top", "w1", { kind: "chart", chartId: "b1" });
  assert.deepEqual(linked.value.pages[0].sections[0].panels[0].drill, { kind: "chart", chartId: "b1" });
  const cleared = setBuildLayoutPanelDrill(linked, "ops", "top", "w1", null);
  assert.equal(cleared.value.pages[0].sections[0].panels[0].drill, undefined);
  const invalid = setBuildLayoutPanelDrill(draft, "ops", "top", "w1", { kind: "chart", chartId: "k1" });
  assert.equal(invalid.error.code, "PANEL_DRILL_INVALID");
});
```

- [ ] **Step 2: Implement the draft helpers**

In `buildLayoutDraft.js` add `import { ATTENTION_STRIP_CHART_TYPES, attentionRoleIssues, resolveDrillTarget, sectionRole } from "../../charting/config/sectionRoles.js";` and:

```js
export function setBuildLayoutSectionRole(draft, pageId, sectionId, role) {
  if (!isBuildLayoutDraftMutable(draft)) return draft;
  if (!["standard", "attention"].includes(role)) return failCommand(draft, "SECTION_ROLE_INVALID", "Choose Standard section or Attention strip.");
  const page = findPage(draft.value, pageId);
  const section = findSection(draft.value, pageId, sectionId);
  if (!section) return failCommand(draft, "SECTION_NOT_FOUND", "The Section no longer exists.");
  if (sectionRole(section) === role) return draft;
  if (role === "attention") {
    const issues = attentionRoleIssues(page, section);
    if (issues.length > 0) return failCommand(draft, "SECTION_ROLE_REFUSED", issues.join(" "));
  }
  const value = updateSection(draft.value, pageId, sectionId, (current) => {
    const { role: _role, ...rest } = current;
    if (role === "attention") return { ...rest, role: "attention" };
    return { ...rest, panels: (current.panels ?? []).map(({ drill: _drill, ...panel }) => panel) };
  });
  return markDirty(draft, sectionId, value);
}

export function setBuildLayoutPanelDrill(draft, pageId, sectionId, placementId, drill) {
  if (!isBuildLayoutDraftMutable(draft)) return draft;
  const page = findPage(draft.value, pageId);
  const section = findSection(draft.value, pageId, sectionId);
  if (!section) return failCommand(draft, "SECTION_NOT_FOUND", "The Section no longer exists.");
  if (sectionRole(section) !== "attention") return failCommand(draft, "PANEL_DRILL_INVALID", "Drill links belong to the attention strip only.");
  if (!(section.panels ?? []).some(({ id }) => id === placementId)) return failCommand(draft, "PANEL_NOT_FOUND", "The panel no longer exists.");
  if (drill !== null && !resolveDrillTarget(page, drill)) {
    return failCommand(draft, "PANEL_DRILL_INVALID", "Choose a Section or chart on this page outside the attention strip.");
  }
  const value = updatePlacement(draft.value, placementId, (current) => {
    const wrapped = Object.hasOwn(current, "chart") ? current : { id: current.id, chart: current };
    const { drill: _drill, ...rest } = wrapped;
    return drill === null ? rest : { ...rest, drill: structuredClone(drill) };
  });
  return markDirty(draft, placementId, value);
}
```

`updatePlacement` in `immutableDashboardLayout.js:25` stores whatever the callback returns, so the wrapper shape is preserved.

Chart creation and chart edits need no extra guard: `integrateCreatedChart` and the edit integration in `dashboardBundleV3.js` both call `validateDashboardSessionCandidate`, which runs `validateDashboardStructure` from Task 5. A non-card chart committed into an attention section fails there and the message surfaces through the existing operation status in `App.jsx` (`runOperationWithStatus`).

- [ ] **Step 3: Guard moves**

In `buildLayoutMove.js` add:

```js
import { ATTENTION_STRIP_CHART_TYPES, sectionRole } from "../../charting/config/sectionRoles.js";

export function attentionMoveIssue(dashboard, move) {
  if (move?.kind !== "panel") return null;
  const targetPage = (dashboard?.pages ?? []).find(({ id }) => id === move.target?.pageId);
  const targetSection = (targetPage?.sections ?? []).find(({ id }) => id === move.target?.sectionId);
  if (!targetSection || sectionRole(targetSection) !== "attention") return null;
  const sourcePage = (dashboard?.pages ?? []).find(({ id }) => id === move.source?.pageId);
  const sourceSection = (sourcePage?.sections ?? []).find(({ id }) => id === move.source?.sectionId);
  const panel = (sourceSection?.panels ?? []).find(({ id }) => id === move.source?.placementId);
  const chart = panel?.chart ?? panel;
  if (!chart || ATTENTION_STRIP_CHART_TYPES.includes(chart.typeId)) return null;
  return {
    code: "MOVE_ATTENTION_CHART_TYPE",
    message: `${chart.title || chart.id} cannot join the attention strip. Only KPI card and Delta card charts can.`,
  };
}
```

In `analyzeBuildLayoutMove`, after `const target = locateTarget(dashboard, move);` succeeds, add:

```js
  const attentionIssue = attentionMoveIssue(dashboard, move);
  if (attentionIssue) return immutableFailure(attentionIssue.code, attentionIssue.message);
```

Add to `tests/buildLayoutMove.test.js`:

```js
test("moving a non-card chart into the attention strip is refused by name", () => {
  const dashboard = { pages: [{ id: "ops", sections: [
    { id: "top", role: "attention", panels: [{ id: "w1", chart: { id: "k1", typeId: "kpi", title: "Cases" } }] },
    { id: "body", panels: [{ id: "w2", chart: { id: "b1", typeId: "bar", title: "Beds" } }] },
  ] }] };
  const analysis = analyzeBuildLayoutMove(dashboard, { kind: "panel", source: { pageId: "ops", sectionId: "body", placementId: "w2" }, target: { pageId: "ops", sectionId: "top", index: 0 } });
  assert.equal(analysis.status, "invalid");
  assert.equal(analysis.error.code, "MOVE_ATTENTION_CHART_TYPE");
  assert.match(analysis.error.message, /Beds cannot join the attention strip/);
});
```

`immutableFailure` at `buildLayoutMove.js:430` returns `{ status: "invalid", error: { code, message }, consequences: [] }`, which the assertions above match.

In `buildTreeInteraction.js` export:

```js
export function legalDropForDashboard(dashboard, source, node) {
  if (!source || !node) return false;
  if (source.kind === "page") return node.kind === "page";
  if (source.kind === "section") return node.kind === "page" || node.kind === "section";
  if (node.kind !== "section" && node.kind !== "chart") return false;
  const page = (dashboard?.pages ?? []).find(({ id }) => id === node.pageId);
  const section = (page?.sections ?? []).find(({ id }) => id === node.sectionId);
  if (!section || section.role !== "attention") return true;
  const sourcePage = (dashboard?.pages ?? []).find(({ id }) => id === source.pageId);
  const sourceSection = (sourcePage?.sections ?? []).find(({ id }) => id === source.sectionId);
  const panel = (sourceSection?.panels ?? []).find(({ id }) => id === source.placementId);
  const chart = panel?.chart ?? panel;
  return ["kpi", "deltaCard"].includes(chart?.typeId);
}
```

In `BuildStructureRail.jsx` replace the module-private `legalDrop(source, node)` calls with `legalDropForDashboard(dashboard, source, node)` and delete the private function.

- [ ] **Step 4: Handle the commands in the renderer**

In `applyBuildStructureCommand` (`DashboardRenderer.jsx:1466`), add cases:

```js
        case "set-section-role":
          return setBuildLayoutSectionRole(draft, command.pageId, command.sectionId, command.role);
        case "set-panel-drill":
          return setBuildLayoutPanelDrill(draft, command.pageId, command.sectionId, command.placementId, command.drill ?? null);
```

Import both from `./build/buildLayoutDraft.js`. Both commands fall into the existing `section.updated` activity branch.

- [ ] **Step 5: Run the targeted tests**

```powershell
pnpm.cmd exec node --test tests/buildLayoutDraft.test.js tests/buildLayoutMove.test.js tests/buildTreeInteraction.test.js
```

Expected: all passing.

- [ ] **Step 6: Commit**

```bash
git add src/components/build src/components/DashboardRenderer.jsx tests/buildLayoutDraft.test.js tests/buildLayoutMove.test.js
git commit -m "feat(build): add section role and drill structure commands with move guards

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 8: Whole-page source and page time readout

**Files:**

- Modify: `src/charting/time/playbackReducer.js`
- Modify: `src/components/playback/PlaybackProvider.jsx`
- Modify: `src/components/playback/ChronoController.jsx:40-63`
- Modify: `src/components/playback/PlaybackPageActions.jsx`
- Create: `src/components/playback/PageTimeContext.jsx`
- Modify: `src/App.jsx` (View `contextNode`)
- Modify: `src/components/build/BuildWorkspace.jsx` (move `temporalAuthoringCharts` to its own module)
- Create: `src/components/time/temporalAuthoringCharts.js`
- Create: `tests/pageTimeContext.test.js`
- Modify: `tests/playbackViewOwnership.test.js` (already imports `reducePlaybackState`)

**Interfaces:**

- Produces: reducer state field `sourcePreference: "auto" | "page"` and a `modeExit` reducer case; provider value fields `sourcePreference` and `sourceLabel: string`; component `PageTimeContext()`; `temporalAuthoringCharts(dashboard)` exported from `src/components/time/temporalAuthoringCharts.js` and re-exported from `BuildWorkspace.jsx` for existing importers; `viewPageTimeEligible` computed in `App.jsx`.

- [ ] **Step 1: Reducer tests**

Append to `tests/playbackViewOwnership.test.js` (import `initialPlaybackState` alongside `reducePlaybackState` if it is not already imported):

```js
test("setGroup with null records an explicit whole-page preference", () => {
  const state = reducePlaybackState(initialPlaybackState, { type: "setGroup", groupId: null });
  assert.equal(state.sourcePreference, "page");
  assert.deepEqual(state.source, { kind: "default", id: null });
  const grouped = reducePlaybackState(state, { type: "setGroup", groupId: "g1" });
  assert.equal(grouped.sourcePreference, "auto");
  const scene = reducePlaybackState(state, { type: "setScene", sceneId: "s1" });
  assert.equal(scene.sourcePreference, "auto");
  const exited = reducePlaybackState(state, { type: "modeExit" });
  assert.equal(exited.sourcePreference, "auto");
});
```

The reducer today returns `state` for unknown types, so `modeExit` (dispatched by `ViewShell` and `DashboardModeWorkspace` on unmount) is currently a no-op; Step 2 gives it a case. `dispatchPlaybackAction` in the provider only forwards actions and adjusts speed, so it needs no change.

- [ ] **Step 2: Reducer changes**

In `initialPlaybackState` add `sourcePreference: "auto",`. In `setGroup` add `sourcePreference: action.groupId === null ? "page" : "auto",` to the `withChanges` object. In `setScene` add `sourcePreference: "auto",`. Add before the final `return state;`:

```js
  if (action.type === "modeExit") {
    return withChanges(state, { sourcePreference: "auto", playing: false });
  }
```

- [ ] **Step 3: Provider changes**

In `PlaybackProvider.jsx`:

1. Change the auto-select effect to bail out when `state.sourcePreference === "page"`:

```js
  React.useEffect(() => {
    if (activeScene || groups.length === 0) return;
    if (state.sourcePreference === "page") return;
    …
  }, [activeScene, dispatch, groups, preferredGroupId, state.activeGroupId, state.sourcePreference]);
```

2. Add to the frozen `value`: `sourcePreference: state.sourcePreference,` and

```js
    sourceLabel: activeScene
      ? activeScene.name
      : usingDefaultPage
        ? "Whole page"
        : selectedGroup?.name ?? "Whole page",
```

and add `state.sourcePreference`, `usingDefaultPage`, and `selectedGroup` to the dependency list.

- [ ] **Step 4: Source selectors**

In `ChronoController.jsx`, in the `Chrono source` select, make the value `activeScene ? \`scene:${activeScene.id}\` : activeGroup && !usingDefault ? \`group:${activeGroup.id}\` : "page:"` and prepend an option:

```js
          React.createElement("option", { key: "page:", value: "page:" }, "Whole page"),
```

Read `sourcePreference` from `usePlayback()` and treat `usingDefault = playback.sourcePreference === "page" || playback.source?.kind === "default"`. In `selectSource`, handle `value === "page:"` by dispatching `{ type: "setGroup", groupId: null }`.

In `PlaybackPageActions.jsx`: keep the `groups.length === 0` early return; add `Whole page` as the first `<option value="">` in the group select (an empty value already dispatches `groupId: null`), and make the select's `value` read `""` when `playback.sourcePreference === "page"`.

- [ ] **Step 5: Move `temporalAuthoringCharts`**

Create `src/components/time/temporalAuthoringCharts.js` containing the function body from `BuildWorkspace.jsx:1019` and its private helpers (`isTemporalAuthoringChart`, `temporalRoleField`, `bindingField`, `bindingFields`, `parseEpoch` imports). In `BuildWorkspace.jsx` replace the definition with `export { temporalAuthoringCharts } from "../time/temporalAuthoringCharts.js";` and import it for local use.

- [ ] **Step 6: `PageTimeContext.jsx`**

```jsx
import React from "react";

import { canonicalPlaybackTime } from "./playbackTimeLabel.js";
import { usePlayback } from "./PlaybackProvider.jsx";

export const PAGE_TIME_OWNER = "page-time";

export default function PageTimeContext() {
  const playback = usePlayback();
  const active = playback.playbackView === true;
  const label = active && playback.activeEpochMs !== null
    ? `${canonicalPlaybackTime(playback.activeEpochMs)} · ${playback.sourceLabel}`
    : active ? `No frames · ${playback.sourceLabel}` : "Latest available";
  const toggle = () => {
    if (active) {
      playback.dispatch({ type: "closeView", owner: PAGE_TIME_OWNER });
      return;
    }
    playback.dispatch({ type: "setGroup", groupId: null });
    playback.dispatch({ type: "setScope", scope: "all-page" });
    playback.dispatch({ type: "openView", owner: PAGE_TIME_OWNER });
  };
  return (
    <div className="page-time-context" data-page-time-active={active ? "true" : "false"}>
      <span className="page-time-context__label">Page time</span>
      <output className="page-time-context__value" aria-live="polite">{label}</output>
      <button type="button" className="secondary page-time-context__toggle" aria-pressed={active} onClick={toggle}>
        {active ? "Exit page time" : "Set page time"}
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Crown wiring in `App.jsx`**

`App.jsx:1985-1998` already wraps `appFrame` in `PlaybackProvider` for every mode except Home, so a `PageTimeContext` element passed as `contextNode` renders inside the provider and `usePlayback()` works. `AppFrame` does not receive `contextNode` today. Add, next to `commandCrownPageActions` (`App.jsx:401`):

```jsx
  const viewPageTimeEligible = React.useMemo(() => {
    if (mode !== "view" || !dashboard?.pages) return false;
    const page = dashboard.pages.find(({ id }) => id === activePageId);
    if (!page || page.landing) return false;
    return temporalAuthoringCharts({ ...dashboard, pages: [page] }).length > 0;
  }, [activePageId, dashboard, mode]);
```

and on the `<AppFrame …>` element add `contextNode={viewPageTimeEligible ? <PageTimeContext /> : undefined}`. Import `PageTimeContext` from `./components/playback/PageTimeContext.jsx` and `temporalAuthoringCharts` from `./components/time/temporalAuthoringCharts.js`. Pages without temporal charts keep an empty context strip, which `ModeContextStrip` already omits.

- [ ] **Step 8: Component test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const [{ default: PageTimeContext }, { PlaybackProvider }] = await Promise.all([
  vite.ssrLoadModule("/src/components/playback/PageTimeContext.jsx"),
  vite.ssrLoadModule("/src/components/playback/PlaybackProvider.jsx"),
]);
await vite.close();

test("page time reads Latest available and offers Set page time when playback is closed", () => {
  const html = renderToStaticMarkup(React.createElement(PlaybackProvider, { groups: [], charts: [], loadedData: {}, profiles: {} }, React.createElement(PageTimeContext)));
  assert.match(html, /Page time/);
  assert.match(html, /Latest available/);
  assert.match(html, /<button[^>]*aria-pressed="false"[^>]*>Set page time<\/button>/);
});
```

- [ ] **Step 9: Append CSS to the Lane B block**

```css
/* Lane B: page time context in the View context strip. */
.page-time-context {
  align-items: center;
  display: flex;
  gap: var(--simex-gap-control-group);
  min-width: 0;
}

.page-time-context__label {
  color: var(--simex-text-muted);
  font-size: 12px;
}

.page-time-context__value {
  font-family: var(--simex-style-heading-font);
  font-variant-numeric: tabular-nums lining-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-time-context__toggle {
  min-height: var(--simex-control-compact);
}
```

- [ ] **Step 10: Run the targeted tests**

```powershell
pnpm.cmd exec node --test tests/pageTimeContext.test.js tests/viewCrown.test.js tests/dashboardCommandCrown.test.js tests/playbackViewOwnership.test.js tests/playbackComponentsV3.test.js
```

Expected: all passing.

- [ ] **Step 11: Commit**

```bash
git add src/charting/time/playbackReducer.js src/components/playback src/components/time/temporalAuthoringCharts.js src/components/build/BuildWorkspace.jsx src/App.jsx src/styles/modes.css tests
git commit -m "feat(view): add page time context with an explicit whole-page playback source

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 9: Persistent structure rail and properties pane

**Files:**

- Modify: `src/components/dashboard/CanonicalDashboardFrame.jsx`
- Modify: `src/components/build/BuildWorkspace.jsx:776-960`
- Create: `src/components/build/BuildPropertiesPane.jsx` (from `BuildInspector.jsx`)
- Delete: `src/components/build/BuildInspector.jsx`
- Modify: `src/components/build/BuildStructureRail.jsx` (remove `inspector` prop)
- Modify: `src/App.jsx:231-240, 381-400, 431-441, 1785, 1936-1942`
- Modify: `src/components/DashboardRenderer.jsx:199-200, 355-364, 1107, 1312-1330, 2796-2797, 2846-2847, 2929`
- Modify: `src/components/dashboard/DashboardModeWorkspace.jsx` (drop `buildPanelOpen`)
- Modify: `src/theme/dashboardRegionRegistry.js`
- Modify: `tests/e2e/support/dashboard-surface-manifest.js`, `tests/e2e/support/buildWorkflow.js`
- Modify: `src/styles/modes.css` (delete `dashboard-map-*` rules at 1816-1960 and 1997-2044; append Lane B grid block)
- Modify: `tests/buildStructureRail.test.js`, `tests/buildStructureControls.test.js`, `tests/buildWorkspaceV3.test.js`, `tests/rightSideDrawer.test.js`, `tests/dashboardRegionRegistry.test.js`, `tests/dashboardSurfaceManifest.test.js`, `tests/buildPendingWork.test.js`, `tests/buildPageRemovalSurface.test.js`, `tests/dashboardGeometryContract.test.js`, `tests/dashboardStyleSurfaceRoles.test.js`
- Create: `tests/buildRails.test.js`

**Interfaces:**

- Produces: `BuildPropertiesPane({ dashboard, selection, dashboardDraft, pageDrafts, sectionDrafts, disabled, focusLabelKey, onDashboardChange, onPageChange, onPageRemove, onSectionChange, onEditChart, onMoveChart, onRemoveChart, onStructureCommand })`; frame slots `<aside class="build-rail build-rail--structure" data-build-rail="structure">` and `<aside class="build-rail build-rail--properties" data-build-rail="properties">`; driver helpers `structureRail(page)` and `propertiesPane(page)`.

- [ ] **Step 1: Write the rails test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const { default: BuildWorkspace } = await vite.ssrLoadModule("/src/components/build/BuildWorkspace.jsx");
await vite.close();

const activePage = { id: "ops", label: "Operations", sections: [{ id: "signals", title: "Signals", panels: [] }] };
const dashboard = { id: "d", timezone: "UTC", pages: [activePage], chronoGroups: [], scenes: [] };

function render(overrides = {}) {
  return renderToStaticMarkup(React.createElement(BuildWorkspace, {
    dashboard, activePage, pageType: "analytical", selection: { kind: "section", pageId: "ops", sectionId: "signals" },
    dashboardDraft: dashboard, pageDrafts: {}, sectionDrafts: {}, deviceLayout: "desktop",
    onActivate() {}, onRename() {}, onDashboardChange() {}, onPageChange() {}, onSectionChange() {}, onFinish() {}, onReset() {},
    ...overrides,
  }));
}

test("Build renders a persistent structure rail and properties pane with no Dashboard map drawer", () => {
  const html = render();
  assert.match(html, /<aside(?=[^>]*class="build-rail build-rail--structure")(?=[^>]*data-build-rail="structure")(?=[^>]*aria-label="Structure")[^>]*>/);
  assert.match(html, /<aside(?=[^>]*class="build-rail build-rail--properties")(?=[^>]*data-build-rail="properties")(?=[^>]*aria-label="Properties")[^>]*>/);
  assert.match(html, /build-structure-rail/);
  assert.match(html, /class="build-inspector"[\s\S]*Section[\s\S]*Signals/);
  assert.doesNotMatch(html, /dashboard-map-panel|dashboard-map-inline-inspector|Dashboard map/);
  const order = ["build-command-header", 'data-build-rail="structure"', 'data-build-rail="properties"'].map((needle) => html.indexOf(needle));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test("Build frame grid places rails beside the canvas at desktop widths", async () => {
  const css = await readFile(new URL("../src/styles/modes.css", import.meta.url), "utf8");
  assert.match(css, /\.canonical-dashboard-frame\.build-workspace\s*\{[^}]*display:\s*grid;[^}]*grid-template-areas:\s*"header header header"\s*"commands commands commands"\s*"structure canvas properties"\s*"footer footer footer";/);
  assert.match(css, /\.canonical-dashboard-workspace-controls,\s*\.build-workspace-authoring-root\s*\{[^}]*display:\s*contents;/);
  assert.match(css, /@media \(min-width: 1200px\)[\s\S]*grid-template-columns:\s*minmax\(220px, 260px\) minmax\(0, 1fr\) minmax\(280px, 320px\);/);
});
```

- [ ] **Step 2: Properties pane**

Rename `BuildInspector.jsx` to `BuildPropertiesPane.jsx` (`git mv`). Rename the component and default export to `BuildPropertiesPane`. Keep every existing branch. Change the empty state to:

```jsx
    <section className="build-inspector build-inspector-empty" aria-labelledby="build-inspector-title">
      <p className="eyebrow">Dashboard</p>
      <h2 id="build-inspector-title">{dashboard.title || "Untitled dashboard"}</h2>
      <p>{(dashboard.pages ?? []).length} pages. Select a Page, Section, or chart in Structure or on the canvas to edit it here. Scenario identity and package controls live in the Scenario Passport.</p>
    </section>
```

Change the chart branch to:

```jsx
    return (
      <section className="build-inspector build-chart-selection" aria-labelledby="build-inspector-title">
        <p className="eyebrow">Chart</p>
        <h2 id="build-inspector-title">{chart.title || "Untitled chart"}</h2>
        <dl className="build-inspector-facts">
          <div><dt>Type</dt><dd>{chart.typeId}</dd></div>
          <div><dt>Section</dt><dd>{section.title || section.id}</dd></div>
        </dl>
        <div className="build-inspector-actions">
          <button type="button" disabled={disabled} onClick={() => onEditChart?.(placement.id)}>Edit chart</button>
          <button type="button" className="secondary" disabled={disabled} onClick={(event) => onMoveChart?.(placement.id, event.currentTarget)}>Move…</button>
          <button type="button" className="secondary danger" disabled={disabled} onClick={() => onRemoveChart?.(placement.id)}>Remove…</button>
        </div>
      </section>
    );
```

Add a `title` field to the section branch above the description field, bound to `draft.title` and `onSectionChange?.(section, { title: event.target.value })`. Leave the `Role` and `Drill links` controls for Task 11.

- [ ] **Step 3: Frame slots**

In `CanonicalDashboardFrame.jsx` remove the `buildPanelOpen` prop and `data-dashboard-map-open` attribute. Nothing else changes: the rails come from `workspaceControls` (BuildWorkspace) and become grid siblings through CSS.

- [ ] **Step 4: BuildWorkspace composition**

Replace the `inspector` and `structure` constants and the `RightSideDrawer id="dashboard-map-panel"` block with:

```jsx
  const propertiesPane = (
    <BuildPropertiesPane
      dashboard={dashboard}
      selection={selection}
      dashboardDraft={dashboardDraft}
      pageDrafts={pageDrafts}
      sectionDrafts={sectionDrafts}
      disabled={locked}
      focusLabelKey={inspectorFocusKey}
      onDashboardChange={onDashboardChange}
      onPageChange={onPageChange}
      onPageRemove={onPageRemove}
      onSectionChange={onSectionChange}
      onEditChart={() => onResumeChartEditor?.()}
      onMoveChart={(placementId, invoker) => canvasActions?.requestPanelMove({
        kind: "panel",
        pageId: selection?.pageId,
        sectionId: selection?.sectionId,
        placementId,
      }, selectedChart?.title, invoker)}
      onRemoveChart={(placementId) => canvasActions?.removePanel(placementId)}
      onStructureCommand={(command) => canvasActions?.structureCommand(command)}
    />
  );
  const structureRail = (
    <BuildStructureRail
      key={treeResetGeneration}
      dashboard={dashboard}
      selection={selection}
      disabled={navigationLocked}
      onActivate={chooseSelection}
      onRename={onRename}
      onRenameDirtyChange={onInlineRenameDirtyChange}
      onMove={onLayoutMove}
    />
  );
```

and render, directly after `<BuildCommandHeader …/>`:

```jsx
          <aside className="build-rail build-rail--structure" data-build-rail="structure" aria-label="Structure">
            <h2 className="build-rail__heading">Structure</h2>
            {structureRail}
          </aside>
          <aside className="build-rail build-rail--properties" data-build-rail="properties" aria-label="Properties">
            <h2 className="build-rail__heading">Properties</h2>
            {propertiesPane}
          </aside>
```

`canvasActions` is a new `BuildWorkspace` prop: in `DashboardRenderer.jsx` at the `<BuildWorkspace …/>` call (line 2784) pass `canvasActions={dashboardCanvasActions}`, the same frozen action object the canvas receives through `buildState.actions` (`removePanel`, `requestPanelMove`, and `structureCommand` are members of `DASHBOARD_CANVAS_ACTION_NAMES`). `onResumeChartEditor` already resumes the selected chart's editor, so `Edit chart` needs no argument. `selectedChart` is already computed in `BuildWorkspace` for the Unit Orbit title. Remove `buildPanelOpen` and `onCloseDashboardMap` props. Remove the `RightSideDrawer` import if unused. Remove the `inspector` prop from `BuildStructureRail` and delete the `dashboard-map-inline-inspector` branch.

Below 1024px the rails render as disclosures: wrap each rail's content in `<details className="build-rail__disclosure" open={railOpen[kind]}>` with `<summary>` `Structure` or `Properties` only when `deviceLayout !== "desktop"` and `window.matchMedia("(max-width: 1023px)").matches`; implement this with the `useMediaQuery` hook from Task 12 if it has landed, otherwise inline a `React.useSyncExternalStore` on `matchMedia` and replace it with the hook when rebasing. Auto-open the properties disclosure when `selection` changes.

- [ ] **Step 5: Retire the drawer plumbing**

- `App.jsx`: delete `buildPanelOpen` state, `closeBuildPanel`, `toggleBuildPanel`, the crown `Dashboard map` button, `rightDrawer={… buildPanelOpen ? "map" : null}` → `rightDrawer={lookDrawerOpen ? "look" : null}`, and the `onOpenBuildPanel`, `buildPanelOpen`, `onCloseBuildPanel` props to `DashboardRenderer`.
- `DashboardRenderer.jsx`: remove the `buildPanelOpen`/`onCloseBuildPanel` props and the activity effect at 355-364 (layout draft activity is always `"active"` now); simplify `focusLayoutOwner` to call `focusLayoutMapTarget(buildLayoutDraftRef.current?.targetId)` directly and delete `resumeLayoutOwner`; change `surface: "dashboard-map"` at 2847 to `surface: "structure-rail"`; replace the `#dashboard-map-panel input[type="text"]` selector at 1107 with `[data-build-rail="structure"] input`.
- `DashboardModeWorkspace.jsx`: drop `buildPanelOpen`.
- `buildLayoutDraft.js`: `surface: "structure-rail"` in `createBuildLayoutDraft`.

- [ ] **Step 6: Regions and manifest**

In `dashboardRegionRegistry.js`: change `build-workspace-shell` selector to `.canonical-dashboard-frame.build-workspace` with `liveSelectors: [".build-workspace-authoring-root"]`; remove `build-side-sheet` and `dashboard-map-drawer`; add:

```js
  region({
    id: "build-structure-rail",
    owner: "BuildWorkspace",
    selector: '[data-build-rail="structure"]',
    role: "panel",
    lifecycle: "persistent",
    parentId: "build-workspace-shell",
    witnesses: ["build-standard", "build-structure-rail"],
  }),
  region({
    id: "build-properties-pane",
    owner: "BuildPropertiesPane",
    selector: '[data-build-rail="properties"]',
    role: "panel",
    lifecycle: "persistent",
    parentId: "build-workspace-shell",
    witnesses: ["build-standard", "build-properties-pane"],
  }),
  region({
    id: "dashboard-attention-strip",
    owner: "DashboardAttentionStrip",
    selector: ".dashboard-attention-strip",
    role: "panel",
    lifecycle: "conditional",
    parentId: "app-frame-shell",
    witnesses: ["view-attention-strip"],
  }),
```

In the manifest replace `dashboard-map-structure` and `dashboard-map-inspector` with `build-structure-rail` and `build-properties-pane` (executable, `mode: "build"`, `DESKTOP_STANDARD`, roots `[data-build-rail="structure"]` and `[data-build-rail="properties"]`, setup: enter Build and select the first section through the rail), and add `view-attention-strip` (executable, `mode: "view"`, `DESKTOP_STANDARD`, root `.dashboard-attention-strip`, setup: the journey from Task 10 Step 2 that authors the strip, then switches to View).

In `buildWorkflow.js` delete `dashboardMap`, `openDashboardMap`, `closeDashboardMap` and add:

```js
export function structureRail(page) {
  return page.locator('[data-build-rail="structure"]');
}

export function propertiesPane(page) {
  return page.locator('[data-build-rail="properties"]');
}
```

Update `tests/e2e/build-workflow-contract.spec.js`, `tests/e2e/source-content-csv.spec.js`, `tests/e2e/v3-dashboard-map.spec.js` (rename to `v3-structure-rail.spec.js`), and any other importer found with `grep -rl "openDashboardMap\|closeDashboardMap\|dashboardMap(" tests/e2e` to use the new helpers. Steps that clicked the crown `Dashboard map` button are deleted; the rail is always present.

- [ ] **Step 7: CSS**

Delete the rules under `/* Dashboard map */` at `modes.css:1816-1960` that mention `dashboard-map-panel`, `dashboard-map-content`, `dashboard-map-header`, `dashboard-map-region-switch`, `dashboard-map-inline-inspector`, and the two `@media` blocks at 1997-2044 that reference `data-dashboard-map-open` and `.right-side-drawer.dashboard-map-panel`. Keep the `.scenario-passport-popover` rule from the `min-width: 900px` block by moving it into a new `@media (min-width: 900px)` block of its own. Then append:

```css
/* Lane B: persistent Build rails. */
.canonical-dashboard-workspace-controls,
.build-workspace-authoring-root {
  display: contents;
}

.canonical-dashboard-frame.build-workspace {
  display: grid;
  grid-template-areas:
    "header header header"
    "commands commands commands"
    "structure canvas properties"
    "footer footer footer";
  grid-template-columns: minmax(0, 1fr);
  column-gap: 0;
}

.canonical-dashboard-frame.build-workspace > .canonical-dashboard-header { grid-area: header; }
.canonical-dashboard-frame.build-workspace .build-command-header { grid-area: commands; }
.canonical-dashboard-frame.build-workspace > .canonical-dashboard-content { grid-area: canvas; min-width: 0; }
.canonical-dashboard-frame.build-workspace > .dashboard-footer { grid-area: footer; }
.build-rail--structure { grid-area: structure; }
.build-rail--properties { grid-area: properties; }

.build-rail {
  background: var(--simex-surface-panel);
  border-top: 1px solid var(--simex-border-subtle);
  display: grid;
  gap: var(--simex-space-3);
  min-width: 0;
  padding: var(--simex-padding-panel);
}

.build-rail__heading {
  font-size: 16px;
  line-height: 1.25;
  margin: 0;
}

.build-rail__disclosure > summary {
  cursor: pointer;
  font-weight: 700;
  min-height: var(--simex-control-standard);
}

.build-inspector-facts {
  display: grid;
  gap: var(--simex-space-2);
  margin: 0;
}

.build-inspector-facts div {
  display: flex;
  gap: var(--simex-space-3);
}

.build-inspector-facts dt {
  color: var(--simex-text-muted);
  min-width: 64px;
}

.build-inspector-facts dd {
  margin: 0;
}

.build-inspector-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--simex-gap-control-group);
}

@media (max-width: 1023px) {
  .canonical-dashboard-frame.build-workspace {
    grid-template-areas:
      "header"
      "structure"
      "commands"
      "canvas"
      "properties"
      "footer";
  }
}

@media (min-width: 1024px) {
  .canonical-dashboard-frame.build-workspace {
    grid-template-columns: 220px minmax(0, 1fr) 280px;
  }

  .build-rail {
    align-self: start;
    border-top: 0;
    max-height: calc(100dvh - var(--right-side-drawer-top, 12px) - 12px);
    overflow: auto;
    position: sticky;
    top: var(--right-side-drawer-top, 12px);
  }

  .build-rail--structure { border-inline-end: 1px solid var(--simex-border-subtle); }
  .build-rail--properties { border-inline-start: 1px solid var(--simex-border-subtle); }
}

@media (min-width: 1200px) {
  .canonical-dashboard-frame.build-workspace {
    grid-template-columns: minmax(220px, 260px) minmax(0, 1fr) minmax(280px, 320px);
  }
}
```

The frame's `max-width: var(--simex-canonical-canvas-max-width)` from the style grammar now bounds the whole three-column grid; widen it in Build only: add `.app-frame .canonical-dashboard-frame.build-workspace { max-width: calc(var(--simex-canonical-canvas-max-width) + 580px); }` at the end of the block.

- [ ] **Step 8: Repair proven unit consumers**

Run and fix only assertions that name the drawer, the inline inspector, `Dashboard map`, `data-dashboard-map-open`, or `build-side-sheet`:

```powershell
pnpm.cmd exec node --test tests/buildRails.test.js tests/buildStructureRail.test.js tests/buildStructureControls.test.js tests/buildWorkspaceV3.test.js tests/rightSideDrawer.test.js tests/dashboardRegionRegistry.test.js tests/dashboardSurfaceManifest.test.js tests/buildPendingWork.test.js tests/buildPageRemovalSurface.test.js tests/dashboardGeometryContract.test.js tests/dashboardStyleSurfaceRoles.test.js tests/viewCrown.test.js
```

The `buildWorkspaceV3.test.js` tests "Build maximum width is bounded by View…" and "open Build panel compresses the canvas…" describe the retired compression; replace them with one test asserting the `build-workspace` max-width rule above and the three-column template at 1200px.

- [ ] **Step 9: Browser journey**

```powershell
pnpm.cmd test:e2e:dev -- tests/e2e/v3-structure-rail.spec.js --project=chromium
```

Expected: the renamed journey passes with the rail always visible and the properties pane reflecting the selection.

- [ ] **Step 10: Commit**

```bash
git add -A src tests
git commit -m "feat(build): replace the Dashboard map drawer with persistent structure and properties rails

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 10: Attention strip and page time browser journeys

**Files:**

- Create: `tests/e2e/v3-decision-surface.spec.js`
- Modify: `tests/e2e/support/buildWorkflow.js` (add `authorAttentionStrip`)

**Interfaces:**

- Consumes: `chartAuthoringWorkflow` from `tests/e2e/support/chart-authoring-workflow.js` (existing driver) for KPI creation; `structureRail`, `propertiesPane` from Task 9; the `Role` and `Drill link for …` controls from Task 11.
- Produces: `authorAttentionStrip(page, { pageId, sectionTitle })` which adds a section, creates one KPI chart in it through the wizard, sets the role, saves the layout, and returns the section id.

- [ ] **Step 1: Driver helper**

Append to `buildWorkflow.js`:

```js
import { expect } from "@playwright/test";
import { chartAuthoringWorkflow } from "./chart-authoring-workflow.js";

export async function authorAttentionStrip(page, { pageId = "biomedical", sectionTitle = "At a glance", chartTitle = "Cases today" } = {}) {
  await enterBuildMode(page);
  await page.locator(`[data-dashboard-page-id="${pageId}"]`).click();
  await page.getByRole("button", { name: "Add section" }).click();
  await page.getByLabel("Section name").fill(sectionTitle);
  await page.getByRole("button", { name: "Create section" }).click();
  const section = page.locator("[data-canonical-section-id]", { has: page.getByRole("heading", { name: sectionTitle }) });
  await expect(section).toBeVisible();
  const sectionId = await section.getAttribute("data-canonical-section-id");

  await section.getByRole("button", { name: "Add chart" }).click();
  const wizard = chartAuthoringWorkflow(page.getByRole("dialog", { name: "Add new chart" }));
  await expect(wizard.wizard).toBeVisible();
  await wizard.goToDataSource();
  const sourceTrigger = wizard.wizard.getByRole("combobox", { name: /^Managed data source\b/ });
  await sourceTrigger.click();
  await wizard.wizard.getByRole("option").first().click();
  await wizard.chooseChartType("KPI", "KPI card");
  await wizard.goToMapAndPrepare();
  const valueSelect = wizard.wizard.locator('[data-field-id="value"] select').first();
  const firstColumn = await valueSelect.locator("option:not([value=''])").first().getAttribute("value");
  await valueSelect.selectOption(firstColumn);
  await wizard.createChart(chartTitle);

  await structureRail(page).locator(`[data-build-node-id="${sectionId}"]`).click();
  await propertiesPane(page).getByLabel("Role").selectOption("attention");
  await page.getByRole("button", { name: "Save Layout Changes" }).click();
  await expect(page.locator(`.dashboard-attention-strip[data-canonical-section-id="${sectionId}"]`)).toBeVisible();
  return sectionId;
}
```

The dialog labels come from `BuildLayoutCreateDialog.jsx` (`aria-label="Section name"`, submit `Create section`) and the wizard primitives from `chart-authoring-workflow.js` (`goToDataSource`, `chooseChartType`, `goToMapAndPrepare`, `createChart`). If the value role's `data-field-id` differs from `value` on the KPI schema, read `targetSchemas.js` (`role("value", …)`) and adjust the selector once.

- [ ] **Step 2: Journey**

```js
import { expect, test } from "@playwright/test";
import { authorAttentionStrip } from "./support/buildWorkflow.js";
import { openDashboardPage } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
});

test("attention strip renders above the page body and drills to its target", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  const sectionId = await authorAttentionStrip(page);
  const pane = page.locator('[data-build-rail="properties"]');
  await pane.getByLabel(/Drill link for/).first().selectOption({ label: /Hospital|Outbreak|Cases/ });
  await page.getByRole("button", { name: "Save Layout Changes" }).click();
  await page.getByLabel("Dashboard mode").getByRole("button", { name: "View", exact: true }).click();

  const strip = page.locator(`.dashboard-attention-strip[data-canonical-section-id="${sectionId}"]`);
  await expect(strip).toBeVisible();
  const stripBox = await strip.boundingBox();
  const firstBody = page.locator('.dashboard-section:not(.dashboard-attention-strip)').first();
  const bodyBox = await firstBody.boundingBox();
  expect(stripBox.y).toBeLessThan(bodyBox.y);

  const drill = strip.locator(".attention-drill").first();
  const targetId = await drill.getAttribute("data-drill-target");
  await drill.click();
  const target = page.locator(`[data-canonical-section-id="${targetId}"], [data-canonical-panel-id="${targetId}"]`).first();
  await expect(target).toHaveAttribute("data-drill-highlight", "true");
});

test("Set page time opens whole-page playback and the readout follows the scrub", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");
  const readout = page.locator(".page-time-context__value");
  await expect(readout).toHaveText("Latest available");
  await page.getByRole("button", { name: "Set page time" }).click();
  await expect(page.getByRole("region", { name: "Chrono playback controls" }).getByLabel("Chrono source")).toHaveValue("page:");
  await expect(readout).toContainText("Whole page");
  const before = await readout.textContent();
  await page.getByRole("region", { name: "Chrono playback controls" }).getByRole("button", { name: "Next frame" }).click();
  await expect(readout).not.toHaveText(before);
  await page.getByRole("button", { name: "Exit page time" }).click();
  await expect(readout).toHaveText("Latest available");
});
```

`Next frame` is the accessible name `ChronoController.jsx:105` gives the next-time-point control.

- [ ] **Step 3: Run**

```powershell
pnpm.cmd test:e2e:dev -- tests/e2e/v3-decision-surface.spec.js --project=chromium
```

Expected: both journeys pass. The first depends on Task 11's `Role` and `Drill link` controls; run it after Task 11 lands and note the dependency in the commit body if committing earlier.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/v3-decision-surface.spec.js tests/e2e/support/buildWorkflow.js
git commit -m "test(view): cover the attention strip drill and page time journeys

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 11: Role and drill controls in the properties pane

**Files:**

- Modify: `src/components/build/BuildPropertiesPane.jsx` (section branch)
- Modify: `tests/buildRails.test.js`

**Interfaces:**

- Consumes: `attentionRoleIssues`, `drillTargetsForPage`, `sectionRole` (Task 5); `onStructureCommand` prop (Task 9) dispatching `set-section-role` and `set-panel-drill` (Task 7).

- [ ] **Step 1: Test**

Append to `tests/buildRails.test.js`:

```js
test("section properties expose the role choice, refusal reasons, and drill links", () => {
  const kpi = { id: "k1", typeId: "kpi", title: "Cases" };
  const dash = { ...dashboard, pages: [{ id: "ops", label: "Operations", sections: [
    { id: "top", title: "At a glance", role: "attention", panels: [{ id: "w1", chart: kpi, drill: { kind: "section", sectionId: "body" } }] },
    { id: "body", title: "Hospital pressure", panels: [{ id: "w2", chart: { id: "b1", typeId: "bar", title: "Beds" } }] },
  ] }] };
  const attention = render({ dashboard: dash, dashboardDraft: dash, activePage: dash.pages[0], selection: { kind: "section", pageId: "ops", sectionId: "top" } });
  assert.match(attention, /<select[^>]*aria-label="Role"[^>]*>[\s\S]*<option[^>]*value="attention"[^>]*selected/);
  assert.match(attention, /<select[^>]*aria-label="Drill link for Cases"[^>]*>[\s\S]*<option[^>]*value="section:body"[^>]*selected[^>]*>Hospital pressure</);
  const body = render({ dashboard: dash, dashboardDraft: dash, activePage: dash.pages[0], selection: { kind: "section", pageId: "ops", sectionId: "body" } });
  assert.match(body, /<option[^>]*value="attention"[^>]*disabled/);
  assert.match(body, /At a glance is already this page(?:&#x27;|')s attention strip\./);
});
```

- [ ] **Step 2: Implement**

In the section branch of `BuildPropertiesPane.jsx`, after the description field:

```jsx
        {(() => {
          const role = sectionRole(section);
          const issues = role === "attention" ? [] : attentionRoleIssues(page, section);
          const targets = drillTargetsForPage(page, section.id);
          return (
            <>
              <label>
                Role
                <select
                  aria-label="Role"
                  disabled={disabled}
                  value={role}
                  onChange={(event) => onStructureCommand?.({ type: "set-section-role", pageId: page.id, sectionId: section.id, role: event.target.value })}
                >
                  <option value="standard">Standard section</option>
                  <option value="attention" disabled={issues.length > 0}>Attention strip</option>
                </select>
              </label>
              {issues.length > 0 && (
                <ul className="build-inspector-issues" aria-label="Why this section cannot be the attention strip">
                  {issues.map((issue) => <li key={issue}>{issue}</li>)}
                </ul>
              )}
              {role === "attention" && (
                <fieldset className="build-inspector-drills">
                  <legend>Drill links</legend>
                  {(section.panels ?? []).map((panel) => {
                    const chart = panel.chart ?? panel;
                    const current = panel.drill ? `${panel.drill.kind}:${panel.drill.kind === "section" ? panel.drill.sectionId : panel.drill.chartId}` : "";
                    return (
                      <label key={panel.id}>
                        {chart.title || chart.id}
                        <select
                          aria-label={`Drill link for ${chart.title || chart.id}`}
                          disabled={disabled}
                          value={current}
                          onChange={(event) => {
                            const [kind, id] = event.target.value.split(":");
                            onStructureCommand?.({
                              type: "set-panel-drill",
                              pageId: page.id,
                              sectionId: section.id,
                              placementId: panel.id,
                              drill: kind ? (kind === "section" ? { kind, sectionId: id } : { kind, chartId: id }) : null,
                            });
                          }}
                        >
                          <option value="">No link</option>
                          {targets.map((target) => (
                            <option key={`${target.kind}:${target.id}`} value={`${target.kind}:${target.id}`}>{target.title}</option>
                          ))}
                        </select>
                      </label>
                    );
                  })}
                </fieldset>
              )}
            </>
          );
        })()}
```

Import the three helpers from `../../charting/config/sectionRoles.js`. The section branch reads `page` from the existing lookup at the top of the component; the role and drill values read from `dashboard` (saved layout plus draft projection), which is what `BuildWorkspace` already passes.

- [ ] **Step 3: Run**

```powershell
pnpm.cmd exec node --test tests/buildRails.test.js
pnpm.cmd test:e2e:dev -- tests/e2e/v3-decision-surface.spec.js --project=chromium
```

Expected: all passing.

- [ ] **Step 4: Commit**

```bash
git add src/components/build/BuildPropertiesPane.jsx tests/buildRails.test.js
git commit -m "feat(build): author section role and drill links from the properties pane

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Lane C: mobile View

### Task 12: `useMediaQuery` hook and compact crown

**Files:**

- Create: `src/components/common/useMediaQuery.js`
- Modify: `src/components/app-shell/DashboardCommandCrown.jsx`
- Create: `src/components/app-shell/CompactCrownDisclosure.jsx`
- Modify: `tests/dashboardCommandCrown.test.js`
- Modify: `src/styles/modes.css` (Lane C block)

**Interfaces:**

- Produces: `useMediaQuery(query)` returning a boolean, `false` on the server; `MOBILE_VIEW_QUERY = "(max-width: 767px)"` exported from the hook module; crown attribute `data-crown-compact="true"` when compact.

- [ ] **Step 1: Tests**

Append to `tests/dashboardCommandCrown.test.js`:

```js
test("the compact crown collapses to one row with a page disclosure at phone width", async () => {
  const { default: Crown } = await loadCrownWithMatchMedia(true);
  const html = renderToStaticMarkup(React.createElement(Crown, {
    mode: "view",
    dashboardIdentity: { title: "Biomedical situational awareness", scenarioLabel: "HeV-A26 Day 2", lastUpdated: "2026-07-27" },
    activePage: { id: "biomedical", label: "Biomedical" },
    pages: [{ id: "biomedical", label: "Biomedical" }, { id: "operations", label: "Operations" }],
    pageActions: React.createElement("button", { type: "button" }, "Compare charts"),
    onModeRequest() {}, onPageRequest() {}, onScenarioRequest() {},
  }));
  assert.match(html, /data-crown-compact="true"/);
  assert.equal((html.match(/data-command-crown-layer="location"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /data-command-crown-layer="mode"/);
  assert.match(html, /<button(?=[^>]*aria-expanded="false")(?=[^>]*aria-controls="crown-disclosure")[^>]*>Biomedical<\/button>/);
  assert.doesNotMatch(html, /id="crown-disclosure"/);
});

test("the compact crown never applies outside View", async () => {
  const { default: Crown } = await loadCrownWithMatchMedia(true);
  const html = renderToStaticMarkup(React.createElement(Crown, {
    mode: "build",
    dashboardIdentity: { title: "Dashboard" },
    activePage: { id: "a", label: "A" },
    pages: [{ id: "a", label: "A" }],
    onModeRequest() {}, onPageRequest() {}, onScenarioRequest() {},
  }));
  assert.doesNotMatch(html, /data-crown-compact/);
  assert.equal((html.match(/data-command-crown-layer=/g) ?? []).length, 2);
});
```

Add the loader at the top of the file:

```js
async function loadCrownWithMatchMedia(matches) {
  globalThis.window = { matchMedia: () => ({ matches, addEventListener() {}, removeEventListener() {} }) };
  const server = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
  const module = await server.ssrLoadModule(`/src/components/app-shell/DashboardCommandCrown.jsx?compact=${matches}`);
  await server.close();
  delete globalThis.window;
  return module;
}
```

The `?compact=` query forces a fresh module instance so the hook reads the stubbed `window` at import time.

- [ ] **Step 2: Hook**

```js
import React from "react";

export const MOBILE_VIEW_QUERY = "(max-width: 767px)";

function subscribe(query, callback) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const list = window.matchMedia(query);
  list.addEventListener("change", callback);
  return () => list.removeEventListener("change", callback);
}

export function useMediaQuery(query) {
  return React.useSyncExternalStore(
    (callback) => subscribe(query, callback),
    () => typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false,
    () => typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false,
  );
}
```

The server snapshot mirrors the client one so the stubbed `window` in the test drives SSR; in a real server render `window` is undefined and the hook returns `false`.

- [ ] **Step 3: Disclosure component**

```jsx
import React from "react";

export default function CompactCrownDisclosure({
  id = "crown-disclosure",
  open,
  onClose,
  dashboardIdentity = {},
  activePage,
  pages = [],
  onPageRequest,
  pageActions,
}) {
  const panelRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); onClose?.(); }
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector("button, a, [tabindex]")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);
  if (!open) return null;
  return (
    <section id={id} ref={panelRef} className="crown-disclosure" aria-label="Dashboard pages and details">
      <div className="crown-disclosure__identity">
        <strong>{dashboardIdentity.title || dashboardIdentity.programLabel || "SimEx Dashboard"}</strong>
        {dashboardIdentity.scenarioLabel && <span>{dashboardIdentity.scenarioLabel}</span>}
      </div>
      <nav className="crown-disclosure__pages" aria-label="Dashboard pages">
        {pages.map((page) => {
          const active = page.id === activePage?.id;
          return (
            <button
              key={page.id}
              type="button"
              data-dashboard-page-id={page.id}
              className={active ? "active" : "secondary"}
              aria-current={active ? "page" : undefined}
              onClick={() => { onPageRequest?.(page.id); onClose?.(); }}
            >
              {page.label || page.title || page.id}
            </button>
          );
        })}
      </nav>
      {pageActions && <div className="crown-disclosure__actions">{pageActions}</div>}
      <dl className="crown-disclosure__meta">
        {dashboardIdentity.scenarioLabel && <div><dt>Scenario</dt><dd>{dashboardIdentity.scenarioLabel}</dd></div>}
        {dashboardIdentity.lastUpdated && <div><dt>Updated</dt><dd>{dashboardIdentity.lastUpdated}</dd></div>}
      </dl>
    </section>
  );
}
```

- [ ] **Step 4: Crown**

In `DashboardCommandCrown.jsx` import the hook and disclosure, then:

```jsx
  const compact = useMediaQuery(MOBILE_VIEW_QUERY) && mode === "view";
  const [disclosureOpen, setDisclosureOpen] = React.useState(false);
  React.useEffect(() => { if (!compact) setDisclosureOpen(false); }, [compact]);
  if (compact) {
    const pageLabel = activePage?.label || activePage?.title || activePage?.id || "Pages";
    return (
      <div className="dashboard-command-crown" data-crown-compact="true" data-sticky-location={noticeNode ? "true" : undefined} style={{ "--dashboard-mode-context-block-size": "var(--simex-command-crown-row)" }}>
        <section className="dashboard-identity-row crown-compact-row" data-command-crown-layer="location" aria-label="Dashboard location and Page tools">
          <span className="app-frame-identity">SimEx</span>
          <ModeSwitcher mode={mode} availableModes={availableModes} onModeRequest={onModeRequest} disabled={disabled} disabledReason={disabledReason} />
          <button
            type="button"
            className="secondary crown-disclosure-trigger"
            aria-expanded={disclosureOpen}
            aria-controls="crown-disclosure"
            onClick={() => setDisclosureOpen((open) => !open)}
          >
            {pageLabel}
          </button>
        </section>
        <CompactCrownDisclosure
          open={disclosureOpen}
          onClose={() => setDisclosureOpen(false)}
          dashboardIdentity={dashboardIdentity}
          activePage={activePage}
          pages={pages}
          onPageRequest={onPageRequest}
          pageActions={pageActions}
        />
        {noticeNode}
        <ModeContextStrip mode={mode} contextNode={contextNode} statusNode={statusNode} disabledReason={contextDisabledReason} />
      </div>
    );
  }
```

Keep the existing desktop return unchanged below it. Hooks must be called before the early return, as shown.

- [ ] **Step 5: CSS**

Append the Lane C block:

```css
/* Lane C: compact View crown at phone width. */
@media (max-width: 767px) {
  .dashboard-command-crown[data-crown-compact="true"] .crown-compact-row {
    align-items: center;
    display: flex;
    flex-wrap: nowrap;
    gap: var(--simex-gap-control-group);
    padding-inline: 12px;
  }

  .dashboard-command-crown[data-crown-compact="true"] .mode-switcher {
    flex: 1 1 auto;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .dashboard-command-crown[data-crown-compact="true"] .mode-switcher button {
    min-height: var(--simex-control-compact);
    padding-inline: var(--simex-space-3);
  }

  .crown-disclosure-trigger {
    flex: 0 1 40%;
    min-height: var(--simex-control-compact);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .crown-disclosure-trigger::before {
    content: "▾ ";
  }

  .crown-disclosure {
    background: var(--simex-surface-panel);
    border-bottom: 1px solid var(--simex-border-subtle);
    display: grid;
    gap: var(--simex-space-4);
    padding: var(--simex-space-4) 12px;
    animation: crown-disclosure-open 120ms ease;
  }

  .crown-disclosure__identity {
    display: grid;
    gap: var(--simex-space-1);
  }

  .crown-disclosure__pages {
    display: grid;
    gap: var(--simex-gap-control-group);
  }

  .crown-disclosure__pages button {
    justify-content: flex-start;
    min-height: var(--simex-control-standard);
    text-align: left;
  }

  .crown-disclosure__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--simex-gap-control-group);
  }

  .crown-disclosure__meta {
    display: grid;
    gap: var(--simex-space-2);
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 0;
  }

  .crown-disclosure__meta dt {
    color: var(--simex-text-muted);
    font-size: 12px;
  }

  .crown-disclosure__meta dd {
    margin: 0;
  }
}

@keyframes crown-disclosure-open {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .crown-disclosure {
    animation: none;
  }
}
```

- [ ] **Step 6: Run**

```powershell
pnpm.cmd exec node --test tests/dashboardCommandCrown.test.js tests/viewCrown.test.js
```

Expected: all passing, including the three existing desktop tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/common/useMediaQuery.js src/components/app-shell src/styles/modes.css tests/dashboardCommandCrown.test.js
git commit -m "feat(view): collapse the crown to one row with a page disclosure at phone width

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 13: Header fold and chart height cap

**Files:**

- Modify: `src/components/dashboard/DashboardHeader.jsx`
- Modify: `src/styles/modes.css` (Lane C block)
- Create: `tests/mobileViewHeader.test.js`

**Interfaces:**

- Consumes: `useMediaQuery`, `MOBILE_VIEW_QUERY` from Task 12.
- Produces: header attribute `data-header-compact="true"` at phone width in View.

- [ ] **Step 1: Test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

async function loadHeader(matches) {
  globalThis.window = { matchMedia: () => ({ matches, addEventListener() {}, removeEventListener() {} }) };
  const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
  const module = await vite.ssrLoadModule(`/src/components/dashboard/DashboardHeader.jsx?compact=${matches}`);
  await vite.close();
  delete globalThis.window;
  return module.default;
}

const dashboard = { title: "Biomedical", description: "Regional evidence", programLabel: "PDPC", scenarioLabel: "HeV-A26", lastUpdated: "2026-07-27" };
const activePage = { id: "biomedical", title: "Biomedical", description: "Regional evidence" };

test("compact View header keeps only the page title and description", async () => {
  const Header = await loadHeader(true);
  const html = renderToStaticMarkup(React.createElement(Header, { activePage, dashboard, mode: "view" }));
  assert.match(html, /data-header-compact="true"/);
  assert.match(html, /<h1>Biomedical<\/h1>/);
  assert.doesNotMatch(html, /pdpc-header-mark|dashboard-meta/);
});

test("desktop header is unchanged", async () => {
  const Header = await loadHeader(false);
  const html = renderToStaticMarkup(React.createElement(Header, { activePage, dashboard, mode: "view" }));
  assert.doesNotMatch(html, /data-header-compact/);
  assert.match(html, /pdpc-header-mark[\s\S]*dashboard-meta/);
});

test("phone-width View caps every chart footprint height", async () => {
  const css = await readFile(new URL("../src/styles/modes.css", import.meta.url), "utf8");
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*\.view-shell \.chart-panel-footprint\s*\{[^}]*height:\s*clamp\(240px, 52vh, 420px\);/);
  assert.match(css, /\.view-shell \.dashboard-attention-strip \.attention-strip-items\s*\{[^}]*scroll-snap-type:\s*x mandatory;/);
});
```

- [ ] **Step 2: Header**

```jsx
import React from "react";

import { MOBILE_VIEW_QUERY, useMediaQuery } from "../common/useMediaQuery.js";
import { hasLandingPresentation } from "../LandingPage.jsx";

export default function DashboardHeader({ activePage, dashboard, mode = "view" }) {
  const compact = useMediaQuery(MOBILE_VIEW_QUERY) && mode === "view";
  const landingActive = hasLandingPresentation(activePage);
  const title = activePage?.title ?? dashboard.title;
  const description = activePage?.description ?? dashboard.description;
  const hasDescription = typeof description === "string" && description.trim() !== "";

  if (compact) {
    return (
      <header className="dashboard-header" data-header-compact="true">
        <div className="dashboard-brand-block">
          <div>
            {landingActive ? <div className="dashboard-page-title">{title}</div> : <h1>{title}</h1>}
            {hasDescription && <p className="subtitle">{description}</p>}
          </div>
        </div>
      </header>
    );
  }
  // existing desktop return, unchanged
```

`DashboardModeWorkspace` and `ViewShell` render `<DashboardHeader activePage dashboard />`; pass `mode={mode}` from `DashboardModeWorkspace` and `mode="view"` from `ViewShell`. Build's header comes from `dashboardHeaderNode` in the renderer and is unaffected.

- [ ] **Step 3: CSS**

Append to the Lane C block:

```css
/* Lane C: phone-width View content. */
@media (max-width: 767px) {
  .view-shell .dashboard-header[data-header-compact="true"] {
    min-height: 0;
    padding: 10px 12px 6px;
  }

  .view-shell .chart-panel-footprint {
    grid-column: auto;
    grid-row: auto;
    height: clamp(240px, 52vh, 420px);
    max-height: 420px;
    min-height: 0;
  }

  .view-shell .chart-panel-footprint:has(.chart-card-view) {
    height: auto;
    max-height: none;
  }

  .view-shell .layout-grid {
    gap: 12px;
    grid-auto-rows: auto;
    grid-template-columns: 1fr;
    padding: 12px;
  }

  .view-shell .dashboard-attention-strip .attention-strip-items {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    padding: 12px;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .view-shell .attention-strip-item {
    flex: 0 0 min(72vw, 320px);
    scroll-snap-align: start;
  }
}
```

- [ ] **Step 4: Run**

```powershell
pnpm.cmd exec node --test tests/mobileViewHeader.test.js tests/viewCrown.test.js
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DashboardHeader.jsx src/components/dashboard/DashboardModeWorkspace.jsx src/components/view/ViewShell.jsx src/styles/modes.css tests/mobileViewHeader.test.js
git commit -m "feat(view): fold header metadata and cap chart height at phone width

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 14: Phone journey

**Files:**

- Create: `tests/e2e/v3-mobile-view.spec.js`

- [ ] **Step 1: Journey**

```js
import { expect, test } from "@playwright/test";
import { openDashboardPage } from "./support/landingWorkflow.js";

const CONTROL_URL = "http://127.0.0.1:4174";

test.beforeEach(async ({ request }) => {
  await request.post(`${CONTROL_URL}/__test__/reset`);
});

test("phone-width View shows one crown row, navigates through the disclosure, and caps chart height", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await openDashboardPage(page, "biomedical");

  const crown = page.locator('.dashboard-command-crown[data-crown-compact="true"]');
  await expect(crown).toBeVisible();
  const row = crown.locator('[data-command-crown-layer="location"]');
  const rowBox = await row.boundingBox();
  expect(rowBox.height).toBeLessThanOrEqual(40);
  await expect(crown.locator('[data-command-crown-layer="mode"]')).toHaveCount(0);

  const trigger = crown.getByRole("button", { name: "Biomedical" });
  await trigger.click();
  const disclosure = page.locator("#crown-disclosure");
  await expect(disclosure).toBeVisible();
  await expect(disclosure.getByRole("button", { name: "Theme" })).toBeVisible();
  await disclosure.locator('[data-dashboard-page-id="socio_economic"]').click();
  await expect(disclosure).toBeHidden();
  await expect(page.locator("[data-canonical-page-id]")).toHaveAttribute("data-canonical-page-id", "socio_economic");

  await expect(page.locator(".dashboard-header[data-header-compact='true']")).toBeVisible();
  await expect(page.locator(".dashboard-meta")).toHaveCount(0);

  const footprints = page.locator(".view-shell .chart-panel-footprint");
  const count = await footprints.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const box = await footprints.nth(index).boundingBox();
    if (box) expect(box.height).toBeLessThanOrEqual(421);
  }
});
```

Use a page id that exists in `public/config/dashboard.json` for the second navigation; `socio_economic` is the id the package journeys use. Confirm with `grep -n '"id": "socio_economic"' public/config/dashboard.json`.

- [ ] **Step 2: Run**

```powershell
pnpm.cmd test:e2e:dev -- tests/e2e/v3-mobile-view.spec.js --project=chromium
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/v3-mobile-view.spec.js
git commit -m "test(view): cover the phone-width crown, disclosure, and chart cap

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Integration and pre-merge

After all three lanes have merged into the task branch:

1. Rebase each lane's last commit onto the integrated branch and resolve `modes.css` conflicts by keeping all three appended blocks in lane order.
2. Run the cross-lane unit selection once:

```powershell
pnpm.cmd exec node --test tests/buildCommandHeader.test.js tests/actionMenu.test.js tests/anchoredStructureCommands.test.js tests/sectionRoles.test.js tests/dashboardAttentionStrip.test.js tests/buildLayoutDraft.test.js tests/buildLayoutMove.test.js tests/pageTimeContext.test.js tests/buildRails.test.js tests/dashboardCommandCrown.test.js tests/mobileViewHeader.test.js tests/dashboardRegionRegistry.test.js tests/dashboardSurfaceManifest.test.js tests/iconSystem.test.js
```

3. Run the four representative journeys once:

```powershell
pnpm.cmd test:e2e:dev -- tests/e2e/v3-anchored-structure-commands.spec.js tests/e2e/v3-structure-rail.spec.js tests/e2e/v3-decision-surface.spec.js tests/e2e/v3-mobile-view.spec.js --project=chromium
```

4. Stop. The full gates (`pnpm.cmd test`, `pnpm.cmd build`, `pnpm.cmd test:e2e -- --project=chromium`) run only when the user declares the branch pre-merge ready, with a saved reporter ledger per AGENTS.md.
