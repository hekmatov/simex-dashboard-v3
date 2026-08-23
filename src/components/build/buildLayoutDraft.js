import { reorderPage, reorderSection } from "./buildStructureModel.js";

export function createBuildLayoutDraft(dashboard) {
  const baseline = structuredClone(dashboard);
  return {
    draftId: `layout-${String(dashboard?.id ?? "dashboard")}`,
    kind: "layout",
    targetId: null,
    status: "clean",
    baseline,
    value: structuredClone(baseline),
    error: null,
  };
}

export function reorderBuildLayoutPanel(draft, sourceId, targetId) {
  const next = cloneDraft(draft);
  if (!movePanel(next.value, sourceId, targetId)) return draft;
  return markDirty(next, targetId);
}

export function reorderBuildLayoutPage(draft, pageId, targetIndex) {
  const next = cloneDraft(draft);
  if (!reorderPage(next.value, pageId, targetIndex)) return draft;
  return markDirty(next, pageId);
}

export function reorderBuildLayoutSection(draft, pageId, sectionId, targetIndex) {
  const next = cloneDraft(draft);
  if (!reorderSection(next.value, pageId, sectionId, targetIndex)) return draft;
  return markDirty(next, sectionId);
}

export function beginBuildLayoutSave(draft) {
  if (!draft || draft.status === "clean" || draft.status === "saving") return draft;
  return { ...draft, status: "saving", error: null };
}

export function failBuildLayoutSave(draft, error) {
  return { ...draft, status: "error", error };
}

export function discardBuildLayoutDraft(draft) {
  return {
    ...draft,
    targetId: null,
    status: "clean",
    value: structuredClone(draft.baseline),
    error: null,
  };
}

function cloneDraft(draft) {
  return { ...draft, value: structuredClone(draft.value), error: null };
}

function markDirty(draft, targetId) {
  return { ...draft, targetId, status: "dirty" };
}

function movePanel(dashboard, sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return false;
  let sourceLocation = null;
  let targetLocation = null;
  for (const page of dashboard?.pages ?? []) {
    for (const section of page.sections ?? []) {
      const sourceIndex = (section.panels ?? []).findIndex(({ id }) => id === sourceId);
      const targetIndex = (section.panels ?? []).findIndex(({ id }) => id === targetId);
      if (sourceIndex >= 0) sourceLocation = { section, index: sourceIndex };
      if (targetIndex >= 0) targetLocation = { section, index: targetIndex };
    }
  }
  if (!sourceLocation || !targetLocation) return false;
  const [source] = sourceLocation.section.panels.splice(sourceLocation.index, 1);
  const targetIndex = sourceLocation.section === targetLocation.section
    && sourceLocation.index < targetLocation.index
    ? targetLocation.index - 1
    : targetLocation.index;
  targetLocation.section.panels.splice(targetIndex, 0, source);
  return true;
}
