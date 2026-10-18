# Fable M0.2: semantic boundary and portable V6 roundtrip

Date: 27 September 2026. Assignment: canonical consolidated roadmap v1.8, section 5 (planning commit `3cb09c44a407ac57680d1e6c52e49af51d2e41e0`). This disposes the eight assigned historical semantic-boundary failures and one portable V6 roundtrip failure.

## Starting state and contract ruling

- Worktree: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`; branch: `codex/fable-m0-source-fixture`; clean base: `5b1c4ed062ddf0626c03723c52638a003570d891`. The resulting implementation commit is supplied in the direct steward report.
- `src/charting/config/dashboardConfigStructure.js` declares `datasetProfiles` a runtime, non-semantic field. The shipped dashboard embeds nine profiles, while `src/App.jsx` removes profiles in `configurationForSemanticUse` before checking the persisted catalogue. Commit `b80495a5` made the catalogue accept hydrated input, but its canonical-byte path still included profiles. Before correction, the shipped raw dashboard matched the persisted snapshot and the app-style profile-stripped dashboard did not (`22960f91…` versus `6bcece23…` semantic digests). This was a demonstrated companion-compatibility defect, not just a stale test assumption.
- The producer still accepts safe hydrated `datasetProfiles`, but canonical catalogue semantics omit fields declared runtime/non-semantic by the shared structure contract. An existing structural-data guard now runs in strict traversal mode before V6 migration can clone untrusted accessors or cycles, including beneath nested runtime-named keys in profiles. The bundle retains its established default guard behavior. The catalogue rejects those inputs without rejecting repeated, non-cyclic references or mutating input. Unknown semantic-root runtime fields such as `loadedData` and `previewState` remain rejected.
- The persisted `public/integration/quorum-chart-catalogue.json` was regenerated because the proven semantic hash changed. Its **only two changed fields** are `dashboard_semantic_digest` (`6bcece23…`) and the enclosing `digest` (`eb5640ea…`); catalogue v2 types and configured charts did not change. Config version 6, native chart schema 3 and catalogue contract 2 remain distinct.

## Nine historical exact-title dispositions

The [saved unit JUnit](gates/2026-09-19-decision-surface-premerge/unit-branch.junit.xml) carries these September 19 failures. They are historical identities, not a current failure count.

| Exact historical title | Current disposition |
| --- | --- |
| `the strict semantic boundary covers the current showcase structure exactly` | Passed; exact current shipped root/page/section inventory includes embedded profiles and scenes, and the canonical document excludes only runtime profiles. |
| `data source descriptor` | Passed; mutation selects an actual configured CSV source and changes its packaged path, changing semantic bytes and stale-match result. |
| `time synchronization` | Passed; a valid explicit Chrono Group supplies the missing semantic shape; changing its name changes bytes and stale-match result. |
| `chart semantics` | Passed; mutation targets an actual configured temporal line chart. |
| `alias semantics` | Passed; mutation targets the alias record for that same configured chart. |
| `runtime profiles at semantic root` | **Retired expectation, mapped to** `runtime profiles are accepted without changing packaged catalogue identity`: the current hydrated-input contract accepts safe profiles while canonical bytes, snapshots and app-style persisted matching remain identical without them. |
| `duplicate chart ID` | Passed; a distinct wrapper-panel ID lets the duplicate chart ID reach chart-identity validation rather than failing first on panel identity. |
| `duplicate page ID` | Passed; bundle and runtime-loader expectations derive the exact duplicate ID from the mutated current dashboard. |
| `tracked descriptors and profiles round-trip through the portable V6 bundle` | Passed; all nine actual shipped CSV descriptor/profile IDs and values, plus all configured page/section/panel placements, round-trip exactly. Input remains unchanged. |

The other packaged semantic families still assert changed bytes **and** stale-match rejection. Producer negative tests now assert the intended error for unknown fields, wrong types, cycles, accessors, duplicate IDs and broken landing references. Bundle/runtime-loader checks cover unknown page fields, wrong page types, accessors, duplicate page IDs, broken landing references and cycles. A shared FAQ object remains valid across producer/bundle/normalizer boundaries, with the input preserved.

## Verification and limits

- Final complete `node --test tests/dashboardSemanticBoundary.test.js`: **72 passed, 0 failed**.
- Assigned `node --test --test-name-pattern='tracked descriptors and profiles round-trip through the portable V6 bundle' tests/dashboardAppV3.test.js`: **1 passed, 0 failed**.
- Directly affected `node --test tests/quorumCatalogueV2.test.js`: **41 passed, 0 failed**, including exact persisted-artifact equality and tamper checks after regeneration.
- Direct package/runtime consumer selection (`the live loader hydrates inline and uploaded v3 sources with reusable profiles` and `bundle promotion accepts V6 and materializes uploaded CSV descriptors`): **2 passed, 0 failed**.

One scoped independent read-only review found a nested runtime-named-key preflight gap. The strict catalogue traversal and two direct negative cases resolved it; a bounded re-review found no remaining issue. `git diff --check` passed.

No full repository suite, complete build, browser journey, fresh-checkout matrix, PDPC gate or Audience check ran. Earlier source/fixture/profile/browser evidence was unaffected; catalogue evidence was rerun because production semantics and its persisted digest changed. Other saved unit families, browser GeoJSON/playback/temporal/source-manager/layout work and M0.3–M0.6 remain open. No main merge, push or deployment occurred, and scenario work stays paused.
