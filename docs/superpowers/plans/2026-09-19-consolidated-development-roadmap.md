# SimEx consolidated development roadmap — 19 September 2026

**Document version:** 1.0; dated Markdown with Git history, as requested. This is a plan version, not an application release.

**Goal:** Deliver an exercise tool whose prepare → run → debrief loop is dependable, faithful across surfaces, usable by exercise staff, and ready for an approved PDPC deployment.

**Architecture:** Retain the static/offline React application, shared View/Build renderer, native chart V3 contract, transactional package boundaries, and passive Audience output. Add faithful authoring geometry, an Audience-owned frame stream, one time cursor, and cross-page Storylines incrementally. Preserve the separately developed scenario-authoring tools and their source/provenance contracts.

**Stack:** React 19, Vite 6, JavaScript, ECharts 5, CSS tokens, BroadcastChannel, Node tests and Playwright. No new backend is assumed.

**Status:** Planning synthesis only. Product implementation, new test results, human acceptance, publication and deployment are not claimed by this document.

**Execution:** Implement coherent work packages with the repository's proportional workflow budget. Existing design documents already contain implementation detail; create an additional design only for a material unresolved contract. Task annotations below apply to their actions, deliverables and checks unless a sentence carries a more specific annotation. No agent roster or recurring monitor is created by this plan.

## 1. Baseline and answer to “do we have a plan?”

Yes, there are existing development plans, but they do not provide one current dashboard-to-deployment roadmap:

- The August V3 reconciliation index organizes Steps 6–9. Its acceptance record reports technical completion with deferred defects and historical human visual approval still pending. Later changes supersede parts of its UI and temporal design.
- The corrections sprint, dense desktop amendments, PDPC release factory, and September 18 decision-surface plan provide feature-specific plans. An unchecked historical checkbox is not evidence that the feature remains unimplemented.
- The scenario-authoring workstream has a current `DEVELOPMENT-PLAN.md` and `CURRENT.md`, updated September 10: scoped S-M1 and S-M2 complete, S-M3 engineering delivered but final facilitator review pending, S-M4–S-M6 still ahead.
- Repository `.planning/.continue-here.md` is an August 4 icon-design checkpoint. It is not a current product roadmap; the later icon atlas and implementation records supersede that historical pause.
- No `docs/ROADMAP.md` existed before this consolidation. It now points here rather than duplicating this plan.

### Git facts checked for this plan

| Item | Observed revision/status | Consequence |
| --- | --- | --- |
| Refreshed `origin/main` | `c003d11174f247acac10879274e73d9434c67096` | The latest local redesign is not on this remote branch at inspection. |
| Refreshed `public/main` | Same `c003d111` | The two published baselines agree. |
| Local `main` | `0e7e9e33`, “Merge View and Build decision surface”, 39 commits ahead | This is the available merged redesign assessed here. |
| Requested design cutoff | `0aab4b9e233560cb1538c9fa3bafcb2a227aa0ea` | Five September 19 design documents exist through this commit. They are unchanged in local merge `0e7e9e33`. |
| Scenario planning branch | `docs/aster-28-scenario-specs` at `37469185` | Later than the September 8 status snapshot; use its September 10 reconciliation. |
| Scenario candidate | `feat/m3-communication-candidate` at `91105ec3` | Distinct, unmerged work; do not assume its capabilities are on dashboard main. |

The supplied Claude worktree and local main contain the requested documents. No push, remote merge, deployment, or scenario-branch integration is included in preparing this plan. Before implementation, refresh published refs and explicitly establish a baseline that includes the redesign; do not silently start from stale local main or silently substitute the unmerged scenario candidate.

## 2. Sources and annotation key

- **[E…] Existing:** work, constraints or outstanding acceptance recorded before this consolidation.
- **[C…] Claude:** recommendations/designs from the five September 19 Claude/Fable documents. Inclusion in this roadmap does not imply an options paper had prior product approval.
- **[N] Added now by Codex:** a sequencing decision, conflict resolution, concrete acceptance check or risk closure introduced in this consolidation.
- Combined tags identify mixed provenance; attribution is not a claim that the work has been implemented.

### The five documents committed through `0aab4b9`

| ID / commit | Document | Actions and planning change |
| --- | --- | --- |
| C1 — `63c21658` | [Preview Fidelity: Chart Authoring Stage and Audience Monitor](../specs/2026-09-19-preview-fidelity-design.md) | True-size authoring stage, shared geometry, actual Audience snapshots, declared presentation resolution, responsive typography and rehearsal. Core becomes M1; fixture/build fixes move first into M0; optional improvements receive explicit dispositions below. |
| C2 — `2fcf5eb2` | [Mobile Experience: Options Assessment](../specs/2026-09-19-mobile-experience-options.md) | Adopt Option 1 as the planned minimum: split modes, defer View chart mounting, touch controls/gestures, phone typography, executable phone journey. Split-mode foundation is M0; remaining phone work is M3 after fidelity. Options 2–4 remain conditional backlog. |
| C3 — `f3bc728b` | [Chrono Groups and Scenes: Assessment and a Simpler Model](../specs/2026-09-19-time-groups-and-scenes-assessment.md) | Plan the recommended Storyline model: cross-page saved compare, chart-owned sync, derived coverage picker, one cursor, additive transition followed by dashboard format V7. M2 owns the shared model and migration. |
| C4 — `91976b2a` | [One Dashboard Time Cursor](../specs/2026-09-19-dashboard-time-cursor-design.md) | Live/At state, exercise time, scoped derived clocks, Time bar, scrubber, stamps/chips, Present/Audience propagation and Build authoring. Consolidated with C3 in M2, avoiding two competing playback implementations. |
| C5 — `0aab4b9e` | [Direction, Planning, and Deployment Readiness](../specs/2026-09-19-direction-and-deployment-readiness.md) | Prepare/run/debrief focus; stable fixtures/builds/CI; lighter roadmap, demos and versions; rehearsal and operational release readiness. Supplies M0 and the four delivery milestones M1–M4. |

The September 18 [View and Build decision-surface design](../specs/2026-09-18-view-build-decision-surface-design.md) is an additional, preceding design, not one of those five. Its implementation is already in the local merge.

### Existing sources carried forward

