import React from "react";

import { previewBuildStructureConsequences } from "./buildLayoutDraft.js";

export default function BuildPageNavigation({ dashboard = { pages: [] }, pages = dashboard.pages ?? [], activePageId, disabled = false, initialOrbitPageId = null, onSelectPage, onPageReorder, onAddPage, onPageCommand }) {
  const [dragPageId, setDragPageId] = React.useState(null);
  const [orbitPageId, setOrbitPageId] = React.useState(initialOrbitPageId);
  const [pageActionMenu, setPageActionMenu] = React.useState(null);
  const [command, setCommand] = React.useState(null);
  const [value, setValue] = React.useState("");
  const [acknowledged, setAcknowledged] = React.useState(false);
  const labelFor = (page) => page.label ?? page.title ?? "Untitled page";
  const orbitPage = pages.find(({ id }) => id === orbitPageId);
  const destinations = pages.filter((page) => page.id !== orbitPageId && !page.landing);
  const [proofDisposition, proofTargetPageId] = command === "remove-page" ? value.split(":") : [null, value];
  const proof = orbitPage && command ? previewBuildStructureConsequences(dashboard, { kind: command, pageId: orbitPage.id, targetPageId: proofTargetPageId, disposition: proofDisposition }) : null;
  const start = (next) => {
    setCommand(next);
    setAcknowledged(false);
    setValue(next === "rename-page" ? labelFor(orbitPage) : next === "remove-page" ? "delete-charts" : destinations[0]?.id ?? "");
  };
  React.useEffect(() => {
    if (!pageActionMenu) return undefined;
    const closeOnOutsideInteraction = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && event.target.closest?.(".build-page-action-menu, .build-page-action-trigger")) return;
      setPageActionMenu(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideInteraction);
    document.addEventListener("keydown", closeOnOutsideInteraction);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideInteraction);
      document.removeEventListener("keydown", closeOnOutsideInteraction);
    };
  }, [pageActionMenu]);
  const togglePageActions = (page, event) => {
    if (pageActionMenu?.pageId === page.id) {
      setPageActionMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 220;
    setPageActionMenu({
      pageId: page.id,
      left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
      top: Math.min(rect.bottom + 8, window.innerHeight - 168),
    });
  };
  const apply = () => {
    if (command === "rename-page") onPageCommand?.({ type: command, pageId: orbitPage.id, label: value });
    if (command === "merge-page") onPageCommand?.({ type: command, pageId: orbitPage.id, targetPageId: value });
    if (command === "remove-page") {
      const [disposition, targetPageId] = value.split(":");
      onPageCommand?.({ type: command, pageId: orbitPage.id, disposition, targetPageId });
    }
    setCommand(null); setOrbitPageId(null);
  };
  return <nav className="build-page-tabs build-page-navigation dashboard-command-page-scroller" aria-label="Dashboard pages" data-build-page-navigation="anchored">
    <div className="build-page-tab-scroller">{pages.map((page, index) => { const active = page.id === activePageId; const label = labelFor(page); return <div className={`build-page-tab-item${active ? " active" : ""}${dragPageId === page.id ? " dragging" : ""}`} key={page.id} onDragOver={(event) => { if (dragPageId) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (dragPageId && dragPageId !== page.id) onPageReorder?.(dragPageId, index); setDragPageId(null); }}>
      <button type="button" className={active ? "active build-page-tab" : "secondary build-page-tab"} disabled={disabled} draggable={!disabled} aria-current={active ? "page" : undefined} onClick={() => onSelectPage?.(page.id)} onDragStart={(event) => { setDragPageId(page.id); event.dataTransfer.setData("text/plain", page.id); }} onDragEnd={() => setDragPageId(null)}>{label}</button>
      {active && <button type="button" className="secondary build-page-action-trigger" aria-label={`Page actions for ${label}`} aria-expanded={pageActionMenu?.pageId === page.id} onClick={(event) => togglePageActions(page, event)}>Page actions</button>}
      {active && pageActionMenu?.pageId === page.id && <div className="build-page-action-menu" role="group" aria-label={`${label} Page actions`} style={{ left: pageActionMenu.left, top: pageActionMenu.top }}><button type="button" aria-label={`Edit Page ${label}`} onClick={() => { setPageActionMenu(null); setOrbitPageId(page.id); setCommand(null); }}>Edit Page</button><button type="button" disabled={disabled || index === 0} aria-label={`Move ${label} earlier`} onClick={() => { setPageActionMenu(null); onPageReorder?.(page.id, index - 1); }}>Move earlier</button><button type="button" disabled={disabled || index === pages.length - 1} aria-label={`Move ${label} later`} onClick={() => { setPageActionMenu(null); onPageReorder?.(page.id, index + 1); }}>Move later</button></div>}
      {orbitPageId === page.id && <aside className="build-page-orbit" aria-label={`Page Orbit for ${label}`}>{!command ? <><button type="button" onClick={() => start("rename-page")}>Rename Page</button><button type="button" disabled={page.landing || destinations.length === 0} onClick={() => start("merge-page")}>Merge Page</button><button type="button" disabled={page.landing || pages.length === 1} title={pages.length === 1 ? "The final Page cannot be removed." : undefined} onClick={() => start("remove-page")}>Remove Page</button><button type="button" className="secondary" onClick={() => setOrbitPageId(null)}>Close</button></> : <div className="build-page-command-form"><h3>{command === "rename-page" ? "Rename Page" : command === "merge-page" ? "Merge Page" : "Remove Page"}</h3>{command === "rename-page" ? <label>Page name<input value={value} onChange={(event) => setValue(event.target.value)} /></label> : command === "merge-page" ? <label>Destination Page<select value={value} onChange={(event) => setValue(event.target.value)}>{destinations.map((candidate) => <option key={candidate.id} value={candidate.id}>{labelFor(candidate)}</option>)}</select></label> : <label>Content disposition<select value={value} onChange={(event) => setValue(event.target.value)}><option value="delete-charts">Delete placed charts</option>{destinations.map((candidate) => <option key={candidate.id} value={`move-sections:${candidate.id}`}>Move sections to {labelFor(candidate)}</option>)}</select></label>}{proof && <section className="structure-named-proof" aria-label="Named consequences"><strong>Affected charts</strong><p>{proof.charts.join(", ") || "None"}</p><strong>Chrono Groups</strong><p>{proof.chronoGroups.join(", ") || "None"}</p><strong>Scenes</strong><p>{proof.scenes.join(", ") || "None"}</p><p>{proof.summary}</p></section>}{command !== "rename-page" && <label className="structure-confirm-check"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />I understand these named consequences.</label>}<button type="button" disabled={command !== "rename-page" && !acknowledged} onClick={apply}>Confirm</button><button type="button" className="secondary" onClick={() => setCommand(null)}>Cancel</button></div>}</aside>}
    </div>; })}</div>
    <button type="button" className="secondary build-page-add-pinned" disabled={disabled} onClick={onAddPage}>Add page</button>
  </nav>;
}
