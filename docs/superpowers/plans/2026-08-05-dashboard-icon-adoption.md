# Dashboard Icon Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalize the approved icon atlas and use its canonical icons for existing dashboard actions without adding new product behavior.

**Architecture:** `iconGlyphs.js` remains the geometry authority and `iconCatalog.js` remains the interaction authority. Existing controls adopt `IconControl` or `SimExIcon`; dynamic values, field labels, explanatory copy, and confirmation-dialog wording remain text. Generated HTML and Markdown references are rebuilt once after runtime adoption metadata is current.

**Tech Stack:** React 19, plain ECMAScript modules, CSS, Node test runner, deterministic icon-reference generator.

## Global Constraints

- Work only in `C:\Users\hekma\Documents\Projects\SimEx\.worktrees\simex-dashboard-v2\dashboard-refinement-round-2`.
- Do not touch OneDrive, merge, push, deploy, or update Cloudflare branches.
- Preserve `.planning/.continue-here.md` and `.planning/HANDOFF.json` exactly as found.
- Do not invent behavior for atlas entries whose product actions do not yet exist.
- Keep analytical values, timestamps, selection counts, form labels, help text, and confirmation copy textual.
- Use icon-only controls for existing actions that have approved glyphs, always with metadata-derived accessible names and hover/focus tooltips.
- Run only focused icon checks during implementation; broad unit/build/E2E gates remain deferred until explicit pre-merge approval.

---

### Task 1: Finalize the canonical registry

**Files:**
- Modify: `src/iconography/iconGlyphs.js`
- Modify: `src/iconography/iconCatalog.js`
- Test: `tests/iconSystem.test.js`

**Interfaces:**
- Consumes: approved glyph geometry and existing `IconControl` API.
- Produces: icon-language version `1.1.0`, final glyphs, and accurate live/reference metadata.

- [ ] Preserve the approved eyedropper, selected-panel, and re-rank geometry in `ICON_GLYPHS`.
- [ ] Change action entries used by the dashboard to `renderMode: "icon"` through `INTERACTION_REFINEMENTS`.
- [ ] Add only implemented interaction IDs to `LIVE_INTERACTION_IDS`; leave nonexistent transport actions planned.
- [ ] Extend the focused catalog assertions so an adopted action cannot silently return to text or planned status.
- [ ] Run `node --test tests/iconSystem.test.js` once after the registry and application adoption are complete.

### Task 2: Adopt icons in shell and panel actions

**Files:**
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/components/DeviceLayoutControl.jsx`
- Modify: `src/components/ChartPanel.jsx`
- Modify: `src/components/charts/ChartPanelActions.jsx`
- Modify: `src/components/charts/ImageChartView.jsx`
- Modify: `src/components/source-data/SourceCsvViewerButton.jsx`
- Modify: `src/components/InstallDashboardPrompt.jsx`
- Modify: `src/components/LandingPage.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `IconControl`, stable interaction IDs, and existing callbacks.
- Produces: icon-only shell and chart actions with unchanged behavior.

- [ ] Replace existing actionable text for add/edit/remove/reset/import/export/background/device actions with `IconControl` where an approved interaction exists.
- [ ] Replace chart description, source table, image zoom reset, edit, and destructive removal actions with the approved controls.
- [ ] Preserve confirmation dialogs and disabled/pressed state behavior.
- [ ] Keep install/report/contact/repository text where the element is explanatory navigation rather than a compact dashboard action.
- [ ] Add only sizing/layout CSS needed to keep the controls aligned at the approved 24-pixel target.

### Task 3: Adopt icons in wizard and editor

**Files:**
- Modify: `src/components/chart-authoring/ChartWizardV3.jsx`
- Modify: `src/components/chart-authoring/ContextualTabs.jsx`
- Modify: `src/components/chart-authoring/DataSourceStep.jsx`
- Modify: `src/components/chart-authoring/EditSessionActions.jsx`
- Modify: `src/components/chart-authoring/RoleField.jsx`
- Modify: `src/components/chart-authoring/SeriesColorsField.jsx`
- Modify: `src/components/chart-authoring/StandardField.jsx`
- Modify: `src/components/chart-authoring/CollectionSettingsField.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: wizard/editor interaction IDs and current reducer callbacks.
- Produces: icon-only wizard navigation and editor actions; form semantics remain unchanged.

- [ ] Render the wizard close action and four wizard-step tabs from canonical metadata; keep each step’s accessible name and completion/current state.
- [ ] Render create, manual-entry, source-table, remove-source, add-row, and remove-row actions with approved icons.
- [ ] Render contextual editor tabs from `editor.tab.*` IDs, preserving `aria-current` and chart-type-driven tab visibility.
- [ ] Convert cancel/remove/add/filter/factor/color/default-color and other existing editor actions with approved glyphs.
- [ ] Keep field labels and value selectors textual; icons do not replace data-bearing select options.

### Task 4: Adopt collection controls without inventing behavior

**Files:**
- Modify: `src/components/collection/CollectionCarousel.jsx`
- Modify: `src/components/collection/CollectionPager.jsx`
- Modify: `src/components/chart-authoring/CollectionSettingsField.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: existing collection callbacks and `collection.*` interaction IDs.
- Produces: canonical carousel/pager action icons and icon-assisted mode choices.

- [ ] Replace existing pause/resume/previous/next carousel and pager buttons with `IconControl`.
- [ ] Present existing collection layout choices with canonical icons while retaining their accessible labels and stored values.
- [ ] Use canonical sort/loop/stability/rotation glyphs only where matching controls already exist.
- [ ] Leave page number, rows, columns, speed, and ranking method visible because they are data.

### Task 5: Generate references and perform focused verification

**Files:**
- Generate: `docs/icon-language-atlas.html`
- Generate: `docs/icon-and-interaction-specification.md`

**Interfaces:**
- Consumes: final glyph and interaction metadata.
- Produces: canonical visual and textual references matching the application.

- [ ] Run `pnpm.cmd icons:build` once to regenerate both references.
- [ ] Run `node --test tests/iconSystem.test.js` once and correct only focused icon failures.
- [ ] Run `pnpm.cmd icons:check` once after the focused test is green.
- [ ] Launch or reuse the local dashboard and visually inspect the shell, one chart panel, the wizard, the editor, and collection controls at normal size.
- [ ] Review `git diff --check` and `git status --short`; confirm unrelated planning-state changes remain untouched.
- [ ] Commit only the icon registry, application adoption, styles, focused test, and generated reference files. Do not push or merge.