| ID | Source | Relevant carryover |
| --- | --- | --- |
| E1 | [V3 reconciliation index](2026-08-19-v3-dashboard-reconciliation-index.md) and [Step 9 final acceptance](../../audits/2026-08-28-v3-step-9-final-acceptance/FINAL-ACCEPTANCE.md) | Stale browser drivers, ambiguous Build locators, secondary theme leaks, import timing and liveness-fixture debt; acceptance history, recovery and passive Audience invariants. |
| E2 | [Corrections sprint revision 2](../../../../docs/superpowers/plans/2026-08-29-simex-dashboard-corrections-sprint-v2.md) and [accepted corrections](../../../../docs/CORRECTIONS-SPRINT-REFERENCE.md) | Scoped drafts, resumable work, rich QMD and media preservation, source management, Dashboard Map, theme propagation and operation-status behavior. Carry unmet behavior, not the whole sprint again. |
| E3 | [Cross-style/Audience plan](2026-09-02-cross-style-audit-audience-distance.md), [region-coverage amendment](2026-09-02-ledger-material-audit-region-coverage.md), [current review status](../../audits/2026-09-02-dense-desktop-redesign/FINAL-UI-REVIEW.md) | Deterministic implementation recorded; rendered cross-style/owned-region and enlarged Audience evidence explicitly pending. Historical matrices cover three styles; current product has four including PDPC. |
| E4 | [Decision-surface plan](2026-09-18-view-build-decision-surface.md), [browser gate ledger](../../gates/2026-09-19-decision-surface-premerge/e2e-ledger.md), [repair ledger](../../gates/2026-09-19-decision-surface-premerge/regression-fixes-ledger.md) | Local redesign and seven regression repairs delivered; wider test debt remains. |
| E5 | [Scenario CURRENT](../../../.worktrees/aster-28-scenario-specs/docs/scenario-development/handoff-2026-09-08/CURRENT.md), [development plan](../../../.worktrees/aster-28-scenario-specs/docs/scenario-development/handoff-2026-09-08/DEVELOPMENT-PLAN.md), [S-M3 brief](../../../.worktrees/aster-28-scenario-specs/docs/scenario-development/handoff-2026-09-08/MILESTONE-M3.md) | Separate scenario milestones and human content authority. These local worktree links are intentional; the records are not on main. |
| E6 | [PDPC release factory guide](../../pdpc-release-factory.md) and [implementation plan](2026-09-05-pdpc-two-output-release-factory.md) | Reuse existing full/participant release machinery, isolation and versioned artifacts. |
| E7 | [Project instructions](../../../AGENTS.md) and [environment issues](../../ENVIRONMENT-ISSUES.md) | Stable chart-workflow driver follow-up, targeted development checks, browser prerequisites, explicit publication authority. |
| E8 | [September 18 product brief](../../../../docs/simex-product-and-ui-ux-brief-2026-09-18.md) | Updated mode/width, four-style, draft, package and scenario-workstream context. |

The external workspace documents and scenario worktree records retain their existing owners. This consolidation indexes their obligations without rewriting those records or taking over their tasks.

## 3. Reconciled status and boundaries

| Work | Disposition | Destination |
| --- | --- | --- |
| Decision surface: attention sections/drills, page-time context, Build rails/menu groups, mobile crown | Implemented in local merge; preserve and evolve | M0 regression protection; M2 replaces time controls deliberately. [E4] |
| Seven redesign candidate regressions | Repair ledger records all seven passing; do not reimplement | Preserve targeted evidence unless affected code changes. [E4] |
| Broader unit/browser gate | Open | M0. Saved unit XML contains 2,450 cases and 53 failures. Initial browser ledger has source 112 pass/154 fail; static 3 not run and PDPC 2 not run. Later repair selection is 19 pass/11 fail, not a new whole-suite result. [E4] |
| “Fixture drift” classifications | Hypotheses requiring per-boundary diagnosis | Do not assume every old failure is harmless or has the same cause at base. [E4, N] |
| August Step 9 debt | Historical carryover, verify relevance before repair | Drivers/import/liveness in M0; affected themes and visual/human acceptance in M1/M3. [E1] |
| COR-01–33 and old static-content hold list | Existing behavior/constraints; hold list says gate satisfied | Repair only proven gaps in current source; no wholesale replay of these plans. [E2, N] |
| Cross-style/owned-region rendered closure | Explicitly pending in latest review document | M1 affected fidelity surfaces; M3 current-scope rendered closure and room evidence. [E3] |
| Shared chart-workflow driver | Explicit deferred follow-up | Extract/update with relevant M0 fixture repair or M1 authoring slice; preserve stable workflow IDs. [E7] |
| PDPC release factory | Implemented foundation | Reuse for M4; revalidate only changed release boundaries. [E6] |
| Scenario S-M1/S-M2 | Scoped complete, unmerged | Retain; no repeat implementation. [E5] |
| Scenario S-M3 | Engineering A–D delivered, human E pending | Facilitator review and bounded correction now; supply accepted M3 rehearsal content. [E5] |
| Scenario S-M4/S-M5/S-M6 | Planned, not completed or launched here | Detailed retained track in section 9; coordinate with dashboard M3/M4. [E5] |

The environment register records a package browser test passing from normal PowerShell after setup. That resolves that specific environment incident, not every source/static/PDPC gate. Likewise, C5's fresh-clone build failure is a recorded concern, supported by uploaded GeoJSON descriptors and the portable-builder disk-read path; this planning task has not rerun the builds.

### Material reconciliations

1. **Milestone count. [C5, N]** Keep M0 as prerequisite and M1–M4 as the four delivery milestones. Do not drop stabilization to force a four-row total.
2. **Small screens. [E3, E8, C2, N]** Build/Present remain mounted with the existing width recommendation; they are not phone-first deliverables. Do not introduce a hard 1024px gate. View alone receives the phone optimization work.
3. **Versions. [E7, C3, C5, N]** Application SemVer, dashboard/config and bundle format versions, native chart V3, and scenario observation-format v2 are separate. Keep the existing numeric serialization conventions; V7 removes Groups only at the explicit migration step. Never add chart-v2 compatibility.
4. **Geometry. [E4, C1, N]** C1's 1392px canvas and footprint numbers describe a canonical layout. The new persistent Build rails can reduce the real canvas. Resolve actual renderer geometry and device preference, then reuse it; do not impose maximum-width arithmetic on a narrower destination or use transform-altered dimensions as layout inputs.
5. **Phone preview. [C1, C2, N]** M1 provides desktop/tablet geometry and an honest phone limitation. C2's full phone geometry/disposition editor belongs to Option 2; Option 1 alone does not imply it exists.
6. **Playback. [C3, C4, N]** C4's exercise-clock definition of Live refines C3's simpler “latest” description. Implement one reducer/provider, not independent Storyline and time-cursor clocks.
7. **Fidelity proof. [C1, N]** Runtime canvas hashes are optional backlog. Required checks compare stable geometry and rendered results under controlled fonts/data/motion. Do not make cross-browser byte-identical PNG strings the only proof of correctness or claim html2canvas is an operating-system screen capture.
8. **Process. [E7, C5, N]** One roadmap, existing designs, targeted checks, one coherent implementation commit including its direct tests/evidence. No automatic per-subtask audit, extra plan, reviewer, or full-suite run. Future parallel work needs concrete independent ownership; this roadmap does not prescribe standing lanes.

## 4. Milestone sequence and common delivery rules

