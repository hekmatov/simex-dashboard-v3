# SimEx consolidated development roadmap — 19 September 2026

**Document version:** 1.19; updated 27 September 2026. Dated Markdown with Git history, as requested. This is a plan version, not an application release. Coordination follows the adopted version 2 agreement.

**Goal:** Deliver an exercise tool whose prepare → run → debrief loop is dependable, faithful across surfaces, usable by exercise staff, and ready for an approved PDPC deployment.

**Architecture:** Retain the static/offline React application, shared View/Build renderer, native chart V3 contract, transactional package boundaries, and passive Audience output. Add faithful authoring geometry, an Audience-owned frame stream, one time cursor, and cross-page Storylines incrementally. Preserve the separately developed scenario-authoring tools and their source/provenance contracts.

**Stack:** React 19, Vite 6, JavaScript, ECharts 5, CSS tokens, BroadcastChannel, Node tests and Playwright. No new backend is assumed.

**Status:** M0 is in progress. The compact checkpoint below is the current coordination state; section 5 retains the detailed assignment and evidence. Implementation remains unmerged.

**27 September handoff incorporation:** the user directed this steward to use the [pre-M0 handoff](../../fable-pre-m0-handoff-2026-09-27.md), update this roadmap and create the first implementation task. Its earlier review-before-dispatch hold is satisfied by that direction. The prepared checkpoint contains the existing redesign, PDPC deliverables and corrected Eldoria export. Scenario-authoring remains paused. The M0 owner subsequently refreshed both remote mains at `c003d111` and established its branch at `15a2daf4`; its bounded repair is recorded below. Publishing and the rest of M0 stabilization remain outstanding.

**Execution:** Implement coherent work packages with the repository's proportional workflow budget. Existing design documents already contain implementation detail; create an additional design only for a material unresolved contract. Task annotations below apply to their actions, deliverables and checks unless a sentence carries a more specific annotation. No agent roster or recurring monitor is created by this plan.

**Coordination agreement, version 2 adopted 27 September:** every Fable steward, high-level coordinator, milestone owner and replacement follows [FABLE-COORDINATION.md](../../FABLE-COORDINATION.md). Assign coherent packages, delegate internal sequencing, reconcile direct closeouts at package completion or material blockers, then advance accepted work. Preserve in-flight criteria; define broader packages at the next coherent boundary. Maintain one compact current checkpoint here, with links to detailed criteria and evidence. Routine internal repairs do not require a separate roadmap revision or coordinator turn. This supersedes earlier per-repair handback instructions; approval and task-creation boundaries remain intact.

**Model and context preferences:** use Sol / Medium for routine coordination and straightforward repairs; use High for difficult contract/debug work and justify stronger settings by the actual decision. Record the setting once and repeat the reason when it changes. Each assignment retains explicit reporting authority and the current destination ID. Read this plan's checkpoint/current assignment and relevant changed evidence; consult other sections on demand. The agreement contains the reusable prompts and renewal rules.

## Current coordination checkpoint

**Outcome and acceptance:** restore the V4 migration and V6 package round-trip browser journey with retained managed source/media content and rendering after the browser goes offline. The next M0.2 package is Journey G in `source-content-portability.spec.js`; it is a browser import/export and content-continuity check, not the separate fresh-build/platform release gate. The owner sequences fixture, browser-consumer and direct product repairs internally.

**Owners and reporting:** planning steward `01a0d085-14b6-7882-9994-12c2b6652a2b`; combined implementation/coordination owner `01a0e2c9-c986-7ec2-96f2-63b2ed428b0a`, both local. Direct package closeout/material-blocker messages to the steward are user-authorized. Replacements update this route and notify active owners. Stewardship stays Sol / Medium; Journey G uses Sol / High because it spans V4 migration, V6 serialization, source/media identity, separate-context import and offline rendering.

**Code and accepted evidence:** continue in `.worktrees/fable-preparation`, branch `codex/fable-m0-source-fixture`, from clean `cab48a30e815b28b97af8430af31ef285ee1c2b3`. M0.1 activation and sixteen bounded predecessors are reconciled. Latest [E25 closeout](../../../.worktrees/fable-preparation/docs/fable-m0-media-lifecycle-handoff-2026-09-27.md) supports media Journeys A/B 2/2 and affected retry/resume 1/1, with a scoped fullscreen stacking fix and clean review. E20–E24's evidence remains prior evidence. No whole-suite, browser aggregate or release gate is implied.

**Next action and limits:** the existing owner carries Journey G under the [version 2 agreement](../../FABLE-COORDINATION.md), reporting at package completion or a material blocker. Preflight current page/section, V3 map validity, managed source/media bundle, package controls and separate-context destination before the long browser run; isolate repeated setup failure. Other M0.2 consumers, portable full-package/Audience verification and M0.3–M0.6 remain open. Preserve authored content and paused scenario work; integration, publishing, human acceptance and task creation retain their authority boundaries.

## 1. Baseline and answer to “do we have a plan?”

Yes, there are existing development plans, but they do not provide one current dashboard-to-deployment roadmap:

- The August V3 reconciliation index organizes Steps 6–9. Its acceptance record reports technical completion with deferred defects and historical human visual approval still pending. Later changes supersede parts of its UI and temporal design.
- The corrections sprint, dense desktop amendments, PDPC release factory, and September 18 decision-surface plan provide feature-specific plans. An unchecked historical checkbox is not evidence that the feature remains unimplemented.
- The scenario-authoring workstream has a current `DEVELOPMENT-PLAN.md` and `CURRENT.md`, updated September 10: scoped S-M1 and S-M2 complete, S-M3 engineering delivered but final facilitator review pending, S-M4–S-M6 still ahead.
- Repository `.planning/.continue-here.md` is an August 4 icon-design checkpoint. It is not a current product roadmap; the later icon atlas and implementation records supersede that historical pause.
- No `docs/ROADMAP.md` existed before this consolidation. It now points here rather than duplicating this plan.

### Historical Git facts checked on 19 September

| Item | Observed revision/status | Consequence |
| --- | --- | --- |
| Refreshed `origin/main` | `c003d11174f247acac10879274e73d9434c67096` | The latest local redesign is not on this remote branch at inspection. |
| Refreshed `public/main` | Same `c003d111` | The two published baselines agree. |
| Local `main` | `0e7e9e33`, “Merge View and Build decision surface”, 39 commits ahead | This is the available merged redesign assessed here. |
| Requested design cutoff | `0aab4b9e233560cb1538c9fa3bafcb2a227aa0ea` | Five September 19 design documents exist through this commit. They are unchanged in local merge `0e7e9e33`. |
| Scenario planning branch | `docs/aster-28-scenario-specs` at `37469185` | Later than the September 8 status snapshot; use its September 10 reconciliation. |
| Scenario candidate | `feat/m3-communication-candidate` at `91105ec3` | Distinct, unmerged work; do not assume its capabilities are on dashboard main. |

These September 19 observations are historical. The September 27 baseline below supersedes them for new implementation; scenario candidates remain separate and unmerged.

### Prepared implementation baseline — 27 September

