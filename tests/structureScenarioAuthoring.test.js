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
const structureModule = await vite
  .ssrLoadModule("/src/components/build/StructureAuthoring.jsx")
  .catch(() => null);
const scenarioModule = await vite
  .ssrLoadModule("/src/components/build/ScenarioAuthoring.jsx")
  .catch(() => null);
const workspaceModule = await vite
  .ssrLoadModule("/src/components/build/BuildWorkspace.jsx")
  .catch(() => null);
await vite.close();

test("Structure draft preserves stable IDs while keyboard reorder changes only order", () => {
  assert.equal(typeof structureModule?.createStructureDraft, "function");
  assert.equal(typeof structureModule?.reduceStructureDraft, "function");
  const dashboard = structureFixture();
  const draft = structureModule.createStructureDraft(dashboard);
  const next = structureModule.reduceStructureDraft(draft, {
    type: "REORDER_SECTION",
    pageId: "biomedical",
    sectionId: "pressure",
    direction: "earlier",
    input: "keyboard",
  });

  assert.deepEqual(next.value.pages[0].sections.map(({ id }) => id), ["pressure", "outbreak"]);
  assert.deepEqual(next.value.pages[0].sections[0].panels.map(({ id }) => id), ["pressure-panel"]);
  assert.equal(next.status, "dirty");
  assert.equal(dashboard.pages[0].sections[0].id, "outbreak");
});

test("Structure draft requires disposition for content but permits reversible zero recovery states", () => {
  const draft = structureModule.createStructureDraft(structureFixture());
  const nonEmpty = structureModule.reduceStructureDraft(draft, {
    type: "REMOVE_SECTION",
    pageId: "biomedical",
    sectionId: "pressure",
  });
  assert.equal(nonEmpty.status, "error");
  assert.equal(nonEmpty.error.code, "SECTION_DISPOSITION_REQUIRED");
  assert.equal(nonEmpty.value.pages[0].sections.length, 2);

  const singlePage = structureModule.createStructureDraft({
    pages: [{ id: "only", label: "Only", sections: [{ id: "section", panels: [] }] }],
  });
  const finalPage = structureModule.reduceStructureDraft(singlePage, {
    type: "REMOVE_PAGE",
    pageId: "only",
    disposition: "delete",
  });
  assert.equal(finalPage.status, "dirty");
  assert.equal(finalPage.value.pages.length, 0);
  assert.equal(structureModule.validateStructureDraft(finalPage.value).code, "PAGE_REQUIRED");

  const singleSection = structureModule.createStructureDraft({
    pages: [{ id: "only", label: "Only", sections: [{ id: "section", panels: [] }] }],
  });
  const zeroSection = structureModule.reduceStructureDraft(singleSection, {
    type: "REMOVE_SECTION",
    pageId: "only",
    sectionId: "section",
    disposition: "delete",
  });
  assert.equal(zeroSection.value.pages[0].sections.length, 0);
  assert.equal(structureModule.validateStructureDraft(zeroSection.value).code, "SECTION_REQUIRED");
});

test("Structure surface exposes inline repair actions for zero Page and zero Section drafts", () => {
  const zeroPages = structureModule.createStructureDraft({ pages: [] });
  const zeroPagesHtml = renderToStaticMarkup(React.createElement(structureModule.default, {
    draft: zeroPages,
    onAction() {},
  }));
  assert.match(zeroPagesHtml, /No Pages remain in this Structure draft/);
  assert.match(zeroPagesHtml, /Create replacement Page/);

  const zeroSections = structureModule.createStructureDraft({
    pages: [{ id: "only", label: "Only", sections: [] }],
  });
  const zeroSectionsHtml = renderToStaticMarkup(React.createElement(structureModule.default, {
    draft: zeroSections,
    onAction() {},
  }));
  assert.match(zeroSectionsHtml, /Only has no Sections/);
  assert.match(zeroSectionsHtml, /Create replacement Section/);
});

test("Structure Save, failed retry, Discard, and Stay preserve the last-good dashboard", () => {
  const baseline = structureFixture();
  let draft = structureModule.createStructureDraft(baseline);
  draft = structureModule.reduceStructureDraft(draft, {
    type: "RENAME_SECTION",
    pageId: "biomedical",
    sectionId: "pressure",
    title: "Hospital pressure",
  });
  draft = structureModule.reduceStructureDraft(draft, { type: "SAVE_REQUEST" });
  draft = structureModule.reduceStructureDraft(draft, {
    type: "SAVE_FAILED",
    error: { code: "STORAGE_UNAVAILABLE", message: "Retry", retryable: true },
  });
  assert.equal(draft.status, "error");
  assert.equal(draft.value.pages[0].sections[1].title, "Hospital pressure");
  assert.equal(draft.baseline.pages[0].sections[1].title, "Pressure");

  const retry = structureModule.reduceStructureDraft(draft, { type: "SAVE_REQUEST" });
  assert.equal(retry.status, "saving");
  const stay = structureModule.reduceStructureDraft(draft, { type: "STAY" });
  assert.equal(stay.status, "dirty");
  const discarded = structureModule.reduceStructureDraft(stay, { type: "DISCARD" });
  assert.equal(discarded.status, "clean");
  assert.equal(discarded.value.pages[0].sections[1].title, "Pressure");
});

