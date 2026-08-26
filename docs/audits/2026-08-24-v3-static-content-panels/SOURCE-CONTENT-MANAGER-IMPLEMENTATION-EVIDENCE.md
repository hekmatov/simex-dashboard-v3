# Source Content Manager and QMD Reusable Media — Implementation Evidence

**Date:** 2026-08-25

**Execution plan:** `docs/superpowers/plans/2026-08-25-source-content-manager-and-qmd-reusable-media.md`

**Starting HEAD:** `3bc143f858ae96a66275462b587bd2bc506cf781`

**Status:** Implementation authorized and in progress. No amendment fidelity row is promoted by this preflight record.

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

- Task 6 dependency/delete, Task 7 picker/import, Task 8 replacement, Task 9 inspector controls and exhaustive width/wrap/RTL/narrow-collapse geometry, and complete Journey C fidelity remain pending.
- No sanitizer, manager/picker action, replacement behavior, dependency graph, generated output, full build, full suite, or parent progress update was introduced.

### Validated T5-R01–R04 correction

- BASE `363a7c6ffa5874bb34bb4ec22a13dbdfd468c88c`; corrected focused RED **0/3**, focused GREEN **3/3**, complete component selection **14/14**, and fresh exact Task 5 selection **94/94** with zero skipped/todo.
- A rejected non-blob resolver lease now transfers ownership before its immediate release, so subsequent effect cleanup cannot release a non-idempotent handle twice. Normal healthy acquire/release, recompile, and unmount remain covered.
- Logical block alignment now places start, center, and end at 0, 140, and 280 px respectively for a 280 px item in the mounted 560 px content column.
- `.free-text-chart-view__content` is the live inline-size container owner. The focused 400 px contract preserves authored `wrap-start` data while the existing narrow query produces `float:none` and `max-inline-size:100%`.
- Document summaries were corrected for Tasks 1–5 current bounded status. Fidelity/security row-level statuses were not promoted or otherwise changed by this correction.
