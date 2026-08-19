# V3 Step 6 Shared Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the accepted visual tokens, Layered Command Crown, best-effort phone boundary, and exact View/Build geometry contract before feature-specific authoring continues.

**Architecture:** Keep `App` as the persisted dashboard/mode owner and `DashboardRenderer` as the projection coordinator. Extend the existing theme resolver and `AppFrame`; introduce shared crown/page/context components and deterministic geometry/architecture probes. View and Build consume the same canonical page frame while Build surfaces remain overlays or in-frame controls that add exactly `0.00` geometry delta.

**Tech Stack:** React 19, JavaScript ES modules, CSS custom properties, Vite 6, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-12-three-mode-dashboard-ui-spec.md`; accepted Sketches 003, 009, 010, 017, and 019; `.planning/sketches/MANIFEST.md`; `.planning/sketches/themes/default.css`; `docs/superpowers/plans/2026-08-19-v3-dashboard-reconciliation-index.md`.

## Global Constraints

- Version 3 remains the only live dashboard configuration and runtime contract.
- Build and Present remain best-effort, mounted, and operable below 768 px. A persistent non-dismissible banner appears above product chrome with **Switch to View**; detection never redirects, disables controls, unmounts the workspace, or discards drafts.
- Build and View canonical geometry is compared only at 768×1024, 1024×768, 1200×900, and 1440×900. Each delta is rounded to two decimal places and must equal the string `0.00`.
- The 390×844 phone banner and draft/state preservation are tested separately and have no Build/Present layout-acceptance assertion.
- `AppFrame` and the crown receive projections and callbacks; they never own dashboard content, temporal state, or authoring drafts.
- All essential controls have a 44×44 px target, a visible 3 px focus indicator, non-colour state cues, and reduced-motion behavior.
- Every task is independently reviewable and ends in one atomic future implementation commit.

---

### Task S6-1: Normalize the neutral token contract without regressing the style portfolio

**Files:**

- Modify: `src/styles/tokens.css`
- Modify: `src/styles/dashboard-style-grammar.css`
- Modify: `src/styles.css`
- Modify: `src/theme/dashboardTheme.js`
- Modify: `src/theme/dashboardStyleGrammar.js`
- Test: `tests/dashboardTheme.test.js`
- Create: `tests/dashboardVisualContract.test.js`

**Interfaces:**

- Consumes: `resolveDashboardTheme({ globalStyles, appearancePreference, prefersDark })`; `resolveDashboardStyleGrammar(dashboardStyle, resolvedAppearance)`.
- Produces:

```js
export const DASHBOARD_VISUAL_CONTRACT = Object.freeze({
  radiusControl: 6,
  radiusSurface: 10,
  controlMinimum: 44,
  focusWidth: 3,
  neutral: Object.freeze({
    outer: "#e8e9ea", surface: "#ffffff", subtle: "#f4f5f5",
    text: "#17191b", muted: "#5a6066", border: "#c7cbcf",
    borderStrong: "#747b82", focus: "#155eef", active: "#202428",
  }),
});
```

- [ ] **Write the failing token test.** In `tests/dashboardVisualContract.test.js`, assert the exact object above and assert the CSS sources use `--simex-component-control-radius`, `--simex-component-surface-radius`, `--simex-component-focus`, and `--simex-control-min` rather than literal Build/Present values.
- [ ] **Run the failing test.** Run `node --test tests/dashboardVisualContract.test.js`. Expected: FAIL because `DASHBOARD_VISUAL_CONTRACT` is not exported.
- [ ] **Implement the token boundary.** Export the frozen contract, map it to component variables, and leave `--simex-data-*` profile paint variables under the existing style/profile resolver.
- [ ] **Protect the portfolio.** Extend `tests/dashboardTheme.test.js` to assert 3 styles, 15 profiles, Profile/Standard chart colour independence, and Light/Dark/System resolution.
- [ ] **Run passing tests.** Run `node --test tests/dashboardTheme.test.js tests/dashboardVisualContract.test.js`. Expected: PASS.
- [ ] **Commit.** Run `git add src/styles/tokens.css src/styles/dashboard-style-grammar.css src/styles.css src/theme/dashboardTheme.js src/theme/dashboardStyleGrammar.js tests/dashboardTheme.test.js tests/dashboardVisualContract.test.js && git commit -m "feat(theme): normalize V3 component visual contract"`.

### Task S6-2: Assemble the Layered Command Crown from non-owning projections

**Files:**

- Modify: `src/components/app-shell/AppFrame.jsx`
- Modify: `src/components/app-shell/ModeSwitcher.jsx`
- Create: `src/components/app-shell/DashboardCommandCrown.jsx`
- Create: `src/components/app-shell/DashboardIdentityRow.jsx`
- Create: `src/components/app-shell/ModeContextStrip.jsx`
- Modify: `src/styles/modes.css`
- Modify: `src/App.jsx`
- Test: `tests/viewCrown.test.js`
- Create: `tests/dashboardCommandCrown.test.js`

**Interfaces:**

- Consumes: `<AppFrame mode onModeRequest modeDisabled blockedReason density theme>` and App-owned active page/mode state.
- Produces:

```jsx
<DashboardCommandCrown
  mode="view|build|present"
  dashboardIdentity={{ id, title, scenarioLabel, programLabel }}
  activePage={{ id, label, title }}
  pages={dashboard.pages}
  contextActions={ReactNode}
  statusItems={ReactNode}
  onModeRequest={(mode) => Promise<void> | void}
  onPageRequest={(pageId) => void}
  onOpenScenario={() => void}
  disabledReason=""
