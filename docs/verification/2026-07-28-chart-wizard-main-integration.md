# Chart Wizard Revamp — Main Integration Verification

Date: 2026-07-28

Status: Locally verified with draft pull requests open; merge and deployment
remain unapproved

## Candidate lineage

- Refreshed dashboard `origin/main`:
  `18dc5e3abbccff25ac678b083a108828fe6f58ed`
- Reviewed chart-system feature:
  `24dd188b3f603f2a79dbd526f09bc2237b5514ee`
- Local integration merge:
  `51742d1ab5c76025c39438e3f6e9baf9bc0133a7`
- Clean-checkout JSON EOL correction:
  `a1b029c605aabae715488d018cad70515e0531dc`
- Integration branch:
  `codex/chart-wizard-integration`

The merge commit has exact parents `18dc5e3` and `24dd188`. Both refreshed
`origin/main` and the reviewed feature tip are ancestors of the candidate.

## Windows clean-checkout correction

The first post-merge unit run passed 748 of 750 tests. The two failures proved
that a fresh Windows checkout converted generated dashboard JSON contracts to
CRLF under `core.autocrlf=true`, while the generators and byte-determinism tests
require LF.

The candidate adds a bounded `.gitattributes` policy for generated JSON under
`public/config/` and `public/integration/`. A fresh detached checkout of
`a1b029c` contained LF-only dashboard configuration, aliases, dataset profiles,
and Quorum catalogue files.

## Pull-request review remediation

The first independent review of draft PR #4 found no critical issues and five
important issues. All five were reproduced and fixed:

- wrapped panel placements now preserve their stable placement identity while
  rendering, editing, saving, reordering, and removing the contained chart;
- imported CSV dataset profiles persist across edits and browser reloads,
  while tracked built-in profiles remain a fallback rather than being copied
  into browser storage;
- removing a page also removes its chart memberships from synchronized
  playback groups and repairs landing-page routes that referenced that page;
- horizontal charts now bind primary and secondary measurements to distinct
  horizontal value axes; and
- CSV uploads are bounded before reading, row counts are bounded after parsing,
  and browser-storage quota failures remain recoverable inside the wizard.

Review regression coverage was added at both unit and Chromium levels. Two
resource-intensive browser scenarios also received scenario-specific timeout
budgets after retained traces showed forward progress on the heavily loaded
Windows host rather than application deadlock.

## Verification results

- Refreshed-main baseline: 45/45 unit tests passed.
- Focused clean-checkout regressions: 27/27 passed.
- Full dashboard unit suite: 753/753 passed in 24.19 seconds.
- Canonical production build: passed; 697 modules transformed.
- Generated catalogue: 26 chart types and 40 configured charts.
- Focused review-regression Chromium gate: 3/3 journeys passed.
- Quorum companion Chromium gate: 8/8 journeys passed.
- Full Chromium E2E: 43/43 journeys passed in 20.0 minutes.
- Full `origin/main..HEAD` diff check: passed.
- Dashboard and Quorum catalogue artifacts remained byte-identical at
  `51b5c2b673ed0a07552c9ec8430befcaa8b73ba781b31a956b6a57365132f25c`.

The build retained the known non-failing notices for three classic scripts and
the approximately 1.7 MB minified application chunk.

## Dashboard–Quorum live smoke

Quorum branch `codex/chart-schema-v3-contract` at
`eba9d277eefbfea00ef88c130ecfc26573544827` served the actual integrated
dashboard distribution through the production aiohttp companion boundary.

The headless browser:

1. loaded the Quorum-served dashboard;
2. reached `Companion connected`;
3. received an operator-authorized request for `bio_confirmed_cases`;
4. displayed that chart; and
5. returned `display_state_changed` at revision 1 with reason
   `operator_selected_recommendation`.

There were no browser errors or gateway rejections. Dashboard and Quorum
catalogue bytes matched at SHA-256:

`51b5c2b673ed0a07552c9ec8430befcaa8b73ba781b31a956b6a57365132f25c`

## Integrity and release gate

- The original chart feature worktree remains clean at `24dd188`.
- The showcase worktree remains clean at exact `8abca5e`.
- Dashboard and Quorum candidate branches were pushed after explicit approval.
- Draft dashboard PR
  [#4](https://github.com/hekmatov/simex-dashboard-private/pull/4) and Quorum
  PR [#9](https://github.com/hekmatov/quorum/pull/9) were opened after separate
  explicit approval.
- No shared branch was merged.
- No deployment or Cloudflare branch update was performed.

The accepted first-pass review findings are remediated and locally verified.
The exact committed remediation tip still requires final independent
re-review. Merging either pull request, changing the Cloudflare branch, or
deploying requires separate explicit user approval.
