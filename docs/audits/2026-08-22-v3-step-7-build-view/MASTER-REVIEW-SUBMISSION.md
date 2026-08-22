# V3 Design Step 7 Build/View master-review submission

Date: 2026-08-22
Status: submitted implementation evidence for V3 Design master review. This document does not accept Step 7.

## Review range and baseline

- Accepted Step 6 baseline: `7e58bf8`
- Implementation head before this submission record: `42e6a14`
- Branch: `codex/three-mode-dashboard-integration`
- Managed worktree: `C:\Users\hekma\Documents\Projects\SimEx\.worktrees\simex-dashboard-v2\three-mode-dashboard-design`
- Exact implementation range: `git diff 7e58bf8..42e6a14`

The Step 7 plan and reconciliation index were amended first to retire exact View/Build rectangle equality. The implemented contract keeps one canonical renderer, saved layout, responsive system, and maximum-width token; permits transient Build compression; bounds Build maximum width by View; preserves the selected target; restores Build selection, focus, scroll, and canvas context when chrome closes; and forbids authoring chrome from mutating saved layout merely by opening.

## Delivered scope

| Plan slice | Delivered outcome |
| --- | --- |
| S7-1–S7-4 | Independent layout and selected-chart drafts; progressive Build commands, Structure, Scenario, panel Unit Orbit, target usability, and close restoration. |
| S7-5–S7-9 | Temporal schema migration, frame ledger, matching and provenance, Needs-attention derivation, Chrono Studio, Scene schema and Studio, saved Scenes, Time Content library, copies, repair handoffs, and Build integration. |
| S7-10–S7-16 | One in-session chart draft and unload guard; destination and identity-based placement; catalogue, source/schema profiling, mapping and preparation; companion ownership; configuration and independent render/placement proofs; exact six-stage Review; serialized atomic create, reconciliation, and committed-only handoff recovery. |
| S7-17 | View Chrono sources, group/Scene scope, seeking, playback, cadence, availability/provenance, trace behavior, matching overrides, safety pause, mast/deck placement, and touch controls without Build-only chrome. |
| S7-18–S7-19 | Seven accessible plot states with retained plot bounds and deterministic recovery ownership; source drawer with metadata, CSV action, one-shot focus/scroll restoration; targeted five-viewport fidelity evidence. |

The Step 6 storage contract remains in force: the committed Step 7 state machines retain live changes after persistence failure, expose retryable session-only outcomes, and keep quota exhaustion distinct. No Step 8 Present/Audience redesign, Step 9 final cross-mode UAT, or Step 10 documentation/project-skill handoff was added.

## Commit ledger

The range contains 38 atomic commits, grouped as follows:

- Reconciliation: `b4ed257`.
- Build core: `2230088`, `4e44af3`, `18efd15`, `b8461cc`.
- Temporal authoring: `32913f6`, `28e43d8`, `aa9a81c`, `4e8cb99`, `602c498`, `f52f7a5`, `ea752a2`.
- Chart creation: `d9cd745`, `3245a63`, `b2c17b0`, `e986e05`, `5723479`, `49f5612`, `32c07f6`, `4b9ef5d`, `bd2ab44`.
- View Chrono: `d003f66`, `0c12e1e`, `1cd8ca5`, `cd232c4`, `42e6a14`.
- Plot/source completion: `4552080`, `82f9cc8`, `5382627`, `3486525`.
- Browser evidence: `92bfeee`, `ed8efd0`, `eacdfb7`, `9633e21`.
- Review corrections: `cf5945e`, `c8d0649`, `4e3da4a`, `6329785`, `cd232c4`, `42e6a14`.

## Changed-file ledger

The authoritative file list is `git diff --name-status 7e58bf8..42e6a14`: `112` files changed, with `15,669` insertions and `268` deletions. It comprises:

- Two amended plan/reconciliation documents.
- Shared integration changes in `src/App.jsx`, dashboard bundle/config structure, `DashboardRenderer`, `BuildWorkspace`, `ViewShell`, playback, chart rendering, temporal projection, schema registry, and the shared mode/style sheets.
- New Build engines and surfaces for draft coordination, restoration, panel editing, Structure, and Scenario.
- New temporal engines and surfaces for migration, schema, frames, matching/Needs-attention, Chrono Groups, Scenes, availability, and the Time Content library.
- New chart-creation engines for catalogue, draft session, unload guard, destination, placement, source/schema profiling, mapping/preparation, companion proposals, proof/review, atomic transaction, controller, and reconciliation.
- New `ChartStateSurface`, `SourceViewer`, and their dedicated styles; updated `ChartPanel`, panel actions, chart state boundary, and `ChartView` integration.
- Focused unit tests for every new engine/surface and five Step 7 Playwright specifications, plus the isolated chart-state browser harness.

All pre-existing unrelated dirty or untracked files were preserved and excluded from Step 7 commits. They remain visible in `git status`, including the Vanta/background work, icon documents, generated/public changes, and the pre-existing untracked presentation config and Scene familiarity plan.

## Verification evidence

