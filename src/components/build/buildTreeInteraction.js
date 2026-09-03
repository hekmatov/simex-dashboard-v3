export const BUILD_LAYOUT_MOVE_MIME = "application/x-simex-build-layout-move+json";

const MOVE_KINDS = new Set(["page", "section", "panel"]);

export function createDelayedTreeActivation({ delay = 500, schedule = setTimeout, cancel = clearTimeout } = {}) {
  let timer = null;
  const clear = () => {
    if (timer === null) return;
    cancel(timer);
    timer = null;
  };
  return {
    click(activate) {
      clear();
      timer = schedule(() => {
        timer = null;
        activate?.();
      }, delay);
    },
    doubleClick(rename) {
      clear();
      rename?.();
    },
    dispose: clear,
  };
}

export function selectionKey(selection) {
  if (!selection?.kind) return "";
  if (selection.kind === "page") return `page:${selection.pageId}`;
  if (selection.kind === "section") return `page:${selection.pageId}/section:${selection.sectionId}`;
  if (selection.kind === "chart") return `page:${selection.pageId}/section:${selection.sectionId}/chart:${selection.chartId}`;
  if (selection.kind === "chronoGroup") return `chrono-group:${selection.chronoGroupId}`;
  return selection.kind;
}

export function visibleBuildTreeNodes(dashboard = {}, expandedKeys = new Set()) {
  const nodes = [];
  (dashboard.pages ?? []).forEach((page) => {
    const pageKey = `page:${page.id}`;
    const sections = page.sections ?? [];
    nodes.push({ key: pageKey, parentKey: null, depth: 1, kind: "page", pageId: page.id, hasChildren: sections.length > 0 });
    if (!expandedKeys.has(pageKey)) return;
    sections.forEach((section) => {
      const sectionKey = `${pageKey}/section:${section.id}`;
      const panels = section.panels ?? [];
      nodes.push({ key: sectionKey, parentKey: pageKey, depth: 2, kind: "section", pageId: page.id, sectionId: section.id, hasChildren: panels.length > 0 });
      if (!expandedKeys.has(sectionKey)) return;
      panels.forEach((placement) => {
        const chart = placement.chart ?? placement;
        nodes.push({ key: `${sectionKey}/chart:${chart.id}`, parentKey: sectionKey, depth: 3, kind: "chart", pageId: page.id, sectionId: section.id, placementId: placement.id, chartId: chart.id, hasChildren: false });
      });
    });
  });
  return nodes;
}

export function focusedTreeKeyAfterCollapse(focusedKey = "", collapsingKey = "") {
  if (!focusedKey || !collapsingKey) return focusedKey;
  return focusedKey === collapsingKey || focusedKey.startsWith(`${collapsingKey}/`)
    ? collapsingKey
    : focusedKey;
}

export function moveSourceForNode(node) {
  if (!node) return null;
  if (node.kind === "page") return { kind: "page", pageId: node.pageId };
  if (node.kind === "section") return { kind: "section", pageId: node.pageId, sectionId: node.sectionId };
  if (node.kind === "chart") return { kind: "panel", pageId: node.pageId, sectionId: node.sectionId, placementId: node.placementId };
  return null;
}

export function encodeBuildMovePayload(source) {
  const normalized = normalizeMoveSource(source);
  return normalized ? JSON.stringify(normalized) : "";
}

export function decodeBuildMovePayload(value) {
  try {
    return normalizeMoveSource(JSON.parse(String(value ?? "")));
  } catch {
    return null;
  }
}

export function createBuildMoveDragSession() {
  let source = null;
  return {
    start(nextSource) {
      source = normalizeMoveSource(nextSource);
      return source;
    },
    current() {
      return source;
    },
    resolve(payload) {
      return decodeBuildMovePayload(payload) ?? source;
    },
    clear() {
      source = null;
    },
  };
}

export function resolveBuildTreeDropEdge({
  clientY,
  rect,
  sameParent = false,
  sourceIndex = null,
  targetIndex = null,
} = {}) {
  const top = Number(rect?.top);
  const height = Number(rect?.height);
  const pointerY = Number(clientY);
  if (!Number.isFinite(top) || !Number.isFinite(height) || height <= 0 || !Number.isFinite(pointerY)) {
    return "after";
  }

  const midpoint = top + height / 2;
  const centerBandHalfHeight = Math.min(4, height / 4);
  if (pointerY < midpoint - centerBandHalfHeight) return "before";
  if (pointerY > midpoint + centerBandHalfHeight) return "after";

  if (
    sameParent
    && Number.isInteger(sourceIndex)
    && sourceIndex >= 0
    && Number.isInteger(targetIndex)
    && targetIndex >= 0
  ) {
    if (sourceIndex < targetIndex) return "after";
    if (sourceIndex > targetIndex) return "before";
  }
  return "after";
}

