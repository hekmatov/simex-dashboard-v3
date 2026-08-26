# Source Content Manager and QMD Reusable Media — Implementation Evidence

**Date:** 2026-08-25

**Execution plan:** `docs/superpowers/plans/2026-08-25-source-content-manager-and-qmd-reusable-media.md`

**Starting HEAD:** `3bc143f858ae96a66275462b587bd2bc506cf781`

**Status:** Implementation authorized and in progress. Bounded Tasks 1–13 provide the row-level evidence recorded below; Tasks 14+ and complete amendment fidelity remain pending.

## Pre-implementation browser-edit baseline gate

- Checked from the linked worktree root at `2026-08-25T19:58:02+02:00`.
- `packaged-dashboard-bundle.json`: absent.
- The user did not report pending browser edits requiring export.
- Result: **No browser-edit baseline present.** No promotion/rebuild baseline branch or baseline commit is required before Task 1.

## Accepted Step 7S baseline preflight

The controlling table under `## Final Step 7S controlling 36-row disposition` remains the accepted baseline. Its exact section contains 36 unique rows (`FT-01`–`FT-12`, `IM-01`–`IM-16`, `PS-01`–`PS-08`), each with Engine, UI, and Fidelity equal to `Passing`.

The plan's unbounded draft regex also matches six later historical/support-table rows with repeated IDs and therefore reports 42 rows. That is a parser-scope defect, not baseline drift. Task 1 will synchronize the plan's command to select the controlling section and assert the exact unique ID set before any implementation status is promoted.

## Task 1 — V5 registry and complete Static Image compatibility

**Implementation state:** Engine and live wiring complete. SCM-S01/SCM-S02/SCM-S03 remain partial amendment rows because manager/QMD and later integrated fidelity branches are not implemented by Task 1.

### RED evidence

- Added focused V5 registry, V4 migration, V5 bundle, logical media identity, Static Image schema/resolver, atomic draft/transaction, exact `StaticContentEditor` wrapper, render-context transport, Present/Audience protocol, package, and portable-surface coverage before production implementation.
- The first exact Task-1 command failed on the intended missing V5 registry/migration, `sourceVersion:2` placement, `mediaId`/media revision ownership, complete editor payload, atomic candidate, and content-render-context paths.
- A later focused RED exposed incomplete linked-URL drafts being prematurely final-validated; `tests/staticContentDraft.test.js` now fixes that contract at the editing boundary.

### Implemented contract

- Dashboard and bundle boundaries emit version 5 while chart instances stay version 3.
- V4 asset/package/URL/replacement-required Images migrate deterministically to one `contentLibrary.mediaItems` record and one `sourceVersion:2` placement.
- Image create/edit returns exact `{destination,panel,placement,mediaItem,assets,stagedAssetIds}`; the durable boundary stages only finalized bytes, validates one candidate, publishes atomically, and preserves the prior dashboard/staged inventory on failure.
- Build, View, fullscreen, Present, Audience, load, bundle, export, candidate, import, promotion, and portable package owners resolve the same logical `mediaId` and media-owned revision. Static source placements no longer own origin or revision.
- Arbitrary Free-text remains permissive and inert. The accepted four-stage static and six-stage chart workflows remain unchanged.

### Fresh targeted verification

- Exact Task-1 Node command, elevated only to allow existing Vite transforms and the portable localhost launcher: **259/260 passing** in 50.9 s.
- The sole remaining failure is PS-04: its copied package launches and serves the promoted raster, but the test copies the deliberately unrebuilt pre-Task-1 `dist`; that compiled V4 client cannot mount the current canonical V5 configuration and times out locating `Biomedical`. Regenerating `dist` requires the explicitly prohibited full build. All source/package/unit owners in the same exact command pass.
- Targeted Chromium selection contains exactly the requested two files and 11 journeys. The literal extra `--` shown in the draft command is parsed by Playwright as a test-file token, so execution used the equivalent valid form without that token.
- The combined live-source Chromium process deterministically lost its companion server around 2.8–3 minutes; remaining tests then failed only with `ECONNREFUSED 127.0.0.1:4174`. Bounded clean partitions established all 11 journeys passing: Audience; production journeys at 1440×900, 1024×768, and 768×900; IM-06; live PNG/JPEG/WebP intake; quota/budget recovery; dirty selection; packaged preview; and IM-08 at 1440×900 and 1024×768.

### Mounted in-app browser checkpoints

Using the live source at a clean local origin, a real PNG was uploaded through the four-stage Image workflow and committed as placement `static-bd76f3ee-b2f9-4034-82a9-59b4e613dafb`, media `media-static-bd76f3ee-b2f9-4034-82a9-59b4e613dafb`, source revision 1, media revision 1, and `contentMedia` count 1.

- Build 1440×900: mounted blob image with exact alt; panel 661.5×418 px.
- View 1440×900: identity/revisions/count unchanged; image viewer 635.5×392 px.
- Fullscreen 1440×900: identity/revisions/count unchanged; viewer 1428×888 px.
- Present 1440×900: Image selectable as the sole scene item; scene status changed to one selected chart and the audience monitor produced its preview.
- View 1024×768: identity/revisions/count unchanged; viewer 427.5×392 px; document horizontal overflow 0.
- Fullscreen 1024×768: identity/revisions/count unchanged; viewer 1012×756 px; document horizontal overflow 0.
- The in-app browser backend suppressed the separate Audience popup: the controller remained `Opening audience display` and no popup tab existed to claim. This is recorded as a browser-control limitation; the real targeted Chromium Audience journey passed and inspected passive identity/layout/failure/replay behavior.

### Step 7S result

The corrected parser scopes only `## Final Step 7S controlling 36-row disposition`, asserts the exact unique FT-01–FT-12, IM-01–IM-16, and PS-01–PS-08 set, and checks Engine/UI/Fidelity. Fresh result: **36 rows, 36 unique IDs, 0 non-Passing rows**.

