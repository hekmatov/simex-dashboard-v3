# Environment Issue Register

This is the project-wide register of reproducible local-environment blockers. It records each occurrence, including repeated occurrences of a known problem, so the recurrence pattern is visible.

Do not record product-test failures, expected build warnings, transient typing mistakes, or an unverified suspicion.

## Problem index

| Problem ID | Type of problem | Status | Entries | Entry references |
|---|---|---|---:|---|
| ENV-001 | Codex restricted sandbox denies Vite/esbuild filesystem traversal | Active in restricted Codex execution | 7 | ENV-001.001, ENV-001.002, ENV-001.003, ENV-001.004, ENV-001.005, ENV-001.006, ENV-001.007 |
| ENV-002 | Playwright Chromium is absent from the local browser cache | Recurrent after cache removal or Playwright upgrade | 1 | ENV-002.001 |
| ENV-003 | Git reports a linked checkout is not a worktree during restricted reads | Observed in restricted Codex execution | 1 | ENV-003.001 |
| ENV-004 | Windows Chromium cannot read a file upload at a long native evidence path | Avoided with the same bytes supplied as a browser File | 1 | ENV-004.001 |

The **Entries** value must equal the number of listed entry references. Add a new reference for every confirmed repeat; do not merely increase the count.

## Entry rules

1. Before calling a test environment-blocked, check the problem index.
2. For a repeat, append a new entry under its existing problem ID and update both the count and references in the index.
3. For a new reproducible cause, assign the next `ENV-###` ID, add its index row, and create the first `.001` entry.
4. Every entry must include the date, exact command or test, concise error or preflight evidence, scope, and the outcome or workaround.
5. Include the register update in the task's coherent commit when it is changed. Resolve ordinary merge conflicts by preserving every distinct entry and recalculating the affected index row.

## Entries

### ENV-004.001 — 2026-10-18

- **Test:** `tests/e2e/static-content-portability.spec.js` — `asset commit failure restores the prior dashboard and authored store atomically`, source-parallel configuration, one worker, output under `.worktrees/fable-m0-integration-evidence/m0-final-integration-20261017/hosted-ci-20261018/repair/additional-windows-artifacts`.
- **Evidence:** The generated 19,535-byte JSON file existed at a 282-character absolute path, but Chromium's File read rejected it with `NotFoundError: A requested file or directory could not be found at the time an operation was processed.` A controlled same-browser probe read identical bytes successfully from a 148-character native path and from a File payload; both SHA-256 values were `97230243b4e46d83e7434a3c4d5571b0dad2120bd88b697700aa31956ff98bf2`. Native reports and the probe are retained in the same `repair` directory.
- **Scope:** Local Windows Chromium file-input delivery from deeply nested evidence paths; this does not explain the separate hosted timeout.
- **Outcome:** The rollback test retains its exported file and supplies the same filename, MIME type and bytes through `setInputFiles({ name, mimeType, buffer })`. The focused case passed **1/1 in 27.9 seconds** from the same deep evidence location. Import, rollback and persistence assertions are unchanged.

### ENV-001.001 — 2026-08-24

- **Command:** `npm run build`
- **Evidence:** Restricted execution produced `Cannot read directory "../../../../../.."`; Vite could not resolve its config.
- **Scope:** Windows Codex restricted filesystem sandbox.
- **Outcome:** The identical build passed when run outside that restriction.
- **Source:** [static-content-panels Task 3 report](../.superpowers/sdd/2026-08-24-static-content-panels/task-3-report.md).

### ENV-001.002 — 2026-08-25

- **Command:** Vite-backed selected Node tests in a linked worktree.
- **Evidence:** esbuild/Vite ancestor-read denial prevented loading the Vite configuration.
- **Scope:** Windows Codex restricted filesystem sandbox.
- **Outcome:** The identical selected tests passed with project filesystem access.

### ENV-001.003 — 2026-08-30

- **Command:** Broad Vite-backed test selection.
- **Evidence:** The sandbox prevented esbuild from reading `vite.config.js` and dependency paths.
- **Scope:** Windows Codex restricted filesystem sandbox.
- **Outcome:** The same command was rerun with project filesystem access.

### ENV-001.004 — 2026-09-10

- **Command:** `pnpm test:e2e:package`
- **Evidence:** The package browser test was reported environment-blocked in Codex; this matches the existing Vite/esbuild sandbox pattern.
- **Scope:** Codex restricted execution.
- **Outcome:** From normal local PowerShell, after browser preparation, the test passed: `1 passed (39.1s)`.

### ENV-001.005 — 2026-10-03

- **Command:** `node --test tests/staticTemporalBoundary.test.js`
- **Evidence:** esbuild could not read an ancestor directory or resolve the worktree's `vite.config.js` in restricted execution.
- **Scope:** Windows Codex restricted filesystem sandbox, `fable-preparation`.
- **Outcome:** Unrestricted focused selection, including this file, passed 28/28.

### ENV-001.006 — 2026-10-12

- **Test:** `source library displays and searches dataset-first labels without rewriting authored names` in `tests/sourceContentWorkspace.test.js`.
- **Evidence:** Vite-backed startup reported an EPERM realpath failure in the restricted linked checkout.
- **Scope:** Source-label worker's focused regression checks in `fable-preparation`.
- **Outcome:** The affected unrestricted workspace checks passed; consolidated unrestricted selection passed 142/142.

### ENV-001.007 — 2026-10-12

- **Command:** `node --test --test-concurrency=1 tests/chronoContentState.test.js tests/chronoGroupEditor.test.js tests/sceneStudio.test.js`
- **Evidence:** Restricted Vite startup reported EPERM during worktree realpath resolution.
- **Scope:** Temporal-studio worker's focused regression checks.
- **Outcome:** Unrestricted temporal selection passed 44/44; final consolidated selection passed 142/142.

### ENV-003.001 — 2026-10-12

- **Command:** `git diff --stat` in `.worktrees/fable-preparation`.
- **Evidence:** Restricted reads reported `this operation must be run in a work tree` despite a valid `.git` pointer and matching `git rev-parse --show-toplevel`. Root and review/implementation workers observed the same behavior. No Git configuration was changed.
- **Scope:** Windows Codex restricted reads of this linked checkout; the underlying traversal cause was not diagnosed.
- **Outcome:** The same scoped Git reads succeeded with project access outside the sandbox.

### ENV-002.001 — 2026-09-10

- **Command:** Chromium Playwright preflight and `pnpm test:e2e:package`.
- **Evidence:** No browsers were listed in the local Playwright cache before setup.
- **Scope:** Per-user Playwright browser cache on Windows.
- **Outcome:** Run `pnpm exec playwright install chromium`; the package test subsequently passed.
