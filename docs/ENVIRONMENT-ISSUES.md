# Environment Issue Register

This is the project-wide register of reproducible local-environment blockers. It records each occurrence, including repeated occurrences of a known problem, so the recurrence pattern is visible.

Do not record product-test failures, expected build warnings, transient typing mistakes, or an unverified suspicion.

## Problem index

| Problem ID | Type of problem | Status | Entries | Entry references |
|---|---|---|---:|---|
| ENV-001 | Codex restricted sandbox denies Vite/esbuild filesystem traversal | Active in restricted Codex execution | 4 | ENV-001.001, ENV-001.002, ENV-001.003, ENV-001.004 |
| ENV-002 | Playwright Chromium is absent from the local browser cache | Recurrent after cache removal or Playwright upgrade | 1 | ENV-002.001 |

The **Entries** value must equal the number of listed entry references. Add a new reference for every confirmed repeat; do not merely increase the count.

## Entry rules

1. Before calling a test environment-blocked, check the problem index.
2. For a repeat, append a new entry under its existing problem ID and update both the count and references in the index.
3. For a new reproducible cause, assign the next `ENV-###` ID, add its index row, and create the first `.001` entry.
4. Every entry must include the date, exact command or test, concise error or preflight evidence, scope, and the outcome or workaround.
5. Include the register update in the task's coherent commit when it is changed. Resolve ordinary merge conflicts by preserving every distinct entry and recalculating the affected index row.

## Entries

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

### ENV-002.001 — 2026-09-10

- **Command:** Chromium Playwright preflight and `pnpm test:e2e:package`.
- **Evidence:** No browsers were listed in the local Playwright cache before setup.
- **Scope:** Per-user Playwright browser cache on Windows.
- **Outcome:** Run `pnpm exec playwright install chromium`; the package test subsequently passed.
