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

export function createPlaybackChartCollectionSelector() {
  let pages = null;
  let activePageId = Symbol("uninitialized-page");
  let charts = [];
  let pageCharts = [];

  return (dashboard, nextActivePageId) => {
    const nextPages = Array.isArray(dashboard?.pages) ? dashboard.pages : [];
    if (nextPages !== pages) {
      pages = nextPages;
      charts = nextPages.flatMap((page) => (
        (page.sections ?? []).flatMap((section) => (
          (section.panels ?? []).map((panel) => panel.chart ?? panel)
        ))
      ));
      activePageId = Symbol("pages-changed");
    }
    if (nextActivePageId !== activePageId) {
      activePageId = nextActivePageId;
      pageCharts = chartsForPlaybackPage({ pages }, nextActivePageId);
    }
    return { charts, pageCharts };
  };
}
