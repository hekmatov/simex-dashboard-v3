# Chart Data System version 3 verification log

- **Recorded:** 2026-07-28
- **Verified implementation revision:** `5aa70d16bb27cc7dabff43a6ba2b7f16201400f3`
- **Base revision:** `8abca5e609a0d240943771da397f468fe51b6093`
- **Branch:** `codex/chart-wizard-revamp`
**Integration state:** Local-only. No push, pull request, merge, deployment, or
Cloudflare branch update was performed.

## Environment

| Component | Verified value |
| --- | --- |
| Operating system | Microsoft Windows NT `10.0.26200.0` |
| Node.js | `v24.14.0` |
| pnpm | `11.9.0` |
| Playwright | `1.61.1` |
| Playwright Chromium | Chrome for Testing `149.0.7827.55` |

The commands ran in the isolated worktree at
`C:\Users\hekma\Documents\SimEx Dashboard\.worktrees\simex-dashboard-v2\chart-wizard-revamp`.
The existing `showcase-home` worktree was not used for implementation or
verification.

## Results

| Check | Result |
| --- | --- |
| `pnpm test` | Passed: 750 tests, 0 failures, in 20.54s |
| `node node_modules\@playwright\test\cli.js test --reporter=line` | Passed: 40 Chromium tests in 20.0m; exit status 0; stderr empty |
| `pnpm build` | Passed: 697 modules transformed; production build completed in 14.93s |
| Series-style focused gate (seven test files) | Passed: 228 tests, 0 failures, in 1.71s |
| `node --test --test-name-pattern="version 2 bundles are rejected" tests\dashboardBundleV3.test.js` | Passed: the focused version-2 rejection test passed; 45 nonmatching tests were skipped |
| Quorum: `.\.venv\Scripts\python.exe -B -m pytest -p no:cacheprovider --basetemp C:\Users\hekma\AppData\Local\Temp\simex-quorum-series-style-final-20260728-173600 -q` | Passed: 985 tests in 86.55s |
| `git diff --check` | Passed with no whitespace errors |

The focused import check confirms that a version 2 bundle fails closed with the
user-facing message:

> This dashboard supports version 3 bundles only.

## Behavior evidence

| Capability | Primary implementation evidence | Primary test evidence |
| --- | --- | --- |
| Searchable, schema-driven chart discovery | `src/components/chart-authoring/ChartTypePicker.jsx`; `src/charting/schemas/chartSchemaRegistry.js` | `tests/chartAuthoringComponentsV3.test.js` |
| Existing, uploaded, and schema-limited manual sources | `src/components/chart-authoring/DataSourceStep.jsx`; `src/charting/data/profileDataset.js`; `src/charting/forms/manualData.js` | `tests/datasetProfilesV3.test.js`; `tests/manualChartDataV3.test.js` |
| Typed roles and conditional duplicate resolution | `src/components/chart-authoring/DataRolesStep.jsx`; `src/charting/forms/formModel.js`; `src/charting/data/transforms.js` | `tests/chartAuthoringComponentsV3.test.js`; `tests/chartDataPipelineV3.test.js` |
| Shared-renderer preview and readiness | `src/components/chart-authoring/StyleLayoutStep.jsx`; `src/components/chart-authoring/ChartPreview.jsx`; `src/components/charts/ChartView.jsx` | `tests/chartAuthoringComponentsV3.test.js`; Playwright authoring scenarios |
| Preview-gated, schema-applicable series colors and widths | `src/charting/presentation/seriesStyleContract.js`; `src/components/chart-authoring/SeriesColorsField.jsx`; axis, composition, and relationship render adapters | `tests/chartSchemasV3.test.js`; `tests/chartFormModelV3.test.js`; `tests/chartRenderingV3.test.js`; `tests/dashboardBundleV3.test.js`; Playwright pie and editor scenarios |
| Contextual editing and reset confirmation | `src/components/chart-authoring/ContextualTabs.jsx`; `src/components/chart-authoring/ChartEditorV3.jsx`; `src/components/chart-authoring/EditSessionActions.jsx` | `tests/chartAuthoringComponentsV3.test.js`; Playwright editing scenarios |
| Guided chart conversion | `src/components/chart-authoring/ChartConversionDialog.jsx`; `src/charting/forms/chartConversion.js` | `tests/chartConversionV3.test.js`; Playwright conversion scenarios |
| Exact, last-known, nearest, and permitted interpolation matching | `src/components/chart-authoring/TimeSyncSettingsField.jsx`; `src/charting/time/timeSyncModel.js`; `src/charting/time/temporalMatch.js` | `tests/timeSyncModelV3.test.js`; `tests/temporalMatchingV3.test.js`; Playwright matching-policy scenarios |
| Reusable Collection Display modes | `src/components/chart-authoring/CollectionSettingsField.jsx`; `src/charting/collection/collectionModel.js`; `src/components/collection/CollectionDisplay.jsx` | `tests/collectionModelV3.test.js`; `tests/collectionComponentsV3.test.js`; Playwright collection scenarios |
| Delta comparisons and provenance | `src/components/chart-authoring/DeltaComparisonField.jsx`; `src/charting/data/resolveDeltaComparison.js`; `src/charting/data/prepareTargetData.js` | `tests/deltaComparisonV3.test.js` |
| Ctrl-wheel chart zoom | `src/components/charts/ChartView.jsx`; `src/components/charts/ZoomGuard.jsx`; `src/components/charts/ImageChartView.jsx` | `tests/chartZoomV3.test.js`; Playwright dashboard and fullscreen scenarios |
| Strict config and bundle version 3 | `src/charting/config/chartConfigV3.js`; `src/charting/config/dashboardBundleV3.js`; `src/App.jsx` | `tests/dashboardBundleV3.test.js`; `tests/dashboardAppV3.test.js` |

