import React from "react";

import {
  BUILD_LAYOUT_MOVE_MIME,
  buildSiblingMove,
  canonicalMove,
  createBuildMoveDragSession,
  createDelayedTreeActivation,
  decodeBuildMovePayload,
  encodeBuildMovePayload,
  focusedTreeKeyAfterCollapse,
  moveSourceForNode,
  resolveBuildTreeDropEdge,
  selectionKey,
  visibleBuildTreeNodes,
} from "./buildTreeInteraction.js";


function allExpanded(dashboard) {
  return new Set((dashboard.pages ?? []).flatMap((page) => [
    `page:${page.id}`,
    ...(page.sections ?? []).map((section) => `page:${page.id}/section:${section.id}`),
  ]));
}

export default function BuildStructureRail({ dashboard = {}, selection, disabled = false, onSelect, onActivate, onRename, onRenameDirtyChange, onMove, inspector = null }) {
  const [expandedKeys, setExpandedKeys] = React.useState(() => allExpanded(dashboard));
  const [focusedKey, setFocusedKey] = React.useState(() => selectionKey(selection));
  const [renameKey, setRenameKey] = React.useState("");
  const [renameValue, setRenameValue] = React.useState("");
  const [dropIndicator, setDropIndicator] = React.useState(null);
  const refs = React.useRef(new Map());
  const dragSessionRef = React.useRef(null);
  if (!dragSessionRef.current) dragSessionRef.current = createBuildMoveDragSession();
  const controller = React.useMemo(() => createDelayedTreeActivation({}), []);
  const nodes = visibleBuildTreeNodes(dashboard, expandedKeys);
  const selectedKey = selectionKey(selection);

  React.useEffect(() => () => controller.dispose(), [controller]);
  const activate = React.useCallback(async (next, options = {}) => {
    if (onActivate) return Boolean(await onActivate(next, options));
    onSelect?.(next);
    return true;
  }, [onActivate, onSelect]);
  const focus = (key) => {
    setFocusedKey(key);
    requestAnimationFrame(() => refs.current.get(key)?.focus());
  };
  const toggle = (key) => {
    const collapsing = expandedKeys.has(key);
    const nextFocusedKey = collapsing
      ? focusedTreeKeyAfterCollapse(focusedKey, key)
      : focusedKey;
    setExpandedKeys((old) => {
      const next = new Set(old);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    if (collapsing && nextFocusedKey !== focusedKey) focus(nextFocusedKey);
  };
  const labelFor = (node) => {
    const page = (dashboard.pages ?? []).find((item) => item.id === node.pageId);
    if (node.kind === "page") return page?.label || page?.title || "Untitled page";
    const section = (page?.sections ?? []).find((item) => item.id === node.sectionId);
    if (node.kind === "section") return section?.title || "Untitled section";
    const placement = (section?.panels ?? []).find((item) => item.id === node.placementId);
    return (placement?.chart ?? placement)?.title || "Untitled chart";
  };
  const selectionFor = (node) => node.kind === "page"
    ? { kind: "page", pageId: node.pageId }
    : node.kind === "section"
      ? { kind: "section", pageId: node.pageId, sectionId: node.sectionId }
      : { kind: "chart", pageId: node.pageId, sectionId: node.sectionId, placementId: node.placementId, chartId: node.chartId };
  const beginRename = async (node) => {
    const next = selectionFor(node);
    if (disabled || !(await activate(next, { intent: "rename" }))) return;
    setFocusedKey(node.key);
    setRenameKey(node.key);
    setRenameValue(labelFor(node));
  };
  const cancelRename = (node) => {
    setRenameKey("");
    onRenameDirtyChange?.(false);
    focus(node.key);
  };
  const commitRename = async (node) => {
    const value = renameValue.trim();
    if (value && value !== labelFor(node)) {
      const saved = await onRename?.(selectionFor(node), value);
      if (!saved) return;
    }
    cancelRename(node);
  };
  const row = (node) => {
    const label = labelFor(node);
    const index = nodes.findIndex((item) => item.key === node.key);
    const selected = selectedKey === node.key;
    const activeTab = focusedKey ? focusedKey === node.key : index === 0;
    const expanded = expandedKeys.has(node.key);
    const isRenaming = renameKey === node.key;
    const keyDown = (event) => {
      if (event.target.closest('[role="treeitem"]') !== event.currentTarget) return;
      if (disabled) return;
      if (event.altKey && ["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"].includes(event.key)) {
        const direction = ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 1;
        const move = buildSiblingMove(dashboard, moveSourceForNode(node), direction);
        if (move) {
          event.preventDefault();
          onMove?.(move);
        }
        return;
      }
      if (event.key === "ArrowDown" && nodes[index + 1]) { event.preventDefault(); focus(nodes[index + 1].key); }
      if (event.key === "ArrowUp" && nodes[index - 1]) { event.preventDefault(); focus(nodes[index - 1].key); }
      if (event.key === "ArrowRight" && node.hasChildren) { event.preventDefault(); if (!expanded) toggle(node.key); else if (nodes[index + 1]) focus(nodes[index + 1].key); }
      if (event.key === "ArrowLeft") { event.preventDefault(); if (node.hasChildren && expanded) toggle(node.key); else if (node.parentKey) focus(node.parentKey); }
      if (event.key === "Enter") { event.preventDefault(); void activate(selectionFor(node)); }
      if (event.key === "F2") { event.preventDefault(); void beginRename(node); }
      if (event.key === "Escape" && isRenaming) { event.preventDefault(); cancelRename(node); }
    };
    return <React.Fragment key={node.key}><li
      key={node.key}
      ref={(element) => {
        if (element) refs.current.set(node.key, element);
        else refs.current.delete(node.key);
      }}
      role="treeitem"
      className="build-tree-item-wrap"
      data-build-node-kind={node.kind}
      data-build-node-id={node.placementId ?? node.sectionId ?? node.pageId}
      data-build-placement-id={node.kind === "chart" ? node.placementId : undefined}
      data-dashboard-map-node-key={node.key}
      aria-label={label}
      aria-expanded={node.hasChildren ? expanded : undefined}
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      tabIndex={isRenaming ? -1 : activeTab ? 0 : -1}
      draggable={!disabled && !isRenaming}
      onFocus={(event) => {
        if (event.target === event.currentTarget) setFocusedKey(node.key);
      }}
      onKeyDown={keyDown}
      onClick={(event) => {
        if (event.target.closest('[role="treeitem"]') !== event.currentTarget) return;
        if (disabled || isRenaming || event.defaultPrevented) return;
        controller.click(() => void activate(selectionFor(node)));
      }}
      onDragStart={(event) => {
        if (event.target.closest('[role="treeitem"]') !== event.currentTarget) return;
        if (disabled || isRenaming) return;
        dragSessionRef.current.start(moveSourceForNode(node));
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(BUILD_LAYOUT_MOVE_MIME, encodeBuildMovePayload(moveSourceForNode(node)));
      }}
      onDragEnd={(event) => {
        if (event.target.closest('[role="treeitem"]') !== event.currentTarget) return;
        dragSessionRef.current.clear();
        setDropIndicator(null);
      }}
      onDoubleClick={(event) => {
        if (event.target.closest('[role="treeitem"]') !== event.currentTarget) return;
        if (disabled || isRenaming || event.defaultPrevented) return;
        controller.doubleClick(() => void beginRename(node));
      }}
      data-build-drop-edge={dropIndicator?.key === node.key ? dropIndicator.edge : undefined}
      onDragOver={(event) => {
        const source = dragSessionRef.current.current()
          ?? decodeBuildMovePayload(event.dataTransfer?.getData(BUILD_LAYOUT_MOVE_MIME));
        if (!legalDrop(source, node)) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        const edge = resolveBuildTreeDropEdge({
          clientY: event.clientY,
          rect,
          ...treeDropSiblingContext(dashboard, source, node),
        });
        setDropIndicator({ key: node.key, edge });
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        const source = dragSessionRef.current.resolve(event.dataTransfer?.getData(BUILD_LAYOUT_MOVE_MIME));
        if (!legalDrop(source, node)) return;
        event.preventDefault();
        event.stopPropagation();
        const edge = resolveBuildTreeDropEdge({
          clientY: event.clientY,
          rect: event.currentTarget.getBoundingClientRect(),
          ...treeDropSiblingContext(dashboard, source, node),
        });
        const move = moveForTreeDrop(dashboard, source, node, edge);
        setDropIndicator(null);
        dragSessionRef.current.clear();
        if (move) onMove?.(move);
      }}
    >
      <div className={`build-tree-row${selected ? " is-selected" : ""}${isRenaming ? " is-renaming" : ""}`}>
        {node.hasChildren && (
          <button
            type="button"
            className="build-tree-caret"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
            tabIndex={-1}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              toggle(node.key);
            }}
            onDoubleClick={(event) => event.stopPropagation()}
          ><span aria-hidden="true" /></button>
        )}
        {!node.hasChildren && <span className="build-tree-caret-spacer" aria-hidden="true" />}
        {isRenaming ? (
          <input
            autoFocus
            aria-label={`Rename ${node.kind} ${label}`}
            value={renameValue}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              setRenameValue(event.target.value);
              onRenameDirtyChange?.(event.target.value.trim() !== label.trim());
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") { event.preventDefault(); void commitRename(node); }
              if (event.key === "Escape") { event.preventDefault(); cancelRename(node); }
            }}
            onBlur={(event) => {
              if (event.relatedTarget?.closest?.('[role="dialog"]')) return;
              if (renameValue.trim() && renameValue.trim() !== label) void commitRename(node);
              else cancelRename(node);
            }}
          />
        ) : <span className="build-tree-label" title={label}>{label}</span>}
      </div>
      {node.hasChildren && expanded && <ul role="group" className="build-tree-group">{nodes.filter((item) => item.parentKey === node.key).map(row)}</ul>}
    </li>{selected && node.kind !== "chart" && inspector ? <li className="dashboard-map-inline-inspector">{inspector}</li> : null}</React.Fragment>;
  };
  return <>
    <nav className="build-structure-rail" aria-label="Dashboard structure"><ul role="tree" className="build-structure-list build-tree-root">{nodes.filter((node) => node.parentKey === null).map(row)}</ul></nav>
  </>;
}

