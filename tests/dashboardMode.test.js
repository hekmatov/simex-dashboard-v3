import assert from "node:assert/strict";
import test from "node:test";

import { resolveInitialDashboardMode } from "../src/lib/dashboardMode.js";

test("invalid preference falls back to View", () => {
  assert.equal(resolveInitialDashboardMode({ storedMode: "owner" }), "view");
});
