import assert from "node:assert/strict";
import test from "node:test";

import { createOperationStatusQueue } from "../src/lib/operationStatusQueue.js";

test("routine progress waits 500 ms while blocking work appears immediately", () => {
  const clock = fakeClock();
  const queue = createOperationStatusQueue({ scheduler: clock });

  queue.beginOperation({ key: "routine", label: "Loading source" });
  assert.deepEqual(queue.getSnapshot().notices, []);
  clock.advance(499);
  assert.deepEqual(queue.getSnapshot().notices, []);
  clock.advance(1);
  assert.deepEqual(queue.getSnapshot().notices.map(pickNotice), [{
    key: "routine",
    label: "Loading source",
    status: "working",
    message: "Loading source",
  }]);

  queue.beginOperation({ key: "blocking", label: "Clearing dashboard", blocking: true });
  assert.equal(queue.getSnapshot().notices.at(-1).key, "blocking");
});

test("stable keys update one notice and stale handles cannot overwrite newer work", () => {
  const clock = fakeClock();
  const queue = createOperationStatusQueue({ scheduler: clock });
  const first = queue.beginOperation({ key: "package", label: "Reading package", blocking: true });
  const second = queue.beginOperation({ key: "package", label: "Importing package", blocking: true });

  first.succeed("Old operation completed");
  assert.deepEqual(queue.getSnapshot().notices.map(pickNotice), [{
    key: "package",
    label: "Importing package",
    status: "working",
    message: "Importing package",
  }]);

  second.succeed("Package imported");
  assert.equal(queue.getSnapshot().notices.length, 1);
  assert.equal(queue.getSnapshot().notices[0].status, "completed");
  assert.equal(queue.getSnapshot().notices[0].message, "Package imported");
});

test("a dismissed operation handle cannot mutate a later operation that reuses its key", () => {
  const queue = createOperationStatusQueue({ scheduler: fakeClock() });
  const first = queue.beginOperation({ key: "package", label: "First package", blocking: true });
  assert.equal(first.dismiss(), true);

  const second = queue.beginOperation({ key: "package", label: "Second package", blocking: true });
  assert.equal(first.dismiss(), false);
  assert.equal(first.fail(new Error("stale failure")), false);
  assert.equal(first.succeed("stale success"), false);
  assert.deepEqual(queue.getSnapshot().notices.map(pickNotice), [{
    key: "package",
    label: "Second package",
    status: "working",
    message: "Second package",
  }]);

  assert.equal(second.succeed("Second package imported"), true);
  assert.equal(queue.getSnapshot().notices[0].message, "Second package imported");
});

test("success is polite for four seconds while fast work skips only the working state", () => {
  const clock = fakeClock();
  const queue = createOperationStatusQueue({ scheduler: clock });
  const visible = queue.beginOperation({ key: "layout", label: "Saving layout", blocking: true });
  visible.succeed("Layout saved");

  assert.equal(queue.getSnapshot().notices[0].status, "completed");
  assert.deepEqual(queue.getSnapshot().announcement, {
    key: "layout",
    message: "Layout saved",
    politeness: "polite",
    revision: 2,
  });
  clock.advance(3999);
  assert.equal(queue.getSnapshot().notices.length, 1);
  clock.advance(1);
  assert.deepEqual(queue.getSnapshot().notices, []);

  const fast = queue.beginOperation({ key: "fast", label: "Fast save" });
  fast.succeed("Fast save completed");
  assert.deepEqual(queue.getSnapshot().notices.map(pickNotice), [{
    key: "fast",
    label: "Fast save",
    status: "completed",
    message: "Fast save completed",
  }]);
  clock.advance(4000);
  assert.deepEqual(queue.getSnapshot().notices, []);
});

test("elapsed wall-clock time makes a completed operation visible when its delay timer was starved", () => {
  const clock = fakeClock();
  const queue = createOperationStatusQueue({ scheduler: clock });
  const operation = queue.beginOperation({
    key: "layout",
    label: "Saving layout",
    reportCompletion: false,
  });

  clock.elapseWithoutTimers(3_000);
  operation.succeed("Layout saved");

  assert.deepEqual(queue.getSnapshot().notices.map(pickNotice), [{
    key: "layout",
    label: "Saving layout",
    status: "completed",
    message: "Layout saved",
  }]);
  clock.advance(4_000);
  assert.deepEqual(queue.getSnapshot().notices, []);
});

