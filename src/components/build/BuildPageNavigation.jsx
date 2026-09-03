import React from "react";

import { previewBuildStructureConsequences } from "./buildLayoutDraft.js";
import BuildLayoutCreateDialog from "./BuildLayoutCreateDialog.jsx";

export function clearPageActionState() {
  return {
    pageActionMenu: null,
    command: null,
    value: "",
    acknowledged: false,
  };
}

export default function BuildPageNavigation({ dashboard = { pages: [] }, pages = dashboard.pages ?? [], activePageId, disabled = false, onSelectPage, onPageReorder, onAddPage, onPageCommand }) {
  const [dragPageId, setDragPageId] = React.useState(null);
  const [pageActionMenu, setPageActionMenu] = React.useState(null);
  const [command, setCommand] = React.useState(null);
  const [value, setValue] = React.useState("");
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [createRequest, setCreateRequest] = React.useState(null);
  const labelFor = (page) => page.label ?? page.title ?? "Untitled page";
  const actionPage = pages.find(({ id }) => id === pageActionMenu?.pageId);
  const destinations = pages.filter((page) => page.id !== actionPage?.id && !page.landing);
  const [proofDisposition, proofTargetPageId] = command === "remove-page" ? value.split(":") : [null, value];
  const proof = actionPage && command
    ? previewBuildStructureConsequences(dashboard, { kind: command, pageId: actionPage.id, targetPageId: proofTargetPageId, disposition: proofDisposition })
    : null;

  const closePageActions = () => {
    const reset = clearPageActionState();
    setPageActionMenu(reset.pageActionMenu);
    setCommand(reset.command);
    setValue("");
    setAcknowledged(reset.acknowledged);
  };
  const start = (next) => {
    setCommand(next);
    setAcknowledged(false);
    setValue(next === "rename-page" ? labelFor(actionPage) : next === "remove-page" ? "delete-charts" : destinations[0]?.id ?? "");
  };

  React.useEffect(() => {
    if (pageActionMenu && pageActionMenu.pageId !== activePageId) closePageActions();
  }, [activePageId, pageActionMenu]);

  React.useEffect(() => {
    if (!pageActionMenu) return undefined;
    const closeOnOutsideInteraction = (event) => {
      if (event.type === "keydown") {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
      }
      if (event.type === "pointerdown" && event.target.closest?.(".build-page-action-menu, .build-page-tab")) return;
      closePageActions();
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
      closePageActions();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 300;
    const top = Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 8));
    setCommand(null);
    setAcknowledged(false);
    setPageActionMenu({
      pageId: page.id,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8)),
      top,
      maxHeight: Math.max(0, window.innerHeight - top - 8),
    });
  };

  const selectPage = (page, event) => {
    if (page.id === activePageId) {
      togglePageActions(page, event);
      return;
    }
    closePageActions();
    onSelectPage?.(page.id);
  };

  const apply = () => {
    if (command === "rename-page") onPageCommand?.({ type: command, pageId: actionPage.id, label: value });
    if (command === "merge-page") onPageCommand?.({ type: command, pageId: actionPage.id, targetPageId: value });
    if (command === "remove-page") {
      const [disposition, targetPageId] = value.split(":");
      onPageCommand?.({ type: command, pageId: actionPage.id, disposition, targetPageId });
    }
    closePageActions();
  };

  return <><nav className="build-page-tabs build-page-navigation dashboard-command-page-scroller" aria-label="Dashboard pages" data-build-page-navigation="anchored">
    <div className="build-page-tab-scroller">{pages.map((page, index) => {
      const active = page.id === activePageId;
      const label = labelFor(page);
      const menuOpen = active && pageActionMenu?.pageId === page.id;
      return <div className={`build-page-tab-item${active ? " active" : ""}${dragPageId === page.id ? " dragging" : ""}`} key={page.id} onDragOver={(event) => { if (dragPageId) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (dragPageId && dragPageId !== page.id) onPageReorder?.(dragPageId, index); setDragPageId(null); }}>
        <button type="button" className={active ? "active build-page-tab" : "secondary build-page-tab"} disabled={disabled} draggable={!disabled} aria-current={active ? "page" : undefined} aria-expanded={active ? menuOpen : undefined} onClick={(event) => selectPage(page, event)} onDragStart={(event) => { setDragPageId(page.id); event.dataTransfer.setData("text/plain", page.id); }} onDragEnd={() => setDragPageId(null)}>{label}</button>
        {menuOpen && <div className="build-page-action-menu" role="group" aria-label={`${label} Page actions`} style={{ left: pageActionMenu.left, top: pageActionMenu.top, maxHeight: pageActionMenu.maxHeight }}>
          {!command ? <>
            <button type="button" onClick={() => start("rename-page")}>Rename</button>
            <button type="button" disabled={disabled || index === 0} onClick={() => { closePageActions(); onPageReorder?.(page.id, index - 1); }}>Move earlier</button>
            <button type="button" disabled={disabled || index === pages.length - 1} onClick={() => { closePageActions(); onPageReorder?.(page.id, index + 1); }}>Move later</button>
            <button type="button" disabled={disabled || page.landing || destinations.length === 0} onClick={() => start("merge-page")}>Merge</button>
            <button type="button" className="danger" disabled={disabled || page.landing || pages.length === 1} title={pages.length === 1 ? "The final Page cannot be removed." : undefined} onClick={() => start("remove-page")}>Remove</button>
          </> : <div className="build-page-command-form"><h3>{command === "rename-page" ? "Rename Page" : command === "merge-page" ? "Merge Page" : "Remove Page"}</h3>{command === "rename-page" ? <label>Page name<input value={value} onChange={(event) => setValue(event.target.value)} /></label> : command === "merge-page" ? <label>Destination Page<select value={value} onChange={(event) => setValue(event.target.value)}>{destinations.map((candidate) => <option key={candidate.id} value={candidate.id}>{labelFor(candidate)}</option>)}</select></label> : <label>Content disposition<select value={value} onChange={(event) => setValue(event.target.value)}><option value="delete-charts">Delete placed charts</option>{destinations.map((candidate) => <option key={candidate.id} value={`move-sections:${candidate.id}`}>Move sections to {labelFor(candidate)}</option>)}</select></label>}{proof && <section className="structure-named-proof" aria-label="Named consequences"><strong>Affected charts</strong><p>{proof.charts.join(", ") || "None"}</p><strong>Chrono Groups</strong><p>{proof.chronoGroups.join(", ") || "None"}</p><strong>Scenes</strong><p>{proof.scenes.join(", ") || "None"}</p><p>{proof.summary}</p></section>}{command !== "rename-page" && <label className="structure-confirm-check"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />I understand these named consequences.</label>}<button type="button" disabled={command !== "rename-page" && !acknowledged} onClick={apply}>Confirm</button><button type="button" className="secondary" onClick={() => { setCommand(null); setAcknowledged(false); }}>Cancel</button></div>}
        </div>}
      </div>;
    })}</div>
    <button type="button" className="secondary build-page-add-pinned" disabled={disabled} onClick={(event) => setCreateRequest({ invoker: event.currentTarget })}>Add page</button>
  </nav><BuildLayoutCreateDialog
    open={Boolean(createRequest)}
    kind="page"
    invoker={createRequest?.invoker}
    onCancel={() => setCreateRequest(null)}
    onSubmit={(name) => {
      setCreateRequest(null);
      onAddPage?.(name);
    }}
  /></>;
}
