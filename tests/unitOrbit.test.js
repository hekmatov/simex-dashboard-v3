import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const orbitModule = await vite.ssrLoadModule("/src/components/build/UnitOrbit.jsx")
  .catch(() => null);
const workspaceModule = await vite.ssrLoadModule("/src/components/build/BuildWorkspace.jsx")
  .catch(() => null);
await vite.close();

const viewport = { width: 1440, height: 900 };
const orbitSize = { width: 400, height: 620 };

test("Unit Orbit measures the editor's inner scroll content", () => {
  assert.equal(
    typeof orbitModule?.resolveUnitOrbitSize,
    "function",
    "Unit Orbit must expose its content measurement",
  );
  const innerScroller = { scrollHeight: 1549 };
  const orbit = {
    scrollHeight: 278,
    getBoundingClientRect() {
      return { width: 420, height: 280 };
    },
    querySelector(selector) {
      return selector === ".unit-orbit-scroll" ? innerScroller : null;
    },
  };

  assert.deepEqual(
    orbitModule.resolveUnitOrbitSize(orbit, 1440),
    { width: 420, height: 1549 },
  );
});

test("Unit Orbit chooses right, then left, without intersecting the selected chart", () => {
  assert.equal(
    typeof orbitModule?.positionUnitOrbit,
    "function",
    "Unit Orbit placement helper must be implemented",
  );

  const rightAnchor = rect(280, 180, 680, 500);
  const right = orbitModule.positionUnitOrbit({
    anchorRect: rightAnchor,
    orbitSize,
    viewport,
  });
  assert.equal(right.side, "right");
  assert.equal(right.left, rightAnchor.right + 12);
  assert.equal(intersects(rightRect(right, orbitSize.width), rightAnchor), false);

  const leftAnchor = rect(1010, 180, 1410, 500);
  const left = orbitModule.positionUnitOrbit({
    anchorRect: leftAnchor,
    orbitSize,
    viewport,
  });
  assert.equal(left.side, "left");
  assert.equal(left.left + orbitSize.width, leftAnchor.left - 12);
  assert.equal(intersects(rightRect(left, orbitSize.width), leftAnchor), false);
});

test("Unit Orbit uses below placement when horizontal candidates cannot fit", () => {
  const anchor = rect(80, 120, 920, 430);
  const result = orbitModule.positionUnitOrbit({
    anchorRect: anchor,
    orbitSize: { width: 400, height: 500 },
    viewport: { width: 1000, height: 1000 },
    protectedRects: [rect(0, 0, 1000, 96)],
  });

  assert.equal(result.side, "below");
  assert.equal(result.top, anchor.bottom + 12);
  assert.ok(result.maxHeight >= 280);
  assert.equal(intersects(rightRect(result, 400), anchor), false);
});

test("Unit Orbit requests one recenter when no nonintersecting candidate has usable height", () => {
  const result = orbitModule.positionUnitOrbit({
    anchorRect: rect(0, 170, 768, 560),
    orbitSize,
    viewport: { width: 768, height: 700 },
    protectedRects: [rect(0, 0, 768, 150)],
  });

  assert.deepEqual(result, { needsRecenter: true });
});

test("Unit Orbit fallback docks below protected chrome and fills the viewport", () => {
  assert.equal(
    typeof orbitModule?.constrainedUnitOrbitPlacement,
    "function",
    "Unit Orbit must expose its constrained fallback placement",
  );
  const result = orbitModule.constrainedUnitOrbitPlacement({
    orbitSize: { width: 420, height: 980 },
    viewport,
    protectedRects: [rect(0, 0, 1440, 100)],
  });

  assert.deepEqual(result, {
    side: "viewport",
    left: 1008,
    top: 112,
    maxHeight: 776,
  });
});

test("Unit Orbit dismisses only pointer activity outside its surface", () => {
  assert.equal(typeof orbitModule?.isUnitOrbitOutsidePointer, "function");
  const inside = {};
  const outside = {};
  const orbit = {
    contains(target) {
      return target === inside;
    },
  };

  assert.equal(orbitModule.isUnitOrbitOutsidePointer(orbit, inside), false);
  assert.equal(orbitModule.isUnitOrbitOutsidePointer(orbit, outside), true);
  assert.equal(orbitModule.isUnitOrbitOutsidePointer(null, outside), false);
});

test("a dirty Build workspace allows only the current chart to reopen", () => {
  const current = { kind: "chart", placementId: "confirmed-cases" };
  assert.equal(
    workspaceModule.buildSelectionAllowedWhileLocked(current, current),
    true,
  );
  assert.equal(
    workspaceModule.buildSelectionAllowedWhileLocked(current, {
      kind: "chart",
      placementId: "age-distribution",
    }),
    false,
  );
});

function rect(left, top, right, bottom) {
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

function rightRect(position, width) {
  return rect(
    position.left,
    position.top,
    position.left + width,
    position.top + position.maxHeight,
  );
}

function intersects(left, right) {
  return left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top;
}