/>
```

- [ ] **Write the failing crown test.** Assert three ordered layers—mode row, dashboard/page row, one mode context strip—and one shared block-size variable for View and Build context strips.
- [ ] **Run the failing test.** Run `node --test tests/dashboardCommandCrown.test.js tests/viewCrown.test.js`. Expected: FAIL because `DashboardCommandCrown` does not exist.
- [ ] **Implement the crown.** Extract mode navigation, add the identity/page row with contained scrolling and pinned actions, and pass immutable projections/callbacks from `App`.
- [ ] **Preserve mode behavior.** Assert active page, filters, synchronized position, scroll, and draft-resolution callbacks survive mode requests.
- [ ] **Run passing tests.** Run `node --test tests/dashboardCommandCrown.test.js tests/viewCrown.test.js tests/dashboardMode.test.js`. Expected: PASS.
- [ ] **Commit.** Run `git add src/components/app-shell/AppFrame.jsx src/components/app-shell/ModeSwitcher.jsx src/components/app-shell/DashboardCommandCrown.jsx src/components/app-shell/DashboardIdentityRow.jsx src/components/app-shell/ModeContextStrip.jsx src/styles/modes.css src/App.jsx tests/viewCrown.test.js tests/dashboardCommandCrown.test.js && git commit -m "feat(shell): assemble layered V3 command crown"`.

### Task S6-3: Prove exact View/Build geometry at every supported workspace viewport

**Files:**

- Create: `src/components/dashboard/CanonicalDashboardFrame.jsx`
- Modify: `src/components/dashboard/DashboardCanvas.jsx`
- Modify: `src/components/view/ViewShell.jsx`
- Modify: `src/components/build/BuildWorkspace.jsx`
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/styles/modes.css`
- Modify: `src/styles.css`
- Create: `tests/dashboardGeometryContract.test.js`
- Create: `tests/e2e/v3-shell-fidelity.spec.js`

**Interfaces:**

- Consumes: the same saved page, section order, placement order, chart renderer, and viewport in View and Build.
- Produces:

```jsx
<CanonicalDashboardFrame
  mode="view|build"
  pageId={activePage.id}
  dashboardHeader={ReactNode}
  pageContent={ReactNode}
  overlayLayer={ReactNode}
  footer={ReactNode}
/>
```

```js
export const WORKSPACE_VIEWPORTS = Object.freeze([
  { width: 768, height: 1024 }, { width: 1024, height: 768 },
  { width: 1200, height: 900 }, { width: 1440, height: 900 },
]);
export async function readCanonicalGeometry(page) {}
export function compareCanonicalGeometry(viewGeometry, buildGeometry) {}
// Returns [{ kind, id, view, build, delta: { x, y, width, height } }]
// Every delta property is Math.abs(view-build).toFixed(2).
```

Stable IDs are `data-canonical-page-id`, `data-canonical-canvas-id`, `data-canonical-grid-id`, `data-canonical-section-id`, `data-canonical-panel-id`, `data-canonical-placement-id`, and `data-canonical-plot-id`.