### Rulings and deviations

- **Ruling: scope the Step 7S parser to the controlling section — later historical/support tables intentionally repeat six IDs — cost if wrong: false baseline drift or accidental downgrade of an accepted row.**
- **Ruling: run the two Playwright files without the draft command's literal separator token — Playwright treats `--` as a file expression rather than an option terminator — cost if wrong: the requested journeys never start.**
- **Ruling: partition the 11 Chromium journeys after the live companion watchdog — every post-watchdog failure was connection refusal and each bounded partition passed — cost if wrong: a real cross-journey leak could be hidden; isolated-state `beforeEach` plus clean per-partition reset limits that risk.**
- **Ruling: do not regenerate `dist` to make PS-04 consume V5 — Task 1 explicitly prohibits a full build/generated-output update — cost if wrong: the exact Node command remains 259/260 until the authorized build/release slice refreshes the compiled client.**

## Task 3 — Draft publication and durable rename models

**Implementation state:** SCM-S03/SCM-S04/SCM-S13 engine and application-session lifetime transport implemented. Complete rows remain unpromoted because manager composition, concrete upload flows, and retained browser journeys are later tasks.

### RED evidence

- The exact pre-production command discovered 74 tests: 68 passed and 6 failed, with zero skipped/todo.
- Intended failures were missing `sourceEntrySchema.js`, missing `contentDraftTransaction.js`, missing active-retainer dirty/cleanup projection, and unfrozen media rename.
- The existing dashboard App Vite SSR check also failed because the managed filesystem sandbox denied `vite.config.js`; this was classified as inherited environment behavior before production changes.

### Implemented contract

- Frozen media/source rename copies; trusted explicit CSV/GeoJSON provenance classification; sorted builder-manageable listing.
- One App-owned coordinator with exact stage/update/commit/discard/owner/transaction/snapshot/subscription/disposal API and exact prop/callback transport.
- Pure one-candidate publication with authored-byte snapshots, dashboard/byte compensation, surfaced rollback failures, and completed-owner-only cleanup.
- Exact active retainers drive Build dirty state and startup authored-asset reconciliation. Committed unused media survives; abandoned or failed session assets do not.

### Fresh targeted verification

- Exact Task 3 command outside the restrictive filesystem sandbox: **85 passed / 0 failed / 0 skipped / 0 todo**, 7.42 s.
- No full build, full suite, Playwright, browser checkpoint, composition promotion, or real-use promotion was run or claimed for this engine/lifetime slice.

### Validated finding fix round

- BASE `0a659743335ac17591b8e49149740522567259a7`; focused RED **11/15 passing** with four exact contract failures; focused GREEN **15/15 passing**.
- Fresh exact Task 3 selection: **91 passed / 0 failed / 0 skipped / 0 todo**, 7.97 s.
- Durable manager Add now runs through serialized `replaceWith` plus `requireDurableStorage:true`; dashboard-asset/localStorage failure rejects and byte compensation leaves no durable record, while success survives reload.
- Post-commit session cleanup failure retains explicit `cleanup-required` state and cannot revert the already-published dashboard/durable bytes.
- Active-only retainers protect staged bytes without promoting them; only saved manifest/media references recover staged journal entries.
- Internal coordinator transaction IDs collision-check; public transaction ownership survives draft success/failure.
- Exact coordinator prop transport reaches both authoring wizards, alongside the wrapper callbacks.
- Completion uses exact finalizer-returned session objects: manager is the explicit Add owner, Image/QMD stage `finalizeStaticContentDraft` output directly, and chart stages `finalizeWizardDraft` output directly. No manager UI or Task 4+ architecture was added.

### Final T3-R06 correction

- BASE `be6416f026a271008385f4d94f26615cd8697113`; narrow RED **8/9 passing**, focused GREEN **34/34 passing**, exact Task 3 selection **91/91 passing** in 7.65 s.
- Shallow chart, static, and missing-media lookalikes cannot publish. Positive coordinator tests pass actual objects returned by `finalizeWizardDraft` and `finalizeStaticContentDraft`.
- Finalizer-owned module-private `WeakSet` brands are consumed before coordinator cloning and reduced to a session-only completed-draft ID. This avoids a serializable/spoofable marker, schema duplication, import cycles, and future-flow behavior; manager explicit Add remains allowed.

## Task 4 — Non-modal manager shell and catalogue composition

**Implementation state:** SCM-C01–C03 Engine/UI/Fidelity Passing for the bounded manager-shell journeys. SCM-C04 is partial: passive type metadata plus durable rename/default-description are implemented; action-rich detail flows remain later work.

### RED and deterministic evidence

- Initial exact Task 4 selection: **32 passed / 3 failed / 0 skipped / 0 todo** on the intended missing command/workspace/detail contracts.
- Exact Task 4 GREEN: **38 passed / 0 failed / 0 skipped / 0 todo**, 2.93 s.
- The first mounted run produced **3 passed / 1 failed**. Browser capture proved the rename failed before persistence with `Content draft coordinator is disposed` during StrictMode effect replay.
- Focused lifecycle RED/GREEN: `tests/contentDraftTransaction.test.js` moved from **9/10** to **10/10** passing. App now defers coordinator disposal behind a retained-generation check, so replay cleanup is cancelled while final unmount still disposes.

### Mounted Chromium evidence

- Correct command: `pnpm.cmd test:e2e tests/e2e/source-content-manager.spec.js --project=chromium`.
- Final result: **4 passed / 0 failed**, 53.4 s.
- 1440×900: exact command inventory and six/four stage counts; one persistent canonical canvas; close restores scroll and Source content focus; desktop split; durable rename reflected in the open catalogue; search/filter continuity; usable canvas target; zero horizontal overflow.
- 1024×768: one unchanged canonical canvas; tablet list-to-detail/Back; selected row and filters preserved; usable canvas target; zero horizontal overflow.
- No local catalogue projection or persistence bypass was introduced. The open manager consumes the dashboard published through the App-owned serialized coordinator.

