# Maintainer release and rollback guide

Draft for the engineering RC. The actual candidate/tag, output paths, package checksums and observed rollback results must be recorded before acceptance. The commands below prepare local artifacts; publishing, remote changes and a production pilot need separate authorization.

## Prepare an exact candidate

1. Use the dedicated local RC worktree and its governing instructions. Refresh/inspect the published baseline before starting another worktree; preserve the intentional private/public documentation differences. Do not build from shared main or another task's checkout.
2. Use the validated toolchain and `pnpm.cmd install --frozen-lockfile`. Current local evidence uses Node24 and pnpm11.9.0. The lockfile includes a pinned ECharts security backport; do not drop the patch or switch entry points during an incidental dependency update.
3. Save or deliberately discard open drafts before exporting committed content. Preserve the original pre-migration package and sources. Review the selected content, Storylines, fictional notice, branding and publication cutoffs. Do not substitute an older example release package.
4. Commit the coherent source/content/tests/docs. Confirm `git status --short` has no uncommitted or untracked project input. Ignored generated artifacts are not source. Record full `git rev-parse HEAD` and package SHA256, then create a new immutable RC tag. Never move a previous tag to different bytes.

During development use focused checks. At the declared final release boundary run the required complete gates once on the exact candidate:

```powershell
pnpm.cmd test
pnpm.cmd build
pnpm.cmd test:e2e -- --project=chromium
```

Before the browser gate, generate the real paired deliverables below and point `SIMEX_PDPC_DELIVERABLE_ROOT` to that combined output directory. Set `SIMEX_VIEW_PERF_INPUTS` to the reviewed actual-build declaration described in [the View performance spec](../tests/e2e/v3-view-performance.spec.js): exact standard-build/package hashes, actual runner/conditions, two chart-heavy pages with visible chart IDs, and the approved cases/trust Storyline scope. The performance input uses the complete operator exercise, not a smaller participant fixture. Missing artifacts or identities fail preflight rather than producing a passing observation.

Save native exact-title reports outside the disposable test-results directory. A failed aggregate stays failed: continue failed/unrun titles with correction attribution and reuse unaffected passing evidence. For the remainder of this task, the human removed CPU/RAM ceilings and test/build concurrency limits. Keep measured conditions for interpretation and run independent work in parallel. Serialize jobs that share ports, mutable browser/server state or output directories, and keep gates ordered where one consumes another's output. Other tasks use their own governing resource policy.

For the aggregate browser command, set `SIMEX_NATIVE_REPORT_DIR` to a fresh directory under this worktree's ignored `release/`. The four phases then retain separate native JSON reports and attachment directories: `source-companion`, `source`, `static` and `pdpc`. Leave `PLAYWRIGHT_JSON_OUTPUT_FILE` unset because it overrides per-phase reporter paths. Use a different directory for each continuation so an earlier failed report and its attachments remain intact. Save complete unit/build stdout to files as well.

Keep application provenance separate from later test corrections. The corrected local source uses immutable tag `rc/0.2.0-rc.1-validation.3`; resolve its full SHA with `git rev-parse` and confirm it against the actual artifact manifest. Earlier source `754fba39` and its outputs remain validation history after a confirmed legacy-profile regression. A committed browser-fixture/documentation correction does not change artifact identities or retroactively change the revision of an earlier run. For a later offline-output verification harness, set `SIMEX_ARTIFACT_SOURCE_COMMIT` to the artifact's full source SHA. The fixture requires the pin to be an ancestor of actual harness HEAD, a clean tracked worktree, and source-to-harness changes confined to `tests/` and `docs/`; all artifact/input checksums still apply. Its native attachment records both `sourceCommit` and `harnessCommit`. Any application, dependency, factory or build-input change invalidates this exception and requires new artifacts. Without the explicit pin, normal verification requires artifacts from HEAD.

## Generate and inspect packages

The accepted input must contain the shared Scenario page and both discipline pages. For participants, use the reviewed phase input that physically excludes unreleased observations. Keep the complete operator package separate. Use a new output directory and the factory; do not hand-edit a child or replace checked immutable artifacts:

