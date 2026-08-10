import assert from "node:assert/strict";
import test from "node:test";

import {
  parseDashboardEntry,
  reconcileActivePageId,
} from "../src/lib/dashboardNavigation.js";

test("audience query stays chrome-free when its channel is invalid", () => {
  const entry = parseDashboardEntry("?surface=audience&channel=bad");

  assert.equal(entry.surface, "audience");
  assert.equal(entry.requestedMode, "present");
  assert.equal(entry.channelId, null);
  assert.equal(entry.issue, "invalid_channel");
});

test("active page survives when valid and falls back after removal", () => {
  const pages = [{ id: "home" }, { id: "biomedical" }];

  assert.equal(reconcileActivePageId(pages, "biomedical"), "biomedical");
  assert.equal(reconcileActivePageId(pages, "missing"), "home");
});
