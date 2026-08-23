# V3 Design Step 7 Build/View master-review submission

Date: 2026-08-22 (final Step 7 submission amended 2026-08-23)
Status: **ready for V3 Design master review**. This submission does not declare master acceptance; that decision remains with the master reviewer.

## 2026-08-23 provisional-review amendment (superseded by the final readiness amendment below)

The earlier submission overstated fidelity by treating several implemented engines, reduced compositions, and broad browser smokes as if they proved the accepted sketches. The controlling gap ledger and current status now live in `SKETCH-FIDELITY-MATRIX.md`.

Active Step 7 repair scope is Sketches 002, 003, 004, 007, 011, and 013–020. Sketches 005, 006, and 012 remain passing regression gates after their dedicated reconciliation. Sketches 001 and 008 are deferred Step 8 work; Sketch 009 is shared-shell evidence owned by Step 6. Sketch 010's later close-and-apply decision is recorded in the Step 7 plan, but that amendment does not waive its other unimplemented accepted controls.

Until every active Step 7 matrix row passes semantic, composition, and real-use checks:

- this submission must not be described as ready for master acceptance;
- prior test counts and screenshots are historical evidence only, not current completion evidence;
- Step 8 must not consume the reduced Scene or Audience date-position contracts;
- the final submission must distinguish engine implemented, UI implemented, and fidelity verified.

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

The original implementation range and evidence are retained for traceability, but Step 7 is not currently ready for V3 Design master review. A renewed submission requires every active row in `SKETCH-FIDELITY-MATRIX.md` to pass, the exact representative browser journeys to be exercised and inspected in the application, and the production build plus affected focused tests to pass. Master acceptance remains solely with the master review.

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

## Executable fidelity gate amendment

This 2026-08-23 amendment makes the accepted Sketch 005, 006, and 012 decisions executable. The controlling evidence is `CHRONO-SCENE-FIDELITY-MATRIX.md`; every binding row names its production owner, falsifying check, representative browser task, material states/viewports, evidence, status, and approved deviation.

- Semantic gate: `52` focused state/schema/transaction/restoration tests passed, `0` failed.
- Composition gate: production-integrated SSR checks cover the complete Chrono ledger/Review, three-stage full-width Scene editor, contained dates, Calendar/source controls, aligned Scene evidence, balanced canvases, insertion and Present actions, Unit Orbit, and read-first temporal content.
- Real-use gate: the independent `005-chrono-group-authoring`, `006-scene-authoring`, and `012-temporal-content` journeys passed. Desktop and tablet geometry were asserted, including no document-level horizontal overflow.
- Human visual gate: accepted winner Sketches 005, 006, and 012 and the live production surfaces were inspected side by side in the in-app browser. The later 2026-08-24 Scene amendment was also inspected: Stage 3 measured 807/807 px of its workspace with equal 396.5 px canvases and no sidebar. Evidence asserts studio containment, stage ownership, balanced canvases, target clearance, content/editor separation, and responsive stacking rather than screenshot existence alone.
- The browser comparison found and corrected one real runtime defect: Scene availability attempted to expand 146,080 repeated map rows. Temporal authoring now consumes a lossless 415-date-per-variable derivative, with a focused test proving repeated source rows collapse to one observation per timestamp and the shared time field is parsed once per source row.
- Production build after the correction: exit `0`; Vite transformed `823` modules. Existing mixed-import and large-chunk advisories remain non-failing diagnostics.

All matrix rows are Passing. This amendment submits the executable fidelity evidence for master review; it does not declare master acceptance.

## Final Step 7 readiness amendment — 2026-08-23

The provisional gate is closed. The controlling `SKETCH-FIDELITY-MATRIX.md` now reports all `16/16` active Step 7 rows Passing, with no active Missing or Partial row. Sketches 001 and 008 remain explicitly deferred to Step 8; shared/prior-step rows 009 and 010 retain their truthful cross-step status and do not reopen active Step 7 scope.

### Engine implemented

- Independent layout/chart draft coordination, restoration, temporal projection, Availability Ledger, Scene and Chrono transactions, chart creation and placement proofs, runtime artifacts, playback matching/availability/provenance, chart-state recovery, and direct source evidence are imported and exercised by production integration.
- The Step 6 persistence contract remains intact: live session changes survive storage failure, session-only persistence is stated honestly, quota exhaustion remains distinct, and persistence failure does not block closing Dashboard Look.

