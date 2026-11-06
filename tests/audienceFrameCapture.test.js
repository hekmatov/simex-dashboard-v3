import test from "node:test";
import assert from "node:assert/strict";
import { createAudienceFrameCaptureController, classifyAudienceVisualChange } from "../src/components/presentation/useAudienceFrameCapture.js";
import { captureAudienceElement } from "../src/components/presentation/audienceCapture.js";

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const image = "data:image/jpeg;base64,/9j/2Q==";
function harness(capture, options = {}) {
  let time = 0, next = 0;
  const timers = new Map(), listeners = new Map(), posts = [];
  const events = { addEventListener: (key, callback) => listeners.set(key, callback), removeEventListener: key => listeners.delete(key) };
  const documentRef = { ...events, visibilityState: "visible" };
  const windowRef = { ...events, innerWidth: 1600, innerHeight: 900, devicePixelRatio: 1,
    setTimeout: (callback, delay) => { const id = ++next; timers.set(id, { at: time + delay, callback }); return id; },
    clearTimeout: id => timers.delete(id),
  };
  const element = { dataset: { audienceAcceptedSequence: "3", audienceDashboardRevision: '"dashboard-1"' },
    offsetWidth: 1920, offsetHeight: 1080, getBoundingClientRect: () => ({ width: 1600, height: 900 }) };
  let warnings = 0;
  let observedChange;
  windowRef.MutationObserver = class {
    constructor(callback) { observedChange = callback; }
    observe() {}
    disconnect() { observedChange = null; }
  };
  const controller = createAudienceFrameCaptureController({ getElement: () => element,
    capture: (target, sample) => capture(target, sample()),
    now: () => time, documentRef, windowRef, streamId: "stream-1",
    publish: (type, payload) => posts.push({ type, payload }), warn: () => warnings++,
    ...options,
  });
  async function advance(ms) {
    const end = time + ms;
    for (;;) {
      const due = [...timers.entries()].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]); time = due[1].at; due[1].callback(); await flush();
    }
    time = end; await flush();
  }
  return { controller, advance, posts, element, timers, listeners, documentRef,
    warnings: () => warnings,
    surfaceChanged: () => observedChange?.(),
    visibility(visible) { documentRef.visibilityState = visible ? "visible" : "hidden"; listeners.get("visibilitychange")(); },
  };
}
test("capture settles, sleeps without more images and retains only lightweight static heartbeats", async () => {
  let count = 0;
  const h = harness(async () => { count++; return image; });
  h.controller.notify("connect");
  await h.advance(199); assert.equal(count, 0);
  await h.advance(1); assert.equal(count, 1);
  assert.equal(h.posts.filter(p => p.type === "audience_frame").length, 1);
  await h.advance(3800); assert.equal(count, 1);
  assert.equal(h.posts.at(-1).payload.status, "static");
  await h.advance(15000); assert.equal(count, 1);
  assert.equal(h.posts.filter(p => p.type === "audience_heartbeat").length, 2);
  h.controller.dispose(); assert.equal(h.timers.size, 0); assert.equal(h.listeners.size, 0);
});

