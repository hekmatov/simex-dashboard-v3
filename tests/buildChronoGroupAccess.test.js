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
const { default: ChronoGroupContent } = await vite.ssrLoadModule(
  "/src/components/time/ChronoGroupContent.jsx",
);
await vite.close();

test("Build routes Chrono Group editing and Scene creation through read-first group content", () => {
  const dashboard = {
    timezone: "UTC",
    pages: [],
    chronoGroups: [{
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
    selection: { kind: "chronoGroup", chronoGroupId: "exercise" },
  }));
  assert.doesNotMatch(html, /aria-label="Chrono Group name"/);
  assert.doesNotMatch(html, />Open live Scene composer</);

  const content = renderToStaticMarkup(React.createElement(ChronoGroupContent, {
    content: {
      ...dashboard.chronoGroups[0],
      status: "ready",
      pageSections: [],
    },
  }));
  assert.match(content, />Edit</);
  assert.match(content, />Create Scene</);
  assert.match(content, />Back to Chrono Studio</);
  assert.match(content, /data-content-action-group="navigation"[\s\S]*>Back to Chrono Studio</);
  assert.match(content, /data-content-action-group="primary"[\s\S]*>Edit<[\s\S]*>Create Scene</);
  assert.match(content, /data-content-action-group="management"[\s\S]*>Duplicate<[\s\S]*class="[^"]*danger[^"]*"[\s\S]*>Remove</);
});
