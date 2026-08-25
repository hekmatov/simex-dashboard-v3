# Task 3 Report — Draft Publication and Durable Rename Models

## Status

DONE — engine/lifetime scope only. Source Content Manager composition, concrete upload/picker flows, QMD runtime, replacement/deletion UI, recovery UI, and browser fidelity remain later-task work.

Validated finding fix round complete at BASE `0a659743335ac17591b8e49149740522567259a7`.

Final T3-R06 correction complete at BASE `be6416f026a271008385f4d94f26615cd8697113`.

- Narrow RED: **8 pass / 1 fail / 0 skipped / 0 todo**; the exact chart lookalike `{chart:{id:'chart-complete'}}` published without passing `finalizeWizardDraft`. The same table covers shallow static and missing-media lookalikes.
- Focused GREEN across coordinator and both finalizer owners: **34 pass / 0 fail / 0 skipped / 0 todo**.
- Fresh exact Task 3 selection: **91 pass / 0 fail / 0 skipped / 0 todo**, 7.65 s.
- Technical ruling: each existing finalizer owns a module-private `WeakSet` brand and exports only an identity predicate. The coordinator consumes that brand before its required payload clone and retains only a session-local completed-draft ID. This is cycle-safe, cannot be recreated by structural lookalikes, adds no serializable marker, duplicates no chart/static schema, and keeps manager explicit Add unchanged. Cost: finalizer results must be passed directly to `stageDraft` in the same application session; cloning a result before staging intentionally removes proof of finalization.

- Focused RED: **11 pass / 4 fail / 0 skipped / 0 todo**. The exact failures proved active-only staged assets were promoted, unfinished authoring owners could publish, an internal draft ID overwrote a public transaction, and post-commit session cleanup rolled back durable bytes after dashboard publication.
- Focused GREEN: **15 pass / 0 fail / 0 skipped / 0 todo**.
- Fresh exact Task 3 selection: **91 pass / 0 fail / 0 skipped / 0 todo**, 7.97 s.
- The App coordinator now uses the serialized controller's durable `replaceWith` path. Dashboard-asset/localStorage failures reject rather than report a session-only Add; byte compensation leaves no durable record, and a successful manager Add survives a serialized reload check.
- Session-byte disposal after a successful dashboard/byte commit is best-effort and explicit: failures retain a `cleanup-required` transaction and return cleanup details without reverting the committed dashboard or durable bytes.
- Startup reconciliation promotes only saved manifest/media references. Active retainers protect staged bytes from orphan deletion but never promote them.
- Internal `content-draft:*` IDs collision-check before publication and never overwrite/remove public transactions. Unrelated public transactions survive both draft success and failure.
- Renderer transports the exact coordinator prop to both authoring wizards while retaining wrapper callbacks.
- Authoring completion ruling: manager Add is the explicit commit boundary; Image/QMD accept only the exact session object returned by `finalizeStaticContentDraft`, and chart accepts only the exact session object returned by `finalizeWizardDraft`. No serializable completion marker or future manager flow was introduced. Cost if wrong: a future concrete adapter must stage the existing finalizer result directly, rather than a clone or unfinished form state.

- BASE: `47ef652`
- Branch: `codex/static-content-panels-implementation`
- Task commit / HEAD: the commit containing this report, with subject `feat(content): add scoped content draft publication`

## RED / GREEN

- Exact RED command: `node --test tests/mediaItems.test.js tests/sourceEntrySchema.test.js tests/contentDraftTransaction.test.js tests/dashboardAppV3.test.js tests/buildWorkspaceV3.test.js tests/buildDirtyState.test.js tests/staticContentDraft.test.js tests/wizardDraftV3.test.js tests/browserAuthoredAssetStore.test.js tests/authoredAssetCleanup.test.js`
- RED result: **68 pass / 6 fail / 0 skipped / 0 todo**. Intended failures were the missing source-entry and coordinator modules, missing Build retainer projection, cleanup ignoring active retainers, and unfrozen media rename. One inherited environment failure was the existing Vite SSR check being denied access to `vite.config.js` inside the managed filesystem sandbox.
- Exact GREEN result outside that restrictive filesystem sandbox: **85 pass / 0 fail / 0 skipped / 0 todo** in 7.42 s.

## Implemented contract

- `sourceEntrySchema.js` classifies only CSV/GeoJSON descriptors, trusts explicit dashboard provenance rather than filenames/paths, validates exact source-entry metadata, returns frozen rename copies, and lists only builder-manageable entries.
- `contentDraftTransaction.js` owns immutable draft transitions and the exact mounted coordinator API. Snapshots contain sorted unique IDs and frozen contextual records for manager/QMD/Image/chart drafts and active transactions.
- A coordinator commit builds one pure candidate, snapshots prior authored-byte state, stages exact session assets, commits one dashboard candidate, commits bytes, and compensates the dashboard and byte snapshot on failure. Cleanup failures are surfaced rather than swallowed.
- Direct discard, owner departure, validation failure, persistence failure, transaction resolution, and App disposal clear only their active session owners. A synthetic manager Add deliberately persists an unused record; failed/discarded drafts do not.
- App creates one session coordinator, disposes it on unmount, discards authoring owners on Build mode departure, and passes the coordinator plus the three exact wrapper callbacks through Renderer, ModeWorkspace, BuildWorkspace, ChartWizardV3, and StaticContentWizard.
- Build dirty state subscribes to the exact coordinator retainer snapshot. Startup cleanup now consumes only `{dashboard,activeRetainers}` and preserves committed unused media plus actual draft/replacement/transaction assets without an invented undo owner.

## Changed files

- New authorities/tests: `src/content-library/sourceEntrySchema.js`, `src/content-library/contentDraftTransaction.js`, `tests/sourceEntrySchema.test.js`, `tests/contentDraftTransaction.test.js`
- Rename/byte/cleanup owners: `src/content-library/mediaItems.js`, `src/static-content/assets/browserAuthoredAssetStore.js`, `src/static-content/assets/assetReferenceGraph.js`, `src/static-content/assets/reconcileAuthoredAssets.js`
- Mounted transport/dirty owners: `src/App.jsx`, `src/components/DashboardRenderer.jsx`, `src/components/dashboard/DashboardModeWorkspace.jsx`, `src/components/build/BuildWorkspace.jsx`, `src/components/build/buildDirtyState.js`, `src/components/chart-authoring/ChartWizardV3.jsx`, `src/components/static-content/StaticContentWizard.jsx`
- Focused existing tests: `tests/mediaItems.test.js`, `tests/dashboardAppV3.test.js`, `tests/browserAuthoredAssetStore.test.js`, `tests/buildDirtyState.test.js`, `tests/authoredAssetCleanup.test.js`
- Records: this report, implementation evidence, focused fidelity/security rows, and the accepted plan's Task 3/ledger status

## Scope rulings and row disposition

- SCM-S03: Task 1 identity plus Task 3 frozen rename/publication engine implemented; manager default/dedupe composition and fidelity remain pending.
- SCM-S04: classification/validation/listing engine implemented and deterministically verified; manager/picker composition and browser fidelity remain pending.
- SCM-S13: coordinator/lifetime engine and mounted transport implemented; Task 4 Close/Escape and Tasks 7/10/13 concrete upload journeys remain pending.
- No complete amendment row is promoted to Passing. No composition or real-use claim is made.
- Static/chart form models were not modified because the accepted pre-manager tests required wrapper transport only; concrete upload ownership remains explicitly deferred.
- No Task 4+ manager shell, picker, deletion, replacement, QMD runtime, health, package, map-budget, full build, full suite, or browser work was started.
