import test from "node:test";
import assert from "node:assert/strict";
import { createAudienceFrameSchedule, reduceAudienceFrameSchedule as reduce, audienceFrameInstruction as instruction } from "../src/lib/audienceFrameSchedule.js";

const connected = () => reduce(createAudienceFrameSchedule(), { type: "connect" }, 0);
test("structural changes debounce for exactly200ms and wake an idle display", () => {
  let state = connected();
  assert.deepEqual(instruction(state, 199), { type: "capture-at", delay: 1 });
  state = reduce(state, { type: "visual-change" }, 100);
  assert.deepEqual(instruction(state, 299), { type: "capture-at", delay: 1 });
  assert.deepEqual(instruction(state, 300), { type: "capture-now" });
  state = reduce(state, { type: "capture-start" }, 300);
  state = reduce(state, { type: "capture-complete", duration: 100 }, 400);
  state = reduce(state, { type: "clock" }, 4100);
  assert.equal(state.asleep, true);
  assert.deepEqual(instruction(state, 4100), { type: "sleep" });
  state = reduce(state, { type: "state-accepted" }, 4200);
  assert.equal(state.asleep, false);
  assert.deepEqual(instruction(state, 4200), { type: "capture-at", delay: 200 });
});
test("playback is throttled and capture cost adapts between one and ten seconds", () => {
  let state = connected();
  state = reduce(state, { type: "capture-start" }, 200);
  state = reduce(state, { type: "capture-complete", duration: 250 }, 450);
  state = reduce(state, { type: "playback-tick" }, 500);
  assert.deepEqual(instruction(state, 500), { type: "capture-at", delay: 1950 });
  for (let i = 0; i < 4; i++) state = reduce(state, { type: "capture-complete", duration: 401 }, 1000 + i);
  assert.equal(state.intervalMs, 10000);
  for (let i = 0; i < 6; i++) state = reduce(state, { type: "capture-complete", duration: 149 }, 2000 + i);
  assert.equal(state.intervalMs, 1000);
});
test("capture never overlaps; a structural event during capture remains pending", () => {
  let state = reduce(connected(), { type: "capture-start" }, 200);
  state = reduce(state, { type: "resize" }, 250);
  assert.deepEqual(instruction(state, 500), { type: "sleep" });
  state = reduce(state, { type: "capture-complete", duration: 300 }, 500);
  assert.deepEqual(instruction(state, 500), { type: "capture-now" });
});
test("idle sleeps at four seconds and sends lightweight heartbeats every15s", () => {
  let state = reduce(connected(), { type: "capture-start" }, 200);
  state = reduce(state, { type: "capture-complete", duration: 200 }, 400);
  state = reduce(state, { type: "clock" }, 3999);
  assert.equal(state.asleep, false);
  state = reduce(state, { type: "clock" }, 4000);
  assert.equal(state.asleep, true);
  assert.deepEqual(instruction(state, 18999), { type: "sleep" });
  assert.deepEqual(instruction(state, 19000), { type: "heartbeat" });
  state = reduce(state, { type: "heartbeat-sent" }, 19000);
  assert.deepEqual(instruction(state, 33999), { type: "sleep" });
  assert.deepEqual(instruction(state, 34000), { type: "heartbeat" });
});
test("hidden and disconnected surfaces suspend work; returning settles again", () => {
  let state = reduce(connected(), { type: "visibility", visible: false }, 100);
  assert.deepEqual(instruction(state, 20000), { type: "sleep" });
  state = reduce(state, { type: "visibility", visible: true }, 20001);
  assert.deepEqual(instruction(state, 20001), { type: "capture-at", delay: 200 });
  state = reduce(state, { type: "disconnect" }, 20002);
  assert.deepEqual(instruction(state, 40000), { type: "sleep" });
  state = reduce(state, { type: "connect" }, 40000);
  assert.deepEqual(instruction(state, 40000), { type: "capture-at", delay: 200 });
});
