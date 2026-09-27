# Fable M0.2: catalogue-contract consumer reconciliation

Date: 27 September 2026. Assignment: canonical consolidated roadmap v1.7, section 5 (planning commit `57968ac564d3ad36e326cb6d4b111b2bb31d5e0e`). This closes the 15 assigned historical failures in `tests/quorumCatalogueV2.test.js`.

## Boundary and result

- Worktree: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`; branch: `codex/fable-m0-source-fixture`; clean base: `db090e7ff66daa5e482bf46077f0570b7e75e406`. The resulting implementation commit is supplied in the direct steward report.
- Only the catalogue test file changed. The actual shipped dashboard has 17 configured charts and no Chrono Groups. Its registered-type/configured-chart set equality, actual membership mapping, raw/normalized identity, deterministic snapshot and persisted-artifact equality remain tied to `public/config/dashboard.json`, `public/config/chart-aliases.json` and `public/integration/quorum-chart-catalogue.json`. The old hard-coded 38-chart and named-group showcase expectations were incidental; exact coverage of every current configured ID and schema type replaces them. The persisted artifact matched without regeneration.
- An in-memory representative dashboard cloned from valid shipped inputs adds a collection-capable KPI and two canonical Chrono Groups with three temporal line members. It supplies the missing invariant shapes without changing shipped files. Catalogue contract version **2**, native chart schema version **3** and dashboard config version **6** remain distinct.
- Negative mutations start from a validated representative dashboard. Each now checks an error tied to the intended type, role, property, duplicate, alias, group, member or period validator; a missing old chart ID cannot satisfy the assertion.

## Historical exact-title dispositions

The [saved unit JUnit](gates/2026-09-19-decision-surface-premerge/unit-branch.junit.xml) recorded these 15 failures on the September 19 branch. They are historical identities, not a current failure count.

| Exact title | Current disposition |
| --- | --- |
| `catalogue v2 covers every registered type and configured chart` | Passed; current shipped type IDs, configured chart IDs and Chrono membership are compared exhaustively. |
| `configured chart descriptors use exact roles, groups, and display capabilities` | Passed; representative line, pie and collection-capable KPI retain exact role IDs, group, collection and display assertions. |
| `canonical Chrono Groups preserve a sole membership in catalogue v2` | Passed; canonical group remains authoritative even when legacy chart `timeSync` fields are null. |
| `catalogue v2 rejects multiple Chrono Group memberships actionably` | Passed; a second membership for an already grouped chart reports the actionable v2 error. |
| `dashboard semantic digest includes all packaged semantics and rejects runtime state` | Passed; group matching, member policy/order, collection presentation, role, source and chart presentation affect canonical semantic bytes; runtime state is rejected. |
| `declared sorted terms use JavaScript UTF-16 ordering` | Passed; aliases retain the exact `a`, astral-character, private-use ordering assertion. |
| `unknown chart type` | Passed; a bound line becomes an unknown type and reaches the type validator. |
| `missing required role` | Passed; removal of line measurements reaches required-role validation. |
| `unknown role` | Passed; a new line role reaches role validation. |
| `unknown chart property` | Passed; `legacyBinding` reaches chart-property validation. |
| `duplicate chart id` | Passed; two valid line charts collide at chart-ID validation. |
| `unknown alias property` | Passed; `legacyKeywords` reaches alias-property validation. |
| `unknown chrono-group property` | Passed; `legacyClock` reaches group-property validation. |
| `unknown time-member property` | Passed; `legacyPolicy` reaches member-property validation. |
| `invalid chrono-group period` | Passed; end-before-start reaches period validation. |

The complete task-specific `node --test tests/quorumCatalogueV2.test.js` run completed **41 passed, 0 failed** (15 top-level tests plus 26 subtests). This includes unchanged capability/role/schema contracts, signed snapshot tamper rejection, canonical byte rules, raw/normalized identity and build-script hooks. `git diff --check` passed. This file selection is not a full repository gate.

One scoped independent read-only review found no actionable issue with the shipped/fixture split, membership and collection semantics, or intended-validator mutations. It did not rerun passing tests.

## Remaining work and limits

Other saved unit families and browser GeoJSON, playback, temporal, source-manager and layout cases remain unverified here. No product code, shipped dashboard/alias/catalogue output, build, browser journey, broader suite, fresh-checkout matrix or Audience check changed or ran. Earlier M0 source/profile/browser/PDPC/offline evidence was unaffected and reused. No main merge, push or deployment occurred; scenario work stays paused. M0.3–M0.6 and human acceptance remain open for the planning steward to schedule.
