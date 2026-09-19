# Candidate regression repair ledger

Final HEAD: `7298ce2da9a948d10a82524200b34ba0a921399b`. Initial HEAD: `0aab4b9`; original application revision: `835f6ca`; comparison base: `c003d11`.

All seven candidate regressions pass. Six are consumers of retired Build controls; FT-11 is a production layout regression. Thirty source-browser cases completed across the six affected specs: 19 pass, 11 fail, zero not-run. Every remaining failed test also failed at base. No fixture assertions were weakened.

Before results and base comparisons are carried forward from the supplied gate ledger. Native JSON reports retain exact titles, dispositions, and errors. FT-11 used a temporary diagnostic hook that was removed; its original geometry and reload assertions are unchanged.

## FT-11 root cause

At 1024 x 768, the hidden disabled Finish Build tooltip in the Session command group measured x=826.828125, width=236.53125, right=1063.359375. Document width was 1063; temporarily removing tooltip boxes reduced it to 1024. The cause was the centered absolute tooltip on the trailing toolbar command, not ActionMenu items. Production CSS now right-aligns that trailing explanation. The original FT-11 journey passes. Diagnostic attachment: [ft11-before.json](ft11-before.json).

## Commits

- `3ae941a8 fix(build): contain the trailing Session command tooltip`
- `7eb21018 test(build): assert direct Scene Studio access in Libraries`
- `fb68c3c1 test(qmd): locate authored panel actions through the menu`
- `f0a46267 test(build): update the primary command order contract`
- `6c61404e test(portability): use panel menus for edit and removal`
- `4bceedba test(free-text): open chart editors through panel menus`
- `7298ce2d test(theme): reach Scene Studio from Libraries`

All seven commits include `Co-Authored-By: Codex <noreply@openai.com>`.

## Spec totals

| Spec | Before pass/fail | After pass/fail/not-run |
| --- | --- | --- |
| dense-desktop-review-followups.spec.js | 2/2 | 3/1/0 |
| qmd-rich-editor.spec.js | 3/1 | 4/0/0 |
| source-content-manager.spec.js | 2/2 | 3/1/0 |
| static-content-portability.spec.js | 3/1 | 4/0/0 |
| static-free-text.spec.js | 1/8 | 3/6/0 |
| v3-authoring-theme-propagation.spec.js | 1/4 | 2/3/0 |

## Exact test dispositions and correction attribution