function legalDrop(source, node) {
  if (!source || !node) return false;
  if (source.kind === "page") return node.kind === "page";
  if (source.kind === "section") return node.kind === "page" || node.kind === "section";
  return node.kind === "section" || node.kind === "chart";
}

function moveForTreeDrop(dashboard, source, node, edge) {
  if (source.kind === "page") {
    const index = (dashboard.pages ?? []).findIndex(({ id }) => id === node.pageId);
    return canonicalMove(source, { index: index + (edge === "after" ? 1 : 0) });
  }
  const page = (dashboard.pages ?? []).find(({ id }) => id === node.pageId);
  if (source.kind === "section") {
    const index = node.kind === "page"
      ? (page?.sections ?? []).length
      : (page?.sections ?? []).findIndex(({ id }) => id === node.sectionId) + (edge === "after" ? 1 : 0);
    return canonicalMove(source, { pageId: node.pageId, sectionId: null, index });
  }
  const section = (page?.sections ?? []).find(({ id }) => id === node.sectionId);
  const index = node.kind === "section"
    ? (section?.panels ?? []).length
    : (section?.panels ?? []).findIndex(({ id }) => id === node.placementId) + (edge === "after" ? 1 : 0);
  return canonicalMove(source, { pageId: node.pageId, sectionId: node.sectionId, index });
}

