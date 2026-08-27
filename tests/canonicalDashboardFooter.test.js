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
const { CanonicalDashboardFooter, feedbackUrlForDashboard } = await vite.ssrLoadModule(
  "/src/components/dashboard/CanonicalDashboardFrame.jsx",
);
await vite.close();

test("live footer derives the public repository Issues destination without package Pages", () => {
  assert.equal(
    feedbackUrlForDashboard({ pages: [] }),
    "https://github.com/hekmatov/simex-dashboard-v3/issues",
  );
  const html = renderToStaticMarkup(React.createElement(CanonicalDashboardFooter, {
    dashboard: { pages: [] },
  }));

  assert.match(
    html,
    /<a href="https:\/\/github\.com\/hekmatov\/simex-dashboard-v3\/issues" target="_blank" rel="noreferrer">Report a bug \/ request a feature<\/a>/,
  );
});
