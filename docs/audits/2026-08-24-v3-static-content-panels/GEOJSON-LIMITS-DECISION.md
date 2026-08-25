# GeoJSON Limits Decision

**Date:** 2026-08-25
**Decision status:** Corrected calibrated technical guardrail submitted for renewed V3 Design master review. Master review did not accept commit `526003d`; the bounded correction below resolves its four findings. No legitimate-project exclusion or material user-level UX tradeoff was found.
**Implementation status:** Planning evidence only. The limits authority, UI, transactions, and SCM-S15 remain proposed, unimplemented, and not verified.
**Spike:** `.planning/spikes/001-geojson-limit-calibration/README.md`

## Decision

The final implementation plan must centralize the following limits in one proposed authority, `src/lib/geoJsonValidation.js`, which will own bounded inspection and structural/resource decisions. Current `src/lib/loadDashboard.js::validateGeoJson` must become a consumer of that authority rather than retain a second limit table.

For per-source limits, **normal** means every dimension is below its warning threshold; **warn** means at least one dimension reaches its warning threshold while none reaches a hard cap; **reject** means any dimension reaches a hard cap. Rejection occurs before durable commit and leaves the previous source/package/dashboard unchanged.

| Dimension | Normal | Warn and allow after explicit confirmation | Hard reject | Basis |
|---|---:|---:|---:|---|
| Encoded UTF-8 bytes | < 32,000,000 | 32,000,000–47,999,999 | ≥ 48,000,000 | Fresh constrained 16/24/32 MB rungs completed; 32 MB was 441.3 ms package-import p95 with a 1,567 ms max long task. A fresh 48 MB rung did not complete within 90 seconds and reached 923,045,888 bytes Chromium working set. An 8 MB source is normal. |
| Feature count | < 2,000 | 2,000–7,999 | ≥ 8,000 | Constrained 4,000-feature interaction was 512 ms p95; 8,000 reached 1,828 ms with a 2,807 ms long task. |
| Total coordinate positions | < 20,000 | 20,000–49,999 | ≥ 50,000 | 20k package import was 610 ms p95; 50k reached 1,579 ms with a 3,864 ms long task. |
| Positions in one feature | < 20,000 | 20,000–49,999 | ≥ 50,000 | 20k package import was 590 ms p95; 50k reached 1,556 ms with a 3,680 ms long task. |
| Geometry parts | < 2,000 | 2,000–3,999 | ≥ 4,000 | A realistic 500-feature MultiPolygon distribution at 2,000 parts completed with a 1,588 ms max long task; 4,000 crossed the hard-knee rule at 2,097 ms. The former single-feature 2,000-ring case remains allowed. |
| Polygon rings | < 2,000 | 2,000–3,999 | ≥ 4,000 | Counted independently from parts but calibrated on the same one-ring-per-part distribution; 8,000 reached 1,752 ms package import and a 4,605 ms max long task. Current maximum is 360. |
| Maximum own property keys on one feature | < 512 | 512–999 | ≥ 1,000 | Exact fixtures report 512 and 1,000 `Object.keys(feature.properties).length`; 1,000 was 19.8 ms package-import p95. This is a bounded metadata ceiling, not a source-wide union of names. Current maximum is seven. |
| Total encoded property-value bytes | < 32,000,000 | 32,000,000–47,999,999 | ≥ 48,000,000 | Exactly 32 MB completed at 426.1 ms package-import p95, 1,483 ms max long task, and 224,054,934-byte max heap delta. The 48 MB encoded resource failure supplies the hard safety ceiling because property values are a subset of encoded source bytes. |
| Traversal/object depth | < 16 | 16–31 | ≥ 32 | Current corpus depth is five. The iterative checker is capped well below the verified depth-64 probe so adversarial inspection remains bounded. |
| Whole-document structural nodes | < 30,000 | 30,000–49,999 | ≥ 50,000 | 40,000 nodes completed at 648.8 ms package-import p95/1,459 ms max long task; 50,000 reached 860 ms/2,180 ms. Current corpus maximum is 8,407. |

### Geometry types and nesting

