# V3 Dashboard Step 7: Build and View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Finish the authoring and viewing vertical slices while preserving the V3 content model, one canonical View/Build renderer and saved layout model, independent layout/chart drafts, and deterministic temporal and chart-creation behavior.

**Architecture:** `App.jsx` owns the mode and session entry points; `DashboardRenderer` remains the one dashboard renderer. Build decorates that renderer through explicit authoring state. Saved temporal content lives in the V3 dashboard bundle; ledgers, provenance, Needs-attention, drafts, and View playback remain derived or session state.

**Tech Stack:** React, JavaScript modules, Node test runner, React DOM test utilities, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-12-three-mode-dashboard-ui-spec.md`; `docs/superpowers/specs/2026-08-12-temporal-authoring-chrono-design.md`; `docs/superpowers/specs/2026-08-12-chart-creation-design.md`; `docs/superpowers/specs/2026-08-15-scene-authoring-familiarity-design.md`; `docs/superpowers/plans/2026-08-19-v3-dashboard-reconciliation-index.md`.

## 2026-08-23 Step 4 fidelity repair amendment

Step 7's previous master-review submission is provisional. A comparison against the complete approved Sketch 001–020 export found live-code and evidence gaps that invalidate a Step 7 completion claim until the active rows below pass all three gates in `docs/audits/2026-08-22-v3-step-7-build-view/SKETCH-FIDELITY-MATRIX.md`.

This amendment is corrective execution of accepted decisions, not a redesign. The accepted sketches remain authoritative subject only to later explicit user-approved amendments. Sketches 005, 006, and 012 were reconciled in the preceding slice and remain regression gates.

| Repair slice | Sketches | Current finding | Exit gate |
| --- | --- | --- | --- |
| R7-A — foundational correctness | 002, 015, 017, 019 | The dual-slot coordinator is not wired into the live app; Partial collapses to unavailable; zero-Page/zero-Section recovery cannot be reached. | Live UI exercises independent layout/chart drafts, Partial recovery, and zero-structure recovery. |
| R7-B — primary Build workflows | 004, 011, 013, 015, plus 005/006/012 regression | The Chart Wizard lacks its persistent proof deck; structural commands and Scenario Passport containment are incomplete; Context Shelf coordination is partial. | Semantic, composition, and browser-task checks pass for every affected sketch row. |
| R7-C — View runtime | 007, 014, 016, 018 | Chrono availability is hard-coded; cadence and seek position are reduced; the date overlay is absent; Collection and source-evidence journeys use the wrong containment. | Real per-chart evidence, numeric cadence, proportional rail, overlay suspension, header controls, and direct source viewer pass in the live app. |
| R7-D — visual-state audit | 003 | Existing retired-style checks do not cover hover portals, pseudo-elements, SVG/canvas paint, or complete interaction states. | The expanded deterministic scan and representative hover/focus browser checks find no unapproved retired style in Step 7 surfaces. |

Sketches 001 and 008 remain explicitly deferred to Step 8. Sketch 009 belongs to the accepted Step 6 shared shell and remains an evidence-quality row, not Step 7 production scope. Sketch 010 receives the amendment below; its unrelated Signature/provenance/scoped-action divergence is not silently treated as a Step 7 repair.

### Sketch 010 Dashboard Look deviation record

The later user-approved behavior supersedes the original cancel-on-Close rule: closing Dashboard Look, clicking outside it, or using root Escape closes immediately and applies the currently selected visual style and colour profile asynchronously. Persistence never blocks closing. A failed persistence attempt leaves the live selection usable and shows a short bottom-right warning identifying the failed colour-profile/style persistence. This amendment changes only the close boundary. It does not approve removal of Signature shortcuts, provenance, saved-versus-preview truth, chart-colour ownership, appearance ownership, or scoped Set actions.

### Build command header, Dashboard map, and interface-audit amendment

The later user-approved Build composition moves all primary Build commands into a grouped workspace header above the canonical canvas. The former Build side panel is renamed **Dashboard map** and owns only Structure and Inspector context; its obsolete Chrono Group detail/list section is removed. This changes authoring containment without changing dashboard content truth, saved layout ownership, or the canonical renderer.

The systematic spacing/action/field review is recorded in `docs/audits/2026-08-23-v3-interface-spacing-actions-fields/UI-REVIEW.md`. Its open P1 findings supersede any earlier Step 7 ready-for-review statement. The controlling matrix currently marks Sketches 003, 004, 007, 011, and 014 Partial; Step 7 remains provisional until those rows pass or receive explicit approved deviations.

### Repair execution rules

- Each repair is an atomic vertical slice with a RED live-behavior or production-integration check, minimal implementation, focused GREEN evidence, and a runnable in-app browser checkpoint.
- A pure reducer cannot close a composition or live-wiring row. Static markup cannot close a restoration or geometry row. Screenshot capture alone cannot close a visual-fidelity row.
- A row is Passing only when its semantic, composition, and real-use evidence are all present. Missing or Partial rows keep this Step 7 submission provisional.
- Step 8 must not build on Scene or Audience date-position assumptions until the active upstream rows pass.

## Global Constraints

- Execute after Step 6. Consume `DashboardMode`, `PhoneModeNotice`, `WORKSPACE_VIEWPORTS`, the canonical renderer and stable identity selectors, and the shared tokens/components defined there.
- Do not duplicate dashboard content or temporal state between View and Build shells. Build must render the same canonical page, section, panel, and plot nodes as View.
- View and Build use the same saved layout model, responsive rules, and maximum canvas-width token. Build's maximum canvas width must not exceed View's, and the same effective canvas width must receive the same responsive behavior.
- Transient Build authoring surfaces may compress or reposition the canvas. Exact cross-mode frame, panel, plot, grid, or rectangle equality is not required; automatic horizontal-scroll and zero-overlap are not acceptance requirements.
- The selected editing target must remain sufficiently visible and usable. Opening authoring chrome must not mutate saved panel sizes, order, placement, or layout. Closing transient authoring chrome must restore the previous Build canvas, selection, focus, and scroll state. Dashboard Look retains its accepted transient-compression exemption.
- Preserve the current V3 configuration entry point and existing valid tests. Migrate data explicitly; never reinterpret legacy timestamps silently.
- A dirty layout draft and a dirty selected-chart property draft may coexist. Only incompatible auxiliary authoring surfaces are parked.
- Persist one dashboard IANA timezone. Store timestamps as UTC instants. Do not persist ledgers, availability, provenance, Needs-attention, or View-session overrides.
- Every visual slice is complete only when its target checks pass; Step 9 remains the final cross-mode accessibility, keyboard, touch, and UAT gate.
- Task boundaries follow independently reviewable behavioral ownership; the explicit Chart type task is contract-driven, not a numerical task-count split.

---

### Task S7-1: Implement the dual-slot Build draft coordinator

**Files:**
- Create: `src/components/build/buildDraftCoordinator.js`
- Modify: `src/components/build/BuildWorkspace.jsx`
- Modify: `src/App.jsx`
- Create: `tests/buildDraftCoordinator.test.js`
- Create: `tests/e2e/v3-build-workspace.spec.js`

**Interfaces:**
- Consumes: `DashboardMode`; current selected chart, layout draft, focus target, and workspace scroll state.
- Produces:
```js
export function createBuildDraftCoordinatorState() {
  return {
    slots: { layout: null, chart: null },
    activeAuxiliary: null,
    parkedAuxiliaries: [],
  };
}
// DraftSlot = { draftId, kind: "layout"|"chart", targetId, status:
//   "clean"|"dirty"|"saving"|"error"|"suspended",
//   restoration: { focusId, scrollTop, targetId, suspensionReason }, resolution: null|"save"|"discard"|"stay" }
// AuxiliarySession = { surface: "structure"|"Chrono Group"|"scene"|"time-content"|"chart-create",
//   draftId, dirty, restoration }
export function reduceBuildDraftCoordinator(state, action) {}
```
```js
// BuildDraftAction =
// | { type:"OPEN_SLOT", slot:"layout"|"chart", draft:DraftSlot }
// | { type:"MARK_DIRTY", slot:"layout"|"chart" }
// | { type:"REQUEST_RESOLUTION", slots:("layout"|"chart")[], reason:string }
// | { type:"RESOLUTION_SUCCEEDED", slot, choice:"save"|"discard", savedValue?:unknown }
// | { type:"RESOLUTION_FAILED", slot, choice:"save"|"discard", error:{code,message,retryable} }
// | { type:"SUSPEND_SLOT"|"RESUME_SLOT", slot, restoration?:DraftSlot["restoration"] }
// | { type:"OPEN_AUXILIARY"|"PARK_AUXILIARY"|"RESUME_AUXILIARY", session:AuxiliarySession }
// | { type:"CLOSE_AUXILIARY", draftId:string, choice:"save"|"discard"|"stay" };
```

**Steps:**

- [x] **Write the failing test.** Add failing reducer tests proving layout and selected-chart slots can be dirty simultaneously; Save/Discard/Stay resolves each independently; failed Save keeps only its slot dirty; mode exit waits for both resolutions; read-only auxiliary surfaces may park; mutation-capable auxiliary surfaces request resolution when incompatible; parking never moves either approved slot; resume restores focus, scroll, target, and suspension reason deterministically.
- [x] **Run test to verify it fails.** Run `node --test tests/buildDraftCoordinator.test.js`; expect failures because the coordinator module does not exist.
- [x] **Write minimal implementation.** Implement the pure reducer, exhaustive unknown-action error, stable FIFO auxiliary parking, and `BuildWorkspace` bindings. Keep both slot editors mounted while compatible; do not overwrite one slot when the other opens.
- [x] **Add the E2E test.** Add the E2E case `layout and selected-chart drafts survive independent save discard stay and auxiliary parking`.
- [x] **Run tests to verify they pass.** Run `node --test tests/buildDraftCoordinator.test.js && pnpm exec playwright test tests/e2e/v3-build-workspace.spec.js --grep "layout and selected-chart drafts survive independent save discard stay and auxiliary parking"`; expect all selected checks to pass.
- [x] **Commit.** Run `git add src/components/build/buildDraftCoordinator.js src/components/build/BuildWorkspace.jsx src/App.jsx tests/buildDraftCoordinator.test.js tests/e2e/v3-build-workspace.spec.js && git commit -m "feat(build): coordinate independent layout and chart drafts"`.

### Task S7-2: Finish immersive View and Build editing chrome

**Files:**
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/components/build/BuildWorkspace.jsx`
- Modify: `src/styles.css`
- Create: `tests/buildWorkspaceV3.test.js`
- Modify: `tests/e2e/v3-build-workspace.spec.js`

