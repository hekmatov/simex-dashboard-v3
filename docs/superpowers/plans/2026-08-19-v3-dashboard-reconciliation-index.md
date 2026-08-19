# V3 Dashboard Reconciliation Implementation Plan Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the assembled V3 dashboard with the four normative contracts and all 20 accepted Step 4 sketches, preserving valid implementation while making Steps 6–8 independently executable and testable.

**Architecture:** Keep one authoritative V3 dashboard content model, one canonical View/Build renderer, explicit Build draft slots, derived temporal ledgers, and one versioned passive presentation projection. Step 6 establishes shared shell, tokens, mode boundary, and exact geometry proof; Step 7 owns View/Build and authoring; Step 8 consumes the saved Scene contract for Present/Audience.

**Tech Stack:** React 19, Vite 6, JavaScript ES modules, CSS, ECharts 5, Node test runner, React DOM test utilities, Playwright, BroadcastChannel, SimEx icon catalogue.

**Spec:** `docs/superpowers/specs/2026-08-12-three-mode-dashboard-ui-spec.md`; `docs/superpowers/specs/2026-08-12-temporal-authoring-chrono-design.md`; `docs/superpowers/specs/2026-08-12-chart-creation-design.md`; `docs/superpowers/specs/2026-08-15-scene-authoring-familiarity-design.md`.

---

## Global constraints

- Version 3 remains the only content/runtime authority. Do not duplicate dashboard content or temporal state between shells.
- Preserve the dirty worktree. Step 5 owns only the four dated 2026-08-19 planning documents.
- Do not resolve or stage the approved Vanta removal or the two pre-existing untracked files.
- Build and View use identical canonical canvas, grid, sections, panels, and plots. At every supported comparison viewport each rounded two-decimal geometry delta must be exactly `0.00`.
- Below 768 px, Build and Present are available as best-effort mounted surfaces. Show a persistent, non-dismissible notice above product chrome with **Switch to View**; do not redirect, disable controls, replace/unmount the workspace, or discard drafts/session state.
- Audience is passive and last-valid-output safe. Visual fidelity is acceptance behavior, not deferred polish.
- Step 9 owns final cross-mode viewport, accessibility, keyboard, touch, and UAT acceptance; Steps 6–8 own every known defect and targeted check listed here.
- Task boundaries follow independently reviewable behavioral ownership; no numerical task-count cap governs this plan set.

---

## 1. Authoritative source hierarchy

| Rank | Source | Authority rule |
|---:|---|---|
| 1 | Four normative contracts in **Specs** | Own semantic objects, behavior, state, persistence, validation, recovery, copy, and hard gates. |
| 2 | `.planning/sketches/MANIFEST.md`, `INTEGRATION-DEFAULTS.md`, every numbered README and winning/synthesis `index.html`, and `themes/default.css` | Own accepted composition, visual grammar, interaction staging, and responsive integration. |
| 3 | `docs/audits/2026-08-11-three-mode-dashboard-baseline/`, especially `UI-REVIEW.md`, `VIEW-BUILD-GEOMETRY.md`, and `STEP-2A-OMISSIONS-SUPPLEMENT.md` | Baseline evidence and regression inventory, not later design authority. |
| 4 | Current V3 production code/tests | Retain where ranks 1–3 are satisfied; passing tests alone are not proof. |
| 5 | 2026-08-10 prototype/implementation plans | Historical evidence only; cannot satisfy Step 5 or override later contracts. |

Precedence resolutions:

- Sketch 006 replaces only the earlier five-stage Scene interaction staging with **Select charts and frames** and **Arrange and configure**. All semantic fields, validation, persistence, dirty-state, recovery, duplication, and atomic-save requirements remain binding.
- Sketch 002 and `INTEGRATION-DEFAULTS.md` permit one active layout draft and one active selected-chart property draft simultaneously. Other incompatible mutation surfaces use Context Shelf parking/resolution.
- The MANIFEST makes phone Build/Present best-effort, not unavailable. The persistent notice does not gate the DOM or behavior.
- Sketch 003 owns three styles, 15 profiles, independent Profile/Standard chart colours, and Light/Dark/System; `themes/default.css` is the baseline inherited by every component/state.

