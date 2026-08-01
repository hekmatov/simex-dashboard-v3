import assert from "node:assert/strict";
import test from "node:test";

import {
  createSubmissionGate,
  runModeratorTransaction,
} from "../src/lib/moderatorTransaction.js";

test("moderator transaction closes only after flush and commit", async () => {
  const order = [];
  await runModeratorTransaction({
    flush: async () => order.push("flush"),
    commit: async () => { order.push("commit"); return "saved"; },
    onCommitted: async (value) => order.push(`close:${value}`),
  });
  assert.deepEqual(order, ["flush", "commit", "close:saved"]);
});

test("moderator transaction preserves the editing context on failure", async () => {
  let closed = false;
  await assert.rejects(runModeratorTransaction({
    flush: async () => {},
    commit: async () => { throw new Error("storage failed"); },
    onCommitted: async () => { closed = true; },
  }), /storage failed/);
  assert.equal(closed, false);
});

test("submission gate coalesces duplicate activation and reopens", async () => {
  const gate = createSubmissionGate();
  let calls = 0;
  let release;
  const operation = () => {
    calls += 1;
    return new Promise((resolve) => { release = resolve; });
  };
  const first = gate.run(operation);
  const second = gate.run(operation);
  assert.equal(first, second);
  assert.equal(calls, 1);
  release("saved");
  assert.equal(await first, "saved");
  assert.equal(await gate.run(async () => "again"), "again");
});

test("submission gate coalesces synchronous failures and reopens after rejection", async () => {
  const gate = createSubmissionGate();
  let calls = 0;
  const operation = () => {
    calls += 1;
    throw new Error("sync failure");
  };
  const first = gate.run(operation);
  const second = gate.run(operation);
  assert.equal(first, second);
  assert.equal(calls, 1);
  assert.equal(gate.isActive(), true);
  await assert.rejects(first, /sync failure/);
  assert.equal(gate.isActive(), false);
  assert.equal(await gate.run(async () => "again"), "again");
});

test("submission gate coalesces asynchronous rejections and reopens after settlement", async () => {
  const gate = createSubmissionGate();
  let calls = 0;
  let reject;
  const operation = () => {
    calls += 1;
    return new Promise((resolve, rejectOperation) => { reject = rejectOperation; });
  };
  const first = gate.run(operation);
  const second = gate.run(operation);
  assert.equal(first, second);
  assert.equal(calls, 1);
  assert.equal(gate.isActive(), true);
  reject(new Error("async failure"));
  await assert.rejects(first, /async failure/);
  assert.equal(gate.isActive(), false);
  assert.equal(await gate.run(async () => "again"), "again");
});
