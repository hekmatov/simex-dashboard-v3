export async function hydrateConfigurationBeforeStorageWrite({
  candidate,
  hydrate,
  persist,
}) {
  if (typeof hydrate !== "function" || typeof persist !== "function") {
    throw new TypeError("Recovery hydration and persistence callbacks are required.");
  }
  const loaded = await hydrate(candidate);
  await persist(loaded);
  return loaded;
}

export function recoveryPackageError(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /supports version 3 bundles only/i.test(message)
    ? "This package is not a supported version 3 dashboard. Choose a current version 3 package."
    : "Dashboard package couldn’t be imported. The current dashboard is unchanged.";
}

export function recoveryPackageSummary(config) {
  const pages = Array.isArray(config?.pages) ? config.pages : [];
  const charts = pages.reduce((total, page) => total + (page.sections ?? []).reduce(
    (pageTotal, section) => pageTotal + (section.panels?.length ?? 0),
    0,
  ), 0);
  return {
    program: config?.programLabel || "Unlabelled program",
    scenario: config?.scenarioLabel || "Unlabelled scenario",
    pages: pages.length,
    charts,
  };
}