## 2. Git and dirty-worktree boundary

| Item | Observed 2026-08-19 state |
|---|---|
| Worktree | `C:\Users\hekma\Documents\Projects\SimEx\.worktrees\simex-dashboard-v2\three-mode-dashboard-design` |
| Branch | `codex/three-mode-dashboard-integration` |
| Implementation baseline | `19b7ef66768b1575e2a029fb9fb37d0f976c4505` — `fix(app): survive background rendering failure` |
| Planning HEAD entering renewed master revision | `927d104c4b0703b15641d10d0fbe3ad4ccdd55af` — unpushed Step 5 planning commit; amend this commit |
| Tracking at revision start | `origin/codex/three-mode-dashboard-integration`, ahead 1 / behind 0 |
| Preserved Step 4 boundary | `fbd48e8..fbf568c`; 20 numbered sketch commits plus closing integration commit |
| Pre-existing dirty state | 20 tracked paths and 2 untracked paths; none belongs to Step 5 |

Preserve these tracked paths unstaged: `README.md`; `docs/icon-and-interaction-specification.md`; `docs/icon-language-atlas.html`; `index.html`; `public/config/dashboard.json`; `public/integration/quorum-chart-catalogue.json`; deleted `public/vendor/three.min.js`; deleted `public/vendor/vanta.net.min.js`; `src/App.jsx`; `src/charting/config/dashboardBundleV3.js`; `src/charting/config/dashboardConfigStructure.js`; `src/components/DashboardRenderer.jsx`; `src/components/build/BuildWorkspace.jsx`; `src/iconography/iconCatalog.js`; `src/lib/loadDashboard.js`; `src/styles.css`; `tests/dashboardBundleV3.test.js`; `tests/dashboardSemanticBoundary.test.js`; `tests/defaultDashboardV3.test.js`; `tests/e2e/showcase-home.spec.js`.

Preserve these untracked paths unstaged:

- `docs/superpowers/plans/2026-08-15-scene-authoring-familiarity.md`
- `src/charting/config/dashboardPresentationV3.js`

The dirty slice includes the approved Vanta removal and unrelated evidence/configuration work. Future implementation must reconcile its eventual committed shape, but Step 5 does not stage, commit, discard, or resolve it.

## 3. Current implementation assessment

The assembled build has a reusable V3 engine and uneven accepted-design coverage. Retain the canonical configuration/render preparation, theme/profile resolution, source-state handling, plot state plates, Chrono reducer foundations, display reducer, presentation sequencing/heartbeat, structural recovery, and source sorting. Correct shell composition and styling; complete the missing authoring/session flows.

Deterministic baseline evidence at 1200×900 showed View workspace/section/panel widths of 1152/1152/1152 px versus Build 638/606/606 px. Build's permanent 216 px Structure and 280 px Inspector columns consume canonical width. This is an implementation defect, not an accepted alternative. Present remains catalogue-first rather than monitor plus Live Sidecar; saved Scene authoring is absent; chart creation has four tabs instead of six stages.

The replacement boundary is narrow: replace the permanent Build triptych composition and catalogue-first Present body while retaining compatible helpers/models. No wholesale rewrite is planned.

## 4. Post-Step-4 implementation commit inventory — 18/18 mapped

