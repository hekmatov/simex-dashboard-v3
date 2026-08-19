import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const [{ default: ApplicationRecovery }, recoveryModel] = await Promise.all([
  vite.ssrLoadModule("/src/components/app-shell/ApplicationRecovery.jsx"),
  vite.ssrLoadModule("/src/lib/applicationRecovery.js"),
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

test("Build does not expose package actions before the Scenario Passport owns their consequences", async () => {
  const source = await readFile(
    new URL("../src/components/build/BuildWorkspace.jsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, />Import<\/button>|>Export<\/button>|onImport|onExport/);
});
