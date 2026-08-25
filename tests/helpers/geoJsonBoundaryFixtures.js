import {
  GEOJSON_CONCURRENT_MAPS,
  GEOJSON_LIMITS,
  SOURCE_GEOJSON_LIMIT_KEYS,
} from "../../src/lib/geoJsonValidation.js";

const BOUNDARIES = new Set(["normalMax", "warningMin", "hardMin"]);

export { GEOJSON_CONCURRENT_MAPS, GEOJSON_LIMITS, SOURCE_GEOJSON_LIMIT_KEYS };

export function geoJsonAtBoundary(metric, boundary, limits = GEOJSON_LIMITS) {
  if (!SOURCE_GEOJSON_LIMIT_KEYS.includes(metric)) {
    throw new Error(`Unknown GeoJSON admission metric "${String(metric)}".`);
  }
  if (!BOUNDARIES.has(boundary)) {
    throw new Error(`Unknown GeoJSON admission boundary "${String(boundary)}".`);
  }
  return Object.freeze({ metric, value: limits[metric][boundary] });
}

export function concurrentMapScenario(
  { dashboardMaps = 0, previewMaps = 0, visibleDashboardIds = [] } = {},
  limits = GEOJSON_CONCURRENT_MAPS,
) {
  const eagerMaps = dashboardMaps + previewMaps;
  return Object.freeze({
    dashboardMaps,
    previewMaps,
    visibleDashboardIds: Object.freeze([...visibleDashboardIds]),
    eagerMaps,
    state: eagerMaps <= limits.normalMax
      ? "normal"
      : eagerMaps <= limits.eagerMax
      ? "degraded"
      : "deferred",
  });
}
