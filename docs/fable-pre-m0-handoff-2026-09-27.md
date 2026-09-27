# Fable dashboard: pre-M0 reconciliation handoff

Date: 27 September 2026. Status: **prepared for user review; not sent to the Fable planning chat. M0 implementation has not started.**

Intended recipient after user review: **Fable dashboard planning steward**, chat `01a0d085-14b6-7882-9994-12c2b6652a2b`.

This is a dated handoff, not a competing roadmap. Incorporate the remaining work into the existing [consolidated roadmap](superpowers/plans/2026-09-19-consolidated-development-roadmap.md). Keep the existing dated Markdown/Git versioning approach.

## User direction and boundary

The user wants Fable to proceed independently of scenario-authoring. Scenario-authoring is paused because its direction needs reconsideration. Preserve that work for later; do not resume it, merge it into dashboard main, or require its acceptance before core dashboard work.

This preparation reconciles already completed non-scenario branches and records the handoff. It does not perform M0 fixture repairs, source-resolution changes, code splitting, new UI work, broad verification gates, remote publishing or deployment. No chat messages, new chats, subagents or recurring monitors were used.

## Prepared baseline

The local checkpoint is **`fable-pre-m0-2026-09-27`**, a Git tag on the reconciliation commit containing this report. Local `main` and `chore/fable-preparation` point to that checkpoint after preparation. Resolve its full SHA with:

```powershell
git rev-parse fable-pre-m0-2026-09-27
```

Preparation worktree: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.

| Input | Exact revision | Treatment |
| --- | --- | --- |
| Refreshed private `origin/main` and public `public/main` | `c003d11174f247acac10879274e73d9434c67096` | Matching published baseline; neither remote was pushed. |
| Existing local main | `a15d2566d21e299b9465786cb55bfa09434fb518` | Preserved in full, including the View/Build decision surface, fixes and Fable designs/roadmap. |
| `codex/pdpc-profile` | `58c4650a50ff91ce37304fa6cb88c62da1abdd7e` | Two previously missing commits integrated with ancestry preserved. |
| `feature/pdpc-single-file-release` | `cd5f1f83c675c6280c869daa7a65a8ec5eddeae4` | Seven previously missing commits integrated at their final state, including removal of PDF generation. |

The worktree was created directly from the refreshed published SHA, then fast-forwarded to the existing local main before the two carry-forwards were merged. Both carry-forwards merged without conflicts. The app worktree tool could not locate the nested repository, so Git created the worktree under the repository-managed `.worktrees` directory. The original feature branches remain available.

### Resulting behavior

- `release:pdpc:deliverables` adds paired Cloudflare ZIPs and single-file offline HTML outputs, packaging helpers and tests. The existing PDPC build gains its release-only Light default while retaining explicit saved appearance choices. PDF output remains removed.
- The Eldoria misinformation CSV export and explanatory notes now match the corrected numbers already present in the shipped dashboard. LF enforcement prevents mixed-newline imports. The authored dashboard configuration and its uploaded content were not replaced.
- The roadmap records scenario-authoring as paused and removes the instruction to seek immediate S-M3 acceptance.

## Verification and limits

Run from the preparation worktree on the combined candidate:

```powershell
node --test tests/pdpcSingleFileDeliverables.test.js tests/pdpcDeliverablesWorkflow.test.js tests/pdpcReleaseBuild.test.js tests/pdpcReleaseFactory.test.js
```

**17 tests passed; zero failures, cancellations or skips.** These cover paired release validation/publication and rollback using fixtures, output ownership, contained asset verification, the Light-default transform, single-file embedding, ZIP byte roundtrips and the explicit absence of PDF deliverables.

Additional direct checks passed against the actual current source and data:

- The Light-default plugin transforms `src/theme/dashboardTheme.js` exactly once. Executing that transformed preference reader returns Light for absent, invalid or inaccessible storage and preserves explicit Light/Dark/System choices.
- Papa Parse reads the corrected Eldoria export as seven rows and three columns without errors. Years are 2021–2027; the file is LF-only and matches the shipped uploaded CSV.

No production release was generated, no browser journey was run, and no repository-wide unit/build/E2E gate was run. This is scoped reconciliation evidence, not M0 completion or release readiness. The imported generator contains intentional Markdown hard-break spaces in its README template; whitespace checks must distinguish those from accidental whitespace.

## Work for M0

