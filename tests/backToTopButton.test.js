import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const module = await vite.ssrLoadModule("/src/components/common/BackToTopButton.jsx").catch(() => null);
await vite.close();

test("Back to top uses the main viewport threshold and recalculates on resize", () => {
  assert.equal(typeof module?.observeDashboardScroll, "function");
  const { windowRef, documentRef, fire, tick, listeners } = environment();
  const states = [];
  const dispose = module.observeDashboardScroll({ windowRef, documentRef, onChange: state => states.push(state) });
  assert.equal(states.at(-1), false);
  documentRef.scrollingElement.scrollTop = 900;
  fire("scroll"); fire("scroll");
  assert.equal(states.length, 1, "raw events coalesce into one frame");
  tick();
  assert.equal(states.at(-1), false, "one viewport is still hidden");
  documentRef.scrollingElement.scrollTop = 901;
  fire("scroll"); tick();
  assert.equal(states.at(-1), true);
  windowRef.innerHeight = 1000;
  fire("resize"); tick();
  assert.equal(states.at(-1), false);
  dispose();
  assert.equal(listeners.size, 0);
});

test("activation focuses the top control and scrolls the document without changing horizontal scroll", () => {
  assert.equal(typeof module?.returnToDashboardTop, "function");
  const { windowRef, documentRef } = environment();
  const events = [];
  windowRef.scrollX = 32;
  windowRef.scrollTo = options => events.push(["scroll", options]);
  const focusTarget = { focus: options => events.push(["focus", options]) };
  windowRef.matchMedia = () => ({ matches: true });
  module.returnToDashboardTop({ windowRef, documentRef, focusTarget });
  assert.deepEqual(events, [["focus", { preventScroll: true }], ["scroll", { top: 0, left: 32, behavior: "instant" }]]);
  windowRef.matchMedia = () => ({ matches: false });
  module.returnToDashboardTop({ windowRef, documentRef, focusTarget });
  assert.equal(events.at(-1)[1].behavior, "smooth");
});

test("blocking dialogs and fullscreen suppress the control and cleanup cancels queued observation", () => {
  const { windowRef, documentRef, fire, tick } = environment();
  documentRef.scrollingElement.scrollTop = 1200;
  const states = [];
  const dispose = module.observeDashboardScroll({ windowRef, documentRef, onChange: value => states.push(value) });
  assert.equal(states.at(-1), true);
  documentRef.querySelectorAll = () => [{ getClientRects: () => [1], closest: () => null }];
  fire("scroll"); tick();
  assert.equal(states.at(-1), false);
  documentRef.querySelectorAll = () => [];
  documentRef.fullscreenElement = {};
  fire("resize"); tick();
  assert.equal(states.at(-1), false);
  const count = states.length;
  fire("scroll"); dispose(); tick();
  assert.equal(states.length, count);
});

function environment() {
  const listeners = new Map();
  let frame;
  const documentRef = { scrollingElement: { scrollTop: 0 }, querySelectorAll: () => [], fullscreenElement: null };
  const windowRef = { innerHeight: 900, scrollX: 0,
    addEventListener(name, callback, options) { if (name === "scroll") assert.equal(options.passive, true); listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); },
    requestAnimationFrame(callback) { frame = callback; return 1; }, cancelAnimationFrame() { frame = null; },
  };
  return { windowRef, documentRef, listeners, fire: name => listeners.get(name)?.(), tick() { const callback = frame; frame = null; callback?.(); } };
}
