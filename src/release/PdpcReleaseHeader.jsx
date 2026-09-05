import React from "react";

import pdpcLockupUrl from "./assets/pdpc-lockup.png";

const useBrowserLayoutEffect = typeof window === "undefined"
  ? React.useEffect
  : React.useLayoutEffect;

export default function PdpcReleaseHeader({
  profile,
  pages = [],
  activePage,
  onPageRequest,
}) {
  const disclaimerRef = React.useRef(null);
  const headerRef = React.useRef(null);

  useBrowserLayoutEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return undefined;
    const root = document.documentElement;
    const media = window.matchMedia("(max-width: 720px)");
    const update = () => {
      const disclaimerHeight = disclaimerRef.current?.getBoundingClientRect().height ?? 0;
      const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
      const offset = disclaimerHeight + (media.matches ? 0 : headerHeight);
      root.style.setProperty("--simex-view-only-sticky-offset", `${offset}px`);
    };
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    if (disclaimerRef.current) observer?.observe(disclaimerRef.current);
    if (headerRef.current) observer?.observe(headerRef.current);
    media.addEventListener?.("change", update);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer?.disconnect();
      media.removeEventListener?.("change", update);
      window.removeEventListener("resize", update);
      root.style.removeProperty("--simex-view-only-sticky-offset");
    };
  }, []);

  return (
    <>
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
      <header
        ref={headerRef}
        className="pdpc-release-header"
        data-pdpc-release-header={profile.variant}
      >
        <img
          className="pdpc-release-logo"
          src={pdpcLockupUrl}
          width="1394"
          height="834"
          alt="Pandemic and Disaster Preparedness Center (PDPC)"
        />
        <nav className="pdpc-release-pages" aria-label="Dashboard pages">
          {pages.map((page) => {
            const active = page.id === activePage?.id;
            return (
              <button
                key={page.id}
                type="button"
                data-dashboard-page-id={page.id}
                aria-current={active ? "page" : undefined}
                onClick={() => onPageRequest?.(page.id)}
              >
                {page.label ?? page.title ?? page.id}
              </button>
            );
          })}
        </nav>
        <span className="pdpc-release-tag">Simulation exercise</span>
      </header>
    </>
  );
}
