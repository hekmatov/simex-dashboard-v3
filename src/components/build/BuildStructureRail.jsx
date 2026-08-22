import React from "react";

import { createDelayedTreeActivation, focusedTreeKeyAfterCollapse, selectionKey, visibleBuildTreeNodes } from "./buildTreeInteraction.js";


function allExpanded(dashboard) {
  return new Set((dashboard.pages ?? []).flatMap((page) => [
    `page:${page.id}`,
    ...(page.sections ?? []).map((section) => `page:${page.id}/section:${section.id}`),
  ]));
}

export default function BuildStructureRail({ dashboard = {}, selection, disabled = false, onSelect, onActivate, onRename, onRenameDirtyChange }) {
  const [expandedKeys, setExpandedKeys] = React.useState(() => allExpanded(dashboard));
  const [focusedKey, setFocusedKey] = React.useState(() => selectionKey(selection));
  const [renameKey, setRenameKey] = React.useState("");
  const [renameValue, setRenameValue] = React.useState("");
  const refs = React.useRef(new Map());
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
      if (disabled) return;
      if (event.key === "ArrowDown" && nodes[index + 1]) { event.preventDefault(); focus(nodes[index + 1].key); }
      if (event.key === "ArrowUp" && nodes[index - 1]) { event.preventDefault(); focus(nodes[index - 1].key); }
      if (event.key === "ArrowRight" && node.hasChildren) { event.preventDefault(); if (!expanded) toggle(node.key); else if (nodes[index + 1]) focus(nodes[index + 1].key); }
      if (event.key === "ArrowLeft") { event.preventDefault(); if (node.hasChildren && expanded) toggle(node.key); else if (node.parentKey) focus(node.parentKey); }
      if (event.key === "Enter") { event.preventDefault(); void activate(selectionFor(node)); }
      if (event.key === "F2") { event.preventDefault(); void beginRename(node); }
      if (event.key === "Escape" && isRenaming) { event.preventDefault(); cancelRename(node); }
    };
    return <li
      key={node.key}
      ref={(element) => {
        if (element) refs.current.set(node.key, element);
        else refs.current.delete(node.key);
      }}
      role="treeitem"
      className="build-tree-item-wrap"
      data-build-node-kind={node.kind}
      aria-label={label}
      aria-expanded={node.hasChildren ? expanded : undefined}
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      tabIndex={isRenaming ? -1 : activeTab ? 0 : -1}
      onFocus={(event) => {
        if (event.target === event.currentTarget) setFocusedKey(node.key);
      }}
      onKeyDown={keyDown}
      onClick={(event) => {
        if (event.target.closest('[role="treeitem"]') !== event.currentTarget) return;
        if (disabled || isRenaming || event.defaultPrevented) return;
        controller.click(() => void activate(selectionFor(node)));
      }}
      onDoubleClick={(event) => {
        if (event.target.closest('[role="treeitem"]') !== event.currentTarget) return;
        if (disabled || isRenaming || event.defaultPrevented) return;
        controller.doubleClick(() => void beginRename(node));
      }}
    >
      <div className={`build-tree-row${selected ? " is-selected" : ""}${isRenaming ? " is-renaming" : ""}`}>
        {node.hasChildren ? (
          <button
            type="button"
            className="build-tree-caret"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
            tabIndex={-1}
            disabled={disabled}
            aria-expanded={expanded}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              toggle(node.key);
            }}
            onDoubleClick={(event) => event.stopPropagation()}
          ><span aria-hidden="true" /></button>
        ) : <span className="build-tree-caret-spacer" aria-hidden="true" />}
        <span className="build-tree-kind-icon" data-build-tree-icon={node.kind} aria-hidden="true" />
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
        ) : <span className="build-tree-label">{label}</span>}
      </div>
      {node.hasChildren && expanded && <ul role="group" className="build-tree-group">{nodes.filter((item) => item.parentKey === node.key).map(row)}</ul>}
    </li>;
  };
  return <nav className="build-structure-rail" aria-label="Dashboard structure"><div className="build-region-heading"><p className="eyebrow">Structure</p><h2>Dashboard</h2></div><ul role="tree" className="build-structure-list build-tree-root">{nodes.filter((node) => node.parentKey === null).map(row)}</ul>{(dashboard.chronoGroups?.length ?? 0) > 0 && <section className="build-chrono-groups" aria-labelledby="build-chrono-groups-heading"><h3 id="build-chrono-groups-heading">Chrono Groups</h3><ul className="build-structure-list">{dashboard.chronoGroups.map((group) => <li key={group.id}><button type="button" className={selection?.kind === "chronoGroup" && selection.chronoGroupId === group.id ? "active" : "secondary"} disabled={disabled} onClick={() => void activate({ kind: "chronoGroup", chronoGroupId: group.id })}>{group.name || "Unnamed chrono group"}</button></li>)}</ul></section>}</nav>;
}
