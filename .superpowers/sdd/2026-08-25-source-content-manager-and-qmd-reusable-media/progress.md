# SDD ledger — plan: docs/superpowers/plans/2026-08-25-source-content-manager-and-qmd-reusable-media.md

## Execution identity

- Worktree: `C:\Users\hekma\Documents\Projects\SimEx\.worktrees\simex-dashboard-v2\static-content-panels-implementation`
- Branch: `codex/static-content-panels-implementation`
- Accepted planning HEAD: `3bc143f858ae96a66275462b587bd2bc506cf781`
- Browser-edit baseline gate: `packaged-dashboard-bundle.json` absent at `2026-08-25T19:58:02+02:00`; no browser-edit baseline present and no user-reported browser edits.
- Execution policy: Tasks 1–17 sequential; one implementation owner at a time; task-scoped spec/quality review and bounded fix loop before advancing.

## Preflight rulings

- Ruling: the plan's literal Step 7S regex currently returns 42 rows because `FIDELITY-MATRIX.md` contains six later historical/support-table rows with matching IDs; the controlling table under `## Final Step 7S controlling 36-row disposition` itself contains exactly the 36 unique expected IDs and all three status columns are Passing. Bound the parser to that controlling section and assert the exact unique ID set when recording Task 1 evidence — this preserves the accepted baseline instead of treating historical tables as current status — if wrong, a future duplicated/missing controlling ID could be masked, so the replacement parser must assert both cardinality and uniqueness.

## Task/interface conflict table

Paths are relative to the worktree. `P` = production, `T` = test, `D` = documentation/evidence, and `I` = explicit produced/consumed interface. `OK` means the later task can extend the earlier contract in plan order; `SEQ` calls out a hot shared owner whose earlier contract must be preserved.

