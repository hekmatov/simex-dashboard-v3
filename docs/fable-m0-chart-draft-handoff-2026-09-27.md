# Fable M0.2: chart-creation eyedropper and suspended draft

Date: 27 September 2026. This closes the two-title transient-state package in section 5 of roadmap v1.23. It does not close other chart authoring or broader M0 gates.

The shipped dashboard's retired Biomedical mortality source was replaced in the eyedropper journey with its current profiled workforce CSV. Both shipped and M0 fixture copies expose `Sector` as a category, `Share of workforce (%)` as numeric, and a compatible native V3 pie type. The wizard reaches a ready preview with those roles. Activating the background picker still makes the backdrop transparent and non-interactive; Escape leaves the same draft ID, pending-owner ID and entered title visible.

The M0 fixture journey now checks its intended `m0-dashboard` destination and source profile. A valid pie draft retains one pending owner ID through ready preview, suspension and resume. Its draft ID and title survive resume. The stored panel count stays at baseline and a dashboard-wide lookup finds no chart with that draft ID before or after suspension; Discard removes the owner and leaves storage and the current page unchanged.

| Check | Result |
| --- | --- |
| Direct shipped/M0 profile and pie eligibility preflight | Both compatible with current category/numeric fields |
| `node --check tests/e2e/chart-authoring-v3.spec.js` and `git diff --check` | Passed |
| Final exact two-title Chromium selection | 2 passed (21.4 seconds) |

Only the spec changed; no product, fixture, shared driver or generated output changed. The correction is mechanical and final browser checks cover the affected boundary, so no separate judgment-heavy review was needed. Other M0.2 consumers, M0.3–M0.6, broad integration/build and release readiness remain open. The branch is `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