- Expanded Step 7 focused Node gate: `313` passed, `0` failed, exit `0`.
- Final affected runtime suites after review correction: `56` passed, `0` failed, exit `0`; the page-scoped Group/Scene and cross-page Scene-navigation RED cases then passed `2/2` after implementation.
- Exact Step 7 Playwright gate across the five required specifications: `6` passed, `0` failed, exit `0`, in `1.2m`; the final corrected View Chrono flow also passed `1/1` on its focused rerun.
- Production build after the final correction: exit `0`; Vite transformed `806` modules and emitted the production bundle.
- Focused source/plot integration check: `14` passed, `0` failed.
- Focused playback/plot loader regression check: `49` passed, `0` failed.
- TDD RED evidence was recorded for each new behavioral engine/surface before its GREEN implementation, including missing-module REDs, policy/ownership refinement REDs, and the direct-Node loader regression found by the full completion suite.

The only build diagnostic is Vite's existing large-chunk advisory for the dashboard bundle; it is not a build failure and is outside Step 7's behavioral scope.

## Browser and visual evidence

- The five-viewport Playwright fidelity case exercised `390x844`, `768x1024`, `1024x768`, `1200x900`, and `1440x900`. Each viewport captured a rendered screenshot buffer and verified canonical panel identities, the shared maximum-width token, Build's width bound, and the phone Build notice with the Build workspace still mounted.
- The Build browser script opened transient authoring chrome, selected `bio_confirmed_cases`, opened its source drawer, verified source metadata and CSV access, closed it with focus return, and proved that saved storage and canonical section/panel identities were unchanged.
- The temporal browser script entered Time Content, handed off the saved national group to Chrono Studio, saved a renamed group, authored and saved a Scene, and verified both committed identities in storage.
- The chart browser script completed the exact six stages, suspended and resumed the in-session draft, created one chart transaction, and verified one committed chart identity.
- The View browser script exercised group-only scope, closest matching, full trace, availability information, seek/play/safety-pause, mast relocation, and phone touch-target sizing.
- Final in-app browser checkpoints on the committed live surface exercised View, opened the Biomedical Build workspace with the canonical canvas compressed beside Build commands/Structure, and returned to View Chrono. The final semantic inventory found one Chrono control surface, the labelled availability control, and zero Build workspace or chart-editor chrome in View.

## Review disposition

The completion code review initially identified five Important integration defects: exit protection for non-chart and suspended drafts; cosmetic rather than functional page/Group Chrono scope; ignored saved Scene frames; discarded reviewed chart placement; and temporal migration/Needs-attention engines disconnected from the live V3 schema. Corrective commits added executable regression cases and resolved each path. A second pass found the full-authority/page-projection split and Time Content refresh defects; these were corrected without narrowing dashboard-wide validation or losing library context. The final targeted pass found and then cleared the last current-page Group/Scene participation issue, including explicit cross-page Scene navigation. The reviewer reported no remaining blocker; master acceptance is still outside this review's authority.

## Remaining limitations and review boundary

- The production dashboard chunk remains above Vite's advisory threshold; no new runtime failure was observed.
- The worktree intentionally remains dirty because pre-existing user work was preserved exactly as requested. Step 7 commits are isolated from that material.
- This submission does not run or claim Step 9 final cross-mode UAT and does not perform Step 10 handoff documentation.
- This record requests V3 Design master review. Acceptance remains solely with the master review.

## Submission conclusion

The Step 7 implementation range, focused tests, production build, scripted browser flows, responsive screenshots, and live in-app checkpoints are ready for V3 Design master review. No master-acceptance claim is made here.

## Chrono authoring reconciliation amendment

This amendment records the approved 2026-08-22 reconciliation against Sketches 005, 006, and 012. It supplements the evidence above and does not change the master-review boundary.

- The retired Time Group domain was renamed directly to Chrono Group across the runtime schema, authored configuration, Quorum catalogue, tests, scripts, UI, and documentation. No saved-dashboard compatibility alias was retained because the product has no saved dashboards requiring migration.
- Chrono Studio now owns Create Chrono Group. Scene Studio now owns Create Scene. A Chrono Group content page is the second approved origin for Create Scene.
- Selecting a Chrono Group or Scene from its Studio opens a read-first content page. Edit opens the corresponding editor with the saved object populated; the Chrono Group content page also exposes Create Scene with its parent group preselected.
- Both editors collect the object name in their first stage. The ordinary `Stay` action was removed from the Chrono Group editor. The editors retain the approved availability, preview, validation, save, cancel, and recovery semantics.
- Build Structure routes Chrono Group selection into the same read-first content surface. The duplicate legacy inspector editor and legacy Layout controls were removed.
- Checkbox and radio inputs now use the shared normal-sized control rule instead of inheriting oversized text-input dimensions.
- Canonical dashboard state remains the only authored truth. Opening content or editor chrome does not mutate saved groups, Scenes, panels, or layout.

Focused evidence for this amendment:

- Terminology authority test: `1` passed, `0` failed; no retired group names or identifiers remain in source, tests, scripts, packaged configuration, or documentation.
- Focused Node authoring suite: `77` passed, `0` failed.
- Vite-backed Build integration suite: `24` passed, `0` failed.
- Production build at implementation commit `3f5933e`: exit `0`; Vite transformed `822` modules and emitted the production bundle. The only diagnostics were the existing mixed-import and large-chunk advisories.
- In-app browser checkpoint exercised Studio → content → editor for both object types, Chrono Group content → Create Scene, Build Structure → Chrono Group content, canonical date/cadence rendering, and `20px × 20px` checkbox dimensions.

Implementation commit: `3f5933e`. Master acceptance remains outside this implementation task.
