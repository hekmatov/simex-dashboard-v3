# Fable M0.2: editor responsiveness and operation feedback

Date: 27 September 2026. This closes the four-title editor-performance package in section 5 of roadmap v1.27, based on `c414956d`. Other M0.2 consumers and the broader M0 gate remain open.

The tests now target the shipped editable native V3 national-cases chart `chart-line-mtgz6v76`, backed by a current eight-row tracked CSV/profile. They open the hover-gated panel Actions menu and Edit chart item instead of the retired inline button and `bio_confirmed_cases` ID. The Quick paint probe holds animation frames only after the real action is ready; Full Edit uses the current chart-edit owner ID and checks a pending shell, no unchanged owner and clean Close. Both probes restore patched animation globals in `finally`.

The Save probe still requires a working “Saving Chart” notice to be delivered before busy/teardown and to be topmost at delivery. Its observer is disconnected in `finally`. The failure probe injects one persistence exception on the current Quick Edit title, then requires a visible failure notice, nonzero geometric overlap with the Unit Orbit, and a notice hit-test above that surface at 790×600. It restores `JSON.stringify` and its probe flag in `finally`.

| Check | Result |
| --- | --- |
| Current V3 chart, source/profile and hover-gated Actions/Edit preflight | Valid |
| `node --check tests/e2e/dashboard-performance.spec.js` and `git diff --check` | Passed |
| Final exact four-title Chromium selection | 4 passed (39.0 seconds) |

Only the E2E spec changed. No editor, feedback, CSS or shared mode behavior changed, so the previously passing canvas-mount title was not rerun and no separate judgment-heavy review was needed. Other M0.2 consumers, M0.3–M0.6, integration and release readiness remain open. The branch is `codex/fable-m0-source-fixture` in `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
