import React from "react";
import { createPortal } from "react-dom";

import {
  useOperationStatusActions,
  useOperationStatusSnapshot,
} from "./OperationStatusProvider.jsx";
import {
  RIGHT_SIDE_DRAWER_CHANGE_EVENT,
  RIGHT_SIDE_DRAWER_SELECTOR,
} from "../common/RightSideDrawer.jsx";

const RIGHT_DRAWER_SELECTORS = Object.freeze({
  look: ".look-drawer",
  map: ".dashboard-map-panel",
});

const useBrowserLayoutEffect = typeof window === "undefined"
  ? React.useEffect
  : React.useLayoutEffect;

export default function OperationStatusViewport({ rightDrawer = null, theme = null }) {
  const { dismissOperation } = useOperationStatusActions();
  const snapshot = useOperationStatusSnapshot();
  const [footerOffset, setFooterOffset] = React.useState(0);
  const [drawerOffset, setDrawerOffset] = React.useState(0);
  const [activeDrawerId, setActiveDrawerId] = React.useState(null);

  useBrowserLayoutEffect(() => {
    let frame = 0;
    let observedDrawer = null;
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
      if (!frame) frame = window.requestAnimationFrame(update);
    }) : null;
    const update = () => {
      frame = 0;
      const footer = document.querySelector(".dashboard-footer");
      const viewportBottom = window.visualViewport
        ? window.visualViewport.offsetTop + window.visualViewport.height
        : window.innerHeight;
      const footerRect = footer?.getBoundingClientRect();
      const overlap = footerRect?.bottom > 0 && footerRect.top < viewportBottom
        ? Math.max(0, viewportBottom - footerRect.top)
        : 0;
      setFooterOffset(Math.ceil(overlap));

      const drawer = activeRightSideDrawer(document)
        ?? legacyRightSideDrawer(document, rightDrawer);
      if (drawer !== observedDrawer) {
        if (observedDrawer) observer?.unobserve(observedDrawer);
        observedDrawer = drawer;
        if (observedDrawer) observer?.observe(observedDrawer);
      }
      setActiveDrawerId(drawer?.dataset?.rightSideDrawer ?? rightDrawer ?? null);
      setDrawerOffset(measureOperationStatusDrawerOffset({
        viewportWidth: window.innerWidth,
        drawer,
      }));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener(RIGHT_SIDE_DRAWER_CHANGE_EVENT, schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    const footer = document.querySelector(".dashboard-footer");
    if (footer) {
      observer?.observe(footer);
      if (footer.parentElement) observer?.observe(footer.parentElement);
    }
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener(RIGHT_SIDE_DRAWER_CHANGE_EVENT, schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [rightDrawer, snapshot.announcement?.revision]);

  const geometry = {
    "--operation-status-drawer-offset": `${drawerOffset}px`,
    "--operation-status-footer-offset": `${footerOffset}px`,
    right: "calc(var(--operation-status-drawer-offset) + max(16px, env(safe-area-inset-right)))",
    bottom: "calc(var(--operation-status-footer-offset) + max(16px, env(safe-area-inset-bottom)))",
  };
  const announcement = snapshot.announcement;

  const viewport = (
    <div
      className="operation-status-viewport"
      data-right-drawer={activeDrawerId ?? rightDrawer ?? "none"}
      data-dashboard-style={theme?.dashboardStyle}
      data-dashboard-color-profile={theme?.dashboardColorProfile}
      data-chart-color-mode={theme?.chartColorMode}
      data-appearance-preference={theme?.appearancePreference}
      data-resolved-appearance={theme?.resolvedAppearance}
      style={{
        ...theme?.cssVariables,
        ...theme?.styleVariables,
        ...geometry,
      }}
    >
      <span
        className="visually-hidden"
        data-live-region="polite"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement?.politeness === "polite" ? announcement.message : ""}
      </span>
      <span
        className="visually-hidden"
        data-live-region="assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        {announcement?.politeness === "assertive" ? announcement.message : ""}
      </span>
      <div className="operation-status-stack" aria-label="Operation status">
        {snapshot.notices.map((notice) => (
          <article
            key={notice.key}
            className="operation-status-notice"
            data-operation-status={notice.status}
            data-operation-intent={notice.intent}
            aria-busy={notice.status === "working" || undefined}
          >
            <div className="operation-status-notice__heading">
              <strong>{notice.label}</strong>
              <span>{statusLabel(notice.status)}</span>
            </div>
            <p>{notice.message}</p>
            <button
              type="button"
              className="operation-status-notice__dismiss"
              aria-label={`Dismiss ${notice.label} status`}
              onClick={() => dismissOperation(notice.key)}
            >
              Dismiss
            </button>
          </article>
        ))}
      </div>
    </div>
  );
  return typeof document === "undefined"
    ? viewport
    : createPortal(viewport, document.body);
}

export function activeRightSideDrawer(ownerDocument = document) {
  return [...(ownerDocument?.querySelectorAll?.(RIGHT_SIDE_DRAWER_SELECTOR) ?? [])]
    .filter((drawer) => drawer.getClientRects?.().length !== 0)
    .at(-1) ?? null;
}

function legacyRightSideDrawer(ownerDocument, rightDrawer) {
  const drawerSelector = RIGHT_DRAWER_SELECTORS[rightDrawer];
  return drawerSelector ? ownerDocument?.querySelector?.(drawerSelector) : null;
}

export function measureOperationStatusDrawerOffset({
  viewportWidth,
  drawer = null,
  drawerRect = drawer?.getBoundingClientRect?.(),
} = {}) {
  if (!Number.isFinite(viewportWidth) || viewportWidth <= 0) return 0;
  const sharedDrawerWidth = typeof drawer?.dataset?.rightSideDrawer === "string"
    ? Number(drawer.offsetWidth)
    : 0;
  if (Number.isFinite(sharedDrawerWidth) && sharedDrawerWidth > 0) {
    return Math.ceil(Math.min(viewportWidth, sharedDrawerWidth));
  }
  if (!drawerRect) return 0;
  const left = Number(drawerRect.left);
  const right = Number(drawerRect.right);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
  const visibleLeft = Math.max(0, Math.min(viewportWidth, left));
  const visibleRight = Math.max(0, Math.min(viewportWidth, right));
  if (visibleRight <= visibleLeft) return 0;
  const rightInset = viewportWidth - visibleRight;
  if (visibleLeft <= 16 && rightInset <= 16) return 0;
  return Math.ceil(viewportWidth - visibleLeft);
}

function statusLabel(status) {
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  return "Working";
}
