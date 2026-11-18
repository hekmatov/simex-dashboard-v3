export function shouldDeferPanel({ surface, eager = false, selected = false, typeId } = {}) {
  // Content-height panels stay eager so their authored height is known immediately.
  return surface === "view" && !eager && !selected
    && !["kpi", "deltaCard", "deltaList", "freeText", "image"].includes(typeId);
}

export function observeDeferredPanel(root, mount, {
  Observer = globalThis.IntersectionObserver,
  viewportHeight = globalThis.innerHeight ?? 0,
  reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
  prioritizeVisible = false,
  enqueueOverscan = enqueueDeferredOverscan,
} = {}) {
  let stopped = false;
  let observer;
  let visibleObserver;
  let cancelOverscan;
  const cancelQueued = () => {
    cancelOverscan?.();
    cancelOverscan = undefined;
  };
  const reveal = () => {
    if (stopped) return;
    stopped = true;
    cancelQueued();
    observer?.disconnect();
    visibleObserver?.disconnect();
    mount();
  };
  if (!root || typeof Observer !== "function" || reducedMotion) {
    reveal();
    return () => {};
  }
  const focus = () => reveal();
  root.addEventListener("focusin", focus);
  // Drill navigation focuses the placeholder before its chart has mounted.
  try {
    if (prioritizeVisible) {
      visibleObserver = new Observer(entries => {
        if (entries.some(entry => entry.target === root && entry.isIntersecting)) reveal();
      });
      visibleObserver.observe(root);
    }
    observer = new Observer(entries => {
      if (stopped) return;
      const entry = entries.find(entry => entry.target === root);
      if (!entry) return;
      if (!entry.isIntersecting) cancelQueued();
      else if (!prioritizeVisible) reveal();
      else cancelOverscan ??= enqueueOverscan(reveal);
    }, { rootMargin: `${Math.max(0, viewportHeight)}px 0px` });
    observer.observe(root);
  } catch { reveal(); }
  return () => {
    stopped = true;
    cancelQueued();
    observer?.disconnect();
    visibleObserver?.disconnect();
    root.removeEventListener("focusin", focus);
  };
}

const overscanMounts = new Set();
let drainScheduled = false;

function enqueueDeferredOverscan(mount) {
  overscanMounts.add(mount);
  scheduleOverscanMount();
  return () => overscanMounts.delete(mount);
}

function scheduleOverscanMount() {
  if (drainScheduled || !overscanMounts.size) return;
  drainScheduled = true;
  // Let newly visible charts paint before starting one offscreen canvas.
  const drain = () => {
    drainScheduled = false;
    const mount = overscanMounts.values().next().value;
    if (!mount) return;
    overscanMounts.delete(mount);
    mount();
    scheduleOverscanMount();
  };
  if (typeof requestAnimationFrame !== "function") {
    setTimeout(drain, 0);
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (typeof requestIdleCallback === "function") requestIdleCallback(drain, { timeout: 120 });
    else setTimeout(drain, 0);
  }));
}
