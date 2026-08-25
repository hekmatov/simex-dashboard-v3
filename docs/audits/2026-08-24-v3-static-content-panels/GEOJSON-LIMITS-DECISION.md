# GeoJSON Limits Decision

**Date:** 2026-08-25
**Decision status:** The calibration evidence at prerequisite HEAD `c28b59d` remains accepted. Its former ten-independent-metric admission interpretation is superseded by the user-directed lean amendment below. The four-gate policy in this record is the current governing design direction.
**Implementation status:** Planning evidence only. The limits authority, UI, transactions, and SCM-S15 remain proposed, unimplemented, and not verified.
**Spike:** `.planning/spikes/001-geojson-limit-calibration/README.md`

## Decision

The final implementation plan must centralize exactly four resource-admission checks in proposed `src/lib/geoJsonValidation.js`. That module owns the ordered frozen `GEOJSON_LIMITS` table and the sole importable derived key list, `SOURCE_GEOJSON_LIMIT_KEYS=Object.freeze(Object.keys(GEOJSON_LIMITS))`; test fixtures import it and never define a duplicate authority. Current `src/lib/loadDashboard.js::validateGeoJson` becomes a consumer rather than retaining a second table. Schema validity, direct-map compatibility, diagnostic information, and runtime scheduling remain separately typed outcomes.

For per-source limits, **normal** means every dimension is below its warning threshold; **warn** means at least one dimension reaches its warning threshold while none reaches a hard cap; **reject** means any dimension reaches a hard cap. Rejection occurs before durable commit and leaves the previous source/package/dashboard unchanged.

| Dimension | Normal | Warn and allow after explicit confirmation | Hard reject | Basis |
|---|---:|---:|---:|---|
| Encoded UTF-8 bytes | < 32,000,000 | 32,000,000–35,999,999 | ≥ 36,000,000 | The constrained 32 MB rung completed at 441.3 ms package-import p95/1,567 ms max long task. A fresh 35,999,997-byte rung completed at 543.4 ms/2,000 ms, reaching the predeclared hard knee. The 36 MB rejected boundary leaves 12 MB (25%) below the retained 48 MB resource failure. An 8 MB source is normal. |
| Feature count | < 2,000 | 2,000–7,999 | ≥ 8,000 | Constrained 4,000-feature interaction was 512 ms p95; 8,000 reached 1,828 ms with a 2,807 ms long task. |
| Total coordinate positions | < 20,000 | 20,000–49,999 | ≥ 50,000 | 20k package import was 610 ms p95; 50k reached 1,579 ms with a 3,864 ms long task. |
| Renderable geometry paths/fragments | < 2,000 | 2,000–3,999 | ≥ 4,000 | Directly supported by the distributed one-ring MultiPolygon ladder; conservative inference for other line/ring subpaths; does not apply to points. |

### Geometry types and nesting

- Supported coordinate geometry types are Point, MultiPoint, LineString, MultiLineString, Polygon, and MultiPolygon.
- GeometryCollection is structurally unsupported by the current runtime and hard-rejected. This is schema compatibility, not a numeric resource gate.
- Empty, malformed, non-FeatureCollection/non-Feature, unsupported-type, non-finite-coordinate, wrong-arity/nesting, too-short line/ring, and unclosed-ring inputs hard-reject as ordinary schema failures.
- Missing selected join fields and zero usable join coverage hard-block a directly dependent map as compatibility failures, not source admission.

`renderableFragments` counts LineString = 1; MultiLineString = number of LineString members; Polygon = number of exterior/interior rings; MultiPolygon = total exterior/interior rings across polygon members; Point, MultiPoint, and null geometry = 0. It never separately counts a polygon part, so a one-ring MultiPolygon with N members has N fragments, not 2N. The 2,000/4,000 threshold is directly supported by distributed one-ring MultiPolygon evidence and is a conservative inference for other line/ring subpaths; it does not apply to points.

### Reclassified historical metrics

- Maximum positions in one feature is an optional non-blocking concentration diagnostic/warning only.
- Separate parts and rings are not checks. Required coordinate nesting, arity, minima, and closure are schema rules; render load is represented only by `renderableFragments`.
- Maximum property keys per feature is an implementation concern. The manager property inspector must be searchable and virtualized/paginated or lazy; it never rejects a source.
- Encoded property-value bytes are a redundant diagnostic bounded by total encoded bytes and never an independent decision.
- Supported geometry nesting is schema validation. Arbitrary nested property data is traversed iteratively/lazily without a numeric admission cap.
- Structural-node count is informational only and never rejects. Avoid eager expansion of arbitrary property trees because the historical 50,000-container probe produced a 2,180 ms long task.
- Concurrent maps are runtime scheduling only and never source admission.

### Concurrent active maps

The runtime may keep at most four eager active map instances in one Build workspace:

- one or two: normal;
- three or four: warn/degraded context;
- more than four: do not create another eager instance; defer/lazy-render excess maps until an active slot releases.

