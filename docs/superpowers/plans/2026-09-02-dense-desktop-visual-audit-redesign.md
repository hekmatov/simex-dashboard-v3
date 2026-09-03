# Dense Desktop Visual Audit and Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit every live dashboard surface, replace the touch-first 44px geometry with a dense role-based desktop system, correct the resulting systemic composition defects, and serve the final dashboard locally for review.

**Architecture:** A declarative Playwright surface manifest drives repeatable screenshots and one normalized DOM-geometry collector. The first report creates the repair backlog; shared theme tokens and grammar are corrected before local component and surface fixes, and the same manifest produces final evidence.

**Tech Stack:** React 19, Vite, CSS custom properties, Node test runner, Playwright, Markdown/JSON audit evidence

**Spec:** `docs/superpowers/specs/2026-09-02-dense-desktop-visual-audit-redesign.md`

> **2026-09-03 amendment:** The completed hard `<1024px` Build/Present gate described in the historical tasks below is superseded. Build and Present now remain visible below 1024px with a compact, non-blocking recommendation.

## Global Constraints

- Use the role scale `16 / 24 / 28 / 32 / 36px` and spacing scale `2 / 4 / 8 / 12 / 16 / 24 / 32px` exactly as defined by the spec.
- Keep existing colour profiles and radius choices unchanged.
- Exclude keyboard, focus, assistive-technology semantics, 200% zoom, touch-first sizing, and responsive Build/Present composition from the visual contract.
- Build and Present remain available below 1024px with a compact minimum-width recommendation; responsive narrow-width composition remains out of scope; Audience remains a separate large-display surface.
- Preserve dashboard data, persistence, chart behavior, and workflow ownership.
- Follow the repository's rapid-visual workflow: use rendered evidence as the acceptance mechanism and only the nearest deterministic check for changed shared contracts.
- Work only on `codex/dense-ui-audit` in `.worktrees/dense-ui-audit`; do not merge, push, or deploy.

---

### Task 1: Executable coverage and geometry audit

**Files:**
- Create: `tests/e2e/support/dashboard-surface-manifest.js`
- Create: `tests/e2e/support/dashboard-density-audit.js`
- Create: `tests/e2e/dashboard-density-audit.spec.js`
- Create: `tests/dashboardSurfaceManifest.test.js`
- Modify: `package.json`
- Create: `docs/audits/2026-09-02-dense-desktop-redesign/INITIAL-UI-REVIEW.md`

**Interfaces:**
- Produces `DASHBOARD_SURFACE_MANIFEST`, `collectDashboardDensityEvidence(page, entry)`, screenshot/JSON evidence, and manifest coverage accounting.
- Consumes the existing landing, chart-authoring, expanded-style, and Present/Audience journey helpers.

- [x] Extract stable setup functions for top-level modes and each reachable overlay family from existing V3 journeys.
- [x] Collect controls, choice rows, headings, groups, panels, scroll containers, portals, and their normalized rectangles/styles without focus or keyboard fields.
- [x] Classify role-size, centreline, rhythm, wrap, whitespace, overlap, clipping, overflow, repeated-title, same-role-variance, and occupancy findings.
- [x] Continue after individual setup failures and record every manifest entry as inspected, failed setup, or intentionally out of scope.
- [x] Record the measured initial baseline and write the initial Markdown review with P0/P1/P2 findings ordered by shared owner; explicitly document why no synthetic pre-change screenshot set was created after implementation began.

### Task 2: Shared dense-desktop tokens and control grammar