| Milestone | Outcome | Dependency | Current state |
| --- | --- | --- | --- |
| M0 Stable ground | Reliable source, tests, builds and recoverable startup | Baseline resolved | Open; first engineering priority |
| M1 Fidelity | Authoring and monitor accurately represent their destinations | M0 core fixture/build recovery | Designed, not implemented |
| M2 Time and story | One visible cursor and reusable cross-page Storylines | M1 geometry/monitor contracts | Designed; additive transition before V7 |
| M3 Exercise rehearsal | Staff can prepare/run/debrief on actual devices | M1/M2; accepted exercise content | Pending; includes remaining mobile Option 1 |
| M4 Deployment readiness | Governed, supportable release and real pilot | M3 blockers closed | Pending |

Code splitting belongs in M0; remaining mobile changes follow M1. Scenario S-M3 review can proceed independently now. Accepted scenario content must exist before the full M3 rehearsal, but a four-model evaluation is not automatically a prerequisite for testing the dashboard with an existing accepted package.

**Verification discipline [E7, C5]:** add durable regressions for changed product behavior/concrete defects. Use nearest owner checks while changing code; run the complete task-specific selection once on the final candidate. Preflight fixtures, source IDs, controls and environment before browser work. Isolate setup after two failures. Repeat only invalidated checks. At explicitly declared integration/pre-merge/milestone-release gates, run required full checks once and preserve native results outside Playwright's cleared `test-results` directory. Do not call a subset a complete gate.

**Demo and versioning [C5, N]:** each milestone ends with a short demonstration to an exercise practitioner and actionable notes under `docs/demos/`. Keep application releases at `0.x` until the pilot qualifies 1.0; add user-facing `CHANGELOG.md` entries and tagged releases at actual release boundaries. The package keeps its own schema version. Human review, deployment authority, branding decisions and real exercises are dependencies, not results an agent can manufacture.

## 5. M0 — Stable ground

**Purpose:** establish a trustworthy development and verification baseline before changing fidelity or time behavior. **Owner responsibility:** repository/runtime foundations; no scenario content decisions.

### Ordered work packages

- [ ] **M0.1 — Resolve the implementation baseline and protect authored content. [E4, E7, N]** Record the refreshed remote SHAs and the local redesign boundary; establish an authorized implementation branch containing the redesign before feature work. Preserve the existing scenario branches and any browser-authored package. Promote browser exports only through the existing reviewed bundle-baseline workflow. The current local/remote mismatch must be explicit in release and handoff records; publishing remains a separate action.
  - Owners/files: `AGENTS.md` baseline policy; `public/config/dashboard.json`; bundle promotion tools only if an actual export exists.
  - Check: Git ancestry, clean/dirty inventory and artifact identity; no full test run just to create a worktree.

- [ ] **M0.2 — Establish current-content fixtures and repair test consumers. [C1, C5, E1, E4, E7]** Commit a small representative fixture under `tests/fixtures/` derived from the shipped content, including temporal and static charts, editable QMD/media, real source descriptors and presentation-eligible content. Load it through the existing test harness; keep a separate smoke of the actual shipped dashboard. Inventory the 53 recorded unit failures and source-browser failures by exact title, including not-run suites. Replace stale IDs/navigation assumptions with the shared workflow driver and stable IDs; delete a test only when its product contract is retired and the reason is recorded. Fix a real defect when it emerges rather than weakening the assertion.
  - Owners/files: `tests/fixtures/`; `tests/e2e/support/`; affected `tests/*.test.js` and `tests/e2e/*.spec.js`; three Playwright configurations. Extract the existing `chart-authoring-v3` primitives when repairing their consumers.
  - Acceptance cases: reset loads intended fixture; source eligibility/control preflight succeeds; real shipped content still launches; unknown/missing source produces the existing recoverable state.
  - Carryovers: stale Home/map/reload drivers, unscoped Build selectors, sticky-crown control interception, source-manager selection loss, and named theme failures are investigated by current cause. Import performance and the synthetic liveness fixture get boundary-specific checks rather than arbitrary timeout increases.

- [ ] **M0.3 — Repair portable source resolution and fresh-clone commands. [C1, C5, E6, N]** Make uploaded GeoJSON source descriptors resolve through the canonical packaged/promoted asset contract instead of assuming browser storage or a nonexistent disk path. Preserve validation and offline portability. Cover missing and malformed assets with actionable errors; do not “fix” offline builds by globally turning embedding off. Verify Windows and Linux script paths; the current Cloudflare scripts are platform-specific.
  - Owners/files: `scripts/build-portable-data.mjs`; source descriptor/loading and bundle-promotion owners as needed; `public/data/uploaded/`; `package.json`; directly affected portable-data tests.
  - Exit evidence: fresh checkout with locked dependencies can start `pnpm.cmd dev`, produce `pnpm.cmd build` and `pnpm.cmd build:cloudflare` on Windows; CI uses `pnpm build:cloudflare:linux` on Ubuntu. Inspect output assets, then use the existing static verifier/browser configuration for offline checks.

- [ ] **M0.4 — Split non-View surfaces and preserve offline lazy loading. [C2, C5, E6, N]** Lazily load Build/Present, chart editors/wizard, source workspace and studios behind mode-appropriate pending/error states. Keep the Audience launch path prompt. Confirm generated lazy chunks are included in the finalized transitive service-worker graph, so switching to Build/Present offline still works after installation.
  - Owners/files: `src/App.jsx`, `src/components/DashboardRenderer.jsx`, relevant dynamic entry points, `vite.config.js`, static finalization/precache scripts.
  - Check built dependency/request graphs, not only a regex matching `React.lazy`. Record both the compressed View entry and total initial JS; ECharts/shared dependencies count in the latter.
  - **Added acceptance proposal [N]:** cap the compressed View entry at 250 KiB and require at least a 30% reduction in total initial View JS versus M0 baseline. If measurements show the retained rendering architecture cannot meet this, document and resolve a new numeric budget before closing M0; never quietly raise the ceiling. These numbers are planning proposals, not measurements from C2.

- [ ] **M0.5 — Recover from rendering and chunk-load failures. [C5, E1, N]** Reuse `ApplicationRecovery` and existing source/plot state plates, then add the missing application-level render-error containment. Distinguish data recovery, render exceptions and failed lazy imports; provide a useful retry/reload or restore path without discarding durable work. Keep Audience last-valid output and connection status safe.
  - Owners/files: `src/main.jsx`, `src/App.jsx`, `src/components/app-shell/ApplicationRecovery.jsx`, a focused root error boundary and its tests.
  - Acceptance cases: deliberate render failure, lazy-chunk failure, bad package/source and storage unavailability show recovery, not a blank page. A fixture smoke visits every actual page in View/Build and reaches Present with the corresponding eligible content.

- [ ] **M0.6 — Establish CI, version visibility and practitioner smoke. [C5, E7, N]** Add Windows/Ubuntu push CI for unit tests, build and source Chromium journeys; upload native reports even on failure. Prepare Playwright dependencies once. Keep static/PDPC aggregate checks at explicit integration/release boundaries unless their owners change. Start `CHANGELOG.md`, expose app/package version in the existing information surface, and record a practitioner launch/navigation demo.
  - Owners/files: `.github/workflows/` new CI workflow; `package.json`; existing version/About surface; `CHANGELOG.md`; `docs/demos/`.
  - Before claiming CI is green, require an actual hosted run; a local YAML review is preparation only.

