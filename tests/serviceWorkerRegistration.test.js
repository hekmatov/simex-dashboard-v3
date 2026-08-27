import assert from "node:assert/strict";
import test from "node:test";

import { registerServiceWorker } from "../src/serviceWorkerRegistration.js";

test("registration checks for a fresh worker without taking control of an existing page", async () => {
  const calls = [];
  const listeners = new Map();
  const navigatorRef = {
    serviceWorker: {
      controller: { id: "active-generation" },
      addEventListener(type, listener) { listeners.set(type, listener); },
      async register(url, options) {
        calls.push(["register", url, options]);
        return { async update() { calls.push(["update"]); } };
      },
    },
  };
  const windowRef = { location: { reload() { calls.push(["reload"]); } } };

  await registerServiceWorker({ navigatorRef, windowRef, serviceWorkerUrl: "/service-worker.js" });
  assert.deepEqual(calls, [
    ["register", "/service-worker.js", { updateViaCache: "none" }],
    ["update"],
  ]);
  listeners.get("controllerchange")();
  listeners.get("controllerchange")();
  assert.deepEqual(calls.at(-1), ["reload"]);
});

test("first installation never reloads its first controlled page", async () => {
  let controllerChange;
  let reloads = 0;
  await registerServiceWorker({
    navigatorRef: {
      serviceWorker: {
        controller: null,
        addEventListener(_type, listener) { controllerChange = listener; },
        async register() { return { async update() {} }; },
      },
    },
    windowRef: { location: { reload() { reloads += 1; } } },
    serviceWorkerUrl: "/service-worker.js",
  });
  controllerChange();
  assert.equal(reloads, 0);
});
