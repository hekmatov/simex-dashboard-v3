import React from "react";

const ACTIVE_STATUSES = new Set(["dirty", "error", "suspended"]);

export function createStructureDraft(dashboard = {}) {
  const baseline = cloneDashboardStructure(dashboard);
  return {
    baseline,
    value: cloneDashboardStructure(baseline),
    status: "clean",
    error: null,
    restoration: null,
    suspendedStatus: null,
    pendingConsequence: null,
  };
}

export function validateStructureDraft(value) {
  const pages = value?.pages ?? [];
  if (pages.length === 0) {
    return issue("PAGE_REQUIRED", "A dashboard must retain at least one Page.");
  }
  const ids = new Set();
  for (const page of pages) {
    if (!validId(page?.id) || ids.has(`page:${page.id}`)) {
      return issue("PAGE_ID_INVALID", "Every Page needs a unique stable ID.");
    }
    ids.add(`page:${page.id}`);
    if (!Array.isArray(page.sections) || page.sections.length === 0) {
      return issue("SECTION_REQUIRED", `${page.label || page.title || page.id} must retain a Section.`);
    }
    for (const section of page.sections) {
      if (!validId(section?.id) || ids.has(`section:${section.id}`)) {
        return issue("SECTION_ID_INVALID", "Every Section needs a unique stable ID.");
      }
      ids.add(`section:${section.id}`);
      for (const panel of section.panels ?? []) {
        if (!validId(panel?.id) || ids.has(`panel:${panel.id}`)) {
          return issue("PANEL_ID_INVALID", "Every placed chart needs a unique stable placement ID.");
        }
        ids.add(`panel:${panel.id}`);
      }
    }
  }
  return null;
}

export function reduceStructureDraft(state, action) {
  switch (action?.type) {
    case "RENAME_PAGE":
      return updateStructure(state, (value) => {
        const page = findPage(value, action.pageId);
        if (!page) return issue("PAGE_NOT_FOUND", "The Page no longer exists.");
        const label = String(action.label ?? "").trim();
        if (!label) return issue("PAGE_NAME_REQUIRED", "Enter a Page name.");
        page.label = label;
        return null;
      });
    case "RENAME_SECTION":
      return updateStructure(state, (value) => {
        const section = findSection(value, action.pageId, action.sectionId);
        if (!section) return issue("SECTION_NOT_FOUND", "The Section no longer exists.");
        const title = String(action.title ?? "").trim();
        if (!title) return issue("SECTION_NAME_REQUIRED", "Enter a Section name.");
        section.title = title;
        return null;
      });
    case "ADD_PAGE":
      return updateStructure(state, (value) => {
        if (!validId(action.page?.id)) return issue("PAGE_ID_INVALID", "The new Page needs a stable ID.");
        if ((value.pages ?? []).some(({ id }) => id === action.page.id)) return issue("PAGE_ID_DUPLICATE", "That Page ID already exists.");
        const page = clone(action.page);
        if (!Array.isArray(page.sections) || page.sections.length === 0) {
          if (!validId(action.initialSection?.id)) return issue("SECTION_REQUIRED", "The new Page needs an initial Section.");
          page.sections = [clone(action.initialSection)];
        }
        value.pages.push(page);
        return null;
      });
    case "ADD_SECTION":
      return updateStructure(state, (value) => {
        const page = findPage(value, action.pageId);
        if (!page) return issue("PAGE_NOT_FOUND", "The Page no longer exists.");
        if (!validId(action.section?.id)) return issue("SECTION_ID_INVALID", "The new Section needs a stable ID.");
        if (allSections(value).some(({ id }) => id === action.section.id)) return issue("SECTION_ID_DUPLICATE", "That Section ID already exists.");
        page.sections.push({ ...clone(action.section), panels: clone(action.section.panels ?? []) });
        return null;
      });
    case "REORDER_PAGE":
      return reorderStructure(state, state.value.pages, action.pageId, action.direction, "PAGE_NOT_FOUND");
    case "REORDER_SECTION": {
      const page = findPage(state.value, action.pageId);
      if (!page) return withError(state, issue("PAGE_NOT_FOUND", "The Page no longer exists."));
      return reorderStructure(state, page.sections, action.sectionId, action.direction, "SECTION_NOT_FOUND", action.pageId);
    }
    case "REQUEST_REMOVE_SECTION":
      return requestSectionRemoval(state, action);
    case "REMOVE_SECTION":
      return removeSection(state, action);
    case "REMOVE_PAGE":
      return removePage(state, action);
    case "MOVE_SECTION":
      return moveSection(state, action);
    case "CANCEL_CONSEQUENCE":
      return { ...state, pendingConsequence: null, error: null };
    case "SAVE_REQUEST": {
      const validation = validateStructureDraft(state.value);
      return validation
        ? withError(state, validation)
        : { ...state, status: "saving", error: null, pendingConsequence: null };
    }
    case "SAVE_SUCCEEDED": {
      const committed = cloneDashboardStructure(action.savedValue ?? state.value);
      return {
        ...state,
        baseline: committed,
        value: cloneDashboardStructure(committed),
        status: "clean",
        error: null,
        pendingConsequence: null,
      };
    }
    case "SAVE_FAILED":
      return withError(state, normalizeError(action.error, "STRUCTURE_SAVE_FAILED"));
    case "DISCARD":
      return {
        ...state,
        value: cloneDashboardStructure(state.baseline),
        status: "clean",
        error: null,
        pendingConsequence: null,
      };
    case "STAY":
      return {
        ...state,
        status: structureChanged(state) ? "dirty" : "clean",
        error: null,
        pendingConsequence: null,
      };
    case "SUSPEND":
      return {
        ...state,
        status: "suspended",
        suspendedStatus: state.status,
        restoration: clone(action.restoration ?? state.restoration),
      };
    case "RESUME":
      return {
        ...state,
        status: state.suspendedStatus ?? (structureChanged(state) ? "dirty" : "clean"),
        suspendedStatus: null,
      };
    default:
      throw new Error(`Unknown Structure draft action: ${String(action?.type)}`);
  }
}