### Deferred truth

- Upload/picker/import-local, replacement/relink, delete/recovery, computed dependency blockers/actions, GeoJSON preview, full CSV preview/profile, and all Task 5+ journeys remain unimplemented and unverified.
- No full build, full suite, generated-output refresh, dependency addition, or parent progress update was performed.

### Validated T4-R01–R06 correction round

- BASE `37462084ab42b5b0611ab45b2e1388c81f505e02`; focused deterministic RED **36/40** and exact GREEN **40/40**, with zero skipped/todo.
- Final corrected Chromium command: **4/4 passed**, 1.0 min.
- 1440×900: Content region has exactly three controls; Structure separately retains Pages & sections; six/four stages pass; a changed valid page selection restores exactly on close before scroll/focus; host horizontal scroll is absent; workspace and desktop catalogue/detail panes are contained and ordered; close/reopen preserves every browse field and selection.
- 1024×768: host horizontal scroll is absent; workspace and visible pane are contained; one canonical canvas persists; tablet detail remains material across close/reopen and Back restores the selected row and filters.
- Build owns only serializable browse state. Conditional manager unmount still discards unresolved rename drafts; no hidden workspace, local catalogue overlay, or persistence bypass exists.
- Direct-use graph scanning and enabled breadcrumb navigation were removed from Task 4. Only supplied committed usage metadata renders, as passive text unless a future owner supplies navigation.
- C01–C03 are Passing on these corrected facts. C04 remains Partial; passive breadcrumbs are present only for supplied metadata and Task 6 dependency computation/navigation remains deferred.

## Task 5 — QMD grammar, safe hosts, and portal runtime

**Implementation state:** SCM-S11 engine and mounted renderer/request-authority slice implemented. SCM-C07 fallback/aspect-token foundation implemented but remains Partial pending Task 9 exhaustive responsive/RTL geometry. SCM-C06 and SCM-R03 remain unimplemented/unpromoted.

### RED and deterministic evidence

- The first sandboxed exact command produced **38 passes / 7 file-level failures**; six were inherited linked-worktree Vite/esbuild access-denied setup errors. The missing portable-media module was the intended product RED.
- The usable exact RED outside that restriction produced **80 passes / 5 failures / 0 skipped / 0 todo** on missing grammar/annotation, hosts, QMD view, and portal lifecycle.
- Focused grammar, lease/fallback, and portal/surface selections reached **6/6**, **2/2**, and **11/11** respectively.
- Exact Task 5 selection reached **90/90** before the final mounted-checkpoint test addition and **91/91** in the fresh final run, with zero skipped/todo.

### Implemented runtime boundary

- One cycle-free grammar owner annotates the primitive QMD AST and consumes only one fully allowlisted immediate suffix. Compile and later dependency extraction consume that same annotated AST contract.
- Only known local asset/package identities receive production-owned hosts. Unsafe, unknown, malformed, external-only, HTTP/HTTPS, data, blob, and file destinations remain visible inert text and produce zero requests.
- Known missing/corrupt identity persists through a bounded fallback. Build receives repair navigation; View/fullscreen remain passive.
- Healthy authored media owns one resolve/release lease per mounted QMD view. Portals are tied to the committed compiled fragment and clear on recompile/unmount without stale re-acquisition.
- The existing DashboardRenderer → DashboardModeWorkspace → DashboardCanvas → ChartPanel transport now reaches FreeText through ChartView's `renderContext` handoff.

### Mounted Build/View/fullscreen checkpoint

- One real `ChartView` QMD document mounted at Build, View, and fullscreen with healthy, missing, corrupt, External, and raw HTTPS nodes.
- Observed: 9 logical local hosts; 3 healthy images; three missing and three corrupt fallbacks; two Build-only repair controls; no passive repair controls.
- External/raw HTTPS text remained visible on all surfaces; monitored external requests were zero.
- Lifecycle log contained exactly three acquires and three releases; unmount left zero hosts/images.

### Deferred truth

- At the Task 5 checkpoint, Tasks 6–8 and Task 9 inspector geometry remained pending. The later Task 6–8 sections below supersede that historical state; Task 9 inspector controls and complete Journey C fidelity remain pending.
- No sanitizer, manager/picker action, replacement behavior, dependency graph, generated output, full build, full suite, or parent progress update was introduced.

### Validated T5-R01–R04 correction

- BASE `363a7c6ffa5874bb34bb4ec22a13dbdfd468c88c`; corrected focused RED **0/3**, focused GREEN **3/3**, complete component selection **14/14**, and fresh exact Task 5 selection **94/94** with zero skipped/todo.
- A rejected non-blob resolver lease now transfers ownership before its immediate release, so subsequent effect cleanup cannot release a non-idempotent handle twice. Normal healthy acquire/release, recompile, and unmount remain covered.
- Logical block alignment now places start, center, and end at 0, 140, and 280 px respectively for a 280 px item in the mounted 560 px content column.
- `.free-text-chart-view__content` is the live inline-size container owner. The focused 400 px contract preserves authored `wrap-start` data while the existing narrow query produces `float:none` and `max-inline-size:100%`.
- Document summaries were corrected for Tasks 1–5 current bounded status. Fidelity/security row-level statuses were not promoted or otherwise changed by this correction.

## Task 6 — Direct dependency graph and atomic no-cascade deletion

**Implementation state:** SCM-S05 and SCM-S06 are Passing for the bounded direct-graph/retainer/context slice. SCM-S07 is Passing for the bounded deletion engine plus mounted manager carrier. The delete branch of SCM-C08 is Passing; the complete C08 row remains Partial pending later replacement/relink modals.

### RED and deterministic evidence