**Files:**
- Modify: `src/theme/dashboardTheme.js`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/dashboard-style-grammar.css`
- Modify: `src/lib/dashboardMode.js`
- Modify: `tests/dashboardVisualContract.test.js`
- Modify: `tests/e2e/support/dashboard-style-audit.js`

**Interfaces:**
- Produces shared CSS variables for utility, compact, standard, prominent, glyph, row, typography, and spacing roles.
- Existing surfaces continue consuming `--simex-control-min`, redefined as the 32px ordinary-control compatibility alias while new role aliases carry specific geometry.

- [x] Replace `controlMinimum: 44` and `focusWidth` in the visual contract with the approved role and spacing objects.
- [x] Project each exact role and spacing value into theme CSS variables and the static token fallback.
- [x] Replace the broad 44px grammar with 32px ordinary controls, 24px utility/icon controls, 28px compact/choice rows, and 36px prominent actions.
- [x] Reduce control typography and internal padding to the approved 13px/18px control rhythm.
- [x] Remove touch-target and focus requirements from the visual-audit helper while retaining unrelated paint checks.
- [x] Update the nearest deterministic contract check to prove the new role variables and absence of the old 44px/focus visual fields.

### Task 3: Choice controls, authoring forms, and title semantics

**Files:**
- Modify: `src/components/chart-authoring/StandardField.jsx`
- Modify: `src/components/chart-authoring/GeneratedFormSection.jsx`
- Modify: `src/components/chart-authoring/ChartEditorV3.jsx`
- Modify: `src/components/chart-authoring/ChartFootprintPicker.jsx`
- Modify: `src/styles/dashboard-dialogs.css`
- Modify: `src/styles.css`
- Modify: `src/styles/modes.css`

**Interfaces:**
- Produces one visual choice-row geometry across generated and literal checkbox/radio markup.
- Produces duplicate-safe section rendering and a chart-editor header whose identity/type and footprint controls occupy deliberate blocks.

- [x] Render generated boolean rows with one glyph column and one text column, including helper/error content.
- [x] Apply 16px glyph, 28px row, 8px gap, and ≤1px single-line centreline difference across authoring surfaces.
- [x] Suppress a structured field legend when it exactly duplicates its containing section heading while retaining distinct nested labels.
- [x] Split the full-editor header into a compact identity/type strip and a separate footprint block.
- [x] Make the footprint arrangement respond to its container instead of a global 1000px viewport breakpoint.
- [x] Re-run the affected audit states and repair any remaining choice-row or title-duplication P1 finding.

### Task 4: Surface-family density and composition repair

**Files:**
- Modify as supported by findings: `src/styles/modes.css`
- Modify as supported by findings: `src/styles/presentation.css`
- Modify as supported by findings: `src/styles/dashboard-look.css`
- Modify as supported by findings: `src/styles/static-content.css`
- Modify as supported by findings: `src/styles/source-content.css`
- Modify as supported by findings: `src/styles/right-side-drawer.css`
- Modify as supported by findings: `src/styles/operation-status.css`
- Modify as supported by findings: `src/source-viewer/sourceViewer.css`
- Modify: `src/components/app-shell/AppFrame.jsx`
- Modify: `src/components/app-shell/DesktopWidthNotice.jsx`

**Interfaces:**
- Consumes the initial audit's concrete surface findings after Tasks 2–3 remove shared causes.
- Produces compact Build/View/Present desktop composition and a non-blocking `<1024px` width recommendation.

- [x] Remove only proven literal 44px overrides that represent ordinary controls; preserve chart/data geometry and content-specific minimums.
- [x] Normalize panel/body padding, label gaps, group gaps, and action-row stacking to the shared aliases.
- [x] Convert every confirmed crowded horizontal cluster with unused adjacent space into a compact stack or balanced grid.
- [x] Replace the historical hard Build/Present mode gate with a compact recommendation while keeping both workspaces visible.
- [x] Inspect Dashboard Look, Source Content, static content, temporal/scene, Present, dialogs, menus, warnings, empty states, and source viewer after shared changes.
- [x] Fix remaining P0/P1 findings and record any isolated P2 deferral with its owner and rationale.

### Task 5: Final complete audit and review delivery

**Files:**
- Create: `docs/audits/2026-09-02-dense-desktop-redesign/FINAL-UI-REVIEW.md`
- Create: `docs/audits/2026-09-02-dense-desktop-redesign/SCREENSHOT-MANIFEST.md`
- Create selected evidence under: `docs/audits/2026-09-02-dense-desktop-redesign/screenshots/`

**Interfaces:**
- Consumes the same surface manifest and geometry collector used for the initial review.
- Produces coverage totals, before/after finding disposition, final screenshots, prioritized residuals, and the user-facing local review URL.

- [x] Run the complete manifest on the final candidate at its material desktop and Audience viewports.
- [x] Inspect contact-sheet/screenshot evidence for judgement-heavy spacing, hierarchy, contrast, and human-visible semantics.
- [x] Confirm no P0 or systemic P1 finding remains and that every manifest entry has a disposition.
- [x] Run the smallest deterministic contract selection for shared density, dialog geometry, and the width recommendation.
- [x] Commit the coherent redesign and evidence on `codex/dense-ui-audit`.
- [x] Confirm the live server at `http://127.0.0.1:4190/` serves the final worktree and report the URL, branch, audit summary, and any P2 residuals.
