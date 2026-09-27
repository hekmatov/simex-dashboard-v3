# Fable M0.2: pending page title and chart Save order

Date: 27 September 2026. This closes the one-title edit-race package in section 5 of roadmap v1.28, based on `c7843d83`. Other M0.2 consumers and the broader M0 gate remain open.

The test now targets the shipped Biomedical page and its native V3 national-cases chart `chart-line-mtgz6v76`, backed by the current tracked CSV source `upload-cases-wcph-eldoria-3`. It opens Quick Edit through the hover-gated panel Actions menu instead of the retired inline button. A nested chart lookup replaces the old flat panel-title search, so only the exact chart on the exact page can satisfy the assertion.

The test records the durable page title, chart count, target identity, source and type before editing. Immediately after filling the page title it checks that storage still holds the baseline, proving the title edit is pending. Quick Save changes the target chart title. Storage must then contain both intended titles, the same chart count, one matching chart, and the unchanged source/type. It rechecks the same state after 800 ms, beyond the 650 ms pending-edit callback window, to catch a late overwrite.

| Check | Result |
| --- | --- |
| Current Biomedical page, V3 chart, tracked source and Build inspector preflight | Valid |
| `node --check tests/e2e/dashboard-edit-race.spec.js` and `git diff --check` | Passed |
| Final exact race-title Chromium selection | 1 passed (17.6 seconds) |

Only the E2E spec changed; no page/chart persistence or shared header behavior changed. The previously passing reset-cancels-header title was not rerun, and no separate judgment-heavy review or broad suite was needed. Other M0.2 consumers, M0.3–M0.6, integration and release readiness remain open. The branch is `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