This is a runtime concurrency cap, not a reason to reject or delete a valid committed source. The current dashboard has three map charts total and at most two on one page. In the constrained profile, two 20k-position maps reached 302 ms first usable/387 ms interaction p95; four reached 572/784 ms; six reached 820/1,122 ms and a 2,151 ms long task.

## Bounded checker contract

The single authority must:

1. inspect encoded byte length before JSON parse;
2. parse only candidates below the byte hard cap;
3. validate the supported geometry schema with an explicit stack, never recursively walking arbitrary property trees;
4. count exactly four admission facts: encoded bytes, Feature count, total coordinate positions, and renderable fragments;
5. define fragments as LineString = 1; MultiLineString = LineString-member count; Polygon = exterior/interior-ring count; MultiPolygon = total exterior/interior-ring count across members; Point, MultiPoint, and null geometry = 0. Never add a polygon-part count to ring count, so a one-ring MultiPolygon with N members has N fragments;
6. stop immediately when any of the four hard caps is reached, without completing preview work;
7. return separate `GeoJsonSchemaResult`, `GeoJsonAdmissionResult`, and direct-map compatibility result, with a lean summary containing feature count, geometry-type counts, bounding box, sorted property keys, encoded bytes, total positions, and renderable fragments; optional `maxPositionsPerFeature` is explicitly diagnostic;
8. keep property inspection searchable and virtualized/paginated or lazy, and never eagerly expand arbitrary nested property values during upload/summary;
9. use the same typed outcomes in manager upload, map authoring upload, replace/relink, package import, summary, preview, and persistence;
10. perform no durable write, sourceId mutation, profile publication, or map registration before admission, schema, and applicable compatibility success.

## Environment

| Profile | Chromium viewport | CPU | V8 heap evidence | Browser environment |
|---|---|---|---|---|
| build-1440 | 1440×900, DPR 1 | unthrottled | 1,174,405,120-byte reported heap limit | Chromium 149.0.7827.55, Windows 10/11 Win64, 16 logical CPUs |
| build-1024 | 1024×768, DPR 1 | unthrottled | 1,174,405,120-byte reported heap limit | same |
| constrained-1024 | 1024×768, DPR 1 | 4× CDP CPU throttle | launched with `--max-old-space-size=512`; 637,534,208-byte reported heap limit | same |

Each retained phase/rung has three samples; p95 in this bounded spike is the maximum observed sample. Main-thread long tasks come from Chromium PerformanceObserver. Used-JS-heap deltas are retained as directional evidence only because garbage collection makes individual deltas non-monotonic; serialized bundle/file bytes are exact.

## Legitimate corpus and historical diagnostics

The retained columns below are calibration observations, not a list of admission gates. Under the current policy, the Polygon/MultiPolygon ring totals are the corpus `renderableFragments`; the other removed metrics remain historical diagnostics only.

| File | Bytes | Features | Positions | Max positions/feature | Parts | Rings | Max own property keys/feature | Structural nodes | Types |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| gemeente_2020.geojson | 191,819 | 355 | 6,438 | 75 | 360 | 360 | 6 | 8,230 | Polygon/MultiPolygon |
| gemeente_2021.geojson | 193,816 | 352 | 6,630 | 87 | 357 | 357 | 6 | 8,407 | Polygon/MultiPolygon |
| gemeente_2026.geojson | 186,955 | 342 | 6,458 | 58 | 350 | 350 | 6 | 8,194 | Polygon/MultiPolygon |
| netherlands-provinces.geojson | 134,969 | 12 | 1,635 | 196 | 23 | 27 | 7 | 1,728 | Polygon/MultiPolygon |

Every legitimate file is normal under all four governing gates. The largest encoded source is 193,816 bytes, maximum Feature count is 355, maximum total positions is 6,630, and maximum renderable fragments is 360. Historical diagnostic and runtime-concurrency observations remain retained but do not add admission gates.

## Measurements and knees

Worst p95 across the legitimate corpus:

| Profile | Read | Parse | Validate | Summary | Package export | Package import | First usable map | Interaction | Max long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| build-1440 | 12 ms | 1 ms | 12 ms | 2.9 ms | 83.7 ms | 47.9 ms | 53.3 ms | 41.6 ms | 197 ms |
| build-1024 | 13 ms | 1 ms | 13.2 ms | 2.8 ms | 77.9 ms | 50.7 ms | 55.1 ms | 41.7 ms | 196 ms |
| constrained-1024 | 19.2 ms | 5 ms | 75.4 ms | 16.1 ms | 462.6 ms | 297.4 ms | 412.3 ms | 270.3 ms | 1,244 ms |

The retained decisive constrained knees for governing gates remain 8,000 features and 50,000 total positions. The table also preserves historical diagnostic and runtime-scheduling evidence; rows other than encoded bytes and distributed fragments no longer establish admission gates.

