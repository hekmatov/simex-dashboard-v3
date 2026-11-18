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
const { default: DeleteDashboardContentDialog } = await vite.ssrLoadModule(
  "/src/components/build/DeleteDashboardContentDialog.jsx",
);
await vite.close();

test("dashboard-content deletion starts safe and names every destructive consequence", () => {
  const html = renderToStaticMarkup(React.createElement(DeleteDashboardContentDialog, {
    open: true,
    summary: { pages: 3, charts: 12, sources: 5, scenes: 3 },
  }));

  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, />Delete all dashboard content\?</);
  assert.match(html, />3 Pages</);
  assert.match(html, />12 charts</);
  assert.match(html, />5 data sources</);
  assert.match(html, />3 Storylines</);
  assert.doesNotMatch(html, /Chrono Groups/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /Delete all authored dashboard pages, charts, sources, media, and Storylines\. Canonical Home remains available\./);
  assert.match(html, /I understand that the authored dashboard content listed above will be permanently deleted/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Delete all dashboard content<\/button>/);
});