export default function StructureAuthoring({ draft, disabled = false, onAction }) {
  const pages = draft?.value?.pages ?? [];
  const busy = disabled || draft?.status === "saving";
  const dirty = ACTIVE_STATUSES.has(draft?.status);
  return (
    <section className="structure-authoring" aria-labelledby="structure-authoring-title">
      <header className="build-surface-heading">
        <div>
          <p className="eyebrow">Structure draft</p>
          <h2 id="structure-authoring-title">Pages and sections</h2>
        </div>
        <span className="build-draft-status" data-status={draft?.status ?? "clean"}>
          {draft?.status === "saving" ? "Saving Structure" : dirty ? "Unsaved Structure" : "Structure saved"}
        </span>
      </header>
      {draft?.error && <p className="build-operation-error" role="alert">{draft.error.message}</p>}
      <div className="structure-page-list">
        {pages.map((page, pageIndex) => (
          <section className="structure-page-card" key={page.id} data-page-id={page.id}>
            <header>
              <strong>{page.label || page.title || "Untitled Page"}</strong>
              <div className="structure-inline-actions" aria-label={`${page.label || page.id} Page actions`}>
                <button type="button" disabled={busy || pageIndex === 0} onClick={() => onAction?.({ type: "REORDER_PAGE", pageId: page.id, direction: "earlier", input: "keyboard" })}>Move earlier</button>
                <button type="button" disabled={busy || pageIndex === pages.length - 1} onClick={() => onAction?.({ type: "REORDER_PAGE", pageId: page.id, direction: "later", input: "keyboard" })}>Move later</button>
              </div>
            </header>
            <ol>
              {(page.sections ?? []).map((section, sectionIndex) => (
                <li key={section.id} data-section-id={section.id}>
                  <span>{section.title || "Untitled Section"}</span>
                  <div className="structure-inline-actions" aria-label={`${section.title || section.id} Section actions`}>
                    <button type="button" disabled={busy || sectionIndex === 0} onClick={() => onAction?.({ type: "REORDER_SECTION", pageId: page.id, sectionId: section.id, direction: "earlier", input: "keyboard" })}>Move earlier</button>
                    <button type="button" disabled={busy || sectionIndex === page.sections.length - 1} onClick={() => onAction?.({ type: "REORDER_SECTION", pageId: page.id, sectionId: section.id, direction: "later", input: "keyboard" })}>Move later</button>
                  </div>
                </li>
              ))}
            </ol>
            <button type="button" className="secondary" disabled={busy} onClick={() => onAction?.({ type: "REQUEST_ADD_SECTION", pageId: page.id })}>Add section</button>
          </section>
        ))}
      </div>
      <button type="button" className="secondary" disabled={busy} onClick={() => onAction?.({ type: "REQUEST_ADD_PAGE" })}>Add page</button>
      <footer className="build-surface-actions">
        <button type="button" disabled={busy || !dirty} onClick={() => onAction?.({ type: "SAVE_REQUEST" })}>Save Structure</button>
        <button type="button" className="secondary" disabled={busy || !dirty} onClick={() => onAction?.({ type: "DISCARD" })}>Discard Structure</button>
      </footer>
    </section>
  );
}

function updateStructure(state, updater) {
  const value = cloneDashboardStructure(state.value);
  const error = updater(value);
  if (error) return withError(state, error);
  return { ...state, value, status: "dirty", error: null, pendingConsequence: null };
}

