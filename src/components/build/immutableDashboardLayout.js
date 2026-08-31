export function updatePage(dashboard, pageId, updatePageValue) {
  const pageIndex = (dashboard?.pages ?? []).findIndex(({ id }) => id === pageId);
  if (pageIndex < 0) return dashboard;
  const currentPage = dashboard.pages[pageIndex];
  const nextPage = updatePageValue(currentPage);
  if (nextPage === currentPage) return dashboard;
  const pages = dashboard.pages.slice();
  pages[pageIndex] = nextPage;
  return { ...dashboard, pages };
}

export function updateSection(dashboard, pageId, sectionId, updateSectionValue) {
  return updatePage(dashboard, pageId, (page) => {
    const sectionIndex = (page.sections ?? []).findIndex(({ id }) => id === sectionId);
    if (sectionIndex < 0) return page;
    const currentSection = page.sections[sectionIndex];
    const nextSection = updateSectionValue(currentSection);
    if (nextSection === currentSection) return page;
    const sections = page.sections.slice();
    sections[sectionIndex] = nextSection;
    return { ...page, sections };
  });
}

export function updatePlacement(dashboard, placementId, updatePlacementValue) {
  const location = locatePlacement(dashboard, placementId);
  if (!location) return dashboard;
  return updateSection(
    dashboard,
    location.page.id,
    location.section.id,
    (section) => {
      const currentPlacement = section.panels[location.placementIndex];
      const nextPlacement = updatePlacementValue(currentPlacement);
      if (nextPlacement === currentPlacement) return section;
      const panels = section.panels.slice();
      panels[location.placementIndex] = nextPlacement;
      return { ...section, panels };
    },
  );
}

export function movePageByIndex(dashboard, pageId, targetIndex) {
  const pages = reorderById(dashboard?.pages, pageId, targetIndex);
  return pages ? { ...dashboard, pages } : dashboard;
}

export function moveSectionByIndex(dashboard, pageId, sectionId, targetIndex) {
  return updatePage(dashboard, pageId, (page) => {
    const sections = reorderById(page.sections, sectionId, targetIndex);
    return sections ? { ...page, sections } : page;
  });
}

export function movePlacementBefore(dashboard, sourcePlacementId, targetPlacementId) {
  if (!sourcePlacementId || !targetPlacementId || sourcePlacementId === targetPlacementId) return dashboard;
  const source = locatePlacement(dashboard, sourcePlacementId);
  const target = locatePlacement(dashboard, targetPlacementId);
  if (!source || !target) return dashboard;

  if (source.section === target.section) {
    const panels = source.section.panels.slice();
    const [placement] = panels.splice(source.placementIndex, 1);
    const targetIndex = source.placementIndex < target.placementIndex
      ? target.placementIndex - 1
      : target.placementIndex;
    panels.splice(targetIndex, 0, placement);
    return updateSection(dashboard, source.page.id, source.section.id, (section) => ({ ...section, panels }));
  }

  const sourcePanels = source.section.panels.slice();
  const [placement] = sourcePanels.splice(source.placementIndex, 1);
  const targetPanels = target.section.panels.slice();
  targetPanels.splice(target.placementIndex, 0, placement);

  if (source.page === target.page) {
    return updatePage(dashboard, source.page.id, (page) => ({
      ...page,
      sections: page.sections.map((section) => {
        if (section.id === source.section.id) return { ...section, panels: sourcePanels };
        if (section.id === target.section.id) return { ...section, panels: targetPanels };
        return section;
      }),
    }));
  }

  const pages = dashboard.pages.slice();
  pages[source.pageIndex] = {
    ...source.page,
    sections: source.page.sections.map((section) => (
      section.id === source.section.id ? { ...section, panels: sourcePanels } : section
    )),
  };
  pages[target.pageIndex] = {
    ...target.page,
    sections: target.page.sections.map((section) => (
      section.id === target.section.id ? { ...section, panels: targetPanels } : section
    )),
  };
  return { ...dashboard, pages };
}

function locatePlacement(dashboard, placementId) {
  for (let pageIndex = 0; pageIndex < (dashboard?.pages ?? []).length; pageIndex += 1) {
    const page = dashboard.pages[pageIndex];
    for (let sectionIndex = 0; sectionIndex < (page.sections ?? []).length; sectionIndex += 1) {
      const section = page.sections[sectionIndex];
      const placementIndex = (section.panels ?? []).findIndex(({ id }) => id === placementId);
      if (placementIndex >= 0) {
        return { page, pageIndex, section, sectionIndex, placementIndex };
      }
    }
  }
  return null;
}

function reorderById(collection, id, targetIndex) {
  if (!Array.isArray(collection) || !Number.isInteger(targetIndex)) return null;
  const sourceIndex = collection.findIndex((entry) => entry?.id === id);
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= collection.length || sourceIndex === targetIndex) {
    return null;
  }
  const next = collection.slice();
  const [entry] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, entry);
  return next;
}
