import assert from "node:assert/strict";
import test from "node:test";

import {
  closeDashboardLookInBackground,
  createDashboardLookCommitScheduler,
} from "../src/theme/dashboardLookDraft.js";
import { createSerializedDashboardCommitController } from "../src/lib/dashboardCommitController.js";

test("closing Theme canonicalizes the live selection before closing or persisting", async () => {
  let releasePersistence;
  let closed = false;
  let canonicalLook = null;
  const selectedLook = {
    dashboardStyle: "humanist-standard",
    dashboardColorProfile: "humanist-standard/common-ground",
    chartColorMode: "profile",
  };
  const scheduler = createDashboardLookCommitScheduler({
    onCommit: () => new Promise((resolve) => {
      releasePersistence = resolve;
    }),
  });
  scheduler.schedule(selectedLook);

  const result = closeDashboardLookInBackground({
    scheduler,
    onApply: () => selectedLook,
    onCanonicalize: (value) => {
      assert.equal(closed, false);
      canonicalLook = value;
    },
    onClose: () => {
      assert.strictEqual(canonicalLook, selectedLook);
      closed = true;
    },
  });

  assert.equal(result, undefined);
  assert.equal(closed, true);
  assert.strictEqual(canonicalLook, selectedLook);
  await Promise.resolve();
  releasePersistence();
  await scheduler.flush();
});

test("queued dashboard work starts from the Look selected while an older save is still finishing", async () => {
  let releaseFirstSave;
  let markFirstSaveStarted;
  const firstSaveStarted = new Promise((resolve) => {
    markFirstSaveStarted = resolve;
  });
  let saveCount = 0;
  const controller = createSerializedDashboardCommitController({
    initialDashboard: {
      globalStyles: { dashboardStyle: "evidence-ledger" },
      chronoGroups: [],
    },
    commit: async (candidate) => {
      saveCount += 1;
      if (saveCount === 1) {
        markFirstSaveStarted();
        await new Promise((resolve) => {
          releaseFirstSave = resolve;
        });
      }
      return candidate;
    },
  });

  const olderSave = controller.mutate((dashboard) => {
    dashboard.globalStyles.dashboardStyle = "signal-instrument";
  });
  await firstSaveStarted;

  const selected = {
    globalStyles: { dashboardStyle: "humanist-standard" },
    chronoGroups: [],
  };
  const adoption = controller.adopt(selected);
  const chronoSave = controller.mutate((dashboard) => {
    dashboard.chronoGroups.push({ id: "chrono-new" });
  });

  releaseFirstSave();
  await Promise.all([olderSave, adoption, chronoSave]);

  assert.equal(controller.getCurrent().globalStyles.dashboardStyle, "humanist-standard");
  assert.deepEqual(controller.getCurrent().chronoGroups, [{ id: "chrono-new" }]);
});