| Commit | Slice | Classification | Exact owner |
|---|---|---|---|
| `5c344f3` | Layered View command crown | Retain with visual correction | S6-2 |
| `4045062` | Dashboard look foundation | Retain as implemented | S6-1 |
| `f88bf2e` | Contextual look drawer | Retain with visual correction | S6-4 |
| `ca14c34` | Three visual grammars | Retain with visual correction | S6-1, S6-4 |
| `7652e89` | Plot-native data-state plates | Retain with visual correction | S7-18, S8-4 |
| `86e7209` | Progressive dashboard source states | Retain as implemented | S7-18 |
| `f664a27` | Chrono playback convergence | Retain with behavioral correction | S7-5, S7-17, S8-2 |
| `af2378b` | Collection exclusion from Chrono | Retain with behavioral correction | S7-3, S7-17, S8-3 |
| `7d9f4c1` | View focus and comparison | Retain with visual correction | S7-2 |
| `d87017d` | Optional Audience information | Retain with behavioral correction | S8-1, S8-4, S8-7 |
| `ed9aa59` | Unit Orbit | Retain with behavioral correction | S7-3 |
| `c8b8bdc` | Three-state source sorting | Retain as implemented | S7-19 |
| `5649d4c` | Inline structure controls | Retain with behavioral correction | S7-4 |
| `0622d94` | Atomic application recovery | Retain with visual correction | S6-4 |
| `e44177e` | Empty Present catalogue recovery | Retain with behavioral correction | S8-3, S8-7 |
| `7f14dfc` | Empty View section recovery | Retain with visual correction | S7-18 |
| `fb36ca0` | Time Groups as playback authority | Retain runtime; complete authoring | S7-5, S7-6, S7-9, S7-17 |
| `19b7ef6` | Background-render containment | Retain as implemented | S6-4; Vanta removal remains user-owned |

## 5. Approved-sketch coverage — 20/20 mapped

| Sketch | Accepted direction | Assessment | Exact disposition |
|---:|---|---|---|
| 001 | Passive Audience synthesis and optional facts | Protocol exists; real Scene/date projection incomplete | Complete S8-1, S8-4, S8-7 |
| 002 | Unit Orbit, direct order, 2×4 footprint, dual draft | Orbit exists; geometry and dual draft incomplete | Adjust S7-1, S7-3 |
| 003 | Three styles, 15 profiles, Profile/Standard, Light/Dark/System | Value resolver exists; propagation uneven | Retain S6-1; correct S6-4, S7-19, S8-7 |
| 004 | Exact six-stage chart-creation workflow | Current four-tab shell contradicts contract | Replace shell, retain engines: S7-10–S7-16 |
| 005 | Four-stage Time Group Studio and Availability Ledger | Saved runtime only | Complete S7-5, S7-6 |
| 006 | Two-stage Scene flow and Balanced Twin Canvas | Saved Scene/studio absent | Complete S7-7, S7-8 |
| 007 | Chrono deck default, mast alternative, same session | Runtime exists; full controller incomplete | Adjust S7-17 |
| 008 | Present monitor plus Live Sidecar | Catalogue-first page contradicts winner | Replace composition S8-3, S8-7 |
| 009 | Layered crown and phone notice boundary | Crown exists; phone and geometry wrong | Adjust S6-2, S6-3, S6-5 |
| 010 | Undimmed look drawer and scoped saves | Behavior largely satisfied | Retain; calibrate S6-4 |
| 011 | Inline Build structure controls | Inline commands plus contradictory permanent rail | Adjust S7-2, S7-4 |
| 012 | Page-grouped Time Content | Missing | Complete S7-9 |
| 013 | Scenario Passport | Existing inspector placement incomplete | Complete S7-4 |
| 014 | Immersive View focus/comparison | Core behavior exists | Retain/correct S7-2 |
| 015 | Context Shelf and resumable parking | Missing; ordinary sheets coexist | Complete S7-1, S7-4, S7-6, S7-8, S7-9 |
| 016 | Embedded collection controls and sidecar runtime | Partial collection behavior | Complete S7-3, S8-3 |
| 017 | Plot-native State Plate | Boundary exists | Retain; correct S7-18, S8-4 |
| 018 | Dedicated source viewer window | Sorting exists; lifecycle incomplete | Adjust S7-19 |
| 019 | Inline Recovery Rails | Root/empty recovery exists | Retain/correct S6-4, S7-18, S8-7 |
| 020 | Anchored page/section commands | Partial | Complete S7-4 |