| Item | Revision / evidence | Use and limit |
| --- | --- | --- |
| Code checkpoint | Annotated tag `fable-pre-m0-2026-09-27`, peeled commit `e7e58c8432987403767d4fc973fa30df41f91cd8` | Contains the redesign and both non-scenario carry-forwards; preserve this tag. Resolve with `git rev-parse 'fable-pre-m0-2026-09-27^{commit}'`, since the bare tag names a tag object. |
| Canonical local main and detached preparation checkout, before this roadmap edit | `cdfc7a6a69f77f9568dcf6454760956717ecf160`, clean | Only the cleanup handoff changed after the tagged code checkpoint. The implementation task must also include this roadmap update. |
| Last refreshed published baseline | `origin/main` and `public/main`: `c003d11174f247acac10879274e73d9434c67096` | Reported by preparation; cached refs agree at planner inspection. No new remote refresh or publication claim is made here. |
| Incorporated carry-forwards | PDPC profile `58c4650a`; single-file deliverables `cd5f1f83` | Already integrated with ancestry preserved. Keep paired Cloudflare ZIP/offline HTML outputs, release-only Light default and explicit saved choices; PDF output remains removed. |
| Predecessor verification | Handoff reports 17 focused release tests passing on 27 September, plus theme-transform and Eldoria CSV checks | Scoped reconciliation evidence only. No production release, browser journey or full unit/build/E2E gate was run. Reuse unchanged evidence. |

That preparation checkout was activated on branch `codex/fable-m0-source-fixture` at `15a2daf4`; its current reconciled implementation tip is `cab48a30e815b28b97af8430af31ef285ee1c2b3`, following the source, fixture, driver, CSV, profile, catalogue, semantic, theme, shipped-content, analytical, GeoJSON/CSV, manager and media browser slices. The owner reported refreshed remote refs/ancestry and no newer export at activation; the steward verified the clean current checkout and commit inventory. Continue there without repeating baseline preparation or merging the implementation into main. Preserve authored content: the old September 9 export in the detached `temp-cloudflare-version` checkout is already represented on main and must not be re-promoted; unexported browser storage was not inspected.

