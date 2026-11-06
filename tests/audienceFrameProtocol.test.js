import test from "node:test";
import assert from "node:assert/strict";
import { makePresentationMessage, parsePresentationMessage } from "../src/lib/presentationProtocol.js";

export const framePayload = () => ({
  stream_id: "stream-1", accepted_sequence: 3, dashboard_revision: "dashboard-1",
  revision: 1, viewport: { width: 1600, height: 1000, dpr: 1.25 },
  stage: { width: 1920, height: 1080, scale: 0.8333333333333334 },
  image: "data:image/jpeg;base64,/9j/2Q==", capturedAt: 1000, reason: "state-accepted",
});
const frame = payload => makePresentationMessage({ sessionId: "session-1", sequence: 2, type: "audience_frame", payload });
test("frame metadata roundtrips separately from accepted controller state identity", () => {
  const payload = framePayload();
  const result = parsePresentationMessage(frame(payload), { sessionId: "session-1" });
  assert.deepEqual(result.payload, payload);
  assert.notEqual(result.sequence, result.payload.accepted_sequence);
  payload.stage.width = 1;
  assert.equal(result.payload.stage.width, 1920);
});
test("frame validation rejects oversized images and malformed geometry or metadata", () => {
  for (const change of [
    p => { p.image = `data:image/jpeg;base64,${"A".repeat(600 * 1024)}`; },
    p => { p.image = "https://example.test/exercise.jpg"; },
    p => { p.image = "data:image/svg+xml;base64,AAAA"; },
    p => { p.viewport.width = 0; },
    p => { p.viewport.dpr = Infinity; },
    p => { p.stage.scale = -1; },
    p => { p.accepted_sequence = 0; },
    p => { p.stream_id = 1; },
    p => { p.revision = 0; },
    p => { p.capturedAt = NaN; },
    p => { p.unexpected = true; },
  ]) {
    const payload = framePayload(); change(payload);
    assert.throws(() => frame(payload));
  }
  assert.throws(() => parsePresentationMessage(frame(framePayload()), { sessionId: "other-session" }), /session/i);
  assert.throws(() => parsePresentationMessage(frame(framePayload()), { lastSequence: 2 }), /sequence/i);
});

test("a supported small target can scale to a 4K Audience viewport", () => {
  const payload = { ...framePayload(), viewport: { width: 3840, height: 2160, dpr: 1 },
    stage: { width: 320, height: 180, scale: 12 } };
  assert.doesNotThrow(() => parsePresentationMessage(frame(payload)));
});
test("frame and viewport receipts only accept dimensions supported by the local stage", () => {
  const { stream_id, accepted_sequence, dashboard_revision, viewport } = framePayload();
  for (const [width, height] of [[319, 180], [320, 179], [320.5, 180], [7681, 4320], [7680, 4321]]) {
    const stage = { width, height, scale: 1 };
    assert.throws(() => frame({ ...framePayload(), stage }), { code: "invalid_frame_geometry" });
    assert.throws(() => makePresentationMessage({ sessionId: "session-1", sequence: 2, type: "audience_viewport",
      payload: { stream_id, accepted_sequence, dashboard_revision, viewport, stage } }), { code: "invalid_frame_geometry" });
  }
  const tinyViewport = { width: 1, height: 1, dpr: 1 };
  assert.doesNotThrow(() => frame({ ...framePayload(), viewport: tinyViewport,
    stage: { width: 7680, height: 4320, scale: 1 / 7680 } }));
});
test("viewport, static/hidden heartbeat and unavailable metadata contain no images", () => {
  const { stream_id, accepted_sequence, dashboard_revision, viewport, stage } = framePayload();
  for (const [type, payload] of [
    ["audience_viewport", { stream_id, accepted_sequence, dashboard_revision, viewport, stage }],
    ["audience_heartbeat", { stream_id, accepted_sequence, dashboard_revision, status: "static", since: 1000 }],
    ["audience_heartbeat", { stream_id, accepted_sequence, dashboard_revision, status: "hidden", since: 1000 }],
    ["audience_frame_unavailable", { stream_id, accepted_sequence, dashboard_revision, reason: "capture-failed" }],
  ]) {
    assert.doesNotThrow(() => makePresentationMessage({ sessionId: "session-1", sequence: 2, type, payload }));
    assert.throws(() => makePresentationMessage({ sessionId: "session-1", sequence: 2, type, payload: { ...payload, image: "extra" } }));
  }
});
