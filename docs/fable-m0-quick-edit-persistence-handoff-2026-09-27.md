# Fable M0.2: Quick Edit persistence failures and layout rebase

Date: 27 September 2026. This closes the two-title package in section 5 of roadmap v1.22. It verifies a current shipped dashboard in the browser; it does not close other chart-editing or broader M0 gates.

The retry/removal journey now targets native V3 chart `chart-line-mtgz6v76` on the Biomedical page. A test-local stored configuration adds two valid Chrono Groups: one contains the target and another real temporal chart; the other contains an unrelated temporal chart. Their three source profiles and group contract were validated directly. The one-shot removal failure hook follows the current chart ID through the V3 placement. Before editing, the test requires the target, source, unrelated chart and both nonempty group memberships to exist. It then checks that failed Save and confirmed Remove each retain identical durable state and one retryable error owner. Retry Save changes only the intended title; Retry Remove deletes the target placement and its membership while preserving the other member, unrelated group and chart.

The layout-rebase journey now moves the first current Socio-economic section through its Build Actions menu and Quick-edits the chart inside that section. A pending page title and dirty layout owner survive chart Save; after Layout Save, storage has one intended chart with its new title, the new page title and the swapped section order.

| Check | Result |
| --- | --- |
| Direct Chrono Group validation with the three real chart profiles and source rows | Valid target and unrelated groups |
| Browser retry/removal journey | Passed individually |
| Browser page/layout rebase journey | Passed individually |
| `node --check tests/e2e/chart-authoring-v3.spec.js` and `git diff --check` | Passed |
| Final exact two-title Chromium selection | 2 passed (44.0 seconds) |

A scoped read-only review found no actionable issue with the failure hooks, nonempty group fixture, atomicity snapshots or layout rebase assertions.

No product, shared helper, public dashboard or generated output changed. Other M0.2 editor cases, M0.3–M0.6, broad integration/build and release readiness remain open. The branch is `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