export function buildSiblingMove(dashboard, source, direction) {
  const normalized = normalizeMoveSource(source);
  if (!normalized || ![-1, 1].includes(direction)) return null;
  if (normalized.kind === "page") {
    const index = (dashboard.pages ?? []).findIndex(({ id }) => id === normalized.pageId);
    if (index < 0 || index + direction < 0 || index + direction >= dashboard.pages.length) return null;
    return canonicalMove(normalized, { index: direction < 0 ? index - 1 : index + 2 });
  }
  const page = (dashboard.pages ?? []).find(({ id }) => id === normalized.pageId);
  if (!page) return null;
  if (normalized.kind === "section") {
    const index = (page.sections ?? []).findIndex(({ id }) => id === normalized.sectionId);
    if (index < 0 || index + direction < 0 || index + direction >= page.sections.length) return null;
    return canonicalMove(normalized, { pageId: page.id, sectionId: null, index: direction < 0 ? index - 1 : index + 2 });
  }
  const section = (page.sections ?? []).find(({ id }) => id === normalized.sectionId);
  const index = (section?.panels ?? []).findIndex(({ id }) => id === normalized.placementId);
  if (index < 0 || index + direction < 0 || index + direction >= section.panels.length) return null;
  return canonicalMove(normalized, { pageId: page.id, sectionId: section.id, index: direction < 0 ? index - 1 : index + 2 });
}

export function buildMoveDestinations(dashboard, source, { pageId = null } = {}) {
  const normalized = normalizeMoveSource(source);
  if (!normalized) return [];
  if (normalized.kind === "page") {
    return (dashboard.pages ?? []).flatMap((page, index) => [
      { label: `Before ${page.label || page.title || page.id}`, target: { pageId: null, sectionId: null, index } },
      ...(index === dashboard.pages.length - 1 ? [{ label: "End of dashboard", target: { pageId: null, sectionId: null, index: dashboard.pages.length } }] : []),
    ]);
  }
  if (normalized.kind === "section") {
    return (dashboard.pages ?? []).filter(({ landing }) => !landing).flatMap((page) => {
      const sections = page.sections ?? [];
      const pageLabel = page.label || page.title || page.id;
      if (sections.length === 0) return [{ label: `${pageLabel} — empty`, target: { pageId: page.id, sectionId: null, index: 0 } }];
      return sections.flatMap((section, index) => [
        { label: `${pageLabel} — before ${section.title || section.id}`, target: { pageId: page.id, sectionId: null, index } },
        ...(index === sections.length - 1 ? [{ label: `${pageLabel} — end`, target: { pageId: page.id, sectionId: null, index: sections.length } }] : []),
      ]);
    });
  }
  return (dashboard.pages ?? []).filter(({ landing, id }) => !landing && (!pageId || id === pageId)).flatMap((page) => (page.sections ?? []).flatMap((section) => {
    const panels = section.panels ?? [];
    const prefix = `${page.label || page.title || page.id} — ${section.title || section.id}`;
    if (panels.length === 0) return [{ label: `${prefix} — empty`, target: { pageId: page.id, sectionId: section.id, index: 0 } }];
    return panels.flatMap((panel, index) => [
      { label: `${prefix} — before ${panelName(panel)}`, target: { pageId: page.id, sectionId: section.id, index } },
      ...(index === panels.length - 1 ? [{ label: `${prefix} — end`, target: { pageId: page.id, sectionId: section.id, index: panels.length } }] : []),
    ]);
  }));
}

export function canonicalMove(source, target) {
  const normalized = normalizeMoveSource(source);
  if (!normalized || !target || !Number.isInteger(target.index)) return null;
  return {
    kind: normalized.kind,
    source: {
      pageId: normalized.pageId,
      sectionId: normalized.sectionId ?? null,
      placementId: normalized.placementId ?? null,
    },
    target: {
      pageId: target.pageId ?? normalized.pageId,
      sectionId: target.sectionId ?? null,
      index: target.index,
    },
  };
}

function normalizeMoveSource(source) {
  if (!source || !MOVE_KINDS.has(source.kind) || typeof source.pageId !== "string" || !source.pageId) return null;
  if (source.kind === "page") return { kind: "page", pageId: source.pageId };
  if (typeof source.sectionId !== "string" || !source.sectionId) return null;
  if (source.kind === "section") return { kind: "section", pageId: source.pageId, sectionId: source.sectionId };
  if (typeof source.placementId !== "string" || !source.placementId) return null;
  return { kind: "panel", pageId: source.pageId, sectionId: source.sectionId, placementId: source.placementId };
}

function panelName(panel) {
  const chart = panel?.chart ?? panel;
  return chart?.title || chart?.label || chart?.id || panel?.id || "panel";
}