- The initial exact pre-production command was unusable because Node ignored not-yet-created paths and reported **11/11 passing**.
- With tests present, the intended RED was **11 passing / 3 file-level failures**: missing graph/deletion modules plus the inherited linked-worktree Vite/esbuild access restriction for the JSX selection.
- Focused transient-carrier RED/GREEN: **2/3** then **3/3**. Focused post-validation SourceEntry carrier RED/GREEN: **3/4** with `Source entry property "uses" is unknown`, then **4/4**.
- Fresh exact Task 6 selection outside the inherited Vite restriction: **22/22 passing**, zero skipped/todo, 3.686 s.

### Implemented boundary

- Task 5 annotated QMD media, Static Image mediaId, managed primary CSV sourceId, and map geoSource GeoJSON are the only direct saved edges. Breadcrumbs are edge context and duplicate panel/content references collapse.
- Actual active draft/replacement/transaction retainers are separate from saved uses. Chrono/Scene/Scene-presentation are downstream CSV impacts; Present/Audience payloads and leases are transient and GeoJSON has no temporal contexts.
- The manager receives a transient, non-enumerable dependency/action carrier after durable source validation. Blocked Delete is disabled with inline guidance and no dialog; ready Delete owns the scoped destructive confirmation.
- The transaction rechecks identity/revision, never cascades through dependents, preserves shared authority, and compensates dashboard/authority writes on failure.

### Mounted checkpoint and deferred truth

- Planned Chromium selection, with no literal `--` separator: `pnpm.cmd exec playwright test tests/e2e/source-content-manager.spec.js --project=chromium --grep "desktop composition|tablet composition"` — **2/2 passing**, 24.6 s, at 1440×900 and 1024×768.
- The authorized DashboardRenderer → BuildWorkspace → SourceContentWorkspace carrier remained mounted without regressing the canonical canvas, durable rename, desktop split, or tablet list/detail/Back composition.
- At the Task 6 checkpoint, the bounded viewport cases did not separately click an eligible deletion and Tasks 7–8 remained pending. The later Task 7–8 sections below supersede that historical state; later preview/recovery flows, full build, and full suite remain pending.

### Validated T6-R01–R04 correction

- BASE `109b3ca1f7f03099e4783e77b6aa6545d9792f81`; final exact Task 6 selection **26/26 passing**, zero skipped/todo, 3.546 s.
- One canonical source-kind helper covers tracked and uploaded-dataset CSV/GeoJSON forms in both graph and manager projection. Source plans freeze and recheck SourceEntry plus authoritative descriptor and CSV-profile identity without adding a SourceEntry revision; unrelated dashboard drift remains allowed.
- Mounted adapters snapshot authored bytes, publish the candidate dashboard, retain shared physical dedupe through the candidate asset-reference graph, remove unique bytes, and compensate dashboard plus bytes for injected publication or byte-delete failure.
- The master explicitly authorized only `SourceContentWorkspace.jsx::visibleManagerItems/contentItem` for the post-validation transient carrier. Its exact zero-use state is now known-unused rather than unknown, without extending durable records.
- Final planned Chromium selection **2/2 passing**, 40.4 s, at 1440×900 and 1024×768. Each viewport proves blocked used-source Delete opens no dialog; eligible retained external media opens the correctly named confirmation, Cancel owns initial focus, exact saved configuration is unchanged, and focus returns to Delete. The tablet detail pane is bounded and scrollable so the action remains reachable.
- SCM-S07 and the SCM-C08 delete branch are Passing on this mounted evidence. At that checkpoint no Task 7+ journey was promoted; the later Task 8 section promotes the media-replace branch while C08 remains Partial for CSV/GeoJSON replacement/relink.

## Task 7 — Media creation, picker import, and Journey A

**Implementation state:** SCM-S03 and SCM-R01 are Passing for the accepted media Journey A. The Task 7 manager/QMD/Image branches of SCM-S13, SCM-C04, and SCM-C05 are Passing; those cross-kind composition/lifecycle rows remain Partial for later chart/CSV/GeoJSON selector and browser owners. At the Task 7 checkpoint global replacement and Task 9 QMD inspector behavior remained unimplemented; the Task 8 section below supersedes the replacement state, while data-source relink and Task 9 remain pending.

### Correction RED and deterministic evidence

- Initial Task 7 commit `6f0d09a` reached **40/40** on the accepted selection and **1/1** on the original named Journey A, but review found T7-R01–R05.
- Picker/retainer correction RED was **5/7**, with unhealthy Image identities selectable and duplicate radio changes not updating the live retainer. Focused GREEN was **7/7**.
- Mounted authoring-preview RED was **0/2** because both previews omitted the real render context. Focused GREEN was **2/2**, with exact acquire/release on unmount through the existing authored-asset resolver.
- Fresh accepted six-file command is **43/43 passing**, zero failed/skipped/todo. It covers exact selection negatives, immediate Reuse/Separate retainer movement, staged-to-durable content commit, cancellation/failure inventories, placement-owned alt behavior, Build Reset, and contextual Restore.

### Named Journey A checkpoint

- Corrected command, with no literal separator: `pnpm.cmd test:e2e tests/e2e/source-content-media.spec.js --project=chromium --grep "Journey A — media create reuse default external import restore dependencies delete"` — **1/1 passing**, 1.8 min.
- Build 1440×900: manager Cancel, Escape, Close, mode departure, unmount, invalid-raster rejection, Add/reuse/separate, durable metadata/default edit, QMD local-upload cancel, failed direct External fetch followed by local upload, Image/QMD selection, Restore Save/Discard, dependency breadcrumb, disabled no-dialog, and eligible deletion were materially exercised. Cancelled inventories and page-error inventory were empty.
- Exact correspondence showed two requested logical IDs over one physical asset, whose assetId equals `asset-<manifest.sha256>` and whose manifest dimensions/type/byte length match both media records. External import preserved the original External identity/use and created a distinct local item.
- Build 1024×768 retained the tablet manager list/detail/Back composition after reload. QMD View 390×844 rendered the original placement-owned alt after the manager default changed; a later Image placement used the new default.
- Semantic injection, not browser labels, owns exhaustive persistence-failure compensation and exact manager Close/Escape/mode-departure/unmount/disposal inventories. Mounted component tests own pre-commit resolver acquisition/release. The real browser owns representative cancellation, import, focus, continuity, and viewport fidelity.

