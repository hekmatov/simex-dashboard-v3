# Fable M0.2: wrapped placement and page-membership cleanup

Date: 27 September 2026. This closes the two-title layout review package in section 5 of roadmap v1.26, based on `6f8d2212`. Other M0.2 consumers and the broader M0 gate remain open.

The wrapped-panel journey now wraps the shipped native V3 national-cases chart `chart-line-mtgz6v76` in a distinct `wrapped-national-cases-placement` ID. Direct schema and data preparation checks passed against its current tracked CSV/profile: eight ready marks and no diagnostics. In Chromium the wrapped chart renders, opens Quick Edit through its hover-gated Actions menu, saves an updated title while retaining both IDs and the source binding, then is removed by confirmation. Full snapshots verify that unrelated placements, pages and groups are unchanged.

The page-removal journey seeds two valid, nonempty Chrono Groups using current temporal charts and loaded source rows. The Biomedical group contains both current Biomedical line charts; the independent Socio-economic group contains its current line chart. Direct dashboard and Chrono Group validation passed. Before removal the test asserts all members and retained content. The Build Actions consequence names the affected group; confirmed removal and Save Layout delete the Biomedical page and its now-empty group while preserving the Scenario and Socio-economic pages, all their chart placements and the independent group. Reload has no configuration error and the retained Socio-economic chart renders.

| Check | Result |
| --- | --- |
| Direct wrapped/group dashboard validation and Chrono Group clock construction | Passed |
| `node --check` for both changed JS files and `git diff --check` | Passed |
| Final exact two-title Chromium selection | 2 passed (32.9 seconds) |

Only the E2E spec and its fixture helper changed. There was no product placement, deletion or shared-contract change, so no separate judgment-heavy review or broad suite was needed. Other M0.2 consumers, M0.3–M0.6, integration and release readiness remain open. The branch is `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
