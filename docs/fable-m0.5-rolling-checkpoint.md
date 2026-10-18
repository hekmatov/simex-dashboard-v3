# Fable M0.5 application recovery checkpoint

Status: implemented and checked on the M0.4 worktree tip. This is the rolling local M0.5 record for steward reconciliation.

The main and PDPC entries now contain application-level render failures. Workspace failures show a retry or reload path; failed application chunks show reload guidance. Data recovery distinguishes shipped source failure from saved configuration failure. Loading the shipped source during recovery no longer overwrites a damaged saved configuration; package replacement still requires review and confirmation. Browser storage denial leaves the dashboard usable and displays a session-only/export warning.

Audience failures remain passive. Its existing render boundary retains the last committed output after a child render exception; a failed lazy display import or root-level exception shows a waiting state with no interactive controls and a waiting connection status.

The representative smoke uses the shipped three-Page dashboard with valid presentation groups. It preflights Page IDs, sections, source config response, and group chart membership, then visits every Page in View and Build and reaches Present with an enabled eligible item.

Focused verification on the final candidate:

- `node --test tests/applicationRecovery.test.js tests/browserStorage.test.js`: 7 passed.
- `node node_modules/@playwright/test/cli.js test tests/e2e/application-recovery.spec.js tests/e2e/fable-m0-all-pages.spec.js --project=chromium`: 8 passed.
- Existing `Audience renderer failure retains` selection from `tests/e2e/v3-step8-fidelity.spec.js`: 1 passed.
- `git diff --check`: no whitespace errors. The worktree emits line-ending conversion notices on Windows.

Scoped review resolved one concrete edge: the Audience lazy-import fallback had inherited a technical retry button. It now renders passive waiting state. No broad repository suite, aggregate browser run, release build, or release publication was performed; those remain integration/release boundaries under the Fable delegation.
