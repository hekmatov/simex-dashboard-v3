import React from "react";

export default function CompactCrownDisclosure({
  id = "crown-disclosure",
  open,
  onClose,
  dashboardIdentity = {},
  activePage,
  pages = [],
  onPageRequest,
  pageActions,
}) {
  const panelRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); onClose?.(); }
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector("button, a, [tabindex]")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);
  if (!open) return null;
  return (
    <section id={id} ref={panelRef} className="crown-disclosure" aria-label="Dashboard pages and details">
      <div className="crown-disclosure__identity">
        <strong>{dashboardIdentity.title || dashboardIdentity.programLabel || "SimEx Dashboard"}</strong>
        {dashboardIdentity.scenarioLabel && <span>{dashboardIdentity.scenarioLabel}</span>}
      </div>
      <nav className="crown-disclosure__pages" aria-label="Dashboard pages">
        {pages.map((page) => {
          const active = page.id === activePage?.id;
          return (
            <button
              key={page.id}
              type="button"
              data-dashboard-page-id={page.id}
              className={active ? "active" : "secondary"}
              aria-current={active ? "page" : undefined}
              onClick={() => { onPageRequest?.(page.id); onClose?.(); }}
            >
              {page.label || page.title || page.id}
            </button>
          );
        })}
      </nav>
      {pageActions && <div className="crown-disclosure__actions">{pageActions}</div>}
      <dl className="crown-disclosure__meta">
        {dashboardIdentity.scenarioLabel && <div><dt>Scenario</dt><dd>{dashboardIdentity.scenarioLabel}</dd></div>}
        {dashboardIdentity.lastUpdated && <div><dt>Updated</dt><dd>{dashboardIdentity.lastUpdated}</dd></div>}
      </dl>
    </section>
  );
}
