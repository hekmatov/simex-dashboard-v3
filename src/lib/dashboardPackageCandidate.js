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

  const rawConfig = [3, 4, 5, 6, 7].includes(parsed?.configVersion) && parsed?.bundleType === undefined;
  const rawMigrationReview = [];
  const authoritativeText = rawConfig
    ? JSON.stringify(serializeDashboardBundle(parsed, { now: null, onReview: item => rawMigrationReview.push(item) }))
    : text;
  const { config, assetPayloads, migrationReview, appVersion, integrity } = parseDashboardBundle(authoritativeText, {
    includeEnvelope: true,
  });
  const authoritativeBundle = JSON.parse(authoritativeText);
  const exportedAt = authoritativeBundle.metadata.exportedAt;
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
    originalText: text,
    migrationReview: Object.freeze([...rawMigrationReview, ...migrationReview]),
    appVersion: rawConfig ? null : appVersion,
    integrity: !rawConfig && integrity ? Object.freeze({ ...integrity }) : null,
    assetPayloads: Object.freeze(structuredClone(assetPayloads)),
    networkDependencies: Object.freeze([
      ...authoritativeBundle.metadata.networkDependencies,
    ]),
    exportedAt,
    summary: Object.freeze({ pages: Object.freeze(pages) }),
  });
}
