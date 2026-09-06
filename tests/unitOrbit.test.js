import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("Unit Orbit anchors itself to the visible chart when a placement is rendered twice", () => {
  assert.equal(typeof orbitModule?.findUnitOrbitAnchor, "function");
  const hiddenAnchor = {
    dataset: { buildPlacementId: "confirmed-cases" },
    getBoundingClientRect: () => rect(0, 0, 0, 0),
  };
  const visibleAnchor = {
    dataset: { buildPlacementId: "confirmed-cases" },
    getBoundingClientRect: () => rect(32, 180, 742, 598),
  };
  const documentRef = {
    querySelectorAll(selector) {
      assert.equal(selector, "[data-build-placement-id]");
      return [hiddenAnchor, visibleAnchor];
    },
  };

  assert.equal(
    orbitModule.findUnitOrbitAnchor("confirmed-cases", "", { documentRef }),
    visibleAnchor,
  );
});

test("Unit Orbit opens right, then left, then floats within the viewport", () => {
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
  assert.equal(right.top, rightAnchor.top);
  assert.equal(right.maxHeight, orbitSize.height);
  assert.equal(intersects(rightRect(right, orbitSize.width), rightAnchor), false);

  const leftAnchor = rect(1010, 180, 1410, 500);
  const left = orbitModule.positionUnitOrbit({
    anchorRect: leftAnchor,
    orbitSize,
    viewport,
  });
  assert.deepEqual(left, {
    side: "left",
    left: 598,
    top: 180,
    maxHeight: 620,
  });

  const fallback = orbitModule.positionUnitOrbit({
    anchorRect: rect(300, 180, 720, 500),
    orbitSize,
    viewport: { width: 1000, height: 900 },
  });
  assert.deepEqual(fallback, {
    side: "viewport-top-right",
    left: 588,
    top: 12,
    maxHeight: 620,
  });
});

test("Unit Orbit applies the same side-first positioning to the Dashboard Map", () => {
  const anchor = rect(120, 180, 360, 220);
  const result = orbitModule.positionUnitOrbit({
    anchorRect: anchor,
    orbitSize: { width: 210, height: 340 },
    viewport: { width: 1000, height: 900 },
    preferVertical: true,
  });

  assert.equal(result.side, "right");
  assert.equal(result.top, anchor.top);
  assert.equal(intersects(rightRect(result, 210), anchor), false);
});

test("Unit Orbit keeps its natural height beside a chart even near protected chrome", () => {
  const footer = rect(0, 700, 1200, 900);
  const result = orbitModule.positionUnitOrbit({
    anchorRect: rect(100, 100, 500, 420),
    orbitSize: { width: 400, height: 760 },
    viewport: { width: 1200, height: 900 },
    protectedRects: [footer],
  });

  assert.equal(result.side, "right");
  assert.equal(result.top, 100);
  assert.equal(result.maxHeight, 760);
});

test("Unit Orbit fallback caps its height at the viewport's top-right", () => {
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
    side: "viewport-top-right",
    left: 1008,
    top: 12,
    maxHeight: 876,
  });
});

test("Unit Orbit keeps a side placement anchored while capping it above the viewport edge", () => {
  const result = orbitModule.positionUnitOrbit({
    anchorRect: rect(100, 250, 500, 570),
    orbitSize: { width: 400, height: 760 },
    viewport: { width: 1200, height: 900 },
  });

  assert.deepEqual(result, {
    side: "right",
    left: 512,
    top: 250,
    maxHeight: 638,
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

test("Unit Orbit stays open for coordinated draft controls outside its surface", () => {
  const draftControl = {
    closest(selector) {
      return selector === "[data-unit-orbit-preserve-open]" ? {} : null;
    },
  };
  const orbit = { contains: () => false };

  assert.equal(
    orbitModule.isUnitOrbitOutsidePointer(orbit, draftControl),
    false,
    "saving or discarding the independent layout slot must not dismiss the chart slot",
  );
});

test("opening Orbit scrolls until both it and the chart are visible, prioritizing Orbit", () => {
  assert.equal(typeof orbitModule?.revealUnitOrbit, "function");
  const calls = [];
  const windowRef = {
    innerHeight: 900,
    scrollBy(options) {
      calls.push(options);
    },
  };
  const anchor = { getBoundingClientRect: () => rect(80, 800, 480, 920) };
  const orbit = { getBoundingClientRect: () => rect(492, 800, 892, 920) };

  orbitModule.revealUnitOrbit(anchor, orbit, { windowRef });
  assert.deepEqual(calls, [{ top: 32, left: 0, behavior: "auto" }]);

  calls.length = 0;
  const tallOrbit = { getBoundingClientRect: () => rect(492, 520, 892, 1140) };
  orbitModule.revealUnitOrbit(anchor, tallOrbit, { windowRef });
  assert.deepEqual(calls, [{ top: 252, left: 0, behavior: "auto" }]);
});

test("Unit Orbit does not scroll when it closes", () => {
  const source = readFileSync(
    new URL("../src/components/build/UnitOrbit.jsx", import.meta.url),
    "utf8",
  );
  const workspaceSource = readFileSync(
    new URL("../src/components/build/BuildWorkspace.jsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /restoreUnitOrbitReturnState|scrollIntoView/);
  assert.doesNotMatch(workspaceSource, /revealUnitOrbitAnchor/);
});

test("Unit Orbit has no autofocus, focus restoration, or keyboard dismissal", () => {
  const source = readFileSync(
    new URL("../src/components/build/UnitOrbit.jsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /\.focus\?\.|\.focus\(/);
  assert.doesNotMatch(source, /addEventListener\(["']keydown["']/);
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