| Spec / exact title | Before | After | Root-cause cluster | Correction | Native report |
| --- | --- | --- | --- | --- | --- |
| dense-desktop-review-followups.spec.js: chart wizard stage labels and statuses use two unclipped lines at desktop width | pass | pass | unchanged passing contract | - | [dense-after.json](dense-after.json) |
| dense-desktop-review-followups.spec.js: the default Chrono date is compact and clears the dashboard identity header | fail | fail | pre-existing-at-base | - | [dense-after.json](dense-after.json) |
| dense-desktop-review-followups.spec.js: Build Libraries exposes Scene Studio directly without a More drawer | fail | pass | retired Build control consumer | 7eb21018 | [dense-continuation.json](dense-continuation.json) |
| dense-desktop-review-followups.spec.js: the fixed Audience options drawer sizes to its four facts | pass | pass | unchanged passing contract | - | [dense-continuation.json](dense-continuation.json) |
| qmd-rich-editor.spec.js: Composer keyboard formatting, semantic styles, footprint, and always-visible preview | fail | pass | retired Build control consumer | fb68c3c1 | [qmd-corrected.json](qmd-corrected.json) |
| qmd-rich-editor.spec.js: sanitized paste keeps visible text and removes hostile formatting | pass | pass | unchanged passing contract | - | [qmd-corrected.json](qmd-corrected.json) |
| qmd-rich-editor.spec.js: Raw text preserves unsupported source untouched | pass | pass | unchanged passing contract | - | [qmd-corrected.json](qmd-corrected.json) |
| qmd-rich-editor.spec.js: resume Text/Image restores the current editing surface and scroll | pass | pass | unchanged passing contract | - | [qmd-corrected.json](qmd-corrected.json) |
| source-content-manager.spec.js: compact Build content commands preserve six/four stage contracts | fail | pass | retired Build control consumer | f0a46267 | [source-after.json](source-after.json) |
| source-content-manager.spec.js: non-modal manager restores canvas selection and scroll | pass | pass | unchanged passing contract | - | [source-after.json](source-after.json) |
| source-content-manager.spec.js: desktop composition keeps canvas and catalogue state without overflow | fail | fail | pre-existing-at-base | - | [source-after.json](source-after.json) |
| source-content-manager.spec.js: tablet composition navigates list to detail with Back and preserves filters | pass | pass | unchanged passing contract | - | [source-continuation.json](source-continuation.json) |
| static-content-portability.spec.js: production StrictMode root keeps the reloaded durable Image URL active | pass | pass | unchanged passing contract | - | [portability-after.json](portability-after.json) |
| static-content-portability.spec.js: package import quota failure preserves the prior dashboard and authored store | pass | pass | unchanged passing contract | - | [portability-after.json](portability-after.json) |
| static-content-portability.spec.js: Image replacement and panel removal retain reusable durable media bytes | fail | pass | retired Build control consumer | 6c61404e | [portability-after.json](portability-after.json) |
| static-content-portability.spec.js: asset commit failure restores the prior dashboard and authored store atomically | pass | pass | unchanged passing contract | - | [portability-after.json](portability-after.json) |
| static-free-text.spec.js: Free-text composer authors portable semantic styles, keyboard emphasis, lists, tables, and preview | pass | pass | unchanged passing contract | - | [free-text-after.json](free-text-after.json) |
| static-free-text.spec.js: embedded image persists through reload and a second Text/Image creation | fail | fail | pre-existing-at-base | - | [free-text-after.json](free-text-after.json) |
| static-free-text.spec.js: Free Text edit embedded image retries durably through reload | fail | fail | pre-existing-at-base | - | [free-text-continuation.json](free-text-continuation.json) |
| static-free-text.spec.js: Free text completes its in-session production journey at 1440x900 | fail | fail | pre-existing-at-base | - | [free-text-continuation.json](free-text-continuation.json) |
| static-free-text.spec.js: Free text completes its in-session production journey at 1024x768 | fail | fail | pre-existing-at-base | - | [free-text-continuation.json](free-text-continuation.json) |
| static-free-text.spec.js: Free text completes its in-session production journey at 768x900 | fail | fail | pre-existing-at-base | - | [free-text-continuation.json](free-text-continuation.json) |
| static-free-text.spec.js: FT-11 reload continuation preserves the exact saved QMD and revision | fail | pass | trailing Session tooltip overflow | 3ae941a8 | [ft11-after.json](ft11-after.json) |
| static-free-text.spec.js: FT-05 View and fullscreen activate only safe links by pointer and keyboard | fail | fail | pre-existing-at-base | - | [free-text-continuation.json](free-text-continuation.json) |
| static-free-text.spec.js: FT-06 live authoring blocks every resource boundary and preserves recoverable session source | fail | pass | retired Build control consumer | 4bceedba | [free-text-continuation.json](free-text-continuation.json) |
| v3-authoring-theme-propagation.spec.js: catalogue exposes the exact renamed styles and profiles without retired choices | pass | pass | unchanged passing contract | - | [theme-after.json](theme-after.json) |
| v3-authoring-theme-propagation.spec.js: selected dashboard style reaches every Build authoring surface | fail | pass | retired Build control consumer | 7298ce2d | [theme-after.json](theme-after.json) |
| v3-authoring-theme-propagation.spec.js: Unit Orbit retains the selected theme outside AppFrame | fail | fail | pre-existing-at-base | - | [theme-after.json](theme-after.json) |
| v3-authoring-theme-propagation.spec.js: View Chrono and Present controls contain no retired dashboard paint | fail | fail | pre-existing-at-base | - | [theme-continuation.json](theme-continuation.json) |
| v3-authoring-theme-propagation.spec.js: standalone source viewer receives the selected dashboard style | fail | fail | pre-existing-at-base | - | [theme-continuation.json](theme-continuation.json) |

## Remaining failures

The pre-existing-at-base classification means that the exact test also failed at base; it does not by itself establish an identical cause. Current failures cluster into missing dashboard headings, fullscreen controls intercepted by the sticky crown, missing Chrono/Edit entry controls, and lost source-manager selection.

### the default Chrono date is compact and clears the dashboard identity header

```text
Test timeout of 30000ms exceeded.
```

### desktop composition keeps canvas and catalogue state without overflow

```text
Error: expect(locator).toContainText(expected) failed

Locator: locator('.source-content-workspace[data-manager-layout="desktop"]').locator('.source-content-row[aria-pressed="true"]')
Expected substring: "cases WCPH eldoria managed"
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 20000ms
  - waiting for locator('.source-content-workspace[data-manager-layout="desktop"]').locator('.source-content-row[aria-pressed="true"]')
```

### embedded image persists through reload and a second Text/Image creation

```text
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'HeV-A26 Dashboard: Epidemiological overview' })
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByRole('heading', { name: 'HeV-A26 Dashboard: Epidemiological overview' })
```

### Free Text edit embedded image retries durably through reload

