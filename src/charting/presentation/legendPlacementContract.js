// This order is also the deterministic tie-break order for direct manipulation.
export const LEGEND_PLACEMENTS = Object.freeze([
  ...['top', 'middle', 'bottom'].flatMap(y => ['left', 'center', 'right'].map(x => `inside-${y}-${x}`)),
  ...['above', 'below'].flatMap(side => ['left', 'center', 'right'].map(x => `${side}-${x}`)),
  ...['left', 'right'].flatMap(side => ['top', 'middle', 'bottom'].map(y => `${side}-${y}`)),
]);
export const LEGACY_LEGEND_PLACEMENTS = Object.freeze({ top: 'above-center', bottom: 'below-center', left: 'left-middle', right: 'right-middle' });
export function canonicalLegendPlacement(value) { return Object.hasOwn(LEGACY_LEGEND_PLACEMENTS, value) ? LEGACY_LEGEND_PLACEMENTS[value] : value ?? 'automatic'; }
export function legendPlacementLabel(value) {
  if (value === 'automatic') return 'Automatic';
  return value.replace('inside-', 'Inside graph: ').replace('above-', 'Above graph: ').replace('below-', 'Below graph: ').replace(/^left-/, 'Left of graph: ').replace(/^right-/, 'Right of graph: ').replaceAll('-', ' ');
}
