import React from "react";

import { useOperationStatus } from "./OperationStatusProvider.jsx";

const RIGHT_DRAWER_OFFSETS = Object.freeze({
  look: "min(400px, 42vw)",
  map: "404px",
});

const useBrowserLayoutEffect = typeof window === "undefined"
  ? React.useEffect
  : React.useLayoutEffect;

export default function OperationStatusViewport({ rightDrawer = null }) {
  const { dismissOperation, snapshot } = useOperationStatus();
  const [footerOffset, setFooterOffset] = React.useState(0);

  useBrowserLayoutEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const footer = document.querySelector(".dashboard-footer");
      if (!footer) {
        setFooterOffset(0);
        return;
      }
      const rect = footer.getBoundingClientRect();
      const viewportBottom = window.visualViewport
        ? window.visualViewport.offsetTop + window.visualViewport.height
        : window.innerHeight;
      const overlap = rect.bottom > 0 && rect.top < viewportBottom
        ? Math.max(0, viewportBottom - rect.top)
        : 0;
      setFooterOffset(Math.ceil(overlap));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);
    const footer = document.querySelector(".dashboard-footer");
    const observer = footer && typeof ResizeObserver === "function"
      ? new ResizeObserver(schedule)
      : null;
    if (footer) {
      observer?.observe(footer);
      if (footer.parentElement) observer?.observe(footer.parentElement);
    }
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [snapshot.announcement?.revision]);

  const geometry = {
    "--operation-status-drawer-offset": RIGHT_DRAWER_OFFSETS[rightDrawer] ?? "0px",
    "--operation-status-footer-offset": `${footerOffset}px`,
    right: "calc(var(--operation-status-drawer-offset) + max(16px, env(safe-area-inset-right)))",
    bottom: "calc(var(--operation-status-footer-offset) + max(16px, env(safe-area-inset-bottom)))",
  };
  const announcement = snapshot.announcement;

  return (
    <div
      className="operation-status-viewport"
      data-right-drawer={rightDrawer ?? "none"}
      style={geometry}
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
}

function statusLabel(status) {
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  return "Working";
}