- Supported coordinate geometry types are Point, MultiPoint, LineString, MultiLineString, Polygon, and MultiPolygon.
- GeometryCollection is structurally unsupported and hard-rejected at any depth. Current validation accepted depth 1–64, but every isolated Chromium profile failed the actual ECharts map path at depth 1. It is not a warning-range performance case.
- Empty, malformed, non-FeatureCollection, non-finite-coordinate, and otherwise structurally invalid inputs retain their existing hard-reject semantics.

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
3. use an iterative stack, never recursive descent, with the exact 50,000-node hard budget and depth-32 hard budget;
4. define **whole-document structural nodes** as every non-null object or array container reachable from the parsed root: the FeatureCollection object, features array, every Feature/properties/geometry object, GeometryCollection geometries array, every coordinate nesting array and coordinate-position array, plus any nested object/array inside property values. Scalar strings, numbers, booleans, and null do not add nodes; their memory exposure remains bounded by encoded source/property-value bytes. Increment before expanding a container and stop when count reaches 50,000;
5. define **geometry parts** as one part for Point, LineString, or Polygon and one part per coordinate member of MultiPoint, MultiLineString, or MultiPolygon. Define **rings** as each linear ring array in Polygon/MultiPolygon. GeometryCollection is rejected before part/ring expansion;
6. define **maximum own property keys on one feature** as the maximum `Object.keys(feature.properties).length` over all Features. Repeated names on different features count independently for their feature and are not unioned across the source. Define total encoded property-value bytes as the sum of UTF-8 byte lengths of `JSON.stringify(value)` for every own property value;
7. count features, total positions, per-feature positions, parts, rings, per-feature keys, encoded property values, depth, and structural nodes in the same bounded traversal;
8. stop immediately when any hard cap is reached, without completing summary or preview work;
9. return typed normal/warning/hard facts used consistently by manager upload, map authoring upload, replace/relink, package import, summary, preview, and persistence;
10. keep join-property existence and join-coverage compatibility outside the resource-limit result;
11. perform no durable write, sourceId mutation, profile publication, or map registration before hard-cap/structural success.

## Environment

| Profile | Chromium viewport | CPU | V8 heap evidence | Browser environment |
|---|---|---|---|---|
| build-1440 | 1440×900, DPR 1 | unthrottled | 1,174,405,120-byte reported heap limit | Chromium 149.0.7827.55, Windows 10/11 Win64, 16 logical CPUs |
| build-1024 | 1024×768, DPR 1 | unthrottled | 1,174,405,120-byte reported heap limit | same |
| constrained-1024 | 1024×768, DPR 1 | 4× CDP CPU throttle | launched with `--max-old-space-size=512`; 637,534,208-byte reported heap limit | same |

Each retained phase/rung has three samples; p95 in this bounded spike is the maximum observed sample. Main-thread long tasks come from Chromium PerformanceObserver. Used-JS-heap deltas are retained as directional evidence only because garbage collection makes individual deltas non-monotonic; serialized bundle/file bytes are exact.

## Legitimate corpus

| File | Bytes | Features | Positions | Max positions/feature | Parts | Rings | Max own property keys/feature | Structural nodes | Types |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| gemeente_2020.geojson | 191,819 | 355 | 6,438 | 75 | 360 | 360 | 6 | 8,230 | Polygon/MultiPolygon |
| gemeente_2021.geojson | 193,816 | 352 | 6,630 | 87 | 357 | 357 | 6 | 8,407 | Polygon/MultiPolygon |
| gemeente_2026.geojson | 186,955 | 342 | 6,458 | 58 | 350 | 350 | 6 | 8,194 | Polygon/MultiPolygon |
| netherlands-provinces.geojson | 134,969 | 12 | 1,635 | 196 | 23 | 27 | 7 | 1,728 | Polygon/MultiPolygon |

Every legitimate file is normal under every calibrated source limit. The largest structural-node count is 8,407 against warning 30,000/hard 50,000; the largest part/ring counts are 360 against warning 2,000/hard 4,000; and the largest encoded source is 193,816 bytes against warning 32 MB/hard 48 MB. Current page concurrency is also normal at a maximum of two.

