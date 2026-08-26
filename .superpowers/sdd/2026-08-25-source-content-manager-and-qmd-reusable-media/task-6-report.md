# Task 6 Report — Direct Dependencies and Atomic Deletion

## Status

DONE — the direct-use graph, actual-active retainer distinction, mounted manager dependency carrier, blocked-delete presentation, and revision-checked no-cascade deletion transaction are implemented. Task 7 picker/import, Task 8 replacement/relink, and later recovery/preview journeys remain unimplemented.

## RED / GREEN

- Exact Task 6 command: `node --test tests/contentDependencyGraph.test.js tests/contentDeletionTransaction.test.js tests/contentActionDialog.test.js tests/buildDirtyState.test.js tests/presentationProtocol.test.js`.
- The first pre-production invocation reported **11/11 passing** because Node silently ignored the not-yet-created test paths; this was classified as unusable RED evidence.
- After the Task 6 tests existed, the intended RED was **11 passing / 3 file-level failures**: the graph and deletion modules were absent, while the dialog file hit the inherited linked-worktree Vite/esbuild access restriction.
- Focused transient-carrier RED/GREEN was **2/3** then **3/3**.
- Focused durable-source boundary RED/GREEN was **3/4** with `Source entry property "uses" is unknown`, then **4/4** after attaching dependency state only after source-entry validation and cloning.
- Fresh final exact result outside the inherited Vite restriction: **22 passed / 0 failed / 0 skipped / 0 todo**, 3.686 s.

## Implemented contract

- The graph consumes Task 5's annotated QMD AST and extracts only known local QMD media, Static Image `mediaId`, managed panel-primary CSV `sourceId`, and `chart.presentation.map.geoSource` GeoJSON uses.
- Direct uses are deduplicated per panel/content identity. Page › Section › Panel labels are edge context, not extra dependencies.
- Actual active draft/replacement/transaction retainers remain separate records and do not inflate saved-use counts.
- Chrono groups, Scenes, and Scene presentation compositions are CSV downstream impact contexts. They are not dependencies; GeoJSON receives no temporal impacts. Present/Audience payloads and media leases are ignored.
- A blocked plan cannot commit. The manager renders disabled Delete, inline owner-resolution guidance, enabled dependency breadcrumbs, and no dialog. Only a ready plan can open the scoped destructive confirmation.
- Commit rechecks logical identity and revision, removes only the eligible logical record and its unshared authority, and compensates dashboard/authority writes on failure. No panel or dependency is cascaded.
- Manager dependency/action state is a transient, non-enumerable dashboard projection. Durable media/source records are not extended; source state attaches after `SourceEntry` validation/`structuredClone`.
- The existing Build selection path owns dependency navigation. The existing serialized dashboard publication path owns eligible deletion.

## Mounted checkpoint

- Exact planned command, with no literal `--` separator: `pnpm.cmd exec playwright test tests/e2e/source-content-manager.spec.js --project=chromium --grep "desktop composition|tablet composition"`.
- Fresh result: **2 passed / 0 failed**, 24.6 s (desktop 14.7 s, tablet 8.0 s).
- The manager remained mounted through the authorized DashboardRenderer → BuildWorkspace → SourceContentWorkspace projection at 1440×900 and 1024×768, with the canonical canvas, rename persistence, list/detail composition, and tablet Back flow intact.
- Blocked no-dialog markup/navigation, eligible scoped confirmation, transient carrier, stale-plan rejection, cancel equality, and injected-failure compensation are established by the exact deterministic component/transaction selection. The bounded viewport cases do not separately click an eligible delete; no broader browser journey is claimed.

## Row disposition

- **SCM-S05:** Passing for the Task 6 direct graph/actual-active-retainer and mounted manager-carrier slice. Complete Journey A/I creation and replacement-owner combinations remain later work.
- **SCM-S06:** Passing for durable direct-edge versus downstream/transient-context semantics, including the presentation-protocol negative assertion.
- **SCM-S07:** Passing for the bounded deletion engine and mounted blocked/eligible action carrier. Later replacement/relink/recovery journeys are not promoted.
- **SCM-C08:** Delete branch Passing. The complete row remains Partial because replacement/relink focused modals belong to later tasks.
- **SCM-SP05 / SCM-SP06:** Implemented and deterministically verified for this slice.

## Changed owners

- Graph/transaction: `src/content-library/contentDependencyGraph.js`, `src/content-library/contentDeletionTransaction.js`.
- Manager action/wiring: `src/components/source-content/ContentActionDialog.jsx`, `DependencyList.jsx`, authorized `SourceContentWorkspace.jsx::visibleManagerItems/contentItem`, and `DashboardRenderer.jsx`.
- Presentation/CSS/tests: `tests/presentationProtocol.test.js`, `src/styles/source-content.css`, and the three Task 6 test files.
- `buildDirtyState.js` required no change because no Task 6 assertion exposed a missing dirty-state owner.

No parent `progress.md`, Task 7+ owner, durable SourceEntry schema, generated output, dependency, full build, or full suite was changed or run. No blockers remain.
