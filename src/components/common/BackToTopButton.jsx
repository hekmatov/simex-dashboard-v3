import React from "react";

function mainScrollState(windowRef, documentRef) {
  return { top: documentRef.scrollingElement?.scrollTop ?? windowRef.scrollY ?? 0, height: windowRef.innerHeight };
}

function blocked(documentRef) {
  return Boolean(documentRef.fullscreenElement) || [...documentRef.querySelectorAll('[aria-modal="true"], dialog[open]')]
    .some(element => element.getClientRects().length > 0 && !element.closest("[hidden]"));
}

export function observeDashboardScroll({ windowRef, documentRef, onChange }) {
  let frame = 0;
  const update = () => {
    frame = 0;
    const { top, height } = mainScrollState(windowRef, documentRef);
    onChange(height > 0 && top > height && !blocked(documentRef));
  };
  const schedule = () => { if (!frame) frame = windowRef.requestAnimationFrame(update); };
  windowRef.addEventListener("scroll", schedule, { passive: true });
  windowRef.addEventListener("resize", schedule);
  windowRef.addEventListener("pageshow", schedule);
  documentRef.addEventListener?.("fullscreenchange", schedule);
  windowRef.visualViewport?.addEventListener("resize", schedule);
  const observer = windowRef.MutationObserver && documentRef.body
    ? new windowRef.MutationObserver(schedule) : null;
  observer?.observe(documentRef.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-modal", "hidden", "open"] });
  update();
  return () => {
    windowRef.removeEventListener("scroll", schedule);
    windowRef.removeEventListener("resize", schedule);
    windowRef.removeEventListener("pageshow", schedule);
    documentRef.removeEventListener?.("fullscreenchange", schedule);
    windowRef.visualViewport?.removeEventListener("resize", schedule);
    observer?.disconnect();
    if (frame) windowRef.cancelAnimationFrame(frame);
  };
}

export function returnToDashboardTop({ windowRef, focusTarget }) {
  focusTarget?.focus({ preventScroll: true });
  windowRef.scrollTo({ top: 0, left: windowRef.scrollX,
    behavior: windowRef.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
}

export default function BackToTopButton({ enabled, navigationKey, frameRef }) {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    if (!enabled || typeof window === "undefined") { setVisible(false); return undefined; }
    return observeDashboardScroll({ windowRef: window, documentRef: document, onChange: setVisible });
  }, [enabled, navigationKey]);
  if (!enabled || !visible) return null;
  return <button type="button" className="secondary dashboard-back-to-top" aria-label="Back to top" title="Back to top"
    onClick={() => returnToDashboardTop({ windowRef: window,
      focusTarget: frameRef.current?.querySelector('[aria-label="Dashboard mode"] button[aria-pressed="true"]:not(:disabled)')
        ?? frameRef.current?.querySelector("main[tabindex]"),
    })}>↑ Back to top</button>;
}