Non-scenario branch references were cleaned up by the user's earlier direction; their recovery bundle and preserved detached/dirty checkouts are indexed in the handoff. Do not repeat cleanup, merge old experiments wholesale or modify paused scenario branches. Publication remains a separately authorized action.

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
| E9 | [September 27 pre-M0 handoff](../../fable-pre-m0-handoff-2026-09-27.md) | Reconciled local checkpoint, 17-test predecessor evidence and its limits, PDPC packaging constraints, preserved cleanup recovery, paused scenario scope and bounded first M0 assignment. |
| E10 | [M0 source/fixture closeout, September 27](../../../.worktrees/fable-preparation/docs/fable-m0-source-fixture-handoff-2026-09-27.md) | Unmerged `cdf83abd`: activation, embedded-source portable fix, 19 deterministic checks and one offline Chromium loader check, scoped review, and explicit remaining M0 work. Read and reconciled; no planner rerun. |
| E11 | [M0 dashboard fixture/reset closeout, September 27](../../../.worktrees/fable-preparation/docs/fable-m0-dashboard-fixture-handoff-2026-09-27.md) | Unmerged `1758963d`: representative native V3 fixture, context-local harness selection/reset, five deterministic and three focused browser cases, scoped review and explicit limits. Read and reconciled; no planner rerun. |
| E12 | [M0 chart-driver closeout, September 27](../../../.worktrees/fable-preparation/docs/fable-m0-chart-driver-handoff-2026-09-27.md) | Unmerged `aeba6848`: stable shared stages/fresh-resume actions, three passing representative/interface/render-proof journeys, syntax checks and corrected review finding. Five larger touched title cases remain explicitly not run. |
| E13 | [M0 CSV authoring closeout, September 27](../../../.worktrees/fable-preparation/docs/fable-m0-csv-authoring-handoff-2026-09-27.md) | Unmerged `133c8d4f`: two pie/draft cases use valid fixture data and retain their assertions; Journey D passed unchanged. All three exact titles passed in one selection, with scoped review and no production change. Supersedes E12's not-run status only for those three titles. |
| E14 | [M0 profile/reconciliation closeout, September 27](../../../.worktrees/fable-preparation/docs/fable-m0-profile-reconciliation-handoff-2026-09-27.md) | Unmerged `db090e7f`: five exact historical profile titles pass with explicit edge-case fixtures and current shipped parser/generator equality. Generator-coverage review finding corrected and re-reviewed. Saved unit/browser reports and later scoped passes are linked; other historical cases remain unverified. |
| E15 | [M0 catalogue closeout, September 27](../../../.worktrees/fable-preparation/docs/fable-m0-catalogue-consumers-handoff-2026-09-27.md) | Unmerged `5b1c4ed0`: all 15 historical catalogue cases disposed, full file 41/41 passing, valid invariant fixtures plus real shipped coverage/digest/artifact identity, scoped review, no production or generated-output change. |
| E16 | [M0 semantic-boundary closeout, September 27](../../../.worktrees/fable-preparation/docs/fable-m0-semantic-boundary-handoff-2026-09-27.md) | Unmerged `f109662b`: nine historical cases disposed; runtime profiles excluded from catalogue identity, strict preflight before cloning, only two persisted digest fields refreshed. Semantic 72/72, catalogue 41/41, assigned V6 roundtrip 1/1 and loader/promotion 2/2 passed; scoped review gap corrected and re-reviewed. |
| E17 | [M0 theme-consumer closeout, September 27](../../../.worktrees/fable-preparation/docs/fable-m0-theme-consumers-handoff-2026-09-27.md) | Unmerged `b57813ab`: all four historical theme/PDPC titles pass (3/3 plus 1/1), strict semantic inputs and authored-versus-fallback choices separated, scoped review clean. Tests only; no shipped/default/production changes. |
| E18 | [M0 shipped-dashboard/Home closeout, September 27](../../../.worktrees/fable-preparation/docs/fable-m0-shipped-dashboard-home-handoff-2026-09-27.md) | Unmerged `22644dfa`: six selected titles pass; exact 3-page/8-section/17-panel type/source coverage, eight CSV and nine static paths, Home/source retention, alias formatting only. Source-binding review gap corrected and re-reviewed; five analytical cases remain open. |
| E19 | [M0 analytical-fixture closeout, September 27](../../../.worktrees/fable-preparation/docs/fable-m0-analytical-fixtures-handoff-2026-09-27.md) | Unmerged `03b88257`: five assigned titles and four derivative owner tests pass; tracked manifest/projections retained, explicit duplicate/collection/clock/geography examples. Checkout-line-ending review issue corrected with hash-matched authority and re-reviewed. No production/public changes. |
| E20 | [M0 geography-authoring closeout, September 27](../../../.worktrees/fable-preparation/docs/fable-m0-geography-authoring-handoff-2026-09-27.md) | Unmerged `1889326b`: three historical titles plus property-only join regression pass (4/4); validated local map adapter, ready wizard/editor previews, missing-source diagnostics, stale invalidation and recovery. Scoped review clean; no product/shared-fixture/browser change. |
| E21 | [M0 catalogue/collection package closeout, September 27](../../../.worktrees/fable-preparation/docs/fable-m0-catalogue-collection-reliability-handoff-2026-09-27.md) | Unmerged `4274702f`: four historical fixture/source consumers disposed; valid KPI remap, 2×1 collection footprint, separate preparing timeline and all nine shipped CSV name/profile bindings. Final four-file selection 21/21; duplicate-date review finding corrected and re-reviewed. Tests/fixtures only. |
| E22 | [M0 browser GeoJSON package closeout, September 27](../../../.worktrees/fable-preparation/docs/fable-m0-browser-geojson-handoff-2026-09-27.md) | Unmerged `c2d2b206`: fresh chronological choropleth and GeoJSON Journeys I/J/K pass together in Chromium, 4/4. Current source/destination preflight, syntax and diff checks passed; scoped review clean. Test/helper changes only; no production or shipped-content change. |
| E23 | [M0 browser CSV replacement closeout, September 27](../../../.worktrees/fable-preparation/docs/fable-m0-browser-csv-replacement-handoff-2026-09-27.md) | Unmerged `cd0e72b2`: Journeys E/F pass together in Chromium, 2/2. Incompatible replacement preserves map/source; temporal relink warns, marks review and permits repair; an actual Audience state omits internal review metadata. Vacuous protocol assertion corrected and re-reviewed. Test and handoff only. |
| E24 | [M0 Source content manager closeout, September 27](../../../.worktrees/fable-preparation/docs/fable-m0-source-manager-handoff-2026-09-27.md) | Unmerged `fedff893`: compact Build commands and desktop manager journeys 2/2; tablet shared-helper consumer 1/1. Current uploaded CSV and packaged image replace empty historical filters; fixture helper restores missing shipped geometry before validation. Tests/handoff only; no product/public change. |
| E25 | [M0 media lifecycle closeout, September 27](../../../.worktrees/fable-preparation/docs/fable-m0-media-lifecycle-handoff-2026-09-27.md) | Unmerged `cab48a30`: Journeys A/B 2/2 and affected retry/resume 1/1 in Chromium. Media cleanup, identity, reuse, import, replacement and Build/View/fullscreen rendering retained. View frame stacking fixed for immersive fullscreen close; scoped review clean. No media schema/public-content change. |

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
| Shared chart-workflow driver | Delivered within scope at unmerged `aeba6848`; broader callers not all verified | Stable workflow IDs and explicit fresh/resumed entry established. Continue bounded consumer repair; do not repeat the driver extraction or infer a whole-suite pass. [E7, E12] |
| CSV pie/draft and upload/catalogue consumers | Three selected titles passed at unmerged `133c8d4f` | Preserve current fixture mappings, original authoring/draft requirements and Journey D's passing unmodified workflow. GeoJSON/playback and other historical consumers remain open. [E13] |
| Dataset-profile consumer cluster | Five assigned historical titles passed at unmerged `db090e7f`; portable case already supported by E10 | All six historical failures in that file have scoped subsequent evidence; this is not a full-file or repository result. Other unit families and browser cases remain unverified. [E10, E14] |
| Catalogue-contract consumer cluster | Fifteen historical cases disposed at `5b1c4ed0`; full file passed 41/41 again after the semantic fix at unmerged `f109662b` | Preserves catalogue v2/chart V3 distinction, strict negative cases and real shipped coverage. E16 supersedes the generated identity after excluding runtime profiles. [E15, E16] |
| Semantic boundary and portable V6 roundtrip | Nine historical cases disposed at unmerged `f109662b`; affected checks pass | Safe hydrated profiles remain accepted but non-semantic; raw and app-stripped input now match the persisted catalogue. Accessor/cycle preflight and package/runtime consumers verified within scope. [E16] |
| Theme validation and saved choices | Four assigned historical cases passed at unmerged `b57813ab` | Default structural strictness, blank descriptions, invalid-value rejection, Ledger/Steel fallback and explicit PDPC/Humanist choices retained. No whole-file or rendered-style claim. [E17] |
| Shipped dashboard and Home consumers | Six assigned historical titles passed at unmerged `22644dfa`; the five deferred analytical cases subsequently pass at `03b88257` | E18's shipped placement/source/static coverage is retained. E19 resolves the five missing-example contracts separately; together they dispose all ten historical default-dashboard failures plus the Home case, without a new full-file result. [E18, E19] |
| Geography-authoring components | Three historical cases and adjacent property-only regression passed at unmerged `1889326b` | Known joined values, fresh selection, stale preparation and conversion recovery verified in component checks. Browser GeoJSON/replacement journeys remain open. [E20] |
| Catalogue and collection consumers | Four historical cases pass at unmerged `4274702f`; affected-file selection 21/21 | Preserves conversion, layout, temporal exclusion and shipped source/profile contracts with valid inputs. Browser GeoJSON flows and full-package launch remain open. [E21] |
| PDPC release factory | Implemented foundation | Reuse for M4; revalidate only changed release boundaries. [E6] |
| PDPC paired ZIP/single-file HTML, Light default and Eldoria export | Integrated in the prepared checkpoint; focused predecessor evidence recorded | Preserve through M0 source/code-splitting changes; actual generated-output/launch evidence remains for the affected boundary and M4. PDF output stays removed. [E9] |
| M0 activation and portable embedded-source repair | Complete within the first assigned slice at unmerged `cdf83abd` | M0.1 established; bounded M0.2/M0.3 owner evidence accepted. Subsequent fixture/launch evidence is in E11; broader driver and platform/build exits remain open. [E10] |
| M0 representative dashboard fixture/reset | Complete within the second assigned slice at unmerged `1758963d` | Fixture View/Build/Present, QMD save/reload/reset, missing-source recovery and separate shipped launch evidenced. Shared-driver/failure inventory, Audience and platform/build exits remain open. [E11] |
| Scenario S-M1/S-M2 | Scoped complete, unmerged | Retain; no repeat implementation. [E5] |
| Scenario S-M3 | Engineering A–D delivered, human E pending; workstream paused 27 September | Preserve candidate; no review or correction work until the user resumes it. Dashboard M3 may use another accepted exercise. [E5] |
| Scenario S-M4/S-M5/S-M6 | Planned, not completed; paused 27 September | Retain section 9 as future work; do not make dashboard progress depend on this track. [E5] |

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
| M0 Stable ground | Reliable source, tests, builds and recoverable startup | Activation and sixteen bounded predecessors on unmerged owner branch | Open; Journey G browser package round trip assigned |
| M1 Fidelity | Authoring and monitor accurately represent their destinations | M0 core fixture/build recovery | Designed, not implemented |
| M2 Time and story | One visible cursor and reusable cross-page Storylines | M1 geometry/monitor contracts | Designed; additive transition before V7 |
| M3 Exercise rehearsal | Staff can prepare/run/debrief on actual devices | M1/M2; accepted exercise content | Pending; includes remaining mobile Option 1 |
| M4 Deployment readiness | Governed, supportable release and real pilot | M3 blockers closed | Pending |

Code splitting belongs in M0; remaining mobile changes follow M1. Scenario-authoring is paused by the user. Accepted exercise content must exist before the full dashboard M3 rehearsal; use another accepted package while S-M3 is paused. Scenario authoring, its model evaluations and S-M3 acceptance are not prerequisites for dashboard M0–M2.

**Verification discipline [E7, C5]:** add durable regressions for changed product behavior/concrete defects. Use nearest owner checks while changing code; run the complete task-specific selection once on the final candidate. Preflight fixtures, source IDs, controls and environment before browser work. Isolate setup after two failures. Repeat only invalidated checks. At explicitly declared integration/pre-merge/milestone-release gates, run required full checks once and preserve native results outside Playwright's cleared `test-results` directory. Do not call a subset a complete gate.

**Demo and versioning [C5, N]:** each milestone ends with a short demonstration to an exercise practitioner and actionable notes under `docs/demos/`. Keep application releases at `0.x` until the pilot qualifies 1.0; add user-facing `CHANGELOG.md` entries and tagged releases at actual release boundaries. The package keeps its own schema version. Human review, deployment authority, branding decisions and real exercises are dependencies, not results an agent can manufacture.

## 5. M0 — Stable ground

