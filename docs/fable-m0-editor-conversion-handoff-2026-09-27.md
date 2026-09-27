# Fable M0.2: Full Editor chart conversion and remapping

Date: 27 September 2026. This closes the one-title chart-conversion package in section 5 of roadmap v1.24, based on `6227d2c1`. It does not close other M0.2 consumers or the broader M0 gate.

The journey now edits the shipped native V3 line chart `chart-line-a01a017d-96f1-440b-b24a-bcf2e30da1cc` on the Socio-economic page. Its profiled source has a temporal Year field and two numeric percentage fields. Direct `prepareChartData` checks returned ready Bar (14 marks) and Scatter (7 marks) models with no diagnostics or duplicate groups. The retired Biomedical panel and categorical `total_deaths` Scatter-axis assumptions were removed.

The browser test opens Actions after hovering the panel, confirms that converting Line to Bar retains the compatible Year and both measurement bindings, then saves a ready Bar preview. It verifies the same chart and placement identity, source, roles and rendered canvas. A tentative Scatter conversion survives “Continue editing” without storage mutation; Discard restores the saved Bar. The final Scatter remap binds the two numeric fields, shows a ready preview, saves on the same identity, and renders. Because this source has no duplicate marks, the contextual duplicate-policy control is absent and the saved policy remains unset; the separate Scatter creation test covers explicit `last` resolution for duplicate observations.

| Check | Result |
| --- | --- |
| Current source/profile and direct Bar/Scatter preparation | Ready; no diagnostics |
| `node --check tests/e2e/chart-authoring-v3.spec.js` and `git diff --check` | Passed |
| Exact one-title Chromium selection | 1 passed (28.5 seconds) |

Only the E2E test changed; no product behavior, public fixture or shared helper changed. The final deterministic and browser checks cover the affected test boundary, so no separate judgment-heavy review was needed. Broad browser/build integration and release readiness remain open. The branch is `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