### UI implemented

- Build exposes the accepted progressive authoring surfaces, Chrono and Scene Studios/content/editors, Pages/Sections/Scenario containment, Unit Orbit, the exact six-stage New Chart workflow with persistent proof deck, and transactional recovery.
- View is authoring-free apart from the accepted empty-content recovery route into Build, retains Focus/Comparison/fullscreen/touch exploration, and implements Chrono groups/Scenes, real availability, proportional seek, numeric cadence, playback, provenance, and movable/resizable date overlay.
- Retired Build appearance controls were removed. Remaining Step 7 paint now derives from the selected style/profile, including loading, Collection controls/cards, Structure recovery, Scenario Passport, footer, tooltips, generated content, and SVG/chart projection.

### Fidelity verified

- Sketch 003 implementation commit: `5c52f9e`.
- Focused semantic/composition gate: `90` passed, `0` failed.
- Affected style/wizard browser gate: `24` passed, `0` failed, covering all Pages, all three native styles, every approved Light/Dark profile, Build studios, New Chart validation, Scenario Passport, Chrono, source viewer, and `390×844` View.
- Final production Vite build: exit `0`, `829` modules transformed. Existing mixed-import and large-chunk advisories are non-failing and unchanged in disposition.
- Human in-app inspection at `http://127.0.0.1:5197/` verified that the body-level tooltip uses the active Evidence Ledger profile, remains inside the viewport instead of clipping to its chart panel, and that loading paint is profile-derived. The live checkpoint remains available for reviewer inspection.

### Final boundary

Step 7 is submitted for V3 Design master review. Step 8 Present/Audience redesign, Step 9 final cross-mode UAT, and Step 10 documentation/project-skill handoff remain outside this submission. Master acceptance is not claimed here.

## Dashboard Look timing and required Scene-route correction — 2026-08-23

- Dashboard Look closes immediately as previously approved. Its selected Look is now adopted in serialized queue order before later dashboard mutations, while the 150 ms debounce and actual storage completion remain background work. Look persistence no longer republishes an older completion into the live dashboard.
- The previously disconnected Chrono Group content → Create Scene route now changes the production auxiliary owner to Scene Studio, carries the parent Chrono Group into the Scene draft, and exposes the required two-stage editor and Balanced Twin Canvas. Closing a dirty Scene now suspends it without locking navigation, advertises the unfinished draft, and resumes the same stage and canvases.
- Focused semantic/timing checks passed `16/16`; the exact `012-temporal-content` production-bundle journey passed `1/1`; the production build passed with `829` transformed modules.

The earlier endpoint-only evidence did not prove the required handoff and was insufficient. The amended browser journey now clicks that route directly. Master acceptance remains outside this correction.

## Interface organization and spacing audit amendment — 2026-08-23

The preceding “Final Step 7 readiness” statement is superseded. Step 7 is provisional again and is not currently submitted for master acceptance.

- Build commands moved from the former side panel to the canonical workspace area above the canvas. They are grouped into a primary Content/Time/Session rail and a separate Layout draft status/action rail.
- The remaining side panel is now **Dashboard map**, with explicit Structure and Inspector regions. Its obsolete Chrono Group detail/list section was removed.
- Chrono Group content now separates navigation, primary, and management actions. A live visual check found that the content grid was stretching short rows across the full studio height; `c8ba968` repairs that defect and its browser test asserts a bounded action-row height.
- The complete spacing/action/field audit is recorded in `docs/audits/2026-08-23-v3-interface-spacing-actions-fields/UI-REVIEW.md`.
- The audit found five active fidelity rows requiring repair: 003, 004, 007, 011, and 014. The controlling matrix now reports 11/16 active Step 7 rows Passing and 5/16 Partial.
- Present/Audience arrangement findings remain Step 8-owned and were not implemented here.

Focused browser evidence currently passing: Dashboard map/command composition `1/1`; Chrono/Scene content and authoring journey `1/1`. These passing slices do not override the open P1 findings or make Step 7 review-ready.