## 6. Fidelity-gap matrix

Audit evidence used realistic packaged content at 390×844, 768×1024, 1024×768, 1200×900, 1440×900, and 1920×1080 Audience. Existing deterministic geometry and screenshots remain planning evidence; implementation tasks create the stronger exact parity proof.

| ID | Finding | Type | Exact owner |
|---|---|---|---|
| F-01 | View/Build canonical widths and offsets diverge; permanent Build columns compress targets. | Implementation defect | S6-3, S7-1, S7-2 |
| F-02 | Crown/header rows, gutters, and page offsets do not consistently match accepted hierarchy. | Implementation defect | S6-2, S6-3 |
| F-03 | Default neutral colours, radii, elevation, typography, and focus grammar are uneven. | Implementation defect | S6-1, S6-4 |
| F-04 | Look/style application is incomplete across chart cards and Build editors. | Implementation defect | S6-4 shared resolver; S7-2 chrome; S7-3 cards; S7-4 structure/Scenario; S7-6 Time Group; S7-8 Scene; S7-9 Time Content; S7-15/S7-16 chart wizard; S7-17 Chrono; S7-18 states; S7-19 drawers/footer |
| F-05 | Look/style application is incomplete across Present/Audience and global recovery. | Implementation defect | S6-4 global recovery; S8-3 controller; S8-4 Audience; S8-5 composition; S8-6 icons/states; S8-7 final Step 8 calibration |
| F-06 | Four-tab chart creation lacks the exact six stages; Chart type lacks explicit catalogue ownership; draft lifetime and companion transactions are incorrect; render/placement proofs need independent validation without a Proof stage. | Implementation defect | S7-10–S7-16 |
| F-07 | Time Group Studio, ledger, saved Scene/studio, and Time Content are absent. | Implementation defect | S7-5–S7-9 |
| F-08 | Chrono lacks complete scope, projection, seek, trace, movement, ownership, and safety pauses. | Implementation defect | S7-17 |
| F-09 | Present is a long catalogue rather than monitor plus compact Live Sidecar. | Implementation defect | S8-3, S8-7 |
| F-10 | Audience lacks real Scene/date projection, complete holding/blank/recovery hierarchy, and the passive neutral projection required when END cannot close the surface. | Implementation defect | S8-1, S8-4, S8-5, S8-7 |
| F-11 | Current Present cannot consume complete saved Scene defaults safely. | Implementation defect | S7-7 before S8-1; then S8-3 |
| F-12 | Structure/package commands and consequence dialogs are incomplete. | Implementation defect | S7-4 |
| F-13 | Source viewer origin/focus/recovery is incomplete. | Implementation defect | S7-19 |
| F-14 | Orbit clamp, Context Shelf width, and compact density need token tuning after parity. | Low-risk calibration | S7-1, S7-3; remain inside accepted 280 px usability invariant |
| F-15 | Date-position drag increments need viewport-relative tuning. | Low-risk calibration | S7-7 schema bounds, S8-5 interaction |
| F-16 | 1920×1080 Audience title/chart physical scale needs real-output calibration. | Low-risk calibration | S8-7; Step 9 performs final room-distance acceptance |

No material unresolved design decision was found. If calibration would change object ownership, stage count, shell hierarchy, canonical geometry, phone behavior, Live Sidecar placement, or Scene/Audience information structure, stop and return to the master task for a narrowly reopened sketch.

## 7. Retain / adjust / complete / replace / defer

