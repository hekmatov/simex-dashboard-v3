export function createFullscreenSwipe({ dismiss, isPhone = () => globalThis.innerWidth <= 767 } = {}) {
  let start = null;
  const pointers = new Set();
  return {
    down(event) {
      if (event.pointerType !== "touch" || !isPhone()) return;
      pointers.add(event.pointerId);
      const target = event.target;
      const blocked = target?.closest?.("button, a, input, select, textarea, [role='slider'], .chart-zoom-guard, .echarts-renderer, canvas, svg, .chart-image-view");
      if (pointers.size !== 1 || blocked) { start = null; return; }
      // Never steal a scroll from content that has its own scrollable overflow.
      let node = target;
      while (node && node !== event.currentTarget) {
        if (node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1) { start = null; return; }
        node = node.parentElement;
      }
      start = { id: event.pointerId, x: event.clientX, y: event.clientY };
    },
    up(event) {
      const origin = start;
      pointers.delete(event.pointerId);
      start = null;
      if (!origin || origin.id !== event.pointerId || pointers.size) return;
      const dy = event.clientY - origin.y;
      if (dy >= 80 && Math.abs(event.clientX - origin.x) <= dy / 2) dismiss?.();
    },
    cancel(event) { pointers.delete(event.pointerId); start = null; },
  };
}