```powershell
pnpm.cmd release:pdpc:deliverables --bundle "release/rehearsal-v7-0.2.0-rc.1-2d1d4ec7e361/phase-1-2027-03-31/dashboard-bundle.json" --out-dir "release/rc-reproduction-phase1"
```

The output contains paired Cloudflare sites/ZIPs, two standalone offline HTML files, manifests/checksums and a generated README. Verify source commit, exact input SHA256, app/package versions and output hashes. Review each variant's projected/omitted content: participant isolation applies to source/profile/media/asset/file bytes as well as visible pages. Cross-page comparisons belong to the full workspace unless the selected participant scope supports the complete composition.

For rehearsal phases, generate derivatives from the reviewed original using the existing utility:

```powershell
node scripts/build-rehearsal-packages.mjs --bundle "release/inputs/reference-dashboard-v7-0.2.0-rc.1.json" --expected-sha256 "2d1d4ec7e3619a77ed002b20e6ecd613488326e972bf5ca7cfa8529bd48b3656" --static-releases "release/inputs/reference-static-release-authority.json" --out-dir "release/rehearsal-reproduction"
```

Its approved cutoffs are31 March,31 May and 15 August 2027 inclusive in UTC. An explicit static-release authority file is optional; each approval must bind the exact input and actual human release evidence. Otherwise undated/ambiguous content is omitted for review. Keep operator originals/companions separate from participant directories. Verify every retained source/profile/asset and interpretation companion; a checksum does not establish semantic correctness or human approval.

Serve a finalized standard build with `pnpm.cmd preview --host 127.0.0.1 --port <isolated-port> --strictPort`. Local preview reads the generated security header block. Verify actual hosted-style CSP, fonts, images, chart rendering and capture. Development HMR does not establish production CSP behavior. Open each standalone HTML offline from disk and test the required journey separately. The [factory guide](pdpc-release-factory.md) gives artifact layout; [security and privacy](security-and-privacy.md) records the dependency-finding disposition.

## Preserve a compatible rollback pair

Before candidate installation retain:

- the previous accepted application bytes, source revision/tag and output checksums;
- a complete package readable by that application, including its local sources/media and required companions;
- the new candidate and its export, so newer work is not lost when returning to an older app;
- the original browser origin/profile and instructions for an isolated recovery test.

When the new dashboard format is V7, an older V6 app cannot be assumed to read it. Retain the original V6 package; never relabel or truncate a V7 package into V6. Charts remain V3.

## Rehearse rollback before release

Use the actual standard full-workspace builds and compatible packages. Participant-only PDPC outputs cannot exercise authoring/recovery. The retained previous source for this rehearsal is `107c100848a0bca849a67b29a437eb31e24d39f7`; the candidate must have native dashboard V7 and the previous app/package V6. Charts remain V3. Keep each built directory immutable during the run.

The new local preservation tag `rollback/pre-rc-2026-11-09-107c1008` points to that exact prior revision. It was created for this rollback rehearsal on 9 November; it is not a historical published release tag. Prior application/package/index/cache hashes are retained in `release/rollback/previous-artifact.json` and the native rollback inputs.

Prepare an ignored local `release/rollback-inputs.json` with `candidate` and `previous` objects. Each object requires:

| Field | Actual prerequisite |
| --- | --- |
| `root`, `sourceCommit`, `appVersion` | Built static directory, full source revision and visible application version. Paths resolve relative to this JSON file. |
| `indexSha256`, `runtimeManifestSha256` | SHA256 of that directory's exact `index.html` and `runtime-precache-manifest.js`. |
| `cacheName` | Exact cache name read from that generated runtime manifest. |
| `packagePath`, `packageSha256`, `configVersion` | Retained native package path and exact bytes/hash; candidate V7, previous V6. |
| `lazyPaths` | Nonempty array of actual relative chunk paths from that build, including the required Build/Chart wizard chunks. Each must exist and be listed in its precache manifest. |
| `smoke` | `{ "pageId": "biomedical", "chartId": "bio_confirmed_cases" }`, verified against each supplied package; use the actual equivalent only if its identity changed in accepted content. |