| Disposition | Slices |
|---|---|
| Retain as implemented | V3 registry/schema foundation; canonical render preparation; theme value validation; progressive source states; source sorting; strict Time Group runtime; display reducer; protocol sequence/heartbeat foundation; root recovery. |
| Retain with visual correction | Theme grammars, crown, look drawer, state plates, immersive View, recovery rails, Audience facts, headers/footers/dialogs/drawers. |
| Retain with behavioral correction | Chrono, collections, Unit Orbit, inline structure, optional Audience facts, presentation runtime. |
| Complete missing coverage | Dual draft/Context Shelf; structure/Scenario; temporal foundation; Time Group/Scene/Time Content; six-stage chart creation; View Chrono; source lifecycle; complete Present/Audience lifecycle. |
| Replace because contradictory | Permanent Build triptych and catalogue-first Present body only; retain compatible state/model helpers. |
| Defer with explicit reason | Only Step 9 final cross-mode accessibility, keyboard, touch, viewport/UAT and room-distance acceptance, because Steps 6–8 already own known implementation defects and local checks. User-owned Vanta removal remains outside this plan because it is independently owned. |

## 8. Dependency graph and execution order

```text
Step 6
S6-1 tokens ─┬─> S6-2 crown ─> S6-3 exact geometry
             └─> S6-4 propagation/recovery
S6-5 phone mounted-notice boundary
S6-6 dependency/Quorum/canonical-entrypoint ledger
       │
       v
Step 7
S7-1 dual draft ─> S7-2/S7-3/S7-4
S7-5 temporal foundation ─> S7-6 Time Group ─┐
                         └─> S7-7 Scene schema ─> S7-8 Scene Studio ─> S7-9 Time Content
S7-10 session-only exact-stage draft ─> S7-11 Destination/placement proof
                                    └> S7-12 Chart type/catalogue ─> S7-13 Data source/profile
                                        └> S7-14 Map/prepare + linked ownership ─> S7-15 Configure/render proof ─> S7-16 Review/create
S7-5 + S7-6 + S7-7 ─> S7-17 View Chrono
S7-18 plot states; S7-19 source/fidelity after owning slices
       │
       v
Step 8
S7-7 Scene datePosition ─> S8-1 protocol ─> S8-2 lifecycle/close outcomes ─> S8-3 controller ─┐
                                                      └──────> S8-4 Audience ─┤
S8-1/S8-3 ─> S8-5 composition; S8-2 ─> S8-6 reference approval + connection icons              ├─> S8-7 fidelity
S6-6 + completed Steps 7/8 ─────────────────────────────────────────────────> S8-8 runtime boundary
       │
       v
Step 9 final acceptance
```

Execution order is Step 6; Step 7 in the dependency order shown; Step 8 only after S7-7 validates/persists `audience.datePosition`; then return to the V3 Design master task for Step 9 review. Passing Steps 6–8 does not declare Step 5 or the redesign accepted.

## 9. Requirement-to-task traceability

| Requirement family | Exact tasks |
|---|---|
| Shared mode/model, crown, responsive boundary | S6-2, S6-5 |
| Tokens/styles/profiles/appearance/focus/state grammar | S6-1, S6-4; exact component owners F-04/F-05 |
| Exact View/Build geometry | S6-3; regression in S7-2, S7-19 |
| Dual layout/chart drafts and auxiliary parking | S7-1; consumers S7-3, S7-4, S7-6, S7-8, S7-9, S7-10 |
| View focus/comparison, collection/Orbit, structure/Scenario | S7-2, S7-3, S7-4 |
| Temporal schema/migration/ledgers/matching/provenance/Needs-attention | S7-5 |
| Time Group Studio/Availability | S7-6 |
| Saved Scene contract/date position/two-stage UI | S7-7, S7-8 |
| Time Content operations/handoffs/session separation | S7-9 |
| Chart creation session state, exact six stages, Destination, Chart type/catalogue, Data source, Map/prepare linked ownership, Configure/proofs, Review/create/commit | S7-10, S7-11, S7-12, S7-13, S7-14, S7-15, S7-16 |
| Complete View Chrono | S7-17 |
| Plot recovery/source viewer | S7-18, S7-19 |
| Presentation protocol, END close request/succeeded/denied lifecycle, old-channel termination, and controller | S8-1, S8-2, S8-3 |
| Passive last-valid Audience/composition plus neutral close-denied Ended projection | S8-4, S8-5 |
| Reference-driven disconnect/reconnect glyph comparison, user approval, canonical integration, `pnpm icons:build`, generated atlas/specification, and exact names | S8-6 |
| Static launch, offline/PWA, Quorum, canonical-runtime equivalence | S6-6 freezes ledgers; S8-8 executes final checks |

