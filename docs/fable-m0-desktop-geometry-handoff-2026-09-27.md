# Fable M0.2: four desktop geometry consumers

Date: 27 September 2026. This closes the four-title desktop geometry package in section 5 of roadmap v1.30, based on `eb03e309`. The full density audit and broader M0 gate remain open.

The chart manifest still selected a retired Biomedical mortality source. The shipped, profiled `eldoria loneliness` source supplies the current `Age group` category and numeric `Percent reporting frequent loneliness` column. Its accessible option label was verified in the active managed-source listbox. Chart type, map, and configure setups now use that source; both chart geometry consumers reach their intended controls.

The shipped dashboard has no Chrono Groups or Scenes. The Scene unit-orbit setup and Chrono overlay journey now install the existing two-group fixture before opening the dashboard. The fixture's member charts and temporal sources were validated in the preceding temporal Studio package. This enables a real Scene chart selection and visible Chrono date instead of measuring an empty or hidden surface.

| Check | Result |
| --- | --- |
| Final exact four-title Chromium selection | 4 passed (30.9 seconds) |
| Chart control setup and preset grid | 32px single-line controls and cells; grouping multirow; 24px opener |
| Scene move controls and Chrono date | Two nonwrapping 32px rows; visible 200×56 overlay with 8px header gap |
| `node --test tests/dashboardSurfaceManifest.test.js` | 19 passed |
| `node --check` for changed JavaScript and `git diff --check` | Passed |

The first four-title run had two chart setup failures from the wrong accessible source label; Scene and Chrono geometry already passed. The source label was isolated from the browser's listbox, corrected, and each chart check passed before the final four-title run. Only E2E setup and fixture support changed. No product CSS/layout defect was demonstrated, so no product change or separate design review was needed. The generated density audit, broad suite, build, integration and release gates were not run. Other M0.2 consumers and M0.3–M0.6 remain open. The branch is `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
