import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  root: process.cwd(),
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
const [
  { default: ScenarioAuthoring, createScenarioDraft, reduceScenarioDraft },
  { default: BuildWorkspace },
] = await Promise.all([
  vite.ssrLoadModule("/src/components/build/ScenarioAuthoring.jsx"),
  vite.ssrLoadModule("/src/components/build/BuildWorkspace.jsx"),
]);
await vite.close();

test("Scenario draft excludes dashboard-level provenance and validates direct edits", () => {
  let draft = createScenarioDraft({
    scenarioLabel: "HeV-A26 Day 2 Simulation",
    programLabel: "Pandemic & Disaster Preparedness Center",
    lastUpdated: "2026-08-19",
    source: { kind: "package", label: "Exercise source package" },
  });
  draft = reduceScenarioDraft(draft, {
    type: "EDIT_FIELD",
    field: "source",
    value: { kind: "local", label: "Changed" },
  });
  assert.equal(draft.error.code, "READ_ONLY_FIELD");
  assert.equal(Object.hasOwn(draft.value, "source"), false);
  assert.equal(Object.hasOwn(draft.baseline, "source"), false);

  draft = reduceScenarioDraft(draft, {
    type: "EDIT_FIELD",
    field: "scenarioLabel",
    value: "",
  });
  draft = reduceScenarioDraft(draft, { type: "SAVE_REQUEST" });
  assert.equal(draft.status, "error");
  assert.equal(draft.error.code, "SCENARIO_NAME_REQUIRED");
});

test("Scenario Save/Discard/Stay and failed-save retry are scope-specific", () => {
  let draft = createScenarioDraft({
    scenarioLabel: "Day 2",
    programLabel: "PDPC",
    lastUpdated: "2026-08-19",
    source: { kind: "package", label: "Source A" },
    home: { enabled: true },
  });
  draft = reduceScenarioDraft(draft, {
    type: "SET_HOME_ENABLED",
    enabled: false,
  });
  assert.equal(draft.status, "dirty");
  assert.deepEqual(draft.value.home, { enabled: false });
  const stay = reduceScenarioDraft(draft, { type: "STAY" });
  assert.equal(stay.status, "dirty");
  const saving = reduceScenarioDraft(stay, { type: "SAVE_REQUEST" });
  const failed = reduceScenarioDraft(saving, {
    type: "SAVE_FAILED",
    error: { code: "QUOTA_EXHAUSTED", message: "Storage quota exhausted", retryable: true },
  });
  assert.equal(failed.status, "error");
  assert.deepEqual(failed.value.home, { enabled: false });
  assert.deepEqual(failed.baseline.home, { enabled: true });
  assert.equal(reduceScenarioDraft(failed, { type: "SAVE_REQUEST" }).status, "saving");
  assert.deepEqual(
    reduceScenarioDraft(failed, { type: "DISCARD" }).value.home,
    { enabled: true },
  );
});

test("Scenario Home availability accepts only boolean draft edits", () => {
  const baseline = createScenarioDraft({
    scenarioLabel: "Day 2",
    programLabel: "PDPC",
    lastUpdated: "2026-08-19",
    home: { enabled: false },
  });
  assert.deepEqual(baseline.value.home, { enabled: false });

  const invalid = reduceScenarioDraft(baseline, {
    type: "SET_HOME_ENABLED",
    enabled: "false",
  });
  assert.deepEqual(invalid.value.home, { enabled: false });
  assert.equal(invalid.status, "error");

  const enabled = reduceScenarioDraft(invalid, {
    type: "SET_HOME_ENABLED",
    enabled: true,
  });
  assert.deepEqual(enabled.value.home, { enabled: true });
  assert.equal(enabled.status, "dirty");
});

test("Scenario surface exposes scoped actions without mutating its input", () => {
  const scenario = {
    scenarioLabel: "Day 2",
    programLabel: "PDPC",
    lastUpdated: "2026-08-19",
    source: { kind: "package", label: "Source A" },
  };
  const before = JSON.stringify(scenario);
  const html = renderToStaticMarkup(React.createElement(ScenarioAuthoring, {
    draft: createScenarioDraft(scenario),
    onAction() {},
  }));

  assert.match(html, /Scenario Passport/);
  assert.match(html, /Save Scenario/);
  assert.doesNotMatch(html, /Source provenance|Source A|unknown/i);
  assert.equal(JSON.stringify(scenario), before);
});

test("Build assigns structure inspection to Dashboard Map and Scenario to the Crown", () => {
  const dashboard = structureFixture();
  const activePage = dashboard.pages[0];
  const html = renderToStaticMarkup(React.createElement(BuildWorkspace, {
    dashboard,
    activePage,
    buildPanelOpen: true,
    selection: { kind: "page", pageId: activePage.id },
    dashboardDraft: {
      scenarioLabel: "Day 2",
      programLabel: "PDPC",
      lastUpdated: "2026-08-19",
    },
    pageDrafts: {},
    sectionDrafts: {},
    deviceLayout: "desktop",
  }));

  assert.match(html, /data-build-auxiliary-contract="context-shelf"/);
  assert.match(html, /id="dashboard-map-panel"/);
  assert.match(html, /data-dashboard-map-region="structure"/);
  assert.match(html, /data-build-command-action="chrono-studio"/);
  assert.match(html, /data-build-command-action="more"/);
  assert.match(html, /data-build-more-command="scene-studio"/);
  assert.doesNotMatch(html, /Pages (?:&amp;|and) sections/);
  assert.doesNotMatch(html, /data-context-shelf-entry="structure"/);
  assert.doesNotMatch(html, />Scenario details|>Time Content/);
});

function structureFixture() {
  return {
    pages: [{
      id: "biomedical",
      label: "Biomedical",
      sections: [
        { id: "outbreak", title: "Outbreak", panels: [{ id: "outbreak-panel", chart: { id: "cases" } }] },
        { id: "pressure", title: "Pressure", panels: [{ id: "pressure-panel", chart: { id: "admissions" } }] },
      ],
    }],
    chronoGroups: [{ id: "national", members: [{ chartId: "admissions" }] }],
    scenes: [{ id: "briefing", chartIds: ["admissions"] }],
  };
}