| Tasks | Shared file/interface | Earlier production contract | Later consumption/change | Conflict status/ruling needed |
|---|---|---|---|---|
| 1→2 | P `src/lib/loadDashboard.js` | V5 migration-first load and media-owned Image identity. | Add central GeoJSON validation during load. | OK; preserve migration-before-validation. |
| 1→3 | P `staticContentDraft.js`, `DashboardModeWorkspace.jsx`, `DashboardRenderer.jsx`, `assetReferenceGraph.js`, `App.jsx`; T `staticContentDraft`, `dashboardAppV3`; I T1 registry/static commit | Exact finalized Static payload and durable atomic commit. | Coordinator delegates Static publication and adds retainers. | SEQ; delegate to, do not replace, T1 boundary. |
| 1→4 | P `DashboardRenderer.jsx`; I V5/context | Renderer supplies DashboardV5/render context. | Mount manager shell. | OK; retain render transport. |
| 1→5 | P `staticContentDraft.js`, `DashboardModeWorkspace.jsx`, `DashboardCanvas.jsx`, `ChartPanel.jsx`, `ChartView.jsx`, `DashboardRenderer.jsx`; T `chartViewV3`, `staticPanelComposition`, `dashboardGeometryContract`, `sourceEvidenceDirectJourney`; I media identity | V5 `ContentRenderContext` reaches Image. | Carry it to QMD portals. | SEQ; one context serves both. |
| 1→6 | P `DashboardRenderer.jsx`; T `presentationProtocol` | V5 identity; Present/Audience stay separate. | Mount dependency graph and assert transient protocol adds no edges. | OK. |
| 1→7 | P `staticContentDraft.js`, `StaticContentWizard.jsx`, `ImageSourceEditor.jsx`; T `mediaItems`, `staticContentDraft`, `staticPanelComposition` | Four-stage V5 Image payload/placement contract. | Add picker/upload/import/reuse/Restore. | SEQ; no old `origin`/source revision. |
| 1→8 | P `staticPanelTransaction.js`, `ImageChartView.jsx`; T `staticSourceSchema`, `staticPanelTransaction`, `imageChartView`; I media revision | Atomic V5 media identity. | Global replacement advances revision without rewriting placements. | OK. |
| 1→11 | P `loadDashboard.js`; T `chartRenderingV3` | Dashboard V5, chart config V3 load/render. | Add CSV compatibility checks. | OK; orthogonal. |
| 1→12 | P `migrateDashboardV4ToV5.js`, `dashboardBundleV3.js`, package export/candidate/import; T migration/bundle/Present/protocol | V4→V5 and package identity baseline. | Add optional temporal-review metadata. | SEQ; V4 omits it, audience stays clean. |
| 1→13 | P `DashboardModeWorkspace.jsx`, `DashboardCanvas.jsx`, `ChartPanel.jsx`, `ChartView.jsx`; T composition/geometry/direct journey | Render-context path carries media authority. | Add map-budget requests on same path. | SEQ; compose transports. |
| 1→15 | P bundle/package owners, `App.jsx`; T migration/bundle/package/portability | Canonical V5/V4 import/static package behavior. | Finalize complete V5 persistence/package. | SEQ; chart config remains V3. |
| 1→16 | P `ChartView.jsx`, `DashboardRenderer.jsx`, `assetReferenceGraph.js`, `App.jsx`; T chart rendering/app | V5 identity and committed-media durable references. | Add health/repair/cleanup. | OK; health cannot erase identity. |
| 1→17 | D/I S01–S03 evidence | V5/Image slice implemented and evidenced. | Final ledger consumes retained evidence. | OK; T17 adds no production behavior. |
| 2→4 | I GeoJSON authority → manager routing | One canonical GeoJSON validation/summary owner. | Expose kind/filter routing. | OK; no second summary owner. |
| 2→11 | P `loadDashboard.js` | Central GeoJSON load validation. | Add CSV load/replacement behavior. | OK; orthogonal. |
| 2→13 | T `geoJsonValidation`, `geoJsonSourceEntry`; I T2 authority | Frozen four gates, typed results, lean summary. | Manager/detail/preview/selector render them. | SEQ; concurrency is scheduling only. |
| 2→14 | I validation exports and `SOURCE_GEOJSON_LIMIT_KEYS` | Single schema/admission/summary authority. | Replacement adds map/join compatibility after it. | SEQ; no copied/removed metrics. |
| 2→15 | I canonical GeoJSON shapes | Lean validation/summary. | Package round-trips them. | OK; no obsolete fields. |
| 2→16 | P `dashboardSourceProviders.js` | Providers delegate to central authority. | Add health/last-good/relink behavior. | OK. |
| 2→17 | D/I S15 evidence | GeoJSON engine authority implemented. | Final promotion consumes mounted evidence too. | OK; Task2 alone cannot promote S15. |
| 3→4 | P `DashboardRenderer.jsx`, `BuildWorkspace.jsx`; T `buildWorkspaceV3`; I coordinator | One session coordinator and wrappers. | Manager adds Close/Escape discard paths. | SEQ; same coordinator. |
| 3→5 | P `DashboardRenderer.jsx`, `DashboardModeWorkspace.jsx`, `staticContentDraft.js` | Coordinator and authoring lifetime. | Wire QMD runtime/authoring path. | OK; rendering never publishes drafts. |
| 3→6 | P `DashboardRenderer.jsx`, `buildDirtyState.js`; I `getActiveRetainers()` | Frozen sorted retainer snapshot. | Graph consumes real temporary blockers. | SEQ; no synthetic history/leases/messages. |
| 3→7 | P `contentDraftTransaction.js`, `staticContentDraft.js`; T coordinator/static draft; I coordinator | Stage/commit/discard/atomicity. | Add concrete Media/QMD/Image flows. | SEQ; owner-specific lifetime. |
| 3→8 | P `contentDraftTransaction.js`, `browserAuthoredAssetStore.js`; T authored store | Transaction retainers/session assets. | Register replacement old/new IDs. | SEQ; clear only after publish/rollback. |
| 3→10 | P `sourceEntrySchema.js`, `contentDraftTransaction.js`, `wizardDraft.js`; T corresponding suites; I coordinator | Source identity and manager/chart draft ownership. | Implement CSV Add/chart upload. | SEQ; Add vs completed chart boundary. |
| 3→11 | I coordinator `beginTransaction/completeTransaction/failTransaction` | Exact transaction retainer lifecycle. | CSV replacement wraps atomic publication. | RULING: undeclared header dependency; execute as T3 consumer. |
| 3→12 | P `BuildWorkspace.jsx`; T `buildWorkspaceV3` | Build dirty/session state includes retainers. | Add temporal save clearing. | OK; do not discard unrelated drafts. |
| 3→13 | P coordinator, `DashboardModeWorkspace.jsx`, `BuildWorkspace.jsx`; T Build workspace | One coordinator and exact prop path. | Add GeoJSON manager/chart uploads and provider composition. | SEQ; provider is separate. |
| 3→14 | I coordinator transaction API | Atomic transaction lifetime/rollback. | GeoJSON replacement registers source/payload IDs. | RULING: undeclared header dependency; execute as T3 consumer. |
| 3→15 | P `App.jsx`; I committed-vs-session boundary | App owns one non-serialized coordinator. | Mount persistence/package. | SEQ; never package drafts. |
| 3→16 | P coordinator, `App.jsx`, `DashboardRenderer.jsx`, asset graph/reconcile; T coordinator/app/cleanup; I retainers | Retainer notifications/disposal/reconcile hooks. | Startup/ongoing cleanup consumes snapshot. | SEQ; new session empty, committed unused durable. |
| 3→17 | D/I S03/S04/S13 evidence | Coordinator lifetime/atomicity evidenced. | Final ledger consumes it. | OK. |
| 4→5 | P `source-content.css`, `DashboardRenderer.jsx` | Manager shell/style import/composition. | Add QMD token classes/render wiring. | OK; stylesheet imported once. |
| 4→6 | P `DependencyList.jsx`, `source-content.css`, `DashboardRenderer.jsx` | Shell/detail dependency region. | Wire exact graph/delete states. | OK; browsing stays non-modal. |
| 4→7 | P workspace/catalogue/detail/media detail; T `contentDetail`; I shell | Manager routing/rename/default UI. | Add Media flows. | SEQ; discard unresolved manager drafts only. |
| 4→8 | P `MediaDetail.jsx` | Media metadata/actions owner. | Add global replacement action. | OK; focused modal only. |
| 4→9 | P `source-content.css`; I **Open media item** navigation | Manager owns media detail/navigation. | Inspector adds Open/Change actions. | RULING: Open→T4 detail; Change→T7 picker. |
| 4→10 | P data catalogue/detail/CSV detail; T `contentDetail`; I shell | Shared source routing. | Fill CSV Add/profile/search/download. | OK; no cell editing/new profile owner. |
| 4→11 | P `DataSourceDetail.jsx`, `DependencyList.jsx` | Shared source action/dependency UI. | Add CSV replace/remap. | OK. |
| 4→12 | P `BuildWorkspace.jsx`; T Build workspace | Manager/Build composition/restoration. | Add temporal findings/save clearing. | OK; preserve manager state. |
| 4→13 | P workspace/data catalogue/detail/Build workspace; T Build workspace; I shell | List/detail state and workspace sibling branch. | Add GeoJSON detail/preview/upload/budget consumer. | SEQ; provider stays above both siblings. |
| 4→14 | P `DependencyList.jsx` | Shared dependency navigation. | GeoJSON replace/relink/remap uses it. | OK. |
| 4→15 | I committed manager records | Manager produces used/unused committed records. | Package retains them. | OK; UI/session state excluded. |
| 4→16 | P media/data detail, `DashboardRenderer.jsx` | Detail routing/actions. | Add typed health/repair. | OK; identity remains visible. |
| 4→17 | D/I C01–C04 evidence | Manager composition inspected. | Final ledger consumes it. | OK; no markup-only promotion. |
| 5→6 | P `DashboardRenderer.jsx`, `source-content.css`; I parser API | One parser/annotated AST owns media suffixes/nodes. | Graph parses once and extracts from non-null AST. | SEQ; no second parser/suffix pass. |
| 5→7 | P `staticContentDraft.js`; T static composition; I QMD runtime | Safe QMD panel foundation. | Picker inserts eligible local IDs. | OK; raw/external stays inert. |
| 5→8 | P `QmdMediaView.jsx`; T QMD view; I lease runtime | One healthy lease/fallback lifecycle. | Replacement changes resolution while leases survive. | OK. |
| 5→9 | P QMD parser, view, free-text view, stylesheet; T QMD/media/DOM/free-text; I grammar | Exact allowlist/safe hosts/portal runtime. | Add inspector serialization/geometry. | SEQ; no arbitrary CSS or second suffix parser. |
| 5→13 | P chart render/workspace path; T composition/geometry/direct journey | QMD/media context transport. | Add map-budget transport. | SEQ; additive props. |
| 5→15 | I QMD logical references | Local `mediaId`; no blob/base64. | Package validates refs and dedupes payload. | OK. |
| 5→16 | P `QmdMediaView.jsx`, `ChartView.jsx`, `DashboardRenderer.jsx`; T QMD view; I repair callback | Lease/fallback runtime. | Add health/repair navigation. | RULING: map `requestRepair` to public `onRepair`. |
| 5→17 | D/I S11/C07 evidence | Safe QMD runtime evidenced. | Final ledger consumes it. | OK; Task9 evidence completes it. |
| 6→7 | I graph/delete → Journey A | Saved uses/real retainers block delete. | Media journey exercises blocked/eligible states. | OK; blocked opens no dialog. |
| 6→8 | P `ContentActionDialog.jsx`; I dialog states | Eligible delete/scoped dialog owner. | Add media replacement branch. | OK; states distinct. |
| 6→9 | P `source-content.css` | Dependency/delete styles. | Add QMD inspector styles. | OK; namespace classes. |
| 6→10 | I CSV direct-use graph → Journey D usage/dependency | CSV direct edge is panel primary `sourceId`. | CSV catalogue displays usage/breadcrumb. | RULING: undeclared header dependency; reuse T6 selectors. |
| 6→11 | P dialog/dependency list; T graph/dialog; I direct CSV uses | Exact direct dependencies/modal navigation. | Validate all dependent charts and offer remap/import. | SEQ; impacts are not edges. |
| 6→12 | P `contentDependencyGraph.js`; T protocol | Graph separates uses, retainers, impacts. | Complete temporal impacts/status. | SEQ; never deletion/audience state. |
| 6→13 | P graph/deletion; T graph/deletion; I GeoJSON edge | GeoJSON direct edge/no temporal impacts. | Show dependency and blocked delete. | OK. |
| 6→14 | P dialog/dependency list; I shared replace/remap UI | Shared modal/navigation contracts. | GeoJSON replace/relink uses them. | OK. |
| 6→15 | I committed cross-layer refs | Graph defines retained identities. | Package validates refs. | OK; transient retainers excluded. |
| 6→16 | P `DashboardRenderer.jsx`; I identity/dependencies | Renderer supplies graph/coordinator context. | Recovery preserves unhealthy edges. | OK; no cascade. |
| 6→17 | D/I S05–S07/C08 evidence | Dependency/delete behavior evidenced. | Final ledger consumes it. | OK. |
| 7→8 | P `MediaDetail.jsx`, coordinator; I media actions | Concrete Media/Add/Change/Restore ownership. | Add global Replace everywhere. | SEQ; placement Change/Restore ≠ global replace. |
| 7→9 | P `FreeTextSourceEditor.jsx`; I picker | Picker returns eligible local IDs. | Inspector Change invokes picker. | SEQ; change placement ID only. |
| 7→10 | P coordinator; T coordinator/content detail | Concrete media owner lifetimes. | Add CSV owner lifetimes. | OK; disjoint owners. |
| 7→13 | P coordinator/workspace; T static composition | Concrete Media Add/cancel. | Add GeoJSON Add/cancel. | OK; no local staging registry. |
| 7→15 | I committed media records | Add/import commits logical records correctly. | Package retains records/deduped bytes. | OK; cancelled drafts absent. |
| 7→16 | P `MediaDetail.jsx`, coordinator; T coordinator | Draft/Restore/import lifetime. | Cleanup respects active state. | SEQ; clear resolved retainer only. |
| 7→17 | D/I Journey A evidence | Media flows implemented/inspected. | Final ledger consumes it. | OK. |
| 8→9 | P `QmdMediaView.jsx`; T QMD view | Global revision/lease safety. | Add inspector geometry/placement changes. | OK; Change remains local. |
| 8→10 | P coordinator | Media transaction retainers. | Add CSV drafts. | OK; common code stays generic. |
| 8→11 | P `ContentActionDialog.jsx` | Media replacement modal branch. | Add CSV branch. | OK; typed kinds. |
| 8→13 | P coordinator | Media replacement transaction registration. | Add GeoJSON drafts. | OK. |
| 8→14 | P `ContentActionDialog.jsx` | Media replace dialog. | Add GeoJSON replace/relink dialog. | OK; stable ID kind-specific. |
| 8→15 | I media revision/current | Atomic new revision authoritative. | Package validates/exports it. | OK. |
| 8→16 | P media detail/QMD view/coordinator; T QMD view; I replacement | Identity-preserving replacement/rollback. | Repair routes through validated transaction. | SEQ; no in-place shortcut. |
| 8→17 | D/I Journey B evidence | Global replacement evidenced. | Final ledger consumes it. | OK. |
| 9→15 | I QMD serialized attributes | Exact allowlist and logical ID. | Package validates/round-trips it. | OK. |
| 9→16 | P `QmdMediaView.jsx`; T QMD view | Responsive/RTL/fallback geometry. | Add health repair/passive state. | OK; no `<img>` on unhealthy. |
| 9→17 | D/I Journey C evidence | Inspector/measured geometry evidenced. | Final ledger consumes it. | OK. |
| 10→11 | P `DataSourceDetail.jsx`; I CSV source actions | CSV records/profile/selection exist. | Add Replace file compatibility. | OK; block leaves original exact. |
| 10→13 | P data picker/catalogue/detail/coordinator/DataSourceStep; T chart authoring | CSV picker and six-stage integration. | Extend to eligible GeoJSON forms. | SEQ; six stages exact, hidden sources remain hidden. |
| 10→15 | I CSV records/profile | Committed source/data/profile. | Package retains descriptor/payload and CSV-only profile. | OK. |
| 10→16 | P data detail/coordinator; T coordinator | CSV add/chart draft lifetime. | Add health/cleanup. | OK; preserve last-good profile. |
| 10→17 | D/I Journey D evidence | CSV Add/six-stage flow evidenced. | Final ledger consumes it. | OK. |
| 11→12 | P `csvReplacementTransaction.js`; T CSV replacement; I valid candidate | Structural block/compatible commit. | Add temporal warning/review marking. | SEQ; structural blocks precede temporal review. |
| 11→13 | P `DataSourceDetail.jsx`; T dependency graph | CSV replacement UI/direct-use tests. | Extend shared UI/graph for GeoJSON. | OK; branches separate. |
| 11→14 | P dialog/dependency list | CSV replace/remap states. | Add GeoJSON analogous states. | OK; rules remain type-specific. |
| 11→15 | I committed CSV replacement | Atomic stable-source result. | Package serializes committed state only. | OK. |
| 11→16 | P data detail; T CSV replacement/chart rendering; I last-good | Failed CSV replacement preserves runtime data. | Health repair invokes transaction. | OK. |
| 11→17 | D/I Journey E evidence | CSV structural replacement evidenced. | Final ledger consumes it. | OK. |
| 12→13 | P graph/Build workspace; T Build workspace | Durable temporal impacts/save clearing. | Extend graph/workspace for GeoJSON. | OK; GeoJSON has zero temporal impact. |
| 12→15 | P bundle/package owners; T migration/bundle; I temporal metadata | Optional exact review metadata. | Final package validates it. | SEQ; absent from audience protocol. |
| 12→16 | T CSV replacement | Temporal rollback/status tests. | Recovery reuses failure assertions. | OK; test extension only. |
| 12→17 | D/I Journey F evidence | Temporal review/clearing evidenced. | Final ledger consumes it. | OK. |
| 13→14 | P `GeoJsonDetail.jsx`, `EChartsChartView.jsx`; T GeoJSON E2E; I manager/runtime | GeoJSON Add/detail/preview/selector/budget. | Add Replace/Relink and updated map. | SEQ; reuse authority/budget. |
| 13→15 | I eligible GeoJSON representations | Committed tracked/package/uploaded forms. | Package retains/validates them. | OK. |
| 13→16 | P GeoJSON/data detail, `ChartView.jsx`, coordinator | Mounted manager/runtime/draft ownership. | Add health/relink/cleanup. | OK; budget is not health/admission. |
| 13→17 | D/I Journey I evidence | Mounted GeoJSON/S15 evidence. | Final ledger consumes it. | OK. |
| 14→15 | I committed GeoJSON replacement | Stable source, atomic rollback/import/remap. | Package serializes one complete state. | OK; no partial state. |
| 14→16 | P `GeoJsonDetail.jsx`; T GeoJSON replacement; I last-good | Validated replace/relink rollback. | Health repair routes through it. | OK. |
| 14→17 | D/I Journeys J/K evidence | GeoJSON replacement/relink evidenced. | Final ledger consumes it. | OK. |
| 15→16 | P `dashboardAssetPersistence.js`, `App.jsx`; T asset persistence; I persisted state | Atomic V5 persistence retaining used/unused content. | Startup cleanup consumes state/retainers. | SEQ; committed unused assets remain durable. |
| 15→17 | D/I Journey G evidence | V5 portability/package evidenced. | Final ledger consumes it. | OK; full release suite only when required. |
| 16→17 | D/I Journey H evidence | Health/cleanup/recovery evidenced. | Final ledger completes submission. | OK; T17 is docs-only. |

