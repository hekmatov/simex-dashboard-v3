# Fable M0.6 preparation checkpoint

## User-selected authored baseline — 1 October 2026

The user's explicit selection of `C:\Users\hekma\Downloads\SimEx-dashboard-bundle-20260903.json` supersedes the earlier shipped package regardless of export date. Original SHA-256: `b1582453dc2e2fd419a435f9af278b07f76325bd4867576437adf321c1dc84da`. Original, hash, inventory and check logs are preserved in `.worktrees/fable-m0-integration-evidence/m0-selected-content-20261001`. Owner remains GPT-6.1 Sol / High, branch `codex/fable-m0-source-fixture`, predecessor `f6565d27`; authored baseline tip is the commit containing this entry.

The existing promotion CLI used that explicit Downloads input. Profiles, portable data and companion catalogue were regenerated. Exact promotion fidelity passed independent review: 38 sources (34 byte-identical emitted CSVs plus four preserved embedded GeoJSONs), 38 charts across 15 types, two unchanged Chrono Groups with seven member charts, no declared media network dependencies. Municipal outbreak playback has map/line members and a 2020-02-27–2021-04-17 period; National outbreak and health-system playback has five line/bar/mixed members and a 2027-02-20–2027-08-15 period. No saved Scenes. Authored text, IDs, styles, groups and source data were not synthesized or pruned.

Strict companion metadata required reconciliation: 37 aliases were recovered unchanged from historical `c85d17ed`; the user's added bar `TEEEST` uses its exact-title alias and page/type/title keywords. The generated catalogue admits all 38 charts under the unchanged semantic/protocol contract. Nearest source/profile/catalogue checks initially passed 60/65 cases; stale prior-content IDs and an exact duplicate diagnostic were corrected, and affected rerun passed 15/15 (four parent cases plus 11 negative subcases). No title or assertion contract was removed. Runtime boundary inspection passed. Those logs complement the promotion fidelity assertions; no whole-suite or density rerun is claimed.

Next: build the promoted content, prepare a separately identified preview, exercise representative chart/group playback and period controls, complete preview-boundary review, then hand over the final candidate and refreshed measurements. Historical preview `127.0.0.1:4279` and E44–E46 remain evidence for their prior content; they do not prove this new baseline. Hosted/Linux results, human acceptance, budget ratification and the 223 M1 geometry findings remain open.

## Current local-readiness slice — 1 October 2026

Owner `01a0e2c9-c986-7ec2-96f2-63b2ed428b0a`, GPT-6.1 Sol / High. Worktree `.worktrees/fable-preparation`, branch `codex/fable-m0-source-fixture`; predecessor `d2dab23f`, current tip is the commit containing this checkpoint. Canonical assignment: roadmap section 5, planning commit `a2f4b628`; Fable coordination v3 amended 1 October. The slice prepares CI, a budget decision and an external-browser preview. Hosted execution, budget ratification and practitioner acceptance remain pending.

CI now adds independent Windows/Ubuntu Cloudflare jobs using `pnpm build:cloudflare` / `pnpm build:cloudflare:linux`. Isolation protects standard-build consumers. A failed command propagates through the logged pipeline; build logs, entry HTML, runtime manifest and package/profile identities upload under `always()`. The existing unit and two source-browser phases remain intact. Local checks: Cloudflare contract 3/3 passed; YAML parsed with both platform commands, preserved source step IDs and unconditional report upload; local Bash retained a failing pipeline's exit code; Git whitespace check passed. A scoped GPT-6.1 Sol / Medium review found no actionable issues across CI, budget and preview boundaries. Unaffected E44/E45 passing builds and suites are reused.

### View-budget decision (proposals requiring ratification)

The retained E41 baseline is approximately 1,090,530 bytes gzip for the entry and 1,164,060 for the static initial module graph. The actual preview measures **780,102 / 851,580 bytes**: **26.84%** graph reduction. Two unconditional Three/Vanta scripts add 157,066 bytes; full HTTP bootstrap JS is **1,008,646 bytes**. File-only portable data, lazy imports, CSS/fonts and exercise data are excluded from those HTTP JS figures. Gzip sizes are per artifact; they do not assert actual wire compression. Measurement script/JSON are beside the preview snapshot.