### Security/deviation boundary

- QMD selects only healthy stored/packaged identities. Image additionally selects only valid External HTTPS identities. Unhealthy identities remain explanatory, noninteractive inventory.
- Import performs only explicit browser CORS fetch or user local upload through the existing raster validation path. No proxy, elevated fetch, second resolver, raw-QMD URL conversion, dependency, or network service was introduced.
- The filename fallback supplies initial contextual alt only for a new local QMD upload with no External default. QMD source remains the placement owner and existing alt is never rewritten.

## Task 8 — Atomic global media replacement and Journey B

**Implementation state:** SCM-S08 and SCM-R02 are Passing for the accepted global media-replacement slice. The media-replace branch of SCM-C08 is Passing; C08 remains Partial because later CSV/GeoJSON replacement and relink dialogs are outside Task 8. Task 9 placement-inspector behavior remains unimplemented and unpromoted.

### RED and deterministic evidence

- Exact RED preceded production. The selected command could not load the absent `contentReplacementTransaction.js`, and the new store case observed immediate removal instead of lease-deferred retirement; 22 pre-existing assertions passed. Vite-backed view cases also reported the known sandbox-only esbuild ancestor-read denial, which is environmental rather than a product assertion.
- Focused transaction/store/coordinator GREEN was **25/25**, including prepare/commit, expected-current drift, write/dashboard/publish compensation, coordinator lifetime, and old-asset lease retirement.
- Fresh exact accepted command after T8-R01–R05 correction: `node --test tests/contentReplacementTransaction.test.js tests/staticSourceSchema.test.js tests/staticPanelTransaction.test.js tests/imageChartView.test.js tests/qmdMediaView.test.js tests/browserAuthoredAssetStore.test.js` — **42 passed / 0 failed / 0 skipped / 0 todo**, 2.922 s.
- Correction RED/GREEN: transaction cases moved from **7/9** to **9/9** for live metadata rebase and same-revision source-hash drift; the two mounted lifecycle regressions each failed before the fix and the combined mounted/dialog gate is now **8/8**. Deferred prepare leaves no late state/bytes/retainer, and committing unmount performs no draft discard.
- The replacement plan is immutable and retains old/new asset IDs plus media ID through `beginTransaction`. Completion happens only after dashboard persistence and byte publication; failure compensates dashboard, store snapshot, session state, and retainers. Expected-current revision/identity drift rejects before durable writes.
- Browser-authored byte retirement is lease-aware: removing the superseded asset marks it retired, keeps active object URLs/bytes readable, and deletes/revokes only after the final release.

### Named Journey B checkpoint

- Corrected command, with no literal separator: `pnpm.cmd test:e2e tests/e2e/source-content-media.spec.js --project=chromium --grep "Journey B — global media replacement preserves placement state"` — **1/1 passing**, 48.2 s test time and 51.3 s total.
- Build 1440×900 created one reusable media identity with distinct QMD and Image contextual state, set Image zoom to 1.5×, proved valid-file Cancel and Escape return exact dashboard/store/session inventories with no retainer and focus returned, rejected an invalid candidate without mutation, and confirmed one scoped replacement.
- Exact before/after correspondence retained mediaId, Image alt/decorative/crop/rotation/fit, QMD alt/caption/width/align/frame/flow, and 1.5× viewer zoom while revision advanced 1→2 and hash/render changed for both uses.
- The replacement dialog gave initial focus to file selection, reported invalid input in the dialog, committed only after explicit confirmation, returned focus to the trigger, and exposed no global Undo/Redo affordance.
- The committed manifest hash and fetched rendered-Image blob SHA-256 both equal the uploaded JPEG fixture. View and fullscreen inspect revision 2 Image and QMD from the same logical media identity; the QMD assertion is identity/revision/visibility rather than a second fetch of its already-rendered blob URL. Exhaustive rollback and lease timing remain deterministic-test owners.

### Row and boundary disposition

- **SCM-S08:** Passing for stable identity, monotonic revision, one-candidate publication, expected-current safety, exact placement/viewer invariance, compensation, and old-lease safety.
- **SCM-R02:** Passing for the accepted named Journey B at Build, View, and fullscreen.
- **SCM-C08:** Media-replace branch Passing. The row remains Partial for later data-source replacement/relink dialogs.
- No Task 9 placement controls, CSV/GeoJSON replacement/relink, global Undo/Redo, dependency, generated output, full build, full suite, or parent progress update is introduced.

## Task 9 — QMD placement inspector, responsive geometry, and Journey C

**Implementation state:** SCM-S11, SCM-C06, SCM-C07, and SCM-R03 are Passing for the complete accepted QMD allowlist/inspector/runtime slice. Task 10 CSV management and every later journey remain unimplemented and unpromoted.

### RED and deterministic evidence

- The first sandboxed exact command hit the inherited linked-worktree Vite/esbuild ancestor-read denial. The required exact command was rerun outside that restriction before production.
- Usable exact RED was **29/34 passing** with five intended failures: absent inspector controls/routing, inline-style/no-data width authority, and fallback caption geometry.
- Focused inspector/view correction reached **8/8 passing**. Pre-commit Change-mode intake isolation moved from **13/14 RED** to **14/14 GREEN**. Fresh exact deterministic command is **35/35 passing**, zero failed/skipped/todo, 10.623 s.
- The selection covers every preset plus integer custom 10–100, malformed/pixel/style/event rejection, alt/decorative/caption separation, selected-node replacement, immutable media revision, no-inline-style content-relative geometry, wrap cap/collapse, RTL alignment, fallback, and safe DOM/request authority.