### Normative temporal clause map

| Contract clauses | Exact task/evidence |
|---|---|
| Vocabulary, one dashboard IANA zone, explicit UTC migration, saved/derived boundary, atomic drafts | S7-5; authoring draft commits S7-6–S7-9 |
| Default Chrono sorted unique observation union | S7-5 |
| Frame-source **All available** versus **Selected frames**; calendar mandatory Scene start/end, shortened final interval, 24-hour days, leap-year and month-end behavior | S7-5 |
| Containment/change consequences and group shortening | S7-5 derivation, S7-6 explicit edit-or-clamp |
| Matching hierarchy; **Concurrent only**, **Interpolate**, **Snap to Latest**, and **Snap to Closest**; closest ties choose the earlier observation; unsupported-policy reasons | S7-5 |
| Interpolation eligibility and no extrapolation | S7-5 |
| Provenance, signed/mixed offsets, accessible labels | S7-5, display S7-17 |
| Time Group stages/defaults/review/availability/cadence | S7-6 |
| Full Scene semantics and earlier five-stage obligations | S7-7; two-stage interaction S7-8 |
| Copy/move/delete and repair consequences | S7-9 owner operations/handoffs |
| View Chrono **All page charts** versus **Group only**, availability/colour association, direct seek/frame-period context, authored plus session matching, **Reveal to frame** default, **Full timeline** marker, **Scene-focused** projection, deck/mast continuity, endpoint and all safety pauses | S7-17 |
| Present/Audience authored/session settings/playback/passive recovery | S8-1–S8-5 |
| Temporal error/repair | S7-5 Needs-attention, S7-9 repair; rejection S8-1/S8-4 |
| Temporal accessibility/responsive fixtures | S7-6, S7-8, S7-9, S7-17 targeted tests; final matrix Step 9 |

### Normative chart-creation clause map

| Clause family | Exact task/evidence |
|---|---|
| `ACCESS-01..18`, `COVER-01..10` | S7-10 session draft/access; S7-11–S7-15 stage-specific validation; S7-16 review/create/recovery/handoff |
| `AUTH-01..08`, `OWN-01..12`, `LIFE-01..06`, `STATE-01..20` | S7-10 application-session-only suspend/resume and meaningful exit warning; S7-14 uncommitted companion versus durable repair ownership; S7-16 commit lifecycle |
| `CAT-01..08` | S7-12 Chart type and registry-authoritative catalogue |
| `DEST-01..15` | S7-11 Destination and independent placement proof |
| `SOURCE-01..14` | S7-13 Data source/geography profiling and revision drift |
| `INPUT-01..10`, `TEMP-01..11` | S7-10–S7-16 exact-stage journey; S7-14 temporal memberships, linked fallback/new-group proposals, and separate durable repairs; temporal semantics consume S7-5 |
| `MAP-01..09` | S7-14 Map and prepare data |
| `CONFIG-01..05` | S7-15 Configure chart |
| `PREVIEW-01..08` | S7-15 independent render proof; S7-11 independent placement proof; neither is a stage |
| `REVIEW-01..05`, `FIX-01..15` | S7-16 Review and create, pre-write revalidation, and fixture journeys |
| `COMMIT-01..09`, `HANDOFF-01..06` | S7-16 serialized non-cancellable atomic commit, ambiguous-outcome reconciliation, duplicate prevention, and durable committed-content handoff recovery |
| `STAGE-01..10` | S7-10 exact reducer order: Destination → Chart type → Data source → Map and prepare data → Configure chart → Review and create; S7-11–S7-16 own the matching UI/validation; no Proof stage |
| `DEFER-01..11` | Explicit visual deferrals remain deferred; S7-10 rejects any extra stage and S7-11/S7-15 keep placement/render proofs as validations |

