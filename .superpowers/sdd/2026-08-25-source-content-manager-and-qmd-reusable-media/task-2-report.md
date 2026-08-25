# Task 2 report — Bounded GeoJSON authority and canonical summary

## Status

DONE — engine scope only. Manager composition and real-use remain unverified.

- BASE: `f81239ba288816603f3c6db14fc6b4a00141d5b9`
- Prerequisite commit: `454f6e9` (`fix(content): reconcile V5 semantic boundary consumers`)
- Task commit / HEAD: the commit containing this report, with subject `feat(content): centralize bounded GeoJSON validation`
- Branch: `codex/static-content-panels-implementation`

## RED / GREEN

- Exact RED command: `node --test tests/geoJsonValidation.test.js tests/geoJsonSourceEntry.test.js tests/progressiveDashboardLoad.test.js tests/chartSourceProfile.test.js tests/dashboardSemanticBoundary.test.js tests/datasetProfilesV3.test.js tests/dataServiceFoundation.test.js`
- RED result: 72 pass / 11 fail. The two intended Task 2 failures were missing-module failures for the new validation and source-entry authorities. The other node-reported failures were pre-existing V5/tracked-data boundary drift, including one failing parent suite.
- Controller ruling cost: two bounded prerequisite production fixes plus expectation reconciliation were separated before Task 2. Focused prerequisite checks passed 73/73 semantic-boundary tests and 4/4 selected dataset/accessor tests.
- Exact GREEN result: 124 pass / 0 fail / 0 skipped / 0 todo.

## Changed files

- Authority: `src/lib/geoJsonValidation.js`
- Canonical managed-source projection: `src/content-library/geoJsonSourceEntry.js`
- Current delegation: `src/lib/loadDashboard.js`, `src/data/sourceRequest.js`, `src/data/dashboardSourceProviders.js`
- Task 2 fixtures/tests: `tests/helpers/geoJsonBoundaryFixtures.js`, `tests/geoJsonValidation.test.js`, `tests/geoJsonSourceEntry.test.js`, plus binding GeometryCollection/error delegation updates in `tests/datasetProfilesV3.test.js` and `tests/dataServiceFoundation.test.js`
- Evidence/status: this report, progress ledger, plan execution record, GeoJSON limits decision, SCM-S15 fidelity row, and SCM-SP19 security row

## Four-gate contract

The sole ordered admission keys are `encodedBytes`, `features`, `totalPositions`, and `renderableFragments`. Their frozen `{normalMax,warningMin,hardMin}` triples are respectively `31999999/32000000/36000000`, `1999/2000/8000`, `19999/20000/50000`, and `1999/2000/4000`. `SOURCE_GEOJSON_LIMIT_KEYS` is frozen and derived from `Object.keys(GEOJSON_LIMITS)`. `GEOJSON_CONCURRENT_MAPS={normalMax:2,eagerMax:4}` remains separate scheduling state.

Fragments count LineString as one, MultiLineString members, Polygon rings, and MultiPolygon rings across members. Point, MultiPoint, and null geometry count zero. Polygon parts are never added separately, so one-ring MultiPolygon members are not double-counted.

## Delegations and rulings

- `loadDashboard.validateGeoJson` retains the legacy throwing boundary while delegating decisions to the typed authority.
- Tracked, uploaded, and portable/package providers use the same typed outcome before exposing data.
- Managed tracked, uploaded-session, and embedded package descriptors normalize to one source-entry/summary projection without `datasetProfiles`.
- Schema and selected-join compatibility remain distinct from resource admission. GeometryCollection is an ordinary schema rejection. Join-field absence and zero usable coverage are compatibility results.
- High top-level property-key count, deep nested property values, high container count, and `maxPositionsPerFeature` do not become admission gates. Nested property validation is iterative; the summary collects only top-level key names and does not recursively project values.

## Evidence boundary and residuals

SCM-S15 engine evidence is updated to targeted deterministic passing only. The report does not claim manager UI, package-wide replacement validation, publication/rollback, shared map-budget composition, mounted preview/runtime use, browser geometry, or review cleanliness. Those remain later-task residuals.

## Review fix round

- Corrections BASE: `8e2db75be2506024b46c39fa70512619e0ef6058`
- Fix commit / HEAD: the commit containing this report, with subject `fix(content): harden bounded GeoJSON loading`
- Focused RED: 10 tests / 4 pass / 6 fail. The failures exposed tracked transport parsing before admission, recursive size measurement on 20,000-deep property data, runtime normalization before descriptor-safe inspection, the runtime's incidental cycle error, and the first shared-reference fixture's unrelated profile/loading setup. The cycle rejection regression was then added without executing the known non-terminating old path.
- Focused GREEN: 11 tests / 11 pass / 0 fail, including deep property data, typed cycle rejection, shared-DAG acceptance, tracked pre-parse rejection, runtime accessor safety, exact dashboard cycle errors, and shared dashboard references.
- Exact Task 2 GREEN: 129 tests / 129 pass / 0 fail / 0 skipped / 0 todo.

The tracked GeoJSON provider now receives raw response text, delegates it to the central four-gate authority, and parses only an accepted payload. Object-input byte measurement and property inspection are iterative and active-path cycle-safe, while repeated references outside the active path remain admissible. Runtime dashboard normalization performs the same descriptor-safe, cycle-safe structural preflight before any version property read or clone. The dashboard semantic-boundary assertion now requires the exact typed cycle-guard message and independently accepts a shared non-cyclic reference.

This bounded correction changed only `src/data/dashboardSourceProviders.js`, `src/lib/geoJsonValidation.js`, `src/lib/loadDashboard.js`, the four focused Task 2 test files, and this report. The parent-owned `progress.md` change was preserved unstaged. No Task 3 behavior, manager work, full suite, build, browser check, composition claim, real-use claim, or review-clean claim was added.
