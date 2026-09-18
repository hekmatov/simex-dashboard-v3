export const DRILL_HIGHLIGHT_MS = 1600;

export function drillHighlightTarget(target) {
  if (!target) return null;
  if (target.kind === "section") return `[data-canonical-section-id="${target.id}"]`;
  if (target.kind === "chart") return `[data-canonical-panel-id="${target.id}"]`;
  return null;
}

export function navigateToDrillTarget(target, { root = typeof document === "undefined" ? null : document, windowRef = typeof window === "undefined" ? null : window } = {}) {
  const selector = drillHighlightTarget(target);
  const element = selector && root ? root.querySelector(selector) : null;
  if (!element || !windowRef) return false;
  const crown = root.querySelector(".dashboard-command-crown");
  const offset = (crown?.getBoundingClientRect().height ?? 0) + 12;
  const top = element.getBoundingClientRect().top + windowRef.scrollY - offset;
  windowRef.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  element.setAttribute("data-drill-highlight", "true");
  if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1");
  if (typeof element.focus === "function") element.focus({ preventScroll: true });
  windowRef.setTimeout(() => element.removeAttribute("data-drill-highlight"), DRILL_HIGHLIGHT_MS);
  return true;
}
