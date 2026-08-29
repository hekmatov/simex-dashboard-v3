import assert from "node:assert/strict";
import test from "node:test";

import {
  createBuildDraftCoordinatorState,
  reduceBuildDraftCoordinator,
} from "../src/components/build/buildDraftCoordinator.js";

const restoration = (targetId, scrollTop = 240) => ({
  focusId: `focus-${targetId}`,
  scrollTop,
  targetId,
  suspensionReason: null,
});

const draft = (kind, targetId) => ({
  draftId: `${kind}-${targetId}`,
  kind,
  targetId,
  status: "clean",
  restoration: restoration(targetId),
  resolution: null,
});

test("layout and selected-chart slots become dirty independently", () => {
  let state = createBuildDraftCoordinatorState();
  state = reduceBuildDraftCoordinator(state, {
    type: "OPEN_SLOT",
    slot: "layout",
    draft: draft("layout", "section-a"),
  });
  state = reduceBuildDraftCoordinator(state, {
    type: "OPEN_SLOT",
    slot: "chart",
    draft: draft("chart", "chart-a"),
  });
  state = reduceBuildDraftCoordinator(state, { type: "MARK_DIRTY", slot: "layout" });
  state = reduceBuildDraftCoordinator(state, { type: "MARK_DIRTY", slot: "chart" });

  assert.equal(state.slots.layout.status, "dirty");
  assert.equal(state.slots.chart.status, "dirty");
  assert.equal(state.slots.layout.targetId, "section-a");
  assert.equal(state.slots.chart.targetId, "chart-a");
});

test("mode exit waits for both dirty slots and resolves each without overwriting the other", () => {
  let state = createBuildDraftCoordinatorState();
  for (const [slot, targetId] of [["layout", "section-a"], ["chart", "chart-a"]]) {
    state = reduceBuildDraftCoordinator(state, {
      type: "OPEN_SLOT",
      slot,
      draft: draft(slot, targetId),
    });
    state = reduceBuildDraftCoordinator(state, { type: "MARK_DIRTY", slot });
  }

  state = reduceBuildDraftCoordinator(state, {
    type: "REQUEST_RESOLUTION",
    slots: ["layout", "chart"],
    reason: "mode-exit",
  });
  assert.deepEqual(state.resolutionRequest, {
    slots: ["layout", "chart"],
    remaining: ["layout", "chart"],
    reason: "mode-exit",
  });

  state = reduceBuildDraftCoordinator(state, {
    type: "RESOLUTION_SUCCEEDED",
    slot: "layout",
    choice: "save",
    savedValue: { order: ["chart-a"] },
  });
  assert.equal(state.slots.layout.status, "clean");
  assert.equal(state.slots.chart.status, "dirty");
  assert.deepEqual(state.resolutionRequest.remaining, ["chart"]);

  state = reduceBuildDraftCoordinator(state, {
    type: "RESOLUTION_SUCCEEDED",
    slot: "chart",
    choice: "discard",
  });
  assert.equal(state.slots.chart, null);
  assert.equal(state.resolutionRequest, null);
});

test("a failed save keeps only that slot unresolved and retryable", () => {
  let state = createBuildDraftCoordinatorState();
  for (const [slot, targetId] of [["layout", "section-a"], ["chart", "chart-a"]]) {
    state = reduceBuildDraftCoordinator(state, {
      type: "OPEN_SLOT",
      slot,
      draft: draft(slot, targetId),
    });
    state = reduceBuildDraftCoordinator(state, { type: "MARK_DIRTY", slot });
  }
  state = reduceBuildDraftCoordinator(state, {
    type: "REQUEST_RESOLUTION",
    slots: ["layout", "chart"],
    reason: "mode-exit",
  });
  state = reduceBuildDraftCoordinator(state, {
    type: "RESOLUTION_SUCCEEDED",
    slot: "layout",
    choice: "save",
  });
  state = reduceBuildDraftCoordinator(state, {
    type: "RESOLUTION_FAILED",
    slot: "chart",
    choice: "save",
    error: { code: "quota", message: "Storage quota is exhausted.", retryable: true },
  });

  assert.equal(state.slots.layout.status, "clean");
  assert.equal(state.slots.chart.status, "error");
  assert.equal(state.slots.chart.error.code, "quota");
  assert.deepEqual(state.resolutionRequest.remaining, ["chart"]);
});

