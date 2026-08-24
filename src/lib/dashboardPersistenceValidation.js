import { validateDashboardConfig } from "../charting/config/dashboardBundleV3.js";

/**
 * Validates the application-session dashboard candidate immediately before
 * App persistence. Typed static sources are provisionally supported here;
 * authored asset manifests remain owned by the dashboard-v4 boundary.
 */
export function validateConfigurationForPersistence(
  stored,
  configuredFallbackProfiles = {},
) {
  validateDashboardConfig({
    ...stored,
    datasetProfiles: {
      ...configuredFallbackProfiles,
      ...(stored.datasetProfiles ?? {}),
    },
  }, {
    allowBrowserAssetIds: true,
    allowTypedStaticSources: true,
  });
  return stored;
}