**Purpose:** establish a trustworthy development and verification baseline before changing fidelity or time behavior. **Owner responsibility:** repository/runtime foundations; no scenario content decisions.

### Reconciled first slice — baseline, portable source and fixture

**Completed within scope [E10]:** `cdf83abd109b10c538b7684bbdfb542c0d0d8aa4` on `codex/fable-m0-source-fixture`, based on `15a2daf4`. The builder now handles embedded GeoJSON/CSV and inline data according to existing loader/promotion contracts, reads only path-backed sources from disk and reports actionable asset errors. Runtime/schema/promotion contracts and authored content were unchanged. Evidence dated 27 September: 19 deterministic checks, one copied-file offline Chromium loader check and one scoped review with no actionable findings. Reuse these results when unaffected. This is loader-boundary evidence, not rendered-dashboard, service-worker, platform/build or release evidence; code remains unmerged.

### Reconciled second slice — representative dashboard fixture and reset smoke

**Completed within scope [E11]:** `1758963da9b7754d753b2b32c69fd230b9fa2d9b`, based on `cdf83abd`. Four native V3 panels cover temporal/static charts, QMD and packaged media; context-local opt-in harness selection leaves default shipped delivery unchanged. Evidence dated 27 September: five deterministic cases and three focused Chromium cases cover View rendering, QMD edit/save/reload, eligible Present controls, reset with unchanged public-file hashes, missing-source recovery and separate shipped launch. One scoped review found no actionable issue. A locator-only correction reused the already passing editing/reset journey. No app/public/schema change or full platform/build/Audience claim; predecessor checks remain valid without reruns.

### Reconciled third slice — chart-authoring driver and representative consumers

**Completed within scope [E12]:** `aeba684813251c89fea7577200bd39669c97d106`, based on `1758963d`. The shared driver uses existing stage IDs/workbench state and explicit fresh/resume/Next/Previous/suspend/create actions. Three focused Chromium titles passed on 27 September: six-stage suspend/single-commit/reload, visible interface labels/order/statuses with original geometry/contrast, and an existing stage/render-proof consumer. Seven changed JS files passed syntax checks. Scoped review's GeoJSON caller const-reassignment finding was corrected and rechecked. No production/public/schema changes. Five larger CSV/GeoJSON/playback title cases migrated for Resume were not run; retain that limit and prior unaffected evidence.

### Reconciled fourth slice — CSV authoring and draft consumers

**Completed within scope [E13]:** `133c8d4f5feda06e4ee11ba966eb0a251f66285c`, based on `aeba6848`. Two pie/draft cases use the real fixture category/numeric columns, preserving progressive authoring, suspend/resume/discard, pending ownership, style and persistence; saved source/mappings and absence of an incomplete canvas chart are explicit. Journey D's own CSV/destination required no change. All three assigned Chromium titles passed together on 27 September (1.2 minutes), with syntax/diff checks and scoped review finding no issue. No production/helper/fixture contract change or retry; prior evidence remains valid. This resolves three of E12's five unrun cases, not every CSV or authoring test.

### Reconciled fifth slice — dataset profiles and saved-result cross-reference

**Completed within scope [E14]:** `db090e7ff66daa5e482bf46077f0570b7e75e406`, based on `133c8d4f`. Five assigned titles pass together with explicit day-first metadata, numeric/category facts, 177-day national clock and 354 first-date municipal rows/415 distinct-day clock fixtures. Current shipped CSV descriptors retain exact parser/profile-generator equality. A generator-metadata coverage gap found in scoped review was corrected and re-reviewed. No product/generated/shipped change; prior portable case evidence is retained. The handoff links historical native reports and later scoped passes with their limits; broader title reconciliation is still needed before any complete M0 gate claim.

### Reconciled sixth slice — catalogue-contract consumers

**Completed within scope [E15]:** `5b1c4ed062ddf0626c03723c52638a003570d891`, based on `db090e7f`. All 15 historical exact-title failures are individually disposed; the full catalogue file passed 41/41 on 27 September. In-memory representative groups/collection shapes preserve strict invariant and negative-validation cases; actual shipped type/chart coverage, raw/normalized identity and persisted snapshot equality remain intact. Scoped review found no actionable issue. No production, public or generated artifact changed; earlier evidence remains valid.

### Reconciled seventh slice — semantic boundary and portable V6 roundtrip

**Completed within scope [E16]:** `f109662ba22d3876e620ceb5392fb03863f62871`, based on `5b1c4ed0`. The shared structure contract declares profiles runtime/non-semantic and the app strips them before matching; the producer previously included embedded profiles in canonical bytes. Safe hydrated profiles now produce the same catalogue identity as profile-stripped input, with strict accessor/cycle checks before migration clones them. Only the persisted semantic and enclosing digest fields changed. The nine historical cases have explicit dispositions, including replacement of the obsolete profile-rejection expectation. Semantic 72/72, catalogue 41/41, assigned roundtrip 1/1 and two loader/promotion checks passed. A nested preflight gap found in scoped review was fixed and re-reviewed; no broad/build/browser/release gate ran.

### Reconciled eighth slice — theme validation and saved choices

**Completed within scope [E17]:** `b57813abf8ba3a4e015274313c58a0aa068f4c64`, based on `f109662b`. The three assigned dashboard-theme titles and one PDPC title passed. Tests remove only runtime profiles for the strict structural boundary, retain explicit default rejection of hydrated input, and preserve blank descriptions and invalid style/profile/mode diagnostics. Authored PDPC/standard colours survive normalization; generic missing/retired choices retain Ledger/Steel fallback, and explicit valid Humanist/PDPC values survive normalization or presentation snapshots. Scoped review was clean. Only tests and the closeout changed; no production, shipped content or broader gate.

### Reconciled ninth slice — shipped dashboard and Home consumers

**Completed within scope [E18]:** `22644dfa8cf23e96102be7c559556c6fb7ab1170`, based on `b57813ab`. All six assigned titles passed. Tests pin three authored pages, eight sections, 17 panel type/source bindings, eight CSV preparation/rendering paths, nine supported static paths and the packaged image asset. Home remains a preference and three unplaced managed sources remain in the library. The alias file was reformatted to the existing deterministic two-space expectation without changing parsed content. A source-binding coverage gap found in scoped review was fixed and re-reviewed. Five analytical cases remain open; no full-file, browser or broader gate is claimed.

### Reconciled tenth slice — analytical fixtures

**Completed within scope [E19]:** `03b882571fb2385890c836ef9e5d15fb4a19e93d`, based on `22644dfa`. All five analytical titles and four municipal derivative owner tests passed. The actual authority, manifest and three derivative projections remain checked; small native V3 examples retain duplicate-policy/comparison values, full-history KPI/Bullet collections, nonempty clocks and complete changing geography with one initial frame. Scoped review identified Windows line-ending portability; choosing LF/CRLF bytes only when they match the recorded hash fixed it, with bounded re-review. E18's valid shipped evidence was retained. No product/public change or new full-file/build/browser claim.

### Reconciled eleventh slice — geography-authoring components

**Completed within scope [E20]:** `1889326bdd8da7ff3231a0aefb70581a3366fc1c`, based on `03b88257`. All three assigned titles plus the property-only GeoJSON regression passed (4/4). A local adapter uses the unchanged E19 fixture, preserving known joins and ready wizard/editor previews. Fresh missing-GeoJSON diagnostics, immutable source selection, stale-key invalidation, valid reselection and conversion recovery remain asserted. Scoped review was clean; no product/public/shared-fixture/browser-driver change. Browser geography journeys remain open.

