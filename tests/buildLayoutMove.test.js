import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeBuildLayoutMove,
  applyBuildLayoutMove,
} from "../src/components/build/buildLayoutMove.js";
import {
  createBuildLayoutDraft,
  discardBuildLayoutDraft,
} from "../src/components/build/buildLayoutDraft.js";

test("page, section, and panel moves honor before/after/end indices without mutating the latest layout draft", () => {
  const saved = fixture();
  let draft = createBuildLayoutDraft(saved);
  draft = { ...draft, value: { ...structuredClone(draft.value), marker: "latest-draft" } };
  const before = structuredClone(draft.value);

  const pageAnalysis = analyzeBuildLayoutMove(draft.value, {
    kind: "page",
    source: { pageId: "page-c", sectionId: null, placementId: null },
    target: { pageId: null, sectionId: null, index: 0 },
  });
  assert.equal(pageAnalysis.status, "ready");
  assert.equal(Object.isFrozen(pageAnalysis), true);
  assert.equal(pageAnalysis.value, undefined);
  assert.deepEqual(draft.value, before);
  draft = applyBuildLayoutMove(draft, pageAnalysis, { confirmed: false });
  assert.deepEqual(draft.value.pages.map(({ id }) => id), ["page-c", "page-a", "page-b"]);

  const sectionAnalysis = analyzeBuildLayoutMove(draft.value, {
    kind: "section",
    source: { pageId: "page-a", sectionId: "section-a2", placementId: null },
    target: { pageId: "page-b", sectionId: null, index: 0 },
  });
  draft = applyBuildLayoutMove(draft, sectionAnalysis, { confirmed: true });
  assert.deepEqual(draft.value.pages.find(({ id }) => id === "page-b").sections.map(({ id }) => id), ["section-a2", "section-b1", "section-empty"]);

  const panelAnalysis = analyzeBuildLayoutMove(draft.value, {
    kind: "panel",
    source: { pageId: "page-a", sectionId: "section-a1", placementId: "placement-static" },
    target: { pageId: "page-b", sectionId: "section-empty", index: 0 },
  });
  draft = applyBuildLayoutMove(draft, panelAnalysis, { confirmed: false });
  const empty = draft.value.pages.find(({ id }) => id === "page-b").sections.find(({ id }) => id === "section-empty");
  assert.deepEqual(empty.panels.map(({ id }) => id), ["placement-static"]);
  assert.equal(draft.targetId, "placement-static");
  assert.equal(draft.value.marker, "latest-draft");
});

test("same-container index reconciliation preserves placement identity and rejects actual no-ops and invalid targets", () => {
  const dashboard = fixture();
  const before = structuredClone(dashboard);
  const analysis = analyzeBuildLayoutMove(dashboard, {
    kind: "panel",
    source: { pageId: "page-a", sectionId: "section-a1", placementId: "placement-a" },
    target: { pageId: "page-a", sectionId: "section-a1", index: 3 },
  });
  const draft = createBuildLayoutDraft(dashboard);
  const untouchedPage = draft.value.pages[1];
  const movedPlacement = draft.value.pages[0].sections[0].panels[0];
  const applied = applyBuildLayoutMove(draft, analysis, {});
  assert.deepEqual(
    applied.value.pages[0].sections[0].panels.map(({ id }) => id),
    ["placement-b", "placement-static", "placement-a"],
  );
  assert.equal(applied.value.pages[0].sections[0].panels[2].chart.id, "chart-a");
  assert.strictEqual(applied.value.pages[0].sections[0].panels[2], movedPlacement);
  assert.strictEqual(applied.value.pages[1], untouchedPage);
  assert.deepEqual(dashboard, before);

  const noOp = analyzeBuildLayoutMove(dashboard, {
    kind: "panel",
    source: { pageId: "page-a", sectionId: "section-a1", placementId: "placement-a" },
    target: { pageId: "page-a", sectionId: "section-a1", index: 1 },
  });
  assert.equal(noOp.status, "noop");
  const clean = createBuildLayoutDraft(dashboard);
  assert.strictEqual(applyBuildLayoutMove(clean, noOp, {}), clean);

  const invalid = analyzeBuildLayoutMove(dashboard, {
    kind: "panel",
    source: { pageId: "page-a", sectionId: "section-a1", placementId: "missing" },
    target: { pageId: "missing-page", sectionId: "missing-section", index: 0 },
  });
  assert.equal(invalid.status, "invalid");
  assert.equal(invalid.error.code, "MOVE_SOURCE_NOT_FOUND");
  assert.strictEqual(applyBuildLayoutMove(clean, invalid, {}), clean);
});

