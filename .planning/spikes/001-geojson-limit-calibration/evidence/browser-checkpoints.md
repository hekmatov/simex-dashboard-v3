# Browser Checkpoints

**Date:** 2026-08-25
**Browser:** Codex in-app Chromium for inspected checkpoints; automated raw measurements used Chromium 149.0.7827.55.

## Shipped baseline — 1440×900

- URL: `/.planning/spikes/001-geojson-limit-calibration/harness.html?project=/data/geo/gemeente_2021.geojson`
- Visible inspected status: `gemeente_2021.geojson: 352 features, 6630 positions`.
- Inspected metadata under the corrected metric: 193,816 bytes; 352 features; 6,630 positions; 87 maximum positions/feature; 357 geometry parts; 357 rings; maximum six own property keys on one feature; 8,407 whole-document structural nodes; Polygon 347 and MultiPolygon 5; traversal depth 5.
- Map host geometry: 1,409×302 CSS pixels within a 1,425-pixel document viewport; document overflow 0.
- Harness interaction result: first usable map 71.6 ms and geo-roam/resize response 58.6 ms in this inspected run.

## Warning-range composition — 1024×768

- URL: `/.planning/spikes/001-geojson-limit-calibration/harness.html?dimension=features&value=4000`
- Visible inspected status: `features-4000: 4000 features, 4000 positions`.
- Inspected metadata: 574,529 bytes; 4,000 independent features; 4,000 positions.
- Map host geometry: 993×302 CSS pixels within a 1,009-pixel document viewport; document overflow 0.
- Harness interaction result: first usable map 97.4 ms and geo-roam/resize response 133.4 ms in this inspected normal-device run. The constrained raw profile retains the material 346.8/511.8 ms p95 results.

## Master-correction polygon distribution — 1440×900 and 1024×768

- At 1440×900, `distributedPartsRings-2000` rendered 500 MultiPolygon features, 2,000 parts, 2,000 rings, and 10,000 positions in one 1,422×300 CSS-pixel canvas. The checkpoint output reported one map host, first usable map 118.2 ms, interaction/resize 84.4 ms, and no map-path error.
- At 1024×768, `distributedPartsRings-4000` rendered the same 500-feature distribution with 4,000 parts, 4,000 rings, and 20,000 positions in one 1,006×300 CSS-pixel canvas. The checkpoint output reported one map host, first usable map 91.0 ms, interaction/resize 100.9 ms, and no map-path error.
- The visible canvases stayed inside their harness content panes. The diagnostic JSON `<pre>` can itself create a small page scrollbar and is not production-composition evidence; map-host geometry and the checkpoint's pre-diagnostic `documentOverflow: 0` are the relevant inspected facts.
- These normal-device inspections supplement, but do not replace, the constrained raw measurements: 2,000 distributed rings remained below the hard-knee rule at a 1,588 ms maximum long task; 4,000 crossed it at 2,097 ms; 8,000 reached 1,752 ms package-import p95 and a 4,605 ms maximum long task.

## Nearest current production journey

The future Source Content Manager does not exist. The nearest canonical live production route was inspected instead:

1. Open Build at 1440×900.
2. Select Biomedical.
3. Focus **Population and municipal infection burden**, which uses the current GeoJSON/ECharts path.
4. Inspect the focused map, then resize to 1024×768.

Observed production facts:

- Build exposed the accepted existing Content commands (`Add chart`, `Add static content`, `Pages & sections`) and no future `Source content` command.
- The map focused without a runtime error and exposed the existing `Hold Ctrl while scrolling to zoom` status.
- At 1440×900 the focused canvas measured 1,268×708 CSS pixels with document overflow 0.
- At 1024×768 it resized to 1,012×756 CSS pixels with document overflow 0 and retained the focused map/status.

This checkpoint proves current map registration/render/resize integration only. It is not evidence that the proposed manager, summary preview, replacement UI, or SCM-S15 production authority is implemented.

## Second master-correction byte checkpoint — constrained 1024×768

- Only the unresolved byte/property margin was probed: one fresh three-sample Chromium rung requested 36,000,000 encoded bytes and produced 35,999,997 encoded bytes with 35,999,833 total encoded property-value bytes.
- The bounded fixture was one Point feature, one coordinate position, one geometry part, zero rings, two maximum own keys, and six structural nodes. Its map geometry is intentionally trivial, so no new composition claim is made.
- Package-import p95 was 543.4 ms, summary p95 406.6 ms, interaction p95 39.9 ms, maximum heap delta 216,171,884 bytes, and maximum long task exactly 2,000 ms. All three ordinary and package rollback assertions remained preserved.
- The exact 2,000 ms predeclared hard knee establishes 36 MB as a conservative rejected boundary. The prior 32 MB rung remains the highest fully measured allowed value; the retained 48 MB resource failure remains the failed-region evidence. No 40/44 MB run was needed.
