import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import {
  CHRONO_GROUP_STAGES,
  createChronoGroupDraft,
  deriveAvailabilityRows,
  reduceChronoGroupDraft,
  toSavedChronoGroup,
  validateChronoGroupStage,
} from "../src/components/time/chronoGroupDraft.js";

const DAY_MS = 24 * 60 * 60 * 1_000;
const JAN_1 = Date.UTC(2027, 0, 1);
const JAN_2 = JAN_1 + DAY_MS;
const JAN_3 = JAN_2 + DAY_MS;
const JAN_4 = JAN_3 + DAY_MS;

const vite = await createServer({
  root: process.cwd(),
  configFile: false,
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const ledgerModule = await vite.ssrLoadModule("/src/components/time/AvailabilityLedger.jsx");
const studioModule = await vite.ssrLoadModule("/src/components/time/ChronoGroupEditor.jsx");
await vite.close();

test("Chrono Group draft exposes the approved four stages and validates before advancing", () => {
  assert.deepEqual(CHRONO_GROUP_STAGES, ["period", "charts", "defaults", "review"]);
  let draft = createChronoGroupDraft({
    group: { id: "group-1", name: "Winter response" },
    charts: chartFixtures(),
    scenes: [],
    timeZone: "UTC",
  });

  draft = reduceChronoGroupDraft(draft, { type: "NEXT_STAGE" });
  assert.equal(draft.stage, "period");
  assert.equal(draft.status, "error");
  assert.equal(draft.error.code, "PERIOD_REQUIRED");

  draft = reduceChronoGroupDraft(draft, {
    type: "SET_PERIOD",
    period: { startEpochMs: JAN_1, endEpochMs: JAN_3 },
  });
  draft = reduceChronoGroupDraft(draft, { type: "NEXT_STAGE" });
  assert.equal(draft.stage, "charts");
  assert.equal(draft.error, null);
});

test("availability rows include variable ranges and retain selected zero-observation members in Needs attention", () => {
  const rows = deriveAvailabilityRows({
    charts: chartFixtures(),
    period: { startEpochMs: JAN_1, endEpochMs: JAN_3 },
    selectedChartIds: ["empty-chart", "ready-chart"],
  });

  assert.deepEqual(
    rows.map(({ chartId }) => chartId),
    ["empty-chart", "ready-chart", "categorical-chart"],
  );
  assert.deepEqual(rows[0], {
    chartId: "empty-chart",
    label: "No current observations",
    pageLabel: "Biomedical",
    sectionLabel: "Pressure",
    selected: true,
    needsAttention: true,
    statusText: "Needs attention — no observations in period",
    variables: [{
      variableId: "beds",
      label: "Beds",
      earliestEpochMs: JAN_4,
      latestEpochMs: JAN_4,
      inPeriodCount: 0,
      ticks: [],
    }],
  });
  assert.equal(rows[1].variables[0].inPeriodCount, 2);
  assert.deepEqual(rows[1].variables[0].ticks, [JAN_1, JAN_3]);
});

test("defaults require member fallback for unsupported Interpolate and positive finite cadence", () => {
  let draft = createChronoGroupDraft({
    group: {
      id: "group-1",
      name: "Winter response",
      period: { startEpochMs: JAN_1, endEpochMs: JAN_3 },
      chartIds: ["categorical-chart"],
      defaultMatching: "Interpolate",
      memberFallbacks: {},
      secondsPerFrame: 0,
    },
    charts: chartFixtures(),
    scenes: [],
    timeZone: "UTC",
    initialStage: "defaults",
  });

  assert.equal(validateChronoGroupStage(draft, "defaults").code, "MEMBER_FALLBACK_REQUIRED");
  draft = reduceChronoGroupDraft(draft, {
    type: "SET_MEMBER_FALLBACK",
    chartId: "categorical-chart",
    policy: "Snap to Latest",
  });
  assert.equal(validateChronoGroupStage(draft, "defaults").code, "CADENCE_INVALID");
  draft = reduceChronoGroupDraft(draft, { type: "SET_SECONDS_PER_FRAME", secondsPerFrame: 2.5 });
  assert.equal(validateChronoGroupStage(draft, "defaults"), null);
});

test("shortening a group requires explicit edit-or-clamp resolution for every affected Scene", () => {
  let draft = createChronoGroupDraft({
    group: groupFixture(),
    charts: chartFixtures(),
    scenes: sceneFixtures(),
    timeZone: "UTC",
    initialStage: "review",
  });
  draft = reduceChronoGroupDraft(draft, {
    type: "SET_PERIOD",
    period: { startEpochMs: JAN_2, endEpochMs: JAN_3 },
  });

  assert.deepEqual(draft.sceneConsequences, [
    { sceneId: "scene-before", resolution: null },
    { sceneId: "scene-after", resolution: null },
  ]);
  draft = reduceChronoGroupDraft(draft, {
    type: "RESOLVE_SCENE_CONSEQUENCE",
    sceneId: "scene-before",
    resolution: "edit",
  });
  draft = reduceChronoGroupDraft(draft, { type: "SAVE_REQUEST" });
  assert.equal(draft.status, "error");
  assert.equal(draft.error.code, "SCENE_CONSEQUENCE_REQUIRED");

  draft = reduceChronoGroupDraft(draft, {
    type: "RESOLVE_SCENE_CONSEQUENCE",
    sceneId: "scene-after",
    resolution: "clamp",
  });
  draft = reduceChronoGroupDraft(draft, { type: "SAVE_REQUEST" });
  assert.equal(draft.status, "saving");
  assert.deepEqual(draft.scenes, sceneFixtures());
});

test("Save, failed retry, and Discard preserve the last saved group while Stay is unavailable", () => {
  let draft = createChronoGroupDraft({
    group: groupFixture(),
    charts: chartFixtures(),
    scenes: [],
    timeZone: "UTC",
    initialStage: "review",
  });
  draft = reduceChronoGroupDraft(draft, { type: "SET_NAME", name: "Updated response" });
  assert.throws(
    () => reduceChronoGroupDraft(draft, { type: "STAY" }),
    /Unknown Chrono Group draft action: STAY/,
  );

  let saving = reduceChronoGroupDraft(draft, { type: "SAVE_REQUEST" });
  assert.equal(saving.status, "saving");
  saving = reduceChronoGroupDraft(saving, {
    type: "SAVE_FAILED",
    error: { code: "STORAGE_BUSY", message: "Retry save", retryable: true },
  });
  assert.equal(saving.status, "error");
  assert.equal(saving.value.name, "Updated response");
  assert.equal(saving.baseline.name, "Winter response");
  assert.equal(reduceChronoGroupDraft(saving, { type: "SAVE_REQUEST" }).status, "saving");

  const discarded = reduceChronoGroupDraft(saving, { type: "DISCARD" });
  assert.equal(discarded.status, "clean");
  assert.equal(discarded.value.name, "Winter response");

  const saved = toSavedChronoGroup(draft);
  assert.deepEqual(Object.keys(saved), [
    "id",
    "name",
    "period",
    "chartIds",
    "defaultMatching",
    "memberFallbacks",
    "secondsPerFrame",
  ]);
});

test("suspension restores stage, focus, scroll, and invoking target deterministically", () => {
  const restoration = {
    stage: "charts",
    focusId: "chrono-group-chart-empty-chart",
    scrollTop: 618,
    targetId: "chrono-group-group-1",
  };
  let draft = createChronoGroupDraft({
    group: groupFixture(),
    charts: chartFixtures(),
    scenes: [],
    timeZone: "UTC",
    initialStage: "charts",
  });
  draft = reduceChronoGroupDraft(draft, { type: "SUSPEND", restoration });
  assert.equal(draft.status, "suspended");
  draft = reduceChronoGroupDraft(draft, { type: "RESUME" });
  assert.equal(draft.status, "clean");
  assert.equal(draft.stage, "charts");
  assert.deepEqual(draft.restoration, restoration);
});

test("Availability Ledger communicates status with text rather than colour alone", () => {
  const html = renderToStaticMarkup(React.createElement(ledgerModule.default, {
    rows: deriveAvailabilityRows({
      charts: chartFixtures(),
      period: { startEpochMs: JAN_1, endEpochMs: JAN_3 },
      selectedChartIds: ["empty-chart", "ready-chart"],
    }),
  }));

  assert.match(html, /aria-label="Chart availability"/);
  assert.match(html, /Needs attention — no observations in period/);
  assert.match(html, /2 observations in period/);
  assert.match(html, /Biomedical · Pressure/);
  assert.match(html, /data-status="needs-attention"/);
});

test("Chrono Studio renders all stages and keeps Stay out of ordinary editor actions", () => {
  const draft = createChronoGroupDraft({
    group: groupFixture(),
    charts: chartFixtures(),
    scenes: [],
    timeZone: "UTC",
    initialStage: "charts",
  });
  const html = renderToStaticMarkup(React.createElement(studioModule.default, {
    draft,
    onAction() {},
  }));

  assert.match(html, /Chrono Studio/);
  assert.match(html, />Name and period</);
  assert.match(html, />Choose charts</);
  assert.match(html, />Set defaults</);
  assert.match(html, />Review</);
  assert.match(html, /aria-current="step"[^>]*>Choose charts/);
  assert.match(html, />Save Chrono Group</);
  assert.match(html, />Discard</);
  assert.doesNotMatch(html, />Stay/);

  const periodHtml = renderToStaticMarkup(React.createElement(studioModule.default, {
    draft: { ...draft, stage: "period" },
    onAction() {},
  }));
  assert.equal((periodHtml.match(/type="date"/g) ?? []).length, 2);
  assert.match(periodHtml, /id="chrono-group-name"/);
  assert.doesNotMatch(periodHtml, /readOnly/);
});

function groupFixture() {
  return {
    id: "group-1",
    name: "Winter response",
    period: { startEpochMs: JAN_1, endEpochMs: JAN_4 },
    chartIds: ["ready-chart"],
    defaultMatching: "Concurrent only",
    memberFallbacks: {},
    secondsPerFrame: 2.5,
  };
}

function sceneFixtures() {
  return [{
    id: "scene-before",
    chronoGroupId: "group-1",
    period: { startEpochMs: JAN_1, endEpochMs: JAN_3 },
  }, {
    id: "scene-after",
    chronoGroupId: "group-1",
    period: { startEpochMs: JAN_2, endEpochMs: JAN_4 },
  }, {
    id: "scene-safe",
    chronoGroupId: "group-1",
    period: { startEpochMs: JAN_2, endEpochMs: JAN_3 },
  }];
}

function chartFixtures() {
  return [{
    id: "ready-chart",
    label: "Ready chart",
    pageLabel: "Biomedical",
    sectionLabel: "Overview",
    interpolationAllowed: true,
    variables: [{
      id: "cases",
      label: "Cases",
      observations: [
        { epochMs: JAN_1, value: 10 },
        { epochMs: JAN_3, value: 30 },
      ],
    }],
  }, {
    id: "empty-chart",
    label: "No current observations",
    pageLabel: "Biomedical",
    sectionLabel: "Pressure",
    interpolationAllowed: true,
    variables: [{
      id: "beds",
      label: "Beds",
      observations: [{ epochMs: JAN_4, value: 40 }],
    }],
  }, {
    id: "categorical-chart",
    label: "Categories",
    pageLabel: "Socio-economic",
    sectionLabel: "Signals",
    interpolationAllowed: false,
    variables: [{
      id: "state",
      label: "State",
      observations: [{ epochMs: JAN_2, value: "alert" }],
    }],
  }];
}