### Final series-style review

Independent core and UI/integration reviews were repeated after remediation.
The final code reviews reported no remaining findings. Regression coverage
includes:

- field-associated width-range feedback;
- optional-leaf deletion and empty-object pruning;
- schema-mark-driven axis, composition, and relationship behavior; and
- fail-closed rejection of series appearance for renderers without a matching
  mark contract.

The stale native-picker cleanup during palette mutation or unmount was
confirmed by source review; the component test verifies that the palette
revision reaches each color field so that cleanup is triggered.

## Catalogue evidence

The fresh production build regenerated 32 tabular profiles, 36 embedded data
sources, and the Quorum chart catalogue containing 26 chart-type descriptors
and 40 configured-chart descriptors.

The generated profile, portable-data, and public catalogue files have no
tracked diff at the verified implementation revision.

| Property | Verified value |
| --- | --- |
| Catalogue contract version | `"2"` |
| Chart schema version | `3` |
| Raw catalogue length | `104,758` bytes |
| Raw catalogue SHA-256 | `51b5c2b673ed0a07552c9ec8430befcaa8b73ba781b31a956b6a57365132f25c` |
| Canonical catalogue digest | `97c690e1a5af92a30df24fb7642304fdcccfbb81237e41413b269e50e30406fc` |
| Dashboard semantic digest | `a132f88e41c5024d45c9dbef8e4c0a3e62ef8196813674ea091579ff18472cca` |

The built
`dist/integration/quorum-chart-catalogue.json`, public
`public/integration/quorum-chart-catalogue.json`, and the separate Quorum
fixture at
`C:\Users\hekma\Documents\SimEx Dashboard\quorum\quorum\.worktrees\chart-schema-v3-contract\tests\fixtures\dashboard\quorum-chart-catalogue.json`
are byte-identical. The consumer-side test commands, strict-boundary evidence,
and protocol-version isolation are recorded in Quorum's
`docs/verification/2026-07-26-dashboard-catalogue-v2.md`.

## E2E runner note

Initial foreground Playwright invocations were interrupted by the command
host's outer timeout, leaving their verified descendant server processes
running. Those exact process trees were identified and stopped before the
authoritative run. A one-test Chromium smoke run then passed. The final suite
used the same repository Playwright configuration and its single-worker
Chromium project, with output and exit status recorded outside the command
host's timeout. The final reviewed series-style source was built before that
run and remained frozen throughout it. The modified pie and editor persistence
journeys both passed. Playwright reported
`tests/e2e/chart-authoring-v3.spec.js` as the slow file at 11.3 minutes and
suggested parallelization as a future test-infrastructure optimization.
All configured local Playwright ports were closed after completion.

## Non-failing notices

Vite reports that three generated classic scripts cannot receive `type="module"`
injection and that the main JavaScript chunk is larger than 500 kB after
minification. The fresh build still exits successfully. The size notice should
remain visible as a future performance optimization item; it is not treated as
a functional verification failure.

In standalone mode, `GET /companion/bootstrap` can return 404 by design when no
Quorum companion is present. That network condition is not permission to
ignore browser failures: console errors and uncaught page errors are not
expected, and the companion browser scenarios assert that their captured error
lists remain empty.

## Isolation and approval gate

- The requested base revision is an ancestor of the feature branch.
- The implementation remains confined to
  `codex/chart-wizard-revamp`.
- The existing showcase landing-page worktree was not modified.
- The Quorum compatibility work remains on its separate local branch.
- No feature tip was pushed or integrated into a local or remote mainline.
- Publishing, pull-request creation, merging, deployment, and Cloudflare branch
  changes remain prohibited until the user explicitly approves the next
  integration phase.
