# Fable M0.2: Build tree keyboard focus and pointer collapse

Date: 27 September 2026. This closes the two-title tree focus package in section 5 of roadmap v1.32, based on `a74f2d8a`. The broader M0 gate remains open.

The saved tests referred to retired Section and Chart labels. They now use the shipped Socio-economic → Public Trust and Support → Public Trust in Institutions hierarchy, whose IDs and labels were preflighted against the dashboard. The keyboard journey checks that ArrowLeft collapses the Page, ArrowRight expands it, and successive ArrowDown presses traverse the actual first Section and its two charts before focusing Public Trust and Support. F2 opens its inline rename input; the test checks focused selection, no competing roving treeitem, and the 24px non-roving caret. The pointer journey activates the Socio-economic Page, focuses its chart treeitem, and checks focus transfer with exactly one roving item after collapsing the Section and then the Page.

| Check | Result |
| --- | --- |
| Current Page/Section/Chart identity and tree control preflight | Valid |
| Final exact two-title Chromium selection | 2 passed (12.9 seconds) |
| `node --check tests/e2e/v3-build-structure-packages.spec.js` and `git diff --check` | Passed |

Only the E2E spec changed. No product focus defect was demonstrated on the current hierarchy, so no shared behavior repair or independent product review was needed. The keyboard and pointer checks are bounded evidence, not a full Build, browser, integration or release gate. Other M0.2 consumers and M0.3–M0.6 remain open. The branch is `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