### Reconciled twelfth package — catalogue and collection consumers

**Completed within scope [E21]:** `4274702fc1329645457f9d3ffa254c7e494697e9`, based on `1889326b`. The four assigned historical consumers pass with a native KPI conversion example, real 2×1 collection layout and rendered pages, a distinct preparing Chrono member, and current shipped CSV names/profiles. The final affected-file selection passed 21/21. A duplicate-date fixture flaw found in scoped review was corrected and re-reviewed. Only tests, a fixture and the dated closeout changed; prior evidence stands within scope.

### Reconciled thirteenth package — browser GeoJSON authoring and replacement

**Completed within scope [E22]:** `c2d2b206247f56522e07a09b29123a31eef14ef7`, based on `4274702f`. Fresh chronological choropleth authoring and GeoJSON Journeys I/J/K use valid current sources and destinations. The exact four-title Chromium selection passed 4/4 in 2.1 minutes after fixture, join and control preflight. Syntax/diff checks and one scoped review were clean. Only browser tests, the shared landing helper and dated closeout changed; earlier accepted evidence stands within scope. Other M0.2 browser cases remain open.

### Reconciled fourteenth package — browser CSV replacement and temporal review

**Completed within scope [E23]:** `cd0e72b2591f0332a23b67fd7f2d594bdc030f34`, based on `c2d2b206`. Journeys E/F now use valid current map and temporal seeds. The exact Chromium selection passed 2/2 in 1.3 minutes. Incompatible replacement leaves the original source and rendered map intact; a temporal relink warns, marks downstream review and permits authoring repair. An actual connected Audience state omits internal `temporalReview` while flags exist. A vacuous protocol assertion found in scoped review was corrected and re-reviewed. Only the test and dated closeout changed; no product or public configuration changed.

### Reconciled fifteenth package — Source content manager commands and desktop composition

**Completed within scope [E24]:** `fedff8931b55f406909399ffd48097fbc81431b7`, based on `cd0e72b2`. The compact Build command journey passed unchanged; the desktop journey now uses a real used uploaded CSV and packaged media instead of historical empty filters. The exact two-title Chromium selection passed 2/2; the tablet journey sharing the corrected geometry fixture helper passed 1/1. Name/filter/selection persistence, deletion safety and no-overflow assertions remain. Mechanical test-only repair needed no judgment-heavy review. Other manager and media/browser work remains open.

### Reconciled sixteenth package — media creation, reuse and global replacement

**Completed within scope [E25]:** `cab48a30e815b28b97af8430af31ef285ee1c2b3`, based on `fedff893`. Journeys A/B passed together in Chromium, 2/2, and the affected retry/resume journey passed 1/1. Current page/action controls restored the full media cleanup, reuse, import, dependency and replacement journeys. A real fullscreen close-button obstruction was corrected by lifting the View frame only during immersive fullscreen. The final replacement checks retain media identity/revision/hash and placement/render continuity across Build, View and fullscreen. Scoped review was clean; no media transaction/schema or public content changed.

### Current assignment — M0.2 Journey G V4 migration and V6 package round trip

**Owner, model and start:** reuse local M0 owner `01a0e2c9-c986-7ec2-96f2-63b2ed428b0a` on **Sol / High**. Migration, serialization, managed media/source identity, separate-context import and offline rendering justify High; Astra is not needed. Start at clean `cab48a30e815b28b97af8430af31ef285ee1c2b3` in `.worktrees/fable-preparation`, branch `codex/fable-m0-source-fixture`. Follow `docs/FABLE-COORDINATION.md` version 2 and this v1.19 checkpoint; no main merge is needed.

**Outcome and ownership:** restore **Journey G — V6 offline round trip and V4 migration retain library** in `tests/e2e/source-content-portability.spec.js`. Own that spec and the smallest related fixture/support code; modify directly affected product migration, bundle or rendering code only for a demonstrated defect. Sequence preflight, browser consumer and any direct regression repairs internally. This browser journey does not close the separate M0.3 fresh-clone, platform-build or packaged-offline exits.

**First action:** preflight the current page/section and native V3 map template, valid CSV-to-GeoJSON join, packaged media payload/hash, QMD and image placements, import/export controls, separate browser context and offline request capture. The saved failure is a visibility failure; identify its first concrete fixture/control boundary before repeating the 180-second journey. Replace retired map IDs or labels using current valid data; do not weaken package identity, rendering or no-network assertions.

**Acceptance:** V4 import migrates to V6, keeps V3 charts and source entries, and has no spurious temporal review flags. V6 package export retains logical media revisions, shared asset bytes/hash, CSV and GeoJSON content, QMD media references and source/profile boundaries. Import into a fresh browser context restores the same library and visible image, QMD and joined map. After switching that context offline, mobile View and focused QMD remain visible without overflow or HTTP requests. Preserve strong persisted/configured identity assertions and actual render checks.

**Verification and return:** use nearest deterministic bundle/fixture checks before the long browser path; after two setup/locator failures isolate that boundary before another full run. Run the exact Journey G Chromium title on the final candidate and directly affected deterministic migration/bundle checks only if code changes warrant them. One scoped review covers material migration, asset or offline changes; mechanical fixture repair needs deterministic checks. Prior media/manager/CSV/GeoJSON evidence stands unless its boundary changes. No full repository/browser aggregate, full build, generated refresh, scenario work or release gate is implied.

**Limits and reporting:** other M0.2 consumers and M0.3–M0.6 remain open. The user explicitly authorizes direct package-closeout/material-blocker messages to steward `01a0d085-14b6-7882-9994-12c2b6652a2b`, host `local`; send one dated Markdown evidence path with outcome, commit/worktree, checks, review, limits and remaining work. No repeat permission, user relay or internal-step handback. Preserve integration and publication boundaries.

### Ordered work packages

- [x] **M0.1 — Resolve the implementation baseline and protect authored content. [E4, E7, E9, E10, N]** Activation established on 27 September: both refreshed remote mains at `c003d111`, peeled preparation checkpoint `e7e58c84`, actual branch base `15a2daf4`, dedicated branch/checkpoint recorded in E10. Authored content and scenario work were preserved; no newer exported bundle was found and the old September 9 export was not re-promoted. This closes local activation only; the implementation remains unmerged and publishing remains separate. Refresh baseline checks again when a new checkout or integration requires them, not merely for continuation on this branch.
  - Owners/files: `AGENTS.md` baseline policy; `public/config/dashboard.json`; bundle promotion tools only if an actual export exists.
  - Check: Git ancestry, clean/dirty inventory and artifact identity; no full test run just to create a worktree.

- [ ] **M0.2 — Establish current-content fixtures and repair test consumers. [C1, C5, E1, E4, E7]** Commit a small representative fixture under `tests/fixtures/` derived from the shipped content, including temporal and static charts, editable QMD/media, real source descriptors and presentation-eligible content. Load it through the existing test harness; keep a separate smoke of the actual shipped dashboard. Inventory the 53 recorded unit failures and source-browser failures by exact title, including not-run suites. Replace stale IDs/navigation assumptions with the shared workflow driver and stable IDs; delete a test only when its product contract is retired and the reason is recorded. Fix a real defect when it emerges rather than weakening the assertion.
  - Owners/files: `tests/fixtures/`; `tests/e2e/support/`; affected `tests/*.test.js` and `tests/e2e/*.spec.js`; three Playwright configurations. Extract the existing `chart-authoring-v3` primitives when repairing their consumers.
  - Acceptance cases: reset loads intended fixture; source eligibility/control preflight succeeds; real shipped content still launches; unknown/missing source produces the existing recoverable state.
  - Carryovers: stale Home/map/reload drivers, unscoped Build selectors, sticky-crown control interception, source-manager selection loss, and named theme failures are investigated by current cause. Import performance and the synthetic liveness fixture get boundary-specific checks rather than arbitrary timeout increases.
  - Progress [E10–E25]: sixteen bounded predecessors are retained; `cab48a30` closes media Journeys A/B with 2/2 focused browser evidence, 1/1 affected retry/resume and a scoped fullscreen stacking fix. Next is Journey G package round trip and browser offline rendering. Portable platform/build/Audience and other browser work remain open; saved totals are not current failure counts.