test("Structure suspension restores target, scroll, focus, and active command", () => {
  const restoration = {
    targetId: "pressure",
    scrollTop: 744,
    focusId: "section-pressure-move",
    activeCommand: "move-to-page",
  };
  let draft = structureModule.createStructureDraft(structureFixture());
  draft = structureModule.reduceStructureDraft(draft, { type: "SUSPEND", restoration });
  assert.equal(draft.status, "suspended");
  const resumed = structureModule.reduceStructureDraft(draft, { type: "RESUME" });
  assert.equal(resumed.status, "clean");
  assert.deepEqual(resumed.restoration, restoration);
});

test("Scenario Passport keeps source provenance read-only and validates direct edits", () => {
  assert.equal(typeof scenarioModule?.createScenarioDraft, "function");
  assert.equal(typeof scenarioModule?.reduceScenarioDraft, "function");
  let draft = scenarioModule.createScenarioDraft({
    scenarioLabel: "HeV-A26 Day 2 Simulation",
    programLabel: "Pandemic & Disaster Preparedness Center",
    lastUpdated: "2026-08-19",
    source: { kind: "package", label: "Exercise source package" },
  });
  draft = scenarioModule.reduceScenarioDraft(draft, {
    type: "EDIT_FIELD",
    field: "source",
    value: { kind: "local", label: "Changed" },
  });
  assert.equal(draft.error.code, "READ_ONLY_FIELD");
  assert.equal(draft.value.source.label, "Exercise source package");

  draft = scenarioModule.reduceScenarioDraft(draft, {
    type: "EDIT_FIELD",
    field: "scenarioLabel",
    value: "",
  });
  draft = scenarioModule.reduceScenarioDraft(draft, { type: "SAVE_REQUEST" });
  assert.equal(draft.status, "error");
  assert.equal(draft.error.code, "SCENARIO_NAME_REQUIRED");
});

test("Scenario Save/Discard/Stay and failed-save retry are scope-specific", () => {
  let draft = scenarioModule.createScenarioDraft({
    scenarioLabel: "Day 2",
    programLabel: "PDPC",
    lastUpdated: "2026-08-19",
    source: { kind: "package", label: "Source A" },
  });
  draft = scenarioModule.reduceScenarioDraft(draft, {
    type: "EDIT_FIELD",
    field: "scenarioLabel",
    value: "Day 3",
  });
  const stay = scenarioModule.reduceScenarioDraft(draft, { type: "STAY" });
  assert.equal(stay.status, "dirty");
  const saving = scenarioModule.reduceScenarioDraft(stay, { type: "SAVE_REQUEST" });
  const failed = scenarioModule.reduceScenarioDraft(saving, {
    type: "SAVE_FAILED",
    error: { code: "QUOTA_EXHAUSTED", message: "Storage quota exhausted", retryable: true },
  });
  assert.equal(failed.status, "error");
  assert.equal(failed.value.scenarioLabel, "Day 3");
  assert.equal(failed.baseline.scenarioLabel, "Day 2");
  assert.equal(scenarioModule.reduceScenarioDraft(failed, { type: "SAVE_REQUEST" }).status, "saving");
  assert.equal(scenarioModule.reduceScenarioDraft(failed, { type: "DISCARD" }).value.scenarioLabel, "Day 2");
});

test("Structure and Scenario surfaces expose scoped actions without mutating their inputs", () => {
  assert.equal(typeof structureModule?.default, "function");
  assert.equal(typeof scenarioModule?.default, "function");
  const dashboard = structureFixture();
  const before = JSON.stringify(dashboard);
  const structureHtml = renderToStaticMarkup(React.createElement(structureModule.default, {
    draft: structureModule.createStructureDraft(dashboard),
    onAction() {},
  }));
  const scenarioHtml = renderToStaticMarkup(React.createElement(scenarioModule.default, {
    draft: scenarioModule.createScenarioDraft({
      scenarioLabel: "Day 2",
      programLabel: "PDPC",
      lastUpdated: "2026-08-19",
      source: { kind: "package", label: "Source A" },
    }),
    onAction() {},
  }));

  assert.match(structureHtml, /Save Structure/);
  assert.match(structureHtml, /Discard Structure/);
  assert.match(structureHtml, /Add page/);
  assert.match(scenarioHtml, /Scenario Passport/);
  assert.match(scenarioHtml, /Save Scenario/);
  assert.match(scenarioHtml, /Source A/);
  assert.equal(JSON.stringify(dashboard), before);
});

test("Build workspace binds structural studios to Context Shelf and leaves Scenario to the Crown", () => {
  assert.equal(typeof workspaceModule?.default, "function");
  const dashboard = structureFixture();
  const activePage = dashboard.pages[0];
  const html = renderToStaticMarkup(React.createElement(workspaceModule.default, {
    dashboard,
    activePage,
    pageType: "analytical",
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
  assert.match(html, />Pages &amp; sections</);
  assert.doesNotMatch(html, />Scenario details</);
  assert.doesNotMatch(html, />Time Content</);
  assert.match(html, />Chrono Studio</);
  assert.match(html, />Scene Studio</);
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