- [ ] **Write the failing geometry test.** For each viewport, navigate both modes to the same Biomedical fixture; require equal grid/section/panel/plot counts and IDs; assert every `x`, `y`, `width`, and `height` delta equals `"0.00"`.
- [ ] **Record current failure.** Run `pnpm exec playwright test tests/e2e/v3-shell-fidelity.spec.js --project=chromium --grep "exact View Build geometry"`. Expected: FAIL, including the observed 1200×900 workspace widths 1152 and 638.
- [ ] **Implement one canonical frame.** Route View and Build through `CanonicalDashboardFrame`; remove permanent Build columns from the canonical sizing calculation; add stable IDs at real elements.
- [ ] **Add mechanical unit coverage.** In `tests/dashboardGeometryContract.test.js`, assert `0`, `0.001`, and `0.004` format to `"0.00"`, while `0.005`, `0.009`, and greater values format non-zero and fail. This prevents a hidden tolerance.
- [ ] **Run passing geometry tests.** Run `node --test tests/dashboardGeometryContract.test.js`. Expected: PASS. Then run `pnpm exec playwright test tests/e2e/v3-shell-fidelity.spec.js --project=chromium --grep "exact View Build geometry"`. Expected: PASS at all four viewports with every recorded delta `0.00`.
- [ ] **Commit.** Run `git add src/components/dashboard/CanonicalDashboardFrame.jsx src/components/dashboard/DashboardCanvas.jsx src/components/view/ViewShell.jsx src/components/build/BuildWorkspace.jsx src/components/DashboardRenderer.jsx src/styles/modes.css src/styles.css tests/dashboardGeometryContract.test.js tests/e2e/v3-shell-fidelity.spec.js && git commit -m "feat(shell): enforce exact View Build geometry"`.

### Task S6-4: Propagate look, appearance, focus, and state treatment across named surfaces

**Files:**

- Modify: `src/components/dashboard-look/DashboardLookDrawer.jsx`
- Modify: `src/theme/dashboardLookDraft.js`
- Modify: `src/styles/dashboard-style-grammar.css`
- Modify: `src/styles/modes.css`
- Modify: `src/styles/presentation.css`
- Test: `tests/dashboardLookDrawer.test.js`
- Test: `tests/dashboardTheme.test.js`
- Modify: `tests/e2e/v3-shell-fidelity.spec.js`

**Interfaces:**

- Consumes: `createDashboardLookPreview(saved)`, resolved theme/style data attributes, canonical geometry reader from S6-3.
- Produces: unchanged scoped save callbacks `onSetDashboardLook`, `onSetChartColors`, `onSetAppearance`; portal root props `{ style, colorProfile, resolvedAppearance }`.

- [ ] **Write failing surface inheritance tests.** Assert drawer, crown, page/section headers, footer, dialog, source window, state plate, recovery rail, Present monitor/Sidecar, and Audience root consume shared component/style variables. Exact vertical owners are S6-4 for crown/drawer/footer/dialog/recovery, S7-17 for plot states, S7-18 for source window, S8-3 for Present, S8-4 for Audience projection, S8-6 for connection icons, and S8-7 for final Present/Audience calibration.
- [ ] **Run the failing tests.** Run `node --test tests/dashboardLookDrawer.test.js tests/dashboardTheme.test.js`. Expected: FAIL on missing portal/surface inheritance assertions while existing scoped-save behavior passes.
- [ ] **Implement inheritance.** Replace remaining literal surface values, pass resolved attributes into portal roots, keep the transparent undimmed click boundary, and preserve non-mutating preview/cancel.
- [ ] **Test geometry and phone sheet separately.** Run `pnpm exec playwright test tests/e2e/v3-shell-fidelity.spec.js --project=chromium --grep "look drawer preserves geometry|look drawer phone sheet"`. Expected: PASS.
- [ ] **Run passing unit tests.** Run `node --test tests/dashboardLookDrawer.test.js tests/dashboardTheme.test.js`. Expected: PASS.
- [ ] **Commit.** Run `git add src/components/dashboard-look/DashboardLookDrawer.jsx src/theme/dashboardLookDraft.js src/styles/dashboard-style-grammar.css src/styles/modes.css src/styles/presentation.css tests/dashboardLookDrawer.test.js tests/dashboardTheme.test.js tests/e2e/v3-shell-fidelity.spec.js && git commit -m "fix(theme): propagate V3 look across named surfaces"`.

### Task S6-5: Implement the best-effort phone banner without gating mode workspaces

**Files:**

- Create: `src/components/app-shell/PhoneModeNotice.jsx`
- Modify: `src/components/app-shell/AppFrame.jsx`
- Modify: `src/styles/modes.css`
- Test: `tests/viewCrown.test.js`
- Modify: `tests/e2e/v3-shell-fidelity.spec.js`

**Interfaces:**

- Consumes: current `mode`, `onModeRequest`, mounted `children`, and existing draft/mode state.
- Produces:

```jsx
<PhoneModeNotice
  mode="build|present"
  onSwitchToView={() => onModeRequest("view")}
/>
```

The component is a persistent, non-dismissible `role="status"` region before `.app-frame-bar`. It has no close action and no state mutation other than the explicit button callback.

