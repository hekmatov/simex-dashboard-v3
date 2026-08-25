# Browser Checkpoints

**Date:** 2026-08-25
**Browser:** Codex in-app Chromium for inspected checkpoints; automated raw measurements used Chromium 149.0.7827.55.

## Shipped baseline — 1440×900

- URL: `/.planning/spikes/001-geojson-limit-calibration/harness.html?project=/data/geo/gemeente_2021.geojson`
- Visible inspected status: `gemeente_2021.geojson: 352 features, 6630 positions`.
- Inspected metadata: 193,816 bytes; 352 features; 6,630 positions; 87 maximum positions/feature; 10 parts; 357 rings; six property keys; Polygon 347 and MultiPolygon 5; traversal depth 5.
- Map host geometry: 1,409×302 CSS pixels within a 1,425-pixel document viewport; document overflow 0.
- Harness interaction result: first usable map 71.6 ms and geo-roam/resize response 58.6 ms in this inspected run.

## Warning-range composition — 1024×768

- URL: `/.planning/spikes/001-geojson-limit-calibration/harness.html?dimension=features&value=4000`
- Visible inspected status: `features-4000: 4000 features, 4000 positions`.
- Inspected metadata: 574,529 bytes; 4,000 independent features; 4,000 positions.
- Map host geometry: 993×302 CSS pixels within a 1,009-pixel document viewport; document overflow 0.
- Harness interaction result: first usable map 97.4 ms and geo-roam/resize response 133.4 ms in this inspected normal-device run. The constrained raw profile retains the material 346.8/511.8 ms p95 results.

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
