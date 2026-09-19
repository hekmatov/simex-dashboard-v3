import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({ root: process.cwd(), appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
const [{ default: PageTimeContext }, { PlaybackProvider }] = await Promise.all([
  vite.ssrLoadModule("/src/components/playback/PageTimeContext.jsx"),
  vite.ssrLoadModule("/src/components/playback/PlaybackProvider.jsx"),
]);
await vite.close();

test("page time reads Latest available and offers Set page time when playback is closed", () => {
  const html = renderToStaticMarkup(React.createElement(PlaybackProvider, { groups: [], charts: [], loadedData: {}, profiles: {} }, React.createElement(PageTimeContext)));
  assert.match(html, /Page time/);
  assert.match(html, /Latest available/);
  assert.match(html, /<button[^>]*aria-pressed="false"[^>]*>Set page time<\/button>/);
});