### M0 exit criteria

1. **[C5, E4]** Current fixture and shipped-content smoke are committed; `pnpm.cmd test` passes at the declared integration candidate. Every prior failure/not-run item is resolved, replaced by a current assertion, or explicitly retired for a product reason.
2. **[C5]** Source, static and PDPC Chromium suites all pass, with their combined measured runtime below 30 minutes on a named reference machine; no hidden skips to meet the target.
3. **[C5, N]** Fresh-clone dev/portable/Cloudflare commands work on their supported platforms; shipped uploaded assets and offline lazy chunks are present.
4. **[C5, C2, N]** Windows/Ubuntu CI has real passing evidence and saved reports; View meets the agreed numeric bundle budget.
5. **[C5, E1]** Root recovery and all-page/mode smoke work; a practitioner can open and navigate the exercise without setup repair. Version/changelog identity is discoverable.

## 6. M1 — Fidelity

**Purpose:** make the authoring preview represent the saved destination and the monitor represent the actual Audience output. **Dependencies:** M0 fixtures/builds; retain the decision-surface draft projection.

### Ordered work packages

- [ ] **M1.1 — Share destination geometry and prepared rendering. [C1, E4, N]** Introduce `chartStageGeometry.js`; make grid CSS consume its geometry variables. Cover every footprint on desktop/tablet, fractional rows, and effective canvas widths under Build rails. Retain C1's literal reference values for the canonical desktop case: 327×418, 670×418, 1356×418 and 1356×852. Pass prepared/resolved rendering through `ChartPanel` to the same `ChartView` used on the destination.
  - Owners/files: `src/components/chartStageGeometry.js` (new), `LayoutGrid.jsx`, `ChartPanel.jsx`, `ChartView.jsx`, grid/static-content CSS.
  - Checks: `tests/chartStageGeometry.test.js` (new), existing `chartPanelLayout.test.js` and `chartViewV3.test.js`; add constrained-width cases so canonical maxima do not hide a real mismatch.

- [ ] **M1.2 — Ship the AuthoringStage in editor and wizard. [C1, E2]** Render the real panel at destination CSS dimensions, uniformly scale only its outer presentation, and reserve its scaled space. Add Fit/Actual, percentage/size captions, immediate footprint updates, stable controls, empty/invalid states, and Show on canvas. Preserve both editor surfaces, wizard readiness and draft save/discard/resume behavior. Give keyboard users an equivalent Show on canvas action and restore opacity/focus on pointer cancellation or Escape. Desktop/tablet work; phone preview states its limitation.
  - Owners/files: `src/components/chart-authoring/AuthoringStage.jsx` (new), `ChartEditorV3.jsx`, `ChartWizardV3.jsx`, `ChartPreview.jsx` readiness helpers, authoring CSS/region registry.
  - Checks: `authoringStage.test.js` (new), `chartAuthoringComponentsV3.test.js`, `chartEditSession.test.js`, `chartWizardProofDeck.test.js`; new `tests/e2e/v3-authoring-stage-fidelity.spec.js` compares actual destination geometry within 1px and stable rendered label/legend/plot output, including wide/fractional footprints and constrained Build width.

- [ ] **M1.3 — Capture the real Audience and validate the frame stream. [C1, E1, N]** Capture the accepted Audience surface after fonts and layout settle. Send revision, CSS viewport/DPR and frame metadata on the presentation channel with C1's 600 KB guard. Implement 200ms settle, adaptive playback cadence, no overlapping captures, four-second idle sleep and 15-second heartbeat. Suspend capture when hidden; handle teardown, reconnect and capture failure.
  - Owners/files: `src/components/presentation/useAudienceFrameCapture.js` (new), `src/lib/audienceFrameSchedule.js` (new), `src/lib/presentationChannel.js`, Audience integration in `App.jsx`/`AudienceDisplay.jsx`.
  - **Added checks [N]:** reject stale/out-of-session/out-of-order frames; distinguish controller-requested revision from Audience-accepted revision; bound queued images; verify hidden/disconnected status cannot masquerade as fresh output. Test malformed frames and cleanup without storing exercise images in logs.

- [ ] **M1.4 — Stream-first monitor and declared presentation stage. [C1, C5]** Show received frames using their real aspect ratio, resolution and fresh/static status. Rehearsal without a display retains a clearly labelled local preview; failure does not produce a blank monitor or falsely claim Audience fidelity. Add a validated target presentation resolution to the existing Scenario Passport persistence path, letterbox the Audience stage, and size capture/monitor consistently. Provide a Rehearse action opening the real Audience route at that target size.
  - Owners/files: `AudienceSnapshotMonitor.jsx`, `AudienceDisplay.jsx`, `PresentWorkspace.jsx`, Scenario Passport/config normalizer and presentation protocol owners. Existing window lifecycle/reconnect/END semantics remain binding.
  - Checks: `audienceFrameSchedule.test.js` (new), `presentationChannel.test.js`, `audienceSnapshotMonitor.test.js`, `audienceDisplay.test.js`, `presentPlaybackOwnership.test.js`; new `tests/e2e/v3-audience-monitor-stream.spec.js` verifies changed frames, static sleep, resize, reconnect, blackout/END and honest fallback across two actual pages.

- [ ] **M1.5 — Footprint typography and current-style fidelity review. [C1, E3, N]** Define chart text/legend budgets by footprint and Present composition using the shared rendering context. Preserve theme tokens across stage, real panel, monitor fallback and all four styles. Register new owned regions and extend the existing journey manifest. Review the changed surfaces, resolve concrete theme leaks, then show the editor and actual projector output to a moderator.
  - Owners/files: `src/charting/rendering/axisPresentation.js`, `legendLayout.js`, render-context owners, style tokens, region/journey manifests.
  - Check dense labels, long titles, fractional/wide footprints, font loading and projector letterboxing. Retain the broader pending cross-style closure for M3; do not label a few fidelity screens as completion of that older matrix.

### M1 exit criteria

1. **[C1, N]** Editor/wizard stage and real destination share measured geometry and prepared rendering; Fit/Actual/footprint changes retain correct appearance and usable controls.
2. **[C1, N]** Monitor stream demonstrably comes from the Audience window; accepted revisions, aspect ratio, static/fresh/disconnected states and fallback are truthful.
3. **[C1, C5]** Declared presentation resolution, letterboxing and local rehearsal work through the public workflow.
4. **[C1, E3]** The two fidelity journeys and directly changed owner checks pass; changed regions work in Ledger, Humanist, Instrument and PDPC.
5. **[C5]** A moderator confirms on a projector that the monitor reflects what the room sees; notes record any remaining readability limits.

## 7. M2 — Time and story