function reorderStructure(state, collection, id, direction, notFoundCode, pageId = null) {
  const index = collection.findIndex((entry) => entry?.id === id);
  if (index < 0) return withError(state, issue(notFoundCode, "The requested structure target no longer exists."));
  const offset = direction === "earlier" ? -1 : direction === "later" ? 1 : 0;
  const target = index + offset;
  if (!offset || target < 0 || target >= collection.length) return state;
  const value = cloneDashboardStructure(state.value);
  const nextCollection = pageId ? findPage(value, pageId).sections : value.pages;
  const [entry] = nextCollection.splice(index, 1);
  nextCollection.splice(target, 0, entry);
  return { ...state, value, status: "dirty", error: null };
}

function requestSectionRemoval(state, action) {
  const section = findSection(state.value, action.pageId, action.sectionId);
  if (!section) return withError(state, issue("SECTION_NOT_FOUND", "The Section no longer exists."));
  return {
    ...state,
    error: null,
    pendingConsequence: {
      kind: "remove-section",
      pageId: action.pageId,
      sectionId: action.sectionId,
      chartIds: (section.panels ?? []).map((panel) => panel.chart?.id ?? panel.chartId).filter(Boolean),
    },
  };
}

function removeSection(state, action) {
  const page = findPage(state.value, action.pageId);
  const index = page?.sections?.findIndex(({ id }) => id === action.sectionId) ?? -1;
  if (!page || index < 0) return withError(state, issue("SECTION_NOT_FOUND", "The Section no longer exists."));
  if (page.sections.length === 1) return withError(state, issue("FINAL_SECTION_PROTECTED", "A Page must retain at least one Section."));
  const section = page.sections[index];
  if ((section.panels?.length ?? 0) > 0 && !action.disposition) {
    return withError(state, issue("SECTION_DISPOSITION_REQUIRED", "Choose what happens to the charts in this Section."));
  }
  return updateStructure(state, (value) => {
    const nextPage = findPage(value, action.pageId);
    const nextIndex = nextPage.sections.findIndex(({ id }) => id === action.sectionId);
    const [removed] = nextPage.sections.splice(nextIndex, 1);
    if (action.disposition === "merge-above") nextPage.sections[nextIndex - 1].panels.push(...(removed.panels ?? []));
    if (action.disposition === "merge-below") nextPage.sections[Math.min(nextIndex, nextPage.sections.length - 1)].panels.unshift(...(removed.panels ?? []));
    return null;
  });
}

function removePage(state, action) {
  if ((state.value.pages?.length ?? 0) === 1) {
    return withError(state, issue("FINAL_PAGE_PROTECTED", "The final Page cannot be removed."));
  }
  const page = findPage(state.value, action.pageId);
  if (!page) return withError(state, issue("PAGE_NOT_FOUND", "The Page no longer exists."));
  const containsPanels = page.sections?.some((section) => (section.panels?.length ?? 0) > 0);
  if (containsPanels && !action.disposition) {
    return withError(state, issue("PAGE_DISPOSITION_REQUIRED", "Choose what happens to the Page content."));
  }
  return updateStructure(state, (value) => {
    value.pages.splice(value.pages.findIndex(({ id }) => id === action.pageId), 1);
    return null;
  });
}

function moveSection(state, action) {
  if (action.pageId === action.targetPageId) return state;
  const source = findPage(state.value, action.pageId);
  const target = findPage(state.value, action.targetPageId);
  const section = findSection(state.value, action.pageId, action.sectionId);
  if (!source || !target || !section) return withError(state, issue("MOVE_TARGET_INVALID", "Choose an available destination Page."));
  if (source.sections.length === 1) return withError(state, issue("FINAL_SECTION_PROTECTED", "The source Page must retain a Section."));
  return updateStructure(state, (value) => {
    const nextSource = findPage(value, action.pageId);
    const nextTarget = findPage(value, action.targetPageId);
    const index = nextSource.sections.findIndex(({ id }) => id === action.sectionId);
    const [moved] = nextSource.sections.splice(index, 1);
    const targetIndex = Number.isInteger(action.targetIndex) ? action.targetIndex : nextTarget.sections.length;
    nextTarget.sections.splice(Math.max(0, Math.min(targetIndex, nextTarget.sections.length)), 0, moved);
    return null;
  });
}

function cloneDashboardStructure(value) {
  return clone(value ?? { pages: [] });
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function findPage(value, pageId) {
  return (value?.pages ?? []).find(({ id }) => id === pageId);
}

function findSection(value, pageId, sectionId) {
  return findPage(value, pageId)?.sections?.find(({ id }) => id === sectionId);
}

function allSections(value) {
  return (value?.pages ?? []).flatMap((page) => page.sections ?? []);
}

function validId(value) {
  return typeof value === "string" && value.trim() !== "";
}

function issue(code, message, retryable = false) {
  return { code, message, retryable };
}

function normalizeError(error, fallbackCode) {
  return {
    code: error?.code ?? fallbackCode,
    message: error?.message ?? "The Structure draft could not be saved.",
    retryable: error?.retryable !== false,
  };
}

function withError(state, error) {
  return { ...state, status: "error", error };
}

function structureChanged(state) {
  return JSON.stringify(state.baseline) !== JSON.stringify(state.value);
}