An optional top-level `evidenceRoot` selects a child directory under this worktree's ignored `release/`; the default is `release/rollback-backups`. The fixture creates a new backup directory per run and preserves both the exported V7 candidate and restored V6 export there. It reads the original packages without changing them. Missing artifacts, wrong hashes, undeclared lazy chunks or wrong native versions are prerequisite failures, not passing rollback evidence.

After artifact preflight, run the dedicated configuration independently of jobs that share its inputs or browser state. It starts one owned ephemeral loopback server and a fresh isolated browser context; it does not start Vite or build anything:

```powershell
$env:SIMEX_ROLLBACK_INPUTS = (Resolve-Path "release/rollback-inputs.json").Path
pnpm.cmd exec playwright test --config tests/e2e/rollback.config.mjs --project chromium --workers=1 --reporter=json > "release/rollback-native-<unique-run-id>.json"
```

The browser journey performs the operator sequence below through public controls:

1. Import the candidate package through Scenario Passport → Upload Dashboard Package → Replace, then download and preserve a V7 backup. Warm Build and verify the candidate's actual cache and file hashes.
2. Switch the same isolated origin to the previous built directory. Observe its service worker waiting, close every application window on that isolated origin, then reopen it. The retained `107c1008` worker uses ordinary waiting/client lifecycle and `updateViaCache: none`; neither its worker nor its registration code forces `skipWaiting` or client claiming. The fixture observes activation and verifies the previous cache, rather than clearing caches or forcing activation.
3. Confirm the older app cannot open the saved V7 configuration. Attempt the preserved V7 package through recovery and verify rejection leaves saved data unchanged.
4. Use **Load Dashboard Source** to open the older deployed source for the session. This does not replace saved V7 data. Then use the normal Scenario Passport upload/Replace flow to commit the compatible original V6 package and its authored media. This route exercises the normal asset import transaction; do not substitute direct storage replacement or relabel V7 as V6.
5. Confirm the previous app version, representative chart and restored package identity; preserve its native V6 export. Close the page, disconnect the isolated browser context, reopen offline, verify retained images and open the Chart wizard from Build using the cached lazy runtime.

The native report attaches app/source/package identities, exact index/runtime-manifest/cache/config/lazy-file hashes, rejection observations, preserved export hashes and an offline screenshot. Export preservation compares the complete authored config and metadata plus verified payload bytes; only the export timestamp and declared root runtime/profile fields may differ. Storylines, bindings, source interpretation and media are not reduced to ID checks. The fixture serves each build's actual security headers with HTTP `no-store` to isolate service-worker/cache behavior; this is not evidence of a Cloudflare deployment rollback or its HTTP-cache policy. Historical failures remain failures; record correction/continuation identities explicitly.

For V7, the comparator verifies each whole-package checksum before excluding that verified checksum from the authored-content comparison. A legitimate reexport can have a different checksum because its export timestamp changed. Invalid integrity still fails, and an altered authored value cannot pass merely by recomputing the outer checksum. V6 packages are compared in their original format without migration.

Historical local rollback passes **1/1** for application source `754fba39` (`rc/0.2.0-rc.1-validation.2`) and retained previous source `107c1008`. Native report: `release/rc1-v2-rollback-native-01.json`; reviewed inputs: `release/rc1-v2-rollback-inputs.json`; immutable candidate identity: `release/rc1-v2-standard-artifact.json`. Preserved V7/V6 exports are under `release/rc1-v2-rollback-backups`. The observation covers ordinary worker activation, unchanged V7 bytes on rejection, normal V6 restore/reexport and offline cached lazy authoring; it does not establish deployment recovery or the corrected candidate's result. Verify the corrected candidate with its newly bound outputs and record its report separately. Do not clear unrelated site data, stop unrelated previews, replace production output, change hosting settings or publish as part of this rehearsal.