**Purpose:** support “now”, historical review and cross-page comparison through one understandable model. **Dependencies:** M1 geometry/monitor; preserve original packages before any format migration.

### Ordered work packages

- [ ] **M2.1 — Chart-owned sync and additive Storyline contracts. [C3, C4, E2, N]** Validate chart defaults for exact/last-known/nearest/interpolate; allow parentless, cross-page scene members during transition. Preserve ordered member IDs, time window, cadence, View/Present layouts and member overrides. Derive coverage from eligible source data; do not make non-temporal or presentation-ineligible content temporal by weakening validation.
  - Owners/files: `src/charting/time/sceneSchema.js`, `normalizeTemporalConfig.js`, chart schema validator, member time-context resolver and semantic-reference/mutation owners.
  - **Added migration rule [N]:** if one chart belongs to multiple legacy Groups with different matching policies, retain the policy on each resulting Storyline member. Copy a chart default only when unambiguous; never let traversal order silently overwrite another group's behavior.
  - Checks: `chronoSchemaNormalization.test.js`, `chartTemporalV3.test.js`, `chronoGroupModelV3.test.js`, scene-schema tests; include incompatible policies, moved/deleted members and empty coverage.

- [ ] **M2.2 — Shared cursor, derived clock and exercise-time persistence. [C3, C4, N]** Implement Live/At, page/Storyline/dashboard scope, optional window, play/pause/seek/step, speed, matching override and trace state in the existing reducer/provider. Derive sorted clock frames from scope; snapshots never add frames. Live uses declared exercise time, otherwise the latest scope observation. Resolve chart default → member override → session override consistently. Keep compatibility aliases only through the agreed transition release.
  - Owners/files: `playbackReducer.js`, `playbackPageScope.js`, `PlaybackProvider.jsx`, `applyTimeContext.js`, dashboard config normalizer/validator, Scenario Passport. The current config has no `scenario` object: add and roundtrip the agreed optional field explicitly rather than assuming it already persists.
  - Checks: literal reducer states/frame lists; no-data scope; duplicate/mixed-cadence timestamps; timezone/DST and invalid dates; out-of-window seeking; page change during playback; static-only page; preservation on export/import.
  - **Added boundary [N]:** distinguish exercise time, observation time and publication cutoff. The cursor is not access control. Released phase packages must exclude future unpublished data; nearest/interpolation must not silently expose future exercise information contrary to the selected policy/release cutoff. Resolve contradictory “last known” versus exact-policy behavior explicitly and show no-data/staleness honestly.

- [ ] **M2.3 — Save compare and open a Storyline band. [C3, E2, N]** Carry a cross-page comparison selection into “Save as Storyline”, preserving order/layout and deriving its initial window from member coverage. Use the existing Build authoring transaction for durable save; View comparison must not gain an unreviewed bypass around editability/draft ownership. Reuse the existing composition grid above the current page, below the attention strip, with other content visibly outside the active Storyline scope. Closing restores page context.
  - Owners/files: `FullscreenDisplay.jsx`, comparison selection owner, Scene editor/save boundary, `SceneViewCompositionGrid`, `ViewShell.jsx`, `DashboardCanvas.jsx`.
  - Check cross-page selection survival, cancel/no mutation, read-only behavior, saved/reopened member order, missing member recovery and View layout preservation.

- [ ] **M2.4 — Coverage picker and three useful reference Storylines. [C3, C5, E5]** Replace the Group-filtered member list with page/section-grouped temporal candidates, coverage bars, source/cadence filters and “select all with coverage”. Make zero/partial coverage understandable and validate Present layout capacity. Use actual moderator-selected comparisons from the accepted exercise; “Cases and public trust” is an example, not an imposed content decision.
  - Owners/files: Scene Studio/editor, `temporalAvailability.js`, `chronoStudio.test.js`, `chronoSceneComposition.test.js`; accepted fixture/reference-package derivatives.
  - Check two-era datasets, sparse/expired series, non-overlap, source replacement and large selection. Preserve already accepted scenario captions and provenance when creating the reference compositions.

- [ ] **M2.5 — Time bar, scrubber, stamps and Build controls. [C4, E4]** Replace the floating Chrono controller/page toggle with the shared Time bar and disclosure; add accessible seek/step/play/Live behavior, coverage track, exercise-now marker, per-chart as-of/policy/static chips and one polite time announcement. Remove the old projection that hides/reorders normal page charts. Add chart sync and exercise-time authoring, plus a stage Live/At preview using the current cursor. Phone exposes Live, play/pause and instant, with a 56px scrubber.
  - Owners/files: new `TimeBar.jsx`, `TimeSettings.jsx`, `TimelineScrubber.jsx`, `scrubberModel.js`; old playback controller/actions/projection, `ChartHeading.jsx`, `ChronoDateOverlay.jsx`, authoring Data step and region/journey manifests.
  - Checks: focused keyboard bindings do not hijack text input; Escape closes the scrubber first and returns to Live at the next appropriate level; empty clocks disable transport clearly; static charts are labelled only when useful. Preserve the crown mode/location/context structure.

- [ ] **M2.6 — Present/Audience consume the same accepted time state. [C3, C4, E1, N]** Replace Group-specific time payloads with versioned/validated cursor projection; resolve displayed charts using the same policies. Add Dashboard scope and “Advance exercise time” through the authorized Scenario Passport mutation path. Audience remains passive apart from the existing narrowly supported interactions; apply stamps/chips and protect last-valid output through disconnect/reconnect/END.
  - Owners/files: `audienceProjection.js`, presentation protocol/channel, `usePresentationRuntime.js`, `PresentWorkspace.jsx`, `AudienceDisplay.jsx`.
  - Checks: controller/Audience times and resolved observations agree; stale old-protocol messages cannot overwrite accepted state; readonly controls are disabled; reconnect receives a complete current projection. The frame stream reports the resulting accepted revision.

- [ ] **M2.7 — Retire Groups through deterministic dashboard V7 migration. [C3, C5, E6, N]** Only after all live consumers support parentless Storylines, map Groups without Scenes to equivalent Storylines, map Scenes with their own period/cadence/layout intact, preserve policy overrides, remove Group references and retire Chrono Studio from Libraries. Update import review, semantic references, package serializer/normalizer, release factory, scenario adapters that consume this format, catalogues and training vocabulary together. Keep chart schema V3 unchanged.
  - Owners/files: `dashboardBundleV3.js`, `dashboardConfigStructure.js`, temporal normalization/reference owners, Build Libraries, import/export UI, release/scripts and corresponding tests.
  - Checks: deterministic/idempotent conversion, old Group-only and Scene-bearing fixtures, shared-chart policy conflicts, invalid references and unknown future versions, export/import equivalence. Import preview names changes; preserve the original package and rollback path. Reuse existing numeric format migration patterns; do not claim older apps can read V7.

### M2 exit criteria

