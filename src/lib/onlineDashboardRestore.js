export const ONLINE_DASHBOARD_RESTORE_DESCRIPTION = "Fetches and validates the dashboard served by this deployed SimEx instance. Unlike Discard Build changes, it does not use the Build-entry baseline.";

export async function prepareOnlineDashboardRestore({
  baseUrl,
  loadDefinition,
  hydrate,
  validate,
} = {}) {
  requireCallback(loadDefinition, "Online dashboard definition loader");
  requireCallback(hydrate, "Online dashboard hydration");
  requireCallback(validate, "Online dashboard validation");

  const definition = await loadDefinition(onlineDashboardConfigUrl(baseUrl));
  if (!isRecord(definition?.dashboard)) {
    throw new Error("The deployed dashboard definition is incomplete.");
  }
  const datasetProfiles = cloneValue(definition.datasetProfiles ?? {});
  const portableSources = definition.portableSources == null
    ? null
    : cloneValue(definition.portableSources);
  const dashboard = {
    ...cloneValue(definition.dashboard),
    datasetProfiles,
  };
  const hydrated = await hydrate(
    dashboard,
    cloneValue(datasetProfiles),
    portableSources == null ? null : cloneValue(portableSources),
  );
  if (!isRecord(hydrated)) {
    throw new Error("The deployed dashboard could not be hydrated completely.");
  }
  await validate(hydrated);
  return cloneValue(hydrated);
}

export async function commitOnlineDashboardRestore({
  current,
  candidate,
  commitController,
  cleanupAssets,
} = {}) {
  requireDashboard(current, "Current dashboard");
  requireDashboard(candidate, "Online dashboard candidate");
  requireCallback(commitController?.whenIdle, "Dashboard commit queue preparation");
  requireCallback(commitController?.replaceWith, "Dashboard replacement");
  requireCallback(cleanupAssets, "Replaced dashboard asset cleanup");

  const queuedCurrent = await commitController.whenIdle();
  const previous = isRecord(queuedCurrent)
    ? cloneValue(queuedCurrent)
    : cloneValue(current);
  const committed = await commitController.replaceWith(cloneValue(candidate));
  requireDashboard(committed, "Committed online dashboard");

  let cleanupWarning = null;
  try {
    await cleanupAssets(previous, cloneValue(committed));
  } catch (error) {
    cleanupWarning = error instanceof Error
      ? error
      : new Error(String(error ?? "Replaced dashboard assets could not be removed."));
  }
  return Object.freeze({
    dashboard: cloneValue(committed),
    cleanupWarning,
  });
}

function onlineDashboardConfigUrl(baseUrl) {
  if (typeof baseUrl !== "string") {
    throw new TypeError("The deployed dashboard base URL is required.");
  }
  const normalized = baseUrl.trim() || "/";
  return `${normalized.endsWith("/") ? normalized : `${normalized}/`}config/dashboard.json`;
}

function requireCallback(value, description) {
  if (typeof value !== "function") throw new TypeError(`${description} is required.`);
}

function requireDashboard(value, description) {
  if (!isRecord(value)) throw new TypeError(`${description} is required.`);
}

function cloneValue(value) {
  return structuredClone(value);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
