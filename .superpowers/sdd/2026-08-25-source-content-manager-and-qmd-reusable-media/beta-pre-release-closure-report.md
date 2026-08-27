# Beta pre-release closure report

**Date:** 2026-08-26

**Base:** `b2e1ced7292d52b5502d371e1028622e6b5e9b3f`

**Commit subject:** `fix(content): close beta pre-release regressions`

**Disposition:** Corrections complete and committed as one bounded slice; integrated beta pre-release acceptance remains pending because the full unit and browser gates are red.

## Authorized scope

The dated scope amendment was appended to `progress.md` before production or test edits. The slice stayed within the four established corrections, the accepted build/generated-client refresh, PS-04 re-verification, the exact Task 17 deterministic selection, one bounded gate assertion repair, the later explicitly authorized legacy `chart-authoring-v3.spec.js` fixture reconciliation, and the accepted local beta gates. It did not address the three prior broad-review architecture findings and did not merge, push, deploy, edit main, delete a worktree, or accept Step 7S.

## Corrections and root causes

1. **Ordinary CSV chart entered the GeoJSON commit branch.** Both missing identities compared equal as `undefined === undefined`; the branch then dereferenced a missing active GeoJSON candidate. The new deterministic predicate requires a truthy selected GeoJSON identity and exact active-candidate identity before GeoJSON persistence.
2. **Journey I fixture target was undefined.** The existing accepted Biomedical target is now passed to both `openTargetPage(page, target)` call sites without weakening any Journey I assertion.
3. **Bundle test declared arbitrary bytes as a 2×3 PNG.** It now uses the repository's real 2×3 PNG fixture and derives manifest length, SHA-256, and base64 from those bytes. The corruption case remains a same-length one-byte hash mismatch, and structural signature validation remains active.
4. **Dataset-profile expectations predated recovery-first loading.** The tests now assert retained source identity, stored ready health plus runtime corrupt/replace overlay, error state, no loaded payload reaching charts, and the exact nonserialized `runtimeContentHealth` public shape.

The exact deterministic gate exposed one further in-scope stale Task 4 assertion: passive CSV detail now legitimately renders a disabled `Replace file` action when no coordinator is supplied. The assertion was corrected while retaining the GeoJSON-preview/Delete negatives. Its focused RED was 4/5 and focused GREEN was 5/5.

The first full browser attempt exposed a common stale legacy authoring fixture rather than a production defect. Under the later explicit authorization, only `tests/e2e/chart-authoring-v3.spec.js` was reconciled to the accepted six-stage flow: exact stage/status navigation, Close→suspend/resume, explicit footer discard, managed-source labels and current source identity, capability-backed configuration sections, Review and create before submission, plain date-only temporal CSV fixture values, and the current Biomedical page label. The complete file is GREEN 10/10.

## RED/GREEN and focused evidence

- Ordinary CSV line-chart GeoJSON predicate RED: 0/1, because the helper was absent. Focused GREEN: 1/1.
- Combined focused deterministic selection: `chartAuthoringComponentsV3`, `dashboardBundleV3`, and `datasetProfilesV3` — **148/148 passing**.
- Bounded `contentDetail` gate repair: **4/5 RED → 5/5 GREEN**.
- Final combined four-file verification outside the known Vite sandbox: **153/153 passing**.
- Journey D individual: **1/1 passing**, 43.4 s test / 46.6 s total.
- Journey I individual: **1/1 passing**, 53.8 s test / 55.7 s total.
- Legacy chart-authoring fixture after reconciliation: **10/10 passing**, 1.6 m.
- Retained Step 7S controlling parser result: **36/36 Passing**; not rerun.

## Build and deterministic gate

- Accepted production build/generated-client refresh: **GREEN**, 925 modules, 9.76 s. The build emitted only the known classic-script, mixed dynamic/static import, and chunk-size warnings.
- Governing pre-release build gate: **GREEN**, 925 modules, 9.26 s, with the same known warnings.
- Exact Task 17 73-file deterministic selection ran exactly once outside the Vite/HttpListener sandbox: **673/674 passing, 1 failing**. The sole failure was the stale passive CSV-detail `Replace file` assertion described above. The focused owner file then passed 5/5; the 73-file selection was not rerun.
- PS-04 passed inside that exact selection after the authorized build: copied Windows flash package launch, `http://127.0.0.1:8765`, PNG MIME, traversal 403, offline Audience, and cleanup all succeeded. This clears the historical generated-client PS-04 residual but does not make the integrated gate green.

## Accepted local beta gates

### Build

**PASS** — 925 modules in 9.26 s.

### Full unit suite

**FAIL** — TAP aggregate for the same full Node selection: **1,516 passed / 42 failed / 1,558 total / 0 cancelled / 0 skipped / 0 todo**, 68.17 s.

The failures are outside this bounded correction set. Representative concrete failures include stale presentation-channel emission counts, QMD mounted-test module/runtime failures, Static Image presentable-index expectations, and View/Chrono canonical plot markup expectations. The default reporter also showed the previously known treeitem, chart JSX-loader, sketch, and domain-policy failures. No broad repair was authorized or attempted.

