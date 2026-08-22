export function chartsForPlaybackPage(dashboard, activePageId) {
  const pages = Array.isArray(dashboard?.pages) ? dashboard.pages : [];
  const page = activePageId === null || activePageId === undefined
    ? pages[0]
    : pages.find(({ id }) => id === activePageId);
  if (!page) return [];
  return (page.sections ?? []).flatMap((section) => (
    (section.panels ?? []).map((panel) => panel.chart ?? panel)
  ));
}
