import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { createOperationStatusQueue } from "../src/lib/operationStatusQueue.js";

let storageModule = {};
try {
  storageModule = await import("../src/lib/browserStorage.js");
} catch (error) {
  if (error?.code !== "ERR_MODULE_NOT_FOUND") throw error;
}

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const [
  { default: App },
  { default: OperationStatusProvider },
] = await Promise.all([
  vite.ssrLoadModule("/src/App.jsx"),
  vite.ssrLoadModule("/src/components/app-shell/OperationStatusProvider.jsx"),
]);
await vite.close();

test("safe browser storage treats denied access as unavailable", () => {
  assert.equal(typeof storageModule.createSafeBrowserStorage, "function");
  if (typeof storageModule.createSafeBrowserStorage !== "function") return;

  const denied = storageModule.createSafeBrowserStorage(() => {
    throw Object.assign(new Error("denied"), { name: "SecurityError" });
  });
  assert.equal(denied.getItem("dashboard"), null);
  assert.equal(denied.setItem("dashboard", "value"), false);
});

test("App reaches its loading interface when localStorage access is denied", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw Object.assign(new Error("denied"), { name: "SecurityError" });
    },
  });

  try {
    const html = renderWithOperationStatus(React.createElement(App));
    assert.match(html, /Loading dashboard/);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else delete globalThis.localStorage;
  }
});

function renderWithOperationStatus(child) {
  const queue = createOperationStatusQueue({ scheduler: staticScheduler });
  return renderToStaticMarkup(React.createElement(
    OperationStatusProvider,
    { queue },
    child,
  ));
}

const staticScheduler = {
  setTimeout: () => 1,
  clearTimeout: () => {},
};