- [ ] **Write failing markup tests.** Assert the exact Build/Present notice, one **Switch to View** action, no dismiss action, and that the corresponding workspace remains a descendant after the notice.
- [ ] **Run the failing unit test.** Run `node --test tests/viewCrown.test.js`. Expected: FAIL because current phone handling lacks the explicit mounted-workspace contract.
- [ ] **Implement the notice.** Render it with CSS media visibility below 768 px. Remove all `matchMedia` render gates, redirects, disabled fieldsets, and draft resets tied only to phone detection.
- [ ] **Write state-preservation E2E.** At 1200 px open a dirty chart draft and layout draft, resize to 390×844, assert both drafts and controls remain mounted/enabled, activate no notice action, resize back, and assert target/focus/scroll/drafts are unchanged. Separately activate **Switch to View** and assert the ordinary mode-resolution path runs.
- [ ] **Run passing phone tests.** Run `pnpm exec playwright test tests/e2e/v3-shell-fidelity.spec.js --project=chromium --grep "best-effort phone banner preserves state"`. Expected: PASS. Run `node --test tests/viewCrown.test.js`. Expected: PASS.
- [ ] **Commit.** Run `git add src/components/app-shell/PhoneModeNotice.jsx src/components/app-shell/AppFrame.jsx src/styles/modes.css tests/viewCrown.test.js tests/e2e/v3-shell-fidelity.spec.js && git commit -m "fix(shell): preserve best-effort phone modes"`.

### Task S6-6: Freeze dependency, Quorum, and canonical-runtime architecture boundaries

**Files:**

- Create: `scripts/check-v3-runtime-boundaries.mjs`
- Create: `tests/v3RuntimeBoundaries.test.js`
- Test: `tests/quorumCompanionProtocol.test.js`
- Test: `tests/quorumCatalogueV2.test.js`
- Modify: `package.json`

**Interfaces:**

- Consumes: `package.json`, Vite manifest/build inputs, `src/lib/quorumCompanionProtocol.js`, generated catalogue schema, canonical renderer registry.
- Produces:

```js
export function inspectRuntimeBoundaries({ packageJson, sourceFiles, publicFiles }) {
  return { remoteRuntimeDependencies, quorumContractHash, canonicalRendererEntrypoints };
}
```

and package script `check:v3-runtime-boundaries`.

- [ ] **Write failing architecture tests.** Assert zero required remote runtime dependencies, the existing Quorum protocol/schema hash is unchanged, Audience has no Quorum import, and every mode resolves charts through the canonical registry/renderer entrypoints.
- [ ] **Run the failing test.** Run `node --test tests/v3RuntimeBoundaries.test.js tests/quorumCompanionProtocol.test.js tests/quorumCatalogueV2.test.js`. Expected: FAIL because the inspector/script does not exist.
- [ ] **Implement the read-only inspector.** Parse imports/assets without generating files; fail with exact offending paths and fields; add `check:v3-runtime-boundaries`.
- [ ] **Run passing checks.** Run `pnpm run check:v3-runtime-boundaries`. Expected: exit 0. Run `node --test tests/v3RuntimeBoundaries.test.js tests/quorumCompanionProtocol.test.js tests/quorumCatalogueV2.test.js`. Expected: PASS.
- [ ] **Commit.** Run `git add scripts/check-v3-runtime-boundaries.mjs tests/v3RuntimeBoundaries.test.js tests/quorumCompanionProtocol.test.js tests/quorumCatalogueV2.test.js package.json && git commit -m "test(arch): freeze V3 runtime boundaries"`.

## Step 6 Completion Gate

- [ ] Run `node --test tests/dashboardTheme.test.js tests/dashboardVisualContract.test.js tests/dashboardCommandCrown.test.js tests/dashboardGeometryContract.test.js tests/dashboardLookDrawer.test.js tests/viewCrown.test.js tests/v3RuntimeBoundaries.test.js tests/quorumCompanionProtocol.test.js tests/quorumCatalogueV2.test.js`. Expected: PASS.
- [ ] Run `pnpm exec playwright test tests/e2e/v3-shell-fidelity.spec.js --project=chromium`. Expected: PASS.
- [ ] Confirm all four supported workspace viewports report `0.00` for canvas, grid, every section, every panel, and every plot delta.
- [ ] Confirm 390×844 keeps Build/Present mounted and operable beneath the banner and preserves dirty drafts across resize.
- [ ] Run `git diff --check`. Expected: no output and exit 0.
- [ ] Return Step 6 evidence to the V3 Design master task; do not infer master acceptance or start Step 7 without its workflow decision.
