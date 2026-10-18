# Fable M0.2: temporal Studio journeys

Date: 27 September 2026. This closes the two-title temporal Studio package in section 5 of roadmap v1.29, based on `03aea842`. The broader M0 gate remains open.

The shipped dashboard starts with no Chrono Groups or Scenes, so the historical named group could not be opened. Both journeys now seed two valid groups from the current dashboard before navigation: a Biomedical group with two temporal charts and a separate Socio-economic group. The fixture was preflighted against the dashboard, Chrono Group and Scene schemas and the three member charts' parsed CSV rows. The journeys use the current direct Build commands for Chrono Studio and Scene Studio.

The first journey opens Biomedical content, checks dense action geometry and the four editor stages, renames and saves the same Chrono Group, then creates a Scene. Durable-state assertions retain the group ID, both members, and the unrelated group, and confirm the Scene's Biomedical owning page, parent group and exact two-chart membership. The second journey opens both Studios unfiltered from Home, creates a Scene with the Biomedical defaults, verifies it in storage, then reopens Scene Studio and confirms the saved Scene remains visible under its page filter. Membership comparisons ignore order because member order is not the behavior under test.

| Check | Result |
| --- | --- |
| Current landing, temporal source, dashboard/group/Scene fixture preflight | Valid |
| `node --check tests/e2e/v3-temporal-authoring.spec.js` and `git diff --check` | Passed |
| Final exact two-title Chromium selection | 2 passed (32.4 seconds) |

The first browser run exposed only an order-sensitive Scene membership assertion; the stored Scene had both expected members. The assertion was corrected and the exact selection passed. Only the E2E spec changed; no product defect or product code change was needed. This is a scoped development check, not a full suite, build, integration or release gate. The branch is `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
