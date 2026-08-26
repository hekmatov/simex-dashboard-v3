# Task 10 Report — CSV Manager Add and Six-Stage Authoring

## Status

DONE for the accepted Task 10 slice. Builder-owned CSV Add, chart-draft CSV registration, catalogue detail, and the exact six-stage workflow are implemented and verified through named Journey D. CSV replacement/temporal warnings, GeoJSON management, and cell editing remain untouched and unclaimed.

## RED and GREEN

- Exact RED preceded production: **23 passed / 6 failed / 0 skipped / 0 todo**. Intended failures identified absent uploaded-CSV entry/draft/download/filter owners and `DataSourcePicker.jsx`. Two cases also exposed inherited JSX/Vite test-loader constraints; the loader was brought in line with the current JSX source before evaluating Task 10 behavior.
- Focused core GREEN reached **43/43**, and the chart-authoring selection reached **68/68** after replacing stale four-tab assertions with the accepted exact six-stage contract.
- Fresh exact deterministic command: `node --test tests/sourceEntrySchema.test.js tests/contentDraftTransaction.test.js tests/contentDetail.test.js tests/sourceViewer.test.js tests/sourceViewerSort.test.js tests/wizardDraftV3.test.js tests/chartAuthoringComponentsV3.test.js` — **116 passed / 0 failed / 0 skipped / 0 todo**, 2.763 s.
- Exact named command, without a literal separator: `pnpm.cmd test:e2e tests/e2e/source-content-csv.spec.js --project=chromium --grep "Journey D — CSV upload through six stages then catalogue management"` — **1 passed**, 39.1 s test time and 41.9 s total.

## Implemented boundary

- Manager Add parses with the existing Papa owner, profiles with the existing dataset profiler, previews five rows, permits an editable display label, warns on matching fingerprints without deduplication, and publishes only after explicit **Add to dashboard**.
- One atomic candidate adds the uploaded descriptor, dataset profile, and builder-owned SourceEntry. A manager-created unused identity remains deliberate and durable across reload.
- Chart upload is owned by `chart`, remains draft-only before completion, and publishes its source descriptor/profile/entry together with the finalized chart and reviewed placement. Cancel/discard/unmount/failure paths leave the durable CSV inventory unchanged.
- `DataSourcePicker` lists only eligible managed CSV identities plus draft-owned upload. Dashboard-owned generated/intermediate sources do not enter the picker. The exact stage IDs/order remain Destination, Chart type, Data source, Map and prepare data, Configure chart, Review and create.
- CSV detail reuses the existing viewer/parser/filter authority for profile, origin, health, read-only searchable preview, usage dependency, and permitted download. It exposes no cell mutation.
- The manager catalogue wrapper owns bounded scrolling after the Add intake was introduced, keeping rows reachable at both accepted viewports.

## Journey D evidence

- Build 1440×900 proved manager Cancel leaves the exact CSV inventory unchanged, explicit Add produces an unused identity, reload retains it, and a repeated matching upload warns while retaining separate-identity semantics.
- A chart-flow upload remained absent from the durable inventory until completion; explicit chart discard restored the exact prior inventory. A fresh upload completed all six stages and atomically added exactly one descriptor/profile/entry and one chart.
- Reopened catalogue detail showed the three-row profile, named chart dependency, read-only preview search reducing to one matching row, and the original uploaded filename on Download CSV. Closing returned focus to Source content.
- Build 1024×768 after reload retained the exact inventory, bounded horizontal geometry, reachable source row/detail, and tablet Back navigation.
- Deterministic tests own exhaustive validation/persistence rollback and exact Close/Escape/mode-departure/unmount/disposal inventories; the browser journey owns representative cancellation, focus, dependency, reload, and viewport fidelity.

## Row disposition

- **SCM-R04:** Passing for the complete named Journey D and exact six-stage CSV upload/select/manage contract.
- **SCM-S04:** CSV classification/visibility and picker branch Passing; the cross-kind row remains Partial until GeoJSON manager/browser coverage.
- **SCM-C04:** Media and CSV detail branches Passing; the row remains Partial until GeoJSON detail/action coverage.
- **SCM-C05:** Media and CSV picker branches Passing; the row remains Partial until GeoJSON selector coverage.

No replacement/relink, temporal-warning, GeoJSON manager, cell editing, derivative mutation, new parsing/profile authority, parent `progress.md`, generated output, dependency, full build, full suite, merge, push, or deployment is included.