### Full Playwright suite

The controlling restart discovered **186 tests**. The corrected chart-authoring file passed tests 1–10. Tests 11 and 12 in `dashboard-edit-race.spec.js` then failed on the same stale `getByLabel("Program label")` locator, each timing out after about one minute. The run was stopped at the repeated common pattern as directed: **10 passed / 2 failed / 174 not run**.

No duplicate A–K aggregate was run. The retained individual Journey D and I results remain the scoped evidence above; the incomplete full browser gate does not promote the remaining journey rows.

## Fidelity, security, and row disposition

- **Row promotions:** none. Existing task-local row evidence is retained, but the red full unit/browser gates do not support integrated promotion.
- **Specific evidence update:** PS-04 is cleared after the accepted generated-client refresh. This supersedes only the historical cold-client residual, not the overall master decision.
- The real PNG fixture preserves intrinsic signature/MIME/dimension validation; no negative security assertion was weakened.
- Recovery-first expectations continue to require no unusable CSV/GeoJSON payload reaching charts and a nonserialized runtime health overlay.
- The GeoJSON commit predicate now requires explicit selected identity, preventing missing identities from entering persistence authority.
- Master acceptance remains **pending / not submitted**.

## Genuine blockers

1. The full unit gate has 42 failures outside the authorized regression slice.
2. The full Playwright gate has a repeated stale `Program label` fixture failure in `dashboard-edit-race.spec.js`; 174 tests were consequently not run.
3. Because those governing gates are red/incomplete, integrated A–K/browser fidelity and amendment-wide master acceptance cannot be claimed.

## Final state

The four established corrections, bounded deterministic assertion repair, explicitly authorized chart-authoring fixture reconciliation, build refresh, PS-04 clearance, evidence updates, and this report form one coherent commit. The branch remains unmerged and undeployed, and Step 7S acceptance remains unchanged at its retained 36/36 result.

## Superseding focused continuation — 2026-08-27

- The two stale `dashboard-edit-race.spec.js` paths were migrated to the live debounced Page-title owner and pass **2/2** without rerunning the ten already-passing chart-authoring cases.
- The 42-unit-failure phase was resolved by evidence-backed owner clusters: V5 presentation/static fixtures, QMD Vite/React runtime setup, canonical plot identity, tree semantics, one stale Studio-context assertion, terminology-policy scope, and JSX-loader ownership. Every recoverable cluster passed its smallest owning selection. The reporter truncation prevented reconstruction of four exact historical titles; they remain explicitly attributed as presentation/static cleanup cascades rather than invented ledger entries. No full unit aggregate was rerun under the approved focused-rerun policy.
- The remaining browser cases were run with fail-fast discovery and failed/unrun-only continuation. The cumulative exact disposition is **186/186 passing, 0 failing, 0 not run**. Journeys A–K each passed independently at their accepted material viewport/state; no duplicate aggregate was run.
- Two final production regressions found by the retained journeys were corrected: Build accessibility controls now sit outside the exact three-command Content group (`305c1e3`), and chart-wizard suspension now retains staged CSV/GeoJSON authority until explicit discard or terminal cleanup (`2b0821d`). Focused Journey D and I reruns are **1/1** each.
- The final authorized production build is **GREEN**, 925 modules in 9.73 s, with only the accepted bundle warnings. Final current-client PS-04 is **1/1 GREEN**, including copied launch, PNG MIME, traversal 403, offline Audience at 1366×768, process shutdown, and temporary-directory cleanup.
- Scoped final review of the current branch is **APPROVED**. The retained Step 7S controlling result remains **36/36 Passing** and was not redundantly rerun.
- This is a review submission, not master acceptance. No merge, push, deployment, main-branch edit, worktree deletion, or automatic Step 7S acceptance occurred.

## Master review correction — 2026-08-27

- Master review rejected submission `d825e504034e64c3b4083a63ad0e56f4fd474833`. The affected-boundary review range is `d825e504034e64c3b4083a63ad0e56f4fd474833..HEAD`; this file is the final review record for that range.
- Focused RED was **2/4** in `tests/structureCommandModel.test.js`: removing a valid landing without a hero/primary action threw, and deleting the final Chrono member removed the group identity. The correction preserves an absent action and retains an empty group.
- Merge-specific RED then proved that generic fallback could choose an unrelated surviving Page. Merge now remaps every source-Page landing route and hero action to the selected target, deduplicates target routes while preserving unrelated valid routes, and leaves generic deletion fallback unchanged.
- Final exact verification is **4/4 passing** for `node --test tests/structureCommandModel.test.js`. The pure draft owner establishes the changed boundary completely, so no browser, build, broad unit, or pre-release rerun was added.
- Fidelity reconciliation is truthful at **35/36 Passing**: SCM-S06, SCM-S13, and SCM-C04 are fully Passing; SCM-C08 remains Partial because no independent mounted linked-CSV Relink checkpoint was retained. The prior amendment-wide completion claim is retracted.
- The historical reporter still lacks four exact unit titles. They remain disclosed and unreconstructed; no ledger was invented.
