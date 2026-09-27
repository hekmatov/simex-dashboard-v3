# Fable M0.2: Build structure tree journeys

Date: 27 September 2026. This closes the five-title Build structure package in section 5 of roadmap v1.31, based on `d902b73d`. The broader M0 gate remains open.

The saved journeys pointed to retired `public_response` and `socio_risk_perception` owners. The shipped cross-page target is Socio-economic → Public Trust and Support (`socio_economic_section_1788512378053`) → Public Trust in Institutions (`chart-groupedBar-eafbfdd0-e768-4303-8df1-6de4f5515d73`). Direct dashboard preflight confirmed those page, section and chart identities and the chart's profiled source. The five journeys now use that target, check the active canonical page before accepting chart visibility, and retain the intended Unit Orbit and pending-editor assertions.

The rename journey now saves the pending Layout work before asserting durable Page, Section and Chart names under their original IDs in browser storage. The section double-click journey centers its tree row before the synthetic double-click so both pointer events land on that row during cross-page reveal; it still verifies the intended rename input is focused and selected without opening Unit Orbit. A first browser run exposed these two test setup assumptions; the focused rename selection then passed before the final five-title run.

| Check | Result |
| --- | --- |
| Current page/section/chart and profiled source preflight | Valid |
| Final exact five-title Chromium selection | 5 passed (33.4 seconds) |
| `node --check tests/e2e/v3-build-structure-packages.spec.js` and `git diff --check` | Passed |

Only the E2E spec changed. No product behavior defect was established by the corrected journeys, and no shared driver or product code changed; a separate independent review was not needed for the mechanical fixture repair. This selection does not assess double-click hit targeting at the edge of a moving viewport, keyboard roving/collapse, package import/export, anchored commands, the full browser suite, integration or release readiness. Other M0.2 consumers and M0.3–M0.6 remain open. The branch is `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