- [ ] **M0.3 — Repair portable source resolution and fresh-clone commands. [C1, C5, E6, N]** Make uploaded GeoJSON source descriptors resolve through the canonical packaged/promoted asset contract instead of assuming browser storage or a nonexistent disk path. Preserve validation and offline portability. Cover missing and malformed assets with actionable errors; do not “fix” offline builds by globally turning embedding off. Verify Windows and Linux script paths; the current Cloudflare scripts are platform-specific.
  - Progress [E10]: embedded GeoJSON/CSV, inline/static handling and actionable disk-asset errors are delivered and scoped evidence accepted at `cdf83abd`; do not redispatch this repair. Full fresh-checkout/platform/build behavior remains unverified, so M0.3 stays open.
  - Owners/files: `scripts/build-portable-data.mjs`; source descriptor/loading and bundle-promotion owners as needed; `public/data/uploaded/`; `package.json`; directly affected portable-data tests.
  - Restored consumer [E9]: include `scripts/lib/pdpc-single-file.mjs` and the paired-deliverables pipeline where a changed source/asset contract reaches them. Preserve contained packaged media and offline HTML output; do not reintroduce PDFs.
  - Exit evidence: fresh checkout with locked dependencies can start `pnpm.cmd dev`, produce `pnpm.cmd build` and `pnpm.cmd build:cloudflare` on Windows; CI uses `pnpm build:cloudflare:linux` on Ubuntu. Inspect output assets, then use the existing static verifier/browser configuration for offline checks.
  - Cadence: the full platform/build exit is retained for the declared integration boundary; a bounded source repair may close with targeted evidence and explicitly leave these broader checks outstanding.

- [ ] **M0.4 — Split non-View surfaces and preserve offline lazy loading. [C2, C5, E6, N]** Lazily load Build/Present, chart editors/wizard, source workspace and studios behind mode-appropriate pending/error states. Keep the Audience launch path prompt. Confirm generated lazy chunks are included in the finalized transitive service-worker graph, so switching to Build/Present offline still works after installation.
  - Owners/files: `src/App.jsx`, `src/components/DashboardRenderer.jsx`, relevant dynamic entry points, `vite.config.js`, static finalization/precache scripts.
  - Check built dependency/request graphs, not only a regex matching `React.lazy`. Record both the compressed View entry and total initial JS; ECharts/shared dependencies count in the latter.
  - Single-file contract [E9]: `scripts/lib/pdpc-single-file.mjs` currently expects release JS/CSS, one html2canvas dynamic import, a specific bundled-logo expression and vendor Three/Vanta files; it rejects remaining module imports. Preserve this supported output or adapt and verify the converter in the same affected slice. A working dashboard split alone is insufficient. The parked rendering experiment is not an approved implementation to merge wholesale.
  - **Added acceptance proposal [N]:** cap the compressed View entry at 250 KiB and require at least a 30% reduction in total initial View JS versus M0 baseline. If measurements show the retained rendering architecture cannot meet this, document and resolve a new numeric budget before closing M0; never quietly raise the ceiling. These numbers are planning proposals, not measurements from C2.

- [ ] **M0.5 — Recover from rendering and chunk-load failures. [C5, E1, N]** Reuse `ApplicationRecovery` and existing source/plot state plates, then add the missing application-level render-error containment. Distinguish data recovery, render exceptions and failed lazy imports; provide a useful retry/reload or restore path without discarding durable work. Keep Audience last-valid output and connection status safe.
  - Owners/files: `src/main.jsx`, `src/App.jsx`, `src/components/app-shell/ApplicationRecovery.jsx`, a focused root error boundary and its tests.
  - Acceptance cases: deliberate render failure, lazy-chunk failure, bad package/source and storage unavailability show recovery, not a blank page. A fixture smoke visits every actual page in View/Build and reaches Present with the corresponding eligible content.

- [ ] **M0.6 — Establish CI, version visibility and practitioner smoke. [C5, E7, N]** Add Windows/Ubuntu push CI for unit tests, build and source Chromium journeys; upload native reports even on failure. Prepare Playwright dependencies once. Keep static/PDPC aggregate checks at explicit integration/release boundaries unless their owners change. Start `CHANGELOG.md`, expose app/package version in the existing information surface, and record a practitioner launch/navigation demo.
  - Owners/files: `.github/workflows/` new CI workflow; `package.json`; existing version/About surface; `CHANGELOG.md`; `docs/demos/`.
  - Before claiming CI is green, require an actual hosted run; a local YAML review is preparation only.
  - Test organization [E9]: assess the preserved, uncommitted `.worktrees/dense-ui-audit` proposal for separating `@visual-audit` journeys. Adoption must be an explicit, visible organization decision retaining audit coverage and real failure dispositions; excluding failures to make a gate green is not acceptable. Preserve unrelated worktree changes.

### M0 exit criteria

1. **[C5, E4]** Current fixture and shipped-content smoke are committed; `pnpm.cmd test` passes at the declared integration candidate. Every prior failure/not-run item is resolved, replaced by a current assertion, or explicitly retired for a product reason.
2. **[C5]** Source, static and PDPC Chromium suites all pass, with their combined measured runtime below 30 minutes on a named reference machine; no hidden skips to meet the target.
3. **[C5, N]** Fresh-clone dev/portable/Cloudflare commands work on their supported platforms; shipped uploaded assets and offline lazy chunks are present.
4. **[C5, C2, N]** Windows/Ubuntu CI has real passing evidence and saved reports; View meets the agreed numeric bundle budget.
5. **[C5, E1]** Root recovery and all-page/mode smoke work; a practitioner can open and navigate the exercise without setup repair. Version/changelog identity is discoverable.

## 6. M1 — Fidelity

**Purpose:** make the authoring preview represent the saved destination and the monitor represent the actual Audience output. **Dependencies:** M0 fixtures/builds; retain the decision-surface draft projection.

**Carry-forward boundary [E9]:** assess only still-relevant cross-style/rendered-fidelity and Audience gaps. Existing chart, gauge, orbit and decision-surface work is already incorporated; do not reimplement it from historical checkboxes.

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

- [ ] **M2.7 — Retire Groups through deterministic dashboard V7 migration. [C3, C5, E6, E9, N]** Only after all live consumers support parentless Storylines, map Groups without Scenes to equivalent Storylines, map Scenes with their own period/cadence/layout intact, preserve policy overrides, remove Group references and retire Chrono Studio from Libraries. Update import review, semantic references, package serializer/normalizer, release factory, active catalogues and training vocabulary together. Record future scenario integration impact; do not implement adapters on the paused scenario branches or reactivate their owners. Keep chart schema V3 unchanged.
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

**Purpose:** prove the complete loop with staff and devices that did not build it. **Dependencies:** M1/M2 ready and another explicitly accepted rehearsal package while scenario-authoring is paused. The unaccepted Aster-28 S-M3 candidate is neither the default nor a prerequisite.

