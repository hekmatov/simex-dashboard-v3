import { loadCsv } from "./loadCsv.js";

export async function loadDashboard(configPath) {
  const configResponse = await fetch(configPath);
  if (!configResponse.ok) {
    throw new Error(`Could not load dashboard config: ${configPath}`);
  }

  const dashboard = await configResponse.json();
  const loadedData = {};

  for (const [sourceId, sourcePath] of Object.entries(dashboard.dataSources ?? {})) {
    loadedData[sourceId] = await loadCsv(`/${sourcePath}`);
  }

  return {
    ...dashboard,
    loadedData,
  };
}
