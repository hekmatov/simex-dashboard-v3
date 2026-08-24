# SDD ledger — plan: docs/superpowers/plans/2026-08-24-static-content-panels.md

## Preflight rulings

- Ruling: use `C:\Users\hekma\Documents\Projects\SimEx\.worktrees\simex-dashboard-v2\static-content-panels-implementation` — it is the registered worktree named by the ownership inventory and matches the requested branch/SHA; the user-supplied path omitted the separator before `.worktrees` — cost if wrong: work would be committed in the matching registered branch worktree rather than an intended but nonexistent sibling directory.
- Ruling: reproduce the SDD workspace/brief/package helpers with Windows-compatible local equivalents when their Bash scripts cannot consume Git's `C:/...` top-level path — the required `sdd-workspace` script was invoked and failed at path creation after resolving `C:/Users/...` as a relative Bash path — cost if wrong: scratch artifact placement differs mechanically, while the plan-scoped paths and review contents remain identical.
- Ruling: treat inherited baseline reconciliation as Task 0 before the six feature slices — accepted production already changed the canonical renderer chain and Quorum contract source, while tests/checker retain obsolete expectations — cost if wrong: one extra atomic test-only commit precedes the feature slices.

## Preflight conflict and interface scan

| Tasks | Producer → consumer / internal agreement | Finding |
|---|---|---|
| Task 1 self | Contract/registry, workflow shell, transaction, and their named tests | Internally consistent; layer gate explicitly keeps composition and PS-08 pending. |
| Task 2 self | QMD parser/safe-DOM editor/renderer/styles/dependencies plus one retained journey | Internally consistent after the user override; live route depends on Task 1 shell and transaction. |
| Task 3 self | Image validation/transforms/editor/renderer plus retained journey | Internally consistent; durable reload portions depend on Task 4 and must remain status-partial until then. |
| Task 4 self | Asset store, v4 migration/bundle/import/export/offline package and tests | Internally consistent; browser portability proof is required before PS-02–PS-05 pass. |
| Task 5 self | Canonical Build/View/fullscreen composition and restoration | Internally consistent; must use saved models from Tasks 1–4 and real routed browser evidence. |
| Task 6 self | Present/Audience protocol, readiness, temporal exclusion and retained journey | Internally consistent; must use the trusted capability/index and durable asset contracts from earlier tasks. |
| 1 → 2 | Static registry/source/draft/wizard/transaction → Free-text authoring and canonical renderer | Compatible; Task 2 extends the interfaces without changing chart stages. |
| 1 → 3 | Static source/capability/draft/transaction → Image authoring and resolver | Compatible; existing `image` identity and revision semantics are fixed. |
| 1 → 4 | Typed source/manifest/transaction → storage, migration, bundle, import/export | Compatible; Task 4 owns durability and schema/bundle v4. |
| 1 → 5 | Routed static shell and canonical render dispatch → Build/View fidelity | Compatible; Task 5 may refine composition but not create alternate renderers. |
| 1 → 6 | Capability/index/resolver/destination contract → Present/Audience and temporal exclusion | Compatible; Free text remains excluded and Image descriptors are identity/revision only. |
| 2 → 3 | Shared wizard/editor/CSS/ChartView boundaries | Compatible; singular static stylesheet ownership and type-specific bodies avoid duplicate shells. |
| 2 → 4 | StaticText source and transaction output → v4 persistence/export/import | Compatible; QMD source is data, never executable package content. |
| 2 → 5 | FreeText canonical renderer → routed Build/View/fullscreen composition | Compatible; overflow remains inside assigned static/fullscreen owners. |
| 2 → 6 | Free-text capability → Present omission and protocol rejection | Compatible; Task 6 must prove both boundaries. |
| 3 → 4 | Image asset/source identity and transform metadata → authored store and bundle payload | Compatible; original bytes remain unchanged and Task 4 supplies durable resolution. |
| 3 → 5 | Image canonical renderer/actions → Build/View/fullscreen composition | Compatible; saved transforms and transient viewer state stay separate. |
| 3 → 6 | Image resolver/renderer → passive Audience resolution | Compatible; Audience gets no controls or temporal context. |
| 4 → 5 | Reloadable saved sources/assets → live canonical surfaces | Compatible; Task 5 verifies composition, not a second persistence path. |
| 4 → 6 | Durable asset identity/revision and migration → separate-window Audience | Compatible; object URLs remain window-local leases. |
| 5 → 6 | Canonical grid/panel dispatch → passive Audience grid dispatch | Compatible; Audience-specific geometry remains in `presentation.css`. |

## Progress

Task 0: complete (commits f2eac4d..b561ad3, review clean)

Task 1: fix round 1/5 (4 addressed, 0 open — App persistence validation; collision-free draft IDs; immutable prepared snapshots; canonical source equality; commits badd63e..7a12719)
Task 1: complete (commits b561ad3..7a12719, review clean; layer gate retains browser composition, asset durability, and PS-08 work for later tasks)

- Ruling: Slice 2 implements and verifies Free-text semantics, routed authoring, canonical Build/View/fullscreen composition, and in-session lifecycle now, but retains reload/import fidelity as pending until Slice 4 replaces the bounded App-session typed-static v3 bridge with dashboard/bundle v4 — the plan orders Slice 2 before the persistence migration while FT-11 includes reload — cost if wrong: FT-11 is promoted later than its original row assignment, but no false durability claim is made.

Task 2: fix round 1/5 (5 addressed, 2 open — unapproved renderer inline-style deviation; `x<y` raw-HTML false positive; commits c5e1910..bf23e5b)
Task 2: minor addressed incidentally: dependency rationale corrected — GHSA-38c4-r59v-3vqw is linkify ReDoS and GHSA-6v5v-wf23-fmfq is smartquotes quadratic DoS; exact `markdown-it@15.0.0` plus disabled linkify/typographer remains the approved conclusion.

- Ruling (user-directed 2026-08-25): abort sanitizer use and allow all kinds of text by default. Interpret this safely as accepting arbitrary source while rendering raw HTML/scripts/iframes/executable/media/unknown constructs inertly, with no execution or resource loading; remove DOMPurify and the sanitizer production boundary, retain resource limits, and construct DOM through safe APIs/trusted bundled renderers — why: the user explicitly superseded the earlier sanitizer/deny-list contract — cost if wrong: unsupported syntax appears as literal text rather than active embedded content.

Task 2: user-directed permissive inert-text design complete and verified — DOMPurify/sanitizer removed; arbitrary source saves as inert visible text/code through direct safe-DOM construction; resource limits and trusted restricted math retained; focused 63/63, production build, and retained 3-viewport journey passed with the single Slice-4 FT-11 reload skip; atomic commit pending this report.
