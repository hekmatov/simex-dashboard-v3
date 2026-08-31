export function sectionPanelRegionPropsEqual(previous, next) {
  return sameSectionPanels(previous.section, next.section)
    && sameSectionDraft(previous.sectionDraft, next.sectionDraft)
    && previous.pageId === next.pageId
    && previous.runtime === next.runtime
    && previous.delegates === next.delegates
    && previous.editMode === next.editMode
    && previous.disabled === next.disabled
    && previous.selectedPlacementId === next.selectedPlacementId
    && previous.draggingPanelId === next.draggingPanelId
    && previous.dragOverPanelId === next.dragOverPanelId
    && previous.multiSelectMode === next.multiSelectMode
    && sameValues(previous.multiPanelIds, next.multiPanelIds)
    && sameValues(previous.excludedChartIds, next.excludedChartIds)
    && sameValues(previous.chronoChartIds, next.chronoChartIds);
}

function sameSectionPanels(previous, next) {
  if (previous === next) return true;
  if (!previous || !next) return false;
  if (
    previous.id !== next.id
    || previous.title !== next.title
    || previous.description !== next.description
  ) return false;
  const previousPanels = previous.panels ?? [];
  const nextPanels = next.panels ?? [];
  return previousPanels.length === nextPanels.length
    && previousPanels.every((panel, index) => panel === nextPanels[index]);
}

function sameSectionDraft(previous, next) {
  return previous === next
    || Boolean(previous && next)
      && previous.id === next.id
      && previous.title === next.title
      && previous.description === next.description;
}

function sameValues(previous = [], next = []) {
  return previous === next
    || (previous.length === next.length && previous.every((value, index) => value === next[index]));
}