## Measurements and knees

Worst p95 across the legitimate corpus:

| Profile | Read | Parse | Validate | Summary | Package export | Package import | First usable map | Interaction | Max long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| build-1440 | 12 ms | 1 ms | 12 ms | 2.9 ms | 83.7 ms | 47.9 ms | 53.3 ms | 41.6 ms | 197 ms |
| build-1024 | 13 ms | 1 ms | 13.2 ms | 2.8 ms | 77.9 ms | 50.7 ms | 55.1 ms | 41.7 ms | 196 ms |
| constrained-1024 | 19.2 ms | 5 ms | 75.4 ms | 16.1 ms | 462.6 ms | 297.4 ms | 412.3 ms | 270.3 ms | 1,244 ms |

The retained decisive constrained knees remain 8,000 features, 50,000 total/single-feature positions, and six simultaneous 20k-position maps. The master correction added these focused results without rerunning them:

| Corrected dimension | Lower/normal evidence | Warning/hard evidence |
|---|---|---|
| Encoded/property-value bytes | 8 MB property value: 114.5 ms package import; 16/24 MB encoded: 221.8/336.8 ms | 32 MB encoded: 441.3 ms/1,567 ms max long task; 32 MB property value: 426.1 ms/1,483 ms; fresh 48 MB encoded failed to complete within 90 s and reached 923,045,888-byte Chromium working set |
| Distributed parts/rings | 2,000 across 500 features: 453.9 ms package import/1,588 ms max long task | 4,000: 794.9 ms/2,097 ms; 8,000: 1,752 ms/4,605 ms |
| Whole-document structural nodes | 30,000: 478.6 ms package import/1,086 ms max long task; 40,000: 648.8/1,459 ms | 50,000: 860 ms/2,180 ms |
| Maximum own keys per feature | 512: 16.2 ms package import | 1,000: 19.8 ms; bounded semantic ceiling retained |

Bytes still do not decide geometry complexity by themselves, but the observed 48 MB constrained resource failure now supplies a demonstrably non-product-restrictive byte/property safety ceiling. The 32 MB successful rung is the tested margin below it and is more than 165× the largest legitimate source.

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
- All 51 completed master-correction samples recorded `rollbackPreserved = 1` and `packageRollbackPreserved = 1`; the intentionally stopped 48 MB resource-failure rung published nothing.
- GeometryCollection runtime failure remained isolated and did not mutate its candidate.
- The initial invalid disposable package fixture and excess MultiPolygon nesting were corrected before measurements were accepted; both are recorded in the spike investigation trail.

## Evidence

- Raw main ladder: `.planning/spikes/001-geojson-limit-calibration/evidence/measurements.json`
- Raw depth follow-up: `.planning/spikes/001-geojson-limit-calibration/evidence/nesting-measurements.json`
- Raw per-type follow-up: `.planning/spikes/001-geojson-limit-calibration/evidence/geometry-type-measurements.json`
- Raw rollback probe: `.planning/spikes/001-geojson-limit-calibration/evidence/rollback-measurements.json`
- Master-correction encoded/property-value, distributed-parts/rings, per-feature-key, and structural-node samples: `.planning/spikes/001-geojson-limit-calibration/evidence/master-correction-*.json`
- Master-correction 48 MB resource-failure checkpoint: `.planning/spikes/001-geojson-limit-calibration/evidence/master-correction-resource-failure.md`
- Inspected checkpoints: `.planning/spikes/001-geojson-limit-calibration/evidence/browser-checkpoints.md`

The original `measurements.json` preserves its historical `parts` and source-union `propertyKeyCount` diagnostics. Those two labels are not the corrected contract and are superseded by the final generator, correction JSON, and recalculated legitimate-corpus table above. No retained timing, feature, coordinate, geometry-type, concurrency, viewport, or rollback result is reclassified.

## Planning consequence

The corrected calibrated guardrail does not require a user decision: it excludes no known legitimate fixture and does not introduce a material user-level UX tradeoff. It is submitted for renewed master review. No production task or test may substitute different constants without a recorded limits-decision amendment, and completing this record does not promote SCM-S15 or any other amendment row.
