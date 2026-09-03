# Cross-Style Audit and Audience Distance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every catalogued dashboard surface an unmistakable Ledger, Humanist, or Instrument treatment and make Audience charts readable from 4–6 metres.

**Architecture:** One style-disposition catalogue maps the existing 71-surface inventory onto shared surface roles and the three approved signatures. Shared CSS role grammar applies style paint without changing geometry. Audience passes a count-derived presentation scale through ChartView into ECharts and applies the same tier to DOM chart families through audience-scoped variables.

**Tech Stack:** React 19, Vite, CSS custom properties, ECharts 5, Node test runner, existing Playwright surface manifest (capture deferred)

**Spec:** `docs/superpowers/specs/2026-09-02-cross-style-audit-audience-distance-amendment.md`

## Global Constraints

- Preserve the parent dense scale `16 / 24 / 28 / 32 / 36px` and spacing scale `2 / 4 / 8 / 12 / 16 / 24 / 32px` on application controls.
- Style may change typography, contour, elevation, material, dividers, and accents; it must not change surface geometry, data, workflow, or behavior.
- Ledger is flat/ruled/serif; Humanist is rounded/softly elevated/tonal; Instrument is precise/railed/monospaced.
- Audience uses 28/18px at one-to-two items and 24/16px at three-to-four items, with KPI and target emphasis scaled proportionally.
- Audience scaling must not use root transforms or mutate saved chart configuration.
- Keyboard, focus, assistive-technology semantics, touch-first sizing, mobile design, and responsive Build/Present remain excluded.
- Browser/E2E execution is deferred until the amendment batch closes; run deterministic tests only in this slice.
- Preserve every existing uncommitted amendment in the shared worktree; do not commit, merge, push, or deploy.

---

### Task 1: Executable style-disposition catalogue

**Files:**
- Create: `src/theme/dashboardSurfaceRoles.js`
- Create: `tests/dashboardSurfaceRoles.test.js`
- Modify: `tests/e2e/support/dashboard-surface-manifest.js`
- Modify: `tests/dashboardSurfaceManifest.test.js`
- Create: `docs/audits/2026-09-02-dense-desktop-redesign/CROSS-STYLE-MATRIX.md`

**Interfaces:**
- Produces `DASHBOARD_SURFACE_ROLES`, `STYLE_SIGNATURE_CHECKS`, and `buildDashboardStyleDispositionMatrix(surfaceManifest)`.
- Every executable surface produces three dispositions; aliases and the exclusion remain mapped so the total is exactly 213.

- [x] **Step 1: Write the failing catalogue tests.** Assert 71 source entries, 64 executable entries, three style cells per entry, the Page command-form replacement, and no unmapped role or style signature.
- [x] **Step 2: Run `node --test tests/dashboardSurfaceRoles.test.js tests/dashboardSurfaceManifest.test.js` and confirm failure because the role catalogue and three-style matrix do not exist.**
- [x] **Step 3: Implement the minimal immutable role/signature catalogue and connect manifest entries to it without changing their journeys.**
- [x] **Step 4: Generate the Markdown matrix from the catalogue with `PENDING_RENDER` for executable cells and mapped alias/exclusion dispositions; do not claim browser PASS status.**
- [x] **Step 5: Re-run the two catalogue tests and confirm they pass.**

### Task 2: Shared three-style surface-role grammar

**Files:**
- Modify: `src/theme/dashboardSurfaceRoles.js`
- Modify: `src/theme/dashboardStyleGrammar.js`
- Modify: `src/styles/dashboard-style-grammar.css`
- Modify as proven by review: `src/source-viewer/main.jsx`
- Modify as proven by review: `src/styles/desktop-mode-gate.css`
- Modify: `docs/audits/2026-09-02-dense-desktop-redesign/CROSS-STYLE-MATRIX.md`
- Modify portal/theme-root components only when metadata or variable projection is actually missing.
- Modify: `tests/dashboardSurfaceRoles.test.js`
- Modify: `tests/dashboardStyleGrammar.test.js`
- Create: `tests/dashboardStyleSurfaceRoles.test.js`

**Interfaces:**
- Consumes the exact roles from `DASHBOARD_SURFACE_ROLES`.
- Produces shared style variables and role selectors for shell, panel, editor, dialog, drawer, menu, status, table, and chart cell.

