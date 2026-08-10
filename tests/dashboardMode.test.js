import assert from "node:assert/strict";
import test from "node:test";

import {
  DASHBOARD_MODE_STORAGE_KEY,
  persistDashboardModePreference,
  readDashboardModePreference,
  resolveInitialDashboardMode,
} from "../src/lib/dashboardMode.js";

test("invalid preference falls back to View", () => {
  assert.equal(resolveInitialDashboardMode({ storedMode: "owner" }), "view");
});

test("preference helpers acquire browser storage inside their guarded path", () => {
  const values = new Map([[DASHBOARD_MODE_STORAGE_KEY, "build"]]);
  withGlobalLocalStorage({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }, () => {
    assert.equal(readDashboardModePreference(), "build");
    assert.equal(persistDashboardModePreference("present"), true);
    assert.equal(values.get(DASHBOARD_MODE_STORAGE_KEY), "present");
  });
});

test("throwing browser storage access fails closed", () => {
  withGlobalLocalStorageGetter(() => {
    throw new Error("storage access denied");
  }, () => {
    assert.equal(readDashboardModePreference(), null);
    assert.equal(persistDashboardModePreference("build"), false);
  });
});

function withGlobalLocalStorage(storage, run) {
  withGlobalLocalStorageGetter(() => storage, run);
}

function withGlobalLocalStorageGetter(get, run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get,
  });
  try {
    run();
  } finally {
    if (previous) {
      Object.defineProperty(globalThis, "localStorage", previous);
    } else {
      delete globalThis.localStorage;
    }
  }
}
