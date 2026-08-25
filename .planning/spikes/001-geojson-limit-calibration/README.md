---
spike: 001
name: geojson-limit-calibration
type: standard
validates: "Given the four legitimate GeoJSON files and bounded independent ladders, when current validation, packaging, persistence, and ECharts paths run in normal and constrained Chromium profiles, then measured knees support exact warning/hard limits without excluding legitimate inputs or creating a material UX tradeoff."
verdict: VALIDATED
related: []
tags: [geojson, chromium, limits, performance, security]
---

# Spike 001: GeoJSON Limit Calibration

> **Current-policy supersession (2026-08-25):** The V3 Design master accepted `c28b59d` as calibration evidence, but the user later superseded its ten-independent-metric admission interpretation. The governing policy now has exactly four resource gates: encoded bytes, Feature count, total coordinate positions, and renderable geometry fragments. All other measured ladders below are retained unchanged as historical diagnostics, schema evidence, implementation guidance, or runtime-scheduling evidence; they are not independent admission caps. See `docs/audits/2026-08-24-v3-static-content-panels/GEOJSON-LIMITS-DECISION.md`.

## What This Validates

The spike establishes implementation-ready GeoJSON resource and nesting guardrails before the final Source Content Manager implementation plan. It uses all four shipped project files, independently generated bounded ladders, current production validation/package/map code, and actual Chromium at the accepted Build viewports plus one constrained profile.

## Research

No external dependency research was necessary. The spike compares three locally available approaches:

| Approach | Pros | Cons | Status |
|---|---|---|---|
| Node-only parsing benchmark | Fast and deterministic | Cannot measure ECharts paint, interaction, long tasks, IndexedDB, or viewport behavior | Rejected as sole evidence |
| Future manager prototype | Could mimic proposed composition | Would implement an unapproved production surface and measure invented wiring | Rejected |
| Disposable Vite/Chromium harness importing current production owners | Exercises `validateGeoJson`, package export/import, ECharts, browser persistence, real viewports, and constrained CPU/heap without production edits | Manager summary/replacement paths require named equivalents because the manager does not exist | Chosen |

The chosen harness imports current production functions from `src/lib/loadDashboard.js`, `src/lib/dashboardPackageExport.js`, `src/lib/dashboardPackageCandidate.js`, and `src/charting/config/dashboardBundleV3.js`, and uses the installed ECharts runtime.

## How to Run

From the project root, start Vite without the production predev generators:

~~~powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4187 --strictPort
~~~

Run the complete bounded ladder:

~~~powershell
node .planning/spikes/001-geojson-limit-calibration/run-benchmark.mjs --base-url http://127.0.0.1:4187 --output .planning/spikes/001-geojson-limit-calibration/evidence/measurements.json
~~~

Run only a named gap/probe without repeating completed ladders:

~~~powershell
node .planning/spikes/001-geojson-limit-calibration/run-benchmark.mjs --base-url http://127.0.0.1:4187 --dimensions collectionDepth,acceptedGeometryTypes --output .planning/spikes/001-geojson-limit-calibration/evidence/nesting-measurements.json
node .planning/spikes/001-geojson-limit-calibration/run-benchmark.mjs --base-url http://127.0.0.1:4187 --dimensions rollbackProbe --output .planning/spikes/001-geojson-limit-calibration/evidence/rollback-measurements.json
~~~

The master-correction runner options `--profiles constrained-1024` and `--values 16000000,24000000` restrict a follow-up to exact profiles/rungs. Correction evidence is written after every completed rung so an intentionally stopped resource-failure probe cannot erase prior samples.

The runner uses three samples per phase/rung. In this bounded calibration, p95 is therefore the maximum observed sample; raw samples are retained for audit rather than implying population-level precision.

## What to Expect

- The runner prints each completed rung with p95 validation, package-import, first-map, and interaction timings.
- It stops a ladder once an observed hard knee reaches 2 seconds in package import, stable stringify, first usable map, or a main-thread long task.
- It writes raw per-sample measurements and environment facts to the chosen output file.
- Every malformed rollback probe must preserve both the candidate object and package-dashboard input.
- GeometryCollection passes current `validateGeoJson` but reports an ECharts map error; the six coordinate geometry types do not report that runtime error.

## Observability

The harness records per sample:

- upload/read-equivalent fetch and byte encoding;
- JSON parse and current `validateGeoJson`;
- bounded domain-summary traversal;
- stable stringify, SHA-256, IndexedDB write/reload;
- current package export/import and serialized bundle size;
- ECharts registration, first usable paint, geo-roam/resize response, and concurrent maps;
- used-JS-heap delta and PerformanceObserver long tasks;
- replacement-compatibility-equivalent selected-property scan;
- validation and package failure rollback.

`evidence/browser-checkpoints.md` retains inspected production and harness composition checkpoints; screenshots were not used as a substitute for state/geometry inspection.

## Investigation Trail