test("cross-container moves replace only source and destination paths", () => {
  const dashboard = fixture();
  const draft = createBuildLayoutDraft(dashboard);
  const before = draft.value;
  const sourcePage = before.pages[0];
  const destinationPage = before.pages[1];
  const untouchedPage = before.pages[2];
  const untouchedSourceSection = sourcePage.sections[1];
  const untouchedDestinationSection = destinationPage.sections[1];
  const movedPlacement = sourcePage.sections[0].panels[0];
  const chronoGroup = before.chronoGroups[0];

  const analysis = analyzeBuildLayoutMove(before, {
    kind: "panel",
    source: { pageId: "page-a", sectionId: "section-a1", placementId: "placement-a" },
    target: { pageId: "page-b", sectionId: "section-b1", index: 0 },
  });
  const applied = applyBuildLayoutMove(draft, analysis, { confirmed: true });

  assert.notStrictEqual(applied.value.pages[0], sourcePage);
  assert.notStrictEqual(applied.value.pages[1], destinationPage);
  assert.strictEqual(applied.value.pages[2], untouchedPage);
  assert.strictEqual(applied.value.pages[0].sections[1], untouchedSourceSection);
  assert.strictEqual(applied.value.pages[1].sections[1], untouchedDestinationSection);
  assert.strictEqual(applied.value.pages[1].sections[0].panels[0], movedPlacement);
  assert.strictEqual(applied.value.chronoGroups[0], chronoGroup);
});

test("applying an analyzed move preserves newer unrelated draft changes", () => {
  const draft = createBuildLayoutDraft(fixture());
  const analysis = analyzeBuildLayoutMove(draft.value, {
    kind: "panel",
    source: { pageId: "page-a", sectionId: "section-a1", placementId: "placement-static" },
    target: { pageId: "page-b", sectionId: "section-empty", index: 0 },
  });
  const newer = {
    ...draft,
    value: { ...draft.value, programLabel: "Newer draft label" },
    revision: draft.revision + 1,
  };

  const applied = applyBuildLayoutMove(newer, analysis, { confirmed: false });

  assert.equal(applied.value.programLabel, "Newer draft label");
  assert.equal(applied.value.pages[1].sections[1].panels[0].id, "placement-static");
});

test("whole-Scene and single-member cross-page moves migrate only pageId and preserve Chrono and Scene fields", () => {
  const dashboard = fixture();
  dashboard.scenes = dashboard.scenes.filter(({ id }) => id !== "scene-partial");
  const beforeChrono = structuredClone(dashboard.chronoGroups);
  const beforeScene = structuredClone(dashboard.scenes.find(({ id }) => id === "scene-whole"));
  const analysis = analyzeBuildLayoutMove(dashboard, {
    kind: "section",
    source: { pageId: "page-a", sectionId: "section-a1", placementId: null },
    target: { pageId: "page-c", sectionId: null, index: 0 },
  });

  assert.equal(analysis.requiresConfirmation, false);
  assert.deepEqual(analysis.consequences.map(({ type, sceneName }) => ({ type, sceneName })), [
    { type: "scene-page-migration", sceneName: "Whole Scene" },
    { type: "scene-page-migration", sceneName: "Single Scene" },
  ]);
  const draft = createBuildLayoutDraft(dashboard);
  const chronoGroup = draft.value.chronoGroups[0];
  const applied = applyBuildLayoutMove(draft, analysis, {});
  const whole = applied.value.scenes.find(({ id }) => id === "scene-whole");
  const single = applied.value.scenes.find(({ id }) => id === "scene-single");
  assert.deepEqual(whole, { ...beforeScene, pageId: "page-c" });
  assert.equal(single.pageId, "page-c");
  assert.deepEqual(applied.value.chronoGroups, beforeChrono);
  assert.strictEqual(applied.value.chronoGroups[0], chronoGroup);
});

test("partial Scene splits name every consequence and cancel is a deep atomic no-op", () => {
  const dashboard = fixture();
  dashboard.scenes = dashboard.scenes.filter(({ id }) => id === "scene-partial");
  const draft = createBuildLayoutDraft(dashboard);
  const analysis = analyzeBuildLayoutMove(dashboard, {
    kind: "panel",
    source: { pageId: "page-a", sectionId: "section-a1", placementId: "placement-a" },
    target: { pageId: "page-b", sectionId: "section-b1", index: 0 },
  });

  assert.equal(analysis.requiresConfirmation, true);
  assert.deepEqual(analysis.consequences.map(({ type, sceneName, chartNames }) => ({ type, sceneName, chartNames })), [
    { type: "scene-partial-split", sceneName: "Partial Scene", chartNames: ["Chart A"] },
    { type: "scene-frame-source-unresolved", sceneName: "Partial Scene", chartNames: ["Chart A"] },
    { type: "scene-present-fallback", sceneName: "Partial Scene", chartNames: ["Chart A"] },
  ]);
  assert.deepEqual(
    analysis.consequences.find(({ type }) => type === "scene-present-fallback").presentChartNames,
    ["Chart B"],
  );
  assert.strictEqual(applyBuildLayoutMove(draft, analysis, { confirmed: false }), draft);
  assert.deepEqual(draft.value, dashboard);
});

