import test from "node:test";
import assert from "node:assert/strict";

const displayModule = await import("../src/lib/displayController.js").catch(
  () => null,
);

test("display controller is available", () => {
  assert.equal(
    typeof displayModule?.initialDisplayState,
    "function",
    "initialDisplayState must be implemented",
  );
  assert.equal(
    typeof displayModule?.reduceDisplayState,
    "function",
    "reduceDisplayState must be implemented",
  );
});

test("manual and companion actions use one revisioned display state", () => {
  assert.ok(displayModule, "display controller must be implemented");
  let state = displayModule.initialDisplayState();
  state = displayModule.reduceDisplayState(state, {
    type: "manual_open",
    chart_id: "a",
  });
  assert.deepEqual(state.displayed_chart_ids, ["a"]);
  assert.equal(state.display_revision, 1);
  assert.equal(state.layout, "solo");

  state = displayModule.reduceDisplayState(state, {
    type: "companion_set",
    expected_display_revision: 1,
    chart_ids: ["a", "b"],
  });
  assert.deepEqual(state.displayed_chart_ids, ["a", "b"]);
  assert.equal(state.display_revision, 2);
  assert.equal(state.layout, "sideBySide");

  state = displayModule.reduceDisplayState(state, {
    type: "manual_close",
    chart_id: "a",
  });
  assert.deepEqual(state.displayed_chart_ids, ["b"]);
  assert.equal(state.display_revision, 3);
  assert.equal(state.layout, "solo");
});

test("no-op display actions preserve object identity and revision", () => {
  assert.ok(displayModule, "display controller must be implemented");
  const initial = displayModule.initialDisplayState();
  const opened = displayModule.reduceDisplayState(initial, {
    type: "manual_open",
    chart_id: "a",
  });

  assert.equal(
    displayModule.reduceDisplayState(opened, {
      type: "manual_open",
      chart_id: "a",
    }),
    opened,
  );
  assert.equal(
    displayModule.reduceDisplayState(opened, {
      type: "manual_close",
      chart_id: "missing",
    }),
    opened,
  );
  assert.equal(
    displayModule.reduceDisplayState(opened, {
      type: "companion_set",
      expected_display_revision: 1,
      chart_ids: ["a"],
    }),
    opened,
  );
});

test("stale, duplicate, unknown, and over-capacity actions fail with stable codes", () => {
  assert.ok(displayModule, "display controller must be implemented");
  const state = displayModule.initialDisplayState();
  const validChartIds = new Set(["a", "b", "c", "d", "e"]);

  assert.throws(
    () =>
      displayModule.reduceDisplayState(state, {
        type: "companion_set",
        expected_display_revision: 9,
        chart_ids: ["a"],
      }),
    /stale_revision/,
  );
  assert.throws(
    () =>
      displayModule.reduceDisplayState(
        state,
        { type: "manual_open", chart_id: "missing" },
        validChartIds,
      ),
    /invalid_chart/,
  );
  assert.throws(
    () =>
      displayModule.reduceDisplayState(state, {
        type: "companion_set",
        expected_display_revision: 0,
        chart_ids: ["a", "a"],
      }),
    /invalid_chart/,
  );
  assert.throws(
    () =>
      displayModule.reduceDisplayState(state, {
        type: "companion_set",
        expected_display_revision: 0,
        chart_ids: ["a", "b", "c", "d", "e"],
      }),
    /capacity_exceeded/,
  );
});

test("manual reorder requires an exact permutation and increments revision", () => {
  assert.ok(displayModule, "display controller must be implemented");
  let state = displayModule.initialDisplayState();
  state = displayModule.reduceDisplayState(state, {
    type: "companion_set",
    expected_display_revision: 0,
    chart_ids: ["a", "b", "c"],
  });
  const reordered = displayModule.reduceDisplayState(state, {
    type: "manual_reorder",
    chart_ids: ["c", "a", "b"],
  });

  assert.deepEqual(reordered.displayed_chart_ids, ["c", "a", "b"]);
  assert.equal(reordered.display_revision, 2);
  assert.equal(reordered.layout, "topFocus");
  assert.throws(
    () =>
      displayModule.reduceDisplayState(reordered, {
        type: "manual_reorder",
        chart_ids: ["c", "a"],
      }),
    /invalid_chart/,
  );
});

test("manual multi-selection opens one exact display set in one revision", () => {
  assert.ok(displayModule, "display controller must be implemented");
  const state = displayModule.reduceDisplayState(
    displayModule.initialDisplayState(),
    { type: "manual_set", chart_ids: ["a", "b", "c"] },
  );

  assert.deepEqual(state.displayed_chart_ids, ["a", "b", "c"]);
  assert.equal(state.display_revision, 1);
  assert.equal(state.layout, "topFocus");
});

test("layout is local presentation state and does not advance display revision", () => {
  assert.ok(displayModule, "display controller must be implemented");
  let state = displayModule.initialDisplayState();
  state = displayModule.reduceDisplayState(state, {
    type: "companion_set",
    expected_display_revision: 0,
    chart_ids: ["a", "b"],
  });
  const changed = displayModule.reduceDisplayState(state, {
    type: "layout_changed",
    layout: "overUnder",
  });

  assert.equal(changed.layout, "overUnder");
  assert.equal(changed.display_revision, state.display_revision);
  assert.throws(
    () =>
      displayModule.reduceDisplayState(state, {
        type: "layout_changed",
        layout: "grid2x2",
      }),
    /invalid_layout/,
  );
});

test("close-all and reconciliation are centralized display transitions", () => {
  assert.ok(displayModule, "display controller must be implemented");
  let state = displayModule.initialDisplayState();
  state = displayModule.reduceDisplayState(state, {
    type: "companion_reconcile",
    chart_ids: ["a", "b"],
  });
  assert.deepEqual(state.displayed_chart_ids, ["a", "b"]);
  assert.equal(state.display_revision, 1);

  state = displayModule.reduceDisplayState(state, { type: "manual_close_all" });
  assert.deepEqual(state.displayed_chart_ids, []);
  assert.equal(state.display_revision, 2);
  assert.equal(
    displayModule.reduceDisplayState(state, { type: "manual_close_all" }),
    state,
  );
});

test("state and visible chart IDs are immutable", () => {
  assert.ok(displayModule, "display controller must be implemented");
  const state = displayModule.reduceDisplayState(
    displayModule.initialDisplayState(),
    { type: "manual_open", chart_id: "a" },
  );

  assert.ok(Object.isFrozen(state));
  assert.ok(Object.isFrozen(state.displayed_chart_ids));
  assert.throws(() => state.displayed_chart_ids.push("b"), TypeError);
});
