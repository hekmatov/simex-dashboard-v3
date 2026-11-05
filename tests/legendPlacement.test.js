import assert from 'node:assert/strict';
import test from 'node:test';
import { LEGEND_PLACEMENTS, resolveLegendPlacement, nearestLegendPlacement, legendDragPoint } from '../src/charting/rendering/legendPlacement.js';

const input = { chartBounds: { x: 0, y: 0, width: 500, height: 360 }, plotBounds: { x: 55, y: 10, width: 420, height: 310 }, legendSize: { width: 100, height: 30 } };
test('21 explicit anchors reserve only their exterior side and interior legends overlay', () => {
  assert.equal(LEGEND_PLACEMENTS.length, 21);
  for (const placement of LEGEND_PLACEMENTS) {
    const r = resolveLegendPlacement({ ...input, placement });
    assert.ok(r.rect.x >= 4 && r.rect.y >= 4, placement);
    assert.ok(r.rect.x + r.rect.width <= 496 && r.rect.y + r.rect.height <= 356, placement);
    if (placement.startsWith('inside-')) assert.deepEqual(r.plotBounds, input.plotBounds);
    else if (placement.startsWith('above-')) assert.ok(r.plotBounds.y > input.plotBounds.y);
    else if (placement.startsWith('below-')) assert.ok(r.plotBounds.height < input.plotBounds.height);
    else if (placement.startsWith('left-')) assert.ok(r.plotBounds.x > input.plotBounds.x);
    else assert.ok(r.plotBounds.width < input.plotBounds.width);
  }
});
test('offset clamping does not mutate authored values; enlarged panels restore positions', () => {
  const offsets = { offsetX: 100, offsetY: -1000 };
  const r = resolveLegendPlacement({ ...input, placement: 'inside-top-left', offsets });
  assert.equal(r.rect.x, input.plotBounds.x + 8 + 100);
  assert.equal(r.rect.y, 4);
  assert.deepEqual(offsets, { offsetX: 100, offsetY: -1000 });
});
test('nearest anchor uses Euclidean centers and current preset then fixed order on ties', () => {
  const candidates = ['above-left', 'below-right'].map(placement => ({ placement, rect: { x: 20, y: 30, width: 100, height: 30 } }));
  assert.equal(nearestLegendPlacement({ droppedRect: candidates[0].rect, candidates, currentPlacement: 'below-right' }).placement, 'below-right');
  assert.equal(nearestLegendPlacement({ droppedRect: candidates[0].rect, candidates: [...candidates].reverse() }).placement, 'above-left');
});
test('viewport pointer conversion preserves grab offset under scaling and scrolling', () => {
  assert.deepEqual(legendDragPoint({ clientX: 260, clientY: 190 }, { left: 100, top: 70, width: 400, height: 300 }, { width: 800, height: 600 }, { x: 12, y: 8 }), { x: 308, y: 232 });
});
test('outside anchors clear axis labels while retaining the original chart chrome gutter', () => {
  const plotGutters={left:25,right:10,bottom:22,top:0};
  const below=resolveLegendPlacement({...input,placement:'below-center',plotGutters});
  assert.equal(below.rect.y,below.plotBounds.y+below.plotBounds.height+22+8);
  const left=resolveLegendPlacement({...input,placement:'left-middle',plotGutters});
  assert.equal(left.rect.x+left.rect.width+8,left.plotBounds.x-25);
});