**Interfaces:**
- Consumes: Step 6 crown, mode classes, stable canonical identity selectors, shared canvas-width/responsive rules, and S7-1 coordinator.
- Produces: canonical rendering in View and Build plus progressive edit handles, selected-chart property tray, focus-visible states, target usability, and deterministic canvas restoration.

**Steps:**

- [x] **Write the failing test.** Add failing component assertions that View and Build render the same canonical identities from the same saved layout, share maximum-width and effective-width responsive rules, opening authoring chrome does not mutate saved layout, and the selected panel remains sufficiently visible and usable while its tray is open.
- [x] **Run test to verify it fails.** Run `node --test tests/buildWorkspaceV3.test.js`; expect the new canvas-contract and restoration assertions to fail.
- [x] **Write minimal implementation.** Implement progressive authoring surfaces, apply approved shared tokens, and keep header, section, footer, panel, chart, and empty-state hierarchy intact while permitting transient canvas compression or repositioning.
- [x] **Write minimal implementation.** Add `Build authoring chrome preserves canonical content and restores canvas state` to the Build E2E file, covering selection, focus, scroll, target usability, and saved-layout immutability across open/close.
- [x] **Run tests to verify they pass.** Run `node --test tests/buildWorkspaceV3.test.js && pnpm exec playwright test tests/e2e/v3-build-workspace.spec.js --grep "Build authoring chrome preserves canonical content and restores canvas state"`; expect pass.
- [x] **Commit.** Run `git add src/components/DashboardRenderer.jsx src/components/build/BuildWorkspace.jsx src/styles.css tests/buildWorkspaceV3.test.js tests/e2e/v3-build-workspace.spec.js && git commit -m "fix(build): honor canonical canvas authoring contract"`.

### Task S7-3: Complete chart collection, Unit Orbit, and panel editing

