# Fable M0.2: Quick and Full chart editor continuity

Date: 27 September 2026. This closes the three-title editor package in section 5 of roadmap v1.21. It does not close other chart-editing consumers or a broader M0 gate.

The three tests now use the shipped Biomedical page's editable native V3 line chart `chart-line-mtgz6v76`, backed by the current profiled Eldoria cases CSV. Its panel action becomes interactive when the panel is hovered, so the Full-entry tests hover before opening the existing Actions menu. The live-preview test selects the current Background color control's Custom mode before filling its color field. A chart-ID-specific storage lookup replaces the retired `bio_confirmed_cases` title check in the Full save journey. No product, fixture or shared helper code changed.

The tests retain their substantive checks: six Full stages keep stable control/render widths; a Quick title continues into Full, Full-only edits restore focus and scroll across suspension, and Save removes the owner while preserving chart count and updating that chart's stored title. The Quick journey checks clean click-away, immediate title/color preview without storage mutation, one dirty owner, suspended click-away and restored draft state.

| Check | Result |
| --- | --- |
| Current shipped chart, source/profile and Build action preflight | Valid native V3 line chart; menu opens after panel hover |
| `node --check tests/e2e/chart-authoring-v3.spec.js` and `git diff --check` | Passed |
| Final exact three-title Chromium selection | 3 passed (31.9 seconds) |

The initial menu timeout was the hidden-until-hover action control; the initial color timeout was the conditional Custom field. Both were resolved in test setup without changing product behavior. The change is mechanical and the final browser selection covers the affected boundary, so no separate judgment-heavy review was needed. Shared editor behavior did not change; unrelated editor callers were not rerun. Remaining M0.2 consumers, M0.3–M0.6, broad browser/build integration and release readiness remain open. The branch is `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
