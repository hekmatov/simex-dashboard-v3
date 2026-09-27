# Fable M0.2: theme validation and saved choices

Date: 27 September 2026. Assignment: canonical consolidated roadmap v1.9, section 5 (planning commit `db0512563088f2d710a173536698c9e9501b3bbd`). This closes four assigned historical unit cases.

## Starting state and boundary

- Worktree: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`; branch: `codex/fable-m0-source-fixture`; clean base: `f109662ba22d3876e620ceb5392fb03863f62871`. The resulting implementation commit is supplied in the direct steward report.
- The shipped dashboard embeds nine runtime `datasetProfiles`. These two test files now remove only that runtime field before calling the default strict `validateDashboardStructure`; the tests explicitly confirm the default still rejects a hydrated root. No shared helper or product validator changed.
- The shipped dashboard explicitly saves `pdpc` / `pdpc/brand` with `standard` chart colours. Generic missing or obsolete look values still resolve to Ledger with Steel. PDPC authorship and E9's release-only Light default/saved appearance choices were left intact; no shipped content or generic appearance behavior changed.

## Historical exact-title dispositions

The [saved unit JUnit](gates/2026-09-19-decision-surface-premerge/unit-branch.junit.xml) records these September 19 failures. They are historical identities, not a current failure total.

| Exact title | Current disposition |
| --- | --- |
| `dashboard configuration accepts only approved saved look values` | Passed with a valid semantic dashboard; approved style/profile/mode pass, invalid values reach their respective look validators, and hydrated root profiles still fail default strict validation. |
| `dashboard, page, and section descriptions may be intentionally blank` | Passed with the same valid semantic input and empty strings at all three levels. |
| `new, missing, and obsolete theme state resolves to Ledger with Steel without replacing explicit choices` | Passed; the shipped authored PDPC choice survives normalization, missing resolver input and both retired profiles resolve to Ledger/Steel, and an explicit valid Humanist choice survives resolver and normalization. Substantive title, pages, sources, library and assets are preserved. |
| `PDPC palette and appearance survive dashboard and presentation boundaries` | Passed; shipped PDPC authorship is checked, explicit PDPC profile palette survives dashboard normalization, and light/dark appearance and style variables survive presentation snapshot roundtrips. |

The final exact-title selections completed **3/3** in `tests/dashboardTheme.test.js` and **1/1** in `tests/pdpcTheme.test.js`, with no failures. One scoped independent read-only review found no actionable issue; `git diff --check` passed. These four titles are the task-specific selection, not a whole-file or repository gate.

No production, shipped configuration, generated output, build, browser journey, visual audit, PDPC release gate or Audience check changed or ran. Earlier semantic/catalogue/profile/browser evidence was unaffected and reused. Default-dashboard and other unit families, browser GeoJSON/playback/temporal work and M0.3–M0.6 remain open. No main merge, push or deployment occurred; scenario work stays paused.
