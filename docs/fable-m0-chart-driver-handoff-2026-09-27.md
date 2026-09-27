# Fable M0.2: chart-authoring driver and representative consumer

Date: 27 September 2026. Assignment: canonical consolidated roadmap v1.4, section 5, “Current assignment — M0.2 chart-authoring driver and representative consumer repair” (planning commit `2622f6ab77c40e8d764caf5df013a42cce77e159`). This closes this bounded slice, not M0.2 or M0.

## Code and result

- Worktree: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`; branch: `codex/fable-m0-source-fixture`; starting code: clean `1758963da9b7754d753b2b32c69fd230b9fa2d9b`. The resulting implementation commit is supplied in the direct steward report. No main merge, production code, public content, package schema or scenario work was needed.
- `tests/e2e/support/chart-authoring-workflow.js` now locates stages by the wizard's existing `chart-stage-*` IDs and confirms `data-chart-wizard-stage`. It retains semantic stage methods for old callers and accepts canonical stage IDs directly. It adds explicit fresh and suspended creation entry points plus stable footer Next, Previous, suspend and create actions. Creating from Review first visits Configure, where Chart title actually lives.
- The six-stage creation journey now uses the `fable-m0` dashboard fixture's valid `m0-dashboard`/`m0-data` destination, `cases WCPH eldoria` CSV, `Date` and `national_total_cases`. It checks draft identity across suspension, mapping and render/placement proof, one committed chart, its source and visibility after reload, then a distinct new draft. The interface journey explicitly owns visible stage labels, order and statuses while retaining its field, contrast and stage geometry assertions.
- Four proven manual Resume consumers use the shared resume entry point: `chart-authoring-v3`, `source-content-csv`, `source-content-geojson` and `time-collection`. Other semantic callers still use the preserved fresh entry and stage methods.

## Evidence and exact touched titles

Deterministic preflight checked `resolveDestination({pageId:'m0-dashboard',sectionId:'m0-data'})` is valid/editable; the selected CSV descriptor and profile expose numeric `national_total_cases` and temporal `Date`; the line schema exposes measurement and observation roles; current source-entry labeling resolves to `cases WCPH eldoria`. The seven changed JavaScript files passed `node --check`, and `git diff --check` passed. Chromium ran with the repository-required Vite filesystem access.

| Exact test title | Final disposition, 27 September 2026 |
| --- | --- |
| `six-stage chart creation suspends and commits exactly once` | **Passed** in 6.0s after the final driver correction. Initial run reached Review, then timed out because the old `createChart` helper sought the title field on Review; corrected to visit Configure. A prior post-correction run also passed in 6.9s before the final footer-action refinement. |
| `source-first Step 7 Build controls and fields use the shared dense desktop contract` | **Passed** in 2.4s. The first combined post-correction run stopped on its retired Structure-rail Page title locator; the current field lives in Properties. The corrected locator and original geometry/contrast assertions passed. |
| `chart creation gives every stage the Configure-sized render proof while keeping proofs reachable` | **Passed** in 4.3s, exercising an existing caller of the preserved fresh/stage helper API. |
| `source-first existing CSV pie authoring progressively reveals schema fields and persists the created chart`; `suspended valid chart creation keeps one stable owner while incomplete creation stays absent`; `Journey D — CSV upload through six stages then catalogue management`; `Journey I — GeoJSON upload select preview dependency and blocked delete`; `playback entry preserves editor and wizard authoring until each workflow is resolved` | **Not run** in this bounded selection. Their direct Resume calls were updated and syntax checked, but their wider legacy source/authoring contracts were not certified here. The shipped dashboard currently has no manageable CSV labeled `Biomedical mortality by age` or `Biomedical cases`, used by the chart-authoring and playback cases. Preserve these titles for the wider M0.2 failure inventory rather than recording them as passing. |

The first two-case browser invocation stopped after the chart helper timeout, so the interface case was not run there. After the helper correction, creation passed and the interface case exposed the separate field-location mismatch. The final focused runs were the corrected interface case alone, then creation plus the smallest other shared-stage consumer. No full unit/browser/build suite, current-count reconstruction, fresh-checkout matrix or Audience check was run. The prior fixture, source, PDPC and offline evidence remains unaffected and was not rerun.

One scoped independent review found a `const` wizard locator reassignment in the migrated GeoJSON consumer. That redundant reassignment was removed; the reviewer rechecked the affected resume consumers and found no remaining issue. This correction changes only test locator handling and did not invalidate the passing representative browser journeys.

## Remaining boundary

Broader M0.2 historical title/failure inventory and other stale consumers remain open, followed by M0.3–M0.6. No new product decision or blocker emerged from this slice. Main integration, push, deployment and human acceptance remain separate. The planning steward owns roadmap reconciliation and the next eligible assignment; this owner stops here.
