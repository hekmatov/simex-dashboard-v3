export function reorderPage(dashboard, pageId, targetIndex) {
  return reorderById(dashboard?.pages, pageId, targetIndex);
}

export function reorderSection(dashboard, pageId, sectionId, targetIndex) {
  const page = (dashboard?.pages ?? []).find(({ id }) => id === pageId);
  return reorderById(page?.sections, sectionId, targetIndex);
}

function reorderById(collection, id, targetIndex) {
  if (!Array.isArray(collection) || !Number.isInteger(targetIndex)) return false;
  const sourceIndex = collection.findIndex((entry) => entry?.id === id);
  if (
    sourceIndex < 0
    || targetIndex < 0
    || targetIndex >= collection.length
    || sourceIndex === targetIndex
  ) {
    return false;
  }
  const [entry] = collection.splice(sourceIndex, 1);
  collection.splice(targetIndex, 0, entry);
  return true;
}