| Existing work package | Required continuation |
| --- | --- |
| **M0.1: baseline and authored content** | Refresh both remotes at activation. Preserve this checkpoint; neither current remote alone contains the redesign or these carry-forwards. For a new worktree, record the refreshed published base and explicitly integrate this checkpoint before implementation, as preparation did. Alternatively continue in the clean preparation worktree. Keep publishing as a separately authorized action after the relevant verification. |
| **M0.2: current fixtures and consumer repairs** | Diagnose the recorded unit/browser failures at the prepared baseline. Saved September evidence reports 53 unit failures, an initial source-browser result of 112 pass/154 fail, and static/PDPC suites not run. A later bounded repair selection reports 19 pass/11 fail and seven repaired candidate regressions. These are historical results at different revisions, not fresh totals or proof that every failure is harmless fixture drift. Reuse valid evidence and repair only demonstrated boundaries. |
| **M0.3: portable source resolution** | Investigate the shipped uploaded-GeoJSON descriptor versus disk-path assumption in `scripts/build-portable-data.mjs`, including fresh-checkout dev/portable/Cloudflare behavior. No repair or fresh build claim is made here. Include the restored PDPC packaging consumer where a source/asset contract change affects it. |
| **M0.4: code splitting** | Account for `scripts/lib/pdpc-single-file.mjs`: it currently expects release JS/CSS, one html2canvas dynamic import, a particular bundled logo expression, and vendor Three/Vanta files; it rejects remaining module imports. A successful dashboard split alone does not prove this output still works. Preserve the supported release output or adapt and verify the converter in the affected slice. Do not blindly merge the parked rendering experiment. |
| **M0.5: recovery** | Retain the existing root-render/lazy-chunk recovery scope; no work was performed here. |
| **M0.6: CI and verification organization** | Assess the uncommitted `dense-ui-audit` proposal to separate `@visual-audit` journeys from normal source E2E runs. Adopt only as an explicit, visible test organization decision with audit coverage retained; do not exclude failures to obtain a green gate. Then implement the existing CI/version visibility scope. |

At the declared integration/publication boundary, run the repository's required full gates on the final candidate and retain their actual dispositions. Do not repeat broad checks merely to onboard the planner or start a worktree. Do not push this preparation checkpoint as though its historical M0 failures had been resolved.

## Later milestone implications

- **M1:** carry forward the existing cross-style/rendered-fidelity and Audience evidence gaps only where still relevant. Do not reimplement already merged chart, gauge, orbit or decision-surface work.
- **M2:** when dashboard format/Storyline contracts change, record the future scenario integration impact. Do not implement scenario adapters or reactivate its owners solely because that branch will eventually need reconciliation.
- **M3:** select and freeze another explicitly accepted rehearsal package while scenario-authoring is paused. The unaccepted Aster-28 M3 candidate is not the default or a prerequisite. Practitioner/content acceptance remains a later human decision.
- **M4:** validate real paired Cloudflare and offline outputs, including images/fonts, first-launch appearance, and offline launch. Preserve the deliberate removal of PDFs. Scenario S-M6 is a dependency only if supported scenario-authoring is explicitly brought back into release scope.

## Preserved work and branch dispositions

The scan covered 59 local branches, 16 live remote branch heads and 25 registered worktrees before this preparation added one branch/worktree. Forty-two non-main local branches were already ancestors of local main. The two integrations above account for the identified non-scenario carry-forwards. No open PRs were found in either dashboard repository.

| Work | Disposition |
| --- | --- |
| Scenario planning, M1, M2 and M3 | Preserve `docs/aster-28-scenario-specs` at `37469185`, `feat/m1-netherlands-contract` at `17f30d0d`, `feat/m2-repeatable-composition` at `a4423848`, and `feat/m3-communication-candidate` at `91105ec3`. Their completion/acceptance records remain historical; no scenario commits were merged. |
| Premature scenario implementation | Keep `quarantine/astra-premature-slice1a-2026-09-06` at `51cb0359` quarantined. |
| Older non-scenario branches | Static-content design patches already have equivalents on main. Older homepage, voice, QMD-toolbar, source/package harness and view-only branding implementations were largely incorporated or superseded; no wholesale merge is recommended. |
| Old reconciliation/rendering experiments | Retain `codex/pre-step7s-dirty-reconciliation` and `codex/deferred-chart-rendering-experiment` for targeted reference only. Evaluate a specific remaining idea only when relevant to an approved M0 boundary. |
| Marketplace branch | Public `claude/plugins-official-marketplace-l4t5ux` only adds developer tooling configuration; it is not required for Fable. |
| Dirty worktrees | Preserve the density-audit edits/evidence, scenario-generated catalogue changes, local tool files and upload verification helper. Biomedical generated files reported modified in several worktrees have no textual diff. No cleanup or deletion was performed. |
| Old browser export | `temp-cloudflare-version/packaged-dashboard-bundle.json`, exported 9 September, is not a newer baseline. Its pages, nine CSV payloads and four image assets are already represented on main; it predates the PDPC theme change. Do not re-promote it. This does not inspect unexported browser storage. |

## Planner's next action after user review

Incorporate the carryovers above into the existing M0 brief and later milestone dependencies. Keep one combined owner for the first bounded M0 baseline/source/fixture slice. Do not launch work from this handoff until the user reviews it; do not message or activate the paused scenario chats. No message has been sent to the Fable planner.
