import assert from "node:assert/strict";
import test from "node:test";

import * as dashboardMode from "../src/lib/dashboardMode.js";

const {
  DASHBOARD_MODE_STORAGE_KEY,
  persistDashboardModePreference,
  readDashboardModePreference,
  resolveInitialDashboardMode,
} = dashboardMode;

const homeOn = { home: { enabled: true } };
const homeOff = { home: { enabled: false } };

test("mode availability keeps canonical Home first and removes it when disabled", () => {
  assert.deepEqual(dashboardMode.DASHBOARD_MODES, ["home", "view", "build", "present"]);
  assert.deepEqual(dashboardMode.availableDashboardModes?.(homeOn), dashboardMode.DASHBOARD_MODES);
  assert.deepEqual(dashboardMode.availableDashboardModes?.(homeOff), ["view", "build", "present"]);
  assert.equal(Object.isFrozen(dashboardMode.availableDashboardModes?.(homeOn)), true);
  assert.equal(Object.isFrozen(dashboardMode.availableDashboardModes?.(homeOff)), true);
  assert.equal(dashboardMode.isAvailableDashboardMode?.("home", homeOn), true);
  assert.equal(dashboardMode.isAvailableDashboardMode?.("home", homeOff), false);
});

test("startup resolution honors available requests, memory, and Home availability", () => {
  assert.equal(resolveInitialDashboardMode({ requestedMode: "home", dashboard: homeOff }), "view");
  assert.equal(resolveInitialDashboardMode({ storedMode: "build", dashboard: homeOn }), "build");
  assert.equal(resolveInitialDashboardMode({ dashboard: homeOn }), "home");
  assert.equal(resolveInitialDashboardMode({ dashboard: homeOff }), "view");
  assert.equal(resolveInitialDashboardMode({ storedMode: "owner", dashboard: homeOn }), "home");
});

test("mode reconciliation cannot strand an unavailable Home surface", () => {
  assert.equal(dashboardMode.reconcileDashboardMode?.("home", homeOff), "view");
  assert.equal(dashboardMode.reconcileDashboardMode?.("build", homeOff), "build");
});

test("post-initialization reconciliation waits for the queued mode render", () => {
  assert.equal(dashboardMode.reconcileLoadedDashboardMode?.(null, homeOn), null);
  assert.equal(dashboardMode.reconcileLoadedDashboardMode?.("present", homeOn), "present");
  assert.equal(dashboardMode.reconcileLoadedDashboardMode?.("home", homeOff), "view");
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