function treeDropSiblingContext(dashboard, source, node) {
  if (source?.kind === "page" && node?.kind === "page") {
    return {
      sameParent: true,
      sourceIndex: (dashboard.pages ?? []).findIndex(({ id }) => id === source.pageId),
      targetIndex: (dashboard.pages ?? []).findIndex(({ id }) => id === node.pageId),
    };
  }

  if (source?.kind === "section" && node?.kind === "section" && source.pageId === node.pageId) {
    const page = (dashboard.pages ?? []).find(({ id }) => id === node.pageId);
    return {
      sameParent: true,
      sourceIndex: (page?.sections ?? []).findIndex(({ id }) => id === source.sectionId),
      targetIndex: (page?.sections ?? []).findIndex(({ id }) => id === node.sectionId),
    };
  }

  if (
    source?.kind === "panel"
    && node?.kind === "chart"
    && source.pageId === node.pageId
    && source.sectionId === node.sectionId
  ) {
    const page = (dashboard.pages ?? []).find(({ id }) => id === node.pageId);
    const section = (page?.sections ?? []).find(({ id }) => id === node.sectionId);
    return {
      sameParent: true,
      sourceIndex: (section?.panels ?? []).findIndex(({ id }) => id === source.placementId),
      targetIndex: (section?.panels ?? []).findIndex(({ id }) => id === node.placementId),
    };
  }

  return { sameParent: false, sourceIndex: null, targetIndex: null };
}
