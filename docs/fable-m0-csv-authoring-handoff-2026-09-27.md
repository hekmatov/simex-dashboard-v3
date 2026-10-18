# Fable M0.2: CSV authoring and draft consumers

Date: 27 September 2026. Assignment: canonical consolidated roadmap v1.5, section 5, “Current assignment — M0.2 CSV authoring and draft consumer repair” (planning commit `5ed251399e88dcce787ca026229ebfb0c7865671`). This closes only the three assigned browser titles.

## Starting state and result

- Worktree: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`; branch: `codex/fable-m0-source-fixture`; clean base: `aeba684813251c89fea7577200bd39669c97d106`. The resulting implementation commit is supplied in the direct steward report. Main was not merged or edited for this slice.
- Only the two assigned pie-authoring cases opt into the existing `fable-m0` fixture. Its eligible `m0-dashboard`/`m0-data` destination and `eldoria work sectors` CSV replace the absent historical “Biomedical mortality by age” source. `Sector` (category) and `Share of workforce (%)` (numeric) preserve the pie schema and progressive mapping assertion. All other specs keep their setup.
- The creation case retains stage status, card geometry, preliminary incomplete-style behavior, suspend/resume, discard cancel/confirm, preview, color edit and durable creation. Its stored assertion now checks the canonical placement wrapper, source ID, category/value mappings and series color. The pending-owner case retains identity/activity and title restoration, and explicitly confirms an uncommitted chart never reaches the canvas before or after discard.
- Journey D already creates its own valid CSV data and uses an editable Biomedical destination, so it needed no test or product edit. Its upload cancel, manager add, duplicate warning, staged chart discard, upload/suspend/resume/create, source inventory, dependency/preview/download, reload and narrow-layout catalogue assertions all passed.

## Evidence and exact title dispositions

Deterministic preflight used the current fixture/shipped configurations and existing `resolveDestination`, source-entry labels, chart schemas, `parseCsvText` and `profileDataset`. The fixture CSV exposes the required category/numeric columns; the shipped Biomedical sections are valid destinations; Journey D's uploaded files profile as `capacity` numeric and `date` temporal with `cases` numeric. The existing shared fresh/resume driver was previously verified at `aeba6848`. No new helper, fixture or production contract was changed.

On 27 September 2026, one focused Chromium selection ran these exact titles together through `pnpm.cmd test:e2e:dev tests/e2e/chart-authoring-v3.spec.js tests/e2e/source-content-csv.spec.js --project=chromium --grep 'source-first existing CSV pie authoring progressively reveals schema fields and persists the created chart|suspended valid chart creation keeps one stable owner while incomplete creation stays absent|Journey D — CSV upload through six stages then catalogue management'`:

| Exact title | Result |
| --- | --- |
| `source-first existing CSV pie authoring progressively reveals schema fields and persists the created chart` | **Passed**, 22.5s. |
| `suspended valid chart creation keeps one stable owner while incomplete creation stays absent` | **Passed**, 7.9s. |
| `Journey D — CSV upload through six stages then catalogue management` | **Passed**, 36.6s. |

The selection completed **3 passed in 1.2 minutes**. `git diff --check` passed. No retry, broad browser/unit/build suite, fresh-checkout/platform matrix or Audience check was run. Earlier source, fixture, driver, PDPC and offline evidence was unaffected and reused. No production defect was found.

One scoped independent read-only review found no actionable issues. It checked the source/column mapping, preserved assertions, stronger saved-chart fields and two-case fixture isolation without rerunning passing tests.

## Remaining work

Other authoring, GeoJSON, playback, temporal replacement and historical unit/browser failure inventory remains open in M0.2, followed by M0.3–M0.6. The implementation remains unmerged; push, deployment and human acceptance are separate. Scenario work stays paused. No new blocker or product decision emerged. The planning steward owns roadmap reconciliation and the next eligible assignment; this owner stops at this slice.
