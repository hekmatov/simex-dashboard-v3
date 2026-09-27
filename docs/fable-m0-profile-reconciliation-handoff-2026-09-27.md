# Fable M0.2: saved-failure reconciliation and dataset-profile consumers

Date: 27 September 2026. Assignment: canonical consolidated roadmap v1.6, section 5 (planning commit `8513d9ffa91a16e2a2d2f9680acfdafb7590e7fa`). This closes the five assigned historical unit titles and gives the planning steward a compact disposition of the saved failure inventory.

## Starting state and change

- Worktree: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`; branch: `codex/fable-m0-source-fixture`; clean base: `133c8d4f5feda06e4ee11ba966eb0a251f66285c`. The resulting implementation commit is supplied in the direct steward report. Main was not merged or edited.
- The old `bio_*` dataset descriptors are absent from the shipped dashboard. The five tests now use explicit historical-shape CSV fixtures where their contract concerns those shapes, while the generated-profile equality test reads current shipped descriptors and CSV bytes.
- No product code, generated profile, shipped configuration, or other test file changed. The five exact test titles remain stable.

## Five assigned title dispositions

| Exact historical title | Reconciled authority and preserved assertion |
| --- | --- |
| `mortality dates retain the complete profileDataset temporal authority` | A day-first mortality CSV plus explicit `DD/MM/YYYY` descriptor metadata runs through `generateDatasetProfiles`; generated columns equal the runtime `profileDataset` authority, including full temporal values, empty diagnostics, parsing metadata, and absence of flattened legacy fields. |
| `profiles preserve representative numeric, temporal, and category facts` | Explicit national, mortality, behaviour and testing rows retain the numeric examples, date examples and metadata, category examples, temporal absence for testing, and provenance shape; current shipped Eldoria cases also retain numeric and temporal column types. |
| `generated columns exactly equal the runtime parser and profileDataset authority` | Three current shipped CSV descriptors are read through the runtime parser; their generated row counts, columns and fingerprints exactly equal `profileDataset` output, with matching source paths. |
| `tracked profiles make chart binding and national time synchronization ready` | The explicit 177-day national case fixture still checks chart-binding readiness, 177 renderable marks and the 177-point playback clock from 20 February through 15 August 2027. |
| `municipal repeated rows produce one playback clock point per distinct date` | The explicit municipal fixture has 354 rows on its first date and 415 distinct dates; the original binding and one-clock-point-per-date assertions remain, from 27 February 2020 through 17 April 2021. |

The final exact-title Node selection (`node --test --test-concurrency=1 --test-name-pattern='mortality dates retain|profiles preserve representative|generated columns exactly|tracked profiles make|municipal repeated rows' tests/datasetProfilesV3.test.js`) completed **5 passed, 0 failed**. The first attempt exposed a fixture-only CSV delimiter detection error; adding a second column resolved it, and the same five-case selection passed. This is the complete task-specific selection, not a full-file or repository gate.

One scoped independent read-only review found and resolved a generator-coverage gap in the mortality test. The corrected generator boundary was re-reviewed with no remaining finding. `git diff --check` passed.

## Saved inventory and later evidence

- The [historical unit JUnit report](gates/2026-09-19-decision-surface-premerge/unit-branch.junit.xml) recorded **53 failures across 14 files** on the September 19 branch. Six were in `datasetProfilesV3.test.js`: these five old-descriptor failures and the portable-data case. The latter already passed in the [M0 source/fixture closeout](fable-m0-source-fixture-handoff-2026-09-27.md), so it was not rerun here. The 53 is a saved count, not a current failure total.
- The [historical browser ledger](gates/2026-09-19-decision-surface-premerge/e2e-ledger.json), generated on 19 September 2026 at revision `835f6caee4387902b9a0ae13ba965e1ef57f3076`, recorded source-browser **112 pass / 154 fail / 0 not-run** across 266 completed cases; the configured static and PDPC groups collected **3 and 2 not-run** respectively. Its `fixture-drift` labels are triage heuristics, not proven causes.
- The [candidate regression repair ledger](gates/2026-09-19-decision-surface-premerge/regression-fixes-ledger.md) subsequently resolved seven candidate regressions. Its 30 source-browser cases ended 19 pass / 11 fail / 0 not-run; “failed at base” does not establish identical failure cause. These figures belong to that scoped selection, not the entire saved browser ledger.
- Later accepted M0 closeouts are [source/fixture](fable-m0-source-fixture-handoff-2026-09-27.md), [dashboard fixture](fable-m0-dashboard-fixture-handoff-2026-09-27.md), [chart driver](fable-m0-chart-driver-handoff-2026-09-27.md), and [CSV authoring](fable-m0-csv-authoring-handoff-2026-09-27.md). Their scoped passes do not turn other saved failures into current passes.

## Remaining decision boundary

The saved unit inventory still points first to retired `bio_*` consumers across catalogue, default dashboard and semantic-boundary tests, then to schema/style expectation drift in the other unit files. The browser inventory still needs title-level reconciliation for source-manager selection, headings, sticky-crown/fullscreen interactions, Chrono/Edit controls and remaining authoring/GeoJSON/playback/temporal-replacement paths. Static and PDPC saved not-runs are unverified. The two ledgers above remain the native evidence; this note does not replace or recalculate them.

No broad suite, build, new browser journey, fresh-checkout matrix or Audience check was run for this slice. Earlier source, fixture, browser, PDPC and offline evidence was unaffected and reused. No new blocker or product decision emerged. M0.3–M0.6 and human acceptance remain with the planning steward; scenario work stays paused. No push, deployment or main merge was performed.
