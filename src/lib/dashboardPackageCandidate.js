import {
  parseDashboardBundle,
  serializeDashboardBundle,
} from "../charting/config/dashboardBundleV3.js";

export function parseDashboardPackageCandidate(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Dashboard bundle must be valid JSON.");
  }

  const rawConfig = parsed?.configVersion === 3 && parsed?.bundleType === undefined;
  const authoritativeText = rawConfig
    ? JSON.stringify(serializeDashboardBundle(parsed, { now: null }))
    : text;
  const config = parseDashboardBundle(authoritativeText);
  const exportedAt = rawConfig ? null : parsed?.metadata?.exportedAt ?? null;
  const pages = (config.pages ?? []).map((page) => Object.freeze({
    id: page.id,
    name: page.label ?? page.title ?? page.id,
    sections: Object.freeze((page.sections ?? []).map((section) => Object.freeze({
      id: section.id,
      name: section.title ?? section.id,
      panels: Object.freeze((section.panels ?? []).map((placement) => {
        const chart = placement.chart ?? placement;
        return Object.freeze({
          id: placement.id,
          chartId: chart.id,
          name: chart.title ?? chart.id,
        });
      })),
    }))),
  }));

  return Object.freeze({
    config,
    exportedAt,
    summary: Object.freeze({ pages: Object.freeze(pages) }),
  });
}
