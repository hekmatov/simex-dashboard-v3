import assert from "node:assert/strict";
import test from "node:test";

import {
  createChronoGroupDraft,
  groupAvailabilityRows,
  reduceChronoGroupDraft,
  validateChronoGroupStage,
} from "../src/components/time/chronoGroupDraft.js";
import { partitionSceneCharts } from "../src/components/time/sceneDraft.js";

test("Chrono Group identity is required in the first Name and period stage", () => {
  const draft = createChronoGroupDraft({ group: { id: "chrono-a", period: { startEpochMs: 1, endEpochMs: 2 }, chartIds: [], secondsPerFrame: 1 } });
  assert.deepEqual(validateChronoGroupStage(draft, "period"), {
    code: "NAME_REQUIRED",
    message: "Enter a unique Chrono Group name.",
    focusId: "chrono-group-name",
    retryable: false,
  });
});

test("Stay is not an ordinary Chrono Group editor action", () => {
  const draft = createChronoGroupDraft();
  assert.throws(() => reduceChronoGroupDraft(draft, { type: "STAY" }), /Unknown Chrono Group draft action/);
});

test("availability rows retain whole records in selected, needs-attention, and available regions", () => {
  const rows = [
    { chartId: "selected", selected: true, needsAttention: false },
    { chartId: "broken", selected: true, needsAttention: true },
    { chartId: "available", selected: false, needsAttention: false },
  ];
  const grouped = groupAvailabilityRows(rows);
  assert.deepEqual(grouped.selected.map(({ chartId }) => chartId), ["selected"]);
  assert.deepEqual(grouped.needsAttention.map(({ chartId }) => chartId), ["broken"]);
  assert.deepEqual(grouped.available.map(({ chartId }) => chartId), ["available"]);
});

test("Scene membership uses selected, needs-attention, and parent-available regions", () => {
  const charts = [
    { id: "selected" },
    { id: "broken", needsAttention: true },
    { id: "available" },
  ];
  const grouped = partitionSceneCharts(charts, [{ chartId: "selected" }, { chartId: "broken" }]);
  assert.deepEqual(grouped.selected.map(({ id }) => id), ["selected"]);
  assert.deepEqual(grouped.needsAttention.map(({ id }) => id), ["broken"]);
  assert.deepEqual(grouped.available.map(({ id }) => id), ["available"]);
});
