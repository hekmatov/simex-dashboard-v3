export function configuredCharts(dashboard) {
  return (dashboard?.pages ?? []).flatMap((page) =>
    (page.sections ?? []).flatMap((section) =>
      (section.panels ?? []).map((placement) => placement.chart ?? placement),
    ),
  );
}

export function findConfiguredChart(dashboard, chartId) {
  if (!chartId) return null;
  return configuredCharts(dashboard).find(({ id }) => id === chartId) ?? null;
}

export function findPanelPlacement(dashboard, placementId) {
  if (!placementId) return null;
  for (const page of dashboard?.pages ?? []) {
    for (const section of page.sections ?? []) {
      const placement = section.panels?.find(({ id }) => id === placementId);
      if (placement) {
        return { panelId: placement.id, chart: placement.chart ?? placement };
      }
    }
  }
  return null;
}