### Named Journey C checkpoint

- Exact command without a literal separator: `pnpm.cmd test:e2e tests/e2e/qmd-reusable-media.spec.js --project=chromium --grep "Journey C — QMD media controls responsive RTL geometry and request authority"` — **1/1 passing**, 3.5 s test time and 5.3 s total.
- Build 1440×900 exercised 25/33/50/66/75/100, custom 37%, End, Wrap start, Card, caption, contextual alt, Change image, and Open media item. Canonical preview synchronization preceded geometry inspection; authored 75% wrapped media measured exactly 50% of its content column with logical `inline-start` float and zero overflow.
- Build 1024×768 measured final 37% content-relative width, Card/caption, stored 800×400 reserved 2:1 aspect, and zero panel/document overflow.
- View 390×844 retained the authored wrap token and 37% width while float collapsed to `none`; fullscreen at 390×844 RTL retained logical end alignment, collapsed wrap, and rendered a bounded passive missing explanation with zero images or repair controls.
- Placement/More/Open focus checkpoints passed. Change rewrote only `response`→`alternate`; Open routed `alternate`; the complete library snapshot including revisions remained equal. Page errors and authored external/data/file requests were zero.

### Security and scope boundary

- Width reaches CSS only as a validated percentage data token. No arbitrary pixels, inline width style, authored class/style/event, free/absolute position, or border-style authority was added.
- Only stored/packaged identities reach media hosts/picker selection. Change/Open never replace library bytes or revision. Missing/corrupt View/fullscreen remains bounded, passive, and request-free; Build repair is unchanged.
- No Task 10 behavior, parent progress update, generated output, dependency, full build, or full suite is included.

## Task 10 — CSV Manager Add, chart registration, and Journey D

**Implementation state:** SCM-R04 is Passing. The CSV branches of SCM-S04, SCM-C04, and SCM-C05 are Passing; those cross-kind rows remain Partial for the later GeoJSON manager/selector/detail slice.

### RED and deterministic evidence

- Exact RED preceded production: **23/29 passing** with intended missing uploaded-CSV entry/draft/download/filter owners and the absent `DataSourcePicker.jsx`. Inherited JSX/Vite loader constraints were corrected before Task 10 behavior was evaluated.
- Focused core GREEN was **43/43** and chart-authoring GREEN was **68/68**, including exact six-stage IDs/order, managed-only CSV eligibility, and chart draft ownership.
- Fresh exact accepted command: `node --test tests/sourceEntrySchema.test.js tests/contentDraftTransaction.test.js tests/contentDetail.test.js tests/sourceViewer.test.js tests/sourceViewerSort.test.js tests/wizardDraftV3.test.js tests/chartAuthoringComponentsV3.test.js` — **116 passed / 0 failed / 0 skipped / 0 todo**, 2.763 s.
- Deterministic cases prove one atomic manager descriptor/profile/SourceEntry candidate, one atomic chart registration/finalized-chart candidate, unused-source retention, matching-content separate identity, read-only search/download, generated-source exclusion, and exhaustive validation/persistence/owner-exit rollback inventories.

### T10-R01 active/pending source-authority correction

- Focused lifecycle RED was **68/71 passing**, followed by a disposal RED of **70/71**. Focused GREEN is **71/71** and the fresh exact Task 10 selection is **119/119 passing**, zero failed/skipped/todo, 2.524 s.
- The chart wizard keeps the current upload's staged draft/candidate/retainer authoritative while an existing, manual, or uploaded replacement awaits confirmation. Cancel discards only pending authority; confirmation discards current authority before adoption; close/unmount/reset/failure cleans both; completion requires and commits one identity-matched active source/profile/SourceEntry draft with the finalized chart.
- The corrected named Journey D is **1/1 passing**, 41.8 s test time and 43.8 s total. Before the upload branch, the mounted six-stage wizard selects the manager-created existing CSV and observes its profiled `capacity` column while the exact durable CSV inventory remains unchanged.

### Named Journey D checkpoint

- Exact command without a literal separator: `pnpm.cmd test:e2e tests/e2e/source-content-csv.spec.js --project=chromium --grep "Journey D — CSV upload through six stages then catalogue management"` — **1/1 passing**, 39.1 s test time and 41.9 s total.
- Build 1440×900 proved manager Cancel/no-publication, explicit Add of an unused source, descriptor/profile/entry identity correspondence, reload survival, and a matching-fingerprint warning without dedupe.
- A mounted existing managed CSV was selectable in the exact six-stage flow without changing inventory. A chart upload then remained absent from durable inventory until completion; explicit discard retained the exact prior inventory. A fresh upload preserved the exact six stages and atomically published one source/profile/entry with one completed chart.
- Reopened detail exposed origin/health, three-row profile, the named chart dependency, read-only preview search, original-filename download, and focus return on Close.
- Build 1024×768 after reload proved bounded manager geometry, reachable detail, tablet Back, and exact committed inventory retention.

### Scope boundary

- Papa Parse, dataset profiling, and source viewer/filter remain the single existing authorities. The manager and chart flows add no second CSV parser/profile/cache owner.
- No CSV replacement/relink, temporal warning, GeoJSON manager, cell editing, derivative mutation, generated-output ownership, or parent progress update is introduced.

## Task 13 — GeoJSON manager, selector, and shared Build map budget

**Implementation state:** SCM-S04, SCM-S05, SCM-S07, SCM-S15, SCM-C05, SCM-C09, and SCM-R09 are Passing for the Task 13 GeoJSON slice. The GeoJSON detail/dependency branch of SCM-C04 is Passing; SCM-C04 remains Partial because replacement/relink belongs to Task 14.