**Files:**
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/components/build/BuildWorkspace.jsx`
- Modify: `src/styles.css`
- Create: `tests/panelEditingV3.test.js`
- Modify: `tests/e2e/v3-build-workspace.spec.js`

**Interfaces:**
- Consumes: `ChartCardV3`, chart identity, S7-1 chart slot, approved Sketches 002, 014, and 016.
- Produces: collection selection, Unit Orbit compatible filtering, property edits, validation, and recoverable Save/Discard/Stay.

**Steps:**

- [x] **Write the failing test.** Write failing tests for selected-card identity, compatible-unit filtering, empty/no-result distinction, validation errors, failed-save retry, and focus restoration.
- [x] **Run test to verify it fails.** Run `node --test tests/panelEditingV3.test.js`; expect failure because the contract is incomplete.
- [x] **Write minimal implementation.** Implement the collection/orbit/property flow using the chart draft slot and existing chart IDs; never create a second chart model.
- [x] **Add the E2E test.** Add E2E case `chart collection orbit and property editing preserve saved layout and restore the canvas`.
- [x] **Run tests to verify they pass.** Run `node --test tests/panelEditingV3.test.js && pnpm exec playwright test tests/e2e/v3-build-workspace.spec.js --grep "chart collection orbit and property editing preserve saved layout and restore the canvas"`; expect pass.
- [x] **Commit.** Run `git add src/components/DashboardRenderer.jsx src/components/build/BuildWorkspace.jsx src/styles.css tests/panelEditingV3.test.js tests/e2e/v3-build-workspace.spec.js && git commit -m "feat(build): complete panel editing and unit orbit"`.

### Task S7-4: Complete Structure and Scenario authoring

**Files:**
- Create: `src/components/build/StructureAuthoring.jsx`
- Create: `src/components/build/ScenarioAuthoring.jsx`
- Modify: `src/components/build/BuildWorkspace.jsx`
- Modify: `src/styles.css`
- Create: `tests/structureScenarioAuthoring.test.js`
- Modify: `tests/e2e/v3-build-workspace.spec.js`

**Interfaces:**
- Consumes: V3 page/section/panel schema, S7-1 auxiliary lifecycle, Sketches 011, 013, 015, and 020.
- Produces: validated reorder/add/remove/rename operations and Scenario editing without authoring-chrome mutation of the saved layout.

**Steps:**

- [x] **Write the failing test.** Add failing tests for stable IDs, forbidden orphaning, keyboard reorder, Save/Discard/Stay, conflict parking, validation/retry, and restoration.
- [x] **Run test to verify it fails.** Run `node --test tests/structureScenarioAuthoring.test.js`; expect missing-module failure.
- [x] **Write minimal implementation.** Implement schema-backed commands and overlay surfaces; apply mutations only after validation and an atomic coordinator success action.
- [x] **Add the E2E test.** Add E2E case `structure and scenario edits preserve saved layout and recover canvas state after failed save`.
- [x] **Run tests to verify they pass.** Run `node --test tests/structureScenarioAuthoring.test.js && pnpm exec playwright test tests/e2e/v3-build-workspace.spec.js --grep "structure and scenario edits preserve saved layout and recover canvas state after failed save"`; expect pass.
- [x] **Commit.** Run `git add src/components/build/StructureAuthoring.jsx src/components/build/ScenarioAuthoring.jsx src/components/build/BuildWorkspace.jsx src/styles.css tests/structureScenarioAuthoring.test.js tests/e2e/v3-build-workspace.spec.js && git commit -m "feat(build): add structure and scenario authoring"`.

### Task S7-5: Establish temporal schemas, UTC migration, ledgers, matching, and provenance

**Files:**
- Create: `src/charting/time/temporalSchema.js`
- Create: `src/charting/time/migrateTemporalConfig.js`
- Create: `src/charting/time/frameLedger.js`
- Modify: `src/charting/time/temporalMatch.js`
- Create: `src/charting/time/temporalNeedsAttention.js`
- Modify: `src/charting/config/dashboardBundleV3.js`
- Modify: `src/charting/config/dashboardConfigStructure.js`
- Create: `tests/temporalSchemaMigration.test.js`
- Create: `tests/frameLedger.test.js`
- Modify: `tests/temporalMatchingV3.test.js`
- Create: `tests/temporalNeedsAttention.test.js`

**Interfaces:**
- Consumes: chart observation instants, data-period metadata, schema revisions, and legacy temporal configuration.
- Produces:
```js
export function migrateDashboardTimezoneToUtc(bundle) {}
export function validateTemporalBundle(bundle) {}
export function buildDefaultChronoLedger({ pageCharts, period, timeZone }) {}
export function buildSceneFrameLedger({ scene, charts, timeZone }) {}
export function resolveMatchingPolicy({ groupDefault, memberFallback, sceneOverride, sessionOverride }) {}
export function matchTemporalObservation({ activeEpochMs, observations, policy, toleranceMs, interpolationAllowed }) {}
export function deriveTemporalNeedsAttention({ groups, scenes, charts, schemaRevisions }) {}
// MatchResult = { status: "concurrent"|"interpolated"|"snapped-latest"|
// "snapped-closest"|"missing"|"unavailable", observationEpochs: number[],
// signedOffsetMs: number|null, reason: string|null }
```

**Steps:**

- [x] **Write the failing test.** Add failing schema/migration tests: exactly one valid IANA `dashboard.timeZone`; missing legacy timezone is migrated explicitly to `UTC`; stored observations are UTC instants; post-migration validation rejects missing/invalid timezone; migration is idempotent and does not alter an explicit valid zone.
- [x] **Write the failing test.** Add failing ledger tests: Default Chrono is the sorted unique union of plotted-variable observations inside the period with no artificial boundaries; source frames support `all` and `selected`; missing selected frames derive Needs-attention; calendar frames require Scene start/end and a positive integer day/month/year interval, include start, shorten the final interval to end, treat days as 24 hours, use zone-calendar month/year arithmetic, clamp month-end, and handle Feb 29 in leap/non-leap years.
- [x] **Write the failing test.** Add failing matching tests for Concurrent only, Interpolate, Snap to Latest, Snap to Closest, closest ties choosing the earlier observation, precedence `group default -> member fallback -> Scene chart override -> View session override`, unsupported-policy reasons, interpolation only with numeric compatible observations on both sides and explicit permission, and prohibition of extrapolation.
- [x] **Write the failing test.** Add failing provenance tests for concurrent/interpolated/snapped/missing/unavailable, signed earlier/later offsets, mixed offsets, accessible `Mixed dates`, group cadence, Scene override, session-only View/Present cadence override, and Needs-attention derivation after group-period shortening, Scene clamp/edit consequences, missing charts/frames, or schema drift.
- [x] **Run test to verify it fails.** Run `node --test tests/temporalSchemaMigration.test.js tests/frameLedger.test.js tests/temporalMatchingV3.test.js tests/temporalNeedsAttention.test.js`; expect missing exports and the existing equidistant-nearest rejection assertion to fail.
- [x] **Write minimal implementation.** Implement pure functions. Never silently clamp a Scene after its group period shortens: return `{ consequence: "edit-or-clamp", affectedSceneIds }`; persist only a user-confirmed edit/clamp. Keep ledgers, provenance, and Needs-attention derived.
- [x] **Run tests to verify they pass.** Run `node --test tests/temporalSchemaMigration.test.js tests/frameLedger.test.js tests/temporalMatchingV3.test.js tests/temporalNeedsAttention.test.js`; expect all selected files to pass.
- [x] **Commit.** Run `git add src/charting/time/temporalSchema.js src/charting/time/migrateTemporalConfig.js src/charting/time/frameLedger.js src/charting/time/temporalMatch.js src/charting/time/temporalNeedsAttention.js src/charting/config/dashboardBundleV3.js src/charting/config/dashboardConfigStructure.js tests/temporalSchemaMigration.test.js tests/frameLedger.test.js tests/temporalMatchingV3.test.js tests/temporalNeedsAttention.test.js && git commit -m "feat(time): define temporal schema ledgers and matching"`.

### Task S7-6: Implement Chrono Studio and Availability Ledger

**Files:**
- Create: `src/components/time/ChronoGroupStudio.jsx`
- Create: `src/components/time/AvailabilityLedger.jsx`
- Create: `src/components/time/chronoGroupDraft.js`
- Modify: `src/components/build/BuildWorkspace.jsx`
- Modify: `src/styles.css`
- Create: `tests/chronoGroupStudio.test.js`
- Create: `tests/e2e/v3-temporal-authoring.spec.js`

**Interfaces:**
- Consumes: S7-5 validation, ledgers, matching policies, Needs-attention, S7-1 auxiliary lifecycle.
- Produces: `ChronoGroupDraft` with stages `period`, `charts`, `defaults`, `review`; saved group `{id,name,period,chartIds,defaultMatching,memberFallbacks,secondsPerFrame}`.

**Steps:**

- [x] **Write the failing test.** Add failing tests for stage validation, availability rows and non-colour status, zero-observation charts, member fallback, group cadence, shortening consequences, Save/Discard/Stay, failed save, and restored stage/focus/scroll.
- [x] **Run test to verify it fails.** Run `node --test tests/chronoGroupStudio.test.js`; expect missing-module failure.
- [x] **Write minimal implementation.** Implement the approved staged studio and ledger. Require an explicit edit-or-clamp choice for every affected Scene before group-period commit; derive Needs-attention until resolved.
- [x] **Add the E2E test.** Add E2E case `Chrono Studio exposes availability and resolves shortening consequences explicitly`.
- [x] **Run tests to verify they pass.** Run `node --test tests/chronoGroupStudio.test.js && pnpm exec playwright test tests/e2e/v3-temporal-authoring.spec.js --grep "Chrono Studio exposes availability and resolves shortening consequences explicitly"`; expect pass.
- [x] **Commit.** Run `git add src/components/time/ChronoGroupStudio.jsx src/components/time/AvailabilityLedger.jsx src/components/time/chronoGroupDraft.js src/components/build/BuildWorkspace.jsx src/styles.css tests/chronoGroupStudio.test.js tests/e2e/v3-temporal-authoring.spec.js && git commit -m "feat(time): implement Chrono Group studio"`.

### Task S7-7: Define the saved Scene contract, including Audience date position

**Files:**
- Create: `src/charting/time/sceneSchema.js`
- Modify: `src/charting/config/dashboardBundleV3.js`
- Modify: `src/charting/config/dashboardConfigStructure.js`
- Create: `tests/sceneSchema.test.js`
- Modify: `tests/dashboardBundleV3.test.js`

**Interfaces:**
- Consumes: S7-5 temporal types and saved Chrono Groups.
- Produces:
```js
// SavedScene = {
//   id, name, pageId, groupId, period: { start, end },
//   frames: { mode: "source", chartId, selection: "all"|"selected", selectedEpochs?: number[] }
//     | { mode: "calendar", interval: { value: number, unit: "day"|"month"|"year" } },
//   members: Array<{ chartId, width, matching?: string }>,
//   present: { chartIds: string[], layout: string }, secondsPerFrame?: number,
//   audience: { datePosition: { xPermille: number, yPermille: number, widthPermille: number } }
// }
export function validateScene(scene, context) {}
export function normalizeSceneDefaults(scene) {}
```

**Steps:**

- [x] **Write the failing test.** Add failing tests for all semantic fields, page/group subset rules, mandatory calendar bounds, source-frame validity, width/composition validation, matching/cadence override, exact persistence, dirty comparison, recovery serialization, and required `audience.datePosition` integer permille ranges before any presentation consumer exists.
- [x] **Run test to verify it fails.** Run `node --test tests/sceneSchema.test.js tests/dashboardBundleV3.test.js`; expect missing Scene schema/default field failures.
- [x] **Write minimal implementation.** Implement the validator/default migration and bundle support. The accepted two-stage Sketch 006 replaces only the five-stage interaction staging: every field, validation, persistence, dirty-state, and recovery requirement in the earlier Scene familiarity contract remains binding.
- [x] **Run tests to verify they pass.** Run `node --test tests/sceneSchema.test.js tests/dashboardBundleV3.test.js`; expect pass.
- [x] **Commit.** Run `git add src/charting/time/sceneSchema.js src/charting/config/dashboardBundleV3.js src/charting/config/dashboardConfigStructure.js tests/sceneSchema.test.js tests/dashboardBundleV3.test.js && git commit -m "feat(scene): define saved scene and audience date position"`.

### Task S7-8: Implement Scene Studio and Balanced Twin Canvas

**2026-08-24 approved amendment:** The persistent Scene Draft side panel becomes **Scene details** Stage 1. The former Select and Arrange stages become Stages 2 and 3. The active stage uses the full available editor width; Save readiness and Save/Discard remain in a non-width-reserving transaction footer. Validation routes to the owning stage. This supersedes only the two-stage/persistent-panel composition language below; the single Scene draft, ledger, Balanced Twin Canvas, restoration, and atomic-save requirements remain binding.

**Files:**
- Create: `src/components/time/SceneStudio.jsx`
- Create: `src/components/time/BalancedTwinCanvas.jsx`
- Create: `src/components/time/sceneDraft.js`
- Modify: `src/components/build/BuildWorkspace.jsx`
- Modify: `src/styles.css`
- Create: `tests/sceneStudio.test.js`
- Modify: `tests/e2e/v3-temporal-authoring.spec.js`

**Interfaces:**
- Consumes: S7-7 `SavedScene`, S7-5 ledgers, S7-1 auxiliary lifecycle, Sketch 006.
- Produces: `SceneDraft` with interaction stages `details`, `select`, and `arrange`; validated save result `SavedScene`.

**Steps:**

- [x] **Write the failing test.** Add failing tests proving all semantic settings remain editable across Scene details, Select, and Arrange; invalid/Needs-attention states route to their owning stage and block save; Stages 2–3 receive the full editor width; twin canvases remain balanced; focus/scroll/stage recover; and Save/Discard/Stay are deterministic.
- [x] **Run test to verify it fails.** Run `node --test tests/sceneStudio.test.js`; expect missing-module failure.
- [x] **Write minimal implementation.** Implement full-width Scene details for scope and shared settings, Select for membership/frame evidence, and Arrange for widths/composition. Preserve one draft and a non-width-reserving transaction footer across all three stages.
- [x] **Add the E2E test.** Add E2E case `006-scene-authoring amendment: three full-width stages and Unit Orbit are live`.
- [x] **Run tests to verify they pass.** Run focused Scene semantic/composition tests and the named production-bundle browser journey; expect pass and exact full-width stage geometry.
- [x] **Commit.** Run `git add src/components/time/SceneStudio.jsx src/components/time/BalancedTwinCanvas.jsx src/components/time/sceneDraft.js src/components/build/BuildWorkspace.jsx src/styles.css tests/sceneStudio.test.js tests/e2e/v3-temporal-authoring.spec.js && git commit -m "feat(scene): implement two-stage scene studio"`.

### Task S7-9: Implement the Time Content library and owner handoffs

**Files:**
- Create: `src/components/time/TimeContentLibrary.jsx`
- Create: `src/components/time/timeContentState.js`
- Modify: `src/components/build/BuildWorkspace.jsx`
- Modify: `src/styles.css`
- Create: `tests/timeContentLibrary.test.js`
- Modify: `tests/e2e/v3-temporal-authoring.spec.js`

**Interfaces:**
- Consumes: saved groups/scenes, S7-5 Needs-attention reasons, S7-6/S7-8 authoring entry points, S7-1 coordinator.
- Produces:
```js
// TimeContentState = { query, filter: "all"|"groups"|"scenes", grouping:
//   "ready"|"needs-attention", returnContext: { pageId, scrollTop, focusId, query, filter } }
export function reduceTimeContent(state, action) {}
export function ownerHandoff(item, intent, reason) {}
```
`ownerHandoff` maps group period/data-period issues to `Chrono Group:period`, membership/no-observation issues to `Chrono Group:charts`, matching/cadence issues to `Chrono Group:defaults`, group review/name to `Chrono Group:review`, Scene scope/frame issues to `scene:select`, and Scene composition/width/presentation issues to `scene:arrange`.

**Steps:**

- [x] **Write the failing test.** Add failing reducer/component tests for browse, search, type filter, Ready/Needs-attention grouping, create/edit/duplicate/remove/repair, exact handoffs, return Page/scroll/focus/query/filter, empty library versus no results, and failed operation recovery.
- [x] **Write the failing test.** Add failing conflict tests: a temporal draft requests independent Save/Discard/Stay before another mutating temporal surface opens; Stay cancels navigation. A running View/Present session uses an immutable snapshot and is never mutated, restarted, or discarded by library edits; save merely exposes `authored content changed` for a future explicit reload.
- [x] **Run test to verify it fails.** Run `node --test tests/timeContentLibrary.test.js`; expect missing-module failure.
- [x] **Write minimal implementation.** Implement the library and handoffs with accessible status text and approved cards/dialogs.
- [x] **Add the E2E test.** Add E2E case `Time Content repairs through its owning stage and restores library context`.
- [x] **Run tests to verify they pass.** Run `node --test tests/timeContentLibrary.test.js && pnpm exec playwright test tests/e2e/v3-temporal-authoring.spec.js --grep "Time Content repairs through its owning stage and restores library context"`; expect pass.
- [x] **Commit.** Run `git add src/components/time/TimeContentLibrary.jsx src/components/time/timeContentState.js src/components/build/BuildWorkspace.jsx src/styles.css tests/timeContentLibrary.test.js tests/e2e/v3-temporal-authoring.spec.js && git commit -m "feat(time): implement time content library"`.

### Task S7-10: Implement the application-session chart draft and exact six-stage reducer

**Files:**
- Modify: `src/charting/forms/wizardDraft.js`
- Create: `src/charting/forms/chartDraftSession.js`
- Create: `src/charting/forms/chartDraftUnloadGuard.js`
- Create: `tests/chartCreationState.test.js`
- Create: `tests/chartDraftSession.test.js`

**Interfaces:**
- Consumes: current V3 dashboard revision and S7-1 auxiliary lifecycle.
- Produces:
```js
export const CHART_CREATION_STAGES = Object.freeze([
  "destination",
  "chart-type",
  "data-source",
  "map-and-prepare-data",
  "configure-chart",
  "review-and-create",
]);
// Visible labels, in the same order: Destination; Chart type; Data source;
// Map and prepare data; Configure chart; Review and create.
// WizardState = { draftId, stage:CHART_CREATION_STAGES[number],
//   status:"editing"|"validating"|"committing"|"failed"|"ambiguous"|"committed",
//   destination, chartTypeId, source, profileRevision, mapping, preparation,
//   configuration, companions, renderProofRevision, placementProofRevision,
//   dashboardRevision, errors, suspension, handoff }
export function createWizardState(options = {}) {}
export function reduceWizardState(state, action) {}
export function createChartDraftSessionStore() {}
// => { get(dashboardId), start(dashboardId,state), suspend(dashboardId,restoration),
//      resume(dashboardId), replace(dashboardId,state), clear(dashboardId) }
export function isMeaningfulChartDraft(state) {}
export function installChartDraftUnloadGuard({ getDraft, window }) {}
```
```js
// WizardAction =
// | {type:"start", draftId, dashboardRevision} | {type:"suspend", restoration}
// | {type:"resume"} | {type:"setDestination", destination}
// | {type:"setChartType", chartTypeId, schemaRevision}
// | {type:"setSource", source} | {type:"profileSucceeded", profile}
// | {type:"profileDrifted", currentRevision} | {type:"setMapping", mapping}
// | {type:"setPreparation", preparation} | {type:"setConfiguration", configuration}
// | {type:"setCompanionOutcome", outcome} | {type:"reviseRenderProof", proof}
// | {type:"revisePlacementProof", proof} | {type:"setStage", stage}
// | {type:"back"} | {type:"revalidate", result}
// | {type:"commitStarted", transactionId} | {type:"commitResult", result}
// | {type:"reconciled", result} | {type:"discard"};
```

**Steps:**

- [x] **Write the failing test.** Add reducer tests for the exact six stages and labels in the exact order above, non-linear dependency-aware stage access, live stage status, compatible backtracking, meaningful/pristine detection, and non-cancellable `committing` state. Assert there is no `proof` stage.
- [x] **Write the failing test.** Add session-store tests proving one draft per dashboard survives Build-surface close, root Escape, and in-app mode/page/section navigation; suspend records `{stage,focusId,invokerId,scrollTop,targetId}`; resume restores the same in-memory object and last valid focus or falls back to the first issue/meaningful control.
- [x] **Write the failing test.** Add lifetime tests proving a fresh store after reload, tab restart, application restart, or new application session has no draft. Assert no serialization, hydration, stale-draft migration, `localStorage`, or `sessionStorage` API is exported or called.
- [x] **Write the failing test.** Add unload-guard tests proving only a meaningful draft registers `beforeunload`, only where the supplied platform supports it; the warning explains that the draft cannot resume after exit; a pristine, committed, discarded, or unsupported-platform draft does not warn.
- [x] **Run test to verify it fails.** Run `node --test tests/chartCreationState.test.js tests/chartDraftSession.test.js`; expect failures for the old four-stage reducer and absent session-store/lifetime interfaces.
- [x] **Write minimal implementation.** Extend `wizardDraft.js`, keep the store in application process memory only, suspend rather than clear on in-app closure/navigation, restore focus deterministically, and install a capability-checked meaningful-draft exit warning without simulating unsupported browser behavior.
- [x] **Run tests to verify they pass.** Run `node --test tests/chartCreationState.test.js tests/chartDraftSession.test.js`; expect pass with no persistent-storage calls and no seventh stage.
- [x] **Commit.** Run `git add src/charting/forms/wizardDraft.js src/charting/forms/chartDraftSession.js src/charting/forms/chartDraftUnloadGuard.js tests/chartCreationState.test.js tests/chartDraftSession.test.js && git commit -m "feat(chart-create): keep exact-stage draft in session memory"`.

### Task S7-11: Implement Destination and identity-based placement proof

**Files:**
- Create: `src/charting/forms/chartDestination.js`
- Create: `src/charting/forms/chartPlacement.js`
- Create: `tests/chartDestination.test.js`
- Create: `tests/chartPlacement.test.js`

**Interfaces:**
- Consumes: S7-10 `WizardState.destination`, V3 page/section/panel identities.
- Produces:
```js
export function resolveDestination({ pageId, sectionId, proposedStructure }, dashboard) {}
export function planIdentityPlacement({ destination, anchorChartId, position, chartId, presets }, dashboard) {}
// PlacementProofRevision = { revision, destinationRevision, status:"valid"|"invalid",
//   orderedText, affectedNeighbourIds, errors:Array<{code,message,retryable}> }
```

**Steps:**

- [x] **Write the failing test.** Add tests for editable destination defaults, minimum valid page/section proposals, missing/deleted/unsupported destinations, append or before/after identity placement, removed/cross-section anchors, concurrent order movement, duplicate chart identity, preset validation, empty destination, non-mutating reflow projection, and ordered nonvisual equivalence.
- [x] **Write the failing test.** Prove placement validation creates/updates `placementProofRevision` while leaving `renderProofRevision` unchanged and never writes dashboard geometry.
- [x] **Run test to verify it fails.** Run `node --test tests/chartDestination.test.js tests/chartPlacement.test.js`; expect missing-module failure.
- [x] **Write minimal implementation.** Resolve by stable identity, keep Destination continuously named, make append the default, retain invalid choices for Needs-attention explanation, and produce a placement proof rather than a wizard stage.
- [x] **Run tests to verify they pass.** Run `node --test tests/chartDestination.test.js tests/chartPlacement.test.js`; expect pass.
- [x] **Commit.** Run `git add src/charting/forms/chartDestination.js src/charting/forms/chartPlacement.js tests/chartDestination.test.js tests/chartPlacement.test.js && git commit -m "feat(chart-create): validate destination and placement proof"`.

### Task S7-12: Implement Chart type and the registry-authoritative catalogue

**Files:**
- Create: `src/charting/forms/chartCatalogue.js`
- Modify: `src/charting/schemas/chartSchemaRegistry.js`
- Modify: `src/components/chart-authoring/ChartTypePicker.jsx`
- Create: `tests/chartCatalogueSelection.test.js`
- Modify: `tests/chartSchemasV3.test.js`

**Interfaces:**
- Consumes: S7-10 `WizardState.chartTypeId`, the live V3 chart schema registry, and current schema revision.
- Produces:
```js
export function listChartTypeOptions({ registry, query, category, sourceProfile }) {}
// => Array<{ id,label,category,description,compatibility:"compatible"|"unknown"|"incompatible",reason }>
export function applyChartTypeSelection(state, { chartTypeId, schemaRevision }) {}
// => { state, retainedPaths:string[], removedPaths:string[], needsAttention:string[] }
```

**Steps:**

- [x] **Write the failing test.** Add catalogue tests for zero/one/many live registry entries, search/filter, current labels/categories/descriptions, unavailable/unsupported entries with reasons, keyboard selection, and no fixed count/order assumptions.
- [x] **Write the failing test.** Add selection tests for schema-revision pinning, compatible type changes retaining authored values, prospective named loss confirmation, stale type/schema Needs-attention, and automatic advance only after one unambiguous selection completes Chart type.
- [x] **Run test to verify it fails.** Run `node --test tests/chartCatalogueSelection.test.js tests/chartSchemasV3.test.js`; expect failures because the catalogue owner and compatibility ledger do not exist.
- [x] **Write minimal implementation.** Drive Chart type entirely from the live registry, keep type choice in the session draft, and invalidate only dependent source/mapping/configuration/proof state according to the returned ledger.
- [x] **Run tests to verify they pass.** Run `node --test tests/chartCatalogueSelection.test.js tests/chartSchemasV3.test.js`; expect pass.
- [x] **Commit.** Run `git add src/charting/forms/chartCatalogue.js src/charting/schemas/chartSchemaRegistry.js src/components/chart-authoring/ChartTypePicker.jsx tests/chartCatalogueSelection.test.js tests/chartSchemasV3.test.js && git commit -m "feat(chart-create): own chart type catalogue stage"`.

### Task S7-13: Implement Data source, geography profiling, and schema-drift handling

**Files:**
- Create: `src/charting/forms/sourceProfile.js`
- Create: `src/charting/forms/geographyProfile.js`
- Create: `src/charting/forms/schemaRevision.js`
- Create: `tests/chartSourceProfile.test.js`
- Create: `tests/chartSchemaRevision.test.js`

**Interfaces:**
- Consumes: S7-10 source state, S7-12 selected chart type, and existing dataset/geography adapters.
- Produces:
```js
// SourceProfileResult = { status:"ready"|"empty"|"partial"|"unavailable",
//   sourceId, schemaRevision, fields:Array<{id,type,unit,nullable}>,
//   timeCoverage:{start,end}|null, error:{code,message,retryable}|null }
// GeographyProfileResult = { status:"compatible"|"incompatible"|"unavailable",
//   geographyId, levels:string[], keyField:string|null, reason:string|null }
export function compareSchemaRevision(profileRevision, currentRevision) {}
// => { changed:boolean, currentRevision,
//      invalidates:("map-and-prepare-data"|"render-proof"|"placement-proof")[] }
```

**Steps:**

- [x] **Write the failing test.** Add tests for existing/CSV/manual source routes, authentication/availability, field types, units, time coverage, geography compatibility, provenance/limits, empty/partial data, retryable versus terminal errors, and stable revision hashes.
- [x] **Write the failing test.** Add source-change and drift tests that retain compatible work, name prospective loss, invalidate only dependent mapping/preparation/render or placement revisions, and never silently switch source.
- [x] **Run test to verify it fails.** Run `node --test tests/chartSourceProfile.test.js tests/chartSchemaRevision.test.js`; expect missing-module failure.
- [x] **Write minimal implementation.** Implement deterministic profiles and `{code,message,stage,retryable}` errors; keep shared-source repair routing for S7-14 rather than embedding a durable repair in the draft.
- [x] **Run tests to verify they pass.** Run `node --test tests/chartSourceProfile.test.js tests/chartSchemaRevision.test.js`; expect pass.
- [x] **Commit.** Run `git add src/charting/forms/sourceProfile.js src/charting/forms/geographyProfile.js src/charting/forms/schemaRevision.js tests/chartSourceProfile.test.js tests/chartSchemaRevision.test.js && git commit -m "feat(chart-create): profile data sources and schema drift"`.

### Task S7-14: Implement Map and prepare data with explicit linked-workflow ownership

**Files:**
- Create: `src/charting/forms/chartMapping.js`
- Create: `src/charting/forms/chartPreparation.js`
- Create: `src/charting/forms/companionProposal.js`
- Create: `src/charting/forms/linkedChartWorkflow.js`
- Create: `tests/chartMappingPreparation.test.js`
- Create: `tests/chartCompanionHandoffs.test.js`

**Interfaces:**
- Consumes: S7-13 profiles, S7-10 session store/suspension restoration, S7-6 Chrono Group authoring, and durable source/Time-Group repair commands.
- Produces:
```js
export function validateChartMapping({ chartTypeId, profile, mapping, preparation }) {}
// => { valid, effectiveOutputCount, value, errors, warnings }
// CompanionProposal = { ownership:"chart-create", kind:"new-Chrono Group"|"chart-fallback",
//   proposalId, value, referenced:boolean, meaningful:boolean }
// DurableRepairResult = { ownership:"source"|"saved-Chrono Group", objectId,
//   committedRevision, transactionId, result:"committed"|"cancelled"|"failed" }
export function suspendForLinkedWorkflow(state, { kind, invokerId, focusId, scrollTop }) {}
export function returnFromLinkedWorkflow(state, outcome) {}
// => { state, restoration:{invokerId,focusId,scrollTop}, revalidationRequired:true }
```

**Steps:**

- [x] **Write the failing test.** Add mapping/preparation tests for required roles/cardinality, compatible units/types/geography, explainable defaults, missing/duplicate transforms, effective-output blocking, time field, zero/multiple existing-Time-Group membership selection, and absence of chart-owned matching/fallback controls.
- [x] **Write the failing test.** Add uncommitted companion tests: new-Time-Group and chart-specific fallback links suspend without cloning/mutating the chart draft; cancel returns it unchanged; completion returns exactly one `ownership:"chart-create"` proposal; invoker/focus/scroll restore; revalidation runs; no saved object exists before atomic chart create.
- [x] **Write the failing test.** Add durable repair tests: shared-source or saved-Time-Group repair suspends the chart draft, commits through its own owner/transaction after consequence review, returns `DurableRepairResult`, restores invoker/focus/scroll, and revalidates against `committedRevision`. The repair never enters `companions`, and cancelling/discarding the chart never undoes it.
- [x] **Write the failing test.** Add conflict tests proving an uncommitted companion may be removed only with meaningful-work consequence handling, while a durable repair cannot be rolled back by chart actions; both paths retain the same chart draft identity and stage on return unless revalidation directs focus to a current issue.
- [x] **Run test to verify it fails.** Run `node --test tests/chartMappingPreparation.test.js tests/chartCompanionHandoffs.test.js`; expect missing-module failures for both ownership paths.
- [x] **Write minimal implementation.** Keep new-Time-Group/fallback proposals in the chart session draft for possible S7-16 inclusion; dispatch shared-source/saved-group repair to its existing durable owner, record only the returned dependency revision, and run one deterministic return/restoration/revalidation path.
- [x] **Run tests to verify they pass.** Run `node --test tests/chartMappingPreparation.test.js tests/chartCompanionHandoffs.test.js`; expect pass with no companion/durable-repair ownership crossover.
- [x] **Commit.** Run `git add src/charting/forms/chartMapping.js src/charting/forms/chartPreparation.js src/charting/forms/companionProposal.js src/charting/forms/linkedChartWorkflow.js tests/chartMappingPreparation.test.js tests/chartCompanionHandoffs.test.js && git commit -m "feat(chart-create): map data and separate companion ownership"`.

### Task S7-15: Implement Configure chart and independent render/placement validation

**Files:**
- Create: `src/charting/forms/chartConfiguration.js`
- Create: `src/charting/forms/chartProof.js`
- Modify: `src/components/chart-authoring/ChartWizardV3.jsx`
- Modify: `src/components/build/BuildWorkspace.jsx`
- Modify: `src/styles.css`
- Create: `tests/chartConfigurationProof.test.js`

**Interfaces:**
- Consumes: S7-11 `PlacementProofRevision`, S7-12 schema, S7-13 profile, and S7-14 mapped/prepared data.
- Produces:
```js
export function validateChartConfiguration({ schema, configuration }) {}
// => { valid, value, errors:Array<{code,message,retryable}>, warnings }
// RenderProofRevision = { revision, inputHash, status:"valid"|"invalid"|"pending",
//   rendererReadyCount, errors }
export function requestRenderProof({ draftRevision, chart, preparedData }) {}
export function deriveCreateProofState({ renderProofRevision, placementProofRevision, draft }) {}
// => { renderCurrent:boolean, placementCurrent:boolean, ready:boolean, reasons:string[] }
```

**Steps:**

- [x] **Write the failing test.** Add Configure chart tests for every schema-authorized current capability, safe defaults versus authored choices, accessibility labels, unsupported combinations, recoverable diagnostics, and dependency-scoped invalidation.
- [x] **Write the failing test.** Add proof tests that canonical render and non-mutating placement validations have independent revisions/status/diagnostics; either may fail or become stale without mutating the other; both must be current and passing for create readiness.
- [x] **Write the failing test.** Assert proofs are reachable validations inside the six-stage workflow—placement through Destination/context and render through Configure/preview—and that no `proof` stage, seventh stage, or proof-only navigation item exists.
- [x] **Run test to verify it fails.** Run `node --test tests/chartConfigurationProof.test.js`; expect failures for the old stage shell and absent independent-proof authority.
- [x] **Write minimal implementation.** Implement Configure chart and automatic revision-correlated render proof in the existing wizard; consume S7-11 placement proof; preserve last-good render diagnostically but never count it as current.
- [x] **Run tests to verify they pass.** Run `node --test tests/chartConfigurationProof.test.js`; expect pass with six stages and two independent validations.
- [x] **Commit.** Run `git add src/charting/forms/chartConfiguration.js src/charting/forms/chartProof.js src/components/chart-authoring/ChartWizardV3.jsx src/components/build/BuildWorkspace.jsx src/styles.css tests/chartConfigurationProof.test.js && git commit -m "feat(chart-create): configure chart and validate both proofs"`.

### Task S7-16: Implement Review and create, atomic ownership, reconciliation, and handoff

**Files:**
- Create: `src/charting/forms/chartReview.js`
- Create: `src/charting/forms/chartCreateTransaction.js`
- Create: `src/charting/forms/chartCreateReconciliation.js`
- Modify: `src/components/chart-authoring/ChartWizardV3.jsx`
- Create: `tests/chartCreateTransaction.test.js`
- Create: `tests/e2e/v3-chart-creation.spec.js`

**Interfaces:**
- Consumes: S7-10 in-memory draft, S7-11 placement proof, S7-12 type/schema revision, S7-13 source revision, S7-14 companion/durable-repair outcomes, and S7-15 render proof/configuration.
- Produces:
```js
export function revalidateChartCreate(state, currentDashboard) {}
// => { valid, errors:Array<{code,stage,message,retryable}>,
//      transactionCandidate:ChartCreateTransaction|null }
// ChartCreateTransaction = { transactionId, draftId, expectedDashboardRevision,
//   destinationIdentity, chartRecord, placementPatch,
//   companionProposals:Array<CompanionProposal> }
export async function commitChartCreate(transaction, { persist }) {}
// => {status:"committed",chartId,dashboardRevision,handoff}
//  | {status:"failed",error:{code,message,retryable}}
//  | {status:"ambiguous",transactionId,reconciliationKey}
export async function reconcileChartCreateOutcome(result, { readByTransactionId }) {}
```

**Steps:**

- [x] **Write the failing test.** Add Review tests listing exact destination/placement, chart type, source/profile/provenance, mapping/preparation, configuration, render proof, placement proof, memberships, uncommitted companion proposals, durable repairs as already committed dependencies, warnings, acknowledgements, and every repair link to one of the six owning stages.
- [x] **Write the failing test.** Add pre-write tests for dashboard/schema/source/destination/anchor/permission drift and both proof revisions. Assert a durable repair contributes only its committed dependency revision; only referenced `ownership:"chart-create"` proposals enter the chart transaction.
- [x] **Write the failing test.** Add transaction tests for one serialized non-cancellable atomic write, revision conflict, deterministic retryable/terminal failure, ambiguous outcome, reconcile-before-retry, transaction-ID duplicate prevention, chart plus referenced uncommitted companions atomically, and zero partial/orphan writes.
- [x] **Write the failing test.** Add handoff tests for committed chart identity, reviewed placement, full reveal, ordinary-editor focus, reversible prior scroll anchor, and durable-success recovery after reload. Explicitly assert that this post-commit recovery restores committed content/handoff only and never restores the cleared chart draft.
- [x] **Run test to verify it fails.** Run `node --test tests/chartCreateTransaction.test.js`; expect missing review/transaction/reconciliation interfaces.
- [x] **Write minimal implementation.** Keep Review and create as the sixth stage, disable Back/Cancel only after `commitStarted`, terminate the session draft only after discard or reconciled success, query ambiguity by transaction ID before retry, and navigate/focus from the durable committed handoff.
- [x] **Add the E2E test.** Add cases `exact six-stage chart workflow keeps proofs as validations`, `linked companion and durable repair return with correct ownership`, `meaningful chart draft warns on exit but is absent after reload`, and `ambiguous chart commit reconciles once and restores committed handoff`.
- [x] **Run tests to verify they pass.** Run `node --test tests/chartCreateTransaction.test.js && pnpm exec playwright test tests/e2e/v3-chart-creation.spec.js`; expect pass for all four named journeys.
- [x] **Commit.** Run `git add src/charting/forms/chartReview.js src/charting/forms/chartCreateTransaction.js src/charting/forms/chartCreateReconciliation.js src/components/chart-authoring/ChartWizardV3.jsx tests/chartCreateTransaction.test.js tests/e2e/v3-chart-creation.spec.js && git commit -m "feat(chart-create): review and commit chart atomically"`.

### Task S7-17: Fully implement View Chrono

**Files:**
- Modify: `src/components/playback/ChronoController.jsx`
- Modify: `src/charting/time/playbackReducer.js`
- Modify: `src/components/DashboardRenderer.jsx`
- Modify: `src/styles.css`
- Modify: `tests/viewChronoConvergence.test.js`
- Modify: `tests/playbackComponentsV3.test.js`
- Create: `tests/e2e/v3-view-chrono.spec.js`

**Interfaces:**
- Consumes: S7-5 ledgers/matching/provenance and saved groups/scenes.
- Produces:
```js
// ViewChronoState = { source:{kind:"default"|"group"|"scene",id:null|string},
// scope:"all-page"|"group-only", frameIndex, period, playing, secondsPerFrame,
// matchingOverride:"authored"|"concurrent"|"interpolate"|"latest"|"closest",
// traceMode:"reveal"|"full", availabilityVisible, placement:"deck"|"mast" }
export function reducePlaybackState(state, action) {}
```
```js
// PlaybackAction =
// | {type:"setGroup", groupId:string|null} | {type:"setScene", sceneId:string|null}
// | {type:"setScope", scope:"all-page"|"group-only"}
// | {type:"seek", index:number, clockLength:number} | {type:"previous"|"next"|"play", clockLength:number}
// | {type:"pause"} | {type:"tick", clockLength:number} | {type:"setSpeed", speed:number}
// | {type:"setMatchingOverride", policy:"authored"|"concurrent"|"interpolate"|"latest"|"closest"}
// | {type:"setTraceMode", mode:"reveal"|"full"} | {type:"toggleAvailability"}
// | {type:"moveController", placement:"deck"|"mast"}
// | {type:"navigate"|"documentHidden"|"modeExit"|"connectionLost"|"reconnected"|"end"}
// | {type:"blackout", active:boolean};
```

**Steps:**

- [x] **Write the failing test.** Add failing reducer tests for All page charts versus Group only, Default/Group/Scene frame/period context, direct seek, previous/next, **Use authored settings** plus a session matching override without persistence, Reveal to frame default, Full timeline marker, Scene-focused projection, and deck/mast movement preserving the same session and frame.
- [x] **Write the failing test.** Add failing playback tests for endpoint stopping and safety pause on seek, previous/next, group/Scene/scope/matching/trace changes, page navigation, document hidden, mode exit, blackout, connection loss, reconnect, and end; reduced motion prevents automatic play.
- [x] **Write the failing test.** Add failing component tests for availability overlay, per-chart colour association plus non-colour labels/patterns, signed/mixed provenance, disabled unavailable actions, and focus retention.
- [x] **Run test to verify it fails.** Run `node --test tests/viewChronoConvergence.test.js tests/playbackComponentsV3.test.js`; expect failures for absent scope, trace, availability, movement, and safety-pause state/actions.
- [x] **Write minimal implementation.** Implement the reducer/controller. Session matching and cadence overrides stay session-only. Scene focus projects its saved chart subset without replacing the page or mutating its saved canonical layout.
- [x] **Add the E2E test.** Add E2E case `View Chrono seeks scopes traces moves and safety-pauses without losing session`.
- [x] **Run tests to verify they pass.** Run `node --test tests/viewChronoConvergence.test.js tests/playbackComponentsV3.test.js && pnpm exec playwright test tests/e2e/v3-view-chrono.spec.js --grep "View Chrono seeks scopes traces moves and safety-pauses without losing session"`; expect pass.
- [x] **Commit.** Run `git add src/components/playback/ChronoController.jsx src/charting/time/playbackReducer.js src/components/DashboardRenderer.jsx src/styles.css tests/viewChronoConvergence.test.js tests/playbackComponentsV3.test.js tests/e2e/v3-view-chrono.spec.js && git commit -m "feat(view): implement complete chrono session"`.

### Task S7-18: Complete plot states and recovery surfaces

**Files:**
- Modify: `src/components/DashboardRenderer.jsx`
- Create: `src/components/ChartStateSurface.jsx`
- Modify: `src/styles.css`
- Create: `tests/chartStateSurface.test.js`
- Modify: `tests/e2e/v3-build-workspace.spec.js`

**Interfaces:**
- Consumes: chart render outcomes, temporal provenance, shared recovery components.
- Produces: distinct loading, empty, unavailable, stale, error, Needs-attention, and last-valid chart states with deterministic owner actions.

**Steps:**

- [x] **Write the failing test.** Add failing tests for every state, accessible status, retained dimensions, last-valid rendering, retry/repair destinations, and no colour-only status.
- [x] **Run test to verify it fails.** Run `node --test tests/chartStateSurface.test.js`; expect missing-module failure.
- [x] **Write minimal implementation.** Implement state overlays that retain the plot box and never replace the page grid.
- [x] **Add the E2E test.** Add E2E case `chart recovery states retain canonical plot geometry`.
- [x] **Run tests to verify they pass.** Run `node --test tests/chartStateSurface.test.js && pnpm exec playwright test tests/e2e/v3-build-workspace.spec.js --grep "chart recovery states retain canonical plot geometry"`; expect pass.
- [x] **Commit.** Run `git add src/components/DashboardRenderer.jsx src/components/ChartStateSurface.jsx src/styles.css tests/chartStateSurface.test.js tests/e2e/v3-build-workspace.spec.js && git commit -m "fix(charts): complete recovery state surfaces"`.

### Task S7-19: Complete source viewing and Step 7 targeted fidelity

**Files:**
- Modify: `src/components/DashboardRenderer.jsx`
- Create: `src/components/SourceViewer.jsx`
- Modify: `src/styles.css`
- Create: `tests/sourceViewer.test.js`
- Create: `tests/e2e/v3-step7-fidelity.spec.js`

**Interfaces:**
- Consumes: chart source metadata, shared dialog/drawer primitives, stable canonical identities, and the Build canvas restoration contract.
- Produces: source drawer/dialog, complete page/section/footer termination, and Step 7 visual acceptance evidence.

**Steps:**

- [x] **Write the failing test.** Add failing tests for source metadata, keyboard/focus return, unavailable source, loading/error recovery, saved-layout immutability, and restored Build canvas/selection/scroll state.
- [x] **Run test to verify it fails.** Run `node --test tests/sourceViewer.test.js`; expect missing-module failure.
- [x] **Write minimal implementation.** Implement the approved source viewer and calibrate Step 7-owned cards, headers, drawers, wizards, editor trays, Chrono, footer, typography, icons, spacing, overflow, and states.
- [x] **Write the failing test.** Add viewport cases at `390x844`, `768x1024`, `1024x768`, `1200x900`, and `1440x900`; the phone case verifies best-effort mounted Build plus the Step 6 banner, while supported viewports verify shared canonical identities, maximum-width and effective-width responsive rules, selected-target usability, saved-layout immutability, and close restoration. Exact cross-mode rectangles, zero overlap, and automatic horizontal-scroll prohibition are not asserted.
- [x] **Run tests to verify they pass.** Run `node --test tests/sourceViewer.test.js && pnpm exec playwright test tests/e2e/v3-step7-fidelity.spec.js`; expect pass with all canvas-contract, screenshot, and interaction assertions passing.
- [x] **Commit.** Run `git add src/components/DashboardRenderer.jsx src/components/SourceViewer.jsx src/styles.css tests/sourceViewer.test.js tests/e2e/v3-step7-fidelity.spec.js && git commit -m "fix(view-build): complete source and visual fidelity"`.

## Step 7 completion check

Run:

```bash
node --test tests/buildDraftCoordinator.test.js tests/buildWorkspaceV3.test.js tests/panelEditingV3.test.js tests/structureScenarioAuthoring.test.js tests/temporalSchemaMigration.test.js tests/frameLedger.test.js tests/temporalMatchingV3.test.js tests/temporalNeedsAttention.test.js tests/chronoGroupStudio.test.js tests/sceneSchema.test.js tests/dashboardBundleV3.test.js tests/sceneStudio.test.js tests/timeContentLibrary.test.js tests/chartCreationState.test.js tests/chartDraftSession.test.js tests/chartDestination.test.js tests/chartPlacement.test.js tests/chartCatalogueSelection.test.js tests/chartSchemasV3.test.js tests/chartSourceProfile.test.js tests/chartSchemaRevision.test.js tests/chartMappingPreparation.test.js tests/chartCompanionHandoffs.test.js tests/chartConfigurationProof.test.js tests/chartCreateTransaction.test.js tests/viewChronoConvergence.test.js tests/playbackComponentsV3.test.js tests/chartStateSurface.test.js tests/sourceViewer.test.js
pnpm exec playwright test tests/e2e/v3-build-workspace.spec.js tests/e2e/v3-temporal-authoring.spec.js tests/e2e/v3-chart-creation.spec.js tests/e2e/v3-view-chrono.spec.js tests/e2e/v3-step7-fidelity.spec.js
```

Expected: both commands exit `0`; View and Build use the same canonical renderer, saved layout, responsive rules, and maximum-width token; Build never exceeds View's maximum width; equivalent effective widths respond equivalently; authoring chrome leaves saved layout untouched and restores prior Build canvas/selection/focus/scroll state when closed; selected targets remain usable; phone Build stays mounted with drafts intact under the notice; all temporal and chart-creation recovery paths are deterministic; the chart workflow has exactly the six binding stages, in-session suspension resumes from memory, reload starts without a draft, linked companion and durable-repair ownership never cross, and both proof revisions remain independent validations.

## 2026-08-22 performance amendment evidence

The approved build-time derivative amendment is implemented in these atomic commits:

- `2fa9e82` — generated Biomedical map, aggregate, and latest-bubble derivatives from the unchanged authoritative 146,080-row municipal CSV;
- `cf94988` — cached temporal availability by row identity and data-affecting revision inputs while excluding presentation/layout changes;
- `2c02f33` — deferred Default Chrono construction and selected-group validation until playback opens;
- `ed53a04` — added versioned, immutable chart runtime artifacts, memory-first publication, IndexedDB persistence, distinct unavailable/quota outcomes, and compiled temporal projection; and
- `bdb44cc` — compiled artifacts at successful chart create/edit transaction boundaries and reused them in View rendering.

Generated derivative evidence:

- map timeline: 146,080 rows, 5,206,577 bytes;
- aggregate time series: 415 rows, 10,473 bytes;
- latest municipal bubble snapshot: 352 rows, 21,940 bytes; and
- authoritative source retained unchanged: 146,080 rows, 23,120,465 bytes.

Deterministic verification:

- `node scripts/build-biomedical-derivatives.mjs --check` passed;
- the focused derivative, default-dashboard, temporal cache, playback, artifact, rendering, and transaction command passed 107/107 tests;
- the authoring/runtime integration subset additionally passed 92/92 tests; and
- the production `pnpm build` passed with 819 transformed modules. The existing mixed static/dynamic `ChartFootprintPicker` advisory and large dashboard-chunk advisory remain non-blocking build warnings.

Live in-app browser checkpoint: [http://localhost:5177/](http://localhost:5177/).

- With Chrono closed, Home → Biomedical → Socio-economic → Biomedical transitions measured 395 ms, 390 ms, and 387 ms in the checkpoint session.
- The municipal choropleth rendered from the generated map derivative; hover exposed municipality `GM0303` and value `606.3775391623669` without a clipped tooltip.
- Municipal outbreak playback exposed exactly two participating charts and advanced from frame 1 (`2020-02-27`) to frame 3 (`2020-02-29`).
- The checkpoint reported no browser console warnings or errors and View contained no authoring chrome.

Remaining limitation: IndexedDB artifact preload is opportunistic rather than a blocking dashboard-start step. If durable artifact storage is unavailable or full, the committed chart and its in-memory artifact remain usable for the session and a bounded non-blocking warning is shown. This evidence submits the amendment for V3 Design master review; it does not declare master acceptance.

## 2026-08-23 Sketch 003 completion evidence

Implementation commit `5c52f9e` closes the final active Step 7 fidelity row.

- The expanded live audit traverses every dashboard Page and all Step 7 authoring/runtime surfaces, including generated content, body-level tooltip portals, SVG paint, active borders/outlines, approved typography, hover, focus, disabled, validation/error, loading, and supported phone View states.
- Production ECharts configuration remains the deterministic canvas-paint owner; its live imported integration projects selected profile text, axes, grid, tooltip, surface, and data colours and rejects hostile or legacy defaults.
- Retired loading shimmer, Collection header/card paint, Structure controls, empty-Section recovery, footer text, Scenario Passport actions, and the obsolete Build appearance controls were repaired or removed. The canonical recovery route from an empty View Section to Build remains intact.
- Geometry tests now encode the binding amendment: transient Build/Look chrome may compress or reposition the canvas, selected content must remain usable, and closing restores the exact prior frame. Exact drawer clearance and equal centered gutters while Look is open are not asserted.
- Focused semantic/composition checks passed `90/90`. The affected browser suite passed `24/24` across all Pages, three native styles, all 15 Light/Dark profiles, Build studios, New Chart validation, Scenario Passport, Chrono, source viewer, and `390×844` View.
- The production Vite build passed with `829` transformed modules. The existing mixed-import and large-chunk advisories remain non-failing diagnostics.
- In-app inspection at [http://127.0.0.1:5197/](http://127.0.0.1:5197/) verified the active-profile tooltip outside chart clipping, viewport containment, and profile-derived loading paint.

All S7-1 through S7-19 checklist items are now recorded complete. This plan submits Step 7 for V3 Design master review; it does not declare master acceptance.

## 2026-08-23 Dashboard Look timing and required Scene-route correction

Later live use exposed two integration gaps behind previously passing isolated endpoints:

- Dashboard Look used a 150 ms debounce, but completion time also included any older serialized save. A stale completion could republish its older Look into the live dashboard after the drawer had already closed. Closing now applies the selected Look immediately, queues that Look as the canonical base for all later dashboard mutations, and lets persistence finish without writing stale Look state back into the live runtime. Storage failure remains non-blocking and retains the existing bottom-right session-only warning.
- The accepted Chrono Group content → Create Scene origin changed temporal navigation state without changing the production auxiliary owner, so the click could remain in the Chrono shell. The live auxiliary now follows the canonical temporal studio state. Closing a dirty Scene suspends it, unlocks dashboard navigation, and exposes an Unfinished Scene draft action; resume restores the prior stage and both canvases. Returning from the editor restores the prior Chrono Group content context.

Executable correction evidence:

- Focused close/queue/state suite: `16` passed, `0` failed. It includes an older unresolved save followed by Look adoption and a Chrono mutation, proving both changes survive in queue order.
- Exact production-bundle browser journey `012-temporal-content`: `1` passed, `0` failed. It clicks Create Scene from Chrono Group content, verifies Scene Studio replaces Chrono Studio, verifies the parent Chrono Group is populated, enters Arrange, asserts both Balanced Twin Canvas boards, closes without locking navigation, and resumes the visible unfinished draft at the same stage.
- Production Vite build: exit `0`, `829` modules transformed; only the existing mixed-import and large-chunk advisories remain.

This is a corrective amendment to S7-8/S7-9 and Sketches 010/012. It does not claim master acceptance.

## 2026-08-24 truthful Scene composition amendment

- Scene Studio Stage 3 now renders actual configured charts in both the Scene View and Present canvases. The left canvas and active-Scene View share `SceneViewCompositionGrid`; the right canvas uses the production presentation-layout grammar through `DisplayedChartGrid`.
- Scene View order and four-column widths come from `scene.members` without mutating canonical Page/Section layout. The Present subset/order/layout comes from `scene.present` through one count-valid layout adapter.
- The latest valid authored Scene frame supplies deterministic preview time and per-chart matching contexts without starting playback or rebuilding invariant source data.
- Authoring overlays remain Stage 3-only. View and Present contain no Scene authoring controls.
- The selected Scene seeds Present's independent presentation runtime on first Present entry. It deliberately does not write into View's independent Focus/Comparison display state. Manual Present layout changes survive ordinary mode round trips; leaving and reselecting the Scene restores its saved composition.

Verification: the focused semantic/composition gate passed 107/107; the exact production-bundle `006-scene-authoring amendment` journey passed 1/1 in 39.7 seconds; the direct Vite production build passed with 836 modules transformed. In-app inspection at 1280×720 measured two equal 396.5 px Stage 3 canvases containing two actual chart roots each, confirmed the same chart IDs/widths in active-Scene View with no authoring overlay or comparison dialog, and confirmed the authored IDs/layout in Present.

This closes the truthful Scene composition amendment only. The broader Step 7 submission remains provisional because the separately recorded interface-audit Partial rows are still open. Master acceptance is not claimed.

## 2026-08-24 deterministic View Chrono source amendment

The accepted Sketch 007 source selector contains saved Chrono Groups and Scenes. The implementation had added a synthetic `Default page timeline` and could retain it when ready Groups arrived after the playback provider mounted. That source assigned playback contexts to every Page chart, moved them all into the top Chrono section, and rendered non-members as missing instead of preserving ordinary View.

The live provider now receives the first authored Chrono Group identity independently of readiness, waits for that exact Group, and adopts it when it becomes available. It does not choose whichever Group happens to load first. The controller no longer exposes the synthetic Page-wide source. All page charts remains a visibility choice: selected-Group members occupy the Chrono section while non-members retain their canonical Page sections and ordinary rendering.

Verification:

- focused playback and View composition checks passed `56/56`;
- the exact production-bundle View Chrono journey passed `1/1`;
- the direct Vite production build passed with `837` modules transformed; and
- in-app inspection at [http://127.0.0.1:5176/](http://127.0.0.1:5176/) showed Municipal outbreak playback selected on first open, exactly two participating charts, 21 ordinary panels below, and `bio_confirmed_cases` rendered with its normal plot and no empty/error state.

This is a corrective amendment to S7-17 and Sketches 007/014. Step 7 remains provisional and master acceptance is not claimed.

## 2026-08-24 interface-fidelity closure and master-review gate

Commit `e441e66` closes the remaining active Step 7 interface rows identified by the strict review gate. The live application now restores Build focus and scroll across phone fallback, exposes the phone-blocked reason, gives application controls a 44 px interaction contract, consolidates Page actions without removing their ownership, keeps Dashboard Map below visible Build command chrome while allowing it to rise as the Page header scrolls away, and keeps the View Chrono date overlay clear of the crown, dashboard header, and playback controller at the material tablet and phone states. Step 7 chrome now uses semantic dashboard tokens, including Finish Build and selected Dashboard Map regions.

Verification evidence:

- focused semantic and composition tests passed `21/21`;
- the affected browser gate passed `24/24`;
- all `17/17` relevant style/profile browser cases have passing evidence (`13/17` in the initial full run plus the corrected `4/4` cases);
- the exact View Chrono header-clearance journey passed `1/1`;
- the exact phone restoration journey passed `1/1`;
- the direct production build passed with `842` modules transformed; and
- in-app inspection confirmed the Build command header and Dashboard Map remain non-overlapping at the Page top, the Map rises to a 12 px viewport inset after scrolling, the full Map hierarchy and disclosure affordances remain usable, and the View Chrono overlay does not intersect its floating controller.

The active Step 7 fidelity matrix is now `16/16` Passing with no Missing or Partial row. This closes the provisional implementation gate and submits Step 7 for V3 Design master review. It does not claim master acceptance. Step 8 Present/Audience redesign, Step 9 final cross-mode UAT, and Step 10 documentation/project-skill handoff remain outside this submission.