| Corrected dimension | Lower/normal evidence | Warning/hard evidence |
|---|---|---|
| Encoded bytes (governing); encoded property values (historical diagnostic) | 8 MB property value: 114.5 ms package import; 32 MB encoded: 441.3 ms/1,567 ms max long task; 32 MB property value: 426.1 ms/1,483 ms | 36 MB encoded: 543.4 ms package import/2,000 ms max long task/216,171,884-byte max heap delta; fresh 48 MB encoded failed to complete within 90 s and reached 923,045,888-byte Chromium working set |
| Distributed one-ring MultiPolygon fragments (governing) | 2,000 across 500 features: 453.9 ms package import/1,588 ms max long task | 4,000: 794.9 ms/2,097 ms; 8,000: 1,752 ms/4,605 ms |
| Whole-document structural nodes (historical diagnostic only) | 30,000: 478.6 ms package import/1,086 ms max long task; 40,000: 648.8/1,459 ms | 50,000: 860 ms/2,180 ms; this motivates lazy/iterative property handling, not rejection |
| Maximum own keys per feature (historical UI diagnostic only) | 512: 16.2 ms package import | 1,000: 19.8 ms; manager virtualization/pagination is the response, not rejection |

Bytes still do not decide geometry complexity by themselves. The 36 MB constrained rung completed but reached the predeclared 2,000 ms hard knee, so 36 MB is the rejected boundary and 32 MB is the highest fully measured allowed rung. That boundary leaves 12 MB (25%) below the observed 48 MB constrained resource failure and remains more than 185× the largest legitimate source.

## Path substitutions

The proposed Source Content Manager, GeoJSON detail preview, and identity-preserving replacement transaction do not exist. The spike therefore used these nearest current owners without creating the future UI:

| Proposed path | Current exercised substitute |
|---|---|
| Manager upload/read | browser fetch/TextEncoder plus current `validateGeoJson` |
| GeoJSON summary/preview | bounded spike summary plus current ECharts registration/render |
| Replacement compatibility | current validation plus bounded selected-property coverage scan; join coverage remained a replacement outcome |
| Persistence/reload | stable stringify/SHA-256 plus IndexedDB write/read/parse |
| Package export/import | current `prepareDashboardPackageExport`, `serializeDashboardBundle`, and `parseDashboardPackageCandidate` |
| Live map | current Biomedical **Population and municipal infection burden** focus journey plus ECharts harness pan/zoom/resize |

These substitutions calibrate the technical guardrail but do not implement or verify manager composition or SCM-S15.

## Rollback and failure evidence

- All 333 retained main-ladder samples preserved the original candidate after injected empty-feature rejection.
- The focused rollback file records 9/9 `rollbackPreserved` and 9/9 `packageRollbackPreserved` observations across the three profiles.
- All 54 completed master-correction samples recorded `rollbackPreserved = 1` and `packageRollbackPreserved = 1`; the intentionally stopped 48 MB resource-failure rung published nothing.
- GeometryCollection runtime failure remained isolated and did not mutate its candidate.
- The initial invalid disposable package fixture and excess MultiPolygon nesting were corrected before measurements were accepted; both are recorded in the spike investigation trail.

## Evidence

- Raw main ladder: `.planning/spikes/001-geojson-limit-calibration/evidence/measurements.json`
- Raw depth follow-up: `.planning/spikes/001-geojson-limit-calibration/evidence/nesting-measurements.json`
- Raw per-type follow-up: `.planning/spikes/001-geojson-limit-calibration/evidence/geometry-type-measurements.json`
- Raw rollback probe: `.planning/spikes/001-geojson-limit-calibration/evidence/rollback-measurements.json`
- Master-correction encoded/property-value, distributed-parts/rings, per-feature-key, and structural-node samples: `.planning/spikes/001-geojson-limit-calibration/evidence/master-correction-*.json`
- Second master-correction byte-margin samples: `.planning/spikes/001-geojson-limit-calibration/evidence/master-correction-byte-margin-36m.json`
- Master-correction 48 MB resource-failure checkpoint: `.planning/spikes/001-geojson-limit-calibration/evidence/master-correction-resource-failure.md`
- Inspected checkpoints: `.planning/spikes/001-geojson-limit-calibration/evidence/browser-checkpoints.md`

The raw evidence preserves historical `parts`, `rings`, source-union `propertyKeyCount`, per-feature concentration, property-byte, depth, and structural-node diagnostics. They are explicitly superseded as independent admission checks by the four-gate policy; raw measurements are not rewritten. No retained timing, feature, coordinate, geometry-type, concurrency, viewport, or rollback observation is discarded.

## Planning consequence

The V3 Design master accepted `c28b59d` as historical calibration evidence; the user subsequently superseded its ten-metric policy interpretation with this lean four-gate amendment. No production task or test may restore an obsolete independent gate or substitute different four-gate constants without a recorded decision amendment. This design correction does not promote SCM-S15 or any other amendment row: production remains proposed, unimplemented, and not verified.