### RED and deterministic evidence

- Focused RED was **3/5 passing** in `tests/geoJsonContentManager.test.js`: the current selector excluded `type:'uploadedGeoJson'`, and no manager Add transaction existed.
- The first exact eleven-file selection was **114/119 passing**, exposing only the absent manager UI/map-budget behavior and its mounted transport.
- Fresh exact GREEN after the task-scoped correction is **120/120 passing**, zero failed/skipped/todo. It covers the four-gate authority, canonical lean summary, high-property/nested-property non-blocking behavior, atomic Add/cancel/failure inventories, builder-managed tracked/packaged/uploaded eligibility with dashboard-owned generated GeoJSON excluded, staged close/Escape disposal, exact six-stage chart authoring, direct dependencies/blocked deletion, common-ancestor budget allocation/activation/release/priority, visible degraded status, and live chart transport.

### Named Journey I checkpoint

- Exact command without a literal separator: `pnpm.cmd test:e2e tests/e2e/source-content-geojson.spec.js --project=chromium --grep "Journey I — GeoJSON upload select preview dependency and blocked delete"` — **1/1 passing**, 53.6 s test time and 55.3 s total after the task-scoped correction.
- Build 1440×900 and 1024×768 inspected explicit manager Cancel and Add inventories, reload survival of an unused source, canonical summary fields, bounded preview plus textual fallback, and zero manager horizontal overflow. Tablet list/detail/Back remained reachable.
- The real unchanged six-stage chart workflow selected an existing managed CSV and the uploaded GeoJSON, completed a Map scatter chart, then exposed the direct dependency breadcrumb `HeV-A26 Dashboard: Epidemiological overview › Outbreak dynamics › Journey I managed map`. Referenced Delete remained disabled and opened no dialog.
- The journey discarded a staged GeoJSON with Escape, resumed the suspended wizard without that staged option, and proved dashboard-owned generated GeoJSON absent from the builder picker while tracked, packaged, and uploaded items remained eligible.
- Five actual `Biomedical › Outbreak dynamics` dashboard maps entered the one shared provider through their production visibility observers: allocations 3–4 exposed the visible degraded warning, no more than four were allocated, no more than two were normal, excess work was deferred/activatable, and source admission/deletion was unchanged.

### Rulings and scope boundary

- Live inspection established `src/components/chart-authoring/ChartWizardV3.jsx` as the existing owner of the six-stage draft/commit boundary. The Task 13 cost is limited to staged GeoJSON selection and atomic publication through `contentDraftTransaction`; stage count/order remains exact.
- Proposed edits to `geoJsonSourceEntry.js` and `sourceEntrySchema.js` were removed because planned transaction/schema authorities already carried the acceptance contract.
- Exactly four admission gates remain authoritative. Concentration diagnostics and nested properties do not hard-block, and map concurrency is runtime scheduling only. No Task 14 replacement/relink behavior is included.

## Task 14 — GeoJSON replacement and relink

**Implementation state:** SCM-S16, SCM-R10, SCM-R11, and the GeoJSON replacement/relink branch of SCM-C08 are Passing. GeoJSON uses one schema/four-gate authority followed by separately typed direct-map compatibility; no temporal-review contexts are created.

### RED and deterministic evidence

- Exact seven-file RED was **49/52 passing** with failures limited to the missing replacement owner, map-coverage inspection, and typed action dialog.
- Review-fix RED was **5/8 passing**, with exact intended failures for a linked relink fake fetch path, browser import misclassified as packaged, and a keys-only geometry-mix comparison. Exact seven-file GREEN is now **60/60 passing**, zero failed/skipped/todo, 4.56 s, with no additional test file. It covers durable embedded relink reload through the existing provider after removing `loadedData`, zero basename transport, linked cancel/failure equality, exact uploaded import provenance, complete sorted geometry key/count comparison, the original schema/four-gate/compatibility cases, and zero Chrono/Scene/presentation temporal contexts.

### Named Journeys J and K

- Journey J exact command without a literal separator: `pnpm.cmd test:e2e tests/e2e/source-content-geojson.spec.js --project=chromium --grep "Journey J — invalid GeoJSON replacement blocks and imports as new"` — **1/1 passing**, 42.6 s test / 44.5 s total. The imported SourceEntry is exactly `origin:'uploaded'` with selected-filename provenance.
- Journey K exact command without a literal separator: `pnpm.cmd test:e2e tests/e2e/source-content-geojson.spec.js --project=chromium --grep "Journey K — valid GeoJSON geometry change warns then confirms"` — **1/1 passing**, 38.9 s test / 41.7 s total. Its live geometry distribution retains the same sorted keys while Point/LineString counts change 2/1 → 1/2.
- Build 1440×900 and 1024×768 inspected typed dialogs, cancel/focus, exact original identity/render retention on block, distinct import identity, guided live-panel remap, bbox/geometry-mix/reduced-coverage warning facts, stable sourceId and direct chart binding on confirm, changed map render/canonical summary, live tablet map/detail, bounded manager geometry, and unchanged Chrono Group/Scene/presentation state.

### Ruling and scope boundary

- `src/components/source-content/DataSourceDetail.jsx` was verified and authorized as the existing mounted replacement lifecycle carrier omitted from the Task 14 owner list. The implementation reuses its coordinator/modal/navigation contracts; no parallel lifecycle exists.
- The existing geography adapter, ECharts registration, and dependency breadcrumb owners already consume the committed payload and remap targets, so no changes were required there.
- No Task 15 persistence/package, Task 16 recovery/cleanup, hidden metric, global undo, or parent progress update is included.

## Task 15 — V5 persistence, package, and offline retention

**Implementation state:** SCM-S01, SCM-S02, SCM-S12, and SCM-R07 are Passing for the live-source package and online-load→offline-retention boundary. Cold copied/generated-client launch remains the previously accepted PS-04 pre-merge residual and is not claimed here.