1. Verified the shipped corpus exactly: 193,816 maximum bytes, 355 maximum features, approximately 6,630 maximum total positions, and 196 maximum positions in one feature. All files are shallow Polygon/MultiPolygon with flat properties.
2. Built bounded independent ladders for bytes, features, total positions, one-feature density, parts/rings, property keys/value volume, GeometryCollection depth, coordinate geometry types, and active maps.
3. The first package probe correctly failed because the disposable dashboard fixture had an empty section list. Comparison with the current dashboard schema identified the root cause; adding one empty valid section resolved only the harness fixture.
4. The first all-rung run was stopped after it exceeded the proportional time budget without intermediate output. Per-rung observability and a measured early-stop rule were added; completed evidence was not reused from the aborted run.
5. A MultiPolygon ring ladder had one excess array level. The fixture was corrected before any measurement was accepted.
6. The completed ladder exposed two isolated evidence gaps: ECharts threw before GeometryCollection timings were retained, and the all-types probe had a runner-scope typo. The harness retained map errors instead of discarding prior phase measurements, and only the missing depth/type probes were rerun.
7. Per-type isolation showed Point, MultiPoint, LineString, MultiLineString, Polygon, and MultiPolygon complete the current ECharts path without the GeometryCollection error. GeometryCollection fails at depth 1 even though current structural validation accepts depths through 64.
8. A focused rollback probe confirmed malformed-candidate and injected package-read failures preserve their inputs in all 9 samples per assertion (three samples across three profiles; 18 asserted rollback outcomes total).
9. Master review retained the feature, coordinate, type, concurrency, rollback, viewport, and corpus evidence but rejected four under-specified limits. The correction extended only byte/property-volume and parts/rings ladders, added a whole-document structural-node ladder, and made the property-key metric exact.
10. Fresh constrained runs completed 16, 24, and 32 MB encoded/property-value rungs. A fresh 48 MB encoded rung failed to complete within a bounded 90-second window and reached a 923,045,888-byte Chromium working set; the exact benchmark process was stopped and the failure recorded rather than converted into a timing sample.
11. A realistic 500-feature MultiPolygon distribution separated the old single-feature ring shape from ordinary multi-feature load: 2,000 parts/rings stayed below the hard-knee rule, 4,000 crossed it through a 2,097 ms long task, and 8,000 reached a 4,605 ms long task.
12. Structural-node fixtures count every object/array container in the whole document. 40,000 nodes completed below the hard-knee rule; 50,000 reached a 2,180 ms long task. Property-key fixtures now request and report the maximum own keys on one Feature.properties object exactly, not the union of names across the source.
13. Historical `measurements.json` retains the initial `parts` and `propertyKeyCount` diagnostic fields for audit. Those two field definitions are superseded by the corrected generator and `master-correction-*` evidence; retained timing/geometry/type/concurrency results are unchanged.
14. Renewed master review accepted the distributed part/ring, exact structural-node, and exact per-feature-key corrections but rejected allowing byte/property values to approach the failed 48 MB region. One fresh constrained 36 MB encoded rung was therefore run. It completed, but its maximum long task reached the predeclared 2,000 ms hard knee; 40/44 MB probes were unnecessary. The final byte/property hard boundary is 36 MB, leaving a 12 MB (25%) margin below the 48 MB resource failure while preserving 8 MB as normal.

## Results

**Evidence verdict: VALIDATED and master-accepted at `c28b59d`; historical policy superseded.** The retained measurements exclude none of the four legitimate project fixtures and support the current four-gate decision. The rows below preserve raw historical findings and do not themselves define current admission.

Key knees in the constrained 1024×768, 4× CPU, 512 MiB V8 old-space profile:

| Dimension | Lower measured rung | Higher measured rung / knee |
|---|---|---|
| Features | 4,000: first map 347 ms p95; interaction 512 ms | 8,000: first map 1,025 ms; interaction 1,828 ms; 2,807 ms max long task |
| Total positions | 20,000: package import 610 ms; interaction 175 ms | 50,000: package import 1,579 ms; 3,864 ms max long task |
| Positions in one feature | 20,000: package import 590 ms; interaction 115 ms | 50,000: package import 1,556 ms; 3,680 ms max long task |
| Concurrent 20k-position maps | 2: first map 302 ms; interaction 387 ms | 4: 572/784 ms; 6: 820/1,122 ms with 2,151 ms max long task |
| Encoded/property-value bytes | 8 MB property value: 114.5 ms package import; 32 MB encoded: 441.3 ms/1,567 ms max long task | 36 MB encoded: 543.4 ms package import/2,000 ms max long task; fresh 48 MB encoded resource-failed beyond 90 s with 923 MB Chromium working set |
| Distributed parts/rings | 2,000 across 500 features: 453.9 ms package import/1,588 ms max long task | 4,000: 794.9 ms/2,097 ms; 8,000: 1,752 ms/4,605 ms |
| Whole-document structural nodes | 40,000: 648.8 ms package import/1,459 ms max long task | 50,000: 860 ms/2,180 ms |

The future checker byte-gates before parse and iteratively validates supported geometry. It rejects at one of the four resource caps or on a separately typed schema/compatibility failure. Historical structural-node/property-key results require lazy, virtualized, or paginated manager handling and avoidance of eager arbitrary-property traversal; they do not authorize numeric rejection. Join coverage stays outside admission, GeometryCollection remains structurally unsupported by the current map runtime, and concurrent-map measurements govern only shared runtime scheduling.
