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

test("Unit Orbit prefers an anchored vertical placement for the Dashboard Map", () => {
  const anchor = rect(120, 180, 360, 220);
  const result = orbitModule.positionUnitOrbit({
    anchorRect: anchor,
    orbitSize: { width: 210, height: 340 },
    viewport: { width: 1000, height: 900 },
    preferVertical: true,
  });

  assert.equal(result.side, "below");
  assert.equal(result.top, anchor.bottom + 12);
  assert.equal(intersects(rightRect(result, 210), anchor), false);
});

test("Unit Orbit clips beside-chart placement above a protected transaction footer", () => {
  const footer = rect(0, 700, 1200, 900);
  const result = orbitModule.positionUnitOrbit({
    anchorRect: rect(100, 100, 500, 420),
    orbitSize: { width: 400, height: 760 },
    viewport: { width: 1200, height: 900 },
    protectedRects: [footer],
  });

  assert.equal(result.side, "right");
  assert.equal(result.top, 100);
  assert.equal(result.maxHeight, 588);
  assert.equal(intersects(rightRect(result, 400), footer), false);
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

test("layout restoration reveals the attached chart without changing editor focus", () => {
  assert.equal(typeof orbitModule?.revealUnitOrbitAnchor, "function");
  const calls = [];
  const anchor = {
    scrollIntoView(options) {
      calls.push(options);
    },
  };
  const documentRef = {
    querySelectorAll(selector) {
      assert.equal(selector, "[data-build-placement-id]");
      return [{ dataset: { buildPlacementId: "panel-a" } }, anchor];
    },
  };
  anchor.dataset = { buildPlacementId: "panel-b" };

  orbitModule.revealUnitOrbitAnchor("panel-b", {
    documentRef,
    schedule(callback) {
      callback();
    },
  });

  assert.deepEqual(calls, [{ block: "center", inline: "nearest", behavior: "auto" }]);
});

test("closing Unit Orbit restores the pre-editor viewport without changing DOM focus", () => {
  assert.equal(typeof orbitModule?.captureUnitOrbitReturnState, "function");
  assert.equal(typeof orbitModule?.restoreUnitOrbitReturnState, "function");
  const calls = [];
  const focusTarget = {
    focus(options) {
      calls.push(["focus", options]);
    },
  };
  const windowRef = {
    scrollX: 18,
    scrollY: 684,
    scrollTo(options) {
      calls.push(["scroll", options]);
    },
  };
  const state = orbitModule.captureUnitOrbitReturnState({ windowRef, focusTarget });
  assert.deepEqual(state, { scrollLeft: 18, scrollTop: 684 });

  orbitModule.restoreUnitOrbitReturnState(state, {
    windowRef,
    schedule(callback) {
      callback();
    },
  });
  assert.deepEqual(calls, [
    ["scroll", { left: 18, top: 684, behavior: "auto" }],
  ]);
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