### Ordered work packages

- [ ] **M3.1 — Select and freeze the rehearsal content and device envelope. [C5, E5, N]** Select another explicitly accepted exercise while scenario-authoring is paused. The S-M3 candidate is eligible only after explicit resumption and final communication acceptance. Record package/source versions, three phase cutoffs, moderator-selected Storylines, projector resolution and the least capable supported laptop/phone. Record offline setup, room roles and the actual prepare/run/debrief tasks. Do not equate the three fictional phases or weekly scenario sessions with a required wall-clock exercise duration.
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

**Paused by the user, 27 September 2026.** All actions below are retained for a future explicit resumption. Preserve the scenario branches, worktree changes, source records and generated packages; do not merge them into dashboard main or request acceptance to unblock Fable. Existing completion and pending-acceptance records are unchanged. No messages have been sent to the scenario owners.

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

**Purpose:** move from a successful rehearsal to an approved, supportable deployment and real pilot. **Dependencies:** M3 blockers closed; scenario S-M6 only if the user explicitly resumes scenario-authoring and brings it into supported release scope. The work below is planned release preparation; actual external publication and human sign-offs remain explicit execution boundaries.

### Ordered work packages

- [ ] **M4.1 — Verify security/privacy behavior and distribution boundaries. [C5, E6, N]** Inventory actual network/storage behavior in deployed and offline variants; inspect remote assets, source uploads, exports, telemetry and third-party requests before writing factual claims. State hosting-request metadata separately from exercise-data handling. Add a tested Cloudflare CSP compatible with required local assets and chart rendering; retain sanitization of QMD/media and valid import limits. Audit dependencies, resolve vulnerabilities in release scope or document a formally accepted exception with owner and rationale. Ensure exercise-use/fictional-data disclaimer and version are visible on photographable View, fullscreen, Storyline and Audience outputs.
  - Deliverables/files: concise `docs/security-and-privacy.md`, hosting headers/CSP, existing sanitization/security tests and built-variant request checks. A clean dependency audit is evidence, not a blanket security certification.

- [ ] **M4.2 — Close data governance and citable packaging. [C5, E5, E6, N]** Every chart exposes source, observation/as-of time and appropriate fictional/static/uncertainty context. Export identifies app version, schema/package version and a reproducible integrity checksum; import review lists changed sources, content, assets and time/Storyline structure before committing. Include source/METHOD/provenance companions for scenario-derived releases and test tampering/missing-companion diagnostics without silently losing interpretation.
  - Owners/files: chart headings/source details, bundle serializer/import review, release manifests and scenario provenance adapters where included. Reuse existing checksum machinery rather than defining a competing format.
  - Paused-track boundary [E9]: preserve provenance on accepted packages consumed by the dashboard, but do not activate scenario-authoring or implement its paused adapters through this work package.
  - Check V7 and pre-V7 imports, source replacement, offline media, checksum mismatch, cancellation/no mutation and an exported result that a debrief report can cite unambiguously.

- [ ] **M4.3 — Finalize operator and maintainer documentation. [C5, E6, E8]** Produce a short author quick start, room moderator runbook, maintainer build/release/rollback guide and one-page scope/limitations statement. Build from `docs/app-manual.md` and `docs/pdpc-release-factory.md`, correcting obsolete UI/time/version language. Cover second-screen setup, declared resolution, disconnect/reconnect, blackout/END, offline startup, browser persistence, package backup and recovery. Have an exercise staff member follow the documents without author assistance.

- [ ] **M4.4 — Establish support and rehearse rollback. [C5, E7, N]** Name the person/team responsible for exercise-season incidents and the agreed response window, with a contact route and known-issues list. Preserve the previous tagged app and compatible package. Exercise a rollback from a candidate that includes service-worker caches, lazy chunks and V7 package incompatibility; restoring an older app alone is not proof it can read the newer package. Record backup/restore steps and the recovery result.

- [ ] **M4.5 — Obtain branding approval and produce the release candidate. [C5, E6]** Obtain actual PDPC decisions on name, logo, color profile and disclaimer wording. Freeze accepted exercise content, document the supported feature/authoring scope, update changelog/version, and produce the PDPC variant(s) through the existing factory from a tagged candidate. Verify full-workspace versus participant isolation, reproducible manifest/checksums, static/offline launch and the approved content/branding. Run full release gates once on this exact candidate and save native reports. Prepare the deployment and rollback artifacts for review before requesting any still-required publish approval.
  - Restored deliverables [E9]: use the existing `release:pdpc:deliverables` pipeline to validate real paired Cloudflare ZIPs and single-file offline HTML, including images/fonts, first-launch Light default, retained saved appearance choices and offline launch. PDFs remain deliberately excluded. The September 27 fixture tests do not establish actual release-output readiness.

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

**Current operational assignment, 27 September:** see the compact checkpoint and section 5 Journey G package round-trip browser assignment. The existing owner continues on Sol / High with internal sequencing and direct package reporting. Predecessors through `cab48a30` are reconciled; scenario-authoring stays paused. [C5, E5, E10–E25, N]

The following choices are not needed to finish this planning document, but must be resolved before their dependent work closes:

- **Publication/integration [E7, E9–E25, N]:** local activation is complete and the owner continues from unmerged `cab48a30`. Merge into main, push and deployment still require their own authority and relevant verification; they are not prerequisites for this branch's next authorized slice.
- **Performance [C5, N]:** confirm reference devices and ratify measurable bundle/runtime budgets; proposed starting numbers appear in M0.4 and M3.3.
- **Content and practitioners [C5, E5]:** select another accepted rehearsal package while scenario-authoring is paused; nominate exercise staff and their three desired comparisons. S-M3 acceptance becomes relevant only after explicit resumption and selection of that candidate.
- **Release scope [C5, E5, E9]:** current Fable work proceeds independently with scenario-authoring paused. Bringing supported authoring into 1.0 would require an explicit resumption/scope decision; retain its unfinished milestones without blocking dashboard work.
- **External commitments [C5]:** actual PDPC brand approval, support ownership/response window, hosting target and real pilot participants.

Dates and effort estimates should follow M0's measured repair scope and practitioner availability. No percentage-complete claim or invented delivery date is useful before those constraints are known.

## 13. Planning verification record

### Original consolidation — 19 September

- Read all five September 19 design documents, the preceding decision-surface plan, saved gate/repair records, legacy acceptance/cross-style records, scenario CURRENT/development milestones and release/workflow references.
- Refreshed both Git remotes and checked the actual SHAs; inspected local merge and scenario branch checkpoints.
- Confirmed the five requested source documents have no changes between `0aab4b9` and local redesign merge `0e7e9e33`.
- Parsed saved unit report counts; reused recorded test evidence without presenting it as fresh execution.
- Inspected relevant startup/source-loading/config boundaries to distinguish existing recovery from a root error boundary and current serialization from proposed fields.
- This is documentation-only work: no application tests, builds, browser journeys, scenario generation or model evaluations were run for the plan.

### Handoff incorporation — 27 September

- Read E9 and current project guidance; incorporated M0 source, packaging and test-organization carryovers, later milestone dependencies and the user's first-task authorization into this existing roadmap.
- Verified the annotated checkpoint resolves to `e7e58c84`; inspected clean main/preparation checkouts at `cdfc7a6a` and the handoff-only diff after the code checkpoint. Inspected the portable builder, single-file converter and directly related test owners to bound the first assignment.
- Reused the handoff's dated 17-test/theme/CSV evidence with its stated limits. Did not rerun product tests, builds or browser journeys, refresh remotes, publish, or inspect/activate scenario tasks during this planning update.

