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
const [
  { default: ApplicationRecovery },
  recoveryModel,
  loadDashboardModel,
  { default: BuildWorkspace },
] = await Promise.all([
  vite.ssrLoadModule("/src/components/app-shell/ApplicationRecovery.jsx"),
  vite.ssrLoadModule("/src/lib/applicationRecovery.js"),
  vite.ssrLoadModule("/src/lib/loadDashboard.js"),
  vite.ssrLoadModule("/src/components/build/BuildWorkspace.jsx"),
]);
await vite.close();

test("application recovery exposes only the two approved root actions", () => {
  const html = renderToStaticMarkup(React.createElement(ApplicationRecovery, {
    onReload: () => {},
    onChoosePackage: () => {},
  }));

  assert.match(html, /Dashboard couldn’t load\. No valid scenario is available\./);
  assert.match(html, />Reload Dashboard<\/button>/);
  assert.match(html, />Import Dashboard Package<\/button>/);
  assert.match(html, /aria-label="Choose Dashboard Package"/);
  assert.match(html, /accept="application\/json,\.json"/);
  assert.doesNotMatch(html, /Dashboard mode|Dashboard pages|Build workspace/);
});

test("profile/cache pairing failures receive targeted reload guidance only", () => {
  const html = renderToStaticMarkup(React.createElement(ApplicationRecovery, {
    profileVersionMismatch: true,
    onReload: () => {},
    onChoosePackage: () => {},
  }));
  assert.match(html, /configuration and dataset profiles appear to come from different versions/i);
  assert.match(html, /hard refresh/i);
  assert.match(html, /Ctrl\+Shift\+R/);
  assert.match(html, /Cmd\+Shift\+R/);

  let mismatch;
  try {
    loadDashboardModel.validateDatasetProfiles({
      cases: { kind: "csv", path: "data/cases.csv", provenance: { label: "Cases" } },
    }, {});
  } catch (error) {
    mismatch = error;
  }
  assert.equal(recoveryModel.isDashboardProfileVersionMismatch(mismatch), true);
  assert.equal(recoveryModel.isDashboardProfileVersionMismatch(new Error("Could not load dashboard config")), false);
});

test("recovery hydration completes before storage changes", async () => {
  const events = [];
  const candidate = { id: "candidate" };
  const loaded = { id: "loaded" };

  const result = await recoveryModel.hydrateConfigurationBeforeStorageWrite({
    candidate,
    hydrate: async (value) => {
      events.push(["hydrate", value]);
      return loaded;
    },
    persist: (value) => events.push(["persist", value]),
  });

  assert.equal(result, loaded);
  assert.deepEqual(events, [
    ["hydrate", candidate],
    ["persist", loaded],
  ]);
});

test("failed recovery hydration leaves storage untouched and maps package errors exactly", async () => {
  let writes = 0;
  await assert.rejects(
    recoveryModel.hydrateConfigurationBeforeStorageWrite({
      candidate: { id: "invalid" },
      hydrate: async () => { throw new Error("invalid source"); },
      persist: () => { writes += 1; },
    }),
    /invalid source/,
  );
  assert.equal(writes, 0);
  assert.equal(
    recoveryModel.recoveryPackageError(new Error("This dashboard supports version 3 bundles only.")),
    "This package is not a supported version 3 dashboard. Choose a current version 3 package.",
  );
  assert.equal(
    recoveryModel.recoveryPackageError(new Error("Dashboard bundle must be valid JSON.")),
    "Dashboard package couldn’t be imported. The current dashboard is unchanged.",
  );
});

test("Build keeps package controls out of the generic command panel", () => {
  const page = {
    id: "home",
    label: "Home",
    title: "Home",
    sections: [{ id: "overview", title: "Overview", panels: [] }],
  };
  const html = renderToStaticMarkup(React.createElement(BuildWorkspace, {
    dashboard: {
      id: "dashboard",
      title: "Dashboard",
      pages: [page],
      chronoGroups: [],
      dataSources: {},
    },
    activePage: page,
    pageType: "analytical",
    dashboardDraft: {},
    pageDrafts: {},
    sectionDrafts: {},
    deviceLayout: "auto",
  }));

  assert.doesNotMatch(html, /Import package|Export package|Dashboard packages/);
});
