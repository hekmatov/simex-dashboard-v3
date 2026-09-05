import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { createOperationStatusQueue } from "../src/lib/operationStatusQueue.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const vite = await createServer({
  root: ROOT,
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const [
  { default: PdpcReleaseHeader },
  { default: AppFrame },
  { default: OperationStatusProvider },
] = await Promise.all([
  vite.ssrLoadModule("/src/release/PdpcReleaseHeader.jsx"),
  vite.ssrLoadModule("/src/components/app-shell/AppFrame.jsx"),
  vite.ssrLoadModule("/src/components/app-shell/OperationStatusProvider.jsx"),
]);
await vite.close();

const profile = { id: "pdpc-biomedical", variant: "biomedical" };
const pages = [
  { id: "scenario", title: "Scenario" },
  { id: "biomedical", title: "Biomedical" },
];

test("the PDPC header exposes one disclaimer and ordered accessible navigation", () => {
  const html = renderToStaticMarkup(React.createElement(PdpcReleaseHeader, {
    profile,
    pages,
    activePage: pages[0],
    onPageRequest() {},
  }));

  assert.equal((html.match(/Fictional scenario · Exercise use only/g) ?? []).length, 1);
  assert.match(html, /<aside[^>]*aria-label="Exercise disclaimer"/);
  assert.match(html, /class="pdpc-release-disclaimer__texture"[^>]*aria-hidden="true"/);
  assert.match(html, /alt="Pandemic and Disaster Preparedness Center \(PDPC\)"/);
  assert.match(html, /<nav[^>]*aria-label="Dashboard pages"/);
  assert.match(html, /data-dashboard-page-id="scenario"[^>]*aria-current="page"/);
  assert.match(html, /Scenario[\s\S]*Biomedical[\s\S]*Simulation exercise/);
  assert.doesNotMatch(html, />Home<|>View<|>Build<|>Present<|>Audience</);
});

test("AppFrame accepts release-owned chrome while retaining its ordinary crown default", () => {
  const customHeader = React.createElement(PdpcReleaseHeader, {
    profile,
    pages,
    activePage: pages[0],
    onPageRequest() {},
  });
  const release = renderAppFrame({
    mode: "view",
    releaseProfileId: profile.id,
    suppressCommandCrown: true,
    commandHeader: customHeader,
    children: React.createElement("main", null, "Dashboard"),
  });
  assert.match(release, /data-release-profile="pdpc-biomedical"/);
  assert.match(release, /data-pdpc-release-header="biomedical"/);
  assert.doesNotMatch(release, /data-command-crown-layer=/);

  const ordinary = renderAppFrame({
    mode: "view",
    availableModes: ["view", "build", "present"],
    onModeRequest() {},
    children: React.createElement("main", null, "Dashboard"),
  });
  assert.match(ordinary, /data-command-crown-layer="mode"/);
  assert.doesNotMatch(ordinary, /data-release-profile=/);
});

function renderAppFrame(props) {
  const queue = createOperationStatusQueue({
    scheduler: { setTimeout: () => 1, clearTimeout() {} },
  });
  return renderToStaticMarkup(React.createElement(
    OperationStatusProvider,
    { queue },
    React.createElement(AppFrame, props),
  ));
}