test("confirmed partial splits preserve surviving members, normalize Present, and make moved frame sources explicitly unresolved", () => {
  const dashboard = fixture();
  dashboard.scenes = dashboard.scenes.filter(({ id }) => id === "scene-partial");
  const analysis = analyzeBuildLayoutMove(dashboard, {
    kind: "panel",
    source: { pageId: "page-a", sectionId: "section-a1", placementId: "placement-a" },
    target: { pageId: "page-b", sectionId: "section-b1", index: 0 },
  });
  const applied = applyBuildLayoutMove(createBuildLayoutDraft(dashboard), analysis, { confirmed: true });
  const scene = applied.value.scenes.find(({ id }) => id === "scene-partial");

  assert.deepEqual(scene.members, [
    { chartId: "chart-b", width: 3, matching: "nearest", retained: "member-field" },
  ]);
  assert.deepEqual(scene.present, { chartIds: ["chart-b"], layout: "single", retained: "present-field" });
  assert.deepEqual(scene.frames, {
    mode: "unresolved",
    reason: "source-chart-moved",
    previousChartId: "chart-a",
  });
  assert.deepEqual(applied.value.chronoGroups, dashboard.chronoGroups);
  assert.equal(applied.value.pages[1].sections[0].panels[0].id, "placement-a");

  const discarded = discardBuildLayoutDraft(applied);
  assert.deepEqual(discarded.value, dashboard);
  assert.equal(discarded.status, "clean");
});

test("a static Text/Image panel has no temporal consequence", () => {
  const dashboard = fixture();
  const analysis = analyzeBuildLayoutMove(dashboard, {
    kind: "panel",
    source: { pageId: "page-a", sectionId: "section-a1", placementId: "placement-static" },
    target: { pageId: "page-b", sectionId: "section-empty", index: 0 },
  });
  assert.equal(analysis.status, "ready");
  assert.equal(analysis.requiresConfirmation, false);
  assert.deepEqual(analysis.consequences, []);
});

function fixture() {
  const chartA = { id: "chart-a", title: "Chart A" };
  const chartB = { id: "chart-b", title: "Chart B" };
  return {
    id: "dashboard-1",
    pages: [{
      id: "page-a",
      sections: [{
        id: "section-a1",
        panels: [
          { id: "placement-a", chart: chartA },
          { id: "placement-b", chart: chartB },
          { id: "placement-static", kind: "text", title: "Briefing note" },
        ],
      }, {
        id: "section-a2",
        panels: [],
      }],
    }, {
      id: "page-b",
      sections: [
        { id: "section-b1", panels: [] },
        { id: "section-empty", panels: [] },
      ],
    }, {
      id: "page-c",
      sections: [{ id: "section-c1", panels: [] }],
    }],
    chronoGroups: [{
      id: "chrono-1",
      name: "Chrono",
      members: [
        { chartId: "chart-a", matching: "exact" },
        { chartId: "chart-b", matching: "nearest" },
      ],
      retained: "chrono-field",
    }],
    scenes: [{
      id: "scene-whole",
      name: "Whole Scene",
      pageId: "page-a",
      chronoGroupId: "chrono-1",
      members: [{ chartId: "chart-a", width: 2 }, { chartId: "chart-b", width: 2 }],
      frames: { mode: "calendar", interval: { value: 1, unit: "day" } },
      present: { chartIds: ["chart-a", "chart-b"], layout: "horizontal-divider" },
      retained: "scene-field",
    }, {
      id: "scene-single",
      name: "Single Scene",
      pageId: "page-a",
      chronoGroupId: "chrono-1",
      members: [{ chartId: "chart-a", width: 4 }],
      frames: { mode: "source", chartId: "chart-a", selection: "all" },
      present: { chartIds: ["chart-a"], layout: "single" },
    }, {
      id: "scene-partial",
      name: "Partial Scene",
      pageId: "page-a",
      chronoGroupId: "chrono-1",
      members: [
        { chartId: "chart-a", width: 1, matching: "exact" },
        { chartId: "chart-b", width: 3, matching: "nearest", retained: "member-field" },
      ],
      frames: { mode: "source", chartId: "chart-a", selection: "selected", selectedEpochs: [1, 2] },
      present: { chartIds: ["chart-a"], layout: "single", retained: "present-field" },
    }],
  };
}
