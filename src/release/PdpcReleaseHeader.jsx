import React from "react";

import pdpcLogoUrl from "./assets/pdpc-logo.png";

const useBrowserLayoutEffect = typeof window === "undefined"
  ? React.useEffect
  : React.useLayoutEffect;

export default function PdpcReleaseDisclaimer() {
  const disclaimerRef = React.useRef(null);

  useBrowserLayoutEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return undefined;
    const root = document.documentElement;
    const update = () => {
      const disclaimerHeight = disclaimerRef.current?.getBoundingClientRect().height ?? 0;
      root.style.setProperty("--simex-view-only-sticky-offset", `${disclaimerHeight}px`);
    };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    if (disclaimerRef.current) observer?.observe(disclaimerRef.current);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      root.style.removeProperty("--simex-view-only-sticky-offset");
    };
  }, []);

  return (
    <aside
      ref={disclaimerRef}
      className="pdpc-release-disclaimer"
      aria-label="Exercise disclaimer"
    >
      <span className="pdpc-release-disclaimer__texture" aria-hidden="true">
        Fictional     Fictional     Fictional     Fictional     Fictional     Fictional
      </span>
      <span className="pdpc-release-disclaimer__statement">
        Fictional scenario · Exercise use only
      </span>
    </aside>
  );
}

export function PdpcDashboardHeader({
  profile,
  pages = [],
  activePage,
  onPageRequest,
}) {
  return (
    <header
      className="dashboard-header pdpc-dashboard-header"
      data-pdpc-dashboard-header={profile.variant}
    >
      <div className="pdpc-dashboard-identity">
        <p>Pandemic &amp; Disaster Preparedness Center</p>
        <h1>WCPH HeV-A26 Simulation</h1>
      </div>
      <nav className="pdpc-dashboard-pages" aria-label="Dashboard pages">
        {pages.map((page) => {
          const active = page.id === activePage?.id;
          return (
            <button
              key={page.id}
              type="button"
              data-dashboard-page-id={page.id}
              aria-current={active ? "page" : undefined}
              aria-label={pageAccessibleLabel(page)}
              onClick={() => onPageRequest?.(page.id)}
            >
              {pageLabel(page)}
            </button>
          );
        })}
      </nav>
      <img
        className="pdpc-dashboard-logo"
        src={pdpcLogoUrl}
        width="1721"
        height="1003"
        alt="Pandemic and Disaster Preparedness Center (PDPC)"
      />
    </header>
  );
}

function pageLabel(page) {
  if (page.id === "socio_economic") return "Socio-Economic Information";
  return page.label ?? page.title ?? page.id;
}

function pageAccessibleLabel(page) {
  const label = pageLabel(page);
  return page.id === "socio_economic" ? label : `${label} information`;
}
