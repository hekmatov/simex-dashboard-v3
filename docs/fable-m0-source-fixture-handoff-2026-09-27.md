# Fable M0: bounded source and fixture repair

Date: 27 September 2026. This records the first assignment in section 5 of the authoritative [roadmap](superpowers/plans/2026-09-19-consolidated-development-roadmap.md). It is implementation evidence, not a milestone status ledger. M0.1 activation is established; the connected M0.2/M0.3 source repair is bounded as described below.

## Activation and preserved baseline

| Item | Verified value |
| --- | --- |
| Refreshed `origin/main` | `c003d11174f247acac10879274e73d9434c67096` |
| Refreshed `public/main` | `c003d11174f247acac10879274e73d9434c67096` |
| Prepared annotated tag | `fable-pre-m0-2026-09-27` |
| Peeled code checkpoint | `e7e58c8432987403767d4fc973fa30df41f91cd8` |
| Actual implementation base | `15a2daf4267552149e52db219eb81823c2bc0b80` |
| Branch | `codex/fable-m0-source-fixture` |
| Reused worktree | `C:\Users\hekma\Documents\Projects\SimEx\simex-dashboard\.worktrees\fable-preparation` |

Both remote fetches succeeded on the date above. Both published refs and the peeled checkpoint are ancestors of the actual base. The user-authorized base includes the redesign, non-scenario carry-forwards, preparation handoff and roadmap v1.2; neither remote alone contains these. The preparation checkout was clean and detached at `cdfc7a6a69f77f9568dcf6454760956717ecf160`; no running development process referenced it. A new branch was created at the specified base without a merge or changes to main.

The saved project/repository/export-directory scan found only the September 9 `temp-cloudflare-version/packaged-dashboard-bundle.json`. It was already incorporated and was not promoted again. Unexported browser storage was not inspected. Authored public assets/configuration, scenario checkouts, other branches and the advisory record were preserved. No publication, deployment or cross-chat message was performed.

## Diagnosis and delivered behavior

An explicit-path invocation of `buildPortableData` against the shipped configuration failed before writing output: `ENOENT ... public\uploadedGeoJson`. `validateDataSourceDescriptor` returns either a safe path or a descriptor type token. The builder treated every non-static token as a file path, and treated `dataset` GeoJSON as CSV. The same mistake was reproduced for uploaded CSV and inline rows.

`loadDashboard.js` and its providers already accept embedded `geoJson`, `csvText` and inline rows. Bundle promotion deliberately keeps GeoJSON embedded while materializing uploaded CSV and authored images. The repair preserves this existing contract: uploaded sources produce corresponding portable payloads, inline/static sources remain in embedded configuration, and only path-backed sources are read from disk. Disk read, malformed JSON and invalid GeoJSON failures identify the source and relative asset path; existing bounded validation remains in force.

No runtime, promotion, source-entry schema, asset-storage or chart-version change was needed. The small [fixture](../tests/fixtures/fable-m0-sources.md) retains one complete shipped municipal feature and its source identity, with a native V3 chart and synthetic two-row CSV. The directly affected portable shipped-content test now uses the current Eldoria source and excludes static/inline descriptors from the separate dataset payload assertion. It checks exact CSV bytes and both complete shipped GeoJSON datasets.

PDPC conversion retains the generated GeoJSON/CSV payloads. Existing converter assertions still cover packaged images/fonts, paired ZIP/HTML machinery and the release-only Light-default transform. Converter, release pipeline and appearance behavior were unchanged; PDFs remain removed.

## Verification, 27 September 2026

Locked dependencies were installed offline in this worktree with `pnpm.cmd install --offline --frozen-lockfile`. During deterministic checks, `TEMP` and `TMP` pointed to `test-results/m0-temp` here. New fixture/launch scratch files also stay inside this worktree and are removed by their tests.

| Final selection | Result |
| --- | --- |
| `node --test --test-concurrency=1 --test-name-pattern='every retained tabular\|portable data' tests/datasetProfilesV3.test.js` | 3 passed |
| `node --test --test-concurrency=1 tests/portableSourceResolution.test.js tests/staticContentPortablePackage.test.js tests/geoJsonSourceEntry.test.js tests/pdpcSingleFileDeliverables.test.js` | 16 passed |
| `node --test --test-name-pattern='M0 copied portable source' tests/portableFlashdriveLaunch.test.js` | 1 passed, Chromium offline |
| `git diff --check` | Passed |

The first regressions demonstrated the descriptor-as-path defect before the production fix. A fixture schema omission was corrected before accepting the promotion regression. The browser harness initially failed before browser launch because Vite returned an array; the harness was corrected and its affected check passed. No product assertion was weakened. The final deterministic selection was not repeated after that harness-only correction.

The bounded browser check bundles the real `loadDashboard`, opens a copied self-contained HTML file in a fresh offline context, preflights fixture/source IDs and its load control, then verifies exact GeoJSON and CSV data, ready states, no HTTP requests and no browser errors. It verifies the portable loader boundary, not dashboard rendering, flash-drive server behavior, service-worker caching or Audience.

One independent, read-only scoped code review found no actionable issues. It checked descriptor validation before branching, embedded/disk-source handling, data preservation, errors and the direct fixture/consumer tests. No extra test reruns or release-readiness claim were requested by that review.

## Remaining work and limits

No unresolved implementation or environment blocker was found for this bounded repair. The wider M0.2 fixture/driver/failure inventory and M0.3 fresh-checkout Windows/Linux dev/portable/Cloudflare command matrix remain open. Full repository tests, production builds, source/static/PDPC aggregate browser suites, the older PS-04 main/Audience journey and actual generated release outputs were not run. The predecessor's other 27 September release evidence is retained without a new whole-release claim.

M0.4 code splitting and its single-file converter constraint, M0.5 root recovery, M0.6 CI and later milestone work remain with the authoritative roadmap. No roadmap completion checkboxes were changed. Main integration, pushing and deployment require their separate authorization and gates.
