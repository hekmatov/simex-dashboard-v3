# Fable M0.2: representative dashboard fixture and reset smoke

Date: 27 September 2026. Assignment: roadmap v1.3, section 5, **M0.2 representative dashboard fixture and reset smoke**. This is a bounded implementation closeout, not completion of all M0.2 or M0.

## Baseline and ownership

- Branch: `codex/fable-m0-source-fixture`.
- Worktree: `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation`.
- Exact starting code: `cdf83abd109b10c538b7684bbdfb542c0d0d8aa4`, the clean unmerged predecessor source repair.
- Governing brief: canonical `docs/superpowers/plans/2026-09-19-consolidated-development-roadmap.md`, v1.3, read from main at `f5d692c9a1f46a61b6359b2110c17d4ae711f856`. No main merge, repeated baseline preparation or canonical roadmap edit was needed.
- Operating/reporting agreement: `C:\Users\hekma\Documents\Projects\SimEx\FABLE-WORKFLOW-PROMPTS.md`. Completed closeout is to be sent once to **Fable dashboard planning steward**, local chat `01a0d085-14b6-7882-9994-12c2b6652a2b`, for reconciliation and the next assignment.

## Delivered

The [representative fixture](../tests/fixtures/fable-m0-dashboard.md) contains four native V3 panels: a temporal line chart, static pie chart, editable QMD briefing and packaged image. It retains current shipped Eldoria CSV descriptors/profiles and image assets, plus the earlier source fixture's complete municipal GeoJSON feature and source entry. Three items retain Present eligibility; free text keeps its existing exclusion.

The existing source harness now provides explicit context-local selection through `POST /__test__/dashboard`. Only the requesting browser context receives fixture configuration and profiles. Requests without its cookie still use the normal shipped path. Unknown selections fail without changing selection. Shipped data files and images are served through their existing public paths; no public source, app code or package schema changed.

`resetSourceDashboard` first visits an inert same-origin harness page to unload the app, clears that browser context's saved dashboard/storage/databases/caches, selects the requested dashboard and opens it. Reloads retain edits; resets remove them. Use a dedicated test context without other active app tabs. Companion bootstrap is unavailable only for the selected fixture, which has no matching companion catalogue; the old companion reset and unrelated consumers remain unchanged.

## Evidence — 27 September 2026

All commands ran in this worktree. Vite/Chromium commands used project filesystem access per repository policy. Deterministic scratch files used `TEMP`/`TMP=test-results/m0-fixture-temp`. No environment blocker occurred.

| Selection | Result and scope |
| --- | --- |
| `node --test --test-concurrency=1 tests/e2eHarnessSourceMode.test.js` | **5 passed.** Fixture/schema validation, ready chart data and temporal evidence, media bytes, Present eligibility, cookie isolation/reset/default delivery, and existing source/stale-dist/explicit-mode contracts. |
| `pnpm.cmd test:e2e:dev tests/e2e/fable-m0-fixture.spec.js --project=chromium` | The editing/reset journey passed in **5.9s**. It rendered View charts and image; edited/saved QMD through Build; confirmed persistence after reload; accessed eligible Present controls and selected the image; reset to original content; and verified unchanged hashes of shipped config/profiles and fixture-referenced CSV/media files. The missing-source case then stopped on an ambiguous locator; the default smoke was not run in that invocation. |
| `pnpm.cmd test:e2e:dev tests/e2e/fable-m0-fixture.spec.js --project=chromium --grep 'missing fixture source\|default harness'` | **2 passed** in **9.2s** overall. The corrected visible error figure identifies the missing cases CSV while the other chart and Build content remain usable. A separate fresh context launches actual shipped content with no fixture cookie and renders its packaged image. |
| `git diff --check` | Passed. |

Together these are **5 deterministic and 3 browser cases passed**, with the unaffected passing browser journey retained rather than rerun. Earlier setup corrections were confined to the new spec: hover the panel before its menu; open the quick editor's full editor; assert Present's real mode/catalogue controls rather than a View/Build-only container attribute; scope the missing-source assertion to its visible figure instead of both figure and wrapper. Short isolated editor and Present/reset probes confirmed the boundaries before another long journey. No product assertion was weakened and no production defect was found.

The predecessor's 19 deterministic checks, offline source-loader check and PDPC evidence were unaffected and were not rerun. No claim is made about a complete unit/browser gate, production build, fresh-checkout platform matrix, service workers or Audience.

One independent read-only review of the fixture, harness, reset helper and focused consumers found no actionable issues. It confirmed the bounded isolation/reset and contract-preservation approach without repeating passing tests or claiming release readiness.

## Remaining milestone work

The assigned fixture/reset slice is delivered within its recorded checks. No unresolved blocker or new product choice was identified. Broader M0.2 historical failure inventory and shared-driver repairs, M0.3 Windows/Linux dev/build/Cloudflare gates, M0.4 code splitting and converter preservation, M0.5 recovery, and M0.6 CI remain open. The code is still unmerged; main integration, push, deployment and human acceptance retain their separate boundaries. Scenario-authoring remains paused and untouched.

The planning steward owns roadmap reconciliation and the next eligible assignment. This owner stops at the current slice boundary.
