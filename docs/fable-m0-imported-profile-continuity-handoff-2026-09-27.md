# Fable M0.2: imported source/profile continuity

Date: 27 September 2026. This closes the two-title imported-profile package in section 5 of roadmap v1.25, based on `805a342c`. It does not close other M0.2 consumers or the broader M0 gate.

Both tests now use the shipped native V3 Biomedical line chart `chart-line-mtgz6v76`, its real CSV source `upload-cases-wcph-eldoria-3`, and the current tracked profile. The shared test fixture copies the valid source path, profile columns and SHA-256 fingerprint into an independently named `external_cases` source/profile and tracked content-library entry. The replacement test builds a version 6 package with exactly one source, profile and chart; the additive test retains every shipped source/profile and adds the imported one. Retired `bio_cases`, `bio_confirmed_cases` and `outbreak_dynamics` fixture assumptions are gone.

The replacement package passes the Review dialog and Load package flow. After editing the page title, Finish Build and reload, its chart renders and storage retains the intended chart binding, source path and provenance, profile source ID/path/columns/row count/fingerprint, and tracked entry fingerprint. The additive case checks the same imported identity and values alongside the shipped IDs, and verifies that the current Biomedical chart renders after reload. The page inspector helper now returns the actual Properties pane. Source/profile ID comparisons ignore object-key order; the offscreen chart is scrolled into view before its canvas is asserted.

| Check | Result |
| --- | --- |
| Direct `parseDashboardBundle` and additive `validateDashboardConfig` | Passed with schema/bundle version 6 |
| Imported chart `prepareChartData` on source CSV and profile | Ready, 8 marks, no diagnostics |
| `node --check` for both changed JS files and `git diff --check` | Passed |
| Final exact two-title Chromium selection | 2 passed (23.6 seconds) |

Only the E2E spec and its fixture helper changed; no product or shared semantic contract changed, so no separate judgment-heavy review or broad suite was needed. Wrapped-placement/page-removal cases, other M0.2 work, M0.3–M0.6, integration and release readiness remain open. The branch is `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