| Decision option | Concrete consequence |
| --- | --- |
| Recommend an explicit M0 ceiling: entry 800 KiB, static module graph 860 KiB, HTTP bootstrap JS 1,000 KiB | Current build fits with small headroom; retain the baseline and schedule further View optimization after M0. These ceilings supersede the unratified proposals only if the user approves them. |
| Retain 250 KiB entry and 30% module-graph reduction | Authorize a separate View-runtime slice: entry must lose 524,102 bytes (~67%); graph must lose at least 36,738 bytes to reach 814,842. No such architecture work has been performed here. |
| Ratify only the 30% module-graph target, decide entry later | Still needs the 36,738-byte reduction and an explicit entry decision before whole-M0 closure. |

### Hosted-run proposal and deployment implications

After separate push approval, publish the reviewed commit to **origin** (`https://github.com/hekmatov/simex-dashboard-private.git`), creating `codex/fable-m0-source-fixture`: `git push origin HEAD:refs/heads/codex/fable-m0-source-fixture`. Read-only remote inspection on 1 October found no existing branch, repo hooks or deployments; remote main remains `c003d111`. The branch push triggers `.github/workflows/source-ci.yml` (all-branch `push`) and four OS/job combinations; it changes neither main nor the public remote. The candidate's only workflow contains no deployment command.

The candidate commit uses the **[CF-Pages-Skip]** prefix: [Cloudflare Pages documents that it suppresses its deployment](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/), while it is absent from [GitHub Actions' skip strings](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs). External GitHub-App/Workers integrations are not established by empty hooks/deployment lists; their settings remain unverified. A push approval must account for those external integrations. This proposal has not been executed.

### Practitioner candidate

Live loopback preview: **http://127.0.0.1:4279/**, app **0.1.0**, actual **WCPH HeV-A26 Simulation**, config v6. The [existing five-minute walkthrough](demos/m0-launch-navigation.md) records package identity, shipped-content/controls preflight, origin/storage guidance and hidden process stop/restart instructions. No synthetic content or authored-data changes. The server remains available for feedback. Human acceptance, hosted/Linux success and the 223 M1 geometry findings are not closed by this slice.

## Historical local preparation record

Status: local preparation complete from clean M0.5 commit `6612cd59`; awaiting the separately authorized hosted-run boundary. Ownership covers Windows/Ubuntu push CI, app version/changelog visibility, and a practitioner launch/navigation demo script. Hosted CI and human practitioner acceptance are separate boundaries; main merge, push and deployment are not authorized here.

The new source workflow runs unit tests, a source build and the source Chromium suite on both Windows and Ubuntu. It installs Playwright Chromium once per operating-system job, keeps unit JUnit and Playwright JUnit/HTML/traces, and uploads available reports on failures before a final status gate. Static and PDPC aggregate suites remain separate release/integration checks. The app remains at pre-pilot version `0.1.0`; the dashboard/chart/package schema numbers remain independent. The existing dashboard information footer exposes the app version and changelog link. The demo script is prepared for a practitioner but has not been conducted.

Local checks: YAML parsed and checked for both OS targets, check IDs and unconditional artifact upload. The Playwright source CLI enumerated 277 Chromium tests in 56 files, excluding static/PDPC by the existing config. Its Chromium install CLI accepted the selected-browser command. Node's spec plus JUnit reporters produced a local XML file. Frozen offline pnpm install succeeded with pnpm 11.9.0. The Windows `pnpm.cmd build` command passed, including its prebuild and static verifier; generated derivatives were restored after the check. Eight directly affected footer unit tests and the View/Build/Present all-Page browser journey passed. Windows/Ubuntu hosted runners were not exercised.

Scoped review: a YAML shell-quoting error and a local `pnpm exec` Windows shim-resolution failure were corrected before the final candidate. The workflow now invokes Playwright through its installed Node CLI. Source test/build failures are retained as step outcomes, reports upload under `always()`, and a final gate fails the job. The Present workspace has no information footer, so the browser version assertion remains on View and Build; the release footer has its own deterministic check. Official action releases and Playwright reporter/CI documentation were consulted for action versions and output variables. The parked `@visual-audit` proposal has no demonstrated ownership bearing on this source workflow, so it was not adopted or modified.

Next: commit this coherent local preparation and report its tip, checks, and the concrete push/hosted-run approval boundary to the planning steward. Real Ubuntu/Windows CI results and practitioner acceptance remain pending.
