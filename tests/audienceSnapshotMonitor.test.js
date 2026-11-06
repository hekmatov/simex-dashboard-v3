import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const { default: Monitor, audienceMonitorView } = await vite.ssrLoadModule('/src/components/presentation/AudienceSnapshotMonitor.jsx');
await vite.close();
const frame = { revision: 2, accepted_sequence: 7, image: "data:image/jpeg;base64,/9j/2Q==", capturedAt: 1000,
  viewport: { width: 1600, height: 1000, dpr: 1.25 }, stage: { width: 1920, height: 1080, scale: 5 / 6 } };
test("monitor shows real stage aspect/resolution and accepted versus requested identity", () => {
  const html = renderToStaticMarkup(React.createElement(Monitor, {
    connectionStatus: "connected", stream: { frame, status: "fresh", requestedSequence: 8, receivedAt: Date.now() },
  }));
  assert.match(html, /aspect-ratio:1920 \/ 1080/);
  assert.match(html, /1920 × 1080/); assert.match(html, /1600 × 1000/);
  assert.match(html, /data-frame-revision="2"/); assert.match(html, /data-accepted-sequence="7"/);
  assert.match(html, /requested update pending/i);
});
test("static, hidden and disconnected output is never called fresh; retained frame is identified", () => {
  for (const status of ["static", "hidden"]) {
    const view = audienceMonitorView({ connectionStatus: "connected", stream: { status, since: 1000 }, frame, now: 20000 });
    assert.equal(view.status, status); assert.match(view.caption, new RegExp(status));
  }
  const view = audienceMonitorView({ connectionStatus: "disconnected", stream: { status: "fresh" }, frame, now: 20000 });
  assert.equal(view.source, "retained"); assert.match(view.caption, /Last Audience frame.*disconnected/);
  const lost = audienceMonitorView({ connectionStatus: "connected", stream: { status: "disconnected" }, frame, hasLocalPreview: true });
  assert.equal(lost.source, "local"); assert.match(lost.caption, /connection lost/);
});
test("local rehearsal and failed capture fallback are explicitly local and keep a visible surface", () => {
  for (const [connectionStatus, status] of [["disconnected", "waiting"], ["connected", "unavailable"]]) {
    const view = audienceMonitorView({ connectionStatus, stream: { status }, frame, hasLocalPreview: true });
    assert.equal(view.source, "local"); assert.match(view.caption, /Local preview/);
    assert.doesNotMatch(view.caption, /updated|static since/);
  }
  const html = renderToStaticMarkup(React.createElement(Monitor, { connectionStatus: "disconnected" }));
  assert.match(html, /Local preview/); assert.match(html, /No scene selected/);
});

test("local fallback accepts stream stage geometry while the first image is pending", () => {
  const html = renderToStaticMarkup(React.createElement(Monitor, {
    dashboard: { pages: [], chronoGroups: [] }, stream: { stage: frame.stage, status: "waiting" },
    presentationState: { output_mode: "holding", source: {}, composition: {},
      payload: { items: [], audience_facts: {} } },
    children: React.createElement("button", null, "Move up"),
  }));
  assert.match(html, /Waiting for the next scene/);
  assert.match(html, /audience-snapshot-controls[\s\S]*Move up/);
  assert.doesNotMatch(html, /audience-snapshot-caption|audience-snapshot-resolution/);
});