test("read-only auxiliary parking is FIFO and never moves either approved slot", () => {
  let state = createBuildDraftCoordinatorState();
  state = reduceBuildDraftCoordinator(state, {
    type: "OPEN_SLOT",
    slot: "layout",
    draft: draft("layout", "section-a"),
  });
  state = reduceBuildDraftCoordinator(state, {
    type: "OPEN_SLOT",
    slot: "chart",
    draft: draft("chart", "chart-a"),
  });
  const slotsBefore = state.slots;
  const first = {
    surface: "time-content",
    draftId: "library-a",
    dirty: false,
    mutationCapable: false,
    restoration: restoration("library-a", 80),
  };
  const second = {
    surface: "time-content",
    draftId: "library-b",
    dirty: false,
    mutationCapable: false,
    restoration: restoration("library-b", 120),
  };

  state = reduceBuildDraftCoordinator(state, { type: "OPEN_AUXILIARY", session: first });
  state = reduceBuildDraftCoordinator(state, { type: "OPEN_AUXILIARY", session: second });

  assert.strictEqual(state.slots, slotsBefore);
  assert.equal(state.activeAuxiliary.draftId, "library-b");
  assert.deepEqual(state.parkedAuxiliaries.map(({ draftId }) => draftId), ["library-a"]);
});

test("a mutation-capable auxiliary requests both dirty-slot resolutions before opening", () => {
  let state = createBuildDraftCoordinatorState();
  for (const [slot, targetId] of [["layout", "section-a"], ["chart", "chart-a"]]) {
    state = reduceBuildDraftCoordinator(state, {
      type: "OPEN_SLOT",
      slot,
      draft: draft(slot, targetId),
    });
    state = reduceBuildDraftCoordinator(state, { type: "MARK_DIRTY", slot });
  }

  state = reduceBuildDraftCoordinator(state, {
    type: "OPEN_AUXILIARY",
    session: {
      surface: "scene",
      draftId: "scene-a",
      dirty: false,
      restoration: restoration("scene-a"),
    },
  });

  assert.equal(state.activeAuxiliary, null);
  assert.deepEqual(state.resolutionRequest.remaining, ["layout", "chart"]);
  assert.equal(state.resolutionRequest.reason, "open-auxiliary:scene");
});

test("suspend and resume restore focus, scroll, target, and reason deterministically", () => {
  let state = createBuildDraftCoordinatorState();
  state = reduceBuildDraftCoordinator(state, {
    type: "OPEN_SLOT",
    slot: "chart",
    draft: draft("chart", "chart-a"),
  });
  state = reduceBuildDraftCoordinator(state, { type: "MARK_DIRTY", slot: "chart" });
  const suspendedRestoration = {
    focusId: "chart-title-chart-a",
    scrollTop: 620,
    targetId: "chart-a",
    suspensionReason: "open-source-viewer",
  };
  state = reduceBuildDraftCoordinator(state, {
    type: "SUSPEND_SLOT",
    slot: "chart",
    restoration: suspendedRestoration,
  });
  state = reduceBuildDraftCoordinator(state, { type: "RESUME_SLOT", slot: "chart" });

  assert.equal(state.slots.chart.status, "dirty");
  assert.deepEqual(state.slots.chart.restoration, suspendedRestoration);
});

test("the chart slot preserves one scoped owner identity across surface and lifecycle updates", () => {
  const owner = {
    draftId: "chart-edit:placement-a",
    kind: "chart-edit",
    scopeId: "placement-a",
    targetId: "placement-a",
    status: "dirty",
    activity: "active",
    surface: "quick",
    restoration: { surface: "quick", focusId: "quick-title", scrollTop: 140 },
  };
  let state = reduceBuildDraftCoordinator(createBuildDraftCoordinatorState(), {
    type: "OPEN_SLOT",
    slot: "chart",
    draft: owner,
  });
  state = reduceBuildDraftCoordinator(state, {
    type: "SYNC_SLOT",
    slot: "chart",
    draft: {
      ...owner,
      status: "error",
      activity: "suspended",
      surface: "full",
      restoration: { surface: "full", focusId: "full-title", scrollTop: 510 },
    },
  });

  assert.equal(state.slots.chart.draftId, "chart-edit:placement-a");
  assert.equal(state.slots.chart.scopeId, "placement-a");
  assert.equal(state.slots.chart.surface, "full");
  assert.equal(state.slots.chart.activity, "suspended");
  assert.equal(state.slots.chart.status, "error");
});

test("unknown actions fail exhaustively", () => {
  assert.throws(
    () => reduceBuildDraftCoordinator(createBuildDraftCoordinatorState(), { type: "SURPRISE" }),
    /Unknown Build draft coordinator action: SURPRISE/,
  );
});
