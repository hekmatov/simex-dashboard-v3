import { LEGEND_PLACEMENTS, canonicalLegendPlacement } from '../presentation/legendPlacementContract.js';
export { LEGEND_PLACEMENTS };
const clamp = (n, low, high) => Math.min(Math.max(low, high), Math.max(low, n));
const align = (start, length, size, anchor) => start + (['center', 'middle'].includes(anchor) ? (length - size) / 2 : ['right', 'bottom'].includes(anchor) ? length - size : 0);
export function constrainLegendRect(rect, bounds) {
  return { ...rect, x: clamp(rect.x, bounds.x + 4, bounds.x + bounds.width - rect.width - 4), y: clamp(rect.y, bounds.y + 4, bounds.y + bounds.height - rect.height - 4) };
}
export function resolveLegendPlacement({ placement, offsets = {}, chartBounds: c, plotBounds: base, legendSize: size, plotGutters: gutters = {} }) {
  const p = canonicalLegendPlacement(placement);
  const parts = p.split('-');
  const width = size.width, height = size.height;
  const plot = { ...base };
  const gap = 8;
  const horizontalBand = Math.min(height + gap, Math.max(0, base.height * 0.4));
  const verticalBand = Math.min(width + gap, Math.max(0, base.width * 0.4));
  if (parts[0] === 'above') { plot.y += horizontalBand; plot.height -= horizontalBand; }
  if (parts[0] === 'below') plot.height -= horizontalBand;
  if (parts[0] === 'left') { plot.x += verticalBand; plot.width -= verticalBand; }
  if (parts[0] === 'right') plot.width -= verticalBand;
  let x, y;
  if (parts[0] === 'inside') {
    x = align(plot.x + gap, Math.max(0, plot.width - gap * 2), width, parts[2]);
    y = align(plot.y + gap, Math.max(0, plot.height - gap * 2), height, parts[1]);
  } else if (['above', 'below'].includes(parts[0])) {
    x = align(plot.x, plot.width, width, parts[1]);
    y = parts[0] === 'above' ? base.y - (gutters.top ?? 0) : plot.y + plot.height + (gutters.bottom ?? 0) + gap;
  } else {
    x = parts[0] === 'left' ? base.x - (gutters.left ?? 0) : plot.x + plot.width + (gutters.right ?? 0) + gap;
    y = align(plot.y, plot.height, height, parts[1]);
  }
  const zeroRect = constrainLegendRect({ x, y, width, height }, c);
  const rect = constrainLegendRect({ ...zeroRect, x: zeroRect.x + (offsets.offsetX ?? 0), y: zeroRect.y + (offsets.offsetY ?? 0) }, c);
  return { placement: p, rect, zeroRect, plotBounds: plot, valid: width <= c.width-8 && height <= c.height-8 };
}
export function nearestLegendPlacement({ droppedRect: r, candidates, currentPlacement }) {
  const center = v => [v.x + v.width / 2, v.y + v.height / 2];
  const [x, y] = center(r);
  return [...candidates].filter(c => LEGEND_PLACEMENTS.includes(c.placement)).sort((a, b) => {
    const dist = v => { const [cx, cy] = center(v.rect); return (cx-x)**2 + (cy-y)**2; };
    const delta = dist(a) - dist(b);
    return Math.abs(delta) > 1e-7 ? delta : a.placement === currentPlacement ? -1 : b.placement === currentPlacement ? 1 : LEGEND_PLACEMENTS.indexOf(a.placement) - LEGEND_PLACEMENTS.indexOf(b.placement);
  })[0] ?? null;
}
export function legendDragPoint(event, viewport, size, grab = { x: 0, y: 0 }) {
  return { x: (event.clientX - viewport.left) * size.width / viewport.width - grab.x, y: (event.clientY - viewport.top) * size.height / viewport.height - grab.y };
}
