import test from "node:test";
import assert from "node:assert/strict";
import { scrubberModel, timeBarKeyboardAction } from "../src/charting/time/scrubberModel.js";
import { temporalCoverageRuns } from "../src/charting/time/temporalAvailability.js";

const A = Date.parse("2027-01-01T00:00:00.000Z");
const clock = [A, A + 10_000, A + 40_000];

test("scrubber positions use elapsed time, independent observation coverage and declared exercise now", () => {
  const model = scrubberModel({ clock, activeEpochMs: A + 20_000, exerciseEpochMs: A + 30_000,
    coverageRuns: [[A, A + 10_000], [A + 35_000, A + 40_000]] });
  assert.deepEqual(model.ticks, [0, 0.25, 1]);
  assert.deepEqual(model.coverageBands, [[0, 0.25], [0.875, 1]]);
  assert.equal(model.thumb, 0.5);
  assert.equal(model.exerciseNow, 0.75);
  assert.equal(model.disabled, false);
});

test("empty and single-frame clocks have honest disabled and finite geometry", () => {
  assert.deepEqual(scrubberModel({ clock: [] }), { disabled: true, start: null, end: null, ticks: [], coverageBands: [], thumb: null, exerciseNow: null });
  const single = scrubberModel({ clock: [A], activeEpochMs: A, exerciseEpochMs: A });
  assert.equal(single.thumb, 0.5);
  assert.deepEqual(single.ticks, [0.5]);
  assert.equal(single.exerciseNow, 0.5);
});

test("authored windows clip runs without changing cadence ticks or inventing observation coverage", () => {
  const model = scrubberModel({ clock, activeEpochMs: A - 1, exerciseEpochMs: A + 100_000,
    window: { start: new Date(A).toISOString(), end: new Date(A + 80_000).toISOString() },
    coverageRuns: [[A - 10_000, A + 10_000], [A + 60_000, A + 100_000]] });
  assert.deepEqual(model.ticks, [0, 0.125, 0.5]);
  assert.deepEqual(model.coverageBands, [[0, 0.125], [0.75, 1]]);
  assert.equal(model.exerciseNow, null);
  assert.equal(model.thumb, 0);
});

test("observation coverage keeps large gaps visible and never uses calendar no-data frames", () => {
  assert.deepEqual(temporalCoverageRuns([A, A + 10, A + 20, A + 70, A + 80]), [[A, A + 20], [A + 70, A + 80]]);
  assert.deepEqual(temporalCoverageRuns([]), []);
  assert.deepEqual(temporalCoverageRuns([A]), [[A, A]]);
});

test("time keyboard bindings stay inside their surface and leave text and select controls alone", () => {
  for (const target of [{ tagName: "INPUT", type: "date" }, { tagName: "TEXTAREA" }, { tagName: "SELECT" }, { isContentEditable: true }]) {
    for (const key of ["ArrowLeft", "ArrowRight", "Home", "End", " ", "Escape"]) assert.equal(timeBarKeyboardAction({ key, target, clock }), null);
  }
  assert.equal(timeBarKeyboardAction({ key: "x", clock }), null);
  for (const modifier of ["altKey", "ctrlKey", "metaKey"]) assert.equal(timeBarKeyboardAction({ key: "ArrowLeft", clock, [modifier]: true }), null);
  assert.deepEqual(timeBarKeyboardAction({ key: "ArrowLeft", clock }), { type: "cursorStep", direction: -1 });
  assert.deepEqual(timeBarKeyboardAction({ key: " ", clock, playing: true }), { type: "pause" });
  assert.deepEqual(timeBarKeyboardAction({ key: "Home", clock }), { type: "cursorSeek", epochMs: A });
  assert.deepEqual(timeBarKeyboardAction({ key: "End", clock }), { type: "cursorSeek", epochMs: A + 40_000 });
  assert.equal(timeBarKeyboardAction({ key: "ArrowRight", clock: [] }), null);
});

test("Escape closes the scrubber first, then settings, then returns Live; range Shift seeks finely", () => {
  assert.deepEqual(timeBarKeyboardAction({ key: "Escape", scrubberOpen: true, settingsOpen: true }), { type: "closeScrubber" });
  assert.deepEqual(timeBarKeyboardAction({ key: "Escape", settingsOpen: true }), { type: "closeSettings" });
  assert.deepEqual(timeBarKeyboardAction({ key: "Escape" }), { type: "cursorLive" });
  assert.deepEqual(timeBarKeyboardAction({ key: "ArrowRight", shiftKey: true, target: { tagName: "INPUT", type: "range" }, clock,
    activeEpochMs: A + 10_000 }), { type: "cursorSeek", epochMs: A + 10_040 });
});

test("Space retains native focused button activation for Live and settings actions", () => {
  for (const label of ["Return to Live", "Apply window", "Apply nearest override"]) {
    assert.equal(timeBarKeyboardAction({ key: " ", target: { tagName: "BUTTON", ariaLabel: label }, clock, playing: true }), null);
  }
  assert.deepEqual(timeBarKeyboardAction({ key: " ", target: { tagName: "INPUT", type: "range" }, clock, playing: true }), { type: "pause" });
});
