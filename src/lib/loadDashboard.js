import { loadCsv } from "./loadCsv.js";

export async function loadDashboard(configPath) {
  const configResponse = await fetch(configPath);
  if (!configResponse.ok) {
    throw new Error(`Could not load dashboard config: ${configPath}`);
  }

  const dashboard = await configResponse.json();
  return loadDashboardConfig(dashboard);
}

export async function loadDashboardConfig(dashboard) {
  const loadedData = {};

  for (const [sourceId, sourcePath] of Object.entries(dashboard.dataSources ?? {})) {
    loadedData[sourceId] = await loadDataSource(`/${sourcePath}`);
  }

  return {
    ...dashboard,
    pages: normalizePages(dashboard),
    loadedData,
  };
}

async function loadDataSource(path) {
  if (path.endsWith(".json") || path.endsWith(".geojson")) {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Could not load data file: ${path}`);
    }
    return response.json();
  }
  return loadCsv(path);
}

function normalizePages(dashboard) {
  if (Array.isArray(dashboard.pages)) {
    return dashboard.pages;
  }

  return [
    {
      id: "dashboard",
      label: "Dashboard",
      title: dashboard.title,
      description: dashboard.description,
      sections: [
        {
          id: "main",
          title: dashboard.title,
          description: dashboard.description,
          layout: dashboard.layout,
          panels: dashboard.charts ?? [],
        },
      ],
    },
  ];
}