1. **[C4, N]** Live/At, exercise time, scope and playback produce correct literal resolutions, including gaps/static charts/mixed cadence, without rearranging ordinary page content.
2. **[C3, C5]** Three moderator-valued cross-page Storylines exist in the accepted reference exercise, reopen faithfully and play on Audience.
3. **[C4]** Time bar/scrubber keyboard, phone layout, as-of stamps and single announcements work in View/Present; Build persists the authoring fields.
4. **[C3, C4, N]** View, Present and Audience share the same time semantics and accepted-state behavior; disconnect/reconnect and stale frames remain safe.
5. **[C3, N]** V7 migration is lossless for supported inputs, deterministic and reviewable; no active consumer still requires Groups, and rollback retains the previous package/release.
6. **[C5, E5]** Practitioner demo covers live situation, evolution and co-movement. No future phase information is exposed by the delivered exercise packages.

## 8. M3 — Exercise rehearsal

**Purpose:** prove the complete loop with staff and devices that did not build it. **Dependencies:** M1/M2 ready; facilitator-accepted reference content, including S-M3 acceptance if using that candidate.

### Ordered work packages

- [ ] **M3.1 — Select and freeze the rehearsal content and device envelope. [C5, E5, N]** Obtain final S-M3 communication acceptance or use another explicitly accepted exercise. Record package/source versions, three phase cutoffs, moderator-selected Storylines, projector resolution and the least capable supported laptop/phone. Record offline setup, room roles and the actual prepare/run/debrief tasks. Do not equate the three fictional phases or weekly scenario sessions with a required wall-clock exercise duration.
  - Deliverable: a concise rehearsal packet and draft author quick start/moderator runbook, reusing existing manual and scenario artifacts.
  - Check the fixtures/packages and all required controls before the staffed rehearsal; resolve any missing candidate dependency first.

- [ ] **M3.2 — Complete mobile Option 1. [C2, C4]** Add once-mounted View chart deferral within one viewport; keep eager Build rendering for fidelity. Use sized placeholders to prevent jumps. Complete 44px phone touch targets, safe swipe-to-dismiss and existing map/heatmap pinch zoom, with gesture conflict handling. Apply phone text policy: axis labels at least 12px, no more than six tick labels per axis, bottom legends and two-line title wrapping. Extend the collapsed Time bar and offline/install state without making Build phone-first.
  - Owners/files: new `DeferredPanelMount.jsx`, `DashboardSection.jsx`, `DashboardAttentionStrip.jsx`, `FullscreenDisplay.jsx`, zoom guard, `axisPresentation.js`, `legendLayout.js`, `modes.css` and View render context.
  - Checks: observer absence/reduced motion, offscreen selected/focused content, stable scroll geometry, gestures while zoomed, long titles/legends, keyboard alternatives; eager rendering on export/capture paths where completeness is required.

- [ ] **M3.3 — Make the phone journey executable and measure performance. [C2, C5, N]** Replace the out-of-scope phone entry with the real 390×844 View journey and a phone density profile. Verify no root horizontal scroll, chart caps, 44px targets, Time bar, fullscreen and no Build/Present chunk request in View. Test warm offline reopening and lazy content/chunks on actual supported devices; measure chart-heavy pages and capture overhead rather than inferring performance from bundle size.
  - Owners/files: `tests/e2e/support/dashboard-surface-manifest.js`, density collector, new `tests/e2e/v3-mobile-view.spec.js`, render-context/component tests.
  - **Added acceptance proposal [N]:** on the named least capable device, target usable warm-offline View within 3 seconds, page/cursor feedback p95 within 200ms, and no input-blocking task over 1 second on the representative journey. Record test conditions and agree any revised numeric envelope before rehearsal acceptance. These are proposed budgets, not existing measurements or promises.

- [ ] **M3.4 — Close accessibility and rendered-style carryovers. [C5, E1, E3]** Exercise keyboard-only View/Present, visible focus and return focus, time announcements, zoom/reflow, touch and AA contrast in all four styles. Complete current-scope rendered ownership and Audience-distance review using the existing manifest/region registry; account for removed/replaced surfaces rather than recapturing obsolete journeys. Carry forward existing evidence where unchanged, resolve concrete theme leaks and record remaining human visual acceptance on the current candidate.
  - Checks include an actual screen-reader journey and projector readability; deterministic CSS/token checks alone do not establish these. Historical 192/135 matrix counts are records, not an immutable scope after the redesign and fourth style.

- [ ] **M3.5 — Run prepare → full-day operation → debrief with independent staff. [C5, E5, N]** Staff import/prepare, browse, compare, advance exercise time, use Storylines/Present, disconnect/recover, work offline and export a citable result without the builder conducting the workflow. Replay the same Storylines in debrief; use ordinary notes for key moments while authored timeline annotations remain deferred. Record confusion, errors, interventions and outcome against the package/release identity.
  - Observe tasks using the runbook rather than coaching around defects. Separate content issues, product defects, setup failures and useful later requests.

- [ ] **M3.6 — Correct blocking findings and confirm the affected journey. [C5, E7]** Fix every rehearsal blocker with its direct regression/meaning check. Re-run the affected task rather than the whole day when the fix is bounded; repeat a full rehearsal only when findings invalidate the overall exercise evidence. Update the same docs/demo and known-issues entries with the disposition. Keep nonblocking polish and unselected mobile options out of this closure.

### M3 exit criteria

1. **[C5, E5]** Staff who did not build the tool complete prepare, a day of running and debrief using accepted content; intervention and findings records are available.
2. **[C5]** All blocking findings are fixed and verified at their affected boundaries; remaining issues have explicit user impact and disposition.
3. **[C2]** Mobile Option 1 is complete, with the real phone journey green, readable charts/controls, offline reopening and the retained Build/Present advisory behavior.
4. **[C5, E3]** Keyboard/screen-reader/contrast checks and current rendered style/Audience-distance acceptance are complete for the declared product scope in all four styles.
5. **[C5, N]** The agreed performance budgets are met on the least capable supported device under recorded conditions.
6. **[C5]** An exercise practitioner can operate from the draft runbook without the author present; their findings inform M4 documentation/support rather than another feature expansion.

## 9. Retained scenario-authoring milestones

These remain the existing scenario programme, with its own planning steward and human fictional/content authority. `S-` is only an unambiguous label in this consolidated roadmap. No additional model runs, tasks or evaluation lanes are launched by writing it. Model availability must be checked when a run is actually authorized; retain the original comparison conditions or explicitly document a necessary revision.

