import React from "react";
import { createPortal } from "react-dom";

import { SimExIcon } from "../common/SimExIcon.js";

const ORBIT_GAP = 8;
const ORBIT_MARGIN = 12;
const ORBIT_WIDTH = 300;

export default function BuildPageNavigation({
  pages = [],
  activePageId,
  pageDrafts = {},
  disabled = false,
  onSelectPage,
  onAddPage,
  onPageChange,
  onPageReorder,
  onOpenDashboardLook,
}) {
  const [openPageId, setOpenPageId] = React.useState(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [dragPageId, setDragPageId] = React.useState(null);
  const editButtonRefs = React.useRef(new Map());
  const dragPageIdRef = React.useRef(null);
  const openPage = pages.find(({ id }) => id === openPageId) ?? null;

  const labelFor = (page) => (
    pageDrafts[page.id]?.label
    ?? page.label
    ?? page.title
    ?? "Untitled page"
  );
  const closeOrbit = React.useCallback(() => {
    const pageId = openPageId;
    setOpenPageId(null);
    window.requestAnimationFrame(() => editButtonRefs.current.get(pageId)?.focus());
  }, [openPageId]);
  const openOrbit = (page) => {
    setRenameValue(labelFor(page));
    setOpenPageId(page.id);
  };

  return (
    <nav className="build-page-tabs build-page-navigation" aria-label="Dashboard pages">
      <div className="build-page-tab-scroller">
        {pages.map((page, index) => {
          const active = page.id === activePageId;
          const label = labelFor(page);
          return (
            <div
              className={`build-page-tab-item${active ? " active" : ""}${dragPageId === page.id ? " dragging" : ""}`}
              key={page.id}
              onDragOver={(event) => {
                if (!disabled && dragPageIdRef.current) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceId = dragPageIdRef.current;
                if (!disabled && sourceId && sourceId !== page.id) {
                  onPageReorder?.(sourceId, index);
                }
                dragPageIdRef.current = null;
                setDragPageId(null);
              }}
            >
              <button
                type="button"
                className={active ? "active build-page-tab" : "secondary build-page-tab"}
                disabled={disabled}
                draggable={!disabled}
                aria-current={active ? "page" : undefined}
                onClick={() => onSelectPage?.(page.id)}
                onDragStart={(event) => {
                  dragPageIdRef.current = page.id;
                  setDragPageId(page.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", page.id);
                }}
                onDragEnd={() => {
                  dragPageIdRef.current = null;
                  setDragPageId(null);
                }}
              >
                {label}
              </button>
              {active && (
                <span className="build-page-action-rail" aria-label={`${label} Page actions`}>
                  <button
                    ref={(element) => {
                      if (element) editButtonRefs.current.set(page.id, element);
                      else editButtonRefs.current.delete(page.id);
                    }}
                    type="button"
                    disabled={disabled}
                    aria-label={`Edit ${label}`}
                    title={`Edit ${label}`}
                    onClick={() => openOrbit(page)}
                  >
                    <SimExIcon iconId="edit" size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    aria-label={`Move ${label} earlier`}
                    title={`Move ${label} earlier`}
                    onClick={() => onPageReorder?.(page.id, index - 1)}
                  >
                    <SimExIcon iconId="reorderPrevious" size={16} />
                  </button>
                  <button
                    type="button"
                    disabled={disabled || index === pages.length - 1}
                    aria-label={`Move ${label} later`}
                    title={`Move ${label} later`}
                    onClick={() => onPageReorder?.(page.id, index + 1)}
                  >
                    <SimExIcon iconId="reorderNext" size={16} />
                  </button>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <button type="button" className="secondary build-add-page" disabled={disabled} onClick={onAddPage}>
        <SimExIcon iconId="addTab" size={18} />
        <span>Add page</span>
      </button>
      <button type="button" className="secondary dashboard-look-trigger" disabled={disabled} onClick={onOpenDashboardLook}>
        Dashboard look
      </button>
      {openPage && typeof document !== "undefined" && createPortal(
        <PageRenameOrbit
          page={openPage}
          label={labelFor(openPage)}
          value={renameValue}
          disabled={disabled}
          anchor={() => editButtonRefs.current.get(openPage.id)}
          onChange={setRenameValue}
          onApply={() => {
            const label = renameValue.trim();
            if (!label) return;
            onPageChange?.(openPage.id, { label });
            closeOrbit();
          }}
          onClose={closeOrbit}
        />,
        document.body,
      )}
    </nav>
  );
}

function PageRenameOrbit({
  page,
  label,
  value,
  disabled,
  anchor,
  onChange,
  onApply,
  onClose,
}) {
  const orbitRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const [position, setPosition] = React.useState(null);

  React.useLayoutEffect(() => {
    const update = () => {
      const anchorElement = anchor();
      if (!anchorElement) return;
      const anchorRect = anchorElement.getBoundingClientRect();
      const orbitHeight = orbitRef.current?.getBoundingClientRect().height || 180;
      const belowTop = anchorRect.bottom + ORBIT_GAP;
      const top = belowTop + orbitHeight <= window.innerHeight - ORBIT_MARGIN
        ? belowTop
        : Math.max(ORBIT_MARGIN, anchorRect.top - ORBIT_GAP - orbitHeight);
      const left = Math.min(
        Math.max(ORBIT_MARGIN, anchorRect.left),
        Math.max(ORBIT_MARGIN, window.innerWidth - ORBIT_MARGIN - ORBIT_WIDTH),
      );
      setPosition({ top, left });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    const anchorElement = anchor();
    if (anchorElement) observer?.observe(anchorElement);
    if (orbitRef.current) observer?.observe(orbitRef.current);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer?.disconnect();
    };
  }, [anchor]);

  React.useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <aside
      ref={orbitRef}
      className="build-page-orbit"
      aria-label={`Edit Page ${label}`}
      style={{
        left: `${position?.left ?? ORBIT_MARGIN}px`,
        top: `${position?.top ?? ORBIT_MARGIN}px`,
        visibility: position ? "visible" : "hidden",
      }}
    >
      <p className="eyebrow">Page</p>
      <h2>Rename Page</h2>
      <label>
        Page name
        <input
          ref={inputRef}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onApply();
            }
          }}
        />
      </label>
      <div className="build-page-orbit-actions">
        <button type="button" disabled={disabled || !value.trim()} onClick={onApply}>Apply</button>
        <button type="button" className="secondary" onClick={onClose}>Cancel</button>
      </div>
    </aside>
  );
}
