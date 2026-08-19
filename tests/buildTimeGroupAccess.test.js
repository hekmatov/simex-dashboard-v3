import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const { default: BuildInspector } = await vite.ssrLoadModule(
  "/src/components/build/BuildInspector.jsx",
);
await vite.close();

test("Time Group authoring exposes editable settings and live Scene composer access", () => {
  const dashboard = {
    timezone: "UTC",
    pages: [],
    timeSyncGroups: [{
      id: "exercise",
      name: "Exercise timeline",
      period: { start: "2027-05-01", end: "2027-05-03" },
      matching: { policy: "exact" },
      secondsPerFrame: 2.5,
      members: [],
    }],
  };
  const html = renderToStaticMarkup(React.createElement(BuildInspector, {
    dashboard,
    selection: { kind: "timeGroup", groupId: "exercise" },
    onTimeGroupChange() {},
    onOpenSceneComposer() {},
  }));

  assert.match(html, /aria-label="Time Group name"/);
  assert.match(html, /aria-label="Time Group start"/);
  assert.match(html, /aria-label="Time Group end"/);
  assert.match(html, /aria-label="Time Group matching"/);
  assert.match(html, /aria-label="Seconds per frame"/);
  assert.match(html, />Open live Scene composer</);
});
