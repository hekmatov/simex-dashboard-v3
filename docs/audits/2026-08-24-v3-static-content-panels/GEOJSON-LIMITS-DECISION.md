# GeoJSON Limits Decision

**Date:** 2026-08-25
**Decision status:** Calibrated technical guardrail submitted for V3 Design master review. No legitimate-project exclusion or material user-level UX tradeoff was found.
**Implementation status:** Planning evidence only. The limits authority, UI, transactions, and SCM-S15 remain proposed, unimplemented, and not verified.
**Spike:** `.planning/spikes/001-geojson-limit-calibration/README.md`

## Decision

The final implementation plan must centralize the following limits in one proposed authority, `src/lib/geoJsonValidation.js`, which will own bounded inspection and structural/resource decisions. Current `src/lib/loadDashboard.js::validateGeoJson` must become a consumer of that authority rather than retain a second limit table.

For per-source limits, **normal** means every dimension is below its warning threshold; **warn** means at least one dimension reaches its warning threshold while none reaches a hard cap; **reject** means any dimension reaches a hard cap. Rejection occurs before durable commit and leaves the previous source/package/dashboard unchanged.

| Dimension | Normal | Warn and allow after explicit confirmation | Hard reject | Basis |
|---|---:|---:|---:|---|
| Encoded UTF-8 bytes | < 4,000,000 | 4,000,000–7,999,999 | ≥ 8,000,000 | 4 MB remained inexpensive; 8 MB produced 350 ms constrained long tasks. Bytes remain only one independent gate. |
| Feature count | < 2,000 | 2,000–7,999 | ≥ 8,000 | Constrained 4,000-feature interaction was 512 ms p95; 8,000 reached 1,828 ms with a 2,807 ms long task. |
| Total coordinate positions | < 20,000 | 20,000–49,999 | ≥ 50,000 | 20k package import was 610 ms p95; 50k reached 1,579 ms with a 3,864 ms long task. |
| Positions in one feature | < 20,000 | 20,000–49,999 | ≥ 50,000 | 20k package import was 590 ms p95; 50k reached 1,556 ms with a 3,680 ms long task. |
| Parts | < 500 | 500–1,999 | ≥ 2,000 | 2,000 measured safely but reached 364 ms package import and a 961 ms long task on the constrained profile; current maximum is 16. |
| Rings | < 500 | 500–1,999 | ≥ 2,000 | Same independent ladder; current maximum is 360, leaving warning and hard-cap margin. |
| Distinct/property keys per feature | < 512 | 512–999 | ≥ 1,000 | 1,000 remained measurable but is the bounded tested ceiling; current maximum is seven. Larger unmeasured metadata surfaces are rejected rather than extrapolated. |
| Total encoded property-value bytes | < 2,000,000 | 2,000,000–3,999,999 | ≥ 4,000,000 | 4 MB produced a 201 ms constrained long task and duplicates the byte budget if unchecked; current flat values are far below warning. |
| Traversal/object depth | < 16 | 16–31 | ≥ 32 | Current corpus depth is five. The iterative checker is capped well below the verified depth-64 probe so adversarial inspection remains bounded. |

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
3. use an iterative stack, never recursive descent, with explicit node and depth budgets;
4. count features, total positions, per-feature positions, parts, rings, keys, and encoded property values in one traversal;
5. stop immediately when any hard cap is reached, without completing summary or preview work;
6. return typed normal/warning/hard facts used consistently by manager upload, map authoring upload, replace/relink, package import, summary, preview, and persistence;
7. keep join-property existence and join-coverage compatibility outside the resource-limit result;
8. perform no durable write, sourceId mutation, profile publication, or map registration before hard-cap/structural success.

## Environment

| Profile | Chromium viewport | CPU | V8 heap evidence | Browser environment |
|---|---|---|---|---|
| build-1440 | 1440×900, DPR 1 | unthrottled | 1,174,405,120-byte reported heap limit | Chromium 149.0.7827.55, Windows 10/11 Win64, 16 logical CPUs |
| build-1024 | 1024×768, DPR 1 | unthrottled | 1,174,405,120-byte reported heap limit | same |
| constrained-1024 | 1024×768, DPR 1 | 4× CDP CPU throttle | launched with `--max-old-space-size=512`; 637,534,208-byte reported heap limit | same |

Each retained phase/rung has three samples; p95 in this bounded spike is the maximum observed sample. Main-thread long tasks come from Chromium PerformanceObserver. Used-JS-heap deltas are retained as directional evidence only because garbage collection makes individual deltas non-monotonic; serialized bundle/file bytes are exact.

## Legitimate corpus

| File | Bytes | Features | Positions | Max positions/feature | Parts | Rings | Property keys | Types |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| gemeente_2020.geojson | 191,819 | 355 | 6,438 | 75 | 10 | 360 | 6 | Polygon/MultiPolygon |
| gemeente_2021.geojson | 193,816 | 352 | 6,630 | 87 | 10 | 357 | 6 | Polygon/MultiPolygon |
| gemeente_2026.geojson | 186,955 | 342 | 6,458 | 58 | 16 | 350 | 6 | Polygon/MultiPolygon |
| netherlands-provinces.geojson | 134,969 | 12 | 1,635 | 196 | 16 | 27 | 7 | Polygon/MultiPolygon |

Every legitimate file is normal under every calibrated source limit. The closest margin is rings: the corpus maximum is 360, below the warning threshold of 500 and well below the hard cap of 2,000. Current page concurrency is also normal at a maximum of two.

## Measurements and knees

Worst p95 across the legitimate corpus:

| Profile | Read | Parse | Validate | Summary | Package export | Package import | First usable map | Interaction | Max long task |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| build-1440 | 12 ms | 1 ms | 12 ms | 2.9 ms | 83.7 ms | 47.9 ms | 53.3 ms | 41.6 ms | 197 ms |
| build-1024 | 13 ms | 1 ms | 13.2 ms | 2.8 ms | 77.9 ms | 50.7 ms | 55.1 ms | 41.7 ms | 196 ms |
| constrained-1024 | 19.2 ms | 5 ms | 75.4 ms | 16.1 ms | 462.6 ms | 297.4 ms | 412.3 ms | 270.3 ms | 1,244 ms |

The decisive constrained knees were 8,000 features, 50,000 total/single-feature positions, and six simultaneous 20k-position maps. Encoded/property-only ladders remained comparatively cheap, proving bytes alone are insufficient. Parts/rings and property ladders set conservative tested ceilings where no earlier performance knee appeared; the implementation must not extrapolate beyond the bounded evidence.

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
- GeometryCollection runtime failure remained isolated and did not mutate its candidate.
- The initial invalid disposable package fixture and excess MultiPolygon nesting were corrected before measurements were accepted; both are recorded in the spike investigation trail.

## Evidence

- Raw main ladder: `.planning/spikes/001-geojson-limit-calibration/evidence/measurements.json`
- Raw depth follow-up: `.planning/spikes/001-geojson-limit-calibration/evidence/nesting-measurements.json`
- Raw per-type follow-up: `.planning/spikes/001-geojson-limit-calibration/evidence/geometry-type-measurements.json`
- Raw rollback probe: `.planning/spikes/001-geojson-limit-calibration/evidence/rollback-measurements.json`
- Inspected checkpoints: `.planning/spikes/001-geojson-limit-calibration/evidence/browser-checkpoints.md`

## Planning consequence

The calibrated guardrail does not require a user decision. The master may review it as a technical prerequisite. No production task or test may substitute different constants without a recorded limits-decision amendment, and completing this record does not promote SCM-S15 or any other amendment row.