- [x] **Step 1: Write failing render tests that mount representative real surfaces for each role and assert Ledger, Humanist, and Instrument expose distinct role paint while rendered structure and role identity remain identical.**
- [x] **Step 2: Run `node --test tests/dashboardStyleGrammar.test.js tests/dashboardStyleSurfaceRoles.test.js` and confirm the new role assertions fail against generic styling.**
- [x] **Step 3: Correct any audit-proven primary-role taxonomy error, then add minimal style-role variables and grouped selectors: Ledger ruled/flat, Humanist tonal/soft-shadowed, Instrument rail/notch/technical. Avoid one-off per-surface geometry overrides.**
- [x] **Step 4: Add or repair theme-root/style inheritance only for mapped portals, recovery, source viewer, and Audience boundaries that currently leak or remain generic.**
- [x] **Step 5: Re-run the two grammar tests and confirm they pass in light plus representative dark appearance.**

### Task 3: Audience count-derived presentation scale

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/display/DisplayedChartGrid.jsx`
- Modify: `src/components/charts/ChartView.jsx`
- Modify: `src/components/charts/chartViewPresentation.js`
- Modify: `src/components/charts/EChartsChartView.jsx`
- Modify: `src/components/charts/TargetCollectionChartView.jsx`
- Modify: `src/components/charts/EmbeddedEChartsItem.jsx`
- Modify: `src/components/charts/ImageChartView.jsx`
- Modify: `src/charting/rendering/axisTitleGraphics.js`
- Modify: `src/styles/presentation.css`
- Modify: `tests/audienceDisplay.test.js`
- Modify: `tests/chartViewV3.test.js`
- Modify: `tests/chartRenderingV3.test.js`
- Modify: `tests/targetCollectionV3.test.js`

**Interfaces:**
- Produces `resolveAudiencePresentationScale(surface, displayedCount)` returning `null`, `{ tier: "distance-large", title: 28, text: 18, value: 40 }`, or `{ tier: "distance-grid", title: 24, text: 16, value: 34 }`.
- `ChartView` passes the scale only to Audience renderers; `applyEChartsPresentation` accepts it as an optional fifth argument and scales legend, axes, series labels/details, axis-title measurement, and compatible gutters.

- [x] **Step 1: Write failing tests proving one/two-item Audience uses 28/18/40, three/four-item Audience uses 24/16/34, and non-Audience surfaces receive no scale.**
- [x] **Step 2: Write failing ECharts tests with hand-authored options proving legend, axis label/name, series label/detail/title, gauge, and value-axis graphic typography use the selected tier without mutating the input model.**
- [x] **Step 3: Run `node --test tests/audienceDisplay.test.js tests/chartViewV3.test.js tests/chartRenderingV3.test.js` and confirm the failures are caused by the missing scale contract.**
- [x] **Step 4: Implement the count-derived scale, pass it through the chart-rendering boundary, scale axis-title measurement and pixel gutters, and make embedded target charts consume the same tier.**
- [x] **Step 5: Add Audience-scoped CSS variables for chart headings, descriptions, provenance, KPI/delta cards, target labels, tables, defensive free text, image/error/empty copy, and row spacing; add collision-safe wrapping/overflow rules without shrinking below the tier.**
- [x] **Step 6: Re-run the three Audience/chart tests and confirm they pass.**

### Task 4: Deterministic integration and deferred visual sign-off

**Files:**
- Modify: `docs/audits/2026-09-02-dense-desktop-redesign/CROSS-STYLE-MATRIX.md`
- Modify: `docs/audits/2026-09-02-dense-desktop-redesign/FINAL-UI-REVIEW.md`

**Interfaces:**
- Records which findings were corrected in code and clearly distinguishes deterministic completion from deferred rendered disposition.

- [x] **Step 1: Run the task-specific deterministic selection once: `node --test tests/dashboardSurfaceRoles.test.js tests/dashboardSurfaceManifest.test.js tests/dashboardStyleGrammar.test.js tests/dashboardStyleSurfaceRoles.test.js tests/audienceDisplay.test.js tests/chartViewV3.test.js tests/chartRenderingV3.test.js tests/targetCollectionV3.test.js`.**
- [x] **Step 2: Inspect the combined diff for geometry leakage, raw style-specific colour coupling, saved-chart mutation, and changes to excluded keyboard/focus/mobile contracts.**
- [x] **Step 3: Update the audit documents with deterministic findings and mark all 192 executable rendered cells `PENDING_RENDER` until the explicitly deferred browser pass.**
- [x] **Step 4: Do not run Playwright, do not claim the 213-cell visual audit is signed off, and do not start or restart the final review server in this amendment slice.**