### Workflow adoption and first closeout reconciliation — 27 September

- Adopted the user-requested Fable workflow and direct reporting route; read E10 and a bounded native owner snapshot. Verified clean owner checkout `cdf83abd`, its base and changed-file inventory; reused its 19 deterministic/one offline loader result and scoped review without reruns.
- Marked M0.1 local activation complete; retained the bounded source repair as partial M0.2/M0.3 delivery and left all broader gates open. Inspected only the fixture/reset, source-mode harness and relevant browser-entry boundaries needed to assign the next M0.2 slice.
- Registered the existing owner and a concrete continuation brief with direct closeout authorization. No scenario task, new task roster, product test rerun, code merge or publication was performed by this planning update.

### Fixture/reset closeout reconciliation — 27 September

- Read E11 and the direct owner handover; verified clean `1758963d`, its predecessor and changed-file scope. Reused five deterministic/three browser results and scoped review without rerunning them; accepted only the assigned fixture/reset scope.
- Inspected the existing label-based chart helper, stable production stage IDs and its consumer list to select the next accepted M0.2 boundary. Retained prior source/PDPC/offline evidence and all wider M0 gates.
- Recorded the user's lower-model preference and explicit handover requirement; reused the existing owner with Sol / High and a direct-reporting assignment. No new task roster, scenario work, implementation merge or publication is authorized by this reconciliation.

### Chart-driver closeout reconciliation — 27 September

- Read E12 and the direct handover, verified clean `aeba6848` and its changed-file scope, and accepted the three focused journeys plus corrected scoped-review finding without reruns. The five larger touched title cases remain explicitly unverified.
- Selected only the two CSV draft-creation cases and related upload/catalogue journey for the next M0.2 slice. The current-source mismatch and existing fixture/driver contracts support this bounded repair; GeoJSON/playback and wider historical inventory remain open.
- Continued the existing owner on Sol / High with direct handover authority. No product suite/build, implementation merge, scenario action or publication was performed by the steward.

### CSV closeout reconciliation and next-family selection — 27 September

- Read E13 and the direct handover; verified clean `133c8d4f` and its two-file scope. Accepted all three assigned Chromium results and scoped review without reruns; retained the fact that Journey D passed unchanged.
- Parsed only saved unit metadata to locate the remaining deterministic families: 53 historical failures across 14 files, including six profile cases. E10 already covers portable embedding; selected the other five and a compact cross-reference of saved failures/not-run records to accepted closeouts. This is historical inspection, not a new gate result.
- Continued the existing owner on Sol / High. Broader M0, scenario pause, unmerged implementation and publication limits are unchanged.

### Profile closeout reconciliation — 27 September

- Read E14/direct handover and verified clean `db090e7f` and its two-file scope. Accepted the five-case result and corrected generator-coverage review without reruns. Saved counts remain historical; broader exact-title disposition is not a fresh gate.
- Inspected the 15 historical catalogue failures and current test input/artifact boundaries. Selected that one shared-fixture contract family while retaining shipped catalogue/digest coverage and distinguishing catalogue v2 from native chart V3.
- Continued the existing owner on Sol / High with direct reporting; no sibling Quorum project, scenario task, product gate, main integration or publication work was performed by the steward.

### Catalogue closeout reconciliation — 27 September

- Read E15/direct report and verified clean `5b1c4ed0` and its two-file scope. Accepted the 41/41 task-specific result and scoped review, retaining current shipped-catalogue identity without reruns.
- Inspected adjacent saved semantic/package failures and the existing runtime-profile admission change at `b80495a5`. Assigned nine historical cases with explicit contract investigation; no blanket fixture-drift or harmlessness classification was made.
- Continued the same owner on Sol / High with direct reporting. No product check rerun, code merge, generated refresh, sibling-project/scenario action or publication was performed by this planning update.

### Semantic-boundary closeout reconciliation — 27 September

- Read E16/direct report, verified clean `f109662b` and its six-file scope, and checked that the generated artifact changed only two digests. Accepted the targeted results and corrected scoped-review finding without reruns. The contract ruling follows the shared non-semantic field declaration and the app's profile-stripping caller.
- Inspected the four saved theme failures and their strict-validation/default-choice assumptions. Assigned only that deterministic consumer group while preserving PDPC authored choices, generic fallback and release-only appearance behavior.
- Continued the same owner on Sol / Medium with direct reporting. No implementation merge, product check rerun, scenario action or publication was performed by this planning update.

### Theme-consumer closeout reconciliation — 27 September

- Read E17/direct report and verified clean `b57813ab` and its three-file test/document scope. Accepted the four exact-title passes and scoped review without reruns; no general theme or rendered-style gate is claimed.
- Inspected default-dashboard and Home consumers, actual mixed source kinds and the existing municipal derivative owner tests. Split six shipped-content cases from five analytical-fixture cases to preserve both boundaries without restoring retired authored content.
- Continued the existing owner on Sol / High for the more varied source/renderer/serialization boundary, with direct reporting. No product checks, code merge, scenario work or publication were performed by the steward.

### Shipped-dashboard/Home closeout reconciliation — 27 September

- Read E18/direct report and verified clean `22644dfa` and its four-file scope. Accepted the six selected passes and corrected source-binding review; the alias formatting change retains semantic content.
- Inspected the five deferred analytical cases and retained municipal manifest/output/owner-test boundaries. Assigned explicit representative fixtures while preserving current shipped coverage and actual derivative integrity where applicable.
- Continued the existing owner on Sol / High with direct reporting. No product checks, implementation merge, scenario work or publication were performed by the steward.

### Analytical-fixture closeout reconciliation — 27 September

- Read E19/direct report, verified clean `03b88257` and its three-file scope, and inspected the small fixture plus manifest-hash correction. Accepted five selected passes, four derivative owner passes and resolved scoped review without reruns; E18 remains prior valid evidence.
- Inspected the three remaining geography-component failures and their shared missing-chart helper. Selected a fixture-backed authoring slice using the existing small-map examples, with browser geography work explicitly still open.
- Continued the existing owner on Sol / Medium with direct reporting. No product check rerun, implementation merge, scenario work or publication was performed by the steward.

### Geography-authoring closeout reconciliation — 27 September

- Read E20/direct report and verified clean `1889326b` and its two-file scope. Accepted four selected passes and clean scoped review without reruns; retained separate browser-work limits.
- Inspected the four remaining catalogue/collection saved cases and current source labels. Assigned explicit invariant fixtures and actual shipped-source/profile validation without modifying authored content.
- Adopted the user-approved version 2 coordination agreement at this completed boundary and assigned the existing owner the complete catalogue/collection package on Sol / Medium, with internal sequencing and direct reporting. No product check rerun, implementation merge, scenario work or publication was performed by the steward.

### Catalogue/collection package closeout reconciliation — 27 September

- Read E21/direct report and the amended dated closeout, verified clean `4274702f` and its six-file test/fixture/document scope. Accepted 21/21 affected-file evidence and resolved duplicate-date review finding without reruns.
- Inspected the saved browser GeoJSON failures and current spec seeds. Selected one package for fresh choropleth plus upload and replacement journeys, with cheap fixture/control preflight and source ownership preserved.
- Continued the existing owner on Sol / High for cross-journey browser reasoning, with internal sequencing and direct package reporting. No product check rerun, implementation merge, scenario work or publication was performed by the steward.
