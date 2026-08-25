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

## Results

**Verdict: VALIDATED.** The calibrated limits in `docs/audits/2026-08-24-v3-static-content-panels/GEOJSON-LIMITS-DECISION.md` exclude none of the four legitimate project fixtures and introduce no material user-level UX tradeoff. The guardrail can proceed to master technical review without asking the user to choose numbers.

Key knees in the constrained 1024×768, 4× CPU, 512 MiB V8 old-space profile:

| Dimension | Lower measured rung | Higher measured rung / knee |
|---|---|---|
| Features | 4,000: first map 347 ms p95; interaction 512 ms | 8,000: first map 1,025 ms; interaction 1,828 ms; 2,807 ms max long task |
| Total positions | 20,000: package import 610 ms; interaction 175 ms | 50,000: package import 1,579 ms; 3,864 ms max long task |
| Positions in one feature | 20,000: package import 590 ms; interaction 115 ms | 50,000: package import 1,556 ms; 3,680 ms max long task |
| Concurrent 20k-position maps | 2: first map 302 ms; interaction 387 ms | 4: 572/784 ms; 6: 820/1,122 ms with 2,151 ms max long task |
| Encoded bytes alone | 4 MB: 60 ms package import | 8 MB: 112 ms; byte size alone is not the geometry knee |

The future checker must be iterative and budgeted. It must reject at the first hard cap, byte-gate before parse, exclude join coverage from resource decisions, and classify GeometryCollection as structurally unsupported for the current map runtime rather than pretending it is a slow-but-supported case.