### RED and deterministic evidence

- The one owner/fixture preflight confirmed the existing live export→candidate→transactional-import chain and browser asset persistence owners. Only `src/content-library/contentPackageValidation.js`, `tests/contentPackageValidation.test.js`, and Journey G were absent.
- Focused RED failed on the missing validation module. Focused GREEN covered complete used/unused retention, corrupt/missing/animated asset rejection, logical source/profile correspondence, lean GeoJSON facts, and inert unknown QMD media.
- The exact nine-file selection produced **49/51 passing** before one stale V4 assertion was aligned with the authoritative V5 storage boundary; that focused file is now **10/10 passing**. The resulting live-source/product boundary is **50/50 green**.
- The remaining exact-selection case is PS-04 only: outside the sandbox the copied package launches, then the tracked pre-Task-1 generated client cannot find the accepted Biomedical surface. Per the existing ruling, no build or `dist` edit was performed; the aggregate is recorded truthfully as **50/51**, not fully green, until Task 17's authorized pre-merge refresh.

### Package boundary

- `validateContentPackage` runs at V5 serialize/parse and immediately before V5 import preparation. It validates the canonical content library, builder-managed SourceEntry correspondence, CSV payload/profile separation, lean GeoJSON validation facts, QMD media readiness, durable local manifests, decoded payload byte length/MIME/SHA, raster signature, single-frame policy, and complete authored-payload reachability.
- Validation occurs before dashboard/store mutation. Missing, corrupt, mismatched, animated, unreachable, or incomplete content is rejected before import preparation; the existing staged-asset transaction continues to own compensation after validation.
- Logical MediaItems remain separate from physical assets: Journey G retained used revision 7 and unused revision 2 MediaItems pointing to one SHA-addressed asset and one physical payload.

### Named Journey G checkpoint

- Exact command without a literal separator: `pnpm.cmd test:e2e tests/e2e/source-content-portability.spec.js --project=chromium --grep "Journey G — V5 offline round trip and V4 migration retain library"` — **1/1 passing**, 1.5 m test / 1.6 m total on the final live-source candidate.
- Build 1440×900 imported a controlled V4 dashboard as canonical V5 while every retained chart stayed config V3 and obsolete temporal-review metadata stayed absent.
- The V5 round trip retained exact logical IDs/revisions/hash, used and unused media, one deduped physical payload, managed CSV plus its profile, managed GeoJSON with no profile, and the original `simex-media` QMD reference. A fresh context rendered Image, QMD, and map content.
- View 390×844 went offline after the fresh live-source load, then retained Image/QMD/map surfaces, zero horizontal overflow, and QMD fullscreen with **zero subsequent HTTP requests**. This is deliberately not a cold-start/service-worker claim.

### Scope boundary

- No Task 16 health, repair, cleanup, new hardening, build, generated `dist`, full suite, or release suite is included.
- The sole residual is the already-recorded PS-04 cold generated-client condition assigned to Task 17 pre-merge reporting.

### Task 15 scoped review correction

- R15-01 removed the package import's recovery-required partial-success state. Existing exact asset snapshots/restores and the serialized dashboard controller now provide one compensatable sequence: prepare → snapshot → stage/preflight → atomic asset commit → dashboard replace/rebase. Asset-commit failure leaves the dashboard untouched; replace/rebase failure durably restores the prior dashboard; every path rolls back all transaction assets and restores exact prior asset records.
- Focused transaction RED **7/10** → GREEN **10/10**. Injected asset-commit and dashboard-replacement failures each prove exact prior dashboard/store equality and empty import staging; no `dashboardCommitted` marker or recovery journal remains.
- R15-02 exports the existing structural raster inspector instead of adding a parser. V5 package validation now binds intrinsic signature MIME and dimensions to payload/manifest/MediaItem declarations before mutation and retains the existing APNG/animated-WebP checks.
- Focused package/raster GREEN is **20/20**, covering valid PNG/JPEG/WebP structural metadata, arbitrary PNG bytes self-declared as JPEG, forged dimensions, corruption, and animation.
- Corrected final Task 15 selection is **53/54** with PS-04 alone; corrected Journey G is **1/1 passing** at 1.3 m test / 1.4 m total. The original cold generated-client deferral and no-build/no-`dist` boundary are unchanged.

## Task 17 — integrated verification execution (2026-08-26)

This is an evidence-recording task only. It added no production or test changes, did not build, did not edit generated `dist`, and did not attempt to clear PS-04.

- Owner/fixture preflight: clean worktree; all seven retained Playwright files present; exact controlling Step 7S parser returned **36/36 Passing** (36 unique FT/IM/PS IDs with Engine/UI/Fidelity all `Passing`).
- The one required amendment-targeted deterministic command completed **649/674 passing, 25 failing**. Twenty failures stop during sandboxed Vite/esbuild configuration loading (`Cannot read directory ../../../../../..` / cannot resolve the worktree `vite.config.js`). The five remaining failures are `dashboardBundleV3` raster-signature validation, three `datasetProfilesV3` assertion mismatches (two expected rejections no longer occur and the public-shape expectation omits `runtimeContentHealth`), and PS-04 unable to start its copied Windows launcher on any permitted port.
- The one all-seven-file Chromium invocation discovered **15 tests** but returned without a complete aggregate after the observed passing **Journey C** result. Its retained trace verifies local blob-only QMD media, media revision 3, controlled selection/inspector changes, caption/frame, and the 1440×900 Build geometry. No result exists for A, B, D–K or the other manager-composition cases; they are not promoted.
- Integrated acceptance therefore remains **not submitted**. Existing task-local engine/UI/fidelity evidence stays historical evidence only; no amendment row is promoted by this incomplete deterministic/browser execution. The full build, full unit suite, full Playwright suite, generated-client refresh, and PS-04 resolution remain the expressly separate pre-merge/release gate.