```text
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'HeV-A26 Dashboard: Epidemiological overview' })
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByRole('heading', { name: 'HeV-A26 Dashboard: Epidemiological overview' })
```

### Free text completes its in-session production journey at 1440x900

```text
Test timeout of 180000ms exceeded.
```

### Free text completes its in-session production journey at 1024x768

```text
Test timeout of 180000ms exceeded.
```

### Free text completes its in-session production journey at 768x900

```text
Test timeout of 180000ms exceeded.
```

### FT-05 View and fullscreen activate only safe links by pointer and keyboard

```text
Test timeout of 120000ms exceeded.
```

### Unit Orbit retains the selected theme outside AppFrame

```text
Test timeout of 30000ms exceeded.
```

### View Chrono and Present controls contain no retired dashboard paint

```text
Test timeout of 30000ms exceeded.
```

### standalone source viewer receives the selected dashboard style

```text
Test timeout of 30000ms exceeded.
```

## Commands and native reports

Each run used `PLAYWRIGHT_JSON_OUTPUT_NAME` pointing at the linked native report in this directory.

[ft11-before.json](ft11-before.json)

```powershell
pnpm.cmd test:e2e:dev tests/e2e/static-free-text.spec.js --project=chromium --grep '^FT-11' --reporter=line,json
```

[ft11-after.json](ft11-after.json)

```powershell
pnpm.cmd test:e2e:dev tests/e2e/static-free-text.spec.js --project=chromium --grep '^FT-11' --reporter=line,json
```

[dense-after.json](dense-after.json)

```powershell
pnpm.cmd test:e2e:dev tests/e2e/dense-desktop-review-followups.spec.js --project=chromium --reporter=line,json
```

[dense-continuation.json](dense-continuation.json)

```powershell
pnpm.cmd test:e2e:dev tests/e2e/dense-desktop-review-followups.spec.js --project=chromium --grep 'Build Libraries|fixed Audience options' --reporter=line,json
```

[qmd-after.json](qmd-after.json)

```powershell
pnpm.cmd test:e2e:dev tests/e2e/qmd-rich-editor.spec.js --project=chromium --reporter=line,json
```

[qmd-corrected.json](qmd-corrected.json)

```powershell
pnpm.cmd test:e2e:dev tests/e2e/qmd-rich-editor.spec.js --project=chromium --reporter=line,json
```

[source-after.json](source-after.json)

```powershell
pnpm.cmd test:e2e:dev tests/e2e/source-content-manager.spec.js --project=chromium --reporter=line,json
```

[source-continuation.json](source-continuation.json)

```powershell
pnpm.cmd test:e2e:dev tests/e2e/source-content-manager.spec.js --project=chromium --grep 'tablet composition' --reporter=line,json
```

[portability-after.json](portability-after.json)

```powershell
pnpm.cmd test:e2e:dev tests/e2e/static-content-portability.spec.js --project=chromium --reporter=line,json
```

[free-text-after.json](free-text-after.json)

```powershell
pnpm.cmd test:e2e:dev tests/e2e/static-free-text.spec.js --project=chromium --grep-invert '^FT-11' --reporter=line,json
```

[free-text-continuation.json](free-text-continuation.json)

```powershell
pnpm.cmd test:e2e:dev tests/e2e/static-free-text.spec.js --project=chromium --grep 'Free Text edit|Free text completes|FT-05|FT-06' --max-failures=0 --reporter=line,json
```

[theme-after.json](theme-after.json)

```powershell
pnpm.cmd test:e2e:dev tests/e2e/v3-authoring-theme-propagation.spec.js --project=chromium --reporter=line,json
```

[theme-continuation.json](theme-continuation.json)

```powershell
pnpm.cmd test:e2e:dev tests/e2e/v3-authoring-theme-propagation.spec.js --project=chromium --grep 'View Chrono and Present|standalone source viewer' --max-failures=0 --reporter=line,json
```

## Run notes

- Initial sandboxed Vite startup failed with directory access denied. The elevated rerun completed.
- Initial Git index writes failed with index.lock permission denied. The elevated commit succeeded.
- The development script uses max-failures=1. Unrun tests were continued through spec-local grep selections; longer continuations use max-failures=0. Passing cases were not repeated after their relevant code was unchanged.
- The first updated QMD attempt needed the normal panel hover before clicking its menu. No tests passed in that attempt; all four passed after correction.
- FT-11 was excluded from the later free-text selection because its production fix had already passed unchanged.
- No broad suites or builds were run. Production-static cases remain outside this task. No push, merge, rebase, or stash was performed.
- Final tracked worktree is clean; the pre-existing untracked .claude directory remains untouched.