| Milestone | Recorded state | Relationship to dashboard roadmap |
| --- | --- | --- |
| S-M0 Planning baseline | Existing accepted planning foundation; later proposals distinguished in source records | Retain, do not restart. [E5] |
| S-M1 Minimum scenario data contract | Scoped complete at `17f30d0d` | Preserve qualified observations, provenance and native roundtrip behavior. [E5] |
| S-M2 Repeatable three-phase composition | Scoped complete at code `ccbf17cb`, checkpoint `a4423848` | Reuse generator; do not revive the September 8 “composition incomplete” snapshot as current status. [E5] |
| S-M3 Complete curatable communication | Candidate `91105ec3`; engineering A–D evidenced; E pending | Human content prerequisite if chosen for dashboard rehearsal. [E5] |
| S-M4 Connected guided pilot | Planned | Independent authoring/product evaluation alongside dashboard M3, after S-M3 acceptance. [E5] |
| S-M5 Transfer and operating envelope | Planned | Required before claims about generalized reuse/cross-provider support. [E5] |
| S-M6 Integration/release readiness | Planned, explicitly gated | Coordinate with dashboard M4 when scenario-authoring is in the supported release scope. [E5] |

### S-M3 remaining steps — final communication acceptance

- [ ] **S-M3.1 [E5]** Facilitator reviews the complete noncanonical Aster-28 source, three narratives, coverage map and native packages; prior acceptance of the numeric proposal is not final communication acceptance.
- [ ] **S-M3.2 [E5]** Correct only identified meaning/readability/curation gaps. Preserve canonical Aster, earlier versions, native edits, definitions, uncertainty, cumulative observation dates/values and the 48/77/107 phase release progression.
- [ ] **S-M3.3 [E5, N]** Close the actual native export/download interaction if required for the accepted workflow: the record verifies the serializer-based roundtrip, but the browser `prompt()` download interaction was not verified. Keep full provenance companions/manifest with the package; do not call a detached native JSON fully self-contained provenance.
- [ ] **S-M3.4 [E5]** Record explicit human acceptance or remaining bounded findings against exact hashes/revision; integration remains separate. Reuse the existing scoped engineering/reviewer evidence when unchanged.

**Exit [E5]:** completed content is human accepted; native curation/roundtrip preserves meaning; provenance companions and known delivery limitations are clear. This closes S-M3, not release readiness.

### S-M4 — connected guided pilot across the four planned models

- [ ] **S-M4.1 [E5]** Freeze the accepted Netherlands context, fictional assumptions, common brief, rubric, reset policy and source/tool versions. Obtain an agreed effort envelope or human judgment criterion before claiming the process is low burden.
- [ ] **S-M4.2 [E5]** Execute the complete delivery/revision course in independent Astra, Sol, Terra and Luna contexts under equivalent inputs and acceptance targets, subject to actual availability and the original task-authorization boundary.
- [ ] **S-M4.3 [E5]** Record first attempts, tool repairs, substantive corrections, clarification turns and human intervention separately; preserve failed artifacts. Use the proposed two-repair-round cap only if adopted, not as an invented accepted usability threshold.
- [ ] **S-M4.4 [E5]** Have a human curate/review the output. A missing deliverable, critical meaning error or manual data/package-file repair cannot count as successful autonomous completion. Improve only demonstrated reusable boundaries, then distinguish assisted repair from fresh prevention evidence.

**Exit [E5]:** lane-specific complete delivery and meaningful revision evidence, preserved earlier/edited outputs, actual human curation, explicit effort acceptance. An all-four claim requires all four; historical coached runs are supporting evidence only.

### S-M5 — transfer and operating envelope

- [ ] **S-M5.1 [E5]** Run a fresh use case without prior coaching to test whether improvements prevent the known semantic/qualifier omissions.
- [ ] **S-M5.2 [E5]** Select and review a second exercise/observation design, then demonstrate reusable composition without example-specific code or repaired captions. Preserve useful country context and accepted fictional authority.
- [ ] **S-M5.3 [E5]** Evaluate the planned reasoning/context conditions with a bounded experiment that answers a specific uncertainty; retain failures and untested settings. Do not infer a reliability percentage from isolated runs.
- [ ] **S-M5.4 [E5]** Choose and test at least one other provider before claiming cross-provider portability; document actual supported tools/runtime/settings and limitations.

**Exit [E5]:** evidence-backed supported conditions and scenario reuse, with transfer/cross-provider claims limited to what ran. Unselected provider and effort choices remain future user decisions, not blockers to writing this roadmap.

### S-M6 — scenario integration and release readiness

- [ ] **S-M6.1 [E5, N]** Select the accepted implementation commits and integrate against the intended current dashboard baseline through the authorized merge process. Preserve scenario worktree modifications and prior candidates. Reconcile Storyline/V7 changes only where scenario consumers actually depend on the changed contract.
- [ ] **S-M6.2 [E5]** Resolve integration findings with focused checks, then run the explicitly required repository/release gates on the final candidate. Carry user content acceptance and source/package identities into release evidence.
- [ ] **S-M6.3 [E5, C5]** Ship installation/use guidance, provenance-companion instructions, version recovery and a support envelope that match the demonstrated authoring workflow.

**Exit [E5]:** accepted pilot/support scope, integrated code, content acceptance and explicit release gates. If dashboard 1.0 is released without supported scenario-authoring, retain S-M4–S-M6 visibly as separate unfinished programme work and label that release scope honestly; do not silently delete these milestones.

## 10. M4 — Deployment readiness

**Purpose:** move from a successful rehearsal to an approved, supportable deployment and real pilot. **Dependencies:** M3 blockers closed; scenario S-M6 if scenario-authoring is included in the supported release. The work below is planned release preparation; actual external publication and human sign-offs remain explicit execution boundaries.

### Ordered work packages

- [ ] **M4.1 — Verify security/privacy behavior and distribution boundaries. [C5, E6, N]** Inventory actual network/storage behavior in deployed and offline variants; inspect remote assets, source uploads, exports, telemetry and third-party requests before writing factual claims. State hosting-request metadata separately from exercise-data handling. Add a tested Cloudflare CSP compatible with required local assets and chart rendering; retain sanitization of QMD/media and valid import limits. Audit dependencies, resolve vulnerabilities in release scope or document a formally accepted exception with owner and rationale. Ensure exercise-use/fictional-data disclaimer and version are visible on photographable View, fullscreen, Storyline and Audience outputs.
  - Deliverables/files: concise `docs/security-and-privacy.md`, hosting headers/CSP, existing sanitization/security tests and built-variant request checks. A clean dependency audit is evidence, not a blanket security certification.

- [ ] **M4.2 — Close data governance and citable packaging. [C5, E5, E6, N]** Every chart exposes source, observation/as-of time and appropriate fictional/static/uncertainty context. Export identifies app version, schema/package version and a reproducible integrity checksum; import review lists changed sources, content, assets and time/Storyline structure before committing. Include source/METHOD/provenance companions for scenario-derived releases and test tampering/missing-companion diagnostics without silently losing interpretation.
  - Owners/files: chart headings/source details, bundle serializer/import review, release manifests and scenario provenance adapters where included. Reuse existing checksum machinery rather than defining a competing format.
  - Check V7 and pre-V7 imports, source replacement, offline media, checksum mismatch, cancellation/no mutation and an exported result that a debrief report can cite unambiguously.

