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
  { default: PdpcReleaseDisclaimer, PdpcDashboardHeader, PdpcDashboardFooter },
  { createPdpcReleaseProfile },
  { default: AppFrame },
  { default: OperationStatusProvider },
] = await Promise.all([
  vite.ssrLoadModule("/src/release/PdpcReleaseHeader.jsx"),
  vite.ssrLoadModule("/src/release/pdpcReleaseProfile.js"),
  vite.ssrLoadModule("/src/components/app-shell/AppFrame.jsx"),
  vite.ssrLoadModule("/src/components/app-shell/OperationStatusProvider.jsx"),
]);
await vite.close();

const profile = { id: "pdpc-biomedical", variant: "biomedical" };
const pages = [
  { id: "scenario", title: "Scenario" },
  { id: "biomedical", title: "Biomedical" },
];

test("the release keeps only the exercise disclaimer above the dashboard", () => {
  const html = renderToStaticMarkup(React.createElement(PdpcReleaseDisclaimer, {
    profile,
  }));

  assert.equal((html.match(/Fictional scenario · Exercise use only/g) ?? []).length, 1);
  assert.match(html, /<aside[^>]*aria-label="Exercise disclaimer"/);
  assert.match(html, /class="pdpc-release-disclaimer__texture"[^>]*aria-hidden="true"/);
  assert.doesNotMatch(html, /pdpc-release-header|Dashboard pages|Simulation exercise/);
});

test("the PDPC dashboard header owns identity, navigation, and the official logo", () => {
  assert.equal(typeof PdpcDashboardHeader, "function");
  if (typeof PdpcDashboardHeader !== "function") return;

  const html = renderToStaticMarkup(React.createElement(PdpcDashboardHeader, {
    profile,
    pages,
    activePage: pages[0],
    onPageRequest() {},
  }));

  assert.match(html, /class="dashboard-header pdpc-dashboard-header"/);
  assert.match(html, /Pandemic &amp; Disaster Preparedness Center/);
  assert.match(html, /WCPH HeV-A26 Simulation/);
  assert.match(html, /alt="Pandemic and Disaster Preparedness Center \(PDPC\)"/);
  assert.match(html, /<nav[^>]*aria-label="Dashboard pages"/);
  assert.match(html, /data-dashboard-page-id="scenario"[^>]*aria-current="page"/);
  assert.match(html, /Scenario[\s\S]*Biomedical/);
  assert.doesNotMatch(html, />Home<|>View<|>Build<|>Present<|>Audience|>Updated</);
});

test("the socio-economic navigation names its information destination once", () => {
  const socioeconomicPages = [
    pages[0],
    { id: "socio_economic", title: "Socio-economic" },
  ];
  const html = renderToStaticMarkup(React.createElement(PdpcDashboardHeader, {
    profile: { id: "pdpc-socioeconomic", variant: "socioeconomic" },
    pages: socioeconomicPages,
    activePage: socioeconomicPages[1],
    onPageRequest() {},
  }));

  assert.match(
    html,
    /data-dashboard-page-id="socio_economic"[^>]*aria-label="Socio-Economic Information"[^>]*>Socio-Economic Information</,
  );
  assert.doesNotMatch(html, /Information information/);
});

test("the release profile installs the integrated dashboard header", () => {
  const releaseProfile = createPdpcReleaseProfile("biomedical");
  assert.equal(typeof releaseProfile.HeaderComponent, "function");
  assert.equal(typeof releaseProfile.DashboardHeaderComponent, "function");
  assert.equal(typeof releaseProfile.DashboardFooterComponent, "function");
});

test("the PDPC footer promotes the dashboard builder and moves the plain credit right", () => {
  assert.equal(typeof PdpcDashboardFooter, "function");
  if (typeof PdpcDashboardFooter !== "function") return;

  const html = renderToStaticMarkup(React.createElement(PdpcDashboardFooter));

  assert.match(
    html,
    /<strong>SimEx Dashboard V3<\/strong><a[^>]*href="https:\/\/simex-dashboard-v3\.pages\.dev\/"[^>]*>Build your own dashboard<\/a>/,
  );
  assert.match(html, /<nav[^>]*aria-label="Project links"><span>Developed by Hekmat Alrouh<\/span><\/nav>/);
  assert.doesNotMatch(html, /Report a bug \/ request a feature/);
  assert.doesNotMatch(html, /<a[^>]*>Developed by Hekmat Alrouh<\/a>/);
});

test("AppFrame accepts release-owned chrome while retaining its ordinary crown default", () => {
  const customHeader = React.createElement(PdpcReleaseDisclaimer, {
    profile,
  });
  const release = renderAppFrame({
    mode: "view",
    releaseProfileId: profile.id,
    suppressCommandCrown: true,
    commandHeader: customHeader,
    children: React.createElement("main", null, "Dashboard"),
  });
  assert.match(release, /data-release-profile="pdpc-biomedical"/);
  assert.match(release, /aria-label="Exercise disclaimer"/);
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