## Preflight scan disposition

- No binding-spec or Global-Constraint contradiction remains after user/master implementation authorization.
- Dependency-header rulings: Task 11 consumes Task 3's coordinator transaction API; Task 14 consumes the same Task 3 API; Task 10's Journey D consumes Task 6's direct-dependency selectors. Execute in the published numeric order and treat these as explicit dependencies even though the three `Consumes` headers omit them.
- Adapter naming ruling: `ContentRenderContext.requestRepair` is passed to `QmdMediaView` as its public `onRepair` prop; do not introduce a second callback contract.
- QMD inspector routing ruling: **Open media item** navigates to Task 4's manager Media detail; **Change image** invokes Task 7's media picker and changes only the placement `mediaId`.

## Task 1

- Task 1: BASE `3bc143f858ae96a66275462b587bd2bc506cf781`
- Brief: `.superpowers/sdd/2026-08-25-source-content-manager-and-qmd-reusable-media/task-1-brief.md`
- Implementer model: `gpt-5.6-sol`, high reasoning; fresh context; no subagents.
- Controller prerequisite ruling: the exact RED exposed retained V5 semantic-boundary drift. The smallest cycle-safe bundle rejection, Quorum V3/V4→V5 migration, accessor-safe descriptor dispatch, and equally strong V5/tracked-data expectations landed separately as `454f6e9` (`fix(content): reconcile V5 semantic boundary consumers`). Focused evidence: `tests/dashboardSemanticBoundary.test.js` 73/73 and the four previously failing dataset/accessor selections 4/4.
- Task 2 RED: exact command reported 72 pass / 11 fail. Two failures were the intended missing `geoJsonValidation.js` and `geoJsonSourceEntry.js` authorities; the remaining node-reported failures were the ruled prerequisite drift (including one failing parent suite).
- Task 2 GREEN: exact command `node --test tests/geoJsonValidation.test.js tests/geoJsonSourceEntry.test.js tests/progressiveDashboardLoad.test.js tests/chartSourceProfile.test.js tests/dashboardSemanticBoundary.test.js tests/datasetProfilesV3.test.js tests/dataServiceFoundation.test.js` passed 124/124, zero skipped/todo.
- Task 2 engine scope: exact frozen four-key admission authority; separate schema/admission/compatibility results; exact fragment semantics; lean summary; iterative nested-property handling; current descriptor/loader/provider delegation; CSV-only profiles retained.
- Task 2 evidence boundary: SCM-S15 engine deterministic evidence only. No manager composition, replacement/publication transaction, map budget, mounted preview/runtime, rollback, or inspected browser evidence is promoted.
- Task 2 implementer: `/root/task_2_implementer`.
- Ruling: the exact Task-2 target exposed three boundary prerequisites: quorum catalogue still stops at V4 before V5 validation, cyclic structural input recurses instead of rejecting safely, and descriptor classification reads accessors before plain-entry validation. Restore the cyclic test and land the smallest V5-boundary/accessor reconciliation as a separate prerequisite commit before the GeoJSON authority commit; expectation-only V5/tracked-data assertions may be updated but no accepted test may be removed — this keeps Task 2's four-gate commit independently reviewable — if wrong, the extra prerequisite commit touches a boundary that should have remained historical, but omitting it leaves the accepted exact Task-2 command red or weakens safety coverage.
- Task 2 prerequisite commit: `454f6e97a0b55aa631b312f5d155215c7f983116` (`fix(content): reconcile V5 semantic boundary consumers`); focused 73/73 semantic-boundary and 4/4 accessor/data checks.
- Task 2 implementation commit: `8e2db75be2506024b46c39fa70512619e0ef6058` (`feat(content): centralize bounded GeoJSON validation`); exact Task-2 selection 124/124, no skips/todos.
- Task 2 scoped review: CHANGES REQUIRED. T2-R01 tracked `response.json()` bypasses the encoded-byte pre-parse gate; T2-R02 deep/cyclic property inputs are not safe end-to-end because sizing is recursive and traversal lacks an active-path guard; T2-R03 live load normalization can invoke accessors before descriptor validation and the runtime regression was weakened; T2-R04 the cyclic-boundary test accepts an incidental error and lacks shared-DAG coverage. Bounded fix round authorized; Task 3 remains gated.
- Task 2 fix commit: `9d335362ef9b529f100b19d6aae23dabdf99e58b` (`fix(content): harden bounded GeoJSON loading`); focused 11/11 and exact Task-2 selection 129/129.
- Task 2 re-review: T2-R01 through T2-R04 RESOLVED; spec compliance APPROVED; code quality APPROVED. Task 2 complete at `9d335362ef9b529f100b19d6aae23dabdf99e58b`; SCM-S15 has deterministic engine evidence only, while composition and real-use remain Proposed / unimplemented / not verified.
- Task 3 implementation commit: `0a659743335ac17591b8e49149740522567259a7` (`feat(content): add scoped content draft publication`); exact Task-3 selection 85/85, no skips/todos.
- Task 3 scoped review: CHANGES REQUIRED. T3-R01 coordinator dashboard publication must require durable persistence; T3-R02 post-commit session cleanup can roll back bytes without compensating dashboard; T3-R03 active retainers must protect staging without promoting it durable; T3-R04 internal draft transaction IDs must not collide with public transactions; T3-R05 the exact coordinator prop must reach ChartWizardV3 and StaticContentWizard; T3-R06 authoring publication needs an explicit completed-owner gate. Bounded fix round authorized; Task 4 remains gated.
- Task 3 fix commit: `be6416f026a271008385f4d94f26615cd8697113` (`fix(content): harden scoped draft publication`); focused 15/15 and exact Task-3 selection 91/91.
- Task 3 re-review: T3-R01 through T3-R05 RESOLVED; T3-R06 remains OPEN because shallow/spoofed static/chart payloads can satisfy the completion gate without passing the existing finalizers. Second bounded fix round authorized; Task 4 remains gated.
- Task 3 final fix commit: `f9add07a6a156f5f7a481a2771b0e222bdabbc94` (`fix(content): require validated authoring completion`); focused 34/34 and exact Task-3 selection 91/91.
- Task 3 final re-review: T3-R06 RESOLVED; spec compliance APPROVED; code quality APPROVED. Task 3 complete at `f9add07a6a156f5f7a481a2771b0e222bdabbc94`; SCM-S03/S04/S13 retain engine/lifetime evidence only and remain partial until later composition/real-use slices.
- Task 4 implementation commit: `37462084ab42b5b0611ab45b2e1388c81f505e02` (`feat(content): add non-modal source content workspace`); deterministic 38/38, lifecycle 10/10, corrected four-case Chromium 4/4.
- Task 4 scoped review: CHANGES REQUIRED. T4-R01 wide workspace is clipped by the narrow auxiliary host and overflow assertion misses the panel; T4-R02 saved canvas selection is not restored; T4-R03 Content commands still expose four controls because Pages & sections was not separated; T4-R04 catalogue state resets across close/reopen; T4-R05 deferred dependency breadcrumbs are dead buttons; T4-R06 C01-C03 evidence is overpromoted until those facts pass. Bounded fix round authorized; Task 5 remains gated.
- Task 4 fix commit: `3129da516f718b9172718de521a52f6f98a889e4` (`fix(content): close source content workspace fidelity gaps`); deterministic 40/40 and exact corrected Chromium 4/4 at 1440×900 and 1024×768.
- Task 4 evidence-owner correction: `6df129cda5006f9d0bbd8dba0844b8bd1dbb40b9` (`docs(audit): correct Task 4 evidence owners`).
- Task 4 final review: T4-R01 through T4-R06 RESOLVED; spec compliance APPROVED; code quality APPROVED. SCM-C01/C02/C03 Passing; SCM-C04 Partial with Task-6 dependency navigation/actions explicitly deferred. Task 4 complete at `6df129cda5006f9d0bbd8dba0844b8bd1dbb40b9`.
- Task 5 implementation commit: `363a7c6ffa5874bb34bb4ec22a13dbdfd468c88c` (`feat(qmd): render local media through safe portals`); exact deterministic 91/91 and mounted Build/View/fullscreen checkpoint with zero requests, balanced healthy leases, and no orphan hosts.
- Task 5 scoped review: spec compliance APPROVED; code quality CHANGES REQUIRED. T5-R01 invalid non-blob resolver results can release twice; T5-R02 center/end token margins are incorrect; T5-R03 narrow-wrap container query lacks a live container owner; T5-R04 document-level fidelity/security summaries are stale. Bounded fix round authorized; Task 6 remains gated.
- Task 5 fix commit: `0c967b1e35a38a75e7ce3c2b8432b2d1504834a9` (`fix(qmd): close safe portal lifecycle gaps`); focused 3/3, component 14/14, exact Task-5 selection 94/94.
- Task 5 final review: T5-R01 through T5-R04 RESOLVED; spec compliance APPROVED; code quality APPROVED. SCM-S11 engine/mounted runtime Passing; SCM-C07 foundation Partial pending Task 9; SCM-C06/R03 unpromoted. Task 5 complete at `0c967b1e35a38a75e7ce3c2b8432b2d1504834a9`; Task 6 remains gated.
- Task 6 implementation commit: `109b3ca1f7f03099e4783e77b6aa6545d9792f81` (`feat(content): enforce direct dependency deletion rules`); deterministic 22/22 and desktop/tablet manager checkpoint 2/2.
- Task 6 scoped review: CHANGES REQUIRED. T6-R01 canonical uploaded CSV/GeoJSON dataset descriptors are omitted; T6-R02 source deletion lacks a valid current-authority identity check; T6-R03 mounted media deletion omits reference-aware authored-byte deletion/compensation; T6-R04 eligible modal cancel/focus is not exercised and S07/C08 are overpromoted. Reviewer owner-boundary concern is locally resolved by the master’s explicit post-checkpoint authorization of `SourceContentWorkspace.jsx` for the transient post-validation carrier. Bounded fix round authorized; Task 7 remains gated.
- Task 6 fix commit: `1dde148f6521be1ad824ed79b0ec12b97edeefa9` (`fix(content): close dependency deletion integrity gaps`); deterministic 26/26 and mounted desktop/tablet 2/2.
- Task 6 final review: T6-R01 through T6-R04 RESOLVED; spec compliance APPROVED; code quality APPROVED. SCM-S05/S06 and bounded SCM-S07 Passing; SCM-C08 delete branch Passing with overall row Partial for deferred replace/relink. Task 6 complete at `1dde148f6521be1ad824ed79b0ec12b97edeefa9`.
- Task 7 implementation commit: `6f0d09a` (`feat(content): add scoped media reuse and import flows`); deterministic 40/40 and named Journey A 1/1.
- Task 7 scoped review: CHANGES REQUIRED. T7-R01 report/fidelity/security/evidence updates are absent; T7-R02 Journey A omits required lifecycle/import/default/hash/focus branches; T7-R03 QMD authoring previews lack live media render context; T7-R04 Reuse choice does not update coordinator retainer identity; T7-R05 Image picker permits unhealthy records. Bounded correction wave authorized; Task 8 remains gated.
- Task 7 fix commit: `32130fb375d222eff405ce70fbce571159fe8cae` (`fix(content): close Journey A media lifecycle gaps`); deterministic 43/43, preview lifecycle 2/2, picker/coordinator 19/19, named Journey A 1/1 at all accepted viewports.
- Task 7 final review: T7-R01 through T7-R05 RESOLVED; spec compliance APPROVED; code quality APPROVED. SCM-S03 and SCM-R01 Passing; SCM-S13/C04/C05 remain proportionately Partial across later kinds/actions. Task 7 complete at `32130fb375d222eff405ce70fbce571159fe8cae`.
- Implementer agent: `/root/task_1_implementer`.
- Initial implementation commit: `c07dbacd4d049849debbfd33d58b766679249d62`.
- Ruling: do not run the explicitly conditional full build merely to refresh tracked `dist`; treat the sole PS-04 stale-generated-client failure as an exact pre-merge/build residual while retaining its 259/260 result and the passing live-source/package/portable boundary evidence — the plan explicitly assigns full build/generated-client refresh to the later master-authorized pre-merge gate — if wrong, a V5 portable-client integration defect remains hidden until that required gate, so Task 17 must keep PS-04 non-green and cannot claim complete targeted verification before the authorized build rerun.
- Task-1 review over `3bc143f..f73391d`: spec compliance `CHANGES_REQUIRED`; code quality `CHANGES_REQUIRED`.
- Fix round 1 findings: T1-01 dangling Static Image `mediaId`; T1-02 omitted selected staged asset declaration; T1-03 superseded same-MediaItem asset not reference-pruned before budget validation; T1-04 duplicate physical promotion payload; T1-05 Task-1 media authority coherence gaps.
- Fix round 1 owner: resume `/root/task_1_implementer`; corrections must land together as a separate atomic commit before scoped re-review.
- Fix round 1 commit: `856e1a1081afc56152469751cc816e7e9cb6ea98` (`fix(content): enforce V5 image ownership invariants`).
- Fix round 1 evidence: focused GREEN 3/3 schema, 10/10 transaction, 5/5 promotion, 5/5 media; bounded combined correction selection 102/102; diff/status clean; PS-04 unchanged and not rerun.
- Fix round 1 re-review: T1-01/T1-04/T1-05 resolved; T1-02 remains open because unrelated/non-exact staged declarations can publish unrelated bytes; T1-03 remains open because asset→URL replacement retains the superseded asset.
- Fix round 2 owner: resume `/root/task_1_implementer`; scope limited to exact staged declaration validation and reference-aware previous-asset pruning for every transition away from that asset.
- Fix round 2 commit: `f81239ba288816603f3c6db14fc6b4a00141d5b9` (`fix(content): close V5 image publication ownership gaps`).
- Fix round 2 evidence: focused 12/12; bounded correction selection 104/104 outside the known Vite filesystem sandbox; diff/status clean; PS-04 unchanged and not rerun.
- Fix round 2 re-review: T1-01 through T1-05 all resolved; spec compliance APPROVED; code quality APPROVED.
- Task 1: complete at `f81239ba288816603f3c6db14fc6b4a00141d5b9`; review clean; PS-04 retained solely as the authorized pre-merge generated-dist condition.

## Task 2

- Task 2: BASE `f81239ba288816603f3c6db14fc6b4a00141d5b9`.
- Brief: `.superpowers/sdd/2026-08-25-source-content-manager-and-qmd-reusable-media/task-2-brief.md`.
- Implementer model: `gpt-5.6-sol`, high reasoning; fresh context; no subagents.
