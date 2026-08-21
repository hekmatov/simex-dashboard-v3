import React from "react";

import { SimExIcon } from "../common/SimExIcon.js";
import { createDelayedTreeActivation, selectionKey, visibleBuildTreeNodes } from "./buildTreeInteraction.js";

const iconForKind = { page: "addTab", section: "section", chart: "chartMixed" };

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
  const toggle = (key) => setExpandedKeys((old) => {
    const next = new Set(old);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
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
      if (event.key === "ArrowDown" && nodes[index + 1]) { event.preventDefault(); focus(nodes[index + 1].key); }
      if (event.key === "ArrowUp" && nodes[index - 1]) { event.preventDefault(); focus(nodes[index - 1].key); }
      if (event.key === "ArrowRight" && node.hasChildren) { event.preventDefault(); if (!expanded) toggle(node.key); else if (nodes[index + 1]) focus(nodes[index + 1].key); }
      if (event.key === "ArrowLeft") { event.preventDefault(); if (node.hasChildren && expanded) toggle(node.key); else if (node.parentKey) focus(node.parentKey); }
      if (event.key === "Enter") { event.preventDefault(); void activate(selectionFor(node)); }
      if (event.key === "F2") { event.preventDefault(); void beginRename(node); }
      if (event.key === "Escape" && isRenaming) { event.preventDefault(); cancelRename(node); }
    };
    return <li key={node.key} className="build-tree-item-wrap">
      <div className={`build-tree-row${selected ? " is-selected" : ""}${isRenaming ? " is-renaming" : ""}`} data-build-node-kind={node.kind} aria-selected={selected}>
        {node.hasChildren ? <button type="button" className="build-tree-caret" aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`} aria-expanded={expanded} disabled={disabled} onClick={() => toggle(node.key)}>⌄</button> : <span className="build-tree-caret-spacer" aria-hidden="true" />}
        <span data-build-tree-icon={node.kind}><SimExIcon iconId={iconForKind[node.kind]} size={16} /></span>
        {isRenaming ? <input autoFocus aria-label={`Rename ${node.kind} ${label}`} value={renameValue} onChange={(event) => { setRenameValue(event.target.value); onRenameDirtyChange?.(event.target.value.trim() !== label.trim()); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void commitRename(node); } if (event.key === "Escape") { event.preventDefault(); cancelRename(node); } }} onBlur={() => { if (renameValue.trim() && renameValue.trim() !== label) void commitRename(node); else cancelRename(node); }} /> : <button ref={(element) => { if (element) refs.current.set(node.key, element); else refs.current.delete(node.key); }} type="button" role="treeitem" className="build-tree-label" data-build-node-kind={node.kind} aria-expanded={node.hasChildren ? expanded : undefined} aria-selected={selected} tabIndex={activeTab ? 0 : -1} disabled={disabled} onFocus={() => setFocusedKey(node.key)} onKeyDown={keyDown} onClick={() => controller.click(() => void activate(selectionFor(node)))} onDoubleClick={() => controller.doubleClick(() => void beginRename(node))}>{label}</button>}
      </div>
      {node.hasChildren && expanded && <ul role="group" className="build-tree-group">{nodes.filter((item) => item.parentKey === node.key).map(row)}</ul>}
    </li>;
  };
  return <nav className="build-structure-rail" aria-label="Dashboard structure"><div className="build-region-heading"><p className="eyebrow">Structure</p><h2>Dashboard</h2></div><ul role="tree" className="build-structure-list build-tree-root">{nodes.filter((node) => node.parentKey === null).map(row)}</ul>{(dashboard.timeSyncGroups?.length ?? 0) > 0 && <section className="build-time-groups" aria-labelledby="build-time-groups-heading"><h3 id="build-time-groups-heading">Time groups</h3><ul className="build-structure-list">{dashboard.timeSyncGroups.map((group) => <li key={group.id}><button type="button" className={selection?.kind === "timeGroup" && selection.groupId === group.id ? "active" : "secondary"} disabled={disabled} onClick={() => void activate({ kind: "timeGroup", groupId: group.id })}>{group.name || "Unnamed time group"}</button></li>)}</ul></section>}</nav>;
}