All normative temporal sections and all chart-creation requirement families have an exact owner; none relies on an unspecified “owning slice.”

## 10. Exact geometry proof and phone boundary

S6-3 captures View and Build with identical content/state at `768x1024`, `1024x768`, `1200x900`, and `1440x900`. It compares stable IDs and DOMRects for:

- canonical canvas;
- canonical grid;
- every section;
- every panel/placement;
- every chart plot.

For each `x`, `y`, `width`, and `height`, compute the absolute delta, round with `toFixed(2)`, and require the string `0.00`. Missing/extra IDs fail before dimensions. Any non-zero rounded delta fails; do not use a numeric tolerance.

The `390x844` phone test is separate: Build and Present remain mounted and operational; the non-dismissible notice is above product chrome; **Switch to View** is available; resizing with simultaneous dirty layout/chart drafts preserves both, focus target, scroll, and session. Phone is not part of the exact authoring-geometry acceptance matrix.

## 11. Step 9 verification hooks

Steps 6–8 leave these named hooks for final acceptance:

- `tests/e2e/v3-shell-fidelity.spec.js`: exported `WORKSPACE_VIEWPORTS`, `readCanonicalGeometry`, and `compareCanonicalGeometry` helpers.
- `tests/e2e/v3-build-workspace.spec.js`: simultaneous layout/chart drafts, parked auxiliary, structure, collection, and restoration fixtures.
- `tests/e2e/v3-temporal-authoring.spec.js`: Time Group, Scene, Time Content, repair, and return-context fixtures.
- `tests/e2e/v3-chart-creation.spec.js`: application-session-resumable exact six-stage draft, reload loss, meaningful exit warning, Chart type catalogue, independent proof revisions, companion/durable-repair ownership, drift, ambiguous outcome, and durable committed handoff fixtures.
- `tests/e2e/v3-view-chrono.spec.js`: scope, source, seek, trace, availability, movement, endpoint, and safety-pause fixtures.
- `tests/e2e/v3-present-audience.spec.js`: valid/invalid Scene, holding/blank/blackout, disconnect/reconnect, END close succeeded, END close denied/surface remains, neutral Ended projection, old-event rejection, explicit new-session allocation, and last-valid fixtures.
- Stable selectors: `data-dashboard-mode`, `data-dashboard-surface`, `data-canonical-page-id`, `data-canonical-canvas-id`, `data-canonical-grid-id`, `data-canonical-section-id`, `data-canonical-panel-id`, `data-canonical-placement-id`, `data-canonical-plot-id`, `data-authoring-surface`, and `data-presentation-session-state`.
- No private test backdoor such as `window.__SIMEX_TEST_PRESENTATION_STATE__`; tests drive public controls and production protocol.

Step 9 owns final 200% text, full keyboard and touch sweep, screen-reader journey, all-mode viewport UAT, and room-distance Audience judgment. It does not own known F-01–F-13 repairs.

## 12. Material decisions

No material design decision requires reopening Step 4. Low-risk calibration may choose exact orbit clamp, Context Shelf width, drag increment, or Audience type scale only within accepted structure and invariants. If implementation evidence demands a change to ownership, stage count, shell hierarchy, canonical geometry, phone behavior, Live Sidecar placement, or Scene/Audience information structure, stop and escalate to the V3 Design master task.

## 13. Plan set

- `docs/superpowers/plans/2026-08-19-v3-step-6-shared-foundation.md`
- `docs/superpowers/plans/2026-08-19-v3-step-7-build-view.md`
- `docs/superpowers/plans/2026-08-19-v3-step-8-present-audience.md`

Each task in those plans declares exact files, consumed/produced interfaces, concrete failing tests, full commands and expected results, implementation behavior, one passing command, and one atomic commit. Those commit boundaries are future implementation work; Step 5 does not authorize production changes.
