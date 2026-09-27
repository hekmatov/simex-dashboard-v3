# Fable M0.2: native V3 chart creation

Date: 27 September 2026. This closes the five-title chart-creation wizard package in section 5 of roadmap v1.20. The work is limited to the creation tests; it does not certify other editor journeys or a broader M0 gate.

The source-first pie and six-stage suspend/commit journeys already passed against the current M0 fixture and remain unchanged. The scatter, heatmap and delta-card tests referenced retired shipped source IDs. They now upload small profiled CSVs with the columns each native V3 type requires. Scatter and heatmap include duplicate role keys so the contextual duplicate-resolution control is genuinely available and used. Delta-card includes two entities and filters to one before showing a previous-observation comparison. The test retains type-specific role, preview and style-section checks, then verifies exactly one saved chart per case with the selected role fields, a retained source/profile, and the applicable duplicate or filter setting.

The first scatter run exposed the absent duplicate control for a unique shipped CSV. The first heatmap run exposed a role-key collision when a column named `Month Label` was inferred as temporal despite containing category labels. The revised `Wave` field profiles as category; direct preparation returns four ready marks and one expected duplicate warning. No product or shared driver code changed.

| Check | Result |
| --- | --- |
| M0 fixture/shipped source and schema eligibility preflight | Current destinations, columns and V3 type compatibility confirmed |
| Direct heatmap preparation preflight | Ready; four marks; one resolved duplicate group |
| `node --check tests/e2e/chart-authoring-v3.spec.js` | Passed |
| Final exact five-title Chromium selection across two specs | 5 passed (56 seconds) |

A scoped read-only review found no actionable issue with the uploaded fixtures, live-role and duplicate conditions, saved-state assertions or unchanged shared driver.

The existing timeline-upload journey and other chart-editing cases were not rerun; the shared workflow driver and their fixture paths did not change. This package leaves remaining M0.2 consumers, M0.3–M0.6, broad browser/build integration and release readiness open. The branch is `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