test("an explicitly quiet fast operation remains hidden until its wall-clock threshold", () => {
  const clock = fakeClock();
  const queue = createOperationStatusQueue({ scheduler: clock });
  const operation = queue.beginOperation({
    key: "prefetch",
    label: "Prefetching",
    reportCompletion: false,
  });

  operation.succeed("Prefetched");
  assert.deepEqual(queue.getSnapshot().notices, []);
});

test("semantic activity appears immediately and stable keys coalesce repeated draft updates", () => {
  const clock = fakeClock();
  const queue = createOperationStatusQueue({ scheduler: clock });

  queue.reportActivity({
    key: "chart-draft:update",
    label: "Chart draft",
    message: "Updating chart draft.",
  });
  queue.reportActivity({
    key: "chart-draft:update",
    label: "Chart draft",
    message: "Chart draft updated: title changed.",
  });

  assert.deepEqual(queue.getSnapshot().notices.map(pickNotice), [{
    key: "chart-draft:update",
    label: "Chart draft",
    status: "completed",
    message: "Chart draft updated: title changed.",
  }]);
  clock.advance(4_000);
  assert.deepEqual(queue.getSnapshot().notices, []);
});

test("failures appear assertively and persist until dismissed", () => {
  const clock = fakeClock();
  const queue = createOperationStatusQueue({ scheduler: clock });
  const operation = queue.beginOperation({ key: "source", label: "Loading source" });
  operation.fail(new Error("Source could not be loaded"));

  assert.deepEqual(queue.getSnapshot().notices.map(pickNotice), [{
    key: "source",
    label: "Loading source",
    status: "failed",
    message: "Source could not be loaded",
  }]);
  assert.equal(queue.getSnapshot().announcement.politeness, "assertive");
  clock.advance(60_000);
  assert.equal(queue.getSnapshot().notices.length, 1);
  operation.dismiss();
  assert.deepEqual(queue.getSnapshot().notices, []);
});

test("the visible stack retains only the four most recently updated notices", () => {
  const queue = createOperationStatusQueue({ scheduler: fakeClock() });
  for (let index = 1; index <= 5; index += 1) {
    queue.beginOperation({ key: `operation-${index}`, label: `Operation ${index}`, blocking: true });
  }
  assert.deepEqual(
    queue.getSnapshot().notices.map(({ key }) => key),
    ["operation-2", "operation-3", "operation-4", "operation-5"],
  );
});

test("overflow failures remain pending and surface without a stale announcement", () => {
  const queue = createOperationStatusQueue({ scheduler: fakeClock() });
  const operations = [];
  for (let index = 1; index <= 5; index += 1) {
    const operation = queue.beginOperation({
      key: `failure-${index}`,
      label: `Failure ${index}`,
      blocking: true,
    });
    operation.fail(new Error(`Failure ${index} details`));
    operations.push(operation);
  }

  assert.deepEqual(
    queue.getSnapshot().notices.map(({ key }) => key),
    ["failure-2", "failure-3", "failure-4", "failure-5"],
  );
  assert.equal(operations[4].dismiss(), true);
  assert.deepEqual(
    queue.getSnapshot().notices.map(({ key }) => key),
    ["failure-1", "failure-2", "failure-3", "failure-4"],
  );
  assert.equal(queue.getSnapshot().announcement, null);
  assert.equal(operations[0].dismiss(), true);
});

function pickNotice({ key, label, status, message }) {
  return { key, label, status, message };
}

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    setTimeout(callback, delay) {
      const id = nextId;
      nextId += 1;
      timers.set(id, { at: now + delay, callback });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    now() {
      return now;
    },
    elapseWithoutTimers(milliseconds) {
      now += milliseconds;
    },
    advance(milliseconds) {
      now += milliseconds;
      while (true) {
        const due = [...timers.entries()]
          .filter(([, timer]) => timer.at <= now)
          .sort((left, right) => left[1].at - right[1].at || left[0] - right[0]);
        if (due.length === 0) return;
        for (const [id, timer] of due) {
          timers.delete(id);
          timer.callback();
        }
      }
    },
  };
}