test("a final seek survives an adaptive capture interval longer than the idle timeout", async () => {
  const completions = [];
  const h = harness(() => new Promise(resolve => completions.push(resolve)));
  h.controller.notify("connect");
  await h.advance(200);
  await h.advance(500); completions[0](image); await flush();
  h.controller.notify("playback-tick");
  await h.advance(4000);
  assert.equal(completions.length, 2);
  await h.advance(500); completions[1](image); await flush();
  h.element.dataset.audienceAcceptedSequence = "4";
  h.controller.notify("playback-tick");
  await h.advance(8000);
  assert.equal(completions.length, 3, "the final pending frame must render before idle sleep");
  completions[2](image); await flush();
  assert.equal(h.posts.filter(p => p.type === "audience_frame").at(-1).payload.accepted_sequence, 4);
  await h.advance(15000);
  assert.equal(completions.length, 3, "settled idle output must not keep capturing");
  h.controller.dispose();
});
test("late static-content readiness wakes the actual-surface observer after idle sleep", async () => {
  let count = 0;
  const h = harness(async () => { count++; return image; });
  h.controller.notify("connect"); await h.advance(4000); assert.equal(count, 1);
  h.surfaceChanged(); await h.advance(200); assert.equal(count, 2);
  h.controller.dispose(); h.surfaceChanged(); await h.advance(10000); assert.equal(count, 2);
});
test("playback finished/DOM notifications keep the adaptive cadence instead of resetting a200ms capture", async () => {
  let count = 0;
  const h = harness(async () => { count++; return image; });
  h.controller.notify("connect"); await h.advance(200); assert.equal(count, 1);
  h.controller.notify("playback-tick"); h.surfaceChanged();
  await h.advance(200); assert.equal(count, 1);
  await h.advance(800); assert.equal(count, 2);
  h.controller.dispose();
});
test("commit-time observer delivery before the passive playback effect cannot bypass cadence", async () => {
  let count = 0;
  const before = { structureKey: "same", frameIndex: 0 };
  const rendering = { structureKey: "same", frameIndex: 1 };
  const h = harness(async () => { count++; return image; }, {
    classifyVisualChange: () => classifyAudienceVisualChange(before, rendering),
  });
  h.controller.notify("connect"); await h.advance(200);
  h.surfaceChanged(); h.controller.notify("playback-tick");
  await h.advance(200); assert.equal(count, 1);
  await h.advance(800); assert.equal(count, 2);
  assert.equal(classifyAudienceVisualChange(before, { ...rendering, structureKey: "new" }), "state-accepted");
  h.controller.dispose();
});
test("a newer rendered revision invalidates an in-flight image without starting overlapping captures", async () => {
  const completions = [];
  const h = harness(() => new Promise(resolve => completions.push(resolve)));
  h.controller.notify("connect"); await h.advance(200);
  h.element.dataset.audienceAcceptedSequence = "4";
  h.controller.notify("state-accepted"); await h.advance(200);
  assert.equal(completions.length, 1);
  completions[0](image); await flush();
  await h.advance(0); assert.equal(completions.length, 2);
  assert.equal(h.posts.filter(p => p.type === "audience_frame").length, 0);
  completions[1](image); await flush();
  assert.equal(h.posts.at(-1).payload.accepted_sequence, 4);
  h.controller.dispose();
});
test("slow captures publish advancing samples during playback without overlapping", async () => {
  const completions = [];
  const h = harness((_element, sample) => new Promise(resolve => completions.push({ sample, resolve })));
  h.controller.notify("connect"); await h.advance(1000);

  h.element.dataset.audienceAcceptedSequence = "4";
  h.controller.notify("playback-tick"); h.surfaceChanged();
  await h.advance(500);
  assert.equal(completions.length, 1);
  assert.equal(completions[0].sample.accepted_sequence, 3);
  completions[0].resolve(image); await flush();

  await h.advance(500);
  h.element.dataset.audienceAcceptedSequence = "5";
  h.controller.notify("playback-tick"); h.surfaceChanged();
  await h.advance(1000);
  assert.equal(completions.length, 2);
  h.element.dataset.audienceAcceptedSequence = "6";
  h.controller.notify("playback-tick"); h.surfaceChanged();
  await h.advance(500);
  assert.equal(completions.length, 2);
  assert.equal(completions[1].sample.accepted_sequence, 5);
  completions[1].resolve(image); await flush();
  assert.deepEqual(h.posts.filter(p => p.type === "audience_frame").map(({ payload }) =>
    [payload.accepted_sequence, payload.revision, payload.capturedAt]), [[3, 1, 200], [5, 2, 3000]]);
  h.controller.dispose();
});
test("capture samples the DOM after font readiness and keeps that identity through encoding", async () => {
  let fontsReady, encoded;
  const documentRef = { fonts: { ready: new Promise(resolve => { fontsReady = resolve; }) },
    defaultView: { getComputedStyle: () => ({ getPropertyValue: () => "#ffffff" }) } };
  const h = harness(null, { capture: (element, sample) => captureAudienceElement(element, sample, {
    documentRef, html2canvas: (target, options) => new Promise(resolve => {
      assert.equal(target.dataset.audienceAcceptedSequence, "4");
      assert.equal(options.windowWidth, 1600);
      encoded = () => resolve({ toDataURL: () => image });
    }),
  }) });
  h.controller.notify("connect"); await h.advance(200);
  h.element.dataset.audienceAcceptedSequence = "4";
  h.controller.notify("playback-tick"); await h.advance(800);
  fontsReady(); await flush();
  h.element.dataset.audienceAcceptedSequence = "5";
  h.controller.notify("playback-tick"); await h.advance(1000);
  encoded(); await flush();
  assert.equal(h.posts.at(-1).payload.accepted_sequence, 4);
  assert.equal(h.posts.at(-1).payload.capturedAt, 1000);
  h.controller.dispose();
});
test("hidden, disconnected and disposed owners cannot publish late capture output", async () => {
  const completions = [];
  const h = harness(() => new Promise(resolve => completions.push(resolve)));
  h.controller.notify("connect"); await h.advance(200);
  h.visibility(false); completions[0](image); await flush();
  await h.advance(20000);
  assert.equal(h.posts.filter(p => p.type === "audience_frame").length, 0);
  assert.equal(completions.length, 1);
  assert.equal(h.posts.at(-1).payload.status, "hidden");
  h.visibility(true); await h.advance(200); assert.equal(completions.length, 2);
  h.controller.notify("disconnect"); completions[1](image); await flush();
  h.controller.notify("connect"); await h.advance(200); assert.equal(completions.length, 3);
  h.controller.dispose(); completions[2](image); await flush();
  assert.equal(h.posts.filter(p => p.type === "audience_frame").length, 0);
  assert.equal(h.timers.size, 0);
});
test("capture failure reports a safe reason once and can recover on the next event", async () => {
  let count = 0;
  const h = harness(async () => { if (++count < 3) throw new Error("private details"); return image; });
  h.controller.notify("connect"); await h.advance(200);
  assert.equal(h.posts.at(-1).type, "audience_frame_unavailable");
  assert.equal(h.posts.at(-1).payload.reason, "capture-failed");
  h.controller.notify("visual-change"); await h.advance(200); assert.equal(h.warnings(), 1);
  h.controller.notify("visual-change"); await h.advance(200);
  assert.equal(h.posts.at(-1).type, "audience_frame");
  h.controller.dispose();
});
test("a failed playback sample does not mark a later accepted state unavailable", async () => {
  let fail;
  const h = harness(() => new Promise((_resolve, reject) => { fail = reject; }));
  h.controller.notify("connect"); await h.advance(200);
  h.element.dataset.audienceAcceptedSequence = "4";
  h.controller.notify("playback-tick");
  fail(new Error("sample failed")); await flush();
  assert.deepEqual(h.posts.map(({ type }) => type), ["audience_viewport"]);
  assert.equal(h.warnings(), 0);
  h.controller.dispose();
});
test("shared capture waits for fonts, caps raster width and rejects oversized encoding", async () => {
  let fontsReady, captured = 0;
  const documentRef = { fonts: { ready: new Promise(resolve => { fontsReady = resolve; }) },
    defaultView: { getComputedStyle: () => ({ getPropertyValue: () => "#ffffff" }) } };
  const metadata = { stage: { width: 1920, height: 1080 }, viewport: { width: 1600, height: 1000 } };
  const work = captureAudienceElement({}, () => metadata, { documentRef, html2canvas: async (_, options) => {
    captured++; assert.equal(options.scale, 0.5); assert.equal(options.width, 1920);
    assert.equal(options.windowWidth, 1600); assert.equal(options.logging, false);
    return { toDataURL: (type, quality) => { assert.equal(type, "image/jpeg"); assert.equal(quality, 0.8); return image; } };
  } });
  await flush(); assert.equal(captured, 0);
  fontsReady(); assert.equal(await work, image);
  await assert.rejects(captureAudienceElement({}, () => metadata, { documentRef,
    html2canvas: async () => ({ toDataURL: () => "A".repeat(600 * 1024 + 1) }) }), /size limit/);
});