- [ ] **M4.3 — Finalize operator and maintainer documentation. [C5, E6, E8]** Produce a short author quick start, room moderator runbook, maintainer build/release/rollback guide and one-page scope/limitations statement. Build from `docs/app-manual.md` and `docs/pdpc-release-factory.md`, correcting obsolete UI/time/version language. Cover second-screen setup, declared resolution, disconnect/reconnect, blackout/END, offline startup, browser persistence, package backup and recovery. Have an exercise staff member follow the documents without author assistance.

- [ ] **M4.4 — Establish support and rehearse rollback. [C5, E7, N]** Name the person/team responsible for exercise-season incidents and the agreed response window, with a contact route and known-issues list. Preserve the previous tagged app and compatible package. Exercise a rollback from a candidate that includes service-worker caches, lazy chunks and V7 package incompatibility; restoring an older app alone is not proof it can read the newer package. Record backup/restore steps and the recovery result.

- [ ] **M4.5 — Obtain branding approval and produce the release candidate. [C5, E6]** Obtain actual PDPC decisions on name, logo, color profile and disclaimer wording. Freeze accepted exercise content, document the supported feature/authoring scope, update changelog/version, and produce the PDPC variant(s) through the existing factory from a tagged candidate. Verify full-workspace versus participant isolation, reproducible manifest/checksums, static/offline launch and the approved content/branding. Run full release gates once on this exact candidate and save native reports. Prepare the deployment and rollback artifacts for review before requesting any still-required publish approval.

- [ ] **M4.6 — Deploy the approved candidate, run a real pilot and qualify 1.0. [C5, E5, N]** After the publication boundary is authorized, deploy the exact approved output and run one real exercise with PDPC staff. Triage findings; fix release blockers and verify affected boundaries. Promote the accepted final candidate with a new immutable `v1.0.0` tag and archive its package/manifests/docs. Do not move an existing tag to different bytes: C5's “re-tagged as 1.0” is implemented as a new release identity. Unresolved supported-scope S-M4/S-M5/S-M6 work remains visible rather than being relabelled complete.

### M4 exit criteria

1. **[C5, N]** Security/privacy statement matches observed behavior; CSP, dependency assessment and photographable disclaimers are checked on the built release.
2. **[C5, E5]** Chart provenance/time and package versions/checksums/import review are complete; delivered scenario companions preserve their claimed meaning and traceability.
3. **[C5]** Author, moderator, maintainer and scope documents are usable by staff; no unsupported feature claim remains.
4. **[C5, N]** A named support owner, response commitment, known-issues list and tested app/package/cache rollback exist.
5. **[C5, E6]** PDPC branding approval and exact tagged factory output have passing release gates and an authorized deployment record.
6. **[C5]** A real exercise pilot is completed, blocking findings are closed, and a new immutable 1.0 release identifies the accepted result.

## 11. Recommendations deliberately kept outside the critical path

Every additional Claude recommendation is retained here or assigned above. “Deferred” means no implementation commitment before its trigger, not forgotten work.

| Source / recommendation | Disposition and trigger |
| --- | --- |
| C1 — split the 40,000-line dashboard config and inline assets | Investigate source-asset extraction within M0.3 only where necessary to fix portable builds. Broader asset-ID/storage refactor is backlog; trigger after profiling/package review shows a concrete size or maintainability problem. Preserve the portable bundle and import-review contract. [C1, N] |
| C1 — runtime “matches canvas” hash indicator | Deferred until the stage geometry/rendering contract is stable and practitioners need such feedback. Technical hashes stay out of ordinary product copy; do not make rendering duplicated work on every edit. [C1, N] |
| C1 — per-footprint typography, declared resolution, rehearsal popup | Included in M1.4–M1.5, not deferred. [C1] |
| C2 — Option 2 per-chart mobile keep/simplify/summarise/table | Post-rehearsal candidate for chart families whose reading task still fails after Option 1. Requires explicit semantic treatment of hidden/aggregated series, author override and a truthful phone stage preview. [C2, N] |
| C2 — Option 3 pocket participant build | Conditional on an exercise organization requesting a dedicated participant phone link; first assess whether the existing PDPC participant variant already satisfies it. Avoid a redundant third product. [C2, E6, N] |
| C2 — Option 4 phone Present remote | Deferred until cross-device messaging and authentication have their own accepted design; BroadcastChannel is same-machine today. Keep out of deployment-readiness scope. [C2] |
| C3 — dated Storyline key moments/chapter stops | Deferred until a second data package reveals the required narrative/coverage patterns. M2 leaves room in the scrubber; M3 debrief can use recorded timestamps and ordinary notes. [C3, C4] |
| C5 — new surfaces, additional companion features, broad product expansion | Deferred until the full exercise loop has been used by independent staff. Preserve existing Quorum compatibility; no new remote/control product is implied. [C5, E1] |
| E5 — broad country research/evaluation orchestration/setting compiler | Retain as proposals under the existing scenario steward; execute only a bounded prerequisite selected by that plan. No automatic prediction engine, graphical scenario-authoring app, or dashboard-to-source synchronization. [E5] |

## 12. Decisions and next implementation boundary

**Immediate engineering priority:** M0.1–M0.3, beginning with verified baseline and the smallest fixture/portable-build boundary. In parallel organizational work, obtain the already-pending S-M3 facilitator review through its existing owner. [C5, E5, N]

The following choices are not needed to finish this planning document, but must be resolved before their dependent work closes:

- **Publication/baseline [E7, N]:** reconcile the fact that the redesign is local while both remotes still point at `c003d111`; preserve explicit merge/push/deployment authority.
- **Performance [C5, N]:** confirm reference devices and ratify measurable bundle/runtime budgets; proposed starting numbers appear in M0.4 and M3.3.
- **Content and practitioners [C5, E5]:** accept S-M3 or select another accepted rehearsal package; nominate exercise staff and their three desired comparisons.
- **Release scope [C5, E5]:** decide whether supported 1.0 includes scenario-authoring or only the dashboard consuming accepted packages. Scenario milestones remain tracked either way.
- **External commitments [C5]:** actual PDPC brand approval, support ownership/response window, hosting target and real pilot participants.

Dates and effort estimates should follow M0's measured repair scope and practitioner availability. No percentage-complete claim or invented delivery date is useful before those constraints are known.

## 13. Planning verification record

- Read all five September 19 design documents, the preceding decision-surface plan, saved gate/repair records, legacy acceptance/cross-style records, scenario CURRENT/development milestones and release/workflow references.
- Refreshed both Git remotes and checked the actual SHAs; inspected local merge and scenario branch checkpoints.
- Confirmed the five requested source documents have no changes between `0aab4b9` and local redesign merge `0e7e9e33`.
- Parsed saved unit report counts; reused recorded test evidence without presenting it as fresh execution.
- Inspected relevant startup/source-loading/config boundaries to distinguish existing recovery from a root error boundary and current serialization from proposed fields.
- This is documentation-only work: no application tests, builds, browser journeys, scenario generation or model evaluations were run for the plan.
