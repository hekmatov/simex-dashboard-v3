import test from "node:test";
import assert from "node:assert/strict";
import { observeDeferredPanel, shouldDeferPanel } from "../src/components/dashboard/deferredPanelVisibility.js";
import { createFullscreenSwipe } from "../src/components/dashboard/fullscreenSwipe.js";

function fixture() {
  let callback, options, mounts = 0, disconnected = 0;
  const listeners = new Map();
  const root = { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  class Observer {
    constructor(fn, configuration) { callback = fn; options = configuration; }
    observe(value) { assert.equal(value, root); }
    disconnect() { disconnected++; }
  }
  const stop = observeDeferredPanel(root, () => mounts++, { Observer, viewportHeight: 844, reducedMotion: false });
  return { root, listeners, stop, emit: intersecting => callback([{ target: root, isIntersecting: intersecting }]), get options() { return options; }, get mounts() { return mounts; }, get disconnected() { return disconnected; } };
}

test("View observer mounts once within one viewport and cleans up", () => {
  const observed = fixture();
  assert.equal(observed.options.rootMargin, "844px 0px");
  observed.emit(false); assert.equal(observed.mounts, 0);
  observed.emit(true); observed.emit(true); assert.equal(observed.mounts, 1);
  assert.equal(observed.disconnected, 1);
  observed.stop(); assert.equal(observed.listeners.size, 0);
});
test("offscreen focus reveals immediately; removed observers cannot mount", () => {
  const focused = fixture(); focused.listeners.get("focusin")(); assert.equal(focused.mounts, 1); focused.stop();
  const removed = fixture(); removed.stop(); removed.emit(true); assert.equal(removed.mounts, 0);
});
test("phone View gives visible charts priority within the same one-viewport margin", () => {
  const callbacks = [];
  const queued = new Set();
  let mounts = 0;
  let disconnected = 0;
  const root = { addEventListener() {}, removeEventListener() {} };
  const stop = observeDeferredPanel(root, () => mounts++, {
    viewportHeight: 844,
    reducedMotion: false,
    prioritizeVisible: true,
    enqueueOverscan(mount) {
      queued.add(mount);
      return () => queued.delete(mount);
    },
    Observer: class {
      constructor(callback, { rootMargin = "0px" } = {}) { callbacks.push({ callback, rootMargin }); }
      observe() {}
      disconnect() { disconnected++; }
    },
  });
  const send = (margin, isIntersecting) => callbacks.find(entry => entry.rootMargin === margin).callback([
    { target: root, isIntersecting },
  ]);
  send("844px 0px", true);
  assert.equal(queued.size, 1);
  assert.equal(mounts, 0);
  send("844px 0px", false);
  assert.equal(queued.size, 0);
  send("844px 0px", true);
  send("0px", true);
  assert.equal(mounts, 1);
  assert.equal(queued.size, 0);
  assert.equal(disconnected, 2);
  send("844px 0px", true);
  assert.equal(mounts, 1);
  stop();
});

test("observer absence and reduced motion render eagerly", () => {
  let mounts = 0;
  observeDeferredPanel({}, () => mounts++, { Observer: null, reducedMotion: false });
  observeDeferredPanel({}, () => mounts++, { Observer: class { constructor() { throw Error("should not construct"); } }, reducedMotion: true });
  assert.equal(mounts, 2);
});
test("Build, capture/export, selected and content-height panels remain eager", () => {
  for (const input of [{ surface: "build" }, { surface: "capture" }, { surface: "export" }, { surface: "view", eager: true }, { surface: "view", selected: true }, { surface: "view", typeId: "kpi" }]) assert.equal(shouldDeferPanel(input), false);
  assert.equal(shouldDeferPanel({ surface: "view", typeId: "line" }), true);
});
function gestureEvent(id, x, y, blocked = false) {
  return { pointerType: "touch", pointerId: id, clientX: x, clientY: y, target: { closest: () => blocked }, currentTarget: {} };
}
test("fullscreen swipe dismisses vertically but leaves pinch, zoom, controls and horizontal motion alone", () => {
  let closes = 0;
  const swipe = createFullscreenSwipe({ dismiss: () => closes++, isPhone: () => true });
  swipe.down(gestureEvent(1, 30, 30)); swipe.up(gestureEvent(1, 35, 120)); assert.equal(closes, 1);
  swipe.down(gestureEvent(1, 30, 30, true)); swipe.up(gestureEvent(1, 35, 120));
  swipe.down(gestureEvent(1, 30, 30)); swipe.down(gestureEvent(2, 60, 30)); swipe.up(gestureEvent(2, 60, 150)); swipe.up(gestureEvent(1, 30, 150));
  swipe.down(gestureEvent(1, 30, 30)); swipe.up(gestureEvent(1, 150, 120));
  swipe.down(gestureEvent(1, 30, 30)); swipe.cancel(gestureEvent(1, 30, 30)); swipe.up(gestureEvent(1, 30, 140));
  assert.equal(closes, 1);
});
